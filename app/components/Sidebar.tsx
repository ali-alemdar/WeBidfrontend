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

  const canSeeRequisitions =
    roles.includes("REQUISITION_OFFICER") ||
    roles.includes("REQUISITION_MANAGER") ||
    isSysAdmin;

  const canSeeDashboard = roles.length > 0;

  const isTenderOfficerRole =
    roles.includes("TENDERING_OFFICER") || roles.includes("TENDER_COMMITTEE");
  const isTenderManagerRole = roles.includes("TENDER_APPROVAL");

  const canSeeTenders = isTenderOfficerRole || isTenderManagerRole || isSysAdmin;

  const canSeeAudit = roles.includes("AUDITOR") || isSysAdmin;

  const items: NavItem[] = [
    ...(canSeeDashboard ? [{ href: "/dashboard", label: "Dashboard" }] : []),
    ...(canSeeRequisitions
      ? [
          {
            href: "/requisitions",
            label: "Requisitions",
            // Sub-nav pages that belong to Requisitions
            match: (p) => p.startsWith("/requisitions") || p.startsWith("/submissions"),
          },
        ]
      : []),
    ...(canSeeTenders
      ? [
          {
            // Tender managers should land on their approval queue rather than the
            // officer working list. Officers and sys admin keep the main list.
            href:
              isTenderOfficerRole || isSysAdmin
                ? "/tenders"
                : "/tenders/waiting-approvals",
            label: "Tenders",
            // Treat bid opening / evaluation / awards as part of the Tenders main section
            match: (p) =>
              p.startsWith("/tenders") ||
              p.startsWith("/bid-opening") ||
              p.startsWith("/evaluation") ||
              p.startsWith("/awards"),
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
