"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../../../lib/api";

interface Props {
  params: { token: string };
}

export default function PublicInvitationPage({ params }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [currency, setCurrency] = useState("IQD");
  const [lines, setLines] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiGet(`/api/public/invitations/${params.token}`);
        setData(res);
        // Initialize lines with items
        if (res.requisition?.items) {
          setLines(res.requisition.items.map((item: any) => ({
            requisitionItemId: item.id,
            unitPrice: "",
            quotedDescription: "",
            notes: "",
          })));
        }
        // Set default currency to IQD if available, otherwise first currency
        if (res.currencies?.length > 0) {
          const iqdCurrency = res.currencies.find((c: any) => c.code === "IQD");
          setCurrency(iqdCurrency ? "IQD" : res.currencies[0].code);
        }
      } catch (e: any) {
        setError(e?.message || "Invalid invitation link");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.token]);

  const handleLineChange = (idx: number, field: string, value: any) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const payload = {
        currency,
        lines: lines
          .map((l) => ({
            requisitionItemId: l.requisitionItemId,
            unitPrice: Number(l.unitPrice),
            quotedDescription: l.quotedDescription || null,
            notes: l.notes || null,
          }))
          .filter((l) => Number.isFinite(l.unitPrice) && l.unitPrice > 0),
      };

      if (payload.lines.length === 0) {
        throw new Error("Please enter valid prices for at least one item");
      }

      await apiPost(`/api/public/invitations/${params.token}/submissions`, payload);
      setError("");
      // Mark as submitted locally and update timestamp
      setData((prev: any) => ({
        ...prev,
        alreadySubmitted: true,
        submittedAt: new Date().toISOString(),
      }));
    } catch (e: any) {
      setError(e?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading invitation...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#b91c1c" }}>Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Invitation not found</p>
      </div>
    );
  }

  const supplier = data.supplier;
  const req = data.requisition;
  const items = req?.items || [];
  const alreadySubmitted = data.alreadySubmitted;

  // Show message if already submitted
  if (alreadySubmitted) {
    return (
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
        <div style={{ marginBottom: "2rem" }}>
          <h1>Price Submission for Requisition</h1>
          <p><strong>Supplier:</strong> {supplier?.name}</p>
          <p><strong>Requisition:</strong> {req?.title} (ID: {req?.id})</p>
        </div>

        <div style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "1.5rem", borderRadius: "8px", border: "1px solid #93c5fd" }}>
          <h2 style={{ margin: "0 0 0.5rem 0" }}>Submission Already Received</h2>
          <p style={{ margin: 0 }}>
            Your prices for this requisition have already been submitted on{" "}
            <strong>{data.submittedAt ? new Date(data.submittedAt).toLocaleString() : "a previous date"}</strong>.
          </p>
          <p style={{ margin: "1rem 0 0 0", color: "#1e3a8a" }}>
            Each invitation can only be used once. A confirmation email was sent to your registered email address.
          </p>
          <p style={{ margin: "1rem 0 0 0", color: "#1e3a8a" }}>
            If you need to make changes to your submission, please contact the procurement team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1>Price Submission for Requisition</h1>
        <p><strong>Supplier:</strong> {supplier?.name}</p>
        <p><strong>Requisition:</strong> {req?.title} (ID: {req?.id})</p>
        {req?.deadlineAt && (
          <p><strong>Deadline:</strong> {new Date(req.deadlineAt).toLocaleDateString()}</p>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: "#fee", color: "#b91c1c", padding: "1rem", borderRadius: "4px", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {req?.disclaimerText && (
        <div style={{ backgroundColor: "#f5f5f5", padding: "1rem", borderRadius: "4px", marginBottom: "1rem", color: "#666" }}>
          <strong>Disclaimer:</strong> {req.disclaimerText}
        </div>
      )}

      <div style={{ marginBottom: "1rem" }}>
        <label>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Currency</div>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc", width: "200px" }}
          >
            {(data?.currencies || []).map((c: any) => (
              <option key={c.id} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
            {(!data?.currencies || data.currencies.length === 0) && (
              <option value="IQD">IQD - Iraqi Dinar</option>
            )}
          </select>
        </label>
      </div>

      <table width="100%" cellPadding="12" style={{ borderCollapse: "collapse", marginBottom: "2rem" }}>
        <thead>
          <tr style={{ backgroundColor: "#f5f5f5", borderBottom: "1px solid #ddd" }}>
            <th style={{ textAlign: "left" }}>Item</th>
            <th style={{ textAlign: "left" }}>Description</th>
            <th>Qty</th>
            <th>UOM</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => {
            const line = lines[idx];
            const qty = Number(item.quantity) || 0;
            const unitPrice = Number(line?.unitPrice) || 0;
            const lineTotal = qty * unitPrice;
            return (
              <tr key={item.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td>{item.itemNo || item.id}</td>
                <td>{item.technicalDescription || item.name}</td>
                <td style={{ textAlign: "center" }}>{item.quantity}</td>
                <td style={{ textAlign: "center" }}>{item.uom}</td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Enter price"
                    value={line?.unitPrice || ""}
                    onChange={(e) => handleLineChange(idx, "unitPrice", e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </td>
                <td style={{ textAlign: "right", fontWeight: 500 }}>
                  {unitPrice > 0 ? `${currency} ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ""}
                </td>
                <td>
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    value={line?.notes || ""}
                    onChange={(e) => handleLineChange(idx, "notes", e.target.value)}
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: "#f0f9ff", borderTop: "2px solid #0066cc" }}>
            <td colSpan={5} style={{ textAlign: "right", fontWeight: 700, padding: "1rem" }}>
              Grand Total:
            </td>
            <td style={{ textAlign: "right", fontWeight: 700, padding: "1rem" }}>
              {currency} {items.reduce((sum: number, item: any, idx: number) => {
                const qty = Number(item.quantity) || 0;
                const unitPrice = Number(lines[idx]?.unitPrice) || 0;
                return sum + (qty * unitPrice);
              }, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: "#0066cc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.6 : 1,
          }}
        >
          {submitting ? "Submitting..." : "Submit Prices"}
        </button>
      </div>
    </div>
  );
}
