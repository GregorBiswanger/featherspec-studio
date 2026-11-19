# Map: src/webview (Studio panel UI)
# last reconciled: 2026-11-19 (0024)

## Internal pattern
- `main.tsx` → `App.tsx` — entry and shell (navigation, panel states, notice bar, restricted note).
- `client.ts` — typed protocol client; `vscodeApi.ts` holds the only host handle (`postMessage`).
- `areas/registry.tsx` — area registry with placeholders; `areas/<Area>.tsx` or `areas/<area>/`
  (Board, Overview, Plan map 0023: `areas/planMap/` holds the stage rows, step cards with their keys and the ways; 0025: the target and its highlight, the header's next step, `shows.ts`); area folders hold `store.ts` and `texts.ts`. 0026: the ways block is a radio group with `About these ways`, and the Now list ends with `+ n more`.
- `board/`, `detail/` (0007; 0025: an Overview row's step text sits beside the row button with a step link, and `detail/ParallelHint.tsx` leads to the ways) — Board (narrow strips, Done toggle, filter chip, three-row cards; 0018) and the spec detail (0015: Next step with Copy; 0019: the situation picture). `App.tsx` frame renders `detail/SidePanel.tsx` (complementary region) beside Overview and Board while a spec is selected, its width set by `detail/Divider.tsx` and `detail/sideWidth.ts` (remembered fraction, 0022); below 900 px the area or the detail shows alone with `detail/BackButton.tsx`. The panel has three areas, Overview, Board and Plan map (0020, 0023); there is no list or pane. `detail/useOpenSpec.ts` selects in place and remembers the opener; `detail/focus.ts` and `DetailFrame.tsx` hold the focus rules (heading after activation, close returns to the opener of that spec, Escape closes). `detail/narrow.ts` reads `NARROW_QUERY` from `src/shared/protocol/layout.ts` (the one width query, shared with the CSS guard test); the Overview's rows follow their own list width by container queries (0022). Cards and Overview rows (Now, Up next, Problems) show the short form after a visually hidden `Next step: ` and Copy (0017, 0026, `ui/StepText.tsx`); the board offers no way to move a spec.
- `ui/` (0013) — shared primitives: `Welcome` (0029: the empty state while `/sdd-setup` has not run; the feather glyph is `board/featherPath.ts`), `StepLink` and the step motifs `StepIcon` (0025), `SendButton` (0024: the split button, its arrow part and menu with the menu-button keys; feedback from `sendResult`) and `popup.ts` (the one open popup of the toggletip and the menu), `AttachmentLine` (0027: the chip with the `file` glyph and the file name, after the split button) and `StepAction` and `focusHandoff.ts` (the place of the first line's or a row's primary action: Send or Copy prompt, and the focus handoff from a leaving split button to the Copy prompt that replaces it at the same place; 0024), state chip, progress bar, inline text formatter, copy button with three looks (primary, secondary, icon; 0022), format-note toggle (0016), `FileLink` (a link that opens a file at a line, 0019), `PathText` (break opportunities after `/`, `-`, `.`; 0022), `Toggletip` (0021: a `?` button with a `role="status"` region directly after it, one open at a time through a module store, closed by Escape, a second activation, an outside press, focus leaving or changed content; used for About this step in `detail/NextStep.tsx` and in the coach line of the first Now row). 0026: `Toggletip` hands focus on leaving; the Send menu items are `menuitemradio`, the active one checked.
- `main.css` — the one stylesheet; colours only from VS Code theme variables via `--fs-*` aliases.
- Specs: 0005, 0007, 0006, 0013, 0015, 0017, 0018, 0019, 0022, 0023, 0024.

## Task playbooks
- New view data: contract in `src/shared/protocol/<view>.ts` (with its guard test) → core
  projection → area component; the webview never computes lifecycle facts itself.
- New styling: guard in `src/adapters/node/webviewCss.test.ts` (theme variables, transitions ≤ 150 ms).

## Traps
- Imports only `src/shared` and its own files; no Node.js, no file access (ESLint webview block).
- Component tests use `act` + `createRoot` (no Testing Library); timing tests live in `*.timing.test.tsx`.
