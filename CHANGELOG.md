# Changelog

All notable changes to FeatherSpec Studio are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

First release.

### Added

- Send on the follow-up line: where an assistant is chosen, the second prompt of a Next step (`Then: write the plan`
  after `/sdd-clarify`, the report and continue lines of an Active spec, `/sdd-lifecycle` after `/sdd-compile`) offers its
  own secondary Send to Copilot or Claude Code, with the same menu, its own Tip sentence and the spec attached where its
  step reads it, in the detail and in the Plan map header; the two steps are separated by about one line of space. Without
  an assistant the line keeps its Copy prompt.
- After you hand `/sdd-clarify` over (Send, Copy prompt or Copy Next Step) and the spec file then changes, a Backlog
  spec's next step is `Write the plan` · `/sdd-plan <spec>`, with Send attaching the spec, instead of the challenge
  again. The Studio remembers the hand-over per workspace, survives a reload and reads no text of the spec. The coach line
  is one sentence, for example `Tip: Use a new chat with a strong model.` (PD-092).
- Onboarding before `/sdd-setup`: in a project where FeatherSpec is installed but `/sdd-setup` has not run (the Memory Bank
  project brief still `TBD` and the architecture snapshot never reconciled), the empty Overview and Board show
  `Welcome to FeatherSpec` with the feather mark and offer `/sdd-setup` with Send or Copy prompt; the Specs tree, Up next
  and Copy Next Step name `/sdd-setup` too. Once setup has run, `No specs yet. Start with /sdd-specify` comes back
  without a reload.
- Send attaches the spec: Send puts the spec in the chat as a file, for GitHub Copilot through `attachFiles` and for Claude
  Code through an `@` mention, in every FeatherSpec version, and the button's tooltip and accessible name name the file
  (`Attaches 0002-x.md.`); no line shows under it. Every step that reads the spec attaches it; `/sdd-lifecycle` and `/sdd-overview` do not. FeatherSpec 1.11.0
  tells agents that an attached spec counts as read; an older version may read it a second time (PD-091). Copy prompt
  attaches nothing, and nothing is submitted.
- Send defaults and wording: the Send button opens a new chat for every step, and the current chat is in the menu, which
  checks the active choice. The open chat has one name, current or new chat. Short forms start with the first word of
  their intent (`Find blocker`, `Write plan`, `Start`, `Report`, `Move back to Ready`) without a visible "Next" (a hidden
  "Next step:" stays for screen readers). Now shows at most five rows, then "+ n more"; the coach line is shown once per
  spec and view, and the first Now row is no primary button. The ways to run a stage are three radio lines with In
  sequence as the default, and the explanations sit behind **About these ways**.
- The **Specs** view in the Activity Bar, a native tree of your specs in four groups: In progress,
  Ready, Backlog and Done (collapsed); a group that holds a problem says so. A row shows number, title
  and the short next step (the state where there is none), within 32 characters for label and
  description, with an icon and a colour per state and a tooltip that explains the row. A click selects the spec
  and shows its detail in the panel; an inline **Copy Next Step** and the context menu (Open Spec, Open Plan and Copy Next Step)
  act on the row. The badge counts the specs that wait for you (Review and Blocked),
  the toolbar has **Open**, **Refresh** and the gear (**Open Settings**), and the tree follows every file change within half a second.
- The next step everywhere: each spec's next FeatherSpec step as one line with a **Copy prompt** button, ready
  to paste into the AI assistant you work with. Studio starts no agent. The status bar shows the spec
  you work on (`<number> · <state> · <short form>`); a click copies its next step, and the command
  `FeatherSpec Studio: Copy Next Step` does the same and, without a current spec, offers a list. An
  Active spec with an open plan step gets two prompts: `Implement <ID> of <plan>` builds exactly that
  step, `/sdd-plan <spec>` has the agent report where the plan stands.
- The next step follows the plan: a spec whose plan has every step ticked is Review with `/sdd-compile` as its
  next step, whatever the plan's status line says. When a step has a `Verified:` line but no tick, and below
  FeatherSpec 1.11.0 also when the plan's `Current step` names an unfinished step other than the open one, the
  prompt `/sdd-plan <spec>` comes first, under "Let the agent report first — the plan and the ticks may differ", and the
  step to continue with second. A Ready spec starts with `Implement <ID> of <plan>`.
- Every next-step line says what it does: each prompt sits under its intent (for example "Have the
  result verified"), cards, rows and the quick pick show a short intent beside the short form of the
  prompt, and every tooltip shows the intents with the full prompts. The button is **Copy prompt**; it
  copies the prompt only. A coach line under the first prompt of the detail and in the first Now row says
  where to run it and with which kind of model, and **About this step** (`?`) explains the step in four
  short paragraphs; Escape closes only it.
- Three settings, under **FeatherSpec Studio** in the Settings UI, apply at once in every window:
  `showStepTips` (coach line and **About this step**, default on),
  `modelHints` (your own names for a `strong` and a `fast` model; Studio ships no
  model name) and `featherspec-studio.assistant` (`none`, `copilot`, `claudeCode`; default `none`). The last
  turns the **Copy prompt** of the detail's first line and of the first Now row into a split button, **Send to
  Copilot** or **Send to Claude Code**, while that assistant's extension is installed. It opens the assistant's
  chat with the prompt in its input and sends nothing; the arrow offers the other chat and **Copy prompt**. Where
  the chat cannot be opened, Studio copies the prompt and says so. The gear in the Specs view opens the
  settings. Without the setting nothing changes.
- The panel with three tabs. The **Overview** lists what is in progress (Now), what comes next (Up next),
  Problems as sentences, one line of figures and a collapsed Activity. The **Board** shows every
  spec as a card in six columns (Backlog, Ready, Active, Review, Done, Blocked): a column without a card
  is a narrow strip, Done is collapsed until you open it (remembered per workspace), a card has three
  rows (title; what matters in its state, problems and the day of the last change; next step), and you
  can sort by number, title or last change. Both work with the keyboard and in Light, Dark and High
  Contrast themes. The **Plan map** is the third tab (see below).
- The **Plan map**: a spec's plan as stages, each a row with the way its steps run (in order, or in parallel
  because they share no file) and a card per step with its files and the criteria it covers; a finished stage
  folds to its step IDs. For the stage you are on, **Ways to run stage n** offers three prompts to copy (in
  sequence, with subagents, with other agents) and one start line per step for parallel workers. The command
  `FeatherSpec Studio: Open Plan Map` opens it. The detail of a spec gets a **Plan** section with the same
  stages in short and a link to the map. Returned work (a worker's return note) shows on the step and leads
  to **Integrate the returned steps** as the next step. Studio starts no agent and writes no file.
- Plan map navigation and progress: a step ID in the side panel, in a Next step and in an Overview row is a link to its
  card in the Plan map (Ctrl or Cmd+click opens the plan file), **Show in Plan Map** in the Specs view's context menu does
  the same for the spec's next step, and the map's header shows the spec's Next step. Progress reads like `4 of 6 done · 67%`
  everywhere, step states have their own icon shapes, cards show what was verified or reported, and while a parallel
  worker is still out the `Integrate` line is not the primary button.
- The detail of a spec as a side panel next to the Overview and the Board, and beside the Plan map from 900 px, with a divider to set its width
  (remembered per workspace; Enter or a double-click resets it); below 900 px the area or the detail shows
  alone and a back button returns. It
  is a picture of the spec's situation: Next step, Problems, Progress (steps and the next open step,
  criteria verified and still open), Files, and folded Format notes and Status history. Every ID and
  file name is a link that opens the file beside the Studio at the line of the ID. Close it with its
  button or Escape.
- Layout and signals: one scrollbar per region; Overview rows follow the width of their own list, with the
  state as an icon; at most two filled buttons per view and icon buttons for the Copies in lists; a *Problem*
  reads as a sentence everywhere (the technical reason is the tooltip); paths and commands break only after
  a separator; a collapsed or filtered Board strip shows a warning when it hides a problem.
- Honest signals: Studio shows a *Problem* (a contradiction, an unreadable file, a duplicate number, a
  link to nothing) with a warning wherever the spec appears; *format notes* sit behind a collapsed
  toggle; what FeatherSpec itself writes is not reported. A Backlog spec shows what it still needs.
  States, times and the status history read as sentences.
- **Set up FeatherSpec**: in a folder without a FeatherSpec project, Studio downloads the latest release from
  GitHub after your confirmation, creates the missing files, completes `.gitignore` and `.vscode/settings.json`,
  and parks files that differ from yours in `.featherspec-setup/` with a "Copy merge prompt" for your coding
  agent. It never overwrites or deletes a file of yours. This is the one place where Studio writes into your
  workspace and contacts the network. A folder with a `.featherspec-setup/` directory counts as incomplete
  until the merge is done.
- Commands in the Command Palette: `FeatherSpec Studio: Open`, `FeatherSpec Studio: Open Overview`,
  `FeatherSpec Studio: Open Board`, `FeatherSpec Studio: Open Plan Map`, `FeatherSpec Studio: Focus on Specs View`,
  `FeatherSpec Studio: Copy Next Step`, `FeatherSpec Studio: Set Up FeatherSpec`, `FeatherSpec Studio: Select Project`
  (when the workspace holds several FeatherSpec projects), `FeatherSpec Studio: Refresh` (project discovery, then
  the specs again) and `FeatherSpec Studio: Open Settings`.
- Local spec status history outside the workspace, kept for 90 days.
- Restricted Mode: Studio only reads. It shows the project and the next step, and never runs workspace
  code or changes a file; Set up FeatherSpec needs a trusted workspace.
