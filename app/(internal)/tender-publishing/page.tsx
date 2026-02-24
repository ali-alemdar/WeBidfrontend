"use client";

import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";
import { apiGet } from "../../lib/api";
import { getCurrentUser } from "../../lib/authClient";

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

export default function TenderPublishingPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [expandedStatuses, setExpandedStatuses] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState("");

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");

  const displayStatus = (s: any) => {
    const v = String(s || "").trim();
    return v || "DRAFT";
  };

  const getOfficerNames = (item: any) => {
    const assignments = Array.isArray((item as any).officerAssignments)
      ? (item as any).officerAssignments
      : [];
    return assignments
      .map((a: any) => (a as any).user?.fullName || (a as any).user?.email || "")
      .filter((name: string) => name)
      .join(", ") || "—";
  };

  const getManagerName = (item: any) => {
    const manager = (item as any).prepManager;
    if (!manager) return "—";
    return manager.fullName || manager.email || "—";
  };

  const groupByStatus = (items: any[]) => {
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const s = String(item.status || "");
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }
    return grouped;
  };

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const resp = await apiGet("/tenders/publishing");
        console.log("Publishing tenders response:", resp);
        console.log("Is array:", Array.isArray(resp));
        console.log("Length:", resp?.length);
        setTenders(Array.isArray(resp) ? resp : []);
      } catch (e: any) {
        console.error("Error:", e);
        const msg = String(e?.message || "");
        if (!msg.toLowerCase().includes("forbidden")) {
          setError(msg || "Failed to load tenders");
        }
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tenders;
    return tenders.filter((t) => {
      const hay = [
        String(t.id ?? ""),
        String(t.title ?? ""),
        String(t.status ?? ""),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [tenders, q]);

  const byStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    for (const item of filtered) {
      const s = displayStatus(item.status);
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }
    return grouped;
  }, [filtered]);

  const statuses = Object.keys(byStatus).sort();

  const toggleStatus = (status: string) => {
    setExpandedStatuses((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const statusSegments = useMemo(() => {
    const palette = ["#2563eb", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"];
    return statuses
      .map((status, idx) => ({
        label: status.replace(/_/g, " "),
        value: byStatus[status].length,
        color: palette[idx % palette.length],
      }))
      .filter(s => s.value > 0);
  }, [statuses, byStatus]);

  return (
    <RequireRoles anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]} title="Tender Publishing">
      <InternalPage title="Tender Publishing">
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
              <div style={{ fontWeight: 800, marginBottom: 12, fontSize: 16 }}>Tenders by Status</div>
              <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, alignItems: "center" }}>
                <svg width="280" height="280" viewBox="0 0 160 160">
                  {(() => {
                    const total = statusSegments.reduce((a, s) => a + (s.value || 0), 0);
                    const palette = ["#2563eb", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"];
                    const cx = 80; const cy = 80; const radius = 70;
                    if (statusSegments.length === 1) {
                      return (
                        <>
                          <circle cx={cx} cy={cy} r={radius} fill={palette[0]} />
                          <circle cx={cx} cy={cy} r={40} fill="#fff" />
                          <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 28, fontWeight: 900, fill: "#111827" }}>{total}</text>
                          <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "#6b7280" }}>total</text>
                        </>
                      );
                    }
                    let angle = -90;
                    return (
                      <>
                        {statusSegments.filter(s => s.value > 0).map((s, i) => {
                          const sweep = total > 0 ? (s.value / total) * 360 : 0;
                          const start = angle; angle += sweep;
                          const startRad = (start - 90) * Math.PI / 180;
                          const endRad = (angle - 90) * Math.PI / 180;
                          const x1 = cx + radius * Math.cos(startRad);
                          const y1 = cy + radius * Math.sin(startRad);
                          const x2 = cx + radius * Math.cos(endRad);
                          const y2 = cy + radius * Math.sin(endRad);
                          const large = sweep > 180 ? 1 : 0;
                          return <path key={i} d={`M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`} fill={palette[i % palette.length]} />;
                        })}
                        <circle cx={cx} cy={cy} r={40} fill="#fff" />
                        <text x={cx} y={cy - 4} textAnchor="middle" style={{ fontSize: 28, fontWeight: 900, fill: "#111827" }}>{total}</text>
                        <text x={cx} y={cy + 20} textAnchor="middle" style={{ fontSize: 12, fontWeight: 700, fill: "#6b7280" }}>total</text>
                      </>
                    );
                  })()}
                </svg>
                <div style={{ display: "grid", gap: 10 }}>
                  {(() => {
                    const palette = ["#2563eb", "#22c55e", "#eab308", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f59e0b"];
                    return statusSegments.filter(s => s.value > 0).map((s, idx) => (
                      <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ width: 12, height: 12, borderRadius: 999, background: palette[idx % palette.length], flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.label}</div>
                        <div style={{ fontWeight: 900, fontSize: 14 }}>{s.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>Search</div>
                <input
                  className="input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ID, title, status…"
                  style={{ maxWidth: 520 }}
                />
              </div>
              <div style={{ fontWeight: 900, color: "var(--muted)" }}>Total: {tenders.length}</div>
            </div>
          </div>

          {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

          {!isSysAdmin && statuses.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No tenders found.</p>
          ) : !isSysAdmin ? (
            statuses.map((status) => {
              const statusItems = byStatus[status];
              const isExpanded = expandedStatuses[status] ?? false;

              return (
                <div key={status} style={{ marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => toggleStatus(status)}
                    style={{
                      width: "100%",
                      padding: "12px 16px",
                      background: "#f3f4f6",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 18 }}>{isExpanded ? "−" : "+"}</span>
                    <span>
                      {status.replace(/_/g, " ")} ({statusItems.length})
                    </span>
                  </button>

                  {isExpanded && (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        cellPadding={8}
                        style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%", fontSize: 13, marginTop: 8 }}
                      >
                        <thead>
                          <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                            <th style={{ width: 100, borderBottom: "1px solid #d1d5db" }}>Tender #</th>
                            <th style={{ borderBottom: "1px solid #d1d5db" }}>Title</th>
                            <th style={{ width: 180, borderBottom: "1px solid #d1d5db" }}>Officers</th>
                            <th style={{ width: 120, borderBottom: "1px solid #d1d5db" }}>Manager</th>
                            <th style={{ width: 100, borderBottom: "1px solid #d1d5db" }}>Created</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statusItems.map((item) => (
                            <tr
                              key={item.id}
                              style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}
                            >
                              <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>TEN-{String(item.tenderNumber || 0).padStart(5, "0")}</td>
                              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {item.requisitionCopy?.title || item.requisition?.title || item.title || "(Untitled)"}
                              </td>
                              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                                {getOfficerNames(item)}
                              </td>
                              <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                                {getManagerName(item)}
                              </td>
                              <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                {fmtDate(item.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })
          ) : isSysAdmin ? (
            <div>
              {statuses.map((status) => {
                const statusItems = byStatus[status];
                const isExpanded = expandedStatuses[status] ?? false;
                return (
                  <div key={status} style={{ marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => toggleStatus(status)}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        background: "#e5e7eb",
                        borderRadius: 3,
                        fontSize: 14,
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{isExpanded ? "−" : "+"}</span>
                      <span>{status.replace(/_/g, " ")} ({statusItems.length})</span>
                    </button>
                    {isExpanded && (
                    <table
                      width="100%"
                      cellPadding={6}
                      style={{ borderCollapse: "collapse", fontSize: 13, marginTop: 4 }}
                    >
                      <thead>
                        <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                          <th style={{ width: 100, borderBottom: "1px solid #d1d5db" }}>Tender #</th>
                          <th style={{ borderBottom: "1px solid #d1d5db" }}>Title</th>
                          <th style={{ width: 180, borderBottom: "1px solid #d1d5db" }}>Officers</th>
                          <th style={{ width: 120, borderBottom: "1px solid #d1d5db" }}>Manager</th>
                          <th style={{ width: 100, borderBottom: "1px solid #d1d5db" }}>Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statusItems.map((item) => (
                          <tr
                            key={item.id}
                            style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}
                          >
                            <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>TEN-{String(item.tenderNumber || 0).padStart(5, "0")}</td>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {item.requisitionCopy?.title || item.requisition?.title || item.title || "(Untitled)"}
                            </td>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                              {getOfficerNames(item)}
                            </td>
                            <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12 }}>
                              {getManagerName(item)}
                            </td>
                            <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                              {fmtDate(item.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
