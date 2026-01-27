"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet } from "../../../../lib/api";

interface Props {
  params: { id: string };
}

export default function RequisitionOfficersPage({ params }: Props) {
  const requisitionId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [requisition, setRequisition] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [signoffs, setSignoffs] = useState<any[]>([]);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [req, officers] = await Promise.all([
        apiGet(`/requisitions/${requisitionId}`),
        apiGet(`/requisitions/${requisitionId}/officers`),
      ]);

      setRequisition(req);
      setAssignments(Array.isArray(officers?.assignments) ? officers.assignments : []);
      setSignoffs(Array.isArray(officers?.signoffs) ? officers.signoffs : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load officers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!Number.isFinite(requisitionId)) {
      setError("Invalid requisition id");
      setLoading(false);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisitionId]);

  const signedUserIds = new Set<number>(
    signoffs
      .map((s: any) => Number(s.userId))
      .filter((id: any) => Number.isFinite(id)),
  );

  const title = requisition ? `Requisition ${requisition.id} / Officers` : "Requisition officers";

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]} title={title}>
      <InternalPage title={title}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn" href={`/requisitions/${params.id}/view`}>
          Back to approval package
        </Link>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Requisition team</h3>
        <p style={{ color: "var(--muted)", fontSize: 13 }}>
          This page shows the manager (if assigned) and the officers involved in this requisition. It is read-only.
        </p>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Manager</div>
          <div>
            {requisition?.manager?.fullName || requisition?.managerName || "Not assigned"}
          </div>
        </div>

        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Officers</div>
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Name</th>
                <th>Username</th>
                <th>Phone</th>
                <th style={{ width: 80 }}>Lead</th>
                <th style={{ width: 100 }}>Signed</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((a: any) => {
                const u = a.user || {};
                const isLead = Boolean(a.isLead);
                const signed = signedUserIds.has(Number(a.userId));
                return (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>{u.fullName || ""}</td>
                    <td>{u.email || ""}</td>
                    <td>{u.phone || ""}</td>
                    <td>{isLead ? <span className="pill">Lead</span> : ""}</td>
                    <td>{signed ? <span className="pill">Signed</span> : ""}</td>
                  </tr>
                );
              })}
              {!assignments.length && !loading ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No officers assigned.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
