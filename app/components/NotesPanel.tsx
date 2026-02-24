"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../lib/api";

interface Props {
  /** API endpoint to fetch notes (GET) and add notes (POST) */
  notesEndpoint: string;
  /** Optional: API endpoint to check if resource is archived (GET). Response should have a `status` field. */
  statusEndpoint?: string;
  /** Optional: List of status values that make the panel read-only */
  archiveStatuses?: string[];
  /** Optional: Title shown in the panel header */
  title?: string;
  /** Optional: Placeholder text for the input */
  placeholder?: string;
  /** Optional: Max width of the panel */
  maxWidth?: number;
  /** Optional: Max height of the notes list */
  maxHeight?: number;
  /** Optional: Auto-refresh interval in milliseconds (default: 15000, set to 0 to disable) */
  autoRefreshMs?: number;
  /** Optional: External refresh trigger - increment to trigger a refresh */
  refreshTrigger?: number;
  /** Optional: Force read-only mode */
  readOnly?: boolean;
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

export default function NotesPanel({
  notesEndpoint,
  statusEndpoint,
  archiveStatuses = ["TENDER_READY", "PURCHASE_READY", "REQUISITION_REJECTED", "CLOSED"],
  title = "Team notes",
  placeholder = "Add a note for the team…",
  maxWidth = 325,
  maxHeight = 200,
  autoRefreshMs = 15_000,
  refreshTrigger,
  readOnly = false,
}: Props) {
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isArchiveStatus, setIsArchiveStatus] = useState(false);

  const isReadOnly = readOnly || isArchiveStatus;

  const load = async (isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }
    setError("");

    // Check archive status if endpoint provided
    if (statusEndpoint) {
      try {
        const res = await apiGet(statusEndpoint);
        const status = String(res?.status || "");
        setIsArchiveStatus(archiveStatuses.includes(status));
      } catch {
        // Ignore status errors; fall back to editable
      }
    }

    try {
      const res = await apiGet(notesEndpoint);
      setNotes(Array.isArray(res) ? res : []);
    } catch (e: any) {
      setNotes([]);
      setError(e?.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesEndpoint]);

  // React to external refresh trigger
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      load(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Auto-refresh for live chat experience
  useEffect(() => {
    if (autoRefreshMs <= 0) return;

    const intervalId = setInterval(() => {
      load(true);
    }, autoRefreshMs);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesEndpoint, autoRefreshMs]);

  const handleAdd = async () => {
    const body = newNote.trim();
    if (!body || isReadOnly) return;
    setSaving(true);
    setError("");
    try {
      const created = await apiPost(notesEndpoint, { body });
      setNotes((prev) => [...prev, created]);
      setNewNote("");
    } catch (e: any) {
      setError(e?.message || "Failed to add note");
    } finally {
      setSaving(false);
    }
  };

  const inputId = `notes-input-${notesEndpoint.replace(/[^a-z0-9]/gi, "-")}`;

  return (
    <div
      className="card"
      style={{
        boxShadow: "none",
        padding: 8,
        background: "rgba(0,0,0,0.02)",
        width: "100%",
        maxWidth,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>

      </div>

      <div
        style={{
          maxHeight,
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
            {[...notes].reverse().map((n: any) => (
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

      {!isReadOnly && (
        <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
          <textarea
            id={inputId}
            className="input"
            style={{ width: "100%", minHeight: 50, fontSize: 12, resize: "none" }}
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={placeholder}
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
