# Plan — Start via lifecycle, plan attachment, prompt layout

**Spec:** [0033-start-via-lifecycle-plan-attachment-prompt-layout.md](0033-start-via-lifecycle-plan-attachment-prompt-layout.md)
**Status:** In Progress
**Last updated:** 2026-11-20
**Current step:** T-005

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
- [x] **Verified (T-001):** 2026-11-20 · `npx vitest run src/core/board/start0033.test.ts` 7 passed (the stub was skipped: impl and test written together, so no red run); with the literal tests of §5 moved, `src/core src/shared` green
- **Process deviation:** no red run was recorded for T-001, T-002 or T-003 (AGENTS.md TDD rule: red via a `Not implemented` stub); the compile review's mutation spot-checks show the new tests can fail.
- **Notes:** Active without a tick serves NS-7 (one line, no `Or:` line), after NS-6-report's guards; a Ready spec with a tick keeps NS-7 (A-002). Short intent `Start`, command short form `Set active` (`shortForm()`), joined `Start · Set active`. Tests moved by §5: fixtures that expected `Continue with`/`Or:` or `Implement` for an untouched plan got a ticked first step (stepLinks, surfaces0028, statusEntry, planMap ready model, followUp0031, cards, polish0032); `NS-7-start` rows added to the literal tables; baseline exceptions `NS7` extended to tips and `NS7_ACTIVE` added for `repo-f9cadb4` 0028. Proxy: the planMap offers no ways for the start step (it would Implement in `backlog/`).

### T-002 — The attachment follows the prompt

- **Covers:** AC-003, AC-004
- **Do:** `attachment.ts`: `STEP_ATTACHES` → the files per case (spec · plan · both · none), `attachmentOf()` returns a
  list; Claude Code whitespace rule per path; `createAttachmentCheck()` accepts plan keys. `assistants.ts` `callsFor()`
  with a list (`attachFiles` in order; one ` @path` each). Current chat attaches nothing (PD-094). `sendMainName()` names
  every attached file. Tests `core/assistant/attach0033.test.ts` "0033 AC-003 …" (start, continue, `Then:` line),
  "AC-004 …" (both assistants, whitespace per path, current chat, one missing file A-003).
- **Verify:** `npx vitest run src/core/assistant src/shared src/webview/ui/SendButton.test.tsx` — red first, then green.
- [x] **Verified (T-002):** 2026-11-20 · `npx vitest run src/core/assistant/attach0033.test.ts` 10 passed; host adapter level: Copilot `attachFiles: [spec, plan]` / `[plan]`, Claude Code `… @spec @plan` / `… @plan`, whitespace per path, current chat none, A-003 one missing file; `src/core/assistant` green
- **Notes:** Protocol: `SendView.attach` is the first file, new optional `attachAlso` the others; `SendRequest.attach` + `attachAlso: string[]`; `STEP_FILES` per case (`STEP_ATTACHES` derived); `callsFor` accepts one attachment or a list; `AttachmentContext.plan`; the check accepts plan keys (0027 AC-010's plan-key row removed from the refused list, §5). `sendMainName` unchanged, the webview joins names with ` and `. Without the plan key (no plan) an Implement case attaches nothing.

### T-003 — Prompt column, path breaks, indent, Up next glyph

- **Covers:** AC-005, AC-006, AC-007, AC-008
- **Do:** `main.css`: `.next-step-lines li` as column, `align-items: flex-start`; prompt `max-width: 100%`, drop the
  100 % rule; `.section-body .next-step-lines { padding-left: 0 }`; Up next glyph on the title line. Prompt rendering: a
  `<wbr>` after each `/` in the display only. Tests `webview/layout0033.test.tsx` "0033 AC-006 …" (`<wbr>` after `/`,
  copied and sent text unchanged), "AC-008 …"; `webviewCss.test.ts` "0033 AC-005 …", "AC-007 …" (A-004).
- **Verify:** `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` — red first, then green.
- [x] **Verified (T-003):** 2026-11-20 · `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` 933 passed; AC-007's edge test is the stylesheet assertion (A-004), the orchestrator's T-005 measures `getBoundingClientRect`
- **Notes:** `<wbr>` after `/` only through `PathText after="slash"` in the Next step prompt; superseded in the compile fix: `PathText` breaks after `/` only everywhere and wraps each segment between slashes in a nowrap-able `.path-seg` (a segment wider than its column overflow-wraps as the last resort); no scope proxy remains, 0022 AC-015 carries an amendment note. Overview narrow layouts: areas `state number title … problem` / `step … copy` (two lines in both, was two and three); 0018 AC-028's test moved accordingly (not listed in §5). `.next-step-intent` keeps `flex: 1 0 100%` (0021 pins it).

### T-004 — Notes, PDs, docs and final gates

- **Covers:** re-proves AC-001…AC-008 (spec §12's Done)
- **Do:** spec §5's notes in 0021, 0027, 0028, 0031, 0032; PD-096 and PD-097 in `docs/product/product-decisions.md`;
  `README.md`, `CHANGELOG.md`; title audit (every test title at the Baseline exists at the head); `activeContext.md`.
  All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [x] **Verified (T-004):** 2026-11-20 · `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile` all green (3900 passed + 4 skipped, timing 35 passed); `docsScan` and `problems` green
- **Notes:** §5 notes added in 0028 (two places), 0021, 0031, 0032; 0027 (§6.1 and AC-010) and 0022 (AC-015, AC-028) in the compile fix, PD-091 "Refined by PD-097". PD-096 and PD-097 in `product-decisions.md`; README, CHANGELOG, `activeContext.md`. The title audit by hand: 24 baseline (`995305c`) test titles are absent at the head, all by §5: 22 × `0027 AC-001 {copilot,claudeCode} NS-*: the spec name and path` retitled `…: the file names and paths of 0033 §6.3` (`attachment.test.ts`); 1 × `0027 AC-010 …` the plan-key row removed from the refused list in `sendAttach.test.ts` (plan keys are accepted by PD-097; §5 row added); 1 × `0022 … AC-028: in the two- and three-line layouts number and title share their first line…` retitled `…in the two-line layouts the status glyph, number and title share their first line (0033 AC-008)…` (`webviewCss.test.ts`; §5 row added). Finding from the orchestrator's preview, kept (`f253885`): the generic `.copy-button:hover` painted secondary buttons primary blue, giving light-theme contrast of about 2:1; `.copy-button.copy-secondary:hover` keeps the grey hover. The start step's `(?)` carries doc 17's wording only (`then` is optional in `StepGuide`). `compile-tests` and `npm test` (host) not run, per cadence v2; the orchestrator runs them on Windows.

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
| AC-001 | T-001, T-005 | `nextStep.ts`, `nextStepTexts.ts` | `core/board/start0033.test.ts` | built; preview open |
| AC-002 | T-001, T-005 | `nextStep.ts`, `nextStepTexts.ts` | `core/board/start0033.test.ts` | built; preview open |
| AC-003 | T-002, T-005 | `attachment.ts`, `assistants.ts`, `send.ts` | `core/assistant/attach0033.test.ts` | built; preview open |
| AC-004 | T-002, T-005 | `attachment.ts`, `assistants.ts`, `send.ts`, `SendButton.tsx` | `core/assistant/attach0033.test.ts`, `webview/layout0033.test.tsx` | built; preview open |
| AC-005 | T-003, T-005 | `main.css` | `adapters/node/webviewCss.test.ts` | built; preview open |
| AC-006 | T-003, T-005 | `PathText.tsx`, `main.css` | `webview/layout0033.test.tsx`, `webview/ui/PathText.test.tsx` | built; preview open |
| AC-007 | T-003, T-005 | `main.css` | `adapters/node/webviewCss.test.ts` (stylesheet, A-004) | built; preview open |
| AC-008 | T-003, T-005 | `main.css` | `adapters/node/webviewCss.test.ts` | built; preview open |

## Session handoff

- **Done so far:** T-001…T-004 (pair moved to `active/`, status In Progress; commits on `release-polish`).
- **Next action:** T-005 (orchestrator's preview of 17 §5 *Prüfen*), then T-006 (evidence in `docs/release-checklist.md` section "0033", fresh `/sdd-compile`, `npm test` on Windows, VSIX).
- **Open decisions:** the 0027 §5 note is missing (told not to touch 0027); PD-096/PD-097 are in the register.
- **Baseline:** `995305c` (spec and plan in `backlog/`).
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
