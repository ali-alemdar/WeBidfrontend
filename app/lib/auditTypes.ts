/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

export type AuditAction =
  | "PAGE_VIEW"
  | "FORM_OPEN"
  | "FORM_SUBMIT"
  | "BID_SUBMIT"
  | "BID_MODIFY"
  | "PAYMENT_ATTEMPT"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILURE"
  | "EVALUATION_SUBMIT"
  | "DISQUALIFICATION_VOTE"
  | "AWARD_RECOMMENDATION"
  | "CONTRACT_SIGN"
  | "DOWNLOAD_SENSITIVE"
  | "ACCESS_DENIED";

export interface AuditEvent {
  action: AuditAction;
  pageId?: string;
  pageName?: string;

  entityType?: "TENDER" | "BID" | "PAYMENT" | "CONTRACT" | "USER";
  entityId?: string;

  metadata?: Record<string, any>;
}
