# Plan-State-Aware Next Step

**Status:** Draft
**Plan:** _none yet_

Basis: review `docs/ux-audit/09-round2-review.md` (2026-11-19) G-11 and §8; Gregor's PD-081 after real use on
`sdd-tip-splitter` (`docs/ux-audit/screenshots-48d1968/g-r2-03…05`). Decisions PD-081, PD-082, PD-072, PD-021, PD-013,
PD-016, PD-047; guidelines 1, 3, 6, 10–12 (`.claude/rules/ux-guidelines.md`). Gregor answers only asynchronously: no
interview, proxies in §11. This spec owns the next-step rules (`src/core/board/nextStep.ts`). 0025 shows what `nextStep()`
returns, also in the Plan map header. 0026 owns the wording of short forms and coach lines, and the Send targets.

## 1. Summary

Two plan states change an Active spec's next step. **Finished plan:** every plan step ticked (or struck) makes the check,
`/sdd-compile`, the next step, whatever the plan's `Status:` line says (PD-081). **Report first:** when the plan's `Current
step` names an unfinished step other than the open one, `/sdd-plan` comes first under "Let the agent report first — the plan
and the ticks may differ", the continue line second (G-11). Otherwise 0021's variant A stays (PD-072). The rules read only
spec, sibling plan and return notes, so every FeatherSpec version behaves the same.

## 2. Goal and problem

On `sdd-tip-splitter` the implementing agent ticked T-006 but left `Status: In Progress`. The Studio then showed "Let the agent
report where the plan stands" (`/sdd-plan`), and the Plan map showed six ticks and no action (g-r2-03, g-r2-04). It showed
the check only after `/sdd-plan` had set `Done` (g-r2-05). FeatherSpec does not need that round trip. `plans.md` says "With
the last step ticked, set `Status: Done` … and recommend `/sdd-compile`". `/sdd-compile` (*Plan state*: "open vs. finished
steps") and `/sdd-lifecycle` (*Before `done/`*: "every step ticked") judge the ticks, and `/sdd-lifecycle`'s closing edit
writes `Status: Done` itself. Second gap: after a break, `Implement <ID>` does not bring missing ticks level while
`/sdd-plan` does (PD-072, V-1 case 4), and the user has to notice the break himself (09 G-11). Goal: the check as soon as
the ticks say the work is done, the report first where the plan shows it may not match the work, variant A otherwise.

## 3. Users and roles

Developer, one role (0001–0007). The AI assistant receives only the prompt.

## 4. Scope

### In scope

- In `nextStep()`: the finished-plan rule (§6.1), the report-first case (§6.2) and the order of an Active spec's cases (§6.3).
- The texts of §7; the amendments of §5; README, CHANGELOG and the release checklist.

### Out of scope

- The board state of a finished plan (Review, the badge, the Now order, the Board column) — because PD-081 names the next
  step only, and PD-021 (4) derives Review from `Status: Done`. OP-001 asks Gregor.
- Words in `Current step` ("done", "abgeschlossen") — because the field is free text in any `DocLanguage` (A-005).
- Other signs (a filled `Verified:` without a tick, the handoff's `Next action`, Git state) — because G-11 names two signs
  and the Studio reads FeatherSpec files only (PD-013).
- A Problem or format note for a status line that lags the ticks — because it is no contradiction, and `/sdd-compile`'s
  *Docs sync* reports it ("Do the spec and plan statuses match …?") (guideline 3).
- Ready and Backlog specs with a finished plan — because no work has started on them; NS-7 is unchanged.
- The Plan map header action; short-form and coach-line wording, Send targets — because 0025 (PD-081 part 2) and 0026
  (G-8, PD-078, PD-080) own them.
- FeatherSpec's own changes (reconcile ticks on `Implement T-00x`; fixed prompts) — because PD-082 builds them in the
  FeatherSpec repository. The Studio keeps its rules for older versions (A-011).

## 5. Amendments of other specs

The implementing change set adds a note directly under each statement: "*Amended by 0028 (PD-081): …*", or "(PD-082)" for
the rows that come from G-11. The PD register is not edited. Where 0025 or 0026 also amend a statement, their notes come
first and this note refers to them (round-3 conflict rule).

| Spec · statement | Amendment |
| --- | --- |
| 0015 §6.1 row NS-5 "Review" | Review, or Active with a finished sibling plan and no return note of the spec (0028 §6.1) |
| 0015 §6.1 row NS-6 (as 0017, 0021 and 0023 amended it) | A finished plan is NS-5; 0028 §6.2's case "Report first" comes before 0021's case "Open step" |
| 0021 §6.2 table, row "Open step"; AC-003 | Holds only while 0028's case "Report first" does not (0028 AC-004, AC-005) |
| 0021 §6.2 table, row "Plan without open step" (its entry, effect and then-sentence; its short intent is 0026's); AC-005 "whose sibling plan has no open step" | Not for a finished plan (0028 AC-001); the effect and then-sentence of 0028 §7 |
| 0023 §5.4 "(its next step is NS-6's case "Open step", 0021 §6.2, or NS-7)"; AC-009 | "Report first" is not "Open step", so no ways show while it holds (0028 AC-007); the ways' content stays 0026's (G-3) |
| 0023 AC-013 "without a note NS-6 shall be as 0021 AC-003 and AC-005" | 0021 AC-003 and AC-005 as 0028's notes leave them |
| PD-072 "line 2 is the way after a break" | Refined by 0028 (register not edited): where the plan shows the sign of §6.2, the report is line 1 |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014 (test audits) | Also excepts the tests that 0028 AC-012 lists against a statement this table replaces |

## 6. Business rules

*Open step*: the first plan step that 0002 reports neither ticked nor struck, an undetermined tick counting as not ticked
(0015 NS-7, `openStep()`); *return note*: 0023 §5.5. The rules read only spec, sibling plan and return notes (PD-013).

### 6.1 Finished plan → the check (PD-081 part 1)

A sibling plan is **finished** when it is readable, 0002 reports at least one of its steps ticked, and every step is ticked
or struck. While an Active spec has a finished plan and no return note, its next step is NS-5, exactly as for a Review spec:
rule, lines, case, intents, short intent, coach line, toggletip and Send target (0021 §6.1 row NS-5; 0024 §6.2). The plan's
`Status:` line does not matter, and the board state stays Active (A-002). Sources: `plans.md` *A finished plan ends the work
here*; `sdd-compile.md` *Plan state*; `sdd-lifecycle.md` *Before `done/`* and its closing edit; `sdd-plan.md` Mode B step 4.

### 6.2 Report first (G-11, PD-082)

**The sign:** the plan's `Current step` header (0002) has a value, not a placeholder; that value names at least one step that
is neither ticked nor struck; and none of the steps it names is the open step. A step counts as named when a `T-<digits>`
token in the value equals one of the plan's step IDs. While the sign holds, the next step is NS-6 case "Report first":
line 1 `/sdd-plan <spec path>` under `Let the agent report first — the plan and the ticks may differ`; line 2
`Implement <ID> of <plan path>` under `Continue with <ID> <title>` (0021's line 1, unchanged); short intent `Report` (0026
§6.3's rule gives the same), coach line `any chat · fast model`, and the effect and then-sentence of §7.

A `Current step` naming only ticked or struck steps lags the ticks, the normal state inside a stage, and gives no sign
(A-004). G-11's second sign, a return note, is 0023 §5.5's returned work, unchanged (A-006).

### 6.3 Order of an Active spec's cases (first match wins)

| # | Case | Owner |
| --- | --- | --- |
| 1 | A return note of the spec lies → returned work | 0023 §5.5 |
| 2 | No sibling plan → Write the plan | 0021 §6.2 |
| 3 | Finished plan → NS-5 | 0028 §6.1 |
| 4 | No open step (unreadable plan, no step, every step struck) → Plan without open step | 0021 §6.2, narrowed by §5 |
| 5 | The sign of §6.2 → Report first | 0028 §6.2 |
| 6 | Open step → variant A | 0021 §6.2 (PD-072) |

Two states come before these cases, whatever the ticks say (PD-021, A-009): a plan `Blocked` or a BLOCKED return note keeps
the spec Blocked (NS-4), and a plan `Done` keeps it in Review (NS-5).

### 6.4 Every FeatherSpec version

No rule reads `FeatherSpecVersion`. A plan without a `Current step` line, or with a value that names no step, gives no sign,
and ticks are read in every step dialect 0002 knows. The rules stay in place after FeatherSpec reconciles ticks on
`Implement T-00x` (PD-082), because plans written by older versions stay in projects (A-011).

## 7. Texts (English, PD-016; in `src/shared/protocol/nextStepTexts.ts`, asserted literally; proxies, A-008)

| New | Replaces |
| --- | --- |
| Report first, line 1 intent: `Let the agent report first — the plan and the ticks may differ` | — |
| Report first, short intent `Report`; step short form `Report · /sdd-plan` | — |
| Report first, effect: `The agent checks the plan against the code, brings the ticks and the handoff level and reports where the work stands; it builds nothing yet.` | — |
| Report first, then: `When the plan and the ticks agree, the Studio shows the step to continue with.` | — |
| Finished plan: NS-5's texts (0021 §6.1), unchanged | On such a spec: `Let the agent report where the plan stands`, `Resume · /sdd-plan`, `any chat · fast model` |
| Plan without open step, effect: `The agent checks the plan against the code and reports where it stands.` | `The agent checks the plan against the code; with every step ticked it closes the plan and recommends the review.` |
| Plan without open step, then: `The spec then shows its next step.` | `The spec then shows Verify.` |

Reused unchanged: line 2's `Continue with <ID> <title>`, the coach line `any chat · fast model` and its reasons (0021 §6.6).

## 8. Error cases and edge cases

Precedence, struck-only and step-less plans, undetermined ticks and `Current step` values: §6.3 and AC-001–AC-005.
- A range such as `T-011…T-016` in `Current step` names only the two IDs written.
- The step changes while a toggletip or the Send menu is open → 0021 AC-014, 0024 AC-010. Restricted Mode, reader window →
  as usual (0021 AC-018).

## 9. Acceptance criteria

Automated tests in Node or jsdom decide every criterion unless marked manual. In-memory fixtures (`modelOf`): Active
`.specs/active/0001-tip-splitter.md`, plan `.specs/active/0001-tip-splitter.plan.md`, T-001…T-006 in three stages as in
g-r2-04. The token `fast` appears only in backticks as literal UI text (the vocabulary exception 0021 §9 names).

- **AC-001** While an Active spec has no return note and a finished sibling plan (§6.1), `nextStep()` shall return rule
  `NS-5`, case `NS-5` and the two lines of 0021 AC-001's NS-5 example with its own paths, for a plan status line of
  `In Progress` or `Not started` and for a plan with no status line. The detail's next-step view (lines, tips, send) shall
  deep-equal the view of the same spec whose plan says `Done`, for each value of `featherspec-studio.assistant`.
  > **Given** Active `0001-tip-splitter`, plan `Status: In Progress`, T-001…T-006 ticked **Then** `Have the result verified`
  > over `/sdd-compile .specs/active/0001-tip-splitter.md`, `Then, after a READY verdict: close the spec` over
  > `/sdd-lifecycle .specs/active/0001-tip-splitter.md`, short form `Verify · /sdd-compile`, coach `new chat · strong model, other family`.
- **AC-002** Where the sibling plan of an Active spec without a return note has no open step and is not finished (every step
  struck and none ticked, no step, or unreadable), `nextStep()` shall return the case "Plan without open step" of 0021 AC-005,
  with the effect and then-sentence of §7. Where one step's tick is undetermined and every other step is ticked, it shall
  return 0021 AC-003's lines for that step.
- **AC-003** If an Active spec with a finished plan also has a return note, `nextStep()` shall return 0023 AC-013's returned
  work. If its plan says `Blocked` or a note says BLOCKED, it shall return NS-4 with `/sdd-plan <spec path>`. If its plan says
  `Done`, it shall return NS-5 with the spec in Review. Each result shall be deep-equal to the result at the commit on which
  this spec's implementation starts.
- **AC-004** While an Active spec has no return note, its sibling plan's open step is `<ID>` and the plan shows the sign of
  §6.2, `nextStep()` shall return rule `NS-6` with line 1 `/sdd-plan <spec path>` under `Let the agent report first — the
  plan and the ticks may differ`, and line 2 `Implement <ID> of <plan path>` under `Continue with <ID> <title>`. The step
  short form shall be `Report · /sdd-plan`, the coach line `any chat · fast model`, and the toggletip's first paragraph the
  effect and then-sentence of §7, literally and from the text module.
  > **Given** T-001 and T-002 ticked, T-003 "Reject money values" and T-004 open, `**Current step:** T-004` **Then** `Let the
  > agent report first — the plan and the ticks may differ` over `/sdd-plan .specs/active/0001-tip-splitter.md`, then
  > `Continue with T-003 Reject money values` over `Implement T-003 of .specs/active/0001-tip-splitter.plan.md`.
- **AC-005** `nextStep()` shall return 0021 AC-003's variant A, deep-equal to its result at the commit on which this spec's
  implementation starts, for each of these `Current step` values, one fixture each: absent; empty; `—`; `none (all steps
  ticked)`; the open step alone (`T-003`) or with other steps (`T-003 ‖ T-004`, `T-003 and T-005`); only ticked or struck
  steps (`T-002` after T-002's tick, inside a stage); only IDs the plan lacks (`T-099`).
- **AC-006** For the fixtures of AC-001 and AC-004, these surfaces shall show that step, in the form 0021 §6.3 and 0022 §4.2
  give each surface: the detail, the Board card, the Overview Now row, the tree row (description and tooltip), the status bar
  entry (text and tooltip) and the quick-pick item. No rendered text shall contain `Let the agent report where the plan
  stands`, and the board state shall stay `Active`.
- **AC-007** While AC-004's case holds and the open step's stage is a `‖` stage with two unfinished steps, the Plan map shall
  show no `Ways to run stage <n>` and shall put the *next* marker on `<ID>`. With `Current step` naming `<ID>`, the same plan
  shall show the disclosure as 0023 AC-009 says.
- **AC-008** When a plan file change switches the case (the last open step ticked, a tick removed, `Current step` edited),
  the detail and the Overview shall show the new step within 500 ms after the model-changed notification (PD-047), and the
  selection and the area shall stay as they were.
- **AC-009** For the fixtures of AC-001, AC-004 and AC-005, `nextStep()` shall return deep-equal results whether `AGENTS.md`
  declares `FeatherSpecVersion: 1.7.0`, `1.10.0` or `1.11.0`, or carries no such line (legacy, PD-031).
- **AC-010** Every spec of every project under `test/fixtures/` and in this repository's `.specs/`, as they stand at the
  commit on which this spec's implementation starts, shall keep a `nextStep()` result deep-equal to the one recorded at that
  commit. Excepted is a spec that is Active and has a finished plan or the sign of §6.2; none does (checked 2026-11-19).
- **AC-011** The specs of §5 shall carry its notes, and no PD row shall be edited. `README.md` shall contain `Let the agent
  report first — the plan and the ticks may differ` and `whatever the plan's status line says`, and shall no longer contain
  `without an open step the one prompt lets the agent report where the plan stands`. `CHANGELOG.md` shall contain `Let the
  agent report first` under `[0.1.0]`. `docs/release-checklist.md` shall carry a 0028 section with AC-013–AC-015.
- **AC-012** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not replace
  shall exist at the head and pass. `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the
  test titles of both commits, and the plan lists every title missing at the head, renamed ones included, each with the
  statement it replaced or the head title that replaces it.
- **AC-013** *(manual, preview harness, by the orchestrator)* Guideline 12: the detail and the first Now row for the fixtures
  of AC-001 and AC-004, in Dark, Light and High Contrast, at 1600 px and 1000 px window width with the side panel open; no
  intent, prompt or coach line is cut, and AC-004's line 1 intent wraps only between words. Screenshots go into the plan.
- **AC-014** *(manual, Gregor, on an HTML draft before `/sdd-plan`; PD-069, PD-082, 09 §7)* Two tasks across views. Gregor
  starts each from the Specs tree, and the orchestrator notes every click. (a) On AC-001's state: "The agent says T-006 is
  done. What do you do next, in which chat, with which model?" (b) On AC-004's state: "You come back after a break. What does
  the Studio want first, and why?" Passed when Gregor answers (a) `/sdd-compile` in a new chat with a strong model of another
  family, and (b) the report first with its reason, each without opening a Markdown file. The plan records his path and words.
- **AC-015** *(manual, Gregor, on `tip-splitter` with GitHub Copilot and Claude Code, before the spec closes; PD-082)*
  (a) An implementing agent ticks the last step. Whatever the status line then says, the tree, Overview, detail and status
  bar show `Verify · /sdd-compile`, and the prompt sent or copied into a new chat runs `/sdd-compile`. (b) With `Current step`
  edited to name an unfinished step after the open one, the Studio shows the report first; `/sdd-plan` in a chat reports and
  brings the plan level, and the Studio then shows variant A again (or the check). Gregor records the versions he used, and
  whether "Active" with "Verify" reads right to him (OP-001).

## 10. Technical notes for developers or AI agents

- As-is (read 2026-11-19, head `db71223`): the Active branch of `nextStep()` (`src/core/board/nextStep.ts`) checks a return
  note (`NS-6-returned`), then no `entry.plan` (`NS-6-plan`), then `openStep()` undefined (`NS-6-resume`), and otherwise
  gives `NS-6-open`. `openStep()` takes the first step with `ticked !== true && !struck`, and `taskProgress()` counts the same
  way. A finished plan with `Status: In Progress` therefore falls to `NS-6-resume`: the g-r2-03 case.
- `ParsedPlan.currentStep` (`src/core/specs/parsePlan.ts`) is a `HeaderField` (`value.state`: absent, empty, placeholder or
  value; `raw`) that nothing uses yet. `PlanStep.ticked` is `boolean | 'undetermined'` (`planSteps.ts`). Real values are free
  text: `T-003 ‖ T-004`, `T-022`, `none (T-001…T-022 verified; …)`, `T-009 (done)`, `T-005 abgeschlossen; …`.
- `deriveLifecycle()` gives Review only for a plan `Done` (S-REVIEW), unchanged here; the tree badge counts Review and Blocked.
  `StepCase`/`STEP_GUIDES` (`nextStepTexts.ts`) make a new case (e.g. `NS-6-report`) exhaustive by type; no case reaches the
  webview, so no protocol change is expected. Code keyed on the case: `planMap.ts` `waysCase` (`NS-6-open`, `NS-7`; AC-007
  needs no change there), `stepTips()`, `assistant/sendView.ts` (finished plan → new chat as NS-5; Report first → current
  chat until 0026, PD-078). 0024 AC-004 needs no note.
- Tests that change (audit, AC-012), in `nextStep.test.ts`: "0021 AC-005 … all steps ticked or struck … read as Resume" (its
  `allDone` fixture becomes NS-5) and "0021 AC-001 … the guide of each case" (the resume effect and then-sentence).
- TDD: the new tests go red on their assertions against today's `nextStep()`. No component is new, so no stub is needed.
  Proposal, the plan decides: two pure helpers beside `openStep()`, `finishedPlan()` and `reportSign()`, matching tokens by
  `/\bT-\d+\b/` against the plan's step IDs. No new module, so no `/sdd-architecture-update`.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | "Finished" needs at least one ticked step; a plan with every step struck, no step, or an unreadable plan keeps "report where the plan stands" (proxy) | Such a plan has nothing to verify, so `/sdd-compile`'s *Plan state* would find no evidence; PD-081 speaks of ticked steps | AC-001, AC-002 |
| A-002 | Only the next step changes; the state stays Active (proxy; OP-001) | PD-081 names the next step only. PD-021 (4) derives Review from `Done`. The status history would record a state that no file states (PD-013) | AC-006; a later spec would amend 0003 S-REVIEW, and the step would stay the same |
| A-003 | The finished plan takes rule NS-5 with NS-5's case, texts, coach line and Send target (proxy) | PD-081: "`/sdd-compile` with its coach line (new chat · strong model, other family)"; one step, one wording (guidelines 1, 10); 0024 AC-004 then holds without a note | AC-001 |
| A-004 | G-11's "≠ first open step" is read as: names an unfinished step, and not the open one (proxy; deviates from 09 G-11's literal wording) | `plans.md` writes the tick per step but `Current step` only at a stage end ("the ticks and the code lead over `Current step`"), and some archived plans name the finished step (`T-009 (done)`). The literal reading would put the report first after T-002 and T-003 in tip-splitter's stage 2, and so undo PD-072's variant A on the normal path | AC-004, AC-005; AC-014 and AC-015 check it |
| A-005 | IDs are read from `Current step`, never words (proxy) | Prose follows `DocLanguage` (`T-005 abgeschlossen`); IDs do not | Some breaks go unseen; variant A's line 2 stays the way after a break (PD-072) |
| A-006 | G-11's return-note sign is already met by 0023's returned work, unchanged (proxy) | 0023 §5.5 puts `/sdd-plan` as the only line while a note lies, with a more precise intent | AC-003 |
| A-007 | Report first keeps the continue line as line 2 (proxy) | 09 G-11: "/sdd-plan wird die erste Zeile". A false sign then costs one glance, and variant A's lines simply swap | AC-004 |
| A-008 | The §7 texts, the short intent `Report` and `any chat` · fast, as for "Plan without open step" (proxy) | Same command, same Mode B (`sdd-plan.md` steps 1–3; PD-072 case 4). 0026 §6.3 derives `Report` for both cases, and its OP-003 asks 0028 to cite it | §7, AC-004 |
| A-009 | "Whatever the status line says" covers the statuses an Active spec can show; `Blocked` and `Done` keep NS-4 and NS-5 (proxy) | PD-021 (2) puts Blocked first, and a block is the agent's explicit stop; a plan `Done` is already Review | AC-003 |
| A-010 | No ways show while Report first holds (proxy) | 0023 §5.4 offers ways only for "Open step" and NS-7; stage prompts build steps, and the report comes first | AC-007 |
| A-011 | The same rules apply to every FeatherSpec version, also after PD-082's update (orchestrator's note) | Plans that older agents wrote stay in projects; the Studio must keep working on them | AC-009 |

## 12. Open points

- OP-001 The state of a finished plan whose status line lags: Active (followed, A-002) or Review (badge, Now order, Board
  column). Recommendation: keep Active, and let AC-015 show whether "Active" with "Verify" reads right. Not blocking.
- OP-002 Click test with tasks across views on an HTML draft (AC-014; PD-069, PD-082): Gregor confirms §7 and A-004. Blocks `/sdd-plan`.
- OP-003 After FeatherSpec reconciles ticks on `Implement T-00x` (PD-082), its release decides whether the report-first
  wording changes; the detection stays (A-011). Not blocking.

## 13. Ready, Done and next steps

Ready: `/sdd-clarify` has run and OP-002 is resolved. Done: AC-001–AC-012 green on Windows and in CI, AC-013–AC-015 recorded
in the plan, §5's notes in place, docs synced. Next: `/sdd-clarify` in a fresh session, the click test (OP-002), then
`/sdd-plan`; implementation order 0028 → 0025 → 0026 → 0027.
