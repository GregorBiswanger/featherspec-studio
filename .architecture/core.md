# Map: src/core (framework-free core)
# last reconciled: 2026-11-18 (0018)

## Internal pattern
- `src/core/<area>/` — one folder per spec; `<area>Service.ts` is the application service where the
  area has one; `testing/` holds that area's worlds and fakes (imported by tests only).
- `src/core/ports/<topic>.ts` — every port the core uses; adapters implement them.
- Areas and what they hold (moved from the `AGENTS.md` snapshot, 2026-11-17):
  - `ports` — read-only file system, spec source, file watch; host ports (status bar, output, state,
    UI, folders, marker watch, clock); runtime medium; shell (trust, UI memory, actions, model
    source); board (editor, clipboard); copyNextStep (status entry, step quick pick, Copy feedback; 0017); setting;
    setup (release archive, release HTTP, setup target, setup UI).
  - `discovery` (0001) — project verdicts, version line, active-project state, report model, controller, rerun scheduler.
  - `specs` (0002) — spec repository: file listing, spec and plan parsers, joins, diagnostics, live repository; every diagnostic carries a tier, problem or note (0016), set where it is emitted; compatibility findings are not emitted.
  - `lifecycle` (0003) — state derivation, readiness, contradictions, blocking conditions, plan in
    use, verification status, flow marker, status history, lifecycle service.
  - `runtime` (0004) — runtime store narrowed to the spec status history: writer lock, retention (90 days), store state; earlier run data removal.
  - `shell` (0005) — panel states and precedence, selection, remembered area, navigation request,
    spec rows, tree model, message router, shell service.
  - `overview` (0006, 0018) — Now and Up next rows, problems, figures and progress, activity,
    overview service (the open state of Activity lives here, reset with the last listener).
  - `board` (0007) — Board and spec detail view models: cards, progress, narrow columns and Done memory, card date (0018), filters
    and sorting, board UI state, open-file guard, detail sections, next step (NS rules, 0015; step view and short form, 0017), needs of a Backlog spec (0016), copy line, board service.
  - `copyNextStep` (0017) — current spec, project line, status entry view (text, tooltip, accessible text), Copy Next Step behaviour (click and command), quick pick items; `testing/` holds the entry world.
  - `setup` (0014) — the only writer and network user: release download and check, file classes, `.gitignore` and
    `settings.json` completions, apply, merge prompt, setup service; `testing/` holds the in-memory target and scripted HTTP.

## Task playbooks
- New host capability: port in `ports/<topic>.ts` → core use → `src/adapters/vscode/` implementation
  → wiring in `src/extension.ts`. Never import `vscode` or `fs` here (ESLint core blocks).

## Traps
- Wall-clock budget tests go in `*.timing.test.ts` (sequential Vitest project), never in a normal test file.
