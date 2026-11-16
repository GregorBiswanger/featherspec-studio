# Plan — Split a bill with tip evenly across a group

**Spec:** [0001-split-bill-with-tip.md](../done/0001-split-bill-with-tip.md)
**Status:** Done
**Last updated:** 2026-09-19
**Current step:** none — all nine steps are ticked and verified

## Approach

A minimal `node:http` service in two layers, exactly as the `architecture:` snapshot in
`AGENTS.md` draws it: `src/split.js` is the pure core and computes in **integer cents** only —
binary floating point cannot satisfy BR-07 and BR-11 — while `src/server.js` parses, validates,
formats, and holds no arithmetic. The core is built first because every fairness criterion
(AC-001 … AC-007, AC-016) is decided there without HTTP; validation follows per input, and the
problem-response contract last, because it depends on all three validators existing. No runtime
dependencies, no build step, ESLint as the only dev dependency (decisions dated in
`.memory-bank/systemPatterns.md`).

`src/server.js` exports the `node:http` request listener **and** a pure
`handleSplit(rawBody) → {status, body}` that it delegates to, so validation tests need neither a
port nor mocks, and one routing test drives the listener with in-memory `req`/`res` stand-ins.
Implementation touches `.memory-bank/activeContext.md` throughout and, in T-009,
`techContext.md`, `systemPatterns.md` and the `architecture:` snapshot.

**Quality gates:** `npx eslint .` → `node --test` (from `.memory-bank/techContext.md`), in that
order after every implementation step; T-009 is the recorded proof of the last clean run.

**Working-mode exception for this run (2026-09-19, user-requested, one-off):** the TDD agreement
in `AGENTS.md` normally stops after a test is written to have the user confirm it. For this run
the user confirmed the tests in advance, so implementation continues without that stop — with one
standing exception: if a test expectation would deviate from the spec, stop and report. Red-first
still binds: every test-adding step records its failing run in `Verified:` before the
implementation lands. One commit per completed step and the ESLint install are pre-approved.

## Research

No web lookups were performed — the user ruled them out for this plan, so the tool facts below
are **assumptions**, each settled by the first step that runs the command. Nothing here rests on
a guess presented as fact.

- Survey (2026-09-19): the repository contains no source at all — no `package.json`, no `src/`,
  no `test/`, no `eslint.config.js`. No callers, no existing tests, no `done/` spec whose
  behaviour this change invalidates. The spec's *Technical notes* (section 11) match reality.
- Toolchain, verified locally (not a lookup): Node `v24.17.0`, npm `11.17.0`.
- **A-T1** — `node --test` discovers `test/**/*.test.js` with no extra configuration on this
  Node version. Settled by T-002's first run; if wrong, the `test` script names the pattern.
- **A-T2** — ESLint 9+ flat config: a plain array exported from `eslint.config.js` suffices and
  `npx eslint .` needs no `--config`. Settled by T-001's gate run.
- **A-T3** — `npx eslint .` requires an `npm install` first, which reaches the network. ESLint
  as the sole dev dependency was approved during `/sdd-setup`, but the network call itself sits
  behind the Ask-first gate in `AGENTS.md` and needs a yes when T-001 is executed.
- Raising this plan's quality without me guessing: `node --test default test file discovery
  pattern Node 24` · `eslint 9 flat config eslint.config.js minimal example` · `node:http
  requestListener testing without listen node:test`.

### Decisions this plan makes (spec A-003, O-001, O-002)

- **D-1 (spec R-007)** — values beyond exact cent arithmetic are **rejected** with a problem
  naming the input (E-16), not carried in a wider numeric type.
- **D-2 (spec R-008)** — fixed English problem messages, field name as sent:

  | Catalogue | Message |
  | --- | --- |
  | E-01 / E-06 / E-10 | `<field>: is required` |
  | E-02 / E-07 / E-11 | `<field>: must not be empty` |
  | E-03 / E-08 / E-12 | `<field>: must be a number` |
  | E-04 | `amount: must not be negative` |
  | E-05 | `amount: must be exact to the cent` |
  | E-09 | `tipPercent: must not be negative` |
  | E-13 | `people: must be a whole number` |
  | E-14 | `people: must be at least 1` |
  | E-15 | `request: could not be read` |
  | E-16 | `<field>: is outside the range that can be calculated exactly` (revised in T-008 — the draft read "is too large to calculate exactly", which misdescribes a percentage like `1e-20` that is too *fine*, not too large; spec R-008 fixes no text for this row) |

- **D-3** — request `POST /split` with JSON `{amount, tipPercent, people}`; response
  `{perPerson: [...], totalTip}`. `perPerson` and `totalTip` are **JSON numbers**, cent-exact —
  never strings. The spec judges every rule on the numeric value and calls written form a
  non-rule (BR-02, AC-019), so the answer does the same; internals stay integer cents.
- **D-4** — the `request` problem (BR-16, AC-018) fires only when the body is unparseable JSON
  or is not a JSON object. A valid object missing all three fields yields **three** "is
  required" problems, because each input is nameable (AC-012, AC-013).
- **D-5** — `200` on success, `400` with `{problems: [{field, message}]}` on rejection, ordered
  `amount` → `tipPercent` → `people` (spec A-005). Plumbing outside the spec's criteria:
  unknown path `404`, wrong method on `/split` `405`.

## Steps

### T-001 — Scaffold the project

- [x] **Covers:** scaffolding only — no acceptance criterion
- **Do:** `package.json` (`name: tip-splitter`, `version: 0.1.0`, `"type": "module"`, `private`,
  scripts `test` → `node --test` and `lint` → `eslint .`), a minimal flat `eslint.config.js`
  (ESM, latest ecmaVersion, Node globals), `node_modules/` in `.gitignore`, ESLint installed as
  the only dev dependency.
- **Verify:** `npm install` then `npx eslint .` → exit 0, zero errors and zero warnings
- **Verified:** 2026-09-19 · `npm install` → 86 packages added, 0 vulnerabilities · `npx eslint .`
  → exit 0, no output (zero errors, zero warnings)
- **Notes:** install was pre-approved by the user for this run (A-T3 settled). A-T2 settled: a
  plain array exported from `eslint.config.js` is enough and `npx eslint .` needs no `--config`;
  `@eslint/js` was deliberately not imported, so ESLint stays the only declared dev dependency,
  at the price of hand-listing the few rules instead of `js.configs.recommended`. npm warns
  `eslint@9.39.5` is past its support window — noted, not acted on (a version bump is an
  Ask-first dependency change and buys nothing this slice needs).

### T-002 — Core: total tip, rounded half up, in integer cents

- [x] **Covers:** AC-003, AC-015
- **Do:** `test/split.test.js` first — AC-003's two examples (`10.05` at `5 %` → `50` cents;
  `10.10` at `5 %` → `51` cents) and AC-015 (`7.125 %` accepted, only the result rounded) —
  against a `src/split.js` export `totalTipCents(amountCents, tipPercent)` that throws
  `Not implemented`. Then implement BR-07: scale `tipPercent` by its own decimal places so the
  half-up boundary is decided on integers, never on a possibly inexact float product.
- **Verify:** `node --test` → both cases pass; then `npx eslint .`
- **Verified:** 2026-09-19 · red: `node --test` → 4 tests failing with
  `Error: Not implemented: totalTipCents(...)` (the stub, not a missing module) · green:
  `npx eslint .` clean, `node --test` → 4 pass / 0 fail
- **Notes:** A-T1 settled — `node --test` discovers `test/**/*.test.js` with no configuration.
  The half-up boundary is decided on integers: `decimalToFraction` reads the number's shortest
  decimal form into `numerator/denominator`, then `divideRoundHalfUp` compares `2·remainder`
  against the denominator. `10.07` at `100 %` is in the tests precisely because
  `10.07 * 100 === 1006.9999999999999`. `decimalToFraction` and `divideRoundHalfUp` are exported
  because T-006 and T-008 reuse them for BR-02 and the E-16 range check.

### T-003 — Core: even split with leftover cents

- [x] **Covers:** AC-001, AC-002, AC-004, AC-005
- **Do:** test first for `splitEvenly(totalCents, people)` in `src/split.js` — AC-004's example
  (`1100 / 3` → `367, 367, 366`), AC-001's (`6600 / 4` → four × `1650`), plus the two invariants
  over a small case table: sum equals `totalCents` exactly (AC-002) and amounts are
  non-increasing with a spread of at most one cent (AC-005). Then implement BR-09 … BR-12:
  floor division plus one cent to each of the first *k* people.
- **Verify:** `node --test` → all cases pass; then `npx eslint .`
- **Verified:** 2026-09-19 · red: `node --test` → 6 new tests failing with
  `Error: Not implemented: splitEvenly(...)` / `splitBill(...)` (stubs, not missing exports),
  4 pre-existing green · green: `npx eslint .` clean, `node --test` → 10 pass / 0 fail
- **Notes:** four criteria deliberately — they are the single contract of one function, since
  exact sum and ordering are invariants of the same distribution, not separable behaviours.
  Addition beyond the planned `splitEvenly`: `splitBill(amountCents, tipPercent, people)`
  composes tip and split, so AC-002 is proven where the spec states it — against the **returned**
  total tip — instead of only against a total the test computes itself. It also keeps
  `src/server.js` free of arithmetic. Both invariant tests run over an eight-case table;
  the AC-004 negative control asserts that plain flooring (`366, 366, 366`) is *not* the result.

### T-004 — Core: zero and scale edges

- [x] **Covers:** AC-006, AC-007, AC-016
- **Do:** tests for bill `0` (tip `0.00`, every person `0.00`), `tipPercent 0` (bill alone
  split), one person (receives everything), and `10.00` at `0 %` across `1000` people summing to
  `10.00`. Implement only if something fails.
- **Verify:** `node --test` → all cases pass
- **Verified:** 2026-09-19 · `node --test` → 15 pass / 0 fail; `npx eslint .` clean. The five new
  tests were **green on arrival** — no red run, because T-002/T-003 already covered the
  behaviour; no production code changed in this step.
- **Notes:** green-immediately is sanctioned by `AGENTS.md`, so two negative controls carry the
  weight instead: a zero bill must still yield one share *per person* (not an empty list), and the
  AC-004 control from T-003 already rules out plain flooring. AC-016 is proven at realistic
  magnitude per spec R-007 — 1000 people, and a bill of 1 000 000 000.00 at 15 % that still sums
  back exactly.

### T-005 — HTTP layer: handler, routing, happy path

- [x] **Covers:** AC-001 (end to end)
- **Do:** test first, then `src/server.js`: export `handleSplit(rawBody) → {status, body}` and
  the `node:http` request listener delegating to it; `POST /split` → `200` with
  `{perPerson, totalTip}` as JSON numbers (D-3); `listen` only when the file is run directly.
  Tests call `handleSplit` with AC-001's body and drive the listener once with in-memory
  `req`/`res` stand-ins — no port is bound.
- **Verify:** `node --test` → AC-001 passes through both entry paths; then `npx eslint .`
- **Verified:** 2026-09-19 · red: `node --test` → 4 failing with
  `Error: Not implemented: handleSplit(...)` / `requestListener(...)` · green: `npx eslint .`
  clean, `node --test` → 19 pass / 0 fail
- **Notes:** the core stays free of HTTP; no validation yet — invalid input is T-006 onwards.
  Deviation from the plan: the `404` / `405` plumbing was pulled forward from T-008 into this
  step, with its own two tests, so no untested branch lands. T-008's `Do` keeps the item struck.
  `src/split.js` gained the pure numeric conversions `toCents` / `fromCents` — arithmetic belongs
  in the core, so the server only maps field names and status codes. The response carries plain
  JSON numbers (D-3): `16.5`, not `"16.50"`. `test/server.test.js` holds a local `fakeResponse` +
  `callListener` helper; every server test lives in this one file on purpose, because
  `node --test` treats *every* file under `test/` as a test file, so a shared helper module there
  would be collected as one.

### T-006 — Validation: bill amount

- [x] **Covers:** AC-008, AC-009, AC-019, AC-012 (the `amount` share of it)
- **Do:** test first, then implement the BR-14 check order for `amount` in `src/server.js`:
  readable as a number (BR-06) → not negative (BR-01) → exact to the cent (BR-02), judged on the
  **value** via a tolerant comparison against the nearest integer of `value × 100`. Must accept
  `10.1`, `10.100` and `10.07`; must reject `10.005` without rounding it. Messages per D-2.
- **Verify:** `node --test` → accepted and rejected cases both hold
- **Verified:** 2026-09-19 · red: `node --test` → 3 failing with `AssertionError` (200 with
  amounts where a 400 with problems was expected — not a missing module) · green: `npx eslint .`
  clean, `node --test` → 23 pass / 0 fail
- **Notes:** `10.07 * 100` is `1006.9999999999999` — a naive integer test fails this step; the
  check runs on `toCents`, which divides the exact fraction, so `10.1`, `10.100`, `10.07` and
  `1e2` pass while `10.005` is rejected. AC-019 was **green on arrival**: the core already
  judged the value, so that test documents rather than drives. The three `amount` presence cases
  of AC-012 were pulled into this step, because they are the same `checkReadable` gate on the
  same field; T-008 completes AC-012 for `tipPercent` and `people`. The validator is a
  `CHECKS` table that T-007 extends with one row per input.

### T-007 — Validation: tip percentage and number of people

- [x] **Covers:** AC-010, AC-011, AC-017
- **Do:** test first, then the check orders: `tipPercent` — number (BR-06) → not negative
  (BR-03); `people` — number (BR-06) → whole number (BR-04) → at least `1` (BR-04). `3.0` is the
  whole number `3` and is accepted (AC-017); `2.5` and `0` are rejected. Messages per D-2.
- **Verify:** `node --test` → each rejection names the right field with one message
- **Verified:** 2026-09-19 · red: `node --test` → 3 failing with `AssertionError` (the invalid
  values were still calculated) · green: `npx eslint .` clean, `node --test` → 28 pass / 0 fail
- **Notes:** AC-017 was green on arrival — JSON parses `3.0` to `3`, which `Number.isInteger`
  accepts; the test documents the rule. `people: -3` is deliberately in the tests: a negative
  whole number passes the whole-number check and must fail on "at least 1", which is what pins
  the BR-14 order rather than the outcome alone. One extra end-to-end case for AC-015 through the
  service (`7.125 %` → `7.13`), since T-002 proved it only in the core.

### T-008 — Problem-response contract

- [x] **Covers:** AC-012, AC-013, AC-014, AC-018, AC-020
- **Do:** test first, then assemble the rejection in `src/server.js`: `400` with one problem per
  faulty input, every faulty input present, fixed order `amount` → `tipPercent` → `people`
  (A-005), and never amounts beside problems (BR-13, AC-014). Cases: missing / empty / not a
  number per input (AC-012), AC-013's three-problem example, AC-020's one-problem-per-input
  rule, the single `request` problem for an unparseable or non-object body (AC-018, D-4), the
  D-1 safe-range check appended last in each input's order (E-16). ~~The `404` / `405` plumbing
  from D-5~~ — landed in T-005 with its own tests.
- **Verify:** `node --test` → every case above passes; then `npx eslint .`
- **Verified:** 2026-09-19 · red: `node --test` → 3 failing — AC-018 twice with `SyntaxError`
  from `JSON.parse` escaping as a crash instead of a problem, and the E-16 test with an
  `AssertionError` (unsafe values were still calculated) · green: `npx eslint .` clean,
  `node --test` → 37 pass / 0 fail
- **Notes:** the riskiest step — five criteria, because they are one response contract. It did
  not grow: AC-012, AC-013, AC-014 and AC-020 were **green on arrival**, because the `CHECKS`
  table from T-006/T-007 already yields one problem per input, in input order, for every faulty
  input, with no amounts beside them. Only two pieces were missing: `readPayload` (unparseable
  JSON, or JSON that is not a plain object — `null` and arrays included — become the single
  `request` problem, D-4) and the E-16 range checks. The E-16 message was revised, see D-2.
  The range check is split: each input's own safe-range check sits last in its BR-14 order, so
  completeness across inputs still holds; the combined case — every input fine alone, yet
  `amountCents × tipPercent` or the sum leaving the safe range — is one problem naming `amount`,
  from the core predicate `canCalculateExactly`. A counter-test pins that no ceiling was invented:
  one billion at 15 % across 3 people still answers `200`.

### T-009 — Full quality gate and doc sync

- [x] **Covers:** re-proves AC-001 … AC-020
- **Do:** run both gates clean; run `/sdd-architecture-update` (the snapshot still reads "no
  source files exist yet", and `src/` plus a new top-level `test/` now exist); refresh
  `techContext.md` (real commands), `systemPatterns.md` (integer-cent arithmetic, the
  pure-handler/listener split) and `activeContext.md`; complete the traceability table below to
  `verified`.
- **Verify:** `npx eslint .` → `node --test`, both zero errors and zero warnings
- **Verified:** 2026-09-19 · `npx eslint .` → exit 0, no output · `node --test` → 37 pass /
  0 fail / 0 skipped / 0 todo, `duration_ms 209.9`
- **Notes:** `/sdd-architecture-update` ran with its confirmation gate; the user confirmed the
  delta report on 2026-09-19 and added nothing. Written in this step: the `architecture:` snapshot
  (`last reconciled` date, the two sharpened module lines, new boundaries for the exported handler,
  `test/` and the root config files), `systemPatterns.md` (new `## Knowledge records` section with
  `arch-cents-001` and `arch-json-numbers-001`; the "Money rounding" pattern bullet now points at
  the record instead of holding the *why*), `techContext.md` (real commands, ESLint 9 flat config
  without `@eslint/js`, observed Node version, and the `node --test` collection trap) and
  `activeContext.md`. Deliberately **not** a knowledge record: the E-16 safe-range rejection —
  it is validation, which `.claude/rules/knowledge-records.md` excludes; it stays in spec R-007
  and plan D-1.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-003, T-005 | `src/split.js:splitEvenly`, `src/server.js:handleSplit`, `src/server.js:requestListener` | `test/server.test.js` — "AC-001: the same answer comes back through POST /split…" | verified |
| AC-002 | T-003 | `src/split.js:splitEvenly`, `src/split.js:splitBill` | `test/split.test.js` — "AC-002: bill plus returned total tip equals…" | verified |
| AC-003 | T-002 | `src/split.js:totalTipCents`, `src/split.js:divideRoundHalfUp` | `test/split.test.js` — "AC-003: an exact half rounds up" | verified |
| AC-004 | T-003 | `src/split.js:splitEvenly` | `test/split.test.js` — "AC-004: leftover cents raise the first people…" | verified |
| AC-005 | T-003 | `src/split.js:splitEvenly` | `test/split.test.js` — "AC-005: shares differ by at most one cent…" | verified |
| AC-006 | T-004 | `src/split.js:splitBill` | `test/split.test.js` — "AC-006: a bill of zero gives every person zero…" | verified |
| AC-007 | T-004 | `src/split.js:splitBill` | `test/split.test.js` — "AC-007: a tip of zero percent splits the bill alone" | verified |
| AC-008 | T-006 | `src/server.js:checkAmount` | `test/server.test.js` — "AC-008: a negative bill amount is rejected…" | verified |
| AC-009 | T-006 | `src/server.js:checkAmount`, `src/split.js:toCents` | `test/server.test.js` — "AC-009: a bill amount that is not exact to the cent…" | verified |
| AC-010 | T-007 | `src/server.js:checkTipPercent` | `test/server.test.js` — "AC-010: a negative tip percentage is rejected…" | verified |
| AC-011 | T-007 | `src/server.js:checkPeople` | `test/server.test.js` — "AC-011: a fractional number of people…" and "AC-011: fewer than one person…" | verified |
| AC-012 | T-006, T-008 | `src/server.js:checkReadable` | `test/server.test.js` — "AC-012 (amount): …" and "AC-012: a missing, empty or non-numeric tip percentage or people count…" | verified |
| AC-013 | T-008 | `src/server.js:collectProblems`, `src/server.js:CHECKS` | `test/server.test.js` — "AC-013: every invalid input is named in a single answer…" | verified |
| AC-014 | T-008 | `src/server.js:rejection` | `test/server.test.js` — "AC-014: a rejection carries no per-person amount…" | verified |
| AC-015 | T-002, T-007 | `src/split.js:totalTipCents`, `src/split.js:decimalToFraction` | `test/split.test.js` — "AC-015: a tip percentage with more than two decimals…"; `test/server.test.js` — "AC-015 (service): …" | verified |
| AC-016 | T-004, T-008 | `src/split.js:splitBill`, `src/split.js:canCalculateExactly` | `test/split.test.js` — "AC-016: no upper limit — 1000 people…"; `test/server.test.js` — "E-16: a large but exactly calculable request is still accepted" | verified |
| AC-017 | T-007 | `src/server.js:checkPeople` | `test/server.test.js` — "AC-017: a number of people with a zero fractional part…" | verified |
| AC-018 | T-008 | `src/server.js:readPayload` | `test/server.test.js` — "AC-018: a request nothing can be read from…" | verified |
| AC-019 | T-006 | `src/split.js:decimalToFraction`, `src/split.js:toCents` | `test/server.test.js` — "AC-019: cent-exactness is judged on the value received…" | verified |
| AC-020 | T-008 | `src/server.js:checkAmount` (the ordered checks) | `test/server.test.js` — "AC-020: an input breaking several rules…" | verified |

## Session handoff

- **Done so far:** T-001 scaffold · T-002 `totalTipCents` (AC-003, AC-015) · T-003 `splitEvenly`
  and `splitBill` (AC-002, AC-004, AC-005 verified; AC-001 built, end-to-end half in T-005) ·
  T-004 zero and scale edges (AC-006, AC-007, AC-016 verified). The core is complete ·
  T-005 `src/server.js` with `handleSplit` + `requestListener`, happy path and routing
  (AC-001 verified) · T-006 `amount` validation via a `CHECKS` table (AC-008, AC-009, AC-019
  verified; AC-012 built for `amount`) · T-007 `tipPercent` and `people` validation (AC-010,
  AC-011, AC-017 verified) · T-008 problem-response contract, `request` case and the E-16 range
  checks (AC-012 … AC-014, AC-018, AC-020 verified) · T-009 final gate and doc sync. All nine
  steps are done; all 20 criteria are `verified` in the table above.
- **Next action:** none — the iteration is closed. The spec moved to `../done/` on 2026-09-19
  and this plan was archived and frozen in the same change set.
- **Open decisions:** none. D-1 … D-5 are settled; D-1/D-2 are recorded in the spec as R-007/R-008,
  and the D-2 wording for E-16 was revised in T-008.
- **Baseline:** `f325adb` (the `backlog → active` move; the last commit before T-001)
- **Environment:** Node `v24.17.0`, npm `11.17.0`; standard commands live in
  `.memory-bank/techContext.md`.
