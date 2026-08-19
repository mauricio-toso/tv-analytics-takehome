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
  when there are none. Written once by the architect in the harness's Phase 0.
- Tasks are appended, not rewritten. The history of what was cut is part of the deliverable.
- If the 4–6h budget runs out mid-list, stop at the last `[x]` and document the rest in the README
  as "what I'd do next" (challenge brief, *Scope & time*). Cut order per PLAN §9: **P4 first, then
  T-15**. Tests are never the buffer.

## Priority legend

`P1` skeleton required to run · `P2` the correctness core · `P3` the deliverable surface ·
`P4` optional differentiator, first to be cut.

---

## Phase 0 — Runnable skeleton (PLAN §9: 0:45)

### [ ] T-01 · P1 · pnpm workspace with strict supply-chain config

Root `package.json` (private, workspaces `server` + `web`), `.npmrc`, `packageManager` pin.
No dependencies added yet — this task only establishes the rails.

- `save-exact=true`; lockfile committed; lifecycle scripts blocked with an empty-for-now
  `onlyBuiltDependencies`; `minimumReleaseAge` set as the cooling-off window.
- Plan ref: §6 *Security / supply chain*; principles §3.
- **The lockfile does not exist yet**, so `pnpm-lock.yaml` has to be generated once before it can
  be verified. `pnpm install` is a human-run command (see the harness protocol): the implementer
  writes the config files, then requests it; the human runs it and reports back.

**Done when:** `pnpm-lock.yaml` exists and is committed, `pnpm install --frozen-lockfile` exits 0
against it, and `.npmrc` contains all four controls, each with a one-line comment saying what
attack it addresses.

### [ ] T-02 · P1 · Move the starter dataset into the layout PLAN §6 declares

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

### [ ] T-03 · P1 · Postgres via docker-compose + `.env.example`

Single service, pinned image tag, named volume, healthcheck. `.env.example` documents the
connection shape only — no real values, ever (principles §3).

**Done when:** from a clean machine, `docker compose up -d` followed by a `pg_isready` check
succeeds, and the whole step is one command in the README draft.

### [ ] T-04 · P1 · Migration 0001 — schema + index

`node-pg-migrate`. Port `schema.reference.sql` to Postgres types (`TIMESTAMP` → `timestamptz`
semantics decided here and documented: values are UTC), plus the index on
`activity_events (account_id, occurred_at)`.

- Plan ref: §6 *Migrations*.

**Done when:** `pnpm db:migrate` on an empty database creates both tables and the index; `\d
activity_events` output is pasted into the commit body. Re-running is a no-op.

### [ ] T-05 · P1 · `db:seed` loads `seed/seed.sql` verbatim

Script pipes the file into psql/`pg` unchanged. No transformation, no cleaning, no dedupe at load
time — the messiness is the test material (CLAUDE.md hard rules).

**Done when:** after migrate + seed, `SELECT count(*) FROM accounts` returns 20 and
`SELECT count(*) FROM activity_events` returns the row count that matches the INSERT statements in
the file (both numbers established here, not assumed from PLAN §3).

---

## Phase 1 — Data reality, verified before any aggregation (PLAN §3)

### [ ] T-06 · P2 · Verification query set

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

### [ ] T-07 · P2 · Weekly bucketing with duplicate collapse

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

### [ ] T-08 · P2 · Zero-fill the week series

Extend T-07: `generate_series` over the judged week and the 8 prior complete weeks, LEFT JOINed
per `(location)` so a silent location materialises as `0` instead of disappearing.

PLAN §10 names this as the place the real bug is expected. Treat it as such.

**Done when:** a location with events in earlier weeks but none in the judged week appears in the
result with `count = 0`; the row count per location is exactly 9 weeks, no more, no less.

---

## Phase 3 — Baseline domain, pure (PLAN §9: 1:15, second half)

### [ ] T-09 · P2 · `server/domain/baseline.ts`

Pure functions over an array of weekly counts. No I/O, no imports from `db/` or `routes/`, and
**no date arithmetic** — SQL already decided the weeks (single source of truth, PLAN §6).

- `median`, `scaledMAD` (× 1.4826), typical range `median ± 2·scaledMAD` floored at 0;
- verdict `above | below | typical`, `deltaPct`, `weeksOfHistory`;
- `insufficient_history` when fewer than 4 complete prior weeks, or MAD 0 with too little history —
  and in that case **no band is emitted at all**, rather than a fake one.
- Guard clauses, happy path last (principles §4).

**Done when:** the module compiles with zero imports outside the standard library, and every branch
above is reachable from the exported surface.

### [ ] T-10 · P2 · Baseline unit tests — risk 1

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

### [ ] T-11 · P3 · `GET /api/accounts/:id/normalcy?eventType=&weekStart=`

Express, imperative shell: query (T-08) → domain (T-09) → response. Hand-written validation of the
three params at the boundary (~12 lines, no zod, PLAN §6).

Contract (conventions → API contract): invalid param → `400` with a message, never silent
coercion; unknown account → `404`; account with no events → well-formed `200` with an explicit
empty payload. Response carries account timezone, judged week, and per location: `current`,
`baselineMedian`, `typicalRange`, `verdict`, `deltaPct`, `weeksOfHistory`; sorted by deviation.

**Done when:** each of the three status paths is exercised by hand (`curl` output in the commit
body) before any test is written.

### [ ] T-12 · P3 · Integration tests — risks 2–5 + one hand-verified number

supertest against the seeded database (PLAN §7):

- **duplicate collapse** — a week containing known duplicate rows counts them once;
- **timezone bucketing** — an event just before local-midnight Sunday for a non-UTC account lands in
  the expected week, and the same instant lands in a *different* week for a UTC account;
- **zero-fill** — a location absent from the judged week is present with `current: 0` and a real verdict;
- **empty account** — account 20 returns `200` with the empty payload, not `500`;
- **the hand-verified number** — one location/week count computed by hand in SQL (T-06 style) and
  asserted against the endpoint. The SQL goes in a comment above the assertion.

**Done when:** `pnpm test` is green and the hand-verified figure is traceable to a query, not to the
code that produced it (principles §7).

Split verification: the validator runs the suite and checks every other criterion, but the pinned
figure must be confirmed **by you** in SQL against the seed — a validating agent is still the
machine. It returns `PENDING HUMAN:` for it; do that check before committing.

---

## Phase 5 — UI (PLAN §9: 1:00, second half)

### [ ] T-13 · P3 · Vite + React shell with `/api` dev proxy

No router, no state library, no CSS framework. One `styles.css`.

**Done when:** `pnpm dev` starts both processes and the page fetches the endpoint through the proxy
with no CORS configuration anywhere.

### [ ] T-14 · P3 · URL-owned control state

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

### [ ] T-15 · P3 · The verdict table

`LocationTable` + `VerdictBadge` over native `<table>` / `<select>`. Per row: last week's count,
typical range, verdict word, direction and size of deviation. Sorted by deviation.

Honest states, not blank space (principles §6): account with no data → an explicit empty state;
location under 4 weeks of history → "not enough history" instead of a verdict; NULL-outcome
exclusion stated in the UI where it applies.

**Done when:** account 20 renders the empty state, a young location renders the history state, and
neither renders a zero presented as a judgement.

Split verification: the validator confirms the branches exist and are reachable from the rendered
markup it can fetch; **you** look at the three states in a browser. It returns `PENDING HUMAN:`
for the visual confirmation.

---

## Phase 6 — LLM boundary (P4 — first thing cut, PLAN §8/§9)

### [ ] T-16 · P4 · Prompt, stub provider, numeral validator, deterministic fallback

`server/llm/prompt.ts` (the real prompt, committed) and `server/llm/summary.ts`: minimal provider
interface, stubbed implementation, schema-constrained output, and the validator — **every numeral in
the generated text must appear in the input payload, or the output is rejected**. Fallback is a
template over the same payload, competing on equal terms, not just error handling.

Input is the already-aggregated payload only: the model never sees raw events, never computes a
delta, never decides a verdict. Cache key `(account, week, eventType)`.

**Done when:** a unit test feeds a summary containing an invented number and asserts the templated
fallback is returned instead; deleting the provider entirely leaves every number on the page correct.

---

## Phase 7 — Deliverables (PLAN §9: 0:45)

### [ ] T-17 · P3 · README

Run-locally-in-15-minutes instructions (docker → migrate → seed → dev), one line on how to run the
tests, stack choice and why, assumptions from PLAN §2, deliberate deferrals from PLAN §5, and what
another day would buy. Written so the reasoning reconstructs without me in the room.

**Done when:** followed literally on a clean clone by someone who has not seen the repo, start to
running app, inside 15 minutes.

### [ ] T-18 · P3 · AI log sessions closed out

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

_(empty)_
