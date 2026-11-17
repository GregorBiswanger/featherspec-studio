# Plan — Agent Provider Abstraction

**Spec:** [0009-agent-provider-abstraction.md](0009-agent-provider-abstraction.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-003 (stage 2, run in sequence with T-004)

## Approach

A new framework-free core module `src/core/providers/` holds the closed vocabulary (capabilities,
event kinds, availability results, error categories, generic texts), the **registry** and the
**provider service**: the core part of the port in front of every adapter. It routes by provider
ID and run ID, stamps the run ID, rewrites unknown kinds, adds the generic texts, enforces end of
run, open requests and operation results, and aggregates the adapters' credential values for
0004's masking. Adapters implement one interface, `AgentProviderPort`
(`src/core/ports/agentProvider.ts`), and deliver events through a per-run **callback sink**:
0010 already speaks of "0009's event callback", the Copilot SDK delivers by callback
(`session.on`, ADR-003 §7), and `close`/`fail` map the spec's "stream ends, closed or failed"
one to one; there is no backpressure an async iterator would buy. The **fake provider**
(`src/adapters/providers/fake/`) is the single test double for every consumer: scenarios, two
profiles, scripts and a call recorder. One **contract suite** (`src/core/providers/testing/`)
runs against every adapter through the service, the same pattern as 0004's store contract.
Order: vocabulary and document first (the surface 0008, 0010, 0011 and 0012 plan against), then
the registry with the full type file, then two independent chains — service and fake — then the
contract suite, then the extension wiring, then the docs sync. Memory Bank files touched:
`systemPatterns.md`, `techContext.md`, `activeContext.md` (T-009).

### Surface (binding for 0008, 0010, 0011, 0012; T-001 transcribes it into the document)

**Vocabulary** — `src/core/providers/vocabulary.ts`, each an `as const` array plus its type:

- `CAPABILITIES`: `start`, `cancel`, `resume`, `streamText`, `toolEvents`, `fileChanges`,
  `approvals`, `userInput`, `planUpdates`, `usage`, `modelList`, `mcp`, `customTools`,
  `typedErrors`. `CAPABILITY_VALUES`: `native`, `derived`, `none`.
  `CapabilityDeclaration = { [C in Capability]: { value: CapabilityValue; experimental?: true } }`
  (`experimental` only beside a value other than `none`).
- `EVENT_KINDS` (23, spec §8.2) and `KIND_CAPABILITY` (kind → the capability it needs);
  `END_KINDS`: `run.completed`, `run.failed`, `run.cancelled`.
- `AVAILABILITY_RESULTS`: `available`, `not-installed`, `not-signed-in`, `blocked-by-policy`,
  `unknown`. `ERROR_CATEGORIES`: `auth`, `quota_or_rate_limit`, `model_unavailable`,
  `network_or_server`, `runtime_missing`, `policy_denied`, `cancelled`, `tool_failure`, `unknown`.
- Texts (English, PD-016) — availability reasons: not-installed "The provider's runtime is not
  installed." · not-signed-in "You are not signed in to the provider." · blocked-by-policy "A
  policy blocks this provider." · unknown "The availability check failed." Category texts: auth
  "The provider rejected the sign-in." · quota_or_rate_limit "The provider's quota or rate limit
  was reached." · model_unavailable "The requested model is not available." · network_or_server
  "The provider could not be reached or reported a server error." · runtime_missing "The
  provider's runtime is missing or could not be started." · policy_denied "A policy denied the
  run." · cancelled "The run was cancelled." · tool_failure "A tool failed and the run could not
  continue." · unknown "The run failed for an unknown reason." Port-added reason:
  `STOPPED_WITHOUT_END_REASON` = "provider stopped without a final event"; check-timeout hint
  "The availability check gave no answer within 15 seconds."
- `AVAILABILITY_TIMEOUT_MS = 15_000` (OP-009; 0008 OP-006 uses the same constant).

**Events.** An adapter emits `DeliveredEvent = { kind, source: 'provider' | 'derived',
providerEventId?, occurredAt?, payload }`; consumers receive `ProviderEvent = DeliveredEvent &
{ runId }`. Payload field names (type aliases, assignable to 0004's `JsonValue`):
`session.started {sessionRef, model?}` · `turn.started`, `turn.completed {}` ·
`message.delta {text}` · `message.completed {text}` · `reasoning {text}` · `tool.started`,
`tool.progress {toolName, callId}` · `tool.completed {toolName, callId, ok, errorText?}` ·
`file.changed {path, operation: 'add'|'update'|'delete', confidence: 'reported'|'derived',
outsideProject}` · `approval.requested {requestId, actionKind, summary, outsideProject}` ·
`approval.resolved {requestId, decision: 'approve-once'|'reject'}` ·
`input.requested {requestId, question}` · `input.resolved {requestId}` ·
`plan.updated {items: {text, done}[]}` · `usage {totals: Record<string, number>}` (running
totals, OP-007) · `warning`, `retry {text}` · `auth.status {result, reason?}` ·
`run.completed {finalMessage?}` · `run.failed {category, text, providerMessage?, hint?}` — the
adapter omits `text`, the service adds the category's text · `run.cancelled {cause?}` ·
`provider.unknown {typeName, fieldNames}`. Mapping onto 0004's `EventInput`: `type` ← `kind`,
`payload`, `occurredAt`, `providerEventId`; 0004's envelope has no `source` (0012 A-006): 0011
decides where it is stored.

**Adapter interface** — `AgentProviderPort` in `src/core/ports/agentProvider.ts`:
`id`, `displayName`, `capabilities`, `permissionModeLabel`, `disclosure?` ·
`checkAvailability(): Promise<{result, hint?}>` · `start({runId, workingDirectory, prompt,
model?}, sink): Promise<void>` · `resume({runId, workingDirectory, sessionRef,
continuationText}, sink): Promise<void>` · `cancel(runId)`, `respondToApproval(runId, requestId,
answer)`, `respondToInput(runId, requestId, text)`: `Promise<{ok: true} | {ok: false, reason}>`
· `endSession(runId): void` · `listModels(): Promise<readonly string[]>` ·
`nextStartModel(): string | undefined` · `credentialValues(): readonly string[]`.
`ProviderEventSink = { emit(event), close(), fail(reason) }`; a rejected `start`/`resume` counts
as `fail`. `ApprovalAnswer = {decision: 'approve-once'} | {decision: 'reject', reason?}`.

**Registry** — `createProviderRegistry()` in `src/core/providers/registry.ts`:
`register(adapter): {kind: 'ok'} | {kind: 'refused', reason}` · `unregister(id)` ·
`list(): readonly ProviderEntry[]` (`{id, displayName, capabilities, permissionModeLabel,
disclosure?}`) · `entry(id)` and `nextStartModel(id)`: `{kind: 'ok', …} | {kind:
'not-registered', providerId}` · `onDidChange(listener): Disposable`.

**Service** — `createProviderService({registry, clock: RuntimeClock})` in
`src/core/providers/providerService.ts`. Every operation resolves to `{kind: 'ok', …}` or one
refusal `{kind, …}` with kind `not-registered` · `not-supported` (with `providerId`) ·
`unknown-run` · `already-ended` · `request-not-open` · `invalid-answer` · `failed` (with
`reason`); it never throws. `checkAvailability(providerId)` → `ok {result, reason?, hint?}` ·
`start(providerId, request)` · `resume(providerId, request)` · `cancel(runId)` ·
`endSession(runId)` · `respondToApproval(runId, requestId, answer)` · `respondToInput(runId,
requestId, text)` · `listModels(providerId)` → `ok {models}` · `onEvent(listener):
Disposable` · `credentials: CredentialValuesPort` (0004).

**Assembly** — `createProviderSetup({clock, adapters?, toggled?: {enabled: SettingPort, create()}[]})`
in `src/core/providers/providerSetup.ts` → `{registry, service, dispose}`; `SettingPort = {read():
unknown; onDidChange(listener): Disposable}` joins `src/core/ports/host.ts`. 0010 adds its adapter
to `adapters` in the composition root.

**Fake** — `createFakeProvider({clock, profile?: 'full'|'minimal', scenario?: FakeScenario | (() =>
unknown), script?, capabilities?, availability?: {result, hint?} | 'no-answer'})` in
`src/adapters/providers/fake/fakeProvider.ts`, plus `calls()` (recorded operations). Constants:
`FAKE_PROVIDER_ID = 'fake'`, display name "Fake provider (no agent, no network)", labels full
"Asks before every tool action (fake approvals)" and minimal "Never asks (no approval support)",
model `fake-model` (also its next-start model), session reference `fake-session-<runId>`,
`message.delta` count 3 at 50 ms, long-run interval 1 000 ms, `file.changed` path `README.md`
(`update`), sample credential `fake-sample-credential-7f3a` (matches no 0004 pattern, so only the
credential port can mask it). Scenario IDs (setting values): `happy-path`, `approval`, `input`,
`failure:<category>` for the eight non-`cancelled` categories, `long-run`, `unknown-event`,
`duplicates-and-late`, `no-end`; an unknown setting value runs `happy-path`. Script steps:
`emit`, `wait` (ms), `awaitAnswer` (branch per answer), `ignoreCancel`, `close`, `fail`.

**Settings** — `featherspec-studio.fakeProvider.enabled` (boolean, default `false`) and
`featherspec-studio.fakeProvider.scenario` (enum of the scenario IDs, default `happy-path`), both
default scope `window`.

**Contract suite** — `runProviderContract(name, harness)` in
`src/core/providers/testing/contract.ts`; `harness.create(clock)` returns `{adapter,
arrange(case)}` with case `happy` · `approval` · `input` · `unknown-event` · `no-end` ·
`long-run` · `failure-unknown` · `credential-in-text` · `failing-operation`. A case whose
capability is `none` is never arranged; the suite asserts `not-supported` instead.

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-008, T-009).
Pre-done gate on CI or Windows: `npm test` with the new `src/test/providers.smoke.test.ts`.

## Research

- Survey: no provider code exists. Credential port `CredentialValuesPort` in
  `src/core/ports/runtimeMedium.ts`; the composition root passes `{ values: () => [] }` to
  `openRuntimeStore` (`src/extension.ts`), T-008 replaces it with `service.credentials`. Clock:
  `RuntimeClock` plus `createFakeRuntimeClock` (`src/core/runtime/testing/fakes.ts`) and
  `createSystemRuntimeClock`. Import-scan precedent: `src/core/runtime/importScan.test.ts`; the
  ESLint core block bans `vscode`, `fs`, `sqlite` in production core files only. Settings precedent:
  `src/adapters/vscode/runtimeSettings.ts`, manifest test `src/adapters/vscode/manifest.test.ts`.
  Core tests already import adapters (`src/core/lifecycle/testing/projects.ts`), so consumers'
  core tests may import the fake; the new ban covers production files only. No literal `'fake'`
  or `'copilot'` in production `src/` today. No `featherspec-studio` setting defaults to `fake`.
- Assumptions this plan adds: a `start` with a run ID the service already knows returns `failed`
  ("run ID already started"), a guard only — 0004 issues unique IDs. A `respondToInput` whose
  text is not a string is `invalid-answer`. Removing a provider never touches runs it already
  started: the service keeps the adapter per run.
- Decisions taken here per spec §12: callback sink (above); names, texts and constants of
  *Surface*; timeout 15 s (OP-009); settings keys; open points OP-004…OP-010 resolved in the
  spec 2026-11-16 by its own recommendations (Gregor). No PD newer than the spec changes it.
- [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md) §3–§4, §7 — capability and
  taxonomy source; Copilot delivers events by callback (`session.on`), retrieved 2026-11-16 (repo).
- [VS Code contribution points](https://code.visualstudio.com/api/references/contribution-points)
  — boolean and enum settings with `enumDescriptions`; default scope `window`; retrieved 2026-11-16.
- [Vitest: mocking modules](https://vitest.dev/guide/mocking/modules) and
  [file system](https://vitest.dev/guide/mocking/file-system) — `vi.mock` is hoisted; built-ins are
  mocked by specifier (`node:fs`, `node:fs/promises`); the docs do not say a bare `fs` is covered,
  so AC-013 mocks both spellings; retrieved 2026-11-16.
- No new dependency (the provider SDK belongs to 0010).

## Stages

1. T-001 → T-002 — the surface: vocabulary, port document, import scan, types, registry
2. T-003 ‖ T-004 — independent: provider service core (`src/core/providers/providerService*`) and
   fake scenarios (`src/adapters/providers/fake/`), own tests each
3. T-005 ‖ T-006 — independent: service requests and availability; fake interactions
4. T-007 — contract suite against the fake in both profiles, third provider, literal scan
5. T-008 → T-009 — extension wiring and settings; docs sync and final gates

Parallel: stages 2 and 3. Both chains read only T-001/T-002's files; a change to
`vocabulary.ts` or `agentProvider.ts` during a `‖` step stops the stage and becomes its own step.

## Steps

### T-001 — Vocabulary, port document and import scan

- **Covers:** AC-001, AC-002
- **Do:** `src/core/providers/vocabulary.ts` with the lists, `KIND_CAPABILITY`, texts and timeout of
  *Surface*. `docs/agent-provider-port.md`: operations (§8.1), one table each for capabilities,
  event kinds with payload, availability results, error categories (backticked name in the first
  cell), the fake, settings, contract suite and how a consumer uses the fake in tests.
  `src/core/providers/portDocument.test.ts` parses the four tables and compares both directions
  with the code lists (negative control: a doc missing one name fails). `src/core/providers/importScan.test.ts`:
  no production file under `src/core/` or `src/webview/` imports a path that resolves into
  `src/adapters/providers/` or a package of `PROVIDER_SDKS` (`@github/copilot-sdk`,
  `@anthropic-ai/claude-agent-sdk`, `@openai/codex-sdk`, subpaths included), with a negative control;
  the same ban as an ESLint pattern in the core production block.
- **Verify:** `npx vitest run src/core/providers` then the per-step gates
- [x] **Verified (T-001):** 2026-11-16. Red: `npx vitest run src/core/providers` failed, portDocument.test.ts could not load the missing module `./vocabulary` (import scan test green at once; its negative control proves every SDK, subpath and adapter path is caught). Green after vocabulary.ts and docs/agent-provider-port.md: 2 files, 8 tests passed. Negative controls: a document missing one name per table, or listing an extra one, fails. ESLint pattern checked on a probe file (adapter import and SDK subpath both errors, probe removed). Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 1358 passed.
- **Notes:** —

### T-002 — Port types and registry

- **Covers:** AC-003, AC-004, AC-005
- **Do:** `src/core/ports/agentProvider.ts` with every type of *Surface* (events, payloads, sink,
  requests, answers, `AgentProviderPort`), plus a type-level check that each payload is assignable
  to 0004's `JsonValue`. `src/core/providers/registry.ts`: validation of ID (non-empty, lowercase,
  unique), declaration (every capability once, no other, value in the three, `start` not `none`,
  `experimental` only beside a value), refusal naming ID and defect with the registry unchanged;
  `list`, `entry`, `nextStartModel`, `unregister`, `onDidChange`. Test helper
  `src/core/providers/testing/adapters.ts` (`declaredAdapter(id, overrides)`). Tests
  `registry.test.ts`, including a declaration using all three values and the marker.
- **Verify:** `npx vitest run src/core/providers/registry` then the per-step gates
- [x] **Verified (T-002):** 2026-11-16. Red: `npx vitest run src/core/providers/registry` 11 tests failed on the `Not implemented` stub of createProviderRegistry. Green after the implementation: `npx vitest run src/core/providers` 4 files, 20 tests passed (registry.test.ts 11, payloadTypes.test.ts 1: every payload type is assignable to JsonValue, checked by tsc). Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 100 files, 1370 passed.
- **Notes:** —

### T-003 — Provider service: routing, normalisation, end of run

- **Covers:** AC-006, AC-007, AC-009, AC-011, AC-015
- **Files:** `src/core/providers/providerService.ts`, `src/core/providers/providerService.test.ts`,
  `src/core/providers/testing/controlledAdapter.ts`
- **Do:** `createProviderService` with `start`, `resume`, `cancel`, `endSession`, `listModels`,
  `onEvent`. Per run: the adapter it started on, ended flag, session-ended flag. Events pass in
  order with the run ID stamped; a kind outside `EVENT_KINDS` becomes `provider.unknown` (type name,
  top-level field names); `run.failed` gets its category text; the first end kind ends the run,
  later events pass unchanged; `close`/`fail`/rejected start without an end kind adds one derived
  `run.failed{unknown}` with `STOPPED_WITHOUT_END_REASON`, after an end kind nothing; after
  `endSession` nothing passes. Results: `not-supported` for a `none` capability, `unknown-run`,
  `already-ended` for a cancel after the end, `failed` when the adapter answers `ok: false` or
  throws; a refused operation passes no event. `controlledAdapter` hands the sink to the test.
- **Verify:** `npx vitest run src/core/providers/providerService.test.ts`
- [x] **Verified (T-003):** 2026-11-17. Red: `npx vitest run src/core/providers/providerService.test.ts` 21 tests failed on the `Not implemented` stub of createProviderService. Green after the implementation: 21 tests passed (providers folder 41 in 5 files). Gates: eslint --max-warnings 0, tsc, tsc -p src/webview clean; `npm run test:unit` 101 files, 1391 passed.
- **Notes:** —

### T-004 — Fake provider: profiles, scenarios, no I/O

- **Covers:** AC-008, AC-011, AC-013, AC-014, AC-017, AC-022
- **Files:** `src/adapters/providers/fake/fakeProvider.ts`, `src/adapters/providers/fake/script.ts`,
  `src/adapters/providers/fake/scenarios.ts`, `src/adapters/providers/fake/fakeProvider.test.ts`,
  `src/adapters/providers/fake/noIo.test.ts`
- **Do:** the fake of *Surface*: profiles full and minimal (a scenario drops kinds its profile
  rules out), the script engine on `RuntimeClock`, scenarios `happy-path`, `failure:<category>`,
  `unknown-event` (`fake.mystery`, field names only), `duplicates-and-late`, `no-end`; session
  reference by form, `credentialValues()` returns the sample credential, which `failure:auth` puts
  into `providerMessage`; `calls()`; availability as set. Tests on a recording sink: kinds and
  payloads per scenario, determinism of two runs (run ID and session reference aside), profile
  minimal delivers no kind whose capability is `none`, the credential is returned when the event
  is emitted. `noIo.test.ts`: `vi.mock` of `fs`, `node:fs`, `fs/promises`, `node:fs/promises`,
  `net`, `http`, `https`, `http2`, `tls`, `dgram`, `child_process` (both spellings) with
  recorders that throw; every scenario runs to its end with no recorder hit; plus an import scan of
  the fake folder.
- **Verify:** `npx vitest run src/adapters/providers/fake`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Service: open requests, answers, availability, credentials

- **Covers:** AC-010, AC-019, AC-022
- **Files:** `src/core/providers/providerService.ts`, `src/core/providers/providerRequests.test.ts`,
  `src/core/providers/providerAvailability.test.ts`
- **Do:** open requests per run from `.requested` until `.resolved` or the end; one accepted answer
  each; only `approve-once` / `reject` (optional reason) and string input, passed unchanged;
  otherwise `request-not-open` or `invalid-answer`, nothing reaches the adapter, the run continues;
  after 24 h of clock time an unanswered request is still open. `checkAvailability`: generic reason
  per result, adapter hint kept, a throw or no answer within `AVAILABILITY_TIMEOUT_MS` → `unknown`
  with the timeout hint; registry reads, registration and `list` cause no check (counted).
  `credentials.values()` returns the union of registered adapters and adapters of runs started.
- **Verify:** `npx vitest run src/core/providers/providerRequests.test.ts src/core/providers/providerAvailability.test.ts`
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Fake: approval, input, long run, resume

- **Covers:** AC-015, AC-016, AC-018, AC-019
- **Files:** `src/adapters/providers/fake/scenarios.ts`, `src/adapters/providers/fake/fakeInteraction.test.ts`
- **Do:** scenarios `approval` (*approve once* → `approval.resolved`, `tool.completed{ok}`; *reject*
  → `tool.completed{not ok}`; then `run.completed`), `input` (`input.resolved` without the answer
  text), `long-run` (deltas each 1 000 ms until cancel → `run.cancelled` last), `ignoreCancel`;
  `endSession` stops the run's timers; `resume` with a reference of the fake's form → `session.started`
  with it under the new run ID … `run.completed`, any other → `run.failed{unknown}`. Tests: no event
  while a request is open, also after 24 h; the fake answers nothing itself.
- **Verify:** `npx vitest run src/adapters/providers/fake/fakeInteraction.test.ts`
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Contract suite, third provider, literal scan

- **Covers:** AC-020, AC-021
- **Do:** `src/core/providers/testing/contract.ts`: through the service, BR-002 (valid declaration;
  no delivered kind whose capability is `none`; `typedErrors` `none` → `unknown`), BR-003, BR-005,
  BR-007 (`session.started` first unless `run.failed`; source on every event; unknown → field names
  only), BR-008 (exactly one end kind; end kind after cancel; derived `run.failed` on `no-end`),
  BR-010 (credential returned at emit time); `none` parts assert `not-supported`.
  `src/adapters/providers/fake/fakeContract.test.ts` runs it for both profiles (arrange via
  scripts). `src/core/providers/extensibility.test.ts`: a test-only provider under a new ID is
  registered, listed and run to `run.completed` through the service. `src/core/providers/providerIdScan.test.ts`:
  no production module outside `src/adapters/providers/` and `src/extension.ts` holds `'fake'` or
  `'copilot'` as a string literal (`PROVIDER_IDS`; a new adapter joins it), with a negative control.
- **Verify:** `npx vitest run src/core/providers src/adapters/providers` then the per-step gates
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Extension wiring and fake settings

- **Covers:** AC-010, AC-012, AC-022
- **Do:** `SettingPort` in `src/core/ports/host.ts`; `src/core/providers/providerSetup.ts`
  (registry, service, toggled registration: on → register, off → unregister, a running fake run
  continues) with `providerSetup.test.ts` (no availability call at setup or switching, counted).
  `src/adapters/vscode/providerSettings.ts` (read, `onDidChangeConfiguration` with
  `affectsConfiguration`). `package.json`: the two settings with `enumDescriptions`. Manifest test:
  `enabled` defaults to `false`, the scenario enum equals `FAKE_SCENARIOS`, no configuration property
  defaults to a provider ID of `PROVIDER_IDS`. `src/extension.ts`: setup, fake factory, and
  `service.credentials` instead of the empty list for `openRuntimeStore`; `StudioApi.providers()`.
  Host smoke `src/test/providers.smoke.test.ts` (fake absent by default, present after switching
  on, gone after off; CI only).
- **Verify:** `npx vitest run src/core/providers/providerSetup.test.ts src/adapters/vscode/manifest.test.ts` then the per-step gates and `npm run compile`
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Docs sync and final gates

- **Covers:** AC-001 … AC-022
- **Do:** README: a "Providers" section (fake provider settings, link to
  `docs/agent-provider-port.md`). `AGENTS.md` snapshot — add modules
  `'src/core/providers — provider vocabulary, registry, provider service (the port in front of
  adapters), setup with toggled registration, contract suite (spec 0009)'` and
  `'src/adapters/providers — provider adapters behind AgentProviderPort; fake/ is the deterministic
  fake provider (spec 0009)'`; extend the `src/core/ports` entry with "agent provider port, setting
  port". `systemPatterns.md`: replace the planning bullet on the provider surface by the built
  decisions (sink, service adds texts, fake as the single double). `techContext.md`: provider
  contract suite, `noIo` test, host smoke file. `activeContext.md`. Then every gate.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [ ] **Verified (T-009):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | src/core/providers/vocabulary.ts, docs/agent-provider-port.md | portDocument.test.ts | verified |
| AC-002 | T-001 | eslint.config.mjs, src/core/providers/testing/scan.ts | importScan.test.ts | verified |
| AC-003 | T-002 | src/core/providers/registry.ts | registry.test.ts (AC-003) | verified |
| AC-004 | T-002 | src/core/providers/registry.ts:declarationDefect | registry.test.ts (AC-004) | verified |
| AC-005 | T-002 | src/core/providers/registry.ts:copyDeclaration | registry.test.ts (AC-005) | verified |
| AC-006 | T-003 | — | — | open |
| AC-007 | T-003 | — | — | open |
| AC-008 | T-004 | — | — | open |
| AC-009 | T-003 | — | — | open |
| AC-010 | T-005, T-008 | — | — | open |
| AC-011 | T-003, T-004 | — | — | open |
| AC-012 | T-008 | — | — | open |
| AC-013 | T-004 | — | — | open |
| AC-014 | T-004 | — | — | open |
| AC-015 | T-003, T-006 | — | — | open |
| AC-016 | T-006 | — | — | open |
| AC-017 | T-004 | — | — | open |
| AC-018 | T-006 | — | — | open |
| AC-019 | T-005, T-006 | — | — | open |
| AC-020 | T-007 | — | — | open |
| AC-021 | T-007 | — | — | open |
| AC-022 | T-004, T-005, T-008 | — | — | open |

## Session handoff

- **Done so far:** start signal given 2026-11-16, pair moved backlog → active; stage 1 (T-001, T-002) done and committed; parallel stages run in sequence (standing approval).
- **Next action:** T-003 service core (test first), then T-004 fake scenarios; stage 2 ends after T-004.
- **Open decisions:** none. Nine steps (one over the aim): the surface step carries the document,
  and the service and the fake are each two slices so they can run in parallel.
- **Baseline:** 2026-11-16, eslint, both tsc runs and `npm run test:unit` green: 1350 tests.
- **Environment:** `npm test` cannot run here (VS Code download blocked); the host smoke runs on CI.
