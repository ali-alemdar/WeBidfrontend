"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "./api";

export type PageLockStatus = "NONE" | "OWNED" | "LOCKED";

export interface PageLockConfig<TData = any> {
  resourceType: string; // e.g. REQUISITION
  resourceId: number;
  scope: string; // e.g. EDIT_PAGE, APPROVAL_PACKAGE
  // Endpoint that returns data + lock info in one shot
  editUrl: string; // GET
  // Lock endpoints
  heartbeatUrl: string; // POST
  releaseUrl: string; // POST
  forceReleaseUrl?: string; // POST (optional)
  // Optional mapper: raw response -> { data, lockStatus, lockInfo }
  mapEditResponse?: (res: any) => {
    data: TData | null;
    lockStatus: PageLockStatus;
    lockInfo: any | null;
  };
}

export interface UsePageLockResult<TData = any> {
  data: TData | null;
  loading: boolean;
  error: string;
  lockStatus: PageLockStatus;
  lockInfo: any | null;
  reload: () => Promise<void>;
  forceRelease?: () => Promise<void>;
}

export function usePageLock<TData = any>(config: PageLockConfig<TData>): UsePageLockResult<TData> {
  const { editUrl, heartbeatUrl, releaseUrl, forceReleaseUrl, mapEditResponse } = config;

  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lockStatus, setLockStatus] = useState<PageLockStatus>("NONE");
  const [lockInfo, setLockInfo] = useState<any | null>(null);

  const reload = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await apiGet(editUrl);
      const mapped = mapEditResponse
        ? mapEditResponse(res)
        : {
            data: (res as any)?.requisition ?? (res as any)?.data ?? null,
            lockStatus: ((res as any)?.lockStatus as PageLockStatus) || "NONE",
            lockInfo: (res as any)?.lockInfo || null,
          };

      setData(mapped.data);
      setLockStatus(mapped.lockStatus);
      setLockInfo(mapped.lockInfo);
    } catch (e: any) {
      setError(e?.message || "Failed to load");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editUrl]);

  // Heartbeat + best-effort release
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let intervalId: any = null;

    if (lockStatus === "OWNED") {
      intervalId = window.setInterval(() => {
        apiPost(heartbeatUrl, {}).catch(() => undefined);
      }, 60_000);
    }

    const handleBeforeUnload = () => {
      try {
        void apiPost(releaseUrl, {});
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (intervalId) window.clearInterval(intervalId);
      // Also attempt a best-effort release when the hook unmounts or
      // dependencies change. This is idempotent on the backend.
      if (lockStatus === "OWNED") {
        try {
          void apiPost(releaseUrl, {});
        } catch {
          // ignore
        }
      }
    };
  }, [lockStatus, heartbeatUrl, releaseUrl]);

  const forceRelease = forceReleaseUrl
    ? async () => {
        await apiPost(forceReleaseUrl, {});
        await reload();
      }
    : undefined;

  return {
    data,
    loading,
    error,
    lockStatus,
    lockInfo,
    reload,
    forceRelease,
  };
}
