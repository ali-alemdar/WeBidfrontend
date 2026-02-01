"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut, apiPost } from "../../../../lib/api";

export default function AdminTenderPublishingAssignmentsPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [assignedTenders, setAssignedTenders] = useState<any[]>([]);
  const [preparerOptions, setPreparerOptions] = useState<any[]>([]);
  const [managerOptions, setManagerOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [preparerIds, setPreparerIds] = useState<number[]>([]);
  const [preparerDropdownOpen, setPreparerDropdownOpen] = useState(false);

  const [publishManagerId, setPublishManagerId] = useState<number | null>(null);
  const [managerDropdownOpen, setManagerDropdownOpen] = useState(false);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [tendersResp, preparersResp, managersResp] = await Promise.all([
        apiGet("/tenders/admin/for-publication-assignment"),
        apiGet("/users/lookup?role=TENDER_PUBLICATION_PREPARER"),
        apiGet("/users/lookup?role=TENDER_PUBLICATION_MANAGER"),
      ]);
      const all = Array.isArray(tendersResp) ? tendersResp : [];

      // Unassigned: TENDER_PREP_COMPLETE status with no publication setup
      const unassigned = all.filter(
        (row) =>
          String(row.status || "") === "TENDER_PREP_COMPLETE" &&
          (!Array.isArray((row as any).publicationSetups) ||
            (row as any).publicationSetups.length === 0)
      );
      
      // Assigned: Any publication status or has publication setup
      const assigned = all.filter(
        (row) =>
          String(row.status || "") !== "TENDER_PREP_COMPLETE" ||
          (Array.isArray((row as any).publicationSetups) &&
            (row as any).publicationSetups.length > 0)
      );

      setTenders(unassigned);
      setAssignedTenders(assigned);

      const rawPreparers = Array.isArray(preparersResp) ? preparersResp : [];
      const rawManagers = Array.isArray(managersResp) ? managersResp : [];

      const withoutSysAdmin = (users: any[]) =>
        users.filter((u) => {
          if (!Array.isArray(u.roles)) return true;
          const names = u.roles
            .map((r: any) => {
              if (typeof r === "string") return r;
              if (r?.role?.name) return String(r.role.name);
              if (r?.name) return String(r.name);
              return null;
            })
            .filter((v: any) => typeof v === "string");
          return !names.includes("SYS_ADMIN");
        });

      setPreparerOptions(withoutSysAdmin(rawPreparers));
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
      // For assigned tenders, load from publication setup signatures
      const setupResp = await apiGet(`/tenders/${id}/publication-setup`).catch(() => null);
      
      if (setupResp) {
        // Extract preparers and manager from signatures
        const signatures = Array.isArray(setupResp.signatures) ? setupResp.signatures : [];
        const preparerSigs = signatures.filter((s: any) => s.role === 'PUBLICATION_PREPARER');
        const managerSig = signatures.find((s: any) => s.role === 'PUBLICATION_MANAGER');
        
        const pIds = preparerSigs
          .map((s: any) => Number(s.userId))
          .filter((n: any) => Number.isFinite(n));
        setPreparerIds(pIds);
        
        const mgrId = managerSig && Number.isFinite(managerSig.userId) ? managerSig.userId : null;
        setPublishManagerId(mgrId);
      } else {
        // Fallback to old endpoints for unassigned tenders
        const [preparers, pubMgr] = await Promise.all([
          apiGet(`/tenders/${id}/publication-team`).catch(() => null),
          apiGet(`/tenders/${id}/publication-manager`).catch(() => null),
        ]);

        const assignments = Array.isArray(preparers?.preparers)
          ? preparers.preparers
          : [];
        const pIds = assignments
          .map((a: any) => Number(a.userId))
          .filter((n: any) => Number.isFinite(n));
        setPreparerIds(pIds);

        const mgrId =
          pubMgr && typeof pubMgr.id === "number" ? pubMgr.id : null;
        setPublishManagerId(mgrId);
      }
    } catch {
      setPreparerIds([]);
      setPublishManagerId(null);
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
      if (preparerIds.length === 0) throw new Error("Select at least one preparer");
      if (publishManagerId == null) throw new Error("Select a publication manager");

      // Find the selected tender to check its current status
      const selectedTender = [...tenders, ...assignedTenders].find(
        (t) => String(t.id) === String(selectedTenderId)
      );

      // Only transition if still in TENDER_PREP_COMPLETE status
      if (selectedTender?.status === "TENDER_PREP_COMPLETE") {
        await apiPost(`/tenders/${selectedTenderId}/move-to-publishing`, {});
      }

      // Save publication team (preparers and manager) in one call
      await apiPut(`/tenders/${selectedTenderId}/publication-team`, {
        publishManagerId: publishManagerId,
        preparerUserIds: preparerIds,
      });

      await load();
      await loadExistingForTender(selectedTenderId);
    } catch (e: any) {
      setError(e?.message || "Failed to save assignments");
    } finally {
      setActing("");
    }
  };

  const selectedTender = [...tenders, ...assignedTenders].find(
    (t) => String(t.id) === String(selectedTenderId)
  );
  const selectedTitle =
    selectedTender?.requisition?.title ||
    (selectedTender ? "(Untitled tender)" : "-");

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Tender Publishing assignments">
      <InternalPage title="Tender Publishing assignments">
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Link className="btn" href="/admin/roles">
            Back to roles
          </Link>
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>

        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div
            className="card"
            style={{ boxShadow: "none", maxHeight: 520, overflow: "auto" }}
          >
            <h3 style={{ marginTop: 0 }}>Draft tenders (unassigned)</h3>
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {tenders.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={
                      selectedTenderId === String(t.id)
                        ? "btn btn-primary"
                        : "btn"
                    }
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      marginBottom: 4,
                    }}
                    onClick={() => onSelectTender(t.id)}
                  >
                    {t.requisition?.title || "(Untitled tender)"}
                  </button>
                </li>
              ))}
              {!tenders.length && !loading ? (
                <li style={{ color: "var(--muted)" }}>
                  No unassigned tenders.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="card" style={{ boxShadow: "none" }}>
            <h3 style={{ marginTop: 0 }}>
              Publication assignments for draft tender:{" "}
              <span style={{ fontWeight: 500 }}>{selectedTitle}</span>
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                alignItems: "flex-start",
              }}
            >
              <div>
                <h4 style={{ marginTop: 0 }}>Publication Preparers</h4>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                    onClick={() =>
                      setPreparerDropdownOpen((v) => !v)
                    }
                  >
                    <span>
                      {preparerIds.length === 0
                        ? "Select preparers"
                        : preparerOptions
                            .filter((u) =>
                              preparerIds.includes(Number(u.id))
                            )
                            .map((u) => u.fullName)
                            .join(", ")}
                    </span>
                    <span>▾</span>
                  </button>
                  {preparerDropdownOpen && (
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
                        boxShadow:
                          "0 10px 25px rgba(15,23,42,0.15)",
                      }}
                    >
                      {preparerOptions.map((u) => {
                        const id = Number(u.id);
                        const checked = preparerIds.includes(id);
                        return (
                          <label
                            key={u.id}
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
                              checked={checked}
                              onChange={() => {
                                setPreparerIds((prev) => {
                                  if (prev.includes(id))
                                    return prev.filter(
                                      (x) => x !== id
                                    );
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
                      {!preparerOptions.length && !loading ? (
                        <div
                          style={{
                            color: "var(--muted)",
                            padding: 4,
                          }}
                        >
                          No preparers with TENDER_PUBLICATION_PREPARER
                          role.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h4 style={{ marginTop: 0 }}>
                  Publication Manager
                </h4>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="btn"
                    style={{
                      width: "100%",
                      justifyContent: "space-between",
                    }}
                    onClick={() =>
                      setManagerDropdownOpen((v) => !v)
                    }
                  >
                    <span>
                      {publishManagerId == null
                        ? "Select manager"
                        : managerOptions.find(
                              (u) =>
                                Number(u.id) ===
                                publishManagerId
                            )?.fullName || "(Unknown)"}
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
                        boxShadow:
                          "0 10px 25px rgba(15,23,42,0.15)",
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
                          type="radio"
                          name="manager"
                          checked={publishManagerId == null}
                          onChange={() => setPublishManagerId(null)}
                        />
                        <span>(None)</span>
                      </label>
                      {managerOptions.map((u) => {
                        const id = Number(u.id);
                        const checked = publishManagerId === id;
                        return (
                          <label
                            key={u.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              padding: "4px 2px",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="radio"
                              name="manager"
                              checked={checked}
                              onChange={() =>
                                setPublishManagerId(id)
                              }
                            />
                            <span>
                              {u.fullName} ({u.email})
                            </span>
                          </label>
                        );
                      })}
                      {!managerOptions.length && !loading ? (
                        <div
                          style={{
                            color: "var(--muted)",
                            padding: 4,
                          }}
                        >
                          No managers with TENDER_PUBLICATION_MANAGER
                          role.
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 20,
              }}
            >
              <button
                className="btn btn-primary"
                onClick={save}
                disabled={acting !== ""}
              >
                {acting === "save"
                  ? "Saving…"
                  : "Save assignments"}
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
                    <th style={{ borderBottom: "1px solid #d1d5db", width: 200 }}>Assigned Preparers</th>
                    <th style={{ borderBottom: "1px solid #d1d5db", width: 150 }}>Assigned Manager</th>
                    <th style={{ borderBottom: "1px solid #d1d5db", width: 100 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedTenders.map((tender) => {
                    const setup = tender.publicationSetups && tender.publicationSetups[0];
                    const signatures = setup?.signatures || [];
                    const preparers = signatures
                      .filter((s: any) => s.role === "PUBLICATION_PREPARER")
                      .map((s: any) => {
                        const preparer = preparerOptions.find(
                          (u: any) => Number(u.id) === s.userId
                        );
                        return preparer?.fullName || `User ${s.userId}`;
                      })
                      .join(", ");
                    const manager = (() => {
                      const managerSig = signatures.find(
                        (s: any) => s.role === "PUBLICATION_MANAGER"
                      );
                      if (managerSig) {
                        const mgr = managerOptions.find(
                          (u: any) => Number(u.id) === managerSig.userId
                        );
                        return mgr?.fullName || `User ${managerSig.userId}`;
                      }
                      return "-";
                    })();

                    const handleEdit = () => {
                      onSelectTender(tender.id);
                    };

                    const handleDelete = async () => {
                      if (!confirm(`Remove assignment for ${tender.requisition?.title || "this tender"}?`)) return;
                      try {
                        setError("");
                        setActing("delete");
                        // Delete the publication setup to revert to unassigned state
                        if (setup) {
                          await apiPut(`/tenders/${tender.id}/publication-setup/unassign`, {});
                        }
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
                          TEN-{String(tender.tenderNumber || 0).padStart(5, "0")}
                        </td>
                        <td>{tender.requisition?.title || tender.title || "(Untitled)"}</td>
                        <td>{preparers || "-"}</td>
                        <td>{manager}</td>
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
