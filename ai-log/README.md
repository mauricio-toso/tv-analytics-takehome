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

- One file per working session, chronological: `01-planning.md`, `02-…`
- Each entry: my prompt (verbatim or condensed — marked which), the agent's proposal (gist,
  with excerpts), and the outcome: **accepted / rejected / redirected**, and why.
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
