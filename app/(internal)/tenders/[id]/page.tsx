"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../components/InternalPage";
import { apiGet, apiPost, apiPut } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

interface Props {
  params: { id: string };
}

function isoLocal(dt: Date) {
  // format as yyyy-MM-ddTHH:mm for input[type=datetime-local]
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export default function TenderDetailPage({ params }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");

  const [copy, setCopy] = useState<any | null>(null);
  const [originalCopy, setOriginalCopy] = useState<any | null>(null);
  const [copyError, setCopyError] = useState<string>("");
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [prepItems, setPrepItems] = useState<any[]>([]);
  const [prepItemsForBoq, setPrepItemsForBoq] = useState<any[]>([]);
  const [uomOptions, setUomOptions] = useState<string[]>([]);
  const [closingAtInput, setClosingAtInput] = useState<string>("");
  const [prepApprovals, setPrepApprovals] = useState<any | null>(null);
  const [lockInfo, setLockInfo] = useState<any | null>(null);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [tenderEstimatedValueInput, setTenderEstimatedValueInput] = useState<string>("");

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isTenderOfficer = roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isTenderApproval = roles.includes("TENDER_APPROVAL") || isSysAdmin;

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      // Debug: trace tender load on frontend
      // eslint-disable-next-line no-console
      console.log('[TenderDetailPage] Loading tender', { tenderId: params.id });
      const t = await apiGet(`/tenders/${params.id}`);
      // eslint-disable-next-line no-console
      console.log('[TenderDetailPage] Loaded tender data', {
        tenderId: params.id,
        status: t?.status,
      });
      setData(t);
      // Initialize tender estimated value input from backend value
      const est = t?.tenderEstimatedValue;
      if (est != null && !Number.isNaN(Number(est))) {
        const num = Number(est);
        // Use shared formatter with tenderEstimatedCurrency when available
        const cur = (t as any)?.tenderEstimatedCurrency || null;
        setTenderEstimatedValueInput(
          formatCurrency(num, cur),
        );
      } else {
        setTenderEstimatedValueInput("");
      }
      // normalise closingAt to yyyy-MM-ddTHH:mm in local time for datetime-local input
      const rawClosing: string = t?.closingAt || "";
      let normalized = "";
      if (rawClosing) {
        const d = new Date(rawClosing);
        if (!Number.isNaN(d.getTime())) {
          normalized = isoLocal(d).slice(0, 16);
        }
      }
      setClosingAtInput(normalized);
      try {
        const c = await apiGet(`/tenders/${params.id}/requisition-copy`);
        setCopy(c);
        // Capture original snapshot only once so the read-only view
        // is not affected by later edits or reloads.
        setOriginalCopy((prev) => (prev ? prev : c));
        setCopyError("");
        if (c) {
          setEditTitle(c.title || "");
          setEditDescription(c.description || "");
        } else {
          setEditTitle("");
          setEditDescription("");
        }
        const prep = await apiGet(`/tenders/${params.id}/prep-items`);
        const prepArray = Array.isArray(prep) ? prep : [];
        setPrepItems(prepArray);
        setPrepItemsForBoq(prepArray);
        try {
          const u = await apiGet("/uom");
          const fallback = [
            "EA",
            "SET",
            "LOT",
            "BOX",
            "KG",
            "G",
            "L",
            "ML",
            "M",
            "M2",
            "M3",
            "HR",
            "DAY",
            "MONTH",
          ];
          const opts = (Array.isArray(u) && u.length ? u : fallback.map((c: string) => ({ code: c })))
            .map((x: any) => String(x?.code || x || "").trim())
            .filter(Boolean);
          setUomOptions(opts);
        } catch (e) {
          // leave uomOptions empty; we'll fall back in the select
        }
        try {
          const approvals = await apiGet(`/tenders/${params.id}/prep-approvals`);
          setPrepApprovals(approvals || null);
        } catch (e) {
          setPrepApprovals(null);
        }
        try {
          const curList = await apiGet(`/currencies`);
          const list =
            Array.isArray(curList) && curList.length
              ? curList.filter((c: any) => c.isActive !== false)
              : [];
          setCurrencies(list);
        } catch (e) {
          setCurrencies([]);
        }
      } catch (e: any) {
        // Snapshot not yet available – treat as optional read-only data
        setCopy(null);
        setCopyError("");
        setEditTitle("");
        setEditDescription("");
        setPrepItems([]);
        setPrepItemsForBoq([]);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load tender");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  // Acquire tender-prep lock on mount for tender officers / admins and
  // keep it alive with a heartbeat, mirroring the legacy TenderPrepLock
  // behaviour but backed by the global PageLock table.
  useEffect(() => {
    if (!isTenderOfficer) return undefined;
    let cancelled = false;

    const acquire = async () => {
      try {
        const res = await apiPost(`/tenders/${params.id}/prep-lock`, {});
        if (!cancelled) {
          setLockInfo(res || null);
        }
      } catch {
        if (!cancelled) {
          setLockInfo(null);
        }
      }
    };

    acquire();

    let intervalId: any = null;
    intervalId = window.setInterval(() => {
      apiPost(`/tenders/${params.id}/prep-lock`, {})
        .then((res) => {
          if (!cancelled) {
            setLockInfo(res || null);
          }
        })
        .catch(() => undefined);
    }, 60_000);

    const handleBeforeUnload = () => {
      try {
        void apiPost(`/tenders/${params.id}/prep-lock/release`, {});
      } catch {
        // ignore
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (intervalId) window.clearInterval(intervalId);
      try {
        void apiPost(`/tenders/${params.id}/prep-lock/release`, {});
      } catch {
        // ignore
      }
    };
  }, [isTenderOfficer, params.id]);

  const action = async (name: string, path: string, body: any = {}) => {
    setError("");
    setActing(name);
    try {
      // Debug: trace actions from the detail page
      // eslint-disable-next-line no-console
      console.log('[TenderDetailPage] Action start', {
        action: name,
        path,
        tenderId: params.id,
        body,
      });
      await apiPost(path, body);
      // eslint-disable-next-line no-console
      console.log('[TenderDetailPage] Action success, reloading tender', {
        action: name,
        tenderId: params.id,
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const savePrep = async () => {
    if (!copy) return;

    // Enforce mandatory fields on all prep items: type, description, UOM, Qty.
    const invalid = (prepItems || []).some((it: any) => {
      const typeOk = typeof it.itemType === "string" && it.itemType.trim().length > 0;
      const descOk = typeof it.description === "string" && it.description.trim().length > 0;
      const uomOk = typeof it.uom === "string" && it.uom.trim().length > 0;
      const qty = Number(it.quantity);
      const qtyOk = Number.isFinite(qty) && qty > 0;
      return !(typeOk && descOk && uomOk && qtyOk);
    });
    if (invalid) {
      setCopyError(
        "Type, description, UOM and quantity are required for every row. Please fill them in before saving.",
      );
      return;
    }

    setActing("save-prep");
    setCopyError("");
    try {
      // Persist tender estimated value together with prep items so
      // officers do not rely on blur events.
      try {
        const raw = tenderEstimatedValueInput.trim();
        const numericOnly = raw.replace(/[^0-9.-]/g, "");
        const normalized = numericOnly.replace(/,/g, "");
        const num =
          normalized === "" || normalized === null ? null : Number(normalized);
        await apiPost(`/tenders/${params.id}/estimated-value`, {
          estimatedValue: num,
          currency:
            (data as any)?.tenderEstimatedCurrency ||
            (Array.isArray(currencies) && currencies[0]
              ? String(currencies[0].code || "IQD")
              : "IQD"),
        });
      } catch (e) {
        // Non-fatal; continue saving prep even if estimate fails.
        // eslint-disable-next-line no-console
        console.error(e);
      }

      const payload = {
        title: editTitle,
        description: editDescription,
        items: prepItems.map((it: any) => ({
          id: it.id,
          requisitionItemId: it.requisitionItemId ?? null,
          description: it.description,
          uom: it.uom,
          quantity: it.quantity,
          notes: it.notes,
          itemType: it.itemType ?? null,
        })),
      };
      await apiPut(`/tenders/${params.id}/prep-items`, payload);
      // After successful save, refresh prep-items from backend for BoQ consistency
      const fresh = await apiGet(`/tenders/${params.id}/prep-items`);
      const freshArray = Array.isArray(fresh) ? fresh : [];
      setPrepItemsForBoq(freshArray);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("Forbidden")) {
        setCopyError(
          "For any changes, please return the document to the officer.",
        );
      } else {
        setCopyError(msg || "Failed to save tender preparation");
      }
    } finally {
      setActing("");
    }
  };

  const resetPrep = async () => {
    if (!copy) return;
    if (
      !window.confirm(
        "Reset tender preparation to the original snapshot? All edits in the editable copy and BoQ will be lost.",
      )
    ) {
      return;
    }
    setActing("reset-prep");
    setCopyError("");
    try {
      await apiPost(`/tenders/${params.id}/prep-items/reset`, {});
      const freshCopy = await apiGet(`/tenders/${params.id}/requisition-copy`);
      setCopy(freshCopy);
      const freshPrep = await apiGet(`/tenders/${params.id}/prep-items`);
      const freshArray = Array.isArray(freshPrep) ? freshPrep : [];
      setPrepItems(freshArray);
      setPrepItemsForBoq(freshArray);
      setEditTitle(freshCopy?.title || "");
      setEditDescription(freshCopy?.description || "");
    } catch (e: any) {
      const msg = String(e?.message || "");
      setCopyError(msg || "Failed to reset tender preparation");
    } finally {
      setActing("");
    }
  };

  const saveClosing = async () => {
    // Default to today's date at 12:00 if user has not selected anything yet.
    let value = closingAtInput;
    if (!value) {
      const now = new Date();
      now.setHours(12, 0, 0, 0);
      value = isoLocal(now);
      setClosingAtInput(value);
    }
    setActing("closing");
    setError("");
    try {
      // Send a yyyy-MM-ddTHH:mm string; backend interprets consistently as a closing timestamp.
      await apiPost(`/tenders/${params.id}/closing-at`, {
        closingAt: value,
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update closing date");
    } finally {
      setActing("");
    }
  };

  const tenderName =
    editTitle ||
    originalCopy?.title ||
    copy?.title ||
    data?.requisition?.title ||
    data?.title ||
    // Prefer business ID (requisitionId) in the fallback name instead of tender UUID.
    (data?.requisitionId
      ? `Tender ${data.requisitionId}`
      : data?.id
      ? `Tender ${data.id}`
      : `Tender ${params.id}`);

  const title = tenderName;

  const rawStatus: string = data?.status || "";
  // Display status: treat draft tender-prep statuses as TENDER_READY in the UI.
  const status: string =
    rawStatus === "DRAFT_TENDER" || rawStatus === "DRAFT_TENDER_RETURN"
      ? "TENDER_READY"
      : rawStatus;

  const approvalsList: any[] =
    Array.isArray(prepApprovals?.approvals) ? prepApprovals.approvals : [];

  const hasAnyApproval: boolean = approvalsList.some(
    (a: any) => String(a.decision) === 'APPROVED',
  );

  const lockStatus: string = lockInfo?.status || 'NONE';
  const canEditPrep =
    isTenderOfficer &&
    lockStatus === 'OWNED' &&
    !hasAnyApproval &&
    (rawStatus === 'DRAFT_TENDER' || rawStatus === 'DRAFT_TENDER_RETURN');

  // Track whether the current user has already approved this tender prep,
  // so we can hide the "Approve preparation" button immediately after click.
  const [hasApproved, setHasApproved] = useState(false);

  useEffect(() => {
    if (!user) {
      setHasApproved(false);
      return;
    }
    const myId =
      (user as any)?.userId != null
        ? (user as any).userId
        : (user as any)?.id;
    if (myId == null || !Array.isArray(approvalsList)) {
      setHasApproved(false);
      return;
    }
    const already = approvalsList.some(
      (a: any) =>
        String(a.userId) === String(myId) &&
        String(a.decision) === "APPROVED",
    );
    setHasApproved(already);
  }, [approvalsList, user]);

  const [managerReturnNotes, setManagerReturnNotes] = useState<
    { createdAt: string; reason: string }[]
  >([]);
  const [managerRejectNotes, setManagerRejectNotes] = useState<
    { createdAt: string; reason: string }[]
  >([]);
  const [showAllManagerNotes, setShowAllManagerNotes] = useState(false);

  useEffect(() => {
    const loadNotes = async () => {
      if (!data) return;
      // eslint-disable-next-line no-console
      console.log('[TenderDetailPage] Loading manager notes', {
        tenderId: params.id,
        status: data?.status,
      });
      try {
        const [returnPayload, rejectPayload] = await Promise.all([
          apiGet(`/tenders/${params.id}/prep-return-notes`),
          apiGet(`/tenders/${params.id}/prep-reject-notes`),
        ]);
        let returnNotes: { createdAt: string; reason: string }[] = [];
        let rejectNotes: { createdAt: string; reason: string }[] = [];

        const parsePayload = (payload: any): { createdAt: string; reason: string }[] => {
          if (!payload) return [];
          if (Array.isArray(payload)) return payload as any;
          if (Array.isArray((payload as any).notes)) return (payload as any).notes as any;
          if (typeof payload === 'string') {
            const text = payload.trim();
            return text ? [{ createdAt: new Date().toISOString(), reason: text }] : [];
          }
          if (
            typeof (payload as any).reason === 'string' &&
            (payload as any).reason.trim()
          ) {
            return [
              {
                createdAt: new Date().toISOString(),
                reason: (payload as any).reason.trim(),
              },
            ];
          }
          return [];
        };

        returnNotes = parsePayload(returnPayload);
        rejectNotes = parsePayload(rejectPayload);

        // eslint-disable-next-line no-console
        console.log('[TenderDetailPage] Loaded manager notes', {
          tenderId: params.id,
          status: data?.status,
          returnCount: returnNotes.length,
          rejectCount: rejectNotes.length,
        });
        setManagerReturnNotes(returnNotes);
        setManagerRejectNotes(rejectNotes);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[TenderDetailPage] Failed to load manager notes', {
          tenderId: params.id,
          status: data?.status,
          error: (e as any)?.message,
        });
        setManagerReturnNotes([]);
        setManagerRejectNotes([]);
      }
    };
    loadNotes();
  }, [data, params.id]);

  // Merge snapshot items with prep overrides for BoQ
  const snapshotItems: any[] = Array.isArray(originalCopy?.items)
    ? (originalCopy as any).items
    : [];

  const mergedBoqItems: any[] = (() => {
    const byReqId: Record<string, any> = {};
    snapshotItems.forEach((it: any) => {
      if (it.requisitionItemId != null) {
        byReqId[String(it.requisitionItemId)] = it;
      }
    });

    const merged: any[] = [];

    // Existing snapshot items with possible overrides from saved prep rows
    snapshotItems.forEach((snap: any) => {
      const key = snap.requisitionItemId != null ? String(snap.requisitionItemId) : null;
      const override = key
        ? prepItemsForBoq.find((p: any) => String(p.requisitionItemId) === key)
        : null;

      const finalName =
        override && typeof override.description === "string" && override.description.trim().length
          ? override.description
          : snap.name;
      const finalUom = override?.uom ?? snap.uom;
      const finalQty = override?.quantity ?? snap.quantity;
      const finalType =
        (override && override.itemType) || snap.itemType || "MATERIAL";

      merged.push({
        id: snap.id,
        name: finalName,
        technicalDescription: snap.technicalDescription,
        uom: finalUom,
        quantity: finalQty,
        itemType: finalType,
      });
    });

    // Extra prep-only items (no matching requisition item) from last saved state
    (prepItemsForBoq || []).forEach((p: any) => {
      const key = p.requisitionItemId != null ? String(p.requisitionItemId) : null;
      if (!key || !byReqId[key]) {
        merged.push({
          id: p.id,
          name: p.description,
          technicalDescription: null,
          uom: p.uom || "",
          quantity: p.quantity ?? null,
          itemType: p.itemType || "MATERIAL",
        });
      }
    });

    return merged;
  })();

  const materialsBoq = mergedBoqItems.filter(
    (it: any) => String(it.itemType || "MATERIAL").toUpperCase() === "MATERIAL",
  );
  const servicesBoq = mergedBoqItems.filter(
    (it: any) => String(it.itemType || "MATERIAL").toUpperCase() === "SERVICE",
  );

  const formatCurrency = (amount: number | null | undefined, code?: string | null) => {
    if (amount == null || !Number.isFinite(Number(amount))) return "";
    const num = Number(amount);
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const cur = code && String(code).trim();
    return cur ? `${cur} ${formatted}` : formatted;
  };

  const renderBoqTable = (titleText: string, footerLabel: string, rows: any[]) => (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ marginTop: 0 }}>{titleText}</h4>
      <table
        width="100%"
        cellPadding={6}
        style={{ borderCollapse: "collapse", fontSize: 13 }}
      >
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th style={{ width: 50 }}>1<br />Item No.</th>
            <th>2<br />Commodities Description</th>
            <th style={{ width: 110 }}>3<br />Date of Delivery (bidder)</th>
            <th style={{ width: 70 }}>4<br />UOM</th>
            <th style={{ width: 80 }}>5<br />Quantities</th>
            <th style={{ width: 130 }}>6<br />Unit Price DDP (IQD, bidder)</th>
            <th style={{ width: 130 }}>7<br />Total Price of each Item (IQD)</th>
            <th style={{ width: 120 }}>8<br />Country of Origin (bidder)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((it: any, idx: number) => (
            <tr key={idx} style={{ borderTop: "1px solid var(--border)" }}>
              <td>{idx + 1}</td>
              <td>
                <div style={{ fontWeight: 700 }}>{it.name}</div>
                {it.technicalDescription && (
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      color: "var(--muted)",
                      fontSize: 12,
                    }}
                  >
                    {it.technicalDescription}
                  </div>
                )}
              </td>
              <td style={{ color: "var(--muted)", fontSize: 12 }}>
                (to be filled by bidder)
              </td>
              <td>{it.uom}</td>
              <td>{it.quantity}</td>
              <td style={{ color: "var(--muted)", fontSize: 12 }}>
                (bidder unit price IQD)
              </td>
              <td style={{ color: "var(--muted)", fontSize: 12 }}>
                (5 × 6)
              </td>
              <td style={{ color: "var(--muted)", fontSize: 12 }}>
                (bidder country of origin)
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} style={{ color: "var(--muted)" }}>
                No items in this section.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <div style={{ marginTop: 4, fontWeight: 700 }}>
        {footerLabel}: (sum of column 7)
      </div>
    </div>
  );

  return (
    <InternalPage title={title}>

        <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {data?.status && <span className="pill">Status: {data.status}</span>}
          {data?.id && (
            <Link
              href={`/tender-prep/requisition/${data.id}`}
              target="_blank"
              className="btn"
            >
              View requisition & attachments
            </Link>
          )}
          {/* Officer actions - only visible to tender officers / admins; backend still enforces assignments */}
          {isTenderOfficer && (
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              {/* Approve preparation */}
              {(rawStatus === "DRAFT_TENDER" ||
                rawStatus === "DRAFT_TENDER_RETURN") && (
                <button
                  type="button"
                  className="btn btn-primary"
                  // Phase 1 (no approvals yet): only the lock owner can approve.
                  // Phase 2 (some approvals): any remaining officer can approve
                  // even though editing is locked.
                  disabled={
                    acting === "officer-approve" ||
                    hasApproved ||
                    (!hasAnyApproval && !canEditPrep)
                  }
                  onClick={() => {
                    setHasApproved(true);
                    action(
                      "officer-approve",
                      `/tenders/${params.id}/prep-approvals/officer-approve`,
                    );
                  }}
                >
                  {hasApproved
                    ? "Approved"
                    : acting === "officer-approve"
                    ? "Approving…"
                    : "Approve preparation"}
                </button>
              )}

              {/* Cancel my approval - remains active for this officer */}
              {(rawStatus === "DRAFT_TENDER" ||
                rawStatus === "DRAFT_TENDER_RETURN" ||
                rawStatus === "TENDER_PENDING_APPROVAL") && (
                <button
                  type="button"
                  className="btn"
                  // Cancel is only disabled if this officer has not approved yet,
                  // or a cancel request is already in flight. It does NOT depend
                  // on edit lock or other officers' approvals.
                  disabled={acting === "officer-cancel" || !hasApproved}
                  onClick={() =>
                    action(
                      "officer-cancel",
                      `/tenders/${params.id}/prep-approvals/officer-cancel`,
                    )
                  }
                >
                  {acting === "officer-cancel"
                    ? "Cancelling…"
                    : "Cancel my approval"}
                </button>
              )}
            </div>
          )}
          {/* Manager actions - only visible to TENDER_APPROVAL / admins */}
          {isTenderApproval && status === "TENDER_PENDING_APPROVAL" && (
            <div style={{ display: "flex", gap: 8, marginLeft: 8 }}>
              <button
                type="button"
                className="btn btn-primary"
                disabled={acting === "manager-approve"}
                onClick={() =>
                  action(
                    "manager-approve",
                    `/tenders/${params.id}/prep-approvals/manager-approve`,
                  )
                }
              >
                {acting === "manager-approve" ? "Approving…" : "Approve"}
              </button>
              <button
                type="button"
                className="btn"
                disabled={acting === "manager-return"}
                onClick={() => {
                  const reason = window.prompt(
                    "Reason for returning to officers (optional):",
                    "",
                  );
                  if (reason === null) {
                    return;
                  }
                  action(
                    "manager-return",
                    `/tenders/${params.id}/prep-approvals/manager-return`,
                    { reason: reason || null },
                  );
                }}
              >
                {acting === "manager-return" ? "Returning…" : "Return to officers"}
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={acting === "manager-reject"}
                onClick={() => {
                  if (!window.confirm("Reject and archive this tender?")) {
                    return;
                  }
                  const reason = window.prompt(
                    "Reason for rejection (optional):",
                    "",
                  );
                  action(
                    "manager-reject",
                    `/tenders/${params.id}/prep-approvals/manager-reject`,
                    { reason: reason || null },
                  );
                }}
              >
                {acting === "manager-reject" ? "Rejecting…" : "Reject & archive"}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }} />
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {lockStatus !== 'OWNED' &&
        (rawStatus === 'DRAFT_TENDER' ||
          rawStatus === 'DRAFT_TENDER_RETURN' ||
          rawStatus === 'TENDER_PENDING_APPROVAL') && (
        <div
          className="card"
          style={{
            boxShadow: 'none',
            marginBottom: 12,
            background: 'rgba(254,240,138,0.6)',
            border: '1px solid #facc15',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            Tender preparation locked
          </div>
          <div style={{ fontSize: 13 }}>
            This tender preparation is currently being edited by{' '}
            {lockInfo?.byUser?.fullName || 'another officer'}. You can view but
            not edit until they close it or the lock expires.
          </div>
        </div>
      )}

      {/* Banner when tender is effectively locked because an officer has already approved.
          Only show while we're still in the tender-prep draft/approval statuses. */}
      {!hasAnyApproval ||
      !(
        rawStatus === 'DRAFT_TENDER' ||
        rawStatus === 'DRAFT_TENDER_RETURN' ||
        rawStatus === 'TENDER_PENDING_APPROVAL'
      ) ? null : (
        <div
          className="card"
          style={{
            boxShadow: 'none',
            marginBottom: 12,
            background: 'rgba(254,240,138,0.6)',
            border: '1px solid #facc15',
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 4 }}>
            Tender preparation signed
          </div>
          <div style={{ fontSize: 13 }}>
            {(() => {
              const firstApproved = approvalsList.find(
                (a: any) => String(a.decision) === 'APPROVED',
              );
              const who =
                firstApproved?.user?.fullName ||
                (firstApproved?.userId
                  ? `officer ID ${firstApproved.userId}`
                  : 'an assigned officer');
              return `This tender preparation has already been approved by ${who} and is locked for edits. To make changes, ask them to cancel their approval.`;
            })()}
          </div>
        </div>
      )}
      {managerReturnNotes &&
        managerReturnNotes.length > 0 ? (
        <div
          className="card"
          style={{
            boxShadow: "none",
            marginBottom: 12,
            background: "rgba(254,240,138,0.6)",
            border: "1px solid #facc15",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 800 }}>Manager notes</span>
            {managerReturnNotes.length > 1 && (
              <button
                type="button"
                className="btn btn-xs"
                onClick={() => setShowAllManagerNotes((v) => !v)}
              >
                {showAllManagerNotes
                  ? "Hide older notes"
                  : `Show all (${managerReturnNotes.length})`}
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {managerReturnNotes.map((n, idx) => (
              <div
                key={`${n.createdAt}-${idx}`}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: "rgba(250, 204, 21, 0.25)",
                  border: "1px solid rgba(234, 179, 8, 0.6)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#854d0e" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{n.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Manager rejection notes visible when tender is rejected or later */}
      {managerRejectNotes &&
        managerRejectNotes.length > 0 ? (
        <div
          className="card"
          style={{
            boxShadow: "none",
            marginBottom: 12,
            background: "rgba(254,202,202,0.6)",
            border: "1px solid #fca5a5",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 4,
            }}
          >
            <span style={{ fontWeight: 800 }}>Manager rejection notes</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {managerRejectNotes.map((n, idx) => (
              <div
                key={`${n.createdAt}-${idx}`}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  background: "rgba(254,226,226,0.9)",
                  border: "1px solid rgba(248,113,113,0.7)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: 13,
                  }}
                >
                  <span style={{ fontSize: 11, color: "#7f1d1d" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                  <span style={{ whiteSpace: "pre-wrap" }}>{n.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {loading && !data ? (
        <p>Loading…</p>
      ) : !data ? (
        <p>Not found.</p>
      ) : (
        <>
          <div className="card" style={{ boxShadow: "none", background: "var(--surface-2)", marginBottom: 12 }}>
            <p><strong>Status:</strong> {data.status}</p>
            <p>
              <strong>Closing date:</strong>{" "}
              <input
                type="date"
                className="input"
                style={{ maxWidth: 200, display: "inline-block", marginLeft: 4 }}
                value={closingAtInput ? closingAtInput.slice(0, 10) : ""}
                disabled={!canEditPrep}
                onChange={(e) => {
                  const day = e.target.value;
                  if (!day) {
                    setClosingAtInput("");
                    return;
                  }
                  // Preserve current time part if set, otherwise default to 12:00.
                  const current = closingAtInput && closingAtInput.length >= 16 ? closingAtInput : undefined;
                  const timePart = current ? current.slice(11, 16) : "12:00";
                  setClosingAtInput(`${day}T${timePart}`);
                }}
              />
              <span style={{ marginLeft: 8 }}>
                <strong>Time:</strong>{" "}
                <input
                  type="time"
                  className="input"
                  style={{ maxWidth: 120, display: "inline-block", marginLeft: 4 }}
                  value={closingAtInput && closingAtInput.length >= 16 ? closingAtInput.slice(11, 16) : "12:00"}
                  disabled={!canEditPrep}
                  onChange={(e) => {
                    const time = e.target.value || "12:00";
                    const day = closingAtInput ? closingAtInput.slice(0, 10) : (() => {
                      const now = new Date();
                      return isoLocal(now).slice(0, 10);
                    })();
                    setClosingAtInput(`${day}T${time}`);
                  }}
                />
              </span>
              <button
                type="button"
                className="btn"
                style={{ marginLeft: 8 }}
                onClick={saveClosing}
                disabled={!canEditPrep || acting === "closing"}
              >
                {acting === "closing" ? "Saving…" : "Save"}
              </button>
            </p>
            <p><strong>Tender:</strong> {tenderName}</p>
          </div>

          {/* Editable copy */}
          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Tender preparation (editable copy)</h3>

            {copy ? (
              <div style={{ display: "grid", gap: 10 }}>
                {copyError && (
                  <p style={{ color: "#b91c1c" }}>{copyError}</p>
                )}
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Title</div>
                <input
                    className="input"
                    style={{ width: "100%" }}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    disabled={!canEditPrep}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, marginBottom: 4 }}>Description</div>
                  <textarea
                    className="input"
                    disabled={!canEditPrep}
                    style={{
                      width: "100%",
                      fontSize: 14,
                      whiteSpace: "pre-wrap",
                      boxSizing: "border-box",
                      overflow: "hidden",
                      resize: "none",
                    }}
                    rows={Math.max(1, (editDescription || "").split("\n").length)}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    onInput={(e) => {
                      const el = e.currentTarget as HTMLTextAreaElement;
                      el.style.height = "auto";
                      el.style.height = `${el.scrollHeight}px`;
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 800 }}>Items</span>
                    <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={!canEditPrep || acting === "reset-prep"}
                      onClick={resetPrep}
                    >
                      {acting === "reset-prep" ? "Resetting…" : "Reset to snapshot"}
                    </button>
                    </div>
                  </div>

                  <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-xs"
                      disabled={!canEditPrep}
                      onClick={() => {
                        setPrepItems((prev) => [
                          ...prev,
                          {
                            id: null,
                            requisitionItemId: null,
                            description: "",
                            uom: "",
                            quantity: null,
                            notes: "",
                            itemType: "MATERIAL",
                          },
                        ]);
                      }}
                    >
                      + Add item
                    </button>
                  </div>

                  <table
                    width="100%"
                    cellPadding={6}
                    style={{
                      borderCollapse: "collapse",
                      fontSize: 13,
                      tableLayout: "fixed",
                    }}
                  >
                    <colgroup>
                      <col style={{ width: "6%" }} />   {/* # */}
                      <col style={{ width: "14%" }} />  {/* Type */}
                      <col style={{ width: "50%" }} />  {/* Description */}
                      <col style={{ width: "10%" }} />  {/* UOM */}
                      <col style={{ width: "10%" }} />  {/* Qty */}
                      <col style={{ width: "10%" }} />  {/* Actions */}
                    </colgroup>
                    <thead>
                      <tr style={{ textAlign: "left" }}>
                        <th>#</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th style={{ textAlign: "center" }}>UOM</th>
                        <th style={{ textAlign: "center" }}>Qty</th>
                        <th style={{ textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prepItems.map((it: any, idx: number) => {
                        const snap =
                          originalCopy?.items?.find(
                            (x: any) =>
                              x.requisitionItemId != null &&
                              it.requisitionItemId != null &&
                              String(x.requisitionItemId) === String(it.requisitionItemId),
                          ) || null;
                        const rawType: string =
                          (it.itemType as string) || (snap?.itemType as string) || "MATERIAL";
                        const typeValue =
                          String(rawType).toUpperCase() === "SERVICE" ? "SERVICE" : "MATERIAL";
                        const isNew = !snap;
                        return (
                          <tr
                            key={it.id != null ? String(it.id) : `new-${idx}`}
                            style={{
                              borderTop: "1px solid var(--border)",
                              backgroundColor: isNew ? "#fefce8" : undefined, // light yellow for added rows
                            }}
                          >
                            <td>{idx + 1}</td>
                            <td>
                              <select
                                className="input"
                                value={typeValue}
                                disabled={!canEditPrep}
                                onChange={(e) => {
                                  const next = [...prepItems];
                                  next[idx] = {
                                    ...next[idx],
                                    itemType: e.target.value,
                                  };
                                  setPrepItems(next);
                                }}
                              >
                                <option value="MATERIAL">Material</option>
                                <option value="SERVICE">Service</option>
                              </select>
                            </td>
                            <td>
                              <textarea
                                disabled={!canEditPrep}
                                ref={(el) => {
                                  if (el) {
                                    el.style.height = "auto";
                                    el.style.height = `${el.scrollHeight}px`;
                                  }
                                }}
                                className="input"
                                rows={1}
                                style={{
                                  width: "100%",
                                  fontSize: 14,
                                  whiteSpace: "pre-wrap",
                                  boxSizing: "border-box",
                                  overflow: "hidden",
                                  resize: "none",
                                }}
                                value={it.description || ""}
                                onChange={(e) => {
                                  const next = [...prepItems];
                                  next[idx] = { ...next[idx], description: e.target.value };
                                  setPrepItems(next);
                                }}
                                onInput={(e) => {
                                  const el = e.currentTarget;
                                  el.style.height = "auto";
                                  el.style.height = `${el.scrollHeight}px`;
                                }}
                              />
                            </td>

                          <td>
                              <select
                              className="input"
                              disabled={!canEditPrep}
                              style={{
                                width: "100%",
                                textAlign: "center",
                                boxSizing: "border-box",
                              }}
                              value={it.uom || ""}
                              onChange={(e) => {
                                const next = [...prepItems];
                                next[idx] = { ...next[idx], uom: e.target.value };
                                setPrepItems(next);
                              }}
                            >
                              {(uomOptions.length ? uomOptions : [it.uom || ""]).map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input
                              className="input"
                              disabled={!canEditPrep}
                              style={{
                                width: "100%",
                                textAlign: "center",
                                boxSizing: "border-box",
                              }}
                              value={it.quantity ?? ""}
                              onChange={(e) => {
                                const v = parseFloat(e.target.value);
                                const next = [...prepItems];
                                next[idx] = { ...next[idx], quantity: Number.isFinite(v) ? v : 0 };
                                setPrepItems(next);
                              }}
                            />
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="btn btn-xs"
                              disabled={!canEditPrep}
                              onClick={() => {
                                setPrepItems((prev) =>
                                  prev.filter((row: any, j: number) => j !== idx),
                                );
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                      })}
                    </tbody>
                </table>
              </div>

                {/* Grand total of requisition + editable tender estimated value */}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    alignItems: "center",
                    justifyContent: "flex-end",
                    marginTop: 8,
                  }}
                >
                  {(() => {
                    const items: any[] = Array.isArray(originalCopy?.items)
                      ? (originalCopy as any).items
                      : [];
                    let total = 0;
                    let currencyCode: string | null = null;
                    for (const it of items) {
                      const unit =
                        it.finalUnitPrice != null
                          ? Number(it.finalUnitPrice)
                          : it.referencePrice != null
                          ? Number(it.referencePrice)
                          : NaN;
                      const qtyNum = Number(it.quantity);
                      if (!Number.isFinite(unit) || !Number.isFinite(qtyNum)) {
                        continue;
                      }
                      total += unit * qtyNum;
                      const cur = (it as any).currency || null;
                      if (cur) currencyCode = currencyCode || String(cur);
                    }
                    const hasTotal = Number.isFinite(total) && total > 0;
                    const formattedTotal = hasTotal
                      ? formatCurrency(total, currencyCode || null)
                      : "N/A";

                    const estimatedRaw =
                      data?.tenderEstimatedValue != null
                        ? String(data.tenderEstimatedValue)
                        : "";

                    const defaultCurrency =
                      (data as any)?.tenderEstimatedCurrency || currencyCode || "IQD";

                    const CURRENCY_OPTIONS = (Array.isArray(currencies)
                      ? currencies
                      :
                        [
                          { code: defaultCurrency, name: defaultCurrency },
                        ]).map((c: any) => String(c.code || "").trim()).filter((v, idx, arr) => v && arr.indexOf(v) === idx);

                    const currentCurrency = defaultCurrency;

                    return (
                      <>
                        <span style={{ fontWeight: 800 }}>Requisition grand total:</span>
                        <span>{formattedTotal}</span>
                        <span style={{ fontWeight: 800, marginLeft: 8 }}>
                          Tender estimated value:
                        </span>
                        <input
                          className="input"
                          style={{ maxWidth: 220 }}
                          type="text"
                          inputMode="decimal"
                          placeholder={hasTotal ? String(total) : ""}
                          value={tenderEstimatedValueInput}
                          disabled={!canEditPrep}
                          onChange={(e) => {
                            // Allow free typing; only strip illegal chars, no formatting here
                            const raw = e.target.value;
                            const cleaned = raw.replace(/[^0-9.,-]/g, "");
                            setTenderEstimatedValueInput(cleaned);
                          }}
                          onBlur={async (e) => {
                            const raw = e.target.value.trim();
                            const numericOnly = raw.replace(/[^0-9.-]/g, "");
                            const normalized = numericOnly.replace(/,/g, "");
                            const num =
                              normalized === "" || normalized === null
                                ? null
                                : Number(normalized);
                            try {
                              await apiPost(`/tenders/${params.id}/estimated-value`, {
                                estimatedValue: num,
                                currency: currentCurrency || null,
                              });
                              // Re-format the field after successful save using shared helper
                              if (num != null && Number.isFinite(num)) {
                                setTenderEstimatedValueInput(
                                  formatCurrency(Number(num), currentCurrency || null),
                                );
                              } else {
                                setTenderEstimatedValueInput("");
                              }
                              await load();
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error(err);
                            }
                          }}
                        />
                        <select
                          className="input"
                          style={{ maxWidth: 120 }}
                          value={currentCurrency}
                          disabled={!canEditPrep}
                          onChange={async (e) => {
                            const newCurrency = e.target.value || null;
                            try {
                              await apiPost(`/tenders/${params.id}/estimated-value`, {
                                estimatedValue:
                                  data?.tenderEstimatedValue != null
                                    ? Number(data.tenderEstimatedValue)
                                    : null,
                                currency: newCurrency,
                              });
                              await load();
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error(err);
                            }
                          }}
                        >
                          {CURRENCY_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </>
                    );
                  })()}
                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={savePrep}
                  disabled={!canEditPrep || acting === "save"}
                >
                  {acting === "save" ? "Saving…" : "Save preparation"}
                </button>
              </div>
            ) : (
              <p style={{ color: "var(--muted)" }}>No tender requisition copy available.</p>
            )}
          </div>

          {/* Original technical copy below, read-only */}
          <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Original technical copy</h3>
            {!originalCopy ? (
              <p style={{ color: "var(--muted)" }}>No tender requisition copy available.</p>
            ) : (
              <>
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontWeight: 800 }}>{originalCopy.title}</div>
                  {originalCopy.description && (
                    <p style={{ whiteSpace: "pre-wrap" }}>{originalCopy.description}</p>
                  )}
                </div>

                <table
                  width="100%"
                  cellPadding={6}
                  style={{ borderCollapse: "collapse", fontSize: 13 }}
                >
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th style={{ width: 40 }}>#</th>
                      <th style={{ width: 80 }}>Type</th>
                      <th>Description</th>
                      <th style={{ width: 80 }}>UOM</th>
                      <th style={{ width: 80 }}>Qty</th>
                      <th style={{ width: 110 }}>Unit price</th>
                      <th style={{ width: 110 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {originalCopy.items?.map((it: any, idx: number) => {
                      const unit =
                        it.finalUnitPrice != null
                          ? Number(it.finalUnitPrice)
                          : it.referencePrice != null
                          ? Number(it.referencePrice)
                          : NaN;
                      const qtyNum = Number(it.quantity);
                      const lineTotal =
                        Number.isFinite(unit) && Number.isFinite(qtyNum)
                          ? unit * qtyNum
                          : NaN;
                      const currency = (it as any).currency || (data as any)?.tenderEstimatedCurrency || "";

                      return (
                        <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td>{idx + 1}</td>
                          <td>{String(it.itemType || "MATERIAL").toUpperCase() === "SERVICE" ? "Service" : "Material"}</td>
                          <td>
                          <div style={{ fontWeight: 700 }}>{it.name}</div>
                          {it.technicalDescription && (
                            <div
                              style={{
                                whiteSpace: "pre-wrap",
                                color: "var(--muted)",
                                fontSize: 12,
                              }}
                            >
                              {it.technicalDescription}
                            </div>
                          )}
                        </td>
                        <td>{it.uom}</td>
                        <td>{it.quantity}</td>
                        <td>
                          {Number.isFinite(unit)
                            ? formatCurrency(unit, currency || null)
                            : ""}
                        </td>
                        <td>
                          {Number.isFinite(lineTotal)
                            ? formatCurrency(lineTotal, currency || null)
                            : ""}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>
                {/* Grand total for original technical copy */}
                {(() => {
                  const items: any[] = Array.isArray(originalCopy?.items)
                    ? (originalCopy as any).items
                    : [];
                  let total = 0;
                  let currencyCode: string | null = null;
                  for (const it of items) {
                    const unit =
                      it.finalUnitPrice != null
                        ? Number(it.finalUnitPrice)
                        : it.referencePrice != null
                        ? Number(it.referencePrice)
                        : NaN;
                    const qtyNum = Number(it.quantity);
                    if (!Number.isFinite(unit) || !Number.isFinite(qtyNum)) continue;
                    total += unit * qtyNum;
                    const cur = (it as any).currency || (data as any)?.tenderEstimatedCurrency || null;
                    if (cur) currencyCode = currencyCode || String(cur);
                  }
                  if (!Number.isFinite(total) || total <= 0) return null;
                  return (
                    <div style={{ marginTop: 8, fontWeight: 700, textAlign: "right" }}>
                      Grand total: {formatCurrency(total, currencyCode || null)}
                    </div>
                  );
                })()}
              </>
            )}
          </div>

          {/* Bill of Quantities (officer view, split by MATERIAL / SERVICE),
              driven by the mergedBoqItems (snapshot + prep overrides). */}
          {originalCopy && mergedBoqItems.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Bill of Quantities (preview)</h3>

              {renderBoqTable(
                "Bill of Quantities – Commodities (Materials)",
                "Total Price: Commodities",
                materialsBoq,
              )}

              {renderBoqTable(
                "Schedule of Quantities and Completion – Services related to the Contract",
                "Total Price: Associated Services",
                servicesBoq,
              )}
            </div>
          )}
        </>
      )}
      </InternalPage>
  );
}
