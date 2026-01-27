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
import { AuditEvent } from "../auditTypes";

/**
 * Backed by:
 * - audit/user-activity.service
 * - audit/immutable-ledger.service (for sensitive events)
 */
export function logAuditEvent(event: AuditEvent) {
  return apiFetch("/audit/user-activity", {
    method: "POST",
    body: JSON.stringify(event),
  });
}
