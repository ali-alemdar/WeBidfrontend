"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import BackButton from "../../../../components/BackButton";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../../lib/api";

interface TenderMetadata {
  tender_number: string;
  publication_tender_number: string;
  tender_title: string;
  tender_description: string;
  submission_deadline_date: string;
  submission_deadline_time: string;
  opening_date: string;
}

interface ClarificationContact {
  clarification_contact_name: string;
  clarification_address: string;
  clarification_city: string;
  clarification_postal_code: string;
  clarification_phone: string;
  clarification_fax?: string;
  clarification_email: string;
}

interface Commodity {
  commodity_item_number: string;
  commodity_description: string;
  commodity_quantity: number;
  commodity_unit: string;
  commodity_lifetime?: string;
  quantity_increase_limit: number;
  quantity_decrease_limit: number;
  item_type?: string;
  date_of_delivery?: string;
  unit_price?: number;
  total_price?: number;
  country_of_origin?: string;
  currency?: string;
}

export default function TenderPublishingDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const tenderId = params.id as string;

  const [activeTab, setActiveTab] = useState<"metadata" | "contact" | "commodities" | "review">(
    "metadata"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [tender, setTender] = useState<any>(null);

  // Tab 1: Tender Metadata
  const [metadata, setMetadata] = useState<TenderMetadata>({
    tender_number: "",
    publication_tender_number: "",
    tender_title: "",
    tender_description: "",
    submission_deadline_date: "",
    submission_deadline_time: "",
    opening_date: "",
  });

  // Tab 2: Clarification Contact
  const [contact, setContact] = useState<ClarificationContact>({
    clarification_contact_name: "",
    clarification_address: "",
    clarification_city: "",
    clarification_postal_code: "",
    clarification_phone: "",
    clarification_fax: "",
    clarification_email: "",
  });

  // Tab 3: Commodities
  const [commodities, setCommodities] = useState<Commodity[]>([]);

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        // Get tender details (read-only endpoint, no guard)
        const tenderData = await apiGet(`/tenders/${tenderId}`);
        if (!tenderData) {
          setError("Tender not found");
          return;
        }
        setTender(tenderData);

        // Get existing publishing data if any
        let existing = null;
        try {
          existing = await apiGet(`/tenders/${tenderId}/publishing-data`);
        } catch (e: any) {
          // If forbidden, it means no data exists yet, which is fine
          if (!e?.message?.includes("Forbidden")) {
            throw e;
          }
        }

        if (existing?.section0Data) {
          if (existing.section0Data.tender_metadata) {
            setMetadata(existing.section0Data.tender_metadata);
          }
          if (existing.section0Data.clarification_contact) {
            setContact(existing.section0Data.clarification_contact);
          }
        }
        if (existing?.section2Data?.commodities) {
          setCommodities(existing.section2Data.commodities);
        }

        // If no data, auto-populate from tender
        if (!existing?.section0Data) {
          try {
            const autoPop = await apiGet(`/tenders/${tenderId}/publishing-data/auto-populate`);
            if (autoPop) {
              setMetadata({
                tender_number: autoPop.tender_number,
                publication_tender_number: autoPop.publication_tender_number || '',
                tender_title: autoPop.tender_title,
                tender_description: autoPop.tender_description,
                submission_deadline_date: autoPop.submission_deadline_date,
                submission_deadline_time: autoPop.submission_deadline_time,
                opening_date: autoPop.opening_date,
              });
              if (autoPop.commodities) {
                setCommodities(autoPop.commodities);
              }
            }
          } catch (e: any) {
            // Auto-populate failed, but we can still proceed
            console.error("Auto-populate failed:", e?.message);
          }
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to load form data";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tenderId]);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await apiPut(`/tenders/${tenderId}/publishing-data`, {
        section0Data: {
          tender_metadata: metadata,
          clarification_contact: contact,
        },
        section2Data: {
          commodities,
        },
        section4Data: {
          commodities,
        },
        section6Data: {
          commodities,
        },
      });
      setSuccess("Publishing data saved successfully");
      setTimeout(() => router.back(), 1500);
    } catch (e: any) {
      setError(e?.message || "Failed to save publishing data");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <RequireRoles
        anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]}
        title="Publishing Details"
      >
        <InternalPage title="Publishing Details" pageId="PUBDETAIL">
          <p>Loading...</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles
      anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]}
      title="Publishing Details"
    >
      <InternalPage title="Publishing Details" pageId="PUBDETAIL">
        <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
          <BackButton fallbackHref="/tender-publishing/ready" />
          <h2 style={{ margin: 0, flex: 1 }}>
            {tender?.requisition?.title || tender?.title || "Tender"}
          </h2>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Fill in the bidding document variables. Auto-populated fields can be edited if needed.
          </p>
        </div>

        {error && <div style={{ color: "#b91c1c", marginTop: 12 }}>{error}</div>}
        {success && <div style={{ color: "#15803d", marginTop: 12 }}>{success}</div>}

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 16,
            borderBottom: "1px solid var(--border)",
          }}
        >
          {(["metadata", "contact", "commodities", "review"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "8px 16px",
                border: "none",
                background: activeTab === tab ? "var(--primary)" : "transparent",
                color: activeTab === tab ? "white" : "inherit",
                cursor: "pointer",
                fontWeight: activeTab === tab ? "bold" : "normal",
                borderBottom: activeTab === tab ? "2px solid var(--primary)" : "none",
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="card" style={{ marginTop: 12 }}>
          {activeTab === "metadata" && (
            <div style={{ display: "grid", gap: 12 }}>
              <h4 style={{ marginTop: 0 }}>Tender Metadata</h4>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Publication Tender Number (XX/YYYY) *</div>
                <input
                  className="input"
                  type="text"
                  value={metadata.publication_tender_number}
                  onChange={(e) => {
                    let val = e.target.value.toUpperCase();
                    // Allow numbers and / only, auto-format to xx/yyyy

                    if (val.length === 2 && !val.includes('/')) {
                      val = val + '/';
                    }
                    setMetadata({ ...metadata, publication_tender_number: val });
                  }}
                  placeholder="e.g., 01/2025"
                  required
                  maxLength={7}
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Tender Title *</div>
                <input
                  className="input"
                  type="text"
                  value={metadata.tender_title}
                  onChange={(e) => setMetadata({ ...metadata, tender_title: e.target.value })}
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Tender Description</div>
                <textarea
                  className="input"
                  value={metadata.tender_description}
                  onChange={(e) =>
                    setMetadata({ ...metadata, tender_description: e.target.value })
                  }
                  rows={4}
                  style={{ whiteSpace: "pre-wrap" }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Submission Deadline Date *</div>
                <input
                  className="input"
                  type="date"
                  value={metadata.submission_deadline_date}
                  onChange={(e) =>
                    setMetadata({
                      ...metadata,
                      submission_deadline_date: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Submission Deadline Time *</div>
                <input
                  className="input"
                  type="time"
                  value={metadata.submission_deadline_time}
                  onChange={(e) =>
                    setMetadata({
                      ...metadata,
                      submission_deadline_time: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Opening Date *</div>
                <input
                  className="input"
                  type="date"
                  value={metadata.opening_date}
                  onChange={(e) => setMetadata({ ...metadata, opening_date: e.target.value })}
                  required
                />
              </label>

              <button
                className="btn btn-primary"
                onClick={() => setActiveTab("contact")}
                style={{ marginTop: 12 }}
              >
                Continue to Contact Info
              </button>
            </div>
          )}

          {activeTab === "contact" && (
            <div style={{ display: "grid", gap: 12 }}>
              <h4 style={{ marginTop: 0 }}>Clarification Contact (Officer Fills)</h4>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Contact Name *</div>
                <input
                  className="input"
                  type="text"
                  value={contact.clarification_contact_name}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_contact_name: e.target.value,
                    })
                  }
                  placeholder="Person responsible for bid clarifications"
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Address *</div>
                <textarea
                  className="input"
                  value={contact.clarification_address}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_address: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Address for submitting clarifications"
                  required
                  style={{ whiteSpace: "pre-wrap" }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>City *</div>
                <input
                  className="input"
                  type="text"
                  value={contact.clarification_city}
                  onChange={(e) => setContact({ ...contact, clarification_city: e.target.value })}
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Postal Code *</div>
                <input
                  className="input"
                  type="text"
                  value={contact.clarification_postal_code}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_postal_code: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Phone *</div>
                <input
                  className="input"
                  type="tel"
                  value={contact.clarification_phone}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_phone: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Fax (Optional)</div>
                <input
                  className="input"
                  type="tel"
                  value={contact.clarification_fax || ""}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_fax: e.target.value,
                    })
                  }
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Email *</div>
                <input
                  className="input"
                  type="email"
                  value={contact.clarification_email}
                  onChange={(e) =>
                    setContact({
                      ...contact,
                      clarification_email: e.target.value,
                    })
                  }
                  required
                />
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => setActiveTab("metadata")}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab("commodities")}
                >
                  Continue to Commodities
                </button>
              </div>
            </div>
          )}

          {activeTab === "commodities" && (
            <div style={{ display: "grid", gap: 12 }}>
              <h4 style={{ marginTop: 0 }}>Approved Tender Items (from Tender Prep)</h4>
              {commodities.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No items to display</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 14,
                  }}>
                    <thead>
                      <tr style={{ background: "#f5f5f5", borderBottom: "2px solid var(--border)" }}>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Item #</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Type</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Description</th>
                        <th style={{ padding: 8, textAlign: "right", fontWeight: 800 }}>Qty</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Unit</th>
                        <th style={{ padding: 8, textAlign: "right", fontWeight: 800 }}>Unit Price</th>
                        <th style={{ padding: 8, textAlign: "right", fontWeight: 800 }}>Total Price</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Currency</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Origin</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 800 }}>Delivery Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commodities.map((commodity, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: 8 }}>{commodity.commodity_item_number}</td>
                          <td style={{ padding: 8 }}>{commodity.item_type || "-"}</td>
                          <td style={{ padding: 8, maxWidth: 250 }}>{commodity.commodity_description}</td>
                          <td style={{ padding: 8, textAlign: "right" }}>{commodity.commodity_quantity}</td>
                          <td style={{ padding: 8 }}>{commodity.commodity_unit}</td>
                          <td style={{ padding: 8, textAlign: "right" }}>{commodity.unit_price ? commodity.unit_price.toLocaleString() : "-"}</td>
                          <td style={{ padding: 8, textAlign: "right" }}>{commodity.total_price ? commodity.total_price.toLocaleString() : "-"}</td>
                          <td style={{ padding: 8 }}>{commodity.currency || "-"}</td>
                          <td style={{ padding: 8 }}>{commodity.country_of_origin || "-"}</td>
                          <td style={{ padding: 8 }}>{commodity.date_of_delivery || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => setActiveTab("contact")}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => setActiveTab("review")}
                >
                  Continue to Review
                </button>
              </div>
            </div>
          )}

          {activeTab === "review" && (
            <div style={{ display: "grid", gap: 12 }}>
              <h4 style={{ marginTop: 0 }}>Review & Save</h4>
              <p style={{ color: "var(--muted)" }}>
                Review all information before saving. Click Back to edit any section.
              </p>

              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                <h5 style={{ marginTop: 0 }}>Tender Metadata</h5>
                <p style={{ margin: "4px 0" }}>
                  <strong>System Number:</strong> {metadata.tender_number}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Publication Number:</strong> {metadata.publication_tender_number}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Title:</strong> {metadata.tender_title}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Deadline:</strong> {metadata.submission_deadline_date}{" "}
                  {metadata.submission_deadline_time}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Opening Date:</strong> {metadata.opening_date}
                </p>
              </div>

              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                <h5 style={{ marginTop: 0 }}>Clarification Contact</h5>
                <p style={{ margin: "4px 0" }}>
                  <strong>Name:</strong> {contact.clarification_contact_name}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Email:</strong> {contact.clarification_email}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>Phone:</strong> {contact.clarification_phone}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>City:</strong> {contact.clarification_city}
                </p>
              </div>

              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                <h5 style={{ marginTop: 0 }}>Commodities</h5>
                <p style={{ margin: "4px 0", color: "var(--muted)" }}>
                  {commodities.length} item(s) with quantity limits configured
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => setActiveTab("commodities")}>
                  Back
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </button>
              </div>
            </div>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
