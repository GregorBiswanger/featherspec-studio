# Plan — First Agent Provider Integration (GitHub Copilot SDK)

**Spec:** [0010-first-agent-provider-copilot.md](0010-first-agent-provider-copilot.md)
**Status:** Done
**Last updated:** 2026-11-17
**Current step:** none (T-001 … T-008 verified)

## Approach

One adapter folder `src/adapters/providers/copilot/` implements 0009's `AgentProviderPort` exactly as
the *Surface* of [plan 0009](../plan-archive/0009-agent-provider-abstraction.2026-11-17.plan.md) names it; nothing of
that surface is redefined. Inside, a **client seam** (`client.ts`: our own minimal types for client,
session, events and the three handlers) separates the logic from the SDK: production wires
`sdkClient.ts` over `@github/copilot-sdk@1.0.34`, every criterion runs on a **scripted client** that
replays the recorded PoC stream (`test/fixtures/copilot/`) or a stream marked *synthetic*. The pure
**mapping** (`mapping.ts`) turns one Copilot event into zero or more `DeliveredEvent`s; the adapter
(`copilotProvider.ts`) owns runs, the runtime per run, open requests, cancel and exit. Order: the
risky packaging first (dependency, universal bundle, CLI lookup), then the seam, then mapping and the
happy path, then failures, then the interactive paths, then wiring and the host smoke (M-07). Memory
Bank files touched: `techContext.md`, `systemPatterns.md`, `activeContext.md` (T-008).

**Precondition:** plan 0009 is `Done` (registry, service, `createProviderSetup`, contract suite,
`StudioApi.providers()`); 0011, 0008 and 0012 are implemented before this plan (orchestrator order).

**Packaging (one universal VSIX, ADR-001 Decision 1).** The SDK is a **devDependency** pinned
exactly (`"1.0.34"`), like React here: esbuild bundles its JavaScript (`zod`, `vscode-jsonrpc`,
`lossless-json` come with it), so vsce sees no production dependency, and `.vscodeignore` already
drops `node_modules/**`. `koffi` (native FFI) is added to esbuild's `external`: the SDK loads it only
in `ffiRuntimeHost.js`, behind a dynamic `import()` on the in-process path, which this adapter never
takes (it uses `RuntimeConnection.forStdio({path})`). The optional per-platform packages
(`@github/copilot-sdk-<platform>`, 211 MB for `win32-x64`) are installed by `npm ci` but never
imported on the stdio path, so esbuild does not pull them in; a bundle test proves both.

**Decisions taken here** (spec revised the same day, §14): minimum CLI 1.0.87 and protocol 3;
Windows lookup takes `copilot.exe` only; not signed in = `getAuthStatus().isAuthenticated === false`;
runtime exit is detected by the wrapper (SDK 1.0.34 has no public exit hook): a `ping()` every 5 s
while a run is open, a failure with no stop requested is the exit, the code parsed from the SDK's
"exited … with code N" text; approvals, questions and elicitations are answered by settling the
promise the SDK handler returned — the SDK calls the handler while dispatching the `.requested`
event, before `onEvent` (`session.js` 1.0.34; recording lines 106/107), so the adapter pairs the
pending handler call with the next `.requested` event of its kind; after a run's end such a promise
is never settled (no answer is sent, AC-015). Display name "GitHub Copilot"; permission mode label
"Asks before every tool action (Copilot manual mode)"; base directory
`<globalStorage>/copilot-home`. M-06 is not in this increment (OP-007): no token path, AC-022 is
not planned.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-001, T-002, T-007,
T-008). Pre-done gate on CI or Windows: `npm test` with the new `src/test/copilot.smoke.test.ts`.

## Research

- Survey (2026-11-17): 0009 is in progress (T-001…T-003 verified): `src/core/ports/agentProvider.ts`
  holds every port type of the surface, `src/core/providers/testing/scan.ts` already lists
  `@github/copilot-sdk` in `PROVIDER_SDKS` and `'copilot'` in `PROVIDER_IDS`, ESLint bans SDK imports
  in core production files. No Copilot code exists. `RuntimeClock` (`epochMs`, `setTimeout`) in
  `src/core/ports/runtimeMedium.ts`; `resolveStorageLocation` in `src/adapters/vscode/storageLocation.ts`
  (global storage path, reused for the base directory); `sameRootFor(platform)` in
  `src/adapters/vscode/sameRoot.ts` (case-insensitive on Windows, no `vscode` import) serves BR-06.
  `esbuild.js` bundles `src/extension.ts` (cjs, node, `external: ['vscode']`) and runs on load, so
  T-002 exports the host options and guards `main()`. `.vscodeignore` holds `node_modules/**`. No
  vsce in `node_modules`; CI (`ci.yml`, Ubuntu + Windows, Node 22) runs `npm ci` and all gates.
  Masking patterns: `src/core/runtime/masking.ts` (mirrors `docs/security/secret-patterns.md`).
- Consumers: 0008 reads `nextStartModel`, `permissionModeLabel`, `disclosure` and availability, and
  ships `featherspec-studio.defaultProvider = copilot`; 0011 needs `START_TIMEOUT_MS = 60 000` (a
  cold runtime start took 14 s) and classes a derived `run.failed` as `provider_exited`; 0012
  renders `approval.requested.summary` and hints as delivered.
- PoC evidence, [docs/decisions/poc-copilot-2026-11-17/](../../docs/decisions/poc-copilot-2026-11-17/)
  (repo, 2026-11-17): M-01, M-02 (reject only), M-03 (text only), M-04, M-05, M-08, M-09 pass;
  M-06, M-07 not run. Facts used: auth type `gh-cli`, 25 models incl. `auto`; first `client.start`
  13 952 ms, later starts 2.0–2.3 s; `listModels` 1 018 ms; `createSession` 826 ms; abort confirmed
  in 34 ms, then `session.idle`; resume 185 ms without replay; `session.start` carries no
  `selectedModel` here, `session.resume` does; permission handler call precedes
  `permission.requested`; denied tool → `tool.execution_complete{success: false, error.code
  denied}`; 31 event types in M-03 (ignored list, spec §7).
- [@github/copilot-sdk 1.0.34 on npm](https://www.npmjs.com/package/@github/copilot-sdk/v/1.0.34)
  (`npm view`, tarball read with `npm pack` in a temp dir, nothing installed) — dependencies `zod`
  4.6.7, `koffi` 3.3.6, `lossless-json` 4.3.3, `vscode-jsonrpc` 10.0.0; eight optional platform
  packages; engines `^20.19.0 || >=22.12.0`; `exports` with `import` and `require` builds;
  `cliVersion.js` 1.0.112; protocol 3, `MIN_PROTOCOL_VERSION` 3 (`client.js`
  `verifyProtocolVersion` throws on mismatch); `koffi` only in `ffiRuntimeHost.js`, loaded by
  dynamic `import()` on the in-process path; `runtimeArtifacts.js` uses
  `createRequire(__filename ?? import.meta.url)` (safe in a cjs bundle); a `.js` CLI path is
  spawned with `process.execPath` (Electron in the extension host), any other path directly with
  `windowsHide`, no shell; options `baseDirectory` (sets `COPILOT_HOME`), `useLoggedInUser`,
  `gitHubToken`, session `permissionMode`, `enableSessionTelemetry`, `trustWorkingDirectory`,
  `onPermissionRequest`, `onUserInputRequest` (request carries `requestId`), `onElicitationRequest`,
  `onEvent`; permission results `approve-once` and `reject{feedback?}`; `session.todos_changed` has
  no payload — todos come from `session.rpc.plan.readSqlTodosWithDependencies()` (`rows[].title`,
  `status`, experimental); `ErrorData.errorType` documented as "authentication", "authorization",
  "policy", "quota", "rate_limit", "context_limit", "query"; `fileEdits[].kind` `create` · `edit` ·
  `delete` · other, `path` absolute; a runtime exit only marks sessions disconnected (no public
  hook); retrieved 2026-11-17.
- [Bundling extensions](https://code.visualstudio.com/api/working-with-extensions/bundling-extension)
  — once bundled, exclude `node_modules` in `.vscodeignore`; modules that cannot be bundled are
  externals, and only a negated pattern would ship them; retrieved 2026-11-17.
- [Installing GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli)
  — the install link of §9; retrieved 2026-11-17.
- Not settled by research: the Node and Electron versions of VS Code 1.146 (a web search found no
  statement) — M-07 logs them; an engine outside `^20.19 || >=22.12` stops the spec (OP-013).
- New dependency (approved by Gregor, 2026-11-17): `@github/copilot-sdk@1.0.34` exact, as
  devDependency. Installing it is a network command: T-001 asks once before `npm install`.

## Stages

1. T-001 → T-002 — packaging first: dependency, CLI lookup, settings; SDK wrapper and universal bundle
2. T-003 → T-004 — recorded stream, mapping, scripted client; start and resume
3. T-005 → T-006 — availability, failures and runtime exit; approvals, questions, cancel, end
4. T-007 → T-008 — contract suite, wiring, host smoke (M-07); docs sync and final gates

No parallel stage: every step from T-003 on builds on T-002's seam, and T-004…T-006 all change
`copilotProvider.ts`; T-001 and T-002 share `package.json`.

## Steps

### T-001 — Dependency, CLI lookup and settings

- **Covers:** AC-002, AC-003
- **Do:** Ask-first, then `npm install --save-dev --save-exact @github/copilot-sdk@1.0.34`.
  `src/adapters/providers/copilot/cliLocator.ts`: `locateCli({settingPath, pathVariable, platform,
  isFile, runVersion})` → `found {path, version}` · `not-installed {hint}` · `unknown {reason}`.
  Setting first, else `PATH` in order; Windows takes `copilot.exe` only and remembers a skipped
  `.cmd`/`.ps1`/`.bat`/`.js` for the hint (§9); `runVersion` runs `<path> --version` without a shell
  (10 s), parses `GitHub Copilot CLI x.y.z`; below 1.0.87 → *not installed* naming both versions;
  no version readable → *unknown* with that reason; install link in every *not installed* hint.
  Constants `MIN_CLI_VERSION`, `INSTALL_URL`. `package.json`: `featherspec-studio.copilot.cliPath`
  (string, default empty, scope `machine`) and `featherspec-studio.copilot.model` (string, default
  empty, scope `window`). Manifest test: both keys, `cliPath` scope `machine`, the SDK pinned exactly.
  Tests `cliLocator.test.ts` with fake `isFile`/`runVersion` (PoC's six PATH hits as a case).
- **Verify:** `npx vitest run src/adapters/providers/copilot/cliLocator.test.ts src/adapters/vscode/manifest.test.ts` then the per-step gates and `npm run compile`
- [x] **Verified (T-001):** 2026-11-17. `npm install --save-dev --save-exact @github/copilot-sdk@1.0.34` (Gregor's approval; package.json gains that one line, lock file 7 packages). Red: `npx vitest run src/adapters/providers/copilot/cliLocator.test.ts` 14 of 15 tests failed on the `Not implemented` stubs (the 15th, a missing file rejects, passed on the stub's rejection alone; tightened to `/ENOENT/` before the code, then red); `npx vitest run src/adapters/vscode/manifest.test.ts` 3 new tests failed (settings absent; the SDK-pin test was green at once, proven by mutation: `^1.0.34` made it fail, reverted). Green after cliLocator.ts and the two settings in package.json: 2 files, 38 tests passed. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 153 files, 1907 passed; `npm run compile` finished.
- **Notes:** —

### T-002 — SDK wrapper and universal bundle

- **Covers:** AC-005, AC-020, AC-024
- **Do:** `client.ts`: the seam — `CopilotClientFactory(options: {cliPath, baseDirectory?,
  workingDirectory})` → client `{start, stop, forceStop, getStatus, getAuthStatus, listModels,
  createSession(config), resumeSession(id, config), onExit(listener)}`, session `{sessionId, send,
  abort, disconnect, readTodos}`, config `{workingDirectory, model?, onEvent, onPermission,
  onUserInput, onElicitation}`, `CopilotEvent = {type, id?, timestamp?, ephemeral?, data}`.
  `sdkClient.ts`: implements it over an injected SDK module (`{CopilotClient, RuntimeConnection}`,
  production loads `@github/copilot-sdk` lazily on first use): `forStdio({path})`,
  `useLoggedInUser: true`, no `gitHubToken`, `env` = the given environment without
  `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` (any case) plus `COPILOT_TELEMETRY_DISABLED=true`,
  `baseDirectory`, `logLevel: 'error'`; sessions with `permissionMode: 'manual'`, `streaming: true`,
  `enableSessionTelemetry: false`, `trustWorkingDirectory: 'session'` on create only;
  `readTodos` over `rpc.plan.readSqlTodosWithDependencies()`; `onExit` from the 5 s `ping()`
  watcher (clock-driven, only while a session is open, silent after `stop`/`forceStop`).
  `esbuild.js`: `external: ['vscode', 'koffi']`, host options exported, `main()` only when run
  directly. `src/adapters/node/extensionBundle.test.ts`: builds `sdkClient.ts` with those options
  (`write: false`, `metafile`): SDK inputs present, no input under `@github/copilot-sdk-*`, none
  ending in `.node`, `koffi` external; `.vscodeignore` keeps `node_modules/**` and no `!node_modules`.
  `sdkClient.test.ts` on a stub SDK recording constructor and session options.
- **Verify:** `npx vitest run src/adapters/providers/copilot/sdkClient.test.ts src/adapters/node/extensionBundle.test.ts` then the per-step gates and `npm run compile`
- [x] **Verified (T-002):** 2026-11-17. Red: `npx vitest run src/adapters/providers/copilot/sdkClient.test.ts src/adapters/node/extensionBundle.test.ts` 18 failed, 3 passed: 16 sdkClient tests on the `Not implemented` stub of createSdkClientFactory, extensionBundle 'SDK JavaScript is part of the bundle' and 'koffi stays external' failed on assertions (esbuild.js exported no options yet and sdkClient.ts imported no SDK); the 3 green were .vscodeignore and two negative-looking checks that hold on an empty bundle. Green after sdkClient.ts and the esbuild.js export: 2 files, 21 tests passed. Mutation: removing `koffi` from `external` failed 2 bundle tests (koffi was bundled, three inputs), reverted. Bundle of sdkClient.ts: SDK, vscode-jsonrpc and lossless-json bundled, no `@github/copilot-sdk-*` input, no `.node`, koffi external. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 155 files, 1928 passed; `npm run compile` finished (dist/extension.js 358 KB, SDK not yet imported there).
- **Notes:** (1) Gregor's approval says `trustWorkingDirectory: 'session'` only when the workspace is trusted: `CopilotSessionConfig.trustWorkingDirectory` is a boolean the adapter fills from a trust port (T-004, T-007); the wrapper sets `'session'` on create only when true. (2) `zod` is not in the bundle (the SDK does not reach it on this path); the test asserts `lossless-json` and `vscode-jsonrpc` instead. (3) `loadCopilotSdk` (dynamic `import()`) lives in sdkClient.ts so the bundle test sees the SDK; `esbuild.js` exports `hostBuildOptions` and runs `main()` only when started directly. (4) `extensionBundle.test.ts` builds `sdkClient.ts` now, `src/extension.ts` in T-007.

### T-003 — Recorded stream, scripted client and event mapping

- **Covers:** AC-010, AC-011, AC-012
- **Do:** `test/fixtures/copilot/recorded-2026-11-17.jsonl`: the `sdk` and `handler` lines of the
  PoC's `events-copilot.jsonl`, unchanged; `test/fixtures/copilot/synthetic.jsonl` (marked) for the
  §7 types the recording lacks (`tool.execution_progress`, `fileEdits` of each kind and one other,
  `user_input.*`, `elicitation.*`, `session.todos_changed`, `session.warning`, `session.error`, an
  unlisted type) from `dist/generated/session-events.d.ts`. `testing/recorded.ts` turns lines into
  script steps (SDK data rebuilt from the summary per type; keys-only data → `null` values;
  reasoning text of the recorded length). `testing/scriptedClient.ts`: implements the seam, replays
  steps on the clock, calls a handler before the event it belongs to, logs every call.
  `mapping.ts`: `mapEvent(event, context)` per spec §7 — mapped list, ignored list (`model.*`
  prefix), `provider.unknown {typeName, fieldNames}`, `<id>#<n>` identities, `file.changed` paths
  relative with `/` or as delivered plus `outsideProject` (BR-06 via `sameRootFor`), running usage
  totals. Tests: `fixture.test.ts` (no masking-pattern match, no home path, no `poc.` line),
  `mapping.test.ts` (recorded stream → kinds in order with payload fields; synthetic types; unknown
  type keeps the run going).
- **Verify:** `npx vitest run src/adapters/providers/copilot/mapping.test.ts src/adapters/providers/copilot/fixture.test.ts`
- [x] **Verified (T-003):** 2026-11-17. Red: `npx vitest run src/adapters/providers/copilot/mapping.test.ts` 23 of 23 tests failed on the `Not implemented` stubs of createEventMapper and isSingleTextField (fixtures, `testing/recorded.ts`, `testing/scriptedClient.ts` existed). Green after mapping.ts: 23 passed; `npx vitest run src/adapters/providers/copilot` 5 files, 67 passed. fixture.test.ts and scriptedClient.test.ts were green at once; proven by mutation, each reverted: a `ghp_` token line in synthetic.jsonl failed fixture.test.ts (1 of 7), cumulative step delays made constant failed scriptedClient.test.ts (1 of 6); the secret-pattern and home-path checks carry their own negative controls. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 158 files, 1964 passed.
- **Notes:** (1) The mapper is `createEventMapper(options)` with `map(event): Promise<DeliveredEvent[]>` (async only for `session.todos_changed`), `started(ref, model?)` for the created-ID path, `promptSent()`, `ended()`; the adapter must feed events through one queue per run to keep their order. (2) `session.start` in the recording carries no `selectedModel`; the recording shows `session.resume` arriving before the prompt, `session.start` after it: T-004 emits `session.started` from the created ID at once on start, and waits for `session.resume` (bounded) on resume. (3) BR-06 is `path.win32`/`path.posix` `relative` (case-insensitive on win32), not `sameRootFor`: a prefix test needs more than equality. (4) The synthetic lines carry full `data` and `"synthetic":true`; `{{root}}`/`{{outside}}` are substituted by `testing/recorded.ts`. (5) An elicitation is a question only for one plain string field in form mode (`isSingleTextField`, shared by mapper and adapter handler).

### T-004 — Adapter: start, resume, model, registration

- **Covers:** AC-001 (declaration), AC-006, AC-007, AC-008, AC-019, AC-023, AC-024
- **Do:** `copilotProvider.ts`: `createCopilotProvider({clock, clientFactory, locate, settings:
  {model(): string}, baseDirectory, workspaceFolders(), platform})` → `AgentProviderPort & {dispose}`.
  `id` `copilot`, capabilities of BR-01, label and disclosure (BR-14, byte for byte).
  `start`: runtime per run, one session (working directory = project root, model only if named,
  base directory only if outside every workspace folder), `session.started` from `session.start` or
  the created ID, whichever is first, then the prompt byte-identical; the mapping feeds the sink;
  the runtime stops at the end kind. `resume`: `resumeSession(sessionRef)`, never `createSession`,
  continuation text byte-identical, `session.started` from `session.resume` with `selectedModel`.
  `nextStartModel()` = setting or none; `listModels()`; `credentialValues()` = `[]`. Tests
  `copilotStart.test.ts` on the recorded M-03 and M-05 parts.
- **Verify:** `npx vitest run src/adapters/providers/copilot/copilotStart.test.ts`
- [x] **Verified (T-004):** 2026-11-17. Red: `npx vitest run src/adapters/providers/copilot/copilotStart.test.ts` 16 of 19 tests failed on the `Not implemented` stubs (start, resume, listModels, nextStartModel, credentialValues, dispose); the 3 green at once (declaration, disclosure and label, no-fs-import scan) were proven by mutation, each reverted: `experimental` dropped from fileChanges, one word of the disclosure changed, an `fs` import added to copilotProvider.ts: 1 failed each. Green after copilotProvider.ts (start, resume, model, base directory, runtime stop at the end kind, dispose): `npx vitest run src/adapters/providers/copilot` 6 files, 86 passed. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 159 files, 1983 passed.
- **Notes:** (1) `createCopilotProvider` takes `isTrusted()` as well (Gregor: working directory trusted only in a trusted workspace; T-007 wires 0001's trust port). (2) Resume waits for `session.resume` up to `STARTED_WAIT_MS` = 2 000 ms on the clock, then delivers `session.started` from the given reference with no model (the recording shows the event before the prompt on resume, after it on start); start delivers `session.started` from the created ID at once. (3) The scripted client delivers `onCreate`/`onResume` steps synchronously inside `createSession`/`resumeSession` (as the SDK does), `onSend`/`onAbort` on the clock. (4) Handlers for permission, input and elicitation are placeholders that never settle until T-006; locator results other than *found* throw `Not implemented` until T-005.

### T-005 — Availability, pre-session failures, errors, runtime exit

- **Covers:** AC-002, AC-003, AC-004, AC-009, AC-018, AC-020, AC-021
- **Do:** `checkAvailability`: locator result → *not installed* / *unknown*; else a runtime with the
  same options, protocol mismatch from `start` → *unknown* naming both versions, `getAuthStatus`
  not authenticated → *not signed in* + hint, else *available*; the runtime is stopped in every
  case. `start`/`resume` check in the order runtime, sign-in, model (named model not in
  `listModels` → `model_unavailable` naming it and the offered models) and fail with no session.
  `session.error` → category per §7 with the §9 hints; never `cancelled` or `tool_failure`; resume
  refused → per §7. Runtime exit with no end kind and no cancel pending → derived `run.failed
  {unknown, "Copilot runtime stopped unexpectedly", exit code where known}`, the only derived
  `run.failed`. Tests `copilotFailures.test.ts`.
- **Verify:** `npx vitest run src/adapters/providers/copilot/copilotFailures.test.ts`
- [x] **Verified (T-005):** 2026-11-17. Red: `npx vitest run src/adapters/providers/copilot/copilotFailures.test.ts` 21 of 25 tests failed (availability on the `Not implemented` stub, no pre-session checks or exit handling in start and resume); the 4 session.error tests passed at once (the mapper already mapped it in T-003), proven by mutation: dropping the runtime stop at the end kind failed 7 of 25, reverted. Green after the checks (runtime, sign-in, model), `checkAvailability` and the exit watcher: `npx vitest run src/adapters/providers/copilot` 7 files, 111 passed (two T-004 tests named a model and now list it, since the model check exists). Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 160 files, 2008 passed.
- **Notes:** (1) A start failure of the client (spawn error) in a run is `runtime_missing` with Copilot's message; in the availability check a spawn error (ENOENT, EACCES, EPERM, `spawn`) is *not installed*, a protocol-version message is *unknown* naming the CLI version and the SDK's text with both protocol versions, anything else *unknown* with the message. (2) Failures after the checks (session cannot be created, resume refused, prompt not sent, auth status unreadable) are `unknown` with Copilot's message, source `provider`; the only `derived` run.failed is the runtime exit (`Copilot runtime stopped unexpectedly (exit code N)`, the code appended to `providerMessage`, `RunFailedPayload` has no code field). (3) The scripted client gained `authError` and `sendError`. (4) `session.error` mapping lives in mapping.ts since T-003; this step proves it end to end through the adapter.

### T-006 — Approvals, questions, cancel, end session

- **Covers:** AC-013, AC-014, AC-015, AC-016, AC-017, AC-025
- **Do:** pending handler call paired with its `.requested` event → `approval.requested {requestId,
  actionKind, summary = command, path or URL as delivered, outsideProject}`; no answer before
  `respondToApproval`, also after 24 h of clock time; the answer settles the promise with
  `approve-once` or `reject{feedback}` and emits one derived `approval.resolved`; a later
  `permission.completed` for it is dropped. `input.requested` for user input (choices appended) and
  one-text-field elicitations (other forms declined plus `warning`); `respondToInput` passes the text
  unchanged, `input.resolved` carries none. `cancel`: one `abort` per run, `run.cancelled` on
  Copilot's `abort`, `forceStop` after 10 s with cause "forced stop", no session yet → `run.cancelled`
  and no prompt. `endSession`: `forceStop` at once, nothing more delivered. One end kind per run.
  Call-log check over every test of the folder: only `approve-once`/`reject`, only `manual`, no
  answer after a run's end. Tests `copilotInteraction.test.ts`.
- **Verify:** `npx vitest run src/adapters/providers/copilot`
- [x] **Verified (T-006):** 2026-11-17. Red: `npx vitest run src/adapters/providers/copilot/copilotInteraction.test.ts` 18 of 21 tests failed (the operations cancel, respondToApproval, respondToInput, endSession threw `Not implemented`; handler promises never settled); 3 passed at once (unanswered requests after 24 h and of every kind), proven by mutation together with the rest: a second cancel allowed to abort again failed 1, accepting an answer twice or for the wrong request type failed 1, each reverted. Green after the implementation: `npx vitest run src/adapters/providers/copilot` 8 files, 132 passed; the call-log check (only approve-once/reject, no answer after a run's end) runs as an `afterEach` in `testing/world.ts` over every test that builds a world. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 161 files, 2029 passed.
- **Notes:** (1) Pairing: handler calls queue per kind (permission, user input, one-field elicitation) and the next `.requested` event of that kind takes the oldest; a larger form is declined at once by the handler. (2) After an end kind the adapter delivers nothing more, so events after `abort` (e.g. `turn.completed`) are dropped; a cancel before the session exists delivers a derived `run.cancelled` and the start flow stops without a prompt (checks after each await). (3) `endSession` removes the run, so later cancel and answers are refused with "no such run".

### T-007 — Contract suite, wiring and host smoke

- **Covers:** AC-001, AC-002, AC-008, AC-024
- **Do:** `copilotContract.test.ts`: 0009's `runProviderContract('copilot', harness)`, cases
  arranged as scripted streams (`credential-in-text`: the adapter holds no credential, BR-02 — if
  0009's suite cannot run that case without one, stop and ask the main session).
  `src/adapters/vscode/copilotSettings.ts`: `cliPath` from `inspect().globalValue` only, `model`,
  both as `SettingPort`. `src/extension.ts`: `createCopilotProvider` with `sdkClient`, the locator,
  the settings, `<globalStorage>/copilot-home`, the workspace folders, in
  `createProviderSetup({adapters})`, disposed on deactivation. `extensionBundle.test.ts` now builds
  `src/extension.ts`. `src/test/copilot.smoke.test.ts` (M-07, runs on Windows only through the
  orchestrator): logs `process.versions.node`/`electron` and asserts `^20.19 || >=22.12`; skips with
  a logged reason unless `FEATHERSPEC_COPILOT_SMOKE=1` and availability is *available*; then a
  text-only run to `run.completed` and a write request rejected (file absent) in a temp folder,
  Mocha timeout 300 s, each wait reports what it awaited and the last event on timeout.
- **Verify:** `npx vitest run src/adapters/providers/copilot src/adapters/node/extensionBundle.test.ts src/adapters/vscode/manifest.test.ts` then the per-step gates and `npm run compile`
- [x] **Verified (T-007):** red first: the unchanged 0009 contract suite failed 10 of 13 copilot cases (async adapter, no credentials); `extensionBundle.test.ts` built on `src/extension.ts` failed 3 tests before the wiring; `copilotSettingValues` stub failed 2; the no-base-directory test failed 1. Green: contract 13/13 with the adapted suite, fake provider 61 still green, copilot + bundle + manifest tests pass; eslint, both tsc, `npm run compile` clean; `npm run test:unit` 2044 of 2045 (one timing test in SpecBoard.test.tsx failed under load, 26/26 alone). Host smoke compiled and linted only (not run here, skips without opt-in).
- **Notes:** (1) Contract suite adapted compatibly (main session decision, not a stop): `ContractSubject.settle?()` hook plus `session.advance(ms)` (clock advance, then settle), and the BR-010 case is conditional: with no credential values it expects `credentialChecks` equal to `[]`. Fake provider unaffected. (2) `baseDirectory` is optional: without a storage folder none is passed (AC-024). (3) Scripted client gained an `exit` step, `afterAnswer` and `configure`. (4) `isTrusted` wired to `vscode.workspace.isTrusted`. (5) `providers.smoke.test.ts` now expects `['copilot']` by default and finds the fake by id.

### T-008 — Docs sync and final gates

- **Covers:** AC-001 … AC-025 (AC-022 not planned, OP-007)
- **Do:** README: section "GitHub Copilot provider" (installed CLI 1.0.87+, `copilot.exe` on
  Windows, sign-in, the two settings, the disclosure, removed token variables, telemetry off,
  session files under Studio's global storage and outside its retention, remote limitation).
  `docs/agent-provider-port.md`: the `copilot` row. `AGENTS.md` snapshot — extend the
  `src/adapters/providers` entry (added by 0009) with "; copilot/ is the GitHub Copilot SDK adapter:
  client seam, SDK wrapper, mapping, scripted client (spec 0010)"; extend the `test/fixtures` entry
  with "and the recorded Copilot stream". `techContext.md`: SDK devDependency and `koffi` external,
  the bundle test, fixtures, host smoke and its opt-in variable, the `npm ci` download of the
  platform package. `systemPatterns.md`: client seam and scripted client, handler pairing, exit
  watcher (dated, linked). `activeContext.md`. Then every gate.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-008):** 2026-11-17. Docs only, no red test applies: `src/core/providers/portDocument.test.ts` (the port document's tables) stays green with the new `copilot` section. README section "GitHub Copilot provider", `docs/agent-provider-port.md`, `AGENTS.md` snapshot, `techContext.md`, `systemPatterns.md`, `activeContext.md` updated. Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 163 files, 2045 passed; `npm run compile` finished.
- **Notes:** `AGENTS.md` last-reconciled date was already 2026-11-17. Wiki not in this checkout.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-004, T-007 | copilotProvider.ts, src/extension.ts | copilotStart.test.ts, copilotContract.test.ts | verified (unit; host smoke open) |
| AC-002 | T-001, T-005, T-007 | cliLocator.ts, nodeLocate.ts, copilotSettingValues.ts, copilotProvider.ts | cliLocator.test.ts, copilotFailures.test.ts, copilotSettingValues.test.ts | verified (unit; host smoke open) |
| AC-003 | T-001, T-005 | cliLocator.ts, copilotProvider.ts | cliLocator.test.ts, copilotFailures.test.ts | verified (unit; host smoke open) |
| AC-004 | T-005 | copilotProvider.ts (sign-in check) | copilotFailures.test.ts | verified (unit; host smoke open) |
| AC-005 | T-002 | sdkClient.ts, esbuild.js, package.json | sdkClient.test.ts, extensionBundle.test.ts | verified (unit; host smoke open) |
| AC-006 | T-004 | copilotProvider.ts, sdkClient.ts | copilotStart.test.ts, sdkClient.test.ts | verified (unit; host smoke open) |
| AC-007 | T-004 | copilotProvider.ts | copilotStart.test.ts | verified (unit; host smoke open) |
| AC-008 | T-004, T-007 | copilotProvider.ts, copilotSettings.ts | copilotStart.test.ts, copilotSettingValues.test.ts | verified (unit; host smoke open) |
| AC-009 | T-005 | copilotProvider.ts (model check) | copilotFailures.test.ts | verified (unit; host smoke open) |
| AC-010 | T-003 | mapping.ts, testing/recorded.ts | mapping.test.ts, fixture.test.ts | verified (unit; host smoke open) |
| AC-011 | T-003 | mapping.ts | mapping.test.ts | verified (unit; host smoke open) |
| AC-012 | T-003 | mapping.ts | mapping.test.ts | verified (unit; host smoke open) |
| AC-013 | T-006 | copilotProvider.ts (handler pairing) | copilotInteraction.test.ts | verified (unit; host smoke open) |
| AC-014 | T-006 | copilotProvider.ts | copilotInteraction.test.ts | verified (unit; host smoke open) |
| AC-015 | T-006 | copilotProvider.ts | copilotInteraction.test.ts | verified (unit; host smoke open) |
| AC-016 | T-006 | copilotProvider.ts | copilotInteraction.test.ts | verified (unit; host smoke open) |
| AC-017 | T-006 | copilotProvider.ts (cancel, force stop) | copilotInteraction.test.ts | verified (unit; host smoke open) |
| AC-018 | T-005 | mapping.ts, copilotProvider.ts | copilotFailures.test.ts | verified (unit; host smoke open) |
| AC-019 | T-004 | copilotProvider.ts (resume) | copilotStart.test.ts | verified (unit; host smoke open) |
| AC-020 | T-002, T-005 | copilotProvider.ts (exit watcher), sdkClient.ts | copilotFailures.test.ts, sdkClient.test.ts | verified (unit; host smoke open) |
| AC-021 | T-005 | copilotProvider.ts | copilotFailures.test.ts | verified (unit; host smoke open) |
| AC-022 | — (not planned, OP-007) | — | — | not planned (OP-007) |
| AC-023 | T-004 | copilotProvider.ts | copilotStart.test.ts | verified (unit; host smoke open) |
| AC-024 | T-002, T-004, T-007 | copilotProvider.ts (base directory), sdkClient.ts | copilotStart.test.ts, sdkClient.test.ts | verified (unit; host smoke open) |
| AC-025 | T-006 | copilotProvider.ts (endSession) | copilotInteraction.test.ts | verified (unit; host smoke open) |

## Session handoff

- **Done so far:** T-001 … T-008 built and verified (2026-11-17); unit gates green; contract suite
  passes for `copilot` (adapted suite, T-007 Notes).
- **Next action:** run `npm test` on Windows/CI with `FEATHERSPEC_COPILOT_SMOKE=1` (host smoke, M-07);
  then `/sdd-compile` in a new session.
- **Open decisions:** none new; PoC-based assumptions A-006 etc. are confirmed only by M-07 on a real
  signed-in CLI.
- **Baseline:** bab7268
- **Environment:** `npm test` cannot run here; the host smoke runs on Windows through the
  orchestrator with `FEATHERSPEC_COPILOT_SMOKE=1`.
