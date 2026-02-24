"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import InternalPage from "../../components/InternalPage";
import RequireRoles from "../../components/RequireRoles";
import { apiGet } from "../../lib/api";

interface ChartData {
  byDepartment: { [key: string]: number };
  byStatus: { [key: string]: number };
  departmentPerformance: { [key: string]: number };
  monthlyTrends: { [key: string]: number };
  pending: Array<{
    id: string;
    tender_id: number;
    title: string;
    status: string;
    createdAt: string;
  }>;
}

// Generate dynamic colors spread far apart using HSL
function generateColors(count: number): string[] {
  if (count === 0) return [];
  const colors: string[] = [];
  // Use hue values spread across 0-360 degrees
  // Saturation: 70% (vibrant), Lightness: 50% (balanced)
  for (let i = 0; i < count; i++) {
    const hue = (i * (360 / count)) % 360;
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }
  return colors;
}

// DONUT CHART VERSION (COMMENTED FOR TESTING - TO BE UNCOMMENTED LATER)
/*
const DonutChart = ({ data, title }: { data: { [key: string]: number }; title: string }) => {
  const entries = Object.entries(data).filter(([_, val]) => val > 0);
  if (entries.length === 0) return <div style={{ textAlign: "center", color: "#666" }}>No data</div>;

  const total = entries.reduce((sum, [_, val]) => sum + val, 0);
  const colors = generateColors(entries.length);

  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ textAlign: "center" }}>
      <h4 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h4>
      <svg width="250" height="250" viewBox="0 0 150 150" style={{ margin: "0 auto" }}>
        {entries.map(([label, val], idx) => {
          const percentage = val / total;
          const length = percentage * circumference;
          const dashoffset = offset;
          offset += length;

          return (
            <circle
              key={label}
              cx="75"
              cy="75"
              r={radius}
              fill="none"
              stroke={colors[idx % colors.length]}
              strokeWidth="26"
              strokeDasharray={`${length} ${circumference}`}
              strokeDashoffset={-dashoffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "75px 75px" }}
            />
          );
        })}
      </svg>
      <div style={{ marginTop: 12, fontSize: 12 }}>
        {entries.map(([label, val], idx) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: colors[idx % colors.length],
              }}
            />
            <span>{label}: {val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
*/

// PIE CHART VERSION (CURRENT - TESTING)
const DonutChart = ({ data, title }: { data: { [key: string]: number }; title: string }) => {
  const entries = Object.entries(data).filter(([_, val]) => val > 0);
  if (entries.length === 0) return <div style={{ textAlign: "center", color: "#666" }}>No data</div>;

  const total = entries.reduce((sum, [_, val]) => sum + val, 0);
  const colors = generateColors(entries.length);
  const radius = 60;
  const explodeDistance = 15; // Distance to pull out the first slice

  let currentAngle = -90; // Start from top
  const slices: Array<{ path: string; color: string; label: string; val: number }> = [];

  entries.forEach(([label, val], idx) => {
    const percentage = val / total;
    const sliceAngle = percentage * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    // Calculate slice center angle for label positioning
    const midAngle = (startAngle + endAngle) / 2;
    const midAngleRad = (midAngle * Math.PI) / 180;

    // Calculate path for pie slice
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 75 + radius * Math.cos(startRad);
    const y1 = 75 + radius * Math.sin(startRad);
    const x2 = 75 + radius * Math.cos(endRad);
    const y2 = 75 + radius * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    // For first slice, pull it out
    const isExploded = idx === 0;
    const offsetX = isExploded ? explodeDistance * Math.cos(midAngleRad) : 0;
    const offsetY = isExploded ? explodeDistance * Math.sin(midAngleRad) : 0;

    const path = `M ${75 + offsetX} ${75 + offsetY} L ${x1 + offsetX} ${y1 + offsetY} A ${radius} ${radius} 0 ${largeArc} 1 ${x2 + offsetX} ${y2 + offsetY} Z`;

    slices.push({ path, color: colors[idx], label, val });
    currentAngle = endAngle;
  });

  return (
    <div style={{ textAlign: "center" }}>
      <h4 style={{ marginTop: 0, marginBottom: 12 }}>{title}</h4>
      <svg width="250" height="250" viewBox="0 0 150 150" style={{ margin: "0 auto" }}>
        {slices.map((slice) => (
          <path
            key={slice.label}
            d={slice.path}
            fill={slice.color}
            stroke="white"
            strokeWidth="1"
          />
        ))}
      </svg>
      <div style={{ marginTop: 12, fontSize: 12 }}>
        {slices.map((slice, idx) => (
          <div key={slice.label} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: slice.color,
              }}
            />
            <span>{slice.label}: {slice.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function GMDashboardPage() {
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setError("");
      setLoading(true);
      try {
        const stats = await apiGet("/tenders/gm-dashboard/stats");
        setData(stats);
      } catch (e: any) {
        setError(e?.message || "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <RequireRoles anyOf={["GENERAL_MANAGER", "SYS_ADMIN"]} title="GM Dashboard">
      <InternalPage title="GM Dashboard">
        {error && <div style={{ color: "#b91c1c", marginBottom: 12 }}>{error}</div>}

        {loading ? (
          <p>Loading…</p>
        ) : data ? (
          <>
            {/* Charts Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, marginBottom: 24 }}>
              <div className="card">
                <DonutChart data={data.byDepartment} title="By Department" />
              </div>
              <div className="card">
                <DonutChart data={data.byStatus} title="By Status" />
              </div>
              <div className="card">
                <DonutChart data={data.departmentPerformance} title="Department Performance" />
              </div>
              <div className="card">
                <DonutChart data={data.monthlyTrends} title="Monthly Trends" />
              </div>
            </div>

            {/* Pending Tenders */}
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Pending Approvals ({data.pending.length})</h3>
              {data.pending.length === 0 ? (
                <p style={{ color: "#666" }}>No pending approvals</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>ID</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>Title</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>Status</th>
                        <th style={{ padding: 8, textAlign: "left", fontWeight: 600 }}>Date</th>
                        <th style={{ padding: 8, textAlign: "center", fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pending.map((tender) => (
                        <tr key={tender.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: 8 }}>TEN-{String(tender.tender_id).padStart(5, "0")}</td>
                          <td style={{ padding: 8 }}>{tender.title}</td>
                          <td style={{ padding: 8 }}>
                            <span className="pill" style={{ fontSize: 11 }}>{tender.status}</span>
                          </td>
                          <td style={{ padding: 8 }}>
                            {new Date(tender.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: 8, textAlign: "center" }}>
                            <Link
                              className="btn"
                              href={`/tenders/${tender.id}/gm-approval`}
                              style={{ fontSize: 12, padding: "4px 8px" }}
                            >
                              Review
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </InternalPage>
    </RequireRoles>
  );
}
