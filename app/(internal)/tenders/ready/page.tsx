"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import BackButton from "../../../components/BackButton";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet } from "../../../lib/api";

function fmtDate(value: any) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function ReadyRequisitionsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [requisitions, tenders] = await Promise.all([
        apiGet("/requisitions/ready-for-tender"),
        apiGet("/tenders")
      ]);
      
      const readyReqs = Array.isArray(requisitions) ? requisitions.map((r: any) => ({
        ...r,
        type: 'requisition',
        id: `req-${r.id}`
      })) : [];
      
      const allTenders = Array.isArray(tenders) ? tenders : [];
      const processingTenders = allTenders.filter((t: any) => {
        const status = String(t.status || "");
        return [
          "TENDER_PREP_DRAFT",
          "TENDER_PREP_REVIEW",
          "TENDER_PREP_RETURNED",
          "TENDER_PENDING_APPROVAL",
          "TENDER_RETURNED_GM",
          "DRAFT_TENDER_RETURN"
        ].includes(status);
      }).map((t: any) => ({
        ...t,
        type: 'tender',
        title: t.requisition?.title || "(Untitled)"
      }));
      
      setRows([...readyReqs, ...processingTenders]);
    } catch (e: any) {
      setError(e?.message || "Failed to load ready requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "SYS_ADMIN"]} title="Tenders / Ready">
      <InternalPage title="Tenders / Ready">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tenders" />


          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Ready for tender creation</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Department</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{item.type === 'requisition' ? item.id : `TEN-${String(item.tender_id || 0).padStart(5, "0")}`}</td>
                  <td>{item.title || "(Untitled)"}</td>
                  <td>{item.status ? <span className="pill">{(item.status || "").replace(/_/g, " ")}</span> : "-"}</td>
                  <td>{item.requestingDepartment || "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={item.type === 'requisition' ? `/requisitions/${item.id.replace('req-', '')}/view` : `/tenders/${item.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No requisitions or tenders ready for processing.
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