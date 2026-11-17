# Design brief — Studio visual design (input for spec 0013)

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

## Mission Control
- A row of stat tiles, one per board state (big number, label, icon, "derived" marker where the
  state is derived); the tile is the drill-down link.
- One segmented bar showing the distribution of all specs over the states, and the progress
  figure next to it with its rule as a tooltip/secondary line.
- "Needs attention" as a list of compact rows/cards: spec number chip, title, reason chip.
- Agent runs and recent activity as two panels side by side below; friendly empty states.
  *Superseded by PD-055 (spec 0015): there are no agent runs; recent activity stands alone.*
- Header: project name, FeatherSpec version, last model update, diagnostics — one quiet line.
  Say "0 project-level diagnostics · N specs with diagnostics" so the header and the cards agree.

## Spec Board
- Columns use the full panel height with a sticky header (icon, name, count badge); each column
  scrolls on its own; the board scrolls horizontally below a minimum column width. No fixed
  70vh box, no cut-off cards.
- Card: number chip + title on one line block, one state chip (icon + text, colour from the
  VS Code chart/status variables, never colour alone), summary (two lines), two thin progress
  bars (tasks, criteria) with their figures, diagnostics badge, run status, "Move to…" as a
  small button in the card's corner that is reachable by Tab.
  *Run status: superseded by PD-055 (spec 0015); cards carry no run line.*
- Readiness and rule references read as sentences for humans; the rule ID is secondary text.
- Drag feedback: the dragged card and the valid/invalid target columns are visibly marked.

## Spec Explorer
- Two panes: list left, detail right. Detail has a header (number, title, state chip, "Open
  file") and sections that can be collapsed: Overview, Requirements, Acceptance criteria,
  Plan & tasks, Verification, Related artifacts, History.
- Text from the files is shown with inline Markdown rendered safely (bold, italics, inline
  code, links as text + target) — escaped first, small built-in subset, no library, no HTML
  from the files ever reaches the DOM. Block quotes and list markers are tidied.
- IDs appear once ("FR-01", "T-001"), steps show a check icon and their `Verified` text;
  one "Open file" per section, not per item.

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
