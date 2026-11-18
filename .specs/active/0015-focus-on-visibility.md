# Focus the Studio on Visibility: No Agent Runs, a Named Next Step

**Status:** In Progress
**Plan:** [0015-focus-on-visibility.plan.md](0015-focus-on-visibility.plan.md)

*Amended by 0018 (PD-062): §8 purpose, AC-001 and AC-002: the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*

*Amended by 0018 (PD-062): wherever this spec names Mission Control or the Spec Board as a place, read Overview or Board; the rows of 0018 §5 change behaviour.*

*Amended by 0017 (PD-060/PD-061): every other statement, criterion, note or open point of this spec about drag and drop, "Move to…", the move command, move requests, the board-requested transition check, an accepted Ready → Active request or the drop result is void; a sentence that also says something else keeps that part.*

Basis: Gregor's request of 2026-11-17 after working on `sdd-tip-splitter` with GitHub Copilot
next to the Studio. Decisions ([product-decisions.md](../../docs/product/product-decisions.md)):
PD-055 (on Gregor's delegation), PD-056 (proxy, A-001), PD-057 (open points, proxy), PD-016 (English UI),
PD-013 (read-only).
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
  *Amended by 0017 (PD-060/PD-061): "and on an accepted Ready → Active request" is void (PD-060); cards and rows show the next step (0017).*
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
  *Amended by 0017 (PD-060/PD-061): void: cards and rows show the next step (PD-060, 0017).*
- Editing the PD register's earlier entries — because the register is history; PD-055
  supersedes them where they conflict.

## 5. End states and amendments of other specs

The plan applies these edits in the implementing change set: retirement through
`/sdd-lifecycle` (each Deprecated spec stays in `done/`, links `0015-focus-on-visibility.md` as
successor, gets a dated abandonment line in `## Plan history`; archived plans stay frozen), and
amendments in place as inline notes "*Amended by 0015 (PD-055/PD-056): …*", as 0014 did.

**Catch-all (one note at the head of each amended spec):** every other statement, requirement,
criterion, term, assumption or open point of 0003–0007 and 0013 about agent runs, run events,
providers, approvals, the Agent Center, the start workflow, the Clear command or specs 0008–0012
is void; a sentence that also says something else keeps that part. The rows name what changes
in meaning or needs a replacement.

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
| 0003 §6.5 "Kept per PD-012 and PD-027", "cleared" | Kept by the fixed 90-day age cap (0004 BR-008 as amended); no Clear |
| 0003 AC-006 | Void (no runs) |
| 0003 AC-007, AC-010, AC-018 | Drop "or a run of it is Completed", "and agent runs", "and run state" |
| 0004 BR-001, BR-002, BR-004–BR-007, BR-011; §5 steps 3–5; §8 Run and Event envelope; §9 masking | Void. §5 step 2: the writer applies the age cap to the status history. BR-008: only the spec status history age cap remains, fixed at 90 days; no Clear command. BR-009: a reader window refuses status history appends and the age cap |
| 0004 AC-002–AC-008, AC-010, AC-011, AC-013–AC-015, AC-019, AC-022, AC-027–AC-030 | Void |
| 0004 AC-009, AC-016, AC-017, AC-018, AC-020, AC-021, AC-023 | Read for the spec status history only; AC-018 without "another value"; AC-020 without masking and Clear; AC-023 without run writes, classification and Clear |
| 0005 §1, §4, §5 step 7, §6 terms, §9, BR-07, AC-004, AC-005, AC-006, AC-028 | Three areas, three per-area commands; navigation targets are a spec or a board filter, no run; Agent Center purpose void; Mission Control purpose per §8 |
| 0005 §9 tree and PD-054 icons | Three entries and icons (gauge, board layout, list tree); no robot |
| 0005 §11, S7, AC-017 | S7 note text per §8 |
| 0005 §4 out-of-scope "Agent Center content", A-004 | Void |
| 0006 §1 run bullet; BR-01 (b) and (c); BR-03, BR-05, BR-06; BR-08 rows *Running* figure and highlighted run; BR-09 table: the run values of its second row and the sentence after the table; §9 layout's run section and in-area row "no runs stored"; §13 run cases | Void. *Needs attention* has the reasons Blocked, Diagnostic, Review pending; BR-09's second row keeps *Recent activity* |
| 0006 BR-07, AC-010 | *Recent activity* takes the spec status history entries only |
| 0006 AC-005–AC-007, AC-011, AC-013, AC-026, AC-027 | Void |
| 0006 AC-008, AC-015–AC-018, AC-021, AC-024, AC-028 | Drop the run parts; AC-016: the model-changed notification only; AC-017's time is the last spec read the dashboard processed; AC-018: when the status history is not available, *Recent activity* shows "not available" with the reason and everything else is unchanged; AC-024 fixture without runs |
| 0007 §6.3, FR-04, AC-007, A-001; run lines of §6.8 and §13 | Void (no run on the card) |
| 0007 §6.5, FR-06, AC-022 | Filters by state and named spec set; no provider filter, no "No run" |
| 0007 §6.4, AC-010, AC-027 | Section "Agent history" becomes "Status history": the 0003 history under its label; *not available* while the history is. AC-010's list adds "Next step" above the sections (AC-003) |
| 0007 §6.6, FR-09, AC-015; §6.7 and AC-018 "hand-off to the start workflow"; §13 rows "Ready → Active before 0008 exists" and "… in Restricted Mode, in a reader window, or with a run active" | An accepted Ready → Active request shows the next step (AC-006), in Restricted Mode and a reader window too (AC-008); announced as such |
| 0007 FR-10, §12, AC-018, AC-019 | Drop "run status", "run events" and "run-event notification" |
| 0013 §2 "four areas", §3.2 run panel, §3.3 card run status, AC-007, AC-016, AC-017, A-005; out-of-scope "Agent Center content" | Three areas; *Recent activity* alone below the attention list; no run status on cards; AC-016 excepts the tests AC-027 removes; no Agent Center screenshot; "Status history" |

## 6. Business rules

### 6.1 Next step

**Paths** are project-relative with `/`. **Spec path** is the entry's key; **plan path** its
sibling plan. A next step is one line or two ordered lines ("then …"), each copyable on its own.
The rules use only what 0002 and 0003 deliver; first match wins, top-down:

| Rule | Entry (0003 state and facts) | Line(s) |
| --- | --- | --- |
| NS-1 | the spec file cannot be read (0002 diagnostic) | none; text "Studio cannot read this spec. See its diagnostics." |
| NS-2 | lifecycle contradiction (0003 §6.3), or duplicate diagnostic for the same stem in two folders | `/sdd-lifecycle <spec path>` |
| NS-11 | duplicate diagnostic: its number is used by another slug | none; text "Another spec uses number <number>. FeatherSpec has no command for this: rename one spec by hand." |
| NS-3 | Done (Deprecated and Baseline included) | none; text "Done — no FeatherSpec step left." |
| NS-4 | Blocked | `/sdd-plan <spec path>` with a sibling plan, else `/sdd-overview` |
| NS-5 | Review | `/sdd-compile <spec path>`; then, after a READY verdict, `/sdd-lifecycle <spec path>` |
| NS-6 | Active | `/sdd-plan <spec path>` |
| NS-7 | Ready | `Start <ID> of <plan path>` — ID of the first step, in plan order, that 0002 reports neither ticked nor struck (an undetermined tick counts as not ticked); `Implement <plan path>` where there is none |
| NS-8 | Backlog, R-2 fails (no criterion) | `/sdd-specify <spec path>` |
| NS-9 | Backlog, no sibling plan | `/sdd-clarify <spec path>`; then `/sdd-plan <spec path>` |
| NS-10 | Backlog, any other | `/sdd-plan <spec path>` |

*Amended by 0017 (PD-060/PD-061): NS-6 per 0017 §6.2: a second line "continue" under "Then, in the same chat, if nothing blocks:" while the plan has an open step.*

*Amended by 0016 (PD-059, proxy): §6.1 NS-1 — reads as 0016 T-18.*

NS-11 sits below NS-2 in the order; IDs are stable, not ordinal. Basis: FeatherSpec 1.10.0
command files. `/sdd-plan` resumes an existing plan (Mode B: integrates return notes, reports
what blocks), writes a fresh one for a reactivated spec (Mode C) and names "start T-001" and
"implement" as the start signal that also performs the backlog → active move — phrases, not
commands; the plan path lets a fresh chat find the plan. `/sdd-compile` checks a Review spec;
"READY" includes `READY (manual items: n)`. `/sdd-lifecycle` owns moves, status and same-name
duplicates; FeatherSpec has no command for a number used twice (NS-11). `/sdd-specify` revises
a named spec; the flow puts `/sdd-clarify` before `/sdd-plan`. Whether `/sdd-clarify` ran and
the `/sdd-compile` verdict are not persisted, so NS-9 and NS-5 name both lines.

### 6.2 Drop from Ready onto Active

*Amended by 0017 (PD-060/PD-061): §6.2 is void (PD-060).*

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
Copilot's session folder can hold prompts, file contents and command output, and with the Agent
Center and "Clear Run History" gone nothing would show or clear them. At every activation,
before the store opens, in any window, Studio removes what exists of: `copilot-home/` in the
extension's global storage; in every project folder `featherspec-studio/projects/<id>/` there,
`index.json`, its leftover `index.json.tmp-*` copies and `runs/`; the workspace-state key
`featherspec-studio.agentCenter` of the workspace open in this window. A path already gone
counts as removed (another window, or an older build still open, may act in between).
Never touched: any workspace folder; anything outside the extension's global storage (the
user's own Copilot CLI data included); `store.json`, `lock.json` and `spec-status-history.jsonl`
(its entries are read; only the age cap prunes them); a project folder whose `store.json`
names a format version this build does not know (0004 AC-017). With the store location
unavailable (0004 AC-025) nothing is removed. When it removed anything, Studio writes one line to
the Output channel "FeatherSpec Studio" naming what it removed; nothing removed, no line (PD-057).

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

*Amended by 0017 (PD-060/PD-061): FR-03 is void (PD-060).*

## 8. Product texts (proposals, English per PD-016; Gregor can overrule)

- **Manifest description:** "Visual command center for spec-driven development with
  FeatherSpec: see every spec, know its next step." Keywords drop `agents`, `ai agents` and
  `github copilot`.
- **README opening:** "A VS Code panel for projects that use FeatherSpec … Studio reads your
  specs, plans and Memory Bank, shows where every spec stands, and names each spec's next
  FeatherSpec step, ready to paste into the AI assistant you work with — GitHub Copilot, Claude
  Code or any other." Second paragraph: "Studio reads your project and starts no agent; the
  work with your agent stays in your assistant's chat. The one exception to read-only is Set up
  FeatherSpec, which you start and confirm yourself." The sections "Agent Center", "Starting an
  agent", the provider settings and the Copilot privacy and requirement lines go.
- **Mission Control purpose:** "See the project at a glance: spec counts, progress, what needs
  attention and recent activity." Spec Board and Spec Explorer purposes unchanged.
- **S7 note:** "This workspace is in Restricted Mode. Setting up FeatherSpec needs a trusted
  workspace." (0014 AC-004's wording; the button stays offered and refuses.)
- **Reader reason:** "Another VS Code window holds the write lock for this project's status history."
- **Detail:** heading "Next step"; per line a "Copy" button; a second line under "Then:" (NS-9)
  or "Then, after a READY verdict:" (NS-5); after copying "Copied to the clipboard."
  *Amended by 0016 (PD-059, proxy): §8 Detail — Copy is primary; its feedback appears at the button (0016 §6.5, T-19), not as a line below.*
  *Amended by 0017 (PD-060/PD-061): the label under the second line reads "Then, in the same chat, if nothing blocks:" (0017 §6.2).*
- **Drop result:** "Studio starts no agent. Next step for <number> — paste it into your AI assistant:" plus the line and "Copy".
  *Amended by 0016 (PD-059, proxy): §8 Drop result — Copy is primary, Dismiss secondary (0016 §6.5, T-19).*
  *Amended by 0017 (PD-060/PD-061): void (PD-060).*

## 9. Error cases and edge cases

- Clipboard write fails → "Could not copy to the clipboard." and nothing else changes.
  *Amended by 0016 (PD-059, proxy): §9 first bullet — the failure text shows at the Copy button (0016 §6.5, T-19).*
- The spec changes between showing and copying → Copy copies the line shown; the view updates.
- Restricted Mode, reader window → next step and Copy work unchanged (they run nothing).
- A path of the earlier-data removal cannot be removed (file held open) → AC-024.
- A remembered area `agentCenter` or an Agent Center target from an earlier panel state → Mission
  Control (0005 BR-02), no error.

## 10. Acceptance criteria

Decided by automated tests unless marked manual. "Search" means a case-insensitive text search
of the named files; tests included unless said otherwise. **Test files:** `*.test.ts`,
`*.test.tsx`, everything below `src/test/` and every `testing/` folder.

- **AC-001** The system shall offer exactly the areas Mission Control, Spec Board and Spec Explorer, in this order, in the panel navigation, the Activity Bar tree and as per-area commands.
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
- **AC-002** If the remembered area or a restored panel state names `agentCenter`, then the system shall show Mission Control and no error.
  *Amended by 0018 (PD-062): the areas are Overview (`overview`, default) and Board (`board`) with the commands and purposes of 0018 §6.4 and §7; a remembered area this version does not know shows the Overview with no selection (0018 AC-001, AC-002).*
- **AC-003** While a spec is selected, the detail view shall show "Next step" above its sections with the line(s) of the first matching rule of §6.1, each with a "Copy" button and a second line under its §8 label, or the rule's text where it names no line.
- **AC-004** The system shall derive the next step only from the model of 0002 and 0003; for identical snapshots it shall show identical lines. One fixture per rule decides the rule ID and the exact lines.
  > **Given** `.specs/backlog/0007-x.md` is Ready and its plan's first step is `T-001` **When** it is selected **Then** the line reads `Start T-001 of .specs/backlog/0007-x.plan.md`.
- **AC-005** When the developer activates "Copy" — by pointer, or by Enter or Space after reaching it with Tab — the system shall put exactly that line on the clipboard and show and announce "Copied to the clipboard."
  *Amended by 0016 (PD-059, proxy): AC-005 — feedback appears at the button (0016 §6.5, T-19); Copy is primary.*
- **AC-006** When 0003 accepts a Ready → Active request, the board shall start no process, reach no network, change no file, leave the card in Ready, and show and announce the drop result of §8 with the NS-7 line and "Copy".
  *Amended by 0017 (PD-060/PD-061): void (PD-060).*
- **AC-007** When the detail view receives a model-changed notification, it shall show the new next step within 500 ms (PD-047).
- **AC-008** While the workspace is in Restricted Mode or the window is a reader, the system shall show the same next step and Copy shall work.
- **AC-009** If writing the clipboard fails, then the system shall show "Could not copy to the clipboard."
  *Amended by 0016 (PD-059, proxy): AC-009 — the failure feedback appears at the button (0016 §6.5, T-19).*
- **AC-010** Mission Control shall show no run figure, run section or run-based reason; *Needs attention* shall carry only Blocked, Diagnostic and Review pending; *Recent activity* only spec status history entries; no element shall send a request for an area outside AC-001.
  *Amended by 0018 (PD-062): *Needs attention* part: Now, Up next and Problems (0018 §6.1).*
- **AC-011** The board card shall show no run line and the filters shall offer board state and named spec set only.
- **AC-012** The detail view shall show a "Status history" section with 0003's history under its label, *not available* with the reason while the history is not available, and no run list.
- **AC-013** The runtime store shall write only `spec-status-history.jsonl`, `lock.json` and `store.json`; a contract test lists the files of a store folder after every scenario.
- **AC-014** The manifest shall contribute no command `openAgentCenter`, `clearRunHistory`, `stopRun` or `resumeRun` and no command title containing "Agent", "Run History", "Stop Run" or "Resume Run".
- **AC-015** The manifest shall declare no configuration property.
- **AC-016** The manifest description shall read as §8 and contain neither "agent" nor "Copilot"; the keywords shall contain none of `agents`, `ai agents` and `github copilot`.
- **AC-017** `package.json` and `package-lock.json` shall not contain `@github/copilot-sdk`; the esbuild externals shall be `vscode` only.
- **AC-018** After `npm run package`, `dist/extension.js` shall contain no `child_process` and no `@github/copilot-sdk`; `dist/webview/main.js` shall contain no "Agent Center".
- **AC-019** A search of `src` without test files shall find no `child_process`, `worker_threads`, `createTerminal`, `ShellExecution`, `ProcessExecution` and `executeTask`.
- **AC-020** A search of `src` without test files for `fetch(`, `node:http`, `node:https`, `node:net`, `node:tls` and `WebSocket` shall find only the release adapter of 0014 and the webview's test-mode probe of 0005 in `src/webview/main.tsx`.
- **AC-021** The folders `src/core/{agentCenter,agentStart,orchestrator,providers}`, `src/adapters/providers` and `src/webview/{areas/agentCenter,agentStart}` shall not exist, nor `test/fixtures/copilot`, and a search of `src`, `.vscode-test.mjs`, `esbuild.js` and `package.json` shall find none of `agentcenter`, `agent center`, `agentstart`, `orchestrator`, `copilot`, `fakeprovider`, `agentprovider`, `runhistory`, `stoprun`, `resumerun`, `waitingforapproval` — except in the earlier-data removal module (it names `copilot-home` and the `agentCenter` state key) and in the tests that decide AC-002, AC-014–AC-021, AC-023 and AC-025.
- **AC-022** The host test suite shall contain no `agentCenter`, `agentStart`, `copilot`, `orchestrator` or `providers` smoke test and no opt-in Copilot runner.
- **AC-023** At every activation, the system shall remove what exists of the paths and the key §6.3 names and nothing else, count a path already gone as removed, leave every path §6.3 never touches byte-identical except where the age cap prunes the status history, and, when it removed anything, write one line to the Output channel "FeatherSpec Studio" naming what it removed (PD-057).
  > **Given** a global storage written by the build at tag `archive/agent-runs-2026-11-17`, and one project folder whose `store.json` names format version 99 **When** this build activates **Then** `copilot-home/` is gone, every other project folder holds only `store.json`, `lock.json` and `spec-status-history.jsonl`, the version-99 folder is byte-identical, and *Recent activity* shows the kept entries BR-07 selects.
- **AC-024** If a path of AC-023 cannot be removed, then the system shall keep it, keep working, write one line per such path to the Output channel "FeatherSpec Studio" naming the path and the reason, and try again at the next activation.
- **AC-025** `media/screenshots/agent-center-dark.png`, `docs/agent-provider-port.md` and `docs/security/secret-patterns.md` shall not exist; a search of `README.md`, `docs/release-checklist.md` and `docs/runtime-data.md` shall find no "Agent Center", "provider", "Copilot", "Clear Run History", "Stop Run" or "Resume Run" — except "GitHub Copilot" in the README opening of §8 and the folder name `copilot-home` in `docs/runtime-data.md`; `docs/runtime-data.md` shall describe the status history, the earlier-data removal and deletion by hand; ADR-003 shall carry the status *Superseded (PD-055)*; ADR-001 (at its §14) and ADR-002 shall carry the note "superseded in part by 0015 (PD-055)" (PD-057).
- **AC-026** The S7 note, the reader reason and the Mission Control purpose shall read as §8.
- **AC-027** Every test at tag `archive/agent-runs-2026-11-17` that decides a criterion of 0001–0007, 0013 or 0014 not voided in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; every title of the tag missing at the head, a renamed one included, is listed in the plan with its voided criterion or with the head title that replaces it.
  *Amended by 0016 (PD-059, proxy): AC-027 (test audit) — also excepted: the tests 0016 AC-023 lists against a criterion that 0016 §5 changes are excepted.*
  *Amended by 0017 (PD-060/PD-061): also except the tests 0017 AC-024 lists against a criterion that 0017 §5 voids.*
  *Amended by 0018 (PD-062): the test audit also excepts the tests 0018 AC-030 lists against a criterion 0018 §5 voids.*
- **AC-028** 0008–0012 shall have status `Deprecated`, stay in `done/` and link this spec as successor; 0003–0007 and 0013 shall carry the amendment notes of §5.
- **AC-029** The `architecture:` snapshot in `AGENTS.md`, `.architecture/*.md` and `.memory-bank/projectbrief.md` shall name no removed module, no agent run and no provider; the brief's mission shall contain the manifest description of §8 and its success criteria the AC-030 scenario.
- **AC-030** *(manual, Gregor)* M-1 on `tip-splitter` with the assistant he uses, the Hands-On walkthrough: three areas; a dropped Ready spec shows the NS-7 line, pasted into the chat it starts that step; Active and Review specs show NS-6 and NS-5 lines that the assistant runs as FeatherSpec commands; he checks whether the S7 note reads as noise (PD-057, OP-006) and whether his assistant resolves the project-relative paths (OP-002). Pre-release checklist item.
  *Amended by 0017 (PD-060/PD-061): "a dropped Ready spec shows the NS-7 line" reads "a Ready card's Copy puts the NS-7 line on the clipboard".*

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

*Amended by 0017 (PD-060/PD-061): the sentence on `MoveResultSink` and `Announcer.tsx` is void (PD-060).*

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | PD-056 holds: a next step as copyable text, in the detail and on the drop — to be confirmed by Gregor, non-blocking | Proxy decision on his delegation; matches 0014's "Copy /sdd-setup" | §6.1, AC-003–AC-009 change |
| A-002 | Copilot and Claude Code both run the slash lines with a path argument | Both read `.claude/commands` or `.github/prompts` loaders; argument hints take a path | NS lines need another form |
| A-003 | Only Gregor and testers ran earlier builds (0.1.0 is unpublished) | Release checklist still open | A published build would need a CHANGELOG notice on the removal |

## 13. Open points

- OP-001 Status history retention fixed at 90 days with no setting and no Clear command. Recommendation: keep; reopen when a user asks. **Resolved 2026-11-17 by PD-057 (4):** fixed 90 days, no setting.
- OP-002 Multi-root workspaces: the lines carry project-relative paths. Recommendation: keep; Gregor checks in M-1 whether his assistant resolves them, else prefix the folder name. **Resolved 2026-11-17 by PD-057 (4):** project-relative; checked in M-1 (AC-030).
- OP-003 Next step on cards or attention rows. Recommendation: not now; the detail is one click away. **Resolved 2026-11-17 by PD-057 (4):** not now.
  *Amended by 0017 (PD-060/PD-061): void: cards and rows show the next step (PD-060, 0017).*
- OP-004 ADR-003 and `docs/decisions/poc-copilot-2026-11-17/` stay as superseded history; ADR-002 (run storage) and ADR-001 §14 (Restricted Mode hides agent start) also describe removed behaviour. Recommendation: keep all; one line "superseded in part (PD-055)" on ADR-001 and ADR-002 in the docs step. **Resolved 2026-11-17 by PD-057 (1):** as recommended (AC-025).
- OP-005 A successful earlier-data removal is silent; the user is never told that run data was deleted. Recommendation: one Output line naming what was removed, once per removed path. **Resolved 2026-11-17 by PD-057 (2):** one Output line naming what was removed, one per path not removed (§6.3, AC-023, AC-024).
- OP-006 Without runs the S7 note concerns only the setup, also in a project already set up. Recommendation: keep it (0005 AC-017 stays); reopen if it reads as noise in M-1. **Resolved 2026-11-17 by PD-057 (3):** the note stays, worded for the setup; checked in M-1 (AC-030).
- OP-007 `/sdd-clarify` 2026-11-17: 38 findings, 35 resolved in one pass at Gregor's standing request, 3 parked (OP-004–OP-006), none asked; the list is kept by the orchestrator (`0015-findings.md`). Readings made; say so if one is wrong: (a) the §5 catch-all; (b) removal at every activation in any window, a gone path counts as removed, newer-format folders untouched; (c) the keywords drop `ai agents` too; (d) the README names GitHub Copilot once; (e) NS-11 for a number used twice; (f) an undetermined tick counts as not ticked; (g) S7 worded as 0014 AC-004; (h) 0006 AC-017's time is the last spec read; (i) the webview's test-mode probe stays (AC-020).
- OP-008 Amended 2026-11-17 after `/sdd-compile` (finding D5): AC-021's exceptions add the tests that decide AC-025 — the docs scan `src/adapters/node/docsScan.test.ts` must name the forbidden terms to search for them. No behaviour changes.

## 14. Definition of Ready / Done

Ready: goal, scope, rules NS-1…NS-11, removal list and amendments are stated; A-001 is open but
not blocking. Done: AC-001–AC-029 green with evidence in the plan, AC-030 checked by Gregor,
§5 applied, no out-of-scope behaviour added, `/sdd-compile` READY.

## 15. Recommended next steps

`/sdd-plan .specs/backlog/0015-focus-on-visibility.md` (clarified 2026-11-17, OP-007; open points
resolved by PD-057).
