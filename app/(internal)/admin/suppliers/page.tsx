"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost, apiPut, apiUpload, apiDelete } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

type CategoryRow = { id: number; name: string; isActive?: boolean };

type LookupUser = { id: number; fullName: string; email: string; phone?: string | null };

const REQUIRED_DOCS = [
  { docType: "COMPANY_REGISTRATION", label: "Company registration (attachment)" },
  { docType: "MANAGER_ID_FRONT", label: "Manager ID (front)" },
  { docType: "MANAGER_ID_BACK", label: "Manager ID (back)" },
  { docType: "TAX_CLEARANCE", label: "Recent tax clearance (expires end of year)" },
  { docType: "SOCIAL_SECURITY_CLEARANCE", label: "Recent social security clearance" },
] as const;

function endOfYearISO() {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59));
  return d.toISOString().slice(0, 10);
}

function uniqNums(xs: number[]) {
  return Array.from(new Set(xs.filter((n) => Number.isFinite(n))));
}

export default function AdminSuppliersPage() {
  const user = getCurrentUser();
  const userRoles = (user?.roles || []) as any[];
  const isSysAdmin = userRoles.includes("SYS_ADMIN");
  const isSupplierManager = userRoles.includes("SUPPLIER_MANAGER");
  const [rows, setRows] = useState<any[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [officers, setOfficers] = useState<LookupUser[]>([]);

  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string>("");
  const [error, setError] = useState<string>("");

  const [q, setQ] = useState("");

  // Create
  const [name, setName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPhone, setCreatePhone] = useState("");

  // Edit
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editCompanyManager, setEditCompanyManager] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editProcurementOfficerId, setEditProcurementOfficerId] = useState<string>("");

  const [editCountry, setEditCountry] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editAddressLine1, setEditAddressLine1] = useState("");
  const [editAddressLine2, setEditAddressLine2] = useState("");

  const [editCompanyRegistrationNumber, setEditCompanyRegistrationNumber] = useState("");
  const [editCanReceiveInvitations, setEditCanReceiveInvitations] = useState(true);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editCategoryIds, setEditCategoryIds] = useState<number[]>([]);

  const [docs, setDocs] = useState<any[]>([]);
  const [docFiles, setDocFiles] = useState<Record<string, File | null>>({});
  const [taxExpiry, setTaxExpiry] = useState(endOfYearISO());

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());

      const [s, c] = await Promise.all([
        apiGet(`/suppliers/admin${params.toString() ? `?${params}` : ""}`),
        apiGet(`/supplier-categories/admin`),
      ]);

      const u: any[] = [];

      setRows(Array.isArray(s) ? s : []);
      setCategories(Array.isArray(c) ? c : []);
      setOfficers(Array.isArray(u) ? u : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const loadDocs = async (supplierId: number) => {
    try {
      const r = await apiGet(`/suppliers/${supplierId}/documents`);
      setDocs(Array.isArray(r) ? r : []);
    } catch {
      setDocs([]);
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

  const filtered = useMemo(() => rows, [rows]);

  const activeSuppliers = useMemo(
    () => filtered.filter((s: any) => s.isActive !== false),
    [filtered],
  );
  const deletedSuppliers = useMemo(
    () => filtered.filter((s: any) => s.isActive === false),
    [filtered],
  );
  const categoriesForCheckboxes = useMemo(() => categories, [categories]);

  const startEdit = async (s: any) => {
    setEditingId(s.id);

    const full = await apiGet(`/suppliers/${s.id}/admin`);

    setEditName(full?.name || "");
    setEditCompanyManager(full?.companyManager || "");
    setEditEmail(full?.email || "");
    setEditPhone(full?.phone || "");
    setEditProcurementOfficerId(full?.procurementOfficer?.id != null ? String(full.procurementOfficer.id) : "");

    setEditCountry(full?.country || "");
    setEditCity(full?.city || "");
    setEditState(full?.state || "");
    setEditPostalCode(full?.postalCode || "");
    setEditAddressLine1(full?.addressLine1 || "");
    setEditAddressLine2(full?.addressLine2 || "");

    setEditCompanyRegistrationNumber(full?.companyRegistrationNumber || "");
    setEditCanReceiveInvitations(full?.canReceiveInvitations !== false);
    setEditIsActive(full?.isActive !== false);

    const ids = (full?.categories || []).map((x: any) => x?.categoryId).filter((x: any) => Number.isFinite(Number(x))).map((x: any) => Number(x));
    setEditCategoryIds(uniqNums(ids));

    setDocs(Array.isArray(full?.documents) ? full.documents : []);
    setDocFiles({});
    setTaxExpiry(endOfYearISO());

    // Refresh docs via dedicated endpoint (includes URLs)
    await loadDocs(s.id);
  };

  const toggleCategory = (id: number) => {
    if (editCategoryIds.includes(id)) setEditCategoryIds(editCategoryIds.filter((x) => x !== id));
    else setEditCategoryIds(uniqNums([...editCategoryIds, id]));
  };

  const createSupplier = () =>
    doAction("create", async () => {
      if (!name.trim()) throw new Error("Company name is required");
      await apiPost("/suppliers/admin", {
        name: name.trim(),
        email: createEmail.trim() || null,
        phone: createPhone.trim() || null,
      });
      setName("");
      setCreateEmail("");
      setCreatePhone("");
    });

  const saveSupplier = () =>
    doAction(`save-${editingId}`, async () => {
      if (!editingId) return;
      if (!editName.trim()) throw new Error("Company name is required");

      await apiPut(`/suppliers/${editingId}/admin`, {
        name: editName.trim(),
        companyManager: editCompanyManager.trim() || null,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
        procurementOfficerId: editProcurementOfficerId || null,

        country: editCountry.trim() || null,
        city: editCity.trim() || null,
        state: editState.trim() || null,
        postalCode: editPostalCode.trim() || null,
        addressLine1: editAddressLine1.trim() || null,
        addressLine2: editAddressLine2.trim() || null,

        companyRegistrationNumber: editCompanyRegistrationNumber.trim() || null,
        canReceiveInvitations: editCanReceiveInvitations,
        isActive: editIsActive,
        categoryIds: editCategoryIds,
      });
    });

  const deleteSupplier = () =>
    doAction(`delete-${editingId}`, async () => {
      if (!editingId) return;
      if (!confirm("Delete this supplier? This will deactivate it and prevent future invitations.")) return;
      await apiDelete(`/suppliers/${editingId}/admin`);
      setEditingId(null);
    });

  const uploadDoc = async (docType: string) => {
    if (!editingId) return;
    const file = docFiles[docType];
    if (!file) throw new Error("Please select a file");

    const fd = new FormData();
    fd.set("docType", docType);
    if (docType === "TAX_CLEARANCE") fd.set("expiryDate", taxExpiry);
    fd.set("file", file);

    await apiUpload(`/suppliers/${editingId}/documents`, fd);
    await loadDocs(editingId);
    setDocFiles((m) => ({ ...m, [docType]: null }));
  };

  const docsByType = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const d of docs) {
      const t = String(d?.docType || "");
      if (!m[t]) m[t] = [];
      m[t].push(d);
    }
    return m;
  }, [docs]);

  return (
    <RequireRoles anyOf={["SYS_ADMIN"]} title="Admin / Suppliers">
      <InternalPage title="Admin / Suppliers">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {(isSysAdmin || isSupplierManager) ? (
          <Link className="btn" href="/suppliers/categories">
            Categories
          </Link>
        ) : null}
        {isSysAdmin ? (
          <Link className="btn" href="/admin/suppliers/approvals">
            Approvals
          </Link>
        ) : null}
        <button className="btn" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, alignItems: "start" }}>
        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Create supplier</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Company name</div>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
              <input className="input" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} />
            </label>
            <label style={{ gridColumn: "1 / -1" }}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Email</div>
              <input className="input" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={createSupplier} disabled={acting !== ""}>
              {acting === "create" ? "Saving…" : "Create"}
            </button>
          </div>

          <h3 style={{ marginTop: 16 }}>Suppliers</h3>

          <label style={{ display: "block", marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Search</div>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, email, phone…" />
          </label>

          <div style={{ maxHeight: 360, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12 }}>
            <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Invitable</th>
                  <th>Docs</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {activeSuppliers.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td>{s.id}</td>
                    <td>{s.name}</td>
                    <td>{s.canReceiveInvitations ? "Yes" : "No"}</td>
                    <td>{s?._count?.documents ?? ""}</td>
                    <td style={{ textAlign: "right", display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <button className="btn" onClick={() => startEdit(s)} disabled={acting !== ""}>
                        Edit
                      </button>
                      <button
                        className="btn"
                        style={{ color: "#b91c1c" }}
                        onClick={() => {
                          setEditingId(s.id);
                          deleteSupplier();
                        }}
                        disabled={acting !== ""}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && activeSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ color: "var(--muted)" }}>
                      No active suppliers.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {deletedSuppliers.length > 0 ? (
            <div style={{ marginTop: 12 }}>
              <h4 style={{ marginTop: 0 }}>Deleted suppliers</h4>
              <table width="100%" cellPadding={4} style={{ borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ textAlign: "left", background: "rgba(0,0,0,0.02)" }}>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Docs</th>
                  </tr>
                </thead>
                <tbody>
                  {deletedSuppliers.map((s) => (
                    <tr key={s.id} style={{ borderTop: "1px solid var(--border)", opacity: 0.7 }}>
                      <td>{s.id}</td>
                      <td>{s.name}</td>
                      <td>{s?._count?.documents ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {loading && <p style={{ color: "var(--muted)" }}>Loading…</p>}
        </div>

        <div className="card" style={{ boxShadow: "none" }}>
          <h3 style={{ marginTop: 0 }}>Supplier profile</h3>
          {!editingId ? (
            <p style={{ color: "var(--muted)" }}>Select a supplier to edit.</p>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Company name</div>
                  <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Company manager</div>
                  <input className="input" value={editCompanyManager} onChange={(e) => setEditCompanyManager(e.target.value)} />
                </label>

                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Email</div>
                  <input className="input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                </label>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Phone</div>
                  <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Procurement officer</div>
                  <select className="input" value={editProcurementOfficerId} onChange={(e) => setEditProcurementOfficerId(e.target.value)}>
                    <option value="">None</option>
                    {officers.map((u) => (
                      <option key={u.id} value={String(u.id)}>
                        {u.fullName} ({u.email})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={{ marginTop: 12, fontWeight: 800 }}>Address</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Country</div>
                  <input className="input" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
                </label>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>City</div>
                  <input className="input" value={editCity} onChange={(e) => setEditCity(e.target.value)} />
                </label>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>State</div>
                  <input className="input" value={editState} onChange={(e) => setEditState(e.target.value)} />
                </label>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Postal code</div>
                  <input className="input" value={editPostalCode} onChange={(e) => setEditPostalCode(e.target.value)} />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Address line 1</div>
                  <input className="input" value={editAddressLine1} onChange={(e) => setEditAddressLine1(e.target.value)} />
                </label>
                <label style={{ gridColumn: "1 / -1" }}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Address line 2</div>
                  <input className="input" value={editAddressLine2} onChange={(e) => setEditAddressLine2(e.target.value)} />
                </label>
              </div>

              <div style={{ marginTop: 12, fontWeight: 800 }}>Registration</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 8 }}>
                <label>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>Company registration number</div>
                  <input className="input" value={editCompanyRegistrationNumber} onChange={(e) => setEditCompanyRegistrationNumber(e.target.value)} />
                </label>
              </div>

              <div style={{ marginTop: 12, fontWeight: 800 }}>Categories</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
                {categoriesForCheckboxes.map((c) => {
                  const inactive = c.isActive === false;
                  const checked = editCategoryIds.includes(c.id);
                  return (
                    <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center", opacity: inactive ? 0.6 : 1 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={inactive}
                        onChange={() => toggleCategory(c.id)}
                      />
                      <span>
                        {c.name}
                        {inactive ? " (inactive)" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={editCanReceiveInvitations} onChange={(e) => setEditCanReceiveInvitations(e.target.checked)} />
                  <span style={{ fontWeight: 800 }}>Can receive requisition invitations</span>
                </label>

                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={editIsActive} onChange={(e) => setEditIsActive(e.target.checked)} />
                  <span style={{ fontWeight: 800 }}>Active</span>
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                <button className="btn btn-primary" onClick={saveSupplier} disabled={acting !== ""}>
                  {acting === `save-${editingId}` ? "Saving…" : "Save"}
                </button>
                <button className="btn" onClick={() => setEditingId(null)} disabled={acting !== ""}>
                  Close
                </button>
                <button
                  className="btn"
                  style={{ color: "#b91c1c" }}
                  onClick={deleteSupplier}
                  disabled={acting !== ""}
                >
                  Delete supplier
                </button>
              </div>

              <div style={{ marginTop: 16, fontWeight: 800 }}>Company documents</div>

              <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
                {REQUIRED_DOCS.map((d) => {
                  const existing = docsByType[d.docType] || [];
                  return (
                    <div key={d.docType} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                        <div>
                          <div style={{ fontWeight: 800 }}>{d.label}</div>
                          <div style={{ color: "var(--muted)", fontSize: 12 }}>
                            Uploaded: {existing.length ? existing.length : 0}
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                          {d.docType === "TAX_CLEARANCE" ? (
                            <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
                              <span style={{ fontSize: 12, color: "var(--muted)" }}>Expiry</span>
                              <input className="input" type="date" value={taxExpiry} onChange={(e) => setTaxExpiry(e.target.value)} style={{ padding: "6px 8px" }} />
                            </label>
                          ) : null}

                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={(e) => {
                              const f = e.target.files?.[0] || null;
                              setDocFiles((m) => ({ ...m, [d.docType]: f }));
                            }}
                          />
                          <button
                            className="btn"
                            disabled={acting !== "" || !docFiles[d.docType]}
                            onClick={() =>
                              doAction(`upload-${d.docType}`, async () => {
                                await uploadDoc(d.docType);
                              })
                            }
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      {existing.length ? (
                        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                          {existing.slice(0, 3).map((x: any) => (
                            <li key={x.id} style={{ fontSize: 12 }}>
                              <a href={x.url} target="_blank" rel="noreferrer">
                                {x.fileName}
                              </a>
                              {x.expiryDate ? <span style={{ color: "var(--muted)" }}> (exp: {String(x.expiryDate).slice(0, 10)})</span> : null}
                            </li>
                          ))}
                          {existing.length > 3 ? <li style={{ fontSize: 12, color: "var(--muted)" }}>…and {existing.length - 3} more</li> : null}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
