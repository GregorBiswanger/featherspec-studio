# Plan — Studio Shell & Navigation

**Spec:** [0005-studio-shell-navigation.md](0005-studio-shell-navigation.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-005

## Approach

The shell is split along the existing boundaries. `src/shared/protocol` holds the versioned
message contract: envelope, message types, hand-written guards, the area list, the navigation
request and every UI text the shell owns. It imports nothing. `src/core/shell` holds the
framework-free shell, proven on fakes: panel-state derivation with precedence, selection
reconciliation, the remembered area, the navigation request, Spec Explorer rows, the tree model,
a message router and one `shellService` that the host and the tree read. `src/webview` is a small
React 19 app: protocol client, navigation, panel states, an area registry with placeholders and
the Spec Explorer list. The VS Code adapters stay thin: panel host with serializer and CSP, tree,
commands, trust, UI memory and actions.

Order: the contract comes first because both sides build on it. Then the webview toolchain,
because it is the riskiest new part (new dependencies, a second tsconfig, a second esbuild
target, jsdom). Then the core shell, then the adapters. Every UI text sits in one file
(`src/shared/protocol/texts.ts`), so Gregor's wording answers (OP-004 to OP-006) change that file
and nothing else.

Extension points for 0006, 0007 and 0012:
- **Area registration:** one entry in `src/webview/areas/registry.tsx`; with no entry, the placeholder shows.
- **Navigation request (PD-040):** `useShell().navigate({ area, target })`, the protocol message `navigate`.
- **New message types:** added to `src/shared/protocol/messages.ts` under the same envelope and version rules.

Memory Bank files touched: `techContext.md` (T-002 gate line, T-009), `systemPatterns.md`,
`activeContext.md` (T-009).

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` (exists from T-002 on) · `npm run test:unit` ·
`npm run compile` (T-002, T-008, T-009). Pre-done gate on CI: `npm test` (host smoke
`src/test/shell.smoke.test.ts`) plus Gregor's manual checks (T-009).

## Research

- **Survey** (2026-11-16, worktree `spec-0005` at `0e0380a`):
  - **As-is.** `src/extension.ts` composes discovery (0001), the spec repository (0002, fed by
    `connectActiveProject`) and the runtime session (0004). There is no view, no webview and no
    `src/shared`. The As-is line in spec §15 ("generator scaffold") is out of date; this survey
    supersedes it. No spec criterion is contradicted by it.
  - **0001 gap (additive change; moved before this plan's T-001 on 2026-11-16: spec 0001 revised as AC-024, step T-013 in 0001's plan, tests first).** `DiscoveryController` notifies only active-project
    changes (`onDidChangeActiveProject`). Its `snapshot()` holds neither the remembered root
    (`WorkspaceStatePort.get()`, key `featherspec-studio.activeProject`) nor an unexpected run
    failure, because the rerun scheduler swallows rejections. S2, S3, S8 and S9 change without
    the active project changing (for example, a second project appears), and S5 needs the
    failure. 0001 T-013 adds `onDidUpdate(listener)` after every run (success or failure), plus
    `remembered` and `failure` in the snapshot. 0001's existing tests stay green. This is not a
    workaround beside `onDidChangeActiveProject` (systemPatterns): the controller gains one more
    notification.
  - **S5 "lifecycle folders cannot be listed".** 0002 reports it as an `unreadable-file`
    diagnostic whose `scope.file` is `.specs`, `.specs/backlog`, `.specs/active` or `.specs/done`
    (`src/core/specs/files.ts` `isFollowable` / `collect`). The shell reads it from there and
    0002 is not changed. A single unreadable file has a file key and never matches (PD-038).
  - **Missing markers for S9.** `DiscoveredFolder.missingMarkers` holds
    `AGENTS.md with a FeatherSpecVersion: line` or `.specs/ directory` (`classifyFolder.ts`).
  - **0003 (merged in, 2026-11-16).** The notes below were written before the merge; the code is in
    `src/core/lifecycle` (`LifecycleService.model(): LifecycleModel` with `entries[]` carrying `stem`, `number`,
    `state`, `rule`, `persistence`, `derivedLabel`), and `ShellModelSource` is cut to it.
  - **0003 (as planned).** The plan
    `.specs/backlog/0003-spec-lifecycle-readiness-model.plan.md` gives a `LifecycleModel` per
    spec entry (state, rule ID, persisted or derived), a `lifecycleService` with `model()` and
    `onDidChange`, and `StudioApi.lifecycle()` (its T-007). The label text is
    `Derived (rule <rule ID>)` (its X-8). Only one 0005 file reads 0003 types:
    `src/core/shell/specRows.ts` (T-007), behind the `ShellModelSource` port (T-006). After main
    is merged in, T-006 reads the real `src/core/lifecycle/model.ts` and the port is cut to fit it.
  - **Remembered UI state (decided here, spec §15).** It lives in `context.workspaceState`, key
    `featherspec-studio.shell`, value `{ v: 1, area, selection?: { projectRoot, stem, path? } }`.
    The value is validated on read; an invalid value gives Mission Control and no selection.
    VS Code keeps it outside every workspace folder (§8, AC-025). The webview's
    `getState`/`setState` is not used: it is destroyed with the panel (webview guide), so it
    cannot carry AC-009. `projectRoot` lets BR-03 clear the selection silently when another
    project is active at the next load.
  - **AC-020 in host tests (decided here, spec §15).** A probe that exists only in
    `ExtensionMode.Test`: the host sets a `data-test` flag in the HTML, the host test sends a
    probe message with `asWebviewUri(<fixture AGENTS.md>)`, and the webview tries `fetch` and
    answers `failed` or `loaded`, never the content. The host test also asserts
    `localResourceRoots` = `[dist/webview]`, `enableCommandUris: false` and the CSP. In normal
    mode the probe handler is not registered.
  - **Who decides which state.** The host derives S1 to S5, S8, S9 and the S7 note. The webview
    decides S6 (any inbound message with another `v`) and S5's protocol cause (no valid `shell`
    event within 5 s of `hello`, or one that fails validation). The webview never sees host
    data it could not read.
  - **Performance (OP-002).** The frame renders from the bundle with S4 before any host data.
    The host smoke measures from `executeCommand('featherspec-studio.open')` to the webview's
    `hello` at the host, with the extension already active: < 1000 ms. Gregor checks on his
    machine.
  - **Open points: planning rule.** Where the spec has text, the plan follows the spec. Where the
    spec leaves a point open, the plan takes the spec's own recommendation as a working
    assumption: OP-002, OP-004, OP-007 and OP-008 (S6 ranks first; "Reload" reloads the panel UI;
    a second mismatch right after a reload shows S5). **Resolved 2026-11-16 (Gregor approved the plan and
    answered): OP-002, OP-004…OP-009 are in the spec.** OP-005 placeholder wording is now "Not available in this
    version of FeatherSpec Studio" plus the purpose sentence; OP-006 S7 reads "…Agent actions are unavailable.";
    OP-009 the command "FeatherSpec Studio: Rescan Project" is this spec's (AC-029, `rescan()` of 0002; planned in
    T-006 and T-009). Still open: OP-010 (out of the MVP), OP-011 (AC-021 as written: one line per message), OP-012
    and OP-013 (Gregor's manual or review items).
  - **PD check.** PD-036 to PD-047 are cited by the spec and consistent with it. No PD is newer
    than the spec's revision. No `done/` spec is invalidated (`done/` is empty).
  - **Fakes available.** `src/core/discovery/testing/fakeHost.ts`,
    `src/core/specs/testing/memorySpecSource.ts`, `fakeFileWatch.ts`, `snapshotTree.ts`.
- **New dependencies (Ask-first at the start of stage 2; all devDependencies, bundled by esbuild into
  `dist/webview/main.js`, so the VSIX ships no `node_modules` and the host bundle gains nothing):**
  `react@19.3.1`, `react-dom@19.3.1`, `@types/react@19.3.0`, `@types/react-dom@19.3.0`,
  `jsdom@31.0.1` (engines `node ^22.22.2`; local node 22.23.4, CI `setup-node 22`).
  Deliberately **not** taken:
  - `@testing-library/react` (also needs `@testing-library/dom`): `act` from `react` plus `createRoot` is enough.
  - `@vscode-elements/elements`: no complex control in this slice.
  - `@vscode/codicons`: text labels only.
  - `valibot`: hand-written guards.
  - `@types/vscode-webview`: a five-line declaration does the job.
  - `@vitejs/plugin-react`: see the probe below.
- [npm registry, `npm view` in /tmp](https://www.npmjs.com/) — react/react-dom 19.3.1 (react-dom
  peer `react ^19.3.1`), @types/react(-dom) 19.3.0, jsdom 31.0.1 (engines), @testing-library/react
  16.3.3, @vscode-elements/elements 2.5.1, valibot 1.5.0; vitest 5.1.0 peer `jsdom: *`; installed:
  vitest 5.1.0, vite 8.3.8, esbuild 0.28.2, typescript 6.0.3, @types/vscode 1.146.0 — retrieved 2026-11-16
- Local probe of vite 8.3.8 `transformWithOxc` on a `.tsx` file: the output imports `react/jsx-runtime`, so Vitest
  compiles JSX with the automatic runtime and needs no React plugin — 2026-11-16
- [Vitest — Test projects](https://vitest.dev/guide/projects) — inline `test.projects` with their own
  `environment` and `include`; `extends` is on by default since 5.0 (`environmentMatchGlobs` no
  longer exists in 5.1's types) — retrieved 2026-11-16
- [Vitest — Test environment](https://vitest.dev/guide/environment) — `// @vitest-environment jsdom` per file as the fallback — retrieved 2026-11-16
- [React — act](https://react.dev/reference/react/act) — `import { act } from 'react'`,
  `IS_REACT_ACT_ENVIRONMENT = true` in a setup file, `createRoot` plus `dispatchEvent` in `await act(...)` — retrieved 2026-11-16
- [VS Code — Webview API](https://code.visualstudio.com/api/extension-guides/webview) — the state is
  destroyed with the panel; the serializer plus `onWebviewPanel:` restores; by default
  `localResourceRoots` includes the workspace, so restricting it is required for AC-020; CSP
  starts at `default-src 'none'`; body theme classes — retrieved 2026-11-16
- [esbuild API — Platform](https://esbuild.github.io/api/#platform) — `platform: 'browser'` defines
  `process.env.NODE_ENV` by minification; local `main.d.ts` has `jsx: 'automatic'` — retrieved 2026-11-16
- [VS Code — Built-in commands](https://code.visualstudio.com/api/references/commands) —
  `vscode.openFolder` without a URI opens the native folder dialog (S1 action) — retrieved 2026-11-16
- [VS Code — Workspace Trust](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust) —
  the palette command is "Workspaces: Manage Workspace Trust"; the docs do not name its ID.
  `workbench.trust.manage` is UNVERIFIED; the T-009 host smoke asserts that it is registered —
  retrieved 2026-11-16
- Local `@types/vscode` 1.146.0: `TreeView.message`, `workspace.isTrusted`,
  `onDidGrantWorkspaceTrust`, `registerWebviewPanelSerializer`, `enableCommandUris`,
  `localResourceRoots` — checked 2026-11-16
- [ADR-001](../../docs/decisions/ADR-001-extension-architecture.md) §2 to §7, §14 — the shape
  (constraints); its React and jsdom versions are confirmed above

## Texts (English, PD-016; all in `src/shared/protocol/texts.ts`)

| ID | Where | Text | Basis |
| --- | --- | --- | --- |
| X-01 | S1 | `Open a folder to use FeatherSpec Studio.` · action `Open Folder` | spec §13 |
| X-02 | S2 | `No FeatherSpec project found in this workspace.` · `Open setup guide` · `Refresh` | spec §13 |
| X-03 | S3 | `Several FeatherSpec projects found. Select one to continue.` · `Select project` | spec §13 |
| X-04 | S4 | `Loading project…` with a progress indicator (`role="progressbar"`, no value) | spec §13 |
| X-05 | S5 | `The project could not be loaded: <reason>.` · `Show output` · `Retry`. Reasons: `project discovery failed (<message>)` · `the lifecycle folders of .specs/ could not be listed (<folder>: <reason>)` · `the Studio panel and the extension could not exchange data` | spec §13 |
| X-06 | S6 | `FeatherSpec Studio was updated. Reload to continue.` · `Reload` | spec §13, OP-008 |
| X-07 | S7 | `This workspace is in Restricted Mode. Agent actions are unavailable.` · `Manage Workspace Trust` | spec §13, OP-006 |
| X-08 | S8 | `FeatherSpec project <name> was not found.` · `Select project` (only while another project is reported) · `Refresh` | spec §13, OP-004 |
| X-09 | S9 | one line per folder: `FeatherSpec project incomplete: <folder> has no <marker>.` · `Open setup guide` · `Refresh` | spec §13, OP-004 |
| X-10 | notice | `Spec <number> is no longer in the project` · `Dismiss`; a line above the area until dismissed or the next selection; shown at the next showing if the panel is hidden; no VS Code notification | spec AC-010, OP-007 |
| X-11 | placeholders | name · purpose · `Not available in this version of FeatherSpec Studio`. Purposes: Mission Control `See the project at a glance: spec counts, agent activity and what needs attention.` · Spec Board `See every spec as a card in the column of its board state.` · Agent Center `Follow agent runs, their live events and the approvals they wait for.` | spec BR-04, AC-006, OP-005 |
| X-12 | Spec Explorer | zero specs `This project has no specs yet.` · missing title `not available` · derived `Derived (rule <rule ID>)` | spec §9, 0003 X-8 |
| X-13 | tree | project name · `Open Studio` · `Mission Control` · `Spec Board` · `Spec Explorer` · `Agent Center` | spec §9 |
| X-14 | Output (AC-021) | `Ignored a message from the Studio panel: type <type>, <reason>.` | AC-021 |

## Stages

0. 0001 T-013 (in the plan of spec 0001) — the discovery update notification, tests first; prerequisite of T-005 and T-006
1. T-001 — the protocol contract and the host message router (no new dependency)
2. T-002 → T-003 → T-004 — the webview: toolchain and frame, panel states, areas (starts with the Ask-first dependency install)
3. T-005 → T-006 → T-007 — the core shell: panel-state derivation, shell service, selection and navigation
4. T-008 → T-009 — VS Code adapters and the host smoke, then docs sync and final gates

No parallel stage: inside every stage each step builds on the one before it, in one module.
Stages 2 and 3 share only `src/shared/protocol` and could run side by side after T-001, in two
worktrees. This plan keeps them in sequence for two reasons: stage 2 opens with an Ask-first
install, and T-003 adds `texts.ts` to the shared contract, which T-005 reads.

## Steps

### T-001 — Protocol contract and host message router

- **Covers:** AC-016, AC-021
- **Do:**
  - `src/shared/protocol/envelope.ts`: `PROTOCOL_VERSION = 1`. The envelope is
    `{ v, kind: 'req' | 'res' | 'evt', id?, seq?, type, payload }`. `readEnvelope(raw)` returns
    the envelope or a reason.
  - `src/shared/protocol/messages.ts`: the requests the webview sends (`hello { lastSeq }`,
    `navigate`, `select { stem, path? }`, `runAction { action }`, `dismissNotice`) and the
    messages the host sends (`res` ok or error, `evt shell { view }` carrying `seq`,
    `evt versionMismatch`). Also `ShellView`, the `PanelState` union S1 to S5, S8, S9,
    `SpecRow` and `NavigationRequest { area, target? }` with
    `target = { kind: 'spec', stem, path? } | { kind: 'run', id } | { kind: 'boardFilter', filter: JsonValue }`;
    0007 validates the inside of the filter. One guard per payload.
  - `src/shared/protocol/areas.ts`: `AreaId` and `AREAS` (id, title, purpose, delivering spec).
  - `src/core/shell/messageRouter.ts`: `createMessageRouter({ handlers, output, post })`:
    - another `v` → post `versionMismatch` and stop;
    - unknown type or invalid payload → ignore it and write one X-14 line that names the type
      and the reason, never the content;
    - valid → run the handler and answer with exactly one `res`.
  - ESLint: `src/shared/**` may not import `vscode` or Node built-ins.
  - Tests: `src/shared/protocol/messages.test.ts` and `src/core/shell/messageRouter.test.ts`:
    every guard accepts and rejects; the log line never contains payload text; the next valid
    message is answered; a version mismatch is answered with `versionMismatch`.
- **Verify:** `npm run test:unit -- src/shared src/core/shell` plus the per-step gates
- [x] **Verified (T-001):** 2026-11-16 — red: `npx vitest run src/shared src/core/shell` 27 failed, 2 passed (guards, `readEnvelope` and the router `receive` stubbed with `Not implemented`; the 2 passes test unstubbed code: the area list and `isRequestType`, with the `__proto__`/`toString` negative cases); green: 2 files, 29/29. Gates: eslint 0 findings (negative control: a temporary `import 'fs'` in `src/shared` fails `no-restricted-imports`), `tsc --noEmit` 0 errors, `npm run test:unit` 43 files, 681 passed.
- **Notes:** `src/shared/protocol/texts.ts` is created here (X-14 only) because the router writes the line; T-002 adds X-04 and X-13. `areas.ts` carries a `placeholder` flag per area (Spec Explorer false) and a Spec Explorer purpose sentence, not shown anywhere yet. Hello payload is `{ lastSeq }`; responses are `res` with `{ ok, error? }` (a failing handler never leaks its message). Stubs for the red run were applied to the guards, `readEnvelope`, `isJsonValue` and the router, then the real files restored.

### T-002 — Webview toolchain and the navigation frame

- **Covers:** AC-004, AC-014, AC-022, AC-023
- **Do:** Ask-first install first:
  `npm install --save-dev react@19.3.1 react-dom@19.3.1 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@31.0.1`.
  - Toolchain:
    - `src/webview/tsconfig.json`: DOM lib, `jsx: react-jsx`, `moduleResolution: bundler`,
      `types: []`, includes `../shared`.
    - Root `tsconfig.json` excludes `src/webview`; `check-types` runs both tsconfigs, and so
      does CI (`.github/workflows/ci.yml`).
    - `esbuild.js`: a second context, `src/webview/main.tsx` → `dist/webview/main.js` and
      `main.css` (browser, iife, `jsx: automatic`, the same watch loop).
    - `vitest.config.mjs`: projects `node` (as today, excluding `src/webview`) and `webview`
      (jsdom, `src/webview/**/*.test.{ts,tsx}`, a setup file that sets `IS_REACT_ACT_ENVIRONMENT`).
    - ESLint: files `**/*.tsx`; `src/webview/**` may import neither `vscode`, Node built-ins,
      `src/core` nor `src/adapters`.
    - `techContext.md` *Quality gates*: add `npx tsc --noEmit -p src/webview` as gate 3, in the
      same change set.
  - Code:
    - `src/webview/vscodeApi.ts`: declares `acquireVsCodeApi`, injectable for tests.
    - `client.ts`: sends `hello` on boot, applies `shell` events in `seq` order, re-sends
      `hello` on a gap, assigns request ids.
    - `main.tsx`, `App.tsx` and `Navigation.tsx`: a `nav` with four buttons. The current area is
      marked by `aria-current="page"`, a visible non-colour marker and the area heading.
    - Before the first `shell` event the frame shows the four items and X-04.
    - Activating an item shows that area at once (optimistic) and sends `navigate`.
    - `main.css` uses `--vscode-*` variables only, including `--vscode-focusBorder` for focus.
    - `src/shared/protocol/texts.ts` starts with X-04 and X-13.
  - Tests in `src/webview/App.test.tsx`:
    - the four items are listed;
    - click, Enter and Space switch the area and send `navigate`;
    - every item can take keyboard focus;
    - `aria-current` marks the current area;
    - while no snapshot has arrived, X-04 shows and the navigation still switches areas (AC-014).
- **Verify:** `npm run test:unit -- src/webview` plus the per-step gates (now including `npx tsc --noEmit -p src/webview`) plus `npm run compile` (`dist/webview/main.js` exists)
- [x] **Verified (T-002):** 2026-11-16 — install: `npm install --save-dev --save-exact react@19.3.1 react-dom@19.3.1 @types/react@19.3.0 @types/react-dom@19.3.0 jsdom@31.0.1` (approved by Gregor, exactly these). Red: `npx vitest run src/webview` 13/13 failed (`createClient` and `App` stubs threw `Not implemented`; JSX compiles with the automatic runtime, no React plugin needed); green 13/13 after the client and frame landed (4 tests needed the client to own the window message listener, fixed). Gates: eslint 0, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 45 files, 698 passed, `npm run compile` ok (`dist/webview/main.js` and `main.css` exist). Extra check (Gregor): `src/adapters/node/webviewBundle.test.ts` runs `node esbuild.js`, loads the built `dist/webview/main.js` in jsdom and asserts a start-up without errors, the four areas, S4, the `hello` message and a snapshot; negative control: a `throw` appended to `main.tsx` turned 2 of its 4 tests red, then removed.
- **Notes:** The bundle test lives in `src/adapters/node` (node project, root tsconfig) instead of the webview project so that it is type-checked and uses real `esbuild.js`. `jsdom` has no types and `@types/jsdom` is not approved: `src/adapters/node/jsdom.d.ts` declares the few members used; `src/webview/css.d.ts` declares `*.css`. `vitest.config.mjs` has two projects (node, webview). `check-types` runs both tsconfigs; CI got the webview tsc step. The client owns the window `message` listener (`start`/`stop`). In jsdom Enter/Space on a native button do not synthesize a click: `testing/dom.tsx:pressKey` emulates the browser for native buttons only and runs keydown handlers for everything else (T-004 rows).

### T-003 — Panel states in the webview

- **Covers:** AC-015, AC-016, AC-017, AC-018, AC-022, AC-023
- **Do:**
  - `texts.ts` gets X-01 to X-09 and the action labels.
  - `src/webview/PanelStateView.tsx`: one state in place of the area. The text sits in a labelled
    region (`role="status"`), and every action is a button that sends `runAction`.
  - `RestrictedNote.tsx`: the X-07 note above the area or the state, added to it, never in its
    place. It disappears when `view.restricted` turns false.
  - `client.ts`:
    - any inbound `v` other than `PROTOCOL_VERSION`, or `versionMismatch` → S6, which ranks
      first (OP-008);
    - with the `data-reloaded` flag from the HTML, a mismatch → S5 with the protocol reason;
    - no valid `shell` event within 5 s of `hello`, or a `shell` event that fails validation
      → S5 with the protocol reason;
    - `Reload` sends `runAction reload`.
  - Tests: `src/webview/PanelStateView.test.tsx` and `src/webview/client.test.ts`:
    - every state shows its own text and actions, with a readable label;
    - S6 wins over every host state;
    - a second mismatch after a reload gives S5;
    - the note shows beside S2 and beside an area, and disappears without a reload;
    - every state's actions can be reached and activated by keyboard.
- **Verify:** `npm run test:unit -- src/webview` plus the per-step gates
- [x] **Verified (T-003):** 2026-11-16 — red: `npx vitest run src/webview` 23 failed, 17 passed (the T-002 client and a throwing `panelStateLines`/`panelStateActions` stub stood in: no S6/S5 logic, no state text); green: 3 files, 40/40 (S1…S9, S6 over a host state, second mismatch after a reload gives S5, 5 s timeout, invalid snapshot gives S5 and recovers, note beside S2 and above an area and gone without a reload, keyboard on every action; controls: current-version messages never give S6, a timely snapshot cancels the timer). Gates: eslint 0, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 47 files, 725 passed.
- **Notes:** State texts, action labels, state labels and S5 reasons live in `src/shared/protocol/texts.ts` (`panelStateLines`, `panelStateActions`) so the host tree (T-005) reuses them. The client computes the effective state (`snapshot.state`: S6, S5 protocol, S4 while no snapshot, else the host state); `App` renders `PanelStateView` in place of the area content, the h1 and the navigation stay. `main.tsx` reads `document.body.dataset.reloaded`; the host sets it in T-008. S4 can also come from the host (`view.state`).

### T-004 — Areas: registry, placeholders, Spec Explorer list, notice

- **Covers:** AC-006, AC-007, AC-008, AC-010, AC-022, AC-023
- **Do:**
  - `src/webview/areas/registry.tsx` maps an `AreaId` to a component; with no entry, the
    placeholder shows. This is the extension point for 0006, 0007 and 0012.
  - `src/webview/shell.tsx`: `useShell()` returns `{ view, target, navigate(request), select(ref) }`.
  - `Placeholder.tsx` (X-11) shows name, purpose and `Not available in this version of FeatherSpec Studio`, and no data.
    A target handed to a placeholder area is ignored.
  - `areas/SpecExplorer.tsx`: a `listbox` of `option` rows in host order. Each row shows the
    number, the title or `not available`, the state word, `Derived (rule …)` where derived, and
    the path for duplicated stems. The selected row carries `aria-selected` plus a visible
    non-colour marker. Click, Enter and Space send `select`. With zero specs, X-12.
  - `NoticeBar.tsx` shows X-10 with `Dismiss` → `dismissNotice`.
  - Tests: `src/webview/areas/*.test.tsx`:
    - the Spec Board placeholder for a three-spec view reads the not-available line and shows
      no rows (AC-006 G/W/T); the same for 0006 and 0012;
    - rows render every field;
    - a new `shell` event with changed rows is in the DOM within 500 ms of the message event
      (AC-007, PD-047);
    - the selected row stays marked after a round trip to another area and back;
    - the notice shows and can be dismissed;
    - rows can be reached by keyboard.
- **Verify:** `npm run test:unit -- src/webview` plus the per-step gates
- [x] **Verified (T-004):** 2026-11-16 — red: `npx vitest run src/webview` 46 failed, 9 passed (`NoticeBar`, `Placeholder`, `SpecExplorer` stubs threw `Not implemented`); green: 4 files, 55/55 (three placeholders read name, purpose, 'Not available in this version of FeatherSpec Studio' and show no rows, a run target is ignored by a placeholder; rows render number, title or 'not available', state, derived label, path of a duplicated stem; zero specs; a changed snapshot is in the DOM well inside 500 ms; click, Enter, Space select; aria-selected plus marker; selection survives a round trip; notice with Dismiss). Controls: Spec Explorer is no placeholder; the notice is gone when the host reports none. Gates: eslint 0, `tsc --noEmit` 0, `tsc --noEmit -p src/webview` 0, `npm run test:unit` 48 files, 740 passed, `npm run compile` ok.
- **Notes:** The placeholder reads `Not available in this version of FeatherSpec Studio` (spec revised with OP-005, no spec number shown). The host marks `selected` per row and sends the order; the panel UI does not sort. `registry.tsx` exports `AREA_COMPONENTS` (extension point for 0006, 0007, 0012) and `App.tsx` falls back to `Placeholder`. The notice shows even while a panel state is shown.

### T-005 — Panel-state derivation, tree model, discovery update notification

- **Covers:** AC-003, AC-011, AC-012, AC-013, AC-018, AC-026, AC-027
- **Do:**
  - The discovery update notification (`onDidUpdate`, `remembered`, `failure`) is built before this
    step, as step T-013 of spec 0001's plan (spec 0001 AC-024). This step only consumes it.
  - `src/core/shell/panelState.ts`: `derivePanelState(input)`, precedence
    S1 > S8 > S2 > S9 > S3 > S5 > S4. S6 is the webview's and ranks first.
    - S8 names the project: the folder's name from the result, otherwise the last URI segment.
      `canSelect` is set while another project is reported.
    - S9 lists, per incomplete folder, its `missingMarkers`.
    - `listingFailure(project)` applies the *Research* rule for S5.
  - `src/core/shell/treeModel.ts`: `buildTreeModel(view)`:
    - with an active project: the project name, `Open Studio` and the four areas;
    - otherwise: `message` = the state text plus one action item each, for S1 to S5, S8 and S9
      (never S6 or S7).
  - Tests:
    - `src/core/shell/panelState.test.ts`, table-driven: each condition alone, then the pairs
      that test the precedence; S8 with and without another project; S9 with two folders;
    - `src/core/shell/treeModel.test.ts`.
- **Verify:** `npm run test:unit -- src/core/shell` plus the per-step gates
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Shell service: loading, load error, Retry, Restricted Mode

- **Covers:** AC-014, AC-015, AC-017, AC-029
- **Do:**
  - `src/core/ports/shell.ts`:
    - `TrustPort { isTrusted(); onDidGrant(listener) }`;
    - `UiMemoryPort { get(): unknown; set(value) }`;
    - `ShellActionsPort { openFolder; openSetupGuide; showOutput; manageTrust }`;
    - `ShellModelSource { current(): { project; lifecycle } | undefined; onDidChange }`, cut to
      the real 0003 types after the merge.
  - `src/core/shell/shellService.ts`: `createShellService(deps)` with `view()`,
    `onDidChangeView`, `runAction(action)` and `handlers` for the router.
    - Loading follows §6: there is no discovery result, or the active root has no model of that
      root yet. A re-read of the same root keeps the content.
    - `rescan()` (AC-029, the command "FeatherSpec Studio: Rescan Project") calls `repository.rescan()` once
      while a project is active and does nothing otherwise.
    - `Retry` = `discovery.refresh()`, then `repository.rescan()`. `Refresh` =
      `discovery.refresh()`. Both show S4 while they run and never run twice at once.
    - The S7 flag follows `onDidGrant`.
  - Tests: `src/core/shell/shellService.test.ts`, on the discovery fakes, a memory-source
    repository and fake trust and actions:
    - S4 before the first model;
    - `navigate` is answered while loading (AC-014);
    - a discovery failure and a listing failure give S5 with the right reason; a single
      unreadable spec does not;
    - `Retry` reruns both and passes through S4;
    - a second `Retry` during the first starts nothing;
    - trust granted → the note is gone without a reopen;
    - `rescan()` with an active project calls the repository once (AC-029); with none it calls nothing.
- **Verify:** `npm run test:unit -- src/core/shell` plus the per-step gates
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Selection, remembered area, Spec Explorer rows, navigation request

- **Covers:** AC-005, AC-007, AC-008, AC-009, AC-010, AC-028
- **Do:**
  - `src/core/shell/uiMemory.ts`: parse and serialize the *Research* value. Anything invalid
    gives Mission Control and no selection.
  - `selection.ts`: the BR-03 reconciliation.
    - Another project → clear without a notice.
    - A loaded model without the stem → clear, with notice `{ number }`.
    - A folder move keeps the selection.
    - A duplicated stem is identified by stem plus path.
    - No model → the selection is kept and not checked.
  - `specRows.ts`: rows ordered by number, then by path. Each row: the title or
    `not available`, the 0003 state word, the derived label with its rule ID, and the path
    while the stem is duplicated. This is the only reader of 0003 types.
  - `shellService`:
    - `open({ via: 'start' | 'area', area? })` per BR-02;
    - `navigate(request)` per BR-07: a spec target in the project → that area plus the
      selection; not in the project → area and selection kept, plus the notice; a run or
      filter target → the area, with the target in the view;
    - `select(ref)` and `dismissNotice()`;
    - every change of area or selection goes to `UiMemoryPort`.
  - Tests: `selection.test.ts`, `specRows.test.ts`, `uiMemory.test.ts` and
    `shellService.navigation.test.ts`:
    - AC-028 and AC-010 G/W/T on a memory source (delete, and the move `backlog/` → `active/`);
    - the selection kept across area changes;
    - a restart with remembered memory starts on the remembered area; first open → Mission Control;
    - a damaged value → defaults;
    - a per-area open shows the named area.
- **Verify:** `npm run test:unit -- src/core/shell` plus the per-step gates
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Studio panel host, commands and restore

- **Covers:** AC-001, AC-002, AC-005, AC-009, AC-020, AC-024
- **Do:**
  - `package.json`:
    - commands `featherspec-studio.open` ("FeatherSpec Studio: Open"), `.openMissionControl`,
      `.openSpecBoard`, `.openSpecExplorer`, `.openAgentCenter`;
    - activation event `onWebviewPanel:featherspecStudio.main`.
  - `src/adapters/vscode/webviewHtml.ts`, pure, no `vscode` import: the ADR-001 §4 CSP with a
    nonce, the asset URIs, and the flags `data-reloaded` and `data-test`.
  - `studioPanel.ts`:
    - one panel per window (BR-01), revealed if it exists;
    - `localResourceRoots: [dist/webview]`, `enableScripts`, `enableCommandUris: false`, no
      `retainContextWhenHidden`;
    - `registerWebviewPanelSerializer('featherspecStudio.main')` adopts a restored panel;
    - `postMessage` bridges to the router; `reload()` resets the HTML with `data-reloaded`.
  - `uiMemory.ts` adapter on `context.workspaceState`.
  - `extension.ts` wiring, plus a test-only `StudioApi.shell()` (time of the last `hello`,
    `probe(url)`, panel count).
  - In `ExtensionMode.Test` only: a probe handler in `src/webview/client.ts` that answers
    `failed` or `loaded` and never the content.
  - Tests:
    - unit `webviewHtml.test.ts`: `default-src 'none'`, nonce on the script only, no remote
      origin, no `connect-src`;
    - host smoke `src/test/shell.smoke.test.ts`:
      - AC-001;
      - AC-002: `open` twice → one Studio tab;
      - AC-005: a per-area command with the panel closed;
      - AC-009: the serializer adopts a fresh panel on the remembered area and selection;
      - AC-020: options exactly as above, and the probe fetch of the fixture's `AGENTS.md` URI fails;
      - AC-024: command → `hello` < 1000 ms.
- **Verify:** per-step gates plus `npm run compile` (the host smoke runs on CI)
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Activity Bar tree, actions, trust; docs sync and final gates

- **Covers:** AC-003, AC-011, AC-013, AC-015, AC-017, AC-025; AC-001 … AC-028 re-proven by the full gate run
- **Do:**
  - `package.json`: command `featherspec-studio.rescan` ("FeatherSpec Studio: Rescan Project", AC-029) wired to `shellService.rescan()`;
    `viewsContainers.activitybar` `featherspec-studio`, icon `media/studio.svg`
    (new top-level folder; monochrome SVG); view `featherspec-studio.navigator`
    "FeatherSpec Studio".
  - `src/adapters/vscode/studioTree.ts`: a `TreeDataProvider` over `buildTreeModel`; it sets
    `TreeView.message`, and its items run the commands.
  - `trust.ts`: `isTrusted` / `onDidGrantWorkspaceTrust`.
  - `shellActions.ts`:
    - `vscode.openFolder` with no URI;
    - `openExternal(SETUP_GUIDE_URL)`;
    - `show()`, added to `outputChannel.ts`;
    - `workbench.trust.manage`;
    - Select and Refresh go to the controller.
  - Host smoke, extended:
    - the tree shows the fixture project's name and the six entries;
    - `workbench.trust.manage` and every action command are registered;
    - AC-025: `snapshotTree` of every workspace folder is unchanged after open, navigate,
      close, reopen and the serializer restore.
  - Docs sync:
    - `architecture:` in `AGENTS.md`, exactly these entries:
      - entrypoint `src/extension.ts` → `'src/extension.ts — composition root; activates on workspaceContains:AGENTS.md, workspaceContains:.specs, onWebviewPanel:featherspecStudio.main and Studio commands and views; bundled by esbuild to dist/extension.js'`;
      - new entrypoint `'src/webview/main.tsx — Studio panel UI (React 19); bundled by esbuild to dist/webview/main.js and main.css; no Node.js or file access'`;
      - modules: ports line + `, shell ports (trust, UI memory, shell actions, shell model source)`;
      - new `'src/core/shell — Studio shell: panel states and precedence, selection, remembered area, navigation request, spec rows, tree model, message router, shell service (spec 0005)'`;
      - new `'src/webview — Studio panel UI: protocol client, navigation, panel states, area registry with placeholders, Spec Explorer list (spec 0005)'`;
      - new `'media — packaged static assets (Activity Bar icon)'`;
      - `shared:` → `['src/shared/protocol — versioned message protocol, areas and UI texts; imported by extension and webview, imports nothing (spec 0005)']`;
      - boundaries + `'src/shared imports neither vscode nor Node.js; src/webview imports only src/shared and its own files'`.
    - `systemPatterns.md`:
      - UI memory in `workspaceState`, not in `getState`;
      - the host derives the panel states and the webview only S6 and S5's protocol cause;
      - the texts in one shared file;
      - the navigation request goes through the host;
      - the AC-020 test-mode probe;
      - React tests with `act` and jsdom, without Testing Library;
      - the first key decision is no longer "not yet in code".
    - `techContext.md`:
      - stack: React 19.3.1, jsdom 31.0.1, two tsconfigs, two esbuild targets;
      - tests: the webview project and the smoke file;
      - manual checks: AC-019 in Light, Dark and both High Contrast themes (OP-012) plus a live
        switch; the AC-022 focus indicator; AC-023 in High Contrast; AC-024 on Gregor's
        machine; a real window reload for AC-009.
    - `README.md`: a Studio section and the five commands.
    - `activeContext.md`.
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile`
- [ ] **Verified (T-009):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-008 | — | — | open |
| AC-002 | T-008 | — | — | open |
| AC-003 | T-005, T-009 | — | — | open |
| AC-004 | T-002 | src/webview/Navigation.tsx, App.tsx, client.ts | src/webview/App.test.tsx (AC-004) | verified |
| AC-005 | T-007, T-008 | — | — | open |
| AC-006 | T-004 | src/webview/areas/Placeholder.tsx, registry.tsx | src/webview/areas/areas.test.tsx (AC-006, three areas, no rows) | verified |
| AC-007 | T-004, T-007 | src/webview/areas/SpecExplorer.tsx; rows from T-007 | areas.test.tsx (AC-007, 500 ms) | built |
| AC-008 | T-004, T-007 | src/webview/areas/SpecExplorer.tsx; host selection T-007 | areas.test.tsx (AC-008 round trip) | built |
| AC-009 | T-007, T-008 | — | — | open |
| AC-010 | T-004, T-007 | src/webview/NoticeBar.tsx; host reconciliation T-007 | areas.test.tsx (AC-010 notice) | built |
| AC-011 | T-005, T-009 | — | — | open |
| AC-012 | T-005 | — | — | open |
| AC-013 | T-005, T-009 | — | — | open |
| AC-014 | T-002, T-006 | src/webview/client.ts, PanelStateView.tsx (S4); host side in T-006 | src/webview/App.test.tsx (AC-014 loading), PanelStateView.test.tsx (S4) | built |
| AC-015 | T-003, T-006, T-009 | src/webview/client.ts (protocol cause), PanelStateView.tsx; host causes in T-006 | client.test.ts (AC-015 timeout, invalid snapshot), PanelStateView.test.tsx (S5 texts) | built |
| AC-016 | T-001, T-003 | src/core/shell/messageRouter.ts, src/webview/client.ts (S6, S5 after reload), PanelStateView.tsx | messageRouter.test.ts, client.test.ts (AC-016), PanelStateView.test.tsx (S6) | verified |
| AC-017 | T-003, T-006, T-009 | src/webview/RestrictedNote.tsx; host flag in T-006 | PanelStateView.test.tsx (AC-017) | built |
| AC-018 | T-003, T-005 | src/webview/client.ts (S6 first, state in place of the area); host precedence in T-005 | PanelStateView.test.tsx (AC-018 S6 over host state) | built |
| AC-019 | T-009 | — | manual: Gregor, Light/Dark/both HC + live switch | open |
| AC-020 | T-008 | — | — | open |
| AC-021 | T-001 | src/core/shell/messageRouter.ts:createMessageRouter, src/shared/protocol/messages.ts (guards) | messageRouter.test.ts (AC-021, incl. no-content and next-valid cases), messages.test.ts | verified |
| AC-022 | T-002, T-003, T-004 | src/webview/Navigation.tsx, PanelStateView.tsx, RestrictedNote.tsx, areas/SpecExplorer.tsx, NoticeBar.tsx | App.test.tsx, PanelStateView.test.tsx, areas.test.tsx (keyboard); manual: focus indicator, Gregor | built |
| AC-023 | T-002, T-003, T-004 | src/webview (aria-current, aria-label, role=status, aria-selected, markers) | App.test.tsx, PanelStateView.test.tsx, areas.test.tsx (AC-023); manual: High Contrast, Gregor | built |
| AC-024 | T-008 | — | — | open |
| AC-025 | T-009 | — | — | open |
| AC-026 | T-005 | — | — | open |
| AC-027 | T-005 | — | — | open |
| AC-028 | T-007 | — | — | open |
| AC-029 | T-006, T-009 | — | — | open |

## Session handoff

- **Done so far:** spec 0005 active; answers applied; 0001 T-013 done; T-001 (protocol, router), T-002 (webview toolchain, frame, bundle-in-jsdom test), T-003 (panel states), T-004 (areas, Spec Explorer list, notice). Stage 2 ends here; the webview is complete against fakes.
- **Next action:** T-005 (panel-state derivation and tree model in `src/core/shell`; the discovery update notification exists from 0001 T-013).
- **Open decisions:** OP-010…OP-013 (spec §17), none blocking.
- **Baseline:** `2cf3cc8` (HEAD before the lifecycle move and the first commit of this work).
- **Environment:** `npm test` cannot run in the sandbox (VS Code download blocked); CI runs it.
