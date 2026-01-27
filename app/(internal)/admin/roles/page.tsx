"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../lib/api";

export default function AdminRolesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");

  // Create role modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUsed, setEditUsed] = useState<number>(0);
  const [editIsSystem, setEditIsSystem] = useState<boolean>(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const r = await apiGet("/roles");
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
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

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return rows;
    return rows.filter((r) => String(r?.name || "").toLowerCase().includes(qq));
  }, [rows, q]);

  const create = () =>
    doAction("create", async () => {
      if (!name.trim()) throw new Error("Name is required");
      await apiPost("/roles", { name: name.trim(), description: description.trim() || null });
      setName("");
      setDescription("");
      setCreateOpen(false);
    });

  const remove = (id: number) =>
    doAction(`delete-${id}`, async () => {
      if (!confirm("Delete this role?")) return;
      await apiDelete(`/roles/${id}`);
    });

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setEditName(r.name || "");
    setEditDescription(r.description || "");
    setEditUsed(Number(r?._count?.users ?? 0));
    setEditIsSystem(r?.isSystem === true);
  };

  const saveEdit = () =>
    doAction(`save-${editingId}`, async () => {
      if (!editingId) return;

      const payload: any = {
        description: editDescription || null,
      };

      // Only send name if it can be renamed (otherwise a "used" role would fail even for description edits)
      if (!editIsSystem && editUsed === 0) {
        payload.name = editName;
      }

      await apiPut(`/roles/${editingId}`, payload);
      setEditingId(null);
    });

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Roles">
      <InternalPage title="Admin / Roles">
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
          Create role
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>

        <div className="card" style={{ boxShadow: "none", minHeight: 520 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Roles</h3>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ color: "var(--muted)", fontSize: 13 }}>Search</span>
              <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" style={{ maxWidth: 280 }} />
            </div>
          </div>

          <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                  <th style={{ width: "70%" }}>Name</th>
                  <th style={{ width: "15%", textAlign: "center" }}>Users</th>
                  <th style={{ width: "15%", textAlign: "right" }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const used = Number(r?._count?.users ?? 0);
                  const isSystem = r?.isSystem === true;
                  const isSelected = editingId === r.id;

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderTop: "1px solid var(--border)",
                        cursor: "pointer",
                        background: isSelected ? "rgba(59,130,246,0.08)" : undefined,
                      }}
                      onClick={() => startEdit(r)}
                      title={r.description || ""}
                    >
                      <td>
                        {r.name}
                        {isSystem ? (
                          <span className="pill" style={{ marginLeft: 8 }}>
                            system
                          </span>
                        ) : null}
                      </td>
                      <td style={{ textAlign: "center" }}>{used}</td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn"
                          style={{ color: "#b91c1c" }}
                          disabled={acting !== "" || used > 0 || isSystem}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            remove(r.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 ? (
                  <tr>
                    <td colSpan={3} style={{ color: "var(--muted)" }}>
                      No roles.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {editingId != null ? (
            <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Edit role</div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
                  <input
                    className="input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    disabled={editIsSystem || editUsed > 0}
                  />
                  {(editIsSystem || editUsed > 0) ? (
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                      Name cannot be changed for system roles or roles already assigned to users.
                    </div>
                  ) : null}
                </label>

                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Description</div>
                  <input className="input" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="btn btn-primary" disabled={acting !== ""} onClick={saveEdit}>
                  {acting === `save-${editingId}` ? "Saving…" : "Save"}
                </button>
                <button className="btn" disabled={acting !== ""} onClick={() => setEditingId(null)}>
                  Close
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--muted)", fontSize: 13, marginTop: 12 }}>
              Click a role to view/edit details.
            </div>
          )}

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>
      </div>

      {/* Create role modal */}
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
              maxWidth: 640,
              width: "90%",
              maxHeight: "90vh",
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
              <span>Create role</span>
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(false)}
                disabled={acting !== ""}
              >
                Close
              </button>
            </h3>

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ marginBottom: 6 }}>Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder=""
                autoComplete="off"
              />
            </label>

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ marginBottom: 6 }}>Description (optional)</div>
              <input
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder=""
                autoComplete="off"
              />
            </label>

            <button className="btn btn-primary" onClick={create} disabled={acting !== ""}>
              {acting === "create" ? "Saving…" : "Create"}
            </button>

            <p style={{ color: "var(--muted)", marginTop: 10 }}>
              Note: Endpoints still need to explicitly allow any new role names.
            </p>
          </div>
        </div>
      )}
      </InternalPage>
    </RequireRoles>
  );
}
