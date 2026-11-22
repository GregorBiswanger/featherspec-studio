# Plan — Send and Copy for each assistant in JetBrains

**Spec:** [0035-send-and-copy-for-each-assistant-in-jetbrains.md](0035-send-and-copy-for-each-assistant-in-jetbrains.md)
**Status:** Not started
**Last updated:** 2026-11-22
**Current step:** T-001

## Approach

The core gets one assistant table per host instead of the single VS Code table: each row names the handover (`send` or
`copyFor`), the presence ID, the targets, the text builder of spec §6.2 and the time budget. The VS Code table is today's
`ASSISTANTS`, byte-identical in its calls; the JetBrains table lives in `src/hosts/embedded/` and reaches the IDE through
the existing `AssistantHostPort` (`extension`, `commands`, `execute`) and two new bridge calls — no port signature
changes. The webview learns one optional `handover: 'copyFor'` on `SendView` (protocol 11 → 12). Kotlin adds the
*Assistant* row, a plugin-availability service, the Claude terminal handover on the documented (experimental) Reworked
Terminal API as an optional dependency, and a chat-window opener. Order: the riskiest unknowns first (spike K-1), then the
shared TypeScript with local gates, then the bridge, then Kotlin (CI), then docs and the manual checks. Memory Bank:
`activeContext.md` (stage ends), `techContext.md` (optional Terminal dependency, CI-only Kotlin), `systemPatterns.md`
(one decision record: per-host assistant table, PD-108); maps `.architecture/core.md`, `hosts.md`, `jetbrains.md`.

**Where things run:** Kotlin is built and tested **only in CI** (`.github/workflows/jetbrains.yml`; the sandbox has no Gradle
with the IntelliJ Platform, 0034 §6.11, A-001). TypeScript unit tests run locally with
`npx vitest run --project node --project webview`.

**Quality gates:** per TypeScript step (techContext *Quality gates*): `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npx vitest run --project node --project webview` (then the timing projects as in
`npm run test:unit`) · `npm run compile` where wiring or the bundle changes. Per Kotlin step: CI `jetbrains.yml › plugin`
(JUnit, 3 OS), `verify` (Plugin Verifier), `ide-tests`, `vscode-guards`, `shared-guard`, `vscode-mirror`, all green at one
head (pushing is a git write: ask first). Pre-done: `npm test` (CI `vscode-mirror` and Gregor's Windows machine).

## Research

- **Survey** (`aa0fe9b`): `src/core/assistant/{assistants,offer,send,sendView,welcome,wiring,attachment}.ts`,
  `src/shared/protocol/{assistant,assistantTexts,nextStepTexts,envelope,overview}.ts`, `src/webview/ui/{SendButton,StepAction,
  Welcome}.tsx`, `src/webview/areas/{overview/Overview,SpecBoard}.tsx`, `src/core/overview/overviewView.ts`,
  `src/core/board/boardService.ts`, `src/hosts/compose.ts`, `src/hosts/embedded/{ports,contract,mirrors,main}.ts`; Kotlin
  `HostRouter.kt` (`CallRouter.ROUTED`), `runtime/HostContract.kt` (mirrored by `HostContractTest` against `contract.ts`),
  `settings/{SettingsTable,StudioSettings,StudioConfigurable}.kt`, `StudioProjectService.kt`, `CoreConfig.kt`,
  `META-INF/plugin.xml` (two `<depends>`). Callers of `ASSISTANTS`: `offer.ts`, `send.ts`, `attachment.ts` (`attachesOf`),
  tests of 0024/0026/0027/0031/0033 (they must stay green unchanged). Guards: `jetbrains.yml › shared-guard` diffs
  `src/core` against `3bc615c` (must move, spec OP-017); `renderedTexts.mjs` renders conformance views without an offer,
  so the empty-state change does not show there. About 60 parity rows name PD-105.
- **Contracts kept:** `isSendView` and `isSendPromptPayload` are strict on keys; `send.ts` serialises Sends and falls back on
  5000 ms; Copy prompt copies the line alone; the Claude text is `<line>` + ` @<path>` with the whitespace rule.
- **Prerequisite:** 0034 is closed first (G4 compile READY, `/sdd-lifecycle`), because the shared-guard's start commit and
  `jetbrains/AGENTS.md` change here.
- [IntelliJ SDK — Embedded Terminal](https://plugins.jetbrains.com/docs/intellij/embedded-terminal.html) (page 2025-12-08):
  Terminal API since 2025.3, **experimental**; `TerminalToolWindowTabsManager.getTabs()` / `createTabBuilder()`,
  `TerminalView.sendText()`, `createSendTextBuilder()` with `shouldExecute()` and `useBracketedPasteMode()`; shell
  integration (`shellIntegrationDeferred`, command blocks with working directory, command, exit code) for Bash, Zsh,
  PowerShell; dependency on `org.jetbrains.plugins.terminal` — retrieved 2026-11-22.
- [Reworked Terminal API is available in 2025.3](https://platform.jetbrains.com/t/reworked-terminal-api-is-available-in-2025-3/3159)
  (2025-11-20): "this API is currently experimental"; no public API to configure the shell command line — retrieved 2026-11-22.
- [Terminal implementation changes from 2025.2](https://platform.jetbrains.com/t/terminal-implementation-changes-from-v2025-2-of-intellij-based-ides/2264):
  Reworked is the default; classic creation APIs return the classic terminal; `TerminalWidget.sendCommandToExecute`
  always executes — so no stable API types without executing — retrieved 2026-11-22.
- [IntelliJ IDEA 2026.3 — Terminal](https://www.jetbrains.com/help/idea/2026.3/terminal-emulator.html) (2026-10-23): Reworked
  default; shell integration Bash, Zsh, PowerShell only — retrieved 2026-11-22.
- [Claude Code — JetBrains IDEs](https://code.claude.com/docs/en/jetbrains): the plugin runs `claude` in the IDE terminal; no
  API for other plugins; file references `@src/auth.ts#L1-99` — retrieved 2026-11-22.
- [Claude Code — CLI reference](https://code.claude.com/docs/en/cli-reference): `claude "query"` starts *and sends*; no
  prefill flag — so the Studio types into a running `claude` — retrieved 2026-11-22.
- [Claude Code — deep links](https://code.claude.com/docs/en/deep-links): `claude-cli://open?q=` prefills but opens a terminal
  window outside the IDE — rejected (spec §4) — retrieved 2026-11-22.
- [JetBrains Platform forum, LLM-2340](https://platform.jetbrains.com/t/sending-pre-defined-prompts-to-junie/3299)
  (2025-12-18): "we can't approve or support any third-party usage of AI Assistant or Junie APIs" — retrieved 2026-11-22.
- [AI Assistant 2026.2 — chat](https://www.jetbrains.com/help/ai-assistant/2026.2/chat-mode.html) (2026-08-03): "To reference a
  file, use `@file:file_name`"; AI Chat tool window — retrieved 2026-11-22.
- [AI Assistant 2026.3 — Junie](https://www.jetbrains.com/help/ai-assistant/2026.3/junie-agent.html) (2026-10-07): "Use `@` in
  the chat input to attach additional files"; [Junie IDE plugin](https://junie.jetbrains.com/docs/junie-ide-plugin.html)
  (2026-11-21): Junie runs in AI Chat without its plugin; the plugin adds the Junie tool window — retrieved 2026-11-22.
- [GitHub Docs — Copilot chat in the IDE (JetBrains)](https://docs.github.com/en/copilot/how-tos/chat-with-copilot/chat-in-ide?tool=jetbrains)
  and [chat cheat sheet](https://docs.github.com/en/copilot/reference/chat-cheat-sheet?tool=jetbrains): GitHub Copilot Chat
  window; files by drag and drop or *Reference File in Chat*; **no** documented `#file` syntax for JetBrains (spec A-002) —
  retrieved 2026-11-22.
- [IntelliJ SDK — IDE infrastructure](https://plugins.jetbrains.com/docs/intellij/ide-infrastructure.html) (2026-11-10):
  "Installed plugins can be checked via `PluginManagerCore.isPluginInstalled()`"; [Dynamic plugins](https://plugins.jetbrains.com/docs/intellij/dynamic-plugins.html):
  `DynamicPluginListener` for load/unload; [forum IJPL-244315](https://platform.jetbrains.com/t/4272): `getPlugin` internal
  from 2026.2; [Notable API changes 2026](https://plugins.jetbrains.com/docs/intellij/api-notable-list-2026.html): enabling or
  disabling plugins through `PluginManagerCore` is internal in 2026.3 (we only read) — retrieved 2026-11-22.
- **Unverified, decided by K-1:** the tab builder's options (name, working directory), the enabled check that is not
  internal, Claude Code's readiness signal, the tool window IDs and Copilot's plugin ID (spec A-005–A-009).

## Stages

0. T-001 — spike K-1 and prerequisites. **Gate G0:** 0034 closed; K-1 results in spec §13 and here; Gregor's go.
1. T-002 ‖ T-003 ‖ T-004 — shared core: per-host table, reference texts, empty state. **Gate G1:** local gates green.
2. T-005 → T-006 → T-007 → T-008 — Copy for in core and webview, the embedded host, the guard move. **Gate G2:** local gates,
   `node --test 'jetbrains/guards/*.test.mjs'`, CI `shared-guard`, `vscode-guards`, `plugin` green.
3. T-009 → T-010 → T-011 → T-012 — Kotlin host. **Gate G3:** every CI job of `jetbrains.yml` green at one head.
4. T-013 → T-014 — parity, docs, final gates. **Gate G4:** every gate of T-014 green at one head.
5. T-015 — Gregor's manual checks AC-027, AC-028. **Gate G5:** both pass, then `/sdd-compile` READY in a fresh session,
   then Gregor's go for `/sdd-lifecycle`.

Every stage holds the TDD test review of `AGENTS.md`: the new tests run red, Gregor sees the list, then the code lands.

Parallel: stage 1 (three disjoint file sets, each with its own test file). No parallel stage 2: each step builds on the
previous one's types. No parallel stage 3: T-011 and T-012 both wire into `StudioProjectService.kt` and `HostRouter.kt`.

## Steps

### T-001 — Spike K-1: handover probe in Rider (no product behaviour)

- **Covers:** spec A-005–A-009; precondition of AC-003, AC-011–AC-015, AC-016, AC-017, AC-024
- **Do:** a probe in `jetbrains/.../probe/HandoverProbe.kt`, inert unless the system property
  `featherspec.probe.handover=true` is set (as the other probes). It logs one JSON block: the IDs of every registered tool
  window; for `org.jetbrains.junie`, `com.intellij.ml.llm`, `com.github.copilot`, `org.jetbrains.plugins.terminal` and
  `com.anthropic.code.plugin` the result of `PluginManagerCore.isPluginInstalled` and of the enabled-check candidate; per
  terminal tab name, shell-integration state, running command and working directory. A second probe action opens a tab
  `Claude Code` in the project root through `createTabBuilder()`, runs `claude`, records the time until each readiness
  candidate (output text marker, command block started, alternate buffer) and types `probe @README.md` as bracketed paste
  without Enter. The optional `<depends>` on the Terminal plugin lands here in the probe's config file only.
- **Verify:** CI `plugin` and `verify` green (compiles at since-build, Verifier lists no internal API use);
  `manual: Gregor runs both probes in Rider 2026.3 on tip-splitter (with and without a running claude tab, PowerShell and
  Git Bash) and pastes the JSON` — only a real IDE with the real plugins and the CLI can answer A-005–A-009. Also records
  J-1's result if Gregor has run it (19 §2).
- [ ] **Verified (T-001):** —
- **Notes:** results go to spec §13 (A-005–A-009, values) and *Research* above; a failed candidate is a spec change before T-002.

### T-002 — Per-host assistant table in the core; `junie` as an ID

- **Covers:** AC-004 (core part), AC-005, AC-021 (part)
- **Files:** `src/core/assistant/{assistants,offer,send,wiring,attachment,sendView}.ts`, `src/shared/protocol/assistant.ts`,
  `src/shared/protocol/assistantTexts.ts` (`ASSISTANT_NAMES.junie`), `src/core/assistant/assistantTable0035.test.ts`
- **Do:** `AssistantSpec` gains `handover`, `targets`, optional `text(line, paths)`, optional `timeoutMs`; `ASSISTANTS`
  keeps its name and becomes the VS Code row set (copilot, claudeCode; calls unchanged) of type `AssistantTable`;
  `offerOf`, `extensionPresence`, `createSend`, `attachesOf` take the table from `createAssistantWiring` (default
  `ASSISTANTS`); `Offer` carries the row's targets; `ASSISTANT_IDS` adds `junie`. The signatures of `plainSendViewOf`,
  `sendViewOf` and `welcomeOf` stay, so T-003 and T-004 do not depend on this step.
- **Tests first:** VS Code table: `junie`, `""`, `42`, unset act as `none` with every 0024 extension set; a fake two-row
  table offers by its own presence IDs; the send budget per row (`timeoutMs`) is used; red via `Not implemented`.
- **Verify:** `npx vitest run --project node --project webview` (all existing 0024/0026/0027/0031/0033 tests unchanged and
  green) + eslint + both `tsc`.
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Reference texts and the Junie form

- **Covers:** AC-009, AC-018, AC-016 and AC-017 (text part), AC-021 (part)
- **Files:** `src/core/assistant/references.ts`, `src/core/assistant/references0035.test.ts`
- **Do:** pure `claudeText(line, paths)`, `copilotCopyText(line, paths)`, `junieCopyText(line, paths, form)`,
  `JUNIE_FORM: 'slash' | 'follow' = 'slash'`, the whitespace filter, spec §6.2 and §6.7 literally.
- **Tests first:** AC-018's table for both forms; AC-009: for every world of `CASE_WORLDS` and each line with a step action,
  the path lists equal the ` @` mentions of `ASSISTANTS.claudeCode.callsFor` (today's VS Code output; the name stays in
  T-002); negative control with one path swapped.
- **Verify:** `npx vitest run --project node src/core/assistant/references0035.test.ts` + eslint + `tsc`.
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Step action in the empty state *No specs yet* (both hosts)

- **Covers:** AC-007, AC-008 (empty-state part)
- **Files:** `src/core/overview/overviewView.ts`, `src/core/board/boardService.ts`, `src/core/assistant/welcome.ts`
  (`emptySendOf`), `src/shared/protocol/overview.ts` and `src/shared/protocol/board.ts` with their validators,
  `src/webview/areas/overview/Overview.tsx`, `src/webview/areas/SpecBoard.tsx`, `src/webview/emptyState0035.test.tsx`,
  `src/core/overview/emptyState0035.test.ts`
- **Do:** an optional `start?: SendView` beside the empty state (only while setup is *run* or *unknown*, no spec, an
  offer); the webview renders `StepAction` for `SDD_SPECIFY_LINE` where it holds one, else today's `CopyButton`.
- **Tests first:** `fs-setup-done-no-specs` with fake offers copilot and claudeCode → `Send to <Name>` with 0026's default
  target and menu, no attachment, no Tip; with none → DOM deep-equal to the start commit; `fs-setup-not-run` unchanged.
- **Verify:** `npx vitest run --project node --project webview` + eslint + both `tsc`.
- [ ] **Verified (T-004):** —
- **Notes:** protocol version bump waits for T-006 (one bump for both shape changes).

### T-005 — Copy for in the core

- **Covers:** AC-016, AC-017 (core part), AC-019, AC-020, AC-010 (Copy for part)
- **Do:** in `send.ts` a `copyFor` row: check the files (0027 §6.5), write `row.text(line, paths)` to the clipboard, then
  `host.execute('featherspec.openChat', [assistant])`; outcome `copied` with spec §7's texts (opened, not found, file
  left out); a failed write → `copyFailed`, nothing opens; `SendView` and `SendPromptPayload` accept `handover: 'copyFor'`
  and `junie`; §7's texts in `assistantTexts.ts`. Files: `src/core/assistant/send.ts`, `src/shared/protocol/assistant.ts`,
  `src/shared/protocol/assistantTexts.ts`, `src/core/assistant/copyFor0035.test.ts`.
- **Tests first:** fake host and clipboard: exact clipboard text per assistant, open call after the write, not found,
  failing write, a left-out file, Copy prompt menu path copies the line alone; every §7 text literally.
- **Verify:** local gates (node + webview projects) green.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Copy for split button and tip in the webview; protocol 12

- **Covers:** AC-020, AC-022, AC-021 (part), AC-006 (rendering part)
- **Do:** `SendButton.tsx`: with `handover: 'copyFor'` the main part reads `Copy for <Name>`, names and tooltips of §7, the
  menu holds only `Copy prompt`, feedback `Copied` with the core's text; `tipClosingOf` gives §7's Copy for sentence;
  `PROTOCOL_VERSION = 12` (`envelope.ts`) with the protocol tests. Files: `src/webview/ui/SendButton.tsx`,
  `src/core/assistant/sendView.ts`, `src/shared/protocol/envelope.ts`, `src/webview/ui/SendButton0035.test.tsx`.
- **Tests first:** rendered label, names, menu items and announcements for Copilot and Junie; VS Code views unchanged
  (existing `SendButton.test.tsx` green).
- **Verify:** local gates + `npm run compile`.
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — JetBrains assistant table and the embedded host port

- **Covers:** AC-003 (core part), AC-004, AC-006, AC-011 and AC-013 (core part), AC-023
- **Do:** `src/hosts/embedded/assistants.ts`: copilot `copyFor` (presence `com.github.copilot`), claudeCode `send`
  (presence `org.jetbrains.plugins.terminal`, targets `current`, `new`, `timeoutMs` 20 000, call `featherspec.claudeTerminal`
  with `{ target, text }`), junie `copyFor` (presence `junie`, true while either Junie plugin is available); `ports.ts`:
  `assistantHost` from a `plugins` mirror (`CoreConfig.plugins`, event `pluginsChanged`), `commands()` the two host
  commands, `execute` → bridge calls `assistant.claudeTerminal`, `assistant.openChat`; `compose.ts` passes the table;
  `contract.ts` and its Kotlin mirror `runtime/HostContract.kt` gain the two calls and the event; §7's log causes.
  Files: `src/hosts/embedded/{assistants,ports,contract,mirrors,main}.ts`, `src/hosts/compose.ts`,
  `jetbrains/.../runtime/HostContract.kt`, `src/hosts/embedded/assistant0035.test.ts`.
- **Tests first:** AC-004's matrix with the plugin mirror; AC-006: for every `CASE_WORLDS` world and `fs-setup-not-run`
  the places with a step action in the JetBrains host equal the places with Send in the VS Code host; a webview message
  never names a command (scan of `messages.ts`); `noNetwork.test.ts` stays green.
- **Verify:** local gates + `npm run compile`; CI `plugin` (`HostContractTest`) green.
- [ ] **Verified (T-007):** —
- **Notes:** until T-010 the two calls are unrouted and fail, so every Send falls back to Copy: the repo keeps working.

### T-008 — Move the shared-change guard to 0035's start commit

- **Covers:** AC-026, AC-005 (CI part)
- **Do:** `.github/workflows/jetbrains.yml`: `START_COMMIT` = the plan's *Baseline*; `shared-guard`'s `git diff` keeps the
  baselines, the golden file, `ci.yml`, `publish.yml` and drops `src/core`; test inventory and rendered texts as today;
  `vscode-guards` unchanged. Files: `.github/workflows/jetbrains.yml`, `jetbrains/guards/sharedGuard.test.mjs` (a case for
  the new start).
- **Verify:** `node --test 'jetbrains/guards/*.test.mjs'`; CI `shared-guard` and `vscode-guards` green.
- [ ] **Verified (T-008):** —
- **Notes:** ask before the push (git write).

### T-009 — *Assistant* row and plugin availability (Kotlin)

- **Covers:** AC-001, AC-002, AC-003
- **Do:** `SettingsTable.kt` (key `assistant`, values, §7's labels and descriptions, `options(junieAvailable)`,
  `sanitize`), `StudioSettings.kt` (field `assistant`, change events), `StudioConfigurable.kt` (combo row and comment);
  `ports/PluginAvailability.kt`: pure rules plus thin glue (`isPluginInstalled` and K-1's enabled check), a
  `DynamicPluginListener` in `plugin.xml`, pushes `plugins` with the start and `pluginsChanged` within 500 ms;
  `CoreConfig.kt` carries both. Tests `SettingsTableTest.kt`, `PluginAvailabilityTest.kt`.
- **Verify:** CI `plugin` (JUnit 3 OS) and `verify` green; local TS gates unchanged.
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — Route the assistant calls (Kotlin)

- **Covers:** AC-023
- **Do:** `HostRouter.kt`: group `ASSISTANT` for `assistant.claudeTerminal`, `assistant.openChat`; an `AssistantCalls`
  port in `StudioProjectService.kt` that answers "unavailable" until T-011 and T-012 fill it; argument checks (assistant,
  target, text without control characters). Tests `HostRouterTest.kt`.
- **Verify:** CI `plugin` green.
- [ ] **Verified (T-010):** —
- **Notes:** —

### T-011 — Send to Claude Code through the terminal (Kotlin)

- **Covers:** AC-011, AC-012, AC-013, AC-014, AC-015, AC-024
- **Do:** `assistant/ClaudeTerminal.kt` (pure: choose the Claude terminal, readiness wait with 15 000 ms, the control
  character check, the paste text, the last-typed memory) and `assistant/TerminalGlue.kt` (Reworked Terminal API only:
  `getTabs`, `createTabBuilder`, `sendText` with bracketed paste, never `shouldExecute` for the prompt; `claude` started
  with `shouldExecute`), loaded through `<depends optional="true" config-file="featherspec-terminal.xml">`; every call
  guarded → fallback; `build.gradle.kts` adds the bundled Terminal plugin for compiling. Tests `ClaudeTerminalTest.kt` with
  fake tabs and a fake clock (AC-015's table, AC-014's byte record, late readiness types nothing).
- **Verify:** CI `plugin`, `verify` (no internal API; experimental use listed in the report) and `ide-tests` green;
  AC-027 stays manual (no `claude` in CI).
- [ ] **Verified (T-011):** —
- **Notes:** —

### T-012 — Open the chat for Copy for (Kotlin)

- **Covers:** AC-016, AC-017, AC-019
- **Do:** `assistant/ChatWindows.kt`: assistant → tool window IDs from K-1 (Copilot; Junie: AI Chat while
  `com.intellij.ml.llm` is available, else Junie), `ToolWindowManager.getToolWindow(id)?.activate`; answers `opened` or
  `notFound`; wired into `AssistantCalls`. Tests `ChatWindowsTest.kt`.
- **Verify:** CI `plugin` and `verify` green.
- [ ] **Verified (T-012):** —
- **Notes:** —

### T-013 — Parity, amendments, docs, maps, Memory Bank

- **Covers:** AC-025, AC-029
- **Do:** `docs/jetbrains/parity-source.json`: the 0035 rows checked against the built code, every PD-105 row moved to
  PD-108 or a 0035 criterion, `FEATHERSPEC_WRITE_PARITY=1` regenerates `parity.md`; the notes of spec §5 in 0024, 0029,
  0034 and `jetbrains/AGENTS.md`; `README.md` *JetBrains IDEs* (three handovers, the content-root limit) and the VS Code
  empty state; `CHANGELOG.md`; `docs/release-checklist.md` section 0035 (AC-027, AC-028); `.architecture/core.md`,
  `hosts.md`, `jetbrains.md`; `techContext.md`, `systemPatterns.md`, `activeContext.md`. The `AGENTS.md` snapshot entries
  stay as they are (the boundary line already covers host-run assistant commands); if `/sdd-architecture-update` finds
  drift, it rewrites within the 15 000-byte limit. A test `src/adapters/node/docs0035.test.ts` checks the notes, README
  sentences and both byte limits.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/parity.test.ts
  src/adapters/node/docs0035.test.ts`.
- [ ] **Verified (T-013):** —
- **Notes:** —

### T-014 — Final gates

- **Covers:** AC-005, AC-008, AC-021, AC-026 (re-proven), every criterion's tests
- **Do:** run every gate of *Quality gates*; all `jetbrains.yml` jobs and `ci.yml` green at one head; `npm test`.
- **Verify:** local gates + `npm run compile`; CI all green; `npm test` in `vscode-mirror` and on Gregor's Windows.
- [ ] **Verified (T-014):** —
- **Notes:** —

### T-015 — Gregor's checks in Rider and VS Code

- **Covers:** AC-027, AC-028
- **Do:** Gregor installs the CI ZIP in Rider 2026.3, runs AC-027 and AC-028 on `C:\projects\test\tip-splitter`, and the
  VS Code empty state with Send to Copilot; results and versions into the spec's AC lines' evidence here.
- **Verify:** `manual: Gregor, Rider and VS Code` — the real assistants and the CLI exist only on his machine.
- [ ] **Verified (T-015):** —
- **Notes:** then `/sdd-compile` in a fresh session (another model family when available).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-009 | — | — | open |
| AC-002 | T-009 | — | — | open |
| AC-003 | T-001, T-007, T-009 | — | — | open |
| AC-004 | T-002, T-007 | — | — | open |
| AC-005 | T-002, T-008, T-014 | — | — | open |
| AC-006 | T-006, T-007 | — | — | open |
| AC-007 | T-004 | — | — | open |
| AC-008 | T-004, T-014 | — | — | open |
| AC-009 | T-003 | — | — | open |
| AC-010 | T-005, T-011 | — | — | open |
| AC-011 | T-007, T-011 | — | — | open |
| AC-012 | T-011 | — | — | open |
| AC-013 | T-007, T-011 | — | — | open |
| AC-014 | T-011 | — | — | open |
| AC-015 | T-011 | — | — | open |
| AC-016 | T-003, T-005, T-012 | — | — | open |
| AC-017 | T-003, T-005, T-012 | — | — | open |
| AC-018 | T-003 | — | — | open |
| AC-019 | T-005, T-012 | — | — | open |
| AC-020 | T-005, T-006 | — | — | open |
| AC-021 | T-002, T-003, T-005, T-006, T-014 | — | — | open |
| AC-022 | T-006 | — | — | open |
| AC-023 | T-007, T-010 | — | — | open |
| AC-024 | T-001, T-011 | — | — | open |
| AC-025 | T-013 | — | — | open |
| AC-026 | T-008, T-014 | — | — | open |
| AC-027 | T-015 | — | manual: Gregor, Rider | open |
| AC-028 | T-015 | — | manual: Gregor, Rider and VS Code | open |
| AC-029 | T-013 | — | — | open |

## Session handoff

- **Done so far:** spec written, clarified (proxy) and planned 2026-11-22; parity rows of 0035 seeded in
  `docs/jetbrains/parity-source.json`.
- **Next action:** Gregor reads spec and plan (proxies in spec §14); then 0034's close and T-001 on his start signal.
- **Open decisions:** the 18 proxies of spec §14; K-1's values (A-005–A-009); J-1 (form A or C).
- **Baseline:** _(commit hash before the first step commit; set when work starts)_
- **Environment:** Kotlin only in CI; TypeScript locally (`npx vitest run --project node --project webview`).
