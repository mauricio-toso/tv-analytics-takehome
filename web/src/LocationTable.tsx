/**
 * LocationTable (T-15): renders every location for the current account/eventType/weekStart
 * judgement as one row each — last week's count, typical range, verdict, deviation.
 *
 * Row order is exactly the API response order (PLAN §5/§6, T-11/T-12/T-19): the endpoint already
 * sorts by deviation server-side, with insufficient_history rows grouped at the end. This
 * component maps `locations` as received — no `.sort()`, no `.filter()`, no re-grouping — so the
 * ranking the API decided is the ranking rendered top-down. Do not add client-side sorting here;
 * that would silently duplicate a decision the server already made (single source of truth).
 *
 * Honest states, not blank space (principles §6):
 *   - no locations at all (e.g. account 20, which has no activity_events rows) -> an explicit
 *     empty-state message, not an empty table;
 *   - a location under 4 complete prior weeks of history -> "not enough history" (VerdictBadge),
 *     never a fabricated verdict or a bare zero that could be mistaken for a judgement.
 *
 * No NULL-outcome note: this slice never reads `outcome` (counts are per event type only,
 * outcome-rate analysis is deferred — PLAN §5), so there is nothing to disclose here.
 */
import { VerdictBadge, type Verdict } from "./VerdictBadge.tsx";

export type LocationRow = {
  location: string;
  current: number;
  baselineMedian: number | null;
  typicalRange: { low: number; high: number } | null;
  verdict: Verdict;
  deltaPct: number | null;
  weeksOfHistory: number;
};

export type LocationTableProps = {
  locations: LocationRow[];
};

function formatTypicalRange(
  range: { low: number; high: number } | null,
): string {
  if (range === null) {
    return "not enough history";
  }
  return `${range.low.toFixed(1)}–${range.high.toFixed(1)}`;
}

export function LocationTable({ locations }: LocationTableProps) {
  if (locations.length === 0) {
    return (
      <p className="status status-empty">
        No locations with data for this account.
      </p>
    );
  }

  return (
    <div className="table-scroll">
      <table className="location-table">
        <thead>
          <tr>
            <th scope="col">Location</th>
            <th scope="col" className="num">
              Last week
            </th>
            <th scope="col" className="num">
              Typical range
            </th>
            <th scope="col">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {locations.map((row) => (
            <tr key={row.location}>
              <td>{row.location}</td>
              <td className="num">{row.current}</td>
              <td className="num">{formatTypicalRange(row.typicalRange)}</td>
              <td>
                <VerdictBadge verdict={row.verdict} deltaPct={row.deltaPct} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
