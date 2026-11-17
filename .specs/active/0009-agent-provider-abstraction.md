# Agent Provider Abstraction

**Status:** In Progress
**Plan:** [0009-agent-provider-abstraction.plan.md](0009-agent-provider-abstraction.plan.md)

Handoff reference: FS-009 ([po-handoff.md](../../docs/product/po-handoff.md) §2.1, §8.3, §10 FS-009,
§14 *Provider Contract Tests*). Depends on: 0004 (event envelope, credential port for masking).
Consumers: 0008 (registry, availability before start), 0010 (first real adapter), 0011 (runs, status
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
would ripple into domain and UI code, and nothing could be tested before the PoC. Success: every
scenario of §8.3 runs through the port in plain Node, 0008, 0011 and 0012 prove their criteria with
the fake, and a second provider is an added adapter, not a change to consumers (handoff AC-009.7).

## 3. Users and roles

- Developer (0004 §3): learns through 0008 and 0012 which provider runs and why one is not usable.
- Contributors (people and AI agents building Studio): implement adapters against one contract
  and test with the fake.
- One role; no permission differences.

## 4. Scope

### In scope

- The provider port (operations of §8.1) and the provider registry.
- The capability model, the event taxonomy with its payloads, the availability results and the
  error categories with their generic texts.
- The contract test suite every adapter passes, and one document describing the port (AC-001).
- The fake provider: scenarios, two capability profiles, scripting for tests, its two settings.

### Out of scope

- The Copilot adapter, its sign-in, SecretStorage use and runtime check — because 0010 owns them (Q1).
- Run creation, run statuses and transitions, mapping event kinds to status changes, run error class — because 0004 and 0011 own them (PD-025).
- Storing events, sequence numbers, duplicate detection, masking itself — because 0004 owns them (0004 AC-005, AC-007, AC-013).
- Showing providers, capabilities, events or errors in the UI — because 0008 and 0012 own those views and 0005 the panel-level states (PD-036); a provider overview is OP-004.
- Claude Agent SDK and Codex adapters — because PD-001 picks one provider first.
- MCP servers and custom tools in use, adopting sessions Studio did not start, raw provider data in events — because PD-009, PD-010 and PD-029 (Q6) exclude them from the MVP.
- Approving for a whole session or a location — because it widens permissions without a per-action human decision (PD-006, Q5).
- Background or periodic availability checks — because Gregor ruled them out (Q7).
- A fake provider that changes workspace files — because a test double must never touch the user's work (Q3).

## 5. Functional flow

1. At activation Studio registers its adapters; the fake while its setting is on (BR-006).
2. 0008 reads the registry and asks the chosen provider for its availability (BR-004).
3. 0011 starts a run through the port (§8.1); the adapter delivers normalised events (BR-007).
4. The human's answers to approval and input requests go back through the port (BR-005); cancel
   and resume where declared (BR-003).
5. The first end kind ends the run (BR-008).

## 6. Business rules

Terms: a **provider** is an external coding-agent product, an **adapter** Studio's module for one.
**The port** is the interface adapters implement plus the core part in front of them that
enforces BR-003, BR-005, BR-007 and BR-008: adapters *deliver* events, the port *passes them on*.
A **hint** is adapter-owned text beside a generic one (0010: remedy text; 0012: guidance text).

- **BR-001 Registry.** An entry has a provider ID (unique, lowercase, never changed: runs store
  it), a display name, the capability declaration (fixed at registration), a permission-mode
  label and optionally a disclosure text — both for 0008's confirmation (0008 §6.2, 0010 BR-05,
  BR-14). A registration under an existing ID is refused; an entry can be removed (BR-006); an
  unregistered ID answers *not registered*. Consumers find providers only through the registry
  and name none in code (handoff AC-009.7).
- **BR-002 Capabilities.** Closed list (ADR-003 §3): `start`, `cancel`, `resume`, `streamText`,
  `toolEvents`, `fileChanges`, `approvals`, `userInput`, `planUpdates`, `usage`, `modelList`,
  `mcp`, `customTools`, `typedErrors`. Each is declared `native` (the provider does it), `derived`
  (the adapter achieves or infers it) or `none`, and unless `none` may carry the marker
  *experimental* (Q9). A declaration names every capability and no other, with `start` not
  `none`; anything else is refused, never read as a silent `none`. `mcp` and `customTools` are
  declared but unused in the MVP (PD-009). An adapter delivers a kind only where its capability
  (§8.2) is not `none`; with `typedErrors` `none`, every `run.failed` carries `unknown`.
- **BR-003 Operation results.** Resume, cancel, an approval or input answer or the model list on
  an adapter that declares the capability `none` returns *not supported* with the provider ID
  (PD-007); an operation for a run ID the port does not know, *unknown run*; an adapter failure
  inside cancel, an answer or a model query, *failed* with the reason (a failing start or resume:
  BR-008). No operation throws at its caller or reports an empty success.
- **BR-004 Availability.** One check covers installation, sign-in and policy. Results:
  *available*, *not installed*, *not signed in*, *blocked by policy*, *unknown* (the check
  failed, or gave no answer within the check timeout fixed in `/sdd-plan`, OP-009) — all but the
  first with a one-line reason (A-005). It runs only for a user action —
  0008's precondition check (0008 P-4) or a check command (OP-004) — never at activation, at
  registration or in the background (Q7). 0009 owns the generic reason texts; an adapter may add
  a hint.
- **BR-005 Approvals and input.** An approval request is answered with *approve once* or *reject*
  (optional reason), nothing else (Q5); an input request with free text. Port and adapters pass
  exactly that answer on and answer nothing themselves (PD-006). A request is open from its
  `.requested` event until its `.resolved` event or the run's end (as in 0011 and 0012); the port
  accepts one answer per open request. The adapter delivers a `.resolved` for every accepted
  answer — source `derived` where the provider sends none.
- **BR-006 Fake provider.** Provider ID `fake`, display name "Fake provider (no agent, no
  network)". In the extension it is registered while the setting "Enable fake provider" is on
  (off by default) and removed when it goes off, without a reload; a fake run already started
  continues. It is always *available* there and never chosen by Studio: 0008's default-provider
  setting (0008 §6.5) never ships as `fake`; the developer may enter it (Q2). In tests it is
  built directly and reports the availability the test sets. It makes no network connection,
  never creates, changes or deletes a file (Q3) and knows its session references by their form.
  Its permission-mode label says whether its profile asks (wording: plan). Its runs are
  deterministic (AC-014).
- **BR-007 Normalisation.** Every delivered event carries a kind from §8.2 and the source
  `provider` or `derived` (inferred by the adapter or added by the port). `session.started` comes
  first, unless `run.failed` ends the run before a session exists. The port keeps the order
  delivered. An unmapped provider event becomes `provider.unknown` carrying only the provider's
  type name and top-level field names, never values (Q6, PD-029); so does a delivered kind
  outside §8.2, with that kind as type name.
- **BR-008 End of run.** The first end kind (`run.completed`, `run.failed`, `run.cancelled`) ends
  the run; every failure of a started run, also before a session exists, is a `run.failed`. If an
  adapter's event stream ends — closed or failed — without an end kind, the port adds one derived
  `run.failed` with category `unknown` and the reason "provider stopped without a final event"
  (0011 BR-008: `provider_exited`). Silence is not an end (0011 BR-009). Everything after the
  first end kind, another end kind included, is passed on as a late event — normalised like every
  delivered event (BR-007, BR-009), never dropped, and never followed by an added end kind (0004
  AC-028, 0011 BR-001).
- **BR-009 Error categories.** Closed list (ADR-003 §4): `auth`, `quota_or_rate_limit`,
  `model_unavailable`, `network_or_server`, `runtime_missing`, `policy_denied`, `cancelled`,
  `tool_failure`, `unknown`. They classify `run.failed` only: a cancellation is delivered as
  `run.cancelled`, never as `run.failed{cancelled}`; a failed tool call that does not end the run
  is `tool.completed` without a category. Each has one generic English text (PD-016) owned by
  0009; the adapter may add the provider's message and a hint. An unmappable error is `unknown`
  (Q8). Category → run error class is 0011's (0011 BR-008).
- **BR-010 Credentials.** An adapter adds no credential to an event or error text, and its
  implementation of 0004's credential port (0004 §9, PD-029) returns every credential value it
  holds, so 0004 masks a provider text that contains one.

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
| FR-008 | Approvals and input answered only by the human, never widened | AC-016, AC-019 |
| FR-009 | Contract test suite and extensibility | AC-020, AC-021 |
| FR-010 | Adapters' credential values known to 0004's masking | AC-022 |

## 8. Data requirements

### 8.1 Port operations

Names follow the ADR-003 §3 sketch and are settled in `/sdd-plan`; the behaviour binds.
`checkAvailability` · `start(run ID, working directory = project root, prompt, model?)` ·
`resume(run ID, working directory, session reference, continuation text)` — a new run (0011
BR-005) · `cancel(run ID)` · `endSession(run ID)` — ends the session without waiting for the
provider, whatever `cancel` declares; nothing more is passed on for that run (0010 AC-025, OP-006)
· `respondToApproval(run ID, request ID, decision, reason?)` · `respondToInput(run ID, request ID,
answer)` · `listModels` · `nextStartModel` — the model the adapter would start with, or none (0008
§6.5, 0010 AC-008) · event delivery. The run ID is 0004's; the session reference is opaque (0004
A-006) and arrives with `session.started`. `start` carries no permission mode (0008 §6.4).

### 8.2 Normalised event

Fields: run ID · kind (0004's `type`) · source (`provider` | `derived`) · provider event identity
(if delivered; one per normalised event, because 0004 deduplicates by it) · occurred-at (if
delivered) · payload. Sequence number and received-at are 0004's (0004 AC-005).

Kinds (ADR-003 §4), the capability each needs (BR-002), and the payload:

| Kind | Capability | Payload |
| --- | --- | --- |
| `session.started` | — | session reference; model if delivered |
| `turn.started` · `turn.completed` | — | — |
| `message.delta` | `streamText` | text fragment |
| `message.completed` | — | the whole message text |
| `reasoning` | — | text (stored and masked like messages, Q9) |
| `tool.started` · `tool.progress` · `tool.completed` | `toolEvents` | tool name, call ID; `ok` and error text on completion |
| `file.changed` | `fileChanges` | path — project-relative, or as delivered and flagged *outside project* (0010 AC-012); operation (`add`, `update`, `delete`); confidence — `reported` for source `provider`, else `derived` |
| `approval.requested` · `approval.resolved` | `approvals` | request ID (unique in the run), kind of action (open string), summary — the path, command or URL as delivered —, *outside project* flag (0010 AC-013); decision on resolution |
| `input.requested` · `input.resolved` | `userInput` | request ID, question; resolution carries no answer text (OP-008) |
| `plan.updated` | `planUpdates` | list of items with done flag |
| `usage` | `usage` | running token totals of the run, as delivered (OP-007) |
| `warning` · `retry` | — | text |
| `auth.status` | — | an availability result the provider reports itself — not a check (BR-004) |
| `run.completed` | — | final message if delivered |
| `run.failed` | — | category and its generic text (BR-009); provider message and hint if added |
| `run.cancelled` | — | cause if given (0010 BR-13) |
| `provider.unknown` | — | type name, top-level field names (BR-007) |

### 8.3 Fake provider

Profiles: **full** — every capability `native`, except `mcp` and `customTools` `none` (PD-009);
**minimal** — `start`, `cancel`, `toolEvents` `native`, everything else `none`. A scenario leaves out
the kinds its profile rules out (BR-002).

Scenarios (Q4). In the extension: profile full, scenario from the setting "Fake provider scenario" at
each start (default *happy path*, A-003). P is `turn.started`, `message.delta`×n,
`message.completed`; n and the interval are fixed in `/sdd-plan`.

| Scenario | Kinds in order (after `session.started`) |
| --- | --- |
| happy path | P, `reasoning`, `plan.updated`, `tool.started`, `tool.progress`, `tool.completed{ok}`, `file.changed`, `usage`, `turn.completed`, `run.completed` |
| approval | P, `tool.started`, `approval.requested`, waits; *approve once* → `approval.resolved`, `tool.completed{ok}`; *reject* → `approval.resolved`, `tool.completed{not ok}`; then `run.completed` |
| input | P, `input.requested`, waits; answer → `input.resolved`, `message.completed`, `run.completed` |
| failure:<category> | P, `run.failed{category}` — one per category except `cancelled` |
| long run | `message.delta` at a fixed interval until cancelled → `run.cancelled` |
| unknown event | happy path with one `provider.unknown` (type name `fake.mystery`) |
| duplicates and late | happy path with one event delivered twice under the same identity and one `warning` after `run.completed` |
| no end | P, then the stream closes without an end kind |

In tests the caller picks scenario and profile, or passes its own script (events with their source,
waits, an ignored cancel, a closing stream) and capability declaration. Fake events carry the
source `provider` unless scripted otherwise; `file.changed` names a fixed path and changes no file;
a fixed sample credential serves AC-022 and 0004 AC-013.

## 9. Security, permissions and privacy

- Studio never widens a permission (PD-006, BR-005); 0008 AC-011 builds on that (handoff AC-008.9).
- No credential and no raw provider data from adapters in events (BR-010, BR-007, PD-029); masking
  is 0004's. `input.resolved` never carries the answer text (OP-008). Starts in Restricted Mode
  are refused by 0008 P-7, not by the port.

## 10. Error cases and edge cases

- Stream ends without an end kind; start fails before a session exists, also when availability
  changed after the check → BR-008 (AC-009).
- Answer for a request that is not open or already answered, or with another value → refused,
  the run continues (AC-019).
- Cancel after the end kind → *already ended* (AC-015); with a request open → `run.cancelled`
  ends run and request.
- Fake setting off during a fake run → BR-006 (AC-012); `fake` as default provider while off →
  0008 P-3 refuses.
- Second start during an adapter's run → 0011 BR-002 refuses it, not the port (A-004).

## 11. Acceptance criteria

"The system" is FeatherSpec Studio; "the port" and "the adapter" as in §6. Each criterion is
decided in plain Node with an injected clock, with the fake (§8.3) or, for registration and
scans, without a provider. Tests assert results, kinds and categories; the generic texts are
worded in `/sdd-plan`.

- **AC-001** The repository shall contain one document under `docs/` describing the provider port:
  the operations of §8.1, every capability, every event kind with its payload, every availability
  result and every error category. A test shall fail when the code defines a capability, kind,
  availability result or category the document does not list, or the reverse (handoff AC-009.1).
- **AC-002** The system shall reach providers only through the port: no module of the core or the
  webview (`src/core/`, `src/webview/`, ADR-001 Decision 1) shall import a module under
  `src/adapters/providers/` or a provider SDK — a package on the import scan's list, which a later
  provider dependency joins in the same change (handoff AC-009.2, AC-009.3).
- **AC-003** When a consumer asks the registry for its providers, the system shall return each
  registered provider's ID, display name, capability declaration, permission-mode label and
  disclosure text, if any; for an ID that is not registered it shall answer *not registered*.
  Asked for a provider's next-start model, it shall return what the adapter reports, or none.
- **AC-004** If a registration violates BR-001 or BR-002 — an existing, empty or not lowercase ID;
  a capability missing, added or given a value outside the three; `start` `none` — then the
  system shall refuse it with a reason naming the provider ID and the defect, and keep the
  registry unchanged.
- **AC-005** The system shall report each capability exactly as declared, value and *experimental*
  marker — decided with a test declaration that uses all three values and the marker (handoff
  AC-009.4).
- **AC-006** If an operation meets a case of BR-003, then the port shall return that case's result
  — *not supported* with the provider ID, *unknown run*, or *failed* with the reason — and pass
  on no event.
- **AC-007** When an adapter delivers events, the port shall pass them on in the order delivered,
  each with its kind, its source and the run ID of its run; if a kind is not in §8.2, then the
  port shall pass on `provider.unknown` with that kind as type name instead (handoff AC-009.5).
- **AC-008** If an adapter receives a provider event it does not map, then the adapter shall deliver
  `provider.unknown` with the provider type name and the top-level field names only, and keep
  delivering the events that follow (handoff AC-012.9).
  - *Given* scenario *unknown event*, *then* one `provider.unknown` with type name `fake.mystery`
    and no field value is delivered, and `run.completed` follows.
- **AC-009** If an adapter's event stream ends — closed or failed — before an end kind, then the
  port shall pass on exactly one derived `run.failed` with category `unknown` (scenario *no end*).
  The port shall pass on everything after the first end kind as delivered — normalised as BR-007
  and BR-009 require, another end kind included — and add none.
- **AC-010** When 0008's precondition check asks a provider for its availability, the system shall
  return one of the five results of BR-004, with a reason for all but *available*, and *unknown*
  if the check itself fails. Activation, registration, reading the registry and switching the
  fake setting shall cause no availability call (counted by a test).
- **AC-011** When an adapter delivers `run.failed`, the event shall carry one category of BR-009 —
  never `cancelled`; `unknown` for an error the adapter cannot map — and that category's generic
  text; decided with each scenario *failure:<category>* in profile full.
- **AC-012** While the setting "Enable fake provider" is off — the default, checked in the
  manifest — the registry shall not contain the fake. When it is switched on, the
  system shall register the fake under its display name (BR-006) without a reload; when it is
  switched off, the system shall remove it and let an open fake run continue to its end kind.
  0008's default-provider setting shall not ship as `fake`.
- **AC-013** When the fake runs any scenario of §8.3, it shall open no network connection and create,
  change or delete no file — decided with network and file system replaced by recorders that
  fail on use.
- **AC-014** When the same scenario runs twice under the same profile, clock and answers, the fake
  shall deliver the same kinds and payloads in the same order, except run ID and session
  reference; in profile minimal it shall deliver no kind whose capability is `none`.
- **AC-015** When a run of scenario *long run* is cancelled, the fake shall deliver `run.cancelled`
  as its last event; a cancel after the end kind shall return *already ended*. After `endSession`
  the port shall pass on no further event of that run.
- **AC-016** While a fake approval or input request is open, the fake shall deliver no further event
  of that run — also after 24 h of clock time — until the request is answered or the run is
  cancelled. After *approve once* the fake shall deliver `tool.completed{ok}`, after *reject*
  `tool.completed{not ok}`, and `run.completed` after both. `input.resolved` shall not contain the
  answer text.
- **AC-017** When scenario *duplicates and late* runs, the fake shall deliver one event twice with
  the same provider event identity and one `warning` after `run.completed`.
- **AC-018** When resume is called in profile full with a session reference the fake issued — in
  this or an earlier activation — the fake shall deliver `session.started` with that reference
  under the new run ID and end with `run.completed`; with any other reference it shall end with
  `run.failed{unknown}`.
- **AC-019** The port shall accept only *approve once* and *reject* (optional reason) as an
  approval answer and free text as an input answer, and pass each to the adapter unchanged. If the
  request is not open or already has an accepted answer (BR-005), or an approval answer has another
  value, then the port shall refuse the answer (*request not open*, *invalid answer*), pass nothing
  to the adapter, and the run shall continue. Neither the port nor the fake shall answer a request
  itself (PD-006): after 24 h of clock time an unanswered request is still open, with no
  `.resolved` delivered.
- **AC-020** Every adapter, the fake in both profiles included, shall pass the same contract test
  suite, which asserts BR-002, BR-003, BR-005, BR-007, BR-008 and BR-010 for the adapter under
  test; each adapter gives it a way to trigger every case (0010: its scripted client). Parts for a
  capability declared `none` assert *not supported* instead of being skipped (handoff §14).
- **AC-021** When a test registers a third provider under a new ID, the system shall list it and
  run it through the port with no change to another module. No production module outside
  `src/adapters/providers/` and the composition root shall contain a provider ID as a literal —
  a literal scan decides it (handoff AC-009.7).
- **AC-022** If an adapter delivers a text containing a credential value it holds, then its
  implementation of 0004's credential port shall already return that value when the event is
  delivered — decided with the fake's sample credential in the provider message of scenario
  *failure:auth*.

Manual check, not a criterion of this spec: Gregor's walkthrough of handoff §21 in an Extension
Development Host with the fake as default provider — owned by 0012 (OP-005).

## 12. Technical notes for developers or AI agents

- Greenfield. `AgentProviderPort`, its core part and the registry in `src/core/`; adapters under
  `src/adapters/providers/`, the fake in `fake/` (ADR-001 Decision 1).
- Fixed in `/sdd-plan`: event delivery (subscription or async iterator), setting keys (prefix
  `featherspec-studio.`), operation and result names, generic texts, the fake's constants. Settings
  reach the core through a port (AC-012).
- Against ADR-003: `seq` is 0004's; `raw` gives way to PD-029; `checkAuth` and `getCapabilities`
  are folded into `checkAvailability` and the registry.

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | *Withdrawn 2026-11-16:* 0010 BR-01 owns Copilot's capability values | — | — |
| A-002 | *Approve once* and *reject* map onto every provider with `approvals` ≠ `none` | Copilot `approve-once`/`reject`, Claude allow/deny (ADR-003 §2) | An adapter would need a third answer; BR-005 is revisited |
| A-003 | In the extension: profile full, scenario by setting, default *happy path* | Simplest without new UI; confirmed by Gregor 2026-11-16 (OP-010) | Gregor needs another way to choose in the walkthrough |
| A-004 | The port need not refuse a second start during an adapter's run | 0011 BR-002 refuses it first (PD-005) | Parallel runs later; operations already name the run ID |
| A-005 | Five availability results suffice | ADR-003 §5: installation, sign-in, policy; confirmed by Gregor 2026-11-16 (OP-010) | An adapter needs a sixth |

## 14. Open points

Open, none blocks planning:

- OP-001: ADR-003 is Proposed; PD-001 binds only after the PoC (ADR-003 §7).
- OP-011 (main session, for 0011's planning): 0008 OP-010, 0010 OP-006 a, 0011 OP-002 b and 0012
  OP-14 are answered here. To align in 0011: its OP-004 (see OP-006 below); its BR-008's "refused
  port call" with a category — a failed start or resume is a `run.failed` here.

Resolved:

- 2026-11-16 (Gregor, at `/sdd-plan`: every recommendation approved as written):
  OP-004 — 0008 owns a "Check Provider" command that shows one notification; no provider
  overview in the MVP. OP-005 — 0012 owns the automated run of handoff §21 and the manual
  walkthrough. OP-006 — 0011 calls `endSession` after its timeouts and when VS Code closes.
  OP-007 — `usage` carries running totals. OP-008 — `input.resolved` carries no answer text.
  OP-009 — a check without an answer returns *unknown* after a timeout fixed in `/sdd-plan`.
  OP-010 — A-003 and A-005 kept.
- 2026-11-16 (Gregor, all as suggested): Q1 split with 0010 · Q2 fake behind a setting · Q3 fake
  never writes files · Q4 scenarios and two profiles · Q5 approve once or reject only · Q6 unknown
  events without values · Q7 checks only on user action · Q8 nine categories, owners · Q9 ADR-003
  §3–§4 adopted, experimental marker, reasoning stored masked.
- OP-002 [F-23], OP-003 [F-03] (2026-11-16): settled by the neighbours — the adapter reports a
  permission-mode label and its next-start model, `start` carries no mode (0008 §6.4, 0010
  BR-05, AC-008); a derived `run.failed` is `provider_exited` (0011 BR-008).
- OP-012 (2026-11-16): `/sdd-clarify`, delegated by Gregor: 94 findings — 83 resolved, 11 parked
  above, none asked. Readings to veto: `start` returns no session reference, an early failure is
  `run.failed` [F-02]; categories only on `run.failed` [F-04…F-06]; no kind without its
  capability, *happy path* extended [F-34]; scripted fake, scenario *no end* [F-09]; usage only
  in `usage` [F-30]; new `endSession` and result names [F-25, F-75, F-76].

## 15. Definition of Ready

Goal, scope, rules and criteria are stated; no open point blocks; neighbours referenced by number.

## 16. Definition of Done

All criteria pass in `npm run test:unit`; the port document exists (AC-001); the architecture
snapshot lists the new modules. The §21 walkthrough is OP-005.

## 17. Recommended next steps

`/sdd-plan` (OP-004…OP-010 resolved 2026-11-16); then `/sdd-lifecycle` on the start signal.
