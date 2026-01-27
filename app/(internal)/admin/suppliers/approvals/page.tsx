"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../../lib/api";

export default function AdminSupplierApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (status) params.set("status", status);

      const r = await apiGet(`/suppliers/admin/approvals${params.toString() ? `?${params}` : ""}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic search/filter
  const searchTimerRef = useRef<any>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      load();
    }, 450);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  const filtered = useMemo(() => rows, [rows]);

  const doAction = async (n: string, fn: () => Promise<any>) => {
    setError("");
    setActing(n);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Supplier approvals">
      <InternalPage title="Admin / Supplier approvals">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn" href="/admin">
          Back
        </Link>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12, alignItems: "end" }}>
          <label>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Search</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Company name, email, phone" />
          </label>
          <label>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Status</div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Reject reason (used when clicking Reject)</div>
            <input className="input" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Optional" />
          </label>
        </div>
      </div>

      <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left" }}>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Status</th>
            <th>Reviewed</th>
            <th>Docs</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((s) => (
            <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.email || ""}</td>
              <td>{s.phone || ""}</td>
              <td>{s.registrationStatus}</td>
              <td>{s.reviewedAt ? new Date(s.reviewedAt).toISOString().slice(0, 10) : ""}</td>
              <td>{Array.isArray(s.documents) ? s.documents.length : 0}</td>
              <td style={{ textAlign: "right" }}>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                  <button
                    className="btn"
                    disabled={acting !== ""}
                    onClick={() => doAction(`approve-${s.id}`, () => apiPost(`/suppliers/${s.id}/approve`, {}))}
                  >
                    Approve
                  </button>
                  <button
                    className="btn"
                    style={{ color: "#b91c1c" }}
                    disabled={acting !== ""}
                    onClick={() =>
                      doAction(`reject-${s.id}`, () => apiPost(`/suppliers/${s.id}/reject`, { reason: rejectReason || null }))
                    }
                  >
                    Reject
                  </button>
                </div>
                {s.rejectionReason && <div style={{ marginTop: 6, color: "#b91c1c", fontSize: 12 }}>Reason: {s.rejectionReason}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
      </InternalPage>
    </RequireRoles>
  );
}
