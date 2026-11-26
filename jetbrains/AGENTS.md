# JetBrains host — rules for agents

Read `AGENTS.md` first. This folder is the IntelliJ Platform plugin of FeatherSpec Studio (spec 0034).

## What lives here
- `src/main/kotlin/com/gregorbiswanger/featherspec/studio/` — Kotlin host, root package `com.gregorbiswanger.featherspec.studio`.
  Packages: `runtime/` bridge to the core page · `jcef/` · `ports/` host ports · `assistant/` Send to the CLI agents · `panel/` editor tab · `theme/` · `tree/` tool window ·
  `actions/` · `status/` · `ui/` · `settings/` · `setup/` · `probe/` (CI probes, inert by default); inside view: `.architecture/jetbrains.md`.
- `src/main/resources/META-INF/plugin.xml` — plugin manifest (id, the two `<depends>` lines plus the optional Terminal one in `featherspec-terminal.xml`; `since-build` is in `build.gradle.kts`).
- `src/test/kotlin/…` — plain JUnit 5 tests; `src/integrationTest/kotlin/…` — Starter smoke and conformance.
- `build.gradle.kts`, `settings.gradle.kts`, `gradle/libs.versions.toml` — build; versions live in the TOML.

## Checks
- Every Gradle, Kotlin and JVM check runs in CI only: `.github/workflows/jetbrains.yml`.
  The sandbox cannot reach Maven, the Gradle portal or JetBrains. Do not claim a Kotlin result from a local run.
- Local gates for TypeScript changes stay the ones in `AGENTS.md` and `.memory-bank/techContext.md`.

## Release (0036)
- `.github/workflows/jetbrains-release.yml` signs and, from the second version on, publishes; no secret outside it (guards `releaseWorkflow`, `releaseConfig`). Marketplace texts live in `plugin.xml` (guard `pluginPage`).

## Kotlin conventions
- Logic lives in pure classes with no `com.intellij` import, tested by plain JUnit 5.
- Platform glue stays thin; the Starter smoke covers it.
- Without JCEF only the settings page works; every other action shows the notice (help URL `JETBRAINS_TEXTS.helpUrl` → README `#jetbrains-ides`).
- No comments in generated code. No new dependency without the owner's yes.

## Shared core
- `src/core` changes only through a spec that names the change (0035 §6.8); otherwise never edit it. The core runs in a hidden JCEF browser per IDE project through the JSON bridge (ADR-004).
- Bridge contract: `src/hosts/embedded/contract.ts` (from T-016). Its Kotlin mirror is `<pkg>/runtime/HostContract.kt` (T-021).
- Host vocabulary: `src/shared/protocol/vocabulary.ts` (T-014); the webview reads it, the host does not invent UI strings.

## Context hygiene
- Keep this file and the map `.architecture/jetbrains.md` short; the plan is `.specs/active/0034-studio-for-jetbrains-ides.plan.md`. The spike code is gone (T-037).
