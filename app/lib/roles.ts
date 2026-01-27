/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

export type Role =
  | "BIDDER_ADMIN"
  | "BIDDER_USER"
  | "BIDDER_FINANCE"
  | "REQUESTER"
  | "PROCUREMENT"
  | "APPROVER"
  | "EVALUATOR"
  | "AWARD_AUTHORITY"
  | "AUDITOR"
  | "SYS_ADMIN";
