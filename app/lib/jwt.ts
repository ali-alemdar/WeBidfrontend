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
