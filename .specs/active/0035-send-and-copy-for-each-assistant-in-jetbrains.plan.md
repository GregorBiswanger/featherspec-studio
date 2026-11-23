# Plan — Send and Copy for each assistant in JetBrains

**Spec:** [0035-send-and-copy-for-each-assistant-in-jetbrains.md](0035-send-and-copy-for-each-assistant-in-jetbrains.md)
**Status:** In Progress
**Last updated:** 2026-11-22
**Current step:** T-014 (after CI of stage 3 and K-1)

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
- **Notes:** built (not committed): `probe/{HandoverProbe,HandoverTerminal,HandoverReflect}.kt`, `META-INF/featherspec-handover-probe.xml`
  (two actions, only visible with `-Dfeatherspec.probe.handover=true`: *FeatherSpec Probe: Handover Inventory* and *… Handover
  Claude Tab*), the optional `<depends optional="true" config-file=…>org.jetbrains.plugins.terminal` in `plugin.xml`, and
  `bundledPlugin("org.jetbrains.plugins.terminal")` in `build.gradle.kts`. JSON goes to `idea.log` (one line, prefix
  `FEATHERSPEC-HANDOVER-PROBE`), to the clipboard (pretty) and a balloon. Typed API only `TerminalToolWindowTabsManager`
  (`getInstance`, `tabs`, `createTabBuilder`); tab, view, builder, shell integration, blocks and output models by reflection
  (`unavailable: …` in the JSON). **Open for the owner:** `jetbrains/guards/pluginZip.mjs` demands exactly two `<depends>` and
  would fail on the optional one (guard and its test need a change before CI is green). Results go to spec §13 (A-005–A-009, values) and *Research* above; a failed candidate is a spec change before T-002.

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
- [x] **Verified (T-002):** 2026-11-22 · `src/core/assistant/assistantTable0035.test.ts` 36 tests, 12 red first (24 green at once: junie acts as none, VS Code calls and offers unchanged; negative control in the file), then 36 of 36 green · full `npx vitest run --project node --project webview`: 4154 green, 1 red outside T-002 (`sourceScan` 0015 AC-021 on T-003's `references.ts` and `references0035.test.ts`) · eslint src 0 · `tsc --noEmit` and `-p src/webview` 0 · `node --test 'jetbrains/guards/*.test.mjs'` 59/59.
- **Notes:** `ASSISTANTS` is typed `Record<'copilot' | 'claudeCode', AssistantSpec>` (no junie row: junie acts as none in VS Code); `AssistantTable` is the partial type for per-host tables; `Offer` carries `targets` and `attaches` only where a row deviates from the shared constants (VS Code offers stay deep-equal). `createAssistantWiring` and `createSend` take `table?`. Type-only edits of existing tests: `Record<AssistantId, …>` gets a `junie` entry in `send.test.ts` (2) and `sendAttach.test.ts`; `assistant.test.ts` expects the three ids, targets and names; helper `testing/fakeOffer.ts` reads the row through `AssistantTable`. `ASSISTANT_TARGETS.junie` is `['new']`; `isSendView` still checks against the shared constants (JetBrains `claudeCode` targets `current`, `new` need T-007).

### T-003 — Reference texts and the Junie form

- **Covers:** AC-009, AC-018, AC-016 and AC-017 (text part), AC-021 (part)
- **Files:** `src/core/assistant/references.ts`, `src/core/assistant/references0035.test.ts`
- **Do:** pure `claudeText(line, paths)`, `copilotCopyText(line, paths)`, `junieCopyText(line, paths, form)`,
  `JUNIE_FORM: 'slash' | 'follow' = 'slash'`, the whitespace filter, spec §6.2 and §6.7 literally.
- **Tests first:** AC-018's table for both forms; AC-009: for every world of `CASE_WORLDS` and each line with a step action,
  the path lists equal the ` @` mentions of `ASSISTANTS.claudeCode.callsFor` (today's VS Code output; the name stays in
  T-002); negative control with one path swapped.
- **Verify:** `npx vitest run --project node src/core/assistant/references0035.test.ts` + eslint + `tsc`.
- [x] **Verified (T-003):** 2026-11-22 · `npx vitest run --project node src/core/assistant/references0035.test.ts` 48 of 48 green (47 red first via `Not implemented`) · eslint src 0 · `npm run check-types` 0 · jetbrains guards 58/58. Full run: 4090 green, 14 red outside T-003 (see handoff).
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
- [x] **Verified (T-004):** 2026-11-22 — `emptyState0035.test.ts` (6) and `emptyState0035.test.tsx` (8) red first (12 failed, 3 negative controls green), then green; full node+webview run: only T-002/T-003 files red (see Notes); eslint src and both `tsc` clean; `node --test jetbrains/guards/*.test.mjs` 58/58.
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
- [x] **Verified (T-005):** 2026-11-22 · `src/core/assistant/copyFor0035.test.ts` 24 tests, 16 red first (AC-010 x3, AC-016 x4, AC-017 x2, AC-019 x3, serialisation, offer/view, `isSendView`, §7 texts via `Not implemented` stubs; 8 green at once: no attachment, copyFailed opens nothing, AC-020 copyText, places, unchosen, hand-over record, negative control), then 24 of 24 green · full `npx vitest run --project node --project webview`: 4179 green, 0 red · eslint src 0 · `npm run check-types` 0 · jetbrains guards 59/59.
- **Notes:** `AssistantSpec.place?()` (the Junie place depends on the plugin mirror: AI Chat or the Junie tool window) and `Offer.handover` / `Offer.place` (copyFor rows only; VS Code offers stay deep-equal); the views carry `handover: 'copyFor'` with `targets ['new']`. The payload `SendPromptPayload` needs no `handover` key: the host decides by the table row. Core calls `host.execute('featherspec.openChat', [assistant])` and reads the answer `'notFound'` (anything else, also no answer, counts as opened); a throw or no answer within the row budget (5000 ms default) counts as not found. Extra texts beyond §7: `Copy for <Name>: <path> was not found, so it was not referenced.` (log, AC-010) and the left-out file with a missing window (`Copied without <file>: the file was not found. Open <place> and paste it with <key>.`). `sourceScan.test.ts`: one narrow form `com.github.copilot` in `ASSISTANT_NAME_FORMS` and two narrow allowed Paste sentences (the Copy for texts); titles unchanged. T-002's own test expectation for the fake Junie offer gained `handover` and `place`.

### T-006 — Copy for split button and tip in the webview; protocol 12

- **Covers:** AC-020, AC-022, AC-021 (part), AC-006 (rendering part)
- **Do:** `SendButton.tsx`: with `handover: 'copyFor'` the main part reads `Copy for <Name>`, names and tooltips of §7, the
  menu holds only `Copy prompt`, feedback `Copied` with the core's text; `tipClosingOf` gives §7's Copy for sentence;
  `PROTOCOL_VERSION = 12` (`envelope.ts`) with the protocol tests. Files: `src/webview/ui/SendButton.tsx`,
  `src/core/assistant/sendView.ts`, `src/shared/protocol/envelope.ts`, `src/webview/ui/SendButton0035.test.tsx`.
- **Tests first:** rendered label, names, menu items and announcements for Copilot and Junie; VS Code views unchanged
  (existing `SendButton.test.tsx` green).
- **Verify:** local gates + `npm run compile`.
- [x] **Verified (T-006):** 2026-11-22 · new: `src/webview/ui/SendButton0035.test.tsx` (8), `src/core/assistant/tipCopyFor0035.test.ts` (2), `src/core/shell/protocol0035.test.ts` (3); 10 red first (label, name, tooltip, menu, feedback, §7 texts via `Not implemented`, tip sentence, version 12, mismatch), 4 green at once (existing paths and the negative control), then 13 of 13 green · full `npx vitest run --project node --project webview`: 4193 green, 0 red · eslint src 0 · `npm run check-types` 0 · `npm run compile` clean · jetbrains guards 59/59.
- **Notes:** `PROTOCOL_VERSION` 11 to 12. Existing tests that hard-code the number moved with it (`v: 11` to `v: 12` in 8 test files; `v: 12` used as "another version" to `v: 13`; titles unchanged because the shared-guard keys tests by title; `messages.test.ts` "the protocol is version 11" now asserts `>= 11`, the exact check is `protocol0035.test.ts`). The failure label stays `Could not copy` (0021's `COPY_FAILED_LABEL`), not "Copy failed". `src/core/shell/protocol0035.test.ts` sits in core because `src/shared` may not import the router. `jetbrains/guards/renderedTexts.mjs` feeds both bundles the version 11 and must read it per bundle: done in T-008. The Kotlin `PanelModelTest` strings with `"v":11` are inert samples.

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
- [x] **Verified (T-007):** 2026-11-22 · `src/hosts/embedded/assistant0035.test.ts` 113 tests (AC-004 matrix 7 values x 11 plugin sets, plugin mirror, Send through `assistant.claudeTerminal` with the four §7 causes and the 20000 ms budget, Copy for through `assistant.openChat`, AC-006/AC-009 over the 14 `CASE_WORLDS` and the welcome, the messages scan, the router); the first 110 ran 49 red (stub table `{}`; offers, sends, places, mirror event) and 61 green at once (value not offered either way, preserved VS Code behaviour, the scan), the 3 router tests were added when the shared `messages.test.ts` refused `claudeCode` + `current` (red on the guard), then 113 of 113 green · full `npx vitest run --project node --project webview`: 4306 green, 0 red · eslint src 0 · `npm run check-types` 0 · `npm run compile` clean · jetbrains guards 59/59 · CI-only: `HostContractTest` (the mirror in `HostContract.kt`), `HostRouterTest`.
- **Notes:** until T-010 the two calls are unrouted and fail, so every Send falls back to Copy: the repo keeps working. Kotlin edits made blind (CI decides): `HostContract.kt` (two calls, event `pluginsChanged`), `HostRouter.kt` `DEFERRED_PREFIXES` gains `assistant.` (so `HostRouterTest` "routed or deferred" holds until T-010 routes them) and `HostRouterTest` line 109 expects both prefixes. `CoreConfig.kt` is not touched: `CoreConfigTest` asserts the exact key set, so the Kotlin `plugins` key lands with T-009; `CoreConfig.plugins` is optional in TypeScript (default empty). Design points: `AssistantSpec.causes` carries the Terminal causes of §7 (`the Terminal plugin is not available`, `terminal call failed: <message>`; a host error text equal to `Claude Code was not ready within 15000 ms` passes through as its own cause: Kotlin must use exactly that message); the Junie presence is the pseudo id `junie` (either `org.jetbrains.junie` or `com.intellij.ml.llm`), the place follows `com.intellij.ml.llm`; the default target of a view is the first of the offer's targets (`current` for Claude Code in JetBrains, `new` unchanged elsewhere; T-002's test expectation moved with it). The shared `isSendPromptPayload` stays strict (VS Code refuses `claudeCode` + `current` as before, `messages.test.ts` unchanged): the JetBrains panel session passes `JETBRAINS_SEND_TARGETS` through `PanelSessionDeps.sendTargets` to the router. `isSendView` (webview side) accepts the two-target list for Claude Code. A `plugins` mirror (`CoreConfig.plugins`, event `pluginsChanged {plugins: string[]}`) feeds `assistantHost.extension` and `onDidChangeExtensions`.

### T-008 — Move the shared-change guard to 0035's start commit

- **Covers:** AC-026, AC-005 (CI part)
- **Do:** `.github/workflows/jetbrains.yml`: `START_COMMIT` = the plan's *Baseline*; `shared-guard`'s `git diff` keeps the
  baselines, the golden file, `ci.yml`, `publish.yml` and drops `src/core`; test inventory and rendered texts as today;
  `vscode-guards` unchanged. Files: `.github/workflows/jetbrains.yml`, `jetbrains/guards/sharedGuard.test.mjs` (a case for
  the new start).
- **Verify:** `node --test 'jetbrains/guards/*.test.mjs'`; CI `shared-guard` and `vscode-guards` green.
- [x] **Verified (T-008):** 2026-11-22 · `jetbrains/guards/sharedGuard.test.mjs` +7 and `renderedTexts.test.mjs` +2 written first: both files red (import of `protocolVersionOf` missing), then `node --test 'jetbrains/guards/*.test.mjs'` 68 of 68 green (59 before) · run by hand against a worktree of the baseline (`npm run package` replaced by `node esbuild.js`): `node jetbrains/guards/renderedTexts.mjs <start> .` identical in 450 areas, `node jetbrains/guards/sharedGuard.mjs <start> .` no test missing (it found one: `assistant.test.ts` title renamed in T-002, restored) · `git diff 1765403 HEAD -- test/fixtures/next-step-baseline test/fixtures/read-baseline src/core/setup/mergePrompt.golden.txt .github/workflows/ci.yml .github/workflows/publish.yml` empty · CI `shared-guard`, `vscode-guards`, `plugin` still to run.
- **Notes:** `START_COMMIT` is the Baseline `1765403c…` (one variable: `vscode-guards` compares `ci.yml` and `publish.yml` against it too; both are unchanged since `3bc615c`, so nothing is loosened). The shared-guard `git diff` drops `src/core`. Deviation, forced by protocol 12: `renderedTexts.mjs` fed both bundles the version 11 and would show the head bundle `versionMismatch`; it now reads `PROTOCOL_VERSION` from each side's `envelope.ts` (`protocolVersionOf` in `sharedGuard.mjs`). The guard's test inventory compares by file and title, so titles of start tests are frozen: `assistant.test.ts` "two assistants with the targets…" keeps its old title with three ids inside. Ask before the push (git write).

### T-009 — *Assistant* row and plugin availability (Kotlin)

- **Covers:** AC-001, AC-002, AC-003
- **Do:** `SettingsTable.kt` (key `assistant`, values, §7's labels and descriptions, `options(junieAvailable)`,
  `sanitize`), `StudioSettings.kt` (field `assistant`, change events), `StudioConfigurable.kt` (combo row and comment);
  `ports/PluginAvailability.kt`: pure rules plus thin glue (`isPluginInstalled` and K-1's enabled check), a
  `DynamicPluginListener` in `plugin.xml`, pushes `plugins` with the start and `pluginsChanged` within 500 ms;
  `CoreConfig.kt` carries both. Tests `SettingsTableTest.kt`, `PluginAvailabilityTest.kt`.
- **Verify:** CI `plugin` (JUnit 3 OS) and `verify` green; local TS gates unchanged.
- [x] **Verified (T-009):** 2026-11-22, CI run 45060913943 at `6360406`: `plugin` (Kotlin unit tests) green on Linux, Windows and macOS; `verify` green for idea, webstorm, rider, pycharm and recommended; `ide-tests` Core and Setup green, only the known UI latency budgets of 0034 AC-007/AC-028 red.
- **Notes:** CI pending. Local, plain Kotlin only (kotlinc 2.0.21 + JUnit stubs, `/tmp`): `SettingsTableTest` +5 tests and 3 moved (AC-031 and the manifest-id test now say the assistant is stored), `CoreConfigTest` +1 and 1 moved (key `plugins`), new `ports/PluginAvailabilityTest` (7); 16 red first (`Not implemented` stubs), then 28 of 28 green. Built blind (CI decides): `ports/IdePlugins.kt` (`PluginQuery` glue and `PluginEvents : DynamicPluginListener`, registered in `plugin.xml` `<applicationListeners>`), `StudioProjectService.sendPlugins`, `StudioSettings.State.assistant`, the combo row in `StudioConfigurable`. Availability = `PluginManagerCore.isPluginInstalled(id) && PluginManagerCore.isLoaded(id)` (both public, `getPlugin` is not used; K-1's enabled check is replaced by `isLoaded`, which is public on 253 and master); after a plain unload the id counts as absent whatever the platform still lists, an unload for an update waits for the load. Option description line under the combo is a `JBLabel` updated by an action listener (the DSL comment has no safe setter). The probe config `featherspec-handover-probe.xml` is renamed `featherspec-terminal.xml` (the one optional `<depends>`, shared with T-011).

### T-010 — Route the assistant calls (Kotlin)

- **Covers:** AC-023
- **Do:** `HostRouter.kt`: group `ASSISTANT` for `assistant.claudeTerminal`, `assistant.openChat`; an `AssistantCalls`
  port in `StudioProjectService.kt` that answers "unavailable" until T-011 and T-012 fill it; argument checks (assistant,
  target, text without control characters). Tests `HostRouterTest.kt`.
- **Verify:** CI `plugin` green.
- [x] **Verified (T-010):** 2026-11-22, CI run 45060913943 at `6360406`: `plugin` (Kotlin unit tests) green on Linux, Windows and macOS; `verify` green for idea, webstorm, rider, pycharm and recommended; `ide-tests` Core and Setup green, only the known UI latency budgets of 0034 AC-007/AC-028 red.
- **Notes:** CI pending. Local, plain Kotlin only (kotlinc 2.0.21 + JUnit stubs): new `assistant/AssistantPortTest` (10 tests) and `HostRouterTest` (3 new, 2 moved: fake router gets the port, `DEFERRED_PREFIXES` is `actions.` again); 9 of the port tests red first (`Not implemented`), the router tests red as compile errors; then 34 of 34 (port + whole `HostRouterTest`) green. `assistant/AssistantPort.kt` is platform-free: `AssistantCalls` (`claudeTerminal(ClaudeRequest)`, `openChat(ChatAssistant): Boolean`), `UnavailableAssistantCalls` (send throws `the assistant calls are not available`, chat answers not found), argument checks throw `IllegalArgumentException` (the router answers the message): target `current`/`new`, non-empty text, no control character (`Character.isISOControl`, U+2028, U+2029; the message never holds the prompt), chat assistant `copilot`/`junie`. Replies: `{"ok":null}`, `{"ok":"opened"}`, `{"ok":"notFound"}`. `CallRouter` got `Group.ASSISTANT` and a last constructor parameter `assistant`; `StudioProjectService` passes `AssistantPort(assistantCalls)` with the placeholder field `assistantCalls` that T-011/T-012 replace. TypeScript untouched.

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
- [x] **Verified (T-011):** 2026-11-22, CI run 45060913943 at `6360406`: `plugin` (Kotlin unit tests) green on Linux, Windows and macOS; `verify` green for idea, webstorm, rider, pycharm and recommended; `ide-tests` Core and Setup green, only the known UI latency budgets of 0034 AC-007/AC-028 red. Behaviour in a real IDE with a real `claude` (readiness, typing without Enter) stays open for K-1 (T-001) and AC-027 (T-015).
- **Notes:** CI pending. Local, plain Kotlin only (kotlinc 2.0.21 + JUnit stubs): new `assistant/ClaudeTerminalTest` (27 tests: AC-015's table, readiness, the byte record of AC-014, late readiness types nothing, the 15 000 / 19 000 ms bounds on a fake clock, last-typed memory, the active root); 26 red first (`Not implemented`; the budget test was green at once, it only asserts constants), then 37 of 37 green with `AssistantPortTest`. Pure: `assistant/ClaudeTerminal.kt` (`ClaudeTabs`, `ClaudeReadiness`, `ActiveRoot`, `LastTyped`, `ClaudeSender` over the `TerminalAccess` port). Glue, written blind (CI decides), compile-checked here only against hand-made platform stubs: `assistant/TerminalGlue.kt` (typed only `TerminalToolWindowTabsManager.getInstance/tabs/createTabBuilder` as in the probe; tab, builder, view, shell integration, blocks, output model, send-text builder by reflection in `TerminalReflect.kt`; every call hops to the EDT with `invokeLater(nonModal)` and a 5000 ms wait, an abandoned call never runs), `assistant/IdeAssistantCalls.kt` (guards the Terminal plugin, turns a `LinkageError` into an error message so the router answers it). Decisions without K-1 data: (1) *readiness* = shell integration reports `claude` executing, the screen shows one of `? for shortcuts`, `│ >`, `shift+tab to cycle`, and the text has been quiet for 1000 ms; (2) a new tab waits at most 3000 ms for shell integration (else `terminal call failed: the terminal has no shell integration`), the whole send at most 19 000 ms and checks the clock before the paste; (3) *running command* = output status `ExecutingCommand` and `executedCommand` of the active (else last) block, working directory from that block (else the view's); (4) the *active root* is read from the core memory `featherspec-studio.activeProject` (the core remembers every resolved active project) and falls back to the IDE base path, because `assistant.claudeTerminal` carries only `{target, text}`; (5) focus after the paste is best effort and never fails the send. A wrong marker only makes new tabs fall back to Copy (A-005); AC-027 stays manual.

### T-012 — Open the chat for Copy for (Kotlin)

- **Covers:** AC-016, AC-017, AC-019
- **Do:** `assistant/ChatWindows.kt`: assistant → tool window IDs from K-1 (Copilot; Junie: AI Chat while
  `com.intellij.ml.llm` is available, else Junie), `ToolWindowManager.getToolWindow(id)?.activate`; answers `opened` or
  `notFound`; wired into `AssistantCalls`. Tests `ChatWindowsTest.kt`.
- **Verify:** CI `plugin` and `verify` green.
- [x] **Verified (T-012):** 2026-11-22, CI run 45060913943 at `6360406`: `plugin` (Kotlin unit tests) green on Linux, Windows and macOS; `verify` green for idea, webstorm, rider, pycharm and recommended; `ide-tests` Core and Setup green, only the known UI latency budgets of 0034 AC-007/AC-028 red. The real tool window IDs stay open for K-1 (T-001) and AC-028 (T-015).
- **Notes:** CI pending. Local, plain Kotlin only (kotlinc 2.0.21 + JUnit stubs): new `assistant/ChatWindowsTest` (8 tests), 8 of 8 red first (`Not implemented`), then 8 of 8 green. Pure: `assistant/ChatWindows.kt` (candidate IDs, first existing and available window opens once, a failing lookup or open counts as not found, no second window). Glue, blind, compile-checked here against hand-made stubs: `assistant/IdeChatWindows.kt` (`ToolWindowManager.getToolWindow(id)`, `isAvailable`, `activate(null)`, all on the EDT), `assistant/Edt.kt` (shared by `TerminalGlue`), `IdeAssistantCalls.openChat`. **The tool window IDs are guesses until K-1 (A-008):** Copilot `GitHub Copilot Chat`, `GitHub Copilot`; AI Chat `AIAssistant`, `AI Assistant`; Junie `Junie`. Junie opens AI Chat while `com.intellij.ml.llm` is available (no fallback to the Junie window, the core's place text says AI Chat), else the Junie window. A wrong ID only gives `Open <place> and paste …` (AC-019). The placeholder `UnavailableAssistantCalls` stays in `AssistantPort.kt` for tests and as a null object.

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
- [x] **Verified (T-013):** 2026-11-22 · `src/adapters/node/docs0035.test.ts` 9 tests (1 red first: the README sentence `FeatherSpec Studio | Assistant**`; the rest green at once with two negative controls) · `FEATHERSPEC_WRITE_PARITY=1 npx vitest run --project node src/adapters/node/parity.test.ts` 20 of 20 green, `parity.md` regenerated · `npx vitest run --project node --project webview`: 4315 green, 0 red (`docsScan`, `parity`, `sourceScan` included) · `npm run -s check-types` 0 · `npx eslint src --max-warnings 0` 0 · `node --test 'jetbrains/guards/*.test.mjs'` 68/68 · `AGENTS.md` 14991 bytes (untouched), `activeContext.md` 6826 bytes.
- **Notes:** the 60 PD-105 rows: 56 moved to `PD-108 (0035 AC-…; H-17)` with the criteria that now decide that behaviour (the 0024 to 0033 ranges split into single criteria in `parity-source.json`); 4 stay PD-105 with "PD-108 leaves this check as it is" because they are click tests or a measurement, not behaviour (0024 AC-019, 0026 AC-018, 0027 AC-018, 0027 AC-020). The 0035 rows of the matrix were already categorised and match the built code. Notes "*Amended by 0035 (PD-108)*": 0024 AC-003, 0029 AC-006, 0034 AC-018, §6.7 (with H-17), AC-031, AC-033, OP-024; `jetbrains/AGENTS.md` rule and `assistant/` package. README *JetBrains IDEs* replaces *Copy prompt only*; privacy line names the terminal tab; CHANGELOG bullets inside the 0.1.0 entry (docsScan reads that entry); `docsScan.test.ts` lists the new checklist heading and allows `Copy for Copilot`. Maps `core`, `hosts`, `jetbrains` reconciled; `systemPatterns.md` record (PD-108) and `techContext.md` optional Terminal dependency added. The `AGENTS.md` snapshot stays (its boundary line already covers host-run assistant commands); `/sdd-architecture-update` found no new module or entrypoint outside `src/hosts/embedded/assistants.ts`, `src/core/assistant/references.ts` and `jetbrains/.../assistant/`, which the maps now name. README mentions that Copilot and Junie may not read `#file:` and `@file:` as files (A-002, A-003) until AC-028.

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
| AC-001 | T-009 | `settings/{SettingsTable,StudioSettings,StudioConfigurable}.kt` | `SettingsTableTest.kt`; combo row CI/manual | built |
| AC-002 | T-009 | `StudioSettings.kt` (change events), `SettingsTable.changeEvents` | `SettingsTableTest.kt`; 500 ms by CI `ide-tests`/manual | built |
| AC-003 | T-001, T-007, T-009 | `src/hosts/embedded/{assistants,mirrors,ports}.ts`, `ports/{PluginAvailability,IdePlugins}.kt`, `plugin.xml` listener | `assistant0035.test.ts`, `PluginAvailabilityTest.kt`, `CoreConfigTest.kt` | built |
| AC-004 | T-002, T-007 | `src/core/assistant/assistants.ts`, `src/hosts/embedded/assistants.ts` | `assistantTable0035.test.ts`, `assistant0035.test.ts` (matrix) | verified |
| AC-005 | T-002, T-008, T-014 | `src/core/assistant/{assistants,offer}.ts`, `jetbrains.yml › shared-guard` | `assistantTable0035.test.ts`; CI `shared-guard` open | built |
| AC-006 | T-006, T-007 | `src/hosts/embedded/assistants.ts`, `src/core/assistant/sendView.ts` | `assistant0035.test.ts` (14 worlds, welcome, messages scan) | verified |
| AC-007 | T-004 | `src/core/assistant/welcome.ts`, `overviewView.ts`, `boardService.ts` | `emptyState0035.test.ts`, `emptyState0035.test.tsx` | verified |
| AC-008 | T-004, T-014 | same | `emptyState0035.test.*`; T-014 open | built |
| AC-009 | T-003 | `src/core/assistant/references.ts`, `src/hosts/embedded/assistants.ts` | `references0035.test.ts`, `assistant0035.test.ts` | verified |
| AC-010 | T-005, T-011 | `src/core/assistant/send.ts:copyFor` | `copyFor0035.test.ts` (Copy for); Claude part: the byte record of `ClaudeTerminalTest.kt` | built |
| AC-011 | T-007, T-011 | `src/hosts/embedded/{assistants,ports}.ts`, `assistant/{ClaudeTerminal,TerminalGlue,IdeAssistantCalls}.kt` | `assistant0035.test.ts`; `ClaudeTerminalTest.kt` | built |
| AC-012 | T-011 | `assistant/ClaudeTerminal.kt` (`ClaudeSender`, `ClaudeReadiness`, `ActiveRoot`), `TerminalGlue.kt` | `ClaudeTerminalTest.kt`; real `claude` manual (AC-027) | built |
| AC-013 | T-007, T-011 | `src/hosts/embedded/assistants.ts` (`causes`), `assistant/{ClaudeTerminal,IdeAssistantCalls}.kt` | `assistant0035.test.ts`; `ClaudeTerminalTest.kt`, `AssistantPortTest.kt` | built |
| AC-014 | T-010, T-011 | `assistant/AssistantPort.kt` (`hasControlCharacter`), `ClaudeTerminal.kt` | `AssistantPortTest.kt`, `ClaudeTerminalTest.kt` (byte record) | built |
| AC-015 | T-011 | `assistant/ClaudeTerminal.kt` (`ClaudeTabs`, `LastTyped`) | `ClaudeTerminalTest.kt` (fake tabs) | built |
| AC-016 | T-003, T-005, T-012 | `src/core/assistant/send.ts:copyFor`, `assistant/{ChatWindows,IdeChatWindows}.kt` | `copyFor0035.test.ts`, `ChatWindowsTest.kt`; IDs manual (A-008) | built |
| AC-017 | T-003, T-005, T-012 | `send.ts:copyFor`, `references.ts`, `assistant/ChatWindows.kt` | `copyFor0035.test.ts`, `assistant0035.test.ts`, `ChatWindowsTest.kt` | built |
| AC-018 | T-003 | `src/core/assistant/references.ts` | `references0035.test.ts` | verified |
| AC-019 | T-005, T-012 | `send.ts:copyFor`, `assistant/ChatWindows.kt` | `copyFor0035.test.ts`, `ChatWindowsTest.kt` | built |
| AC-020 | T-005, T-006 | `src/webview/ui/SendButton.tsx` | `SendButton0035.test.tsx`, `copyFor0035.test.ts` | verified |
| AC-021 | T-002, T-003, T-005, T-006, T-014 | `src/shared/protocol/assistantTexts.ts` | `copyFor0035.test.ts`, `SendButton0035.test.tsx`; T-014 open | built |
| AC-022 | T-006 | `src/core/assistant/sendView.ts:tipClosingOf` | `tipCopyFor0035.test.ts` | verified |
| AC-023 | T-007, T-010 | `src/hosts/embedded/ports.ts`, `panelSession.ts`, `HostRouter.kt`, `assistant/AssistantPort.kt` | `assistant0035.test.ts`, `HostRouterTest.kt`, `AssistantPortTest.kt` | built |
| AC-024 | T-001, T-009, T-011 | `plugin.xml` (one optional `<depends>`, `featherspec-terminal.xml`), `assistant/TerminalGlue.kt` | `pluginZip.mjs` guard; CI `verify` | built |
| AC-025 | T-013 | `docs/jetbrains/{parity-source.json,parity.md}` | `docs0035.test.ts`, `parity.test.ts` | verified |
| AC-026 | T-008, T-014 | `.github/workflows/jetbrains.yml`, `jetbrains/guards/{sharedGuard,renderedTexts}.mjs` | `sharedGuard.test.mjs`; CI `shared-guard` open | built |
| AC-027 | T-015 | — | manual: Gregor, Rider | open |
| AC-028 | T-015 | — | manual: Gregor, Rider and VS Code | open |
| AC-029 | T-013 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, `jetbrains/AGENTS.md`, `.specs/active/{0024,0034}*.md`, `.specs/done/0029*.md` | `docs0035.test.ts` (notes, README, byte limits) | verified |

## Session handoff

- **Done so far:** spec and plan (2026-11-22); stages 1 and 2 (T-001 probe built, T-002 to T-008), stage 3 built (T-009 to T-012, one commit each, CI pending); T-013 verified (parity, notes, docs, maps, Memory Bank); local gates at stage 3: node + webview 4306 green, guards 68/68, eslint and both `tsc` clean; plain Kotlin checked locally with kotlinc 2.0.21 and JUnit stubs (T-009 28, T-010 34, T-011 37, T-012 8 green); the platform glue is compile-checked here only against hand-made stubs.
- **Next action:** CI on the branch (Gregor pushes): `plugin` (all Kotlin of stage 3 and `HostContractTest`, `HostRouterTest`, `CoreConfigTest`, `SettingsTableTest`), `verify` (experimental Terminal API only through `TerminalToolWindowTabsManager`), `shared-guard`, `vscode-guards`. Then K-1's manual probe results (tool window IDs A-008, readiness markers A-005, enabled check A-007), then T-014 (final gates). If K-1 changes a value, README and the 0035 parity rows follow in the same change.
- **Open decisions:** the 18 proxies of spec §14; K-1's values (A-005 to A-009); J-1 (form A or C). Not decided by a measurement: readiness markers (`ClaudeReadiness.MARKERS`), tool window IDs (`ChatWindows.*_IDS`), the active root (core memory, else IDE base path; a TypeScript `root` argument would make it exact).
- **Kotlin must match the TypeScript:** `assistant.claudeTerminal` args `{target, text}`, answer `{"ok":null}` or `{error}`; the not-ready error text is exactly `Claude Code was not ready within 15000 ms`; `assistant.openChat` args `{assistant}`, answer `"opened"` or `"notFound"`; event `pluginsChanged {plugins: [ids]}` and `CoreConfig.plugins` carry the installed and loaded ids among `com.github.copilot`, `org.jetbrains.plugins.terminal`, `org.jetbrains.junie`, `com.intellij.ml.llm`.
- **Baseline:** 1765403c57c02381dae9acc5f2d4caae7abf7dfb
- **Environment:** Kotlin only in CI; TypeScript locally (`npx vitest run --project node --project webview`). The Preview harness is not required by this plan; the Copy for button reuses the Send classes.

## Amendments after UX review 20 (2026-11-23, work order 20-A items 1 to 3)

Spec §16 and AC-030 to AC-032; review [20](../../docs/ux-audit/20-review-0035-g0.md) §2. Part B (work order 20-B, Gregor 2026-11-23 "Alles ja"): B-3 with PD-110 (AC-033), S-1 to S-6 (AC-034 to AC-039), S-7 prepared only (AC-040, **K-1 pending**). Not part of this change: the budget rule (PD-111).

- **B-1 (AC-030), done:** red first, 10 TypeScript tests (4 literal text tests of Copy for, the toggletip, the main part, the log line) and the new `filePaths0035.test.ts` (4 red: texts, no `referenc`, settings table, README and CHANGELOG), 1 Kotlin test (`SettingsTableTest` AC-001 row texts); then green. Texts only in `assistantTexts.ts` and `SettingsTable.kt`; the syntaxes `#file:` and `@file:` are unchanged; README and CHANGELOG say the file paths; the other `reference` hits (release checklist AC-028 question, spec A-002 and A-003, `references.ts` identifiers) have nothing to do with Copy for wording and stay. Guards at the start commit: `sharedGuard` and `renderedTexts` identical (450 areas).
- **B-2 (AC-031), done:** red first, 7 of 10 webview tests (`SendButtonStarting0035.test.tsx`: texts, `waitsForStart`, aria state and focus, second click by mouse and menu items, same line in a second place, no answer frees after 30 s; opened, copied and the VS Code and Copy for DOM test were green at once) and 3 Kotlin tests (`ClaudeTerminalTest`: second Send during the wait, a second sender on the same gate, the gate opens again; compile-red on `SendGate`); then green. Webview: `sendBusy.ts` (module store keyed by assistant and line, released by the answer's token or after 30 000 ms), `SendButton.tsx`, `waitsForStart` in `protocol/assistant.ts` (JetBrains only: `claudeCode` with the target `current`; VS Code's table offers `new` only, asserted), two texts in `assistantTexts.ts`, one CSS rule (`cursor: progress`). No protocol change. Kotlin: `SendGate`, `ClaudeBusy` (message `a Send to Claude Code is still starting`) in `ClaudeTerminal.kt`; `IdeAssistantCalls.kt` holds one gate per project and passes it (the only line of platform glue that changed).
- **B-4 (AC-032), done, markers K-1 pending:** red first, 4 TypeScript tests (`assistant0035.test.ts`: literal texts, the two not-ready messages give the waiting warning and the waiting result text, the markers of the host table; the general-warning and copy-failed tests were green at once as negative controls) and 9 Kotlin tests (`ClaudeTerminalTest`, compile-red on `INPUT_MARKERS`, `WAITING_MARKERS`, `MARKERS_STATUS`, `waitingMessage`; the existing 15 000 ms test changed: the tab is now focused); then green (Kotlin 49 of 49, `AssistantPortTest`, `ChatWindowsTest`, `SettingsTableTest` etc. unchanged green). Platform-free: `ClaudeReadiness.hasInputBox` = last input marker after the last waiting marker (a dialog left in the scrollback does not block a later box), `ClaudeSender.requireInputBox` on the current screen of an existing tab (no quiet wait), `focusQuietly` before every not-ready throw, `ClaudeNotReady(message)` with `waitingMessage()` for the existing tab. TypeScript: `AssistantSpec.causes.waiting`, `SendFailure.waiting`, `waitingFallback` in `send.ts` (only a table with `waiting` reaches it; VS Code's table has none), two texts. Provisional markers: input `? for shortcuts`, `\u2502 >`, `shift+tab to cycle`; waiting `Do you trust the files in this folder`, `Yes, proceed`, `Enter to confirm`, `Select login method`, `Press Enter to continue`. Risk: with wrong provisional markers an existing Claude terminal is no longer typed into (copy plus waiting text) until K-1 delivers the real ones. Without the copy (clipboard fails) the general not-copied warning shows: the work order gives no text for it.
- **B-3 / PD-110 (AC-033), done:** red first, 3 of 4 TypeScript tests (`docs0035Review20B.test.ts`: the three README places literally, no line with the old promise, CHANGELOG; the negative control was green at once). README lines 5, 17 and 160 carry `Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Claude Code may start claude in a terminal tab when you click it.`; lines 50 and 62 (VS Code, Copy prompt and ways) keep `starts no agent` because they speak of Copy prompt, which starts nothing.
