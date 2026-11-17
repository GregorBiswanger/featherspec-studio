# Changelog

All notable changes to FeatherSpec Studio are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Studio focuses on visibility: it starts no agent. The Agent Center, the run commands, the provider settings and the `@github/copilot-sdk` dependency are removed. Studio names each spec's next FeatherSpec step with a **Copy** button; moving a Ready spec to Active shows that step instead of starting a run.
- The local store keeps only the spec status history (90 days, fixed). Data of earlier builds (`copilot-home`, `index.json`, `runs/`, the `featherspec-studio.agentCenter` state) is removed at the next start.

### Added

- Set up FeatherSpec: in a folder without a FeatherSpec project, Studio downloads the latest release from
  GitHub after your confirmation, creates the missing files, completes `.gitignore` and `.vscode/settings.json`,
  and parks files that differ from yours in `.featherspec-setup/` with a "Copy merge prompt" for your coding
  agent. It never overwrites or deletes a file of yours. This is the one place where Studio writes into your
  workspace and contacts the network.
- A folder with a `.featherspec-setup/` directory counts as incomplete until the merge is done.

## [0.1.0] - 2026-11-17

First release.

### Added

- Project discovery: recognises FeatherSpec projects at workspace folder roots, shows the active
  project and its FeatherSpec version in the status bar, and lets you pick one when there are several.
- Spec model: reads specs, plans, archived plans and parallel-worker return notes, keeps them
  current while files change, and reports what it cannot read as diagnostics.
- Lifecycle model: derives each spec's board state (Backlog, Ready, Active, Review, Done, Blocked)
  with the rule behind it, readiness checks and status history.
- Studio panel with the Activity Bar entry, keyboard navigation, theme support (Light, Dark,
  High Contrast) and explained empty and error states.
- Mission Control: spec counts per state, progress, attention list, agent runs and recent activity.
- Spec Board: six columns with filters and sorting; drag, "Move to…" and the command
  `FeatherSpec: Move Spec to…` check every move and refuse lifecycle moves with the reason.
- Spec Explorer: spec list and spec detail with foldable sections and "Open file".
- Agent start: moving a Ready spec to Active checks eight preconditions and starts an agent after
  one confirmation.
- Agent orchestrator: one open run per project, start and stop timeouts, resume of interrupted
  runs, error classes; commands `Stop Run` and `Resume Run`.
- Agent Center: run list, run detail, live timeline, answers to approvals and questions, cancel
  and resume, notifications for requests outside the view.
- Provider port with a deterministic fake provider for trying Studio without an agent.
- GitHub Copilot provider through the bundled Copilot SDK (requires the Copilot CLI 1.0.87 or newer).
- Local run history outside the workspace with secret masking, an age cap
  (`featherspec-studio.runHistory.maxAgeDays`) and the command `Clear Run History`.
