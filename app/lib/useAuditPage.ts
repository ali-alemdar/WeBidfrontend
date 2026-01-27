"use client";

import { useEffect } from "react";
import { logAuditEvent } from "./api/audit.api";
import { AuditAction } from "./auditTypes";

export function useAuditPage(
  pageId: string,
  pageName: string,
  extra?: Record<string, any>
) {
  useEffect(() => {
    logAuditEvent({
      action: "PAGE_VIEW",
      pageId,
      pageName,
      metadata: extra,
    }).catch(() => {
      // Audit failures must NEVER break UI
    });
  }, [pageId, pageName]);
}
