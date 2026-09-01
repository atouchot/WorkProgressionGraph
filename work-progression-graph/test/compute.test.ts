import { describe, expect, it } from "vitest";
import { computeWorkProgressionGraph } from "../src/compute";
import type { WorkProgressionGraphOptions } from "../src/types";

const basePlot = { left: 0, right: 100, axisY: 100, topRowY: 0, rowHeight: 10 };
const statuses = ["A", "B", "C"]; // level range 0..2

function baseOptions(
  overrides: Partial<WorkProgressionGraphOptions> = {},
): WorkProgressionGraphOptions {
  return {
    statuses,
    periods: [{ counts: [1, 0, 0] }, { counts: [0, 1, 0] }, { counts: [0, 0, 1] }],
    plot: basePlot,
    ...overrides,
  };
}

describe("computeWorkProgressionGraph", () => {
  it("computes a step curve at the weighted-mean status level per period", () => {
    const result = computeWorkProgressionGraph(baseOptions());
    // level 0 -> top-most status is "C" (index 2) at y=topRowY=0, "A" (index 0) at y=20
    expect(result.periods[0].level).toBe(0); // all in "A"
    expect(result.periods[1].level).toBe(1); // all in "B"
    expect(result.periods[2].level).toBe(2); // all in "C"
    expect(result.periods[0].y).toBe(20); // rowY(2) = 0 + 2*10
    expect(result.periods[2].y).toBe(0); // rowY(0)
  });

  it("carries the previous period's counts forward when a period has no report", () => {
    const result = computeWorkProgressionGraph(
      baseOptions({
        periods: [{ counts: [1, 0, 0] }, null, { counts: [0, 0, 1] }],
      }),
    );
    expect(result.periods[1].wasCarriedForward).toBe(true);
    expect(result.periods[1].counts).toEqual([1, 0, 0]);
    expect(result.periods[1].level).toBe(0);
    expect(result.periods[0].wasCarriedForward).toBe(false);
    expect(result.periods[2].wasCarriedForward).toBe(false);
  });

  it("supports multiple consecutive missing periods", () => {
    const result = computeWorkProgressionGraph(
      baseOptions({
        periods: [{ counts: [0, 1, 0] }, null, null, { counts: [0, 0, 1] }],
      }),
    );
    expect(result.periods[1].counts).toEqual([0, 1, 0]);
    expect(result.periods[2].counts).toEqual([0, 1, 0]);
  });

  it("throws when the first period has no report to seed carry-forward", () => {
    expect(() =>
      computeWorkProgressionGraph(baseOptions({ periods: [null, { counts: [1, 0, 0] }] })),
    ).toThrow(/first period/i);
  });

  it("throws when a period's counts length doesn't match the status list", () => {
    expect(() =>
      computeWorkProgressionGraph(baseOptions({ periods: [{ counts: [1, 0] }] })),
    ).toThrow(/expected 3/);
  });

  it("places period boundary ticks evenly across the plot width", () => {
    const result = computeWorkProgressionGraph(baseOptions());
    expect(result.periodBoundaryTicks).toHaveLength(4); // 3 periods -> 4 boundaries
    expect(result.periodBoundaryTicks.map((t) => t.x)).toEqual([0, 100 / 3, 200 / 3, 100]);
  });

  it("closes the area polygon down to the axis at both ends", () => {
    const result = computeWorkProgressionGraph(baseOptions());
    const last = result.areaPolygon[result.areaPolygon.length - 2];
    const first = result.areaPolygon[result.areaPolygon.length - 1];
    expect(last).toEqual({ x: 100, y: 100 });
    expect(first).toEqual({ x: 0, y: 100 });
  });

  it("defaults the milestone to the last status, and honors an override", () => {
    const def = computeWorkProgressionGraph(baseOptions());
    expect(def.milestone).toEqual({ level: 2, y: 0 });

    const override = computeWorkProgressionGraph(baseOptions({ milestoneLevel: 1 }));
    expect(override.milestone).toEqual({ level: 1, y: 10 });
  });

  it("omits planPoints when no plan is given, and samples N+1 points when it is", () => {
    const noPlan = computeWorkProgressionGraph(baseOptions());
    expect(noPlan.planPoints).toBeNull();

    const withPlan = computeWorkProgressionGraph(
      baseOptions({ plan: { endLevel: 2 } }),
    );
    expect(withPlan.planPoints).toHaveLength(4);
    expect(withPlan.planPoints![0]).toEqual({ x: 0, y: 20 }); // startLevel default 0 -> level 0 -> y 20
    expect(withPlan.planPoints![3]).toEqual({ x: 100, y: 0 }); // endLevel 2 -> y 0
  });

  it("computes a linear plan curve exactly, and an s-curve non-linearly", () => {
    const linear = computeWorkProgressionGraph(
      baseOptions({ plan: { endLevel: 2, shape: "linear" } }),
    );
    // halfway period boundary (i=1 of 3) -> u = 1/3 -> level = 2/3 -> y = 20 - (2/3)*10
    expect(linear.planPoints![1].y).toBeCloseTo(20 - (2 / 3) * 10, 10);

    const sCurve = computeWorkProgressionGraph(
      baseOptions({ plan: { endLevel: 2, shape: "s-curve" } }),
    );
    expect(sCurve.planPoints![1].y).not.toBeCloseTo(linear.planPoints![1].y, 5);
  });

  it("reports the first and last period's edge labels at the plot bounds", () => {
    const result = computeWorkProgressionGraph(
      baseOptions({
        periods: [
          { counts: [1, 0, 0], label: "W1", date: "Jun 1" },
          { counts: [0, 1, 0] },
          { counts: [0, 0, 1], label: "W3", date: "Jun 15" },
        ],
      }),
    );
    expect(result.firstPeriod).toEqual({ x: 0, label: "W1", date: "Jun 1" });
    expect(result.lastPeriod).toEqual({ x: 100, label: "W3", date: "Jun 15" });
  });
});
