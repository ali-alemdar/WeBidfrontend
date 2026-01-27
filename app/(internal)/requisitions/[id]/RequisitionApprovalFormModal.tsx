"use client";

import { Dispatch, SetStateAction, MutableRefObject } from "react";
import { apiGet, apiPost } from "../../../lib/api";

interface Props {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  data: any;
  items: any[];
  approvalLines: any[];
  userId: number;
  isOfficer: boolean;
  isManager: boolean;
  approvalComment: string;
  setApprovalComment: Dispatch<SetStateAction<string>>;
  approvalCommentRef: MutableRefObject<HTMLTextAreaElement | null>;
  approvalError: string;
  setApprovalError: Dispatch<SetStateAction<string>>;
  approvalSignatures: Record<string, { signed: boolean }>;
  setApprovalSignatures: Dispatch<SetStateAction<Record<string, { signed: boolean }>>>;
  approvalRawSignatures: any[];
  setApprovalRawSignatures: Dispatch<SetStateAction<any[]>>;
  approvalLoading: boolean;
  setApprovalLoading: Dispatch<SetStateAction<boolean>>;
  APPROVAL_COMMENT_LIMIT: number;
  signatureCanvasRef: MutableRefObject<HTMLCanvasElement | null>;
  clearSignatureCanvas: () => void;
  handleSignaturePointerDown: (event: any) => void;
  handleSignaturePointerMove: (event: any) => void;
  handleSignaturePointerUp: () => void;
}

function isoDateInput(v: any) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function RequisitionApprovalFormModal(props: Props) {
  const {
    open,
    onClose,
    onPrint,
    data,
    items,
    approvalLines,
    userId,
    isOfficer,
    isManager,
    approvalComment,
    setApprovalComment,
    approvalCommentRef,
    approvalError,
    setApprovalError,
    approvalSignatures,
    setApprovalSignatures,
    approvalRawSignatures,
    setApprovalRawSignatures,
    approvalLoading,
    setApprovalLoading,
    APPROVAL_COMMENT_LIMIT,
    signatureCanvasRef,
    clearSignatureCanvas,
    handleSignaturePointerDown,
    handleSignaturePointerMove,
    handleSignaturePointerUp,
  } = props;

  const loadApprovalForm = async () => {
    try {
      setApprovalError("");
      setApprovalLoading(true);
      const res: any = await apiGet(`/requisitions/${data.id}/approval-form`);
      const loadedComment = typeof res?.comment === "string" ? res.comment : "";
      setApprovalComment(loadedComment.slice(0, APPROVAL_COMMENT_LIMIT));
      const rawSigs: any[] = Array.isArray(res?.signatures) ? res.signatures : [];
      setApprovalRawSignatures(rawSigs);

      const sigs: Record<string, { signed: boolean }> = {};
      rawSigs.forEach((s: any) => {
        const role = String(s.role || "").toUpperCase();
        let key: string;
        if (role === "OFFICER") {
          key = `officer-${s.userId}`;
        } else if (role === "MANAGER") {
          key = `manager-${s.userId}`;
        } else {
          key = `user-${s.userId}-${role}`;
        }
        sigs[key] = { signed: !!s.signedAt };
      });
      setApprovalSignatures(sigs);
    } catch (e: any) {
      setApprovalError(e?.message || "Failed to load approval form");
    } finally {
      setApprovalLoading(false);
    }
  };

  if (!approvalLoading && open && !approvalComment && Object.keys(approvalSignatures || {}).length === 0) {
    // Fire and forget; React will re-render after state updates
    loadApprovalForm();
  }

  const values = Object.values(approvalSignatures || {});
  const hasAnySignature = values.some((v) => v.signed);
  const allCleared = values.length > 0 && values.every((v) => !v.signed);
  const commentLocked = hasAnySignature && !allCleared;

  const managerSigned =
    Array.isArray(approvalRawSignatures) &&
    approvalRawSignatures.some(
      (s: any) =>
        String(s.role || "").toUpperCase() === "MANAGER" && s.signedAt,
    );

  const formatDateTime = (v: any) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      // Local date/time, explicit format: YYYY-MM-DD HH:MM
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day} ${hours}:${mins}`;
    } catch {
      return "";
    }
  };

  // Try to determine the manager's userId so we can avoid rendering
  // them again in the officer slots.
  const managerUserId: number | null = (() => {
    const m: any = data.manager || {};
    if (m.userId != null) return Number(m.userId);
    if (m.id != null) return Number(m.id);
    if ((data as any).managerId != null) return Number((data as any).managerId);
    return null;
  })();

  // Officer signature slots should not include the manager again if the
  // manager user is also listed in officerAssignments.
  const officerAssignments: any[] = Array.isArray(data.officerAssignments)
    ? data.officerAssignments.filter((oa: any) =>
        managerUserId != null ? Number(oa.userId) !== managerUserId : true,
      )
    : [];

  const allOfficersSigned =
    officerAssignments.length > 0 &&
    officerAssignments.every((oa: any) =>
      Array.isArray(approvalRawSignatures)
        ? approvalRawSignatures.some(
            (s: any) =>
              Number(s.userId) === Number(oa.userId) &&
              String(s.role || '').toUpperCase() === 'OFFICER' &&
              s.signedAt,
          )
        : false,
    );

  if (!open) return null;

  return (
    <div
      style={{
        background: "#fff",
        padding: 24,
        borderRadius: 12,
        maxWidth: 820,
        margin: "0 auto",
        boxShadow: "0 0 0 1px rgba(0,0,0,0.06)",
      }}
    >
      <div
        style={{
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 12,
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Company name (logo)</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>Requisition approval form</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280" }}>
          <div>Requisition #{data.id}</div>
          <div>{data.requestingDepartment}</div>
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Subject</div>
        <div>{data.title}</div>
      </div>

      {approvalError && (
        <div style={{ color: "#b91c1c", marginBottom: 8, fontSize: 12 }}>
          {approvalError}
        </div>
      )}

      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Comments / justification</div>
        <textarea
          ref={approvalCommentRef}
          value={approvalComment}
          maxLength={APPROVAL_COMMENT_LIMIT}
          onChange={(e) => {
            const raw = e.target.value || "";
            const next =
              raw.length > APPROVAL_COMMENT_LIMIT
                ? raw.slice(0, APPROVAL_COMMENT_LIMIT)
                : raw;
            setApprovalComment(next);
          }}
          onBlur={async () => {
            try {
              // Before saving, re-check on the server whether any
              // signatures already exist. This protects against the
              // case where another officer signed while this user was
              // typing with the modal already open.
              const latest: any = await apiGet(
                `/requisitions/${data.id}/approval-form`,
              );
              const latestSigs: any[] = Array.isArray(latest?.signatures)
                ? latest.signatures
                : [];
              const someoneSigned = latestSigs.some(
                (s: any) => s && s.signedAt,
              );

              if (someoneSigned) {
                // Do not save. Show a warning and reset the text to the
                // latest server comment so the user understands their
                // local changes are not persisted.
                const latestComment =
                  typeof latest?.comment === "string" ? latest.comment : "";
                setApprovalComment(
                  latestComment.slice(0, APPROVAL_COMMENT_LIMIT),
                );
                setApprovalError(
                  "Another approver has already signed. The comment is locked and your changes were not saved.",
                );
                // Also update signatures state so the UI reflects
                // the locked state immediately.
                const sigs: Record<string, { signed: boolean }> = {};
                latestSigs.forEach((s: any) => {
                  const role = String(s.role || "").toUpperCase();
                  let key: string;
                  if (role === "OFFICER") {
                    key = `officer-${s.userId}`;
                  } else if (role === "MANAGER") {
                    key = `manager-${s.userId}`;
                  } else {
                    key = `user-${s.userId}-${role}`;
                  }
                  sigs[key] = { signed: !!s.signedAt };
                });
                setApprovalSignatures(sigs);
                setApprovalRawSignatures(latestSigs);
                return;
              }

              // No signatures yet – proceed with normal save.
              setApprovalError("");
              await apiPost(`/requisitions/${data.id}/approval-form/comment`, {
                comment: approvalComment || null,
              });
            } catch (e: any) {
              setApprovalError(e?.message || "Failed to save comment");
            }
          }}
          disabled={commentLocked}
          placeholder="Enter any notes or justification before signatures are added. Once someone signs, this text is locked."
          style={{
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 8,
            width: "100%",
            minHeight: 120,
            fontSize: 13,
            backgroundColor: commentLocked ? "#f9fafb" : "#ffffff",
            resize: "vertical",
            overflowY: "auto",
          }}
        />
        {commentLocked && (
          <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
            Comment locked – clear all signatures to edit again (until
            manager signs in the real flow).
          </div>
        )}
        <div
          style={{
            marginTop: 4,
            fontSize: 11,
            color: "#6b7280",
            textAlign: "right",
          }}
        >
          {approvalComment.length}/{APPROVAL_COMMENT_LIMIT} characters
        </div>
      </div>

      <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
        <p>
          This form summarizes the approved requisition, including items and
          final prices.
        </p>
        <p>
          It is used for internal authorization before proceeding to
          tendering or direct purchase.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1.2fr",
          gap: 12,
          fontSize: 13,
        }}
      >
        <div>
          <div>
            <strong>Requester:</strong>{" "}
            {data.createdBy?.fullName || data.createdBy?.email}
          </div>
          <div>
            <strong>Department:</strong> {data.requestingDepartment}
          </div>
          <div>
            <strong>Purpose:</strong> {data.purpose}
          </div>
        </div>
        <div>
          <div>
            <strong>Manager:</strong>{" "}
            {data.manager?.fullName || "(Not assigned)"}
          </div>
          <div>
            <strong>Created at:</strong> {isoDateInput(data.createdAt)}
          </div>
          <div>
            <strong>Status:</strong> {data.status}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Items and prices</div>
        <table
          width="100%"
          cellPadding={6}
          style={{ borderCollapse: "collapse", fontSize: 12 }}
        >
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
              <th>#</th>
              <th>Type</th>
              <th>Description</th>
              <th>UOM</th>
              <th style={{ textAlign: "right" }}>Qty</th>
              <th style={{ textAlign: "right" }}>Unit price</th>
              <th style={{ textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const hasApprovalLines = Array.isArray(approvalLines) && approvalLines.length > 0;
              const rows = hasApprovalLines ? approvalLines : items;

              let grandTotal = 0;
              let currency: string | null = null;

              const rendered = rows.map((row: any) => {
                const isFromApproval = hasApprovalLines;
                const itemNo = isFromApproval ? row.itemNo ?? row.requisitionItemId : row.itemNo ?? row.id;
                const type = isFromApproval ? row.itemType || "" : row.itemType || "";
                const desc = isFromApproval
                  ? row.description
                  : row.technicalDescription || row.name;
                const uom = isFromApproval ? row.uom : row.uom;
                const qty = Number(isFromApproval ? row.quantity : row.quantity);
                const unit = Number(isFromApproval ? row.unitPrice : NaN);
                const rowCurrency = isFromApproval ? (row.currency || null) : null;
                const total = isFromApproval ? Number(row.total) : NaN;

                if (isFromApproval && Number.isFinite(qty) && Number.isFinite(unit)) {
                  const lineTotal = Number.isFinite(total) ? total : qty * unit;
                  grandTotal += lineTotal;
                  if (rowCurrency) {
                    currency = currency || String(rowCurrency);
                  }
                }

                return (
                  <tr key={isFromApproval ? `${row.requisitionItemId}` : `${row.id}`} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td>{itemNo}</td>
                    <td>{type}</td>
                    <td>{desc}</td>
                    <td>{uom}</td>
                    <td style={{ textAlign: "right" }}>{Number.isFinite(qty) ? qty : ""}</td>
                    <td style={{ textAlign: "right" }}>
                      {isFromApproval && Number.isFinite(unit)
                        ? unit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : ""}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {isFromApproval && Number.isFinite(total)
                        ? total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : ""}
                    </td>
                  </tr>
                );
              });

              if (rendered.length === 0) {
                return (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ color: "#9ca3af", fontStyle: "italic" }}
                    >
                      No items.
                    </td>
                  </tr>
                );
              }

              // Append grand-total row only when we have approval lines with prices.
              if (Array.isArray(approvalLines) && approvalLines.length > 0) {
                rendered.push(
                  <tr key="grand-total" style={{ borderTop: "2px solid #e5e7eb", fontWeight: 600 }}>
                    <td colSpan={6} style={{ textAlign: "right" }}>
                      Grand total
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {currency ? `${currency} ` : ""}
                      {grandTotal.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>,
                );
              }

              return rendered;
            })()}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Signatures</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 12,
            fontSize: 12,
          }}
        >
          {(officerAssignments.length > 0
            ? officerAssignments
            : [null, null, null, null]
          )
            .slice(0, 4)
            .map((oa: any, idx: number) => {
              const key = oa ? `officer-${oa.userId}` : `officer-${idx}`;
              const state = approvalSignatures[key] || { signed: false };
              const officerSigned = !!state.signed;

              const isCurrentOfficer =
                oa && Number(oa.userId) === userId && isOfficer;

              const officerSignature =
                oa && Array.isArray(approvalRawSignatures)
                  ? approvalRawSignatures.find(
                      (s: any) =>
                        Number(s.userId) === Number(oa.userId) &&
                        String(s.role || "").toUpperCase() === "OFFICER",
                    )
                  : null;

              const handleSave = async () => {
                if (!isCurrentOfficer) return;
                if (officerSigned) return;
                try {
                  setApprovalError("");

                  let signatureData: string | null = null;
                  if (signatureCanvasRef.current) {
                    try {
                      signatureData =
                        signatureCanvasRef.current.toDataURL("image/png");
                    } catch {
                      signatureData = null;
                    }
                  }

                  await apiPost(
                    `/requisitions/${data.id}/approval-form/sign`,
                    {
                      role: "OFFICER",
                      signatureData,
                      signatureType: "DRAWN",
                    },
                  );
                  await loadApprovalForm();
                } catch (e: any) {
                  setApprovalError(e?.message || "Failed to save signature");
                }
              };

              const handleClear = async () => {
                if (!isCurrentOfficer) return;
                if (managerSigned) {
                  setApprovalError(
                    "Manager has already signed. Officer signatures cannot be cleared.",
                  );
                  return;
                }
                try {
                  setApprovalError("");
                  clearSignatureCanvas();
                  await apiPost(
                    `/requisitions/${data.id}/approval-form/un-sign`,
                    {},
                  );
                  await loadApprovalForm();
                } catch (e: any) {
                  setApprovalError(e?.message || "Failed to clear signature");
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
                    {oa?.user?.fullName || oa?.user?.email || "Officer"}
                  </div>

                  <div style={{ marginTop: 8 }}>
                    {isCurrentOfficer ? (
                      officerSignature?.signatureData ? (
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
                            src={officerSignature.signatureData}
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
                    ) : officerSignature?.signatureData ? (
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
                          src={officerSignature.signatureData}
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
                        cursor: isCurrentOfficer ? "pointer" : "default",
                      }}
                      onClick={handleClear}
                      disabled={!isCurrentOfficer}
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: "0.15rem 0.4rem",
                        fontSize: 11,
                        opacity: isCurrentOfficer && !officerSigned ? 1 : 0.4,
                        cursor:
                          isCurrentOfficer && !officerSigned
                            ? "pointer"
                            : "default",
                      }}
                      onClick={handleSave}
                      disabled={!isCurrentOfficer || officerSigned}
                    >
                      {state.signed ? "Saved" : "Save"}
                    </button>
                  </div>

                  <div style={{ marginTop: 4, color: "#6b7280", fontSize: 11 }}>
                    {state.signed
                      ? "Signed"
                      : isCurrentOfficer
                      ? "Not signed"
                      : "Awaiting signature"}
                    {officerSignature?.signedAt && (
                      <div>
                        Signed at: {formatDateTime(officerSignature.signedAt)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              padding: 8,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
              maxWidth: 320,
              width: "100%",
            }}
          >
            <div style={{ fontWeight: 600 }}>Manager signature</div>
            <div
              style={{
                marginTop: 4,
                border: "1px dashed #d1d5db",
                borderRadius: 6,
                height: 52,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                color: "#9ca3af",
                backgroundColor: "#f9fafb",
              }}
            >
              {(() => {
                const managerSig = Array.isArray(approvalRawSignatures)
                  ? approvalRawSignatures.find(
                      (s: any) =>
                        String(s.role || "").toUpperCase() === "MANAGER",
                    )
                  : null;

                // If manager already signed, always show the image.
                if (managerSig?.signatureData) {
                  return (
                    <img
                      src={managerSig.signatureData}
                      alt="Manager signature"
                      style={{
                        maxHeight: 56,
                        maxWidth: "100%",
                        objectFit: "contain",
                        borderRadius: 4,
                      }}
                    />
                  );
                }

                // If officers have not all signed yet, show an informational
                // message instead of the signature canvas.
                if (!allOfficersSigned) {
                  return 'All assigned officers must sign before the manager can sign.';
                }

                // If current user is manager and no signature yet, show canvas.
                if (isManager) {
                  return (
                    <canvas
                      ref={signatureCanvasRef}
                      width={240}
                      height={70}
                      style={{
                        border: "1px dashed #d1d5db",
                        borderRadius: 6,
                        width: "100%",
                        height: 52,
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
                  );
                }

                // Non-manager and no signature yet: placeholder.
                return "Signature area";
              })()}
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
              <button
                type="button"
                className="btn"
                style={{ flex: 1, padding: "0.15rem 0.4rem", fontSize: 11 }}
                disabled={!isManager}
                onClick={async () => {
                  if (!isManager) return;
                  if (!confirm("Clear your manager signature so you can re-sign?")) return;
                  try {
                    setApprovalError("");
                    clearSignatureCanvas();
                    // Backend un-sign uses current user, so this clears
                    // only the manager's own signature.
                    await apiPost(
                      `/requisitions/${data.id}/approval-form/un-sign`,
                      {},
                    );
                    await loadApprovalForm();
                  } catch (e: any) {
                    setApprovalError(
                      e?.message || "Failed to clear manager signature",
                    );
                  }
                }}
              >
                Clear / redo
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, padding: "0.15rem 0.4rem", fontSize: 11 }}
                onClick={async () => {
                  // Extra guard: if already signed, do nothing.
                  if (!isManager) return;
                  if (managerSigned) return;
                  if (!allOfficersSigned) return;
                  try {
                    setApprovalError("");

                    let signatureData: string | null = null;
                    if (signatureCanvasRef.current) {
                      try {
                        signatureData =
                          signatureCanvasRef.current.toDataURL("image/png");
                      } catch {
                        signatureData = null;
                      }
                    }

                    await apiPost(`/requisitions/${data.id}/approval-form/sign`, {
                      role: "MANAGER",
                      signatureData,
                      signatureType: "DRAWN",
                    });
                    await loadApprovalForm();
                  } catch (e: any) {
                    setApprovalError(
                      e?.message || "Failed to save manager signature",
                    );
                  }
                }}
                disabled={!isManager || managerSigned || !allOfficersSigned}
              >
                Sign as manager
              </button>
            </div>
            <div style={{ marginTop: 6, display: "flex", gap: 4 }}>
              <button
                type="button"
                className="btn btn-submit"
                style={{ flex: 1, padding: "0.15rem 0.4rem", fontSize: 11 }}
                disabled={!isManager || !managerSigned}
                onClick={async () => {
                  if (!isManager || !managerSigned) return;
                  try {
                    setApprovalError("");
                    await apiPost(
                      `/requisitions/${data.id}/approval-form/submit`,
                      {},
                    );
                  } catch (e: any) {
                    setApprovalError(
                      e?.message ||
                        "Failed to submit approval form for tender readiness",
                    );
                  }
                }}
              >
                Submit (set as tender ready)
              </button>
            </div>
            <div style={{ marginTop: 4, color: "#6b7280", fontSize: 11 }}>
              {managerSigned ? "Signed" : "Not signed"}
              {(() => {
                const managerSig = Array.isArray(approvalRawSignatures)
                  ? approvalRawSignatures.find(
                      (s: any) =>
                        String(s.role || "").toUpperCase() === "MANAGER" && s.signedAt,
                    )
                  : null;
                return managerSig?.signedAt ? (
                  <div>Signed at: {formatDateTime(managerSig.signedAt)}</div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
