# Plan — Clarified Next Step, Quiet Attachment, Tip Sentence

**Spec:** [0030-clarified-step-quiet-attach-tip.md](0030-clarified-step-quiet-attach-tip.md)
**Status:** Not started
**Last updated:** 2026-11-20
**Current step:** T-001

## Approach

The clarified step is one pure rule over the model plus a hand-over memory: `clarifiedOf(model, key)` decides, and
`nextStep()`'s Backlog branch asks it, so every surface follows without a change of its own (T-001, the riskiest: it
touches the one source of the next step). The memory then gets its writers (Send, Copy prompt, *Copy next step*) and its
store, a `UiMemoryPort` on `context.workspaceState` keyed by project root (OP-001 decided: like `activeProject` and the UI
memories; the runtime store's files are 0004's spec-status history with format version and pruning, not a key-value
store), and the model source carries it so a file change re-renders (T-002). T-003 removes the attachment line, T-004
rewrites the coach line; both are text and render changes only. Memory Bank touched in T-006 only: `activeContext.md`;
`systemPatterns.md` gets no entry (no new pattern).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-002: wiring in `extension.ts`;
T-006) · pre-done `npm test` on Windows and CI, run by the orchestrator. Cadence (Gregor): per step only that step's
tests; the full chain once, in T-006.

## Research

**Checkpoint digest (2026-11-20, Mode A; answered from the standing answer `orch/SPEC-0030.md`, Gregor not asked).**
- Survey at `73b11e2`: `nextStep()` (`core/board/nextStep.ts`) is the one source of the next step; Backlog without plan →
  NS-9 (`NS9_INTENT`, `NS9_THEN_INTENT`), with plan → NS-10 (`WRITE_PLAN_INTENT`, case NS-10, `STEP_ATTACHES['NS-10']`
  true). Spec keys are paths; `SpecEntry.modifiedMs` and `.size` come from discovery's stat.
- `ShellModel` is `{ project, lifecycle }`; adding an optional `handOvers` field keeps every test builder as it is.
  `UiMemoryPort` (`get`/`set` of `unknown`) and `createUiMemory(context.workspaceState, key)` exist (shell, side panel,
  board memories).
- Hand-overs: `createSend()` (`core/assistant/send.ts`, outcomes `opened`, `copied`, `copyFailed`), `copyText` in
  `core/board/boardRequests.ts` via `copyLine.ts`, and `core/copyNextStep/`.
- Coach: built only in `stepTips()` from `SESSION_WORDS` and `MODEL_WORDS`; asserted in about 15 test files
  (`coach0026.test.tsx`, `Sections.test.tsx`, `SpecDetail.test.tsx`, `stepTips.test.ts`, `detail.test.ts`, …).
- Attachment line: `AttachmentLine.tsx` from `StepAction.tsx`; `aria-describedby` in `SendButton.tsx` on the main part
  and the `menuitemradio` items; `README.md` contains `attached when sent` (0027 AC-015, `docsScan.test.ts`).
- `nextStepBaseline.test.ts` snapshots every fixture's `nextStep()`; with no memory it decides AC-003 and AC-010's
  `nextStep()` half unchanged. Last product decision PD-091, so PD-092 is free.
- No `done/` spec becomes a `Deprecated` candidate: 0026 (done) gets a §5 note; 0017, 0021, 0027 are active.
- [Understanding SC 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name) — the visible label
  must be part of the accessible name; settles that the menu items keep their names (spec §6.3). Retrieved 2026-11-20.
- `Tip:` over `Info:`: Gregor states VS Code's own chat uses "Tip:"; a web search on 2026-11-20 found no page that settles
  it, so PD-092 rests on his statement and stays flippable (spec OP-002).

## Stages

1. T-001 → T-002 — the clarified step and its hand-over memory, live
2. T-003 → T-004 — quiet attachment; the Tip sentence
3. T-005 → T-006 — preview evidence; §5 notes, docs, PD-092 and final gates

No parallel stage: T-003 and T-004 both change the detail and Now-row render tests (`SpecDetail.test.tsx`,
`Sections.test.tsx`); T-002 builds on T-001's model field.

## Steps

### T-001 — The clarified rule in nextStep

- **Covers:** AC-002 (`nextStep()`), AC-003, AC-004
- **Do:** optional `handOvers?: Readonly<Record<string, { modifiedMs?: number; size?: number }>>` on `ShellModel`
  (`core/ports/shell.ts`); pure `clarifiedOf(model, key)` in `core/board/clarified.ts` (§6.2: entry present, time or size
  differs); `nextStep()`'s Backlog branch returns rule NS-9, case NS-10, one line `WRITE_PLAN_INTENT` · `/sdd-plan <key>`
  when it holds. Tests `core/board/clarified0030.test.ts`: "0030 AC-002 …" (time differs, size differs), "0030 AC-003 …"
  (no entry, equal entry: deep-equal to NS-9), "0030 AC-004 …" (other key, plan present, R-2 fails, malformed entry).
- **Verify:** `npx vitest run src/core/board/` — red first (no `clarifiedOf`), then green, `nextStepBaseline.test.ts` included.
- [ ] **Verified (T-001):** —
- **Notes:** —

### T-002 — Hand-over memory, writers and live switch

- **Covers:** AC-001, AC-002 (surfaces), AC-005
- **Do:** `core/assistant/handOver.ts`: `createHandOverMemory(memory: UiMemoryPort, source)` — `begin(line)` snapshots
  `modifiedMs`/`size` when the line is `/sdd-clarify <key>`, `commit()` on outcome `opened`/`copied`, per project root,
  drops keys that name no spec, reads malformed values as empty; the model source wrapper puts `handOvers` on the model and
  fires `onDidChange` after a write. Hooks: `createSend()` (start and outcome), `copyText` in `boardRequests.ts`,
  `copyNextStep`. `extension.ts`: `createUiMemory(context.workspaceState, HAND_OVER_MEMORY_KEY)`. Tests
  `handOver0030.test.ts` "0030 AC-001 …" (opened, copied, copyFailed, file changed before Send settles, reload, pruning);
  `clarifiedSurfaces0030.test.ts` "0030 AC-002 …" (detail, Now row, Board card, tree, *Copy next step*: no `/sdd-clarify`);
  `clarified0030.timing.test.ts` "0030 AC-005 …" (`BUDGET_MS.uiFreshness`, selection kept).
- **Verify:** `npx vitest run src/core/assistant/handOver0030.test.ts src/core/shell/clarifiedSurfaces0030.test.ts` and
  `npx vitest run --project timing-node src/core/shell/clarified0030.timing.test.ts` — red first, then green; gate 5.
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — Quiet attachment

- **Covers:** AC-006, AC-007
- **Do:** `StepAction.tsx` renders no `AttachmentLine`; remove `AttachmentLine.tsx` and `ATTACHED_WHEN_SENT`;
  `sendMainName()` gets the attachment's file name (§7: `… <line>. Attaches <file name>.`), name and `title` of the main
  part; the menu items drop `aria-describedby`; `main.css` loses `.send-attach*`. Existing tests that assert the line
  (`attach0027.test.tsx`, `AttachmentLine.test.tsx`, `SpecDetail.test.tsx`) keep their titles and assert its absence and
  the new name (spec AC-014). New `quiet0030.test.tsx` "0030 AC-006 …", "0030 AC-007 …" (with and without attachment; the
  send request's `attach` unchanged).
- **Verify:** `npx vitest run src/webview src/core/assistant` — red first (the line still renders), then green.
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — The Tip sentence

- **Covers:** AC-008, AC-009
- **Do:** `nextStepTexts.ts`: `COACH_TIP_PREFIX = 'Tip:'`, `SESSION_PHRASES`, `MODEL_PHRASES` (§7), replacing
  `SESSION_WORDS`, `MODEL_WORDS` where only the coach used them; `stepTips()` builds `Tip: Use <session> with <model>.`
  with the hint after `model`. Existing coach assertions follow the new text, titles unchanged. Tests `stepTips.test.ts`
  "0030 AC-008 …" (3 sessions × 4 models × hint or none, §7's four examples literally); `visibleLiterals.test.ts`
  "0030 AC-009 …" (each §7 text once, one `Tip:` constant).
- **Verify:** `npx vitest run src/core/board src/webview src/adapters/node/visibleLiterals.test.ts` — red first, then green.
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Preview at two widths and three themes

- **Covers:** AC-012
- **Do:** the orchestrator's harness on a Backlog spec with Send and attachment offered: detail and first Now row before
  and after the clarify switch, Dark, Light, High Contrast at 1600 px and 1000 px, side panel open; screenshots in `Notes:`.
- **Verify:** manual: the orchestrator looks for an attachment line, cut text or buttons, words broken inside themselves,
  and the Tip sentence wrapping only between words; jsdom has no layout engine.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Notes, docs, PD-092 and final gates

- **Covers:** AC-010, AC-011, AC-013 (into the checklist), AC-014, and re-proves AC-001…AC-009
- **Do:** §5's notes under 0017 and 0021 (NS-9, §6.5, AC-001, AC-009), 0026 §6.2, 0027 (§6.3, AC-003, AC-015, §7);
  PD-092 in `docs/product/product-decisions.md`; `README.md` (Tip sentence, no attachment line), `CHANGELOG.md`
  (`Write the plan`, `Tip:`), `docs/release-checklist.md` section 0030 with AC-012, AC-013; `docsScan.test.ts`
  "0030 AC-011 …"; title audit (every title at the Baseline exists at the head); `activeContext.md`. All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [ ] **Verified (T-006):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | — | — | open |
| AC-002 | T-001, T-002 | — | — | open |
| AC-003 | T-001 | — | — | open |
| AC-004 | T-001 | — | — | open |
| AC-005 | T-002 | — | — | open |
| AC-006 | T-003 | — | — | open |
| AC-007 | T-003 | — | — | open |
| AC-008 | T-004 | — | — | open |
| AC-009 | T-004 | — | — | open |
| AC-010 | T-006 | — | — | open |
| AC-011 | T-006 | — | — | open |
| AC-012 | T-005 | — | manual: orchestrator, preview harness | open |
| AC-013 | T-006 (checklist) | — | manual: Gregor, Hands-On on `tip-splitter` | open |
| AC-014 | T-006 | — | — | open |

## Session handoff

- **Done so far:** — (spec written, clarified and planned 2026-11-20)
- **Next action:** T-001
- **Open decisions:** — (OP-001 decided here: workspace state; OP-002 PD-092 `Tip:`; both flippable by Gregor)
- **Baseline:** _(commit hash before the first step commit; set when work starts)_
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
