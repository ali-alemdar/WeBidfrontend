#!/bin/bash
set -e

BASE="/home/ali/e-bidding/frontend/app/lib"
mkdir -p "$BASE"

cat <<'EOF' > "$BASE/apiClient.ts"
"use client";

import { getAccessToken } from "./authClient";
import { getTenantId } from "./tenantClient";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  const token = getAccessToken();
  const tenant = getTenantId();

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (tenant) headers.set("X-Tenant-Id", tenant);

  const res = await fetch(base + path, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message || `HTTP ${res.status}`);
  }

  return data;
}
EOF

echo "✅ Step 5.2 installed (API fetch wrapper)"
