# First Agent Provider Integration (GitHub Copilot SDK)

**Status:** Draft
**Plan:** _none yet_

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
  either (documented). Studio holds and stores no credential.
- **BR-03 Runtime and availability** (Q2, 0009 BR-004). The CLI comes from the machine-scoped setting
  `featherspec-studio.copilot.cliPath` (never from workspace or folder settings), else from `PATH`;
  none is bundled. Results are 0009's: *not installed* (not found, not startable, older than
  OP-001's minimum), *not signed in*, *blocked by policy* (UNVERIFIED, OP-005), otherwise *unknown*
  with Copilot's message.
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
  those files outside Studio's retention (A-003).
- **BR-10 Telemetry** (handoff §13 Privacy, ADR-003 §5). Copilot telemetry and session telemetry are
  off for every runtime and session Studio starts or resumes.
- **BR-11 Events** (0009 BR-007, §8.2). Mapped per §7, source `provider`. Source `derived` marks
  what the adapter adds itself: the forced stop's `run.cancelled`, a `.resolved` Copilot does not
  send (0009 BR-005) and the runtime-exit `run.failed` — the only derived `run.failed`, which 0011
  classes `provider_exited` (0011 BR-008). A type §7 does not list becomes `provider.unknown`; the
  run continues. No raw Copilot object is delivered (PD-029).
- **BR-12 Errors** (0009 BR-009). Mapped per §7; unmapped → `unknown`; never `cancelled` or
  `tool_failure` (a failed tool is `tool.completed` not ok). 0009 owns the generic texts, the
  adapter adds the hints of §9. A failure before a session exists ends the run with `run.failed`
  and no `session.started`; checks run in the order runtime, sign-in, model.
- **BR-13 Cancel.** Abort first; after 10 s without Copilot's confirmation (A-004) the adapter stops
  the runtime, cause "forced stop". `endSession` (0009 §8.1) stops it at once. The adapter delivers
  exactly one end kind per run, whatever arrives later.
- **BR-14 Disclosure** (handoff §13 Privacy, ADR-003 §5). The adapter supplies the text "Runs with
  GitHub Copilot send the prompt and every file the agent reads to GitHub, and each prompt counts
  against your Copilot plan." as its registry entry's disclosure (0009 BR-001; wording: OP-010).

## 7. Mapping tables

Events (Copilot → 0009 kind): `session.start` or the created session ID, whichever comes first →
one `session.started{sessionRef}` · `assistant.turn_start` / `assistant.turn_end` → `turn.started` /
`turn.completed` · `assistant.message_delta` / `assistant.message` → `message.delta` /
`message.completed` · `assistant.reasoning(_delta)` → `reasoning` · `tool.execution_start` /
`_progress` / `_complete` → `tool.started` / `tool.progress` / `tool.completed{ok}` ·
`tool.execution_complete.fileEdits[]` → `file.changed` · `permission.requested` /
`permission.completed` → `approval.requested` / `approval.resolved` · `user_input.requested` /
`user_input.completed`, `elicitation.*` → `input.requested` / `input.resolved` ·
`session.todos_changed` → `plan.updated` · `assistant.usage`, `session.usage_info` → `usage` ·
`session.warning` → `warning` · the first `session.idle` after the prompt or continuation text was
sent → `run.completed` · `session.error` → `run.failed{category}` · `abort` → `run.cancelled`.
Types Studio deliberately drops are added as *ignored* before planning (OP-011).

Errors (→ 0009 category): runtime cannot be started → `runtime_missing` · not signed in, token
rejected → `auth` · `errorType` `rate_limit` or `quota` → `quota_or_rate_limit` · model named in
the call is not in Copilot's list → `model_unavailable` · connection or server failure →
`network_or_server` · policy refusal of the seat → `policy_denied` · runtime exits during a run →
`unknown` with "Copilot runtime stopped unexpectedly" and its exit code · a session Copilot no
longer knows, anything else → `unknown`. The `errorType` values for auth, policy, network and
model, and the `fileEdits` kinds behind `add`, `update`, `delete`, are UNVERIFIED (OP-002).

## 8. Security, permissions and privacy

- No credential in settings, workspace files, events or the adapter's log output (handoff §13
  Security, BR-02); Copilot's own log files are Copilot's.
- Permissions are never widened (BR-05); no workspace file chooses the executable (BR-03); a request
  outside the project root is marked (BR-06); telemetry is off (BR-10).
- The adapter adds nothing to the prompt (BR-04); what the runtime sends to GitHub beyond it (what
  the agent reads, command output, answers) is Copilot's and named by the disclosure (BR-14).

## 9. Hints

English (PD-016): *not installed* / `runtime_missing` → the found and required version where known,
and the install link (OP-008) · *not signed in* / `auth` → "Run `copilot` in a terminal and sign in,
then retry." · `quota_or_rate_limit` → "Your Copilot allowance or rate limit is reached; retry
later." · `model_unavailable` → names the model and "Change the setting
featherspec-studio.copilot.model."

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
- **AC-004** If Copilot answers the availability check with its not-signed-in error (OP-002), then
  the adapter shall return *not signed in* with the hint of §9; if a `start` or `resume` receives
  that error, then it shall emit `run.failed` with category `auth` and that hint, and create no
  session.
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
  named, and on `resume`, the adapter shall pass none. When asked for the next start's model
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
  the adapter shall emit `run.failed` with category `unknown`, the message of §7 and the exit code,
  source `derived`; no other `run.failed` of the adapter shall carry that source (0011 BR-008).
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
  runtime packages into the VSIX (ADR-001 Decision 1); how is decided in the plan after M-09.
- Lives in `src/adapters/providers/copilot/`; no core or webview import (0009 AC-002).
- Fixtures: Gregor's event files from M-01…M-05, stripped of account names, home paths and file
  content and checked against `docs/security/secret-patterns.md` before they enter the repository;
  until then synthetic streams written from `dist/generated/session-events.d.ts`.
- SDK option names: ADR-003 §1–§2, §5. Setting keys keep the manifest's `featherspec-studio.`
  prefix. Node engine `^20.19 || >=22.12` must match the extension host's (M-07).

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The SDK uses the installed CLI's signed-in login without a token | ADR-003 §2 Auth row, docs only; Gregor's MVP path (Q1) | BR-02 fails; PD-001 is reopened (M-01) |
| A-002 | The SDK works with a separately installed CLI of a compatible version | ADR-003 §2 names `COPILOT_CLI_PATH`; compatibility unproven until M-09 | BR-03 fails; bundling and per-platform VSIX come back (revises ADR-001) |
| A-003 | The signed-in login is visible from a Studio-owned base directory | ADR-003 §2 (`baseDirectory` sets `COPILOT_HOME`); unproven until M-08 | BR-09 falls back to the default folder (Q6) |
| A-004 | 10 s is long enough for Copilot to confirm an abort | Working threshold, mine; not measured | Forced stops where a clean abort would have come; re-measured in M-04 |
| A-005 | `manual` mode raises a request for every tool use, reads included | ADR-003 §1 lists a `read` kind — not proof that every read asks | Reads happen unasked; §8 and BR-14 are reworded; M-02 decides |
| A-006 | A request arrives once, with an ID; the first `session.idle` after the prompt ends the run; `session.error` is terminal | ADR-003 §4, from types only; 0009 §8.2 expects the ID | §7, AC-013, AC-018 change; M-02, M-03 decide |

## 13. Manual checks (only Gregor's machine can prove these)

Windows 11, folder `C:\projects\test\spike002-poc`, signed-in Copilot seat.

**PoC, before `/sdd-plan`** (ADR-003 §7 A1–A6, plain `node poc.mjs`), one event file per check
(`events-copilot-M0N.jsonl`); Gregor sends the files and states pass or fail.

- **M-01** (A1) Signed out: record the error shape. Signed in: model list returned.
- **M-02** (A2) Approval round trip: shell request rejected, write request approved once; no tool
  runs before the answer; note whether a request arrives once and whether reads ask.
- **M-03** (A3) Full run with the A3 prompt: events of §7 arrive, `fileEdits` present, the run ends
  with `session.idle`.
- **M-04** (A4) Abort 5 s into a run: confirmed, no file written after it; time to confirmation noted.
- **M-05** (A5) Resume in a new process; the agent answers about its earlier changes; note whether
  earlier events are replayed.
- **M-06** (A6, optional) VS Code GitHub token accepted or not — input for OP-007.
- **M-07** M-01…M-03 inside an Extension Development Host; log Node and Electron versions.
- **M-08** Login visible from a base directory in Studio's global storage — decides A-003.
- **M-09** SDK 1.0.34 against the installed CLI version — sets OP-001's minimum, decides A-002.

**Acceptance, after the build:** M-01…M-05 repeated in Studio with the built adapter.

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

Open — none needs a guess in the plan; finding in brackets, a recommendation each:

- OP-001 Minimum CLI version — from M-09.
- OP-002 Copilot `errorType` values and `fileEdits` kinds — UNVERIFIED, from M-01 and M-03.
- OP-003 [20] Neither the age cap nor "Clear Run History" (PD-027) reaches Copilot's session files.
  Recommendation: the adapter offers "remove session data" by session reference; the main session
  decides who calls it.
- OP-004 Remote, WSL, Dev Containers: unverified; documented as a limitation (handoff §13).
- OP-005 Copilot Business/Enterprise policies blocking SDK use — UNVERIFIED (ADR-003 §5).
- OP-006 (cross-spec, main session) (a) [8] No port operation reports the permission mode or the
  next start's model (0009 OP-002, 0008 OP-010). Recommendation: the mode as 0009's registry label
  for "every action asks", the model by one port query. (b) 0009 §8.1 has `endSession` (AC-025); 0011
  OP-004 still says the port can only cancel. (c) 0008 OP-011 and 0011 OP-006 move their
  real-provider checks into §13's acceptance. Recommendation: accept. (d) 0009 OP-011's notes on
  this spec are done.
- OP-007 [13, 24] VS Code GitHub token. Recommendation: out of the MVP whatever M-06 shows; a failed
  M-06 does not reopen PD-001. If adopted later, AC-022 applies.
- OP-008 [60] The install link's URL (fixed in the plan); whether the `model_unavailable` hint lists
  the offered models (recommended: yes); a CLI newer than the pinned SDK supports (recommended:
  *unknown* naming both versions).
- OP-009 [70] Questions with choices, structured elicitation. Recommendation: choices are appended
  to the question; a form free text cannot answer is declined and reported as `warning`.
- OP-010 [82] Disclosure wording, for Gregor to accept. Recommendation: add "command output and your
  answers".
- OP-011 [69] Unlisted Copilot event types flood `provider.unknown`. Recommendation: after M-03, §7
  gets an *ignored* list; only types in neither list are unknown.
- OP-012 [65, 66, 71, 73] Runtime behaviour, UNVERIFIED: runtime lifetime (recommended: stopped at
  the end kind, after a check, at deactivation; a check that never returns: 0009 OP-009);
  processes surviving a forced stop; Copilot's folder-trust question; replayed events on resume;
  two windows on one base directory.
- OP-013 [83] M-07 does not precede the plan. Recommendation: add it — an engine mismatch is a no-go.

## 15. Definition of Ready

- 0009 is clarified (done 2026-11-16) and OP-006 a is settled.
- M-01…M-06, M-08 and M-09 are done and their stripped files are in the repository as fixtures —
  `/sdd-plan` for this spec waits for them (Q7); OP-001 and OP-002 are filled in from them.
- A-001…A-003 are confirmed or the spec is revised.

## 16. Definition of Done

- AC-001…AC-025 pass in plain Node (AC-022 only if adopted); 0009's contract suite passes for `copilot`.
- The acceptance checks of §13 pass in Studio, accepted by Gregor.
- No credential in any emitted event or adapter log line; docs state the disclosure, the installed-CLI
  requirement, the removed environment variables and the remote limitation.

## 17. Recommended next steps

Gregor runs the PoC checks of §13; the main session settles OP-006 and puts the open points to
Gregor; then `/sdd-plan`.
