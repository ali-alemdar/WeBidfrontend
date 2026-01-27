"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
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

export default function SignatureReadyRequisitionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/requisitions/submissions");
      const list = Array.isArray(r) ? r : [];
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () => rows.filter((r: any) => String(r.status) === "SIGNATURE_READY_REQUISITION"),
    [rows],
  );

  return (
    <RequireRoles
      anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title="Requisitions / Signature ready"
    >
      <InternalPage title="Requisitions / Signature ready">
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Signature-ready requisitions</h3>

          <table
            width="100%"
            cellPadding={8}
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r: any) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td>{isoDate(r.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/requisitions/${r.id}/approval`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No requisitions are signature-ready.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loading && (
            <p style={{ color: "var(--muted)" }}>Loading…</p>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
