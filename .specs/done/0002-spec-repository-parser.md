# Spec Repository & Parser

**Status:** Implemented
**Plan:** [0002-spec-repository-parser.2026-11-17.plan.md](../plan-archive/0002-spec-repository-parser.2026-11-17.plan.md)

## 1. Summary

A read-only layer that finds every spec, plan, archived plan and parallel-worker return note
in one FeatherSpec project, parses them according to the audited FeatherSpec format, and
offers one normalised model that keeps source paths and reports diagnostics. It follows
changes to the files. Studio's lifecycle, dashboard and board (0003, 0006, 0007) build on
this model and never read Markdown themselves.
Source: handoff FS-002 (`docs/product/po-handoff.md` §10), with §5.4, §7, §13, §14; format:
`docs/discovery/featherspec-format.md` (SPIKE-001); decisions PD-018, PD-019, PD-020, PD-034,
PD-035, PD-043 in `docs/product/product-decisions.md`.

## 2. Goal and problem

Studio needs one shared reading of the FeatherSpec artifacts. Without it every view would
parse Markdown on its own, drift from the others, and either crash on real-world variation or
quietly drop content. Real projects vary a lot: several renderings of acceptance criteria,
translated and renumbered headings, two plan-step dialects (format §3.4, §4.4, §10).
**Success:** every view works from the same specs, plans and criteria as the files contain.
Nothing is invented and nothing is dropped. A broken file never hides the others. A change to
the files reaches the model without a manual reload.

## 3. Users and roles

- **Developer** (primary, handoff §1.3): sees all specs in a structured form without opening
  each Markdown file.
- **Studio features** (internal consumers): 0003 lifecycle/readiness, 0006 Mission Control,
  0007 board/detail. They read the model only.
- One role only. The layer has no permissions of its own: it reads what the active project
  contains.

## 4. Scope

### In scope

- One FeatherSpec project at a time: the active project reported by 0001.
- Specs in `.specs/backlog/`, `.specs/active/`, `.specs/done/`.
- Plans: sibling plans in the lifecycle folders and archived plans in `.specs/plan-archive/`,
  joined to their specs by stem (PD-018).
- Parallel-worker return notes `.memory-bank/activeContext.<NNNN>-<T-NNN>.md`, for example
  `activeContext.0007-T-003.md` (0003 needs them for *Blocked*, PD-021; R-001).
- Acceptance criteria, `FR-` requirements, plan steps, stages, traceability and verification
  information, as they appear in the files.
- Diagnostics of the kinds PD-020 gives this layer: unreadable file, unknown content or value,
  duplicate, orphan, dangling link, unverified version.
- Following changes to these files (create, change, move, rename, delete), and a full re-read
  on request (ADR-001 §9).
- Both plan-step dialects. Supported version range 1.7.0–1.10.0; other versions are read by
  the same rules and get a diagnostic (AC-016).

### Out of scope

- Writing, moving or repairing any file — because the parser never modifies source files (handoff AC-002.7, P2; PD-013).
- A visual spec editor — because the handoff excludes it for FS-002.
- Automatic format migration — because the handoff excludes it, and migration belongs to `/sdd-featherspec-update`.
- Deriving board states (Ready, Review, Blocked, Done) and readiness — because that is 0003; this layer gives only the raw facts.
- Judging lifecycle contradictions (folder against spec status against plan status, a `done/` spec without archive link, a plan in the wrong place) — because 0003 alone owns them (PD-020); this layer delivers the facts they are judged from.
- Reading `AGENTS.md` settings, the `architecture:` snapshot and the Memory Bank (`activeContext.md`, `projectbrief.md`, …) — because 0001 and 0006 own those (R-001).
- `.architecture/` maps, `fs-knowledge` records and `.sdd-reverse/` candidates — because no MVP view needs them yet; this is not now, not never.
- Persisting a `/sdd-compile` verdict — because FeatherSpec does not persist it (format §6, §10 #9); 0003 decides how to handle that.
- Judging spec quality (forbidden words, missing `shall`) — because that is `/sdd-clarify`'s job, and the binding verb varies in real specs (format §10 #5).
- Structured extraction of ID families other than `AC-`, `T-` and `FR-` (`BR-`, `OP-`, `A-`, …) — because only `AC` and `T` are stable wiring (format §10 #17); their text stays available as section content.
- Several projects at once — because 0001 picks the active project.
- Any UI, including the command that requests a re-read — because 0005–0007 render the model (owner of that command: OP-008).

## 5. Functional flow

1. 0001 reports the active project: root folder and version (the value as written, or "unknown").
2. The layer lists the relevant files and reads each one on its own.
3. Each file is parsed into the model. A failure in one file becomes a diagnostic for that
   file only.
4. Plans and return notes are joined to their specs. Orphans, dangling links and duplicates
   become diagnostics.
5. Consumers read the model, which contains specs, plans, return notes and diagnostics.
6. A spec, plan or return note changes on disk, whoever changed it. The layer re-reads,
   updates the model and tells consumers which spec references are affected (handoff §5.4).
   Files are the truth; Studio never rewrites them (handoff P2).

## 6. Business rules

- **BR-01 Files are the truth.** The model reflects the files as they are. It invents no value
  and fills no defaults (handoff §7). Values the layer derives (AC IDs expanded from `Covers`,
  the `**Plan:**` classification, flags) stand beside the raw text they come from, never in
  its place. File facts (key, modification time) are passed on as the file system reports
  them (PD-043).
- **BR-02 Read-only.** Reading and watching never create, change, rename or delete a file
  (handoff AC-002.7; PD-013).
- **BR-03 Identity (PD-018).** A spec entry is one file; its key is its project-relative path.
  Its reference is the file stem `NNNN-slug`: the stable reference for consumers and the join
  key to plans and archived plans. A move between lifecycle folders keeps the reference (same
  spec, new key). A stem change is "removed + new". The number `NNNN` is a display ID; only
  return notes are joined by it, because their file name carries nothing else (OP-009).
- **BR-04 Isolation.** One faulty file never prevents reading the others.
- **BR-05 Nothing silently dropped.** Where the format defines a closed set (header lines,
  plan sections, step fields, handoff fields, traceability columns, status values; format
  §3.2, §4.1–§4.5), anything outside that set stays in the model as unsupported content with
  its raw text and location, plus a diagnostic. A spec body is free text: it is kept whole as
  sections and is never unsupported content.
- **BR-06 No silent choice (PD-019).** The same stem in two folders, or one number with two
  slugs: every file stays its own entry with a duplicate diagnostic, and plans and return
  notes are linked to every matching entry. Likewise an `AC-NNN` defined twice in one spec or
  a `T-NNN` twice in one plan: every occurrence is kept and flagged.
- **BR-07 Locate by content (PD-034).** An acceptance criterion is defined where an `AC-NNN`
  ID is the leading token of a list item or bold paragraph, anywhere in the file. Emphasis and
  strike-through marks and the `[Uncertain]` marker in front of the ID do not count as tokens.
  An AC ID in any other position is a reference. `FR-` IDs are read the same way, or as the
  first cell of a table row. No section is identified by its meaning, heading text, number or
  language; the one exception is `## Plan history`, whose heading is fixed wiring (format §3.3).
- **BR-08 Spec checkboxes are not progress.** DoR/DoD checkboxes in a spec are never counted
  as tasks or verification (format §6, §10 #15).
- **BR-09 Facts, not judgements (PD-020).** This layer reports what the files contain and the
  diagnostics listed in §8. It never says whether a spec's lifecycle state is consistent.

*Amended by 0016 (PD-059, proxy): `**Successor:**` joins the closed set of header lines: it is read and raises no diagnostic (compatibility, 0016 §6.1).*

## 7. Functional requirements

| ID | Requirement | Handoff | Criteria |
| --- | --- | --- | --- |
| FR-01 | Find all specs, plans, archived plans and return notes of the project by the audited structure | FR-002.1 | AC-001, AC-010, AC-021 |
| FR-02 | Parse spec metadata and content | FR-002.2 | AC-003, AC-004, AC-005, AC-020 |
| FR-03 | Provide one normalised model with stable references and source paths | FR-002.3 | AC-002, AC-019, AC-023 |
| FR-04 | Detect plans and link them to specs | FR-002.4 | AC-006 |
| FR-05 | Extract steps and acceptance criteria where present | FR-002.5 | AC-004, AC-007, AC-008 |
| FR-06 | Detect existing verification information | FR-002.6 | AC-009 |
| FR-07 | Provide diagnostics for invalid or unknown content | FR-002.7 | AC-011, AC-014, AC-015, AC-016, AC-017 |
| FR-08 | Detect changes to relevant files and update affected data | FR-002.8 | AC-012, AC-018, AC-022 |
| FR-09 | Never silently drop unsupported content | FR-002.9 | AC-014 |
| FR-10 | Never modify source files | AC-002.7 | AC-013 |

## 8. Data requirements

The model covers the following. Field names and shapes are decided in `/sdd-plan`.

Terms: **key** = project-relative path; **reference** = file stem (BR-03). **Plan** = sibling
plan or archived plan. **Absent** = not in the file; **empty** = present without a value;
**placeholder** = present as `_none yet_`, `_none_`, `—` or, in a plan's session handoff, an italic skeleton text in parentheses such as `_(commit hash …)_` (format §10 #14; Gregor 2026-11-16). **Affected spec** = an entry whose
own file, linked plan or linked return note was created, changed or removed, including an
entry that gains or loses a link. **File facts** = what the file system reports about a
file rather than its content: key and modification time (PD-043).

- **Project read:** project root, version as reported by 0001, list of specs, plans, return
  notes and diagnostics.
- **Spec:** key, modification time, reference, number `NNNN`, slug, lifecycle folder, title (H1), header lines as
  found (`Status`, `Plan`, `Ticket`, `Origin`, `Validated by`, `Clarified`; other bold header
  lines as unsupported content), the `**Plan:**` value classified as placeholder, sibling
  link, archive link or other, the body as ordered sections split at level-2 headings
  (heading text and raw content; text before the first heading is a section without heading),
  acceptance criteria, `FR-` requirements, `## Plan history` lines.
- **Acceptance criterion:** ID, full text of its list item or paragraph including annotations
  (e.g. `(nicht verbindliches Ziel)`), a directly following blockquote as its Given/When/Then
  illustration, its source location, an *uncertain* flag and a *struck* flag.
- **`FR-` requirement:** ID, the raw text of its list item, paragraph or table row, location.
- **Plan:** path, modification time, sibling or archived (with archive date and collision suffix), the references
  of the linked specs or orphan, header lines (`Spec`, `Status`, `Last updated`, `Current step`
  as raw text), stages (sequential or parallel, raw line, closing line), steps, traceability
  rows, session-handoff fields as raw text, other sections and header lines as unsupported
  content.
- **Step:** ID `T-NNN`, title, dialect (checkbox on the `Verified` line, on the `Covers` line,
  or undetermined), ticked or not, struck or not, `Covers` raw text and the AC IDs derived from
  it, `Files`, `Do`, `Verify`, `Verified` text (flagged placeholder when it is only `—`), `Notes`.
- **Traceability row:** criterion, steps, code/files, test cell (with a `manual:` flag), state
  as written (`open` / `built` / `verified` are the known values).
- **Return note:** path, modification time, spec number, step ID, `Status` as written (`DONE` / `BLOCKED` are the
  known values), the references of the linked specs or none.
- **Diagnostic:** scope (a file with its path and the line where known, or the project), kind,
  and a reason in English (PD-016) that names what was found. Kinds (PD-020): unreadable file ·
  unknown content or value · duplicate · orphan (plan or return note) · dangling link ·
  unverified version. Consumers rely on this list; its identifiers are decided in `/sdd-plan`.
- No sensitive data. The content is the user's own project text and stays local.

*Amended by 0016 (PD-059, proxy): every diagnostic carries a tier, *problem* or *note* (0016 §6.1); an ID that occurs twice stays a diagnostic with the tier *format note*.*

## 9. Interfaces and integrations

- **Input from 0001:** the active project (root folder, version as written or "unknown").
  Without an active project this layer does not run. When 0001 reports another project (a
  different root or another version) or none, AC-022 applies. A re-report of the same project
  (same root, same version) triggers no re-read: changes under `.specs/` are covered by this
  layer's own watcher and by `rescan()`, and an `AGENTS.md` edit that keeps the version does
  not affect the spec model.
- **Output to 0003, 0006, 0007:** the model as a complete snapshot (a consumer never reads a
  half-updated model), including each file's modification time (0007's "Last change",
  PD-043), plus a change notification that names the references of the affected
  specs and says when content tied to no spec changed (orphan plan, unlinked return note,
  project diagnostic).
- **File system:** reached only through a port (listing, reading, change events). The adapters
  are named in ADR-001; the port is this layer's only way to the outside (`AGENTS.md` boundaries).

## 10. Security, permissions and privacy

- Reads only files inside the active project root. A link that resolves outside it is not
  followed (AC-021; handoff §13 Security). Symbolic links: OP-005.
- Nothing is sent anywhere and there is no telemetry with spec content (handoff §13 Privacy).
  No criterion: it follows from the file-system port being the only way out (§9).

## 11. Non-functional requirements

- **Working thresholds (PD-035):** a full read of a generated 200-spec fixture in under
  2 seconds; the model updated within 1 second after the file-change event reaches Studio
  (AC-018). They are Gregor's working thresholds, measured by an automated test on that
  fixture. Gregor re-measures them on a real project (OP-001); a failed re-measurement reopens
  this spec. Beyond 200 specs every spec is still read (AC-001), with no promised time.
- Windows is the primary development machine (CRLF line endings, BOM possible): a file's model
  does not depend on its line endings or a byte-order mark (AC-020).

## 12. Error cases and edge cases

| Case | Expected behaviour |
| --- | --- |
| File unreadable (I/O error, not valid UTF-8) or internal parse error | Diagnostic for that file; all others read (AC-011) |
| No `**Status:**` line, no H1 | Spec is still listed; field absent (AC-019). Diagnostic: OP-003 |
| Same stem in two lifecycle folders; one number with two slugs | Every file its own entry with a duplicate diagnostic; plans and notes linked to all (AC-015) |
| `AC-NNN` defined twice in one spec; `T-NNN` twice in one plan | Every occurrence kept, duplicate diagnostic (AC-015) |
| Plan without spec (sibling or archived) | Orphan plan with diagnostic (AC-006) |
| Plan whose stem matches a spec in another lifecycle folder | Linked by stem, its own path reported; no diagnostic here (PD-020) |
| Sibling plan and archived plans for one stem | All linked; normal after a reactivation; no diagnostic here (OP-004) |
| `**Plan:**` link, or a sibling plan's `**Spec:**` link, to a missing file | Dangling-link diagnostic (AC-017) |
| Archived plan's `**Spec:**` link to a missing file | Expected during reactivation, no diagnostic (AC-017; format §4.1) |
| Folder and status disagree; `done/` spec without archive link; legacy sibling plan in `done/` | Facts returned as found, no diagnostic here: 0003 judges (PD-020) |
| Baseline with `_none yet_` instead of `_none_` | Both placeholders accepted, no diagnostic (format §10 #10) |
| Unknown `**Status:**` value (spec, plan, return note) or traceability state | Value as written, unknown-value diagnostic (AC-014) |
| Criterion carrying `[Uncertain]` | Flagged *uncertain*, wherever it stands (AC-005) |
| Struck-through step or criterion | Returned with its *struck* state; shape UNVERIFIED (AC-004, AC-007) |
| `Covers:` with a range `AC-003 … AC-006` or `AC-003 ... AC-006`, another delimiter, a reversed range or prose | `AC-a … AC-b` and `AC-a ... AC-b` with a ≤ b expanded; otherwise only the IDs written; raw text kept (AC-008) |
| Step with no checkbox, or one on both lines | Dialect and ticked state undetermined, diagnostic (AC-007) |
| Unknown plan section, header line or step field; traceability table whose columns differ from format §4.5 | Kept as unsupported content with diagnostic (AC-014) |
| Return note whose number matches no spec | Returned unlinked, with diagnostic (AC-010) |
| Version "unknown", not comparable, older than 1.7.0, or newer than 1.10.0 | Read by the same rules, version diagnostic (AC-016) |
| File moved to another lifecycle folder | Same reference, new key; consumers notified (AC-002, AC-012) |
| File deleted; stem changed | Removed; a stem change is removed + new, both references notified (AC-012; PD-018) |
| Series of saves; file read while half-written | An intermediate state may be published; the final state matches the files (AC-012) |
| Lifecycle folder or `.memory-bank/` missing or removed | Its entries are absent or removed; no diagnostic (format §1.1) |
| Change events missed (watcher exclusions, folder-level events) | A full re-read on request restores the model (AC-022; ADR-001 §9) |
| 0001 reports another project (another root or another version), or none | Fresh full read, or the model is discarded (AC-022) |
| 0001 reports the same project again (same root, same version) | No re-read; the watcher and `rescan()` cover changes under `.specs/` (AC-022) |
| `.md` file in a watched folder that matches no pattern | No entry (AC-001). Diagnostic: OP-003 |

## 13. Acceptance criteria

Handoff references in brackets (PD-017).

- **AC-001** When the project is read, the system shall return exactly one spec entry for each
  `NNNN-slug.md` file in `.specs/backlog/`, `.specs/active/` and `.specs/done/`, and no spec
  entry for any other file (`.specs/README.md`, `*.plan.md`, files in `plan-archive/`).
  [AC-002.1]
  > **Given** the fixture `fs170-brownfield-mixed` **When** it is read **Then** the spec entries equal its 9 spec files.
- **AC-002** The system shall give every spec entry a key equal to its project-relative path
  and a reference equal to its file stem. The reference shall stay identical across repeated
  reads and when the file moves to another lifecycle folder; the key shall then equal the new
  path. [AC-002.2; PD-018]
- **AC-003** The system shall extract from every spec its title, every header line listed in
  §8 with its value as written, the `**Plan:**` classification, its body as ordered sections
  (§8), and every `FR-` requirement (BR-07) with its ID and the raw text of its list item,
  paragraph or table row. [AC-002.3; PD-034]
- **AC-004** The system shall return an acceptance criterion for every place where an `AC-NNN`
  ID is the leading token of a list item or bold paragraph (BR-07), in each rendering listed
  in format §3.4, with its ID, the full text of that list item or paragraph, and a directly
  following blockquote as its illustration. It shall return no criterion for an AC ID in any
  other position (`Covers:`, a table cell, running prose). [AC-002.3; PD-034]
- **AC-005** When an acceptance-criterion definition carries the `[Uncertain]` marker, the
  system shall return that criterion flagged *uncertain*. It shall not derive the flag from
  the section the definition stands in. [AC-002.3; PD-034]
- **AC-006** The system shall link every plan to every spec entry with the same stem: a
  `<stem>.plan.md` in a lifecycle folder (sibling plan) and a
  `<stem>.YYYY-MM-DD[-n].plan.md` in `plan-archive/` (archived plan). If a plan matches no
  spec stem, then the system shall return it as an orphan plan with a diagnostic.
  [AC-002.4; PD-018]
- **AC-007** The system shall extract from every plan every item §8 lists for a plan, a step
  and a traceability row, for both step dialects: the checkbox on the `Verified (T-NNN):` line
  (1.10.0) and on the `Covers:` line (≤ 1.9). If a step carries no checkbox, or one on both
  lines, then the system shall return its dialect and ticked state as undetermined, with a
  diagnostic. [FR-002.5]
- **AC-008** When a `Covers:` value contains a range written `AC-a … AC-b` (the ellipsis
  character) or `AC-a ... AC-b` (three plain dots) with a ≤ b, the system shall return every
  AC ID from a to b. For any other `Covers:` text it shall return
  exactly the AC IDs written in it. In both cases it shall keep the raw `Covers:` text.
  [FR-002.5]
- **AC-009** The system shall return the verification information found in the files: per step
  the ticked state and `Verified` text, per traceability row the state, the test cell and a
  `manual:` flag, and the spec's `## Plan history` lines. It shall never return a checkbox from
  a spec section as a step or as verification. [FR-002.6]
- **AC-010** The system shall return every return note `.memory-bank/activeContext.<NNNN>-<T-NNN>.md`
  with its spec number, step ID and `Status` value, linked to every spec entry with that
  number. If no spec entry has that number, then the system shall return the note unlinked,
  with a diagnostic. [FR-002.1]
- **AC-011** If a spec, plan or return note cannot be read (I/O error, or content that is not
  valid UTF-8), or its parsing ends with an internal error, then the system shall still return
  every other file of the project, and shall return a diagnostic naming the failing file and
  the reason. [AC-002.5]
  > **Given** fixture `fs-broken` with one unreadable spec **When** it is read **Then** all other specs are returned and exactly one unreadable-file diagnostic names that file.
- **AC-012** When a spec, plan or return note is created, changed, moved, renamed or deleted,
  whoever does it, the system shall update the model to the files' current state and notify
  consumers without a manual reload. The notification shall name the reference of every
  affected spec (§8) and shall say when content tied to no spec changed. Within 1 second after
  the last change event of a series reaches Studio, the model shall equal a fresh full read of
  the same files. [AC-002.6; PD-035]
- **AC-013** The system shall not create, change, rename or delete any file while reading or
  watching. After a fixture project has been fully read and one watched change has been
  processed, the project's file list and every file's content and modification time shall
  equal the state recorded before, apart from the change the test itself made. [AC-002.7]
- **AC-014** If a file contains an item outside the closed sets of BR-05 (an unknown header
  line, plan section, step field, handoff field or traceability column), then the system shall
  keep it in the model with its raw text and location as unsupported content, and shall return
  a diagnostic for it. If a `**Status:**` value or a traceability state is not one of its
  documented values, then the system shall return the value as written, with a diagnostic.
  [AC-002.8; PD-020]
- **AC-015** If a spec stem occurs in more than one lifecycle folder, or a spec number occurs
  with more than one slug, then the system shall return every such file as its own spec entry,
  each with a duplicate diagnostic naming the other files, and shall link plans and return
  notes to every matching entry. If an `AC-NNN` is defined twice in one spec or a `T-NNN`
  twice in one plan, then the system shall return every occurrence, with a duplicate
  diagnostic. [PD-019]
- **AC-016** If the version reported by 0001 is "unknown", cannot be compared as a semantic
  version, or is older than 1.7.0, then the system shall return one project diagnostic with
  the reason "version not verified". If it is newer than 1.10.0, then the reason shall be
  "newer than known". For 1.7.0 to 1.10.0 the system shall return no version diagnostic.
  The system shall compare versions by semantic-version precedence. Apart from this
  diagnostic, the model of a project shall not depend on its version. [R-001; PD-020]
- **AC-017** If a spec's `**Plan:**` line, or a sibling plan's `**Spec:**` line, links to a
  file that does not exist inside the project, then the system shall return a dangling-link
  diagnostic and shall still return the spec or plan. If an archived plan's `**Spec:**` line
  links to a missing file, the system shall return no diagnostic. [FR-002.7; PD-034]
- **AC-018** While the project is a generated fixture of 200 specs with their plans, the
  system shall complete a full read in under 2 seconds, from the read request to the model
  being available, and shall update the model within 1 second after a file-change event
  reaches Studio. An automated test on that fixture measures both. [PD-035]
- **AC-019** If a field is absent from its source file, then the system shall mark it as absent
  in the model and shall not fill in a default value. If a field is present without a value or
  with a placeholder (§8), then the system shall report it as empty or as placeholder, not as
  absent. [handoff §7]
- **AC-020** The system shall produce the same model for a file regardless of LF or CRLF line
  endings and of a UTF-8 byte-order mark. Raw text in the model uses LF line endings and
  carries no byte-order mark.
- **AC-021** The system shall read no file outside the active project root. If a `**Plan:**`
  or `**Spec:**` link resolves to a location outside the root, then the system shall not read
  the target. [handoff §13 Security]
- **AC-022** When a consumer requests a full re-read, or 0001 reports an active project whose
  root or version differs from the one the system last read, the system shall replace the
  model with the result of a fresh full read and notify consumers. When 0001 reports the same
  root and the same version again, the system shall not re-read; changes under `.specs/`
  reach the model through the system's own file watcher and through a full re-read on
  request. An edit of `AGENTS.md` that keeps the version shall not change the model. When
  0001 reports no active project, the system shall stop watching and discard the model.
  [ADR-001 §9; PD-033]
- **AC-023** The system shall return for every spec, plan and return note the modification
  time the file system reported for that file when it was read, unchanged, as a file fact
  beside its content. If a file cannot be read (AC-011), then the system shall return its
  modification time when the file system reported one, and shall mark it absent otherwise
  (AC-019). [PD-043]

*Amended by 0016 (PD-059, proxy): `**Successor:**` is a known header line and raises no diagnostic (0016 §6.1).*

*Amended by 0016 (PD-059, proxy): a plan in `backlog/` or `active/` whose stem matches no spec stays in the model as an orphan, with no diagnostic and no dangling-link diagnostic (compatibility, 0016 §6.1).*

*Amended by 0016 (PD-059, proxy): an orphan plan in `backlog/` or `active/` has no dangling-link diagnostic (compatibility, 0016 §6.1).*

*Amended by 0016 (PD-059, proxy): every diagnostic carries a tier; an ID that occurs twice stays a diagnostic, tier *format note* (0016 §6.1).*

## 14. Technical notes for developers or AI agents

- **As-is (2026-11-16, `/sdd-plan`):** spec 0001 is built (`src/core/{ports,discovery}`,
  `src/adapters/{node,vscode}`, Vitest `npm run test:unit`). Its `ReadOnlyFileSystem` port
  decodes text without a UTF-8 check and reports neither modification time nor symbolic
  links, so this layer gets its own port; 0001's code stays unchanged.
- **Architecture:** parsing is pure core code (no `vscode` import, `AGENTS.md` *Core purity*).
  File listing, reading and change events sit behind a port. ADR-001 §9 decides the watching:
  events debounced and coalesced (about 200 ms), only the affected file re-parsed, a delete
  rescans the subtree, a manual rescan and a full rescan on workspace-folder changes as the
  safety net; paths compared case-insensitively on Windows and macOS. ADR-001's watcher
  pattern covers `.specs/**/*.md` only: return notes in `.memory-bank/` must be watched too.
- **Format reference:** `docs/discovery/featherspec-format.md` is the parser contract, read
  together with BR-07 (PD-034), which narrows its §10 #2. The step parser is keyed on
  `### T-\d+` and reads both dialects. Status values stay English even in German projects
  (format §3.2).
- **Fixtures:** build them as proposed in format §11. Gregor owns the four samples and allows
  copying them into this repository as test fixtures; they sit outside it today, and
  `/sdd-plan` decides the folder. Add the generated 200-spec fixture (PD-035) and hand-made
  synthetic fixtures. Shapes seen in no sample (`‖` stages, `Files:`, `**Ticket:**`,
  `Deprecated`, return notes, `-2` archive suffix, struck steps and criteria) are read as the
  template defines them, exist only as hand-made fixtures and stay marked **UNVERIFIED**
  (format §10 #20): a pass there proves agreement with the template, not with real output.
- **Tests:** unit and fixture tests for the parser in plain Node; one extension-host
  integration test for the watcher adapter (handoff §14; ADR-001 §12). Put the AC ID into test
  names.
- The model's exact shape and the diagnostic identifiers are decided in `/sdd-plan`.

## 15. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | 0001 supplies the project root and version; this layer does not detect projects itself | 0001 §8 names 0002 as consumer of root and version; format §1.1 assigns markers to FS-001 | The layer would need its own discovery; scope grows |
| A-002 | _Withdrawn 2026-11-16: no longer an assumption. PD-018 decides that a stem change is "removed + new" (BR-03). The ID is not reused._ | — | — |
| A-003 | Return notes are the only Memory Bank files this layer reads | Gregor in the specify interview (R-001); PD-021 needs `BLOCKED` notes for 0003 | 0006 would need a second reader for `activeContext.md` |
| A-004 | Requirements are structured only where an `FR-` ID leads an item or table row; all other requirement text stays section content | PD-034; no template ID scheme for requirements (format §3.4) | Views expecting structured requirements get section text instead |
| A-005 | The four samples named in format §0 can be copied as fixtures | Confirmed by Gregor 2026-11-16: the samples are his and may be copied in | Fixtures must be hand-made, weakening AC-001 to AC-004 |
| A-006 | Until OP-005 is decided, a symbolic link in a read folder is not followed and is reported as an unreadable file (the OP-005 recommendation) | AC-021 forbids reading outside the root; not following any link is the only rule that needs no target check | If Gregor wants in-root links followed, the listing and AC-011/AC-021 tests change |

## 16. Open points

Resolved:

- **R-001** Specify interview, 4 questions; at Gregor's explicit request questions 2–4 were
  asked in one message, a one-off exception to the one-question rule. The answers as this spec
  uses them: Q1 return notes are read, the rest of the Memory Bank is not; Q2 versions outside
  1.7.0–1.10.0 are read with a diagnostic; Q3 duplicates are kept and flagged (now PD-019);
  Q4 the working thresholds (now PD-035). Q1 and Q2 are recorded nowhere else: OP-007.
- **R-004** `/sdd-compile` follow-up 2026-11-16, decided by Gregor: AC-022 and §9 revised —
  a re-report of the same project (same root, same version) triggers no re-read, `.specs/`
  changes are covered by the watcher and `rescan()`, an `AGENTS.md` edit that keeps the version
  does not affect the model; the code stays. AC-008 and §12 revised — a `Covers:` range is
  written with `…` or with three plain dots `...`, both are ranges; the code already did this.
- **R-003** `/sdd-plan` 2026-11-16: PD-043 is newer than this spec and asks this layer for
  every file's modification time as a file fact. Applied: BR-01, §8 (term *file facts*, the
  spec, plan and return-note items), §9, FR-03 and the new AC-023.
- **OP-002** Resolved 2026-11-16: Gregor owns the sample projects and allows copying them
  into the repository as test fixtures; `/sdd-plan` decides the folder.
- **R-002** `/sdd-clarify` 2026-11-16, 58 findings (F-01 … F-58). Gregor decided the six
  blocking ones in the PD register and delegated the rest (a one-off exception to the
  one-finding-per-message walkthrough, at his request). Resolved, 52:
  - By PD-018 and PD-019: identity, duplicates, rename, plan in another folder (F-01, F-02,
    F-11, F-17, F-28, F-39, F-55).
  - By PD-020: lifecycle contradictions left to 0003, diagnostic kinds, unknown status values
    (F-09, F-19, F-44; F-30 except OP-004).
  - By PD-034: definitions, *uncertain*, sections, `FR-` IDs, dangling links (F-03, F-04,
    F-21, F-23, F-24, F-35).
  - By PD-035: thresholds, burst bound, 200-spec fixture (F-08, F-13, F-26, F-31, F-50, F-57).
  - By 0001 and PD-033: version handover, project-level changes (F-48, F-49). By ADR-001 §9:
    watching (F-34, F-36, F-45, F-46; F-47 except OP-008). By the format reference: closed
    sets, note name, duplicate IDs, ranges (F-15, F-22, F-32, F-41, F-43). By Gregor: F-56.
  - Wording and testability: F-05, F-06, F-07, F-10, F-12, F-14, F-16, F-18, F-20, F-25, F-27,
    F-29, F-33 (AC-021 added, AC-007 widened), F-37, F-40, F-42, F-54 (BR-02 now rests on
    handoff AC-002.7; PD-011 and PD-013 are still marked proxy in the register), F-58.
    Partly: F-51, F-52, F-53; their rest is OP-005 … OP-007.
  - Readings made while applying the decisions; say so if one is wrong: (a) a plan is linked
    to every entry of a duplicated stem (PD-019: nothing picks a copy); (b) for a series of
    changes the 1 second of PD-035 counts from the last change event; (c) versions compare by
    semantic-version precedence, so `1.10.1` is "newer than known" and `1.8.0-rc3` is in
    range; (d) an unlinked return note gets a diagnostic like an orphan plan; (e) the
    `[Uncertain]` marker and emphasis or strike-through marks may stand in front of a leading
    ID; (f) "invalid encoding" means not valid UTF-8; (g) a step with no checkbox or two is
    undetermined, not guessed; (h) sections split at level-2 headings (format §3.3), and
    `## Plan history` is the one section found by its heading; (i) `FR-` IDs may carry dotted
    parts (`FR-01`, `FR-001.3`); (j) no diagnostic for shapes that are UNVERIFIED but inside
    the supported version range (as PD-022 handles `Deprecated`).

Open, none blocks planning (clarify finding in brackets):

- **OP-001** Re-measure the AC-018 thresholds on a real project (owner: Gregor). A failed
  re-measurement reopens this spec (PD-035).
- **OP-003** [F-38] PD-020's list names no diagnostic for (a) a `.md` file in a watched folder
  that matches no pattern, (b) a spec without `**Status:**` line or H1. Until decided: (a) no
  entry and no diagnostic, (b) field absent and no diagnostic. Recommendation: (a) one
  file-level "unknown content" diagnostic, so nothing vanishes silently; (b) none here, 0003
  treats an absent status as a contradiction.
- **OP-004** [F-30] A sibling plan beside archived plans of the same stem is normal after a
  reactivation and a stray copy after a completed move; only the lifecycle state tells them
  apart. Recommendation: 0003 flags the stray copy (PD-020); this layer links both.
- **OP-005** [F-51] Symbolic links under `.specs/` that resolve outside the project root.
  Recommendation: do not follow any symbolic link; report it as an unreadable file. Until
  decided the plan builds the recommendation (A-006).
- **OP-006** [F-52] A `Covers:` value or traceability row naming an AC or step that is defined
  nowhere. Until decided: returned as written, no diagnostic. Recommendation: keep it so here;
  0003 may flag it when it reads traceability.
- **OP-007** [F-53] Record the interview answers Q1 and Q2 (R-001) in the PD register, so the
  version range and the two version messages have a source outside this spec.
- **OP-008** [F-47] ADR-001 §9 wants a manual "Rescan" command; AC-022 serves it, but no spec
  owns the command. Recommendation: 0005.
- **OP-009** PD-018 names the stem as join key for return notes, but their file name carries
  only the number (`activeContext.0007-T-003.md`; format §1). AC-010 therefore joins by number.
  Recommendation: correct PD-018's wording.

## 17. Definition of Ready

Goal, problem and the single role are clear. Scope and out-of-scope have reasons. Business
rules and criteria are testable. The happy path and edge cases (§12) are described. Data and
constraints are clarified or recorded as assumptions. `/sdd-clarify` ran on 2026-11-16; its
blocking findings are decided (PD-018, PD-019, PD-020, PD-034, PD-035) and the open points
are visible, none blocking.

## 18. Definition of Done

All FR-01 to FR-10 are built, and AC-001 to AC-023 pass with automated tests (fixture tests
for the parser, one extension-host test for the watcher adapter; commands in
`techContext.md`). No out-of-scope behaviour was added (no file writes). Assumptions are
verified or documented. The architecture snapshot and Memory Bank are updated for the new
core modules. Gregor accepts the result.

## 19. Recommended next steps

1. `/sdd-plan`, after 0001's model of the active project is planned (input dependency).

## Plan history

- 2026-11-17 — [0002-spec-repository-parser.2026-11-17.plan.md](../plan-archive/0002-spec-repository-parser.2026-11-17.plan.md) — T-001…T-011 done; `/sdd-compile` READY (host suite green on Windows at e6f0c85).
