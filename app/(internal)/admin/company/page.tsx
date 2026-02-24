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

  // Common bidding document settings
  const [bannedCompaniesUrl, setBannedCompaniesUrl] = useState("");
  const [incotermVersion, setIncotermVersion] = useState("");

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
        const settings = await apiGet("/tenant/tender-settings");
        if (settings) {
          setBannedCompaniesUrl(settings.banned_companies_url || "");
          setIncotermVersion(settings.incoterms_version || "");
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load profile");
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
      await Promise.all([
        apiPut("/tenant/profile", {
          name: name || null,
          legalName: legalName || null,
          logoUrl: logoUrl || null,
          phone: phone || null,
          address: address || null,
          footerNote: footerNote || null,
        }),
        apiPut("/tenant/tender-settings", {
          banned_companies_url: bannedCompaniesUrl || "",
          incoterms_version: incotermVersion || "",
        }),
      ]);
    } catch (e: any) {
      setError(e?.message || "Failed to save profile");
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

              <hr style={{ margin: "16px 0", borderColor: "var(--border)" }} />

              <h4 style={{ marginTop: 0, marginBottom: 12 }}>Common Bidding Document Settings</h4>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Banned Companies List URL</div>
                <input
                  className="input"
                  value={bannedCompaniesUrl}
                  onChange={(e) => setBannedCompaniesUrl(e.target.value)}
                  placeholder="URL to blacklist/banned companies document"
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>INCOTERMS Version</div>
                <input
                  className="input"
                  value={incotermVersion}
                  onChange={(e) => setIncotermVersion(e.target.value)}
                  placeholder="Year of INCOTERMS (e.g., 2010, 2020)"
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