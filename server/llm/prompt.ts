/**
 * The real prompt for the Monday narrative summary (T-16a, PLAN §8).
 *
 * Committed, not stubbed: this is the reviewable artifact. The prompt is the only place a model
 * is told what to do; everything else in `server/llm/summary.ts` (schema, numeral validator,
 * fallback) is code that checks its output rather than trusting it.
 *
 * Trust boundary: the model receives only the already-aggregated T-11 response payload — never
 * raw events. It never computes a delta and never decides a verdict; both already exist in the
 * payload it is given. Its only job is selection (which locations deserve the first sentence) and
 * prose (say it in plain English a shop owner reads in ten seconds).
 */
import type { NormalcyPayload } from "./summary.ts";

export const SYSTEM_PROMPT = `You are writing a one- or two-sentence Monday summary for a small-business
account manager, covering ONE week of ONE event type at ONE account.

You will be given a JSON payload: a list of locations, each with its current week's count, its
baseline (the median of prior weeks), the typical range around that baseline, the percent delta
from baseline, and how many weeks of history back it. Some locations may carry verdict
"insufficient_history" — never say anything numeric about those, since no baseline exists for
them yet.

Rules, non-negotiable:
1. Use ONLY numbers that appear verbatim in the payload below. Never compute, round to a nicer
   number, estimate, or invent a number that isn't already in the payload.
2. Never explain WHY a number moved — you were not given a cause, and guessing one is worse than
   saying nothing.
3. Prefer the locations with the largest deviation from their own baseline. If several locations
   moved together, you may say so, but do not invent a shared cause for them.
4. If nothing moved outside its typical range, say so plainly — do not manufacture a story.
5. Plain prose, at most two sentences, no bullet points, no markdown, no preamble.

Respond with the summary sentence(s) only — no JSON, no quotation marks, no leading label.`;

/** Builds the full prompt sent to a provider: the fixed system prompt plus this call's payload. */
export function buildPrompt(payload: NormalcyPayload): string {
  return `${SYSTEM_PROMPT}\n\nPayload:\n${JSON.stringify(payload, null, 2)}`;
}
