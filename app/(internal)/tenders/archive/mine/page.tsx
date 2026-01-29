"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet } from "../../../../lib/api";

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

export default function TenderArchiveMinePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/archive/mine");
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
      anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title="My archived tenders"
    >
      <InternalPage title="My archived tenders" pageId="TENARC">

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Archived tenders assigned to me</h3>

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
                <th>Closing at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t: any) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  {/* Show tender number instead of internal UUID */}
                  <td>TEN-{t.tenderNumber?.toString().padStart(5, '0')}</td>
                  <td>{t.requisition?.title || t.title || ""}</td>
                  <td>{t.status === "CLOSED" ? "TENDER_REJECTED" : t.status}</td>
                  <td>{isoDate(t.createdAt)}</td>
                  <td>{isoDate(t.closingAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${t.id}/signature`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No archived tenders assigned to you.
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