"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost, apiPut } from "../../../lib/api";

export default function AdminDepartmentsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState("");

  // Create department modal
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");

  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [departmentUsers, setDepartmentUsers] = useState<any[]>([]);
  const [departmentUsersLoading, setDepartmentUsersLoading] = useState(false);

  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editDeptName, setEditDeptName] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      const r = await apiGet(`/departments/admin${params.toString() ? `?${params}` : ""}`);
      setRows(Array.isArray(r) ? r : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load departments");
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

  const filtered = useMemo(() => rows, [rows]);

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
      if (!name.trim()) throw new Error("Name is required");
      await apiPost("/departments", { name, isActive: true });
      setName("");
      setCreateOpen(false);
    });

  const loadUsersForDepartment = async (d: any) => {
    setSelectedDepartment(d);
    setDepartmentUsers([]);
    setDepartmentUsersLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("departmentId", String(d.id));
      const u = await apiGet(`/users/admin?${params.toString()}`);
      setDepartmentUsers(Array.isArray(u) ? u : []);
    } catch {
      setDepartmentUsers([]);
    } finally {
      setDepartmentUsersLoading(false);
    }
  };

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Departments">
      <InternalPage title="Admin / Departments">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
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
          Add department
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Departments</h3>
          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Search</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search…" />
          </label>

          <div style={{ maxHeight: 320, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Active</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    style={{ borderTop: "1px solid var(--border)", cursor: "pointer" }}
                    onClick={() => loadUsersForDepartment(d)}
                    title="Click to view users in this department"
                  >
                    <td>{d.id}</td>
                    <td>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          margin: 0,
                          color: "#2563eb",
                          textDecoration: "underline",
                          cursor: "pointer",
                          font: "inherit",
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingDepartment(d);
                          setEditDeptName(d.name || "");
                        }}
                      >
                        {d.name}
                      </button>
                      {selectedDepartment?.id === d.id ? (
                        <span className="pill" style={{ marginLeft: 8 }}>
                          selected
                        </span>
                      ) : null}
                    </td>
                    <td>{d.isActive ? "Yes" : "No"}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn"
                        disabled={acting !== ""}
                        onClick={() =>
                          doAction(`toggle-${d.id}`, () =>
                            apiPut(`/departments/${d.id}`, { isActive: !d.isActive })
                          )
                        }
                      >
                        {d.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

          <div style={{ marginTop: 12 }}>
            <h4 style={{ marginTop: 0 }}>Users in selected department</h4>
            {selectedDepartment ? (
              <div style={{ color: "var(--muted)", marginBottom: 8 }}>
                Department: <strong>{selectedDepartment.name}</strong>
              </div>
            ) : (
              <div style={{ color: "var(--muted)", marginBottom: 8 }}>Click a department to view users.</div>
            )}

            <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
              <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                    <th>Name</th>
                    <th>Active</th>
                    <th>Roles</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentUsers.map((u) => (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>{u.fullName}</td>
                      <td>{u.isActive ? "Yes" : "No"}</td>
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>
                        {(u?.roles || []).map((ur: any) => ur?.role?.name).filter(Boolean).join(", ")}
                      </td>
                    </tr>
                  ))}
                  {selectedDepartment && departmentUsers.length === 0 && !departmentUsersLoading ? (
                    <tr>
                      <td colSpan={3} style={{ color: "var(--muted)" }}>
                        No users.
                      </td>
                    </tr>
                  ) : null}
                  {departmentUsersLoading ? (
                    <tr>
                      <td colSpan={3} style={{ color: "var(--muted)" }}>
                        Loading…
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create department modal */}
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
              <span>Add department</span>
              <button
                className="btn"
                type="button"
                onClick={() => setCreateOpen(false)}
                disabled={acting !== ""}
              >
                Close
              </button>
            </h3>

            <label>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., IT"
              />
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="btn btn-primary" onClick={add} disabled={acting !== ""}>
                {acting === "add" ? "Saving…" : "Create"}
              </button>
            </div>
            <p style={{ color: "var(--muted)", marginTop: 10 }}>
              Note: Department creation requires <strong>SYS_ADMIN</strong> role.
            </p>
          </div>
        </div>
      )}

      {editingDepartment && (
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
            <h3 style={{ marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Edit department</span>
              <button className="btn" type="button" onClick={() => setEditingDepartment(null)} disabled={acting !== ""}>
                Close
              </button>
            </h3>

            <label style={{ display: "block", marginBottom: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Name</div>
              <input
                className="input"
                value={editDeptName}
                onChange={(e) => setEditDeptName(e.target.value)}
                placeholder="Department name"
              />
            </label>

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary"
                disabled={acting !== "" || !editDeptName.trim()}
                onClick={() =>
                  doAction(`save-${editingDepartment.id}`, async () => {
                    await apiPut(`/departments/${editingDepartment.id}`, { name: editDeptName.trim() });
                    setEditingDepartment(null);
                  })
                }
              >
                {acting === `save-${editingDepartment?.id}` ? "Saving…" : "Save"}
              </button>
              <button className="btn" type="button" onClick={() => setEditingDepartment(null)} disabled={acting !== ""}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      </InternalPage>
    </RequireRoles>
  );
}
