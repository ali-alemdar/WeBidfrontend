"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../../../components/InternalPage";
import RequireRoles from "../../../../../components/RequireRoles";
import ManualEntryBanner from "../../../../../components/ManualEntryBanner";
import { apiGet, apiPost } from "../../../../../lib/api";

interface Props {
  params: { id: string; supplierId: string };
}

function money(n: number) {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SubmissionEntryDevPage({ params }: Props) {
  const requisitionId = params.id;
  const supplierIdNum = Number(params.supplierId);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  const [currency, setCurrency] = useState<string>("IQD");
  const [unitPrices, setUnitPrices] = useState<Record<number, string>>({});

  const status = String(data?.status || "");
  const submissionsLocked = ["TENDER_PREP_SUBMITTED", "TENDER_READY", "CLOSED"].includes(status);

  const load = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const r = await apiGet(`/requisitions/${requisitionId}`);
      setData(r);

      const prices = Array.isArray(r?.supplierPrices) ? r.supplierPrices : [];
      const existingCurrency = prices.find((p: any) => Number(p?.supplierId) === supplierIdNum)?.currency;
      if (existingCurrency) setCurrency(String(existingCurrency));

      const items = Array.isArray(r?.items) ? r.items : [];
      const map: Record<number, string> = {};
      for (const it of items) {
        const row = prices.find(
          (p: any) => Number(p?.supplierId) === supplierIdNum && Number(p?.requisitionItemId) === Number(it.id),
        );
        map[it.id] = row?.unitPrice != null ? String(row.unitPrice) : "";
      }
      setUnitPrices(map);
    } catch (e: any) {
      setError(e?.message || "Failed to load requisition");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisitionId, params.supplierId]);

  const items: any[] = Array.isArray(data?.items) ? data.items : [];

  const totals = useMemo(() => {
    const perItem: Record<number, number> = {};
    let final = 0;
    for (const it of items) {
      const qty = Number(it?.quantity);
      const up = Number(unitPrices[it.id]);
      const t = Number.isFinite(qty) && Number.isFinite(up) ? qty * up : 0;
      perItem[it.id] = t;
      final += t;
    }
    return { perItem, final };
  }, [items, unitPrices]);

  const doAction = async (name: string, fn: () => Promise<any>) => {
    setError("");
    setMessage("");
    setActing(name);
    try {
      await fn();
      setMessage("Saved.");
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const save = () =>
    doAction("save", async () => {
      if (!Number.isFinite(supplierIdNum)) throw new Error("Invalid supplier");
      if (!currency.trim()) throw new Error("Currency is required");
      if (items.length === 0) throw new Error("No items in requisition");

      const lines = items
        .map((it) => {
          const raw = String(unitPrices[it.id] ?? "").trim();
          if (!raw) return null;
          const v = Number(raw);
          if (!Number.isFinite(v) || v <= 0) throw new Error("All entered unit prices must be positive numbers");
          return { requisitionItemId: it.id, unitPrice: v };
        })
        .filter(Boolean) as Array<{ requisitionItemId: number; unitPrice: number }>;

      if (!lines.length) throw new Error("Enter at least one unit price");

      await apiPost(`/requisitions/${requisitionId}/submissions`, {
        supplierId: supplierIdNum,
        currency: currency.trim(),
        lines,
      });
    });

  if (loading && !data) {
    return (
      <InternalPage title="Submission entry">
        <p>Loading…</p>
      </InternalPage>
    );
  }

  if (!data) {
    return (
      <InternalPage title="Submission entry">
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
      </InternalPage>
    );
  }

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title="Submission entry">
      <InternalPage title={`Submission entry / Req ${data.id} / Supplier ${supplierIdNum}`}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <Link className="btn" href={`/submissions/${data.id}/${supplierIdNum}`}>
          Back
        </Link>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}
      {message && <div style={{ color: "#15803d", marginBottom: 12 }}>{message}</div>}

      {data.manualSubmissions ? <ManualEntryBanner note={data.manualSubmissionsNote} /> : null}
      {submissionsLocked ? (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Read-only</div>
          <div style={{ color: "var(--muted)" }}>This requisition is locked for approvals. You cannot add/edit submissions.</div>
        </div>
      ) : null}


      <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
        <label>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Currency</div>
          <input className="input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="e.g., USD" />
        </label>
        <div style={{ marginTop: 10, fontWeight: 800 }}>
          Final: {currency} {money(totals.final)}
        </div>
      </div>

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Enter unit prices</h3>
        <div style={{ color: "var(--muted)", marginBottom: 10 }}>
          Suppliers can submit <strong>partial</strong> quotes: fill prices only where a quote was provided.
        </div>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th>No</th>
              <th>Name</th>
              <th>Qty</th>
              <th>Unit price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>{it.itemNo ?? it.id}</td>
                <td>{it.name}</td>
                <td>{it.quantity}</td>
                <td style={{ width: 180 }}>
                  <input
                    className="input"
                    type="number"
                    value={unitPrices[it.id] ?? ""}
                    onChange={(e) => setUnitPrices((m) => ({ ...m, [it.id]: e.target.value }))}
                    placeholder="0.00"
                  />
                </td>
                <td style={{ width: 200 }}>
                  {currency} {money(totals.perItem[it.id] || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button className="btn btn-submit" disabled={acting !== "" || submissionsLocked} onClick={save}>
            {acting === "save" ? "Saving…" : "Save submission"}
          </button>
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
