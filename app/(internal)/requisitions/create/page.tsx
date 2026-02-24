"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import InternalPage from "../../../components/InternalPage";
import RequireRoles from "../../../components/RequireRoles";
import { apiGet, apiPost } from "../../../lib/api";
import { getCurrentUser } from "../../../lib/authClient";

const PURPOSES = ["Budgeting", "Bidding"] as const;

export default function CreateRequisitionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const createdId = searchParams?.get("created");

  const user = getCurrentUser();
  const roles = ((user as any)?.roles || []) as string[];

  const isSysAdmin = roles.includes("SYS_ADMIN");

  const isOfficer = useMemo(
    () => roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin,
    [roles, isSysAdmin],
  );

  const isManager = useMemo(
    () => roles.includes("REQUISITION_MANAGER") || isSysAdmin,
    [roles, isSysAdmin],
  );

  // Role dominance is additive: requester-only means requester *without* officer/manager.
  const isRequesterOnly = useMemo(
    () => roles.includes("REQUESTER") && !isOfficer && !isManager,
    [roles, isOfficer, isManager],
  );

  const initialDept = (user as any)?.departmentName ? String((user as any).departmentName) : "";

  const [title, setTitle] = useState("");
  const [requestingDepartment, setRequestingDepartment] = useState(initialDept);
  const [departments, setDepartments] = useState<any[]>([]);
  const [description, setDescription] = useState("");
  const [purpose, setPurpose] = useState<(typeof PURPOSES)[number]>("Bidding");
  const [targetTimeline, setTargetTimeline] = useState<string>("");
  const [ledgerCategory, setLedgerCategory] = useState<string>("");

  const [category, setCategory] = useState("GENERAL");
  const [estimatedValue, setEstimatedValue] = useState<number>(0);

  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiGet("/departments");
        const list = Array.isArray(d) ? d : [];
        setDepartments(list);
      } catch {
        setDepartments([]);
      }
    })();
  }, []);

  const onSubmit = async () => {
    setError("");
    setSaving(true);

    try {
      if (!title.trim()) throw new Error("Title is required");
      if (!description.trim()) throw new Error("Description is required");
      if (!requestingDepartment.trim()) throw new Error("Requesting Department is required");

      const created = await apiPost("/requisitions", {
        title,
        requestingDepartment,
        description,
        purpose,
        // keep as ISO date string if filled
        targetTimeline: targetTimeline || null,
        ledgerCategory: ledgerCategory || null,
        category,
        estimatedValue: Number.isFinite(estimatedValue) ? estimatedValue : 0,
      });

      if (isRequesterOnly) {
        // Requesters create a draft, then continue editing on the draft page.
        router.push(`/requisitions/${created.id}`);
      } else {
        router.push(`/requisitions/${created.id}`);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to create requisition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <RequireRoles anyOf={["REQUESTER", "REQUISITION_OFFICER", "TENDERING_OFFICER", "SYS_ADMIN"]} title="Create Requisition">
      <InternalPage title="Create Requisition">
      <p><strong>Page ID:</strong> EMP-R02</p>

      {createdId ? (
        <div className="card" style={{ boxShadow: "none", marginBottom: 12, background: "rgba(16,185,129,0.08)" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Submitted</div>
          <div style={{ color: "var(--muted)", marginBottom: 10 }}>
            Your requisition request was submitted successfully. Reference ID: <strong>{createdId}</strong>.
          </div>
          {isRequesterOnly ? (
            <Link className="btn" href="/requisitions/status">
              View my requisitions status
            </Link>
          ) : (
            <Link className="btn" href="/requisitions/my-requests">
              View my requests
            </Link>
          )}
        </div>
      ) : null}

      <p style={{ color: "var(--muted)", marginTop: 4 }}>
        This starts the workflow at <strong>Internal Request Received</strong>.
      </p>

      <div style={{ display: "grid", gap: 16, maxWidth: 980 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Business Need / Title</div>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary"
            />
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              Requesting Department <span style={{ color: "#b91c1c" }}>*</span>
            </div>
            <select
              className="input"
              value={requestingDepartment}
              onChange={(e) => setRequestingDepartment(e.target.value)}
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
            <select className="input" value={purpose} onChange={(e) => setPurpose(e.target.value as any)}>
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Target date</div>
            <input
              className="input"
              type="date"
              value={targetTimeline}
              onChange={(e) => setTargetTimeline(e.target.value)}
            />
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ledger Category (optional)</div>
            <input
              className="input"
              value={ledgerCategory}
              onChange={(e) => setLedgerCategory(e.target.value)}
              placeholder="e.g., OPS-001"
            />
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Category (optional)</div>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="GENERAL"
            />
          </label>

          <label>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Estimated Value (optional)</div>
            <input
              className="input"
              type="number"
              value={Number.isFinite(estimatedValue) ? estimatedValue : 0}
              onChange={(e) => setEstimatedValue(Number(e.target.value))}
              placeholder="0"
            />
          </label>
        </div>

        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Details</div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is needed, scope, assumptions"
            style={{
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "0.75rem 0.9rem",
              fontFamily: "inherit",
              minHeight: 160,
            }}
          />
        </label>

        {error && <div style={{ color: "#b91c1c" }}>{error}</div>}

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={onSubmit} disabled={saving}>
            {saving ? "Saving…" : "Create"}
          </button>
          <button
            className="btn"
            onClick={() => router.push(isRequesterOnly ? "/requisitions/status" : "/requisitions/list")}
          >
            Cancel
          </button>
          {isRequesterOnly ? (
            <Link className="btn" href="/requisitions/status">
              My requisitions
            </Link>
          ) : null}
        </div>
      </div>
      </InternalPage>
    </RequireRoles>
  );
}
