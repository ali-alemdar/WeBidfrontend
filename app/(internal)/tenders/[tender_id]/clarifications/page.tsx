"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../../lib/api";

interface Props {
  params: { tender_id: string };
}

function fmtDateTime(value: any) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().replace("T", " ").slice(0, 16);
  } catch {
    return "";
  }
}

export default function TenderClarificationsPage({ params }: Props) {
  const tender_id = params.tender_id;

  const [clarifications, setClarifications] = useState<any[]>([]);
  const [addenda, setAddenda] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const [newAddendumTitle, setNewAddendumTitle] = useState("");
  const [newAddendumContent, setNewAddendumContent] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [c, a] = await Promise.all([
        apiGet(`/tenders/${tender_id}/clarifications`),
        apiGet(`/tenders/${tender_id}/addenda`),
      ]);
      setClarifications(Array.isArray(c) ? c : []);
      setAddenda(Array.isArray(a) ? a : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load tender communications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [tender_id]);

  const answer = async (clarificationId: number) => {
    setError("");
    setSaving(true);
    try {
      const text = (answerDraft[String(clarificationId)] || "").trim();
      if (!text) throw new Error("Answer is required");

      await apiPost(`/tenders/${tender_id}/clarifications/${clarificationId}/answer`, {
        answer: text,
      });

      setAnswerDraft((prev) => ({ ...prev, [String(clarificationId)]: "" }));
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to submit answer");
    } finally {
      setSaving(false);
    }
  };

  const createAddendum = async () => {
    setError("");
    setSaving(true);
    try {
      if (!newAddendumTitle.trim()) throw new Error("Addendum title is required");
      if (!newAddendumContent.trim()) throw new Error("Addendum content is required");

      await apiPost(`/tenders/${tender_id}/addenda`, {
        title: newAddendumTitle,
        content: newAddendumContent,
      });

      setNewAddendumTitle("");
      setNewAddendumContent("");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create addendum");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRoles anyOf={["TENDERING_OFFICER", "SYS_ADMIN"]} title="Clarifications & Addenda">
      <InternalPage title="Clarifications & Addenda">
      <p><strong>Page ID:</strong> EMP-T04</p>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">Tender: {tender_id}</span>
          {loading ? <span className="pill">Loading…</span> : null}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <Link className="btn" href={`/tenders/${tender_id}`}>Back to Tender</Link>
          <button className="btn" onClick={load} disabled={saving || loading}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Clarifications (Q&A)</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Questions from bidders and internal responses.
          </p>

          {clarifications.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No clarifications yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {clarifications.map((c) => (
                <div key={c.id} className="tile">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div className="tile-title">#{c.id} — {c.status}</div>
                    <div className="tile-sub">Asked: {fmtDateTime(c.askedAt)}</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>Question</div>
                    <div style={{ color: "var(--text)" }}>{c.question}</div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontWeight: 700 }}>Answer</div>
                    {c.answer ? (
                      <div>{c.answer}</div>
                    ) : (
                      <div style={{ display: "grid", gap: 8 }}>
                        <textarea
                          value={answerDraft[String(c.id)] || ""}
                          onChange={(e) =>
                            setAnswerDraft((p) => ({ ...p, [String(c.id)]: e.target.value }))
                          }
                          placeholder="Type answer..."
                          style={{
                            border: "1px solid var(--border)",
                            borderRadius: 10,
                            padding: "0.75rem 0.9rem",
                            fontFamily: "inherit",
                            minHeight: 90,
                          }}
                        />
                        <button
                          className="btn btn-primary"
                          disabled={saving}
                          onClick={() => answer(c.id)}
                        >
                          {saving ? "Saving…" : "Submit Answer"}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="tile-sub" style={{ marginTop: 8 }}>
                    Bidder: {c.askedByCompany?.name || "—"} ({c.askedByBidderUser?.email || "—"})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Addenda</h3>
          <p style={{ color: "var(--muted)", marginTop: 0 }}>
            Publish clarifications/additional notes as addenda.
          </p>

          <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
            <input
              className="input"
              placeholder="Addendum title"
              value={newAddendumTitle}
              onChange={(e) => setNewAddendumTitle(e.target.value)}
            />
            <textarea
              placeholder="Addendum content"
              value={newAddendumContent}
              onChange={(e) => setNewAddendumContent(e.target.value)}
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.75rem 0.9rem",
                fontFamily: "inherit",
                minHeight: 120,
              }}
            />
            <button className="btn btn-primary" onClick={createAddendum} disabled={saving}>
              {saving ? "Saving…" : "Create Addendum"}
            </button>
          </div>

          {addenda.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>No addenda yet.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {addenda.map((a) => (
                <div key={a.id} className="tile">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div className="tile-title">{a.title}</div>
                    <div className="tile-sub">{fmtDateTime(a.createdAt)}</div>
                  </div>
                  <div style={{ marginTop: 8 }}>{a.content}</div>
                  <div className="tile-sub" style={{ marginTop: 8 }}>
                    By: {a.createdBy?.email || "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
