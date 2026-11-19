# Plan — Onboarding Before /sdd-setup

**Spec:** [0029-onboarding-before-setup.md](0029-onboarding-before-setup.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-004

## Approach

One pure rule, read where `AGENTS.md` is already read: `readSetupSign(agentsText, briefText)` beside `readVersionLine()`
in discovery, carried as one field to the model, so a change to either file re-reads it through the existing discovery
rerun (PD-033) once the brief joins the marker watch paths (T-001, the riskiest: it touches discovery and the watch).
The surfaces then branch on that field only: the welcome in the Overview and Board empty states, with the existing
`StepAction` for Send or Copy (T-002); the three text-only places, tree, Up next, *Copy next step* (T-003). Stage 2 proves
the live switch and that every other project is unchanged; stage 3 is the preview, §5's notes, docs, PD-090 and the gates.
No new module beyond the rule's file, no dependency, no component but the glyph kind. Memory Bank touched in T-006 only:
`activeContext.md`; `systemPatterns.md` gets no entry (no new pattern).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-001: wiring of the watch; T-006)
· pre-done `npm test` on Windows and CI, run by the orchestrator (cannot run here).

## Research

**Checkpoint digest (2026-11-19, Mode A; answered from the standing answer `orch/SPEC-0029.md`, Gregor not reachable).**
- The sign is FeatherSpec's own (`sdd-setup.md` *Session opening* at `04c569d`); A-001 narrows its "or" to "both untouched".
- Survey at `62f43a5`: `NO_SPECS_START_TEXT`, `SDD_SPECIFY_LINE` (`shared/protocol/texts.ts`) in `Overview.tsx`,
  `SpecBoard.tsx`, `specTree.ts`; `NOTHING_UP_NEXT_TEXT` in `Now.tsx`; `NO_STEP_MESSAGE`, `NO_STEP_COPY_LINE` in
  `copyNextStep.ts`. `classifyFolder()` returns `agentsText`; `discoverWorkspace.ts` builds `DiscoveredFolder`;
  `MARKER_WATCH_PATHS` = `AGENTS.md`, `.specs`, `.featherspec-setup`; `discoveryController.sameActive()` compares root,
  version, legacy. `sendViewOf(offer, case)` without context: target `new`, no attachment. Glyphs: `board/icons.tsx`.
- Existing fixtures: only `fs180-de-baselines` reads *setup not run* (4 specs); the rest lack a brief or the
  `# last reconciled:` line. `nextStepBaseline.test.ts` lists snapshots by file, so new spec-less fixtures need none.
- `docsScan.test.ts` and both `problems.test.ts` green at `62f43a5` (202 tests); this plan links a file that exists.
- No `done/` spec becomes a `Deprecated` candidate: 0006, 0007 (done) and 0017, 0018, 0020 (active) get §5 notes.
- [VS Code API: TreeView](https://vscode-api.netlify.app/interfaces/vscode.treeview) — `message` is a plain string; a
  Markdown message is only a proposed API (`vscode.proposed.treeViewMarkdownMessage.d.ts`), so the tree gets text, no
  glyph or button (spec §6.4). Retrieved 2026-11-19.

## Stages

1. T-001 → T-002 — the sign read and re-read; the welcome in the Overview and the Board
2. T-003 → T-004 — tree, Up next and *Copy next step*; live switch and the unchanged rest
3. T-005 → T-006 — preview evidence; §5 notes, docs, PD-090 and final gates

No parallel stage: T-002 and T-003 share `shared/protocol/texts.ts` and the model field; the rest builds on them.

## Steps

### T-001 — Read the sign and re-read it on change

- **Covers:** AC-001, AC-002
- **Do:** `test/fixtures/fs-setup-not-run` (template `AGENTS.md`, `.memory-bank/*.md` verbatim from FeatherSpec
  `04c569d`, `.specs/README.md` and `.gitkeep` folders) and `test/fixtures/fs-setup-done-no-specs` (brief filled,
  `# last reconciled: 2026-11-19`). Pure `readSetupSign(agentsText, briefText | undefined)` in
  `core/discovery/setupSign.ts` (§6.1: headings, bodies up to the next `#` line, CRLF, BOM, `never` before `·`).
  `classifyFolder()` reads the brief (stat `file`, else undefined); `DiscoveredFolder` and `ProjectRead` get
  `setupRun: 'not run' | 'run or unknown'`; `sameActive()` compares it; `.memory-bank/projectbrief.md` joins
  `MARKER_WATCH_PATHS`. Tests: `setupSign.test.ts` "0029 AC-001 …", "0029 AC-002 …" (each variant, red first);
  `discoverWorkspace.test.ts` for both fixtures.
- **Verify:** `npx vitest run --project node src/core/discovery/` — red first (no `readSetupSign`), then green; gate 5.
- [x] **Verified (T-001):** 2026-11-19 red: `npx vitest run src/core/discovery/setupSign.test.ts` 25 failed, 1 passed (stub threw `Not implemented`); `npx vitest run src/core/specs/activeProjectFeed.test.ts` 2 failed (no `setupRun` on the model). Green: `npx vitest run src/core/specs src/core/discovery src/adapters/node/docsScan.test.ts` 29 files, 655 tests passed; `npx tsc --noEmit` clean.
- **Notes:** Proxy decisions: (1) `setupRun` is optional on `DiscoveredFolder`, `ProjectRead` and `RepositoryProject`, so the many test builders and deep-equal snapshots of other projects stay as they are; `discoverWorkspace` always sets it, absent reads as *run or unknown*. (2) `classifyFolder()` returns `briefText`; a brief that cannot be read gives `undefined`, no message (§8). (3) The model gets the sign through `RepositoryProject` (`connectActiveProject` compares it, so a switch re-opens the project and every service re-renders: no new watcher); `buildProject` takes it as a last optional parameter. (4) The VS Code marker watch also listens to `onDidChange` of the brief (`BRIEF_WATCH_PATH`); that adapter has no unit test, tsc only. (5) `activeContext.md` names 0029 now, because `docsScan.test.ts` requires every spec in `active/` on a line; T-006 rewrites it.

### T-002 — The welcome in the Overview and the Board

- **Covers:** AC-003, AC-004 (Board), AC-005, AC-006 (Overview, Board), AC-011
- **Do:** texts of §7 in `shared/protocol/texts.ts` (`WELCOME_HEADING`, `WELCOME_BODY`, `SETUP_LINE`); glyph kind
  `feather` (path of `media/studio.svg`, `fill="currentColor"`, `aria-hidden`). `OverviewView` and the board view get
  `welcome?: { send?: SendView }` while `setupRun === 'not run'` and no spec (`sendViewOf(offer, …)`, no context).
  `Overview.tsx` and `SpecBoard.tsx` render `EmptyState icon="feather"` with heading, body and `StepAction` for
  `/sdd-setup` (primary) instead of today's text and Copy. Tests: `Overview.test.tsx`, `SpecBoard.test.tsx` "0029 AC-003
  …", "0029 AC-004 …" (literal texts, no `/sdd-specify`, Send with and without offer, no attachment line), "0029 AC-005 …"
  (send and copy request carry `/sdd-setup`), "0029 AC-006 …" (`fs-setup-done-no-specs` as today); `visibleLiterals`
  "0029 AC-011 …" (each text once, no `\p{Extended_Pictographic}` in the text modules, glyph without own colour).
- **Verify:** `npm run test:unit` — red first (today's empty state), then green.
- [x] **Verified (T-002):** 2026-11-19 red: `npx vitest run src/core/overview/welcome0029.test.ts src/webview/welcome0029.test.tsx src/adapters/node/visibleLiterals.test.ts` 15 + 1 failed (no `welcome` on either view, no glyph, no text); the negative controls passed at once, as meant. Green: `npx vitest run src/webview src/core/overview src/core/board src/adapters/node/visibleLiterals.test.ts src/shared` 108 files, 1540 tests passed after the snapshot fix below; `npx tsc --noEmit` and `-p src/webview` clean. Stage 1 gate chain (eslint, both tsc, `npm run test:unit` 207 files, 3741 tests, compile, compile-tests) green after two fixes: plan status spelled `In Progress`, test constant renamed (the removed-feature scan matches `copilot` in any case).
- **Notes:** (1) The plan's survey was wrong on one point: `nextStepBaseline.test.ts` lists snapshots by fixture directory, so each new fixture needs a snapshot file; `test/fixtures/next-step-baseline/fs-setup-not-run.json` and `fs-setup-done-no-specs.json` hold `{}` (no spec). (2) `welcome` is on `OverviewView` and `BoardView` as `WelcomeView { send?: SendView }`, built by `core/assistant/welcome.ts:welcomeOf` (setup not run and no lifecycle entry), with `plainSendViewOf()` split out of `sendViewOf()`; the Overview guard accepts it only with empty figures, the Board guard only with `noSpecs`. (3) The component is `webview/ui/Welcome.tsx` (EmptyState, `data-welcome`, `h2`, `p`, one `StepAction` primary); the glyph path is `webview/board/featherPath.ts`, copied from `media/studio.svg`. (4) The Send menu holds a Copy prompt item with class `copy-button`, so the test asserts one `button.send-main`, not zero copy buttons. (5) AC-011's "each text once" is checked for heading, body and `SETUP_LINE` here; T-003 adds the rest.

### T-003 — Tree, Up next and Copy next step

- **Covers:** AC-004 (tree), AC-006 (tree, command), AC-007, AC-008
- **Do:** §7's tree, Up next and command texts; `specTree.ts` message by `setupRun`; `UpNext` line and icon Copy of
  `SETUP_LINE` by a view flag; `copyNextStep.ts` message and copy line by `setupRun`. Tests: `specTree.test.ts` "0029
  AC-004 …", `Now.test`/`Sections.test.tsx` "0029 AC-007 …" (specs exist: no welcome, Up next line only without rows),
  `copyNextStep.test.ts` "0029 AC-008 …", each with the `setupRun` negative control.
- **Verify:** `npm run test:unit` — red first, then green.
- [x] **Verified (T-003):** 2026-11-19 red: `npx vitest run src/core/shell/specTree.test.ts src/core/copyNextStep/copyNextStep.test.ts src/core/overview/upNext0029.test.ts src/webview/welcome0029.test.tsx` 4 failed (tree and command still say `/sdd-specify`, no `setup` flag on Up next), the negative controls green. Green: the same plus `src/core/copyNextStep src/core/overview src/webview/areas/overview src/shared` 510 tests passed, `src/adapters/node/visibleLiterals.test.ts` 5 passed (all six §7 texts once); `npx tsc --noEmit` and `-p src/webview` clean.
- **Notes:** Up next carries `setup?: true` on `OverviewUpNext` (set only with specs, no row, setup not run); the Situation `none` of *Copy next step* carries `setupRun?: 'not run'`; the tree reads the model's sign. Texts: tree in `shared/protocol/texts.ts`, Up next line in `webview/areas/overview/texts.ts`, command message in `copyNextStepTexts.ts`. Cadence v2 (Gregor): no full chain at stage ends; the stage 1 chain had already run green.

### T-004 — Live switch and the unchanged rest

- **Covers:** AC-009, AC-010, AC-006 (every variant)
- **Do:** tests only. `onboarding0029.timing.test.ts` (shell world, `BUDGET_MS.uiFreshness`): brief filled, brief deleted,
  `never` → date and back → Overview, Board, tree switch, selection and area kept. `onboarding0029.test.ts`: every project
  under `test/fixtures/` and this repo render Overview, Board, tree and `nextStep()` as with `setupRun` forced to
  `run or unknown`, the one exception `fs180-de-baselines`' Up next line; AC-002's variants read *run or unknown* render
  as today. Negative control: forcing `not run` on `fs-setup-done-no-specs` changes the render.
- **Verify:** `npx vitest run src/core/shell/onboarding0029.test.ts` and `npx vitest run --project timing-node src/core/shell/onboarding0029.timing.test.ts`
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — Preview at two widths and three themes

- **Covers:** AC-013
- **Do:** the orchestrator's harness (`/home/claude/orch/preview/run.sh`) on `fs-setup-not-run` (Overview, Board) and
  `fs-setup-done-no-specs` (Overview): Dark, Light, High Contrast at 1600 px and 1000 px, side panel open, Send offered;
  add both as scenarios to `host.mts`; screenshots linked in `Notes:`.
- **Verify:** manual: the orchestrator looks for the glyph in each theme, cut text or buttons, words broken inside
  themselves, and glyph, heading, body, action in one container in that order; jsdom has no layout engine.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Notes, docs, PD-090 and final gates

- **Covers:** AC-012, AC-014 (into the checklist), AC-015, and re-proves AC-001…AC-011
- **Do:** §5's notes under 0006 AC-020, 0007 AC-021, 0017 (no item), 0018 O-8, AC-011, AC-012, 0020 §6 row "0 specs";
  PD-090 in `docs/product/product-decisions.md`; `README.md` empty-state description, `CHANGELOG.md` (0.1.0 *Added*),
  `docs/release-checklist.md` section 0029 with AC-013, AC-014; `docsScan.test.ts` "0029 AC-012 …"; title audit (every
  title at the Baseline exists at the head); `activeContext.md`. All gates 1–5.
- **Verify:** gates 1–5 green; `npx vitest run src/adapters/node/docsScan.test.ts src/core/lifecycle/problems.test.ts`.
- [ ] **Verified (T-006):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `src/core/discovery/setupSign.ts:readSetupSign`, `discoverWorkspace.ts` | `setupSign.test.ts`, `discoverWorkspace.test.ts` | verified |
| AC-002 | T-001 | `setupSign.ts`, `classifyFolder.ts:briefText`, `markerWatchPaths.ts`, `specs/activeProjectFeed.ts` | `setupSign.test.ts`, `activeProjectChanged.test.ts`, `activeProjectFeed.test.ts` | verified |
| AC-003 | T-002 | — | — | open |
| AC-004 | T-002, T-003 | — | — | open |
| AC-005 | T-002 | — | — | open |
| AC-006 | T-002, T-003, T-004 | — | — | open |
| AC-007 | T-003 | — | — | open |
| AC-008 | T-003 | — | — | open |
| AC-009 | T-004 | — | — | open |
| AC-010 | T-004 | — | — | open |
| AC-011 | T-002 | — | — | open |
| AC-012 | T-006 | — | — | open |
| AC-013 | T-005 | — | manual: orchestrator, preview harness | open |
| AC-014 | T-006 (checklist) | — | manual: Gregor, Hands-On on `tip-splitter` | open |
| AC-015 | T-006 | — | `npm run test:unit`; `npm test` is the orchestrator's | open |

## Session handoff

- **Done so far:** T-001 (sign read, re-read, carried to the model); T-002 (welcome in Overview and Board).
- **Next action:** T-004 (T-003 done)
- **Open decisions:** — (OP-001: FeatherSpec 1.11.0 unreleased; the sign rests on `04c569d`)
- **Baseline:** `0982b84` (head before the first step commit; "the commit on which implementation starts")
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
