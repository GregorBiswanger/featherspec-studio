# Plan — Release Polish

**Spec:** [0032-release-polish.md](0032-release-polish.md)
**Status:** In Progress
**Last updated:** 2026-11-20
**Current step:** T-005

## Approach

Texts first (T-001): one module, `nextStepTexts.ts`, plus the NS-6-report line in `nextStep.ts`, so the literal tests move
once. T-002 adds the two view-level rules in the core (partial-return intent, current-chat attachment and update
sentence), T-003 the webview and stylesheet (onboarding, Send row). Then docs and the full gate run (T-004), the
orchestrator's preview of 16 §3 (T-005), and its evidence in the release checklist (T-006). No new pattern: Memory Bank
touched in T-004 only (`activeContext.md`); no `architecture:` entry changes.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-004) · pre-done `npm test` on
Windows and CI, run by the orchestrator. Cadence (Gregor): per step only that step's tests; the full chain once, in T-004.

## Research

**Checkpoint digest (2026-11-20, Mode A; answered from 16, Gregor not asked).**
- Survey at `3b27e61`: `SESSION_PHRASES.sameOrNew` carries the comma; `STEP_GUIDES['NS-10']` and `['NS-6-plan']` have
  session `any`; NS-6-report reuses `continueLine` (NS-6-open's line 1) as line 2, so line 2 needs its own intent.
- `stepTips()` builds `coach` from session and model and already receives `context.version`; `levelsOnImplement()` and
  `LEVELLING_SINCE = '1.11.0'` in `core/specs/version.ts` give the version test for the update sentence.
- `integrateIsQuiet()` (`core/planMap/returnedWork.ts`) decides the grey Integrate; the out list already builds U-08's
  `… not back yet` in `planMapTexts.ts`.
- `assistants.ts` adds `attachFiles` to Copilot's `open` for both targets; `sendMainName()` appends `Attaches <file>`.
- `.empty-state .icon` (`main.css` ~238) sizes every glyph in an empty state, the Send arrow included; `Welcome.tsx`
  renders no coach, `WelcomeView` has only `send`; `.next-step-lines li` wraps by length.
- No `done/` spec becomes a `Deprecated` candidate; 0025, 0026, 0028–0031 get §5 notes only.
- [Support attachFiles in workbench.action.chat.open](https://forum.cursor.com/t/support-attachfiles-in-workbench-action-chat-open/156275)
  — `attachFiles` is an optional option of the command, so leaving it out is VS Code's plain open. Retrieved 2026-11-20.
- [Claude Code best practices](https://code.claude.com/docs/en/best-practices) — clear context between tasks; backs
  PD-093's new chat for plan writing (cited by 15). Retrieved 2026-11-20 by 15.

## Stages

1. T-001 → T-002 → T-003 — texts, core rules, webview
2. T-004 — notes, PDs, docs and final gates
3. T-005 → T-006 — preview (orchestrator) and its evidence in the checklist

No parallel stage: T-001…T-003 share `nextStepTexts.ts` and the detail protocol; T-006 records T-005's result.

## Steps

### T-001 — Tip and line texts

- **Covers:** AC-002, AC-003, AC-004
- **Do:** `nextStepTexts.ts`: `sameOrNew` without comma; NS-10 and NS-6-plan session `new`; `NS6_REPORT_INTENT` and
  `NS9_INTENT` as spec §6.4; a `thenContinueIntent()` for NS-6-report's line 2 (`nextStep.ts`). Move the literal tests;
  new `core/board/polish0032.test.ts` "0032 AC-002 …", "AC-003 …" (NS-10, NS-6-plan, NS-9 follow-up; Mode B unchanged),
  "AC-004 …" (incl. untitled).
- **Verify:** `npx vitest run src/core/board src/shared/protocol` — red first, then green.
- [x] **Verified (T-001):** `npx vitest run src/core/board src/shared/protocol` red first (37 failing after the text change), then green 698 passed; new `core/board/polish0032.test.ts` 6 tests. 2026-11-20
- **Notes:** Baseline snapshots stay frozen; `readBaseline` got a 0032 translation (`translated0032`) beside 0026's and 0030's. Literal tests of `Not sure where…`, `then plan it`, `one,`, `Use any chat` (NS-10, NS-6-plan only) moved.

### T-002 — Partial-return intent and current-chat attachment

- **Covers:** AC-005, AC-008
- **Do:** `detail.ts` (and the map header's view): while `integrateIsQuiet()`, the intent per spec §6.5 from the out
  list. `assistants.ts`: Copilot `current` without `attachFiles`; the current-chat item's and main part's name without
  `Attaches` (A-005); `stepTips()` adds the update sentence below 1.11.0 or `unknown` where Send attaches (A-004). Tests
  "0032 AC-005 …" (one, two, three out; blocked; all back), "0032 AC-008 …" (calls per target, names, 1.10.0, 1.11.0,
  `unknown`).
- **Verify:** `npx vitest run src/core/board src/core/planMap src/core/assistant` — red first, then green.
- [x] **Verified (T-002):** `npx vitest run src/core/board src/core/planMap src/core/assistant src/core/overview` red first, then green 961 passed; `npx tsc --noEmit` clean. 2026-11-20
- **Notes:** Update sentence stands in paragraph 1 between effect and then-sentence (keeps the `Send it once …$` literal). A BLOCKED member makes the next step NS-4, so no waiting sentence (A-002 holds: counted as back). `attachesInTarget()` in `shared/protocol/assistant.ts` serves core and webview.

### T-003 — Onboarding and Send row

- **Covers:** AC-001, AC-006, AC-007
- **Do:** `EmptyState.tsx`: own class on the feather glyph, `main.css` sizes only that; `WelcomeView` gets the coach
  while tips show, `Welcome.tsx` renders `Tip: Use a new chat with a strong model.` under the action; body `max-width:
  65ch`, centred. `main.css`: the split button of every `.next-step-lines` item on its own row. Tests
  `webview/polish0032.test.tsx` "0032 AC-001 …" (arrow 14 × 14 in the empty state), "AC-007 …" (Tip, tips off);
  `webviewCss.test.ts` "0032 AC-001 …", "AC-006 …", "AC-007 …".
- **Verify:** `npx vitest run src/webview src/core/overview src/adapters/node/webviewCss.test.ts` — red first, then green.
- [x] **Verified (T-003):** `npx vitest run src/webview src/core/overview src/adapters/node/webviewCss.test.ts src/shared` red first, then green 1188 passed; both `tsc` clean. 2026-11-20
- **Notes:** `Glyph` got an optional `className`; the Send row is `li > code:has(+ .send-split)` taking a full row (Copy prompt without an offer keeps its place). `WelcomeView.coach` is derived from `stepTips('NS-9')`, so Model Hints apply as everywhere.

### T-004 — Notes, PDs, docs and final gates

- **Covers:** re-proves AC-001…AC-008 (spec §12's Done)
- **Do:** spec §5's notes; PD-093…PD-095 in `docs/product/product-decisions.md`; `README.md`, `CHANGELOG.md`; title audit
  (every test title at the Baseline exists at the head); `activeContext.md`. All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [x] **Verified (T-004):** `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts` 196 passed; full chain once at the end: eslint 0 warnings, both `tsc` clean, `npm run test:unit` 3862 passed + 35 timing, `compile`, `compile-tests` clean. 2026-11-20
- **Notes:** §5 notes in 0021, 0024, 0025, 0026, 0027 (status untouched), 0028–0031; PD-093…PD-095; README, CHANGELOG, `activeContext.md`. One test title moved with its statement: 0027 AC-004 "Send to the current chat records only the open call, without the attachment (0032 §6.8)". Literal tests in `specTree`, `visibleLiterals`, `surfaces0028.bundle` moved late (found by the end chain).

### T-005 — Preview of 16 §3

- **Covers:** AC-001, AC-005, AC-006, AC-007, AC-008 (visual and send checks)
- **Do:** the orchestrator's harness at the T-004 head: onboarding (x01), clarify detail (x04), Plan map with two lines
  (x07), partial return (x09); Dark, Light and High Contrast at 1000 px and 1600 px; send with the Copilot stub to a new
  chat (attachment) and the current chat (no attachment). Screenshots and the stub log in `Notes:`.
- **Verify:** manual: the orchestrator looks for a 14 px arrow, the Tips, Send on its own row, the waiting sentence, no
  cut text and the two call logs; jsdom has no layout engine and the stub runs outside the tests.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Release checklist evidence

- **Covers:** spec §12 (evidence of 16 §3)
- **Do:** `docs/release-checklist.md` section "Release polish (0032)": T-005's evidence, the fresh `/sdd-compile`
  verdict, `npm test` on Windows, the VSIX rebuild for Gregor.
- **Verify:** `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [ ] **Verified (T-006):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-003, T-005 | `webview/ui/EmptyState.tsx`, `webview/board/icons.tsx`, `webview/main.css` | `webview/polish0032.test.tsx` "0032 AC-001"; `webviewCss.test.ts` "0032 AC-001" | built; preview open |
| AC-002 | T-001 | `shared/protocol/nextStepTexts.ts` | `core/board/polish0032.test.ts` "0032 AC-002" | built |
| AC-003 | T-001 | `shared/protocol/nextStepTexts.ts` (`STEP_GUIDES`) | `core/board/polish0032.test.ts` "0032 AC-003" | built |
| AC-004 | T-001 | `shared/protocol/nextStepTexts.ts`, `core/board/nextStep.ts` | `core/board/polish0032.test.ts` "0032 AC-004" | built |
| AC-005 | T-002, T-005 | `core/planMap/returnedWork.ts`, `core/board/detail.ts`, `nextStepTexts.ts` | `core/planMap/polish0032.test.ts` "0032 AC-005" | built; preview open |
| AC-006 | T-003, T-005 | `webview/main.css` | `webviewCss.test.ts` "0032 AC-006" | built; preview open |
| AC-007 | T-003, T-005 | `core/assistant/welcome.ts`, `shared/protocol/overview.ts`, `webview/ui/Welcome.tsx`, `main.css` | `webview/polish0032.test.tsx` "0032 AC-007"; `core/assistant/welcome0032.test.ts`; `webviewCss.test.ts` "0032 AC-007" | built; preview open |
| AC-008 | T-002, T-005 | `shared/protocol/assistant.ts` (`attachesInTarget`), `core/assistant/send.ts`, `webview/ui/SendButton.tsx`, `core/board/stepTips.ts` | `core/assistant/sendAttach.test.ts` "0032 AC-008"; `core/board/polish0032.test.ts` "0032 AC-008"; `webview/ui/SendButton.test.tsx` "0032 AC-008" | built; preview open |

## Session handoff

- **Done so far:** T-001…T-004 built and committed (T-004 once the final chain is green); T-005 preview and T-006 evidence belong to the orchestrator.
- **Next action:** T-005 (orchestrator preview of 16 §3), then T-006; the orchestrator closes the spec
- **Open decisions:** spec OP-001 (NS-9's then-sentence, proxy unchanged)
- **Baseline:** `d4b9656` (docs(0032): spec and plan)
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
