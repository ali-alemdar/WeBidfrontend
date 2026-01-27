/**
 * ⚠️ DO NOT MODIFY WITHOUT EXPLICIT APPROVAL ⚠️
 *
 * This file is a frozen contract (RBAC / Lifecycle / Audit / API).
 * Changes to this file may break security, audit integrity,
 * or legal compliance of the e-bidding system.
 *
 * Modify ONLY after explicit confirmation from the lead developer.
 */

import { TenderStatus } from "./tenderLifecycle";
import { Role } from "./roles";

export interface TenderActionRule {
  allowedStatuses: TenderStatus[];
  allowedRoles: Role[];
}

export const TenderRules = {
  BID_SUBMIT: {
    allowedStatuses: ["SUBMISSION_OPEN"],
    allowedRoles: ["BIDDER_ADMIN", "BIDDER_USER"],
  },

  BID_MODIFY: {
    allowedStatuses: ["SUBMISSION_OPEN"],
    allowedRoles: ["BIDDER_ADMIN", "BIDDER_USER"],
  },

  TECHNICAL_OPEN: {
    allowedStatuses: ["SUBMISSION_CLOSED"],
    allowedRoles: ["PROCUREMENT"],
  },

  COMMERCIAL_OPEN: {
    allowedStatuses: ["TECHNICAL_OPENED"],
    allowedRoles: ["PROCUREMENT"],
  },

  TECHNICAL_EVALUATE: {
    allowedStatuses: ["TECHNICAL_OPENED"],
    allowedRoles: ["EVALUATOR"],
  },

  COMMERCIAL_EVALUATE: {
    allowedStatuses: ["COMMERCIAL_OPENED"],
    allowedRoles: ["EVALUATOR"],
  },

  AWARD: {
    allowedStatuses: ["EVALUATION_COMPLETED"],
    allowedRoles: ["AWARD_AUTHORITY"],
  },

  CONTRACT_SIGN: {
    allowedStatuses: ["AWARDED"],
    allowedRoles: ["AWARD_AUTHORITY"],
  },
} as const;
