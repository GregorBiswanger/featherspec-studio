# Map: src/adapters (ports implemented)
# last reconciled: 2026-11-17

## Internal pattern
- `src/adapters/node/` — Node file-system and spec-source adapters, the Node-fs runtime medium,
  system clocks, random IDs; also the bundle, webview-bundle and CSS guard tests.
- `src/adapters/providers/<id>/` — provider adapters behind `AgentProviderPort`:
  - `fake/` (0009) — the deterministic fake provider (scenarios, script); never touches I/O.
  - `copilot/` (0010) — the GitHub Copilot SDK adapter: client seam (`client.ts`), SDK wrapper
    (`sdkClient.ts`), event mapping (`mapping.ts`), scripted client for tests, CLI locator.
- `src/adapters/vscode/` — thin implementations of the host ports with the VS Code API; no logic.

## Entry points
- Everything here is constructed in `src/extension.ts` (composition root) and handed to the core.

## Task playbooks
- A new real provider: run the contract suite (`src/core/providers/testing/contract.ts`) against it,
  as `fake/fakeContract.test.ts` and `copilot/copilotContract.test.ts` do.

## Traps
- `vscode/` stays logic-free: a decision made here is untestable without the host suite.
- The Copilot SDK is bundled by esbuild (`external: ['vscode','koffi']`); `node/extensionBundle.test.ts` proves no platform package reaches `dist/`.
