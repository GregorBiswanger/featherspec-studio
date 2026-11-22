# Map: jetbrains (IntelliJ Platform host)
# last reconciled: 2026-11-21 (0034, ADR-004)

## Internal pattern
- `jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/` — root package: `StudioProjectService` (per project: core
  runtime, observables, selection), `StudioStartup`, `HostRouter` (every bridge call by group), `CoreConfig`, `HostTexts`, `TrustWatch`.
  Pure logic in plain classes; `com.intellij` imports only in thin glue. Subpackages:
- `runtime/` — bridge to the hidden JCEF core page: `HostContract` (mirror of `contract.ts`), `BridgeFrames`, `ReplyBatch`,
  `CorePage`, `CoreRuntime`/`CoreState` (buffered scripts, 60 s start timer, Unsupported/Suspended/Failed).
- `jcef/` — `JcefAvailability`, `PluginResources` (the exact URL allow-list), `PluginRequestHandler` (serves `core.html`, panel HTML).
- `ports/` — host ports behind routed calls: `FilePorts`, `FileUris`, `ProjectFolders` (PD-103), `UnsavedDocuments` (+ `IdeUnsavedDocuments` glue: reads see unsaved editor documents; `SpecWatch` reports their edits), `RootWatcher`/`SpecWatch` (own
  watcher plus VFS events), `FileRuntimeMedium`, `StoreLocation`, `UiMemory(State)`, `EditorOpen`, `SystemCalls` (clipboard, editor).
- `panel/` — editor tab: `StudioEditor(Provider)`, `StudioFile`, `PanelShim` (VS Code API shim), `PanelModel` (Loading/Ready/Failed/Unavailable).
- `theme/` — `ThemeMapping` (56 colours, 3 fonts), `Contrast`, `ThemeBridge`; `tree/` — tool window, Specs tree (`SpecTreeMapping`), `UnavailableNotice`.
- `actions/` — `ActionTable` and one `StudioAction` class registered 14 times; `NoticeContent`; `status/` — status bar widget and mapping.
- `ui/` — `HostUi` (pick, notify, confirm, progress, open external), `LogView`; `settings/` — `StudioConfigurable`, `StudioSettings`, `SettingsTable`.
- `setup/` — `SetupTarget` (no-overwrite writes), `ReleaseHttp` (IDE proxy, no redirects), `TarGzArchive`, `SetupCalls` (wire adapter).
- `probe/` — CI-only probes (`ProbeAutoRun`, conformance, smoke, no-JCEF, setup, budgets); inert unless `featherspec.probe` is set.
- `src/main/resources/META-INF/plugin.xml` (id, `<depends>` lines; `since-build` is set in `build.gradle.kts`), `icons/`; tests: `src/test/kotlin/…`
  (plain JUnit 5, same package names), `src/integrationTest/kotlin/…` (Starter IDE).

## Entry points
- `plugin.xml` — the only manifest: tool window, editor provider, settings, status widget, 14 actions, two startup activities.
- `jetbrains/build.gradle.kts` (versions in `gradle/libs.versions.toml`); `.github/workflows/jetbrains.yml` is the only place a Kotlin result exists.

## Task playbooks
- A Kotlin change: pure class + JUnit test; glue thin; verify with `jetbrains.yml`. A bridge change: `contract.ts` and `HostContract.kt` together.
- A new host call: name in `contract.ts`, row in `HostRouter` (group), port under `ports/` or `setup/`; never in `src/core`.
- A manifest or bundle change: `jetbrains/guards/*.mjs` (`pluginZip.mjs`, `vsixFiles.mjs`, `sameBundles.mjs`) must stay green.

## Traps
- No local Gradle run in the sandbox; a red CI log goes back to a fresh implementer. `since-build` and `<depends>` are checked by CI.
- Under IntelliJ's routing file system never compare `WatchKey` identity or use `Path.resolve(foreignPath)`; `CREATE_NEW` on an existing folder
  fails with access denied on Windows (answer `exists`). Each core owns its `JBCefClient`; JCEF is initialised once per IDE session.
