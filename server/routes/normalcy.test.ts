/**
 * Integration tests for GET /api/accounts/:id/normalcy (T-12, PLAN §7).
 *
 * These hit the real Express app (server/app.ts) with supertest, against the real
 * seeded Postgres (docker compose up -d && pnpm db:migrate && pnpm db:seed must have
 * already run — server/test-setup.ts loads .env so the pool points at the right host
 * port, but does not start Postgres itself). Never mock the database: the seed's
 * messiness (duplicates, the account-6 burst, empty account 20) is the test material
 * (.claude/rules/tests.md).
 *
 * Each test falsifies one of the five known risks from PLAN §7 / TASKS T-12, plus one
 * hand-verified number and the ranking guarantee T-11/T-15 depend on.
 */
import { describe, expect, test } from "vitest";
import request from "supertest";
import { app } from "../app.ts";

function findLocation(
  locations: Array<{ location: string; [key: string]: unknown }>,
  location: string,
) {
  const row = locations.find((entry) => entry.location === location);
  if (!row) {
    throw new Error(`expected response to include location ${location}`);
  }
  return row;
}

describe("GET /api/accounts/:id/normalcy — integration (PLAN §7 / T-12)", () => {
  test("a week containing a known duplicate row counts the underlying event once, not per duplicate row", async () => {
    // Hand-verified in the seed (docs/verification.sql style, T-06):
    //   SELECT count(*) AS raw_row_count,
    //          count(DISTINCT (account_id, location, event_type, occurred_at)) AS deduped_event_count
    //   FROM activity_events
    //   WHERE account_id = 1 AND location = 'Site C' AND event_type = 'call_received'
    //     AND date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-07-06';
    //   -->  raw_row_count = 3, deduped_event_count = 2
    // The 3rd raw row is the known seed duplicate at account_id=1, location='Site C',
    // event_type='call_received', occurred_at='2026-07-07 20:26:04+00' (exact duplicate on
    // the natural key, confirmed present twice in activity_events).
    const res = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "call_received", weekStart: "2026-07-06" });

    expect(res.status).toBe(200);
    const siteC = findLocation(res.body.locations, "Site C");
    expect(siteC.current).toBe(2);
  });

  test("an event just before local midnight Sunday buckets into the week that ends that Sunday, in the account's own timezone — not the UTC calendar week", async () => {
    // Seed event id 1871: account 1 (America/Chicago), location Site A, event_type
    // lead_created, occurred_at = 2026-03-02 05:11:21+00.
    //   SELECT occurred_at AT TIME ZONE 'America/Chicago' FROM activity_events WHERE id = 1871;
    //   --> 2026-03-01 23:11:21  (Sunday night, 49 minutes before local midnight)
    // So the event's own local week is the one starting Monday 2026-02-23, NOT the UTC
    // calendar week starting 2026-03-02 that its raw UTC timestamp would naively suggest.
    //   SELECT date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago')
    //   FROM activity_events WHERE id = 1871;
    //   --> 2026-02-23
    const correctWeek = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "lead_created", weekStart: "2026-02-23" });
    expect(correctWeek.status).toBe(200);
    expect(findLocation(correctWeek.body.locations, "Site A").current).toBe(2);

    const naiveUtcWeek = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "lead_created", weekStart: "2026-03-02" });
    expect(naiveUtcWeek.status).toBe(200);
    expect(findLocation(naiveUtcWeek.body.locations, "Site A").current).toBe(0);
  });

  test("the same kind of near-midnight event lands in the UTC calendar week for a UTC account, since local time and UTC coincide", async () => {
    // Seed event id 10602: account 18 (accounts.timezone = 'UTC' — the one non-IANA-offset
    // account in the seed), location Site E, event_type lead_created,
    // occurred_at = 2026-06-28 23:07:38+00 (Sunday night, UTC).
    //   SELECT date_trunc('week', occurred_at) FROM activity_events WHERE id = 10602;
    //   --> 2026-06-22  (the week the raw UTC timestamp already sits in — no shift needed,
    //       because account 18's local timezone IS UTC)
    // Contrast with the Chicago case above: identical "just before local midnight Sunday"
    // shape, but here there is no non-UTC offset to apply, so the UTC-naive week and the
    // account's local week are the same week. This is what the T-08 query comment (PLAN §6)
    // means by "west-coast [or any non-UTC] accounts don't have events bucketed into the
    // wrong day" — a UTC account is the control case where there's nothing to get wrong.
    const res = await request(app)
      .get("/api/accounts/18/normalcy")
      .query({ eventType: "lead_created", weekStart: "2026-06-22" });

    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe("UTC");
    expect(findLocation(res.body.locations, "Site E").current).toBe(2);
  });

  test("a location with zero events in the judged week appears with current: 0 and a real (non-insufficient_history) verdict, not absent from the response", async () => {
    // account 1, location Site B, event_type appointment_set, judged week 2026-07-06 has
    // zero matching events (confirmed against the seed):
    //   SELECT count(*) FROM activity_events
    //   WHERE account_id = 1 AND location = 'Site B' AND event_type = 'appointment_set'
    //     AND date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-07-06';
    //   --> 0
    // Site B has appointment_set activity in other weeks (e.g. 2026-06-29), so it is a real,
    // ongoing location that simply had a quiet week — exactly the "silent location" signal
    // PLAN §6/T-08 says zero-fill exists to surface, not hide.
    const res = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "appointment_set", weekStart: "2026-07-06" });

    expect(res.status).toBe(200);
    const siteB = findLocation(res.body.locations, "Site B");
    expect(siteB.current).toBe(0);
    expect(siteB.verdict).not.toBe("insufficient_history");
    expect(siteB.typicalRange).not.toBeNull();
  });

  test("account 20 (no activity_events rows at all) returns a well-formed 200 with an explicit empty locations list, not a 500", async () => {
    // SELECT count(*) FROM activity_events WHERE account_id = 20;  --> 0
    const res = await request(app)
      .get("/api/accounts/20/normalcy")
      .query({ eventType: "call_received", weekStart: "2026-04-06" });

    expect(res.status).toBe(200);
    expect(res.body.locations).toEqual([]);
  });

  test("hand-verified number: account 1 / Site C / call_received / week 2026-05-25 has exactly 8 events", () => {
    // Chosen deliberately clean of the known duplicate (which falls in the 2026-07-06 week,
    // covered by the duplicate-collapse test above) so this pins the endpoint's arithmetic
    // in isolation, not the dedup behavior:
    //   SELECT count(*) AS raw_row_count,
    //          count(DISTINCT (account_id, location, event_type, occurred_at)) AS deduped_event_count
    //   FROM activity_events
    //   WHERE account_id = 1 AND location = 'Site C' AND event_type = 'call_received'
    //     AND date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-05-25';
    //   -->  raw_row_count = 8, deduped_event_count = 8  (no duplicates in this week)
    return request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "call_received", weekStart: "2026-05-25" })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(findLocation(res.body.locations, "Site C").current).toBe(8);
      });
  });

  test("locations rank most-deviant-first by |deltaPct|, with the single independently-identified most-deviant location pinned in position 0, and each above/below verdict's deltaPct sign agreeing with the verdict", async () => {
    // Account 1 / call_received / judged week 2026-04-06 chosen for a property, not a number:
    // its 6 locations' deviation order differs both from alphabetical location order
    // (Site A..Site F) and from the order rows arrive in (T-08's query has an explicit
    // `ORDER BY location, week_start DESC`, so with no ranking sort applied the response
    // would also come back alphabetical) — so this account/week can only pass under a real
    // sort, not an unsorted or accidentally-alphabetical response.
    //
    // Independent SQL verification (percentile_cont, not the app's own median()/judgeWeek(),
    // so this doesn't just re-run the code under test) of which location is most deviant:
    //   WITH week_series AS (
    //     SELECT generate_series(TIMESTAMPTZ '2026-04-06', TIMESTAMPTZ '2026-04-06' - interval '8 weeks', '-1 week'::interval) AS week_start
    //   ),
    //   account_locations AS (SELECT DISTINCT location FROM activity_events WHERE account_id = 1),
    //   bucketed_events AS (
    //     SELECT ae.location, date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone) AS week_start,
    //       COUNT(DISTINCT (ae.account_id, ae.location, ae.event_type, ae.occurred_at)) AS event_count
    //     FROM activity_events ae JOIN accounts a ON ae.account_id = a.id
    //     WHERE ae.account_id = 1 AND ae.event_type = 'call_received'
    //     GROUP BY ae.location, week_start
    //   ),
    //   filled AS (
    //     SELECT al.location, ws.week_start, COALESCE(be.event_count,0) AS event_count
    //     FROM account_locations al CROSS JOIN week_series ws
    //     LEFT JOIN bucketed_events be ON al.location=be.location AND ws.week_start=be.week_start
    //   ),
    //   current_week AS (SELECT location, event_count AS current FROM filled WHERE week_start = '2026-04-06'),
    //   prior_median AS (
    //     SELECT location, percentile_cont(0.5) WITHIN GROUP (ORDER BY event_count) AS baseline_median
    //     FROM filled WHERE week_start < '2026-04-06' GROUP BY location
    //   )
    //   SELECT c.location, c.current, p.baseline_median,
    //     round(((c.current - p.baseline_median) / p.baseline_median * 100)::numeric, 2) AS delta_pct
    //   FROM current_week c JOIN prior_median p ON c.location = p.location
    //   ORDER BY abs((c.current - p.baseline_median) / p.baseline_median) DESC;
    //
    //   location | current | baseline_median | delta_pct
    //   Site F   |       7 |             3.5 |    100.00   <- most deviant, pinned below
    //   Site E   |       9 |               5 |     80.00
    //   Site C   |       2 |             6.5 |   -69.23
    //   Site B   |       4 |               6 |   -33.33
    //   Site D   |       5 |               4 |     25.00
    //   Site A   |       4 |             4.5 |   -11.11
    //
    // Deviation measure the endpoint ranks on (server/routes/normalcy.ts, deviationScore
    // comment): abs(deltaPct) when the baseline median is nonzero, which it is for every
    // location in this fixture — so the response's own deltaPct is directly the ranking key.
    const res = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "call_received", weekStart: "2026-04-06" });

    expect(res.status).toBe(200);
    const { locations } = res.body;
    expect(locations).toHaveLength(6);

    // 2. First row pinned to the independently-identified most-deviant location.
    expect(locations[0].location).toBe("Site F");

    // 1. Non-increasing in |deltaPct| across the whole ranked list, and (same walk, per
    // T-12) each row's deltaPct sign agrees with its verdict: above -> positive,
    // below -> negative.
    let previousAbsDeltaPct = Infinity;
    for (const row of locations) {
      expect(row.deltaPct).not.toBeNull();
      const absDeltaPct = Math.abs(row.deltaPct);
      expect(absDeltaPct).toBeLessThanOrEqual(previousAbsDeltaPct);
      previousAbsDeltaPct = absDeltaPct;

      if (row.verdict === "above") {
        expect(row.deltaPct).toBeGreaterThan(0);
      } else if (row.verdict === "below") {
        expect(row.deltaPct).toBeLessThan(0);
      }
    }

    expect(locations.map((row: { location: string }) => row.location)).toEqual([
      "Site F",
      "Site E",
      "Site C",
      "Site B",
      "Site D",
      "Site A",
    ]);

  });

  test("insufficient_history rows are grouped at the end, not interleaved among ranked rows", async () => {
    // T-19 bounded the zero-fill window by each location's first-ever event, so
    // weeksOfHistory now varies per location instead of always being 8 (server/db/queries.ts,
    // location_first_week CTE). That makes a genuine mix of ranked and insufficient_history
    // rows reachable — chosen here for the property (a mix exists), not by number:
    //
    //   WITH location_first_week AS (
    //     SELECT ae.location, MIN(date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone)) AS first_week
    //     FROM activity_events ae JOIN accounts a ON ae.account_id = a.id
    //     WHERE ae.account_id = 1 GROUP BY ae.location
    //   ),
    //   prior_weeks AS (
    //     SELECT generate_series(TIMESTAMPTZ '2026-02-23' - interval '1 week',
    //       TIMESTAMPTZ '2026-02-23' - interval '8 weeks', '-1 week'::interval) AS week_start
    //   )
    //   SELECT lfw.location, lfw.first_week,
    //     count(*) FILTER (WHERE pw.week_start >= lfw.first_week) AS weeks_of_history
    //   FROM location_first_week lfw CROSS JOIN prior_weeks pw
    //   GROUP BY lfw.location, lfw.first_week ORDER BY lfw.location;
    //
    //   location | first_week | weeks_of_history
    //   Site A   | 2026-01-26 |  4   <- >= MIN_WEEKS_OF_HISTORY (4): gets a band
    //   Site B   | 2026-02-02 |  3   <- insufficient_history
    //   Site C   | 2026-02-02 |  3   <- insufficient_history
    //   Site D   | 2026-02-02 |  3   <- insufficient_history
    //   Site E   | 2026-02-02 |  3   <- insufficient_history
    //   Site F   | 2026-01-26 |  4   <- >= MIN_WEEKS_OF_HISTORY (4): gets a band
    //
    // Independent (percentile_cont, not the app's own median()) deviation check for the two
    // ranked locations, account 1 / call_received / judged week 2026-02-23:
    //   location | current | baseline_median | delta_pct
    //   Site F   |       4 |             3.5 |     14.29   <- more deviant, ranked first
    //   Site A   |       4 |             4.5 |    -11.11
    //
    // The route's sort (server/routes/normalcy.ts) places ranked rows first and
    // insufficient_history rows last, grouped, ordered alphabetically among themselves — so
    // the decision under test is "last", not "first": if that placement flipped, or rows were
    // interleaved by original location order, this assertion would fail.
    const res = await request(app)
      .get("/api/accounts/1/normalcy")
      .query({ eventType: "call_received", weekStart: "2026-02-23" });

    expect(res.status).toBe(200);
    const { locations } = res.body;
    expect(locations).toHaveLength(6);

    const verdicts = locations.map((row: { verdict: string }) => row.verdict);
    expect(verdicts).toEqual([
      "typical",
      "typical",
      "insufficient_history",
      "insufficient_history",
      "insufficient_history",
      "insufficient_history",
    ]);
    expect(locations.map((row: { location: string }) => row.location)).toEqual([
      "Site F",
      "Site A",
      "Site B",
      "Site C",
      "Site D",
      "Site E",
    ]);

    // The insufficient_history rows carry no band and no deviation measure at all.
    for (const row of locations.slice(2)) {
      expect(row.baselineMedian).toBeNull();
      expect(row.typicalRange).toBeNull();
      expect(row.deltaPct).toBeNull();
    }
  });
});
