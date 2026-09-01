import { useMemo } from "react";
import { useWorkProgressionGraph, type WorkProgressionGraphOptions } from "work-progression-graph";

const STATUSES = ["Intake", "Scoping", "Approved", "In build", "Validation", "Delivered", "Closed"];

// One entry per week. `null` means "no report that week" — its counts
// carry forward from the previous period automatically, which the chart
// marks with a hollow point.
const PERIODS: WorkProgressionGraphOptions["periods"] = [
  { counts: [10, 6, 4, 2, 1, 1, 0], label: "W1", date: "Jun 1" },
  { counts: [8, 7, 5, 2, 1, 1, 0], label: "W2", date: "Jun 8" },
  null,
  { counts: [6, 7, 6, 3, 1, 1, 0], label: "W4", date: "Jun 22" },
  { counts: [5, 6, 7, 4, 1, 1, 0], label: "W5", date: "Jun 29" },
  { counts: [4, 5, 7, 5, 2, 1, 0], label: "W6", date: "Jul 6" },
  null,
  { counts: [3, 4, 6, 6, 3, 2, 0], label: "W8", date: "Jul 20" },
  { counts: [2, 3, 5, 6, 4, 3, 1], label: "W9", date: "Jul 27" },
  { counts: [1, 2, 4, 6, 5, 4, 2], label: "W10", date: "Aug 3" },
];

const PLOT = { left: 132, right: 948, axisY: 272, topRowY: 44, rowHeight: 34 };

export function App() {
  const options = useMemo<WorkProgressionGraphOptions>(
    () => ({
      statuses: STATUSES,
      periods: PERIODS,
      plot: PLOT,
      plan: { startLevel: 0.3, endLevel: 6, shape: "s-curve" },
    }),
    [],
  );

  const graph = useWorkProgressionGraph(options);

  const toPoints = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div
      style={{
        fontFamily: "system-ui, sans-serif",
        maxWidth: 1040,
        margin: "40px auto",
        padding: "0 24px",
        color: "#18181b",
      }}
    >
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>work-progression-graph demo</h1>
      <p style={{ color: "#71717a", marginTop: 0, marginBottom: 24 }}>
        Portfolio weighted-mean status position across {PERIODS.length} weekly reports. Hollow
        points mark weeks that had no report and carried the previous week's counts forward.
      </p>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e4e4e7",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <svg width={980} height={340} viewBox="0 0 980 340">
          {/* status row labels + gridlines */}
          {graph.statusRows.map((row) => (
            <g key={row.status}>
              <line
                x1={PLOT.left}
                x2={PLOT.right}
                y1={row.y}
                y2={row.y}
                stroke="#f0f0f2"
                strokeWidth={1}
              />
              <text x={PLOT.left - 12} y={row.y + 4} textAnchor="end" fontSize={12} fill="#71717a">
                {row.status}
              </text>
            </g>
          ))}

          {/* baseline */}
          <line
            x1={PLOT.left}
            x2={PLOT.right}
            y1={PLOT.axisY}
            y2={PLOT.axisY}
            stroke="#d4d4d8"
            strokeWidth={1}
          />

          {/* milestone marker */}
          <line
            x1={graph.firstPeriod.x}
            x2={graph.lastPeriod.x}
            y1={graph.milestone.y}
            y2={graph.milestone.y}
            stroke="#d4d4d8"
            strokeDasharray="4 4"
          />

          {/* actual area + line */}
          <polygon points={toPoints(graph.areaPolygon)} fill="#eff6ff" />
          {graph.planPoints && (
            <polyline
              points={toPoints(graph.planPoints)}
              fill="none"
              stroke="#a1a1aa"
              strokeWidth={1.75}
              strokeDasharray="6 5"
            />
          )}
          <polyline
            points={toPoints(graph.curvePoints)}
            fill="none"
            stroke="#1d4ed8"
            strokeWidth={2.25}
          />

          {/* per-period markers, hollow when carried forward */}
          {graph.periods.map((p) => (
            <circle
              key={p.index}
              cx={p.cx}
              cy={p.y}
              r={4}
              fill={p.wasCarriedForward ? "#fff" : "#1d4ed8"}
              stroke="#1d4ed8"
              strokeWidth={1.75}
            />
          ))}

          {/* period boundary ticks */}
          {graph.periodBoundaryTicks.map((t, i) => (
            <line
              key={i}
              x1={t.x}
              x2={t.x}
              y1={PLOT.axisY}
              y2={PLOT.axisY + 6}
              stroke="#d4d4d8"
              strokeWidth={1}
            />
          ))}

          {/* period labels */}
          {graph.periods.map((p) => (
            <g key={p.index}>
              <text x={p.cx} y={PLOT.axisY + 22} textAnchor="middle" fontSize={11} fill="#3f3f46">
                {p.label}
              </text>
              <text x={p.cx} y={PLOT.axisY + 36} textAnchor="middle" fontSize={10} fill="#a1a1aa">
                {p.date}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p style={{ fontSize: 12, color: "#a1a1aa", marginTop: 12 }}>
        Blue: actual weighted-mean position. Dashed grey: planned s-curve progression from level{" "}
        0.3 to Closed.
      </p>
    </div>
  );
}
