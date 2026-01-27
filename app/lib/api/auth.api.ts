/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

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
