"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import BackButton from "../../../components/BackButton";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

interface Props {
  params: { id: string };
}

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

function money(n: number) {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function SubmissionRequisitionPage({ params }: Props) {
  const user = getCurrentUser();
  const roles = (user?.roles || []) as any[];

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("SYS_ADMIN");
  const canManagerAct = roles.includes("REQUISITION_MANAGER") || roles.includes("SYS_ADMIN");

  const load = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const r = await apiGet(`/requisitions/${params.id}`);
      setData(r);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const statusLabel = useMemo(() => {
    const status = String(data?.status || "");
    return status === "MANUAL_ENTRY" ? "Manual entry" : status || "";
  }, [data?.status]);

  const isApprovalPending = String(data?.status || "") === "APROVAL_PENDING";

  const invitations: any[] = Array.isArray(data?.invitations) ? data.invitations : [];
  const supplierPrices: any[] = Array.isArray(data?.supplierPrices) ? data.supplierPrices : [];
  const currencyGuess = supplierPrices.find((x) => x?.currency)?.currency || "";
  const biddingFormItems: any[] = Array.isArray(data?.biddingFormItems) ? data.biddingFormItems : [];

  const title = `Submissions / Requisition ${params.id}`;

  const items: any[] = Array.isArray(data?.items) ? data.items : [];

  const pricesByItem = useMemo(() => {
    const m = new Map<number, any[]>();
    for (const p of supplierPrices) {
      const iid = Number(p?.requisitionItemId);
      if (!Number.isFinite(iid)) continue;
      if (!m.has(iid)) m.set(iid, []);
      m.get(iid)!.push(p);
    }
    return m;
  }, [supplierPrices]);

  const itemsById = useMemo(() => {
    const m = new Map<number, any>();
    for (const it of items) {
      const iid = Number(it?.id);
      if (!Number.isFinite(iid)) continue;
      m.set(iid, it);
    }
    return m;
  }, [items]);

  const totalsBySupplier = useMemo(() => {
    const totals = new Map<number, number>();
    for (const p of supplierPrices) {
      const sid = Number(p?.supplierId);
      const iid = Number(p?.requisitionItemId);
      if (!Number.isFinite(sid) || !Number.isFinite(iid)) continue;
      const item = itemsById.get(iid);
      if (!item) continue;
      const qty = Number(item?.quantity);
      const unit = Number(p?.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty <= 0 || unit <= 0)
        continue;
      const lineTotal = qty * unit;
      totals.set(sid, (totals.get(sid) || 0) + lineTotal);
    }
    return totals;
  }, [supplierPrices, itemsById]);

  const itemStats = useMemo(() => {
    const m: Record<number, { min: number | null; max: number | null; avg: number | null; currency: string | null }> = {};

    for (const it of items) {
      const rows = pricesByItem.get(Number(it.id)) || [];
      const values = rows
        .map((r: any) => Number(r?.unitPrice))
        .filter((x: number) => Number.isFinite(x));

      const currencies = rows
        .map((r: any) => String(r?.currency || ""))
        .filter(Boolean);

      const curSet = new Set(currencies);
      const currency = curSet.size === 1 ? Array.from(curSet)[0] : null;

      if (!values.length) {
        m[it.id] = { min: null, max: null, avg: null, currency };
        continue;
      }

      const min = Math.min(...values);
      const max = Math.max(...values);
      const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
      m[it.id] = { min, max, avg, currency };
    }

    return m;
  }, [items, pricesByItem]);

  const recommendedLines = useMemo(() => {
    // Choose the submission (supplier) with the lowest grand total across all items.
    const totalsBySupplier = new Map<number, number>();

    for (const p of supplierPrices) {
      const sid = Number(p?.supplierId);
      const iid = Number(p?.requisitionItemId);
      if (!Number.isFinite(sid) || !Number.isFinite(iid)) continue;
      const item = itemsById.get(iid);
      if (!item) continue;

      const qty = Number(item?.quantity);
      const unit = Number(p?.unitPrice);
      if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty <= 0 || unit <= 0)
        continue;

      const lineTotal = qty * unit;
      totalsBySupplier.set(sid, (totalsBySupplier.get(sid) || 0) + lineTotal);
    }

    if (!totalsBySupplier.size) {
      return [] as any[];
    }

    let bestSupplierId: number | null = null;
    let bestTotal = Infinity;
    for (const [sid, total] of totalsBySupplier.entries()) {
      if (total < bestTotal) {
        bestTotal = total;
        bestSupplierId = sid;
      }
    }

    if (!Number.isFinite(bestSupplierId as number)) {
      return [] as any[];
    }

    const pricesForBest = supplierPrices.filter(
      (p: any) => Number(p?.supplierId) === (bestSupplierId as number),
    );
    const priceByItem = new Map<number, any>();
    for (const p of pricesForBest) {
      const iid = Number(p?.requisitionItemId);
      if (!Number.isFinite(iid)) continue;
      priceByItem.set(iid, p);
    }

    const lines = items.map((it: any) => {
      const iid = Number(it.id);
      const priceRow = priceByItem.get(iid);
      const qty = Number(it?.quantity);
      const unit = Number(priceRow?.unitPrice);
      const total =
        Number.isFinite(qty) && Number.isFinite(unit) && qty > 0 && unit > 0
          ? qty * unit
          : null;
      const currency = String(priceRow?.currency || currencyGuess || "");
      const priceItem: any = priceRow?.item;

      return {
        id: it.id,
        itemNo: it.itemNo ?? it.id,
        description:
          priceItem?.technicalDescription ||
          priceItem?.name ||
          it.technicalDescription ||
          it.name,
        uom: it.uom,
        qty: Number.isFinite(qty) ? qty : null,
        unit,
        total,
        currency,
      };
    });

    return lines;
  }, [items, itemsById, supplierPrices, currencyGuess]);

  const recommendedGrandTotal = useMemo(() => {
    return recommendedLines.reduce((acc, l) => {
      return acc + (Number.isFinite(l.total) ? (l.total as number) : 0);
    }, 0);
  }, [recommendedLines]);

  if (loading && !data) {
    return (
      <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
        <InternalPage title={title}>
          <p>Loading…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (!data) {
    return (
      <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]}>
        <InternalPage title={title}>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "SYS_ADMIN"]} title={title}>
      <InternalPage title={title}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <BackButton fallbackHref="/submissions" />
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
        {message && <div style={{ color: "#15803d", marginBottom: 12 }}>{message}</div>}


        {canManagerAct && isApprovalPending ? (
          <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Manager actions</h3>
            <p style={{ marginTop: 0, color: "var(--muted)" }}>
              Decide on the approval package for this requisition.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                className="btn btn-primary"
                disabled={loading}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-approve`, {});
                    await load();
                  } catch (e: any) {
                    setError(e?.message || "Failed to approve");
                  }
                }}
              >
                Approve
              </button>
              <button
                className="btn"
                disabled={loading}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-reject`, { reason: null });
                    await load();
                  } catch (e: any) {
                    setError(e?.message || "Failed to return to officers");
                  }
                }}
              >
                Return to officers
              </button>
              <button
                className="btn"
                style={{ color: "#b91c1c" }}
                disabled={loading}
                onClick={async () => {
                  setError("");
                  setMessage("");
                  try {
                    await apiPost(`/requisitions/${data.id}/tender-prep/manager-archive`, { reason: null });
                    await load();
                  } catch (e: any) {
                    setError(e?.message || "Failed to reject and archive");
                  }
                }}
              >
                Reject & archive
              </button>
            </div>
          </div>
        ) : null}

        <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Submissions summary / Requisition {data.id}</h3>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <span className="pill">Status: {statusLabel}</span>
            <span className="pill">Invited: {invitations.length}</span>
            <span className="pill">Price rows: {supplierPrices.length}</span>
            {currencyGuess ? <span className="pill">Currency: {currencyGuess}</span> : null}
            {data.deadlineAt ? <span className="pill">Deadline: {isoDate(data.deadlineAt)}</span> : null}
          </div>
        </div>

        {/* Suppliers list (hidden when using manual submissions mode) */}
        {!data.manualSubmissions ? (
          <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
            <h3 style={{ marginTop: 0 }}>Suppliers</h3>
            <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left" }}>
                  <th>Supplier</th>
                  <th>Invited / Manual</th>
                  <th>Submitted rows</th>
                  <th style={{ width: 200 }}>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv: any) => {
                  const sid = Number(inv?.supplierId);
                  const rowsForSupplier = supplierPrices.filter((p: any) => Number(p?.supplierId) === sid);
                  const totalForSupplier = totalsBySupplier.get(sid) || 0;
                  return (
                    <tr key={inv.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>{inv?.supplier?.name || sid}</td>
                      <td>{data.manualSubmissions ? <span className="pill">Manual</span> : "Invited"}</td>
                      <td>{rowsForSupplier.length}</td>
                      <td>
                        {currencyGuess} {Number.isFinite(totalForSupplier) && totalForSupplier > 0 ? money(totalForSupplier) : ""}
                      </td>
                      <td style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {Number.isFinite(sid) ? (
                          <Link className="btn" href={`/submissions/${data.id}/${sid}`}>
                            Open
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {!invitations.length ? (
                  <tr>
                    <td colSpan={4} style={{ color: "var(--muted)" }}>
                      No invited suppliers.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Submissions by item */}
        <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Submissions by item</h3>

          {items.map((it) => {
            const rows = pricesByItem.get(Number(it.id)) || [];
            const st = itemStats[it.id] || { min: null, max: null, avg: null, currency: null };
            const qty = Number(it?.quantity);

            return (
              <div key={it.id} style={{ borderTop: "1px solid var(--border)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                  <div style={{ fontWeight: 900 }}>
                    Item {it.itemNo ?? it.id}: {it.name}
                  </div>
                  {st.avg != null ? (
                    <span className="pill">
                      Avg: {st.currency || currencyGuess || ""} {money(st.avg as number)}
                    </span>
                  ) : null}
                  {st.min != null ? (
                    <span className="pill">
                      Lowest: {st.currency || currencyGuess || ""} {money(st.min as number)}
                    </span>
                  ) : null}
                  {st.max != null ? (
                    <span className="pill">
                      Highest: {st.currency || currencyGuess || ""} {money(st.max as number)}
                    </span>
                  ) : null}
                </div>

                <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 4 }}>
                  Qty: {Number.isFinite(qty) ? qty : ""} {it.uom || ""}
                </div>

                <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse", marginTop: 8 }}>
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>Supplier</th>
                      <th style={{ width: 160 }}>Unit price</th>
                      <th style={{ width: 180 }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((p: any) => {
                      const sid = Number(p?.supplierId);
                      const unitPrice = Number(p?.unitPrice);
                      const currency = String(p?.currency || "");
                      const total = Number.isFinite(qty) && Number.isFinite(unitPrice) ? qty * unitPrice : 0;
                      return (
                        <tr key={p.id} style={{ borderTop: "1px solid var(--border)" }}>
                          <td>{p?.supplier?.name || sid}</td>
                          <td>
                            {currency} {Number.isFinite(unitPrice) ? money(unitPrice) : ""}
                          </td>
                          <td>
                            {currency} {money(total)}
                          </td>
                        </tr>
                      );
                    })}

                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ color: "var(--muted)" }}>
                          No submitted prices for this item yet.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>

        {/* Recommended prices (invoice-style) */}
        <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
          <h3 style={{ marginTop: 0 }}>Recommended approval package</h3>
          <p style={{ marginTop: 0, color: "var(--muted)" }}>
            This table shows the recommended approval package (unit prices multiplied by requested quantities).
          </p>
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>No</th>
                <th>Description</th>
                <th>UOM</th>
                <th>Qty</th>
                <th>Unit price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {recommendedLines.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{l.itemNo}</td>
                  <td>{l.description}</td>
                  <td>{l.uom}</td>
                  <td>{Number.isFinite(l.qty) ? l.qty : ""}</td>
                  <td>
                    {l.currency} {Number.isFinite(l.unit) ? money(l.unit as number) : ""}
                  </td>
                  <td>
                    {l.currency} {Number.isFinite(l.total) ? money(l.total as number) : ""}
                  </td>
                </tr>
              ))}
              {recommendedLines.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No recommended prices captured in approval package yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
            {recommendedLines.length > 0 ? (
              <tfoot>
                <tr>
                  <td colSpan={5} style={{ textAlign: "right", fontWeight: 800 }}>
                    Grand total
                  </td>
                  <td>
                    {currencyGuess || (recommendedLines[0]?.currency || "")} {money(recommendedGrandTotal)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>

        {isOfficer && supplierPrices.length > 0 ? (
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              className="btn btn-primary"
              disabled={loading || !supplierPrices.length}
              onClick={async () => {
                setError("");
                setMessage("");
                try {
                  // Officer-side preparation of approval package:
                  // 1) calculate reference prices from submissions
                  await apiPost(`/requisitions/${data.id}/reference-price/calculate`, {});
                  // 2) build bidding-form / approval package rows seeded with averages
                  await apiPost(`/requisitions/${data.id}/bidding-form/prepare`, {});
                  // 3) Navigate to the approval-package editor view so officers can
                  //    review and adjust the recommended unit prices.
                  if (typeof window !== "undefined") {
                    window.location.href = `/requisitions/${data.id}/view`;
                  }
                } catch (e: any) {
                  setError(e?.message || "Failed to prepare approval package");
                }
              }}
            >
              Prepare approval package
            </button>
            {data.manualSubmissions ? (
              <Link className="btn" href={`/requisitions/${data.id}/manual-submissions`}>
                Add more submissions
              </Link>
            ) : null}
          </div>
        ) : null}

        <p style={{ color: "var(--muted)", marginTop: 12 }}>
          This view summarises supplier submissions by supplier and by item. For per-supplier details and editing, use the
          "Open" links above.
        </p>
      </InternalPage>
    </RequireRoles>
  );
}
