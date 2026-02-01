"use client";

import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";
import { apiGet } from "../../lib/api";
import { getCurrentUser } from "../../lib/authClient";
import { PieChart } from "../../components/PieChart";

export default function EmployeeDashboardPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [tenders, setTenders] = useState<any[]>([]);
  const [publishingTenders, setPublishingTenders] = useState<any[]>([]);
  const [error, setError] = useState<string>("");

  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
  const [selectedOfficerName, setSelectedOfficerName] = useState<string>("");
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    "Requisitions": false,
    "Tender Preparation": false,
    "Tender Publishing": false,
  });

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const hasRequisitionOfficer = roles.includes("REQUISITION_OFFICER");
  const hasRequisitionManager = roles.includes("REQUISITION_MANAGER");
  const hasTenderApproval = roles.includes("TENDER_APPROVAL");
  const isRequester = roles.includes("REQUESTER");
  const hasTenderRole =
    roles.includes("TENDERING_OFFICER") ||
    roles.includes("TENDER_COMMITTEE") ||
    roles.includes("TENDER_APPROVAL");
  const isAdminOnly = isSysAdmin && !hasRequisitionOfficer && !hasRequisitionManager && !hasTenderApproval && !hasTenderRole && !isRequester;
  const isOfficer = hasRequisitionOfficer || isSysAdmin;
  const isManager = hasRequisitionManager || isSysAdmin;
  const isTenderManager = hasTenderApproval || isSysAdmin;
  const requesterOnly =
    isRequester && !isOfficer && !isManager && !isTenderManager && !isSysAdmin;

  const [q, setQ] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        setError("");

        // Load requisitions
        try {
          const [active, archived] = await Promise.all([
            apiGet("/requisitions"),
            apiGet("/requisitions/archive"),
          ]);
          const a = Array.isArray(active) ? active : [];
          const b = Array.isArray(archived) ? archived : [];
          setRequisitions([...a, ...b]);
        } catch (e: any) {
          const msg = String(e?.message || "");
          if (!msg.toLowerCase().includes("forbidden")) {
            setError(msg || "Failed to load requisitions");
          }
        }

        // Load all tenders
        try {
          if (isSysAdmin) {
            const allTenders = await apiGet("/tenders/admin/all");
            const allTendersArray = Array.isArray(allTenders) ? allTenders : [];
            setTenders(allTendersArray);
            
            // For publishing tenders, include all publication pipeline statuses
            const publishingStatuses = new Set([
              "TENDER_PREP_COMPLETE",
              "TENDER_PUBLICATION_PREP",
              "TENDER_PUBLICATION_APPROVED",
              "TENDER_PUBLICATION_SIGNING",
              "READY_TO_PUBLISH",
              "PUBLISHED",
              "TENDER_EDITING",
              "TENDER_PREP_DRAFT",
              "TENDER_PREP_REVIEW",
              "TENDER_PREP_APPROVED",
            ]);
            const pubTenders = allTendersArray.filter((t) => publishingStatuses.has(String(t.status || "")));
            setPublishingTenders(pubTenders);
          } else {
            const results = await Promise.allSettled([
              apiGet("/tenders"),
              apiGet("/tenders/archive/mine"),
            ]);
            const tenderBase = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
            const tenderArch = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
            setTenders([...tenderBase, ...tenderArch]);
            
            try {
              const pub = await apiGet("/tenders/publishing");
              setPublishingTenders(Array.isArray(pub) ? pub : []);
            } catch (e: any) {
              console.error("Error loading publishing tenders:", e);
            }
          }
        } catch (e: any) {
          console.error("Error loading tenders:", e);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data");
      }
    };
    load();
  }, [hasTenderRole, isTenderManager, isSysAdmin]);

  const archivedStatuses = new Set([
    "PURCHASE_READY",
    "REQUISITION_REJECTED",
    "CLOSED",
  ]);

  const isArchivedStatus = (s: string) => archivedStatuses.has(s);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const items = isTenderManager || hasTenderRole ? tenders : requisitions;
    for (const r of items) {
      const s = String(r.status || "");
      if (isArchivedStatus(s)) continue;
      counts[s] = (counts[s] || 0) + 1;
    }
    return counts;
  }, [requisitions, tenders, isTenderManager, hasTenderRole]);

  const officerStats = useMemo(() => {
    if (!isManager && !isSysAdmin) return [] as any[];

    type Bucket = {
      officerId: number;
      officerName: string;
      byStatus: Record<string, number>;
      total: number;
    };

    const byOfficer = new Map<number, Bucket>();

    for (const r of requisitions) {
      const status = String(r.status || "");
      if (isArchivedStatus(status)) continue;
      const assignments = Array.isArray((r as any).officerAssignments)
        ? (r as any).officerAssignments
        : [];

      for (const a of assignments) {
        const oid = Number(a?.userId);
        if (!Number.isFinite(oid)) continue;
        if (!byOfficer.has(oid)) {
          const name = (a as any).user?.fullName || (a as any).user?.email || `Officer ${oid}`;
          byOfficer.set(oid, {
            officerId: oid,
            officerName: name,
            byStatus: {},
            total: 0,
          });
        }
        const bucket = byOfficer.get(oid)!;
        bucket.byStatus[status] = (bucket.byStatus[status] || 0) + 1;
        bucket.total += 1;
      }
    }

    return Array.from(byOfficer.values()).sort((a, b) => b.total - a.total);
  }, [requisitions, isManager, isSysAdmin]);

  const palette: Record<string, string> = {
    BLUE: "#2563eb",
    YELLOW: "#eab308",
    GREEN: "#22c55e",
    RED: "#ef4444",
  };

  const colorByStatus: Record<string, string> = {
    DRAFT: palette.BLUE,
    INTERNAL_REQUEST_RECEIVED: palette.BLUE,
    INVITATIONS_SENT: palette.BLUE,
    MANUAL_ENTRY: palette.BLUE,
    PRICES_RECEIVED: palette.BLUE,
    PRICES_REVIEWED: palette.BLUE,
    REFERENCE_PRICE_CALCULATED: palette.BLUE,
    BIDDING_FORM_PREPARED: palette.BLUE,
    TENDER_PREP_DRAFT: palette.BLUE,
    APROVAL_PENDING: palette.YELLOW,
    TENDER_READY: palette.BLUE,
    PURCHASE_READY: palette.GREEN,
    CLOSED: palette.BLUE,
    REQUISITION_REJECTED: palette.RED,
  };

  const statusSegments = useMemo(() => {
    const segments: { label: string; value: number; color: string }[] = [];

    const overallPalette = [
      "#4b5563", // grey
      "#2563eb", // blue
      "#eab308", // yellow
      "#22c55e", // green
      "#ef4444", // red
      "#0ea5e9", // cyan
    ];

    Object.keys(statusCounts)
      .filter((k) => (statusCounts as any)[k] > 0 && (!isSysAdmin || k !== "DRAFT"))
      .sort()
      .forEach((k, idx) => {
        segments.push({
          label: k.replace(/_/g, " "),
          value: (statusCounts as any)[k] || 0,
          // Use an explicit palette index so stacked bar is not all grey/blue
          color: overallPalette[idx % overallPalette.length] || "#6b7280",
        });
      });

    return segments;
  }, [statusCounts, isSysAdmin]);

  const itemsForSummary = isTenderManager || hasTenderRole ? tenders : requisitions;
  const total = itemsForSummary.length;
  const archivedCount = itemsForSummary.filter((r) =>
    archivedStatuses.has(String(r.status || "")),
  ).length;
  const activeCount = total - archivedCount;

  const recent = useMemo(
    () => itemsForSummary.slice(0, 5),
    [itemsForSummary],
  );

  const officerRequisitions = useMemo(() => {
    if (selectedOfficerId == null) return [] as any[];
    return requisitions.filter((r) => {
      const s = String(r.status || "");
      if (isArchivedStatus(s)) return false;
      if (!Array.isArray((r as any).officerAssignments)) return false;
      return (r as any).officerAssignments.some(
        (a: any) => Number(a?.userId) === selectedOfficerId,
      );
    });
  }, [requisitions, selectedOfficerId]);

  // Categorize tenders for admin view
  const prepStageTenders = useMemo(() => {
    const prepStatuses = new Set(["DRAFT", "DRAFT_TENDER", "TENDER_PREP_APPROVED", "TENDER_PREP_COMPLETE", "CLOSED", "TENDER_REJECTED"]);
    return tenders.filter((t) => prepStatuses.has(String(t.status || "")));
  }, [tenders]);

  const publishingStageTenders = useMemo(() => {
    const pubStatuses = new Set(["TENDER_PUBLICATION_PREP", "AWAITING_PUBLICATION_APPROVAL", "PUBLISHED", "TENDER_EDITING"]);
    return publishingTenders.filter((t) => pubStatuses.has(String(t.status || "")));
  }, [publishingTenders]);

  // Group items by status
  const groupByStatus = (items: any[]) => {
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const s = String(item.status || "");
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(item);
    }
    return grouped;
  };

  const tenderOfficerStats = useMemo(() => {
    if (!isTenderManager && !isSysAdmin) return [] as any[];

    type Bucket = {
      officerId: number;
      officerName: string;
      byStatus: Record<string, number>;
      total: number;
    };

    const byOfficer = new Map<number, Bucket>();

    for (const t of tenders) {
      const status = String(t.status || "");
      const assignments = Array.isArray((t as any).officerAssignments)
        ? (t as any).officerAssignments
        : [];

      for (const a of assignments) {
        const oid = Number(a?.userId);
        if (!Number.isFinite(oid)) continue;
        if (!byOfficer.has(oid)) {
          const name = (a as any).user?.fullName || (a as any).user?.email || `Officer ${oid}`;
          byOfficer.set(oid, {
            officerId: oid,
            officerName: name,
            byStatus: {},
            total: 0,
          });
        }
        const bucket = byOfficer.get(oid)!;
        bucket.byStatus[status] = (bucket.byStatus[status] || 0) + 1;
        bucket.total += 1;
      }
    }

    return Array.from(byOfficer.values()).sort((a, b) => b.total - a.total);
  }, [tenders, isTenderManager, isSysAdmin]);

  return (
    <RequireRoles
      anyOf={[
        "REQUESTER",
        "REQUISITION_OFFICER",
        "REQUISITION_MANAGER",
        "TENDERING_OFFICER",
        "TENDER_APPROVAL",
        "SYS_ADMIN",
      ]}
      title="Dashboard"
    >
      <InternalPage title="Dashboard" pageId="DASALL">
        <div className={selectedOfficerId != null ? "no-print" : ""}>
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img
              src="/I2NLogoBlue.jpg"
              alt="In2Networks Pty Ltd"
              style={{ width: 100, height: 100, objectFit: "contain", marginBottom: 12 }}
            />
            <div style={{ fontSize: 28, fontWeight: 900 }}>In2Networks Pty Ltd</div>
            <div style={{ color: "var(--muted)", marginTop: 4, fontSize: 14 }}>Internal e-bidding workspace</div>
          </div>

          {isSysAdmin && (() => {
            const reqPalette = ["#2563eb", "#0ea5e9", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];
            const reqByStatus = groupByStatus(requisitions);
            const reqSegments = Object.keys(reqByStatus)
              .sort()
              .map((status, idx) => ({
                label: status.replace(/_/g, " "),
                value: reqByStatus[status].length,
                color: reqPalette[idx % reqPalette.length],
              }))
              .filter(s => s.value > 0);

            const tenderPalette = ["#22c55e", "#16a34a", "#4ade80", "#84cc16", "#fbbf24", "#fb923c", "#f87171"];
            const tenderByStatus = groupByStatus(tenders);
            const tenderSegments = Object.keys(tenderByStatus)
              .sort()
              .map((status, idx) => ({
                label: status.replace(/_/g, " "),
                value: tenderByStatus[status].length,
                color: tenderPalette[idx % tenderPalette.length],
              }))
              .filter(s => s.value > 0);

            const pubPalette = ["#f59e0b", "#fbbf24", "#fcd34d", "#fda34b", "#f97316", "#fb923c", "#ff6b6b"];
            const pubByStatus = groupByStatus(publishingTenders);
            const pubSegments = Object.keys(pubByStatus)
              .sort()
              .map((status, idx) => ({
                label: status.replace(/_/g, " "),
                value: pubByStatus[status].length,
                color: pubPalette[idx % pubPalette.length],
              }))
              .filter(s => s.value > 0);

            return (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 }}>
                <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 8 }}>
                  <PieChart
                    title="Requisitions"
                    segments={reqSegments.length > 0 ? reqSegments : [{ label: "No data", value: 1, color: "#d1d5db" }]}
                  />
                </div>
                <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 8 }}>
                  <PieChart
                    title="Tender Preparation"
                    segments={tenderSegments.length > 0 ? tenderSegments : [{ label: "No data", value: 1, color: "#d1d5db" }]}
                  />
                </div>
                <div style={{ padding: 12, background: "#f3f4f6", borderRadius: 8 }}>
                  <PieChart
                    title="Tender Publishing"
                    segments={pubSegments.length > 0 ? pubSegments : [{ label: "No data", value: 1, color: "#d1d5db" }]}
                  />
                </div>
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
            <input
              className="input"
              placeholder="Search by ID, title, department, status…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 260 }}
            />
          </div>

          {requesterOnly ? (
            <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>My work summary</h3>
              <div style={{ display: "grid", gridTemplateColumns: "240px auto", gap: 12 }}>
                <PieChart title="My requisitions by status" segments={statusSegments} />
                <div>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    This view shows your own requisitions only (drafts, in-progress, and completed).
                  </p>
                  <ul style={{ paddingLeft: 18, marginTop: 8 }}>
                    <li>
                      Drafts: <strong>{statusCounts.DRAFT || 0}</strong>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : null}

          {selectedOfficerId != null ? (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0,0,0,0.4)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 50,
              }}
            >
              <div
                className="card"
                style={{
                  maxWidth: 900,
                  width: "90%",
                  maxHeight: "80vh",
                  overflow: "auto",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <h3 style={{ margin: 0 }}>Requisitions for {selectedOfficerName}</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => {
                        if (typeof window !== "undefined") window.print();
                      }}
                    >
                      Print
                    </button>
                    <button type="button" className="btn" onClick={() => setSelectedOfficerId(null)}>
                      Close
                    </button>
                  </div>
                </div>

                <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>ID</th>
                      <th>Title</th>
                      <th>Status</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officerRequisitions.map((r) => (
                      <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                        <td>{r.id}</td>
                        <td>{r.title}</td>
                        <td>{r.status}</td>
                        <td>{r.createdAt ? String(r.createdAt).slice(0, 10) : ""}</td>
                      </tr>
                    ))}
                    {officerRequisitions.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ color: "var(--muted)" }}>
                          No requisitions found for this officer.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {isSysAdmin ? (
            <div>
              {/* Collapsible Category Component */}
              {["Requisitions", "Tender Preparation", "Tender Publishing"].map((category) => {
                const isExpanded = expandedCategories[category] ?? true;
                let items: any[] = [];
                let term = q.trim().toLowerCase();

                if (category === "Requisitions") {
                  items = requisitions.filter((r) => {
                    if (!term) return true;
                    const id = String(r.id || "").toLowerCase();
                    const title = String(r.title || r.description || "").toLowerCase();
                    const dept = String((r as any).department?.name || "").toLowerCase();
                    const status = String(r.status || "").toLowerCase();
                    return id.includes(term) || title.includes(term) || dept.includes(term) || status.includes(term);
                  });
                } else if (category === "Tender Preparation") {
                  items = prepStageTenders.filter((t) => {
                    if (!term) return true;
                    const id = String(t.id || "").toLowerCase();
                    const tenderNo = String((t as any).tenderNumber || "").toLowerCase();
                    const title = String(t.requisition?.title || t.title || "").toLowerCase();
                    const dept = String(t.requisition?.department?.name || "").toLowerCase();
                    const status = String(t.status || "").toLowerCase();
                    return id.includes(term) || tenderNo.includes(term) || title.includes(term) || dept.includes(term) || status.includes(term);
                  });
                } else if (category === "Tender Publishing") {
                  items = publishingTenders.filter((t) => {
                    if (!term) return true;
                    const id = String(t.id || "").toLowerCase();
                    const tenderNo = String((t as any).tenderNumber || "").toLowerCase();
                    const title = String(t.requisition?.title || t.title || "").toLowerCase();
                    const dept = String(t.requisition?.department?.name || "").toLowerCase();
                    const status = String(t.status || "").toLowerCase();
                    return id.includes(term) || tenderNo.includes(term) || title.includes(term) || dept.includes(term) || status.includes(term);
                  });
                }

                const byStatus = groupByStatus(items);
                const statuses = Object.keys(byStatus).sort();

                // Calculate latest activity date for sorting within each status
                const itemsWithLatestDate = statuses.map((status) => ({
                  status,
                  items: byStatus[status],
                  latestDate: byStatus[status].reduce((max: any, item: any) => {
                    const itemDate = new Date(item.updatedAt || item.createdAt || 0);
                    const maxDate = new Date(max || 0);
                    return itemDate > maxDate ? item.updatedAt || item.createdAt : max;
                  }, null),
                }));

                // Sort statuses by latest activity date (most recent first)
                itemsWithLatestDate.sort((a, b) => {
                  const dateA = new Date(a.latestDate || 0).getTime();
                  const dateB = new Date(b.latestDate || 0).getTime();
                  return dateB - dateA;
                });

                // Reconstruct byStatus with sorted statuses
                const sortedByStatus = itemsWithLatestDate.reduce((acc: any, item: any) => {
                  acc[item.status] = item.items;
                  return acc;
                }, {});

                const statusesSorted = Object.keys(sortedByStatus).sort();

                return (
                  <div key={category} style={{ marginBottom: 16 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCategories((prev) => ({
                          ...prev,
                          [category]: !prev[category],
                        }))
                      }
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
                        {category} ({items.length})
                      </span>
                    </button>

                    {isExpanded && (
                      <div style={{ marginTop: 8 }}>
                        {statusesSorted.length === 0 ? (
                          <p style={{ color: "var(--muted)", marginLeft: 16 }}>No items found.</p>
                        ) : (
                          statusesSorted.map((status) => {
                            const statusItems = sortedByStatus[status];
                            return (
                              <div key={status} style={{ marginBottom: 12, marginLeft: 8 }}>
                                <div
                                  style={{
                                    padding: "8px 12px",
                                    background: "#e5e7eb",
                                    borderRadius: 3,
                                    fontSize: 14,
                                    fontWeight: 500,
                                  }}
                                >
                                  {status.replace(/_/g, " ")} ({statusItems.length})
                                </div>
                                <table
                                  width="100%"
                                  cellPadding={6}
                                  style={{ borderCollapse: "collapse", fontSize: 13, marginTop: 4 }}
                                >
                                  <thead>
                                    <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                                      <th style={{ width: 100, borderBottom: "1px solid #d1d5db" }}>{category === "Requisitions" ? "ID" : "Tender #"}</th>
                                      <th style={{ borderBottom: "1px solid #d1d5db" }}>Title</th>
                                      <th style={{ width: 160, borderBottom: "1px solid #d1d5db" }}>Department</th>
                                      <th style={{ width: 120, borderBottom: "1px solid #d1d5db" }}>Latest Activity</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {statusItems.map((item) => (
                                      <tr
                                        key={item.id}
                                        style={{ borderBottom: "1px solid #e5e7eb", background: "#fafafa" }}
                                      >
                                        {category !== "Requisitions" ? (
                                          <td>
                                            {(item as any).tenderNumber != null
                                              ? `TEN-${String((item as any).tenderNumber).padStart(5, "0")}`
                                              : item.id}
                                          </td>
                                        ) : (
                                          <td>{item.id}</td>
                                        )}
                                        <td>{item.title || item.requisition?.title || item.description || ""}</td>
                                        <td>{item.requisition?.department?.name || (item as any).department?.name || ""}</td>
                                        <td style={{ fontVariantNumeric: "tabular-nums" }}>
                                          {item.updatedAt ? new Date(item.updatedAt).toISOString().slice(0, 10) : item.createdAt ? new Date(item.createdAt).toISOString().slice(0, 10) : ""}
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
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}

          {!isSysAdmin && (
            <div className="card" style={{ boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>
                {isTenderManager || hasTenderRole ? "Recent tenders" : "Recent requisitions"}
              </h3>
            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => {
                  const title = (r as any).title || (r as any).requisition?.title || "";
                  const idValue =
                    isTenderManager || hasTenderRole
                      ? (r as any).requisitionId ?? ""
                      : r.id;
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>{idValue}</td>
                      <td>{title}</td>
                      <td>{r.status}</td>
                      <td>{r.createdAt ? String(r.createdAt).slice(0, 10) : ""}</td>
                    </tr>
                  );
                })}
                {recent.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)" }}>
                      {isTenderManager || hasTenderRole
                        ? "No tenders found."
                        : "No requisitions found."}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
