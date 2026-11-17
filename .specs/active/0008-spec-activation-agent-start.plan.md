# Plan — Spec Activation & Agent Start Workflow

**Spec:** [0008-spec-activation-agent-start.md](0008-spec-activation-agent-start.md)
**Status:** Done
**Last updated:** 2026-11-17
**Current step:** — (all steps done)

## Approach

A new framework-free core module `src/core/agentStart/` holds the start prompt, the
precondition check and the **start flow** service that 0007's existing `StartWorkflowPort`
(`src/core/ports/board.ts`) is wired to. The flow consumes what the earlier specs expose and
redefines none of it: 0003's `judgeTransition` on the `ShellModelSource` snapshot (P-1), 0001's
`ReadOnlyFileSystem` (P-2), 0009's `SettingPort`, registry and provider service (P-3, P-4,
display name, `permissionModeLabel`, `disclosure`, `nextStartModel`, capabilities), 0006's
`createRunSource` over the runtime session (P-5, P-6, watching the started run), the shell's
`TrustPort` (P-7). 0011 is reached through one narrow port of this spec, `StartOrchestratorPort`
(`src/core/ports/agentStart.ts`: `start`, `previousRun`), which the composition root binds to
0011's orchestrator, so 0008's tests run on a recording fake and 0011's internal names stay
0011's. The flow publishes one serialisable `AgentStartView` (contract and strict guard in
`src/shared/protocol/agentStart.ts`, no `seq`, re-sent on `hello`, as board and Mission Control
do); the webview renders it as a dialog plus two dismissable lines above the area. Order: the
two pure pieces first (prompt ‖ preconditions), then the flow with the contract, then flow end
‖ webview lines, then the dialog and the wiring, then docs. Memory Bank files touched in T-008:
`systemPatterns.md`, `techContext.md`, `activeContext.md`.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-007, T-008).
Pre-done gate on CI or Windows: `npm test` with the new `src/test/agentStart.smoke.test.ts`.

## Research

- Survey (2026-11-16):
  - Hand-off exists: `createMoves` (`src/core/board/moves.ts`) awaits `deps.start.start({stem,
    key})` after 0003 accepts and answers `handedOff`; `src/extension.ts` passes `start:
    undefined`, so the refusal "Agent start is not available yet" (`AGENT_START_UNAVAILABLE_TEXT`)
    shows. `handOff` must therefore resolve at once and run the check afterwards. 0007's unit
    test for `start: undefined` stays valid; only the wiring changes (spec §17).
  - P-1: `judgeTransition(model.lifecycle, key, 'Active')` returns `Refusal` kinds
    `not-observed · derived-target · needs-evidence · not-ready (failing R-ids) · lifecycle-move`;
    stem lookup over `model.lifecycle.entries` (0, 1 or several entries, PD-019).
  - Project root: `ShellModel.project.root`, a URI string (`folder.uri.toString()`), also the
    store key. The core puts this root into the start request; the binding in the composition
    root turns it into a file-system path (`vscode.Uri.parse(root).fsPath`) for 0011's
    working directory — a CLI needs a path, not a URI.
  - Runtime: `RuntimeSession.state()` (P-6), `createRunSource` (`src/core/missionControl/runSource.ts`)
    follows the current store and reads runs (P-5; skipped when runs are not readable) and fires
    on run changes (watch). `RunView.statusHistory` decides `Starting` → `Failed`;
    `RunView.errorClass` is the notice's class.
  - Panel: `src/adapters/vscode/studioPanel.ts` adopts one panel, pushes board, detail and Mission
    Control events, re-sends on `hello`, calls `board.panelClosed()` on dispose; it has no
    view-state listener yet. The webview loses its state when hidden (VS Code guide below), so
    the flow state lives in the host.
  - 0009 (active, T-001 not started) fixes `SettingPort` in `src/core/ports/host.ts`,
    `createProviderSetup`, `AVAILABILITY_TIMEOUT_MS` inside the service, and two scans: no
    `'fake'`/`'copilot'` literal in production modules outside `src/adapters/providers/` and
    `src/extension.ts`; its T-008 manifest test asserts that **no** configuration property
    defaults to an ID of `PROVIDER_IDS`. Spec 0008 §6.5 ships `copilot`, and 0009 AC-012 only
    forbids `fake`: T-007 narrows that assertion to `fake` (deviation from 0009's plan, named for
    the main session). The default lives in `package.json`, so no literal enters a module.
  - No fixture carries `.claude/`: T-002 adds `test/fixtures/fs110-start-ready` (copy of
    `fs110-ready-synthetic` plus three one-line stubs for P-2). Not added to the host workspace,
    so the other smoke suites are untouched.
  - No root `.gitattributes`: the golden file gets `text eol=lf`, or a Windows checkout with
    `core.autocrlf` breaks AC-006's byte comparison.
- Assumptions this plan adds: (a) 0011 answers a start request with a run ID or a refusal
  `{text, run?: {id, stem}}`; the binding maps 0011's real type onto it. (b) 0011 returns the
  previous-run summary as latest run ID, status, error class and error text, or none. (c) A
  refusal for the old project and an open confirmation are cleared when the model's project root
  changes; a start request already handed to 0011 is still answered. (d) P-4 is asked again on
  Start (a second availability call).
- Decided here per spec §14 and §16: setting `featherspec-studio.defaultProvider` (string,
  default `copilot`, scope `window`); the open points by their recommendations (spec §16,
  2026-11-16); confirmation tokens `c-<n>` reject a stale Start or Cancel. No PD newer than the
  spec changes it. No new dependency.
- Texts (English, PD-016; tests assert IDs and parameters, not wording):
  P-1 "P-1 The board does not accept this start: <0003 text>" · no entry "P-1 No spec carries
  the stem <stem>." · several "P-1 Several specs carry the stem <stem>." · P-2 "P-2 Missing
  FeatherSpec file: <path>." (one line per path) · P-3 "P-3 No provider configured." /
  "P-3 The default provider <id> is not registered." · P-4 "P-4 <display name> is not
  available: <result>. <reason>" · P-5 "P-5 Run <id> of spec <stem> is still open." · P-6
  "P-6 The run history cannot be written: <reason>" · P-7 "P-7 Restricted Mode: trust this
  workspace to start an agent." · P-8 "P-8 The stem <stem> is not of the form NNNN-slug." ·
  pending "Another start is still being prepared." · outdated "The provider, model or
  permission mode changed since the confirmation opened. Start again." · checking "Checking
  whether an agent can start on spec <number>…" · dialog title "Start an agent on spec
  <number>?" · labels "Spec", "Provider", "Model", "Permission mode", "Previous run", "Start
  prompt", model fallback "provider default", previous run "No run" · capability lines "This
  provider cannot ask for approval before it acts." / "This provider cannot ask you questions,
  so the agent cannot wait for your answer." · buttons "Show start prompt" / "Hide start
  prompt", "Start", "Cancel" · notice "Run <id> failed to start: <error class>." with "Open run"
  and "Dismiss".
- [WAI-ARIA APG: Dialog (Modal) pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
  — `role="dialog"`, `aria-modal="true"`, `aria-labelledby`; focus moves inside on open, Tab
  wraps, Escape closes, focus returns to the opener; retrieved 2026-11-16.
- [VS Code Webview API guide](https://code.visualstudio.com/api/extension-guides/webview) —
  `onDidChangeViewState` fires on visibility changes, `panel.visible`; a hidden webview loses its
  state unless persisted, so host-side state plus re-send is the pattern; retrieved 2026-11-16.
- [gitattributes](https://git-scm.com/docs/gitattributes) — `eol=lf` keeps LF in the working
  tree on every platform, `-text` disables conversion; retrieved 2026-11-16.
- Specs read: [plan 0009](../plan-archive/0009-agent-provider-abstraction.2026-11-17.plan.md) *Surface*,
  [0011](0011-agent-orchestrator-run-lifecycle.md) §6, §9, AC-001, AC-002, AC-021,
  [0012](0012-live-agent-activity-monitoring.md) §1 (navigation from the notice),
  [0010](0010-first-agent-provider-copilot.md) BR-04, BR-05, BR-08, BR-14.

## Stages

1. T-001 ‖ T-002 — independent: start prompt with golden file; precondition check with fixture
2. T-003 — start flow: hand-off, refusal, confirmation, cancel, pending; view contract
3. T-004 ‖ T-005 — independent: flow end (Start, request, 0011 answer, failure watch, no-write);
   webview lines for checking, refusal and notice
4. T-006 → T-007 — confirmation dialog; setting, panel and extension wiring, host smoke
5. T-008 — docs sync and final gates

Parallel: stages 1 and 3. Stage 3 holds only if T-003 left the contract in
`src/shared/protocol/agentStart.ts` complete; a change to it during T-004 or T-005 stops the
stage and becomes its own step.

## Steps

### T-001 — Start prompt and golden file

- **Covers:** AC-006
- **Files:** `src/core/agentStart/startPrompt.ts`, `src/core/agentStart/startPrompt.test.ts`,
  `src/core/agentStart/startPrompt.golden.txt`, `.gitattributes`
- **Do:** `buildStartPrompt({ stem, specPath, planPath })`: the §6.3 template as one constant,
  one line per paragraph and list item, LF, placeholders replaced; paths project-relative with
  `/`. The plan path is the sibling `.plan.md` in `backlog/`. Golden file for `0001-ready-feature`
  of `fs110-ready-synthetic` (paths read from the fixture through `readProject`); byte comparison
  with `Buffer.equals`; negative controls: one changed character and a CRLF variant fail; the
  prompt holds no file content (no line of the fixture spec occurs in it). `.gitattributes`:
  `*.golden.txt text eol=lf`.
- **Verify:** `npx vitest run src/core/agentStart/startPrompt` then the per-step gates
- [x] **Verified (T-001):** 2026-11-17 — red: `npx vitest run src/core/agentStart/startPrompt` with the `Not implemented` stub: 5 of 6 failed (`Error: Not implemented`; the sixth only reads the fixture paths). Green: 6 of 6 pass (golden byte equality, one-character and CRLF negative controls, 7 non-empty LF lines, no placeholder left, no spec line in the prompt). Gates: eslint 0 warnings, tsc and tsc -p src/webview clean, `npm run test:unit` 125 files, 1618 tests green.
- **Notes:** The root `.gitattributes` already has `* text=auto eol=lf`; `*.golden.txt text eol=lf` is added anyway so the golden file stays pinned. Golden layout: paragraphs separated by one blank line, the four list items directly under the first paragraph, no trailing newline.

### T-002 — Precondition check

- **Covers:** AC-001 (each precondition alone), AC-007, AC-008 (P-5), AC-013
- **Files:** `src/core/agentStart/preconditions.ts`, `src/core/agentStart/preconditions.test.ts`,
  `src/core/agentStart/testing/startWorld.ts`, `test/fixtures/fs110-start-ready/**`
- **Do:** `checkPreconditions(deps, stem)` → `{ entry?, provider?, failures: PreconditionFailure[] }`,
  failures in ID order, each `{ id: 'P-1' … 'P-8', … }` with the §6.1 parameters: P-1 `{ kind:
  'transition', refusal }` · `{ kind: 'no-entry' }` · `{ kind: 'several', keys }`; P-2 `{ missing:
  string[] }`; P-3 `{ configured: string | undefined }`; P-4 `{ result, reason?, hint? }` from
  `service.checkAvailability`, skipped when P-3 fails; P-5 `{ runId, stem }`, skipped when runs are
  not readable; P-6 `{ state, reason }`; P-7; P-8 `{ stem }` against
  `/^\d{4}-[a-z0-9]+(?:-[a-z0-9]+)*$/`. Deps: model source, read-only file system, setting port,
  0009 registry and service, run source, session state, trust. `startWorld.ts` builds them over the
  new fixture, the real 0009 service with the fake provider, an in-memory store and fake trust.
  Tests: each precondition failing alone (ID and parameters), the two skips, several at once
  (AC-001's example: P-1 with R-4 and P-5 with `r-7`), each of the three P-2 paths missing.
- **Verify:** `npx vitest run src/core/agentStart/preconditions` then the per-step gates
- [x] **Verified (T-002):** 2026-11-17 — red: `npx vitest run src/core/agentStart/preconditions` with the `Not implemented` stub: 20 of 20 failed (`Error: Not implemented`). Green: 20 of 20 pass (each of P-1 transition/no-entry/several, P-2 each path and all three, P-3, P-4 four results and the 15 s timeout, P-5 for all four open statuses, P-6 both states, P-7, P-8 eight bad stems, the two skips, several at once in ID order). Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 126 files, 1638 tests green.
- **Notes:** Reasons are flat objects (`{ id: 'P-1', kind: 'transition', refusal, text }`), not nested, a service refusal on P-4 is mapped to result `unknown`. P-2 is skipped when there is no model (no root to look under; P-1 already fails). `startWorld.ts` wraps 0011's `createWorld` (real store, session double, real 0009 service, fake provider, controlled adapter) so T-003/T-004 and the end-to-end test reuse it.

### T-003 — Start flow: hand-off, refusal, confirmation, cancel

- **Covers:** AC-001, AC-002 (content), AC-003, AC-009, AC-014
- **Do:** `src/shared/protocol/agentStart.ts`: `AgentStartView = { checking?: {number}, confirmation?:
  {token, spec: {number, title, stem}, provider: {id, displayName}, model?, permissionMode,
  disclosure?, missing: ('approvals' | 'userInput')[], previousRun, prompt, starting: boolean},
  refusal?: {number?, items}, notice?: {runId, errorClass} }` with strict guard and contract test.
  `src/core/ports/agentStart.ts`: `StartOrchestratorPort` (`start(request)`, `previousRun(stem)`),
  `AgentStartRequest = {providerId, model?, spec: {stem, path}, prompt, projectRoot}`,
  `AgentStartUiPort { reveal(): void }`. `src/core/agentStart/startFlow.ts`: `handOff(request)`
  resolves at once; checking → refusal (no confirmation, no orchestrator call, no store write) or
  confirmation (items of §6.2, prompt from T-001, previous run from the port); `cancel(token)`,
  `panelHidden()`, project-root change → Cancel; every hand-off while one is checked, confirmed
  or waiting → refusal `pending`, the confirmation stays; `dismiss('refusal' | 'notice')`;
  `view()`, `onDidChangeView`. Fake orchestrator with recorder in `testing/fakeOrchestrator.ts`.
  Tests: refusal path calls neither `start` nor a store write (recorder, store run count); every
  §6.2 item present, `missing` for the minimal fake profile; Cancel, hide and project change send
  nothing; second hand-off refused `pending`; after an ended run a new hand-off confirms again.
- **Verify:** `npx vitest run src/core/agentStart src/shared/protocol/agentStart` then the per-step gates
- [x] **Verified (T-003):** 2026-11-17 — red: `npx vitest run src/core/agentStart/startFlow src/shared/protocol/agentStart` with the `Not implemented` stubs (flow and guard): 26 of 26 failed (`Error: Not implemented`). Green: 52 of 52 in `src/core/agentStart` and the contract (26 new: hand-off resolves at once, checking line, every §6.2 item incl. disclosure/model/missing/previous run, refusal lists P-1 and P-5 with nothing called or stored, every P-id reaches the view, Cancel/hide/stale token/project change, pending during check and while confirming, new hand-off after Cancel and after an ended run, JSON round trip through the strict guard). Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 128 files, 1664 tests green.
- **Notes:** Contract refusal items are a typed union (`RefusalItem`) instead of free `items`; texts follow in T-005. `run` in 0011's refusal is `{ runId, stem }` (0011's names), not `{ id, stem }`. `StartOrchestratorPort.previousRun` returns `none | run | not-available` like 0011's `PreviousRun`. Hand-off with the project root changing also clears an open notice (it belongs to the old project's runs). AC-014's test here covers the precondition side (an ended run no longer refuses); the start→ended→confirm-again path is added in T-004.

### T-004 — Start flow: Start, start request, 0011's answer, start failure

- **Covers:** AC-004, AC-005, AC-008 (0011's refusal), AC-010 (core), AC-011, AC-012
- **Files:** `src/core/agentStart/startFlow.ts`, `src/core/agentStart/startFlow.start.test.ts`,
  `src/core/agentStart/noWrite.test.ts`
- **Do:** `confirm(token)`: stale token ignored; `starting` set; preconditions again; refusal on a
  failure or `outdated` when provider ID, model or permission mode differ from the confirmation;
  else exactly one `start` with the §8 values (model `undefined` when the provider reports none).
  Answer: run ID → the confirmation closes and the run is watched through the run source until it
  leaves `Starting`; `Starting` → `Failed` sets `notice {runId, errorClass}`, no new request; a
  0011 refusal → `refusal` with its text and run, no notice. Tests: each outdated cause; request
  values equal the shown ones; 0011's open-run refusal names run and stem; the
  `runtime_missing` example; the fake provider's `calls()` hold only `checkAvailability` and the
  orchestrator recorder only `start`/`previousRun` (AC-011, the request has no permission field).
  `noWrite.test.ts`: a temp copy of `fs110-start-ready` over the Node adapters, every scenario of
  §13 run, `snapshotTree` equal before and after.
- **Verify:** `npx vitest run src/core/agentStart` then the per-step gates
- [x] **Verified (T-004):** 2026-11-17 — red: `npx vitest run src/core/agentStart/startFlow.start` with `confirm` and the binding as `Not implemented` stubs: 18 of 18 failed; `orchestratorBinding` + `agentStart.endToEnd`: 9 of 9 failed (`Error: Not implemented`). Green: `npx vitest run src/core/agentStart` 7 files, 77 tests pass (each outdated cause with a no-change negative control, request values equal the shown ones and no `model` key when the provider reports none, stale/duplicate Start ignored, 0011's open-run refusal names run and stem, Starting→Failed notice (also already Failed at the answer, none for Running→Failed, none after a project change), the fake provider's calls hold only `checkAvailability`, request keys carry no permission field, `noWrite.test.ts` tree equal with an intruder-file negative control, import scan). End to end (`agentStart.endToEnd.test.ts`): the board's `requestMove(Ready→Active)` hands off, readiness check, confirmation, Start, run `Starting→Running→Completed` in the store with `session.started` … `run.completed` events, one provider start with the confirmed prompt. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 132 files, 1693 tests green.
- **Notes:** Deviation for testability: the orchestrator binding is the pure function `src/core/agentStart/orchestratorBinding.ts:bindOrchestrator(orchestrator, rootToPath)` (core, tested) instead of inline code in `extension.ts`; T-007 only passes the URI-to-path function. The fake provider's failure scenarios run a prelude first, so `Starting`→`Failed` is produced in the end-to-end test with the controlled adapter (`run.failed` `runtime_missing` before `session.started`). Added `importScan.test.ts` (core purity, copy of 0011's scan). `noWrite.test.ts` was green on its first run (preserved property); its negative control writes an intruder file.

### T-005 — Panel lines: checking, refusal, start-failure notice

- **Covers:** AC-001 (shown), AC-008 (shown), AC-010 (Open run), AC-013 (shown)
- **Files:** `src/shared/protocol/messages.ts`, `src/shared/protocol/messages.test.ts`,
  `src/webview/client.ts`, `src/webview/App.tsx`, `src/webview/agentStart/texts.ts`,
  `src/webview/agentStart/StartLines.tsx`, `src/webview/agentStart/StartLines.test.tsx`,
  `src/webview/main.css`, `src/adapters/vscode/studioPanel.ts` (handler entries only)
- **Do:** event `agentStart {view}` and requests `agentStartConfirm {token}`, `agentStartCancel
  {token}`, `agentStartDismiss {which}` with guards; `studioPanel.ts` maps them onto an optional
  `agentStart` dependency (absent → no-op) so `RequestHandlers` stays complete; the client keeps
  the last valid view. The texts
  of *Research* as functions of the structured items; `StartLines` above the area: checking line
  (`role="status"`), refusal with one line per item and Dismiss, notice with "Open run" sending
  `navigate {area: 'agentCenter', target: {kind: 'run', id}}` and Dismiss (`role="alert"`). Tests:
  one line per item, IDs visible, Open run's navigation payload, Dismiss request, invalid view
  ignored.
- **Verify:** `npx vitest run src/webview/agentStart src/shared/protocol` then the per-step gates
- [x] **Verified (T-005):** 2026-11-17 — red: `npx vitest run src/shared/protocol src/webview/client src/webview/agentStart src/core/agentStart/agentStartRequests src/core/shell` with `Not implemented` stubs (three guards, three client methods, texts, `StartLines` rendering nothing, handlers): 14 failed, 180 passed (`Error: Not implemented` and missing elements). Green: same command plus `src/adapters`: 651 pass (new: guards and request registry, client keeps last valid view and ignores invalid ones, sends confirm/cancel/dismiss, one line per refusal item with ID visible, P-2 one line per path, Open run sends `navigate {area: 'agentCenter', target: {kind: 'run', id}}`, Dismiss requests, empty view removes the lines). Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 135 files, 1709 tests green.
- **Notes:** Added `src/core/agentStart/agentStartRequests.ts` (handlers from the flow, tested) and `src/webview/agentStart/useAgentStart.ts` (hook over the client context); `studioPanel.ts` has only the optional `agentStart` dependency and the three handler entries, the push and re-send on `hello` follow in T-007. The existing test `boardFilter.test.ts` 'every board request has a guard' lists all request types; its list gained the three new ones (an enumeration, not a behaviour change). `src/core/shell/messageRouter.test.ts` handler set gained three entries for the same reason. Refusal lines use `role="alert"`, the checking line `role="status"`.

### T-006 — Confirmation dialog

- **Covers:** AC-002 (shown, collapsed, not editable), AC-003 (Escape), AC-006 (same text shown)
- **Do:** `src/webview/agentStart/StartDialog.tsx` with test: `role="dialog"`, `aria-modal`,
  `aria-labelledby` on the title; focus on Cancel at open (least destructive, APG), Tab wraps,
  Escape = Cancel, focus back to the opener; the §6.2 items; prompt in a `<pre>` behind a toggle
  button with `aria-expanded` and `aria-controls`, hidden until expanded; no `input`, `textarea` or
  `contenteditable`; Start disabled while `starting`. Mounted by `App.tsx`; CSS with theme
  variables only (0013 guard). Tests: collapsed then expanded, the shown prompt equals the view's
  text, Start and Cancel send their token, Escape cancels, no editable element, the bundle test
  mounts it from a fixture view.
- **Verify:** `npx vitest run src/webview src/adapters/node/webviewCss` then the per-step gates
- [x] **Verified (T-006):** 2026-11-17 — red: `npx vitest run src/webview/agentStart/StartDialog` with `StartDialog` rendering nothing and the three texts as `Not implemented`: 10 of 11 failed (the eleventh, no dialog without a confirmation, was green at once; the other ten are its negative control). Green: `npx vitest run src/webview/agentStart src/adapters/node` 133 pass (modal dialog labelled by its title, every §6.2 item, model fallback, disclosure, one line per missing capability and none otherwise, prompt collapsed with `aria-expanded`/`aria-controls`, hidden until expanded, text equals the view's prompt, no input/textarea/contenteditable, focus on Cancel and back to the opener, Tab and Shift+Tab wrap, Escape and Cancel send the token, Start disabled while starting). Bundle: `webviewBundle.test.ts` mounts the dialog and the lines from a fixture view without a start-up error; CSS guard (theme variables only) green. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` full run green. Manual M-2 stays open for Gregor.
- **Notes:** The bundle test was green on its first run (integration over code that existed); its negative control is the other bundle tests, which fail on a start-up error. Escape does not send Cancel while the start is running (the host ignores it anyway). Backdrop colour is `--vscode-widget-shadow` (theme variable, no literal).

### T-007 — Setting, panel and extension wiring

- **Covers:** AC-003 (panel closed or hidden), AC-005 (wired), FR-04, spec §17 (0007's refusal replaced)
- **Do:** `package.json`: `featherspec-studio.defaultProvider` (string, default `copilot`, scope
  `window`, description names `fake` for trying). `src/adapters/vscode/providerSettings.ts` gains
  its `SettingPort`. Manifest test: default `copilot`; 0009's assertion narrowed to "no property
  defaults to `fake`" (Notes: deviation from plan 0009 T-008, per 0009 AC-012). `studioPanel.ts`:
  push `agentStart`, re-send on `hello`, handlers, `onDidChangeViewState` (not visible) and dispose
  → `panelHidden()`. `src/extension.ts`: flow with real ports, `moves` gets `{ start: (r) =>
  flow.handOff(r) }`, the orchestrator binding (0011's start and summary; root → `fsPath`),
  `reveal` → `panel.show()`, `StudioApi.agentStart()` (`view`, `handOff`, `cancel`, `whenIdle`).
  Host smoke `src/test/agentStart.smoke.test.ts`: hand-off of `0001-tip-splitter`
  (`fs110-de-active-review`) is refused with P-1 and P-2, no run is created, the tree is unchanged;
  waits up to 60 s and reports what it awaited and the last view on timeout; Mocha timeout 120 s.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-007):** 2026-11-17 — red: `npx vitest run src/adapters/vscode/manifest` after adding the 0008 manifest tests, before `package.json`: 2 of 19 failed (`expected undefined to be 'string'`, `expected [] to deeply equal ['featherspec-studio.defaultProvider']`). Green after the setting: 19 of 19. The wiring (`providerSettings.ts`, `studioPanel.ts`, `extension.ts`) has no unit test (VS Code API); it is covered by tsc, eslint, `npm run compile` and by the end-to-end unit test of T-004 over the same flow, binding and fakes. Host smoke `src/test/agentStart.smoke.test.ts` written, compiled and linted, not run here (CI only). Gates: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npx tsc --noEmit -p src/webview` clean, `npm run test:unit` 136 files, 1723 tests green, `npm run compile` finished.
- **Notes:** Deviation from plan 0009 T-008 (approved by Gregor 2026-11-17): the manifest assertion is narrowed from 'no property defaults to a PROVIDER_IDS id' to 'no property defaults to fake'; recorded in 0009's plan T-008 Notes. The host smoke asserts that P-1 and P-2 are among the refusal items (P-3 is also there on a host without a registered copilot provider). `panelHidden` is also called on panel dispose and on extension dispose; `StudioApi.agentStart()` has `view`, `handOff(stem, key)`, `cancel`, `whenIdle`; `StudioApi.whenIdle` awaits the flow too. The flow reveals the panel through `studio?.show()`.

### T-008 — Docs sync and final gates

- **Covers:** AC-001 … AC-014
- **Do:** README: "Starting an agent" (the confirmation, the default-provider setting, P-1…P-8 in
  one line each). `AGENTS.md` snapshot — add module `'src/core/agentStart — agent start workflow:
  start prompt, run-start preconditions, start flow behind the board hand-off (spec 0008)'`;
  extend the `src/core/ports` entry with "agent start ports (orchestrator start, UI reveal)"; the
  `src/webview` entry with "agent start dialog and lines"; the `src/shared` entry with "agent start
  view" and spec 0008. `systemPatterns.md`: flow state in the host, narrow orchestrator port bound
  in the composition root, URI → path at the binding. `techContext.md`: agent start tests, fixture
  `fs110-start-ready`, host smoke file. `activeContext.md`. Then every gate.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-008):** 2026-11-17 — doc-only step plus the final gates, run after the last edit: `npx eslint src --max-warnings 0` 0 warnings, `npx tsc --noEmit` and `npx tsc --noEmit -p src/webview` clean, `npm run test:unit` 136 files, 1723 tests passed, `npm run compile` finished. Synced: README (*Starting an agent*, P-1…P-8, Commands, Providers, Spec Board paragraph), `AGENTS.md` snapshot (module `src/core/agentStart`, ports, webview, shared entries; plan-named entries, so the plan's approval is the confirmation), `systemPatterns.md`, `techContext.md`, `activeContext.md`. `npm test` (host suite, incl. `src/test/agentStart.smoke.test.ts`) not run: CI or Gregor's machine.
- **Notes:** `AGENTS.md` is 228 lines, over its 200-line target as before (the open eviction proposal in `activeContext.md` stands). The dialog's M-2 check stays with Gregor.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002, T-003, T-005 | src/core/agentStart/startFlow.ts:handOff, src/core/agentStart/refusalItems.ts, src/webview/agentStart/StartLines.tsx, texts.ts | startFlow.test.ts (refusal), preconditions.test.ts, StartLines.test.tsx | verified |
| AC-002 | T-003, T-006 | src/core/agentStart/startFlow.ts:check, src/webview/agentStart/StartDialog.tsx | startFlow.test.ts (confirmation items), StartDialog.test.tsx | verified |
| AC-003 | T-003, T-006, T-007 | src/core/agentStart/startFlow.ts:cancel, panelHidden, src/adapters/vscode/studioPanel.ts (view state, dispose), StartDialog.tsx (Escape) | startFlow.test.ts (cancel, hide, project change), StartDialog.test.tsx | verified |
| AC-004 | T-004 | src/core/agentStart/startFlow.ts:doStart | src/core/agentStart/startFlow.start.test.ts (AC-004) | verified |
| AC-005 | T-004, T-007 | src/core/agentStart/startFlow.ts:doStart, orchestratorBinding.ts, src/extension.ts (wiring) | startFlow.start.test.ts (AC-005), agentStart.endToEnd.test.ts, src/test/agentStart.smoke.test.ts (CI) | verified |
| AC-006 | T-001, T-006 | src/core/agentStart/startPrompt.ts:buildStartPrompt, src/webview/agentStart/StartDialog.tsx | startPrompt.test.ts (golden), StartDialog.test.tsx (same text shown) | verified |
| AC-007 | T-002 | src/core/agentStart/preconditions.ts:checkPreconditions | src/core/agentStart/preconditions.test.ts (P-2) | verified |
| AC-008 | T-002, T-004, T-005 | src/core/agentStart/preconditions.ts (P-5), startFlow.ts:doStart, src/webview/agentStart/StartLines.tsx | preconditions.test.ts (P-5), startFlow.start.test.ts (AC-008), StartLines.test.tsx | verified |
| AC-009 | T-003 | src/core/agentStart/startFlow.ts:handOff (pending), confirm | startFlow.test.ts, startFlow.start.test.ts (pending while starting) | verified |
| AC-010 | T-004, T-005 | src/core/agentStart/startFlow.ts:watchRun, src/webview/agentStart/StartLines.tsx (Open run) | startFlow.start.test.ts (AC-010), agentStart.endToEnd.test.ts, StartLines.test.tsx | verified |
| AC-011 | T-004 | src/core/agentStart/startFlow.ts (request without permission field) | startFlow.start.test.ts (AC-011) | verified |
| AC-012 | T-004 | src/core/agentStart/startFlow.ts (no file API) | src/core/agentStart/noWrite.test.ts | verified |
| AC-013 | T-002, T-005 | src/core/agentStart/preconditions.ts (P-6), src/webview/agentStart/texts.ts | preconditions.test.ts (P-6), StartLines.test.tsx | verified |
| AC-014 | T-003 | src/core/agentStart/startFlow.ts:handOff | src/core/agentStart/startFlow.test.ts (ended run) | verified |
| M-2 | T-006 | src/webview/agentStart/StartDialog.tsx, StartLines.tsx | manual: Gregor, keyboard and screen reader | built |

## Session handoff

- **Done so far:** All eight steps (T-001 to T-008) built and verified; plan Done. Every acceptance criterion has a recorded unit-level run; the host smoke `src/test/agentStart.smoke.test.ts` and manual M-2 (dialog, refusal and notice by keyboard and screen reader) are open; M-1 is accepted with 0010.
- **Next action:** Gregor reviews the tests per stage (lists in the session report), accepts M-2; then `/sdd-compile` in a fresh session (another model family) and `/sdd-lifecycle` to done. Not done here on purpose.
- **Open decisions:** the narrowed 0009 manifest assertion (T-007, 0009's plan to be amended the FeatherSpec way); OP-010 taken by the spec's recommendation (Gregor, 2026-11-17).
- **Baseline:** 3b3ab8b (before T-001).
- **Environment:** `npm test` cannot run here; it runs on CI or Gregor's Windows machine. Steps are run test-first through a `Not implemented` stub; one commit per step.
