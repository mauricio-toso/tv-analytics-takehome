-- verification.sql
--
-- Re-derives every factual claim from PLAN.md §3 ("Data reality check")
-- to verify the seed data matches documented expectations.
--
-- Created by: T-06
-- Purpose: Stop trusting PLAN §3's numbers and start checking them.

-- ==============================================================================
-- Check 1: Total events, distinct accounts, date range
-- ==============================================================================
-- PLAN §3 claims: ~12.6k events, 20 accounts, 2026-02-01 → 2026-07-28
--
SELECT
  COUNT(*) AS total_events,
  COUNT(DISTINCT account_id) AS distinct_accounts,
  MIN(occurred_at) AS earliest_event,
  MAX(occurred_at) AS latest_event
FROM activity_events;

-- Expected: total_events ~12600, distinct_accounts = 20,
--           earliest ~2026-02-01, latest ~2026-07-28
--
-- ACTUAL RESULT (2026-08-19):
--  total_events | distinct_accounts |     earliest_event     |      latest_event
-- --------------+-------------------+------------------------+------------------------
--         12626 |                19 | 2026-02-01 10:57:44+00 | 2026-07-27 22:20:34+00
-- (1 row)
--
-- VERIFICATION:
--   - total_events: 12626 (matches "~12.6k")
--   - distinct_accounts: 19 (CONTRADICTS PLAN §3 claim of 20 accounts)
--   - earliest_event: 2026-02-01 (matches)
--   - latest_event: 2026-07-27 (close to claimed 2026-07-28, within one day)
--
-- DISCREPANCY: PLAN §3 claims 20 accounts, actual = 19.
--              This is correct: account 20 exists in accounts table but has zero events,
--              so COUNT(DISTINCT account_id) from activity_events returns 19.


-- ==============================================================================
-- Check 2: Exact duplicate rows on natural key
-- ==============================================================================
-- PLAN §3 claims: 12 exact duplicate rows with different id values.
-- Natural key: (account_id, location, event_type, occurred_at)
--
SELECT COUNT(*) AS duplicate_count
FROM (
  SELECT account_id, location, event_type, occurred_at, COUNT(*) AS occurrences
  FROM activity_events
  GROUP BY account_id, location, event_type, occurred_at
  HAVING COUNT(*) > 1
) duplicates;

-- Expected: duplicate_count = 12
--
-- ACTUAL RESULT (2026-08-19):
--  duplicate_count
-- -----------------
--               12
-- (1 row)
--
-- VERIFICATION: MATCHES PLAN §3 (exactly 12 duplicate natural keys)


-- ==============================================================================
-- Check 3: NULL rates for duration_seconds and outcome
-- ==============================================================================
-- PLAN §3 claims: duration_seconds NULL ~4%, outcome NULL ~3%
--
SELECT
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE duration_seconds IS NULL) AS duration_nulls,
  COUNT(*) FILTER (WHERE outcome IS NULL) AS outcome_nulls,
  ROUND(100.0 * COUNT(*) FILTER (WHERE duration_seconds IS NULL) / COUNT(*), 2) AS duration_null_pct,
  ROUND(100.0 * COUNT(*) FILTER (WHERE outcome IS NULL) / COUNT(*), 2) AS outcome_null_pct
FROM activity_events;

-- Expected: duration_null_pct ~4%, outcome_null_pct ~3%
--
-- ACTUAL RESULT (2026-08-19):
--  total_events | duration_nulls | outcome_nulls | duration_null_pct | outcome_null_pct
-- --------------+----------------+---------------+-------------------+------------------
--         12626 |           5159 |           398 |             40.86 |             3.15
-- (1 row)
--
-- VERIFICATION:
--   - outcome_null_pct: 3.15% (matches "~3%")
--   - duration_null_pct: 40.86% (CONTRADICTS PLAN §3 claim of "~4%")
--
-- DISCREPANCY: PLAN §3 claims duration_seconds NULL ~4%, actual = 40.86%.
--              This is a major discrepancy: duration_seconds is NULL in ~41% of events,
--              not ~4% as documented.


-- ==============================================================================
-- Check 4: Accounts with zero events
-- ==============================================================================
-- PLAN §3 claims: Account 20 ("Quiet Harbor Spa") has zero events.
--
SELECT
  a.id AS account_id,
  a.name AS account_name,
  COUNT(e.id) AS event_count
FROM accounts a
LEFT JOIN activity_events e ON a.id = e.account_id
GROUP BY a.id, a.name
HAVING COUNT(e.id) = 0
ORDER BY a.id;

-- Expected: One row: account_id = 20, account_name = 'Quiet Harbor Spa', event_count = 0
--
-- ACTUAL RESULT (2026-08-19):
--  account_id |   account_name   | event_count
-- ------------+------------------+-------------
--          20 | Quiet Harbor Spa |           0
-- (1 row)
--
-- VERIFICATION: MATCHES PLAN §3


-- ==============================================================================
-- Check 5: Account 6 single-day burst
-- ==============================================================================
-- PLAN §3 claims: Account 6 has an 800-event burst on 2026-06-03
--
SELECT
  DATE(occurred_at) AS event_date,
  COUNT(*) AS event_count
FROM activity_events
WHERE account_id = 6
GROUP BY DATE(occurred_at)
ORDER BY event_count DESC
LIMIT 1;

-- Expected: event_date = 2026-06-03, event_count ~800
--
-- ACTUAL RESULT (2026-08-19):
--  event_date | event_count
-- ------------+-------------
--  2026-06-03 |         805
-- (1 row)
--
-- VERIFICATION: MATCHES PLAN §3 (date = 2026-06-03, count = 805, close to "~800")
