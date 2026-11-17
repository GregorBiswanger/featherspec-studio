# Focus the Studio on Visibility: No Agent Runs, a Named Next Step

**Status:** Draft
**Plan:** _none yet_

Basis: Gregor's request of 2026-11-17 after working on `sdd-tip-splitter` with GitHub Copilot
next to the Studio. Decisions ([product-decisions.md](../../docs/product/product-decisions.md)):
PD-055 (on Gregor's delegation), PD-056 (proxy, A-001), PD-016 (English UI), PD-013 (read-only).
Retires 0008–0012; amends 0003–0007 and 0013 (§5). The removed code stays reachable at Git tag
`archive/agent-runs-2026-11-17` (commit dd6a6b5).

## 1. Summary

The Studio stops starting, driving and recording agent runs. The Agent Center, the start
workflow, the providers, the orchestrator and everything that serves only them leave the
product. The Studio is the view on FeatherSpec artifacts — Mission Control, Spec Board, Spec
Explorer with the detail — plus the setup of 0014. In place of the start, it names each spec's
**next FeatherSpec step** as a line the user copies into the AI assistant of their choice.

## 2. Goal and problem

The Agent Center confused its first user: it showed "No runs yet" while Copilot worked in the
VS Code chat. FeatherSpec works in small steps with the human in the conversation (red test,
approval, green); a background run cannot hold that conversation. VS Code manages agent
sessions itself (Agent Host, Agents window, Inbox) for Copilot, Claude and Codex, and the
Studio's run path served one provider on a path VS Code is leaving (PD-055). Goal: a Studio
that shows where every spec stands and what to do next, works with every assistant, and holds
no code, setting, text or stored data for runs. Accepted when Gregor's Hands-On on
`tip-splitter` passes with the next-step lines (AC-030).

## 3. Users and roles

Developer (one role, as in 0001–0007). The user's AI assistant (Copilot, Claude Code or any
other that runs FeatherSpec commands) receives the copied line; the Studio never talks to it.

## 4. Scope

### In scope

- Removal of the parts named in §7 and the end states of the specs in §5.
- The next step (§6) in the detail view and on an accepted Ready → Active request.
- What remains of the runtime store (§6.3) and the removal of earlier builds' run data.
- The product texts of §8; README, CHANGELOG, docs, architecture snapshot and maps, Memory Bank.

### Out of scope

- Opening, filling or driving a chat (Copilot, Claude Code, any other) — because the Studio
  stays assistant-neutral and the human runs the step (PD-056); copying is the hand-over.
- Observing, listing or starting sessions of VS Code's Agent Host or Agents window — because
  VS Code offers that natively and names no extension API for it (VS Code 1.144 and 1.146
  release notes, retrieved 2026-11-17).
- A replacement "software factory" or "dark factory" (unattended runs of several steps) —
  because it removes the human from FeatherSpec's step-by-step loop (PD-055).
- Migrating run data of earlier builds into any other form — because no remaining view reads
  it (§6.3); it is removed, not converted.
- Removing values of removed settings from the user's `settings.json` — because the Studio
  never writes user settings; VS Code marks unknown settings itself.
- The next step on cards or Mission Control rows — because PD-056 names the detail and the
  drop; not now (OP-003).
- Editing the PD register's earlier entries — because the register is history; PD-055
  supersedes them where they conflict.

## 5. End states and amendments of other specs

The plan applies these edits in the implementing change set: retirement through
`/sdd-lifecycle` (each Deprecated spec stays in `done/`, links `0015-focus-on-visibility.md` as
successor, gets a dated abandonment line in `## Plan history`; archived plans stay frozen), and
amendments in place as inline notes "*Amended by 0015 (PD-055/PD-056): …*", as 0014 did.

| Spec | End state |
| --- | --- |
| 0008 start workflow, 0009 provider abstraction, 0010 Copilot provider, 0011 orchestrator, 0012 Agent Center | `Deprecated`, successor 0015 — every behaviour removed |
| 0004 runtime store | Stays `Implemented`, narrowed to the spec status history (§6.3): its run, event and masking parts are void |
| 0003, 0005, 0006, 0007, 0013 | Stay `Implemented`; statements below change |
| 0014 | No statement changes; its §5 sentence naming 0006–0008 and 0012 stays as history |

| Spec · statement | Amendment |
| --- | --- |
| 0003 §1 and FR-08 "three status dimensions … agent run" | Two dimensions: spec lifecycle and verification |
| 0003 §2, §3, §10 references to 0008 and 0011; §4 out-of-scope bullet "Provider availability …" | Void. The consumer of an accepted request is the board (0007), which shows the next step |
| 0003 §5 step 5 "0008 then runs its own start checks…"; §6.4 "returned to the caller (0008)" | The board shows the next step (AC-006); the verdict still changes no state |
| 0003 §6.1 "never change because of agent run states" | "…never change because of the verification status" |
| 0003 §6.2 "The explicit start confirmation in 0008 (PD-002) is the plan approval" | Plan approval stays with the human in the assistant: FeatherSpec's explicit start signal (`/sdd-plan`). Ready still waits for no approval mark |
| 0003 AC-006 | Void (no runs) |
| 0003 AC-007, AC-010, AC-018 | Drop "or a run of it is Completed", "and agent runs", "and run state" |
| 0004 BR-001, BR-002, BR-004–BR-007, BR-011; §5 steps 2–5; §8 Run and Event envelope; §9 masking | Void. BR-008: only the spec status history age cap remains, fixed at 90 days; no Clear command. BR-009: a reader window refuses status history appends only |
| 0004 AC-002–AC-008, AC-010, AC-011, AC-013–AC-015, AC-019, AC-022, AC-027–AC-030 | Void |
| 0004 AC-009, AC-016, AC-017, AC-018, AC-020, AC-021, AC-023 | Read for the spec status history only; AC-018 without "another value"; AC-020 without masking and Clear; AC-023 without run writes, classification and Clear |
| 0005 §1, §4, §9, BR-07, AC-004, AC-005, AC-006, AC-028 | Three areas, three per-area commands; navigation targets are a spec or a board filter, no run; Agent Center purpose void; Mission Control purpose per §8 |
| 0005 §9 tree and PD-054 icons | Three entries and icons (gauge, board layout, list tree); no robot |
| 0005 §11, S7, AC-017 | S7 note text per §8 |
| 0005 §4 out-of-scope "Agent Center content", A-004 | Void |
| 0006 §1 run bullet; BR-01 (b) and (c); BR-03, BR-05, BR-06; run rows of BR-08 and BR-09; §9 run section; §13 run cases | Void. *Needs attention* has the reasons Blocked, Diagnostic, Review pending |
| 0006 BR-07, AC-010 | *Recent activity* takes the spec status history entries only |
| 0006 AC-005–AC-007, AC-011, AC-013, AC-026, AC-027 | Void |
| 0006 AC-008, AC-015–AC-018, AC-021, AC-024, AC-028 | Drop the run parts; AC-017's time is the last spec read or status history change; AC-018: when the status history is not available, *Recent activity* shows "not available" with the reason and everything else is unchanged; AC-024 fixture without runs |
| 0007 §6.3, FR-04, AC-007, A-001; run lines of §6.8 and §13 | Void (no run on the card) |
| 0007 §6.5, FR-06, AC-022 | Filters by state and named spec set; no provider filter, no "No run" |
| 0007 §6.4, AC-010, AC-027 | Section "Agent history" becomes "Status history": the 0003 history under its label; *not available* while the history is |
| 0007 §6.6, FR-09, AC-015; §6.7 and AC-018 "hand-off to the start workflow" | An accepted Ready → Active request shows the next step (AC-006); announced as such |
| 0007 AC-018, AC-019 | Drop "run status" and "run-event notification" |
| 0013 §2 "four areas", §3.2 run panel, §3.3 card run status, AC-007, AC-017, A-005; out-of-scope "Agent Center content" | Three areas; *Recent activity* alone below the attention list; no run status on cards; no Agent Center screenshot; "Status history" |

## 6. Business rules

### 6.1 Next step

**Paths** are project-relative with `/`. **Spec path** is the entry's key; **plan path** its
sibling plan. A next step is one line or two ordered lines ("then …"), each copyable on its own.
The rules use only what 0002 and 0003 deliver; first match wins, top-down:

| Rule | Entry (0003 state and facts) | Line(s) |
| --- | --- | --- |
| NS-1 | the spec file cannot be read (0002 diagnostic) | none; text "Studio cannot read this spec. See its diagnostics." |
| NS-2 | lifecycle contradiction (0003 §6.3) or duplicate diagnostic | `/sdd-lifecycle <spec path>` |
| NS-3 | Done (Deprecated and Baseline included) | none; text "Done — no FeatherSpec step left." |
| NS-4 | Blocked | `/sdd-plan <spec path>` with a sibling plan, else `/sdd-overview` |
| NS-5 | Review | `/sdd-compile <spec path>`; then, after a READY verdict, `/sdd-lifecycle <spec path>` |
| NS-6 | Active | `/sdd-plan <spec path>` |
| NS-7 | Ready | `Start <ID> of <plan path>` — ID of the plan's first step that is neither ticked nor struck; `Implement <plan path>` where 0002 delivers no such step |
| NS-8 | Backlog, R-2 fails (no criterion) | `/sdd-specify <spec path>` |
| NS-9 | Backlog, no sibling plan | `/sdd-clarify <spec path>`; then `/sdd-plan <spec path>` |
| NS-10 | Backlog, any other | `/sdd-plan <spec path>` |

Basis: FeatherSpec 1.10.0 command files. `/sdd-plan` resumes an existing plan (Mode B:
integrates return notes, reports what blocks), writes a fresh one for a reactivated spec
(Mode C) and names "start T-001" and "implement" as the start signal that also performs the
backlog → active move; `/sdd-compile` is the check of a Review spec; `/sdd-lifecycle` owns
moves, status and duplicate resolution; `/sdd-specify` revises a named spec; the flow puts
`/sdd-clarify` before `/sdd-plan`. Whether `/sdd-clarify` already ran and the `/sdd-compile`
verdict are not persisted, so NS-9 and NS-5 name both lines.

### 6.2 Drop from Ready onto Active

0003 judges every move request as before. An accepted Ready → Active request (drag, "Move
to…", command) starts nothing, moves no file and leaves the card in Ready; the board shows the
NS-7 step where it shows a move result today. Every refusal stays as 0007 defines it.

### 6.3 Runtime store

Rule: only what a remaining behaviour needs stays. Survey of 2026-11-17: Mission Control's
*Recent activity* and the detail's *Status history* read the spec status history (0003 §6.5);
the lifecycle model appends it in the writer window. Nothing else reads the store. So the store
keeps the status history, keyed by project root, outside every workspace folder, with one
writer, its store state, cut-off-record tolerance, refusal of newer format versions and a fixed
90-day age cap. Masking, runs, events, the size cap and the Clear command go.

Run data of earlier builds is **removed, not migrated or left behind**: run records, events and
Copilot's session folder (`copilot-home`) can hold prompts, file contents and command output,
and with the Agent Center and "Clear Run History" gone nothing would show or clear them.
Status history entries of earlier builds stay and are read. The removal touches only the
extension's own global storage and the workspace-state key `featherspec-studio.agentCenter`.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-01 | Three areas; no Agent Center | AC-001, AC-002 |
| FR-02 | Name and copy the next step | AC-003–AC-005, AC-007–AC-009 |
| FR-03 | Accepted Ready → Active shows the next step, starts nothing | AC-006 |
| FR-04 | Views without runs | AC-010–AC-012 |
| FR-05 | Store keeps only the status history; earlier run data removed | AC-013, AC-023, AC-024 |
| FR-06 | Commands, settings, dependencies, processes, network, source, tests, docs of runs gone | AC-014–AC-022, AC-025, AC-026 |
| FR-07 | No quality loss; specs and architecture consistent | AC-027–AC-030 |

## 8. Product texts (proposals, English per PD-016; Gregor can overrule)

- **Manifest description:** "Visual command center for spec-driven development with
  FeatherSpec: see every spec, know its next step." Keywords drop `agents` and `github copilot`.
- **README opening:** "A VS Code panel for projects that use FeatherSpec … Studio reads your
  specs, plans and Memory Bank, shows where every spec stands, and names each spec's next
  FeatherSpec step, ready to paste into the AI assistant you work with — GitHub Copilot, Claude
  Code or any other." Second paragraph: "Studio reads your project and starts no agent; the
  work with your agent stays in your assistant's chat. The one exception to read-only is Set up
  FeatherSpec, which you start and confirm yourself." The sections "Agent Center", "Starting an
  agent", the provider settings and the Copilot privacy and requirement lines go.
- **Mission Control purpose:** "See the project at a glance: spec counts, progress, what needs
  attention and recent activity." Spec Board and Spec Explorer purposes unchanged.
- **S7 note:** "This workspace is in Restricted Mode. Setting up FeatherSpec is unavailable."
- **Reader reason:** "Another VS Code window holds the write lock for this project's status history."
- **Detail:** heading "Next step"; per line a "Copy" button; after copying "Copied to the clipboard."
- **Drop result:** "Studio starts no agent. Next step for <number> — paste it into your AI assistant:" plus the line and "Copy".

## 9. Error cases and edge cases

- Clipboard write fails → "Could not copy to the clipboard." and nothing else changes.
- The spec changes between showing and copying → Copy copies the line shown; the view updates.
- Restricted Mode, reader window → next step and Copy work unchanged (they run nothing).
- Removal of earlier run data fails (file held open) → the Studio works on, writes one line to
  the Output channel "FeatherSpec Studio" and tries again at the next activation.
- A remembered area `agentCenter` or an Agent Center target from an earlier panel state → Mission
  Control (0005 BR-02), no error.

## 10. Acceptance criteria

Decided by automated tests unless marked manual. "Search" means a case-insensitive text search
of the named files; tests included unless said otherwise.

- **AC-001** The system shall offer exactly the areas Mission Control, Spec Board and Spec Explorer, in this order, in the panel navigation, the Activity Bar tree and as per-area commands.
- **AC-002** If the remembered area or a restored panel state names `agentCenter`, then the system shall show Mission Control and no error.
- **AC-003** While a spec is selected, the detail view shall show "Next step" above its sections with the line(s) of the first matching rule NS-1…NS-10, each with a "Copy" button, or the rule's text where it names no line.
- **AC-004** The system shall derive the next step only from the model of 0002 and 0003; for identical snapshots it shall show identical lines. One fixture per rule decides the rule ID and the exact lines.
  > **Given** `.specs/backlog/0007-x.md` is Ready and its plan's first step is `T-001` **When** it is selected **Then** the line reads `Start T-001 of .specs/backlog/0007-x.plan.md`.
- **AC-005** When the developer activates "Copy", the system shall put exactly that line on the clipboard and show and announce "Copied to the clipboard."
- **AC-006** When 0003 accepts a Ready → Active request, the board shall start no process, reach no network, change no file, leave the card in Ready, and show and announce the drop result of §8 with the NS-7 line and "Copy".
- **AC-007** When the model changes, the system shall show the new next step within 500 ms (PD-047).
- **AC-008** While the workspace is in Restricted Mode or the window is a reader, the system shall show the same next step and Copy shall work.
- **AC-009** If writing the clipboard fails, then the system shall show "Could not copy to the clipboard."
- **AC-010** Mission Control shall show no run figure, run section or run-based reason; *Needs attention* shall carry only Blocked, Diagnostic and Review pending; *Recent activity* only spec status history entries; no element shall send a request for an area outside AC-001.
- **AC-011** The board card shall show no run line and the filters shall offer board state and named spec set only.
- **AC-012** The detail view shall show a "Status history" section with 0003's history under its label, *not available* with the reason while the history is not available, and no run list.
- **AC-013** The runtime store shall write only the spec status history, its lock and its format marker; a contract test lists the files of a store folder after every scenario.
- **AC-014** The manifest shall contribute no command `openAgentCenter`, `clearRunHistory`, `stopRun` or `resumeRun` and no command title containing "Agent", "Run History", "Stop Run" or "Resume Run".
- **AC-015** The manifest shall declare no configuration property.
- **AC-016** The manifest description shall read as §8 and contain neither "agent" nor "Copilot"; the keywords shall not contain `github copilot`.
- **AC-017** `package.json` and `package-lock.json` shall not contain `@github/copilot-sdk`; the esbuild externals shall be `vscode` only.
- **AC-018** `dist/extension.js` shall contain no `child_process` and no `@github/copilot-sdk`; `dist/webview/main.js` shall contain no "Agent Center".
- **AC-019** A search of `src` without test files shall find no `child_process`, `worker_threads`, `createTerminal`, `ShellExecution`, `ProcessExecution` and `executeTask`.
- **AC-020** A search of `src` without test files for `fetch(`, `node:http`, `node:https`, `node:net`, `node:tls` and `WebSocket` shall find only the release adapter of 0014.
- **AC-021** The folders `src/core/{agentCenter,agentStart,orchestrator,providers}`, `src/adapters/providers` and `src/webview/{areas/agentCenter,agentStart}` shall not exist, nor `test/fixtures/copilot`, and a search of `src`, `.vscode-test.mjs`, `esbuild.js` and `package.json` shall find none of `agentcenter`, `agent center`, `agentstart`, `orchestrator`, `copilot`, `fakeprovider`, `agentprovider`, `runhistory`, `stoprun`, `resumerun`, `waitingforapproval` — except in the earlier-data removal module (it names `copilot-home` and the `agentCenter` state key) and in the tests that decide AC-002, AC-014–AC-021 and AC-023.
- **AC-022** The host test suite shall contain no `agentCenter`, `agentStart`, `copilot`, `orchestrator` or `providers` smoke test and no opt-in Copilot runner.
- **AC-023** When this build activates, the system shall remove from the extension's global storage the folder `copilot-home` and in every project folder `index.json` and `runs/`, and the workspace-state key `featherspec-studio.agentCenter`; it shall keep `spec-status-history.jsonl` byte-identical and read its entries.
  > **Given** a global storage written by the build at tag `archive/agent-runs-2026-11-17` **When** this build activates **Then** only the status history, lock and format files remain and *Recent activity* shows the old entries.
- **AC-024** If that removal fails, then the system shall keep working, write one Output channel line naming the path and retry at the next activation.
- **AC-025** `media/screenshots/agent-center-dark.png`, `docs/agent-provider-port.md` and `docs/security/secret-patterns.md` shall not exist; a search of `README.md`, `docs/release-checklist.md` and `docs/runtime-data.md` shall find no "Agent Center", "provider", "Copilot", "Clear Run History", "Stop Run" or "Resume Run"; `docs/runtime-data.md` shall describe the status history, the earlier-data removal and deletion by hand; ADR-003 shall carry the status *Superseded (PD-055)*.
- **AC-026** The S7 note, the reader reason and the Mission Control purpose shall read as §8.
- **AC-027** Every test at tag `archive/agent-runs-2026-11-17` that decides a criterion of 0001–0007, 0013 or 0014 not voided in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every removed title with its voided criterion.
- **AC-028** 0008–0012 shall have status `Deprecated`, stay in `done/` and link this spec as successor; 0003–0007 and 0013 shall carry the amendment notes of §5.
- **AC-029** The `architecture:` snapshot in `AGENTS.md`, `.architecture/*.md` and `.memory-bank/projectbrief.md` shall name no removed module and no agent run; the brief's mission shall match §8.
- **AC-030** *(manual, Gregor)* M-1 on `tip-splitter` with the assistant he uses, the Hands-On walkthrough: three areas; a dropped Ready spec shows the NS-7 line, pasted into the chat it starts that step; Active and Review specs show NS-6 and NS-5 lines that the assistant runs as FeatherSpec commands. Pre-release checklist item.

## 11. Technical notes for developers or AI agents

- As-is (dd6a6b5): runs reach the views through `src/core/board/{runs,boardService,detail}.ts`,
  `src/core/missionControl/{runFigures,runSource,activity}.ts`; the status history through
  `RuntimeStore.appendSpecStatusEntry`/`readSpecStatusHistory` and `src/core/lifecycle/statusHistory.ts`.
  Move results go through `MoveResultSink` and `src/webview/board/Announcer.tsx`; the refusal
  "Agent start is not available yet" (`AGENT_START_UNAVAILABLE_TEXT`) goes. Clipboard via the
  host (`vscode.env.clipboard`), as 0014's "Copy merge prompt".
- Removing files and the earlier-data removal are Ask-first steps (AGENTS.md); Gregor delegated
  the decision (PD-055), the plan still names them. `/sdd-architecture-update` runs in the same
  change set. Memory Bank, CHANGELOG and the release checklist are updated there too.

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | PD-056 holds: a next step as copyable text, in the detail and on the drop — to be confirmed by Gregor, non-blocking | Proxy decision on his delegation; matches 0014's "Copy /sdd-setup" | §6.1, AC-003–AC-009 change |
| A-002 | Copilot and Claude Code both run the slash lines with a path argument | Both read `.claude/commands` or `.github/prompts` loaders; argument hints take a path | NS lines need another form |
| A-003 | Only Gregor and testers ran earlier builds (0.1.0 is unpublished) | Release checklist still open | A published build would need a CHANGELOG notice on the removal |

## 13. Open points

- OP-001 Status history retention fixed at 90 days with no setting and no Clear command. Recommendation: keep; reopen when a user asks.
- OP-002 Multi-root workspaces: the lines carry project-relative paths. Recommendation: keep; Gregor checks in M-1 whether his assistant resolves them, else prefix the folder name.
- OP-003 Next step on cards or attention rows. Recommendation: not now; the detail is one click away.
- OP-004 ADR-003 and `docs/decisions/poc-copilot-2026-11-17/` stay as superseded history. Recommendation: keep.

## 14. Definition of Ready / Done

Ready: goal, scope, rules NS-1…NS-10, removal list and amendments are stated; A-001 is open but
not blocking. Done: AC-001–AC-029 green with evidence in the plan, AC-030 checked by Gregor,
§5 applied, no out-of-scope behaviour added, `/sdd-compile` READY.

## 15. Recommended next steps

`/sdd-clarify .specs/backlog/0015-focus-on-visibility.md` in a fresh session, then `/sdd-plan`.
