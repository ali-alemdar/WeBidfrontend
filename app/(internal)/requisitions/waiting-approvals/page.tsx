"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import BackButton from "../../../components/BackButton";
import { apiGet, apiPost } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

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

export default function WaitingApprovalsPage() {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];

  const isSysAdmin = roles.includes("SYS_ADMIN");
  const canManagerAct = roles.includes("REQUISITION_MANAGER") || isSysAdmin;
  const canChairAct = roles.includes("COMMITTEE_CHAIR") || isSysAdmin;
  const canCommitteeAct = false;
  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      // Reuse submissions hub API; filter client-side for tender-prep approvals.
      const r = await apiGet("/requisitions/submissions");
      const list = Array.isArray(r) ? r : [];
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const allowed = new Set<string>();

    // Change control is handled by COMMITTEE_CHAIR.
    if (canChairAct) allowed.add("CHANGES_SUBMITTED");

    // Tender-prep approvals are handled by managers at APROVAL_PENDING.
    if (canManagerAct) allowed.add("APROVAL_PENDING");

    // Read-only users (officers) can still see both stages to check status.
    if (!canManagerAct && !canChairAct) {
      allowed.add("APROVAL_PENDING");
      allowed.add("CHANGES_SUBMITTED");
    }

    // Show only requisitions in the allowed statuses that the user can act on (or view) based on role.
    const userId = Number((user as any)?.id);
    return rows.filter((x) => {
      if (!allowed.has(String(x?.status || ""))) return false;
      if (isSysAdmin || canManagerAct || canChairAct) return true;
      const assigns = Array.isArray((x as any).officerAssignments) ? (x as any).officerAssignments : [];
      const ids = assigns
        .map((a: any) => Number(a?.userId))
        .filter((n: any) => Number.isFinite(n));
      return isOfficer && ids.includes(userId);
    });
  }, [rows, canChairAct, canManagerAct]);

  const kindLabel = (status: string) => {
    if (status === "CHANGES_SUBMITTED") return "Change control";
    if (status === "APROVAL_PENDING") return "Requisition approval";
    return "";
  };

  const openHref = (r: any) => {
    const st = String(r?.status || "");
    if (st === "CHANGES_SUBMITTED") return `/requisitions/${r.id}/view`;
    if (st === "APROVAL_PENDING") return `/submissions/${r.id}`;
    return `/requisitions/${r.id}/view`;
  };

  const approveRequisitionApproval = async (requisitionId: number) => {
    setError("");
    setActing(String(requisitionId));
    try {
      await apiPost(`/requisitions/${requisitionId}/tender-prep/manager-approve`, {});
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to approve");
    } finally {
      setActing("");
    }
  };

  const returnToOfficers = async (r: any) => {
    const id = Number(r?.id);
    const st = String(r?.status || "");
    if (!Number.isFinite(id)) return;

    setError("");
    setActing(String(id));
    try {
      if (st === "APROVAL_PENDING") {
        await apiPost(`/requisitions/${id}/tender-prep/manager-reject`, { reason: rejectReason || null });
      } else if (st === "CHANGES_SUBMITTED") {
        await apiPost(`/requisitions/${id}/changes/reject`, { reason: rejectReason || null });
      }

      setRejectReason("");
      await load();
    } catch (e: any) {
      const msg = e?.message || "";
      // Some backends may return a 403 JSON body even after state has been
      // updated successfully; avoid surfacing that raw JSON to the user.
      if (msg && (msg.includes('"Forbidden"') || msg.includes('statusCode":403'))) {
        return;
      }
      setError(msg || "Failed to reject");
    } finally {
      setActing("");
    }
  };

  // Chair hard-rejects a change-control item: send it to archive as REQUISITION_REJECTED.
  const rejectItem = async (r: any) => {
    const id = Number(r?.id);
    if (!Number.isFinite(id)) return;

    setError("");
    setActing(String(id));
    try {
      await apiPost(`/requisitions/${id}/changes/reject`, { reason: rejectReason || null });
      setRejectReason("");
      await load();
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg && (msg.includes('"Forbidden"') || msg.includes('statusCode":403'))) {
        return;
      }
      setError(msg || "Failed to reject");
    } finally {
      setActing("");
    }
  };

  return (
    <RequireRoles
      anyOf={["REQUISITION_OFFICER", "TENDERING_OFFICER", "REQUISITION_MANAGER", "COMMITTEE_CHAIR", "SYS_ADMIN"]}
      title="Requisitions / Approval queue"
    >
      <InternalPage title="Requisitions / Approval queue">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {(canManagerAct || canChairAct || canCommitteeAct) ? (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Items waiting for action</h3>
          <label style={{ display: "block", maxWidth: 700 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Manager comment (used for Return / Reject)</div>
            <input className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Optional" />
          </label>
        </div>
      ) : (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Read-only</div>
          <div style={{ color: "var(--muted)" }}>
            You can view the approval queue to check status. Actions are restricted to the matching role (committee/chair/manager).
          </div>
        </div>
      )}

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Pending items</h3>

        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>ID</th>
              <th>Title</th>
              <th>Status</th>
              <th>Manual</th>
              <th>Items</th>
              <th>Invited</th>
              <th>Submitted</th>
              <th>Last submission</th>
              <th>Recommended total</th>
              <th></th>
              <th></th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{r.id}</td>
                <td>{r.title}</td>
                <td>{r.status === "MANUAL_ENTRY" ? "Manual entry" : r.status}</td>
                <td>{r.manualSubmissions ? <span className="pill">Manual</span> : ""}</td>
                <td>{r.itemCount ?? ""}</td>
                <td>{r.invitedCount ?? ""}</td>
                <td>{r.submittedCount ?? ""}</td>
                <td>{isoDate(r.lastSubmissionAt)}</td>
                <td>{r.recommendedTotal != null ? r.recommendedTotal : ""}</td>
                <td style={{ textAlign: "right" }}>
                  <Link className="btn" href={openHref(r)}>
                    Open
                  </Link>
                </td>
                <td style={{ textAlign: "right" }}></td>
                <td style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>

                  {String(r.status || "") === "CHANGES_SUBMITTED" && canChairAct ? (
                    <button
                      className="btn"
                      style={{ color: "#b91c1c" }}
                      disabled={acting !== ""}
                      onClick={() => rejectItem(r)}
                    >
                      {acting === String(r.id) ? "Rejecting…" : "Reject"}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ color: "var(--muted)" }}>
                  No requisitions waiting for approvals.
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
