# FeatherSpec Format Reference (SPIKE-001)

**Status:** Verified against FeatherSpec 1.10.0 definitions and four sample projects · 2026-11-16
**Scope:** read-only audit for FS-001 (discovery), FS-002 (parser), FS-003 (lifecycle). Defines no
new structure. Anything not seen in a definition file or a sample is marked **UNVERIFIED**.

## 0. Evidence key

| Key | Source | FS version | DocLanguage |
| --- | --- | --- | --- |
| `A` | `AGENTS.md` (template, this repo) | 1.10.0 | English |
| `R:<name>` | `.claude/rules/<name>.md` | 1.10.0 | — |
| `C:<name>` | `.claude/commands/sdd-<name>.md` | 1.10.0 | — |
| `CL` | `/home/claude/src/template/CHANGELOG.md` | all | — |
| `TS110` | `samples/tip-splitter` — 1 spec + plan in `active/` | 1.10.0 | `Deutsch` |
| `TS180` | `samples/tip-splitter-180` — 1 `Implemented` spec, archived plan | 1.8.0 | `English` |
| `HU180` | `samples/HandsUp-1.8.0-rc3` — 4 `Baseline` specs (reverse-specified) | 1.8.0 | `German` |
| `LS170` | `samples/legacy-shop` — brownfield, 9 specs, `.architecture/` maps | 1.7.0 | `English` |

Samples hold only `AGENTS.md`, `.specs/`, `.memory-bank/` (+ `.architecture/` in LS170); none ships
`.claude/` or `.github/` (`ls -a` of each sample).

## 1. Repository structure map

| Path | Role | Written by | Evidence |
| --- | --- | --- | --- |
| `AGENTS.md` | Constitution; the only home of `DocLanguage`, `FeatherSpecVersion`, `IssueTracker`, `architecture:` snapshot, *Style & Output Preferences*, command table | `/sdd-setup`, `/sdd-featherspec-update`, `/sdd-architecture-update`, `/sdd-style-update` | `A` §Single source of truth |
| `CLAUDE.md` | Thin loader, content `@AGENTS.md` | template | `CLAUDE.md` |
| `.claude/commands/sdd-*.md` | 13 workflow bodies (§9) | template | `A` §Commands |
| `.claude/rules/*.md` | 8 path-scoped rules (`paths:` frontmatter) | template | `R:*` |
| `.claude/agents/*.md` | 3 subagents (§9) | template | `.claude/agents/` |
| `.github/prompts/*.prompt.md`, `.github/instructions/*.instructions.md`, `.github/agents/*.agent.md` | Copilot thin loaders pointing at the `.claude/` bodies | template | e.g. `.github/prompts/sdd-plan.prompt.md` |
| `.specs/{backlog,active,done}/` | Lifecycle folders; spec and (until done) plan | `/sdd-specify`, `/sdd-plan`, `/sdd-lifecycle` | `A` §Spec & plan lifecycle |
| `.specs/plan-archive/` | Frozen plans of completed iterations (since 1.5.0) | `/sdd-lifecycle` | `A` §Plans; `CL` 1.5.0 |
| `.specs/README.md` | Human pointer, no rules | template | `.specs/README.md` |
| `.memory-bank/{projectbrief,systemPatterns,activeContext,techContext}.md` | Project context (§8) | several | `A` §Memory Bank |
| `.memory-bank/activeContext.<NNNN>-<T-00x>.md` | Transient return note of a parallel worker (1.10.0) | `sdd-implementer` | `R:parallel-work` §Return note |
| `.architecture/<unit>.md` | Curated per-module maps (≤ 40 lines) | `/sdd-architecture-scan` | `R:architecture-map`; LS170 |
| `.sdd-scan/` | Volatile scan state, git-ignored | `/sdd-architecture-scan` | `.gitignore` |
| `.sdd-reverse/{_context,_worklist}.md`, `candidates/`, `reports/` | Reverse-spec working state; only `reports/` git-ignored | `/sdd-reverse-specify` | `C:reverse-specify` Phase 0–D; `.gitignore` |
| `.sdd-update/` | Volatile template-update state, git-ignored | `/sdd-featherspec-update` | `.gitignore` |

### 1.1 Project markers (FS-001)

| Marker | Verdict | Evidence |
| --- | --- | --- |
| `AGENTS.md` containing a `FeatherSpecVersion: <semver>` line inside the *Repository Settings* yaml block | **Primary, sufficient** for ≥ 1.2.0. Present in all 4 samples | `C:featherspec-update` §Version check step 2; `CL` 1.2.0; `grep` of samples |
| `.specs/` with ≥ 1 of `backlog/`, `active/`, `done/` | **Required second marker** (all samples, template) | `A` §Spec & plan lifecycle |
| Constitution at `.github/copilot-instructions.md` instead of `AGENTS.md` | Legacy fallback location — accept, **UNVERIFIED** (no sample) | `C:featherspec-update` §Version check step 1 |
| No `FeatherSpecVersion:` but `.claude/commands/sdd-*.md` | Pre-1.2 project; version only estimable (probe ladder) | `C:featherspec-update` §Version check step 3 |
| `.memory-bank/`, `.claude/`, `.github/prompts/sdd-*` | Supporting only — **must not be required**: samples lack `.claude/`/`.github/` | sample listings |

**Does NOT count:** `AGENTS.md` alone (generic cross-tool convention); `CLAUDE.md` `@AGENTS.md`;
`.specs/` alone; `specs/` or `.specify/` (other SDD tools); `.memory-bank/` alone (generic
"memory bank" pattern). Diagnose (FR-001.5) when only one of the two required markers exists.

## 2. Settings block (`AGENTS.md` → *Repository Settings*)

| Key | Values seen | Notes | Evidence |
| --- | --- | --- | --- |
| `DocLanguage` | `English`, `German`, `Deutsch` | Free text, not an enum; governs docs, never wiring | `A`; TS110, HU180 |
| `FeatherSpecVersion` | `1.7.0`, `1.8.0`, `1.10.0` | Managed; drives parser dialect (§6) | samples |
| `IssueTracker` | `none` only | `none \| github \| jira \| <other>`; enables `**Ticket:**` | `A` |
| Snapshot comment | `# last reconciled: <date\|never> · last deep scan: <date\|never>` | TS180 appends free text in parentheses | `A`; TS180 `AGENTS.md:102` |

Value comments are stale-prone: TS110 says `Deutsch # template default until /sdd-setup asks`.

## 3. Spec file schema

### 3.1 Filename and ID

| Item | Rule | Evidence |
| --- | --- | --- |
| Path | `.specs/<folder>/NNNN-slug.md`; new specs start in `backlog/` | `C:specify` Step 5 |
| `NNNN` | Zero-padded 4 digits, continues highest number across all three folders (archive not mentioned) | `C:specify` Step 5; `C:reverse-specify` Phase D ("across `.specs/`") |
| `slug` | ASCII kebab-case, transliterated (`uebungszustand`) | `C:specify` Step 5; HU180 0002 |
| Stable ID | `NNNN` (unique by rule) — the filename stem is the spec↔plan join key | `A` §Plans |
| Title | First line `# <Title>` in DocLanguage | all samples |

### 3.2 Header lines (bold label, colon inside the bold, directly under H1)

| Line | Values | When present | Writer | Evidence |
| --- | --- | --- | --- | --- |
| `**Status:**` | `Draft \| In Progress \| Implemented \| Deprecated \| Baseline` | always (line 3 in every sample) | specify, lifecycle | `A`; `R:specs` |
| `**Plan:**` | `_none yet_` · `[NNNN-slug.plan.md](NNNN-slug.plan.md)` · `[NNNN-slug.YYYY-MM-DD.plan.md](../plan-archive/…)` · `_none_` (Baseline) | since 1.3.0, "never edit by hand" | plan, lifecycle | `R:specs`; `CL` 1.3.0; TS110, TS180 |
| `**Ticket:**` | `KEY-42`, `#42`, or a link with that text | only if `IssueTracker ≠ none` (1.7.0+) — **UNVERIFIED** (no sample) | specify, by hand | `R:specs` |
| `**Origin:**` | `Reverse — Brownfield \| Reverse — Technical Plan` | Baseline only, optional | reverse-specify | `R:specs`; HU180 |
| `**Validated by:**` | `<names> · <date>` | Baseline only, optional | reverse-specify | HU180 |
| `**Clarified:**` | `<date>` | Baseline only, after `/sdd-clarify` — **seen in no sample** | clarify | `R:specs`; `C:reverse-specify` Phase D |

Status values stayed English in every sample, including German ones (TS110, HU180) → stable wiring.

### 3.3 Sections

| Rule | Evidence |
| --- | --- |
| Template has 20 numbered `## N. <Heading>` sections; agent keeps only needed ones and renumbers without gaps | `C:specify` §Spec document structure |
| Never dropped: *Scope* (with *Out of scope*), *Acceptance criteria*, *Assumptions* | same |
| Headings are in DocLanguage (`## 6. Akzeptanzkriterien`, TS110; `## Akzeptanzkriterien` unnumbered, HU180) | TS110, HU180 |
| Fixed English headings (found "by name"): `## Technical Reference` (Baseline), `## Evidence`, `## Conflicts` (candidates only), `## Plan history` | `C:reverse-specify` §Synthesis; `C:lifecycle` step 3 |
| Section number of *Acceptance criteria* varies: 2, 3, 4 (LS170), 6 (TS110), 10 (TS180), 14 (template) | samples |
| `## Plan history` — append-only, one line per archived plan: `- YYYY-MM-DD — [<archive>](../plan-archive/<archive>) — <outcome>` | `C:lifecycle` step 3; TS180:404 |

### 3.4 Acceptance criteria and other IDs

Template definition (`C:specify` §Spec document structure; `R:specs`): ID `AC-NNN`, never
renumbered; one of five EARS-like shapes with **shall** (always / When / While / If…then / Where);
an optional Given/When/Then *illustrates* a criterion, never replaces one. **No checkbox.** The
template shows the shape only inside a code fence, not the markdown rendering — so agents vary:

| Shape written by agents | Sample |
| --- | --- |
| `**AC-001** The system shall …` (bold ID, paragraph) + GWT as `> **Given** … **When** … **Then**` blockquote | TS180 §10 |
| `- **AC-001:** Der Service muss …` (bullet, colon in bold, German "muss" instead of shall) | TS110 §6 |
| `- **AC-009 (nicht verbindliches Ziel):** …` (annotation between ID and colon) | TS110:122 |
| `**AC-001 — <title>**` newline `<shall sentence>` | LS170 all specs |
| `- AC-001 Wenn …, shall das System …` (plain bullet, English shall inside German) | HU180 |
| `- [Uncertain] AC-002 …` inside *Open points* (criterion not promoted, ID gap in AC list) | HU180 0001 |

Other ID families (none is template-mandated except `A-001` in the Assumptions table comment):

| Prefix | Meaning | Forms seen | Evidence |
| --- | --- | --- | --- |
| `A-NNN` | Assumption (table `\| ID \| … \|`, headers translated) | `A-001` | all rich specs |
| `BR-NN` | Business rule (reverse-specify defines it; 2 digits) | `- **BR-01** …`, `- BR-02 …` | `C:reverse-specify`; TS180, HU180 |
| `FR-NN` | Functional requirement table `\| ID \| Requirement \| Criteria \|` | `FR-01` | TS180 §7 |
| `OP-NNN`, `O-NNN`, `R-NNN` | Open point / resolved item | mixed | TS110 §9, TS180 §13 |
| `[Inferred] [Uncertain] [Confirmed]` | Reverse markers; removed on promotion except `[Uncertain]` in Open points | `C:reverse-specify` §Markers | HU180 |
| `*Finding*: *Check*: *Wish*: *Removed*:` | Open-point labels (Baseline), label text in DocLanguage | same | HU180 |

**Requirements** have no template ID scheme (`## 7. Functional requirements` free form): extract
only where `FR-` IDs exist; otherwise expose the section as unstructured text.

## 4. Plan file schema

### 4.1 File, header

| Item | Rule | Evidence |
| --- | --- | --- |
| Name | `<spec stem>.plan.md`, same folder as spec while in `backlog/`/`active/` | `A` §Plans |
| Archive name | `.specs/plan-archive/NNNN-slug.YYYY-MM-DD.plan.md`; collision → `…YYYY-MM-DD-2.plan.md` | `C:lifecycle` step 3 |
| H1 | `# Plan — <spec title>` | `C:plan`; all plans |
| `**Spec:**` | relative link; `../done/NNNN-slug.md` once archived (dangles during reactivation, expected) | `C:lifecycle` step 3; TS180 |
| `**Status:**` | `Not started \| In Progress \| Blocked \| Done` (line 4; only `Done` seen in samples) | `A` §Plans |
| `**Last updated:**` | date | `C:plan` skeleton |
| `**Current step:**` | `T-00x` by template; free text in practice (`none — all nine steps…`, `T-005 abgeschlossen; /sdd-compile READY; …`) | TS180:6, TS110:6, LS170:6 |
| Extra bold header lines | e.g. `**Working mode for this run (…one-off exception…):**` — allowed by preference rule, not in skeleton | `A` §Style (one-off exception noted in plan); LS170:8, TS180:28 |

### 4.2 Sections (headings stay **English** even in German plans — TS110)

`## Approach` (incl. `**Quality gates:** <commands>` line, since 1.3.0) · `## Research` ·
`## Stages` (1.10.0) · `## Steps` · `## Traceability` · `## Session handoff`. Extra sections occur:
`## Blocker — … · RESOLVED <date>` (LS170:88), `### Decisions this plan makes` (TS180:56).

### 4.3 Stages (1.10.0+)

| Element | Format | Evidence |
| --- | --- | --- |
| Stage line | `N. T-001 → T-002 — <deliverable>`; `→` = sequential | `C:plan` §Stages; TS110:66–68 |
| Parallel | `T-003 ‖ T-004` (U+2016); each `‖` step must carry `**Files:**` | `C:plan` §Stages; `R:parallel-work` |
| Closing line | `Parallel: stage 2` or `No parallel stage: <reason>` (English wiring in German plan) | `C:plan`; TS110:70 |
| Absent `## Stages` | pre-1.10 plan: every step is its own stage | `C:featherspec-update` 1.10 data-notes; TS180, LS170 |

No sample contains `‖` → parallel parsing is **UNVERIFIED** against real output.

### 4.4 Steps — two dialects

| Field | 1.10.0 (template, TS110) | ≤ 1.9 (TS180, LS170) |
| --- | --- | --- |
| Heading | `### T-001 — <title>` | same |
| Checkbox | `- [x] **Verified (T-001):** <date — command — result>` | `- [x] **Covers:** …` (box on Covers line) |
| Covers | `- **Covers:** AC-001, AC-002` | same line as box |
| Files | `- **Files:** …` only on `‖` steps | — |
| Do / Verify | `- **Do:** …` · `- **Verify:** <command \| manual: …>` | same |
| Verified | box line above; `—` = empty = not done | `- **Verified:** <date · command · result>` |
| Notes | `- **Notes:** —` | same |

Evidence: `C:plan` §Plan file structure; `CL` 1.10.0 *Changed*; `C:featherspec-update` 1.10 data-notes
("their checkbox stays where it is"). Step IDs are stable, never renumbered, obsolete steps struck
(`R:plans`). `Covers:` content is not a clean list: ranges `AC-001 … AC-020`, prose
(`scaffolding only — no acceptance criterion`, `AC-012 (the amount share of it)`), TS180, TS110:157.

### 4.5 Traceability and handoff

| Item | Format | Evidence |
| --- | --- | --- |
| Table | `\| Acceptance criterion \| Steps \| Code / files \| Test \| State \|` (English headers in all samples) | `C:plan`; all plans |
| `State` | `open \| built \| verified` (since 0.4.0) | `C:plan`; `CL` 0.4.0 |
| `Test` cell | path + test name, or `manual: <who checked what>`; empty = nobody checked | `C:plan` |
| Session handoff | `**Done so far:**`, `**Next action:**`, `**Open decisions:**`, `**Baseline:**` (commit hash), `**Environment:**` | `C:plan`; all plans |
| `Baseline:` | may stay the skeleton placeholder (`_(Commit-Hash … wird bei Arbeitsbeginn gesetzt)_`) | TS110:246 |

## 5. Lifecycle mapping

### 5.1 What is persisted

| Folder | Spec status (expected) | Plan location / status | Meaning | Evidence |
| --- | --- | --- | --- | --- |
| `backlog/` | `Draft` | none, or sibling `.plan.md` `Not started` | idea / specified / planned | `A`; `C:plan` Mode B |
| `active/` | `In Progress` | sibling, `Not started`→`In Progress`→`Done` (or `Blocked`) | implementation | `A`; `C:lifecycle` |
| `active/` | `In Progress` | sibling `Done` | **awaiting `/sdd-compile` + done move** — "correct, never a finding" | `C:compile` §Expected state; TS110, LS170 |
| `done/` | `Implemented` | archived `plan-archive/NNNN-slug.DATE.plan.md`, `Done`, frozen; `**Plan:**` links it | completed | `C:lifecycle` step 3; TS180 |
| `done/` | `Deprecated` | archive stays frozen; spec links successor or `successor: none — behaviour removed`; dated line in `## Plan history` | superseded | `A`; `C:lifecycle` — **UNVERIFIED** (no sample) |
| `done/` | `Baseline` | none (`**Plan:** _none_`) | brownfield as-is, exempt from evidence gate | `A`; HU180 |
| `done/` (legacy ≤1.4) | `Implemented` | sibling `.plan.md` beside spec | valid pre-1.5 layout, archived "in passing" | `C:lifecycle` Rules |
| `.sdd-reverse/candidates/<slug>.reverse-spec.md` | `Reverse candidate` | — | not a spec yet; not in `.specs/` | `C:reverse-specify` §Synthesis |

Reactivation: `done/` → `active/` (`In Progress`), `**Plan:**` keeps the archive link until a fresh
plan exists (`C:lifecycle` step 3). Abandoned never-implemented specs are deleted, not archived.
Other persisted signals: return notes `activeContext.<NNNN>-<T-00x>.md` with `**Status:** DONE \|
BLOCKED` (`R:parallel-work`; no sample); `activeContext.md` `Current phase: specify \| plan \| act \|
idle` (`R:memory-bank`).

### 5.2 Studio board states → derivation rules (proposal)

| Board state | Persisted? | Proposed rule (first match wins top-down: Done, Blocked, Review, Active, Ready, Backlog) | Evidence / confidence |
| --- | --- | --- | --- |
| **Backlog** | yes (folder) | spec in `backlog/` and not Ready | `A` |
| **Ready** | **no** — derived | `backlog/` ∧ `Status: Draft` ∧ sibling plan exists ∧ `**Plan:**` links it ∧ plan `Not started` ∧ no blocker. Plan *approval* is not persisted (approval ⇒ only a commit) | `A` Flow; `C:plan` §Always. No sample in this shape → **UNVERIFIED** |
| **Active** | yes (folder + status) | `active/` ∧ `In Progress` ∧ plan ∈ {`Not started`, `In Progress`} | `A`; `C:lifecycle` |
| **Review** | **no** — derived | `active/` ∧ `In Progress` ∧ plan `Done` | `C:compile` §Expected state; TS110, LS170 |
| **Done** | yes | `done/` ∧ `Status` ∈ {`Implemented`, `Baseline`}; `Deprecated` = Done + badge (product decision) | `A`; TS180, HU180 |
| **Blocked** | partly (plan field only) | plan `Status: Blocked` ∨ return note with `BLOCKED`. Do **not** derive from `activeContext.md` *Blockers* prose or `## Blocker` sections (LS170 resolved one without plan status change) | `A` §Plans; `R:parallel-work` |

Contradictions to surface as diagnostics, not as a state: `active/` + `Draft`; `done/` non-`Baseline`
without archive link (a `/sdd-compile` blocker); same stem in two folders; `.plan.md` without spec;
plan stem with dated twin in archive (`C:overview`, `C:compile` §Docs sync).

## 6. Verification mapping

| Evidence | Where | Machine-readable? | Evidence |
| --- | --- | --- | --- |
| Step run | `Verified (T-00x):` (1.10) / `Verified:` (≤1.9): `date · command · result`, red+green for test steps | date reliably; rest free prose, mixed language (TS110 T-001 English, T-002 German) | `R:plans`; TS110:100–131 |
| Criterion state | Traceability `State` = `open/built/verified` + `Test` cell | yes (enum); `manual:` prefix detectable | `C:plan` |
| Non-binding criterion | `open` row in a `Done` plan (TS110 AC-009) — only marked in prose | no | TS110:122, 230 |
| `/sdd-compile` verdict | `READY \| READY (manual items: n) \| NOT READY \| NOT READY — unverified` — **chat brief only, not persisted** by the template | no; appears only as prose in samples (`Current step: … /sdd-compile READY`, `activeContext` *Validation*) | `C:compile` §Produce; TS110:6, TS110 `activeContext.md` |
| Outcome after done | `## Plan history` line prose (`37 pass / 0 fail`) | no | TS180:404 |
| Spec DoR/DoD checklists | `- [x]` / `- [ ]` in spec sections — **not** evidence; TS180 is `Implemented` with DoD boxes unticked | must be ignored for lifecycle | TS180:375–388 |
| Test ↔ AC | AC ID inside test names (`"AC-003: …"`) — fallback traceability | grep-able in code | `R:plans`; `C:plan` Mode C |

## 7. Lifecycle evidence gate (input for FS-003 readiness/Done rules)

Before `done/`: every step ticked **and** `Verified:` filled · traceability rows with real paths and
a test per criterion · no unintegrated return note · a `READY` compile brief or the `Verified:`
lines · behaviour-changing `Notes:` reconciled into the spec (`C:lifecycle` Rules). Baselines exempt.

## 8. Memory Bank and architecture context (what a tool can read)

| File | Shape | Parse value | Evidence |
| --- | --- | --- | --- |
| `activeContext.md` | 3 metadata lines (`Last updated:`, `Current branch:`, `Current phase:`) + `## Now`, `## Active Spec` (spec/plan links, current task), `## Changed Recently`, `## Decisions in Flight`, `## Blockers / Questions`, `## Next`, `## Validation`; ~60 lines | good dashboard source; links to spec/plan are markdown links; headings stayed English in all samples | `R:memory-bank` §Structure |
| `projectbrief.md` | `## Mission`, `## Primary users`, `## Success criteria` | project card | template; samples |
| `techContext.md` | `## Stack`, `## Build / Run`, `## Test`, `## Quality gates` (ordered command list), `## Constraints` | quality-gate commands for "Verify" UI | `C:setup` B; TS110 |
| `systemPatterns.md` | decisions (dated bullets with source link); `## Knowledge records` = `### <observation>` + fenced yaml `fs-knowledge:` (`id`, `evidence`, `rationale.state: decided\|unknown`) | yaml blocks are the most parse-stable artifact in FeatherSpec | `R:knowledge-records`; LS170, TS180 |
| `AGENTS.md` `architecture:` | yaml: `style`, `entrypoints[]`, `modules[]`, `shared[]`, `boundaries[]` (+ `unmapped:` after deep scan) | yaml, values are free strings; `TBD` placeholders (HU180) | `A`; `C:overview` |
| `.architecture/<unit>.md` | `# last reconciled:` line, then pattern · entry points · playbooks · deviations · traps | prose, ≤ 40 lines by rule (LS170 maps are 49) | `R:architecture-map`; LS170 |

Memory Bank headings are translated in some files (`## Architekturstil`, TS110 `systemPatterns.md`)
but not others (`## Quality gates` kept English because spec links use the anchor, TS110 spec §7).

## 9. Commands, agents, loaders

| Command | One line | Writes |
| --- | --- | --- |
| `/sdd-overview` | status report, duplicate/stray/return-note warnings | nothing |
| `/sdd-setup` | onboarding: DocLanguage, Memory Bank, snapshot, quality gate + TDD agreements, tracker | `AGENTS.md`, `.memory-bank/*` |
| `/sdd-specify` | adaptive interview → `backlog/NNNN-slug.md` (`Draft`) | spec |
| `/sdd-clarify` | adversarial review, 6 lists, optional walkthrough | spec *Open points* (on yes); `**Clarified:**` for Baselines |
| `/sdd-plan` | spec → `.plan.md` (modes A new / B resume / C re-plan) | plan, spec `**Plan:**` |
| `/sdd-compile` | readiness brief + verdict | nothing (chat) |
| `/sdd-lifecycle` | moves, status edits, plan archiving, ticket sync | specs, plans, Memory Bank |
| `/sdd-architecture-update` | drift → snapshot + Memory Bank | `AGENTS.md`, `.memory-bank/*` |
| `/sdd-architecture-scan` | resumable deep scan | `.sdd-scan/`, `.architecture/`, snapshot |
| `/sdd-reverse-specify` | code → evidence → validation → `Baseline` | `.sdd-reverse/`, `done/NNNN-*.md` |
| `/sdd-style-update` | capture style preferences | `AGENTS.md` |
| `/sdd-featherspec-update` | template version check / update | wiring, `FeatherSpecVersion` |
| `/sdd-clean` | dedupe/compact persistent markdown | Memory Bank, docs |

Agents: `sdd-implementer` (one `‖` step → return note), `sdd-scout` (scan unit report),
`sdd-reverse-scout` (capability evidence report); Copilot also `SpecDrivenAgent` (persona pointer).
Recommended flow (`A` §Commands): specify → clarify → plan → human reads plan → lifecycle (backlog→
active) → implement → compile → lifecycle (active→done).

## 10. Inconsistencies, unknowns, parser risks

| # | Finding | Evidence | Parser consequence |
| --- | --- | --- | --- |
| 1 | Five different AC renderings; template gives the shape only in a code fence | §3.4 | match `AC-\d{3}` as the first token of a bullet/bold paragraph, not a fixed line regex |
| 2 | AC IDs appear as references everywhere (FR tables, Covers, Open points, scope) | TS180 §7, TS110:26 | distinguish definition (first in block, inside the section holding most definitions) from reference |
| 3 | AC section heading translated and numbered 2–14 | §3.3 | locate by AC definitions, never by heading text or number |
| 4 | Baseline ACs with gaps; unpromoted criteria live in *Open points* with `[Uncertain]` | HU180 0001 | treat AC IDs in Open points as "uncertain criterion", not as missing |
| 5 | Binding verb varies: `shall`, `muss`, English `shall` in German | TS110 §6, HU180 | never validate by keyword; non-binding flag only via prose |
| 6 | Checkbox moved from `Covers:` (≤1.9) to `Verified (T-00x):` (1.10); old plans keep old dialect | §4.4 | dual-dialect step parser keyed on `### T-\d+` |
| 7 | `Covers:` contains ranges `…` and prose | TS180:245, TS110:157 | expand `AC-a … AC-b`; keep raw text |
| 8 | `Current step:` is free text once work ends | TS180:6, TS110:6, LS170:6 | derive current step from first unticked step, not this line |
| 9 | Compile verdict not persisted; only in free text | `C:compile`; TS110 | Review→Done needs Studio-side verdict storage or human confirmation |
| 10 | `done/` + `Implemented` + `**Plan:** _none yet_` (invariant breach) and Baseline with `_none yet_` instead of `_none_`; Baseline without `Origin` "generated by /sdd-specify in Baseline mode" | LS170 `done/0002`, `done/0001` | diagnostics, not crash; accept both placeholders |
| 11 | No `**Clarified:**` on any Baseline (HU180, LS170) → none could be planned against per rule | HU180, LS170 | readiness rule for Baselines would block all samples |
| 12 | `activeContext.md` drift: `Current phase: idle` while spec active (TS110); free-text phase (HU180); missing H1 (TS110); 69 lines (LS170) | samples | don't derive lifecycle from activeContext |
| 13 | Language mixing: plan headings, traceability headers, `Verified (T-001)` text English in German project | TS110 | headings in plans are effectively stable wiring — but not guaranteed by any rule (`R:plans` says "write in DocLanguage") |
| 14 | Handoff `Baseline:` left as placeholder | TS110:246 | treat italic placeholder as empty |
| 15 | Spec checkboxes (DoR/DoD) unticked in an `Implemented` spec | TS180:387–388 | never count spec checkboxes as tasks/progress |
| 16 | Non-template sections and header lines in plans | LS170:8,88; TS180:56 | preserve as "unknown content" (FR-002.9) |
| 17 | Multiple ID families with different widths (`BR-01`, `FR-01`, `A-001`, `OP-001`, `O-001`, `R-007`, `D-1`, `A-T1`, `E-16`) | §3.4 | only AC and T are stable wiring; others optional |
| 18 | `DocLanguage` is free text (`German` vs `Deutsch`) | §2 | normalise loosely; don't switch heading dictionaries on it |
| 19 | `.architecture/` maps exceed the 40-line budget | LS170 (49 lines each) | budget is advisory |
| 20 | Unseen in any sample: `‖` stages, `Files:`, plan `Blocked`/`Not started`/`In Progress`, `Deprecated`, `**Ticket:**`, return notes, `-2` archive suffix, `Reverse candidate` files | all samples | hand-made fixtures required; **UNVERIFIED** |
| 21 | Next `NNNN` is taken from the three lifecycle folders only, and never-implemented specs are deleted on abandonment — an archived plan can then share its number with a new spec | `C:specify` Step 5; `C:lifecycle` Rules | key specs by folder-independent stem, flag duplicate numbers |

## 11. Proposed fixture set (FS-002 AC-002.1)

| Fixture | Built from | Covers |
| --- | --- | --- |
| `fs110-de-active-review` | TS110 copy | 1.10 dialect, German headings, plan `Done` + spec `In Progress` (Review), non-binding AC |
| `fs180-en-done-archived` | TS180 copy | ≤1.9 dialect, archive + `## Plan history`, GWT blockquotes, FR/BR tables, spec checkboxes |
| `fs180-de-baselines` | HU180 copy | Baseline header, AC gaps, `[Uncertain]`, `## Technical Reference` |
| `fs170-brownfield-mixed` | LS170 copy | 6 backlog drafts, `AC — title` form, `.architecture/`, `fs-knowledge`, invariant breach (0002) |
| `fs110-parallel-synthetic` | hand-made from `C:plan` skeleton | `‖` stage, `Files:`, return notes DONE + BLOCKED, plan `Blocked` |
| `fs110-ready-synthetic` | hand-made | backlog spec + `Not started` plan (Ready), `Deprecated` with successor, `**Ticket:**`, `-2` archive |
| `fs-broken` | hand-made | duplicate stem in two folders, orphan plan, malformed header, unreadable file (AC-002.5) |
| `not-featherspec` ×3 | hand-made | `AGENTS.md` only; `.specs/` only; spec-kit `specs/` + `.specify/` (AC-001.2) |
| `fs-legacy-unstamped` | hand-made | constitution without `FeatherSpecVersion:` + `.claude/commands/sdd-*` (pre-1.2) |
