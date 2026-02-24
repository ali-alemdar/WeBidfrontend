"use client";

import { useRouter } from "next/navigation";
import { clearAccessToken } from "../lib/authClient";
import { getCurrentUser } from "../lib/authClient";

interface Props {
  title: string;
  children?: React.ReactNode;
  pageId?: string;
}

export default function InternalPage({ title, children, pageId }: Props) {
  const router = useRouter();
  const user = getCurrentUser();

  const logout = () => {
    clearAccessToken();
    router.replace("/");
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  const handleRefresh = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <section>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            padding: "4px 0",
          }}
          className="no-print"
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
            {pageId ? (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "var(--muted)",
                }}
              >
                ID: {pageId}
              </div>
            ) : null}
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>In2Networks Pty Ltd</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {user ? (
              <span style={{ fontSize: 13, color: "var(--muted)" }}>
                {user.fullName || user.email || ""}
              </span>
            ) : null}
            <button className="btn" onClick={handleRefresh}>
              Refresh
            </button>
            <button className="btn" onClick={handlePrint}>
              Print
            </button>
            <button className="btn" onClick={logout}>
              Logout
            </button>
          </div>
        </div>

        <div className="card" style={{ marginTop: "0.75rem", minHeight: "300px" }}>
          {children || <p>Content coming soon.</p>}
        </div>
      </div>
    </section>
  );
}
