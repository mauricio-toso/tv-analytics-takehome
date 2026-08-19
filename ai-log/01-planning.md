# Session 01 — Survey & planning (2026-08-19)

Claude Code, Opus 5 (switched to Fable 5 mid-session via `/model`). No code written in this
session — deliberately. Everything here precedes implementation.

**Language note:** the session ran in Spanish; prompts below are faithful English translations
of what I actually typed (marked **[translated]**), condensed only where marked. Nothing has
been rewritten into prompts I didn't send — the originals are in the session transcript.

**On prompting style:** my prompts in this phase are deliberately conversational and
interrogative rather than long engineered specs. That's the technique, not an accident:
during planning I direct the agent by challenging its defaults, injecting constraints, and
demanding honest self-audits — then let it do the heavy authoring inside those constraints.
Each entry names the direction technique used and what it produced. Detailed spec-style
prompting starts in the implementation sessions, where it belongs.

---

## E1 — Kickoff: survey before solution

**Me [translated]:** "Explore this challenge. First of all, survey it, give me
your opinion on the challenge, and then propose quick-to-adopt
technologies to build it."

**Technique:** forced ordering — *survey → assess → propose*. The agent is explicitly barred
from jumping to a stack before it has read the material and formed a judgment I can check.

**Agent:** read `CHALLENGE.md`, fetched the seed repo (schema, README, and the
`generate_seed.py` generator) and extracted the planted traps before proposing anything:
12 duplicate rows, account 20 empty, account 6 with an 800-event single-day burst
(2026-06-03), UTC timestamps + per-account IANA timezone, ~4%/3% NULLs. Rated the challenge
"technically 5/10, as a challenge 8/10 — the risk is over-building".
Proposed a slice (median/MAD baseline over 8 local weeks, per-location verdicts, URL-persisted
filters) and a stack: **Next.js 15 + Drizzle + Postgres + Vitest**.

**Outcome:** survey and slice **accepted** — the trap analysis held up and drove everything
after; reading the generator script instead of guessing at the data is the practice I'd
endorse as standard. Stack **later rejected in parts** (E4/E5).

## E2 — Scoping decisions (structured questions)

**Agent asked, I chose:** TypeScript stack (my strongest) · LLM part as **mocked boundary
with real prompts** (not skipped, not live API) · **PLAN.md before any code** (explicitly to
keep this log's chronology honest).

**Technique:** letting the agent surface the decision points, keeping the decisions human.

## E3 — First PLAN.md draft

**Agent:** wrote PLAN.md v1: interpretation, assumptions table, data reality check, median+MAD
design with rationale tied to account 6, scope in/out, tests targeted at the five known risks,
LLM section, time budget.

**Outcome:** structure **accepted**; architecture section subsequently rewritten through
E4–E7. I interrupted the agent when it tried to proceed to cloning/scaffolding — planning
wasn't settled. **Technique:** hard gate between phases; the agent doesn't advance a phase
because it finished typing, it advances when I say the phase is done.

## E4 — Challenging the default stack — REDIRECTED

**Me [translated]:** "Don't you think Next.js is overkill for this? Couldn't plain React do
the job?"

**Technique:** challenge-the-default. Short adversarial question forcing the agent to defend
or drop its choice against the actual requirements — cheaper and more revealing than
specifying a stack myself.

**Agent:** conceded with a trade-off table — Next bought one-process convenience but App
Router/RSC is "machinery this app doesn't need"; plain React needs a separate API but it's
transparent. Revised to **Vite + React + Express**, noting the brief itself rewards the stack
you're strongest in.

**Outcome:** **redirected, accepted.** First clear case of the agent defaulting to the
fashionable heavy option until pushed.

## E5 — ORM and BaaS on trial

**Me [translated]:** "Tell me — I've only used Drizzle a few times and I need to review it a bit before implementing it, but if it's easy to learn we can use
it. The other tool I do know is Supabase. What's your take?"

**Technique:** disclosed my real familiarity constraints and put both options on trial
instead of asking a leading question — inviting the agent to argue against either, including
the one I like.

**Agent:** rejected **Supabase** with requirement-grounded arguments: ~10 local containers vs
the 15-minute-run rule, and its PostgREST client idiom being exactly the "pass-through
queries" the brief disallows. On Drizzle it first defended "easy to learn", then — pushed by
the question *what is the ORM buying?* — concluded the one interesting query is raw SQL
anyway and the schema is 2 given tables; the ORM would be decoration. Proposed **`pg` +
`node-pg-migrate` + raw SQL**.

**Outcome:** **accepted.** Notable both ways: the agent talked me out of my familiar tool
with reasons I found convincing, and my prompt is what made it apply its own value test to
the ORM it had proposed.

## E6 — Constraint injection + self-audit — agent catches its own gold-plating

**Me [translated, condensed]:** "My policy is keep-it-simple: minimal and functional, no
features added 'just because', good and necessary design patterns only. Does the latest
architecture comply? I feel it does, but I want your honest view."

**Technique:** two-part — (1) inject an explicit normative constraint, (2) demand an audit of
prior output against it, pre-committing the agent to honesty ("honest view") rather than
validation of my feeling.

**Agent:** audited itself: cut **react-router** (native URLSearchParams suffices), **zod**
(3 params, hand-rolled guards), and an **"only show abnormal" toggle** it had put in the plan
unprompted — its words: "it was my own gold-plating". Kept and defended **median/MAD**
("minimal means the minimum that is *correct*; a mean is broken against this dataset") and
the stubbed LLM boundary. Declared patterns deliberately absent (no repository/DI/speculative
interfaces).

**Outcome:** **accepted in full.** The toggle is this log's cleanest example of an agent
inventing scope — and it surfaced only when policy was stated and an audit demanded.

## E7 — Native components (closed verification)

**Me [translated]:** "One thing — components: were you planning to make them all native?"

**Technique:** closed verification question on a specific dimension the plan hadn't made
explicit — cheap way to force a latent decision into the open before code exists.

**Agent:** yes: native `<select>`/`<table>`, two small own wrapper components, one plain
`styles.css`; rejected MUI/shadcn/Tailwind with the brief's own "unstyled-but-clear beats
pretty-but-broken". Frontend deps: react, react-dom, nothing else. **Accepted.**

## E8 — Principles as committed artifacts; security & supply chain

**Me [translated, condensed]:** "It may be prudent to create a `resources/` folder with my
architecture and philosophy alignments, to be used as the base for the plan — it's what the
plan should have been built from. Also important: security — pinned dependencies, pnpm with a
configuration that mitigates supply-chain risk — and stronger emphasis on design-pattern use."

**Technique:** converting my working philosophy from conversation into committed agent-context
artifacts — turning one session's corrections into standing constraints every future session
inherits. This is the reusable-instructions leverage the brief calls out.

**Agent:** flagged that the brief explicitly rewards committing agent-context artifacts.
Wrote `resources/engineering-principles.md` (incl. pnpm strict config: exact versions, frozen
lockfile, blocked lifecycle scripts + allowlist, `minimumReleaseAge`, pinned
`packageManager`), `resources/project-conventions.md`, and `CLAUDE.md`. On chronology it
proposed the honest route: record that principles were made explicit *during* plan review and
drove the E4–E6 cuts, rather than pretending they predated the plan. Flagged unprompted that
`minimumReleaseAge` needs pnpm ≥ 10.16 — to be verified at setup instead of silently
configuring a no-op.

**Outcome:** **accepted**, including the honesty note now at the top of PLAN.md.

## E9 — Deterministic vs LLM: interrogate intent, then inject the rule

**Me [translated, condensed]:** first: "What is the challenge really after with the 'LLM in
the product' part?" Then, my rule: "Whenever a deterministic approach can solve it, it must
be used — for cost. Only where introducing LLM reasoning is unavoidable to solve the task
acceptably should it be used; if it adds no value, no. Where do you detect the LLM could
genuinely be part of this product?"

**Technique:** understand-before-deciding (make the agent explain the evaluator's intent
first), then constraint injection — my decision rule stated as a hard norm — followed by
asking the agent to apply the rule exhaustively rather than to justify a predetermined
feature.

**Agent:** explained the brief's intent (filtering engineers who sprinkle AI vs. those who
engineer around a nondeterministic component; the gratuitous-LLM warning). Formalized my rule
as principles §5 (*Deterministic first*, with the corollary: if a template gets 90% of the
value, the template wins). Rewrote PLAN.md §8 as an audit of all seven candidate spots — six
resolve deterministic/static/rejected; the Monday narrative's *editorial* half (selection +
synthesis under a fuzzy criterion) is the only survivor, with the honest caveat that its
marginal value over a top-2-deviations template is modest. Added the inevitability frontier:
transcript/free-text classification is where an LLM stops being optional in this product.

**Outcome:** **accepted.** This is where the plan's LLM section stopped being a feature idea
and became a decision rule.

## E10 — Consistency review across documents — REDIRECTED

**Me [translated]:** "Don't you feel there's repeated information between project conventions
and the plan?"

**Technique:** cross-document consistency probe — reviewing the agent's output *as a set*,
not file by file, and holding it to the single-source-of-truth principle it had itself just
authored.

**Agent:** confirmed the duplication (conventions restated PLAN.md's stack, statistics, and
LLM design), assigned an owner per content type, and rewrote conventions to own only what
nothing else owns (API error contract, code organization, process) with section-precise
pointers to PLAN.md. Defended keeping `CLAUDE.md`'s hard-rule redundancy as a deliberate
guardrail layer (one-line imperatives; rationale lives elsewhere).

**Outcome:** **accepted**, including the argued exception. Second clear human catch of the
session.

## E11 — This log

**Me [translated, condensed]:** "We can now tackle the AI log — all these documents should be
part of the development process." Followed later by a revision request: everything in
English, and make the entries demonstrate the direction techniques rather than just narrate.

**Agent:** drafted `ai-log/README.md` and this file from the session transcript. On the
revision it pushed back on one point — it would translate and annotate techniques, but not
rewrite prompts into polished versions that were never sent, citing the brief's warning that
a sanitized log is a serious negative signal. I accepted that line: translations are marked,
techniques are annotated, prompts are otherwise as sent.

## E12 — Agent policy as enforcement, not prose

**Me [translated, condensed]:** "Establish the Claude policy for this project — be quite
restrictive. Use this settings template I have from another repo, but create it here taking
into account the technologies we're going to use."

**Technique:** turning declared rules into *enforced* rules. CLAUDE.md's hard rules are
prose an agent could ignore; `.claude/settings.json` is policy the harness executes. I
provided a known-good template as the baseline and had the agent adapt it to this project's
frozen stack rather than invent policy from scratch.

**Agent:** read the template and produced `.claude/settings.json` with the project's rules
made mechanical: **deny** `npm`/`npx`/`yarn`/`pnpm dlx` (pnpm-only becomes unviolable;
`npx`/`dlx` are arbitrary-remote-code supply-chain vectors — the template's own
`npx markdownlint` allow falls under this), deny `Edit/Write(./seed/**)` (the
never-touch-the-dataset rule, enforced), deny volume-destroying docker commands, keep the
template's destructive-git/secrets denies. **Ask** for everything touching dependencies or
supply-chain config (`pnpm add/remove/update`, `package.json`, `pnpm-lock.yaml`, `.npmrc`,
`approve-builds`), plus `git commit` and docker state changes. **Allow** only read-only or
already-human-approved surface (`git` queries, `pnpm run *`, `pnpm install --frozen-lockfile`
— the safe install variant is free while plain `pnpm install` prompts, so friction pushes
toward the correct one). One template deviation it flagged: narrowed `Read(./.env.*)` to
`.env`/`.env.local` because the broad pattern would also block `.env.example`, which is
documentation the agent must maintain (deny outranks allow, so no exception was possible).

**Outcome:** **accepted.** The settings file is itself a committable agent-context artifact —
versioned agent policy is precisely the "reusable agent instructions" the brief rewards.

---

**State at session end:** PLAN.md (frozen), CLAUDE.md, resources/ (2 files), ai-log/ (2
files), `.claude/settings.json` (restrictive agent policy). Zero code, zero scaffold — next
session starts implementation: repo, docker, migrations, seed verification.
