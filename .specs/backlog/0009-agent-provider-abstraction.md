# Agent Provider Abstraction

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-009 ([po-handoff.md](../../docs/product/po-handoff.md) §2.1, §8.3, §10 FS-009,
§14 *Provider Contract Tests*). Depends on: 0004 (event envelope, credential port for masking).
Consumers: 0008 (availability before start), 0010 (first real adapter), 0011 (runs, status
transitions, error class), 0012 (display). Starting point: [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md)
§3–§4 (Proposed, adopted here by Gregor 2026-11-16). Where the PD register and ADR-003 disagree, the
PD register wins.

## 1. Summary

One provider port in the core through which Studio reaches every coding-agent provider; a
registry of the providers it knows; a declared, honest capability model; one normalised event
taxonomy; normalised error categories; and a deterministic **fake provider** that lets the whole
MVP workflow run in plain Node and in the extension without any external API, account or network.

## 2. Goal and problem

Studio must work with several providers (handoff §2, P3) while the first real one (PD-001,
Copilot SDK) is not yet proven on Gregor's machine. Without a stable port every later provider
would ripple into domain and UI code, and nothing could be tested before the PoC. Success: the
fake provider drives the end-to-end scenario of handoff §21 automatically; a second provider is
added by adding an adapter, not by changing consumers (AC-009.7).

## 3. Users and roles

- Developer (Gregor): sees which providers exist, what each can do, why one is not usable.
- Developer of Studio and AI coding agents: implement adapters against one contract and test the
  workflow with the fake provider.
- No permission differences; Studio has one role.

## 4. Scope

### In scope

- The provider port: availability check, capabilities, start, resume, cancel, approval answer,
  input answer, model list, event delivery, credential values for masking.
- The provider registry.
- The capability model (closed list, three values plus an experimental marker).
- The normalised event taxonomy and the payload each kind carries.
- Provider error categories and their generic texts.
- The provider contract test suite every adapter passes.
- The fake provider: scenarios, two capability profiles, a setting that makes it selectable in the
  shipped extension.
- One document describing the port (AC-001).

### Out of scope

- The Copilot adapter, its sign-in, SecretStorage use and runtime-installed check — because 0010 owns them (Q1, Gregor 2026-11-16).
- Run creation, run statuses and their allowed transitions, the mapping of event kinds to status changes, run error class — because 0004 and 0011 own them (PD-025); ADR-003 §4's status column is input for 0011.
- Storing events, sequence numbers, duplicate detection, masking itself — because 0004 owns them (0004 AC-005, AC-007, AC-013).
- Showing providers, capabilities, events or errors in the UI — because 0008 and 0012 own those views; 0005 owns panel-level states (PD-036).
- Claude Agent SDK and Codex adapters — because PD-001 picks one provider first; ADR-003 §1 names them as later candidates.
- MCP servers and custom tools in use — because PD-009 excludes them; the capabilities are declared only.
- Adopting provider sessions Studio did not start — because PD-010 excludes it.
- Raw provider data in events — because PD-029 excludes it from the MVP (Q6).
- Approving for a whole session or a location — because it widens permissions without a per-action human decision (PD-006, Q5).
- Background or periodic availability checks — because checks run only on a user action (Q7).
- A fake provider that changes workspace files — because a test double must never touch the user's work (Q3).

## 5. Functional flow

1. At activation Studio registers its provider adapters; the fake only when its setting is on (BR-006).
2. A consumer (0008) asks the registry for the providers and their capabilities, and on a user
   action asks one provider for its availability (BR-004).
3. 0011 starts a run through the port with the run ID, the project root as working context and
   the prompt; the adapter returns a session reference and delivers normalised events (BR-002).
4. When an `approval.requested` or `input.requested` event arrives, the human's answer goes back
   through the port (BR-005); cancel and resume go the same way where declared (BR-003).
5. The run ends with exactly one of `run.completed`, `run.failed`, `run.cancelled` (BR-008).

## 6. Business rules

- **BR-001 Registry.** Each provider has a provider ID (unique, stable, lowercase), a display name
  and its capability declaration. A second registration under an existing ID is refused. Consumers
  find providers only through the registry and never name a specific provider (AC-009.7).
- **BR-002 Capabilities.** Closed list, from ADR-003 §3: `start`, `cancel`, `resume`, `streamText`,
  `toolEvents`, `fileChanges`, `approvals`, `userInput`, `planUpdates`, `usage`, `modelList`,
  `mcp`, `customTools`, `typedErrors`. Each is declared `native`, `derived` or `none`, and may carry
  the marker *experimental* (Q9). `start` must be `native` or `derived`; otherwise registration is
  refused. A provider declares every capability; a missing one is a refused registration, never a
  silent `none`. `mcp` and `customTools` are declared but never used in the MVP (PD-009).
- **BR-003 Unsupported operations.** Calling resume, cancel, an approval answer, an input answer or
  the model list on a provider that declares the capability `none` returns the result *not
  supported* with the provider ID — never an exception, never an empty success. Resume is offered
  only where declared (PD-007).
- **BR-004 Availability.** Results: *available*, *not installed*, *not signed in*, *blocked by
  policy*, *unknown* — each with a one-line reason. It is checked only when a user action needs it
  (before a start, or the "Check Provider" command) — no check at activation or in the background
  (Q7). 0009 owns the generic reason texts; an adapter may add a provider-specific hint.
- **BR-005 Approvals.** The human answers an approval request with *approve once* or *reject*
  (optional reason) — nothing else (Q5). An adapter passes exactly that decision on and never
  translates it into a wider one. Nothing is answered without a human (PD-006): an open request
  stays open until answered, cancelled or ended by the provider.
- **BR-006 Fake provider.** Provider ID `fake`, display name "Fake provider (no agent, no
  network)". Registered in the shipped extension only while the setting "Enable fake provider" is
  on (off by default); never the default provider; in tests always available (Q2). It makes no
  network connection and never creates, changes or deletes a file (Q3). Its runs are deterministic:
  the same scenario and profile yield the same sequence of kinds and payloads (§8.3).
- **BR-007 Normalisation.** Every event an adapter delivers carries a kind from the taxonomy (§8.2)
  and the source `provider` (mapped from a provider event) or `derived` (inferred by the adapter or
  the port). A provider event the adapter does not map becomes `provider.unknown` carrying only the
  provider's type name and its top-level field names, never values (Q6, PD-029).
- **BR-008 End of run.** A run ends with exactly one end kind. If the provider's stream stops, or
  the adapter fails, without an end kind, the port delivers a derived `run.failed` with category
  `unknown` and the reason "provider stopped without a final event". Events after the end kind are
  passed on unchanged (late events; storing them is 0004 AC-028's concern).
- **BR-009 Error categories.** Closed list, from ADR-003 §4: `auth`, `quota_or_rate_limit`,
  `model_unavailable`, `network_or_server`, `runtime_missing`, `policy_denied`, `cancelled`,
  `tool_failure`, `unknown`. Each has one generic English text (PD-016) owned by 0009; the adapter
  may add the provider's (masked) message and a hint. An error it cannot map is `unknown` (Q8).
- **BR-010 Credentials.** An adapter never puts a credential into an event payload or an error
  text, and supplies the credential values it holds through 0004's credential port (PD-029).

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-009.1) | One documented provider port in the core | AC-001, AC-002 |
| FR-002 (FR-009.2) | Central registry | AC-003, AC-004 |
| FR-003 (FR-009.3, FR-009.8) | Declared capabilities; unsupported ones explicit | AC-005, AC-006 |
| FR-004 (FR-009.4) | Normalised events | AC-007, AC-008, AC-009 |
| FR-005 (FR-009.5) | Availability check | AC-010 |
| FR-006 (FR-009.6) | Normalised errors | AC-011 |
| FR-007 (FR-009.7) | Fake provider | AC-012…AC-018 |
| FR-008 | Approvals and input answered only by the human, never widened | AC-019 |
| FR-009 | Contract test suite and extensibility | AC-020, AC-021 |
| FR-010 | No credentials in events | AC-022 |

## 8. Data requirements

### 8.1 Port operations (ADR-003 §3 sketch)

`checkAvailability` · `getCapabilities` · `start(run ID, working directory = project root, prompt,
model?)` → session reference · `resume(session reference)` · `cancel` · `respondToApproval(request
ID, decision)` · `respondToInput(request ID, answer)` · `listModels` · event delivery · credential
values (0004). The run ID is 0004's; the session reference is opaque (0004 A-006).

### 8.2 Normalised event

Fields: run ID · kind · source (`provider` | `derived`) · provider event identity (if the provider
delivers one; 0004 deduplicates by it) · occurred-at (if delivered) · payload by kind. Sequence
number and received-at are assigned by 0004 (0004 AC-005), not here.

Kinds (ADR-003 §4) and their payload:

| Kind | Payload |
| --- | --- |
| `session.started` | session reference |
| `turn.started` · `turn.completed` | usage on completion if delivered |
| `message.delta` · `message.completed` | text |
| `reasoning` | text (stored and masked like messages, Q9) |
| `tool.started` · `tool.progress` · `tool.completed` | tool name, call ID; `ok` and error text on completion |
| `file.changed` | project-relative path, operation (`add`, `update`, `delete`), confidence (`reported` or `derived`) |
| `approval.requested` · `approval.resolved` | request ID, kind of action, summary; decision on resolution |
| `input.requested` · `input.resolved` | request ID, question; resolution carries no answer text |
| `plan.updated` | list of items with done flag |
| `usage` | token counts if delivered |
| `warning` · `retry` | text |
| `auth.status` | availability result (BR-004) |
| `run.completed` | final message if delivered |
| `run.failed` | category (BR-009), text |
| `run.cancelled` | — |
| `provider.unknown` | provider type name, top-level field names (BR-007) |

### 8.3 Fake provider

Profiles: **full** — every capability `native`, except `mcp` and `customTools` `none` (PD-009);
**minimal** — `start`, `cancel`, `toolEvents` `native`, everything else `none`.

Scenarios (Q4), chosen by the caller in tests and by the setting "Fake provider scenario" in the
extension (default *happy path*, A-003):

| Scenario | Kinds in order (after `session.started`) |
| --- | --- |
| happy path | `turn.started`, `message.delta`×n, `message.completed`, `tool.started`, `tool.completed{ok}`, `file.changed{reported}`, `turn.completed`, `run.completed` |
| approval | … `approval.requested`, waits; *approve once* → `approval.resolved`, `tool.completed{ok}`; *reject* → `approval.resolved`, `tool.completed{not ok}`; then `run.completed` |
| input | … `input.requested`, waits; answer → `input.resolved`, `message.completed`, `run.completed` |
| failure:<category> | … `run.failed{category}` — one per category except `cancelled` |
| long run | `message.delta` at a fixed interval until cancelled → `run.cancelled` |
| unknown event | happy path with one `provider.unknown` (type name `fake.mystery`) |
| duplicates and late | happy path with one event delivered twice under the same identity and one `warning` after `run.completed` |

Timing comes from an injected clock (ADR-001 `ClockPort`), so tests do not wait in real time.

## 9. Security, permissions and privacy

- Studio never widens a permission (PD-006); approval answers per BR-005; 0008 AC on unapproved
  tool permissions builds on that (handoff AC-008.9).
- No credentials in events or errors (BR-010); masking itself is 0004's (0004 BR-005).
- No raw provider data (PD-029, BR-007). The fake opens no network connection (BR-006).
- Input answers can be sensitive: `input.resolved` never carries the answer text (§8.2).

## 10. Error cases and edge cases

- Stream stops or adapter throws without an end kind → BR-008 (AC-009).
- Operation for an undeclared capability → *not supported* (AC-006).
- Unmapped provider event → `provider.unknown` (AC-008); unmapped error → `unknown` (AC-011).
- Duplicate registration, missing or invalid capability → refused (AC-004).
- Approval or input answer with an unknown or already resolved request ID → refused with
  *request not open*, the run continues (AC-019).
- Cancel after the end kind → no-op result *already ended*, no further events (AC-015).
- Fake setting switched off while a fake run is open → the run continues to its end; the fake is
  not offered for new starts (AC-012).

## 11. Acceptance criteria

"The system" is FeatherSpec Studio. Unless marked *manual*, each criterion is decided by a plain-Node
test with the fake provider and an injected clock.

- **AC-001** The repository shall contain one document under `docs/` describing the provider port:
  the operations of §8.1, every capability, every event kind with its payload and every error
  category. A test shall fail when the code defines a capability, kind or category the document
  does not list, or the reverse (handoff AC-009.1).
- **AC-002** The system shall reach providers only through the provider port: no module in
  `src/core/` or `src/webview/` shall import a provider SDK or a module under
  `src/adapters/providers/` — an import scan decides it (handoff AC-009.2, AC-009.3).
- **AC-003** When a consumer asks the registry for its providers, the system shall return each
  registered provider's ID, display name and full capability declaration.
- **AC-004** If a provider is registered under an existing ID, without a value for every capability
  of BR-002, or with `start` declared `none`, then the system shall refuse the registration with a
  reason naming the provider ID and the defect, and keep the registry unchanged.
- **AC-005** The system shall report every capability with exactly one of `native`, `derived`,
  `none` and the *experimental* marker where declared, and shall never report a capability a
  provider did not declare (handoff AC-009.4).
- **AC-006** If a consumer calls resume, cancel, an approval answer, an input answer or the model
  list on a provider that declares that capability `none`, then the system shall return *not
  supported* with the provider ID and emit no event.
  - *Given* the fake in profile minimal, *when* resume is called, *then* the result is *not
    supported (fake)* and no event follows.
- **AC-007** When an adapter delivers an event, the system shall pass it on with a kind from §8.2,
  its source and the run ID it was started with (handoff AC-009.5).
- **AC-008** If an adapter receives a provider event it does not map, then the system shall deliver
  `provider.unknown` with the provider type name and the top-level field names only, and the run
  shall continue (handoff AC-012.9).
  - *Given* scenario *unknown event*, *when* it runs, *then* one `provider.unknown` with type name
    `fake.mystery` is delivered, it contains no field value, and `run.completed` follows.
- **AC-009** If an adapter's event stream stops or the adapter fails before an end kind, then the
  system shall deliver exactly one derived `run.failed` with category `unknown`; every run shall
  deliver exactly one end kind before any late event.
- **AC-010** When a user action asks a provider for its availability, the system shall return one
  of the five results of BR-004 with a reason; the system shall not ask any provider for
  availability at activation or without a user action — a test counting calls decides it.
- **AC-011** When a provider reports an error, the system shall deliver it as one of the nine
  categories of BR-009 with the category's generic text; an error it cannot map shall be `unknown`.
  - *Given* each scenario *failure:<category>*, *when* it runs, *then* `run.failed` carries that
    category and its generic text.
- **AC-012** Where the setting "Enable fake provider" is off — the default — the system shall not
  register the fake; when it is switched on, the fake shall appear in the registry with display
  name "Fake provider (no agent, no network)", and it shall never be the default provider. When the
  setting is switched off, an open fake run shall continue to its end kind. *(The default is also
  checked by reading the extension manifest.)*
- **AC-013** When the fake runs any scenario of §8.3, it shall open no network connection and shall
  create, change or delete no file — a test with network and file-system access replaced by
  recorders that fail on use decides it.
- **AC-014** When the same scenario runs twice under the same profile and clock, the fake shall
  deliver the same sequence of kinds and payloads, except run ID and session reference.
- **AC-015** When a run of scenario *long run* is cancelled, the fake shall deliver `run.cancelled`
  as its last event and nothing after it; a cancel after the end kind shall return *already ended*.
- **AC-016** While a fake approval or input request is open, the fake shall deliver no further event
  of that run until it is answered or cancelled; after *approve once* the tool completes `ok`, after
  *reject* not `ok`, and both end with `run.completed`.
- **AC-017** When scenario *duplicates and late* runs, the fake shall deliver one event twice with
  the same provider event identity and one `warning` after `run.completed`.
- **AC-018** Where the profile is full, resume of a session reference the fake issued — in this or an
  earlier activation — shall deliver `session.started` with that reference and end with
  `run.completed`; resume of a reference it did not issue shall end with `run.failed{unknown}`.
- **AC-019** The system shall accept only *approve once* and *reject* (with optional reason) as an
  approval answer and pass it to the adapter unchanged; if an answer names a request that is not
  open, then the system shall return *request not open* and the run shall continue. No code path
  shall answer an approval request without a human answer — the fake's approval scenario never
  ends while unanswered and uncancelled (PD-006).
- **AC-020** Every provider adapter, the fake in both profiles included, shall pass the same
  contract test suite; parts for a capability declared `none` assert *not supported* instead of
  being skipped (handoff §14 *Provider Contract Tests*).
- **AC-021** When a provider is registered under a new ID with a new capability declaration, the
  existing tests of the core and the webview shall pass without a change to their code, and no
  module outside `src/adapters/providers/` and the composition root shall contain a provider ID
  literal — an import and literal scan plus a test registering a third test provider decide it
  (handoff AC-009.7).
- **AC-022** If a provider's credential value occurs in a text an adapter delivers, then the system
  shall have supplied that value through the credential port before the event is delivered, so
  0004's masking replaces it.
  - *Given* the fake with its fixed sample credential, *when* scenario *failure:auth* runs with the
    credential in the provider message, *then* the credential port returned that value first.

Manual checks (not provable with the fake): the end-to-end walkthrough of handoff §21 in an
Extension Development Host with the fake enabled — Gregor, after 0008, 0011 and 0012 exist.

## 12. Technical notes for developers or AI agents

- Greenfield. Port `AgentProviderPort` and the registry in `src/core/` (application layer); fake in
  `src/adapters/providers/fake/`, real adapters beside it (ADR-001 Decision 1). Event delivery as a
  subscription or async iterator — decided in `/sdd-plan`.
- Setting keys (for example `featherspecStudio.providers.fake.enabled`, `.scenario`) are fixed in
  `/sdd-plan`; the contract suite lives with the port so 0010 reuses it.
- ADR-003 §4 puts `seq` into the event; here 0004 assigns it (0004 AC-005). ADR-003 §4 keeps `raw`
  for unknown events; PD-029 and BR-007 replace that.
- The "Check Provider" command is registered by this spec; its display is 0008's or 0012's.
- Unit tests: `npm run test:unit` (Vitest, introduced by 0001's plan).

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | ADR-003's capability values for Copilot hold | Read from published types (ADR-003 §1) | 0010 changes its declaration; the model of this spec stays |
| A-002 | *Approve once* and *reject* map onto every provider with `approvals` ≠ `none` | Copilot `approve-once`/`reject`, Claude allow/deny (ADR-003 §2) | An adapter would need a third answer; BR-005 is revisited |
| A-003 | In the extension the fake's scenario is chosen by a setting, default *happy path* | Simplest way to pick one without new UI; not asked | Gregor needs another way to choose during the walkthrough |
| A-004 | One port instance can serve one run at a time | PD-005: one active run per project | Parallel runs later need run-scoped handles, already in §8.1 |

## 14. Open points

- OP-001: ADR-003 is Proposed; PD-001 binds only after the PoC (ADR-003 §7). Non-blocking: the
  fake covers everything this spec demands.
- Resolved 2026-11-16 (Gregor, all as suggested): Q1 split with 0010 · Q2 fake behind a setting ·
  Q3 fake never writes files · Q4 scenarios and two profiles · Q5 approve once or reject only ·
  Q6 unknown events without values · Q7 checks only on user action · Q8 nine categories, owners ·
  Q9 ADR-003 §3–§4 adopted, experimental marker, reasoning stored masked.

## 15. Definition of Ready

Goal, scope, rules and criteria are stated; the open point does not block; neighbours referenced
by number.

## 16. Definition of Done

All criteria pass in `npm run test:unit`; the port document exists (AC-001); the architecture
snapshot lists the new modules; Gregor accepts the manual walkthrough once its consumers exist.

## 17. Recommended next steps

`/sdd-clarify` on this spec in a fresh session, then `/sdd-plan`.
