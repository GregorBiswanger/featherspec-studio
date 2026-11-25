# Map: src/hosts (shared composition and the embedded JetBrains core)
# last reconciled: 2026-11-24 (0035, PD-112, ADR-004)

## Internal pattern
- `compose.ts` (T-012) — `composeStudio(ports: HostPorts): Studio`: every core construction and the start sequence
  (`removeEarlierRunData`, session start, controller start, `whenIdle`) in the order `src/extension.ts` had; one `HostPorts`
  member per host adapter, `createPanel(services)` a factory; owns the UI memory keys `featherspec-studio.{shell,board,handOvers,sidePanel}`.
- `panelSession.ts` (T-013) — `createPanelSession`: the panel's protocol half (seq, shell/board/overview/detail pushes, router
  with `hello`, `attach`/`detach`/`receive`); `src/adapters/vscode/studioPanel.ts` keeps HTML, icons, reveal, serializer, probe channel.
- `embedded/` — the core page of the JetBrains host (one hidden JCEF browser per IDE project; JS → host is async only):
  `contract.ts` every bridge name (`ASYNC_CALLS`, `EMIT_CHANNELS`, `DISPATCH_EVENTS`, `INVOKE_COMMANDS`, `FRAME_KINDS`) and
  `CoreConfig`, mirrored by Kotlin `HostContract.kt` (T-021) · `bridge.ts` frames, ids, base64 · `mirrors.ts` host-pushed copies
  (settings, trust, folders, memory) behind the sync ports · `ports.ts` `createEmbeddedPorts` (`HostPorts` from bridge and
  mirrors), `archivePortOf` · `assistants.ts` the JetBrains `AssistantTable` (Junie, Claude Code and Copilot `send` through the one bridge call `assistant.terminal` with `{assistant, target, text}`; `cliText` forms per agent; presence ids `cli:junie|claude|copilot` plus the Terminal plugin in the `plugins` mirror, event `pluginsChanged`; unset reads `junie`; 0035, PD-112) · `terms.ts` host-side UI strings through `translateTerms` · `main.ts` `createEmbeddedHost`: `start`,
  `resolve`, `dispatch`, `invoke`, `conformance`, `setupConformance` · `global.ts` sets `globalThis.FeatherSpecHost`, frames out
  via `__featherspecNative` · `pathPosix.ts` stands in for `path` · `conformance.ts` (T-018) the oracle replies ·
  `testing/browserContext.ts` a `vm` context with only the Web APIs Chromium gives the page (tests only).

## Entry points
- `src/extension.ts` builds the VS Code `HostPorts` and calls `composeStudio`; `embedded/main.ts` does so for JetBrains.
- `esbuild.js` › `embeddedBuildOptions` (third target, T-017): `global.ts` → `dist/embedded/core.js`, IIFE, browser, es2022,
  path shim plugin; never in the VSIX (`jetbrains/guards/vsix-files.txt`).
- Outside `src/`: `jetbrains/guards/*.mjs` (VSIX list, same bundles; `sharedGuard.mjs`, `renderedTexts.mjs` for CI `shared-guard`),
  `jetbrains/scripts/conformanceExpected.mjs` (expected outputs in `jetbrains/build/conformance/` for the JVM run),
  `docs/jetbrains/parity.md` (generated from `parity-source.json` by `src/adapters/node/parity.ts`).

## Task playbooks
- A service both hosts need: `compose.ts` only. A host port: `HostPorts` → VS Code adapter in `src/extension.ts` → embedded
  `ports.ts`; a new bridge name: `contract.ts` and `HostContract.kt` together.
- A host text naming a VS Code term: a pair in `TERM_PAIRS` (`src/shared/protocol/vocabulary.ts`, drift guard `src/adapters/node/vocabularySources.test.ts`); `terms.ts` and the webview apply it.

## Deviations
- `main.ts` imports `buildWebviewHtml` from `src/adapters/vscode/webviewHtml.ts` (no `vscode` import there); `conformance.ts`
  bundles core `testing/` fakes; tar.gz is read by the host (`archive.read`); `openFolder` rejects (an IDE project always has a folder); settings mirrors use the core's bare keys.

## Traps
- `embedded/**` outside tests and `testing/` imports neither `vscode` nor a Node.js built-in (ESLint block).
- `src/core` changes only as spec 0035 names (the shared-guard compares with its start commit `1765403`); `dist/extension.js`, `dist/webview/*` stay byte-identical (`bundle.test.ts`,
  `sameBundles.mjs`, CI `shared-guard`). `noNetwork.test.ts` skips `src/hosts`; `compose.test.ts` checks `compose.ts`.
- Dispatch before `start` is ignored; a bad `CoreConfig` sends `failed`, never `ready`.
