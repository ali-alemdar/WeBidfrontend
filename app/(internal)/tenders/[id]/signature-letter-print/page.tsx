"use client";

import { useEffect, useState } from "react";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet } from "../../../../lib/api";

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

function isoDateTime(v: any) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function SignaturesBlock({ form }: { form: any }) {
  const officers: any[] = Array.isArray(form?.officers) ? form.officers : [];
  const managerSignature: any = form?.managerSignature || null;
  const managerName = managerSignature?.fullName || form?.managerName || "";

  return (
    <div style={{ marginTop: 32 }}>
      <h4 style={{ marginTop: 0, marginBottom: 8 }}>Signatures</h4>
      <div
        style={{
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {officers.map((o) => (
          <div
            key={o.userId}
            style={{ minWidth: 180, fontSize: 13, borderTop: "1px solid #d1d5db", paddingTop: 4 }}
          >
            {o.signatureData ? (
              <div
                style={{
                  border: "1px dashed #d1d5db",
                  borderRadius: 6,
                  padding: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  marginBottom: 4,
                }}
              >
                <img
                  src={o.signatureData}
                  alt="Signature"
                  style={{
                    maxHeight: 40,
                    maxWidth: 160,
                    objectFit: "contain",
                    borderRadius: 4,
                  }}
                />
              </div>
            ) : null}
            <div style={{ fontWeight: 600 }}>{o.fullName}</div>
            <div style={{ color: "#6b7280" }}>
              {o.signedAt ? `Signed at ${isoDateTime(o.signedAt)}` : "Pending"}
            </div>
          </div>
        ))}
        {managerSignature ? (
          <div
            style={{ minWidth: 180, fontSize: 13, borderTop: "1px solid #d1d5db", paddingTop: 4 }}
          >
            {managerSignature?.signatureData ? (
              <div
                style={{
                  border: "1px dashed #d1d5db",
                  borderRadius: 6,
                  padding: 4,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#f9fafb",
                  marginBottom: 4,
                }}
              >
                <img
                  src={managerSignature.signatureData}
                  alt="Manager signature"
                  style={{
                    maxHeight: 40,
                    maxWidth: 160,
                    objectFit: "contain",
                    borderRadius: 4,
                  }}
                />
              </div>
            ) : null}
            <div style={{ fontWeight: 600 }}>{managerName}</div>
            <div style={{ color: "#6b7280" }}>
              {managerSignature?.signedAt
                ? `Signed at ${isoDateTime(managerSignature.signedAt)}`
                : "Pending"}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function TenderSignatureLetterPrintPage({ params }: Props) {
  const [form, setForm] = useState<any | null>(null);
  const [tenant, setTenant] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [overrideComment, setOverrideComment] = useState<string | null>(null);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [f, t] = await Promise.all([
        apiGet(`/tenders/${params.id}/signature-form`),
        apiGet(`/tenant`),
      ]);
      setForm(f || null);
      setTenant(t || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load tender signature form");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params.id]);

  // Read transient comment from opener / localStorage, same as main print
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const op: any = window.opener;
      if (op && op.__TENDER_SIG_COMMENT__ && op.__TENDER_SIG_COMMENT__[params.id]) {
        setOverrideComment(String(op.__TENDER_SIG_COMMENT__[params.id]));
        return;
      }
    } catch {
      // ignore
    }
    try {
      const key = `tenderSigComment-${params.id}`;
      const stored = window.localStorage.getItem(key);
      if (stored && stored.length) {
        setOverrideComment(stored);
      }
    } catch {
      // ignore
    }
  }, [params.id]);

  // Auto-print when ready
  useEffect(() => {
    if (!loading && form && typeof window !== "undefined") {
      setTimeout(() => window.print(), 100);
    }
  }, [loading, form]);

  const renderHeader = () => (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {tenant?.logoUrl && (
            <img
              src={String(tenant.logoUrl)}
              alt={tenant.name || tenant.legalName || "Company logo"}
              style={{ maxHeight: 40, objectFit: "contain" }}
            />
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>
              {tenant?.name || tenant?.legalName || "Company name"}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Tender approval form</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#6b7280" }}>
          <div>Tender #{form?.requisitionId ?? params.id}</div>
          <div>{form?.department || ""}</div>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>Subject</div>
        <div>{form?.title || ""}</div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontWeight: 700 }}>Comments / justification</div>
        <div style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap" }}>
          {overrideComment != null && overrideComment !== ""
            ? overrideComment
            : form?.comments ||
              "This form summarizes the approved tender preparation, including items and final quantities. It is used for internal authorization before proceeding to publication."}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 12,
          fontSize: 13,
          marginBottom: 16,
        }}
      >
        <div>
          <div><strong>Requester:</strong> {form?.requesterName || ""}</div>
          <div><strong>Department:</strong> {form?.department || ""}</div>
          <div><strong>Purpose:</strong> {form?.purpose || ""}</div>
        </div>
        <div>
          <div><strong>Manager:</strong> {form?.managerName || ""}</div>
          <div><strong>Created at:</strong> {isoDate(form?.createdAt)}</div>
          <div><strong>Status:</strong> {form?.status || ""}</div>
        </div>
      </div>
    </>
  );

  const renderFooter = () => {
    if (!tenant) return null;
    const name = tenant.name || tenant.legalName || "";
    const phone = tenant.phone || "";
    const address = tenant.address || "";
    const note = tenant.footerNote || "";

    if (!name && !phone && !address && !note) return null;

    return (
      <div
        style={{
          marginTop: 12,
          fontSize: 11,
          color: "#6b7280",
          borderTop: "1px solid #e5e7eb",
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ maxWidth: "60%" }}>
          {name && <div style={{ fontWeight: 600 }}>{name}</div>}
          {address && <div style={{ whiteSpace: "pre-wrap" }}>{address}</div>}
          {phone && <div>Tel: {phone}</div>}
        </div>
        {note && (
          <div style={{ maxWidth: "40%", textAlign: "right", whiteSpace: "pre-wrap" }}>
            {note}
          </div>
        )}
      </div>
    );
  };

  return (
    <RequireRoles
      anyOf={["TENDERING_OFFICER", "TENDER_APPROVAL", "SYS_ADMIN"]}
      title="Tender signature letter"
    >
      <InternalPage title="Tender signature letter" pageId="TENSIGLET">
        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>
        )}
        {loading || !form ? (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <div>
            <style jsx global>{`
              @media print {
                @page {
                  size: A4;
                  margin: 12mm;
                }
                .tender-letter-page {
                  display: flex;
                  flex-direction: column;
                  min-height: 260mm;
                  padding-top: 8mm;
                  padding-bottom: 8mm;
                }
              }
            `}</style>

            <div className="tender-letter-page">
              <div style={{ flex: 1 }}>
                {renderHeader()}
                <SignaturesBlock form={form} />
              </div>

              {renderFooter()}

              <div
                style={{
                  marginTop: 4,
                  fontSize: 11,
                  color: "#6b7280",
                  textAlign: "right",
                }}
              >
                Page 1 of 1
              </div>
            </div>
          </div>
        )}
      </InternalPage>
    </RequireRoles>
  );
}
