# Release Polish

**Status:** Implemented
**Plan:** [0032-release-polish.2026-11-20.plan.md](../plan-archive/0032-release-polish.2026-11-20.plan.md)

Basis: Gregor's last order before the release, `docs/ux-audit/16-release-handoff.md` §1 (PD-093…PD-095) and §2 (eight
points), treated as typed by him and binding; evidence from `docs/ux-audit/15-post-round3-review.md` (H-1…H-9, screenshots
x01…x15 in `docs/ux-audit/screenshots-fbf8830/`). Feature freeze (16 intro): only these eight points go into this change
set; anything new goes to the backlog. No interview: every answer comes from 16; open items became proxies (§10, §11).

## 1. Summary

Eight small fixes after round 3: the onboarding's arrow size, Tip and line length; one comma in a Tip; a new-chat Tip
where a step writes a plan; every follow-up line starting with `Then:` or `Or:`; a waiting sentence for a partial return;
Send always on its own row under the prompt; and no attachment when sending to Copilot's current chat.

## 2. Goal and problem

15 found seven small defects and two hints (H-1…H-9) in 0029–0031, none blocking. Left as they are, the Studio ships with
a wrong arrow size in the first screen a new user sees (H-3), follow-up lines whose relation to the first line is unclear
(H-1), a Send whose position depends on the prompt's length (H-6), and a Copilot current-chat Send that puts the spec into
the context window again on every step (H-2), against FeatherSpec's rule not to pollute the context window.

Goal: the eight points of 16 §2 hold, and nothing else changes.

## 3. Users and roles

Developer, one role (0001–0007). The assistant (GitHub Copilot or Claude Code) receives the prompt and, where 0027 and
§6.8 say, the spec file.

## 4. Scope

### In scope

- The eight points of §6 (16 §2), in `src/shared/protocol/nextStepTexts.ts`, `src/webview/main.css` and the code that
  builds and renders them.
- The literal tests these texts change, and the notes of §5 on the specs they amend.
- PD-093…PD-095 in `docs/product/product-decisions.md`; `README.md`, `CHANGELOG.md`; `docs/release-checklist.md` section
  "Release polish (0032)" with 16 §3's evidence.

### Out of scope

- The `**Clarified:**` line that `/sdd-clarify` shall write itself (H-9, long-term part) — because it belongs to the
  FeatherSpec 1.12 plan (16 §2), not to the Studio.
- Spike V-4 on the Copilot harness — because it has its own date, before February 2027 (16 §2).
- `/sdd-plan` in Mode B (NS-4-plan, NS-6-report, NS-6-resume, NS-6-returned, NS-7 without open step) — because PD-093
  keeps its Tip unchanged.
- Any other text, layout or behaviour change, including findings new during this work — because 16 declares the feature
  freeze; they go to the backlog.
- High Contrast's equal-looking primary and secondary buttons (H-8) — because 15 calls it VS Code's standard, no action.

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0032 (…): …*".

| Spec · statement | Amendment |
| --- | --- |
| 0029 §6.4 (feather glyph, the welcome's action) | The 24 px icon rule holds for the feather glyph only; the Send arrow is 14 × 14 px; the welcome shows a Tip and a 65ch body (0032 §6.1, §6.7) |
| 0030 §7 coach row (`the current chat or a new one,`) and its examples | Without comma: `Tip: Use the current chat or a new one with a fast model.` (0032 §6.2) |
| 0021 §6.1 NS-10 row and §6.2 no-plan row (session any) | Session new (PD-093, 0032 §6.3) |
| 0030 §6.4, 0031 §6.3, AC-009, AC-011 (`Tip: Use any chat with a strong model, and allow web search.` on NS-9's follow-up line) | `Tip: Use a new chat with a strong model, and allow web search.` (0032 §6.3) |
| 0021 §6.2 open-step row, AC-003 (`Not sure where it stands? Let the agent report first`); 0021 §6.1 NS-9 row; 0026 §6.3 NS-9 row (`Have the spec challenged, then plan it`) | `Or: not sure where it stands? Let the agent report first`; `Have the spec challenged` (PD-095, 0032 §6.4) |
| 0028 AC-004, §6 line 2 (`Continue with <ID> <title>` under Report first) | `Then: continue with <ID> <title>` (0032 §6.4) |
| 0031 §6.2 and AC-002 (the follow-up line texts it names) | Texts as 0032 §6.4; attachment unchanged |
| 0025 §5.6 (Integrate quiet while a member is out) | The intent reads `When <IDs> is/are back: integrate the returned steps` (0032 §6.5) |
| 0031 §6.1, 0024 §6.3 (place of the split button) | Always on its own row under the prompt (0032 §6.6) |
| 0027 §6.1, §6.2, §6.4 (Copilot · current chat attaches; no update sentence) | Copilot's current chat attaches nothing; the update sentence returns below 1.11.0 and for `unknown` (PD-094, 0032 §6.8) |

## 6. Business rules

### 6.1 Onboarding arrow (H-3, x01)

The empty state's 24 px icon size applies to the feather glyph only. Every other glyph inside an empty state keeps its
size from outside the empty state; the Send arrow in the onboarding is 14 × 14 px, as everywhere.

### 6.2 Comma in the Tip (H-5)

The session phrase for current or new chat is `the current chat or a new one`, without comma. NS-6-open's Tip reads
`Tip: Use the current chat or a new one with a fast model.`

### 6.3 Tip where a step writes a plan (PD-093)

NS-10 and NS-6 without a sibling plan (NS-6-plan; `/sdd-plan` Mode A or C) get the session `new`. Their Tip, and the Tip
of NS-9's `Then: write the plan` line (its own case NS-10, 0031 §6.2), reads
`Tip: Use a new chat with a strong model, and allow web search.` The `(?)` gives the session reason of `new` (0021 §6.6).
Mode B cases keep theirs.

### 6.4 Then and Or (PD-095, H-1, H-9)

Every follow-up line's intent starts with `Then:` (afterwards) or `Or:` (instead):

| Case · line | Today | After 0032 |
| --- | --- | --- |
| NS-6-open · line 2 | `Not sure where it stands? Let the agent report first` | `Or: not sure where it stands? Let the agent report first` |
| NS-6-report · line 2 | `Continue with <ID> <title>` | `Then: continue with <ID> <title>` (without title: `Then: continue with <ID>`) |
| NS-9 · line 1 | `Have the spec challenged, then plan it` | `Have the spec challenged` |
| NS-9 · line 2 | `Then: write the plan` | unchanged |
| NS-5 · line 2 | `Then, after a READY verdict: close the spec` | unchanged |

NS-6-open's first line `Continue with <ID> <title>` stays.

### 6.5 Partial return (H-7, x09)

While 0025 §5.6 makes Integrate quiet because members of the group are not back, the NS-6-returned intent in the detail
and the Plan map header names them (the one-line surfaces keep `nextStep()`'s text):
one → `When T-004 is back: integrate the returned steps`; two → `When T-004 and T-006 are back: integrate the returned
steps`; three or more → `When T-004, T-005 and T-006 are back: integrate the returned steps` (A-002). IDs in plan
order. The button stays grey as today. Once every member is back, the intent is `Integrate the returned steps` again.

### 6.6 Send position (H-6, x12)

In the detail and the Plan map header, every line's Send split button (first line and each follow-up line) stands on its
own row under its prompt, whatever the prompt's length and the view's width. Copy prompt without an offer keeps its place.

### 6.7 Onboarding Tip and line length (H-4, x01)

Under the welcome's Send split button (or its Copy prompt without an offer, A-003) stands
`Tip: Use a new chat with a strong model.`; with `showStepTips` off no Tip. The welcome's body sentence has a
`max-width` of `65ch` and stays centred.

### 6.8 No attachment in the current chat (PD-094, H-2)

For Copilot with target `current`, Send calls `workbench.action.chat.open` with `{ query, isPartialQuery: true }` and no
`attachFiles`; the menu item's name and tooltip carry no `Attaches …`. Target `new` keeps attaching (0027 §6.4); Claude
Code has no current chat and is unchanged. Where a step's Send attaches and the active project's `FeatherSpecVersion:` is
below `1.11.0` by 0002's comparison (a pre-release is below), `unknown` or no semantic version, the `(?)` holds
`Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.` (A-004).

## 7. Error cases and edge cases

- A plan step without a title: `Then: continue with <ID>`, no trailing space (0021 AC-019).
- A group whose not-back member also carries a BLOCKED note: counted as back (0025 U-08 lists it as blocked, not out).
- Copilot current-chat Send whose attachment check would have failed: no attachment either way; 0024's calls.
- A very long prompt at 1000 px: Send still on its own row (§6.6); text wraps after path separators (0022 §4.6).

## 8. Acceptance criteria

Node or jsdom tests decide every criterion; where a criterion names a width, the orchestrator's preview checks it too.

- **AC-001** The stylesheet shall size `24px` only the empty state's feather glyph (own class); the Send arrow in the
  onboarding shall be 14 × 14 px as everywhere; a test shall check the arrow's size in the empty state.
- **AC-002** The session phrase `sameOrNew` shall be `the current chat or a new one`; NS-6-open's Tip shall read
  `Tip: Use the current chat or a new one with a fast model.`
- **AC-003** NS-10 and NS-6 without a plan (Mode A or C) shall have session `new`, and their Tip shall read
  `Tip: Use a new chat with a strong model, and allow web search.`; NS-9's `Then:` line after clarify, which uses NS-10,
  shall show the same Tip; Mode B cases shall keep their Tip.
- **AC-004** `NS6_REPORT_INTENT` shall be `Or: not sure where it stands? Let the agent report first`; the continue line
  under Report first shall read `Then: continue with <ID> <title>`; `NS9_INTENT` shall be `Have the spec challenged`;
  `NS9_THEN_INTENT` and `NS5_THEN_INTENT` shall stay unchanged.
- **AC-005** While one member of the group is not back, the intent shall read
  `When T-004 is back: integrate the returned steps`; while several are not back, `When T-004 and T-006 are back:
  integrate the returned steps`; the Integrate button shall stay grey as today.
- **AC-006** In the detail and the Plan map header, the Send split button shall stand on its own row under its prompt,
  whatever the prompt's length, for the first and every follow-up line; checked at 1000 px and 1600 px.
  *Amended by 0033 (0033 §6.4): the line is a column; the prompt is as wide as its text and at most as wide as the column, Send stands under it, left-aligned; the stretching rule `li > code:has(+ .send-split)` is gone.*
- **AC-007** Under the onboarding's Send split button shall stand `Tip: Use a new chat with a strong model.`, and no Tip
  where `showStepTips` is off; the explanation sentence shall have `max-width: 65ch` and stay centred.
- **AC-008** For Copilot with target `current`, Send shall call `workbench.action.chat.open` without `attachFiles`, and
  the menu item's name and tooltip shall carry no `Attaches …`; target `new` shall keep attaching; for projects below
  1.11.0 or `unknown` the `(?)` shall hold
  `Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.`

## 9. Technical notes for developers or AI agents

- As-is (`3b27e61`): texts in `shared/protocol/nextStepTexts.ts` (`SESSION_PHRASES.sameOrNew`, `STEP_GUIDES['NS-10']`
  and `['NS-6-plan']` session `any`, `NS6_REPORT_INTENT`, `NS9_INTENT`, `continueIntent()`); lines in
  `core/board/nextStep.ts` (NS-6-report puts `continueLine` second, NS-6-open first, so line 2 needs its own text);
  Tip in `core/board/stepTips.ts` (`coach` from session and model; `context.version` already there).
- Partial return: `integrateIsQuiet()` and `returnedWorkViewOf()` in `core/planMap/returnedWork.ts`; the out list
  already feeds `planMapTexts.ts` U-08 (`… not back yet`). The intent changes in the detail and the map header only;
  `nextStep()` stays as is for the one-line surfaces.
- Attachment: `core/assistant/assistants.ts` builds Copilot's `open` call with `attachFiles` for both targets;
  `sendMainName()` in `shared/protocol/assistantTexts.ts` appends `Attaches <file>`; the attachment is per view, so the
  current-chat item needs its own `attach`-free name. Version: `core/specs/version.ts` (`LEVELLING_SINCE = '1.11.0'`,
  `levelsOnImplement()`).
- Webview: `webview/ui/EmptyState.tsx` renders `Glyph` for every empty state, `.empty-state .icon` (`main.css` ~238)
  also hits the Send arrow; `webview/ui/Welcome.tsx` has no coach, `WelcomeView` (`shared/protocol/overview.ts`) has only
  `send`. `.next-step-lines li` is `flex-wrap: wrap`, so Send wraps by length (§6.6). `webviewCss.test.ts` parses the
  stylesheet.
- Tests compare literals: every text change moves its tests and the specs of §5.

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | NS-6 without plan is case NS-6-plan; Mode B cases are NS-4-plan, NS-6-report, NS-6-resume, NS-6-returned and NS-7 without open step (proxy) | `nextStep.ts` and 0027 §6.1's table; PD-093 names Mode A/C | AC-003 |
| A-002 | Three or more missing IDs join as `A, B and C`; a BLOCKED member counts as back (proxy) | 16 gives one and two; English list style; 0025 U-08 lists blocked apart from not back | AC-005 |
| A-003 | The onboarding Tip also stands under Copy prompt where no assistant is offered (proxy) | Every first line's coach shows with or without Send (0021 §6.5) | AC-007 |
| A-004 | The update sentence applies to every step whose Send attaches, for both assistants (proxy) | PD-094 names projects, not assistants; Claude Code attaches too (PD-091) | AC-008 |
| A-005 | "Name and tooltip without `Attaches …`" holds for every control whose target is `current`, main part included (proxy) | 0026 builds the main part's name from the chosen target | AC-008 |

## 11. Open points

- OP-001 NS-9's then-sentence reads `Then write the plan with the second prompt, in any chat.`, while §6.3 now gives that
  line a new-chat Tip. 16 orders no change to it and declares the freeze; proxy: unchanged. Gregor can order the
  wording `in a new chat`.
- OP-002 `/sdd-clarify` 2026-11-20 (stranger pass by role-play, no subagent available): 8 findings, 2 blocking, applied
  at Gregor's standing request. Blocking: §6.5 had no rule for three or more missing IDs or BLOCKED members (A-002); §6.8
  left open for which assistants and controls the update sentence and the `Attaches` removal hold (A-004, A-005).
  Others: "NS-6 without plan" named as NS-6-plan (A-001); untitled continue line (§7); the onboarding Tip without an
  offer (A-003); 0026's NS-9 row and 0031 §6.2 added to §5; §6.5 named its surfaces; the then-sentence contradiction
  parked as OP-001.

## 12. Ready, Done and next steps

Ready: clarified 2026-11-20 (OP-002); planned 2026-11-20, 6 steps in 3 stages. Done when AC-001…AC-008 pass; every test at the commit on which
implementation starts exists at the head and passes, adjusted only where §5 changes its statement; `npm run test:unit`
and `npm test` pass on Windows and in CI; a fresh `/sdd-compile` gives READY with 0 deviations; the preview of 16 §3 is
recorded in `docs/release-checklist.md` under "Release polish (0032)"; README, CHANGELOG and PD-093…PD-095 updated.
Acceptor: Gregor (practice check, 16 §4).
Closed 2026-11-20 by `/sdd-lifecycle` on the `Verified:` lines of T-001…T-006 and the compile brief of this date, whose only blocker (D-1, the 0021 §6.2 note) was fixed in this run; a fresh `/sdd-compile` and CI stay open; manual item: Gregor's practice check (16 §4.1).
manual: orchestrator checked AC-006, 2026-11-20 — harness r15check.mts at 77eebc9, Copilot, Dark/Light/HC × 1600/1000 px: 24 of 24 clean (no cut text, no word broken, no page errors); x01 onboarding: arrow 14×14, explanation max-width 65ch (533 px), Tip `Tip: Use a new chat with a strong model.`; x04 clarify detail: `Have the spec challenged`, Tip new chat strong; `Then: write the plan` with Tip `Tip: Use a new chat with a strong model, and allow web search.`; every Send below its prompt; x07 Plan map: `Tip: Use the current chat or a new one with a fast model.`, `Or: not sure where it stands? Let the agent report first`, Send below the prompt at 1000 px; x09 partial return: `When T-004 is back: integrate the returned steps`, Send below; stub send (Copilot): a new chat carries `attach`, the current chat request carries no `attach`, the menu reads `Send to a new chat` / `Send to the current chat` / `Copy prompt`; screenshots /home/claude/orch/preview/r15-0032

## Plan history

- 2026-11-20 — [0032-release-polish.2026-11-20.plan.md](../plan-archive/0032-release-polish.2026-11-20.plan.md) — 6 steps in 3 stages: texts, partial-return intent and current-chat attachment, onboarding and Send row, notes and gates, preview (orchestrator, 24 of 24 clean), checklist evidence; manual item: Gregor's practice check (16 §4.1).
