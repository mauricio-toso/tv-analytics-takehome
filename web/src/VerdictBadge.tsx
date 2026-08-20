/**
 * VerdictBadge (T-15): renders one location's verdict word, plus the direction and size of its
 * deviation from baseline. Never invents a judgement where the domain layer (server/domain/
 * baseline.ts) didn't produce one — `insufficient_history` renders as an honest "not enough
 * history" state instead of a verdict word (principles §6: say so, don't hide the edge).
 */

export type Verdict = "above" | "below" | "typical" | "insufficient_history";

export type VerdictBadgeProps = {
  verdict: Verdict;
  deltaPct: number | null;
};

const VERDICT_LABEL: Record<
  Exclude<Verdict, "insufficient_history">,
  string
> = {
  above: "above",
  below: "below",
  typical: "typical",
};

export function VerdictBadge({ verdict, deltaPct }: VerdictBadgeProps) {
  if (verdict === "insufficient_history") {
    return (
      <span className="verdict verdict-insufficient-history">
        not enough history
      </span>
    );
  }

  // deltaPct is null only when the baseline median is 0 (percent change from zero is undefined —
  // baseline.ts deltaPct doc). The verdict word alone still carries the judgement in that case.
  const deviation =
    deltaPct === null
      ? ""
      : ` (${deltaPct > 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`;

  return (
    <span className={`verdict verdict-${verdict}`}>
      {VERDICT_LABEL[verdict]}
      {deviation}
    </span>
  );
}
