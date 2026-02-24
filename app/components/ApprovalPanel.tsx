"use client";

import { useState } from "react";
import { apiPost } from "../lib/api";

interface Officer {
  userId: number;
  fullName: string;
  email: string;
  decision?: string;
  notes?: string;
  decidedAt?: string;
}

interface ApprovalPanelProps {
  tenderId: string;
  status: string;
  officers: Officer[];
  returnNotes?: string;
  rejectNotes?: string;
  onApprovalChange?: () => void;
  userRole: string[];
  userId?: number;
}

export default function ApprovalPanel({
  tenderId,
  status,
  officers,
  returnNotes,
  rejectNotes,
  onApprovalChange,
  userRole,
  userId,
}: ApprovalPanelProps) {
  const [loadingApproval, setLoadingApproval] = useState(false);
  const [error, setError] = useState("");
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const isOfficer = userRole.includes("TENDERING_OFFICER");
  const isManager = userRole.includes("TENDER_APPROVAL");
  const currentOfficer = officers.find((o) => o.userId === userId);
  const allOfficersApproved = officers.every((o) => o.decision === "APPROVED");
  const isPending = status === "DRAFT_TENDER" || status === "DRAFT_TENDER_RETURN";
  const isWaitingForManager = status === "TENDER_PENDING_APPROVAL";
  const isArchived = status === "ARCHIVED" || status === "ARCHIVED_TENDER";

  const handleOfficerApprove = async () => {
    setLoadingApproval(true);
    setError("");
    try {
      await apiPost(`/tenders/${tenderId}/prep-approvals/officer-approve`, { notes: null });
      onApprovalChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    } finally {
      setLoadingApproval(false);
    }
  };

  const handleOfficerCancel = async () => {
    setLoadingApproval(true);
    setError("");
    try {
      await apiPost(`/tenders/${tenderId}/prep-approvals/officer-cancel`, {});
      onApprovalChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to cancel approval");
    } finally {
      setLoadingApproval(false);
    }
  };

  const handleManagerApprove = async () => {
    setLoadingApproval(true);
    setError("");
    try {
      await apiPost(`/tenders/${tenderId}/prep-approvals/manager-approve`, {});
      onApprovalChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    } finally {
      setLoadingApproval(false);
    }
  };

  const handleManagerReturn = async () => {
    if (!returnReason.trim()) {
      setError("Please enter a reason for returning");
      return;
    }
    setLoadingApproval(true);
    setError("");
    try {
      await apiPost(`/tenders/${tenderId}/prep-approvals/manager-return`, {
        reason: returnReason,
      });
      setShowReturnModal(false);
      setReturnReason("");
      onApprovalChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to return for changes");
    } finally {
      setLoadingApproval(false);
    }
  };

  const handleManagerReject = async () => {
    if (!rejectReason.trim()) {
      setError("Please enter a reason for rejection");
      return;
    }
    setLoadingApproval(true);
    setError("");
    try {
      await apiPost(`/tenders/${tenderId}/prep-approvals/manager-reject`, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      setRejectReason("");
      onApprovalChange?.();
    } catch (e: any) {
      setError(e?.message || "Failed to reject");
    } finally {
      setLoadingApproval(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Approval Workflow</h3>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {/* Return notes */}
      {returnNotes && (
        <div style={{ backgroundColor: "#fef3c7", color: "#92400e", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #fcd34d" }}>
          <strong>📝 Return notes from manager:</strong>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{returnNotes}</div>
        </div>
      )}

      {/* Reject notes */}
      {rejectNotes && (
        <div style={{ backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 8, marginBottom: 12, border: "1px solid #fca5a5" }}>
          <strong>❌ Rejection reason:</strong>
          <div style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{rejectNotes}</div>
        </div>
      )}

      {/* Officer approvals */}
      {officers.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <strong>Officer Approvals:</strong>
          <div style={{ marginTop: 8 }}>
            {officers.map((officer) => (
              <div
                key={officer.userId}
                style={{
                  padding: 8,
                  borderRadius: 4,
                  backgroundColor: officer.decision === "APPROVED" ? "#f0fdf4" : "#f5f5f5",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span>
                    {officer.fullName}
                    {officer.decision === "APPROVED" && " ✓"}
                    {officer.decision === "CANCELLED" && " (withdrawn)"}
                  </span>
                  <span style={{ fontSize: 12, color: "#666" }}>
                    {officer.decision === "APPROVED" ? "Approved" : "Pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Officer actions */}
      {isOfficer && isPending && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {currentOfficer?.decision !== "APPROVED" ? (
            <button
              className="btn btn-primary"
              onClick={handleOfficerApprove}
              disabled={loadingApproval}
            >
              {loadingApproval ? "Approving..." : "✓ Approve"}
            </button>
          ) : (
            <button
              className="btn"
              onClick={handleOfficerCancel}
              disabled={loadingApproval}
              style={{ color: "#b91c1c" }}
            >
              {loadingApproval ? "Cancelling..." : "✗ Withdraw Approval"}
            </button>
          )}
        </div>
      )}

      {/* Manager actions */}
      {isManager && isWaitingForManager && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            className="btn btn-primary"
            onClick={handleManagerApprove}
            disabled={loadingApproval}
          >
            {loadingApproval ? "Approving..." : "✓ Approve & Move to Signing"}
          </button>
          <button
            className="btn"
            onClick={() => setShowReturnModal(true)}
            disabled={loadingApproval}
          >
            ↩️ Return for Changes
          </button>
          <button
            className="btn"
            onClick={() => setShowRejectModal(true)}
            disabled={loadingApproval}
            style={{ color: "#b91c1c" }}
          >
            ✗ Reject & Archive
          </button>
        </div>
      )}

      {/* Return Modal */}
      {showReturnModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, maxWidth: 500, width: "90%" }}>
            <h3 style={{ marginTop: 0 }}>Return for Changes</h3>
            <p>Please provide details about what changes are needed:</p>
            <textarea
              className="input"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="Enter reason for returning to officers..."
              style={{ width: "100%", minHeight: 100, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowReturnModal(false)} disabled={loadingApproval}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleManagerReturn} disabled={loadingApproval}>
                {loadingApproval ? "Returning..." : "Return to Officers"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div style={{ backgroundColor: "white", padding: 24, borderRadius: 8, maxWidth: 500, width: "90%" }}>
            <h3 style={{ marginTop: 0, color: "#b91c1c" }}>Reject & Archive Tender</h3>
            <p style={{ color: "#b91c1c" }}>This action cannot be undone. Please provide a reason:</p>
            <textarea
              className="input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              style={{ width: "100%", minHeight: 100, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setShowRejectModal(false)} disabled={loadingApproval}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={handleManagerReject}
                disabled={loadingApproval}
                style={{ color: "white", backgroundColor: "#b91c1c" }}
              >
                {loadingApproval ? "Rejecting..." : "Reject & Archive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
