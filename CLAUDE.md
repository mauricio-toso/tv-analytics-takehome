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
