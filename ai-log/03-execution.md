# Session 03 — harness execution

Append-only record of every task run through the `sdd-loop` harness: architect passes, implementer
dispatches, validator verdicts (PASS **and** FAIL, verbatim), and the commands handed to the human.
Written by the orchestrator as work happens, not reconstructed afterwards.

Entry format:

```
### <T-nn> · attempt <n> · <implementer|validator|architect|human-command> · <PASS|FAIL|BLOCKED|REFINED|AWAITING>
<verbatim verdict / evidence / diagnosis / command + human-reported output>
```

Model policy in force: implementer and validator on sonnet; task-architect on the session model.

---

### bootstrap · attempt 1 · architect · REFINED

Trigger: no task in TASKS.md carried a `deps:` line and no runs were logged — the one-time bootstrap
review. Dispatched task-architect on the session model with TASKS.md verbatim, instructed to verify
plan traceability, add `deps:` to every task, and split/merge only where genuinely needed.

Verdict returned, verbatim:

> REFINED
>
> ## What changed in `C:\Repositories\Challenge\TASKS.md`
>
> **1. `deps:` on every task** (the graph, with rationale for the non-obvious edges):
>
> | Task | deps | why |
> | --- | --- | --- |
> | T-01, T-02, T-03 | `[]` | workspace rails, file move, and docker are genuinely independent — three parallel starts |
> | T-04 | `[T-01, T-02, T-03]` | needs the workspace/script, `migrations/schema.reference.sql` from the move, and a live DB to prove `pnpm db:migrate` |
> | T-05 | `[T-02, T-04]` | seed file in place + tables to load into |
> | T-06 | `[T-05]` | verification queries need seeded data |
> | T-07 | `[T-01, T-06]` | its "Done when" compares against T-06's query 2 — a real, not conceptual, prerequisite |
> | T-08 | `[T-07]` | extends the query |
> | T-09 | `[T-01]` | pure TS, no DB — **deliberately not chained behind Phase 2**, it can run in parallel |
> | T-10 | `[T-09]` | |
> | T-11 | `[T-08, T-09]` | shell over query + domain |
> | T-12 | `[T-10, T-11]` | reuses the runner T-10 establishes |
> | T-13 | `[T-01, T-11]` | web workspace + an endpoint to proxy to |
> | T-14 | `[T-13]` · T-15 `[T-14]` | table renders what the URL controls select |
> | T-16a | `[T-10, T-11]` · T-16b `[T-15, T-16a]` | |
> | T-17 | `[T-05, T-12, T-13]` | the README documents migrate/seed, test, and dev commands — all three must exist |
> | T-18 | `[T-17]` | plus an explicit note that the real constraint is "every other task terminal" |
>
> **2. One split — T-16 → T-16a / T-16b.** T-16 hid two independently verifiable outcomes behind one
> heading: the module, and its wiring. Its acceptance criterion *"deleting the provider entirely
> leaves every number on the page correct"* is unverifiable at module level and silently required a
> response field T-11 does not define and a UI element T-15 does not render. T-16a is now the
> reviewable engineering (prompt, provider interface, stub, numeral validator, fallback, two unit
> tests including the throwing-provider path); T-16b is the additive wiring, and it is where the
> "page still correct without the model" claim is actually checkable. Both stay P4, so the cut order
> is unchanged.
>
> **3. Two scope clarifications, no new work:**
> - New bullet in *Rules for working this file*: a dependency belongs to the task that first needs it
>   (T-01 only builds the rails, and adds none), and `pnpm add` is human-run — the implementer stops
>   with `NEEDS_HUMAN_COMMAND`. This was an unwritten step in six tasks.
> - T-10 now states it establishes the Vitest config and `pnpm test`, which is why T-12 and T-16a
>   depend on it.
>
> **4. One latent scope trap closed.** T-15 asked for "NULL-outcome exclusion stated in the UI where
> it applies", but nothing in this slice reads `outcome` — PLAN §5 defers outcome-rate analysis. As
> written, an implementer could invent a missed-call rate to justify the note. The task now says
> explicitly that the correct result is *no* note, and that the clause reactivates only if a later
> task puts `outcome` on the page.
>
> No acceptance criterion was weakened; T-16a's failure-path assertion and T-16b's numeral check are
> additions. Markers, `> attempts:` / `> awaiting:` lines, and all other files are untouched.

Orchestrator check: diff confirms TASKS.md is the only file changed (75 insertions, 6 deletions); no
state marker, `> attempts:` or `> awaiting:` line was written by the architect. Task count 18 → 19
(T-16 split). Handed to the human for review before any implementation starts.

### bootstrap · attempt 2 · architect · REFINED

Trigger: human review of the bootstrap output, not a validation failure. The human asked whether the
problem stated in `code/docs/TICKET.md` was actually covered by PLAN.md and by TASKS.md. Audit found
the ticket substantively covered — baseline (T-09/T-10), per-location unit (T-07/T-08/T-15), local
complete-week window (T-07/T-08), verdict-not-chart (T-15), out-of-scope items correctly absent —
with one hole:

**"Sorted by deviation" was prose in three places and demonstrated in none.** It appears in T-11's
body and T-15's body, but in no "Done when" and in none of T-12's five integration tests. Ranking is
the entire mechanism by which the ticket's sharpest clause — *customers struggle to spot which
location needs attention* — is answered. As written, an implementer could satisfy every acceptance
criterion in the file with an unsorted response and the harness would correctly mark it `[x]`.

Two softer findings were judged **not** task defects and deliberately left alone: (a) the ticket says
"good, bad, or typical" while the product delivers "above / below / typical" — a README articulation
matter for T-17, since PLAN.md stays as-written; (b) "act on it" leans on the narrative summary,
which is P4 and first on the cut list — a conscious deferral already argued in PLAN §8.

Dispatched task-architect (resumed, same session context) scoped to **T-12 and T-15 only**, with an
explicit instruction not to touch T-11 — ordering is verified by T-12, which depends on it, and
putting the criterion in two places would recreate the two-sources-of-truth problem.

Verdict returned, verbatim:

> Both edits are in; `T-11`, all `deps:` lines, the preamble, headings and markers are untouched.
>
> ## T-12 — ranking became a test, not a claim
>
> Added a sixth bullet alongside the existing five, then the detail that makes it non-vacuous:
>
> ```markdown
> - **ranking** — for a multi-location account the response comes back most-deviant-first, and the
>   order is not an accident of the query. Detailed below, because it is the easiest of the six to
>   write vacuously.
> ```
>
> Three things the test must establish:
>
> 1. **monotonicity** in the deviation measure the endpoint ranks on — explicitly *T-11's decision,
>    not this test's*. The measure is named in a comment and asserted against, so deleting the sort
>    breaks the test rather than the comment. This is the one place I deliberately did not decide for
>    the implementer: `|deltaPct|` versus distance-outside-band is a T-11 call, and pinning it here
>    would have created the second source of truth you ruled out.
> 2. **a pinned top row** — the most-deviant location identified by an independently hand-written
>    query, not merely "the array is ordered".
> 3. **placement of `insufficient_history` rows** — no band means no deviation, so they cannot be
>    ranked; the test asserts they are grouped rather than interleaved and pins which end they
>    occupy. That decision existed implicitly and was going to be made by accident.
>
> The anti-vacuity requirement is the point of the edit, so it is stated twice — once in the
> selection rule, once as an acceptance criterion:
>
> ```markdown
> Account and judged week are chosen **for a property, not by number**: a multi-location account whose
> deviation order for that week differs *both* from alphabetical location order *and* from the order
> rows arrive in with no `ORDER BY`. Against any other account the assertion passes on an unsorted
> response and proves nothing.
> ```
>
> ```markdown
> Additionally, the ranking test is shown to be non-vacuous: with the endpoint's sort temporarily
> removed it **fails**, demonstrated once with the output in the commit body or AI log, then the sort
> restored. A ranking assertion that has never been seen to fail is decoration.
> ```
>
> No account number invented — the property is stated, and the choice must be recorded with the query
> that established it. `deltaPct` is covered inside the same walk (sign agrees with verdict: `above`
> positive, `below` negative), with an explicit "no separate test for it".
>
> ## T-15 — the ordering has to survive the client
>
> Appended to the existing "Done when" (nothing reworded): the rendered row order is exactly the
> response order, the table never re-sorts, re-groups or re-filters client-side, and the first row in
> the markup is the first element of the payload. I also closed the ambiguity against the existing
> split-verification note, since that note routes visual checks to you — the new criterion is
> explicitly *not* one of them:
>
> ```markdown
> The row-order criterion is *not* one of those: it is agent-checkable
> from the markup and from the absence of any sort in the component.
> ```
>
> Net effect: an unsorted response now fails T-12, and a correctly sorted response re-sorted in the
> component now fails T-15. The path from "sorted by deviation" to a demonstrated fact is closed at
> both ends, with T-11 still owning the sort key.
>
> File edited: `C:\Repositories\Challenge\TASKS.md` (T-12 and T-15 only).
>
> REFINED

Orchestrator check: cumulative diff now 111 insertions / 8 deletions, TASKS.md still the only file
touched. Re-read T-11 — body and "Done when" are byte-identical to the bootstrap state, so the
no-second-source-of-truth constraint held. All 19 headings still carry `[ ]`; all 19 `deps:` lines
unchanged; no `> attempts:` or `> awaiting:` line exists yet. Handed to the human for review.

Flagged to the human, not overruled: T-12's "remove the sort, watch it fail, restore it" step is a
manual mutation check that adds implementer work beyond the assertion itself, on a task that already
carries a `PENDING HUMAN:`. It is the one addition in this pass that could reasonably be trimmed.
