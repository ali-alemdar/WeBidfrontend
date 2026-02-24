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

export default function TenderArchivePage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/archive");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load archived tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((t) => {
      const hay = [
        String(t.id ?? ""),
        String(t.tender_id ?? ""),
        String(t.title ?? ""),
        String(t.status ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [rows, q]);

  const byStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const item of filtered) {
      const s = item.status || "UNKNOWN";
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }
    return grouped;
  }, [filtered]);

  const statuses = Object.keys(byStatus).sort();

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]} title="Tenders / Archive">
      <InternalPage title="Tenders / Archive">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <BackButton fallbackHref="/tenders" />
            <button className="btn" onClick={load} disabled={loading}>
              Refresh
            </button>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 600, whiteSpace: "nowrap" }}>Search</div>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ID, title, status…"
              style={{ maxWidth: 300 }}
            />
          </div>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Archived tenders</h3>
            <div style={{ fontWeight: 900, color: "var(--muted)" }}>
              Total: {filtered.length}
            </div>
          </div>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

          {!loading && statuses.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No archived tenders found.</p>
          ) : (
            statuses.map((status) => {
              const statusItems = byStatus[status];

              return (
                <div key={status} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      background: "#f3f4f6",
                      padding: "8px 12px",
                      borderRadius: 4,
                      fontWeight: 700,
                      marginBottom: 8,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>{status.replace(/_/g, " ")}</span>
                    <span style={{ color: "var(--muted)" }}>({statusItems.length})</span>
                  </div>

                  <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                        <th style={{ borderBottom: "1px solid #d1d5db" }}>ID</th>
                        <th style={{ borderBottom: "1px solid #d1d5db" }}>Title</th>
                        <th style={{ borderBottom: "1px solid #d1d5db" }}>Created</th>
                        <th style={{ borderBottom: "1px solid #d1d5db" }}>Status</th>
                        <th style={{ borderBottom: "1px solid #d1d5db" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {statusItems.map((t) => (
                        <tr key={t.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ whiteSpace: "nowrap" }}>
                            TEN-{String(t.tender_id || 0).padStart(5, "0")}
                          </td>
                          <td>{t.title || "(Untitled)"}</td>
                          <td style={{ whiteSpace: "nowrap" }}>{fmtDate(t.createdAt)}</td>
                          <td><span className="pill">{(t.status || "").replace(/_/g, " ")}</span></td>
                          <td style={{ textAlign: "right" }}>
                            <Link className="btn" href={`/tenders/${t.id}`}>
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}