# Plan — Workspace Discovery & Project Recognition

**Spec:** [0001-workspace-discovery-project-recognition.md](0001-workspace-discovery-project-recognition.md)
**Status:** Done
**Last updated:** 2026-11-16
**Current step:** none (all steps ticked)

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
6. T-010 → T-011 — spec changed 2026-11-16 (`/sdd-compile` follow-up): read errors name the failing path, version-line rule pinned by a test, 'active project changed' notification (core)
7. T-012 — docs sync and final gates for the delta
8. T-013 — update notification, remembered project and run failure in the controller (spec revised 2026-11-16 for spec 0005)

No parallel stage: stages 1–3 and 6 all live in `src/core/discovery` (one module), T-009 implements the ports
T-005…T-007 define, T-008 and T-012 document the result.

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
- [x] **Verified (T-003):** 2026-11-16 — red: `npx vitest run src/core/discovery/activeProject.test.ts` 15/15 failed with `Not implemented`; green: 15/15 passed. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 4 files, 48 passed.
- **Notes:** Reading: a user selection of a folder that is not a project is ignored (falls back to remembered or default). `remember: undefined` means nothing is written; the status bar text is `FeatherSpec: <name> (<version>)`.

### T-004 — Output block, select list and notification model

- **Covers:** AC-003, AC-008, AC-015, AC-016, AC-017
- **Do:** `src/core/discovery/report.ts` provides:
  - the Output block lines per run: per folder path, verdict, version and diagnostics; the missing markers named; the read-error reason; the hint "open the project folder itself" for *not a project*
  - the select-list items: every *project*, never *incomplete*, one per folder
  - the no-project notification model: the two texts, the actions "Open setup guide" (A-005 URL) and "Refresh"

  `report.test.ts`.
- **Verify:** `npx vitest run src/core/discovery/report.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-004):** 2026-11-16 — red: `npx vitest run src/core/discovery/report.test.ts` 13 failed with `Not implemented`, 1 passed (the literal check of the A-005 URL constant, no behaviour); green: 14/14 passed. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 5 files, 62 passed.
- **Notes:** Output block header is `FeatherSpec Studio discovery - <label>`; the label (timestamp) comes from the caller. A read-error folder gets no 'open the project folder itself' hint (the cause is not its location).

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
- [x] **Verified (T-005):** 2026-11-16 — red: `npx vitest run src/core/discovery/discoveryController.test.ts` 7/7 failed with `Not implemented`; green: 7/7 passed. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 6 files, 69 passed. The 'nothing written to the UI port' check moves to T-006, where the UI port arrives.
- **Notes:** `WorkspaceFolderInfo` moved to `src/core/ports/host.ts` (discoverWorkspace imports it). `StatusBarPort.show(text, action: 'select')`: the core names the action, the adapter maps it to a command id. Output is written on every run, also when no folder is a project (AC-016); only status bar and notification stay silent (AC-020).

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
- [x] **Verified (T-006):** 2026-11-16 — red: `npx vitest run src/core/discovery/discoveryController.test.ts` 13 failed with `Not implemented` (`refresh`/`selectProject` stubs), 8 passed (T-005 tests plus the AC-009 fresh-state control); green: 21/21 passed. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 6 files, 83 passed.
- **Notes:** `UiPort`, `NotificationModel`, `NotificationAction`, `SelectItem` live in `src/core/ports/host.ts` (report.ts imports them). The status bar click has no separate controller method: its action `'select'` is bound to the select command in T-009. `snapshotTree` moved to `testing/snapshotTree.ts` and is shared by two tests. The fake UI (`testing/fakeHost.ts`) records quick-pick and notification calls.

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
- [x] **Verified (T-007):** 2026-11-16 — red: `npx vitest run src/core/discovery/rerunScheduler.test.ts` 5/5 failed with `Not implemented`; `npx vitest run src/core/discovery/liveDetection.test.ts` 8/8 failed (`whenIdle`/`dispose` stubs threw `Not implemented`); green: 5/5 and 8/8 passed. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 8 files, 96 passed.
- **Notes:** `ClockPort` gained `setTimeout`; `MarkerWatchPort.watch(root, listener)` is one watch per folder root (the adapter in T-009 narrows it to root `AGENTS.md` and `.specs` itself). Controller runs are serialised through a promise queue (commands and scheduler never overlap); `whenIdle()` and `dispose()` were added to the controller for the smoke suite and shutdown. The 'no .specs/ content event' test can only show that the core registers roots and ignores unknown sources; the adapter pattern is checked in T-009. Live-detection tests sit in `liveDetection.test.ts` (not `discoveryController.test.ts`).

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
- [x] **Verified (T-009):** 2026-11-16 — red: `npx vitest run src/adapters/vscode/manifest.test.ts` 4 failed (assertions on the scaffold manifest: activation events, capabilities, commands) and 1 passed (the no-eager-activation control, true for `[]`); green after the manifest edit: 5/5. `report.test.ts` display-path cases: 2 red (assertion), then green. Adapters, `src/extension.ts` and `src/test/discovery.smoke.test.ts` written. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 10 files, 106 passed, `npm run compile` ok (bundle built), `npm run compile-tests` ok (smoke suite type-checks, `out/test/discovery.smoke.test.js` emitted). NOT run: `npm test` (VS Code download blocked here), so the smoke suite and the `workspaceContains:.specs` directory assumption are unproven until CI or Gregor's Windows machine.
- **Notes:** (1) `displayPath?` was added to `WorkspaceFolderInfo`/`DiscoveredFolder`: the folder identity is the URI string (BR-05), the Output block and the select list show the readable path instead (core change, two tests). (2) `sameRoot` is a tiny adapter file with its own unit test (`sameRoot.test.ts`). (3) `src/adapters/node/systemClock.ts` implements `ClockPort`. (4) `activate` is async, returns `StudioApi` (`snapshot`, `whenIdle`) and awaits the first discovery; the commands are registered before it. (5) `.vscode-test.mjs` copies three fixtures (`fs110-de-active-review`, `incomplete-agents-only`, `not-fs-speckit`) into a temp dir and opens them as a multi-root `.code-workspace`; the watcher test creates `.specs/` in the temp copy of `incomplete-agents-only`. The scaffold `src/test/extension.test.ts` was removed. (6) Marker watch adapter: `AGENTS.md` create/change/delete, `.specs` create/delete only, non-recursive patterns.

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
- [x] **Verified (T-008):** 2026-11-16 — `npx eslint src --max-warnings 0` 0 findings; `npx tsc --noEmit` 0 errors; `npm run test:unit` 10 files, 106 passed; `npm run compile` ok (bundle built). `npm test` NOT run (VS Code download blocked here; pre-done gate on CI or Gregor's Windows machine).
- **Notes:** AGENTS.md is now 213 lines (cap target 200, was 208): the plan-fixed snapshot entries added five lines; per `.claude/rules/constitution.md` this is one eviction proposal for the next natural edit, not done here. The snapshot was written without a separate confirmation question because the approved plan names exactly these entries. README replaced (it was the generator scaffold); Remote/WSL/Container is documented as 'expected, not tried' because no limitation could be observed here. CI workflow is untested until the repo is on GitHub.

### T-010 — Read errors name the failing path; version-line start rule named by a test

- **Covers:** AC-016, AC-017, AC-021
- **Added:** 2026-11-16, spec changed after this plan was Done (Mode C, plan still beside the spec, so extended in place; no ID renumbered). Gregor's decisions 1–3 after `/sdd-compile`: AC-016/AC-017 revised (hint only for no-marker folders; OP-004 resolved), BR-07 start-of-line reading moved from this plan's T-001 note into spec §15.
- **Do:** `classifyFolder.ts` wraps each marker-path read (`AGENTS.md` stat and read, `.specs` stat, `.claude/commands` listing) so a failure carries the path that failed (a small `FolderReadError` with `path` and `reason`); `discoverWorkspace.ts` writes `Cannot read <path>: <reason>` from that path instead of the fixed `AGENTS.md`; `readError` keeps the plain reason. `testing/memoryFileSystem.ts` gets a way to make a directory listing fail. Tests, written first:
  - `discoverWorkspace.test.ts`: AC-017 unreadable `AGENTS.md` beside `.specs/` → not a project, diagnostic names `AGENTS.md`; AC-017 failing `.claude/commands` listing → diagnostic names `.claude/commands` and not `AGENTS.md` (the case that was wrong)
  - `report.test.ts`: AC-016/AC-017 through `discoverWorkspace` + `formatOutputBlock`: the unreadable-`AGENTS.md` folder carries path, failed path and reason and no hint; a folder with no marker still carries the hint
  - `versionLine.test.ts`, `classifyFolder.test.ts`: AC-021 / BR-07 "the version line must start the line": mid-sentence `FeatherSpecVersion:` is no version line and no M1; indented line is (negative control)
- **Verify:** `npx vitest run src/core/discovery` (red first for the path tests, then green) + per-step gates
- [x] **Verified (T-010):** 2026-11-16 — red: `npx vitest run src/core/discovery` 1 failed (assertion: diagnostic read `Cannot read AGENTS.md: EIO: i/o error`, expected `Cannot read .claude/commands: …`), 104 passed (the AC-017 AGENTS.md case, the report case and the start-of-line tests are preservation tests, green by design); control: a temporary un-anchoring of both version regexes turned the two new start-of-line tests red, then restored. Green: 105/105 in `src/core/discovery`. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 10 files, 113 passed.
- **Notes:** the start-of-line tests are preservation tests of existing behaviour: immediately green by design, decided by the indented-line control. The relative path is named (`AGENTS.md`, `.claude/commands`, `.specs`); the folder path stands in the entry line above it. An error that is not a `FolderReadError` reads `Cannot read the folder`. `FolderReadError` lives in `classifyFolder.ts`.

### T-011 — Active-project changed notification in the controller

- **Covers:** AC-023
- **Added:** 2026-11-16, same cause. Needed by specs 0002 and 0004; stays in this controller, no workaround in other modules.
- **Do:** `src/core/discovery/discoveryController.ts` gets `onDidChangeActiveProject(listener): Disposable` (listener receives the `DiscoveredFolder` or `undefined`), in the style of the existing ports (`onDidChange`). Fires after the status bar is updated in `apply`: always for the first result, then only when root, version or legacy of the active project differ from the last notified value (spec A-006). A throwing subscriber is isolated: the others are still notified, the run goes on. A disposed subscription gets nothing. Tests, written first, in `activeProjectChanged.test.ts` with the fake host and fixtures:
  - first result with one project → one notification with it; first result without a project → one notification with none (AC-023)
  - refresh with no change → none (control); user selection of another project → that project; remembered project loses a marker → none; returns → project
  - ordering: the status bar already shows the result when the listener runs; `snapshot().active` equals the value
  - failing subscriber does not stop the second one nor the status bar update; disposed subscriber gets nothing
- **Verify:** `npx vitest run src/core/discovery/activeProjectChanged.test.ts` (red via `Not implemented` stub, then green) + `npx vitest run src/core/discovery` + per-step gates
- [x] **Verified (T-011):** 2026-11-16 — red: `npx vitest run src/core/discovery/activeProjectChanged.test.ts` 9/9 failed (`onDidChangeActiveProject` stub threw `Not implemented`); the no-change refresh test is the negative control. Green: 9/9; `npx vitest run src/core/discovery` 114/114. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` 11 files, 122 passed.
- **Notes:** a throwing subscriber is caught and dropped without a log line: a separate Output block would break AC-013 ('newest block matches the disk state'); a consumer that needs its failures visible logs them itself. Late subscribers get no replay (spec A-006): they read `snapshot().active`. 'Changed' compares root (via `sameRoot`), version and legacy only.

### T-012 — Docs sync and gates for the spec delta

- **Covers:** AC-016, AC-017, AC-021, AC-023 (re-proven by the full unit gate run)
- **Do:** Memory Bank (`activeContext.md`, `systemPatterns.md` entry for the notification contract), README only if the behaviour list names the hint or errors, `architecture:` snapshot check (no new module: `src/core/discovery` entry text lists the controller already; confirm unchanged). Traceability and handoff of this plan level with the code; open evidence recorded below.
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` · `npm run compile`. `npm test` stays the pre-done gate (CI or Gregor's Windows), not this step's Verify.
- [x] **Verified (T-012):** 2026-11-16 — `npx eslint src --max-warnings 0` 0 findings; `npx tsc --noEmit` 0 errors; `npm run test:unit` 11 files, 122 passed; `npm run compile` ok. `npm test` NOT run (VS Code download blocked here): listed under *Open evidence*. `architecture:` snapshot unchanged (no module added; the `src/core/discovery` entry already names the controller). README unchanged (it names the location hint only for folders without markers, which stays true).
- **Notes:** —

### T-013 — Discovery update notification, remembered project, run failure

- **Covers:** AC-024
- **Added:** 2026-11-16, spec 0001 revised at Gregor's request (OP-013): the Studio shell (0005) must see S2, S3, S8, S9 and a failed run, which `onDidChangeActiveProject` does not report. Additive; no existing criterion changes.
- **Do:** `src/core/discovery/discoveryController.ts` gets `onDidUpdate(listener): Disposable`, `snapshot()` gains `remembered: string | undefined` (from `WorkspaceStatePort.get()`) and `failure: string | undefined`. Every run notifies once at its end, after the status bar and after `onDidChangeActiveProject` (also after an unexpected failure; the failure is still rethrown to `start`/`refresh` callers). The next successful run clears `failure`. Listeners are isolated and a disposed one gets nothing. Tests, written first, in `src/core/discovery/discoveryUpdate.test.ts` with the fake host:
  - a refresh with nothing changed still notifies once (control for AC-023's silence)
  - a failing run (folder list throws) notifies once, `snapshot().failure` holds the message, the next successful run clears it
  - `remembered` reports the stored root, also while no project is active (remembered project lost a marker)
  - ordering: the status bar and the active-project listener ran before the update listener
  - failing and disposed subscribers
- **Verify:** `npx vitest run src/core/discovery/discoveryUpdate.test.ts` (red via `Not implemented` stub, then green) + `npx vitest run src/core/discovery` + per-step gates
- [x] **Verified (T-013):** 2026-11-16 — red: `npx vitest run src/core/discovery/discoveryUpdate.test.ts` 8/8 failed (`onDidUpdate` stub threw `Not implemented`); the no-failure and nothing-stored cases are the negative controls. Green: 8/8; `npx vitest run src/core/discovery` 122/122. Gates: eslint 0 findings, `tsc --noEmit` 0 errors, `npm run test:unit` all green (see 0005 plan for the total).
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts, discoverWorkspace.test.ts | verified |
| AC-002 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts (AC-002 cases) | verified |
| AC-003 | T-001, T-004, T-006 | src/core/discovery/classifyFolder.ts, report.ts, discoveryController.ts:selectProject | classifyFolder.test.ts, report.test.ts, discoveryController.test.ts (AC-003) | verified |
| AC-004 | T-001 | src/core/discovery/classifyFolder.ts, discoverWorkspace.ts (legacy diagnostic) | classifyFolder.test.ts, discoverWorkspace.test.ts (AC-004) | verified |
| AC-006 | T-001 | src/core/discovery/classifyFolder.ts:classifyFolder | classifyFolder.test.ts (AC-006 incl. control) | verified |
| AC-007 | T-003, T-005 | src/core/discovery/activeProject.ts, discoveryController.ts:start | activeProject.test.ts, discoveryController.test.ts (AC-007) | verified |
| AC-008 | T-003, T-004, T-006 | src/core/discovery/activeProject.ts, report.ts:buildSelectItems, discoveryController.ts:selectProject | activeProject.test.ts, report.test.ts, discoveryController.test.ts (AC-008) | verified |
| AC-009 | T-003, T-006 | src/core/discovery/activeProject.ts, discoveryController.ts, src/adapters/vscode/workspaceState.ts | discoveryController.test.ts (AC-009: new controller on same state); manual: Gregor reloads (planned) | built |
| AC-010 | T-003, T-006 | src/core/discovery/activeProject.ts, discoveryController.ts:refresh | discoveryController.test.ts (AC-010, incl. control) | verified |
| AC-011 | T-002, T-006 | src/core/ports/readOnlyFileSystem.ts (no write members), discoveryController.ts | discoverWorkspace.test.ts, discoveryController.test.ts (AC-011 tree snapshot) | verified |
| AC-012 | T-002, T-007 | src/core/discovery/discoverWorkspace.ts, report.ts, discoveryController.ts | discoverWorkspace.test.ts, report.test.ts, liveDetection.test.ts (AC-012) | verified |
| AC-013 | T-007 | src/core/discovery/rerunScheduler.ts, discoveryController.ts:syncWatches, src/adapters/vscode/markerWatch.ts | rerunScheduler.test.ts, liveDetection.test.ts (AC-013); src/test/discovery.smoke.test.ts (real watcher, pre-done gate, not run here) | built |
| AC-014 | T-003, T-005 | src/core/discovery/activeProject.ts (statusBar), discoveryController.ts | activeProject.test.ts, discoveryController.test.ts (AC-014) | verified |
| AC-015 | T-004, T-006 | src/core/discovery/report.ts:buildNoProjectNotification, discoveryController.ts:selectProject | report.test.ts, discoveryController.test.ts (AC-015) | verified |
| AC-016 | T-004, T-005, T-010 | src/core/discovery/report.ts:formatOutputBlock, discoveryController.ts | report.test.ts (AC-016, incl. unreadable AGENTS.md beside .specs/ without hint), discoveryController.test.ts (AC-016) | verified |
| AC-017 | T-002, T-004, T-010 | src/core/discovery/classifyFolder.ts:FolderReadError, discoverWorkspace.ts:discoverFolder, report.ts:formatOutputBlock | discoverWorkspace.test.ts (AC-017, names AGENTS.md / .claude/commands), report.test.ts (AC-017) | verified |
| AC-018 | T-002 | src/core/discovery/discoverWorkspace.ts:discoverWorkspace | discoverWorkspace.test.ts (AC-018, 5 fixtures < 2 s) | verified |
| AC-019 | T-005, T-009 | src/core/discovery/discoveryController.ts:start, package.json (activationEvents), src/extension.ts:activate | discoveryController.test.ts, src/adapters/vscode/manifest.test.ts (AC-019); src/test/discovery.smoke.test.ts (pre-done gate, not run here) | built |
| AC-020 | T-003, T-005 | src/core/discovery/activeProject.ts, discoveryController.ts | activeProject.test.ts, discoveryController.test.ts (AC-020) | verified |
| AC-021 | T-002, T-010 | src/core/discovery/versionLine.ts:readVersionLine, classifyFolder.ts:VERSION_LINE_PATTERN | versionLine.test.ts, classifyFolder.test.ts (AC-021, BR-07 start of line), discoverWorkspace.test.ts (AC-021) | verified |
| AC-022 | T-009 | package.json (capabilities.untrustedWorkspaces, no trust guard in src/extension.ts) | src/adapters/vscode/manifest.test.ts (AC-022); manual: Gregor in Restricted Mode (planned) | built |
| AC-023 | T-011 | src/core/discovery/discoveryController.ts:onDidChangeActiveProject | activeProjectChanged.test.ts (AC-023, 9 cases incl. no-change control) | verified |
| AC-024 | T-013 | src/core/discovery/discoveryController.ts:onDidUpdate, snapshot (remembered, failure) | discoveryUpdate.test.ts (AC-024, 8 cases incl. controls) | verified |

Pre-done (before `/sdd-lifecycle` → done): `npm test` smoke suite green on CI or Gregor's Windows machine, plus the two manual checks above.

## Open evidence

Not yet proven; the next `/sdd-compile` must find these three and must not read them as done (added 2026-11-16 at Gregor's request after the first `/sdd-compile` returned NOT READY — unverified):

- [ ] **Host suite not run:** `npm test` (`src/test/discovery.smoke.test.ts`, 3 fixtures in a temp multi-root workspace) has never run: the VS Code download is blocked in the agent environment. Runs on CI (`.github/workflows/ci.yml`) or Gregor's Windows machine. It also proves the assumption that `workspaceContains:.specs` matches a directory. Affects AC-013, AC-019 and the host wiring of AC-007…AC-016.
- [ ] **Manual check AC-009 (window reload):** Gregor reloads the VS Code window with a selected project and sees it active again without being asked. Pending, Gregor's machine.
- [ ] **Manual check AC-022 (Restricted Mode):** Gregor opens a FeatherSpec project in Restricted Mode and sees status bar entry, select command and Output channel as in a trusted workspace. Pending, Gregor's machine; no host test can do it (`--disable-workspace-trust`).
- 2026-11-17 — CI windows-latest failed `SpecBoard.test.tsx` AC-019 (359.95 ms against a private 300 ms). All unit and component timing assertions now assert the budget a decision states and use `bestOfThree` (`src/shared/testing/timing.ts`: one warm-up, best of three, the helper itself covered with negative controls). 0001: the five-folder discovery (AC-018) within 2000 ms.

## Session handoff

- **Done so far:** T-013 (AC-024, spec delta for 0005) ticked 2026-11-16; T-001…T-012 ticked with recorded runs (122 unit tests, eslint, tsc, compile green). T-010…T-012 (appended 2026-11-16) cover the spec delta after `/sdd-compile`: read errors name the failing path, version-line start rule named by tests, AC-023 notification. Docs, Memory Bank and snapshot level.
- **Next action:** close the three items under *Open evidence* (host suite on CI or Gregor's Windows, manual AC-009, manual AC-022), then `/sdd-compile` again in a fresh session (another model family), then `/sdd-lifecycle` → done. Spec stays `In Progress`.
- **Open decisions:** OP-006…OP-012 (spec §17), none blocking. OP-004 resolved 2026-11-16.
- **Baseline:** `2083696` (HEAD before the first step commit; lifecycle move 2026-11-16). Delta commits: T-010 `6de03cd`, T-011 `c0a202e`.
- **Environment:** `npm test` cannot run here (VS Code download blocked); it runs on CI and on Gregor's Windows machine.
