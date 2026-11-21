# Plan — FeatherSpec Studio for JetBrains IDEs

**Spec:** [0034-studio-for-jetbrains-ides.md](0034-studio-for-jetbrains-ides.md)
**Status:** In Progress
**Last updated:** 2026-11-21
**Current step:** T-021

## Approach

Spikes first (G1), then guards and the parity matrix (G2), then the shared TypeScript changes under the strictest gate
(G3), then the Kotlin host, then packaging (G4). The shared core runs unchanged as one esbuild bundle
(`dist/embedded/core.js`) in a hidden off-screen JCEF browser per IDE project (V2; ADR-004 accepted by Gregor
2026-11-21), started at project open off the EDT, behind a JSON bridge; the
unchanged webview bundle runs in a JCEF editor tab; tree, status bar, actions, settings and notifications are native
Swing/IntelliJ components. `src/core/` does not change at all (that is how AC-006 and "VS Code identical" are proven
cheaply: `git diff --exit-code <Baseline> -- src/core`). Memory Bank files the implementation touches: `techContext.md`
(JetBrains build and CI jobs, T-002, T-036), `systemPatterns.md` (ADR-004 decision, bridge contract, T-008, T-016),
`activeContext.md` (stage ends).

**OP-001 split (applied 2026-11-20, recorded in the spec as OP-024):** the Send handover and the Marketplace release
leave this spec. Follow-up specs: **0035 — Send to assistant in JetBrains IDEs** (spec AC-032, the S-3 result,
0024/0026/0027/0033 for an offered handover) and **0036 — JetBrains Marketplace release** (signing and signature check
of AC-035, AC-036, the release workflow, listing, vendor, certificate, secrets, first upload). After the split the plan
has 37 steps — above the ~30 guideline because every step is cut for a small implementer model (≤ ~200 changed lines).
The next split candidate, if Gregor wants one, is the stage boundary at G3 (host stages 4a–5 as their own spec); not
applied, because AC-040's walkthrough needs host and setup together. Open decision for Gregor (see handoff).

**G1 re-plan (2026-11-21, ADR-004 accepted, spec OP-025):** the bridge has no synchronous call (the host pushes copies of
settings, trust, folders and memory), the core page uses Chromium's own Web APIs and timers (no polyfills), conformance
and budgets run inside a Starter IDE (job `ide-tests`), the plugin watches the FeatherSpec roots itself, and without
JCEF only the settings page works. Re-planned: T-014 (JetBrains-only texts), T-015…T-019, T-021…T-030, T-032, T-034…T-037.
Appended: T-039 (core runtime glue, split from T-021), T-040 (AC-030 in a real IDE), T-041 (setup end to end in a real
IDE, was T-034's GraalJS JUnit run). The plan now has 41 steps (T-001…T-041).

### Execution model (binding for every step)

- The orchestrator delegates each step to a fresh implementer subagent on a small, fast model (Claude Haiku). Every
  step names its exact files, public names, the code to mirror, the tests to write first and the `Verify:` command.
  The implementer reads only the files a step names (plus `AGENTS.md`, and `jetbrains/AGENTS.md` once it exists); it
  makes no architecture decision. A step that cannot be done as written stops with `BLOCKED` and the reason.
- **Verify kinds.** `local:` — the implementer runs it in the sandbox. `CI:` — the sandbox cannot reach Maven, the
  Gradle portal or JetBrains (proxy 403, measured 2026-11-20, A-001): the implementer only writes code; the
  orchestrator pushes `jetbrains-host` (git write and network: Ask first, one yes for the branch) and reads the named
  job of `.github/workflows/jetbrains.yml` or `jetbrains-spikes.yml`. A red CI run goes back to a fresh implementer
  with the log excerpt, not a guess.
- **TDD** (`AGENTS.md`): new behaviour test-first, red via a `Not implemented` stub / `TODO()` in Kotlin; the
  orchestrator shows the stage's tests to Gregor once per stage (the TDD working agreement's review), then delegates
  the implementation with the confirmed tests named off-limits. For CI-only steps "red" is a red CI run of the new test.
  A move or extraction that preserves behaviour is decided by the existing tests staying green; new characterization
  tests that are green at once get a cheap negative control (break one expectation, see red, restore).
- **Per step: test only the current work** (its `Verify:`). **Per stage end: the full gate** — the stage line in
  *Stages* names it; it includes every CI job that exists by then.
- **Code conventions** (from `AGENTS.md`, restated for the implementer; `AGENTS.md` wins): no comments in generated
  code (TS and Kotlin); TypeScript strict, no `any`, no default exports, English identifiers; never create a `.ts` file
  outside `src/` (the root `tsconfig.json` has no `include` and `rootDir: src`, so a `.ts` elsewhere breaks
  `npx tsc --noEmit`) — scripts outside `src/` are plain `.mjs`; no new npm dependency (shims are written by hand).
  Kotlin: logic in pure classes with no `com.intellij` import, tested by plain JUnit 5; platform glue thin and covered
  by the Starter tests of job `ide-tests` (T-022, T-035, T-040, T-041). JSON in Kotlin: the platform-bundled Gson
  (`com.google.gson`); no JSON library is added. Kotlin root package `com.gregorbiswanger.featherspec.studio`; paths below use
  `<pkg>/` = `jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/`, `<test>/` =
  `jetbrains/src/test/kotlin/com/gregorbiswanger/featherspec/studio/`, `<it>/` =
  `jetbrains/src/integrationTest/kotlin/com/gregorbiswanger/featherspec/studio/`.
- A step that writes Markdown under `docs/`, `.architecture/`, `README.md` or `AGENTS.md` also runs
  `npx vitest run src/adapters/node/docsScan.test.ts` (it scans product docs and module maps).

**Dependencies to approve (Ask first, one yes before T-001):** Gradle 9.7.0 (CI only, no wrapper JAR is committed —
the implementer cannot write a binary; CI uses `gradle/actions/setup-gradle@v6` with `gradle-version: 9.7.0`);
`org.jetbrains.intellij.platform` 2.20.1; Kotlin JVM plugin 2.4.21 with `languageVersion`/`apiVersion` 2.2 (stdlib of
2025.3 is 2.2.20; `kotlin.stdlib.default.dependency=false`); JUnit Jupiter 5.13.4 (+ `junit-platform-launcher`);
Starter/Driver via `testFramework(TestFrameworkType.Starter)`, `org.kodein.di:kodein-di-jvm` 7.20.2,
`kotlinx-coroutines-core-jvm` 1.10.1 in the `integrationTest` source set only (spikes T-006; product build from T-022).
No new npm package. Approved by Gregor 2026-11-20. GraalJS (`org.graalvm.polyglot:polyglot`, `:js` 25.0.4) is no
longer approved for the product: G1 chose V2 (ADR-004); it stays only in `jetbrains/spikes/` until T-037 deletes them.
V2 needs no new dependency.

### Contracts later steps rely on

**Bridge (TS `src/hosts/embedded/contract.ts`, T-015; Kotlin mirror `<pkg>/runtime/HostContract.kt`, T-021; V2 per
ADR-004).** The core bundle runs in a hidden off-screen JCEF browser per IDE project, on the page
`https://studio.featherspec.invalid/core.html` (`CorePage`, T-021). All values cross as JSON strings; bytes as base64.
There is **no synchronous call**: JS → Kotlin is asynchronous only (`JBCefJSQuery`).
- JS → Kotlin: `core.html`'s nonce'd inline script defines `window.__featherspecNative(frame)` from
  `JBCefJSQuery.inject("frame")` before `core.js` loads. Frames, one JSON object each: `{"k":"call","id","name","args"}`,
  `{"k":"emit","channel","payload"}`, `{"k":"reply","id","ok"}` or `{"k":"reply","id","error"}` (answer to `invoke`,
  `conformance`, `setupConformance`), `{"k":"ready"}` (once `start` finished), `{"k":"failed","error"}` (start threw).
- Kotlin → JS: `cefBrowser.executeJavaScript("FeatherSpecHost.<fn>(<args as JS string literals>);", CORE_URL, 0)`. The
  bundle defines global `FeatherSpecHost` with `start(configJson)`, `resolve(id, resultJson)` (`{"ok":…}` or
  `{"error":"…"}`), `dispatch(event, payloadJson)`, `invoke(id, command, argsJson)`, `conformance(id, inputJson)` and
  `setupConformance(id, archiveJson)` (T-018).
- Copies instead of sync calls (R-3): `start`'s config is `{host:'jetbrains', platform, studioVersion, settings:
  {<key>: value}, trusted, folders: [{root, name, displayPath?}], memory: {<key>: string}}`. The page serves
  `SettingPort.read`, `TrustPort.isTrusted`, `WorkspaceFoldersPort.list`, `WorkspaceStatePort.get`, the UI memory `get`
  and `EarlierRunDataStatePort.has` from these copies; a change event replaces the copy, then fires the port's listener.
  A memory write updates the copy first, then goes out as `memory.set` (`null` removes). `AssistantHostPort.extension`
  → `undefined` (0034). `ClockPort`, `RuntimeClock` (`setTimeout`), `Date.now` and `newId` (`crypto.randomUUID()`) are
  the page's own; no timer crosses the bridge.
- async `call`: `source.list|stat|readBytes`, `fs.stat|readText|readDirectory`,
  `medium.open|read|lines|append|replace|createExclusive|remove|list`, `memory.set`, `watch.add|remove {root, kind:
  'files'|'markers'}`, `target.kind|readBytes|listDirectory|createExclusive|replaceIfUnchanged|clearSetupFolder`,
  `http.get`, `archive.read`, `ui.pick|notify|confirm|progressStart|openExternal`, `clipboard.write`, `editor.open`,
  `actions.openSetupGuide|manageTrust|openStudio|reloadPanel`.
- `emit` channels: `panel` (one envelope), `tree` (spec tree model), `status` (status entry view or `null`), `log`
  (lines), `warn` (text), `progressEnd` (id), `showOutput`.
- `dispatch` events: `panelMessage`, `panelOpened`, `panelClosed`, `fileChanged {root, path}`, `markerChanged {root}`,
  `foldersChanged {folders}`, `trustGranted {}`, `settingsChanged {key, value}`, `progressCancelled {id}`.
- `invoke` commands: `open {via, area?}`, `refresh`, `copyNextStep`, `setup`, `copyMergePrompt`, `selectProject`,
  `shellAction {action}`, `tree.select|copy|openSpec|openPlan|showInPlanMap {row}`,
  `panelHtml {nonce, cspSource, scriptUri, styleUri, reloaded}`, `diagnostics` (→ `{jsHeapBytes}`, T-022).
- Kotlin side: the query handler does no work itself; it hands each frame to the project's single-thread queue
  (`AppExecutorUtil.createBoundedApplicationPoolExecutor("FeatherSpec core", 1)`), so frames keep their order; file I/O
  answers later with `resolve`. Nothing blocks the EDT.

**Roots** are file URIs written exactly as VS Code's `Uri.file(p).toString()` (`C:\projects\test` →
`file:///c%3A/projects/test`, `/home/u/a b` → `file:///home/u/a%20b`), so the core's root identity and display rules
hold unchanged (T-023 `FileUris`).

**JCEF (S-2, T-005, T-021, T-039, T-026; shared per ADR-004).** One `JBCefClient` per IDE project
(`JBCefApp.getInstance().createClient()`, owned and disposed by `StudioProjectService`); the hidden core browser and the
panel tab are both built with `JBCefBrowser.createBuilder().setClient(client)` (core also `.setOffScreenRendering(true)`,
`createImmediately()`, never added to a Swing parent), so JCEF starts once per IDE session. Origin
`https://studio.featherspec.invalid/` served by one `PluginRequestHandler` (`CefRequestHandlerAdapter` /
`CefResourceRequestHandlerAdapter`, T-039; reference: platform `JCefImageViewer`, spike `SpikeResources`) over the pure
allow-list `PluginResources` (T-021: `core.html`, `core.js`; T-026 adds `index.html`, `main.js`, `main.css`,
`theme.css`); every other URL is cancelled (AC-015). The panel HTML is
`buildWebviewHtml` (via `invoke('panelHtml')`, so the CSP is the VS Code one with `cspSource` = the origin) plus two
tags with the same nonce/origin inserted after `<div id="root"></div>`: a `theme.css` link before `main.css` is loaded
first (theme before first paint; CSP forbids inline styles) and a nonce'd shim script defining `acquireVsCodeApi` over a
`JBCefJSQuery` and setting the body class. Host → panel: `cefBrowser.executeJavaScript("window.postMessage(" + json +
",'*')", origin, 0)`. Live theme switch: one `executeJavaScript` that sets every variable through
`document.documentElement.style.setProperty` and swaps the body class in the same task (no mixed frame, AC-028).

**Host vocabulary (§6.8, T-014, T-016).** One table in `src/shared/protocol/vocabulary.ts`: pairs of exact VS Code
strings and JetBrains strings, `translateTerms(text, host)` (identity for `vscode`, so VS Code is byte-identical by
construction). The webview reads `document.body.dataset.host` (`buildWebviewHtml` gets an optional `host`; omitted →
HTML unchanged); the embedded host passes every outbound UI string (notifications, actions, tree message, log, status)
through `translateTerms` and maps a chosen action label back. Pairs: `Manage Workspace Trust` → `Trust Project`;
S7 `Restricted Mode` → `Safe Mode`; `This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted
workspace.` → `This project is not trusted. Setting up FeatherSpec needs a trusted project.`; `No FeatherSpec project
found in this workspace` (with and without period) → `… in this project`; `Setting up FeatherSpec needs a trusted
workspace.` → `… trusted project.`; `Every folder of this workspace …`, `No folder of this workspace can be set up.`,
`No folder of this workspace has files to merge.` → `this project`; `Another VS Code window holds the write lock …` →
`Another IDE window holds the write lock …`; `the Studio panel and the extension could not exchange data` → `… the
plugin …` (found by the survey, not in §6.8's list; covered by §6.8's rule "no VS Code-only term"; a PD row in T-010).
Assistant causes with extension IDs stay n-a while no handover exists (0035). JetBrains-only texts the host needs
without the core (no-JCEF notices, *Open help*, status unavailable, help URL) are `JETBRAINS_TEXTS` in the same file
(T-014); `<pkg>/HostTexts.kt` (T-025) mirrors them plus `LOADING_TEXT`, `STATE_LABELS.S5` and `ACTION_LABELS.showOutput`
of `src/shared/protocol/texts.ts`, checked against the TS sources by `HostTextsTest`.

**Starter harness (T-006/T-038 lessons; binding for T-022, T-035, T-040, T-041).** Mirror
`jetbrains/spikes/ide/build.gradle.kts`, `SpikeAutoRun.kt` and `SpikeV2Test.kt`: source set `integrationTest` and a plain
`Test` task `integrationTest` (not `testIdeUi`) with `systemProperty("path.to.build.plugin",
tasks.prepareSandbox.get().pluginDirectory.get().asFile)` and `dependsOn(tasks.prepareSandbox)`; the test calls
`Starter.newContext(name, TestCase(IdeProductProvider.IU, LocalProjectInfo(<fixture copy>)).withVersion("2025.3.1"))`,
`context.applyVMOptionsPatch { addSystemProperty(…) }` (`idea.trust.all.projects=true`,
`ide.show.tips.on.startup.default.value=false`, the probe properties), `PluginConfigurator(context).installPluginFromDir(…)`,
`runIdeWithDriver().useDriverAndCloseIde { waitForIndicators(5.minutes); <poll for the result file> }`, and asserts after
the IDE closed. **No Driver UI API** (`ideFrame`, `invokeAction`): the work runs inside the IDE in
`<pkg>/probe/ProbeAutoRun` (a `<postStartupActivity>` that returns at once unless system property `featherspec.probe.out`
is set; `featherspec.probe` names the probe) and writes JSON under `featherspec.probe.out`. Editor providers are
`DumbAware`; theme switches use `LafManager.getInstance().setCurrentLookAndFeel(theme, false)` plus `updateUI()` on the
EDT. Job `ide-tests` (T-022) in `jetbrains.yml`: matrix ubuntu, windows, macos, `fail-fast: false`; Windows
`core.autocrlf false`; node 22 + `npm ci` + `npm run package` + `node jetbrains/scripts/conformanceExpected.mjs`; Java 21;
Gradle 9.7.0; Linux: install `xvfb`, `sudo sysctl -w kernel.apparmor_restrict_unprivileged_userns=0` (JCEF is suspended
without it), `xvfb-run -a gradle -p jetbrains integrationTest`; others `gradle -p jetbrains integrationTest`; always print
the result JSON and `idea.log` excerpts and upload `jetbrains/build/probe-out/**` plus IDE logs (mirror
`jetbrains-spikes.yml › spike-ide`).

**Quality gates:** local — `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` ·
`npm run test:unit` · `npm run compile` (steps touching wiring, adapters, `src/extension.ts`, `esbuild.js`,
`package.json` or a bundle) · `node --test 'jetbrains/guards/*.test.mjs'` (from T-009) ; CI (`.github/workflows/jetbrains.yml`) —
`plugin` (Ubuntu, Windows, macOS: Gradle `build buildPlugin verifyPluginStructure`, plain JUnit), `vscode-mirror`
(Ubuntu, Windows: exactly `ci.yml`'s steps incl. `npm test`; `ci.yml` itself only runs on `main` and on PRs),
`vscode-guards` (AC-037, AC-038, workflows unchanged), `shared-guard` (AC-039, AC-006, from T-020), `ide-tests`
(Starter, 3 OS: conformance and budgets from T-022, smoke T-035, no JCEF T-040, setup T-041), `verify` (Plugin
Verifier, from T-036); `jetbrains-spikes.yml` — `spike-s1`,
`spike-ide` (Stage 1 only; removed in T-037). `npm test` is the pre-done gate (in `vscode-mirror`).

## Research

- **Survey (repo at af345c5).** `src/extension.ts` (404 lines) is the only composition root; `studioPanel.ts` holds the
  panel protocol (seq, hello → shell/board/overview/detail, router, probe) next to VS Code calls; `webviewHtml.ts` is
  pure (reusable for the CSP); `src/webview/vscodeApi.ts` is the only host handle. Core imports only `path`/`node:path`
  (`posix.dirname|isAbsolute|join|normalize` in `board/openFile.ts`, `specs/readProject.ts`,
  `lifecycle/verification.ts`). Web APIs in core: `TextDecoder` (fatal+BOM strip in `specs/text.ts`;
  fatal+`ignoreBOM` in `setup/gitignore.ts`, `settingsJson.ts`; non-fatal in `setup/releaseArchive.ts`), `TextEncoder`,
  `new URL(location, base)` (`setup/releaseDownload.ts`: `protocol`, `hostname`, `username`, `password`, `pathname`),
  `AbortController`/`AbortSignal` with `addEventListener('abort', …, {once})`, `Symbol.asyncIterator`,
  `localeCompare(…, 'en', {sensitivity:'base'})` (`board/filters.ts`: an R-1 risk under GraalJS' ICU — conformance
  decides). No `queueMicrotask`/`performance` in core. Timers only through `ClockPort`/`RuntimeClock`. Ports: 14
  files; sync methods as §12. Helpers to reuse: `createMemorySpecSource` (`src/core/specs/testing/memorySpecSource.ts`),
  `readSnapshot` (`specs/testing/readSnapshot.ts`, pure), `snapshotOf` (`board/testing/nextStepSnapshot.ts` — imports
  `fs`, so spikes copy its 15-line body), `buildMergePrompt` (`setup/mergePrompt.ts`, golden test inputs
  `'/work/tip-splitter'` + three paths), `webviewBundle.test.ts` (JSDOM boot of the bundle with `acquireVsCodeApi`).
  `.vscodeignore` misses `jetbrains/**`, `dist/embedded/**` and `**/*.kts` (`**/*.ts` does not match `.kts`). The
  `.vsix` holds 11 files at 3bc615c: `CHANGELOG.md`, `LICENSE`, `README.md`, `package.json`, `media/icon.png`,
  `media/studio.svg`, `media/studio-light.svg`, `media/studio-dark.svg`, `dist/extension.js`, `dist/webview/main.js`,
  `dist/webview/main.css`. `ci.yml` triggers only on `push: main` and `pull_request` (hence `vscode-mirror`). `vsce` is
  not a devDependency (`publish.yml` uses `npx @vscode/vsce`). Criteria: `readProject()` yields `criteria[]` with
  `struck`; ~700 criteria in `done/` + `active/`. Last PD entry is PD-098. Root identity = URI string;
  `sameRootFor(platform)` lowercases on win32. No `fs-knowledge:` blocks in `systemPatterns.md`. No `done/` spec is
  invalidated (no Deprecated candidate).
- Sandbox network: `curl` to repo1.maven.org and plugins.gradle.org → proxy `CONNECT 403` (2026-11-20) — confirms A-001.
- [IntelliJ Platform Gradle Plugin 2.x](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin.html) — 2.20.1, Gradle ≥ 9.0.0, Java ≥ 17, `intellijIdea(version)`; retrieved 2026-11-20. [Gradle plugin portal](https://plugins.gradle.org/plugin/org.jetbrains.intellij.platform) — 2.20.1 of 2026-11-09; retrieved 2026-11-20.
- [Extension reference](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html) — `sinceBuild` defaults to the major only → set `253.29346` explicitly; `untilBuild = provider { null }` unsets; signing env `CERTIFICATE_CHAIN`/`PRIVATE_KEY`/`PRIVATE_KEY_PASSWORD`, `PUBLISH_TOKEN` (0036); `pluginVerification { ides { recommended(); select { types; sinceBuild; untilBuild }; create(type, version) } }`; retrieved 2026-11-20.
- [JetBrains releases API](https://data.services.jetbrains.com/products/releases?code=IIU&type=release&majorVersion=2025.3) — IntelliJ IDEA 2025.3.1 = build 253.29346.138 (Rider 253.29346.144); latest stable 2026.3 (IIU 263.7307.200, WS 263.7307.202, RD 263.7307.325, PCP 263.7307.329); retrieved 2026-11-20.
- [Build number ranges](https://plugins.jetbrains.com/docs/intellij/build-number-ranges.html) — 2025.3 = branch 253, Java 21; 2026.2/2026.3 = Java 25; made-up since-builds are rejected; retrieved 2026-11-20.
- [IntelliJ Platform 2025.3 for plugin developers](https://blog.jetbrains.com/platform/2025/11/intellij-platform-2025-3-what-plugin-developers-should-know/) — unified IDEA, `intellijIdeaCommunity()` fails from 2025.3 → `intellijIdea()`; `pycharm(version)`; `@Storage` only inside `@State.storages`; Gradle helpers are compile-only, runtime deps go in `plugin.xml`; retrieved 2026-11-20.
- [Embedded Browser (JCEF)](https://plugins.jetbrains.com/docs/intellij/embedded-browser-jcef.html) — `<depends>com.intellij.modules.jcef</depends>` from 2025.3.1; from 2026.2 JCEF is the bundled *Web Browser (JCEF)* plugin, Gradle `bundledPlugin("com.intellij.modules.jcef")`; `useInstaller = false` breaks JCEF; `JBCefApp.isSupported()`, `JBCefJSQuery.create/addHandler/inject`, `executeJavaScript`, `CefRequestHandler`/`CefResourceRequestHandler` (reference `JCefImageViewer`), `JBCefScrollbarsHelper.buildScrollbarsStyle()`, disposal via `Disposer`; retrieved 2026-11-20.
- [Using Kotlin](https://plugins.jetbrains.com/docs/intellij/using-kotlin.html) — bundled stdlib 2025.3 = 2.2.20 … 2026.3 = 2.4.21-RC; `kotlin.stdlib.default.dependency=false`; never bundle coroutines; retrieved 2026-11-20. [KGP compatibility](https://kotlinlang.org/docs/gradle-configure-project.html) — KGP 2.4.21 supports Gradle ≤ 9.7.0 → Gradle pinned to 9.7.0 (current is [9.9.2](https://services.gradle.org/versions/current)); retrieved 2026-11-20.
- [GraalJS README](https://raw.githubusercontent.com/oracle/graaljs/master/README.md) — embed with `org.graalvm.polyglot:polyglot` + `org.graalvm.polyglot:js` (pom); stock JVM "not a supported feature", slower; [Maven Central js](https://central.sonatype.com/artifact/org.graalvm.polyglot/js) — MIT/UPL; `js-community` deprecated in favour of `js`; retrieved 2026-11-20. [GraalVM 25.1 notes](https://www.graalvm.org/release-notes/25.1/) — on a plain JDK the fallback runtime runs without compilation (interpreter); 25.0 LTS keeps the old jargraal path; `js.performance` option provides `performance.now()`; retrieved 2026-11-20. → Pin 25.0.4 (25.0 LTS line; [js-scriptengine 25.0.4 listing](https://mvnrepository.com/artifact/org.graalvm.js/js-scriptengine/25.0.4/changes)); inside the IDE GraalJS is interpreter-only either way — S-1 must measure R-2/R-5; the ZIP limit (ICU4J + Truffle) is the top size risk.
- [Integration tests intro](https://plugins.jetbrains.com/docs/intellij/integration-tests-intro.html) — Starter is JUnit 5 only; `integrationTest` source set, `testFramework(TestFrameworkType.Starter, configurationName = "integrationTestImplementation")`, `intellijPlatformTesting.testIdeUi.registering`, `path.to.build.plugin`, `Starter.newContext(name, TestCase(IdeInfo.IdeaUltimate, …))`, `PluginConfigurator(this).installPluginFromDir(...)`, `runIdeWithDriver().useDriverAndCloseIde { }`, `waitForIndicators`, `idea.trust.all.projects`; retrieved 2026-11-20. [CI for integration tests](https://blog.jetbrains.com/platform/2025/04/integration-tests-for-plugin-developers-github-actions-and-setting-up-continuous-integration/) — Starter starts Xvfb itself when `DISPLAY` is missing; no headless mode; Windows needs an interactive session; macOS UI input needs accessibility rights (→ S-2 screenshots mandatory on Ubuntu only); logs under `out/ide-tests/tests/<ide>/<test>/log`; retrieved 2026-11-20.
- [Trusted projects](https://plugins.jetbrains.com/docs/intellij/trusted-projects.html) — `Project.isTrusted()`, application listener `TrustStateListener.onProjectTrusted()`, `TrustedProjects.whenProjectTrusted()`; "Trust Project" link of the editor notification; no documented programmatic "ask to trust" call → the `Trust Project` action opens the IDE's project-security help if no API is found (T-032 Notes); retrieved 2026-11-20.
- S-3 (desk research, recorded in ADR-004 by T-008; the handover itself is 0035): **Claude Code** — [JetBrains plugin](https://code.claude.com/docs/en/jetbrains) runs `claude` in the IDE terminal, no public action/API for other plugins; [deep links](https://code.claude.com/docs/en/deep-links.md) `claude-cli://open?cwd=<abs>&q=<url-encoded, ≤ 5,000 chars>` open a new terminal window with the prompt **pre-filled, not sent** (documented; handler registered after the first interactive prompt; opens outside the IDE) → *prefills without sending* (external terminal). **GitHub Copilot for JetBrains** — [docs](https://docs.github.com/en/copilot/concepts/agents/copilot-in-jetbrains) and 2026 changelogs show no documented entry point to open chat with a prompt → *not possible* (no documented API). **JetBrains AI Assistant** — [ACP](https://www.jetbrains.com/help/ai-assistant/acp.html) connects external agents; prompts are typed and sent by hand, no API for other plugins → *not possible*. Retrieved 2026-11-20.
- [gradle/actions releases](https://github.com/gradle/actions/releases) — v6.4.1 latest; retrieved 2026-11-20.
- G1 (2026-11-21): ADR-004 accepted by Gregor, V2 (spec OP-025). [Embedded Browser (JCEF)](https://plugins.jetbrains.com/docs/intellij/embedded-browser-jcef.html)
  re-read: one `JBCefClient` may be shared by several browsers and a custom client is disposed explicitly;
  `JBCefBrowser.createBuilder().setClient(…)`; `CefLoadHandlerAdapter.onLoadEnd`; `JBCefApp.isSupported()` is false with
  a JDK without JCEF or an incompatible JCEF; the page documents neither JCEF's "suspended" state (ADR-004 S-2, Ubuntu
  AppArmor) nor a registry key that disables JCEF → T-029 detects suspension by `core.html` not loading, T-040 records
  which system property disables JCEF; the threading of `JBCefJSQuery` handlers is not documented → hand off at once.
  Retrieved 2026-11-21.

## Stages

1. T-001 → T-002 — JetBrains build skeleton, CI workflow, context hygiene. Gate: CI `plugin` green on 3 OS; local
   `npx vitest run src/adapters/node/docsScan.test.ts` and `npm run test:unit` green.
2. T-003 → T-004 → T-005 → T-006 → T-007 → T-008 — spikes S-1, S-2, S-4, S-3 table, ADR-004. **Gate G1:** CI
   `spike-s1` (3 OS), `spike-ide` and `plugin` green; local gates green (no `src/` change); ADR-004 records R-1…R-6 per
   candidate, the S-2 screenshots (Light, Darcula, High Contrast), S-3 and S-4; **Gregor's decision stands in ADR-004
   (AC-009) — no later stage starts before it.** If S-1 V1 misses R-1…R-6, the orchestrator appends T-038 (V2 hidden
   JCEF spike, same shape as T-004) before T-008. **Passed 2026-11-21: V2 (ADR-004 accepted by Gregor).**
3. T-009 ‖ T-010, then T-011 — VS Code guards, parity generator, categorisation. **Gate G2:** local gates incl.
   `npm run compile` and `node --test 'jetbrains/guards/*.test.mjs'`; CI `plugin`, `vscode-mirror`, `vscode-guards` green; `.vsix`
   list identical to the snapshot (AC-037); `docs/jetbrains/parity-source.json` has `"pending": []`. **Passed 2026-11-21.**
4. T-012 → T-013 — host-neutral composition and panel session (VS Code behaviour unchanged). Gate: five local gates
   incl. `npm run compile`; `git diff --exit-code <Baseline> -- src/core` empty; CI `vscode-mirror`, `vscode-guards`,
   `plugin` green.
5. T-014 ‖ T-015 — independent: vocabulary (shared + webview) and the embedded bridge client (separate files and
   tests; T-015 alone edits `eslint.config.mjs`). Gate: the five local gates on the combined tree; CI as stage 4.
6. T-016 → T-017 → T-018 → T-019 → T-020 — embedded entry, bundle, conformance oracle, shared-change guard.
   **Gate G3 (after T-020):** all local gates incl. `npm run compile`; CI `vscode-mirror` (incl. `npm test` on Ubuntu
   and Windows), `vscode-guards`, `shared-guard`, `plugin` green; baselines and golden file unchanged, no new
   `EXCEPTIONS`; `src/core` unchanged; **an independent `/sdd-compile` READY** (orchestrator, fresh session, another
   model family) before stage 7 starts. **2026-11-21: the scoped compile's findings are fixed in `727f708`; CI for it and a fresh **G3 passed 2026-11-21:** independent `/sdd-compile` (fresh Opus session; first review by Fable found B1–B3, fixed in 727f708/04cb573/5af7a76) READY apart from CI at HEAD, then CI at `5af7a76` (run 44867612536) green: `plugin` 3 OS, `vscode-mirror` incl. `npm test` ubuntu+windows, `vscode-guards` incl. the AC-038 byte check on a JetBrains-only push ("bundles are identical"), `shared-guard` ubuntu+windows. Model-family note: only Claude models are available here.
   independent compile are pending.**
7. T-021 → T-039 → T-023 → T-024 → T-025 → T-022 — bridge parts, core runtime in a hidden JCEF browser, host ports,
   project service (core starts at project open), then conformance and budgets in a Starter IDE (T-022 runs last: it
   needs the core started by T-025). Gate: local gates; CI `plugin`, `ide-tests` (conformance + budgets on 3 OS),
   `vscode-*`, `shared-guard` green.
   **Stage 7 gate passed 2026-11-21:** local gates (eslint, tsc ×2, compile, test:unit 4039 + 35 timing, guards 41/41, scripts 4/4, `src/core` unchanged, `.vsix` snapshot) and CI at `e2d2b93` (run 44878649481) green on every job incl. `ide-tests` on 3 OS.
8. T-026 → T-027 — Studio tab (shared JCEF) and theme bridge. Gate: as stage 7, plus a CI-artifact ZIP Gregor may
   install by hand.
   **Stage 8 gate passed 2026-11-21:** CI at `6ceb027` (run 44881538602) green on every job incl. `ide-tests` on 3 OS; the `plugin-zip` artifact (Linux job) is the ZIP Gregor may install by hand.
9. T-028 → T-029 → T-030 — tree, actions and the no-JCEF surfaces, status bar and editor. Gate: as stage 7.
   **Stage 9 gate passed 2026-11-21:** CI at `d08c599` (run 44884666829) green on every job incl. `ide-tests` on 3 OS; local gates green.
10. T-031 → T-032 → T-033 → T-034 → T-041 → T-040 — notifications and log view, settings and trust, setup, setup end to
    end in an IDE, AC-030 in an IDE (T-040 last: it needs the settings page and Set up). Gate: as stage 7.
11. T-035 — Starter smoke on 3 OS. Gate: as stage 7 (`ide-tests` incl. the smoke).
12. T-036 → T-037 — Verifier and packaging checks, docs sync, spike removal, final gates. **Gate G4:** every local
    gate; every CI job (`plugin`, `vscode-mirror`, `vscode-guards`, `shared-guard`, `ide-tests`, `verify`) green on the
    same commit; parity matrix fully categorised; `/sdd-compile` READY. Then Gregor: AC-040–AC-042.

Parallel: stage 3 (T-009 ‖ T-010: CI guards vs. parity tooling, disjoint files) and stage 5 (T-014 ‖ T-015). Stage 4
and stages 6–12 stay `→`: the Kotlin steps share `plugin.xml` and the host router (`StudioProjectService`), the TS
entry steps share `src/hosts/embedded/main.ts`.

Manual-only, not implementer steps (last open evidence): AC-040 (Rider), AC-041 (WebStorm), AC-042 (keyboard, screen
reader, JCEF off) by Gregor on a fresh `C:\projects\test\tip-splitter` with the ZIP from the CI artifact (AC-040/AC-041
also re-measure R-5's core-ready time on Gregor's machine); Gregor's G1 decision in ADR-004 (given 2026-11-21); Marketplace vendor, certificate, secrets and first upload belong to 0036.

## Steps

### T-001 — Scaffold the JetBrains build, its CI workflow and the packaging guard lines

- **Covers:** AC-033 (manifest part), AC-037 (`.vscodeignore` part)
- **Files:** `.vscodeignore`, `jetbrains/settings.gradle.kts`, `jetbrains/build.gradle.kts`, `jetbrains/gradle.properties`,
  `jetbrains/gradle/libs.versions.toml`, `jetbrains/.gitignore`, `jetbrains/src/main/resources/META-INF/plugin.xml`,
  `jetbrains/src/main/resources/META-INF/pluginIcon.svg`, `.github/workflows/jetbrains.yml`
- **Do:** Append `jetbrains/**`, `dist/embedded/**`, `**/*.kts` to `.vscodeignore`. Gradle: `rootProject.name =
  "featherspec-studio"`; plugins `org.jetbrains.kotlin.jvm` 2.4.21, `org.jetbrains.intellij.platform` 2.20.1 (versions
  in `libs.versions.toml`); `repositories { mavenCentral(); intellijPlatform { defaultRepositories() } }`;
  `dependencies { intellijPlatform { intellijIdea("2025.3.1") } ; testImplementation(junit-jupiter 5.13.4);
  testRuntimeOnly(junit-platform-launcher) }`; `kotlin { jvmToolchain(21); compilerOptions { languageVersion/apiVersion
  = KotlinVersion.KOTLIN_2_2 } }`; `tasks.test { useJUnitPlatform() }`; `intellijPlatform { pluginConfiguration { id =
  "com.gregorbiswanger.featherspec.studio"; name = "FeatherSpec Studio"; version = "0.1.0"; vendor { name = "Gregor
  Biswanger" }; ideaVersion { sinceBuild = "253.29346"; untilBuild = provider { null } } } }`. `gradle.properties`:
  `kotlin.stdlib.default.dependency=false`, `org.gradle.configuration-cache=true`. `plugin.xml`: `<id>`, `<name>`,
  `<vendor>`, `<description>` (one English sentence ≥ 40 chars), `<depends>com.intellij.modules.platform</depends>`,
  `<depends>com.intellij.modules.jcef</depends>`, no extensions yet. Icon: copy `media/studio.svg` scaled to a 40×40
  viewBox. `.gitignore`: `build/`, `.gradle/`, `.intellijPlatform/`, `.kotlin/`. Workflow `jetbrains.yml`: `on: push
  (branches: [jetbrains-host, 'jetbrains-**']), pull_request, workflow_dispatch`; `concurrency` per ref; job `plugin`,
  matrix `ubuntu-latest, windows-latest, macos-latest`, `fail-fast: false`: Windows `git config --global
  core.autocrlf false` (mirror `ci.yml`), `actions/checkout@v4`, `actions/setup-node@v4` (22, npm cache), `npm ci`,
  `npm run package`, `actions/setup-java@v4` (temurin 21), `gradle/actions/setup-gradle@v6` with `gradle-version:
  9.7.0`, `gradle -p jetbrains build buildPlugin verifyPluginStructure`, then (Ubuntu) a step that extracts
  `META-INF/plugin.xml` from the plugin JAR inside `jetbrains/build/distributions/*.zip` with `unzip -p` and fails
  unless it contains `since-build="253.29346"`, no `until-build`, and exactly the two `<depends>` lines; upload the ZIP
  as artifact `plugin-zip` (Ubuntu). If `bundledPlugin("com.intellij.modules.jcef")` is needed for compilation later,
  that is T-005's call; not here.
- **Tests first:** none in Kotlin (empty plugin); the `unzip` check is the decision (red until the ZIP has the right XML).
- **Verify:** `CI: jetbrains.yml › plugin` green on ubuntu, windows, macos; artifact `plugin-zip` present.
- [x] **Verified (T-001):** 2026-11-20 · CI: `jetbrains.yml › plugin` green on ubuntu, windows, macos at `6fdc067` (run 44832785218); artifact `plugin-zip` uploaded (Ubuntu).
- **Notes:** Implementer (2026-11-20, uncommitted): local checks green (docsScan 186 passed; test:unit 35 + 186 passed; plugin.xml, pluginIcon.svg and jetbrains.yml parse). Deviations/choices: `build.gradle.kts` imports `org.jetbrains.kotlin.gradle.dsl.KotlinVersion` for `compilerOptions`; `junit-platform-launcher` pinned to 1.13.4 (matches Jupiter 5.13.4, plan gave no version); `plugin` job `timeout-minutes: 60` (plan gave none); `pluginIcon.svg` is `media/studio.svg`'s path scaled by `scale(0.05291005)` in a 40×40 viewBox, comment dropped, `fill="currentColor"` kept (check rendering on dark themes in T-005/T-027). `vsce` not installed locally, so the `.vsix` list check was skipped. Uncertain Gradle DSL names (not run): `intellijIdea(...)`, `pluginConfiguration { vendor { name } ideaVersion { sinceBuild, untilBuild } }`, `compilerOptions { languageVersion/apiVersion }`.

### T-002 — Context hygiene and architecture entries for `jetbrains/`

- **Covers:** AC-043 (`.architecture/jetbrains.md`, snapshot line)
- **Files:** `jetbrains/AGENTS.md`, `jetbrains/CLAUDE.md`, `.github/instructions/jetbrains.instructions.md`,
  `.architecture/jetbrains.md`, `AGENTS.md` (snapshot only), `.memory-bank/techContext.md`
- **Do:** `jetbrains/AGENTS.md` (≤ 40 lines): what lives here, the Kotlin conventions of *Execution model* above, "every
  Gradle/Kotlin/JVM check runs in CI only (`jetbrains.yml`)", the bridge contract pointer
  (`src/hosts/embedded/contract.ts`, from T-016), "never edit `src/core`". `jetbrains/CLAUDE.md`: the single line
  `@AGENTS.md`. Loader: front matter `applyTo: "jetbrains/**"`, `description: "JetBrains host rules (thin loader)."`,
  body pointing at `jetbrains/AGENTS.md` (mirror `.github/instructions/plans.instructions.md`). `.architecture/jetbrains.md`
  (≤ 40 lines, mirror the shape of `.architecture/adapters.md`): internal pattern, entry points (`plugin.xml`), task
  playbooks (CI-only verify). `AGENTS.md` snapshot `modules:` add exactly: `'jetbrains/ — IntelliJ Platform plugin
  (Kotlin, Gradle; built and tested in CI only) that runs the shared core in GraalJS and the webview bundle in JCEF
  (0034); inside view: .architecture/jetbrains.md'`; set the `# last reconciled:` comment to `2026-11-20 (0034)`.
  `techContext.md`: a section *JetBrains host (0034)* with the `plugin` job and "no local Gradle".
- **Tests first:** — (docs only)
- **Verify:** `local: npx vitest run src/adapters/node/docsScan.test.ts` green and `npm run test:unit` green.
- [x] **Verified (T-002):** 2026-11-20 · local: `npx vitest run src/adapters/node/docsScan.test.ts` → 186 passed; `npm run test:unit` → 35 passed (16 files), no failures.
- **Notes:** Snapshot line shortened to fit the 15000-byte AGENTS.md limit of docsScan: the orchestrator-decided line is 130 bytes incl. newline (AGENTS.md 14857 → 14987 bytes); `# last reconciled:` set to `2026-11-20 (0034)`; the `module maps:` list on that header line is unchanged. `jetbrains/AGENTS.md` is 27 lines; `.architecture/jetbrains.md` 23 lines; `jetbrains/CLAUDE.md` is `@AGENTS.md`. Plan header `Current step` left at T-001 (rules move it at stage end only; T-001 is not ticked, CI-verified). Per-step gates (eslint, tsc) not run: doc-only step.

### T-003 — S-1 (TS side): spike core bundle and a Node-vs-bare-context check

- **Covers:** AC-009 (S-1 R-1 input)
- **Files:** `jetbrains/spikes/core/entry.mjs`, `jetbrains/spikes/core/polyfills.mjs`, `jetbrains/spikes/core/pathPosix.mjs`,
  `jetbrains/spikes/core/build.mjs`, `jetbrains/spikes/core/check.mjs`, `jetbrains/spikes/.gitignore`
- **Do:** `entry.mjs` imports from `../../../src/core/...`: `createMemorySpecSource`, `readProject`, `deriveLifecycle`,
  `readSnapshot`, `nextStep`, `stepView`, `stepTips`, `parseStepTipSettings`, and defines `run(filesJson, version)`:
  files map `{relativePath: base64}` → memory source at root `memory://fixture` → `readProject` → JSON string of
  `{ read: readSnapshot(read), next: snapshot }` where `snapshot` copies the body of `snapshotOf()` from
  `src/core/board/testing/nextStepSnapshot.ts` (that module imports `fs`). `polyfills.mjs`: install only if missing —
  `TextDecoder` (UTF-8 only; `fatal`, `ignoreBOM`; non-fatal uses U+FFFD per maximal subpart), `TextEncoder`,
  `queueMicrotask` (via `Promise.resolve().then`). `pathPosix.mjs`: `dirname`, `isAbsolute`, `join`, `normalize` with
  Node's posix semantics, exported as `posix` and as default-free named exports. `build.mjs`: esbuild API, entry
  `entry.mjs`, `bundle`, `format: 'iife'`, `globalName: 'FeatherSpecSpike'`, `platform: 'neutral'`, `target:
  'es2022'`, `alias: { path: './pathPosix.mjs', 'node:path': './pathPosix.mjs' }`, inject `polyfills.mjs`, output
  `jetbrains/spikes/build/core-spike.js`. `check.mjs`: builds; for every folder in `test/fixtures/` except
  `next-step-baseline`, `read-baseline`, `setup` (26 folders, 20 of them with `.specs/`; version from its `AGENTS.md`
  `FeatherSpecVersion:`, else `1.10.0`) plus a generated 200-spec project
  (`generateProject` of `src/core/specs/testing/generateProject.ts`, bundled for Node by esbuild into a temp file) runs
  `run()` once in `vm.runInContext(bundle, vm.createContext({}))` (no Node globals) and once in the main context;
  fails on the first unequal string; writes each main-context output to
  `jetbrains/spikes/build/node-expected/<name>.json` and the inputs to `jetbrains/spikes/build/inputs/<name>.json`;
  prints `identical: <n>/<n>` and the bundle size. `.gitignore`: `build/`.
- **Tests first:** `check.mjs` is the test; red first by running it before `polyfills.mjs` exists (bare context throws
  `TextDecoder is not defined`).
- **Verify:** `local: node jetbrains/spikes/core/check.mjs` prints `identical: 27/27` (26 fixtures + generated) and
  exits 0.
- [x] **Verified (T-003):** 2026-11-20 · local: `node jetbrains/spikes/core/check.mjs` → `identical: 27/27`, `bundle: 88538 bytes`, exit 0. Red first (`polyfills.mjs` as empty stub): `ReferenceError: TextDecoder is not defined` in the bare context. Also: generated-200 read 200 specs; posix helpers equal `node:path` posix on 20 inputs.
- **Notes:** Implementer (2026-11-20, uncommitted): (1) esbuild `alias` rejects relative targets (`Could not resolve "./pathPosix.mjs"`), so `build.mjs` maps `path`/`node:path` with an `onResolve` plugin to the same file. (2) `entry.mjs` decodes base64 by hand (the Do named no decoder; bare GraalJS-like contexts lack `atob`/`Buffer`). (3) The "main context" run is `vm.runInThisContext` of the same bundle, so only the globals differ. (4) Version: `AGENTS.md` `FeatherSpecVersion:` else `1.10.0` (plan wording; core would read `unknown` for unstamped fixtures). (5) Directories are not carried into the memory source (the files map has files only); identical result says it does not matter for these inputs. Uncertain: UTF-8 fatal and replacement paths are exercised only through the fixtures, not by a dedicated differential test.

### T-004 — S-1 (JVM side): GraalJS measurements on the CI runners

- **Covers:** AC-009 (S-1 R-1, R-2, R-5, R-6 for V1)
- **Files:** `jetbrains/spikes/settings.gradle.kts`, `jetbrains/spikes/build.gradle.kts`, `jetbrains/spikes/gradle.properties`,
  `jetbrains/spikes/src/test/kotlin/com/gregorbiswanger/featherspec/spike/GraalCoreSpikeTest.kt`,
  `.github/workflows/jetbrains-spikes.yml`
- **Do:** Separate Gradle build (plain Kotlin JVM, no IntelliJ plugin), deps `org.graalvm.polyglot:polyglot:25.0.4`,
  `org.graalvm.polyglot:js:25.0.4` (pom), JUnit 5. The test (JUnit 5): `Context.newBuilder("js").allowHostAccess(
  HostAccess.NONE).option("engine.WarnInterpreterOnly", "false").build()`; time cold start (context build + `eval` of
  `../build/core-spike.js`); for each `../build/inputs/*.json` call `FeatherSpecSpike.run(files, version)` and assert
  the string equals `../build/node-expected/<name>.json` byte for byte; time the 200-spec run twice (cold, warm);
  write `build/s1-results.json` `{os, javaVersion, coldStartMs, perFixture, gen200FirstMs, gen200SecondMs,
  polyglotJarBytes}` where `polyglotJarBytes` is the sum of the test runtime classpath JARs from `org.graalvm*` and
  `com.ibm.icu*` (pass the list via a Gradle `systemProperty`). Assertions only for equality and "no exception";
  budgets are recorded, not asserted (spike). Workflow `jetbrains-spikes.yml`: `on: push (paths: jetbrains/spikes/**,
  .github/workflows/jetbrains-spikes.yml), workflow_dispatch`; job `spike-s1` (3 OS): node 22 + `npm ci` + `node
  jetbrains/spikes/core/check.mjs` + setup-java 21 + setup-gradle (9.7.0) + `gradle -p jetbrains/spikes test`; upload
  `jetbrains/spikes/build/s1-results.json` as `s1-results-${{ matrix.os }}` (always).
- **Tests first:** the equality test runs red first with an intentionally empty `node-expected` comparison (CI run 1),
  then green.
- **Verify:** `CI: jetbrains-spikes.yml › spike-s1` green on 3 OS; three `s1-results-*` artifacts.
- [x] **Verified (T-004):** 2026-11-20 · CI: `jetbrains-spikes.yml › spike-s1` green on ubuntu, windows, macos at `5a92fba` (run 44835557884): 27/27 fixtures byte-identical to Node under GraalJS 25.0.4. Measured (V1, interpreter on stock JDK 21): cold start 683 / 1179 / 1598 ms (mac / linux / win); 200 specs first read 3784 / 7014 / 8397 ms, second 2760 / 4085 / 4730 ms; slowest fixture 6027–8657 ms; polyglot JARs 64,939,002 bytes uncompressed. **V1 misses R-2 (0002 AC-018 < 2 s) and R-5 (cold start < 1 s) on every runner → T-038 (V2) appended per Stage 2.**
- **Notes:** Implementer (2026-11-20, uncommitted, no Gradle run): (1) Test working directory of Gradle is `jetbrains/spikes`, so `../build` of the Do would be wrong; Gradle passes the absolute `build` path as system property `spike.build`. (2) `run()` is `async` in `entry.mjs` (returns a Promise), so the Kotlin runner wraps it in a JS helper that stores `value`/`error`/`done` on an object and Kotlin reads it after `execute`; relies on GraalJS draining promise jobs at the end of `execute` (uncertain, unmeasured). (3) Inputs are `build/inputs/<name>.json` = `{version, files}`; the helper re-stringifies `files` (byte-identical to check.mjs's `filesJson`). (4) `gen200First/SecondMs` are two runs of `generated-200` before the equality loop; `perFixture` times all 27 in the loop. (5) Results are written before the equality assertion, so `s1-results` exists even on a mismatch; the upload uses `if: always()` with `if-no-files-found: warn`. (6) No `kotlin.stdlib.default.dependency=false` in `spikes/gradle.properties` (for plain JVM it would remove the stdlib). (7) Versions are hard-coded (the spikes build does not read `jetbrains/gradle/libs.versions.toml`). (8) Gradle DSL/API uncertainty: `layout.buildDirectory`, `configurations.testRuntimeClasspath.map { incoming.artifacts.artifacts }`, `ModuleComponentIdentifier.group`, `systemProperty` with `.get()`; `org.graalvm.polyglot:js:25.0.4` as a plain (pom-only) coordinate, not `@pom`. (9) GraalVM API used: `Context.newBuilder("js").allowHostAccess(HostAccess.NONE).option("engine.WarnInterpreterOnly", "false").build()`, `Source.newBuilder("js", File).build()`, `Context.eval("js", String)`, `Value.execute/getMember/asString/asBoolean/isNull`. (10) Red-first: no red run was made (no CI here); the orchestrator decides whether CI run 1 must be red (e.g. a temporary wrong expectation) before green. (11) `spikes/.gitignore` (`build/`) was left unchanged; `.gradle/` is covered by `jetbrains/.gitignore`.
  G3 review (2026-11-21): `GraalCoreSpikeTest` had no red run — CI run 1 was not made red (no temporary wrong expectation); the first recorded run is the green one at `5a92fba`. The red-first rule is not evidenced for this spike test; ADR-004 rests on its measured values, not on the test's ability to fail.

### T-005 — S-2: the unchanged webview bundle in a JCEF tab (spike plugin)

- **Covers:** AC-009 (S-2: resource handler, CSP, shim, hello → snapshot)
- **Files:** `jetbrains/spikes/build.gradle.kts` (add an IntelliJ plugin subproject `ide`), `jetbrains/spikes/settings.gradle.kts`,
  `jetbrains/spikes/ide/build.gradle.kts`, `jetbrains/spikes/ide/src/main/resources/META-INF/plugin.xml`,
  `jetbrains/spikes/ide/src/main/kotlin/com/gregorbiswanger/featherspec/spike/SpikePanel.kt`,
  `.../spike/SpikeResources.kt`, `.../spike/OpenSpikeAction.kt`, `jetbrains/spikes/core/reply.mjs`
- **Do:** `reply.mjs` (esbuild-run like `check.mjs`) writes `jetbrains/spikes/build/hello-reply.json`: the envelopes
  `shell`, `board`, `overview`, `detail` for fixture `studio-0015`, built exactly as `src/adapters/node/webviewBundle.test.ts`
  builds them (`buildCards`, `arrangeBoard`, `buildOverviewView`, `buildDetail`, `SHELL_BOARD` shape, `v: 11`). Spike
  plugin `com.gregorbiswanger.featherspec.spike` (same Gradle setup as T-001, `intellijIdea("2025.3.1")`; resources
  copied from `../../dist/webview` and `../build/hello-reply.json` via `processResources`): `OpenSpikeAction` (id
  `FeatherSpecSpike.Open`) opens a `LightVirtualFile` through a `FileEditorProvider` whose editor holds a
  `JBCefBrowser`; `SpikeResources` serves `https://studio.featherspec.invalid/{main.js,main.css,theme.css,index.html}`
  from the plugin JAR through `CefRequestHandlerAdapter.getResourceRequestHandler` → `CefResourceRequestHandlerAdapter.
  getResourceHandler` (mirror platform `JCefImageViewer`), and cancels every other URL (`onBeforeBrowse` /
  `onBeforeResourceLoad` return true). `index.html` = the output of `buildWebviewHtml` (TS, copy its exact template into
  a Kotlin string function `spikeHtml(nonce)`) plus the shim script tag of *Contracts › JCEF panel*. The shim's
  `postMessage` goes to a `JBCefJSQuery`; on `hello` the handler posts every envelope of `hello-reply.json` with
  `executeJavaScript`. A `plugin.xml` `<depends>` on platform and jcef.
- **Tests first:** none (spike; T-006's Starter run decides). `gradle -p jetbrains/spikes :ide:buildPlugin` must
  compile.
- **Verify:** `CI: jetbrains-spikes.yml › spike-s1` (extend its Gradle call with `:ide:buildPlugin`) green on 3 OS.
- [x] **Verified (T-005):** 2026-11-20 · CI: `jetbrains-spikes.yml › spike-s1` (incl. `:ide:buildPlugin`) green on ubuntu, windows, macos at `6592b11` (run 44837015376); `jetbrains.yml › plugin` green (run 44837015473).
- **Notes:** Implementer (2026-11-20, uncommitted, no Gradle/Kotlin run here). Local: `node jetbrains/spikes/core/reply.mjs` wrote `build/hello-reply.json` (keys `shell`, `board`, `overview`, `detail`, each `v: 11`, fixture `studio-0015`, spec `0015-focus-on-visibility` for detail); `node jetbrains/spikes/core/check.mjs` → `identical: 27/27`. YAML of `jetbrains-spikes.yml` parses. Deviations: (1) the workflow is edited beyond *Files*, because *Verify* needs it: `node esbuild.js` and `node jetbrains/spikes/core/reply.mjs` run before Gradle (processResources needs `dist/webview` and `hello-reply.json`), and the Gradle call is `gradle -p jetbrains/spikes test :ide:buildPlugin`. (2) `processResources` paths are resolved from the spike root (`rootProject.file("../../dist/webview")`, `rootProject.file("build/hello-reply.json")`); the Do's `../build/` is relative to `ide/`, the `../../dist` relative to the spike root. (3) `theme.css` exists nowhere in the repo: the spike serves an empty `text/css`. The plan puts the theme link "after `<div id="root">`" but also "before `main.css`"; the link sits in `<head>` before `main.css`, the shim and bundle tags after the root div. (4) `spikeHtml(nonce, themeClass, postRequest)` takes two more parameters than the Do's `spikeHtml(nonce)`: the body class `vscode-light` or `vscode-dark` comes from `JBColor.isBright()`, the request code from `JBCefJSQuery.inject("request")`. (5) On `hello`, one `executeJavaScript` posts the four envelopes from the JSON file in order; Kotlin does not parse JSON. (6) Root spike build: `org.jetbrains.intellij.platform` 2.20.1 declared `apply false`; the `ide` subproject applies `kotlin("jvm")` without a version and sets `version = "0.1.0-spike"` (needed by `buildPlugin`). Uncertain (not verified against a real jar, CI decides): `bundledPlugin("com.intellij.modules.jcef")` (in IP 2.x a module may need `bundledModule("intellij.platform.jcef")` instead); `JBCefBrowser`, `jbCefClient.addRequestHandler(handler, cefBrowser)`, `JBCefJSQuery.create/addHandler/inject(String)`; `CefRequestHandlerAdapter.getResourceRequestHandler` (last parameter `org.cef.misc.BoolRef`); `CefResourceRequestHandlerAdapter`, `CefResourceHandlerAdapter` (existence); `CefCallback.Continue()`; `CefResponse` status and mimeType setters; `CefBrowser.executeJavaScript(String, String, Int)`; `FileEditorPolicy.HIDE_DEFAULT_EDITOR`; `FileEditorStateLevel` and `FileEditor.getState`; `LightVirtualFile` (test-framework package in production code); `FileTypes.PLAIN_TEXT`; `FileEditorManager.openFile(file, Boolean)`; `AnAction.getActionUpdateThread`; `JBColor.isBright()`. Not measured: whether JCEF's resource handler serves the `https://studio.featherspec.invalid` origin without DNS (T-006's Starter run decides).

### T-006 — S-2 themes, screenshots and the in-IDE GraalJS probe (Starter run)

- **Covers:** AC-009 (S-2 screenshots; S-1 R-1 "no classloader errors" in the plugin class loader)
- **Files:** `jetbrains/spikes/ide/src/main/kotlin/com/gregorbiswanger/featherspec/spike/SpikeTheme.kt`,
  `.../spike/SpikeProbeAction.kt`, `jetbrains/spikes/ide/build.gradle.kts`,
  `jetbrains/spikes/ide/src/integrationTest/kotlin/com/gregorbiswanger/featherspec/spike/SpikeIdeTest.kt`,
  `.github/workflows/jetbrains-spikes.yml`
- **Do:** `SpikeTheme`: `theme.css` = `:root{…}` with every `--vscode-*` variable found by regex in
  `src/webview/main.css` (copied into resources at build), each mapped from `UIManager.getColor(key)` /
  `JBColor.namedColor(key, fallback)` with a fixed fallback; body class from
  `LafManager.getInstance().currentUIThemeLookAndFeel` (`isDark`; High Contrast when the theme id/name contains
  `HighContrast`). `SpikeProbeAction` (id `FeatherSpecSpike.Probe`): (1) creates a GraalJS `Context` with the thread's
  context class loader set to the plugin's class loader, evaluates `core-spike.js`, runs one fixture, records ok/error
  text; (2) for each of Light, Darcula, High Contrast: switch with `LafManager.setCurrentLookAndFeel(…)` +
  `updateUI()`, reopen the spike tab, wait 2 s, capture the IDE frame with `java.awt.Robot().createScreenCapture` to
  `<system.out>/s2-<theme>.png`; writes `s2-results.json`. `SpikeIdeTest` (Starter, JUnit 5): `Starter.newContext(…,
  TestCase(IdeInfo.IdeaUltimate, LocalProjectInfo(<copy of test/fixtures/studio-0015>)).withVersion("2025.3.1"))`,
  `PluginConfigurator(this).installPluginFromDir(path.to.build.plugin)`, VM options `idea.trust.all.projects=true`,
  `ide.show.tips.on.startup.default.value=false`, `runIdeWithDriver().useDriverAndCloseIde { waitForIndicators(5
  minutes); invokeAction("FeatherSpecSpike.Probe") ; wait for s2-results.json }`. Workflow: job `spike-ide`, matrix
  ubuntu (required) + windows (`continue-on-error: true`), runs `gradle -p jetbrains/spikes :ide:integrationTest`,
  uploads `**/out/ide-tests/**` and the PNG/JSON files as `spike-ide-${{ matrix.os }}`. If the Driver API names differ
  from these, use the names of the [UI testing page](https://plugins.jetbrains.com/docs/intellij/integration-tests-ui.html)
  and record them in Notes.
- **Tests first:** `SpikeIdeTest` asserts `s2-results.json` reports `graal: ok` and three PNGs > 10 KB; red on the
  first run until the action exists.
- **Verify:** `CI: jetbrains-spikes.yml › spike-ide` green on ubuntu; artifact with `s2-light.png`, `s2-darcula.png`,
  `s2-high-contrast.png`.
- [x] **Verified (T-006):** 2026-11-21 · CI: `jetbrains-spikes.yml › spike-ide` green on ubuntu and windows at `c936947` (run 44844442596) and `fae8eb2` (run 44846550133); s2-light/darcula/high-contrast PNGs uploaded; Windows shows the unchanged webview bundle (Board of studio-0015) in the JCEF tab; graal probe in the plugin class loader: Truffle "Multi-Release classes are not configured correctly" (R-1 fails for V1).
- **Notes:** Implementer (2026-11-20, uncommitted, no Gradle/Kotlin run; brackets and YAML checked locally). Deviations: (1) `SpikeResources.kt` (`/theme.css` now served by `SpikeTheme.css()`, was empty), `SpikePanel.kt` (body class from `SpikeTheme.bodyClass()`, `JBColor` import removed) and `ide/src/main/resources/META-INF/plugin.xml` (action `FeatherSpecSpike.Probe` registered) changed beyond *Files*, because the Do needs them. (2) The probe reads `core-spike.js`, `studio-0015.json` and `studio-0015.expected.json` from plugin resources under `graal/`; `processResources` copies them from `build/` (produced by `check.mjs`), which the workflow runs first. "ok" means the GraalJS output equals the Node output byte for byte. (3) The output directory is not Starter's `system.out`: the test passes `-Dspike.out=<abs jetbrains/spikes/ide/build/spike-out>` as a VM option and reads the results there; the workflow uploads that directory. (4) Linux runs under `xvfb-run -a` (Robot needs a display); a step installs `xvfb`; the job's `continue-on-error` is set for Windows (the Do said Windows may fail). (5) The theme map is the implementer's: about 20 `--vscode-*` colours are mapped to IntelliJ UI keys (`UIManager.getColor`), every other colour falls back to grey `#808080`, font variables are fixed (`system-ui`, `monospace`, `13px`). Charts colours therefore show grey. (6) The `integrationTest` task is `intellijPlatformTesting.testIdeUi.registering` (as in the intro page), with `dependsOn(tasks.buildPlugin)`; `path.to.build.plugin` is the buildPlugin ZIP, and the test calls `installPluginFromDir` on it as the Do says. The docs do not show whether Starter accepts a ZIP here; if CI rejects it, the fix is `installPluginFromPath` or the exploded plugin directory. (7) The Starter names used are from the intro page: `Starter.newContext`, `TestCase`, `IdeInfo.IdeaUltimate`, `LocalProjectInfo`, `PluginConfigurator.installPluginFromDir`, `runIdeWithDriver`, `useDriverAndCloseIde`, `waitForIndicators`, `ideFrame { invokeAction(...) }` (import `com.intellij.driver.sdk.ui.components.ideFrame`, not confirmed). Not from the docs, unverified: `addVMOptionsPatch { addSystemProperty(...) }` (replaces the Do's "VM options" wording), `TestCase.withVersion`. (8) Platform API names not confirmed against a jar: `UIThemeLookAndFeelInfo.id/name/isDark`, `LafManager.currentUIThemeLookAndFeel`, `installedThemes`, `setCurrentLookAndFeel`, `updateUI`, `FileEditorManager.closeFile`, `java.awt.Frame.getFrames`. Theme picking uses name fragments "Light", "Darcula", "Contrast". (9) The workflow is the Do's job `spike-ide`, with the Gradle command `gradle -p jetbrains/spikes :ide:integrationTest` (no `buildPlugin` call of its own). (10) Red-first: no red run was made here (no CI); the orchestrator decides whether CI run 1 must be red before green. (11) Deps: GraalJS `org.graalvm.polyglot:polyglot` and `org.graalvm.polyglot:js` 25.0.4 as `implementation` in `ide`; Kodein, coroutines and JUnit as `integrationTestImplementation` (the plan's approved coordinates).
  Fix round 1: source set before configurations.getting; plain Test task with prepareSandbox per the integration-tests docs.
  Fix round 3: probe auto-runs via postStartupActivity when -Dspike.out is set; test uses only documented Starter APIs (IdeProductProvider.IU, applyVMOptionsPatch, waitForIndicators). Fix round 4 (orchestrator, from the CI log of run 44843399109): GraalJS inside the plugin class loader fails — "Truffle could not be initialized because Multi-Release classes are not configured correctly" (R-1 finding for ADR-004); the test now records the graal result instead of requiring ok; `SpikeEditorProvider` is `DumbAware` (HIDE_DEFAULT_EDITOR needs it, the tab opened as a text editor before).

### T-007 — S-4: delay from an external write to the IDE's file event, on three OS

- **Covers:** AC-009 (S-4), input to AC-021
- **Files:** `jetbrains/spikes/ide/src/main/kotlin/com/gregorbiswanger/featherspec/spike/SpikeVfsAction.kt`,
  `jetbrains/spikes/ide/src/main/resources/META-INF/plugin.xml`,
  `jetbrains/spikes/ide/src/integrationTest/kotlin/com/gregorbiswanger/featherspec/spike/SpikeVfsTest.kt`,
  `.github/workflows/jetbrains-spikes.yml`
- **Do:** `SpikeVfsAction` (id `FeatherSpecSpike.Vfs`): subscribes `VirtualFileManager.VFS_CHANGES` with a
  `BulkFileListener.after(events)` on the project's message bus, calls `LocalFileSystem.getInstance().addRootToWatch(
  <project>/.specs, true)`; then, 10 times, writes `.specs/backlog/s4-<n>.md` with `java.nio.file.Files.writeString`
  from a pooled thread (the "external process": plain NIO, no VFS) and records ms until the event for that path, and
  `ApplicationManager.getApplication().isActive` at that moment; then repeats once after
  `VfsUtil.markDirtyAndRefresh(true, true, true, specsDir)` on `ApplicationActivationListener.applicationActivated`
  (subscribe on `ApplicationActivationListener.TOPIC`). Writes `s4-results.json`. The IDE-not-focused case: if the
  runner cannot take focus away (`isActive` stays true), record `unfocused: not measurable on this runner`.
  `SpikeVfsTest` mirrors `SpikeIdeTest`, invokes `FeatherSpecSpike.Vfs`. Job `spike-ide` matrix extended to macos
  (`continue-on-error: true` on windows and macos for UI permission issues; results uploaded either way).
- **Tests first:** `SpikeVfsTest` asserts `s4-results.json` has 10 timed events; red until the action exists.
- **Verify:** `CI: jetbrains-spikes.yml › spike-ide` green on ubuntu; `s4-results.json` uploaded for each OS that ran.
- [x] **Verified (T-007):** 2026-11-21 · CI: `spike-ide` green on ubuntu and windows at `fae8eb2` (run 44846550133). s4: first external write seen after 5118 ms (linux) / 6535 ms (win), second 1663 ms (win), then no event within 30 s; after `VfsUtil.markDirtyAndRefresh` 18 ms (linux) / 26 ms (win) — the IDE file watcher alone does not meet AC-021 on the runners. macos (run 44846550133, green): event 1 none within 30 s, event 2 after 13987 ms, then none; after explicit refresh 132 ms.
- **Notes:** Implementer (2026-11-21, uncommitted, no Gradle/Kotlin run; workflow YAML parsed locally with PyYAML, `spike-ide` matrix = ubuntu, windows, macos). Deviations: (1) `SpikeAutoRun` runs `runSpikeVfs` when `spike.vfs=true` and `runSpikeProbe` unless `spike.probe=false`, both after the 5 s wait (orchestrator adjustment). (2) The "repeat after applicationActivated" is two parts: an `ApplicationActivationListener` (counted as `activations`, calls `markDirtyAndRefresh`) and one extra timed write `s4-11.md` (`afterRefresh`) that calls the same `markDirtyAndRefresh` right after the write, because the runner cannot force focus away. `unfocused` reads `measured` only if a timed event saw `active=false`, else `not measurable on this runner`. (3) `VFS_CHANGES` and `ApplicationActivationListener.TOPIC` are subscribed on the application bus (VFS events are published there), not the project bus. (4) `s4-results.json`: `events` (10 entries, `n`, `ms` where `-1` means no event within 30 s, `active`), `afterRefresh`, `activations`, `unfocused`, `os`; an exception writes `{"error":…}` instead, and the test then fails. (5) Workflow: `spike-ide` gains `macos-latest`; `continue-on-error` is `matrix.os != 'ubuntu-latest'`; the Windows step is now `if: runner.os != 'Linux'` (Windows and macOS). `build.gradle.kts` is unchanged: `:ide:integrationTest` already compiles `SpikeVfsTest`. Uncertain, not compiled: `BulkFileListener.after(events: List<VFileEvent>)` override form, `applicationActivated(ideFrame: IdeFrame)` parameter type, `addRootToWatch` (result ignored), `refreshAndFindFileByPath`, `messageBus.connect().subscribe`. Red first: no red run (no CI here); the CI run of `spike-ide` decides the red/green state of `SpikeVfsTest`.

### T-038 — S-1 V2: the shared core in a hidden JCEF browser (appended 2026-11-20, V1 missed R-2/R-5)

- **Covers:** AC-009 (S-1 for candidate V2)
- **Files:** `jetbrains/spikes/ide/src/main/kotlin/com/gregorbiswanger/featherspec/spike/SpikeV2Action.kt`,
  `jetbrains/spikes/ide/src/main/resources/META-INF/plugin.xml`,
  `jetbrains/spikes/ide/src/integrationTest/kotlin/com/gregorbiswanger/featherspec/spike/SpikeV2Test.kt`,
  `jetbrains/spikes/ide/build.gradle.kts` (resources), `.github/workflows/jetbrains-spikes.yml`
- **Do:** `SpikeV2Action` (id `FeatherSpecSpike.V2`): builds an off-screen browser that is never added to a Swing
  parent — `JBCefBrowser.createBuilder().setOffScreenRendering(true).build()`, then `createImmediately()` — and loads
  `https://studio.featherspec.invalid/core.html` through `SpikeResources` (T-005), a page that only loads
  `core-spike.js` (T-003 bundle, copied into resources like the webview files). Through one `JBCefJSQuery` it runs the
  same 27 inputs and the generated-200 input as T-004's `GraalCoreSpikeTest` (read the inputs the same way; the
  expected bytes are `node-expected/<name>.json`), one call per input, and measures: cold start (browser created →
  bundle evaluated), each fixture, generated-200 first and second; plus timer fidelity while hidden: 10 × a JS
  `setTimeout(…, 100)` inside the hidden page, recording the actual delay. Writes `s1v2-results.json` with the same
  keys as `s1-results.json` plus `identical` (count), `timerDelaysMs`. `SpikeV2Test` mirrors `SpikeIdeTest` and
  invokes `FeatherSpecSpike.V2`.
- **Tests first:** `SpikeV2Test` asserts `s1v2-results.json` reports `identical: 27`; red until the action exists.
- **Verify:** `CI: jetbrains-spikes.yml › spike-ide` green on ubuntu; `s1v2-results.json` uploaded for each OS that ran.
- [x] **Verified (T-038):** 2026-11-21 · CI: `spike-ide` green on ubuntu and windows at `fae8eb2` (run 44846550133): V2 identical 27/27; generated-200 411/213 ms (linux), 512/306 ms (win); slowest fixture 418 / 653 ms; hidden-page timers 100–102 ms for 100 ms; cold start incl. JCEF init 5313 / 9576 ms. macos (run 44846550133, green): identical 27/27; generated-200 817/757 ms; slowest fixture 914 ms; hidden-page timers 176–177 ms for 100 ms; cold start incl. JCEF init 8956 ms.
- **Notes:** Orchestrator fix (run 44845436423): `writeV2Index` broke the configuration cache → spikes build runs without it (`org.gradle.configuration-cache=false`, spikes only); Linux runner: JCEF was "suspended" because Ubuntu restricts unprivileged user namespaces (sandbox) → workflow sets `kernel.apparmor_restrict_unprivileged_userns=0` (CI only; product note for ADR-004: Linux users on Ubuntu 24.04+ may see the same JCEF suspension). Implementer (2026-11-21, uncommitted, no Gradle/Kotlin run; sandbox cannot run Gradle). Deviations: (1) `SpikeAutoRun` runs `runSpikeV2` when `spike.v2=true` (no Driver calls). (2) The inputs and expected outputs go to `v2/inputs/`, `v2/node-expected/` in the plugin resources, `core-spike.js` is read from the existing `graal/core-spike.js`. A jar cannot be listed, so Gradle task `writeV2Index` writes the input names to `v2/inputs.txt` (from `build/inputs`, by `processResources`). (3) The page is `core.html`: it loads `core-spike.js` and posts `ready` once the bundle is evaluated (instead of `onLoadEnd`). `JBCefJSQuery.create(browser)` takes the `JBCefBrowser` directly, as `SpikePanel` does (the cast in the Do was not needed). (4) Protocol: the page posts one string `id US status US payload` (US = U+001F; status `ok` or `error`); Kotlin splits it with `limit = 3`. JS to Kotlin uses `ConcurrentHashMap<String, CompletableFuture>` via `computeIfAbsent`. Kotlin to JS: `executeJavaScript("featherspecV2Run(<id>, <json text literal>)")`, the literal from a small `quoteJson`. (5) Timers: 10 concurrent `setTimeout(…,100)` after `ready`, before the fixtures; `timerDelaysMs` is the rounded `performance.now()` deltas. (6) Measurements follow T-004: `coldStartMs` = browser created to `ready`; `gen200First/Second` run twice before the loop; the loop covers all 27 inputs including `generated-200` (`perFixture` has 27 keys). `identical` counts byte equality. (7) Per-call timeout 180 s, `ready` 120 s, timers 60 s; any failure writes `{"error":…}`. (8) Workflow unchanged: `check.mjs` already runs before Gradle and `:ide:integrationTest` runs `SpikeV2Test` on its own. (9) Local check: the harness was extracted from `SpikeV2Action.kt` and run in a Node VM against the real `build/core-spike.js` and `build/inputs`: 27/27 byte-identical, timers reported, a bad input replies `error`. Not compiled, not run in the IDE. Uncertain (CI decides): `Copy.from(Provider<RegularFile>)` for `v2Index`; `JBCefBrowser.createBuilder().setOffScreenRendering(true)` and `createImmediately()` before `cefBrowser`; that `executeJavaScript` is not blocked by the page CSP (it was not blocked in T-005); the 180 s per-call time for the 200-spec run under off-screen rendering.

### T-008 — ADR-004: record the spike results; Gregor decides

- **Covers:** AC-009
- **Files:** `docs/decisions/ADR-004-jetbrains-host.md`, `docs/decisions/adr-004/` (the PNG screenshots), `.memory-bank/systemPatterns.md`
- **Do:** The orchestrator downloads the artifacts of the green runs of T-004, T-006, T-007 and gives their JSON and
  PNG files to the implementer. ADR-004 (mirror the shape of `ADR-002-runtime-storage.md`): context; R-1…R-6 table per
  candidate run (V1 per OS: equality, cold start, 200-spec times, JAR bytes vs. the 60 MB ZIP limit, in-IDE probe); S-2
  screenshots linked from `docs/decisions/adr-004/`; S-3 table from *Research* (Claude Code: prefills without sending
  via `claude-cli://` deep link, external terminal; Copilot: not possible; AI Assistant: not possible); S-4 delays per
  OS, focused/unfocused; options and consequences; a **Decision** section left as `Gregor: <runtime V1|V2>;
  handovers → spec 0035` with date, filled by Gregor. `systemPatterns.md`: one dated line pointing at ADR-004 (after
  Gregor's entry).
- **Tests first:** — (doc)
- **Verify:** `local: npx vitest run src/adapters/node/docsScan.test.ts` green; `manual: Gregor reads ADR-004 and writes
  his decision into it` — no command can make a product decision.
- [x] **Verified (T-008):** 2026-11-21 · manual: Gregor accepted ADR-004 at gate G1 (decision by Gregor 2026-11-21: runtime V2, R-5 → core ready ≤ 12 s at project open, no-JCEF notice with only the settings page working, Copy prompt only with the Claude Code deep link as 0035's candidate); ADR-004 `Status: Accepted`, Decision field filled. local: `npx vitest run src/adapters/node/docsScan.test.ts` → 186 passed.
- **Notes:** 2026-11-21: draft `docs/decisions/ADR-004-jetbrains-host.md` written (recommends V2 hidden JCEF; Decision field open for Gregor at G1; S-2 PNGs added under `docs/decisions/adr-004/`). Decision recorded the same day; spec amended (OP-025); plan re-planned (*Approach* › G1 re-plan); `systemPatterns.md` decision line added.

### T-009 — VS Code guards in CI (`.vsix` list, JetBrains-only byte identity, workflows unchanged, mirror job)

- **Covers:** AC-037, AC-038, AC-039 (`ci.yml` part)
- **Files:** `jetbrains/guards/vsixFiles.mjs`, `jetbrains/guards/vsixFiles.test.mjs`, `jetbrains/guards/sameBundles.mjs`,
  `jetbrains/guards/sameBundles.test.mjs`, `jetbrains/guards/vsix-files.txt`, `.github/workflows/jetbrains.yml`
- **Do:** `vsix-files.txt`: the 11 paths of *Research*, sorted, one per line. `vsixFiles.mjs`: exports
  `compareFileLists(actual, expected) → {added, missing}`; CLI runs `npx --yes @vscode/vsce ls`, normalises paths,
  compares with the snapshot, prints added/missing and exits 1 on any difference; `--self-test` runs the comparison
  against the snapshot with one line removed and one added and exits 0 only if both are reported (negative control).
  `sameBundles.mjs`: exports `isJetBrainsOnly(paths)` (true when every path starts with `jetbrains/`, `docs/jetbrains/`,
  `.github/workflows/jetbrains`) and `compareDigests(a, b)`; CLI `<baseDir> <headDir>` compares SHA-256 of
  `dist/extension.js`, `dist/webview/main.js`, `dist/webview/main.css`. Tests (`node:test`): the pure functions,
  including a negative control each. Workflow: top-level `env: START_COMMIT: <Baseline hash from this plan's handoff>`;
  job `vscode-mirror` = the steps of `ci.yml`'s `build` job copied verbatim (matrix ubuntu, windows); job
  `vscode-guards` (ubuntu, `fetch-depth: 0`): `node --test 'jetbrains/guards/*.test.mjs'`; `npm ci`; `npm run package`;
  `node jetbrains/guards/vsixFiles.mjs` and `--self-test`; `git diff --exit-code $START_COMMIT --
  .github/workflows/ci.yml .github/workflows/publish.yml`; for push events with `github.event.before` set: list changed
  paths `before..sha`; if `isJetBrainsOnly`, check out `before` into `base/` (`actions/checkout` with `ref` and
  `path`), `npm ci && npm run package` there, and run `sameBundles.mjs base .` (fail on any digest difference).
- **Tests first:** `node --test 'jetbrains/guards/*.test.mjs'` red (missing exports), then green.
- **Verify:** `local: node --test 'jetbrains/guards/*.test.mjs'`; `CI: jetbrains.yml › vscode-mirror` (ubuntu, windows) and
  `› vscode-guards` green.
- [x] **Verified (T-009):** 2026-11-21 · local: `node --test 'jetbrains/guards/*.test.mjs'` 16 pass; `vsixFiles.mjs` matches the 11-file snapshot, `--self-test` ok. CI at `cb9cd22` (run 44853085024): `vscode-mirror` (ubuntu, windows), `vscode-guards`, `plugin` (3 OS) green.
- **Notes:** Verify uses `node --test 'jetbrains/guards/*.test.mjs'` (the directory form fails on Node 22). All-zero `github.event.before` (new branch) counts as not set. `isJetBrainsOnly([])` is false. Extra exports normaliseListing, runSelfTest, BUNDLE_PATHS. `vsce ls` matched the 11-file snapshot locally (orchestrator, 2026-11-21). Implemented in parallel with T-010.
  G3 fix round (727f708): `isJetBrainsOnly` treats `.specs/`, `.memory-bank/`, `.architecture/`, `docs/`, `AGENTS.md`, `CLAUDE.md`, `jetbrains/`, `.github/workflows/jetbrains*`, `.github/instructions/jetbrains.instructions.md` as neutral/JetBrains, so plan ticks no longer disable the AC-038 byte check; `[]` stays false.

### T-010 — Parity matrix generator and check, and the PD entries for deliberate differences

- **Covers:** AC-001, AC-002, AC-003 (mechanism)
- **Files:** `src/adapters/node/parity.ts`, `src/adapters/node/parity.test.ts`, `docs/jetbrains/parity-source.json`,
  `docs/jetbrains/parity.md`, `docs/product/product-decisions.md`
- **Do:** `parity.ts` exports `type ParityCategory = 'shared' | 'host' | 'n-a' | 'deliberately different'`,
  `interface ParitySource { pending: string[]; specs: Record<string, { default?: Rule; ranges?: Record<string, Rule>;
  criteria?: Record<string, Rule> }> }` (`Rule = { category; reference; note? }`, range key `AC-001..AC-006`),
  `collectCriteria(project: ProjectRead)` (every spec entry under `.specs/done/` or `.specs/active/`, number ≠ 0034,
  each criterion with `id`, `struck`), `buildRows(criteria, source)`, `checkRows(rows, criteria, pdIds)` returning
  failures `{kind: 'missing'|'duplicate'|'no-category'|'unknown-category'|'no-reference'|'unknown-criterion'|'bad-pd'|
  'struck-not-na', row}` — reference rules of spec §6.2: shared → one of `C-read`, `C-next`, `C-views`, `C-setup`,
  `shared-test`; host → `H-<n>` and `0034 AC-<nnn>`; n-a → non-empty reason; deliberately different → an existing
  `PD-<nnn>`; struck criteria and specs 0008–0012 must be n-a — and `renderMarkdown(rows)` (deterministic: spec, AC
  order, one table). The test reads this repo's `.specs/` via `readProject(createNodeSpecSource(), <repo root URI>,
  '1.10.0')` (mirror the 0016 AC-005 self-read test), reads the source and `product-decisions.md`; asserts (a) no
  failure for specs not in `pending`; (b) rows of `pending` specs are reported with `it.todo` titles; (c) one negative
  control per failure kind on a synthetic source; (d) rendering twice is byte-identical; (e) `docs/jetbrains/parity.md`
  equals `renderMarkdown()`; `FEATHERSPEC_WRITE_PARITY=1` writes the file (mirror `FEATHERSPEC_WRITE_BASELINE`). Source
  starts with every spec number in `pending`, and 0008–0012 with `default: {category: 'n-a', reference: 'Deprecated,
  successor 0015'}` (not pending). PD entries (proxy, basis spec 0034, 2026-11-20): PD-099 vocabulary (§6.8, OP-006,
  OP-019, incl. the S5 "plugin" sentence); PD-100 badge as tool-window title count plus stripe dot, names (OP-007,
  OP-012); PD-101 no inline tree action (OP-008); PD-102 settings application-level only (OP-009); PD-103 folders =
  base directory plus content roots outside it (OP-004); PD-104 separate status-history stores (OP-005); PD-105 Copy
  prompt only until a handover is proven, handovers in 0035 (§6.7, OP-024); PD-106 external change on screen within
  2 s of the write (OP-003); PD-107 Escape with nothing to close returns focus to the last editor (OP-011). Approved by Gregor 2026-11-20.
- **Tests first:** `parity.test.ts` red against a `Not implemented` stub of every export.
- **Verify:** `local: npx vitest run src/adapters/node/parity.test.ts src/adapters/node/docsScan.test.ts` green, then
  the four local gates (`eslint`, `tsc` ×2, `npm run test:unit`).
- [x] **Verified (T-010):** 2026-11-21 · local: `npx vitest run src/adapters/node/parity.test.ts` 20 passed, 28 todo (pending specs); docsScan 186; eslint, tsc ×2 green; `npm run test:unit` 3925 passed, 28 todo, timing 35 passed.
- **Notes:** Parser note bullets that start with an AC ID are no criteria: `collectCriteria` keeps one occurrence per spec+AC, the bold `**AC-nnn**` bullet if there is one, else the first (option a; orchestrator proxy 2026-11-21, Gregor confirms) — found on 0010 AC-001, 0001 AC-022, 0004 AC-001, 0006 AC-012/015/016, 0014 AC-010, 0021 AC-025. `duplicate` flags two source rules for one spec+AC. PD-099…PD-107 wording written from the plan lines — Gregor reviews. The bold-preference test was written after the code (no red run). Implemented in parallel with T-009.
  G3 review (2026-11-21): `Verified:` records no red run of `parity.test.ts` against the `Not implemented` stubs, only the green one, so the red-first rule is not evidenced for this step; what shows the check can fail are the AC-002 negative controls (one per failure kind, synthetic source) and the duplicate control.

### T-011 — Categorise every criterion of 0001–0033

- **Covers:** AC-001, AC-003
- **Files:** `docs/jetbrains/parity-source.json`, `docs/jetbrains/parity.md`, `docs/product/product-decisions.md` (only if a new PD is needed)
- **Do:** For each spec in `pending`, read its acceptance criteria and decide with this table, in order: struck or
  Deprecated spec → n-a (reason); names a VS Code-only mechanism without counterpart (a host test API,
  `ExtensionMode.Test`, a manifest/`contributes` key, `.vsix`, VS Code Marketplace listing, `npm test` host suites,
  `viewsWelcome` command links) → n-a (mechanism); behaviour changed by PD-099…PD-107 → deliberately different
  (PD); names a host element of §6.3 (Activity Bar, view, badge, status bar, command, Command Palette, setting UI,
  Workspace Trust, workspace folders, file watcher, `workspaceState`/`globalStorageUri`, quick pick, notification,
  modal, progress, Output channel, editor/`ViewColumn`, clipboard, extensions) → host (`H-n` + the 0034 AC of §6.3's
  row); otherwise → shared with `C-read` (spec model, diagnostics), `C-next` (next step, tips), `C-views` (Board,
  Overview, Plan map, detail, tree, status texts), `C-setup` (setup classes, merge prompt) or `shared-test` (webview
  rendering/keyboard decided by a Vitest test on the same bundle). Prefer `default` + `ranges` per spec, `criteria`
  only for exceptions. Empty `pending`; regenerate `parity.md` with `FEATHERSPEC_WRITE_PARITY=1`.
- **Tests first:** — (data; the T-010 check decides)
- **Verify:** `local: npx vitest run src/adapters/node/parity.test.ts` green with no `todo`; `npm run test:unit` green.
- [x] **Verified (T-011):** 2026-11-21 · local: parity test 20 passed, 0 todo (`"pending": []`); docsScan 186; `npm run test:unit` 3925 passed.
- **Notes:** Every AC of 0001–0007, 0013–0033 has an explicit rule (ranges per block, no `default`, so new criteria stay uncategorised); 0008–0012 keep `default` n-a. 638 criteria: shared 438, host 112, n-a 13, deliberately different 75 (PD-105 60, PD-103 9, PD-099 3, PD-100/101/104 1 each). PD-102, PD-106, PD-107 referenced by no row. Judgement calls (0001 folder set → PD-103; manifest keys with a JetBrains counterpart → host; Send → PD-105; Escape → shared-test) for Gregor's review.

### T-012 — Host-neutral composition: move the wiring out of `src/extension.ts`

- **Covers:** §6.9 (shared change), AC-006, AC-039 (behaviour preserved)
- **Files:** `src/hosts/compose.ts`, `src/hosts/compose.test.ts`, `src/extension.ts`, `AGENTS.md` (snapshot)
- **Do:** Move — do not rewrite; keep statement order — every construction in `activate()` from `createProjectLine()`
  through `createTreeActions(...)` and the start sequence (`removeEarlierRunData`, `session.start`, `controller.start`,
  `session.whenIdle`) into `composeStudio(ports: HostPorts): Studio` in `src/hosts/compose.ts`. `HostPorts` holds one
  member per adapter `activate()` creates today: `platform`, `studioVersion`, `fileSystem`, `specSource`, `folders`,
  `workspaceState`, `uiMemory(key)`, `clock`, `runtimeClock`, `ids`, `ui`, `markerWatch`, `fileWatch`, `sameRoot`,
  `output` (`OutputPort & { show(): void }`), `statusItem`, `openStore`, `runtimeUi`, `trust()`, `http`, `archive`,
  `setupTarget`, `setupUi`, `setting(key)`, `assistantHost`, `clipboard`, `stepUi`, `editor`, `shellActions`,
  `openStudio()`, `panel` (`StudioPanelPort`, late-bound: the host fills it after creating its panel),
  `earlierRunData` (`{ files?: EarlierRunDataFilesPort; state: EarlierRunDataStatePort }`). `Studio` exposes the
  services `extension.ts` still needs (controller, repository, session, lifecycle, service, setup, board, overview,
  entry, copyNextStep, openFile, requests, treeService, treeActions, assistantHost, modelSource, navigation) and
  `start(): Promise<void>`, `dispose()`. `extension.ts` builds the VS Code `HostPorts`, calls `composeStudio`, creates
  `createStudioPanel`, `createStudioTree`, registers the same commands in the same order, returns the same
  `StudioApi`. `compose.test.ts`: composes with the fakes of `src/core/shell/testing/world.ts` and memory sources; a
  project appears in `treeService` model and `entry` after `start()` (characterization; negative control). Snapshot
  `modules:` add exactly `'src/hosts — host-neutral composition (compose.ts) shared by the VS Code and the JetBrains
  host; the panel session; the embedded entry (0034)'`.
- **Tests first:** `compose.test.ts` (green once the move compiles; negative control recorded).
- **Verify:** `local:` the five gates incl. `npm run compile`; `git diff --exit-code <Baseline> -- src/core` empty;
  `CI: jetbrains.yml › vscode-mirror` green (host smoke `npm test`).
- [x] **Verified (T-012):** local 2026-11-21: `npx eslint src --max-warnings 0` exit 0; `npx tsc --noEmit` exit 0; `npx tsc --noEmit -p src/webview` exit 0; `npm run test:unit` exit 0 (224 files passed, 2 skipped; 3928 tests passed, 4 skipped; `src/hosts/compose.test.ts` 2 tests green); `npm run compile` exit 0; `git diff --exit-code 3bc615c -- src/core` exit 0; `node jetbrains/guards/vsixFiles.mjs` exit 0; `npx vitest run src/adapters/node/docsScan.test.ts` 186 passed (AGENTS.md at the 15000-byte cap). Negative control: a wrong expected label turned `compose.test.ts` red, restored green. CI at `fa60f87` (run 44856214383): `vscode-mirror` incl. `npm test` on ubuntu and windows, `vscode-guards`, `plugin` (3 OS) green.
- **Notes:** deviations from `Do:`, each to be checked by the orchestrator: (1) `HostPorts.createPanel(services)` is a factory called at the position where `activate()` built the panel, not the late-bound `panel`; a late-bound panel would have moved its construction after `treeService`/`treeActions`. The panel is `Studio.panel`. (2) `Studio` has no `dispose()`: its disposables stay in `extension.ts`'s subscription list in the original interleaved order. (3) `HostPorts` has no `ids`, `runtimeClock`, `runtimeUi`: they only feed `openStore`, which is built in `extension.ts`. (4) The four memory-key constants moved from `src/adapters/vscode/uiMemory.ts` to `src/hosts/compose.ts`, because `uiMemory.ts` imports `vscode`. (5) `src/adapters/node/earlierRunData.endToEnd.test.ts` reads `src/hosts/compose.ts` for the removal-before-start order. (6) `src/core/setup/noNetwork.test.ts` scans only `core`, `adapters`, `shared` and `extension.ts`; it cannot be changed (`src/core` must not change), so `compose.test.ts` carries the same network check for `compose.ts`; a follow-up outside `src/core` may add `hosts` to the 0014 scan. (7) The AGENTS.md `src/hosts` line states only what exists now (no panel session or embedded entry yet), and the `src/adapters` line lost its detail lists (they live in `.architecture/adapters.md`) to keep AGENTS.md at 15000 bytes; `.architecture/adapters.md` still says the keys live in `uiMemory.ts`.

### T-013 — Shared panel session: move the protocol part out of `studioPanel.ts`

- **Covers:** AC-014 (same message sequence), AC-039
- **Files:** `src/hosts/panelSession.ts`, `src/hosts/panelSession.test.ts`, `src/adapters/vscode/studioPanel.ts`
- **Do:** Move from `createStudioPanel` into `createPanelSession({ service, board, overview, output, post, testMode,
  onProbeResult })`: `seq`, `pushView/pushBoard/pushOverview/pushDetail`, the `createMessageRouter` with the `hello`
  handler, the event subscriptions of `adopt()` (as `attach()`), the dispose branch (as `detach()`: `service.panelGone()`,
  `board.panelClosed()`), `lastHelloAt()`, `receive(raw)` (test-mode `probeResult` → `onProbeResult`). `studioPanel.ts`
  keeps HTML, icons, reveal, serializer, probe channel and calls the session. Types `PanelBoard`, `PanelOverview` move
  with it (re-exported from `studioPanel.ts` so imports stay). Test: fake service/board/overview; `hello` with `lastSeq
  5` posts `shell` (seq 6), `board`, `overview`, `detail` in this order; a view change posts one envelope; `detach()`
  calls `panelGone` and `panelClosed`; unknown message → the router's output line (characterization + negative
  control).
- **Tests first:** `panelSession.test.ts`.
- **Verify:** `local:` five gates incl. `npm run compile`; `CI: jetbrains.yml › vscode-mirror` green.
- [x] **Verified (T-013):** local 2026-11-21: `npx eslint src --max-warnings 0` exit 0; `npx tsc --noEmit` exit 0; `npx tsc --noEmit -p src/webview` exit 0; `npm run test:unit` exit 0 (225 files passed, 2 skipped; 3934 tests passed, 4 skipped; `src/hosts/panelSession.test.ts` 6 tests green); `npm run compile` exit 0; `git diff --exit-code 3bc615c -- src/core` exit 0; `node jetbrains/guards/vsixFiles.mjs` exit 0; `npx vitest run src/adapters/node/docsScan.test.ts` 186 passed (AGENTS.md 14996 bytes, was 15000). Negative control: the wrong order `overview` before `board` turned the hello test red (AssertionError), restored green. CI at `375fdaa` (run 44857188233): `vscode-mirror` incl. `npm test` on ubuntu and windows, `vscode-guards`, `plugin` (3 OS) green.
- **Notes:** deviations from `Do:`, each to be checked by the orchestrator: (1) `createPanelSession` also takes `onHello()` (the probe channel's `markReady`, called last in `hello`) and `onProbeResult`; `lastHelloAt()` lives in the session and the probe channel's `describe` reads it through `studioPanel.ts`. (2) `receive(raw)` returns `void` as before; the test flushes with a macrotask. (3) The webview message listener and the `onDidDispose` listener stay in `studioPanel.ts` (VS Code API); `stop()` disposes only the session's listeners, `detach()` is `stop()` + `panelGone()` + `panelClosed()`; the top-level `dispose()` still calls only `board.panelClosed()` as before, because the disposed `onDidDispose` listener never fires there. (4) Ordering uncertainty: on a closed panel `probeChannel.markNotReady()` now runs after `board.panelClosed()` (was between `panelGone()` and `panelClosed()`); the probe channel only reads its own state, so no observable change is expected. `panel = undefined` still precedes `panelGone()`. (5) `PanelBoard` and `PanelOverview` listeners now return the core `Disposable` instead of `vscode.Disposable` (structurally the same) so the session imports no `vscode`; `studioPanel.ts` re-exports both types. (6) The test uses the real shell service from `src/core/shell/testing/world.ts` and `sampleView()` from `src/shared/protocol/testing/overviewSample.ts`; the board is a minimal `BoardView` literal, because `src/webview/board/testing/views.ts` is not importable from hosts. (7) The `AGENTS.md` `src/hosts` line now names `panelSession.ts` (reworded to 14996 bytes). `src/core` is untouched. `.architecture/adapters.md` not changed (it does not describe `studioPanel.ts`).

### T-014 — Host vocabulary: one table, the webview reads the host

- **Covers:** §6.8, AC-019 (S7 note wording), AC-030 (texts), AC-039 (VS Code texts unchanged)
- **Files:** `src/shared/protocol/vocabulary.ts`, `src/shared/protocol/vocabulary.test.ts`, `src/adapters/node/vocabularySources.test.ts`,
  `src/webview/hostKind.ts`, `src/webview/RestrictedNote.tsx`, `src/webview/PanelStateView.tsx`,
  `src/webview/hostVocabulary.test.tsx`, `src/adapters/vscode/webviewHtml.ts`, `src/adapters/vscode/webviewHtml.test.ts`
- **Do:** `vocabulary.ts`: `export type HostKind = 'vscode' | 'jetbrains'`, `export const TERM_PAIRS:
  ReadonlyArray<readonly [string, string]>` (the pairs of *Contracts › Host vocabulary*, longest first),
  `export function hostKindOf(value: string | undefined): HostKind` (`'jetbrains'` only for that exact value),
  `export function translateTerms(text: string, host: HostKind): string` (identity for `vscode`; otherwise replace each
  VS Code string by its pair). `hostKind.ts`: `export function hostKind(): HostKind` reads `document.body.dataset.host`
  once. `RestrictedNote.tsx` and `PanelStateView.tsx`: wrap every rendered label/line/S5 reason in
  `translateTerms(…, hostKind())`. `webviewHtml.ts`: optional `host?: 'jetbrains'` → `data-host="jetbrains"` on
  `<body>` only when given. `vocabulary.ts` also exports `JETBRAINS_TEXTS` (JetBrains-only; the host needs them without
  the core, AC-030; proposed wording, Gregor confirms it at this stage's test review): `jcefUnsupported: 'FeatherSpec
  Studio needs the embedded browser (JCEF), which this IDE does not support.'`, `jcefSuspended: 'FeatherSpec Studio
  needs the embedded browser (JCEF), which the operating system's sandbox has suspended.'`, `openHelp: 'Open help'`,
  `statusUnavailable: 'FeatherSpec unavailable'`, `helpUrl:
  'https://github.com/GregorBiswanger/featherspec-studio#jetbrains-ides'` (README section of T-037). Tests: vocabulary
  pure cases, and no `JETBRAINS_TEXTS` value contains a VS Code string of `TERM_PAIRS`; `vocabularySources.test.ts` asserts every VS Code string of
  `TERM_PAIRS` occurs verbatim in `src/shared/protocol/texts.ts`, `src/core/setup/setupTexts.ts` or
  `src/core/runtime/notices.ts` (drift guard); webview: S7 and S2 render JetBrains strings with `data-host="jetbrains"`
  and the unchanged VS Code strings without it; HTML: unchanged output without `host` (existing test), attribute with
  it.
- **Tests first:** the three new test files red against `Not implemented` stubs.
- **Verify:** `local: npx vitest run src/shared/protocol/vocabulary.test.ts src/adapters/node/vocabularySources.test.ts
  src/webview/hostVocabulary.test.tsx src/adapters/vscode/webviewHtml.test.ts` green (own tests only, `‖` rule); the
  stage gate then runs the five gates incl. `npm run compile` on the combined tree (the webview bundle changes once —
  the expected shared change).
- [x] **Verified (T-014):** 2026-11-21 · vitest (vocabulary, vocabularySources, webviewHtml, hostVocabulary) red → 12 failing (8 `Not implemented`, 4 assertions: S7 label, S2 and S5 wording, missing data-host), then 23/23 green · eslint, tsc ×2, `npm run test:unit`, `npm run compile`, `git diff --exit-code 3bc615c -- src/core` all exit 0 · negative controls: JETBRAINS no-VS-Code check red, drift guard red on an absent string. Implemented in parallel with T-015.
- **Notes:** hostKind() reads `document.body.dataset.host` per call (not memoised; same behaviour). TERM_PAIRS folder and write-lock rows are phrase-level prefixes, longest first, single-pass replacement. JETBRAINS_TEXTS wording = proposal, Gregor confirms. Drift guard is a verbatim-substring check. Only RestrictedNote.tsx and PanelStateView.tsx needed wrapping. Host-side texts (notifications, tree, status, log) are T-016/T-025.

### T-015 — Embedded bridge client, copies of the sync ports and the bridge contract

- **Covers:** AC-006 (no port signature change), R-3 (sync ports served from host-pushed copies)
- **Files:** `src/hosts/embedded/contract.ts`, `src/hosts/embedded/bridge.ts`, `src/hosts/embedded/bridge.test.ts`,
  `src/hosts/embedded/mirrors.ts`, `src/hosts/embedded/mirrors.test.ts`, `src/hosts/embedded/ports.ts`,
  `src/hosts/embedded/ports.test.ts`, `eslint.config.mjs`
- **Do:** `contract.ts`: string-literal unions and `as const` arrays of every name of *Contracts › Bridge*
  (`ASYNC_CALLS`, `EMIT_CHANNELS`, `DISPATCH_EVENTS`, `INVOKE_COMMANDS`, `FRAME_KINDS` = `call|emit|reply|ready|failed`),
  `interface CoreConfig` (the `start` config) and `interface NativeHost { send(frame: string): void }` — no sync call,
  no timer names. `bridge.ts`: `createBridge(native)` → `{ callAsync<T>(name, args): Promise<T>` (sends a `call` frame
  with a fresh id, rejects on `{error}`), `resolve(id, resultJson)`, `emit(channel, payload)`, `reply(id, result:
  {ok} | {error})`, `ready()`, `failed(error)` }; `toBase64/fromBase64` (hand-written, no `Buffer`/`atob`).
  `mirrors.ts`: `createMirrors(config: CoreConfig)` → `{ settings(), trusted(), folders(), memoryGet(key),
  memorySet(key, value | undefined), apply(event, payload): boolean, onSettings(l), onTrust(l), onFolders(l) }`;
  `apply` handles `settingsChanged {key, value}`, `trustGranted`, `foldersChanged {folders}` and returns `false` for
  every other event. `ports.ts`: `createEmbeddedPorts(bridge, mirrors, config): Omit<HostPorts, 'panel' | 'openStore' |
  'shellActions' | 'openStudio'>`: the sync members read the mirrors (`setting(key).read`, `trust().isTrusted`,
  `folders.list`, `workspaceState.get`, `uiMemory(key).get`, `earlierRunData.state.has`); memory writes call
  `mirrors.memorySet` first, then `callAsync('memory.set')`; `fileWatch.watch`/`markerWatch.watch` keep the listener
  locally and send `watch.add {root, kind}` (`watch.remove` on dispose); every other async member is a thin proxy to one
  contract name (bytes base64, `AsyncIterable` bodies from one base64 chunk); `clock`/`runtimeClock` use `new Date()`,
  `Date.now()`, `globalThis.setTimeout/clearTimeout`; `ids.newId` = `crypto.randomUUID()`;
  `assistantHost.extension` → `undefined`. ESLint: a block for `src/hosts/embedded/**/*.ts` (ignores `**/*.test.ts` and
  `src/hosts/embedded/testing/**`) banning `vscode` and every Node built-in (mirror the `src/shared` block). Tests: fake
  `NativeHost` collecting frames; async resolve order and error; `reply`, `ready`, `failed` frames; base64 round trip on
  random bytes vs `Buffer`; mirrors: initial values, each change event replaces its copy and fires its listener once, an
  unknown event returns `false`; each async port proxy sends the expected name and args; no sync port sends a frame.
- **Tests first:** the three test files red against stubs.
- **Verify:** `local: npx vitest run src/hosts/embedded/bridge.test.ts src/hosts/embedded/mirrors.test.ts
  src/hosts/embedded/ports.test.ts` green (own tests only, `‖` rule); the stage gate runs the five gates on the
  combined tree.
- [x] **Verified (T-015):** 2026-11-21 · vitest bridge/mirrors/ports: red 36 failed (stubs), green 36/36 · eslint, tsc ×2, `npm run test:unit`, `git diff --exit-code 3bc615c -- src/core` exit 0 · ESLint probe rejects node:fs and vscode imports in src/hosts/embedded/. Implemented in parallel with T-014.
- **Notes:** (1) Return type of the embedded ports = Omit<HostPorts, openStore|shellActions|openStudio|createPanel> plus runtimeClock, ids and routes {fileChanged(root, relativePath), markerChanged(root), progressCancelled(id)} — T-016 dispatch must call them. (2) Mirrors: settings() ReadonlyMap; memory copies hold JSON strings, memorySet(key, json|undefined); every onX returns a Disposable; apply() false for unknown/malformed. (3) WIRE SHAPES the Kotlin host (T-021/T-039/T-023…T-034) must match: fs.stat/source.stat/target.kind → kind or null; source.list/fs.readDirectory/target.listDirectory → array or null; source.readBytes/target.readBytes → base64; memory.set {key, value: JSON string|null}; ui.pick {items, placeholder} → index|null; ui.notify {message, actions} → action|null; ui.confirm {message, detail, confirmLabel} → boolean; ui.progressStart {title} → id; ui.openExternal {url}; clipboard.write {text}; editor.open {root, key, line?, place?} → "opened"|"not-found"; http.get {url, headers} → {status, headers, body: base64}; archive.read {bytes, maxUnpackedBytes} → {ok:true, entries:[{path, kind, bytes: base64}]}|{ok:false, failure:"unreadable", detail}|{ok:false, failure:"too-large"}; target.createExclusive {root, relativePath, bytes} and target.replaceIfUnchanged {root, relativePath, expected, next} (base64) → outcome strings; watch.add/remove {root, kind:"files"|"markers"} fire-and-forget, host counts per root+kind. (4) Workspace state in memory under `featherspec-studio.activeProject`. (5) http AbortSignal not forwarded; watch.* results swallowed. (6) Assistant host is a no-op (Copy only, PD-105). (7) earlierRunData.files omitted. (8) sameRoot reimplemented in ports.ts (no adapter import). (9) medium.*/actions.* in ASYNC_CALLS unused here → T-016/T-021. (10) ports.ts 276 lines.

### T-016 — Embedded entry: start, dispatch, invoke, panel, tree and status out, terms translated

- **Covers:** AC-008 (core runs without the tab), AC-019, AC-023 (texts), AC-031 (no offer), §6.8
- **Files:** `src/hosts/embedded/main.ts`, `src/hosts/embedded/terms.ts`, `src/hosts/embedded/main.test.ts`, `src/hosts/embedded/terms.test.ts`
- **Do:** `main.ts` exports `createEmbeddedHost(native)` → `{ start(configJson), resolve(id, json), dispatch(event,
  json), invoke(id, command, json), conformance, setupConformance }` (the last two from T-018): `start` parses the
  `CoreConfig`, builds mirrors and ports (T-015), `openStore` via `openRuntimeStore` from
  `src/core/runtime/runtimeStore` over a medium proxy (`medium.*` calls keyed by project root), `shellActions` and
  `openStudio` as `actions.*` calls, `panel` from `panelOpened/panelClosed` events; calls `composeStudio`; subscribes
  `treeService` → `emit('tree', model)`, status item port → `emit('status', view|null)`, output → `emit('log', lines)`;
  a `createPanelSession` (T-013) whose `post` emits `panel`; awaits `studio.start()` and then sends one `ready` frame
  (on a throw: a `log` emit and a `failed` frame with the message); `dispatch` first offers the event to
  `mirrors.apply`, then routes the remaining events of the contract to the listeners the proxies registered; `invoke`
  runs the command and answers with `reply(id, {ok} | {error})` (mirror the command bodies of `extension.ts`;
  `panelHtml` = `buildWebviewHtml({...args, host: 'jetbrains', test: false})`; `diagnostics` → `{jsHeapBytes:
  performance.memory?.usedJSHeapSize ?? null}` through a typed cast, no `any`). `assistant.extension` always
  `undefined` → offer none. `terms.ts`: `withTerms(ports)` wraps `ui`, `setupUi`, `stepUi`, `runtimeUi`, `output`, the
  tree model's `message`/action labels and the status tooltip with `translateTerms(…, 'jetbrains')`, mapping the chosen
  label back. Tests (Node, fake native host answering `call` frames through `resolve`, memory spec source with a
  fixture): start → `tree` and `status` emitted without any panel, then exactly one `ready` frame; a throwing start →
  `failed`; `settingsChanged {key: 'featherspec-studio.showStepTips', value: false}` → the next detail view has no tips
  without any host call; `foldersChanged` with a second folder → `tree` emitted again; `invoke` of an unknown command →
  `reply` with `error`; `panelMessage` hello → `panel` envelopes; an untrusted project → setup notification reads `Setting
  up FeatherSpec needs a trusted project.` with action `Trust Project`, choosing it calls `actions.manageTrust`; no
  emitted string of a full fixture run contains `workspace`, `Restricted Mode`, `VS Code` or `extension`
  (except spec content); no `Send` in emitted views.
- **Tests first:** `main.test.ts`, `terms.test.ts` red against stubs.
- **Verify:** `local: npx vitest run src/hosts/` green, then the four gates.
- [x] **Verified (T-016):** local 2026-11-21: red first — `npx vitest run src/hosts/embedded/main.test.ts src/hosts/embedded/terms.test.ts` with `Not implemented` stubs: 17 failed (12 in main.test.ts, 5 in terms.test.ts), all `Error: Not implemented`; then green — `npx vitest run src/hosts/` 7 files, 62/62 passed · `npx eslint src --max-warnings 0` exit 0 · `npx tsc --noEmit` exit 0 · `npx tsc --noEmit -p src/webview` exit 0 · `npm run test:unit` exit 0 (233 files passed, 2 skipped; 4004 tests passed, 4 skipped) · `git diff --exit-code 3bc615c -- src/core` exit 0 · `node --test 'jetbrains/guards/*.test.mjs'` 16 pass, 0 fail. Negative control: `jetBrainsText` switched to identity → 7 tests red (the §6.8/AC-019/AC-023 translation and full-run checks), restored, 62/62 green again.
- **Notes:** (1) Deviation: `EmbeddedHost` has `start`, `resolve`, `dispatch`, `invoke` only; `conformance` and `setupConformance` are T-018's. (2) Open decision for the orchestrator: `openFolder` has no name in `ASYNC_CALLS`, so `shellActions.openFolder` rejects with `Opening a folder is not available in the embedded host.` Either add `actions.openFolder` to the contract or confirm the state is unreachable in a project-based IDE. (3) Wire shapes T-017…T-021 must match: `medium.*` calls carry `root` (the project root given to `openStore`) and `name`, plus `text` for append, replace and createExclusive; replies: `medium.read` string or null, `medium.lines` one array of `{text, terminated}` (whole file, one reply), `medium.list` string array, `medium.createExclusive` boolean, others null. `panelMessage` dispatch payload is the raw envelope object, not a string; `panelOpened` and `panelClosed` carry `null`. `actions.openStudio` is sent by the open command and by the panel `show()`; the host must open the tab, and `panelOpened` follows. Invoke args: `open` `{via:'start'}` or `{via:'area', area}`; `tree.*` `{row}`; `shellAction` `{action}`; `panelHtml` `{nonce, cspSource, scriptUri, styleUri, reloaded}` returns the HTML string with `data-host="jetbrains"`; `diagnostics` returns `{jsHeapBytes: number|null}`; others `{}` and reply `ok: null`; failures reply `{error}`. (4) Settings copies use the core's bare keys (`showStepTips`, `modelHints`, from `src/core/settings/stepTipSettings.ts`), not the package ids: the VS Code adapter reads section `featherspec-studio` plus the bare key (`src/adapters/vscode/settings.ts`). T-032 must send bare keys. (5) `start` validates the config (`isCoreConfig`); a bad config resolves `start`, sends `log` and `failed`, and never `ready`. Dispatch before a successful start is ignored, so the host must start first. (6) `terms.ts` translates UI strings only: notifications and actions, quick picks, setup confirm, progress title, warnings, log lines, status, tree message, descriptions, tooltips, accessible labels, group labels and action labels; spec titles are not translated. Chosen labels map back by index, so the original item and action objects come back. Runtime store notices go to the `warn` channel. (7) Dependency: `main.ts` imports `buildWebviewHtml` from `src/adapters/vscode/webviewHtml.ts`, which has no `vscode` import (the `host?` option came in T-014). The embedded entry thereby depends on an adapter folder; moving the file is a later decision. (8) Architecture: `src/hosts/embedded/` now has `main.ts` and `terms.ts` on top of T-015's modules; the `AGENTS.md` `src/hosts` line still does not name `embedded/`. The `/sdd-architecture-update` run (confirmation gate) is the orchestrator's; `AGENTS.md` is at 14996 of the 15000-byte cap, so the line needs trimming first. (9) Size: `main.ts` 358 lines and `terms.ts` 128 lines, above the ~150-line guideline; the split candidate is the invoke and panel part of `main.ts`. Not split: the step names one file pair. (10) Test harness: `main.test.ts` answers the contract calls from the core memory fixtures; a call the responder does not know replies with an error, so T-017 and later calls surface at once. `medium.lines` loads a whole file per call; T-021 may need streaming for large history files. (11) Not run: `npm run compile`. T-016 touches no wiring, adapter, `esbuild.js` or bundle; `src/hosts/embedded` is not bundled until T-017. Orchestrator decision 2026-11-21 (proxy): `openFolder` stays rejected in the embedded host — a JetBrains IDE project always has a folder, S1 is n-a (0005 AC-011, T-011); no `actions.openFolder` in the contract.

### T-017 — Embedded bundle: browser target, path shim, third esbuild target

- **Covers:** R-1, R-6, AC-006, AC-038 precondition (`dist/extension.js` unchanged)
- **Files:** `src/hosts/embedded/pathPosix.ts`, `src/hosts/embedded/pathPosix.test.ts`, `src/hosts/embedded/global.ts`,
  `src/hosts/embedded/testing/browserContext.ts`, `esbuild.js`, `src/hosts/embedded/bundle.test.ts`, `AGENTS.md` (snapshot)
- **Do:** No polyfills: Chromium in JCEF has `TextDecoder` (`fatal`, `ignoreBOM`), `TextEncoder`, `URL`,
  `AbortController`, `queueMicrotask`, `crypto.randomUUID` and timers (ADR-004 V2; T-038 ran the core 27/27
  byte-identical without any). `pathPosix.ts` = T-003's `jetbrains/spikes/core/pathPosix.mjs` in TS. `global.ts`:
  declares the global `__featherspecNative: (frame: string) => void` and assigns `globalThis.FeatherSpecHost =
  createEmbeddedHost({ send: (frame) => globalThis.__featherspecNative(frame) })`. `testing/browserContext.ts`:
  `browserContext(extra)` → a `vm.createContext` holding only `TextDecoder`, `TextEncoder`, `URL`, `AbortController`,
  `AbortSignal`, `setTimeout`, `clearTimeout`, `queueMicrotask`, `crypto` (`globalThis.crypto`), `console` and `extra` —
  the Web APIs the core page gets from Chromium, nothing from Node. `esbuild.js`: a third context, entry
  `src/hosts/embedded/global.ts`, `bundle: true`, `format: 'iife'`, `platform: 'browser'`, `target: 'es2022'`,
  `path`/`node:path` → `pathPosix.ts` through an `onResolve` plugin (esbuild's `alias` rejects relative targets, T-003
  Notes), `minify: production`, `outfile: 'dist/embedded/core.js'`; the two existing contexts unchanged. Tests: path shim
  vs `node:path`.posix on generated segments; `bundle.test.ts` runs `node esbuild.js`, loads `dist/embedded/core.js` in
  `browserContext({ __featherspecNative: fake })`, calls `FeatherSpecHost.start(config)` with `folders: []` and sees a
  `tree` emit and a `ready` frame; the bundle text contains no `require(` and no reference to `process`, `Buffer` or
  `__dirname`; `dist/extension.js` SHA-256 equals the digest of a build of the same commit without the third target
  (build both in the test via the esbuild API). Snapshot `entrypoints:` add exactly `'src/hosts/embedded/global.ts —
  JetBrains host entry; bundled by esbuild to dist/embedded/core.js (IIFE, global FeatherSpecHost), run in a hidden JCEF
  browser (0034)'` (keep `AGENTS.md` ≤ 15,000 bytes, `docsScan.test.ts`; shorten only this line if needed).
- **Tests first:** the two test files red against stubs.
- **Verify:** `local:` five gates incl. `npm run compile`.
- [x] **Verified (T-017):** 2026-11-21 · local: red first — `npx vitest run --project node src/hosts/embedded/pathPosix.test.ts src/hosts/embedded/bundle.test.ts` against stubs: 7 failed (5 × `Error: Not implemented` in pathPosix.test.ts, the start test `Not implemented` from `browserContext`, the third-target and no-Node-global tests `ENOENT dist/embedded/core.js`); 2 green at once (host bundle identity, `posix` object), the `posix` one given a negative control (object without `dirname` → 1 red, restored). Green: the two files + `extensionBundle.test.ts` 15/15 · `npx eslint src --max-warnings 0` 0 · `npx tsc --noEmit` 0 · `npx tsc --noEmit -p src/webview` 0 · `npm run test:unit` 0 (235 files, 4013 tests passed) · `npm run compile` 0 · `npm run package` 0 · `git diff --exit-code 3bc615c -- src/core` 0 · `node --test 'jetbrains/guards/*.test.mjs'` 16 pass · `node jetbrains/guards/vsixFiles.mjs` matches the snapshot (11 files, no `dist/embedded`) · byte identity: `dist/extension.js`, `dist/webview/main.js`, `dist/webview/main.css` sha256 equal before and after, production and dev builds, and `sameBundles.mjs` reports identical.
- **Notes:** Re-planned 2026-11-21 for V2: `polyfills.ts` and its test are dropped (Chromium has the Web APIs). Implementer (2026-11-21, uncommitted): (1) `pathPosix.ts` is T-003's shim in TS with the same four functions and `posix`; the embedded chain (141 src inputs, metafile) uses only `path.posix.{isAbsolute,normalize,join,dirname}`, so nothing else is needed. (2) `esbuild.js`: `embeddedBuildOptions` and `embeddedPathShimPlugin` (onResolve `^(node:)?path$`) are added; the host and webview options are untouched and `module.exports` is unchanged. (3) Deviation, AGENTS.md cap: the file was at 14996 of 15000 bytes and the new entrypoint line is 175 bytes, so the `src/shared/protocol` module line lost its parenthetical list (areas, board, Overview, … UI texts), 175 bytes; no test asserts that list, but it is not checked against a map. The orchestrator confirms this at `/sdd-architecture-update`; restore the list only if the cap allows. (4) `bundle.test.ts` runs `node esbuild.js` in `beforeAll`, which rewrites `dist/`; existing bundle tests read `dist/`, so a race is possible in principle, none seen in the full run. (5) Uncertain: the host identity test compares the same options, so it proves isolation, not the exact bytes; the byte proof is the digest comparison above.

### T-018 — Conformance oracle: every fixture's outputs from the embedded bundle

- **Covers:** AC-004, AC-005 (TS side), R-1
- **Files:** `src/hosts/embedded/conformance.ts`, `src/hosts/embedded/conformance.test.ts`, `src/hosts/embedded/global.ts`
- **Do:** `conformance.ts` exports `runConformance(input: {files: Record<string,string /*base64*/>, version: string}):
  Promise<string>` and `runSetupConformance(archiveBase64: string): Promise<string>`. The first composes with
  deterministic memory ports (memory spec source at `memory://fixture`, fixed clock `2026-11-20T00:00:00.000Z`, fake
  trust true, memory store, no watch), runs `start()`, and returns a stable JSON string of `{ read: readSnapshot(...),
  next: <snapshotOf body>, board, overview, planSpecs, details: {<stem>: detail after selecting it}, tree, status }`
  (keys sorted). The second runs `checkRelease` + the file classes and apply of `src/core/setup` on a memory target
  (mirror `src/core/setup/testing/setupWorld.ts`) and returns `{ mergePrompt: buildMergePrompt('/work/tip-splitter',
  ['.vscode/settings.json','AGENTS.md','CLAUDE.md']), classes, writes }`. `global.ts` exposes both as
  `FeatherSpecHost.conformance(id, inputJson)` / `.setupConformance(id, archiveJson)`, each answering with a `reply`
  frame. Test: for every fixture folder (baseline and setup folders aside) the bundle in `browserContext()` (T-017)
  returns the same string as `runConformance` called in-process; its `read`/`next`
  parts equal the result of `readSnapshot`/`snapshotOf` over `readFixture` (memory vs fs mtime-free fields); setup:
  `mergePrompt` equals `src/core/setup/mergePrompt.golden.txt` byte for byte, classes/writes equal the in-process run.
- **Tests first:** `conformance.test.ts` red against stubs.
- **Verify:** `local:` five gates incl. `npm run compile`.
- [x] **Verified (T-018):** 2026-11-21 · local: red first — `npx vitest run src/hosts/embedded/conformance.test.ts` against the `Not implemented` stub of `conformance.ts`: 3 failed (AC-004 `TypeError: host.conformance is not a function`; AC-005 setup and in-process `Error: Not implemented`). Green: 3/3 · negative controls (each mutation turns exactly its test red, sources restored): bundle reply changed → AC-004 red; `next` dropped → AC-005 red; merge prompt file changed → setup AC-005 red · `npx vitest run src/hosts/` 10 files 74/74 · `npx eslint src --max-warnings 0` 0 · `npx tsc --noEmit` 0 · `npx tsc --noEmit -p src/webview` 0 · `npm run test:unit` 0 (236 files passed, 2 skipped; 4016 tests passed, 4 skipped; timing projects 16 files 35 tests passed) · `npm run compile` 0 · `node --test 'jetbrains/guards/*.test.mjs'` 16 pass, 0 fail · `git diff --exit-code 3bc615c -- src/core` 0 · byte identity: `node esbuild.js --production`, sha256 of `dist/extension.js`, `dist/webview/main.js`, `dist/webview/main.css` equal before and after.
- **Notes:** Implementer (2026-11-21, uncommitted). (1) Deviation, `runSetupConformance(archiveBase64, archive)` takes the `ReleaseArchivePort` as a second argument: the bundle cannot read tar.gz itself (the Node adapter uses `node:zlib`), so inside the bundle the port is `archivePortOf(bridge)` (`archive.read` call, extracted from `ports.ts` without behaviour change). (2) Deviation, `conformance` and `setupConformance` are methods of `EmbeddedHost` in `main.ts`, not new code in `global.ts` (unchanged): `resolve` belongs to `main.ts`'s bridge, and a second bridge would not see the answers. Wire: `conformance(id, inputJson)` with `inputJson` = `{files: {<path>: <base64>}, version}`; `setupConformance(id, archiveJson)` with `archiveJson` = a JSON string of the archive's base64 text; each replies `{ok: <string>}` where the string is JSON with sorted keys, or `{error}`. (3) `read` and `next` come from `readProject` on the memory source with `input.version` (same as T-003); `next` copies the `snapshotOf` body; board, overview, planSpecs, tree and status come from `composeStudio` with memory ports (`compose.test.ts` pattern); fixed clock `2026-11-20T00:00:00.000Z`; `details` keyed by spec stem (`select({stem})` per lifecycle entry); directories derived from file paths (empty directories are lost, as in T-003). (4) Setup: empty target `memory://tip-splitter`; `mergePrompt` hard-coded to the three paths of the Do; a refused archive throws (reply `error`); `writes` = `applySetup` outcome and each target file's text. Only the empty-target case is covered (all classes `missing`), not kept or completed paths. (5) `esbuild.js` exports `embeddedBuildOptions` (no output change), so the test builds the bundle in memory and does not race `bundle.test.ts` on `dist/`. (6) `global.ts` unchanged. (7) T-019: the Node harness must answer `archive.read` calls (`createTarGzArchive`, reply shape `{ok:true, entries:[{path, kind, bytes: base64}]}` or the two failure shapes) as `conformance.test.ts` does; a call left unanswered leaves the setup reply pending forever. The expected file is the reply's `ok` string. (8) T-022: the Kotlin host answers `archive.read` (T-033 reader); AC-004 is decided by string equality with the Node run. The board, overview, tree, status and details parts have no independent oracle here; only bundle versus in-process, so T-019/T-022 cover them only through the same equality. (9) Size: `conformance.ts` 197 lines (above the ~150 guideline; the memory port set is the bulk); `dist/embedded/core.js` 192231 bytes. (10) Not done, as with T-016/T-017: `AGENTS.md` is untouched (at its byte cap, and the new `conformance.ts` module is left to the orchestrator's `/sdd-architecture-update`); no Memory Bank change.
  G3 fix round (2026-11-21, commit 727f708): the conformance run activates the Overview service (subscribe + `whenIdle`) before reading it, so `overview` is in every FeatherSpec output; Plan map = `planSpecs`. Weak inputs gen-200, repo-8052f9a, repo-f9cadb4 get the synthetic `AGENTS.md` of fs-version-1110 in the conformance input only (`src/hosts/embedded/testing/conformanceInput.ts`). In-process test retitled AC-004. `src/hosts/noNetwork.test.ts` closes the 0014 AC-025 scan gap for src/hosts. Bundles byte-identical for --production builds with and without the change.

### T-019 — Node side of the JVM conformance: expected outputs for CI

- **Covers:** AC-004, AC-005 (oracle files for T-022, T-041)
- **Files:** `jetbrains/scripts/conformanceExpected.mjs`, `jetbrains/scripts/conformanceExpected.test.mjs`
- **Do:** Script: loads `dist/embedded/core.js` in a `vm` context with the globals of `browserContext` (T-017; listed
  inline, the script is `.mjs`) and a native host that collects `reply` frames; for each fixture folder, plus `gen-200`
  (200 specs from `generateProject` of `src/core/specs/testing/generateProject.ts`, bundled for Node by esbuild as
  `jetbrains/spikes/core/check.mjs` does), writes `jetbrains/build/conformance/inputs/<name>.json` (`{files, version}`)
  and `.../expected/<name>.json` (the `FeatherSpecHost.conformance` reply), plus `setup-input.json` (base64 of
  `test/fixtures/setup/featherspec-1.10.0.tar.gz`) and `setup-expected.json`. `node:test`: the script writes one file
  per fixture and every expected file parses as JSON.
- **Tests first:** `conformanceExpected.test.mjs` red (script missing).
- **Verify:** `local: npm run compile && node --test jetbrains/scripts/` green.
- [x] **Verified (T-019):** 2026-11-21 · local: red first — `node --test 'jetbrains/scripts/*.test.mjs'` before the script existed: 3 failed (`Error: Cannot find module .../jetbrains/scripts/conformanceExpected.mjs` in all three tests). Green: 3/3 · negative control not run (the script builds the bundle and runs the fixtures; the test asserts file presence, JSON shape and the golden merge prompt, each red on the missing script). Gates: `npm run compile` 0 · `node --test 'jetbrains/scripts/*.test.mjs'` 3 pass · `node --test 'jetbrains/guards/*.test.mjs'` 16 pass · `npx eslint src --max-warnings 0` 0 · `npx tsc --noEmit` 0 · `npx tsc --noEmit -p src/webview` 0 · `npm run test:unit` 0 (236 files, 4016 tests passed, 4 skipped; timing 16 files 35 passed) · `git diff --exit-code 3bc615c -- src/core` 0 · `node jetbrains/scripts/conformanceExpected.mjs` 0, 28 inputs and 28 expected files written.
- **Notes:** Implementer (2026-11-21, uncommitted). (1) Deviation, Verify command: Node 22.23 does not recurse into a directory given to `node --test` (it runs the directory as a file and fails with MODULE_NOT_FOUND), so the test is run with the quoted glob `node --test 'jetbrains/scripts/*.test.mjs'`, the form `jetbrains.yml` uses for the guards. (2) Deviation, bundle: built in memory from `embeddedBuildOptions` (esbuild.js, unchanged) with `write: false`, the path-shim plugin only and `minify: true`, because the packaged bundle is the `--production` build; `dist/` is not read. Checked ad hoc: minified and unminified runs give byte-identical inputs and expected files for all 28. (3) Name: `gen-200` (`generateProject`, 200 specs; no `AGENTS.md`, so version `1.10.0`). (4) Output for T-022, under `jetbrains/build/conformance/` (git-ignored by `jetbrains/.gitignore`): `inputs/<name>.json` is the exact `conformance` argument `{files, version}` (files base64 by path, sorted); `expected/<name>.json` is the reply's `ok` string written verbatim, no trailing newline, so `actual` is compared byte for byte. Setup: `inputs/setup-input.json` is the JSON string of the base64 archive (the exact `setupConformance` argument), `expected/setup-expected.json` the reply. Kotlin must pass each input file's content unchanged and not rebuild `files` (key order is part of the input). Names: 26 fixture folders (`next-step-baseline`, `read-baseline`, `setup` skipped) plus `gen-200`. (5) The harness answers `archive.read` with `createTarGzArchive` (same reply shape as `conformance.test.ts`) and answers any other call with an error, so an unexpected call fails loudly instead of hanging. (6) Run: `node jetbrains/scripts/conformanceExpected.mjs [outDir]`, about 1 s locally; it clears `inputs/` and `expected/` before writing; a failed reply exits 1 and writes no expected file for it. (7) Uncertainty: `gen-200` has no in-process comparison (`conformance.test.ts` covers the 26 fixtures only); its expected file is the bundle reply alone, so AC-004 for it rests on T-022's equality. (8) `dist/` byte identity: this step changes no `src/` file and not `esbuild.js`; `compile` produced `dist/extension.js` sha256 prefix `7e170ebb6fe4ca7f`, `dist/webview/main.js` `cac585d7ce18965c`, `dist/webview/main.css` `40ee2ada22e70505`, not compared against a pre-step build (identical by construction).
  G3 fix round (2026-11-21, commit 727f708): the conformance run activates the Overview service (subscribe + `whenIdle`) before reading it, so `overview` is in every FeatherSpec output; Plan map = `planSpecs`. Weak inputs gen-200, repo-8052f9a, repo-f9cadb4 get the synthetic `AGENTS.md` of fs-version-1110 in the conformance input only (`src/hosts/embedded/testing/conformanceInput.ts`). In-process test retitled AC-004. `src/hosts/noNetwork.test.ts` closes the 0014 AC-025 scan gap for src/hosts. Bundles byte-identical for --production builds with and without the change. For this script: `conformanceExpected.mjs` builds each input with `conformanceInput()` (replaces its own version lookup), and `conformanceExpected.test.mjs` adds `AC-004 the weak inputs carry the synthetic AGENTS.md and every FeatherSpec output has board and overview` (4 tests).

### T-020 — Shared-change guard in CI (AC-039, AC-006)

- **Covers:** AC-006, AC-039
- **Files:** `jetbrains/guards/sharedGuard.mjs`, `jetbrains/guards/sharedGuard.test.mjs`, `jetbrains/guards/renderedTexts.mjs`, `.github/workflows/jetbrains.yml`
- **Do:** `sharedGuard.mjs` exports `missingTests(startList, headList)` (by file + full title) and a CLI. Job
  `shared-guard` (ubuntu, windows; `fetch-depth: 0`): `git diff --exit-code $START_COMMIT -- src/core
  test/fixtures/next-step-baseline test/fixtures/read-baseline src/core/setup/mergePrompt.golden.txt
  .github/workflows/ci.yml .github/workflows/publish.yml`; check out `$START_COMMIT` into `start/`, `npm ci` in both;
  `npx vitest list --json` in both (Vitest test inventory) and the Mocha titles of `src/test/**` (regex on `test(`/
  `it(`/`suite(` strings) → `missingTests` must be empty; `npm run package` in both; `renderedTexts.mjs`: for every
  fixture, compute the views with head's `dist/embedded/core.js` `conformance` (VS Code host kind), render them with
  `start/dist/webview/main.js` and with `dist/webview/main.js` in JSDOM (mirror `webviewBundle.test.ts` boot and
  `send()`), compare `document.body.textContent` per area — fail on any difference.
- **Tests first:** `sharedGuard.test.mjs` red (pure function), then green; a negative control removes one title.
- **Verify:** `local: node --test 'jetbrains/guards/*.test.mjs'`; `CI: jetbrains.yml › shared-guard` green on ubuntu and windows.
- [x] **Verified (T-020):** local 2026-11-21: red first — `node --test 'jetbrains/guards/*.test.mjs'` with `Not implemented` stubs: 10 new tests failed, 16 existing passed · green: 26/26 pass · negative controls: `sharedGuard.mjs` with start `3bc615c` (`git archive`) against a head copy with one Mocha title renamed: `missing: src/test/lifecycle.smoke.test.ts :: AC-001: the active project gets a state per spec`, exit 1; `renderedTexts.mjs` against a head copy with one visible label changed (`PLAN_MAP_TITLE`): 88 areas differ, exit 1 · positive: `sharedGuard.mjs` no missing test, exit 0; `renderedTexts.mjs` rendered texts identical in 88 areas, exit 0 · `npx eslint src --max-warnings 0` exit 0 · `npm run test:unit` exit 0 (236 files, 4016 tests passed, 4 skipped; timing 16 files, 35 passed) · `git diff --exit-code 3bc615c -- src/core` exit 0 · workflow YAML parses (job `shared-guard`: ubuntu-latest, windows-latest). CI at `017a790` (run 44863599799): `shared-guard` (ubuntu, windows), `vscode-mirror` incl. `npm test` (ubuntu, windows), `vscode-guards`, `plugin` (3 OS) green.
- **Notes:** Implementer (2026-11-21, uncommitted). (1) Deviation, Verify of the inventory: `npx vitest list --json` needs `--no-staticParse`; the static parse fails on `src/core/runtime/runtimeStore.test.ts` (`No test suite found`, its tests come from `describeRuntimeStoreContract`); with it, 3199 node tests in about 25 s. (2) Deviation, coverage: the conformance reply has no `overview` key (the overview view is built only while its area is active), so `renderedTexts.mjs` compares the Board and every detail (88 areas), not Overview. Overview text is not guarded by this job. (3) `renderedTexts.mjs` takes its views from head's core via `jetbrains/scripts/conformanceExpected.mjs` (T-019, `gen-200` and the setup pair skipped) and renders them in JSDOM with the start's and head's `dist/webview/main.js`; it fails when the webview reports an error. (4) The start checkout goes to `${{ runner.temp }}/start`, not into the workspace: the root `tsconfig.json` would pick up its `.ts` files. The job uses `env.START_COMMIT` (no shell variable, so PowerShell works). (5) `differingAreas` sits in `sharedGuard.mjs` (tested) and is imported by `renderedTexts.mjs`. (6) Uncertain for CI: Windows is not run locally (Linux only); the job runs on every push and pull request, not only on JetBrains-only changes; the start commit predates the embedded target, so the start side uses only its webview bundle. Fix round 1 (orchestrator, run 44863296801): `actions/checkout` refuses a path outside the workspace → the start tree is a `git worktree add --detach` in `runner.temp`.
  G3 fix round (2026-11-21, 727f708): renderedTexts sends only existing events (before: 43 of 88 areas were S5 error screens), fails on any `section.panel-state`, covers board 19 / overview 19 / planMap 90 / detail 71 = 199 areas (start 3bc615c vs head: identical); a fixture with a board but no overview = missing coverage; conformance computed with cwd = headDir. This supersedes Note (2) above (Overview is now guarded) and the 88-area figure of `Verified:`.

### T-021 — Core runtime, part 1: contract mirror, frames, core page and resource allow-list (pure Kotlin)

- **Covers:** R-3, AC-006, AC-015 (core page part)
- **Files:** `jetbrains/build.gradle.kts`, `<pkg>/runtime/HostContract.kt`, `<pkg>/runtime/BridgeFrames.kt`,
  `<pkg>/runtime/CorePage.kt`, `<pkg>/jcef/PluginResources.kt`, `<test>/runtime/HostContractTest.kt`,
  `<test>/runtime/BridgeFramesTest.kt`, `<test>/runtime/CorePageTest.kt`, `<test>/jcef/PluginResourcesTest.kt`
- **Do:** Gradle: `processResources` copies `../dist/embedded/core.js` → `embedded/core.js` and `../dist/webview/` →
  `webview/` (the `plugin` job's `npm run package` builds both before Gradle); `intellijPlatform {
  bundledPlugin("com.intellij.modules.jcef") }` as in `jetbrains/spikes/ide/build.gradle.kts`; no GraalJS, no new
  dependency. `HostContract.kt`: the names of *Contracts › Bridge* as constants (`ASYNC_CALLS`, `EMIT_CHANNELS`,
  `DISPATCH_EVENTS`, `INVOKE_COMMANDS`, `FRAME_KINDS`). `BridgeFrames` (pure, Gson): `parse(frame: String): Frame` —
  sealed `Call(id, name, args)`, `Emit(channel, payload)`, `Reply(id, ok: String?, error: String?)`, `Ready`,
  `Failed(error)`, `Invalid(text)`; `jsString(text)` → a JS string literal (escapes `\`, `"`, control characters,
  U+2028, U+2029; mirror the spike's `quoteJson` in `SpikeV2Action.kt`); `script(fn, vararg args)` →
  `FeatherSpecHost.<fn>(<jsString…>);`. `CorePage` (pure): `CORE_URL = "https://studio.featherspec.invalid/core.html"`;
  `html(nonce, injectJs)` → `<!DOCTYPE html>`, CSP meta `default-src 'none'; script-src 'nonce-<nonce>'`, one nonce'd
  inline script `window.__featherspecNative = function (frame) { <injectJs> };`, then `<script nonce="<nonce>"
  src="https://studio.featherspec.invalid/core.js"></script>`, nothing else. `PluginResources` (pure): `resolve(url):
  Resource?` with `Resource(path, mimeType)`; allows exactly `…/core.html` (path `core.html`, filled by `CorePage`) and
  `…/core.js` → `embedded/core.js`; everything else `null`; the allow-list is one map that T-026 extends. Tests:
  `HostContractTest` reads `../src/hosts/embedded/contract.ts` and asserts every quoted name of its `as const` arrays
  exists in `HostContract.kt` and vice versa; frames round-trip, malformed JSON and unknown `k` → `Invalid`; `jsString`
  on quotes, backslashes, newlines, U+2028, emoji (the result parsed back by Gson equals the input); `CorePage`: exact
  CSP, the inline script comes before the core script, both carry the nonce; `PluginResources` table: allowed, `file:`,
  `http:`, `..`, other host, query, fragment, `core.js?x`.
- **Tests first:** four test files red against `TODO()` bodies (CI run 1).
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-021):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `48c2209` (run 44869730563; compile and `test` incl. HostContractTest, BridgeFramesTest, CorePageTest, PluginResourcesTest) · first CI run at `9c2602e` compiled but the test executor failed (`org/junit/runners/model/Statement`: the platform test runtime needs JUnit 4) → `testRuntimeOnly(libs.junit4)` (4.13.2) · eslint exit 0, no `src/` change. Deviation: tests written alongside the code, no red CI run against `TODO()` bodies.
- **Notes:** Re-planned 2026-11-21 for V2 (ADR-004): GraalJS dropped; the browser glue is T-039. (1) `Reply.ok`, `Call.args`, `Emit.payload` are raw JSON text (`"null"` when absent); a string `ok` stays quoted — callers unquote (`JsonParser.parseString(ok).asString`). (2) `CORE_ORIGIN`/`CORE_URL` are top-level consts in `runtime/CorePage.kt`. (3) `PluginResources.resolve` matches the whole path after the origin exactly (query, fragment, `..` refused); T-026 extends the private map and the refused-URL table. (4) `processResources` copies `dist/embedded/core.js` → `embedded/`, `dist/webview/` → `webview/`. (5) Gson comes from the platform jars on the test classpath.

### T-039 — Core runtime, part 2: hidden JCEF browser, transport and readiness (appended 2026-11-21, split from T-021 at G1)

- **Covers:** R-3, R-4, R-5 (start and readiness), AC-008 precondition
- **Files:** `<pkg>/runtime/HostHandler.kt`, `<pkg>/runtime/CoreState.kt`, `<pkg>/runtime/CoreRuntime.kt`,
  `<pkg>/jcef/PluginRequestHandler.kt`, `<test>/runtime/CoreStateTest.kt`
- **Do:** Mirror `jetbrains/spikes/ide/src/main/kotlin/com/gregorbiswanger/featherspec/spike/SpikeV2Action.kt` (T-038)
  and `SpikeResources.kt`. `HostHandler`: `call(id: String, name: String, args: String)` (answers later through
  `CoreRuntime.resolve`), `emit(channel: String, payload: String)`. `CoreState` (pure): sealed `Loading`, `Ready`,
  `Failed(reason)`, `Unavailable(kind)` with `UnavailableKind.UNSUPPORTED|SUSPENDED`; `CoreStateHolder`: `value`,
  `set(next)` (never from `Ready` back to `Loading`; `Failed` and `Unavailable` are final for the session),
  `onChange(listener): () -> Unit` (returns the removal), each listener called once per change. `PluginRequestHandler`
  (glue): `CefRequestHandlerAdapter.getResourceRequestHandler` → `CefResourceRequestHandlerAdapter.getResourceHandler`
  serving `PluginResources.resolve(url)` from the plugin class loader (`javaClass.getResourceAsStream`), `core.html`
  from a supplier; `onBeforeBrowse` and `onBeforeResourceLoad` return `true` (cancel) when `resolve` gives `null`.
  `CoreRuntime(client: JBCefClient, handler: HostHandler, state: CoreStateHolder, parent: Disposable)`:
  `start(configJson)` — only the construction runs on the EDT, in one `ApplicationManager.getApplication().invokeLater`:
  `JBCefBrowser.createBuilder().setClient(client).setOffScreenRendering(true).build()`, `createImmediately()`,
  `JBCefJSQuery.create(browser)` with `addHandler { frame -> queue.execute { onFrame(frame) }; null }`,
  `client.addRequestHandler(PluginRequestHandler(…), browser.cefBrowser)`, a `CefLoadHandlerAdapter` whose `onLoadEnd`
  for `CORE_URL` records `loadedAtNanos` and runs `BridgeFrames.script("start", configJson)`, then
  `browser.loadURL(CORE_URL)`; `queue` = `AppExecutorUtil.createBoundedApplicationPoolExecutor("FeatherSpec core", 1)`.
  `onFrame`: `Call` → `handler.call`, `Emit` → `handler.emit`, `Reply` → completes the pending future, `Ready` →
  `readyAtNanos` and `state.set(Ready)`, `Failed` → `state.set(Failed(error))`, `Invalid` → one `thisLogger().warn`.
  Public: `startedAtNanos` (set by the caller, T-025), `loadedAtNanos`, `readyAtNanos`, `resolve(id, resultJson)`,
  `dispatch(event, payloadJson)` (buffered until `start` ran, then flushed in order), `invoke(command, argsJson)`,
  `conformance(inputJson)`, `setupConformance(archiveJson)` — the last three return `CompletableFuture<String>` keyed by
  id in a `ConcurrentHashMap` (as the spike) — and `dispose()` (disposes query and browser on the EDT, completes pending
  futures exceptionally). No `ready` within `READY_TIMEOUT_MS = 60_000` → `Failed("core not ready within 60 s")`. Every
  `executeJavaScript` passes `CORE_URL` and line 0. Nothing waits on the EDT; nothing logs at `error` level (an IDE
  plugin error, AC-030). Test: `CoreStateTest` (transitions, final states, listener once per change, removal).
- **Tests first:** `CoreStateTest` red against `TODO()`.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS (compiles; `CoreStateTest`); the browser glue is proven inside
  an IDE by T-022.
- [x] **Verified (T-039):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `48c2209` (run 44869730563; compile incl. the JCEF glue, `CoreStateTest` 10 tests) · the JCEF glue itself is proven in an IDE by T-022. Deviation: tests written alongside the code.
- **Notes:** (1) `CoreRuntime` buffers every script (`dispatch`, `invoke`, `resolve`, conformance calls) until `core.html` finished loading; `start` goes first, then the buffer in order. (2) The 60 s timer starts in `start()` and fails the core only if still `Loading`. (3) `PluginRequestHandler` takes a `core.html` supplier: fresh nonce per request, `jsQuery.inject("frame")`. (4) `UNSUPPORTED`/`SUSPENDED` are set by `StudioProjectService` (T-025) before a client is created. (5) `dispose()` is idempotent: cancels the timer, fails pending futures, disposes the query then the browser on the EDT. (6) Request/load handlers are not removed from the shared `JBCefClient` on dispose — T-025 should give each core its own client (`JBCefApp.getInstance().createClient()`) and dispose it with the core. (7) Frames are handled on a bounded (1) pool, off the EDT.

### T-022 — Conformance, core readiness and budgets inside a Starter IDE on three OS

- **Covers:** AC-004, AC-005, AC-007 (core ready, read, update), R-1, R-2, R-5, R-6
- **Files:** `jetbrains/build.gradle.kts` (`integrationTest` source set and task), `jetbrains/gradle/libs.versions.toml`,
  `<pkg>/probe/ProbeAutoRun.kt`, `<pkg>/probe/ConformanceProbe.kt`, `jetbrains/src/main/resources/META-INF/plugin.xml`,
  `<it>/CoreIdeTest.kt`, `.github/workflows/jetbrains.yml`
- **Do:** Follow *Contracts › Starter harness*. Gradle: source set and task `integrationTest`;
  `testFramework(TestFrameworkType.Starter, configurationName = "integrationTestImplementation")`, Kodein, coroutines,
  JUnit with the approved versions in the TOML; the task also passes `featherspec.conformance` = absolute
  `jetbrains/build/conformance` and `featherspec.fixture` = absolute `test/fixtures/studio-0015`. `ProbeAutoRun`
  (`<postStartupActivity>`): returns unless `featherspec.probe.out` is set; else on a pooled thread waits (≤ 5 min) for
  `StudioProjectService.state` to become `Ready` (T-025) and runs the probe named by `featherspec.probe`
  (`conformance` here; T-035, T-040, T-041 add theirs). `ConformanceProbe`: for each `<conformance>/inputs/*.json`
  calls `runtime.conformance(input)` and writes the reply to `<out>/actual/<name>.json`; the setup pair likewise
  (`setup-actual.json`); then `<out>/budgets.json` with `coreReadyMs` (`readyAtNanos − startedAtNanos`: StudioStartup
  entry → `ready`), `gen200ReadMs` (best of three `conformance(gen-200)`), `gen200UpdateMs` (best of three after
  changing one file of that input), `coreReadyWarmMs` (a second `CoreRuntime` on the same client, JCEF already up,
  started and disposed by the probe) and `jsHeapBytes` (`invoke('diagnostics')`). Workflow: job `ide-tests` exactly as
  the harness. `CoreIdeTest` (fixture copy of `studio-0015`, `featherspec.probe=conformance`): after the IDE closed,
  every `actual/<name>.json` equals `expected/<name>.json` byte for byte, and the setup pair; `coreReadyMs ≤ 12,000`
  (R-5), `gen200ReadMs < 2,000` and `gen200UpdateMs < 1,000` (R-2, 0002 AC-018); prints `budgets.json` (warm start and
  heap are recorded, not asserted; ADR-004 risk 1).
- **Tests first:** `CoreIdeTest` red on CI run 1 (no probe yet → no `actual/`).
- **Verify:** `CI: jetbrains.yml › ide-tests` green on ubuntu, windows, macos; `› plugin` green.
- [x] **Verified (T-022):** 2026-11-21 · CI at `e2d2b93` (run 44878649481) all green: `ide-tests` ubuntu/windows/macos (CoreIdeTest: every `actual/<name>.json` byte-equal to the Node `expected/`, ≥ 27 names; budgets met), `plugin` 3 OS, `vscode-mirror` 2 OS, `vscode-guards`, `shared-guard` 2 OS; `jvmNextBaseline.test.ts` (JVM `next` vs `test/fixtures/next-step-baseline/*.json` with the same `EXCEPTIONS`) 7/7. Budgets Linux / Windows / macOS: `coreReadyMs` 3855 / 11747 / 7581 (≤ 12000), `gen200ReadMs` 392 / 399 / 181 (< 2000), `gen200UpdateMs` 465 / 669 / 387 (< 1000); recorded: `coreCreateMs` 2720 / 2355 / 4548, `coreLoadMs` 3630 / 10968 / 6601, `gen200HarnessMs` 3375 / 1862 / 2050, `coreReadyWarmMs` 1365 / 1071 / 1690, `jsHeapBytes` 130 / 114 / 131 MB. Way there: run 1 (`ad010e7`) 27/27 equal but the probe timed the whole conformance harness (Node needs 1.76 s for it) → measurement fixed to 0002 AC-018 (`3143a80`) → real bridge read 8.6–9.3 s / update 4.0–4.5 s (≈10 ms per IPC, ~900 calls) → transport batching both ways (`f5e7074`: 831 calls in 14–24 frames; read 0.4 s) → reply flush without a timer (`e23814f`: Windows update 1013 → 926 ms) → R-5 second-start rule (`e2d2b93`). Deviation: tests written alongside the code.
- **Notes:** (1) Budgets measure what 0002 AC-018 means: `budget.read` (best of three `repository.open` through the real bridge ports on a temp copy of gen-200) and `budget.update` (append + fake event + `onDidChange`, Kotlin wall time) in `src/hosts/embedded/budgets.ts`; the harness time is `gen200HarnessMs`, recorded only. (2) Bridge batching (extension of the T-015 contract, orchestrator proxy): calls of one tick → one `calls` frame (`queueMicrotask`; a lone call keeps `call`); Kotlin answers through `resolveMany` as soon as every outstanding call is answered, else after 5 ms; `budget.*` replies carry `{ms, calls, frames}`. (3) R-5 rule (orchestrator proxy, Gregor confirms): if the only violation of the first start is `coreReadyMs`, a second IDE start on the same runner decides, printed as `COLD-START-RETRY`; Windows runner cold starts varied 7.5–27 s (the CEF process start, `coreLoadMs`), Linux 3–5 s. Gregor's own Windows hands-on (AC-040/041) is the real check. (4) Setup pair deferred until T-033 answers `archive.read` (`SETUP-PAIR deferred…`); T-033 makes it strict. (5) `ProbeAutoRun` is inert without `featherspec.probe.out`. (6) Warm start uses a fresh JCEF client. (7) `source.scan` prefetch (`6ceb027`, orchestrator proxy, extension of the T-015 contract): the embedded spec source answers `stat`/`list` under `.specs` and `.memory-bank` from one scan per root, fresh for 100 ms, dropped on `fileChanged`/`markerChanged`/watch dispose/setup writes; symlinks and failures fall back per call. Effect at `6ceb027` (Linux / Windows / macOS): read 178 / 233 / 240 ms (`calls=411 frames=2`), update 298 / 317 / 334 ms (`calls=2 frames=2`), coreReady 4517 / 6599 / 8963 ms. Re-planned 2026-11-21 for V2: plain JUnit cannot host JCEF; runs after T-025 (stage 7 order). From the G3 review (2026-11-21): AC-004 also asks for "the same EXCEPTIONS and no other" — compare the JVM `next` outputs against `test/fixtures/next-step-baseline/*.json` with the `EXCEPTIONS` of `src/core/board/nextStepBaseline.test.ts`; the weak inputs repo-8052f9a/repo-f9cadb4/gen-200 carry a synthetic AGENTS.md (conformanceInput.ts) and are compared only against the Node expected files, not the baselines.

### T-023 — File ports: URIs, spec source, folders, own watcher, VFS events, frame activation

- **Covers:** AC-020, AC-021 (own watcher, refresh on activation), H-10, H-11
- **Files:** `<pkg>/ports/FileUris.kt`, `<pkg>/ports/FilePorts.kt`, `<pkg>/ports/ProjectFolders.kt`,
  `<pkg>/ports/RootWatcher.kt`, `<pkg>/ports/SpecWatch.kt`, `<test>/ports/FileUrisTest.kt`,
  `<test>/ports/FilePortsTest.kt`, `<test>/ports/ProjectFoldersTest.kt`, `<test>/ports/RootWatcherTest.kt`
- **Do:** `FileUris`: `toUri(path: java.nio.file.Path, windows: Boolean): String` and `toPath(uri)` with the vectors of
  *Contracts › Roots*. `FilePorts` (pure over `java.nio.file`): `list`, `stat` (kind incl. `symlink` via
  `LinkOption.NOFOLLOW_LINKS`, mtime ms, size), `readBytes`, `readText`, `readDirectory` — answers for `source.*` and
  `fs.*` (mirror `src/adapters/node/nodeSpecSource.ts`, `nodeFileSystem.ts`). `ProjectFolders`: pure function
  `folders(basePath, contentRoots): List<Folder>` (base directory first, then content roots not inside it; name = last
  segment; Rider: solution folder = base path). `RootWatcher` (pure `java.nio.file`, no `com.intellij`):
  `RootWatcher(onChange: (root: Path, relative: String) -> Unit)` with `watch(root)`, `unwatch(root)`, `close()`; one
  `FileSystems.getDefault().newWatchService()`; registers the root itself (for `AGENTS.md`) and every directory under
  `<root>/.specs` and `<root>/.memory-bank` (`Files.walkFileTree`) for `ENTRY_CREATE`, `ENTRY_MODIFY`, `ENTRY_DELETE`
  with `com.sun.nio.file.SensitivityWatchEventModifier.HIGH` (the stock macOS service polls); registers a directory
  created later; reports only paths under `.specs/`, `.memory-bank/projectbrief.md` and `AGENTS.md`; `OVERFLOW` → one
  report with `relative = ""`; a daemon thread `FeatherSpec watcher` takes the keys. `SpecWatch` (glue): answers
  `watch.add|remove {root, kind}` (counted per root; root = `FileUris.toPath`); feeds `RootWatcher` events and the IDE's
  `VirtualFileManager.VFS_CHANGES` (`BulkFileListener.after`, application bus, as T-007) for paths inside a watched
  root (pure helper `relativeInside(root, path)`, tested) into `dispatch('fileChanged', {root, path})`, plus
  `markerChanged {root}` for `AGENTS.md`, `.specs` and `.memory-bank/projectbrief.md`; after a `RootWatcher` event also
  `VfsUtil.markDirtyAndRefresh(true, false, false, <file>)` so the IDE's editors see it;
  `ApplicationActivationListener.TOPIC` → `VfsUtil.markDirtyAndRefresh(true, true, true, <root>/.specs)` per watched root.
  Tests: vectors as before; `RootWatcherTest` on `@TempDir`: a write to `.specs/backlog/x.md` is reported within 5 s
  and the measured delay is printed (`ROOTWATCHER-MS <os> <ms>`; the `plugin` job runs it on macOS too — AC-021's
  2 s is decided inside the IDE by T-035); a file in a new subdirectory is reported; a file outside the watched parts is
  not; `close()` ends the thread.
- **Tests first:** four test files red against `TODO()`.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS; the `ROOTWATCHER-MS` lines of all three logs copied into Notes.
- [x] **Verified (T-023):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `a41ef3a` (run 44872155050): FileUrisTest 20, FilePortsTest 22, ProjectFoldersTest 11, RootWatcherTest 21 · own watcher, write to report: `ROOTWATCHER-MS linux 0`, `windows 0`, `macos 105` (AC-021: 2 s) · first CI run at `c87becc` red on 3 OS (9 real-watcher tests saw no report) → root cause found with a probe: the default file system in tests and in the IDE is `MultiRoutingFileSystemProvider`; `take()` returns a `MultiRoutingWatchKeyDelegate`, not the registered key, and event names are `MultiRoutingFsPath` → fix: look the registration up by `key.watchable().toString()` too, resolve names as text, a failing event batch reports `""` instead of ending the thread. Deviation: tests written alongside the code.
- **Notes:** Re-planned 2026-11-21 (ADR-004 recommendation 4, S-4: the IDE watcher alone missed 2 s on every runner). (1) Pure: `FileUris` (VS Code-compatible encoding; string cores `fromText`/`toPathText` test Windows vectors on Linux), `HostOs`, `FilePorts` (`answer(name, args)` → `{"ok":…}`/`{"error":…}`/null; `..` rejected), `ProjectFolders` (base first, content roots outside it, dedup; Windows `displayPath` keeps the drive case — Gregor may prefer VS Code's lowercase), `RootWatcher`, `WatchedPaths`, `WatchRegistry`, `ChangeEvents`; glue `SpecWatch` (`watch.add/remove`, VFS_CHANGES, frame activation `markDirtyAndRefresh`). (2) Return notes `.memory-bank/activeContext.<…>.md` are reported (VS Code watches them). (3) `.featherspec-setup` is not watched — T-032/T-034 check whether setup needs it. (4) macOS registers with `SensitivityWatchEventModifier.HIGH`. (5) Rule for later steps: never rely on `WatchKey` identity or `Path.resolve(foreignPath)` under IntelliJ's routing file system.

### T-024 — Store and memory ports outside the project folders

- **Covers:** AC-025, H-12, OP-005
- **Files:** `<pkg>/ports/FileRuntimeMedium.kt`, `<pkg>/ports/StoreLocation.kt`, `<pkg>/ports/UiMemoryState.kt`,
  `<test>/ports/FileRuntimeMediumTest.kt`, `<test>/ports/StoreLocationTest.kt`
- **Do:** `FileRuntimeMedium(baseDir)`: port of `src/adapters/node/fileRuntimeMedium.ts` `createFileRuntimeMedium`
  (name check, per-file queues, `append`, `replace` via temp file + `Files.move(ATOMIC_MOVE)`, `createExclusive` via
  `StandardOpenOption.CREATE_NEW`, `lines` with `terminated`, `list`, `remove`, retry on busy). `StoreLocation`:
  `storeDir(systemPath, rootUri, windows)` = `<systemPath>/featherspec-studio/projects/<sha256(windows ? root.lowercase
  : root) hex[0:16]>` (mirror `projectStoreDirectory`). `UiMemoryState`: application-level `@Service`
  `PersistentStateComponent` `@State(name = "FeatherSpecStudioMemory", storages = [Storage("featherspec-studio-memory.xml")])`
  holding `Map<String, String>` keyed by `<project base path>|<key>` (gives the IDE project's entries for `start`'s
  `memory` copy and answers `memory.set`, `null` removes; JSON values). Tests:
  the medium on a JUnit `@TempDir` (append/replace/exclusive/lines/list cases of
  `src/core/runtime/testing/contract*.ts`, picked one per method); `StoreLocation` vectors (Windows lowercasing).
- **Tests first:** both test files red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-024):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `a41ef3a` (run 44872155050; T-024's tests were already green at `a572d41` where only the T-023 watcher failed): FileRuntimeMediumTest, StoreLocationTest (vectors = node sha256), UiMemoryTest. Deviation: tests written alongside the code.
- **Notes:** (1) `FileRuntimeMedium` (per-name locks, replace via temp + ATOMIC_MOVE, createExclusive via CREATE_NEW, busy retry on AccessDenied/plain FileSystemException) with `MediumPorts.under(systemPath, windows).answer` for the eight `medium.*` calls (T-016 shapes). (2) `StoreLocation.storeDir` → `<system>/featherspec-studio/projects/<sha256[0:16]>`, root lowercased on Windows. (3) `UiMemory` (pure, keys `<projectBase>|<key>`) + `UiMemoryState` (APP `PersistentStateComponent`, `featherspec-studio-memory.xml`). `memory.set` carries no root: the router passes `project.basePath`. Extra file `UiMemoryTest.kt`.

### T-025 — Project service: start the core at project open and route the bridge

- **Covers:** AC-008, R-4, R-5 (start at project open, off the EDT), AC-019 (untrusted works), AC-031 (offer none)
- **Files:** `<pkg>/StudioProjectService.kt`, `<pkg>/StudioStartup.kt`, `<pkg>/HostRouter.kt`, `<pkg>/CoreConfig.kt`,
  `<pkg>/HostTexts.kt`, `<test>/HostRouterTest.kt`, `<test>/CoreConfigTest.kt`, `<test>/HostTextsTest.kt`,
  `jetbrains/src/main/resources/META-INF/plugin.xml`
- **Do:** `StudioProjectService` (`@Service(Service.Level.PROJECT)`, `Disposable`): owns the project's `JBCefClient`
  (`JBCefApp.getInstance().createClient()`, `Disposer.register(this, client)`), one `CoreStateHolder` and one
  `CoreRuntime` (T-039); `start()` returns at once. `StudioStartup` (`ProjectActivity`, `<postStartupActivity>`) sets
  `startedAtNanos` and calls `start()` — the core starts at project open, not on *Open*; if `!JBCefApp.isSupported()`
  → `state.set(Unavailable(UNSUPPORTED))` and no runtime (T-029 adds the suspended case and the surfaces). Config via
  `CoreConfig.json(platform, studioVersion, settings, trusted, folders, memory)` (pure, Gson): `host: 'jetbrains'`,
  `platform` `win32|darwin|linux`, `studioVersion` from `PluginManagerCore`, `settings: {}` until T-032,
  `trusted = project.isTrusted()`, `folders` from `ProjectFolders` (T-023), `memory` from `UiMemoryState` (T-024).
  `ModuleRootListener.TOPIC` → `dispatch('foldersChanged', {folders})`. `HostRouter` implements `HostHandler`: maps
  every async call name to the T-023/T-024 ports (file I/O on `executeOnPooledThread`) and answers with
  `runtime.resolve(id, …)`; `ui.*`, `clipboard.*`, `editor.*`, `actions.*` → `{"error":"not yet"}` placeholders that
  later steps replace; unknown names → `{"error":"unknown <name>"}`; collects `tree`, `status`, `log` emits into
  observable holders for the UI steps. `HostTexts`: constants mirrored from `LOADING_TEXT`, `STATE_LABELS.S5`,
  `ACTION_LABELS.showOutput` (`src/shared/protocol/texts.ts`) and `JETBRAINS_TEXTS` (`vocabulary.ts`, T-014). Tests:
  the router answers `source.list` from a fake provider through a fake resolver, `memory.set` writes the state, an
  unknown name errors; `CoreConfig` JSON for two folders, untrusted, Windows; `HostTextsTest` reads both TS files and
  asserts each constant equals its source string.
- **Tests first:** the three test files red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-025):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `ba920e1` (run 44872683068): compile of the service glue (`TrustedProjects.isProjectTrusted`, `JBCefApp.createClient`, `ModuleRootListener`), HostRouterTest (routed + deferred = `ASYNC_CALLS` exactly), CoreConfigTest, HostTextsTest (constants = TS literals). In-IDE start is proven by T-022. Deviation: tests written alongside the code.
- **Notes:** Re-planned 2026-11-21 for V2: no sync calls in the router (copies in `start`). (1) `CallRouter.ROUTED`: `source.*`, `fs.*`, `medium.*`, `memory.set`, `watch.add|remove`; prefixes `ui.`, `clipboard.`, `editor.`, `actions.`, `target.`, `http.`, `archive.` answer `{"error":"not yet"}` until T-026…T-034 (deviation: `target.`/`http.`/`archive.` added, they are in `ASYNC_CALLS`). (2) `StudioProjectService.host` offers `tree`, `status`, `log` observables (log capped at 5000 lines) and `subscribe(channel, listener)`. (3) Each core has its own `JBCefClient`, registered on the service before the runtime, so the runtime is disposed first. (4) T-029 sets `SUSPENDED` and disposes the runtime; T-032 fills `settings` and dispatches `trustGranted`; T-022 reads `state`, `runtime`, `startedAtNanos`. (5) `postStartupActivity` `StudioStartup` registered in `plugin.xml`; services are light `@Service`.

### T-026 — Studio editor tab in JCEF, sharing the project's JCEF client

- **Covers:** AC-013, AC-014 (message sequence, Reload), AC-015, AC-007 (loading state before the core is ready)
- **Files:** `<pkg>/panel/StudioFile.kt`, `<pkg>/panel/StudioEditorProvider.kt`, `<pkg>/panel/StudioEditor.kt`,
  `<pkg>/panel/PanelShim.kt`, `<pkg>/jcef/PluginResources.kt`, `<test>/jcef/PluginResourcesTest.kt`,
  `<test>/panel/PanelShimTest.kt`, `plugin.xml`
- **Do:** Mirror `jetbrains/spikes/ide/.../SpikePanel.kt` (T-005). `StudioFile`: one `LightVirtualFile("FeatherSpec
  Studio")` per project (kept by the service). Provider: `accept = file is StudioFile`,
  `FileEditorPolicy.HIDE_DEFAULT_EDITOR`, `DumbAware` (else the tab opens as a text editor, T-006). `StudioEditor`:
  shares JCEF — `JBCefBrowser.createBuilder().setClient(service.client).build()`, never its own `JBCefApp` or client —
  and adds the T-039 `PluginRequestHandler` for this browser; a `JBLoadingPanel` with `HostTexts.LOADING` shows at once
  while `service.state` is `Loading` (AC-007: within 1 s of *Open*) and the browser when `Ready`; `Failed` → a
  `JBPanelWithEmptyText` with `HostTexts.S5` and a *Show output* link; `JBCefJSQuery` → `dispatch('panelMessage')`;
  `emit('panel')` → `executeJavaScript`; `panelOpened/panelClosed` on create/dispose; HTML from `invoke('panelHtml',
  {nonce, cspSource: origin, scriptUri, styleUri, reloaded})` plus `PanelShim.insert(html, nonce, bodyClass)`; Reload →
  reload only this browser. `PluginResources`: add `index.html`, `main.js`, `main.css` (from `webview/`) and
  `theme.css` (T-027). Tests: the allow-list table extended (internet, `file:`, `..`, other host, query tricks;
  `core.js` still allowed); shim insertion keeps the CSP meta byte-identical and puts the tags after `<div
  id="root"></div>`.
- **Tests first:** both tests red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-026):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `6ceb027` (run 44881538602; first run at `5ee74b8` green on ubuntu/macos, windows red only on a watcher-test race fixed in `847d903`): PluginResourcesTest (4 new URLs, 22 more refused), PanelShimTest, PanelModelTest, HostRouterTest. The real tab, shim round trip and Reload are proven in an IDE by T-035 and Gregor's hands-on. Deviation: tests written alongside the code.
- **Notes:** Re-planned 2026-11-21 (ADR-004 recommendation 2: JCEF is initialised once per IDE session). (1) Pure: `PanelShim` (VS Code API shim right after the root, theme link before `main.css`), `PanelViews`, `PanelLifecycle` (`panelOpened` once on the first `Ready`, `panelClosed` only if opened), `PanelMessages`. (2) `StudioEditor` swaps Loading (`JBLoadingPanel`), Ready (JCEF browser on `service.client`), Failed (S5 + Show output → `showOutput` channel, T-031), Unavailable (text only, notice is T-029). (3) The HTML comes from `invoke('panelHtml')`, never a blocking wait; Reload rebuilds it with `reloaded=true`. (4) Edited beyond the file list: `PluginRequestHandler` (documents map; a browser cannot load the other browser's document), `HostRouter` (`actions.openStudio`/`actions.reloadPanel` routed, group PANEL), `StudioProjectService` (`client`, `studioFile`, `openStudio()`, `reloadRequests`).

### T-027 — Theme bridge

- **Covers:** AC-026, AC-027, AC-028
- **Files:** `<pkg>/theme/ThemeMapping.kt`, `<pkg>/theme/ThemeBridge.kt`, `<test>/theme/ThemeMappingTest.kt`, `plugin.xml`
- **Do:** Mirror `SpikeTheme.kt` (T-006), which maps only about 20 of the 59 variables and paints the rest grey
  (ADR-004 S-2): here **each of the 59** `--vscode-*` variables of `src/webview/main.css` gets its row, the chart, state
  and focus colours and the fonts included. `ThemeMapping` (pure): one table row per CSS variable `(cssVar, ideKeys:
  List<String>, fallbackLight, fallbackDark, fallbackHighContrast)`; `fun variables(lookup: (String) -> java.awt.Color?,
  kind: ThemeKind): Map<String, String>` (never empty values); `ThemeKind.of(isDark, idOrName)` → `vscode-light`,
  `vscode-dark`, `vscode-high-contrast`; fonts from `UIUtil.getLabelFont()` / editor font scheme passed in as strings.
  `ThemeBridge` (glue): `LafManagerListener.TOPIC` → one `executeJavaScript` into the panel browser only (the hidden
  core page has no UI) with all `setProperty` calls and the body class swap; `theme.css` content for first paint
  (served through `PluginResources`, T-026); `JBCefScrollbarsHelper.buildScrollbarsStyle()` appended. Test: reads
  `../src/webview/main.css`, derives every `--vscode-*` name by regex, fails when the table lacks one (AC-026); every
  value non-empty for an all-null lookup; kind table for Light, Darcula, High Contrast, Islands Light, Islands Dark.
- **Tests first:** `ThemeMappingTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-027):** 2026-11-21 · CI `jetbrains.yml › plugin` green on 3 OS at `6ceb027` (run 44881538602; at `847d903` one test expectation was wrong — a colour that already holds the ratio must stay unchanged — fixed in `f6a17b4`): ThemeMappingTest incl. the 59-variable coverage read from `src/webview/main.css` in both directions (AC-026), the kind table Light/Darcula/High Contrast/Islands (AC-027), one update script for all variables + body class (AC-028), contrast pairs (AC-029). Visual check is Gregor's hands-on. Deviation: tests written alongside the code.
- **Notes:** (1) `theme/ThemeMapping.kt` pure: 56 colour rows + 3 font variables, `ThemeKind.of` (high contrast = id/name contains "contrast"), `css()`, `updateScript()`, contrast adjustment (20 pairs, 4.5:1 text, 3:1 focus). (2) `contrastBorder`/`contrastActiveBorder` are `initial` outside high contrast so the `var()` fallbacks in `main.css` apply. (3) Link keys `Link.activeForeground`/`Link.hoverForeground`. (4) Scrollbars from `JBCefScrollbarsHelper.buildScrollbarsStyle()` in `theme.css`; live switch re-applies them via `adoptedStyleSheets` (try/catch). (5) The editor font follows on the next LAF change or reopen (no `EditorColorsListener`). (6) Several UI key names are best guesses with safe fallbacks — Gregor's visual check in Rider/WebStorm decides.

### T-028 — Tool window with the Specs tree

- **Covers:** AC-010, AC-011, AC-012, AC-007 (loading state), H-1, H-2, H-3
- **Files:** `<pkg>/tree/SpecTreeMapping.kt`, `<pkg>/tree/StudioToolWindowFactory.kt`, `<pkg>/tree/SpecTreePanel.kt`,
  `<test>/tree/SpecTreeMappingTest.kt`, `plugin.xml`
- **Do:** `SpecTreeMapping` (pure): parses the `tree` emit JSON (shape of `src/core/shell/specTree.ts`
  `SpecTreeModel`) into nodes (group/spec rows, label, description, icon id, colour id, tooltip text, `contextValue`
  flags `step`, `plan`, `map`), the empty-text lines and actions, and the count of Review + Blocked. Factory:
  `<toolWindow id="FeatherSpec Studio" anchor="left" factoryClass=… icon=…/>`; `SpecTreePanel` = `SimpleToolWindowPanel`
  with a `Tree` over `DefaultTreeModel` rebuilt on change, `TreeState.createOn/applyTo` to keep expansion and
  selection, `ColoredTreeCellRenderer` (label, grey description, icon mapped from the codicon id with `AllIcons`),
  tooltip from the row; `tree.emptyText` lines/links via `StatusText.appendLine(…, SimpleTextAttributes.LINK_ATTRIBUTES,
  listener)`; `toolWindow.setTitleActions(Open, Refresh, Open Settings, Copy Next Step)` (selected row);
  `PopupHandler.installPopupMenu(tree, "featherspec.studio.TreePopup", place)`; row activation → `invoke('tree.select')`
  without focus change; badge: title `FeatherSpec Studio (<n>)` and `ExecutionUtil.getLiveIndicator(icon)` while n ≥ 1.
  While `service.state` is `Loading` the empty text is `HostTexts.LOADING`; `Failed` → `HostTexts.S5` with a *Show
  output* link; `Unavailable` → T-029's notice. Actions referenced here are registered in T-029.
- **Tests first:** `SpecTreeMappingTest` with the tree JSON of two conformance fixtures (`jetbrains/build/conformance/expected`) red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-028):** 2026-11-21 · CI at `9b187b3` (run 44882319738) green on every job: `plugin` 3 OS (SpecTreeMappingTest 17 tests on 7 real `tree` payloads), `ide-tests` 3 OS. Visual check in Rider/WebStorm is Gregor's hands-on. Deviation: tests written alongside the code.
- **Notes:** (1) `tree/SpecTreeMapping.kt` pure (groups, rows, flags from `contextValue`, icons, tones, empty-text lines/links, Review + Blocked count, `rowArgs`). (2) Fixtures in `jetbrains/src/test/resources/tree/` are copies of `build/conformance/expected/*.json` (that dir only exists in `ide-tests`) — drift is not guarded yet; T-036 adds a check that they equal a fresh `conformanceExpected.mjs` run. (3) Expansion/selection restored by id, not `TreeState`. (4) The S2 welcome text is hardcoded in the host (the emit carries `welcome: 'S2'` only). (5) Row tone colours the description only; `accessibleLabel` not wired into Swing accessibility (Gregor's hands-on decides).

### T-029 — Actions for Find Action and the no-JCEF case (notice instead of the tree, notifications)

- **Covers:** AC-017, AC-030 (notice, notifications, suspended detection), AC-013 (Open Overview/Board/Plan Map), H-7
- **Files:** `<pkg>/actions/StudioActions.kt`, `<pkg>/actions/ActionTable.kt`, `<pkg>/jcef/JcefAvailability.kt`,
  `<pkg>/tree/UnavailableNotice.kt`, `<pkg>/StudioProjectService.kt`, `<test>/actions/ActionTableTest.kt`,
  `<test>/jcef/JcefAvailabilityTest.kt`, `plugin.xml`
- **Do:** `ActionTable` (pure): rows `(actionId, title, invokeCommand)` for every command of `package.json`
  `contributes.commands` except `shellAction` and `selectSpec`; IDs `featherspec.studio.<camelName>`, titles exactly as
  the manifest. `StudioActions`: one `AnAction` subclass taking the row (`ActionUpdateThread.BGT`), registered in
  `plugin.xml` `<actions>` with the same `text`; group `featherspec.studio.TreePopup` with Open Spec, Open Plan, Show in
  Plan Map, Copy Next Step (enabled by the row flags). `JcefAvailability` (pure): `decide(supported: Boolean,
  loadedAfterMs: Long?, waitedMs: Long)` → `AVAILABLE` (loaded), `UNSUPPORTED` (`!supported`), `SUSPENDED` (supported,
  `core.html` not loaded after `SUSPENDED_AFTER_MS = 30_000`: the page never loads while the OS sandbox suspends JCEF,
  ADR-004 S-2; no platform flag is documented, *Research* 2026-11-21), else `PENDING`. Service: 30 s after
  `CoreRuntime.start` with no `loadedAtNanos` → `state.set(Unavailable(SUSPENDED))` and dispose the runtime. While
  `state` is `Unavailable(kind)`: the tool window shows `UnavailableNotice` (a `JBPanelWithEmptyText` with
  `JETBRAINS_TEXTS.jcefUnsupported` or `.jcefSuspended` and an *Open help* link → `BrowserUtil.browse(helpUrl)`)
  instead of the Specs tree; Open, Copy Next Step and Set up FeatherSpec show one balloon of group `FeatherSpec Studio`
  (register `<notificationGroup id="FeatherSpec Studio" displayType="BALLOON"/>` here; T-031 reuses it) with the same
  reason and the *Open help* action (`NotificationAction.createSimpleExpiring`) and do nothing else; nothing throws or
  logs at `error` level (that is an IDE plugin error); the settings page needs no core (T-032). Tests: the table equals
  `../package.json`'s commands minus the two (IDs, titles); `JcefAvailability` vectors (supported and loaded at 9 s →
  available; unsupported; supported, not loaded at 30 s → suspended; not loaded at 10 s → pending).
- **Tests first:** both tests red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS; the IDE-level proof is T-040.
- [x] **Verified (T-029):** 2026-11-21 · CI at `c4e430f` (run 44883094676): `plugin` 3 OS green (ActionTableTest: table = `package.json` commands minus `shellAction`/`selectSpec`, every `plugin.xml` action has a row and a class; NoticeContentTest = `JETBRAINS_TEXTS`; JcefAvailabilityTest), `ide-tests` ubuntu/macos green (windows red on R-5 only, see T-022/T-030). Deviation: tests written alongside the code.
- **Notes:** Re-planned 2026-11-21 (G1 decision 3): without JCEF only the settings page works. (1) One `StudioAction` class registered 14 times; its row comes from `ActionManager.getId(this)`. (2) Tree actions read the selected row from `StudioProjectService.selection` (no DataContext); from Find Action they act on the last selected row. (3) Suspension: 30 s after `core.open()` with no page load → `Unavailable(SUSPENDED)`, runtime disposed. Risk for Gregor: Windows CI page loads took up to 14 s, so 30 s leaves ~2× margin. (4) `UnavailableNotice` replaces the tree; `UnavailableBalloon` (group "FeatherSpec Studio") with *Open help* for every core action while unavailable; Open Settings always works.

### T-030 — Status bar widget, clipboard and opening files

- **Covers:** AC-016, AC-024, AC-030 (status part), AC-007 (loading state), H-6, H-15, H-16
- **Files:** `<pkg>/status/StatusEntryMapping.kt`, `<pkg>/status/StudioStatusWidget.kt`, `<pkg>/ports/EditorOpen.kt`,
  `<test>/status/StatusEntryMappingTest.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `StatusEntryMapping` (pure): `status` JSON (`StatusEntryView` of `src/core/ports/copyNextStep.ts`) → text
  with `$(codicon)` replaced by an icon id, plain tooltip lines (Markdown → plain), accessible name, command. Widget:
  `StatusBarWidgetFactory` (`<statusBarWidgetFactory id="featherspec.studio.status" …/>`) with a `CustomStatusBarWidget`
  (`JBLabel`, `accessibleContext.accessibleName`), hidden while `null`; click → `invoke('copyNextStep')`. While
  `service.state` is `Loading` it shows `AnimatedIcon.Default` with the tooltip `HostTexts.LOADING`; `Unavailable` →
  the text `JETBRAINS_TEXTS.statusUnavailable` with the reason as tooltip, click → T-029's balloon (AC-030).
  Router: `clipboard.write` → `CopyPasteManager.getInstance().setContents(StringSelection(text))`; `editor.open` →
  `OpenFileDescriptor(project, vfile, line - 1, 0)`; `place = beside` opens in a vertical split next to the Studio tab
  (`FileEditorManagerEx.getInstanceEx(project)`, `EditorWindow.split(...)`), `activeGroup` in the current window;
  `not-found` when the file is missing. Test: mapping vectors from the conformance `status` outputs.
- **Tests first:** `StatusEntryMappingTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-030):** 2026-11-21 · CI at `d08c599` (run 44884666829) green on every job: `plugin` 3 OS (StatusEntryMappingTest, EditorOpenTest, HostRouterTest), `ide-tests` 3 OS. First run at `ed4630c` failed to compile (`FileEditorManagerEx` is in `fileEditor.ex`), fixed. Deviation: tests written alongside the code.
- **Notes:** (1) Pure: `status/StatusEntryMapping.kt` (Hidden/Shown, markdown tooltip → plain lines, Loading/Unavailable/Failed rules — Failed hides the widget), `ports/EditorOpen.kt` (parse, resolve with path safety, `line-1`, VS Code placement rule, reply). (2) Glue: `StudioStatusWidget` (`CustomStatusBarWidget` + `JBLabel`), `ports/SystemCalls.kt` (`clipboard.write`; `editor.open` via `refreshAndFindFileByPath` + `OpenFileDescriptor.navigate`; the beside split calls `EditorWindow.split(int, boolean, VirtualFile, boolean)` by reflection with fallback to the current window — Gregor checks that beside really splits). (3) Router: Group SYSTEM; `clipboard.`/`editor.` no longer deferred. (4) Orchestrator perf change in the same commit: `CoreRuntime.open()` creates the browser at once while the config is prepared on a pooled thread (`provideConfig`); Windows `coreCreateMs` 1.7–2.7 s → 1.3 s, `coreReadyMs` 9466 at `d08c599`.

### T-031 — Notifications, popups, progress and the log view

- **Covers:** AC-023, H-13, H-14
- **Files:** `<pkg>/ui/HostUi.kt`, `<pkg>/ui/LogView.kt`, `<pkg>/ui/UiRequests.kt`, `<test>/ui/UiRequestsTest.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `UiRequests` (pure): parse/serialise the `ui.*` argument and reply JSON (notify level/message/actions →
  chosen label or null; pick items → index or null; confirm model → boolean; progress title → id). `HostUi` (glue, on
  EDT via `invokeLater`): `NotificationGroupManager.getInstance().getNotificationGroup("FeatherSpec Studio")`
  (group registered in T-029) with `NotificationAction.createSimpleExpiring`
  per action in order; pick → `JBPopupFactory.getInstance().createPopupChooserBuilder(...)`; confirm →
  `MessageDialogBuilder.okCancel(title, message).yesText(confirmLabel).ask(project)`; progress →
  `ProgressManager.getInstance().run(Task.Backgroundable(project, title, true))` ending on `progressEnd`, Cancel →
  `dispatch('progressCancelled')`; `openExternal` → `BrowserUtil.browse`. `LogView`: a second tool-window content
  "Output" holding a `ConsoleView` (`TextConsoleBuilderFactory`); `log` emits printed line by line; `showOutput` selects
  it. Test: request/reply round trips.
- **Tests first:** `UiRequestsTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-031):** 2026-11-21 · CI at `d08c599` (run 44884666829) green on every job: `plugin` 3 OS (UiRequestsTest 16, HostRouterTest), `ide-tests` 3 OS. Deviation: tests written alongside the code.
- **Notes:** (1) Group UI routes `ui.pick`, `ui.notify`, `ui.confirm`, `ui.progressStart`, `ui.openExternal`; `ui.` no longer deferred. (2) `HostUi` blocks the router's pooled thread on a future completed from the EDT; pending futures → null on close. (3) Progress ids `progress-N`; Cancel sends `progressCancelled {id}` once. (4) `warn` → WARNING balloon; `showOutput` shows the tool window's "Output" tab (`ConsoleView`); the tree tab is "Specs". (5) `ui.openExternal` accepts http/https only. (6) A balloon that auto-hides leaves its `ui.notify` future pending until the user acts or the project closes.

### T-032 — Settings page, settings port and project trust

- **Covers:** AC-018, AC-019, AC-031, AC-030 (settings page without JCEF), H-8, H-9
- **Files:** `<pkg>/settings/StudioSettings.kt`, `<pkg>/settings/StudioConfigurable.kt`, `<pkg>/settings/SettingsTable.kt`,
  `<test>/settings/SettingsTableTest.kt`, `<pkg>/TrustWatch.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `SettingsTable` (pure): keys, defaults, labels, descriptions of `featherspec-studio.showStepTips` and
  `featherspec-studio.modelHints` read from `../package.json` `contributes.configuration` at test time and kept as
  constants in code; `assistant` excluded (AC-031). `StudioSettings`: application `@Service` `PersistentStateComponent`
  `@State(name = "FeatherSpecStudioSettings", storages = [Storage("featherspec-studio.xml")])`; change →
  `dispatch('settingsChanged', {key, value})` on every open project's runtime, and `CoreConfig.settings` gets the
  current values (replaces T-025's `{}`). `StudioConfigurable` (reads and writes only `StudioSettings`, never the
  runtime, so it works without JCEF, AC-030): `BoundConfigurable` with
  Kotlin UI DSL (`checkBox(label).bindSelected`, comment = description, model hints as `textField`),
  `<applicationConfigurable parentId="tools" id="featherspec.studio.settings" displayName="FeatherSpec Studio"
  instance=…/>`; Open Settings → `ShowSettingsUtil.getInstance().showSettingsDialog(project,
  StudioConfigurable::class.java)`. `TrustWatch`: application listener `TrustStateListener.onProjectTrusted(project)` →
  `dispatch('trustGranted', {})` (the page's trust copy turns true); `actions.manageTrust` → the platform's
  trust prompt if a public API exists, else `BrowserUtil.browse("https://www.jetbrains.com/help/idea/project-security.html")`
  (record which in Notes). Test: table equals the manifest entries.
- **Tests first:** `SettingsTableTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [x] **Verified (T-032):** 2026-11-21 · CI at `302f3a2` (run 44885753961): `plugin` 3 OS green (SettingsTableTest: ids/types/defaults/descriptions = `package.json`, bare keys = `stepTipSettings.ts`; TrustWatchTest). Deviation: tests written alongside the code.
- **Notes:** (1) Bare keys `showStepTips`, `modelHints` to the core; a hints change sends the whole `{strong, fast}` object, blanks omitted. (2) `StudioConfigurable` (`BoundConfigurable`, Kotlin UI DSL, `applicationConfigurable` under Tools) reads/writes `StudioSettings` only, never the runtime (AC-030). (3) Trust: no listener API (unsure of it) — `recheckTrust()` on frame activation, `actions.openStudio` and `actions.manageTrust`; `trustGranted` once per false→true. (4) `actions.manageTrust` opens the JetBrains project-security help page; it does not grant trust (proxy, Gregor confirms).

### T-033 — Setup host part 1: HTTP through the IDE proxy and the tar.gz reader

- **Covers:** AC-022 (download, proxy, no credentials), AC-005 (archive)
- **Files:** `<pkg>/setup/ReleaseHttp.kt`, `<pkg>/setup/TarGzArchive.kt`, `<test>/setup/TarGzArchiveTest.kt`, `<test>/setup/ReleaseHttpTest.kt`, `<pkg>/HostRouter.kt`
- **Do:** `ReleaseHttp`: `java.net.http.HttpClient.newBuilder().proxy(ProxySelector.getDefault())` (the IDE installs
  its selector) `.followRedirects(NEVER)`, no authenticator, no cookie handler; `get(url, headers)` → `{status,
  headers (lower-case keys), bodyBase64}`; mirror `src/adapters/node/fetchReleaseHttp.ts`. `TarGzArchive`: port of
  `src/adapters/node/tarGzArchive.ts` (`GZIPInputStream` with an output cap → `too-large`; ustar/pax reader; kinds
  `file|directory|metadata|other`; `unreadable` with detail). Tests: the real `../test/fixtures/setup/featherspec-1.10.0.tar.gz`
  gives the same entry paths/kinds/sizes as the Node reader (expected list generated by
  `conformanceExpected.mjs` — add `archive-expected.json` there); cap → `too-large`; a truncated file → `unreadable`;
  HTTP against a local `com.sun.net.httpserver.HttpServer`: a 302 is returned, not followed; no `Cookie`/`Authorization` header sent.
- **Tests first:** both tests red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-033):** —
- **Notes:** —

### T-034 — Setup host part 2: the setup target with no-overwrite writes

- **Covers:** AC-022 (writes fail rather than replace, 0014 AC-010), AC-005 (classes and writes on a temp target)
- **Files:** `<pkg>/setup/SetupTarget.kt`, `<test>/setup/SetupTargetTest.kt`, `<pkg>/HostRouter.kt`
- **Do:** `SetupTarget`: port of `src/adapters/node/nodeSetupTarget.ts` (`kind`, `readBytes`, `listDirectory`,
  `createExclusive` with `CREATE_NEW` → `created|exists`, `replaceIfUnchanged` via temp file + atomic move with retry,
  `clearSetupFolder` limited to `.featherspec-setup`). Router `target.*`. Tests: on `@TempDir` (exists → `exists`,
  changed → `changed`, Windows-safe rename retry). Re-planned 2026-11-21 (V2): plain JUnit cannot host the core, so
  the setup conformance runs in T-022's `CoreIdeTest` and the full setup run through the router is T-041.
- **Tests first:** `SetupTargetTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-034):** —
- **Notes:** —

### T-041 — Setup end to end in a Starter IDE (appended 2026-11-21; was T-034's JUnit run on GraalJS)

- **Covers:** AC-022 (the host's setup run end to end), AC-005 (same writes as Node)
- **Files:** `<pkg>/probe/SetupProbe.kt`, `<pkg>/probe/ProbeAutoRun.kt`, `<pkg>/setup/ReleaseHttp.kt`,
  `<pkg>/ui/HostUi.kt`, `<it>/SetupIdeTest.kt`
- **Do:** Harness per *Contracts › Starter harness*. Test hooks, active only while `featherspec.probe=setup` (else no
  change in behaviour): `ReleaseHttp` answers the three routes of `src/core/setup/testing/setupWorld.ts` — `LATEST`
  → 302 to `TAG_URL`, `archiveUrl('v1.10.0')` → 302 to `CODELOAD`, `CODELOAD` → 200 with the bytes of the file named
  by `featherspec.probe.releaseArchive`; `HostUi` answers `ui.confirm` with yes, `ui.pick` with the first item and
  `ui.notify` with no action. `SetupProbe`: after `Ready`, `runtime.invoke('setup', '{}')`, waits for its reply, then
  writes `<out>/setup-files.json` (every file under the project dir except `.idea/`, relative path and base64 bytes).
  `SetupIdeTest`: project = a new empty directory `jetbrains/build/ide-project/setup-empty` (the same start as T-018's
  memory target), `featherspec.probe.releaseArchive` =
  `Path.of("../test/fixtures/setup/featherspec-1.10.0.tar.gz").toAbsolutePath()` (the test task's working directory is
  `jetbrains/`); asserts that `setup-files.json` equals the `writes` of `build/conformance/setup-expected.json` (paths and
  bytes as T-018 records them) and that no request left the IDE (the fake answered all three routes).
- **Tests first:** `SetupIdeTest` red on CI run 1.
- **Verify:** `CI: jetbrains.yml › ide-tests` green on ubuntu, windows, macos.
- [ ] **Verified (T-041):** —
- **Notes:** —

### T-040 — No JCEF in a real IDE: unsupported and suspended (appended 2026-11-21, G1 decision 3)

- **Covers:** AC-030
- **Files:** `<pkg>/probe/NoJcefProbe.kt`, `<pkg>/probe/ProbeAutoRun.kt`, `<it>/NoJcefIdeTest.kt`,
  `jetbrains/build.gradle.kts`, `.github/workflows/jetbrains.yml`
- **Do:** Harness per *Contracts › Starter harness*. `NoJcefProbe` (`featherspec.probe=nojcef`; `ProbeAutoRun` waits
  for `Unavailable` instead of `Ready`, ≤ 60 s): records the state kind, the tool window content's class name and
  empty-text lines, the status widget's text (`WindowManager.getInstance().getStatusBar(project).getWidget(
  "featherspec.studio.status")`), the balloons (subscribe `Notifications.TOPIC`) after running Open, Copy Next Step and
  Set up FeatherSpec through `ActionManager.getInstance().getAction(id)` and `ActionUtil.invokeAction(action,
  SimpleDataContext.getProjectContext(project), "FeatherSpecProbe", null, null)`, and whether
  `StudioConfigurable().createComponent()` returns a component; writes `<out>/nojcef.json`. `NoJcefIdeTest` runs only
  when `featherspec.nojcef` is `unsupported` or `suspended` (`Assumptions.assumeTrue`); `unsupported` adds
  `ide.browser.jcef.enabled=false` to the VM options. Asserts: the expected `Unavailable` kind; the notice instead of the
  tree with the reason and *Open help*; the status text `JETBRAINS_TEXTS.statusUnavailable`; three balloons with the
  reason and *Open help*; the settings component exists; no `ERROR` or `SEVERE` line naming `featherspec` in the run's
  `idea.log` (found under `out/ide-tests`, as the spike workflow finds it). Workflow `ide-tests`: two more Linux
  entries via `include:` — `nojcef: unsupported`, and `nojcef: suspended`, which skips the `sysctl` step so Ubuntu's
  AppArmor restriction suspends JCEF (ADR-004 S-2); both run `xvfb-run -a gradle -p jetbrains integrationTest --tests
  '*NoJcefIdeTest' -Pfeatherspec.nojcef=<entry>`; the `integrationTest` task forwards it with
  `systemProperty("featherspec.nojcef", providers.gradleProperty("featherspec.nojcef").getOrElse(""))`. If `ide.browser.jcef.enabled=false` does
  not make `JBCefApp.isSupported()` false, record it in Notes: then `JcefAvailabilityTest` (T-029) and AC-042 (manual)
  decide the unsupported branch.
- **Tests first:** `NoJcefIdeTest` red on CI run 1 (no probe yet).
- **Verify:** `CI: jetbrains.yml › ide-tests` green on both no-JCEF entries (ubuntu).
- [ ] **Verified (T-040):** —
- **Notes:** —

### T-035 — Starter smoke on three OS

- **Covers:** AC-007 (loading state and frame ≤ 1 s, freshness ≤ 500 ms), AC-008, AC-013, AC-020, AC-021, AC-025,
  AC-027, AC-028, AC-029
- **Files:** `<it>/StudioSmokeTest.kt`, `<it>/ThemeContrastTest.kt`, `<pkg>/theme/Contrast.kt`, `<test>/theme/ContrastTest.kt`,
  `<pkg>/probe/SmokeProbe.kt`, `<pkg>/probe/ProbeAutoRun.kt`
- **Do:** Harness per *Contracts › Starter harness* and T-022's `CoreIdeTest` (job `ide-tests` exists). `Contrast`
  (pure): WCAG relative luminance and ratio; contrast table pairs (panel text, secondary text, link, button text on
  their backgrounds; focus outline) → ≥ 4.5 / ≥ 3.0. `SmokeProbe` (`featherspec.probe=smoke`; `ProbeAutoRun` starts it
  at once, not after `Ready`): (1) before `Ready`, opens the Studio tab (`FileEditorManager.getInstance(project)
  .openFile(service.studioFile, true)` on the EDT) and records ms until the loading panel shows; (2) after `Ready`,
  closes and reopens the tab and records ms to the first `panel` emit after `hello`; (3) closes the tab, writes
  `.specs/backlog/smoke-ext.md` with `Files.writeString` (external, no VFS) and records ms until the tree and status
  holders change; (4) changes a spec inside the IDE (`WriteAction.runAndWait` + `VfsUtil.saveText`) and records ms
  from the VFS event to the tree, status and panel update; (5) reopens (area and selection restored); (6) for Light,
  Darcula, High Contrast, Islands Light, Islands Dark: `LafManager.getInstance().setCurrentLookAndFeel(theme, false)` +
  `updateUI()` on the EDT, records the body class, the mapped values and ms until the panel shows them; (7) lists the
  files under the project dir with mtimes before and after (`.idea/` is the IDE's own and excluded). Writes
  `<out>/smoke.json`. `StudioSmokeTest` (fixture copy of `studio-0015`): loading ≤ 1,000 ms and frame ≤ 1,000 ms
  (AC-007); external change ≤ 2,000 ms (AC-021) on ubuntu, windows **and macos** — the IDE's own watcher needed
  13,987 ms on macOS in S-4; a miss stops the plan: report the measured value to Gregor, never loosen the budget;
  in-IDE change ≤ 500 ms; area and selection restored; no project file created or changed except the test's own writes
  (AC-025). `ThemeContrastTest`: per theme the body class and the `Contrast` pairs; a switch while open shows the new
  values within 500 ms in one `executeJavaScript` (no mixed frame, AC-028). `ContrastTest`: known pairs (black/white =
  21, equal = 1).
- **Tests first:** `ContrastTest` red; smoke tests red on the first CI run.
- **Verify:** `CI: jetbrains.yml › ide-tests` green on ubuntu, windows, macos (a UI-permission failure on windows or
  macos goes into Notes with its log excerpt; AC-021 on macOS is not waived), `› plugin` green.
- [ ] **Verified (T-035):** —
- **Notes:** Re-planned 2026-11-21 for V2 and the T-006 lessons (no Driver UI API; probe via `ProbeAutoRun`).

### T-036 — Plugin Verifier, manifest, ZIP size and webview byte identity

- **Covers:** AC-014 (bytes), AC-033, AC-034, AC-035 (size, no key in the repo, no GraalJS)
- **Files:** `jetbrains/build.gradle.kts`, `.github/workflows/jetbrains.yml`, `jetbrains/guards/pluginZip.mjs`, `jetbrains/guards/pluginZip.test.mjs`
- **Do:** `pluginVerification { ides { recommended(); create(IntelliJPlatformType.IntellijIdea, "2025.3.1");
  create(IntelliJPlatformType.WebStorm, "2025.3.1"); create(IntelliJPlatformType.Rider, "2025.3.1");
  create(IntelliJPlatformType.PyCharm, "2025.3.1"); the same four at "2026.3" } }` (type names per the Gradle plugin's
  `IntelliJPlatformType` enum; fix in Notes if they differ). Job `verify` (ubuntu, matrix over product so each job
  downloads at most two IDEs; free disk first), `gradle -p jetbrains verifyPlugin -Pverify.product=<p>`.
  `pluginZip.mjs` (ubuntu, after `buildPlugin`): ZIP ≤ 60 MB; SHA-256 of the `webview/main.js` and `main.css` inside
  the plugin JAR equal `dist/webview/*` of the same `npm run package`; no GraalJS in the ZIP (no entry and no JAR name
  matching `graal|truffle|polyglot|icu4j`, ADR-004); plugin.xml check of T-001 moved here; a scan of
  the repo tree for PEM headers and `PUBLISH_TOKEN=`-style assignments finds nothing. `node:test` for its pure parts.
- **Tests first:** `pluginZip.test.mjs` red.
- **Verify:** `local: node --test 'jetbrains/guards/*.test.mjs'`; `CI: jetbrains.yml › verify` (all products) and `› plugin` green.
- [ ] **Verified (T-036):** —
- **Notes:** —

### T-037 — Docs sync, spike removal and the final gate run

- **Covers:** AC-042 (checklist section), AC-043, every criterion the gates re-prove (AC-001–AC-031, AC-033–AC-035,
  AC-037–AC-039)
- **Files:** `README.md`, `docs/release-checklist.md`, `.architecture/jetbrains.md`, `.architecture/adapters.md`, `AGENTS.md`
  (snapshot), `jetbrains/AGENTS.md`, `.memory-bank/techContext.md`, `.memory-bank/systemPatterns.md`,
  `.memory-bank/activeContext.md`, `jetbrains/spikes/**` (delete), `.github/workflows/jetbrains-spikes.yml` (delete),
  `CHANGELOG.md` (JetBrains section)
- **Do:** README: a *JetBrains IDEs* section, heading exactly `## JetBrains IDEs` (the anchor `#jetbrains-ides` is
  `JETBRAINS_TEXTS.helpUrl`): install from disk/Marketplace once 0036 ships, supported IDEs = every IntelliJ-based IDE
  from 2025.3.1, Rider and WebStorm tested, Copy prompt as the default, local only, no split mode, and *Without the
  embedded browser* (JCEF not supported, or suspended by the OS sandbox, e.g. AppArmor on Ubuntu 24.04+: only the
  settings page works; the IDE's own *Embedded Browser is suspended* notification offers the fix).
  Release checklist: a *JetBrains (manual)* section listing AC-040, AC-041, AC-042 with their steps. `.architecture/
  jetbrains.md` final (≤ 40 lines); `adapters.md` one line for `parity.ts`. Snapshot entries — confirm or reconcile
  exactly these (added in T-002, T-012, T-017): the `jetbrains/` module line, the `src/hosts` module line, the
  `src/hosts/embedded/global.ts` entrypoint line; add to `boundaries:` exactly `'src/hosts never imports vscode;
  src/hosts/embedded imports no Node.js built-in (it runs in a browser page); src/core is shared unchanged by both
  hosts'`;
  `shared:` append `the host vocabulary (vocabulary.ts, 0034)` to the `src/shared/protocol` line; `# last reconciled:`
  date. Memory Bank: techContext (JetBrains jobs, how to read CI), systemPatterns (bridge, vocabulary, store keys),
  activeContext (stage state). Delete the spike folder and workflow (created by this plan) — the last GraalJS code;
  the GraalJS mentions in `AGENTS.md`, `jetbrains/AGENTS.md` and `.architecture/jetbrains.md` were replaced on
  2026-11-21 (G1), so `grep -rniE 'graal|truffle|polyglot'` outside `.specs/`, `docs/decisions/`, `node_modules/` and
  `jetbrains/guards/pluginZip*.mjs` (T-036's own check) must find nothing. Then run every gate.
- **Tests first:** — (docs; gates decide)
- **Verify:** `local:` five gates incl. `npm run compile`, `node --test jetbrains/guards/ jetbrains/scripts/`,
  `npx vitest run src/adapters/node/docsScan.test.ts src/adapters/node/parity.test.ts`, the `grep` above empty; `CI:`
  every job of `jetbrains.yml` green on one commit.
- [ ] **Verified (T-037):** —
- **Notes:** —

### T-042 — Harden the rendered-text guard (G3 review findings 1–2, appended 2026-11-21)

- **Covers:** AC-039
- **Files:** `jetbrains/guards/renderedTexts.mjs`, `jetbrains/guards/renderedTexts.test.mjs`
- **Do:** (1) one pass per fixture that renders its real shell state (S1–S9 as the shell service would produce it for that fixture) with and without the S7 restricted note, compared start vs head; (2) fail when an area's rendered text equals the loading text (a view the webview rejected silently must not count as compared). Negative controls for both.
- **Tests first:** the two negative controls red, then green.
- **Verify:** `local: node --test 'jetbrains/guards/*.test.mjs'`; `CI: jetbrains.yml › shared-guard` green.
- [x] **Verified (T-042):** 2026-11-21 · red first for the loading-text check (pass 7 fail 1), then green · state check and restricted variant fail when disabled (mutation, restored) · `node --test 'jetbrains/guards/*.test.mjs'` 41/41 · `node --test jetbrains/scripts/*.test.mjs` 4/4 · `npm run test:unit` exit 0 (4019) · eslint, tsc ×2 exit 0 · `renderedTexts.mjs` against `3bc615c`: identical in 450 areas (shell 52, board 38, overview 38, planMap 180, detail 142), exit 0. Deviation: part (1) code before its tests; covered by the mutation-checked negative controls.
- **Notes:** (1) `src/hosts/embedded/conformance.ts` gains `shell: studio.service.view()` in the conformance output (orchestrator-approved scope extension; no test pins the key set; `src/core` unchanged). (2) The state check reports only a mismatch between a rendered `section.panel-state` and the shell view's state: S2 (nested-project, not-fs-*) and S9 (incomplete-*) are legitimate. (3) The loading-text check overlaps the S4 panel-state rule; it adds coverage for loading text rendered as area content.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-010, T-011 | `src/adapters/node/parity.ts`, `docs/jetbrains/parity-source.json`, `docs/jetbrains/parity.md` | `src/adapters/node/parity.test.ts` (`AC-001: …`) | verified (local 2026-11-21: 20 passed, 0 todo, T-011) |
| AC-002 | T-010 | `src/adapters/node/parity.ts:checkRows`, `:renderMarkdown`, `:collectCriteria` | `src/adapters/node/parity.test.ts` (`AC-002: …`, one negative control per failure kind) | verified (local 2026-11-21, T-010/T-011; no red run against the stubs, T-010 Notes) |
| AC-003 | T-010, T-011 | `docs/jetbrains/parity-source.json` (0008–0012 `default` n-a), `docs/product/product-decisions.md` (PD-099…PD-107) | `src/adapters/node/parity.test.ts` (`AC-003: …`, `bad-pd`, `struck-not-na`) | verified (local 2026-11-21, T-011); PD-099…PD-107 wording for Gregor's review |
| AC-004 | T-018, T-019, T-022 | TS: `src/hosts/embedded/conformance.ts:runConformance`, `src/hosts/embedded/main.ts` (`conformance`), `src/hosts/embedded/testing/conformanceInput.ts`, `jetbrains/scripts/conformanceExpected.mjs` | `src/hosts/embedded/conformance.test.ts` (`AC-004: …`), `jetbrains/scripts/conformanceExpected.test.mjs` | open — TS oracle verified (local 2026-11-21 at 727f708: `src/hosts/` 77/77, scripts 4/4); JVM equality in a Starter IDE is T-022 |
| AC-005 | T-018, T-019, T-022, T-033, T-034, T-041 | TS: `src/hosts/embedded/conformance.ts:runSetupConformance`, `src/hosts/embedded/main.ts` (`setupConformance`), `jetbrains/scripts/conformanceExpected.mjs` (setup pair) | `src/hosts/embedded/conformance.test.ts` (`AC-005: …`), `jetbrains/scripts/conformanceExpected.test.mjs` (`AC-005 …`) | open — TS oracle verified (local 2026-11-21 at 727f708); archive reader, setup target and the IDE run are T-022, T-033, T-034, T-041 |
| AC-006 | T-012, T-015, T-017, T-020, T-021 | `src/hosts/compose.ts`, `src/hosts/embedded/contract.ts`, `bridge.ts`, `ports.ts`, `global.ts`, `esbuild.js` (`embeddedBuildOptions`), `.github/workflows/jetbrains.yml › shared-guard` (`git diff --exit-code $START_COMMIT -- src/core`) | `src/hosts/embedded/bundle.test.ts` (`AC-006: …`), `bridge.test.ts`, `ports.test.ts`, `jetbrains/guards/sharedGuard.test.mjs`; CI `shared-guard` | open — TS side verified (local; CI `shared-guard` at `017a790`, run 44863599799; CI for 727f708 pending); Kotlin mirror `HostContract.kt` is T-021 |
| AC-007 | T-022, T-026, T-028, T-030, T-035 | — | — | open |
| AC-008 | T-016, T-039, T-025, T-035 | TS: `src/hosts/embedded/main.ts:createEmbeddedHost` | `src/hosts/embedded/main.test.ts` (`AC-008: …`) | open — TS part verified (local 2026-11-21, T-016); core page, project service and smoke are T-039, T-025, T-035 |
| AC-009 | T-003…T-008, T-038 | `docs/decisions/ADR-004-jetbrains-host.md`, `docs/decisions/adr-004/`; spikes under `jetbrains/spikes/` (removed in T-037) | CI `jetbrains-spikes.yml` runs 44835557884, 44844442596, 44846550133; manual: Gregor's decision 2026-11-21 | verified |
| AC-010 | T-028 | — | — | open |
| AC-011 | T-028, T-029 | — | — | open |
| AC-012 | T-028 | — | — | open |
| AC-013 | T-026, T-029, T-035 | — | — | open |
| AC-014 | T-013, T-026, T-036 | `src/hosts/panelSession.ts:createPanelSession`, `src/adapters/vscode/studioPanel.ts` | `src/hosts/panelSession.test.ts` | open — VS Code sequence preserved and verified (local; CI `vscode-mirror` at `375fdaa`, run 44857188233, T-013); JCEF tab and byte identity are T-026, T-036 |
| AC-015 | T-021, T-026 | — | — | open |
| AC-016 | T-030 | — | — | open |
| AC-017 | T-029 | — | — | open |
| AC-018 | T-032 | — | — | open |
| AC-019 | T-014, T-016, T-025, T-032 | TS: `src/shared/protocol/vocabulary.ts`, `src/webview/hostKind.ts`, `src/webview/RestrictedNote.tsx`, `src/webview/PanelStateView.tsx`, `src/adapters/vscode/webviewHtml.ts` (`host`), `src/hosts/embedded/terms.ts`, `src/hosts/embedded/main.ts` | `src/shared/protocol/vocabulary.test.ts`, `src/webview/hostVocabulary.test.tsx`, `src/hosts/embedded/terms.test.ts`, `src/hosts/embedded/main.test.ts` (`AC-019: …`) | open — TS part verified (local 2026-11-21, T-014, T-016); project service and trust are T-025, T-032 |
| AC-020 | T-023, T-035 | — | — | open |
| AC-021 | T-007, T-023, T-035 | input only: `docs/decisions/ADR-004-jetbrains-host.md` (S-4 delays, T-007) | — | open |
| AC-022 | T-033, T-034, T-041 | — | — | open |
| AC-023 | T-016, T-031 | TS: `src/hosts/embedded/terms.ts:withTerms`, `src/hosts/embedded/main.ts` | `src/hosts/embedded/terms.test.ts` (`AC-023: …`), `src/hosts/embedded/main.test.ts` (`§6.8, AC-023: …`) | open — TS part verified (local 2026-11-21, T-016); IDE notifications and log view are T-031 |
| AC-024 | T-030 | — | — | open |
| AC-025 | T-024, T-035 | — | — | open |
| AC-026 | T-027 | — | — | open |
| AC-027 | T-027, T-035 | — | — | open |
| AC-028 | T-027, T-035 | — | — | open |
| AC-029 | T-035 | — | — | open |
| AC-030 | T-014, T-029, T-030, T-032, T-040 | TS: `src/shared/protocol/vocabulary.ts:JETBRAINS_TEXTS` | `src/shared/protocol/vocabulary.test.ts` (`AC-030: …`), `src/webview/hostVocabulary.test.tsx` | open — texts verified (local 2026-11-21, T-014; wording for Gregor's review); notice, status, actions and IDE run are T-029, T-030, T-032, T-040 |
| AC-031 | T-016, T-025, T-032 | TS: `src/hosts/embedded/ports.ts` (`assistantHost.extension` → `undefined`), `src/hosts/embedded/main.ts` | `src/hosts/embedded/main.test.ts` (`AC-031: …`) | open — TS part verified (local 2026-11-21, T-016); settings page is T-032 |
| AC-032 | — (moved to 0035, OP-024) | — | — | n-a here |
| AC-033 | T-001, T-036 | `jetbrains/src/main/resources/META-INF/plugin.xml`, `jetbrains/build.gradle.kts` (T-001) | CI `jetbrains.yml › plugin` plugin.xml check (`6fdc067`, run 44832785218) | open — manifest part verified (T-001); Verifier and manifest checks are T-036 |
| AC-034 | T-036 | — | — | open |
| AC-035 | T-036 (size, no key, no GraalJS; signing → 0036) | — | — | open |
| AC-036 | — (moved to 0036, OP-024) | — | — | n-a here |
| AC-037 | T-001, T-009 | `.vscodeignore`, `jetbrains/guards/vsixFiles.mjs`, `jetbrains/guards/vsix-files.txt`, `.github/workflows/jetbrains.yml › vscode-guards` | `jetbrains/guards/vsixFiles.test.mjs` (`AC-037 …`, negative controls), `vsixFiles.mjs --self-test`; CI `vscode-guards` | verified (local; CI at `cb9cd22`, run 44853085024, and every later run) |
| AC-038 | T-009, T-017 | `jetbrains/guards/sameBundles.mjs:isJetBrainsOnly`, `:compareDigests`, `.github/workflows/jetbrains.yml › vscode-guards` (byte check of the parent commit), `esbuild.js` (third target isolated) | `jetbrains/guards/sameBundles.test.mjs` (`AC-038 …`), `src/hosts/embedded/bundle.test.ts` (`AC-006: dist/extension.js equals …`); CI `vscode-guards` | built — guards green locally (2026-11-21 at 727f708: guards 35/35); no recorded CI run of the byte comparison on a JetBrains-only push yet (before 727f708 every plan tick made a push count as shared); CI for 727f708 pending |
| AC-039 | T-009, T-012, T-013, T-014, T-020 | `jetbrains/guards/sharedGuard.mjs`, `jetbrains/guards/renderedTexts.mjs`, `.github/workflows/jetbrains.yml › shared-guard`, `› vscode-mirror`, `› vscode-guards` (`ci.yml`/`publish.yml` unchanged) | `jetbrains/guards/sharedGuard.test.mjs`, `jetbrains/guards/renderedTexts.test.mjs`, `jetbrains/guards/sameBundles.test.mjs` (`AC-039 …`), `src/shared/protocol/vocabulary.test.ts`, `src/adapters/node/vocabularySources.test.ts`; CI `shared-guard`, `vscode-mirror` incl. `npm test` (ubuntu, windows) | verified (CI at `017a790`, run 44863599799); G3 fix round 727f708 (199 areas) green locally, CI pending |
| AC-040 | manual: Gregor, Rider | — | — | open |
| AC-041 | manual: Gregor, WebStorm | — | — | open |
| AC-042 | T-037 (checklist section); manual: Gregor | — | — | open |
| AC-043 | T-002, T-037 | `.architecture/jetbrains.md`, `AGENTS.md` (`jetbrains/` module line T-002, `src/hosts/embedded/global.ts` entrypoint line T-017) | `src/adapters/node/docsScan.test.ts` | open — T-002 part verified (docsScan 186); README section and final sync are T-037 |

## Session handoff

- **Done so far:** stages 1–6 done (T-001…T-020, T-038; every box ticked with `Verified:`). G1 passed 2026-11-21
  (Gregor accepted ADR-004: runtime V2, hidden off-screen JCEF browser per IDE project; core ready ≤ 12 s; without JCEF
  only the settings page works; Copy prompt only, Claude Code deep link → 0035; spec OP-025; plan re-planned, 41
  steps). G2 passed 2026-11-21 (CI `vscode-mirror`, `vscode-guards`, `plugin` green at `cb9cd22`; `.vsix` list equals
  the snapshot; `"pending": []`). Stages 4–6 verified locally and in CI (`fa60f87`, `375fdaa`, `017a790`), architecture
  update `c11e22d` (`.architecture/hosts.md`). G3: an independent scoped `/sdd-compile` (2026-11-21) found gaps; the fix
  round is done in `727f708` (Overview in the conformance output, synthetic `AGENTS.md` for the weak inputs, rendered-text
  guard over 199 areas and failing on panel states, neutral paths for AC-038, `src/hosts/noNetwork.test.ts`; Notes of
  T-009, T-018, T-019, T-020), and B3 (stale bookkeeping) is reconciled here. Local re-run at `727f708` (2026-11-21):
  `npx vitest run src/hosts/` 77/77, `node --test 'jetbrains/guards/*.test.mjs'` 35/35,
  `node --test 'jetbrains/scripts/*.test.mjs'` 4/4.
- **Next action:** (1) CI for `727f708` (and the push of this reconciliation): every job of `jetbrains.yml` green —
  pending. (2) A fresh independent `/sdd-compile` of 0034 in a new session — READY closes G3. (3) Then stage 7 in this
  order: T-021 → T-039 → T-023 → T-024 → T-025 → T-022 (Kotlin; `CI:` verify, the orchestrator pushes).
- **Open decisions for Gregor** (proxy decisions the orchestrator took so far; each stands until Gregor confirms or
  overrides): (1) T-002: the `jetbrains/` snapshot line in `AGENTS.md` shortened to fit the 15000-byte cap. (2) T-010:
  option (a) — of two bullets with the same AC ID the bold `**AC-nnn**` one is the criterion, else the first. (3) T-011:
  the categorisation judgement calls (0001 folder set → PD-103; manifest keys with a JetBrains counterpart → host;
  Send → PD-105; Escape → shared-test). (4) T-016: `openFolder` stays rejected in the embedded host (no
  `actions.openFolder`; S1 is n-a). (5) PD-099…PD-107: wording written from the plan lines, to review. (6) T-014:
  `JETBRAINS_TEXTS` wording (proposal). (7) `AGENTS.md` is at 14998 of 15000 bytes, so T-037's planned `boundaries:`
  line no longer fits — options: raise the docsScan cap, or move more snapshot detail into the module maps. (8) "Another
  model family" for the independent compile (G3, G4, plans.md) is not available in this environment — Claude models
  only; accept a fresh Claude session, or run it elsewhere. Still open from before: whether to split further (41 steps
  vs. the ~30 guideline); R-5's 12 s re-measured at AC-040/AC-041; if T-035 measures AC-021 above 2 s on macOS, native
  watcher or a PD. Red-first not evidenced for T-004 and T-010 (Notes) — recorded, no action planned.
- **Baseline:** `3bc615c` (last commit before this spec's work; `START_COMMIT` in `.github/workflows/jetbrains.yml`)
- **Environment:** every Gradle/Kotlin/JVM/IDE check runs only in GitHub Actions (`jetbrains.yml`,
  `jetbrains-spikes.yml`); the sandbox has no Maven/Gradle/JetBrains access (proxy 403). `ci.yml` does not run on
  branch pushes — `vscode-mirror` is its stand-in until the PR.
