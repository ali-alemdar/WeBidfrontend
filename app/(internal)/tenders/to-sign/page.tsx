"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import BackButton from "../../../components/BackButton";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet } from "../../../lib/api";

function fmtDate(value: any) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export default function TendersToSignPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/tenders/to-sign");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tenders to sign");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => rows, [rows]);

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]} title="Tenders / To Sign">
      <InternalPage title="Tenders / To Sign">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tenders" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Tenders requiring your signature</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Title</th>
                <th>Status</th>
                <th>Created</th>
                <th>Manager</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>TEN-{String(t.tender_id || 0).padStart(5, "0")}</td>
                  <td>{t.title || "(Untitled)"}</td>
                  <td>
                    <span className="pill">{(t.status || "").replace(/_/g, " ")}</span>
                  </td>
                  <td>{fmtDate(t.createdAt)}</td>
                  <td>{t.prepManager?.fullName || "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <Link className="btn" href={`/tenders/${t.id}`}>
                      Sign
                    </Link>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No tenders require your signature.
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