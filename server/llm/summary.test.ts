/**
 * Unit tests for the LLM boundary (T-16a, PLAN §8).
 *
 * These exist to falsify the one property the whole boundary is built for: a generated summary
 * is only ever shown when every numeral in it is traceable to the input payload. Both tests call
 * `getSummary` with a plain payload object — no Express, no database, no HTTP — proving the trust
 * boundary is exactly the module signature, per T-16a's Done-when.
 *
 * Each test uses its own accountId/weekStart so the (account, week, eventType) cache can never
 * make one test's result leak into another's.
 */
import { describe, expect, test } from "vitest";
import { getSummary, templateFallback, type NormalcyPayload } from "./summary.ts";

function makePayload(overrides: Partial<NormalcyPayload> = {}): NormalcyPayload {
  return {
    accountId: 1,
    timezone: "America/Chicago",
    eventType: "call_received",
    weekStart: "2024-03-04",
    locations: [
      {
        location: "Site A",
        current: 62,
        baselineMedian: 45,
        typicalRange: { low: 30, high: 60 },
        verdict: "above",
        deltaPct: 37.78,
        weeksOfHistory: 8,
      },
      {
        location: "Site B",
        current: 20,
        baselineMedian: 21,
        typicalRange: { low: 15, high: 27 },
        verdict: "typical",
        deltaPct: -4.76,
        weeksOfHistory: 8,
      },
    ],
    ...overrides,
  };
}

describe("LLM boundary (PLAN §8)", () => {
  test("a generated summary containing a numeral absent from the payload is rejected in favor of the templated fallback", async () => {
    const payload = makePayload({ accountId: 101, weekStart: "2024-03-11" });

    const summary = await getSummary(payload, {
      provider: {
        // 999% appears nowhere in the payload — an invented number the model made up.
        async generate() {
          return "Site A saw a shocking 999% jump in call_received volume this week.";
        },
      },
    });

    expect(summary).toBe(templateFallback(payload));
    expect(summary).not.toContain("999");
  });

  test("a provider that throws produces the templated fallback, not a rejected promise or an error", async () => {
    const payload = makePayload({ accountId: 102, weekStart: "2024-03-18" });

    const summary = await getSummary(payload, {
      provider: {
        async generate() {
          throw new Error("provider unavailable");
        },
      },
    });

    expect(summary).toBe(templateFallback(payload));
  });
});
