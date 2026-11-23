# Map: jetbrains (IntelliJ Platform host)
# last reconciled: 2026-11-22 (0035, ADR-004)

## Internal pattern
- `jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/` — root package: `StudioProjectService` (per project: core
  runtime, observables, selection), `StudioStartup`, `HostRouter` (every bridge call by group), `CoreConfig`, `HostTexts`, `TrustWatch`.
  Pure logic in plain classes; `com.intellij` imports only in thin glue. Subpackages:
- `runtime/` — bridge to the hidden JCEF core page: `HostContract` (mirror of `contract.ts`), `BridgeFrames`, `ReplyBatch`,
  `CorePage`, `CoreRuntime`/`CoreState` (buffered scripts, 60 s start timer, Unsupported/Suspended/Failed).
- `jcef/` — `JcefAvailability`, `PluginResources` (the exact URL allow-list), `PluginRequestHandler` (serves `core.html`, panel HTML).
- `assistant/` (0035) — `AssistantPort` (argument checks, `AssistantCalls`), pure `ClaudeTerminal` (Claude tab choice, readiness with the provisional marker lists `INPUT_MARKERS`/`WAITING_MARKERS` (K-1 pending), the waiting check, `ClaudeOnPath` (S-2: `claude`, `claude.exe`, `claude.cmd` on the IDE's PATH, asked only after the timeout), the Safe Mode rule (S-3: `trusted` is asked at every Send; no new tab, no `claude` while untrusted), `SendGate` against a second Send during the wait, paste text) and `ChatWindows` (candidate tool window IDs); glue `TerminalGlue`/`TerminalReflect` (Reworked Terminal API, reflective, optional dependency), `IdeChatWindows`, `IdeAssistantCalls`, `Edt`.
- `ports/` — host ports behind routed calls: `PluginAvailability` (+ `PluginActivity`, the swappable "installed and active" strategy, K-1 pending; `IdePlugins` glue, `PluginEvents` listener; pushes `plugins`, `pluginsChanged`), `FilePorts`, `FileUris`, `ProjectFolders` (PD-103), `UnsavedDocuments` (+ `IdeUnsavedDocuments` glue: reads see unsaved editor documents; `SpecWatch` reports their edits), `RootWatcher`/`SpecWatch` (own
  watcher plus VFS events), `FileRuntimeMedium`, `StoreLocation`, `UiMemory(State)`, `EditorOpen`, `SystemCalls` (clipboard, editor).
- `panel/` — editor tab: `StudioEditor(Provider)`, `StudioFile`, `PanelShim` (VS Code API shim), `PanelModel` (Loading/Ready/Failed/Unavailable).
- `theme/` — `ThemeMapping` (56 colours, 3 fonts), `Contrast`, `ThemeBridge`; `tree/` — tool window, Specs tree (`SpecTreeMapping`), `UnavailableNotice`.
- `actions/` — `ActionTable` and one `StudioAction` class registered 14 times; `NoticeContent`; `status/` — status bar widget and mapping.
- `ui/` — `HostUi` (pick, notify, confirm, progress, open external), `LogView`; `settings/` — `StudioConfigurable`, `StudioSettings`, `SettingsTable` (0035: `assistantAvailable` is the one rule for the option list), `PluginOptionsBus` (plugin events reach an open settings page).
- `setup/` — `SetupTarget` (no-overwrite writes), `ReleaseHttp` (IDE proxy, no redirects), `TarGzArchive`, `SetupCalls` (wire adapter).
- `probe/` — CI-only probes (`ProbeAutoRun`, conformance, smoke, no-JCEF, setup, budgets); inert unless `featherspec.probe` is set.
- `src/main/resources/META-INF/plugin.xml` (id, two `<depends>` lines and the optional Terminal one in `featherspec-terminal.xml`; `since-build` is set in `build.gradle.kts`), `icons/`; tests: `src/test/kotlin/…`
  (plain JUnit 5, same package names), `src/integrationTest/kotlin/…` (Starter IDE).

## Entry points
- `plugin.xml` — the only manifest: tool window, editor provider, settings, status widget, 14 actions, two startup activities.
- `jetbrains/build.gradle.kts` (versions in `gradle/libs.versions.toml`); `.github/workflows/jetbrains.yml` is the only place a Kotlin result exists.

## Task playbooks
- A Kotlin change: pure class + JUnit test; glue thin; verify with `jetbrains.yml`. A bridge change: `contract.ts` and `HostContract.kt` together.
- A new host call: name in `contract.ts`, row in `HostRouter` (group), port under `ports/` or `setup/`; never in `src/core`.
- A handover change: TypeScript row in `src/hosts/embedded/assistants.ts`, bridge call in `contract.ts` and `HostContract.kt`, port under `assistant/`; Terminal classes load only through the optional dependency, every call guarded.
- A manifest or bundle change: `jetbrains/guards/*.mjs` (`pluginZip.mjs`, `vsixFiles.mjs`, `sameBundles.mjs`) must stay green.

## Traps
- Terminal API is experimental: only `TerminalToolWindowTabsManager` is typed, the rest reflective; tool window IDs and readiness markers are unverified until K-1 (0035 A-005, A-008).
- No local Gradle run in the sandbox; a red CI log goes back to a fresh implementer. `since-build` and `<depends>` are checked by CI.
- Under IntelliJ's routing file system never compare `WatchKey` identity or use `Path.resolve(foreignPath)`; `CREATE_NEW` on an existing folder
  fails with access denied on Windows (answer `exists`). Each core owns its `JBCefClient`; JCEF is initialised once per IDE session.
