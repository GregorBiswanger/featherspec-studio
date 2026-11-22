# Onboarding Before /sdd-setup

**Status:** Implemented
**Plan:** [0029-onboarding-before-setup.2026-11-20.plan.md](../plan-archive/0029-onboarding-before-setup.2026-11-20.plan.md)

Basis: Gregor's feedback 2026-11-19 (standing answer `orch/SPEC-0029.md`, treated as typed by him); FeatherSpec 1.11.0
(branch `feature/1.11.0-studio-prompts`, `04c569d`, unreleased) `.claude/commands/sdd-setup.md` *Session opening* and
*Step 1*; 0014 (Set up FeatherSpec), 0018 (Overview), 0020 (tree), 0024 and 0026 (Send); PD-016, PD-047, PD-048, PD-068,
PD-078; guidelines 1, 3, 6, 7, 9–12. Feature freeze (`docs/ux-audit/14-final-review.md`, 12 G-1): this is a fix, the
first step offered was wrong. No interview: every answer comes from the standing answer; open items became proxies (§11).

## 1. Summary

In a project where FeatherSpec is installed but `/sdd-setup` has not run, the Studio's empty state offers
`No specs yet. Start with /sdd-specify`, a step that comes too early. While FeatherSpec's own sign says setup has not run
(§6.1), the empty state welcomes the user instead (`Welcome to FeatherSpec`, the Studio's feather) and offers `/sdd-setup`
with the normal Send or Copy prompt. Once setup has run, today's empty state comes back unchanged.

## 2. Goal and problem

After 0014's *Set up FeatherSpec* (or a manual install) the Studio shows a project with no specs, and its one action is
`/sdd-specify`. FeatherSpec's first step is `/sdd-setup`: it sets `DocLanguage`, fills the Memory Bank and reconciles the
architecture snapshot, which `/sdd-specify` reads (its *Step 1*). A spec written first comes out in the template's default
language and without the project brief. 0014 AC-017 names `/sdd-setup` once, in a notification that goes away. Goal: the
Studio leads with `/sdd-setup` for as long as it has not run, and says nothing new once it has.

## 3. Users and roles

Developer, one role (0001–0007). The AI assistant receives only the prompt.

## 4. Scope

### In scope

- The sign *setup not run* (§6.1) and its re-read (§6.2).
- The welcome in the Overview's and the Board's empty state, the tree's message, Up next's empty line, and the
  *Copy next step* command without a step (§6.3), with the texts of §7.
- A feather glyph for the webview (§6.4, PD-090), README, CHANGELOG, the release checklist, PD-090.
- Two fixtures (§9): installed with setup not run, and setup done with no specs.

### Out of scope

- Running `/sdd-setup` or opening a chat — because PD-049 keeps that a manual step (0014 §4); Send fills the input only (PD-068).
- A welcome while specs exist — because guideline 11 ("Guide, don't crowd"); with specs only the two lines that today
  name `/sdd-specify` as the way on change (Up next's empty line, *Copy next step* without a step, §6.3), no new line.
- A coach line (session, model) on the welcome — because guideline 11 puts it beside a spec's next step only (A-005).
- Checking that setup ran *well* (every Memory Bank file, working agreements, tracker) — because FeatherSpec's sign is
  about whether a setup touched the project, not how complete it is (A-001).
- 0014's *setup pending* (`.featherspec-setup/`) — because that folder makes the folder incomplete, not a project (0014
  S9), so no empty state shows; 0014 owns it.
- Other wording, layout or step rules — because of the feature freeze (14).

## 5. Amendments of other specs

The implementing change set adds a note under each statement, "*Amended by 0029 (setup not run): …*".

| Spec · statement | Amendment |
| --- | --- |
| 0018 O-8 and AC-011 "`No specs yet. Start with /sdd-specify`" with Copy (Overview and Board; 0006 AC-020, 0007 AC-021) | While setup has not run (0029 §6.1), the welcome of 0029 §6.3 instead |
| 0020 §6 row "0 specs", message `No specs yet. Start with /sdd-specify` | While setup has not run, 0029 §7's tree message |
| 0018 O-8 and AC-012 `Nothing up next. Start the next spec with /sdd-specify` (0022 §4.4 icon Copy) | While setup has not run, 0029 §7's Up next line; its icon Copy copies `/sdd-setup` |
| 0017 *Copy next step* "no item" information `No spec has a next step to copy. Start the next spec with /sdd-specify` | While setup has not run, 0029 §7's message; its button copies `/sdd-setup` |

## 6. Business rules

### 6.1 The sign: setup not run

FeatherSpec's definition (`sdd-setup.md` *Session opening*): "A re-run is a repository a previous setup already touched —
the Memory Bank carries real content instead of `TBD` placeholders, or the snapshot has been reconciled at least once";
"The `DocLanguage:` value the template ships with is a default nobody chose, so it never makes a run a re-run." The
Studio reads **setup not run** (`/sdd-setup` has not run; not 0014's *Set up FeatherSpec* nor its *setup pending*) only
while both of these hold for the active project:

1. **Brief untouched:** `.memory-bank/projectbrief.md` is a readable file with the headings `## Mission`,
   `## Primary users` and `## Success criteria`, and the body of each — its lines up to the next line that starts with
   `#`, or the end — is, trimmed, exactly `TBD`. Line endings LF or CRLF and a leading BOM read alike; `TBD.`, `tbd`,
   `TBD` with more text, or extra lines are other bodies.
2. **Snapshot never reconciled:** the first line of the project's `AGENTS.md` that starts, after leading spaces, with
   `# last reconciled:` has the value `never` (the text after the colon up to the first `·` or the end, trimmed).

Anything else is **setup run or unknown**, and the Studio behaves as at the commit on which implementation starts:
the brief missing, unreadable, a heading missing or renamed, any other body, no `# last reconciled:` line, any other value,
`AGENTS.md` read but without such a line. `DocLanguage` is never read for the sign. The sign is never a Problem, a format note or a
diagnostic (guideline 3: a normal state).

### 6.2 Re-read

The sign is read when the project is discovered and again whenever `AGENTS.md` or `.memory-bank/projectbrief.md` is
created, changed or deleted, so a finished `/sdd-setup` switches the surfaces without a reload (PD-033, PD-047).

### 6.3 Surfaces while setup has not run

| Surface | No specs | Specs exist |
| --- | --- | --- |
| Overview empty state | The welcome: feather glyph, heading, body, one primary action `/sdd-setup` | Now, Up next, Figures unchanged |
| Board empty state | The same welcome (one step, one wording, guideline 10) | Unchanged |
| Specs tree | §7's tree message, no rows (rows are no buttons, guideline 4) | Unchanged |
| Up next empty line | — (Up next is not shown without specs) | §7's line with an icon Copy of `/sdd-setup`, in place of today's line |
| *Copy next step* without a step | §7's message; its button copies `/sdd-setup` | The same, when no spec has a step |

Problems and Activity show as today (0018 O-8); the welcome replaces only the empty-state text and its Copy.

**The action:** the welcome's one primary button is 0024's step action for the line `/sdd-setup`: the Send split button
`Send to <assistant>` where an assistant is offered (0024, 0026: default target the new chat, the menu's targets and
Copy prompt), otherwise Copy prompt. No attachment and no attachment line (there is no spec, 0027). Nothing else on the
welcome is a button.

### 6.4 The feather (PD-090)

The heading carries no emoji. FeatherSpec's banner uses 🪶, but an emoji paints its own colours and ignores the theme
(guideline 9: theme variables only, High Contrast included), and a tree message is plain text. The webview shows the
Studio's logo mark (`media/studio.svg`, PD-048) as a glyph in `currentColor` before the heading, hidden from screen
readers; the tree message is text only. PD-090 records this deviation from Gregor's "🪶".

*Amended by 0032 (0032 §6.1, §6.7): the 24 px icon rule holds for the feather glyph only; the Send arrow is 14 × 14 px; the welcome shows a Tip and a 65ch body.*

## 7. Texts (English, PD-016; in the text modules, asserted literally; proxies, A-003)

| New | Replaces, while setup has not run |
| --- | --- |
| Welcome heading: `Welcome to FeatherSpec` | `No specs yet. Start with /sdd-specify` (Overview, Board) |
| Welcome body: `Set up this project first: run /sdd-setup with the AI assistant of your choice. It asks for the language of your docs, fills the Memory Bank and records the architecture snapshot.` | — |
| Welcome action line: `/sdd-setup` | `/sdd-specify` |
| Tree message: `Welcome to FeatherSpec. Set up this project first: run /sdd-setup with the AI assistant of your choice.` | `No specs yet. Start with /sdd-specify` |
| Up next line: `Nothing up next. Set up this project first with /sdd-setup` | `Nothing up next. Start the next spec with /sdd-specify` |
| Copy next step: `No spec has a next step to copy. Set up this project first with /sdd-setup` | `No spec has a next step to copy. Start the next spec with /sdd-specify` |

## 8. Error cases and edge cases

- A read failure of the brief: setup run or unknown (§6.1), no message; the next change re-reads it. An unreadable
  `AGENTS.md` keeps the folder from being read at all (0001), so no empty state shows.
- The sign switches while the Send menu or a Copy feedback is open: as on any model change (0024 AC-010).
- `/sdd-setup` stopped halfway (brief filled, snapshot still `never`): setup run, by FeatherSpec's "or".
- A legacy project (no version line, 0001) or an older template without the `# last reconciled:` line: unknown, today.
- Several projects (S3) or a project change: the sign belongs to the active project (0001).
- Restricted Mode, reader window, no assistant: Copy prompt only (0024 AC-010, 0021 AC-018).

## 9. Acceptance criteria

Node or jsdom tests decide every criterion unless marked manual. Fixtures (12 A-3 style, under `test/fixtures/`):
**`fs-setup-not-run`** — the FeatherSpec template as installed: `AGENTS.md` and `.memory-bank/*.md` verbatim from the
1.11.0 branch at `04c569d` (`FeatherSpecVersion: 1.11.0`, `# last reconciled: never`, every brief section `TBD`), `.specs/`
with its `README.md` and empty lifecycle folders; **`fs-setup-done-no-specs`** — the same after a setup: brief sections
filled, `# last reconciled: 2026-11-19`, `DocLanguage: English`, no spec.

- **AC-001** For `fs-setup-not-run` the sign shall read *setup not run*; for `fs-setup-done-no-specs` *setup run*.
- **AC-002** If `fs-setup-not-run` is changed in exactly one way, the sign shall read *setup run or unknown*: one brief
  section with other text (`TBD.`, `tbd`, `TBD — later`, a second line); one brief heading missing; the brief deleted; the
  brief a folder; `# last reconciled:` with a date; that line deleted. With `DocLanguage: German`, with CRLF line endings
  in both files, or with a BOM, and nothing else changed, it shall still read *setup not run*.
- **AC-003** While the active project has no spec and the sign reads *setup not run*, the Overview shall show the
  welcome: the feather glyph (hidden from screen readers), §7's heading and body literally, and one primary action for the line
  `/sdd-setup`; it shall show no Figures and no text containing `/sdd-specify`. With an offered assistant the action shall
  be the Send split button `Send to <assistant>` with 0026's default target and menu, without an attachment line; without
  one, Copy prompt.
- **AC-004** In the same state the Board's empty state shall show the same welcome as AC-003, and the tree shall show
  §7's tree message and no row.
- **AC-005** When the user activates the welcome's Send, the system shall hand `/sdd-setup` to the chosen assistant and
  target as 0024 and 0026 say, with no attachment; Copy prompt shall copy `/sdd-setup`; the feedback appears at the
  control (guideline 8).
- **AC-006** For `fs-setup-done-no-specs`, and for every AC-002 variant that reads *setup run or unknown*, the Overview,
  the Board, the tree and the *Copy next step* command shall render deep-equal to the same files at the commit on which
  implementation starts, `No specs yet. Start
  with /sdd-specify` with its Copy included.
  *Amended by 0035 (PD-108): with an offered assistant the empty state also carries that host's step action for `/sdd-specify` (0035 §6.6, AC-007); without one, as stated.*
- **AC-007** While the sign reads *setup not run* and the project has at least one spec, the Overview shall show no
  welcome; Up next without rows shall show §7's Up next line with an icon Copy of `/sdd-setup` in place of today's line;
  Up next with rows, Now, the Board, the tree and every spec's next step shall be unchanged.
- **AC-008** While the sign reads *setup not run* and no spec has a next step, the *Copy next step* command shall show
  §7's message, and its button shall copy `/sdd-setup`.
- **AC-009** When the brief or `AGENTS.md` changes so that the sign switches (either way, also by deleting the brief),
  the Overview, the Board and the tree shall show the other state within 500 ms after the file system's change event
  reaches the Studio (PD-047, timing test), selection and area unchanged.
- **AC-010** Every project under `test/fixtures/` and this repository shall keep the rendered Overview, Board, tree and
  `nextStep()` results deep-equal to the commit on which implementation starts, except Up next's empty line for
  `fs180-de-baselines` where it has no Up next row (brief `TBD`, `never`; it has specs), which AC-007 decides.
- **AC-011** Each §7 text shall exist exactly once, in a text module. No text module shall contain a character of the Unicode
  property `Extended_Pictographic` (🪶 included); the glyph shall take the theme's foreground colour, with no colour of
  its own, in Dark, Light and High Contrast.
- **AC-012** The specs of §5 shall carry its notes. `docs/product/product-decisions.md` shall carry PD-090 (the feather
  glyph instead of 🪶, §6.4). `README.md` shall contain `Welcome to FeatherSpec` and `/sdd-setup` in its empty-state
  description; `CHANGELOG.md` `Welcome to FeatherSpec`; `docs/release-checklist.md` a 0029 section with AC-013, AC-014.
- **AC-013** *(manual, preview harness, by the orchestrator)* Guideline 12: the Overview and the Board of
  `fs-setup-not-run`, and the Overview of `fs-setup-done-no-specs`, in Dark, Light and High Contrast at 1600 px and
  1000 px window width with the side panel open: the glyph is visible in each theme, no text or button is cut, no word
  breaks inside itself, and glyph, heading, body and action stand together in that order in one container. Screenshots go into the plan.
- **AC-014** *(manual, Gregor, Hands-On on a fresh `tip-splitter`, with GitHub Copilot and Claude Code)* After *Set up
  FeatherSpec* the Studio welcomes him and offers `/sdd-setup`; Send puts it into the assistant; after `/sdd-setup` the
  empty state reads `No specs yet. Start with /sdd-specify` without a reload. He notes the versions.
- **AC-015** Every test at the commit on which implementation starts shall exist at the head and pass; `npm run
  test:unit` and `npm test` shall pass on Windows and in CI.

## 10. Technical notes for developers or AI agents

- As-is (`62f43a5`): `NO_SPECS_START_TEXT`, `SDD_SPECIFY_LINE` (`src/shared/protocol/texts.ts`) feed
  `Overview.tsx` (`view.figures.kind === 'empty'`, `EmptyState icon="Backlog"`, `CopyButton`), `SpecBoard.tsx`
  (`board.noSpecs`) and `specTree.ts` (`groups.length === 0` → `message`). Up next: `NOTHING_UP_NEXT_TEXT`
  (`webview/areas/overview/texts.ts`, `Now.tsx` `UpNext`). Command: `NO_STEP_MESSAGE`, `NO_STEP_COPY_LINE`
  (`core/copyNextStep/copyNextStepTexts.ts`). No empty state uses Send today.
- Send: `StepAction` (`webview/ui/StepAction.tsx`) takes a `SendView`; `sendViewOf(offer, stepCase)` without context gives
  target `new` and no attachment (`core/assistant/sendView.ts`). The Overview view already receives `offer`.
- Reading: discovery reads `AGENTS.md` text (`classifyFolder` → `agentsText`, `readVersionLine()`); `MARKER_WATCH_PATHS`
  is `AGENTS.md`, `.specs`, `.featherspec-setup`; the file watch pattern covers `.specs/**/*.md` and return notes only, so
  the brief is watched nowhere today. `sameActive()` compares root, version, legacy. Proposal: a pure
  `readSetupSign(agentsText, briefText)` beside `readVersionLine()`, a field on `DiscoveredFolder`/`ProjectRead`, the
  brief added to the marker watch paths, `sameActive()` comparing the field.
- Name clash: `setupPending` (0014, `.featherspec-setup/`) is a different thing; call the new field e.g. `setupRun`.
- Glyphs are inline SVG paths in `webview/board/icons.tsx` (`GlyphKind`); the logo mark's path is `media/studio.svg`.
- `fs180-de-baselines` reads *setup not run* (brief `TBD`, `never`, `DocLanguage: German`, 4 specs). The five A-3
  fixtures and the repo copies have no brief or no `# last reconciled:` line: unknown, unchanged.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | The sign is the project brief's three sections at `TBD` and the snapshot at `never`, both (proxy; the narrowest reading of FeatherSpec's "or") | `sdd-setup.md` names exactly these two as "touched"; setup always writes the brief (*Actions you must perform*: "Update `.memory-bank/projectbrief.md` with mission + primary users + success criteria"); `activeContext.md` keeps `TBD` lines in normal use; requiring both means a false welcome needs two untouched files | AC-001, AC-002; a setup that leaves the brief at `TBD` keeps the welcome until the snapshot is reconciled |
| A-002 | Unknown behaves as today, never blocks (decided: standing answer) | A wrong welcome on a set-up project costs more than a missed one: today's empty state is still a valid step | AC-002, AC-006 |
| A-003 | §7's texts (proxy) | Gregor's heading; the body names what `/sdd-setup` does in its own terms (`AGENTS.md` command table: "`DocLanguage`, Memory Bank, architecture snapshot"); guideline 11 keeps it to two sentences | §7, AC-003, AC-004 |
| A-004 | The Board's empty state and the *Copy next step* command follow too, though the standing answer names Overview, tree and Up next (proxy) | They show the same wrong first step; guideline 1 (one source for the next step) and 10 (one step, one wording) | AC-004, AC-008 |
| A-005 | No coach line and the default target `new chat` for `/sdd-setup` (proxy) | Guideline 11 places advice beside a spec's step; 0026 PD-078 defaults to the new chat; setup opens a session of its own | AC-003, AC-005 |
| A-006 | With specs, the one quiet line is Up next's existing empty line, rewritten; nothing else (decided by guideline 7 and 11, as the standing answer asks) | No new block, no layout shift; Up next is where "what next" is answered when nothing waits | AC-007 |

## 12. Open points

- OP-001 FeatherSpec 1.11.0 is unreleased; the sign rests on `sdd-setup.md` at `04c569d`. If the release words the
  "touched" rule differently, §6.1 is re-checked before the spec closes.
- OP-002 `/sdd-clarify` 2026-11-19 (stranger pass, no subagent available): 17 findings, 3 blocking, resolved in one
  pass at Gregor's standing request. Blocking: (a) "the body under each" had no end, now up to the next `#` line;
  (b) CRLF and BOM (Windows) were unnamed, now read alike; (c) AC-002's "`AGENTS.md` unreadable" could not hold, since
  0001 then reads no project — moved to §8. Others: "setup" named three things (§6.1 now says `/sdd-setup`); Out of
  scope against §6.3's *Copy next step* row (reworded); AC-006 compares the same files; AC-009's notification named;
  AC-010's exception narrowed; AC-011 "emoji" decided by a Unicode property, `currentColor` stated as behaviour; AC-013
  "one block" made observable; AC-003 `aria-hidden` as behaviour; Problems and Activity stay (§6.3); `TBD.`, `tbd`
  and extra lines named (§6.1, AC-002); an open Send menu on a switch (§8); A-001's `activeContext.md` reason kept as
  stated; A-004 kept as a proxy; PD-090's number checked free at writing (PD-089 is the last).

## 13. Ready, Done and next steps

Ready: clarified 2026-11-19 (OP-002); planned 2026-11-19, 6 steps in 3 stages. Done per the DoD of `AGENTS.md`; AC-013 by the
orchestrator, AC-014 by Gregor. Closed 2026-11-20 by `/sdd-lifecycle`; AC-014 (Gregor) and CI on PR #2 stay open.

## Plan history

- 2026-11-20 — [0029-onboarding-before-setup.2026-11-20.plan.md](../plan-archive/0029-onboarding-before-setup.2026-11-20.plan.md) — 6 steps in 3 stages: the welcome and `/sdd-setup` before `/sdd-specify` while setup has not run; preview 12 of 12 clean; Windows `npm test` at 48d4056 passed; manual items open: AC-014 (Gregor), CI on PR #2.
