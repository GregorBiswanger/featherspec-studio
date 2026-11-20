# JetBrains host — rules for agents

Read `AGENTS.md` first. This folder is the IntelliJ Platform plugin of FeatherSpec Studio (spec 0034).

## What lives here
- `src/main/kotlin/com/gregorbiswanger/featherspec/studio/` — Kotlin host, root package `com.gregorbiswanger.featherspec.studio`.
- `src/main/resources/META-INF/plugin.xml` — plugin manifest (id, `since-build`, the two `<depends>` lines).
- `src/test/kotlin/…` — plain JUnit 5 tests; `src/integrationTest/kotlin/…` — Starter smoke and conformance.
- `build.gradle.kts`, `settings.gradle.kts`, `gradle/libs.versions.toml` — build; versions live in the TOML.

## Checks
- Every Gradle, Kotlin and JVM check runs in CI only: `.github/workflows/jetbrains.yml`.
  The sandbox cannot reach Maven, the Gradle portal or JetBrains. Do not claim a Kotlin result from a local run.
- Local gates for TypeScript changes stay the ones in `AGENTS.md` and `.memory-bank/techContext.md`.

## Kotlin conventions
- Logic lives in pure classes with no `com.intellij` import, tested by plain JUnit 5.
- Platform glue stays thin; the Starter smoke covers it.
- No comments in generated code. No new dependency without the owner's yes.

## Shared core
- Never edit `src/core`. The core runs unchanged in GraalJS through the JSON bridge.
- Bridge contract: `src/hosts/embedded/contract.ts` (from T-016). Its Kotlin mirror is `<pkg>/runtime/HostContract.kt` (T-021).
- Host vocabulary: `src/shared/protocol/vocabulary.ts` (T-014); the webview reads it, the host does not invent UI strings.

## Context hygiene
- Keep this file and the map `.architecture/jetbrains.md` short; the plan is `.specs/active/0034-studio-for-jetbrains-ides.plan.md`.
