# Tech Context

## Stack
- TypeScript (`strict`, target ES2022, module Node16), VS Code Desktop extension
  (`engines.vscode ^1.146.0`), npm.
- Bundling: esbuild (`esbuild.js`) → `dist/extension.js`.
- Lint: ESLint 10 + typescript-eslint (`eslint.config.mjs`; rules at `warn` level).
- Tests: Mocha via `@vscode/test-cli` / `@vscode/test-electron` (`.vscode-test.mjs`, runs
  `out/test/**/*.test.js` inside a downloaded VS Code).
- Webview UI technology is open (React recommended, decided by SPIKE-003 / PD-008).

## Build / Run
- `npm run compile` — type check + lint + esbuild bundle.
- `npm run watch` — esbuild and tsc in watch mode.
- `npm run package` — production bundle (`vscode:prepublish`).
- Run/debug: F5 in VS Code (`.vscode/launch.json`).

## Test
- `npm run test:unit` — fast unit tests in plain Node, no VS Code. **Does not exist yet; the
  first plan introduces it.**
- `npm test` — extension-host tests; `pretest` compiles and lints first; downloads and launches
  VS Code, so it is slow and needs network and a display.

## Quality gates
Per implementation step (Definition of Green), in order — zero warnings, zero errors:
1. `npx eslint src --max-warnings 0`
2. `npx tsc --noEmit`
3. `npm run test:unit` — until that script exists, the gate is 1 + 2.

Pre-done gate (not per step): `npm test` (extension-host tests) runs in CI and on the
developer's machine before a spec moves to `done/`.

## Constraints
- Core (domain + application) must not depend on `vscode` or provider SDKs.
- No secrets in project files, events or logs (handoff §13 Security).
