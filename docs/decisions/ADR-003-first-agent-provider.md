# ADR-003: First productive agent provider (SPIKE-002)

- Status: Proposed. Desk evaluation only. The PoC on Gregor's machine is still open (see "PoC checklist").
- Date: 2026-11-16
- Relates to: SPIKE-002, FS-009, FS-010, FS-011, FS-012, PD-001, PD-006, PD-007, PD-009, PD-010
- Evidence base: npm registry metadata, plus the published tarballs fetched with `npm pack` and read locally (`.d.ts`, README, bundled binaries), plus official docs. Every source was retrieved on 2026-11-16. **No authenticated run was possible here.** Nothing below says a run *works* end to end. It says only what the types and docs declare.

## 1. Decision (recommendation)

**First provider: GitHub Copilot SDK (`@github/copilot-sdk` 1.0.34), using the default stdio transport.**

Why it wins on the handoff's own criteria:
1. **Host-controlled approvals (PD-006, FR-010.9).** `onPermissionRequest` runs before every tool execution. It receives a typed `kind` (`shell`, `write`, `read`, `mcp`, `custom-tool`, `url`, `memory`, `hook`) and returns `approve-once | approve-for-session | approve-for-location | reject{feedback} | user-not-available | no-result`. Without a handler the request is left pending as an event (`permission.requested`). That maps cleanly to `WaitingForApproval`.
2. **The richest typed event stream.** The generated `SessionEvent` union has about 200 types, among them `assistant.message_delta`, `tool.execution_start/progress/complete`, `permission.requested/completed`, `user_input.requested`, `session.todos_changed`, `session.error{errorType}`, `session.idle` and `abort`. `tool.execution_complete.fileEdits[] {kind,path}` reports committed file mutations, which serves AC-012.5. That field is marked **experimental**.
3. **Auth via the user's own subscription is documented for third-party apps.** GitHub's OAuth-app guide targets "SaaS products" and bills usage to each user's own Copilot subscription. The other two vendors forbid that path (Anthropic) or restrict it to a limited trial (OpenAI). BYOK is a documented fallback that needs no subscription.
4. **GA, semver, MIT** (SDK and the platform runtime package). Resume, abort, `listModels`/`setModel`, `mcpServers`, custom tools (`defineTool`) and hooks (`onPreToolUse`/`onPostToolUse`) are all present in the types. This confirms PD-001.

**Runner-up: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk` 0.3.325).** Its control surface is technically the strongest: `canUseTool` with allow/deny, `updatedInput` and `interrupt`, more than 30 hook events, `interrupt()`, `resume`/`forkSession`, and session listing APIs. It is second only because of terms and DevEx. Third-party products may not offer claude.ai login unless Anthropic has approved them, so every user needs an API key or a cloud account (Bedrock, Vertex, Foundry, Claude Platform on AWS). On top of that the licence is proprietary, the SDK is pre-1.0, and the bundled binary is the second largest of the three.

**Not first: OpenAI Codex SDK (`@openai/codex-sdk` 0.169.0).** The TS SDK wraps `codex exec --experimental-json`. It has **no host approval callback**: `approvalPolicy` only passes a config value through. That fails PD-006 and FR-010.9. Host approvals exist only in the separate `codex app-server` JSON-RPC protocol (`item/commandExecution/requestApproval`, `item/fileChange/requestApproval`), which ships with no official TS client package. Revisit Codex as an app-server adapter once FS-009 is stable.

**Rejected as the agent path: VS Code's own APIs.** The Language Model API (`vscode.lm.selectChatModels`/`sendRequest`) is chat completion: Studio would have to build the agent loop, the tools and the file editing itself. The only API that touches agent sessions, `chatSessionsProvider`, is *proposed*. It lets an extension *contribute* a session type to VS Code's chat UI, not start or observe Copilot's agent sessions, and proposed APIs should not be published to the Marketplace. Calling the Copilot CLI directly is subsumed by the SDK, which launches the same runtime.

## 2. Evaluation matrix (versions as of 2026-11-16)

| Criterion | Copilot SDK 1.0.34 | Claude Agent SDK 0.3.325 | Codex SDK 0.169.0 |
|---|---|---|---|
| Runtime | Node `^20.19 \|\| >=22.12` (engines). ESM and CJS exports. | Node `>=18.14`. ESM only. | Node `>=18`. ESM only. |
| How it runs | Spawns the bundled `copilot-runtime` plus `runtime.node` over stdio JSON-RPC. The runtime is copied to `%LOCALAPPDATA%\github-copilot-sdk\runtime`. `koffi` FFI is imported only for the experimental `forInProcess()`. | Spawns the bundled native `claude.exe` (stream-json). Override with `pathToClaudeCodeExecutable` or `spawnClaudeCodeProcess`. | Spawns `codex.exe exec --experimental-json`, writes the prompt to stdin and reads JSONL from stdout. Override with `codexPathOverride`. |
| win32-x64 payload (packed / unpacked) | 82 MB / 211 MB (`runtime.node` alone is 160 MB). | 172 MB / 372 MB. | 187 MB / 515 MB (`codex.exe` 382 MB plus `codex-code-mode-host.exe` 80 MB). |
| Platforms | 8 optional platform packages (win/mac/linux, x64/arm64, musl). | 8 (same matrix). | 6 (no musl tag in optional deps). |
| VSIX implication | Needs a platform-specific VSIX (`vsce package --target`) or use of an existing CLI via `COPILOT_CLI_PATH`. | Same, via `pathToClaudeCodeExecutable`. | Same, via `codexPathOverride`. |
| Auth | Signed-in user (OAuth device flow, keychain), `gitHubToken` (`gho_`, `ghu_`, `github_pat_`; not classic `ghp_`), env `COPILOT_GITHUB_TOKEN`/`GH_TOKEN`/`GITHUB_TOKEN`, `gitHubTokenProvider`, BYOK `provider`. | `ANTHROPIC_API_KEY`, Bedrock, Vertex, Foundry, Claude Platform on AWS. **No claude.ai login for third-party products** without approval. | `apiKey` becomes `CODEX_API_KEY`, or a ChatGPT login cached by the CLI (`~/.codex/auth.json` or keyring). |
| Subscription use by a 3rd party | **Documented**: per-user Copilot subscription via OAuth app. | **Forbidden** unless approved. | **Restricted**: "Sign in with ChatGPT" plan usage is a limited trial for selected partners. |
| Session create / resume | `createSession({sessionId?})`, `resumeSession(id, cfg)`, `listSessions`, `deleteSession`. | `query()` gives `session_id` in `system:init`. `resume`, `continue`, `forkSession`, `sessionId`, `listSessions`, `getSessionMessages`. | `startThread()` gives `thread.started.thread_id`. `resumeThread(id)` (threads live in `~/.codex/sessions`). |
| Streaming | `assistant.message_delta`, `assistant.reasoning_delta`, `assistant.streaming_delta`. | `stream_event` (raw Messages API deltas) when `includePartialMessages: true`. | Item-level only (`item.started/updated/completed`). No token deltas in the SDK types. |
| Tool events | `tool.execution_start` (`toolName`, `arguments`, MCP server fields), `tool.execution_progress`, `tool.execution_partial_result`, `tool.execution_complete` (`success`, `error`, `result`). | `tool_use` / `tool_result` content blocks, `tool_progress`, `tool_use_summary`, PreToolUse/PostToolUse hooks. | Items `command_execution` (`command`, `exit_code`, output), `mcp_tool_call`, `web_search`. |
| File-change events | `tool.execution_complete.fileEdits[]` (**experimental**), `UsageMetricsCodeChanges.filesModified`. | **Derived only**: inputs of the Edit/Write/NotebookEdit tools, PostToolUse hook, `FileChanged` hook. | **Native**: `file_change` item, `changes[{path, kind: add\|delete\|update}]`, `status`. |
| Host approval | `onPermissionRequest` (typed kinds, 7 result kinds), or pending-event mode. `permissionMode: manual\|assisted\|allow-all`. | `canUseTool(toolName, input, {signal, suggestions, blockedPath, decisionReason})` returns allow (with `updatedInput`) or deny (with `interrupt`). `permissionMode` has 6 values. | **None in the SDK.** `approvalPolicy` is passed through as config. App-server only. |
| User-input requests | `onUserInputRequest`, `onElicitationRequest`, `user_input.requested`. | Elicitation hooks, `AskUserQuestion` via the permission path (UNVERIFIED detail). | None. |
| Cancellation | `session.abort()` emits `abort`. `client.stop()` / `forceStop()`. | `abortController`, `interrupt()`, `close()`. | `TurnOptions.signal` is passed to `spawn`, which kills the process. |
| Workspace / cwd | Per-session `workingDirectory`, `trustWorkingDirectory`, `baseDirectory` (sets `COPILOT_HOME`, isolates Studio state). | `cwd`, `additionalDirectories`, `sandbox`, `settingSources`. | `workingDirectory`, `additionalDirectories`, `sandboxMode` (read-only, workspace-write, full). Needs a git repo unless `skipGitRepoCheck`. Windows sandbox helper is bundled. |
| Error behaviour | `session.error{errorType, message, ...}` (`rate_limit`, `quota` sub-codes), `model.call_failure`, `session.warning`. | `assistant.error` from a typed union (`authentication_failed`, `billing_error`, `rate_limit`, `model_not_found`, ...). `result.subtype error_*`. `api_retry`. `auth_status`. | `turn.failed{error.message}`, `error{message}`, non-fatal `error` item. **Untyped strings.** |
| Model selection | `model`, `listModels()`, `setModel()`, `reasoningEffort`. | `model`, `supportedModels()`, `setModel()`. | `model`, `modelReasoningEffort`. No list API in the SDK. |
| MCP / custom tools | `mcpServers`, `tools` / `defineTool`, `availableTools`/`excludedTools`. | `mcpServers`, in-process `createSdkMcpServer()` plus `tool()`. | MCP via CLI config only (`config` overrides). Its calls are visible as `mcp_tool_call`. No in-process tools. |
| Maturity | "Generally available ... semantic versioning". 12 stable releases in 30 days. Has `preview` and `unstable` channels. | 0.x. 21 stable releases in 30 days. | 0.x. 8 stable releases in 30 days, plus an alpha channel. |
| Docs quality | 2,530-line README plus docs/. Generated, commented event types. | Docs site plus a 10.7k-line, heavily commented `sdk.d.ts`. | README of about 150 lines and one ~330-line `d.ts`. App-server docs are separate. |
| Licence | MIT (SDK and platform package). | Proprietary ("SEE LICENSE", Anthropic Commercial Terms). | Apache-2.0 (SDK and CLI). |
| PD-006 fit | Yes | Yes | No (SDK) |

## 3. Provider-neutral capability model (input for FS-009)

Each adapter declares every capability as `native | derived | none`. The UI shows `derived` and `none` honestly (P8, AC-009.4). The values below come from the types inspected:

| Capability | Copilot | Claude | Codex SDK |
|---|---|---|---|
| `start` | native | native | native |
| `cancel` | native (`abort`) | native (`interrupt` / abort) | native (kill via signal) |
| `resume` (PD-007) | native | native | native |
| `streamText` | native | native (opt-in) | none (item-level) |
| `toolEvents` | native | native | native |
| `fileChanges` | native-experimental | derived | native |
| `approvals` | native | native | none |
| `userInput` | native | derived / UNVERIFIED | none |
| `planUpdates` | native (`session.todos_changed`) | derived (TodoWrite tool) | native (`todo_list`) |
| `usage` | native | native (incl. cost estimate) | native (tokens) |
| `modelList` | native | native | none |
| `mcp` / `customTools` | native / native | native / native | config-only / none |
| `typedErrors` | partial (`errorType` string) | native (union) | none |

Proposed interface (sketch): `checkAvailability()`, `getCapabilities()`, `checkAuth()`, `start(runSpec): RunHandle`, `resume(ref)`, `cancel(handle)`, `respondToApproval(id, decision)`, `respondToInput(id, answer)`, plus `onEvent(cb)`, which delivers NormalizedEvent values.

## 4. Normalized event taxonomy (derived, not invented)

Every event carries `{runId, seq, ts, providerId, kind, source: 'provider'|'derived', raw?}`. Unknown provider events map to `provider.unknown` and keep `raw` (AC-012.9). Dedupe by provider event id, or by `uuid`/`item.id` (NFR reliability).

| Normalized kind | Copilot | Claude | Codex SDK | Run status effect (FR-011.2) |
|---|---|---|---|---|
| `session.started{sessionRef}` | `session.start` / `createSession().sessionId` | `system` / `init` (`session_id`, `cwd`, `tools`, `model`) | `thread.started{thread_id}` | Starting, then Running |
| `turn.started` / `turn.completed{usage}` | `assistant.turn_start` / `assistant.turn_end`, `session.idle` | first assistant msg / `result` | `turn.started` / `turn.completed{usage}` | |
| `message.delta` / `message.completed` | `assistant.message_delta` / `assistant.message` | `stream_event` / `assistant` text block | – / `item.completed(agent_message)` | |
| `reasoning` | `assistant.reasoning(_delta)` | thinking block | `item.*(reasoning)` | |
| `tool.started` / `tool.progress` / `tool.completed{ok}` | `tool.execution_start` / `_progress` / `_complete` | `tool_use` / `tool_progress` / `tool_result` | `item.started` / `updated` / `completed` (`command_execution`, `mcp_tool_call`, `web_search`) | |
| `file.changed{path, op, confidence}` | `fileEdits[]` (reported) | Edit/Write input (derived) | `file_change.changes[]` (reported) | |
| `approval.requested` / `approval.resolved` | `permission.requested` / `permission.completed` | `canUseTool` call / its return, `permission_denied` | none | WaitingForApproval |
| `input.requested` / `input.resolved` | `user_input.requested` / `completed`, `elicitation.*` | elicitation hooks | none | WaitingForInput |
| `plan.updated` | `session.todos_changed` / `plan_changed` | TodoWrite `tool_use` | `todo_list` item | |
| `usage` | `assistant.usage`, `session.usage_info` | `result.modelUsage`, `total_cost_usd` | `turn.completed.usage` | |
| `warning` / `retry` | `session.warning` | `api_retry` | `item(error)` | |
| `run.completed` | `session.idle` after the last turn | `result` (`success`) | `turn.completed` | Completed (the Spec is not marked Done, AC-011.8) |
| `run.failed{category}` | `session.error` | `result` (`error_*`), `assistant.error` | `turn.failed`, `error` | Failed |
| `run.cancelled` | `abort` | interrupt / AbortError | process killed by signal | Cancelled |
| `auth.status` | via `session.error` (UNVERIFIED which `errorType`) | `auth_status` | none (stderr) | |

Error categories: `auth`, `quota_or_rate_limit`, `model_unavailable`, `network_or_server`, `runtime_missing` (spawn ENOENT, binary absent), `policy_denied`, `cancelled`, `tool_failure`, `unknown`. Claude maps 1:1 from its union. Copilot maps from `errorType`. Codex maps by string heuristics only (weak).

## 5. Authentication and terms findings

- **Copilot.** Every documented path except BYOK and server-to-server requires an active Copilot subscription *per user*. With the OAuth app, usage is billed to the user's subscription. Billing follows the Copilot CLI model, where each prompt counts toward the allowance. Studio must state that runs consume the user's Copilot allowance (privacy and transparency NFR). Telemetry: set `COPILOT_TELEMETRY_DISABLED=true` and `enableSessionTelemetry: false` unless a product decision says otherwise.
  - Open: whether a token from VS Code's built-in `github` auth provider is accepted. It is a `gho_` token but may lack the needed scopes or client. **UNVERIFIED, PoC item.**
  - Open: whether Copilot Business/Enterprise policies ("managed settings", `managedApprovalRequired`, CLI policy) block SDK use. **UNVERIFIED.**
- **Claude.** Anthropic's docs say: "Unless previously approved, Anthropic does not allow third party developers to offer claude.ai login or rate limits for their products, including agents built on the Claude Agent SDK." The SDK is governed by the Commercial Terms. Branding: "Claude Code" may not be used as a product label.
- **Codex.** The SDK uses either `apiKey` or whatever login the local CLI has cached. Silently reusing a user's ChatGPT login from a third-party product is not covered by any document we found. "Sign in with ChatGPT" plan usage is a "limited trial" for selected commercial partners and open-source partners. Treat ChatGPT-plan auth as not allowed until OpenAI confirms in writing (AC-010.10).
- **Secrets** (all three): keep tokens and keys in VS Code `SecretStorage` and pass them through the SDK's token or env option. Never write them to the workspace or logs. All three CLIs also persist sessions and auth under the user's home directory (`~/.copilot` unless `baseDirectory` is set, `~/.claude`, `~/.codex`). This must go into the retention spec (PD-012).

## 6. Open risks

1. **Payload size.** 82–187 MB packed per platform. A platform-specific VSIX is mandatory if Studio bundles the runtime; otherwise it depends on a user-installed CLI. The Marketplace size limit is UNVERIFIED.
2. **Release velocity.** 8–21 releases in 30 days, plus experimental fields (`fileEdits`). Pin exact versions, put contract tests on adapter mappings, and fail open to `provider.unknown`.
3. **Auth reuse inside VS Code.** Cases: VS Code GitHub session versus device-flow login versus a policy-blocked enterprise seat. Unproven until the PoC.
4. **Recovery (FR-011.7).** All three resume by id from runtime state in the home directory. Whether an *in-flight* turn survives an extension-host restart is UNVERIFIED. Assume `Interrupted` and resume from the next prompt.
5. **File-change attribution (AC-012.5).** Copilot's field is experimental, and Claude's is derived. Mark `confidence` and cross-check with a git diff at run end.
6. **Remote and container workspaces.** The binaries run on the extension host side. Behaviour in WSL, SSH and Dev Containers is UNVERIFIED.
7. **MCP (PD-009).** Not needed for the MVP. All three can add MCP later without an interface change.

## 7. PoC checklist for Gregor (about 15 minutes per candidate, Windows 11)

Use a fresh folder `C:\projects\test\spike002-poc` (a `git init`'d copy of tip-splitter). Use plain `node poc.mjs` first, then repeat step 3 inside an Extension Development Host and log `process.versions.node` / `process.versions.electron`. Write every event as one JSON line to `events-<provider>.jsonl` and send me the files.

**A. Copilot SDK** (`npm i @github/copilot-sdk@1.0.34`)
1. `new CopilotClient()` → `start()` → `listModels()`. Record the error shape when you are not logged in, then log in (`copilot` CLI device flow) and run it again.
2. `createSession({ workingDirectory, permissionMode: "manual", onPermissionRequest })`. The handler logs the request and returns `reject` for `shell` and `approve-once` for `write`.
3. `session.on(e => log(e))` → `send({prompt: "Add a README section 'Usage' and run npm test"})`. Expect `permission.requested` (shell and write), `tool.execution_start/complete`, `fileEdits`, `session.idle`.
4. Second run: call `session.abort()` after 5 seconds. Expect the `abort` event and no further file writes.
5. `resumeSession(id, {...})` in a new process and send "what did you change?". Note the time and the size of `%LOCALAPPDATA%\github-copilot-sdk`.
6. Optional: pass `gitHubToken` taken from `vscode.authentication.getSession('github', ['read:user'], {createIfNone:true}).accessToken`. Does auth succeed?

**B. Claude Agent SDK** (`npm i @anthropic-ai/claude-agent-sdk@0.3.325`, API key only)
1. Run `query()` once with an invalid key and record `assistant.error` / `result`. Then run it with a valid `ANTHROPIC_API_KEY`.
2. Options: `{cwd, permissionMode: "default", includePartialMessages: true, canUseTool}`. Deny `Bash`, allow `Edit`/`Write`. Same prompt as A3.
3. Check for `system:init.session_id`, `stream_event`, the `tool_use` Edit input `file_path`, `permission_denied`, and `result.total_cost_usd`.
4. Call `abortController.abort()` mid-run. Then use `resume: session_id` in a new process.

**C. Codex SDK** (`npm i @openai/codex-sdk@0.169.0`, `apiKey` only)
1. `startThread({workingDirectory, sandboxMode: "workspace-write", approvalPolicy: "on-request"})` → `runStreamed(prompt)`. **Record what happens when an approval is needed** (hang, auto-deny or fail?).
2. Check for the `file_change` item, `command_execution.exit_code` and `turn.completed.usage`. Abort with `AbortController`, then call `resumeThread(id)`.
3. Optional (2 minutes): start `codex app-server`, send `initialize` and `thread/start`, and confirm `item/fileChange/requestApproval` arrives.

Decision rule: A stays first if A2–A5 pass. If A1 or A6 fails for a typical user setup, re-rank Claude (B) first.

## 8. Sources (all retrieved 2026-11-16)

- npm registry: `npm view` and `npm pack` of `@github/copilot-sdk@1.0.34` (plus `-win32-x64`), `@github/copilot@1.0.112`, `@anthropic-ai/claude-agent-sdk@0.3.325` (plus `-win32-x64`), `@openai/codex-sdk@0.169.0`, `@openai/codex@0.169.0-win32-x64`. Files read: `dist/index.d.ts`, `dist/session.d.ts`, `dist/types.d.ts`, `dist/generated/session-events.d.ts`, `dist/runtimeArtifacts.js`, README (Copilot); `sdk.d.ts`, README, LICENSE.md (Claude); `dist/index.d.ts`, `dist/index.js`, README (Codex). https://www.npmjs.com/package/@github/copilot-sdk · https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk · https://www.npmjs.com/package/@openai/codex-sdk
- Copilot SDK repo README (GA, billing, subscription): https://cdn.jsdelivr.net/gh/github/copilot-sdk@main/README.md
- Copilot SDK auth methods: https://docs.github.com/en/copilot/how-tos/copilot-sdk/auth/authenticate
- Copilot SDK GitHub OAuth (per-user subscription, token types): https://docs.github.com/en/copilot/how-tos/copilot-sdk/setup/github-oauth
- Claude Agent SDK overview (claude.ai login restriction, branding, Commercial Terms): https://code.claude.com/docs/en/agent-sdk/overview
- Claude Agent SDK quickstart (bundled binary, auth providers): https://code.claude.com/docs/en/agent-sdk/quickstart
- Codex authentication: https://learn.chatgpt.com/docs/auth (redirected from developers.openai.com/codex/auth)
- Codex app-server (approvals, login methods): https://learn.chatgpt.com/docs/app-server (redirected from developers.openai.com/codex/app-server)
- Sign in with ChatGPT (limited trial): https://developers.openai.com/siwc/quickstart
- VS Code Language Model API: https://code.visualstudio.com/api/extension-guides/ai/language-model
- VS Code proposed API policy: https://code.visualstudio.com/api/advanced-topics/using-proposed-api
- `chatSessionsProvider` proposed d.ts (mirror): https://cdn.jsdelivr.net/npm/@codingame/monaco-vscode-api@30.0.1/vscode-dts/vscode.proposed.chatSessionsProvider.d.ts
- VS Code platform-specific extensions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- Not retrievable: https://help.openai.com/en/articles/20001542 ("Using your ChatGPT plan in other apps"). The fetch failed, so its content is UNVERIFIED.
