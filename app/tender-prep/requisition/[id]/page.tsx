"use client";

import { useEffect, useState } from "react";
import { apiGet } from "../../../lib/api";

interface Props {
  params: { id: string };
}

export default function TenderRequisitionReadonlyStandalonePage({ params }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const res = await apiGet(`/tenders/${params.id}/requisition-readonly`);
        setData(res);
      } catch (e: any) {
        setError(e?.message || "Failed to load requisition");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.id]);

  if (loading && !data) {
    return (
      <div style={{ padding: 16 }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 16 }}>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
      </div>
    );
  }

  const items: any[] = Array.isArray(data.items) ? data.items : [];

  const pricing = data.pricingSummary || {};
  const grandTotal: number = Number(pricing.grandTotal ?? 0);
  const grandCurrency: string = String(pricing.currency || "");

  const formatCurrency = (amount: number | null | undefined, code?: string | null) => {
    if (amount == null || !Number.isFinite(Number(amount))) return "";
    const num = Number(amount);
    const formatted = num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const cur = code && String(code).trim();
    return cur ? `${cur} ${formatted}` : formatted;
  };

  return (
    <div style={{ padding: 16 }}>
      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: 8,
          padding: 12,
          marginBottom: 12,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Header</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800 }}>Title</div>
            <div>{data.title}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Requesting department</div>
            <div>{data.requestingDepartment || ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Purpose</div>
            <div>{data.purpose || ""}</div>
          </div>
          <div>
            <div style={{ fontWeight: 800 }}>Created by</div>
            <div>{data.createdBy?.fullName || data.createdBy?.email || ""}</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}>
          <div style={{ fontWeight: 800 }}>Details</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{data.description || ""}</div>
        </div>
      </div>

      <div
        style={{
          border: "1px solid var(--border, #e5e7eb)",
          borderRadius: 8,
          padding: 12,
          background: "#fff",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Items, prices & attachments</h3>
        <table
          width="100%"
          cellPadding={8}
          style={{ borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr style={{ textAlign: "left" }}>
              <th style={{ width: 40 }}>#</th>
              <th>Name</th>
              <th style={{ width: 80 }}>Type</th>
              <th style={{ width: 80 }}>UOM</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 120 }}>Unit price</th>
              <th style={{ width: 120 }}>Total</th>
              <th style={{ width: 260 }}>Attachments</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, idx: number) => {
              const attachments = Array.isArray(it.attachments)
                ? it.attachments
                : [];
              const unit =
                it.finalUnitPrice != null
                  ? Number(it.finalUnitPrice)
                  : it.referencePrice != null
                  ? Number(it.referencePrice)
                  : NaN;
              const rowCurrency = it.currency || grandCurrency || "";
              const qtyNum = Number(it.quantity);
              const lineTotal =
                Number.isFinite(unit) && Number.isFinite(qtyNum)
                  ? unit * qtyNum
                  : NaN;
              const apiBase =
                process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

              return (
                <tr
                  key={it.id}
                  style={{ borderTop: "1px solid var(--border, #e5e7eb)", verticalAlign: "top" }}
                >
                  <td>{it.itemNo ?? idx + 1}</td>
                  <td>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    {it.technicalDescription && (
                      <div
                        style={{
                          whiteSpace: "pre-wrap",
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        {it.technicalDescription}
                      </div>
                    )}
                  </td>
                  <td>{String(it.itemType || "MATERIAL").toUpperCase()}</td>
                  <td>{it.uom}</td>
                  <td>{it.quantity}</td>
                  <td>
                    {Number.isFinite(unit)
                      ? formatCurrency(unit, rowCurrency)
                      : ""}
                  </td>
                  <td>
                    {Number.isFinite(lineTotal)
                      ? formatCurrency(lineTotal, rowCurrency)
                      : ""}
                  </td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                        maxWidth: 480,
                        color: "#6b7280",
                      }}
                    >
                      {attachments.length === 0 && (
                        <span style={{ color: "#9ca3af" }}>No attachments</span>
                      )}
                      {attachments.map((a: any) => {
                        const href = a?.url
                          ? `${apiBase}${String(a.url)}`
                          : a?.storagePath
                          ? `${apiBase}/uploads/${String(a.storagePath)
                              .replace(/\\\\/g, "/")
                              .replace(/^\/+/, "")}`
                          : undefined;
                        if (!href) return null;
                        return (
                          <a
                            key={a.id}
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: "inherit",
                              textDecoration: "underline",
                            }}
                          >
                            {a.fileName}
                          </a>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "#9ca3af" }}>
                  No items.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {Number.isFinite(grandTotal) && grandTotal > 0 && (
          <div style={{ marginTop: 8, fontWeight: 700 }}>
            Grand total: {formatCurrency(grandTotal, grandCurrency || null)}
          </div>
        )}
      </div>
    </div>
  );
}
