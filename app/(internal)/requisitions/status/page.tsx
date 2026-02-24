"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet } from "../../../lib/api";

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

export default function MyRequisitionsStatusPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/requisitions/mine");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const list = useMemo(() => rows.slice().sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0)), [rows]);

  return (
    <RequireRoles anyOf={["REQUESTER", "SYS_ADMIN"]} title="My requisitions">
      <InternalPage title="My requisitions">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Link className="btn btn-primary" href="/requisitions/create">
            Create new
          </Link>
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Status</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{r.id}</td>
                  <td>{r.title}</td>
                  <td>{r.status}</td>
                  <td>{isoDate(r.createdAt)}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/requisitions/${r.id}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && list.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ color: "var(--muted)" }}>
                    No requisitions yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          {loading ? <p style={{ color: "var(--muted)" }}>Loading…</p> : null}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
