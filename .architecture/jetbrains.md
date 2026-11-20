# Map: jetbrains (IntelliJ Platform host)
# last reconciled: 2026-11-20 (0034)

## Internal pattern
- `jetbrains/src/main/kotlin/com/gregorbiswanger/featherspec/studio/` — root package; pure logic in plain classes, platform glue
  (`com.intellij` imports) only in thin classes; `runtime/` holds the GraalJS bridge (`HostContract.kt`, T-021).
- `jetbrains/src/main/resources/META-INF/` — `plugin.xml` (id, `since-build`, `<depends>` lines), `pluginIcon.svg`.
- `jetbrains/src/test/kotlin/…` — plain JUnit 5 on pure classes; `jetbrains/src/integrationTest/kotlin/…` — Starter smoke and conformance.
- The core runs unchanged as `dist/embedded/core.js` in GraalJS; the webview bundle runs unchanged in JCEF. Neither is edited here.

## Entry points
- `jetbrains/src/main/resources/META-INF/plugin.xml` — the only manifest; extensions are added per step.
- `jetbrains/build.gradle.kts` — plugin configuration; versions in `jetbrains/gradle/libs.versions.toml`.
- `.github/workflows/jetbrains.yml` — job `plugin` (Ubuntu, Windows, macOS) is the only place a Kotlin result exists.

## Task playbooks
- A Kotlin change: pure logic in a class under `…/studio/` with a JUnit test under `src/test`; glue in a thin class; verify with `jetbrains.yml` › `plugin`.
- A version bump: `gradle/libs.versions.toml` only; CI decides.
- A bridge change: `src/hosts/embedded/contract.ts` and `HostContract.kt` together; `src/core` stays untouched.

## Traps
- No local Gradle run is possible in the sandbox; a red CI log goes back to a fresh implementer, not a guess.
- `since-build` and the two `<depends>` lines are checked by CI; a change there breaks the packaging guard.
