---
paths: ["server/**/*.test.ts", "tests/**/*.test.ts"]
---

# Test rule

Tests exist to falsify the five known risks (PLAN §7 / TASKS T-10 + T-12) — baseline math vs.
outliers, duplicate collapse, timezone bucketing, zero-fill, empty account — plus one
hand-verified number. Nothing else. No coverage farming (principles §7).

## Patterns to follow

- **Domain tests are pure.** Tests for `server/domain/` import the module and feed it arrays —
  no DB, no I/O, no dates computed in the test (weeks are SQL's job). If a domain test needs a
  mock, the domain module has an impurity bug.
- **Integration tests hit the real seeded DB** via supertest against the Express app. Never mock
  the database — the seed's messiness (duplicates, the account-6 burst, empty account 20) *is*
  the test material.
- **Test names state the belief they would falsify.** `"an order-of-magnitude outlier does not
  move the baseline"`, not `"median works"`.
- **The hand-verified number**: exactly one assertion is pinned to a figure computed by hand in
  SQL. That SQL goes in a comment directly above the assertion, so the number is traceable to a
  query, not to the code under test.

## Quality bar

Test correctness, not execution:

```typescript
// ✅ Strong — pins the behavior the median decision exists for
expect(baseline([12, 14, 11, 13, 800, 12, 14, 13]).median).toBeCloseTo(13);

// ❌ Weak — only proves the function runs
expect(baseline(weeks)).toBeDefined();
```

Every test should fail meaningfully when the code is broken. If removing the assertion wouldn't
change which bugs the test catches, the assertion is too weak.

## Test runner

Vitest + supertest. **pnpm only — never `npm`, `npx`, or `yarn`** (denied in settings.json).

- **During implementation** — run only the file under development:
  `pnpm vitest run tests/<name>.test.ts` for immediate feedback.
- **Full suite** — `pnpm test` for final verification before handing to the Validator.
- Integration tests assume migrated + seeded Postgres is up (`docker compose up -d`,
  `pnpm db:migrate`, `pnpm db:seed`); a test must fail loudly, not skip silently, if it isn't.
