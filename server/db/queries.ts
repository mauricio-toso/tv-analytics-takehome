/**
 * Weekly bucketing query with duplicate collapse.
 *
 * This query aggregates activity events into weekly buckets for a specific account,
 * event type, and judged week, while handling the two critical data-reality issues:
 *
 * 1. DUPLICATE COLLAPSE: The seed data contains 12 exact duplicates on the natural key
 *    (account_id, location, event_type, occurred_at). We use DISTINCT on these four
 *    columns BEFORE counting to ensure each real event is counted exactly once, not
 *    once per id value.
 *
 * 2. LOCAL WEEK BUCKETING: Week boundaries must be computed in the account's local
 *    timezone, not UTC. The double AT TIME ZONE conversion handles this:
 *      - First AT TIME ZONE 'UTC': interprets the timestamptz as UTC (already stored that way)
 *      - Second AT TIME ZONE a.timezone: converts to the account's IANA timezone
 *      - date_trunc('week', ...): extracts Monday-Sunday week boundary in local time
 *    This ensures west-coast accounts don't have events bucketed into the wrong day,
 *    and DST transitions are handled correctly.
 *
 * Parameters:
 *   $1: account_id (INTEGER) — the account whose events are being aggregated
 *   $2: event_type (VARCHAR) — the event type to filter for ('call_received', etc.)
 *   $3: judged_week (TIMESTAMPTZ) — the Monday start of the week being analyzed
 *
 * Returns: One row per (location, week_start) with the deduplicated count of events.
 *          This is scoped to a single week for the specified account and event type.
 */
export const getWeeklyBucketedEvents = `
  SELECT
    ae.location,
    date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone) AS week_start,
    COUNT(DISTINCT (ae.account_id, ae.location, ae.event_type, ae.occurred_at)) AS event_count
  FROM activity_events ae
  JOIN accounts a ON ae.account_id = a.id
  WHERE ae.account_id = $1
    AND ae.event_type = $2
    AND date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone) = $3
  GROUP BY ae.location, week_start
  ORDER BY ae.location, week_start;
`;
