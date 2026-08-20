/**
 * Baseline math: median / MAD / verdict over a location's weekly event counts (T-09).
 *
 * Pure functions only. No I/O, no imports from `db/` or `routes/`, no date arithmetic — SQL
 * (server/db/queries.ts, T-07/T-08) already decided the weeks; this module never recomputes or
 * re-derives them (single source of truth, PLAN §6).
 *
 * Input shape: the caller passes the current (judged) week's count separately from the prior
 * weeks' counts, because that's the natural split of T-08's output — the query returns 9 rows
 * per location (judged week + 8 prior, newest first); the caller peels off row 0 as `currentCount`
 * and passes the remaining 8 as `priorWeekCounts` (fewer than 8 when history is short, e.g. a
 * young location or the seed's early weeks). This module does no slicing of its own — it trusts
 * the caller for which count is "current" vs. "prior", since that's a date fact, not a math fact.
 *
 * PLAN §4:
 *   - Baseline = median of the (up to 8) most recent complete prior weeks.
 *   - Spread = MAD (median absolute deviation), scaled by 1.4826.
 *   - Typical range = median ± 2 × scaledMAD, floored at 0.
 *   - insufficient_history when fewer than 4 complete prior weeks exist, or MAD is 0 with too
 *     little history — no band is emitted in that case, rather than a fake one.
 */

/** Verdict for the judged week relative to the location's own baseline. */
export type Verdict = "above" | "below" | "typical" | "insufficient_history";

/** The typical range around the baseline median, floored at 0. */
export interface TypicalRange {
  low: number;
  high: number;
}

/**
 * Result when there is enough history to render a band.
 * `deltaPct` is the judged week's percent deviation from the baseline median; `null` only when
 * the median is 0 (percent change from zero is undefined, not a real number).
 */
export interface BaselineResultWithBand {
  verdict: Exclude<Verdict, "insufficient_history">;
  baselineMedian: number;
  typicalRange: TypicalRange;
  deltaPct: number | null;
  weeksOfHistory: number;
}

/** Result when history is too thin to trust a band — no band is emitted at all. */
export interface BaselineResultInsufficientHistory {
  verdict: "insufficient_history";
  baselineMedian: null;
  typicalRange: null;
  deltaPct: null;
  weeksOfHistory: number;
}

export type BaselineResult =
  BaselineResultWithBand | BaselineResultInsufficientHistory;

/** Minimum complete prior weeks required before a band is trusted (PLAN §4). */
const MIN_WEEKS_OF_HISTORY = 4;

/**
 * Full trailing baseline window (PLAN §4: "median of the 8 most recent complete weeks"). Used as
 * the threshold for the MAD-0 edge case below: a zero-spread baseline is only trusted once the
 * full window is present, not from a handful of coincidentally-identical weeks.
 */
const FULL_BASELINE_WINDOW_WEEKS = 8;

/** MAD is scaled by this constant so it's comparable to a standard deviation (PLAN §4). */
const MAD_SCALE_FACTOR = 1.4826;

/** Band half-width, in scaled-MAD units (PLAN §4: median ± 2 · scaledMAD). */
const BAND_WIDTH_IN_SCALED_MAD = 2;

/**
 * Median of a non-empty array of numbers. Even-length arrays average the two middle values.
 * Guard clause first (empty input), happy path last (principles §4).
 */
export function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error("median: values must be non-empty");
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Scaled median absolute deviation: median(|x - median(values)|) × 1.4826.
 * Robust to outliers by construction — this is the property PLAN §4 relies on for account 6's
 * 800-event burst day not poisoning the baseline.
 * Guard clause first (empty input), happy path last (principles §4).
 */
export function scaledMAD(values: number[]): number {
  if (values.length === 0) {
    throw new Error("scaledMAD: values must be non-empty");
  }

  const center = median(values);
  const absoluteDeviations = values.map((value) => Math.abs(value - center));
  return median(absoluteDeviations) * MAD_SCALE_FACTOR;
}

/**
 * The typical range around a baseline median: median ± 2 · scaledMAD, floored at 0 (counts can't
 * be negative).
 */
export function typicalRange(
  baselineMedian: number,
  scaledMadValue: number,
): TypicalRange {
  const halfWidth = BAND_WIDTH_IN_SCALED_MAD * scaledMadValue;
  return {
    low: Math.max(0, baselineMedian - halfWidth),
    high: Math.max(0, baselineMedian + halfWidth),
  };
}

/**
 * Percent deviation of `current` from `baselineMedian`. `null` when the median is 0 — percent
 * change from a zero baseline is undefined, not a real number, and rendering a fake one would
 * violate principles §6 (say so honestly rather than hiding the edge).
 */
export function deltaPct(
  current: number,
  baselineMedian: number,
): number | null {
  if (baselineMedian === 0) {
    return null;
  }

  return ((current - baselineMedian) / baselineMedian) * 100;
}

/**
 * Judge one location's current week against its own history.
 *
 * @param currentCount    the judged week's event count.
 * @param priorWeekCounts the complete prior weeks' counts (newest first or any order — order
 *                        doesn't matter to median/MAD), excluding the judged week itself.
 *
 * Guard clauses first (insufficient history), happy path last (principles §4).
 */
export function judgeWeek(
  currentCount: number,
  priorWeekCounts: number[],
): BaselineResult {
  const weeksOfHistory = priorWeekCounts.length;

  if (weeksOfHistory < MIN_WEEKS_OF_HISTORY) {
    return {
      verdict: "insufficient_history",
      baselineMedian: null,
      typicalRange: null,
      deltaPct: null,
      weeksOfHistory,
    };
  }

  const baselineMedian = median(priorWeekCounts);
  const madValue = scaledMAD(priorWeekCounts);

  if (madValue === 0 && weeksOfHistory < FULL_BASELINE_WINDOW_WEEKS) {
    return {
      verdict: "insufficient_history",
      baselineMedian: null,
      typicalRange: null,
      deltaPct: null,
      weeksOfHistory,
    };
  }

  const band = typicalRange(baselineMedian, madValue);

  let verdict: Exclude<Verdict, "insufficient_history">;
  if (currentCount < band.low) {
    verdict = "below";
  } else if (currentCount > band.high) {
    verdict = "above";
  } else {
    verdict = "typical";
  }

  return {
    verdict,
    baselineMedian,
    typicalRange: band,
    deltaPct: deltaPct(currentCount, baselineMedian),
    weeksOfHistory,
  };
}
