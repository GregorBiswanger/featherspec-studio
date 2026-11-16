# Tech Context

## Stack
- TypeScript (`strict`, target ES2022, module Node16), VS Code Desktop extension
  (`engines.vscode ^1.146.0`), npm.
- Bundling: esbuild (`esbuild.js`) → `dist/extension.js`.
- Lint: ESLint 10 + typescript-eslint (`eslint.config.mjs`; rules at `warn` level).
- Unit tests: Vitest 5.1 + vite 8.3 (`vitest.config.mjs`, `src/**/*.test.ts`, co-located; plain Node).
- Host tests: Mocha via `@vscode/test-cli` / `@vscode/test-electron` (`.vscode-test.mjs` copies
  `test/fixtures/` into a temp multi-root workspace; runs `out/test/**/*.test.js` inside a downloaded VS Code).
- CI: `.github/workflows/ci.yml` (Ubuntu + Windows: `npm ci`, eslint, tsc, `test:unit`, `compile`, `npm test`; Linux via `xvfb-run -a`).
- Webview UI technology is open (React recommended, decided by SPIKE-003 / PD-008).

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
- `npm test` — extension-host smoke suite (`src/test/discovery.smoke.test.ts`, `src/test/specRepository.smoke.test.ts`); `pretest` compiles and lints
  first; downloads and launches VS Code, so it is slow and needs network and a display. It cannot run
  in the agent sandbox (download blocked): CI and the Windows machine run it.
- Runtime store (spec 0004): every store criterion is one contract suite (`src/core/runtime/testing/contract*.ts`)
  that runs against the in-memory medium and the Node-fs medium (`src/adapters/node/fileRuntimeMedium.test.ts`); no new
  tool or dependency. Host smoke: `src/test/runtime.smoke.test.ts` (CI only).
- Manual checks nothing automates: window reload keeps the active project (AC-009), Restricted Mode (AC-022).

## Quality gates
Per implementation step (Definition of Green), in order — zero warnings, zero errors:
1. `npx eslint src --max-warnings 0`
2. `npx tsc --noEmit`
3. `npm run test:unit`

Pre-done gate (not per step): `npm test` (extension-host tests) runs in CI and on the
developer's machine before a spec moves to `done/`, plus the two manual checks above.

## Constraints
- Core (domain + application) must not depend on `vscode` or provider SDKs.
- No secrets in project files, events or logs (handoff §13 Security).
