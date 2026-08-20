/**
 * The LLM boundary: provider interface, stub provider, numeral validator, deterministic fallback
 * (T-16a, PLAN §8).
 *
 * The trust boundary is visible in the signature: `getSummary` takes the already-aggregated T-11
 * response payload — never raw events, no Express, no database — and resolves to prose. It never
 * computes a delta and never decides a verdict; both already exist in the payload it is given.
 * If every provider disappeared, `getSummary` would still resolve to a correct sentence, built by
 * `templateFallback` from the same payload a model would have seen.
 *
 * Verification: every numeral in generated text must be traceable to the input payload (verbatim,
 * or a rounding/absolute-value variant of a payload number — prose says "12% fewer", not
 * "-11.962%") — see `containsOnlyKnownNumerals`. Anything else is rejected outright, not shown.
 *
 * Failure handling: a thrown error, a rejected promise, or a validation failure all fall back to
 * the same deterministic template. The summary is additive; nothing else on the page depends on
 * it (project-conventions.md → API contract: the summary field is optional, its absence normal).
 *
 * Caching: keyed on (account, week, eventType). A *complete* week's aggregation never changes, so
 * once populated the cache entry is permanently valid — at most one provider call per key.
 */
import { buildPrompt } from "./prompt.ts";

/** Mirrors the T-11 response shape (server/routes/normalcy.ts) — the only input this module sees. */
export interface LocationSummaryRow {
  location: string;
  current: number;
  baselineMedian: number | null;
  typicalRange: { low: number; high: number } | null;
  verdict: "above" | "below" | "typical" | "insufficient_history";
  deltaPct: number | null;
  weeksOfHistory: number;
}

/** The full T-11 response body — this module's only input. */
export interface NormalcyPayload {
  accountId: number;
  timezone: string;
  eventType: string;
  weekStart: string;
  locations: LocationSummaryRow[];
}

/** Minimal provider interface. Swap the stub for a real client without touching any caller. */
export interface SummaryProvider {
  generate(payload: NormalcyPayload, prompt: string): Promise<string>;
}

/**
 * Stub provider (PLAN §8: "build the boundary with a stubbed provider"). It has no model behind
 * it — it deterministically composes the same sentence `templateFallback` would, so the full
 * pipeline (provider → numeral validation → cache) is exercised honestly without an API key.
 * Swapping in a real client means replacing this one object; `getSummary` doesn't change.
 */
export const stubProvider: SummaryProvider = {
  async generate(payload: NormalcyPayload): Promise<string> {
    return templateFallback(payload);
  },
};

/**
 * Deterministic templated sentence over the same payload a provider would see (PLAN §8: "the
 * fallback... is the deterministic alternative competing on equal terms, not just error
 * handling"). Leads with the one or two locations that deviated most from their own baseline;
 * says so plainly when nothing did. insufficient_history locations carry no baseline and are
 * never mentioned numerically.
 */
export function templateFallback(payload: NormalcyPayload): string {
  const label = payload.eventType.replace(/_/g, " ");

  const deviating = payload.locations
    .filter(
      (location) =>
        location.verdict === "above" || location.verdict === "below",
    )
    .sort((a, b) => Math.abs(b.deltaPct ?? 0) - Math.abs(a.deltaPct ?? 0));

  if (deviating.length === 0) {
    return `All locations tracked typical ${label} volume for the week of ${payload.weekStart}.`;
  }

  const sentences = deviating.slice(0, 2).map((location) => {
    const direction = location.verdict === "above" ? "more" : "fewer";
    const pct = Math.round(Math.abs(location.deltaPct ?? 0));
    return (
      `${location.location} had ${pct}% ${direction} ${label} than usual ` +
      `(${location.current} vs a typical ${location.baselineMedian}).`
    );
  });

  return sentences.join(" ");
}

/**
 * Every numeral that could legitimately appear in a summary of `payload`: the raw payload
 * numbers, plus the rounded and absolute-value variants prose naturally uses ("38%" rather than
 * "37.962%"; "12% fewer" rather than "-11.962%"). insufficient_history locations contribute only
 * `current` and `weeksOfHistory` — they have no baseline or range to leak a number from.
 */
function allowedNumerals(payload: NormalcyPayload): number[] {
  const values: number[] = [payload.accountId];

  const [year, month, day] = payload.weekStart.split("-").map(Number);
  values.push(year, month, day);

  for (const location of payload.locations) {
    values.push(location.current, location.weeksOfHistory);
    if (location.baselineMedian !== null) {
      values.push(location.baselineMedian);
    }
    if (location.typicalRange !== null) {
      values.push(location.typicalRange.low, location.typicalRange.high);
    }
    if (location.deltaPct !== null) {
      values.push(location.deltaPct);
    }
  }

  const expanded = new Set<number>();
  for (const value of values) {
    if (Number.isNaN(value)) {
      continue;
    }
    expanded.add(value);
    expanded.add(Math.abs(value));
    expanded.add(Math.round(value));
    expanded.add(Math.round(Math.abs(value)));
  }

  return [...expanded];
}

/** Every bare numeral appearing in free text, as parsed numbers (sign is dropped — see above). */
function extractNumerals(text: string): number[] {
  const matches = text.match(/\d+(?:\.\d+)?/g) ?? [];
  return matches.map(Number);
}

/**
 * The numeral validator (PLAN §8): every numeral in `text` must be traceable to `payload`, within
 * floating-point tolerance, or the text is rejected outright — never shown partially corrected.
 */
export function containsOnlyKnownNumerals(
  text: string,
  payload: NormalcyPayload,
): boolean {
  const allowed = allowedNumerals(payload);
  const found = extractNumerals(text);
  return found.every((numeral) =>
    allowed.some((known) => Math.abs(known - numeral) < 0.05),
  );
}

/** Cache key: (account, week, eventType) — see module docblock for why this is permanently valid. */
function cacheKey(payload: NormalcyPayload): string {
  return `${payload.accountId}:${payload.weekStart}:${payload.eventType}`;
}

const summaryCache = new Map<string, string>();

export interface GetSummaryOptions {
  /** Defaults to `stubProvider`; tests inject one to exercise the invalid-output and error paths. */
  provider?: SummaryProvider;
}

/**
 * Resolve the Monday narrative summary for one (account, week, eventType). Never rejects and
 * never throws — a failing provider or an invalid summary both fall back to `templateFallback`,
 * because the summary is additive (project-conventions.md → API contract).
 */
export async function getSummary(
  payload: NormalcyPayload,
  options: GetSummaryOptions = {},
): Promise<string> {
  const key = cacheKey(payload);
  const cached = summaryCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  const provider = options.provider ?? stubProvider;
  const fallback = templateFallback(payload);

  let summary: string;
  try {
    const generated = await provider.generate(payload, buildPrompt(payload));
    summary = containsOnlyKnownNumerals(generated, payload)
      ? generated
      : fallback;
  } catch {
    summary = fallback;
  }

  summaryCache.set(key, summary);
  return summary;
}
