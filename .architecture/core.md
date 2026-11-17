# Map: src/core (framework-free core)
# last reconciled: 2026-11-17

## Internal pattern
- `src/core/<area>/` — one folder per spec; `<area>Service.ts` is the application service where the
  area has one; `testing/` holds that area's worlds and fakes (imported by tests only).
- `src/core/ports/<topic>.ts` — every port the core uses; adapters implement them.
- Areas and what they hold (moved from the `AGENTS.md` snapshot, 2026-11-17):
  - `ports` — read-only file system, spec source, file watch; host ports (status bar, output, state,
    UI, folders, marker watch, clock); runtime medium; shell (trust, UI memory, actions, model
    source); board (editor, move picks, move result, clipboard); setting;
    setup (release archive, release HTTP, setup target, setup UI).
  - `discovery` (0001) — project verdicts, version line, active-project state, report model, controller, rerun scheduler.
  - `specs` (0002) — spec repository: file listing, spec and plan parsers, joins, diagnostics, live repository.
  - `lifecycle` (0003) — state derivation, readiness, contradictions, blocking conditions, plan in
    use, verification status, transition check, flow marker, status history, lifecycle service.
  - `runtime` (0004) — runtime store narrowed to the spec status history: writer lock, retention (90 days), store state; earlier run data removal.
  - `shell` (0005) — panel states and precedence, selection, remembered area, navigation request,
    spec rows, tree model, message router, shell service.
  - `missionControl` (0006) — header, spec figures, progress, attention
    list, recent activity, dashboard service.
  - `board` (0007) — Spec Board and spec detail view models: cards, progress, filters
    and sorting, board UI state, move requests, open-file guard, detail sections, next step (NS rules, 0015), board service.
  - `setup` (0014) — the only writer and network user: release download and check, file classes, `.gitignore` and
    `settings.json` completions, apply, merge prompt, setup service; `testing/` holds the in-memory target and scripted HTTP.

## Task playbooks
- New host capability: port in `ports/<topic>.ts` → core use → `src/adapters/vscode/` implementation
  → wiring in `src/extension.ts`. Never import `vscode` or `fs` here (ESLint core blocks).

## Traps
- Wall-clock budget tests go in `*.timing.test.ts` (sequential Vitest project), never in a normal test file.
