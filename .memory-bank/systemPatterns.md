# System Patterns

## Architectural style

See the `architecture:` snapshot in `AGENTS.md` — the only home of structure facts. This file
holds the *why*: decisions and patterns.

## Key decisions
- Hexagonal architecture: a framework-free core (domain + application, no `vscode` import)
  behind ports; adapters for the VS Code host, storage, file system and agent providers; the
  webview is a separate UI bundle that talks to the host only through typed messages (in code since spec 0005) · 2026-11-16 ·
  [docs/product/po-handoff.md](../docs/product/po-handoff.md) §8 · provenance: human (sdd-setup)
- Two test gates: fast plain-Node unit tests after every implementation step; extension-host
  tests (`npm test`) only in CI and before done, because they launch a downloaded VS Code and
  cannot run everywhere · 2026-11-16 · provenance: human (sdd-setup)
- Existing FeatherSpec artifacts are the spec source of truth; the Studio must not create a
  parallel spec store or restructure files for board columns · 2026-11-16 ·
  [docs/product/po-handoff.md](../docs/product/po-handoff.md) §3 P2, §6.3
- Activation: `workspaceContains:AGENTS.md`, `workspaceContains:.specs` and `onWebviewPanel:featherspecStudio.main` (panel restore) plus Studio's own commands and views;
  no `onStartupFinished` (ADR-001 §8 stays). Live re-detection holds once Studio is active · 2026-11-16 ·
  [spec 0001](../.specs/done/0001-workspace-discovery-project-recognition.md) §15 (OP-005, Gregor)
- Unit tests sit next to the code and the Vitest config is `.mjs`, because `tsconfig.json` has
  `rootDir: src` and no `include`; `skipLibCheck` is on because vitest's `index.d.cts` fails
  `tsc` under Node16 · 2026-11-16 · [plan 0001](../.specs/plan-archive/0001-workspace-discovery-project-recognition.2026-11-17.plan.md) T-001
- Core reaches the host through small ports (`src/core/ports/host.ts`); the discovery controller is
  proven on fakes, the VS Code adapters hold no logic; the `vscode` import in `src/core/**` is
  banned by ESLint · 2026-11-16 · plan 0001 *Approach*
- Active-project notification: the discovery controller offers `onDidChangeActiveProject(listener)` (returns a
  `Disposable`); first result always, later only when root, version or legacy differ; no replay for late
  subscribers (they read `snapshot().active`); a throwing subscriber is isolated. Specs 0002 and 0004 consume it;
  no workaround in other modules · 2026-11-16 · spec 0001 AC-023, A-006 (Gregor, after `/sdd-compile`)
- Spec repository gets its own read-only port `SpecSourcePort` (list without following links, stat with mtime, read bytes) beside 0001's
  `ReadOnlyFileSystem`, which decodes without a UTF-8 check and reports neither mtime nor symbolic links; no write method exists, so BR-02
  holds by construction. Text is decoded strictly (UTF-8, BOM stripped) and normalised to LF once, parsers see one shape · 2026-11-16 ·
  [plan 0002](../.specs/plan-archive/0002-spec-repository-parser.2026-11-17.plan.md) *Approach*, T-001
- Spec model conventions: a field is `{ state: 'absent' }` or `{ state: 'empty' | 'placeholder' | 'value'; raw }` (nothing is defaulted); diagnostic
  kinds `unreadable-file · unknown-content · duplicate · orphan · dangling-link · unverified-version`, scope `{ file, line? }` or `'project'`, reasons in
  English; symbolic links are not followed (reported as unreadable); links leaving the project root are dangling and never touched · 2026-11-16 ·
  plan 0002 *Approach*, spec 0002 A-006 (Gregor)
- Live repository: every update re-lists and re-stats the project and re-reads only files named by events, changed in mtime/size or new; the model is
  swapped whole; change notifications name affected references (own file, linked plan or note, gained or lost link) and flag untied changes. Fed by 0001's
  `onDidChangeActiveProject` through `connectActiveProject`; no StatusBar decorator · 2026-11-16 · plan 0002 T-007, T-008
- Folder identity is the root URI string; `displayPath` is only for text shown to the user (BR-05) ·
  2026-11-16 · plan 0001 T-009
- Runtime store location: one directory per project root under the extension's `globalStorageUri`
  (`featherspec-studio/projects/<sha256(root URI)[0:16]>/`), not the per-workspace `storageUri` — the only
  location all windows share (PD-026, PD-030) · 2026-11-16 · [plan 0004](../.specs/active/0004-runtime-persistence-event-model.plan.md) *Approach*, ADR-002 amendment
- Runtime store reaches the disk only through the `RuntimeMedium` port; one contract suite runs against an
  in-memory and the Node-fs medium (that is AC-001's "unchanged core code") · 2026-11-16 · plan 0004
- Run data is append-only logs per run (`*.run.jsonl`, `*.events.jsonl`), never rewritten; a run is removed only as
  a whole; unknown format versions are left untouched (read-only store) · 2026-11-16 · spec 0004 BR-007, plan 0004 T-005

- Lifecycle model is one pure function over 0002's `ProjectRead` (`deriveLifecycle`): no clock, no run input, so equal
  files give equal states (AC-006, AC-010); the status history is a separate recorder behind the 0004 store port ·
  2026-11-16 · plan 0003 Approach
- History baseline: the first derivation per project and opened store whose history can be read compares with the stored
  last state; a read-only or unavailable store only keeps the in-memory state current, so a gap is never recorded later
  (PD-023) · 2026-11-16 · plan 0003 Research (a), T-006
- Flow marker: a state change is *in flow* when a chain of documented steps leads from the old to the new state; Blocked
  may be the old or the new state, never an intermediate one · 2026-11-16 · spec 0003 §6.4, plan 0003 Research

- Studio shell UI memory (area, selection with project root) lives in `context.workspaceState` (`featherspec-studio.shell`, versioned, validated on read), not
  in the webview's `getState`/`setState`: that state dies with the panel and cannot carry reopen or reload · 2026-11-16 · [plan 0005](../.specs/active/0005-studio-shell-navigation.plan.md) *Research*
- The host derives every panel state except two: the webview decides S6 (any inbound message of another protocol version, ranks first) and S5's protocol cause
  (no valid snapshot within 5 s of `hello`, an invalid snapshot, or a second mismatch right after a reload) · 2026-11-16 · spec 0005 BR-05, OP-008, plan 0005 *Research*
- All UI texts the shell owns sit in one shared file (`src/shared/protocol/texts.ts`), used by the panel UI and the host tree · 2026-11-16 · plan 0005 *Approach*
- Areas never open each other: they send one navigation request (`navigate`: area plus optional spec, run or board-filter target) through the host, which
  persists and answers it; the panel UI registers an area in `src/webview/areas/registry.tsx`, otherwise the placeholder shows · 2026-11-16 · spec 0005 BR-07, PD-040
- AC-020 test hook: in `ExtensionMode.Test` only, the HTML carries `data-test`, the host sends a `probe` event with a webview URI of a workspace file and the panel UI
  answers `failed` or `loaded`, never content; in normal mode `probeResult` is an unknown message type · 2026-11-16 · plan 0005 T-008
- Webview tests use `act` from `react` plus `createRoot` in jsdom, without Testing Library; the built `dist/webview/main.js` is loaded in jsdom by
  `src/adapters/node/webviewBundle.test.ts` (it runs `node esbuild.js`), so a broken bundle or a start-up error turns a unit test red · 2026-11-16 · plan 0005 T-002 (Gregor's extra check)
- The shell model source derives the 0003 model from the repository snapshot itself (`deriveLifecycle`, cached per snapshot) instead of reading the lifecycle
  service, which refreshes asynchronously and could pair a project with a model of another snapshot · 2026-11-16 · plan 0005 T-006

- Board filter, sort and focus live in extension memory (`boardUiState`), not in the webview: they survive a panel reload, a second reader gets one truth, and the filter is cleared when the project root changes;
  closing the panel resets all three · 2026-11-16 · plan 0007 *Research*, Gregor
- Board and detail logic live in `src/core/board` (cards, progress, runs, filters, moves, open-file guard, detail sections, board service); the webview only renders the `board`, `detail`, `moveResult` and
  `openFileResult` snapshots, which carry no `seq` (each replaces the last) and are re-sent on `hello` · 2026-11-16 · plan 0007 *Approach*, T-010
- Native HTML5 drag and drop instead of `@dnd-kit/react` (ADR-001 §11 named it as the primary, native as the fallback): no new dependency, the "Move to…" menu and the command stay the mandatory non-drag alternative ·
  2026-11-16 · plan 0007 *Research*, Gregor; amendment in ADR-001 §11
- Drag tests dispatch `MouseEvent`s named `dragstart`, `dragover`, `drop` and `dragend`, because jsdom has no `DragEvent`; the drag handlers must not rely on `dataTransfer` · 2026-11-16 · plan 0007 T-008
- Board filter encoding v1 is `{states?, providers? (string or null for "No run"), set?: {label, stems}}` in `src/shared/protocol/boardFilter.ts`: AND across kinds, OR within a kind, an unknown stem matches
  nothing; the dashboard (spec 0006) uses this shape for its navigation requests · 2026-11-16 · plan 0007 T-001, Gregor
- Mission Control: the host computes the dashboard as one serialisable `MissionControlView` (`src/core/missionControl`, contract and strict guard in `src/shared/protocol/missionControl.ts`) and the webview only renders
  it; the `missionControl` event has no `seq` (like the board) and is re-sent on `hello`; an unknown key anywhere refuses the whole view, so no run error text can reach the DOM · 2026-11-16 · plan 0006 T-002, T-005
- The dashboard service computes only while someone listens (the panel is open): no store read and no subscription otherwise; bursts are coalesced into one more recompute; `updatedAt` is the time the model object last changed ·
  2026-11-16 · plan 0006 T-004, readings p6 and c
- The run-change source for every area is `RuntimeStore.onDidChangeRuns` (0004 AC-030); the dashboard wraps it in `runSource.ts` (follows the current store, falls back to the session reason), the board follows it inline · 2026-11-16 · plan 0006 T-001, Gregor
- Dashboard drill-downs reuse the board filter of 0007: a state count sends `{states:[state]}`, "Needs attention" and "Diagnostics" send a named set of stems; the diagnostics count does not open the Output channel · 2026-11-16 · spec 0006 BR-08, Gregor (OP-4)
- Agent Center (spec 0012): `RuntimeStore.appendEvent` does not notify, so the extension wraps the opened store with `withEventSignal` (`src/core/agentCenter/eventSignal.ts`); the signal carries only `{runId, seq, type}`, never a payload (the store masks payloads, the signal must not leak unmasked ones), and the service re-reads newer events from the store · 2026-11-17 · plan 0012 T-004
- Agent Center host-held bounded event window: the service keeps at most 5 pages of 100 events per selected run (500 while following), the summary reducer reads the whole run in pages of 500; the view and the timeline are two events without `seq`, re-sent on `hello`; the service computes only while listened to · 2026-11-17 · plan 0012 T-003, T-004
- Area texts sit in one file per area (`src/webview/areas/missionControl/texts.ts`); the area shows no loading text of its own before its first view (the shell owns S4) · 2026-11-16 · plan 0006 T-005
- Studio colours: the stylesheet uses only `--vscode-*` variables; own `--fs-*` custom properties are allowed as aliases whose every definition is a `var(--vscode-*)` chain (no literal, no spacing tokens); one state-colour mapping via `[data-board-state]` → `--fs-tint`, tint on icon, edge and bar only, text stays foreground · 2026-11-16 · plan 0013 T-001, Gregor
- Inline Markdown of spec files is tokenised by a pure formatter (`src/webview/ui/inlineFormat.ts`) into tokens rendered as React elements; no HTML is ever parsed or injected (`innerHTML` banned under `src/webview`, guarded by a test) · 2026-11-16 · plan 0013 T-007
- Drag feedback marks only the dragged card and the column under the pointer, no valid/invalid verdict before the drop; refusals show after the drop · 2026-11-16 · spec 0013 OP-1 (a), Gregor
- Limitation: a second window (a reader that did not open the run) sees new runs only at its next refresh, since the run-change notification is in process only · 2026-11-16 · spec 0007 §10, Gregor
- Provider surface (spec 0009, built): adapters implement `AgentProviderPort` (`src/core/ports/agentProvider.ts`) and deliver events through a per-run callback sink (`emit`, `close`, `fail`; a rejected start or resume counts as `fail`), because the Copilot SDK delivers by callback and no backpressure is needed; consumers use only the provider service (`src/core/providers/providerService.ts`), which stamps run IDs, rewrites unknown kinds to `provider.unknown`, adds the generic category texts, adds a derived `run.failed` when a stream ends without an end kind, tracks open requests (one answer each, never answered by Studio) and aggregates adapter credentials for 0004's masking · the fake provider in `src/adapters/providers/fake/` is the single test double for 0008, 0010, 0011 and 0012 (two profiles, scenarios, scripts, recorded calls), registered only while `featherspec-studio.fakeProvider.enabled` is on; one contract suite (`src/core/providers/testing/contract.ts`) runs against every adapter through the service. Port reference: [docs/agent-provider-port.md](../docs/agent-provider-port.md) · 2026-11-17 · plan 0009 (T-001…T-009), spec 0009 §12
- Orchestrator (spec 0011, built): one pure run tracker (`src/core/orchestrator/runTrack.ts`) decides every status from accepted events and the transition table; the service puts every port event on one event queue (store append, then tracker, then status) and wraps check-and-create in one operation lock, so a start result, a timer and an event are never decided out of order; the start call runs outside the lock and its refusal is handled on the queue; `source` is stored as one more top-level field of an event's payload; after the start timeout (60 s), the stop timeout (30 s) and at window end (lock lost, store switched or closed, shutdown) the orchestrator calls the provider's cancel where declared and then `endSession`, and stops handling that run; `RuntimeSession` announces every store switch to its state listeners, also between two writable stores (0004, plan 0011 T-009), and the store of an open run is also compared at the next event or operation; resume creates a new run whose first status entry carries the cause `resumed from <runId>` (0004 `createRun` gained an optional `cause`) · 2026-11-17 · plan 0011 (T-001…T-009), spec 0011 §6

- Agent start (spec 0008, built): the flow state (checking, refusal, confirmation, notice) lives in the host (`src/core/agentStart/startFlow.ts`), not in the webview, because a hidden panel loses its state; one serialisable `AgentStartView` (contract and strict guard in `src/shared/protocol/agentStart.ts`, no `seq`, re-sent on `hello`) feeds a dialog and two lines above the area, and a confirmation token (`c-<n>`) rejects a stale Start or Cancel; 0011 is reached through one narrow port (`StartOrchestratorPort`, `src/core/ports/agentStart.ts`) bound in `src/core/agentStart/orchestratorBinding.ts`, and only the composition root turns the project root URI into a file-system path for the provider's working directory; the start prompt is one template plus a golden file (a change is a spec change of §6.3); the preconditions are evaluated at the hand-off and again on Start, and a provider, model or permission mode that differs from the confirmation refuses as *outdated*; a Start refusal, cancel or hide stores nothing and Studio writes no project file (`noWrite.test.ts`) · 2026-11-17 · plan 0008 (T-001…T-008), spec 0008 §6, §14

- Copilot adapter (spec 0010, built): `src/adapters/providers/copilot/` keeps all logic behind a client seam (`client.ts`), so `sdkClient.ts` is the only file that touches `@github/copilot-sdk`; tests use the scripted client (`testing/scriptedClient.ts`) that replays the recorded PoC stream on a fake clock · the SDK calls its permission, input and elicitation handlers before the matching `.requested` event, so the adapter queues the handler promises per kind and pairs them with the next request; an answer settles the promise and derives the `*.resolved` event · cancel sends one abort and force-stops after 10 s with a derived `run.cancelled`; a 5 s `ping()` watcher turns a dead runtime into a derived `run.failed` · the contract suite got a `settle` hook and a no-credential case so async adapters without a credential can run it · 2026-11-17 · plan 0010 (T-001…T-008), spec 0010 [docs/agent-provider-port.md](../docs/agent-provider-port.md)

## Patterns
- Provider independence: each agent provider is an adapter that declares its capabilities;
  provider events are normalised into an internal model (handoff §2.1, §8.3).
- Separate lifecycles: spec lifecycle, agent-run lifecycle and verification status are modelled
  apart (handoff §6.2).
- Honest status: data a provider does not deliver is shown as "not available", never estimated
  (handoff §3 P8).
