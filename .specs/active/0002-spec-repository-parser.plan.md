# Plan — Spec Repository & Parser

**Spec:** [0002-spec-repository-parser.md](0002-spec-repository-parser.md)
**Status:** In Progress
**Last updated:** 2026-11-16
**Current step:** T-011

## Approach

A new pure core module `src/core/specs/` reads one project through a new read-only port
`SpecSourcePort` (list without following links, stat with modification time, read bytes) and
a `FileWatchPort` (ADR-001 names both). 0001's `ReadOnlyFileSystem` is left untouched: it
decodes without a UTF-8 check and reports neither mtime (PD-043) nor symbolic links. Text is
decoded with `TextDecoder('utf-8', { fatal: true })` (BOM stripped) and normalised to LF once,
so every parser works on one shape (AC-020). Two pure parsers (spec, plan) are independent
modules and form the one `‖` pair; joining, diagnostics and the version check sit on top; the
repository (snapshot, debounced incremental re-read by event path and mtime/size, change
notification) reuses 0001's `ClockPort` and `createRerunScheduler` by import only. Order:
port and file isolation first (everything else reads through it), the risky watcher wiring
last but before the docs. Memory Bank touched at T-009: `systemPatterns.md`,
`techContext.md`, `activeContext.md`.

Decisions this plan makes (spec §8 left them to the plan):
- Field presence: `{ state: 'absent' } | { state: 'empty' | 'placeholder' | 'value'; raw }` (AC-019).
- Diagnostic kinds: `unreadable-file · unknown-content · duplicate · orphan · dangling-link ·
  unverified-version`; scope `{ file: key, line? } | 'project'`; reason in English.
- `modifiedMs` = the `mtime` number (ms since epoch) the port reported with the read (AC-023).
- Change notification `{ references: string[]; untied: boolean; cause: 'files' | 'rescan' | 'project' }`.
- Link targets resolve relative to the linking file; a target outside the root is never
  stat'ed or read and counts as dangling (AC-017, AC-021).
- Stems join case-sensitively; event paths are mapped to keys case-insensitively on Windows
  and macOS (ADR-001 §9 Consequences).

**Quality gates:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit`
· `npm run compile` (T-008, T-009) · pre-done on CI: `npm test`.

## Research

- Survey (2026-11-16): 0001 built — `src/core/ports/{readOnlyFileSystem,host}.ts`,
  `src/core/discovery/*` (`DiscoveredFolder.root` = URI string, `.version` = raw or
  `unknown`), `rerunScheduler.ts` (debounce, reusable), adapters `src/adapters/{node,vscode}`,
  composition `src/extension.ts` (`StudioApi { snapshot, whenIdle }`). The discovery
  controller now has `onDidChangeActiveProject(listener)` (0001 AC-023, implemented 2026-11-16; first
  result always, later only on change, no replay: a late subscriber reads `snapshot().active`). T-008
  subscribes to it; no decorator, no 0001 file changes (Gregor, 2026-11-16).
- Survey: `snapshotTree` (0001 testing helper) records size + mtime per file — reused for
  AC-013. `.vscode-test.mjs` already copies `fs110-de-active-review` into the host workspace;
  the new host test reuses it, the config stays unchanged.
- Survey: samples in `/home/claude/samples/` (no `.claude/`, `.github/`); legacy-shop holds
  exactly 9 spec files (AC-001 example). `fs110-de-active-review` (0001's TS110 copy) is
  reused read-only.
- `@types/vscode` 1.146.0 (`node_modules`, version in use): `FileStat.mtime` = ms since
  epoch; `FileType.SymbolicLink = 64` as bitmask; glob `{}` groups; watcher events may be
  folded (folder delete = one event), honour `files.watcherExclude`, report path casing that
  can differ on Windows/macOS, do not follow links — local copy, retrieved 2026-11-16.
- Node v22.23.4 (sandbox) run 2026-11-16: `TextDecoder` global; `fatal: true` throws
  `ERR_ENCODING_INVALID_ENCODED_DATA` on `0xFF`; BOM stripped by default;
  `readdir({ withFileTypes })` reports a link as `isSymbolicLink()`, not `isFile()`;
  `stat().mtimeMs` is a number. Docs: [Node util — TextDecoder](https://nodejs.org/api/util.html#class-utiltextdecoder),
  [Node fs](https://nodejs.org/api/fs.html) (pages truncated in fetch; behaviour settled by the run).
- [Semantic Versioning 2.0.0 §11](https://semver.org/) — precedence: numeric major/minor/patch,
  pre-release lower than release, build metadata ignored → `1.8.0-rc3` in range, `1.10.1`
  newer than known; own comparator, no dependency. Retrieved 2026-11-16.
- PD-043 (newer than the spec) applied to the spec first: BR-01, §8, §9, FR-03, AC-023 (R-003).
- Spec open points built as their "until decided" text: OP-003 (no entry, no diagnostic),
  OP-004 (link both), OP-005 → A-006 (links not followed, unreadable), OP-006 (no diagnostic).
- No new dependency.

## Stages

1. T-001 — port, Node adapter, file listing, identity, isolation, fixtures
2. T-002 ‖ T-004 — spec header/sections and plan steps: separate modules and tests
3. T-003 ‖ T-005 — criteria/FR locator and plan structure: separate modules and tests
4. T-006 → T-007 — joined project read, then the live repository
5. T-008 → T-009 — VS Code adapters and composition, then docs sync and final gates
6. T-010 → T-011 — spec changed 2026-11-16 (`/sdd-compile` follow-up): three-dot `Covers:` range named by a test (AC-008), same-project re-report and `AGENTS.md` edit named by tests (AC-022)

Parallel: stages 2 and 3 (spec parser files vs. plan parser files, each with its own test
file; shared types and the text normaliser exist from T-001). Recommended: in sequence —
the slices are small.

## Steps

### T-001 — Read the project's files in isolation

- **Covers:** AC-001, AC-002, AC-011, AC-020, AC-023
- **Do:** `src/core/ports/specSource.ts` (`list`, `stat` → kind/mtime/size, `readBytes`; no
  write method). `src/adapters/node/nodeSpecSource.ts`. `src/core/specs/files.ts`: list the
  three lifecycle folders, `plan-archive/`, `.memory-bank/`; classify names (spec, sibling
  plan, archived plan, return note, ignored); decode + LF; key/reference/number/slug/folder,
  `modifiedMs`; per-file failure → `unreadable-file`; symbolic link → `unreadable-file`
  (A-006). `src/core/specs/diagnostics.ts` (kinds, scope). Fake `src/core/specs/testing/memorySpecSource.ts`.
  Copy fixtures: `test/fixtures/fs180-en-done-archived` (TS180), `fs180-de-baselines` (HU180),
  `fs170-brownfield-mixed` (LS170); hand-made `fs-broken` (invalid UTF-8 spec, `.gitattributes`
  `-text` for it). Tests `files.test.ts`: AC-001 on LS170 = 9 entries; AC-002 move keeps the
  reference; AC-011 on `fs-broken`; AC-020 LF/CRLF/BOM variants in memory equal; AC-023 mtime
  from the port, absent when stat fails; symlink case on a temp dir (skipped where the OS
  refuses to create one).
- **Verify:** `npm run test:unit -- src/core/specs/files.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-001):** 2026-11-16 · `npm run test:unit -- src/core/specs/files.test.ts`: red first, 15 of 15 failing with `Not implemented` → green 15 of 15; negative controls: symlink branch off → 2 symlink tests red, non-fatal decoder → fs-broken and AC-023 tests red, both restored. Gates: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run test:unit` (137 tests, was 122) green.
- **Notes:** Beyond `Do:`: shared building blocks for stage 2 and 3 live in `src/core/specs/fieldValue.ts` (`FieldValue`, AC-019) and `src/core/specs/text.ts` (`decodeText`, `normalizeText`); `src/core/specs/diagnostics.ts` holds `Diagnostic`. Parsers receive already-normalised LF text. Symlinked `.specs`, lifecycle, archive or `.memory-bank` folders are not listed: `unreadable-file` diagnostic scoped to the folder. A file entry whose content is unreadable stays in `files` (AC-001) with `content: { state: 'unreadable', reason }`. `modifiedMs`/`size` are `number | undefined` (undefined = the port reported none). Fixture `fs-broken` holds three specs, one invalid UTF-8; T-006 extends it (duplicate, orphan) if needed. Symlink test with real links skips where the OS refuses them.

### T-002 — Parse spec header lines and sections

- **Covers:** AC-003, AC-009, AC-014, AC-019
- **Files:** `src/core/specs/parseSpec.ts`, `src/core/specs/parseSpec.test.ts`
- **Do:** title (H1), header lines `Status · Plan · Ticket · Origin · Validated by · Clarified`
  with presence state, other bold header lines as unsupported content + `unknown-content`;
  unknown `**Status:**` value + diagnostic; `**Plan:**` classification (placeholder `_none yet_`
  / `_none_` / `—`, sibling link, archive link, other); body as ordered level-2 sections
  (pre-heading section); `## Plan history` lines; checkboxes never read as steps. Fixtures
  TS110, TS180, HU180, LS170 text.
- **Verify:** `npm run test:unit -- src/core/specs/parseSpec.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-002):** 2026-11-16 · `npm run test:unit -- src/core/specs/parseSpec.test.ts`: red first (38 of 38 `Not implemented`) → green 38 of 38; worker's negative controls (fence tracking, Status diagnostic, archive classification, Plan-history heading, blank-line skip) red then restored. Integrated by the main session: file re-run 38 green; gates eslint, tsc, `npm run test:unit` (202 tests) green. Test review: accepted by Gregor 2026-11-16 (worker could not stop).
- **Notes:** API `parseSpec(text, key): ParsedSpec`; header fields `{ value: FieldValue; line? }`; `planClassification` absent | empty | placeholder | sibling | archive | other. Header block = contiguous `**Label:** value` lines after the H1; a repeated known label keeps the first, the repeat is unsupported content + `unknown-content`. Status check case-sensitive; `## Plan history` matched exactly. T-003 adds criteria and `FR-` fields in this file.

### T-003 — Locate acceptance criteria and FR requirements by content

- **Covers:** AC-003, AC-004, AC-005, AC-015
- **Files:** `src/core/specs/leadingIds.ts`, `src/core/specs/leadingIds.test.ts`, `src/core/specs/parseSpec.ts`
- **Do:** BR-07 locator: `AC-NNN` as leading token of a list item or bold paragraph (emphasis,
  strike marks, `[Uncertain]` skipped), full item text with annotations, directly following
  blockquote as illustration, location, *uncertain* and *struck* flags; `FR-` IDs (dotted
  parts) also as first table cell; references elsewhere ignored; duplicate AC in one spec →
  all kept + `duplicate`. Hooked into `parseSpec`. Every rendering of format §3.4 as a case;
  struck shape marked UNVERIFIED in the test name.
- **Verify:** `npm run test:unit -- src/core/specs/leadingIds.test.ts src/core/specs/parseSpec.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-003):** 2026-11-16 · `npm run test:unit -- src/core/specs/leadingIds.test.ts src/core/specs/parseSpec.test.ts`: red first (30 of 30 `Not implemented`) → green 69 of 69 after the main session extended the key list in the T-002 test; worker's negative controls (paragraph start, uncertain flag, blockquote break) red then restored. Integrated: gates eslint, tsc, `npm run test:unit` (272 tests) green. Test review: accepted by Gregor 2026-11-16.
- **Notes:** API `locateLeadingIds(lines, fenced, key)`; `fencedLines` moved into `leadingIds.ts`; `ParsedSpec` gains `criteria` and `requirements`; `text`/`illustration` are raw source lines; `[Uncertain]` counts only before the ID; struck = `~~` before the ID (UNVERIFIED); FR duplicates not flagged. Main session added `criteria`/`requirements` to the exact key list in `parseSpec.test.ts` (AC-009 test, file outside this step's `Files:`).

### T-004 — Parse plan steps in both dialects

- **Covers:** AC-007, AC-008, AC-015
- **Files:** `src/core/specs/planSteps.ts`, `src/core/specs/planSteps.test.ts`
- **Do:** steps keyed on `### T-\d+`: title, dialect (box on `Verified (T-NNN):` / on
  `Covers:` / undetermined + diagnostic), ticked, struck, `Covers` raw + expanded IDs (`AC-a …
  AC-b`, a ≤ b; otherwise IDs as written), `Files`, `Do`, `Verify`, `Verified` (placeholder
  `—`), `Notes`; unknown step field → unsupported + diagnostic; duplicate `T-NNN` → all kept +
  `duplicate`. Fixtures TS110 (1.10), TS180/LS170 (≤ 1.9).
- **Verify:** `npm run test:unit -- src/core/specs/planSteps.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-004):** 2026-11-16 · `npm run test:unit -- src/core/specs/planSteps.test.ts`: red first (27 of 27 `Not implemented`) → green 27 of 27; worker's negative controls (range check, dialect rule) red then restored. Integrated: file re-run 27 green; gates green (202 tests). Test review: accepted by Gregor 2026-11-16.
- **Notes:** API `parsePlanSteps(text, fileKey) → { steps, diagnostics }`, `expandCovers(raw)`; `ticked: boolean | 'undetermined'`; dialect `verified-line | covers-line | undetermined`; struck step = `### ~~T-NNN — title~~` (UNVERIFIED); ranges over 1000 IDs expand to the endpoints only; step blocks end at any heading of level 1-3; repeated field: first wins. T-005 imports `planSteps.ts`.

### T-005 — Parse plan header, stages, traceability and handoff

- **Covers:** AC-007, AC-009, AC-014
- **Files:** `src/core/specs/parsePlan.ts`, `src/core/specs/parsePlan.test.ts`, hand-made
  fixtures `test/fixtures/fs110-parallel-synthetic`, `test/fixtures/fs110-ready-synthetic`
- **Do:** header lines `Spec · Status · Last updated · Current step` raw (others unsupported);
  sections of format §4.2 (others unsupported + diagnostic); stages `→`/`‖`, raw line, closing
  line; traceability rows (state, test cell, `manual:` flag; unknown state or columns →
  diagnostic); handoff fields raw (unknown field → unsupported); unknown plan `**Status:**`
  value + diagnostic; uses `planSteps`. Synthetic fixtures carry `‖`, `Files:`, `Blocked`,
  return notes DONE + BLOCKED, `**Ticket:**`, `Deprecated`, `-2` archive (UNVERIFIED).
- **Verify:** `npm run test:unit -- src/core/specs/parsePlan.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-005):** 2026-11-16 · `npm run test:unit -- src/core/specs/parsePlan.test.ts`: red first (39 of 39 `Not implemented`) → green 39 of 39; worker's negative controls (column check, `manual:` flag, stage-head split, section cut, repeated-field rule) red then restored; main session's control for the skeleton placeholder (rule off → 1 red). Integrated: gates green (272 tests). Test review: accepted by Gregor 2026-11-16.
- **Notes:** API `parsePlan(text, fileKey): ParsedPlan` (header, stages, steps via `parsePlanSteps`, traceability, handoff, `unsupported`, `diagnostics`). Gregor 2026-11-16: (a) a traceability table is supported only with the five format columns exactly, otherwise unsupported + diagnostic; (b) skeleton text `_(…)_` in the handoff is a placeholder (spec §8 placeholder set extended; `SKELETON_PLACEHOLDER` in `parsePlan.ts`, test renamed AC-019); (c) fixture directories in `Files:` are fine. Fixtures `fs110-parallel-synthetic`, `fs110-ready-synthetic` added.

### T-006 — Join plans and return notes; project diagnostics

- **Covers:** AC-006, AC-010, AC-015, AC-016, AC-017, AC-021
- **Do:** `src/core/specs/readProject.ts`: run `files` + both parsers into one `ProjectRead`;
  link sibling and archived plans (date, suffix) to every entry with the stem, orphan plan +
  `orphan`; parse return notes (`Status` known values `DONE`/`BLOCKED`), link by number,
  unlinked + `orphan`; same stem in two folders / one number with two slugs → `duplicate`
  naming the others; dangling `**Plan:**` / sibling `**Spec:**` (archived exempt); targets
  outside the root never touched; `src/core/specs/version.ts` semver precedence check.
  Tests `readProject.test.ts` on all fixtures + memory cases.
- **Verify:** `npm run test:unit -- src/core/specs/readProject.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-006):** 2026-11-16 · `npm run test:unit -- src/core/specs/readProject.test.ts` (with `version.test.ts`, `returnNote.test.ts`): red first, 55 of 55 failing with `Not implemented` → green 55 of 55; negative controls (archived-plan exemption off, outside-root rule off) each 1 red, restored. Gates eslint, tsc, `npm run test:unit` (327 tests) green.
- **Notes:** Beyond `Files:`-less `Do:`: `src/core/specs/returnNote.ts` (`parseReturnNote`, status DONE/BLOCKED, other value kept + `unknown-content`), tests `version.test.ts`, `returnNote.test.ts`; `readProject(source, root, version, parsers?)` takes the parsers as an optional argument so the AC-011 parse-error case is testable; `testing/memorySpecSource.ts` gained `touched()`. A dangling check applies to any relative link in `**Plan:**` (not only sibling/archive classification); existing files are found in the listing first, else one `stat`. Diagnostic reasons: `plan matches no spec (<ref>)`, `return note matches no spec (number NNNN)`, `reference X also exists in …`, `number N also used by …`, `plan link T points to a missing file`, `spec link T points to a missing file`, `version not verified`, `newer than known`. Entries: `SpecEntry`, `PlanEntry`, `ReturnNoteEntry` in `readProject.ts`.

### T-007 — Live repository: snapshot, watch, rescan, notify

- **Covers:** AC-012, AC-013, AC-018, AC-022
- **Do:** `src/core/specs/specRepository.ts`: `open(project | undefined)`, `rescan()`,
  `snapshot()`, `onDidChange`, `whenIdle()`, `dispose()`; complete snapshot swap; watch
  events debounced 200 ms via `createRerunScheduler`; incremental re-list and re-read of files
  named in events or changed in mtime/size; affected references by diff (spec file, linked
  plan or note, link gained or lost), `untied` for orphan/unlinked/project changes; `open`
  again → fresh read; `undefined` → stop watching, discard. Fake `FileWatchPort` in
  `testing/`. AC-013 via `snapshotTree` on a temp copy; AC-018 with a generator
  (`testing/generateProject.ts`, 200 specs + plans in a temp dir), Node adapter, real clock:
  full read < 2 s, update < 1 s after the injected event; AC-012 final state equals a fresh read.
- **Verify:** `npm run test:unit -- src/core/specs/specRepository.test.ts` (red, then green) + per-step gates
- [x] **Verified (T-007):** 2026-11-16 · `npm run test:unit -- src/core/specs/specRepository.test.ts`: red first, 19 of 19 failing with `Not implemented` → green 19 of 19 (AC-018: full read of 200 specs + 200 plans + 10 notes and one update, whole test 467 ms); negative controls: forced re-read off → 2 red, mtime reuse off → 1 red, restored. Gates eslint, tsc, `npm run test:unit` (346 tests) green.
- **Notes:** Beyond `Do:`: `src/core/ports/fileWatch.ts` (`FileWatchPort.watch(root, listener(relativePath))`), `testing/fakeFileWatch.ts`; `files.ts` gained an optional `reuse` callback and `readProject.ts` splits out `buildProject` (the repository reads files incrementally, then builds); the incremental pass re-lists and re-stats everything and re-reads only files named in events, changed in mtime/size or new, so folder-level events and missed events are covered. `caseInsensitiveEvents` option for the platform rule (T-008 sets it). `open` of the same project reads fresh (no cache) and always notifies with cause `project`; `open(undefined)` notifies the old references with `untied: true`. The model is rebuilt completely each time (parsing is not cached): 200 specs take well under the 2 s limit.

### T-008 — VS Code adapters, 0001 feed, composition, host smoke test

- **Covers:** AC-012, AC-022
- **Do:** `src/adapters/vscode/vscodeSpecSource.ts` (`workspace.fs`, link bit → `symlink`),
  `src/adapters/vscode/fileWatch.ts` (one watcher per project, `RelativePattern(root,
  '{.specs/**/*.md,.memory-bank/activeContext.*.md}')`); pure `src/core/specs/eventPath.ts`
  (event URI → key, case rule by platform) with unit test; `src/core/specs/activeProjectFeed.ts`
  (reads `controller.snapshot().active`, subscribes `onDidChangeActiveProject` → `repository.open(active)`) with a unit test
  driving the real 0001 controller on its fakes; `src/extension.ts` wires it and adds
  `specs()` to `StudioApi` (additive). Host test `src/test/specRepository.smoke.test.ts`:
  fixture spec in the model; a file written into the temp copy appears through the real
  watcher. Host test runs on CI only.
- **Verify:** `npm run test:unit` + per-step gates + `npm run compile` (red, then green for the unit tests)
- [x] **Verified (T-008):** 2026-11-16 · `npm run test:unit -- src/core/specs/eventPath.test.ts src/core/specs/activeProjectFeed.test.ts`: red first, 12 of 12 failing with `Not implemented` → green 12 of 12; negative controls (initial `snapshot().active` read off, case folding off) red, restored. Gates eslint, tsc, `npm run test:unit` (358 tests) and `npm run compile` green. Host test `src/test/specRepository.smoke.test.ts` written, compiled by tsc, not run here (VS Code download blocked): runs on CI.
- **Notes:** `activeProjectFeed.ts` subscribes `onDidChangeActiveProject` and also reads `snapshot().active` at connect time (the notification has no replay); it opens only when root or version differ from the last one it opened (0001 reports changes only, so an unchanged re-report does not reach the repository: such a re-read comes from the watcher or `rescan()`). `eventPath.ts` exports `eventRelativePath(rootUri, eventUri, platform)` and `isCaseInsensitivePlatform`; the adapter `fileWatch.ts` takes the platform. `StudioApi.specs()` returns the `SpecRepository`; `StudioApi.whenIdle()` now also awaits the repository (additive). The host test deletes its added file and waits for its removal.

### T-009 — Docs sync and final gates

- **Covers:** AC-001 … AC-023 (re-proved by the gates)
- **Do:** `architecture:` snapshot in `AGENTS.md`, exactly: modules add
  `'src/core/specs — spec repository: file listing, spec and plan parsers, joins, diagnostics, live repository (spec 0002)'`;
  change `src/core/ports` to `'src/core/ports — read-only file-system port, spec source and
  file watch ports, and small host ports (status bar, output, state, UI, folders, marker
  watch, clock)'`; change `src/adapters/node` to `'src/adapters/node — Node file-system and
  spec-source adapters for unit tests'`. `src/adapters/vscode` and `test/fixtures` entries
  stay as they are (their wording already covers the new files).
  `systemPatterns.md`: own port beside `ReadOnlyFileSystem` (why), field presence + diagnostic
  identifiers, feed through `onDidChangeActiveProject`. `techContext.md`: new fixtures, AC-018 perf test.
  README: model availability line if README lists features. `activeContext.md` refresh.
- **Verify:** `npx eslint src --max-warnings 0` && `npx tsc --noEmit` && `npm run test:unit` && `npm run compile`; pre-done `npm test` on CI
- [x] **Verified (T-009):** 2026-11-16 · `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` (358 tests, 20 files) · `npm run compile`: all green, zero warnings. Pre-done `npm test` (host suite incl. `specRepository.smoke.test.ts`) not run here: CI.
- **Notes:** `AGENTS.md` snapshot changed exactly as planned (now 214 lines, the cap-eviction proposal from `activeContext.md` stays due). README gained a short *Spec model* section. `systemPatterns.md`: three entries (own port, model conventions, live repository + feed). `techContext.md`: fixtures, AC-018 test, second smoke file.

### T-010 — Three-dot `Covers:` range named by a test

- **Covers:** AC-008
- **Added:** 2026-11-16, spec changed after this plan was Done (the plan still sits beside the spec, so it is extended in place; no ID renumbered). Gregor's decision after `/sdd-compile`: a `Covers:` range is written with `…` or with three plain dots `...`; both are ranges. AC-008 and §12 of the spec say so now; the code already did.
- **Do:** `src/core/specs/planSteps.test.ts`: one test that names both spellings and shows they give the same IDs, inside a longer list; a negative control that two plain dots are no range. No code change.
- **Verify:** `npx vitest run src/core/specs/planSteps` + per-step gates
- [x] **Verified (T-010):** 2026-11-16 · preservation test, green at once by design (code unchanged); control: removing `\.\.\.` from the `RANGE` pattern in `planSteps.ts` turned the new test and the older three-dot test red (2 failed, 27 passed), restored. Green: 29 of 29 in `planSteps.test.ts`.
- **Notes:** no code change; the test is `AC-008: a range written with the ellipsis character … and one written with three plain dots ... are both ranges, with the same result`.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `src/core/specs/files.ts:readProjectFiles` | `files.test.ts` (AC-001 cases) | verified |
| AC-002 | T-001 | `src/core/specs/files.ts:readProjectFiles` | `files.test.ts` (AC-002 move case) | verified |
| AC-003 | T-002, T-003 | `src/core/specs/parseSpec.ts:parseSpec`, `leadingIds.ts:locateLeadingIds` | `parseSpec.test.ts`, `leadingIds.test.ts` | verified |
| AC-004 | T-003 | `src/core/specs/leadingIds.ts:locateLeadingIds` | `leadingIds.test.ts` | verified |
| AC-005 | T-003 | `src/core/specs/leadingIds.ts:locateLeadingIds` | `leadingIds.test.ts` | verified |
| AC-006 | T-006 | `src/core/specs/readProject.ts:readProject` | `readProject.test.ts` (AC-006) | verified |
| AC-007 | T-004, T-005 | `src/core/specs/planSteps.ts:parsePlanSteps`, `parsePlan.ts:parsePlan` | `planSteps.test.ts`, `parsePlan.test.ts` | verified |
| AC-008 | T-004, T-010 | `src/core/specs/planSteps.ts:expandCovers` | `planSteps.test.ts` (AC-008, incl. the three-dot range) | verified |
| AC-009 | T-002, T-005 | `src/core/specs/parseSpec.ts` (plan history), `planSteps.ts`, `parsePlan.ts` (traceability) | `parseSpec.test.ts`, `planSteps.test.ts`, `parsePlan.test.ts` | verified |
| AC-010 | T-006 | `src/core/specs/readProject.ts:readProject`, `returnNote.ts:parseReturnNote` | `readProject.test.ts`, `returnNote.test.ts` (AC-010) | verified |
| AC-011 | T-001, T-006 | `src/core/specs/files.ts:readOne`, `readProject.ts:parseFile` | `files.test.ts`, `readProject.test.ts` (AC-011) | verified |
| AC-012 | T-007, T-008 | `src/core/specs/specRepository.ts`, `src/adapters/vscode/fileWatch.ts`, `eventPath.ts` | `specRepository.test.ts`, `eventPath.test.ts` (AC-012), host `src/test/specRepository.smoke.test.ts` (CI) | verified |
| AC-013 | T-007 | `src/core/specs/specRepository.ts`, `src/core/ports/specSource.ts` (no write method) | `specRepository.test.ts` (AC-013, `snapshotTree`) | verified |
| AC-014 | T-002, T-005 | `src/core/specs/parseSpec.ts`, `planSteps.ts`, `parsePlan.ts` | `parseSpec.test.ts`, `planSteps.test.ts`, `parsePlan.test.ts` | verified |
| AC-015 | T-003, T-004, T-006 | `src/core/specs/readProject.ts:readProject`, `leadingIds.ts`, `planSteps.ts` | `readProject.test.ts`, `leadingIds.test.ts`, `planSteps.test.ts` (AC-015) | verified |
| AC-016 | T-006 | `src/core/specs/version.ts:checkVersion` | `version.test.ts`, `readProject.test.ts` (AC-016) | verified |
| AC-017 | T-006 | `src/core/specs/readProject.ts:isDangling` | `readProject.test.ts` (AC-017) | verified |
| AC-018 | T-007 | `src/core/specs/specRepository.ts`, `testing/generateProject.ts` | `specRepository.test.ts` (AC-018) | verified |
| AC-019 | T-002 | `src/core/specs/parseSpec.ts`, `fieldValue.ts` | `parseSpec.test.ts` (AC-019) | verified |
| AC-020 | T-001 | `src/core/specs/text.ts:decodeText` | `files.test.ts` (AC-020 cases) | verified |
| AC-021 | T-001, T-006 | `src/core/specs/files.ts:isFollowable`, `readProject.ts:resolveInRoot` | `files.test.ts`, `readProject.test.ts` (AC-021) | verified |
| AC-022 | T-007, T-008 | `src/core/specs/specRepository.ts:open/rescan`, `activeProjectFeed.ts:connectActiveProject` | `specRepository.test.ts`, `activeProjectFeed.test.ts` (AC-022), host smoke (CI) | verified |
| AC-023 | T-001 | `src/core/specs/files.ts:readOne` | `files.test.ts` (AC-023 cases) | verified |

## Session handoff

- **Done so far:** T-001 … T-009 built and verified; 358 unit tests; stage 2 and 3 workers integrated. Docs synced (AGENTS.md snapshot, README, Memory Bank).
- **Next action:** `/sdd-compile` for spec 0002 in a fresh session, best with a strong model of another family than the implementer. Open evidence: `npm test` host suite on CI (`src/test/specRepository.smoke.test.ts`); Gregor's re-measurement of the AC-018 thresholds on a real project (spec OP-001). Then `/sdd-lifecycle` to `done/`. Not done here: compile and the move.
- **Open decisions:** none. Findings for Gregor: 0001 notifies only on changed root/version, so an unchanged re-report of the project does not trigger a re-read (watcher and `rescan()` cover it); no Rescan command exists yet (OP-008, 0005).
- **Baseline:** 9bb1c18 (HEAD before T-001).
- **Environment:** `npm test` cannot run in the sandbox (VS Code download blocked); runs on CI.
