"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "../lib/authClient";

type NavItem = { href: string; label: string; match?: (pathname: string) => boolean };

function isActive(pathname: string, it: NavItem) {
  if (it.match) return it.match(pathname);
  if (it.href === "/") return pathname === "/";
  return pathname === it.href || pathname.startsWith(it.href + "/");
}

export default function Sidebar() {
  const pathname = usePathname() || "/";
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");

  const isRequisitionOfficer =
    roles.includes("REQUISITION_OFFICER") || isSysAdmin;
  const isRequisitionManager =
    roles.includes("REQUISITION_MANAGER") || isSysAdmin;
  const isRequesterOnly =
    roles.includes("REQUESTER") && !isRequisitionOfficer && !isRequisitionManager;

  const canSeeRequisitions =
    isRequisitionOfficer ||
    isRequisitionManager ||
    isSysAdmin;

  const canSeeDashboard = roles.length > 0 && !isRequesterOnly;

  const isTenderOfficerRole =
    roles.includes("TENDERING_OFFICER") || roles.includes("TENDER_COMMITTEE");
  const isTenderManagerRole = roles.includes("TENDER_APPROVAL");
  const isTenderPublicationPreparer = roles.includes("TENDER_PUBLICATION_PREPARER");
  const isTenderPublicationManager = roles.includes("TENDER_PUBLICATION_MANAGER");
  const isGeneralManager = roles.includes("GENERAL_MANAGER");

  const isAdminOnly = isSysAdmin && !canSeeRequisitions && !isTenderOfficerRole && !isTenderManagerRole && !isTenderPublicationPreparer && !isTenderPublicationManager && !isGeneralManager;

  const canSeeTenders = (isTenderOfficerRole || isTenderManagerRole || isSysAdmin) && !isAdminOnly;
  const canSeeTenderPublishing =
    (isTenderPublicationPreparer ||
    isTenderPublicationManager ||
    isSysAdmin) && !isAdminOnly;
  const canSeeGMApprovals = (isGeneralManager || isSysAdmin) && !isAdminOnly;

  const canSeeAudit = roles.includes("AUDITOR") || isSysAdmin;

  // For GM-only users (not also SYS_ADMIN), show simplified navbar
  const isGMOnlyView = canSeeGMApprovals && !isSysAdmin;
  
  const items: NavItem[] = isGMOnlyView
    ? [
        { href: "/dashboard", label: "Dashboard", match: (p) => p === "/dashboard" || p === "/gm-dashboard" },
        { href: "/requisitions/status", label: "My Requisitions", match: (p) => p.startsWith("/requisitions") || p.startsWith("/submissions") },
        { href: "/gm-approvals", label: "Tenders to Approve", match: (p) => p.startsWith("/gm-approvals") || p.startsWith("/tenders") && p.includes("/gm-approval") },
      ]
    : [
        ...(isRequesterOnly
          ? [
              {
                href: "/requisitions/status",
                label: "My Requisitions",
                match: (p) => p.startsWith("/requisitions") || p.startsWith("/submissions"),
              },
            ]
          : []),
        ...(canSeeDashboard ? [{ href: "/dashboard", label: "Dashboard" }] : []),
        ...(canSeeRequisitions
          ? [
              {
                href: "/requisitions",
                label: "Requisitions",
                match: (p) => p.startsWith("/requisitions") || p.startsWith("/submissions"),
              },
            ]
          : []),
        ...(canSeeTenders
          ? [
              {
                href: "/tenders",
                label: "Tender Preparation",
                match: (p) =>
                  p.startsWith("/tenders") ||
                  p.startsWith("/bid-opening") ||
                  p.startsWith("/evaluation") ||
                  p.startsWith("/awards"),
              },
            ]
          : []),
        ...(canSeeTenderPublishing
          ? [
              {
                href: "/tender-publishing",
                label: "Tender Publishing",
                match: (p) => p.startsWith("/tender-publishing"),
              },
            ]
          : []),
        ...(canSeeAudit ? [{ href: "/audit", label: "Audit" }] : []),
        ...(isSysAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ];

  return (
    <aside
      className="card"
      style={{
        boxShadow: "none",
        padding: "12px",
        background: "rgba(0,0,0,0.02)",
        width: 152,
        alignSelf: "flex-start",
        position: "sticky",
        top: 16,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Internal</div>

      <nav style={{ display: "grid", gap: 8 }}>
        {items.map((it) => (
          <Link
            key={it.href}
            className={isActive(pathname, it) ? "btn btn-primary" : "btn"}
            href={it.href}
            style={{ width: "100%", justifyContent: "flex-start" }}
          >
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
