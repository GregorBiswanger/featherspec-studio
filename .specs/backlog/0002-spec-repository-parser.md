# Spec Repository & Parser

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

A read-only layer that finds every spec, plan, archived plan and parallel-worker return note
in one FeatherSpec project, parses them according to the verified FeatherSpec format, and
offers one normalised model that keeps file references and shows diagnostics. It follows
external file changes. Studio's lifecycle, dashboard and board (0003, 0006, 0007) build on
this model and never read Markdown themselves.
Source: handoff FS-002 (`docs/product/po-handoff.md` §10), with §5.4, §7, §13, §14; format:
`docs/discovery/featherspec-format.md` (SPIKE-001).

## 2. Goal and problem

Studio needs one shared, trustworthy reading of the FeatherSpec artifacts. Without it every
view would parse Markdown on its own, drift from the others, and either crash on real-world
variation or quietly drop content. Real projects vary a lot: there are five renderings of
acceptance criteria, translated and renumbered headings, two plan-step dialects, and broken
invariants (format §3.4, §4.4, §10).
**Success:** every view shows the same specs, plans and criteria as the files contain. Nothing
is invented and nothing is dropped. A broken file never hides the others. A change saved
outside Studio shows up without a manual reload.

## 3. Users and roles

- **Developer** (primary, handoff §1.3): sees all specs in a structured form without opening
  each Markdown file.
- **Studio features** (internal consumers): 0003 lifecycle/readiness, 0006 Mission Control,
  0007 board/detail. They read the model only.
- One role only. The layer has no permissions of its own: it reads what the opened workspace
  contains.

## 4. Scope

### In scope

- One FeatherSpec project at a time, as recognised by 0001 (project root, `FeatherSpecVersion`).
- Specs in `.specs/backlog/`, `.specs/active/`, `.specs/done/`.
- Plans beside their specs and archived plans in `.specs/plan-archive/`, linked to their spec.
- Parallel-worker return notes `.memory-bank/activeContext.<NNNN>-<T-00x>.md` (0003 needs them
  to derive *Blocked*; decision Gregor, Q1 = A).
- Acceptance criteria, `FR-` requirements, plan steps, stages, traceability and verification
  information, as they appear in the files.
- Diagnostics for unreadable files, unknown content, duplicate numbers, invariant breaches and
  unverified versions.
- Following external changes (create, change, rename, delete) to these files.
- Both plan dialects: FeatherSpec 1.7.0–1.10.0 verified; other versions handled best-effort.

### Out of scope

- Writing, moving or repairing any file — because Studio is read-only for FeatherSpec artifacts (PD-013).
- A visual spec editor — because the handoff excludes it for FS-002.
- Automatic format migration — because the handoff excludes it, and migration belongs to `/sdd-featherspec-update`.
- Deriving board states (Ready, Review, Blocked, Done) and readiness — because that is 0003; this layer gives only the raw facts.
- Reading `AGENTS.md` settings, the `architecture:` snapshot and the Memory Bank (`activeContext.md`, `projectbrief.md`, …) — because 0001 and 0006 own those (Q1 = A).
- `.architecture/` maps, `fs-knowledge` records and `.sdd-reverse/` candidates — because no MVP view needs them yet; this is not now, not never.
- Persisting a `/sdd-compile` verdict — because FeatherSpec does not persist it (format §6, §10 #9); 0003 decides how to handle that.
- Judging spec quality (forbidden words, missing `shall`) — because that is `/sdd-clarify`'s job, and the binding verb varies in real specs (format §10 #5).
- Structured extraction of ID families other than `AC-`, `T-` and `FR-` (`BR-`, `OP-`, `A-`, …) — because only `AC` and `T` are stable wiring (format §10 #17); their text stays readable as section content.
- Several projects at once — because 0001 picks the active project.
- Any UI — because 0005–0007 render the model.

## 5. Functional flow

1. 0001 hands over the active project (root path, `FeatherSpecVersion` or "absent").
2. The layer lists the relevant files and reads each one on its own.
3. Each file is parsed into the model. A failure in one file becomes a diagnostic for that
   file only.
4. Plans and return notes are linked to their specs. Contradictions become diagnostics.
5. Consumers read the model, which contains specs, plans, return notes and diagnostics.
6. A file under `.specs/` or a return note changes outside Studio. The layer re-reads the
   affected files, updates the model and tells consumers which spec references changed
   (handoff §5.4). Files are the truth; Studio never rewrites them (PD-011).

## 6. Business rules

- **BR-01 Files are the truth.** The model reflects the files exactly as they are. It invents
  no value and fills no defaults (handoff §7). An absent field is shown as absent.
- **BR-02 Read-only.** Reading and watching never create, change, rename or delete a file (PD-013).
- **BR-03 Stable identity.** A spec is identified by its file stem `NNNN-slug`, independent of
  the lifecycle folder. Plans join by full stem, never by number alone (format §3.1, §10 #21).
- **BR-04 Isolation.** One faulty file never prevents reading the others.
- **BR-05 Nothing silently dropped.** Anything the parser does not recognise stays in the
  model as unsupported content with its raw text and location, plus a diagnostic.
- **BR-06 No silent choice.** If a spec number occurs more than once, every occurrence is kept
  and flagged (Q3).
- **BR-07 Locate by content, not by heading.** Acceptance criteria are found by their `AC-NNN`
  definitions, never by heading text, section number or language (format §10 #1–3).
- **BR-08 Spec checkboxes are not progress.** DoR/DoD checkboxes in a spec are never counted
  as tasks or verification (format §6, §10 #15).

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Find all specs, plans, archived plans and return notes of the project by the verified structure | FR-002.1 | AC-001, AC-010 |
| FR-02 | Parse spec metadata and content | FR-002.2 | AC-003, AC-004, AC-005, AC-020 |
| FR-03 | Provide one normalised model with stable references and source paths | FR-002.3 | AC-002, AC-019 |
| FR-04 | Detect plans and link them to specs | FR-002.4 | AC-006 |
| FR-05 | Extract steps and acceptance criteria where present | FR-002.5 | AC-004, AC-007, AC-008 |
| FR-06 | Detect existing verification information | FR-002.6 | AC-009 |
| FR-07 | Provide diagnostics for invalid or unknown content | FR-002.7 | AC-011, AC-014, AC-015, AC-016, AC-017 |
| FR-08 | Detect changes to relevant files and update affected data | FR-002.8 | AC-012, AC-018 |
| FR-09 | Never silently drop unsupported content | FR-002.9 | AC-014 |
| FR-10 | Never modify source files | AC-002.7 | AC-013 |

## 8. Data requirements

The model covers the following. Field names and shapes are decided in `/sdd-plan`.

- **Project read:** project root, FeatherSpec version as read (or absent), list of specs,
  plans, return notes and diagnostics.
- **Spec:** stable reference (stem), number `NNNN`, slug, lifecycle folder, workspace-relative
  path, title (H1), header lines as found (`Status`, `Plan`, `Ticket`, `Origin`,
  `Validated by`, `Clarified`, plus unknown bold header lines as unsupported content), the
  `**Plan:**` value classified as placeholder (`_none yet_` or `_none_`), sibling link or
  archive link, sections with heading text and raw content, acceptance criteria, `FR-`
  requirements (or the requirements section as unstructured text), `## Plan history` lines.
- **Acceptance criterion:** ID, full text including annotations (e.g. `(nicht verbindliches
  Ziel)`), any Given/When/Then illustration, its source location, and an *uncertain* flag
  when it is defined only in *Open points*.
- **Plan:** path, archived or not (with archive date and collision suffix), linked spec
  reference or orphan, header lines (`Spec`, `Status`, `Last updated`, `Current step` as raw
  text), stages (sequential or parallel, raw line), steps, traceability rows, session-handoff
  fields as raw text, unknown sections as unsupported content.
- **Step:** ID `T-NNN`, title, dialect (1.10.0 or ≤ 1.9), ticked or not, `Covers` raw text and
  the AC IDs expanded from it, `Files`, `Do`, `Verify`, `Verified` text (empty when only the
  `—` placeholder), `Notes`.
- **Traceability row:** criterion, steps, code/files, test cell (with a `manual:` flag), state
  (`open` / `built` / `verified`, or the raw value if unknown).
- **Return note:** path, spec number, step ID, `Status` (`DONE` / `BLOCKED`, or the raw value).
- **Diagnostic:** affected file, line where known, a stable diagnostic kind, a readable reason.
- No sensitive data. The content is the user's own project text and stays local.

## 9. Interfaces and integrations

- **Input from 0001:** the active project (root, version). Without a recognised project this
  layer does not run.
- **Output to 0003, 0006, 0007:** the model plus a change notification that names the changed
  spec references.
- **File system:** reached only through a port. The VS Code file watcher and file reading are
  adapters (architecture snapshot in `AGENTS.md`).

## 10. Security, permissions and privacy

- Reads only files inside the active project root. Paths outside it, for example through
  `..` links in a `**Plan:**` line, are never followed (handoff §13 Security).
- Nothing is sent anywhere. No telemetry with spec content (handoff §13 Privacy).

## 11. Non-functional requirements

- **Working thresholds (Gregor, Q4):** up to 200 specs with their plans; a full read in under
  2 seconds; an external change reflected within 1 second of the save. These are Gregor's
  working thresholds. They are measured on the fixture projects and must be re-measured on a
  real project (open point OP-001).
- Windows is the primary development machine (CRLF line endings, BOM possible): a file's model
  does not depend on its line endings or a byte-order mark.

## 12. Error cases and edge cases

| Case | Expected behaviour |
| --- | --- |
| File unreadable (permissions, invalid encoding) | Diagnostic for that file; all others read (AC-011) |
| Malformed header (no `**Status:**`, no H1) | Spec is still listed; field absent; diagnostic (AC-019, AC-017) |
| Same stem in two lifecycle folders; two stems with the same number | All occurrences kept, each flagged (AC-015) |
| Plan without spec | Listed as orphan plan with diagnostic (AC-006) |
| `**Plan:**` link points to a missing file | Diagnostic, except an archive link on a reactivated spec in `active/`, which is expected (format §3.2) |
| `active/` with `Status: Draft`; `done/` non-Baseline without archive link; sibling plan with a dated twin in the archive | Diagnostic, no crash, no repair (AC-017) |
| Baseline with `_none yet_` instead of `_none_` | Both placeholders accepted, no diagnostic (format §10 #10) |
| AC ID defined only in *Open points* (`[Uncertain]`) | Criterion flagged *uncertain*, not missing (AC-005) |
| `Covers:` with a range `AC-003 … AC-006` or prose | Range expanded, raw text kept (AC-008) |
| Unknown plan section, unknown header line | Kept as unsupported content with diagnostic (AC-014) |
| Version absent, older than 1.7.0, or newer than 1.10.0 | Read best-effort, version diagnostic (AC-016) |
| File deleted or renamed during watching | Removed or re-keyed in the model; consumers notified (AC-012) |
| Burst of saves (an agent writes many files) | The model ends up matching the final file state (AC-012) |

## 13. Acceptance criteria

Handoff references in brackets (PD-017).

- **AC-001** When the project is read, the system shall return exactly one spec entry for each
  `NNNN-slug.md` file in `.specs/backlog/`, `.specs/active/` and `.specs/done/`, and no spec
  entry for any other file (`.specs/README.md`, `*.plan.md`, files in `plan-archive/`).
  [AC-002.1]
  > **Given** the fixture `fs170-brownfield-mixed` **When** it is read **Then** the spec entries equal its 9 spec files.
- **AC-002** The system shall give every spec entry a reference equal to its file stem, which
  stays identical across repeated reads and when the file moves to another lifecycle folder,
  and shall carry the file's workspace-relative path. [AC-002.2]
- **AC-003** The system shall extract from every spec its title, every header line listed in
  §8 with its value as written, its sections, and its `FR-` requirements. If a spec has no
  `FR-` IDs, its requirements section is exposed as unstructured text. [AC-002.3]
- **AC-004** The system shall extract every acceptance-criterion definition in each rendering
  listed in format §3.4, with its ID and full text, regardless of heading language, section
  number or binding verb. It shall not count an AC ID that only references a criterion (in
  `Covers:`, an FR table, scope or open-point prose) as a definition. [AC-002.3]
- **AC-005** When an AC ID is defined only inside a spec's *Open points*, the system shall
  return that criterion flagged *uncertain*. [AC-002.3]
- **AC-006** The system shall link a plan to the spec with the same stem, either as the sibling
  `<stem>.plan.md` in the same folder or as an archived `<stem>.YYYY-MM-DD[-n].plan.md` in
  `plan-archive/`. If a plan matches no spec stem, then the system shall return it as an orphan
  plan with a diagnostic. [AC-002.4]
- **AC-007** The system shall extract from every plan its header lines, stages (sequential `→`
  and parallel `‖`), steps and traceability rows, for both step dialects: the checkbox on the
  `Verified (T-NNN):` line (1.10.0) and on the `Covers:` line (≤ 1.9). [FR-002.5]
- **AC-008** When a `Covers:` value contains a range `AC-a … AC-b`, the system shall return
  every AC ID from a to b, and shall keep the raw `Covers:` text unchanged. [FR-002.5]
- **AC-009** The system shall return the verification information found in the files: per step
  the ticked state and `Verified` text, per traceability row the state, the test cell and a
  `manual:` flag, and the spec's `## Plan history` lines. It shall never return a checkbox from
  a spec section as a step or as verification. [FR-002.6]
- **AC-010** The system shall return every return note `.memory-bank/activeContext.<NNNN>-<T-NNN>.md`
  with its spec number, step ID and `Status` value, linked to the spec or specs with that number.
  [FR-002.1]
- **AC-011** If a spec, plan or return note cannot be read or parsed, then the system shall
  still return every other file of the project, and shall return a diagnostic naming the
  failing file and the reason. [AC-002.5]
  > **Given** fixture `fs-broken` with one unreadable spec **When** it is read **Then** all other specs are returned and exactly one read diagnostic names that file.
- **AC-012** When a spec, plan or return note is created, changed, renamed or deleted outside
  Studio, the system shall update the model to the files' current state and notify consumers
  with the references of every affected spec, without a manual reload. After a burst of
  changes, the model shall equal a fresh full read of the same files. [AC-002.6]
- **AC-013** The system shall not create, change, rename or delete any file while reading or
  watching. After every fixture project has been fully read, every fixture file's content and
  modification time shall be unchanged. [AC-002.7]
- **AC-014** If a file contains content the parser does not recognise (an unknown header line,
  plan section or step field), then the system shall keep that content in the model with its
  raw text and location as unsupported content, and shall return a diagnostic for it.
  [AC-002.8]
- **AC-015** If a spec number occurs in more than one spec file, then the system shall return
  every occurrence, each with a duplicate diagnostic, and shall not choose one. [Q3]
- **AC-016** If the project's `FeatherSpecVersion` is absent, older than 1.7.0 or newer than
  1.10.0, then the system shall read the project as far as possible and return one project
  diagnostic: "version not verified" (absent or older) or "newer than known" (newer). For
  1.7.0 to 1.10.0 it shall return no version diagnostic. [Q2]
- **AC-017** If a spec breaks a FeatherSpec invariant listed in §12 (folder/status
  contradiction, missing archive link in `done/`, sibling plan with a dated twin, `**Plan:**`
  link to a missing file), then the system shall return a diagnostic naming the invariant and
  shall still return the spec. [FR-002.7]
- **AC-018** While a project holds up to 200 specs with plans, the system shall complete a full
  read in under 2 seconds and reflect an external change within 1 second of the save. These are
  Gregor's working thresholds, measured on fixtures and re-measured on a real project (OP-001).
  [handoff §13 Performance]
- **AC-019** If a field is absent from its source file, then the system shall mark it as absent
  in the model and shall not fill in a default value. [handoff §7]
- **AC-020** The system shall produce the same model for a file regardless of LF or CRLF line
  endings and of a UTF-8 byte-order mark.

## 14. Technical notes for developers or AI agents

- **As-is:** no domain code exists yet (`src/extension.ts` is the generator scaffold). The
  target layout is in `.memory-bank/systemPatterns.md`. `npm run test:unit` does not exist yet;
  the first plan introduces it (`techContext.md`).
- **Architecture:** parsing is pure core code (no `vscode` import, `AGENTS.md` *Core purity*).
  File listing, reading and watching sit behind a port; the VS Code `FileSystemWatcher` is an
  adapter. Change handling should re-read only the affected files (handoff §13 Performance).
- **Format reference:** `docs/discovery/featherspec-format.md` is the parser contract. Its §10
  lists the parser consequences, for example: match `AC-\d{3}` as the first token of a bullet
  or bold paragraph, and use a dual-dialect step parser keyed on `### T-\d+`. Status values
  stay English even in German projects (format §3.2).
- **Fixtures:** build them as proposed in format §11 (copies of the four samples plus
  hand-made synthetic fixtures). Unseen shapes (`‖` stages, `Files:`, `**Ticket:**`,
  `Deprecated`, return notes, `-2` archive suffix) exist only as hand-made fixtures and stay
  marked **UNVERIFIED** (format §10 #20).
- **Tests:** unit and fixture tests for the parser in plain Node; one extension-host
  integration test for the watcher adapter (handoff §14). Put the AC ID into test names.
- The model's exact shape, the diagnostic kind list and the debounce strategy are decided in
  `/sdd-plan`.

## 15. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0001 supplies the project root and version; this layer does not detect projects itself | Handoff dependency FS-002 → FS-001; format §1.1 assigns markers to FS-001 | The layer would need its own discovery; scope grows |
| A-002 | The file stem `NNNN-slug` is a stable enough identity, since slugs are not renamed in practice | FeatherSpec uses the stem as the spec–plan join key (format §3.1) | A slug rename looks like a delete plus a new spec; consumers lose the link |
| A-003 | Return notes are the only Memory Bank files this layer reads | Gregor Q1 = A | 0006 would need a second reader for `activeContext.md` |
| A-004 | Requirements are extracted only where `FR-` IDs exist | No template ID scheme for requirements (format §3.4) | Views expecting structured requirements show text instead |
| A-005 | The four samples named in format §0 are available to copy as fixtures | SPIKE-001 audited them | Fixtures must be hand-made, weakening AC-001 to AC-004 |

## 16. Open points

- **OP-001** Re-measure AC-018 thresholds on a real project (Gregor's working thresholds; owner: Gregor).
- **OP-002** Where the sample projects for fixtures live and whether copying them into this
  repository is fine (licence and size). To be settled in `/sdd-plan` research.
- **R-001 (resolved)** Interview: 4 questions. At Gregor's explicit request, questions 2–4 were
  asked in one message, a one-off exception to the one-question-per-message interview rule.

## 17. Definition of Ready

Goal, problem and the single role are clear. Scope and out-of-scope have reasons. Business
rules and criteria are testable. The happy path and edge cases (§12) are described. Data and
constraints are clarified or recorded as assumptions. Open points are visible. Remaining
step: `/sdd-clarify`.

## 18. Definition of Done

All FR-01 to FR-10 are built, and AC-001 to AC-020 pass with tests (fixture tests in
`test:unit`, a watcher integration test in `npm test`). No out-of-scope behaviour was added
(no file writes). Assumptions are verified or documented. The architecture snapshot and
Memory Bank are updated for the new core modules. Gregor accepts the result.

## 19. Recommended next steps

1. `/sdd-clarify` on this spec, in a fresh session.
2. `/sdd-plan`, after 0001's model of the active project is planned (input dependency).
