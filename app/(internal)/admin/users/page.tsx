"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiDelete, apiGet, apiPost, apiPut } from "../../../lib/api";

type RoleRow = { id: number; name: string; description?: string | null; isSystem?: boolean; _count?: { users: number } };

type DepartmentRow = { id: number; name: string; isActive?: boolean };

type RoleGroup = { key: string; label: string; items: RoleRow[] };

function uniq(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean)));
}

function groupRoles(allRoles: RoleRow[]): RoleGroup[] {
  const groups: Array<{ key: string; label: string; order: number; match: (name: string) => boolean }> = [
    {
      key: "requisition",
      label: "Requisition",
      order: 1,
      match: (n) =>
        ["REQUESTER", "REQUISITION_OFFICER", "REQUISITION_MANAGER"].includes(n),
    },
    {
      key: "tendering",
      label: "Tendering",
      order: 2,
      match: (n) =>
        ["TENDERING_OFFICER", "TENDER_COMMITTEE", "TENDER_APPROVAL"].includes(n),
    },
    {
      key: "tender_other",
      label: "Tender (other)",
      order: 3,
      match: (n) =>
        n.startsWith("TENDER") ||
        ["COMMITTEE_CHAIR", "EVALUATOR", "AWARD_AUTHORITY"].includes(n),
    },
    {
      key: "supplier",
      label: "Suppliers",
      order: 4,
      match: (n) => n.startsWith("SUPPLIER") || n.startsWith("VENDOR"),
    },
    {
      key: "bidder",
      label: "Bidder portal",
      order: 5,
      match: (n) => n.startsWith("BIDDER_"),
    },
    {
      key: "admin",
      label: "Admin / Audit",
      order: 6,
      match: (n) => ["SYS_ADMIN", "AUDITOR"].includes(n),
    },
  ];

  const buckets = new Map<string, RoleRow[]>();
  const meta = new Map(groups.map((g) => [g.key, g]));

  for (const r of allRoles) {
    const name = String(r?.name || "").trim();
    if (!name) continue;

    const found = groups.find((g) => g.match(name));
    const key = found ? found.key : "other";

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(r);
  }

  const out: RoleGroup[] = [];

  for (const [key, items] of Array.from(buckets.entries())) {
    const g = meta.get(key);
    out.push({
      key,
      label: g?.label || "Other",
      items: items.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))),
    });
  }

  // Stable ordering (known groups first, then Other)
  out.sort((a, b) => {
    const ao = meta.get(a.key)?.order ?? 99;
    const bo = meta.get(b.key)?.order ?? 99;
    if (ao !== bo) return ao - bo;
    return a.label.localeCompare(b.label);
  });

  return out;
}

function RolePicker({
  allRoles,
  selected,
  setSelected,
  disabled,
}: {
  allRoles: RoleRow[];
  selected: string[];
  setSelected: (xs: string[]) => void;
  disabled?: boolean;
}) {
  const LOCKED = ["REQUESTER"]; // baseline role: always enabled + cannot be removed
  const groups = useMemo(() => groupRoles(allRoles), [allRoles]);
  const [open, setOpen] = useState<Record<string, boolean>>({
    requisition: true,
    tender: false,
    supplier: false,
    bidder: false,
    admin: false,
    other: false,
  });

  // Ensure locked roles are always present
  useEffect(() => {
    const missing = LOCKED.filter((r) => !selected.includes(r));
    if (missing.length) setSelected(uniq([...selected, ...missing]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join("|")]);

  const toggleRole = (name: string) => {
    if (LOCKED.includes(name)) return;
    if (selected.includes(name)) setSelected(selected.filter((x) => x !== name));
    else setSelected(uniq([...selected, name]));
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {groups.map((g) => {
        const isOpen = open[g.key] !== false;
        const selectedCount = g.items.filter((r) => selected.includes(r.name)).length;

        return (
          <div key={g.key} style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <button
              type="button"
              className="btn"
              disabled={disabled}
              onClick={() => setOpen((p) => ({ ...p, [g.key]: !isOpen }))}
              aria-expanded={isOpen}
              style={{
                width: "100%",
                justifyContent: "space-between",
                border: "none",
                borderRadius: 0,
                background: "rgba(0,0,0,0.02)",
              }}
            >
              <span style={{ fontWeight: 900 }}>
                {isOpen ? "−" : "+"} {g.label}
              </span>
              <span className="pill" style={{ fontWeight: 800 }}>
                {selectedCount}/{g.items.length}
              </span>
            </button>

            {isOpen ? (
              <div style={{ padding: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                {g.items.map((r) => (
                  <label key={r.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      disabled={disabled || LOCKED.includes(r.name)}
                      checked={selected.includes(r.name)}
                      onChange={() => toggleRole(r.name)}
                    />
                    <span>{r.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const ALLOWED_ROLE_NAMES = [
    "REQUESTER",
    "REQUISITION_OFFICER",
    "REQUISITION_MANAGER",
    "TENDERING_OFFICER",
    "TENDER_COMMITTEE",
    "TENDER_APPROVAL",
    "SYS_ADMIN",
  ];
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");
  const [filterDepartmentId, setFilterDepartmentId] = useState<string>("");

  // Create form (modal)
  const [createOpen, setCreateOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [password, setPassword] = useState("");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createRoleNames, setCreateRoleNames] = useState<string[]>(["REQUESTER"]);

  // Edit form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDepartmentId, setEditDepartmentId] = useState<string>("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editRoleNames, setEditRoleNames] = useState<string[]>([]);
  const [resetPassword, setResetPassword] = useState("");

  const generatePassword = () => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let out = "";
    for (let i = 0; i < 14; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    setResetPassword(out);
  };

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (filterDepartmentId) params.set("departmentId", filterDepartmentId);

      const [u, r, d] = await Promise.all([
        apiGet(`/users/admin${params.toString() ? `?${params}` : ""}`),
        apiGet(`/roles`),
        apiGet(`/departments/admin`),
      ]);

      setUsers(Array.isArray(u) ? u : []);
      setRoles(Array.isArray(r) ? r.filter((rr: any) => ALLOWED_ROLE_NAMES.includes(String(rr?.name || ""))) : []);
      setDepartments(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic search/filter
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
  }, [q, filterDepartmentId]);

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

  const isDeletedUser = (u: any) => u?.isActive === false;

  const activeUsers = useMemo(() => users.filter((u) => !isDeletedUser(u)), [users]);
  const deletedUsers = useMemo(() => users.filter((u) => isDeletedUser(u)), [users]);

  const startEdit = (u: any) => {
    setEditingId(u.id);
    setEditEmail(u.email || "");
    setEditFullName(u.fullName || "");
    setEditPhone(u.phone || "");
    setEditDepartmentId(u?.department?.id != null ? String(u.department.id) : "");
    setEditIsActive(!!u.isActive);
    const names = (u?.roles || []).map((ur: any) => ur?.role?.name).filter(Boolean);
    setEditRoleNames(uniq(names));
    setResetPassword("");
  };

  const saveEdit = () =>
    doAction(`save-${editingId}`, async () => {
      if (!editingId) return;
      if (!editFullName.trim()) throw new Error("Full name is required");

      const editingUser = users.find((u) => u.id === editingId);
      const isSystem = editingUser?.isSystem === true;

      const payload: any = {
        fullName: editFullName,
        phone: editPhone || null,
        password: resetPassword.trim() ? resetPassword : undefined,
      };

      if (!isSystem) {
        payload.email = editEmail;
        payload.departmentId = editDepartmentId || null;
        payload.isActive = editIsActive;
        payload.roleNames = editRoleNames;
      }

      await apiPut(`/users/${editingId}/admin`, payload);

      setEditingId(null);
    });

  const deleteUser = () =>
    doAction(`delete-${editingId}`, async () => {
      if (!editingId) return;
      if (!confirm("Delete this user? (This will deactivate the account immediately.)")) return;
      await apiDelete(`/users/${editingId}/admin`);
      setEditingId(null);
    });

  const createUser = () =>
    doAction("create", async () => {
      if (!email.trim()) throw new Error("Username is required");
      if (!fullName.trim()) throw new Error("Full name is required");
      if (!password) throw new Error("Password is required");

      await apiPost("/users/admin", {
        email,
        fullName,
        phone: phone || null,
        departmentId: departmentId || null,
        password,
        isActive: createIsActive,
        roleNames: createRoleNames,
      });

      setEmail("");
      setFullName("");
      setPhone("");
      setDepartmentId("");
      setPassword("");
      setCreateRoleNames(["REQUESTER"]);
      setCreateIsActive(true);
      setCreateOpen(false);
    });

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Users">
      <InternalPage title="Admin / Users">
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
          Create user
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, alignItems: "start" }}>

        <div className="card" style={{ boxShadow: "none", minHeight: 720 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>Users</h3>
            <span style={{ fontWeight: 800 }}>Search</span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type to search…"
              style={{ width: 240 }}
            />
            <span style={{ fontWeight: 800 }}>Department</span>
            <select
              className="input"
              value={filterDepartmentId}
              onChange={(e) => setFilterDepartmentId(e.target.value)}
              style={{ width: 240 }}
            >
              <option value="">All</option>
              {departments.filter((d) => d.isActive !== false).map((d) => (
                <option key={d.id} value={String(d.id)}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ maxHeight: 520, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table width="100%" cellPadding={2} style={{ borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                  <th style={{ width: 54 }}>ID</th>
                  <th>Name</th>
                  <th style={{ width: 180 }}>Department</th>
                  <th style={{ width: 260 }}>Roles</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u) => {
                  const roleNames = (u?.roles || []).map((ur: any) => ur?.role?.name).filter(Boolean);
                  const shown = roleNames.slice(0, 2);
                  const more = roleNames.length - shown.length;

                  const isEditing = editingId === u.id;
                  const isSystem = u?.isSystem === true;

                  return (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>{u.id}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          disabled={acting !== ""}
                          title={isSystem ? "View" : "Edit"}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: acting !== "" ? "not-allowed" : "pointer",
                            textAlign: "left",
                            color: "#2563eb",
                            fontWeight: 800,
                          }}
                        >
                          {u.fullName}
                        </button>
                      </td>
                      <td>{u?.department?.name || ""}</td>
                      <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {shown.join(", ")}{more > 0 ? ` +${more}` : ""}
                      </td>
                    </tr>
                  );
              })}
            </tbody>
            </table>
          </div>

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}

          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontWeight: 900 }}>
              Deleted accounts ({deletedUsers.length})
            </summary>
            <div style={{ marginTop: 8, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              <table width="100%" cellPadding={6} style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                    <th style={{ width: 54 }}>ID</th>
                    <th>Name</th>
                    <th style={{ width: 260 }}>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedUsers.map((u) => (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td>{u.id}</td>
                      <td>
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          disabled={acting !== ""}
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: acting !== "" ? "not-allowed" : "pointer",
                            textAlign: "left",
                            color: "#2563eb",
                            fontWeight: 800,
                          }}
                        >
                          {u.fullName}
                        </button>
                      </td>
                      <td>{u.email}</td>
                    </tr>
                  ))}
                  {!loading && deletedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ color: "var(--muted)" }}>
                        No deleted accounts.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      </div>

      {/* Create user modal */}
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
              maxWidth: 960,
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
              <span>Create user</span>
              <button
                type="button"
                className="btn"
                onClick={() => setCreateOpen(false)}
                disabled={acting !== ""}
              >
                Close
              </button>
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ display: "block" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Username</div>
                <input
                  className="input"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user1"
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
                <input
                  className="input"
                  autoComplete="off"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder=""
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Full name</div>
                <input
                  className="input"
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=""
                />
              </label>

              <label style={{ display: "block" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Department</div>
                <select
                  className="input"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">None</option>
                  {departments
                    .filter((d) => d.isActive !== false)
                    .map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                      </option>
                    ))}
                </select>
              </label>

              <label style={{ display: "block", gridColumn: "1 / -1" }}>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Password</div>
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                />
              </label>
            </div>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
                marginTop: 10,
              }}
            >
              <input
                type="checkbox"
                checked={createIsActive}
                onChange={(e) => setCreateIsActive(e.target.checked)}
              />
              <span style={{ fontWeight: 800 }}>Active</span>
            </label>

            <div style={{ fontWeight: 800, marginBottom: 6 }}>Roles</div>
            <RolePicker
              allRoles={roles}
              selected={createRoleNames}
              setSelected={setCreateRoleNames}
              disabled={false}
            />

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                className="btn btn-primary"
                onClick={createUser}
                disabled={acting !== ""}
              >
                {acting === "create" ? "Saving…" : "Create"}
              </button>
            </div>

            <p style={{ color: "var(--muted)", marginTop: 10 }}>
              Note: User management requires <strong>SYS_ADMIN</strong>.
            </p>
          </div>
        </div>
      )}

      {editingId && (
        (() => {
          const editingUser = users.find((u) => u.id === editingId);
          const isSystem = editingUser?.isSystem === true;

          return (
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
              maxWidth: 960,
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            }}
          >
            <h3 style={{ marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Edit user</span>
              <button className="btn" type="button" onClick={() => setEditingId(null)} disabled={acting !== ""}>
                Close
              </button>
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Full name</div>
                    <input className="input" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                  </label>

                  <label>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Username</div>
                    <input
                      className="input"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      disabled={isSystem}
                    />
                  </label>

                  <label>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
                    <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                  </label>

                  <label>
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Department</div>
                    <select
                      className="input"
                      value={editDepartmentId}
                      onChange={(e) => setEditDepartmentId(e.target.value)}
                      disabled={isSystem}
                    >
                      <option value="">None</option>
                      {departments.filter((d) => d.isActive !== false).map((d) => (
                        <option key={d.id} value={String(d.id)}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    disabled={isSystem}
                  />
                  <span style={{ fontWeight: 800 }}>Active</span>
                </label>

                <div style={{ fontWeight: 800, marginTop: 10, marginBottom: 6 }}>Password reset</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    className="input"
                    type="text"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Leave empty to keep current password"
                  />
                  <button className="btn" type="button" onClick={generatePassword} disabled={acting !== ""}>
                    Generate
                  </button>
                  <button
                    className="btn"
                    type="button"
                    disabled={acting !== "" || !resetPassword}
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(resetPassword);
                      } catch {}
                    }}
                  >
                    Copy
                  </button>
                </div>
                <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>
                  Tip: Generate, copy, then Save.
                </div>
              </div>

              <div>
                <div style={{ fontWeight: 800, marginBottom: 6 }}>Roles</div>
                <RolePicker allRoles={roles} selected={editRoleNames} setSelected={setEditRoleNames} disabled={isSystem} />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary" onClick={saveEdit} disabled={acting !== ""}>
                  {acting === `save-${editingId}` ? "Saving…" : "Save"}
                </button>
                <button className="btn" onClick={() => setEditingId(null)} disabled={acting !== ""}>
                  Cancel
                </button>
              </div>

              <button
                className="btn"
                style={{ color: "#b91c1c" }}
                onClick={deleteUser}
                disabled={acting !== "" || isSystem}
                title={isSystem ? "System account cannot be deleted" : undefined}
              >
                {acting === `delete-${editingId}` ? "Deleting…" : "Delete user"}
              </button>
            </div>
          </div>
        </div>
          );
        })()
      )}
      </InternalPage>
    </RequireRoles>
  );
}
