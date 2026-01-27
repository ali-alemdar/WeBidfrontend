"use client";

import { useEffect, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../lib/api";

export default function AdminCompanyProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [footerNote, setFooterNote] = useState("");

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const t = await apiGet("/tenant");
        if (t) {
          setName(t.name || "");
          setLegalName(t.legalName || "");
          setLogoUrl(t.logoUrl || "");
          setPhone(t.phone || "");
          setAddress(t.address || "");
          setFooterNote(t.footerNote || "");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load company profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      await apiPut("/tenant/profile", {
        name: name || null,
        legalName: legalName || null,
        logoUrl: logoUrl || null,
        phone: phone || null,
        address: address || null,
        footerNote: footerNote || null,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to save company profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Company profile">
      <InternalPage title="Company profile" pageId="ADMCOMP">
        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Company profile</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            These fields are used in print headers and footers (approval forms,
            tender letters, etc.).
          </p>
        </div>

        {error && (
          <div style={{ color: "#b91c1c", marginTop: 8 }}>{error}</div>
        )}

        {loading ? (
          <p style={{ marginTop: 12 }}>Loading…</p>
        ) : (
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Display name</div>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Short display name (e.g., In2Networks)"
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Legal name</div>
                <input
                  className="input"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Full legal name for documents"
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Logo URL</div>
                <input
                  className="input"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Used in print headers. Ensure this URL is accessible to users.
                </div>
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Phone</div>
                <input
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Company phone number"
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Address</div>
                <textarea
                  className="input"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  style={{ whiteSpace: "pre-wrap" }}
                  placeholder="Company address for footer"
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Footer note</div>
                <textarea
                  className="input"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  rows={3}
                  style={{ whiteSpace: "pre-wrap" }}
                  placeholder="Optional footer note for printed documents"
                />
              </label>

              <button
                className="btn btn-primary"
                type="button"
                onClick={save}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </InternalPage>
    </RequireRoles>
  );
}