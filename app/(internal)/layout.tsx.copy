"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated } from "../lib/auth";
import Sidebar from "../components/Sidebar";
import SecondaryNav from "../components/SecondaryNav";
import TeamNotesPanel from "../components/TeamNotesPanel";
import { getCurrentUser } from "../lib/authClient";

export default function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/");
    } else {
      setReady(true);
    }
  }, [router]);

  const user = ready ? getCurrentUser() : null;
  const roles = ((user as any)?.roles || []) as string[];

  const isSysAdmin = roles.includes("SYS_ADMIN");

  const isOfficer = useMemo(
    () => roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin,
    [roles, isSysAdmin],
  );

  const isReqManager = useMemo(
    () => roles.includes("REQUISITION_MANAGER") || isSysAdmin,
    [roles, isSysAdmin],
  );

  const isTenderManager = useMemo(
    () => roles.includes("TENDER_APPROVAL") || isSysAdmin,
    [roles, isSysAdmin],
  );

  const isCommittee = useMemo(
    () => false,
    [roles, isSysAdmin],
  );

  const isCommitteeChair = useMemo(
    () => roles.includes("COMMITTEE_CHAIR") || isSysAdmin,
    [roles, isSysAdmin],
  );

  // Role dominance is additive: requester-only means requester *without* any other internal roles.
  const isRequesterOnly = useMemo(
    () => roles.length === 1 && roles.includes("REQUESTER"),
    [roles],
  );

  // Note: requesters are routed to /requisitions/status from the login page.
  // We no longer hard-redirect them here so that additional roles (e.g. tender
  // managers) can access their dedicated dashboards without being forced back
  // to requisition status.

  if (!ready) return null;

  // Requesters: draft + status experience (no sidebars)
  if (isRequesterOnly) {
    return (
      <main style={{ padding: "1.25rem", minHeight: "100vh" }}>
        {children}
      </main>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Left rail: primary + secondary navbars, with notes spanning beneath both */}
      <div
        className="no-print"
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "1.25rem 0 1.25rem 1.25rem",
          gap: 12,
          width: "fit-content",
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          <div style={{ marginRight: "1.25rem" }}>
            <Sidebar />
          </div>
          <div>
            <SecondaryNav />
          </div>
        </div>
        {(() => {
          // Show team notes on any non-draft requisition page (from invitations onwards, including archive).
          // Support both requisition routes and submissions routes that carry a requisition id.
          // Examples: /requisitions/123/view, /requisitions/archive/123, /submissions/123, /submissions/123/view
          let id = NaN;
          const mReq = pathname.match(/\/requisitions\/(\d+)/);
          const mSub = pathname.match(/\/submissions\/(\d+)/);
          if (mReq) id = Number(mReq[1]);
          else if (mSub) id = Number(mSub[1]);
          if (!Number.isFinite(id)) return null;
          // Known draft-like paths where we should NOT show notes.
          if (pathname === "/requisitions/create") return null;
          if (pathname === "/requisitions/list") return null;
          if (pathname === "/requisitions/archive") return null; // archive list, not detail
          if (pathname.startsWith("/requisitions/status")) return null;
          return <TeamNotesPanel requisitionId={id} />;
        })()}
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: "1.25rem 1.25rem 1.25rem 1.25rem", minWidth: 0 }}>
        {children}
      </main>
    </div>
  );
}
