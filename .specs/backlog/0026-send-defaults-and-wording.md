# Send Defaults and Wording

**Status:** Draft
**Plan:** [0026-send-defaults-and-wording.plan.md](0026-send-defaults-and-wording.plan.md)

Basis: `docs/ux-audit/09-round2-review.md` §3, §4 (G-3, G-5, G-8, G-9), §7, §8; `screenshots-48d1968/` r01, r02, r05,
r06. **PD-078**, **PD-080**, **PD-086**, **PD-088**, PD-082, PD-068, PD-074, PD-041, PD-047, PD-063 (5), PD-077, PD-016;
D-1…D-3; guidelines 1–3, 6–12. Builds on 0021, 0023, 0024, 0018, 0022, restating none. 0025 owns the Plan map, 0028 the
next-step rules, 0027 the attachment; this spec the ways block and the wording of short forms, coach lines and Send
targets. No interview: proxies in §11. Code: `db71223`.

**Changes 2026-11-19** (`docs/ux-audit/12-finish-plan.md` D3; PD-084…PD-089): `Move back to Ready` (PD-086); the menu's
items named, a check mark open (OP-006); the after-send sentence (AC-020); `Send`, not `Paste`, beside a Send (AC-021).
Click test (`docs/ux-audit/13-clicktest-results.md` K-2, K-3, K-5): AC-022–AC-024; OP-001, OP-006, OP-007 closed.
`/sdd-plan` (S98): AC-021's search reads string literals and allows 0021's Copy-only tip closing; AC-024 names 0025's quiet
`Integrate`; §10 names 0028's snapshot test and the `now` shape.

## 1. Summary

Send to Copilot opens a **new chat** for every step; the **current chat** (one name) stays in the menu. A short form
starts with its intent's first word, without "Next" (`Find blocker · /sdd-plan`). One coach line per view; Now shows five
rows, then `+ n more`; the ways become three lines, In sequence pre-selected (D-3), details in a `(?)`.

## 2. Goal and problem

Prefilling Copilot's current chat replaces an unsent draft (09 §3, OP-004). Two words name one chat. Short forms differ
from the detail (`Next Unblock · /sdd-plan` beside `Find out what blocks`, r01, r06); two coach lines for one spec (r02);
the ways take about 400 px (r05); Now has no cap (N-9). Goal: one click puts a step in a fresh chat without risk, a step
reads the same everywhere, three lines tell how to run a stage. Success: Gregor passes AC-018 without asking; no draft lost (AC-019).

## 3. Users and roles

Developer, one role (0001–0007), with or without a chosen assistant (0024 §6.2).

## 4. Scope

### In scope

- Send's default target (§6.1); "current chat" (§6.2); short forms and "Next" (§6.3); one coach line (§6.4); Now (§6.5).
- The compact ways block (§6.6); the amendments of §5; README, CHANGELOG, release checklist, design brief.

### Out of scope

- Plan map navigation, cards, header action, progress, G-7's "Ways to run it" link — because 0025 owns them.
- Which step comes next (G-11, PD-081's all-ticked check) — because 0028 owns `nextStep()`; it takes its short intents by §6.3.
- The attachment line, `attachFiles` — because 0027 (PD-083); `modelSelector` — because PD-082 leaves it unused.
- New intents (the long lines) — because 0021's were confirmed in the click test (PD-073); G-8 aligns the short forms to them.
- A warning or confirmation on `Send to the current chat` — because 09 §3 keeps it in the menu as the developer's explicit choice (A-002).
- A setting for the default target — because PD-078 decides it in the product, and every setting is one more thing to explain.
- New wording of stage prompts or start lines — because 0023's equal FeatherSpec 1.11.0's fixed prompts (OP-004).
- A Claude Code "current chat" target (0024 OP-003), status bar, Up next, Board order — because the review asks no change there.

## 5. Amendments of other specs

Applied in the implementing change set as a note under each statement, "*Amended by 0026 (PD-078 | PD-080 | PD-082): …*",
after earlier notes; where 0025 or 0028 amends the same statement, its note comes first and this one covers its part. The PD
register is not edited; PD-064 A-002 ("Now has no cap") is refined here.

| Spec · statement | Amendment |
| --- | --- |
| 0024 §6.3 *Main part* "Copilot `new chat` where the first line's session … is `new chat`, else `current chat`"; AC-004; AC-005's example "exactly one executed command: `workbench.action.chat.open`"; A-007; §7 row *Main part* "`Send to <Name> (current chat): <line>`" | `new chat` for both assistants and every step (0026 §6.1, AC-001), so the example records `newChat`, then `open`; A-007 void; 0024 §6.3 *Arrow part* "items `role="menuitem"`": the Send items are `menuitemradio`, the active one checked (0026 AC-022) |
| 0024 §6.3 "0021's 'same chat' continues there" | "0021's coach line calls it current (`current or new chat`, PD-080)" |
| 0024 §8 "Unsent text in Copilot's current chat … (OP-004)"; OP-004; AC-017 "records whether unsent text in the current chat is kept or replaced (OP-004)" | OP-004 closed by PD-078; `open` replaces a draft only through the menu item `Send to the current chat`; AC-017 records it for that item; the checklist's "decide whether the current chat stays the default target" goes |
| 0021 §6.5 "`same chat or new chat`"; §6.2 table, case "Open step", Session; §6.6 reasons rows `new chat` ("what this chat knows") and `same chat or new chat`; AC-003 coach | `current or new chat`; the reasons of 0026 §7 |
| 0023 §5.5 "session · model `same chat or new chat`"; AC-013 coach; A-004 "session `same chat or new chat`" | `current or new chat` (0026 §6.2) |
| 0021 §6.1 Short intent column NS-2, NS-4 (both rows), NS-7, NS-10; §6.2 Short intent column "Plan without open step", "No sibling plan"; AC-005 `Resume · /sdd-plan`, `Plan · /sdd-plan`; A-005 "NS-7 `Build`" | 0026 §6.3's table; `Report · /sdd-plan`, `Write plan · /sdd-plan`; NS-7 `Start · Implement <ID>`, without open step `Report · /sdd-plan` (D-4, 0028 §6.5) |
| 0021 §6.3 "`Build · Start T-001`" (as 0028 amends it, `Build · Implement T-001`), "Cards and Overview rows show it after 0017's 'Next'"; §7 row "Step short form" | `Start · Implement T-001`; no visible "Next" (0026 §6.3) |
| 0017 §7 rows "Card, last line" (as 0021 amended) and "*Needs attention* row"; AC-004, AC-012 "'Next', the short form"; A-006; 0018 O-5 "then 0017's 'Next', short form and Copy"; 0022 §4.1 table rows 420–686 px and below 420 px "'Next' with the short form" | The step short form without a visible "Next"; a visually hidden `Next step: ` precedes it (0026 §6.3, AC-005) |
| 0021 §6.5 "and in the first Now row"; AC-009 "the detail and the first Now row shall show §6.5's coach line"; 0018 O-5 (as 0021 amended) "the first Now row also carries the coach line and `?`"; 0022 §4.1 bullet "First Now row … the coach line and `?` follow its Copy prompt"; 0022 AC-001 "in the first Now row 0021's coach line and `?` shall follow" | Only while the side panel does not show that row's spec (0026 §6.4, AC-006) |
| 0018 O-2 "order Blocked, Review, Active, then number ascending, then path. No cap."; AC-004 "in the order of O-2, without a cap"; A-002; §7 row "Set labels" | 0026 §6.5 (order, five rows, `+ n more`); set label `Now` added |
| 0022 AC-011 "With seven Now rows", "exactly two primary buttons … with no spec selected, one and zero"; §3 bullet N-9, A-004 and OP-004; 0022 §4.4 (2) "the Copy of the Overview's first Now row", "at most two per view"; AC-010; 0024 §6.3 *Place* "one primary control" for the first Now row | "seven Now entries (five rows)"; N-9 is decided by 0026 §6.5 (09 G-9); the first Now row's Copy or split button is secondary (0026 §6.5, AC-024; 13 K-5): the Overview holds one primary while the selected spec's next step has a line, none without; the Board as before |
| 0023 §5.5 then-sentence `Paste it once every worker you started is back.`; AC-013 | While Send is offered: `Send it once …` (0026 §6.2, AC-021) |
| 0023 §5.4 "Expanded, in order: the lead M-08; then each way as name, effect sentence, prompt … and Copy prompt"; "Under *Other agents* … M-10, then … the start line"; A-006; §6 rows M-08 and "Ways, NS-6 case" (effects); AC-009 "expanded, M-08 and the three ways … with their effect sentences and prompts literally" | 0026 §6.6, AC-009–AC-011: radio group, `(?)` with M-08 and the effects, the checked way's part; Other agents' stage prompt only while no start line shows |
| 0023 §3 out of scope "A coach line or `(?)` in the Plan map — because guideline 11" | Beside 0025's header, also 0026's `About these ways`, which holds no session or model advice (A-012) |
| 0023 AC-012 "keeping expanded cards, the ways block's state" | The ways block's state includes the checked way; a radio counts as "a way" (0026 AC-013) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014; the test audits of 0025 and 0028 | Also except the tests 0026 AC-015 lists against a statement this table changes |

## 6. Business rules

### 6.1 Send target (PD-078)

Every split button's main part (0024 §6.3), wherever a spec places one (0025's Plan map header too), sends to **new chat**
with both assistants for every step; name and tooltip `Send to <Name> (new chat): <line>`. The menu stays 0024 §6.3's
(A-001; Copilot `Send to a new chat`, `Send to the current chat`, `Copy prompt`, 12 D3-1; a check on the active choice:
OP-006, 13 K-2); `Send to the current chat` keeps its one `open` call, no warning (A-002); 0024 §6.4–§6.6 hold. After a
Send the main part says `The prompt is in <Name>'s chat. Check it, then send it there.` (0024 §7, 12 D3-2); never submits.

### 6.2 One term (PD-080)

The open chat is the **current chat** in every visible text, tooltip, setting description and doc: `current or new chat`
replaces 0021's session `same chat or new chat` (NS-6 "Open step", 0023's returned work, any later case with it), and
`the current chat` replaces "this chat" in 0021's new-chat reason (§7). **Send, not Paste** (12 D3-7, PD-088): text beside
a Send control never says `Paste`; returned work's then-sentence is `Send it once …` with Send, `Paste it once …` without.

### 6.3 Short-form vocabulary (G-8)

- **Rule.** A short intent starts with the first word of its first line's intent (0021 §6.1, §6.2, 0023 §5.5); the
  table fixes the rest (09 G-8). An intent that opens with `Have the <noun>` or `Let the agent` gives the verb that
  follows, in its base form. A case another spec adds (0028) takes its short intent by this rule. NS-2 is the exception:
  its short intent names the target state, `Move back to Ready` (PD-086, A-003).
- **Short intents** (intents unchanged):

| Case | Intent | Short intent | Step short form |
| --- | --- | --- | --- |
| NS-2 | Put folder and status back in line | `Move back to Ready` (PD-086) | `Move back to Ready · /sdd-lifecycle` |
| NS-4, with or without plan | Find out what blocks | `Find blocker` (09 G-8) | `Find blocker · /sdd-plan` · `Find blocker · /sdd-overview` |
| NS-5 | Have the result verified | `Verify` | `Verify · /sdd-compile` |
| NS-6 open step | Continue with `<ID> <title>` | `Continue` | `Continue · Implement <ID>` |
| NS-6 plan without open step | Let the agent report where the plan stands | `Report` | `Report · /sdd-plan` |
| NS-6 returned work | Integrate the returned steps | `Integrate` | `Integrate · /sdd-plan` |
| NS-6 no sibling plan; NS-10 | Write the plan | `Write plan` | `Write plan · /sdd-plan` |
| NS-7 (D-4) | Start implementing: `<ID> <title>` · no open step: 0028 §6.5 | `Start` · `Report` | `Start · Implement <ID>` · `Report · /sdd-plan` |
| NS-8 | Add acceptance criteria | `Add criteria` | `Add criteria · /sdd-specify` |
| NS-9 | Have the spec challenged, then plan it | `Challenge` | `Challenge · /sdd-clarify` |

- **Step short form:** `<short intent> · <command short form>` (0021 §6.3) for every case; cards, Overview rows, tree and
  quick pick show the same string (0021 AC-006).
- **No "Next".** Cards and Overview rows show the step short form without a visible `Next` before it (a row's place says
  it, 09 G-8; cards follow, A-005); a visually hidden `Next step: ` starts the step text (WCAG 1.3.1). Tooltips stay full.

### 6.4 One coach line per spec and view (G-5, D-2, guideline 11)

A *view* (the area and the side panel beside it) shows a spec's coach line, visible without a `(?)` (13 K-3; Verify and
Review too), and `(?)` once. **Overview:** while the side panel shows the first Now row's spec (0019 A-002), the detail's
wins: the row keeps step text, Copy prompt or split button (and 0027 §6.3's line), without coach line and `(?)`; else it
shows them (0021 §6.5, §6.6). **Plan map:** the header's (D-2; 0025 §5.3). A focused `(?)` that goes hands focus to its
row's Copy prompt or split main part; its toggletip closes.

### 6.5 Now: at most five rows (G-9)

- **Order:** Blocked, by number then path; Review (finished plans too, D-1), oldest last change first: the card's day
  (0018 A-008), entries without a day last, ties by number then path (A-007); Active, by number then path.
- **Cap:** the first five. While more exist, `+ n more` (n = the rest, 0018 O-3's text) follows and asks for Board with
  the named set `Now` of every Now entry's stem, as O-3 for Up next (PD-041, A-008). Its first row is 0021's and 0024's
  "first Now row". No Now row is primary (13 K-5, proxy for 12 F-3): the one primary is the selected spec's Next step.

### 6.6 Compact ways (G-3)

The disclosure `Ways to run stage <n>` keeps its conditions, place and collapsed default (0023 §5.4, A-002; 0025's
navigation target excepted). Expanded:

1. **Radio group**, named by the disclosure's text: native radios In sequence, Subagents, Other agents, each labelled
   `<name>`, ` · <tag>` where tagged, then ` — <sentence>` (§7); one line each at 1600 px; Tab stop: the checked one.
2. **`(?)`** named `About these ways`, a toggletip as 0021 §6.6 states (one popup at a time with 0021's toggletips and
   0024's menu), holding §7's four paragraphs: 0023's M-08, then one per way.
3. **The checked way's part:** In sequence, Subagents — its stage prompt (0023 §5.4) in code with its secondary Copy
   prompt. Other agents — while 0023 §5.4's start lines show: M-10 and the start lines with their icon Copies, no stage
   prompt; while none show (Ready spec, next step outside the parallel group): its stage prompt with Copy prompt (A-011).

**Recommended way (D-3, A-009).** In sequence carries the tag `default` (FeatherSpec's default, `plans.md`); no other
way is tagged: the closing line (0023 §5.1) has no fixed form for a way, in 1.11.0 neither (OP-004), and prose is never
interpreted. The tagged radio is checked whenever the block first expands after the tab became visible or shows another
spec; a model update keeps the developer's choice (A-010). Tag text and a theme-variable style mark it, never colour
alone (guidelines 3, 9). Unchanged: no primary control and no Send in the block (0023 AC-010, 0024 AC-003, as 0025
amends them), path breaks (0022 §4.6), focus (0023 AC-012, PD-077).

## 7. Texts (English, PD-016; in the text modules, asserted literally; proxies, A-013)

| New | Replaces |
| --- | --- |
| Session word `current or new chat`; reasons `Current or new chat: the plan holds the state of the work; after a break, let the agent report first.` (below FeatherSpec 1.11.0; from 1.11.0 0028 §7's) · `New chat: a fresh session reads the files as a stranger would; what the current chat knows cannot be unread.` | `same chat or new chat`; `Same chat or new chat: …` (same rest) · `… what this chat knows …` |
| Short intents `Move back to Ready` · `Find blocker` · `Report` · `Write plan` · `Start` | `Fix status` · `Unblock` · `Resume` · `Plan` · `Build` |
| Cards, Overview rows: visually hidden `Next step: ` | visible `Next` |
| Main part name and tooltip `Send to <Name> (new chat): <line>` on every step | `Send to <Name> (current chat): <line>` on Copilot steps whose session is not `new chat` |
| Now: `+ <n> more` after the list; Board set label `Now` | — (no cap) |
| Way lines `In sequence` — `One chat builds the steps one after another.` · `Subagents` — `The chat hands each step to a subagent; subagents cannot ask you.` · `Other agents` — `Each step runs in another chat or worktree from its start line.` | 0023 §5.4's effect sentences, shown expanded |
| Tag `default` | — |
| Returned work's then-sentence while Send is offered: `Send it once every worker you started is back.` | 0023 §5.5's `Paste it once every worker you started is back.` (kept with Copy prompt alone) |
| `?`, name and tooltip `About these ways` | — |
| `(?)` paragraphs: 0023's M-08 unchanged; `In sequence: ` + 0023's In sequence effect; `Subagents: ` + 0023's Subagents effect; `Other agents: Each step runs from its own start line in another chat, tool or worktree and leaves a return note; a worktree holds committed files only, so commit first. Until start lines show here, the stage prompt has the chat propose that commit and print them. Once every worker is back, the next step integrates the returned steps.` | M-08 and the effects shown expanded |
| README: `The button opens a new chat for every step; the current chat is in the menu.` | `The default is a new chat where the step wants a fresh session … and the current chat otherwise.` |

*Amended by 0028 (PD-087, 12 B-1 (2)): the reason `… after a break, let the agent report first.` holds below FeatherSpec 1.11.0 or without a readable version; from 1.11.0 0028 §7's reason (0028 §6.4, AC-020).*

## 8. Error cases and edge cases

- Prose naming a way (`Recommended: in sequence …`, a negation, another language) → In sequence, `default` (D-3). Start
  lines appear or go while Other agents is checked → the part switches, focus as AC-013. The first Now spec changes while
  selected → §6.4 follows it. Review without a day → by number. Longer short intents (`Move back to Ready`) fill the
  tree's 32 characters sooner → the command short form alone (0022 §4.2). Restricted Mode, reader window → all holds.
- Start lines alone: no main session notes a stage base (`parallel-work.md` *Starting*); `/sdd-plan` integrates against
  `git status`, or from M-10's commit after a worktree merge (*Integrating* 1); AC-019 checks it.
- A draft lost through `Send to the current chat` is the developer's choice (09 §3). Whether Copilot's `newChat` keeps
  the draft of the chat that was current is untested (V-3 C4): if not, AC-019 fails and Gregor decides (09 §3).

## 9. Acceptance criteria

Node unit tests (core, stubbed host port) and jsdom component tests decide, each red against a stub first, unless marked
manual. Fixtures: 0021's per rule and NS-6 case (and 0028's), each with no assistant, Copilot and Claude Code;
`fs110-parallel-synthetic` without notes and with the DONE note; closing lines in 0023 §5.1's form and with way names in
prose; a stage `T-002 → T-003 ‖ T-004`, T-002 next; Now with five, six and eight entries. `fast` only in 0021 §6.5's literal.

- **AC-001** Where Send is offered, for every fixture and both assistants the main part shall carry target `new chat` and the name and tooltip `Send to <Name> (new chat): <line>`; its menu items shall be 0024 §6.3's in their order (Copilot: `Send to a new chat`, `Send to the current chat`, `Copy prompt`); when the developer activates the main part with Copilot the stub shall record exactly `workbench.action.chat.newChat` without argument, then `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true }`, and for `Send to the current chat` exactly the one `open` call.
  > **Given** Copilot, Active `.specs/active/0001-tip-splitter.md` with T-003 open **When** the developer activates the main part **Then** the stub records `newChat`, then `open` with `{ query: "Implement T-003 of .specs/active/0001-tip-splitter.plan.md", isPartialQuery: true }`.
- **AC-002** The coach line of NS-6 "Open step" and of 0023's returned work shall read `current or new chat · fast model`, and the toggletip's session paragraph shall be §7's reason literally, for NS-5 and NS-9 §7's new-chat reason; a case-insensitive search of `src` without test files, `package.json`, `README.md` and `docs/release-checklist.md` shall find neither `same chat` nor `this chat`.
  *Amended by 0028 (PD-087): AC-002 "§7's reason literally" — below 1.11.0 or without a readable version; from 1.11.0 0028 §7's reason (0028 AC-020).*
- **AC-003** For each fixture the step short form shall be the one §6.3's table gives for its case, the same string on the card, the Overview row, the tree description where 0022 §4.2's budget keeps the intent, and after `<state> · ` in the quick-pick description.
- **AC-004** For every step case of the text module, one fixture each, the short intent shall be non-empty and its first word shall equal the first word of the first line's intent, except the cases whose intent starts with `Have the ` or `Let the agent `, whose short intent shall be §6.3's verb (`Verify`, `Challenge`, `Report`), and NS-2, whose short intent shall be `Move back to Ready`.
- **AC-005** Every card and Overview row with a step shall render its step text as the visually hidden `Next step: `, then the short intent, ` · ` and the command short form in code; with its `.visually-hidden` elements removed the step text shall not contain `Next`; its tooltip shall stay 0021 AC-007's full form.
- **AC-006** While the selection is the first Now row's spec (stem and path), that row shall render no coach line and no `(?)`, and its step text and Copy prompt or split button shall equal the unselected render; with another spec or none selected it shall render 0021's coach line and `(?)`; the detail shall keep its coach line in both selected cases (0021 AC-009); when the selection moves to that spec while its `(?)` has focus, focus shall be on the row's Copy prompt or split button main part and no toggletip region shall hold text. 0025 AC-009 decides the Plan map's case (D-2).
- **AC-007** The Now section shall list the first five entries in Active, Review or Blocked in §6.5's order; while more exist it shall show `+ n more` after the list (n = the rest), and its activation shall send exactly one request for Board with the named set `Now` holding the stems of every Now entry.
  > **Given** Blocked 0009, 0004; Review 0003 (`Last updated: 2026-11-10`), 0007 (`2026-11-02`), 0005 (no day known); Active 0001, 0002, 0006 **Then** rows 0004, 0009, 0007, 0003, 0005, then `+ 3 more`; the set holds all eight stems.
- **AC-008** With exactly five Now entries the section shall show no `+ n more`, with six `+ 1 more`; with none, 0018 O-8's `Nothing in progress.`; the first row of §6.5's order shall carry 0021's coach line and `(?)` as §6.4 allows and, where Send is offered, 0024's split button, every later row its icon Copy (0022 §4.4).
- **AC-009** When the developer expands the ways block it shall hold, in DOM order, one `role="radiogroup"` named `Ways to run stage <n>` with exactly three `input type="radio"` of one name, labelled in order as §6.6 and §7 give them, exactly one checked; the `(?)` `About these ways`; the checked way's part; outside the toggletip region no element shall hold M-08 or an effect sentence of 0023 §5.4, and no stage prompt of an unchecked way shall be in the DOM.
- **AC-010** For every closing line in 0023 §5.1's form, for none, and for continuation prose naming `in sequence`, `subagents`, `other agents`, two ways or a negation, In sequence shall be the one tagged radio, with `default`, and checked, and the block's text shall not contain `recommended`; when the developer checks another way and a model update arrives, that way shall stay checked; when the tab becomes visible again or shows another spec, the tagged radio shall be the checked one again; the tagged option's class shall have a stylesheet rule that uses theme variables only (0013's CSS guard).
  > **Given** `fs110-parallel-synthetic` (`Parallel: stage 2 (add vs. subtract: separate files).`) **Then** In sequence, `default`. **Given** `… Recommended: in sequence, since both steps are small.` (0016's plan) **Then** In sequence, `default`.
- **AC-011** With In sequence or Subagents checked, the part shall be that way's stage prompt of 0023 §5.4 in code with a secondary Copy prompt (0023 AC-010); with Other agents checked, for an Active spec whose next step's parallel group holds two or more unfinished steps, M-10 and exactly 0023 AC-009's start lines with icon Copies and no `… with other agents` prompt; for a Ready spec or a stage whose next step is outside the group, `Implement the whole stage <n> of <plan path> with other agents` with a secondary Copy prompt and no M-10 or start line.
  > **Given** `fs110-parallel-synthetic` without notes, plan In Progress, Other agents checked **Then** M-10 and the start lines for T-003 and T-004, no `with other agents`. **Given** `T-002 → T-003 ‖ T-004` with T-002 next **Then** the `with other agents` prompt only.
- **AC-012** The ways' `(?)` shall behave as 0021 AC-014 states for a toggletip (Tab stop, name and tooltip `About these ways`, `aria-expanded`, `role="status"` region, closing by Escape, second activation, outside press and focus move, Escape closing only it, one popup at a time with 0021's toggletips and 0024's menu) and show §7's four paragraphs literally, with no focusable element.
- **AC-013** When a model update removes the ways block, a radio, the `(?)` or a part's Copy that had focus shall hand it to the map's heading (0023 AC-012 as PD-077 amended it); when the checked way's part changes while a radio has focus, focus shall stay on that radio; an update that keeps the block shall keep its expanded state and checked way.
- **AC-014** No Send, menu item, radio, `(?)` or `+ n more` shall create, change, move or delete a workspace file or write a setting (0017 AC-023's tests, 0024 AC-012 extended); AC-001–AC-013 shall hold in Restricted Mode and a reader window; every text of §7 shall come from a text module, and tests shall assert it literally; 0016's user-language sweep shall cover the ways block.
- **AC-015** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not change shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every title missing at the head, a renamed one included, with the changed statement or the head title that replaces it.
- **AC-016** The statements of §5 shall carry their notes and no PD row shall change; `README.md` and, under the version in preparation, `CHANGELOG.md` shall each contain `opens a new chat for every step`, `current or new chat`, `Find blocker`, `Move back to Ready`, `at most five` and `About these ways`; `README.md` shall contain none of `same chat`, `the current chat otherwise`, `**Next**`, `` `Plan · /sdd-plan` ``; `docs/release-checklist.md` shall carry AC-017–AC-019 and 0024 AC-017's line without `stays the default target`; `docs/product/design-brief.md` shall not contain `("Next", short form`.
- **AC-017** *(manual, preview harness by the orchestrator, then Gregor; guideline 12)* On `fs110-parallel-synthetic` without notes and a project with eight Now entries, Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open at its default width: the Overview with the first Now row selected and not selected, and the Plan map with the ways expanded and each way checked. The checker sees no short form, way line, tag or prompt cut; at 1600 px each way takes one line, and the expanded block with In sequence checked is at most half as tall as 0023's expanded block on the same fixture and width (about 400 px in r05); the checker tells the tagged way apart in High Contrast without colour; radios and `(?)` show a visible focus outline; arrow keys move the checked radio; screenshots and verdict in the plan.
- **AC-018** *(manual, Gregor; click test on an HTML draft before `/sdd-plan`, PD-082, 09 §7)* Task across views: from the Overview of `fs110-parallel-synthetic` without notes, with Copilot chosen, Gregor finds out how stage 2 could run with other agents, copies the start line for T-004, and says without asking which chat Send to Copilot opens for T-003 and what `Continue · Implement T-003` in Now means. It passes when he does all three without asking and without opening a Markdown file. The orchestrator notes each click and its view; Gregor confirms or changes §7's texts; a change is a revise of this spec. *Run 2026-11-19 (13): tasks 1–3, then ended; K-2, K-3, K-5 → AC-022–AC-024, the rest moves to real use (12 F-3).*
- **AC-019** *(manual, Gregor, on `tip-splitter` before the spec closes; GitHub Copilot and Claude Code, versions recorded)* From the detail and the first Now row of the Active spec the main part opens a new chat with the prompt in the input, nothing sent, and a draft typed beforehand in the previous Copilot chat is still there; `Send to the current chat` fills the current chat, and Gregor records whether a draft there was kept; with that spec selected the Overview shows one coach line; on 0023's re-cut copy with a `‖` stage (0023 OP-004) the start lines pasted after M-10's commit build their steps, and `/sdd-plan` integrates both without a finding.
- **AC-020** After the developer activates a Send to Copilot (main part or either Send item), the main part's tooltip and live region shall read `The prompt is in Copilot's chat. Check it, then send it there.` literally, the stub shall record exactly AC-001's calls and none that submits, and no text of the view shall say the prompt was sent; for Claude Code the same with `Claude Code's`.
- **AC-021** For 0023's returned work with Send offered, the toggletip's then-sentence shall be `Send it once every worker you started is back.`, and with Copy prompt alone `Paste it once every worker you started is back.`; in every render with a Send control, no text in the same step block shall start with `Paste`, and a case-insensitive search of the text modules' string literals shall find `paste` only in that Copy-prompt sentence, 0023's Other agents effect (start lines), 0021's tip closing `Choose the chat and the model in your AI assistant before you paste.` (Copy prompt alone; with Send, 0024's `sendTipText` replaces it), 0024's `None: Copy prompt` description and its fallback warning.
- **AC-022** When the developer opens the arrow part's menu, for every fixture and both assistants, `Send to a new chat` shall be a `menuitemradio` with `aria-checked="true"` and a check glyph (`aria-hidden`), Copilot's `Send to the current chat` a `menuitemradio` with `aria-checked="false"` and no glyph, and `Copy prompt` a `menuitem` with neither; names, order and keys shall stay AC-001's and 0024 §6.3's; after a Send through `Send to the current chat` the check shall stay on `Send to a new chat`; the main part's visible text shall stay `Send to Copilot` (`Send to Claude Code`).
- **AC-023** While `showStepTips` is true, for every case with a line, NS-5 (`Verify`) and 0028's finished plan in Review (D-1) included, the coach line shall render as text not inside a toggletip region, not `hidden` and not visually hidden, before any `(?)` is activated: in the detail after the first line, in 0025's Plan map header, and in the first Now row where §6.4 shows it; once per view (AC-006). *Example:* NS-5 and an all-ticked plan `In Progress` (0028) show `new chat · strong model, other family` in the detail without a click.
- **AC-024** Every Now row's Copy prompt and both parts of its split button shall render with the secondary colours (first row) or as the icon button (later rows), never primary; the Overview shall hold exactly one primary control while the selected spec's next step has a line (the side panel's, 0022 §4.4 (1)), none while 0025's U-08 makes that line quiet (0025 AC-026), and none while no spec is selected, the zero-spec state's Copy (0022 §4.4 (3)) apart. *Example:* AC-007's eight entries with 0004 selected: one primary, in the side panel; none selected: none.

## 10. Technical notes for developers or AI agents

- Send (`db71223`): `sendView.ts` `sendViewOf()` gives Copilot `target: 'current'` unless the case's session is `'new'`;
  PD-078 makes it `'new'`; `callsFor()` unchanged. Wording: `nextStepTexts.ts` (`STEP_GUIDES[case].short`, `then`,
  `SESSION_WORDS`, `SESSION_REASONS`, `NEXT_STEP_SHORT_LABEL`); `stepTips.ts`; `nextStep.ts` `shortForm()`; `StepText.tsx`.
- Now: `core/overview/rows.ts` (`NOW_ORDER`, no cap; `projectUpNext` → `{ rows, more, stems }`), `Now.tsx`, `namedSet()`,
  `cardLastChange()`. G-5: `SpecRow.tsx` `isSelectedSpec()`; hiding `.ov-coach` is presentation, the core keeps `tips`.
- Built first (`/sdd-plan`, 2026-11-19): 0028 freezes `nextStep()`, `stepView()` and the tips as snapshots
  (`nextStepBaseline.test.ts`, 0028 AC-010); this spec changes `stepView().intent` and the tips' wording only, so that test
  keeps its title and compares the Baseline after §7's replacements. `OverviewView.now` takes Up next's `{ rows, more, stems }`
  (guard, `PROTOCOL_VERSION` once more after 0025's); the host smoke `overview.smoke.test.ts` reads `now.rows`.
- Ways: `areas/planMap/Ways.tsx`, `planMapTexts.ts`, `PlanWaysView`; the tag is static, no new view field. jsdom does not
  move native radios by arrow key, so AC-017 checks the keys. Tests likely touched: `nextStep`, `stepView`, `stepTips`,
  `sendView`, `rows`, `Overview`, `SpecRow`, `Card`, `specTree`, `copyNextStep`, `Ways`, `planMap`, `userLanguage`,
  `webviewBundle`, `docsScan`, `sourceScan`, `noWrite`. A new module → `/sdd-architecture-update`, same change set.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The menu keeps `Send to a new chat` beside a main part that does the same (proxy) | 0024 already does so for Claude Code; the APG menu-button pattern lists every action; 09 §3 changes the default only | Menu items, AC-001 |
| A-002 | `Send to the current chat` gets no warning (proxy) | 09 §3: "Aktueller Chat bleibt im Menü"; the developer chose it explicitly | A lost draft through the menu; AC-019 records it |
| A-003 | Short intents as §6.3's table; `Have the …` and `Let the agent …` give the verb (proxy); NS-2's `Move back to Ready` is decided (PD-086) | 09 G-8 "das erste Wort der Absicht", its examples `Continue`, `Find blocker`; `Have` or `Let` alone says nothing; 11 §2 point 3: an idiom is the weakest form for non-native readers | §7, AC-003, AC-004; OP-007 |
| A-005 | "Next" leaves cards too; a visually hidden `Next step: ` stays (proxy) | One step text for cards and rows (`StepText`); WCAG 1.3.1: what the position tells must be in the markup | AC-005 |
| A-006 | G-5 holds for any place with a coach line, not only the first Now row (the Plan map's case: D-2); the row shifts when it goes (proxy) | Guideline 11 "once per view"; opening the side panel reflows the area anyway (guideline 8 is about feedback) | §6.4, AC-006, 0025 |
| A-007 | "Oldest Review" = the card's last change day, ascending (proxy) | 09 G-9 "älteste Review zuerst"; 0018 A-008's day exists and the Board shows it; it is the last plan edit, also for a finished plan that still says `In Progress` (D-1) | AC-007 |
| A-008 | `+ n more` sends the named set `Now` with every Now stem (proxy) | 09 G-9 "wie bei Up next"; 0018 O-3 does exactly that | AC-007 |
| A-009 | In sequence as `default`; no plan's way is read, prose never (D-3, confirmed by REPORT.md) | A plan has no recommendation field (0023 A-002), and FeatherSpec 1.11.0 adds none; prose in any `DocLanguage` can negate or name two ways; guideline 3 forbids calling FeatherSpec's default "recommended by the plan" | §6.6, AC-010, OP-004 |
| A-010 | Native radios; the choice resets on every showing, survives updates (proxy) | Guideline 4 (native first); 0023 §5.3 resets cards and ways the same way (PD-063 (5) pattern) | AC-009, AC-010 |
| A-011 | Other agents keeps its stage prompt while no start line shows (proxy) | 09 G-3 removes a duplicate that exists only beside start lines; without them the way would offer nothing (guideline 2) | AC-011 |
| A-012 | The ways' `(?)` is no session or model advice, so guideline 11's "once per view" does not count it (proxy) | Guideline 11 names session and model advice; its "full reasoning sits behind a `(?)`" fits the moved explanations | 0023 §3, AC-012 |
| A-013 | §7's texts stand as proxies after the click test (13); real use reviews them (12 F-3); the block shows 0023's prompts and start lines as they are | PD-082 process; FeatherSpec 1.11.0's fixed prompts equal 0023's byte for byte (REPORT.md, OP-004) | AC-018, OP-004 |

## 12. Open points

- OP-001 Closed by the click test (AC-018, `docs/ux-audit/13-clicktest-results.md`): K-2, K-3, K-5 applied; §7 stays proxy.
- OP-002 (0025's header coach line) closed by D-2 and §6.4 (`cross-spec-r3.md`); OP-003 (0028) closed: it takes `Report` by §6.3, and its `any chat` is no §6.2 word.
- OP-004 FeatherSpec 1.11.0 (PD-082 change 1, D-3): closed by `/home/claude/orch/featherspec-1.11.0/REPORT.md` — no fixed form for a way, so no tag but `default`; stage prompts and start lines already equal its fixed prompts.
- OP-005 `/sdd-clarify` 2026-11-19 (S93): 35 findings, resolved by the standing answer and D-1…D-3 (`0026-findings.md`); follow-up: D-4's NS-7 short forms (0028 §6.5) and OP-004 applied.
- OP-006 Decided yes (13 K-2; in task 2 the chevron was not looked for, which 12 B-5 counts as not found): the menu checks the active choice, the label stays `Send to Copilot` (§6.1, AC-022).
- OP-007 Closed (13): `Move back to Ready` (PD-086) stays a proxy; NS-2's `/sdd-lifecycle` aligns folder and status either way (0021 §6.2), so real use on `tip-splitter` (12 F-3) reviews the word.

## 13. Definition of Ready / Done and next steps

Ready: §6, §7 literal, §5 listed, OP-001 closed. Done: AC-001–AC-016, AC-020–AC-024 green with evidence, AC-017–AC-019
checked, §5 applied, docs and Memory Bank synced, `/sdd-compile` READY. Next: `/sdd-plan` (0028 first).
