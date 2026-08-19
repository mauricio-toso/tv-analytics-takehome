-- Migration 0001: Initial schema + index
-- Ported from migrations/schema.reference.sql
--
-- Type adaptations for Postgres:
--   TIMESTAMP → timestamptz (with timezone)
--     Rationale: Although the reference schema uses TIMESTAMP and documents that
--     "all occurred_at values are stored in UTC", Postgres's timestamptz is the
--     correct semantic choice here. timestamptz stores values internally as UTC
--     (exactly matching our data) and handles timezone conversions on input/output.
--     This preserves the UTC storage guarantee while enabling timezone-aware queries
--     for weekly aggregation in account timezones (per PLAN §4 requirements).
--     The seed data's naive UTC timestamps will be interpreted as UTC on load.
--
--   INTEGER for id columns (not SERIAL)
--     Rationale: seed/seed.sql explicitly provides id values in INSERT statements.
--     Using SERIAL would create a sequence that conflicts with manual id assignment.
--     The seed loads verbatim (T-05), so we preserve INTEGER PKs.
--
-- Index: (account_id, occurred_at) on activity_events
--     Required by PLAN §6 for efficient weekly aggregation queries.

-- UP migration
CREATE TABLE accounts (
    id          INTEGER         NOT NULL PRIMARY KEY,
    name        VARCHAR(120)    NOT NULL,
    industry    VARCHAR(60)     NOT NULL,
    timezone    VARCHAR(60)     NOT NULL,  -- IANA timezone, e.g. 'America/Chicago'
    created_at  TIMESTAMPTZ     NOT NULL   -- stored as UTC
);

CREATE TABLE activity_events (
    id                INTEGER         NOT NULL PRIMARY KEY,
    account_id        INTEGER         NOT NULL REFERENCES accounts(id),
    location          VARCHAR(80)     NOT NULL,  -- account's site/branch
    event_type        VARCHAR(40)     NOT NULL,  -- 'call_received' | 'lead_created' | 'appointment_set'
    occurred_at       TIMESTAMPTZ     NOT NULL,  -- stored as UTC
    duration_seconds  INTEGER         NULL,      -- only for calls; may be NULL
    outcome           VARCHAR(40)     NULL       -- e.g. 'connected' | 'missed' | 'voicemail' | 'converted' | 'no_show'
);

-- Index for efficient account-scoped time-range queries (weekly aggregation)
CREATE INDEX idx_activity_events_account_time
    ON activity_events (account_id, occurred_at);
