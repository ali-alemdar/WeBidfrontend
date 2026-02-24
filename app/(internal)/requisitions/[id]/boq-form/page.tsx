"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import InternalPage from "../../../../components/InternalPage";
import BackButton from "../../../../components/BackButton";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../../lib/api";
import { getCurrentUser } from "../../../../lib/authClient";

interface Props {
  params: { id: string };
}

interface Officer {
  userId: number;
  fullName: string;
  email: string;
  isLead: boolean;
  hasSigned: boolean;
}

interface Manager {
  id: number;
  fullName: string;
  email: string;
}

interface BoqSignature {
  userId: number;
  fullName: string;
  role: string;
  signatureData: string | null;
  signedAt: string | null;
}

function formatAmount(value: number, currency?: string) {
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return currency ? `${currency} ${formatted}` : formatted;
}

function formatDate(date: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function formatDateTime(date: string | Date | null) {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export default function BoqFormPage({ params }: Props) {
  const user = getCurrentUser();
  const currentUserId = user ? Number(user.id) : NaN;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [officerNotes, setOfficerNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet(`/requisitions/${params.id}/boq-form`);
      setData(res);
      setOfficerNotes(res?.requisition?.boqOfficerNotes || "");
    } catch (e: any) {
      setError(e?.message || "Failed to load BoQ form");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const title = `Bill of Quantities / Requisition ${params.id}`;

  if (loading) {
    return (
      <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
        <InternalPage title={title}>
          <p>Loading…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (error || !data) {
    return (
      <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
        <InternalPage title={title}>
          <BackButton fallbackHref={`/requisitions/${params.id}/view`} />
          <p style={{ color: "#b91c1c", marginTop: 12 }}>{error || "Not found"}</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  const { tenant, requisition, officers, boqSignatures, materials, services, currency } = data;
  const manager: Manager | null = requisition?.manager || null;
  const sigs = (boqSignatures || []) as BoqSignature[];

  // Check if all officers have signed in BoQ
  const officerIds = ((officers || []) as Officer[]).map((o) => o.userId);
  const officerSigs = sigs.filter((s) => s.role === "OFFICER" && officerIds.includes(s.userId));
  const allOfficersSigned = officerIds.length > 0 && officerSigs.length >= officerIds.length;

  // Check if current user can sign
  const isOfficer = officerIds.includes(currentUserId);
  const isManager = manager && manager.id === currentUserId;
  const hasCurrentUserSigned = sigs.some((s) => s.userId === currentUserId);
  const canManagerSign = isManager && allOfficersSigned;
  const anyOfficerHasSigned = officerSigs.length > 0;
  const managerHasSigned = sigs.some((s) => s.role === "MANAGER");
  const canSubmitForm = isManager && managerHasSigned;

  // Calculate grand total and determine next status
  const calculateGrandTotal = () => {
    let total = 0;
    if (materials) total += materials.total;
    if (services) total += services.total;
    return total;
  };

  const grandTotal = calculateGrandTotal();
  const nextStatus = grandTotal < 50_000_000 ? 'PURCHASE_READY' : 'TENDER_READY';

  const saveNotes = async () => {
    setSavingNotes(true);
    setError("");
    try {
      await apiPost(`/requisitions/${params.id}/boq-form/notes`, { notes: officerNotes });
    } catch (e: any) {
      setError(e?.message || "Failed to save notes");
    } finally {
      setSavingNotes(false);
    }
  };

  const submitForm = async () => {
    if (!confirm(`Are you sure you want to submit the BoQ form? This will change the status to ${nextStatus}.`)) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/requisitions/${params.id}/boq-form/submit`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const clearMySignature = async () => {
    if (!confirm("Are you sure you want to clear your signature?")) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/requisitions/${params.id}/boq-form/clear-signature`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to clear signature");
    } finally {
      setSubmitting(false);
    }
  };

  const rejectForm = async () => {
    if (!confirm("Are you sure you want to reject the BoQ form? This will archive the requisition and no further actions can be taken.")) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/requisitions/${params.id}/boq-form/reject`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to reject form");
    } finally {
      setSubmitting(false);
    }
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 24,
  };

  const thStyle: React.CSSProperties = {
    border: "1px solid #000",
    padding: "8px 12px",
    textAlign: "left",
    backgroundColor: "#f3f4f6",
    fontWeight: 700,
  };

  const tdStyle: React.CSSProperties = {
    border: "1px solid #000",
    padding: "8px 12px",
  };

  const tdRightStyle: React.CSSProperties = {
    ...tdStyle,
    textAlign: "right",
  };

  const headerRowStyle: React.CSSProperties = {
    backgroundColor: "#e5e7eb",
  };


  const renderCompanyHeader = () => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingBottom: 12, borderBottom: "2px solid #000" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {tenant?.logoUrl && (
          <img src={tenant.logoUrl} alt="Logo" style={{ maxHeight: 60, maxWidth: 120 }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{tenant?.legalName || "Company"}</div>
          {tenant?.phone && <div style={{ fontSize: 12 }}>{tenant.phone}</div>}
          {tenant?.address && <div style={{ fontSize: 12, whiteSpace: "pre-line" }}>{tenant.address}</div>}
        </div>
      </div>
      <div style={{ textAlign: "right", fontSize: 12 }}>
        <div><strong>Date:</strong> {formatDate(requisition?.createdAt)}</div>
        <div><strong>Reference No.:</strong> REQ-{requisition?.id}</div>
      </div>
    </div>
  );

  const renderRequisitionDetails = () => (
    <div style={{ marginBottom: 16, padding: 12, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Requisition: {requisition?.title}</div>
      {requisition?.description && (
        <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-line" }}>{requisition.description}</div>
      )}
    </div>
  );

  // Signature Canvas Component
  const SignatureCanvas = ({
    userId,
    fullName,
    role,
    isCurrentUser,
    canSign,
    existingSig,
  }: {
    userId: number;
    fullName: string;
    role: string;
    isCurrentUser: boolean;
    canSign: boolean;
    existingSig: BoqSignature | undefined;
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
    const [hasSigned, setHasSigned] = useState(!!existingSig?.signatureData);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Fill with white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // If there's existing signature, draw it
      if (existingSig?.signatureData) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
        };
        img.src = existingSig.signatureData;
      }
    }, [existingSig]);

    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      if ("touches" in e) {
        const touch = e.touches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isCurrentUser || !canSign || hasSigned) return;
      setIsDrawing(true);
      const { x, y } = getCoords(e);
      setLastPos({ x, y });
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !isCurrentUser || !canSign || hasSigned) return;
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx) return;

      const { x, y } = getCoords(e);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLastPos({ x, y });
      e.preventDefault();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!ctx || !canvas) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    const submitSignature = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const signatureData = canvas.toDataURL("image/png");

      setSubmitting(true);
      setError("");
      try {
        await apiPost(`/requisitions/${params.id}/boq-form/sign`, { signatureData });
        setHasSigned(true);
        await load();
      } catch (e: any) {
        setError(e?.message || "Failed to submit signature");
      } finally {
        setSubmitting(false);
      }
    };

    const isActive = isCurrentUser && canSign && !hasSigned;
    const signedAt = existingSig?.signedAt;

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>

        </div>
        <div style={{ fontSize: 11, color: "#374151", marginBottom: 4 }}>{fullName}</div>
        <canvas
          ref={canvasRef}
          width={210}
          height={75}
          style={{
            border: isActive ? "2px solid #2563eb" : "1px solid #d1d5db",
            borderRadius: 4,
            cursor: isActive ? "crosshair" : "default",
            backgroundColor: "#fff",
            display: "block",
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {signedAt && (
          <div style={{ fontSize: 10, color: "#059669", marginTop: 4 }}>
            Signed: {formatDateTime(signedAt)}
          </div>
        )}
        {!signedAt && !isActive && (
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Date: _______________</div>
        )}
        {isActive && (
          <div className="no-print" style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={clearCanvas}
              disabled={submitting}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              Clear
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitSignature}
              disabled={submitting}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              {submitting ? "Submitting…" : "Submit Signature"}
            </button>
          </div>
        )}
        {role === "MANAGER" && !allOfficersSigned && !signedAt && (
          <div style={{ fontSize: 10, color: "#dc2626", marginTop: 4 }}>
            (All officers must sign first)
          </div>
        )}
        {/* Clear my signature button */}
        {isCurrentUser && signedAt && requisition?.status !== "TENDER_READY" && requisition?.status !== "REQUISITION_REJECTED" && (
          <div className="no-print" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={clearMySignature}
              disabled={submitting}
              style={{ fontSize: 12, padding: "4px 8px" }}
            >
              Clear My Signature
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderSignatureSection = (showSubmitButton: boolean) => (
    <div style={{ marginTop: 32, pageBreakInside: "avoid" }}>
      <div style={{ fontWeight: 700, marginBottom: 12, borderBottom: "1px solid #000", paddingBottom: 4 }}>Signatures</div>
      
      {/* Officers signatures - in one row, wrap if needed */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16 }}>
        {((officers || []) as Officer[]).map((officer) => {
          const existingSig = sigs.find((s) => s.userId === officer.userId && s.role === "OFFICER");
          const isCurrentUser = officer.userId === currentUserId;
          const canSign = isOfficer && isCurrentUser && !existingSig;
          return (
            <SignatureCanvas
              key={officer.userId}
              userId={officer.userId}
              fullName={officer.fullName}
              role="OFFICER"
              isCurrentUser={isCurrentUser}
              canSign={canSign}
              existingSig={existingSig}
            />
          );
        })}
      </div>

      {/* Manager signature */}
      {manager && (
        <div>
          <SignatureCanvas
            userId={manager.id}
            fullName={manager.fullName}
            role="MANAGER"
            isCurrentUser={manager.id === currentUserId}
            canSign={canManagerSign && !sigs.find((s) => s.role === "MANAGER")}
            existingSig={sigs.find((s) => s.role === "MANAGER")}
          />
        </div>
      )}

      {/* Submit and Reject buttons - only show for manager after signing */}
      {showSubmitButton && canSubmitForm && requisition?.status !== "TENDER_READY" && requisition?.status !== "REQUISITION_REJECTED" && (
        <div className="no-print" style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitForm}
              disabled={submitting}
            >
              {submitting ? "Submitting…" : "Submit BoQ Form"}
            </button>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              Status → {nextStatus}
            </div>
          </div>
          <div>
            <button
              type="button"
              className="btn"
              onClick={rejectForm}
              disabled={submitting}
              style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}
            >
              Reject
            </button>
            <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
              Archive (no further actions)
            </div>
          </div>
        </div>
      )}
      {/* Manager can reject even before signing */}
      {showSubmitButton && isManager && !managerHasSigned && requisition?.status !== "TENDER_READY" && requisition?.status !== "REQUISITION_REJECTED" && (
        <div className="no-print" style={{ marginTop: 16 }}>
          <button
            type="button"
            className="btn"
            onClick={rejectForm}
            disabled={submitting}
            style={{ backgroundColor: "#fef2f2", color: "#dc2626", borderColor: "#fecaca" }}
          >
            Reject BoQ Form
          </button>
          <div style={{ fontSize: 11, color: "#dc2626", marginTop: 4 }}>
            Archive requisition (no further actions)
          </div>
        </div>
      )}
      {requisition?.status === "TENDER_READY" && (
        <div style={{ marginTop: 16, padding: 8, backgroundColor: "#d1fae5", borderRadius: 4, fontSize: 12, color: "#065f46" }}>
          ✓ This BoQ form has been submitted. Status: TENDER_READY
        </div>
      )}
      {requisition?.status === "REQUISITION_REJECTED" && (
        <div style={{ marginTop: 16, padding: 8, backgroundColor: "#fef2f2", borderRadius: 4, fontSize: 12, color: "#dc2626" }}>
          ✗ This BoQ form has been rejected. Status: REQUISITION_REJECTED (Archived)
        </div>
      )}
    </div>
  );

  const renderOfficerNotesSection = () => (
    <div style={{ marginTop: 16, marginBottom: 16, pageBreakInside: "avoid" }}>
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Notes</div>
      {anyOfficerHasSigned ? (
        <div style={{ padding: 12, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, whiteSpace: "pre-line", fontSize: 13 }}>
          {officerNotes || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No notes</span>}
          <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 8 }}>
            (Locked - an officer has signed)
          </div>
        </div>
      ) : (
        <div className="no-print">
          <textarea
            className="input"
            value={officerNotes}
            onChange={(e) => setOfficerNotes(e.target.value)}
            placeholder="Enter any notes or comments before signing..."
            rows={3}
            style={{ width: "100%", maxWidth: 600 }}
            disabled={!isOfficer}
          />
          {isOfficer && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                className="btn"
                onClick={saveNotes}
                disabled={savingNotes}
                style={{ fontSize: 12 }}
              >
                {savingNotes ? "Saving…" : "Save Notes"}
              </button>
              <span style={{ fontSize: 11, color: "#6b7280", marginLeft: 8 }}>
                Notes will be locked after any officer signs
              </span>
            </div>
          )}
        </div>
      )}
      {/* Print version */}
      <div className="print-only" style={{ padding: 12, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, whiteSpace: "pre-line", fontSize: 13, display: "none" }}>
        {officerNotes || <span style={{ color: "#9ca3af", fontStyle: "italic" }}>No notes</span>}
      </div>
    </div>
  );

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
      <InternalPage title={title}>
        <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
          <BackButton fallbackHref={`/requisitions/${params.id}/view`} />
          <button className="btn" onClick={() => window.print()}>
            Print / Save PDF
          </button>
        </div>

        {/* Materials / Commodities Section */}
        {materials && (
          <div className="print-page" style={{ marginBottom: 32, pageBreakAfter: services ? "always" : "auto" }}>
            {renderCompanyHeader()}
            {renderRequisitionDetails()}

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Bill of Quantities</h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
              <div>
                <strong>Competitive Bid No.:</strong> {requisition?.id}
              </div>
              <div>
                <strong>Page No.:</strong> 1 of {materials && services ? 2 : 1}
              </div>
            </div>

            <table style={tableStyle}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={{ ...thStyle, width: 50 }}>1</th>
                  <th style={thStyle}>2</th>
                  <th style={{ ...thStyle, width: 80 }}>3</th>
                  <th style={{ ...thStyle, width: 80 }}>4</th>
                  <th style={{ ...thStyle, width: 80 }}>5</th>
                  <th style={{ ...thStyle, width: 120 }}>6</th>
                  <th style={{ ...thStyle, width: 120 }}>7</th>
                  <th style={{ ...thStyle, width: 100 }}>8</th>
                </tr>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item No.</th>
                  <th style={thStyle}>Commodities Description</th>
                  <th style={thStyle}>Date of Delivery</th>
                  <th style={thStyle}>UOM</th>
                  <th style={thStyle}>Quantities</th>
                  <th style={thStyle}>Unit Price DDP</th>
                  <th style={thStyle}>Total Price</th>
                  <th style={thStyle}>Country of Origin</th>
                </tr>
              </thead>
              <tbody>
                {materials.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={tdStyle}>{item.itemNo}</td>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}>{item.uom}</td>
                    <td style={tdRightStyle}>{item.quantity.toLocaleString()}</td>
                    <td style={tdRightStyle}>{formatAmount(item.unitPrice, item.currency || currency)}</td>
                    <td style={tdRightStyle}>{formatAmount(item.totalPrice, item.currency || currency)}</td>
                    <td style={tdStyle}></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f0f9ff", fontWeight: 700 }}>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "right" }}>
                    Total Price: Commodities
                  </td>
                  <td style={tdRightStyle}>{formatAmount(materials.total, currency)}</td>
                  <td style={tdStyle}></td>
                </tr>
              </tfoot>
            </table>

            {/* Officer notes section - only on first page */}
            {renderOfficerNotesSection()}

            {/* Show signatures on both pages */}
            {renderSignatureSection(!services)}
          </div>
        )}

        {/* Services Section */}
        {services && (
          <div className="print-page" style={{ marginBottom: 32 }}>
            {renderCompanyHeader()}
            {renderRequisitionDetails()}

            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
                Schedule of Quantities and Completion – Services related to the Contract
              </h2>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13 }}>
              <div>
                <strong>National Competitive Bid No.:</strong> {requisition?.id}
              </div>
              <div>
                <strong>Page No.:</strong> {materials ? 2 : 1} of {materials && services ? 2 : 1}
              </div>
            </div>

            <table style={tableStyle}>
              <thead>
                <tr style={headerRowStyle}>
                  <th style={{ ...thStyle, width: 50 }}>1</th>
                  <th style={thStyle}>2</th>
                  <th style={{ ...thStyle, width: 80 }}>3</th>
                  <th style={{ ...thStyle, width: 80 }}>4</th>
                  <th style={{ ...thStyle, width: 80 }}>5</th>
                  <th style={{ ...thStyle, width: 120 }}>6</th>
                  <th style={{ ...thStyle, width: 120 }}>7</th>
                  <th style={{ ...thStyle, width: 100 }}>8</th>
                </tr>
                <tr style={headerRowStyle}>
                  <th style={thStyle}>Item No.</th>
                  <th style={thStyle}>Services Description</th>
                  <th style={thStyle}>Date of Delivery</th>
                  <th style={thStyle}>UOM</th>
                  <th style={thStyle}>Quantities</th>
                  <th style={thStyle}>Unit Price DDP</th>
                  <th style={thStyle}>Total Price</th>
                  <th style={thStyle}>Country of Origin</th>
                </tr>
              </thead>
              <tbody>
                {services.items.map((item: any, idx: number) => (
                  <tr key={idx}>
                    <td style={tdStyle}>{item.itemNo}</td>
                    <td style={tdStyle}>{item.description}</td>
                    <td style={tdStyle}></td>
                    <td style={tdStyle}>{item.uom}</td>
                    <td style={tdRightStyle}>{item.quantity.toLocaleString()}</td>
                    <td style={tdRightStyle}>{formatAmount(item.unitPrice, item.currency || currency)}</td>
                    <td style={tdRightStyle}>{formatAmount(item.totalPrice, item.currency || currency)}</td>
                    <td style={tdStyle}></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f0f9ff", fontWeight: 700 }}>
                  <td colSpan={6} style={{ ...tdStyle, textAlign: "right" }}>
                    Total Price: Associated Services
                  </td>
                  <td style={tdRightStyle}>{formatAmount(services.total, currency)}</td>
                  <td style={tdStyle}></td>
                </tr>
              </tfoot>
            </table>

            {/* Show signatures on both pages */}
            {renderSignatureSection(true)}
          </div>
        )}

        {!materials && !services && (
          <div style={{ color: "var(--muted)", padding: 24 }}>
            No items found in the approved Bill of Quantities.
          </div>
        )}

        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              padding: 0;
              margin: 0;
              background: white !important;
            }
            @page {
              size: A4 landscape;
              margin: 15mm 10mm;
            }
            aside, nav, [class*="sidebar"], [class*="SecondaryNav"], [class*="Sidebar"], [class*="TeamNotes"] {
              display: none !important;
            }
            main, [role="main"] {
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-page {
              page-break-inside: avoid;
            }
            table {
              font-size: 10pt !important;
            }
            th, td {
              padding: 6px 8px !important;
            }
            .print-only {
              display: block !important;
            }
          }
          @media screen {
            .print-only {
              display: none !important;
            }
          }
        `}</style>
      </InternalPage>
    </RequireRoles>
  );
}
