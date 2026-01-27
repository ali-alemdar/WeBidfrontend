"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

interface Props {
  requisitionId: number;
}

function formatDate(value: any) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return "";
  }
}

export default function TeamNotesPanel({ requisitionId }: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isArchiveStatus, setIsArchiveStatus] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Load requisition status to decide read-only behaviour
        const req = await apiGet(`/requisitions/${requisitionId}`);
        if (!cancelled) {
          const status = String(req?.status || "");
          const archive =
            status === "TENDER_READY" ||
            status === "PURCHASE_READY" ||
            status === "REQUISITION_REJECTED" ||
            status === "CLOSED";
          setIsArchiveStatus(archive);
        }
      } catch {
        // Ignore status errors; fall back to editable
      }

      try {
        const res = await apiGet(`/requisitions/${requisitionId}/notes`);
        if (!cancelled) {
          setNotes(Array.isArray(res) ? res : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setNotes([]);
          setError(e?.message || "Failed to load notes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [requisitionId]);

  const handleAdd = async () => {
    const body = newNote.trim();
    if (!body || isArchiveStatus) return;
    setSaving(true);
    setError("");
    try {
      const created = await apiPost(`/requisitions/${requisitionId}/notes`, { body });
      setNotes((prev) => [...prev, created]);
      setNewNote("");
    } catch (e: any) {
      setError(e?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        boxShadow: "none",
        padding: 8,
        background: "rgba(0,0,0,0.02)",
        width: "100%",
        maxWidth: 325,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Team notes</div>
        {!isArchiveStatus && (
          <button
            className="btn btn-sm"
            type="button"
            onClick={() => {
              const el = document.getElementById("team-notes-input-left");
              if (el) (el as HTMLTextAreaElement).focus();
            }}
          >
            Add note
          </button>
        )}
      </div>

      <div
        style={{
          maxHeight: 200,
          overflow: "auto",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "#fff",
        }}
      >
        <table
          width="100%"
          cellPadding={6}
          style={{ borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}
        >
          <tbody>
            {notes.map((n: any) => (
              <>
                <tr key={n.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td colSpan={2}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{n.authorName}</span>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      width: "100%",
                      maxWidth: "100%",
                    }}
                  >
                    {n.body}
                  </td>
                </tr>
              </>
            ))}
            {!loading && notes.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ color: "var(--muted)", fontSize: 12 }}>
                  No notes yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {error && (
        <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>
          {error}
        </div>
      )}

      {!isArchiveStatus && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <textarea
            id="team-notes-input-left"
            className="input"
            style={{ width: "100%", minHeight: 50, fontSize: 12, resize: "none" }}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note for the team…"
          />
          <button
            className="btn btn-primary"
            onClick={handleAdd}
            disabled={saving || !newNote.trim()}
            style={{ alignSelf: "flex-end" }}
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      )}
    </div>
  );
}
