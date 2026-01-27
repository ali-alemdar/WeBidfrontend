"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiUpload } from "../../../lib/api";

interface ManualSubmissionFormProps {
  requisitionId: number;
  items: Array<{ id: number; name: string; quantity: number; uom?: string; technicalDescription?: string | null }>;
  onSaved?: () => void;
}

export default function ManualSubmissionForm({ requisitionId, items, onSaved }: ManualSubmissionFormProps) {
  const [supplierName, setSupplierName] = useState("");
  const [currency, setCurrency] = useState("IQD");
  const [unitPrices, setUnitPrices] = useState<Record<number, string>>({});
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState<Array<{ code: string; name: string; isActive: boolean }>>([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setLoadingCurrencies(true);
        const rows = await apiGet(`/currencies`);
        const list = Array.isArray(rows) ? rows.filter((r: any) => r.isActive) : [];
        setCurrencies(list);
        if (list.length > 0 && !list.some((c) => c.code === "IQD")) {
          setCurrency(list[0].code);
        }
      } catch {
        // ignore; keep default IQD only
      } finally {
        setLoadingCurrencies(false);
      }
    };
    loadCurrencies();
  }, []);

  const onSubmit = async () => {
    setError("");
    setMessage("");
    const name = supplierName.trim();
    if (!name) {
      setError("Company name is required");
      return;
    }
    const cur = currency.trim();
    if (!cur) {
      setError("Currency is required");
      return;
    }

    const lines = items
      .map((it) => {
        const raw = String(unitPrices[it.id] ?? "").trim();
        if (!raw) return null;
        const n = Number(raw);
        if (!Number.isFinite(n) || n <= 0) {
          throw new Error("All entered unit prices must be positive numbers");
        }
        return { requisitionItemId: it.id, unitPrice: n };
      })
      .filter(Boolean) as Array<{ requisitionItemId: number; unitPrice: number }>;

    if (!lines.length) {
      setError("Enter at least one unit price");
      return;
    }

    setSaving(true);
    try {
      let attachmentStoragePath: string | null = null;
      if (attachmentFile) {
        const fd = new FormData();
        fd.append("file", attachmentFile);
        const up = await apiUpload(`/requisitions/${requisitionId}/submissions/attachments`, fd);
        attachmentStoragePath = String(up?.storagePath || "") || null;
      }

      await apiPost(`/requisitions/${requisitionId}/submissions`, {
        supplierName: name,
        currency: cur,
        lines,
        attachmentStoragePath,
      });

      setMessage("Manual submission saved");
      setSupplierName("");
      setCurrency("IQD");
      setUnitPrices({});
      setAttachmentFile(null);
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || "Failed to save manual submission");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ boxShadow: "none", marginBottom: 12 }}>
      <h3 style={{ marginTop: 0 }}>Manual submission</h3>

      {error && <div style={{ color: "#b91c1c", marginBottom: 8 }}>{error}</div>}
      {message && <div style={{ color: "#15803d", marginBottom: 8 }}>{message}</div>}

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <label>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Company name</div>
          <input className="input" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
        </label>

        <label style={{ maxWidth: 240 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Currency</div>
          <select
            className="input"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            disabled={loadingCurrencies}
          >
            <option value="IQD">IQD - Iraqi Dinar</option>
            {currencies
              .filter((c) => c.code !== "IQD")
              .map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.name}
                </option>
              ))}
          </select>
        </label>

        <label style={{ maxWidth: 520 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Attachment (pdf/jpg)</div>
          <input
            className="input"
            type="file"
            accept="application/pdf,image/jpeg"
            onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
              <th>Item</th>
              <th style={{ width: 140 }}>Qty</th>
              <th style={{ width: 220 }}>Unit price</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} style={{ borderTop: "1px solid var(--border)" }}>
                <td>
                  <div style={{ fontWeight: 800 }}>{it.name}</div>
                  <div style={{ color: "var(--muted)", fontSize: 12 }}>
                    {String(it.technicalDescription || "").slice(0, 140)}
                  </div>
                </td>
                <td>
                  {it.quantity} {it.uom}
                </td>
                <td>
                  <input
                    className="input"
                    value={unitPrices[it.id] ?? ""}
                    onChange={(e) => setUnitPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                    placeholder="0.00"
                  />
                </td>
              </tr>
            ))}
            {items.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)" }}>
                  No items found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn btn-submit" disabled={saving} onClick={onSubmit}>
          {saving ? "Saving…" : "Save manual submission"}
        </button>
      </div>
    </div>
  );
}
