# Release checklist 0.1.0

The checks nothing automates, for Gregor before the Marketplace publish. Each item names where to look
and the expected result. A clear miss reopens the named spec.

## Before publishing

- [x] **Publisher ID**: `package.json` → `"publisher": "GregorBiswanger"` is Gregor's existing Marketplace
  publisher (publisher management page, confirmed by Gregor on 2026-11-17; it already owns three extensions).
- [ ] **Icon**: `media/icon.png` is the FeatherSpec logo (from the template's `featherspec-logo.png`, padded to
  256 × 256) — confirm it may be used for Studio or replace it.
- [ ] **Screenshots and links**: push `media/screenshots/` and `docs/` to the default branch of
  `GregorBiswanger/featherspec-studio` first; vsce rewrites the README's relative links to that repository.
- [ ] **Gallery banner, categories, keywords** in `package.json` read right to you.
- [ ] **Host suite** green on Windows at the release commit: `npm test`. Repeat only if the head moved.
- [ ] **Universal VSIX**: `npx @vscode/vsce ls` → only `dist/`, `media/` (icon, Activity Bar icon, the two tab icons), `package.json`,
  README, CHANGELOG, LICENSE; no `node_modules/`, no `.node` file.

## Trying the extension locally

1. **F5**: open this repository in VS Code, press F5 ("Run Extension"). A second window starts with the
   built extension; open a FeatherSpec project there (e.g. `C:\projects\test\tip-splitter`).
2. **VSIX**: `npx @vscode/vsce package` → `featherspec-studio-0.1.0.vsix`; install with
   *Extensions: Install from VSIX…* or `code --install-extension featherspec-studio-0.1.0.vsix`.
3. **Next step**: select a spec in the Specs view, click **Copy** on its next step and paste it into your assistant's chat.

## Discovery (0001)

- [ ] **AC-009 reload**: multi-root workspace with two projects → *Select Project*, pick one → *Developer:
  Reload Window* → the same project is active again (status bar entry names the current spec; the tooltip names the project and version), no question.
- [ ] **AC-022 Restricted Mode**: open a project in a new window, choose "Don't Trust" → status bar entry with
  name and version, *Select Project* works, Output "FeatherSpec Studio" lists the folder as in a trusted window.

## Shell (0005)

- [ ] **AC-019 live theme switch**: panel on the Board with a spec selected; switch Dark Modern → Light
  Modern → High Contrast → every part of the panel takes the new colours at once, all text readable.
- [ ] **AC-019 / OP-012 Light High Contrast**: contrast borders on nav items, rows and state boxes; active
  border on the current area and the selected row.
- [ ] **AC-009 reload**: panel on Board with 0003 selected → *Reload Window* → panel returns on the
  Board, the side panel still shows 0003 selected.
- [ ] **AC-017 Restricted Mode**: note "This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace."
  above the area; trust the folder → the note disappears without reopening the panel.

## Overview (0006, 0018)

- [ ] **AC-021 / §9**: in High Contrast, Light and Dark every state is told apart by its icon shape without colour
  (its name is the icon's tooltip in the narrower rows) and every Problem under Problems reads as a sentence; Now,
  Up next and Problems above the figures line, Activity collapsed below.
- [ ] **AC-022**: Tab, Enter and Space only → every figure, row, the "+ n more" link, the Problems and
  Activity headings and every activity entry shows a focus outline; Enter and Space each open the target area.
- [ ] **OP-12 (AC-016, AC-024)**: on a real project with many specs the content shows within about 1 s of
  opening and updates within about 0.5 s of saving a spec file.

## Board (0007, 0018)

- [ ] **AC-017 keyboard only**: Tab reaches the board, arrows move between cards, Enter or Space selects the
  card and shows the side panel (0019), the next Tab reaches the card's Copy, Enter copies (0017: Shift+F10
  opens no menu); the sort select works, a filter chip from an Overview drill-down clears with "Clear filters", every link of the detail works.
- [ ] **AC-018 screen reader** (NVDA or Narrator): Copy on a card announces "Copied" (0016); the card
  reads its next step (0017 replaced the move announcements).
- [ ] **AC-026**: board and detail in Light, Dark and High Contrast — text readable, focus outline visible on
  cards, buttons and links, long titles cut to two lines.

## Visual design (0013)

- [ ] **AC-017 taste**: the screenshots in `media/screenshots/` (or the real panel) are fit for a talk and the
  Marketplace page — calm, dense, native VS Code look. `spec-detail-light.png` shows this repository's own specs
  (internal criteria text, "Steps" counts of its own plans): keep it or retake it on `tip-splitter`.
- [ ] **AC-018 real VS Code**: Dark Modern, Light Modern, Dark High Contrast plus one live switch → colours,
  borders and focus outlines match the screenshots; nothing keeps the old theme.
- [ ] **README screenshots**: `media/screenshots/overview-dark.png` and `board-dark.png` are harness
  screenshots of the Overview and the Board taken at `77f585b` (Dark, 1400×900, two tabs, no selection); look
  at them against the head and retake them if the layout changed since.

## Set up FeatherSpec (0014)

- [ ] **M-1 look**: in a folder without a project, the S2 button "Set up FeatherSpec" in the Activity Bar view
  and in the panel looks and reads like Source Control's "Initialize Repository", in Dark Modern, Light Modern
  and Dark High Contrast (renews the S2 screenshots of 0013 AC-017).
- [ ] **M-2 real release**: on Windows 11 against the real GitHub release, a fresh `tip-splitter` folder becomes
  a project, and the Hands-On walkthrough runs from `/sdd-setup` on. Also confirms that `/releases/latest` names
  the release GitHub calls latest (A-007).
- [ ] **M-3 Restricted Mode**: in a real Restricted Mode window, "Set up FeatherSpec" refuses with the trust
  message and writes and downloads nothing (AC-004).
- [ ] **Live setup test** (automated, opt-in, real GitHub release into temp folders): PowerShell
  `$env:FEATHERSPEC_SETUP_LIVE='1'; npx vitest run --project node src/adapters/node/setupLive; Remove-Item Env:FEATHERSPEC_SETUP_LIVE`
  → 2 passed, one summary line per run (version, tag, counts, ms).

## Focus on visibility (0015)

- [ ] **AC-030 / M-1**: in a real VS Code window on `tip-splitter`: the Specs view lists the specs in its groups and the panel shows Overview and Board only; a spec's detail shows **Next step**, **Copy** puts the line on the clipboard and pasting it into the assistant's chat works; a Ready card's **Copy** puts the NS-7 line on the clipboard (0017); no command, setting or text offers to start an agent or a run.

## Honest signals (0016)

- [ ] **AC-025 / M-1**: preview harness screenshots in Dark, Light and High Contrast show the primary **Copy** and its label change without shift, the need line on a Backlog card, the collapsed format-note toggle, the problem badge and the S2 sentence in the view and the panel; on `tip-splitter` no problem marker shows without a real problem.

## The next step everywhere (0017)

- [ ] **AC-026 / M-1**: on `tip-splitter`, Hands-On walkthrough with your assistant, task "start the Ready spec": the Start line copied from the card works with no failed attempt; on an Active spec `/sdd-plan`, then `continue` in the same chat runs one step; the status bar names the spec you work on and its click copies (`Copied` for 2 s); Dark, Light and High Contrast show the card line and the Overview row readable; the card offers no way to move a spec.

## Overview and a compact Board (0018)

- [ ] **AC-031 / M-1**: in a real VS Code window on `tip-splitter`, in Dark, Light and High Contrast, with the
  panel at about 640 px and at about 1,240 px: Overview and Board show Now, Up next, Problems, the figures
  line and a collapsed Activity, and the Board shows at most two wide columns at 640 px with the other
  columns as strips, a collapsed Done with its toggle and cards of three rows; everything fits without
  vertical scrolling for the fixture, text stays legible and the panel header's tooltip shows the version and
  the update time. Compare with the screenshots from the preview harness.
- [ ] **0018 AC-015 board width**: at a 1240 px editor five wide columns and one strip fit without scrolling;
  at 640 px two wide columns and four strips do (200 to 360 px per column, 32 px per strip).

## The detail as a side panel (0019)

- [ ] **AC-022** *(Gregor or his delegate)*: preview-harness screenshots in Dark, Light and High Contrast of
  Board and Overview with the side panel of the `studio-0015` fixture at 1400x900 and 800x900. The side
  panel is at most 900 px tall with Format notes and Status history closed; at 800 px the drawer covers the
  right part of the board and a card focused under it by Tab or arrow scrolls clear; in the Overview every
  row with its next step and Copy and the figures line stay visible left of the drawer; nothing is cut off.
- [ ] In a real VS Code window: clicking an ID or a file name in the side panel opens the file beside the
  Studio, at the line of the ID, and the Studio stays visible; a card, an Overview row and an activity entry
  select in place without changing the area; Escape and the close button close the panel and return focus to
  the card or row.

## The native Specs tree (0020)

- [ ] **AC-022** *(Gregor or his delegate)*: on `tip-splitter` and on this repository, in Dark, Light and High
  Contrast at a sidebar width of 400 px, every state icon is told apart without colour, the description of every
  In progress and Ready row is visible and the badge is readable. In the Hands-On, copy a next step from the
  tree (inline Copy), paste it into the assistant's chat and see it work; select a row and see the detail open in the
  panel without taking focus; Open Spec and Open Plan open the file in the active group, beside the Studio when the
  Studio is the active tab.
- [ ] **Keyboard and screen reader**: `FeatherSpec Studio: Focus on Specs View` reaches the view; arrow keys walk
  the rows, Enter selects, Shift+F10 opens a row's context menu with Open Spec, Open Plan and Copy Next Step; the screen reader reads a row as one sentence with the state and the next step.

## Layout and signal polish (0022)

- [ ] **AC-019** *(preview harness, Gregor or his delegate; guideline 12)*: in Dark, Light and High Contrast, height
  800 px, at window widths 1600 px and 1000 px, a Studio panel of 920 px, at 800 px and at VS Code zoom level 2, with a
  spec selected, on this repository and `fs170-brownfield-mixed`, Overview and Board show: no title word split, every Copy fully visible and
  reachable by Tab, at most two filled buttons, paths broken only after a separator, whole Problem sentences, the warning
  on the collapsed Done strip, and each state told at a glance. Screenshots and verdict in the plan.
- [ ] **AC-020** *(real VS Code)*: at a sidebar width of 300 px in the three themes, on this repository,
  `fs170-brownfield-mixed` and `tip-splitter`, every tree row shows its command uncut, the `Done` group shows its
  Problem hint and the state icons differ by shape.
- [ ] **AC-021 (build part)** *(Gregor on `tip-splitter`)*: without asking, say which Copy you press first, where a
  Done spec's Problem shows and what `Ready` and `Up next` hold; the plan records the answers.
- [ ] **AC-025** *(preview harness, then Gregor)*: at 1600 px with 0015 selected, no two vertical scrollbars side by
  side; a width set by the divider returns after closing and selecting again and after a window reload; a double-click restores the
  default; at 800 px and at zoom level 2 the area shows alone, the detail alone with its back button and no divider.

## Go

- [ ] **Repository visibility**: the Marketplace page loads the README screenshots from
  `GregorBiswanger/featherspec-studio`. While the repository is private they do not show — make it public
  before the publish, or accept a page without pictures.
- [ ] **Trusted Publishing policy** (once): Marketplace publisher management → your publisher → *Trusted
  Publishing* → *Create*: repository owner `GregorBiswanger`, repository `featherspec-studio`, workflow
  `publish.yml`, no environment. For a private repository the workflow must run within 48 hours after that.
  Azure DevOps tokens (PAT) stop working for publishing on 2026-12-01, so no token is used here.
- [ ] **CHANGELOG date**: set the date of the 0.1.0 entry in CHANGELOG.md (`## [0.1.0] - Unreleased` becomes
  `## [0.1.0] - <release day>`) and commit it before the publish.
- [ ] All boxes ticked → Go → `gh workflow run publish.yml -f confirm=publish` (the workflow runs the unit
  suite and `npx @vscode/vsce publish --oidc`). Alternative without the workflow: `npx @vscode/vsce package`
  and upload the `.vsix` by hand on the publisher management page.
