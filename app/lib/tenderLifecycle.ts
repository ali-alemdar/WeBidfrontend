/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

export type TenderStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "SUBMISSION_OPEN"
  | "SUBMISSION_CLOSED"
  | "TECHNICAL_OPENED"
  | "COMMERCIAL_OPENED"
  | "EVALUATION_IN_PROGRESS"
  | "EVALUATION_COMPLETED"
  | "AWARDED"
  | "CONTRACTED"
  | "CANCELLED";
