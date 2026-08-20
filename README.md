# DASH-247 — Relay's "is this normal for us?" dashboard

Take-home challenge. Full reasoning (interpretation, open questions, architecture, tests, LLM
boundary, time budget) lives in [PLAN.md](PLAN.md); this file is only how to run it and the
short version of the decisions.

## Run it locally (~5 minutes)

Prerequisites: Docker Desktop, Node 22+, and pnpm 11.22.0 (`corepack enable` will pick up the
version pinned in `package.json`).

```bash
# 1. clone, then from the repo root:
cp .env.example .env          # defaults work as-is for local dev

# 2. install deps (frozen lockfile — pnpm-workspace.yaml pins exact versions,
#    24h minimum release age, and blocks install scripts except esbuild's)
pnpm install --frozen-lockfile

# 3. start Postgres
docker compose up -d

# 4. create the schema, then load the seed data verbatim (no cleaning — see CLAUDE.md)
pnpm db:migrate
pnpm db:seed

# 5. run the API and the web app together
pnpm dev
```

Open **http://localhost:5173**. The API listens separately on `http://localhost:3000`; Vite's
dev server proxies `/api/*` to it (`web/vite.config.ts`), so the browser only ever talks to one
origin and there's no CORS configuration anywhere.

Pick an account, an event type, and a week from the controls — all three live in the URL, so
reload and share work for free.

### Tests

```bash
pnpm test
```

Runs the Vitest suite (`server/**/*.test.ts`) against the same seeded Postgres from step 3/4 —
domain math, aggregation queries, the API route, and the LLM boundary's numeral validator.

## Stack, and why

Vite + React + TypeScript (SPA) · Express · Postgres via `docker-compose` · `pg` +
`node-pg-migrate` · raw parameterized SQL · Vitest + supertest · pnpm.

Runtime dependencies are deliberately short: `express`, `pg`, `react`, `react-dom`. No ORM (the
one aggregation query that matters is raw SQL either way, and `date_trunc(... AT TIME ZONE ...)`
needs to be visible, not hidden behind a query builder). No Next.js (a one-page dashboard doesn't
need routing/SSR machinery). No Supabase (extra containers work against the 15-minute rule, and
a PostgREST pass-through is what the brief disallows). No zod/react-router/state
library/Tailwind — each replaced by 12–15 hand-rolled lines, which is less surface than the
dependency. Postgres over SQLite because week-bucketing needs `AT TIME ZONE` against IANA zone
names with DST handled correctly, in one expression, in the database. Full rationale:
[PLAN.md §6](PLAN.md#6-architecture).

## Assumptions (PLAN §2 — none of these blocked the build; all revisitable)

- **Normal is judged per-location**, not per-account — the higher-value read given Relay's
  multi-location product, and per-account is trivially derivable later.
- **"Recent" = the last *complete* week** (Mon–Sun, in the account's own IANA timezone).
- **A trustworthy baseline needs 8 complete prior weeks.** Below 4, the dashboard refuses to
  render a verdict rather than render a bad one — an explicit "not enough history" state.
- **A new location with no history is not an anomaly** — a missing baseline isn't a signal, so
  it also gets "not enough history," never a false "off-normal."
- **The three event types are independent series** (`call_received`, `lead_created`,
  `appointment_set`); the user switches between them, nothing is blended.

## Deliberately out of scope (PLAN §5 — and why)

- **Alerting/notifications, forecasting** — out per the ticket.
- **Auth** — out per the brief; account is a URL param, single trusted admin assumed.
- **Cross-account/industry benchmarks** — the data can't support that claim honestly.
- **Charts/sparklines** — the verdict is the product, not the chart. First thing added back if
  time remained (see below).
- **An "only show abnormal" toggle** — drafted, then cut: the table is already sorted by
  deviation, so the toggle would hide information without adding any.
- **Drill-down into individual events / outcome-rate analysis** (e.g. missed-call rate) —
  obvious v2, but a second aggregation surface for a second-order insight. Deferred.
- **Visual polish** — out per the brief.

## Where the LLM fits

One additive field: a Monday-morning narrative summary above the table. The model never computes
or decides anything numeric — it receives the already-aggregated ranked payload and returns
prose; every numeral in its output must appear in that payload or the response is rejected in
favor of the same deterministic template the fallback speaks. Timeout, error, or failed
validation all fall back the same way, and the page is fully correct with the field absent — it's
never on the critical path. What's built here is the boundary itself (prompt, schema, numeral
validator, deterministic fallback) behind a stubbed provider, swappable for a real client without
touching the boundary. Full reasoning, including the LLM spots that were rejected and why:
[PLAN.md §8](PLAN.md#8-where-would-an-llm-fit).

## What another day would buy

In the order it would be spent, per [PLAN.md §5](PLAN.md#5-scope) and
[§9](PLAN.md#9-time-budget-5h):

1. **A sparkline of the 8 baseline weeks per row** — the first cut deferral; gives visual context
   for the verdict at basically no cost to the table's readability.
2. **Outcome-rate analysis** (e.g. missed-call rate, not just volume) — a real second-order
   insight, deliberately deferred because it doubles the aggregation surface.
3. **Event drill-down** — from a row to the underlying events, for the "why" question the
   narrative summary explicitly declines to answer.
4. **A live LLM provider** behind the existing boundary, plus a real per-(account, week,
   eventType) cache — the boundary is designed to make this a swap, not a rebuild.
5. Per-account (not just per-location) rollups, since the per-location decision in PLAN §2 notes
   it's trivially derivable from the same aggregation.
