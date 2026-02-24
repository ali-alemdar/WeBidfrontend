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

export default function ReadyForPublishingPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/publishing");
      // Filter for TENDER_READY_FOR_PUBLISHING status
      const filtered = Array.isArray(r) ? r.filter((t: any) => t.status === "TENDER_READY_FOR_PUBLISHING") : [];
      setRows(filtered);
    } catch (e: any) {
      setError(e?.message || "Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <RequireRoles anyOf={["TENDER_APPROVAL", "SYS_ADMIN"]} title="Tenders / Ready for Publishing">
      <InternalPage title="Tenders / Ready for Publishing">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tenders" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Tenders ready for publishing</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Last action</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>TEN-{String(t.tender_id || 0).padStart(5, "0")}</td>
                  <td>{t.title || "(Untitled)"}</td>
                  <td>
                    <span className="pill">{(t.status || "").replace(/_/g, " ")}</span>
                  </td>
                  <td>{fmtDate(t.updatedAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${t.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No tenders ready for publishing.
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
