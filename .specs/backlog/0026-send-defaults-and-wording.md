# Send Defaults and Wording

**Status:** Draft
**Plan:** _none yet_

Basis: work order `docs/ux-audit/09-round2-review.md` §3 (OP-004, the chat term), §4 (G-3, G-5, G-8, G-9), §7, §8;
screenshots `screenshots-48d1968/` r01, r02, r05, r06. Decisions **PD-078**, **PD-080**, PD-082 (scope, click test with a
task, real use), PD-068, PD-074, PD-041, PD-047, PD-063 (5), PD-077, PD-016; guidelines 1–3, 6–12. Builds on 0021, 0023,
0024, 0018 and 0022; restates none. Round 3: 0025 owns the Plan map's navigation, cards, header action and progress, 0028
the next-step rules, 0027 the attachment; this spec owns the ways block and the wording of short forms, coach lines and
Send targets. No interview (Gregor not reachable): each choice is a proxy in §11 that follows the review. Code: `db71223`.

## 1. Summary

Send to Copilot opens a **new chat** for every step; the current chat stays in the menu. The open chat has one name,
**current chat**. A short form is the first word(s) of its intent, without "Next" (`Find blocker · /sdd-plan`). A spec's
coach line shows once per view. Now lists at most five rows, then `+ n more`. The Plan map's ways become three lines with
the plan's way pre-selected, explanations in a `(?)`, and Other agents without the duplicate stage prompt.

## 2. Goal and problem

Prefilling Copilot's current chat replaces an unsent draft: data loss (09 §3, OP-004). Two words name one chat. Short
forms differ from the detail (`Next Unblock · /sdd-plan` beside `Find out what blocks`, r01, r06). Two coach lines show
for one spec (r02). The expanded ways take about 400 px (r05). Now has no cap (N-9). Goal: one click puts a step in a
fresh chat without risk, a step reads the same everywhere, three lines tell how to run a stage. Success: Gregor solves
the click-test task and names Send's chat without asking (AC-018); on `tip-splitter` no draft is lost (AC-019).

## 3. Users and roles

Developer, one role (0001–0007), with or without a chosen assistant (0024 §6.2).

## 4. Scope

### In scope

- Send's default target (§6.1); "current chat" (§6.2); short forms and "Next" (§6.3); one coach line (§6.4); Now (§6.5).
- The compact ways block (§6.6); the amendments of §5; README, CHANGELOG, release checklist, design brief.

### Out of scope

- Plan map navigation, cards, header action, progress, G-7's "Ways to run it" link — because 0025 owns them.
- Which step comes next (G-11, PD-081's all-ticked check) — because 0028 owns `nextStep()`; it takes its short intents by §6.3.
- The attachment line, `attachFiles`, `modelSelector` — because 0027 (PD-082, after V-3).
- New intents (the long lines) — because 0021's were confirmed in the click test (PD-073); G-8 aligns the short forms to them.
- A warning or confirmation on `Send to the current chat` — because 09 §3 keeps it in the menu as the developer's explicit choice (A-002).
- A setting for the default target — because PD-078 decides it in the product, and every setting is one more thing to explain.
- The stage prompts' wording — because 0023 A-007 holds; fixed FeatherSpec phrases are a FeatherSpec release (PD-082, A-013).
- A Claude Code "current chat" target (0024 OP-003), status bar, Up next, Board order — because the review asks no change there.

## 5. Amendments of other specs

Applied in the implementing change set as a note under each statement, "*Amended by 0026 (PD-078 | PD-080 | PD-082): …*",
after earlier notes. The PD register is not edited; PD-064 A-002 ("Now has no cap") is refined here.

| Spec · statement | Amendment |
| --- | --- |
| 0024 §6.3 *Main part* "Copilot `new chat` where the first line's session … is `new chat`, else `current chat`"; AC-004; A-007 | `new chat` for both assistants and every step (0026 §6.1, AC-001); A-007 void |
| 0024 §6.3 "0021's 'same chat' continues there" | "0021's coach line calls it current (`current or new chat`, PD-080)" |
| 0024 §8 "Unsent text in Copilot's current chat … (OP-004)"; OP-004; AC-017 "records whether unsent text in the current chat is kept or replaced (OP-004)" | OP-004 closed by PD-078; the draft is at stake only through the menu item `Send to the current chat`; AC-017 records it for that item; the checklist's "decide whether the current chat stays the default target" goes |
| 0021 §6.5 "`same chat or new chat`"; §6.2 table, case "Open step", Session; §6.6 reasons row `same chat or new chat`; AC-003 coach | `current or new chat`; reason of 0026 §7 |
| 0023 §5.5 "session · model `same chat or new chat`"; AC-013 coach; A-004 "session `same chat or new chat`" | `current or new chat` (0026 §6.2) |
| 0021 §6.1 Short intent column NS-2, NS-4 (both rows), NS-7, NS-10; §6.2 Short intent column "Plan without open step", "No sibling plan"; AC-005 `Resume · /sdd-plan`, `Plan · /sdd-plan`; A-005 "NS-7 `Build`" | 0026 §6.3's table; `Report · /sdd-plan`, `Write plan · /sdd-plan`; NS-7 shows `Start <ID>` alone (0026 A-004) |
| 0021 §6.3 "`Build · Start T-001`. Cards and Overview rows show it after 0017's 'Next'"; §7 row "Step short form" | 0026 §6.3: the command short form alone where it starts with the short intent; no visible "Next" |
| 0017 §7 row "Card, last line" (as 0021 amended) and AC-004 "'Next', the short form"; AC-012 "'Next', the short form"; A-006; 0018 O-5 "then 0017's 'Next', short form and Copy"; 0022 §4.1 table rows 420–686 px and below 420 px "'Next' with the short form" | The step short form without a visible "Next"; a visually hidden `Next step: ` precedes it (0026 §6.3, AC-005) |
| 0021 §6.5 "and in the first Now row"; AC-009 "the detail and the first Now row shall show §6.5's coach line"; 0018 O-5 (as 0021 amended) "the first Now row also carries the coach line and `?`"; 0022 §4.1 bullet "First Now row … the coach line and `?` follow its Copy prompt"; 0022 AC-001 "in the first Now row 0021's coach line and `?` shall follow" | Only while the side panel does not show that row's spec (0026 §6.4, AC-006) |
| 0018 O-2 "order Blocked, Review, Active, then number ascending, then path. No cap."; AC-004 "in the order of O-2, without a cap"; A-002; §7 row "Set labels" | 0026 §6.5 (order, five rows, `+ n more`); set label `Now` added |
| 0022 AC-011 "With seven Now rows"; A-004 and OP-004 (N-9) | "seven Now entries (five rows)"; N-9 is decided by 0026 §6.5 (09 G-9) |
| 0023 §5.4 "Expanded, in order: the lead M-08; then each way as name, effect sentence, prompt … and Copy prompt"; "Under *Other agents* … M-10, then … the start line"; A-006; §6 rows M-08 and "Ways, NS-6 case" (effects); AC-009 "expanded, M-08 and the three ways … with their effect sentences and prompts literally" | 0026 §6.6, AC-009–AC-011: radio group, `(?)` with M-08 and the effects, the checked way's part; Other agents' stage prompt only while no start line shows |
| 0023 §3 out of scope "A coach line or `(?)` in the Plan map — because guideline 11" | Except 0026's `About these ways`, which holds no session or model advice (A-012) |
| 0023 AC-012 "keeping expanded cards, the ways block's state" | The ways block's state includes the checked way; a radio counts as "a way" (0026 AC-013) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014; the test audits of 0025 and 0028 | Also except the tests 0026 AC-015 lists against a statement this table changes |

## 6. Business rules

### 6.1 Send target (PD-078)

Every split button's main part (0024 §6.3), wherever a spec places one (0025's Plan map header too), sends to **new
chat** with both assistants for every step; name and tooltip `Send to <Name> (new chat): <line>`. The menu stays as 0024
§6.3 lists it (A-001); `Send to the current chat` keeps its one `open` call, without a warning (A-002); 0024 §6.4–§6.6 hold.

### 6.2 One term (PD-080)

The open chat is the **current chat** in every visible text, tooltip, setting description and doc: `current or new chat`
replaces 0021's session `same chat or new chat` (NS-6 "Open step", 0023's returned work, any later case with it), with §7's reason.

### 6.3 Short-form vocabulary (G-8)

- **Rule.** A short intent is the first word(s) of its first line's intent (0021 §6.1, §6.2, 0023 §5.5): its first word
  is the intent's first word. An intent that opens with `Have the <noun>` or `Let the agent` gives the verb that
  follows, in its base form. A case another spec adds (0028) takes its short intent by this rule.
- **Short intents** (intents unchanged):

| Case | Intent | Short intent | Step short form |
| --- | --- | --- | --- |
| NS-2 | Put folder and status back in line | `Put back in line` | `Put back in line · /sdd-lifecycle` |
| NS-4, with or without plan | Find out what blocks | `Find blocker` (09 G-8) | `Find blocker · /sdd-plan` · `Find blocker · /sdd-overview` |
| NS-5 | Have the result verified | `Verify` | `Verify · /sdd-compile` |
| NS-6 open step | Continue with `<ID> <title>` | `Continue` | `Continue · Implement <ID>` |
| NS-6 plan without open step | Let the agent report where the plan stands | `Report` | `Report · /sdd-plan` |
| NS-6 returned work | Integrate the returned steps | `Integrate` | `Integrate · /sdd-plan` |
| NS-6 no sibling plan; NS-10 | Write the plan | `Write plan` | `Write plan · /sdd-plan` |
| NS-7 | Start implementing: `<ID> <title>` · Start implementing the plan | `Start` | `Start <ID>` · `Start · Implement` |
| NS-8 | Add acceptance criteria | `Add criteria` | `Add criteria · /sdd-specify` |
| NS-9 | Have the spec challenged, then plan it | `Challenge` | `Challenge · /sdd-clarify` |

- **Step short form:** `<short intent> · <command short form>` (0021 §6.3), except where the command short form starts
  with the short intent and a space: then the command short form alone (NS-7 with a step; guideline 1's "intent before
  command" deviates, named, A-004). Cards, Overview rows, tree and quick pick show the same string (0021 AC-006).
- **No "Next".** Cards and Overview rows show the step short form without a visible `Next` before it (the column says
  it, 09 G-8). The step text starts with a visually hidden `Next step: ` (WCAG 1.3.1, A-005). Tooltips keep 0021's full form.

### 6.4 One coach line per spec and view (G-5, guideline 11)

While the side panel shows a spec (0019 A-002: open ⇔ selected), no element of the area beside it shows that spec's
coach line or `(?)`. Today that is the first Now row (0021 §6.5, §6.6): it keeps its step text and its Copy prompt or
split button and leaves out coach line and `(?)`; with another spec or none selected it shows them as 0021 says. A later
place with a coach line (0025's Plan map header) follows this rule (OP-002). The detail keeps its coach line. A focused
`(?)` that goes hands focus to its row's Copy prompt or split button main part; its toggletip closes with it.

### 6.5 Now: at most five rows (G-9)

- **Order:** Blocked, by number then path; then Review, oldest last change first — the card's day (0018 A-008: the
  plan's `Last updated` day before the newer file day), entries without a day after those with one, ties by number then
  path (A-007); then Active, by number then path.
- **Cap:** the first five. While more exist, `+ n more` (n = the rest, 0018 O-3's text) follows the list and asks for
  Board with the named set `Now` holding the stems of every Now entry, as O-3 does for Up next (PD-041, A-008). The first
  row of this order is the "first Now row" of 0021 and 0024.

### 6.6 Compact ways (G-3)

The disclosure `Ways to run stage <n>` keeps its conditions, place and collapsed default (0023 §5.4, A-002). Expanded:

1. **Radio group**, named by the disclosure's text: three native radio buttons, In sequence, Subagents, Other agents,
   each labelled `<name>`, ` · <tag>` where the rule below gives one, then ` — <sentence>` (§7); one line each at 1600 px.
2. **`(?)`** named `About these ways`, a toggletip as 0021 §6.6 states (one popup at a time with 0021's toggletips and
   0024's menu), holding §7's four paragraphs: 0023's M-08, then one per way.
3. **The checked way's part:** In sequence, Subagents — its stage prompt (0023 §5.4) in code with its secondary Copy
   prompt. Other agents — while 0023 §5.4's start lines show: M-10 and the start lines with their icon Copies, no stage
   prompt; while none show (Ready spec, next step outside the parallel group): its stage prompt with Copy prompt (A-011).

**Recommended way.** 0023 §5.1's closing line (continuation lines joined), searched case-insensitively for `in sequence`,
`subagent`, `other agent`: exactly one found → that way, tag `recommended by the plan`; none or more → In sequence, tag
`default`, FeatherSpec's default (`plans.md`, `parallel-work.md`; A-009). The tagged radio is the checked one whenever the
block first expands after the tab became visible or shows another spec; a model update keeps the developer's choice
(A-010). Its tag text and a theme-variable style mark it, never colour alone (guidelines 3, 9). Unchanged: no primary
button in the map (0023 AC-010), path breaks (0022 §4.6), focus (0023 AC-012, PD-077).

## 7. Texts (English, PD-016; in the text modules, asserted literally; proxies, A-013)

| New | Replaces |
| --- | --- |
| Session word `current or new chat`; reason `Current or new chat: the plan holds the state of the work; after a break, let the agent report first.` | `same chat or new chat`; `Same chat or new chat: …` (same rest) |
| Short intents `Put back in line` · `Find blocker` · `Report` · `Write plan` · `Start` | `Fix status` · `Unblock` · `Resume` · `Plan` · `Build` |
| NS-7 step short form with a step `Start <ID>` | `Build · Start <ID>` |
| Cards, Overview rows: visually hidden `Next step: ` | visible `Next` |
| Main part name and tooltip `Send to <Name> (new chat): <line>` on every step | `Send to <Name> (current chat): <line>` on Copilot steps whose session is not `new chat` |
| Now: `+ <n> more` after the list; Board set label `Now` | — (no cap) |
| Way lines `In sequence` — `One chat builds the steps one after another.` · `Subagents` — `This chat hands each step to a subagent; subagents cannot ask you.` · `Other agents` — `Each step runs in another chat or worktree from its start line.` | 0023 §5.4's effect sentences, shown expanded |
| Tags `recommended by the plan` · `default` | — |
| `?`, name and tooltip `About these ways` | — |
| `(?)` paragraphs: 0023's M-08 unchanged; `In sequence: ` + 0023's In sequence effect; `Subagents: ` + 0023's Subagents effect; `Other agents: Each step runs from its own start line in another chat, tool or worktree and leaves a return note; a worktree holds committed files only, so commit first. Until start lines show here, the stage prompt has this chat propose that commit and print them. Once every worker is back, the next step integrates the returned steps.` | M-08 and the effects shown expanded |
| README: `The button opens a new chat for every step; the current chat is in the menu.` | `The default is a new chat where the step wants a fresh session … and the current chat otherwise.` |

## 8. Error cases and edge cases

- A closing line in another language names no English way → In sequence, `default`; a negation ("not with subagents")
  counts as naming it — accepted, the developer changes the radio (A-009).
- Start lines appear or go while Other agents is checked → the part switches; focus as AC-013. The first Now spec changes
  while selected → §6.4 follows the spec, not the position. Review entries without any day → by number.
- With start lines alone the main session notes no stage base; after M-10's commit `/sdd-plan` integrates against `git
  status` (`parallel-work.md` *Integrating* 1); AC-019 checks it. A draft lost through `Send to the current chat` is the
  developer's explicit choice (09 §3); AC-019 records it. Restricted Mode, reader window → all holds; nothing is written.

## 9. Acceptance criteria

Decided by Node unit tests (core, stubbed host port) and jsdom component tests, each red against a stub before the code,
unless marked manual. Fixtures: 0021's per rule and NS-6 case (0028's cases once they exist), each with no assistant,
Copilot and Claude Code; `fs110-parallel-synthetic` without notes and with the DONE note; plans whose closing line names
each way, none, two; a stage `T-002 → T-003 ‖ T-004` with T-002 next; Now with five and eight entries. `fast` stands only
inside 0021 §6.5's literal (0021 §9's exception).

- **AC-001** Where Send is offered, for every fixture and both assistants the main part shall carry target `new chat` and the name and tooltip `Send to <Name> (new chat): <line>`; its menu items shall be 0024 §6.3's in their order; when the developer activates the main part with Copilot the stub shall record exactly `workbench.action.chat.newChat` without argument, then `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true }`, and for `Send to the current chat` exactly the one `open` call.
  > **Given** Copilot, Active `.specs/active/0001-tip-splitter.md` with T-003 open **When** the developer activates the main part **Then** the stub records `newChat`, then `open` with `{ query: "Implement T-003 of .specs/active/0001-tip-splitter.plan.md", isPartialQuery: true }`.
- **AC-002** The coach line of NS-6 "Open step" and of 0023's returned work shall read `current or new chat · fast model`, and the toggletip's session paragraph shall be §7's reason literally; a case-insensitive search of `src` without test files, `package.json`, `README.md` and `docs/release-checklist.md` shall find no `same chat`.
- **AC-003** For each fixture the step short form shall be the one §6.3's table gives for its case, the same string on the card, the Overview row, the quick-pick description and the tree description where 0022 §4.2's budget keeps the intent.
- **AC-004** For every step case of the text module, one fixture each, the short intent shall be non-empty and its first word shall equal the first word of the first line's intent, except the cases whose intent starts with `Have the ` or `Let the agent `, whose short intent shall be §6.3's verb (`Verify`, `Challenge`, `Report`).
- **AC-005** Every card and Overview row with a step shall render its step text as the visually hidden `Next step: `, then the short intent, ` · ` and the command short form in code (NS-7 with a step: the command short form alone); with visually hidden elements removed the step text shall not contain `Next`; its tooltip shall stay 0021 AC-007's full form.
- **AC-006** While the selection is the first Now row's spec (stem and path), that row shall render no coach line and no `(?)`, and its step text and Copy prompt or split button shall equal the unselected render; with another spec or none selected it shall render 0021's coach line and `(?)`; the detail shall keep its coach line in both selected cases (0021 AC-009); when the selection moves to that spec while its `(?)` has focus, focus shall be on the row's Copy prompt or split button main part and no toggletip region shall hold text.
- **AC-007** The Now section shall list the first five entries in Active, Review or Blocked in §6.5's order; while more exist it shall show `+ n more` after the list (n = the rest), and its activation shall send exactly one request for Board with the named set `Now` holding the stems of every Now entry.
  > **Given** Blocked 0009, 0004; Review 0003 (`Last updated: 2026-11-10`), 0007 (`2026-11-02`), 0005 (no day known); Active 0001, 0002, 0006 **Then** rows 0004, 0009, 0007, 0003, 0005, then `+ 3 more`; the set holds all eight stems.
- **AC-008** With exactly five Now entries the section shall show no `+ n more`; with none, 0018 O-8's `Nothing in progress.`; the first row of §6.5's order shall carry 0021's coach line and `(?)` as §6.4 allows and, where Send is offered, 0024's split button, every later row its icon Copy (0022 §4.4).
- **AC-009** When the developer expands the ways block it shall hold, in DOM order, one radio group named `Ways to run stage <n>` with exactly three `input type="radio"` of one name, labelled in order as §6.6 and §7 give them, exactly one checked; the `(?)` `About these ways`; the checked way's part; outside the toggletip region no element shall hold M-08 or an effect sentence of 0023 §5.4, and no stage prompt of an unchecked way shall be in the DOM.
- **AC-010** For closing lines naming only `in sequence`, only `subagents`, only `other agents`, none, and two ways (case-insensitive), the tagged and checked radio shall be In sequence, Subagents, Other agents with `recommended by the plan`, then In sequence with `default` twice; no other radio shall carry a tag; when the developer checks another way and a model update arrives, that way shall stay checked; when the tab becomes visible again or shows another spec, the tagged radio shall be the checked one again; the tagged option's class shall have a stylesheet rule that uses theme variables only (0013's CSS guard).
  > **Given** `fs110-parallel-synthetic` (`Parallel: stage 2 (add vs. subtract: separate files).`) **Then** In sequence, `default`. **Given** the closing `Recommended: in sequence, since both steps are small.` **Then** In sequence, `recommended by the plan`.
- **AC-011** With In sequence or Subagents checked, the part shall be that way's stage prompt of 0023 §5.4 in code with a secondary Copy prompt (0023 AC-010); with Other agents checked, for an Active spec whose next step's parallel group holds two or more unfinished steps, M-10 and exactly 0023 AC-009's start lines with icon Copies and no `… with other agents` prompt; for a Ready spec or a stage whose next step is outside the group, `Implement the whole stage <n> of <plan path> with other agents` with a secondary Copy prompt and no M-10 or start line.
  > **Given** `fs110-parallel-synthetic` without notes, plan In Progress, Other agents checked **Then** M-10 and the start lines for T-003 and T-004, no `with other agents`. **Given** `T-002 → T-003 ‖ T-004` with T-002 next **Then** the `with other agents` prompt only.
- **AC-012** The ways' `(?)` shall behave as 0021 AC-014 states for a toggletip (Tab stop, name and tooltip `About these ways`, `aria-expanded`, `role="status"` region, closing by Escape, second activation, outside press and focus move, Escape closing only it, one popup at a time with 0021's toggletips and 0024's menu) and show §7's four paragraphs literally, with no focusable element.
- **AC-013** When a model update removes the ways block, a radio, the `(?)` or a part's Copy that had focus shall hand it to the map's heading (0023 AC-012 as PD-077 amended it); when the checked way's part changes while a radio has focus, focus shall stay on that radio; an update that keeps the block shall keep its expanded state and checked way.
- **AC-014** No Send, menu item, radio, `(?)` or `+ n more` shall create, change, move or delete a workspace file or write a setting (0017 AC-023's tests, 0024 AC-012 extended); AC-001–AC-013 shall hold in Restricted Mode and a reader window; every text of §7 shall come from a text module and be asserted literally; 0016's user-language sweep shall cover the ways block.
- **AC-015** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not change shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every title missing at the head, a renamed one included, with the changed statement or the head title that replaces it.
- **AC-016** The statements of §5 shall carry their notes and no PD row shall change; `README.md` shall contain `opens a new chat for every step`, `current or new chat`, `+ n more`, `recommended by the plan` and `About these ways`, and neither `same chat` nor `the current chat otherwise`; `CHANGELOG.md` under the version in preparation shall name `new chat`, `current chat`, `Now` and `Ways`; `docs/release-checklist.md` shall carry AC-017–AC-019 and 0024 AC-017's line as §5 amends it; `docs/product/design-brief.md` shall not contain `("Next", short form`.
- **AC-017** *(manual, preview harness by the orchestrator, then Gregor; guideline 12)* On `fs110-parallel-synthetic` without notes and a project with eight Now entries, Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open at its default width: the Overview with the first Now row selected and not selected, and the Plan map with the ways expanded and each way checked. No short form, way line, tag or prompt is cut; at 1600 px each way takes one line, and the expanded block with In sequence checked is at most half as tall as 0023's expanded block on the same fixture and width (about 400 px in r05); the tagged way is told apart in High Contrast without colour; radios and `(?)` show a visible focus outline; arrow keys move the checked radio; screenshots and verdict in the plan.
- **AC-018** *(manual, Gregor; click test on an HTML draft before `/sdd-plan`, PD-082, 09 §7)* Task across views: from the Overview of `fs110-parallel-synthetic` without notes, with Copilot chosen, Gregor finds out how stage 2 could run with other agents, copies the start line for T-004, and says without asking which chat Send to Copilot opens for T-003 and what `Continue · Implement T-003` in Now means. The orchestrator notes each click and its view; Gregor confirms or changes §7's texts; a change is a revise of this spec.
- **AC-019** *(manual, Gregor, on `tip-splitter` before the spec closes; GitHub Copilot and Claude Code, versions recorded)* From the detail and the first Now row of the Active spec the main part opens a new chat with the prompt in the input, nothing sent, and a draft typed beforehand in the previous Copilot chat is still there; `Send to the current chat` fills the current chat, and Gregor records whether a draft there was kept; with that spec selected the Overview shows one coach line; on 0023's re-cut copy with a `‖` stage (0023 OP-004) the start lines pasted after M-10's commit build their steps, and `/sdd-plan` integrates both without a finding.

## 10. Technical notes for developers or AI agents

- Send (`db71223`): `core/assistant/sendView.ts` `sendViewOf()` sets `target: 'current'` for Copilot when
  `STEP_GUIDES[case].session !== 'new'` → PD-078 makes it `'new'`; `SendView { assistant, target, targets }`; calls in
  `core/assistant/assistants.ts` `callsFor()`, unchanged.
- Wording: `shared/protocol/nextStepTexts.ts` holds `STEP_GUIDES[case].short`, `SessionKey 'sameOrNew'`, `SESSION_WORDS`,
  `SESSION_REASONS`, `stepShortForm()`, `NEXT_STEP_SHORT_LABEL = 'Next'`; `core/board/stepTips.ts` builds coach and
  toggletip; `core/board/nextStep.ts` `stepView()` → `{ intent, short: shortForm(first) }` (`Start <ID>` for NS-7).
  Consumers: `webview/ui/StepText.tsx` (cards, Overview rows), `core/shell/specTree.ts`, `core/copyNextStep/copyNextStep.ts`.
- Now: `core/overview/rows.ts` (`NOW_ORDER` by number, no cap; the first row gets `tips` and `send`; `projectUpNext` →
  `{ rows, more, stems }`, `UP_NEXT_LIMIT = 3`); `areas/overview/Now.tsx`, `Drill`, `moreText`, `requests.ts`
  `namedSet()`; the day from `core/board/lastChange.ts` `cardLastChange()`. Proposal: `now` takes Up next's shape.
- G-5: `SpecRow.tsx` already reads the selection (`isSelectedSpec()`); the coach sits in `.ov-coach` with
  `ui/Toggletip.tsx` and `ui/popup.ts`. Hiding is presentation; the core keeps sending `tips`.
- Ways: `areas/planMap/Ways.tsx` (disclosure; name, effect, prompt, secondary Copy per way; start lines under Other
  agents); texts `planMapTexts.ts` (`WAYS`, `WAYS_LEAD_TEXT`, `START_LINES_LEAD_TEXT`, `stagePrompt`); `PlanWaysView {
  stage, prompts, startLines }`. Proposal: the core adds `recommended { way, byPlan }` (`core/planMap/`); protocol
  version up. jsdom does not move native radios by arrow key, so AC-017 checks the keys. 0025's G-7 link opens this block.
- Tests likely touched: `nextStep`, `stepView`, `stepTips`, `sendView`, `rows`, `Overview`, `SpecRow`, `Card`,
  `specTree`, `copyNextStep`, `Ways`, `planMap`, `userLanguage`, `webviewBundle`, `docsScan`, `sourceScan`, `noWrite`.
  A new source module, if any → `/sdd-architecture-update` in the same change set.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The menu keeps `Send to a new chat` beside a main part that does the same (proxy) | 0024 already does so for Claude Code; the APG menu-button pattern lists every action; 09 §3 changes the default only | Menu items, AC-001 |
| A-002 | `Send to the current chat` gets no warning (proxy) | 09 §3: "Aktueller Chat bleibt im Menü"; the developer chose it explicitly | A lost draft through the menu; AC-019 records it |
| A-003 | Short intents as §6.3's table; `Have the …` and `Let the agent …` give the verb (proxy) | 09 G-8 "das erste Wort der Absicht", its examples `Continue`, `Find blocker`; `Have` or `Let` alone says nothing | §7, AC-003, AC-004 |
| A-004 | NS-7 shows `Start <ID>` alone, named deviation from guideline 1 (proxy) | The rule gives `Start · Start T-001`, the stutter 0021 A-005 rejected; the command says the intent | AC-003, AC-005 |
| A-005 | "Next" leaves cards too; a visually hidden `Next step: ` stays (proxy) | One step text for cards and rows (`StepText`); WCAG 1.3.1: what the position tells must be in the markup | AC-005 |
| A-006 | G-5 holds for any place with a coach line, not only the first Now row; the row shifts when it goes (proxy) | Guideline 11 "once per view"; opening the side panel reflows the area anyway (guideline 8 is about feedback) | §6.4, AC-006, 0025 |
| A-007 | "Oldest Review" = the card's last change day, ascending (proxy) | 09 G-9 "älteste Review zuerst"; a Review plan is `Done`, its last update is when it went to review; 0018 A-008's day exists already | AC-007 |
| A-008 | `+ n more` sends the named set `Now` with every Now stem (proxy) | 09 G-9 "wie bei Up next"; 0018 O-3 does exactly that | AC-007 |
| A-009 | The plan's way is read from the closing line's way names; otherwise In sequence as `default` (proxy) | A plan has no recommendation field (0023 A-002); 3 of 20 plans here write "Recommended: in sequence"; guideline 3 forbids calling FeatherSpec's default "recommended by the plan" | §6.6, AC-010 |
| A-010 | Native radios; the choice resets on every showing, survives updates (proxy) | Guideline 4 (native first); 0023 §5.3 resets cards and ways the same way (PD-063 (5) pattern) | AC-009, AC-010 |
| A-011 | Other agents keeps its stage prompt while no start line shows (proxy) | 09 G-3 removes a duplicate that exists only beside start lines; without them the way would offer nothing (guideline 2) | AC-011 |
| A-012 | The ways' `(?)` is no session or model advice, so guideline 11's "once per view" does not count it (proxy) | Guideline 11 names session and model advice; its "full reasoning sits behind a `(?)`" fits the moved explanations | 0023 §3, AC-012 |
| A-013 | §7's texts stand until the click test (proxy); FeatherSpec's fixed stage prompts (PD-082) are not awaited | PD-082 process; a FeatherSpec release would change 0023's prompts, which this block shows as they are | AC-018; a revise of 0023 |

## 12. Open points

- OP-001 Click test with a task on an HTML draft (AC-018, PD-082). **Blocking for `/sdd-plan`.**
- OP-002 Cross-spec with 0025 (parallel): its Plan map header's coach line (PD-081 part 2) goes under §6.4 while the side
  panel beside the map shows the same spec (from a 900 px panel); its Send takes §6.1's target; G-7's link expands §6.6's
  block. Recommendation: 0025 cites §6.1, §6.4, §6.6; the orchestrator reconciles both.
- OP-003 Cross-spec with 0028: its cases take short intents by §6.3 (`Let the agent report …` → `Report`) and §6.2's
  session word; AC-004 checks every case. Recommendation: 0028 cites §6.2 and §6.3.

## 13. Definition of Ready / Done and next steps

Ready: §6, §7 literal, §5 listed, OP-001 closed, OP-002 and OP-003 reconciled. Done: AC-001–AC-016 green with evidence,
AC-017–AC-019 checked, §5 applied, docs and Memory Bank synced, `/sdd-compile` READY. Next: `/sdd-clarify` in a fresh
session, the click test, then `/sdd-plan` (order 0028 → 0025 → 0026 → 0027).
