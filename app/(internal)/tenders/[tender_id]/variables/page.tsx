"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiFetch } from "../../../../lib/apiClient";

interface TemplateVariable {
  name: string;
  source: "system" | "variable" | "missing-variable";
  type?: string;
  isStatic?: boolean;
  value: string | null;
  valueType: string | null;
}

export default function TenderVariablesPage() {
  const params = useParams();
  const search = useSearchParams();
  const tender_id = params?.tender_id as string;
  const templateId = search.get("templateId");

  const [vars, setVars] = useState<TemplateVariable[]>([]);
  const [templateName, setTemplateName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!tender_id || !templateId) return;

    const load = async () => {
      setLoading(true);
      setError("");
      setMessage("");
      try {
        const data = await apiFetch<TemplateVariable[]>(
          `/tenders/${tender_id}/bidding-forms/${templateId}/variables`
        );
        setVars(data);
        // We don't yet return template name from API; leave placeholder for now.
        setTemplateName("");
      } catch (e: any) {
        setError(String(e?.message || "Failed to load variables"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [tender_id, templateId]);

  const handleChange = (name: string, value: string) => {
    setVars((prev) =>
      prev.map((v) =>
        v.name === name
          ? {
              ...v,
              value,
            }
          : v
      )
    );
  };

  const handleSave = async () => {
    if (!tender_id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const editable = vars.filter(
        (v) => v.source === "variable" || v.source === "missing-variable"
      );
      for (const v of editable) {
        await apiFetch(`/tenders/${tender_id}/variables/${encodeURIComponent(v.name)}`,
          {
            method: "PUT",
            body: JSON.stringify({
              value: v.value ?? "",
              valueType: v.valueType || "string",
            }),
          }
        );
      }
      setMessage("Saved");
    } catch (e: any) {
      setError(String(e?.message || "Failed to save variables"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRoles
      anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]}
      title="Tender Variables"
    >
      <InternalPage title="Tender Variables">
        <div style={{ maxWidth: 960 }}>
          {!templateId && (
            <p style={{ color: "#b91c1c" }}>
              Missing templateId in query string.
            </p>
          )}

          {loading && <p>Loading…</p>}

          {error && !loading && (
            <p style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</p>
          )}

          {message && !loading && !error && (
            <p style={{ color: "#16a34a", marginBottom: 12 }}>{message}</p>
          )}

          {!loading && !error && vars.length > 0 && (
            <>
              <table
                cellPadding={8}
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Name</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Source</th>
                    <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {vars.map((v) => {
                    const editable =
                      v.source === "variable" || v.source === "missing-variable";
                    return (
                      <tr key={v.name} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ fontFamily: "monospace" }}>{v.name}</td>
                        <td>
                          {v.source === "system" && "System"}
                          {v.source === "variable" && "Stored"}
                          {v.source === "missing-variable" && "Missing"}
                        </td>
                        <td>
                          {editable ? (
                            <input
                              className="input"
                              value={v.value ?? ""}
                              onChange={(e) => handleChange(v.name, e.target.value)}
                              style={{ width: "100%" }}
                            />
                          ) : (
                            <span>{v.value ?? ""}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="primary"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
