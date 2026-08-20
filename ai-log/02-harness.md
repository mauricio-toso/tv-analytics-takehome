# Session 02 — TASKS.md + SDD agent harness

Claude Code (VSCode extension), Opus 5 → Fable 5 mid-session via `/model`. Chronological; the
corrections in both directions are the point of this file.

## E1 — TASKS.md creation

**Me (condensed):** apply an SDD workflow — constitution = CLAUDE.md + engineering-principles,
PLAN.md as the how/what, and a TASK md defining atomically what to implement.

**Agent:** proposed mapping the SDD chain onto the *existing* artifacts instead of creating new
spec documents (constitution → PLAN.md → new TASKS.md), and wrote TASKS.md: 18 tasks in 7 phases
mapped to PLAN §9's time budget, each with a "Done when" requiring demonstrated evidence (SQL
output, curl, named tests). Also added the SDD flow section to CLAUDE.md.

**Outcome: accepted.** Notable find I hadn't spotted: the starter data lives in `code/seed.sql`
but CLAUDE.md's hard rule and the settings.json deny path guard `seed/**` — which doesn't exist
yet. The agent turned that into T-02 (byte-identical move, sha256 in the commit body) instead of
silently moving files.

## E2 — my harness proposal, agent's review

**Me:** proposed a 4-agent harness (Task Architect, Backend Implementer, Frontend Implementer,
Validator) + deterministic orchestration, source-of-truth hierarchy, 3-attempt cap, escalation,
task state machine (7 states), parallel execution of independent tasks.

**Agent (gist):** endorsed the skeleton (deterministic orchestrator, independent evidence-based
validator, 3-cap, classified escalation) but pushed back on three points, citing my own
principles:

1. backend/frontend split "not earned" — 3 of 18 tasks are frontend; the API↔UI seam gets two
   owners; recommended a single implementer with a documented seam to split later;
2. the 7-state machine duplicates TASKS.md's markers — single-source-of-truth violation;
   recommended TASKS.md as the only store with computed READY/BLOCKED;
3. parallelism contradicts the frozen one-task-at-a-time / one-commit rule; recommended strictly
   sequential.

Plus gaps: the principles-§7 hand-verified number must stay human (a validator agent is still
"the machine"); FAIL verdicts must be logged, not only successes; validator read-only should be
tool-enforced, not prompt-enforced.

**Outcome: accepted** — sequential execution, TASKS.md as the only state store, and all the
gap-fixes. See E6 for what happened with the 3-vs-4-agent recommendation; it took a detour worth
recording.

## E3 — I wrote the 4 agent definitions; agent re-review

**Me:** added generic `task-architect.md`, `backend-implementer.md`, `frontend-implementer.md`,
`validator.md` under `.claude/agents/`.

**Agent (gist):** content approved (it called my Validator `BLOCKED` verdict an improvement over
its own proposal — distinguishes can't-evaluate from fail without burning attempts). Found:

1. **blocker:** no YAML frontmatter → Claude Code doesn't register them as subagents at all;
2. validator read-only was aspirational — needs `tools:` without Edit/Write;
3. all four hierarchies omitted the constitution (the layer holding the non-negotiable rules);
4. loop semantics to pin in the orchestrator: BLOCKED doesn't consume an attempt, ID scheme for
   splits, §7 carve-out missing from the validator.

**Outcome: accepted**, folded into the update plan.

## E4 — tests.md caught as copied from another repo

**Me:** added `.claude/rules/tests.md` and asked for review.

**Agent:** flagged it as verbatim from a different project — Angular, `@testing-library/angular`,
`src/lib/**` paths, and `npx`/`npm` commands that this repo's own settings.json denies. True: I
had copied it from my design-system repo as a starting point. Kept the mechanism (path-scoped
rule) and the quality bar ("if removing the assertion wouldn't change which bugs the test
catches, it's too weak"); the agent rewrote the content for this stack (five known risks, pure
domain tests, real seeded DB, pnpm-only).

**Outcome: accepted.** Honest note: shipping it as-was would have instructed agents to run
denied commands against nonexistent paths.

## E5 — commit boundary

**Me:** rejected the agent's plan at the approval gate with one rule: agents may create files,
but **only I commit**.

**Agent:** reworked the plan to enforce it at three levels — orchestrator stops after PASS and
only suggests a commit message; every agent's forbidden actions; and `git commit` moved from
`ask` to `deny` in settings.json so it's structural rather than behavioral.

**Outcome: accepted and implemented.**

## E6 — the agent assumed a decision I never made

**What happened:** the refined plan (E2) recommended **3** agents — one Implementer instead of a
backend/frontend split. My next message was "I added 4 generic agents, could you review them?" —
so I had written `backend-implementer.md` and `frontend-implementer.md` following the *original*
proposal, without having registered the recommendation. The agent read the act of writing four
files as a deliberate rejection of its recommendation, opened its review with "I take it that's
your decision and I'll go with it", and — worse — wrote that inferred decision into this log (E2)
as a documented human override, complete with a justification I never gave.

**Me:** asked why it hadn't unified the implementers after all.

**Agent:** admitted the inference rather than defending it: it should have asked instead of
reading intent from an action, since "I decided to keep 4" and "I didn't register the
recommendation" lead to different work. It also flagged that the fabricated log entry was the
more serious half — an AI log that attributes reasoning to me that I never produced is exactly
the sanitized-artifact failure this file exists to avoid.

**Outcome: unified.** One `implementer.md` replaces both (they were ~90% identical — during this
same session, every one of the four content edits had to be applied twice, which was the argument
in miniature). Tasks no longer carry an `owner:` line, so the architect's Phase-0 pass only
assigns `deps:`. The seam-splitting condition survives as an escalation path: if implementation
evidence ever shows backend and frontend context genuinely interfering, the harness surfaces it
and the split becomes a human decision. This entry replaces the fabricated E2 outcome.

## E7 — flow review before first execution

**Me:** asked for a full walkthrough of how to run the harness, and for the flows to be reviewed
first to check nothing was left undefined.

**Agent:** traced the loop from T-01 and found six places where the orchestrator would have had to
improvise — which its own first rule forbids:

1. the target ai-log file was never named ("the current session file");
2. `.claude/rules/tests.md` may not be auto-loaded at all (that `paths:` frontmatter mechanism is
   Cursor's, not Claude Code's) — it flagged this as **unverified**, not as fact;
3. **T-01 would likely have failed three times**: its "Done when" required
   `pnpm install --frozen-lockfile` to pass before any lockfile existed;
4. T-02 needed `mv`, but an implementer reaching for Write would hit the intentional
   `Write(./seed/**)` denial and improvise;
5. `deps:` had no defined format or placement, and nothing stopped the architect from clobbering
   state markers;
6. `> attempts:` — the only record of the retry counter — wasn't in the TASKS.md legend.

It also priced the harness honestly: 19 human-gated invocations × 2 subagents, against a 4–6h
budget, and offered running the loop only for the correctness core (T-06→T-12) if that pressure
becomes real.

**Me:** accepted all six. Added two constraints of my own:

- **I run environment commands myself**, in my terminal — `docker compose up/down`,
  `pnpm install/add/remove/update`. Not "ask", but mine.
- **Implementer and validator are pinned to sonnet**; only the architect (a single pass) may use
  opus. Token budget.

**Outcome: applied.** The environment rule became a real protocol rather than a preference: those
commands moved from `ask` to `deny` in settings.json, and agents now return
`NEEDS_HUMAN_COMMAND` — the harness pauses with `> awaiting: <command>`, I run it, paste the
output, and the loop resumes **without consuming a retry attempt** (waiting on me is not a failed
implementation). The agent drew one line I'd left ambiguous: read-only inspection inside a running
container (`docker compose exec … psql -c`) stays with the validator, since denying it would gut
its evidence channel for every DB task. Model policy went into agent frontmatter (`model: sonnet`)
and into the dispatch rules.

## E8 — second trace, and the validator's browser ceiling

**Me:** confirmed `/agents` and the skill register, and asked for the whole flow to be traced
again for remaining gaps.

**Agent:** found ten more, all of the "the orchestrator would have to improvise" kind — two names
colliding on "Phase 0"; `[-]` dropped deps having no defined semantics; the escalation step
reading as if the architect resets state markers (which its own rules forbid); T-18 potentially
having an implementer rewrite the harness log that records its own validation; the state marker
living *inside* the heading line where a title edit would clobber it; no fixed line order for
`deps:` / `attempts:` / `awaiting:`; deny patterns missing bare `docker compose up` and install
flag variants; tasks created by a split having no `deps:`; no stop condition on repeated
`awaiting` round-trips; and — the one with no owner at all — TASKS.md's "never widen a task,
append a new one" rule, which the implementer is forbidden to carry out since it cannot edit
TASKS.md. That last one became a `DISCOVERED_WORK` return.

**Then it surfaced a ceiling I had not considered:** the validator's tools are
`Read, Grep, Glob, Bash` — **no browser**. T-14's criterion is that a reload restores all three
controls and that pasting the URL in a new tab reproduces the view. That is precisely the
challenge's explicit requirement, and no amount of curl proves it. It offered jsdom or Playwright
as alternatives and recommended against both (dependencies for three tasks), proposing instead the
same shape as the hand-verified-number carve-out.

**Outcome: accepted (option 1).** Validation is now explicitly split for these tasks: the agent
checks what is statically checkable — crucially, that the URL is the *only* owner of control state,
since duplicated React state is how reload-survival breaks while looking correct — and returns a
`PENDING HUMAN:` line for what needs a browser. The orchestrator must relay those lines verbatim
into its report; a PASS with a pending line is still a PASS. Applied to T-12 (the hand-verified
number), T-14 and T-15.

Worth naming plainly: without this, the validator would have returned PASS on T-14 by reading code,
and I would have believed the reload requirement was tested when nobody had opened a browser.

## Artifacts produced this session

TASKS.md · 3 agents (`task-architect`, `implementer`, `validator`) with frontmatter, constitution
in the hierarchy, and the §7 carve-out · rewritten `.claude/rules/tests.md` · new
`.claude/skills/sdd-loop/SKILL.md` (deterministic orchestrator) · CLAUDE.md flow section ·
settings.json commit-deny · this file.

## Where I caught the AI / where it caught me (delta for ai-log/README.md)

- **It caught me:** tests.md copied from the wrong project (E4); missing frontmatter that made my
  agents inert (E3); my 7-state machine violating the single-source-of-truth principle I'd frozen
  myself (E2).
- **I caught it inventing my reasoning:** it inferred a 4-agent decision from the fact that I'd
  written four files, then recorded that inference in this log as a deliberate override of mine,
  with a justification I never gave (E6). The harness design was recoverable; the fabricated log
  entry was the real defect, and this file now carries the corrected version rather than the
  tidy one.
- **I constrained it:** the human-only-commit rule (E5), which it then hardened further than I
  asked (deny-level enforcement).
