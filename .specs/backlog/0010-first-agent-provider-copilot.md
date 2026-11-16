# First Agent Provider Integration (GitHub Copilot SDK)

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-010 ([po-handoff.md](../../docs/product/po-handoff.md) §2.1, §8.3, §10 FS-010, §13, §14 Provider Contract Tests).
Provider choice: PD-001 and [ADR-003](../../docs/decisions/ADR-003-first-agent-provider.md) (Proposed; PoC open).
Depends on: 0009 (provider port, registry, capability model, event taxonomy, error categories, fake
provider, contract suite), 0004 (credential port for masking, run record), 0001 (project root).
Consumers: 0008 (generates the prompt, shows the disclosure and model in its confirmation), 0011
(starts, cancels, resumes, answers approvals and input), 0012 (renders events and approvals).

## 1. Summary

The first real coding agent behind Studio's provider port: an adapter for the GitHub Copilot SDK
that runs the developer's installed Copilot CLI in the active project, forwards every approval and
question to the developer, reports Copilot's events in 0009's normalised form, and can be cancelled
and resumed. Everything is decided in plain Node against a scripted Copilot SDK client; what only a
signed-in run on Gregor's Windows 11 machine can prove is listed as manual checks (§13).

## 2. Goal and problem

Up to 0009 Studio drives runs only with the fake provider. The developer wants to start a real agent
from Studio and get its result (handoff FS-010 user story) without Studio widening permissions
(PD-006), assuming an authentication path that is not supported (handoff §2.1, AC-010.10), or
leaking credentials (handoff §13 Security).

Success: a run started from Studio executes in the project root with the prompt 0008 generated, every
permission request reaches the developer, cancel and resume work, and errors name their cause and
remedy — proven by the manual checks M-01…M-09 on Gregor's machine.

## 3. Users and roles

- **Developer** (only role): starts runs (via 0008), answers approvals and questions, cancels.
- **Gregor** runs the manual checks of §13 (PoC ADR-003 §7) and accepts the result.

## 4. Scope

### In scope

- One provider adapter, ID `copilot`, registered through 0009's registry and reached only through
  0009's port (AC-009.2).
- Availability check: installed Copilot CLI found and recent enough; signed-in state.
- Start, event forwarding, approvals, input requests, cancel, resume — for Studio-started runs only.
- Model setting fed from Copilot's model list.
- Mapping of Copilot events and errors to 0009's taxonomy and categories, with remedy texts.
- The provider disclosure text that 0008 shows before a start.
- The Copilot runtime's own data folder inside Studio's global storage.

### Out of scope

- Claude Agent SDK and Codex SDK adapters — because PD-001 picks Copilot first; others follow via 0009.
- Bundling the Copilot runtime or a per-platform VSIX — because Gregor chose the installed CLI and the universal VSIX of ADR-001 (Q2, 2026-11-16).
- BYOK, pasted tokens, classic `ghp_` tokens, server-to-server auth — because Gregor limited the MVP to the signed-in login (Q1).
- Approving for a whole session or location, or any auto-approval — because PD-006 and PD-002 rule them out (Q3).
- Generating the prompt text or the resume continuation text — because 0008 owns the prompt and 0011 the continuation (Gregor, Q5 correction).
- Run statuses, transitions, linking run and spec, storing the session reference — because 0011 and 0004 own them (PD-025); this spec delivers the facts.
- Rendering events, approvals and errors — because 0012 renders them (PD-036).
- MCP servers and custom tools — because PD-009 excludes MCP from the MVP.
- Adopting Copilot sessions Studio did not start — because PD-010.
- A per-run model picker — because Gregor chose a setting only (Q4).
- Removing Copilot's session files with "Clear Run History" — because 0004 owns that command; handed over as OP-003.
- Remote, WSL and Dev Container workspaces as a verified setup — because no PoC covers them (ADR-003 risk 6); documented as unverified (OP-004).

## 5. Functional flow

1. 0008 asks for availability and the disclosure; the adapter checks the CLI and the sign-in (BR-03, BR-02).
2. The developer confirms the start in 0008 (PD-002); 0011 calls `start` with run ID, project root,
   the prompt from 0008 and the configured model.
3. The adapter starts the runtime, creates one Copilot session in the project root, reports the
   session reference, then sends the prompt unchanged.
4. Copilot events arrive and are forwarded in normalised form; permission requests and questions
   wait for the developer's answer, which 0011 passes back.
5. The session ends (completed, failed, cancelled); the adapter reports the end event.
6. Later, 0011 may resume an `Interrupted` run (PD-024) with its continuation text.

## 6. Business rules

Terms: **runtime** — the Copilot CLI installed on the developer's machine, which the SDK launches.
**Scripted client** — a test double of the Copilot SDK client that replays a recorded or written
sequence of Copilot SDK events and logs every call the adapter makes. **Project root** — 0001's
root-folder URI of the active project (PD-026).

- **BR-01** The adapter implements 0009's port and declares the capabilities of ADR-003 §3, Copilot
  column: `start`, `cancel`, `resume`, `streamText`, `toolEvents`, `approvals`, `userInput`,
  `planUpdates`, `usage`, `modelList` native; `fileChanges` native-experimental; `typedErrors`
  partial; `mcp` and `customTools` declared `none` in the MVP (PD-009). A manual check that
  disproves a capability changes this declaration, never the UI's honesty rule (0009).
- **BR-02** Authentication (Q1, AC-010.10): only the GitHub account already signed in to Copilot. The
  adapter passes no token and starts the runtime without `COPILOT_GITHUB_TOKEN`, `GH_TOKEN` and
  `GITHUB_TOKEN` in its environment, so no other path applies silently. The VS Code GitHub sign-in
  becomes the preferred path only if M-06 passes (A-001); then the adapter supplies that token's
  value through 0004's credential port for masking (PD-029) and never stores it. Studio stores no
  credential of its own.
- **BR-03** Runtime (Q2): the CLI is taken from the setting `featherspec-studio.copilot.cliPath`, else
  from `PATH`. Missing, not executable or older than the minimum version (OP-001) → availability
  *runtime missing* with an install link. No runtime is bundled.
- **BR-04** Working context (Q5): the session's working directory is the project root. The prompt
  from 0008 and the continuation text from 0011 are passed byte for byte unchanged. The adapter adds
  no file content and no instruction of its own.
- **BR-05** Approvals (PD-006, Q3): the session runs in Copilot's `manual` permission mode; every
  permission request — of any kind, reads included, unknown kinds included — becomes
  `approval.requested` and waits. The only answers the adapter ever sends are *approve once* and
  *reject* with an optional reason. A request waits without time limit; cancel stays possible.
- **BR-06** Outside-project marker (Q3): the adapter detects it — a request whose path or working
  directory lies outside the project root carries `outsideProject: true`. 0012 owns its text.
- **BR-07** Questions (Q3): a Copilot input or elicitation request becomes `input.requested`; the
  developer's free-text answer is passed unchanged.
- **BR-08** Model (Q4): setting `featherspec-studio.copilot.model`, choices from Copilot's model list.
  Empty → no model is passed and Copilot's default applies. The model actually used is reported when
  Copilot delivers it, otherwise "not available" (0004 §8).
- **BR-09** Runtime data folder (Q6): the runtime's base directory is a folder in Studio's global
  storage, outside every workspace folder; if M-08 shows the signed-in login is not visible from
  there, the default folder is used and the docs say that Copilot keeps those files outside Studio's
  retention (A-003).
- **BR-10** Telemetry (handoff §13 Privacy, ADR-003 §5): Copilot telemetry and session telemetry are
  switched off for every runtime Studio starts.
- **BR-11** Events (ADR-003 §4): Copilot events map to 0009's kinds per §7; a Copilot event type
  without a mapping becomes 0009's unknown kind and the run continues. Copilot's `fileEdits` become
  `file.changed` with confidence *reported* (field experimental). Raw provider objects are not
  stored (PD-029).
- **BR-12** Errors: Copilot errors map to 0009's categories per §7; anything unmapped is `unknown`
  with Copilot's message. The adapter owns one remedy text per category for Copilot (§9).
- **BR-13** Cancel: the adapter asks Copilot to abort; if Copilot confirms no abort within 10 s
  (A-004), the adapter stops the runtime and reports the run cancelled with cause "forced stop".
- **BR-14** Disclosure (handoff §13 Privacy, ADR-003 §5): the adapter supplies the text "Runs with
  GitHub Copilot send the prompt and every file the agent reads to GitHub, and each prompt counts
  against your Copilot plan." 0008 shows it in its confirmation (PD-002).

## 7. Mapping tables

Events (Copilot → 0009 kind): `session.start` / created session ID → `session.started{sessionRef}` ·
`assistant.turn_start` / `assistant.turn_end` → `turn.started` / `turn.completed` ·
`assistant.message_delta` / `assistant.message` → `message.delta` / `message.completed` ·
`assistant.reasoning(_delta)` → `reasoning` · `tool.execution_start` / `_progress` / `_complete` →
`tool.started` / `tool.progress` / `tool.completed{ok}` · `tool.execution_complete.fileEdits[]` →
`file.changed` · `permission.requested` / `permission.completed` → `approval.requested` /
`approval.resolved` · `user_input.requested` / `user_input.completed`, `elicitation.*` →
`input.requested` / `input.resolved` · `session.todos_changed` → `plan.updated` · `assistant.usage`, `session.usage_info` → `usage` ·
`session.warning` → `warning` · `session.idle` after the last turn → `run.completed` ·
`session.error` → `run.failed{category}` · `abort` → `run.cancelled`.

Errors (→ 0009 category): runtime spawn fails (not found, not executable) → `runtime_missing` ·
not signed in, token rejected → `auth` · `errorType` `rate_limit` or `quota` → `quota_or_rate_limit`
· configured model not offered → `model_unavailable` · connection or server failure → `network_or_server`
· policy refusal of the seat → `policy_denied` · runtime exits during a run → `unknown` with
"Copilot runtime stopped unexpectedly" and its exit code · anything else → `unknown`. Which
`errorType` values Copilot sends for auth and policy is UNVERIFIED (OP-002, M-01).

## 8. Security, permissions and privacy

- No credential in settings, workspace files, events or logs (handoff §13 Security); BR-02 only.
- Permissions are never widened: BR-05; the developer decides every request (PD-006).
- Workspace access: working directory is the project root; access outside it is visible (BR-06).
- Restricted Mode: agent start is hidden and guarded (ADR-001 §14); the adapter is never started in
  an untrusted workspace.
- Context sent to GitHub: only the prompt and what the agent reads under approvals (BR-04, BR-14).
- Telemetry off (BR-10).

## 9. Error cases and edge cases

- CLI missing, not executable, too old → *runtime missing* + install link (AC-002, AC-003).
- Not signed in → `auth`, remedy "Run `copilot` in a terminal and sign in, then retry." (AC-004).
- Quota or rate limit → remedy "Your Copilot allowance or rate limit is reached; retry later." ·
  `model_unavailable` → names the model and "Change the setting featherspec-studio.copilot.model."
- Configured model not in the list → start refused before any session (AC-009).
- Unknown event type, unknown permission kind → AC-011, AC-013.
- Runtime crashes mid-run → AC-020. Abort not confirmed → forced stop (AC-017).
- Resume of a session Copilot no longer knows → AC-021.
- Answer for a request that is not pending → AC-014.

## 10. Acceptance criteria

All criteria are decided in plain Node with the scripted client (§6) and a controllable clock,
unless marked otherwise. "Emits" means: delivers through 0009's event callback.

- **AC-001** The adapter shall register under provider ID `copilot` with exactly the capability
  declaration of BR-01, and pass 0009's provider contract suite with the scripted client.
- **AC-002** When availability is checked and neither the setting `featherspec-studio.copilot.cliPath`
  nor `PATH` yields an executable CLI, the adapter shall report *runtime missing* with an install
  link and create no session.
- **AC-003** If the found CLI reports a version below the minimum (OP-001), then the adapter shall
  report *runtime missing* naming the found and the required version.
- **AC-004** If the auth check or a start receives Copilot's not-signed-in error, then the adapter
  shall report category `auth` with the remedy text of §9 and create no session.
- **AC-005** When the adapter starts the runtime, the environment it passes shall contain none of
  `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN` (even when set in Studio's own environment),
  telemetry shall be off (BR-10), and no token option shall be passed while A-001 is unconfirmed.
- **AC-006** When 0011 calls start with a run ID, project root, prompt and model, the adapter shall
  create exactly one session whose working directory equals the project root, permission mode is
  `manual`, base directory is the folder of BR-09, and shall send a prompt byte-identical to the one
  given.
- **AC-007** When a session is created, the adapter shall emit `session.started` with the Copilot
  session ID as session reference and the run ID before any other event of that run.
- **AC-008** Where the model setting names a model in Copilot's list, the session shall be created
  with that model; where it is empty, no model shall be passed and the reported model shall be
  Copilot's if delivered, otherwise "not available".
- **AC-009** If the model setting names a model not in Copilot's list, then the adapter shall refuse
  the start with `model_unavailable` naming that model and create no session.
- **AC-010** When the scripted client replays a recorded stream containing every Copilot event type
  of §7, the adapter shall emit exactly the mapped kinds of §7 in the order received.
- **AC-011** If a Copilot event type has no mapping, then the adapter shall emit 0009's unknown kind
  for it and keep forwarding the following events of the run.
- **AC-012** When `tool.execution_complete` carries `fileEdits`, the adapter shall emit one
  `file.changed` per entry with the path relative to the project root, the operation and confidence
  *reported*; a path outside the root stays absolute and carries `outsideProject: true`.
- **AC-013** When Copilot raises a permission request of any kind, including a kind the adapter does
  not know, the adapter shall emit `approval.requested` with kind, target (path, command or URL as
  delivered) and the outside-project flag of BR-06, and shall send Copilot no answer until
  `respondToApproval` is called for it — checked by advancing the clock 24 h.
- **AC-014** When `respondToApproval` is called for a pending request, the adapter shall send
  *approve once* for "approve" and *reject* with the given reason for "reject"; if the request is not
  pending or the decision is another value, then the adapter shall refuse the call and send nothing.
- **AC-015** The adapter shall never send Copilot a permission result other than *approve once* or
  *reject*, and never select a permission mode other than `manual` — checked over the call log of
  every test of this spec.
- **AC-016** When Copilot asks the developer a question, the adapter shall emit `input.requested` with
  the question text and pass the answer given to `respondToInput` unchanged.
- **AC-017** When 0011 calls cancel, the adapter shall request abort exactly once and emit
  `run.cancelled` on Copilot's abort event; if no abort event arrives within 10 s, then it shall stop
  the runtime and emit `run.cancelled` with cause "forced stop".
- **AC-018** When Copilot reports `session.error`, the adapter shall emit `run.failed` with the
  category of §7 and, for `auth`, `quota_or_rate_limit`, `model_unavailable` and `runtime_missing`,
  the remedy text of §9; an unmapped error shall yield `unknown` with Copilot's message.
- **AC-019** When 0011 calls resume with a session reference and continuation text, the adapter shall
  resume that session in the project root and send the continuation text byte-identical; it shall
  never create a new session in its place.
- **AC-020** If the runtime process exits while a run is open, then the adapter shall emit
  `run.failed` with category `unknown`, the message of §7 and the exit code.
- **AC-021** If resume is refused by Copilot, then the adapter shall emit `run.failed` with the
  mapped category and create no session.
- **AC-022** Where the VS Code sign-in path is active (A-001), the adapter shall supply the token
  value through 0004's credential port before the first event of the run; a seeded test token shall
  appear in no emitted event, error message or log line.
- **AC-023** When 0008 asks for the disclosure, the adapter shall return the text of BR-14 unchanged.
- **AC-024** The adapter shall create no file or folder inside any workspace folder; the base
  directory of BR-09 lies outside every workspace folder.

## 11. Technical notes for developers or AI agents

- Seam: the adapter talks to the SDK through one thin client interface; production wires
  `@github/copilot-sdk` (pin 1.0.34, ADR-003 risk 2), tests wire the scripted client. Adding the SDK
  is a dependency change — Ask-first in `/sdd-plan` (AGENTS.md). It must not pull the platform
  runtime packages into the VSIX (ADR-001 universal VSIX); how (`COPILOT_CLI_PATH`, excluded
  optional dependencies) is decided in the plan after M-09.
- Lives in `src/adapters/providers/copilot/` (ADR-001); no core or webview import (0009 AC-009.3).
- Recorded fixtures: Gregor's `events-copilot.jsonl` from M-01…M-05 become the scripted streams;
  until then streams are written from `dist/generated/session-events.d.ts` and marked synthetic.
- SDK names from ADR-003: `onPermissionRequest`, `onUserInputRequest`, `onElicitationRequest`,
  `createSession`, `resumeSession`, `abort`, `forceStop`, `listModels`, `workingDirectory`,
  `baseDirectory`, `enableSessionTelemetry`, env `COPILOT_TELEMETRY_DISABLED`.
- Node engine `^20.19 || >=22.12` must match the extension host's Node (M-07).

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The signed-in Copilot login is the MVP path; the VS Code GitHub token is used only after M-06 passes | Gregor Q1; ADR-003 §5 marks the VS Code token UNVERIFIED | AC-005/AC-022 change; ADR-003 decision rule may re-rank Claude |
| A-002 | The SDK works with a separately installed CLI of a compatible version | ADR-003 §2 (`COPILOT_CLI_PATH`) | BR-03 fails; bundling and per-platform VSIX come back (revises ADR-001) |
| A-003 | The signed-in login is visible from a Studio-owned base directory | ADR-003 §2 (`baseDirectory` sets `COPILOT_HOME`) | BR-09 falls back to the default folder (Q6) |
| A-004 | 10 s is enough for Copilot to confirm an abort | Mine; ADR-003 §7 A4 uses 5 s | Forced stops where a clean abort would have come; re-measured in M-04 |
| A-005 | `manual` mode raises a request for every tool use, reads included | ADR-003 §1 (typed kinds incl. `read`) | Fewer requests than BR-05 promises; M-02 decides |

## 13. Manual checks (only Gregor's machine can prove these; PoC ADR-003 §7)

Windows 11, folder `C:\projects\test\spike002-poc`, signed-in Copilot seat. Each check writes the
event stream to `events-copilot.jsonl`; Gregor sends the files and states pass or fail.

- **M-01** (A1) Signed out: availability and start report `auth`; record the error shape. Signed in: model list returned.
- **M-02** (A2) Approval round trip in Studio: shell request rejected, write request approved once; no tool runs before the answer.
- **M-03** (A3) Full run with the A3 prompt: events of §7 arrive, `fileEdits` present, run ends `Completed`.
- **M-04** (A4) Cancel after 5 s: abort confirmed, no file written after it; time to confirmation noted (A-004).
- **M-05** (A5) Resume the session in a new process; the agent answers about its earlier changes.
- **M-06** (A6) VS Code GitHub token accepted or not — decides A-001.
- **M-07** Steps M-01…M-03 inside the Extension Development Host; log Node and Electron versions.
- **M-08** Login visible from the Studio base directory — decides A-003.
- **M-09** SDK 1.0.34 against the installed CLI version — sets OP-001's minimum version, decides A-002.

If M-01 or M-06 fails for a typical setup, PD-001 is reopened per ADR-003's decision rule and this
spec is revised (Q7); no second provider spec is written in parallel.

## 14. Open points

- OP-001 Minimum CLI version — from M-09.
- OP-002 Copilot `errorType` values for auth and policy refusal — UNVERIFIED, from M-01.
- OP-003 For 0004: "Clear Run History" also removes the Copilot session files in the base directory of BR-09.
- OP-004 Remote, WSL, Dev Containers: behaviour unverified; documented as a limitation (handoff §13 Compatibility).
- OP-005 Copilot Business/Enterprise policies blocking SDK use — UNVERIFIED (ADR-003 §5); maps to `policy_denied`.

## 15. Definition of Ready

- 0009 is clarified (port, taxonomy and categories exist as cited).
- M-01…M-06, M-08 and M-09 are done and their files are in the repository as fixtures — `/sdd-plan`
  for this spec waits for them (Q7).
- A-001…A-003 are confirmed or the spec is revised.

## 16. Definition of Done

- AC-001…AC-024 pass in plain Node; 0009's contract suite passes for `copilot`.
- M-02…M-05 and M-07 repeated with the built adapter inside Studio, accepted by Gregor.
- No credential in any emitted event or log (AC-022); docs state the disclosure, the installed-CLI
  requirement and the remote limitation.

## 17. Recommended next steps

`/sdd-clarify` in a fresh session; Gregor runs the manual checks of §13; then `/sdd-plan`.
