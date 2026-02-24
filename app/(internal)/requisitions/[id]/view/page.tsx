// file //home/ali/e-bidding/frontend/app/(internal)/requisitions/[id]/view/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import BackButton from "../../../../components/BackButton";
import ManualEntryBanner from "../../../../components/ManualEntryBanner";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost, apiPut } from "../../../../lib/api";
import { getCurrentUser } from "../../../../lib/authClient";
import { usePageLock } from "../../../../lib/pageLock";
import { useRouter } from "next/navigation";


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
  const router = useRouter();
  const roles = (user?.roles || []) as any[];
  const isCommitteeChair = false;
  const isRequisitionOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("SYS_ADMIN");
  const isRequisitionManager = roles.includes("REQUISITION_MANAGER") || roles.includes("SYS_ADMIN");
  const isRequesterOnly = roles.includes("REQUESTER") && !isRequisitionOfficer && !isRequisitionManager;
  const userId = user ? Number(user.id) : NaN;
  const idleTimeoutRef = useRef<any>(null);
  const lastActivityRef = useRef(Date.now());
  const [rejectReason, setRejectReason] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [acting, setActing] = useState<string>("");
  const [managerNotes, setManagerNotes] = useState<any[]>([]);
  const [managerNote, setManagerNote] = useState<string>("");
  const [newManagerNote, setNewManagerNote] = useState<string>("");
  const [savingManagerNote, setSavingManagerNote] = useState(false);
  const resourceId = useMemo(() => Number(params.id), [params.id]);
  const editUrl = useMemo(() => `/requisitions/${params.id}/tender-prep/edit`, [params.id]);
  const heartbeatUrl = useMemo(() => `/requisitions/${params.id}/tender-prep/lock-heartbeat`, [params.id]);
  const releaseUrl = useMemo(() => `/requisitions/${params.id}/tender-prep/lock-release`, [params.id]);
  const canManagerAct = roles.includes("REQUISITION_MANAGER") || roles.includes("SYS_ADMIN");
  const [message, setMessage] = useState<string>("");

//  const isApprovalPending = String(data?.status || "") === "APROVAL_PENDING";
//  const shouldLock = isOfficer || canManagerAct;
  
const mapEditResponse = useCallback((res: any) => ({
  data: res?.requisition || res,
  lockStatus: res?.lockStatus || "NONE",
  lockInfo: res?.lockInfo || null,
}), []);

const {
  data,
  loading,
  lockStatus,
  lockInfo,
  reload,
} = usePageLock({
  resourceType: "REQUISITION",
  resourceId,
  scope: "APPROVAL_PACKAGE",
  editUrl,
  heartbeatUrl,
  releaseUrl,
  mapEditResponse,
});
  const isApprovalPending = String(data?.status || "") === "APROVAL_PENDING";
  const lockedByUserId = lockInfo?.lockedByUserId ? Number(lockInfo.lockedByUserId) : null;
  const isLockedByMe = lockedByUserId === userId;
  const isLockedByOther = lockStatus === "LOCKED" && !isLockedByMe;
  const canEdit = !isLockedByOther;
 

  
  
  // Track idle time (5 minutes = 300 seconds)
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000;

  useEffect(() => {
    if (lockStatus !== "OWNED") return;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
      idleTimeoutRef.current = setTimeout(() => {
        // Idle timeout reached, release lock
        apiPost(`/requisitions/${params.id}/tender-prep/lock-release`, {}).catch(() => undefined);
      }, IDLE_TIMEOUT_MS);
    };

    // Listen for user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    for (const event of events) {
      window.addEventListener(event, handleActivity);
    }

    handleActivity(); // Initialize timeout

    return () => {
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [lockStatus, params.id]);

  const load = async () => {
    setError("");
    await reload();
    // Also fetch manager notes
    try {
      const notes = await apiGet(`/requisitions/${params.id}/manager-notes`);
      setManagerNotes(Array.isArray(notes) ? notes : []);
    } catch {
      // Ignore errors for manager notes
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Auto-refresh every 15 seconds for live price updates + manager notes
  useEffect(() => {
    const intervalId = setInterval(() => {
      reload().catch(() => undefined);
      apiGet(`/requisitions/${params.id}/manager-notes`)
        .then((notes) => setManagerNotes(Array.isArray(notes) ? notes : []))
        .catch(() => undefined);
    }, 15_000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const doAction = async (name: string, fn: () => Promise<any>) => {
    setError("");
    setActing(name);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const invitations: any[] = Array.isArray(data?.invitations) ? data.invitations : [];
  const supplierPrices: any[] = Array.isArray(data?.supplierPrices) ? data.supplierPrices : [];
  const officerSignoffs: any[] = Array.isArray(data?.officerSignoffs) ? data.officerSignoffs : [];
  const officerAssignments: any[] = Array.isArray(data?.officerAssignments) ? data.officerAssignments : [];
  const referencePrices: any[] = Array.isArray(data?.referencePrices) ? data.referencePrices : [];
  const biddingFormItems: any[] = Array.isArray(data?.biddingFormItems) ? data.biddingFormItems : [];

  const currentUserId = user ? Number(user.id) : NaN;
  const hasSigned = Number.isFinite(currentUserId)
    ? officerSignoffs.some((s: any) => Number(s?.userId) === currentUserId)
    : false;
  const anyOfficerSigned = officerSignoffs.length > 0;

  const hasFinalPrices = useMemo(
    () => Array.isArray(biddingFormItems) && biddingFormItems.some((b: any) => b?.finalUnitPrice != null),
    [biddingFormItems],
  );

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
  const statusLabel = status === "MANUAL_ENTRY" ? "Manual entry" : status === "REQUISITION_RETURNED" ? "Returned by manager" : status;
  const isArchiveStatus =
    status === "TENDER_READY" ||
    status === "PURCHASE_READY" ||
    status === "REQUISITION_REJECTED" ||
    status === "CLOSED";

  const [lines, setLines] = useState<any[]>([]);
  const [savingTenderPrep, setSavingTenderPrep] = useState(false);

  useEffect(() => {
    // Only derive approval-package lines once requisition data is loaded.
    if (!data || !Array.isArray(data.items) || data.items.length === 0) {
      setLines([]);
      return;
    }

    const itemsLocal: any[] = data.items;

    const refByItem = new Map<number, any>();
    for (const rp of referencePrices) {
      const itemId = Number(rp?.requisitionItemId);
      if (!Number.isFinite(itemId)) continue;
      refByItem.set(itemId, rp);
    }

    const biddingByItem = new Map<number, any>();
    for (const bf of biddingFormItems) {
      const itemId = Number(bf?.requisitionItemId);
      if (!Number.isFinite(itemId)) continue;
      biddingByItem.set(itemId, bf);
    }

    const next = itemsLocal.map((it: any) => {
      const itemId = Number(it.id);
      const ref = refByItem.get(itemId);
      const bf = biddingByItem.get(itemId);
      const qty = Number(bf?.finalQuantity ?? it.quantity);

      // If reference prices are missing, derive min / max / avg from all submissions for this item.
      let derivedMin: number | null = null;
      let derivedMax: number | null = null;
      let derivedAvg: number | null = null;
      let derivedCurrency: string | null = null;

      if (!ref) {
        const pricesForItem = supplierPrices.filter((p: any) => Number(p?.requisitionItemId) === itemId);
        const values = pricesForItem
          .map((p: any) => Number(p.unitPrice))
          .filter((v: number) => Number.isFinite(v));
        if (values.length > 0) {
          derivedMin = Math.min(...values);
          derivedMax = Math.max(...values);
          derivedAvg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
          const firstCurrency = String(pricesForItem.find((p: any) => p?.currency)?.currency || "");
          derivedCurrency = firstCurrency || null;
        }
      }

      const currency = String(
        bf?.currency ||
          ref?.currency ||
          derivedCurrency ||
          (supplierPrices.find((p: any) => Number(p?.requisitionItemId) === itemId)?.currency || ""),
      );


      return {
        requisitionItemId: itemId,
        itemNo: it.itemNo ?? it.id,
        description: bf?.finalDescription || it.technicalDescription || it.name,
        uom: bf?.uom || it.uom,
        quantity: Number.isFinite(qty) ? qty : null,
        currency,
        finalUnitPrice:
          bf?.finalUnitPrice != null
            ? String(Number(bf.finalUnitPrice).toFixed(2))
            : "0.00",
        minPrice:
          ref?.minPrice != null
            ? Number(ref.minPrice)
            : derivedMin != null
            ? derivedMin
            : null,
        maxPrice:
          ref?.maxPrice != null
            ? Number(ref.maxPrice)
            : derivedMax != null
            ? derivedMax
            : null,
        avgPrice:
          ref?.avgPrice != null
            ? Number(ref.avgPrice)
            : derivedAvg != null
            ? derivedAvg
            : null,
      };
    });

    setLines(next);
  }, [data, referencePrices, biddingFormItems, supplierPrices]);

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
    setError("");
    setSavingTenderPrep(true);
    try {
      const payloadLines = lines
        .map((l) => ({
          requisitionItemId: l.requisitionItemId,
          finalUnitPrice: (() => {
            if (l.finalUnitPrice == null) return null;
            const trimmed = String(l.finalUnitPrice).trim();
            if (!trimmed) return null;
            const num = Number(trimmed);
            if (!Number.isFinite(num) || num === 0) return null;
            return num;
          })(),
          minPrice: l.minPrice,
          maxPrice: l.maxPrice,
          avgPrice: l.avgPrice,
        }))
        .filter((l) => Number.isFinite(Number(l.requisitionItemId)));

      await apiPut(`/requisitions/${data.id}/tender-prep/draft`, { lines: payloadLines });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save approval package");
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

  // Determine lock status
//  const lockedByUserId = lockInfo?.lockedByUserId ? Number(lockInfo.lockedByUserId) : null;
//  const isLockedByMe = lockedByUserId === userId;


  // Determine lock warning message
  let lockWarning = "";
  if (isLockedByOther && data?.officerAssignments) {
    const lockedByOfficer = data.officerAssignments.find(
      (a: any) => Number(a?.userId) === lockedByUserId
    );
    const lockedByName = lockedByOfficer?.user?.fullName || lockedByOfficer?.user?.fullName || lockInfo?.lockedByfullName || "another user";
    lockWarning = `This approval package is currently being edited by ${lockedByName}. You cannot make changes.`;
  }

  const canEditApprovalPackage = !isLockedByOther && lockStatus === "OWNED" && !anyOfficerSigned;

  // Build officer approval warning message
  let officerApprovalWarning = "";
  let approvingOfficerName = "";
  if (anyOfficerSigned && !hasSigned) {
    // Find the first officer who signed
    const firstSignoff = officerSignoffs[0];
    const signingOfficer = officerAssignments.find(
      (a: any) => Number(a?.userId) === Number(firstSignoff?.userId)
    );
    approvingOfficerName = signingOfficer?.user?.fullName || firstSignoff?.user?.fullName || signingOfficer?.user?.fullName || firstSignoff?.user?.fullName || "an officer";
    officerApprovalWarning = `This approval package has been approved by ${approvingOfficerName} and cannot be edited. Please contact them to cancel their approval if changes are needed.`;
  }

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
      <InternalPage title={`Prepare approval package / Requisition ${data.id}`}>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}
        className="no-print"
      >
        <BackButton fallbackHref="/requisitions/list" />
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
        {status === "CHANGES_APPROVED" ? (
          <Link className="btn btn-primary" href={`/requisitions/${data.id}`}>
            Edit (approved)
          </Link>
        ) : null}
        {(status === "SIGNATURE_READY_REQUISITION" || status === "TENDER_READY") ? (
          <Link className="btn btn-primary" href={`/requisitions/${data.id}/boq-form`}>
            View BoQ Form
          </Link>
        ) : null}
      </div>

      {lockWarning && (
        <div style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #fcd34d" }}>
          <strong>⚠️ Edit locked:</strong> {lockWarning}
        </div>
      )}

      {officerApprovalWarning && isRequisitionOfficer && (
        <div style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #93c5fd" }}>
          <strong>ℹ️ Package approved:</strong> {officerApprovalWarning}
        </div>
      )}

      {/* Manager notes to officers - yellow card (hide only for requester-only users) */}
      {!isRequesterOnly && managerNotes.length > 0 && (
        <div style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #fcd34d" }}>
          <strong style={{ display: "block", marginBottom: 8 }}>📝 Manager notes</strong>
          {[...managerNotes].reverse().map((note: any) => (
            <div key={note.id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{note.authorName}</span>
                <span style={{ fontSize: 12, opacity: 0.7 }}>
                  {note.createdAt ? new Date(note.createdAt).toLocaleString() : ""}
                </span>
              </div>
              <div style={{ whiteSpace: "pre-wrap" }}>{note.body}</div>
            </div>
          ))}
        </div>
      )}
	  
	  		
        {canManagerAct && isApprovalPending && canEdit ? (
          <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Manager actions</h3>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>
              Decide on the approval package for this requisition.
            </p>
            <div style={{ marginBottom: 12 }}>
              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Note to officers (optional)</div>
                <textarea
                  className="input"
                  style={{ width: "100%", minHeight: 60 }}
                  value={managerNote}
                  onChange={(e) => setManagerNote(e.target.value)}
                  placeholder="Write a note for the officers..."
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={loading || !canEdit}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-approve`, {});
                    await load();
                  } catch (e: any) {
                    setError(e?.message || "Failed to approve");
                  }
                }}
              >
                Approve
              </button>
              <button
                className="btn"
                disabled={loading || !canEdit}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    // Add manager note if provided
                    if (managerNote.trim()) {
                      await apiPost(`/requisitions/${data.id}/manager-notes`, { body: managerNote.trim() });
                    }
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-reject`, { reason: managerNote.trim() || null });
                    router.push("/requisitions/waiting-approvals");
                  } catch (e: any) {
                    setError(e?.message || "Failed to return to officers");
                  }
                }}
              >
                Return to officers
              </button>
              <button
                className="btn"
                style={{ color: "#b91c1c" }}
                disabled={loading || !canEdit}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-archive`, { reason: managerNote.trim() || null });
                    await load();
                  } catch (e: any) {
                    setError(e?.message || "Failed to reject and archive");
                  }
                }}
              >
                Reject & archive
              </button>
            </div>
          </div>
        ) : null}
	
	  {/*
      // Manager input for adding notes 
      {isRequisitionManager && !isArchiveStatus && (
        <div style={{ backgroundColor: "#fffbeb", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #fcd34d" }}>
          <strong style={{ display: "block", marginBottom: 8 }}>Add a note for officers</strong>
          <textarea
            className="input"
            style={{ width: "100%", minHeight: 60, marginBottom: 8 }}
            value={newManagerNote}
            onChange={(e) => setNewManagerNote(e.target.value)}
            placeholder="Write a note to the officers..."
          />
          <button
            className="btn btn-primary"
            disabled={savingManagerNote || !newManagerNote.trim()}
            onClick={async () => {
              if (!newManagerNote.trim()) return;
              setSavingManagerNote(true);
              try {
                await apiPost(`/requisitions/${data.id}/manager-notes`, { body: newManagerNote.trim() });
                setNewManagerNote("");
                await load();
              } catch (e: any) {
                setError(e?.message || "Failed to add note");
              } finally {
                setSavingManagerNote(false);
              }
            }}
          >
            {savingManagerNote ? "Saving…" : "Add note"}
          </button>
        </div>
      )}
	  */}
      {data.manualSubmissions ? <ManualEntryBanner note={data.manualSubmissionsNote} /> : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <span className="pill">Status: {statusLabel}</span>
        {data.createdBy?.email ? <span className="pill">Created by: {data.createdBy.email}</span> : null}
        <span className="pill">Invited: {invitations.length}</span>
        <span className="pill">Price rows: {supplierPrices.length}</span>
        {isRequisitionOfficer && supplierPrices.length > 0 && !isArchiveStatus ? (
          <>
            <button
              className="btn btn-submit"
              disabled={acting !== "" || hasSigned || isLockedByOther}
              onClick={() =>
                doAction("officerSign", async () => {
                  await apiPost(`/requisitions/${data.id}/officers/sign`, {});
                })
              }
              title={hasSigned ? "You have already approved this package" : isLockedByOther ? "Cannot edit: this page is locked by another user" : undefined}
            >
              {hasSigned
                ? "You have approved"
                : acting === "officerSign"
                ? "Submitting…"
                : "✓ I approve"}
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

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

            {!data.manualSubmissions && invitations.length > 0 && !isArchiveStatus ? (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
          <h3 style={{ marginTop: 0 }}>Change control</h3>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            After invitations are sent, the requisition is read-only. To edit, submit a change request for committee approval.
          </p>

          {status === "INVITATIONS_SENT" || status === "CHANGES_REJECTED" ? (
            <button
              className="btn"
              disabled={acting !== "" || !isRequisitionOfficer}
              onClick={() => doAction("submitChanges", () => apiPost(`/requisitions/${data.id}/changes/submit`, {}))}
              title={!isRequisitionOfficer ? "Only requisition officer can request edits" : ""}
            >
              {acting === "submitChanges" ? "Submitting…" : "Request edit (submit for approval)"}
            </button>
          ) : null}

          {status === "CHANGES_SUBMITTED" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div className="pill">Waiting for committee decision…</div>

              {isCommitteeChair ? (
                <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
                  <label>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Reject reason (optional)</div>
                    <input className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Optional" />
                  </label>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="btn btn-primary"
                      disabled={acting !== ""}
                      onClick={() => doAction("approve", () => apiPost(`/requisitions/${data.id}/changes/approve`, {}))}
                    >
                      {acting === "approve" ? "Approving…" : "Approve edit"}
                    </button>
                    <button
                      className="btn"
                      style={{ color: "#b91c1c" }}
                      disabled={acting !== ""}
                      onClick={() =>
                        doAction("reject", () => apiPost(`/requisitions/${data.id}/changes/reject`, { reason: rejectReason || null }))
                      }
                    >
                      {acting === "reject" ? "Rejecting…" : "Reject"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {status === "CHANGES_APPROVED" ? (
            <div className="pill">Approved. You can now open the edit page and make changes.</div>
          ) : null}
        </div>
      ) : (
      <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
          <h3 style={{ marginTop: 0 }}>Manual submissions</h3>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            This requisition uses paper/manual submissions.
            {anyOfficerSigned
              ? " Changes are locked after an officer approval."
              : " You can add more submissions until an officer approves."}
          </p>
          <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!anyOfficerSigned ? (
              <Link className="btn" href={`/requisitions/${data.id}/manual-submissions`}>
                Add more submissions
              </Link>
            ) : null}
          </div>
        </div>
      )}

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
            : null}
        </p>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>No</th>
              <th>Description</th>
              <th>UOM</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
              <th>Min</th>
              <th>Max</th>
              <th>Avg</th>
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
                  <td>{line.description}</td>
                  <td>{line.uom}</td>
                  <td>{Number.isFinite(qty) ? formatInteger(qty) : ""}</td>
                  <td>
                    <input
                      className="input"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={
                        typeof line.finalUnitPrice === "string" && line.finalUnitPrice !== ""
                          ? line.finalUnitPrice
                          : "0.00"
                      }
                      onChange={(e) => handleLineChange(idx, "finalUnitPrice", e.target.value)}
                      style={{ maxWidth: 140 }}
                      disabled={isArchiveStatus || !canEditApprovalPackage}
                    />
                  </td>
                  <td>{total != null ? formatAmount(total, currency) : ""}</td>
                  <td style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: 4 }}>{line.minPrice != null ? formatAmount(line.minPrice, currency) : ""}</td>
                  <td style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: 4 }}>{line.maxPrice != null ? formatAmount(line.maxPrice, currency) : ""}</td>
                  <td style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: "4px 8px", borderRadius: 4 }}>{line.avgPrice != null ? formatAmount(line.avgPrice, currency) : ""}</td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ color: "var(--muted)" }}>
                  No items.
                </td>
              </tr>
            ) : null}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: "#f0f9ff", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={5} style={{ textAlign: "right", padding: "12px 8px" }}>Grand Total:</td>
                <td style={{ padding: "12px 8px" }}>
                  {(() => {
                    const currencies = new Set(lines.map((l: any) => l.currency).filter(Boolean));
                    const currency = currencies.size === 1 ? Array.from(currencies)[0] : "";
                    const grandTotal = lines.reduce((sum: number, line: any) => {
                      const qty = Number(line.quantity);
                      const unit = Number(line.finalUnitPrice);
                      return sum + (Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0);
                    }, 0);
                    return formatAmount(grandTotal, currency);
                  })()}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          )}
        </table>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={handleSaveTenderPrep}
            disabled={isArchiveStatus || savingTenderPrep || !lines.length || !canEditApprovalPackage}
            title={!canEditApprovalPackage ? "Cannot edit: this page is locked by another user" : undefined}
          >
            {savingTenderPrep ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Submissions overview</h3>
        <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13 }}>
          Final unit prices from the approval package above.
        </p>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>Item</th>
              <th>Qty</th>
              <th>Final unit price</th>
              <th>Final total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const qty = Number(line.quantity);
              const unit = Number(line.finalUnitPrice);
              const total = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null;
              const currency = String(line.currency || "");
              return (
                <tr key={line.requisitionItemId} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{line.description}</td>
                  <td>{Number.isFinite(qty) ? formatInteger(qty) : ""}</td>
                  <td>{Number.isFinite(unit) ? formatAmount(unit, currency) : ""}</td>
                  <td>{total != null ? formatAmount(total, currency) : ""}</td>
                </tr>
              );
            })}
            {lines.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  No items in approval package.
                </td>
              </tr>
            ) : null}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr style={{ backgroundColor: "#f0f9ff", borderTop: "2px solid var(--border)", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right", padding: "12px 8px" }}>Grand Total:</td>
                <td style={{ padding: "12px 8px" }}>
                  {(() => {
                    const currencies = new Set(lines.map((l: any) => l.currency).filter(Boolean));
                    const currency = currencies.size === 1 ? Array.from(currencies)[0] : "";
                    const grandTotal = lines.reduce((sum: number, line: any) => {
                      const qty = Number(line.quantity);
                      const unit = Number(line.finalUnitPrice);
                      return sum + (Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : 0);
                    }, 0);
                    return formatAmount(grandTotal, currency);
                  })()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
		<div style={{ marginTop: "16px", textAlign: "right" }}>
		  <Link href={`/submissions/${params.id}?fromApproval=true`} className="btn">
  View Detailed Submissions by Item
</Link>
		</div>
  
     </div>
      </InternalPage>
    </RequireRoles>
  );
}
