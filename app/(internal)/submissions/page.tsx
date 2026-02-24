"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";
import BackButton from "../../components/BackButton";
import { apiGet } from "../../lib/api";
import { getCurrentUser } from "../../lib/authClient";

function isoDate(v: any) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function SubmissionsHubPage() {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isManager = roles.includes("REQUISITION_MANAGER") || isSysAdmin;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/requisitions/submissions");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    // Show all statuses except REQUISITION_REJECTED and PURCHASE_READY (archive only)
    // REQUISITION_RETURNED should be shown so managers can review and resubmit
    const nonRejected = rows.filter((r) => {
      const s = String(r.status || "");
      return s !== "REQUISITION_REJECTED" && s !== "PURCHASE_READY";
    });

    // Officers only see requisitions they are assigned to; managers/sysadmin see all.
    const userId = Number((user as any)?.id);
    return nonRejected.filter((r) => {
      if (isSysAdmin || isManager) return true;
      const assigns = Array.isArray((r as any).officerAssignments) ? (r as any).officerAssignments : [];
      const ids = assigns
        .map((a: any) => Number(a?.userId))
        .filter((n: any) => Number.isFinite(n));
      return isOfficer && ids.includes(userId);
    });
  }, [rows, isOfficer, isManager, isSysAdmin, user]);

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "COMMITTEE_CHAIR", "SYS_ADMIN"]} title="Submissions">
      <InternalPage title="Submissions">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Submitted / waiting requisitions</h3>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Manual</th>
              <th>Items</th>
              <th>Invited</th>
              <th>Received</th>
              <th>Last update</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{r.id}</td>
                <td>{r.title}</td>
                <td>{r.status === "MANUAL_ENTRY" ? "Manual entry" : r.status}</td>
                <td>{r.manualSubmissions ? <span className="pill">Manual</span> : ""}</td>
                <td>{r.itemCount ?? ""}</td>
                <td>{r.invitedCount ?? ""}</td>
                <td>{r.submittedCount ?? ""}</td>
                <td>{isoDate(r.lastSubmissionAt)}</td>
                <td style={{ textAlign: "right" }}>
                  <Link className="btn" href={`/submissions/${r.id}`}>
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ color: "var(--muted)" }}>
                  No invited requisitions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      </div>

      <div className="card" style={{ boxShadow: "none", marginTop: 12, background: "rgba(0,0,0,0.02)" }}>
        <h4 style={{ marginTop: 0 }}>Note</h4>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          This is a read-only hub for supplier submissions. For development, we still allow manual entry from the submission detail page.
        </p>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
