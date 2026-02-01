"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../../lib/api";

export default function AdminRequisitionAssignmentsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [assignedRequisitions, setAssignedRequisitions] = useState<any[]>([]);
  const [officerOptions, setOfficerOptions] = useState<any[]>([]);
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [selectedReqId, setSelectedReqId] = useState<number | null>(null);
  const [officerIds, setOfficerIds] = useState<number[]>([]);
  const [managerId, setManagerId] = useState<number | null>(null);
  const [officerDropdownOpen, setOfficerDropdownOpen] = useState(false);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [reqs, officersResp, managersResp] = await Promise.all([
        apiGet("/requisitions"),
        apiGet("/users/lookup?role=REQUISITION_OFFICER"),
        apiGet("/users/lookup?role=REQUISITION_MANAGER"),
      ]);
      const allReqs = Array.isArray(reqs) ? reqs : [];
      // Reqs with at least one officer assignment are treated as assigned
      const assignedIds = new Set<number>();
      for (const r of allReqs) {
        const assigns = Array.isArray((r as any).officerAssignments) ? (r as any).officerAssignments : [];
        if (assigns.length) assignedIds.add(r.id);
      }
      // Unassigned list: show only non-draft requisitions with no officer assignments
      setRequisitions(allReqs.filter((r) => !assignedIds.has(r.id) && String(r.status) !== "DRAFT"));
      setAssignedRequisitions(allReqs.filter((r) => assignedIds.has(r.id)));

      const rawOfficers = Array.isArray(officersResp) ? officersResp : [];
      const rawManagers = Array.isArray(managersResp) ? managersResp : [];

      const withoutSysAdmin = (users: any[]) =>
        users.filter((u) => {
          if (!Array.isArray(u.roles)) return true;
          // roles can be ['SYS_ADMIN', ...] or [{ role: { name: 'SYS_ADMIN' } }, ...]
          const names = u.roles
            .map((r: any) => {
              if (typeof r === 'string') return r;
              if (r?.role?.name) return String(r.role.name);
              if (r?.name) return String(r.name);
              return null;
            })
            .filter((v: any) => typeof v === 'string');
          return !names.includes('SYS_ADMIN');
        });

      setOfficerOptions(withoutSysAdmin(rawOfficers));
      setManagerOptions(withoutSysAdmin(rawManagers));
      if (!selectedReqId && Array.isArray(reqs) && reqs.length) {
        setSelectedReqId(reqs[0].id);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadExistingForReq = async (id: number) => {
    try {
      const [officers, req] = await Promise.all([
        apiGet(`/requisitions/${id}/officers`),
        apiGet(`/requisitions/${id}`),
      ]);
      const assignments = Array.isArray(officers?.assignments) ? officers.assignments : [];
      const oIds = assignments
        .filter((a: any) => a.user && a.user.roles?.some((ur: any) => ur?.role?.name === "REQUISITION_OFFICER"))
        .map((a: any) => Number(a.userId))
        .filter((n: any) => Number.isFinite(n));
      setOfficerIds(oIds.slice(0, 2));

      const mgrId = req?.managerId ? Number(req.managerId) : null;
      setManagerId(Number.isFinite(mgrId as any) ? (mgrId as number) : null);
    } catch {
      setOfficerIds([]);
      setManagerId(null);
    }
  };

  const onSelectReq = (id: number) => {
    setSelectedReqId(id);
    loadExistingForReq(id);
  };

  const toggleOfficer = (id: number) => {
    setOfficerIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev; // do not add more than 2
      return [...prev, id];
    });
  };

  const save = async () => {
    if (!selectedReqId) return;
    setError("");
    setActing("save");
    try {
      if (officerIds.length !== 2) throw new Error("Select exactly two officers");
      // managerId may be null to indicate no manager assigned

      // Save officer + manager assignments via existing endpoint
      await apiPut(`/requisitions/${selectedReqId}/officers`, {
        officers: officerIds.map((id, idx) => ({ userId: id, isLead: idx === 0 })),
        managerId,
      });

      await load();
      await loadExistingForReq(selectedReqId);
    } catch (e: any) {
      setError(e?.message || "Failed to save assignments");
    } finally {
      setActing("");
    }
  };

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Requisition officer assignments">
      <InternalPage title="Requisition officer assignments">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link className="btn" href="/admin/roles">
          Back to roles
        </Link>
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "flex-start" }}>
        <div className="card" style={{ boxShadow: "none", maxHeight: 520, overflow: "auto" }}>
          <h3 style={{ marginTop: 0 }}>Requisitions (unassigned)</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {requisitions.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className={selectedReqId === r.id ? "btn btn-primary" : "btn"}
                  style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                  onClick={() => onSelectReq(r.id)}
>
                  #{r.id} {r.title}
                </button>
              </li>
            ))}
            {!requisitions.length && !loading ? <li style={{ color: "var(--muted)" }}>No unassigned requisitions.</li> : null}
          </ul>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Assignments for requisition {selectedReqId ?? "-"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Officers dropdown */}
            <div>
              <h4 style={{ marginTop: 0 }}>Officers (pick 2)</h4>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "100%", justifyContent: "space-between" }}
                  onClick={() => setOfficerDropdownOpen((v) => !v)}
                >
                  <span>
                    {officerIds.length === 0
                      ? "Select officers"
                      : officerOptions
                          .filter((u) => officerIds.includes(Number(u.id)))
                          .map((u) => u.fullName)
                          .join(", ")}
                  </span>
                  <span>▾</span>
                </button>
                {officerDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      maxHeight: 260,
                      overflow: "auto",
                      padding: 8,
                      boxShadow: "0 10px 25px rgba(15,23,42,0.15)",
                    }}
                  >
                    {officerOptions.map((u) => {
                      const id = Number(u.id);
                      const checked = officerIds.includes(id);
                      const disabled = !checked && officerIds.length >= 2;
                      return (
                        <label
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 2px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggleOfficer(id)}
                          />
                          <span>
                            {u.fullName} ({u.email})
                          </span>
                        </label>
                      );
                    })}
                    {!officerOptions.length && !loading ? (
                      <div style={{ color: "var(--muted)", padding: 4 }}>No officers with REQUISITION_OFFICER role.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {/* Manager dropdown */}
            <div>
              <h4 style={{ marginTop: 0 }}>Manager (pick 1)</h4>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "100%", justifyContent: "space-between" }}
                  onClick={() => setManagerDropdownOpen((v) => !v)}
                >
                  <span>
                    {managerId
                      ? managerOptions.find((u) => Number(u.id) === managerId)?.fullName || "Select manager"
                      : "Select manager"}
                  </span>
                  <span>▾</span>
                </button>
                {managerDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "110%",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "#fff",
                      border: "1px solid var(--border)",
                      borderRadius: 10,
                      maxHeight: 260,
                      overflow: "auto",
                      padding: 8,
                      boxShadow: "0 10px 25px rgba(15,23,42,0.15)",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "4px 2px",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={managerId == null}
                        onChange={() => setManagerId(null)}
                      />
                      <span>(None)</span>
                    </label>
                    {managerOptions.map((u) => {
                      const id = Number(u.id);
                      const checked = managerId === id;
                      const disabled = managerId != null && managerId !== id;
                      return (
                        <label
                          key={u.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "4px 2px",
                            cursor: disabled ? "not-allowed" : "pointer",
                            opacity: disabled ? 0.5 : 1,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => setManagerId(checked ? null : id)}
                          />
                          <span>
                            {u.fullName} ({u.email})
                          </span>
                        </label>
                      );
                    })}
                    {!managerOptions.length && !loading ? (
                      <div style={{ color: "var(--muted)", padding: 4 }}>No users with REQUISITION_MANAGER role.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn btn-submit" onClick={save} disabled={acting !== "" || !selectedReqId}>
              {acting === "save" ? "Saving…" : "Save assignments"}
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Records Table */}
      {assignedRequisitions.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Assigned Requisitions</h3>
          <div style={{ overflowX: "auto" }}>
            <table
              width="100%"
              cellPadding={8}
              style={{ borderCollapse: "collapse", fontSize: 13 }}
            >
              <thead>
                <tr style={{ textAlign: "left", background: "#f9fafb" }}>
                  <th style={{ borderBottom: "1px solid #d1d5db", width: 80 }}>ID</th>
                  <th style={{ borderBottom: "1px solid #d1d5db" }}>Title</th>
                  <th style={{ borderBottom: "1px solid #d1d5db", width: 200 }}>Assigned Officers</th>
                  <th style={{ borderBottom: "1px solid #d1d5db", width: 150 }}>Assigned Manager</th>
                  <th style={{ borderBottom: "1px solid #d1d5db", width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignedRequisitions.map((req) => {
                  const officers = (req.officerAssignments || [])
                    .map((a: any) => {
                      const officer = officerOptions.find(
                        (u: any) => Number(u.id) === Number(a.userId)
                      );
                      return officer?.fullName || `User ${a.userId}`;
                    })
                    .join(", ");
                  const manager = managerOptions.find(
                    (u: any) => Number(u.id) === Number(req.managerId)
                  );
                  const managerName = manager ? manager.fullName : "-";

                  const handleEdit = () => {
                    onSelectReq(req.id);
                  };

                  const handleDelete = async () => {
                    if (!confirm(`Remove assignments for ${req.title}?`)) return;
                    try {
                      setError("");
                      setActing("delete");
                      await apiPut(`/requisitions/${req.id}/officers`, {
                        officers: [],
                      });
                      await load();
                    } catch (e: any) {
                      setError(e?.message || "Failed to remove assignment");
                    } finally {
                      setActing("");
                    }
                  };

                  return (
                    <tr
                      key={req.id}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>#{req.id}</td>
                      <td>{req.title}</td>
                      <td>{officers || "-"}</td>
                      <td>{managerName}</td>
                      <td style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleEdit}
                          disabled={acting !== ""}
                          style={{ fontSize: 12, padding: "4px 8px" }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn"
                          onClick={handleDelete}
                          disabled={acting !== ""}
                          style={{ fontSize: 12, padding: "4px 8px", color: "#dc2626" }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </InternalPage>
    </RequireRoles>
  );
}
