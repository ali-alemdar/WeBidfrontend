"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../../lib/api";
import { getCurrentUser } from "../../../../lib/authClient";
import RequisitionApprovalFormModal from "../RequisitionApprovalFormModal";

interface Props {
  params: { id: string };
}

export default function RequisitionApprovalFormPage({ params }: Props) {
  const router = useRouter();

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const userId = user?.id ? Number(user.id) : NaN;
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isOfficer =
    roles.includes("REQUISITION_OFFICER") ||
    roles.includes("TENDERING_OFFICER") ||
    isSysAdmin;
  const isManager =
    roles.includes("REQUISITION_MANAGER") || roles.includes("APPROVER") || isSysAdmin;

  const [data, setData] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [approvalLines, setApprovalLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  // Approval state (copied from main requisition page)
  const [approvalComment, setApprovalComment] = useState<string>("");
  const [approvalSignatures, setApprovalSignatures] = useState<
    Record<string, { signed: boolean }>
  >({});
  const [approvalRawSignatures, setApprovalRawSignatures] = useState<any[]>([]);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalError, setApprovalError] = useState<string>("");
  const approvalCommentRef = useRef<HTMLTextAreaElement | null>(null);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const APPROVAL_COMMENT_LIMIT = 3900;

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

    ctx.strokeStyle = "#111827"; // near black
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

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [r, linesRes] = await Promise.all([
        apiGet(`/requisitions/${params.id}`),
        apiGet(`/requisitions/${params.id}/tender-prep/lines`).catch(() => ({ lines: [] })),
      ]);
      setData(r);
      setItems(Array.isArray(r?.items) ? r.items : []);
      setApprovalLines(Array.isArray((linesRes as any)?.lines) ? (linesRes as any).lines : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisition");
    } finally {
      setLoading(false);
    }
  };

  const refreshApproval = async () => {
    // Reload requisition header/items plus the latest approval
    // comment and signatures by clearing local approval state so
    // the modal's own loader runs on next render.
    await load();
    setApprovalComment("");
    setApprovalSignatures({});
    setApprovalRawSignatures([]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handlePrintApprovalForm = async () => {
    if (typeof window === "undefined") return;
    if (!data?.id) return;

    try {
      setApprovalError("");
      await apiPost(`/requisitions/${data.id}/approval-form/comment`, {
        comment: approvalComment || null,
      });
    } catch (e: any) {
      setApprovalError(
        e?.message || "Failed to save comment before printing",
      );
    }

    window.open(`/requisitions/${data.id}/approval-print`, "_blank");
  };

  if (loading && !data) {
    return (
      <RequireRoles
        anyOf={[
          "REQUESTER",
          "REQUISITION_OFFICER",
          "REQUISITION_MANAGER",
          "TENDERING_OFFICER",
          "TENDER_APPROVAL",
          "SYS_ADMIN",
        ]}
        title={`Requisition ${params.id} – Approval form`}
      >
        <InternalPage title={`Requisition ${params.id} – Approval form`}>
          <p>Loading…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (!data) {
    return (
      <RequireRoles
        anyOf={[
          "REQUESTER",
          "REQUISITION_OFFICER",
          "REQUISITION_MANAGER",
          "TENDERING_OFFICER",
          "TENDER_APPROVAL",
          "SYS_ADMIN",
        ]}
        title={`Requisition ${params.id} – Approval form`}
      >
        <InternalPage title={`Requisition ${params.id} – Approval form`}>
          {error ? (
            <p style={{ color: "#b91c1c" }}>{error}</p>
          ) : (
            <p>Not found.</p>
          )}
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles
      anyOf={[
        "REQUISITION_OFFICER",
        "REQUISITION_MANAGER",
        "TENDERING_OFFICER",
        "TENDER_APPROVAL",
        "SYS_ADMIN",
      ]}
      title={`Requisition ${data.id} – Approval form`}
    >
      <InternalPage title={`Requisition ${data.id} – Approval form`}>
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
            <span className="pill">Status: {data.status}</span>
            {data.createdBy?.email && (
              <span className="pill">Created by: {data.createdBy.email}</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn"
              type="button"
              onClick={refreshApproval}
              disabled={loading}
            >
              Refresh
            </button>
            <button
              className="btn"
              type="button"
              onClick={handlePrintApprovalForm}
            >
              Print
            </button>
          </div>
        </div>

        <RequisitionApprovalFormModal
          open={true}
          onClose={() => {
            router.push(`/requisitions/${data.id}/view`);
          }}
          onPrint={handlePrintApprovalForm}
          data={data}
          items={items}
          approvalLines={approvalLines}
          userId={userId}
          isOfficer={isOfficer}
          isManager={isManager}
          approvalComment={approvalComment}
          setApprovalComment={setApprovalComment}
          approvalCommentRef={approvalCommentRef}
          approvalError={approvalError}
          setApprovalError={setApprovalError}
          approvalSignatures={approvalSignatures}
          setApprovalSignatures={setApprovalSignatures}
          approvalRawSignatures={approvalRawSignatures}
          setApprovalRawSignatures={setApprovalRawSignatures}
          approvalLoading={approvalLoading}
          setApprovalLoading={setApprovalLoading}
          APPROVAL_COMMENT_LIMIT={APPROVAL_COMMENT_LIMIT}
          signatureCanvasRef={signatureCanvasRef}
          clearSignatureCanvas={clearSignatureCanvas}
          handleSignaturePointerDown={handleSignaturePointerDown}
          handleSignaturePointerMove={handleSignaturePointerMove}
          handleSignaturePointerUp={handleSignaturePointerUp}
        />
      </InternalPage>
    </RequireRoles>
  );
}
