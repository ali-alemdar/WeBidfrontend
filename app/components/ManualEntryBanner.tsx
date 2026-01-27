"use client";

export default function ManualEntryBanner({ note }: { note?: string | null }) {
  return (
    <div
      className="card"
      style={{
        boxShadow: "none",
        marginBottom: 12,
        border: "1px solid rgba(245, 158, 11, 0.35)",
        background: "rgba(245, 158, 11, 0.10)",
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 6 }}>Manual entry</div>
      <div style={{ color: "var(--muted)" }}>{note || "Submissions were entered manually."}</div>
    </div>
  );
}
