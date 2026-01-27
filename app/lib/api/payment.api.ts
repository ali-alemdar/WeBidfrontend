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
