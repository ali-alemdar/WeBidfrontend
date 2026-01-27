"use client";

import React, { useEffect, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet } from "../../../../lib/api";

interface Props {
  params: { id: string };
}

const PAGE_STYLE: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
};

export default function RequisitionApprovalPrintPage({ params }: Props) {
  const [data, setData] = useState<any | null>(null);
  const [form, setForm] = useState<any | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const [r, f, t] = await Promise.all([
          apiGet(`/requisitions/${params.id}`),
          apiGet(`/requisitions/${params.id}/approval-form`),
          apiGet(`/tenant`),
        ]);
        setData(r);
        setForm(f);
        setTenant(t || null);
      } catch (e: any) {
        setError(e?.message || "Failed to load approval form");
      } finally {
        setLoading(false);
        if (typeof window !== "undefined") {
          setTimeout(() => window.print(), 200);
        }
      }
    };
    load();
  }, [params.id]);

  if (loading && !data) {
    return (
      <RequireRoles
        anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDER_APPROVAL", "SYS_ADMIN"]}
        title={`Requisition ${params.id} / Approval form`}
      >
        <InternalPage title={`Requisition ${params.id} / Approval form`}>
          <p>Loading…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (!data) {
    return (
      <RequireRoles
        anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDER_APPROVAL", "SYS_ADMIN"]}
        title={`Requisition ${params.id} / Approval form`}
      >
        <InternalPage title={`Requisition ${params.id} / Approval form`}>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
        </InternalPage>
      </RequireRoles>
    );
  }

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const signatures: any[] = Array.isArray(form?.signatures) ? form.signatures : [];

  // Derive manager user id to avoid rendering them twice in signatures grid.
  const managerUserId: number | null = (() => {
    const m: any = data.manager || {};
    if (m.userId != null) return Number(m.userId);
    if (m.id != null) return Number(m.id);
    if ((data as any).managerId != null) return Number((data as any).managerId);
    return null;
  })();

  const officerSignatures: any[] = signatures.filter((s: any) => {
    const role = String(s.role || "").toUpperCase();
    if (role !== "OFFICER") return false;
    if (managerUserId == null) return true;
    return Number(s.userId) !== managerUserId;
  });

  const formatDateTime = (v: any) => {
    if (!v) return "";
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return "";
      // Local date/time, explicit format: YYYY-MM-DD HH:MM
      const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      const hours = pad(d.getHours());
      const mins = pad(d.getMinutes());
      return `${year}-${month}-${day} ${hours}:${mins}`;
    } catch {
      return "";
    }
  };

  const managerSignature: any | null =
    signatures.find(
      (s: any) => String(s.role || "").toUpperCase() === "MANAGER",
    ) || null;

  return (
    <RequireRoles
      anyOf={["REQUISITION_OFFICER", "REQUISITION_MANAGER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title={`Requisition ${data.id} / Approval form`}
    >
      <InternalPage title={`Requisition ${data.id} / Approval form`}>
        <style jsx global>{`
          @page {
            size: A4;
            margin: 12mm;
          }
          @media print {
            html, body {
              height: auto;
            }
            body {
              margin: 0;
              padding: 0;
            }
.approval-print-page {
              box-sizing: border-box;
              width: 100%;
            }
            .approval-print-avoid-break {
              page-break-inside: avoid;
              break-inside: avoid;
            }
          }
        `}</style>
        <div
          className="approval-print-page"
          style={PAGE_STYLE}
        >
          <div
            className="approval-print-avoid-break"
            style={{
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: 12,
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {tenant?.logoUrl && (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name || "Company logo"}
                  style={{ maxHeight: 40, objectFit: "contain" }}
                />
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {tenant?.name || "Company name"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  Requisition approval form
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280" }}>
              <div>Requisition #{data.id}</div>
              <div>{data.requestingDepartment}</div>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Subject</div>
            <div>{data.title}</div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Comments / justification</div>
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 8,
                minHeight: 60,
                fontSize: 13,
                whiteSpace: "pre-wrap",
              }}
            >
              {form?.comment || ""}
            </div>
          </div>

          <div style={{ marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
            <p>
              This form summarizes the approved requisition, including items and final prices.
            </p>
            <p>
              It is used for internal authorization before proceeding to tendering or direct
              purchase.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.2fr 1.2fr",
              gap: 12,
              fontSize: 13,
            }}
          >
            <div>
              <div>
                <strong>Requester:</strong> {data.createdBy?.fullName || data.createdBy?.email}
              </div>
              <div>
                <strong>Department:</strong> {data.requestingDepartment}
              </div>
              <div>
                <strong>Purpose:</strong> {data.purpose}
              </div>
            </div>
            <div>
              <div>
                <strong>Manager:</strong> {data.manager?.fullName || "(Not assigned)"}
              </div>
              <div>
                <strong>Created at:</strong> {String(data.createdAt).slice(0, 10)}
              </div>
              <div>
                <strong>Status:</strong> {data.status}
              </div>
            </div>
          </div>

          <div className="approval-print-avoid-break" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Items and prices</div>
            <table
              width="100%"
              cellPadding={6}
              style={{ borderCollapse: "collapse", fontSize: 12 }}
            >
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                  <th>#</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>UOM</th>
                  <th style={{ textAlign: "right" }}>Qty</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it: any) => (
                  <tr key={it.id} style={{ borderTop: "1px solid #f3f4f6" }}>
                    <td>{it.itemNo ?? it.id}</td>
                    <td>{it.itemType || ""}</td>
                    <td>{it.technicalDescription || it.name}</td>
                    <td>{it.uom}</td>
                    <td style={{ textAlign: "right" }}>{it.quantity}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ color: "#9ca3af", fontStyle: "italic" }}>
                      No items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="approval-print-avoid-break" style={{ marginTop: 20 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Signatures</div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                gap: 12,
                fontSize: 12,
              }}
            >
              {officerSignatures.map((s: any) => (
                <div
                  key={`${s.userId}-${s.role}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    minHeight: 80,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {s.user?.fullName || s.user?.email || s.role}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      borderTop: "1px dashed #d1d5db",
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {s.signatureData ? (
                      <img
                        src={s.signatureData}
                        alt="Signature"
                        style={{
                          maxHeight: 36,
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 11 }}>
                    {s.signedAt
                      ? `Signed at ${formatDateTime(s.signedAt)}`
                      : "Not signed"}
                  </div>
                </div>
              ))}

              {managerSignature && (
                <div
                  key={`manager-${managerSignature.userId}`}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    padding: 8,
                    minHeight: 80,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontWeight: 600 }}>
                    {managerSignature.user?.fullName ||
                      managerSignature.user?.email ||
                      "Manager"}
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      borderTop: "1px dashed #d1d5db",
                      height: 40,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {managerSignature.signatureData ? (
                      <img
                        src={managerSignature.signatureData}
                        alt="Manager signature"
                        style={{
                          maxHeight: 36,
                          maxWidth: "100%",
                          objectFit: "contain",
                        }}
                      />
                    ) : null}
                  </div>
                  <div style={{ marginTop: 6, color: "#6b7280", fontSize: 11 }}>
                    {managerSignature.signedAt
                      ? `Signed at ${formatDateTime(managerSignature.signedAt)}`
                      : "Not signed"}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </InternalPage>
    </RequireRoles>
  );
}