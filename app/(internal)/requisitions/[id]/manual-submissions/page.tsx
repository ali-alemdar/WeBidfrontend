"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import BackButton from "../../../../components/BackButton";
import ManualSubmissionForm from "../../../submissions/components/ManualSubmissionForm";
import { apiGet, apiPost, apiDelete, apiPut } from "../../../../lib/api";

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
  const [editingPriceId, setEditingPriceId] = useState<number | null>(null);
  const [editQty, setEditQty] = useState<number>(0);
  const [editUnitPrice, setEditUnitPrice] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  
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
          <BackButton fallbackHref={`/requisitions/${params.id}/view`} />
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

            <div style={{ marginTop: 12 }}>
              <h3 style={{ marginTop: 0 }}>Recorded manual submissions</h3>
              {prices.length === 0 ? (
                <div className="card" style={{ boxShadow: "none" }}>
                  <p style={{ color: "var(--muted)" }}>No manual submissions recorded yet.</p>
                </div>
              ) : (
                <>
                  {(() => {
                    // Group prices by supplier
                    const groupedBySupplier: { [key: string]: any[] } = {};
                    prices.forEach((p: any) => {
                      const supplierKey = p.supplierId || p.supplierName || 'Unknown';
                      if (!groupedBySupplier[supplierKey]) {
                        groupedBySupplier[supplierKey] = [];
                      }
                      groupedBySupplier[supplierKey].push(p);
                    });

                    return Object.entries(groupedBySupplier).map(([supplierKey, supplierPrices]) => {
                      const supplierName = supplierPrices[0]?.supplier?.name || supplierPrices[0]?.supplierName || `Supplier ${supplierKey}`;
                      
                      // Calculate supplier subtotal
                      const supplierTotal = supplierPrices.reduce((sum, p) => {
                        const item = items.find((it: any) => Number(it.id) === Number(p.requisitionItemId));
                        const qty = Number(item?.quantity) || 0;
                        const unit = Number(p.unitPrice) || 0;
                        return sum + (qty * unit);
                      }, 0);
                      
                      const currency = supplierPrices[0]?.currency || "IQD";

                      return (
                        <div key={supplierKey} className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
                          <h4 style={{ marginTop: 0, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>{supplierName}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#059669" }}>
                              Subtotal: {currency} {supplierTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </span>
                          </h4>
                          <div style={{ overflowX: "auto" }}>
                            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", minWidth: "900px" }}>
                              <thead>
                                <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "35%" }}>Item</th>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "12%", textAlign: "right" }}>Qty</th>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "18%", textAlign: "right" }}>Unit price</th>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "18%", textAlign: "right" }}>Total</th>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "12%" }}>Entered by</th>
                                  <th style={{ borderBottom: "1px solid #d1d5db", width: "5%" }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {supplierPrices.map((p: any) => {
                                  const item = items.find((it: any) => Number(it.id) === Number(p.requisitionItemId));
                                  const qty = Number(item?.quantity) || 0;
                                  const unit = Number(p.unitPrice) || 0;
                                  const total = qty * unit;
                                  const enteredBy = String(p?.reviewedBy?.fullName || "").trim();
                                  const isEditing = editingPriceId === p.id;
                                  
                                  return (
                                    <tr key={p.id} style={{ borderBottom: "1px solid #e5e7eb", background: isEditing ? "#fef3c7" : "#fafafa" }}>
                                      <td>{item ? item.name : p.requisitionItemId}</td>
                                      <td style={{ textAlign: "right" }}>
                                        {isEditing ? (
                                          <input 
                                            type="number" 
                                            className="input" 
                                            value={editQty}
                                            onChange={(e) => setEditQty(Number(e.target.value))}
                                            style={{ width: "80px", textAlign: "right" }}
                                            step="1"
                                          />
                                        ) : (
                                          qty.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})
                                        )}
                                      </td>
                                      <td style={{ textAlign: "right" }}>
                                        {isEditing ? (
                                          <input 
                                            type="number" 
                                            className="input" 
                                            value={editUnitPrice}
                                            onChange={(e) => setEditUnitPrice(Number(e.target.value))}
                                            style={{ width: "100px", textAlign: "right" }}
                                            step="0.01"
                                          />
                                        ) : (
                                          `${currency} ${unit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                                        )}
                                      </td>
                                      <td style={{ textAlign: "right", fontWeight: 600 }}>
                                        {isEditing 
                                          ? `${currency} ${(editQty * editUnitPrice).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                                          : `${currency} ${total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                                        }
                                      </td>
                                      <td>{enteredBy || "-"}</td>
                                      <td>
                                        <div style={{ display: "flex", gap: 4 }}>
                                          {isEditing ? (
                                            <>
                                              <button
                                                className="btn"
                                                style={{ fontSize: 12, padding: "4px 8px" }}
                                                disabled={saving}
                                                onClick={async () => {
                                                  try {
                                                    setSaving(true);
                                                    setError("");
                                                    
                                                    await apiPut(`/requisitions/${requisitionId}/items/${item.id}`, {
                                                      quantity: Math.floor(editQty)
                                                    });
                                                    
                                                    await apiPut(`/requisitions/${requisitionId}/prices/${p.id}`, {
                                                      unitPrice: editUnitPrice
                                                    });
                                                    
                                                    await load();
                                                    setEditingPriceId(null);
                                                  } catch (e: any) {
                                                    setError(e?.message || "Failed to save changes");
                                                  } finally {
                                                    setSaving(false);
                                                  }
                                                }}
                                              >
                                                {saving ? "Saving..." : "Save"}
                                              </button>
                                              <button
                                                className="btn"
                                                style={{ fontSize: 12, padding: "4px 8px" }}
                                                disabled={saving}
                                                onClick={() => setEditingPriceId(null)}
                                              >
                                                Cancel
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                className="btn"
                                                style={{ fontSize: 12, padding: "4px 8px" }}
                                                disabled={manualLocked}
                                                onClick={() => {
                                                  setEditingPriceId(p.id);
                                                  setEditQty(qty);
                                                  setEditUnitPrice(unit);
                                                }}
                                              >
                                                Edit
                                              </button>
                                              <button
                                                className="btn"
                                                style={{ color: "#b91c1c", fontSize: 12, padding: "4px 8px" }}
                                                disabled={manualLocked}
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
                                            </>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    });
                  })()}

                </>
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