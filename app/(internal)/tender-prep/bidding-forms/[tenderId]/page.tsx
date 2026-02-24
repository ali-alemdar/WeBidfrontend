"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../../lib/api";

interface Template {
  id: number;
  displayName: string;
  placeholders: any[];
  hasSavedData: boolean;
  lastSavedAt?: string;
  lastSavedBy?: { id: number; fullName: string };
}

interface FormField {
  name: string;
  type: "text" | "date" | "number";
  value: string;
  isStatic: boolean;
  staticValue: string | null;
}

interface FormData {
  templateId: number;
  displayName: string;
  fields: FormField[];
  formData: Record<string, any>;
  savedAt: string | null;
  savedBy: any;
}

export default function BiddingFormsPage() {
  const params = useParams();
  const router = useRouter();
  const tenderId = params.tenderId as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  useEffect(() => {
    loadTemplates();
  }, [tenderId]);

  useEffect(() => {
    if (selectedTemplate && templates.length > 0) {
      loadFormData();
    }
  }, [selectedTemplate]);

  const loadTemplates = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await apiGet(`/tenders/${tenderId}/bidding-forms/templates`);
      const templatesArray = Array.isArray(response) ? response : [];
      setTemplates(templatesArray);
      if (templatesArray.length > 0) {
        setSelectedTemplate(templatesArray[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const loadFormData = async () => {
    if (!selectedTemplate) return;
    try {
      setLoading(true);
      const response = await apiGet(
        `/tenders/${tenderId}/bidding-forms/${selectedTemplate}`
      );
      setFormData(response);
    } catch (e: any) {
      setError(e?.message || "Failed to load form data");
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      formData: {
        ...formData.formData,
        [fieldName]: value,
      },
    });
  };

  const saveForm = async () => {
    if (!selectedTemplate || !formData) return;
    try {
      setSaving(true);
      setError("");
      await apiPost(`/tenders/${tenderId}/bidding-forms/${selectedTemplate}`, {
        formData: formData.formData,
      });
      setSuccess("Form saved successfully");
      setTimeout(() => setSuccess(""), 3000);
      await loadFormData();
      await loadTemplates();
    } catch (e: any) {
      setError(e?.message || "Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const downloadPdf = async () => {
    if (!selectedTemplate) return;
    try {
      setDownloading(true);
      setError("");
      const response = await fetch(
        `/api/tenders/${tenderId}/bidding-forms/${selectedTemplate}/download`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const template = templates.find((t) => t.id === selectedTemplate);
      const fileName = template?.displayName || "form";
      link.setAttribute("download", `${fileName}.pdf`);

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e?.message || "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <RequireRoles anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]} title="Bidding Forms">
        <InternalPage title="Bidding Forms">
          <div>Loading...</div>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (templates.length === 0) {
    return (
      <RequireRoles anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]} title="Bidding Forms">
        <InternalPage title="Bidding Forms">
          <div style={{ color: "var(--muted)" }}>No bidding form templates available.</div>
          <Link href="/tender-prep" className="btn" style={{ marginTop: 12 }}>
            Back to Tender Prep
          </Link>
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]} title="Bidding Forms">
      <InternalPage title="Bidding Forms">
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Link href="/tender-prep" className="btn">
            Back to Tender Prep
          </Link>
          <button className="btn" onClick={loadTemplates} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginBottom: 12, padding: 8, backgroundColor: "#fee2e2", borderRadius: 6 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: "#166534", marginBottom: 12, padding: 8, backgroundColor: "#dcfce7", borderRadius: 6 }}>
            {success}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {templates.map((template) => (
            <button
              key={template.id}
              className={selectedTemplate === template.id ? "btn btn-primary" : "btn"}
              onClick={() => setSelectedTemplate(template.id)}
            >
              {template.displayName}
              {template.hasSavedData && (
                <span style={{ fontSize: 10, marginLeft: 6, color: "var(--muted)" }}>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>

        {formData && (
          <div className="card" style={{ boxShadow: "none" }}>
            <h3 style={{ marginTop: 0 }}>{formData.displayName}</h3>

            {formData.savedAt && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 12 }}>
                Last saved: {new Date(formData.savedAt).toLocaleString()} by{" "}
                {formData.savedBy?.fullName || "Unknown"}
              </div>
            )}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {formData.fields.map((field) => (
                <div key={field.name}>
                  <label style={{ fontSize: 12, fontWeight: 500, display: "block", marginBottom: 4 }}>
                    {field.name}
                    {field.isStatic && (
                      <span style={{ fontSize: 10, color: "var(--muted)", marginLeft: 4 }}>
                        (Auto-filled)
                      </span>
                    )}
                  </label>
                  {field.isStatic ? (
                    <div
                      style={{
                        padding: 8,
                        backgroundColor: "#f3f4f6",
                        borderRadius: 4,
                        fontSize: 13,
                        wordBreak: "break-word",
                      }}
                    >
                      {field.staticValue || "(empty)"}
                    </div>
                  ) : (
                    <>
                      {field.type === "date" ? (
                        <input
                          type="date"
                          className="input"
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          className="input"
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      ) : (
                        <input
                          type="text"
                          className="input"
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-submit"
                onClick={saveForm}
                disabled={saving || loading}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn"
                onClick={downloadPdf}
                disabled={downloading || !formData.savedAt}
              >
                {downloading ? "Downloading…" : "Download PDF"}
              </button>
            </div>
          </div>
        )}
      </InternalPage>
    </RequireRoles>
  );
}
