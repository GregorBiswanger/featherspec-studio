# Plan — Focus the Studio on Visibility: No Agent Runs, a Named Next Step

**Spec:** [0015-focus-on-visibility.md](0015-focus-on-visibility.md)
**Status:** In Progress
**Last updated:** 2026-11-17
**Current step:** T-010

## Approach

Build the new behaviour first behind the seams that exist: the next step is one pure rule
function in `src/core/board` that feeds the detail view and the move result, and the copy goes
through a host clipboard port as 0014's "Copy merge prompt" does. Then the views lose their run
parts, the composition root and the manifest drop the run features, the dead modules are deleted,
and only then is the runtime store narrowed in place to the spec status history — when the
lifecycle model is its last consumer. Specs, docs, the snapshot and the Memory Bank close the plan.
The implementation touches `.memory-bank/techContext.md`, `systemPatterns.md`, `projectbrief.md`
and `activeContext.md` (T-015).

Two deliberate deviations from the order in Gregor's request of 2026-11-17, both forced by
"green after every step": (1) the store is narrowed in place after the deletions (T-010), not
built as a second store before them — a second store would duplicate about 250 lines of the
proven writer-lock, truncation and age-cap code and need a generic session for one stage, while
in place it is mostly a deletion; the earlier-data removal is still built first (T-004).
(2) The three-area change (T-009) follows the deletion, because the start workflow and the
orchestrator reference the area `agentCenter` and the `run` navigation target.

Ask-first: every deletion is named in its step's **Deletes:** line. Gregor delegated the
decision (PD-055); the implementer still names the list once at the start of each stage and
waits for the yes. `npm uninstall @github/copilot-sdk` (T-012) is approved by Gregor
(2026-11-17), nothing else is installed.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (steps that touch
wiring, adapters, `src/extension.ts`, `package.json` or the bundle) · `npm run package` (T-012,
T-015). Pre-done gate on Windows and CI: `npm test`.

## Research

- **Survey (2026-11-17, at 778e073):**
  - Run data reaches the views through `src/core/board/{runs,boardService,detail}.ts`,
    `src/core/missionControl/{runFigures,runSource,activity,attention}.ts`; the status history
    through `RuntimeStore.appendSpecStatusEntry`/`readSpecStatusHistory` and
    `src/core/lifecycle/{statusHistory,lifecycleService}.ts`. Nothing else reads the store.
  - Coupling: `src/core/agentStart/orchestratorBinding.ts`, `src/core/orchestrator/orchestrator.ts`,
    `src/webview/agentStart/useAgentStart.ts` and `src/shared/protocol/agentStart.ts` name the area
    `agentCenter` or the `run` navigation target; `src/core/agentStart/agentStart.endToEnd.test.ts`
    drives `createMoves` with a start port; `core/agentCenter` imports `SpecRef` and `specRefs`
    from Mission Control (both stay). `runSource.ts` is shared by Mission Control and the start
    workflow.
  - `tsc --noEmit` compiles `src/test/**`: a host test that uses a removed `StudioApi` member goes
    in the same step as the member. `tsc -p src/webview` compiles dead webview files too.
  - `studioPanel.ts` takes `agentCenter?` as optional; `parseUiMemory` already falls back to the
    default area for an unknown area ID (AC-002 holds by code; a test pins it).
  - 0002 reports both kinds of duplicate as `kind: 'duplicate'` with two reason texts
    (`reference … also exists in …`, `number … also used by …`, `readProject.ts`). NS-2 and NS-11
    are decided from the model facts (same reference in two folders · same number, other slug),
    not from the reason text. `StepItem.ticked` is `boolean | 'undetermined'`; NS-7 treats
    `'undetermined'` as not ticked (spec OP-007 f).
  - `judgeTransition` accepts only Ready → Active (`src/core/lifecycle/transitions.ts`); the
    command path shows move results through `createMoveResultSink` as an information message
    (`src/adapters/vscode/boardPicks.ts`); the drop result there gets a "Copy" button.
  - Store layout: `<globalStorage>/featherspec-studio/projects/<sha256-16>/` with `store.json`,
    `lock.json`, `index.json`, `runs/`, `spec-status-history.jsonl`
    (`src/adapters/node/fileRuntimeMedium.ts`); the Copilot home is
    `<globalStorage>/copilot-home` (`src/extension.ts`).
  - Inventory additions not in the request: `src/core/ports/{agentCenter,agentProvider,agentStart,orchestrator}.ts`,
    `StartWorkflowPort` in `ports/board.ts`, `CredentialValuesPort` in `ports/runtimeMedium.ts`,
    `src/core/runtime/{masking.ts,testing/secretSamples.ts}` and `docs/security/secret-patterns.md`,
    `src/webview/ui/RunStatusChip.tsx`, `src/webview/areas/missionControl/RunSection.tsx`,
    `src/shared/protocol/testing/agentCenterSample.ts`, fixture `test/fixtures/fs110-start-ready`,
    the golden-file line in `.gitattributes`, the provider groups in `eslint.config.mjs`, the 0012
    block of `src/adapters/node/webviewCss.test.ts`, the 0010 and 0004-follow-up tests of
    `src/adapters/node/extensionBundle.test.ts`, the robot icon in `src/core/shell/treeModel.ts`
    and `src/webview/board/icons.tsx`, `handedOffText`/`AGENT_START_UNAVAILABLE_TEXT` in
    `src/shared/protocol/texts.ts`, the run parts of `src/test/{missionControl,runtime,shell,board}.smoke.test.ts`.
  - Lockfile: `@github/copilot-sdk` 1.0.34 brings `koffi` 3.3.6, `lossless-json`, `vscode-jsonrpc`,
    `zod` and eight `@github/copilot-sdk-<platform>` packages; nothing else in `src` needs `koffi`,
    so the esbuild externals become `['vscode']`.
  - Spec revised before planning (2026-11-17): PD-057 applied — Output line on removal (§6.3,
    AC-023), ADR-001/ADR-002 notes (AC-025), M-1 checks of the S7 note and the paths (AC-030),
    OP-001…OP-006 marked resolved.
- [FeatherSpec 1.10.0 command files](../../.claude/commands/sdd-plan.md) (local) — "start T-001"
  and "implement" are start signals, Mode B resumes, Mode C re-plans: basis of NS-5…NS-10, read 2026-11-17.
- [npm uninstall](https://docs.npmjs.com/cli/v11/commands/npm-uninstall) — removes the package
  from `devDependencies` and updates `package-lock.json` (save defaults to true), retrieved 2026-11-17.
- [VS Code API: env.clipboard, window.showInformationMessage](https://code.visualstudio.com/api/references/vscode-api#Clipboard)
  — the system clipboard; message items are buttons, the promise resolves to the chosen item or
  `undefined`, retrieved 2026-11-17. `clipboard.writeText` is already used in `src/adapters/vscode/setupUi.ts`.
- [VS Code 1.146](https://code.visualstudio.com/updates/v1_146), [VS Code 1.144](https://code.visualstudio.com/updates/v1_144)
  — native agent sessions, no extension API to observe them (spec §4), retrieved by the orchestrator 2026-11-17.

## Stages

1. T-001 → T-002 → T-003 — the next step in the detail and on the drop
2. T-004 ‖ T-005 — independent: earlier-data removal module (new files only); board and detail without runs
3. T-006 → T-007 → T-008 → T-009 — Mission Control without runs, wiring cut, dead modules deleted, three areas
4. T-010 → T-011 → T-012 — status-history store, earlier-data removal at activation, dependencies and scans
5. T-013 → T-014 → T-015 — specs, docs, architecture, Memory Bank, test-title audit, final gates

Parallel: stage 2 — T-004 touches only its new files under `src/core/runtime`, `src/core/ports`
and `src/adapters/node`; T-005 only board, detail and the board protocol (+ its wiring line in
`src/extension.ts`). No other stage: the rest shares `src/extension.ts`, the protocol or the manifest.

## Steps

### T-001 — Derive the next step from the lifecycle model

- **Covers:** AC-004, AC-003 (rule output)
- **Do:** new pure `src/core/board/nextStep.ts`: `nextStep(model, key)` → `{ rule, lines: [{ text, label? }] } | { rule, text }`
  for NS-1…NS-11 in the spec's order (NS-11 below NS-2); paths project-relative with `/`; NS-7 picks
  the first step in plan order neither ticked nor struck (`'undetermined'` counts as not ticked).
  Test-first in `src/core/board/nextStep.test.ts`: one memory fixture per rule (exact rule ID and
  lines; the AC-004 example verbatim), determinism (same snapshot twice → equal output), negative
  controls for the order (a Done spec with a duplicate → NS-2; a Ready spec without open step → `Implement <plan path>`).
- **Verify:** `npx vitest run --project node src/core/board/nextStep.test.ts`, then the per-step gates 1–4
- [x] **Verified (T-001):** 2026-11-17 — red: `npx vitest run --project node src/core/board/nextStep.test.ts` 18 failed (`Not implemented` stub); green: 18 passed (NS-1…NS-11, AC-004 example, order controls, determinism); gates 1–4: eslint, both tsc clean, test:unit 2521 passed + 11 timing.
- **Notes:** —

### T-002 — Show "Next step" in the detail and copy a line

- **Covers:** AC-003, AC-005, AC-007, AC-008, AC-009
- **Do:** `DetailView` (`src/shared/protocol/detail.ts`) gets `nextStep`, filled by
  `src/core/board/detail.ts` from T-001; new request `copyText { text }` and event `copyResult`
  in `src/shared/protocol/messages.ts`; `ClipboardPort` in `src/core/ports/board.ts`, handled in
  `src/core/board/boardRequests.ts` (writes exactly the text; failure → "Could not copy to the
  clipboard."); adapter `src/adapters/vscode/clipboard.ts` (`vscode.env.clipboard.writeText`),
  routed in `studioPanel.ts`, injected in `src/extension.ts`; webview `src/webview/detail/NextStep.tsx`
  above the sections in `SpecDetail.tsx` (heading "Next step", "Copy" per line, labels "Then:" /
  "Then, after a READY verdict:", status "Copied to the clipboard." in the live region); texts in
  `src/shared/protocol/texts.ts`. No trust or writer check on this path (AC-008).
  Tests: `detail.test.ts` (next step in the view; same in Restricted Mode and a reader window),
  `boardRequests.test.ts` (exact text, failure text, nothing else changes), `messages.test.ts`
  (guards), `SpecDetail.test.tsx` (pointer, Tab+Enter, Tab+Space, announcement, labels),
  `SpecDetail.timing.test.tsx` (model-changed → new line within 500 ms).
- **Verify:** the new tests red then green; gates 1–5
- [x] **Verified (T-002):** 2026-11-17 — red: 21 new/affected tests failed on missing behaviour (no copyText handler or guard, no nextStep in the view, no Next step section, timing test); green: boardRequests, detail, messages, SpecDetail (+ timing) and boardFilter guard list pass; gates 1–5: eslint, both tsc, compile clean, test:unit 2536 passed + 12 timing.
- **Notes:** —

### T-003 — An accepted Ready → Active request starts nothing

- **Covers:** AC-006, AC-008
- **Do:** `src/core/board/moves.ts` loses the `start` dependency; an accepted request returns
  `{ kind: 'nextStep', number, line }` (NS-7) and changes nothing; `MoveResult` in
  `src/shared/protocol/board.ts` replaces `handedOff`; `src/webview/board/Announcer.tsx` shows and
  announces the §8 drop result with "Copy" (T-002's request); `boardPicks.ts` shows it as an
  information message with a "Copy" button; `texts.ts` drops `AGENT_START_UNAVAILABLE_TEXT` and
  `handedOffText`; `src/extension.ts` stops passing `start` (the start flow stays built, unreached,
  until T-007). Tests: `moves.test.ts` (accepted → next-step result, card stays Ready, every refusal
  unchanged, Restricted Mode and reader alike), `src/core/board/noWrite.test.ts` (an accepted drop
  writes no file), `SpecBoard.test.tsx`/`Keyboard.test.tsx` (announcement and Copy),
  `src/test/board.smoke.test.ts` (expects the next-step result).
- **Deletes:** `src/core/agentStart/agentStart.endToEnd.test.ts` (decides 0008 criteria only, drives the removed start port)
- **Verify:** the new tests red then green; gates 1–5
- [x] **Verified (T-003):** 2026-11-17 — red: with the old moves.ts, board.ts, Announcer.tsx restored, 7 tests failed (moves, noWrite, boardFilter guard, Keyboard drop result); green after the change: moves, noWrite, guards, Keyboard (announcement, Copy by pointer, Enter, Space) pass; endToEnd test deleted with the start port; gates 1–5 clean, test:unit 2532 passed + 12 timing. Notes: src/test/board.smoke.test.ts is unchanged: its spec is in Review so the refusal it expects still holds; no host-test fixture has a Ready spec (CI would need a new fixture, not added).
- **Notes:** —

### T-004 — Remove the run data of earlier builds (module, not wired)

- **Covers:** AC-023, AC-024
- **Files:** `src/core/ports/earlierRunData.ts`, `src/core/runtime/earlierRunData.ts`,
  `src/core/runtime/earlierRunData.test.ts`, `src/adapters/node/earlierRunDataFiles.ts`,
  `src/adapters/node/earlierRunDataFiles.test.ts`
- **Do:** core `removeEarlierRunData({ files, state, output })`: removes `copilot-home/`; in every
  `featherspec-studio/projects/<id>/` `index.json`, `index.json.tmp-*` and `runs/` — unless its
  `store.json` names a version other than `FORMAT_VERSION`; clears the workspace-state key
  `featherspec-studio.agentCenter`; a path already gone counts as removed; never touches
  `store.json`, `lock.json`, `spec-status-history.jsonl` or anything outside the global storage;
  location unavailable → nothing. One Output line naming what was removed (none when nothing),
  one line per path that failed with path and reason (PD-057). Node adapter on `fs.rm`/`readdir`.
  Tests: core on a fake port (every path, gone paths, version-99 folder untouched, failing path
  kept and reported, second run retries), adapter on real temp directories (byte-identical kept files).
- **Verify:** `npx vitest run src/core/runtime/earlierRunData.test.ts src/adapters/node/earlierRunDataFiles.test.ts` red then green; gates 1–4
- [x] **Verified (T-004):** 2026-11-17 — red: core test 10 failed on the `Not implemented` stub, adapter test failed with module not found; green: `npx vitest run src/core/runtime/earlierRunData.test.ts src/adapters/node/earlierRunDataFiles.test.ts` 14 passed; gates 1–4 clean, test:unit 2546 passed + 12 timing. Notes: Output lines use OutputPort.appendBlock with one line; a path already gone is not named in the line (nothing removed, nothing to name); a missing, unreadable or broken store.json does not protect a folder — confirm at the test review.
- **Notes:** a missing or unreadable `store.json` does not protect a folder (it names no version) — reading of §6.3, confirm at the test review.

### T-005 — Board and detail without runs

- **Covers:** AC-011, AC-012
- **Files:** `src/core/board/{boardService,cards,filters,detail}.ts` and their tests, `src/core/board/testing/*`,
  `src/shared/protocol/{board,boardFilter,detail}.ts` and tests, `src/webview/board/{Card,FilterBar}.tsx`,
  `src/webview/detail/SpecDetail.tsx`, `src/webview/board/*.test.tsx`, `src/webview/detail/*.test.tsx`,
  `src/webview/detail/testing/views.ts`, `src/webview/testing/dom.tsx`, `src/extension.ts` (board deps only), `src/test/board.smoke.test.ts`
- **Do:** the card loses its run line, the filter its provider kind and "No run" (encoding keeps
  `states` and `set`), `boardService` its `session` dependency, the detail section becomes
  "Status history" with 0003's history and *not available* with the reason.
- **Deletes:** `src/core/board/runs.ts`, `src/core/board/runs.test.ts`
- **Verify:** changed tests red then green; gates 1–5
- [x] **Verified (T-005):** 2026-11-17 — red: with the previous source files restored, 57 tests failed (board service, detail, filters, guards, SpecBoard, SpecDetail); green after the change: 2526 passed + 12 timing; gates 1–5 (eslint, both tsc, test:unit, compile) clean. runs.ts and runs.test.ts deleted; tests of the provider filter, run line and run list deleted with their behaviour. Notes: `run()` stays in src/core/board/testing/boardWorld.ts until T-006/T-008 delete its last consumers (agentCenter and missionControl tests); the keyboard filter test now asserts exactly 8 controls (6 states, sort, Clear).
- **Notes:** —

### T-006 — Mission Control without runs; product texts

- **Covers:** AC-010, AC-026 (S7 note, Mission Control purpose)
- **Do:** `missionControlService` loses `session` and the run figures; *Needs attention* keeps
  Blocked, Diagnostic, Review pending (`attention.ts`); *Recent activity* takes status history
  entries only, "not available" with the reason when the history is not (`activity.ts`); the
  `missionControl` protocol and `src/webview/areas/missionControl/*` lose runs and the `run`
  drill target; `areas.ts` purpose and `RESTRICTED_TEXT` per §8; `src/extension.ts` MC deps;
  `src/test/missionControl.smoke.test.ts` follows a spec file only. Tests updated with the AC IDs.
- **Deletes:** `src/core/missionControl/{runFigures.ts,runFigures.test.ts}`, `src/core/missionControl/testing/runs.ts`,
  `src/webview/areas/missionControl/RunSection.tsx`
- **Verify:** changed tests red then green; gates 1–5
- [x] **Verified (T-006):** 2026-11-17 — red: with the old sources restored the rewritten attention, activity, service, protocol, section and drill-down tests and the new AC-026 literal test failed; green after the change: 2493 passed + 3 skipped, 12 timing; gates 1–5 (eslint, both tsc, test:unit, compile) clean. runFigures, testing/runs and RunSection deleted with their tests. Notes: RunStatusWord stays exported until T-008 (agentStart imports it); the Restricted Mode text in docs/release-checklist.md was updated here, the rest of the docs follow in T-014.
- **Notes:** —

### T-007 — Cut the run features out of the composition root and the manifest

- **Covers:** AC-014 (stop, resume, clear), AC-015, AC-016, AC-022
- **Do:** `src/extension.ts` no longer builds the Copilot and fake providers, provider setup,
  orchestrator, run commands, start flow, run source, Agent Center service and request notifier;
  `StudioApi` drops `providers`, `orchestrator`, `agentStart`, `agentCenter`; `deactivate` drops
  the orchestrator; the store is opened with empty credentials and the fixed 90 days until T-010;
  `studioPanel.ts` gets no `agentCenter`/`agentStart` deps. `package.json`: no `clearRunHistory`,
  `stopRun`, `resumeRun`, no configuration, description and keywords per §8 (`openAgentCenter`
  stays until T-009). `manifest.test.ts`: AC-014–AC-016 tests with negative controls; manifest
  tests of voided criteria removed. `runtime.smoke.test.ts` stops expecting `clearRunHistory`.
  `.vscode-test.mjs` stays as it is (its globs name no removed file).
- **Deletes:** `src/test/{agentCenter,agentStart,copilot,orchestrator,providers}.smoke.test.ts` (incl. the opt-in Copilot runner)
- **Verify:** gates 1–5; `node -e "const p=require('./package.json');process.exit(p.contributes.configuration?1:0)"`
- [x] **Verified (T-007):** 2026-11-17 — red: with the previous package.json restored the three new manifest tests (AC-014, AC-015, AC-016) failed; green after the change: 2483 passed + 3 skipped, 12 timing; gates 1–5 clean; the configuration probe exits 0. The five smoke tests named in Deletes are removed. Notes: extensionBundle.test.ts lost its three SDK/koffi tests (the bundle no longer reaches the SDK once extension.ts stops importing it); esbuild externals stay as they are until T-012; the AC-014 check for openAgentCenter and 'Agent' titles follows with T-009.
- **Notes:** —

### T-008 — Delete the dead run modules

- **Covers:** AC-021 (folders, partly)
- **Do:** pure deletion plus the edits that keep the tree compiling: `src/webview/App.tsx` and
  `client.ts` drop the start dialog and lines; `ports/board.ts` drops `StartWorkflowPort`;
  `eslint.config.mjs` drops the provider groups; `.gitattributes` drops the golden-file line;
  `webviewBundle.test.ts` drops the 0008 mount test.
- **Deletes:** `src/core/{agentCenter,agentStart,orchestrator,providers}/`, `src/adapters/providers/`,
  `src/webview/agentStart/`, `src/shared/protocol/{agentStart.ts,agentStart.test.ts}`,
  `src/core/ports/{agentCenter,agentProvider,agentStart,orchestrator}.ts`,
  `src/adapters/vscode/{agentCenterMemory,agentCenterUi,copilotSettings,orchestratorUi,providerSettings,runtimeSettings}.ts`,
  `src/core/missionControl/{runSource.ts,runSource.test.ts}`, `test/fixtures/copilot/`, `test/fixtures/fs110-start-ready/`
- **Verify:** gates 1–5; `ls src/core/agentCenter src/core/agentStart src/core/orchestrator src/core/providers src/adapters/providers src/webview/agentStart test/fixtures/copilot` fails for each
- [x] **Verified (T-008):** 2026-11-17 — pure deletion, so no red run; the ls check fails for every named folder (No such file or directory); gates 1–5 clean: 1852 passed + 3 skipped, 12 timing (the count drop is the deleted tests of removed behaviour). Notes: .gitattributes keeps the *.golden.txt line because src/core/setup/mergePrompt.golden.txt (0014) still needs LF on Windows; src/core/missionControl/testing/runtimeWorld.ts (dead helper of runSource) deleted too; RunStatusWord and run() in boardWorld.ts removed; the agentStart protocol (messages.ts, client.ts, studioPanel.ts) removed with its guards and tests; the Agent Center protocol and webview area stay until T-009.
- **Notes:** —

### T-009 — Three areas

- **Covers:** AC-001, AC-002, AC-014 (`openAgentCenter`), AC-021 (folders, rest)
- **Do:** `AREA_IDS`/`AREAS` (`src/shared/protocol/areas.ts`), `AREA_COMMANDS`, tree icons
  (`treeModel.ts`), `icons.tsx`, `registry.tsx`, `client.ts`, `studioPanel.ts` (Agent Center events
  and `ac*` handlers), `messages.ts` (`ac*` requests, `run` target), `main.css` (Agent Center
  block), `package.json` (`openAgentCenter`); tests: shell, tree, router, manifest, App, areas,
  states, client, messages, bundle ("three areas", Agent Center mount removed), CSS guard, `shell.smoke`.
  New AC-002 tests: remembered area `agentCenter` (`uiMemory.test.ts`) and restored panel state
  (`panelState.test.ts`) → Mission Control, no error.
- **Deletes:** `src/webview/areas/agentCenter/`, `src/shared/protocol/{agentCenter,agentCenterDuration,agentCenterTexts}.ts` and tests,
  `src/shared/protocol/testing/agentCenterSample.ts`, `src/webview/ui/RunStatusChip.tsx`
- **Verify:** AC-002 tests red then green; gates 1–5
- [x] **Verified (T-009):** 2026-11-17 — red: with the previous areas.ts restored 7 tests failed (the new AC-002 tests for a remembered area agentCenter in uiMemory and shellService, the three-area list and guard tests in messages.test, the tree model tests); green after the change: 1796 passed + 3 skipped, 12 timing; gates 1–5 clean. Agent Center webview area, protocol, RunStatusChip, the ac* requests, the run navigation target, openAgentCenter and its command, the Agent Center, start-dialog and run-status CSS were removed. Notes: a remembered area agentCenter is rejected as a whole by parseUiMemory, so the defaults apply (Mission Control, no selection) — the plan's 'restored panel state' has no area to restore, the panel adopts the service view; panelState.test.ts needed no change.
- **Notes:** —

### T-010 — Narrow the runtime store to the status history

- **Covers:** AC-013, AC-026 (reader reason); keeps 0004 AC-001, AC-009, AC-012, AC-016–AC-018, AC-020, AC-021, AC-023–AC-026 as amended
- **Do:** in place: `runtimeStore.ts` keeps state, writer lock with heartbeat and takeover,
  `store.json`, newer-version refusal, cut-off-record tolerance, append/read of the history and
  the fixed 90-day age cap; runs, events, index, masking, size cap, `clear`, `onDidChangeRuns`,
  `credentials` and `maxAgeDays` go. `model.ts`, `records.ts`, `notices.ts` (reader reason per §8,
  "status history" wording) and `runtimeSession.ts` (no `clearRunHistory`, no confirm UI) shrink;
  `runtimeUi.ts` keeps `warn`. Contract suite (`testing/contract.ts`, `contractFaults.ts`,
  `contractWriter.ts`): run-based tests rewritten on history appends where their criterion stays,
  plus AC-013 (an `afterEach` lists the store folder after every scenario: only the three files),
  on the memory, faulty, slow and file media. `runtime.smoke.test.ts` appends a status entry and
  checks the workspace is unchanged. `extensionBundle.test.ts` drops the secret-sample test.
- **Deletes:** `src/core/runtime/{masking.ts,masking.test.ts}`, `src/core/runtime/testing/{contractEvents,contractRuns,contractRunChanges,contractMasking,secretSamples}.ts` (history tests of `contractMasking` move to `contract.ts` with their titles)
- **Verify:** AC-013 test red then green; gates 1–5
- [ ] **Verified (T-010):** —
- **Notes:** riskiest step: the history depends on the same lock, truncation and age-cap code that loses its run paths.

### T-011 — Remove earlier run data at every activation

- **Covers:** AC-023, AC-024
- **Do:** `src/extension.ts` calls T-004's removal before `session.start()` in every window, with
  the resolved storage location, the workspace state and the Output channel. End-to-end test
  `src/adapters/node/earlierRunData.endToEnd.test.ts`: a generated global storage shaped like the
  tag build (runs, index, tmp copies, `copilot-home/`, a version-99 folder) → removal, then the
  narrowed store over the file medium and Mission Control's activity: only the three files remain,
  version-99 folder byte-identical, *Recent activity* shows the kept entries (AC-023 example).
- **Verify:** end-to-end test red (removal not called) then green; gates 1–5
- [ ] **Verified (T-011):** —
- **Notes:** —

### T-012 — Dependency, bundle and source scans

- **Covers:** AC-017, AC-018, AC-019, AC-020, AC-021 (search), AC-022 (scan)
- **Do:** `npm uninstall @github/copilot-sdk` (approved; changes `package.json` and
  `package-lock.json` only); `esbuild.js` externals `['vscode']`; `extensionBundle.test.ts`:
  AC-017 (manifest and lockfile without the SDK, externals `vscode` only), AC-018 (production host
  bundle without `child_process` and `@github/copilot-sdk`, webview bundle without "Agent Center"),
  koffi tests removed; new `src/adapters/node/sourceScan.test.ts`: AC-019, AC-020 (only
  `fetchReleaseHttp.ts` and the probe in `src/webview/main.tsx`), AC-021 (term list, named
  exceptions), AC-022 (host suite file names), each with a negative control on a planted sample.
- **Verify:** gates 1–5; `npm run package`; `grep -c child_process dist/extension.js` → 0
- [ ] **Verified (T-012):** —
- **Notes:** —

### T-013 — Retire 0008–0012 and amend 0003–0007, 0013

- **Covers:** AC-028
- **Do:** per `/sdd-lifecycle` *Deprecated*: 0008–0012 get `**Status:** Deprecated`, stay in
  `done/`, link `0015-focus-on-visibility.md` as successor and get a dated abandonment line in
  `## Plan history`; archived plans untouched. 0003–0007 and 0013 get the catch-all note at the
  head and the inline "*Amended by 0015 (PD-055/PD-056): …*" notes of §5 by ID. 0014 untouched.
- **Verify:** `grep -l "^\*\*Status:\*\* Deprecated" .specs/done/001[0-2]*.md .specs/done/000[89]*.md | wc -l` → 5;
  `grep -L "Amended by 0015" .specs/done/000[3-7]*.md .specs/done/0013*.md` → empty; `git diff --stat .specs/plan-archive .specs/active` → empty
- [ ] **Verified (T-013):** —
- **Notes:** —

### T-014 — Product docs

- **Covers:** AC-025, AC-030 (checklist item)
- **Do:** `README.md`: opening and second paragraph per §8, feature tour with three areas and
  the next step (image links to the three existing screenshot paths — the orchestrator retakes them
  with its preview harness), sections "Agent Center", "Starting an agent", provider settings and
  Copilot privacy/requirement lines removed, *Settings* removed, *Privacy and stored data* per
  §6.3. `docs/runtime-data.md`: status history, earlier-data removal, deletion by hand.
  `docs/release-checklist.md`: sections 0008, 0010, 0011, 0012 removed, 0015 M-1 (AC-030) added.
  ADR-003 status *Superseded (PD-055)*; ADR-001 item 14 and ADR-002 "superseded in part by 0015
  (PD-055)". `CHANGELOG.md` entry. Docs scan test `src/adapters/node/docsScan.test.ts` (AC-025, negative control).
- **Deletes:** `docs/agent-provider-port.md`, `docs/security/secret-patterns.md`, `media/screenshots/agent-center-dark.png`
- **Verify:** docs scan red then green; gates 1–4
- [ ] **Verified (T-014):** —
- **Notes:** —

### T-015 — Architecture, Memory Bank, test-title audit, final gates

- **Covers:** AC-027, AC-029; re-proves AC-001–AC-026, AC-028
- **Do:** `/sdd-architecture-update`; the snapshot in `AGENTS.md` changes exactly these entries
  (it shrinks): `style` (no "agent providers"); `modules` core line (runtime 0004 "status history
  only", board 0007 "+ next step 0015", no 0008/0009/0011/0012), adapters line (no `providers/`,
  "earlier run data removal" in node/), webview line (no Agent Center, no agent start; "detail with
  next step"), `src/test` line (no recorded Copilot stream); `shared` line (no agent start, Agent
  Center, timeline views; 0015 added); first boundary "never import vscode" (no provider SDKs);
  `last reconciled` date. `.architecture/{core,adapters,webview}.md` likewise. Memory Bank:
  `projectbrief.md` mission with the §8 description and the AC-030 scenario as success criterion;
  `systemPatterns.md` run, provider, orchestrator, Agent Center and start decisions replaced by one
  dated PD-055 line, "separate lifecycles" → two dimensions; `techContext.md` stack (no SDK, no
  koffi), host test list, test sections of 0008–0012 removed, runtime store line;
  `activeContext.md`. AC-027: a throw-away script outside the repo extracts the
  `it`/`test`/`describe` titles at `archive/agent-runs-2026-11-17` and at the head; every title
  missing at the head is listed in this plan under `## Test-title audit` with its voided criterion
  or the replacing head title.
- **Verify:** gates 1–5; `npm run package`; `wc -l AGENTS.md` below 215; `grep -ciE "provider|agent run|agentCenter|orchestrator" .architecture/*.md .memory-bank/projectbrief.md` → 0 each
- [ ] **Verified (T-015):** —
- **Notes:** `npm test` on Windows and CI is the pre-done gate (AC-027) before `/sdd-compile`.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-009 | src/shared/protocol/areas.ts, src/adapters/vscode/commands.ts, src/core/shell/treeModel.ts | src/shared/protocol/messages.test.ts, src/core/shell/treeModel.test.ts, src/webview/App.test.tsx, src/adapters/node/webviewBundle.test.ts | verified |
| AC-002 | T-009 | src/core/shell/uiMemory.ts, src/shared/protocol/areas.ts | src/core/shell/uiMemory.test.ts, src/core/shell/shellService.navigation.test.ts, src/shared/protocol/messages.test.ts | verified |
| AC-003 | T-001, T-002 | src/core/board/nextStep.ts, src/core/board/detail.ts, src/webview/detail/NextStep.tsx | src/core/board/detail.test.ts, src/webview/detail/SpecDetail.test.tsx | verified |
| AC-004 | T-001 | src/core/board/nextStep.ts | src/core/board/nextStep.test.ts | verified |
| AC-005 | T-002 | src/core/board/boardRequests.ts, src/adapters/vscode/clipboard.ts, src/webview/detail/NextStep.tsx | src/core/board/boardRequests.test.ts, src/webview/detail/SpecDetail.test.tsx | verified |
| AC-006 | T-003 | src/core/board/moves.ts, src/webview/board/Announcer.tsx, src/adapters/vscode/boardPicks.ts | src/core/board/moves.test.ts, src/core/board/noWrite.test.ts, src/webview/board/Keyboard.test.tsx | verified |
| AC-007 | T-002 | src/webview/detail/SpecDetail.tsx | src/webview/detail/SpecDetail.timing.test.tsx | verified |
| AC-008 | T-002, T-003 | src/core/board/boardRequests.ts, src/core/board/moves.ts | src/core/board/boardRequests.test.ts, src/core/board/moves.test.ts | verified |
| AC-009 | T-002 | src/core/board/boardRequests.ts | src/core/board/boardRequests.test.ts, src/webview/detail/SpecDetail.test.tsx | verified |
| AC-010 | T-006 | src/core/missionControl/missionControlView.ts, src/core/missionControl/attention.ts, src/core/missionControl/activity.ts, src/webview/areas/missionControl/ | src/core/missionControl/*.test.ts, src/webview/areas/missionControl/Sections.test.tsx, src/webview/areas/missionControl/Drilldown.test.tsx | verified |
| AC-011 | T-005 | src/core/board/cards.ts, src/core/board/filters.ts, src/webview/board/FilterBar.tsx | src/core/board/boardService.test.ts, src/core/board/filters.test.ts, src/webview/board/SpecBoard.test.tsx, src/shared/protocol/boardFilter.test.ts | verified |
| AC-012 | T-005 | src/core/board/detail.ts, src/webview/detail/SpecDetail.tsx | src/core/board/detail.test.ts, src/core/board/boardService.test.ts, src/webview/detail/SpecDetail.test.tsx | verified |
| AC-013 | T-010 | — | — | open |
| AC-014 | T-007, T-009 | package.json, src/extension.ts | src/adapters/vscode/manifest.test.ts, src/test/runtime.smoke.test.ts (host) | verified |
| AC-015 | T-007 | package.json | src/adapters/vscode/manifest.test.ts | verified |
| AC-016 | T-007 | package.json | src/adapters/vscode/manifest.test.ts | verified |
| AC-017 | T-012 | — | — | open |
| AC-018 | T-012 | — | — | open |
| AC-019 | T-012 | — | — | open |
| AC-020 | T-012 | — | — | open |
| AC-021 | T-008, T-009, T-012 | the folders named in the criterion are deleted | gates; scan test follows in T-012 | built |
| AC-022 | T-007, T-012 | src/extension.ts (no child_process, no provider wiring) | scan test follows in T-012 | built |
| AC-023 | T-004, T-011 | src/core/runtime/earlierRunData.ts, src/adapters/node/earlierRunDataFiles.ts (not wired until T-011) | src/core/runtime/earlierRunData.test.ts, src/adapters/node/earlierRunDataFiles.test.ts | built |
| AC-024 | T-004, T-011 | src/core/runtime/earlierRunData.ts (not wired until T-011) | src/core/runtime/earlierRunData.test.ts, src/adapters/node/earlierRunDataFiles.test.ts | built |
| AC-025 | T-014 | — | — | open |
| AC-026 | T-006, T-010 | src/shared/protocol/areas.ts, src/shared/protocol/texts.ts | src/shared/protocol/messages.test.ts, src/webview/PanelStateView.test.tsx (reader reason follows in T-010) | built |
| AC-027 | T-015 | — | — | open |
| AC-028 | T-013 | — | — | open |
| AC-029 | T-015 | — | — | open |
| AC-030 | T-014, T-015 | — | manual: Gregor, M-1 on `tip-splitter` | open |

## Session handoff

- **Done so far:** Stages 1 to 3 (T-001…T-009): next step, copy, drop result; earlier-data removal module (not wired); board and detail without runs; Mission Control without runs; run wiring, manifest entries and dead modules removed; three areas.
- **Next action:** T-010 (status-history store), then T-011, T-012.
- **Open decisions:** — (Gregor approved the changed order and `npm uninstall @github/copilot-sdk`; the parallel stage runs in sequence; deletions listed per step are approved.)
- **Baseline:** ea4a8bd
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked); host suites run on Windows and CI. Gates: `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`.
