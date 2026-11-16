# Tech Context

## Stack

- **Language:** plain JavaScript, ESM (`"type": "module"` in `package.json`)
- **Runtime:** Node.js, current LTS — observed locally: `v24.17.0` with npm `11.17.0`
- **HTTP:** built-in `node:http` module — no external framework
- **Package manager:** npm
- **Tests:** built-in `node:test` runner
- **Persistence:** none (no database)
- **Build:** none (no build step)
- **Dev dependencies:** ESLint 9 (approved during `/sdd-setup`) — the only one. `eslint.config.js`
  is a flat config that imports nothing, so `@eslint/js` stays out of the dependency list; the few
  rules are listed by hand instead of taking `js.configs.recommended`.

## Build / Run

- Install: `npm install`
- Run: `npm start` (`node src/server.js`) — listens on `PORT`, default `3000`, endpoint
  `POST /split`. The module only calls `listen` when it is the process entrypoint.
- Build: not applicable — the source runs as-is.

## Test

- `npm test` (`node --test`)
- Unit tests target the pure calculation core (`test/split.test.js`); the HTTP layer is tested
  through the exported `handleSplit` and `requestListener` (`test/server.test.js`), so no test
  binds a port.
- **Trap:** `node --test` treats *every* `.js` file under `test/` as a test file, not only
  `*.test.js`. A shared helper module placed there would be collected as a test file — which is
  why the response/listener helpers live inside `test/server.test.js`.

## Quality gates

Run in this order after every completed implementation step, and fix until both report zero
warnings and zero errors:

1. `npx eslint .`
2. `node --test`

## Constraints

- No external runtime dependencies — standard library only.
- No database and no build step; adding either is an architecture decision, not a detail.
- ESM only; no CommonJS `require`.
- Node.js current LTS is the supported runtime.
