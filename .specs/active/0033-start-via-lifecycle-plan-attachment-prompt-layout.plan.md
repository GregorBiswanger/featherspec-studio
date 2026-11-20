# Plan — Start via lifecycle, plan attachment, prompt layout

**Spec:** [0033-start-via-lifecycle-plan-attachment-prompt-layout.md](0033-start-via-lifecycle-plan-attachment-prompt-layout.md)
**Status:** In Progress
**Last updated:** 2026-11-20
**Current step:** T-001

## Approach

Next step first (T-001): the start case and the changed NS-7 in `nextStep.ts` and `nextStepTexts.ts`, so the literal
tests move once. T-002 turns the attachment into a file list per case, through the send path. T-003 is the webview and
stylesheet (prompt column, `<wbr>`, indent, Up next glyph). Then docs and the full gate run (T-004), the orchestrator's
preview of 17 §5 *Prüfen* (T-005), and its evidence in the release checklist (T-006). No new pattern: Memory Bank touched
in T-004 only (`activeContext.md`); no `architecture:` entry changes.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-004) · pre-done `npm test` on
Windows and CI, run by the orchestrator. Cadence (Gregor): per step only that step's tests; the full chain once, in T-004.

## Research

**Checkpoint digest (2026-11-20, Mode A; answered from 17, Gregor not asked).**
- Survey at `ffc55a1`: `nextStep.ts` case `Ready` returns NS-7 `Implement <ID> of <plan>` for any open step;
  `STEP_GUIDES['NS-7']` effect names the move to active. A Ready spec in `backlog/` gets a new `StepCase` for the start
  step; `active/` without a tick keeps NS-7.
- `STEP_ATTACHES` is a boolean per case; `attachmentOf()` builds one attachment from the spec key; `callsFor()` takes one
  attachment; `createAttachmentCheck()` accepts spec keys only, so plan keys need it too; `sendMainName()` names one file.
- `main.css`: `.next-step-lines li > code:has(+ .send-split) { flex: 1 0 100% }` stretches the prompt (17 §4);
  `.section-body ul` (18 px) beats `.next-step-lines`'s padding; `.section-body .criteria-open, .detail-files` shows the
  fix.
- No `done/` spec becomes a `Deprecated` candidate; 0021, 0027, 0028, 0031, 0032 get §5 notes only.
- `/sdd-lifecycle`'s `argument-hint` expects a status word from `AGENTS.md`; `In Progress` is one (17 §2), checked in
  `.claude/commands/sdd-lifecycle.md`.
- [Support attachFiles in workbench.action.chat.open](https://forum.cursor.com/t/support-attachfiles-in-workbench-action-chat-open/156275)
  — `attachFiles` is an array, so two files go in one call. Retrieved 2026-11-20 by 0032.

## Stages

1. T-001 → T-002 → T-003 — next step, attachment list, webview
2. T-004 — notes, PDs, docs and final gates
3. T-005 → T-006 — preview (orchestrator) and its evidence in the checklist

No parallel stage: T-001 and T-002 share `StepCase` and `STEP_ATTACHES`; T-003 renders both; T-006 records T-005's result.

## Steps

### T-001 — Start step and NS-7 after the move

- **Covers:** AC-001, AC-002
- **Do:** `nextStepTexts.ts`: new case (e.g. `NS-7-start`) with intent, short form, Tip, effect per spec §6.1; NS-7's
  effect without the move. `nextStep.ts`: Ready in `backlog/` with an open step and no tick → the start line only, prompt
  `/sdd-lifecycle <spec> In Progress`; `active/` without a tick → NS-7 (A-001, A-002 unchanged). Move the literal tests;
  new `core/board/start0033.test.ts` "0033 AC-001 …" (single line, no follow-up, texts), "AC-002 …".
- **Verify:** `npx vitest run src/core/board src/shared/protocol` — red first, then green.
- [ ] **Verified (T-001):** —
- **Notes:** —

### T-002 — The attachment follows the prompt

- **Covers:** AC-003, AC-004
- **Do:** `attachment.ts`: `STEP_ATTACHES` → the files per case (spec · plan · both · none), `attachmentOf()` returns a
  list; Claude Code whitespace rule per path; `createAttachmentCheck()` accepts plan keys. `assistants.ts` `callsFor()`
  with a list (`attachFiles` in order; one ` @path` each). Current chat attaches nothing (PD-094). `sendMainName()` names
  every attached file. Tests `core/assistant/attach0033.test.ts` "0033 AC-003 …" (start, continue, `Then:` line),
  "AC-004 …" (both assistants, whitespace per path, current chat, one missing file A-003).
- **Verify:** `npx vitest run src/core/assistant src/shared src/webview/ui/SendButton.test.tsx` — red first, then green.
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Prompt column, path breaks, indent, Up next glyph

- **Covers:** AC-005, AC-006, AC-007, AC-008
- **Do:** `main.css`: `.next-step-lines li` as column, `align-items: flex-start`; prompt `max-width: 100%`, drop the
  100 % rule; `.section-body .next-step-lines { padding-left: 0 }`; Up next glyph on the title line. Prompt rendering: a
  `<wbr>` after each `/` in the display only. Tests `webview/layout0033.test.tsx` "0033 AC-006 …" (`<wbr>` after `/`,
  copied and sent text unchanged), "AC-008 …"; `webviewCss.test.ts` "0033 AC-005 …", "AC-007 …" (A-004).
- **Verify:** `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` — red first, then green.
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — Notes, PDs, docs and final gates

- **Covers:** re-proves AC-001…AC-008 (spec §12's Done)
- **Do:** spec §5's notes in 0021, 0027, 0028, 0031, 0032; PD-096 and PD-097 in `docs/product/product-decisions.md`;
  `README.md`, `CHANGELOG.md`; title audit (every test title at the Baseline exists at the head); `activeContext.md`.
  All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Preview of 17 §5 *Prüfen*

- **Covers:** AC-001…AC-008 (visual and send checks)
- **Do:** the orchestrator's harness at the T-004 head: the states Ready, Active without a tick and Active with a tick;
  Dark, Light and High Contrast at 1000 px and 1600 px; Send with the stub, whose log shows the attachments: start →
  spec and plan; implement → plan only; current chat → none. AC-007's `getBoundingClientRect` edges (± 1 px) in the
  sidebar. Screenshots and the stub log in `Notes:`.
- **Verify:** manual: the orchestrator looks at the lines, prompt width, Send under the prompt, breaks after `/`, the
  aligned edges, the Up next glyph and the stub log; jsdom has no layout engine and the stub runs outside the tests.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Release checklist evidence

- **Covers:** spec §12 (evidence of 17 §5 *Prüfen*)
- **Do:** `docs/release-checklist.md` section "0033": T-005's evidence, the fresh `/sdd-compile` verdict, `npm test` on
  Windows, the VSIX rebuild for Gregor's check (Ready → Set active → T-001).
- **Verify:** `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [ ] **Verified (T-006):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-005 | — | — | open |
| AC-002 | T-001, T-005 | — | — | open |
| AC-003 | T-002, T-005 | — | — | open |
| AC-004 | T-002, T-005 | — | — | open |
| AC-005 | T-003, T-005 | — | — | open |
| AC-006 | T-003, T-005 | — | — | open |
| AC-007 | T-003, T-005 | — | — | open |
| AC-008 | T-003, T-005 | — | — | open |

## Session handoff

- **Done so far:** —
- **Next action:** `/sdd-lifecycle` (backlog → active), then T-001
- **Open decisions:** —
- **Baseline:** _(set when work starts)_
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
