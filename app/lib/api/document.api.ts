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
 * Document APIs
 * Backed by: document/upload/chunk-upload.controller, document/download/signed-download.controller
 * These are placeholders; chunk upload flows often require multiple endpoints.
 */

export function requestSignedDownload(docId: string) {
  return apiFetch<{ url: string }>(`/document/download/signed/${docId}`);
}

/**
 * Example "chunk upload init" placeholder
 * Real implementations usually have:
 * - init upload session
 * - upload chunk(s)
 * - complete upload
 */
export function initChunkUpload(meta: any) {
  return apiFetch<any>("/document/upload/chunk/init", {
    method: "POST",
    body: JSON.stringify(meta),
  });
}
