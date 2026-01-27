"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

export default function AdminCurrenciesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  // Create currency modal
  const [createOpen, setCreateOpen] = useState(false);
  const [code, setCode] = useState("IQD");
  const [name, setName] = useState("Iraqi Dinar");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet(`/currencies`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load currencies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const add = () =>
    doAction("add", async () => {
      if (!code.trim()) throw new Error("Code is required");
      if (!name.trim()) throw new Error("Name is required");
      await apiPost(`/currencies`, { code: code.trim().toUpperCase(), name: name.trim() });
      setCode("");
      setName("");
      setCreateOpen(false);
    });

  const toggleActive = (id: number, isActive: boolean) =>
    doAction(`toggle-${id}`, async () => {
      await apiPut(`/currencies/${id}`, { isActive: !isActive });
    });

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Currencies">
      <InternalPage title="Currencies">
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
          Add currency
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Currencies</h3>

          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th>ID</th>
                <th>Code</th>
                <th>Name</th>
                <th>Active</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td>{c.id}</td>
                  <td>{c.code}</td>
                  <td>{c.name}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button className="btn" disabled={acting !== ""} onClick={() => toggleActive(c.id, c.isActive)}>
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

      {/* Create currency modal */}
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
              <span>Add currency</span>
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
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Code</div>
              <input
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g., IQD"
              />
            </label>

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Iraqi Dinar"
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
