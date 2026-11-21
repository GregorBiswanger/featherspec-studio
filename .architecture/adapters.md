# Map: src/adapters (ports implemented)
# last reconciled: 2026-11-21 (0034)

## Internal pattern
- `src/adapters/node/` — Node file-system and spec-source adapters, the Node-fs runtime medium,
  system clocks, random IDs; the setup (0014): `fetchReleaseHttp` (only `fetch` caller), `tarGzArchive`
  (zlib, own ustar/pax reader), `nodeSetupTarget` (`wx` create, temp file and rename); also the bundle, webview-bundle and CSS guard tests. 0034: `parity.ts` generates `docs/jetbrains/parity.md` from `docs/jetbrains/parity-source.json` (`parity.test.ts`; `FEATHERSPEC_WRITE_PARITY=1` writes it); `vocabularySources.test.ts` is the drift guard of `TERM_PAIRS`.
- `src/adapters/node/` also holds the earlier run data removal (0015): the file adapter for `copilot-home`,
  `index.json`, `runs/`; the scan tests (`sourceScan`, `docsScan`).
- `src/adapters/vscode/` — thin implementations of the host ports with the VS Code API; no logic. `assistantHost.ts` (0024) implements `AssistantHostPort`: `getExtension`, `activate`, `getCommands(true)`, `executeCommand`, the extensions change event, `fileUri` (the project root URI joined with a spec path, 0027). `uiMemory.ts` (`createUiMemory(memento, key)`) maps one workspace-state key to the UI memory port (0018); the keys (`featherspec-studio.shell`, `.board`, `.handOvers`, `.sidePanel` for the side panel width fraction, 0022) live in `src/hosts/compose.ts` since 0034 T-012. `studioPanel.ts` keeps HTML, icons, reveal, serializer and probe channel; its protocol half is `src/hosts/panelSession.ts` (0034 T-013). `webviewHtml.ts` (no `vscode` import, also used by `src/hosts/embedded/main.ts`) sets `data-host="jetbrains"` on `<body>` only when `host` is given (0034 T-014). `settings.ts` (`createSettingPort(key)`, 0021) reads one `featherspec-studio.*` configuration key, filtered by `affectsConfiguration`, and writes nothing. `editor.ts` opens a file at its line, beside the Studio (0019) or, for the tree's Open Spec and Open Plan, in the active group, beside when that group shows the Studio (0020). `studioTree.ts` maps the core's spec tree model to the native Specs tree view: ids, icons and colours, untrusted Markdown tooltips, `contextValue` for the menus, badge, description and the `panelState` context key (0020). The status item (`statusBar.ts`, 0017) maps the core's entry view to a status bar item (Markdown tooltip trusted for two command IDs only); `stepUi.ts` is the quick pick and the warning of Copy Next Step. `commands.ts` names `featherspec-studio.openPlanMap` for the third area (0023).

## Entry points
- Everything here is constructed in `src/extension.ts` (composition root) and handed as `HostPorts` to `composeStudio` (`src/hosts/compose.ts`, map `.architecture/hosts.md`).

## Task playbooks
- A new host capability: implement the port here, add it to `HostPorts`, wire it in `src/extension.ts`; the embedded host needs its own in `src/hosts/embedded/ports.ts`.

## Traps
- `vscode/` stays logic-free: a decision made here is untestable without the host suite.
- esbuild keeps only `vscode` external; `node/extensionBundle.test.ts` proves the bundle holds no agent SDK.
