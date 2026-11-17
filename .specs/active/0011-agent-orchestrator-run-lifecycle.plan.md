# Plan — Agent Orchestrator & Run Lifecycle

**Spec:** [0011-agent-orchestrator-run-lifecycle.md](0011-agent-orchestrator-run-lifecycle.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-001

## Approach

A new framework-free core module `src/core/orchestrator/` sits between 0009's provider service and
0004's run store. Its heart is one **pure run tracker** (`runTrack.ts`): status, session started,
open approval and input requests, and the result material of one run; one function applies an
accepted event and returns the status to append, if any (BR-001, BR-003, BR-004). The **orchestrator
service** (`orchestrator.ts`) owns the operations (start, stop, resume, answers, reads), one
**operation lock** around check-and-create (BR-002 under concurrency, AC-002) and one **event queue**
that hands every port event to 0004 in arrival order, applies it to the tracker and appends the status
— so a start result, a timer and an event are never decided out of order. Timers run on 0004's
`RuntimeClock`; the store comes from `RuntimeSession` (it opens only after 0004's `Interrupted`
classification, spec §13); spec facts come from the existing `ShellModelSource` (A-005 holds:
lifecycle entries carry stem, path key and state). Palette commands and confirmations go through a
small UI port with a thin VS Code adapter. Order: the pure rules first (everything decides on them),
then the start path end to end, then endings and operations, then resume and reads, then wiring and
docs. Memory Bank files touched: `systemPatterns.md`, `techContext.md`, `activeContext.md` (T-008).

**Precondition:** plan 0009 is `Done` — this plan uses its registry, service, fake provider and
`createProviderSetup` exactly as its *Surface* names them and redefines nothing of it.

### Surface (for 0008 and 0012; T-002…T-007 build it)

- `createOrchestrator(deps)` in `src/core/orchestrator/orchestrator.ts`; deps `{ session:
  Pick<RuntimeSession, 'current' | 'state' | 'onDidChangeState'>, registry: ProviderRegistry,
  providers: ProviderService, specs: ShellModelSource, ui: OrchestratorUiPort, clock: RuntimeClock,
  workingDirectory: () => string | undefined }` (the active project root of 0001, for resume).
- `start(request: StartRequest): Promise<{kind: 'started', runId} | Refusal>`, `StartRequest =
  {stem, path, providerId, model: string /* or NOT_AVAILABLE */, prompt, workingDirectory}` (0008 §8).
- `stop(runId): Promise<{kind: 'stopping'} | Refusal>` — asks nothing (the caller confirmed).
- `resumability(runId): Promise<{resumable: true} | {resumable: false, reason}>`;
  `resume(runId): Promise<{kind: 'resumed', runId /* the new run */} | {kind: 'declined'} | Refusal>`.
- `respondToApproval(runId, requestId, answer: ApprovalAnswer)`, `respondToInput(runId, requestId,
  text)`: `Promise<{kind: 'ok'} | Refusal>`; a provider refusal comes back as a `Refusal` with its reason.
- `previousRun(stem): Promise<{kind: 'run', runId, status, errorClass, errorText} | {kind: 'none'} |
  {kind: 'not-available', reason}>`; missing values are `NOT_AVAILABLE`.
- `isSpecNotFound(stem, model: ShellModel | undefined): boolean` (pure, `specLink.ts`), for 0006/0012.
- `readRunResult(run: RunView)` (pure, `result.ts`) → `{finalMessage, usage, changedFiles, durationMs}`,
  each value or `NOT_AVAILABLE`.
- `Refusal = {kind: 'refused', code, reason, run?: {runId, stem}}`, `code` one of `reader-window` ·
  `store-not-writable` · `run-open` · `not-registered` · `create-failed` · `not-open` ·
  `not-supported` · `stop-pending` · `request-not-open` · `invalid-answer` · `not-resumable` ·
  `provider-refused`.
- `whenIdle()`, `dispose()` (the shutdown of BR-016). Constants `START_TIMEOUT_MS = 60_000`,
  `STOP_TIMEOUT_MS = 30_000`; `ERROR_CLASSES` (BR-008) in `errorClasses.ts`.
- **Stored events** (decides 0009 *Surface*'s "0011 decides where `source` is stored", 0012 A-006):
  `EventInput = {type: kind, payload: {...payload, source}, occurredAt, providerEventId}` — `source`
  is one more top-level payload field; no 0009 payload has a field of that name.
- **Stored result** (BR-011): `{finalMessage, usage, changedFiles}`, each the delivered value or
  `NOT_AVAILABLE`; `changedFiles` is `{path, operation}[]`, last operation per path.
- Palette: `createRunCommands({orchestrator, session, ui})` in `runCommands.ts`; command IDs
  `featherspec-studio.stopRun` "FeatherSpec Studio: Stop Run", `featherspec-studio.resumeRun`
  "FeatherSpec Studio: Resume Run". `StudioApi.orchestrator()` for the host smoke.

**Texts** (English, PD-016; M-03 accepts them): reader `Another window holds the write lock for this
project.` · store `The run history is not writable: <reason>.` · run open `Run <runId> of spec
<stem> is still open.` · not registered `Provider <id> is not registered.` · create failed `The run
could not be created: <reason>.` · stop: `Run <runId> has already ended.` / `<displayName> does not
support stopping a run.` / `A stop of run <runId> is already pending.` · answers: `Request
<requestId> of run <runId> is not open.` / `An approval answer is "approve once" or "reject".` ·
resume (1)–(8): reader or store text / `Run <runId> is not Interrupted.` / `Run <runId> is not the
latest run of spec <stem>.` / run-open text / `Provider <id> is not registered.` or `<displayName>
does not support resume.` / `Run <runId> has no stored session reference.` / `Spec <stem> is not in
the project.` or `Spec <stem> exists more than once in the project.` / `Spec <stem> is Done.` ·
resume confirmation `Resume the interrupted run <runId> of spec <stem>?` button `Resume` · Stop Run
confirmation `Stop the run of spec <stem>?` button `Stop Run` · `No run is open.` · `No run can be
resumed.` · pick placeholder `Choose the run to resume` (label stem, description run ID) · causes
`resumed from <runId>`, `stop not confirmed by provider` · continuation text of OP-005 · `No run`.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-007, T-008).
Pre-done gate on CI or Windows: `npm test` with the new `src/test/orchestrator.smoke.test.ts`.

## Research

- Survey: no orchestrator code exists. Store API `RuntimeStore` (`src/core/runtime/runtimeStore.ts`):
  `createRun` throws `RuntimeRefusal` when not writable or on a write failure (BR-012's "creating the
  run fails"); `reportStatus` checks only the closed list, not transitions — BR-001 is ours alone;
  `appendEvent` returns `stored` · `duplicate` · `dropped` (after the 20,000 cap, A-006) and throws
  when not writable; write failures after that return normally (0004 AC-014). `openRuntimeStore`
  classifies open runs as `Interrupted` before it resolves, and a takeover sets *writable* only after
  classifying (`becomeWriter`), so "no operation before the classification" (spec §13) holds when
  every operation needs `state().kind === 'writable'`. Losing the lock sets *read-only* with
  `READER_REASON` (`pollOrBeat`) — the trigger of BR-016; a project switch closes the store
  (`RuntimeSession.switchTo`), the other trigger. Reader vs. newer-version *read-only* is told apart
  by `READER_REASON` from `src/core/runtime/notices.ts`.
- Spec facts: `ShellModelSource.current()` (`src/core/shell/modelSource.ts`) gives
  `lifecycle.entries` with `stem`, `key` (project-relative path) and `state`; BR-005 (7)/(8) and
  BR-013 read it; `createSpecResolver` in `src/core/missionControl/specRefs.ts` groups by stem the same way.
- Test kit: `createFakeRuntimeClock`, `createSequentialIds`, `settle` (`src/core/runtime/testing/fakes.ts`),
  `createMemoryMedium` (`memoryMedium.ts`), `createFaultyMedium`; `snapshotTree` and `waitFor`
  (`src/core/discovery/testing/`) for AC-017 and the host smoke; fixture projects via
  `src/core/lifecycle/testing/projects.ts`. Host smoke precedent `src/test/runtime.smoke.test.ts`.
- Wiring: `src/extension.ts` builds `session` and `modelSource`; `deactivate` disposes the session —
  T-007 disposes the orchestrator first. UI adapter precedent `src/adapters/vscode/runtimeUi.ts`
  (modal `showWarningMessage` with one button).
- Readings this plan adds (no product decision): the start call runs outside the operation lock, its
  result is handled on the event queue after the events delivered so far, so a port-added derived
  `run.failed` wins over the refusal (BR-008, first end wins); `model` "not available" is passed to
  0004 and 0009 as absent; a `session.started` model is handed to 0004 (0004 AC-004 stores it when
  supplied); the resume's working directory is the active project root (0001), the value 0008 passes
  for a start; an open run this window does not track cannot exist in the writer (every open run
  is classified at writer activation), so stop and answers refuse it as `not-open`.
- Spec revised 2026-11-16 before planning (own spec only): OP-001, OP-003…OP-007 resolved by their
  recommendations (Gregor); aligned with 0009's surface — `endSession` after both timeouts (0009
  OP-006, BR-006, BR-008, AC-008, AC-010), a failing start or resume as the port's `run.failed` (0009
  OP-011, BR-008, AC-007); new BR-016/AC-024 (window end, OP-001/OP-003); A-006 (cap-dropped events
  count). No PD newer than the spec changes it (register ends at PD-047, none on run lifecycle).
- [VS Code activation events](https://code.visualstudio.com/api/references/activation-events) —
  `deactivate()` must return a Promise for asynchronous cleanup; no time limit is documented, hence
  BR-016's calls without waiting; retrieved 2026-11-16.
- [Extension anatomy](https://code.visualstudio.com/api/get-started/extension-anatomy) — `deactivate`
  runs on shutdown, disable and uninstall; retrieved 2026-11-16.
- No new dependency.

## Stages

1. T-001 → T-002 — the rules and the start path: a run is started and driven to its end by events
2. T-003 → T-004 — endings and operations: result, timeouts, window end, stop, answers
3. T-005 → T-006 — resume, spec flag, reader window, no-write proof
4. T-007 → T-008 — palette commands and VS Code wiring; docs sync and final gates

No parallel stage: every step after T-001 extends `src/core/orchestrator/orchestrator.ts` and its
test world, one module.

## Steps

### T-001 — Run tracker, transition table, error classes, import scan

- **Covers:** AC-004, AC-006, AC-007, AC-023
- **Do:** `src/core/orchestrator/runTrack.ts`: `ALLOWED_TRANSITIONS` (BR-001), `canTransition`,
  `RunTrack` (status, sessionStarted, open approvals and inputs in arrival order, final and last
  message, usage totals, changed files) and `applyEvent(track, event) → {track, status?, report?}`
  per BR-003/BR-004 (requests before `session.started` count from it; `.resolved` for a closed
  request ignored; end kinds; nothing after an end state). `errorClasses.ts`: `ERROR_CLASSES`,
  `classOf(runFailed)` (derived → `provider_exited`, category equal to a class → that class, else
  `unknown`). Tests `runTrack.test.ts` (all 64 ordered pairs against the table; waiting precedence;
  `tool.completed` not ok changes nothing) and `errorClasses.test.ts`. `importScan.test.ts`: no file of
  `src/core/orchestrator/` (tests aside) imports `vscode`, `src/adapters/` or a `PROVIDER_SDKS`
  package, with a negative control.
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-001):** 2026-11-17 — red: `npx vitest run src/core/orchestrator` with `Not implemented` stubs: 21 failed | 2 passed (runTrack, errorClasses; importScan's guard and its negative control stayed green by design); green after the implementation: 23 passed; gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1521 passed.
- **Notes:** `applyEvent` returns `steps` (a list), not one status: a request opened before `session.started` needs Starting → Running → Waiting (BR-004), and BR-001 allows no direct Starting → Waiting. Added `transition(track, status)` for timeouts and stops. The import scan's file-count guard is `>= 2` now and grows with the module.

### T-002 — Start and the event pipeline

- **Covers:** AC-001, AC-002, AC-003, AC-005, AC-006, AC-007
- **Do:** `orchestrator.ts` with `start` (BR-015, BR-012, BR-002 checked under the operation lock,
  `createRun` with stem, path, provider ID, model; start call with run ID, working directory,
  prompt, model) and the event queue: `providers.onEvent` → `appendEvent` (stored shape of
  *Surface*) → `applyEvent` → `reportStatus` (session reference with `Running`); a duplicate changes
  nothing; a refusal without an end kind → `Failed`/`unknown` with its reason. `texts.ts`.
  `testing/world.ts`: in-memory store through `openRuntimeStore` behind a session double (state
  and store switchable), fake clock, 0009's setup with the
  fake provider, scripted model source, fake UI, call recorders. Tests `orchestratorStart.test.ts`
  (two concurrent starts, refusals call no provider, `run.cancelled` then `run.completed` stays
  `Cancelled`, waiting statuses with the fake's `approval` and `input` scenarios, `failure:<category>`
  and `no-end` classes).
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-002):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/orchestratorStart.test.ts` against a stub whose methods reject with `Not implemented`: 20 failed, all with that error; green after the implementation: 43 passed in `src/core/orchestrator` (one assertion of my own test corrected: a duplicate is stored once, not twice); gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1541 passed.
- **Notes:** New port `src/core/ports/orchestrator.ts` (`OrchestratorUiPort`, `PickItem`) and the full `texts.ts` already exist; `orchestrator.ts` keeps the later operations as `Not implemented` stubs until their steps. `failRun` for a port refusal runs on the event queue.

### T-003 — Result, start timeout, no stall, window end, previous run

- **Covers:** AC-008, AC-014, AC-018, AC-021, AC-024
- **Do:** `result.ts`: the stored result of *Surface* from the tracker, `readRunResult`; every end
  state the orchestrator sets carries it (errors in `errorClass`/`errorMessage`). Start timeout per
  run from creation (cancel where declared, `endSession`), dropped when `Starting` is left. BR-016:
  on `session.onDidChangeState` leaving *writable* or a new `current()` store with a run open →
  cancel where declared, `endSession`, untrack; `dispose()` does the same without awaiting.
  `previousRun`. Tests `orchestratorEnd.test.ts`: AC-018's example, 60 s minus 1 ms vs. 60 s, 24 h
  without events (fake script: `session.started`, then a long `wait`), lock loss and store switch
  through the world's session double, `dispose` with an open run, `previousRun` for none, `Failed` and `Completed`.
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-003):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/orchestratorEnd.test.ts` with `result.ts` throwing `Not implemented` and no timers, window end or previous run: 16 failed (Not implemented and failing assertions such as `expected [ 'start:run-2' ] to deeply equal [ …cancel…, …endSession… ]`), 1 passed (the timer-dropped test, kept: its siblings are the negative control); green after the implementation: 60 passed in `src/core/orchestrator`; gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1558 passed.
- **Notes:** The production `RuntimeSession` emits no state change for a switch between two writable stores (`setState` drops an equal state), so BR-016's store switch is also checked lazily at the next event (`storeLost` in `handleEvent`); the world's session double fires the change at once. `StoredResult` and `ChangedFile` are type aliases so they are assignable to `JsonValue`. Empty changed files are stored as `not available` (no event delivered them).

### T-004 — Stop and answers

- **Covers:** AC-009, AC-010, AC-011, AC-012, AC-013
- **Do:** `stop`: refusals in order ended · no `cancel` · pending; one cancel call, stop timer 30 s
  from the call → `Cancelled` with the cause and `endSession`, dropped on any end kind.
  `respondToApproval` / `respondToInput`: only for a request open in the tracker, `approve-once` or
  `reject` with optional reason, text unchanged; returns the service's result; the request stays
  open until `.resolved`. Tests `orchestratorOperations.test.ts`: cancel counted, a cancel that never
  answers (`ignoreCancel`), 29 999 ms vs. 30 000 ms, refusals call nothing, invalid answer value,
  resolved request, 24 h unanswered still open.
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-004):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/orchestratorOperations.test.ts` with `stop`, `respondToApproval` and `respondToInput` rejecting `Not implemented`: 15 failed, all with that error; green after the implementation: 75 passed in `src/core/orchestrator` (one test of mine corrected: a controlled-adapter override replaces its call recording); gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1573 passed.
- **Notes:** Added `INVALID_INPUT_TEXT` (`An input answer is text.`) for a non-text input answer: the plan's texts name no wording for it (M-03 to accept). A request is checked before the answer value, so an invalid value for a closed request reports `request-not-open`. Stop and answers wait for the event queue first, so a request that arrived a moment earlier counts.

### T-005 — Resume

- **Covers:** AC-015, AC-016, AC-008
- **Do:** `resumability` with BR-005's eight conditions in order (texts of *Surface*); `resume`: one
  confirmation through the UI port, decline → `declined` and nothing changed; yes → check again,
  create the new run (old run's provider and stem, entry's current path, first status cause
  `resumed from <runId>`), call `resume` with the new run ID, stored session reference and the
  continuation text; start timeout applies. Old run untouched. Tests `orchestratorResume.test.ts`:
  one case per condition failing first (arranged through a store seeded with an `Interrupted` run by
  a first store instance), decline, a condition that turns false while the confirmation is open, the
  new run's data, a resumed run still `Starting` after 60 s.
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-005):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/orchestratorResume.test.ts` with `resumability` and `resume` rejecting `Not implemented`: 19 failed, all with that error; red for the 0004 extension: the contract test `0011 BR-005: a cause given at creation …` failed on both media (assertion: first status entry has no cause) before `records.ts`/`runtimeStore.ts` carried it; green: `npx vitest run src/core/orchestrator src/core/runtime src/adapters/node/fileRuntimeMedium.test.ts` all passed; gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1594 passed.
- **Notes:** Deviation, 0004 touched: BR-005 needs the cause `resumed from <runId>` on the new run's FIRST status entry, but `createRun` had no cause. Added optional `cause` to `CreateRunInput`, the created record (parsed as optional string, masked) and the first history entry; additive, format version unchanged, covered by the shared contract suite (`contractRuns.ts`, both media). The resume's model is the old run's model when it has one.

### T-006 — Spec flag, reader window, no-write proof

- **Covers:** AC-017, AC-019, AC-020
- **Do:** `specLink.ts` `isSpecNotFound` (no entry carries the stem; moves keep the stem). Reader
  window: every changing operation refuses with the reader text before anything else and calls no
  provider; `previousRun` and the flag still answer (second store instance on the same memory
  backing as reader). `noWrite.test.ts`: a temp copy of a fixture project, `snapshotTree` before and
  after running the start, stop, resume and answer scenarios with the Node-fs runtime medium in a
  separate temp directory; negative control: a test-only write into the copy turns it red.
- **Verify:** `npx vitest run src/core/orchestrator` then the per-step gates
- [x] **Verified (T-006):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/specLink.test.ts` with `isSpecNotFound` throwing `Not implemented`: 4 failed; `orchestratorReader.test.ts` and `noWrite.test.ts` test behaviour built in T-002…T-005 and were green at once, each with a negative control (the same calls in the writer window are not refused as a reader; a stray write into the copy changes the snapshot); one test of mine was red on a wrong expectation (losing the lock itself cancels the open run, BR-016) and fixed. Green: `npx vitest run src/core/orchestrator` 103 passed; gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1603 passed.
- **Notes:** `noWrite.test.ts` runs seven fake-provider scenarios (happy path, approval answer, input answer, stop, failure, resume of a reopened store) through the Node-fs runtime medium in a separate temp directory; the world takes an optional `medium` factory.

### T-007 — Palette commands and VS Code wiring

- **Covers:** AC-022, AC-020, AC-024
- **Do:** `runCommands.ts` (Stop Run: the open run, confirmation, `stop`, refusal shown; Resume Run:
  resumable runs, none → message, one → `resume`, several → pick list by stem) with
  `runCommands.test.ts`; `OrchestratorUiPort` (`confirm`, `pick`, `info`). `src/adapters/vscode/orchestratorUi.ts`.
  `package.json`: the two commands; manifest test for both titles. `src/extension.ts`: create the
  orchestrator from session, 0009's setup, model source and clock; register the commands;
  `StudioApi.orchestrator()`; `deactivate` disposes it before the session. Host smoke
  `src/test/orchestrator.smoke.test.ts` (CI only, Mocha timeout 120 s, `waitFor` names what it waits
  for and the last status): both commands registered; with the fake enabled a start on the fixture
  project reaches `Completed` in the store.
- **Verify:** `npx vitest run src/core/orchestrator src/adapters/vscode/manifest.test.ts` then the per-step gates and `npm run compile`
- [x] **Verified (T-007):** 2026-11-17 — red: `npx vitest run src/core/orchestrator/runCommands.test.ts` against a stub rejecting `Not implemented`: 8 failed; `npx vitest run src/adapters/vscode/manifest.test.ts`: 1 failed (`expected undefined to be 'FeatherSpec Studio: Stop Run'`) before the two commands entered `package.json`; green: both files pass (8 and 17 tests); gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 1612 passed, `npm run compile` built. Host smoke `src/test/orchestrator.smoke.test.ts` written, compiled and linted; it runs on CI only (`npm test` cannot run here).
- **Notes:** The smoke polls the store with a plain loop (`waitFor` observes synchronously) and names the last status in its failure. The wiring uses `controller.snapshot().active?.root` as the working directory for a resume. `deactivate` disposes the orchestrator before the session.

### T-008 — Docs sync and final gates

- **Covers:** AC-001 … AC-024
- **Do:** README: a "Runs" paragraph (Stop Run, Resume Run, timeouts, no automatic retry).
  `AGENTS.md` snapshot — add module `'src/core/orchestrator — agent orchestrator: run tracker and
  transitions, error classes, start, stop, resume, answers, timeouts, result, spec-not-found flag,
  palette run commands (spec 0011)'`. `systemPatterns.md`: event queue plus operation lock, `source`
  stored in the payload, `endSession` after timeouts and at window end. `techContext.md`: orchestrator
  tests and the host smoke file. `activeContext.md`. Then every gate.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [ ] **Verified (T-008):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | — | — | open |
| AC-002 | T-002 | — | — | open |
| AC-003 | T-002 | — | — | open |
| AC-004 | T-001 | — | — | open |
| AC-005 | T-002 | — | — | open |
| AC-006 | T-001, T-002 | — | — | open |
| AC-007 | T-001, T-002 | — | — | open |
| AC-008 | T-003, T-005 | — | — | open |
| AC-009 | T-004 | — | — | open |
| AC-010 | T-004 | — | — | open |
| AC-011 | T-004 | — | — | open |
| AC-012 | T-004 | — | — | open |
| AC-013 | T-004 | — | — | open |
| AC-014 | T-003 | — | — | open |
| AC-015 | T-005 | — | — | open |
| AC-016 | T-005 | — | — | open |
| AC-017 | T-006 | — | — | open |
| AC-018 | T-003 | — | — | open |
| AC-019 | T-006 | — | — | open |
| AC-020 | T-006, T-007 | — | — | open |
| AC-021 | T-003 | — | — | open |
| AC-022 | T-007 | — | — | open |
| AC-023 | T-001 | — | — | open |
| AC-024 | T-003, T-007 | — | — | open |
| M-01, M-02 | — (0010's acceptance, OP-006) | — | — | open |
| M-03 | — | — | manual: Gregor accepts the texts of *Surface* | open |

## Session handoff

- **Done so far:** plan written; spec revised 2026-11-16 (open points resolved, aligned with 0009's
  surface, BR-016/AC-024, A-006).
- **Next action:** Gregor reads the plan; after plan 0009 is `Done` and on the start signal,
  `/sdd-lifecycle` backlog → active, then T-001.
- **Open decisions:** none. For the main session: 0010 takes M-01/M-02 (OP-006); 0012 reads
  `payload.source` (*Surface*).
- **Baseline:** _(set when work starts)_
- **Environment:** `npm test` cannot run here (VS Code download blocked); the host smoke runs on CI
  or Gregor's Windows machine.
