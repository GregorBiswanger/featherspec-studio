# Tech Context

## Stack
- TypeScript (`strict`, target ES2022, module Node16), VS Code Desktop extension
  (`engines.vscode ^1.146.0`), npm.
- GitHub Copilot SDK (spec 0010): `@github/copilot-sdk` 1.0.34 is the only SDK, an exact-pinned devDependency bundled by esbuild (`hostBuildOptions` exported from `esbuild.js`, `external: ['vscode','koffi']`); one universal VSIX, no per-platform runtime package (`npm ci` downloads the platform package into `node_modules` for the SDK's own install, it never reaches the bundle; `src/adapters/node/extensionBundle.test.ts` proves it). Recorded stream fixtures in `test/fixtures/copilot/` (PoC recording 2026-11-17, synthetic lines marked). Host smoke `src/test/copilot.smoke.test.ts` logs the host's Node version (M-07) and runs a real text-only session only with `FEATHERSPEC_COPILOT_SMOKE=1` and a signed-in CLI; otherwise it skips with a logged reason and sends no prompt.
- Bundling: esbuild (`esbuild.js`), two targets: `src/extension.ts` → `dist/extension.js` (node, cjs) and `src/webview/main.tsx` → `dist/webview/main.js` + `main.css` (browser, iife, JSX automatic).
- Webview: React 19.3.1 and react-dom 19.3.1 (devDependencies, bundled), jsdom 31.0.1 for tests; two tsconfigs (`tsconfig.json` excludes `src/webview`; `src/webview/tsconfig.json` has DOM lib and `jsx: react-jsx`).
- Lint: ESLint 10 + typescript-eslint (`eslint.config.mjs`; rules at `warn` level).
- Unit tests: Vitest 5.1 + vite 8.3 (`vitest.config.mjs`, co-located), projects `node` (`src/**/*.test.ts` outside `src/webview`) and `webview` (jsdom, `src/webview/**/*.test.{ts,tsx}`, setup `src/webview/testing/setup.ts`), plus `timing-node` and `timing-webview` for `*.timing.test.{ts,tsx}`: every test that measures wall-clock time against a budget (`src/shared/testing/timing.ts`) lives in such a file, and `npm run test:unit` runs them after the rest in one worker, one file at a time, so a loaded machine does not fail them (budgets unchanged). Their framework limit (test and hook timeout) is 120 s (`vitest.config.mjs`), so only an asserted budget can fail them, never Vitest's 5 s default (generation plus four runs per `bestOfThree` exceed it on a slow runner). A plain `npx vitest run` runs all four projects in parallel; the gate is `npm run test:unit`.
- Host tests: Mocha via `@vscode/test-cli` / `@vscode/test-electron` (`.vscode-test.mjs` copies
  `test/fixtures/` into a temp multi-root workspace; runs `out/test/*.test.js` inside a downloaded VS Code;
  two more configurations open single-folder copies for the activation checks in `out/test/activation/`, spec 0001 AC-019).
- CI: `.github/workflows/ci.yml` (Ubuntu + Windows: `npm ci`, eslint, tsc, `test:unit`, `compile`, `npm test`; Linux via `xvfb-run -a`).

## Build / Run
- `npm run compile` — type check + lint + esbuild bundle.
- `npm run watch` — esbuild and tsc in watch mode.
- `npm run package` — production bundle (`vscode:prepublish`).
- Run/debug: F5 in VS Code (`.vscode/launch.json`).

## Test
- `npm run test:unit` — fast unit tests in plain Node, no VS Code. Fixtures: `test/fixtures/`
  (every `.specs/` holds a `README.md`, git drops empty folders). Spec-repository fixtures (spec 0002): `fs180-en-done-archived`,
  `fs180-de-baselines`, `fs170-brownfield-mixed` (copies of the owner's samples), hand-made `fs-broken` (invalid UTF-8, `-text` in its
  `.gitattributes`), `fs110-parallel-synthetic`, `fs110-ready-synthetic` (shapes seen in no sample: UNVERIFIED). The AC-018 performance test
  generates 200 specs in a temp dir (`src/core/specs/testing/generateProject.ts`; full read < 2 s, update < 1 s).
- `npm test` — extension-host smoke suite (`src/test/discovery.smoke.test.ts`, `src/test/specRepository.smoke.test.ts`, `src/test/runtime.smoke.test.ts`, `src/test/lifecycle.smoke.test.ts`, `src/test/shell.smoke.test.ts`, `src/test/board.smoke.test.ts`, `src/test/missionControl.smoke.test.ts`, `src/test/providers.smoke.test.ts`, `src/test/orchestrator.smoke.test.ts`, `src/test/agentStart.smoke.test.ts`, `src/test/agentCenter.smoke.test.ts`, `src/test/copilot.smoke.test.ts`); `pretest` compiles and lints
  first; downloads and launches VS Code, so it is slow and needs network and a display. It cannot run
  in the agent sandbox (download blocked): CI and the Windows machine run it.
- Runtime store (spec 0004): every store criterion is one contract suite (`src/core/runtime/testing/contract*.ts`)
  that runs against the in-memory medium and the Node-fs medium (`src/adapters/node/fileRuntimeMedium.test.ts`); no new
  tool or dependency. Host smoke: `src/test/runtime.smoke.test.ts` (CI only).
- Provider port (spec 0009): `src/core/providers/*.test.ts` on a fake clock with `testing/adapters.ts` and `testing/controlledAdapter.ts`; the contract suite (`testing/contract.ts`) runs against the fake in both profiles (`src/adapters/providers/fake/fakeContract.test.ts`) and is what every real adapter calls; `fake/noIo.test.ts` replaces network and file modules with recorders that throw; doc, import and provider-ID literal scans (`portDocument`, `importScan`, `providerIdScan`); host smoke `src/test/providers.smoke.test.ts` (CI only). A new provider SDK joins `PROVIDER_SDKS` in `testing/scan.ts` and the ESLint core block.
- Agent orchestrator (spec 0011): `src/core/orchestrator/*.test.ts` on one world (`testing/world.ts`: the real run store over the memory medium behind a switchable session double, the fake clock, 0009's setup with the fake provider and a controlled adapter, a scripted model source, a fake UI): run tracker and transition table (`runTrack`), error classes, start, end, operations, resume, reader window, `specLink`, `runCommands`; `importScan` and `noWrite` (a temp copy of a fixture project, the Node-fs medium in a separate directory, a negative control each); `orchestratorSession` wires the real `RuntimeSession` and discovery controller (project switch with an open run); the run store's contract suite also covers the cause on a run's first status entry; host smoke `src/test/orchestrator.smoke.test.ts` (CI only).
- Agent start (spec 0008): `src/core/agentStart/*.test.ts` on one world (`testing/startWorld.ts` wraps 0011's `createWorld`: real run store over the memory medium, session double, 0009's setup with the fake provider, a controlled adapter, the Node file system over the fixture `fs110-start-ready` = `fs110-ready-synthetic` plus the three FeatherSpec files P-2 needs, fake setting and trust; `testing/flowWorld.ts` adds the flow, a recording fake orchestrator and UI): prompt with the golden file `startPrompt.golden.txt` (LF pinned in `.gitattributes`), preconditions, flow, Start and 0011's answers, binding, `agentStart.endToEnd.test.ts` (the board's Ready → Active drop through readiness check, confirmation, run created and events stored with the fake provider), `noWrite` (temp copy, negative control), `importScan`; shared contract `src/shared/protocol/agentStart.test.ts`; component tests `src/webview/agentStart/StartLines.test.tsx`, `StartDialog.test.tsx`; the bundle test mounts the dialog; host smoke `src/test/agentStart.smoke.test.ts` (CI only). Manual: 0008 M-2 (dialog, refusal and notice by keyboard and screen reader); M-1 is accepted with 0010.
- Lifecycle model (spec 0003): `src/core/lifecycle/*.test.ts` run on memory sources and the fixtures `fs110-ready-synthetic`,
  `fs110-parallel-synthetic`, `fs-broken`, `fs170-brownfield-mixed`, `fs110-de-active-review`, `fs180-*`; history tests use a fake
  store (`testing/fakeHistoryStore.ts`); the no-write proof (AC-011) uses temp copies. Host smoke: `src/test/lifecycle.smoke.test.ts` (CI only).
- Studio shell (spec 0005): core tests in `src/core/shell` on a shared world (`testing/world.ts`: real discovery controller and spec repository over memory sources, fake trust, actions and UI memory); component tests in `src/webview` with `act` + `createRoot` (no Testing Library); the built bundle runs in jsdom in `src/adapters/node/webviewBundle.test.ts`; host smoke `src/test/shell.smoke.test.ts` (CI only).
- Spec Board and spec detail (spec 0007): core tests in `src/core/board/*.test.ts` (cards, progress, runs, filters, board service, moves, open file, detail, board requests, no-write proof) on memory models and the
  fixtures; shared contract tests in `src/shared/protocol`; component tests in `src/webview/board` and `src/webview/detail` (keyboard flow, drag via `MouseEvent`s, announcements, focus); the bundle test also mounts the
  board with a fixture snapshot; CSS guard in `src/adapters/node/webviewCss.test.ts`; host smoke `src/test/board.smoke.test.ts` (CI only).
- Mission Control (spec 0006): core tests in `src/core/missionControl/*.test.ts` (run source, spec figures, run figures, attention, activity, service incl. a 200-spec projection guard) on `testing/projects.ts`, `runs.ts`, `bigModel.ts`,
  `serviceWorld.ts`; contract tests in `src/shared/protocol/missionControl.test.ts`; component tests in `src/webview/areas/missionControl` (`MissionControl`, `Sections`, `Drilldown`); the bundle test mounts the area with a fixture snapshot; host smoke
  `src/test/missionControl.smoke.test.ts` (CI only).
- Agent Center (spec 0012): core tests in `src/core/agentCenter/*.test.ts` (timeline, summary, run list, header, selection, event signal, service, restart, no-write, actions, request notifier, request handlers) on `testing/centerWorld.ts` and `testing/events.ts`; contract tests in `src/shared/protocol/agentCenter.test.ts` and `agentCenterDuration.test.ts`; component tests in `src/webview/areas/agentCenter` (`AgentCenter`, `Timeline`); the bundle test mounts the area with a fixture snapshot; host smoke `src/test/agentCenter.smoke.test.ts` (CI only).
- Studio visual design (spec 0013): stylesheet guard `src/adapters/node/webviewCss.test.ts` (colour only from theme variables, `--fs-*` alias chains, fonts, transitions ≤ 150 ms, reduced motion, focus outlines, board column rules); fixture `test/fixtures/studio-0002` (copy of this repo's spec 0002 and plan) mounted in the bundle test. Looks are checked with the UI preview harness outside the repository (`/home/claude/orch/preview/run.sh`: real core over Node fs, Chrome screenshots in Dark, Light and High Contrast, 900 px, drag state, collapsed section); its theme values approximate VS Code.
- Manual checks nothing automates: one list for the release, [docs/release-checklist.md](../docs/release-checklist.md) (assembled from the specs' manual criteria; real VS Code, screen reader, High Contrast, a real Copilot run).

## Quality gates
Per implementation step (Definition of Green), in order — zero warnings, zero errors:
1. `npx eslint src --max-warnings 0`
2. `npx tsc --noEmit`
3. `npx tsc --noEmit -p src/webview`
4. `npm run test:unit`
5. `npm run compile` — only for steps that touch wiring, adapters, `src/extension.ts`, `package.json` or the bundle (it adds the esbuild bundle to the type check and lint).

Pre-done gate (not per step): `npm test` (extension-host tests) runs in CI and on the
developer's machine before a spec moves to `done/` and before a release, plus the release checklist above.

## Constraints
- Core (domain + application) must not depend on `vscode` or provider SDKs.
- No secrets in project files, events or logs (handoff §13 Security).
