# Tech Context

## Stack

- **Language / runtime:** TypeScript executed directly by Node.js via
  `node --experimental-transform-types` — there is no compile step in the run path.
  **Strip-only mode is not usable here** (changed 2026-09-19, spec `0006`): Node v24.17.0 rejects
  TypeScript *parameter properties* with `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`, and six source files
  use them (`OutboxDispatcher.ts`, `BrokerClient.ts`, `OrderService.ts`, `BillingService.ts`,
  `TtlCache.ts`, `validation.ts`). Do not switch the flag back without de-sugaring all six.
- **Module system:** ESM (`"type": "module"` in `package.json`). Imports inside `src/` carry
  explicit `.ts` extensions.
- **TypeScript config** (`tsconfig.json`): `target ES2022`, `module ESNext`,
  `moduleResolution bundler`, `strict: true`, `rootDir: "src"`, `outDir: "dist"`,
  `include: ["src", "tests"]`. Note: `include` lists `tests`, which sits outside `rootDir`.
- **Runtime dependencies:** exactly one — `zod ^3.23.8`, used for request-body validation.
- **devDependencies:** none. The TypeScript compiler itself is **not installed**, so `tsc` is
  unavailable without a network install.
- **No framework and no database driver are installed.** Both the HTTP layer and the database
  layer are hand-written files inside `src/infrastructure/` (see Constraints).

## Build / Run

- **Build:** none wired. `outDir: "dist"` is declared in `tsconfig.json` but no script produces it.
- **Run:** `npm start` → `node --experimental-transform-types src/main.ts`.
  Status: **verified failing 2026-09-19** — `ERR_MODULE_NOT_FOUND: Cannot find package 'zod'
  imported from src/modules/orders/OrderController.ts`. `node_modules/` is absent, so the one
  runtime dependency is missing; fixing it needs `npm install`, which is an Ask-first network
  command. The earlier type-stripping failure is gone. No test needs `npm start`.
- **Install:** `npm install` reaches the network and falls under the Ask-first rule in `AGENTS.md`.
  Status: **unverified / not run**.

## Test

- **Command:** `npm test` → `node --experimental-transform-types --test "tests/**/*.test.ts"`
  (Node's built-in test runner; no Jest, no Vitest). Status: **verified 2026-09-19** — 8 tests,
  8 pass, 0 fail, ~287 ms.
- **Coverage today:** three files. `tests/orders.test.ts` covers `project` from `OrderEvents.ts`;
  `tests/billing.test.ts` covers `Money.ts` and `PaymentRetryPolicy.ts`; `tests/outbox.test.ts`
  covers `OutboxDispatcher` (spec `0006`). All import their subjects by deep path, bypassing the
  module barrels.
- **Faking infrastructure:** `tests/outbox.test.ts` subclasses `OutboxRepository` and
  `BrokerClient` and overrides their public methods — no casts, no production type changes.
  Needed because `db.query` always returns `[]` and `BrokerClient.publish` issues a real `fetch`.
- **Untested:** `src/auth/` entirely, `src/shared/` entirely, both services, every repository,
  and the broker client.

## Quality gates

The Definition-of-Green commands, in order. `/sdd-plan` reads them from here and `/sdd-compile`
re-runs them via the plan's *Quality gates* line. Run after every completed implementation step
and fix until zero warnings and zero errors.

```
npm test
```

One command only, confirmed and verified green 2026-09-19 (8 tests, 8 pass).

**One standing warning is accepted** (2026-09-19, spec `0006`): Node prints
`ExperimentalWarning: Transform Types is an experimental feature` once per test process. It is
unavoidable while the run path needs `--experimental-transform-types`, and it was left **visible**
rather than muted with `--disable-warning=ExperimentalWarning`, which would also hide future
experimental warnings. The "zero warnings" rule means zero *other* warnings.

There is no linter
to run and the TypeScript compiler is not installed, so no lint or type-check step exists today. Adding TypeScript as a devDependency
would allow `npx tsc --noEmit` to join this list — it is an Ask-first dependency addition and has
not been done.

## Configuration

Two environment variables exist in the whole repository, both read in `src/main.ts`:

| Variable | Default | Read at |
| --- | --- | --- |
| `BROKER_URL` | `http://localhost:4222` | `src/main.ts:9` |
| `OUTBOX_BATCH_SIZE` | `50` | `src/main.ts:12` |
| `OUTBOX_INTERVAL_MS` | `2000` | `src/main.ts:13` |
| `PORT` | `3000` | `src/main.ts:26` |

No config module, no env schema validation, no `.env` loading, and no database URL anywhere.

The two `OUTBOX_*` variables (spec `0006`, 2026-09-19) are the only ones that are validated: read
as raw strings in the composition root and resolved inside `OutboxDispatcher`, which owns the
defaults and falls back to them with one `logger.warn` per value that is not a positive integer.
`BROKER_URL` and `PORT` remain unvalidated `??` reads.

## Constraints

- **The HTTP server binds no socket.** `Server.listen()` only writes a log line; the `routes`
  map is written by `route()` and never read. Registered routes are therefore unreachable and
  `PORT` is logged but not used (`src/infrastructure/http/server.ts`).
- **`db` is a driverless stub.** `query` returns `[]` unconditionally, `insert`/`update` echo
  their argument, and `transaction` invokes the callback with the same object — no `BEGIN`, no
  rollback, no isolation (`src/infrastructure/db/connection.ts`). `README.md:4` claims "one
  database"; there is no driver and no connection string.
- **`BillingService` is constructed and never invoked** — it receives no routes and no lifecycle
  call (`src/main.ts:20`, referenced once more only inside a log payload at `:27`).
- **No shutdown path exists.** No `SIGTERM`/`SIGINT` handler anywhere in `src/`;
  `OutboxDispatcher.stop()` is defined and never called, and its 2-second timer keeps the
  process alive.
- **No linter, formatter or CI configuration is tracked** — no ESLint, Biome, Prettier or
  EditorConfig file, and no `.github/workflows/`.

**These stubs are deliberate** — this is a fixture repository, and `BillingService` being
unreachable is known and accepted (confirmed 2026-09-19, see *Key decisions* in
`systemPatterns.md`). They are not defects to fix on sight.

Consequence for planning: the domain logic in `src/modules/` is real and readable, but the
process as tracked performs no observable work end to end. Any task that assumes a live HTTP
surface or a real database has to build that seam explicitly and say so.
