# Agent provider port

How FeatherSpec Studio reaches coding-agent providers (spec 0009). Core code and the webview know
only this port; adapters (`src/adapters/providers/`) implement it. A test keeps this document and
the code in step: every capability, event kind, availability result and error category below is
checked against `src/core/providers/vocabulary.ts` in both directions.

## Overview

- `AgentProviderPort` (`src/core/ports/agentProvider.ts`) is the interface an adapter implements.
- The registry (`createProviderRegistry`) holds the adapters Studio knows; consumers find a provider only there.
- The provider service (`createProviderService`) is the core part in front of every adapter: it routes by provider ID and run ID, stamps the run ID, rewrites unknown kinds, adds the generic texts, enforces the end of a run, open requests and operation results. Consumers talk to the service, never to an adapter.
- Adapters deliver events through a per-run sink: `emit(event)`, `close()`, `fail(reason)`. A rejected `start` or `resume` counts as `fail`.
- No module under `src/core/` or `src/webview/` imports `src/adapters/providers/` or a provider SDK (`@github/copilot-sdk`, `@anthropic-ai/claude-agent-sdk`, `@openai/codex-sdk`); an import scan and an ESLint rule decide it.

## Operations

| Operation | Meaning |
| --- | --- |
| `checkAvailability` | One check for installation, sign-in and policy; runs only on a user action, never at activation, registration or in the background. No answer within 15 seconds is `unknown`. |
| `start` | `{runId, workingDirectory, prompt, model?}` plus the sink; carries no permission mode; returns no session reference, which arrives with `session.started`. |
| `resume` | `{runId, workingDirectory, sessionRef, continuationText}` plus the sink; a new run. |
| `cancel` | Cancels the run; the end is `run.cancelled`. After an end kind: `already-ended`. |
| `endSession` | Ends the session without waiting for the provider, whatever `cancel` declares; nothing more is passed on for that run. |
| `respondToApproval` | Answer `approve-once` or `reject` (optional reason), nothing else; one answer per open request. |
| `respondToInput` | Free-text answer to an open input request; one answer per request. |
| `listModels` | The models the adapter offers. |
| `nextStartModel` | The model the adapter would start with, or none. |

Every service operation resolves to `{kind: 'ok', ...}` or one refusal and never throws. Refusals:
`not-registered`, `not-supported` (capability `none`, with the provider ID), `unknown-run`,
`already-ended`, `request-not-open`, `invalid-answer`, `failed` (with the reason). A refused
operation passes no event.

Adapter members beside the operations: `id`, `displayName`, `capabilities`, `permissionModeLabel`,
`disclosure?`, `credentialValues()`.

## Capabilities

Each is declared `native` (the provider does it), `derived` (the adapter achieves or infers it) or
`none`; a value other than `none` may carry the marker `experimental`. A declaration names every
capability and no other, with `start` not `none`; anything else is refused at registration.

| Capability | Meaning |
| --- | --- |
| `start` | Starting a run. Never `none`. |
| `cancel` | Cancelling a run. |
| `resume` | Resuming from a session reference. |
| `streamText` | Delivers `message.delta`. |
| `toolEvents` | Delivers `tool.started`, `tool.progress`, `tool.completed`. |
| `fileChanges` | Delivers `file.changed`. |
| `approvals` | Delivers approval requests and takes answers. |
| `userInput` | Delivers input requests and takes answers. |
| `planUpdates` | Delivers `plan.updated`. |
| `usage` | Delivers `usage` with running token totals. |
| `modelList` | Answers `listModels`. |
| `mcp` | MCP servers; declared, unused in the MVP. |
| `customTools` | Custom tools; declared, unused in the MVP. |
| `typedErrors` | Maps provider errors to categories; with `none` every `run.failed` carries `unknown`. |

An adapter delivers a kind only where its capability is not `none`.

## Event kinds

An adapter emits `{kind, source: 'provider' | 'derived', providerEventId?, occurredAt?, payload}`;
consumers receive the same with the `runId`. `session.started` comes first, unless `run.failed`
ends the run before a session exists. The first end kind (`run.completed`, `run.failed`,
`run.cancelled`) ends the run; later events, another end kind included, are passed on normalised like any
other event (a `run.failed` gets its category text) and no end kind is added. A kind
outside this table becomes `provider.unknown` with that kind as type name.

| Kind | Capability | Payload |
| --- | --- | --- |
| `session.started` | none | `sessionRef`, `model?` |
| `turn.started` | none | empty |
| `turn.completed` | none | empty |
| `message.delta` | `streamText` | `text` |
| `message.completed` | none | `text` |
| `reasoning` | none | `text` |
| `tool.started` | `toolEvents` | `toolName`, `callId` |
| `tool.progress` | `toolEvents` | `toolName`, `callId` |
| `tool.completed` | `toolEvents` | `toolName`, `callId`, `ok`, `errorText?` |
| `file.changed` | `fileChanges` | `path`, `operation` (`add`, `update`, `delete`), `confidence` (`reported`, `derived`), `outsideProject` |
| `approval.requested` | `approvals` | `requestId`, `actionKind`, `summary`, `outsideProject` |
| `approval.resolved` | `approvals` | `requestId`, `decision` (`approve-once`, `reject`) |
| `input.requested` | `userInput` | `requestId`, `question` |
| `input.resolved` | `userInput` | `requestId`; never the answer text |
| `plan.updated` | `planUpdates` | `items`: list of `{text, done}` |
| `usage` | `usage` | `totals`: running totals per name |
| `warning` | none | `text` |
| `retry` | none | `text` |
| `auth.status` | none | `result`, `reason?`; what the provider reports itself, not a check |
| `run.completed` | none | `finalMessage?` |
| `run.failed` | none | `category`, `text` (added by the service), `providerMessage?`, `hint?` |
| `run.cancelled` | none | `cause?` |
| `provider.unknown` | none | `typeName`, `fieldNames`; never values |

If an adapter's stream ends (`close` or `fail`) without an end kind, the service adds one derived
`run.failed` with category `unknown` and the reason "provider stopped without a final event".

## Availability results

| Result | Generic reason |
| --- | --- |
| `available` | none |
| `not-installed` | The provider's runtime is not installed. |
| `not-signed-in` | You are not signed in to the provider. |
| `blocked-by-policy` | A policy blocks this provider. |
| `unknown` | The availability check failed. If no answer comes in 15 seconds: "The availability check gave no answer within 15 seconds." as hint. |

The adapter may add a hint beside the generic reason.

## Error categories

They classify `run.failed` only; a cancellation is `run.cancelled`, a failed tool call that does
not end the run is `tool.completed` without a category. The adapter may add the provider's
message and a hint; an error it cannot map is `unknown`.

| Category | Generic text |
| --- | --- |
| `auth` | The provider rejected the sign-in. |
| `quota_or_rate_limit` | The provider's quota or rate limit was reached. |
| `model_unavailable` | The requested model is not available. |
| `network_or_server` | The provider could not be reached or reported a server error. |
| `runtime_missing` | The provider's runtime is missing or could not be started. |
| `policy_denied` | A policy denied the run. |
| `cancelled` | The run was cancelled. |
| `tool_failure` | A tool failed and the run could not continue. |
| `unknown` | The run failed for an unknown reason. |

## Credentials

An adapter adds no credential to an event or error text. Its `credentialValues()` returns every
credential value it holds; the service aggregates them for the runtime store's masking
(`service.credentials`), so a provider text containing one is masked.

## Fake provider

`createFakeProvider` (`src/adapters/providers/fake/fakeProvider.ts`) is the single test double for
every consumer. It opens no network connection and never creates, changes or deletes a file.

| Name | Value |
| --- | --- |
| ID and display name | `fake`, "Fake provider (no agent, no network)" |
| Profile `full` | every capability `native` except `mcp` and `customTools` `none`; label "Asks before every tool action (fake approvals)" |
| Profile `minimal` | `start`, `cancel`, `toolEvents` `native`, the rest `none`; label "Never asks (no approval support)" |
| Constants | model `fake-model`, session reference `fake-session-<runId>`, three `message.delta` at 50 ms, long-run interval 1 000 ms, `file.changed` path `README.md` (`update`), sample credential `fake-sample-credential-7f3a` |
| Scenarios | `happy-path`, `approval`, `input`, `failure:<category>` (every category except `cancelled`), `long-run`, `unknown-event`, `duplicates-and-late`, `no-end` |
| Script steps | `emit`, `wait`, `awaitAnswer`, `ignoreCancel`, `close`, `fail` |

An unknown scenario value runs `happy-path`. `calls()` returns the recorded operations. Runs are
deterministic: the same scenario, profile, clock and answers deliver the same kinds and payloads.

## Settings

| Setting | Meaning |
| --- | --- |
| `featherspec-studio.fakeProvider.enabled` | Boolean, default `false`. On registers the fake, off removes it without a reload; a running fake run continues. |
| `featherspec-studio.fakeProvider.scenario` | Enum of the scenario IDs, default `happy-path`; read at each start. |

The fake is never chosen by Studio; a default provider setting never ships as `fake`.

## Contract suite

`runProviderContract(name, harness)` (`src/core/providers/testing/contract.ts`) runs through the
service against every adapter. `harness.create(clock)` returns `{adapter, arrange(case)}`; cases:
`happy`, `approval`, `input`, `unknown-event`, `no-end`, `long-run`, `failure-unknown`,
`credential-in-text`, `failing-operation`. A case whose capability is `none` is never arranged;
the suite asserts `not-supported` instead. A new adapter adds a test that calls the suite.

## Testing with the fake

Build the service with `createProviderService({registry, clock})`, register
`createFakeProvider({clock, profile, scenario})`, advance a fake clock
(`createFakeRuntimeClock`) and read events through `service.onEvent`. Pass a script to build an
exact stream, and `capabilities` to declare another capability set. Core tests may import the
fake; production core files may not.
