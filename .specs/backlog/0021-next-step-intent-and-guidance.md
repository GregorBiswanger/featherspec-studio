# Next Step with Intent and Guidance

**Status:** Draft
**Plan:** _none yet_

Basis: review `docs/ux-audit/07-implementation-review.md` (2026-11-18) N-1, §5.1, §5.2, §6a; work order
`docs/ux-audit/08-spec-handoff.md` §2 (R-1…R-7, AC drafts, E-1…E-3), §6. Decisions PD-069, PD-061 (1), PD-063 (7),
PD-068, PD-016, PD-047, PD-013; guidelines 1, 6, 9–12 (`.claude/rules/ux-guidelines.md`). Gregor delegated the round
(PD-069): no interview, proxies in §11. 0022 (written in parallel) owns layout, button hierarchy, groups, strips,
problem texts and paths; 0023 and 0024 build on this spec.

## 1. Summary

Every next step says what it does before its prompt: an intent per line in the detail, a short intent before the
command on cards, Overview rows, tree rows and the quick pick, intent and prompt in every tooltip. The button reads
**Copy prompt**. The detail and the first Now row add a quiet coach line (session, model class) and an **About this
step** `(?)` toggletip. NS-6 (Active) gets FeatherSpec's single-step prompt or keeps `/sdd-plan` with an honest
intent, as the V-1 check decides. Settings `showStepTips`, `modelHints`.

## 2. Goal and problem

On an Active spec with a plan the Studio showed `Next /sdd-plan`; Gregor read it as "write a plan" although the plan
existed (07 N-1, `g01`). The second line `continue` did not fix it: no step says what it does. "Copy" does not say
what lands on the clipboard (07 §5.2). FeatherSpec's advice on session and model sits in its command files and
README, not where the user acts (07 §6a). Goal: for every spec state Gregor can say, without asking, what the copied
prompt will do and where to run it (AC-024).

## 3. Users and roles

Developer, one role (0001–0007): in flow, coming back, or new to FeatherSpec. The AI assistant receives only the prompt.

## 4. Scope

### In scope

- Intents (§6.1), NS-6 in two variants (§6.2), short and full form (§6.3), **Copy prompt** (§6.4).
- Coach line (§6.5) and About this step (§6.6) in the detail and the first Now row.
- Settings `featherspec-studio.showStepTips`, `featherspec-studio.modelHints`: the first `contributes.configuration` (§6.7).
- The amendments of §5; README, CHANGELOG, release checklist.

### Out of scope

- Which Copy prompt is primary, secondary or an icon; placement inside rows and cards; the state part of the tree
  description; groups, strips, problem texts, path wrapping — because 0022 owns them (08 §3, N-2…N-9).
- Send to an assistant, split button — because 0024 (PD-068, after V-2).
- Stage prompts ("whole stage", subagents, parallel workers), the plan map — because 0023.
- New order or entry conditions of NS-1…NS-11 — because 08 §2 keeps them; only texts and NS-6's lines change.
- Model names in the product, detecting or switching models — because guideline 11 (names age in weeks; §6.7).
- Coach line or `(?)` on cards, other rows, tree, status bar, quick pick — because guideline 11 and E-2 (A-002).
- An intent in the status bar text — because its space is short; the tooltip carries it (A-006).
- New titles for the commands "Copy Next Step" — because they name the source where no prompt is visible (A-007).
- FeatherSpec wording changes (a fixed main-session phrase) — because that is a FeatherSpec release (08 §7).

## 5. Amendments of other specs

Applied in the implementing change set as a note directly under each statement: "*Amended by 0021 (PD-069): …*".
The PD register is not edited. **Catch-all** (one note at the head of 0015–0020): wherever they name the control
"Copy" of a prompt (a next step or `/sdd-specify`), read `Copy prompt`, named `Copy prompt: <line>`; feedback stays.

| Spec · statement | Amendment |
| --- | --- |
| 0015 §6.1 rows NS-2, NS-4, NS-5, NS-7–NS-10 | Lines unchanged; each line gets its intent (0021 §6.1) |
| 0015 §6.1 row NS-6 (as 0017 amended it) | 0021 §6.2, the variant the V-1 PD names |
| 0015 AC-003 "each with a 'Copy' button and a second line under its §8 label" | Each line under its intent with a "Copy prompt" button; coach line and `(?)` per 0021 §6.5, §6.6 |
| 0015 §8 *Detail* "per line a 'Copy' button; a second line under 'Then:' (NS-9) or 'Then, after a READY verdict:' (NS-5)" and its 0017 note | The texts of 0021 §7 |
| 0015 AC-005 "activates 'Copy'"; 0016 §6.5 "then `Copy`", AC-018 "shall read `Copy` again"; 0017 §7 rows card, *Needs attention* row, quick pick, AC-004, AC-012 "a Copy named 'Copy: <full first line>'", AC-020 "whose 'Copy' copies"; 0018 O-8, §7, AC-011, AC-012 "+ `Copy`", "a Copy" | "Copy prompt", named `Copy prompt: <line>`; the 2 s feedback stays |
| PD-063 (7) "Copy is the primary button" | Its label is "Copy prompt"; which one is primary is 0022's (N-6) |
| 0017 §1 "with one action, Copy"; §6.1 short-form bullet, "the second under its label"; §6.3 tooltip "the full line(s) as §6.1"; §6.4 quick-pick description `<state> · <short form>`, the message's "Copy" | 0021 §6.3 (command short form + `Implement <ID>`; step short form on cards, rows, quick pick; status bar text keeps the command short form; full form in tooltips) and §6.4 |
| 0017 §6.2, AC-002, A-001; §7 row "Detail, NS-6" | 0021 §6.2, AC-003–AC-005; A-001 holds for variant B only |
| 0017 AC-001 "the short form of §6.1" on cards, rows and quick pick | The step short form (0021 AC-006); the status bar examples of AC-013, AC-014 stay |
| 0017 AC-026 "on an Active spec `/sdd-plan`, then `continue` in the same chat, runs one step" | The NS-6 variant's run of 0021 AC-025 |
| 0018 O-5, AC-006 "0017's 'Next', short form and Copy" | Step short form and Copy prompt; the first Now row also carries 0021's coach line and `(?)`, which are no second step line; their place in the row is 0022's |
| 0019 §6.2 row 2 "the block of 0015 AC-003 as 0016 and 0017 leave it (Copy primary, one Copy per line)" | As 0021 leaves it: intents, one Copy prompt per line, coach line, `(?)` beside the heading |
| 0019 §6.1 *Close*, AC-003 "Escape while focus is inside the side panel" | Not while a toggletip is open: that Escape closes only the toggletip (0021 AC-014) |
| 0020 §4.2 *Description* "`<State> · <short form>` (0017 §6.1)"; §6 example `Review · /sdd-compile` | The step short form, e.g. `Review · Verify · /sdd-compile`; whether the state stays is 0022's (N-3) |
| 0020 §4.2 *Tooltip* "`Next step: ` + the full first line in code … the second line in code under its label" | `Next step: ` + the first intent, then the first prompt in code; the second intent, then its prompt in code |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021 (test audits) | Also except the tests 0021 AC-020 lists against a statement this table replaces |
| PD-061 (1) | Holds for variant B; under variant A the V-1 PD supersedes it |

## 6. Business rules

### 6.1 Intent per step (R-1)

Prompts stay those of `nextStep()` (0015 §6.1 as 0017 left it), except NS-6 (§6.2). Each line gets an intent; the
step gets a short intent, the coach line of its first line (§6.5), and an effect and a then-sentence for the toggletip
(§6.6). `<title>` is the step title as 0019 §6.3 shows it (plain, at most 80 characters); without one, `<ID>` alone.
NS-1, NS-3, NS-11 keep their text (0015, 0016 T-18): no intent, Copy prompt, coach line or `(?)`. The empty states of
0018 O-8 ("Nothing up next. Start the next spec with /sdd-specify", "No specs yet. Start with /sdd-specify") already
state their intent and get only Copy prompt.

| Rule | Intent (line 1; line 2) | Short intent | Session | Model | Effect | Then |
| --- | --- | --- | --- | --- | --- | --- |
| NS-2 | Put folder and status back in line | Fix status | any chat | fast | The agent compares folder, status and plan and proposes the move that brings them in line. | You confirm the move; the Studio follows the files. |
| NS-4, plan | Find out what blocks | Unblock | any chat | strong | The agent takes in returned work, checks the plan against the code and reports what blocks. | Once the block is solved, the spec shows its next step again. |
| NS-4, no plan | Find out what blocks | Unblock | any chat | fast | The agent shows the workflow and where every spec stands. | Once the block is solved, the spec shows its next step again. |
| NS-5 | Have the result verified; Then, after a READY verdict: close the spec | Verify | new chat | strong, other family | A fresh reviewer checks every acceptance criterion against evidence and gives a verdict. | Only after a READY verdict, close the spec with the second prompt. |
| NS-7 | `Start implementing: <ID> <title>` (no step ID: `Start implementing the plan`) | Build | any chat | fast | The agent moves the spec to active, builds this one step, runs its check, ticks it and stops. | When it stops, the Studio shows the next step. |
| NS-8 | Add acceptance criteria | Add criteria | any chat | strong | The agent goes through the spec with you and adds testable acceptance criteria. | Then the spec is challenged and planned. |
| NS-9 | Have the spec challenged, then plan it; Then: write the plan | Challenge | new chat | strong | A fresh reader looks for gaps, contradictions and untestable criteria. | Then write the plan with the second prompt, in any chat. |
| NS-10 | Write the plan | Plan | any chat | strong, web search | The agent researches and writes the plan as small, verifiable steps. | You read the plan before anything is built. |

**Proposal:** the Intent, Short intent, Session, Model, Effect and Then columns of §6.1 and §6.2 are a proposal
(08 R-1); Gregor confirms them in the click test (PD-069, OP-002, AC-024). Sources (FeatherSpec 1.10.0 here):
`sdd-compile.md` ("a new session with a strong model from another model family than the one that implemented: a judge
tends to pass what its own family wrote"); `sdd-clarify.md` *Read it as a stranger* ("in-context knowledge cannot be
unread"); `sdd-plan.md` (web search "is the preferred path"; Mode B; *Always*: start signal "start T-001",
"implement"); `plans.md` *One step, then stop*. Strong/fast split: the Studio's own rounds (07 §6a). README: OP-005.

### 6.2 NS-6 (Active) in two variants (R-2, E-1, V-1)

Open step = the step NS-7's function finds (0015 NS-7). The V-1 PD (08 §1: a fresh chat given `Implement <ID> of
<plan path>` brings ticks level with the code, builds exactly that step and stops) names the variant: passed → **A**,
failed → **B**. The plan builds it and cites the PD; the other variant's rows and AC-003 or AC-004 are void. No setting.

| Case | Line 1 intent · prompt | Line 2 intent · prompt | Short intent | Session · model | Effect | Then |
| --- | --- | --- | --- | --- | --- | --- |
| A, open step | `Continue with <ID> <title>` · `Implement <ID> of <plan path>` | Not sure where it stands? Let the agent report first · `/sdd-plan <spec path>` | Continue | same chat or new chat · fast | The agent brings the plan's ticks level with the code, builds this one step, runs its check, ticks it and stops. | When it stops, the Studio shows the next step. |
| B, open step | Resume the plan: the agent reports where it stands · `/sdd-plan <spec path>` | `Then, in the same chat, if nothing blocks: continue with <ID> <title>` · `continue` | Resume | any chat · fast | The agent checks the plan against the code and reports what is done, what is next and what blocks; it builds nothing yet. | Say continue in the same chat: the agent builds one step and stops. |
| A and B, plan without open step | Let the agent report where the plan stands · `/sdd-plan <spec path>` | — | Resume | any chat · fast | The agent checks the plan against the code; with every step ticked it closes the plan and recommends the review. | The spec then shows Verify. |
| A and B, no sibling plan | Write the plan · `/sdd-plan <spec path>` | — | Plan | any chat · strong, web search | The agent researches and writes the plan; for a reactivated spec, a fresh plan for the change. | You read the plan before anything is built. |

Sources: A — `parallel-work.md` "`Implement T-00x of <plan path> as a parallel worker.`" without the worker suffix;
`plans.md` "Resuming after an interruption, the ticks and the code lead … bring those level first" (it loads once the
prompt's plan is read) and "Asked for a step whose earlier steps are still open … ask once which you are" (the open
step has none). B — `sdd-plan.md` Mode B step 2 ("Report in three lines"), step 3 ("only when the user asks you to —
and then **one step**"), 0017 §6.2. No sibling plan — `sdd-plan.md` *Pick the mode* (A or C write a plan).

### 6.3 Short form and full form (R-3)

- **Command short form:** 0017 §6.1, plus `Implement <ID> of <plan path>` → `Implement <ID>`.
- **Step short form:** `<short intent> · <command short form>` of the first line: `Verify · /sdd-compile`, `Continue ·
  Implement T-003`, `Build · Start T-001`. Cards and Overview rows show it after 0017's "Next", the tree where 0020
  §4.2 shows the short form, the quick pick as `<state> · <step short form>`. The status bar text keeps `<number> ·
  <state> · <command short form>` (A-006). Where space is short the title is cut, never this form (guideline 1; how: 0022).
- **Full form:** per line its intent, then its prompt: in the detail and every tooltip that shows a step (cards, rows:
  plain text, one item per text line; tree, status bar: Markdown, the intent escaped, the prompt as each shows it today).
- Copy prompt copies the prompt only, never an intent, coach line or other text.

### 6.4 Copy prompt (R-4)

Every control that copies a prompt reads **Copy prompt**: per line in the detail, on cards and Overview rows, in the
empty states of 0018 O-8 and the quick-pick message of 0017 §6.4; named `Copy prompt: <line>`; feedback as 0016 §6.5
(`Copied` · `Could not copy`, 2 s, T-19 announced), then `Copy prompt`; `min-width: 14ch` stays. Where 0022 shows it
as an icon button, its tooltip and accessible name are `Copy prompt: <line>`.

### 6.5 Coach line (R-5, guideline 11)

For a step with a line, one line in the description colour, in the detail directly under the first line's Copy prompt
and in the first Now row (its place there is 0022's); nowhere else. Text `<session> · <model>` of the first line.
Session as the tables say: `new chat` · `same chat or new chat` · `any chat`. Model column → text: fast → `fast model`;
strong → `strong model`; strong, other family → `strong model, other family`; strong, web search → `strong model, allow
web search`. With a hint for the class (§6.7): `strong model (<hint>)`, `fast model (<hint>)`. A first Now row without
a line → no coach line in Now.

### 6.6 About this step (R-6)

- A button `?` beside the heading "Next step" (detail) and after the coach line (first Now row), wherever a coach line
  shows; name and tooltip `About this step`; `aria-expanded`. Click, Enter or Space writes the content into a
  `role="status"` region beside it (announced); focus stays on the button; the content holds no link or control.
  Escape, the button again, a press outside or focus leaving closes it; that Escape closes only the toggletip; one open
  at a time. Pattern: Inclusive Components "Tooltips & Toggletips"; TPGi "Simple standalone toggletip widget pattern"
  (read 2026-11-18: click not hover, live region, Escape and outside click close, no interactive content).
- Content, one paragraph each: effect and then-sentence of the step's row (§6.1, §6.2); the reasons of its coach line's
  session and model; `Choose the chat and the model in your AI assistant before you paste.`; `Settings: Show Step Tips
  hides these tips; Model Hints names your models.`

| Value | Reason |
| --- | --- |
| new chat | New chat: a fresh session reads the files as a stranger would; what this chat knows cannot be unread. |
| same chat or new chat | Same chat or new chat: the plan holds the state of the work, so a fresh chat picks it up. |
| any chat | Any chat: the step reads everything it needs from the files. |
| strong model | Strong model: the step reasons over the whole spec or plan. |
| fast model | Fast model: one small, well-described step. |
| strong model, other family | Strong model from another family than the one that built it: a reviewer tends to pass what its own family wrote. |
| strong model, allow web search | Strong model with web search: the plan checks libraries, versions and APIs against current facts. |

### 6.7 Settings (R-7)

Contributed under the title `FeatherSpec Studio`; read at activation and on every change; never written by the Studio.

| Key | Type, default | Description |
| --- | --- | --- |
| `featherspec-studio.showStepTips` | boolean, `true` | `Show the session and model tip under the next step and the ? button that explains it.` |
| `featherspec-studio.modelHints` | object, `{}`; string properties `strong`, `fast`; `additionalProperties: false` | `Names of your own models, shown in the tip. The Studio names no model itself.` |
| `…modelHints.strong` | string | `Your strong model: for specify, clarify, plan, compile and finding a block.` |
| `…modelHints.fast` | string | `Your fast model: for one plan step, lifecycle moves and the workflow overview.` |

`showStepTips: false` hides every coach line and `(?)`. A hint is plain text: trimmed, inner whitespace runs collapsed,
over 40 characters cut to 39 and `…`; not a string or empty → no name; other keys ignored. Fixed string properties with
`additionalProperties: false` keep the object editable in the Settings UI (VS Code ≥ 1.48, vscode-go commit e8e56a0,
read 2026-11-18). Default scope.

## 7. Texts (English, PD-016; in the text modules, asserted literally)

| New | Replaces |
| --- | --- |
| Intents, short intents, effects and then-sentences of §6.1 and §6.2, as written there | — (the prompt alone) |
| `Then, after a READY verdict: close the spec` · `Then: write the plan` · variant A `Not sure where it stands? Let the agent report first` · variant B `Then, in the same chat, if nothing blocks: continue with <ID> <title>` | `Then, after a READY verdict:` · `Then:` · `Then, in the same chat, if nothing blocks:` |
| Button `Copy prompt`, name `Copy prompt: <line>`; quick-pick message action `Copy prompt` | `Copy`, `Copy: <line>`; `Copy` |
| Step short form `<short intent> · <command short form>`; command short form `Implement <ID>` | `<command short form>`; `Implement` for every `Implement …` line |
| Coach line: the session and model words of §6.5, ` (<hint>)` | — |
| `?`, name and tooltip `About this step`; reasons of §6.6; `Choose the chat and the model in your AI assistant before you paste.`; `Settings: Show Step Tips hides these tips; Model Hints names your models.` | — |
| Tree tooltip `Next step: <intent>` then the prompt in code | `Next step: ` + the prompt in code |
| Settings title `FeatherSpec Studio` and the four descriptions of §6.7 | — (no settings) |

## 8. Error cases and edge cases

- Title with Markdown, a link or over 80 characters → 0019's short title; file text shows as text, never Markdown or HTML.
- Unreadable plan (0016 Problem) → no open step is known → NS-6 row "plan without open step".
- The step changes between showing and copying → 0017 §8 (the line behind the text shown).
- A setting changes while a toggletip is open → it closes when tips go off, else shows the new hints.
- Restricted Mode, reader window → everything here works; settings are only read. Clipboard failure → 0016, unchanged.

## 9. Acceptance criteria

Decided by automated tests in Node or jsdom unless marked manual; one fixture per row of §6.1, §6.2.

- **AC-001** The system shall give each next step that has a line the intents, step short form, coach line, effect and then-sentence of its row in §6.1, or of its case in §6.2 for the built variant, literally, from the text module; the detail shall show each line's intent directly above that line's prompt and Copy prompt.
  > **Given** Review `.specs/active/0019-x.md` **Then** `Have the result verified` over `/sdd-compile .specs/active/0019-x.md`, `Then, after a READY verdict: close the spec` over `/sdd-lifecycle .specs/active/0019-x.md`, short form `Verify · /sdd-compile`, coach `new chat · strong model, other family`.
- **AC-002** For every fixture of 0015 AC-004 whose rule is not NS-6, the rule ID and the prompts shall be byte-identical to those `nextStep()` returns at the commit on which this spec's implementation starts.
- **AC-003** Where the V-1 PD names variant A, an Active spec whose sibling plan's open step is `<ID>` shall show `Implement <ID> of <plan path>` under `Continue with <ID> <title>`, then `/sdd-plan <spec path>` under `Not sure where it stands? Let the agent report first`, short form `Continue · Implement <ID>`, and §6.2's coach line for case A.
  > **Given** Active `.specs/active/0001-tip-splitter.md`, T-001 and T-002 ticked, T-003 "Reject money values" open **Then** `Continue with T-003 Reject money values` over `Implement T-003 of .specs/active/0001-tip-splitter.plan.md`.
- **AC-004** Where the V-1 PD names variant B, that spec shall show `/sdd-plan <spec path>` under `Resume the plan: the agent reports where it stands`, then `continue` under `Then, in the same chat, if nothing blocks: continue with <ID> <title>`, short form `Resume · /sdd-plan`, and §6.2's coach line for case B.
- **AC-005** In both variants an Active spec whose sibling plan has no open step shall show `/sdd-plan <spec path>` under `Let the agent report where the plan stands` (short form `Resume · /sdd-plan`), and one without a sibling plan the same prompt under `Write the plan` (short form `Plan · /sdd-plan`, coach `any chat · strong model, allow web search`).
- **AC-006** Every card and Overview row whose spec has a step, the tree row's step part and the quick-pick description shall show the step short form of §6.3; the status bar text shall keep the command short form (0017 AC-013, AC-014 unchanged); `Implement <ID> of <plan path>` shall shorten to `Implement <ID>`; identical snapshots shall give identical short forms.
- **AC-007** Every tooltip that shows a next step (card, Overview row, tree row, status bar entry) shall show the full form of §6.3, each line's intent before its prompt, in line order; the tree tooltip's step part shall start with `Next step: <intent>`; text from the files shall appear escaped, as text.
- **AC-008** Every control that copies a prompt shall read `Copy prompt` while no feedback shows, be named `Copy prompt: <line>`, read `Copied` or `Could not copy` for 2000 ms after activation, then `Copy prompt`, and put exactly the prompt on the clipboard, no intent or coach text; rendering the detail, Board and Overview of every fixture, the empty states included, shall find no button whose text is `Copy` or whose name starts with `Copy: `; the quick-pick message's action shall be `Copy prompt`.
- **AC-009** While `showStepTips` is true, the detail and the first Now row shall show §6.5's coach line for a step with a line, in the detail as the next element after the first line's Copy prompt; no card, other row, tree item, tooltip, status bar entry, quick-pick item or step without a line shall show a coach line or a `(?)`.
- **AC-010** Where `showStepTips` is false, no surface shall show a coach line or a `(?)`, and intents, prompts and Copy prompt shall be identical to the true case.
- **AC-011** When `showStepTips` or `modelHints` changes, the detail and the Overview shall show the result within 500 ms after the host receives VS Code's configuration change event, keeping selection and area (PD-047's budget).
- **AC-012** Where `modelHints.strong` is `X`, the coach lines shall read `new chat · strong model (X), other family` (NS-5), `any chat · strong model (X), allow web search` (NS-10) and `any chat · strong model (X)` (NS-8); where `modelHints.fast` is `Y`, the NS-7 coach line shall end with `model (Y)`; a hint shall be trimmed, inner whitespace runs collapsed, cut to 39 characters and `…` over 40; a non-string or empty hint shall show no name; other keys shall change nothing.
- **AC-013** A case-insensitive search of `src` without test files and of `package.json` shall find none of `Opus`, `Sonnet`, `Haiku`, `GPT-`, `Gemini`, `Llama`, `Mistral`; with `modelHints` empty, no rendered surface of any fixture shall contain one.
- **AC-014** The `(?)` shall be a Tab-reachable button named `About this step` with that tooltip; when activated by pointer, Enter or Space it shall set `aria-expanded="true"` and write §6.6's content into a `role="status"` region beside it; when, while it is open, Escape is pressed, it is activated again, a pointer press lands outside it or focus leaves it, the system shall empty that region and set `aria-expanded="false"`; after Escape or a second activation focus shall be on the `(?)`; that Escape shall leave the side panel open; opening one toggletip shall close any other.
- **AC-015** The toggletip shall show, in order, the effect and then-sentence of the step's row, the reasons of §6.6 for its coach line's session and model, and the two closing sentences, literally, and contain no focusable element.
- **AC-016** The manifest shall contribute `contributes.configuration` titled `FeatherSpec Studio` with exactly the keys of §6.7 and their types, defaults, properties and descriptions literally.
- **AC-017** No Copy prompt, `(?)` or setting change shall create, change, move or delete a file of the workspace or write a setting (0017 AC-023's test extended).
- **AC-018** While the workspace is in Restricted Mode or the window is a reader, AC-001–AC-016 shall hold.
- **AC-019** For an open step without a title the intent shall be `Continue with <ID>` (variant A) or `Start implementing: <ID>` (NS-7), without a trailing space; a title with Markdown, a link or over 80 characters shall appear as 0019 AC-013's short title.
- **AC-020** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not replace shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every title missing at the head, a renamed one included, with the replaced statement or the head title that replaces it.
- **AC-021** 0013 and 0015–0020 shall carry the notes of §5; a literal search of `README.md` shall find `Copy prompt`, `About this step`, `featherspec-studio.showStepTips` and `featherspec-studio.modelHints`; `CHANGELOG.md` shall name intents, Copy prompt, the coach line and both settings under the version in preparation; `docs/release-checklist.md` shall carry AC-022–AC-025.
- **AC-022** *(manual, preview harness by the orchestrator, then Gregor in a real window)* Guideline 12: detail and Overview with the first Now row in Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open: no intent or prompt is cut; the coach line is readable; an open toggletip stays inside its panel and covers no Copy prompt of its step; the `(?)` shows a visible focus outline; screenshots recorded in the plan.
- **AC-023** *(manual, Gregor)* Both settings appear under "FeatherSpec Studio" in the Settings UI; Show Step Tips toggles the tips in the open panel; Model Hints offers `strong` and `fast` as text fields and the coach line shows the entered name.
- **AC-024** *(manual, Gregor, click test of PD-069 on the build)* On `tip-splitter`, for each state present (Backlog without and with plan, Ready, Active with an open step, Review, Blocked where present), Gregor says without asking what the copied prompt will do and where to run it; he confirms or changes the proposal columns of §6.1 and §6.2; the plan records the result, a change is a revise of this spec.
- **AC-025** *(manual, Gregor with his assistant)* On `tip-splitter`, NS-6's line 1 copied from the detail into a fresh chat does what its effect says: variant A builds exactly the named step and stops; variant B reports in three lines and waits, and `continue` in the same chat builds one step.

## 10. Technical notes for developers or AI agents

- As-is (read 2026-11-18): `nextStep()` (`src/core/board/nextStep.ts`) returns `{ rule, lines: [{ text, label? }] }`
  or `{ rule, text }`; `openStep()` does not tell "no plan" from "no open step" (use `entry.plan`); `shortForm()` maps
  every `Implement …` to `Implement`; `stepView()` → `StepView { short, line, lines }` (`shared/protocol/stepView.ts`,
  `isStepView` checks the exact key set); the detail's `NextStepView`/`isNextStepView` in `shared/protocol/detail.ts`.
- Consumers: `core/board/cards.ts`, `core/overview/rows.ts`, `problems.ts`, `core/copyNextStep/{currentSpec,entryView,
  copyNextStep}.ts` (status bar tooltip; message action `NEXT_STEP_COPY_LABEL`), `core/shell/specTree.ts` (`descriptionOf`,
  `tooltipOf`); texts in `shared/protocol/nextStepTexts.ts` (`'Copy'`, labels, `stepTooltip`). Webview: `detail/NextStep.tsx`,
  `ui/CopyButton.tsx` (name `<label>: <line>`, 2000 ms, own live region), `ui/StepText.tsx`, `areas/overview/{SpecRow,Now}.tsx`,
  `board/Card.tsx`; `detail/DetailFrame.tsx` closes on Escape unless `event.defaultPrevented` (the toggletip prevents it).
- The core composes intents, short forms, coach line and toggletip content from one table keyed by rule and NS-6
  case; views carry them, the webview derives nothing (guideline 1); short intent as text, command in `code`.
  Protocol guards and version change. The variant is one core constant the plan sets.
- Settings reach the core through a new port (adapter in `src/adapters/vscode/`, `onDidChangeConfiguration`); a new source
  module → `/sdd-architecture-update` in the same change set. No codicon font in the webview (A-008; `@vscode/codicons` is Ask first).
- `strong model` names the AI model guideline 11 asks for; guideline 6's "model" is the Studio's data model; the
  `userLanguage.test.tsx` sweep (`Model updated`) stays.
- Tests asserting `Copy` or labels: `nextStep`, `stepView`, `detail`, `cards`, `rows`, `specTree`, `currentSpec`, `statusEntry`,
  `copyNextStep`, `CopyButton`, `SpecDetail`, `SpecBoard`, `Keyboard`, `Sections`, `manifest`, `noWrite`, `src/test/*.smoke`.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | E-1: both NS-6 variants specified, A recommended; the V-1 PD picks (proxy) | 08 E-1 recommends `Implement …` after V-1; the orchestrator asked for both | AC-003 or AC-004 is void; a third outcome needs a revise |
| A-002 | E-2: coach line only in the detail and the first Now row (proxy) | 08 E-2 (overload), guideline 11 | AC-009 |
| A-003 | E-3: words `strong model`, `fast model`, `other family`, `allow web search` (proxy) | 08 E-3, R-5 example; guideline 11 classes | §6.5 texts, AC-012 |
| A-004 | §6.1 and §6.2 proposal columns and short intents hold until the click test (proxy) | 08 R-1 says Gregor confirms them; PD-069 process | Texts of §6.1, §6.2, §7 |
| A-005 | `Continue · Implement T-003` with the ID once, not 08 R-3's `Continue T-003 · Implement T-003`; NS-7 `Build` (proxy) | The ID would repeat; the tree has little width (0022 N-3); `Start · Start T-001` reads as a stutter | AC-003, AC-006 |
| A-006 | Status bar text keeps the command short form, named deviation from guideline 1 (proxy) | 08 §2 scope lists only its tooltip; status bar text stays short | AC-006 |
| A-007 | Command titles "Copy Next Step" (palette, tree inline, context menu) stay (proxy) | They name the source where no prompt is visible; 0017 AC-009 and 0020 §6 stay valid | Tree and palette texts |
| A-008 | The `?` is drawn without a codicon font (proxy) | Guideline 9 theme variables; a font is a new dependency | `(?)` look only |
| A-009 | Toggletip also closes on focus leaving and on a second activation (proxy) | Toggletip pattern (§6.6); content has no control to keep open for | AC-014 |
| A-010 | NS-6 without sibling plan gets "Write the plan", not 08's "report" (proxy) | `/sdd-plan` then writes a plan (Mode A or C) | AC-005 |
| A-011 | Coach line advises the first line; the toggletip covers the step (proxy) | Guideline 11 "once per view"; the first line is what cards copy | AC-009, AC-015 |
| A-012 | Hints are plain text, at most 40 characters, default scope (proxy) | Display only; a workspace value cannot run anything | AC-012 |

## 12. Open points

- OP-001 V-1 result as a PD (08 §1). **Blocking for `/sdd-plan`**, which builds the named variant. Resolved 2026-11-18: PD-072 names variant A (record `docs/decisions/v1-ns6-wording-2026-11-18.md`); Copilot stays for AC-025.
- OP-002 Click test on an HTML draft before `/sdd-plan` (PD-069): Gregor confirms §6.1, §6.2, §6.5 and the short
  intents; a change is a revise. **Blocking for `/sdd-plan`.**
- OP-003 NS-5 with a strong hint reads `strong model (X), other family` though X may share the family that built the
  work. Followed: 08 AC-007 as drafted; a key for the review model is decided in the click test.
- OP-004 If 0022's 300 px tree check (N-3) cannot show the step short form uncut, the tree shows the command short form
  and keeps the intent in its tooltip (recommendation; named deviation from guideline 1); the layout is 0022's.
- OP-005 FeatherSpec's README (⑤–⑧, "The loop") is not in this repository (`docs/discovery/` has only
  `featherspec-format.md`); cited through 07 §5.1, §6a; each claim used is also in the command and rule files of §6.1.

## 13. Definition of Ready / Done and next steps

Ready: §6 and §7 literal, §5 listed, OP-001 and OP-002 closed. Done: AC-001–AC-021 green with evidence in the plan,
AC-022–AC-025 checked, §5 applied, docs, architecture and Memory Bank synced, `/sdd-compile` READY. Next: `/sdd-clarify`
in a fresh session; then the V-1 PD and the click test; then `/sdd-plan`, which picks the variant.
