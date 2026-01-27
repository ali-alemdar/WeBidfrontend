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
