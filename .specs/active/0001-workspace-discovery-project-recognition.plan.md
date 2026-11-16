# Plan — Workspace Discovery & Project Recognition

**Spec:** [0001-workspace-discovery-project-recognition.md](0001-workspace-discovery-project-recognition.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-003

## Approach

Everything with behaviour lives in the framework-free core and is proven with Vitest:
- the marker verdicts and the version line, on fixture folders
- the active-project state and the report model
- a discovery controller that depends only on small host ports: status bar, Output channel, workspace state, UI (quick pick, notification, open link), folder list with change events, marker watch events, clock

`src/adapters/vscode/*` then implements those ports with the real API and as close to zero logic as possible, and
`src/extension.ts` only composes. T-001 also brings the test toolchain (`npm run test:unit`) and the layout later
specs reuse (`src/core/ports`, `src/core/<feature>`, `src/adapters/{node,vscode}`, `test/fixtures`), per
ADR-001 §1/§12. Per-layer tsconfigs (ADR-001 §1) wait for the webview layer (0005). The `vscode` import ban in
`core/` is enforced by ESLint from T-001 on. Memory Bank files touched: `techContext.md`,
`systemPatterns.md`, `activeContext.md` (T-008).

**Quality gates:** per step `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit`
(exists from T-001), plus `npm run compile` (esbuild bundle) on adapter steps. Every `Verify:` runs in
this environment.

**Pre-done gate (not per step):** `npm test`, the extension-host smoke suite written in T-009
(`src/test/discovery.smoke.test.ts`), runs on CI (T-008 workflow, `xvfb-run -a npm test` on Linux) and on
Gregor's Windows machine. It cannot run here: the VS Code download (update.code.visualstudio.com) is
blocked (Gregor, 2026-11-16). It must be green before `/sdd-lifecycle` moves the spec to `done/`, together with
the manual checks AC-009 (reload) and AC-022 (Restricted Mode).

**Re-cut 2026-11-16, before any step started (Gregor):** stage 3 originally verified T-005…T-007 with
`npm test`. That stage now holds core controller steps, the adapters moved to the appended T-009, and CI
joined T-008. No ID was renumbered.

## Research

- Survey (2026-11-16): `src/extension.ts` is the `yo code` scaffold (`helloWorld`), `activationEvents: []`,
  no unit runner. `tsconfig.json` has `rootDir: src` and no `include`, so any `.ts` outside `src/`
  breaks `tsc`. Unit tests therefore sit next to the code and the Vitest config is `.mjs`. Host tests are
  `out/test/**/*.test.js` (`.vscode-test.mjs`). No `publisher` in `package.json`, so host tests
  find the extension by `packageJSON.name`. Node 22.23.4 locally. Samples in `/home/claude/samples/`
  carry `FeatherSpecVersion:` at line 28 with a trailing `# comment`, and none has `.claude/`.
- Decisions taken at the checkpoint (Gregor, 2026-11-16): OP-005 → activation by
  `workspaceContains:AGENTS.md` + `workspaceContains:.specs` + Studio commands, no
  `onStartupFinished` (spec §15 and AC-013 revised). AC-022 → manifest unit test plus Gregor's manual
  check. Vitest + vite approved as devDependencies for T-001.
- Assumption: `workspaceContains:.specs` (no glob characters) matches a directory, because the
  host's `exists` check is used for plain names. The T-009 smoke suite proves it at the pre-done gate (`incomplete-specs-only` fixture); until then it is an assumption.
- [npm registry: vitest](https://www.npmjs.com/package/vitest) via `npm view`: 5.1.0 (2026-11-02),
  engines Node `^22.12.0 || ^24 || >=26`, required peer `vite` (8.3.8 latest, Node `>=22.12`),
  `exports["."].require.types` present (so a typed import works under `module: Node16`). Retrieved 2026-11-16.
- [Vitest config](https://vitest.dev/config/): `vitest.config.{ts,mts,cts,js,mjs,cjs}`, `defineConfig`
  from `vitest/config`. [include](https://vitest.dev/config/include) default `**/*.{test,spec}.?(c|m)[jt]s?(x)`,
  so an explicit include is needed to keep `src/test/**` host tests out.
  [environment](https://vitest.dev/config/environment) default `'node'`. Retrieved 2026-11-16.
- [Activation events](https://code.visualstudio.com/api/references/activation-events): `workspaceContains`
  is checked "whenever a folder is opened"; `onStartupFinished` not used (OP-005). Retrieved 2026-11-16.
- [VS Code 1.146.0 workspaceContains.ts](https://raw.githubusercontent.com/microsoft/vscode/1.146.0/src/vs/workbench/services/extensions/common/workspaceContains.ts):
  plain names are checked with `exists(joinPath(folder, name))` and no timeout. Globs go through a file search (7 s
  timeout). [extHostExtensionService.ts](https://raw.githubusercontent.com/microsoft/vscode/1.146.0/src/vs/workbench/api/common/extHostExtensionService.ts):
  re-checked on `onDidChangeWorkspace` for added folders only. Retrieved 2026-11-16.
- `@types/vscode` 1.146.0 `index.d.ts` (local copy), `createFileSystemWatcher`: simple non-recursive patterns are
  recommended (`files.watcherExclude` applies only to recursive watchers), folder deletes are folded
  into one event, and event path casing follows the workspace folder. `workspaceState` is a Memento for the current
  workspace. Checked 2026-11-16.
- [Common capabilities: data storage](https://code.visualstudio.com/api/extension-capabilities/common-capabilities):
  "VS Code manages the storage" for `workspaceState`. It is not inside the workspace folder, which AC-011's
  tree check proves in T-006. Retrieved 2026-11-16.
- [Workspace Trust guide](https://code.visualstudio.com/api/extension-guides/workspace-trust):
  `untrustedWorkspaces: { supported: 'limited', description }`. Local `@vscode/test-electron` 3.1.0
  `out/runTest.js:64` always passes `--disable-workspace-trust`, so AC-022 cannot run in a host test. Checked 2026-11-16.
- `@vscode/test-cli` 0.0.15 `out/config.d.cts` (local): per-config `label`, `workspaceFolder` (folder
  or `.code-workspace`), `launchArgs`, `files`. Checked 2026-11-16.
- Fixture context safety: [Claude Code memory](https://code.claude.com/docs/en/memory) reads
  `CLAUDE.md`, not `AGENTS.md`, and loads nested `CLAUDE.md` on demand. Fixtures therefore carry no `CLAUDE.md` with
  content, and the hand-made `CLAUDE.md` fixture holds one inert line.
  [Copilot settings](https://code.visualstudio.com/docs/copilot/reference/copilot-settings):
  `chat.useNestedAgentsMdFiles` defaults to `false` and is experimental. Retrieved 2026-11-16.

## Stages

1. T-001 → T-002 — core verdicts and version line on fixtures, with the unit toolchain
2. T-003 → T-004 — active-project state and report model (core)
3. T-005 → T-006 → T-007 — discovery controller against fake host ports: activation and display, commands, live re-detection (core)
4. T-009 — VS Code adapters, manifest, composition root, host smoke suite (written, not run here)
5. T-008 — docs sync, CI workflow, final gates

No parallel stage: stages 1–3 all live in `src/core/discovery` (one module), T-009 implements the ports
T-005…T-007 define, and T-008 documents the result.

## Steps

### T-001 — Unit toolchain, layout and marker verdicts

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-006
- **Do:** devDependencies `vitest@^5.1.0` + `vite@^8.3.8` (approved 2026-11-16). Script
  `"test:unit": "vitest run"`, `vitest.config.mjs` with `include: ['src/**/*.test.ts']` and
  `exclude: ['src/test/**', ...configDefaults.exclude]`. ESLint `no-restricted-imports` bans `vscode` in
  `src/core/**`. `.vscodeignore` gets `test/**` and `vitest.config.mjs`. Port
  `src/core/ports/readOnlyFileSystem.ts` (`stat` kind/absent, `readText`, no write members). Adapter
  `src/adapters/node/nodeFileSystem.ts`. `src/core/discovery/classifyFolder.ts`: BR-01…BR-04,
  verdict + legacy + missing-marker diagnostics (AC-003), root paths only (AC-006).
  `classifyFolder.test.ts` with the AC IDs in the test names.
  Fixtures under `test/fixtures/`:
  - `fs110-de-active-review` (copy of `samples/tip-splitter`)
  - `not-fs-agents-only`
  - `not-fs-speckit` (`specs/` + `.specify/`)
  - `not-fs-memory-bank-only`
  - `not-fs-claude-md-only`
  - `incomplete-specs-only`
  - `incomplete-agents-only`
  - `fs-legacy-unstamped` (one-line `.claude/commands/sdd-plan.md`)
  - `nested-project` (markers only in `sub/`)

  Every `.specs/` gets a `README.md`, because git drops empty folders.
- **Verify:** `npx vitest run src/core/discovery/classifyFolder.test.ts` (red via `Not implemented` stub, then green) + per-step gates
- [x] **Verified (T-001):** 2026-11-16 — red: `npx vitest run src/core/discovery/classifyFolder.test.ts` 14/14 failed with `Not implemented` (stub); green: 14/14 passed. Gates: `npx eslint src --max-warnings 0` 0 findings, `npx tsc --noEmit` 0 errors, `npm run test:unit` 14 passed. Negative control: a temporary `import 'vscode'` in `src/core/ports` made eslint fail (`no-restricted-imports`), then removed.
- **Notes:** `tsconfig.json` got `skipLibCheck: true`: vitest's `index.d.cts` otherwise fails `tsc` with TS1479 under Node16. `testing/memoryFileSystem.ts` and `testing/fixtures.ts` were added here (not T-002) because the negative controls need them; the port also has `readDirectory` (BR-02 needs the `.claude/commands` listing). Reading of BR-07/M1 (assumption): the version line must start the line (leading blanks allowed); `FeatherSpecVersion:` mid-sentence does not count. `vitest.config.mjs` also gets `environment: 'node'`.

### T-002 — Version line, unreadable files, one run over all folders

- **Covers:** AC-011, AC-012, AC-017, AC-018, AC-021
- **Do:** `src/core/discovery/versionLine.ts` implements BR-07: first matching line, first token, comment ignored,
  empty value means "unknown" plus a diagnostic, a second line adds a diagnostic, a non-semver value is kept as written plus a diagnostic.
  `src/core/discovery/discoverWorkspace.ts` builds the discovery result (§8) for a folder list:
  - one entry per root-folder URI (BR-05 comparator injected: case-insensitive on Windows)
  - a read error makes that folder *not a project* with its reason, and the other folders still finish (AC-017)

  Test-only in-memory port `src/core/discovery/testing/memoryFileSystem.ts` for the variants and the
  read error. Tests:
  - AC-018 timing: 5 fixture folders through the Node adapter, under 2 s
  - AC-011: fixture tree (paths, sizes, mtimes) unchanged after discovery
- **Verify:** `npx vitest run src/core/discovery` (red first, then green) + per-step gates
- [x] **Verified (T-002):** 2026-11-16 — red: `npx vitest run src/core/discovery` 17 failed with `Not implemented` (stubs for versionLine and discoverWorkspace), 15 passed (T-001 tests + the AC-011 negative control, which is a control by design); green: 33/33 passed after the last test addition. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 3 files, 33 passed.
- **Notes:** Version diagnostics are also written for `incomplete` folders that have a stamped AGENTS.md (AC-021 says 'the folder'); `not-a-project` folders have no version line. A read error of any kind during classification (not only AGENTS.md) makes the folder `not-a-project` with the reason (AC-017). Memory FS and fixture helper already came with T-001.

### T-003 — Active-project state and status bar model

- **Covers:** AC-007, AC-008, AC-009, AC-010, AC-014, AC-020
- **Do:** `src/core/discovery/activeProject.ts` is a pure function (discovery result, remembered URI, optional
  user selection) → active project, value to remember, status bar model (hidden | text + click
  command). It implements BR-06/PD-033 and the readings (b) and (c) of spec OP-003. `activeProject.test.ts` covers:
  - single → auto-active and remembered
  - several → "Select FeatherSpec project"
  - remembered lost → "FeatherSpec project not found" and no other active project
  - remembered back → active again
  - name + version, "unknown" for legacy
  - nothing reported → hidden
- **Verify:** `npx vitest run src/core/discovery/activeProject.test.ts` (red, then green) + per-step gates
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Output block, select list and notification model

- **Covers:** AC-003, AC-008, AC-015, AC-016, AC-017
- **Do:** `src/core/discovery/report.ts` provides:
  - the Output block lines per run: per folder path, verdict, version and diagnostics; the missing markers named; the read-error reason; the hint "open the project folder itself" for *not a project*
  - the select-list items: every *project*, never *incomplete*, one per folder
  - the no-project notification model: the two texts, the actions "Open setup guide" (A-005 URL) and "Refresh"

  `report.test.ts`.
- **Verify:** `npx vitest run src/core/discovery/report.test.ts` (red, then green) + per-step gates
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Discovery controller: activation run, status bar, Output channel

- **Covers:** AC-007, AC-014, AC-016, AC-019, AC-020
- **Do:** `src/core/ports/host.ts` defines the small host ports:
  - `StatusBarPort` (show text + command, hide)
  - `OutputPort` (append block)
  - `WorkspaceStatePort` (get/set remembered URI)
  - `WorkspaceFoldersPort` (list + change event)
  - `ClockPort`

  `src/core/discovery/discoveryController.ts`: `start()` runs discovery without user action, renders
  the status bar from T-003, writes the Output block from T-004 and remembers an auto-activated
  project. No trust guard. Fakes in `src/core/discovery/testing/fakeHost.ts`.
  `discoveryController.test.ts` uses fixtures through the Node adapter:
  - one project → active, remembered, name + version shown
  - no project or incomplete → status bar hidden, nothing written to the UI port
  - Output block per folder
- **Verify:** `npx vitest run src/core/discovery/discoveryController.test.ts` (red, then green) + per-step gates
- [ ] **Verified (T-005):** —
- **Notes:** re-cut 2026-11-16 (was: host wiring verified by `npm test`).

### T-006 — Controller commands: select, refresh, notification, remembering

- **Covers:** AC-003, AC-008, AC-009, AC-010, AC-011, AC-015
- **Do:** `src/core/ports/host.ts` gets a `UiPort` (`showQuickPick`, `showNotification`, `openExternal`).
  The controller gets:
  - `selectProject()`: list from T-004, incomplete never listed, choice remembered
  - `refresh()`
  - the status bar click (= select)
  - no project → notification with "Open setup guide" (A-005 URL via `openExternal`) and "Refresh"
  - no folder → "Open a folder to use FeatherSpec Studio"

  Tests:
  - AC-009: a new controller on the same fake workspace state restores the active project without asking
  - AC-010: remembered project lost and back
  - AC-011: fixture tree unchanged after `start`/`refresh`/`selectProject` through the Node adapter
- **Verify:** `npx vitest run src/core/discovery/discoveryController.test.ts` (red, then green) + per-step gates
- [ ] **Verified (T-006):** —
- **Notes:** re-cut 2026-11-16 (was: host commands verified by `npm test`).

### T-007 — Live re-detection in the controller

- **Covers:** AC-012, AC-013
- **Do:** `src/core/ports/host.ts` gets a `MarkerWatchPort`: per folder, events for root `AGENTS.md` (create, change, delete)
  and root `.specs` (create, delete). `src/core/discovery/rerunScheduler.ts`: coalescing with about 200 ms debounce (ADR-001
  §9) on the `ClockPort`, latest state wins, no overlapping runs. The controller subscribes to folder changes
  and marker events and re-subscribes watches for added and removed folders. Vitest with fake timers and a mutable
  in-memory file system covers:
  - burst of changes → one rerun, final status bar + newest block match the final state
  - one entry per folder
  - no `.specs/` content event exists in the port (inside changes cannot trigger)
- **Verify:** `npx vitest run src/core/discovery` (red, then green) + per-step gates
- [ ] **Verified (T-007):** —
- **Notes:** re-cut 2026-11-16 (was: watchers verified by `npm test`).

### T-009 — VS Code adapters, manifest, composition root, smoke suite

- **Covers:** AC-019, AC-022 (and the host wiring of AC-007…AC-016, proven at the pre-done gate)
- **Do:**
  - `package.json`:
    - `activationEvents`: `workspaceContains:AGENTS.md`, `workspaceContains:.specs`
    - `capabilities.untrustedWorkspaces: { supported: 'limited', description }`, `virtualWorkspaces: false`
    - `extensionKind: ["workspace"]`
    - commands "FeatherSpec Studio: Select Project" and "FeatherSpec Studio: Refresh Project Discovery"; `helloWorld` removed
  - `src/adapters/vscode/`, one thin file per port, no logic beyond API mapping:
    - `vscodeFileSystem.ts` (`workspace.fs`)
    - `statusBar.ts`
    - `outputChannel.ts`
    - `workspaceState.ts`
    - `ui.ts`
    - `workspaceFolders.ts`
    - `markerWatch.ts` (`RelativePattern(folder, 'AGENTS.md')`, `RelativePattern(folder, '.specs')`, non-recursive)
  - `src/extension.ts` composes and registers the commands; `activate` returns an internal snapshot for the smoke suite
  - Tests:
    - `src/adapters/vscode/manifest.test.ts` (Vitest, reads `package.json` only): activation events, capabilities, commands (AC-019, AC-022)
    - written, not run here: `.vscode-test.mjs` copies fixtures to a temp multi-root workspace; `src/test/discovery.smoke.test.ts` replaces the sample test with activation on the fixture workspace, one status bar + Output check, and one `AGENTS.md` create → rerun (watcher wiring)

  Manual for Gregor: Restricted Mode (AC-022), window reload (AC-009).
- **Verify:** `npx vitest run src/adapters/vscode/manifest.test.ts` (red, then green) + `npm run compile` + `npm run compile-tests` (smoke suite type-checks) + per-step gates
- [ ] **Verified (T-009):** —
- **Notes:** appended 2026-11-16 in the re-cut; runs before T-008.

### T-008 — Docs sync and final gates

- **Covers:** AC-001…AC-004, AC-006…AC-022 (re-proven by the full unit gate run)
- **Do:**
  - `.github/workflows/ci.yml`: Ubuntu + Windows matrix; `npm ci`, eslint, tsc, `npm run test:unit`, `npm run compile`, `npm test` (Linux via `xvfb-run -a`). The host suite runs there once the repo is on GitHub.
  - `README.md`: what discovery does, the commands, the activation rule (OP-005), any Remote/WSL/Container limitation found (DoD)
  - `techContext.md`: Vitest + vite, `test:unit` exists, `test/fixtures/`, `npm test` as the pre-done gate on CI and Windows (blocked in this environment), the manual checks for AC-009 and AC-022
  - `systemPatterns.md`: dated decisions — activation events (OP-005, Gregor 2026-11-16), unit tests co-located with `.mjs` config because of `rootDir: src`
  - `activeContext.md`
  - `architecture:` snapshot in `AGENTS.md`, exactly these entries:
    - entrypoints: `'src/extension.ts — composition root; activates on workspaceContains:AGENTS.md, workspaceContains:.specs and Studio commands; bundled by esbuild to dist/extension.js'`
    - modules:
      - `'src/core/ports — read-only file-system port and small host ports (status bar, output, state, UI, folders, marker watch, clock)'`
      - `'src/core/discovery — project verdicts, version line, active-project state, report model, discovery controller, rerun scheduler (spec 0001)'`
      - `'src/adapters/node — Node file-system adapter for unit tests'`
      - `'src/adapters/vscode — thin implementations of the host ports with the VS Code API; no logic'`
      - `'test/fixtures — FeatherSpec fixture projects shared by unit and host tests'`
    - no module entry for `.github/workflows/ci.yml`: it is a build pipeline, recorded in `techContext.md`
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` · `npm run compile`. `npm test` is the pre-done gate (CI or Gregor's Windows), not this step's Verify.
- [ ] **Verified (T-008):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts, discoverWorkspace.test.ts | verified |
| AC-002 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts (AC-002 cases) | verified |
| AC-003 | T-001, T-004, T-006 | src/core/discovery/classifyFolder.ts (missingMarkers) | classifyFolder.test.ts (AC-003); report and select list open (T-004, T-006) | built |
| AC-004 | T-001 | src/core/discovery/classifyFolder.ts, discoverWorkspace.ts (legacy diagnostic) | classifyFolder.test.ts, discoverWorkspace.test.ts (AC-004) | verified |
| AC-006 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts (AC-006 incl. control) | verified |
| AC-007 | T-003, T-005 | — | — | open |
| AC-008 | T-003, T-004, T-006 | — | — | open |
| AC-009 | T-003, T-006 | — | manual: Gregor reloads (planned) | open |
| AC-010 | T-003, T-006 | — | — | open |
| AC-011 | T-002, T-006 | src/core/ports/readOnlyFileSystem.ts (no write members), discoverWorkspace.ts | discoverWorkspace.test.ts (AC-011 tree snapshot); refresh and select open (T-006) | built |
| AC-012 | T-002, T-007 | src/core/discovery/discoverWorkspace.ts:discoverWorkspace | discoverWorkspace.test.ts (AC-012); select list, Output block, reruns open (T-004, T-007) | built |
| AC-013 | T-007 | — | — | open |
| AC-014 | T-003, T-005 | — | — | open |
| AC-015 | T-004, T-006 | — | — | open |
| AC-016 | T-004, T-005 | — | — | open |
| AC-017 | T-002, T-004 | src/core/discovery/discoverWorkspace.ts:discoverFolder | discoverWorkspace.test.ts (AC-017); Output line open (T-004) | built |
| AC-018 | T-002 | src/core/discovery/discoverWorkspace.ts:discoverWorkspace | discoverWorkspace.test.ts (AC-018, 5 fixtures < 2 s) | verified |
| AC-019 | T-005, T-009 | — | — | open |
| AC-020 | T-003, T-005 | — | — | open |
| AC-021 | T-002 | src/core/discovery/versionLine.ts:readVersionLine | versionLine.test.ts, discoverWorkspace.test.ts (AC-021) | verified |
| AC-022 | T-009 | — | manual: Gregor in Restricted Mode (planned) | open |

Pre-done (before `/sdd-lifecycle` → done): `npm test` smoke suite green on CI or Gregor's Windows machine, plus the two manual checks above.

## Session handoff

- **Done so far:** T-001, T-002 (stage 1: marker verdicts, version line, one discovery run; 33 unit tests green); lifecycle move done, plan In Progress.
- **Next action:** T-003, then stages 2–5 as planned.
- **Open decisions:** OP-004, OP-006…OP-012 (spec §17), none blocking.
- **Baseline:** `2083696` (HEAD before the first step commit; lifecycle move 2026-11-16).
- **Environment:** `npm test` cannot run here (VS Code download blocked); it runs on CI and on Gregor's Windows machine.
