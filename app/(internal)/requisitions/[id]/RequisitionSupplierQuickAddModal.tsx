"use client";

import Link from "next/link";
import { Dispatch, SetStateAction } from "react";

interface Props {
  acting: string;
  newSupplierName: string;
  setNewSupplierName: Dispatch<SetStateAction<string>>;
  newSupplierEmail: string;
  setNewSupplierEmail: Dispatch<SetStateAction<string>>;
  newSupplierPhone: string;
  setNewSupplierPhone: Dispatch<SetStateAction<string>>;
  addSupplierQuick: () => void;
  onClose: () => void;
}

export default function RequisitionSupplierQuickAddModal({
  acting,
  newSupplierName,
  setNewSupplierName,
  newSupplierEmail,
  setNewSupplierEmail,
  newSupplierPhone,
  setNewSupplierPhone,
  addSupplierQuick,
  onClose,
}: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      <label>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Supplier name</div>
        <input
          className="input"
          value={newSupplierName}
          onChange={(e) => setNewSupplierName(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Email</div>
        <input
          className="input"
          value={newSupplierEmail}
          onChange={(e) => setNewSupplierEmail(e.target.value)}
        />
      </label>
      <label>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Phone</div>
        <input
          className="input"
          value={newSupplierPhone}
          onChange={(e) => setNewSupplierPhone(e.target.value)}
        />
      </label>
      <div style={{ display: "flex", alignItems: "end", gap: 8 }}>
        <button
          className="btn btn-primary"
          onClick={addSupplierQuick}
          disabled={acting !== ""}
        >
          {acting === "addSupplier" ? "Saving…" : "Add supplier"}
        </button>
        <Link
          className="btn"
          href="/suppliers"
          onClick={onClose}
        >
          Full registration
        </Link>
      </div>
    </div>
  );
}
