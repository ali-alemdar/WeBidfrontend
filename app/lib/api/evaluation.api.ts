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
