"use client";

import { Dispatch, SetStateAction, useMemo } from "react";

import { apiPost, apiUpload, apiDelete } from "../../../lib/api";

import type { TabKey } from "./page";

interface SideNavButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
}

function SideNavButton({ active, label, onClick }: SideNavButtonProps) {
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

interface RequisitionEditorTabsProps {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isRequesterOnly: boolean;
  canEdit: boolean;
  data: any;
  departments: any[];
  itemCategories: any[];
  UOM_OPTIONS: string[];
  items: any[];
  invitations: any[];
  disclaimerTemplates: any[];
  biddingTemplates: any[];
  disclaimerText: string;
  setDisclaimerText: Dispatch<SetStateAction<string>>;
  suppliers: any[];
  supplierSearch: string;
  setSupplierSearch: Dispatch<SetStateAction<string>>;
  selectedSupplierIds: Record<number, boolean>;
  setSelectedSupplierIds: Dispatch<SetStateAction<Record<number, boolean>>>;
  sendInvitations: (selectedIds: number[]) => void;
  startManualSubmissions: () => void;
  setShowSupplierModal: (open: boolean) => void;
  acting: string;
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  requestingDepartment: string;
  setRequestingDepartment: Dispatch<SetStateAction<string>>;
  purpose: "Budgeting" | "Bidding" | "";
  setPurpose: Dispatch<SetStateAction<"Budgeting" | "Bidding" | "">>;
  targetTimeline: string;
  setTargetTimeline: Dispatch<SetStateAction<string>>;
  ledgerCategory: string;
  setLedgerCategory: Dispatch<SetStateAction<string>>;
  description: string;
  setDescription: Dispatch<SetStateAction<string>>;
  itemType: "MATERIAL" | "SERVICE";
  setItemType: Dispatch<SetStateAction<"MATERIAL" | "SERVICE">>;
  itemCategoryId: string;
  setItemCategoryId: Dispatch<SetStateAction<string>>;
  itemName: string;
  setItemName: Dispatch<SetStateAction<string>>;
  itemTech: string;
  setItemTech: Dispatch<SetStateAction<string>>;
  itemUom: string;
  setItemUom: Dispatch<SetStateAction<string>>;
  itemQty: number;
  setItemQty: Dispatch<SetStateAction<number>>;
  itemAssumptions: string;
  setItemAssumptions: Dispatch<SetStateAction<string>>;
  itemStandards: string;
  setItemStandards: Dispatch<SetStateAction<string>>;
  openEditItem: (item: any) => void;
  doAction: (name: string, fn: () => Promise<any>) => Promise<void>;
  load: () => Promise<void>;
  isoDateInput: (v: any) => string;
}

export default function RequisitionEditorTabs(props: RequisitionEditorTabsProps) {
  const {
    tab,
    setTab,
    isRequesterOnly,
    canEdit,
    data,
    departments,
    itemCategories,
    UOM_OPTIONS,
    items,
    invitations,
    disclaimerTemplates,
    biddingTemplates,
    disclaimerText,
    setDisclaimerText,
    suppliers,
    supplierSearch,
    setSupplierSearch,
    selectedSupplierIds,
    setSelectedSupplierIds,
    sendInvitations,
    startManualSubmissions,
    setShowSupplierModal,
    acting,
    title,
    setTitle,
    requestingDepartment,
    setRequestingDepartment,
    purpose,
    setPurpose,
    targetTimeline,
    setTargetTimeline,
    ledgerCategory,
    setLedgerCategory,
    description,
    setDescription,
    itemType,
    setItemType,
    itemCategoryId,
    setItemCategoryId,
    itemName,
    setItemName,
    itemTech,
    setItemTech,
    itemUom,
    setItemUom,
    itemQty,
    setItemQty,
    itemAssumptions,
    setItemAssumptions,
    itemStandards,
    setItemStandards,
    openEditItem,
    doAction,
    load,
    isoDateInput,
  } = props;

  const steps: { key: TabKey; label: string }[] = isRequesterOnly
    ? [
        { key: "request", label: "Request" },
        { key: "items", label: "Items" },
      ]
    : [
        { key: "request", label: "Request" },
        { key: "items", label: "Items" },
        { key: "final", label: "Final Form" },
      ];

  const supplierList = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    const base = Array.isArray(suppliers) ? suppliers : [];
    if (!q) return base;
    return base.filter((s) => String(s?.name || "").toLowerCase().includes(q));
  }, [suppliers, supplierSearch]);

  const selectedIds = useMemo(() => {
    return Object.entries(selectedSupplierIds)
      .filter(([, v]) => v)
      .map(([k]) => Number(k))
      .filter((x) => Number.isFinite(x));
  }, [selectedSupplierIds]);

  return (
    <div style={{ display: "flex", gap: 14, alignItems: "stretch" }}>
      <aside style={{ width: 220 }}>
        <div className="card" style={{ boxShadow: "none" }}>
          <div style={{ display: "grid", gap: 8 }}>
            {steps.map((s) => (
              <SideNavButton
                key={s.key}
                active={tab === s.key}
                label={s.label}
                onClick={() => setTab(s.key)}
              />
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
                <input
                  className="input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Requesting Department</div>
                <select
                  className="input"
                  value={requestingDepartment}
                  onChange={(e) => setRequestingDepartment(e.target.value)}
                  disabled={!canEdit}
                >
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
                <select
                  className="input"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  disabled={!canEdit}
                >
                  <option value="">Select…</option>
                  <option value="Budgeting">Budgeting</option>
                  <option value="Bidding">Bidding</option>
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Target date</div>
                <input
                  className="input"
                  type="date"
                  value={targetTimeline}
                  onChange={(e) => setTargetTimeline(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Ledger Category</div>
                <input
                  className="input"
                  value={ledgerCategory}
                  onChange={(e) => setLedgerCategory(e.target.value)}
                  placeholder="Optional"
                  disabled={!canEdit}
                />
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

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Item name</div>
                <input
                  className="input"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  disabled={!canEdit}
                />
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Type</div>
                <select
                  className="input"
                  value={itemType}
                  onChange={(e) => setItemType(e.target.value as any)}
                  disabled={!canEdit}
                >
                  <option value="MATERIAL">Material</option>
                  <option value="SERVICE">Service</option>
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Category (optional)</div>
                <select
                  className="input"
                  value={itemCategoryId}
                  onChange={(e) => setItemCategoryId(e.target.value)}
                  disabled={!canEdit}
                >
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
                <select
                  className="input"
                  value={itemUom}
                  onChange={(e) => setItemUom(e.target.value)}
                  disabled={!canEdit}
                >
                  {UOM_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Quantity</div>
                <input
                  className="input"
                  type="number"
                  value={itemQty}
                  onChange={(e) => setItemQty(Number(e.target.value))}
                  disabled={!canEdit}
                />
              </label>

              <label style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Technical description / scope
                </div>
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
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  Assumptions & exclusions
                </div>
                <input
                  className="input"
                  value={itemAssumptions}
                  onChange={(e) => setItemAssumptions(e.target.value)}
                  placeholder="Optional"
                  disabled={!canEdit}
                />
              </label>

              <label>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Required standards</div>
                <input
                  className="input"
                  value={itemStandards}
                  onChange={(e) => setItemStandards(e.target.value)}
                  placeholder="Optional"
                  disabled={!canEdit}
                />
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
                  <tr
                    key={it.id}
                    style={{ borderTop: "1px solid var(--border)", verticalAlign: "top" }}
                  >
                    <td>
                      <button
                        className="btn"
                        style={{ padding: "0.25rem 0.5rem" }}
                        onClick={() => openEditItem(it)}
                      >
                        {it.itemNo ?? it.id}
                      </button>
                    </td>
                    <td>
                      <button
                        className="btn"
                        style={{
                          padding: "0.25rem 0.5rem",
                          justifyContent: "flex-start",
                        }}
                        onClick={() => openEditItem(it)}
                      >
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
                              await apiUpload(
                                `/requisitions/${data.id}/items/${it.id}/attachments`,
                                fd,
                              );
                              await load();
                            });
                          }}
                        />
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 4,
                            maxWidth: 480,
                            color: "var(--muted)",
                          }}
                          title={(Array.isArray(it.attachments) ? it.attachments : [])
                            .map((a: any) => a.fileName)
                            .join(", ")}
                        >
                          {(Array.isArray(it.attachments) ? it.attachments : []).map(
                            (a: any) => {
                              const apiBase =
                                process.env.NEXT_PUBLIC_API_BASE ||
                                "http://localhost:3001";
                              const href = a?.url
                                ? `${apiBase}${String(a.url)}`
                                : a?.storagePath
                                ? `${apiBase}/uploads/${String(a.storagePath)
                                    .replace(/\\\\/g, "/")
                                    .replace(/^\/+/, "")}`
                                : undefined;

                              if (!href) return null;

                              return (
                                <span key={a.id} style={{ color: "inherit" }}>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      className="btn"
                                      style={{
                                        padding: "0 4px",
                                        fontSize: 10,
                                        color: "#b91c1c",
                                        marginRight: 4,
                                      }}
                                      onClick={() => {
                                        if (!confirm("Delete this attachment?")) return;
                                        doAction(
                                          `delete-attachment-${a.id}`,
                                          async () => {
                                            await apiPost(
                                              `/requisitions/${data.id}/items/${it.id}/attachments/${a.id}/delete`,
                                              {},
                                            );
                                            await load();
                                          },
                                        );
                                      }}
                                    >
                                      ✕
                                    </button>
                                  )}
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{
                                      color: "inherit",
                                      textDecoration: "underline",
                                    }}
                                  >
                                    {a.fileName}
                                  </a>
                                </span>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {canEdit ? (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            className="btn"
                            style={{ padding: "0.25rem 0.5rem" }}
                            onClick={() => openEditItem(it)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn"
                            style={{
                              padding: "0.25rem 0.5rem",
                              color: "#b91c1c",
                            }}
                            onClick={() => {
                              if (!confirm("Delete this item?")) return;
                              doAction(`deleteItem-${it.id}`, async () => {
                                await apiDelete(
                                  `/requisitions/${data.id}/items/${it.id}`,
                                );
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

        {!isRequesterOnly && tab === "final" && (
          <div className="card" style={{ boxShadow: "none" }}>
            <h3 style={{ marginTop: 0 }}>Final Form</h3>

            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <h4 style={{ marginTop: 0 }}>Items summary</h4>
                <table
                  width="100%"
                  cellPadding={8}
                  style={{ borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>ID</th>
                      <th>Type</th>
                      <th>Name</th>
                      <th>Category</th>
                      <th>UOM</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr
                        key={it.id}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        <td>{it.id}</td>
                        <td>{it.itemType || ""}</td>
                        <td>{it.name}</td>
                        <td>{it.itemCategory?.name || ""}</td>
                        <td>{it.uom}</td>
                        <td>{it.quantity}</td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ color: "var(--muted)" }}>
                          No items added.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 style={{ marginTop: 0 }}>Invitee list</h4>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    marginBottom: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      if (!canEdit) return;
                      setShowSupplierModal(true);
                    }}
                    disabled={!canEdit}
                  >
                    Manage suppliers
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={load}
                    disabled={acting !== "" || !canEdit}
                  >
                    Refresh suppliers
                  </button>
                </div>

                <label style={{ display: "block", marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Search supplier by name
                  </div>
                  <input
                    className="input"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Type to filter…"
                  />
                </label>

                <div
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    overflow: "hidden",
                  }}
                >
                  <table
                    width="100%"
                    cellPadding={10}
                    style={{ borderCollapse: "collapse" }}
                  >
                    <thead>
                      <tr
                        style={{
                          textAlign: "left",
                          background: "rgba(0,0,0,0.02)",
                        }}
                      >
                        <th style={{ width: 40 }}></th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supplierList.map((s) => (
                        <tr
                          key={s.id}
                          style={{ borderTop: "1px solid var(--border)" }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={!!selectedSupplierIds[s.id]}
                              disabled={!canEdit}
                              onChange={(e) => {
                                if (!canEdit) return;
                                setSelectedSupplierIds((prev) => ({
                                  ...prev,
                                  [s.id]: e.target.checked,
                                }));
                              }}
                            />
                          </td>
                          <td>{s.name}</td>
                          <td>{s.email || ""}</td>
                          <td>{s.phone || ""}</td>
                        </tr>
                      ))}
                      {supplierList.length === 0 && (
                        <tr>
                          <td colSpan={4} style={{ color: "var(--muted)" }}>
                            No suppliers found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 10, color: "var(--muted)" }}>
                  Selected suppliers: <strong>{selectedIds.length}</strong>
                </div>
              </div>

              <div>
                <h4 style={{ marginTop: 0 }}>Disclaimer (shown before sending)</h4>
                <textarea
                  value={disclaimerText}
                  onChange={(e) => setDisclaimerText(e.target.value)}
                  disabled={!canEdit}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "0.75rem 0.9rem",
                    fontFamily: "inherit",
                    minHeight: 100,
                    width: "100%",
                  }}
                />

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Templates
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {disclaimerTemplates
                      .filter((t) => t?.isActive !== false)
                      .map((t) => (
                        <button
                          key={t.id}
                          className="btn"
                          type="button"
                          disabled={!canEdit}
                          onClick={() => {
                            if (!canEdit) return;
                            setDisclaimerText(String(t.content || ""));
                          }}
                          title={String(t.content || "").slice(0, 200)}
                        >
                          Use: {t.name}
                        </button>
                      ))}
                    {disclaimerTemplates.filter((t) => t?.isActive !== false)
                      .length === 0 ? (
                      <span style={{ color: "var(--muted)" }}>
                        No disclaimer templates yet. Create them in Admin /
                        Templates.
                      </span>
                    ) : null}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>
                    Bidding form templates (reference)
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {biddingTemplates
                      .filter((t) => t?.isActive !== false)
                      .map((t) => (
                        <span
                          key={t.id}
                          className="pill"
                          title={String(t.content || "").slice(0, 200)}
                        >
                          {t.name}
                        </span>
                      ))}
                    {biddingTemplates.filter((t) => t?.isActive !== false)
                      .length === 0 ? (
                      <span style={{ color: "var(--muted)" }}>
                        No bidding templates yet.
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <button
                  className="btn btn-submit"
                  disabled={acting !== "" || !canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    sendInvitations(selectedIds);
                  }}
                >
                  {acting === "sendInvitations" ? "Sending…" : "Send Invitations"}
                </button>

                <button
                  className="btn btn-submit"
                  disabled={acting !== "" || !canEdit}
                  onClick={() => {
                    if (!canEdit) return;
                    if (
                      !confirm(
                        "Switch to paper/manual submissions? You will enter supplier prices manually.",
                      )
                    )
                      return;
                    startManualSubmissions();
                  }}
                  title="Use this when submissions are collected on paper and entered manually"
                >
                  Switch to paper (manual) submissions
                </button>
              </div>

              <div>
                <h4 style={{ marginTop: 0 }}>Sent invitations</h4>
                <table
                  width="100%"
                  cellPadding={8}
                  style={{ borderCollapse: "collapse" }}
                >
                  <thead>
                    <tr style={{ textAlign: "left" }}>
                      <th>ID</th>
                      <th>Supplier</th>
                      <th>Sent At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr
                        key={inv.id}
                        style={{ borderTop: "1px solid var(--border)" }}
                      >
                        <td>{inv.id}</td>
                        <td>{inv.supplier?.name || inv.supplierId}</td>
                        <td>{isoDateInput(inv.sentAt)}</td>
                      </tr>
                    ))}
                    {invitations.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ color: "var(--muted)" }}>
                          No invitations sent yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
