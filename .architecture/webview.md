# Map: src/webview (Studio panel UI)
# last reconciled: 2026-11-18 (0021)

## Internal pattern
- `main.tsx` → `App.tsx` — entry and shell (navigation, panel states, notice bar, restricted note).
- `client.ts` — typed protocol client; `vscodeApi.ts` holds the only host handle (`postMessage`).
- `areas/registry.tsx` — area registry with placeholders; `areas/<Area>.tsx` or `areas/<area>/`
  (Board, Overview); area folders hold `store.ts` and `texts.ts`.
- `board/`, `detail/` (0007) — Board (narrow strips, Done toggle, filter chip, three-row cards; 0018) and the spec detail (0015: Next step with Copy; 0019: the situation picture). `App.tsx` frame renders `detail/SidePanel.tsx` (complementary region) beside Overview and Board while a spec is selected, its width set by `detail/Divider.tsx` and `detail/sideWidth.ts` (remembered fraction, 0022); below 900 px the area or the detail shows alone with `detail/BackButton.tsx`. The panel has two areas, Overview and Board (0020); there is no list or pane. `detail/useOpenSpec.ts` selects in place and remembers the opener; `detail/focus.ts` and `DetailFrame.tsx` hold the focus rules (heading after activation, close returns to the opener of that spec, Escape closes). `detail/narrow.ts` reads `NARROW_QUERY` from `src/shared/protocol/layout.ts` (the one width query, shared with the CSS guard test); the Overview's rows follow their own list width by container queries (0022). Cards and Overview rows (Now, Up next, Problems) show "Next", the short form and Copy (0017, `ui/StepText.tsx`); the board offers no way to move a spec.
- `ui/` (0013) — shared primitives: state chip, progress bar, inline text formatter, copy button with three looks (primary, secondary, icon; 0022), format-note toggle (0016), `FileLink` (a link that opens a file at a line, 0019), `PathText` (break opportunities after `/`, `-`, `.`; 0022), `Toggletip` (0021: a `?` button with a `role="status"` region directly after it, one open at a time through a module store, closed by Escape, a second activation, an outside press, focus leaving or changed content; used for About this step in `detail/NextStep.tsx` and in the coach line of the first Now row).
- `main.css` — the one stylesheet; colours only from VS Code theme variables via `--fs-*` aliases.
- Specs: 0005, 0007, 0006, 0013, 0015, 0017, 0018, 0019, 0022.

## Task playbooks
- New view data: contract in `src/shared/protocol/<view>.ts` (with its guard test) → core
  projection → area component; the webview never computes lifecycle facts itself.
- New styling: guard in `src/adapters/node/webviewCss.test.ts` (theme variables, transitions ≤ 150 ms).

## Traps
- Imports only `src/shared` and its own files; no Node.js, no file access (ESLint webview block).
- Component tests use `act` + `createRoot` (no Testing Library); timing tests live in `*.timing.test.tsx`.
