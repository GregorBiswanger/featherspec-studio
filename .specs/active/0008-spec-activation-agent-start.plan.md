# Plan — Spec Activation & Agent Start Workflow

**Spec:** [0008-spec-activation-agent-start.md](0008-spec-activation-agent-start.md)
**Status:** In Progress
**Last updated:** 2026-11-17
**Current step:** T-002

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
- Specs read: [plan 0009](../active/0009-agent-provider-abstraction.plan.md) *Surface*,
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
- [ ] **Verified (T-002):** —
- **Notes:** —

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
- [ ] **Verified (T-003):** —
- **Notes:** —

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
- [ ] **Verified (T-004):** —
- **Notes:** —

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
- [ ] **Verified (T-005):** —
- **Notes:** —

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
- [ ] **Verified (T-006):** —
- **Notes:** —

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
- [ ] **Verified (T-007):** —
- **Notes:** —

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
- [ ] **Verified (T-008):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002, T-003, T-005 | — | — | open |
| AC-002 | T-003, T-006 | — | — | open |
| AC-003 | T-003, T-006, T-007 | — | — | open |
| AC-004 | T-004 | — | — | open |
| AC-005 | T-004, T-007 | — | — | open |
| AC-006 | T-001, T-006 | — | — | open |
| AC-007 | T-002 | — | — | open |
| AC-008 | T-002, T-004, T-005 | — | — | open |
| AC-009 | T-003 | — | — | open |
| AC-010 | T-004, T-005 | — | — | open |
| AC-011 | T-004 | — | — | open |
| AC-012 | T-004 | — | — | open |
| AC-013 | T-002, T-005 | — | — | open |
| AC-014 | T-003 | — | — | open |
| M-2 | T-006 | — | manual: Gregor, keyboard and screen reader | open |

## Session handoff

- **Done so far:** plan written; spec open points resolved by their recommendations (spec §16).
- **Next action:** Gregor reviews the plan; implementation after 0009 and 0011 (order 0009 → 0011 → 0008 → 0012).
- **Open decisions:** OP-010 (main session); the narrowed 0009 manifest assertion (T-007).
- **Baseline:** 3b3ab8b (before T-001).
- **Environment:** `npm test` cannot run here; it runs on CI or Gregor's Windows machine.
