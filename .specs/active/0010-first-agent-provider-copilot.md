# First Agent Provider Integration (GitHub Copilot SDK)

**Status:** In Progress
**Plan:** [0010-first-agent-provider-copilot.plan.md](0010-first-agent-provider-copilot.plan.md)

Handoff reference: FS-010 ([po-handoff.md](../../docs/product/po-handoff.md) §2.1, §8.3, §10 FS-010, §13, §14 Provider Contract Tests).
Provider choice: PD-001 (proxy) and [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md) (Proposed; PoC open). The PD register wins over ADRs.
Depends on: 0009 (provider port, registry, capability model, event taxonomy, error categories,
contract suite), 0004 (credential port), 0001 (project root).
Consumers: 0008 (availability, model, permission mode and disclosure for its confirmation), 0011
(starts, cancels, resumes, answers approvals and input), 0012 (renders events, requests, hints).

## 1. Summary

The first real coding agent behind Studio's provider port: an adapter for the GitHub Copilot SDK
that runs the developer's installed Copilot CLI in the active project, forwards every approval and
question to the developer, reports Copilot's events in 0009's normalised form, and can be cancelled
and resumed. Criteria run in plain Node against a scripted SDK client; what only a signed-in run on
Gregor's Windows 11 machine can prove is a manual check (§13).

## 2. Goal and problem

Up to 0009 Studio drives runs only with the fake provider. The developer wants to start a real agent
from Studio and get its result (handoff FS-010 user story) without Studio widening permissions
(PD-006), assuming an authentication path that is not supported (handoff §2.1, AC-010.10), or
leaking credentials (handoff §13 Security).

Success: a run started from Studio executes in the project root with 0008's prompt, every permission
request reaches the developer, cancel and resume work, and errors name cause and hint — proven by
AC-001…AC-025 and the acceptance checks of §13.

## 3. Users and roles

- **Developer** (only role): starts runs (via 0008), answers approvals and questions, cancels.
- **Gregor** runs the manual checks of §13 and accepts the result.

## 4. Scope

### In scope

- One provider adapter, ID `copilot`, registered through 0009's registry and reached only through
  0009's port (0009 AC-002).
- Availability check: installed Copilot CLI found and recent enough; signed in.
- Start, event forwarding, approvals, input requests, cancel, resume — for Studio-started runs only.
- The model setting; the permission mode and the disclosure text for 0008's confirmation.
- Mapping of Copilot events and errors to 0009's kinds and categories, with Copilot hints.
- The Copilot runtime's own data folder inside Studio's global storage.

### Out of scope

- Claude Agent SDK and Codex SDK adapters — because PD-001 picks Copilot first; others follow via 0009.
- Bundling the Copilot runtime or a per-platform VSIX — because Gregor chose the installed CLI (Q2; ADR-001 universal VSIX).
- Passing any token (BYOK, pasted tokens, server-to-server auth; the VS Code GitHub token: OP-007) — because Gregor limited the MVP to the signed-in login (Q1).
- Approving for a whole session or location, or any auto-approval — because PD-006 and PD-002 rule them out (Q3).
- Generating the prompt or the resume continuation text — because 0008 and 0011 own them (Q5).
- Run statuses, transitions, linking run and spec, storing the session reference — because 0011 and 0004 own them (PD-025).
- Rendering events, approvals and errors — because 0012 renders them (PD-036).
- MCP servers and custom tools — because PD-009 excludes MCP from the MVP.
- Adopting Copilot sessions Studio did not start — because PD-010.
- A per-run model picker — because Gregor chose a setting only (Q4).
- Removing Copilot's session files — because retention is 0004's (PD-027); the hand-over is OP-003.
- A Restricted Mode guard of its own — because 0008 refuses the start there (0008 P-7; ADR-001 Decision 14).
- Remote, WSL and Dev Container workspaces as a verified setup — because no PoC covers them (OP-004).

## 5. Functional flow

1. On a user action 0008 asks for availability and shows the next start's model, the permission
   mode and the disclosure; the developer confirms the start (PD-002).
2. 0011 calls `start` with run ID, project root, 0008's prompt and the confirmed model; the adapter
   starts the runtime, creates one Copilot session, emits `session.started`, sends the prompt.
3. Copilot events are forwarded in normalised form; permission requests and questions wait for the
   developer's answer, which 0011 passes back.
4. The run ends with exactly one end kind. Later 0011 may resume a run 0004 classified
   `Interrupted` (PD-024): a new run on the same Copilot session, with 0011's continuation text.

## 6. Business rules

Terms: **runtime** — the Copilot CLI installed on the developer's machine, as the process the SDK
starts. **Scripted client** — a test double of the Copilot SDK client that replays Copilot SDK events
(recorded, or hand-written and marked *synthetic*) and logs the adapter's calls. **Project
root** — the file-system path of 0001's root folder of the active project (PD-026). **Hint** —
Copilot-specific text beside 0009's generic availability or error text (0012: "remedy text").
**Open request** — an approval or input request emitted and not yet answered, in a run not yet ended.

- **BR-01 Capabilities** (0009 BR-002, ADR-003 §3). `native`: `start`, `cancel`, `resume`,
  `streamText`, `toolEvents`, `approvals`, `userInput`, `planUpdates`, `usage`, `modelList`;
  `fileChanges` `native` and *experimental*; `typedErrors` `derived` (inferred from Copilot's
  `errorType` string; ADR-003's "partial" is no value of 0009); `mcp`, `customTools` `none`
  (PD-009). A manual check that disproves a value revises this rule.
- **BR-02 Authentication** (Q1, handoff AC-010.10). Only the GitHub account signed in to the Copilot
  CLI. The adapter passes no token and starts the runtime without `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`
  and `GITHUB_TOKEN`, so no other path applies silently — tools the agent runs do not see them
  either (documented). Studio holds and stores no credential. The GitHub CLI's stored login, which
  Copilot reports as auth type `gh-cli`, is such a signed-in login (M-01, 2026-11-17).
- **BR-03 Runtime and availability** (Q2, 0009 BR-004). The CLI comes from the machine-scoped setting
  `featherspec-studio.copilot.cliPath` (never from workspace or folder settings), else from `PATH`;
  none is bundled. Only a file the runtime can be started from without a shell counts: on Windows
  `copilot.exe`; `.cmd`, `.ps1`, `.bat` and `.js` entries are skipped (M-09 preflight: npm shims
  are not startable without a shell, and the SDK would start a `.js` with the extension host's own
  executable). Minimum CLI version 1.0.87 and SDK protocol 3 (OP-001). Results are 0009's: *not
  installed* (not found, not startable, older than the minimum), *not signed in*, *blocked by
  policy* (not detected in this increment, OP-005), otherwise *unknown* with Copilot's message.
- **BR-04 Working context** (Q5). The session's working directory is the project root. 0008's prompt
  and 0011's continuation text are passed byte for byte; the adapter adds no file content and no
  instruction of its own.
- **BR-05 Approvals** (PD-006, Q3). Every session runs in Copilot's `manual` permission mode, which
  the adapter reports for 0008's confirmation (PD-002; OP-006 a). Every permission request, of any
  kind, waits for the developer without time limit; the only answers are *approve once* and
  *reject* (optional reason).
- **BR-06 Outside-project marker** (Q3). Set when the path or working directory Copilot delivers —
  resolved against the working directory, compared as text, case-insensitively on Windows — lies
  outside the project root. Nothing delivered → no marker, so it says nothing about what a shell
  command touches. It is 0009 §8.2's *outside project* flag; 0012 shows it.
- **BR-07 Questions** (Q3). A Copilot user-input or elicitation request becomes one
  `input.requested`; the free-text answer is passed unchanged (choices and forms: OP-009).
- **BR-08 Model** (Q4, PD-002). Free-text setting `featherspec-studio.copilot.model`, default empty;
  0008 shows it as the next start's model and passes it on (0008 §6.5; OP-006 a). The model named
  in the `start` call — what the developer confirmed — is used; none named → Copilot's default; a
  resumed session keeps its own. The adapter delivers the model Copilot names with
  `session.started`, never one of its own.
- **BR-09 Runtime data folder** (Q6). One base directory in Studio's global storage, outside every
  workspace folder, for all projects. If M-08 fails, none is passed and the docs say Copilot keeps
  those files outside Studio's retention (A-003). M-08 passed on 2026-11-17 for a `gh-cli` login.
- **BR-10 Telemetry** (handoff §13 Privacy, ADR-003 §5). Copilot telemetry and session telemetry are
  off for every runtime and session Studio starts or resumes.
- **BR-11 Events** (0009 BR-007, §8.2). Mapped per §7, source `provider`. Source `derived` marks
  what the adapter adds itself: the forced stop's `run.cancelled`, a `.resolved` Copilot does not
  send (0009 BR-005) and the runtime-exit `run.failed` — the only derived `run.failed`, which 0011
  classes `provider_exited` (0011 BR-008). The `.resolved` the adapter emits when the developer's
  answer reaches it is `derived`; a later Copilot `.completed` for that request is dropped. A type
  §7 neither maps nor ignores becomes `provider.unknown`; the run continues. No raw Copilot object
  is delivered (PD-029). Provider event identity is Copilot's event `id`; where one Copilot event
  yields several events, the second and later carry `<id>#<n>` (0004 deduplicates by identity).
- **BR-12 Errors** (0009 BR-009). Mapped per §7; unmapped → `unknown`; never `cancelled` or
  `tool_failure` (a failed tool is `tool.completed` not ok). 0009 owns the generic texts, the
  adapter adds the hints of §9. A failure before a session exists ends the run with `run.failed`
  and no `session.started`; checks run in the order runtime, sign-in, model.
- **BR-13 Cancel.** Abort first; after 10 s without Copilot's confirmation (A-004) the adapter stops
  the runtime, cause "forced stop". `endSession` (0009 §8.1) stops it at once. The adapter delivers
  exactly one end kind per run, whatever arrives later.
- **BR-14 Disclosure** (handoff §13 Privacy, ADR-003 §5). The adapter supplies the text "Runs with
  GitHub Copilot send the prompt, every file the agent reads, command output and your answers to
  GitHub, and each prompt counts against your Copilot plan." as its registry entry's disclosure
  (0009 BR-001; wording: OP-010).

## 7. Mapping tables

Event types and field names are those of the recording `docs/decisions/poc-copilot-2026-11-17/`
(SDK 1.0.34, CLI 1.0.87, 2026-11-17); types the recording lacks follow the SDK's
`dist/generated/session-events.d.ts` and are marked *synthetic* in the fixtures.

Events (Copilot → 0009 kind): `session.start` (start) or `session.resume` (resume), or the created
session ID, whichever comes first → one `session.started{sessionRef, model = selectedModel}` ·
`assistant.turn_start` / `assistant.turn_end` → `turn.started` / `turn.completed` ·
`assistant.message_delta` (`deltaContent`) / `assistant.message` (`content`) → `message.delta` /
`message.completed` · `assistant.reasoning` (whole text) → `reasoning` · `tool.execution_start` /
`_progress` / `_complete` → `tool.started` / `tool.progress` / `tool.completed{ok = success, errorText
= error.message}` · `tool.execution_complete.fileEdits[]` → `file.changed` per entry, kind `create` /
`edit` / `delete` → `add` / `update` / `delete`, another kind → no `file.changed` but one `warning`
naming it · `permission.requested` → `approval.requested` · `permission.completed` →
`approval.resolved` only for a request Studio did not answer · `user_input.requested`,
`elicitation.requested` → `input.requested` · `user_input.completed`, `elicitation.completed` →
`input.resolved` only for a request Studio did not answer · `session.todos_changed` (a signal
without payload) → `plan.updated` from Copilot's todo list read at that moment (item text = title,
done when the status is `done`, UNVERIFIED) · `assistant.usage` → `usage` with running totals of
`inputTokens` and `outputTokens` · `session.warning` → `warning` · the first `session.idle` after the
prompt or continuation text was sent, unless the run already has an end kind → `run.completed
{finalMessage = the last message.completed}` · `session.error` → `run.failed{category}` · `abort` →
`run.cancelled`.

Ignored (OP-011, from the recording): every `model.*` type, `assistant.streaming_delta`,
`assistant.message_start`, `assistant.tool_call_delta`, `assistant.reasoning_delta` (its whole
text arrives as `assistant.reasoning`), `assistant.idle`, `user.message`, `system.message`,
`pending_messages.modified`, `session.managed_settings_resolved`, `session.mcp_server_status_changed`,
`session.mcp_servers_loaded`, `session.tools_updated`, `session.title_changed`,
`session.model_change`, `session.usage_info` (a context-window snapshot, not consumption),
`session.usage_checkpoint`, `session.background_tasks_changed`, `session.shutdown`,
`agent.interrupted`, `prompt_cache_break`. A type in neither list is `provider.unknown`.

Errors (→ 0009 category): runtime cannot be started → `runtime_missing` · auth status not
authenticated, or `errorType` `authentication` → `auth` · `errorType` `rate_limit` or `quota` →
`quota_or_rate_limit` · model named in the call is not in Copilot's list → `model_unavailable` ·
`statusCode` 500 or higher, or a connection failure → `network_or_server` · `errorType`
`authorization` or `policy` → `policy_denied` · runtime exits during a run → `unknown` with "Copilot
runtime stopped unexpectedly" and its exit code where the SDK reports it · a session Copilot no
longer knows, anything else → `unknown`. The `errorType` values come from the SDK's `ErrorData`
documentation, not from a recorded error (OP-002); the `fileEdits` kinds from its
`ToolExecutionCompleteFileEditKind` type.

## 8. Security, permissions and privacy

- No credential in settings, workspace files, events or the adapter's log output (handoff §13
  Security, BR-02); Copilot's own log files are Copilot's.
- Permissions are never widened (BR-05); no workspace file chooses the executable (BR-03); a request
  outside the project root is marked (BR-06); telemetry is off (BR-10).
- The adapter adds nothing to the prompt (BR-04); what the runtime sends to GitHub beyond it (what
  the agent reads, command output, answers) is Copilot's and named by the disclosure (BR-14).

## 9. Hints

English (PD-016): *not installed* / `runtime_missing` → the found and required version where known,
and the install link <https://docs.github.com/en/copilot/how-tos/copilot-cli/set-up-copilot-cli/install-copilot-cli>
(OP-008); a skipped shim names itself and asks for `copilot.exe` or the setting
featherspec-studio.copilot.cliPath · *not signed in* / `auth` → "Run `copilot` in a terminal and
sign in, then retry." · `quota_or_rate_limit` → "Your Copilot allowance or rate limit is reached;
retry later." · `model_unavailable` → names the model, lists the offered models and "Change the
setting featherspec-studio.copilot.model." · *unknown* for a protocol Copilot and the SDK do not
share → names both versions (OP-008).

## 10. Acceptance criteria

Decided in plain Node with the scripted client and a controllable clock; "emits" means: delivers
through 0009's event callback. A criterion citing OP-002 or OP-006 a is final once that point is
settled (§15).

- **AC-001** The adapter shall register under provider ID `copilot` with exactly the capability
  declaration of BR-01, and shall pass 0009's provider contract suite with the scripted client.
- **AC-002** When availability is checked and neither the setting `featherspec-studio.copilot.cliPath`
  nor `PATH` yields a CLI the adapter can start, the adapter shall return *not installed* with the
  install link as hint. The extension manifest shall declare that setting with machine scope.
- **AC-003** If the found CLI reports a version below the minimum (OP-001), then the adapter shall
  return *not installed* naming the found and the required version; if the adapter cannot read a
  version, then it shall return *unknown* with that reason.
- **AC-004** If Copilot's auth status reports not authenticated (OP-002), then the adapter shall
  return *not signed in* from the availability check with the hint of §9; if a `start` or `resume`
  receives that status, then it shall emit `run.failed` with category `auth` and that hint, and
  create no session.
- **AC-005** When the adapter starts the runtime — for a check, a start or a resume — it shall pass
  an environment without `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` and `GITHUB_TOKEN` (also when Studio's
  own environment sets them) and with `COPILOT_TELEMETRY_DISABLED=true`, disable session telemetry,
  and pass no token option.
- **AC-006** When 0011 calls `start` with a run ID, project root, prompt and optional model, the
  adapter shall create exactly one session for that run with the project root as working directory,
  permission mode `manual` and the base directory of BR-09, and shall send a prompt byte-identical
  to the one given.
- **AC-007** When a session is created or resumed, the adapter shall emit exactly one
  `session.started` with the Copilot session ID as session reference and the run ID of the call,
  before any other event of that run.
- **AC-008** When `start` names a model, the adapter shall create the session with it; when none is
  named, and on `resume`, the adapter shall pass none (Copilot names the model as `selectedModel`
  of `session.start` or `session.resume`). When asked for the next start's model
  (OP-006 a), the adapter shall return the setting's value, or none when it is empty. The adapter
  shall deliver the model Copilot names for the session with `session.started`, otherwise none.
- **AC-009** If `start` names a model that Copilot's model list does not contain, then the adapter
  shall emit `run.failed` with category `model_unavailable`, naming that model, with the hint of
  §9, and create no session.
- **AC-010** When the scripted client replays a stream containing every Copilot event type of §7,
  the adapter shall emit exactly the mapped kinds in the order received, each with the payload
  fields 0009 §8.2 lists for its kind, Copilot's event ID and timestamp where the stream carries
  them, and source `provider`.
- **AC-011** If a Copilot event type is not listed in §7, then the adapter shall emit
  `provider.unknown` with its type name and top-level field names and no field value, and shall keep
  forwarding the following events of the run.
- **AC-012** When `tool.execution_complete` carries `fileEdits`, the adapter shall emit one
  `file.changed` per entry with the operation (OP-002), confidence *reported* and the path relative
  to the project root with forward slashes; a path outside the root shall stay as delivered and
  carry the flag of BR-06.
- **AC-013** When Copilot raises a permission request of any kind, one missing from the adapter's
  list included, the adapter shall emit exactly one `approval.requested` with Copilot's request ID,
  the kind, the path, command or URL as delivered, and the flag of BR-06, and shall send Copilot
  no answer before `respondToApproval` is called for it — checked by advancing the clock 24 h.
- **AC-014** When `respondToApproval` reaches the adapter, it shall send Copilot *approve once* or
  *reject* with the given reason, as decided, and emit exactly one `approval.resolved` with that
  decision, whether or not Copilot's `permission.completed` follows (refusals: 0009 AC-019).
- **AC-015** The adapter shall never send Copilot a permission result other than *approve once* or
  *reject*, never select a permission mode other than `manual`, and send no approval for a request
  that is open when its run is cancelled or ends — checked over the call log of every test of this
  spec.
- **AC-016** When Copilot raises a user-input or elicitation request, the adapter shall emit exactly
  one `input.requested` with Copilot's request ID and the question text; it shall pass the text
  given to `respondToInput` to Copilot unchanged and emit exactly one `input.resolved` without it.
- **AC-017** When 0011 calls `cancel`, the adapter shall request abort exactly once per run, however
  often `cancel` is called, and emit `run.cancelled` on Copilot's abort event; if none arrives
  within 10 s of the first call, then it shall stop the runtime and emit `run.cancelled` with cause
  "forced stop"; if no session exists yet, it shall emit `run.cancelled` and send no prompt. The
  adapter shall emit exactly one end kind per run.
- **AC-018** When Copilot reports `session.error`, the adapter shall emit `run.failed` with the
  category of §7 and, where §9 has one, the hint; for an error §7 does not map it shall emit
  `unknown` with Copilot's message. It shall emit neither `cancelled` nor `tool_failure` as category.
- **AC-019** When 0011 calls `resume` with a run ID, project root, session reference and
  continuation text, the adapter shall resume that session with the options of AC-005 and AC-006,
  send the continuation text byte-identical, and never create a new session in its place.
- **AC-020** If the runtime process exits while a run has no end kind and no cancel is pending, then
  the adapter shall emit `run.failed` with category `unknown`, the message of §7 and the exit code
  where the SDK reports one, source `derived`; no other `run.failed` of the adapter shall carry that source (0011 BR-008).
- **AC-021** If Copilot refuses a resume, then the adapter shall emit `run.failed` with the category
  of §7 — `unknown` with Copilot's message for a session it no longer knows — and create no session.
- **AC-022** *Only if OP-007 adopts a token path; not planned before.* Where the adapter passes a
  GitHub token to the runtime, it shall supply the token's value through 0004's credential port
  before the run's first event; a seeded token shall appear in no event, error text or adapter
  log line.
- **AC-023** The adapter shall register with the disclosure text of BR-14, byte for byte (0009
  BR-001), and shall report the permission mode in which every action asks (OP-006 a).
- **AC-024** The adapter shall create no file or folder inside any workspace folder and shall pass
  the runtime no base directory inside one (BR-09).
- **AC-025** When 0011 calls `endSession`, the adapter shall stop the runtime without waiting for
  Copilot and deliver no further event of that run (0009 §8.1).

Handoff trace (PD-017): AC-010.1–.4 → AC-006, AC-007 · .5 → AC-010 · .6 → AC-017 · .7 → AC-004,
AC-018 · .8 → AC-002, AC-003 · .9 → AC-007 · .10 → AC-005 · FR-010.3 → AC-008 · FR-010.9 → AC-013.

## 11. Technical notes for developers or AI agents

- Seam: one thin client interface; production wires `@github/copilot-sdk` (pin 1.0.34, ADR-003
  risk 2), tests the scripted client. Adding the SDK is a dependency change — Ask-first in
  `/sdd-plan` (AGENTS.md). It is bundled and must bring neither a native module nor the platform
  runtime packages into the VSIX (ADR-001 Decision 1); how: plan 0010 *Approach* (2026-11-17).
- Lives in `src/adapters/providers/copilot/`; no core or webview import (0009 AC-002).
- Fixtures: the recorded stream of `docs/decisions/poc-copilot-2026-11-17/events-copilot.jsonl`
  (one file with a `check` field per line; already redacted, account and home path replaced),
  checked against `docs/security/secret-patterns.md`; event types it lacks come from a synthetic
  stream written from `dist/generated/session-events.d.ts` and marked *synthetic*.
- SDK option names: ADR-003 §1–§2, §5. Setting keys keep the manifest's `featherspec-studio.`
  prefix. Node engine `^20.19 || >=22.12` must match the extension host's (M-07).

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The SDK uses the installed CLI's signed-in login without a token | Confirmed by M-01 (2026-11-17, auth type `gh-cli`, 25 models) | BR-02 fails; PD-001 is reopened (M-01) |
| A-002 | The SDK works with a separately installed CLI of a compatible version | Confirmed by M-09: SDK 1.0.34 (expects 1.0.112) ran the installed CLI 1.0.87, protocol 3 | BR-03 fails; bundling and per-platform VSIX come back (revises ADR-001) |
| A-003 | The signed-in login is visible from a Studio-owned base directory | M-08 passed for a `gh-cli` login with an empty base directory; a login made only with `copilot` is unproven (acceptance) | BR-09 falls back to the default folder (Q6) |
| A-004 | 10 s is long enough for Copilot to confirm an abort | M-04: abort confirmed after 34 ms (text-only run) | Forced stops where a clean abort would have come; re-measured in M-04 |
| A-005 | `manual` mode raises a request for every tool use, reads included | ADR-003 §1 lists a `read` kind; M-02's prompt read nothing, so still open (acceptance) | Reads happen unasked; §8 and BR-14 are reworded; M-02 decides |
| A-006 | A request arrives once, with an ID; the first `session.idle` after the prompt ends the run; `session.error` is terminal | M-02: one handler call and one `permission.requested` with `requestId`; M-03: run ended with `session.idle`; `session.error` not yet observed | §7, AC-013, AC-018 change; M-02, M-03 decide |

## 13. Manual checks (only Gregor's machine can prove these)

Windows 11, folder `C:\projects\test\spike002-poc`, signed-in Copilot seat.

**PoC, before `/sdd-plan`** (ADR-003 §7 A1–A6) — run 2026-11-17 with `poc.mjs` (plain Node 26.13,
SDK 1.0.34, installed CLI 1.0.87 from WinGet); evidence: `docs/decisions/poc-copilot-2026-11-17/`
(`report.json`, `preflight.json`, `events-copilot.jsonl` with 333 lines, one file with a `check`
field per line instead of one file per check).

- **M-01** (A1) Signed out: record the error shape. Signed in: model list returned. — *pass*, signed-in
  half (`gh-cli`, 25 models); the signed-out half moves to the acceptance checks.
- **M-02** (A2) Approval round trip: shell request rejected, write request approved once; no tool
  runs before the answer; note whether a request arrives once and whether reads ask. — *pass* for
  reject (one `write` request, once, with `requestId`; file absent); approve once and reads: acceptance.
- **M-03** (A3) Full run with the A3 prompt: events of §7 arrive, `fileEdits` present, the run ends
  with `session.idle`. — *pass* with a text-only prompt; `fileEdits`: acceptance.
- **M-04** (A4) Abort 5 s into a run: confirmed, no file written after it; time to confirmation noted.
  — *pass*, abort confirmed after 34 ms (1.5 s into a text-only run), no delta and no file after it.
- **M-05** (A5) Resume in a new process; the agent answers about its earlier changes; note whether
  earlier events are replayed. — *pass*: resumed in 185 ms, earlier events not replayed (three
  setup events before the prompt), the agent remembered its first answer.
- **M-06** (A6, optional) VS Code GitHub token accepted or not — input for OP-007. — not run; out of
  this increment (OP-007).
- **M-07** M-01…M-03 inside an Extension Development Host; log Node and Electron versions. — not run
  in the PoC; it becomes the host smoke `src/test/copilot.smoke.test.ts`, the first acceptance check
  (OP-013).
- **M-08** Login visible from a base directory in Studio's global storage — decides A-003. — *pass*
  for a `gh-cli` login with an empty base directory.
- **M-09** SDK 1.0.34 against the installed CLI version — sets OP-001's minimum, decides A-002. —
  *pass*: CLI 1.0.87, protocol 3; the npm `.cmd`/`.ps1` shims are not startable without a shell,
  the WinGet `copilot.exe` is.

**Acceptance, after the build:** first M-07 (the host smoke on Windows; an engine mismatch stops
the spec), then M-01…M-05 repeated in Studio with the built adapter, including the parts the PoC
left open: M-01 signed out, M-02 approve once and a read, M-03 with the A3 prompt (`fileEdits`),
M-04 5 s into a tool-using run, and A-003 with a login made only with `copilot`.

If M-01 fails on Gregor's machine, PD-001 is reopened per ADR-003's decision rule and this spec is
revised (Q7); no second provider spec is written in parallel. A failed M-06: OP-007.

## 14. Open points

Resolved:

- Q1…Q7: Gregor's answers in the specify interview (2026-11-16), cited at the rule each decided.
- OP-014 (2026-11-16): `/sdd-clarify` listed 84 findings, 10 blocking (`clarify/0010-findings.md`,
  kept by the orchestrator), resolved in one pass at Gregor's standing request — a one-off exception
  to the walkthrough. Resolved 71: every finding not bracketed under *Open* below — from 0008, 0009,
  0011, 0012 (all clarified the same day), PD-002, ADR-001, ADR-003, or as a wording fix with one
  reading. Readings made on the way — say so if one is wrong: (a) `typedErrors` `derived`; (b) the
  call's model wins over the setting, a resumed session keeps its model; (c) machine-scoped
  `cliPath`; (d) BR-06 compares text; (e) M-01 in the acceptance checks; (f) no answer to open
  requests at cancel; (g) stripped fixtures; (h) only the runtime-exit `run.failed` is `derived`.

Decided 2026-11-17 from the PoC evidence (§13) and, where it settles nothing, by each point's own
recommendation (Gregor's standing approval for plan sessions):

- OP-001 Minimum CLI version 1.0.87 (the lowest proven, M-09) and protocol 3; a newer CLI with
  protocol 3 is accepted (BR-03).
- OP-002 Not signed in = auth status not authenticated (typed, no error string needed); `errorType`
  values from the SDK's `ErrorData` documentation and the `fileEdits` kinds from its types (§7) —
  still UNVERIFIED by a recorded error; the acceptance checks record one where they can.
- OP-003 Not built here: removing session data needs a caller and a port operation 0009's surface
  does not have; it stays with the main session.
- OP-005 *Blocked by policy* is not detected in this increment; `errorType` `authorization` or
  `policy` ends a run as `policy_denied` (§7).
- OP-006 (a) settled by 0009's surface: `permissionModeLabel` and `nextStartModel`; (b) `endSession`
  is in 0009's port; (c) accepted; (d) done.
- OP-007 The VS Code GitHub token is out of the MVP; M-06 was not run; AC-022 is not planned.
- OP-008 Install link and hints in §9; the `model_unavailable` hint lists the offered models; a
  protocol mismatch is *unknown* naming both versions.
- OP-009 Choices are appended to the question; an elicitation whose form is one text field is a
  question, any other form is declined and reported as `warning`.
- OP-010 Disclosure with "command output and your answers" (BR-14).
- OP-011 The *ignored* list of §7.
- OP-012 One runtime per run, stopped at the end kind, after a check and at deactivation; earlier
  events are not replayed on resume (M-05); the session is created with the working directory
  trusted for that session only (as in the PoC), so Copilot asks no folder-trust question — every
  tool action still asks (BR-05); processes surviving a forced stop and two windows on one base
  directory stay unverified and are documented.
- OP-013 M-07 is the host smoke and the first acceptance check (Gregor, 2026-11-17).

Open:

- OP-004 Remote, WSL, Dev Containers: unverified; documented as a limitation (handoff §13).

## 15. Definition of Ready

- 0009 is clarified (done 2026-11-16) and OP-006 a is settled.
- M-01…M-06, M-08 and M-09 are done and their stripped files are in the repository as fixtures —
  `/sdd-plan` for this spec waits for them (Q7); OP-001 and OP-002 are filled in from them.
  Met 2026-11-17 except M-06 (not run, OP-007); the evidence is in `docs/decisions/poc-copilot-2026-11-17/`.
- A-001…A-003 are confirmed or the spec is revised. A-001 and A-002 confirmed; A-003 for `gh-cli`.

## 16. Definition of Done

- AC-001…AC-025 pass in plain Node (AC-022 only if adopted); 0009's contract suite passes for `copilot`.
- The acceptance checks of §13 pass in Studio, accepted by Gregor.
- No credential in any emitted event or adapter log line; docs state the disclosure, the installed-CLI
  requirement, the removed environment variables and the remote limitation.

## 17. Recommended next steps

Gregor reads [the plan](0010-first-agent-provider-copilot.plan.md); after the build, the
acceptance checks of §13.
