# Plan — Focus the Studio on Visibility: No Agent Runs, a Named Next Step

**Spec:** [0015-focus-on-visibility.md](0015-focus-on-visibility.md)
**Status:** Done
**Last updated:** 2026-11-17
**Current step:** — (all steps verified)

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
- [x] **Verified (T-010):** 2026-11-17 — red: with a stray index.json written at activation the new AC-013 afterEach and test failed in every contract scenario (memory, slow, file media) and the check restored passes: 56 passed in runtimeStore.test.ts; green after the change: 1639 passed + 3 skipped, 12 timing; gates 1–5 clean. The store keeps state, writer lock with heartbeat and takeover, store.json, newer-version refusal, cut-off-record tolerance and the history append/read with the fixed 90-day cap; runs, events, index, masking, size cap, clear, run listeners, credentials and maxAgeDays are gone. Notes: AC-013 runs as an afterEach of every contract scenario (memory, slow-memory and file-system media; the faulty medium wraps all of them); reader reason asserted literally in runtimeSession.test.ts; runtimeSession lost clearRunHistory and its ui dependency; contractMasking history tests moved to contract.ts (registerHistoryContract) with their titles; run-based contract tests were deleted with their module, the lock, retention, newer-version, cut-off-record and state tests were rewritten on history appends; the AC-006 lifecycle test about a run, the masking test of fileRuntimeMedium.test.ts and the secret-sample test of extensionBundle.test.ts were deleted with their behaviour.
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
- [x] **Verified (T-011):** 2026-11-17 — red: with the removal made a no-op the end-to-end test failed (the tag-build data stayed), and with the call in extension.ts turned into an unawaited void the order check failed; green after the change: 1643 passed + 3 skipped, 12 timing; gates 1–5 clean. Notes: src/extension.ts awaits removeEarlierRunData (global storage, workspace state key via the new src/adapters/vscode/earlierRunDataState.ts, Output channel) before session.start(), in every window; the end-to-end test builds a tag-build storage (runs, index, tmp copy, copilot-home, a version-99 folder, the state key), runs the removal, opens the narrowed store on the file medium (lock, history, store.json while open; history and store.json after close), reads Recent activity through createStatusHistory and projectActivity (the kept entry shows), and checks the version-99 folder byte-identical; the wiring itself is only proven by the source-order check here, the host run on Windows and CI shows it live.
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
- [x] **Verified (T-012):** 2026-11-17 — red: with the previous package.json, package-lock.json and esbuild.js restored the new AC-017 test and the AC-021 term scan failed; green after the change: 1658 passed + 3 skipped, 12 timing; gates 1–5 clean; npm run package builds, and grep -c child_process dist/extension.js → 0, copilot-sdk → 0, 'Agent Center' in dist/webview/main.js → 0. Notes: npm uninstall @github/copilot-sdk removed the SDK and its per-platform and koffi packages from both files; npm also added the root version and license fields to the lockfile header (from package.json); new src/adapters/node/sourceScan.test.ts decides AC-019, AC-020, AC-021 (folders, term list, named exceptions that must each still name a term) and AC-022 with negative controls; the AC-018 bundle checks live in extensionBundle.test.ts (production host bundle built in memory) and webviewBundle.test.ts; the test fixture sample 'copilot' in boardFilter.test.ts became 'some-agent' and the spec stem '0011-orchestrator' in the contract files became '0011-example' so no exception is needed for them.
- **Notes:** —

### T-013 — Retire 0008–0012 and amend 0003–0007, 0013

- **Covers:** AC-028
- **Do:** per `/sdd-lifecycle` *Deprecated*: 0008–0012 get `**Status:** Deprecated`, stay in
  `done/`, link `0015-focus-on-visibility.md` as successor and get a dated abandonment line in
  `## Plan history`; archived plans untouched. 0003–0007 and 0013 get the catch-all note at the
  head and the inline "*Amended by 0015 (PD-055/PD-056): …*" notes of §5 by ID. 0014 untouched.
- **Verify:** `grep -l "^\*\*Status:\*\* Deprecated" .specs/done/001[0-2]*.md .specs/done/000[89]*.md | wc -l` → 5;
  `grep -L "Amended by 0015" .specs/done/000[3-7]*.md .specs/done/0013*.md` → empty; `git diff --stat .specs/plan-archive .specs/active` → empty
- [x] **Verified (T-013):** 2026-11-17 — no code change, so no red run; verify commands: Deprecated count → 5; grep -L 'Amended by 0015' over 0003–0007 and 0013 → empty; git diff --stat .specs/plan-archive → empty; gates 1–5 clean (1658 passed + 3 skipped, 12 timing). Notes: 0008–0012 carry **Status:** Deprecated, a **Successor:** link to 0015-focus-on-visibility.md (the form 0003's successor reader parses; the link resolves once 0015 moves to done/) and a dated abandonment line in ## Plan history; 0003–0007 and 0013 carry the catch-all note after the header and one inline note per row of 0015 §5 at its heading, requirement or criterion (table rows: a note after the table that names the row ID); 0014 untouched.
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
- [x] **Verified (T-014):** 2026-11-17 — red: docsScan.test.ts failed on release-checklist, runtime-data, deleted files and ADR notes before the rewrite; green after: 7 docs-scan tests (with negative control), sourceScan allow-list extended by docsScan.test.ts; gates 1–4 and compile clean. README, runtime-data, release-checklist rewritten, ADR-001/002/003 notes, CHANGELOG entry, three files deleted. AC-030 checklist item M-1 added (Gregor).
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
- [x] **Verified (T-015):** 2026-11-17 — AGENTS.md snapshot 214 lines (below 215), `.architecture/*.md` and `projectbrief.md` grep for provider|agent run|agentCenter|orchestrator → 0 each, Memory Bank updated, test-title audit written (957 missing titles: 820 with deleted modules, 137 in staying files, each with reason). Final gates: eslint, both tsc, `npm run test:unit` (1665 + 3 skipped in the node/webview projects, 12 timing), compile, compile-tests, package all clean.
- **Notes:** `npm test` on Windows and CI is the pre-done gate (AC-027) before `/sdd-compile`.

### T-016 — Compile fix D1: one status-history folder per project root (0004 AC-009)

- **Covers:** AC-027 (0004 AC-009 stays decided by a test); compile report 2026-11-17 D1
- **Do:** move the store opening of `src/extension.ts` (folder per root, lower-case key on Windows, unavailable medium) into `createProjectStoreOpener` in `src/adapters/node/fileRuntimeMedium.ts`, so the composition root passes no root of its own; tests in `src/adapters/node/fileRuntimeMedium.test.ts` (keys, root A vs B, Windows case) and a contract test for every medium in `src/core/runtime/testing/contract.ts`.
- **Verify:** gates 1–5; the report's mutant K2 (key replaced by a constant) red
- [x] **Verified (T-016):** 2026-11-17 — red: with a `Not implemented` stub the three opener tests failed; green after: 1673 passed + 3 skipped, 12 timing; gates 1–5 clean. Mutants, each red: K2 (`projectStoreDirectory(storage.path, 'x')` in the opener) → 2 tests × (root A vs B, Windows case); no Windows case folding → 1 ×; `projectStoreDirectory` ignoring its key → 4 × (key test, opener test, Windows test, and the new contract test on the file medium).
- **Notes:** the composition root no longer names `projectRoot`, so K2 can no longer be made in `src/extension.ts`; it lives in the tested opener.

### T-017 — Compile fix D2: restore the board filter and sort tests (0007 AC-011, AC-012, AC-022, AC-023)

- **Covers:** AC-027 (staying 0007 behaviour keeps its tests), AC-011; compile report 2026-11-17 D2
- **Do:** restore the block `board service: filters and sort` of `src/core/board/boardService.test.ts` from tag `archive/agent-runs-2026-11-17` (it uses state and named-set filters only, so it needs no change for the board without runs).
- **Verify:** gates 1–5; every surviving `boardUiState.ts` mutant of the report red
- [x] **Verified (T-017):** 2026-11-17 — the 8 restored tests pass at the head (preserved behaviour); red against each mutant of `src/core/board/boardUiState.ts` in a full unit run: B1 (`panelClosed` keeps the filter) → × AC-023 closed panel; B2 (project change keeps the filter) and B3 (project change resets the sort) → × AC-023 project change; B4 (Clear resets the sort) → × AC-012; B5 (closed panel keeps the focus) → × focused key; also B6 (navigation filter merges) → × AC-022, B7 (closed panel keeps the sort) → × AC-023, B8 (focus not stored) → × focused key. Gates 1–5 clean: 1681 passed + 3 skipped, 12 timing.
- **Notes:** —

### T-018 — Compile fix D3: "Copy" in the "Move Spec to…" message says "Copied" or "Could not copy"

- **Covers:** AC-005, AC-006, AC-009 (command path); compile report 2026-11-17 D3
- **Do:** the move result outside the board becomes the core presenter `createMoveResultPresenter` in `src/core/board/moves.ts` (port `MoveMessagePort` in `src/core/ports/board.ts`); `copyLine` there gives the panel path (`src/core/board/boardRequests.ts`) and the command path the same texts; `src/adapters/vscode/boardPicks.ts` keeps only the thin `createMoveMessages`; `src/extension.ts` wires one clipboard into both. Tests in `src/core/board/moves.test.ts`.
- **Verify:** gates 1–5; the bug (copy without catch and without confirmation) red
- [x] **Verified (T-018):** 2026-11-17 — red: with `Not implemented` stubs all 5 new tests failed; with the presenter written as the old sink (write without catch, no confirmation) the AC-005 and AC-009 tests failed (2 ×); a `copyLine` mutant giving the success text on failure → 3 × (presenter AC-009, copyLine, boardRequests AC-009). Green after: 1686 passed + 3 skipped, 12 timing; gates 1–5 and compile-tests clean.
- **Notes:** product code changed (composition root, board adapter, core); the host suite has no test that clicks the information message's "Copy" — the decision now lives in the unit-tested core.

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
| AC-013 | T-010 | src/core/runtime/runtimeStore.ts | src/core/runtime/testing/contract.ts (afterEach on every medium), src/core/runtime/runtimeStore.test.ts, src/adapters/node/fileRuntimeMedium.test.ts | verified |
| AC-014 | T-007, T-009 | package.json, src/extension.ts | src/adapters/vscode/manifest.test.ts, src/test/runtime.smoke.test.ts (host) | verified |
| AC-015 | T-007 | package.json | src/adapters/vscode/manifest.test.ts | verified |
| AC-016 | T-007 | package.json | src/adapters/vscode/manifest.test.ts | verified |
| AC-017 | T-012 | package.json, package-lock.json, esbuild.js | src/adapters/node/extensionBundle.test.ts | verified |
| AC-018 | T-012 | esbuild.js | src/adapters/node/extensionBundle.test.ts, src/adapters/node/webviewBundle.test.ts | verified |
| AC-019 | T-012 | src | src/adapters/node/sourceScan.test.ts | verified |
| AC-020 | T-012 | src/adapters/node/fetchReleaseHttp.ts, src/webview/main.tsx | src/adapters/node/sourceScan.test.ts | verified |
| AC-021 | T-008, T-009, T-012 | the folders named in the criterion are deleted | src/adapters/node/sourceScan.test.ts | verified |
| AC-022 | T-007, T-012 | src/test (host suites), .vscode-test.mjs | src/adapters/node/sourceScan.test.ts | verified |
| AC-023 | T-004, T-011 | src/core/runtime/earlierRunData.ts, src/adapters/node/earlierRunDataFiles.ts, src/extension.ts | src/core/runtime/earlierRunData.test.ts, src/adapters/node/earlierRunDataFiles.test.ts, src/adapters/node/earlierRunData.endToEnd.test.ts | verified |
| AC-024 | T-004, T-011 | src/core/runtime/earlierRunData.ts, src/extension.ts | src/core/runtime/earlierRunData.test.ts, src/adapters/node/earlierRunData.endToEnd.test.ts | verified |
| AC-025 | T-014 | src/adapters/node/docsScan.test.ts | — | verified |
| AC-026 | T-006, T-010 | src/shared/protocol/areas.ts, src/shared/protocol/texts.ts, src/core/runtime/notices.ts | src/shared/protocol/messages.test.ts, src/webview/PanelStateView.test.tsx, src/core/runtime/runtimeSession.test.ts | verified |
| AC-027 | T-015 | ## Test-title audit in this plan | `npm test` (Windows, CI) is the pre-done gate, not run here | verified here, host suite pending |
| AC-028 | T-013 | .specs/done/0008–0012 (Deprecated), .specs/done/0003–0007 and 0013 (notes) | grep checks of T-013 | verified |
| AC-029 | T-015 | AGENTS.md (214 lines), .architecture/*.md, .memory-bank/*.md | grep check in T-015 Verify | verified |
| AC-030 | T-014, T-015 | — | manual: Gregor, M-1 on `tip-splitter` | open |

## Session handoff

- **Done so far:** All five stages (T-001…T-015); stages 1 to 4: next step, copy, drop result; board and detail without runs; Mission Control without runs; run wiring, manifest entries and dead modules removed; three areas; the status-history store; the earlier-data removal wired at activation; the SDK uninstalled, the bundle and source scans. Stage 5: specs retired and amended (T-013), product docs (T-014), architecture, Memory Bank, test-title audit and final gates (T-015).
- **Next action:** Gregor: AC-030 / M-1 on `tip-splitter`; `npm test` on Windows and CI; then `/sdd-compile` (not run here).
- **Open decisions:** — (Gregor approved the changed order and `npm uninstall @github/copilot-sdk`; the parallel stage runs in sequence; deletions listed per step are approved.)
- **Baseline:** ea4a8bd
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked); host suites run on Windows and CI. Gates: `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`.

## Test-title audit

AC-027. A throw-away script outside the repository (`/tmp/audit/titles.py`) extracted the `it`/`test`/`describe` title literals of all `src/**/*.test.ts(x)` at tag `archive/agent-runs-2026-11-17` (2470 distinct titles) and at the head (1680). 957 titles of the tag are missing at the head. Titles built by `%s` or `%j` are listed with their format text.

### Deleted with their module (820 titles, the whole test file is gone)

| Folder | Titles |
| --- | ---: |
| src/adapters/providers/copilot | 170 |
| src/adapters/providers/fake | 45 |
| src/core/agentCenter | 139 |
| src/core/agentStart | 93 |
| src/core/board | 6 |
| src/core/missionControl | 28 |
| src/core/orchestrator | 140 |
| src/core/providers | 86 |
| src/core/runtime | 5 |
| src/shared/protocol | 22 |
| src/test | 10 |
| src/webview/agentStart | 23 |
| src/webview/areas/agentCenter | 53 |

These belong to removed behaviour (providers, orchestrator, agent start, Agent Center, Copilot adapter, run store parts); their criteria are voided by spec 0015 §5 (PD-055).

### Missing from files that stay (137 titles)

**src/adapters/node/extensionBundle.test.ts** — voided with the SDK (AC-017/AC-018 replace them in the bundle scan)

- 0004 AC-013 follow-up: no secret sample reaches the bundle, so the package secret scan of vsce passes
- AC-005: the SDK JavaScript is part of the bundle
- AC-005: koffi stays an external of the bundle, never bundled
- AC-005: negative control, a bundle without the koffi external would pull the native package in or fail

**src/adapters/node/fileRuntimeMedium.test.ts** — run data and secret masking gone (0015 AC-010, AC-013 replace: status history only)

- AC-013: neither a sample token nor the credential is in the bytes the file medium wrote
- AC-016: no file or folder in a workspace changes while storing, restoring, clearing and failing

**src/adapters/node/randomIds.test.ts** — run IDs gone (spec 0015 §5)

- random run IDs
- AC-002: 10,000 runs across two projects, one cleared in between, never share an ID
- AC-002: negative control, a counter-based source repeats IDs across projects

**src/adapters/node/webviewBundle.test.ts** — areas reduced to three; Agent Center and start dialog gone (AC-001)

- starts without a runtime error, renders the frame with the four areas and the loading state, and says hello
- mounts Mission Control with a snapshot of a fixture project: header, six state counts, progress, the run section, the attention list, the ac
- 0008: mounts the start confirmation dialog and the start lines from a fixture view: modal dialog, prompt collapsed, no start-up error
- 0012: mounts the Agent Center with a fixture snapshot: run list, detail with the open request and the timeline, no start-up error

**src/adapters/node/webviewCss.test.ts** — Agent Center and run status styling gone (AC-001, AC-021)

- 0012 AC-029: the Agent Center stylesheet
- every run status has one rule that sets --fs-tint from its theme variable (open blue, waiting yellow, Completed green, Failed red, Cancelled
- control: a status the stylesheet does not know has no rule
- a run status chip tints icon and border only, keeps its text in the foreground colour and takes the contrast border in High Contrast
- the run rows, the answer controls and the actions set no outline of their own; the selected run row carries the High Contrast active border

**src/adapters/vscode/manifest.test.ts** — commands and settings of runs, providers, Copilot gone (AC-014, AC-015, AC-016 replace)

- AC-015, AC-016, 0004 AC-019: contributes the select, refresh and clear-history commands and no scaffold command
- 0004 AC-018: the run-history age cap is a user setting, whole days, minimum 1, default 90
- 0004 AC-018: negative control, the manifest declares no other run-history setting
- AC-012 (0009): the fake provider is off by default, a boolean with the default window scope
- AC-012 (0009): the scenario setting lists exactly the fake scenarios, each described, default happy path
- AC-012 (0009): no configuration property defaults to the fake provider, so the fake never ships as a default
- AC-012 (0009): negative control, the fake ID as a default would be found
- FR-04 (0008): the default provider is one string setting, window scope, shipped as the first provider copilot and never as fake, its descrip
- FR-04 (0008): negative control, the manifest declares exactly one default-provider setting
- AC-022 (0011): contributes "Stop Run" and "Resume Run" to the palette with their titles
- AC-002 (0010): the CLI path setting is a machine-scoped string with an empty default
- AC-008 (0010): the model setting is a window-scoped string with an empty default
- AC-002 (0010): negative control, the manifest declares exactly the two copilot settings
- AC-005 (0010): the Copilot SDK is a devDependency pinned exactly and no production dependency exists, so the VSIX carries only the bundle

**src/core/board/boardService.test.ts** — run notification and provider filters gone; the filter, sort and navigation tests stay under the same names without the run part (AC-007, AC-022 voided by 0015 §5)

- AC-007: a run notification updates the card; the store being unavailable shows "not available"
- AC-007: without a store every card reads "Runs: not available"
- AC-019: the service follows the store that the session holds now (re-subscribed when it changes)
- board service: filters and sort
- AC-022: a navigation filter replaces the filters set before and is shown as set
- AC-012: clear filters removes every filter and keeps the sort
- AC-023: filters and sort survive a rebuild of the model and a hidden panel
- AC-023: a closed panel resets filters and sort
- AC-023: a change of the project clears the filters and keeps the sort
- AC-011: the lifecycle model is unchanged by every filter and sort call
- a change notifies the listeners once; setting the same view again notifies nobody
- the focused key is remembered and cleared with the panel
- AC-027: a run notification updates the detail history; an unavailable store shows not available

**src/core/board/boardService.timing.test.ts** — run notification part voided

- a model notification and a run notification reach the view within 500 ms each (PD-047)
- a model notification and a run notification reach the detail of the selected spec within 500 ms each (PD-047)

**src/core/board/detail.test.ts** — detail without runs (AC-003, AC-027 of 0007 amended)

- AC-027: runs of the stem, newest created first, with flags and no events; the status history of the stem under its label
- AC-027: with the store unavailable both are not available

**src/core/board/filters.test.ts** — provider filter gone (0015 §5)

- AC-022: a state filter and a provider filter combine with AND; several values of one filter combine with OR
- AC-022: "No run" (null) matches a card with no run; a card whose runs are not available matches no provider value
- AC-022: a history-unreadable run still matches its provider

**src/core/board/moves.test.ts** — start workflow replaced by the next-step answer (AC-006 replaces)

- AC-015: an accepted Ready to Active move with no start workflow is refused with "Agent start is not available yet"
- AC-015: with a start workflow the stem is handed off, the result names the number, and the model is untouched

**src/core/lifecycle/lifecycleService.test.ts** — runs gone

- AC-006: a run of the spec that ends Completed does not change the model

**src/core/missionControl/activity.test.ts** — run sections and run reasons gone (0015 AC-001, §5; 0006 amended)

- BR-07: run entries show every status but Running (a change to Running is not shown)
- A-005: equal times — spec entries before run entries, then ascending spec number
- A-006: with the runs not available the list is "not available" with the store reason, even if the history is readable
- AC-011: only status changes appear — a run with events and an error text yields run status entries only, never the text
- AC-010: an unreadable run adds no entry (its history is a placeholder)
- an empty history and no runs give an available, empty list

**src/core/missionControl/attention.test.ts** — run sections and run reasons gone (0015 AC-001, §5; 0006 amended)

- AC-008: a Blocked spec with a failed latest run is one row with both reasons, in the order (a) to (e)
- AC-008: an Interrupted latest run gives "Run interrupted"; a waiting run gives "Waiting for you" (c)
- AC-008: a run whose stem matches no spec creates no row (PD-046)
- AC-008: a Done spec with a failed run has no row (the highlight ended with Done), and a Cancelled run adds nothing (negative control)
- AC-018: with the runs unavailable the list keeps reasons (a), (d) and (e) and says why the run reasons are missing

**src/core/missionControl/missionControlService.test.ts** — run sections and run reasons gone (0015 AC-001, §5; 0006 amended)

- AC-015: the first listener makes the service compute; the view has all five sections
- AC-015: a file change (a new model), a run change and a store state change each yield a new view without a reopen
- AC-006: a run that is created or changes status leaves the total and every state count unchanged; a spec state change leaves Running unchang
- AC-018: with the store unavailable the runs and the activity are "not available" with the reason, the spec figures and reasons (a), (d), (e)
- AC-011: events appended through the real store change nothing and cause no new view; a created run does
- A-011: with no listener the service reads nothing and subscribes to nothing; the last listener leaving stops it again
- a burst of notifications is coalesced: the sources are read at most once more after the running read
- AC-017: a model read at 10:00 shows 10:00 in a panel opened at 11:00, and reopening keeps it
- AC-017 (A-013): a spec read while open moves the time to the read; a processed run change moves it to the clock time of that change
- AC-017 (negative control): a change the dashboard did not process leaves the time alone
- createRunSource is the only way the service reaches runs: a session with a real store feeds it (integration of T-001)

**src/core/missionControl/missionControlService.timing.test.ts** — run sections and run reasons gone (0015 AC-001, §5; 0006 amended)

- AC-024: a project of 200 specs, 5 runs per spec and 1,000 history entries is projected within 1000 ms (PD-035)

**src/core/runtime/runtimeSession.test.ts** — Clear Run History command gone (AC-014)

- AC-019: Clear asks for confirmation, removes ended runs and the history, keeps open runs, and reports
- AC-019: declining removes nothing and says so
- AC-019: without an active project nothing is cleared and the developer is told
- AC-019, AC-023: in a reader window Clear says why it did nothing and asks nothing
- AC-019: a run that could not be removed is counted in the message

**src/core/shell/shellService.navigation.test.ts** — run target of navigate gone

- a run or board-filter target shows the area with the target in the view and changes no selection

**src/shared/protocol/boardFilter.test.ts** — run, agent start and Agent Center messages gone (AC-001, AC-005)

- AC-022: rejects %s

**src/shared/protocol/messages.test.ts** — run, agent start and Agent Center messages gone (AC-001, AC-005)

- navigate: an area with no target, or with a spec, run or board-filter target (PD-040)
- areas
- lists the four areas in order; all four have content in this version
- agent start requests and event (spec 0008)
- guards the token payload, the dismiss payload and the event payload
- registers the three request types with their guards

**src/shared/protocol/missionControl.test.ts** — run, agent start and Agent Center messages gone (AC-001, AC-005)

- AC-026: a view with an extra key anywhere is refused, so no run error text can reach the DOM
- a view with a wrong type or an unknown word is refused

**src/test/missionControl.smoke.test.ts** — host smoke parts about runs gone (AC-010)

- AC-015, AC-023: the view follows a spec file, a created run and a failed status without a reopen, and only the test\'s own file is written
- AC-006: the run notification does not move the spec counts, the view of the fixture project has the six states

**src/test/runtime.smoke.test.ts** — host smoke parts about runs gone (AC-010)

- 0004 AC-025: the store of the active project is writable, and the clear command is registered
- 0004 AC-016: storing a run and events leaves the workspace fixture unchanged

**src/test/shell.smoke.test.ts** — host smoke parts about runs gone (AC-010)

- AC-003, AC-029: the tree shows the project name and the six entries; every shell command is registered

**src/webview/App.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- lists Mission Control, Spec Board, Spec Explorer and Agent Center

**src/webview/areas/missionControl/Drilldown.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- AC-013: runs
- a highlighted run sends the Agent Center with the run ID, also for a vanished stem
- the Running figure sends the Agent Center without a target while two runs are counted
- the Running figure sends the run as target while exactly one run is counted
- OP-9: Running 0 still sends the Agent Center without a target
- with the runs, the activity and the progress not available the view holds no control for them

**src/webview/areas/missionControl/Sections.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- AC-005, AC-007, AC-027: the run section
- shows the Running figure and each highlighted run with number, title and the status as text
- lists a run of a vanished stem with its recorded stem, "spec not found" and the status
- a missing title reads "not available" (BR-09)
- an empty list keeps its heading and says so; Running 0 is shown as 0
- AC-027: unreadable runs are named with their count, singular and plural
- AC-008, AC-018: the attention list
- AC-018: with the runs unavailable the spec-based rows stay and one line gives the reason
- AC-018: runs not available
- shows "not available" with the reason in the run section, never Running 0 and never an empty list
- AC-021: every state, reason and status is text
- a view with an error text on a run is refused as a whole; the old view stays and the text is nowhere
- AC-028: zero specs keep the run section and the activity
- the message replaces counts, progress and the attention list; the header, runs and activity stay
- AC-007: the empty Agent runs and Recent activity panels each show an icon and 0006\'s sentence
- §3.2: Agent runs and Recent activity sit side by side in one panel row below the attention list

**src/webview/areas/missionControl/Sections.timing.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- renders runs, attention and activity within 1000 ms of the message event

**src/webview/board/Keyboard.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- announces the hand-off

**src/webview/board/SpecBoard.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- shows number, title, state text, description, figures, last change and run
- AC-007: the run %j reads %s
- the provider checkboxes offer "No run" (null) and the providers of the project

**src/webview/client.test.ts** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- agent start (spec 0008)
- keeps the last valid view and ignores an invalid one
- does not change the panel state when a view arrives
- sends confirm, cancel and dismiss as requests

**src/webview/detail/SpecDetail.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- is never offered for runs, status history or No plan yet
- AC-027: Agent history
- lists runs as delivered with provider, status, timestamps and flags, and the labelled status history
- shows not available for both while the store is unavailable
- shows a note for no runs

**src/webview/detail/SpecDetail.timing.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- renders the update fast enough: 120 requirements, 200 criteria, 150 steps, 100 runs

**src/webview/states.test.tsx** — four areas become three; run sections and agent history gone; Agent Center and agent start gone

- the Agent Center empty list

