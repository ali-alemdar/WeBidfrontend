"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";
import { PieChart } from "../../../components/PieChart";

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

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M",
    cx,
    cy,
    "L",
    start.x,
    start.y,
    "A",
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
    "Z",
  ].join(" ");
}


function DonutChart({
  title,
  segments,
}: {
  title: string;
  segments: { label: string; value: number; color: string }[];
}) {
  const total = segments.reduce((a, s) => a + (Number.isFinite(s.value) ? s.value : 0), 0);
  const r = 44;
  const c = 2 * Math.PI * r;

  let offset = 0;
  const visible = segments.filter((s) => (s.value || 0) > 0);

  return (
    <div className="card" style={{ boxShadow: "none", padding: 10, width: "100%" }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "120px auto", gap: 12, alignItems: "center" }}>
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#eef2f7" strokeWidth="18" />
          <g transform="rotate(-90 60 60)">
            {visible.map((s, idx) => {
              const val = s.value || 0;
              const len = total > 0 ? (val / total) * c : 0;
              const dasharray = `${len} ${Math.max(0, c - len)}`;
              const dashoffset = -offset;
              offset += len;
              return (
                <circle
                  key={idx}
                  cx="60"
                  cy="60"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="18"
                  strokeDasharray={dasharray}
                  strokeDashoffset={dashoffset}
                />
              );
            })}
          </g>
          <circle cx="60" cy="60" r={r - 18} fill="#fff" />
          <text x="60" y="56" textAnchor="middle" style={{ fontSize: 20, fontWeight: 900, fill: "#111827" }}>
            {total}
          </text>
          <text x="60" y="76" textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }}>
            total
          </text>
        </svg>

        <div style={{ display: "grid", gap: 6 }}>
          {segments.map((s) => (
            <div key={s.label} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={s.label}
                >
                  {s.label}
                </div>
              </div>
              <div style={{ fontWeight: 900 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatChipsRow({
  title,
  chips,
}: {
  title: string;
  chips: { label: string; value: number; color: string }[];
}) {
  return (
    <div className="card" style={{ boxShadow: "none", padding: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ fontWeight: 900 }}>{title}</div>
      </div>
      <div style={{ display: "flex", gap: 10, paddingBottom: 4 }}>
        {chips.map((c) => (
          <div
            key={c.label}
            style={{
              flex: 1,
              minWidth: 0,
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "8px 10px",
              background: `linear-gradient(135deg, ${c.color}18, #ffffff)` ,
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: 11,
                color: "#111827",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={c.label}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 18, fontWeight: 950, marginTop: 4 }}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RequisitionListPage() {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const searchParams = useSearchParams();
  const filterOfficerIdRaw = searchParams.get("officerId");
  const filterOfficerId = filterOfficerIdRaw ? Number(filterOfficerIdRaw) : NaN;

  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isRequisitionManagerOnly = roles.includes("REQUISITION_MANAGER") && !isOfficer && !isSysAdmin;

  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [sortKey, setSortKey] = useState<
    "closingSoon" | "closingLate" | "createdNew" | "createdOld" | "status"
  >("closingSoon");

  const displayStatus = (s: any) => {
    const v = String(s || "").trim();

    // Display the real backend status string.
    // (Previously we collapsed unknown/legacy statuses to DRAFT, which made it look like statuses were reverting.)
    return v || "DRAFT";
  };

  const rowHref = (r: any) => {
    const st = displayStatus(r?.status);

    // Signature-ready requisitions go to the standalone approval page.
    if (st === "SIGNATURE_READY_REQUISITION") {
      return `/requisitions/${r.id}/approval`;
    }

    // Requisition managers are read-only (except approval queue).
    // Role dominance is additive: if the user is also an officer, allow officer navigation.
    if (isRequisitionManagerOnly) {
      return `/requisitions/${r.id}/view`;
    }

    // Tender/prep and any later states live in the submissions hub.
    const submissionsStates = new Set([
      "PRICES_RECEIVED",
      "PRICES_REVIEWED",
      "REFERENCE_PRICE_CALCULATED",
      "BIDDING_FORM_PREPARED",
      "TENDER_PREP_DRAFT",
      "APROVAL_PENDING",
      "TENDER_READY",
    ]);

    if (submissionsStates.has(st)) return `/submissions/${r.id}`;

    // Locked/read-only states go to the status page.
    const readonlyStates = new Set(["INVITATIONS_SENT", "CHANGES_SUBMITTED", "REQUISITION_REJECTED"]);
    if (readonlyStates.has(st)) return `/requisitions/${r.id}/view`;

    // Otherwise use the editable draft page.
    return `/requisitions/${r.id}`;
  };

  // Shared palette with dashboard: strong blue / yellow / green / red.
  const STATUS_COLORS: Record<string, string> = (() => {
    const palette = {
      BLUE: "#2563eb",
      YELLOW: "#eab308",
      GREEN: "#22c55e",
      RED: "#ef4444",
    } as const;

    return {
      // Blue: early/request & pricing prep stages
      DRAFT: palette.BLUE,
      INTERNAL_REQUEST_RECEIVED: palette.BLUE,
      ITEM_DETAILS_CONFIRMED: palette.BLUE,
      PRICE_REQUISITION_PREPARED: palette.BLUE,
      INVITATIONS_SENT: palette.BLUE,
      PRICE_INVITATIONS_SENT: palette.BLUE,
      MANUAL_ENTRY: palette.BLUE,
      PRICES_RECEIVED: palette.BLUE,
      PRICES_REVIEWED: palette.BLUE,
      REFERENCE_PRICE_CALCULATED: palette.BLUE,
      BIDDING_FORM_PREPARED: palette.BLUE,
      TENDER_PREP_DRAFT: palette.BLUE,

      // Yellow: changes / approvals in progress
      CHANGES_SUBMITTED: palette.YELLOW,
      APROVAL_PENDING: palette.YELLOW,

      // Green / blue: ready / closed OK (match dashboard):
      CHANGES_APPROVED: palette.GREEN,
      PURCHASE_READY: palette.GREEN,
      TENDER_READY: palette.BLUE,
      CLOSED: palette.BLUE,

      // Red: rejected
      REQUISITION_REJECTED: palette.RED,
    };
  })();

  // Only show non-rejected requisitions in the main list and charts.
  const visibleData = useMemo(
    () =>
      data.filter((r) => {
        const s = displayStatus(r.status);
        return s !== "REQUISITION_REJECTED" && s !== "PURCHASE_READY";
      }),
    [data],
  );

  const stats = useMemo(() => {
    const byStatus: Record<string, number> = {};
    for (const r of visibleData) {
      const s = displayStatus(r.status);
      byStatus[s] = (byStatus[s] || 0) + 1;
    }
    return byStatus;
  }, [visibleData]);

  const closingStats = useMemo(() => {
    const now = new Date();
    const tNow = now.getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    const buckets = {
      OVERDUE: 0,
      DUE_7_DAYS: 0,
      DUE_30_DAYS: 0,
      NO_CLOSING_DATE: 0,
      CLOSED: 0,
    };

    // For SYS_ADMIN, ignore DRAFT requisitions when computing closing stats,
    // so "No closing date" does not get inflated by drafts.
    const baseRows = visibleData;
    const sourceRows = isSysAdmin
      ? baseRows.filter((r) => displayStatus(r.status) !== "DRAFT")
      : baseRows;

    for (const r of sourceRows) {
      if (r.closedAt) {
        buckets.CLOSED++;
        continue;
      }

      const d = r.targetTimeline ? new Date(r.targetTimeline) : null;
      const tt = d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
      if (tt === null) {
        buckets.NO_CLOSING_DATE++;
      } else if (tt < tNow) {
        buckets.OVERDUE++;
      } else if (tt <= tNow + 7 * oneDay) {
        buckets.DUE_7_DAYS++;
      } else if (tt <= tNow + 30 * oneDay) {
        buckets.DUE_30_DAYS++;
      } else {
        // keep it simple; still count in 30-days bucket for now
        buckets.DUE_30_DAYS++;
      }
    }

    return buckets;
  }, [data]);

  const statusSegments = useMemo(() => {
    // Only show statuses that actually occur to keep the UI compact.
    let keys = Object.keys(stats).filter((k) => (stats[k] || 0) > 0);

    // For SYS_ADMIN accounts, hide DRAFT from the charts as well.
    if (isSysAdmin) {
      keys = keys.filter((k) => k !== "DRAFT");
    }

    keys = keys.sort();

    return keys.map((k) => ({
      label: k.replace(/_/g, " "),
      value: stats[k] || 0,
      color: STATUS_COLORS[k] || "#6b7280",
    }));
  }, [stats, isSysAdmin]);

  const closingSegments = useMemo(() => {
    const colors: Record<string, string> = {
      OVERDUE: "#ef4444", // red
      DUE_7_DAYS: "#eab308", // yellow
      DUE_30_DAYS: "#2563eb", // blue
      NO_CLOSING_DATE: "#6b7280", // grey
      CLOSED: "#2563eb", // align with CLOSED blue in dashboard
    };

    const keys = ["OVERDUE", "DUE_7_DAYS", "DUE_30_DAYS", "NO_CLOSING_DATE", "CLOSED"];
    return keys.map((k) => ({
      label: k.replace(/_/g, " "),
      value: (closingStats as any)[k] || 0,
      color: colors[k],
    }));
  }, [closingStats]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    const baseAll = !qq
      ? visibleData
      : visibleData.filter((r) => {
          const hay = [
            String(r.id ?? ""),
            String(r.title ?? ""),
            String(r.requestingDepartment ?? ""),
            String(r.purpose ?? ""),
            String(r.category ?? ""),
            String(r.status ?? ""),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(qq);
        });

    const base = isSysAdmin
      ? baseAll.filter((r) => displayStatus(r.status) !== "DRAFT")
      : baseAll;

    const withOfficerFilter = Number.isFinite(filterOfficerId)
      ? base.filter((r) =>
          Array.isArray((r as any).officerAssignments)
            ? (r as any).officerAssignments.some(
                (a: any) => Number(a?.userId) === filterOfficerId,
              )
            : false,
        )
      : base;

    const toTime = (v: any) => {
      if (!v) return null;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? null : d.getTime();
    };

    const rows = [...withOfficerFilter];
    rows.sort((a, b) => {
      const aDeadline = toTime(a.deadlineAt);
      const bDeadline = toTime(b.deadlineAt);
      const aCreated = toTime(a.createdAt) || 0;
      const bCreated = toTime(b.createdAt) || 0;

      if (sortKey === "closingSoon" || sortKey === "closingLate") {
        // null deadlines last
        if (aDeadline === null && bDeadline === null) return bCreated - aCreated;
        if (aDeadline === null) return 1;
        if (bDeadline === null) return -1;
        return sortKey === "closingSoon" ? aDeadline - bDeadline : bDeadline - aDeadline;
      }

      if (sortKey === "createdNew") return bCreated - aCreated;
      if (sortKey === "createdOld") return aCreated - bCreated;

      // status
      const as = displayStatus(a.status);
      const bs = displayStatus(b.status);
      if (as !== bs) return as.localeCompare(bs);
      return bCreated - aCreated;
    });

    return rows;
  }, [visibleData, q, sortKey]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const rows = await apiGet("/requisitions");
      setData(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "SYS_ADMIN"]} title="Requisitions">
      <InternalPage title="Requisitions">
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 10,
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>Search</div>
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ID, title, department, status…"
            style={{ maxWidth: 520 }}
          />
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>Sort</div>
          <select className="input" value={sortKey} onChange={(e) => setSortKey(e.target.value as any)} style={{ minWidth: 180 }}>
            <option value="closingSoon">Target sooner</option>
            <option value="closingLate">Target later</option>
            <option value="createdNew">Created newest</option>
            <option value="createdOld">Created oldest</option>
            <option value="status">Status</option>
          </select>

          <button className="btn" onClick={load} disabled={loading} style={{ display: "inline-flex", alignItems: "center" }}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <PieChart title="By status (all visible)" segments={statusSegments} />
        <PieChart
          title="By target"
          segments={closingSegments.filter((s) => s.label !== "CLOSED")}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <StatChipsRow title="Status" chips={statusSegments} />
        <StatChipsRow
          title="Target"
          chips={closingSegments.filter((c) => c.label !== "CLOSED")}
        />
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ overflowX: "auto" }}>
        <table
          cellPadding={8}
          style={{ borderCollapse: "collapse", tableLayout: "fixed", width: 1080 }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ width: 60 }}>ID</th>
              <th style={{ width: 380 }}>Title</th>
              <th style={{ width: 180 }}>Category</th>
              <th style={{ width: 260 }}>Status</th>
              <th style={{ width: 100 }}>Created</th>
              <th style={{ width: 100 }}>Target</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td style={{ whiteSpace: "nowrap" }}>
                  {displayStatus(r.status) === "DRAFT" ? "-" : r.id}
                </td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.title}
                </td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.category}</td>
                <td style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayStatus(r.status)}</td>
                <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDate(r.createdAt)}</td>
                <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{fmtDate(r.targetTimeline)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      </InternalPage>
    </RequireRoles>
  );
}
