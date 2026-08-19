# Engineering Principles

Normative for any project I work on, and for any agent working with me.
Every architectural decision gets checked against these before it enters the plan.

## 1. Keep it simple, keep it functional

- Minimal and functional beats broad and clever. A feature enters scope only if a
  requirement (or a data reality) demands it — never "because it might be useful".
- "Minimal" means the minimum that is **correct**, not the minimum that runs.
  If the simple version is wrong against the real data, it isn't simple — it's broken.
- Growth-friendly ≠ growth-speculative: leave clean seams, don't build empty floors.

## 2. Dependencies are liabilities

- Every dependency must be justified against a concrete requirement. If the native
  platform (language, browser, SQL) solves it in reasonable lines, no library.
- Prefer boring, standard, transparent tools over clever abstractions. The next
  engineer should read the repo without learning a framework first.
- The dependency list is part of the design and gets reviewed like code.

## 3. Security and supply chain by default

- **Fewest possible dependencies is the first supply-chain control.** Everything
  below hardens what remains.
- **pnpm** as package manager, configured strictly:
  - `save-exact=true` — versions pinned exactly, no `^`/`~` ranges.
  - Lockfile committed; installs are `--frozen-lockfile` everywhere but active
    dev — the lockfile is the source of truth, never the registry at install time.
  - Lifecycle scripts blocked by default (pnpm ≥10 behavior); packages that need
    build scripts are explicitly allowlisted in `onlyBuiltDependencies`, each with
    a reason.
  - `minimumReleaseAge` set so freshly published versions (the classic
    hijacked-package window) are not installable for a cooling-off period.
  - pnpm itself pinned via the `packageManager` field (corepack) — the tool that
    verifies the chain is also versioned.
- **Trust boundaries are explicit:** every external input (HTTP params, DB rows,
  model output) is validated at the boundary where it enters. SQL is always
  parameterized — string interpolation into queries is a defect regardless of
  the data source.
- No secrets in the repo, ever. `.env.example` documents shape; real values stay
  local. Even when the current build has no secrets, the structure assumes some
  day it will.

## 4. Design patterns earn their place

- Patterns are vocabulary for solving a present force — not architecture goals.
  A pattern enters the codebase only when the problem it solves is already there.
- No speculative structure: no repository layers, DI containers, generic service
  layers, or interfaces with a single implementation "for the future".
- Patterns that typically do earn their place, and when:
  - **Functional core, imperative shell** — business logic as pure functions,
    I/O at the edges. Earned whenever logic needs testing in isolation.
  - **Single source of truth** — every piece of state has exactly one owner;
    nothing is computed in two places.
  - **Strategy / swappable provider** — a minimal interface in front of an
    external nondeterministic service (e.g. an LLM), so implementations swap
    without touching callers. Earned only when a real second implementation
    exists or is the stated next step — not "just in case".
  - **Fail-safe fallback** — nondeterministic or unreliable outputs are additive,
    validated, and backed by a deterministic path. The core product never depends
    on them.
  - **Guard clauses over nesting** — validate and exit early; the happy path
    reads top-to-bottom.
- When a pattern is used, name it (in a comment or the README) so the choice is
  reviewable. When one is deliberately absent, that's a decision too — record it.

## 5. Deterministic first

- If the transformation can be specified as exact rules over structured input,
  it's code — always. Deterministic wins on cost, speed, testability, and being
  correct 100% of the time, not most of it.
- If the cases can be enumerated, it's static content or a template. An LLM
  generating what could have been written once is pure cost.
- An LLM enters only where the deterministic questions fail: the input or output
  is open natural language, or the criterion is genuinely unspecifiable as rules
  ("what matters most here?"). And even then, only if:
  - its output is verifiable or low-stakes,
  - a deterministic fallback exists and the product works without the model,
  - the marginal value over the best template pays the marginal cost.
- Corollary: "the task is language-shaped" is necessary but not sufficient.
  If a template gets 90% of the value, the template wins too.

## 6. Honest handling of data and failure

- Real data is messy; handle its edges explicitly (nulls, duplicates, outliers,
  empty sets) and say so in the UI rather than hiding them.
- Errors are handled where something meaningful can be done, and surfaced
  honestly otherwise. No silent catches.

## 7. Verification over volume

- Few tests, aimed at what could actually be wrong. No coverage farming.
- At least one number verified by hand against the source data, not by the code
  that produced it.
- If a claim can't be verified, say so — an honest "unverified" beats a
  confident guess.
