"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import BackButton from "../../../../components/BackButton";
import ManualEntryBanner from "../../../../components/ManualEntryBanner";
import RequireRoles from "../../../../components/RequireRoles";
import { apiPost, apiPut } from "../../../../lib/api";
import { usePageLock } from "../../../../lib/pageLock";
import { getCurrentUser } from "../../../../lib/authClient";

interface Props {
  params: { id: string };
}

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

function formatAmount(value: any, currency?: string | null) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  const formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return currency ? `${currency} ${formatted}` : formatted;
}

function formatInteger(value: any) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "";
  return Math.round(num).toLocaleString();
}

export default function RequisitionReadonlyViewPage({ params }: Props) {
  const user = getCurrentUser();
  const roles = (user?.roles || []) as any[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  // For now, treat SYS_ADMIN as the committee chair for change-control decisions.
  const isCommitteeChair = isSysAdmin;
  const isRequisitionOfficer = roles.includes("REQUISITION_OFFICER") || isSysAdmin;

  const [acting, setActing] = useState<string>("");
  const [localError, setLocalError] = useState<string>("");

  const [rejectReason, setRejectReason] = useState<string>("");

  const {
    data,
    loading,
    error,
    lockStatus,
    lockInfo,
    reload,
    forceRelease,
  } = usePageLock<any>({
    resourceType: "REQUISITION",
    resourceId: Number(params.id),
    scope: "APPROVAL_PACKAGE",
    editUrl: `/requisitions/${params.id}/tender-prep/edit`,
    heartbeatUrl: `/requisitions/${params.id}/tender-prep/lock-heartbeat`,
    releaseUrl: `/requisitions/${params.id}/tender-prep/lock-release`,
    forceReleaseUrl: `/requisitions/${params.id}/tender-prep/lock-force-release`,
    mapEditResponse: (res: any) => {
      const summary = res?.summary || null;
      const approvalLines = Array.isArray(summary?.approvalLines)
        ? summary.approvalLines
        : [];

      const mapped = approvalLines.map((l: any) => ({
        requisitionItemId: l.requisitionItemId,
        itemNo: l.itemNo,
        description: l.description,
        uom: l.uom,
        quantity: l.quantity,
        currency: l.currency,
        itemType: l.itemType || null,
        finalUnitPrice: l.unitPrice != null ? String(Number(l.unitPrice).toFixed(2)) : "",
        minPrice: l.minPrice ?? null,
        maxPrice: l.maxPrice ?? null,
        avgPrice: l.avgPrice ?? null,
        suggestedAvg: l.unitPrice ?? null,
      }));

      setApprovalLines(approvalLines);
      setSubmissionRows(Array.isArray(summary?.submissions?.rows) ? summary.submissions.rows : []);
      setSubmissionTotals(summary?.submissions?.totalsByCurrency || {});
      setLines(mapped);

      return {
        data: res?.requisition || null,
        lockStatus: (res?.lockStatus as any) || "NONE",
        lockInfo: res?.lockInfo || null,
      };
    },
  });

  const doAction = async (name: string, fn: () => Promise<any>) => {
    setActing(name);
    try {
      await fn();
      await reload();
    } catch (e: any) {
      setLocalError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const invitations: any[] = Array.isArray(data?.invitations) ? data.invitations : [];
  const supplierPrices: any[] = Array.isArray(data?.supplierPrices) ? data.supplierPrices : [];
  const officerSignoffs: any[] = Array.isArray(data?.officerSignoffs) ? data.officerSignoffs : [];
  const officerAssignments: any[] = Array.isArray(data?.officerAssignments) ? data.officerAssignments : [];

  const [approvalLines, setApprovalLines] = useState<any[]>([]);
  const [submissionRows, setSubmissionRows] = useState<any[]>([]);
  const [submissionTotals, setSubmissionTotals] = useState<Record<string, number>>({});

  const currentUserId = user ? Number(user.id) : NaN;
  const hasSigned = Number.isFinite(currentUserId)
    ? officerSignoffs.some((s: any) => Number(s?.userId) === currentUserId)
    : false;
  const anyOfficerSigned = officerSignoffs.length > 0;

  const pricesBySupplier = useMemo(() => {
    const m = new Map<number, { supplierName: string; prices: any[] }>();
    for (const p of supplierPrices) {
      const sid = Number(p?.supplierId);
      if (!Number.isFinite(sid)) continue;
      const key = sid;
      const name = (p as any)?.supplier?.name || (p as any)?.supplierName || String(sid);
      if (!m.has(key)) m.set(key, { supplierName: String(name || ""), prices: [] });
      m.get(key)!.prices.push(p);
    }
    return m;
  }, [supplierPrices]);

  const status = String(data?.status || "");
  const statusLabel = status === "MANUAL_ENTRY" ? "Manual entry" : status;
  const isArchiveStatus =
    status === "TENDER_READY" ||
    status === "PURCHASE_READY" ||
    status === "REQUISITION_REJECTED" ||
    status === "CLOSED";

  const [lines, setLines] = useState<any[]>([]);
  const [savingTenderPrep, setSavingTenderPrep] = useState(false);

  // Load precomputed approval-package + submissions summary from the server
  // is now handled inside load() via /tender-prep/edit.

  const handleLineChange = (idx: number, field: string, raw: string) => {
    setLines((prev) => {
      const copy = [...prev];
      const current = { ...(copy[idx] || {}) };
      current[field] = raw;
      copy[idx] = current;
      return copy;
    });
  };

  const handleSaveTenderPrep = async () => {
    if (lockStatus !== 'OWNED') {
      // Another user owns the lock; do not allow saving.
      return;
    }
    setLocalError("");
    setSavingTenderPrep(true);
    try {
      const payloadLines = lines
        .map((l) => ({
          requisitionItemId: l.requisitionItemId,
          finalUnitPrice: l.finalUnitPrice === "" || l.finalUnitPrice == null ? null : Number(l.finalUnitPrice),
          minPrice: l.minPrice,
          maxPrice: l.maxPrice,
          avgPrice: l.avgPrice,
        }))
        .filter((l) => Number.isFinite(Number(l.requisitionItemId)));

      await apiPut(`/requisitions/${data.id}/tender-prep/draft`, { lines: payloadLines });
      await reload();
    } catch (e: any) {
      setLocalError(e?.message || "Failed to save approval package");
    } finally {
      setSavingTenderPrep(false);
    }
  };


  if (!data) {
    return (
      <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
        <InternalPage title={`Requisition ${params.id}`}>
          {loading ? (
            <p>Loading…</p>
          ) : error ? (
            <p style={{ color: "#b91c1c" }}>{error}</p>
          ) : (
            <p>Not found.</p>
          )}
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
      <InternalPage title={`Prepare approval package / Requisition ${data.id}`}>
      {lockStatus === 'LOCKED' && lockInfo && (
        <div
          className="card"
          style={{
            boxShadow: 'none',
            marginBottom: 12,
            background: 'rgba(254,240,138,0.6)',
            border: '1px solid #facc15',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Approval package locked</div>
          <div style={{ fontSize: 13, marginBottom: 8 }}>
            This approval package is currently being edited by another user.
            You can view but not edit until their lock expires.
          </div>
          {isSysAdmin && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                if (!data?.id) return;
                if (!window.confirm('Force-release this approval package lock? The other user will lose their edits.')) return;
                try {
                  await apiPost(`/requisitions/${data.id}/tender-prep/lock-force-release`, {});
                  await reload();
                } catch (e: any) {
                  // eslint-disable-next-line no-console
                  console.error(e?.message || 'Failed to force release approval lock');
                }
              }}
            >
              Force release lock (admin)
            </button>
          )}
        </div>
      )}
      {/* Top navbars area */}
      <div className="no-print" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 0 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={reload} disabled={loading}>
            Refresh
          </button>
          <button
            className="btn"
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
          >
            Print
          </button>
          {!isArchiveStatus && status === "CHANGES_APPROVED" ? (
            <Link className="btn btn-primary" href={`/requisitions/${data.id}`}>
              Edit (approved)
            </Link>
          ) : null}
        </div>

        {data.manualSubmissions ? <ManualEntryBanner note={data.manualSubmissionsNote} /> : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">Status: {statusLabel}</span>
          {data.createdBy?.email ? <span className="pill">Created by: {data.createdBy.email}</span> : null}
          <span className="pill">Invited: {invitations.length}</span>
          <span className="pill">Price rows: {supplierPrices.length}</span>
          {!isArchiveStatus && isRequisitionOfficer && supplierPrices.length > 0 ? (
            <>
              <button
                className="btn btn-submit"
                disabled={acting !== "" || hasSigned || lockStatus === 'LOCKED'}
                onClick={() =>
                  doAction("officerSign", async () => {
                    await apiPost(`/requisitions/${data.id}/officers/sign`, {});
                  })
                }
                title={hasSigned ? "You have already approved this package" : undefined}
              >
                {hasSigned
                  ? "You have approved"
                  : acting === "officerSign"
                  ? "Submitting…"
                  : "I approve and submit for approval"}
              </button>
              {hasSigned ? (
                <button
                  className="btn"
                  style={{ marginLeft: 8 }}
                  disabled={acting !== ""}
                  onClick={() =>
                    doAction("officerUnsign", async () => {
                      await apiPost(`/requisitions/${data.id}/officers/un-sign`, {});
                    })
                  }
                >
                  Cancel my approval
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Request summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Title</div>
            <div>{data.title}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Requesting Department</div>
            <div>{data.requestingDepartment || ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Purpose</div>
            <div>{data.purpose || ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Target timeline</div>
            <div>{data.targetTimeline ? String(data.targetTimeline).slice(0, 10) : ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Ledger category</div>
            <div>{data.ledgerCategory || ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Assigned manager</div>
            <div>{data.manager?.fullName || data.managerName || "Not assigned"}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Team members</div>
            <div>
              {(() => {
                const names = officerAssignments
                  .map((a: any) => a.user?.fullName || "")
                  .filter(Boolean)
                  .sort((a: string, b: string) => a.localeCompare(b));
                return names.length ? names.join(", ") : "No officers assigned";
              })()}
            </div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800 }}>Details</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{data.description || ""}</div>
        </div>
      </div>

      <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Approval package</h3>
        <p style={{ marginTop: 0, color: "var(--muted)" }}>
          For each item, enter the final unit price and the min / max / avg figures, then save before approving.
          {isArchiveStatus
            ? " This requisition is archived; the approval package is read-only."
            : " The suggested prices and currencies are automatically refreshed whenever new submissions are received. Changes you make to final unit prices are preserved."}
        </p>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>No</th>
              <th>Type</th>
              <th>Description</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, idx) => {
              const qty = Number(line.quantity);
              const unit = Number(line.finalUnitPrice);
              const total = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null;
              const currency = String(line.currency || "");
              return (
                <tr key={line.requisitionItemId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{line.itemNo}</td>
                  <td>{line.itemType || ""}</td>
                  <td>{line.description}</td>
                  <td>{line.uom}</td>
                  <td>{Number.isFinite(qty) ? formatInteger(qty) : ""}</td>
                  <td>
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      placeholder={
                        line.suggestedAvg != null ? Number(line.suggestedAvg).toFixed(2) : ""
                      }
                      value={typeof line.finalUnitPrice === "string" ? line.finalUnitPrice : ""}
                      onChange={(e) => handleLineChange(idx, "finalUnitPrice", e.target.value)}
                      style={{ maxWidth: 140 }}
                      disabled={isArchiveStatus || lockStatus === 'LOCKED'}
                    />
                  </td>
                  <td>{total != null ? formatAmount(total, currency) : ""}</td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  No items.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        {lines.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 700 }}>
              Grand total:{" "}
              {(() => {
                let currency: string | null = null;
                let total = 0;
                for (const line of lines) {
                  const qty = Number(line.quantity);
                  const unit = Number(line.finalUnitPrice);
                  if (!Number.isFinite(qty) || !Number.isFinite(unit)) continue;
                  total += qty * unit;
                  const cur = String(line.currency || "");
                  if (cur) currency = currency || cur;
                }
                if (!Number.isFinite(total) || total <= 0) return "";
                const curLabel = currency || "";
                return `${curLabel} ${formatAmount(total, null)}`;
              })()}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn"
                type="button"
                disabled={isArchiveStatus || savingTenderPrep || !lines.length || lockStatus === 'LOCKED'}
                onClick={() => {
                  // Reset finalUnitPrice back to suggestedAvg (reference-based) for all lines.
                  const next = lines.map((line) => ({
                    ...line,
                    finalUnitPrice:
                      line.suggestedAvg != null
                        ? String(Number(line.suggestedAvg).toFixed(2))
                        : "",
                  }));
                  setLines(next);
                }}
              >
                Reset
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveTenderPrep}
                disabled={isArchiveStatus || savingTenderPrep || !lines.length || lockStatus === 'LOCKED'}
              >
                {savingTenderPrep ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Submissions overview</h3>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Supplier</th>
              <th>Item</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              if (!submissionRows.length) {
                return (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      No submissions.
                    </td>
                  </tr>
                );
              }

              const bySupplier: Record<string, { rows: any[]; totals: Record<string, number> }> = {};
              for (const row of submissionRows) {
                const supplierKey = String(row.supplierName || row.supplierId || "");
                if (!supplierKey) continue;
                if (!bySupplier[supplierKey]) {
                  bySupplier[supplierKey] = { rows: [], totals: {} };
                }
                bySupplier[supplierKey].rows.push(row);
                const currency = String(row.currency || "");
                const total = Number(row.total);
                if (!currency || !Number.isFinite(total)) continue;
                bySupplier[supplierKey].totals[currency] =
                  (bySupplier[supplierKey].totals[currency] || 0) + total;
              }

              const supplierEntries = Object.entries(bySupplier);
              if (!supplierEntries.length) {
                return (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      No submissions.
                    </td>
                  </tr>
                );
              }

              return supplierEntries.flatMap(([supplierName, data]) => {
                const rows = data.rows.map((row: any) => (
                  <tr key={row.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>{row.supplierName}</td>
                    <td>{row.description}</td>
                    <td>{Number.isFinite(Number(row.quantity)) ? Number(row.quantity) : ""}</td>
                    <td>
                      {Number.isFinite(Number(row.unitPrice))
                        ? formatAmount(Number(row.unitPrice), row.currency || null)
                        : ""}
                    </td>
                    <td>
                      {Number.isFinite(Number(row.total))
                        ? formatAmount(Number(row.total), row.currency || null)
                        : ""}
                    </td>
                  </tr>
                ));

                const totalsEntries = Object.entries(data.totals);
                const totalRow = totalsEntries.length ? (
                  <tr key={`${supplierName}-total`} style={{ borderTop: "1px solid var(--border)", fontWeight: 600 }}>
                    <td colSpan={5} style={{ textAlign: "right" }}>
                      {totalsEntries
                        .map(([cur, value]) =>
                          `${supplierName} total: ${formatAmount(value, cur)}`,
                        )
                        .join(" \u00b7 ")}
                    </td>
                  </tr>
                ) : null;

                return [...rows, totalRow].filter(Boolean);
              });
            })()}
          </tbody>
        </table>
      </div>

      </InternalPage>
    </RequireRoles>
  );
}
