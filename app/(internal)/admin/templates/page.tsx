"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../lib/api";

type TemplateType = "DISCLAIMER" | "BIDDING_FORM";

function Section({
  title,
  type,
}: {
  title: string;
  type: TemplateType;
}) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");

  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("type", type);
      if (q.trim()) params.set("q", q.trim());
      const r = await apiGet(`/templates/admin?${params.toString()}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timerRef = useRef<any>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      load();
    }, 450);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const doAction = async (n: string, fn: () => Promise<any>) => {
    setError("");
    setActing(n);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const create = () =>
    doAction("create", async () => {
      if (!name.trim()) throw new Error("Name is required");
      if (!content.trim()) throw new Error("Content is required");
      await apiPost("/templates", { type, name: name.trim(), content: content.trim(), isActive: true });
      setName("");
      setContent("");
    });

  const filtered = useMemo(() => rows, [rows]);

  return (
    <div className="card" style={{ boxShadow: "none" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ marginTop: 0, marginBottom: 0 }}>{title}</h3>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginTop: 10 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12, alignItems: "start" }}>
        <div>
          <h4 style={{ marginTop: 0 }}>Create</h4>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
            <input className="input" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} placeholder="" />
          </label>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Content</div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder=""
              style={{
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "0.75rem 0.9rem",
                fontFamily: "inherit",
                minHeight: 120,
                width: "100%",
              }}
            />
          </label>

          <button className="btn btn-primary" onClick={create} disabled={acting !== ""}>
            {acting === "create" ? "Saving…" : "Create"}
          </button>
        </div>

        <div>
          <h4 style={{ marginTop: 0 }}>List</h4>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Search</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
          </label>

          <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                  <th>Name</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderTop: "1px solid var(--border)", verticalAlign: "top" }}>
                    <td>
                      <div style={{ fontWeight: 800 }}>{t.name}</div>
                      <div style={{ color: "var(--muted)", fontSize: 12, whiteSpace: "pre-wrap" }}>
                        {String(t.content || "").slice(0, 160)}
                        {String(t.content || "").length > 160 ? "…" : ""}
                      </div>
                    </td>
                    <td>{t.isActive ? "Yes" : "No"}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                        <button
                          className="btn"
                          disabled={acting !== ""}
                          onClick={() => doAction(`toggle-${t.id}`, () => apiPut(`/templates/${t.id}`, { isActive: !t.isActive }))}
                        >
                          {t.isActive ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          className="btn"
                          style={{ color: "#b91c1c" }}
                          disabled={acting !== ""}
                          onClick={() =>
                            doAction(`delete-${t.id}`, async () => {
                              if (!confirm("Delete this template?") ) return;
                              await apiDelete(`/templates/${t.id}`);
                            })
                          }
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>
      </div>
    </div>
  );
}

export default function AdminTemplatesPage() {
  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Templates">
      <InternalPage title="Admin / Templates">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn" href="/admin">
          Back
        </Link>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <Section title="Requisition disclaimers" type="DISCLAIMER" />
        <Section title="Bidding form templates" type="BIDDING_FORM" />
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
