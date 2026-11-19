# Plan — Send Defaults and Wording

**Spec:** [0026-send-defaults-and-wording.md](0026-send-defaults-and-wording.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-001

## Approach

Wording first, layout second, docs last. Stage 1 lands the Send default and every changed word in the shared text modules
and the core (`sendView.ts`, `nextStepTexts.ts`, `stepTips.ts`, `StepText`), so every later test asserts final texts.
Stage 2 makes two lists shorter: Now stops at five rows, the ways become three radio lines. Stage 3 puts guidance once: one
coach line per view with quiet Now rows, and the ways' explanations behind `About these ways`. Stage 4 sweeps, previews,
writes §5's notes and docs and runs the gates. Everything builds on 0028 and 0025 as their plans build them: 0028's
`NS-6-report`, `levelsOnImplement()`, the 1.11.0 reason and the Baseline snapshots; 0025's `SendButton` `look`, the
`StepText` link, the map header's `NextStep`, `Ways`' lifted `open`, `PROTOCOL_VERSION` 9. **0028 AC-010's snapshot test
compares `stepView` and `tips`**, which this spec rewords: T-002 and T-003 translate the Baseline by §7's table instead of
masking fields, so the test keeps proving everything else. No new dependency, no new module folder, no new view field for
the ways. Memory Bank touched in T-011 only: `techContext.md` (*Test* line), `activeContext.md`; `systemPatterns.md` gets
no entry (no new pattern; PD-078 is a product decision, recorded in the PD register already).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps touching the protocol, the
bundle or the host smoke: T-005, T-011) · pre-done `npm test` on Windows and CI, run by the orchestrator (cannot run here).

## Research

**Checkpoint digest (2026-11-19, Mode A; answered from the standing answer `PLAN-R3.md`, Gregor not reachable).**
- The spec touches existing code, so a checkpoint applies. Every answer comes from the binding sources (spec, 12 D3, 13,
  PD-084…PD-089, `ux-guidelines.md`, `cross-spec-r3.md`). OP-001…OP-007 were closed before this plan (13 K-2, K-3, K-5;
  D-2, D-3, D-4; REPORT.md); no open point is left, so no proxy decision was needed here.
- PD-086 (`Move back to Ready`), PD-088 (`Send`, not `Paste`), PD-087 (version-dependent reason, owned by 0028) and PD-078,
  PD-080 (confirmed by PD-084) are in the spec. PD-085 and PD-089 bear on 0025 and 0027.
- Three survey findings revised the spec before this plan (header *Changes*, revise mode):
  - AC-021's search would have failed on 0021's `TIP_CLOSING[0]` `… before you paste.` (shown only with Copy prompt
    alone; `tipClosingOf()` swaps in `sendTipText` with Send) and on identifiers `pasteKeyOf`, `pasteKey`: it now reads
    string literals and allows that sentence.
  - AC-024's "exactly one primary" contradicted 0025 AC-026 (no primary while U-08 makes `Integrate` quiet): now named.
  - §10 names 0028's snapshot test and the `now` shape change with its host smoke.
- No `done/` spec becomes a `Deprecated` candidate; §5's statements get notes.
- Web lookups ran under the standing answer's go, as S95 and S97 did.

**Survey (code at `f9aff73`, 0028 T-004 uncommitted in the same tree; read 2026-11-19).**
- Send: `core/assistant/sendView.ts` `sendViewOf()` sets Copilot's `target` to `current` unless
  `STEP_GUIDES[case].session === 'new'`; `assistants.ts` `callsFor()` gives `newChat` + `open` for `new`, `open` alone for
  `current`; Claude Code has one target. `ui/SendButton.tsx` renders every menu item `role="menuitem"` and finds items by
  that role (`itemButtons()`); `Glyph kind="check"` exists. `sendOpenedText()` already reads AC-020's sentence and the
  host sends it as `sendResult.text`, which becomes tooltip and live region: AC-020 is likely green at once.
- Wording: `shared/protocol/nextStepTexts.ts` `STEP_GUIDES` (short `Fix status`, `Unblock` ×2, `Resume`, `Plan` ×2,
  `Build`; 0028's `NS-6-report` already `Report`), `SESSION_WORDS.sameOrNew`, `SESSION_REASONS.new`/`sameOrNew`, 0028's
  `SAME_OR_NEW_REASON_LEVELLED` (not touched here), `NEXT_STEP_SHORT_LABEL = 'Next'`, `TIP_CLOSING`. `NS-6-returned` then
  `Paste it once …` is one fixed string; `stepTips(case, settings, closing, context)` gets the version and reason from
  0028, callers `core/board/detail.ts`, `core/overview/rows.ts`. `same chat`/`this chat` outside tests: only
  `nextStepTexts.ts`.
- Snapshot coupling: `test/fixtures/next-step-baseline/*.json` hold `stepView.intent` (e.g. `Continue`) and `tips.coach`,
  `tips.about[1]` (`same chat or new chat`, `Same chat or new chat: …`); `nextStepBaseline.test.ts` compares with an
  `EXCEPTIONS` list and a stale-exception control.
- Now: `core/overview/rows.ts` `NOW_ORDER` Blocked, Review, Active by number then key, no cap; `projectUpNext` already
  gives `{ rows, more, stems }` with `UP_NEXT_LIMIT`. The card's day is `board/lastChange.ts` `cardLastChange()` from
  plan `Last updated`, else file times (`cards.ts`). `OverviewView.now` is `OverviewRow[]` (guard `isRows`);
  `areas/overview/Now.tsx` gives row 0 `copyLook 'primary'`; `requests.ts` `namedSet()`; `texts.ts` `moreText()`. The host
  smoke `src/test/overview.smoke.test.ts` reads `now[0]` and the view's key list.
- G-5: `SpecRow.tsx` renders `.ov-coach` with `Toggletip` whenever `row.tips` exists (only row 0 has tips);
  `isSelectedSpec(selection, spec)`. `Toggletip` has no leave-with-focus callback (SendButton has `onLeaveWithFocus`).
  `detail/NextStep.tsx` renders `.step-coach` after line 1 as visible text (AC-023 mostly holds already).
- Ways: `areas/planMap/Ways.tsx` lists all three ways with name, effect, prompt and Copy, start lines under Other agents;
  `planMapTexts.ts` `WAYS` (name, effect, suffix), `WAYS_LEAD_TEXT` (M-08), `START_LINES_LEAD_TEXT` (M-10);
  `PlanWaysView { stage, prompts, startLines }`; `focus.ts` `requestMapFocus()` for the heading.
- Tests that assert changed texts (scratch grep): short intents in 9 test files; `docsScan.test.ts` README `**Next**`
  (0017) and the checklist's "stays the default target" (0024); `primaryButtons.test.tsx` builds seven Now rows and two
  primaries (0022 AC-011); `overview.test.ts`, `stepView.test.ts`, `Overview.test.tsx` build `now` arrays.
- Sources
  - [WAI-ARIA APG: Radio Group Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) — Tab enters at the checked
    radio, arrows move and check, `radiogroup` named by `aria-labelledby` or `aria-label`; settles the Tab stop of
    §6.6 (1) and naming the group by the disclosure's text. Native radios keep the keys (AC-017 checks them, jsdom does
    not). Retrieved 2026-11-19.
  - [WAI-ARIA APG: Menu and Menubar Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) — a checked
    `menuitemradio` carries `aria-checked="true"`; `menuitem` and `menuitemradio` may share a menu; Space checking without
    closing is optional, Enter activates and closes. Settles AC-022's roles; the Studio keeps 0024's activation keys and
    adds no Space-to-check. Retrieved 2026-11-19.
  - [VS Code: Theme Color reference](https://code.visualstudio.com/api/references/theme-color) — `radio.activeBackground`,
    `radio.activeBorder`, `radio.inactive*`, `focusBorder`, `contrastActiveBorder` exist; webviews get them as
    `--vscode-*` variables. Settles the theme-variable-only style of radios and the `default` tag. Retrieved 2026-11-19.
  - [W3C WCAG Technique C7](https://www.w3.org/WAI/WCAG21/Techniques/css/C7) — CSS-hidden text stays in the accessible
    name; with the repo's `.visually-hidden` class it settles AC-005's `Next step: `. Retrieved 2026-11-19.

## Stages

1. T-001 → T-002 → T-003 → T-004 — Send opens a new chat; one term and Send wording; short forms; no visible "Next"
2. T-005 ‖ T-006 — independent: Now stops at five rows (overview core, protocol, `Now.tsx`); the ways as three radio lines
   (`Ways.tsx`, `planMapTexts.ts`); run in sequence
3. T-007 ‖ T-008 — independent: one coach line and quiet Now rows (`SpecRow`, `Toggletip`); `About these ways`, the tag
   style and focus (`Ways.tsx`, CSS); run in sequence
4. T-009 → T-010 → T-011 — sweeps; preview; §5 notes, docs, title audit, Memory Bank and final gates

Parallel: stages 2 and 3, run in sequence (`PLAN-R3.md`). Stage 1 shares `nextStepTexts.ts`, `stepTips.ts` and
`nextStepBaseline.test.ts` across its steps: no `‖`.

## Steps

### T-001 — Send opens a new chat, and the menu checks it

- **Covers:** AC-001, AC-020, AC-022
- **Do:**
  - `sendViewOf()` returns `target: 'new'` for every `StepCase` and both assistants; the `current` branch goes, `callsFor()`
    stays.
  - `SendButton` menu: each Send item `role="menuitemradio"`, `aria-checked` true exactly for `send.target`, a
    `Glyph kind="check"` (`aria-hidden`) on the checked one; `Copy prompt` stays `menuitem` without either.
    `itemButtons()` selects both roles, so keys and order stay 0024's. Main label stays `sendMainLabel()`.
  - Tests:
    - `sendView.test.ts` "0026 AC-001 …": every case × Copilot, Claude Code gives `new` and 0024's targets.
    - `send.test.ts` "0026 AC-001 …" (fake host, AC-001's example literally): main part → `newChat`, then `open` with
      `{ query, isPartialQuery: true }`; `Send to the current chat` → one `open`; nothing submits.
    - `SendButton.test.tsx` "0026 AC-022 …" (roles, `aria-checked`, glyph, check stays on `Send to a new chat` after a
      current-chat Send, label `Send to Copilot` / `Send to Claude Code`) and "0026 AC-020 …" (tooltip and live region
      = the sentence literally, no text says sent; Claude Code's name). AC-020 is expected green at once: negative
      control (a `sendResult.text` that differs gives red).
  - Retarget the 0024 AC-004/AC-005 tests that expect `current` (titles and the replacing head titles in `Notes:`).
- **Verify:** `npx vitest run src/core/assistant/sendView.test.ts src/core/assistant/send.test.ts src/webview/ui/SendButton.test.tsx`
  red first (`current` on NS-6, `menuitem` roles), then `npm run test:unit` green.
- [x] **Verified (T-001):** red first (15 failures: `current` targets, `menuitem` roles); green: sendView, send, SendButton, SpecDetail, Overview tests, tsc both, eslint on touched dirs.
- **Notes:** `sendViewOf(offer, stepCase)` keeps its signature (callers unchanged; the case no longer matters). Retargeted 0024 AC-004's per-case titles: `N: Copilot sends to the new chat` (old `… the current chat`/`new chat` by session; replaced by `0026 AC-001 <case>: Copilot sends to the new chat, with both targets`), `the new target is exactly the cases whose session is new` (replaced by `0026 AC-001: no step case defaults to the current chat, whatever its session`). Menu selectors `[role="menuitem"]` became `[role^="menuitem"]` in SpecDetail/Overview/SendButton tests; SpecDetail 0024 AC-010 focus role assertion now matches `^menuitem`. Check glyph sits in a fixed-width `.send-check` span so labels align.

### T-002 — One term for the open chat, and Send beside a Send

- **Covers:** AC-002, AC-021 (src part; README and checklist in T-011)
- **Do:**
  - `SESSION_WORDS.sameOrNew` `current or new chat`; `SESSION_REASONS.sameOrNew` and `.new` as §7 (0028's 1.11.0 reason
    stays its own).
  - `INTEGRATE_SEND_THEN` `Send it once every worker you started is back.`; `StepTipContext` gains `send?: true`;
    `stepTips()` uses it for `NS-6-returned`'s then-sentence; `detail.ts` and `rows.ts` pass it exactly when a `SendView`
    exists (0028's snapshot uses no offer, so its then-sentence stays).
  - `nextStepBaseline.test.ts`: `WORDING_0026`, §7's replacements applied to each expected snapshot's `stepView` and
    `tips` before the comparison (session word, both reasons); title kept, no new `EXCEPTIONS` entry; a control: one
    old wording left in a head value gives red.
  - Tests:
    - `stepTips.test.ts` "0026 AC-002 …" (NS-6 open and returned coach, the reasons for NS-5, NS-9 and `sameOrNew`
      literally, below 1.11.0) and "0026 AC-021 …" (returned work with and without Send).
    - `sourceScan.test.ts` "0026 AC-002 …" (`src` without test files and `package.json`: no `same chat`, `this chat`) and
      "0026 AC-021 …" (string literals of the text modules: `paste` only in the allowed five; a planted literal gives red).
    - `primaryButtons.test.tsx` or `SpecDetail.test.tsx` "0026 AC-021 …": with Send, no text of the step block starts
      with `Paste`.
  - Update literal assertions of the old words (0021, 0023, 0028 AC-020's old reason; titles kept, list in `Notes:`).
- **Verify:** `npx vitest run src/core/board/stepTips.test.ts src/adapters/node/sourceScan.test.ts src/core/board/nextStepBaseline.test.ts`
  red first (old words, `Paste` with Send), then `npm run test:unit` green.
- [x] **Verified (T-002):** old wording asserted against new code failed 12 tests first (stepTips); green: stepTips, detail, nextStep, nextStepBaseline, boardService, rows, sourceScan, core, webview, shared; tsc, eslint.
- **Notes:** `WORDING_0026`, `translated()` and `readBaseline()` live in `core/board/testing/nextStepSnapshot.ts` (shared by `nextStepBaseline.test.ts` and 0028 AC-005's per-case test in `nextStep.test.ts`, which also compared raw snapshots); the Baseline test keeps its title, no new EXCEPTIONS entry; a 0026 negative control proves the translation changes old wording. `StepTipContext.send` set by `detail.ts` and `rows.ts` exactly when a SendView exists. 0024 AC-004 tests retargeted: `boardService` AC-010 and `rows` first-row send expect `new`; `detail.test` title `NS-5 (a Review spec) is a new chat for Copilot; NS-7 (a Ready spec) and NS-6 are the current chat` replaced by `0026 AC-001: NS-5, NS-7 and NS-6 are all a new chat for Copilot (0024 AC-004 retargeted)`. `stepTips.test` literals of 0021 AC-009/AC-015, 0023 AC-013, 0028 AC-020 changed to `current or new chat`/`Current or new chat:`/`what the current chat knows` (titles keep, except `same chat or new chat, fast model; effect …` -> `current or new chat, fast model; effect …`). AC-021 scan allows four literals (Copy-only then-sentence, 0023's Other agents effect `Paste each into another chat`, TIP_CLOSING[0], fallback warning); `None: Copy prompt` description lives in `package.json`, not in `src`.

### T-003 — Short forms start with their intent's first word

- **Covers:** AC-003, AC-004
- **Do:**
  - `STEP_GUIDES` short intents as §6.3's table: NS-2 `Move back to Ready`, NS-4 and NS-4-plan `Find blocker`,
    NS-6-resume `Report`, NS-6-plan and NS-10 `Write plan`, NS-7 `Start` (0028's NS-7 without an open step is
    `NS-6-resume`, so `Report`).
  - `WORDING_0026` gains the five short-intent replacements (per case, not per word: `Plan` → `Write plan` only for
    NS-6-plan and NS-10).
  - Tests:
    - `nextStep.test.ts` "0026 AC-003 …": for each fixture of the spec's list (0021's per case, 0028's cases, three
      assistant values) the step short form equals the table's, and the card (`buildCards`), Overview row, tree
      description (where 0022 §4.2's 32 characters keep the intent; `Move back to Ready · /sdd-lifecycle` falls back to the
      command short form) and quick-pick description after `<state> · ` carry the same string.
    - `nextStep.test.ts` "0026 AC-004 …": for every `StepCase` of the text module, one fixture each, non-empty, first word
      equal to the first line's intent's, `Have the ` / `Let the agent ` → `Verify`, `Challenge`, `Report`; NS-2
      `Move back to Ready`. A control: a planted short intent `Next Continue` gives red.
  - Update the literal short intents in 9 test files (cards, tree, quick pick, status bar, copyNextStep, Overview, …;
    titles kept, changed statements in `Notes:`).
- **Verify:** `npx vitest run --project node src/core/board/nextStep.test.ts src/core/board/nextStepBaseline.test.ts`
  red first (`Fix status`, `Unblock`, `Resume`, `Plan`, `Build`), then `npm run test:unit` green.
- [x] **Verified (T-003):** red first (17 failures in 7 files after the text module change); green: `npx vitest run src` (3479 passed), tsc, eslint.
- **Notes:** `SHORT_INTENTS_0026` in `testing/nextStepSnapshot.ts` translates the Baseline's `stepView.intent` per case (per case, not per word). Literal short intents changed in `nextStep.test.ts` (0021 AC-001 guide table, AC-006 table, 0028 AC-016), `cards.test` (0017 AC-001), `copyNextStep.test` (quick-pick `Ready · Report · /sdd-plan`), `currentSpec.test`, `finishedPlan0028.test`; titles kept. The tree (0022 §4.2) and status bar read the same string, so their tests needed no edit. `activeContext.md` names 0026 under *Active Spec* now (docsScan requires it for a spec in `active/`).

### T-004 — No visible "Next" before a short form

- **Covers:** AC-005
- **Do:**
  - `NEXT_STEP_SHORT_LABEL` `Next` becomes `NEXT_STEP_HIDDEN_LABEL` `Next step: `; `StepText` (as 0025 T-008 left it,
    with its step link) renders it as `<span className="visually-hidden">`, then the short intent, ` · ` and the command
    short form in `<code>`; the tooltip stays `stepTooltip()`.
  - Tests: `StepText.test.tsx` "0026 AC-005 …" (DOM order, hidden span, with `.visually-hidden` removed no `Next`,
    tooltip = 0021 AC-007's form, with and without 0025's link); `Card` and `Overview` tests: every card and Overview row
    (Now, Up next, Problems) with a step renders it so.
  - Update `step-label` assertions (0017 AC-004, AC-012; 0018 O-5; 0022 §4.1; titles in `Notes:`).
- **Verify:** `npx vitest run src/webview/ui/StepText.test.tsx` red first (visible `Next`, no hidden span), then
  `npm run test:unit` green.
- [x] **Verified (T-004):** StepText hidden-label tests; webview 715 green; stage 1 gate chain green (eslint, tsc, tsc webview, test:unit, compile, compile-tests).
- **Notes:** `NEXT_STEP_SHORT_LABEL` (`Next`) is replaced by `NEXT_STEP_HIDDEN_LABEL` (`Next step: `); the `.step-label` class and its two CSS rules are gone (the span is `.visually-hidden`). `textOf()` in webview tests skips visually hidden text, so 0025 AC-027's `Continue · Implement T-003` assertions stayed. Retargeted `SpecBoard.test` 0017 AC-004 and `Sections.test` 0018 AC-006 (`.step-label` -> `.step-text > .visually-hidden`, `Next Continue · …` -> `Next step: Continue · …`; titles kept).

### T-005 — Now stops at five rows

- **Covers:** AC-007, AC-008
- **Files:** `src/core/overview/rows.ts`, `src/core/overview/now0026.test.ts`, `src/core/board/lastChange.ts`,
  `src/core/board/cards.ts`, `src/shared/protocol/overview.ts`, `src/shared/protocol/overview.test.ts`,
  `src/shared/protocol/stepView.test.ts`, `src/shared/protocol/envelope.ts`, `src/shared/protocol/messages.test.ts`,
  `src/webview/areas/overview/Now.tsx`, `src/webview/areas/overview/requests.ts`,
  `src/webview/areas/overview/Overview.test.tsx`, `src/webview/areas/overview/Now0026.test.tsx`,
  `src/webview/primaryButtons.test.tsx`, `src/test/overview.smoke.test.ts`
- **Do:**
  - `lastChangeOf(project, entry)` in `lastChange.ts` (the card's day; `cards.ts` uses it, so Board and Now read one day).
  - `rows.ts`: Blocked by number then key; Review by that day ascending, no day last, ties by number then key; Active by
    number then key; `NOW_LIMIT = 5`; `projectNow()` returns `{ rows, more, stems }` (stems of every Now entry); the first
    row stays 0021's and 0024's first row.
  - `OverviewView.now` takes Up next's shape (guard reused), `PROTOCOL_VERSION` once more (9 → 10 after 0025's).
  - `Now.tsx`: `+ n more` (`moreText()`) as a `Drill` after the list, `nowRequest(stems)` with `NOW_SET_LABEL` `Now`.
  - Host smoke: `now.rows[0]`, `now.rows.every(…)`; key list unchanged; waits unchanged.
  - Tests: `now0026.test.ts` "0026 AC-007 …" (the spec's example literally; five, six, eight; the set's stems) and
    "0026 AC-008 …" (core part); `Now0026.test.tsx` "0026 AC-007 …" (one request with label `Now`, all stems), "0026
    AC-008 …" (`Nothing in progress.`, no `+ n more` at five, `+ 1 more` at six, the first row's coach and split button,
    later rows icon Copy).
  - Update the `now` arrays in the four test files (0022 AC-011's "seven Now rows" becomes seven entries, five rows).
- **Verify:** `npx vitest run src/core/overview/now0026.test.ts src/webview/areas/overview/Now0026.test.tsx` red first (no
  cap, number order in Review), then `npm run test:unit` and `npm run compile` green; host smoke by the orchestrator in
  T-011.
- [x] **Verified (T-005):** `npx vitest run src` 3494 passed; tsc, tsc webview, eslint green; new `now0026.test.ts` and `Now0026.test.tsx` (the old `0018 AC-004` no-cap test failed first: 7 entries gave 7 rows). `npm run compile` runs in the stage 2 gate; the host smoke is the orchestrator's (T-011).
- **Notes:** `OverviewView.now` is `OverviewNow` (= `OverviewUpNext`: `{ rows, more, stems }`); `PROTOCOL_VERSION` 10. `lastChangeOf(project, entry)` added to `board/lastChange.ts`; `cards.ts` keeps its map-based `cardLastChange` call (same function underneath; avoids an O(n^2) lookup per card). `Now.tsx` takes `{ now, navigate }`; its drill id is `moreNow` (Up next keeps `more`). Host smoke `overview.smoke.test.ts` edited to `now.rows` (cannot run here). Test edits: every `view.now[...]` / `.now.map(...)` became `.now.rows…` (core overview, assistant restricted, board 0028 tests, webview Overview tests, `overviewSample`); `v: 9` literals became `v: 10` and the two 'another version' tests moved to `v: 11`; retitled `0018 AC-004 has no cap: seven entries give seven rows` -> `0026 AC-007: seven entries give five rows (0018 O-2 refined: the cap is five)`, `0022 AC-011 … seven Now rows …` -> `… seven Now entries (five rows) …`, `0025 AC-006: the protocol is version 9; …` -> `… version 10; …`. `testing/projects.ts` `SpecInput.updated` gives a Review plan its `Last updated`. The `now0026` tests strip file times so `no day` is testable; with file times the card's day is the file's day (A-007).

### T-006 — The ways as three radio lines

- **Covers:** AC-009, AC-010 (tag, checked, reset; CSS in T-008), AC-011
- **Files:** `src/webview/areas/planMap/Ways.tsx`, `src/shared/protocol/planMapTexts.ts`,
  `src/webview/areas/planMap/Ways0026.test.tsx`, `src/webview/areas/planMap/PlanMap.test.tsx`
- **Do:**
  - `planMapTexts.ts`: `WAYS[key].line` (§7's way sentences), `DEFAULT_WAY = 'sequence'`, `DEFAULT_TAG_TEXT` `default`,
    `wayLabel(key)` `<name> · default — <line>` / `<name> — <line>`; `WAYS[key].effect` keeps 0023's In sequence and
    Subagents effects, Other agents takes §7's new paragraph (for T-008).
  - `Ways.tsx` expanded body, in DOM order: `role="radiogroup"` named by the disclosure (`aria-labelledby`), three native
    `input type="radio"` of one `useId` name, labelled by `wayLabel()`, `checked` state beside 0025's lifted `open`
    (initial `DEFAULT_WAY`, kept across model updates and collapse, reset when `Ways` remounts: another spec or a new
    showing); a slot for T-008's `(?)`; the checked way's part: In sequence, Subagents — its stage prompt in `<code>`
    with secondary Copy prompt; Other agents — with `startLines` M-10 and the start lines with icon Copies, without them
    the stage prompt with Copy prompt. M-08 and the effects leave the visible body. No prose of the plan is read.
  - Tests: `Ways0026.test.tsx` "0026 AC-009 …" (structure, one checked, no M-08 or effect outside a toggletip region, no
    unchecked way's prompt in the DOM), "0026 AC-010 …" (closing lines of 0023 §5.1's form, none, prose with each way, two
    ways, a negation: In sequence tagged and checked, no `recommended`; another way checked survives an update; a remount
    checks In sequence again), "0026 AC-011 …" (both examples literally).
  - Retarget 0023 AC-009's expanded-block assertions in `PlanMap.test.tsx` (titles in `Notes:`).
- **Verify:** `npx vitest run src/webview/areas/planMap/Ways0026.test.tsx` red first (all three ways and M-08 rendered,
  no radios), then `npm run test:unit` green.
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — One coach line per view, and quiet Now rows

- **Covers:** AC-006, AC-023, AC-024
- **Files:** `src/webview/areas/overview/SpecRow.tsx`, `src/webview/areas/overview/Now.tsx`, `src/webview/ui/Toggletip.tsx`,
  `src/webview/ui/Toggletip.test.tsx`, `src/webview/coach0026.test.tsx`, `src/webview/primaryButtons.test.tsx`
- **Do:**
  - `SpecRow`: while `isSelectedSpec(selection, row.spec)` the row renders no `.ov-coach` and no `(?)`; step text and
    action unchanged. `Toggletip` gains `onLeaveWithFocus` (SendButton's pattern: on unmount with focus inside it, call
    it; its popup closes); `SpecRow` hands focus to the row's Copy prompt or the split button's main part.
  - `Now.tsx`: row 0 `copyLook 'secondary'`, and `StepAction` passes 0025 T-004's `look: 'secondary'` to `SendButton` for
    every Now row; later rows stay `icon`.
  - Tests: `coach0026.test.tsx` "0026 AC-006 …" (selected first-row spec: no coach, no `(?)`, identical step and action;
    another or none selected: shown; detail keeps its coach; focus on `(?)` when the selection moves: focus on the main
    part, no toggletip text), "0026 AC-023 …" (`showStepTips` true: NS-5 and 0028's all-ticked `In Progress` plan show
    `new chat · strong model, other family` as visible text in the detail after line 1, in 0025's map header and in the
    first Now row, before any `(?)`; once per view). AC-023 is expected green at once: negative control (coach rendered
    inside the toggletip region gives red). `primaryButtons.test.tsx` "0026 AC-024 …" (AC-024's example; U-08 none;
    zero-spec Copy apart; Board unchanged). `Toggletip.test.tsx` (the callback).
  - Retarget 0022 AC-011's "exactly two primary buttons" and 0024 *Place* "one primary control" tests (`Notes:`).
- **Verify:** `npx vitest run src/webview/coach0026.test.tsx src/webview/primaryButtons.test.tsx src/webview/ui/Toggletip.test.tsx`
  red first (coach shown while selected, primary first row), then `npm run test:unit` green.
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — About these ways, the tag's style, and focus

- **Covers:** AC-012, AC-013, AC-010 (CSS)
- **Files:** `src/webview/areas/planMap/Ways.tsx`, `src/shared/protocol/planMapTexts.ts`, `src/webview/main.css`,
  `src/webview/areas/planMap/WaysAbout0026.test.tsx`, `src/adapters/node/webviewCss.test.ts`
- **Do:**
  - `ABOUT_WAYS_LABEL` `About these ways`; `waysAbout()` gives §7's four paragraphs (M-08, `In sequence: ` + effect,
    `Subagents: ` + effect, Other agents' paragraph). `Ways` renders `Toggletip` in T-006's slot (one popup with 0021's
    toggletips and 0024's menu through `popup.ts`).
  - Focus: a model update that removes the block, a radio, the `(?)` or a part's Copy while it has focus hands it to the
    map heading (`requestMapFocus`, 0023 AC-012); a part change keeps focus on the radio; a kept block keeps `open` and
    the checked way.
  - CSS: `.plan-way-tag` and the radios' accent from theme variables only (`--vscode-radio-*`, `--vscode-focusBorder`,
    High Contrast `--vscode-contrastActiveBorder`); one line per way at wide width (`white-space`, no fixed width).
  - Tests: `WaysAbout0026.test.tsx` "0026 AC-012 …" (0021 AC-014's toggletip behaviours, paragraphs literally, no
    focusable element), "0026 AC-013 …"; `webviewCss.test.ts` "0026 AC-010 … tag" (a rule exists, theme variables only;
    a planted hex colour gives red).
- **Verify:** `npx vitest run src/webview/areas/planMap/WaysAbout0026.test.tsx src/adapters/node/webviewCss.test.ts` red
  first (no `(?)`, focus lost to `body`, no tag rule), then `npm run test:unit` green.
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — No writes, both modes, user language

- **Covers:** AC-014
- **Do:** tests only. `noWrite` tests (`core/board`, `core/copyNextStep`) "0026 AC-014 …": Send, both menu items, a radio,
  both `(?)`, `+ n more` create, change, move or delete no file and write no setting, also in Restricted Mode and a reader
  window (AC-001–AC-013 there: one representative assertion per criterion on the restricted world).
  `userLanguage.test.tsx` "0026 AC-014 …": the expanded ways (each way checked), the `(?)` text and the Now list hold no
  rule ID or internal word. A source scan: every §7 text comes from a text module (no literal in components). Each new
  test gets a negative control.
- **Verify:** `npx vitest run src/core/board/noWrite.test.ts src/core/copyNextStep/noWrite.test.ts src/webview/userLanguage.test.tsx src/adapters/node/sourceScan.test.ts`
  green; negative controls red, then restored.
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — Preview at two widths and three themes

- **Covers:** AC-017
- **Do:** the orchestrator's harness (`/home/claude/orch/preview/run.sh`): `fs110-parallel-synthetic` without notes and a
  project with eight Now entries; Dark, Light, High Contrast; 1600 px and 1000 px, side panel open at default width; the
  Overview with the first Now row selected and not; the Plan map with the ways expanded and each way checked. The
  reference height of 0023's block comes from the Baseline (`git archive <Baseline>` into a scratch folder, built there)
  or r05's about 400 px. Screenshots and verdict in `Notes:`.
- **Verify:** manual: the orchestrator, then Gregor, checks no cut short form, way line, tag or prompt, one line per way
  at 1600 px, the block at most half the reference height, the tag told apart in High Contrast without colour, a visible
  focus outline on radios and `(?)`, and arrow keys moving the checked radio. jsdom has no layout engine and does not
  move native radios by arrow key.
- [ ] **Verified (T-010):** —
- **Notes:** —

### T-011 — §5 notes, docs, title audit and final gates

- **Covers:** AC-015, AC-016, AC-002 (docs part), AC-018 (record), AC-019 (into the checklist); re-proves AC-001…AC-014,
  AC-020…AC-024
- **Do:**
  - §5's notes "*Amended by 0026 (PD-078 | PD-080 | PD-082): …*" under each statement, after 0025's and 0028's notes; no PD
    row.
  - `README.md`: Send paragraph (§7's sentence, no `the current chat otherwise`), coach line `current or new chat`, Board
    and Getting started without `**Next**` and `` `Plan · /sdd-plan` `` (`Write plan · /sdd-plan`), `Find blocker`,
    `Move back to Ready`, Now `at most five`, `About these ways`. `CHANGELOG.md` `[0.1.0]` the six strings of AC-016.
    `docs/release-checklist.md`: section 0026 with AC-017…AC-019 (AC-018 as run by 13); 0024 AC-017's line without
    `stays the default target`. `docs/product/design-brief.md` without `("Next", short form`.
  - `docsScan.test.ts` "0026 AC-016 …" and "0026 AC-002 … docs"; retarget the 0017 README and 0024 checklist assertions.
  - Title audit by 0021's method (`describe`/`it`/`test` literals under `src`, Baseline by `git archive`): every missing
    title in `Notes:` with the changed statement or the replacing head title.
  - `/sdd-architecture-update` entries: `.architecture/core.md` `assistant` line ("default target new chat for every
    step"), `overview` line ("Now: at most five rows, `+ n more`"); `.architecture/webview.md` areas line (ways: radio
    group, `About these ways`), `board/`/`detail/` line (cards and rows: short form after a visually hidden
    `Next step: `), `ui/` line (`Toggletip` hands focus on leaving; Send menu items `menuitemradio`). `AGENTS.md`
    snapshot unchanged (no module added, moved or removed).
  - Memory Bank: `techContext.md` *Test* line for 0026 (`WORDING_0026`, `now0026`, `Ways0026`), `activeContext.md`.
- **Verify:** quality gates 1–5 in order, zero warnings; `npm test` on Windows and CI by the orchestrator, result here.
- [ ] **Verified (T-011):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | — | — | open |
| AC-002 | T-002, T-011 | — | — | open |
| AC-003 | T-003 | — | — | open |
| AC-004 | T-003 | — | — | open |
| AC-005 | T-004 | — | — | open |
| AC-006 | T-007 | — | — | open |
| AC-007 | T-005 | — | — | open |
| AC-008 | T-005 | — | — | open |
| AC-009 | T-006 | — | — | open |
| AC-010 | T-006, T-008 | — | — | open |
| AC-011 | T-006 | — | — | open |
| AC-012 | T-008 | — | — | open |
| AC-013 | T-008 | — | — | open |
| AC-014 | T-009 | — | — | open |
| AC-015 | T-011 | — | — | open |
| AC-016 | T-011 | — | — | open |
| AC-017 | T-010 | — | manual: orchestrator, preview harness, then Gregor | open |
| AC-018 | T-011 (record) | — | manual: Gregor, click test 2026-11-19 (13), tasks 1–3 | open |
| AC-019 | T-011 (checklist) | — | manual: Gregor on `tip-splitter`, before the spec closes | open |
| AC-020 | T-001 | — | — | open |
| AC-021 | T-002, T-011 | — | — | open |
| AC-022 | T-001 | — | — | open |
| AC-023 | T-007 | — | — | open |
| AC-024 | T-007 | — | — | open |

## Session handoff

- **Done so far:** plan written; spec revised (AC-021, AC-024, §10, `**Plan:**` link), 2026-11-19.
- **Next action:** review the plan; after 0028 and 0025 are done, on the start signal move the pair to `active/`
  (`/sdd-lifecycle`), set the Baseline, then T-001.
- **Open decisions:** — (AC-019's draft check in Copilot's `newChat` is untested, V-3 C4; if it fails, Gregor decides, 09 §3)
- **Baseline:** `657e87a`
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
