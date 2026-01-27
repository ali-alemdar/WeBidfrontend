#!/bin/bash
set -e

BASE="/home/ali/e-bidding/frontend/app/lib"
mkdir -p "$BASE"

cat <<'EOF' > "$BASE/jwt.ts"
export interface JwtClaims {
  sub?: string;
  name?: string;
  email?: string;
  roles?: string[];
  role?: string | string[];
  tenantId?: string;
  tenant_id?: string;
  tenants?: string[];
  exp?: number;
  iat?: number;
  [key: string]: any;
}

function base64UrlDecode(input: string) {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return atob(padded);
}

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    return JSON.parse(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }
}

export function isJwtExpired(claims: JwtClaims | null): boolean {
  if (!claims?.exp) return false;
  return Math.floor(Date.now() / 1000) >= claims.exp;
}
EOF

cat <<'EOF' > "$BASE/tenantClient.ts"
"use client";

const KEY = "ebid_tenant_id";

export const setTenantId = (id: string) =>
  localStorage.setItem(KEY, id);

export const getTenantId = () =>
  localStorage.getItem(KEY);

export const clearTenantId = () =>
  localStorage.removeItem(KEY);
EOF

cat <<'EOF' > "$BASE/authClient.ts"
"use client";

import { decodeJwt, isJwtExpired } from "./jwt";
import { Role } from "./roles";
import { clearTenantId, setTenantId } from "./tenantClient";

const TOKEN_KEY = "ebid_access_token";

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  const claims = decodeJwt(token);
  const tenant = claims?.tenantId || claims?.tenant_id;
  if (tenant) setTenantId(tenant);
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
  clearTenantId();
}

export function getCurrentUser() {
  const token = getAccessToken();
  if (!token) return null;

  const claims = decodeJwt(token);
  if (!claims || isJwtExpired(claims)) return null;

  const roles = Array.isArray(claims.roles)
    ? claims.roles
    : claims.role
    ? [claims.role]
    : [];

  return {
    id: claims.sub || "unknown",
    name: claims.name,
    email: claims.email,
    roles: roles.filter(r =>
      [
        "BIDDER_ADMIN","BIDDER_USER","BIDDER_FINANCE",
        "REQUESTER","PROCUREMENT","APPROVER",
        "COMMITTEE","EVALUATOR","AWARD_AUTHORITY",
        "AUDITOR","SYS_ADMIN"
      ].includes(r)
    ) as Role[],
  };
}
EOF

echo "✅ Step 5.1 installed (JWT + tenant + auth client)"
