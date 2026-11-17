# Map: src/core (framework-free core)
# last reconciled: 2026-11-17

## Internal pattern
- `src/core/<area>/` — one folder per spec; `<area>Service.ts` is the application service where the
  area has one; `testing/` holds that area's worlds and fakes (imported by tests only).
- `src/core/ports/<topic>.ts` — every port the core uses; adapters implement them.
- Areas and what they hold (moved from the `AGENTS.md` snapshot, 2026-11-17):
  - `ports` — read-only file system, spec source, file watch; host ports (status bar, output, state,
    UI, folders, marker watch, clock); runtime medium; shell (trust, UI memory, actions, model
    source); board (start workflow, editor, move picks, move result); agent provider; orchestrator
    UI; agent start (orchestrator start, UI reveal); Agent Center (operations, UI, event signal); setting.
  - `discovery` (0001) — project verdicts, version line, active-project state, report model,
    discovery controller, rerun scheduler.
  - `specs` (0002) — spec repository: file listing, spec and plan parsers, joins, diagnostics, live repository.
  - `lifecycle` (0003) — state derivation, readiness, contradictions, blocking conditions, plan in
    use, verification status, transition check, flow marker, status history, lifecycle service.
  - `runtime` (0004) — runtime store: runs, run-change notification, events, masking, writer lock,
    retention, store state.
  - `shell` (0005) — panel states and precedence, selection, remembered area, navigation request,
    spec rows, tree model, message router, shell service.
  - `missionControl` (0006) — header, spec figures, progress, run source, run figures, attention
    list, recent activity, dashboard service.
  - `board` (0007) — Spec Board and spec detail view models: cards, progress, latest run, filters
    and sorting, board UI state, move requests, open-file guard, detail sections, board service.
  - `agentStart` (0008) — start prompt, run-start preconditions, start flow behind the board hand-off, orchestrator binding.
  - `providers` (0009) — provider vocabulary, registry, provider service (the port in front of
    adapters), setup with toggled registration, contract suite.
  - `orchestrator` (0011) — run tracker and transitions, error classes, start, stop, resume,
    answers, timeouts, result, spec-not-found flag, palette run commands.
  - `agentCenter` (0012) — timeline rows, run summary, run list and header, selection and filter
    memory, event signal wrapper, Agent Center service, actions, request notifier.

## Task playbooks
- New host capability: port in `ports/<topic>.ts` → core use → `src/adapters/vscode/` implementation
  → wiring in `src/extension.ts`. Never import `vscode`, `fs` or a provider SDK here (ESLint core blocks).
- New provider SDK: add it to `PROVIDER_SDKS` in `providers/testing/scan.ts` and the ESLint core block.

## Traps
- Wall-clock budget tests go in `*.timing.test.ts` (sequential Vitest project), never in a normal test file.
