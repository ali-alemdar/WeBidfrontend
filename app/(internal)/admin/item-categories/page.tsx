"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

export default function AdminItemCategoriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");

  // Create category modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const r = await apiGet(`/item-categories/admin${params.toString() ? `?${params}` : ""}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic search
  const searchTimerRef = useRef<any>(null);
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      load();
    }, 450);

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
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

  const filtered = useMemo(() => rows, [rows]);

  const add = () =>
    doAction("add", async () => {
      if (!name.trim()) throw new Error("Name is required");
      await apiPost("/item-categories", { name: name.trim(), isActive: true });
      setName("");
      setCreateOpen(false);
    });

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Item Categories">
      <InternalPage title="Admin / Item Categories">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn" href="/admin">
          Back
        </Link>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => setCreateOpen(true)}
          disabled={acting !== ""}
        >
          Add category
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Categories</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Search</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
          </label>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Name</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{c.id}</td>
                  <td>{c.name}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="btn"
                      disabled={acting !== ""}
                      onClick={() => doAction(`toggle-${c.id}`, () => apiPut(`/item-categories/${c.id}`, { isActive: !c.isActive }))}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>
      </div>

      {/* Create category modal */}
      {createOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: "90%",
              maxHeight: "80vh",
              overflow: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Add category</span>
              <button
                className="btn"
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={acting !== ""}
              >
                Close
              </button>
            </h3>

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., IT Hardware"
              />
            </label>

            <button className="btn btn-primary" onClick={add} disabled={acting !== ""}>
              {acting === "add" ? "Saving…" : "Create"}
            </button>
          </div>
        </div>
      )}
      </InternalPage>
    </RequireRoles>
  );
}
