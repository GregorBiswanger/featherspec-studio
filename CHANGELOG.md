# Changelog

All notable changes to FeatherSpec Studio are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The next step everywhere (0017): every Spec Board card and every *Needs attention* row shows
  "Next", the short form of the command and a **Copy** button; the status bar shows the spec you
  work on (`<number> · <state> · <short form>`) and a click copies its next step; the command
  `FeatherSpec Studio: Copy Next Step` does the same and, without a current spec, offers a list.
  An Active spec with an open plan step gets a second line, `continue`, for the same chat.

### Removed

- Drag and drop on the Spec Board, the card's "Move to…" menu (and Shift+F10) and the command
  `FeatherSpec: Move Spec to…` (0017). Studio moves no spec and checks no move; lifecycle moves
  belong to `/sdd-lifecycle`. The status bar no longer shows `FeatherSpec: <name> (<version>)` while
  a project is active; name and version are in its tooltip.

### Changed

- Honest signals (0016): the Studio shows a problem only when something is wrong. Diagnostics now
  carry a tier: *Problems* (contradictions, unreadable files, duplicate numbers, links to nothing)
  show on the card, in the header and in the detail; *format notes* sit behind a collapsed toggle;
  what FeatherSpec itself writes is no longer reported.
- A Backlog spec shows what it still needs instead of a readiness checklist; the lines for
  priority, the `/sdd-compile` verdict and spec dependencies are gone.
- Rule IDs (`S-READY`, `R-3`, ...) moved into tooltips; derived states read as sentences.
- Times and the status history read as sentences (`Today 21:56 — first seen as Review`).
- Copy is a primary button and confirms at the button; Dismiss is secondary.
- The empty-workspace view says what *Set up FeatherSpec* does.

## [0.1.0] - 2026-11-17

First release.

### Added

- Project discovery: recognises FeatherSpec projects at workspace folder roots, shows the active
  project and its FeatherSpec version in the status bar, and lets you pick one when there are several.
- Spec model: reads specs, plans, archived plans and parallel-worker return notes, keeps them
  current while files change, and reports what it cannot read as diagnostics.
- Lifecycle model: derives each spec's board state (Backlog, Ready, Active, Review, Done, Blocked)
  with the rule behind it, readiness checks and status history.
- Studio panel with three areas (Mission Control, Spec Board, Spec Explorer), the Activity Bar
  entry, keyboard navigation, theme support (Light, Dark, High Contrast) and explained empty and
  error states.
- Mission Control: spec counts per state, progress, the attention list and recent activity.
- Spec Board: six columns with filters and sorting; drag, "Move to…" and the command
  `FeatherSpec: Move Spec to…` check every move and refuse lifecycle moves with the reason.
- Spec Explorer: spec list and spec detail with foldable sections, "Open file" and the status history.
- Next step: the spec detail names each spec's next FeatherSpec step with a **Copy** button, ready
  to paste into the AI assistant you work with; moving a Ready spec to Active shows that step.
  Studio starts no agent.
- Set up FeatherSpec: in a folder without a FeatherSpec project, Studio downloads the latest release from
  GitHub after your confirmation, creates the missing files, completes `.gitignore` and `.vscode/settings.json`,
  and parks files that differ from yours in `.featherspec-setup/` with a "Copy merge prompt" for your coding
  agent. It never overwrites or deletes a file of yours. This is the one place where Studio writes into your
  workspace and contacts the network. A folder with a `.featherspec-setup/` directory counts as incomplete
  until the merge is done.
- Local spec status history outside the workspace, kept for 90 days. Data that pre-release test
  builds left in Studio's storage is removed at start.
