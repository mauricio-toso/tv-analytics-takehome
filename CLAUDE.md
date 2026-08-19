# CLAUDE.md

Project: **DASH-247** — Relay's "is this normal for us?" dashboard (take-home challenge,
see [resources/CHALLENGE.md](resources/CHALLENGE.md)).

## Read first, in this order

1. [resources/engineering-principles.md](resources/engineering-principles.md) — normative
   philosophy. Every proposal you make gets checked against it **before** you present it.
2. [resources/project-conventions.md](resources/project-conventions.md) — decisions already
   frozen for this project (stack, patterns, data handling). Don't re-litigate them; if you
   believe one is wrong, say so explicitly and wait — never silently deviate.
3. [PLAN.md](PLAN.md) — the implementation plan. Scope changes go through this file first.
4. [TASKS.md](TASKS.md) — the plan broken into atomic, individually verifiable units. This is
   where work is picked up; never start from a free-form request.

## How work flows here (spec-driven)

Constitution (1–2) → spec/plan (3) → tasks (4) → code. The direction is one-way: a task may not
contradict the plan, and the plan may not contradict the principles. Work exactly one task at a
time and stop when its **Done when** is demonstrated. If a task turns out to need something nobody
wrote down, append a new task — don't widen the one in hand; if it turns out the *plan* is wrong,
say so and fix PLAN.md before touching code.

Execution runs through the SDD harness: the `sdd-loop` skill (deterministic orchestrator) routes
each task to the agents in `.claude/agents/` (task-architect, implementer, validator) and logs
every verdict to `ai-log/03-execution.md`. Two boundary rules, both enforced in settings, not
merely requested: **agents create and edit files, only the human commits** (`git commit` denied),
and **agents never change the machine** — `docker compose up/down` and `pnpm install/add/remove/
update` are the human's, run in their terminal. An agent needing one stops with
`NEEDS_HUMAN_COMMAND` instead of working around the denial.

## Hard rules for agents

- **Keep it minimal and functional.** No feature, dependency, or abstraction without a
  requirement demanding it. When in doubt, propose the smaller version.
- **Never edit `seed/seed.sql`** or regenerate the dataset. Messiness (duplicates, nulls,
  the account-6 burst, empty account 20) is handled in queries and code, not by cleaning data.
- **SQL is always parameterized.** Interpolating values into query strings is a defect.
- **pnpm only**, strict config (exact versions, frozen lockfile, no lifecycle scripts
  without allowlist). Never run `npm install` / `yarn` here.
- **Week boundaries are computed in SQL only**, in the account's timezone. Don't recompute
  dates in TypeScript.
- **Log the work honestly.** Mistakes you make and corrections you receive go into the AI
  log as-is; don't sanitize.

## Verify, don't assume

- Aggregates must be checkable against the seed: when you produce a number, show the SQL
  that verifies it.
- Tests target the five known risks (baseline math vs. outliers, duplicate collapse,
  timezone bucketing, zero-fill, empty account) — not coverage.
