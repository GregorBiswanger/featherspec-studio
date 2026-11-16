# Tech Context

## Stack
- TypeScript (`strict`, target ES2022, module Node16), VS Code Desktop extension
  (`engines.vscode ^1.146.0`), npm.
- Bundling: esbuild (`esbuild.js`), two targets: `src/extension.ts` → `dist/extension.js` (node, cjs) and `src/webview/main.tsx` → `dist/webview/main.js` + `main.css` (browser, iife, JSX automatic).
- Webview: React 19.3.1 and react-dom 19.3.1 (devDependencies, bundled), jsdom 31.0.1 for tests; two tsconfigs (`tsconfig.json` excludes `src/webview`; `src/webview/tsconfig.json` has DOM lib and `jsx: react-jsx`).
- Lint: ESLint 10 + typescript-eslint (`eslint.config.mjs`; rules at `warn` level).
- Unit tests: Vitest 5.1 + vite 8.3 (`vitest.config.mjs`, co-located), two projects: `node` (`src/**/*.test.ts` outside `src/webview`) and `webview` (jsdom, `src/webview/**/*.test.{ts,tsx}`, setup `src/webview/testing/setup.ts`).
- Host tests: Mocha via `@vscode/test-cli` / `@vscode/test-electron` (`.vscode-test.mjs` copies
  `test/fixtures/` into a temp multi-root workspace; runs `out/test/**/*.test.js` inside a downloaded VS Code).
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
- `npm test` — extension-host smoke suite (`src/test/discovery.smoke.test.ts`, `src/test/specRepository.smoke.test.ts`, `src/test/runtime.smoke.test.ts`, `src/test/lifecycle.smoke.test.ts`, `src/test/shell.smoke.test.ts`, `src/test/board.smoke.test.ts`, `src/test/missionControl.smoke.test.ts`); `pretest` compiles and lints
  first; downloads and launches VS Code, so it is slow and needs network and a display. It cannot run
  in the agent sandbox (download blocked): CI and the Windows machine run it.
- Runtime store (spec 0004): every store criterion is one contract suite (`src/core/runtime/testing/contract*.ts`)
  that runs against the in-memory medium and the Node-fs medium (`src/adapters/node/fileRuntimeMedium.test.ts`); no new
  tool or dependency. Host smoke: `src/test/runtime.smoke.test.ts` (CI only).
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
- Studio visual design (spec 0013): stylesheet guard `src/adapters/node/webviewCss.test.ts` (colour only from theme variables, `--fs-*` alias chains, fonts, transitions ≤ 150 ms, reduced motion, focus outlines, board column rules); fixture `test/fixtures/studio-0002` (copy of this repo's spec 0002 and plan) mounted in the bundle test. Looks are checked with the UI preview harness outside the repository (`/home/claude/orch/preview/run.sh`: real core over Node fs, Chrome screenshots in Dark, Light and High Contrast, 900 px, drag state, collapsed section); its theme values approximate VS Code.
- Manual checks nothing automates: spec 0013: AC-017 (Gregor's verdict on the preview screenshots) and AC-018 (one pass in real VS Code with a Dark, a Light and a High Contrast theme plus one live theme switch); spec 0006: AC-021 in a High Contrast theme, AC-022 focus with Enter and Space, the §9 layout in the hands-on run, AC-024 and AC-016 re-measured on a real project (OP-12); spec 0007: AC-017 and AC-018 as a keyboard-only and a screen-reader pass over the board, AC-026 and the two-line description limit of AC-004 in a Light, a Dark and a High Contrast theme; window reload keeps the active project (0001 AC-009), Restricted Mode (0001 AC-022); spec 0005: AC-019 in a Light, a Dark and both High Contrast themes plus one live switch (OP-012), the AC-022 focus indicator, AC-023 in High Contrast, AC-024 on Gregor's machine, a real window reload with the panel open for AC-009.

## Quality gates
Per implementation step (Definition of Green), in order — zero warnings, zero errors:
1. `npx eslint src --max-warnings 0`
2. `npx tsc --noEmit`
3. `npx tsc --noEmit -p src/webview`
4. `npm run test:unit`
5. `npm run compile` — only for steps that touch wiring, adapters, `src/extension.ts`, `package.json` or the bundle (it adds the esbuild bundle to the type check and lint).

Pre-done gate (not per step): `npm test` (extension-host tests) runs in CI and on the
developer's machine before a spec moves to `done/`, plus the two manual checks above.

## Constraints
- Core (domain + application) must not depend on `vscode` or provider SDKs.
- No secrets in project files, events or logs (handoff §13 Security).
