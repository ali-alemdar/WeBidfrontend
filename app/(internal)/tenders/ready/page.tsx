"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import InternalPage from "../../../components/InternalPage";
import BackButton from "../../../components/BackButton";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../lib/api";

function fmtDateTime(value: Date | string | null) {
  if (!value) return "";
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    if (Number.isNaN(d.getTime())) return "";
    // Format in the browser's local time instead of UTC.
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mi = pad(d.getMinutes());
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  } catch {
    return "";
  }
}

export default function ReadyRequisitionsPage() {
  const router = useRouter();

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [creatingId, setCreatingId] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/ready");
      setRows(Array.isArray(r) ? r : []);
      setLastUpdated(fmtDateTime(new Date()));
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.toLowerCase().includes("forbidden")) {
        setRows([]);
        setError("");
      } else {
        setError(msg || "Failed to load ready requisitions");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  const createFromRow = async (row: any) => {
    const requisitionId = Number(row.requisitionId);
    if (!Number.isFinite(requisitionId) || requisitionId <= 0) return;

    try {
      setCreatingId(requisitionId);
      // Ask backend to create (or reuse) a tender for this requisition, then go to its detail page.
      const tender = await apiPost("/tenders", { requisitionId });
      router.push(`/tenders/${tender.id}`);
    } catch (e) {
      // Swallow error here; the list will still be usable.
      // You can add error handling UI later if needed.
    } finally {
      setCreatingId(null);
    }
  };

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "SYS_ADMIN"]} title="Tenders / Ready requisitions">
      <InternalPage title="Tenders / Ready requisitions" pageId="TENOFF">
      <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ color: "#111827", fontSize: 13, fontWeight: 600 }}>
          Last updated: {lastUpdated || "-"}
        </div>
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
              <th>Last update</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const requestedAt = r.requestedAt ? new Date(r.requestedAt) : null;
              const lastUpdated = r.lastUpdated ? new Date(r.lastUpdated) : null;
              const hasStarted =
                requestedAt && lastUpdated && lastUpdated.getTime() > requestedAt.getTime();
              const buttonLabel = hasStarted ? "Edit tender" : "Create tender";

              return (
                <tr key={r.tenderId || r.requisitionId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{r.requisitionId}</td>
                  <td>{r.title}</td>
                  <td>{`${r.status} (${r.rawStatus || ""})`}</td>
                  <td>{fmtDateTime(r.lastUpdated || r.requestedAt || null)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => createFromRow(r)}
                      disabled={creatingId === r.requisitionId}
                    >
                      {creatingId === r.requisitionId ? "Creating…" : buttonLabel}
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ color: "var(--muted)" }}>
                  No requisitions are ready for tender.
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
