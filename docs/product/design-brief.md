# Design brief — Studio visual design (input for spec 0013)

> Partly superseded by the UX audit of 2026-11-17: PD-058 … PD-062 and
> [ux-guidelines.md](ux-guidelines.md) win where they differ (Overview layout, board
> moves, cards, detail, diagnostics; PD-062 and spec 0018: Overview and Board). Theme, palette and accessibility rules here stay.

Written 2026-11-16 by Claude as product-owner proxy after the first real look at the UI
(screenshots from a headless-browser preview of the built webview, fed by the real core on this
repository). Everything works and the data is right, but the Studio reads like unstyled HTML.
The handoff's principle P1 "Visual First" and the product goal — entertaining to use, good
enough to show in a talk or a Marketplace screenshot — are not met yet. Taste decisions in here
are proposals until Gregor confirms them.

## What it should feel like
A calm, dense, native-looking VS Code tool with a clear visual hierarchy: you open it and see the
state of the project in two seconds. Native means: only VS Code theme variables, correct in
Dark, Light and High Contrast, no custom colour palette, no web fonts, no new dependencies.

## Overview
> Since spec 0018 (PD-062) this is the **Overview**: Now, Up next and Problems as one-line rows, one line of figures with the progress as tooltip, and a collapsed Activity. The tiles, the distribution bar and the header below are history.

- A row of stat tiles, one per board state (big number, label, icon, "derived" marker where the
  state is derived); the tile is the drill-down link.
- One segmented bar showing the distribution of all specs over the states, and the progress
  figure next to it with its rule as a tooltip/secondary line.
- "Needs attention" as a list of compact rows/cards: spec number chip, title, reason chip.
- Agent runs and recent activity as two panels side by side below; friendly empty states.
  *Superseded by PD-055 (spec 0015): there are no agent runs; recent activity stands alone.*
- Header: project name, FeatherSpec version, last model update, diagnostics — one quiet line.
  Say "0 project-level diagnostics · N specs with diagnostics" so the header and the cards agree.

## Board
> Since spec 0018 (PD-062) this is the **Board**: columns without a card are narrow strips, Done is collapsed, the card has three rows. The card and column text below is history where it differs.

- Columns use the full panel height with a sticky header (icon, name, count badge); each column
  scrolls on its own; the board scrolls horizontally below a minimum column width. No fixed
  70vh box, no cut-off cards.
- Card: number chip + title on one line block, one state chip (icon + text, colour from the
  VS Code chart/status variables, never colour alone), summary (two lines), two thin progress
  bars (tasks, criteria) with their figures, diagnostics badge, run status, the next-step line last ("Next", short form,
  Copy button reachable by Tab).
  *Run status: superseded by PD-055 (spec 0015); cards carry no run line.*
- Readiness and rule references read as sentences for humans; the rule ID is secondary text.

## Specs tree and the detail side panel
- The Activity Bar view "Specs" is a native tree (spec 0020): four groups (In progress, Up next, Backlog,
  Done collapsed), a row per spec with number, title, state and short next step, an icon and a colour per
  state, a tooltip that explains the row, an inline Copy and a badge for what waits. A click selects the spec.
- The detail is a picture of the spec's situation, not its text (PD-058, spec 0019): header (number, title,
  state chip, close button), Next step, Problems, Progress (steps, criteria, needs), Files, Format notes and
  Status history (the last two collapsed). It shows as a 400 px side panel beside Overview and Board (a
  drawer below 900 px). Selecting a spec keeps the tab; Escape or the close button closes it.
- Every ID and file name is a link that opens the file beside the Studio at the line of the ID.
  Text that quotes file content (reasons, format notes) is still rendered safely: escaped first,
  small built-in subset, no HTML from the files reaches the DOM.

## Agent Center (placeholder until 0012) and panel-level states
- Friendly, centred empty/placeholder states with an icon, one sentence and the action.
- *Superseded by PD-055 (spec 0015): the Agent Center no longer exists; the panel-level states stand.*

## Motion and accessibility
- Short transitions (≤ 150 ms) for hover, selection and collapsing; none when the user prefers
  reduced motion. Focus always visible. Everything keyboard-reachable stays so.

## How it is accepted
- Component tests for structure, labels, keyboard reachability and that only `--vscode-*`
  variables carry colour.
- Screenshots of all areas in Dark, Light and High Contrast from the preview harness, looked at
  by a human (Gregor) — the final say on looks is his.
