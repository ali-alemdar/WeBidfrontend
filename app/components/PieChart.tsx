"use client";

export interface PieChartSegment {
  label: string;
  value: number;
  // color is ignored; we use a fixed vibrant palette by index
  color?: string;
}

export function PieChart({
  title,
  segments,
}: {
  title: string;
  segments: PieChartSegment[];
}) {
  const total = segments.reduce(
    (a, s) => a + (Number.isFinite(s.value) ? s.value : 0),
    0,
  );

  const palette = [
    "#FF3B30", // Bright Red
    "#FF9500", // Neon Orange
    "#32D74B", // Lime Green
    "#FF2D55", // Hot Pink
    "#FFD60A", // Sunny Yellow
    "#30D5C8", // Turquoise
    "#00C7FF", // Cyan Blue
    "#00FF6A", // Neon Green
    "#AF52DE", // Royal Purple
    "#5AC8FA", // Sky Blue
    "#FF6F61", // Coral
    "#007AFF", // Electric Blue
    "#8E44FF", // Vivid Violet
    "#FF00FF", // Magenta
    "#00E5D8", // Bright Teal
  ];

  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 58;

  const visible = segments.filter((s) => (s.value || 0) > 0);
  const hasSingleSegment = visible.length === 1 && total > 0;

  const createSlice = (
    startAngle: number,
    endAngle: number,
    color: string,
  ) => {
    if (endAngle - startAngle >= 360) {
      return <circle cx={cx} cy={cy} r={radius} fill={color} />;
    }

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const d = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `Z`,
    ].join(" ");

    return <path d={d} fill={color} />;
  };

  let cumulativeAngle = -90;
  const slices = visible.map((segment, idx) => {
    const value = Number.isFinite(segment.value) ? segment.value : 0;
    const angle = total > 0 ? (value / total) * 360 : 0;
    const startAngle = cumulativeAngle;
    const endAngle = startAngle + angle;
    cumulativeAngle = endAngle;

    const color = palette[idx % palette.length];

    return <g key={idx}>{createSlice(startAngle, endAngle, color)}</g>;
  });

  return (
    <div className="card" style={{ boxShadow: "none", padding: 14, width: "100%" }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        <svg width="170" height="170" viewBox="0 0 160 160">
          {total === 0 ? (
            <circle cx={cx} cy={cy} r={radius} fill="#e5e7eb" />
          ) : hasSingleSegment ? (
            <circle cx={cx} cy={cy} r={radius} fill={palette[0]} />
          ) : (
            slices
          )}

          <circle cx={cx} cy={cy} r={radius - 30} fill="#ffffff" />
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            style={{ fontSize: 22, fontWeight: 900, fill: "#111827" }}
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            style={{ fontSize: 11, fontWeight: 700, fill: "#6b7280" }}
          >
            total
          </text>
        </svg>

        <div style={{ display: "grid", gap: 8, width: "100%" }}>
          {segments.map((s, idx) => {
            const color = palette[idx % palette.length];
            return (
              <div
                key={s.label}
                style={{ display: "flex", gap: 10, alignItems: "center" }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    background: color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 12,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={s.label}
                  >
                    {s.label}
                  </div>
                </div>
                <div style={{ fontWeight: 900 }}>{s.value}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
