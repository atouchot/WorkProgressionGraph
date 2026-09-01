/**
 * A single regular-cadence reporting period (e.g. one week).
 *
 * `counts` holds one number per status, in the same order as
 * `WorkProgressionGraphOptions.statuses`, ordered from least to most
 * progressed (e.g. Intake ... Closed).
 */
export interface WorkProgressionPeriod {
  counts: number[];
  label?: string;
  date?: string;
}

/**
 * A period slot. `null`/`undefined` means "no report was filed for this
 * period" — its value carries forward from the previous period.
 */
export type WorkProgressionPeriodInput = WorkProgressionPeriod | null | undefined;

export type PlanShape = "linear" | "s-curve";

export interface PlanCurveOptions {
  /** Status level (0 .. statuses.length - 1) the plan starts at. Default 0. */
  startLevel?: number;
  /** Status level (0 .. statuses.length - 1) the plan ends at. */
  endLevel: number;
  /** Easing of the planned curve between startLevel and endLevel. Default "s-curve". */
  shape?: PlanShape;
}

export interface PlotBounds {
  /** Pixel x of the first period's start. */
  left: number;
  /** Pixel x of the last period's end. */
  right: number;
  /** Pixel y of the chart's baseline (0% progression). */
  axisY: number;
  /** Pixel y of the topmost status row (the most-progressed status). */
  topRowY: number;
  /** Pixel distance between adjacent status rows. */
  rowHeight: number;
}

export interface WorkProgressionGraphOptions {
  /** Ordered least-progressed -> most-progressed, e.g. ["Intake", ..., "Closed"]. */
  statuses: string[];
  /** One entry per regular period, in chronological order. */
  periods: WorkProgressionPeriodInput[];
  plot: PlotBounds;
  plan?: PlanCurveOptions;
  /**
   * Status level treated as "complete" for the milestone marker.
   * Defaults to the last status (statuses.length - 1).
   */
  milestoneLevel?: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ResolvedPeriod {
  index: number;
  /** Pixel x where this period starts / ends / midpoints. */
  x0: number;
  x1: number;
  cx: number;
  /** Curve y for this period (the step is flat across the period). */
  y: number;
  /** Weighted-mean status position, in status-index units (0 .. statuses.length - 1). */
  level: number;
  /** Counts actually used for this period, after carrying forward any missing report. */
  counts: number[];
  /** True when this period had no report and reused the previous period's counts. */
  wasCarriedForward: boolean;
  label?: string;
  date?: string;
}

export interface EdgeLabel {
  x: number;
  label?: string;
  date?: string;
}

export interface WorkProgressionGraphResult {
  statusRows: { status: string; index: number; y: number }[];
  periods: ResolvedPeriod[];
  /** N+1 x positions at period boundaries, for gridlines/ticks. */
  periodBoundaryTicks: { x: number }[];
  /** Step polyline through every period (2 points per period). */
  curvePoints: Point[];
  /** curvePoints closed down to the axis, for an area fill. */
  areaPolygon: Point[];
  /** N+1 points sampled at period boundaries, or null when `plan` wasn't given. */
  planPoints: Point[] | null;
  milestone: { level: number; y: number };
  firstPeriod: EdgeLabel;
  lastPeriod: EdgeLabel;
}
