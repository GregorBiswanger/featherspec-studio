# Plan — Send on the Follow-up Line

**Spec:** [0031-send-on-follow-up-lines.md](../done/0031-send-on-follow-up-lines.md)
**Status:** Done
**Last updated:** 2026-11-20
**Current step:** —

## Approach

The core gives every follow-up line its own Send view and Tip, derived from its own case of spec §6.2 by a small map
beside `STEP_ATTACHES` (`FOLLOW_UP_CASE`, keyed by step case and line index), so `nextStep()` and every one-line surface
stay untouched (T-001, the riskiest: it widens the detail protocol both the side panel and the Plan map header read).
T-002 renders it: `NextStep.tsx` puts `StepAction` with `look="secondary"` and the line's own Tip on each follow-up line,
and `main.css` gets the gap between line items. No new text, no new call shape. Memory Bank touched in T-004 only:
`activeContext.md`; `systemPatterns.md` gets no entry (no new pattern).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-004) · pre-done `npm test` on
Windows and CI, run by the orchestrator. Cadence (Gregor): per step only that step's tests; the full chain once, in T-004.

## Research

**Checkpoint digest (2026-11-20, Mode A; answered from the standing answer `orch/SPEC-0031.md` and Gregor's addition via
the coordinator, Gregor not asked).**
- Survey at `3842d5d`: follow-up lines exist only in NS-9 (`/sdd-plan`), NS-5 (`/sdd-lifecycle`), NS-6-open (`/sdd-plan`
  report) and NS-6-report (`Implement …`), all in `core/board/nextStep.ts`.
- `nextStepView()` in `core/board/detail.ts` builds one `send` (`sendViewOf(offer, next.case, { key })`) and one `tips`
  (`stepTips(next.case, …)`); the Plan map header renders `detail.nextStep` through the same `NextStep.tsx`.
- `NextStepLineView` (`shared/protocol/detail.ts`) has `text`, `intent`, `step?`; its guard sits at line ~112. An
  optional `send` and `coach` per line keep every existing view valid.
- `NextStep.tsx`: index 0 gets `StepAction` and `p.step-coach`, the rest a secondary `CopyButton`. `SendButton` keeps
  tokens and copy counts per instance (`pendingSend`, `pendingCopy`), so two in one section do not share feedback.
- `handOver.begin()` returns `undefined` for any line not starting with `/sdd-clarify `; a follow-up Send writes nothing.
- CSS: `.next-step-lines li { gap: 6px; padding: 2px 0 }`, `.step-coach` full width; `webviewCss.test.ts` parses the
  stylesheet, so AC-013 is decidable without layout.
- The Overview's `SpecRow.tsx` renders `row.step.line` only (spec A-001): no change there.
- No `done/` spec becomes a `Deprecated` candidate; 0025 and 0030 (done) get §5 notes only.
- [Review and revert agent changes](https://code.visualstudio.com/docs/copilot/chat/review-code-edits) — Copilot's pending
  edits are already on disk before Keep, so a challenge that edits the spec fires the watcher; supports spec OP-001's
  finding that the remaining miss is an unchanged file. Retrieved 2026-11-20.

## Stages

1. T-001 → T-002 — follow-up Send, attachment and Tip, rendered with the gap
2. T-003 → T-004 — preview evidence; §5 notes, docs and final gates

No parallel stage: T-002 renders T-001's protocol fields; T-004's docs describe T-002's result.

## Steps

### T-001 — Send view and Tip per follow-up line

- **Covers:** AC-002, AC-005 (hand-over), AC-006, AC-011 (view)
- **Do:** `core/assistant/attachment.ts`: `FOLLOW_UP_CASE` (spec §6.2: NS-9→NS-10, NS-6-open→NS-6-report,
  NS-6-report→NS-6-open, NS-5→NS-2, for line index 1). `shared/protocol/detail.ts`: optional `send?: SendView` and
  `coach?: string` on `NextStepLineView`, guard extended. `detail.ts` `nextStepView()`: for each follow-up line with an
  own case and an offer, `send` = `sendViewOf(offer, ownCase, { key })`, `coach` = `stepTips(ownCase, …).coach` while
  tips show; first line and view-level fields unchanged. Tests `core/board/followUp0031.test.ts`: "0031 AC-002 …" (each
  §6.2 row × Copilot, Claude Code, path with whitespace), "0031 AC-011 …" (own-case coach, NS-9 literal, tips off),
  "0031 AC-005 …" (follow-up `/sdd-plan` send writes no hand-over, `/sdd-clarify` still does), "0031 AC-006 …"
  (`nextStep()` and one-line surfaces deep-equal, `nextStepBaseline.test.ts` stays green).
- **Verify:** `npx vitest run src/core/board src/core/assistant src/shared/protocol` — red first (no per-line `send`), then
  green.
- [x] **Verified (T-001):** 2026-11-20 red first (15 of 22 new tests failed: no per-line `send`), then green: `npx vitest run src/core/board src/core/assistant src/shared/protocol` 54 files, 961 passed, 1 skipped; `npx tsc --noEmit` clean.
- **Notes:** Proxy decision (Gregor not reachable): spec §6.3, AC-009 and AC-011 name `Tip: Use a new chat with a strong model.` for NS-9's `/sdd-plan` line as "NS-10's session and model", but NS-10's guide is `any` session with `strongWebSearch`, so its own-case Tip is `Tip: Use any chat with a strong model, and allow web search.` The rule "own case, deep-equal to that case's first-line Tip" wins over the literal (a new chat would also contradict NS-9's own `then`: "in any chat"); the literal is corrected in the spec at closing. `detail.test.ts` (0024 AC-003) adjusted only to ignore per-line `send` (0031 §6.1).

### T-002 — Render the follow-up split button, its Tip and the gap

- **Covers:** AC-001, AC-003, AC-004, AC-005 (feedback), AC-011 (render), AC-012, AC-013
- **Do:** `webview/detail/NextStep.tsx`: a follow-up line with `send` renders `StepAction` with `look="secondary"` and its
  line, then `p.step-coach` with `line.coach`; without `send` today's secondary `CopyButton`, no Tip. `main.css`: the gap
  between `.next-step-lines li` items 1em–1.5em (e.g. `li + li { margin-top: 1.25em }`), the gap inside an item unchanged.
  Tests `webview/detail/followUp0031.test.tsx` "0031 AC-001 …", "0031 AC-003 …" (one primary, follow-ups secondary),
  "0031 AC-004 …" (no offer: markup deep-equal), "0031 AC-005 …" (feedback only on its own button), "0031 AC-011 …",
  "0031 AC-012 …" (menu items: new chat, current chat for Copilot, Copy prompt without attach), each in the detail and in
  `PlanMap` header; `webviewCss.test.ts` "0031 AC-013 …".
- **Verify:** `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` — red first (follow-up still Copy only, no
  gap rule), then green.
- [x] **Verified (T-002):** 2026-11-20 red first (9 of 12 new webview tests failed: follow-up still Copy only), then green: `npx vitest run src/webview src/adapters/node/webviewCss.test.ts` 919 passed; `npx tsc --noEmit` and `-p src/webview` clean.
- **Notes:** A follow-up line without its own `send` keeps the plain `CopyButton` (no focus handoff), so its markup is the baseline's (AC-004). The gap rule is `.next-step-lines li + li { margin-top: 1.25em }`; one rule serves the detail and the Plan map header because both render `NextStep.tsx`. The follow-up Tip renders only where the line has a Send and a `coach`.

### T-003 — Preview at two widths and three themes

- **Covers:** AC-008
- **Do:** the orchestrator's harness: detail of NS-9 and NS-6-open, Plan map header of NS-6-open, Copilot and Claude
  Code, Dark, Light, High Contrast at 1600 px and 1000 px, side panel open; screenshots in `Notes:`.
- **Verify:** manual: the orchestrator looks for one blue primary, equal-size split buttons each with its Tip, about one
  line of space before `Then: …`, no cut text or button, no word broken inside itself; jsdom has no layout engine.
- [ ] **Verified (T-003):** — open: the preview at two widths and three themes is the orchestrator's (AC-008).
- **Notes:** Left open on purpose; nothing in the code waits for it.

### T-004 — Notes, docs and final gates

- **Covers:** AC-007, AC-009 (into the checklist), AC-010, and re-proves AC-001…AC-006, AC-011…AC-013
- **Do:** §5's notes under 0021 §6.5, 0022 §4.4 and AC-010, 0024 §6.3 and A-005, 0025 §5.3, 0027 AC-001, 0030 §6.4;
  `README.md` (further prompts offer a secondary Send with its Tip), `CHANGELOG.md` (follow-up Send),
  `docs/release-checklist.md` section 0031 with AC-008, AC-009; `docsScan.test.ts` "0031 AC-007 …" with a negative
  control; title audit (every title at the Baseline exists at the head); `activeContext.md`. All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [x] **Verified (T-004):** 2026-11-20 final chain once at the end: eslint (0 warnings), `tsc --noEmit`, `tsc --noEmit -p src/webview` clean; `npm run test:unit` 215 files, 3835 passed after the fixes below (first run: 13 failed, all staying tests that state 0024's one split button per detail or header, the 300-word detail and the removed-feature scan on identifiers named `COPILOT`); docsScan, problems and sourceScan rerun green; `npm run compile` and `compile-tests` ok. `npm test` on Windows and CI are open.
- **Notes:** Staying tests adjusted only where spec section 5 changes their statement (0024 §6.3): `webviewBundle.test.ts` allows two split buttons in a detail (header: six split elements) and `detail.test.ts` ignores the per-line `send`; no test weakened otherwise. Spec corrected at closing: the NS-9 follow-up Tip literal is NS-10's (OP-003).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-002 | `webview/detail/NextStep.tsx` | `webview/followUp0031.test.tsx` | covered |
| AC-002 | T-001 | `core/assistant/attachment.ts` (`FOLLOW_UP_CASE`), `core/board/detail.ts`, `shared/protocol/detail.ts` | `core/board/followUp0031.test.ts` | covered |
| AC-003 | T-002 | `webview/detail/NextStep.tsx` | `webview/followUp0031.test.tsx` | covered |
| AC-004 | T-002 | `webview/detail/NextStep.tsx` | `webview/followUp0031.test.tsx` | covered |
| AC-005 | T-001, T-002 | `core/board/detail.ts`, `webview/detail/NextStep.tsx` | `core/board/followUp0031.test.ts`, `webview/followUp0031.test.tsx` | covered |
| AC-006 | T-001, T-004 | `core/board/nextStep.ts` untouched | `core/board/followUp0031.test.ts`, `core/board/nextStepBaseline.test.ts` | covered |
| AC-007 | T-004 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, the notes of spec section 5 | `adapters/node/docsScan.test.ts` | covered |
| AC-008 | T-003 | — (preview harness) | manual, orchestrator | open |
| AC-009 | T-004 (checklist) | `docs/release-checklist.md` | manual, Gregor | open |
| AC-010 | T-004 | the staying tests, adjusted in `core/board/detail.test.ts` and `adapters/node/webviewBundle.test.ts` only where spec section 5 changes their statement | `npm run test:unit` green; `npm test` on Windows and CI open | covered (unit); Windows and CI open |
| AC-011 | T-001, T-002 | `core/board/detail.ts`, `webview/detail/NextStep.tsx` | `core/board/followUp0031.test.ts`, `webview/followUp0031.test.tsx` | covered |
| AC-012 | T-002 | `webview/detail/NextStep.tsx` | `webview/followUp0031.test.tsx` | covered |
| AC-013 | T-002 | `webview/main.css` | `adapters/node/webviewCss.test.ts` | covered |

## Session handoff

- **Done so far:** T-001, T-002, T-004 verified; the spec is closed (Implemented 2026-11-20).
- **Next action:** — (open outside the plan: T-003 preview, orchestrator; AC-009, Gregor; CI on PR #2).
- **Open decisions:** — (spec OP-001: no change to 0030's detection, flippable by Gregor)
- **Baseline:** a383cc6
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
