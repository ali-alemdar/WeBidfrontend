"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import BackButton from "../../../../components/BackButton";
import { apiGet, apiPost, apiDelete } from "../../../../lib/api";
import ManualSubmissionForm from "../../../submissions/components/ManualSubmissionForm";

interface Props {
  params: { id: string };
}

export default function RequisitionManualSubmissionsPage({ params }: Props) {
  const requisitionId = Number(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [starting, setStarting] = useState(false);

  const load = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const r = await apiGet(`/requisitions/${requisitionId}`);
      setData(r);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisition");
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

  const items: any[] = useMemo(() => (Array.isArray(data?.items) ? data.items : []), [data?.items]);
  const manualSubmissionsEnabled = Boolean((data as any)?.manualSubmissions === true);
  const prices: any[] = useMemo(() => (Array.isArray(data?.supplierPrices) ? data.supplierPrices : []), [data?.supplierPrices]);
  const officerSignoffs: any[] = Array.isArray(data?.officerSignoffs) ? data.officerSignoffs : [];
  const manualLocked = officerSignoffs.length > 0;

  const startManual = async () => {
    setError("");
    setMessage("");
    setStarting(true);
    try {
      await apiPost(`/requisitions/${requisitionId}/manual-submissions/start`, {});
      setMessage("Manual submissions enabled for this requisition.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to start manual submissions");
    } finally {
      setStarting(false);
    }
  };

  const title = data ? `Manual submissions / Requisition ${data.id}` : "Manual submissions";

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title={title}>
      <InternalPage title={title}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ color: "#15803d", marginBottom: 12 }}>{message}</div>}

        <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Manual submissions mode</h3>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>
            Manual submissions are an alternative to email invitations. Enable this when you have paper or phone quotes and
            want to capture them directly in the system.
          </p>

          <p style={{ marginTop: 8 }}>
            <strong>Status:</strong>{" "}
            {manualSubmissionsEnabled ? <span className="pill">Enabled</span> : <span className="pill">Disabled</span>}
            {manualLocked ? <span className="pill">Locked by officer approval</span> : null}
          </p>

          {!manualSubmissionsEnabled ? (
            <button className="btn btn-primary" onClick={startManual} disabled={starting || manualLocked}>
              {starting ? "Enabling…" : "Enable manual submissions"}
            </button>
          ) : (
            <p style={{ color: "var(--muted)", marginTop: 8 }}>
              Manual submissions are enabled. You can now enter paper submissions below; the requisition status will
              switch to Manual entry once at least one manual submission is saved.
            </p>
          )}
        </div>

        {manualSubmissionsEnabled ? (
          <>
            {!manualLocked ? (
              <ManualSubmissionForm requisitionId={requisitionId} items={items} onSaved={load} />
            ) : (
              <p style={{ color: "var(--muted)" }}>
                Manual submissions are locked because an officer has already approved the requisition.
              </p>
            )}

            <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
              <h3 style={{ marginTop: 0 }}>Recorded manual submissions</h3>
              {prices.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No manual submissions recorded yet.</p>
              ) : (
                <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>Supplier</th>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Total</th>
                      <th>Entered by</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.map((p: any) => {
                      const item = items.find((it: any) => Number(it.id) === Number(p.requisitionItemId));
                      const qty = Number(item?.quantity);
                      const unit = Number(p.unitPrice);
                      const total = Number.isFinite(qty) && Number.isFinite(unit) ? qty * unit : null;
                      const currency = String(p.currency || "");
                      const enteredBy = String(p?.reviewedBy?.fullName || "").trim();
                      return (
                        <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td>{p?.supplier?.name || p.supplierName || p.supplierId || ""}</td>
                          <td>{item ? item.name : p.requisitionItemId}</td>
                          <td>{Number.isFinite(qty) ? qty : ""}</td>
                          <td>{Number.isFinite(unit) ? `${currency} ${unit.toFixed(2)}` : ""}</td>
                          <td>{total != null ? `${currency} ${total.toFixed(2)}` : ""}</td>
                          <td>{enteredBy || "-"}</td>
                          <td>
                            <button
                              className="btn"
                              style={{ color: "#b91c1c" }}
                              onClick={async () => {
                                try {
                                  setError("");
                                  await apiDelete(`/requisitions/${requisitionId}/prices/${p.id}`);
                                  await load();
                                } catch (e: any) {
                                  setError(e?.message || "Failed to delete row");
                                }
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {prices.length > 0 ? (
                <div style={{ marginTop: 12 }}>
                  <Link className="btn btn-submit" href={`/requisitions/${params.id}/submissions`}>
                    Review submissions and prepare approval package
                  </Link>
                </div>
              ) : null}
            </div>
          </>
        ) : null}
      </InternalPage>
    </RequireRoles>
  );
}
