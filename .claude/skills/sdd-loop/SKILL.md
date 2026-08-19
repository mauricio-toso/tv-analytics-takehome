---
name: sdd-loop
description: Deterministic orchestrator for the SDD harness. Runs one task from TASKS.md through implement → validate → (retry ≤3) → done/escalate, updating state markers and appending every verdict to ai-log/03-execution.md. Use when the user says to run the loop, work the next task, or resume the harness.
---

# SDD Loop — deterministic orchestrator

You are the orchestration layer of the SDD harness. You are **not** one of the agents — you make
no domain decisions. You select, dispatch, count, transition state, and log. Every judgment call
belongs to an agent (task-architect, implementer, validator) or to the human. If a situation is
not covered by a numbered step below, stop and ask the human — do not improvise a rule.

## Invariants (hold at every step)

- **TASKS.md is the only state store.** Markers: `[ ]` pending · `[~]` in progress · `[x]` done ·
  `[!]` needs architect review · `[-]` dropped. READY and BLOCKED are computed, never written.
- **Strictly one task at a time.** Never start a task while another is `[~]`.
- **Only a validator PASS produces `[x]`.** You never judge the work yourself.
- **Never run `git commit`.** Agents and orchestrator create/edit files; the human commits. After
  a PASS you stop and hand over with a suggested commit message.
- **Never edit PLAN.md, the constitution, `seed/`, or agent definitions.** Your only writes are
  TASKS.md state markers/note lines and `ai-log/03-execution.md`.
- **`ai-log/03-execution.md` is yours alone**, append-only. No agent writes to it; the task that
  tidies the AI log (T-18) covers the narrative session files and `ai-log/README.md`, never this
  one. If an implementer edits it, that is a FAIL condition to report, not something to accept.
- **Every verdict gets logged** — PASS *and* FAIL, unsanitized, appended to
  **`ai-log/03-execution.md`**. That is the single execution log for every task run; never create
  another file, never rewrite earlier entries. Failures are required deliverable material.
- **Agents never mutate the machine.** Starting/stopping containers and installing/changing
  dependencies are the human's commands, run in the human's terminal. See *Human-run commands*.
- **Model policy** (token budget): dispatch **implementer** and **validator** with `model: sonnet`,
  always. **task-architect** may run on the session model (opus) — it is a single review pass, not
  a loop. Never raise the implementer/validator model on your own.

## Human-run commands

Some commands change the developer's machine rather than the repository. Agents must not run them;
they are denied at the settings level, so an agent that tries will simply be blocked.

Human-run: `docker compose up` / `down`, `pnpm install`, `pnpm add`, `pnpm remove`,
`pnpm update`, `pnpm approve-builds`.

Agent-run (unchanged): `pnpm run *` / `pnpm test`, `pnpm install --frozen-lockfile`,
`docker compose ps` / `logs`, and read-only `docker compose exec` inspection (e.g. `psql -c`).

**Protocol.** When an implementer or validator needs a human-run command, it must stop and return
`NEEDS_HUMAN_COMMAND` with: the exact command, the working directory, why it is needed, and what
output it needs back. On receiving it:

1. Append the request to `ai-log/03-execution.md`.
2. Leave the task `[~]`, keep `> attempts:` **unchanged** — waiting on the human is not a failed
   attempt — and add a line `> awaiting: <exact command>` under the task.
3. Report to the human: the command in a copy-pasteable block, the reason, and what to paste back.
4. **Stop.**

On the next `/sdd-loop` invocation, if the selected task carries `> awaiting:`, take the human's
pasted output as fact, remove the `> awaiting:` line, and resume by re-dispatching to the agent
that asked, including that output — at the same attempt number.

If the human reports the command failed, that output is environment evidence, not an implementation
FAIL: pass it to the implementer as context without incrementing `> attempts:`.

Waiting on the human is unlimited by design, but not silent: if the same task reaches a **third**
`> awaiting:` cycle, say so in the report. Repeated round-trips usually mean the task's environment
assumptions are wrong, which is a question for the human, not another command.

## Bootstrap pass — one-time task review

(Not to be confused with TASKS.md's own "Phase 0 — Runnable skeleton", which is tasks T-01…T-05.
When reporting, always say "bootstrap pass" or a task ID, never "phase 0".)

Run this only when **no** task in TASKS.md carries a `deps:` line. If most tasks have one and a
few don't — typically new tasks the architect created by splitting — do not re-run the whole
review; ask the architect for the missing `deps:` lines only.

1. Invoke **task-architect** with: TASKS.md verbatim, and the instruction to perform its initial
   review — verify each task traces to the plan and add a `deps:` line to each task (make every
   real execution constraint explicit; the phase order implying them is not enough),
   splitting/merging only where genuinely needed. There is no ownership assignment: a single
   implementer handles both backend and frontend work.
2. On `APPROVED`/`REFINED`: log the outcome to `ai-log/03-execution.md`, show the human the
   TASKS.md diff, and **stop** — the human reviews and commits before any implementation starts.
3. On `BLOCKED`: report the conflict to the human and stop.

**`deps:` format** — one line immediately under the task's heading, before the body:
`deps: [T-01, T-04]`, or `deps: []` for a task with no prerequisites. IDs only, no prose. Written
by the architect, never edited by you.

**Line order under a heading** is fixed, so state is always found in the same place:

```
### [~] T-04 · P1 · Migration 0001 — schema + index
deps: [T-03]
> attempts: 1
> awaiting: docker compose up -d
```

`deps:` first (architect's), then `> attempts:`, then `> awaiting:` when present (both yours).

**The state marker lives inside the heading line.** Editing a heading means preserving the marker
verbatim — this is why the architect is told never to touch headings' markers, and why you never
rewrite a task's title while flipping its state.

## Execution loop (per invocation: one task, start to verdict)

1. **Select.** If a task is `[~]`, resume it at its recorded attempt count — and if it carries
   `> awaiting:`, resume via the *Human-run commands* protocol. Otherwise pick the
   first `[ ]` task (top-to-bottom order) whose `deps:` are all `[x]`. If none qualifies:
   - all tasks `[x]`/`[-]` → report the harness is done; stop.
   - remaining tasks blocked only by `[!]` → report which, recommend architect review; stop.
   - a task's dep is `[-]` (dropped) → **does not count as satisfied**. Dropping is a human act
     with consequences; report that T-nn depends on dropped T-mm and stop. The human either drops
     the dependent too, or edits the dep away.
2. **Mark `[~]`** and set `> attempts: 0` in the fixed line order above, if absent.
3. **Dispatch.** Invoke **implementer** (`model: sonnet`) with: the task text verbatim (including
   "Done when"), the plan sections the task references, and — on retries — the complete latest
   validator FAIL plus prior FAILs. Never include the previous implementer transcript, only the
   artifacts and verdicts.
   - **If the task creates or changes tests, also pass `.claude/rules/tests.md` verbatim** in the
     dispatch. Do not assume it was auto-loaded.
   - If the implementer returns `BLOCKED_PLAN_CONFLICT`: log it, report to the human, stop.
     Plan conflicts are human decisions; do not send them to the architect on your own.
   - If it returns `NEEDS_HUMAN_COMMAND`: follow *Human-run commands* and stop.
   - If it returns `DISCOVERED_WORK` — necessary work the task doesn't cover and that it correctly
     refused to absorb — let it finish the task as scoped, then log the discovery and surface it in
     your report. New tasks are written by the architect, never by you or the implementer; the
     human decides whether to run a bootstrap-style architect pass for it.
4. **Validate.** Invoke **validator** (`model: sonnet`) with fresh context: the task verbatim, its
   "Done when", and nothing of the implementer's reasoning — plus `.claude/rules/tests.md` verbatim
   when the task involves tests. It revalidates the complete criteria, not just the previously
   failing one. If it returns `NEEDS_HUMAN_COMMAND`, follow *Human-run commands* and stop.
5. **Transition** on the verdict:
   - **PASS** → append evidence to `ai-log/03-execution.md` → mark `[x]`, remove the
     `> attempts:` note →
     report to the human with a suggested commit message (named for the decision, per
     conventions) → **stop**. The human commits and re-invokes the loop for the next task.
   - **FAIL** → append the full FAIL (criterion/expected/actual/evidence) to
     `ai-log/03-execution.md` →
     increment `> attempts:`. If attempts < 3 → go to step 3 (retry, same implementer). If
     attempts = 3 → mark `[!]`, set `> attempts: 3 — <one-line summary of the last FAIL>` →
     go to Escalation.
   - **BLOCKED** (validator) → does **not** consume an attempt. Log it. Environment/tooling
     issue → report to the human, stop. Task ambiguous/contradictory → go to Escalation.
   - If the implementer reports that backend and frontend context genuinely interfered (not an
     ordinary bug), log it verbatim and surface it: splitting the implementer in two is a human
     decision, never yours.
6. **`PENDING HUMAN:` lines.** A PASS may carry one or more — checks the validator cannot make:
   the hand-verified number (integration-test task) and interactive browser behavior (the UI
   tasks: reload survival, pasting the URL in a new tab). Copy every such line **verbatim** into
   your report to the human, above the suggested commit message, as the thing to do before
   committing. Never absorb, paraphrase, or drop one — the validator flagging it and you relaying
   it are the only two places it exists. A PASS with a pending line is still a PASS: mark `[x]`.

## Escalation (task is `[!]` or validator-BLOCKED-on-ambiguity)

1. Invoke **task-architect** with: the task verbatim, all validator FAILs for it, and the
   instruction to classify — *task defect* vs *plan defect* vs *hard bug with correct spec*.
   Remind it that state markers, `> attempts:` and `> awaiting:` lines are yours, not its.
2. - **Task defect** → the architect edits the task text (and gives any task created by a split
     its own `deps:` line). Then **you** — not the architect — reset the marker to `[ ]` and
     `> attempts: 0`; log the change; report to the human; stop (human reviews before rerun).
   - **Plan defect** or **hard bug** → report to the human with the architect's diagnosis; stop.
     The harness never modifies PLAN.md and never lowers a "Done when" to get past a bug.
3. Tasks whose `deps:` include the `[!]` task remain unselectable (computed BLOCKED) — say so in
   the report so the human sees what's held up.

## Logging format (append to `ai-log/03-execution.md`)

Per event, raw and chronological. Create the file with an `# Session 03 — harness execution`
heading if it does not exist; never start a different one.

```
### <T-nn> · attempt <n> · <implementer|validator|architect|human-command> · <PASS|FAIL|BLOCKED|REFINED|AWAITING>
<verbatim verdict / evidence / diagnosis / command + human-reported output>
```
