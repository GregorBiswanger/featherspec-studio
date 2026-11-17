# Tech Context

## Stack
- TypeScript (`strict`, target ES2022, module Node16), VS Code Desktop extension
  (`engines.vscode ^1.146.0`), npm.
- No agent SDK and no runtime dependency; `external: ['vscode']` in `esbuild.js`.
- Bundling: esbuild (`esbuild.js`), two targets: `src/extension.ts` → `dist/extension.js` (node, cjs) and `src/webview/main.tsx` → `dist/webview/main.js` + `main.css` (browser, iife, JSX automatic).
- Webview: React 19.3.1 and react-dom 19.3.1 (devDependencies, bundled), jsdom 31.0.1 for tests; two tsconfigs (`tsconfig.json` excludes `src/webview`; `src/webview/tsconfig.json` has DOM lib and `jsx: react-jsx`).
- Lint: ESLint 10 + typescript-eslint (`eslint.config.mjs`; rules at `warn` level).
- Unit tests: Vitest 5.1 + vite 8.3 (`vitest.config.mjs`, co-located), projects `node` (`src/**/*.test.ts` outside `src/webview`) and `webview` (jsdom, `src/webview/**/*.test.{ts,tsx}`, setup `src/webview/testing/setup.ts`), plus `timing-node` and `timing-webview` for `*.timing.test.{ts,tsx}`: every test that measures wall-clock time against a budget (`src/shared/testing/timing.ts`) lives in such a file, and `npm run test:unit` runs them after the rest in one worker, one file at a time, so a loaded machine does not fail them (budgets unchanged). Their framework limit (test and hook timeout) is 120 s (`vitest.config.mjs`), so only an asserted budget can fail them, never Vitest's 5 s default (generation plus four runs per `bestOfThree` exceed it on a slow runner). The other two projects have a 30 s framework limit for the same reason (tests on the real file system take 4 to 6 s on a busy Windows machine). A plain `npx vitest run` runs all four projects in parallel; the gate is `npm run test:unit`.
- Host tests: Mocha via `@vscode/test-cli` / `@vscode/test-electron` (`.vscode-test.mjs` copies
  `test/fixtures/` into a temp multi-root workspace; runs `out/test/*.test.js` inside a downloaded VS Code;
  two more configurations open single-folder copies for the activation checks in `out/test/activation/`, spec 0001 AC-019; a third, `setup-no-marker` (0014), opens a marker-free copy for `out/test/setup/noProject.test.js` and runs no setup, so nothing is downloaded).
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
- `npm test` — extension-host smoke suite (`src/test/discovery.smoke.test.ts`, `src/test/specRepository.smoke.test.ts`, `src/test/runtime.smoke.test.ts`, `src/test/lifecycle.smoke.test.ts`, `src/test/shell.smoke.test.ts`, `src/test/board.smoke.test.ts`, `src/test/missionControl.smoke.test.ts`, `src/test/setup.smoke.test.ts`); `pretest` compiles and lints
  first; downloads and launches VS Code, so it is slow and needs network and a display. It cannot run
  in the agent sandbox (download blocked): CI and the Windows machine run it.
- Runtime store (spec 0004, narrowed by 0015 to the spec status history): every store criterion is one contract suite (`src/core/runtime/testing/contract*.ts`)
  that runs against the in-memory medium and the Node-fs medium (`src/adapters/node/fileRuntimeMedium.test.ts`); no new
  tool or dependency. Host smoke: `src/test/runtime.smoke.test.ts` (CI only).
- Lifecycle model (spec 0003): `src/core/lifecycle/*.test.ts` run on memory sources and the fixtures `fs110-ready-synthetic`,
  `fs110-parallel-synthetic`, `fs-broken`, `fs170-brownfield-mixed`, `fs110-de-active-review`, `fs180-*`; history tests use a fake
  store (`testing/fakeHistoryStore.ts`); the no-write proof (AC-011) uses temp copies. Host smoke: `src/test/lifecycle.smoke.test.ts` (CI only).
- Set up FeatherSpec (spec 0014): `src/core/setup/*.test.ts` (release check, download on scripted HTTP and a fake clock, file classes, `.gitignore` and `settings.json` completions, apply on `testing/memoryTarget.ts`, service on `testing/setupWorld.ts`, merge prompt with the golden file `mergePrompt.golden.txt`, `noNetwork` and `noWrite` with negative controls); the real 1.10.0 archive `test/fixtures/setup/featherspec-1.10.0.tar.gz` (facts in the README there) is "the release" in tests; node adapters `fetchReleaseHttp` (local `node:http` server), `tarGzArchive` (writer in `testing/tarWriter.ts`), `nodeSetupTarget` (real temp directories, Windows-safe); letter case on a case-insensitive target (`memoryTarget` option `caseInsensitive`; the real-file-system case runs only where the temp directory ignores case); `adapters/vscode/shellActions.test.ts` (the setUp action executes the setup command); host smoke `src/test/setup.smoke.test.ts` and `src/test/setup/noProject.test.ts` (CI only, no network); opt-in live run against the real GitHub release `src/adapters/node/setupLive.test.ts`, skipped unless `FEATHERSPEC_SETUP_LIVE=1`. Manual: 0014 M-1…M-3 in the release checklist.
- Focus on visibility (spec 0015): scan tests `src/adapters/node/sourceScan.test.ts` (removed names, comments in sources, bundle) and `docsScan.test.ts` (product docs), each with a negative control; `earlierRunData*.test.ts` for the removal of earlier run data; the next step rules in `src/core/board/nextStep.test.ts`. Manual: AC-030 (release checklist).
- Studio shell (spec 0005): core tests in `src/core/shell` on a shared world (`testing/world.ts`: real discovery controller and spec repository over memory sources, fake trust, actions and UI memory); component tests in `src/webview` with `act` + `createRoot` (no Testing Library); the built bundle runs in jsdom in `src/adapters/node/webviewBundle.test.ts`; host smoke `src/test/shell.smoke.test.ts` (CI only).
- Spec Board and spec detail (spec 0007): core tests in `src/core/board/*.test.ts` (cards, progress, filters, board service, moves, open file, detail, board requests, no-write proof) on memory models and the
  fixtures; shared contract tests in `src/shared/protocol`; component tests in `src/webview/board` and `src/webview/detail` (keyboard flow, drag via `MouseEvent`s, announcements, focus); the bundle test also mounts the
  board with a fixture snapshot; CSS guard in `src/adapters/node/webviewCss.test.ts`; host smoke `src/test/board.smoke.test.ts` (CI only).
- Mission Control (spec 0006): core tests in `src/core/missionControl/*.test.ts` (spec figures, attention, activity, service incl. a 200-spec projection guard) on `testing/projects.ts`, `bigModel.ts`,
  `serviceWorld.ts`; contract tests in `src/shared/protocol/missionControl.test.ts`; component tests in `src/webview/areas/missionControl` (`MissionControl`, `Sections`, `Drilldown`); the bundle test mounts the area with a fixture snapshot; host smoke
  `src/test/missionControl.smoke.test.ts` (CI only).
- Studio visual design (spec 0013): stylesheet guard `src/adapters/node/webviewCss.test.ts` (colour only from theme variables, `--fs-*` alias chains, fonts, transitions ≤ 150 ms, reduced motion, focus outlines, board column rules); fixture `test/fixtures/studio-0002` (copy of this repo's spec 0002 and plan) mounted in the bundle test. Looks are checked with the UI preview harness outside the repository (`/home/claude/orch/preview/run.sh`: real core over Node fs, Chrome screenshots in Dark, Light and High Contrast, 900 px, drag state, collapsed section); its theme values approximate VS Code.
- Manual checks nothing automates: one list for the release, [docs/release-checklist.md](../docs/release-checklist.md) (assembled from the specs' manual criteria; real VS Code, screen reader, High Contrast, the next step and Copy in a real window).

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
- Core (domain + application) must not depend on `vscode`.
- No secrets in project files, events or logs (handoff §13 Security).
