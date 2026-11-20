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
3. **Next step**: select a spec in the Specs view, read the intent of its next step, click **Copy prompt** and paste the prompt into your assistant's chat.

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

- [ ] **AC-030 / M-1**: in a real VS Code window on `tip-splitter`: the Specs view lists the specs in its groups and the panel shows Overview, Board and Plan map; a spec's detail shows **Next step**, **Copy prompt** puts the prompt on the clipboard and pasting it into the assistant's chat works; a Ready card's **Copy prompt** puts the NS-7 line on the clipboard (0017); no command, setting or text offers to start an agent or a run.

## Honest signals (0016)

- [ ] **AC-025 / M-1**: preview harness screenshots in Dark, Light and High Contrast show the primary **Copy prompt** and its label change without shift, the need line on a Backlog card, the collapsed format-note toggle, the problem badge and the S2 sentence in the view and the panel; on `tip-splitter` no problem marker shows without a real problem.

## The next step everywhere (0017)

- [ ] **AC-026 / M-1**: on `tip-splitter`, Hands-On walkthrough with your assistant, task "start the Ready spec": the Start line copied from the card works with no failed attempt; on an Active spec the two prompts of the detail do what 0021 AC-025 checks; the status bar names the spec you work on and its click copies (`Copied` for 2 s); Dark, Light and High Contrast show the card line and the Overview row readable; the card offers no way to move a spec.

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
  panel is at most 900 px tall with Format notes and Status history closed; the drawer of this item is
  superseded by 0022: below 900 px the detail shows alone with its back button, and the area (Board or
  Overview) shows alone without a selection; in the Overview every row with its next step and Copy and the
  figures line stay visible beside the side panel; nothing is cut off.
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

## Next step with intent and guidance (0021)

- [ ] **AC-022** *(preview harness, orchestrator, then Gregor in a real window; guideline 12)*: the detail and the Overview with the first Now row in
  Dark, Light and High Contrast at 1600 px and 1000 px window width, with the side panel open at its default and at
  the minimum width: no intent, prompt or coach line is cut; an open **About this step** stays inside its panel and
  covers no Copy prompt of its step; the `?` shows a visible focus outline. Screenshots in the plan.
- [ ] **AC-023** *(Gregor)*: both settings appear under "FeatherSpec Studio" in the Settings UI; **Show Step Tips**
  toggles the coach line and the `?` in the open panel at once; **Model Hints** offers `strong` and `fast` as text
  fields and the coach line shows the name you entered.
- [ ] **AC-024** *(Gregor on `tip-splitter`; the draft before `/sdd-plan` was OP-002)*: for each state present
  (Backlog without and with a plan, Ready, Active with an open step, Review, Blocked where present), say without asking
  what the copied prompt will do and where to run it; the plan records your answers.
- [ ] **AC-025** *(Gregor, with each of the two assistants of the spec; PD-072)*: on `tip-splitter`, the first prompt of an
  Active spec with an open step (`Implement <ID> of <plan>`) copied from the detail into a fresh chat builds exactly
  that plan step and stops (a test-review stop of the working agreement is allowed); after an interruption (code done,
  tick missing), the second prompt (`/sdd-plan <spec>`) in a fresh chat reports and brings the tick level.

## Layout and signal polish (0022)

- [ ] **AC-019** *(preview harness, Gregor or his delegate; guideline 12)*: in Dark, Light and High Contrast, height
  800 px, at window widths 1600 px and 1000 px, a Studio panel of 920 px, at 800 px and at VS Code zoom level 2, with a
  spec selected, on this repository and `fs170-brownfield-mixed`, Overview and Board show: no title word split, every Copy fully visible and
  reachable by Tab, at most two filled buttons, paths broken only after a separator, whole Problem sentences, the warning
  on the collapsed Done strip, and each state told at a glance (every icon shape distinct, the Problem warning included, and each state icon in its colour). Screenshots and verdict in the plan.
- [ ] **AC-020** *(real VS Code)*: at a sidebar width of 300 px in the three themes, on this repository,
  `fs170-brownfield-mixed` and `tip-splitter`, every tree row shows its command uncut, the `Done` group shows its
  Problem hint and the state icons differ by shape.
- [ ] **AC-021 (build part)** *(Gregor on `tip-splitter`)*: without asking, say which Copy you press first, where a
  Done spec's Problem shows and what `Ready` and `Up next` hold; the plan records the answers.
- [ ] **AC-025** *(preview harness, then Gregor)*: at 1600 px with 0015 selected the area takes about 60 % of the
  frame and the side panel about 40 % by default, the area's scrollbar sits at the divider and the side panel's scrollbar at the
  right edge, so no two vertical scrollbars stand side by side; back returns to the row or card that opened the detail; a width set by the divider returns after closing and selecting again and after a window reload; a double-click restores the
  default; at 800 px and at zoom level 2 the area shows alone, the detail alone with its back button and no divider.

## Plan map (0023)

- [ ] **AC-018** *(preview harness by the orchestrator, then Gregor; guideline 12)*: in Dark, Light and High Contrast at
  1600 px and 1000 px window width on `fs110-parallel-synthetic` and `studio-0015`, at 1600 px with the side panel at its
  default width: the Plan section and the Plan map cut no ID, prompt or start line; `‖` cards sit side by side and wrap,
  uncut, once the divider leaves the map less than two cards' width; at 1000 px (Studio panel below 900 px) the map shows
  alone; every Copy is fully visible and reachable by Tab. Screenshots and verdict in the plan.
- [ ] **AC-019 (build part)** *(Gregor, on a project with a `‖` stage)*: without the plan file, say which stages could run
  in parallel, why or why not, and which prompt you would copy; confirm or change the three ways, the two places and the
  texts; the plan records the answers.
- [ ] **AC-020** *(Gregor, with the assistants he uses)*: on a copy of `tip-splitter` re-cut with a `‖` stage, each stage
  prompt copied into a fresh chat does what its effect says and keeps the test-review stop; a start line in a second chat
  builds exactly its step and writes its return note; `/sdd-plan` then integrates it; the next-step line of a step of that
  stage builds only that step. A prompt that fails is replaced by the wording that worked.

## Send to the assistant (0024)

- [ ] **AC-016** *(preview harness by the orchestrator, then Gregor; guideline 12)*: the detail and the first Now row with
  GitHub Copilot and with Claude Code chosen, menu closed and open, in Dark, Light and High Contrast at 1600 px and
  1000 px window width, the side panel at its default and at its minimum width, and a Studio panel of 800 px: no text of
  the split button is cut, the open menu shows fully inside the panel without scrolling, both parts show a visible focus
  outline, each view holds at most two primary controls. Screenshots in the plan.
- [ ] **AC-017** *(Gregor, per assistant; record the versions)*: on `tip-splitter`, from the detail of an Active spec
  (NS-6) and of a Review spec (NS-5), the main part and each Send item open the named chat with the prompt in the input
  and nothing sent; after you send it yourself it runs as the FeatherSpec command or plan step it names; with GitHub Copilot
  record whether an unsent draft in the current chat is kept or replaced when you use **Send to the current chat** (OP-004).
  - [ ] GitHub Copilot: VS Code 1.147.0, GitHub Copilot Chat 0.75.0 (`GitHub.copilot-chat`). Re-run on a newer version before the release.
  - [ ] Claude Code: VS Code 1.147.0, Claude Code 2.1.327 (`anthropic.claude-code`). Re-run on a newer version before the release.
  - [ ] Codex: Copy prompt only, no Send; re-check when a Codex version accepts a prompt.
- [ ] **AC-018** *(Gregor)*: Settings UI shows "Assistant" under "FeatherSpec Studio" with its three labels and is reached
  by the gear of the Specs view; with the chosen assistant's extension disabled, or only Codex installed, every surface
  shows Copy prompt only and nothing names Codex; a workspace value overrides the user value in a trusted workspace and is
  ignored in Restricted Mode.
- [ ] **AC-019** *(Gregor)*: say without asking what Send to <Name> does (opens, fills, sends nothing) and which chat it
  uses; confirm or change the texts. The draft part passed (PD-076); the build part is AC-017.

## Plan-state-aware next step (0028)

- [ ] **AC-013** *(preview harness by the orchestrator; guideline 12)*: the detail and the first Now row of a spec whose plan
  is finished (Review, `/sdd-compile`) and of a spec showing Report first (below 1.11.0, `Current step` names an unfinished
  step other than the open one), in Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel
  open: no intent, prompt or coach line is cut, and the intent `Let the agent report first — the plan and the ticks may
  differ` wraps only between words. Screenshots in the plan.
- [ ] **AC-014** *(not run; closed by OP-002, tasks in AC-015)*: the two tasks across views are covered by AC-015.
- [ ] **AC-015** *(Gregor, on `tip-splitter` with GitHub Copilot and Claude Code, before the spec closes; record the versions)*:
  (a) an agent ticks the last step: whatever the status line says, the Board shows Review, and the tree, the Overview, the
  detail and the status bar show `/sdd-compile`; the prompt runs it in a new chat. (b) `Current step` names an unfinished
  step after the open one: on FeatherSpec 1.10.0 the report comes first and `/sdd-plan` levels the plan; on 1.11.0 the
  continue line comes first and `Implement <ID>` levels it. (c) On both, a Ready spec's `Implement T-001 of <plan path>`
  moves the pair to active and builds only T-001.

## Plan map navigation and progress (0025)

- [ ] **AC-022** *(preview harness by the orchestrator, then Gregor; guideline 12)*: Dark, Light and High Contrast at 1600 px
  and 1000 px window width with the side panel open at its default width, on `fs110-parallel-synthetic` (each variant),
  `fs-partial-return` and `studio-0015`: the header's Next step, the card rows, the percentages and the returned-work
  statements are cut nowhere; the step motifs are told apart without colour; the highlight is visible in each theme; an
  expanded card leaves its `‖` neighbour at its own height; at 1000 px the map alone shows the header's Next step.
  Screenshots and verdict in the plan.
- [ ] **AC-023** *(Gregor, click test; run 2026-11-19, tasks 1–3, K-1 became AC-027)*: starting in the Overview with 0001 of the
  parallel fixture: "Find out what T-004 does, whether it can run in parallel, how far the spec is, and copy what you would
  run next." Passes when you answer without opening a Markdown file and name the percentage; confirm or change the texts.
- [ ] **AC-024** *(Gregor, real use on `C:\projects\test\tip-splitter` before the spec closes)*: every step's information is
  reached without the Markdown file (chip, next open step, tree); Ctrl+click opens the plan at the step; after the agent
  ticks the last step the map header shows the check and the percentage first reads 100%.

## Send defaults and wording (0026)

- [ ] **AC-017** *(preview harness by the orchestrator, then Gregor; guideline 12)*: on `fs110-parallel-synthetic` without
  notes and a project with eight Now entries, Dark, Light and High Contrast at 1600 px and 1000 px window width with the
  side panel open at its default width: the Overview with the first Now row selected and not selected, and the Plan map
  with the ways expanded and each way checked. No short form, way line, tag or prompt is cut; at 1600 px each way takes one
  line; the expanded block with In sequence checked is at most half as tall as 0023's (about 400 px); the tagged way is told
  apart in High Contrast without colour; radios and `(?)` show a visible focus outline; arrow keys move the checked radio.
  Screenshots and verdict in the plan.
- [ ] **AC-018** *(Gregor, click test; run 2026-11-19, tasks 1–3, then ended; K-2, K-3, K-5 became AC-022–AC-024)*: from the
  Overview of `fs110-parallel-synthetic` without notes, with GitHub Copilot chosen: find out how stage 2 could run with other
  agents, copy the start line for T-004, and say which chat Send to Copilot opens for T-003 and what
  `Continue · Implement T-003` in Now means, without asking and without opening a Markdown file.
- [ ] **AC-019** *(Gregor, on `C:\projects\test\tip-splitter` before the spec closes; GitHub Copilot and Claude Code, record the versions)*:
  from the detail and the first Now row of the Active spec the main part opens a new chat with the prompt in the input and
  nothing sent, and a draft typed beforehand in the previous GitHub Copilot chat is still there (if not, tell Claude: the default
  target is decided again, 09 §3); `Send to the current chat` fills the current chat, record whether a draft there was kept;
  with that spec selected the Overview shows one coach line; on 0023's re-cut copy with a `‖` stage the start lines pasted
  after M-10's commit build their steps, and `/sdd-plan` integrates both without a finding.

## Attach the spec when sending (0027)

- [ ] **AC-016** *(preview harness by the orchestrator, then Gregor; guideline 12)*: the attachment line in the detail, the
  first Now row and the Plan map header, with GitHub Copilot (attaching switched on for the preview) and with Claude Code, for
  `0002-x.md` and `0024-send-next-step-to-assistant.md`, menu closed and open, in Dark, Light and High Contrast at 1600 px
  and 1000 px window width with the side panel open at its default width, and the detail alone at 800 px. No text is cut,
  the long name wraps after a separator, the chip is told apart in High Contrast without colour, nothing moves when the
  feedback shows. Screenshots and verdict in the plan.
- [ ] **AC-017** *(Gregor, on `C:\projects\test\tip-splitter` before the spec closes; with each assistant set, GitHub Copilot and Claude Code; record each version against V-3's: VS Code 1.147.0, GitHub Copilot Chat 0.75.0, Claude Code 2.1.327, and FeatherSpec's)*:
  with FeatherSpec 1.11.0 and the assistant set, for a Backlog spec (`/sdd-clarify`) and the Active spec (`Implement T-00x`): the
  main part and each Send item open the chat with the prompt in the input and a chip with the file name the line named,
  nothing submitted; after you submit, the agent's tool calls show no read of the spec file; Copy prompt pastes the line
  without `@`. On a copy at FeatherSpec 1.10.0 the chip is there too (PD-091: attached in every version).
- [ ] **AC-017, GitHub Copilot** *(same run, with GitHub Copilot; PD-091 sets `attachesSpec` to true for it)*:
  the chip, nothing submitted; a re-read of the spec after you submit is accepted (PD-091), note it.
- [ ] **AC-018** *(not run: the click test ended before it, 13; the question moves to AC-017)*: starting in the Overview, find
  out which file goes along when you use Send to Copilot on the next step of 0002, what goes along when you copy the prompt, and
  whether the Plan map's header sends the same.
- [ ] **AC-020** *(Gregor or the orchestrator, before the spec closes; 12 D4-4)*: with the largest spec of this repository's
  `.specs/` (`0022-layout-and-signal-polish.md`, about 43 KB) on FeatherSpec 1.11.0 and each attaching assistant, run
  `/sdd-clarify` in a new chat once by Send with the attachment and once by Copy prompt; record both runs' context use and
  tool calls. It passes when the attached run reads the spec file not at all, uses no more context than the other, and its
  findings hold every blocking finding of the other; else that assistant goes to no attachment.
- [x] **C-2, not needed** (PD-091, Gregor 2026-11-20): GitHub Copilot and Claude Code both attach in every FeatherSpec version
  (`attachesSpec` is true for both in `src/core/assistant/assistants.ts`; there is no attach version and no gate). The
  double-load risk with a FeatherSpec older than 1.11.0 is accepted; `NEWEST_KNOWN` (0002) stays as it is.

## Onboarding before setup (0029)

- [ ] **AC-013** *(preview harness by the orchestrator; guideline 12)*: the Overview and the Board of `fs-setup-not-run`, and
  the Overview of `fs-setup-done-no-specs`, in Dark, Light and High Contrast at 1600 px and 1000 px window width with the side
  panel open and Send offered. The feather glyph is visible in each theme, no text or button is cut, no word breaks inside
  itself, and glyph, heading, body and action stand together in that order in one container. Screenshots go into the plan.
- [ ] **AC-014** *(Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and with Claude Code; note the versions)*:
  after *Set up FeatherSpec* the Studio welcomes you and offers `/sdd-setup`; Send puts it into the assistant; after
  `/sdd-setup` the empty state reads `No specs yet. Start with /sdd-specify` without a reload.

## Clarified step, quiet attachment, Tip sentence (0030)

- [ ] **AC-012** *(preview harness by the orchestrator; guideline 12)*: the detail and the Up next row of a Backlog spec,
  before and after the clarify switch, with Send and the attachment offered, in Dark, Light and High Contrast at 1600 px and
  1000 px window width with the side panel open. No attachment line shows, no text or button is cut, no word breaks inside
  itself, and the Tip sentence wraps only between words. Screenshots go into the plan.
- [ ] **AC-013** *(Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and with Claude Code; note the versions)*:
  after Send of `/sdd-clarify` and the challenge, the Next step reads `Write the plan` · `/sdd-plan …` without a reload, as
  a Send that attaches the spec; no attachment line shows; the coach reads as a Tip sentence.

## Send on the follow-up line (0031)

- [ ] **AC-008** *(preview harness by the orchestrator; guideline 12)*: the detail of a Backlog spec (NS-9) and of an Active
  spec with an open step (NS-6-open) and the Plan map header of the latter, with GitHub Copilot and Claude Code, in Dark,
  Light and High Contrast at 1600 px and 1000 px window width with the side panel open. One blue primary, two split buttons
  of the same size, each with its Tip, a visible gap of about one line before `Then: ...`, no text or button cut, no word
  broken inside itself. Screenshots go into the plan.
- [ ] **AC-009** *(Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and with Claude Code; note the versions)*:
  on the Backlog spec, `Then: write the plan` offers a grey Send that opens a chat with `/sdd-plan ...` and the spec
  attached; its menu holds new chat, current chat (GitHub Copilot) and Copy prompt; its Tip reads as a sentence under it; the
  two steps read as separate blocks.

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
