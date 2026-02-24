"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../components/InternalPage";
import BackButton from "../../../components/BackButton";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost, apiPut } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

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

export default function TenderPublishingReadyPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [acting, setActing] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [closingDate, setClosingDate] = useState<string>("");

  const user = getCurrentUser();
  const isPrepper = ((user as any)?.roles || []).includes(
    "TENDER_PUBLICATION_PREPARER"
  );

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const resp = await apiGet("/tenders/publishing");
      const draftTenders = Array.isArray(resp)
        ? resp.filter(
            (t) =>
              String(t.status || "") === "TENDER_PREP_COMPLETE" &&
              (!Array.isArray((t as any).publicationSetups) || (t as any).publicationSetups.length === 0)
          )
        : [];
      setTenders(draftTenders);
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

  const selectedTender = tenders.find((t) => String(t.id) === selectedId);

  useEffect(() => {
    if (selectedTender?.closingAt) {
      const date = new Date(selectedTender.closingAt);
      setClosingDate(date.toISOString().split("T")[0]);
    } else {
      setClosingDate("");
    }
  }, [selectedTender]);

  const handleUpdateClosingDate = async () => {
    if (!selectedId || !closingDate) {
      setError("Closing date is required");
      return;
    }

    setError("");
    setActing("updateDate");
    try {
      const isoDate = new Date(closingDate).toISOString();
      await apiPut(`/tenders/${selectedId}/publication-closing-date`, {
        closingAt: isoDate,
      });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to update closing date");
    } finally {
      setActing("");
    }
  };

  const handleSubmitSetup = async (tenderId: string) => {
    setError("");
    setActing("submit");
    try {
      await apiPost(`/tenders/${tenderId}/publication-setup/submit`, {});
      await load();
      setSelectedId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to submit setup");
    } finally {
      setActing("");
    }
  };

  return (
    <RequireRoles
      anyOf={[
        "TENDER_PUBLICATION_PREPARER",
        "TENDER_PUBLICATION_MANAGER",
        "SYS_ADMIN",
      ]}
      title="Tender Publishing / Ready"
    >
      <InternalPage title="Tender Publishing / Ready">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <BackButton fallbackHref="/tender-publishing" />
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Ready for Setup (DRAFT)</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>Tender #</th>
                <th>Title</th>
                <th>Closing Date</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tenders.map((tender) => (
			  <tr key={tender.id} style={{ borderTop: "1px solid var(--border)" }}>
				<td>TEN-{String(tender.tenderNumber || 0).padStart(5, "0")}</td>
				<td>{tender.requisition?.title || tender.title || "(Untitled)"}</td>
				<td>{fmtDate(tender.closingAt)}</td>
				<td style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
				  <span className="pill">{(tender.status || "").replace(/_/g, " ")}</span>
				  <Link href={`/tender-publishing/${tender.id}/details`} className="btn" style={{ fontSize: 12 }}>
					Fill Variables
				  </Link>
				</td>
			  </tr>
			))}
            </tbody>
          </table>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>

        {/* Detail Panel */}
        {selectedTender && (
          <div className="card" style={{ boxShadow: "none", marginTop: 24 }}>
            <h3 style={{ marginTop: 0 }}>Setup: {selectedTender.requisition?.title || selectedTender.title || "(Untitled)"}</h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>Closing Date</span>
                  <input
                    type="date"
                    value={closingDate}
                    onChange={(e) => setClosingDate(e.target.value)}
                    disabled={!isPrepper}
                    style={{
                      padding: "8px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      fontSize: 14,
                      opacity: !isPrepper ? 0.6 : 1,
                    }}
                  />
                </label>
              </div>

              <div>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 500, fontSize: 12 }}>Manager</span>
                  <div style={{ padding: "8px 12px", background: "#f3f4f6", borderRadius: 4, fontSize: 12 }}>
                    {selectedTender.publicationSetups?.[0]?.publishManager?.fullName ||
                      selectedTender.publicationSetups?.[0]?.publishManager?.email ||
                      "-"}
                  </div>
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {isPrepper && (
                <>
                  <button
                    onClick={handleUpdateClosingDate}
                    disabled={acting !== ""}
                    className="btn"
                    style={{ opacity: acting !== "" ? 0.6 : 1 }}
                  >
                    {acting === "updateDate" ? "Updating…" : "Update Closing Date"}
                  </button>
                  <button
                    onClick={() => handleSubmitSetup(selectedId!)}
                    disabled={acting !== ""}
                    className="btn btn-primary"
                    style={{ opacity: acting !== "" ? 0.6 : 1 }}
                  >
                    {acting === "submit" ? "Submitting…" : "Submit for Approval"}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </InternalPage>
    </RequireRoles>
  );
}
