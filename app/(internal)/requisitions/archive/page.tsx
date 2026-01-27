"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import BackButton from "../../../components/BackButton";
import { apiGet } from "../../../lib/api";

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

export default function RequisitionArchivePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/requisitions/archive");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load archive");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireRoles
      anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "SYS_ADMIN"]}
      title="Requisitions / Archive"
    >
      <InternalPage title="Requisitions / Archive">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Archived requisitions</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Manager</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const status = String(r.status || "");
                // Determine whether requisition has reached signature-ready / signed stage.
                const isSignatureStage =
                  status === "SIGNATURE_READY_REQUISITION" ||
                  status === "TENDER_READY" ||
                  status === "PURCHASE_READY" ||
                  status === "CLOSED";
                const href = isSignatureStage
                  ? `/requisitions/${r.id}/approval-print`
                  : `/requisitions/${r.id}/view`;
                return (
                  <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>
                      <Link href={href}>
                        {r.id}
                      </Link>
                    </td>
                    <td>
                      <Link href={href}>
                        {r.title}
                      </Link>
                    </td>
                    <td>{r.status}</td>
                    <td>{r.managerName || ""}</td>
                    <td>{isoDate(r.createdAt)}</td>
                    <td></td>
                  </tr>
                );
              })}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--muted)" }}>
                    No archived requisitions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
