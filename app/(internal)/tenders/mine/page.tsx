"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

export default function TenderManagerListPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/mine");
      const list = Array.isArray(r) ? r : [];
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((t: any) => {
        const s = String(t.status || "");
        // Manager "List" shows active / in-flight tenders only.
        // Once a tender reaches TENDER_PENDING_APPROVAL or later, it is
        // considered archived for the manager and moves to Archive.
        return ![
          "TENDER_PENDING_APPROVAL",
          "TENDER_PREP_APPROVED",
          "TENDER_REJECTED",
          "AWARDED",
          "CLOSED",
        ].includes(s);
      }),
    [rows],
  );

  return (
    <RequireRoles
      anyOf={["TENDER_APPROVAL", "SYS_ADMIN"]}
      title="Tenders / List"
    >
      <InternalPage title="Tenders / List" pageId="TENLST">

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Tenders assigned to me</h3>

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
              {filtered.map((t: any) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  {/* Show business ID (requisitionId) instead of internal UUID */}
                  <td>{t.requisitionId ?? ""}</td>
                  <td>{t.requisition?.title || t.title || ""}</td>
                  <td>{t.status}</td>
                  <td>{isoDate(t.createdAt)}</td>
                  <td>{isoDate(t.closingAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${t.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No tenders assigned to you.
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
