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
 *    timezone, not UTC (PLAN §6: `date_trunc('week', occurred_at AT TIME ZONE a.timezone)`).
 *    `timestamptz AT TIME ZONE zone` converts the stored UTC instant to a naive local
 *    wall-clock timestamp in that zone; date_trunc('week', ...) then extracts the
 *    Monday-Sunday week boundary from that local wall clock.
 *    [T-12 correction: an earlier version of this expression chained a spurious
 *    `AT TIME ZONE 'UTC'` before `AT TIME ZONE a.timezone`. That double conversion is a
 *    different (and wrong) operation — it reinterprets the UTC clock digits as if they
 *    were already local time and re-adds the offset, shifting some near-midnight events
 *    into the wrong week. Confirmed against seed event id 1871 (account 1,
 *    America/Chicago, occurred_at 2026-03-02 05:11:21+00, local wall clock 2026-03-01
 *    23:11:21 — Sunday night): the buggy form bucketed it into week 2026-03-02 (the next
 *    week); the corrected single-conversion form buckets it into week 2026-02-23, matching
 *    the local calendar. See server/routes/normalcy.test.ts "timezone bucketing" tests.]
 *    This ensures west-coast accounts don't have events bucketed into the wrong day,
 *    and DST transitions are handled correctly.
 *
 * 3. ZERO-FILL: A location with events in earlier weeks but none in the judged week must
 *    appear in the result with count = 0, not disappear. This is critical for anomaly
 *    detection — a silent location is exactly the signal we're looking for. We use
 *    generate_series to create all 9 candidate weeks (judged week + 8 prior complete weeks),
 *    CROSS JOIN with all distinct locations for this account, then LEFT JOIN the actual event
 *    counts. COALESCE converts NULL (no events) to 0.
 *
 *    Location scoping decision: "all distinct locations for this account" means any
 *    location that has ever had an event for this account, regardless of event type or
 *    time range. A location that has never had call_received events but has had
 *    appointment_scheduled will still appear (with zeros) when querying call_received.
 *    This ensures a location transitioning from one event type to another doesn't vanish.
 *
 * 4. FIRST-EVENT BOUND (T-19, superseding T-08's original "no more, no less" row-count
 *    clause per PLAN §2: "a new location shows *not enough history*, not a false baseline"):
 *    the unconditional 9-row generate_series above manufactures a full 8-week baseline even
 *    for a location that only just started existing, which makes `insufficient_history`
 *    unreachable and produces a fabricated band from mostly-phantom zero weeks. The
 *    `location_first_week` CTE computes each location's first-ever event week — MIN over
 *    ALL of that location's events for this account, not just events of the queried
 *    event_type — using the same single AT TIME ZONE conversion as the bucketing above, and
 *    the final WHERE clause discards any series week strictly earlier than that first week.
 *    Result: a location with 8+ weeks of prior existence still gets all 9 rows; a location
 *    younger than that gets correspondingly fewer, down to a floor of 1 (the judged week
 *    itself, if that's the location's first week).
 *
 *    Deliberate semantic decision: the cutoff is keyed on the location's first event of ANY
 *    event type, not the queried one. A location that's existed for 8+ weeks but never
 *    produced the queried event type gets real zero-fill rows (baseline 0, verdict
 *    `typical`), because that's data — a location that simply doesn't do that kind of event —
 *    not a missing-history case. `insufficient_history` is reserved for locations that are
 *    themselves new, not for a mature location trying a new event type. A per-event-type
 *    cutoff was considered and rejected: it would misreport "this location never does X" as
 *    "we don't know yet", which is a different and less honest claim.
 *
 * Parameters:
 *   $1: account_id (INTEGER) — the account whose events are being aggregated
 *   $2: event_type (VARCHAR) — the event type to filter for ('call_received', etc.)
 *   $3: judged_week (TIMESTAMPTZ) — the Monday start of the week being analyzed
 *
 * Returns: Up to 9 rows per location (judged week + up to 8 prior weeks) — exactly
 *          min(9, weeks since the location's first event), per T-19 — with deduplicated
 *          event counts. Locations with no events in a given (in-bounds) week show
 *          count = 0. PLAN §10 identifies this as "where the real bug is expected" — it's
 *          fiddly and wrong-by-default. The zero-fill is the load-bearing correctness
 *          feature; the first-event bound keeps it from overstating history.
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
  location_first_week AS (
    -- Each location's first-ever event week (T-19), across ALL event types for this
    -- account — not just $2 — per the any-event-type semantic decision above. Same
    -- single AT TIME ZONE conversion as bucketed_events, so the bound is computed the
    -- same way the weeks themselves are.
    SELECT
      ae.location,
      MIN(date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone)) AS first_week
    FROM activity_events ae
    JOIN accounts a ON ae.account_id = a.id
    WHERE ae.account_id = $1
    GROUP BY ae.location
  ),
  bucketed_events AS (
    -- Actual event counts per (location, week), with duplicate collapse.
    SELECT
      ae.location,
      date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone) AS week_start,
      COUNT(DISTINCT (ae.account_id, ae.location, ae.event_type, ae.occurred_at)) AS event_count
    FROM activity_events ae
    JOIN accounts a ON ae.account_id = a.id
    WHERE ae.account_id = $1
      AND ae.event_type = $2
    GROUP BY ae.location, week_start
  )
  -- CROSS JOIN creates every (location, week) combination, LEFT JOIN brings in counts.
  -- COALESCE turns NULL (no matching events) into 0. The WHERE clause then discards any
  -- series week before the location's own first-event week (T-19 first-event bound).
  SELECT
    al.location,
    ws.week_start,
    COALESCE(be.event_count, 0) AS event_count
  FROM account_locations al
  JOIN location_first_week lfw ON lfw.location = al.location
  CROSS JOIN week_series ws
  LEFT JOIN bucketed_events be
    ON al.location = be.location
    AND ws.week_start = be.week_start
  WHERE ws.week_start >= lfw.first_week
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
