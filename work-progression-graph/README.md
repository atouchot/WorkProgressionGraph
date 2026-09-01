# work-progression-graph

Headless geometry for a **portfolio work-progression ladder chart**: the
weighted-mean position of a set of items across an ordered list of
statuses, plotted over a regular sequence of reporting periods. Missing
reports carry the previous period's value forward, silently — the
horizontal axis always stays evenly spaced regardless of how irregular
the underlying reporting actually was.

This package computes points, scales and labels only. It renders nothing
and ships no styles — plug the numbers into your own SVG, canvas, or
chart primitive and style it however fits your design system.

Ported 1:1 from the Claude Design mockup `Work Progression Graph v2.dc.html`
(see `test/parity.test.ts`, which checks the output against the mockup's
own formulas for the same dataset).

## Install

```sh
npm install work-progression-graph
```

## Usage

```tsx
import { useWorkProgressionGraph } from "work-progression-graph";

const options = useMemo(
  () => ({
    statuses: ["Intake", "Scoping", "Approved", "In build", "Validation", "Delivered", "Closed"],
    periods: [
      { counts: [7, 5, 4, 5, 2, 1, 0], label: "W1", date: "Jun 1" },
      { counts: [6, 5, 5, 5, 2, 1, 0], label: "W2", date: "Jun 8" },
      // ... a `null` entry here means "no report that week" — its
      // counts carry forward from the previous period automatically.
      null,
      { counts: [6, 5, 5, 5, 2, 1, 0], label: "W4", date: "Jun 22" },
    ],
    plot: { left: 132, right: 948, axisY: 272, topRowY: 44, rowHeight: 34 },
    plan: { startLevel: 0.4, endLevel: 5.6, shape: "s-curve" },
  }),
  [],
);

const graph = useWorkProgressionGraph(options);
```

`computeWorkProgressionGraph(options)` is also exported directly for use
outside React (Vue, Svelte, server-side rendering, plain canvas code).

## What you get back

- `periods[]` — one resolved entry per input period: its weighted-mean
  `level`, pixel `y`, `x0`/`x1`/`cx`, the `counts` actually used (after
  carry-forward), and a `wasCarriedForward` flag if you *do* want to
  signal stale data, even though the reference design doesn't.
- `curvePoints` / `areaPolygon` — ready-to-join step-line and fill
  points for the "actual" series.
- `planPoints` — the optional planned-progression curve, sampled at
  period boundaries (`null` when you don't pass `plan`).
- `statusRows`, `periodBoundaryTicks`, `milestone`, `firstPeriod`,
  `lastPeriod` — everything else the mockup draws (row positions for
  optional gridlines/labels, tick x-positions, the "milestone complete"
  marker, and the first/last axis labels).

## Rendering example

The following reproduces the reference design's look — a light card,
blue-50 area fill, a solid blue actual line, and a dashed grey planned
line — entirely in the consumer's own SVG. None of this markup or CSS
ships with the package:

```tsx
function ProgressionChart({ graph }: { graph: WorkProgressionGraphResult }) {
  const toPoints = (pts: { x: number; y: number }[]) =>
    pts.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={980} height={352} viewBox="0 0 980 352">
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
      <line
        x1={graph.firstPeriod.x}
        x2={graph.lastPeriod.x}
        y1={graph.milestone.y}
        y2={graph.milestone.y}
        stroke="#d4d4d8"
        strokeDasharray="4 4"
      />
    </svg>
  );
}
```

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
```
