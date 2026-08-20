# AI Interaction Log

Raw-ish, chronological record of how this challenge was built with AI agents. Honesty over
tidiness, per the brief: corrections, rejections, and dead ends are kept, not sanitized.

## Tools and models — who did what

- **Claude Code** (desktop, VSCode extension) running **Claude Opus 5**, switched mid-planning
  to **Fable 5** via `/model` — used for: surveying the challenge and seed data, drafting
  PLAN.md and the agent-context artifacts (`CLAUDE.md`, `resources/`), architecture discussion,
  and (later sessions) implementation.
- **Me (the human)** — direction, scope decisions, and review. Every architectural decision in
  PLAN.md §6 that differs from the agent's first proposal came from my pushback (see session 01).
  I did not hand-write code in the planning phase; I hand-reviewed everything committed.
- Not used: Copilot/Cursor/other assistants.

The division of labor, stated honestly: the agent authors, I govern. My leverage went into
constraining the agent (principles, conventions) and catching over-engineering, not into typing.

## How to read this log

- One file per working session, chronological: `01-planning.md`, `02-harness.md`,
  `03-execution.md`.
- Sessions 01–02: each entry is my prompt (verbatim or condensed — marked which), the agent's
  proposal (gist, with excerpts), and the outcome: **accepted / rejected / redirected**, and why.
- Session 03 (`03-execution.md`) is a different, deliberately rawer format: it's the `sdd-loop`
  harness orchestrator's **append-only, written-as-it-happened** record of every implementer
  dispatch, validator verdict (PASS *and* FAIL, verbatim), human redirection, and
  `NEEDS_HUMAN_COMMAND` round-trip for every task in `TASKS.md`. It is not reconstructed
  afterward like 01/02, so it carries its own entry format (`### <task> · attempt <n> ·
  <role> · <verdict>`) instead of the `E1/E2…` numbering — that's a deliberate difference, not
  an inconsistency to fix. It is read-only for every agent including this file's own writer;
  see *Scope boundary* in T-18 (`TASKS.md`). This section (and the reflection below) point at it
  rather than duplicating or summarizing it away.
- Meta-honesty: these log files are themselves drafted by the agent at my direction, from the
  actual session transcript, and reviewed by me — consistent with how the whole repo is built.

## Reflection: where I caught the AI, where it caught me

Kept up to date as sessions accumulate; details inline in each session file.

**Where I caught / overrode the agent:**

1. **Next.js as default** — the agent's first stack proposal was Next.js 15 + RSC for a
   one-page dashboard. I challenged it as overkill; we landed on Vite + React + Express.
   (Session 01, E4)
2. **ORM by default** — Drizzle was in the first proposal. Once questioned, the agent itself
   concluded the ORM would be "decoration" over 2 tables and raw SQL; the honest version of
   this entry is that it took my prompt for the agent to apply its own reasoning. (S01, E5)
3. **Gold-plating** — the agent's plan included an "only show abnormal locations" toggle that
   no requirement asked for. Surfaced when I stated my keep-it-simple policy and asked for an
   honest audit; the agent identified and cut its own addition. (S01, E6)
4. **Documentation duplication** — I spotted that `project-conventions.md` restated half of
   PLAN.md (a single-source-of-truth violation the agent had just written into the principles
   it authored). The agent agreed and rewrote conventions to pointers + operative rules only.
   (S01, E10)

**Where the agent pushed back on me, correctly:**

5. **Supabase** — I floated it as a familiar tool; the agent rejected it with challenge-specific
   arguments (local-run friction, PostgREST pass-through being literally what the brief
   disallows) that I found convincing. (S01, E5)
6. **Median/MAD over "simpler" mean** — the agent defended the statistically robust baseline
   against the simplicity instinct, on the grounds that the seed's account-6 burst makes the
   simple version *incorrect*, and "minimal means minimal-correct". (S01, E3/E6)
7. **tests.md copied from the wrong repo** — I pasted a test rule from my design-system project;
   the agent flagged it as Angular-specific and instructing commands this repo's settings deny.
   (S02, E4)
8. **My harness draft violating my own principles** — 7-state machine duplicating TASKS.md state,
   parallelism contradicting one-task-one-commit, missing frontmatter making my agents inert.
   (S02, E2/E3)

9. **An assumed decision, written into this log as mine** — the agent recommended 3 agents; I had
   already written 4 files following its earlier proposal. It read that as my deliberate override,
   proceeded on it, and recorded a justification I never gave. Caught when I asked why the
   implementers weren't unified. Unified now; the log entry was rewritten to what happened.
   (S02, E6)

**Where I constrained the agent:**

10. **Human-only commits** — my rule at the plan gate; the agent hardened it beyond what I asked
    (settings deny, not just prompt rules). (S02, E5)

**Where execution (session 03, the `sdd-loop` harness run) surfaced real defects — details are
in `ai-log/03-execution.md`, not restated here:**

11. **T-01's spec was wrong, not just the implementation.** The task told the implementer to put
    four supply-chain controls in `.npmrc`; pnpm 11 doesn't read them there. The validator FAILed
    it correctly on the literal criterion (`minimumReleaseAge` missing), but I recognized the
    deeper problem, told the orchestrator not to patch around it, and directed a spec correction
    instead. The orchestrator sourced the pnpm 11 schema independently against the installed
    CLI's own help text and the published docs before rewriting the task — it didn't take my
    claim on faith either. (`03-execution.md`, T-01 attempt 0/1)
12. **The validator crossed its own read-only boundary, and was caught.** While validating T-01
    it ran `pnpm config set minimumReleaseAge 7` — a write, not on its allowed command list —
    because a broad `Bash(pnpm config:*)` grant in `.claude/settings.local.json` covered both
    `get` and `set`. The orchestrator checked for lasting damage (found none), stood by the FAIL
    verdict on its actual merits (independently reconfirmable by just reading `.npmrc`), and
    flagged the settings gap as mine to close rather than quietly patching it. (`03-execution.md`,
    T-01 attempt 0 validator)
13. **An implementer changed a file it was explicitly told not to.** Fixing a genuine Windows
    host/Docker port collision in T-04, the implementer also rewrote the *committed*
    `.env.example` to the machine-specific port — after being told the docker-compose default
    was not to change. The orchestrator caught it on a routine `git diff` before dispatching the
    validator, which FAILed narrowly on that one line; a single scoped retry fixed it without
    reopening anything else. (`03-execution.md`, T-04 attempt 1)
14. **A validator FAIL turned out to be a context gap, not a real defect.** T-06's fresh-context
    validator FAILed on "the new file isn't committed" — true, but not stated anywhere in the
    task's actual "Done when," and inconsistent with every prior PASS (agents never commit; every
    earlier task was validated with new files sitting uncommitted). The orchestrator didn't
    overrule the verdict — it stands, logged as delivered — but diagnosed *why* it happened
    (validators are dispatched fresh and can't see this log) and re-dispatched with that missing
    context supplied, rather than treating it as a real implementation flaw. (`03-execution.md`,
    T-06 attempt 0/1)
15. **An implementer fixed a bug in already-`[x]`, already-validated code, out loud rather than
    quietly.** Building T-12's timezone test, the implementer found T-08's committed week-bucketing
    expression was directionally wrong (double `AT TIME ZONE` conversion instead of one), verified
    it against the live seeded DB, corrected the one line, and flagged the fix loudly in its report
    instead of folding it in silently. (`03-execution.md`, T-12 attempt 0)
16. **A task's own acceptance criterion turned out to contradict the plan.** T-08's "no more, no
    less" nine-row clause made `insufficient_history` unreachable through the live endpoint for
    *any* input against the seed — directly contradicting PLAN's "a new location shows not enough
    history." The implementer proved this by brute-force enumerating all 1,539 valid combinations
    rather than asserting it, returned `DISCOVERED_WORK` instead of quietly fixing T-08's already-
    validated code, and the fix landed as an appended task (T-19) that supersedes the clause —
    T-08's original text stays as written, per the "tasks are appended, not rewritten" rule.
    (`03-execution.md`, T-12 attempt 0 DISCOVERED_WORK; T-19)
17. **One-task-at-a-time was deliberately broken once, on the record.** T-19's fix unblocked a
    ranking sub-assertion T-12 needed but couldn't test yet. Rather than let the orchestrator
    improvise a sequencing call, it stopped and asked; I authorized T-19 to run as a one-off
    exception while T-12 sat paused mid-validation, logged as a named exception to the frozen
    rule rather than a silent deviation. (`03-execution.md`, "sequencing · human decision")
18. **The no-browser carve-out from planning (S02, E8) held up in practice, five times.** T-12's
    hand-verified figure and T-14/T-15/T-17's browser-only checks all came back with a
    `PENDING HUMAN:` line instead of a validator PASS papering over what it couldn't see — exactly
    the failure mode E8 was written to prevent. (`03-execution.md`, T-12/T-14/T-15/T-17 PASS
    entries)
