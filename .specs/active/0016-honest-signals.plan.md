# Plan — Honest Signals: Diagnostics in Three Tiers, User Language, Readiness as a Need

**Spec:** [0016-honest-signals.md](0016-honest-signals.md)
**Status:** In Progress
**Last updated:** 2026-11-17
**Current step:** T-007

## Approach

The tier goes into the core first, where each finding is made: `Diagnostic` gets a required
`tier` (`problem` | `note`), each emission site sets it per §6.1, and a *compatibility* finding is
not emitted at all. The webview never decides a tier. Then R-6 and the counts on this repository,
then each surface in turn (card, attention and header → detail and banner → needs), then the
texts (rule IDs into tooltips, the S2 sentence, times and history), then docs and the test-title
audit. The read-baseline snapshot (AC-003) is written **before any code change** in T-001, so it
is the Baseline's read result. Copy feedback (T-002) is a reusable `ui/CopyButton` that 0017 puts
on cards and rows. The drop result only gets its button styles: §4 gives the board status line to
0017, which removes it (PD-060). Nothing here builds what 0017–0020 remove. Ten steps, because
the spec has 25 criteria over six surfaces; no step has more than five. Test review once per
stage, from the tests listed in each `Do:` (AGENTS.md *TDD*). Memory Bank: `techContext.md`,
`systemPatterns.md`, `activeContext.md` (T-010).

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (T-007, T-010) ·
`npm run compile-tests` (T-004, T-010: the host smoke compiles). Pre-done gate on Windows and CI:
`npm test`.

## Research

- **Survey (2026-11-17, at `f6d53c5`).** Findings are emitted in `src/core/specs/{files,parseSpec,
  parsePlan,planSteps,leadingIds,returnNote,version,readProject}.ts`; contradictions in
  `src/core/lifecycle/entryContext.ts`. `kind` spans tiers: `duplicate` (stem or number in
  `readProject.ts` → Problem; ID twice in `leadingIds.ts`, step twice in `planSteps.ts` → note),
  `unknown-content` (status values in `parseSpec.ts`, `parsePlan.ts`, `returnNote.ts` → Problem;
  the rest → note). Consumers: `readiness.ts` `hasProblem` (every `duplicate`, ID twice included),
  `attention.ts`, `specFigures.projectHeader`, `cards.ts` (`diagnostics` count, `buildBanner`),
  `core/board/detail.ts`, `nextStep.ts` (contradiction kind, unchanged). Successor:
  `successor.ts` and `detail.ts` `headerLines` read `unsupportedHeaderLines`, so it shows twice
  today; once Successor is a known header line, the detail shows it once through
  `overview.successor` with no change to `detail.ts`. About 38 exact diagnostic expectations in
  11 test files under `src/core/` gain `tier`. Tests are also registered outside `*.test.ts`, in
  `src/core/runtime/testing/{contract,contractWriter,contractFaults}.ts`. Host smoke reads only
  columns, card stems, attention reasons and header name (`src/test/*.smoke.test.ts`), so no
  host test breaks. The protocol stays version 1: nothing is published (PD-058).
- **Re-measured (throwaway bundle of `readProject` + `deriveLifecycle`, `/tmp`, 2026-11-17).**
  `git archive 8052f9a .specs` and the head: 83 findings (14 `duplicate`, 69 `unknown-content`)
  on 15 of 15 specs, per spec as in §6.1 (0010: 29 → 28 after its Successor line). The nine
  fixtures classify exactly as §6.1 says. Snapshot size of the nine reads: about 300 KB of JSON.
- **Readings and proxy decisions (Gregor delegated; audit 05, PD-058…PD-062, ux-guidelines).**
  PD-063 records the product-visible ones (Q-2…Q-6) with §11's proxies.
  - Q-1 The drop result gets only the primary Copy and the secondary Dismiss style (AC-017). Its
    label feedback is not built: §4 gives the status line to 0017, which removes it (PD-060).
    AC-018 and AC-019 are decided on the detail's Copy.
  - Q-2 Tooltip of a history entry: `<stored time> · rule <rule> · <paths, comma-separated>`;
    a part with no value is left out (§6.4 names what it holds, not how).
  - Q-3 A `**Successor:**` line of a spec that is not Deprecated is read and shown nowhere. A
    Deprecated spec shows its successor once, as today's successor line (§6.2).
  - Q-4 A sibling plan that cannot be read gives no R-4 need: its Problem says why (§6.3: "their
    cases show as a Problem"). A placeholder Status (`—`) counts as no status.
  - Q-5 The T-07 toggle is collapsed every time a detail or the banner is shown, and nothing
    remembers it. Format notes list reason only, with no Open file: 0013 AC-013 has no Open file
    per diagnostic.
  - Q-6 Banner region name: T-06 while project-level Problems exist, otherwise T-07's text.
  - Q-7 Tooltips use the native `title` attribute, as the progress formula does today. Rule IDs
    are supplementary and the visible sentence carries the meaning (guideline 6). The Copy
    tooltip repeats what the live region announces.
  - Q-8 Copy keeps its size with `min-width: 14ch` on a content-box button (no global
    `box-sizing`; VS Code fonts are system fonts, so `ch` does not shift on a font swap). If the
    AC-025 screenshots still show a shift, a grid stack of the three labels is the fallback.
  - Q-9 `Yesterday` is decided by the local calendar day, not by 24 hours.
  - Q-10 AC-021's search leaves out `*.test.ts(x)` files and `testing/` folders ("without test
    files").
  - Q-11 Model texts nothing shows stay as they are: the R-6 and R-7 reasons and
    `COMPILE_VERDICT_TEXT` (AC-013; §4 excludes rewording reasons). README screenshots are not
    redone, because 0017–0020 reshape the same views.
  - Q-12 The read baseline is JSON per fixture under `test/fixtures/read-baseline/`
    (`-text`, so the bytes match on every platform). It holds `ProjectRead` without `root`,
    `modifiedMs` and `size`, written once at the Baseline by a script outside the repository.
- No `done/` spec becomes `Deprecated`. 0002–0007 and 0013–0015 get amendment notes, as 0015 did
  (§5).
- **Checkpoint digest:** survey and spec agree, so there is no spec defect. No question needs
  Gregor, and none goes to him (standing answers). No new dependency.
- [VS Code Theme Color reference](https://code.visualstudio.com/api/references/theme-color):
  `button.background`/`foreground`/`hoverBackground` for standard buttons,
  `button.secondaryBackground`/`secondaryForeground`/`secondaryHoverBackground` for secondary
  ones. Retrieved 2026-11-17.
- [VS Code Webview API](https://code.visualstudio.com/api/extension-guides/webview): a colour ID
  becomes `--vscode-<id with . → ->`; the body classes are `vscode-light`/`-dark`/`-high-contrast`.
  Retrieved 2026-11-17.
- [WCAG 2.2 Technique ARIA22](https://w3.org/WAI/WCAG22/Techniques/aria/ARIA22): the `status`
  container exists before the message; implicit `aria-live="polite"`; add `aria-atomic="true"`
  explicitly. Retrieved 2026-11-17.
- [WAI-ARIA APG Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/): a button with
  `aria-expanded`, optional `aria-controls`; Enter and Space toggle. This is the shape of T-07.
  Retrieved 2026-11-17.
- [VS Code UX guidelines: Views](https://code.visualstudio.com/api/ux-guidelines/views): welcome
  views support links, should keep buttons few and content short. T-20 is one sentence.
  Retrieved 2026-11-17.
- [Cloud Four: layout shifts with `ch`](https://cloudfour.com/thinks/watch-out-for-layout-shifts-with-ch-units/)
  and [CSS grid stacks](https://www.hsablonniere.com/prevent-layout-shifts-with-css-grid-stacks--qcj5jo/):
  `ch` moves only when the font swaps; a grid stack sizes the button to its widest label (Q-8).
  Retrieved 2026-11-17.
- [Inclusive Components: tooltips](https://inclusive-components.design/tooltips-toggletips/):
  `title` is not shown on focus and screen readers support it unevenly. That is why the sentence
  stays visible and only IDs go into the tooltip (Q-7). Retrieved 2026-11-17.
- [Vitest `vi` API](https://vitest.dev/api/vi.html), repo version 5.1.0: `useFakeTimers` fakes
  `Date` and `setTimeout`, `setSystemTime` sets the clock, `advanceTimersByTime` runs the 2 s
  timer. Used by AC-015 and AC-018. Retrieved 2026-11-17.

## Stages

1. T-001 ‖ T-002 — independent: tiers in the spec repository ‖ Copy confirms at the button
2. T-003 → T-004 → T-005 → T-006 — R-6 and this repo's counts; Problems on card, attention and header; detail and banner; needs
3. T-007 → T-008 — user language: rule IDs into tooltips and the S2 sentence; times and history
4. T-009 → T-010 — old texts gone, amendments, product docs; test-title audit, sync, final gates

Parallel: stage 1. T-001 touches only `src/core/**` and `test/fixtures/**`; T-002 touches only
`src/webview/**`, `src/shared/protocol/nextStepTexts.ts` and `src/adapters/node/webviewCss.test.ts`.
Recommended: in sequence, since both steps are small. No other stage can run in parallel:
everything after T-002 shares the text modules, `main.css` or `SpecDetail.tsx` and its test.

## Steps

### T-001 — Tier every finding and accept the Successor line

- **Covers:** AC-001 (every §6.1 row except the lifecycle contradiction), AC-002, AC-003
- **Files:** `src/core/specs/{diagnostics,files,parseSpec,parsePlan,planSteps,leadingIds,returnNote,version,readProject}.ts`,
  `src/core/lifecycle/successor.ts`, new `src/core/specs/{tiers,readBaseline}.test.ts`, new
  `src/core/specs/testing/readSnapshot.ts`, new `test/fixtures/read-baseline/*.json`; existing tests
  and `testing/` helpers under `src/core/**` whose diagnostic expectations gain `tier`
- **Do:** (1) **Before any code change:** `readSnapshot(read)` = `ProjectRead` without `root`,
  `modifiedMs`, `size`. A throwaway script outside the repo bundles it with `readProject` and the
  Node spec source (repo esbuild) and writes `test/fixtures/read-baseline/<fixture>.json` for the
  nine §6.1 fixtures (the version discovery reports: from each `AGENTS.md`, `unknown` for the
  legacy one); record the commit in Notes. Add `readBaseline.test.ts` (AC-003): the current read must equal its JSON, minus `tier`
  and minus an absent `successor` field. For `fs110-ready-synthetic` only: the baseline's Successor
  entry in `unsupportedHeaderLines` and its diagnostic, and the read's `successor` field, are left
  out. Green before the change, with a negative control (one changed reason fails). (2)
  `DiagnosticTier` and a required `tier` in `diagnostics.ts`; each push site sets it per §6.1.
  `parseSpec.ts` adds `Successor` to the known labels (field `successor`; a second one is a
  repeated-header note), and `successor.ts` reads that field (the body-line fallback stays).
  `readProject.ts`: a sibling plan in `backlog/` or `active/` whose stem matches no spec gets no
  orphan and no dangling Spec link. A sibling plan's dangling Spec link is a Problem while a spec
  has its stem, otherwise (done/) a note. An archived orphan plan is a note. (3) Test-first
  `tiers.test.ts` on memory sources, one `it` per §6.1 row (14 rows), each naming its row and
  asserting tier and count. AC-002 in `parseSpec.test.ts`, `successor.test.ts` and
  `core/board/detail.test.ts`: no diagnostic, the model takes the link, the detail shows it once
  with no Successor header line. Existing expectations gain `tier`. Tests whose criterion §5
  changes (orphan plan in backlog/active, Successor as unsupported) are rewritten under new titles.
- **Verify:** `npx vitest run --project node src/core` red (missing `tier`, the Successor row)
  then green; `npx eslint src --max-warnings 0`; `npx tsc --noEmit`
- [x] **Verified (T-001):** 2026-11-17 — red: `npx vitest run --project node src/core/specs/tiers.test.ts` with the production files stashed: 14 failed (missing `tier`, Successor row, abandoned plan rows), 1 control green; green after the change: 15 passed. `readBaseline.test.ts` green before the change (10 passed incl. negative control) and after. `npx vitest run --project node src/core`: 1193 passed. Gates 1–4: eslint 0 warnings, tsc x2 clean, `npm run test:unit`: 1718 passed + 3 skipped, timing 12 (before: 1688 + 3, 12).
- **Notes:** Baseline snapshot written at `3946b2c` (code = `3cdab90`) by `/home/claude/orch/s35/baseline.ts` outside the repo. `readSnapshot` (helper in `testing/`) keeps `version` and the three entry lists without `modifiedMs`/`size`, plus diagnostics. Tests rewritten under new titles (§5): readProject AC-006 (orphan plan), cards AC-020, specFigures AC-017 (now an archived orphan plan). Proxy: the `ContradictionDiagnostic` tier stays for T-003 as the plan says; `successor` is a `HeaderField` on `ParsedSpec`; an empty `**Successor:**` line still gives 'not available' as before.

### T-002 — Copy is primary and confirms at the button

- **Covers:** AC-017, AC-018, AC-019
- **Files:** new `src/webview/ui/{CopyButton.tsx,CopyButton.test.tsx}`, `src/webview/detail/NextStep.tsx`,
  `src/webview/board/Announcer.tsx`, `src/shared/protocol/nextStepTexts.ts`, `src/webview/main.css`,
  `src/adapters/node/webviewCss.test.ts`, `src/webview/detail/SpecDetail.test.tsx`
- **Do:** `CopyButton { line, copyResult, onCopy }` keeps its own state. Activation sends
  `onCopy(line)` and restarts a 2 s timer, which is cleared on unmount. The next `copyResult`
  object that arrives after activation sets the label (`Copied` / `Could not copy`, new constants
  in `nextStepTexts.ts`), the `title` (the old sentence) and a visually hidden
  `role="status" aria-live="polite" aria-atomic="true"` span beside the button. The accessible
  name is `<label>: <line>` throughout. After 2 s the label is `Copy` again and the tooltip is
  what it was before. `NextStep.tsx` uses it (keyed by line) and loses its `.detail-status` line.
  `Announcer.tsx` (the drop result): Copy gets class `copy-button`, Dismiss `secondary-button`,
  and its text stays as it is (Q-1). `main.css`: `.copy-button` uses the primary button colours
  and hover, `min-width: 14ch`, centred text, and no outline of its own; `.secondary-button` uses
  the secondary pair; a generic `.visually-hidden`; no state style and no error colour. Test-first:
  `CopyButton.test.tsx` covers the AC-018 cases on fake timers (pointer, Enter, Space, success,
  failure, re-activation at 1.5 s) and AC-019 (a `MutationObserver` over the mounted
  `SpecDetail`: every mutation lies inside the activated button or its live region; negative
  control with an added sibling). `webviewCss.test.ts` checks AC-017 colours (detail and drop
  result classes asserted in component tests) and AC-019's `min-width ≥ 14ch` with no
  `errorForeground` in copy rules. The 0015 copy tests in `SpecDetail.test.tsx` activate first and
  then read label and live region.
- **Verify:** `npx vitest run --project webview src/webview/ui src/webview/detail src/webview/board`
  and `npx vitest run --project node src/adapters/node/webviewCss.test.ts` red then green;
  `npx eslint src --max-warnings 0`; `npx tsc --noEmit -p src/webview`. Stage end: gates 1–4
  once on the combined result.
- [x] **Verified (T-002):** 2026-11-17 — red: `npx vitest run --project webview src/webview/ui/CopyButton.test.tsx` against the `Not implemented` stub: 10 failed (AC-018 cases; AC-019 not reached), then green: CopyButton.test.tsx 12 passed incl. the MutationObserver control; `SpecDetail.test.tsx` and `Keyboard.test.tsx` green after the activate-first rewrite; `webviewCss.test.ts` 5 new guards green. Gates 1–4 on the combined stage 1: eslint 0, tsc x2 clean, `npm run test:unit` 1736 passed + 3 skipped, timing 12.
- **Notes:** `CopyButton` clears its feedback when `copyResult` becomes undefined (another spec shown), so 0015's 'status goes away' test stays. `.detail-status` stays for DetailSection's open-file result (outside Copy). `box-sizing: content-box` is set explicitly on `.copy-button` because buttons are border-box by default. Added `COPIED_LABEL`, `COPY_FAILED_LABEL` to `nextStepTexts.ts`; tests asserted literally.

### T-003 — Problems decide R-6; this repository shows none

- **Covers:** AC-001 (lifecycle contradiction row), AC-004, AC-005, AC-010
- **Do:** `ContradictionDiagnostic` gets `tier: 'problem'` (`lifecycle/model.ts`,
  `entryContext.ts`). `readiness.ts` R-6 fails exactly when an entry diagnostic is a Problem
  (spec, plans, archived plans, return notes, contradictions). New fixture
  `test/fixtures/repo-8052f9a/` = `git archive 8052f9a .specs`, untrimmed and not in
  `.vscode-test.mjs`. Test-first in new `src/core/lifecycle/problems.test.ts`: the contradiction
  row; AC-010's Given (Ready with two notes) and controls (a Problem on an archived plan or on a
  return note fails R-6); AC-004 (0 Problems, 78 notes, §6.1's count per spec, nothing for the five
  Successor lines); AC-005 (this repository's `.specs/` from `process.cwd()`, no Problem; negative
  control: a temp copy with a broken Plan link has one). Contradiction expectations in
  `deriveLifecycle.rules.test.ts` gain `tier`.
- **Verify:** the new tests red (AC-010: an ID twice fails R-6; the contradiction has no tier),
  then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-17 — red: `npx vitest run --project node src/core/lifecycle/problems.test.ts`: 5 failed (contradiction has no tier; AC-010 an ID twice fails R-6 (`R-6` in failing); archived-plan and return-note Problem controls did not fail R-6), 5 already green (AC-004 and AC-005 follow from T-001's tiers); green after: 10 passed. Gates 1–4: eslint 0, tsc x2 clean, `npm run test:unit` 1746 passed + 3 skipped, timing 12.
- **Notes:** `hasProblem` is now exactly 'a contradiction or any own diagnostic with tier problem'; the two readability conditions went (an unreadable file always carries its Problem). Consequence: a dangling Plan link or a sibling plan's dangling Spec link now fails R-6 (§5). Two test helpers changed for it: `planText` default Spec line is now `—` (was a dangling `[spec](spec.md)`), and the 0003 AC-004 R-3 test gives its linked 'other' plan an existing file so the link is not dangling; its title and expectation stay. Fixture `test/fixtures/repo-8052f9a` is `git archive 8052f9a .specs` (35 files), not in `.vscode-test.mjs`.

### T-004 — Problems on the card, in Needs attention and in the header

- **Covers:** AC-006 (card, attention row), AC-007 (card, attention, header), AC-008
- **Do:** Core: `cards.ts` card `problems` (the entry's Problems) and `projectFindings(project)`
  → `{ problems, notes }` of the findings no spec owns, together with scope `project`.
  `attention.ts` gives reason `Problem` when the entry carries a Problem.
  `specFigures.projectHeader` gives `problems` (Problems on specs plus project level) and
  `problemStems`. Contracts and guards: `src/shared/protocol/board.ts` (`CardView.problems`) and
  `missionControl.ts` (`McHeader.problems`, `problemStems`; `AttentionReason` `Problem`). Texts
  T-01, T-03, T-04, T-05 (`texts.ts`, `areas/missionControl/{texts,requests}.ts`). Webview:
  `Card.tsx` shows the warning badge only while problems > 0; `Header.tsx` shows the T-01 drill
  only while n > 0 and sends the set `Problems`; `Attention.tsx` maps the glyph. Tests:
  `cards.test.ts`, `attention.test.ts`, `specFigures.test.ts` (AC-006 Given on `fs-broken`: 0003
  `1 problem` and reason `Problem`; a spec with notes only shows nothing), `missionControl.test.ts`
  guards, `SpecBoard.test.tsx`, `MissionControl.test.tsx`, `Drilldown.test.tsx` (one request; none
  at 0), `Sections.test.tsx`. Host smoke (CI): one test in `src/test/missionControl.smoke.test.ts`
  checks that the fixture's header has `problems` 0 and its card none.
- **Verify:** the new and changed tests red then green; gates 1–4; `npm run compile-tests`
- [x] **Verified (T-004):** 2026-11-17 — red: `npx vitest run --project node src/core/board/cards.test.ts src/core/missionControl` before the production change: 13 failed (no `problems`, `problemStems`, reason `Problem`); green after. Webview `Drilldown`, `MissionControl`, `Sections`, `SpecBoard` tests rewritten for T-01/T-03/T-04/T-05 and green. Gates 1–4 + `npm run compile-tests`: eslint 0, tsc x2 clean, `npm run test:unit` 1754 passed + 3 skipped, timing 12. Host smoke test added (CI only, not run here).
- **Notes:** Proxy decision: when only project-level Problems exist (`problemStems` empty) the header drill sends `{ area: 'specBoard' }` with no named set (an empty set would hide every card; AC-008 says the drill opens the board whose banner lists them). `problems` in the header counts distinct Problem diagnostics (key file|line|reason) over all entries plus project-level ones. `projectFindings` added next to `buildBanner` (banner contract changes in T-005). Unknown header lines are notes, so the old 'Unknown' test kind no longer counts as a Problem: tests adapted. The drill id is now `problems`. `.card-diagnostics` CSS class renamed `.card-problems`, data-reason-kind `Problem`.

### T-005 — Detail and banner: Problems below Next step, format notes collapsed

- **Covers:** AC-006 (detail), AC-007 (detail), AC-009, AC-016, AC-022
- **Do:** `core/board/detail.ts`: `DetailView.problems` (each with reason and open target) and
  `overview.notes`, in place of `overview.diagnostics`. `buildBanner` → `{ problems, notes }` from
  `projectFindings`. `idText.withoutLeadingId` keeps an opening `**`, `__` or `***` that also
  encloses the title around the title (`**AC-001 — T**` → `**T**`), so `**AC-001** — text` reads
  as before. Contracts: `detail.ts`, and `board.ts` banner. Texts T-06, T-07, T-18 (`texts.ts`,
  `nextStepTexts.ts`). New `src/webview/ui/FormatNotes.tsx`: a disclosure button with T-07,
  `aria-expanded`, `aria-controls` and a hidden list, collapsed when shown (Q-5). `SpecDetail.tsx`
  puts a `detail-problems` list with the warning icon between Next step and the sections, and
  FormatNotes in Overview. `Banner.tsx`: T-06 list and FormatNotes, nothing while both are empty
  (Q-6). `main.css` for both. Tests: `detail.test.ts` (split; NS-1; AC-016 on `fs170` 0003),
  `idText.test.ts` (three emphasis forms, the bold-ID form unchanged), `cards.test.ts` (banner
  split), board guard test, `SpecDetail.test.tsx` (AC-006 Given detail part, toggle by pointer,
  Tab+Enter and Space, `<strong>` title with no `*`), `SpecBoard.test.tsx` (banner).
- **Verify:** the new and changed tests red then green; gates 1–4
- [x] **Verified (T-005):** 2026-11-17 — red (core): `npx vitest run --project node src/core/board` before the change: 13 failed (no `problems`/`notes`, banner not split, emphasis cases and fs170 0003 AC-001 kept a stray `**`); green after. Webview `SpecDetail`, `SpecBoard` (banner), `FormatNotes` cases were written with the component (no separate red run; negative controls: no toggle at 0 notes, no list without Problems, collapsed again on another spec). Gates 1–4: eslint 0, tsc x2 clean, `npm run test:unit` 1774 passed + 3 skipped, timing 12.
- **Notes:** Q-5/Q-6 as planned. `DetailView.problems` sits on the spec view (not in `sections`), `overview.diagnostics` became `overview.notes`; the Problems list has no Open file (guideline 5 keeps IDs and Open for sections). `buildBanner` returns `{ problems, notes }` and the board guard rejects the old array. The banner keeps the warning frame only while Problems exist; a notes-only banner is neutral and named by T-07. Emphasis fix lives in `idText.enclosingEmphasis`: the marker stays only when it does not close right after the ID (colon allowed). Not added: a guard test for `isDetailView` (none existed).

### T-006 — Backlog shows needs; permanent absences go

- **Covers:** AC-013, AC-014
- **Do:** New pure `src/core/board/needs.ts` `needsOf(project, entry)`: for state Backlog only,
  §6.3's rows in order, each `{ text, rule }`, with Q-4. `cards.ts` gives `need` (the first) in
  place of `readiness`; `detail.ts` gives `overview.needs` in place of `readiness`, and
  `verification` loses `compileVerdict`. Contracts `board.ts` and `detail.ts`. Texts T-11 and T-12
  (`needTooltip`); `PRIORITY_TEXT` is removed. Webview: `Card.tsx` shows a `card-need` line (text
  with `title`, no icon); `SpecDetail.tsx` shows a `detail-needs` list and drops the Priority line,
  the verdict line and the readiness checklist. `main.css` drops the `.detail-checks` rules.
  Tests: new `needs.test.ts` (five needs, order, none outside Backlog, Q-4, AC-014 Given `fs170`
  0003 → `needs a plan`), `cards.test.ts`, `detail.test.ts`, `SpecBoard.test.tsx`,
  `SpecDetail.test.tsx` (no checklist, no failure icon, none of T-13's lines). The lifecycle tests
  of R-7 and the verdict fact stay green unchanged (AC-013).
- **Verify:** the new and changed tests red then green; gates 1–4
- [x] **Verified (T-006):** 2026-11-17 — red: `npx vitest run --project node src/core/board/needs.test.ts` against the `Not implemented` stub: 13 failed; green after: 13 passed. cards/detail/SpecBoard/SpecDetail/boardFilter tests rewritten for `need`/`needs` (no checklist, no verdict, no priority; tooltips literal). Resumed after a session restart: working tree and gates re-checked. Gates 1–4: eslint 0, tsc x2 clean, `npm run test:unit` 1788 passed + 3 skipped, timing 12.
- **Notes:** `needsOf` reads R-2/R-3/R-4 failures from the model and the sibling plan; unreadable plan or spec gives none (Q-4). Card shows `.card-need` (was `.card-readiness`), detail `.detail-needs`; `.detail-checks` CSS removed, `PRIORITY_TEXT` removed. The model's R-7 reason and verdict fact stay (AC-013). Rule IDs in the need tooltip use `needTooltip` (T-12).

### T-007 — Rule IDs into tooltips; S2 says what Set up does

- **Covers:** AC-011 (rule IDs and "persisted"), AC-012, AC-020
- **Do:** `texts.ts`: `DERIVED_SENTENCES` become T-09, plus `derivedTooltip(rule)` (T-08) and
  `persistedTooltip(rule)` (T-10). `RuleText` becomes `{ text, tooltip }` and renders the sentence
  with `title`. It is used on the card, the Spec Explorer row, the Mission Control tile (`mcDerived`)
  and the detail's State fact, where a persisted state shows nothing visible and its chip gets the
  T-10 `title`. The `.rule-id` rules leave `main.css`. S2: `panelStateLines` adds T-20 after the
  S2 line, `S2_WELCOME` gets it as the second line, and `package.json` `viewsWelcome` follows.
  Tests: `RuleText.test.tsx`, `SpecBoard.test.tsx`, `areas.test.tsx`, `MissionControl.test.tsx`,
  `SpecDetail.test.tsx` (visible text holds no rule ID or "persisted"; each tooltip literal),
  `webviewBundle.test.ts` (Ready card sentence), `panelStateTexts.test.ts`, `PanelStateView.test.tsx`
  (T-20 between the line and Set up), `manifest.test.ts` (`viewsWelcome` equals `S2_WELCOME`).
- **Verify:** the changed tests red then green; gates 1–5
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Times and status history as sentences

- **Covers:** AC-011 (complete), AC-015
- **Do:** `texts.ts`: pure `whenText(iso, now)` (`Today HH:MM`, `Yesterday HH:MM` by calendar
  day as in Q-9, else `YYYY-MM-DD HH:MM`; an unparsable value as stored), `updatedText` (T-02),
  `historyEntryText(item, now)` (T-14 with §6.4's four forms and the flow suffix),
  `historyTooltip(item)` (Q-2), T-15, T-16. `HISTORY_LABEL` in `lifecycle/statusHistory.ts` takes
  T-15 from `texts.ts`. `core/board/detail.ts` gives each history item a structured `cause`
  (`kind`, `paths`); contract `detail.ts` follows. Webview: the `SpecDetail.tsx` history uses the
  entry text with `title`; Mission Control's header shows T-02, activity shows T-17 and the gone
  form T-16 (`areas/missionControl/{texts,format,Header,Activity}`), all computed at render.
  Tests: `texts` unit tests on fake timers (today, yesterday, older, unparsable, across midnight),
  `detail.test.ts`, `statusHistory.test.ts` (label), `SpecDetail.test.tsx` (AC-015 Given, tooltip),
  `MissionControl.test.tsx`, `Sections.test.tsx`. New `src/webview/userLanguage.test.tsx`
  (AC-011) mounts card, row, Mission Control, banner and detail over views that cover every
  state, cause and flow marker, and checks that the visible text holds no `S-…`, `R-1`…`R-7`,
  `NS-…`, "persisted", "Model updated", "first observed" or "not checked". Negative control:
  today's history line is caught.
- **Verify:** the new and changed tests red then green; gates 1–4
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Old texts gone; amendments and product docs

- **Covers:** AC-021, AC-024
- **Do:** `src/adapters/node/sourceScan.test.ts` gets the AC-021 search over `src/shared` and
  `src/webview` (Q-10) for the eight strings, plus a negative control: the search finds
  `verdict: not available` and `Inter-spec dependencies` in `src/core`. Write the §5 notes into
  0002, 0003, 0005, 0006, 0007, 0013, 0014 and 0015 at the named statements, worded as §5
  prescribes ("*Amended by 0016 (PD-059, proxy): …*"). Add PD-063 to
  `docs/product/product-decisions.md`: §11's proxies A-001, A-002, A-005…A-007 and Q-2…Q-6; it
  supersedes the §5 PD rows and refines PD-059; no older entry gets a note. `README.md`: header, card and rule-ID sentences follow §6–§7, plus the one sentence
  that FeatherSpec has no priority, persisted compile verdict or dependency field, so the Studio
  shows none. `CHANGELOG.md` names the changes under *Unreleased*. `docs/release-checklist.md`
  gets a 0016 section with AC-025.
- **Verify:** `npx vitest run --project node src/adapters/node/sourceScan.test.ts src/adapters/node/docsScan.test.ts`
  green, with the negative control failing when its term is removed;
  `ls .specs/*/00{02,03,05,06,07,13,14,15}-*.md | grep -v '\.plan\.md$' | xargs grep -c "Amended by 0016"`
  ≥ 1 for each of the eight specs; gates 1–4
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — Test-title audit, Memory Bank, architecture, final gates

- **Covers:** AC-023, AC-025; re-proves AC-001…AC-024 through the gates
- **Do:** A throwaway script outside the repo extracts the `it`/`test`/`describe` title literals
  (`.each` included) of every `src/**/*.ts(x)` file at the Baseline and at the head, through
  `git show`, so the runtime contract suites in `src/core/runtime/testing/*.ts` count too. Write
  `## Test-title audit` into this plan: counts, and every missing or renamed title with the §5
  row or head title that replaces it. Sync: `techContext.md` *Test* gets a 0016 line (read
  baseline, `repo-8052f9a`, own-repo check, the AC-011 sweep); `systemPatterns.md` gets dated
  decisions (tier set at emission, compatibility never emitted; needs in `core/board`; Copy
  feedback at the button); `activeContext.md`. Architecture, exactly these entries: the `AGENTS.md`
  snapshot's `# last reconciled:` date, the `src/core/<area>` line ("specs 0002 (+ diagnostic tiers
  0016)", "board 0007 (+ next step 0015, needs 0016)"), the `src/shared` line (adds 0016);
  `.architecture/core.md` specs and board lines; `.architecture/webview.md` `ui/` line ("copy
  button, format-note toggle (0016)"). AC-025: preview harness screenshots
  (`/home/claude/orch/preview/run.sh`) in Dark, Light and High Contrast.
- **Verify:** the audit script gives the counts the audit states; gates 1–5 and
  `npm run compile-tests`; `npm test` on Windows and CI (pre-done gate, Gregor); manual: AC-025.
  The panel screenshots are taken by the agent with the harness. The S2 sentence in the Activity
  Bar view and the Hands-On on `tip-splitter` are Gregor's, because neither a look nor a native
  VS Code view can be checked by a command here.
- [ ] **Verified (T-010):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-003 | `src/core/specs/{files,parseSpec,parsePlan,planSteps,leadingIds,returnNote,version,readProject}.ts` (tier at each push), `src/core/lifecycle/entryContext.ts` | `src/core/specs/tiers.test.ts`, `src/core/lifecycle/problems.test.ts` | verified |
| AC-002 | T-001 | `src/core/specs/parseSpec.ts`:parseSpec, `src/core/lifecycle/successor.ts`:readSuccessor | `parseSpec.test.ts`, `successor.test.ts`, `core/board/detail.test.ts` (AC-002) | verified |
| AC-003 | T-001 | `src/core/specs/testing/readSnapshot.ts`, `test/fixtures/read-baseline/*.json` | `src/core/specs/readBaseline.test.ts` | verified |
| AC-004 | T-003 | `src/core/specs/*` tiers, `test/fixtures/repo-8052f9a` | `src/core/lifecycle/problems.test.ts` (AC-004) | verified |
| AC-005 | T-003 | `src/core/lifecycle/readiness.ts`:hasProblem | `src/core/lifecycle/problems.test.ts` (AC-005) | verified |
| AC-006 | T-004, T-005 | `src/core/board/cards.ts`:buildCards, `src/core/board/detail.ts`, `src/core/missionControl/attention.ts`, `src/webview/board/Card.tsx`, `src/webview/detail/SpecDetail.tsx` | `cards.test.ts`, `detail.test.ts`, `attention.test.ts`, `SpecBoard.test.tsx`, `SpecDetail.test.tsx` | verified |
| AC-007 | T-004, T-005 | `src/webview/ui/FormatNotes.tsx`, `src/core/board/cards.ts` | `SpecDetail.test.tsx` (toggle), `cards.test.ts`, `attention.test.ts` | verified |
| AC-008 | T-004 | `src/core/missionControl/specFigures.ts`:projectHeader, `src/webview/areas/missionControl/{Header.tsx,requests.ts}` | `specFigures.test.ts`, `Drilldown.test.tsx`, `MissionControl.test.tsx`, `src/test/missionControl.smoke.test.ts` (CI) | verified |
| AC-009 | T-005 | `src/core/board/cards.ts`:buildBanner, `src/webview/board/Banner.tsx` | `cards.test.ts`, `SpecBoard.test.tsx`, `boardFilter.test.ts` | verified |
| AC-010 | T-003 | `src/core/lifecycle/readiness.ts` | `src/core/lifecycle/problems.test.ts` | verified |
| AC-011 | T-007, T-008 | — | — | open |
| AC-012 | T-007 | — | — | open |
| AC-013 | T-006 | `src/core/board/detail.ts`, `src/webview/detail/SpecDetail.tsx` | `detail.test.ts`, `SpecDetail.test.tsx` | built |
| AC-014 | T-006 | `src/core/board/needs.ts`:needsOf, `Card.tsx`, `SpecDetail.tsx` | `needs.test.ts`, `cards.test.ts`, `detail.test.ts`, `SpecBoard.test.tsx` | verified |
| AC-015 | T-008 | — | — | open |
| AC-016 | T-005 | `src/core/board/idText.ts`:enclosingEmphasis | `idText.test.ts`, `detail.test.ts`, `SpecDetail.test.tsx` | verified |
| AC-017 | T-002 | `src/webview/main.css` (.copy-button, .secondary-button), `src/webview/board/Announcer.tsx` | `webviewCss.test.ts`, `board/Keyboard.test.tsx` | verified |
| AC-018 | T-002 | `src/webview/ui/CopyButton.tsx`:CopyButton, `src/webview/detail/NextStep.tsx` | `src/webview/ui/CopyButton.test.tsx`, `detail/SpecDetail.test.tsx` | verified |
| AC-019 | T-002 | `src/webview/ui/CopyButton.tsx`, `src/webview/main.css` | `CopyButton.test.tsx` (MutationObserver), `webviewCss.test.ts` | verified |
| AC-020 | T-007 | — | — | open |
| AC-021 | T-009 | — | — | open |
| AC-022 | T-005 | `src/shared/protocol/nextStepTexts.ts` | `SpecDetail.test.tsx` | verified |
| AC-023 | T-010 | — | — | open |
| AC-024 | T-009 | — | — | open |
| AC-025 | T-010 | — | — | open |

## Session handoff

- **Done so far:** T-001…T-006 verified (stages 1–2, 2026-11-17); unit tests 1788 + 3 skipped, timing 12 (Baseline 1688 + 3).
- **Next action:** T-007 (stage 3): rule IDs into tooltips, S2 sentence.
- **Open decisions:** none blocking; Q-1…Q-12 (Research) are proxy readings that Gregor may overrule.
- **Baseline:** 3cdab90 (code identical to the move commit; unit tests 1688 passed + 3 skipped, timing 12)
- **Environment:** `npm test` cannot run in the agent sandbox (VS Code download blocked).
