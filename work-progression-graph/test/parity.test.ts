import { describe, expect, it } from "vitest";
import { computeWorkProgressionGraph } from "../src/compute";

/**
 * Regression/parity test: reproduces the exact geometry formulas from the
 * source Claude Design mockup (`project/Work Progression Graph v2.dc.html`,
 * the <script data-dc-script> block) as an independent reference
 * implementation, and asserts computeWorkProgressionGraph produces the
 * same numbers for the same dataset. This is what "pixel-perfect" means
 * for a headless (non-visual) port.
 */

const PLOT_L = 132;
const PLOT_R = 948;
const DAYS = 91;
const TOTAL = 24;
const AXIS_Y = 272;

const STATUSES = ["Intake", "Scoping", "Approved", "In build", "Validation", "Delivered", "Closed"];
const COUNTS = [
  [7, 5, 4, 5, 2, 1, 0],
  [6, 5, 5, 5, 2, 1, 0],
  [6, 5, 5, 5, 2, 1, 0],
  [5, 4, 5, 6, 2, 2, 0],
  [4, 4, 5, 6, 3, 2, 0],
  [4, 4, 5, 6, 3, 2, 0],
  [3, 3, 5, 7, 3, 2, 1],
  [3, 3, 4, 7, 4, 2, 1],
  [2, 3, 4, 7, 4, 3, 1],
  [2, 3, 4, 7, 4, 3, 1],
  [2, 2, 3, 7, 5, 4, 1],
  [1, 2, 3, 6, 5, 5, 2],
  [1, 2, 2, 6, 5, 5, 3],
];
const DATES = [
  "Jun 1", "Jun 8", "Jun 15", "Jun 22", "Jun 29", "Jul 6", "Jul 13",
  "Jul 20", "Jul 27", "Aug 3", "Aug 10", "Aug 17", "Aug 24",
];

const refX = (d: number) => PLOT_L + (d / DAYS) * (PLOT_R - PLOT_L);
const refRowY = (r: number) => 44 + r * 34;
const refYForLevel = (lvl: number) => refRowY(6 - lvl);
const refLevel = (wi: number) => {
  let s = 0;
  COUNTS[wi].forEach((n, si) => (s += n * si));
  return s / TOTAL;
};

describe("parity with the original Work Progression Graph v2.dc.html script", () => {
  const options = {
    statuses: STATUSES,
    periods: COUNTS.map((counts, i) => ({ counts, label: "W" + (i + 1), date: DATES[i] })),
    plot: { left: PLOT_L, right: PLOT_R, axisY: AXIS_Y, topRowY: 44, rowHeight: 34 },
    plan: { startLevel: 0.4, endLevel: 0.4 + 5.2, shape: "s-curve" as const },
  };
  const result = computeWorkProgressionGraph(options);

  it("matches the reference weighted-mean level and step-curve y per week", () => {
    COUNTS.forEach((_, wi) => {
      expect(result.periods[wi].level).toBeCloseTo(refLevel(wi), 10);
      expect(result.periods[wi].y).toBeCloseTo(refYForLevel(refLevel(wi)), 6);
    });
  });

  it("matches the reference curvePoints (2 points per week, step held flat)", () => {
    const refCurve: { x: number; y: number }[] = [];
    COUNTS.forEach((_, wi) => {
      const x0 = refX(wi * 7);
      const x1 = refX((wi + 1) * 7);
      const y = refYForLevel(refLevel(wi));
      refCurve.push({ x: x0, y }, { x: x1, y });
    });
    expect(result.curvePoints).toHaveLength(refCurve.length);
    result.curvePoints.forEach((p, i) => {
      expect(p.x).toBeCloseTo(refCurve[i].x, 6);
      expect(p.y).toBeCloseTo(refCurve[i].y, 6);
    });
  });

  it("matches the reference area polygon closing points", () => {
    const closing = result.areaPolygon.slice(-2);
    expect(closing[0]).toEqual({ x: PLOT_R, y: AXIS_Y });
    expect(closing[1]).toEqual({ x: PLOT_L, y: AXIS_Y });
  });

  it("matches the reference planned-progression curve (S-curve, week boundaries)", () => {
    const refPlan: { x: number; y: number }[] = [];
    for (let i = 0; i <= 13; i++) {
      const u = i / 13;
      const shaped = 3 * u * u - 2 * u * u * u;
      refPlan.push({ x: refX(i * 7), y: refYForLevel(0.4 + shaped * 5.2) });
    }
    expect(result.planPoints).toHaveLength(refPlan.length);
    result.planPoints!.forEach((p, i) => {
      expect(p.x).toBeCloseTo(refPlan[i].x, 6);
      expect(p.y).toBeCloseTo(refPlan[i].y, 6);
    });
  });

  it("matches the reference milestone-complete y (completeY = yForLevel(6))", () => {
    expect(result.milestone.y).toBeCloseTo(refYForLevel(6), 10);
    expect(result.milestone.y).toBe(44);
  });

  it("matches the reference W1/W13 edge labels", () => {
    expect(result.firstPeriod.x).toBeCloseTo(refX(0), 6);
    expect(result.firstPeriod.label).toBe("W1");
    expect(result.firstPeriod.date).toBe(DATES[0]);

    expect(result.lastPeriod.x).toBeCloseTo(refX(13 * 7), 6);
    expect(result.lastPeriod.label).toBe("W13");
    expect(result.lastPeriod.date).toBe(DATES[12]);
  });
});
