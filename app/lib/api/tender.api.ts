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

export const listPublicTenders = () =>
  apiFetch<any[]>("/tender/public");

export const getTenderDetail = (id: string) =>
  apiFetch(`/tender/public/${id}`);
