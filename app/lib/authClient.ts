"use client";

import { decodeJwt, isJwtExpired } from "./jwt";
import { clearTenantId, setTenantId } from "./tenantClient";

const TOKEN_KEY = "ebid_access_token";

export function setAccessToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  const claims = decodeJwt(token);
  const tenant = claims?.tenantId || claims?.tenant_id;
  if (tenant) setTenantId(tenant);
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
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
  
  const rolesRaw = claims.roles ?? claims.role;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw
    : rolesRaw
    ? [rolesRaw]
    : [];

  const rolesNorm = roles.map((r: any) => String(r || "").trim()).filter(Boolean);

  // NOTE: We intentionally keep `frontend/app/lib/roles.ts` frozen.
  // For newly introduced internal roles, we allow them through here and cast.
  const allowedRoles = [
    "BIDDER_ADMIN",
    "BIDDER_USER",
    "BIDDER_FINANCE",
    "REQUESTER",
    "PROCUREMENT",
    "APPROVER",
    "TENDERING_OFFICER",
    "REQUISITION_OFFICER",
    "REQUISITION_MANAGER",
    "COMMITTEE_CHAIR",
    "EVALUATOR",
    "AWARD_AUTHORITY",
    "SUPPLIER_MANAGER",
    "AUDITOR",
    "SYS_ADMIN",
    // Newly introduced internal roles
    "TENDER_APPROVAL",
    "TENDER_PUBLICATION_PREPARER",
    "TENDER_PUBLICATION_MANAGER",
    "GENERAL_MANAGER",
  ];

  return {
    id: claims.sub || "unknown",
    fullName: claims.name,
    email: claims.email,
    roles: rolesNorm.filter((r: any) => allowedRoles.includes(r)) as any,
    departmentName: claims.departmentName || null,
  };
}

export function hasInternalAccess(): boolean {
  if (typeof window === "undefined") return false;

  const token = getAccessToken();
  if (!token) return false;

  try {
    const payload = token.split(".")[1];
    const claims = JSON.parse(atob(payload));
    return claims?.internal === true;
  } catch {
    return false;
  }
}


