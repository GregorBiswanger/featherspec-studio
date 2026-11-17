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
- [ ] **Host suite** green on Windows at the release commit: `npm test`, and once with
  `FEATHERSPEC_COPILOT_SMOKE=1` and a signed-in Copilot CLI. Last run 2026-11-17 on Gregor's machine
  (by the agent, through the bridge): `npm test` 29 + 1 + 1 passing, opt-in 32 passing, the opt-in suite
  against the unpacked VSIX 32 passing, `npm run test:unit` 2,152 + 11. Repeat only if the head moved.

## Trying the extension locally

1. **F5**: open this repository in VS Code, press F5 ("Run Extension"). A second window starts with the
   built extension; open a FeatherSpec project there (e.g. `C:\projects\test\tip-splitter`).
2. **VSIX**: `npx @vscode/vsce package` → `featherspec-studio-0.1.0.vsix`; install with
   *Extensions: Install from VSIX…* or `code --install-extension featherspec-studio-0.1.0.vsix`.
3. **Without Copilot**: settings `featherspec-studio.fakeProvider.enabled` = `true` and
   `featherspec-studio.defaultProvider` = `fake`; `featherspec-studio.fakeProvider.scenario` picks the run
   (`approval`, `input`, `long-run`, `failure:*`, …). The fake changes no file.
4. **Real Copilot run**: Copilot CLI 1.0.87+ installed and signed in (`copilot`, then `/login`),
   `defaultProvider` = `copilot`, then drag a Ready spec to Active and confirm with **Start**.

## Discovery (0001)

- [ ] **AC-009 reload**: multi-root workspace with two projects → *Select Project*, pick one → *Developer:
  Reload Window* → the same project is active again (status bar `FeatherSpec: <name> (<version>)`), no question.
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

- [ ] **AC-021 / §9**: in High Contrast, Light and Dark every state, attention reason and run status reads as a
  word (icon and colour only in addition); attention below the counts, Agent runs and Recent activity side by side.
- [ ] **AC-022**: Tab, Enter and Space only → every count, attention row, run row, activity entry and the
  diagnostics link shows a focus outline; Enter and Space each open the target area.
- [ ] **OP-12 (AC-016, AC-024)**: on a real project with many specs the content shows within about 1 s of
  opening and updates within about 0.5 s of saving a spec file.

## Spec Board (0007)

- [ ] **AC-017 keyboard only**: Tab reaches the board, arrows move between cards, Enter opens the detail,
  the next Tab reaches "Move to…", Enter opens its menu; filters, sort, "Clear filters", every "Open file" work.
- [ ] **AC-018 screen reader** (NVDA or Narrator): a refused move is read with its reason; Ready → Active
  announces the hand-off to the start workflow.
- [ ] **AC-026**: board and detail in Light, Dark and High Contrast — text readable, focus outline visible on
  cards, buttons and "Open file", descriptions cut to two lines.

## Start workflow (0008)

- [ ] **M-2 screen reader** (fake provider as above): move a Ready spec to Active by keyboard → dialog
  announced as "Start an agent on spec NNNN?", focus on Cancel, Tab cycles Show start prompt / Start / Cancel,
  Escape cancels; a refusal is an alert with one line per P-ID; a start-failure notice reads run ID and class,
  Open run / Dismiss work with Enter; the expanded prompt scrolls inside the dialog in a narrow panel.

## Agent Center (0012)

- [ ] **Live run** on `tip-splitter` with Copilot: events appear live, the timeline follows the newest row.
- [ ] **Approval**: a notification names the spec and "approval" with "Open in Agent Center"; "Approve once"
  answers once and the agent continues.
- [ ] **Cancel**: "Cancel run" asks once; confirm → the agent stops and the run shows Cancelled.
- [ ] **Restart**: reload or restart VS Code → same run and events, a formerly open run as Interrupted, the
  selected run still selected.
- [ ] **File changes**: the run's "File changes" list matches `git status` in `tip-splitter`.

## Copilot provider (0010)

- [ ] **M-01 signed out**: `copilot` → `/logout`, open the start dialog for a Ready spec → availability
  "not signed in" with the hint "Run `copilot` in a terminal and sign in, then retry."; no run starts. Note
  Copilot's error shape.
- [ ] **A-003**: signed in with `copilot` only (no `gh auth`), start a run → runs with the base directory
  `<globalStorage>/copilot-home`; if not signed in there, BR-09's fallback applies.
- [ ] **A-005**: read the log line "A-005 observation" of the opt-in smoke run → if reads run without a
  request, reword spec 0010 §8 and BR-14.
- [ ] **Universal VSIX**: `npx @vscode/vsce ls` → only `dist/`, `media/` (icon, Activity Bar icon), `package.json`,
  README, CHANGELOG, LICENSE; no `node_modules/`, no `@github/copilot-sdk-*`, no `.node` file.

## Visual design (0013)

- [ ] **AC-017 taste**: the screenshots in `media/screenshots/` (or the real panel) are fit for a talk and the
  Marketplace page — calm, dense, native VS Code look.
- [ ] **AC-018 real VS Code**: Dark Modern, Light Modern, Dark High Contrast plus one live switch → colours,
  borders and focus outlines match the screenshots; nothing keeps the old theme.
- [ ] **A-004 board width**: at a 1400 px editor the Blocked column sits partly behind the horizontal scroll
  (240 px minimum per column) — accept or ask for narrower columns.
- [ ] **AC-015 Plan line**: an Overview whose Plan line is `[x](x)` shows the file name and the same target as
  secondary text — accept the duplicate or not.

## Orchestrator texts (0011)

- [ ] **M-03**: read the refusal and continuation texts in `src/core/orchestrator/texts.ts` (also via
  *Stop Run* / *Resume Run* with no run: "No run is open." / "No run can be resumed.") → clear English you
  accept, including "An input answer is text." and the continuation text of spec 0011 OP-005.

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
