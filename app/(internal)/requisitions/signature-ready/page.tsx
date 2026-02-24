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

export default function SignatureReadyPage() {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];

  const isSysAdmin = roles.includes("SYS_ADMIN");
  const canManagerAct = roles.includes("REQUISITION_MANAGER") || isSysAdmin;
  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
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
    const userId = Number((user as any)?.id);
    return rows.filter((x) => {
      if (String(x?.status || "") !== "SIGNATURE_READY_REQUISITION") return false;
      if (isSysAdmin || canManagerAct) return true;
      const assigns = Array.isArray((x as any).officerAssignments) ? (x as any).officerAssignments : [];
      const ids = assigns
        .map((a: any) => Number(a?.userId))
        .filter((n: any) => Number.isFinite(n));
      return isOfficer && ids.includes(userId);
    });
  }, [rows, canManagerAct, isSysAdmin, isOfficer]);

  const openHref = (r: any) => `/requisitions/${r.id}/view`;

  return (
    <RequireRoles
      anyOf={["REQUISITION_OFFICER", "TENDERING_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}
      title="Requisitions / Signature ready"
    >
      <InternalPage title="Requisitions / Signature ready">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/requisitions/list" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Requisitions ready for signature</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Items</th>
                <th>Invited</th>
                <th>Submitted</th>
                <th>Last submission</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td>{r.itemCount ?? ""}</td>
                  <td>{r.invitedCount ?? ""}</td>
                  <td>{r.submittedCount ?? ""}</td>
                  <td>{isoDate(r.lastSubmissionAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={openHref(r)}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--muted)" }}>
                    No requisitions ready for signature.
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
