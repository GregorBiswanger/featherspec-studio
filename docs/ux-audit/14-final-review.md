# 14 · Round 3: final review (12 F-4)

Status 2026-11-19 · branch `ux-round-3`, head `9b3f787` · fresh reviewer, read-only apart from this file. Inputs:
[11](11-round3-clicktest-review.md), [12](12-finish-plan.md), [13](13-clicktest-results.md), specs 0025–0028 with their
plans, compile reports `orch/compile/{0025…0028}.md` (with re-checks), `docs/release-checklist.md`,
`.memory-bank/activeContext.md` and the preview runs `r6-0028`, `r7c-0025`, `r8-0026`, `r9-0027`.

**Limit:** I judged records, tests and harness reports. I read the `report.json` files and opened no real VS Code window.
12 F-1 was run after this review's first draft: the VSIX of `9b3f787` (13 files, 248.57 KB) passed the host suite unpacked on Windows (34+1+1+1, exit 0), and the webview of the same head passed the harness check `r10check` on nine situations (not a project, brownfield, the five A-3 fixtures, `par-open` with Copilot, this repository) in Dark, Light and High Contrast at 1600, 1000 and 860 px: no cut text, no word broken inside itself, `Back to Overview` under 900 px, every button named, every progress bar with `aria-valuetext`, live regions present, a visible focus ring on every Tab stop, and in the Send menu Enter opens on the first item, ArrowDown moves, Esc closes and returns focus to the arrow (evidence: `orch/preview/r10-f1`). Real sending (12 F-2) stays Gregor's.

**Feature freeze (12 G-1), 2026-11-19:** from now on only fixes; new ideas go to `.specs/backlog/`, not into a round 4.

## 1 Verdict

| Part | Verdict |
| --- | --- |
| Specs 0025, 0026, 0028 | Built, compiled, closed in `done/`. Each is **READY pending CI** on the round-3 PR. |
| Spec 0027 | Built, compile **READY (manual items: 4)** pending CI. It **stays in `active/`** on purpose: it closes only after C-2 (OP-006), AC-017, AC-020 and the FeatherSpec 1.11.0 release. |
| P1 findings | **None open in the build.** K-1 was the only P1, and it is built and tested (0025 AC-027). Gregor's real use (F-3) can still raise one. |
| Still pending | Windows at the final head (orchestrator), the VSIX host suite (running), CI (runs on the round-3 PR). Production source is unchanged since `e37f65d`; after that only docs, screenshots and one docs test changed. |

## 2 Findings of 11 and 13

Status: **verified** = built, tests green, preview clean · **Gregor** = his manual check is open · **deferred** = outside
round 3 · **decided** = a PD with no code.

| Finding | Resolved by | Status | Evidence |
| --- | --- | --- | --- |
| 11 §3.1 "Send it once …" instead of "Paste" | 0026 AC-021 | verified | `stepTips.test.ts`, `sourceScan.test.ts` |
| 11 §3.1 group view `1 of 2 returned · T-004 not back yet`; no primary Integrate while someone is out | 0025 AC-025, AC-026 (PD-088) | verified; Gregor (AC-024, real parallel run) | `returnedWork.test.ts`, `quiet0025.test.ts`; `r7c-0025/partialret-dark-1600-map-open.png` |
| 11 §3.2 and §2.4 the reason text depends on the version | 0028 §6.4, AC-020 (PD-087) | verified | `stepTips.test.ts` "0028 AC-020" |
| 11 §2.4 report first only before 1.11.0; unknown version counts as old; returned work first | 0028 AC-009, AC-018, AC-019, AC-021 | verified; Gregor (AC-015 b) | `nextStep.test.ts`, `fiveFixtures.test.ts` over the five `fs-*` fixtures |
| 11 §3.3 and §2.7 `43%` without a space | 0025 AC-012, AC-013 (PD-085) | verified | `percent.test.ts`, `progress0025.test.ts`; `pct` in `r7c-0025` |
| 11 §3.4 and §2.3 "Put back in line" | 0026 AC-003: `Move back to Ready` (PD-086) | verified (wording is a proxy, OP-007) | `nextStep.test.ts`, `stepView.test.ts` |
| 11 §2.1 `Implement T-001 of …plan.md` | 0028 §6.5, AC-016 | verified; Gregor (AC-015 c) | `nextStep.test.ts` |
| 11 §2.2 file chip `… attached when sent` | 0027 AC-001–AC-003, AC-019 | built for Claude Code; Copilot off until C-2 | `AttachmentLine.test.tsx`, `attach0027.test.tsx`; `r9-0027` |
| 11 §2.5 codicons instead of `✓ ◐ ○ ↩ ⊘` | 0025 AC-014 | verified | `stepLook.test.ts`, `icons.test.tsx` |
| 11 §2.6 one Next step, carried by the map header | 0025 AC-009, AC-010 (D-2) | verified | `PlanMap.header.test.tsx`, `primaryButtons.test.tsx` |
| 11 §2.8 Copy prompt only on the step due now | 0025 AC-008 | verified | `cardRows0025.test.ts`; `r7c` "only card Copy prompt" |
| 11 §4 task 1: parallel hint only in the side panel | 0025 AC-016 (U-06) | verified | `parallel0025.test.ts`; `r8-0026` selected Now row shows `Stage 2 can run in parallel · Ways to run it` |
| 11 §4 task 2: "new chat" not in the visible label | 0026 AC-022 (via K-2) | verified | below |
| 11 §4 task 6: "Open plan" lands at the top | 0025 AC-002, AC-004, AC-007 (Ctrl/Cmd+click, `Open in plan`) | verified; Gregor (AC-024) | `stepLinks.test.ts` |
| 11 §4 method: solved and ease 1–7 | 12 B-3 in the draft | done | 13, task table |
| 11 §5 V1: `Verified:` without a tick | 0028 §6.6, AC-017 (all versions) | verified | `nextStep.test.ts` "0028 AC-017", fixture `fs-verified-no-tick` |
| 11 §5 before the FeatherSpec PR: G0 on Windows, V3, Hands-On | 12 C-1…C-3 | Gregor (FeatherSpec repo) | — |
| 11 §5 speed: "not slower", not "faster" | 12 C-4 (changelog wording) | Gregor | — |
| 11 §6 Q1 MINOR, title without "level" | 12 C-4 | Gregor | — |
| 11 §6 Q2 squash before the push | 12 C-5, C-6 | Gregor | — |
| 11 §6 Q3 red step while catching up: stop and ask | PD-084 | decided | `product-decisions.md` |
| 11 §6 Q4 prompt files after February 2027 | 12 E-2 done (Studio depends only on `/sdd-*` names), E-4 done (1.12.0 plan); E-1 (V-4 spike, H1–H5 still `_open_`), E-3 | deferred to FeatherSpec 1.12.0, deadline January 2027 | `docs/decisions/v4-copilot-harness-spike.md` §3, §4 |
| **K-1** (P1) step IDs in Next step and Overview rows are not links | 0025 AC-027 | verified; Gregor (feel in real use, AC-024) | `stepLinks.test.ts`, `Overview.stepLinks.test.tsx` |
| **K-2** (P2) chevron choice not visible | 0026 AC-022, OP-006: check mark, label stays `Send to Copilot` | verified | `SendButton.test.tsx`; `r9-0027` menu `menuitemradio:true:Send to a new chat` |
| **K-3** (P2) model hint only in `(?)` | 0026 AC-023 | verified | `coach0026.test.tsx`; `r8-0026` Verify row shows `new chat · strong model, other family` |
| **K-4** situation picker of the click test hidden | none (tooling) | closed, no product change | 13 |
| **K-5** (P3) blue primary on the first Now row | 0026 AC-024 | verified (proxy); Gregor (F-3) | `primaryButtons.test.tsx`; `r8-0026` unselected Overview: no primary |

## 3 What changed for the user

- **Step IDs:** before, `T-004` opened Markdown or nothing. Now a click opens its card in the Plan map, and Ctrl/Cmd+click opens the plan at the step.
- **Progress:** before, "4 of 6 done" read as half. Now it reads `4 of 6 done · 67%`, and 100% shows only when everything is done.
- **Finished plan:** before, the spec stayed Active until `/sdd-plan` set `Done`. Now, once every step is ticked, it is Review with `Verify · /sdd-compile`.
- **After a break:** before 1.11.0, the report comes first. From 1.11.0 `Continue` stays first, because the step catches up itself. A `Verified:` line without a tick always asks for the report.
- **Parallel work:** before, views disagreed about returned work. Now one sentence names who is still out, and Integrate waits.
- **Send:** before, Copilot used the open chat. Now Send opens a **new chat**, the menu checks the active choice, and `current chat` is the one term.
- **Calmer Overview:** Now shows five rows, then `+ n more`. Only the selected spec has a blue button, and the coach line shows once and without a click.
- **Ways to run a stage:** three radio lines, In sequence pre-selected, details behind `(?)`.
- **Attachment (Claude Code, FeatherSpec 1.11.0):** Send adds the spec, and the chip says so. Copy prompt attaches nothing.

## 4 Verification summary

| Spec | Steps | Compile (re-checks) | Windows | Preview | Open manual |
| --- | --- | --- | --- | --- | --- |
| 0028 | 9 | NOT READY (pending runs, docs D1) → **1 re-check**: CI the only blocker; closed as READY (manual items: 1) pending CI | `npm test` green at `5b18257` (35 passing; unit 3270/8 + 26 timing) | `r6-0028`: 12 runs, Review and Report first × 3 themes × 1600/1000 px; only sr-only text clips | AC-015 (AC-014 moved there) |
| 0025 | 15 | NOT READY (title audit −2, AC-022 highlight unchecked) → **1 re-check**: only Windows and CI; Windows then green → READY (manual items: 3) pending CI | `npm test` 36 green at `6530890` and `7ea11f3`; unit 3412/8 + 28 | `r7` could not show focus; harness fixed → `r7c-0025`: 18 runs, highlight in all, nothing cut | AC-022 real window, AC-023, AC-024 |
| 0026 | 11 | NOT READY (traceability, §5 notes) → **1 re-check**: one note missing → added in `379d703`, no further compile → READY (manual items: 3) pending CI | `npm test` 33+1+1+1 at `25c6b92`; unit 3502/8 + 28 at `856872e` | `r8-0026`: 12 runs, ways and a 12-entry Now (`5 rows + 7 more`), nothing cut | AC-017 (Gregor's half), AC-019; AC-018 recorded |
| 0027 | 10 | NOT READY (records only, 0 deviations) → **1 re-check**: READY (manual items: 4) pending CI | `npm test` 34+1+1+1, unit 3684/8 + 33 at `e37f65d` | `r9-0027`: Copilot (attaching forced on) and Claude Code, 3 themes × 1600/1000/800 px, nothing cut | C-2, AC-016 (look), AC-017, AC-020 |

- **Final head:** Windows at `9b3f787` is pending with the orchestrator. The VSIX host suite is running. CI runs once on the round-3 PR, as in round 2. A red CI turns every "READY pending CI" into NOT READY.
- **0027 stays in `active/`.** It closes with `/sdd-lifecycle` only after C-2 (OP-006), AC-017, AC-020 and the FeatherSpec 1.11.0 release (OP-002).

## 5 Gregor's open list (F-3: just use it)

No task scripts. Use the Studio on `C:\projects\test\tip-splitter` and tell Claude what felt wrong. In order of value:

1. **FeatherSpec 1.11.0:** G0, Hands-On, then Go (12 C-1…C-6). 0027 and the "from 1.11.0" behaviour depend on it.
2. **0027 C-2:** on 1.11.0, send with an attached spec in Copilot and in the Claude Code extension. Does the agent read the spec file again?
3. **0028 AC-015:** let an agent tick the last step and check that the spec shows Review and `/sdd-compile`. Take a break mid-plan and see what comes first.
4. **0026 AC-019:** use Send from the detail and from Now. Is a new chat opened and nothing sent? Does a draft in the old chat survive? Try `current chat` once.
5. **0025 AC-024 / AC-022:** click step IDs, Ctrl+click one, and do one parallel run with a return note. Does the highlight show in your theme?
6. **0025 AC-023:** say whether the texts are fine, `Move back to Ready` included.
7. **0027 AC-017, AC-020:** Claude Code with the chip; and once with the 43 KB `0022` spec, Send vs Copy prompt. Note context use.
8. **0027 AC-016:** look at the chip in your theme.

Note the versions (VS Code, Copilot Chat, Claude Code, FeatherSpec) once.

## 6 Risks and known limits

- **Copilot attaching is off** (`attachesSpec: false`) until C-2. Copilot users see no chip, and the preview forced it on. Flipping it means one entry plus the shipped-table tests in four files (checklist "C-2").
- **The harness checks the layout, not real VS Code.** It renders the webview bundle with a fake host in Playwright. It cannot prove real sending, real focus after a command, or Copilot/Claude Code behaviour. F-1 (VSIX) and F-2 (real sending) cover that.
- **CI has not run for any round-3 spec.** Every verdict above is "pending CI".
- **Process caveats:** 0026's last blocker was fixed without a third compile. 0028 was closed on a re-check whose text still reads NOT READY with CI as the only blocker.
- **Proxies not tested with users:** 13 ran tasks 1–3 only. `Move back to Ready`, one blue primary (K-5) and §7 texts of 0025/0026 rest on F-3.
- **Non-blocking compile findings left open:**
  - 0025: no timing test asserts U-08 freshness; TDD red gaps in T-003, T-008, T-011, T-013; the AC-015 example was amended by the orchestrator as a proxy (Gregor may confirm).
  - 0026: `.plan-way-tag` marks the default by weight and underline, not a theme variable (F-2, Gregor's call); TDD red gaps in T-004, T-006…T-008; the AC-016 traceability cell says §4 instead of §5.
  - 0027: a crafted Claude Code request with a whitespace path sends with 0024's success text (F4); AC-012 focus is not asserted (F5); T-008 and T-010 name no red run (F6).
  - 0028: the quick pick (AC-006) is checked through `situation()`, not the opened pick (F5); the fix commits `2297d3d`, `51887fb` have no recorded red run (mutants stand in).
- **February 2027:** the V-4 spike (E-1) is unrun, and FeatherSpec 1.12.0 (skills, E-3) is not built yet. If H3 fails, Copilot's FeatherSpec path breaks earlier.
- **Publishing (outside round 3):** Azure DevOps tokens stop working on 2026-12-01; the checklist's Go uses Trusted Publishing.
