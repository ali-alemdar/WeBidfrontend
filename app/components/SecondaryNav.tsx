"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCurrentUser } from "../lib/authClient";

type NavItem = { href: string; label: string };

type Section = {
  key: string;
  match: (pathname: string) => boolean;
  title: string;
  items: (ctx: { pathname: string; isSysAdmin: boolean; isSupplierManager: boolean }) => NavItem[];
};

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";

  // Prevent double-highlighting between /suppliers and /suppliers/categories
  if (href === "/suppliers") return pathname === "/suppliers";

  // For the main tenders list, only highlight on exact match (not on detail pages)
  if (href === "/tenders") return pathname === "/tenders";

  return pathname === href || pathname.startsWith(href + "/");
}

export default function SecondaryNav() {
  const pathname = usePathname() || "/";
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isSupplierManager = roles.includes("SUPPLIER_MANAGER");
  const isRequisitionOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isRequisitionManager = roles.includes("REQUISITION_MANAGER") || isSysAdmin;
  const isCommitteeChair = roles.includes("COMMITTEE_CHAIR") || isSysAdmin;
  const isTenderOfficer = roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isTenderApproval = roles.includes("TENDER_APPROVAL") || isSysAdmin;
  const isTenderPublicationPreparer = roles.includes("TENDER_PUBLICATION_PREPARER") || isSysAdmin;
  const isTenderPublicationManager = roles.includes("TENDER_PUBLICATION_MANAGER") || isSysAdmin;
  const isGeneralManager = roles.includes("GENERAL_MANAGER") || isSysAdmin;
  const canSeeApprovalQueue = isRequisitionOfficer || isRequisitionManager || isCommitteeChair;

  const sections: Section[] = [
    {
      key: "requisitions",
      title: "Requisitions",
      match: (p) => p.startsWith("/requisitions") || p.startsWith("/submissions"),
      items: ({ isSysAdmin, isSupplierManager }) => [
        // My requests: officers/managers view requisitions they created
        ...((isRequisitionOfficer || isRequisitionManager || isSysAdmin)
          ? [{ href: "/requisitions/my-requests", label: "My requests" }]
          : []),
        // List: main requisition list for officers/managers/sysadmin, all active statuses.
        ...((isRequisitionOfficer || isRequisitionManager || isSysAdmin)
          ? [{ href: "/requisitions/list", label: "List" }]
          : []),
        // Pricing: submissions hub (INVITATIONS_SENT, MANUAL_ENTRY, PRICES_RECEIVED, TENDER_PREP_DRAFT, etc.).
        // Visible only to requisition officers (and sysadmin), not managers.
        ...((isRequisitionOfficer || isSysAdmin)
          ? [{ href: "/submissions", label: "Pricing" }]
          : []),
        // Approval queue: manager/officer/committee approvals.
        ...(canSeeApprovalQueue ? [{ href: "/requisitions/waiting-approvals", label: "Approval queue" }] : []),
        // Archive: closed / tender-ready / purchase-ready / rejected.
        ...((isRequisitionOfficer || isRequisitionManager || isSysAdmin)
          ? [
              { href: "/requisitions/signature-ready", label: "Signature ready" },
			  { href: "/requisitions/archive", label: "Archive" },
            ]
          : []),
        // Suppliers management moved under Admin section; not shown here.
      ],
    },
    {
      key: "tenders",
      title: "Tenders",
      match: (p) => p.startsWith("/tenders"),
      items: () => [
        // Officers can access full tender list and ready-for-tender view.
        ...((isTenderOfficer && !isTenderApproval)
          ? [
              { href: "/tenders", label: "List" },
              { href: "/tenders/ready", label: "Ready" },
              { href: "/tenders/archive", label: "Archive" },
            ]
          : []),
        // Tender prep tabs for tender managers / admins.
        ...(isTenderApproval
          ? [
              // List: all tenders assigned to this manager (all statuses except completed),
              // implemented server-side in /tenders.
              { href: "/tenders", label: "List" },
              { href: "/tenders/waiting-approvals", label: "Approval queue" },
              { href: "/tenders/returned", label: "Returned" },
			  { href: "/tenders/ready-for-publishing", label: "Ready for publishing" },
              { href: "/tenders/archive", label: "Archive" },
            ]
          : []),
      ],
    },
    {
      key: "gm",
      title: "GM Approvals",
      match: (p) => p.startsWith("/gm-"),
      items: () =>
        isGeneralManager
          ? [
              { href: "/gm-approvals", label: "Pending" },
              { href: "/gm-dashboard", label: "Dashboard" },
            ]
          : [],
    },
    {
      key: "audit",
      title: "Audit",
      match: (p) => p.startsWith("/audit"),
      items: () => [
        { href: "/audit", label: "Audit & Logs" },
        ...(isSysAdmin ? [{ href: "/requisitions/archive", label: "Requisition archive" }] : []),
        ...(isSysAdmin ? [{ href: "/admin", label: "Admin" }] : []),
      ],
    },
    {
      key: "admin",
      title: "Admin",
      match: (p) => p.startsWith("/admin") || p.startsWith("/suppliers"),
      items: ({ isSysAdmin }) => {
        if (!isSysAdmin) return [{ href: "/admin", label: "Home" }];
        return [
          { href: "/admin", label: "Home" },
          { href: "/admin/users", label: "Users" },
          { href: "/admin/roles", label: "Roles" },
          { href: "/admin/roles/requisition-assignments", label: "Requisition officers" },
          { href: "/admin/roles/tender-assignments", label: "Tender officers" },
          { href: "/admin/roles/tender-publishing-assignments", label: "Tender Publishing" },
          { href: "/admin/departments", label: "Departments" },
          { href: "/admin/uom", label: "UOM" },
      { href: "/admin/item-categories", label: "Item categories" },
      { href: "/admin/company", label: "Company profile" },
      { href: "/admin/currencies", label: "Currencies" },
      { href: "/admin/templates", label: "Templates" },
          // Unified supplier admin
          { href: "/suppliers", label: "Suppliers" },
          { href: "/suppliers/categories", label: "Supplier categories" },
        ];
      },
    },
  ];

  // Do not show secondary nav on dashboard and main list pages (only for SYS_ADMIN who sees the new admin view)
  const isMainListPage = 
    pathname === "/dashboard" || 
    ((pathname === "/requisitions" || pathname === "/tenders" || pathname === "/submissions") && isSysAdmin);
  if (isMainListPage) return null;

  let section = sections.find((s) => s.match(pathname));

  if (!section) return null;

  const items = section.items({ pathname, isSysAdmin, isSupplierManager });
  const isAdminSection = section.key === "admin";

  return (
    <aside
      className="card"
      style={{
        boxShadow: "none",
        padding: "12px",
        background: "rgba(0,0,0,0.02)",
        // 190px -> 152px (~20% reduction)
        width: 152,
        alignSelf: "flex-start",
        position: "sticky",
        top: 16,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>{section.title}</div>

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it) => {
          const active = isAdminSection ? pathname === it.href : isActive(pathname, it.href);
          return (
            <Link
              key={it.href}
              className={active ? "btn btn-primary" : "btn"}
              href={it.href}
              style={{ width: "100%", justifyContent: "flex-start" }}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
