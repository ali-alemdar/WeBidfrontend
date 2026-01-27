"use client";

import Link from "next/link";

interface Props {
  data: any;
  error: string;
  autoSaveState: "idle" | "saving" | "saved" | "error";
  isRequesterOnly: boolean;
  canRequesterEdit: boolean;
  acting: string;
  onSubmitRequesterDraft: () => void;
  onRequesterResubmit: () => void;
  onOpenApprovalForm: () => void;
}

export default function RequisitionHeader({
  data,
  error,
  autoSaveState,
  isRequesterOnly,
  canRequesterEdit,
  acting,
  onSubmitRequesterDraft,
  onRequesterResubmit,
  onOpenApprovalForm,
}: Props) {
  const statusLabel =
    data.status === "MANUAL_ENTRY" ? "Manual entry" : data.status;

  const showApprovalButton =
    !isRequesterOnly && String(data.status || "") === "SIGNATURE_READY_REQUISITION";

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">Status: {statusLabel}</span>
          {data.createdBy?.email && (
            <span className="pill">Created by: {data.createdBy.email}</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {autoSaveState !== "idle" && (
            <span className="pill">
              {autoSaveState === "saving" && "Saving…"}
              {autoSaveState === "saved" && "Saved"}
              {autoSaveState === "error" && "Save failed"}
            </span>
          )}

          {isRequesterOnly && canRequesterEdit ? (
            <button
              className="btn btn-submit"
              disabled={acting !== ""}
              onClick={onSubmitRequesterDraft}
            >
              {acting === "submitRequesterDraft" ? "Submitting…" : "Submit"}
            </button>
          ) : null}

          {showApprovalButton ? (
            <>
              <button
                className="btn"
                type="button"
                onClick={onOpenApprovalForm}
              >
                Approval form
              </button>
            </>
          ) : null}
        </div>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
      )}

      {isRequesterOnly && !canRequesterEdit ? (
        <div
          className="card"
          style={{
            boxShadow: "none",
            marginBottom: 12,
            background: "rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Submitted</div>
          <div style={{ color: "var(--muted)", marginBottom: 8 }}>
            This requisition has been submitted and is now read-only for you. A
            requisition officer can continue processing it.
          </div>
          <button
            className="btn btn-primary"
            disabled={acting !== ""}
            onClick={onRequesterResubmit}
          >
            {acting === "requesterResubmit"
              ? "Starting new copy…"
              : "Submit again as new request"}
          </button>
        </div>
      ) : null}
    </>
  );
}
