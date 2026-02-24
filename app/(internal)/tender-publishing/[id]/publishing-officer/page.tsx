"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../../lib/api";

interface TenderMetadata {
  tender_number: string;
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
}

export default function PublishingOfficerFormPage() {
  const params = useParams();
  const tenderId = params.id as string;

  const [activeTab, setActiveTab] = useState<"metadata" | "contact" | "commodities" | "review">(
    "metadata"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Tab 1: Tender Metadata
  const [metadata, setMetadata] = useState<TenderMetadata>({
    tender_number: "",
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
        // Get existing data if any
        const existing = await apiGet(`/tenders/${tenderId}/publishing-data`);
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
          const autoPop = await apiGet(`/tenders/${tenderId}/publishing-data/auto-populate`);
          if (autoPop) {
            setMetadata({
              tender_number: autoPop.tender_number,
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
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load form data");
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
        title="Publishing Officer Form"
      >
        <InternalPage title="Publishing Officer Form" pageId="PUBOFF">
          <p>Loading...</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles
      anyOf={["TENDER_PUBLICATION_PREPARER", "TENDER_PUBLICATION_MANAGER", "SYS_ADMIN"]}
      title="Publishing Officer Form"
    >
      <InternalPage title="Publishing Officer Form" pageId="PUBOFF">
        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Bidding Document Variables</h3>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Fill in the publishing officer variables for this tender. Complete all sections and
            review before submitting.
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Tender Number</div>
                <input
                  className="input"
                  type="text"
                  value={metadata.tender_number}
                  onChange={(e) => setMetadata({ ...metadata, tender_number: e.target.value })}
                  readOnly
                  style={{ background: "#f5f5f5" }}
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Tender Title</div>
                <input
                  className="input"
                  type="text"
                  value={metadata.tender_title}
                  onChange={(e) => setMetadata({ ...metadata, tender_title: e.target.value })}
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Submission Deadline Date</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Submission Deadline Time</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Opening Date</div>
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
              <h4 style={{ marginTop: 0 }}>Clarification Contact</h4>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Contact Name</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Address</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>City</div>
                <input
                  className="input"
                  type="text"
                  value={contact.clarification_city}
                  onChange={(e) => setContact({ ...contact, clarification_city: e.target.value })}
                  required
                />
              </label>

              <label>
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Postal Code</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Phone</div>
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
                <div style={{ fontWeight: 800, marginBottom: 4 }}>Email</div>
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
              <h4 style={{ marginTop: 0 }}>Commodities</h4>
              {commodities.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>No commodities to display</p>
              ) : (
                commodities.map((commodity, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: "1px solid var(--border)",
                      padding: 12,
                      borderRadius: 4,
                    }}
                  >
                    <h5 style={{ marginTop: 0, marginBottom: 12 }}>Item {idx + 1}</h5>

                    <label>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Item Number</div>
                      <input
                        className="input"
                        type="text"
                        value={commodity.commodity_item_number}
                        readOnly
                        style={{ background: "#f5f5f5" }}
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Description</div>
                      <textarea
                        className="input"
                        value={commodity.commodity_description}
                        readOnly
                        rows={3}
                        style={{ background: "#f5f5f5", whiteSpace: "pre-wrap" }}
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Quantity</div>
                      <input
                        className="input"
                        type="number"
                        value={commodity.commodity_quantity}
                        onChange={(e) => {
                          const updated = [...commodities];
                          updated[idx].commodity_quantity = parseFloat(e.target.value);
                          setCommodities(updated);
                        }}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>Unit</div>
                      <input
                        className="input"
                        type="text"
                        value={commodity.commodity_unit}
                        readOnly
                        style={{ background: "#f5f5f5" }}
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>
                        Warranty/Lifetime (Optional)
                      </div>
                      <input
                        className="input"
                        type="text"
                        value={commodity.commodity_lifetime || ""}
                        onChange={(e) => {
                          const updated = [...commodities];
                          updated[idx].commodity_lifetime = e.target.value;
                          setCommodities(updated);
                        }}
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>
                        Quantity Increase Limit (%)
                      </div>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        max="100"
                        value={commodity.quantity_increase_limit}
                        onChange={(e) => {
                          const updated = [...commodities];
                          updated[idx].quantity_increase_limit = parseFloat(e.target.value);
                          setCommodities(updated);
                        }}
                        required
                      />
                    </label>

                    <label style={{ marginTop: 12 }}>
                      <div style={{ fontWeight: 800, marginBottom: 4 }}>
                        Quantity Decrease Limit (%)
                      </div>
                      <input
                        className="input"
                        type="number"
                        min="-100"
                        max="0"
                        value={commodity.quantity_decrease_limit}
                        onChange={(e) => {
                          const updated = [...commodities];
                          updated[idx].quantity_decrease_limit = parseFloat(e.target.value);
                          setCommodities(updated);
                        }}
                        required
                      />
                    </label>
                  </div>
                ))
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
              <h4 style={{ marginTop: 0 }}>Review & Submit</h4>
              <p style={{ color: "var(--muted)" }}>
                Please review all information before saving. You can edit any section by clicking
                Back.
              </p>

              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                <h5>Tender Metadata</h5>
                <p>
                  <strong>Number:</strong> {metadata.tender_number}
                </p>
                <p>
                  <strong>Title:</strong> {metadata.tender_title}
                </p>
                <p>
                  <strong>Deadline:</strong> {metadata.submission_deadline_date}{" "}
                  {metadata.submission_deadline_time}
                </p>
                <p>
                  <strong>Opening Date:</strong> {metadata.opening_date}
                </p>
              </div>

              <div style={{ background: "#f5f5f5", padding: 12, borderRadius: 4 }}>
                <h5>Clarification Contact</h5>
                <p>
                  <strong>Name:</strong> {contact.clarification_contact_name}
                </p>
                <p>
                  <strong>Email:</strong> {contact.clarification_email}
                </p>
                <p>
                  <strong>Phone:</strong> {contact.clarification_phone}
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
                  {saving ? "Saving..." : "Save & Submit"}
                </button>
              </div>
            </div>
          )}
        </div>
      </InternalPage>
    </RequireRoles>
  );
}
