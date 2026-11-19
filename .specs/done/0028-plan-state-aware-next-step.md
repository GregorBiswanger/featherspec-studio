# Plan-State-Aware Next Step

**Status:** Implemented
**Plan:** [0028-plan-state-aware-next-step.2026-11-19.plan.md](../plan-archive/0028-plan-state-aware-next-step.2026-11-19.plan.md)

Basis: review `docs/ux-audit/09-round2-review.md` G-11, §8; PD-081 (`screenshots-48d1968/g-r2-03…05`), PD-082, PD-072,
PD-021, PD-013, PD-016, PD-047; round 3's D-1, D-4 (orchestrator for Gregor, 2026-11-19); FeatherSpec 1.11.0 (branch,
unreleased); guidelines 1, 3, 6, 10–12. No interview: proxies in §11. This spec owns the next-step rules and the Review rule
of a finished plan; 0025 shows `nextStep()`, also in the Plan map header; 0026 owns short forms, coach lines, Send targets.

**Changes 2026-11-19** (finish plan `docs/ux-audit/12-finish-plan.md` D1-1…D1-6; PD-084…PD-089, mainly PD-087): the version
source and its re-read (§6.4); returned work first in every version (§6.3); *Verified without tick* (§6.6); the
version-dependent `current or new chat` reason (§6.4, §7); tests over the five `fs-*` fixtures (AC-017…AC-021).

## 1. Summary

**Finished plan:** every plan step ticked (or struck) makes the spec Review, with the check, `/sdd-compile`, as its next
step, whatever the plan's `Status:` line says (PD-081, D-1). **Report first:** below FeatherSpec 1.11.0, when the plan's
`Current step` names an unfinished step other than the open one, `/sdd-plan` comes first under "Let the agent report first
— the plan and the ticks may differ", the continue line second (G-11); otherwise 0021's variant A stays (PD-072). In every
version, a step with a filled `Verified:` but no tick puts the report first too, and returned work comes before both
(PD-087). **Start prompt:** NS-7 uses FeatherSpec's fixed `Implement <ID> of <plan path>` (D-4).

## 2. Goal and problem

On `sdd-tip-splitter` the agent ticked T-006 but left `Status: In Progress`: the spec stayed Active with "Let the agent
report where the plan stands", the Plan map showed six ticks and no action (g-r2-03, g-r2-04), and Review came only after
`/sdd-plan` set `Done` (g-r2-05), though FeatherSpec's rules judge the ticks (§6.1's sources). After a break, 1.10.0's
`Implement <ID>` does not level missing ticks, `/sdd-plan` does (PD-072, V-1 case 4), and the user must notice the break
(09 G-11). Goal: Review and the check once the ticks say done, the report first where the plan may not match the work.

## 3. Users and roles

Developer, one role (0001–0007). The AI assistant receives only the prompt.

## 4. Scope

### In scope

- The Review rule of a finished plan (§6.1), Report first (§6.2), the order of an Active spec's cases (§6.3), the version
  source (§6.4), NS-7 (§6.5), *Verified without tick* (§6.6).
- The texts of §7; the amendments of §5; README, CHANGELOG and the release checklist.

### Out of scope

- Words in `Current step` ("done", "abgeschlossen") — because the field is free text in any `DocLanguage` (A-005).
- Other signs (the handoff's `Next action`, Git state) — because G-11 and PD-087 name three (PD-013); *Verified without tick*
  is in scope (§6.6, 12 D1-4).
- A note for a status line that lags the ticks — because it is no contradiction; `/sdd-compile`'s *Docs sync* reports it.
- The state of Ready and Backlog specs with a finished plan — because S-REVIEW needs `active/` and `In Progress` (0003 §6.1).
- The Plan map header action, the wording of short forms and coach lines, Send targets — because 0025 and 0026 own them.
- FeatherSpec's own changes (ticks reconciled on `Implement T-00x`, fixed prompts) — because PD-082 builds them there (A-011).

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0028 (PD-081, D-1 | PD-082): …*"; the PD register
is not edited. 0028 is implemented first, so where 0025 or 0026 amend the same statement, each note covers only its part.

| Spec · statement | Amendment |
| --- | --- |
| 0003 §6.1 row S-REVIEW "sibling plan `Done`"; AC-007 "whose sibling plan is `Done`" | Sibling plan `Done` or finished (0028 §6.1); the rule ID stays S-REVIEW |
| 0013 §3.5 S-REVIEW "Derived: plan is Done, waiting for review" (0016 T-09, 0018 AC-020); 0015 §6.1 row NS-5 "Review"; 0023 §5.5 "A Review spec (plan `Done`, PD-021 (4) before (5)) keeps NS-5", §10 "Review needs plan `Done`" | Review includes a finished plan (0028 §6.1); the texts stay |
| 0015 §6.1 row NS-6 (as 0017, 0021 and 0023 amended it) | 0028 §6.2's case "Report first" comes before 0021's case "Open step" |
| 0021 §6.2 table, row "Open step"; AC-003 | Holds only while 0028's case "Report first" does not (0028 AC-004, AC-005) |
| 0021 §6.2 table, row "Plan without open step" (its entry, effect and then-sentence; its short intent is 0026's); AC-005 "whose sibling plan has no open step" | An Active spec has no finished plan (0028 §6.1); the effect and then-sentence of 0028 §7 |
| 0023 §5.4 "(its next step is NS-6's case "Open step", 0021 §6.2, or NS-7)"; AC-009 | "Report first" is not "Open step", so no ways show while it holds (0028 AC-007); the ways' content stays 0026's (G-3) |
| 0023 AC-013 "without a note NS-6 shall be as 0021 AC-003 and AC-005" | 0021 AC-003 and AC-005 as 0028's notes leave them |
| 0015 §6.1 row NS-7 "`Start <ID> of <plan path>` … `Implement <plan path>` where there is none"; 0017 §6.1 "`Start <ID> of <plan path>` → `Start <ID>`; `Implement <plan path>` → `Implement`", AC-001's example | `Implement <ID> of <plan path>` → `Implement <ID>`; without an open step `/sdd-plan <spec path>` (0028 §6.5, D-4) |
| 0021 §5 row "NS-7–NS-10 … Lines unchanged"; §6.1 "except NS-6 (§6.2)", row NS-7 "(no step ID: `Start implementing the plan`)"; §6.3 `Build · Start T-001`; AC-002 "whose rule is not NS-6"; A-005 "`Start · Start T-001` reads as a stutter" | Also NS-7 (0028 §6.5): `Build · Implement T-001`; without an open step the texts of "Plan without open step"; the stutter reason lapses (0026 owns the short form) |
| 0026 §7 reason `Current or new chat: … after a break, let the agent report first.`; 0026 AC-002 "§7's reason literally" | Below 1.11.0 or without a readable version; from 1.11.0 0028 §7's reason (§6.4, AC-020) |
| PD-072 "line 2 is the way after a break" | Refined by 0028 (register not edited): where the plan shows the sign of §6.2, the report is line 1 |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014 (test audits) | Also excepts the tests that 0028 AC-012 lists against a statement this table replaces |

## 6. Business rules

*Open step*: the first plan step that 0002 reports neither ticked nor struck, an undetermined tick counting as not ticked
(0015 NS-7, `openStep()`); *return note*: 0023 §5.5. The rules read spec, sibling plan, return notes and the version (§6.4).

### 6.1 Finished plan → Review (PD-081 part 1, D-1)

A sibling plan is **finished** (a plan, not 0023's finished stage) when it is readable, 0002 reports at least one step
ticked, and every step is ticked or struck. 0003 S-REVIEW reads `active/`, `In Progress`, sibling plan `Done` or finished;
of the plan's `Status:` values only `Blocked` counts (S-BLOCKED first, PD-021 (2), A-009). Ticks are plan facts (0002), not
0003 §6.6's verification status, which still changes no state. The next step is NS-5 in full (0021 §6.1, 0024 §6.2), also
while a DONE return note lies (0023 §5.5). Every surface that reads the state follows: Board column, tree group, icon and
badge, Now order, status bar and its current spec (0017 A-002), status history (Active ↔ Review in flow, 0003 §6.4).
Sources: `plans.md` *A finished plan …*; `sdd-compile.md` *Plan state*; `sdd-lifecycle.md` *Before `done/`*, closing edit.

### 6.2 Report first (G-11, PD-082)

**The sign:** the plan's `Current step` header (0002) has a value, not a placeholder; that value names at least one step that
is neither ticked nor struck; and none of the steps it names is the open step. A step counts as named when a `T-<digits>`
token in the value equals one of the plan's step IDs. While the sign holds below 1.11.0 (§6.4), NS-6's case is "Report first":
line 1 `/sdd-plan <spec path>` under `Let the agent report first — the plan and the ticks may differ`; line 2
`Implement <ID> of <plan path>` under `Continue with <ID> <title>` (0021's line 1); short intent `Report` (0026 §6.3's
rule), coach line `any chat · fast model` (0026 §6.2 keeps `any chat`), and the effect and then-sentence of §7.

Naming only ticked or struck steps is the normal lag inside a stage: no sign (A-004). A return note is 0023's case (A-006).

### 6.3 Order of an Active spec's cases (first match wins)

(1) A return note lies → returned work (0023 §5.5), in every version and before (4) and (5) (12 D1-3, PD-087); (2) no
sibling plan → Write the plan (0021 §6.2); (3) no open step (unreadable plan, no step, every step struck) → Plan without
open step (0021 §6.2, narrowed by §5); (4) *Verified without tick* (§6.6) → Report first, in every version; (5) the sign of
§6.2, below 1.11.0 (§6.4) → Report first; (6) open step → variant A (PD-072). States come first (PD-021): plan `Blocked`
or a BLOCKED note → Blocked (NS-4); a lifecycle contradiction → Active by folder (NS-2); plan `Done` or finished → Review (NS-5).

### 6.4 FeatherSpec versions (12 D1-1, D1-2, D1-5; PD-087)

**Source:** the `FeatherSpecVersion:` value of the project's `AGENTS.md` (0001, PD-032). It is read again whenever
`AGENTS.md` changes (discovery reruns, PD-033), so also after `/sdd-featherspec-update`. *Old* means below 1.11.0, absent
(legacy), unknown, or not a semantic version by 0002's comparison (a pre-release is below its release): the safe default.
**Switch:** the sign of §6.2 gives Report first only while the version is old: from 1.11.0 `Implement <ID>` levels the
plan before the step (`AGENTS.md` "Before a session's first step", `plans.md` *Level first*), so variant A stays (A-011).
**Reason text:** the session reason of `current or new chat` (0026 §6.2) is 0026 §7's while the version is old, from
1.11.0 §7's. No other rule reads the version; ticks are read in every dialect 0002 knows.

### 6.5 NS-7: FeatherSpec's start prompt (D-4)

NS-7's line is `Implement <ID> of <plan path>`: 1.11.0's start prompt (`plans.md` *Prompts*: "for a plan not started, the
start signal") and 1.10.0's start signal "implement" (`sdd-plan.md` *Always*). Intent and texts stay (0021 §6.1); the
command short form is `Implement <ID>` (0021 §6.3). A Ready spec without an open step gets `/sdd-plan <spec path>` with the
texts of "Plan without open step" (A-012).

### 6.6 Verified without tick (12 D1-4, PD-087; 11 §5, QA 1.11.0 V1)

**The guard:** a plan step that is neither ticked nor struck has a `Verified:` line with a value that is not a placeholder
(0002: absent, empty, `—`). While it holds and no return note lies, NS-6's case is Report first, in every version (§6.3
(4)), with §6.2's lines, short form and coach line; the toggletip's first paragraph starts with §7's reason for the first
such step in plan order (A-013). It catches the known V1 miss of the fast model (QA 1.11.0, in 1.10.0 too).

## 7. Texts (English, PD-016; in the text modules, asserted literally; proxies, A-008)

| New | Replaces |
| --- | --- |
| Report first, line 1 intent: `Let the agent report first — the plan and the ticks may differ` | — |
| Report first, short intent `Report`; step short form `Report · /sdd-plan` | — |
| Report first, effect: `The agent checks the plan against the code, brings the ticks and the handoff level and reports where the work stands; it builds nothing yet.` | — |
| Report first, then: `When the plan and the ticks agree, the Studio shows the step to continue with.` | — |
| Finished plan: NS-5's texts (0021 §6.1), unchanged | On such a spec: `Let the agent report where the plan stands`, `Resume · /sdd-plan`, `any chat · fast model` |
| Plan without open step, effect: `The agent checks the plan against the code and reports where it stands.` | `The agent checks the plan against the code; with every step ticked it closes the plan and recommends the review.` |
| Plan without open step, then: `The spec then shows its next step.` | `The spec then shows Verify.` |
| NS-7: `Implement <ID> of <plan path>`, `Implement <ID>` | `Start <ID> of <plan path>`, `Start <ID>` |
| NS-7 without open step: `/sdd-plan <spec path>` with "Plan without open step"'s texts | `Implement <plan path>` under `Start implementing the plan` |
| *Verified without tick* reason, opening the toggletip's first paragraph, then one space and the effect: `<ID> has a Verified line but no tick.` (12 D1-4) | — |
| Session reason from 1.11.0: `Current or new chat: the plan holds the state of the work; after a break, the step first brings the plan up to date.` (12 B-1 (2)) | 0026 §7's `… after a break, let the agent report first.`, kept while the version is old |

Reused unchanged: line 2's `Continue with <ID> <title>`, the coach line `any chat · fast model` and its reasons (0021 §6.6).

## 8. Error cases and edge cases

Precedence, struck-only and step-less plans, undetermined ticks and `Current step` values: §6.3 and AC-001–AC-005.
- `T-011…T-016` in `Current step` names only the two IDs written. A tick removed or a fix step appended → Active (AC-008).
- After the update a finished plan on disk turns Review with no file change; the history says *changed while Studio was
  not running* (0003 §6.5), accepted for a best-effort log (PD-023).
- An open toggletip or Send menu → 0021 AC-014, 0024 AC-010; Restricted Mode, reader window → 0021 AC-018.

## 9. Acceptance criteria

Node or jsdom tests decide every criterion unless marked manual. Fixtures (`modelOf`): `.specs/active/0001-tip-splitter.md`,
its plan T-001…T-006 in three stages (g-r2-04), version 1.10.0 unless stated. `fast` only as backticked UI text (0021 §9).

- **AC-001** For an `active/` spec, status `In Progress`, no contradiction, whose finished plan (§6.1) says `In Progress`, `Not started` or no status, with and without a DONE return note, `deriveLifecycle()` shall report `Review`, rule `S-REVIEW`, derived; that entry, `nextStep()` and the detail's next-step view (lines, tips, send) shall deep-equal those of the same files with plan `Done`, for each value of `featherspec-studio.assistant`.
  > **Given** plan `Status: In Progress`, T-001…T-006 ticked **Then** Review; `/sdd-compile <spec path>` under `Have the result verified`, then `/sdd-lifecycle <spec path>`; `Verify · /sdd-compile`; `new chat · strong model, other family`.
- **AC-002** Where an Active spec's sibling plan without a return note has no open step and is not finished (every step struck, none ticked; no step; unreadable), the state shall be `Active` and `nextStep()` 0021 AC-005's "Plan without open step" with §7's effect and then-sentence; with one undetermined tick, the rest ticked, 0021 AC-003's lines for that step.
- **AC-003** For a spec with a finished plan, `deriveLifecycle()` and `nextStep()` shall return what they return at the commit on which this spec's implementation starts when its plan says `Blocked` or a note BLOCKED (NS-4), when the spec in `active/` says `Draft` (S-FOLDER, NS-2), and when the pair sits in `backlog/`.
- **AC-004** While an Active spec has no return note, its sibling plan's open step is `<ID>` and the plan shows the sign of §6.2, `nextStep()` shall return rule `NS-6`, line 1 `/sdd-plan <spec path>` under `Let the agent report first — the plan and the ticks may differ`, line 2 `Implement <ID> of <plan path>` under `Continue with <ID> <title>`, short form `Report · /sdd-plan`, coach line `any chat · fast model`, and as the toggletip's first paragraph §7's effect and then-sentence.
  > **Given** T-001 and T-002 ticked, T-003 "Reject money values" and T-004 open, `**Current step:** T-004` **Then** `Let the agent report first — the plan and the ticks may differ` over `/sdd-plan .specs/active/0001-tip-splitter.md`, then `Continue with T-003 Reject money values` over `Implement T-003 of .specs/active/0001-tip-splitter.plan.md`.
- **AC-005** `nextStep()` shall return 0021 AC-003's variant A, deep-equal to its result at the commit on which this spec's implementation starts, for each of these `Current step` values, one fixture each: absent; empty; `—`; `none (all steps ticked)`; the open step alone (`T-003`) or with other steps (`T-003 ‖ T-004`, `T-003 and T-005`); only ticked or struck steps (`T-002` after T-002's tick, inside a stage); only IDs the plan lacks (`T-099`).
- **AC-006** For the fixtures of AC-001 and AC-004, each in the form 0021 §6.3 and 0022 §4.2 give it, these shall show that step and the state `Review` or `Active`: the detail, the Board card and column, the Now row and its place in the order, the tree row (group, icon, description, tooltip), the badge count, the status bar (text, tooltip) and the quick pick. No rendered text shall contain `Let the agent report where the plan stands`.
  > **Given** AC-001's spec, an Active `0002` with an open step, no selection **Then** the status bar reads `$(checklist) 0001 · Review · /sdd-compile` and the badge is 1.
- **AC-007** While AC-004's case holds and the open step's stage is a `‖` stage with two unfinished steps, the Plan map shall show no `Ways to run stage <n>` and shall put the *next* marker on `<ID>`. With `Current step` naming `<ID>`, the same plan shall show the disclosure as 0023 AC-009 says.
- **AC-008** When a plan file change switches the state or the case (the last open step ticked, a tick removed, `Current step` edited), the detail, the Overview and the Board shall show it within 500 ms after the model-changed notification (PD-047), selection and area unchanged; a switch between Active and Review shall add one history entry, *in flow*.
- **AC-009** For the fixtures of AC-001, AC-005 and AC-016, `deriveLifecycle()` and `nextStep()` shall return deep-equal results for `FeatherSpecVersion: 1.7.0`, `1.10.0`, `1.11.0`, `1.12.0` and no such line (legacy, PD-031), the session reason of §6.4 excepted (AC-020). AC-004's fixture shall give Report first for `1.7.0`, `1.10.0`, `1.11.0-rc.1`, `next` and no line, 0021 AC-003's for `1.11.0`, `1.12.0`.
- **AC-010** Every spec of every project under `test/fixtures/` and in this repository's `.specs/`, as they stand at the commit on which this spec's implementation starts, shall keep state, rule and `nextStep()` deep-equal to that commit's. Excepted: NS-7's line (§6.5), and an `active/` spec with a finished plan not `Done` the sign, or the guard of §6.6; at writing these are `fs-version-missing`, `fs-version-1100` and `fs-verified-no-tick` (AC-021), and a variant-A spec's session reason under 1.11.0 or later (AC-020).
- **AC-011** The specs of §5 shall carry its notes; no PD row shall change. `README.md` shall contain `Let the agent report first — the plan and the ticks may differ`, in its *How board states are derived* Review line `every step of its plan ticked or dropped` and `whatever the plan's status line says`, and not `without an open step the one prompt lets the agent report where the plan stands`; `CHANGELOG.md` `Let the agent report first`, `every step ticked`; the checklist AC-013…015.
- **AC-012** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not replace shall exist at the head and pass; one §10 marks *fixture only* shall keep title and assertions, its spec an open step. `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares both commits' test titles; the plan lists every title missing at the head, renamed ones included, with the statement it replaced or the title replacing it.
  *Amended by 0027 (PD-082, PD-083): also except the tests 0027 AC-014 lists against a statement 0027 §5 changes.*
- **AC-013** *(manual, preview harness, by the orchestrator)* Guideline 12: the detail and the first Now row for the fixtures of AC-001 and AC-004, in Dark, Light and High Contrast, at 1600 px and 1000 px window width with the side panel open; no intent, prompt or coach line is cut, and AC-004's line 1 intent wraps only between words. Screenshots go into the plan.
- **AC-014** *(manual; not run, closed by OP-002, its tasks in AC-015; PD-069, PD-082, 09 §7)* Two tasks across views. Gregor starts each from the Specs tree; the orchestrator notes every click. (a) On AC-001's state: "The agent says T-006 is done. Where does the spec stand, what do you do next, in which chat, with which model?" (b) On AC-004's state: "You come back after a break. What does the Studio want first, and why?" Passed: (a) Review and `/sdd-compile` in a new chat with a strong model of another family, (b) the report first with its reason, no Markdown file opened. The plan records path and words.
- **AC-015** *(manual, Gregor, on `tip-splitter` with GitHub Copilot and Claude Code, before the spec closes; PD-082)* (a) An agent ticks the last step: whatever the status line says, the Board shows Review, tree, Overview, detail and status bar `/sdd-compile` in their AC-006 form, and the prompt runs it in a new chat. (b) `Current step` names an unfinished step after the open one: on 1.10.0 the report first, and `/sdd-plan` levels; on 1.11.0 variant A, and `Implement <ID>` levels. (c) On both, a Ready spec's `Implement T-001 of <plan path>` moves the pair to active, builds only T-001. He notes versions.
- **AC-016** For a Ready spec whose open step is `<ID>`, `nextStep()` shall return NS-7 with the one line `Implement <ID> of <plan path>`, command short form `Implement <ID>` and every other field as at the commit on which this spec's implementation starts; without an open step, `/sdd-plan <spec path>` with AC-002's intent, coach, effect and then-sentence. No next step shall have a line that starts with `Start ` or equals `Implement <plan path>`.
- **AC-017** While an Active spec has no return note and a plan step neither ticked nor struck has a `Verified:` value that is not a placeholder, `nextStep()` shall return AC-004's lines, short form `Report · /sdd-plan` and coach line for every version value of AC-009, `1.11.0` and `1.12.0` included, with or without §6.2's sign; the toggletip's first paragraph shall be §7's `<ID> has a Verified line but no tick.` for the first such step in plan order, one space, then §7's effect and then-sentence. A placeholder value (`—`, empty, absent) shall give no guard.
  > **Given** `fs-verified-no-tick` (1.11.0, T-003 `Verified (T-003): 2026-11-19 · npm test green` without tick, `Current step: T-003`) **Then** `/sdd-plan .specs/active/0001-fixture-demo.md` first, the toggletip opening with `T-003 has a Verified line but no tick.`
- **AC-018** While a return note lies, `nextStep()` shall return 0023 §5.5's returned work for `fs-partial-return` as it stands (1.11.0), restamped `1.10.0`, without the version line, and with T-004 given a filled `Verified:` without tick; the four results shall be deep-equal, apart from the session reason of §6.4 (AC-020).
- **AC-019** When the `FeatherSpecVersion:` line in `AGENTS.md` changes from `1.10.0` to `1.11.0` (as `/sdd-featherspec-update` writes it), from `1.11.0` to `1.10.0`, to `next`, or goes, the detail, the Overview, the tree and the status bar shall show the case §6.4 gives for the new value within 500 ms after the model-changed notification (PD-047, timing test), selection and area unchanged; AC-004's fixture shall switch between Report first and variant A.
- **AC-020** The toggletip's session paragraph for the coach line `current or new chat` (NS-6 open step, returned work) shall be §7's 1.11.0 reason literally for `1.11.0`, `1.11.1` and `1.12.0`, and 0026 §7's reason literally for `1.10.0`, `1.11.0-rc.1`, `next` and no version line; a search of the text modules shall find each reason exactly once.
- **AC-021** For each of the five fixtures `fs-version-missing`, `fs-version-1100`, `fs-version-1110`, `fs-verified-no-tick` and `fs-partial-return` (12 A-3, D1-6), one test of the next-step rules (`nextStep()`) and one of the status bar shall give spec 0001's case and command short form: Report first, `/sdd-plan`, for the first two (old version; `Current step: T-004` names an unfinished step other than the open T-003) and the fourth (§6.6); variant A, `Continue with T-003 Add` over `Implement T-003 of .specs/active/0001-fixture-demo.plan.md`, for the third; returned work, `/sdd-plan`, for the fifth; the status bar `$(checklist) 0001 · Active · <command short form>`. `fs-version-missing` shall be read as a legacy project (PD-031; OP-005).

## 10. Technical notes for developers or AI agents

- As-is (`7f535bd`): `decide()` (`core/lifecycle/deriveLifecycle.ts`) gives S-REVIEW for `active` + `In Progress` +
  `planStatus === 'Done'`; steps on `EntryContext.siblingPlan.parsed.steps`; `planInUse()` gives only the sibling plan outside
  `done/` (a reactivated spec's archive never counts). `nextStep()` maps Review to NS-5; Active: `NS-6-returned`,
  `NS-6-plan`, `NS-6-resume` (no `openStep()`), `NS-6-open`, so g-r2-03 is Active and `NS-6-resume`.
- `ParsedPlan.currentStep` is a `HeaderField` (absent, empty, placeholder, value; `raw`), unused so far; `PlanStep.ticked` is
  `boolean | 'undetermined'`. Real values: `T-003 ‖ T-004`, `none (T-001…T-022 verified; …)`, `T-005 abgeschlossen; …`.
- Surfaces read `LifecycleEntry.state` (`badgeOf()`, Now order, Board, status bar `PICK_ORDER`). A new `StepCase` (e.g.
  `NS-6-report`) is exhaustive in `STEP_GUIDES`; keyed on the case: `planMap.ts` `waysCase` (no change for AC-007),
  `stepTips()`, `sendView.ts` (Report first → current chat until 0026). 0024 AC-004 needs no note.
- Versions: `ProjectRead.version`, `parseSemanticVersion()`, `compareVersions()` (`core/specs/version.ts`). NS-7: `startLine()`;
  `shortForm()`'s `Start` branch falls idle; `NEWEST_KNOWN` stays 0027's. Discovery (`classifyFolder.ts`) reads `AGENTS.md`
  again on change; a folder without the version line counts as a project only with `.claude/commands/sdd-*.md` (legacy).
- §6.6: `PlanStep.verified` is a parsed `FieldValue` (`core/specs/planSteps.ts`), not used by `nextStep()` yet.
- Tests (AC-012; scratch copy, §6.1 in `decide()`: 9 of 3,157 unit tests fail, timing green, host not run; §6.5 adds 14,
  all replaced: `nextStep.test.ts` 10, `copyNextStep.test.ts` 2, `statusEntry.test.ts`, `cards.test.ts`). Replaced by §6.1:
  "0021 AC-005 … read as Resume" (`allDone`), with §7 "0021 AC-001 … the guide of each case". *Fixture only*: in
  `detail.test.ts` on `FILES` (T-001 ticked, T-002 struck, `In Progress`) "AC-013 … no priority, verdict …", "0015
  AC-003 …", "0021 AC-009, AC-010 … NS-6 coach …", "0024 AC-003, AC-004 …"; in `nextStep.test.ts` on one ticked step
  "NS-6 resume: case …", "NS-6 resume: short intent …", "with two Active specs …", "without a note NS-6 is as 0021 …".
- TDD: new tests go red on their assertions; no new component, so no stub. Proposal: pure `finishedPlan()` for `decide()`
  and `reportSign()` beside `openStep()`, tokens `/\bT-\d+\b/` against the step IDs; no new module.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | "Finished" needs at least one ticked step; a plan with every step struck, no step, or an unreadable plan stays Active with "report where the plan stands" (proxy; narrows PD-081's and D-1's "(or struck)") | Such a plan has nothing to verify, so `/sdd-compile`'s *Plan state* would find no evidence; `plans.md`: "With the last step ticked" | AC-001, AC-002 |
| A-002 | A finished plan is Review on every surface, with NS-5 in full (decided: D-1) | Gregor saw "Review … and the right button" only after `/sdd-plan` set `Done` (D-1); guideline 1: state and step agree; one step, one wording (guidelines 1, 10) | AC-001, AC-006 |
| A-004 | G-11's "≠ first open step" is read as: names an unfinished step, and not the open one (proxy; deviates from 09 G-11's literal wording) | `plans.md` writes the tick per step but `Current step` only at a stage end ("the ticks and the code lead over `Current step`"), and some archived plans name the finished step (`T-009 (done)`). The literal reading would put the report first after T-002 and T-003 in tip-splitter's stage 2, and so undo PD-072's variant A on the normal path | AC-004, AC-005; AC-014 and AC-015 check it. 12 D1-2 and PD-087 restate the literal wording; this reading stands until the click test (OP-002) |
| A-005 | IDs are read from `Current step`, never words (proxy) | Prose follows `DocLanguage` (`T-005 abgeschlossen`); IDs do not | Some breaks go unseen; variant A's line 2 stays the way after a break (PD-072) |
| A-006 | G-11's return-note sign is already met by 0023's returned work, unchanged; for a finished plan the note keeps NS-5 (proxy) | 0023 §5.5 puts `/sdd-plan` as the only line while a note lies on an Active spec, and keeps NS-5 for a Review spec; D-1 makes a finished plan Review | AC-001, AC-003 |
| A-007 | Report first keeps the continue line as line 2 (proxy) | 09 G-11: "/sdd-plan wird die erste Zeile". A false sign then costs one glance, and variant A's lines simply swap | AC-004 |
| A-008 | The §7 texts, the short intent `Report` and `any chat` · fast, as for "Plan without open step" (proxy) | Same command, same Mode B (`sdd-plan.md` steps 1–3; PD-072 case 4). 0026 §6.3 derives `Report` for both cases, and its OP-003 asks 0028 to cite it | §7, AC-004 |
| A-009 | Of the status values only `Blocked` overrides the ticks (proxy) | PD-021 (2) puts Blocked first, and a block is the agent's explicit stop; PD-081 addresses a status line that lags | AC-003 |
| A-010 | No ways show while Report first holds (proxy) | 0023 §5.4 offers ways only for "Open step" and NS-7; stage prompts build steps, and the report comes first | AC-007 |
| A-011 | Report first by the sign only below FeatherSpec 1.11.0, or with no readable version; every other rule for each version (decided: PD-087) | 09 §8 (3): with levelling on `Implement T-00x` "wird G-11 unnötig"; 1.11.0 adds it (report §2 change 3, §7 item 3); the split keeps the detection for older plans; an unknown version keeps the report, which costs one glance (A-007) | AC-009; if 1.11.0 ships without *Level first*, the bound moves to the release that has it |
| A-013 | The guard's reason names the first such step only; a placeholder `Verified:` value is no guard (proxy) | PD-087's example names one step; one reason sentence fits the `(?)` (guideline 11); `—` is the plan template's empty value | AC-017 |
| A-012 | A Ready spec without an open step takes "Plan without open step"'s texts (proxy; D-4 keeps NS-7's intents) | Same command, same Mode B; `Start implementing the plan` over `/sdd-plan` would promise a start that does not happen (guideline 1); one step, one wording (guideline 10) | AC-016; 0026 §6.3's NS-7 row (cross-spec) |

## 12. Open points

- OP-001 The state of a finished plan. Resolved 2026-11-19 by D-1: Review on every surface (A-002).
- OP-002 Click test (AC-014; PD-082). Resolved 2026-11-19 by `docs/ux-audit/13-clicktest-results.md`: tasks 1–3 run, 4–6
  and confirmation points 1–8 not; "0028: no change from the test". §7, D-4, A-001, A-004, A-009, A-012 and A-013 stay as
  proxies; AC-014's two tasks go to real use (12 F-3), checked by AC-015 (b) and (a).
- OP-003 FeatherSpec wording. Resolved 2026-11-19 by the 1.11.0 report (branch, unreleased): the Studio's prompts equal
  `plans.md` *Prompts* (its §7); levelling on `Implement <ID>` bounds Report first (§6.4, A-011); NS-7 per D-4 (§6.5).
- OP-004 `/sdd-clarify` 2026-11-19 (S91): 44 findings, 4 blocking, resolved in one pass at Gregor's standing request
  (`0028-findings.md`; one cross-spec line with 0026). Readings: (a) a finished plan with a DONE note is Review, NS-5;
  (b) only `Blocked` overrides the ticks; (c) tests meant for Active get an open step; (d) no readable version → Report first.
- OP-005 `fs-version-missing` has neither the version line nor `.claude/commands/sdd-*.md`, so discovery (0001) reads it as
  incomplete, not legacy, and the status bar shows no step. The fixture gains a command file, or AC-021's status-bar part
  expects 0001's incomplete state. Resolved 2026-11-19 (`/sdd-plan`): `496f9fe` added `.claude/commands/sdd-plan.md`, so
  the fixture is legacy and AC-021 stands as written.
- OP-006 Order with 0026 (`/sdd-plan`, 2026-11-19, proxy). 0028 lands first: until 0026, the old reason of §6.4 is the
  text module's one `Same chat or new chat: … let the agent report first.`, which 0026 §7 rewrites; AC-020 asserts that
  one text. From 1.11.0 the reason opens `Current or new chat:` while the coach line still says `same chat or new chat`
  until 0026; accepted on the unreleased branch.

## 13. Ready, Done and next steps

Ready: clarified 2026-11-19 (OP-004), OP-002 resolved. Done: AC-001–AC-012 (AC-012's CI half pending on the round-3 PR), AC-013 (preview, T-008), AC-016–AC-021; `npm test` on Windows at 5b18257 passed. Open: AC-014 (closed by OP-002) and AC-015 are Gregor's, on `tip-splitter`. Order 0028 → 0025 → 0026 → 0027.

## Plan history

- 2026-11-19 — [0028-plan-state-aware-next-step.2026-11-19.plan.md](../plan-archive/0028-plan-state-aware-next-step.2026-11-19.plan.md) — finished plan is Review, Report first below 1.11.0, `Implement <ID>`, Baseline snapshots, in 9 steps; closing `/sdd-compile` READY (manual items: 1); CI pending on the round-3 PR.
