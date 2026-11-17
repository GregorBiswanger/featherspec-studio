# Map: src/adapters (ports implemented)
# last reconciled: 2026-11-17

## Internal pattern
- `src/adapters/node/` — Node file-system and spec-source adapters, the Node-fs runtime medium,
  system clocks, random IDs; the setup (0014): `fetchReleaseHttp` (only `fetch` caller), `tarGzArchive`
  (zlib, own ustar/pax reader), `nodeSetupTarget` (`wx` create, temp file and rename); also the bundle, webview-bundle and CSS guard tests.
- `src/adapters/node/` also holds the earlier run data removal (0015): the file adapter for `copilot-home`,
  `index.json`, `runs/`; the scan tests (`sourceScan`, `docsScan`).
- `src/adapters/vscode/` — thin implementations of the host ports with the VS Code API; no logic.

## Entry points
- Everything here is constructed in `src/extension.ts` (composition root) and handed to the core.

## Task playbooks
- A new host capability: implement the port here, wire it in `src/extension.ts`.

## Traps
- `vscode/` stays logic-free: a decision made here is untestable without the host suite.
- esbuild keeps only `vscode` external; `node/extensionBundle.test.ts` proves the bundle holds no agent SDK.
