# PLAN.md — DASH-247

Written before implementation. Left as-written on purpose; not retrofitted to match the final code.
Anything I got wrong here and corrected later is noted in the AI log, not edited out of this file.

Normative base: [resources/engineering-principles.md](resources/engineering-principles.md) and
[resources/project-conventions.md](resources/project-conventions.md). Honest chronology note: the
principles were made explicit *during* review of this plan's first draft (they drove the cuts —
Next.js → plain React, ORM → raw SQL, dropping a redundant toggle) and were then formalized as
reusable agent-context artifacts. The plan below is the post-review version; the evolution is in
the AI log.

---

## 1. What I think the ticket is actually asking

The literal ask: "help a customer answer *is this normal for us?* at a glance."

Two things in that sentence do most of the work:

- **"for us"** — the baseline is the customer's own history, not a cross-customer benchmark. That kills any
  idea of industry percentiles, and it's also the honest read: with 20 accounts across mixed industries there
  is no credible peer cohort in this data.
- **"at a glance"** — the answer has to be a *verdict*, not a chart the user has to interpret. If the customer
  still has to eyeball a line graph and decide for themselves, I haven't solved the ticket.

The second product note — "multi-location customers matter" / "struggle to spot which location needs
attention" — tells me the primary unit of analysis is **the location, not the account**. An account-level
number averages away exactly the signal support says customers are missing. So: per-location verdicts, ranked.

And "a customer admin should be able to look at this Monday morning and act on it" is a strong hint about the
window: **the last complete week**, in the customer's own timezone. Monday morning means last week just closed.
It also means partial weeks must be excluded — a customer looking on Monday at a 1-day-old current week would
see everything as "down 85%", which is noise, not signal.

## 2. Open questions (and what I'm assuming instead of blocking)

I'd normally ask these; documenting the assumption and moving.

| Question | Assumption I'm proceeding on |
| --- | --- |
| Is "normal" per-location or per-account? | Per-location. Product's own note about multi-location makes this the higher-value read, and per-account is trivially derivable later. |
| What window counts as "recent"? | Last **complete** week, Mon–Sun, in the account's local timezone. |
| How much history makes a trustworthy baseline? | 8 complete prior weeks. Below 4, I refuse to render a verdict rather than render a bad one. |
| Should a new location with no history show as an anomaly? | No — it shows as "not enough history". A missing baseline is not a signal. |
| Do all three event types matter equally? | Treating them as separate series. `call_received` is the default view; the user can switch. |

## 3. Data reality check — done before designing anything

Queried the seed before writing the aggregation, because the shape of the messiness decides the algorithm.
What's actually in there:

- **~12.6k events, 20 accounts, 2026-02-01 → 2026-07-28.** So ~25 complete weeks. That's enough for an 8-week
  trailing baseline with room to spare — good, the window choice is affordable.
- **12 exact duplicate rows with fresh `id`s.** Same account/location/type/timestamp. These have to be
  collapsed or every count is quietly wrong. Dedupe on the natural key, not on `id`.
- **`duration_seconds` NULL ~4%, `outcome` NULL ~3%.** Anything I build on `outcome` has to decide what NULL
  means. My call: NULL outcome is excluded from rate denominators, and I say so in the UI rather than silently
  folding it into "not missed".
- **Account 20 ("Quiet Harbor Spa") has zero events.** Not a bug in my query — a real customer with no data.
  Needs a genuine empty state, not a crash and not a page of zeros presented as a verdict.
- **Account 6 has an 800-event burst on a single day (2026-06-03).** This is the load-bearing detail. A mean
  baseline is destroyed by this — every subsequent week reads as "way below normal" against an inflated mean.
  A **median** baseline shrugs it off.
- **`occurred_at` is UTC; each account has an IANA `timezone`.** Week boundaries must be computed in local
  time or the buckets are wrong by up to a day for the west-coast accounts, and DST transitions make naive
  offset arithmetic wrong twice a year.

The burst and the timezone column are the two things in this dataset that look like deliberate tests. Designing
around them, not patching over them.

## 4. The decision: what "normal" means here

For each `(account, location, event_type)`:

- Bucket events into **local weeks** (Mon–Sun, account timezone).
- Baseline = the **median** of the 8 most recent *complete* weeks, excluding the week being judged.
- Spread = **MAD** (median absolute deviation), scaled by 1.4826 so it's comparable to a standard deviation
  on normal-ish data.
- "Typical range" = `median ± 2 × scaledMAD`, floored at 0.
- Verdict: the current week's count is `above` / `below` / `typical` relative to that band.
- If fewer than 4 complete prior weeks exist, or MAD is 0 with too little history, verdict is
  `insufficient_history` and no band is shown.

**Why median/MAD and not mean/stddev:** robustness, and I can point at the data to justify it. Account 6's
800-event day would move a mean weekly baseline by an order of magnitude and poison ~8 weeks of verdicts.
The median moves by roughly nothing. This is the single highest-leverage correctness decision in the slice,
and I want a test that pins it: *the same computation over account 6 must produce sane verdicts.*

**Why not a z-score shown to the user:** "2.3 sigma" is not an at-a-glance answer for a shop owner. The user
sees a verdict word, the actual number, and the typical range. The statistic stays server-side.

**Why zero-count weeks count:** a location that recorded 0 calls last week is exactly the location that needs
attention. Weeks with no rows must be materialized as 0, not skipped — otherwise a dead location silently
vanishes from the ranking. This is an easy bug to write and I expect to have to check for it specifically.

## 5. Scope

**In:**

- One page: pick account (stand-in for the logged-in admin), see every location judged against its own baseline,
  sorted by how far outside normal it sits.
- Per-location row: last week's count, typical range, verdict, direction and size of the deviation.
- Controls: account, event type, and week being judged. Three user inputs — the reload-survival requirement
  is covered three times over, so no further controls.
- All control state lives in the URL, so reload and share both work for free.
- An explicit empty state for accounts with no data, and an explicit "not enough history" state per location.

**Deliberately out** (and why):

- Alerting/notifications and forecasting — out per the ticket.
- Auth — out per the brief; account is a URL param, single trusted admin assumed.
- Any cross-account/industry benchmark — the data can't support it honestly.
- Charts/sparklines — nice, but the verdict is the product. If time remains after tests, a sparkline of the
  8 baseline weeks is the first thing I'd add back.
- An "only show abnormal locations" toggle — I drafted it, then cut it: the table is already sorted by
  deviation, so the toggle hides information without adding any. It was my own gold-plating.
- Drill-down into individual events, outcome-rate analysis (missed-call rate etc.). Tempting, and it's the
  obvious v2, but it doubles the aggregation surface for a second-order insight. Deferring.
- Visual polish — out per the brief.

## 6. Architecture

**Stack:** Vite + React + TypeScript (SPA) · Express (API) · Postgres in docker-compose ·
`pg` + `node-pg-migrate` · raw SQL · Vitest + supertest · pnpm.

Guiding policy for every choice below: keep it minimal and functional. Nothing enters the stack without a
published requirement (or a data reality) that demands it. Runtime dependencies: `express`, `pg`, `react`,
`react-dom`. That's the list.

**Considered and rejected:**

- **Next.js** — collapses front+back into one process, but App Router/RSC/hydration is machinery a one-page
  dashboard doesn't need, and it puts a meta-framework between the evaluator and the code. Two plain processes
  (`concurrently`, Vite dev proxy for `/api` — so no CORS config) are cheaper to understand than one clever one.
- **Supabase** — it's Postgres underneath, but local setup drags ~10 containers + a CLI (hurts the 15-minute
  rule), and its idiom — PostgREST pass-through from the client — is literally what the brief disallows
  ("not pass-through queries"). Everything else it adds (auth, storage, realtime) is out of scope here.
- **Any ORM (Drizzle/Prisma)** — the schema is 2 tables that already exist in `schema.sql`, and the one
  interesting query needs `date_trunc AT TIME ZONE` + `generate_series` + LEFT JOIN, which I'd write as raw
  SQL through any ORM anyway. The ORM would be decoration. Row types are ~15 lines of hand-written TS.
- **zod, react-router, state/UI libraries, Tailwind** — three query params validated by hand (~12 lines), URL
  state via native `URLSearchParams` + `history.replaceState` (~15-line hook), native `<select>`/`<table>`
  elements plus one plain `styles.css`. The brief says unstyled-but-clear beats pretty-but-broken; taking it
  at its word.

**Why Postgres and not SQLite:** `date_trunc('week', occurred_at AT TIME ZONE a.timezone)` handles IANA zones
and DST correctly in one expression. SQLite would push that into application code, which is where timezone bugs
go to live. Worth the ten minutes of docker.

**Layout:**

```text
docker-compose.yml            # Postgres only
server/
  db/queries.ts               # the aggregation, raw SQL, commented — the reviewable artifact
  domain/baseline.ts          # median/MAD/verdict — pure TS, no I/O
  llm/summary.ts              # interface + stub provider + numeric validator + templated fallback
  llm/prompt.ts               # the real prompt, committed
  routes/normalcy.ts          # GET /api/accounts/:id/normalcy
web/
  src/App.tsx                 # table + native controls; small own components (VerdictBadge, LocationTable)
migrations/                   # node-pg-migrate; 0001 = seed schema.sql adapted to PG + index
seed/seed.sql                 # dataset verbatim, untouched
tests/
```

**Where the computation lives:** weekly bucketing, dedupe of the duplicate rows, and zero-fill happen in SQL
(set-based work the database is good at). The median/MAD/verdict step is a pure TypeScript function over an
array of weekly counts — the part I most want to unit-test in isolation, reviewable without a database.
Single source of truth rule: SQL decides week boundaries; TS never recomputes dates. The UI's source of truth
is the URL; nothing is stored twice.

**Endpoint:** `GET /api/accounts/:id/normalcy?eventType=&weekStart=`

Returns account timezone, the week judged, and per location: `current`, `baselineMedian`, `typicalRange`,
`verdict`, `deltaPct`, `weeksOfHistory`. Real aggregation, not pass-through.

**Migrations:** the seed's `schema.sql` becomes migration 0001 (adapted to Postgres types), plus an index on
`(account_id, occurred_at)`. `seed.sql` is loaded verbatim by a `db:seed` script. Not editing the dataset.

**Security / supply chain** (principles §3 applied here):

- pnpm with strict config: `save-exact=true`, committed lockfile + `--frozen-lockfile` installs,
  lifecycle scripts blocked by default with an explicit `onlyBuiltDependencies` allowlist (esbuild
  will likely be the only entry, for Vite), `minimumReleaseAge` as a cooling-off window against
  hijacked releases, and pnpm itself pinned via `packageManager`.
- The strongest control is upstream of config: 4 runtime dependencies total.
- All SQL parameterized; the 3 query params validated at the boundary (400 on anything off-shape).
- No secrets exist in this build; `.env.example` documents connection shape anyway so the structure
  is right when one day they do.

**Patterns deliberately absent:** no repository layer, no DI container, no speculative interfaces, no service
layer. The patterns that stay are the ones doing work: functional core / imperative shell (`baseline.ts`),
single source of truth (weeks in SQL, UI state in URL), and fail-safe additive LLM output (deterministic
fallback; the page never depends on the model).

## 7. Tests — the ones that would actually catch me being wrong

Not chasing coverage. Five things I genuinely believe could be wrong:

1. **Baseline math** — pure unit tests on the median/MAD/verdict module. Includes the case that matters:
   a series containing one huge outlier still produces a stable baseline. This is the test that justifies the
   whole median decision.
2. **Duplicate collapse** — assert the known duplicate rows are counted once. Against real seed data.
3. **Timezone bucketing** — an event just before local midnight Sunday lands in the right week, for a non-UTC
   account. Cheap to get wrong, invisible when wrong.
4. **Zero-fill** — a location with no events in the judged week appears in the response with `current: 0` and
   a real verdict, rather than being absent.
5. **Empty account** — account 20 returns a well-formed empty response, 200 not 500.

Plus one integration test hitting the route against the seeded DB and checking a hand-computed number. I want at
least one figure in this repo that I verified by hand in SQL rather than trusting the code that produced it.

## 8. Where would an LLM fit?

Decision rule applied (principles §5, *deterministic first*): if the transformation is specifiable as
exact rules over structured input → code, always. If the cases are enumerable → static content or a
template. An LLM enters only where input/output is open natural language or the criterion is genuinely
unspecifiable — and even then, only with verifiable output, a deterministic fallback, and marginal value
that pays the marginal cost. Auditing every candidate spot in this product against that rule:

| Candidate spot | Verdict | Why |
| --- | --- | --- |
| Baseline / band / verdict computation | Deterministic — obviously | Pure math. An LLM here would be a defect. |
| Detecting which location is off-normal | Deterministic | That's exactly the MAD threshold. Fully specifiable. |
| Ranking the table | Deterministic | Sort by deviation. Exact rule. |
| NL querying ("show June's missed calls") | Deterministic wins | The UI's three filters cover this dashboard's real question space; an LLM would add an error surface between the user and the numbers to save two clicks. Rejected. |
| Explaining *why* a number moved | No — dangerous | The model lacks causal data; it would produce confident hallucinated causality. |
| Help texts / "what does typical range mean" | Static | Enumerable. Written once. |
| The Monday narrative summary | **The one real candidate — borderline** | Below. |

**Where it fits: the last mile of explanation, not the analysis.**

The dashboard produces a ranked table. The account manager's actual job on Monday is to turn that into a
sentence: *"Site C took 38% fewer calls than usual last week, and it's the only location that moved — worth a
call."* That sentence has two halves, and the decision rule splits them: the **facts** (counts, ranges, deltas)
are deterministic and already in the payload — a template renders them perfectly. The **editorial** half —
choosing which of ~11 locations × 3 event types deserve the first sentence, grouping related movements
("three northern sites dipped together — likely one pattern, not three incidents"), composing prose a shop
owner reads in ten seconds — is selection and synthesis under a fuzzy criterion. "What mattered most this
week" can't be specified as exact rules without reimplementing a brittle rule engine that still writes like a
robot. That editorial half is the only task in this slice that passes the deterministic-first test.

Honest caveat: its marginal value over a "top 2 deviations" template is real but **modest** — which is exactly
why the fallback template below isn't just error handling, it's the deterministic alternative competing on
equal terms, and why building beyond a stub is deferred rather than assumed.

**Where it does not fit: computing or deciding anything numeric.** The trust boundary sits exactly at the
aggregation output. The model receives a small, already-aggregated JSON payload and returns prose. It never
sees raw events, never computes a delta, never determines a verdict. If the model vanished, every number on the
page would still be correct — only the summary sentence would be missing. That's the property I want.

Concretely, if I build it:

- **Verification of nondeterministic output:** the summary is constrained to a schema, and then post-validated —
  every numeral in the generated text must appear in the input payload. If the model invents a number, the
  output is rejected, not shown. This is checkable precisely *because* the input is a small closed set of
  numbers, which is the reason the boundary is drawn where it is.
- **Failure handling:** the summary is additive, never blocking. Timeout, error, or failed validation → fall
  back to a deterministic templated sentence built from the same payload. The page renders fully without it.
- **Cost and latency:** the input is ~15 rows of JSON, so this is a cheap short-context call. It's cached on
  `(account, week, eventType)` — the underlying data for a *complete* week never changes, so the cache is
  permanently valid, meaning at most one call per customer per week. It is not on the page's critical path.

**What I'll actually do inside the time budget:** build the boundary with the real prompt committed and a
stubbed provider. The prompt, the schema, the validator, and the fallback are the reviewable engineering here;
a live API key adds cost and setup risk and demonstrates nothing extra. If the stub is trivially swappable for
a real client, I've shown the thing that matters.

**What I considered and rejected:** natural-language querying of the dashboard ("show me last month's
missed calls"). Demos well, but it puts an LLM on the path between the user and the numbers — the model
generating or shaping queries means wrong output looks exactly like right output. Wrong trust boundary for a
reporting product where the entire value proposition is that the number is correct.

**Where an LLM would become *inevitable* (not in this slice, worth stating):** today's dataset contains no
language — `event_type` and `outcome` are enums, so nearly everything falls to the deterministic side. But
Relay tracks *calls*. The moment the product ingests transcripts, lead notes, or free-text cancellation
reasons, a task appears that deterministic code cannot do acceptably at any effort: classifying and extracting
structure from open human language ("was this missed call a new customer or a vendor?"). There the LLM isn't
added value — it's the only tool that solves the task. That contrast (borderline for narrative today,
inevitable for transcript classification tomorrow) is the decision rule working, not an opinion about this
one feature.

## 9. Time budget (~5h)

| | |
| --- | --- |
| This plan + reading the seed data | 0:45 |
| Repo, docker, migrations, seed load | 0:45 |
| SQL aggregation + baseline module | 1:15 |
| API route + UI + URL state | 1:00 |
| Tests | 0:45 |
| README + AI log cleanup | 0:45 |

If I overrun: the LLM summary is cut first, then the "outside normal only" toggle. Tests are not the buffer.

## 10. Risks I'm watching

- **Zero-fill in SQL** is where I expect the real bug. Generating the week series and left-joining is fiddly and
  wrong-by-default. Explicit test.
- **Week boundary off-by-one** between the SQL bucketing and the TypeScript week arithmetic — two places
  computing "the week", which is one too many. Single source of truth: SQL decides, TS never recomputes.
- **Over-scoping.** The pull toward outcome-rate analysis and charts is strong and I've already deferred both
  above so that future-me has to argue with this file rather than just drifting.
