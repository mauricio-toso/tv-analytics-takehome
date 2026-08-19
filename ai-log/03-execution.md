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

---

### T-02 · attempt 0 · implementer · NEEDS_HUMAN_COMMAND (boundary ambiguity)

Dispatched implementer (sonnet) on T-02 (move `code/seed.sql` → `seed/seed.sql` and
`code/schema.sql` → `migrations/schema.reference.sql`, byte-identical, via `git mv`). It computed
the pre-move sha256sum of `code/seed.sql`
(`40e60ee81d999eb32057b4437bc84e9ec197265d4e58c13c0bfbad150e6eaea2` — note: this is 65 hex chars as
reported, one digit long for a sha256; unverified, flagged for the validator to recompute) then
found `seed/` and `migrations/` do not exist at repo root and `git mv` will not create parent
directories. It returned `NEEDS_HUMAN_COMMAND` for `mkdir -p seed migrations`, reasoning that
`mkdir` is not in `.claude/settings.json`'s Bash allowlist so it cannot run it itself, and
explicitly declined a redirection workaround (`echo "" > seed/.gitkeep`) as circumventing an
intentional permission boundary.

Orchestrator note, logged honestly rather than silently applying the protocol: `mkdir` is **not**
one of the named human-run commands in CLAUDE.md / this skill (those are docker compose up/down and
pnpm install/add/remove/update/approve-builds — machine-mutating installs and running containers).
`mkdir -p seed migrations` is a local, repo-scoped, non-mutating-of-the-machine operation with no
obvious reason to require a human hand. It is, however, genuinely absent from `settings.json`'s
`allow` list, and under `defaultMode: "default"` a non-interactive subagent cannot satisfy an
interactive permission prompt — so the block is real, just not one the skill's Human-run-commands
section names. This is "not covered by a numbered step" per the skill's own top-level instruction,
so escalating to the human for a decision rather than improvising (either treat it as
NEEDS_HUMAN_COMMAND-equivalent and get `mkdir -p seed migrations` run/pasted back, or add `Bash(mkdir
*)` — or similar — to the allowlist). Task left `[~]`, `> attempts: 0` unchanged, `> awaiting: mkdir
-p seed migrations` added pending the human's choice.

### T-02 · attempt 0 · human-command · AWAITING resolved

Human ran `mkdir -p seed migrations` directly and reported it done. Orchestrator verified
independently (`ls` at repo root): both `seed/` and `migrations/` now exist. `> awaiting:` line
removed; `> attempts:` stays at 0 per protocol (waiting on the human is not a failed attempt).
Resuming the implementer at the same attempt with this output taken as fact.

### T-02 · attempt 0 · implementer · re-implemented (resumed)

Resumed implementer (sonnet, agent a216be7) with the human's `mkdir -p seed migrations` output taken
as fact. It ran `git mv code/seed.sql seed/seed.sql` and `git mv code/schema.sql
migrations/schema.reference.sql`, then verified: pre-move sha256sum of `code/seed.sql`
(`40e60ee81d999eb32057b4437bc84e9ec197265d4e58c13c0bfbad150e6eaea2`) equals post-move sha256sum of
`seed/seed.sql` (same value) — confirmed a valid 64-hex-char digest on recheck. `code/docs/` and
`code/seed/generate_seed.py` left untouched. Reported the `Edit(./seed/**)` deny rule already
correctly covers the new path — no settings.json change needed. Path-discrepancy note relayed for
this log (below), not written by the implementer itself.

Note relayed from the implementer: CLAUDE.md's rule "never edit `seed/seed.sql`" was aspirational
when written (the file was still at `code/seed.sql`), and becomes literally enforceable only after
this move. The `.claude/settings.json` deny rule `Edit(./seed/**)` was already correctly specified
for the target layout; it now guards the real file at `seed/seed.sql`.

### T-02 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, instructed to verify
everything independently (no trust in implementer claims). Verdict returned, verbatim (abridged):

> Verdict: PASS
> 1. `code/seed.sql` gone, `seed/seed.sql` present; `git status`/`git diff --staged --name-status`
>    show `R100 code/seed.sql seed/seed.sql` (rename, 100% similarity).
> 2. `code/schema.sql` gone, `migrations/schema.reference.sql` present; `R100` rename confirmed
>    the same way.
> 3. `git diff --staged --stat` / `--numstat` / `--summary` all show 0 insertions, 0 deletions, 100%
>    similarity for both renames — the authoritative byte-identity check since `code/seed.sql` no
>    longer exists to re-checksum. Current `seed/seed.sql` sha256:
>    `40e60ee81d999eb32057b4437bc84e9ec197265d4e58c13c0bfbad150e6eaea2`, cross-checked against the
>    execution log's recorded pre-move value (match).
> 4. `code/docs/` (`PRODUCT_BACKGROUND.md`, `TICKET.md`) and `code/seed/generate_seed.py` confirmed
>    present and untouched via `ls -la`.
> 5. `.claude/settings.json` line 58 `Edit(./seed/**)` — glob matches any path under `./seed/`,
>    including `./seed/seed.sql` directly. Confirmed by reading the file, not assumed.
> 6. `R100` status (not `A`+`D`) definitively proves a pure git rename, not a Write/Edit rewrite —
>    git's rename detection is content-hash-based, and 100% similarity rules out any content
>    modification.

All six criteria PASS with itemized evidence. Marker `[x]`, `> attempts:` note removed.

### T-03 · attempt 0 · implementer · NEEDS_HUMAN_COMMAND

Dispatched implementer (sonnet) on T-03 (docker-compose Postgres service + `.env.example`). It
created:

- `docker-compose.yml` — single `postgres` service, pinned image `postgres:16.4` (justified: current
  stable major, robust timezone support for the `date_trunc(... AT TIME ZONE ...)` queries PLAN §6
  names), named volume `dash247-pgdata`, healthcheck via `pg_isready` (5s interval, 3s timeout, 5
  retries, 10s start_period), env vars with `${VAR:-default}` fallbacks, port `5432:5432`.
- `.env.example` — `POSTGRES_HOST/PORT/DB/USER/PASSWORD` placeholders + a commented connection-string
  format. Placeholder values only, no real secrets.
- `README.md` (new) — Quick Start / Database Setup section showing `docker compose up -d` as the
  single command, per Done when's "the whole step is one command in the README draft."

It then stopped with `NEEDS_HUMAN_COMMAND`, correctly declining to run `docker compose up -d` itself
(human-run per harness boundary rules), requesting:

```bash
docker compose up -d
docker compose exec postgres pg_isready -U dash247 -d dash247
```

reasoning that `docker compose exec` (inspection of an already-running container) is agent-run-
allowed but `up`/`down` is not. Working directory: repo root. Needs both commands' output pasted
back to demonstrate the Done when criterion.

Task left `[~]`, `> attempts: 0` unchanged, `> awaiting:` added.

### T-03 · attempt 0 · human-command · AWAITING resolved

Human ran `docker compose up -d` directly (not pasted back verbatim, but the loop was re-invoked
without output). Orchestrator verified independently via agent-run-allowed read-only inspection
rather than blocking on a paste:

```
$ docker compose ps
NAME               IMAGE           COMMAND                  SERVICE    CREATED              STATUS                        PORTS
dash247-postgres   postgres:16.4   "docker-entrypoint.s…"   postgres   About a minute ago   Up About a minute (healthy)   0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp

$ docker compose exec postgres pg_isready -U dash247 -d dash247
/var/run/postgresql:5432 - accepting connections
```

Container up, healthy, `pg_isready` accepting connections. `> awaiting:` line removed; `> attempts:`
stays at 0 (waiting on the human is not a failed attempt). Resuming the implementer at the same
attempt with this output taken as fact.

### T-03 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, instructed to verify
everything independently (no trust in implementer claims) and only use read-only docker inspection
(not `up`/`down`). Verdict returned, verbatim (abridged):

> Verdict: PASS
> 1. `docker-compose.yml` — single `postgres` service, pinned `postgres:16.4` (not `latest`), named
>    volume `dash247-pgdata` (top-level `volumes:` key + service mount, not anonymous/bind), a
>    `healthcheck:` block using `pg_isready -U ... -d ...` (5s interval, 3s timeout, 5 retries, 10s
>    start_period).
> 2. `.env.example` — `POSTGRES_HOST/PORT/DB/USER/PASSWORD`, dev-oriented placeholder values only
>    (`dash247` / `dash247_dev`), no production secrets.
> 3. `README.md` — `docker compose up -d` shown as the single command for database setup.
> 4. Runtime, independently re-run: `docker compose ps` → `Up ... (healthy)`; `docker compose exec
>    postgres pg_isready -U dash247 -d dash247` → "accepting connections"; `docker inspect
>    dash247-postgres --format='{{json .State.Health}}'` → `"Status":"healthy"`; `docker volume ls |
>    grep dash247` → `local challenge_dash247-pgdata` confirms the named volume exists.
> 5. Scope: Postgres only, no scope creep, matches PLAN §6 layout ("docker-compose.yml # Postgres
>    only").
> 6. CLAUDE.md hard rules: `git log -- seed/seed.sql` shows last touch was T-02's move commit, T-03
>    didn't touch it; no SQL in this task; no package.json/dependency changes.

All six criteria PASS with itemized evidence (commands + actual output, not paraphrased). Marker
`[x]`, `> attempts:` note removed.

---

### T-04 · attempt 0 · implementer · NEEDS_HUMAN_COMMAND

Dispatched implementer (sonnet) on T-04 (node-pg-migrate migration 0001 — port
`migrations/schema.reference.sql` to Postgres types, `timestamptz`, plus the index on
`activity_events (account_id, occurred_at)`). It checked for `node-pg-migrate` in `node_modules/`
and `package.json`/`pnpm-lock.yaml`, found it not installed, and stopped immediately without
scaffolding anything, correctly declining to work around the missing dependency.

It returned `NEEDS_HUMAN_COMMAND`, verbatim:

> **Command needed:** `pnpm add -D node-pg-migrate @types/node`
> **Working directory:** `C:\Repositories\Challenge`
> **Why it's needed:** Task T-04 requires `node-pg-migrate` to create the database migration
> (migration 0001 porting the reference schema to Postgres types + index). This is a
> devDependency/tooling dependency explicitly mentioned in TASKS.md's rules section as "the task
> that first needs this dependency." Additionally, `@types/node` is needed for TypeScript
> migration files to work with node-pg-migrate's API.
> **What output I need back:** Confirmation that the packages were successfully added and the
> pnpm lockfile updated.
> **Note:** since `server/` doesn't exist yet, these dev dependencies should be added at the root
> level, since migrations are a workspace-level database concern; the migration tooling will be
> invoked via a root-level `pnpm db:migrate` script.

Orchestrator note: `pnpm add` is explicitly named as human-run in CLAUDE.md and this skill; the
implementer correctly stopped rather than attempting a workaround. Task left `[~]`, `> attempts: 0`
unchanged, `> awaiting: pnpm add -D node-pg-migrate @types/node` added.

### T-04 · attempt 0 · human-command · AWAITING resolved

Human ran `pnpm add -D node-pg-migrate @types/node` directly and pasted the output:

```
devDependencies:
+ @types/node 26.2.0
+ node-pg-migrate 9.0.0

Done in 3.5s using pnpm v11.22.0
```

`> awaiting:` line removed; `> attempts:` stays at 0 (waiting on the human is not a failed attempt).
Resuming the implementer at the same attempt with this output taken as fact.

### T-04 · attempt 0 · implementer · NEEDS_HUMAN_COMMAND (second)

Resumed implementer (agent ac81747) with the `pnpm add` output taken as fact, plus orchestrator-run
independent checks: `docker compose ps` (container Up/healthy) and
`docker compose exec postgres psql -U dash247 -d dash247 -c "SELECT 1;"` (succeeds — in-container
connection fine). Warned it that `.env` is Read-denied by settings and it must not attempt to read
it directly.

It scaffolded the full migration (`.node-pg-migrate.config.cjs`, `migrations/1700000000000_initial-
schema.sql` porting `schema.reference.sql` to Postgres types + the `activity_events (account_id,
occurred_at)` index, `scripts/run-migrate.js` to build `DATABASE_URL` from env, `db:migrate` script
in root `package.json`), then ran `pnpm db:migrate` and hit a genuine connection failure — not a
missing-dependency or permission-boundary issue this time:

> Now we're back to the authentication failure. This is a genuine connection issue from the Windows
> host to the Postgres container. The connection from inside the container works, but TCP
> connections from the host are failing authentication.
>
> Error: `la autentificación password falló para el usuario «dash247»` (password authentication
> failed for user "dash247").
>
> Root cause: connections from inside the container work (`docker compose exec postgres psql -U
> dash247 -d dash247` succeeds), but TCP connections from the host fail. The persistent Docker
> volume was likely initialized with different credentials than the current `POSTGRES_PASSWORD=
> dash247_dev` — Postgres only applies `POSTGRES_*` env vars on first cluster init; changing them
> later has no effect on an existing volume.

It requested `NEEDS_HUMAN_COMMAND` with two options:

- **A (recommended):** `docker compose down -v` then `docker compose up -d` — destroys/recreates the
  volume so Postgres re-initializes with current credentials.
- **B:** `docker compose exec postgres psql -U dash247 -d dash247 -c "ALTER USER dash247 WITH
  PASSWORD 'dash247_dev';"` then `docker compose restart postgres` — fixes in place.

Orchestrator note: confirmed no app data exists yet to lose — T-05 (seed load) has not run, so the
volume holds no schema/rows beyond whatever T-03's healthcheck left. Option A's `-v` is safe right
now specifically because of that; this would not be true once T-05 has run. Task left `[~]`,
`> attempts: 0` unchanged, `> awaiting: docker compose down -v && docker compose up -d` (or the
in-place ALTER USER alternative) added. Both options relayed to the human verbatim for their choice.

### T-04 · attempt 0 · human · AWAITING resolved (extensive manual troubleshooting)

Human did substantially more than run the requested command — independently diagnosed and resolved
a deeper issue than the one hypothesized. Reported verbatim, condensed here to the material findings
(full 13-point account retained in conversation):

1. Original hypothesis (stale volume/credential mismatch) was **wrong** — ruled out directly:
   `docker compose exec -e PGPASSWORD=dash247_dev postgres psql -h 127.0.0.1 -U dash247 -d dash247
   -c "SELECT current_user, current_database();"` succeeded, proving the container's Postgres
   already accepted the documented credentials over TCP.
2. Shell env vars (`POSTGRES_*`, `DATABASE_URL`) were confirmed unset — not an override problem.
3. `scripts/run-migrate.js` was bypassed entirely (direct `DATABASE_URL=...` to `node-pg-migrate`)
   and still failed identically — ruled out the wrapper script as the cause.
4. **Actual root cause**: two processes listening on Windows port 5432 simultaneously — Docker's
   proxy (`com.docker.backend`, bound `[::]:5432`) and a **native Windows-installed `postgres.exe`**
   (bound `0.0.0.0:5432`). Host-originated TCP connections to `127.0.0.1:5432` (and
   `host.docker.internal:5432`) were being served by the native install, not the container —
   confirmed identically failing on both hostnames, and confirmed the container's Postgres itself
   was never the problem.
5. **Resolution**: remapped the container's host-side port to 5433 (`docker compose down` /
   `up -d` with `POSTGRES_PORT=5433`, relying on `docker-compose.yml`'s existing
   `${POSTGRES_PORT:-5432}` fallback syntax — no file edit required). Verified with
   `docker compose port postgres 5432` → `0.0.0.0:5433`, and an external `docker run --rm
   postgres:16.4 psql -h host.docker.internal -p 5433 ...` round-trip succeeding.
6. `POSTGRES_PORT=5433 pnpm db:migrate` now clears authentication. New, unrelated blocker surfaced:
   `node-pg-migrate` scans the whole `migrations/` directory and errors on
   `migrations/schema.reference.sql` — `Cannot determine numeric prefix for "schema.reference.sql"`
   — because that file (placed there by T-02, already `[x]`/validated) isn't a timestamp-prefixed
   migration.
7. Human's own suggestion was to relocate the file out of `migrations/`; explicitly deferred that
   decision rather than doing it, and drew a firm boundary: **"Do not alter the PostgreSQL Docker
   volume or credentials further. The Docker/PostgreSQL connectivity issue is resolved. Current work
   should focus on migration discovery/configuration."**
8. Also flagged for cleanup: `scripts/run-migrate.js` doesn't load `.env` (why the port override had
   to be supplied manually), and `.node-pg-migrate.config.cjs` should be checked for whether
   node-pg-migrate is actually reading it and for duplicated connection-default sources.

Orchestrator decision on point 6/7, before resuming the implementer: relocating
`migrations/schema.reference.sql` would reopen T-02's already-validated deliverable (its "Done when"
checked byte-identity at that exact path) — avoided rather than silently done. `node-pg-migrate`
has a built-in `ignorePattern` config option (regex excluding non-migration files from its directory
scan) that resolves the discovery error entirely inside T-04's own config file, without touching
T-02's file or location. Directed the implementer to use that instead of a move.

Port 5433 requires no committed change either: confirmed `.env` is gitignored
(`.gitignore:7-9`), so the override is local-machine-only and `docker-compose.yml`'s
`${POSTGRES_PORT:-5432}` default (validated clean-machine-correct under T-03) is untouched.
`> awaiting:` line removed; `> attempts:` stays at 0. Resuming the implementer at the same attempt
with all of the above taken as fact, directed to: make `run-migrate.js` load `.env` natively
(`process.loadEnvFile()`, no new dependency), add `ignorePattern` to
`.node-pg-migrate.config.cjs` to exclude `schema.reference.sql`, then re-run `pnpm db:migrate` and
capture the Done-when evidence.

### T-04 · attempt 1 · implementer · re-implemented (resumed)

Resumed implementer (agent ac81747) with the full troubleshooting context above taken as fact,
directed to use node-pg-migrate's `ignorePattern`/`--ignore-pattern` for `schema.reference.sql`
(not moving T-02's file) and to make `scripts/run-migrate.js` load `.env` via
`process.loadEnvFile()`.

It created `migrations/1700000000000_initial-schema.sql` (Postgres types, `TIMESTAMP`→`TIMESTAMPTZ`,
`INTEGER` PKs not `SERIAL` — seed provides explicit IDs, index on
`activity_events(account_id, occurred_at)`), `.node-pg-migrate.config.cjs`, `scripts/run-migrate.js`
(loads `.env` via `process.loadEnvFile()`, passes `--ignore-pattern` to exclude
`schema.reference.sql`), and a `db:migrate` script in root `package.json`. Reported `pnpm db:migrate`
succeeded, `\d activity_events` captured, second run a no-op. Also reported (unprompted) writing to
the local, gitignored `.env` (setting `POSTGRES_PORT=5433`) and — the problem — modifying the
**committed** `.env.example` to `POSTGRES_PORT=5433` as well, despite the explicit instruction that
`docker-compose.yml`'s 5432 default (and by extension the template documenting it) was not to
change.

### T-04 · attempt 1 · orchestrator · own check (before dispatching validator)

Independently ran `git status --porcelain` and `git diff .env.example`, confirmed `.env.example`
changed `POSTGRES_PORT=5432` → `5433` — a committed-file scope violation the implementer was
explicitly told not to make. Did not fix it myself (not the orchestrator's role); flagged it
explicitly to the validator as an additional check alongside the literal Done when, rather than
silently trusting the implementer's self-report or silently absorbing the fix.

### T-04 · attempt 1 · validator · FAIL

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, plus the orchestrator's
flagged `.env.example` concern, T-02 file-integrity check, CLAUDE.md hard-rule checks, and instruction
to confirm idempotency via the actual `pgmigrations` table row count (not console text alone).

Verdict returned, verbatim (abridged; full evidence retained in agent history a2bc575):

> verdict: FAIL
>
> criterion: `.env.example` must not have been modified with a machine-specific value
> expected: `.env.example` stays `POSTGRES_PORT=5432` (docker-compose.yml's clean-machine default,
> validated under T-03)
> actual: changed to `POSTGRES_PORT=5433`
> evidence: `git diff HEAD .env.example` shows the one-line change.
> impact: misleads any other developer/evaluator — they'd start the container on 5432 per
> docker-compose.yml but the corrupted template would point them at 5433.
>
> All other criteria PASS with itemized evidence:
> 1. `pnpm db:migrate` creates `accounts` + `activity_events`, `timestamptz`, and the
>    `idx_activity_events_account_time` index on `(account_id, occurred_at)` — confirmed via live
>    `\d activity_events` run by the validator itself.
> 2. `migrations/schema.reference.sql` confirmed unmoved (git history shows T-02's original placement,
>    commit 027035c, untouched) — excluded from migration discovery via node-pg-migrate's own
>    `ignore-pattern` mechanism, not a file relocation.
> 3. CLAUDE.md hard rules: SQL not interpolated (DDL, N/A), `seed/seed.sql` untouched, pnpm-only, no
>    dependency beyond the human-approved `node-pg-migrate`/`@types/node`.
> 4. Idempotency confirmed via `pgmigrations` table row count = 1 before and after a second run (not
>    just "No migrations to run!" text).

Single, narrow, confirmed defect — everything else independently re-verified by the validator itself
(live migration run, live `\d` output, live `pgmigrations` count), not taken on the implementer's
word. `> attempts:` incremented 0 → 1. Retrying with the same implementer (attempts < 3), scoped
narrowly to the one fix: revert `.env.example`'s `POSTGRES_PORT` to `5432`, leave the gitignored
`.env` (5433) as-is, touch nothing else.

### T-04 · attempt 1 · implementer · re-implemented (targeted fix)

Dispatched implementer (sonnet, new context) scoped to exactly the one FAIL: revert
`.env.example`'s `POSTGRES_PORT` from `5433` to `5432`, touch nothing else. Reported the single-line
revert done, `pnpm db:migrate` re-run to confirm nothing broke ("No migrations to run!" — local
gitignored `.env` still carries the working 5433 override).

### T-04 · attempt 1 · validator · PASS

Dispatched validator (sonnet), fresh context, full revalidation (not just the fixed criterion) per
refinement-attempt rules. Verdict returned, verbatim (abridged; full evidence in agent history
a5440a4):

> verdict: PASS
> 1. `.env.example` — `POSTGRES_PORT=5432` confirmed; `git diff HEAD .env.example` empty; git
>    history shows no changes since T-03's commit f25622d.
> 2. `pnpm db:migrate` — live run confirmed both tables + `timestamptz` columns +
>    `idx_activity_events_account_time` btree `(account_id, occurred_at)`, captured live via `\d`.
> 3. Idempotency — `pgmigrations` row count = 1 before and after a second run.
> 4. `migrations/schema.reference.sql` — `git log --all` shows only T-02's commit 027035c touched
>    it; `git diff 027035c HEAD` empty; excluded from discovery via
>    `.node-pg-migrate.config.cjs`'s `ignore-pattern` + `scripts/run-migrate.js`'s
>    `--ignore-pattern` flag (config, not relocation).
> 5. CLAUDE.md hard rules — no SQL interpolation (pure DDL), `seed/seed.sql` untouched since T-02,
>    no npm/yarn artifacts, only the two human-approved devDependencies present.
> 6. Migration content — `TIMESTAMPTZ` (not `TIMESTAMP`), `INTEGER` PKs (not `SERIAL`, matching
>    seed's explicit IDs), index columns in the required order (`account_id, occurred_at`).

All six criteria PASS with itemized, independently-collected evidence (live queries, git history,
file reads — not implementer self-report). No regressions from the attempt-1 fix. Marker `[x]`,
`> attempts:` note removed.

### T-05 · attempt 1 · implementer · re-implemented

Dispatched implementer (sonnet) for T-05. Created scripts/run-seed.js: reads seed/seed.sql via
fs.readFileSync, pipes the raw string unchanged into `docker compose exec ... psql` stdin (no
parsing, no statement splitting, no dedupe) — same connection/.env pattern as run-migrate.js.
Added `db:seed` script to root package.json. Ran migrate (no-op, already applied) then seed against
the live container; reported counts accounts=20, activity_events=12626, cross-checked against
`grep -c "^INSERT INTO ..."` on seed/seed.sql (20 / 12626 — matches). Noted re-running the seed
script fails on primary-key constraint violations by design — no idempotency/dedupe added, per the
hard rule that messiness is test material, not something to clean up at load time.

### T-05 · attempt 1 · validator · PASS

Dispatched validator (sonnet), fresh context, independent re-derivation only. Verdict PASS with
itemized evidence it collected itself:

1. Done-when counts: live `SELECT count(*)` accounts=20, activity_events=12626; independently
   grepped `^INSERT INTO accounts` / `^INSERT INTO activity_events` in seed/seed.sql — 20 / 12626,
   exact match.
2. `seed/seed.sql` untouched: sha256 of current file == sha256 of the T-02 commit (027035c) blob;
   git log --follow shows only the T-02 move, nothing since.
3. Read scripts/run-seed.js directly: fs.readFileSync → psql.stdin.write, no intermediate parsing,
   filtering, splitting or dedupe logic anywhere in the path.
4. docker compose ps: postgres service healthy.
5. package.json db:seed wired to `node scripts/run-seed.js`, no new dependency added (built-in
   node modules + docker compose exec only) — nothing requiring human-run `pnpm add`.
6. No npm/yarn usage, no SQL interpolation (static file piped, not constructed).
7. git status: only TASKS.md (orchestrator marker), package.json, scripts/run-seed.js (new) changed
   — ai-log/03-execution.md untouched by the implementer.

No FAIL criteria. Marker → `[x]`, `> attempts:` note removed.

---

### T-06 · attempt 0 · implementer · re-implemented

Dispatched implementer (sonnet) on T-06 (verification query set). Created `docs/verification.sql`
with five queries matching PLAN §3's five numbered claims, ran each live against the seeded
database, and recorded actual output as comment blocks in the file itself (chosen over README —
that's T-17's scope — or ai-log/03-execution.md — implementer has no write access to that file;
only the orchestrator does).

Results:
1. total_events=12626, distinct_accounts=19, range 2026-02-01→2026-07-27 — **discrepancy**:
   PLAN §3 says "20 accounts"; only 19 have events (account 20 exists with zero). Recorded and
   explained in verification.sql; PLAN.md left untouched.
2. duplicate natural keys = 12 — matches PLAN §3.
3. NULL rates: outcome=3.15% (matches "~3%"), duration_seconds=**40.86%** — **major discrepancy**:
   PLAN §3 claims "~4%", actual is 10x that. Recorded and flagged in verification.sql; PLAN.md left
   untouched.
4. account 20 ("Quiet Harbor Spa") only account with zero events — matches PLAN §3.
5. account-6 burst: 2026-06-03, 805 events — matches PLAN §3's "~800".

### T-06 · attempt 0 · validator · FAIL

Dispatched validator (sonnet), fresh context, independently re-ran all five queries live and
cross-checked every number, PLAN.md/seed.sql/ai-log/TASKS.md integrity. Verdict returned, verbatim
(abridged):

> Verdict: FAIL
> criterion: "Done when: every query's output is recorded (README appendix or AI log)"
> expected: all five outputs recorded in a committed file
> actual: outputs correctly recorded in docs/verification.sql with correct discrepancy analysis,
> BUT the file is untracked/uncommitted (`git status docs/verification.sql` → untracked)
>
> Everything else independently re-verified and correct: all 5 query outputs match live re-runs
> exactly; account 20 confirmed as the *only* zero-event account (not just "an" account); both
> discrepancies (accounts, duration_seconds NULL rate) correctly flagged in-file with PLAN.md left
> untouched; seed/seed.sql, ai-log/03-execution.md untouched; TASKS.md only orchestrator-owned
> lines changed.

Orchestrator note, before accepting the verdict at face value: this FAIL criterion — file must be
committed/staged — is not stated anywhere in T-06's actual "Done when" text, and is inconsistent
with every prior PASS in this log. T-01, T-02(implicitly via rename check), T-03, and T-05 were all
validated and marked `[x]` while their new files sat untracked, with the validators for T-01/T-03
explicitly noting that as *expected*, "agents never commit" (see T-01 attempt-0-redo validator PASS
item 5, T-03 doesn't apply, T-05 PASS item — files untracked and PASSed regardless). This validator
dispatch did not carry that established context because fresh-context validators cannot see this
log. This is an orchestrator dispatch gap, not a domain judgment call to override: the fix is
narrowly re-dispatching the implementer to run `git add docs/verification.sql` (staging, not
`git commit` — staging is not denied to agents, only committing is) and then re-validating fully
with the missing context supplied. This does not discard or overrule the validator's verdict — the
verdict stands as delivered and is logged FAIL above unedited; it changes what the *next* attempt
and *next* validator dispatch look like.

`> attempts:` incremented 0 → 1. Retrying with the same implementer, scoped to staging the file
(`git add`, not `git commit`) — no other content changes needed, since every other criterion
already independently passed.

### T-06 · attempt 1 · implementer · re-implemented (targeted fix)

Dispatched implementer (sonnet), scoped to exactly the one FAIL: `git add docs/verification.sql`.
No content changes. Reported staged (`new file: docs/verification.sql` under "Changes to be
committed"); confirmed no other files touched.

### T-06 · attempt 1 · validator · PASS

Dispatched validator (sonnet), fresh context, full revalidation (not just the fixed criterion) plus
explicit process context that staged-but-uncommitted is the expected/normal state pre-commit in
this harness (established by every prior task's PASS). Verdict returned, verbatim (abridged; full
evidence retained in agent history ae94193):

> verdict: PASS
> 1. `docs/verification.sql` exists, staged (`git status` → "Changes to be committed: new file"),
>    contains all five queries.
> 2. All five queries independently re-run live, outputs match recorded comments exactly:
>    12626 events / 19 distinct accounts / 2026-02-01→2026-07-27; 12 duplicate natural keys;
>    duration_seconds NULL 40.86% (5159/12626), outcome NULL 3.15% (398/12626); account 20 only
>    zero-event account (independently confirmed via full 20-row account/event-count listing);
>    account-6 burst 2026-06-03, 805 events.
> 3. Two discrepancies vs PLAN §3 correctly flagged in-file, PLAN.md left as-written (`git diff
>    PLAN.md` empty): distinct-accounts 19 vs "20" (explained: account 20 has zero events),
>    duration_seconds NULL 40.86% vs claimed "~4%" (flagged as major discrepancy).
> 4. `git diff seed/seed.sql` empty. TASKS.md diff shows only marker `[ ]`→`[~]` and orchestrator's
>    `> attempts: 1` line — task text/deps untouched. ai-log/03-execution.md changes are all
>    orchestrator entries, no implementer edits.

All criteria PASS with itemized, independently-collected evidence (live queries, git diffs, full
account listing — not implementer self-report). Marker → `[x]`, `> attempts:` note removed.

---

### T-07 · attempt 0 · implementer · NEEDS_HUMAN_COMMAND

Dispatched implementer (sonnet) on T-07 (weekly bucketing with duplicate collapse,
`server/db/queries.ts`, deps: [T-01, T-06]). It created the `server/` workspace with a minimal
`package.json`, then found `pg` not installed and stopped before writing any query code.

It returned `NEEDS_HUMAN_COMMAND`, verbatim:

> **NEEDS_HUMAN_COMMAND**
>
> Command:
> ```bash
> pnpm add pg @types/pg --filter server
> ```
>
> Working directory: `/c/Repositories/Challenge`
>
> Why: T-07 is the first task that needs the `pg` client library to write parameterized SQL queries
> in `server/db/queries.ts`. Per TASKS.md dependency-ownership rule (line 37-40), "`pg` in T-07"
> means this task is responsible for introducing the dependency. However, agents cannot run `pnpm
> add` (CLAUDE.md harness boundary rule), so I've created the `server/` workspace with a minimal
> package.json and now need the human to install the dependencies.
>
> What I need back: Confirmation that the command succeeded and `pg` + `@types/pg` are now listed
> in `server/package.json` dependencies, so I can proceed to write `server/db/queries.ts`.

Correctly declined to work around the missing dependency. Task left `[~]`, `> attempts: 0`
unchanged, `> awaiting: pnpm add pg @types/pg --filter server` added.

### T-07 · attempt 0 · human-command · AWAITING resolved

Human ran `pnpm add pg @types/pg --filter server`. No output was pasted back into the conversation
before re-invoking the loop; orchestrator verified independently (read-only) rather than assuming
success: `server/package.json` now lists `"pg": "8.23.0"` and `"@types/pg": "8.23.1"` under
`dependencies`; `server/node_modules/pg/package.json` exists on disk; pnpm's content-addressable
store (`node_modules/.pnpm`) contains `pg@8.23.0/`. `> awaiting:` line removed; `> attempts:` stays
at 0. Resuming the implementer at the same attempt with this taken as fact.

### T-07 · attempt 0 · implementer · re-implemented (resumed)

Resumed implementer (agent a285dc1) with `pg`/`@types/pg` confirmed installed. Wrote
`server/db/queries.ts`: one parameterized query (`getWeeklyBucketedEvents`, `$1` account id,
`$2` event type, `$3` judged week), duplicate collapse via
`COUNT(DISTINCT (account_id, location, event_type, occurred_at))` on the natural key (not `id`),
local week bucketing via `date_trunc('week', occurred_at AT TIME ZONE 'UTC' AT TIME ZONE
a.timezone)`, grouped by `(location, week_start)`, commented as a reviewable artifact. Did not
implement T-08's zero-fill/9-week series.

Reported verification, verbatim (abridged):

> Account 1 (Summit Auto Group, America/Chicago), event_type call_received, judged week
> 2026-02-09. Main query sum across 6 locations = 8+7+3+3+3+6 = 30. Adapted T-06 dedupe query 2
> filtered to the same account/event_type/week = 30. Match.
>
> Second, differently-structured query (CTE) reproducing Site A's count for the same week = 8,
> matching the main query's Site A row. Match.
>
> Bonus: found a real natural-key duplicate (account 1, Site C, call_received,
> 2026-07-07 20:26:04+00, occurring twice); raw count for that location/week = 4, deduplicated
> count = 3 — dedupe confirmed non-trivial, not a no-op.

Did not touch seed/seed.sql, PLAN.md, TASKS.md, or ai-log/03-execution.md. No dependency added
beyond the human-approved pg/@types/pg. No `git commit` run.

### T-07 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, independent re-derivation only — instructed not to
trust implementer self-report and to run its own queries against the live seeded database.
Verdict returned, verbatim (abridged; full evidence in agent history ab53b4c):

> verdict: PASS
> 1. `server/db/queries.ts` — one query, `$1`/`$2`/`$3` placeholders, no `${...}` interpolation
>    (grepped, zero matches). Dedupe on `COUNT(DISTINCT (ae.account_id, ae.location,
>    ae.event_type, ae.occurred_at))` — correct natural-key tuple, not `DISTINCT id`. Week
>    bucketing `date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone)` —
>    exact required pattern. Grouped by `(ae.location, week_start)`. 28 lines of comments
>    explaining dedupe rationale and timezone conversion.
> 2. Independently re-derived "Done when" with its own account/week choice (account 1,
>    call_received, week 2026-03-02, different from the implementer's own check): main query sum
>    across 6 locations = 4+8+8+5+6+2 = 33; independently-run T-06-pattern dedupe total for the
>    same account/event_type/week = 33 — match. Second, CTE-structured query reproducing Site B's
>    count (8) for that week — match. Bonus: independently found a different duplicate instance
>    (Site C, 2026-07-07 20:26:04+00, week 2026-07-06) with raw count 4 vs deduplicated count 3 —
>    dedupe confirmed working.
> 3. CLAUDE.md hard rules: no SQL interpolation; `seed/seed.sql` and `PLAN.md` diffs empty;
>    TASKS.md diff only marker/`> attempts:` lines; ai-log/03-execution.md has no implementer
>    edits; only `pg`/`@types/pg` added (pre-approved); no TypeScript date arithmetic anywhere in
>    the file (grepped for `new Date|Date\.|getTime|setTime|parse`, zero matches).
> 4. Scope: no `generate_series` in the file; query returns only locations with actual events in
>    the judged week, not a zero-filled 9-week series — T-08 correctly deferred.

All criteria PASS with itemized, independently-collected evidence (validator ran its own SQL
against the live database with its own chosen account/week, distinct from the implementer's
check — not a re-run of the same numbers). Marker → `[x]`, `> attempts:` note removed.

---

### T-08 · attempt 0 · implementer · re-implemented

Dispatched implementer (sonnet) on T-08 (zero-fill the week series, `server/db/queries.ts`,
deps: [T-07]). It replaced T-07's `getWeeklyBucketedEvents` with
`getWeeklyBucketedEventsWithZeroFill`, choosing to extend/replace rather than add a parallel query
(reasoning: zero-fill is strictly additive over T-07's result, one current answer is cleaner than
two divergent implementations). Structure: `generate_series` over the judged week + 8 prior weeks,
a CTE of all distinct locations for the account, CROSS JOIN weeks × locations, LEFT JOIN actual
deduplicated event counts, `COALESCE(..., 0)` for missing weeks. Preserved T-07's
`COUNT(DISTINCT (account_id, location, event_type, occurred_at))` dedupe and the double
`AT TIME ZONE` local-week bucketing; no TypeScript date arithmetic added.

Reported verification, verbatim (abridged):

> Account 6, Site B, call_received, judged week 2026-07-20: raw data shows Site B has events in
> weeks 2026-07-06 (5) and 2026-07-20 (4) but none in 2026-07-13 — zero-filled query returns that
> week with count = 0 rather than omitting it. Row count per location for account 6 (15 locations)
> = exactly 9 each. T-07 dedupe re-verified: account 1, Site C, week 2026-07-06 raw_count=4,
> deduped_count=3 — matches T-07's own already-validated figure.

No new dependency requested (`generate_series` is native Postgres). Did not touch `seed/seed.sql`,
PLAN.md, or ai-log/03-execution.md.

### T-08 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, independent re-derivation only, instructed to pick
its own account/location/event-type combination rather than re-checking the implementer's example.
Verdict returned, verbatim (abridged; full evidence in agent history a6027c9):

> verdict: PASS
> 1. `getWeeklyBucketedEventsWithZeroFill` confirmed: `generate_series` for 9 weeks, CROSS JOIN
>    locations CTE, LEFT JOIN event-count CTE, `COALESCE(be.event_count, 0)`.
> 2. Fully parameterized (`$1`/`$2`/`$3`), no string interpolation — grepped, zero matches.
> 3. Week bucketing via `date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE
>    a.timezone)` in SQL only; no `new Date`/`.getTime(`/`setDate`/`Date.now` in the file.
> 4. Independent zero-fill case, different from the implementer's: account 3 (Bluebird HVAC),
>    event_type `appointment_scheduled` (account 3 has zero events of this type at all), judged
>    week 2026-06-15 — Site A and Site B both appear across all 9 weeks with `count = 0`, rather
>    than being omitted, confirming the zero-fill also holds for a location/event-type combination
>    with no matching events anywhere in the window, not just a single missing week.
> 5. Row count exactly 9 per location, independently counted for account 3 (2 locations) and
>    account 5 (5 locations, real data).
> 6. T-07 dedupe re-verified independently: account 1, Site C, week 2026-07-06, raw 4 rows / query
>    returns `event_count = 3`.
> 7. CLAUDE.md hard rules: `git diff seed/seed.sql` empty; no new dependency (`server/package.json`
>    unchanged since T-07, `pg`/`@types/pg` only); TASKS.md diff only marker/`> attempts:` lines;
>    ai-log/03-execution.md has no implementer edits.
> 8. Scope: no T-09 baseline-domain files found (`**/*baseline*` glob empty) — T-09 correctly not
>    absorbed into this task.

All criteria PASS with itemized, independently-collected evidence (validator chose its own
account/event-type/week distinct from the implementer's check, including a stronger case — a
location with *no* events anywhere in the 9-week window for that event type, not just one missing
week). Marker → `[x]`, `> attempts:` note removed.

---

### T-09 · attempt 0 · implementer · PASS-ready

Dispatched implementer (sonnet) on T-09 (`server/domain/baseline.ts` — pure median/MAD/verdict
functions, no I/O, no imports, no date arithmetic). Created the file (~186 lines) with five exports:

- `median(values: number[])` — guard clause on empty array, else sorts and takes the midpoint
  (odd/even handled).
- `scaledMAD(values: number[])` — `median(|x - median(x)|) × 1.4826`; guard on empty array.
- `typicalRange(baselineMedian, scaledMadValue)` — `median ± 2·scaledMAD`, each bound
  `Math.max(0, …)`-floored.
- `deltaPct(current, baselineMedian)` — `null` when `baselineMedian === 0` (percent-of-zero is
  undefined, not faked as `0` or `Infinity`).
- `judgeWeek(currentCount, priorWeekCounts)` — the entry point: two sequential guard clauses
  (`weeksOfHistory < 4` → `insufficient_history`; `madValue === 0 && weeksOfHistory < 8` →
  `insufficient_history`, i.e. a zero-spread reading isn't trusted until the full 8-week window is
  present), then the happy path computes the band and one of `above | below | typical`. The
  `insufficient_history` branch returns a discriminated-union variant with
  `baselineMedian/typicalRange/deltaPct` genuinely `null` — enforced at the type level
  (`BaselineResultWithBand` vs `BaselineResultInsufficientHistory`), not faked as a zero band.

Zero `import`/`require` statements anywhere in the file. Verified via
`node --experimental-strip-types --check` (no `tsc`/`tsconfig.json` exists anywhere in the repo yet
— flagged as `DISCOVERED_WORK`, not absorbed: T-09's own wording only requires "compiles" and no
earlier task added a TypeScript toolchain; a later task, likely T-10 which brings in Vitest, is the
natural place for it). Implementer wrote and then deleted a throwaway smoke script exercising all
branches (19 assertions) before reporting back — no test artifacts left in the tree.

### T-09 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, no implementer
reasoning passed along. Verdict returned, verbatim (abridged; full transcript retained in agent
history ae37735):

> Verdict: PASS
> 1. Zero imports of any kind (grep confirmed — the only matches were prose in comments); no
>    `db/`/`routes/` references; no `Date`/timezone logic anywhere — pure `number[]`/`number` math.
> 2. Exported surface matches every named requirement: `median`, `scaledMAD` (×1.4826 via
>    `MAD_SCALE_FACTOR`), `typicalRange` (±2·scaledMAD floored at 0 via `Math.max(0, …)`),
>    `deltaPct` (null at baseline-median-zero), `judgeWeek` returning
>    `verdict: "above"|"below"|"typical"|"insufficient_history"` plus `weeksOfHistory`.
>    `insufficient_history` fires on `<4` weeks OR `madValue===0 && <8` weeks; in both cases fields
>    are literally `null` at runtime (checked, not just typed), not a faked zero band.
> 3. Guard clauses lead every function, happy path last — matches
>    `resources/engineering-principles.md` §4.
> 4. No `tsconfig.json`/`typescript` dependency exists anywhere in the repo (confirmed via glob and
>    both package.jsons) — `node --experimental-strip-types --check` → `SYNTAX_OK` accepted as the
>    available substitute for "compiles," given the task's literal wording and that zero imports
>    trivially satisfies "outside the standard library."
> 5. Independently wrote and ran its own throwaway probe (22 assertions, distinct from the
>    implementer's), exercising every branch including the two distinct `insufficient_history`
>    paths and confirming their fields are `null` not `0`/`[0,0]`. Probe file deleted after the run;
>    `git status` confirms `server/domain/` contains only `baseline.ts`.

No PENDING HUMAN note applies (no browser behavior, no hand-verified figure in this task). Marker →
`[x]`, `> attempts:` note removed.

### T-10 · attempt 0 · implementer · AWAITING
NEEDS_HUMAN_COMMAND

Command:
```
pnpm add -D vitest
```

Working directory: `C:\Repositories\Challenge`

Why needed: `package.json` has no `vitest` devDependency and `node_modules\.bin` has no `vitest`
binary. T-10 establishes the Vitest runner (config + `pnpm test` script) for the domain unit
tests. Installing a dependency is a human-run command (CLAUDE.md); the implementer is denied
from running `pnpm add` itself.

What's needed back: confirmation the command completed successfully (and/or the resulting
`"vitest"` devDependency line in package.json), so the implementer can proceed to write
`vitest.config.ts`, add the `"test": "vitest run"` script, write
`server/domain/baseline.test.ts`, and run `pnpm test`.

### T-10 · attempt 0 · human-command · PASS
Human ran `pnpm add -D vitest` in `C:\Repositories\Challenge`. Reported: "Done in 5s using pnpm
v11.22.0". Confirmed via package.json: `"vitest": "4.1.11"` now present in devDependencies.
Resuming implementer at attempt 0 (unchanged, per protocol).

### T-10 · attempt 0 · validator · PASS
## Verdict: PASS

task: T-10 — Baseline unit tests — risk 1

Evidence:
1. baseline.ts untouched by this task — confirmed via git status/git diff: only TASKS.md,
   ai-log/03-execution.md, package.json, pnpm-lock.yaml modified, plus new untracked
   server/domain/baseline.test.ts and vitest.config.mts. baseline.ts not in the diff (T-09,
   already validated, commit 96b8d0e).
2. Exactly 4 test cases, no more/no fewer — baseline.test.ts:12-69, one describe, 4 test()
   blocks. No coverage farming.
3. Test names state falsifiable beliefs, e.g. "an order-of-magnitude outlier does not move the
   baseline more than a small tolerance", "under naive mean ± 2·stddev the same outlier-inflated
   band would call a genuine spike 'typical' where median/MAD correctly calls it 'above'".
4. Outlier-tolerance test verified by hand: outlierFree median = 13, withOutlier median = 13.5,
   |13.5-13|=0.5 ≤ 1 — tight and true, not vacuous.
5. Mean/stddev flip claim verified by hand: mean=111.5, stddev≈260.21, mean±2σ band [0, 631.93]
   contains current=20 → mean/stddev calls it typical. Median/MAD band [10.53, 16.47], 20 > 16.47
   → "above". Flip is real, matches judgeWeek(20, priorWeeks).verdict === "above" assertion.
6. All-zero series: judgeWeek(0,[0]*8) → verdict "typical", baselineMedian 0, band {0,0},
   deltaPct null. weeksOfHistory(8) === FULL_BASELINE_WINDOW_WEEKS(8) so MAD-0 guard not
   triggered (guard requires <8); non-trivial edge correctly exercised (band-of-width-0, not
   divide-by-zero).
7. 3 prior weeks: judgeWeek(10,[8,9,11]) → weeksOfHistory 3 < MIN_WEEKS_OF_HISTORY(4), guard
   triggers, verdict "insufficient_history", all band fields null, weeksOfHistory 3.
8. Purity: imports only judgeWeek, median from ./baseline.ts and vitest — no DB, no I/O, no
   date construction.
9. vitest.config.mts scoped to include: ["server/**/*.test.ts"], comment notes deliberately
   minimal for T-10, extended not replaced by later integration tests. package.json adds only
   "test": "vitest run" script + vitest devDependency (human-installed per NEEDS_HUMAN_COMMAND,
   logged).
10. pnpm test run directly: vitest v4.1.11, Test Files 1 passed (1), Tests 4 passed (4). Green.
11. Scope check: TASKS.md diff is only in-flight marker bookkeeping; ai-log/03-execution.md diff
    is the honest NEEDS_HUMAN_COMMAND round-trip. Nothing outside task scope touched.

No PENDING HUMAN line applies — no browser-interactive behavior, no hand-verified figure in this
task (that requirement belongs to T-12+).

---

### T-11 · attempt 0 · implementer · AWAITING

Dispatched implementer (sonnet) on T-11 (`GET /api/accounts/:id/normalcy` route). It built the full
implementation but could not exercise any of the three required status paths because `express` is
not installed anywhere in the workspace (confirmed via `node -e "require.resolve('express')"` and by
running the server, which failed only at the `express` import — everything before it, including TS
parsing, hand-written param validation, and the DB pool, loaded cleanly).

What it built, pending the install:
- `server/db/pool.ts` — new `pg.Pool`, reads the same env vars as `scripts/run-seed.js`; confirmed
  `docker compose ps` shows `dash247-postgres` healthy, so the DB side needs no further setup.
- `server/db/queries.ts` — added `getAccountById` (id, timezone lookup; parameterized `$1`), used
  for both the 404 check and the response's `timezone` field, alongside the existing T-08 zero-fill
  query.
- `server/routes/normalcy.ts` — hand-written validation (no zod) for all three params: account id
  (`/^\d+$/`), eventType (checked against the real seed/schema enum read from
  `migrations/1700000000000_initial-schema.sql`: `call_received | lead_created | appointment_set`),
  weekStart (`YYYY-MM-DD` shape + real-date check, passed straight through to SQL as a string — no
  date recomputation in TS). Then: account lookup (404 if missing) → T-08 query → group rows by
  location → T-09's `judgeWeek` per location → shape response → sort.
  - Sort/ranking decision, documented in a code comment per T-12's future need: deviation score =
    `abs(deltaPct)` when defined, else raw `currentCount` (covers baseline-median-0 cases where
    `deltaPct` is null but a nonzero count is still the signal). `insufficient_history` rows are
    excluded from the ranked group and placed last, alphabetically — never interleaved.
  - Empty account (20) falls out naturally: the T-08 query returns zero rows when the account has
    no locations at all, so `locations: []` in an otherwise well-formed 200 — no special-casing.
- `server/app.ts` / `server/index.ts` — minimal Express app + entrypoint, not previously scaffolded.

It returned `NEEDS_HUMAN_COMMAND`, verbatim (abridged to the material request):

> Command needed (working directory `C:\Repositories\Challenge`):
> ```
> pnpm --filter server add express
> pnpm --filter server add -D @types/express
> ```
> Why: `server/routes/normalcy.ts` and `server/app.ts` import `express` (`Router`, `Request`,
> `Response`). `server/package.json` currently only has `pg`/`@types/pg`. `saveExact: true` in
> `pnpm-workspace.yaml` will pin an exact version automatically (registry currently resolves
> `express@5.2.1`).
> What I need back: confirmation the install succeeded, so I can run `node server/index.ts` and
> exercise the three status paths with curl — the literal Done-when for this task.

DISCOVERED_WORK (not absorbed, flagged only): no `start`/`dev` script exists yet in
`server/package.json` for running the API; it ran `node server/index.ts` directly for verification
instead of adding a script, to avoid touching package.json/scripts while blocked on an install.

Orchestrator note: `pnpm add` (workspace-filtered form included) is explicitly named as human-run in
CLAUDE.md and this skill; the implementer correctly stopped rather than attempting a workaround or
installing `express` itself. Task left `[~]`, `> attempts: 0` unchanged, `> awaiting: pnpm --filter
server add express && pnpm --filter server add -D @types/express` added.

### T-11 · attempt 0 · human-command · AWAITING resolved

Human reported "done" without pasting output. Orchestrator verified independently rather than
blocking on a paste (precedent: T-03): `server/package.json` now lists `express: 5.2.1` (dependencies)
and `@types/express: 5.0.6` (devDependencies), exact-pinned per `saveExact`; `server/node_modules/
express` present on disk. `> awaiting:` line removed; `> attempts:` stays at 0 (waiting on the human
is not a failed attempt). Resuming the implementer at the same attempt with this confirmed as fact.

### T-11 · attempt 0 · implementer · re-implemented (resumed)

Resumed implementer with express confirmed installed. It started the server (`node server/index.ts`
→ "DASH-247 API listening on http://localhost:3000"), confirmed Postgres healthy via `docker compose
ps`, and exercised all three required status paths plus one extra full-shape example with curl,
verbatim:

- **400, bad `weekStart`**: `{"error":"invalid weekStart: expected a YYYY-MM-DD date"}`
- **400, bad `eventType`**: `{"error":"invalid eventType: expected one of call_received,
  lead_created, appointment_set"}`
- **404, unknown account** (id 9999): `{"error":"unknown account: 9999"}`
- **200, empty account 20** (Quiet Harbor Spa, no events): `{"accountId":20,"timezone":"America/
  Los_Angeles","eventType":"call_received","weekStart":"2026-07-20","locations":[]}`
- **200, account 6** (the burst-outlier account), full shape with 15 locations, timezone, judged
  week, and per-location `current`/`baselineMedian`/`typicalRange`/`verdict`/`deltaPct`/
  `weeksOfHistory` — every verdict reads `typical` even against a wide current-week spread (the
  median/MAD robustness property PLAN §4 targets), and rows visibly descend by `|deltaPct|` (140,
  100, 75, 50, 50, 42.9, 25, 25, 20, 20, 14.3, 0, 0, 0) — sort-by-deviation confirmed live, not just
  by reading the code.

Scratch verification script removed, server process stopped afterward. No test files written
(T-12's scope, deliberately out). `ai-log/03-execution.md` and `git commit` untouched by the
implementer, as instructed.

### T-11 · attempt 0 · validator · PASS

Dispatched validator (sonnet), fresh context, task text + Done when verbatim, instructed to
independently re-derive everything (not trust the implementer's log) including starting its own
server process and curling all three paths itself. Verdict returned, verbatim (abridged):

> Verdict: PASS
> 1. Hand-written validation, no zod — `server/routes/normalcy.ts:38-56`, three guard clauses
>    (account id regex, eventType against a `Set` of the three real seed event types, weekStart
>    shape regex + `Date` validity check), ~10 lines of actual logic. Grep for `zod` in `server/`
>    matched only a comment.
> 2. Parameterized SQL, zero tolerance — both `getWeeklyBucketedEventsWithZeroFill` (T-08) and the
>    new `getAccountById` use `$1`/`$2`/`$3` placeholders exclusively; grep for template-literal SQL
>    interpolation found no matches anywhere in `server/`.
> 3. Response shape — live curl against account 1 confirms `accountId`, `timezone`, `eventType`,
>    `weekStart`, and per-location `current`/`baselineMedian`/`typicalRange`/`verdict`/`deltaPct`/
>    `weeksOfHistory`.
> 4. Sorting — live curl against account 1 (6 locations) returned `deltaPct` values 100, 25, 25, 25,
>    -9.09, 0 — non-increasing by `abs(deltaPct)`, matching the code's documented deviation measure;
>    traced live, not just read.
> 5. Independently started its own server process (`node index.ts`), confirmed Postgres healthy via
>    `docker compose ps`, and curled all three status paths itself: 400 (bad eventType, bad
>    weekStart, bad account id — three distinct malformed-input cases, all rejected with a message,
>    no coercion), 404 (unknown account 9999), 200 (account 20, `locations: []`, well-formed).
> 6. No test file written for T-11 — `git status --porcelain` shows no new `*.test.ts`;
>    `server/domain/baseline.test.ts` (T-10) unchanged.
> 7. Diff scope — only task-relevant files changed; `server/domain/baseline.ts` (T-09) zero diff
>    against HEAD.
> 8. No unexpected dependency — `pnpm-lock.yaml` diff adds only `express`/`@types/express` and their
>    legitimate transitive deps.
> 9. CLAUDE.md hard rules — `seed/seed.sql` zero diff, SQL parameterized throughout, `weekStart`
>    passes straight through to SQL as a string; the one `new Date()` call is used only for a `NaN`
>    validity check and discarded immediately after, never for arithmetic — no week-boundary logic
>    recomputed in TypeScript.

No PENDING HUMAN applies (no browser-interactive behavior, no hand-verified figure requirement —
that belongs to T-12). Marker → `[x]`, `> attempts:` note removed.

### T-12 · attempt 0 · implementer · AWAITING

## Status: NEEDS_HUMAN_COMMAND

I've done everything possible without a package install. Summary below, then the exact command needed.

### What I found and did

**1. Fixed a real bug in T-08's already-committed query** (`server/db/queries.ts`). While building the "timezone bucketing" test required by T-12, I found the week-bucketing expression was `occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone` — a double conversion that is directionally wrong (it re-adds the offset instead of subtracting it). PLAN.md line 147 explicitly specifies the correct form as the single conversion `occurred_at AT TIME ZONE a.timezone`. I verified against the live seeded DB:

```sql
SELECT ae.id,
  date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone)                    AS plan_correct_week,
  date_trunc('week', ae.occurred_at AT TIME ZONE 'UTC' AT TIME ZONE a.timezone) AS t08_query_week
FROM activity_events ae JOIN accounts a ON a.id = ae.account_id WHERE ae.id = 1871;
-- plan_correct_week: 2026-02-23   t08_query_week: 2026-03-02   (a full week off)
```

I corrected the one line in `server/db/queries.ts` to match PLAN.md's specified expression, and updated the doc comment above it with the evidence and a pointer to the test. This is a mechanical, spec-mandated fix (not a design decision), and leaving it in place would make T-12's mandatory timezone test permanently unable to pass. I'm flagging it loudly here rather than folding it in silently — happy to split it into a separate commit if you'd prefer.

I confirmed `pnpm test` (existing domain unit tests) still passes after this change.

**2. DISCOVERED_WORK — `insufficient_history` is currently unreachable through the live endpoint.** T-08's zero-fill query always returns a fixed 9 rows (judged + 8 prior weeks) per location via unconditional `generate_series`, regardless of how much real history a location has. That means `weeksOfHistory` is always exactly 8 for every request, so neither of `judgeWeek`'s `insufficient_history` branches (`< 4` weeks, or `mad === 0 && weeksOfHistory < 8`) can ever trigger — contradicting PLAN.md line 45 ("a new location with no history shows as 'not enough history'"). I confirmed this empirically by brute-force enumerating all (account, eventType, judged-week) combinations with ≥3 locations in the seeded DB (1,539 combinations) — zero ever produced `insufficient_history`. This means T-12's ranking-test requirement #3 (insufficient_history rows grouped at one end) cannot be honestly tested against the seeded DB as currently wired — any such assertion would be vacuous. I did not attempt to fix this myself: it requires a real design decision (how to determine a location's true history start) and a nontrivial query change, well beyond T-12's scope. I documented this in a comment in the test file and left the assertion out rather than fake it.

**3. Wrote the full integration test file** — `server/routes/normalcy.test.ts` — covering, all backed by SQL I ran against the live seeded DB (queries are in comments above each assertion):
- duplicate collapse (account 1 / Site C / call_received / week 2026-07-06: 3 raw rows → 2 counted)
- timezone bucketing (account 1/Chicago event id 1871 lands in week 2026-02-23, not 2026-03-02; contrasted with a UTC account 18 boundary event where no shift is needed)
- zero-fill (account 1 / Site B / appointment_set / week 2026-07-06: current 0, real verdict)
- empty account (account 20, 0 events, 200 with `locations: []`)
- hand-verified number (account 1 / Site C / call_received / week 2026-05-25: current 8)
- ranking (account 1 / call_received / week 2026-04-06: pinned order `Site F, Site E, Site C, Site B, Site D, Site A`, independently verified via a `percentile_cont`-based SQL query in the test comment, non-increasing `|deltaPct|`, and sign-agreement with verdict)

**4. Added `server/test-setup.ts`** and updated `vitest.config.mts` (`setupFiles`) so integration tests load `.env` the same way `server/index.ts` does — needed because the seeded Postgres is on host port 5433 (docker-compose mapping), not `pool.ts`'s default 5432.

I still need to run the ranking test with the route's `.sort(...)` temporarily removed to demonstrate it's non-vacuous, per the task's explicit requirement — I have that step queued but it requires `pnpm test` to run first, which requires supertest.

### NEEDS_HUMAN_COMMAND

```
pnpm add -D supertest @types/supertest --filter server
```

- **Working directory:** `C:\Repositories\Challenge`
- **Why:** `server/routes/normalcy.test.ts` imports `supertest`, per TASKS.md's own dependency assignment ("supertest in T-12"). It is not present in `node_modules` or `pnpm-lock.yaml` yet.
- **What I need back:** confirmation the install succeeded (or its output if it failed) so I can run `pnpm test`, confirm all six new tests pass, do the sort-removal non-vacuity demonstration, and report final green output.

### Files touched so far
- `C:\Repositories\Challenge\server\db\queries.ts` (T-08 timezone bug fix — out of T-12's nominal scope, flagged above)
- `C:\Repositories\Challenge\server\routes\normalcy.test.ts` (new)
- `C:\Repositories\Challenge\server\test-setup.ts` (new)
- `C:\Repositories\Challenge\vitest.config.mts` (added `setupFiles`)

### DISCOVERED_WORK (for the architect)
The `insufficient_history` verdict is unreachable through the live `/api/accounts/:id/normalcy` endpoint for any input against the current seed, because T-08's query always zero-fills to a fixed 8-week prior window regardless of a location's actual history length — contradicting PLAN.md's stated requirement that young/new locations show "not enough history" rather than a false baseline. This needs a follow-up task to change how T-08 computes a location's available history (e.g., bounding by the location's first-ever event) before T-12's ranking-test requirement #3 can be genuinely tested.

### T-12 · attempt 0 · human-command · AWAITING resolved

Human ran `pnpm add -D supertest @types/supertest --filter server` and confirmed it succeeded
(no output pasted; confirmation taken as fact per protocol). `> awaiting:` removed from T-12;
resuming the implementer at attempt 0 to run the suite and the sort-removal non-vacuity check.

### DISCOVERED_WORK (T-12) · human decision · architect dispatched

Human approved the proposed resolution for the T-12 discovery (`insufficient_history` unreachable):
bound the zero-fill window in T-08's query by each location's first-ever event (any event type),
computed in SQL, superseding T-08's "exactly 9 weeks, no more, no less" clause — classified as a
task defect in T-08 (AC over-specified vs PLAN.md's "not enough history" requirement; plan wins).
task-architect dispatched to append the new task to TASKS.md with that framing and its own `deps:`.

### T-19 · bootstrap-style pass · architect · REFINED

Appended T-19 · P2 · "Bound zero-fill at each location's first event, so `insufficient_history` is
reachable" under "Appended after the fact" (revealed by T-12). Encodes the human-decided resolution:
task defect in T-08 (its "no more, no less" clause over-specified vs PLAN §2; plan wins); T-08's text
left as written, T-19 supersedes the clause with `min(9, weeks since the location's first event)`
rows per location; fix confined to `server/db/queries.ts` (CTE with MIN(occurred_at) per
(account, location), week-truncated in the account's timezone; no TS date logic per PLAN §6; no
domain/route changes); semantic decision recorded — cutoff is first event of ANY type, per-event-type
alternative visibly rejected; deps: [T-08, T-09, T-11]; Done-when is SQL-evidenced, including a
concrete (account, eventType, weekStart) demonstrating `insufficient_history` through the live
endpoint, and existing suites staying green. Architect noted: T-12's omitted ranking sub-assertion #3
becomes testable after T-19 and re-enabling it belongs to T-12's scope. Consistency check: no
PLAN.md contradiction found.

### T-12 · attempt 0 · implementer · COMPLETED (resumed after human command; validation pending)

Final report, verbatim:

All tests are green after restoring the sort exactly (`git diff server/routes/normalcy.ts` shows no
content differences from HEAD — confirming the file is byte-identical to its committed state).

1. Full test suite (final, green):
   pnpm test → Test Files 2 passed (2) · Tests 11 passed (11) · Duration 1.04s
   11 tests: 4 pre-existing domain unit tests (T-10, untouched) + 7 new integration tests (T-12).

2. Non-vacuity demonstration (ranking test) — with the route's `.sort(...)` in
   `server/routes/normalcy.ts` temporarily commented out:
   FAIL server/routes/normalcy.test.ts > locations rank most-deviant-first by |deltaPct|
   AssertionError: expected 'Site A' to be 'Site F' // Object.is equality
     Expected: "Site F"  Received: "Site A"
     at server/routes/normalcy.test.ts:200:35  expect(locations[0].location).toBe("Site F")
   Test Files 1 failed (1) · Tests 1 failed | 6 passed (7)
   Confirms the test fails meaningfully (unsorted response returns rows in arrival/alphabetical
   order, 'Site A' first) rather than passing by accident. Sort restored verbatim — git diff shows
   zero content differences from the committed version.

3. Hand-verified figure:
   -- account 1, Site C, call_received, week starting 2026-05-25 (America/Chicago), no duplicates:
   SELECT count(*) AS raw_row_count,
          count(DISTINCT (account_id, location, event_type, occurred_at)) AS deduped_event_count
   FROM activity_events
   WHERE account_id = 1 AND location = 'Site C' AND event_type = 'call_received'
     AND date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-05-25';
   -- raw_row_count = 8, deduped_event_count = 8
   Asserted as: GET /api/accounts/1/normalcy?eventType=call_received&weekStart=2026-05-25 →
   locations entry for Site C has current === 8. Test passes.

Scope discipline note: the insufficient_history/zero-fill-window gap was not touched — the ranking
test carries its explanatory comment and no assertion for ranking sub-requirement #3, deferred to
T-19 by recorded human decision; re-enabling it belongs to T-12's scope once T-19 lands.

Files changed:
- server/db/queries.ts — T-08 timezone-bucketing bug fix (flagged in the prior AWAITING entry)
- server/routes/normalcy.test.ts — new, 7 integration tests
- server/test-setup.ts — new, loads .env for the pool
- vitest.config.mts — added setupFiles
- server/routes/normalcy.ts — no net change (sort removed and restored for the demonstration only)

Orchestrator note: validator NOT yet dispatched. T-12's task text requires ranking sub-assertion #3
(insufficient_history rows grouped at a pinned end), which is unreachable until T-19 lands — a
sequencing situation not covered by the loop's numbered steps (T-12 is [~]; one-task-at-a-time
blocks starting T-19). Stopping to ask the human how to sequence, per the skill's fallback rule.

### sequencing · human decision · T-19 interleaved ahead of T-12's validation

Human authorized option 1: T-12 stays [~] paused (implementation complete, validation deferred);
T-19 runs now as a one-off exception to one-task-at-a-time, because T-12's ranking sub-assertion #3
is unreachable until T-19 lands. After T-19 reaches [x], the implementer re-enters T-12 solely to
add sub-assertion #3, then T-12 gets its full validation. T-19 marked [~], attempts 0; implementer
dispatched.

### T-19 · attempt 1 · implementer · COMPLETED (validation pending)

Verbatim report:

Only `server/db/queries.ts` was modified (the rest are pre-existing uncommitted state from
T-12/harness bookkeeping); the temp verification file is gone.

Change: added a `location_first_week` CTE (MIN of `date_trunc('week', occurred_at AT TIME ZONE
a.timezone)` across all event types for the account, per location) and a
`WHERE ws.week_start >= lfw.first_week` filter on the final zero-fill SELECT. Comments updated to
document the first-event bound and the deliberate any-event-type semantic decision. No changes to
`server/domain/baseline.ts` or the route.

Done-when evidence:
1. 9 rows for a long-lived location — account 1 / Site C / call_received / judged week 2026-07-06.
   Site C's first event (any type) is 2026-02-02, 22 weeks before the judged week. Confirmed live:
   GET /api/accounts/1/normalcy?eventType=call_received&weekStart=2026-07-06 returns Site C with
   weeksOfHistory: 8 (9 total rows: judged + 8 prior).
2. Fewer rows for a young location — account 9 / Site C / call_received / judged week 2026-02-16.
   Site C's first event week is 2026-02-02 (3 weeks before). Direct SQL run of the new query
   returns exactly 3 rows for Site C (2026-02-16, 2026-02-09, 2026-02-02), not 9.
3. insufficient_history reachable live — account 9 / call_received / weekStart 2026-02-02 (Site C's
   own first-event week, independently verified via SELECT ae.location,
   MIN(date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone)) ... WHERE account_id=9
   GROUP BY location → Site C = 2026-02-02). Live response for Site C: current: 8,
   weeksOfHistory: 0, verdict: "insufficient_history", baselineMedian: null, typicalRange: null.
   Verified with a temporary vitest file (server/routes/t19-verify.temp.test.ts) hitting the real
   Express app via supertest — run, output captured, then deleted; not part of the repo.
4. Full suite green — pnpm test: Test Files 2 passed (2), Tests 11 passed (11), including all of
   T-12's pinned integration assertions (duplicate collapse, both timezone tests, zero-fill Site B
   test, the hand-verified 8-events number, and the full ranking test with the pinned
   "Site F, Site E, Site C, Site B, Site D, Site A" order) unchanged.

Note per T-19's own text: T-12's omitted ranking sub-assertion is now testable but re-enabling it
is explicitly out of this task's scope — normalcy.test.ts untouched.

### T-19 · attempt 1 · validator · PASS

Verbatim verdict:

verdict: PASS

Scope discipline:
- git status confirms the only implementation file touched is server/db/queries.ts.
  server/domain/baseline.ts and server/routes/normalcy.ts have zero diff — matches "No changes to
  baseline.ts or the route."
- No leftover temp test files (checked *t19*, *temp*); only pre-existing baseline.test.ts and
  normalcy.test.ts (T-12 baseline, untouched).
- TASKS.md, ai-log/03-execution.md, pnpm-lock.yaml, server/package.json, vitest.config.mts diffs
  are the pre-accepted T-12 baseline state, not new T-19 scope creep.

SQL-only, parameterized:
- location_first_week CTE computes the bound entirely in SQL
  (MIN(date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone))), same single-conversion
  timezone expression as the bucketing CTE — no date arithmetic introduced in TypeScript.
- Query still uses only $1/$2/$3 placeholders; no string interpolation added.

Comments (reviewable artifact, PLAN §6):
- File header section 4 documents the first-event bound rationale, the supersession of T-08's
  row-count clause, and explicitly documents-and-rejects the per-event-type cutoff alternative.

Criterion (1) — 8+ weeks of prior history → exactly 9 rows: independently confirmed via
docker compose exec psql: account 1 locations Site A/F first_week = 2026-01-26; Site B/C/D/E
first_week = 2026-02-02. Live endpoint (temporary supertest script, deleted after use) with
weekStart=2026-04-13 returned weeksOfHistory: 8 (9 rows) for all six locations.

Criterion (2) — fewer than 4 prior weeks → fewer rows: weekStart=2026-02-16 → Site A/F
weeksOfHistory: 3; Site B/C/D/E weeksOfHistory: 2 — arithmetically matching the independently
queried first_week values, not the implementer's claim.

Criterion (3) — insufficient_history reachable live: (account=1, eventType=call_received,
weekStart=2026-02-02) → verdict "insufficient_history" for all six locations (weeksOfHistory 0 for
Site B/C/D/E whose first_week equals the judged week; 1 for Site A/F), cross-checked against
independent SQL on the seeded DB.

Criterion (4) — ran pnpm test: Test Files 2 passed (2), Tests 11 passed (11) — baseline.test.ts
(T-10) and normalcy.test.ts (T-12's suite) both green.

No pending-human item applies to this task.

Orchestrator: T-19 marked [x], attempts note removed. Interleave plan resumes: implementer will
re-enter T-12 to add ranking sub-assertion #3, then T-12 gets its full validation.

### T-12 · attempt 0 · human decision · resume for ranking sub-assertion #3

Human chose to commit T-19 and T-12 together once T-12 passes validation (no split of the
queries.ts hunks). T-19 is [x]; resuming the T-12 implementer at the same attempt to add the one
remaining piece — ranking sub-assertion #3 (insufficient_history rows grouped at a pinned end),
now testable — then full validation.

### T-12 · attempt 0 · implementer · COMPLETED (full scope; validation pending)

Verbatim report:

Full test suite (final): pnpm test → Test Files 2 passed (2) · Tests 12 passed (12) · 2.50s.
12/12 green: the 11 tests confirmed by T-19's validator, unchanged, plus the new ranking
sub-assertion.

Choosing SQL for the new sub-assertion — chose account 1 / call_received / judged week 2026-02-23
for the property (a genuine mix of ranked and insufficient_history rows), not by number:

WITH location_first_week AS (
  SELECT ae.location, MIN(date_trunc('week', ae.occurred_at AT TIME ZONE a.timezone)) AS first_week
  FROM activity_events ae JOIN accounts a ON ae.account_id = a.id
  WHERE ae.account_id = 1 GROUP BY ae.location
),
prior_weeks AS (
  SELECT generate_series(TIMESTAMPTZ '2026-02-23' - interval '1 week',
    TIMESTAMPTZ '2026-02-23' - interval '8 weeks', '-1 week'::interval) AS week_start
)
SELECT lfw.location, lfw.first_week,
  count(*) FILTER (WHERE pw.week_start >= lfw.first_week) AS weeks_of_history
FROM location_first_week lfw CROSS JOIN prior_weeks pw
GROUP BY lfw.location, lfw.first_week ORDER BY lfw.location;

Result: Site A / Site F → weeks_of_history = 4 (≥ MIN_WEEKS_OF_HISTORY, get a band);
Site B/C/D/E → weeks_of_history = 3 (insufficient_history). A second, independent
percentile_cont-based query confirmed Site F (deltaPct 14.29%) ranks above Site A (-11.11%) among
the ranked pair.

The assertion pins the full response order to ["Site F", "Site A", "Site B", "Site C", "Site D",
"Site E"] — ranked rows first (most-deviant-first), insufficient_history rows grouped at the END,
alphabetical among themselves — matching what the route's sort (server/routes/normalcy.ts)
actually does, read directly from its comparator rather than assumed.

Other changes:
- Replaced the stale "unreachable, DISCOVERED_WORK" comment in server/routes/normalcy.test.ts with
  the new test.
- No changes to server/db/queries.ts or server/routes/normalcy.ts.
- Deleted the scratch exploration script (server/explore2.mjs); git status shows no stray files.

### T-12 · attempt 0 · validator · PASS

Verbatim verdict:

verdict: PASS

Evidence checked:
- pnpm test → 2 test files, 12 tests, all green (baseline.test.ts unchanged + normalcy.test.ts new).
- git diff -- server/routes/normalcy.ts is empty — route carries no net change, consistent with the
  T-19-then-T-12 sequencing recorded in the log.
- Duplicate collapse: re-ran the exact SQL comment (raw_row_count=3, deduped_event_count=2 for
  account 1 / Site C / call_received / week 2026-07-06) against the live seeded DB — matches.
- Timezone bucketing: re-ran both id-1871 (America/Chicago, local week 2026-02-23) and id-10602
  (account 18, timezone='UTC', week 2026-06-22) SQL — both match the comments and the assertions;
  the non-UTC/UTC contrast is genuinely covered in two separate tests.
- Zero-fill: re-ran the Site B / appointment_set / week 2026-07-06 count-0 query — matches; test
  asserts current: 0, verdict !== 'insufficient_history', typicalRange !== null.
- Empty account: activity_events for account 20 is genuinely empty; test asserts status 200 and
  locations: [] explicitly.
- Ranking test: re-ran the independent percentile_cont SQL for account 1 / call_received / week
  2026-04-06 — six-location order (Site F, E, C, B, D, A) matches exactly, including the property
  claim (differs from both alphabetical and unsorted/arrival order, the latter being alphabetical
  per T-08's ORDER BY location). Deviation measure (abs(deltaPct), falling back to raw count when
  baseline is 0) is named in a route comment (server/routes/normalcy.ts:114-121) and the test
  asserts against it. deltaPct sign-agreement asserted inline in the same walk.
- insufficient_history grouping (ranking sub-requirement #3, unlocked by T-19): re-ran the
  location_first_week/weeks_of_history SQL and the two-location bounded-median SQL — matches
  Site F: 4/3.5/+14.29%, Site A: 4/4.5/-11.11% exactly. Response order
  [Site F, Site A, Site B, Site C, Site D, Site E] with unranked rows carrying
  baselineMedian/typicalRange/deltaPct === null confirmed against the live DB and matches the
  route's sort comparator (ranked-first, insufficient_history grouped alphabetically at the end).
- Non-vacuity demonstration: ai-log/03-execution.md records the sort temporarily removed, the
  ranking test failing meaningfully (expected 'Site F', received 'Site A'), then the sort restored
  with git diff showing zero content difference.
- Test rule compliance: DB never mocked; test names state falsifiable beliefs; no coverage farming;
  failures loud, no skip logic.
- Scope discipline: only normalcy.test.ts (new), test-setup.ts (new), vitest.config.mts
  (setupFiles) are T-12's own changes; package.json/lockfile add exactly-pinned
  supertest/@types/supertest (human-approved install); queries.ts is the pre-accepted T-19 state;
  no stray files; ai-log changes are orchestrator-owned.

PENDING HUMAN: the hand-verified figure — "account 1 / Site C / call_received / week starting
2026-05-25 has exactly 8 events" (server/routes/normalcy.test.ts:125-141), backed by:

SELECT count(*) AS raw_row_count,
       count(DISTINCT (account_id, location, event_type, occurred_at)) AS deduped_event_count
FROM activity_events
WHERE account_id = 1 AND location = 'Site C' AND event_type = 'call_received'
  AND date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-05-25';
--  raw_row_count = 8, deduped_event_count = 8

Per T-12's split-verification clause this figure is reserved for human confirmation — verify 8 by
hand against the seed before committing.

Orchestrator: T-12 marked [x], attempts note removed.

### T-12 · PENDING HUMAN · resolved — hand-verified figure confirmed by the human

Human ran, in-session:

docker compose exec postgres psql -U dash247 -d dash247 -c "SELECT count(*) AS raw_row_count,
  count(DISTINCT (account_id, location, event_type, occurred_at)) AS deduped_event_count FROM
  activity_events WHERE account_id = 1 AND location = 'Site C' AND event_type = 'call_received' AND
  date_trunc('week', occurred_at AT TIME ZONE 'America/Chicago') = '2026-05-25';"

Output:
 raw_row_count | deduped_event_count
---------------+---------------------
             8 |                   8
(1 row)

Matches the figure pinned in server/routes/normalcy.test.ts (current === 8) and confirms the week
carries no duplicates. The split-verification clause of T-12 is satisfied; nothing blocks the
combined T-19 + T-12 commit.
