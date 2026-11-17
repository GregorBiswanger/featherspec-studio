# Map: src/webview (Studio panel UI)
# last reconciled: 2026-11-17

## Internal pattern
- `main.tsx` → `App.tsx` — entry and shell (navigation, panel states, notice bar, restricted note).
- `client.ts` — typed protocol client; `vscodeApi.ts` holds the only host handle (`postMessage`).
- `areas/registry.tsx` — area registry with placeholders; `areas/<Area>.tsx` or `areas/<area>/`
  (Spec Explorer list, Spec Board, Mission Control, Agent Center); area folders hold `store.ts` and `texts.ts`.
- `board/`, `detail/` (0007) — Spec Board and spec detail; `agentStart/` (0008) — start dialog and lines.
- `ui/` (0013) — shared primitives: state chip, run status chip, rule text, progress bar, inline text formatter.
- `main.css` — the one stylesheet; colours only from VS Code theme variables via `--fs-*` aliases.
- Specs: 0005, 0007, 0006, 0013, 0008, 0012.

## Task playbooks
- New view data: contract in `src/shared/protocol/<view>.ts` (with its guard test) → core
  projection → area component; the webview never computes lifecycle facts itself.
- New styling: guard in `src/adapters/node/webviewCss.test.ts` (theme variables, transitions ≤ 150 ms).

## Traps
- Imports only `src/shared` and its own files; no Node.js, no file access (ESLint webview block).
- Component tests use `act` + `createRoot` (no Testing Library); timing tests live in `*.timing.test.tsx`.
