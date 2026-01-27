#!/bin/bash
set -e

API="/home/ali/e-bidding/frontend/app/lib/api"
mkdir -p "$API"

cat <<'EOF' > "$API/bid.api.ts"
"use client";
import { apiFetch } from "../apiClient";

export const listMyBids = () =>
  apiFetch<any[]>("/bid/my");

export const submitBid = (tenderId: string, payload: any) =>
  apiFetch(`/bid/${tenderId}/submit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
EOF

cat <<'EOF' > "$API/tender.api.ts"
"use client";
import { apiFetch } from "../apiClient";

export const listPublicTenders = () =>
  apiFetch<any[]>("/tender/public");

export const getTenderDetail = (id: string) =>
  apiFetch(`/tender/public/${id}`);
EOF

cat <<'EOF' > "$API/auth.api.ts"
"use client";
import { apiFetch } from "../apiClient";
import { setAccessToken, clearAccessToken } from "../authClient";

export const loginBidder = async (email: string, password: string) => {
  const res = await apiFetch<{ access_token: string }>(
    "/bidder/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  );
  setAccessToken(res.access_token);
};

export const logout = () => clearAccessToken();
EOF

echo "✅ Step 5.3 installed (API modules)"
