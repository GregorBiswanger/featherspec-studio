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
- [ ] **Universal VSIX**: `npx @vscode/vsce ls` → only `dist/`, `media/` (icon, Activity Bar icon), `package.json`,
  README, CHANGELOG, LICENSE; no `node_modules/`, no `.node` file.

## Trying the extension locally

1. **F5**: open this repository in VS Code, press F5 ("Run Extension"). A second window starts with the
   built extension; open a FeatherSpec project there (e.g. `C:\projects\test\tip-splitter`).
2. **VSIX**: `npx @vscode/vsce package` → `featherspec-studio-0.1.0.vsix`; install with
   *Extensions: Install from VSIX…* or `code --install-extension featherspec-studio-0.1.0.vsix`.
3. **Next step**: select a spec in the Spec Explorer, click **Copy** on its next step and paste it into your assistant's chat.

## Discovery (0001)

- [ ] **AC-009 reload**: multi-root workspace with two projects → *Select Project*, pick one → *Developer:
  Reload Window* → the same project is active again (status bar entry names the current spec; the tooltip names the project and version), no question.
- [ ] **AC-022 Restricted Mode**: open a project in a new window, choose "Don't Trust" → status bar entry with
  name and version, *Select Project* works, Output "FeatherSpec Studio" lists the folder as in a trusted window.

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

- [ ] **AC-030 / M-1**: in a real VS Code window on `tip-splitter`: the panel shows Mission Control, Spec Board and Spec Explorer only; a spec's detail shows **Next step**, **Copy** puts the line on the clipboard and pasting it into the assistant's chat works; a Ready card's **Copy** puts the NS-7 line on the clipboard (0017); no command, setting or text offers to start an agent or a run.

## The next step everywhere (0017)

- [ ] **AC-026 / M-1**: on `tip-splitter`, Hands-On walkthrough with your assistant, task "start the Ready spec": the Start line copied from the card works with no failed attempt; on an Active spec `/sdd-plan`, then `continue` in the same chat runs one step; the status bar names the spec you work on and its click copies (`Copied` for 2 s); Dark, Light and High Contrast show the card line and the attention row readable; the card offers no way to move a spec.

## Honest signals (0016)

- [ ] **AC-025 / M-1**: preview harness screenshots in Dark, Light and High Contrast show the primary **Copy** and its label change without shift, the need line on a Backlog card, the collapsed format-note toggle, the problem badge and the S2 sentence in the view and the panel; on `tip-splitter` no problem marker shows without a real problem.

## Shell (0005)

- [ ] **AC-019 live theme switch**: panel on Spec Explorer with a spec selected; switch Dark Modern → Light
  Modern → High Contrast → every part of the panel takes the new colours at once, all text readable.
- [ ] **AC-019 / OP-012 Light High Contrast**: contrast borders on nav items, rows and state boxes; active
  border on the current area and the selected row.
- [ ] **AC-009 reload**: panel on Spec Board with 0003 selected → *Reload Window* → panel returns on Spec
  Board, Spec Explorer still has 0003 selected.
- [ ] **AC-017 Restricted Mode**: note "This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted workspace."
  above the area; trust the folder → the note disappears without reopening the panel.

## Dashboard — Mission Control (0006)

- [ ] **AC-021 / §9**: in High Contrast, Light and Dark every state and attention reason reads as a
  word (icon and colour only in addition); attention below the counts, Recent activity beside it.
- [ ] **AC-022**: Tab, Enter and Space only → every count, attention row, activity entry and the
  diagnostics link shows a focus outline; Enter and Space each open the target area.
- [ ] **OP-12 (AC-016, AC-024)**: on a real project with many specs the content shows within about 1 s of
  opening and updates within about 0.5 s of saving a spec file.

## Spec Board (0007)

- [ ] **AC-017 keyboard only**: Tab reaches the board, arrows move between cards, Enter opens the detail,
  the next Tab reaches the card's Copy, Enter copies (0017: Shift+F10 opens no menu); filters, sort,
  "Clear filters", every "Open file" work.
- [ ] **AC-018 screen reader** (NVDA or Narrator): Copy on a card announces "Copied" (0016); the card
  reads its next step (0017 replaced the move announcements).
- [ ] **AC-026**: board and detail in Light, Dark and High Contrast — text readable, focus outline visible on
  cards, buttons and "Open file", descriptions cut to two lines.

## Visual design (0013)

- [ ] **AC-017 taste**: the screenshots in `media/screenshots/` (or the real panel) are fit for a talk and the
  Marketplace page — calm, dense, native VS Code look.
- [ ] **AC-018 real VS Code**: Dark Modern, Light Modern, Dark High Contrast plus one live switch → colours,
  borders and focus outlines match the screenshots; nothing keeps the old theme.
- [ ] **A-004 board width**: at a 1400 px editor the Blocked column sits partly behind the horizontal scroll
  (240 px minimum per column) — accept or ask for narrower columns.
- [ ] **AC-015 Plan line**: an Overview whose Plan line is `[x](x)` shows the file name and the same target as
  secondary text — accept the duplicate or not.

## Go

- [ ] **Repository visibility**: the Marketplace page loads the README screenshots from
  `GregorBiswanger/featherspec-studio`. While the repository is private they do not show — make it public
  before the publish, or accept a page without pictures.
- [ ] **Trusted Publishing policy** (once): Marketplace publisher management → your publisher → *Trusted
  Publishing* → *Create*: repository owner `GregorBiswanger`, repository `featherspec-studio`, workflow
  `publish.yml`, no environment. For a private repository the workflow must run within 48 hours after that.
  Azure DevOps tokens (PAT) stop working for publishing on 2026-12-01, so no token is used here.
- [ ] All boxes ticked → Go → `gh workflow run publish.yml -f confirm=publish` (the workflow runs the unit
  suite and `npx @vscode/vsce publish --oidc`). Alternative without the workflow: `npx @vscode/vsce package`
  and upload the `.vsix` by hand on the publisher management page.
