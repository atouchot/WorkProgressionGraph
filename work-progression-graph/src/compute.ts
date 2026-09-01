import type {
  Point,
  ResolvedPeriod,
  WorkProgressionGraphOptions,
  WorkProgressionGraphResult,
} from "./types";

const smoothstep = (u: number) => 3 * u * u - 2 * u * u * u;

/**
 * Pure geometry for a "work progression ladder" chart: the portfolio's
 * weighted-mean position across an ordered set of statuses, over a
 * regular sequence of reporting periods. Periods with no report carry
 * the previous period's counts forward, silently.
 *
 * Ported from the Claude Design mockup `Work Progression Graph v2.dc.html`.
 * Returns geometry only — no rendering, no styling.
 */
export function computeWorkProgressionGraph(
  options: WorkProgressionGraphOptions,
): WorkProgressionGraphResult {
  const { statuses, periods, plot, plan, milestoneLevel } = options;
  const statusCount = statuses.length;
  const periodCount = periods.length;

  if (statusCount < 2) {
    throw new Error("computeWorkProgressionGraph: at least 2 statuses are required");
  }
  if (periodCount < 1) {
    throw new Error("computeWorkProgressionGraph: at least 1 period is required");
  }
  const seed = periods[0];
  if (!seed || !seed.counts) {
    throw new Error(
      "computeWorkProgressionGraph: the first period must include reported counts " +
        "(there is nothing to carry forward from before the start)",
    );
  }
  periods.forEach((p, i) => {
    if (p && p.counts.length !== statusCount) {
      throw new Error(
        `computeWorkProgressionGraph: period ${i} has ${p.counts.length} counts, ` +
          `expected ${statusCount} (one per status)`,
      );
    }
  });

  const rowY = (r: number) => plot.topRowY + r * plot.rowHeight;
  const yForLevel = (level: number) => rowY(statusCount - 1 - level);

  const periodWidth = (plot.right - plot.left) / periodCount;
  const xAt = (i: number) => plot.left + i * periodWidth;

  const statusRows = statuses.map((status, index) => ({
    status,
    index,
    y: rowY(statusCount - 1 - index),
  }));

  const resolved: ResolvedPeriod[] = [];
  let lastCounts = seed.counts;
  periods.forEach((p, i) => {
    const wasCarriedForward = !p;
    const counts = p ? p.counts : lastCounts;
    lastCounts = counts;

    const total = counts.reduce((sum, n) => sum + n, 0);
    const weighted = counts.reduce((sum, n, idx) => sum + n * idx, 0);
    const level = total === 0 ? 0 : weighted / total;

    resolved.push({
      index: i,
      x0: xAt(i),
      x1: xAt(i + 1),
      cx: xAt(i + 0.5),
      y: yForLevel(level),
      level,
      counts,
      wasCarriedForward,
      label: p?.label,
      date: p?.date,
    });
  });

  const periodBoundaryTicks: { x: number }[] = [];
  for (let i = 0; i <= periodCount; i++) periodBoundaryTicks.push({ x: xAt(i) });

  const curvePoints: Point[] = [];
  resolved.forEach((p) => {
    curvePoints.push({ x: p.x0, y: p.y }, { x: p.x1, y: p.y });
  });

  const areaPolygon: Point[] = [
    ...curvePoints,
    { x: plot.right, y: plot.axisY },
    { x: plot.left, y: plot.axisY },
  ];

  let planPoints: Point[] | null = null;
  if (plan) {
    const shape = plan.shape ?? "s-curve";
    const startLevel = plan.startLevel ?? 0;
    planPoints = [];
    for (let i = 0; i <= periodCount; i++) {
      const u = i / periodCount;
      const shaped = shape === "linear" ? u : smoothstep(u);
      const level = startLevel + shaped * (plan.endLevel - startLevel);
      planPoints.push({ x: xAt(i), y: yForLevel(level) });
    }
  }

  const resolvedMilestoneLevel = milestoneLevel ?? statusCount - 1;
  const milestone = { level: resolvedMilestoneLevel, y: yForLevel(resolvedMilestoneLevel) };

  const first = resolved[0];
  const last = resolved[periodCount - 1];
  const firstPeriod = { x: first.x0, label: first.label, date: first.date };
  const lastPeriod = { x: last.x1, label: last.label, date: last.date };

  return {
    statusRows,
    periods: resolved,
    periodBoundaryTicks,
    curvePoints,
    areaPolygon,
    planPoints,
    milestone,
    firstPeriod,
    lastPeriod,
  };
}
