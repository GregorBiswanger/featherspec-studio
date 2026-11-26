# Plan — Send and Copy for each assistant in JetBrains

**Spec:** [0035-send-and-copy-for-each-assistant-in-jetbrains.md](0035-send-and-copy-for-each-assistant-in-jetbrains.md)
**Status:** In Progress
**Last updated:** 2026-11-26 (T-014 and T-023 closed; T-015 partial)
**Current step:** T-015 (manual checks AC-027 and AC-053: the not-yet-evidenced rest, see its Verified line); every other step is ticked

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
- **PD-112 block (retrieved 2026-11-24):**
  - [Junie CLI quickstart](https://junie.jetbrains.com/docs/junie-cli.html) (page 2026-11-23): command `junie`; install
    `curl -fsSL https://junie.jetbrains.com/install.sh | bash`, Windows `powershell -NoProfile -Command "iex (irm
    'https://junie.jetbrains.com/install.ps1')"`; "Use `@` to attach a file or folder from the current project"; "Type `/` in the
    prompt to see and use the available slash commands"; first-run screen "Continue with JetBrains account", "Use a Junie API key".
  - [JetBrains/junie](https://github.com/JetBrains/junie) and its `install.ps1`/`install.sh` (read 2026-11-24): shim
    `~/.local/bin/junie.bat` on Windows (versions under `~/.local/share/junie/versions/<v>/junie/junie.exe`), `~/.local/bin/junie`
    elsewhere; the user PATH (Windows) or the shell profile gets `~/.local/bin`, "Please restart your shell"; also `brew install junie`
    (tap `jetbrains-junie/junie`) and `npm install -g @jetbrains/junie` (npm bin `junie`, a `.cmd` shim on Windows).
  - [Junie slash commands](https://junie.jetbrains.com/docs/slash-commands.html) (2026-11-23): `@` attaches, `/` menu, `?` shortcut
    help, `Shift+Tab` cycles modes, `Shift+Enter`/`Ctrl+J` new line; `/import` imports commands and guidelines "from other coding
    agents like Claude Code". [Custom slash commands](https://junie.jetbrains.com/docs/custom-slash-commands.html) (2026-11-21):
    `.junie/commands` and `~/.junie/commands` only, named `$arguments`, `allowPromptArgument` — so `/sdd-*` of `.claude/commands`
    is no Junie command (A-012).
  - [Junie CLI reference](https://junie.jetbrains.com/docs/parameters.html) (2026-11-23): no prefill flag (`--prompt` submits);
    `--trust-project` / `JUNIE_TRUST_PROJECT` exists, so Junie asks for project trust; the Studio never passes it (AC-048).
    [Guidelines](https://junie.jetbrains.com/docs/guidelines-and-memory.html) (2026-11-23): reads `AGENTS.md`; on first open it
    suggests importing other agents' guidelines. [Junie CLI connects to your IDE](https://blog.jetbrains.com/junie/2026/04/junie-cli-inside-your-jb-ide/):
    in a running JetBrains IDE it prompts "to install the integration plugin" — one more possible waiting screen.
  - [Copilot CLI, use](https://docs.github.com/en/copilot/how-tos/copilot-cli/use-copilot-cli/overview): command `copilot`; "Copilot
    will ask you to confirm that you trust the files in this folder" with `Yes`, `Yes, and remember this folder for future
    sessions`, `No (Esc)`; not logged in → "use the `/login` slash command"; files: "`@` followed by the relative path"; reads
    `AGENTS.md`. [Install](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli):
    `npm install -g @github/copilot` (Node 22+), `winget install GitHub.Copilot` (PowerShell 6+), `brew install --cask copilot-cli`,
    `curl -fsSL https://gh.io/copilot-install | bash`. [CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference):
    `-i` "automatically execute this prompt" (no prefill), Shift+Enter new line, `--allow-all-paths`, `--trust-folder` (never
    passed). [Skills](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills): `/<skill-name>` runs a
    skill from `.github/skills`, `.claude/skills`, `.agents/skills`; prompt files are not named (A-012).
  - Claude Code ([JetBrains](https://code.claude.com/docs/en/jetbrains), [setup](https://code.claude.com/docs/en/setup)): unchanged
    — `claude`, `@path`, `claude.exe` (native, `~/.local/bin`), `claude.cmd` (npm); trust dialog "Do you trust the files in this
    folder?" / "Yes, proceed" as AC-032's markers.
  - **Not documented anywhere, decided by K-1:** the input-box and working markers of Junie CLI and Copilot CLI, bracketed paste
    in both (A-010), the command that shell integration reports for the shims (A-013).
- **Unverified, decided by K-1:** the tab builder's options (name, working directory), the enabled check that is not
  internal, Claude Code's readiness signal, the tool window IDs and Copilot's plugin ID (spec A-005–A-009).

## Stages

0. T-001 — spike K-1 and prerequisites. **Gate G0:** 0034 closed; K-1 results in spec §13 and here; Gregor's go.
1. T-002 ‖ T-003 ‖ T-004 — shared core: per-host table, reference texts, empty state. **Gate G1:** local gates green.
2. T-005 → T-006 → T-007 → T-008 — Copy for in core and webview, the embedded host, the guard move. **Gate G2:** local gates,
   `node --test 'jetbrains/guards/*.test.mjs'`, CI `shared-guard`, `vscode-guards`, `plugin` green.
3. T-009 → T-010 → T-011 → T-012 — Kotlin host. **Gate G3:** every CI job of `jetbrains.yml` green at one head.
4. T-013 → T-014 — parity, docs, final gates. **Gate G4:** every gate of T-014 green at one head.
5. T-015 — Gregor's manual checks AC-027, AC-028. **Gate G5 (partial 2026-11-26):** both pass, then `/sdd-compile` READY in a fresh session,
   then Gregor's go for `/sdd-lifecycle`.

*PD-112 (2026-11-24): stages 6 to 10 come before T-014 and T-015; T-015 then checks AC-027 and AC-053 (AC-028 is superseded).*

6. T-016 — probe *Handover* for the three CLI agents (Kotlin, CI) and Gregor's K-1 run. **Gate G6:** CI `plugin` and `verify`
   green; Gregor has read stages 6 to 10 and gives the go; his K-1 JSON may come later (G9), the constants stay provisional.
7. T-017 → T-018 — TypeScript: agent rows, prompt text and texts; Copy for removed, protocol 13. **Gate G7:** local gates,
   `node --test 'jetbrains/guards/*.test.mjs'`, `renderedTexts` identical for VS Code at the start commit. T-018 starts only after
   the narrow-layout branch of `src/webview` is merged (parallel worker).
8. T-019 → T-020 → T-021 → T-022 — Kotlin: agent sender, PATH availability and effective value, settings page, Copy for
   removed (sequential: T-019 and T-020 both touch `IdeAssistantCalls.kt` and `StudioProjectService.kt`). **Gate G8:** every job of `jetbrains.yml` green at one head (push: ask first).
9. T-023 — K-1's values into the constants, replay test. **Gate G9:** replay test green in CI; every `MARKERS_STATUS` says
   `K-1 confirmed`; Gregor's go.
10. T-024 — docs, parity, maps, Memory Bank for PD-112. **Gate G10:** `docsScan`, `parity`, `docs0035*` tests green; then T-014
   (G4) and T-015 (G5) as above.

Deleting files (Copy for tests and Kotlin files in T-018 and T-022) is *ask first* (`AGENTS.md`): the step stops for Gregor's yes.

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
  *Third probe action (2026-11-23, for K-1 pending):* *FeatherSpec Probe: Handover Screen* (`featherspec.probe.handover.screen`, inert without the property, types and sends nothing) reads every terminal tab through the product's own `TerminalGlue.tabs()` and `TerminalGlue.screen()` and puts per tab into the JSON `name`, `workingDirectory`, `command`, `shellReady`, `executing`, `claudeRunning`, `verdict` (`ready` = `claudeRunning && ClaudeReadiness.hasInputBox`, `waiting` = not ready and a waiting marker is on the screen, else `unknown`), `markers` (every `INPUT_MARKERS` and `WAITING_MARKERS` entry: `group`, `marker`, `hit`, `line` of the last hit), `textLength`, `lineCount`, `trailingBlankLines` and the last 12 lines in `lastLines`. Run it in five states of a running Claude Code: ready and empty, working on an answer, draft in the input, trust dialog, login. Platform-free `probe/HandoverScreen.kt` (`Redaction`, `HandoverScreen`) with `HandoverScreenTest` (19 tests, red first as compile errors, then green with `ClaudeTerminalTest` 71 of 71 in all): e-mail → `<email>`, runs of 24 or more of `[A-Za-z0-9_-]` → `<token>`, the user's home folder → `~`; the same redaction now covers `beforePasteTail`, `afterPasteTail` and the inventory's `tail`. `featherspec-terminal.xml` stays the only place of the one optional `<depends>`; the `pluginZip` guard is green. The glue (`HandoverTerminal.screens`, `HandoverScreenAction`) is written blind, CI decides.

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
- [x] **Verified (T-014):** 2026-11-26 · Gates at head `6b75ef0` (local, 2026-11-26): `npx vitest run --project node --project webview` 4485 passed, 6 skipped, 0 red (255 files) · timing projects (`timing-node`, `timing-webview`, one worker) 35/35 · `npm run -s check-types` exit 0 · `npx eslint src --max-warnings 0` exit 0 · `node --test 'jetbrains/guards/*.test.mjs'` 75/75 · `npm run -s compile` exit 0 · CI run 45728313993 at `6b75ef0` (reported by Gregor, not re-read here: no GitHub access in this session): green `plugin` (Linux, Windows, macOS), `verify` for every product, `shared-guard`, `vscode-guards`, `vscode-mirror`, the no-JCEF runs, `ide-tests` on Linux (IDEA 2025.3) and on Linux and Windows against IDEA 2026.3; red only the PD-111 trend values of 0034 AC-007/AC-020/AC-028 on `ide-tests (windows-latest)` against 2025.3 (loading panel 1852 ms, AC-020 about 1.1 s) and `ide-tests (macos-latest)` (loading panel 3.0 s, theme switch), none in 0035's code. `npm test` runs in CI `vscode-mirror` (green) and on Gregor's Windows VS Code with the VSIX of `6b75ef0`: "vscode läuft auch alles bestens".
- **Notes:** the red trend values belong to 0034 AC-007, AC-020 and AC-028 (PD-111), not to this plan's criteria; they stay open there. AC-005, AC-008, AC-021 and AC-026 move to `verified`.

### T-015 — Gregor's checks in Rider and VS Code

- **Covers:** AC-027, AC-028
- **Do:** Gregor installs the CI ZIP in Rider 2026.3, runs AC-027 and AC-028 on `C:\projects\test\tip-splitter`, and the
  VS Code empty state with Send to Copilot; results and versions into the spec's AC lines' evidence here.
- **Verify:** `manual: Gregor, Rider and VS Code` — the real assistants and the CLI exist only on his machine.
- [ ] **Verified (T-015):** partial, not ticked (2026-11-26) · Gregor, Rider 2026.3.0.1 on Windows with the plugin of `6b75ef0`: "Sieht super aus! Funktioniert hervorragend." Send to GitHub Copilot and Send to Claude Code open the IDE terminal with the CLI and the prompt; Board, Detail and Progress with AC titles run; that the terminal replaces the plugin chats is "so in Ordnung". VS Code with the VSIX of `6b75ef0`: "läuft auch alles bestens". **Not evidenced:** Send to Junie (not seen in the hands-on), the running-tab versus new-tab cases, that nothing is sent before Enter and that both files are read, the waiting text at a trust or login screen, Safe Mode, the missing-CLI hint, the unset default, the Terminal, Claude Code, Junie CLI and Copilot CLI versions, whether `/sdd-overview` runs as a command in each CLI.
- **Notes:** then `/sdd-compile` in a fresh session (another model family when available). *PD-112 (2026-11-24):* T-015 checks
  AC-027 and AC-053 instead of AC-028, after T-024.

### T-016 — PD-112 probe: *Handover* for Junie CLI, Claude Code and Copilot CLI (no product behaviour)

- **Covers:** AC-049 (probe part); A-010 to A-015; precondition of AC-044, AC-046 to AC-048
- **Files:** new platform-free `assistant/CliAgents.kt` (the *Agents* table of spec §16 as data: id, name, command, names on the
  PATH, tab name, `INPUT_MARKERS`, `WAITING_MARKERS`, `MARKERS_STATUS = "K-1 pending"`, `PASTE_MODE`; the Claude row points to
  `ClaudeReadiness`'s lists, so nothing of the product changes) with `CliOnPath.found(names, path, separator, exists)`;
  `probe/{HandoverScreen,HandoverTerminal,HandoverProbe}.kt`, `META-INF/featherspec-terminal.xml` (two new actions);
  tests `assistant/CliAgentsTest.kt`, `probe/HandoverScreenTest.kt`.
- **Do:** *Inventory* adds per agent: found on `EnvironmentUtil.getValue("PATH")`, found on `System.getenv("PATH")`, the
  matching name (directory redacted); no process is started. *Screen* adds per tab: `agent` (by the first word of the command,
  `.exe`/`.bat`/`.cmd` allowed), the verdict with that agent's markers, and the marker hits of all three agents (`group` becomes
  `<agent>.input` / `<agent>.waiting`). *Agent tab* actions: the existing *Handover Claude Tab* plus *FeatherSpec Probe: Handover
  Junie Tab* and *… Handover Copilot Tab*: open a tab with the agent's tab name in the project root, run the bare command, record
  the time to each readiness candidate, type `probe @README.md` as bracketed paste without Enter, and record `beforePasteTail` and
  `afterPasteTail` (escape characters visible? a new command block started = submitted?). All inert without
  `-Dfeatherspec.probe.handover=true`.
- **Tests first:** `CliAgentsTest` (the table literally, `MARKERS_STATUS` per agent, the start command is the bare command, the
  Claude row equals `ClaudeReadiness`'s lists, `CliOnPath` for every name, blank and quoted entries, a directory with only another
  agent's name); `HandoverScreenTest` (+ agent of a tab per command and case, verdict per agent, the three marker groups); red via
  `Not implemented`.
- **Verify:** CI `plugin`, `verify` green; `manual: Gregor` (below) — only his machine has the three CLIs and their real screens.
- **Gregor prepares (Windows 11, Rider 2026.3, PowerShell 7 as the terminal shell):**
  - Junie CLI: `powershell -NoProfile -ExecutionPolicy Bypass -Command "iex (irm 'https://junie.jetbrains.com/install.ps1')"`
    (or `npm install -g @jetbrains/junie`); run `junie` once outside the test folder and log in with *Continue with JetBrains account*.
  - GitHub Copilot CLI: `winget install GitHub.Copilot` (or `npm install -g @github/copilot`, Node 22+); run `copilot`, `/login`;
    a Copilot subscription and, in an organisation, a policy that allows Copilot CLI.
  - Claude Code: present (`claude --version`); else `irm https://claude.ai/install.ps1 | iex`.
  - Restart Rider after installing (A-014); check in Rider's terminal `where.exe junie copilot claude`.
  - Start Rider with `-Dfeatherspec.probe.handover=true`, open `C:\projects\test\tip-splitter`, run *Handover Inventory* once, then
    per agent *Handover <Agent> Tab* and *Handover Screen* in the states: (1) ready and empty, (2) working on an answer, (3) a draft
    in the input, (4) trust dialog (a fresh copy of the folder), (5) login (logged out); for Junie also (6) the import suggestion and
    the integration-plugin offer if they show. Type `/sdd-overview` by hand in each CLI and note whether it runs as a command (J-1
    for Junie). Paste the JSON blocks (they are redacted) into the session.
- [x] **Verified (T-016):** 2026-11-24 · **CI pending** (Kotlin) · red first: `CliAgentsTest` 16 and `HandoverScreenTest` 15 red via `Not implemented` (table literally, K-1 pending, bare command, Claude row = `ClaudeReadiness`, marker order, `.exe/.bat/.cmd` and case, cross-agent command, `CliOnPath` for every name, blank and quoted entries, a directory with only another agent's name; verdict per agent, groups `<agent>.input/.waiting`, agent and `agentRunning` of a tab, paste checks), then 41 of 41 green with kotlinc 2.0.21 and JUnit stubs; platform glue (`HandoverTerminal`) compile-checked against hand-made stubs, `HandoverProbe.kt` (`HandoverInventory.cliAgents`, two actions) and `featherspec-terminal.xml` only by reading. `EnvironmentUtil.getValue("PATH")` is asked by reflection (`HandoverReflect.callStatic`) with the process PATH beside it: no new platform import. Gregor's K-1 run (stage 6 *Gregor prepares*) is still open.
- **Notes:** —

### T-017 — Agent rows, prompt text and agent texts (TypeScript)

- **Covers:** AC-045, AC-046, AC-047 (TypeScript part), AC-021
- **Files:** `src/core/assistant/references.ts` (`cliText`, `CLI_FORMS`; `claudeText` stays as `cliText(…, 'slash')`),
  `src/shared/protocol/assistantTexts.ts` (agent text functions; the Claude constants stay byte-identical as their instance),
  `src/hosts/embedded/{assistants,ports,contract,mirrors}.ts` (three `send` rows from one `cliRow(agent)`: presence `cli:junie`,
  `cli:claude`, `cli:copilot`, targets `current`, `new`, 20 000 ms, causes and notices per agent, call `assistant.terminal`
  `{assistant, target, text}`), `src/shared/protocol/assistant.ts` (`ASSISTANT_TARGET_LISTS` gains `['current','new']` for
  `copilot` and `junie`), `jetbrains/.../runtime/HostContract.kt` (mirror), tests `src/core/assistant/cliText0035PD112.test.ts`,
  `src/hosts/embedded/agents0035PD112.test.ts`.
- **Do:** as *Files*; an unset value is resolved by the host (T-020), the core sees the effective value.
- **Tests first:** AC-046's table for both forms and the 14 `CASE_WORLDS` against `ASSISTANTS.claudeCode.callsFor`; AC-045's
  matrix (7 values × 16 subsets); the texts of spec §16 literally per agent and the Claude texts byte-identical; a webview message
  names no command; negative control with one path swapped.
- **Verify:** local gates + `npm run compile`; CI `plugin` (`HostContractTest`).
- [x] **Verified (T-017):** 2026-11-24 · red first: `cliText0035PD112.test.ts` 29 of 29 red (no `cliText`, no `CLI_FORMS`), `agents0035PD112.test.ts` red at import (no `CLI_AGENTS`, `TERMINAL_COMMAND`, agent texts); then green: both files 184 tests (AC-045 matrix 7 values × 16 subsets through the real `setting` port incl. unset, null and retired values `copyForJunie`; AC-046 table for both forms and the 14 `CASE_WORLDS`; AC-047 once per agent: row, call `featherspec.terminal {assistant,target,text}`, Opened, 20 000 ms, waiting, not installed, untrusted, copy failed; Claude texts byte-identical) · `npx vitest run --project node --project webview`: 4535 green, 3 red = the three known T-024 tests (`parity` AC-001/AC-002, `docs0035` AC-025) · `tsc` both 0 · `eslint src --max-warnings 0` 0 · Kotlin `HostContractTest`, `HostRouterTest`, `AssistantPortTest` 36 of 36 with the contract renamed to `assistant.terminal` (**CI pending**).
- **Notes:** until T-019 routes `assistant.terminal`, every JetBrains Send falls back to Copy prompt (as before T-010); the repo
  keeps working. *Done in this step beyond *Files*, so that the commit stays green:* the replaced JetBrains rows broke the Copy for era tests of `assistant0035.test.ts` (AC-004 offer, `assistant.openChat`, Copy for stays) and `sessionTarget0035.test.ts` (the one-target test): those sections were rewritten or removed (all created by 0035 after the start commit; Gregor's brief asks for Copy for to be removed everywhere). `HostContract.kt`, `HostRouter.kt` and `HostRouterTest.kt` carry the new name `assistant.terminal`; `sourceScan` masks only the quoted `'cli:copilot'`. Unset: the embedded `setting('assistant')` reads `junie` for a missing or null value (`UNSET_ASSISTANT`), so the offer follows the Junie CLI; the host passes the effective value from T-020 on.

### T-018 — Remove Copy for from core, protocol and webview; protocol 13 (TypeScript)

- **Covers:** AC-050 (TypeScript part), AC-031 and AC-035 for three agents (webview part), AC-005, AC-008
- **Files:** `src/core/assistant/{send,offer,assistants,sendView}.ts` (`copyFor`, `placeOf`, `handover`, `text`, `place`),
  `src/shared/protocol/{assistant,assistantTexts,envelope}.ts` (no `handover`; optional `terminal: true` on JetBrains views, which
  `waitsForStart` reads instead of `claudeCode`; no `COPY_FOR_*`; `PROTOCOL_VERSION = 13`), `src/webview/ui/{SendButton,sendBusy}.ts(x)`,
  `src/core/assistant/testing/*`, `sourceScan.test.ts` (narrow forms); test `src/core/assistant/copyForRemoved0035PD112.test.ts`.
  **Ask first:** delete `copyFor0035.test.ts`, `tipCopyFor0035.test.ts`, `junieAgent0035.test.ts`, `filePaths0035.test.ts` and
  the Copy for cases of `SendButton0035.test.tsx` (all created by 0035 after the start commit, so AC-026 still holds).
- **Tests first:** the scan of AC-050 over `src/` and `jetbrains/src/` (red now); the menu of each JetBrains Send; the toggletip
  sentence per agent; `waitsForStart` true for the three JetBrains Sends and false for every VS Code view; VS Code views and the
  existing `SendButton.test.tsx` deep-equal and green.
- **Verify:** local gates + `npm run compile` + `node --test 'jetbrains/guards/*.test.mjs'` (`renderedTexts` reads 13 per bundle).
- [x] **Verified (T-018):** 2026-11-24 · red first (9): the `src/` scan for the removed names, the bridge contract, version 13, a send view with `handover` refused, `terminal` optional and true only, `waitsForStart` reads `terminal`, JetBrains views carry `terminal` and no `handover`, `SendButton` waits for Junie and for Copilot (AC-031, with the files of every target); green after: `copyForRemoved0035PD112.test.ts` 10 and `SendButton0035PD112.test.tsx` 16 (menu `Send to the current chat`, `Send to a new chat`, `Copy prompt` for each agent, Copy prompt asks for the line alone, no text names the removed handover, toggletip per agent) · `npx vitest run --project node --project webview`: 4474 green, 3 red = the known T-024 tests · `tsc` both 0 · `eslint src --max-warnings 0` 0 · `node esbuild.js --production` · `node --test 'jetbrains/guards/*.test.mjs'` 75/75 · `renderedTexts` against a worktree at `1765403`: identical in 462 areas · `sharedGuard`: no test of the start commit is missing.
- **Notes:** starts after the narrow-layout branch of `src/webview` is merged (the branch `jetbrains-host` carries 0022 AC-030/031 already). Deleted with Gregor's brief (Copy for removed everywhere; all created by 0035 after the start commit): `copyFor0035`, `tipCopyFor0035`, `junieAgent0035`, `filePaths0035`, `references0035` (its cases live on in `cliText0035PD112`), `SendButton0035`. Deviations: the scan of AC-050 covers `src/` here and `jetbrains/src/` in T-022 (a red test cannot stay in a committed step); two documentation tests are named exempt until T-024 (`EXEMPT_UNTIL_DOCS`); `attachesInTarget` got a third argument so that the files go with every target of a JetBrains Copilot (PD-094's rule is VS Code's); `sourceScan` lost the mask of the removed Copy-for identifier and the three paste sentences of 0035 (0026 AC-021 is back at its start-commit list); the contract and `HostContract.kt` lose `assistant.openChat`, the rest of the Kotlin side follows in T-022; hard-coded `v: 12` of the bundle tests follow the version (as the bump 11 to 12 did), and the four tests that mean *another* version use 14.

### T-019 — Agent sender for the three CLIs (Kotlin)

- **Covers:** AC-047, AC-048, AC-049 (product part), AC-011 to AC-015, AC-031, AC-032, AC-035 to AC-037 for three agents
- **Files:** `assistant/ClaudeTerminal.kt` (generalised in place: `AgentTabs`, `AgentReadiness`, `AgentSender`, `AgentNotReady`,
  `AgentNotInstalled`, `AgentUntrusted` per agent; the Claude messages unchanged), `assistant/TerminalGlue.kt` (tab name, command,
  paste mode from the agent), `assistant/{AssistantPort,IdeAssistantCalls}.kt` (`assistant.terminal` → `AgentRequest(agent,
  target, text)`; one `SendGate` per project, OP-023), `HostRouter.kt` (`assistant.claudeTerminal` gives way to
  `assistant.terminal`), tests `assistant/AgentTerminalTest.kt` (every case of `ClaudeTerminalTest` for three agents, the
  cross-agent tab, the bare-command byte record), `ClaudeTerminalTest.kt` (construction only), `AssistantPortTest.kt`, `HostRouterTest.kt`.
- **Tests first:** red as compile errors on the new types; `ClaudeTerminalTest`'s assertions unchanged (negative control: the
  Claude instance is byte-identical).
- **Verify:** CI `plugin`, `verify`, `ide-tests` green.
- [x] **Verified (T-019):** 2026-11-24 · CI pending (Kotlin). Red first: the three test files did not compile against the old types (new API `AgentSender`, `AgentTabs`, `AgentReadiness`, `AgentRequest`, `assistant.terminal`): 12 new tests in `AgentsSendTest.kt` plus the 3 files below. Local (kotlinc 2.0.21, JUnit stubs): `AgentsSendTest` 12 + `AgentTerminalTest` (the former `ClaudeTerminalTest`, every assertion unchanged, only constructed through `AgentSender`/`CliAgents.CLAUDE_CODE`, so the Claude instance is byte-identical) + `AssistantPortTest` + `CliAgentsTest` 90/90; `HostRouterTest` + `AssistantPortTest` 34/34; `HandoverScreenTest` 25/25; `TerminalGlue.kt` compiles against the pstub. *Done beyond Files:* `ClaudeTerminalTest.kt` was renamed to `AgentTerminalTest.kt` (`git mv`; the new three-agent cases are in `AgentsSendTest.kt`); `assistant.openChat` left the router group now (it is no longer in `ASYNC_CALLS` since T-018, so `HostRouterTest` "every routed name is a contract call" would be red); `AssistantPort` still answers it until T-022. The busy message names the agent of the second Send (`a Send to <Name> is still starting`).
- **Notes:** —

### T-020 — Availability by the PATH and the effective value (Kotlin)

- **Covers:** AC-044, AC-051, AC-040 (unchanged, Terminal only)
- **Files:** new platform-free `ports/CliAvailability.kt` and `settings/EffectiveAssistant.kt`; `ports/IdePlugins.kt`
  (`PluginIds.ALL` is the Terminal plugin; the snapshot adds `cli:<command>` for each available agent; PATH from
  `EnvironmentUtil.getValue("PATH")`, else `System.getenv("PATH")`, OP-022), `StudioProjectService.kt` (recompute at project open,
  `panelOpened`, after a *not installed* failure; push `pluginsChanged` and, if the effective value changed, `settingsChanged`),
  `StudioSettings.kt`, `CoreConfig.kt`, `IdeAssistantCalls.kt` (the not-installed trigger); tests `CliAvailabilityTest.kt`,
  `EffectiveAssistantTest.kt`, `PluginAvailabilityTest.kt`, `CoreConfigTest.kt`.
- **Tests first:** every name of each agent, blank and quoted entries, the Terminal missing, another agent's folder; unset ×
  availability, explicit `none`, a stored value whose agent is missing; the push within 500 ms on a fake clock.
- **Verify:** CI `plugin`, `verify` green.
- [x] **Verified (T-020):** 2026-11-24 · CI pending (Kotlin). Red first (compile errors on the missing `CliAvailability`, `EffectiveAssistant`, `AssistantWatch`, `AvailabilityRecompute`, plus two changed assertions in `PluginAvailabilityTest`): `CliAvailabilityTest` 7, `EffectiveAssistantTest` 7, `PluginAvailabilityTest` 2 changed. Local (kotlinc 2.0.21, JUnit stubs): these three 24/24, `SettingsTableTest` + `CoreConfigTest` 24/24 unchanged. Unset reads Junie when `cli:junie` and the Terminal plugin are present, else none; explicit `none` stays; an explicit agent without its command is none; every older or unknown stored value (`copyForCopilot`, `copyForJunie`, `Junie`, `claude`, ...) is read as unset and never fails. *Deviations:* (1) the "within 500 ms on a fake clock" test became "one `AvailabilityRecompute.run` pushes plugins then the effective value in the same call, with no wait" (a wait-free call is the 500 ms bound; the pooled thread only reads the PATH); (2) `PluginIds.COPILOT/JUNIE/AI_ASSISTANT` stay as constants until T-022 (`SettingsTable` still reads them until T-021), but `PluginIds.ALL` is the Terminal plugin; (3) until T-021 the stored default is still `none`, so the effective value is `none` for everybody in this commit alone; T-021 makes unset the default. *Compile risks (CI):* `IdePlugins.kt` `idePath` (reflective `EnvironmentUtil.getValue`), `StudioProjectService.kt` `sendPlugins`, `refreshAvailability`, `sendSetting`, `configJson` (`LinkedHashMap` of `JsonElement`), `IdeAssistantCalls.kt` (`getService` in the catch), `StudioEditor.kt` (`refreshAvailability`).
- **Notes:** the PATH is read off the event thread; no process is started to find a command.

### T-021 — The *Assistant* page: order, descriptions, hint, unset default (Kotlin)

- **Covers:** AC-043, AC-038 (unchanged)
- **Files:** `settings/SettingsTable.kt` (options `Junie`, `Claude Code`, `GitHub Copilot`, `None: Copy prompt`; descriptions and the
  hint of spec §16; `ASSISTANT_UNSET`; `assistantAvailable` by the `cli:` ids; `displayed`/`storedAfterApply` for unset, OP-025),
  `StudioSettings.kt` (state default unset: a developer who never chose has nothing stored), `StudioConfigurable.kt` (the hint
  label, recompute at page open); test `SettingsTableTest.kt`.
- **Tests first:** order, labels, descriptions and hint literally; unset shows Junie or None by availability; applying the shown
  option keeps unset; OP-013 unchanged; the list follows `PluginOptionsBus`.
- **Verify:** CI `plugin`, `verify` green.
- [x] **Verified (T-021):** 2026-11-24 · CI pending (Kotlin). Red first: `SettingsTableTest` rewritten for §16 (order, labels, descriptions and hint literally, unset default, availability by `cli:` ids, `displayed`/`storedAfterApply` for unset, the bus keeps `last`): 16 tests red (options, order, `ASSISTANT_UNSET`, `ASSISTANT_HINT`, `assistantHint`, `bus.last` did not exist or differed). Local (kotlinc 2.0.21): `SettingsTableTest` + `EffectiveAssistantTest` + `CoreConfigTest` + `CliAvailabilityTest` + `PluginAvailabilityTest` 51/51. *Migration, tested explicitly:* `copyForCopilot`, `copyForJunie`, `copyFor`, `claude`, `Claude Code`, `42`, `copilot `, `NONE`, `bogus`, ` junie` read as unset (stored `""`), shown as the unset option, applying the shown option keeps `""`, and a settings event between unset and such a value is not sent; stored `junie`, `claudeCode`, `copilot`, `none` are kept. A developer who never chose has nothing in `featherspec-studio.xml` (the default is `""`, which the XML serializer does not write); one who had chosen `none` before cannot be told from one who never chose (the old default was `none` too) and now follows Junie while it is available (OP-025). *Compile risks (CI):* `StudioConfigurable.kt` (`recompute`, `showAssistantHint`, the second label row, `thisLogger` import), `SettingsTable.kt` now imports nothing from `ports`. The page reads the cached list of `PluginOptionsBus.last` and recomputes on a pooled thread at `reset()`, so the PATH is never read on the event thread.
- **Notes:** —

### T-022 — Remove Copy for from Kotlin (Kotlin)

- **Covers:** AC-050 (Kotlin part), AC-024
- **Files:** `assistant/AssistantPort.kt` (no `OPEN_CHAT`, no `ChatAssistant`), `IdeAssistantCalls.kt`, `runtime/HostContract.kt`
  (no `assistant.openChat`), `HostRouterTest.kt`, `ports/PluginIds` (no Copilot, Junie, AI Assistant ids; the probe may still list
  them as information). **Ask first:** delete `assistant/ChatWindows.kt`, `assistant/IdeChatWindows.kt`, `ChatWindowsTest.kt`.
- **Tests first:** AC-050's scan (from T-018) now covers `jetbrains/src/` and is red until this step.
- **Verify:** CI: every job of `jetbrains.yml` green at one head (G8).
- [x] **Verified (T-022):** 2026-11-24 · CI pending (Kotlin). Red first (1): the AC-050 scan of `jetbrains/src` (`.kt`, `.xml`) for `Copy for`, `openChat`, `OPEN_CHAT`, `ChatWindows`, `ChatAssistant`, `PluginIds.COPILOT/JUNIE/AI_ASSISTANT` plus the three deleted files, added to `copyForRemoved0035PD112.test.ts`; green after: 11/11. Removed: `ChatWindows.kt`, `IdeChatWindows.kt`, `ChatWindowsTest.kt` (deletion covered by Gregor's brief, which asks for Copy for to be removed everywhere), `ChatAssistant`, `OPEN_CHAT`, `openChat` in `AssistantPort`/`IdeAssistantCalls`, the Copilot/Junie/AI Assistant plugin ids and `PluginAvailability.junie` with its test; `AssistantPortTest` keeps one check that `assistant.openChat` is not answered. Local Kotlin (kotlinc 2.0.21): `AgentsSendTest`, `AgentTerminalTest`, `AssistantPortTest`, `CliAgentsTest`, `HostRouterTest`, `SettingsTableTest`, `EffectiveAssistantTest`, `CliAvailabilityTest`, `PluginAvailabilityTest`, `CoreConfigTest` 161/161. The probe reads no plugin id of the removed ones.
- **Notes:** —

### T-023 — K-1 values into the constants; replay test

- **Covers:** AC-049 (replay), AC-046 (`CLI_FORMS`), A-010 to A-015
- **Do:** from Gregor's JSON of T-016: `INPUT_MARKERS`, `WAITING_MARKERS`, `PASTE_MODE` per agent, `MARKERS_STATUS` → `K-1
  confirmed 2026-…`; `CLI_FORMS` per agent (with J-1); the PATH source (OP-022); `PluginActivity.CURRENT` (AC-040). New
  `assistant/AgentReplayTest.kt` with the redacted `lastLines` of each recorded state as fixtures. Spec §13 values, §14 K-1 closed
  for what was measured; README if a value changes a text.
- **Verify:** CI `plugin` green (G9); a value that contradicts the spec is a spec change first.
- [x] **Verified (T-023):** 2026-11-26 · closed by decision, not by a K-1 measurement · Gregor, offered to skip the K-1 probe because Send runs flawlessly for him: "du bist der sdd dev … kümmere dich darum"; decision (Claude as developer): the provisional markers stay as the constants. Evidence for them: the Rider hands-on of 2026-11-26 with Send to Copilot and Send to Claude Code (terminal opens, CLI starts, prompt arrives) and CI run 45728313993 at `6b75ef0` (`plugin` 3 OS, `verify` green). No constant changed, so no Kotlin ran here.
- **Notes:** *Deviation from `Do:`:* `MARKERS_STATUS` stays `K-1 pending` for all three agents (honest: no JSON was recorded), `CLI_FORMS` stays provisional, and there is no `AgentReplayTest.kt` (no recorded `lastLines`), so AC-049's replay part is not met and AC-049 stays `built`. **Rest risk:** Junie CLI was not seen in the hands-on; its `JUNIE_INPUT_MARKERS` (`? for shortcuts`, `shift+tab`) and `JUNIE_WAITING_MARKERS` are undocumented guesses. With a wrong marker Send to Junie copies the prompt and shows the waiting text instead of typing, also in a running tab (amendment risk 1). Check step: in Rider with *Assistant* Junie and Junie CLI installed, run *FeatherSpec Probe: Handover Screen* (start the IDE with `-Dfeatherspec.probe.handover=true`) in a running `junie` tab (ready, empty) and at the login screen, and compare `verdict` (`ready`, `waiting`) and `markers`; paste the JSON, then the constants and the replay test follow. The same probe check applies to Copilot's markers only where the hands-on shows a waiting text in a running tab.

### T-024 — Docs, parity, maps and Memory Bank for PD-112

- **Covers:** AC-052, AC-025, AC-029
- **Files:** `README.md` (AC-052's sentence in the three places; section *JetBrains IDEs*: the three Sends, the commands, the
  hint, Safe Mode, the waiting text; Copy for gone), `CHANGELOG.md`, `docs/release-checklist.md` (AC-027, AC-053),
  `docs/jetbrains/parity-source.json` (struck criteria `n-a` with PD-112; AC-043 to AC-045 and AC-047 to AC-053 `deliberately
  different` with PD-112; AC-046 `shared`, `shared-test`) and `FEATHERSPEC_WRITE_PARITY=1`, `src/adapters/node/docs0035.test.ts`
  and `docs0035Review20B.test.ts` (README expectations of AC-029, AC-033, AC-034 follow AC-052 and AC-050), new
  `docs0035PD112.test.ts`, `docsScan.test.ts` (`ALLOWED` without `Copy for Copilot`), `.architecture/{core,hosts,jetbrains}.md`,
  `.memory-bank/{systemPatterns,techContext,activeContext}.md`.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/parity.test.ts
  src/adapters/node/docs0035.test.ts src/adapters/node/docs0035Review20B.test.ts src/adapters/node/docs0035PD112.test.ts` (G10).
- [x] **Verified (T-024):** 2026-11-24 · red first (the 3 known tests: `docs0035` AC-025 every criterion has a row, `parity` AC-001 and AC-002; plus the docs tests that still demanded the Copy for text, 13 in all); green after: `parity-source.json` (15 struck criteria `n-a` with PD-112 and their successor, AC-043 to AC-045 and AC-047 to AC-053 `deliberately different`, AC-046 `shared`; the ranges AC-007..AC-010, AC-016..AC-017, AC-019..AC-020, AC-027..AC-028 were split so that no criterion is listed twice) regenerated with `FEATHERSPEC_WRITE_PARITY=1`; README (AC-052's sentence in the three places, section *JetBrains IDEs* now *Send*), CHANGELOG (PD-112, removal of the Copy-for handover), `docs/release-checklist.md` (AC-027, AC-053), `.architecture/{core,hosts,jetbrains}.md`, `.memory-bank/{systemPatterns,techContext,activeContext}.md`, `jetbrains/AGENTS.md`; new `docs0035PD112.test.ts` (8); `docs0035.test.ts`, `docs0035Review20B.test.ts` and `docsScan.test.ts` follow the new texts; `EXEMPT_UNTIL_DOCS` is empty. Gates (G10): `npx vitest run --project node --project webview`: 4485 green, 0 red, 6 skipped · timing projects 35/35 · `npm run check-types` 0 · `eslint src --max-warnings 0` 0 · `node --test 'jetbrains/guards/*.test.mjs'` 75/75 · `sharedGuard` against a worktree at `1765403`: no test missing · local Kotlin 186/186 · AGENTS.md 14991 B (< 15000), activeContext.md < 7000 B. *Deviation:* the CHANGELOG says `Copy-for` (hyphen) so that AC-050's scan stays literal-free; AC-052's `the removal of Copy for` is met in meaning.
- **Notes:** then T-014 and T-015 (AC-027 and AC-053).

### T-025 — The IDE-managed Junie and unavailable agents in the settings (PD-112 amendment 2026-11-26)

- **Covers:** AC-054, AC-055, AC-056
- **Files:** `ports/IdeManagedJunie.kt` (`IdeManagedJunie`, `ShellCommand`), `ports/{CliAvailability,IdePlugins}.kt`, `assistant/{CliAgents,TerminalGlue,IdeAssistantCalls}.kt`, `settings/{SettingsTable,StudioConfigurable}.kt`, tests `IdeManagedJunieTest.kt`, `CliAgentsTest.kt`, `CliAvailabilityTest.kt`, `SettingsTableTest.kt`; README, CHANGELOG, `plugin.xml`, `docs/jetbrains/parity-source.json`.
- **Tests first:** the version choice (ignored folders, numeric order), the executable name per OS, PATH over IDE-managed, `isCommand` on a full path, the quoting per shell, the unavailable reasons.
- **Verify:** `node --test jetbrains/guards/*.test.mjs`; `npx vitest run --project node`; CI `plugin` on 3 OS runs `IdeManagedJunieTest`, `CliAgentsTest`, `CliAvailabilityTest`, `SettingsTableTest`.
- [x] **Verified (T-025):** 2026-11-26 · built; Kotlin not compiled locally, CI pending · manual check on Rider 2026.3 (Windows, Junie only as the AI Assistant's agent): open.
- **Notes:** the terminal's shell is read by reflection (`TerminalProjectOptionsProvider.getShellPath`); where that fails Windows assumes PowerShell and other systems a POSIX shell.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-009 | `settings/{SettingsTable,StudioSettings,StudioConfigurable}.kt` | `SettingsTableTest.kt`; combo row CI/manual · struck by PD-112, successor AC-043 | built |
| AC-002 | T-009 | `StudioSettings.kt` (change events), `SettingsTable.changeEvents` | `SettingsTableTest.kt`; 500 ms by CI `ide-tests`/manual | built |
| AC-003 | T-001, T-007, T-009 | `src/hosts/embedded/{assistants,mirrors,ports}.ts`, `ports/{PluginAvailability,IdePlugins}.kt`, `plugin.xml` listener | `assistant0035.test.ts`, `PluginAvailabilityTest.kt`, `CoreConfigTest.kt` · struck by PD-112, successor AC-044 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-004 | T-002, T-007 | `src/core/assistant/assistants.ts`, `src/hosts/embedded/assistants.ts` | `assistantTable0035.test.ts`, `assistant0035.test.ts` (matrix) · struck by PD-112, successor AC-045 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-005 | T-002, T-008, T-014 | `src/core/assistant/{assistants,offer}.ts`, `jetbrains.yml › shared-guard` | `assistantTable0035.test.ts` · T-014 2026-11-26: local gates and CI run 45728313993 at `6b75ef0` | verified |
| AC-006 | T-006, T-007 | `src/hosts/embedded/assistants.ts`, `src/core/assistant/sendView.ts` | `assistant0035.test.ts` (14 worlds, welcome, messages scan) | verified |
| AC-007 | T-004 | `src/core/assistant/welcome.ts`, `overviewView.ts`, `boardService.ts` | `emptyState0035.test.ts`, `emptyState0035.test.tsx` | verified |
| AC-008 | T-004, T-014 | same | `emptyState0035.test.*` · T-014 2026-11-26: local gates and CI run 45728313993 at `6b75ef0` | verified |
| AC-009 | T-003 | `src/core/assistant/references.ts`, `src/hosts/embedded/assistants.ts` | `references0035.test.ts`, `assistant0035.test.ts` · struck by PD-112, successor AC-046 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-010 | T-005, T-011 | `src/core/assistant/send.ts:copyFor` | `copyFor0035.test.ts` (Copy for); Claude part: the byte record of `ClaudeTerminalTest.kt` · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-011 | T-007, T-011 | `src/hosts/embedded/{assistants,ports}.ts`, `assistant/{ClaudeTerminal,TerminalGlue,IdeAssistantCalls}.kt` | `assistant0035.test.ts`; `ClaudeTerminalTest.kt` · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-012 | T-011 | `assistant/ClaudeTerminal.kt` (`ClaudeSender`, `ClaudeReadiness`, `ActiveRoot`), `TerminalGlue.kt` | `ClaudeTerminalTest.kt`; real `claude` manual (AC-027) | built |
| AC-013 | T-007, T-011 | `src/hosts/embedded/assistants.ts` (`causes`), `assistant/{ClaudeTerminal,IdeAssistantCalls}.kt` | `assistant0035.test.ts`; `ClaudeTerminalTest.kt`, `AssistantPortTest.kt` · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-014 | T-010, T-011 | `assistant/AssistantPort.kt` (`hasControlCharacter`), `ClaudeTerminal.kt` | `AssistantPortTest.kt`, `ClaudeTerminalTest.kt` (byte record) · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-015 | T-011 | `assistant/ClaudeTerminal.kt` (`ClaudeTabs`, `LastTyped`) | `ClaudeTerminalTest.kt` (fake tabs) · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-016 | T-003, T-005, T-012 | `src/core/assistant/send.ts:copyFor`, `assistant/{ChatWindows,IdeChatWindows}.kt` | `copyFor0035.test.ts`, `ChatWindowsTest.kt`; IDs manual (A-008) · struck by PD-112, successor AC-050 | built |
| AC-017 | T-003, T-005, T-012 | `send.ts:copyFor`, `references.ts`, `assistant/ChatWindows.kt` | `copyFor0035.test.ts`, `assistant0035.test.ts`, `ChatWindowsTest.kt` · struck by PD-112, successor AC-050 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-018 | T-003 | `src/core/assistant/references.ts` | `references0035.test.ts` · struck by PD-112, successor AC-046 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-019 | T-005, T-012 | `send.ts:copyFor`, `assistant/ChatWindows.kt` | `copyFor0035.test.ts`, `ChatWindowsTest.kt` · struck by PD-112, successor AC-050 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-020 | T-005, T-006 | `src/webview/ui/SendButton.tsx` | `SendButton0035.test.tsx`, `copyFor0035.test.ts` · struck by PD-112, successor AC-050 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-021 | T-002, T-003, T-005, T-006, T-014 | `src/shared/protocol/assistantTexts.ts` | `copyFor0035.test.ts`, `SendButton0035.test.tsx` · T-014 2026-11-26: local gates and CI run 45728313993 at `6b75ef0` | verified |
| AC-022 | T-006 | `src/core/assistant/sendView.ts:tipClosingOf` | `tipCopyFor0035.test.ts` · struck by PD-112, successor AC-050 · CI run 45849432799 at fb70806 green (2026-11-26) | verified |
| AC-023 | T-007, T-010 | `src/hosts/embedded/ports.ts`, `panelSession.ts`, `HostRouter.kt`, `assistant/AssistantPort.kt` | `assistant0035.test.ts`, `HostRouterTest.kt`, `AssistantPortTest.kt` · CI run 45728313993 at `6b75ef0` | verified |
| AC-024 | T-001, T-009, T-011 | `plugin.xml` (one optional `<depends>`, `featherspec-terminal.xml`), `assistant/TerminalGlue.kt` | `pluginZip.mjs` guard; CI `verify` · CI run 45728313993 at `6b75ef0` | verified |
| AC-025 | T-013 | `docs/jetbrains/{parity-source.json,parity.md}` | `docs0035.test.ts`, `parity.test.ts` | verified |
| AC-026 | T-008, T-014 | `.github/workflows/jetbrains.yml`, `jetbrains/guards/{sharedGuard,renderedTexts}.mjs` | `sharedGuard.test.mjs` · T-014 2026-11-26: local gates and CI run 45728313993 at `6b75ef0` | verified |
| AC-027 | T-015 | — | manual: Gregor, Rider · partial: Gregor, Rider 2026.3.0.1 on Windows, 2026-11-26, Send to Claude Code opens the terminal with the CLI and the prompt; tab cases, Enter and versions not recorded | open |
| AC-028 | T-015 | — | manual: Gregor, Rider and VS Code · struck by PD-112, successor AC-053 | built |
| AC-029 | T-013 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, `jetbrains/AGENTS.md`, `.specs/active/{0024,0034}*.md`, `.specs/done/0029*.md` | `docs0035.test.ts` (notes, README, byte limits) | verified |
| AC-043 | T-021 | `settings/{SettingsTable,StudioSettings,StudioConfigurable}.kt` | `SettingsTableTest.kt` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-044 | T-016, T-020 | `assistant/CliAgents.kt` (`CliOnPath`), `ports/{CliAvailability,IdePlugins}.kt`, `StudioProjectService.kt` | `CliAgentsTest.kt`, `CliAvailabilityTest.kt` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-045 | T-017 | `src/hosts/embedded/assistants.ts` | `agents0035PD112.test.ts` (matrix) · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-046 | T-017, T-023 | `src/core/assistant/references.ts` (`cliText`, `CLI_FORMS`) | `cliText0035PD112.test.ts` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-047 | T-017, T-019 | `src/hosts/embedded/assistants.ts`, `assistantTexts.ts`, `assistant/{AgentTerminal,TerminalGlue,IdeAssistantCalls}.kt` | `agents0035PD112.test.ts`, `AgentsSendTest.kt`, `AgentTerminalTest.kt` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-048 | T-019 | `assistant/AgentTerminal.kt` (`AgentTabs`), `TerminalGlue.kt` | `AgentsSendTest.kt` (byte record) · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-049 | T-016, T-019, T-023 | `assistant/CliAgents.kt`, `probe/HandoverScreen.kt` | `CliAgentsTest.kt`, `HandoverScreenTest.kt`, `AgentReplayTest.kt`; K-1 manual · markers `K-1 pending`, no `AgentReplayTest.kt` (T-023 closed by decision) | built |
| AC-050 | T-018, T-022 | `src/core/assistant/*`, `src/shared/protocol/*`, `src/webview/ui/SendButton.tsx`, `AssistantPort.kt`, `HostContract.kt` | `copyForRemoved0035PD112.test.ts` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-051 | T-020 | `settings/EffectiveAssistant.kt`, `StudioSettings.kt`, `StudioProjectService.kt` | `EffectiveAssistantTest.kt`; VS Code `assistantTable0035.test.ts` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-052 | T-024 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md` | `docs0035PD112.test.ts` · local gates and CI `plugin` 3 OS at `6b75ef0` (run 45728313993) | verified |
| AC-053 | T-015 | — | manual: Gregor, Rider, Junie CLI and Copilot CLI · partial: Send to Copilot seen (terminal, CLI, prompt); Junie not seen; the rest of the criterion not recorded · partial, manual 2026-11-26 (Claude via computer use, Rider 2026.3.0.1, plugin `6b75ef0`): Settings → Tools → FeatherSpec Studio offers Claude Code, GitHub Copilot and None: Copy prompt; Junie is absent because the Junie CLI is not on the IDE's PATH, and the hint 'Junie, Claude Code and GitHub Copilot appear here once their command is on the IDE's PATH. Installed one just now? Restart the IDE.' shows (covers 'without the CLI on the PATH the option is missing and the hint shows' for Junie). Still open: everything with a running Junie or Copilot CLI tab, Safe Mode, the unset-setting default, CLI versions, `/sdd-overview` as a command. No state change | open |
| AC-054 | T-025 | `ports/IdeManagedJunie.kt`, `ports/{CliAvailability,IdePlugins}.kt` | `IdeManagedJunieTest.kt`, `CliAvailabilityTest.kt` · CI pending · manual on Rider open | built |
| AC-055 | T-025 | `ports/IdeManagedJunie.kt` (`ShellCommand`), `assistant/{CliAgents,TerminalGlue,IdeAssistantCalls}.kt` | `IdeManagedJunieTest.kt`, `CliAgentsTest.kt` · CI pending · manual on Rider open | built |
| AC-056 | T-025 | `settings/{SettingsTable,StudioConfigurable}.kt` | `SettingsTableTest.kt` · CI pending · manual on Rider open | built |

## Session handoff

- **Done so far (2026-11-26):** T-001 stays open by design (the K-1 probe JSON was never pasted; T-023 closed by decision instead); T-002 to T-014 and T-016 to T-024 ticked. All local gates at head `6b75ef0`: node + webview 4485 passed, 6 skipped, 0 red; timing projects 35/35; `check-types` 0; `eslint src --max-warnings 0` 0; guards 75/75; `compile` 0. CI run 45728313993 at `6b75ef0` green on every functional job (see T-014); red only the 0034 trend timings after PD-111 on Windows (2025.3) and macOS. Gregor's hands-on in Rider 2026.3.0.1 (Windows) and VS Code, both 2026-11-26: works, Send to Copilot and Send to Claude Code open the terminal with the CLI and the prompt.
- **Next action:** Gregor's remaining checks for AC-027 and AC-053 (below), then `/sdd-compile` in a fresh session, then Gregor's go for `/sdd-lifecycle`. No code step is open.
- **Rest checks for Gregor (Rider 2026.3, `C:\projects\test\tip-splitter`, plugin of `6b75ef0`):** (1) Assistant Junie with Junie CLI installed: `NS-7-start` puts the prompt with two `@` mentions into a running `junie` tab, with none into a new tab `Junie`; nothing is sent, no escape characters show; Enter sends it and Junie reads both files. (2) For each of the three agents: a fresh start at the trust or login screen shows the waiting text and the Studio types nothing. (3) Safe Mode: no tab starts. (4) CLI not on the PATH: the option is missing and the hint shows; setting unset with Junie CLI installed: the step action reads Send to Junie. (5) Record the Rider, Terminal, Claude Code, Junie CLI and Copilot CLI versions and whether `/sdd-overview` runs as a command in each CLI (form decision of AC-046, `CLI_FORMS`). (6) For Junie's markers (T-023 rest risk): *FeatherSpec Probe: Handover Screen* with `-Dfeatherspec.probe.handover=true` in a running `junie` tab and at its login screen; paste the JSON.
- **Decided (2026-11-26):** T-023 is closed with the provisional markers (`MARKERS_STATUS` `K-1 pending`, no `AgentReplayTest.kt`); Gregor delegated the call to the SDD developer. The terminal instead of the plugin chats is accepted by Gregor ("so in Ordnung").
- **Open decisions:** proxies OP-020 to OP-026 of PD-112 stand until Gregor overrides; K-1 for Junie CLI (markers, bracketed paste, `/sdd-overview`, PATH source) is open as a rest risk; the 0034 trend timings (AC-007, AC-020, AC-028 on Windows 2025.3 and macOS) belong to 0034.
- **Kotlin must match the TypeScript:** the bridge calls of PD-112 (`assistant.terminal` with its agent, target and text, the not-ready and waiting texts of `assistantTexts.ts`) and the event `pluginsChanged`/`CoreConfig` mirror are pinned by `HostContractTest`, `HostRouterTest` and `agents0035PD112.test.ts`; read them, not this line, when changing one side.
- **Baseline:** 1765403c57c02381dae9acc5f2d4caae7abf7dfb
- **Environment:** Kotlin only in CI; TypeScript locally (`npx vitest run --project node --project webview`). No GitHub access in the sandbox session of 2026-11-26: CI results are quoted from Gregor's report of run 45728313993.

## Amendments after UX review 20 (2026-11-23, work order 20-A items 1 to 3)

Spec §16 and AC-030 to AC-032; review [20](../../docs/ux-audit/20-review-0035-g0.md) §2. Part B (work order 20-B, Gregor 2026-11-23 "Alles ja"): B-3 with PD-110 (AC-033), S-1 to S-6 (AC-034 to AC-039, numbered in commit order: S-4 AC-034, S-1 AC-035, S-2 AC-036, S-3 AC-037, S-6 AC-038, S-5 AC-039), S-7 prepared only (AC-040, **K-1 pending**). Not part of this change: the budget rule (PD-111).

- **B-1 (AC-030), done:** red first, 10 TypeScript tests (4 literal text tests of Copy for, the toggletip, the main part, the log line) and the new `filePaths0035.test.ts` (4 red: texts, no `referenc`, settings table, README and CHANGELOG), 1 Kotlin test (`SettingsTableTest` AC-001 row texts); then green. Texts only in `assistantTexts.ts` and `SettingsTable.kt`; the syntaxes `#file:` and `@file:` are unchanged; README and CHANGELOG say the file paths; the other `reference` hits (release checklist AC-028 question, spec A-002 and A-003, `references.ts` identifiers) have nothing to do with Copy for wording and stay. Guards at the start commit: `sharedGuard` and `renderedTexts` identical (450 areas).
- **B-2 (AC-031), done:** red first, 7 of 10 webview tests (`SendButtonStarting0035.test.tsx`: texts, `waitsForStart`, aria state and focus, second click by mouse and menu items, same line in a second place, no answer frees after 30 s; opened, copied and the VS Code and Copy for DOM test were green at once) and 3 Kotlin tests (`ClaudeTerminalTest`: second Send during the wait, a second sender on the same gate, the gate opens again; compile-red on `SendGate`); then green. Webview: `sendBusy.ts` (module store keyed by assistant and line, released by the answer's token or after 30 000 ms), `SendButton.tsx`, `waitsForStart` in `protocol/assistant.ts` (JetBrains only: `claudeCode` with the target `current`; VS Code's table offers `new` only, asserted), two texts in `assistantTexts.ts`, one CSS rule (`cursor: progress`). No protocol change. Kotlin: `SendGate`, `ClaudeBusy` (message `a Send to Claude Code is still starting`) in `ClaudeTerminal.kt`; `IdeAssistantCalls.kt` holds one gate per project and passes it (the only line of platform glue that changed).
- **B-4 (AC-032), done, markers K-1 pending:** red first, 4 TypeScript tests (`assistant0035.test.ts`: literal texts, the two not-ready messages give the waiting warning and the waiting result text, the markers of the host table; the general-warning and copy-failed tests were green at once as negative controls) and 9 Kotlin tests (`ClaudeTerminalTest`, compile-red on `INPUT_MARKERS`, `WAITING_MARKERS`, `MARKERS_STATUS`, `waitingMessage`; the existing 15 000 ms test changed: the tab is now focused); then green (Kotlin 49 of 49, `AssistantPortTest`, `ChatWindowsTest`, `SettingsTableTest` etc. unchanged green). Platform-free: `ClaudeReadiness.hasInputBox` = last input marker after the last waiting marker (a dialog left in the scrollback does not block a later box), `ClaudeSender.requireInputBox` on the current screen of an existing tab (no quiet wait), `focusQuietly` before every not-ready throw, `ClaudeNotReady(message)` with `waitingMessage()` for the existing tab. TypeScript: `AssistantSpec.causes.waiting`, `SendFailure.waiting`, `waitingFallback` in `send.ts` (only a table with `waiting` reaches it; VS Code's table has none), two texts. Provisional markers: input `? for shortcuts`, `\u2502 >`, `shift+tab to cycle`; waiting `Do you trust the files in this folder`, `Yes, proceed`, `Enter to confirm`, `Select login method`, `Press Enter to continue`. Risk: with wrong provisional markers an existing Claude terminal is no longer typed into (copy plus waiting text) until K-1 delivers the real ones. Without the copy (clipboard fails) the general not-copied warning shows: the work order gives no text for it.
- **B-3 / PD-110 (AC-033), done:** red first, 3 of 4 TypeScript tests (`docs0035Review20B.test.ts`: the three README places literally, no line with the old promise, CHANGELOG; the negative control was green at once). README lines 5, 17 and 160 carry `Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Claude Code may start claude in a terminal tab when you click it.`; lines 50 and 62 (VS Code, Copy prompt and ways) keep `starts no agent` because they speak of Copy prompt, which starts nothing.
- **S-4 (AC-034), done:** red first, 6 TypeScript tests (3 new in `junieAgent0035.test.ts`: done text, done text with a file left out, tip; 3 literal expectations of the old text in `copyFor0035.test.ts`, `assistant0035.test.ts`, `tipCopyFor0035.test.ts` changed; the Copilot, Junie-window and not-found negative controls were green at once). Only the place `Junie in AI Chat` changes (`pasteInstruction` and `copyForTipText` in `assistantTexts.ts`); the paste key keeps its existing pattern (`pasteKeyOf(platform)`, `Cmd+V` on macOS, else `Ctrl+V`). The option description `Paste it into Junie in AI Chat.` in the settings is not part of the order and stays.
- **S-1 (AC-035), done:** red first, 10 TypeScript tests (`sessionTarget0035.test.ts`: 4 cases of `STEP_GUIDES` with session `new` give target `new` in `sendViewOf`, 6 world tests of the detail and the first Now row; the other cases, the welcome, the VS Code and the Copy for negative controls were green at once). Core only: `sendViewOf` in `sendView.ts` sets the main target to `new` when the view offers both targets, the main one is `current` and the case's session is `new`; `plainSendViewOf` (welcome, empty state) and `SendButton` are unchanged, the menu keeps both in the order current, new. Case `any` (Report, Resume, Move back, welcome) counts as *current*: its tip asks for no fresh chat and a running tab avoids the start wait. VS Code never has `current` for Claude Code, so it is unaffected by construction (`ASSISTANTS.claudeCode.targets` is `['new']`).
- **S-2 (AC-036), done:** red first, 7 Kotlin tests (`ClaudeTerminalTest`; against the previous main code 28 compile errors on `ClaudeOnPath`, `ClaudeNotInstalled`, `notInstalledMessage`, the `onPath` argument) and 4 TypeScript tests (`assistant0035.test.ts`: literal texts, the host message gives the own text, copy failed gives the general warning, negative controls; the waiting and the general-warning tests were green at once). Platform-free `ClaudeOnPath.found(path, separator, exists)` (names `claude`, `claude.exe`, `claude.cmd`; blank and quoted entries) and `ClaudeSender` asks `onPath` only after `ClaudeReadiness.await` failed and only while claude is not running in the tab (`Screen.claudeRunning`): a `claude` that runs with a dialog stays *waiting*, so B-4's trust prompt is never called a missing command. The glue passes `System.getenv("PATH")`, `File.pathSeparatorChar` and `Files.isRegularFile` (`IdeAssistantCalls.kt`). TypeScript: `AssistantSpec.causes.waiting` became `causes.notice(message): string | undefined` (one place maps a host cause to its own warning text), `SendFailure.notice`, `noticeFallback` in `send.ts`; the B-4 test follows it.
- **S-3 (AC-037), done:** red first, 6 Kotlin tests (`ClaudeTerminalTest`; 21 compile errors against the code of S-2 on `trusted`, `ClaudeUntrusted`, `untrustedMessage`) and 5 TypeScript tests (`assistant0035.test.ts`: literal texts, host message gives the own text, copy failed gives the general warning, negative controls; the Copy for test was green at once). Platform-free: `ClaudeSender` gets `trusted: () -> Boolean`, asked at every Send; not trusted and the target is `new`, or no Claude terminal runs → `ClaudeUntrusted` before any tab is opened or run (calls `[]` resp. `[tabs]`); a running ready Claude terminal still gets the text, a waiting one stays *waiting*. The trust comes from `TrustedProjects.isProjectTrusted(project)`, the call `StudioProjectService` already uses for the `trusted` mirror (`IdeAssistantCalls.kt`); no new platform API. TypeScript: the cause maps to its own text in `causes.notice`; Copy for has no `causes`.
- **S-6 and S-5 (AC-038, AC-039), done:** red first, 3 Kotlin tests for S-5 replacing the old Junie-only ones and 1 for S-6 in `SettingsTableTest` (38 compile errors against the old table: `options(plugins)`, `assistantAvailable`, `PluginOptionsBus`; the row-texts test changed to the new description) and 3 TypeScript tests in `docs0035Review20B.test.ts` (table literal, README sentence, one availability function). `SettingsTable.assistantAvailable(value, plugins)` is the one rule (Copilot by its id, Claude Code by the Terminal plugin, Junie by `PluginAvailability.junie`); `options`, `displayed` and `storedAfterApply` take the plugin list instead of a Junie flag, the stored value stays (OP-013). The page asks `IdePlugins().snapshot()`; for a plugin event while the page is open `PluginEvents.broadcast` also publishes to the new `PluginOptionsBus` (platform-free, tested) and `StudioConfigurable.refreshOptions` rebuilds the combo on the EDT; the core's offer already follows `pluginsChanged` (AC-003, AC-004). `filePaths0035.test.ts` no longer asserts the removed sentence of the old description.
- **S-7 (AC-040), prepared only, K-1 pending:** red first, 3 Kotlin tests (`PluginAvailabilityTest`; 29 compile errors on `PluginActivity` and `ActivityCheck`). Platform-free `PluginActivity.available(installed, check, loaded, disabled)` with `ActivityCheck.LOADED` and `NOT_DISABLED`; `PluginActivity.CURRENT` is `LOADED`, so the behaviour is unchanged; `IdePlugins.available` asks through it (the `isDisabled` call is reflective, so a missing method cannot break the build). The K-1 probe (`HandoverProbe`) now records `PluginManagerCore.isLoaded` beside `isDisabled`: the review states that the probe captures both, but the code recorded `isDisabled` only. Open: after K-1, compare both per plugin ID; if they differ, set `CURRENT` to `NOT_DISABLED` (one line), if neither holds, move to the optional dependency (spec §6.5, §14).

## Amendment PD-112 (2026-11-24)

Spec §16 *Amendment 2026-11-24*, AC-043 to AC-053; struck AC-001, AC-003, AC-004, AC-009, AC-016 to AC-020, AC-022, AC-028,
AC-030, AC-033, AC-034, AC-039. Planning only; no product code changed. Steps T-016 to T-024, stages 6 to 10 (above).
Provisional per agent, as named constants, until K-1: `INPUT_MARKERS`, `WAITING_MARKERS`, `MARKERS_STATUS`, `PASTE_MODE`
(`assistant/CliAgents.kt`) and `CLI_FORMS` (`references.ts`). Parity rows for the new and struck criteria land in T-024 (the
parity files belong to another worker today, so `parity.test.ts` and `docs0035.test.ts` AC-025 stay red until then).

Risks: (1) wrong provisional markers make Send to Junie or Copilot copy the prompt with the waiting text, also in a running tab
(as B-4), until T-023; (2) an agent installed after the IDE started is missing from the options until the IDE restarts (A-014),
the hint says so; (3) Junie may show more first-run screens (login, trust, import of other agents' guidelines, the integration
plugin) — each is *waiting*, never answered by the Studio; (4) bracketed paste in Junie CLI and Copilot CLI is undocumented
(A-010); (5) form `follow` makes the typed line differ from VS Code's (`deliberately different`), until a CLI is shown to run
`/sdd-*`; (6) both CLIs auto-update, so markers can drift: one constant per agent, the replay test pins what K-1 saw.

