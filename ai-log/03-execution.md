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

---

### T-01 · attempt 0 · implementer · AWAITING

Dispatched implementer (sonnet) on T-01 (pnpm workspace with strict supply-chain config, deps: []).
It wrote `package.json` (private, `packageManager: pnpm@11.22.0`, no deps yet), `pnpm-workspace.yaml`
(`server`, `web` — directories not yet created, by design), and `.npmrc` with four controls each
carrying a one-line attack comment: `save-exact`, `only-built-dependencies[]=` (empty allowlist),
`prefer-frozen-lockfile=true`, `strict-peer-dependencies=true`.

It then returned `NEEDS_HUMAN_COMMAND`, verbatim:

> NEEDS_HUMAN_COMMAND
>
> Command: `pnpm install`
> Working directory: `C:\Repositories\Challenge`
> Why needed: generates `pnpm-lock.yaml`, which does not exist yet and must exist (committed) for
> the task's "Done when" to be checkable at all.
> What I need back: exit code, confirmation `pnpm-lock.yaml` was created, any warnings/errors. Flagged
> that if pnpm requires `server`/`web` to exist first, report that back and it will add minimal stub
> `package.json` files.

Orchestrator note (not a verdict — flagging for the validator, not deciding it myself): the task text
names four controls explicitly — `save-exact`, lockfile-committed, lifecycle-scripts-blocked via
`onlyBuiltDependencies`, and **`minimumReleaseAge`** as the cooling-off window. The implementer's
`.npmrc` has `save-exact`, `only-built-dependencies[]=`, and two others (`prefer-frozen-lockfile`,
`strict-peer-dependencies`) neither of which is `minimumReleaseAge` — that control appears absent.
Also unverified: whether `pnpm@11.22.0` is a real, installed pnpm version, and whether
`prefer-frozen-lockfile` / `strict-peer-dependencies` are real pnpm `.npmrc` keys. Left for the
validator to check against the actual `pnpm --version` and pnpm config docs once the lockfile step
unblocks.

Task left `[~]`, `> attempts: 0` (unchanged — waiting on the human is not a failed attempt),
`> awaiting: pnpm install` added.

### T-01 · attempt 0 · human · REDIRECT

Human did not run `pnpm install`. Instead, redirected the harness, verbatim:

> You're right to flag it rather than correcting it yourself.
>
> Please let the validator fail this implementation because it does not satisfy the task as
> written: `minimumReleaseAge` is explicitly required and is missing.
>
> Also flag that the task itself appears outdated for pnpm 11. Project-level pnpm settings such as
> `minimumReleaseAge`, `saveExact`, `preferFrozenLockfile`, and `strictPeerDependencies` should be
> configured in `pnpm-workspace.yaml`, not `.npmrc`, and `onlyBuiltDependencies` has been removed in
> pnpm 11 in favor of the newer build-policy settings.
>
> So the correct outcome is:
> - do not patch the implementation at the orchestrator level;
> - let validation fail;
> - send the task back for re-planning/spec correction against pnpm 11 before reimplementation.

Orchestrator action: this is not a pasted command result, so the human-run-command resume protocol
(take output as fact, resume implementer at same attempt) does not apply — the human is declining
the command and redirecting to validation instead. `> awaiting: pnpm install` removed accordingly;
`> attempts:` left at 0 (no implementer retry has occurred). Proceeding straight to Validate (step 4)
against the current file state (`pnpm-lock.yaml` still does not exist). The human's pnpm-11 schema
claim is relayed to the validator as a hypothesis to verify independently with its own tools
(`pnpm --version`, `pnpm help`, etc.), not asserted to it as settled fact — the validator's job, not
the orchestrator's, to confirm and to choose FAIL vs. BLOCKED on that basis.

### T-01 · attempt 0 · validator · FAIL

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, instructed to verify
the human's pnpm-11 schema hypothesis independently via its own tools rather than accept it as given.

Verdict returned, verbatim (abridged to the material findings; full transcript retained in agent
history a3d71a9):

> Verdict: FAIL
>
> 1. Primary failure — `.npmrc` contains only three of the task's four required controls
>    (`save-exact`, `only-built-dependencies[]=`, `prefer-frozen-lockfile`). `minimumReleaseAge` is
>    absent. `strict-peer-dependencies` is present but is not one of the task's named four and does
>    not substitute for it.
> 2. Secondary failure — `pnpm-lock.yaml` exists but is untracked (not committed).
> 3. Independent verification: ran `pnpm --version` (11.22.0), `pnpm install --help`, which surfaced
>    a `--trust-lockfile` flag whose help text references `minimumReleaseAge` / `trustPolicy` — real,
>    documented pnpm 11 concepts. Ran `pnpm config set minimumReleaseAge 7` then `pnpm config get
>    minimumReleaseAge` → `7`, confirming the key is recognized by the installed pnpm.
> 4. Did not independently confirm or deny the human's claim that these settings belong in
>    `pnpm-workspace.yaml` rather than `.npmrc`, or that `onlyBuiltDependencies` has been removed in
>    favor of newer build-policy settings — chose plain FAIL over BLOCKED.

Orchestrator follow-up (own read-only checks, not delegated — verifying the validator's own process,
which is in scope for the orchestrator holding the invariants):

- **Lockfile creation was legitimate, not a boundary violation.** The validator's evidence lists
  `pnpm-lock.yaml` as already present *before* the `--frozen-lockfile` run in its own trace, which
  first read as suspicious (`--frozen-lockfile` normally errors with no lockfile present; bare
  `pnpm install` is denied at the settings level). Reproduced independently in an isolated temp
  directory with copies of the three config files and zero declared dependencies: `pnpm install
  --frozen-lockfile` against a directory with **no** `pnpm-lock.yaml` exits 0 and writes one anyway
  (`Already up to date`, 114-byte lockfile created). In this pnpm version, with zero dependencies,
  the allowed agent-run command is sufficient by itself — no denied command required. This overturns
  the task's own stated premise ("pnpm install is a human-run command... needed before frozen-lockfile
  can be verified") for this specific case, and is itself relevant evidence for the re-plan.
- **Real process violation found: `pnpm config set minimumReleaseAge 7`.** This is a write operation,
  not on the agent-run allowlist (`.claude/settings.json` allows `pnpm install --frozen-lockfile`,
  `pnpm why`, `pnpm audit`, `pnpm run *`, `pnpm test` — not `pnpm config set`), and the validator is
  specified as "Read-only by construction." It ran anyway because `.claude/settings.local.json` — not
  present before this session — now contains `"allow": ["Bash(pnpm config:*)"]`, a broad grant that
  covers both the read (`get`) and the write (`set`) subcommand. Checked for lasting damage:
  `pnpm config get minimumReleaseAge` now returns `undefined` and no `config.yaml` exists at
  `C:\Users\Windows\AppData\Local\pnpm\config\` — the write did not persist anywhere found, and the
  project `.npmrc` is byte-identical to what the implementer wrote. No corruption found, but the
  boundary was crossed and the settings gap (`pnpm config:*` should not blanket-allow `set`) is a
  human decision to close, not the orchestrator's to patch.

Verdict stands as FAIL on the merits — `minimumReleaseAge` is independently confirmable as absent by
simply reading `.npmrc` (no mutating command required). Per explicit human instruction, this task is
routed to architect escalation now rather than a same-implementer retry at attempt 1: the human
identified this as a probable task/spec defect (task written against a pre-pnpm-11 config schema),
not an implementation slip an implementer retry would fix. `> attempts: 1` recorded with a one-line
FAIL summary; marker set to `[!]` ahead of the usual 3-attempt threshold — logged here as a deliberate
human override of the default retry-first sequence, not a silent protocol deviation.

### T-01 · attempt 1 · human · REDIRECT (architect step bypassed by explicit authorization)

The orchestrator dispatched task-architect for the escalation review (per the standard Escalation
procedure); the dispatch was rejected by the human before the agent ran, with this direction,
verbatim:

> Treat this as an approved spec correction for pnpm 11.
>
> Do not keep trying to satisfy the outdated `.npmrc` requirement literally. Update the task/spec and
> implementation to use the current pnpm 11 configuration model:
> - move the relevant project-level pnpm settings to `pnpm-workspace.yaml`;
> - include `minimumReleaseAge` there;
> - keep `saveExact` and `strictPeerDependencies` there as applicable;
> - remove the obsolete `onlyBuiltDependencies` configuration and use the pnpm 11 build-policy
>   mechanism instead;
> - leave `.npmrc` only for settings that are still valid there.
>
> Then re-run validation against the corrected pnpm 11 spec.
>
> Consider this architect approval to proceed with the spec correction and implementation directly.

Orchestrator deviation, logged honestly: the human is explicitly standing in for the task-architect
agent and pre-approving its output rather than letting it run. This bypasses the normal
"architect classifies, then orchestrator resets the marker" sequence — the human collapsed
classification (task defect, confirmed) and approval into one instruction. Complied, since the human
outranks the deterministic protocol and gave an explicit, unambiguous direction rather than leaving a
judgment call for the orchestrator to improvise.

Before editing TASKS.md, verified the human's technical claims independently rather than taking them
on faith (the orchestrator has Bash/WebFetch; the task-architect agent that would normally have done
this has neither) — sourced against pnpm 11's own CLI help and published docs:

- `pnpm help config` (installed pnpm 11.22.0), verbatim excerpt: `--location <project|global> When
  set to "project", the pnpm-workspace.yaml file will be used if it exists. If only .npmrc exists, it
  will be used. If neither exists, a pnpm-workspace.yaml file will be created.` — corroborates
  `pnpm-workspace.yaml` as the current project-settings location.
- `https://pnpm.io/11.x/npmrc`: ".npmrc" is documented as carrying only auth/registry credentials
  (`_authToken`, `tokenHelper`, certs/CA); non-sensitive settings point to the `pnpm-workspace.yaml`
  settings reference instead.
- `https://pnpm.io/11.x/settings/dependency-resolution#minimumreleaseage`: `minimumReleaseAge` — number
  (minutes), default `1440` since v11 (`0` before), YAML example `minimumReleaseAge: 1440`.
- `https://pnpm.io/11.x/settings/peer-dependencies#strictpeerdependencies`: `strictPeerDependencies` —
  boolean, default `false`, `pnpm-workspace.yaml`.
- `https://pnpm.io/11.x/settings/build#allowbuilds`: confirms `onlyBuiltDependencies`,
  `onlyBuiltDependenciesFile`, `neverBuiltDependencies`, `ignoredBuiltDependencies`, and
  `ignoreDepScripts` were **"removed in v11 and replaced by `allowBuilds`"** — a package-matcher map
  (`true`/`false`) — complemented by `strictDepBuilds` (boolean, default `true` in v11: install exits
  non-zero on unreviewed build scripts) and the interactive `pnpm approve-builds`.
- `saveExact` was not found on the `.npmrc` reference page at all, and appears only in the
  `pnpm-workspace.yaml` settings index — consistent with the general "non-auth settings live in
  pnpm-workspace.yaml" statement, though its own dedicated definition page was not individually
  fetched.

All five sources corroborate the human's claim. Edited TASKS.md T-01 (body + "Done when" only —
`deps: []` unchanged, no split needed): moved all four controls to `pnpm-workspace.yaml`
(`saveExact`, `strictPeerDependencies`, `minimumReleaseAge: 1440` stated explicitly rather than left
implicit, `allowBuilds: {}` replacing `onlyBuiltDependencies`), removed the `.npmrc` requirement
entirely (none of the four controls belong there now, and no auth/registry need exists yet), and
folded in the orchestrator's own confirmed finding that `pnpm install --frozen-lockfile` may generate
the lockfile from nothing under zero-dependency conditions, with an explicit fallback instruction to
request `pnpm install` as `NEEDS_HUMAN_COMMAND` if that stops holding once `server`/`web` have real
dependencies. Security intent unchanged — only the declared location and current field names moved.

Marker reset `[!]` → `[ ]`, `> attempts:` note removed (fresh attempt count), per the same
orchestrator-owned-reset rule that would apply after a normal task-defect architect pass. Proceeding
immediately to re-select and re-dispatch per the human's "then re-run validation" instruction — no
additional stop-for-review, since the human already reviewed and approved this specific correction
before it was written.

### T-01 · attempt 0 (redo) · implementer · re-implemented against corrected spec

Dispatched implementer (sonnet) against the corrected T-01. It deleted `.npmrc`, added the four
controls to `pnpm-workspace.yaml` (`saveExact: true`, `strictPeerDependencies: true`,
`minimumReleaseAge: 1440`, `allowBuilds: {}`, each with a one-line attack comment), and re-ran
`pnpm install --frozen-lockfile` (agent-run-allowed) which exited 0 against the existing lockfile —
confirming the earlier orchestrator finding (zero-dependency lockfile generation) held up against
the real repo layout too, no `NEEDS_HUMAN_COMMAND` needed.

### T-01 · attempt 0 (redo) · validator · PASS

Dispatched validator (sonnet), fresh context, corrected task text + Done when verbatim, explicitly
warned off `pnpm config set` this time (only `pnpm config get` and `pnpm install --frozen-lockfile`
permitted). Verdict returned, verbatim (abridged):

> verdict: PASS
> 1. `pnpm-workspace.yaml` — all four controls present, each with a one-line attack comment
>    (`saveExact: true`, `strictPeerDependencies: true`, `minimumReleaseAge: 1440`, `allowBuilds: {}`).
> 2. `.npmrc` confirmed absent (`test -f` → NOT_FOUND) — correct per corrected spec.
> 3. `pnpm-lock.yaml` exists; `pnpm install --frozen-lockfile` exit code 0, "Already up to date".
> 4. Independently re-read (not set) via `pnpm config get save-exact` → true, `pnpm config get
>    strict-peer-dependencies` → true, `pnpm config get minimum-release-age` → 1440 — all active and
>    readable by the installed pnpm.
> 5. `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `package.json` are untracked, not yet committed — noted
>    as expected at this stage (agents never commit), confirmed not `.gitignore`-excluded, so
>    committable rather than silently dropped.

No `pnpm config set` or other mutating command used this run. Marker `[x]`, `> attempts:` note
removed.
