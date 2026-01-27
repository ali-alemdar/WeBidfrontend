"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import ManualEntryBanner from "../../../../components/ManualEntryBanner";
import { apiGet } from "../../../../lib/api";

interface Props {
  params: { id: string; supplierId: string };
}

function money(n: number) {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function SubmissionSupplierDetailPage({ params }: Props) {
  const requisitionId = params.id;
  const supplierId = Number(params.supplierId);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet(`/requisitions/${requisitionId}`);
      setData(r);
    } catch (e: any) {
      setError(e?.message || "Failed to load submission");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requisitionId, params.supplierId]);

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const invitations: any[] = Array.isArray(data?.invitations) ? data.invitations : [];
  const supplierPrices: any[] = Array.isArray(data?.supplierPrices) ? data.supplierPrices : [];

  const statusLabel = String(data?.status || "") === "MANUAL_ENTRY" ? "Manual entry" : String(data?.status || "");

  const supplierName = useMemo(() => {
    const inv = invitations.find((x) => Number(x?.supplierId) === supplierId);
    if (inv?.supplier?.name) return String(inv.supplier.name);

    const fromPrices = supplierPrices.find((p) => Number(p?.supplierId) === supplierId)?.supplier?.name;
    return fromPrices || String(supplierId);
  }, [invitations, supplierId, supplierPrices]);

  const rows = useMemo(() => {
    return supplierPrices.filter((p) => Number(p?.supplierId) === supplierId);
  }, [supplierPrices, supplierId]);

  const byItemId = useMemo(() => {
    const m = new Map<number, any>();
    for (const r of rows) m.set(Number(r?.requisitionItemId), r);
    return m;
  }, [rows]);

  const currency = rows.find((r) => r?.currency)?.currency || "";

  const totals = useMemo(() => {
    const perItem: Record<number, number> = {};
    let final = 0;
    for (const it of items) {
      const qty = Number(it?.quantity);
      const priceRow = byItemId.get(Number(it.id));
      const up = Number(priceRow?.unitPrice);
      const t = Number.isFinite(qty) && Number.isFinite(up) ? qty * up : 0;
      perItem[it.id] = t;
      final += t;
    }
    return { perItem, final };
  }, [items, byItemId]);

  if (loading && !data) {
    return (
      <InternalPage title="Submission">
        <p>Loading…</p>
      </InternalPage>
    );
  }

  if (!data) {
    return (
      <InternalPage title="Submission">
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
      </InternalPage>
    );
  }

  return (
    <RequireRoles anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDERING_OFFICER", "COMMITTEE_CHAIR", "SYS_ADMIN"]}>
      <InternalPage title={`Submission / Req ${data.id} / ${supplierName}${statusLabel ? ` (${statusLabel})` : ""}`}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }} />

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {data.manualSubmissions ? <ManualEntryBanner note={data.manualSubmissionsNote} /> : null}

      <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <span className="pill">Supplier: {supplierName}</span>
          <span className="pill">Submitted rows: {rows.length}</span>
          {currency ? <span className="pill">Currency: {currency}</span> : null}
          <span className="pill">Final: {currency} {money(totals.final)}</span>
          {rows.find((x: any) => x?.attachmentUrl)?.attachmentUrl ? (
            <a
              className="btn"
              href={`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001"}/uploads/${String(
                rows.find((x: any) => x?.attachmentUrl)?.attachmentUrl,
              ).replace(/\\/g, "/")}`}
              target="_blank"
              rel="noreferrer"
            >
              Attachment
            </a>
          ) : null}
        </div>
      </div>

      <div className="card" style={{ boxShadow: "none" }}>
        <h3 style={{ marginTop: 0 }}>Submission</h3>
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
            {items.map((it) => {
              const row = byItemId.get(Number(it.id));
              const up = row?.unitPrice != null ? Number(row.unitPrice) : NaN;
              const total = totals.perItem[it.id] || 0;
              return (
                <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{it.itemNo ?? it.id}</td>
                  <td>{it.name}</td>
                  <td>{it.quantity}</td>
                  <td>{Number.isFinite(up) ? `${currency} ${money(up)}` : ""}</td>
                  <td>
                    {currency} {money(total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {!rows.length ? (
          <p style={{ marginTop: 10, color: "var(--muted)" }}>
            No submission recorded yet for this supplier.
          </p>
        ) : null}
      </div>

      {/* Supplier notes from external/email submission */}
      {rows.some((x: any) => x?.notes) ? (
        <div className="card" style={{ boxShadow: "none", marginTop: 12 }}>
          <h3 style={{ marginTop: 0 }}>Supplier notes</h3>
          <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
            {rows
              .map((x: any) => String(x?.notes || "").trim())
              .filter((v: string, idx: number, arr: string[]) => v && arr.indexOf(v) === idx)
              .join("\n\n")}
          </div>
        </div>
      ) : null}
      </InternalPage>
    </RequireRoles>
  );
}
