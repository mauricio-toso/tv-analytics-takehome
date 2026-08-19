# Project Conventions — DASH-247 (Relay "is this normal?" dashboard)

Operative rules for working in this repo. This file owns **only** what no other document owns:

- Philosophy → [engineering-principles.md](engineering-principles.md)
- Design decisions, parameters, and rejected alternatives → [PLAN.md](../PLAN.md)
  (stack & security: §6 · baseline statistics: §4 · data handling: §3 · LLM boundary: §8)

Don't restate those here; don't re-litigate them in code. If one looks wrong, raise it against
PLAN.md explicitly.

## API contract

- Invalid params → `400` with a message; never coerce silently.
- Unknown account → `404`.
- Account with no events → well-formed `200` with an explicit empty payload, not a `500`.
- The LLM summary field is optional in the response; its absence is normal, never an error.

## Code organization

- Aggregation SQL lives in `server/db/queries.ts`, commented — queries are reviewable artifacts.
- `server/domain/` stays pure: no I/O, no dates recomputed, no imports from `db/` or `routes/`.
- Frontend components are small wrappers over native HTML elements; one plain `styles.css`.

## Process

- Plan before code; scope changes go through PLAN.md first, not silently into the diff.
- AI interactions are logged raw in `ai-log/` (prompts, corrections, rejections) — honesty
  over tidiness.
- Commits are small and named for the decision they implement.
