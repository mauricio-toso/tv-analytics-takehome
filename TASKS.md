# TASKS.md — DASH-247

The execution layer of the spec-driven loop. Nothing here decides *what* or *why* — that lives in
the constitution and the plan. This file only breaks the plan into units small enough that an agent
can finish one, prove it, and stop.

```text
constitution   CLAUDE.md · resources/engineering-principles.md · resources/project-conventions.md
     ↓         (philosophy + frozen decisions + hard rules — never overridden by a task)
spec / plan    PLAN.md
     ↓         (what "normal" means, scope, architecture, tests, LLM boundary)
tasks          TASKS.md  ← you are here
     ↓         (atomic, ordered, each with a verifiable "done when")
code + AI log
```

## Rules for working this file

- **One task = one commit**, named for the decision it implements (conventions → Process).
  **The commit is performed by the human, always** — agents and the orchestrator create and edit
  files but never run `git commit`; after a validated task the harness stops and hands over with a
  suggested message.
- **A task is done only when its "Done when" is demonstrated**, not when the code looks right.
  Where the check is a number, paste the SQL and its output into the commit body or the AI log —
  a claim without a query is unverified (principles §7).
- **Never widen a task.** If implementing T-nn reveals work nobody wrote down, stop and append a
  new task; don't absorb it. If it reveals the *plan* is wrong, change PLAN.md first, then this file.
- **Status markers**, edited in place: `[ ]` todo · `[~]` in progress · `[x]` done · `[-]` dropped
  (with a one-line reason kept, not deleted) · `[!]` needs architect review, written after 3 failed
  validation attempts. Only a validator PASS may produce `[x]`.
- **Orchestrator-owned lines.** The `sdd-loop` skill owns the markers plus two note lines under a
  task: `> attempts: <n>` (the retry counter — the only record of it; don't hand-edit or delete it)
  and `> awaiting: <command>` (the task is paused on a command the human must run). The
  task-architect writes `deps:` and task text; it never touches markers or these two lines.
- **`deps:`** sits on one line right under each task heading — `deps: [T-01, T-04]`, or `deps: []`
  when there are none. Written once by the architect in the harness's Phase 0. Dependencies are
  transitive: a task lists what it directly consumes, not the whole ancestry.
- **A new dependency belongs to the task that first needs it** — `node-pg-migrate` in T-04, `pg` in
  T-07, Vitest in T-10, `express` in T-11, Vite/React in T-13, supertest in T-12. T-01 only builds
  the rails. Installing is the human's act: the implementer stops with `NEEDS_HUMAN_COMMAND` and the
  exact `pnpm add` line rather than running it (CLAUDE.md, harness boundary rules).
- Tasks are appended, not rewritten. The history of what was cut is part of the deliverable.
- If the 4–6h budget runs out mid-list, stop at the last `[x]` and document the rest in the README
  as "what I'd do next" (challenge brief, *Scope & time*). Cut order per PLAN §9: **P4 first, then
  T-15**. Tests are never the buffer.

## Priority legend

`P1` skeleton required to run · `P2` the correctness core · `P3` the deliverable surface ·
`P4` optional differentiator, first to be cut.

---

## Phase 0 — Runnable skeleton (PLAN §9: 0:45)

### [x] T-01 · P1 · pnpm workspace with strict supply-chain config

deps: []

Root `package.json` (private, workspaces `server` + `web` via `pnpm-workspace.yaml`),
`packageManager` pin. No dependencies added yet — this task only establishes the rails.

**Spec corrected for pnpm 11** (original wording put all four controls in `.npmrc`; pnpm 11 does
not read them there — see `ai-log/03-execution.md`, T-01 attempt-1 entries, for the sourced
correction and why). In pnpm 11, `.npmrc` is reserved for auth/registry credentials only; every
other project-level pnpm setting lives in `pnpm-workspace.yaml`. This task creates no `.npmrc` —
there is no auth/registry setting yet to put in one.

`pnpm-workspace.yaml` carries, alongside the existing `packages:` list, four settings — each with
a one-line YAML comment naming the attack it addresses:

- `saveExact: true` — exact versions, no caret/tilde ranges a compromised release could satisfy.
- `strictPeerDependencies: true` — fails install on missing/invalid peer deps rather than silently
  resolving an unintended version.
- `minimumReleaseAge` — cooling-off window (minutes) against hijacked/just-published releases. pnpm
  11's own default is `1440` (24h); state it explicitly rather than relying on the implicit default,
  so the control is documented, not incidental.
- `allowBuilds: {}` — empty-for-now build-script allowlist. This **replaces** `onlyBuiltDependencies`,
  which pnpm 11 removed (along with `onlyBuiltDependenciesFile`, `neverBuiltDependencies`,
  `ignoredBuiltDependencies`, `ignoreDepScripts`) in favor of `allowBuilds`, a package-matcher map of
  `true`/`false`. pnpm 11's `strictDepBuilds` (default `true`) already fails install on unreviewed
  build scripts; `allowBuilds: {}` keeps the allowlist empty rather than turning that off.

- Plan ref: §6 *Security / supply chain* (the four controls named there — exact versions, blocked-
  by-default lifecycle scripts with an allowlist, a release cooling-off window, pinned pnpm — are
  unchanged in intent; only *where* pnpm 11 expects each one declared has moved); principles §3.
- **The lockfile does not exist yet.** Verify empirically before assuming `pnpm install` must run
  first: in this pnpm version, `pnpm install --frozen-lockfile` (already agent-run-allowed) may
  generate a lockfile from nothing when there are zero declared dependencies — confirmed by the
  orchestrator in an isolated directory during T-01's escalation, not yet re-confirmed against the
  real repo layout. If it does not behave that way once `server`/`web` exist with real deps, request
  `pnpm install` as `NEEDS_HUMAN_COMMAND` as originally planned.

**Done when:** `pnpm-lock.yaml` exists and is committed, `pnpm install --frozen-lockfile` exits 0
against it, and `pnpm-workspace.yaml` contains all four controls (`saveExact`,
`strictPeerDependencies`, `minimumReleaseAge`, `allowBuilds`), each with a one-line comment saying
what attack it addresses.

### [x] T-02 · P1 · Move the starter dataset into the layout PLAN §6 declares

deps: []

The starter repo landed under `code/`. The plan's layout says `seed/seed.sql` and expects
`schema.sql` as the source for migration 0001.

- Move `code/seed.sql` → `seed/seed.sql` **byte-identical**, `code/schema.sql` → `migrations/schema.reference.sql`.
  Use `git mv` (or `mv`) — **not** a Write/Edit tool call: `Write(./seed/**)` is denied on purpose,
  and rewriting the file instead of moving it is exactly the risk that rule exists to prevent.
- Keep `code/docs/` and `code/seed/generate_seed.py` as provided context; do not run the generator.
- Note the path discrepancy resolution in the AI log — CLAUDE.md's "never edit `seed/seed.sql`"
  becomes literally true only after this move.

**Done when:** `sha256sum` of the moved seed file equals that of the original, recorded in the
commit body; the `Edit(./seed/**)` deny rule in `.claude/settings.json` now guards the real file.

### [x] T-03 · P1 · Postgres via docker-compose + `.env.example`

deps: []

Single service, pinned image tag, named volume, healthcheck. `.env.example` documents the
connection shape only — no real values, ever (principles §3).

**Done when:** from a clean machine, `docker compose up -d` followed by a `pg_isready` check
succeeds, and the whole step is one command in the README draft.

### [x] T-04 · P1 · Migration 0001 — schema + index

deps: [T-01, T-02, T-03]

`node-pg-migrate`. Port `schema.reference.sql` to Postgres types (`TIMESTAMP` → `timestamptz`
semantics decided here and documented: values are UTC), plus the index on
`activity_events (account_id, occurred_at)`.

- Plan ref: §6 *Migrations*.

**Done when:** `pnpm db:migrate` on an empty database creates both tables and the index; `\d
activity_events` output is pasted into the commit body. Re-running is a no-op.

### [x] T-05 · P1 · `db:seed` loads `seed/seed.sql` verbatim

deps: [T-02, T-04]

Script pipes the file into psql/`pg` unchanged. No transformation, no cleaning, no dedupe at load
time — the messiness is the test material (CLAUDE.md hard rules).

**Done when:** after migrate + seed, `SELECT count(*) FROM accounts` returns 20 and
`SELECT count(*) FROM activity_events` returns the row count that matches the INSERT statements in
the file (both numbers established here, not assumed from PLAN §3).

---

## Phase 1 — Data reality, verified before any aggregation (PLAN §3)

### [x] T-06 · P2 · Verification query set

deps: [T-05]

A committed `docs/verification.sql` (or equivalent) that re-derives every factual claim PLAN §3
makes, so the plan's numbers stop being trusted and start being checked:

1. total events, distinct accounts, min/max `occurred_at`;
2. exact-duplicate rows on the natural key `(account_id, location, event_type, occurred_at)` —
   expected ~12, confirm the real count;
3. NULL rates for `duration_seconds` and `outcome`;
4. accounts with zero events — expected: account 20 only;
5. the account-6 single-day burst: date and count.

**Done when:** every query's output is recorded (README appendix or AI log). Any number that
contradicts PLAN §3 is **corrected in this file and flagged in the AI log — PLAN.md is left
as-written** (PLAN.md header rule).

---

## Phase 2 — Aggregation in SQL (PLAN §9: 1:15, first half)

### [x] T-07 · P2 · Weekly bucketing with duplicate collapse

deps: [T-01, T-06]

`server/db/queries.ts`. One parameterized query, commented as a reviewable artifact
(conventions → Code organization):

- collapse duplicates on the natural key **before** counting (`DISTINCT` on the key, not on `id`);
- bucket by local week: `date_trunc('week', occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone)`
  — Mon–Sun in the account's own zone;
- group by `(location, event_type, week_start)`.

Parameters: account id, event type, judged week. No interpolation anywhere (hard rule).

**Done when:** for one hand-picked account, the sum of weekly counts equals the deduplicated total
from T-06's query 2, and a location's count for one week is reproducible by a second,
independently-written query.

### [x] T-08 · P2 · Zero-fill the week series

deps: [T-07]

Extend T-07: `generate_series` over the judged week and the 8 prior complete weeks, LEFT JOINed
per `(location)` so a silent location materialises as `0` instead of disappearing.

PLAN §10 names this as the place the real bug is expected. Treat it as such.

**Done when:** a location with events in earlier weeks but none in the judged week appears in the
result with `count = 0`; the row count per location is exactly 9 weeks, no more, no less.

---

## Phase 3 — Baseline domain, pure (PLAN §9: 1:15, second half)

### [x] T-09 · P2 · `server/domain/baseline.ts`

deps: [T-01]

Pure functions over an array of weekly counts. No I/O, no imports from `db/` or `routes/`, and
**no date arithmetic** — SQL already decided the weeks (single source of truth, PLAN §6).

- `median`, `scaledMAD` (× 1.4826), typical range `median ± 2·scaledMAD` floored at 0;
- verdict `above | below | typical`, `deltaPct`, `weeksOfHistory`;
- `insufficient_history` when fewer than 4 complete prior weeks, or MAD 0 with too little history —
  and in that case **no band is emitted at all**, rather than a fake one.
- Guard clauses, happy path last (principles §4).

**Done when:** the module compiles with zero imports outside the standard library, and every branch
above is reachable from the exported surface.

### [x] T-10 · P2 · Baseline unit tests — risk 1

deps: [T-09]

This is also where the test runner enters: Vitest config and the `pnpm test` script are established
here, and every later suite reuses them rather than re-inventing a runner.

The tests that justify the median/MAD decision (PLAN §7.1):

- a series with one order-of-magnitude outlier produces a baseline within a small tolerance of the
  outlier-free series — the account-6 case, in miniature;
- the same series under mean/stddev would flip the verdict — asserted explicitly, so the test
  documents *why* the choice was made;
- `[0,0,0,0,0,0,0,0]` with a current week of 0 is `typical`, not a division-by-zero;
- 3 prior weeks → `insufficient_history`, no band.

**Done when:** `pnpm test` runs them green, and each test name states the belief it would falsify.

---

## Phase 4 — API (PLAN §9: 1:00, first half)

### [x] T-11 · P3 · `GET /api/accounts/:id/normalcy?eventType=&weekStart=`

deps: [T-08, T-09]

Express, imperative shell: query (T-08) → domain (T-09) → response. Hand-written validation of the
three params at the boundary (~12 lines, no zod, PLAN §6).

Contract (conventions → API contract): invalid param → `400` with a message, never silent
coercion; unknown account → `404`; account with no events → well-formed `200` with an explicit
empty payload. Response carries account timezone, judged week, and per location: `current`,
`baselineMedian`, `typicalRange`, `verdict`, `deltaPct`, `weeksOfHistory`; sorted by deviation.

**Done when:** each of the three status paths is exercised by hand (`curl` output in the commit
body) before any test is written.

### [x] T-12 · P3 · Integration tests — risks 2–5 + one hand-verified number

deps: [T-10, T-11]

supertest against the seeded database (PLAN §7):

- **duplicate collapse** — a week containing known duplicate rows counts them once;
- **timezone bucketing** — an event just before local-midnight Sunday for a non-UTC account lands in
  the expected week, and the same instant lands in a *different* week for a UTC account;
- **zero-fill** — a location absent from the judged week is present with `current: 0` and a real verdict;
- **empty account** — account 20 returns `200` with the empty payload, not `500`;
- **the hand-verified number** — one location/week count computed by hand in SQL (T-06 style) and
  asserted against the endpoint. The SQL goes in a comment above the assertion.
- **ranking** — for a multi-location account the response comes back most-deviant-first, and the
  order is not an accident of the query. Detailed below, because it is the easiest of the six to
  write vacuously.

The ranking test carries the clause the ticket is sharpest about — *which location needs attention*
— and "sorted by deviation" is currently prose in T-11 and T-15 that nothing demonstrates. It must
establish three things:

1. the rows are non-increasing in the deviation measure the endpoint ranks on. **That measure is
   T-11's decision, not this test's** — name it in a comment above the assertion, then assert
   against it, so removing the sort breaks the test rather than the comment;
2. the first row is the location an independently hand-written SQL query identifies as the most
   deviant for that account and judged week — pinned, not merely monotonic;
3. rows carrying no verdict (`insufficient_history`: no band, therefore no deviation) are grouped
   rather than interleaved among ranked rows, and the test pins which end they occupy. An untested
   placement is an accident, not a decision.

Account and judged week are chosen **for a property, not by number**: a multi-location account whose
deviation order for that week differs *both* from alphabetical location order *and* from the order
rows arrive in with no `ORDER BY`. Against any other account the assertion passes on an unsorted
response and proves nothing. Record the chosen account, week, and the query that established the
property in a comment above the test.

Where that same walk already reads `deltaPct` per row, assert in the same assertion that its sign
agrees with the verdict (`above` → positive, `below` → negative). No separate test for it.

**Done when:** `pnpm test` is green and the hand-verified figure is traceable to a query, not to the
code that produced it (principles §7).

Additionally, the ranking test is shown to be non-vacuous: with the endpoint's sort temporarily
removed it **fails**, demonstrated once with the output in the commit body or AI log, then the sort
restored. A ranking assertion that has never been seen to fail is decoration.

Split verification: the validator runs the suite and checks every other criterion, but the pinned
figure must be confirmed **by you** in SQL against the seed — a validating agent is still the
machine. It returns `PENDING HUMAN:` for it; do that check before committing.

---

## Phase 5 — UI (PLAN §9: 1:00, second half)

### [x] T-13 · P3 · Vite + React shell with `/api` dev proxy

deps: [T-01, T-11]

No router, no state library, no CSS framework. One `styles.css`.

**Done when:** `pnpm dev` starts both processes and the page fetches the endpoint through the proxy
with no CORS configuration anywhere.

### [x] T-14 · P3 · URL-owned control state

deps: [T-13]

A small `useUrlState` hook over native `URLSearchParams` + `history.replaceState`. Three controls:
account, event type, judged week. The URL is the single source of truth; no duplicate React state.

**Done when:** changing any control updates the address bar; a **reload restores all three**
(the brief's explicit requirement); pasting the URL in a new tab reproduces the same view.

Split verification — the validator has no browser:

- *agent-checkable*: the URL is the **only** owner of the three control values (no duplicate React
  state — that is how reload-survival breaks while looking correct), reads come from
  `location.search`, writes go through `URLSearchParams` + `history.replaceState`, app builds.
- *human-only*: actually reloading the page and actually pasting the URL into a second tab. The
  validator returns `PENDING HUMAN:` for these; confirm them in a browser before committing.

### [x] T-15 · P3 · The verdict table

deps: [T-14]

`LocationTable` + `VerdictBadge` over native `<table>` / `<select>`. Per row: last week's count,
typical range, verdict word, direction and size of deviation. Sorted by deviation.

Honest states, not blank space (principles §6): account with no data → an explicit empty state;
location under 4 weeks of history → "not enough history" instead of a verdict; NULL-outcome
exclusion stated in the UI where it applies.

On that last clause: nothing in this slice reads `outcome` — the counts are per event type and
outcome-rate analysis is deferred (PLAN §5). So the correct outcome here is *no* NULL-outcome note,
not an invented rate to hang one on. It becomes required only if a later task puts `outcome` on the
page.

**Done when:** account 20 renders the empty state, a young location renders the history state, and
neither renders a zero presented as a judgement. Plus, checkable without a browser: for a
multi-location account the **rendered row order is exactly the response order** — the table maps the
array as received and never re-sorts, re-groups or re-filters it client-side, so the ranking the API
decided (T-12) is the ranking the user reads top-down. The first row in the markup is the first
element of the payload.

Split verification: the validator confirms the branches exist and are reachable from the rendered
markup it can fetch; **you** look at the three states in a browser. It returns `PENDING HUMAN:`
for the visual confirmation. The row-order criterion is *not* one of those: it is agent-checkable
from the markup and from the absence of any sort in the component.

---

## Phase 6 — LLM boundary (P4 — first thing cut, PLAN §8/§9)

### [x] T-16a · P4 · Prompt, stub provider, numeral validator, deterministic fallback

deps: [T-10, T-11]

`server/llm/prompt.ts` (the real prompt, committed) and `server/llm/summary.ts`: minimal provider
interface, stubbed implementation, schema-constrained output, and the validator — **every numeral in
the generated text must appear in the input payload, or the output is rejected**. Fallback is a
template over the same payload, competing on equal terms, not just error handling.

Input is the already-aggregated payload only — the T-11 response shape, nothing rawer: the model
never sees raw events, never computes a delta, never decides a verdict. Cache key
`(account, week, eventType)`.

**Done when:** one unit test feeds a summary containing an invented number and asserts the templated
fallback is returned instead, and a second asserts a provider that throws produces the same fallback
rather than an error. Both tests call the module with a plain payload object — no Express, no
database, no HTTP: the trust boundary is visible in the signature (PLAN §8).

### [x] T-16b · P4 · Wire the summary in as an additive field

deps: [T-15, T-16a]

The route (T-11) gains an optional `summary` in its payload; the page (T-15) renders it as one
sentence above the table. Absence is normal and never an error (conventions → API contract), and no
number displayed anywhere comes from it.

**Done when:** with the provider stubbed out entirely, the endpoint still returns `200` and the page
still renders every count, typical range and verdict — only the sentence is missing; and when the
sentence does render, every numeral in it also appears in the payload that produced it.

---

## Phase 7 — Deliverables (PLAN §9: 0:45)

### [x] T-17 · P3 · README

deps: [T-05, T-12, T-13]

Run-locally-in-15-minutes instructions (docker → migrate → seed → dev), one line on how to run the
tests, stack choice and why, assumptions from PLAN §2, deliberate deferrals from PLAN §5, and what
another day would buy. Written so the reasoning reconstructs without me in the room.

**Done when:** followed literally on a clean clone by someone who has not seen the repo, start to
running app, inside 15 minutes.

### [x] T-18 · P3 · AI log sessions closed out

deps: [T-17]

Runs last by construction: its "Done when" ranges over the whole executed task history, so it is
only completable once every other task in this file has reached a terminal state (`[x]` or `[-]`).
The `deps:` line names T-17 because a dependency list cannot express "everything"; the real
constraint is the one just stated.

One file per working session, raw: prompts, the agent's proposal, and accepted / rejected /
redirected with the reason. Mistakes and corrections go in **as they happened** (CLAUDE.md hard
rule). The reflection section in `ai-log/README.md` gets the new specific moments appended.

Scope boundary: this task covers the narrative session files and `ai-log/README.md` **only**.
`ai-log/03-execution.md` is the orchestrator's append-only harness log — never edited, rewritten,
or summarized by an implementer, however untidy it reads. Its untidiness is the evidence.

**Done when:** every correction recorded in this file's task history is findable in the log, and
nothing in the log has been tidied after the fact.

---

## Appended after the fact

New tasks discovered during implementation go here with the task that revealed them, so the
difference between what was planned and what was actually needed stays visible.

### [x] T-19 · P2 · Bound zero-fill at each location's first event, so `insufficient_history` is reachable

deps: [T-08, T-09, T-11]

Revealed by T-12. The implementer verified empirically that `insufficient_history` is unreachable
through the live endpoint for **any** input against the seed: T-08's unconditional `generate_series`
manufactures exactly 9 rows (judged week + 8 prior) per location regardless of real history, so
`weeksOfHistory` is always 8 and neither domain branch (< 4 prior weeks; MAD 0 with < 8 weeks) can
fire. Confirmed by brute-force enumeration of all 1,539 (account, eventType, judged-week)
combinations with ≥ 3 locations — zero produced `insufficient_history`. That contradicts PLAN §2
("a new location shows *not enough history*, not a false baseline") and left T-12's ranking
requirement #3 untestable (omitted there with an explanatory comment, not faked).

Classification: **task defect in T-08**, whose "no more, no less" clause over-specified relative to
the plan; the plan wins. T-08's text stays as written (tasks are appended, not rewritten) — this
task **supersedes** that clause. Amended criterion: **exactly `min(9, weeks since the location's
first event)` rows per location.**

The fix, in `server/db/queries.ts` (the T-08 query) only:

- Add a CTE computing each location's first-ever event — `MIN(occurred_at)` per
  `(account, location)`, truncated to week **in the account's timezone** — and discard series weeks
  earlier than that first week. All in the same SQL query: no date logic in TypeScript (PLAN §6,
  weeks are decided in SQL only).
- **No changes** to `server/domain/baseline.ts` or the route: the domain already accepts
  variable-length arrays and already implements both `insufficient_history` branches.
- **Deliberate semantic decision:** the cutoff is the location's first event of **any** event type,
  not of the queried type. A location 8+ weeks old that never produced the queried event type gets
  real zeros (baseline 0, verdict `typical`) — that is data, not missing history.
  `insufficient_history` is reserved for genuinely new locations. The per-event-type cutoff is
  considered and rejected here, not forgotten.

Consequence: once this lands, T-12's ranking requirement #3 (insufficient_history rows grouped at
a pinned end) becomes testable; re-enabling that omitted sub-assertion belongs to **T-12's** scope,
not this task's.

**Done when:** (1) for a location whose first event predates the judged week by 8+ weeks, the query
still returns exactly 9 rows; (2) for a location with fewer than 4 complete prior weeks of
existence, it returns correspondingly fewer rows — both shown with the SQL and its output;
(3) `insufficient_history` is demonstrated reachable through the live endpoint against the seed —
a concrete (account, eventType, weekStart) yielding it, with the independent SQL that verifies that
location's first-event week; (4) existing tests (T-10, T-12's committed suite) stay green.

### [x] T-20 · P4 · Repo-wide `type:check` and Prettier

deps: [T-17]

Requested by the human after T-18 (not discovered by a task — a direct quality-of-life request):
one command that type-checks the whole repo, and Prettier for homogeneous formatting.

Gap it closes: `web` was already type-checked by its build (`tsc -b`), but `server` runs on Node's
native type stripping and had **no tsconfig at all** — its types were never checked by anything.
Adding `server/tsconfig.json` (strict, `noEmit`, NodeNext, `erasableSyntaxOnly` to mirror what Node
actually executes) immediately surfaced two real errors in `server/routes/normalcy.ts`, fixed as
part of this task: `req.params.id` is `string | string[]` under Express 5 types and was never
narrowed, and the route's local row type declared `verdict: string`, discarding the domain's
`Verdict` union before the payload was checked against `LocationSummaryRow`.

Scope:

- `server/tsconfig.json` (new) — check-only, no emit, matching Node's runtime constraints.
- Root scripts: `type:check` (`tsc -p server && tsc -b web`), `format` / `format:check`
  (Prettier, default options — an empty `.prettierrc.json` pins that as intentional).
- `.prettierignore`: build output, lockfile, `seed/` (frozen), and all Markdown — Prettier's
  scope here is code only; reflowing README/PLAN/TASKS/ai-log would bury real diffs in churn.
- Root devDependencies (human-installed, agents don't touch the machine):
  `typescript@7.0.2` (same version `web` already pins) and `prettier`.

**Done when:** (1) `pnpm run type:check` exits 0 from the repo root; (2) `pnpm run format` is
idempotent and `pnpm run format:check` exits 0 afterwards; (3) `pnpm test` stays green; (4) the
two surfaced type errors are fixed at the type level only — no behavior change (the
`typeof accountIdRaw !== "string"` guard is unreachable for this route shape and exists to
satisfy narrowing honestly rather than with a cast).
