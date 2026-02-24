"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../../lib/api";

export default function AdminTenderAssignmentsPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [assignedTenders, setAssignedTenders] = useState<any[]>([]);
  const [officerOptions, setOfficerOptions] = useState<any[]>([]);
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [officerIds, setOfficerIds] = useState<number[]>([]);
  const [officerDropdownOpen, setOfficerDropdownOpen] = useState(false);

  const [prepManagerId, setPrepManagerId] = useState<number | null>(null);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [tendersResp, officersResp, managersResp] = await Promise.all([
        apiGet("/tenders/admin/draft-for-assignment"),
        apiGet("/users/lookup?role=TENDERING_OFFICER"),
        apiGet("/users/lookup?role=TENDER_APPROVAL"),
      ]);
      const all = Array.isArray(tendersResp) ? tendersResp : [];

      // Filter for Tender Preparation stage: TENDER_READY requisitions or TENDER_PREP_* tenders
      const tenderStatuses = new Set(["TENDER_READY", "TENDER_PREP_DRAFT", "TENDER_PREP_REVIEW", "DRAFT_TENDER_RETURN", "TENDER_PREP_RETURNED", "TENDER_PREP_APPROVED"]);
      const prepTenders = all.filter((t) => tenderStatuses.has(String(t.status || "")));

      const assigned = prepTenders.filter((row) => Array.isArray((row as any).officerAssignments) && (row as any).officerAssignments.length);
      const unassigned = prepTenders.filter((row) => !Array.isArray((row as any).officerAssignments) || (row as any).officerAssignments.length === 0);

      setTenders(unassigned);
      setAssignedTenders(assigned);

      const rawOfficers = Array.isArray(officersResp) ? officersResp : [];
      const rawManagers = Array.isArray(managersResp) ? managersResp : [];

      const withoutSysAdmin = (users: any[]) =>
        users.filter((u) => {
          if (!Array.isArray(u.roles)) return true;
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

      if (!selectedTenderId && all.length) {
        setSelectedTenderId(String(all[0].id));
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

  const loadExistingForTender = async (id: string) => {
    try {
      const [officers, prepMgr] = await Promise.all([
        apiGet(`/tenders/${id}/officers`),
        apiGet(`/tenders/${id}/prep-manager`).catch(() => null),
      ]);

      const assignments = Array.isArray(officers?.assignments) ? officers.assignments : [];
      const oIds = assignments
        .map((a: any) => Number(a.userId))
        .filter((n: any) => Number.isFinite(n));
      setOfficerIds(oIds.slice(0, 2));

      const mgrId = prepMgr && typeof prepMgr.id === "number" ? prepMgr.id : null;
      setPrepManagerId(mgrId);
    } catch {
      setOfficerIds([]);
      setPrepManagerId(null);
    }
  };

  const onSelectTender = (id: string) => {
    setSelectedTenderId(id);
    loadExistingForTender(id);
  };

  const save = async () => {
    if (!selectedTenderId) return;
    setError("");
    setActing("save");
    try {
      if (officerIds.length !== 2) throw new Error("Select exactly two officers");

      // Save officers
      await apiPut(`/tenders/${selectedTenderId}/officers`, {
        officers: officerIds.map((id, idx) => ({ userId: id, isLead: idx === 0 })),
      });

      // Save prep manager (allow null)
      await apiPut(`/tenders/${selectedTenderId}/prep-manager`, {
        managerId: prepManagerId,
      });

      await load();
      setSelectedTenderId(null);
      setOfficerIds([]);
      setPrepManagerId(null);
    } catch (e: any) {
      setError(e?.message || "Failed to save assignments");
    } finally {
      setActing("");
    }
  };

  const selectedTender = [...tenders, ...assignedTenders].find((t) => String(t.id) === String(selectedTenderId));
  const selectedTitle = selectedTender?.requisition?.title || (selectedTender ? "(Untitled tender)" : "-");

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Tender officer assignments">
      <InternalPage title="Tender officer assignments">
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
          <h3 style={{ marginTop: 0 }}>Draft tenders (unassigned)</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {tenders.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={selectedTenderId === String(t.id) ? "btn btn-primary" : "btn"}
                  style={{ width: "100%", justifyContent: "flex-start", marginBottom: 4 }}
                  onClick={() => onSelectTender(t.id)}
                >
                  {t.requisition?.title || "(Untitled tender)"}
                </button>
              </li>
            ))}
            {!tenders.length && !loading ? <li style={{ color: "var(--muted)" }}>No unassigned tenders.</li> : null}
          </ul>
        </div>

          <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>
            Preparation assignments for draft tender: <span style={{ fontWeight: 500 }}>{selectedTitle}</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "flex-start" }}>
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
                            onChange={() => {
                              setOfficerIds((prev) => {
                                if (prev.includes(id)) return prev.filter((x) => x !== id);
                                if (prev.length >= 2) return prev;
                                return [...prev, id];
                              });
                            }}
                          />
                          <span>
                            {u.fullName} ({u.email})
                          </span>
                        </label>
                      );
                    })}
                    {!officerOptions.length && !loading ? (
                      <div style={{ color: "var(--muted)", padding: 4 }}>No officers with TENDERING_OFFICER role.</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 style={{ marginTop: 0 }}>Preparation manager</h4>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  className="btn"
                  style={{ width: "100%", justifyContent: "space-between" }}
                  onClick={() => setManagerDropdownOpen((v) => !v)}
                >
                  <span>
                    {prepManagerId == null
                      ? "Select manager"
                      : managerOptions.find((u) => Number(u.id) === prepManagerId)?.fullName || "(Unknown)"}
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
                        checked={prepManagerId == null}
                        onChange={() => {
                          setPrepManagerId(null);
                        }}
                      />
                      <span>(None)</span>
                    </label>
                    {managerOptions.map((u) => {
                      const id = Number(u.id);
                      const checked = prepManagerId === id;
                      const disabled = prepManagerId != null && prepManagerId !== id;
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
                            onChange={() => {
                              setPrepManagerId(checked ? null : id);
                            }}
                          />
                          <span>
                            {u.fullName} ({u.email})
                          </span>
                        </label>
                      );
                    })}
                    {!managerOptions.length && !loading ? (
                      <div style={{ color: "var(--muted)", padding: 4 }}>
                        No users with TENDER_APPROVAL role.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn btn-submit" onClick={save} disabled={acting !== "" || !selectedTenderId}>
              {acting === "save" ? "Saving…" : "Save assignments"}
            </button>
          </div>
        </div>
      </div>

      {/* Assigned Records Table */}
      {assignedTenders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h3>Assigned Tenders</h3>
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
                {assignedTenders.map((tender) => {
                  const officers = (tender.officerAssignments || [])
                    .map((a: any) => {
                      const officer = officerOptions.find(
                        (u: any) => Number(u.id) === Number(a.userId)
                      );
                      return officer?.fullName || `User ${a.userId}`;
                    })
                    .join(", ");
                  const manager = managerOptions.find(
                    (u: any) => Number(u.id) === Number(tender.prepManagerId)
                  );
                  const managerName = manager ? manager.fullName : "-";

                  const handleEdit = () => {
                    onSelectTender(tender.id);
                  };

                  const handleDelete = async () => {
                    if (!confirm(`Remove assignments for ${tender.requisition?.title || "this tender"}?`)) return;
                    try {
                      setError("");
                      setActing("delete");
                      await apiPut(`/tenders/${tender.id}/officers`, {
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
                      key={tender.id}
                      style={{ borderBottom: "1px solid #e5e7eb" }}
                    >
                      <td style={{ fontVariantNumeric: "tabular-nums" }}>
                        TEN-{String(tender.tender_id || 0).padStart(5, "0")}
                      </td>
                      <td>{tender.requisition?.title || tender.title || "(Untitled)"}</td>
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
