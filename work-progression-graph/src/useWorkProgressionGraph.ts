import { useMemo } from "react";
import { computeWorkProgressionGraph } from "./compute";
import type { WorkProgressionGraphOptions, WorkProgressionGraphResult } from "./types";

/**
 * React hook wrapper around `computeWorkProgressionGraph`. Memoized on the
 * `options` reference — memoize `options` yourself (e.g. with `useMemo`)
 * if you construct it inline from other state.
 */
export function useWorkProgressionGraph(
  options: WorkProgressionGraphOptions,
): WorkProgressionGraphResult {
  return useMemo(() => computeWorkProgressionGraph(options), [options]);
}
