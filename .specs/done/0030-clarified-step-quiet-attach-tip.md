# Clarified Next Step, Quiet Attachment, Tip Sentence

**Status:** Implemented
**Plan:** [0030-clarified-step-quiet-attach-tip.2026-11-20.plan.md](../plan-archive/0030-clarified-step-quiet-attach-tip.2026-11-20.plan.md)

Basis: Gregor's feedback 2026-11-20 (standing answer `orch/SPEC-0030.md`, treated as typed by him; screenshot of backlog
spec 0001 right after `/sdd-clarify` ran in Copilot, +98 −36); FeatherSpec `.claude/commands/sdd-clarify.md` (revise mode,
findings in *Open points*, no marker in the spec); 0017, 0021 (coach line), 0024 and 0026 (Send), 0027 (attachment, PD-091);
guidelines 7, 8, 10, 11. Feature freeze (`docs/ux-audit/14-final-review.md` §1): three fixes from real use. No interview:
every answer comes from the standing answer; open items became proxies (§11, §12).

## 1. Summary

Three small fixes. (1) After the Studio handed over `/sdd-clarify` for a Backlog spec and the spec file then changed, the
Next step offers only `/sdd-plan` (`Write the plan`), not the challenge again. (2) The attachment line
`<file> attached when sent` disappears; Send keeps attaching, and only its accessible name and tooltip say so. (3) The
coach line becomes one guiding English sentence, `Tip: Use a new chat with a strong model.`

## 2. Goal and problem

1. `/sdd-clarify` writes no marker into the spec (it revises the file, records findings in *Open points*, in
   `DocLanguage`). The Studio therefore keeps showing NS-9 `Have the spec challenged, then plan it` after the challenge
   ran, and leads the user into a second challenge.
2. The line under Send (0027 §6.3) takes a row in the detail, the first Now row and the Plan map header and tells the user
   nothing they must act on (guideline 11).
3. `new chat · strong model` reads as a label, not as advice; Gregor wants a sentence that guides.

Goal: the step after a challenge is the plan; Send attaches silently; the coach line is a sentence.

## 3. Users and roles

Developer, one role (0001–0007). The AI assistant receives only the prompt and, where 0027 says, the spec file.

## 4. Scope

### In scope

- The clarify memory (§6.1) and the clarified step (§6.2) for Backlog specs without a plan.
- Removing the attachment line; the attachment named in Send's accessible name and tooltip (§6.3).
- The coach sentence for every session and model of 0021/0026 (§6.4, §7); `Tip:` as PD-092.
- README, CHANGELOG, the release checklist, PD-092, §5's notes.

### Out of scope

- Reading the spec's text to detect a challenge (Open points, `**Clarified:**`, wording) — because the standing answer
  forbids language-dependent parsing; `DocLanguage` varies.
- A clarify memory for a challenge typed by hand in a chat — because the Studio cannot see it; that case behaves as today.
- Changing which steps attach, or the call shapes — because 0027 and PD-091 stay as they are; only the line goes.
- Other steps' rules, intents, short forms, the `?` toggletip text, or the Send menu — because of the feature freeze (14).
- A way to reset or view the memory — because the memory only ever removes one redundant line and never blocks (A-002).

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0030 (…): …*".

| Spec · statement | Amendment |
| --- | --- |
| 0021 §6.1 row NS-9; 0017 NS-9 (Backlog, criteria, no plan) | While the spec counts as clarified (0030 §6.2): one line `Write the plan` · `/sdd-plan <spec>`, as NS-10 |
| 0021 §6.5 "Text `<session> · <model>`" and its word list; AC-001, AC-009 coach texts; 0026 §6.2 coach strings | 0030 §7's sentence |
| 0027 §6.3 attachment line; AC-003; AC-015 "`README.md` shall contain `attached when sent`"; §7 row "Attachment line" | No line; 0030 §6.3's accessible name and tooltip; README per 0030 AC-011 |

## 6. Business rules

### 6.1 The clarify memory

A **hand-over** is the Studio putting the line `/sdd-clarify <spec>` into a chat (Send, outcome *opened*) or onto the
clipboard (Copy prompt, Send's fallback copy, the *Copy next step* command; outcome *copied*). After a hand-over the Studio
remembers, for the active project and that spec key, the spec file's modification time and size as the model held them
when the hand-over **started** (the click or command), so a challenge that changes the file before Send settles still
counts. A later hand-over for the same key replaces the entry; on each write, entries whose key names no spec of the
project are dropped. A failed copy, or a Send that neither opened nor copied, remembers nothing. The memory survives a
window reload and belongs to the workspace (A-001).

### 6.2 Clarified

A spec **counts as clarified** while all hold: without the memory its next step would be NS-9 (Backlog, criteria
present, no plan); the
memory has an entry for its key; and the spec's current modification time or size differs from the entry. Then its next
step is the one line `Write the plan` · `/sdd-plan <spec>`, rule NS-9, case NS-10 (NS-10's guide (short form `Write plan`, session, model,
effect, attachment)), and no `/sdd-clarify` line. In every other case the next step is the one it would be without the memory. A renamed or moved spec
has a new key and no entry; once a plan exists, the plan rules decide. The memory never yields a Problem, a message or an
error; an unreadable or unavailable memory reads as empty (A-002).

### 6.3 Quiet attachment

Where a Send view carries an attachment (0027), no attachment line renders in the detail, the first Now row or the Plan map
header. The Send request still carries the attachment exactly as 0027 says. The main part of the split button carries
§7's accessible name and tooltip; the menu items keep their names (their visible label must stay in their name) and lose
their `aria-describedby`; without an attachment everything is as today.

### 6.4 The coach sentence

Where 0021, 0025 and 0026 show a coach line, it shows §7's sentence for the first line's session and model, with the
model hint (0021 §6.7) after the word `model`. One sentence; place, colour, `showStepTips` and the `?` stay unchanged.
*Amended by 0031 (follow-up Send): also under each follow-up line's Send, for its own case (0031 §6.3, AC-011).*

## 7. Texts (English, PD-016; in the text modules, asserted literally; proxies, A-003)

| New | Replaces |
| --- | --- |
| Coach: `Tip: Use <session> with <model>.` — session: new → `a new chat`; current or new → `the current chat or a new one,`; any → `any chat` | `<session> · <model>` |
| Model: fast → `a fast model`; strong → `a strong model`; strong, other family → `a strong model from another model family`; strong, web search → `a strong model, and allow web search`; with a hint `a strong model (<hint>)`, `a fast model (<hint>)` | `fast model`, `strong model`, `strong model, other family`, `strong model, allow web search` |
| Send name and tooltip with attachment: `Send to <Name> (<target>): <line>. Attaches <file name>.` | `Send to <Name> (<target>): <line>` and the line `<file name> attached when sent` |

Examples: `Tip: Use a new chat with a strong model.` · `Tip: Use the current chat or a new one, with a fast model.` ·
`Tip: Use a new chat with a strong model from another model family.` · `Tip: Use any chat with a strong model, and allow web search.`

## 8. Error cases and edge cases

- The user edits the spec by hand after copying `/sdd-clarify` without running it: counts as clarified (A-004).
- `/sdd-clarify` ran and changed nothing: the file is unchanged, NS-9 stays.
- Clock or remote file systems: the rule compares the file's own modification time and size, never the wall clock.
- Several projects (S3): the memory is per project root; another project's entry has no effect.
- A spec that loses its criteria (R-2 fails): NS-8, as today.
- The memory changes while the Send menu or a Copy feedback is open: as on any model change (0024 AC-010).

## 9. Acceptance criteria

Node or jsdom tests decide every criterion unless marked manual.

- **AC-001** When a hand-over (§6.1) of `/sdd-clarify <spec>` succeeds, the system shall store for the active project and
  key the spec's modification time and size from the moment the hand-over started, also when the spec changed before Send
  settled; when the copy fails it shall store nothing; after the store is re-opened (reload) the entry shall still be read;
  a write shall drop entries of keys that name no spec.
- **AC-002** While a Backlog spec with criteria and without a plan has an entry whose modification time or size differs
  from the spec's current one, `nextStep()` shall return exactly one line, intent `Write the plan`, text
  `/sdd-plan <spec>`, rule NS-9, case NS-10; the detail, the Up next row, the Board card, the tree and *Copy next step* shall show
  that step and no text containing `/sdd-clarify`. Where an assistant is offered (0024), that line is the Send to <assistant> primary and its Send view
  carries the spec's path as `attach`, for Copilot and for Claude Code (0027; `STEP_ATTACHES['NS-10']` is true).
- **AC-003** If the spec has no entry, or its entry equals its current modification time and size, then `nextStep()` shall
  return today's NS-9 deep-equal to the baseline.
- **AC-004** If the spec is moved or renamed, gets a plan, loses its criteria, or the memory cannot be read, then the
  system shall return the next step it returns today and show no message, Problem or diagnostic.
- **AC-005** When the spec file changes after a successful hand-over, the detail, the Overview, the Board and the tree shall show the
  clarified step within 500 ms after the change event reaches the Studio (PD-047, timing test), selection unchanged.
- **AC-006** Where a Send view carries an attachment, the detail, the first Now row and the Plan map header shall render no
  element with the text `attached when sent` and no `aria-describedby` to one; the Send request shall carry the same
  `attach` as before.
- **AC-007** Where a Send view carries an attachment, the main part shall be named and titled §7's text with the
  attachment's file name, and the menu items shall keep today's names without `aria-describedby`; without an attachment,
  names and tooltip shall be today's.
- **AC-008** For each session (new, current or new, any) and each model (fast, strong, other family, web search), with and
  without a model hint, the coach line shall read §7's sentence literally; the four examples of §7 shall be among them.
- **AC-009** Each §7 text shall exist once, in a text module; the prefix `Tip:` shall be one constant (PD-092).
- **AC-010** With an empty memory, every project under `test/fixtures/` and this repository shall keep `nextStep()` and the
  rendered Overview, Board, tree and detail deep-equal to the commit on which implementation starts, except the coach
  text (AC-008), the attachment line (AC-006) and the Send name and tooltip (AC-007).
- **AC-011** The specs of §5 shall carry its notes; `docs/product/product-decisions.md` PD-092 (`Tip:` instead of
  `Info:`); `README.md` shall contain `Tip: Use` and not `attached when sent`; `CHANGELOG.md` `Write the plan` and `Tip:`; `docs/release-checklist.md` a 0030 section with AC-012, AC-013.
- **AC-012** *(manual, preview harness, by the orchestrator)* The detail and the Up next row of a Backlog spec, before and
  after the clarify switch, with Send and attachment offered, in Dark, Light and High Contrast at 1600 px and 1000 px with
  the side panel open: no attachment line, no text or button cut, no word broken inside itself, the Tip sentence
  wraps only between words.
- **AC-013** *(manual, Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and Claude Code)* After Send of
  `/sdd-clarify` and the challenge, the Next step reads `Write the plan` · `/sdd-plan …` without a reload; no attachment
  line; the coach reads as a Tip sentence. He notes the versions.
- **AC-014** Every test at the commit on which implementation starts shall exist at the head and pass, adjusted only
  where §5 changes its text; `npm run test:unit` and `npm test` shall pass on Windows and in CI.

## 10. Technical notes for developers or AI agents

- As-is (`73b11e2`): `nextStep()` (`core/board/nextStep.ts`, `case 'Backlog'`) returns NS-9 with `NS9_INTENT`,
  `NS9_THEN_INTENT` when `entry.plan === undefined`; NS-10 (`WRITE_PLAN_INTENT`) otherwise. Every surface derives from
  `nextStep(model, key)`; the spec key is its path (`.specs/backlog/0001-x.md`); `SpecEntry.modifiedMs`, `.size` exist.
- Coach: `stepTips()` (`core/board/stepTips.ts`) builds `` `${SESSION_WORDS[…]} · ${model}` `` from `MODEL_WORDS`
  (`shared/protocol/nextStepTexts.ts`); only there.
- Attachment: `AttachmentLine.tsx` rendered by `StepAction.tsx` when `send.attach` is set; `aria-describedby` on the main
  part and menu items (`SendButton.tsx`, `sendMainName`); texts `ATTACHED_WHEN_SENT`, `attachTooltipText`
  (`assistantTexts.ts`).
- Hand-overs: Send goes through `core/assistant/send.ts` (`createSend`, outcomes `opened`, `copied`, `copyFailed`); Copy prompt
  through `boardRequests.ts` `copyText` and `copyLine.ts`; the command through `core/copyNextStep/`.
- Persistence proposal (decided in `/sdd-plan`): a small port beside `createUiMemory` on `context.workspaceState`, keyed by
  project root, or a record in the runtime store (0004). The rule of §6.2 is a pure function of the model and the memory.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | Per workspace and spec key, surviving a reload (decided: standing answer "persisted like the existing runtime store") | A challenge often ends after a reload; the key is the spec's path | AC-001 |
| A-002 | Unknown or unavailable memory behaves as today, never blocks (decided: standing answer) | Today's NS-9 is still a valid step; a missed switch costs one extra line | AC-003, AC-004 |
| A-003 | §7's texts (proxy) | Gregor's three examples; one sentence each (guideline 11); the Send name keeps 0026's form | AC-007, AC-008 |
| A-004 | Any change of the spec file after the hand-over counts, by whoever (proxy) | Language-free (standing answer); the file's own time and size avoid clock skew | AC-002; a hand edit after a copy skips the challenge line |
| A-005 | The *Copy next step* command and Send's fallback copy count as a hand-over, like Copy prompt (proxy) | They put the same prompt on the clipboard (guideline 10: one step, one wording) | AC-001 |

## 12. Open points

- OP-001 Persistence: workspace state or the runtime store (A-001) — decided in `/sdd-plan` 2026-11-20: workspace state
  (`context.workspaceState`, keyed by project root), like the UI memories; Gregor can flip it.
- OP-002 `Tip:` or `Info:` — `Tip:` chosen (Gregor: VS Code's chat uses "Tip:"), PD-092; Gregor can flip it.
- OP-003 Whether the challenge's own *Open points* edit should ever be required — not now (no text parsing).
- OP-004 `/sdd-clarify` 2026-11-20 (stranger pass, no subagent available): 12 findings, 3 blocking, applied in one pass at
  Gregor's standing request. Blocking: (a) the clarified step's rule was unnamed, now rule NS-9, case NS-10 (§6.2, AC-002);
  (b) a challenge that changes the file before Send settles would have stored the new time and never switched, now the
  time at the hand-over's start (§6.1, AC-001); (c) naming menu items with §7's text broke label-in-name, now the main part
  only (§6.3, AC-007). Others: "offer" clashed with 0024's assistant offer, now "hand-over"; "today" in §6.2 meant two
  things, now "without the memory"; unbounded memory, now pruned on write; AC-012's "one line at 1600 px" was not
  decidable for the Now row, now "wraps only between words"; AC-011's CHANGELOG literal fixed; a hand edit after a copy
  (A-004) and the watcher lag before a hand-over (the file changed less than 500 ms before it: the old time is stored, so
  the next read counts as clarified) kept as proxies; A-001 kept with OP-001.
- OP-005 Amendment 2026-11-20 (orchestrator's proxy decision after `/sdd-compile`, Gregor can flip it): a Backlog spec never sits
  in the Now rows, so AC-002 and AC-012 now name the Up next row instead of the first Now row; the checklist follows.

## 13. Ready, Done and next steps

Ready: clarified 2026-11-20 (OP-004); planned 2026-11-20, 6 steps in 3 stages. Done per the DoD of `AGENTS.md`; AC-012 by the orchestrator, AC-013 by Gregor. Closed 2026-11-20 by `/sdd-lifecycle`; AC-013 (Gregor) and CI on PR #2 stay open.

## Plan history

- 2026-11-20 — [0030-clarified-step-quiet-attach-tip.2026-11-20.plan.md](../plan-archive/0030-clarified-step-quiet-attach-tip.2026-11-20.plan.md) — 6 steps in 3 stages: the clarified next step, quiet attachment, Tip sentence; preview 24 of 24 clean; Windows `npm test` at d218f0c passed; manual items open: AC-013 (Gregor), CI on PR #2.
