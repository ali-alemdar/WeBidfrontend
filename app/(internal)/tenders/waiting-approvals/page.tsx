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

export default function TenderWaitingApprovalsPage() {
  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];

  const isSysAdmin = roles.includes("SYS_ADMIN");
  const canManagerAct = roles.includes("TENDER_APPROVAL") || isSysAdmin;
  const isOfficer = roles.includes("TENDERING_OFFICER") || isSysAdmin;

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/waiting-approvals");
      const list = Array.isArray(r) ? r : [];
      setRows(list);
    } catch (e: any) {
      setError(e?.message || "Failed to load tenders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  // All manager actions are now performed inside the tender detail page.

  return (
    <RequireRoles
      anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title="Tenders / Approval queue"
    >
      <InternalPage title="Tenders / Approval queue" pageId="TENAPR">

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Pending tenders</h3>

          <table
            width="100%"
            cellPadding={8}
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created at</th>
                <th>Closing at</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t: any) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  {/* Show business ID (requisitionId) instead of internal UUID */}
                  <td>{t.requisitionId ?? ""}</td>
                  <td>{t.requisition?.title || t.title || ""}</td>
                  <td>{t.status}</td>
                  <td>{isoDate(t.createdAt)}</td>
                  <td>{isoDate(t.closingAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${t.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ color: "var(--muted)" }}>
                    No tenders waiting for approval.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loading && (
            <p style={{ color: "var(--muted)" }}>Loading…</p>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}