# Next Step Everywhere, No Pseudo-Moves

**Status:** Draft
**Plan:** _none yet_

Basis: UX audit 2026-11-17 (`docs/ux-audit/`) R-02, R-03, R-04, R-16; K-A, K-D, K-G; Q-1, Q-2
(screenshots 08–10, 25, 26). Decisions PD-058, PD-060, PD-061 (1), PD-062, PD-013, PD-016, PD-039,
PD-047; guidelines 1, 2, 4, 6, 8, 9 (`.claude/rules/ux-guidelines.md`). Gregor delegated every
product decision (PD-058); proxies are marked in §11. Implemented after 0016 (Copy feedback).

## 1. Summary

Board cards, the *Needs attention* rows of Mission Control, the status bar and a command "Copy
Next Step" name a spec's next step with one action, Copy. The board's pseudo-moves go: no drag,
no "Move to…", no move status line, no "Move Spec to…" command, no transition check. NS-6
(Active) gains FeatherSpec's own "continue" as second line, for the same chat.

## 2. Goal and problem

The core promise ("know its next step") showed only after choosing an area and a spec (Q-1): three
or more clicks to copy. Five of six board moves were always refused, the sixth moved nothing (Q-2).
NS-6 named `/sdd-plan`, after which FeatherSpec waits for an input the Studio never named (02 §3.8).
Goal: from any surface to the right line on the clipboard in one click, and no control that cannot
act. Accepted by AC-026.

## 3. Users and roles

Developer, one role (0001–0007): in flow at an active spec, coming back, or a workshop participant
trying gestures. The AI assistant receives the pasted line.

## 4. Scope

### In scope

- Short form and copy rules (§6.1); NS-6 second line (§6.2).
- Next step with Copy on every board card and on the existing *Needs attention* rows. 0018 rebuilds
  Mission Control as Overview and keeps the next step and Copy on its rows (PD-062).
- Status bar: current spec, state, next step; click copies (§6.3). Command "Copy Next Step" (§6.4).
- Removal of every move path (§6.5), the amendments of §5, README, CHANGELOG, docs, architecture.

### Out of scope

- Next step in the Activity Bar tree — because 0020 owns R-05; it reuses §6.1 and §6.3.
- Next step on Spec Explorer list rows and activity entries — because 0020 replaces the list (its
  detail shows the step) and activity is past (guideline 1, named).
- Card layout beyond the added line — because 0018 (R-10) and 0016 (R-09) own it.
- The Copy feedback itself and its texts — because 0016 (R-12) owns it; this spec reuses it.
- A default keybinding for "Copy Next Step" — because no shortcut is free on every platform (proxy).
- The spec open in the editor or a focused card as the current spec — because one explainable rule
  is enough (§6.3); 0019/0020 set the same selection (proxy).
- Keeping Ready → Active drag (audit D2) — because PD-060 chose removal; the card's Copy replaces it.
- Alt+Click on the status bar — because an entry has one command; a tooltip link opens the Studio.
- "Send to chat" — because PD-056 and PD-061 (2).

## 5. Amendments of other specs

Applied in the implementing change set as inline notes "*Amended by 0017 (PD-060/PD-061): …*". The
PD register is history and is not edited; PD-060 and PD-061 supersede where the rows say so.

**Catch-all (one note at the head of 0003, 0007, 0013, 0015, as 0015 did):** every other statement,
criterion, note or open point about drag and drop, "Move to…", the move command, move requests, the
board-requested transition check, an accepted Ready → Active request or the drop result is void; a
sentence that also says something else keeps that part. The rows name what needs a replacement.

| Spec · statement | Amendment |
| --- | --- |
| 0001 §5 step 5; §9 status bar "Active project → its name and version", "Clicking it runs the select command"; AC-014; OP-010 "the status bar keeps the name" | While a project is active the entry shows 0017 §6.3 and its click runs "Copy Next Step"; name and version move into the tooltip. Texts and click without an active project stay (AC-008, AC-010, AC-015) |
| 0001 AC-013, AC-022, AC-023, AC-024 | "The status bar entry" shows the 0017 §6.3 text while a project is active; every other statement stays |
| 0003 §1 "accepts or refuses board transitions"; §2 "why a drop was refused"; §3 "drags a Ready spec to Active"; §4 in-scope "Validating board-requested transitions (§6.4)"; §5 step 5; §6.4 part "Requested by the board" with its table; FR-04 first half; AC-008; §12 "Request for an entry that is not in the latest snapshot" | Void: no transition check (0017 §6.5). §6.4 "Observed from the files", AC-009 and every derivation and readiness rule stay; §13's AC-011 check compares the tree before and after a derivation and a history append |
| 0006 §9 layout, *Needs attention* row; AC-014 | A row whose spec has a step shows "Next", the short form and Copy (0017 AC-012); Copy sends no navigation request; activating the rest of the row is unchanged |
| 0007 §1 "owns the drag interaction and its keyboard alternative"; §3 "drags a Ready spec toward"; §4 in-scope bullet "Drag interaction, the Move to… menu and the command"; §5 step 5; §6 term *Move request*; §6.6; FR-09; AC-014; AC-015; §13 rows "Card being dragged…", "Drop on the own column…" | Void (PD-060). The card shows the next step (0017 AC-004) |
| 0007 §6.7 tab-stop bullet, AC-017 "Move to… button … opens the menu … choose a target", "Shift+F10 and the context-menu key" | Tab from the card reaches its Copy (§15's one card stop plus one button stop stays); Enter or Space copies; Shift+F10 and the context-menu key open no Studio menu (0017 AC-006) |
| 0007 §6.7 and AC-018 "announce the result of every move request" | Void; Copy feedback is announced per 0016 |
| 0007 AC-016 "for any move request or other board action" | "…for any board action, Copy included" |
| 0013 §3.3 card "'Move to…' small, top-right corner"; "Drag feedback"; AC-011; OP-1 (a) | The next-step line is the card's last line; drag feedback and AC-011 void |
| 0013 AC-003 list "'Move to…'"; AC-009 clause "a 'Move to…' button reachable by Tab" | "card and row Copy"; "the next-step line of 0017 AC-004 last, its Copy reachable by Tab". The rest of AC-009 is 0018's |
| 0013 AC-016; 0015 AC-027; 0016 AC-023 (test audits) | Also except the tests 0017 AC-024 lists against a criterion this table voids |
| 0015 §4 out-of-scope "The next step on cards or Mission Control rows"; OP-003 | Void: cards and rows show it (PD-060, 0017) |
| 0015 §6.1 row NS-6; §8 *Detail* labels | NS-6 per 0017 §6.2; label "Then, in the same chat, if nothing blocks:" |
| 0015 §4 in-scope "and on an accepted Ready → Active request"; §6.2; FR-03; AC-006; §8 *Drop result*; §11 sentence on `MoveResultSink` and `Announcer.tsx` | Void (PD-060) |
| 0015 AC-030 "a dropped Ready spec shows the NS-7 line" | "a Ready card's Copy puts the NS-7 line on the clipboard" |
| 0016 §4 out-of-scope "its Copy and Dismiss styles"; §6.5, AC-017 "the drop result's" Copy and Dismiss; its §5 row on 0015's *Drop result* | Drop-result parts void (PD-060); the detail's Copy keeps them; card and row Copy are Copies of a next step there |
| 0016 AC-022 "every other next-step line … of 0015 §6.1 shall stay unchanged" | Except NS-6 (0017 §6.2) |
| ADR-001 §11 board drag and drop, "Move to…" alternative | Note "superseded by 0017 (PD-060): no drag, no Move to…, no move command" |
| PD-014; PD-045 (drop part); PD-056 "when a card is dropped from Ready onto Active"; PD-057 (4) "no next step on cards for now" | Superseded by PD-060, PD-061 and this spec: the next step shows in the detail, on cards, rows, status bar and command |

## 6. Business rules

### 6.1 Short form and copy

- The single source is 0015's next step as amended in §6.2 (`nextStep()`). A spec **has a step**
  when its next step has a line (every rule but NS-1, NS-3, NS-11).
- **Short form** of a first line: `/sdd-<name>` with or without its path → `/sdd-<name>`;
  `Start <ID> of <plan path>` → `Start <ID>`; `Implement <plan path>` → `Implement`.
- Cards, rows, status bar and quick pick show the **short form of the first line** only. The
  detail and every tooltip show the full line(s), the second under its label. **Copy always copies
  the full first line**; the detail keeps one Copy per line. Card and row Copy take 0016 §6.5's
  style and feedback.
- The step is the card's last line, follows a row's reasons and ends the status bar text: the
  spec is named first (audit R-03 field 4, K-G; deviation from guideline 1 "before anything else", named).
- A spec without a step shows no step line on its card or row (problems show per 0016).

### 6.2 NS-6 (Active) completed (R-16, PD-061 (1))

| Rule | Entry | Line(s) |
| --- | --- | --- |
| NS-6 | Active, the sibling plan has an open plan step (NS-7's definition) | `/sdd-plan <spec path>`; then, under "Then, in the same chat, if nothing blocks:", `continue` |
| NS-6 | Active, no sibling plan, or no open plan step | `/sdd-plan <spec path>` |

Source: `.claude/commands/sdd-plan.md` *Mode B — resume*, step 2 (report what is done, next and
blocking) and step 3 ("Continue from the next open step only when the user asks you to — and then
**one step**"); step 4 and `.claude/rules/plans.md` *A finished plan ends the work here* quote the
user's word as `"continue"`. The start phrases "start T-001" and "implement" (`sdd-plan.md`
*Always*) are the signal for a plan not yet started, which NS-7 keeps. `continue` leaves the choice
of step to Mode B, which checks ticks against Git and code before it names the step. The lines work
only in sequence in one chat: a bare `continue` in a fresh chat names no spec, and `AGENTS.md`
(*Memory Bank*) sends the agent to `activeContext.md`'s active spec without Mode B's report.

### 6.3 Current spec and status bar (R-04, K-G)

**Current spec**, first match: (1) the selected spec (PD-039: the shell's remembered selection, also
while the panel is closed), if it is in the project and has a step; (2) else the most urgent spec
with a step in state Blocked, then Review, then Active, by number ascending, then path; (3) else
none. Ready and Backlog specs are never chosen by (2).

While a project is active (0001), the status bar entry (below: the entry) shows:

| Case | Text | Click |
| --- | --- | --- |
| current spec | `$(checklist) <number> · <state> · <short form>` | copies the full first line |
| no current spec, n Ready specs, n ≥ 1 | `$(checklist) FeatherSpec · <n> ready` | quick pick (§6.4) |
| no current spec and no Ready spec, or specs not read yet | `$(checklist) FeatherSpec` | quick pick (§6.4); the Studio while specs are not read |
| for 2 s after a click (or the command) that copied | `$(check) Copied` or `$(warning) Could not copy`; a failed copy also shows the warning "Could not copy to the clipboard." | as before the click |

Tooltip (Markdown), lines in order: `**<number> · <state>** <title>`; the full line(s) as §6.1;
`<project name> · FeatherSpec <version>`; "Click to copy the next step." (current spec), "Nothing
in progress. Click to pick a spec and copy its next step." (none) or "Click to open the Studio."
(specs not read); links "Open Studio" and, only while two or more projects are reported, "Switch
project" (the select command). Without a current spec the first two lines are absent. Without an
active project text, tooltip (`FeatherSpec Studio: select the active project`) and click stay as
today and 0001 defines them ("Select FeatherSpec project", "FeatherSpec project not found").

**Accessible label**: the text without icon, ` · ` as `, `, then the tooltip's click sentence —
`0020, Blocked, /sdd-plan. Click to copy the next step.`; `Copied` or `Could not copy` during the
feedback; no Markdown, no link. VS Code announces no status bar change, so success is visual only
(deviation from guideline 9, named); the failure warning is announced (A-009).

### 6.4 Command "FeatherSpec Studio: Copy Next Step"

Click and command are one behaviour. With a current spec: copy, feedback in the status bar. Without:
a quick pick of every spec with a step, ordered Blocked, Review, Active, Ready, Backlog, then number,
then path; item label `<number> <title>` (the stem where no title is read), description `<state> ·
<short form>`, placeholder "Select a spec to copy its next step"; picking copies with the same
feedback; cancelling does nothing; no item → information "No spec has a next step to copy. Start
the next spec with /sdd-specify" with "Copy", which copies `/sdd-specify` with the same feedback
(A-010). While the specs are not read (loading, or a load error, PD-038) click and command run
"FeatherSpec Studio: Open", whose panel shows S4 or S5 (0005). Without an active project the command
does what "Select Project" does (0001 AC-008, AC-015).

### 6.5 What goes and what stays (R-02, PD-060)

Survey 2026-11-17: `judgeTransition` (`src/core/lifecycle/transitions.ts`) has no consumer but
`src/core/board/moves.ts`, `LifecycleService.judgeTransition`, the test API and tests. So the
move-request API goes; the lifecycle model keeps deriving states.

- **Goes:** card `draggable`, drag and drop handlers and the marks `data-dragging`,
  `data-drop-target`; the "Move to…" button and menu (`MoveMenu.tsx`); the Shift+F10 and
  context-menu key handling; the board status line (`Announcer.tsx`) and its Dismiss; the command
  `featherspec-studio.moveSpec` and its pick lists (`boardPicks.ts`); `moves.ts` (`createMoves`,
  `createMoveResultPresenter`); `transitions.ts` and `LifecycleService.judgeTransition`; the
  messages `moveRequest`, `moveResult` and `MoveResult`; the ports `MovePickPort`, `MoveResultSink`,
  `MoveMessagePort`; the move texts of §7; `requestMove`/`dismissMove` in the webview store and
  client; the test API's `board().requestMove` and `lifecycle().judgeTransition`; the move CSS;
  `boardFocus` with `setFocus`/`focused`, whose only consumer was the move command.
- **Stays:** `copyLine` (moved to its own core module; the detail, cards, rows and command use it),
  `SelectionSource`, arrow keys, Enter opens the spec, focus kept after live updates (0007 AC-017,
  AC-019), states, readiness, flow markers (0003 AC-009), status history, filters, sort, drill-downs.

## 7. Texts (English, PD-016)

| Where | Old | New |
| --- | --- | --- |
| Card, last line | button "Move to…" (aria "Move to… (spec <number>)"), menu of five states | "Next" `<short form>` "Copy" (aria "Copy: <full first line>"); tooltip: full line(s) |
| Board, above the columns | "Studio starts no agent. Next step for <number> — paste it into your AI assistant:" `<line>` "Copy" "Dismiss"; the refusals of 0003 §6.4 | — |
| *Needs attention* row | `<number> <title> — <reasons>` | the same, then "Next" `<short form>` "Copy" (aria "Copy: <full first line>"); tooltip: full line(s) |
| Status bar, project active | `FeatherSpec: <name> (<version>)`; tooltip "FeatherSpec Studio: select the active project" | §6.3; warning "Could not copy to the clipboard." |
| Command | "FeatherSpec: Move Spec to…" | "FeatherSpec Studio: Copy Next Step" |
| Quick pick, message | "Select a spec to move", "Move spec <number> to…" | "Select a spec to copy its next step"; "No spec has a next step to copy. Start the next spec with /sdd-specify" + "Copy" |
| Detail, NS-6 | — | "Then, in the same chat, if nothing blocks:" `continue` |

## 8. Error cases and edge cases

- Clipboard fails → card and row: 0016's failure feedback; status bar and command: §6.3.
- The selected spec disappears or becomes Done → (2) of §6.3 applies at the next model change.
- Two clicks within 2 s → the 2 s restart; the text then shows the current spec of that moment. A
  change during the 2 s shows when they end.
- The step changes between showing and the click → the click copies the line behind the text shown
  (0015 §9).
- A card dragged out of habit → nothing happens, no message, no mark, no move cursor.
- Restricted Mode, reader window → every step, Copy, click and command work (0015 AC-008).

## 9. Acceptance criteria

Decided by automated tests unless marked manual. Fixtures: one per NS rule (0015 AC-004).

- **AC-001** The system shall show on cards, rows, status bar and quick pick the short form of §6.1 of the first line of the next step the detail shows, and Copy shall put exactly that first line, path included, on the clipboard.
  > **Given** Ready `.specs/backlog/0007-x.md` whose plan's first open step is `T-003` **Then** the card shows `Start T-003` and Copy copies `Start T-003 of .specs/backlog/0007-x.plan.md`.
- **AC-002** Where NS-6 is the first matching rule (Active), the next step shall be `/sdd-plan <spec path>`, followed, only while its sibling plan has an open plan step (0015 NS-7), by `continue` under "Then, in the same chat, if nothing blocks:"; one fixture per NS-6 row decides it.
- **AC-003** For identical snapshots and the same selection the system shall show identical short forms, current spec and quick-pick order.
- **AC-004** The board shall show on every card whose spec has a step, as its last line, "Next", the short form with the full line(s) as tooltip, and a "Copy" named "Copy: <full first line>"; a card of a spec without a step shall show no such line.
- **AC-005** When the developer activates a card's Copy by pointer, or by Enter or Space after reaching it with Tab, the system shall copy the full first line, show 0016's feedback at that Copy only, and not open the detail or change the selection, the area or the card's column.
- **AC-006** Tab from the card that is the board's tab stop shall reach that card's Copy next and no other card's Copy; arrows and Enter shall work as 0007 AC-017; Shift+F10 and the context-menu key on a card shall open no menu of the Studio.
- **AC-007** No card shall carry `draggable="true"`; when dragstart, dragover, drop and dragend are dispatched on a card and another column, the webview shall send no message and set no mark.
- **AC-008** The board shall show no "Move to…" control, no target menu and no status line above the columns.
- **AC-009** The manifest shall contribute no command `featherspec-studio.moveSpec` and no title containing "Move", and shall contribute `featherspec-studio.copyNextStep` titled "FeatherSpec Studio: Copy Next Step", not hidden from the Command Palette.
- **AC-010** If the webview sends a `moveRequest` or `boardFocus` message, then the host shall handle it as 0005 AC-021 handles an unknown message type and change nothing else.
- **AC-011** The paths `src/core/board/moves.ts`, `src/core/lifecycle/transitions.ts`, `src/webview/board/MoveMenu.tsx`, `src/webview/board/Announcer.tsx` and `src/adapters/vscode/boardPicks.ts` shall not exist, and a case-insensitive search of `src` without test files (0015 §10) shall find none of `judgeTransition`, `moveRequest`, `moveResult`, `requestMove`, `moveSpec`, `boardFocus`, `Move to…`, `Studio starts no agent`.
- **AC-012** Every *Needs attention* row whose spec has a step shall show after its reasons "Next", the short form with the full line(s) as tooltip, and a Copy named "Copy: <full first line>" outside the row's navigation control, the next Tab stop after it; Copy, by pointer or by Enter or Space, shall copy the full first line, show 0016's feedback at that Copy, change no selection and send no navigation request; activating the rest of the row shall send 0006 AC-014's request.
- **AC-013** The system shall choose the current spec by §6.3 (1)–(3).
  > **Given** no selection, Review `0015`, Active `0012`, Blocked `0020` with a plan **Then** the entry reads `$(checklist) 0020 · Blocked · /sdd-plan`. **Given** the selection is Done `0003` **Then** the same.
- **AC-014** While a project is active and a current spec exists, the entry shall read `$(checklist) <number> · <state> · <short form>` with the tooltip lines of §6.3 in order and the accessible label of §6.3.
- **AC-015** While a project is active and no current spec exists, the entry shall read `$(checklist) FeatherSpec · <n> ready` for n ≥ 1 Ready specs, else `$(checklist) FeatherSpec`, with the tooltip and accessible label of §6.3.
- **AC-016** When the developer clicks the entry while a project is active, the system shall run "Copy Next Step"; after a copy the entry shall read `$(check) Copied`, after a failed copy `$(warning) Could not copy`, for 2000 ms, then the text of AC-014 or AC-015 at that moment; a failed copy shall also show the warning "Could not copy to the clipboard.".
- **AC-017** The tooltip shall show "Switch project" only while two or more projects are reported; while a project is active a click shall never open the project pick; while none is active, text, tooltip and click shall be as today and as 0001 AC-008, AC-010 and AC-015.
- **AC-018** When the entry's spec, its state, its step or the selection changes outside the 2000 ms of AC-016, the entry shall show the new text within 500 ms after the host receives the model-changed notification or the selection change (PD-047).
- **AC-019** When the developer runs "Copy Next Step" while a current spec exists, the system shall copy its full first line without asking and show AC-016's feedback.
- **AC-020** When the developer runs "Copy Next Step" while no current spec exists, the system shall offer the quick pick of §6.4 in its order and labels; picking shall copy that spec's full first line; cancelling shall copy nothing; with no item it shall show the §6.4 message, whose "Copy" copies `/sdd-specify`; while the specs are not read it shall run "FeatherSpec Studio: Open" instead.
- **AC-021** While no project is active, "Copy Next Step" shall behave as "Select Project" (0001 AC-008, AC-015).
- **AC-022** While the workspace is in Restricted Mode or the window is a reader, cards, rows, entry and command shall behave as in AC-004–AC-020.
- **AC-023** No Copy, click or command of this spec shall create, change, move or delete a file of the workspace (0007 AC-016 as amended).
- **AC-024** Every test at the plan's Baseline commit (before 0017) that decides a criterion not voided in §5 shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; every title missing at the head is listed in the plan with its voided criterion or the head title replacing it. A test that decides a voided and a staying criterion stays for the staying one, its move assertions removed (§10).
- **AC-025** 0001, 0003, 0006, 0007, 0013, 0015, 0016 and ADR-001 shall carry the notes of §5; a case-insensitive search of `README.md`, `docs/release-checklist.md`, `docs/product/design-brief.md` and `.architecture/*.md` shall find no "Move to…", "Move Spec", "drag", "move request", "move pick", "move result", "transition check" or `FeatherSpec: <name> (<version>)`; the README shall name the card Copy, the status bar with the rule of §6.3 and "Copy Next Step"; the release checklist shall carry AC-026; `CHANGELOG.md` shall name the removal and the new places of the next step under the version in preparation.
- **AC-026** *(manual, Gregor)* M-1 on `tip-splitter`, Hands-On walkthrough with his assistant: task "start the Ready spec" — the Start line copied from the card with no failed attempt; on an Active spec `/sdd-plan`, then `continue` in the same chat, runs one step; the status bar names the spec he works on and its click copies; Dark, Light and High Contrast show the card line and row readable.

## 10. Technical notes for developers or AI agents

- As-is: `nextStep()`/`startLine()` in `src/core/board/nextStep.ts`, texts in
  `src/shared/protocol/nextStepTexts.ts`. Cards: `src/core/board/cards.ts` → `CardView`
  (`src/shared/protocol/board.ts`); rows: `src/core/missionControl/attention.ts`,
  `missionControlService.ts` → `AttentionRow` (`missionControl.ts`). Project the step in the core;
  the webview derives nothing (guideline 1). A row is one `Drill` button: Copy sits beside it.
- Copy: request `copyText` → `copyLine` (today in `moves.ts`) → `ClipboardPort`.
- Status bar today: `resolveActiveProject` (`src/core/discovery/activeProject.ts`) → `StatusBarPort`
  → `src/adapters/vscode/statusBar.ts` (command select, fixed tooltip). The new text needs the
  model and the shell selection (`createShellSelection`, PD-039 memory). Discovery tests assert
  `FeatherSpec: <name> (<version>)` on the port: the plan decides whether that stays a port value
  under a new composer or changes, with the title audit (AC-024). Tooltip command links need a
  `MarkdownString` trusted for `featherspec-studio.open` and `featherspec-studio.selectProject` only;
  the label is `accessibilityInformation` (VS Code main, read 2026-11-17: `statusBarExtensionPoint.ts`
  appends the tooltip source, `statusbarItem.ts` has no live region, `notificationsAlerts.ts` announces).
- Tests touching moves: `Keyboard`, `SpecBoard`, `moves`, `transitions`, `lifecycleService`,
  `boardRequests`, `noWrite`, `messageRouter`, `boardFilter`, `manifest`, `webviewCss` (0013 AC-011,
  `.move-button` in AC-003's list), `src/test/{board,lifecycle}.smoke`. Mixed ones keep their staying
  part: 0003 AC-011 tree check and AC-001 smoke; 0007 AC-016 (`noWrite`, smoke), AC-011–AC-013,
  AC-017, AC-019; router and guard lists; the `copyLine` test (0015 AC-005, AC-009) moves with it.
- Removing files is Ask-first (AGENTS.md); Gregor delegated (PD-058), the plan names each.
  `/sdd-architecture-update` runs in the same change set. `DISMISS_LABEL` stays (NoticeBar, Mission Control).

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | After `/sdd-plan`, FeatherSpec 1.10.0 runs one step on the user's `continue` in the same chat; in a fresh chat it does not | `sdd-plan.md` Mode B steps 3–4 and `plans.md` quote it; a fresh chat follows `AGENTS.md`'s `activeContext.md` pointer (§6.2) | NS-6 second line wording and label (AC-002) |
| A-002 | Current spec = selected with a step, else most urgent in Blocked → Review → Active (proxy) | Audit K-G and R-04 field 11 ask for one explainable rule; Done and unreadable specs have nothing to copy | AC-013 |
| A-003 | `$(checklist)` as icon (proxy) | VS Code's product icons have no feather; the logo mark would need an icon font and a build tool | Icon token only |
| A-004 | Short form also on *Needs attention* rows (proxy) | Guideline 1 "short form where space is tight"; 0018 decides the Overview rows | AC-012 |
| A-005 | Prefix "FeatherSpec Studio:" (proxy) | The ten other commands use it; only the removed move command used "FeatherSpec:" | AC-009 title |
| A-006 | Word "Next" instead of the audit's "▸" (proxy) | Guideline 6 and 9: text over glyph | AC-004, AC-012 text |
| A-007 | Nothing in progress → `FeatherSpec · n ready`, not a Ready spec (proxy) | Audit K-G; starting a Ready spec is the user's choice | AC-015 |
| A-008 | 0016 is implemented first and provides Copy feedback at the control | Order 0016 → 0017 in the split | AC-005, AC-012 refer to it |
| A-009 | Status bar: plain accessible label; success visual only; a failure also warns (proxy) | No live region in the status bar, notifications are announced (§10); a toast per copy is noise; OP-001's advice | AC-014–AC-016 |
| A-010 | No spec with a step → Copy `/sdd-specify`; specs not read → the Studio (proxy) | Guideline 9 "a way out"; 0018 O-8, 0006 zero specs; S4/S5 explain loading | AC-020 |

## 12. Open points

- OP-001 Screen readers do not announce status bar text changes. **Resolved 2026-11-17 by `/sdd-clarify` (proxy):**
  A-009; M-1 has no screen reader (audit 02 §1).
- OP-002 Proxy decisions A-002–A-007, A-009, A-010 await Gregor's confirmation; a change is a revise of this spec.
- OP-003 `/sdd-clarify` 2026-11-17: 41 findings, 39 resolved in one pass at Gregor's standing request,
  none asked (list: orchestrator, `0017-findings.md`); 0018 O-5 (row tooltips) and 0019 OP-002 (old
  NS-6 label) handed on. Readings, say so if one is wrong: (a) the §5 catch-all; (b) "in the same chat";
  (c) Copy selects nothing; (d) Shift+F10 may open VS Code's own webview menu; (e) `boardFocus` goes.

## 13. Definition of Ready / Done and next steps

Ready: §6 rules, §7 texts, removal survey and §5 amendments stated; open points non-blocking. Done:
AC-001–AC-025 green with evidence in the plan, AC-026 checked by Gregor, §5 applied, docs,
architecture and Memory Bank synced, `/sdd-compile` READY. Next: `/sdd-plan` after 0016 is
implemented, against the code as it is then (clarified 2026-11-17, OP-003).
