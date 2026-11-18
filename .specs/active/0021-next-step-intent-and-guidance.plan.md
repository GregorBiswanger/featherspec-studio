# Plan — Next Step with Intent and Guidance

**Spec:** [0021-next-step-intent-and-guidance.md](0021-next-step-intent-and-guidance.md)
**Status:** In Progress
**Last updated:** 2026-11-18
**Current step:** T-011 (fix stage after the compile of S74: `/home/claude/orch/compile/0021.md`)

## Approach

One table first: `nextStep()` gets an intent per line and a case key per step (rule, plus the NS-4 and NS-6 cases),
and a text-module table keyed by that case gives short intent, session, model class, effect and then-sentence; NS-6
becomes PD-072's variant A (T-001). Every surface reads that one source. Full form first, since dropping the old
`label` reaches every renderer of a line (detail, card and row tooltips, tree tooltip, status bar tooltip); then the
step short form (T-002). **Copy prompt** and the two settings are separate files and run `‖` (T-003 ‖ T-004). Guidance
last: the coach line composed in the core and attached only to the detail and the first Now row (T-005), live
settings through the dead-since-0015 `SettingPort` (T-006), the `(?)` toggletip in the webview (T-007, the riskiest:
focus, Escape against `DetailFrame`'s close and back, outside press, live updates). Docs, §5 notes and the test-title
audit end the plan (T-008). Building blocks stay reusable for 0023 (a new NS-6 case in the same table) and 0024 (the
settings source, the session key of a case, replaceable closing paragraphs, a generic toggletip). Test review once per
stage from the tests named in `Do:` (`AGENTS.md` *TDD*). No file this task did not create is deleted; every removed
test is named on its step's **Deletes:** line. Memory Bank touched in T-008 only: `techContext.md`,
`systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps
touching wiring, adapters, `extension.ts`, `package.json` or the bundle) · `npm run compile-tests` where a host test
changes · pre-done gate `npm test` on Windows and CI (cannot run here, PLAN-NOTE).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` Mode A under Gregor's delegation).** No question only Gregor can answer:
every open choice is decided by the spec, PD-068…PD-076 (newest wins) and `.claude/rules/ux-guidelines.md` 1–12,
recorded as proxies P-1…P-22. Spec revised in place (P-1). Gregor reads this plan and replies with changes or approval.

**Survey (code at `7cb4491`, 0022 built).**
- `core/board/nextStep.ts`: `nextStep()` → `{ rule, lines: [{ text, label? }] } | { rule, text }`; labels
  `NEXT_STEP_THEN_LABEL`, `…_THEN_AFTER_READY_LABEL`, `…_SAME_CHAT_LABEL` (`shared/protocol/nextStepTexts.ts`); NS-6 =
  `/sdd-plan` (+ `continue` while `openStep()` finds a step); NS-7 `Start <ID> of <plan>` / `Implement <plan>`;
  `shortForm()` maps every `Implement …` to `Implement`; `stepView()` → `StepView { short, line, lines }`. For an Active
  spec `entry.plan` is the sibling plan only (`planInUse`, `lifecycle/verification.ts`).
- Consumers of `lines`/`label`: `detail/NextStep.tsx` (label span, `CopyButton` primary/secondary per line), `ui/StepText.tsx`
  (`stepTooltip(lines)` as `title`, used by `board/Card.tsx`, `areas/overview/SpecRow.tsx`), `core/shell/specTree.ts`
  `tooltipOf` (`Next step: ` + code), `core/copyNextStep/entryView.ts` `tooltipOf` (escaped `label text`). `step.short`:
  card and row (`StepText`), tree description via `treeLabel()` (0022 budget; `command` swap prepared, unused),
  `treeRowAccessibleLabel`, status bar text `currentEntryText`, quick pick `description: <state> · <short>`.
- Guards: `isStepView` checks the exact key set and line keys `text`, `label`; `isNextStepView` (detail) does not;
  `OverviewRow` by `exactly()`; `PROTOCOL_VERSION` 4 (`envelope.ts`), literal `v: 4` in nine test files.
- Copy: `ui/CopyButton.tsx` label `NEXT_STEP_COPY_LABEL` (`'Copy'`), name `<label>: <line>`, 2000 ms, own live region,
  looks primary / secondary / icon (0022); quick-pick message action `NEXT_STEP_COPY_LABEL` (`copyNextStep.ts`).
- Now row: `Now.tsx` gives row 0 `copyLook="primary"`; 0022 built `.ov-row-item > .ov-coach { grid-column: 1 / -1 }`
  and its AC-001 CSS test. Detail: `NextStep` section with `.section-head` (`h3`) and `ul.next-step-lines`.
  `DetailFrame.onKeyDown` closes (side by side) or goes back (below 900 px, 0022 G-4) on Escape unless
  `defaultPrevented` — the one Escape handler in `src/webview`.
- Settings: none contributed (0015 AC-015 test in `manifest.test.ts`); `SettingPort { read(): unknown; onDidChange }`
  in `core/ports/host.ts` unused since `e6340a4` (0015 T-008). Board service and Overview service take a `history`
  source with `onDidChange` → recompute; both have timing tests.
- Word budget 0019 AC-010 (`webviewBundle.test.ts`, studio-0015, Review): **61 of 300 words** measured at `7cb4491`
  in a scratch copy (`/tmp/s71`); intents, coach line and `?` add about 20. Host smoke tree row
  `['0001 Restaurant-Rec…', '/sdd-compile']` stays: `Verify · /sdd-compile` leaves a title room of 6 < 12, so 0022's
  budget swaps to the command short form (room 15).
- AC-013 names (`Opus`, `Sonnet`, `Haiku`, `GPT-`, `Gemini`, `Llama`, `Mistral`): none in `src` or `package.json` today.
- No `done/` spec is invalidated (0006, 0007, 0013 get §5 notes only).

**Sources.**
- [VS Code contribution points — `contributes.configuration`](https://code.visualstudio.com/api/references/contribution-points)
  — an object setting whose properties are `string` renders as an editable grid when `additionalProperties` is `false`;
  `title` is the category heading; `description` (not Markdown) is the checkbox label of a boolean; no `scope` →
  `window`. Retrieved 2026-11-18.
- [Inclusive Components — Tooltips & Toggletips](https://inclusive-components.design/tooltips-toggletips/) — click
  reveals, content written into a `role="status"` live region, focus stays on the button, close on unfocus, outside
  click and Escape, no interactive content. Retrieved 2026-11-18. (TPGi's pattern: cited by spec §6.6.)
- Repo: `@types/vscode` 1.146.0 (`ConfigurationChangeEvent.affectsConfiguration(section, scope?)`,
  `node_modules/@types/vscode/index.d.ts`), React 19.3.1 (`useSyncExternalStore`, used in `shell.tsx`, `narrow.ts`),
  jsdom 31.0.1 (`PointerEvent`, used by `Divider.test.tsx`). Read 2026-11-18.

**Proxy decisions (Gregor delegated; P-n).**
- P-1 Spec revised (open points only): OP-002 and OP-003 resolved by PD-073 (drafts accepted, no review key), A-004
  confirmed; PD-074 recorded in the header, §8, A-001 and OP-001 (V-1 passed with Copilot); §13; Plan line.
- P-2 Variant A only (PD-072, confirmed by PD-074); B stays OP-001's fallback text, nothing of B is built.
- P-3 Table: `nextStepTexts.ts` holds every text of §6.1, §6.2, §6.5, §6.6 and §7 plus `STEP_GUIDES:
  Record<StepCase, StepGuide>`, `StepGuide = { short, session, model, effect, then }`; `StepCase` = `NS-2`, `NS-4`,
  `NS-4-plan`, `NS-5`, `NS-6-open`, `NS-6-resume`, `NS-6-plan`, `NS-7`, `NS-8`, `NS-9`, `NS-10` (0023 adds its
  returned-work case here); session keys `new` · `sameOrNew` · `any`, model keys `fast` · `strong` ·
  `strongOtherFamily` · `strongWebSearch`; words and reasons looked up by key. Intents with an ID are functions
  (`continueIntent(id, title)`, `startIntent(id?, title)`).
- P-4 `nextStep()` → `{ rule, case, lines: [{ text, intent }] } | { rule, text }`; `label` goes. Prompts of every rule
  but NS-6 unchanged (AC-002); NS-6: open step by `openStep()` → `Implement <ID> of <entry.plan>` + `/sdd-plan <key>`;
  `entry.plan === undefined` → `NS-6-plan`; otherwise (no open step, unreadable plan, §8) `NS-6-resume`.
- P-5 Title in an intent: `plainShort(step.title)` (`core/board/shortTitle.ts`, as 0019 §6.3's next open step); empty →
  `<ID>` alone, no trailing space (AC-019).
- P-6 Views: `StepView = { intent, short, line, lines: [{ text, intent }] }` (`intent` = short intent, `short` =
  command short form); detail `NextStepView` lines `{ text, intent }` (+ `tips?`, T-005); `OverviewRow.tips?`;
  `StepTipsView = { coach: string; about: string[] }` in `stepView.ts`; strict guards; `PROTOCOL_VERSION` 5 once, in
  T-001 (the line keys change there).
- P-7 Full form in the text module: `stepTooltip(lines)` = per line `intent\nprompt` (cards, rows, plain);
  tree: `Next step: <escaped intent>` ¶ code(prompt), then escaped intent ¶ code(prompt); status bar: escaped intent ¶
  escaped prompt per line (prompt as today). NS-1, NS-3, NS-11 unchanged.
- P-8 Short forms: `shortForm()` adds `Implement <ID> of …` → `Implement <ID>`; `stepShortForm(step)` =
  `<intent> · <short>` (text module) for tree description, tree accessible label (X-05) and quick pick
  (`<state> · <step short form>`); `StepText` renders `Next`, the intent as text, ` · `, the command in `code` (§10);
  tree: `treeLabel({ …, description: stepShortForm, command: step.short })`. Status bar text keeps `short` (A-006).
- P-9 Copy prompt: `COPY_PROMPT_LABEL = 'Copy prompt'` replaces `NEXT_STEP_COPY_LABEL` in `CopyButton` and the
  quick-pick message (one constant); `Copied`, `Could not copy`, 2000 ms, `min-width: 14ch` unchanged; 0014's setup
  buttons and the "Copy Next Step" command titles untouched (A-007).
- P-10 Settings: new core area `src/core/settings/` — `stepTipSettings.ts` (`parseStepTipSettings(show, hints)` per
  §6.7: non-boolean → `true`; non-object or array → no names; trim, collapse whitespace runs, over 40 code points → 39 +
  `…`; non-string or empty → none) and `settingsSource.ts` (generic: `SettingPort` per key + parse → `{ read(),
  onDidChange }`, reused by 0024's `assistant`); adapter `src/adapters/vscode/settings.ts` `createSettingPort(key)`
  (`getConfiguration('featherspec-studio').get(key)`, `onDidChangeConfiguration` filtered by
  `affectsConfiguration('featherspec-studio.<key>')`, no write). Manifest: no `scope`, no `restrictedConfigurations`
  entry (A-012), `description` not Markdown.
- P-11 Builders: `buildDetail` and `buildOverviewView` take an optional `tips: StepTipSettings`; absent = no tips (pure
  default keeps the 0015–0022 builder tests as they are); the services always pass `deps.tips.read()` and recompute on
  `deps.tips.onDidChange`. Only the detail's `nextStep` and `now[0]` get `tips`, only for a step with lines, only while
  `show` (AC-009, AC-010). A first Now row without a line gives no coach line anywhere in Now.
- P-12 Composition `core/board/stepTips.ts` `stepTips(case, settings, closing?)`: coach `<session words> · <model
  words>` with ` (<hint>)` after `strong model` / `fast model`; about = [effect + ' ' + then, session reason + ' ' +
  model reason, closing 1, closing 2]; the closing pair is a parameter so 0024 §6.8 replaces it.
- P-13 Placement: detail — `p.step-coach` inside the first line's `li`, after the Copy prompt and its status region, on
  a line of its own, description colour; `?` in `.section-head` after `h3`, its region after it as a full-width line.
  Now row — `div.ov-coach` after the Copy (0022's box and test unchanged): coach text, `?`, region; content at the
  inline end in the one- and two-line layouts (step and Copy end the row there), at the start in the three-line layout
  (step starts its line) — container rules beside 0022's; the look is the harness's (AC-022).
- P-14 Toggletip `ui/Toggletip.tsx` (generic: name, paragraphs): plain button text `?` (no codicon, A-008; round
  border, theme variables, visible focus outline), `aria-label` and `title` `About this step`, `aria-expanded`; region
  `div[role="status"]` directly after it, empty while closed, in the flow (pushes content down, covers nothing, stays
  in its panel); one `p` per paragraph, nothing focusable. One open at a time: module store + `useSyncExternalStore`.
  Closes on Escape on the button while open (`preventDefault`, so `DetailFrame` neither closes nor goes back), a second
  activation, `pointerdown` on the document outside button and region, blur to another element outside the region
  (blur to nothing — a press on the region's text — keeps it), unmount (tips off), and a change of its joined
  paragraphs (a hint change leaves them alone, §8).
- P-15 AC-002: one table test over the non-NS-6 fixtures of `nextStep.test.ts`'s AC-004 describe, rule and prompt
  literals as the Baseline file asserts them; the T-008 audit shows none dropped.
- P-16 Fixture sweep (AC-008, AC-013): `webviewBundle.test.ts` (real core over every FeatherSpec fixture in
  `test/fixtures`, the built bundle in jsdom): Board, Overview and every spec's detail; the empty states by their
  zero-spec views; with `modelHints` empty.
- P-17 Host smoke (CI only), `src/test/board.smoke.test.ts`: both settings contributed with their defaults; setting
  `showStepTips` to false in the test profile drops `tips` from `api.board().detail()` within 500 ms, then reset.
- P-18 Word budget: the 0019 AC-010 test passes default tips so it counts intents, coach line and `?` (61 + ~20 ≤ 300).
- P-19 Test-title audit in T-008 by 0018–0022's method: `describe`/`it`/`test`/`suite` literals of every `.ts`/`.tsx`
  under `src` (`src/test/**` and `testing/*.ts` included; group titles count), Baseline (`git archive`) vs head;
  expected map below.
- P-20 Docs: README (Specs view: `Verify · /sdd-compile`, inline **Copy Next Step**; Overview; Board; detail; "The next
  step everywhere" rewritten for intents, variant A and **Copy prompt**; Getting started 3; a `## Settings` section;
  known limitations line), CHANGELOG `## [0.1.0] - Unreleased`, checklist section `## Next step with intent and
  guidance (0021)` with AC-022–AC-025; old `**Copy**` and ``then `continue` `` lines reworded.
- P-21 §5 notes: catch-all at the head of 0006, 0007, 0013, 0015–0020, then one `*Amended by 0021 (PD-069): …*` under
  each statement of the table, before any 0022 note (0022 OP-003).
- P-22 Architecture: new source modules `src/core/settings/`, `src/adapters/vscode/settings.ts`,
  `src/core/board/stepTips.ts`, `src/webview/ui/Toggletip.tsx` → `/sdd-architecture-update` in T-008 with the entries
  named there.

**Expected test-title audit map (T-008 confirms it against the Baseline).** Absent at the head, each a replaced
statement of §5: `nextStep.test.ts` — "NS-6: an Active spec needs /sdd-plan" (→ 0021 AC-005 title), describe "0017
AC-002: NS-6 names "continue" only while the plan has an open step" with its three tests, "N8: … gets "continue" …"
(→ 0021 AC-003 describe; 0017 §6.2, AC-002), "AC-001: the lines carry the second line and its label …" (→ intents,
0021 AC-001), "AC-001: shortForm cuts … an implement at its verb …" (→ `Implement <ID>`, 0021 §6.3); `stepView.test.ts`
"… a labelled second line"; `statusEntry.test.ts` "a second line shows under its label, the label first" (→ 0021
AC-007); `SpecDetail.test.tsx` "AC-003: two lines carry the label of the second one; …" (→ 0021 AC-001);
`CopyButton.test.tsx` "… the tooltip `Copy: <line>` …" and "AC-018: 2 s after the activation the label is Copy again …"
(→ Copy prompt, 0016 AC-018 amended); `copyNextStep.test.ts` "… the message with "Copy" …"; `manifest.test.ts` both
"AC-015 (0015): … configuration …" (→ 0021 AC-016). Titles that name the control "Copy" otherwise stay (catch-all).

## Stages

1. T-001 → T-002 — every step says what it does: intents, NS-6 variant A, full form everywhere, step short form
2. T-003 ‖ T-004 — independent: **Copy prompt** on every copy control; the two settings contributed and read
3. T-005 → T-006 → T-007 — guidance: coach line, live settings, About this step
4. T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates
5. T-009 → T-010 → T-011 → T-012 → T-013 → T-014 → T-015 → T-016 — fix stage after the compile of 2026-11-18 (S74, NOT READY): D1, the five surviving mutants, D2 and the README, hint cut, `StepText`, stale fixtures, docs and evidence

Parallel: stage 2 (T-003 touches `nextStepTexts.ts`, `CopyButton.tsx`, `copyNextStep.ts`, `webviewBundle.test.ts` and
webview tests; T-004 `package.json`, `manifest.test.ts`, `src/core/settings/`; no shared file, each `Verify` runs its own
tests). Both are small: run them in sequence. Stages 1 and 3 share `nextStepTexts.ts`, `stepView.ts`, `NextStep.tsx`,
`SpecRow.tsx` or the services within the stage, so they stay `→`. Preview harness (guideline 12, orchestrator) at the
ends of stages 1 and 3.

## Steps

### T-001 — Each line says what it does; NS-6 is variant A

- **Covers:** AC-001 (intents, effect, then, detail DOM order), AC-002, AC-003 (lines), AC-005 (lines), AC-007, AC-019
- **Deletes:** `NEXT_STEP_THEN_LABEL`, `NEXT_STEP_THEN_AFTER_READY_LABEL`, `NEXT_STEP_SAME_CHAT_LABEL`, the `label` key
  of `NextStepLine`, `StepLineView`, `NextStepLineView`; `.next-step-label` in `main.css` (→ `.next-step-intent`);
  tests in `nextStep.test.ts`: "NS-6: an Active spec needs /sdd-plan", the describe "0017 AC-002: NS-6 names
  "continue" …" (3 tests), "N8: … "continue" …", "AC-001: the lines carry the second line and its label …"; retitled:
  `stepView.test.ts` "… a labelled second line", `statusEntry.test.ts` "a second line shows under its label, the label
  first", `SpecDetail.test.tsx` "AC-003: two lines carry the label of the second one; …" (replaced, audit map)
- **Do:** P-3, P-4, P-5, P-6 (line keys, version 5), P-7. `nextStepTexts.ts` table; `nextStep.ts` cases and NS-6;
  `stepView()` maps `{ text, intent }`; `NextStep.tsx` renders per line `span.next-step-intent` (own line), then the
  prompt in `code` and its Copy; `stepTooltip`, `specTree.ts` and `entryView.ts` tooltips; view helpers
  (`detail/testing/views.ts`, `board/testing/views.ts`, `protocol/testing/overviewSample.ts`) and `v: 5` literals.
  Tests, red via a `Not implemented` stub of the table lookup: `nextStep.test.ts` new describes "0021 AC-001" (one
  memory fixture per row of §6.1 and §6.2: case, intents, effect and then literally; AC-001's Given), "0021 AC-002"
  (P-15), "0021 AC-003" (T-003 "Reject money values" over `Implement T-003 of …plan.md`, then `/sdd-plan <spec>` under
  its intent; two Active specs in either order), "0021 AC-005" (no open step, all ticked or struck, unreadable plan →
  Resume; no sibling plan → Write the plan), "0021 AC-019" (no title, Markdown and link title, 81 characters; NS-7
  without step ID `Start implementing the plan`); `stepView.test.ts` (line keys); `SpecDetail.test.tsx` (each intent its
  own element directly before its `code` and Copy in DOM order; NS-5 and NS-6 two lines); `SpecBoard.test.tsx`,
  `Sections.test.tsx` (`title` = intent, prompt, in line order); `specTree.test.ts` (`Next step: <intent>` then code;
  a title with `*`, `[`, `` ` `` escaped); `statusEntry.test.ts` (paragraphs intent, prompt; escaped).
- **Verify:** `npx vitest run --project node src/core/board/nextStep.test.ts src/shared/protocol src/core/shell/specTree.test.ts src/core/copyNextStep/statusEntry.test.ts`
  and `npx vitest run --project webview src/webview/detail/SpecDetail.test.tsx src/webview/board/SpecBoard.test.tsx src/webview/areas/overview/Sections.test.tsx`
  red (stub, failing literals), then green; gates 1–4
- [x] **Verified (T-001):** 2026-11-18 · red: `npx vitest run --project node src/core/board/nextStep.test.ts` 20 failed of 50 (no `STEP_GUIDES`, no `case`/`intent` keys, NS-6 still `/sdd-plan`) → green after the change: same file 50 passed; `npx vitest run --project node --project webview` 152 files, 2478 passed, 3 skipped; eslint 0 warnings, both `tsc` clean, `npm run compile` clean.
- **Notes:** NS-9 line 1 reads the §6.1 row literally, `Have the spec challenged, then plan it` (the row's `;` splits line 1 from line 2). `NS-6-plan` is reachable only for an Active spec whose plan link is an archive link (reactivated spec): without any plan the entry is a lifecycle contradiction (NS-2). `buildDetail` maps the line to `{ text, intent }` so `case` never reaches the webview. The old `nextStep.test.ts` AC-004 fixtures stay and now match with `toMatchObject` (prompts unchanged, AC-002). `PROTOCOL_VERSION` 5; "another version" literals in `messages.test.ts`, `client.test.ts`, `PanelStateView.test.tsx` moved to 6. The `shortForm` test left with its describe and returns in T-002.

### T-002 — Cards, rows, tree and quick pick show the step short form

- **Covers:** AC-006; AC-001, AC-003, AC-005 (short forms)
- **Deletes:** test "AC-001: shortForm cuts a command at its name, a start at its id, an implement at its verb …"
  (retitled for `Implement <ID>`, audit map)
- **Do:** P-6 (`StepView.intent`), P-8. `nextStep.ts` `shortForm`, `stepView`; `stepView.ts` guard;
  `nextStepTexts.ts` `stepShortForm`; `ui/StepText.tsx`; `specTree.ts` (description, `command` to `treeLabel`,
  accessible label); `copyNextStep.ts` quick-pick description; view helpers. Tests: `nextStep.test.ts` (the short form
  of every case: `Verify · /sdd-compile`, `Continue · Implement T-003`, `Resume · /sdd-plan`, `Plan · /sdd-plan`,
  `Build · Start T-001`, `Build · Implement`; `Implement <ID> of <plan>` → `Implement <ID>`, `Implement <plan>` →
  `Implement`; equal snapshots equal views); `cards.test.ts`, `rows.test.ts` (step views); `specTree.test.ts` (description
  = step short form, or the command where the room falls below 12; 0022's budget sweep over the new forms; X-05 with
  the step short form); `copyNextStep.test.ts` (`Review · Verify · /sdd-compile`); `statusEntry.test.ts` (text keeps
  `/sdd-compile`, control); `SpecBoard.test.tsx`, `Sections.test.tsx` (`Next`, intent text, ` · `, command in `code`).
- **Verify:** `npx vitest run --project node src/core/board src/core/overview/rows.test.ts src/core/shell src/core/copyNextStep src/shared/protocol/stepView.test.ts`
  and `npx vitest run --project webview src/webview/board src/webview/areas/overview` red (stub), then green; gates 1–4
- [x] **Verified (T-002):** 2026-11-18 · red: `npx vitest run --project node src/core src/shared` 21 failed (no `stepShortForm`, no `intent` on the step view, `Implement <ID> of` still `Implement`, quick pick and accessible label on the old form) → green: `npx vitest run --project node --project webview` 2492 passed, 3 skipped; eslint 0 warnings, both `tsc` clean, `npm run compile` clean.
- **Notes:** X-05 accessible label of a tree row carries the step short form as written (`Review, Verify · /sdd-compile`), not rewritten to commas. The tree description takes the step short form through `treeLabel` with `command` set to the command short form; with a four-digit number every case leaves a room below 12, so the tree shows the command short form for every row of the fixtures and the intent stays in the tooltip (0022 §4.2, OP-004). New `treeLabel` test proves the keep branch with a one-digit number. The test `AC-001: shortForm cuts …` is retitled `shortForm cuts a command at its name, …` under 0021 AC-006 (audit map).

### T-003 — Every copy control is a Copy prompt

- **Covers:** AC-008
- **Files:** `src/shared/protocol/nextStepTexts.ts`, `src/webview/ui/CopyButton.tsx`, `src/core/copyNextStep/copyNextStep.ts`,
  `src/webview/ui/CopyButton.test.tsx`, `src/webview/detail/SpecDetail.test.tsx`, `src/webview/board/SpecBoard.test.tsx`,
  `src/webview/board/Keyboard.test.tsx`, `src/webview/areas/overview/Sections.test.tsx`, `src/webview/primaryButtons.test.tsx`,
  `src/webview/states.test.tsx`, `src/core/copyNextStep/copyNextStep.test.ts`, `src/core/copyNextStep/noWrite.test.ts`,
  `src/adapters/node/webviewBundle.test.ts`
- **Deletes:** `NEXT_STEP_COPY_LABEL` (→ `COPY_PROMPT_LABEL`); tests retitled: `CopyButton.test.tsx` "… the tooltip
  `Copy: <line>` …", "AC-018: 2 s after the activation the label is Copy again …"; `copyNextStep.test.ts` "… the message
  with "Copy" …" (audit map)
- **Do:** P-9. Tests: `CopyButton.test.tsx` (text `Copy prompt`, `Copied`, `Could not copy`; name `Copy prompt: <line>`,
  `Copied: <line>`, `Could not copy: <line>` at 0, during and after 2000 ms; icon tooltip = name outside feedback;
  clipboard gets the prompt only); surface tests' names; `copyNextStep.test.ts` (message action `Copy prompt`);
  `webviewBundle.test.ts` new "0021 AC-008" sweep (P-16: no button text `Copy`, no name starting `Copy: `, the empty
  states included) with a negative control.
- **Verify:** `npx vitest run --project webview src/webview` and `npx vitest run --project node src/core/copyNextStep src/adapters/node/webviewBundle.test.ts`
  red (failing literals), then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-18 · red: `npx vitest run --project webview src/webview` 23 failed (literals `Copy prompt`, `Copy prompt: <line>`, `COPY_PROMPT_LABEL` missing); sweep negative control: with the label set back to `Copy` 13 tests of the new bundle sweep fail → green: `npx vitest run --project node --project webview` 2507 passed, 3 skipped (incl. the 11-fixture sweep over Board, Overview and every detail, empty states included); eslint 0 warnings, both `tsc` clean, `npm run compile` clean.
- **Notes:** Run after T-002 (parallel stage in sequence). `NEXT_STEP_COPY_LABEL` became `COPY_PROMPT_LABEL` in the one text module; `CopyButton` and the quick-pick message use it. The sweep helper `renderFixture` in `webviewBundle.test.ts` is reused by T-005 (names, tips). The icon button's tooltip stays its name outside feedback (0022 test unchanged). 0014's setup buttons and the "Copy Next Step" command titles untouched (A-007).

### T-004 — The Studio contributes and reads two settings

- **Covers:** AC-016; AC-012 (parse rules, `showStepTips` not a boolean)
- **Files:** `package.json`, `src/adapters/vscode/manifest.test.ts`, `src/core/settings/stepTipSettings.ts`,
  `src/core/settings/stepTipSettings.test.ts`, `src/core/settings/settingsSource.ts`, `src/core/settings/settingsSource.test.ts`
- **Deletes:** tests "AC-015 (0015): declares no configuration property" and its negative control (replaced by 0021
  AC-016, audit map)
- **Do:** P-10 (core and manifest; the adapter lands with its use in T-006). `contributes.configuration` titled
  `FeatherSpec Studio` with the keys, types, defaults, `properties`, `additionalProperties: false` and the four
  descriptions of §6.7 literally. Tests: `manifest.test.ts` "0021 AC-016" (exact keys and values; negative control: a
  third key or a `markdownDescription` fails); `stepTipSettings.test.ts` (defaults; `'false'`, `0`, `null` → shown;
  `'  my   big one '` → `my big one`; 40 and 41 code points; an emoji at the cut; number, `''`, `'   '` → none; `[]`,
  `'x'`, `null` → no names; extra key ignored);
  `settingsSource.test.ts` (fake `SettingPort`s: read parses fresh, a change of either key notifies, dispose stops).
- **Verify:** `npx vitest run --project node src/adapters/vscode/manifest.test.ts src/core/settings` red (stub), then
  green; gates 1–5
- [x] **Verified (T-004):** 2026-11-18 · red: `npx vitest run --project node src/adapters/vscode/manifest.test.ts src/core/settings` 11 failed (stub `Not implemented`, no configuration in the manifest) → green: same files 39 passed; full `npx vitest run --project node --project webview` 2516 passed, 3 skipped; eslint 0 warnings, both `tsc` clean, `npm run compile` clean.
- **Notes:** Run after T-003. `settingsSource.ts` takes a list of ports and a `parse(values)` function (generic, reusable for 0024's `assistant`); `stepTipSettings.ts` exports the two key names the adapter in T-006 reads. Hint length counts code points. The manifest test's `Manifest` type now types `configuration` as `unknown` and the checks read it structurally. `npm run compile-tests` is run with the T-006 gate (no host test changed here).

### T-005 — The detail and the first Now row show the coach line

- **Covers:** AC-009, AC-010 (coach line), AC-012 (coach texts), AC-013; AC-001, AC-003, AC-005 (coach)
- **Do:** P-6 (`tips`), P-11, P-12, P-13 (coach part), P-18. `core/board/stepTips.ts`; `buildDetail`,
  `buildOverviewView`/`projectNow` input `tips?`; `detail.ts`, `overview.ts` guards; `NextStep.tsx` `p.step-coach`;
  `SpecRow.tsx`/`Now.tsx` `div.ov-coach` for a row with `tips`; `main.css`. Tests: `stepTips.test.ts` (coach of every
  case; hints of AC-012 literally, `strong model (X), other family`; about paragraphs of one case literally);
  `detail.test.ts` (core: tips only for a step with lines and `show`; NS-1, NS-3, NS-11 none); `rows.test.ts` (only
  `now[0]`; a first row without a line → none in Now); `overview.test.ts`, `detail.test.ts` (protocol guards);
  `SpecDetail.test.tsx` (coach directly after the first Copy prompt's status region; none with `show` false; intents,
  prompts and Copies equal to the true case); `Sections.test.tsx` (one `.ov-coach`, in the first row, after its Copy;
  cards and other rows none); `sourceScan.test.ts` "0021 AC-013" (case-insensitive names in `src` without tests and
  `package.json`, negative control); `webviewBundle.test.ts` (P-16 names in rendered text and titles; P-18 budget).
- **Verify:** `npx vitest run --project node src/core/board src/core/overview src/shared/protocol src/adapters/node/sourceScan.test.ts src/adapters/node/webviewBundle.test.ts`
  and `npx vitest run --project webview src/webview/detail src/webview/areas/overview` red (stub), then green; gates 1–4
- [x] **Verified (T-005):** 2026-11-18 · red: `npx vitest run --project node src/core/board/stepTips.test.ts` 28 failed (stub `Not implemented`); detail, rows, Sections and protocol-guard tests red on missing `tips` → green: `npx vitest run --project node --project webview` 2577 passed, 3 skipped (adds the bundle sweep over 11 fixtures: at most one coach line per Overview and detail, none on the Board, no model name in text or title, tips off and absent give none); eslint 0 warnings, both `tsc` clean, `npm run compile` clean.
- **Notes:** `stepTips(case, settings, closing?)` in `core/board/stepTips.ts` composes the coach line and the four paragraphs from tables in `nextStepTexts.ts` (`SESSION_WORDS`, `MODEL_WORDS`, reasons, `TIP_CLOSING`). `buildDetail` and `projectNow`/`buildOverviewView` take an optional `tips`; absent means none (the services pass it in T-006). Guards: `isStepTipsView` (exactly `coach`, `about`) in `stepView.ts`, used by `NextStepView` and `OverviewRow`. CSS: `.step-coach` (detail, in the first line's `li`) and `.ov-coach` (flex, content at the inline end; at the start below 420 px container width, P-13). 0022's AC-001 rule `.ov-row-item > .ov-coach` and its test are unchanged. The 0019 AC-010 word budget test now builds the detail with default tips (P-18); it counts the coach line, and the `?` joins in T-007.

### T-006 — A settings change shows within 500 ms, in every window

- **Covers:** AC-011, AC-017 (setting change), AC-018; AC-010 (live)
- **Do:** P-10 (adapter), P-11 (services), P-17. `adapters/vscode/settings.ts`; `boardService.ts`, `overviewService.ts`
  deps `tips`; `extension.ts` wiring (one settings source for both); test worlds get a fake source. Tests:
  `settings.test.ts` (mocked `vscode`, `vi.hoisted`: reads its key, fires only on its own key, never calls `update`);
  `boardService.test.ts`, `overviewService.test.ts` (a change re-emits detail and Overview with or without tips;
  selection and Activity's open state kept); `boardService.timing.test.ts`, `overviewService.timing.test.ts`
  (`BUDGET_MS.uiFreshness` from the fake port's event to the emitted view); `noWrite.test.ts` (0017 AC-023 extended: a
  settings change and an NS-6 Copy prompt write nothing); AC-018 in `stepTips.test.ts` (trusted vs Restricted shell
  world and a read-only store give equal detail and Overview tips); host smoke `src/test/board.smoke.test.ts` (P-17).
- **Verify:** `npx vitest run --project node src/adapters/vscode/settings.test.ts src/core/board src/core/overview src/core/copyNextStep/noWrite.test.ts`
  and `npx vitest run --project timing-node src/core/board/boardService.timing.test.ts src/core/overview/overviewService.timing.test.ts`
  red (stub), then green; gates 1–5; `npm run compile-tests`
- [x] **Verified (T-006):** 2026-11-18 · red: new service tests turned red by removing the two `deps.tips.onDidChange(schedule)` subscriptions (3 failed: board detail on/off, hint change, Overview) and restoring them; adapter tests red on the `Not implemented` stub (3 failed) → green: `npx vitest run --project node --project webview` 2588 passed, 3 skipped; `--project timing-node --project timing-webview` 15 passed (settings change within `BUDGET_MS.uiFreshness` on 200 specs, board and Overview); eslint 0 warnings, both `tsc` clean, `npm run compile` and `npm run compile-tests` clean. Host smoke (`src/test/board.smoke.test.ts`) runs on CI only.
- **Notes:** `tips` is a required dependency of both services (`SettingsSource<StepTipSettings>`); the test worlds take a `FakeTips` (default: tips off, so older service tests are unchanged) from `src/core/settings/testing/fakeTips.ts`. `extension.ts` builds one source from the two `createSettingPort` instances and gives it to both services. AC-018 is decided by a source scan (the tip modules name no trust, writer, Restricted Mode or reader: the services have no such input) plus equal tips for equal input. The host smoke test changes the setting with the Global target (test profile), never the workspace file, and resets it. `noWrite.test.ts` gets a second test beside the 0017 one (a settings change, a hint change and an NS-6 Copy prompt leave the tree unchanged).

### T-007 — About this step explains the tip and closes as a toggletip does

- **Covers:** AC-014, AC-015, AC-017 (toggletip); AC-009, AC-010 (`(?)`)
- **Do:** P-14, P-13 (`?` places). `ui/Toggletip.tsx`; `NextStep.tsx` (head), `SpecRow.tsx` (`.ov-coach`); `main.css`.
  Tests: new `src/webview/ui/Toggletip.test.tsx` (Tab-reachable, name and tooltip; pointer, Enter, Space open with
  `aria-expanded="true"` and the region filled; Escape, second activation, outside `pointerdown`, focus to another
  control close it and empty the region; a press inside the region keeps it; focus on `?` after Escape and second
  activation; Escape's `defaultPrevented`; one open closes the other; content change closes, equal content keeps; no
  focusable element inside; no message posted); `SpecDetail.test.tsx` (`?` in the head; Escape with it open keeps
  the side panel and the below-900 px detail, a second Escape closes or goes back; four paragraphs literally);
  `Sections.test.tsx` (`?` after the coach line; none without tips; none on cards and other rows); `webviewCss.test.ts`
  (theme variables only, visible focus outline, no transition over 150 ms, region in the flow: no `position:
  absolute|fixed`).
- **Verify:** `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx src/webview/detail src/webview/areas/overview`
  and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` red (stub), then green; gates 1–4
- [x] **Verified (T-007):** 2026-11-18 · red: `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx` 12 failed against the `Not implemented` stub, and the CSS test went red by mutation (300 ms transition plus `position: absolute`, 3 failed, restored) → green: `npx vitest run --project node --project webview` 157 files, 2611 passed, 3 skipped; timing projects 15 passed; eslint 0 warnings, both `tsc` clean, `npm run compile` and `npm run compile-tests` clean.
- **Notes:** `ui/Toggletip.tsx` takes `label`, `glyph`, `paragraphs` (generic for 0024); one open at a time through a module store and `useSyncExternalStore`; the pointerdown listener exists only while open (capture phase). Escape on the button while open calls `preventDefault`, so `DetailFrame` ignores it. Proxy: the Escape tests with `DetailFrame` sit in `Close.test.tsx` (side panel) and `ListOrDetail.test.tsx` (below 900 px), where the existing Escape helpers live, not in `SpecDetail.test.tsx`. The Overview coach text moved into `span.ov-coach-text` so the `?` and its region share the flex line; the region takes a whole line (`flex: 1 0 100%`, `:empty` takes none), the Next step section head wraps. The word-budget test of 0019 AC-010 counts the `?` and still passes.

### T-008 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-020, AC-021; AC-022–AC-025 (manual, checklist); re-proves AC-001–AC-019 by the full gate run
- **Do:** P-19, P-20, P-21, P-22. `docsScan.test.ts` new block "product docs after 0021 (AC-021)" (README literals,
  CHANGELOG under the version in preparation, no `**Copy**` or ``then `continue` `` in README or checklist, checklist
  0021 section with AC-022–AC-025, `Amended by 0021 (PD-069)` in 0006, 0007, 0013, 0015–0020); older docs literals that
  quote "Copy" or `continue` retargeted, titles kept. Audit script (throwaway, `/tmp/audit-0021/`) against the
  Baseline — the commit before T-001's commit (*Session handoff*) — and the head; `## Test-title audit` lists every absent title with its §5 row or head title. `/sdd-architecture-update`
  with this plan's approval, exactly: `AGENTS.md` `# last reconciled: … (0021)`; `modules` line `src/core/<area>`
  — board adds "step guides and tips 0021", new "settings 0021 — step tips and model hints through `SettingPort`";
  `src/adapters` — "vscode/ (…; settings 0021)"; `src/webview` — "coach line and About this step toggletip in the detail
  and the first Now row (0021)"; `shared` — "step guide texts and tips view" and 0021 in the spec list; the three maps'
  lines and `last reconciled`. Memory Bank: `techContext.md` one 0021 test line, `systemPatterns.md` one dated 0021
  entry, `activeContext.md`. The orchestrator's preview harness for AC-022 (screenshots recorded here).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red (docs of the Baseline), then green;
  `grep -c "Amended by 0021 (PD-069)"` per spec ≥ its §5 rows; audit counts; gates 1–5 and `npm run compile-tests`
- [x] **Verified (T-008):** 2026-11-18 · red: the new block "product docs after 0021 (AC-021)" in `docsScan.test.ts` failed 4 tests against the docs of the previous commit (README literals, `**Copy**` and then `continue`, CHANGELOG, checklist section); retargeting the literals then turned five older docs tests red until fixed (README card Copy regex, inline Copy button, 0022 primary-button sentence, CHANGELOG without `featherspec-studio.`, checklist heading order) → green: `npx vitest run --project node --project webview` 157 files, 2625 passed, 3 skipped; timing projects 15 passed; eslint 0 warnings, both `tsc` clean, `npm run compile` and `npm run compile-tests` clean. Audit: baseline 2516 titles (2506 distinct), head 2635 (2623), 18 absent, 0 decreased, each listed in the section above. `grep -c "Amended by 0021 (PD-069)"`: 0006 1, 0007 1, 0013 2, 0015 9, 0016 4, 0017 18, 0018 8, 0019 5, 0020 4.
- **Notes:** §5 notes by a throwaway script (`/tmp/audit-0021/amend.py`): the catch-all after the last head note of each spec, one note under each statement of the table, table rows after the table, always before any 0022 note; PD-063 is a register entry and is not edited. The README gets a Settings section, a rewritten "The next step everywhere" and Getting started step 3; the tree keeps the command short form, so its example stays `/sdd-compile`. The checklist section 0021 stands between 0020 and 0022 (spec order; the order test lists it) and avoids the assistant vendor's name (the 0015 scan forbids it). Architecture update: `AGENTS.md` snapshot and the three maps `last reconciled` 0021 with the entries named in the step; Memory Bank: `techContext.md`, `systemPatterns.md`, `activeContext.md`. AC-022–AC-025 stay manual (orchestrator's harness and Gregor).

### T-009 — Escape closes an open toggletip wherever focus is (compile D1)

- **Covers:** AC-014 (Escape), §6.6
- **Do:** `ui/Toggletip.tsx`: while open, a document `keydown` listener in the capture phase; on Escape it calls
  `preventDefault`, closes the toggletip and focuses its `?` (Inclusive Components pattern, as §6.6 cites). It exists
  only while open, like the `pointerdown` listener. The button's own `onKeyDown` Escape and its tests stay. A press on
  the region's text still keeps it open (P-14); the side panel stays open on the first Escape (`DetailFrame` ignores a
  `defaultPrevented` Escape). Test first in `Toggletip.test.tsx`: open it, `pointerdown` on the region's paragraph, blur
  the button, Escape on `body` → `aria-expanded` false, region empty, focus on the `?`, event `defaultPrevented`; Escape
  on `body` while closed is not handled and registers nothing; the listener is gone after close and after unmount;
  `Close.test.tsx` and `ListOrDetail.test.tsx`: the same sequence with `DetailFrame`, the detail stays open, the second
  Escape closes it or goes back. Red is by assertion against the head (no stub needed: the behaviour is missing).
- **Verify:** `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx src/webview/detail` red, then green;
  gates 1–4
- [x] **Verified (T-009):** 2026-11-18 · red: `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx src/webview/detail/Close.test.tsx src/webview/detail/ListOrDetail.test.tsx` 4 failed of 52 (Escape on `body` after a press on the region's text leaves `aria-expanded` true, in `Toggletip`, `Close` and `ListOrDetail`) → green: same files 52 passed; `npm run test:unit` 157 files, 2630 passed, 3 skipped, timing 15 passed; eslint 0 warnings, both `tsc` clean. Negative control on a scratch copy: removing the `removeEventListener('keydown')` fails 3 tests (listener leak).
- **Notes:** The listener is added with the `pointerdown` one while open (capture phase) and removed with it. The button's own Escape handler stays (its tests stay); both close and focus the `?`, the second finds it closed. `DetailFrame` ignores the `defaultPrevented` Escape, so the first Escape never reaches the side panel. Not covered by design: focus leaving the webview (a click into the editor) keeps the toggletip open, P-14; Escape then goes to the editor.

### T-010 — Each toggletip closes only itself (compile M71)

- **Covers:** AC-014 (one open at a time, content change)
- **Do:** test in `Toggletip.test.tsx` with two toggletips: the second open, a content change of the closed first one
  does not close the second; a blur of the closed first one does not close it either. The code is already right
  (`close()` checks `openId === id`), so the test is green at once; its negative control is the mutant "`close()` closes
  whichever is open" on a scratch copy (`git archive` to `/tmp`), recorded red below.
- **Verify:** `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx` green; the mutant on the scratch copy
  red; gates 1–4
- [x] **Verified (T-010):** 2026-11-18 · green at once (behaviour already right): `npx vitest run --project webview src/webview/ui/Toggletip.test.tsx` 15 passed; negative control M71 on a scratch copy (`git ls-files` copy in `/tmp/fx`, `close()` without the `openId === id` check): 1 failed ("each toggletip closes only itself: a content change of the closed one and its unmounting leave the open one open"), restored by discarding the copy; `npm run test:unit` 157 files, 2631 passed, 3 skipped, timing 15 passed; eslint 0 warnings, both `tsc` clean.
- **Notes:** The test uses two toggletips, the second open; a content change of the closed first and then its unmounting must not close the second. The blur of a closed toggletip is guarded by `open` in `onBlur` and was already covered by "focus moving to another control closes it".

### T-011 — Unreadable plan and the settings sections are decided by a test (compile M26, M39)

- **Covers:** AC-005 (§8 unreadable plan), AC-011
- **Do:** M26: §8 says an unreadable plan gives NS-6 "plan without open step", and `nextStep()` already does; the
  over-claiming title becomes true by adding the case: in `nextStep.test.ts` "0021 AC-005 … unreadable plan read as
  Resume" a plan that fails to read (`setUnreadable`) and one of binary bytes both give `NS-6-resume`. M39: the fake
  configuration of `adapters/vscode/settings.test.ts` gets the section-prefix semantics of `affectsConfiguration`
  (`featherspec-studio` affects `featherspec-studio.showStepTips`, a different key does not), and a test shows the port
  fires for its own key only.
- **Verify:** `npx vitest run --project node src/core/board/nextStep.test.ts src/adapters/vscode/settings.test.ts`; the
  mutants M26 and M39 on the scratch copy red; gates 1–4
- [ ] **Verified (T-011):**

### T-012 — The intent stands on its own line, the coach line is a description (compile M52, M79)

- **Covers:** AC-001 (own line), AC-009, §6.5
- **Do:** `webviewCss.test.ts` (0021 AC-001 and AC-009 describes): `.next-step-intent` takes the whole line
  (`flex: 1 0 100%`, as the harness saw it); `.step-coach` uses `var(--vscode-descriptionForeground)`, and no
  hard-coded colour. Red by the mutants M52 (`flex: none`) and M79 (foreground colour) on the scratch copy.
- **Verify:** `npx vitest run --project node src/adapters/node/webviewCss.test.ts`; mutants red; gates 1–4
- [ ] **Verified (T-012):**

### T-013 — README names the tree action and the step short form (compile D2, edit 3)

- **Covers:** AC-021, A-007
- **Do:** README lines 15 and 35: "inline **Copy Next Step**"; line 19 (Overview): "Next" and the step short form,
  e.g. `Verify · /sdd-compile`; line 25 (Board): **Next**, the short intent and the short form of the prompt, e.g.
  `Plan · /sdd-plan`. `docsScan.test.ts` literals first (red against the README), then the README.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-013):**

### T-014 — A cut hint never ends in a space before the ellipsis (compile exploratory)

- **Covers:** AC-012 (the 39/40 rule stays)
- **Do:** `stepTipSettings.ts`: after the cut to 39 code points, trim trailing whitespace, then add `…`. `stepTipSettings.test.ts`
  first: 38 × `x`, space, `yyyy` gives 38 × `x` and `…`; the 40/41 boundary and emoji cases stay.
- **Verify:** `npx vitest run --project node src/core/settings` red, then green; gates 1–4
- [ ] **Verified (T-014):**

### T-015 — `StepText` takes the format from the text module; stale fixtures are brought level (compile exploratory)

- **Covers:** guideline 10, AC-006
- **Do:** `nextStepTexts.ts` owns the separator of the step short form (`stepShortForm` builds from it); `StepText.tsx`
  uses that one definition. A test in `SpecBoard.test.tsx` and `Sections.test.tsx`: the text after the label equals
  `stepShortForm(step)` in every state. The synthetic views of `Sections.test.tsx`, `SpecBoard.test.tsx` and
  `primaryButtons.test.tsx` drop the obsolete `continue` second line (NS-6 is variant A).
- **Verify:** `npx vitest run --project webview src/webview` green (the new test red against a changed separator on the
  scratch copy); gates 1–4
- [ ] **Verified (T-015):**

### T-016 — Traceability, titles, Memory Bank, evidence and handoff (compile edits 1, 5–8)

- **Covers:** AC-013 (path), AC-011 (smoke title), AC-022 (harness part)
- **Do:** Traceability row AC-013 → `src/adapters/node/sourceScan.test.ts`; the AC-022 harness result with the content
  of the orchestrator's preview note; `board.smoke.test.ts:97` retitled (the assertion stays, `< 2_000`);
  `.memory-bank/activeContext.md` *Now*; `.architecture/core.md` settings entry ("over 40 characters cut to 39 and
  `…`"); the T-006 note on the reverse red; handoff and status.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts`; `npm run compile-tests`; final gates
- [ ] **Verified (T-016):**

## Test-title audit

`python3 -I /tmp/audit-0022/titles.py <git archive 0ef5875> <head>` over every `describe`, `it`, `test` and `suite` literal of every `.ts` and `.tsx` under `src` (`src/test/**` and `testing/*.ts` included), 2026-11-18, T-008: baseline 2516 titles (2506 distinct), head 2635 titles (2623 distinct); absent at the head 18, decreased in count 0. Every other title at the Baseline exists at the head. The 18 absent titles are the ones the expected map named plus the readings that went with them; each is a replaced statement of §5 or retitled:

- `src/core/board/nextStep.test.ts`: "NS-6: an Active spec needs /sdd-plan" → replaced by §5 row 0015 §6.1 NS-6 (0021 §6.2); `0021 AC-005` and `0021 AC-003` describes
- `src/core/board/nextStep.test.ts`: describe "0017 AC-002: NS-6 names "continue" only while the plan has an open step" → void (§5 0017 §6.2, AC-002; PD-072); replaced by describe `0021 AC-003: an Active spec leads with the single-step prompt of its open step`
- `src/core/board/nextStep.test.ts`: "0017 AC-002: NS-6 reads the open step from the spec's own plan" → void (§5 0017 AC-002); replaced by `0021 AC-003 … T-003 "Reject money values" is built by Implement T-003 of <plan> …`
- `src/core/board/nextStep.test.ts`: "an Active spec whose plan has an open step reads /sdd-plan, then "continue" under the same-chat label" → void (§5 0017 §6.2); replaced by `0021 AC-003: T-003 "Reject money values" is built by Implement T-003 of <plan>, then /sdd-plan <spec> under its own intent`
- `src/core/board/nextStep.test.ts`: "an Active spec whose plan has no step list reads /sdd-plan only" → replaced (§5 0017 §6.2); `0021 AC-005: no step list, all steps ticked or struck, and an unreadable plan read as Resume`
- `src/core/board/nextStep.test.ts`: "an Active spec whose steps are all ticked or struck reads /sdd-plan only" → replaced by the same `0021 AC-005` title
- `src/core/board/nextStep.test.ts`: "N8: with two Active specs the one whose plan has an open step gets "continue", the other not, in either order" → replaced by `0021 AC-003: with two Active specs the one with an open step leads with Implement, the other with the report, in either order` (§5 0017 §6.2, AC-002)
- `src/core/board/nextStep.test.ts`: "AC-001: the lines carry the second line and its label; a line without a label has no label key" → replaced by describe `0021 AC-001: every next step line carries its intent, one fixture per row of §6.1 and §6.2` (§5 0015 §8 Detail, AC-003)
- `src/core/board/nextStep.test.ts`: "AC-001: shortForm cuts a command at its name, a start at its id, an implement at its verb (control: other text stays)" → replaced by describe `0021 AC-006: the step short form of every case` (§5 0017 §6.1; `Implement <ID>`)
- `src/shared/protocol/stepView.test.ts`: "accepts a step with one line and a step with a labelled second line" → retitled `0021 AC-001: a line takes exactly text and intent, both strings; a label key or a missing intent is refused` (§5 0015 §8, 0021 §7)
- `src/core/copyNextStep/statusEntry.test.ts`: "a second line shows under its label, the label first" → replaced by `0021 AC-007: each line shows its intent first and its prompt after it, escaped` (§5 0020 §4.2 Tooltip, 0017 §6.3)
- `src/webview/detail/SpecDetail.test.tsx`: "AC-003: two lines carry the label of the second one; a rule with text only shows the text and no button" → replaced by `0021 AC-001: each line shows its intent as its own element directly before its prompt and Copy, in DOM order; a rule with text only shows the text and no button` (§5 0015 AC-003)
- `src/webview/ui/CopyButton.test.tsx`: "AC-018: before any activation the button reads Copy, has no tooltip and its live region is empty and ready" → retitled `… reads Copy prompt …` (§5 0016 AC-018 "Copy again")
- `src/webview/ui/CopyButton.test.tsx`: "AC-018: 2 s after the activation the label is Copy again, with the tooltip it had before and an empty live region" → retitled `… the label is Copy prompt again …` (§5 0016 AC-018)
- `src/webview/ui/CopyButton.test.tsx`: "is a text-less button with the copy glyph, the name and the tooltip `Copy: <line>`, an empty live region and none of the primary classes" → retitled `… the tooltip `Copy prompt: <line>` …` (§5 0017 AC-004, AC-012 "Copy: <full first line>")
- `src/core/copyNextStep/copyNextStep.test.ts`: "with no spec that has a step: the message with "Copy", which copies /sdd-specify; dismissing copies nothing" → retitled `… the message with "Copy prompt" …` (§5 0017 §7 row "Quick pick, message", AC-020)
- `src/adapters/vscode/manifest.test.ts`: "AC-015 (0015): declares no configuration property" → replaced by `0021 AC-016: contributes the configuration FeatherSpec Studio with exactly the two settings …` (§5 0015 AC-015)
- `src/adapters/vscode/manifest.test.ts`: "AC-015 (0015): negative control, a manifest with a configuration would be found" → replaced by `0021 AC-016: negative control, a third key, a Markdown description or a scope would be found` (§5 0015 AC-015)

Titles that name the control "Copy" otherwise stay (catch-all of §5): the tests still pass and read `Copy prompt` where they assert the label.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-002, T-005, T-007 | src/shared/protocol/nextStepTexts.ts:STEP_GUIDES, src/core/board/nextStep.ts:nextStep, src/webview/detail/NextStep.tsx | src/core/board/nextStep.test.ts 0021 AC-001; src/webview/detail/SpecDetail.test.tsx 0021 AC-001 | verified |
| AC-002 | T-001 | src/core/board/nextStep.ts:nextStep | src/core/board/nextStep.test.ts 0021 AC-002 | verified |
| AC-003 | T-001, T-002, T-005 | src/core/board/nextStep.ts:nextStep (NS-6-open), stepShortForm | src/core/board/nextStep.test.ts 0021 AC-003, AC-006 | verified |
| AC-005 | T-001, T-002, T-005 | src/core/board/nextStep.ts:nextStep (NS-6-resume, NS-6-plan) | src/core/board/nextStep.test.ts 0021 AC-005, AC-006 | verified |
| AC-006 | T-002 | src/shared/protocol/nextStepTexts.ts:stepShortForm, src/core/board/nextStep.ts:shortForm, stepView, src/core/shell/specTree.ts, src/core/copyNextStep/copyNextStep.ts, src/webview/ui/StepText.tsx | src/core/board/nextStep.test.ts 0021 AC-006; src/core/shell/treeLabel.test.ts 0021 AC-006; src/webview/board/SpecBoard.test.tsx | verified |
| AC-007 | T-001 | src/shared/protocol/nextStepTexts.ts:stepTooltip, src/core/shell/specTree.ts:tooltipOf, src/core/copyNextStep/entryView.ts:tooltipOf | src/core/shell/specTree.test.ts; src/core/copyNextStep/statusEntry.test.ts 0021 AC-007; src/webview/board/SpecBoard.test.tsx; src/webview/areas/overview/Sections.test.tsx | verified |
| AC-008 | T-003 | src/shared/protocol/nextStepTexts.ts:COPY_PROMPT_LABEL, src/webview/ui/CopyButton.tsx, src/core/copyNextStep/copyNextStep.ts | src/webview/ui/CopyButton.test.tsx 0021 AC-008; src/adapters/node/webviewBundle.test.ts 0021 AC-008 sweep; src/core/copyNextStep/copyNextStep.test.ts | verified |
| AC-009 | T-005, T-007 | src/core/board/stepTips.ts:stepTips, src/core/board/detail.ts, src/core/overview/rows.ts:projectNow, src/webview/detail/NextStep.tsx, src/webview/areas/overview/SpecRow.tsx, src/webview/ui/Toggletip.tsx | src/core/board/stepTips.test.ts; src/webview/detail/SpecDetail.test.tsx 0021 AC-009; src/webview/areas/overview/Sections.test.tsx 0021 AC-009, AC-014 | verified |
| AC-010 | T-005, T-006, T-007 | src/core/board/detail.ts, src/core/overview/rows.ts (tips only while showStepTips) | src/core/board/detail.test.ts 0021 AC-010; src/core/overview/rows.test.ts; src/webview/detail/SpecDetail.test.tsx 0021 AC-010; src/adapters/node/webviewBundle.test.ts | verified |
| AC-011 | T-006 | src/core/board/boardService.ts, src/core/overview/overviewService.ts, src/adapters/vscode/settings.ts, src/extension.ts | src/core/board/boardService.test.ts; src/core/overview/overviewService.test.ts; src/core/board/boardService.timing.test.ts; src/core/overview/overviewService.timing.test.ts; src/adapters/vscode/settings.test.ts; src/test/board.smoke.test.ts (CI) | verified |
| AC-012 | T-004, T-005 | src/core/settings/stepTipSettings.ts:parseStepTipSettings, src/core/board/stepTips.ts | src/core/settings/stepTipSettings.test.ts; src/core/board/stepTips.test.ts | verified |
| AC-013 | T-005 | src/shared/protocol/nextStepTexts.ts (no model name), package.json | src/core/board/sourceScan.test.ts 0021 AC-013; src/adapters/node/webviewBundle.test.ts coach sweep | verified |
| AC-014 | T-007 | src/webview/ui/Toggletip.tsx, src/webview/detail/NextStep.tsx, src/webview/areas/overview/SpecRow.tsx, src/webview/main.css | src/webview/ui/Toggletip.test.tsx; src/webview/detail/SpecDetail.test.tsx 0021 AC-014; src/webview/detail/Close.test.tsx; src/webview/detail/ListOrDetail.test.tsx; src/webview/areas/overview/Sections.test.tsx; src/adapters/node/webviewCss.test.ts 0021 AC-014 | verified |
| AC-015 | T-007 | src/core/board/stepTips.ts:stepTips (about), src/webview/ui/Toggletip.tsx | src/core/board/stepTips.test.ts; src/webview/detail/SpecDetail.test.tsx 0021 AC-015; src/webview/ui/Toggletip.test.tsx (no focusable element) | verified |
| AC-016 | T-004 | package.json contributes.configuration | src/adapters/vscode/manifest.test.ts 0021 AC-016 | verified |
| AC-017 | T-006, T-007 | src/core/copyNextStep/noWrite.test.ts (guard), src/adapters/vscode/settings.ts (read-only) | src/core/copyNextStep/noWrite.test.ts 0021 AC-017; src/adapters/vscode/settings.test.ts; src/webview/ui/Toggletip.test.tsx (no message) | verified |
| AC-018 | T-006 | src/core/board/stepTips.ts, src/core/board/detail.ts (no trust or writer input) | src/core/board/stepTips.test.ts 0021 AC-018 | verified |
| AC-019 | T-001 | src/shared/protocol/nextStepTexts.ts:continueIntent, startIntent, src/core/board/shortTitle.ts:plainShort | src/core/board/nextStep.test.ts 0021 AC-019 | verified |
| AC-020 | T-008 | src/adapters/node/docsScan.test.ts; plan section Test-title audit | plan section Test-title audit (18 absent titles, each with its §5 row or head title); npm run test:unit | verified |
| AC-021 | T-008 | README.md, CHANGELOG.md, docs/release-checklist.md, the §5 notes in .specs/ | src/adapters/node/docsScan.test.ts product docs after 0021 (AC-021) | verified |
| AC-022 | T-008 | — | manual: orchestrator's preview harness, then Gregor | open |
| AC-023 | T-008 | — | manual: Gregor, Settings UI | open |
| AC-024 | T-008 | — | manual: Gregor on `tip-splitter` | open |
| AC-025 | T-008 | — | manual: Gregor with Copilot and Claude Code | open |

AC-004 is void (PD-072 chose variant A); no step builds it.

## Session handoff

- **Done so far:** all eight steps verified and committed (T-001 `db15d7a` … T-007 `65a41f6`, stage 3 sync `51260c8`, T-008 in the closing commit); gates green on Linux (`npm test` and the host smoke only on Windows and CI).
- **Next action:** the orchestrator's preview harness for AC-022 (screenshots into this plan), Gregor's checks AC-023, AC-024, AC-025 on `tip-splitter` (checklist section 0021); then `/sdd-compile` and, after READY, `/sdd-lifecycle`. The spec stays in active/ until then.
- **Open decisions:** none for Gregor; proxies P-1…P-22 above plus those in the step notes.
- **Baseline:** `0ef5875` (head before the first step commit; moved to active/ 2026-11-18)
- **Environment:** `npm test` (host smoke, including `src/test/board.smoke.test.ts`) only on Windows and CI; layout checks in the orchestrator's harness.
