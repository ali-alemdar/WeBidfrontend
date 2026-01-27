#!/bin/bash
set -e

BASE="/home/ali/e-bidding/frontend/app"
LIB="$BASE/lib"

mkdir -p "$LIB/api"

############################################
# 1) JWT utilities (decode only, no verify)
############################################
cat <<'EOF' > "$LIB/jwt.ts"
export interface JwtClaims {
  sub?: string;
  name?: string;
  email?: string;

  // Common patterns for RBAC:
  roles?: string[];
  role?: string | string[];

  // Optional multi-tenant patterns:
  tenantId?: string;
  tenant_id?: string;
  tenants?: string[];

  // Standard:
  exp?: number;
  iat?: number;

  [key: string]: any;
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");

  // atob is available in browser only
  const decoded = atob(padded);
  try {
    return decodeURIComponent(
      decoded
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return decoded;
  }
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = base64UrlDecode(parts[1]);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export function isJwtExpired(claims: JwtClaims | null): boolean {
  if (!claims?.exp) return false; // if exp not present, treat as non-expiring
  const nowSec = Math.floor(Date.now() / 1000);
  return nowSec >= claims.exp;
}
EOF

############################################
# 2) Tenant store (localStorage)
############################################
cat <<'EOF' > "$LIB/tenantClient.ts"
"use client";

const TENANT_KEY = "ebid_tenant_id";

export function setTenantId(tenantId: string) {
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function getTenantId(): string | null {
  return localStorage.getItem(TENANT_KEY);
}

export function clearTenantId() {
  localStorage.removeItem(TENANT_KEY);
}
EOF

############################################
# 3) Auth client (JWT storage + current user)
############################################
cat <<'EOF' > "$LIB/authClient.ts"
"use client";

import { decodeJwt, isJwtExpired, JwtClaims } from "./jwt";
import { Role } from "./roles";
import { clearTenantId, setTenantId } from "./tenantClient";

const TOKEN_KEY = "ebid_access_token";

export interface CurrentUser {
  id: string;
  name?: string;
  email?: string;
  roles: Role[];
  rawClaims?: JwtClaims;
}

/**
 * Store token in localStorage for simplicity.
 * If you want server-side protection later, move token to httpOnly cookies.
 */
export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);

  // Optional: if token includes a tenant ID, auto-set it
  const claims = decodeJwt(token);
  const tenant =
    (claims?.tenantId as string) ||
    (claims?.tenant_id as string) ||
    (Array.isArray(claims?.tenants) ? claims?.tenants?.[0] : null);

  if (tenant) setTenantId(tenant);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  clearTenantId();
}

export function getCurrentUser(): CurrentUser | null {
  const token = getAccessToken();
  if (!token) return null;

  const claims = decodeJwt(token);
  if (!claims) return null;

  if (isJwtExpired(claims)) {
    // Auto-clear expired tokens to avoid weird UX
    clearAccessToken();
    return null;
  }

  const roleField = claims.roles ?? claims.role;
  const roles = normalizeRoles(roleField);

  // Map string roles to Role union where possible; unknown roles are discarded
  const typedRoles = roles.filter(isKnownRole) as Role[];

  return {
    id: claims.sub || "unknown",
    name: claims.name,
    email: claims.email,
    roles: typedRoles,
    rawClaims: claims,
  };
}

function normalizeRoles(input: any): string[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.map(String);
  if (typeof input === "string") return [input];
  return [];
}

function isKnownRole(r: string): boolean {
  const known: Role[] = [
    "BIDDER_ADMIN",
    "BIDDER_USER",
    "BIDDER_FINANCE",
    "REQUESTER",
    "PROCUREMENT",
    "APPROVER",
    "COMMITTEE",
    "EVALUATOR",
    "AWARD_AUTHORITY",
    "AUDITOR",
    "SYS_ADMIN",
  ];
  return known.includes(r as Role);
}
EOF

############################################
# 4) API client wrapper (JWT + tenant headers)
############################################
cat <<'EOF' > "$LIB/apiClient.ts"
"use client";

import { getAccessToken } from "./authClient";
import { getTenantId } from "./tenantClient";

export interface ApiError extends Error {
  status?: number;
  details?: any;
}

function buildError(message: string, status?: number, details?: any): ApiError {
  const err = new Error(message) as ApiError;
  err.status = status;
  err.details = details;
  return err;
}

/**
 * Centralized fetch wrapper:
 * - Attaches Authorization header if token exists
 * - Attaches X-Tenant-Id if tenant selected
 * - Throws typed errors on non-2xx
 *
 * Configure base URL via:
 *   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
  const url = `${base}${path}`;

  const token = getAccessToken();
  const tenantId = getTenantId();

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", headers.get("Content-Type") || "application/json");

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenantId) headers.set("X-Tenant-Id", tenantId);

  const res = await fetch(url, { ...options, headers });

  // Handle empty responses
  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    throw buildError(
      data?.message || `API error: ${res.status}`,
      res.status,
      data
    );
  }

  return data as T;
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
EOF

############################################
# 5) Auth API (login/logout)
############################################
cat <<'EOF' > "$LIB/api/auth.api.ts"
"use client";

import { apiFetch } from "../apiClient";
import { setAccessToken, clearAccessToken } from "../authClient";

/**
 * IMPORTANT:
 * These endpoint paths might differ in your backend.
 * Adjust these paths to match your NestJS controllers.
 *
 * Suggested pattern:
 * - Bidder login:  POST /bidder/auth/login
 * - Employee login: POST /auth/login
 */

export async function loginBidder(email: string, password: string) {
  const res = await apiFetch<{ access_token: string }>(
    "/bidder/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  setAccessToken(res.access_token);
  return res;
}

export async function loginEmployee(username: string, password: string) {
  const res = await apiFetch<{ access_token: string }>(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }
  );
  setAccessToken(res.access_token);
  return res;
}

export function logout() {
  clearAccessToken();
}
EOF

############################################
# 6) API modules (Step 4 mapping entry points)
############################################
cat <<'EOF' > "$LIB/api/tender.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Tender APIs
 * Backed by: tender/public-tender.controller, tender/tender.controller
 * Adjust endpoint paths to match your backend routes.
 */

export function listPublicTenders() {
  return apiFetch<any[]>("/tender/public");
}

export function getTenderDetail(tenderId: string) {
  return apiFetch<any>(`/tender/public/${tenderId}`);
}

export function publishTender(tenderId: string) {
  return apiFetch<any>(`/tender/${tenderId}/publish`, { method: "POST" });
}
EOF

cat <<'EOF' > "$LIB/api/bid.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Bid APIs
 * Backed by: bid/bid.controller
 */

export function listMyBids() {
  return apiFetch<any[]>("/bid/my");
}

export function getBidWorkspace(tenderId: string) {
  return apiFetch<any>(`/bid/workspace/${tenderId}`);
}

export function submitBid(tenderId: string, payload: any) {
  return apiFetch<any>(`/bid/${tenderId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
EOF

cat <<'EOF' > "$LIB/api/document.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Document APIs
 * Backed by: document/upload/chunk-upload.controller, document/download/signed-download.controller
 * These are placeholders; chunk upload flows often require multiple endpoints.
 */

export function requestSignedDownload(docId: string) {
  return apiFetch<{ url: string }>(`/document/download/signed/${docId}`);
}

/**
 * Example "chunk upload init" placeholder
 * Real implementations usually have:
 * - init upload session
 * - upload chunk(s)
 * - complete upload
 */
export function initChunkUpload(meta: any) {
  return apiFetch<any>("/document/upload/chunk/init", {
    method: "POST",
    body: JSON.stringify(meta),
  });
}
EOF

cat <<'EOF' > "$LIB/api/payment.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Payment APIs
 * Backed by: payment/* services (tender-fee, bid-fee, invoice, reconciliation)
 */

export function getWallet() {
  return apiFetch<any>("/payment/wallet");
}

export function payTenderFee(tenderId: string, payload: any) {
  return apiFetch<any>(`/payment/tender-fee/${tenderId}/pay`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listInvoices() {
  return apiFetch<any[]>("/payment/invoices");
}
EOF

cat <<'EOF' > "$LIB/api/evaluation.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Evaluation APIs
 * Backed by: evaluation controllers/services
 */

export function getEvaluationDashboard(tenderId: string) {
  return apiFetch<any>(`/evaluation/${tenderId}/dashboard`);
}

export function submitTechnicalScore(tenderId: string, bidId: string, payload: any) {
  return apiFetch<any>(`/evaluation/${tenderId}/technical/${bidId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function castDisqualificationVote(tenderId: string, bidId: string, payload: any) {
  return apiFetch<any>(`/evaluation/${tenderId}/disqualification/${bidId}/vote`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
EOF

cat <<'EOF' > "$LIB/api/award.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Award/Contract APIs
 * Backed by: award module (winner selection, contract, digital signature)
 */

export function selectWinner(tenderId: string, payload: any) {
  return apiFetch<any>(`/award/${tenderId}/winner`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function createContract(tenderId: string, payload: any) {
  return apiFetch<any>(`/award/${tenderId}/contract`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
EOF

cat <<'EOF' > "$LIB/api/audit.api.ts"
"use client";

import { apiFetch } from "../apiClient";

/**
 * Audit APIs
 * Backed by: audit module (immutable-ledger, user-activity, export)
 */

export function searchAudit(query: any) {
  return apiFetch<any>("/audit/search", {
    method: "POST",
    body: JSON.stringify(query),
  });
}

export function exportCourtPackage(tenderId: string) {
  return apiFetch<any>(`/audit/export/court/${tenderId}`);
}
EOF

############################################
# 7) Update requireRole to use JWT-based user
############################################
cat <<'EOF' > "$LIB/requireRole.tsx"
"use client";

import { Role } from "./roles";
import { getCurrentUser } from "./authClient";

interface Props {
  allowed: Role[];
  children: React.ReactNode;
}

export default function RequireRole({ allowed, children }: Props) {
  const user = getCurrentUser();

  if (!user) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>User is not authenticated (no valid JWT token found).</p>
      </main>
    );
  }

  const hasAccess = user.roles.some((role) => allowed.includes(role));

  if (!hasAccess) {
    return (
      <main style={{ padding: "2rem", color: "red" }}>
        <h2>Access Denied</h2>
        <p>You do not have permission to access this page.</p>
        <p>
          <strong>Your roles:</strong> {user.roles.join(", ") || "None"}
        </p>
        <p>
          <strong>Allowed roles:</strong> {allowed.join(", ")}
        </p>
      </main>
    );
  }

  return <>{children}</>;
}
EOF

############################################
# 8) Update NavigationMenu to use JWT-based user
############################################
cat <<'EOF' > "$LIB/NavigationMenu.tsx"
"use client";

import Link from "next/link";
import { NavItem } from "./navigation";
import { getCurrentUser } from "./authClient";

interface Props {
  items: NavItem[];
}

function hasAccess(rolesAllowed: string[], userRoles: string[]) {
  return userRoles.some((role) => rolesAllowed.includes(role));
}

export default function NavigationMenu({ items }: Props) {
  const user = getCurrentUser();
  if (!
