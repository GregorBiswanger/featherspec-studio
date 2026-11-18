# Map: src/webview (Studio panel UI)
# last reconciled: 2026-11-18 (0018)

## Internal pattern
- `main.tsx` → `App.tsx` — entry and shell (navigation, panel states, notice bar, restricted note).
- `client.ts` — typed protocol client; `vscodeApi.ts` holds the only host handle (`postMessage`).
- `areas/registry.tsx` — area registry with placeholders; `areas/<Area>.tsx` or `areas/<area>/`
  (Spec Explorer list, Board, Overview); area folders hold `store.ts` and `texts.ts`.
- `board/`, `detail/` (0007) — Board (narrow strips, Done toggle, filter chip, three-row cards; 0018) and spec detail (0015: Next step with Copy). Cards and Overview rows (Now, Up next, Problems) show "Next", the short form and Copy (0017, `ui/StepText.tsx`); the board offers no way to move a spec.
- `ui/` (0013) — shared primitives: state chip, rule text, progress bar, inline text formatter, copy button, format-note toggle (0016).
- `main.css` — the one stylesheet; colours only from VS Code theme variables via `--fs-*` aliases.
- Specs: 0005, 0007, 0006, 0013, 0015, 0017, 0018.

## Task playbooks
- New view data: contract in `src/shared/protocol/<view>.ts` (with its guard test) → core
  projection → area component; the webview never computes lifecycle facts itself.
- New styling: guard in `src/adapters/node/webviewCss.test.ts` (theme variables, transitions ≤ 150 ms).

## Traps
- Imports only `src/shared` and its own files; no Node.js, no file access (ESLint webview block).
- Component tests use `act` + `createRoot` (no Testing Library); timing tests live in `*.timing.test.tsx`.
