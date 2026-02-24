"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function TenderPublishingListPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const resp = await apiGet("/tenders/publishing");
      setTenders(Array.isArray(resp) ? resp : []);
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (!msg.toLowerCase().includes("forbidden")) {
        setError(msg || "Failed to load tenders");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <RequireRoles
      anyOf={[
        "TENDER_PUBLICATION_PREPARER",
        "TENDER_PUBLICATION_MANAGER",
        "SYS_ADMIN",
      ]}
      title="Tender Publishing / List"
    >
      <InternalPage title="Tender Publishing / List">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tender-publishing" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>All Tenders in Publishing Pipeline</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Tender #</th>
                <th>Title</th>
                <th>Status</th>
                <th>Closing Date</th>

                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender) => {
                const setup = tender.publicationSetups?.[0];
                const preparers = setup?.signatures
                  ?.filter((s: any) => s.role === "PUBLICATION_PREPARER")
                  .map((s: any) => s.user?.fullName || `User ${s.userId}`)
                  .join(", ") || "-";

                return (
                  <tr key={tender.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>TEN-{String(tender.tenderNumber || 0).padStart(5, "0")}</td>
                    <td>{tender.requisition?.title || tender.title || "(Untitled)"}</td>
                    <td>
                      <span className="pill">
                        {(tender.status || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td>{fmtDate(tender.closingAt)}</td>
                  </tr>
                );
              })}
              {!loading && tenders.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No tenders in publishing pipeline.
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
