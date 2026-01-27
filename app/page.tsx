"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setAccessToken, getCurrentUser } from "./lib/authClient";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export default function HomePage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      const data = text ? JSON.parse(text) : null;

      if (!res.ok) {
        throw new Error(data?.message || "Invalid credentials");
      }

      if (!data?.access_token) {
        throw new Error("Login response missing access_token");
      }

      setAccessToken(data.access_token);
      const u = getCurrentUser();
      const roles = ((u as any)?.roles || []) as string[];
      const isSysAdmin = roles.includes("SYS_ADMIN");
      const isOfficer = roles.includes("REQUISITION_OFFICER") || roles.includes("TENDERING_OFFICER") || isSysAdmin;
      const isReqManager = roles.includes("REQUISITION_MANAGER") || isSysAdmin;
      const isTenderManager = roles.includes("TENDER_APPROVAL") || isSysAdmin;
      const isRequesterOnly = roles.includes("REQUESTER") && !isOfficer && !isReqManager && !isTenderManager;

      if (isRequesterOnly) {
        router.push("/requisitions/status");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      setError(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="homepage">
      <div className="home-shell">
        <header className="home-header">
          <div className="brand">
            <div className="logo" aria-hidden="true" />
            <div>
              <div className="brand-title">e‑Bidding System — Internal Access</div>
              <div className="brand-sub">Procurement • Evaluation • Compliance</div>
            </div>
          </div>

          <div className="header-actions">
            <span className="pill">Backend: <code>{API_BASE}</code></span>
            <a className="pill" href="#support">Help</a>
          </div>
        </header>

        <main className="home-main">
          <div className="home-grid">
            <section className="card">
              <h1 className="section-title">Secure tendering. Faster procurement.</h1>
              <p className="section-text">
                A controlled internal portal to manage the full procurement lifecycle:
                requisitions, tenders, bid openings, evaluations, awards, contracts,
                and audit trails.
              </p>

              <div className="kpi-grid" aria-label="System purpose">
                <div className="tile">
                  <div className="tile-title">Bidding & Tender Lifecycle</div>
                  <div className="tile-sub">Create requisitions, publish tenders, manage deadlines.</div>
                </div>
                <div className="tile">
                  <div className="tile-title">Evaluation & Governance</div>
                  <div className="tile-sub">Committees, scoring, voting, and controlled access.</div>
                </div>
                <div className="tile">
                  <div className="tile-title">Compliance & Audit</div>
                  <div className="tile-sub">Immutable logs, reports, and evidence packages.</div>
                </div>
                <div className="tile">
                  <div className="tile-title">Connected Architecture</div>
                  <div className="tile-sub">Frontend → Backend API → SQL Server DB (Prisma).</div>
                </div>
              </div>

              <div className="notice">
                <strong>Security notice:</strong> Authorized internal users only. All actions may be
                monitored and recorded for audit and compliance.
              </div>

              <div id="support" className="notice" style={{ marginTop: "0.75rem" }}>
                <strong>Help & support:</strong> Contact IT Service Desk for access/reset.
                Optional: provide a user guide link here.
              </div>
            </section>

            <aside className="card" aria-label="Login panel">
              <h2 style={{ marginTop: 0 }}>Login</h2>
              <p className="section-text" style={{ marginTop: 0.5 + "rem" }}>
                Username / Employee ID and password.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                <input
                  className="input"
                  placeholder="Username / Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                />
                <input
                  className="input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!loading) handleLogin();
                    }
                  }}
                />

                {error && <div style={{ color: "#b91c1c", fontSize: 14 }}>{error}</div>}

                <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
                  {loading ? "Signing in…" : "Sign in"}
                </button>

                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <a href="#" onClick={(e) => e.preventDefault()}>Forgot password</a>
                  <a href="#" onClick={(e) => e.preventDefault()}>First‑time access</a>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "var(--muted)", lineHeight: 1.5 }}>
                  Use your assigned internal username and password. Contact IT if you need access or a reset.
                </div>
              </div>
            </aside>
          </div>
        </main>

        <footer className="footer">
          <div>
            <strong>Organization Name</strong> • e‑Bidding Internal Portal
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <span>Version: 0.1</span>
            <a href="#" onClick={(e) => e.preventDefault()}>Privacy</a>
            <a href="#" onClick={(e) => e.preventDefault()}>Terms</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
