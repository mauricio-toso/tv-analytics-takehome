/**
 * Unit tests for the median/MAD baseline (T-09, PLAN §4/§7.1).
 *
 * These tests exist to justify one decision — median/MAD over mean/stddev — and to pin the
 * three edge cases that decision depends on. Pure functions in, pure values out: no DB, no I/O,
 * no dates (weeks are SQL's job, per PLAN §6 and .claude/rules/tests.md).
 */

import { describe, expect, test } from "vitest";
import { judgeWeek, median } from "./baseline.ts";

describe("baseline math (PLAN §4/§7.1)", () => {
  test("an order-of-magnitude outlier does not move the baseline more than a small tolerance", () => {
    // account-6-style burst, in miniature: one week an order of magnitude above the rest.
    const outlierFree = [12, 14, 11, 13, 12, 14, 13, 15];
    const withOutlier = [12, 14, 11, 13, 800, 14, 13, 15];

    expect(
      Math.abs(median(withOutlier) - median(outlierFree)),
    ).toBeLessThanOrEqual(1);
  });

  test("under naive mean ± 2·stddev the same outlier-inflated band would call a genuine spike 'typical' where median/MAD correctly calls it 'above'", () => {
    const priorWeeks = [12, 14, 11, 13, 800, 14, 13, 15];
    const currentCount = 20; // a moderate, genuine spike relative to the ~13-event normal weeks

    const result = judgeWeek(currentCount, priorWeeks);
    expect(result.verdict).toBe("above");

    // Hand-computed mean/stddev baseline for the same series (population stddev):
    //   mean = (12+14+11+13+800+14+13+15) / 8 = 111.5
    //   variance = Σ(x - mean)² / 8 = 67711.75  →  stddev ≈ 260.2
    // both dragged up and blown wide by the single 800-event outlier.
    const mean =
      priorWeeks.reduce((sum, value) => sum + value, 0) / priorWeeks.length;
    const variance =
      priorWeeks.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
      priorWeeks.length;
    const stddev = Math.sqrt(variance);
    const meanBandLow = Math.max(0, mean - 2 * stddev);
    const meanBandHigh = mean + 2 * stddev;

    // The outlier drags the mean/stddev band so far up and wide that the same spike median/MAD
    // flags as "above" falls comfortably inside it — the verdict flips to "typical" and the
    // anomaly goes unreported. This is the failure median/MAD was chosen to avoid.
    expect(currentCount).toBeGreaterThanOrEqual(meanBandLow);
    expect(currentCount).toBeLessThanOrEqual(meanBandHigh);
  });

  test("an all-zero baseline with a zero current week is 'typical', not a division-by-zero", () => {
    const priorWeeks = [0, 0, 0, 0, 0, 0, 0, 0];

    const result = judgeWeek(0, priorWeeks);

    expect(result.verdict).toBe("typical");
    if (result.verdict === "insufficient_history") {
      throw new Error("expected a band, got insufficient_history");
    }
    expect(result.baselineMedian).toBe(0);
    expect(result.typicalRange).toEqual({ low: 0, high: 0 });
    expect(result.deltaPct).toBeNull();
  });

  test("fewer than 4 complete prior weeks yields 'insufficient_history' with no band", () => {
    const result = judgeWeek(10, [8, 9, 11]);

    expect(result.verdict).toBe("insufficient_history");
    expect(result.baselineMedian).toBeNull();
    expect(result.typicalRange).toBeNull();
    expect(result.deltaPct).toBeNull();
    expect(result.weeksOfHistory).toBe(3);
  });
});
