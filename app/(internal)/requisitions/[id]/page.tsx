"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiDelete, apiGet, apiPost, apiPut, apiUpload } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

interface Props {
  params: { id: string };
}

type TabKey = "request" | "items" | "final";

function isoDateInput(v: any) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function SideNavButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "btn btn-primary" : "btn"}
      onClick={onClick}
      style={{ justifyContent: "flex-start", width: "100%" }}
    >
      {label}
    </button>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: any;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "min(900px, 100%)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "none",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ marginTop: 0, marginBottom: 0 }}>{title}</h3>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

export default function RequisitionDetailPage({ params }: Props) {
  const router = useRouter();

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];
  const isSysAdmin = roles.includes("SYS_ADMIN");
  const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;
  const isManager = roles.includes("REQUISITION_MANAGER") || roles.includes("APPROVER") || isSysAdmin;
  const isRequesterOnly = roles.includes("REQUESTER") && !isOfficer && !isManager;

  const [tab, setTab] = useState<TabKey>("request");

  const [data, setData] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [uoms, setUoms] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [acting, setActing] = useState<string>("");

  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const suppressAutosaveRef = useRef(true);
  const autosaveTimerRef = useRef<any>(null);

  // Requisition header/request fields
  const [title, setTitle] = useState("");
  const [requestingDepartment, setRequestingDepartment] = useState("");
  const [purpose, setPurpose] = useState<"Budgeting" | "Bidding" | "">("");
  const [targetTimeline, setTargetTimeline] = useState<string>("");
  const [ledgerCategory, setLedgerCategory] = useState<string>("");
  const [description, setDescription] = useState("");

  const UOM_FALLBACK = [
    "EA",
    "SET",
    "LOT",
    "BOX",
    "KG",
    "G",
    "L",
    "ML",
    "M",
    "M2",
    "M3",
    "HR",
    "DAY",
    "MONTH",
  ];

  const UOM_OPTIONS = (Array.isArray(uoms) && uoms.length ? uoms : UOM_FALLBACK.map((c) => ({ code: c }))).map(
    (x: any) => String(x?.code || x || "").trim()
  ).filter(Boolean);

  // Items add fields
  const [itemType, setItemType] = useState<"MATERIAL" | "SERVICE">("MATERIAL");
  const [itemCategoryId, setItemCategoryId] = useState<string>("");
  const [itemName, setItemName] = useState("");
  const [itemTech, setItemTech] = useState("");
  const [itemUom, setItemUom] = useState("EA");
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemAssumptions, setItemAssumptions] = useState<string>("");
  const [itemStandards, setItemStandards] = useState<string>("");
  // Items edit modal
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editType, setEditType] = useState<"MATERIAL" | "SERVICE">("MATERIAL");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editTech, setEditTech] = useState("");
  const [editUom, setEditUom] = useState("EA");
  const [editQty, setEditQty] = useState<number>(1);
  const [editAssumptions, setEditAssumptions] = useState<string>("");
  const [editStandards, setEditStandards] = useState<string>("");

  const steps: { key: TabKey; label: string }[] = [
    { key: "request", label: "Request" },
    { key: "items", label: "Items" },
  ];

  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  const invitations: any[] = Array.isArray(data?.invitations) ? data.invitations : [];


  const load = async () => {
    setError("");
    setLoading(true);
    suppressAutosaveRef.current = true;
    try {
      const calls: Promise<any>[] = [
        apiGet(`/requisitions/${params.id}`),
        apiGet("/departments"),
        apiGet("/uom"),
        apiGet("/item-categories"),
      ];

      const res = await Promise.all(calls);
      const r = res[0];
      const d = res[1];
      const u = res[2];
      const c = res[3];

      setData(r);

      setDepartments(Array.isArray(d) ? d : []);
      setUoms(Array.isArray(u) ? u : []);
      setItemCategories(Array.isArray(c) ? c : []);

      setTitle(r?.title || "");
      setRequestingDepartment(r?.requestingDepartment || "");
      setPurpose(r?.purpose || "");
      setTargetTimeline(r?.targetTimeline ? String(r.targetTimeline).slice(0, 10) : "");
      setLedgerCategory(r?.ledgerCategory || "");
      setDescription(r?.description || "");

      setAutoSaveState("idle");
    } catch (e: any) {
      setError(e?.message || "Failed to load requisition");
    } finally {
      setLoading(false);
      // Allow autosave for user edits after initial hydration.
      setTimeout(() => {
        suppressAutosaveRef.current = false;
      }, 0);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const doAction = async (name: string, fn: () => Promise<any>) => {
    setError("");
    setActing(name);
    try {
      await fn();
      await load();
    } catch (e: any) {
      setError(e?.message || "Action failed");
    } finally {
      setActing("");
    }
  };

  const canRequesterEdit = isRequesterOnly && String(data?.status || "") === "DRAFT";
  const canEdit = !isRequesterOnly || canRequesterEdit;

  const saveAll = async () => {
    if (!data?.id) return;
    if (!canEdit) return;
    setAutoSaveState("saving");
    try {
      await apiPut(`/requisitions/${data.id}`, {
        title,
        requestingDepartment,
        purpose,
        targetTimeline: targetTimeline || null,
        ledgerCategory: ledgerCategory || null,
        description,
      });
      setAutoSaveState("saved");
    } catch (e: any) {
      setAutoSaveState("error");
      setError(e?.message || "Failed to save");
    }
  };

  // Autosave (debounced) for request fields.
  useEffect(() => {
    if (!data?.id) return;
    if (loading) return;
    if (acting !== "") return;
    if (!canEdit) return;
    if (suppressAutosaveRef.current) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      saveAll();
    }, 900);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, requestingDepartment, purpose, targetTimeline, ledgerCategory, description]);

  const submitDraft = () =>
    doAction("submitDraft", async () => {
      await apiPost(`/requisitions/${data.id}/submit`, {});
      router.replace(isRequesterOnly ? "/requisitions/status" : "/requisitions/list");
    });


  const openEditItem = (it: any) => {
    setEditingItem(it);
    setEditType((it?.itemType || "MATERIAL") as any);
    setEditCategoryId(it?.itemCategoryId != null ? String(it.itemCategoryId) : "");
    setEditName(it?.name || "");
    setEditTech(it?.technicalDescription || "");
    setEditUom(it?.uom || "EA");
    setEditQty(Number(it?.quantity ?? 1));
    setEditAssumptions(it?.assumptionsExclusions || "");
    setEditStandards(it?.requiredStandards || "");
  };

  const saveEditItem = () =>
    doAction("saveItem", async () => {
      if (!editingItem?.id) return;
      await apiPut(`/requisitions/${data.id}/items/${editingItem.id}`, {
        itemType: editType,
        itemCategoryId: editCategoryId || null,
        name: editName,
        technicalDescription: editTech,
        uom: editUom,
        quantity: editQty,
        assumptionsExclusions: editAssumptions || null,
        requiredStandards: editStandards || null,
      });
      setEditingItem(null);
    });

  if (loading && !data) {
    return (
      <RequireRoles anyOf={["REQUESTER", "REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title={`Requisition ${params.id}`}>
        <InternalPage title={`Requisition ${params.id}`}>
          <p>Loading…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  if (!data) {
    return (
      <RequireRoles anyOf={["REQUESTER", "REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title={`Requisition ${params.id}`}>
        <InternalPage title={`Requisition ${params.id}`}>
          {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : <p>Not found.</p>}
        </InternalPage>
      </RequireRoles>
    );
  }

  // If requisition uses manual submissions, redirect directly to the manual submissions form.
  if (data?.manualSubmissions) {
    if (typeof window !== "undefined") {
      window.location.replace(`/requisitions/${data.id}/manual-submissions`);
    }
    return (
      <RequireRoles anyOf={["REQUESTER", "REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title={`Requisition ${data.id}`}>
        <InternalPage title={`Requisition ${data.id}`}>
          <p>Redirecting to manual submissions…</p>
        </InternalPage>
      </RequireRoles>
    );
  }

  return (
    <RequireRoles anyOf={["REQUESTER", "REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title={`Requisition ${data.id}`}>
      <InternalPage title={`Requisition ${data.id}`}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill">Status: {data.status === "MANUAL_ENTRY" ? "Manual entry" : data.status}</span>
          {data.createdBy?.email && <span className="pill">Created by: {data.createdBy.email}</span>}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
          {autoSaveState !== "idle" && (
            <span className="pill">
              {autoSaveState === "saving" && "Saving…"}
              {autoSaveState === "saved" && "Saved"}
              {autoSaveState === "error" && "Save failed"}
            </span>
          )}

          {canEdit && String(data?.status || "") === "DRAFT" ? (
            <button className="btn btn-submit" disabled={acting !== ""} onClick={submitDraft}>
              {acting === "submitDraft" ? "Submitting…" : "Submit"}
            </button>
          ) : null}

          <Link
            className="btn"
            href={isRequesterOnly ? "/requisitions/status" : "/requisitions/list"}
            style={{ display: "inline-flex", alignItems: "center" }}
          >
            Back
          </Link>
        </div>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      {isRequesterOnly && !canRequesterEdit ? (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(0,0,0,0.02)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Submitted</div>
          <div style={{ color: "var(--muted)" }}>
            This requisition has been submitted and is now read-only for you. A requisition officer will continue processing it.
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
        <aside style={{ width: 220 }}>
          <div className="card" style={{ boxShadow: "none" }}>
            <div style={{ display: "grid", gap: 8 }}>
              {steps.map((s) => (
                <SideNavButton key={s.key} active={tab === s.key} label={s.label} onClick={() => setTab(s.key)} />
              ))}
            </div>
          </div>
        </aside>

        <main style={{ flex: 1, minWidth: 0 }}>
          {tab === "request" && (
            <div className="card" style={{ boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>Internal Request</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Business Need / Title</div>
                  <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} />
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Requesting Department</div>
                  <select className="input" value={requestingDepartment} onChange={(e) => setRequestingDepartment(e.target.value)} disabled={!canEdit}>
                    <option value="">Select…</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Purpose</div>
                  <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as any)} disabled={!canEdit}>
                    <option value="">Select…</option>
                    <option value="Budgeting">Budgeting</option>
                    <option value="Bidding">Bidding</option>
                  </select>
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Target date</div>
                  <input className="input" type="date" value={targetTimeline} onChange={(e) => setTargetTimeline(e.target.value)} disabled={!canEdit} />
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Ledger Category</div>
                  <input className="input" value={ledgerCategory} onChange={(e) => setLedgerCategory(e.target.value)} placeholder="Optional" disabled={!canEdit} />
                </label>
              </div>

              <label style={{ display: "block", marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Details</div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "0.75rem 0.9rem",
                    fontFamily: "inherit",
                    minHeight: 160,
                    width: "100%",
                  }}
                />
              </label>
            </div>
          )}

          {tab === "items" && (
            <div className="card" style={{ boxShadow: "none" }}>
              <h3 style={{ marginTop: 0 }}>Items / Services</h3>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Item name</div>
                  <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} disabled={!canEdit} />
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Type</div>
                  <select className="input" value={itemType} onChange={(e) => setItemType(e.target.value as any)} disabled={!canEdit}>
                    <option value="MATERIAL">Material</option>
                    <option value="SERVICE">Service</option>
                  </select>
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Category (optional)</div>
                  <select className="input" value={itemCategoryId} onChange={(e) => setItemCategoryId(e.target.value)} disabled={!canEdit}>
                    <option value="">None</option>
                    {itemCategories.map((c) => (
                      <option key={c.id} value={String(c.id)}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Unit of measure</div>
                  <select className="input" value={itemUom} onChange={(e) => setItemUom(e.target.value)} disabled={!canEdit}>
                    {UOM_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Quantity</div>
                  <input className="input" type="number" value={itemQty} onChange={(e) => setItemQty(Number(e.target.value))} disabled={!canEdit} />
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Technical description / scope</div>
                  <textarea
                    value={itemTech}
                    onChange={(e) => setItemTech(e.target.value)}
                    disabled={!canEdit}
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

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Assumptions & exclusions</div>
                  <input className="input" value={itemAssumptions} onChange={(e) => setItemAssumptions(e.target.value)} placeholder="Optional" disabled={!canEdit} />
                </label>

                <label>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Required standards</div>
                  <input className="input" value={itemStandards} onChange={(e) => setItemStandards(e.target.value)} placeholder="Optional" disabled={!canEdit} />
                </label>

                <div style={{ display: "flex", gap: 8, alignItems: "end" }}>
                  <button
                    className="btn btn-primary"
                    disabled={acting !== "" || !canEdit}
                    onClick={() =>
                      doAction("addItem", async () => {
                        const created = await apiPost(`/requisitions/${data.id}/items`, {
                          itemType,
                          itemCategoryId: itemCategoryId || null,
                          name: itemName,
                          technicalDescription: itemTech,
                          uom: itemUom,
                          quantity: itemQty,
                          assumptionsExclusions: itemAssumptions,
                          requiredStandards: itemStandards,
                        });
                        setItemType("MATERIAL");
                        setItemCategoryId("");
                        setItemName("");
                        setItemTech("");
                        setItemUom("EA");
                        setItemQty(1);
                        setItemAssumptions("");
                        setItemStandards("");
                        return created;
                      })
                    }
                  >
                    {acting === "addItem" ? "Adding…" : "Add"}
                  </button>
                </div>
              </div>

              <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ textAlign: "left" }}>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>UOM</th>
                    <th>Qty</th>
                    <th>Attachments</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id} style={{ borderTop: "1px solid var(--border)", verticalAlign: "top" }}>
                      <td>
                        <button className="btn" style={{ padding: "0.25rem 0.5rem" }} onClick={() => openEditItem(it)}>
                          {it.itemNo ?? it.id}
                        </button>
                      </td>
                      <td>
                        <button className="btn" style={{ padding: "0.25rem 0.5rem", justifyContent: "flex-start" }} onClick={() => openEditItem(it)}>
                          {it.name}
                        </button>
                      </td>
                      <td>{it.itemType || ""}</td>
                      <td>{it.itemCategory?.name || ""}</td>
                      <td>{it.uom}</td>
                      <td>{it.quantity}</td>
                      <td style={{ minWidth: 260 }}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            disabled={!canEdit}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              doAction(`upload-${it.id}`, async () => {
                                const fd = new FormData();
                                fd.append("file", f);
                                await apiUpload(`/requisitions/${data.id}/items/${it.id}/attachments`, fd);
                              });
                            }}
                          />
                          <div
                            style={{
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 480,
                              color: "var(--muted)",
                            }}
                            title={(Array.isArray(it.attachments) ? it.attachments : []).map((a: any) => a.fileName).join(", ")}
                          >
                            {(Array.isArray(it.attachments) ? it.attachments : []).map((a: any, idx: number) => (
                              <span key={a.id} style={{ color: "inherit" }}>
                                <a
                                  href={`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001"}${a.url || ""}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  style={{ color: "inherit", textDecoration: "underline" }}
                                >
                                  {a.fileName}
                                </a>
                                {idx < (it.attachments || []).length - 1 ? ", " : ""}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {canEdit ? (
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <button className="btn" style={{ padding: "0.25rem 0.5rem" }} onClick={() => openEditItem(it)}>
                              Edit
                            </button>
                            <button
                              className="btn"
                              style={{ padding: "0.25rem 0.5rem", color: "#b91c1c" }}
                              onClick={() => {
                                if (!confirm("Delete this item?")) return;
                                doAction(`deleteItem-${it.id}`, async () => {
                                  await apiDelete(`/requisitions/${data.id}/items/${it.id}`);
                                });
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>


      <Modal
        open={!!editingItem}
        title={`${canEdit ? "Edit" : "View"} item ${editingItem?.itemNo ?? editingItem?.id ?? ""}`}
        onClose={() => setEditingItem(null)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Name</div>
              <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={!canEdit} />
            </label>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Type</div>
              <select className="input" value={editType} onChange={(e) => setEditType(e.target.value as any)} disabled={!canEdit}>
                <option value="MATERIAL">Material</option>
                <option value="SERVICE">Service</option>
              </select>
            </label>
          </div>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Category (optional)</div>
            <select className="input" value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)} disabled={!canEdit}>
              <option value="">None</option>
              {itemCategories.map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Technical description / scope</div>
            <textarea
              value={editTech}
              onChange={(e) => setEditTech(e.target.value)}
              disabled={!canEdit}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>UOM</div>
              <select className="input" value={editUom} onChange={(e) => setEditUom(e.target.value)} disabled={!canEdit}>
                {UOM_OPTIONS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Quantity</div>
              <input className="input" type="number" value={editQty} onChange={(e) => setEditQty(Number(e.target.value))} disabled={!canEdit} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Assumptions & exclusions</div>
              <input className="input" value={editAssumptions} onChange={(e) => setEditAssumptions(e.target.value)} disabled={!canEdit} />
            </label>
            <label>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Required standards</div>
              <input className="input" value={editStandards} onChange={(e) => setEditStandards(e.target.value)} disabled={!canEdit} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8 }}>
              {canEdit ? (
                <button className="btn btn-primary" onClick={saveEditItem} disabled={acting !== ""}>
                  {acting === "saveItem" ? "Saving…" : "Save item"}
                </button>
              ) : null}
              <button className="btn" onClick={() => setEditingItem(null)}>
                {canEdit ? "Cancel" : "Close"}
              </button>
            </div>

            {canEdit ? (
              <button
                className="btn"
                style={{ color: "#b91c1c" }}
                disabled={acting !== ""}
                onClick={() => {
                  if (!editingItem?.id) return;
                  if (!confirm("Delete this item?")) return;
                  doAction("deleteItem", async () => {
                    await apiDelete(`/requisitions/${data.id}/items/${editingItem.id}`);
                    setEditingItem(null);
                  });
                }}
              >
                {acting === "deleteItem" ? "Deleting…" : "Delete item"}
              </button>
            ) : null}
          </div>
        </div>
      </Modal>
      </InternalPage>
    </RequireRoles>
  );
}
