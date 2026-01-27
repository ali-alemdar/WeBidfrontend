"use client";

import { Dispatch, SetStateAction } from "react";

interface Props {
  open: boolean;
  canEdit: boolean;
  UOM_OPTIONS: string[];
  itemCategories: any[];
  acting: string;
  editingItem: any;
  setEditingItem: Dispatch<SetStateAction<any>>;
  editName: string;
  setEditName: Dispatch<SetStateAction<string>>;
  editType: "MATERIAL" | "SERVICE";
  setEditType: Dispatch<SetStateAction<"MATERIAL" | "SERVICE">>;
  editCategoryId: string;
  setEditCategoryId: Dispatch<SetStateAction<string>>;
  editTech: string;
  setEditTech: Dispatch<SetStateAction<string>>;
  editUom: string;
  setEditUom: Dispatch<SetStateAction<string>>;
  editQty: number;
  setEditQty: Dispatch<SetStateAction<number>>;
  editAssumptions: string;
  setEditAssumptions: Dispatch<SetStateAction<string>>;
  editStandards: string;
  setEditStandards: Dispatch<SetStateAction<string>>;
  saveEditItem: () => void;
  deleteItem: () => void;
}

export default function RequisitionItemEditModal({
  open,
  canEdit,
  UOM_OPTIONS,
  itemCategories,
  acting,
  editingItem,
  setEditingItem,
  editName,
  setEditName,
  editType,
  setEditType,
  editCategoryId,
  setEditCategoryId,
  editTech,
  setEditTech,
  editUom,
  setEditUom,
  editQty,
  setEditQty,
  editAssumptions,
  setEditAssumptions,
  editStandards,
  setEditStandards,
  saveEditItem,
  deleteItem,
}: Props) {
  if (!open) return null;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Name</div>
          <input
            className="input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Type</div>
          <select
            className="input"
            value={editType}
            onChange={(e) => setEditType(e.target.value as any)}
            disabled={!canEdit}
          >
            <option value="MATERIAL">Material</option>
            <option value="SERVICE">Service</option>
          </select>
        </label>
      </div>

      <label>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Category (optional)
        </div>
        <select
          className="input"
          value={editCategoryId}
          onChange={(e) => setEditCategoryId(e.target.value)}
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
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Technical description / scope
        </div>
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>UOM</div>
          <select
            className="input"
            value={editUom}
            onChange={(e) => setEditUom(e.target.value)}
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
            value={editQty}
            onChange={(e) => setEditQty(Number(e.target.value))}
            disabled={!canEdit}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
        }}
      >
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Assumptions & exclusions
          </div>
          <input
            className="input"
            value={editAssumptions}
            onChange={(e) => setEditAssumptions(e.target.value)}
            disabled={!canEdit}
          />
        </label>
        <label>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Required standards
          </div>
          <input
            className="input"
            value={editStandards}
            onChange={(e) => setEditStandards(e.target.value)}
            disabled={!canEdit}
          />
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {canEdit ? (
            <button
              className="btn btn-primary"
              onClick={saveEditItem}
              disabled={acting !== ""}
            >
              {acting === "saveItem" ? "Saving…" : "Save item"}
            </button>
          ) : null}
          <button
            className="btn"
            onClick={() => setEditingItem(null)}
          >
            {canEdit ? "Cancel" : "Close"}
          </button>
        </div>

        {canEdit ? (
          <button
            className="btn"
            style={{ color: "#b91c1c" }}
            disabled={acting !== ""}
            onClick={deleteItem}
          >
            {acting === "deleteItem" ? "Deleting…" : "Delete item"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
