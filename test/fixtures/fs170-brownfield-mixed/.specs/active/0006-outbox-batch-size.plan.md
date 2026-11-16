# Plan — Make the outbox batch size configurable

**Spec:** [0006-outbox-batch-size.md](0006-outbox-batch-size.md)
**Status:** Done
**Last updated:** 2026-09-19
**Current step:** — all four steps ticked and verified

**Working mode for this run (user-granted one-off exception, 2026-09-19):** the user confirmed
the test expectations in advance, so the TDD confirmation gate in T-002 is waived — implementation
follows the tests without stopping, unless an expectation would deviate from the spec, which stops
the run. The red-first discipline itself is unchanged: every test step still records its failing
run. One commit per completed step is pre-approved.

## Approach

`src/main.ts` reads `OUTBOX_BATCH_SIZE` and `OUTBOX_INTERVAL_MS` once at startup and passes both
raw values into a third `OutboxDispatcher` constructor argument; the dispatcher parses them,
validates them, and owns the defaults 50 and 2000 — default and fallback therefore live in one
place, and the whole behaviour is reachable from a unit test through the constructor. The
alternative, a parser in a new `src/shared/env.ts`, was rejected: it adds a shared module and a
snapshot sync for no gain.

Steps are ordered so the untested code is pinned before it moves: T-001 characterizes today's
dispatch loop (AC-002) while it is still unchanged, T-002 goes red on the new behaviour, T-003 is
the only step touching production code, T-004 is the gate. No new dependency, no new file under
`src/`, so the `architecture:` snapshot stays true and `/sdd-architecture-update` is not
triggered. Memory Bank files touched by the implementation: `.memory-bank/activeContext.md`, and
`.memory-bank/techContext.md` → *Configuration* (its env-var table gains two rows in T-003).

**Quality gates:** `npm test`

## Research

No web lookups — the user ruled them out, and no fact in this plan needs one: `process.env`,
`node:test` and the test glob are all verified from the repository. Survey of 2026-09-19:

- **Sole construction site:** `new OutboxDispatcher(outboxRepository, broker)` at `src/main.ts:11`.
  Repo-wide grep finds no other constructor call, so a third parameter breaks no caller.
- **The constants:** `BATCH_SIZE` (`src/infrastructure/outbox/OutboxDispatcher.ts:5`) is read once
  at `:26` (`takePending`), `INTERVAL_MS` (`:6`) once at `:17` (`setInterval`). No other readers.
- **Env precedent:** `main.ts` already reads `BROKER_URL` (`:9`) and `PORT` (`:23`) inline with
  `??`. No config module exists (`techContext.md` → *Configuration*); the new reads follow suit.
- **Test glob:** `node --test "tests/**/*.test.ts"` (`package.json:8`) — a new `tests/outbox.test.ts`
  is picked up with no script change.
- **Fakes are required.** `db.query` returns `[]` unconditionally and `BrokerClient.publish` issues
  a real `fetch`. Both constructor parameters are concrete classes with public methods, so subclass
  fakes (`class FakeOutboxRepository extends OutboxRepository { … }`) work without casts and
  without changing any production type.
- **Trap — never import `main.ts` from a test.** It calls `outboxDispatcher.start()` at import time
  (`:22`) and nothing ever calls `stop()`; the 2 s timer would keep `node --test` alive. This is why
  no testable logic may be placed in `main.ts`.
- **Trap — the logger writes straight to stdout.** `src/shared/logger.ts:4` calls
  `process.stdout.write`; there is no injectable sink, so the AC-003 test stubs
  `process.stdout.write` and restores it in a `finally`.
- **Nothing protects 50 / 2000.** The outbox knowledge records `arch-outbox-004` and
  `arch-outbox-delivery-005` in `systemPatterns.md` are both `unknown` (deferred 2026-09-19) and
  concern the write path and the delivery guarantee, not these values. No recorded rationale exists
  for the two numbers, so no step may offer one.
- **No `done/` spec is invalidated.** `0001-baseline-orders.md` names the outbox row, never the
  drain cadence. No `Deprecated` candidates.

Assumptions recorded here, both confirmed with the user on 2026-09-19:

1. `main.ts` passes the raw `process.env` strings; the dispatcher parses. "Read once in the
   composition root" holds — the dispatcher never touches `process.env` itself.
2. "One warning log line" means one per invalid variable. Both invalid → two lines.

## Steps

### T-001 — Pin today's dispatch semantics with a characterization test

- [x] **Covers:** AC-002
- **Do:** Add `tests/outbox.test.ts` with subclass fakes for `OutboxRepository` and `BrokerClient`.
  Assert that `tick()` publishes the records `takePending` returned, in that order, and calls
  `markDispatched` once per record. Negative control: a record whose `publish` rejects is **not**
  marked dispatched and reaches `recordFailure` with `attempts + 1`. Name AC-002 in the test names.
- **Verify:** `npm test` — the new tests pass on unchanged code (AC-002 preserves existing
  behaviour, so red-first does not apply; the negative control is what makes green meaningful).
- **Verified:** 2026-09-19 · `npm test` · **8 tests, 8 pass, 0 fail, ~287 ms** — the 4 new AC-002
  tests plus the 4 pre-existing ones. First run was blocked (see *Blocker*, resolved); the four
  tests were unchanged by the fix.
- **Notes:** Green on unchanged dispatcher code, as predicted — the negative control is what makes
  that meaningful. Two incidental findings: the test's own fakes had to avoid TypeScript parameter
  properties for the same reason as the blocker, and the AC-002 failure case emits the
  dispatcher's real `logger.warn` line into the test output (harmless, and it confirms the stdout
  coupling recorded in *Research*). This step's change set also carries the blocker fix.

## Blocker — the repository's run command could not load its own source · RESOLVED 2026-09-19

Found while running T-001's `Verify` line, 2026-09-19. Node **v24.17.0** with
`--experimental-strip-types` (the flag in both `package.json` scripts) rejects TypeScript
**parameter properties**: `SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]: TypeScript parameter
property is not supported in strip-only mode`.

Six source files use them — `src/infrastructure/outbox/OutboxDispatcher.ts:12-13`,
`src/infrastructure/broker/BrokerClient.ts:2`, `src/modules/orders/OrderService.ts:9-10`,
`src/modules/billing/BillingService.ts:8-9`, `src/shared/cache/TtlCache.ts:13`,
`src/shared/validation.ts:4`. Consequences:

- **`npm start` is broken today**, not merely unverified as `techContext.md` records: `main.ts`
  imports `BrokerClient` at `:2`, which is enough to throw. This is pre-existing and independent
  of spec 0006.
- **`npm test` passes today only by accident** — the four existing tests import `OrderEvents.ts`,
  `Money.ts` and `PaymentRetryPolicy.ts`, the only subjects free of parameter properties. The
  moment any test loads the dispatcher, the suite fails.
- **No test of AC-001, AC-002 or AC-003 can run** until this is resolved; every one of them must
  load `OutboxDispatcher`. T-002 through T-004 are blocked behind it.

**Resolution — Option A, chosen by the user 2026-09-19** and applied in T-001's change set: both
`package.json` scripts now use `--experimental-transform-types`. No source file was touched. The
rejected Option B was to de-sugar the parameter properties in all six files, which would have
edited four production files this spec does not otherwise touch.

Two follow-ups this fix produced, both recorded in `techContext.md`:

- Node prints one `ExperimentalWarning: Transform Types` per test process. Left **visible** rather
  than muted with `--disable-warning=ExperimentalWarning`, which would also hide future
  experimental warnings; the "zero warnings" gate now means zero *other* warnings.
- `npm start` clears the type barrier but still fails — `ERR_MODULE_NOT_FOUND: Cannot find package
  'zod'`, because `node_modules/` is absent. Independent of this spec, needs an Ask-first
  `npm install`, and no step here depends on it.

### T-002 — Add failing tests for the configurable values and the fallback

- [x] **Covers:** AC-001, AC-003
- **Do:** Extend `tests/outbox.test.ts`: with no options the dispatcher requests a batch of 50 and
  arms a 2000 ms interval; with `'10'` / `'500'` it uses 10 and 500; with `'0'`, `'-1'` and
  `'abc'` it uses the defaults and writes one `warn` line per rejected variable, naming the
  variable and the value. Read the batch size through the fake's `takePending` argument and the
  interval via a stubbed `setInterval`; capture the warning through a stubbed
  `process.stdout.write`, restored in `finally`. Name AC-001 / AC-003 in the test names.
  ~~Then stop and confirm the expectations with the user before T-003~~ — waived for this run by
  the working-mode exception above; the user confirmed the expectations in advance.
- **Verify:** `npm test` — the new tests fail; the existing ones stay green.
- **Verified:** 2026-09-19 · `npm test` · **22 tests, 11 pass, 11 fail** — red as intended. What
  was red: failing assertions, not a missing module. The constructor ignores a third argument, so
  the explicit values never arrive (`10 !== 50`, `500 !== 2000`) and no warning is ever emitted
  (`0 !== 1`, `0 !== 2`). All four AC-002 tests stayed green.
- **Notes:** Four of the new tests pass already and are meant to: the two default cases (50 / 2000
  are today's constants) and the no-warning negative control. They are the guard that T-003 does
  not fix configurability by breaking the defaults. Invalid inputs are table-driven over
  `'0'`, `'-1'`, `'abc'`, `'1.5'`, `''`, `' '` — `'1.5'` pins "integer", the last two pin that an
  empty or blank value is rejected rather than silently treated as unset.

### T-003 — Read both variables in the composition root, resolve them in the dispatcher

- [x] **Covers:** AC-001, AC-003
- **Do:** In `src/infrastructure/outbox/OutboxDispatcher.ts`, replace the module constants with
  `DEFAULT_BATCH_SIZE = 50` / `DEFAULT_INTERVAL_MS = 2000` and a third constructor parameter
  `options: { batchSize?: string; intervalMs?: string } = {}`. Resolve each once in the
  constructor into a private readonly field: `undefined` → default silently; a value that is not a
  positive integer → default plus one `logger.warn` naming the variable and the rejected value.
  Use the fields at `:17` and `:26`. In `src/main.ts:11`, pass
  `{ batchSize: process.env.OUTBOX_BATCH_SIZE, intervalMs: process.env.OUTBOX_INTERVAL_MS }`.
  Add both variables to the `techContext.md` → *Configuration* table in the same change set.
- **Verify:** `npm test` — all tests pass, including T-002's.
- **Verified:** 2026-09-19 · `npm test` · **22 tests, 22 pass, 0 fail, ~330 ms** — all 11 red
  tests from T-002 green, the 4 default guards still green, AC-002 untouched.
- **Notes:** Implemented as planned; the resolver is a module-level `resolvePositiveInteger`
  rather than inline constructor code, so both variables share one rule. Kept the existing
  parameter properties for `repository` and `broker` — the transform-types flag from T-001 makes
  them legal, and rewriting them would have been unrelated churn. Two docs synced in this same
  change set because the code falsified them: `.architecture/event-transport.md`'s playbook said
  "compiled constants, not configuration", and `techContext.md`'s *Configuration* table listed
  only two variables (its `PORT` line number also shifted, 23 → 26). **Not** touched: the
  `architecture:` snapshot in `AGENTS.md`, which still calls the outbox "drained by a 2 s poll" —
  that artifact is gated behind `/sdd-architecture-update`, proposed in the hand-off.

### T-004 — Run the full quality gate

- [x] **Covers:** AC-001, AC-002, AC-003
- **Do:** Run the Definition-of-Green sequence from `techContext.md` → *Quality gates* on the
  finished change set and fix until zero warnings and zero errors. Reconcile this plan, the spec's
  traceability and `activeContext.md` with the code before reporting anything as done.
- **Verify:** `npm test`
- **Verified:** 2026-09-19 · `npm test` · **22 tests, 22 pass, 0 fail, ~388 ms**. Output scanned
  for warnings: only the accepted `ExperimentalWarning: Transform Types` (once per test process)
  and the deliberate `outbox dispatch failed` line the AC-002 negative control provokes. Zero
  other warnings, zero errors.
- **Notes:** This step is the recorded proof of the last clean run; `npm test` is the only gate
  that exists today (no linter, and the TypeScript compiler is not installed — so nothing
  type-checks this code, including the new `OutboxDispatcherOptions` interface).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002, T-003, T-004 | `src/infrastructure/outbox/OutboxDispatcher.ts:resolvePositiveInteger`, `OutboxDispatcher.ts:5-6,27-39`, `src/main.ts:11-14` | `tests/outbox.test.ts` — the six `AC-001:` tests | verified |
| AC-002 | T-001, T-004 | `src/infrastructure/outbox/OutboxDispatcher.ts:tick` (unchanged) | `tests/outbox.test.ts` — the four `AC-002:` tests | verified |
| AC-003 | T-002, T-003, T-004 | `src/infrastructure/outbox/OutboxDispatcher.ts:resolvePositiveInteger` | `tests/outbox.test.ts` — the eight `AC-003:` tests | verified |

## Session handoff

- **Done so far:** Spec revised on 2026-09-19 (AC-001 tightened to "positive integer", AC-003
  added for the invalid-value fallback); plan written and approved; pair moved to `.specs/active/`
  with the spec at `In Progress`. Blocker resolved via Option A. **T-001 done** — AC-002 pinned by
  four tests, `npm test` 8/8. **T-002 done** — AC-001 and AC-003 are red on 11 tests. No
  **T-003 done** — both variables configurable. **T-004 done** — closing gate `npm test` 22/22,
  no unexpected warnings. All four steps ticked with recorded runs; every criterion `verified`.
- **Next action:** `/sdd-compile`, then `/sdd-lifecycle` active → done. One loose end first:
  `/sdd-architecture-update`, because the `architecture:` snapshot in `AGENTS.md` still describes
  the outbox as "drained by a 2 s poll" — true only as a default now. That artifact is gated, so
  this run left it alone.
- **Open decisions:** none.
- **Baseline:** `06f2d47` — the plan commit, immediately before the first step commit.
- **Environment:** none — standard commands live in `techContext.md`. Note that `npm start` is
  still unverified in this repository; no step here needs it.
