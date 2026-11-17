# Changelog

All notable changes to FeatherSpec Studio are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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
