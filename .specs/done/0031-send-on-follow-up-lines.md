# Send on the Follow-up Line

**Status:** Implemented
**Plan:** [0031-send-on-follow-up-lines.2026-11-20.plan.md](../plan-archive/0031-send-on-follow-up-lines.2026-11-20.plan.md)

Basis: Gregor's feedback 2026-11-20 (standing answer `orch/SPEC-0031.md`, treated as typed by him; screenshot of a Backlog
spec's Next step: `/sdd-clarify` with a blue Send to Copilot, under it `Then: write the plan` · `/sdd-plan <spec>` with
only Copy prompt); 0021 (lines, intents), 0024 and 0026 (Send, one primary), 0027 and PD-091 (attachment), 0028 (NS-6
report line), 0030 (clarified step, Tip sentence); Gregor's addition 2026-11-20 via the coordinator (Tip per follow-up
line, same split button, space before `Then:`). Feature freeze (`docs/ux-audit/14-final-review.md` §1): a fix from real use. No
interview: every answer comes from the standing answer; open items became proxies (§10, §11).

## 1. Summary

Where a Next step shows a second line with a full prompt, that line gets the same Send to <assistant> split button as
the first line, secondary, with its own Tip sentence, and attaches the spec exactly when its own step attaches. About
one line of space separates the first line's block from the follow-up. Without an assistant it stays Copy prompt.

## 2. Goal and problem

After `/sdd-clarify` ran, the user's next action is the second line `/sdd-plan <spec>`. Today that line offers only Copy
prompt and attaches nothing, although the same prompt as a first line (NS-10) is sent with the spec attached. The same
gap sits on NS-5's `/sdd-lifecycle` line and on NS-6's report and continue lines.

Goal: every prompt line of a Next step can be sent in one click, with the attachment its step would carry.

## 3. Users and roles

Developer, one role (0001–0007). The assistant receives the prompt and, where 0027 says, the spec file.

## 4. Scope

### In scope

- The follow-up lines of the detail's Next step and of the Plan map header's Next step (both 0021's `lines` after the
  first): Send split button, look, attachment, its own Tip sentence, and the space before it (§6).
- README, CHANGELOG, the release checklist, §5's notes.

### Out of scope

- The Overview, the Board, the tree and *Copy next step* — because they show only the first line today (the first Now
  row included), and the standing answer adds no button where there is none.
- A second blue primary — because 0026's one primary per view (13 K-5) stays.
- New texts, a new menu or new call shapes — because the follow-up Send reuses 0024's split button, 0026's names, 0027's
  calls and 0030's Tip sentences as they are.
- Changing which step cases attach — because PD-091 and `STEP_ATTACHES` stay; only their use on follow-up lines is new.
- A new clarify detection that reads the spec's text or the chat — because the standing answer forbids language parsing
  (§6.5, OP-001).

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0031 (…): …*".

| Spec · statement | Amendment |
| --- | --- |
| 0024 §6.3 *Place* "the detail's first next-step line"; A-005 "Send only at 0022's two primary places"; 0025 §5.3 (the map header's first line) | Also each follow-up line of the detail and the Plan map header, as a secondary split button (0031 §6.1) |
| 0022 §4.4 *Secondary text button* "the side panel's Copy of every further line"; AC-010 | Where Send is offered, a secondary split button; without an offer as today |
| 0027 AC-001 "the first line's Send view" | Each follow-up line has its own Send view, attaching by 0031 §6.2 |
| 0021 §6.5 "directly under the first line's Copy prompt … nowhere else"; 0030 §6.4 "for the first line's session and model" | Also under each follow-up line's Send, for its own case (0031 §6.3) |

## 6. Business rules

### 6.1 Follow-up Send

A **follow-up line** is every line of a Next step after the first. Where an assistant is offered (0024), each follow-up
line in the detail and the Plan map header shows 0024's split button for its own prompt: same size, same main part, arrow
and menu (new chat, for Copilot also current chat, Copy prompt), same names and tooltips (0026, 0030 §7) built from its
own line, and the same function per item. It is always secondary; the first line keeps its look (primary, or secondary
where 0025 §5.6 makes it quiet). Without an offer a follow-up line shows today's secondary Copy prompt and no Tip
(A-004). The `?` and the parallel hint stay with the first line only.

*Amended by 0032 (0032 §6.6): every line's Send split button stands on its own row under its prompt, whatever the prompt's length and the view's width.*

### 6.2 Attachment of a follow-up line

A follow-up line attaches the spec exactly when the step case that shows the same prompt as its first line attaches
(`STEP_ATTACHES`, PD-091), with 0027's per-assistant rules (Claude Code: no attachment for a path with whitespace):

| Step case · follow-up line | Its own case | Attaches |
| --- | --- | --- |
| NS-9 · `/sdd-plan <spec>` (`Then: write the plan`) | NS-10 | yes |
| NS-6-open · `/sdd-plan <spec>` (0028's report line) | NS-6-report | yes |
| NS-6-report · `Implement <ID> of <plan>` | NS-6-open | yes |
| NS-5 · `/sdd-lifecycle <spec>` | NS-2 | no |

A step case not in this table that gains a follow-up line later gets no attachment until a spec adds its row (A-002).

*Amended by 0032 (PD-093, PD-095, 0032 §6.3, §6.4): the follow-up line texts are those of 0032 §6.4 (`Or: not sure where it stands? Let the agent report first`, `Then: continue with <ID> <title>`, `Then: write the plan`); the attachment is unchanged.*

### 6.3 Tip sentence and spacing of a follow-up line

Where a follow-up line shows a Send and the coach line is shown (`showStepTips`, 0021 §6.5), a Tip sentence (0030 §6.4,
§7) sits directly under its split button, built from its own case of §6.2: the `/sdd-plan` line of NS-9 reads
`Tip: Use any chat with a strong model, and allow web search.` (NS-10's session and model). Between a line item and the next line item (`Then: …`, AC-013) the detail and the Plan map header keep a
vertical gap of at least 1em and at most 1.5em, measured in the line's font size; with Copy prompt only the gap is the
same.

*Amended by 0032 (PD-093, 0032 §6.3): NS-9's `/sdd-plan` line reads `Tip: Use a new chat with a strong model, and allow web search.`*

### 6.4 Hand-over

Sending a follow-up line is a normal Send: same outcomes, fallback and feedback as 0024, its own status region. Only a
`/sdd-clarify` line records a hand-over (0030 §6.1); no follow-up line carries one today.

### 6.5 Clarify detection

0030's rule stays unchanged. The survey found no further cheap, safe, language-free widening (OP-001); the one miss left
— a challenge that ends without changing the spec file — now has a one-click Send on its `/sdd-plan` follow-up line.

## 7. Error cases and edge cases

- The offer comes or goes while a follow-up menu is open: as 0024 AC-010 for the first line.
- Two Sends in one section: each button shows only its own feedback (its own token and copy count, 0024 P-9).
- A follow-up line's attachment check fails at send time: 0027's `sendOpenedWithoutText`, as for the first line.
- A Next step with one line or with a text only: unchanged.

## 8. Acceptance criteria

Node or jsdom tests decide every criterion unless marked manual.

- **AC-001** Where an assistant is offered, the detail and the Plan map header shall render, for each follow-up line of
  NS-9, NS-5, NS-6-open and NS-6-report, 0024's split button for that line, styled secondary, whose main part is named and
  titled by 0026's and 0030 §7's rule with that line, and whose menu holds the same items as the first line's.
- **AC-002** For each row of §6.2, with Copilot and with Claude Code, the follow-up line's Send view shall carry the spec's
  file name and path as `attach` exactly where the row says yes; activating its main part shall make 0027's calls with
  that line; NS-5's `/sdd-lifecycle` line shall carry no attachment and make 0024's calls.

  *Amended by 0032 (PD-095, 0032 §6.4): the follow-up line texts are those of 0032 §6.4; the attachment is unchanged.*
- **AC-003** With an assistant offered, each view shall have the same number of primary-styled controls as at the commit
  on which implementation starts (0026 AC-024); every follow-up split button shall be secondary.
- **AC-004** Where no assistant is offered, the follow-up lines shall render deep-equal (markup) to the commit on which
  implementation starts (secondary Copy prompt, no Tip); the first line, its Tip, the `?` and the parallel hint shall be
  unchanged with and without an offer; only AC-013's gap may differ, and it lives in the stylesheet.
- **AC-005** When a follow-up Send settles, only that line's split button shall show the feedback; sending a follow-up
  `/sdd-plan` line shall write no hand-over memory, and sending the first line `/sdd-clarify` shall still write one (0030
  AC-001).
- **AC-006** The Overview, the Board, the tree, *Copy next step* and `nextStep()` shall render or return deep-equal to the
  commit on which implementation starts for every project under `test/fixtures/` and this repository.
- **AC-007** The specs of §5 shall carry its notes; `README.md` shall say that further prompts of the detail offer a
  secondary Send where an assistant is chosen; `CHANGELOG.md` shall name the follow-up Send; `docs/release-checklist.md`
  shall hold a 0031 section with AC-008, AC-009.
- **AC-008** *(manual, preview harness, by the orchestrator)* The detail of NS-9 and of NS-6-open and the Plan map header
  of NS-6-open, with Copilot and Claude Code, in Dark, Light and High Contrast at 1600 px and 1000 px with the side panel
  open: one blue primary, two split buttons of the same size, each with its Tip, a visible gap of about one line before
  `Then: …`, no text or button cut, no word broken inside itself.
- **AC-009** *(manual, Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and Claude Code)* On the Backlog
  spec, `Then: write the plan` offers a grey Send that opens a chat with `/sdd-plan …` and the spec attached, its menu
  holds new chat, current chat (Copilot) and Copy prompt, its Tip reads `Tip: Use any chat with a strong model, and allow web search.`, and
  the two steps read as separate blocks. He notes the versions.

  *Amended by 0032 (PD-093, 0032 §6.3): the `Tip: Use any chat with a strong model, and allow web search.` of NS-9's follow-up line reads `Tip: Use a new chat with a strong model, and allow web search.`*
- **AC-010** Every test at the commit on which implementation starts shall exist at the head and pass, adjusted only
  where §5 changes its statement; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
- **AC-011** Where an assistant is offered and the coach line is shown, each follow-up line of NS-9, NS-5, NS-6-open and
  NS-6-report shall show, directly under its split button, the Tip sentence of its own case of §6.2, deep-equal to that
  case's first-line Tip; NS-9's `/sdd-plan` line shall read `Tip: Use any chat with a strong model, and allow web search.`; with
  `showStepTips` off no follow-up Tip shall render.

  *Amended by 0032 (PD-093, 0032 §6.3): NS-9's `/sdd-plan` line reads `Tip: Use a new chat with a strong model, and allow web search.`*
- **AC-012** Each item of a follow-up line's menu shall do what the same item does on the first line, with the follow-up
  line's prompt: `Send to a new chat` and (Copilot) `Send to the current chat` make 0024's and 0027's calls for that
  target, `Copy prompt` copies the line and attaches nothing.
- **AC-013** The stylesheet shall give the vertical gap between a Next step's line item and the following line item a
  value from 1em through 1.5em, in the detail and in the Plan map header, with and without an offer; the gap inside an
  item (button to Tip) shall stay as it is.

## 9. Technical notes for developers or AI agents

- As-is (`3842d5d`): `nextStep()` (`core/board/nextStep.ts`) returns `lines` per case; follow-up lines exist only in NS-9,
  NS-5, NS-6-open and NS-6-report. `buildDetail()` (`core/board/detail.ts`, `nextStepView`) builds one `send` from the
  case (`sendViewOf(offer, next.case, { key })`); the Plan map header reuses `detail.nextStep`.
- Render: `webview/detail/NextStep.tsx` puts `StepAction` (Send or Copy) on index 0 and a secondary `CopyButton` on the
  rest; `StepAction` already passes `look="secondary"` to `SendButton`. `SendButton` keeps tokens and copy counts per
  instance.
- Attachment: `STEP_ATTACHES` and `attachmentOf()` in `core/assistant/attachment.ts`; the §6.2 table is a small map from
  (case, line index) to its own case, beside it. Proposal (decided in `/sdd-plan`): an optional `send` per
  `NextStepLineView` (`shared/protocol/detail.ts`, guard `isSendView`), the view-level `send` kept for the first line.
- Tip: `stepTips(case, …)` (`core/board/stepTips.ts`) builds the coach for a case; `NextStep.tsx` renders
  `p.step-coach` for index 0 only. Spacing: `.next-step-lines` in `webview/main.css`; `webviewCss.test.ts` already
  parses the stylesheet.
- Hand-overs: `createHandOverMemory().begin()` (`core/assistant/handOver.ts`) returns nothing for a line that does not
  start with `/sdd-clarify `; all four hand-over paths (Send, Copy prompt, Send's fallback copy, *Copy next step*) record.

## 10. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The Overview's first Now row shows no follow-up line today, so it gets nothing (decided: standing answer) | `SpecRow.tsx` renders `row.step.line` only | AC-006 |
| A-002 | A follow-up line's own case is the case that shows its prompt first (proxy) | Same prompt, same attachment (guideline 10); PD-091 attaches per case | AC-002 |
| A-003 | Sending `/sdd-lifecycle` from NS-5 is safe to offer (proxy) | It is a prompt the user still sends himself; Send sends nothing (0024) | AC-001 |
| A-004 | A follow-up line without Send shows no Tip (proxy) | Gregor's addition names "every follow-up line with a Send"; today's Copy-only lines have none | AC-004, AC-011 |

## 11. Open points

- OP-001 Forgiving clarify detection (standing answer: "where cheap and safe"): the survey found every hand-over path
  recording and the remaining miss to be a challenge that leaves the file unchanged (`/sdd-clarify` writes only after the
  walkthrough or a "park" yes), which the Studio cannot tell from a challenge not run without reading text or the chat.
  Proxy: no change to 0030's rule; §6.1 covers the case. Gregor can name a concrete miss.
- OP-002 `/sdd-clarify` 2026-11-20 (stranger pass by role-play, no subagent available): 6 findings, 1 blocking, applied
  in one pass at Gregor's standing request. Blocking: 0021 §6.5 ("nowhere else") and 0030 §6.4 (first line only) forbade a
  follow-up Tip, now §5 rows. Others: AC-004's deep-equal clashed with AC-013's gap, now markup only; "no new texts" read
  against the Tip, now names 0030's sentences; AC-013's "first-line block" had no edge a stylesheet can decide, now the
  gap between line items; the Overview's first Now row was checked and shows one line (A-001); NS-6's own-case swap kept
  as proxy (A-002).
- OP-003 Implementation 2026-11-20 (proxy, Gregor not reachable): the first draft named `Tip: Use a new chat with a strong model.` for NS-9's `/sdd-plan` line, but NS-10's guide is `any` chat with a strong model and web search (0030 §7), and §6.3 and AC-011 say "its own case, deep-equal"; the literal sentences of §6.3, AC-009 and AC-011 are corrected to NS-10's. Gregor can flip it.

## 12. Ready, Done and next steps

Ready: clarified 2026-11-20 (OP-002); planned 2026-11-20, 4 steps in 2 stages. Done by the evidence gate of `/sdd-lifecycle`; closed before T-003 by the implementing session, without a compile brief (L-1); AC-008 by the orchestrator, AC-009 by Gregor.
Closed 2026-11-20 by `/sdd-lifecycle`; T-003 / AC-008 (preview, orchestrator), AC-009 (Gregor) and CI on PR #2 stay open.
manual: orchestrator checked AC-008, 2026-11-20 — harness r14check at 3773816, fs-0030 backlog spec, Copilot and Claude Code × Dark/Light/HC × 1600/1000 px: 24 of 24 clean (no cut text, no word broken, no page errors); every follow-up line has the grey split Send with its menu and its own Tip; gap Tip → "Then:" 20 px; both sends carry attach; screenshots /home/claude/orch/preview/r14-0031

## Plan history

- 2026-11-20 — [0031-send-on-follow-up-lines.2026-11-20.plan.md](../plan-archive/0031-send-on-follow-up-lines.2026-11-20.plan.md) — 4 steps in 2 stages: follow-up Send view and Tip, render and gap, preview (open), notes and docs; unit gates green; manual items open: T-003 (orchestrator), AC-009 (Gregor), `npm test` on Windows and CI on PR #2.
