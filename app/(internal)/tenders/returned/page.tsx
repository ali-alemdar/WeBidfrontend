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

export default function ReturnedTendersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const tenders = await apiGet("/tenders/returned");
      
      const returnedTenders = (Array.isArray(tenders) ? tenders : []).map((t: any) => ({
        ...t,
        title: t.requisition?.title || t.title || "(Untitled)"
      }));
      
      setRows(returnedTenders);
    } catch (e: any) {
      setError(e?.message || "Failed to load returned tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireRoles anyOf={["TENDER_APPROVAL", "SYS_ADMIN"]} title="Tenders / Returned">
      <InternalPage title="Tenders / Returned">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tenders" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Returned Tenders</h3>
          <p style={{ color: "var(--muted)", marginBottom: 16, fontSize: 13 }}>
            Tenders returned by Manager or General Manager for officer revision.
          </p>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Returned By</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{`TEN-${String(item.tender_id || 0).padStart(5, "0")}`}</td>
                  <td>{item.title || "(Untitled)"}</td>
                  <td>
                    <span className="pill" style={{
                      backgroundColor: item.status === "TENDER_RETURNED_GM" ? "#dbeafe" : "#fef3c7",
                      color: item.status === "TENDER_RETURNED_GM" ? "#1e40af" : "#92400e"
                    }}>
                      {item.status === "TENDER_RETURNED_GM" ? "GM Return" : "Manager Return"}
                    </span>
                  </td>
                  <td>{item.status === "TENDER_RETURNED_GM" ? "General Manager" : "Tender Manager"}</td>
                  <td>{fmtDate(item.updatedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${item.tender_id || item.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No returned tenders.
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
