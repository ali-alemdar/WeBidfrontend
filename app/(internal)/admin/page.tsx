"use client";

import Link from "next/link";
import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";

function Card({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        boxShadow: "none",
        textDecoration: "none",
        color: "inherit",
        minWidth: 260,
        flex: "1 1 260px",
        padding: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", overflow: "hidden" }}>
        <span style={{ fontWeight: 800 }}>{title}</span>
        <span style={{ color: "var(--muted)", fontSize: 12, textOverflow: "ellipsis", overflow: "hidden" }}>{desc}</span>
      </div>
    </Link>
  );
}

export default function AdminHomePage() {
  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin">
      <InternalPage title="Admin" pageId="ADMSYS">
      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Admin Panel</h3>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Manage users, roles, master data, and view system logs.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 12,
        }}
      >
        <Card
          title="User Management"
          desc="Create users, assign roles, activate/deactivate, reset passwords."
          href="/admin/users"
        />
        <Card
          title="Roles"
          desc="View roles stored in the database."
          href="/admin/roles"
        />
        <Card
          title="Departments"
          desc="Maintain the requesting-department list used in requisitions."
          href="/admin/departments"
        />
        <Card
          title="Units of Measure"
          desc="Manage UOM dropdown values used in requisition items."
          href="/admin/uom"
        />
        <Card
          title="Item Categories"
          desc="Manage item categories used to classify requisition items."
          href="/admin/item-categories"
        />
        <Card
          title="Company Profile"
          desc="Set company name, logo, address and contact details."
          href="/admin/company"
        />
        <Card
          title="Currencies"
          desc="Manage allowed currencies (e.g., IQD, USD, EUR) for submissions."
          href="/admin/currencies"
        />
        <Card
          title="Templates"
          desc="Default disclaimer text and bidding form template placeholders."
          href="/admin/templates"
        />
        <Card
          title="Templates"
          desc="Default disclaimer text and bidding form template placeholders."
          href="/admin/templates"
        />
        <Card
          title="Suppliers"
          desc="Approve, edit, delete suppliers and manage supplier data."
          href="/suppliers"
        />
        <Card
          title="Audit & Logs"
          desc="Review user activity and access-denied logs."
          href="/audit"
        />
      </div>

      <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
        <h4 style={{ marginTop: 0, marginBottom: 6 }}>Coming next</h4>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--muted)" }}>
          <li>Workflow configuration (approval levels, default reviewers/approvers)</li>
          <li>Reporting exports</li>
        </ul>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
