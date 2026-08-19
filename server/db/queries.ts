/**
 * Weekly bucketing query with duplicate collapse and zero-fill (T-08).
 *
 * This query aggregates activity events into weekly buckets for a specific account,
 * event type, and judged week, while handling three critical data-reality issues:
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
 * 3. ZERO-FILL: A location with events in earlier weeks but none in the judged week must
 *    appear in the result with count = 0, not disappear. This is critical for anomaly
 *    detection — a silent location is exactly the signal we're looking for. We use
 *    generate_series to create all 9 weeks (judged week + 8 prior complete weeks), CROSS
 *    JOIN with all distinct locations for this account, then LEFT JOIN the actual event
 *    counts. COALESCE converts NULL (no events) to 0.
 *
 *    Location scoping decision: "all distinct locations for this account" means any
 *    location that has ever had an event for this account, regardless of event type or
 *    time range. A location that has never had call_received events but has had
 *    appointment_scheduled will still appear (with zeros) when querying call_received.
 *    This ensures a location transitioning from one event type to another doesn't vanish.
 *
 * Parameters:
 *   $1: account_id (INTEGER) — the account whose events are being aggregated
 *   $2: event_type (VARCHAR) — the event type to filter for ('call_received', etc.)
 *   $3: judged_week (TIMESTAMPTZ) — the Monday start of the week being analyzed
 *
 * Returns: Exactly 9 rows per location (judged week + 8 prior weeks), with deduplicated
 *          event counts. Locations with no events in a given week show count = 0.
 *          PLAN §10 identifies this as "where the real bug is expected" — it's fiddly
 *          and wrong-by-default. The zero-fill is the load-bearing correctness feature.
 */
export const getWeeklyBucketedEventsWithZeroFill = `
  WITH week_series AS (
    -- Generate the 9-week series: judged week going back 8 weeks (judged + 8 prior = 9 total)
    SELECT generate_series(
      $3::timestamptz,
      $3::timestamptz - interval '8 weeks',
      '-1 week'::interval
    ) AS week_start
  ),
  account_locations AS (
    -- All distinct locations that have ever had any event for this account.
    -- Not scoped to event_type or time range — a location's existence is account-wide.
    SELECT DISTINCT location
    FROM activity_events
    WHERE account_id = $1
  ),
  bucketed_events AS (
    -- Actual event counts per (location, week), with duplicate collapse.
    SELECT
      ae.location,
      date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone) AS week_start,
      COUNT(DISTINCT (ae.account_id, ae.location, ae.event_type, ae.occurred_at)) AS event_count
    FROM activity_events ae
    JOIN accounts a ON ae.account_id = a.id
    WHERE ae.account_id = $1
      AND ae.event_type = $2
    GROUP BY ae.location, week_start
  )
  -- CROSS JOIN creates every (location, week) combination, LEFT JOIN brings in counts.
  -- COALESCE turns NULL (no matching events) into 0.
  SELECT
    al.location,
    ws.week_start,
    COALESCE(be.event_count, 0) AS event_count
  FROM account_locations al
  CROSS JOIN week_series ws
  LEFT JOIN bucketed_events be
    ON al.location = be.location
    AND ws.week_start = be.week_start
  ORDER BY al.location, ws.week_start DESC;
`;

/**
 * Account lookup by id (T-11).
 *
 * Used by the normalcy route for two things: detecting an unknown account (no row → 404) and
 * reading the account's IANA timezone to echo in the response — the same timezone T-08's query
 * already uses server-side for week bucketing, so this is read-only confirmation, not a second
 * source of truth for date math.
 *
 * Parameters:
 *   $1: account_id (INTEGER)
 *
 * Returns: zero or one row, { id, timezone }.
 */
export const getAccountById = `
  SELECT id, timezone
  FROM accounts
  WHERE id = $1;
`;
