"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../../../components/InternalPage";
import RequireRoles from "../../../../components/RequireRoles";
import { apiGet, apiPut } from "../../../../lib/api";

export default function AdminTenderOpeningAssignmentsPage() {
  const [tenders, setTenders] = useState<any[]>([]);
  const [assignedTenders, setAssignedTenders] = useState<any[]>([]);
  const [openingMemberOptions, setOpeningMemberOptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [selectedTenderId, setSelectedTenderId] = useState<string | null>(null);
  const [openingMemberIds, setOpeningMemberIds] = useState<number[]>([]);
  const [openingHeadId, setOpeningHeadId] = useState<number | null>(null);

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [tendersResp, openingMembers] = await Promise.all([
        apiGet("/tenders/admin/draft-for-assignment"),
        apiGet("/users/lookup?role=TENDER_OPENING_MEMBER"),
      ]);
      const all = Array.isArray(tendersResp) ? tendersResp : [];

      // For now, use the same draft tenders list; later we can expand to published/closed.
      const assigned = all.filter((row) => Array.isArray((row as any).openingCommittee) && (row as any).openingCommittee.length);
      const unassigned = all.filter((row) => !Array.isArray((row as any).openingCommittee) || (row as any).openingCommittee.length === 0);

      setTenders(unassigned);
      setAssignedTenders(assigned);
      setOpeningMemberOptions(Array.isArray(openingMembers) ? openingMembers : []);

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
      const opening = await apiGet(`/tenders/${id}/opening-committee`).catch(() => []);
      const rows = Array.isArray(opening) ? opening : [];

      const memberIds = rows
        .map((row: any) => Number(row.userId))
        .filter((n: any) => Number.isFinite(n));
      setOpeningMemberIds(memberIds);

      const headRow = rows.find((row: any) => row.isHead);
      const headId = headRow && Number.isFinite(Number(headRow.userId)) ? Number(headRow.userId) : null;
      setOpeningHeadId(headId);
    } catch {
      setOpeningMemberIds([]);
      setOpeningHeadId(null);
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
      if (openingMemberIds.length === 0) {
        await apiPut(`/tenders/${selectedTenderId}/opening-committee`, { members: [] });
      } else {
        if (!openingHeadId || !openingMemberIds.includes(openingHeadId)) {
          throw new Error("Select a head within the opening committee members");
        }
        await apiPut(`/tenders/${selectedTenderId}/opening-committee`, {
          members: openingMemberIds.map((id) => ({ userId: id, isHead: id === openingHeadId })),
        });
      }

      await load();
      await loadExistingForTender(selectedTenderId);
    } catch (e: any) {
      setError(e?.message || "Failed to save assignments");
    } finally {
      setActing("");
    }
  };

  const selectedTender = [...tenders, ...assignedTenders].find((t) => String(t.id) === String(selectedTenderId));
  const selectedTitle = selectedTender?.requisition?.title || (selectedTender ? "(Untitled tender)" : "-");

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Tender opening assignments">
      <InternalPage title="Tender opening assignments">
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
          <h3 style={{ marginTop: 0 }}>Draft tenders</h3>
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
            {!tenders.length && !loading ? <li style={{ color: "var(--muted)" }}>No draft tenders.</li> : null}
          </ul>

          <h3 style={{ marginTop: 16 }}>Tenders with opening committee</h3>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {assignedTenders.map((t) => (
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
            {!assignedTenders.length && !loading ? <li style={{ color: "var(--muted)" }}>No committees assigned.</li> : null}
          </ul>
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>
            Opening committee for tender: <span style={{ fontWeight: 500 }}>{selectedTitle}</span>
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            <div>
              <h4 style={{ marginTop: 0 }}>Members</h4>
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  padding: 8,
                  maxHeight: 260,
                  overflow: "auto",
                }}
              >
                {openingMemberOptions.map((u) => {
                  const id = Number(u.id);
                  const checked = openingMemberIds.includes(id);
                  return (
                    <label
                      key={u.id}
                      style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0", cursor: "pointer" }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setOpeningMemberIds((prev) =>
                            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
                          );
                          if (openingHeadId === id && checked) {
                            setOpeningHeadId(null);
                          }
                        }}
                      />
                      <span>
                        {u.fullName} ({u.email})
                      </span>
                    </label>
                  );
                })}
                {!openingMemberOptions.length && !loading ? (
                  <div style={{ color: "var(--muted)", padding: 4 }}>
                    No users with TENDER_OPENING_MEMBER role.
                  </div>
                ) : null}
              </div>
            </div>

            <div>
              <h4 style={{ marginTop: 0 }}>Head of committee</h4>
              <select
                className="input"
                value={openingHeadId != null ? String(openingHeadId) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setOpeningHeadId(v ? Number(v) : null);
                }}
              >
                <option value="">(Select head)</option>
                {openingMemberIds.map((id) => {
                  const u = openingMemberOptions.find((x) => Number(x.id) === id);
                  if (!u) return null;
                  return (
                    <option key={id} value={String(id)}>
                      {u.fullName} ({u.email})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={save} disabled={acting !== "" || !selectedTenderId}>
              {acting === "save" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
