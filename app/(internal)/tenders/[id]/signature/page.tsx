"use client";

import { useEffect, useRef, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost, apiGetBlob } from "../../../../lib/api";
import { getCurrentUser } from "../../../../lib/authClient";

interface Props {
  params: { id: string };
}

export default function TenderSignaturePage({ params }: Props) {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const userId = (user as any)?.id ? Number((user as any).id) : NaN;
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isTenderOfficer = roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isTenderApproval = roles.includes("TENDER_APPROVAL") || isSysAdmin;

  const [form, setForm] = useState<any | null>(null);
  const [sigState, setSigState] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [localComment, setLocalComment] = useState<string>("");
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [f, s] = await Promise.all([
        apiGet(`/tenders/${params.id}/signature-form`),
        apiGet(`/tenders/${params.id}/signature-state`),
      ]);
      setForm(f || null);
      setSigState(s || null);

      // Initialize local comment from server if we don't already have a
      // locally-typed value. This keeps the textarea in sync with the
      // persisted document comment.
      const serverComment = typeof (f as any)?.comments === "string" ? (f as any).comments : "";
      if (!localComment && serverComment) {
        setLocalComment(serverComment);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load tender signature state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  // Load any locally-stored comment for this tender so it persists across reloads
  // in the same browser while still syncing the true source of truth from the DB.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const key = `tenderSigComment-${params.id}`;
      const stored = window.localStorage.getItem(key);
      if (stored != null && stored !== "") {
        setLocalComment(stored);
      }
    } catch {
      // ignore storage errors
    }
  }, [params.id]);

  const isOfficer =
    isTenderOfficer && Array.isArray(sigState?.officerAssignments);

  // Officer grid should be visible to both officers and the tender-approval
  // manager so the manager can review officer signatures before signing.
  const showOfficerGrid =
    Array.isArray(sigState?.officerAssignments) && (isOfficer || isTenderApproval);

  // Lock the comment as soon as any assigned officer has a signoff. If all
  // officer signoffs are cleared (while still in TENDER_PREP_APPROVED), the
  // comment becomes editable again.
  const officerIdsForLock = Array.isArray(sigState?.officerAssignments)
    ? sigState.officerAssignments
        .map((oa: any) => Number(oa.userId))
        .filter((n: any) => Number.isFinite(n))
    : [];
  const hasAnyOfficerSign = Array.isArray(sigState?.signoffs)
    ? sigState.signoffs.some(
        (s: any) =>
          officerIdsForLock.includes(Number(s.userId)) && s.signedAt,
      )
    : false;
  const commentLocked = hasAnyOfficerSign;

  const getCanvasCoords = (event: any) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX: number | null = null;
    let clientY: number | null = null;

    if (event.touches && event.touches[0]) {
      clientX = event.touches[0].clientX;
      clientY = event.touches[0].clientY;
    } else if (event.changedTouches && event.changedTouches[0]) {
      clientX = event.changedTouches[0].clientX;
      clientY = event.changedTouches[0].clientY;
    } else if (
      typeof event.clientX === "number" &&
      typeof event.clientY === "number"
    ) {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    if (clientX == null || clientY == null) return null;

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleSignaturePointerDown = (event: any) => {
    if (!signatureCanvasRef.current) return;
    const pt = getCanvasCoords(event);
    if (!pt) return;
    event.preventDefault?.();

    const ctx = signatureCanvasRef.current.getContext("2d");
    if (!ctx) return;

    isDrawingRef.current = true;
    lastPointRef.current = pt;

    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
  };

  const handleSignaturePointerMove = (event: any) => {
    if (!isDrawingRef.current || !signatureCanvasRef.current) return;
    const pt = getCanvasCoords(event);
    if (!pt) return;
    event.preventDefault?.();

    const ctx = signatureCanvasRef.current.getContext("2d");
    if (!ctx) return;

    const last = lastPointRef.current || pt;
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.stroke();

    lastPointRef.current = pt;
  };

  const handleSignaturePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const clearSignatureCanvas = () => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleOfficerSign = async () => {
    setError("");
    try {
      await apiPost(`/tenders/${params.id}/signoffs/officer-sign`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to sign as officer");
    }
  };

  const handleOfficerUnsign = async () => {
    setError("");
    try {
      await apiPost(`/tenders/${params.id}/signoffs/officer-un-sign`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to clear officer signature");
    }
  };

  const handleManagerSign = async () => {
    setError("");
    try {
      let signatureData: string | null = null;
      if (signatureCanvasRef.current) {
        try {
          signatureData = signatureCanvasRef.current.toDataURL("image/png");
        } catch {
          signatureData = null;
        }
      }
      await apiPost(`/tenders/${params.id}/signoffs/manager-sign`, {
        signatureData,
        signatureType: "DRAWN",
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to sign as manager");
    }
  };

  const handleManagerClear = async () => {
    setError("");
    try {
      clearSignatureCanvas();
      await apiPost(`/tenders/${params.id}/signoffs/manager-un-sign`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to clear manager signature");
    }
  };

  const handleManagerSubmit = async () => {
    setError("");
    try {
      await apiPost(`/tenders/${params.id}/signoffs/manager-submit`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to submit as manager");
    }
  };

  return (
    <RequireRoles
      anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title="Tender signature"
    >
      <InternalPage title="Tender signature" pageId="TENSIGFORM">
        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : !form || !sigState ? (
          <p style={{ color: "var(--muted)" }}>
            No signature information available for this tender.
          </p>
        ) : (
          <>
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="pill">Status: {form.status}</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  type="button"
                  onClick={load}
                  disabled={loading}
                >
                  Refresh
                </button>
                <button
                  className="btn"
                  type="button"
                  onClick={async () => {
                    if (typeof window === "undefined") return;
                    try {
                      const blob = await apiGetBlob(
                        `/tenders/${params.id}/signature-letter.pdf`,
                      );
                      const url = URL.createObjectURL(blob);
                      window.open(url, "_blank");
                    } catch (e: any) {
                      setError(e?.message || "Failed to generate PDF");
                    }
                  }}
                >
                  Print (PDF)
                </button>
              </div>
            </div>

            {/* Info + comments + signatures */}
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Tender approval letter</h3>
              <p style={{ color: "var(--muted)", fontSize: 13 }}>
                This is the tender approval/signature form. All tender data is
                read-only; only the signature buttons below are active.
              </p>

              {/* Summary block */}
              <div style={{ marginBottom: 12 }}>
                <div><strong>Tender ID:</strong> TEN-{form.tenderNumber?.toString().padStart(5, '0')}</div>
                <div><strong>Requisition ID:</strong> {form.requisitionId}</div>
                <div><strong>Department:</strong> {form.department || ""}</div>
                <div><strong>Purpose:</strong> {form.purpose || ""}</div>
                <div><strong>Manager:</strong> {form.managerName || ""}</div>
              </div>

              {/* Comments / justification */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  Comments / justification
                </div>
                <textarea
                  className="input"
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                  placeholder="Optional comment before signing…"
                  value={localComment}
                  disabled={commentLocked}
                  onChange={(e) => {
                    const next = e.target.value;
                    setLocalComment(next);
                    if (typeof window !== "undefined") {
                      try {
                        const key = `tenderSigComment-${params.id}`;
                        window.localStorage.setItem(key, next);
                      } catch {
                        // ignore storage errors
                      }
                    }
                  }}
                  onBlur={async () => {
                    try {
                      await apiPost(`/tenders/${params.id}/signature-form/comment`, {
                        comment: localComment || null,
                      });
                    } catch (e: any) {
                      setError(e?.message || "Failed to save comment");
                    }
                  }}
                />
              </div>

            </div>

            {/* BoQ tables (materials + services) – mirror tender prep 8-column layout */}
            <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>Items and prices – Materials</h3>
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
                  {(form.materials || []).map((it: any) => (
                    <tr
                      key={`mat-${it.index}`}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td>{it.index}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{it.description}</div>
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
                  {(!form.materials || form.materials.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{ color: "var(--muted)" }}>
                        No material items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h3 style={{ marginTop: 24 }}>Items and prices – Services</h3>
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
                  {(form.services || []).map((it: any) => (
                    <tr
                      key={`srv-${it.index}`}
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <td>{it.index}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{it.description}</div>
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
                  {(!form.services || form.services.length === 0) && (
                    <tr>
                      <td colSpan={8} style={{ color: "var(--muted)" }}>
                        No service items.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Officer signatures – up to 4 cards, following requisition pattern */}
            <div className="card" style={{ boxShadow: "none", marginTop: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {showOfficerGrid && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    {(sigState.officerAssignments || [])
                      .slice(0, 4)
                      .map((oa: any, idx: number) => {
                        const assignment = oa;
                        const key = assignment
                          ? `officer-${assignment.userId}`
                          : `officer-${idx}`;
                        const isCurrentOfficer =
                          assignment &&
                          Number(assignment.userId) === Number(userId) &&
                          isOfficer;
                        const sign = (sigState.signoffs || []).find(
                          (s: any) =>
                            String(s.userId) === String(assignment?.userId),
                        );
                        const signed = !!sign?.signedAt;
                        const signedLabel = signed
                          ? `Signed at ${new Date(
                              sign.signedAt,
                            ).toLocaleString()}`
                          : isCurrentOfficer
                          ? "Not signed"
                          : "Awaiting signature";

                        const handleSignClick = async () => {
                          if (!isCurrentOfficer) return;
                          setError("");
                          try {
                            let signatureData: string | null = null;
                            if (signatureCanvasRef.current) {
                              try {
                                signatureData =
                                  signatureCanvasRef.current.toDataURL(
                                    "image/png",
                                  );
                              } catch {
                                signatureData = null;
                              }
                            }
                            await apiPost(
                              `/tenders/${params.id}/signoffs/officer-sign`,
                              {
                                signatureData,
                                signatureType: "DRAWN",
                              },
                            );
                            // Clear local drawing after successful sign
                            clearSignatureCanvas();
                            await load();
                          } catch (e: any) {
                            setError(e?.message || "Failed to sign as officer");
                          }
                        };

                        const handleClearClick = async () => {
                          if (!isCurrentOfficer) return;
                          setError("");
                          try {
                            clearSignatureCanvas();
                            await apiPost(
                              `/tenders/${params.id}/signoffs/officer-un-sign`,
                              {},
                            );
                            await load();
                          } catch (e: any) {
                            setError(
                              e?.message || "Failed to clear officer signature",
                            );
                          }
                        };

                        return (
                          <div
                            key={key}
                            style={{
                              border: "1px solid #e5e7eb",
                              borderRadius: 8,
                              padding: 8,
                              minHeight: 120,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ fontWeight: 600 }}>
                              {assignment?.user?.fullName ||
                                assignment?.user?.email ||
                                "Officer"}
                            </div>

                            <div style={{ marginTop: 8 }}>
                              {isCurrentOfficer ? (
                                sign?.signatureData ? (
                                  <div
                                    style={{
                                      border: "1px dashed #d1d5db",
                                      borderRadius: 6,
                                      height: 64,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      backgroundColor: "#f9fafb",
                                    }}
                                  >
                                    <img
                                      src={sign.signatureData}
                                      alt="Signature"
                                      style={{
                                        maxHeight: 56,
                                        maxWidth: "100%",
                                        objectFit: "contain",
                                        borderRadius: 4,
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <canvas
                                    ref={signatureCanvasRef}
                                    width={260}
                                    height={80}
                                    style={{
                                      border: "1px dashed #d1d5db",
                                      borderRadius: 6,
                                      width: "100%",
                                      height: 64,
                                      backgroundColor: "#f9fafb",
                                      cursor: "crosshair",
                                    }}
                                    onMouseDown={handleSignaturePointerDown}
                                    onMouseMove={handleSignaturePointerMove}
                                    onMouseUp={handleSignaturePointerUp}
                                    onMouseLeave={handleSignaturePointerUp}
                                    onTouchStart={handleSignaturePointerDown}
                                    onTouchMove={handleSignaturePointerMove}
                                    onTouchEnd={handleSignaturePointerUp}
                                  />
                                )
                              ) : sign?.signatureData ? (
                                <div
                                  style={{
                                    border: "1px dashed #d1d5db",
                                    borderRadius: 6,
                                    height: 64,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: "#f9fafb",
                                  }}
                                >
                                  <img
                                    src={sign.signatureData}
                                    alt="Signature"
                                    style={{
                                      maxHeight: 56,
                                      maxWidth: "100%",
                                      objectFit: "contain",
                                      borderRadius: 4,
                                    }}
                                  />
                                </div>
                              ) : signed ? (
                                <div
                                  style={{
                                    border: "1px dashed #d1d5db",
                                    borderRadius: 6,
                                    height: 48,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    color: "#4b5563",
                                    backgroundColor: "#f9fafb",
                                  }}
                                >
                                  Signed
                                </div>
                              ) : (
                                <div
                                  style={{
                                    border: "1px dashed #d1d5db",
                                    borderRadius: 6,
                                    height: 48,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 11,
                                    color: "#9ca3af",
                                    backgroundColor: "#f9fafb",
                                  }}
                                >
                                  Signature area
                                </div>
                              )}
                            </div>

                            <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
                              <button
                                type="button"
                                className="btn"
                                style={{
                                  flex: 1,
                                  padding: "0.15rem 0.4rem",
                                  fontSize: 11,
                                  opacity: isCurrentOfficer ? 1 : 0.4,
                                  cursor: isCurrentOfficer
                                    ? "pointer"
                                    : "default",
                                }}
                                disabled={!isCurrentOfficer}
                                onClick={handleClearClick}
                              >
                                Clear / redo
                              </button>
                              <button
                                type="button"
                                className="btn btn-primary"
                                style={{
                                  flex: 1,
                                  padding: "0.15rem 0.4rem",
                                  fontSize: 11,
                                  opacity: isCurrentOfficer && !signed ? 1 : 0.4,
                                  cursor:
                                    isCurrentOfficer && !signed
                                      ? "pointer"
                                      : "default",
                                }}
                                disabled={!isCurrentOfficer || signed}
                                onClick={handleSignClick}
                              >
                                {signed ? "Signed" : "Sign"}
                              </button>
                            </div>

                            <div style={{ marginTop: 4, color: "#6b7280" }}>
                              {signedLabel}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
                {(isTenderApproval || form.managerSignature) && (
                  <div style={{ marginTop: 16, maxWidth: 320 }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {form.managerSignature?.fullName || form.managerName || "Manager"}
                    </div>
                    <div style={{ marginBottom: 4 }}>
                      {form.managerSignature && form.managerSignature.signatureData ? (
                        <div
                          style={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 6,
                            height: 64,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          <img
                            src={form.managerSignature.signatureData}
                            alt="Manager signature"
                            style={{
                              maxHeight: 56,
                              maxWidth: "100%",
                              objectFit: "contain",
                              borderRadius: 4,
                            }}
                          />
                        </div>
                      ) : isTenderApproval ? (
                        <canvas
                          ref={signatureCanvasRef}
                          width={260}
                          height={80}
                          style={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 6,
                            width: "100%",
                            height: 64,
                            backgroundColor: "#f9fafb",
                            cursor: "crosshair",
                          }}
                          onMouseDown={handleSignaturePointerDown}
                          onMouseMove={handleSignaturePointerMove}
                          onMouseUp={handleSignaturePointerUp}
                          onMouseLeave={handleSignaturePointerUp}
                          onTouchStart={handleSignaturePointerDown}
                          onTouchMove={handleSignaturePointerMove}
                          onTouchEnd={handleSignaturePointerUp}
                        />
                      ) : (
                        <div
                          style={{
                            border: "1px dashed #d1d5db",
                            borderRadius: 6,
                            height: 48,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            color: "#9ca3af",
                            backgroundColor: "#f9fafb",
                          }}
                        >
                          Pending manager signature
                        </div>
                      )}
                    </div>
                    {isTenderApproval && (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleManagerClear}
                          disabled={!form.managerSignature}
                          style={{
                            flex: 1,
                            padding: "0.15rem 0.4rem",
                            fontSize: 11,
                            opacity: form.managerSignature ? 1 : 0.4,
                            cursor: form.managerSignature ? "pointer" : "default",
                          }}
                        >
                          Clear / redo
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleManagerSign}
                          disabled={!!form.managerSignature}
                          style={{
                            flex: 1,
                            padding: "0.15rem 0.4rem",
                            fontSize: 11,
                            opacity: form.managerSignature ? 0.4 : 1,
                            cursor: form.managerSignature ? "default" : "pointer",
                          }}
                        >
                          Sign as manager
                        </button>
                        <button
                          type="button"
                          className="btn btn-submit"
                          onClick={handleManagerSubmit}
                          disabled={!form.managerSignature}
                          style={{
                            flex: 1,
                            padding: "0.15rem 0.4rem",
                            fontSize: 11,
                            opacity: form.managerSignature ? 1 : 0.4,
                            cursor: form.managerSignature ? "pointer" : "default",
                          }}
                        >
                          Submit
                        </button>
                      </div>
                    )}
                    {form.managerSignature && (
                      <div
                        style={{
                          marginTop: 4,
                          color: "#6b7280",
                          fontSize: 11,
                        }}
                      >
                        {form.managerSignature.fullName || form.managerName || "Manager"}
                        {" — "}
                        {form.managerSignature.signedAt
                          ? `Signed at ${new Date(
                              form.managerSignature.signedAt,
                            ).toLocaleString()}`
                          : "Signature captured"}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </InternalPage>
    </RequireRoles>
  );
}
