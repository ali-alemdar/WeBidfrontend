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
  const [error, setError] = useState<string>("");

  const [selectedOfficerId, setSelectedOfficerId] = useState<number | null>(null);
  const [selectedOfficerName, setSelectedOfficerName] = useState<string>("");

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isOfficer = roles.includes("REQUISITION_OFFICER") || isSysAdmin;
  const isManager = roles.includes("REQUISITION_MANAGER") || isSysAdmin;
  const isTenderManager = roles.includes("TENDER_APPROVAL") || isSysAdmin;
  const isRequester = roles.includes("REQUESTER");
  const hasTenderRole =
    roles.includes("TENDERING_OFFICER") ||
    roles.includes("TENDER_COMMITTEE") ||
    roles.includes("TENDER_APPROVAL");
  const requesterOnly = isRequester && !isOfficer && !isManager && !isTenderManager && !isSysAdmin;

  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        if (isTenderManager) {
          const mine = await apiGet("/tenders/mine");
          setTenders(Array.isArray(mine) ? mine : []);
          setRequisitions([]);
        } else if (hasTenderRole) {
          const rows = await apiGet("/tenders");
          setTenders(Array.isArray(rows) ? rows : []);
          setRequisitions([]);
        } else {
          const [active, archived] = await Promise.all([
            apiGet("/requisitions"),
            apiGet("/requisitions/archive"),
          ]);
          const a = Array.isArray(active) ? active : [];
          const b = Array.isArray(archived) ? archived : [];
          setRequisitions([...a, ...b]);
          setTenders([]);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard data");
      }
    };
    load();
  }, [hasTenderRole, isTenderManager]);

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <img
                src="/I2N_Logo_Blue.jpg"
                alt="In2Networks Pty Ltd"
                style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 12 }}
              />
              <div>
                <div style={{ fontSize: 26, fontWeight: 900 }}>In2Networks Pty Ltd</div>
                <div style={{ color: "var(--muted)", marginTop: 4 }}>Internal e-bidding workspace</div>
              </div>
            </div>
            {user ? (
              <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>
                <div style={{ fontWeight: 700 }}>{user.name || user.email}</div>
                <div>{roles.join(", ")}</div>
              </div>
            ) : null}
          </div>

          {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

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

          {isTenderManager ? (
            <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>My team's tenders by status</h3>
              <div style={{ display: "grid", gridTemplateColumns: "240px auto", gap: 12 }}>
                {/* Overall team tender status */}
                <PieChart title="All team tenders by status" segments={statusSegments} />
                {/* Per-officer tender status pies */}
                <div>
                  {tenderOfficerStats.length === 0 ? (
                    <p style={{ color: "var(--muted)", marginTop: 0 }}>
                      No tender officer assignments found yet.
                    </p>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gap: 8,
                        gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      }}
                    >
                      {tenderOfficerStats.map((o) => {
                        const officerPalette = [
                          "#2563eb",
                          "#eab308",
                          "#22c55e",
                          "#ef4444",
                          "#0ea5e9",
                          "#a855f7",
                        ];

                        const segments = Object.keys(o.byStatus)
                          .filter((k) => (o.byStatus as any)[k] > 0)
                          .sort()
                          .map((k, idx) => ({
                            label: k.replace(/_/g, " "),
                            value: (o.byStatus as any)[k] || 0,
                            // Use a distinct color per segment index so stacked bar is clearly separated
                            color:
                              officerPalette[idx % officerPalette.length] ||
                              "#2563eb",
                          }));

                        // Single card coming from PieChart itself; use officer name as the title
                        return (
                          <PieChart
                            key={o.officerId}
                            title={o.officerName}
                            segments={segments}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {isOfficer ? (
            <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Officer workload</h3>
              <div style={{ display: "grid", gridTemplateColumns: "240px auto", gap: 12 }}>
                <PieChart title="By status (officer)" segments={statusSegments} />
                <div>
                  <p style={{ color: "var(--muted)", marginTop: 0 }}>
                    Requisitions where you are part of the working team (officer roles).
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isManager || isSysAdmin ? (
            <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>My team's work (requisitions by officer)</h3>
              {officerStats.length === 0 ? (
                <p style={{ color: "var(--muted)", marginTop: 0 }}>
                  No officer assignments found yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                  }}
                >
                  {officerStats.map((o) => {
                    const segments = Object.keys(o.byStatus)
                      .filter((k) => (o.byStatus as any)[k] > 0)
                      .sort()
                      .map((k) => ({
                        label: k.replace(/_/g, " "),
                        value: (o.byStatus as any)[k] || 0,
                        color:
                          k === "APROVAL_PENDING" || k === "CHANGES_SUBMITTED"
                            ? "#eab308"
                            : "#2563eb",
                      }));

                    const handleClick = () => {
                      setSelectedOfficerId(o.officerId);
                      setSelectedOfficerName(o.officerName);
                    };

                    return (
                      <button
                        key={o.officerId}
                        type="button"
                        onClick={handleClick}
                        className="card"
                        style={{ boxShadow: "none", padding: 10, textAlign: "left", cursor: "pointer" }}
                      >
                        <div style={{ fontWeight: 900, marginBottom: 4, fontSize: 14 }}>{o.officerName}</div>
                        <PieChart title="By status" segments={segments} />
                      </button>
                    );
                  })}
                </div>
              )}
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
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
