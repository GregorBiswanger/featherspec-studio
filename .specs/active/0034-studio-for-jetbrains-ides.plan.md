# Plan — FeatherSpec Studio for JetBrains IDEs

**Spec:** [0034-studio-for-jetbrains-ides.md](0034-studio-for-jetbrains-ides.md)
**Status:** In Progress
**Last updated:** 2026-11-20
**Current step:** T-001

## Approach

Spikes first (G1), then guards and the parity matrix (G2), then the shared TypeScript changes under the strictest gate
(G3), then the Kotlin host, then packaging (G4). The shared core runs unchanged as one esbuild bundle
(`dist/embedded/core.js`) in GraalJS inside the IDE (hypothesis V1; ADR-004 decides at G1), behind a JSON bridge; the
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
  `npx tsc --noEmit`) — scripts outside `src/` are plain `.mjs`; no new npm dependency (polyfills and shims are written
  by hand). Kotlin: logic in pure classes with no `com.intellij` import, tested by plain JUnit 5; platform glue thin and
  covered by the Starter smoke (T-035). Kotlin root package `com.gregorbiswanger.featherspec.studio`; paths below use
  `<pkg>/` = `jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/`, `<test>/` =
  `jetbrains/src/test/kotlin/com/gregorbiswanger/featherspec/studio/`, `<it>/` =
  `jetbrains/src/integrationTest/kotlin/com/gregorbiswanger/featherspec/studio/`.
- A step that writes Markdown under `docs/`, `.architecture/`, `README.md` or `AGENTS.md` also runs
  `npx vitest run src/adapters/node/docsScan.test.ts` (it scans product docs and module maps).

**Dependencies to approve (Ask first, one yes before T-001):** Gradle 9.7.0 (CI only, no wrapper JAR is committed —
the implementer cannot write a binary; CI uses `gradle/actions/setup-gradle@v6` with `gradle-version: 9.7.0`);
`org.jetbrains.intellij.platform` 2.20.1; Kotlin JVM plugin 2.4.21 with `languageVersion`/`apiVersion` 2.2 (stdlib of
2025.3 is 2.2.20; `kotlin.stdlib.default.dependency=false`); JUnit Jupiter 5.13.4 (+ `junit-platform-launcher`);
`org.graalvm.polyglot:polyglot` and `org.graalvm.polyglot:js` (type pom) 25.0.4 (T-004, T-021); Starter/Driver via
`testFramework(TestFrameworkType.Starter)`, `org.kodein.di:kodein-di-jvm` 7.20.2, `kotlinx-coroutines-core-jvm` 1.10.1
in the `integrationTest` source set only (T-006). No new npm package. Approved by Gregor 2026-11-20.

### Contracts later steps rely on

**Bridge (TS `src/hosts/embedded/contract.ts`, T-016; Kotlin mirror `<pkg>/runtime/HostContract.kt`, T-021).** All
values cross as JSON strings; bytes as base64. Kotlin installs global `__featherspecHost` with
`call(name, argsJson): string` (sync, returns `{"ok":…}` or `{"error":"…"}`), `callAsync(name, argsJson, id)`,
`emit(channel, payloadJson)`, `setTimer(id, ms)`, `clearTimer(id)`. The bundle defines global `FeatherSpecHost` with
`start(configJson)`, `resolve(id, resultJson)`, `fire(id)`, `dispatch(event, payloadJson)`, `invoke(command, argsJson)`
(returns a Promise of a JSON string) and `conformance(…)` (T-019). Every JS entry runs on one Kotlin thread.
- sync `call`: `settings.read`, `trust.isTrusted`, `folders.list`, `memory.get`, `assistant.extension` (always `null`
  in 0034).
- async `callAsync`: `source.list|stat|readBytes`, `fs.stat|readText|readDirectory`,
  `medium.open|read|lines|append|replace|createExclusive|remove|list`, `memory.set`,
  `target.kind|readBytes|listDirectory|createExclusive|replaceIfUnchanged|clearSetupFolder`, `http.get`,
  `archive.read`, `ui.pick|notify|confirm|progressStart|openExternal`, `clipboard.write`, `editor.open`,
  `actions.openSetupGuide|manageTrust|openStudio|reloadPanel`.
- `emit` channels: `panel` (one envelope), `tree` (spec tree model), `status` (status entry view or `null`), `log`
  (lines), `warn` (text), `progressEnd` (id), `showOutput`.
- `dispatch` events: `panelMessage`, `panelOpened`, `panelClosed`, `fileChanged {root, path}`, `markerChanged {root}`,
  `foldersChanged`, `trustGranted`, `settingsChanged {key}`, `progressCancelled {id}`.
- `invoke` commands: `open {via, area?}`, `refresh`, `copyNextStep`, `setup`, `copyMergePrompt`, `selectProject`,
  `shellAction {action}`, `tree.select|copy|openSpec|openPlan|showInPlanMap {row}`,
  `panelHtml {nonce, cspSource, scriptUri, styleUri, reloaded}`.

**Roots** are file URIs written exactly as VS Code's `Uri.file(p).toString()` (`C:\projects\test` →
`file:///c%3A/projects/test`, `/home/u/a b` → `file:///home/u/a%20b`), so the core's root identity and display rules
hold unchanged (T-023 `FileUris`).

**JCEF panel (S-2, T-005, T-026).** Origin `https://studio.featherspec.invalid/` served by a `CefRequestHandler` /
`CefResourceRequestHandler` (reference: platform `JCefImageViewer`); every other URL is cancelled (AC-015). The HTML is
`buildWebviewHtml` (via `invoke('panelHtml')`, so the CSP is the VS Code one with `cspSource` = the origin) plus two
tags with the same nonce/origin inserted after `<div id="root"></div>`: a `theme.css` link before `main.css` is loaded
first (theme before first paint; CSP forbids inline styles) and a nonce'd shim script defining `acquireVsCodeApi` over a
`JBCefJSQuery` and setting the body class. Host → panel: `cefBrowser.executeJavaScript("window.postMessage(" + json +
",'*')", origin, 0)`. Live theme switch: one `executeJavaScript` that sets every variable through
`document.documentElement.style.setProperty` and swaps the body class in the same task (no mixed frame, AC-028).

**Host vocabulary (§6.8, T-015, T-017).** One table in `src/shared/protocol/vocabulary.ts`: pairs of exact VS Code
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
Assistant causes with extension IDs stay n-a while no handover exists (0035).

**Quality gates:** local — `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` ·
`npm run test:unit` · `npm run compile` (steps touching wiring, adapters, `src/extension.ts`, `esbuild.js`,
`package.json` or a bundle) · `node --test jetbrains/guards/` (from T-009) ; CI (`.github/workflows/jetbrains.yml`) —
`plugin` (Ubuntu, Windows, macOS: Gradle `build buildPlugin verifyPluginStructure`, JUnit incl. conformance from
T-022), `vscode-mirror` (Ubuntu, Windows: exactly `ci.yml`'s steps incl. `npm test`; `ci.yml` itself only runs on
`main` and on PRs), `vscode-guards` (AC-037, AC-038, workflows unchanged), `shared-guard` (AC-039, AC-006, from T-020),
`ide-smoke` (Starter, 3 OS, from T-035), `verify` (Plugin Verifier, from T-036); `jetbrains-spikes.yml` — `spike-s1`,
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

## Stages

1. T-001 → T-002 — JetBrains build skeleton, CI workflow, context hygiene. Gate: CI `plugin` green on 3 OS; local
   `npx vitest run src/adapters/node/docsScan.test.ts` and `npm run test:unit` green.
2. T-003 → T-004 → T-005 → T-006 → T-007 → T-008 — spikes S-1, S-2, S-4, S-3 table, ADR-004. **Gate G1:** CI
   `spike-s1` (3 OS), `spike-ide` and `plugin` green; local gates green (no `src/` change); ADR-004 records R-1…R-6 per
   candidate, the S-2 screenshots (Light, Darcula, High Contrast), S-3 and S-4; **Gregor's decision stands in ADR-004
   (AC-009) — no later stage starts before it.** If S-1 V1 misses R-1…R-6, the orchestrator appends T-038 (V2 hidden
   JCEF spike, same shape as T-004) before T-008.
3. T-009 ‖ T-010, then T-011 — VS Code guards, parity generator, categorisation. **Gate G2:** local gates incl.
   `npm run compile` and `node --test jetbrains/guards/`; CI `plugin`, `vscode-mirror`, `vscode-guards` green; `.vsix`
   list identical to the snapshot (AC-037); `docs/jetbrains/parity-source.json` has `"pending": []`.
4. T-012 → T-013 — host-neutral composition and panel session (VS Code behaviour unchanged). Gate: five local gates
   incl. `npm run compile`; `git diff --exit-code <Baseline> -- src/core` empty; CI `vscode-mirror`, `vscode-guards`,
   `plugin` green.
5. T-014 ‖ T-015 — independent: vocabulary (shared + webview) and the embedded bridge client (separate files and
   tests; T-015 alone edits `eslint.config.mjs`). Gate: the five local gates on the combined tree; CI as stage 4.
6. T-016 → T-017 → T-018 → T-019 → T-020 — embedded entry, bundle, conformance oracle, shared-change guard.
   **Gate G3 (after T-020):** all local gates incl. `npm run compile`; CI `vscode-mirror` (incl. `npm test` on Ubuntu
   and Windows), `vscode-guards`, `shared-guard`, `plugin` green; baselines and golden file unchanged, no new
   `EXCEPTIONS`; `src/core` unchanged; **an independent `/sdd-compile` READY** (orchestrator, fresh session, another
   model family) before stage 7 starts.
7. T-021 → T-022 → T-023 → T-024 → T-025 — runtime, JVM conformance, host ports, project service. Gate: local gates;
   CI `plugin` (incl. conformance + budgets on 3 OS), `vscode-*`, `shared-guard` green.
8. T-026 → T-027 — Studio tab and theme bridge. Gate: as stage 7, plus a CI-artifact ZIP Gregor may install by hand.
9. T-028 → T-029 → T-030 — tree, actions, status bar and editor. Gate: as stage 7.
10. T-031 → T-032 → T-033 → T-034 — notifications and log view, settings and trust, setup. Gate: as stage 7.
11. T-035 — Starter smoke on 3 OS. Gate: as stage 7 plus CI `ide-smoke` green.
12. T-036 → T-037 — Verifier and packaging checks, docs sync, spike removal, final gates. **Gate G4:** every local
    gate; every CI job (`plugin`, `vscode-mirror`, `vscode-guards`, `shared-guard`, `ide-smoke`, `verify`) green on the
    same commit; parity matrix fully categorised; `/sdd-compile` READY. Then Gregor: AC-040–AC-042.

Parallel: stage 3 (T-009 ‖ T-010: CI guards vs. parity tooling, disjoint files) and stage 5 (T-014 ‖ T-015). Stage 4
and stages 6–12 stay `→`: the Kotlin steps share `plugin.xml` and the host router (`StudioProjectService`), the TS
entry steps share `src/hosts/embedded/main.ts`.

Manual-only, not implementer steps (last open evidence): AC-040 (Rider), AC-041 (WebStorm), AC-042 (keyboard, screen
reader, JCEF off) by Gregor on a fresh `C:\projects\test\tip-splitter` with the ZIP from the CI artifact; Gregor's G1
decision in ADR-004; Marketplace vendor, certificate, secrets and first upload belong to 0036.

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
- [ ] **Verified (T-006):** —
- **Notes:** Implementer (2026-11-20, uncommitted, no Gradle/Kotlin run; brackets and YAML checked locally). Deviations: (1) `SpikeResources.kt` (`/theme.css` now served by `SpikeTheme.css()`, was empty), `SpikePanel.kt` (body class from `SpikeTheme.bodyClass()`, `JBColor` import removed) and `ide/src/main/resources/META-INF/plugin.xml` (action `FeatherSpecSpike.Probe` registered) changed beyond *Files*, because the Do needs them. (2) The probe reads `core-spike.js`, `studio-0015.json` and `studio-0015.expected.json` from plugin resources under `graal/`; `processResources` copies them from `build/` (produced by `check.mjs`), which the workflow runs first. "ok" means the GraalJS output equals the Node output byte for byte. (3) The output directory is not Starter's `system.out`: the test passes `-Dspike.out=<abs jetbrains/spikes/ide/build/spike-out>` as a VM option and reads the results there; the workflow uploads that directory. (4) Linux runs under `xvfb-run -a` (Robot needs a display); a step installs `xvfb`; the job's `continue-on-error` is set for Windows (the Do said Windows may fail). (5) The theme map is the implementer's: about 20 `--vscode-*` colours are mapped to IntelliJ UI keys (`UIManager.getColor`), every other colour falls back to grey `#808080`, font variables are fixed (`system-ui`, `monospace`, `13px`). Charts colours therefore show grey. (6) The `integrationTest` task is `intellijPlatformTesting.testIdeUi.registering` (as in the intro page), with `dependsOn(tasks.buildPlugin)`; `path.to.build.plugin` is the buildPlugin ZIP, and the test calls `installPluginFromDir` on it as the Do says. The docs do not show whether Starter accepts a ZIP here; if CI rejects it, the fix is `installPluginFromPath` or the exploded plugin directory. (7) The Starter names used are from the intro page: `Starter.newContext`, `TestCase`, `IdeInfo.IdeaUltimate`, `LocalProjectInfo`, `PluginConfigurator.installPluginFromDir`, `runIdeWithDriver`, `useDriverAndCloseIde`, `waitForIndicators`, `ideFrame { invokeAction(...) }` (import `com.intellij.driver.sdk.ui.components.ideFrame`, not confirmed). Not from the docs, unverified: `addVMOptionsPatch { addSystemProperty(...) }` (replaces the Do's "VM options" wording), `TestCase.withVersion`. (8) Platform API names not confirmed against a jar: `UIThemeLookAndFeelInfo.id/name/isDark`, `LafManager.currentUIThemeLookAndFeel`, `installedThemes`, `setCurrentLookAndFeel`, `updateUI`, `FileEditorManager.closeFile`, `java.awt.Frame.getFrames`. Theme picking uses name fragments "Light", "Darcula", "Contrast". (9) The workflow is the Do's job `spike-ide`, with the Gradle command `gradle -p jetbrains/spikes :ide:integrationTest` (no `buildPlugin` call of its own). (10) Red-first: no red run was made here (no CI); the orchestrator decides whether CI run 1 must be red before green. (11) Deps: GraalJS `org.graalvm.polyglot:polyglot` and `org.graalvm.polyglot:js` 25.0.4 as `implementation` in `ide`; Kodein, coroutines and JUnit as `integrationTestImplementation` (the plan's approved coordinates).
  Fix round 1: source set before configurations.getting; plain Test task with prepareSandbox per the integration-tests docs.
  Fix round 3: probe auto-runs via postStartupActivity when -Dspike.out is set; test uses only documented Starter APIs (IdeProductProvider.IU, applyVMOptionsPatch, waitForIndicators).

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
- [ ] **Verified (T-007):** —
- **Notes:** —

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
- [ ] **Verified (T-038):** —
- **Notes:** —

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
- [ ] **Verified (T-008):** —
- **Notes:** —

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
  `vscode-guards` (ubuntu, `fetch-depth: 0`): `node --test jetbrains/guards/`; `npm ci`; `npm run package`;
  `node jetbrains/guards/vsixFiles.mjs` and `--self-test`; `git diff --exit-code $START_COMMIT --
  .github/workflows/ci.yml .github/workflows/publish.yml`; for push events with `github.event.before` set: list changed
  paths `before..sha`; if `isJetBrainsOnly`, check out `before` into `base/` (`actions/checkout` with `ref` and
  `path`), `npm ci && npm run package` there, and run `sameBundles.mjs base .` (fail on any digest difference).
- **Tests first:** `node --test jetbrains/guards/` red (missing exports), then green.
- **Verify:** `local: node --test jetbrains/guards/`; `CI: jetbrains.yml › vscode-mirror` (ubuntu, windows) and
  `› vscode-guards` green.
- [ ] **Verified (T-009):** —
- **Notes:** —

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
- [ ] **Verified (T-010):** —
- **Notes:** —

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
- [ ] **Verified (T-011):** —
- **Notes:** —

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
- [ ] **Verified (T-012):** —
- **Notes:** —

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
- [ ] **Verified (T-013):** —
- **Notes:** —

### T-014 — Host vocabulary: one table, the webview reads the host

- **Covers:** §6.8, AC-019 (S7 note wording), AC-039 (VS Code texts unchanged)
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
  `<body>` only when given. Tests: vocabulary pure cases; `vocabularySources.test.ts` asserts every VS Code string of
  `TERM_PAIRS` occurs verbatim in `src/shared/protocol/texts.ts`, `src/core/setup/setupTexts.ts` or
  `src/core/runtime/notices.ts` (drift guard); webview: S7 and S2 render JetBrains strings with `data-host="jetbrains"`
  and the unchanged VS Code strings without it; HTML: unchanged output without `host` (existing test), attribute with
  it.
- **Tests first:** the three new test files red against `Not implemented` stubs.
- **Verify:** `local: npx vitest run src/shared/protocol/vocabulary.test.ts src/adapters/node/vocabularySources.test.ts
  src/webview/hostVocabulary.test.tsx src/adapters/vscode/webviewHtml.test.ts` green (own tests only, `‖` rule); the
  stage gate then runs the five gates incl. `npm run compile` on the combined tree (the webview bundle changes once —
  the expected shared change).
- [ ] **Verified (T-014):** —
- **Notes:** —

### T-015 — Embedded bridge client and the bridge contract

- **Covers:** AC-006 (no port signature change), R-3 (sync ports served synchronously)
- **Files:** `src/hosts/embedded/contract.ts`, `src/hosts/embedded/bridge.ts`, `src/hosts/embedded/bridge.test.ts`,
  `src/hosts/embedded/ports.ts`, `src/hosts/embedded/ports.test.ts`, `eslint.config.mjs`
- **Do:** `contract.ts`: string-literal unions and `as const` arrays of every name of *Contracts › Bridge*
  (`SYNC_CALLS`, `ASYNC_CALLS`, `EMIT_CHANNELS`, `DISPATCH_EVENTS`, `INVOKE_COMMANDS`) and `interface NativeHost {
  call(name, argsJson): string; callAsync(name, argsJson, id): void; emit(channel, payloadJson): void; setTimer(id, ms):
  void; clearTimer(id): void }`. `bridge.ts`: `createBridge(native)` → `{ call<T>(name, args): T` (throws on
  `{error}`), `callAsync<T>(name, args): Promise<T>`, `resolve(id, json)`, `setTimeout(cb, ms): Disposable`,
  `fire(id)`, `emit(channel, payload)` }; `toBase64/fromBase64` (hand-written, no `Buffer`/`atob`). `ports.ts`:
  `createEmbeddedPorts(bridge, config): Omit<HostPorts, 'panel' | 'openStore' | 'shellActions' | 'openStudio'>` —
  every member a thin proxy to one contract name (bytes base64, `AsyncIterable` bodies from one base64 chunk);
  `ClockPort.now()` = `new Date().toISOString()` in JS. ESLint: a block for `src/hosts/embedded/**/*.ts` banning
  `vscode` and every Node built-in (mirror the `src/shared` block). Tests: fake `NativeHost` in Node; sync call result
  and error; async resolve order; timer fire and dispose; base64 round trip on random bytes vs `Buffer`; each port
  proxy sends the expected name and args.
- **Tests first:** both test files red against stubs.
- **Verify:** `local: npx vitest run src/hosts/embedded/bridge.test.ts src/hosts/embedded/ports.test.ts` green (own
  tests only, `‖` rule); the stage gate runs the five gates on the combined tree.
- [ ] **Verified (T-015):** —
- **Notes:** —

### T-016 — Embedded entry: start, dispatch, invoke, panel, tree and status out, terms translated

- **Covers:** AC-008 (core runs without the tab), AC-019, AC-023 (texts), AC-031 (no offer), §6.8
- **Files:** `src/hosts/embedded/main.ts`, `src/hosts/embedded/terms.ts`, `src/hosts/embedded/main.test.ts`, `src/hosts/embedded/terms.test.ts`
- **Do:** `main.ts` exports `createEmbeddedHost(native)` → `{ start(configJson), resolve, fire, dispatch(event, json),
  invoke(command, json): Promise<string> }`: builds ports (T-015), `openStore` via `openRuntimeStore` from
  `src/core/runtime/runtimeStore` over a medium proxy (`medium.*` calls keyed by project root), `shellActions` and
  `openStudio` as `actions.*` calls, `panel` from `panelOpened/panelClosed` events; calls `composeStudio`; subscribes
  `treeService` → `emit('tree', model)`, status item port → `emit('status', view|null)`, output → `emit('log', lines)`;
  a `createPanelSession` (T-013) whose `post` emits `panel`; `dispatch` routes the events of the contract to the
  listeners the proxies registered; `invoke` runs the commands (mirror the command bodies of `extension.ts`;
  `panelHtml` = `buildWebviewHtml({...args, host: 'jetbrains', test: false})`). `assistant.extension` always
  `undefined` → offer none. `terms.ts`: `withTerms(ports)` wraps `ui`, `setupUi`, `stepUi`, `runtimeUi`, `output`, the
  tree model's `message`/action labels and the status tooltip with `translateTerms(…, 'jetbrains')`, mapping the chosen
  label back. Tests (Node, fake native host, memory spec source with a fixture): start → `tree` and `status` emitted
  without any panel; `panelMessage` hello → `panel` envelopes; an untrusted project → setup notification reads `Setting
  up FeatherSpec needs a trusted project.` with action `Trust Project`, choosing it calls `actions.manageTrust`; no
  emitted string of a full fixture run contains `workspace`, `Restricted Mode`, `VS Code` or `extension`
  (except spec content); no `Send` in emitted views.
- **Tests first:** `main.test.ts`, `terms.test.ts` red against stubs.
- **Verify:** `local: npx vitest run src/hosts/` green, then the four gates.
- [ ] **Verified (T-016):** —
- **Notes:** —

### T-017 — Embedded bundle: polyfills, path shim, third esbuild target

- **Covers:** R-1, R-6, AC-006, AC-038 precondition (`dist/extension.js` unchanged)
- **Files:** `src/hosts/embedded/polyfills.ts`, `src/hosts/embedded/polyfills.test.ts`, `src/hosts/embedded/pathPosix.ts`,
  `src/hosts/embedded/pathPosix.test.ts`, `src/hosts/embedded/global.ts`, `esbuild.js`, `src/hosts/embedded/bundle.test.ts`, `AGENTS.md` (snapshot)
- **Do:** Port the spike polyfills of T-003 to TS (`TextDecoder` incl. `fatal`/`ignoreBOM`/U+FFFD, `TextEncoder`,
  `AbortController`/`AbortSignal` with `aborted`, `addEventListener/removeEventListener('abort', l, {once})`, a WHATWG
  `URL` subset with `protocol`, `hostname`, `username`, `password`, `pathname`, `href`, relative resolution against an
  `https:` base, throwing on anything outside the tested subset — fails closed for `resolveAllowed`), installed only
  when missing; `pathPosix.ts` = T-003's shim. `global.ts`: assigns `globalThis.FeatherSpecHost` built from
  `createEmbeddedHost(globalThis.__featherspecHost)`. `esbuild.js`: a third context, entry `src/hosts/embedded/global.ts`,
  `format: 'iife'`, `platform: 'neutral'`, `target: 'es2022'`, `alias` `path`/`node:path` → `pathPosix.ts`, `inject`
  polyfills, `minify: production`, `outfile: 'dist/embedded/core.js'`; `hostBuildOptions` and the two existing contexts
  unchanged. Tests: polyfills vs Node natives on generated corpora (random bytes, overlong/surrogate sequences, BOM
  cases; URLs from the GitHub redirect shapes plus attack strings with `\`, `@`, `%2e`, userinfo); path shim vs
  `node:path`.posix on generated segments; `bundle.test.ts` runs `node esbuild.js`, loads `dist/embedded/core.js` in
  `vm.createContext({ __featherspecHost: fake })` (no Node globals), calls `start` and sees `tree` emitted; and checks
  `dist/extension.js` SHA-256 equals the digest of a build of the same commit without the third target (build both in
  the test via the esbuild API). Snapshot `entrypoints:` add exactly `'src/hosts/embedded/global.ts — JetBrains host
  entry; bundled by esbuild to dist/embedded/core.js (IIFE, global FeatherSpecHost) and run in GraalJS (0034)'`.
- **Tests first:** the four test files red against stubs.
- **Verify:** `local:` five gates incl. `npm run compile`.
- [ ] **Verified (T-017):** —
- **Notes:** —

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
  `FeatherSpecHost.conformance` / `.setupConformance`. Test: for every fixture folder (baseline and setup folders aside)
  the bundle in a bare `vm` context returns the same string as `runConformance` called in-process; its `read`/`next`
  parts equal the result of `readSnapshot`/`snapshotOf` over `readFixture` (memory vs fs mtime-free fields); setup:
  `mergePrompt` equals `src/core/setup/mergePrompt.golden.txt` byte for byte, classes/writes equal the in-process run.
- **Tests first:** `conformance.test.ts` red against stubs.
- **Verify:** `local:` five gates incl. `npm run compile`.
- [ ] **Verified (T-018):** —
- **Notes:** —

### T-019 — Node side of the JVM conformance: expected outputs for CI

- **Covers:** AC-004, AC-005 (oracle files for T-022)
- **Files:** `jetbrains/scripts/conformanceExpected.mjs`, `jetbrains/scripts/conformanceExpected.test.mjs`
- **Do:** Script: loads `dist/embedded/core.js` in a bare `vm` context with a no-op native host, for each fixture folder
  writes `jetbrains/build/conformance/inputs/<name>.json` (`{files, version}`) and `.../expected/<name>.json`
  (`FeatherSpecHost.conformance` result), plus `setup-input.json` (base64 of
  `test/fixtures/setup/featherspec-1.10.0.tar.gz`) and `setup-expected.json`. `node:test`: the script writes one file
  per fixture and every expected file parses as JSON.
- **Tests first:** `conformanceExpected.test.mjs` red (script missing).
- **Verify:** `local: npm run compile && node --test jetbrains/scripts/` green.
- [ ] **Verified (T-019):** —
- **Notes:** —

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
- **Verify:** `local: node --test jetbrains/guards/`; `CI: jetbrains.yml › shared-guard` green on ubuntu and windows.
- [ ] **Verified (T-020):** —
- **Notes:** —

### T-021 — Core runtime in the IDE (GraalJS per ADR-004)

- **Covers:** R-3, R-4, R-6, AC-006
- **Files:** `jetbrains/build.gradle.kts`, `jetbrains/gradle/libs.versions.toml`, `<pkg>/runtime/HostContract.kt`,
  `<pkg>/runtime/CoreRuntime.kt`, `<pkg>/runtime/HostHandler.kt`, `<test>/runtime/CoreRuntimeTest.kt`, `<test>/runtime/HostContractTest.kt`
- **Do:** Gradle: GraalJS deps (as T-004); `processResources` copies `../dist/embedded/core.js` → `embedded/core.js`
  and `../dist/webview/` → `webview/`. `HostContract.kt`: the contract names as constants. `HostHandler`
  interface: `call(name, args: String): String`, `callAsync(name, args: String, reply: (String) -> Unit)`,
  `emit(channel, payload: String)`. `CoreRuntime(handler, scriptLoader)`: one single-thread executor `FeatherSpec JS`
  owns a `Context` (`HostAccess.EXPLICIT`, `engine.WarnInterpreterOnly=false`, context class loader = plugin's while
  building); installs `__featherspecHost` (a Kotlin object with `@HostAccess.Export` methods `call`, `callAsync`,
  `emit`, `setTimer`, `clearTimer`; timers on a `ScheduledExecutorService` that posts `fire(id)` back to the JS thread);
  public `start(configJson)`, `dispatch(event, json)`, `invoke(command, json): CompletableFuture<String>`, `dispose()`.
  Every entry into JS is submitted to the JS executor; `callAsync` replies are posted back the same way. Tests (plain
  JUnit 5, the real `core.js` from `../dist/embedded`): start with a fake handler whose `folders.list` returns one
  memory-less folder → a `tree` emit arrives; a `callAsync` reply resolves; a timer fires; `HostContractTest` reads
  `../src/hosts/embedded/contract.ts` and asserts every quoted name exists in `HostContract.kt`.
- **Tests first:** both tests red against `TODO()` bodies (CI run 1).
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-021):** —
- **Notes:** —

### T-022 — JVM conformance and budgets on three OS

- **Covers:** AC-004, AC-005, AC-007 (read, update, cold start), R-1, R-2, R-5
- **Files:** `<test>/runtime/ConformanceTest.kt`, `<test>/runtime/BudgetTest.kt`, `.github/workflows/jetbrains.yml`
- **Do:** Workflow `plugin`: before Gradle, `node jetbrains/scripts/conformanceExpected.mjs`. `ConformanceTest`: for
  each `jetbrains/build/conformance/inputs/*.json`, `CoreRuntime` evaluates `FeatherSpecHost.conformance(input)` and
  the string equals `expected/<name>.json` byte for byte; setup likewise. `BudgetTest`: cold start (`CoreRuntime`
  construct + start) < 1,000 ms; the 200-spec input (generate it in the script as `gen-200`) read < 2,000 ms, a second
  conformance call after changing one file < 1,000 ms; best of three per budget (mirror `src/shared/testing/timing.ts`
  `bestOfThree` idea); print measured values.
- **Tests first:** red until the script step exists (CI run 1).
- **Verify:** `CI: jetbrains.yml › plugin` green on ubuntu, windows, macos.
- [ ] **Verified (T-022):** —
- **Notes:** —

### T-023 — File ports: URIs, spec source, folders, watching, frame activation

- **Covers:** AC-020, AC-021 (refresh on activation), H-10, H-11
- **Files:** `<pkg>/ports/FileUris.kt`, `<pkg>/ports/FilePorts.kt`, `<pkg>/ports/ProjectFolders.kt`, `<pkg>/ports/SpecWatch.kt`,
  `<test>/ports/FileUrisTest.kt`, `<test>/ports/FilePortsTest.kt`, `<test>/ports/ProjectFoldersTest.kt`
- **Do:** `FileUris`: `toUri(path: java.nio.file.Path, windows: Boolean): String` and `toPath(uri)` with the vectors of
  *Contracts › Roots*. `FilePorts` (pure over `java.nio.file`): `list`, `stat` (kind incl. `symlink` via
  `LinkOption.NOFOLLOW_LINKS`, mtime ms, size), `readBytes`, `readText`, `readDirectory` — answers for `source.*` and
  `fs.*` (mirror `src/adapters/node/nodeSpecSource.ts`, `nodeFileSystem.ts`). `ProjectFolders`: pure function
  `folders(basePath, contentRoots): List<Folder>` (base directory first, then content roots not inside it; name = last
  segment; Rider: solution folder = base path). `SpecWatch` (glue): subscribes `VirtualFileManager.VFS_CHANGES`
  (`BulkFileListener.after`) on the project message bus, calls `LocalFileSystem.addRootToWatch(root, true)`, forwards
  `fileChanged {root, path}` for paths inside a root (pure helper `relativeInside(root, path)` tested) and
  `markerChanged` for `AGENTS.md`/`.specs`/`.memory-bank/projectbrief.md`; subscribes
  `ApplicationActivationListener.TOPIC` → `VfsUtil.markDirtyAndRefresh(true, true, true, <root>/.specs)`.
- **Tests first:** three test files red against `TODO()`.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-023):** —
- **Notes:** —

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
  holding `Map<String, String>` keyed by `<project base path>|<key>` (answers `memory.get/set`; JSON values). Tests:
  the medium on a JUnit `@TempDir` (append/replace/exclusive/lines/list cases of
  `src/core/runtime/testing/contract*.ts`, picked one per method); `StoreLocation` vectors (Windows lowercasing).
- **Tests first:** both test files red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-024):** —
- **Notes:** —

### T-025 — Project service: start the core per IDE project and route the bridge

- **Covers:** AC-008, R-4, AC-019 (untrusted works), AC-031 (offer none)
- **Files:** `<pkg>/StudioProjectService.kt`, `<pkg>/StudioStartup.kt`, `<pkg>/HostRouter.kt`, `<test>/HostRouterTest.kt`,
  `jetbrains/src/main/resources/META-INF/plugin.xml`
- **Do:** `StudioProjectService` (`@Service(Service.Level.PROJECT)`, `Disposable`): owns one `CoreRuntime`; `start()`
  from `StudioStartup` (`ProjectActivity`, `<postStartupActivity>`), config `{host:'jetbrains', platform, studioVersion
  from PluginManagerCore}`. `HostRouter` (pure where possible) implements `HostHandler`: maps every contract name to
  T-023/T-024 ports (file I/O on `executeOnPooledThread`), `trust.isTrusted` → cached `project.isTrusted()`,
  `settings.read` → `null` until T-032, `assistant.extension` → `null`, `ui.*`/`clipboard.*`/`editor.*`/`actions.*` →
  `{"error":"not yet"}` placeholders replaced in later steps; collects `tree`/`status`/`log` emits into observable
  holders for the UI steps. Unknown names answer `{"error":"unknown <name>"}`. Test: router answers `folders.list` from a
  fake folder provider, unknown names error, `assistant.extension` null.
- **Tests first:** `HostRouterTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-025):** —
- **Notes:** —

### T-026 — Studio editor tab in JCEF

- **Covers:** AC-013, AC-014 (message sequence, Reload), AC-015
- **Files:** `<pkg>/panel/StudioFile.kt`, `<pkg>/panel/StudioEditorProvider.kt`, `<pkg>/panel/StudioEditor.kt`,
  `<pkg>/panel/PanelResources.kt`, `<pkg>/panel/PanelShim.kt`, `<test>/panel/PanelResourcesTest.kt`,
  `<test>/panel/PanelShimTest.kt`, `plugin.xml`
- **Do:** Mirror `jetbrains/spikes/ide/.../SpikePanel.kt` and `SpikeResources.kt` (T-005). `StudioFile`: one
  `LightVirtualFile("FeatherSpec Studio")` per project (kept by the service). Provider `accept = file is StudioFile`,
  `FileEditorPolicy.HIDE_DEFAULT_EDITOR`. `StudioEditor`: `JBCefBrowser`, `JBCefJSQuery` → `dispatch('panelMessage')`;
  `emit('panel')` → `executeJavaScript`; `panelOpened/panelClosed` on create/dispose; HTML from
  `invoke('panelHtml', {nonce, cspSource: origin, scriptUri, styleUri, reloaded})` plus the two inserted tags
  (`PanelShim.insert(html, nonce, bodyClass)`); Reload → reload only this browser. `PanelResources.resolve(url): Resource?`
  (pure): only `https://studio.featherspec.invalid/` + `main.js|main.css|theme.css|index.html`; anything else `null`
  (→ cancel). Tests: allowed/denied URL table (internet, `file:`, `..`, other host, query tricks); shim insertion keeps
  the CSP meta byte-identical and puts the tags after `<div id="root"></div>`.
- **Tests first:** both tests red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-026):** —
- **Notes:** —

### T-027 — Theme bridge

- **Covers:** AC-026, AC-027, AC-028
- **Files:** `<pkg>/theme/ThemeMapping.kt`, `<pkg>/theme/ThemeBridge.kt`, `<test>/theme/ThemeMappingTest.kt`, `plugin.xml`
- **Do:** Mirror `SpikeTheme.kt` (T-006). `ThemeMapping` (pure): one table row per CSS variable `(cssVar, ideKeys:
  List<String>, fallbackLight, fallbackDark, fallbackHighContrast)`; `fun variables(lookup: (String) -> java.awt.Color?,
  kind: ThemeKind): Map<String, String>` (never empty values); `ThemeKind.of(isDark, idOrName)` → `vscode-light`,
  `vscode-dark`, `vscode-high-contrast`; fonts from `UIUtil.getLabelFont()` / editor font scheme passed in as strings.
  `ThemeBridge` (glue): `LafManagerListener.TOPIC` → one `executeJavaScript` with all `setProperty` calls and the body
  class swap; `theme.css` content for first paint; `JBCefScrollbarsHelper.buildScrollbarsStyle()` appended. Test: reads
  `../src/webview/main.css`, derives every `--vscode-*` name by regex, fails when the table lacks one (AC-026); every
  value non-empty for an all-null lookup; kind table for Light, Darcula, High Contrast, Islands Light, Islands Dark.
- **Tests first:** `ThemeMappingTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-027):** —
- **Notes:** —

### T-028 — Tool window with the Specs tree

- **Covers:** AC-010, AC-011, AC-012, H-1, H-2, H-3
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
  Actions referenced here are registered in T-029.
- **Tests first:** `SpecTreeMappingTest` with the tree JSON of two conformance fixtures (`jetbrains/build/conformance/expected`) red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-028):** —
- **Notes:** —

### T-029 — Actions for Find Action and the JCEF fallback

- **Covers:** AC-017, AC-030, AC-013 (Open Overview/Board/Plan Map), H-7
- **Files:** `<pkg>/actions/StudioActions.kt`, `<pkg>/actions/ActionTable.kt`, `<test>/actions/ActionTableTest.kt`, `plugin.xml`
- **Do:** `ActionTable` (pure): rows `(actionId, title, invokeCommand)` for every command of `package.json`
  `contributes.commands` except `shellAction` and `selectSpec`; IDs `featherspec.studio.<camelName>`, titles exactly as
  the manifest. `StudioActions`: one `AnAction` subclass taking the row (`ActionUpdateThread.BGT`), registered in
  `plugin.xml` `<actions>` with the same `text`; group `featherspec.studio.TreePopup` with Open Spec, Open Plan, Show in
  Plan Map, Copy Next Step (enabled by the row flags). Open: if `!JBCefApp.isSupported()` → balloon of group
  `FeatherSpec Studio` naming the reason with *Open help* (`BrowserUtil.browse`), no exception; else open the
  `StudioFile`. Test: reads `../package.json`, asserts the table equals its commands minus the two (IDs, titles).
- **Tests first:** `ActionTableTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-029):** —
- **Notes:** —

### T-030 — Status bar widget, clipboard and opening files

- **Covers:** AC-016, AC-024, H-6, H-15, H-16
- **Files:** `<pkg>/status/StatusEntryMapping.kt`, `<pkg>/status/StudioStatusWidget.kt`, `<pkg>/ports/EditorOpen.kt`,
  `<test>/status/StatusEntryMappingTest.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `StatusEntryMapping` (pure): `status` JSON (`StatusEntryView` of `src/core/ports/copyNextStep.ts`) → text
  with `$(codicon)` replaced by an icon id, plain tooltip lines (Markdown → plain), accessible name, command. Widget:
  `StatusBarWidgetFactory` (`<statusBarWidgetFactory id="featherspec.studio.status" …/>`) with a `CustomStatusBarWidget`
  (`JBLabel`, `accessibleContext.accessibleName`), hidden while `null`; click → `invoke('copyNextStep')`.
  Router: `clipboard.write` → `CopyPasteManager.getInstance().setContents(StringSelection(text))`; `editor.open` →
  `OpenFileDescriptor(project, vfile, line - 1, 0)`; `place = beside` opens in a vertical split next to the Studio tab
  (`FileEditorManagerEx.getInstanceEx(project)`, `EditorWindow.split(...)`), `activeGroup` in the current window;
  `not-found` when the file is missing. Test: mapping vectors from the conformance `status` outputs.
- **Tests first:** `StatusEntryMappingTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-030):** —
- **Notes:** —

### T-031 — Notifications, popups, progress and the log view

- **Covers:** AC-023, H-13, H-14
- **Files:** `<pkg>/ui/HostUi.kt`, `<pkg>/ui/LogView.kt`, `<pkg>/ui/UiRequests.kt`, `<test>/ui/UiRequestsTest.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `UiRequests` (pure): parse/serialise the `ui.*` argument and reply JSON (notify level/message/actions →
  chosen label or null; pick items → index or null; confirm model → boolean; progress title → id). `HostUi` (glue, on
  EDT via `invokeLater`): `NotificationGroupManager.getInstance().getNotificationGroup("FeatherSpec Studio")`
  (`<notificationGroup id="FeatherSpec Studio" displayType="BALLOON"/>`) with `NotificationAction.createSimpleExpiring`
  per action in order; pick → `JBPopupFactory.getInstance().createPopupChooserBuilder(...)`; confirm →
  `MessageDialogBuilder.okCancel(title, message).yesText(confirmLabel).ask(project)`; progress →
  `ProgressManager.getInstance().run(Task.Backgroundable(project, title, true))` ending on `progressEnd`, Cancel →
  `dispatch('progressCancelled')`; `openExternal` → `BrowserUtil.browse`. `LogView`: a second tool-window content
  "Output" holding a `ConsoleView` (`TextConsoleBuilderFactory`); `log` emits printed line by line; `showOutput` selects
  it. Test: request/reply round trips.
- **Tests first:** `UiRequestsTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-031):** —
- **Notes:** —

### T-032 — Settings page, settings port and project trust

- **Covers:** AC-018, AC-019, AC-031, H-8, H-9
- **Files:** `<pkg>/settings/StudioSettings.kt`, `<pkg>/settings/StudioConfigurable.kt`, `<pkg>/settings/SettingsTable.kt`,
  `<test>/settings/SettingsTableTest.kt`, `<pkg>/TrustWatch.kt`, `plugin.xml`, `<pkg>/HostRouter.kt`
- **Do:** `SettingsTable` (pure): keys, defaults, labels, descriptions of `featherspec-studio.showStepTips` and
  `featherspec-studio.modelHints` read from `../package.json` `contributes.configuration` at test time and kept as
  constants in code; `assistant` excluded (AC-031). `StudioSettings`: application `@Service` `PersistentStateComponent`
  `@State(name = "FeatherSpecStudioSettings", storages = [Storage("featherspec-studio.xml")])`; change →
  `dispatch('settingsChanged', {key})` on every open project's runtime. `StudioConfigurable`: `BoundConfigurable` with
  Kotlin UI DSL (`checkBox(label).bindSelected`, comment = description, model hints as `textField`),
  `<applicationConfigurable parentId="tools" id="featherspec.studio.settings" displayName="FeatherSpec Studio"
  instance=…/>`; Open Settings → `ShowSettingsUtil.getInstance().showSettingsDialog(project,
  StudioConfigurable::class.java)`. Router `settings.read` → the state. `TrustWatch`: application listener
  `TrustStateListener.onProjectTrusted(project)` → `dispatch('trustGranted')`; `actions.manageTrust` → the platform's
  trust prompt if a public API exists, else `BrowserUtil.browse("https://www.jetbrains.com/help/idea/project-security.html")`
  (record which in Notes). Test: table equals the manifest entries.
- **Tests first:** `SettingsTableTest` red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-032):** —
- **Notes:** —

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
- **Files:** `<pkg>/setup/SetupTarget.kt`, `<test>/setup/SetupTargetTest.kt`, `<test>/setup/SetupConformanceTest.kt`, `<pkg>/HostRouter.kt`
- **Do:** `SetupTarget`: port of `src/adapters/node/nodeSetupTarget.ts` (`kind`, `readBytes`, `listDirectory`,
  `createExclusive` with `CREATE_NEW` → `created|exists`, `replaceIfUnchanged` via temp file + atomic move with retry,
  `clearSetupFolder` limited to `.featherspec-setup`). Router `target.*`. Tests: on `@TempDir` (exists → `exists`,
  changed → `changed`, Windows-safe rename retry); `SetupConformanceTest`: `CoreRuntime` runs
  `FeatherSpecHost.setupConformance(setup-input)` and equals `setup-expected.json`; a full setup run through the router
  on a temp folder with the archive served by a local `HttpServer` writes the same files as the Node run.
- **Tests first:** both tests red.
- **Verify:** `CI: jetbrains.yml › plugin` green on 3 OS.
- [ ] **Verified (T-034):** —
- **Notes:** —

### T-035 — Starter smoke on three OS

- **Covers:** AC-007 (frame ≤ 1 s, freshness ≤ 500 ms), AC-008, AC-013, AC-020, AC-021, AC-025, AC-027, AC-028, AC-029
- **Files:** `jetbrains/build.gradle.kts` (integrationTest source set), `<it>/StudioSmokeTest.kt`, `<it>/ThemeContrastTest.kt`,
  `<pkg>/theme/Contrast.kt`, `<test>/theme/ContrastTest.kt`, `<pkg>/actions/SmokeProbeAction.kt`, `.github/workflows/jetbrains.yml`
- **Do:** Mirror `jetbrains/spikes/ide/build.gradle.kts` and `SpikeIdeTest.kt` (T-006/T-007). `Contrast` (pure): WCAG
  relative luminance and ratio; contrast table pairs (panel text, secondary text, link, button text on their
  backgrounds; focus outline) → ≥ 4.5 / ≥ 3.0. `SmokeProbeAction` (id `featherspec.studio.smokeProbe`, registered only
  when system property `featherspec.smoke=true`): dumps tree model, status text, open-tab state, mapped theme values per
  theme, a list of files under the project dir with mtimes, timestamps of open → first `panel` hello reply, and of a
  model change → tree/status/panel update, to `<out>/smoke.json`. `StudioSmokeTest` (fixture copy of `studio-0015`):
  waits for indicators; Open (frame < 1 s); closes the tab, writes a spec externally via NIO (tree/status update ≤
  2 s, AC-021) and inside the IDE via `WriteAction` (≤ 500 ms after the VFS event); reopens (area/selection restored);
  asserts no file in the project dir changed except the test's own writes (AC-025). `ThemeContrastTest`: for Light,
  Darcula, High Contrast, Islands Light, Islands Dark → body class and `Contrast` pairs pass; switch while open → new
  values within 500 ms. Job `ide-smoke` (3 OS; macOS and Windows UI-permission failures reported, Ubuntu required),
  uploads `**/out/ide-tests/**` and `smoke.json`. `ContrastTest`: known pairs (black/white = 21, equal = 1).
- **Tests first:** `ContrastTest` red; smoke tests red on the first CI run.
- **Verify:** `CI: jetbrains.yml › ide-smoke` green on ubuntu (windows, macos green or recorded in Notes), `› plugin` green.
- [ ] **Verified (T-035):** —
- **Notes:** —

### T-036 — Plugin Verifier, manifest, ZIP size and webview byte identity

- **Covers:** AC-014 (bytes), AC-033, AC-034, AC-035 (size, no key in the repo)
- **Files:** `jetbrains/build.gradle.kts`, `.github/workflows/jetbrains.yml`, `jetbrains/guards/pluginZip.mjs`, `jetbrains/guards/pluginZip.test.mjs`
- **Do:** `pluginVerification { ides { recommended(); create(IntelliJPlatformType.IntellijIdea, "2025.3.1");
  create(IntelliJPlatformType.WebStorm, "2025.3.1"); create(IntelliJPlatformType.Rider, "2025.3.1");
  create(IntelliJPlatformType.PyCharm, "2025.3.1"); the same four at "2026.3" } }` (type names per the Gradle plugin's
  `IntelliJPlatformType` enum; fix in Notes if they differ). Job `verify` (ubuntu, matrix over product so each job
  downloads at most two IDEs; free disk first), `gradle -p jetbrains verifyPlugin -Pverify.product=<p>`.
  `pluginZip.mjs` (ubuntu, after `buildPlugin`): ZIP ≤ 60 MB; SHA-256 of the `webview/main.js` and `main.css` inside
  the plugin JAR equal `dist/webview/*` of the same `npm run package`; plugin.xml check of T-001 moved here; a scan of
  the repo tree for PEM headers and `PUBLISH_TOKEN=`-style assignments finds nothing. `node:test` for its pure parts.
- **Tests first:** `pluginZip.test.mjs` red.
- **Verify:** `local: node --test jetbrains/guards/`; `CI: jetbrains.yml › verify` (all products) and `› plugin` green.
- [ ] **Verified (T-036):** —
- **Notes:** —

### T-037 — Docs sync, spike removal and the final gate run

- **Covers:** AC-042 (checklist section), AC-043, every criterion the gates re-prove (AC-001–AC-031, AC-033–AC-035,
  AC-037–AC-039)
- **Files:** `README.md`, `docs/release-checklist.md`, `.architecture/jetbrains.md`, `.architecture/adapters.md`, `AGENTS.md`
  (snapshot), `.memory-bank/techContext.md`, `.memory-bank/systemPatterns.md`, `.memory-bank/activeContext.md`,
  `jetbrains/spikes/**` (delete), `.github/workflows/jetbrains-spikes.yml` (delete), `CHANGELOG.md` (JetBrains section)
- **Do:** README: a *JetBrains IDEs* section (install from disk/Marketplace once 0036 ships, supported IDEs = every
  IntelliJ-based IDE from 2025.3.1, Rider and WebStorm tested, Copy prompt as the default, local only, no split mode).
  Release checklist: a *JetBrains (manual)* section listing AC-040, AC-041, AC-042 with their steps. `.architecture/
  jetbrains.md` final (≤ 40 lines); `adapters.md` one line for `parity.ts`. Snapshot entries — confirm or reconcile
  exactly these (added in T-002, T-012, T-017): the `jetbrains/` module line, the `src/hosts` module line, the
  `src/hosts/embedded/global.ts` entrypoint line; add to `boundaries:` exactly `'src/hosts never imports vscode;
  src/hosts/embedded imports no Node.js built-in (it runs in GraalJS); src/core is shared unchanged by both hosts'`;
  `shared:` append `the host vocabulary (vocabulary.ts, 0034)` to the `src/shared/protocol` line; `# last reconciled:`
  date. Memory Bank: techContext (JetBrains jobs, how to read CI), systemPatterns (bridge, vocabulary, store keys),
  activeContext (stage state). Delete the spike folder and workflow (created by this plan). Then run every gate.
- **Tests first:** — (docs; gates decide)
- **Verify:** `local:` five gates incl. `npm run compile`, `node --test jetbrains/guards/ jetbrains/scripts/`,
  `npx vitest run src/adapters/node/docsScan.test.ts src/adapters/node/parity.test.ts`; `CI:` every job of
  `jetbrains.yml` green on one commit.
- [ ] **Verified (T-037):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-010, T-011 | — | — | open |
| AC-002 | T-010 | — | — | open |
| AC-003 | T-010, T-011 | — | — | open |
| AC-004 | T-018, T-019, T-022 | — | — | open |
| AC-005 | T-018, T-019, T-022, T-033, T-034 | — | — | open |
| AC-006 | T-012, T-015, T-017, T-020, T-021 | — | — | open |
| AC-007 | T-022, T-035 | — | — | open |
| AC-008 | T-016, T-025, T-035 | — | — | open |
| AC-009 | T-003…T-008 | — | — | open |
| AC-010 | T-028 | — | — | open |
| AC-011 | T-028, T-029 | — | — | open |
| AC-012 | T-028 | — | — | open |
| AC-013 | T-026, T-029, T-035 | — | — | open |
| AC-014 | T-013, T-026, T-036 | — | — | open |
| AC-015 | T-026 | — | — | open |
| AC-016 | T-030 | — | — | open |
| AC-017 | T-029 | — | — | open |
| AC-018 | T-032 | — | — | open |
| AC-019 | T-014, T-016, T-025, T-032 | — | — | open |
| AC-020 | T-023, T-035 | — | — | open |
| AC-021 | T-007, T-023, T-035 | — | — | open |
| AC-022 | T-033, T-034 | — | — | open |
| AC-023 | T-016, T-031 | — | — | open |
| AC-024 | T-030 | — | — | open |
| AC-025 | T-024, T-035 | — | — | open |
| AC-026 | T-027 | — | — | open |
| AC-027 | T-027, T-035 | — | — | open |
| AC-028 | T-027, T-035 | — | — | open |
| AC-029 | T-035 | — | — | open |
| AC-030 | T-029 | — | — | open |
| AC-031 | T-016, T-025, T-032 | — | — | open |
| AC-032 | — (moved to 0035, OP-024) | — | — | n-a here |
| AC-033 | T-001, T-036 | — | — | open |
| AC-034 | T-036 | — | — | open |
| AC-035 | T-036 (size, no key; signing → 0036) | — | — | open |
| AC-036 | — (moved to 0036, OP-024) | — | — | n-a here |
| AC-037 | T-001, T-009 | — | — | open |
| AC-038 | T-009, T-017 | — | — | open |
| AC-039 | T-009, T-012, T-013, T-014, T-020 | — | — | open |
| AC-040 | manual: Gregor, Rider | — | — | open |
| AC-041 | manual: Gregor, WebStorm | — | — | open |
| AC-042 | T-037 (checklist section); manual: Gregor | — | — | open |
| AC-043 | T-002, T-037 | — | — | open |

## Session handoff

- **Done so far:** plan written (Mode A); spec revised with OP-024 (split) and the `**Plan:**` link.
- **Next action:** Gregor's yes to the dependencies (2026-11-20) and the start signal are done; the pair is in
  `active/`. Next: T-001. Pushing `jetbrains-host` (via the studio bridge) approved by Gregor 2026-11-20.
- **Open decisions:** (1) Gregor confirms OP-024's split (0035 Send, 0036 Marketplace release) and whether to split
  further at G3 (37 steps vs. the ~30 guideline). (2) G1: runtime V1/V2 and the handover list (ADR-004). (3) The
  proxies OP-019–OP-023 and PD-099…PD-107: confirmed by Gregor 2026-11-20 (done).
- **Baseline:** _(commit hash before the first step commit; set when work starts; also `START_COMMIT` in `jetbrains.yml`)_
- **Environment:** every Gradle/Kotlin/JVM/IDE check runs only in GitHub Actions (`jetbrains.yml`,
  `jetbrains-spikes.yml`); the sandbox has no Maven/Gradle/JetBrains access (proxy 403). `ci.yml` does not run on
  branch pushes — `vscode-mirror` is its stand-in until the PR.
