# Start via lifecycle, plan attachment, prompt layout

**Status:** In Progress
**Plan:** [0033-start-via-lifecycle-plan-attachment-prompt-layout.plan.md](0033-start-via-lifecycle-plan-attachment-prompt-layout.plan.md)

Basis: Gregor's practice feedback after 0032, `docs/ux-audit/17-start-step-and-prompt-layout.md` (addendum to 16), treated
as typed by him and binding before the release. Rules from 17 §2–§4, criteria from 17 §5, PD-096 and PD-097 new.
Feature freeze of 16 holds: only these eight points. No interview: every answer comes from 17; open items became proxies
(§10, §11).

## 1. Summary

A Ready spec no longer offers `Implement T-001` directly: its next step is a visible `/sdd-lifecycle <spec> In Progress`
that moves spec and plan to `active/`; T-001 follows once the pair is there. Every Send attaches what its prompt names
(Implement → plan only; Start → spec and plan). The prompt block is as wide as its text, paths break after `/` only, the
Next step lines up with Plan, Progress and Files, and Up next keeps the status glyph on the title line.

## 2. Goal and problem

Today the Studio offers `Implement T-001 of .specs/backlog/…plan.md` for a Ready spec and relies on the FeatherSpec rule
that a start signal includes the move backlog → active (0028 D-4). That rule lives in `/sdd-plan`'s *Always* only; a new
chat with a fast model knows only `AGENTS.md`, so the move depends on it following a reference (17 §2). FeatherSpec's
documented flow is `/sdd-plan` → human reads the plan → `/sdd-lifecycle` (backlog → active) → implement, and the move's
bookkeeping (`git mv`, status lines, Memory Bank, tracker question) does not belong in a build step. Further, Implement
names the plan but attaches the spec (17 §3), and three layout defects remain (17 §4).

Goal: the eight criteria of §8 hold, and nothing else changes.

## 3. Users and roles

Developer, one role (0001–0007). The assistant (GitHub Copilot or Claude Code) receives the prompt and the files §6.3
names.

## 4. Scope

### In scope

- The new start step and the changed NS-7 (§6.1, §6.2) in `src/shared/protocol/nextStepTexts.ts` and
  `src/core/board/nextStep.ts`.
- The attachment as a list of files per step (§6.3) in `src/core/assistant/attachment.ts`, `assistants.ts` and the send
  path.
- Prompt width, path breaks, Next step indent and Up next glyph (§6.4–§6.7) in `src/webview/main.css` and the rendering
  components.
- The notes of §5 on the specs it amends; PD-096 and PD-097 in `docs/product/product-decisions.md`; `README.md`,
  `CHANGELOG.md`; `docs/release-checklist.md` section "0033".

### Out of scope

- Any change to FeatherSpec itself (`AGENTS.md`, `/sdd-plan`'s start signal) — because 17 §6 says the flow there is
  already right and the start signal stays as a safety net for users without the Studio.
- `/sdd-clarify` writing a `**Clarified:**` line (H-9) — because 17 §6 makes it a FeatherSpec 1.12 candidate.
- A follow-up line `Then: implement T-001` under the start step — because two Send buttons invite sending both at once
  (17 §2).
- Any other text, layout or behaviour change, including findings new during this work — because 16's feature freeze
  holds; they go to the backlog.

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0033 (…): …*".

| Spec · statement | Amendment |
| --- | --- |
| 0028 D-4 (start signal: Implement includes backlog → active) | A Ready spec's next step is the start step `/sdd-lifecycle <spec> In Progress`; Implement follows in `active/` (PD-096, 0033 §6.1, §6.2) |
| 0021 §6.1 NS-7 row (short form `Start`, effect `The agent moves the spec to active, builds one step, …`) | NS-7 serves `active/` without a tick; its effect no longer names the move (0033 §6.2); the start step has its own row (§6.1) |
| 0027 §6.1 (attachment table, a yes/no per case) and PD-091 | Each case attaches the files its prompt names: start → spec and plan, Implement → plan only (PD-097, 0033 §6.3) |
| 0022 AC-028 (§4.1 rule; number and title share the first line in the two- and three-line layouts) | In the two-line layouts the status glyph, number, title and Problem badge share the first line; the narrow layout has two lines (0033 AC-008) |
| 0022 AC-015 (a `<wbr>` after each `/`, `-` and `.` of every displayed path) | A `<wbr>` after each `/` only; each segment between slashes is one unbreakable unit, in every displayed path (0033 AC-006) |
| 0027 AC-010 (a plan path is refused) | A plan entry of the current model whose file exists is accepted (PD-097, 0033 §6.3); every other plan path stays refused |
| 0031 §6.1 and 0032 AC-006 (`li > code:has(+ .send-split)` at full width) | The line is a column; the prompt is as wide as its text, Send under it, left-aligned (0033 §6.4) |

## 6. Business rules

### 6.1 Start step (PD-096)

While a spec sits in `backlog/` with a plan beside it and no step of that plan is ticked (state Ready with an open step),
the Next step holds exactly one line:

- intent `Start: move the spec and its plan to active`;
- short form `Start · Set active`;
- prompt `/sdd-lifecycle <spec> In Progress`, `<spec>` being the spec's path as in every other prompt;
- Tip `Tip: Use any chat with a fast model.`;
- effect in the `(?)`: `The agent moves spec and plan to active and sets the status to In Progress. Afterwards the Studio offers T-001.`

No follow-up line. `In Progress` is the status word from `AGENTS.md` that `/sdd-lifecycle`'s `argument-hint` expects;
"active" stands in the visible intent for the person.

### 6.2 Implement after the move

While the spec sits in `active/` and no step is ticked, the Next step is `Start implementing: T-001 …` with
`Implement T-001 of .specs/active/…plan.md`. NS-7's effect no longer says that the agent moves the spec to active.
States with a tick keep today's NS-6 lines (0032).

### 6.3 The attachment follows the prompt (PD-097)

| Step | Prompt names | Attachment |
| --- | --- | --- |
| Start (§6.1) | spec | spec and plan |
| `Implement <ID> of <plan>` (start, continue, the `Then:` line after Report first) | plan | plan only |
| `/sdd-plan`, `/sdd-compile`, `/sdd-clarify`, `/sdd-specify` | spec | spec (unchanged) |
| `/sdd-lifecycle` for a duplicate or folder contradiction (NS-2) | spec | nothing (unchanged) |

Copilot gets `attachFiles` with the files in table order; Claude Code gets one ` @<path>` per file in the same order, and
0027's whitespace rule applies per path (a path with whitespace gets no `@`, the others keep theirs). In Copilot's current
chat nothing is attached (PD-094 holds). The Send item's name and tooltip name the attached files.

### 6.4 Prompt width

In the detail and the Plan map header, each Next step line is a column: the prompt block is as wide as its text and at
most as wide as the column; Send stands under it, left-aligned. At 1000 px and 1600 px.

### 6.5 Path breaks

A displayed path breaks only after `/` (a `<wbr>` after each `/`), never after `-` or `.` and never inside a word. Every segment between slashes is one unbreakable unit; a segment longer than its column overflow-wraps as the last resort. This holds for every displayed path (Next step prompts, Ways prompts, detail path, Files, cards, banners, problems). The copied and the sent text are unchanged.

### 6.6 Next step indent

In the sidebar detail, the left edge of the Next step's first text equals that of Plan, Progress and Files (± 1 px).

### 6.7 Up next glyph

In the Overview's Up next entry, the status glyph stands on the title line before the number, also when the view is
narrow, as in the tree.

## 7. Error cases and edge cases

- A Ready spec without an open step (every step ticked): NS-6-resume as today (A-001).
- A spec in `backlog/` whose plan has a tick: today's lines, no start step (A-002).
- A plan path with whitespace under Claude Code: the spec keeps its `@`, the plan gets none, and vice versa (§6.3).
- A plan file that disappeared between render and Send: 0024's attachment check drops that file only (A-003).
- Copy prompt copies the bare prompt, with no `@` suffix and no `<wbr>` (§6.5).

## 8. Acceptance criteria

Node or jsdom tests decide every criterion; where a criterion names a width, the orchestrator's preview checks it too.

- **AC-001** Ready-Spec (in `backlog/`, Plan vorhanden, kein Schritt abgehakt): Next step ist der einzige Eintrag
  `Start: move the spec and its plan to active` · Kurzform `Start · Set active` · Prompt `/sdd-lifecycle <spec> In Progress`
  · Tip `Tip: Use any chat with a fast model.` Wirkung im `(?)`: `The agent moves spec and plan to active and sets the
  status to In Progress. Afterwards the Studio offers T-001.` Keine Folgezeile.
- **AC-002** Liegt der Spec in `active/` und ist nichts abgehakt: `Start implementing: T-001 …` ·
  `Implement T-001 of .specs/active/…plan.md`. Der Wirkungstext von NS-7 sagt **nicht** mehr „moves the spec to active“.
- **AC-003** Jeder `Implement <ID> of <plan>` hängt **nur den Plan** an: Copilot `attachFiles: [plan]`, Claude Code
  `… @<plan>`.
- **AC-004** Der Start-Schritt hängt **Spec und Plan** an: Copilot `attachFiles: [spec, plan]`, Claude Code
  `… @<spec> @<plan>`. Die Whitespace-Regel für Claude Code gilt je Pfad. Im aktuellen Chat wird nichts angehängt
  (PD-094 bleibt).
- **AC-005** Der Prompt-Block ist so breit wie sein Text, höchstens so breit wie die Spalte. Send steht darunter,
  linksbündig. Gilt in Detail und Plan-map-Kopf, bei 1000 und 1600 px.
- **AC-006** Angezeigte Pfade brechen nur nach `/` um (`<wbr>`). Kopierter und gesendeter Text sind unverändert, mit Test.
- **AC-007** Die linke Kante des ersten Texts im Next step ist gleich der von Plan, Progress und Files (± 1 px), in der
  Seitenleiste. Mit Test über `getBoundingClientRect`.
- **AC-008** Das Status-Symbol steht auf der Titelzeile und nicht allein in einer Zeile.

The criteria keep 17 §5's literal wording (German, as Gregor wrote it); §6 is their English reading and binds the same.

## 9. Technical notes for developers or AI agents

- As-is (`ffc55a1`): `nextStep.ts` case `Ready` returns `lines('NS-7', 'NS-7', startIntent(...), Implement …)` for any
  open step; `STEP_GUIDES['NS-7']` (`nextStepTexts.ts`) has short `Start`, session `any`, model `fast` and the effect
  with "moves the spec to active". The start step needs its own `StepCase` (e.g. `NS-7-start`) and guide row.
- `attachment.ts`: `STEP_ATTACHES` is `Record<StepCase, boolean>`, `attachmentOf()` returns one `attach` built from the
  spec key; it becomes a list of files per case (spec, plan, or both), the plan path from the entry's plan key.
  `assistants.ts` `callsFor()` takes one attachment (`attachFiles: [uri]`, one ` @path`); it takes a list.
  `createAttachmentCheck()` accepts only spec keys (`model.project.specs`); plan keys need the same check.
- `sendMainName()` (`shared/protocol/assistantTexts.ts`) names one file; `attachesInTarget()` (`shared/protocol/assistant.ts`)
  serves core and webview.
- `main.css`: `.next-step-lines li` (~866) is a wrapping row; `li > code:has(+ .send-split) { flex: 1 0 100% }` (~875,
  0032 AC-006); `.section-body ul, .section-body ol { padding-left: 18px }` (~948) beats `.next-step-lines { padding: 0 0 4px }`;
  `.section-body .criteria-open, .detail-files { padding-left: 0 }` (~1088) shows the fix pattern.
- jsdom has no layout: AC-007's `getBoundingClientRect` test needs a real layout (the orchestrator's harness or a
  stylesheet assertion beside it); see A-004.
- Tests compare literals: every text change moves its tests and the specs of §5.

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | A Ready spec whose steps are all ticked keeps NS-6-resume (proxy) | AC-001 names "kein Schritt abgehakt"; 17 does not touch NS-6-resume | AC-001 |
| A-002 | A spec in `backlog/` with a ticked step keeps today's lines (proxy) | AC-001's condition excludes it; 16's freeze | AC-001 |
| A-003 | When one of two attached files fails 0024's check, the other is still attached (proxy) | 0024 drops a missing attachment without failing the Send | AC-004 |
| A-004 | AC-007's `getBoundingClientRect` test runs where a layout engine exists (the preview harness); the unit suite adds a stylesheet assertion for `.section-body .next-step-lines { padding-left: 0 }` (proxy) | jsdom returns zero rects | AC-007 |
| A-005 | `<spec>` in the start prompt is the spec's repository path, as in `/sdd-plan <spec>` (proxy) | Every other prompt uses the key | AC-001 |
| A-006 | A single path segment wider than its column (a file name longer than about 40 characters below about 320 px) wraps inside as the last resort instead of being cut (proxy, compile re-check 2026-11-20) | 17 orders breaks only after `/`; cutting or a horizontal scrollbar would hide the name | AC-006 at very narrow widths |

## 11. Open points

- OP-001 `/sdd-clarify` 2026-11-20 (stranger pass by role-play, no subagent), 6 findings, applied at Gregor's standing
  request: AC-001 left Ready without open step and backlog-with-tick open (A-001, A-002); a partly failing attachment
  check (A-003); jsdom cannot decide `getBoundingClientRect` (A-004); `<spec>`'s form (A-005); the Send item's name with
  two files (§6.3, last sentence). The German literal ACs are kept as ordered, with §6 as their English reading.

## 12. Ready, Done and next steps

Ready: clarified 2026-11-20 (OP-001); planned 2026-11-20, 6 steps in 3 stages. Done when AC-001…AC-008 pass; every test
at the commit on which implementation starts exists at the head and passes, adjusted only where §5 changes its statement;
`npm run test:unit` and `npm test` pass on Windows and in CI; a fresh `/sdd-compile` gives READY with 0 deviations; the
preview of 17 §5 *Prüfen* is recorded in `docs/release-checklist.md` under "0033"; README, CHANGELOG, PD-096 and PD-097
updated. Acceptor: Gregor (practice check on `C:\projects\test`: Ready → Set active → T-001).
