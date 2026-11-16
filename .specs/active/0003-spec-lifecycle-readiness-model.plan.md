# Plan — Spec Lifecycle & Readiness Model

**Spec:** [0003-spec-lifecycle-readiness-model.md](0003-spec-lifecycle-readiness-model.md)
**Status:** Done
**Last updated:** 2026-11-16
**Current step:** — (all steps ticked)

## Approach

A new framework-free module `src/core/lifecycle`. Its centre is one pure function,
`deriveLifecycle(project: ProjectRead) → LifecycleModel`, over 0002's model. It returns, per spec
entry: state, rule ID, persisted/derived, readiness R-1…R-7, diagnostics (0002's for the entry's
files plus its own `lifecycle-contradiction` kind, because 0002's `DiagnosticKind` stays
untouched), verification status, and a Deprecated marker. Because it is pure, AC-010 is a direct
test and the model has no run input at all (AC-006). Two more pieces sit on top of it:
`judgeTransition(model, key, target)`, which is pure, and a status-history recorder. The recorder
is an application service behind a small port cut from 0004's `RuntimeStore`
(`state`, `appendSpecStatusEntry`, `readSpecStatusHistory`), with time from 0001's `ClockPort`.
The order is: derivation and readiness first, since every later step reads them; then
verification and transitions (independent of each other); then the history; then the wiring.
Memory Bank files touched at the end: `activeContext.md`, `systemPatterns.md`, `techContext.md`.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` ·
`npm run compile` (T-007, T-008). Pre-done gate on CI: `npm test` (host smoke).

## Research

- Survey (2026-11-16):
  - **Input.** `ProjectRead` (`src/core/specs/readProject.ts`) carries per `SpecEntry`:
    `reference` (= stem), `folder`, `readable`, `parsed` (`status`, `planClassification`
    `sibling | archive | placeholder | …`, `origin`, `clarified`, `criteria`,
    `unsupportedHeaderLines`, `sections`), `planKeys` and `returnNoteKeys`. `PlanEntry` has
    `variant: sibling | archived`, `folder`, `parsed.status` and `parsed.traceability[].state`.
    `ReturnNoteEntry` has `parsed.status`. Diagnostics come with `kind` and `scope.file`. A-005
    holds.
  - **Change notifications.** `SpecRepository.onDidChange` delivers `SpecChange { references,
    untied, cause }` with stems and no file paths. The changed paths that AC-014 needs come from
    comparing the previous and the current snapshot for each affected stem: the keys of the spec,
    its plans and its notes; presence, `modifiedMs`, `size`, `readable` and the parsed content.
    No change to 0002.
  - **History store.** 0004 has `RuntimeStore.appendSpecStatusEntry(stem, entry: JsonValue)` and
    `readSpecStatusHistory(stem?)` (`src/core/runtime/runtimeStore.ts`). It refuses writes in a
    read-only or unavailable state (`RuntimeRefusal`) and stamps its own `observedAt`. The 90-day
    cap and Clear also cover the history (spec 0004 BR-010). The current store comes from
    `RuntimeSession.current()` and `state()`, plus `onDidChangeState`. So A-009 holds, and the
    0004 part of OP-010 is resolved (recorded in the spec).
  - **Deprecated successor.** The fixture `fs110-ready-synthetic/.specs/done/0002-old-feature.md`
    has `**Successor:** [link]`, which 0002 puts into `unsupportedHeaderLines`. FeatherSpec only
    says the spec "links its successor (or `successor: none — behaviour removed`)"
    (`.claude/commands/sdd-lifecycle.md`, *Deprecated*). Reading rule decided here: the first
    `**Successor:**` header line, otherwise the first body line whose text starts with
    `successor:` (case-insensitive). A markdown link gives the successor link,
    `none — behaviour removed` gives "removed", and anything else, or no such line, gives
    *successor: not available*. UNVERIFIED (OP-002).
  - **Wiring.** `src/extension.ts` composes the discovery controller, the spec repository (fed by
    `connectActiveProject`) and the runtime session. The lifecycle service goes beside them,
    subscribed to `repository.onDidChange` and `session.onDidChangeState`. Fixture helpers:
    `fixturePath`, `createNodeSpecSource`, `createMemorySpecSource`, `snapshotTree`,
    `createFakeRuntimeClock`, and the in-memory runtime medium.
  - **Assumptions this plan rests on.** (a) "First derivation after activation" (§6.5) is the
    first derivation, per active project and opened store, for which the history can be read.
    Until then nothing is appended. A project switch starts a new first derivation. A later
    read-only → writable change only enables appending from then on; the gap is not recorded
    (PD-023). (b) A stored entry that is not this plan's shape is skipped when the last recorded
    state is computed.
  - **Spec revised before this plan** (Gregor, 2026-11-16): OP-005 is applied to AC-009, §6.4
    and §6.5; OP-006 to AC-025 and §6.3; OP-007 to §6.5 and the new AC-026. Refinement made here,
    because the plain chain rule would mark everything in flow via Blocked: a chain may not pass
    through Blocked as an intermediate state.
  - **Product decisions.** PD-043, PD-045 and PD-046 are newer and consistent with the spec. No
    revision is needed. 0007 §12 still cites A-001 (OP-010; the main session owns that).
- No web lookup: no new library, API, protocol or standard is involved. Every fact above is local
  to the repository and named by path. No new dependency.

## Texts (English, PD-016; written here per spec §6.4)

| ID | Where | Text |
| --- | --- | --- |
| X-1 | refusal *not observed* | `This spec is no longer in the project.` |
| X-2 | refusal *derived target* | `<State> is derived from the files (rule <rule ID>); it cannot be set on the board.` |
| X-3 | refusal *needs evidence* | `Done needs /sdd-compile evidence and the /sdd-lifecycle move; Studio does not move specs.` |
| X-4 | refusal *not ready* | `The spec is not Ready: <R-n> <readiness reason>; …` |
| X-5 | refusal *lifecycle move* | `Studio does not move specs; lifecycle moves belong to /sdd-lifecycle.` |
| X-6 | readiness reasons | R-1 `Not in backlog/ with status Draft.` · R-2 `No acceptance criterion (AC-NNN) found.` · R-3 `No sibling plan, or the Plan line does not link it.` · R-4 `The sibling plan is missing or not "Not started".` · R-5 `The spec is Blocked.` · R-6 `A lifecycle contradiction, unreadable file or duplicate is reported.` · R-7 `Inter-spec dependencies: not available — FeatherSpec has no dependency field.` |
| X-7 | contradictions | `Folder <folder>/ does not match status "<status>".` · `active/ spec without a sibling plan.` · `done/ Implemented spec without an archive link in its Plan line.` |
| X-8 | labels | derived: `Derived (rule <rule ID>)` · history: `Observed by Studio while it was running — not a reconstruction` · `Status history not available: <reason>` · `/sdd-compile verdict: not available — FeatherSpec does not persist it.` · `successor: not available` · `successor: none — behaviour removed` |

## Stages

1. T-001 → T-002 — the pure derivation: states, rules, readiness, contradictions, Blocked, duplicates, Deprecated
2. T-003 ‖ T-004 — independent: verification status vs. transition check and flow marker (separate files and tests)
3. T-005 → T-006 — the status history: live changes, then baseline, identity and store outage
4. T-007 → T-008 — service wiring with the no-write proof, then docs sync and final gates

Parallel: stage 2. T-003 extends `deriveLifecycle.ts`, while T-004 only reads the model type that
exists after T-002 and writes its own files.

## Steps

### T-001 — Readiness and the happy-path state derivation

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-021
- **Do:** `src/core/lifecycle/model.ts` (states, rule IDs, `LifecycleModel`, readiness result
  types). `readiness.ts` evaluates R-1…R-7 one by one, each with a reason (X-6).
  `deriveLifecycle.ts` holds the §6.1 table in its order, with persisted/derived markers.
  Baseline in `done/` → Done with no plan or `**Clarified:**` check. Tests in
  `deriveLifecycle.test.ts` and `readiness.test.ts`: fixtures `fs110-ready-synthetic`,
  `fs110-de-active-review`, `fs180-en-done-archived`, `fs180-de-baselines`, and memory-source
  cases (no sibling plan → R-3 and R-4 fail, plan unlinked, plan `In Progress`).
- **Verify:** `npm run test:unit -- src/core/lifecycle` plus the per-step gates
- [x] **Verified (T-001):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle` 17 of 17 failed with `Not implemented` (stub `deriveLifecycle`); green: 17 of 17 passed after the implementation; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 31 files, 533 tests passed.
- **Notes:** the shared test helpers are `src/core/lifecycle/testing/projects.ts` (memory and fixture readers, spec and plan text builders). `entryContext.ts` holds the per-entry facts; `blocked` and `contradictions` stay inert (`false`, empty) until T-002 fills them — `decide()` already carries their branches in the §6.1 order.

### T-002 — Contradictions, unreadable files, Blocked, duplicates, Deprecated

- **Covers:** AC-012, AC-013, AC-019, AC-020, AC-022, AC-025
- **Do:** in `deriveLifecycle.ts`: S-BLOCKED (sibling plan `Blocked`, or a linked note
  `BLOCKED`; never `activeContext.md` or `## Blocker`); the closed §6.3 list (X-7) including the
  archive-link and reactivated-Baseline exceptions; S-FOLDER for contradictory or unreadable
  specs; 0002 diagnostics passed on per entry; the duplicate → R-6 failure; `successor.ts` with
  the reading rule from *Research*. Tests: `fs110-parallel-synthetic` (Blocked from the plan and
  from the note), `fs-broken` (unreadable, duplicate), `fs170-brownfield-mixed` (invariant
  breach), memory cases for each contradiction, AC-025's exceptions and the three successor
  outcomes.
- **Verify:** `npm run test:unit -- src/core/lifecycle` plus the per-step gates
- [x] **Verified (T-002):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle` 18 of 25 new tests failed (assertions on Blocked, contradictions and `Not implemented` from the `readSuccessor` stub; the negative-control tests were green at once); green: 42 of 42 in `src/core/lifecycle`; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 33 files, 558 tests passed.
- **Notes:** the reactivated-Baseline exception (§6.3, OP-006) accepts `**Plan:** _none_` only, as the spec words it; `_none yet_` with an `**Origin:**` line still gets `active-without-plan` (featherspec-format risk #10 names both placeholders for Baselines — Gregor may widen the spec). Contradiction diagnostics are not raised for an unreadable spec (it has no status to judge); its `unreadable-file` diagnostic from 0002 is passed on. Entries are ordered by key, so `active/` precedes `backlog/`. Tests: `deriveLifecycle.rules.test.ts`, `successor.test.ts`.

### T-003 — Verification status and determinism

- **Covers:** AC-018, AC-010, AC-007
- **Files:** `src/core/lifecycle/verification.ts`, `src/core/lifecycle/verification.test.ts`, `src/core/lifecycle/deriveLifecycle.ts`, `src/core/lifecycle/model.ts`, `src/core/lifecycle/deriveLifecycle.test.ts`
- **Do:** pick the §6.6 source (sibling, linked archive, legacy sibling), count rows per `State`
  (other values count as *other*), give the summary *not available* / *pending* / *all
  verified*, and report the compile verdict as *not available* (X-8). Attach the result to every
  entry. Tests: every row `verified` on an `active/` Review spec stays Review (AC-007); deriving
  the same fixture twice, and from a fresh read, gives deep-equal models (AC-010).
- **Verify:** `npm run test:unit -- src/core/lifecycle/verification src/core/lifecycle/deriveLifecycle` plus the per-step gates
- [x] **Verified (T-003):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle/verification src/core/lifecycle/deriveLifecycle` 10 of 24 failed (entries had no `verification`; stub `Not implemented`); green: 56 of 56 in `src/core/lifecycle`; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 34 files, 572 tests passed. Negative controls: active/ never Done, changed file content changes the model.
- **Notes:** `VerificationStatus.source` is the plan path whose rows were counted (`undefined` when summary is *not available*). AC-010 holds without a clock input because the model carries no timestamps; the test compares two reads with different mtimes.

### T-004 — Transition check and flow marker

- **Covers:** AC-008, AC-009
- **Files:** `src/core/lifecycle/transitions.ts`, `src/core/lifecycle/transitions.test.ts`, `src/core/lifecycle/flow.ts`, `src/core/lifecycle/flow.test.ts`
- **Do:** `judgeTransition(model, key, target)` uses the §6.4 rows in order and returns a reason
  kind plus parameters (rule ID, precondition IDs) and text (X-1…X-5). An accepted request
  returns a verdict and leaves the model unchanged. `classifyFlow(old, new)` checks reachability
  over the in-flow steps with Blocked allowed only as an end state. Tests assert the kind and its
  parameters, not the wording, and cover reachability: Backlog → Review in flow; Active →
  Backlog, Done → Ready outside the flow.
- **Verify:** `npm run test:unit -- src/core/lifecycle/transitions src/core/lifecycle/flow` plus the per-step gates
- [x] **Verified (T-004):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle/transitions src/core/lifecycle/flow` 27 of 27 failed with `Not implemented` (stubs `classifyFlow`, `judgeTransition`); green: 83 of 83 in `src/core/lifecycle`; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 36 files, 599 tests passed.
- **Notes:** X-4 joins the readiness reasons without their closing full stop (`R-3 <reason>; R-4 <reason>.`). `judgeTransition` returns `{ accepted, refusal, text }`; the tests assert `refusal` (kind and parameters) except one text test for X-1…X-5. `classifyFlow` returns only *in flow* or *outside the FeatherSpec flow*; *not checked* is set by the history (T-006). A Done → Blocked jump counts as in flow (Done → Active → Blocked, Blocked only at the end).

### T-005 — History of live changes

- **Covers:** AC-014, AC-009, AC-023, AC-016
- **Do:** `src/core/lifecycle/statusHistory.ts`, `createStatusHistory({ store, clock })` with
  `observe(previous, current, model)`. For each stem whose state changed it appends one entry
  `{ observedAt, stem, old, new, rule, cause: { kind: 'files', paths }, flow }`. The changed paths
  come from the snapshot comparison in *Research*, and several changes in one notification give
  one entry. It exposes the X-8 history label once and appends on no other occasion. Tests:
  fake store and clock; plan `In Progress` → `Done` gives one Active → Review entry with the plan
  path; an out-of-flow move is marked; a status edit that leaves the state alone appends nothing.
- **Verify:** `npm run test:unit -- src/core/lifecycle/statusHistory` plus the per-step gates
- [x] **Verified (T-005):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle/statusHistory src/core/lifecycle/changedPaths` 11 of 11 failed with `Not implemented` (stubs `createStatusHistory`, `changedPaths`); green: 94 of 94 in `src/core/lifecycle`; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 38 files, 610 tests passed.
- **Notes:** extra files: `changedPaths.ts` (snapshot comparison for AC-014), `testing/fakeHistoryStore.ts`. The entry carries its own `observedAt` from `ClockPort` inside the entry; the store's own record stamp is separate. In T-005 the first `observe` only seeds the last states (the stored-history baseline is T-006); `read()` already reports an unreadable store as *not available* (its test comes with T-006). The first T-005 commit went in before the `tsc` fix of `read()`; the follow-up commit carries it.

### T-006 — Baseline, identity and store outage in the history

- **Covers:** AC-015, AC-017, AC-024, AC-026
- **Do:** the first readable derivation per project and store reads the stored history and
  computes the last recorded state per stem, skipping foreign shapes. Then: *changed while Studio
  was not running* (not checked), *first observed* (no old state), *no longer observed* (no new
  state); a stem change gives both entries, a folder move neither. A duplicated stem gets no
  entries; when the duplication ends, the comparison follows AC-026. A read-only, unavailable or
  failing store means no append, nothing recorded later, and the history reported as *not
  available* with the reason. Tests on the fake store, including a `RuntimeRefusal` thrown on
  append.
- **Verify:** `npm run test:unit -- src/core/lifecycle/statusHistory` plus the per-step gates
- [x] **Verified (T-006):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle/statusHistory` 12 of 21 new tests failed (assertions: no baseline, no first observed or no longer observed entries, outage not handled; the T-005 recorder only seeded states); green: 115 of 115 in `src/core/lifecycle`; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 39 files, 631 tests passed.
- **Notes:** the first derivation with a readable history is the baseline: with an empty history every stem is *first observed* (the spec's "first run"); the T-005 tests therefore seed through `baseline()` in `testing/historyWorld.ts`. A store that is read-only or unavailable keeps `last` current without appending, so a gap is never recorded later; a failing append stops the batch and is not retried; `read()` is *not available* only when the history cannot be read. Tests: `statusHistory.baseline.test.ts`.

### T-007 — Lifecycle service, extension wiring and the no-write proof

- **Covers:** AC-006, AC-011, AC-014
- **Do:** `src/core/lifecycle/lifecycleService.ts` follows `repository.onDidChange` and the
  runtime session's state: it re-derives, records the history, and offers `model()`,
  `judgeTransition()`, `history()` and `onDidChange`. Wired in `src/extension.ts`, with
  `StudioApi.lifecycle()`. Unit tests: (AC-006) a store holding a `Completed` run of the spec does
  not change the model; (AC-011) a fixture copied to a temp dir is read by the Node adapters, the
  store sits on `fileRuntimeMedium` in a separate temp dir, and after derivation, a transition
  request and a history append, `snapshotTree` is unchanged. Host smoke
  `src/test/lifecycle.smoke.test.ts` (CI only).
- **Verify:** per-step gates plus `npm run compile`
- [x] **Verified (T-007):** 2026-11-16 · red: `npm run test:unit -- src/core/lifecycle/lifecycleService` 8 of 8 failed with `Not implemented` (stub `createLifecycleService`); green: 8 of 8; gates: eslint 0 warnings, `tsc --noEmit` clean, `npm run test:unit` 40 files, 639 tests passed, `npm run compile` green (esbuild bundle built). Host smoke `src/test/lifecycle.smoke.test.ts` compiles; it runs on CI only.
- **Notes:** the service re-derives the whole model on every notification (pure and cheap), not only the affected specs; the history still appends per changed stem. It makes a new recorder, and so a new baseline, whenever the store object or the project root changes. AC-011 proof: fixture copy in a temp dir, `createNodeSpecSource` and a real `createSpecRepository`, store on `createFileRuntimeMedium` in another temp dir; a stale stored entry makes the baseline append, `snapshotTree` of the project is equal before and after.

### T-008 — Docs sync and final gates

- **Covers:** AC-001 … AC-026 (re-proven by the full gate run)
- **Do:** add exactly one `architecture:` modules entry in `AGENTS.md`:
  `'src/core/lifecycle — lifecycle model: state derivation, readiness, contradictions, verification status, transition check, flow marker, status history, lifecycle service (spec 0003)'`.
  `systemPatterns.md` *Key decisions*: the pure derivation plus the history behind the 0004 port;
  the baseline rule (*Research* (a)); the Blocked-free chain rule. `techContext.md` *Test*:
  lifecycle tests and the smoke file. `activeContext.md`: Changed Recently, Next, Validation.
  No README change (no user-visible command).
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` · `npm run compile`
- [x] **Verified (T-008):** 2026-11-16 · `npx eslint src --max-warnings 0` 0 warnings · `npx tsc --noEmit` clean · `npm run test:unit` 40 files, 639 tests passed · `npm run compile` green. `AGENTS.md` got the one `src/core/lifecycle` modules entry; `systemPatterns.md` three decisions; `techContext.md` test notes. `npm test` (host) did not run here: CI.
- **Notes:** `AGENTS.md` is 215 lines, over its 200-line target since before this spec; the eviction proposal stays open for Gregor (not made here, it needs his decision).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-008 | `src/core/lifecycle/deriveLifecycle.ts:decide` | `deriveLifecycle.test.ts` (AC-001 cases) | verified |
| AC-002 | T-001 | `src/core/lifecycle/deriveLifecycle.ts:derivedLabel`, `model.ts` | `deriveLifecycle.test.ts` (AC-002) | verified |
| AC-003 | T-001 | `src/core/lifecycle/readiness.ts:evaluateReadiness` | `readiness.test.ts` (AC-003) | verified |
| AC-004 | T-001 | `src/core/lifecycle/readiness.ts:evaluateReadiness` | `readiness.test.ts` (AC-004) | verified |
| AC-005 | T-001 | `src/core/lifecycle/readiness.ts:READINESS_REASONS` | `readiness.test.ts` (AC-005) | verified |
| AC-006 | T-007 | `src/core/lifecycle/lifecycleService.ts:createLifecycleService` (no run input) | `lifecycleService.test.ts` (AC-006) | verified |
| AC-007 | T-003 | `src/core/lifecycle/deriveLifecycle.ts:decide` | `verification.test.ts` (AC-007) | verified |
| AC-008 | T-004 | `src/core/lifecycle/transitions.ts:judgeTransition` | `transitions.test.ts` (AC-008) | verified |
| AC-009 | T-004, T-005 | `src/core/lifecycle/flow.ts:classifyFlow`, `statusHistory.ts:observe` | `flow.test.ts`, `statusHistory.test.ts` (AC-009) | verified |
| AC-010 | T-003 | `src/core/lifecycle/deriveLifecycle.ts:deriveLifecycle` (pure, no clock input) | `deriveLifecycle.test.ts` (AC-010) | verified |
| AC-011 | T-007 | `src/core/lifecycle/lifecycleService.ts` (read-only ports only) | `lifecycleService.test.ts` (AC-011) | verified |
| AC-012 | T-002 | `src/core/lifecycle/entryContext.ts:findContradictions` | `deriveLifecycle.rules.test.ts` (AC-012) | verified |
| AC-013 | T-002 | `src/core/lifecycle/successor.ts:readSuccessor` | `successor.test.ts` (AC-013) | verified |
| AC-014 | T-005, T-007 | `src/core/lifecycle/statusHistory.ts:observe`, `changedPaths.ts`, `lifecycleService.ts:refresh` | `statusHistory.test.ts`, `lifecycleService.test.ts` (AC-014); `src/test/lifecycle.smoke.test.ts` (CI) | verified |
| AC-015 | T-006 | `src/core/lifecycle/statusHistory.ts:baseline` | `statusHistory.baseline.test.ts` (AC-015) | verified |
| AC-016 | T-005 | `src/core/lifecycle/statusHistory.ts:HISTORY_LABEL`, `observe` | `statusHistory.test.ts` (AC-016) | verified |
| AC-017 | T-006 | `src/core/lifecycle/statusHistory.ts:baseline`, `observe` | `statusHistory.baseline.test.ts` (AC-017) | verified |
| AC-018 | T-003 | `src/core/lifecycle/verification.ts:readVerification` | `verification.test.ts` (AC-018) | verified |
| AC-019 | T-002 | `src/core/lifecycle/readiness.ts:hasProblem`, `deriveLifecycle.ts:decide` | `deriveLifecycle.rules.test.ts` (AC-019) | verified |
| AC-020 | T-002 | `src/core/lifecycle/entryContext.ts:buildContexts` | `deriveLifecycle.rules.test.ts` (AC-020) | verified |
| AC-021 | T-001 | `src/core/lifecycle/deriveLifecycle.ts:decide` | `deriveLifecycle.test.ts` (AC-021) | verified |
| AC-022 | T-002 | `src/core/lifecycle/readiness.ts:hasProblem` | `deriveLifecycle.rules.test.ts` (AC-022) | verified |
| AC-023 | T-005 | `src/core/lifecycle/statusHistory.ts:observe` | `statusHistory.test.ts` (AC-023) | verified |
| AC-024 | T-006 | `src/core/lifecycle/statusHistory.ts:append`, `readStored` | `statusHistory.baseline.test.ts` (AC-024) | verified |
| AC-025 | T-002 | `src/core/lifecycle/entryContext.ts:findContradictions` | `deriveLifecycle.rules.test.ts` (AC-025) | verified |
| AC-026 | T-006 | `src/core/lifecycle/statusHistory.ts:verdicts`, `observe` | `statusHistory.baseline.test.ts` (AC-026) | verified |

## Session handoff

- **Done so far:** all eight steps (T-001...T-008) ticked with recorded runs; `src/core/lifecycle` is complete and wired (`StudioApi.lifecycle()`); eslint, tsc, `test:unit` (639 tests) and `compile` green; docs synced.
- **Next action:** `npm test` (host smoke incl. `src/test/lifecycle.smoke.test.ts`) on CI or Windows; then `/sdd-compile` in a fresh session with a model from another family; then `/sdd-lifecycle` active → done.
- **Open decisions:** `_none yet_` + `**Origin:**` is not an exception in AC-025 (see T-002 Notes); `AGENTS.md` over its line target (T-008 Notes).
- **Baseline:** 0e0380a (HEAD before the first step commit).
- **Environment:** `npm test` cannot run in the sandbox (VS Code download blocked); CI runs it.
