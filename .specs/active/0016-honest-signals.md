# Honest Signals: Diagnostics in Three Tiers, User Language, Readiness as a Need

**Status:** In Progress
**Plan:** [0016-honest-signals.plan.md](0016-honest-signals.plan.md)

*Amended by 0018 (PD-062): §6.2 rows *Needs attention* and "Mission Control header", T-01, T-02, T-04: no header — T-01 gives way to the Problems heading, whose n counts its rows (0018 O-4), its request the heading's (0018 AC-007); T-02 goes into the project name's tooltip (0018 AC-025); a Problems row shows each Problem's own reason, so T-04 ends with the attention list; T-09 leaves cards and tiles for the column tooltip (0018 B-6).*

*Amended by 0018 (PD-062): wherever this spec names Mission Control or the Spec Board as a place, read Overview or Board; the rows of 0018 §5 change behaviour.*

*Amended by 0021 (PD-069): wherever this spec names the control "Copy" of a prompt (a next step or `/sdd-specify`), read `Copy prompt`, named as 0021 §6.4; the feedback stays; wherever it shows a next step line, 0021 §6.1 gives each line its intent.*

Basis: UX audit 2026-11-17 (`docs/ux-audit/` R-01, R-08, R-09, R-12, R-13, R-17, R-18; Q-3, Q-4);
PD-058, PD-059 (proxy); `.claude/rules/ux-guidelines.md` 3, 6, 8–10; PD-016, PD-013. Gregor is not
reachable: open questions are decided by audit, PD register and guidelines, marked *(proxy)* (§11).
Amends 0002, 0003, 0005–0007, 0013–0015 (§5); its new PD entry supersedes parts of PD-004, PD-015,
PD-041 and refines PD-059; restates none.
Comes before 0017–0020, which use its tiers, texts and Copy feedback.

## 1. Summary

Every diagnostic gets a tier: *Problem* (shown wherever the spec appears, counted), *format note*
(collapsed count in the detail) or *compatibility* (written by FeatherSpec 1.10.0: accepted, not
reported). Rule IDs move to tooltips, permanent "not available" lines go, backlog specs show needs,
history reads as sentences, Copy is primary, `**` renders cleanly, S2 says what Set up does.

## 2. Goal and problem

Measured 2026-11-17 on this repository at commit `8052f9a` (15 specs, 2 plans, 13 archived plans,
FeatherSpec 1.10.0) with the Studio's own `readProject` and `deriveLifecycle`: **83 diagnostics on
15 of 15 specs**, one warning for all, none needing an action; five flag the `**Successor:**` line
the Studio reads itself. Fresh backlog specs show red failure icons; `S-READY`, `R-3`, "persisted"
fill cards, tiles and history; Copy looks secondary and confirms in the error colour with a layout
shift. Goal: the Studio says only what is true and matters, so a real problem stands out again.

**Yardstick:** on this repository at commit `8052f9a` the Studio shows no problem anywhere and the
detail of each spec shows the format-note count of §6.1; a lifecycle contradiction shows on its
card, in *Needs attention*, in the header count and in its detail (AC-004, AC-005, AC-006).

## 3. Users and roles

Developer (one role, as in 0001–0007); first-time workshop participants.

## 4. Scope

### In scope

- Tiers for every diagnostic of 0002 and 0003, the parser accepting `**Successor:**`, R-6 by tier.
- Where each tier shows (§6.2); readiness as a need (§6.3); times and history (§6.4); Copy (§6.5).
- Every text of §7; the `**` rendering fix; README, CHANGELOG and release checklist lines.

### Out of scope

- Next step beyond the detail, moves and the board's status line (0017; here only its Copy and
  Dismiss styles, §6.5), Overview, tiles, compact board, "Last change" (0018), detail layout and
  files beside (0019) — because PD-058 gives them to those specs.
- A problem marker on Spec Explorer list rows — because 0020 replaces the list by the tree, which
  marks *Problem* (deviation from guideline 3, named; the detail shows it on selection).
  *Amended by 0020 (PD-058): §4 out of scope "problem marker on Spec Explorer list rows" — void for the list: the tree shows T-09 in the tooltip and no rule ID in label or description (0020 §4.2).*
- Diagnostics in the Problems panel (R-20) — because PD-061 (2) builds nothing before validation.
- Reading a free-text traceability state by its first word — because a guess overstates progress.
- Rewording single diagnostics' reasons — because they name what the file holds.
- Changing R-1…R-7, the compile-verdict fact or priority in the model — because only display changes (R-6 aside).
- A setup sentence in S9 — because S9 already says per folder what remains.

*Amended by 0017 (PD-060/PD-061): "its Copy and Dismiss styles" (the drop result's) is void (PD-060); the detail's Copy keeps them; card and row Copy are Copies of a next step here.*

## 5. Amendments of other specs

The plan applies these as inline notes "*Amended by 0016 (PD-059, proxy): …*", as 0015 did, and
writes one new PD entry (next free number) with the proxies of §11 that supersedes the PD rows
below; the register is history, no older entry gets a note. Texts are §7's T-IDs. Any other
statement of these specs that shows every diagnostic, a rule ID, or a priority, verdict or
dependency line reads as amended by this table.

| Spec · statement | Amendment |
| --- | --- |
| 0002 BR-05 closed set of header lines; AC-014 | Adds `**Successor:**`: read, no diagnostic (compatibility) |
| 0002 §8 *Diagnostic*; AC-015 second sentence | Every diagnostic carries a tier (§6.1); an ID twice stays a diagnostic, tier *format note* |
| 0002 AC-006 "orphan plan with a diagnostic"; AC-017 first sentence | A plan in `backlog/` or `active/` whose stem matches no spec stays in the model as an orphan, with no diagnostic and no dangling-link diagnostic (compatibility, §6.1) |
| 0003 §6.2 row R-6 and the note "The other diagnostic kinds … do not fail R-6" | R-6 fails exactly when the entry carries a *Problem* |
| 0003 §6.5 scope-statement label; AC-016 label | Label T-15; the scope itself is unchanged |
| 0005 §9 Spec Explorer bullet and AC-007 "the *derived* label and its rule" | T-09 with T-08 tooltip |
| 0005 §13 row S2; AC-012 | S2 adds T-20 after its line |
| 0006 §4 header count; §6 term *Project-level diagnostic*; BR-01 (d); BR-08 row "Diagnostics count in the header"; AC-017 number, time, named set "Diagnostics"; AC-010 time, "no longer observed"; A-012; OP-5 | Reason (d) "Problem" (T-04): the spec carries a *Problem*; header T-01 only while > 0 (AC-008); set T-03; time T-02; entries T-17, T-16 |
| 0006 AC-009 | No *format note* counts as reason (d) |
| 0006 AC-025; 0013 §2 deltas 4–5, §3.2 header, §3.5, AC-004, AC-006, AC-010 | Sentences T-09, needs T-11; rule and check IDs in the tooltip only (T-08, T-12); header T-01 |
| 0007 §6.1 bullets 1, 4, 5; AC-003; AC-005 second sentence; AC-024 | Derived marker: T-09 with T-08 tooltip; badge counts *Problems* (T-05); Backlog cards show a need (§6.3), no check ID; no element shows priority |
| 0007 §6.4 Overview and Verification rows; AC-010 Overview; AC-024 readiness checks | State chip with T-09 or nothing visible (T-10); needs in place of R-1…R-7; *Problems* below "Next step"; format notes collapsed (§6.2); no priority or verdict line (T-13) |
| 0007 §6.4 history row; AC-027 label | Entries per §6.4 (T-14); label T-15 |
| 0007 AC-020; §13 row "Diagnostics tied to no spec entry"; 0013 AC-009 last sentence | Badge for *Problems* only; banner per AC-009; 0013 AC-009 reads 0007 as amended here |
| 0014 §9 S2 bullet; AC-026 M-1 | S2 carries T-20; M-1 judges the look with it |
| 0015 §6.1 NS-1 text; §8 Detail and Drop result; §9 first bullet; AC-005; AC-009 | NS-1 T-18; feedback at the button (§6.5, T-19); Copy primary, Dismiss secondary |
| 0013 AC-016; 0015 AC-027 (test audits) | Also except the tests 0016 AC-023 lists against a criterion this table changes |
| PD-004 "labelled as derived in the UI and shows its rule"; PD-015, PD-041 "'Priority: not available'" (superseded by the new entry) | Label and rule in the tooltip (T-08), the sentence visible; nothing about priority is shown, the README says once why |
| PD-059 (refined by the new entry) | §6.1 (A-001, A-002) |

*Amended by 0019 (PD-058): §5 row on 0007 §6.4 Overview — 0019 §6.2 gives the detail no Overview section: needs sit in Progress (0019 AC-011), the history is section 7 (0019 AC-015).*

*Amended by 0017 (PD-060/PD-061): the parts on 0015's *Drop result* are void (PD-060).*

## 6. Business rules

### 6.1 Tiers (measured at `8052f9a`; FeatherSpec 1.10.0 = `AGENTS.md`, `.claude/commands/`, `.claude/rules/`)

| What the Studio finds | At 8052f9a | Tier | Why |
| --- | --- | --- | --- |
| Lifecycle contradiction (0003 §6.3) | 0 | Problem | breaks the lifecycle invariants of `AGENTS.md` |
| File or folder that cannot be read, listed or parsed | 0 | Problem | nothing about it can be shown |
| One stem in two folders; one number with two slugs | 0 | Problem | "exactly one lifecycle folder" (`AGENTS.md`) |
| `**Plan:**` link to a missing file; a sibling plan's `**Spec:**` link to a missing file while a spec has its stem | 0 | Problem | `/sdd-lifecycle` writes and retargets both (A-002) |
| `**Status:**` of spec or plan, or a return note's `Status`, outside its vocabulary | 0 | Problem | `AGENTS.md`, `parallel-work.md`; the state cannot be derived (A-001) |
| Return note whose number matches no spec | 0 | Problem | `parallel-work.md`: integrated, then deleted (A-001) |
| Traceability `State` not `open`, `built`, `verified` | 29 | Format note | `/sdd-plan`: "`State` is one of `open \| built \| verified`" |
| Plan section outside the six of the skeleton (`Open evidence` 13, `Texts …`/`Notices …` 5, `Test-title audit` 1) | 19 | Format note | not in the `/sdd-plan` skeleton (A-003) |
| `AC-`/`FR-` ID defined twice in one spec, one note per definition (at 8052f9a a later note item starting with the ID) | 14 | Format note | every definition is kept (0002 AC-015) |
| Step field outside `Covers`, `Files`, `Do`, `Verify`, `Verified`, `Notes` (`Deletes` 8, `Added` 6) | 14 | Format note | not in the step skeleton (A-003) |
| Handoff field outside the five of the skeleton (`Evidence`, `Open evidence`) | 2 | Format note | not in the skeleton |
| Any other skeleton deviation: extra or repeated header line, unexpected text, traceability columns or cells, undecidable checkbox, step ID twice | 0 | Format note | the first value is used; nothing is lost |
| Project level: any other plan whose stem matches no spec (archived or in `done/`; its dangling `**Spec:**` link too); version not verified or newer than known | 0 | Format note | FeatherSpec never deletes a `done/` spec; the Studio reads every version alike (0002 AC-016) |
| `**Successor:**` header line of a Deprecated spec | 5 | Compatibility | `/sdd-lifecycle` "links its successor spec"; the Studio reads it (PD-022, PD-059) |
| Plan in `backlog/` or `active/` whose stem matches no spec: its orphan and dangling-`**Spec:**` findings | 0 | Compatibility | `/sdd-lifecycle` abandons a spec by deleting it; `AGENTS.md`: "A plan file is never deleted" (A-001) |

At `8052f9a`: 83 diagnostics → 0 Problems, 78 format notes, 5 not reported. Notes per spec (with
its plans and notes): 0001 7 · 0002 3 · 0003 2 · 0004 4 · 0005 2 · 0006 8 · 0007 2 · 0008 1 · 0009 1 ·
0010 28 · 0011 3 · 0012 1 · 0013 1 · 0014 5 · 0015 10. Fixtures: `fs-broken` 2 Problems (0002
unreadable, 0003 contradiction); `fs170-brownfield-mixed` 1 Problem (0002), 2 notes (0006);
`studio-0002` 2 notes; `fs-legacy-unstamped` 1 project note; `fs110-de-active-review`,
`fs110-parallel-synthetic`, `fs110-ready-synthetic`, `fs180-de-baselines`, `fs180-en-done-archived` none.
FeatherSpec 1.10.0 writes none of `Added`, `Deletes`, `Open evidence`, `Evidence` (A-003).

### 6.2 Where each tier shows

| Surface | Problem | Format note |
| --- | --- | --- |
| Card | warning icon and T-05 | — |
| *Needs attention* | reason T-04 | — |
| Mission Control header | counted in T-01 (every Problem: on specs and at project level) | — |
| Board banner (project level only) | listed under T-06 | collapsed toggle T-07 |
| Detail | each with the warning icon and its reason, directly below "Next step", not collapsible | toggle T-07 in Overview, collapsed when shown |
| Readiness | R-6 fails | R-6 passes |

*Amended by 0019 (PD-058): §6.2 detail row "toggle T-07 in Overview" — no Overview section: T-07 heads section 6, Format notes, collapsed on every showing (0019 §6.2, AC-015).*

*Amended by 0022 (PD-069): §6.2 Detail row — each Problem shows its sentence (0022 §6), the reason is its tooltip (0022 §4.5).*

Compatibility shows nowhere. A `**Successor:**` line is read in every spec; only a Deprecated
spec's is used, and its successor appears once in its detail. NS-2 and NS-11 stay as 0015 defines them.

### 6.3 Readiness as a need

For an entry in state Backlog, needs in this order; the card shows the first, the detail all, as
neutral text without icon, in place of the readiness checklist. None applies → no need line.
R-1, R-5, R-6, R-7 never show as needs: their cases show as a Problem, as Blocked, or never.

| Fails | Condition | Need (T-11) |
| --- | --- | --- |
| R-2 | no criterion | `needs acceptance criteria` |
| R-3 | no sibling plan | `needs a plan` |
| R-3 | sibling plan, Plan line does not link it | `needs the Plan line to link its plan` |
| R-4 | sibling plan with status `In Progress` or `Done` | `plan already started` |
| R-4 | sibling plan whose Status line is missing or empty | `plan has no status` |

### 6.4 Times and status history

**When** (local time of the panel): `Today HH:MM`, `Yesterday HH:MM`, else `YYYY-MM-DD HH:MM`; the
header uses `Updated HH:MM` today, else `Updated YYYY-MM-DD HH:MM`. A history entry reads
`<when> — ` plus: `first seen as <new>` (first observed) · `<old> → <new>` (files changed) · `<old> →
<new> (changed while Studio was not running)` · `<old> → no longer in the project`; a flow marker
*outside the FeatherSpec flow* adds ` (outside the FeatherSpec flow)`. Its tooltip holds the stored
time, the rule ID and the changed paths. Order and content of the history are unchanged.

### 6.5 Copy

Every Copy the Studio offers for a next step uses the primary button style; the drop result's
Dismiss uses the secondary style. After Copy the button's label reads `Copied` or `Could not copy`
for 2 s, then `Copy`; the sentence of T-19 is announced through a visually hidden live region and
is the button's tooltip meanwhile; its accessible name reads `<label>: <line>` throughout. Nothing
else appears, moves or changes colour; the button keeps its size. Success never uses the error colour.

*Amended by 0017 (PD-060/PD-061): the drop result's Copy and Dismiss are void (PD-060); the detail's Copy keeps them; card and row Copy are Copies of a next step here.*

*Amended by 0021 (PD-069): §6.5 and AC-018 — the label reads `Copy prompt` and, after a Copy, `Copied` or `Could not copy` for 2 s, then `Copy prompt`; the accessible name reads `Copy prompt: <line>` (0021 §6.4, AC-008).*

*Amended by 0022 (PD-069): §6.5 — only the Copies of 0022 §4.4 (1) to (3) use the primary style; every further side-panel line is secondary and every list Copy an icon button whose check or warning icon is the feedback, in a fixed box of at least 24 × 24 px (0022 AC-010 to AC-012).*

*Amended by 0024 (PD-068): §6.5 "Nothing else appears, moves or changes colour" — except 0024 §6.5's warning notification after a Send that copies.*

## 7. Texts (English, PD-016; all *(proxy)*, starting from audit 04 "Texte und Sprache")

| ID | Where | Old | New |
| --- | --- | --- | --- |
| T-01 | MC header | `<p> project-level diagnostics · <s> specs with diagnostics` (always) | `1 problem` · `<n> problems` (n counts Problems, as T-05 does); nothing at 0 |
| T-02 | MC header time | `Model updated <YYYY-MM-DD HH:MM>` | `Updated <HH:MM>` today, else `Updated <YYYY-MM-DD HH:MM>` |
| T-03 | Named set from T-01 | `Diagnostics` | `Problems` |
| T-04 | Attention reason | `Diagnostic` | `Problem` |
| T-05 | Card badge | `1 diagnostic` · `<n> diagnostics` | `1 problem` · `<n> problems` |
| T-06 | Board banner heading | `Project diagnostics` | `Problems` |
| T-07 | Format-note toggle | — (every diagnostic listed) | `1 format note — no action needed` · `<n> format notes — no action needed` |
| T-08 | Tooltip of a derived sentence | — (`S-READY` visible) | `Derived from the files · rule S-READY` (S-REVIEW, S-BLOCKED alike) |
| T-09 | Derived sentences | `Derived: draft with a plan that has not started` · `Derived: plan is Done, waiting for review` · `Derived: plan or return note says Blocked` | `Plan written, not started yet` · `Plan done, waiting for review` · `Plan or return note says Blocked` |
| T-10 | Detail state, persisted | `S-BACKLOG · persisted` (S-ACTIVE, S-DONE, S-FOLDER alike) | nothing visible; chip tooltip `Read from the files · rule S-BACKLOG` |
| T-11 | Need | `No acceptance criterion (AC-NNN) found. R-2` · `No sibling plan, or the Plan line does not link it. R-3` · `The sibling plan is missing or not "Not started". R-4` | the five needs of §6.3 |
| T-12 | Tooltip of a need | — | `Not Ready yet · rule R-3` (R-2, R-4 alike) |
| T-13 | Detail lines | `Priority: not available` · `/sdd-compile verdict: not available — FeatherSpec does not persist it.` · `R-1: pass` … `Inter-spec dependencies: not available — FeatherSpec has no dependency field. R-7` | removed |
| T-14 | History entry | `2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked` | `Today 21:56 — first seen as Review` (§6.4) |
| T-15 | History label | `Observed by Studio while it was running — not a reconstruction` | `Only changes Studio saw while it was running.` |
| T-16 | History and activity | `no longer observed` | `no longer in the project` |
| T-17 | Activity time | `2026-11-17 21:56` | `Today 21:56` (§6.4) |
| T-18 | NS-1 | `Studio cannot read this spec. See its diagnostics.` | `Studio cannot read this spec. See the problem below.` |
| T-19 | Copy feedback | line below: `Copied to the clipboard.` · `Could not copy to the clipboard.` | label `Copied` · `Could not copy` for 2 s; the old sentences announced and as tooltip |
| T-20 | S2, view and panel | — | `Set up FeatherSpec downloads the latest FeatherSpec release from GitHub and adds its files; existing files are never overwritten.` |

## 8. Error cases and edge cases

- Unreadable spec: NS-1 (T-18), its Problem below the next step, card badge, attention row.
- A diagnostic on a spec's archived plan or return note counts for that spec, in its tier.
- Problems only at project level: T-01 counts them; its drill opens the board, whose banner lists them.
- Abandoned spec (deleted, its plan kept in `backlog/` or `active/`): the plan's orphan and Spec-link findings are not reported.
- Unparsable history time: shown as stored. `<when>` is computed at each render (midnight).

## 9. Acceptance criteria

Decided by unit or component tests on memory sources or fixtures unless marked manual (AC-005 reads
the repository's own `.specs/`).

- **AC-001** The system shall give every diagnostic of 0002 and 0003 exactly one tier, *Problem* or *format note*, as §6.1 assigns it, and shall report no diagnostic for a *compatibility* row; one test per row decides it.
- **AC-002** When a spec carries a `**Successor:**` header line, the parser shall read it as a known header line and the system shall report no diagnostic for it; for a Deprecated spec the model shall take the successor from it and the detail shall show the successor once.
- **AC-003** For each fixture §6.1 names, the system shall report exactly the Problems and format notes per spec and at project level that §6.1 lists; apart from each diagnostic's tier and `fs110-ready-synthetic`'s Successor line, every fixture's read result (entries, fields, sections, steps, rows, diagnostics' kind, scope and reason) shall equal a snapshot taken at the plan's Baseline commit, the 1.7.0, 1.8.0 and legacy fixtures included.
- **AC-004** For an unmodified copy of this repository's `.specs/` at commit `8052f9a`, the system shall report 0 Problems, 78 format notes with §6.1's count per spec, and nothing for the five Successor lines.
- **AC-005** For this repository's own `.specs/`, read by a test in every unit-test run, the system shall report no Problem.
- **AC-006** While a spec carries a Problem, the system shall show the warning icon with T-05 on its card, the reason T-04 in its *Needs attention* row, and each Problem with the warning icon and its reason directly below the detail's "Next step"; while it carries none, none of these shall appear.
  > **Given** `fs-broken` **When** the board, Mission Control and the detail of 0003 render **Then** 0003's card reads `1 problem`, its attention row `Problem`, and its detail shows the contradiction's reason.
  *Amended by 0018 (PD-062): the *Needs attention* row is a Problems row (0018 O-4).*
  *Amended by 0022 (PD-069): AC-006 — the detail shows each Problem's sentence; the reason is its tooltip (0022 §4.5).*
- **AC-007** If a spec carries format notes and no Problem, then its card, attention row and the header shall show nothing for them, and its detail shall show the T-07 toggle collapsed (`aria-expanded="false"`); when the developer activates it by pointer, or by Enter or Space after reaching it with Tab, the system shall show each note's reason and set `aria-expanded="true"`.
  *Amended by 0018 (PD-062): attention row and header → the Problems heading and rows (0018 AC-007).*
- **AC-008** While at least one Problem exists, the Mission Control header shall show T-01 with n = the Problems on specs plus those at project level; when the developer activates it, the system shall send one navigation request for the Spec Board with the named set T-03 holding exactly those specs' stems. While none exists, the header shall show no problem element.
  *Amended by 0018 (PD-062): 0018 §5.*
- **AC-009** The board banner shall list project-level Problems under T-06 and project-level format notes behind a collapsed T-07 toggle, and shall not render while neither exists.
- **AC-010** The model shall fail R-6 exactly when the entry carries a Problem.
  > **Given** a `backlog/` Draft spec whose `AC-001` is defined twice and whose linked plan is `Not started` **Then** it is Ready with two format notes.
- **AC-011** No text the Studio writes itself on cards, list rows, Mission Control, the board banner and the detail — anything not quoted from the project's files — shall contain a rule ID (`S-…`, `R-1`…`R-7`, `NS-…`), "persisted", "Model updated", "first observed" or "not checked"; each rule ID shown before shall be in the tooltip of the element that showed it (T-08, T-10, T-12).
  *Amended by 0020 (PD-058): AC-011 "list rows" — void for the list; the tree shows T-09 in the tooltip and no rule ID in label or description (0020 §4.2).*
- **AC-012** Wherever a derived state was shown with its rule at `8052f9a` (card, list row, tile, detail), the system shall show T-09's sentence.
  *Amended by 0018 (PD-062): card and tile: the card shows no derived sentence (0018 B-5); the tile is gone; the column tooltip carries it (0018 B-6).*
  *Amended by 0019 (PD-058): AC-012 detail part — in the detail T-09's sentence is in the state chip's tooltip and in visually hidden text, not visible text (0019 AC-009; audit 03 §5.2, as 0018 B-6).*
  *Amended by 0020 (PD-058): AC-012 "list row" — void for the list; the tree shows T-09 in the tooltip and no rule ID in label or description (0020 §4.2).*
- **AC-013** The detail shall show no line of T-13; the model shall keep R-7 and the compile-verdict fact (0003 AC-005, AC-018 unchanged).
- **AC-014** While a spec is Backlog, its card shall show §6.3's first applying need and its detail every applying need in order, each as text with no icon and the T-12 tooltip; if none applies, then neither shall show a need line; no element shall show a readiness checklist or a failure icon for a readiness check.
  > **Given** `fs170-brownfield-mixed` **Then** the card of 0003 reads `needs a plan`.
- **AC-015** The detail shall show each status history entry as §6.4 defines it under T-15, with the tooltip of §6.4, and Mission Control shall show its header time as T-02, activity times as T-17 and T-16 for a spec no longer in the project.
  > **Given** a local clock at 2026-11-17 22:00 and a *first observed* entry for Review at 21:56 the same day **Then** the line reads `Today 21:56 — first seen as Review`.
  *Amended by 0018 (PD-062): header time → the project name's tooltip (0018 AC-025).*
- **AC-016** When a criterion or requirement starts with its ID inside emphasis that also encloses the title (`**AC-001 — Title**`, `__AC-001 — Title__`, `***AC-001 — Title***`), the detail shall show the ID once, the title with that emphasis, and no `*` or `_` left from it; `**AC-001** — text` shall render as today.
  > **Given** `fs170-brownfield-mixed` 0003 **Then** AC-001 shows "Events reach the broker without an intermediate table" in bold, then "When an order event occurs…", and no `**`.
  *Amended by 0019 (PD-058): AC-016 is void in the detail with the full text: criteria show as plain short titles, no `*` or `_` left (0019 AC-013).*
- **AC-017** Every Copy of a next step, the drop result's included, shall use the primary button colours (`--vscode-button-background`, `--vscode-button-foreground`), and the drop result's Dismiss `--vscode-button-secondaryBackground` and `--vscode-button-secondaryForeground`; a stylesheet guard decides it.
  *Amended by 0017 (PD-060/PD-061): "the drop result's" is void (PD-060).*
  *Amended by 0022 (PD-069): AC-017 — the primary colours belong to the Copies of 0022 §4.4 (1) to (3); the others follow 0022 AC-010 and AC-012.*
- **AC-018** When the developer activates Copy and the clipboard write succeeds, the button shall read `Copied`, carry `Copied to the clipboard.` as tooltip, and the live region shall announce that sentence; if it fails, then they shall read `Could not copy` and `Could not copy to the clipboard.`; 2 s after the last activation the button shall read `Copy` again with its earlier tooltip.
  *Amended by 0021 (PD-069): AC-018 — "shall read `Copy` again": it shall read `Copy prompt` again (0021 AC-008).*
  *Amended by 0022 (PD-069): AC-018 — on a list Copy the icon turns to a check and the tooltip carries the sentence; the label `Copied` belongs to a Copy with a label (0022 AC-012).*
- **AC-019** While Copy feedback shows, no element of the panel outside the activated button and the hidden live region shall be added, removed or change text or class; the stylesheet shall give the Copy button a `min-width` of at least `14ch` (the length of `Could not copy`) and no error colour to the success state.
  *Amended by 0022 (PD-069): AC-019 — the `14ch` box holds for a Copy with a label; an icon Copy keeps a fixed box of at least 24 × 24 px (0022 AC-012).*
- **AC-020** While S2 holds, the Activity Bar view and the panel shall show T-20 after "No FeatherSpec project found in this workspace." and before "Set up FeatherSpec"; the manifest's `viewsWelcome` contents shall equal the shared text.
- **AC-021** Every New text of §7 shall come from a text module and be asserted literally by a test; a search of `src/shared` and `src/webview` without test files shall find none of `Priority: not available`, `verdict: not available`, `Inter-spec dependencies`, `Derived: `, `Model updated`, `Project diagnostics`, `project-level diagnostic` and `See its diagnostics`, with a negative control (the model's reasons in `src/core` stay, AC-013).
- **AC-022** NS-1 shall show T-18; every other next-step line and text of 0015 §6.1 shall stay unchanged.
  *Amended by 0017 (PD-060/PD-061): except NS-6 (0017 §6.2).*
- **AC-023** Every test at the plan's Baseline commit that decides a criterion of 0001–0007, 0013, 0014 or 0015 shall exist at the head and pass, unless §5 changes that criterion; a script compares the test titles of both commits and the plan lists every missing or renamed title with the §5 row or head title that replaces it; `npm run test:unit` and `npm test` shall pass on Windows and in CI.
  *Amended by 0017 (PD-060/PD-061): also except the tests 0017 AC-024 lists against a criterion that 0017 §5 voids.*
  *Amended by 0018 (PD-062): the test audit also excepts the tests 0018 AC-030 lists against a criterion 0018 §5 voids.*
  *Amended by 0019 (PD-058): AC-023 — also excepts the tests 0019 AC-023 lists against a criterion 0019 §5 voids or replaces.*
  *Amended by 0020 (PD-058): AC-023 — also except the tests 0020 AC-021 lists against a criterion 0020 §5 voids.*
  *Amended by 0021 (PD-069): AC-023 (test audit) — also except the tests 0021 AC-020 lists against a statement 0021 §5 replaces.*
  *Amended by 0022 (PD-069): AC-023 — also excepts the tests 0022 AC-017 lists against a statement 0022 §5 changes.*
  *Amended by 0023 (PD-069): AC-023 (test audit) — also except the tests 0023 AC-016 lists against a statement 0023 §4 changes.*
  *Amended by 0024 (PD-068): AC-023 (test audit) — also except the tests 0024 AC-014 lists against a statement 0024 §5 replaces.*
- **AC-024** The specs of §5 shall carry their amendment notes and the PD register one new entry superseding §5's PD rows, with no note in an older entry; the README shall say once that FeatherSpec has no priority, persisted compile verdict or dependency field, so the Studio shows none; CHANGELOG and `docs/release-checklist.md` shall name the changes and AC-025.
- **AC-025** *(manual, Gregor or delegate)* Preview harness screenshots in Dark, Light and High Contrast: primary Copy, its label change without shift, the need line, the T-07 toggle, the problem badge and the S2 sentence in view and panel; Gregor's Hands-On on `tip-splitter` shows no problem marker without a real problem.

## 10. Technical notes for developers or AI agents

- As-is (8052f9a): kinds in `src/core/specs/diagnostics.ts`, emitted by `parseSpec.ts`,
  `parsePlan.ts`, `planSteps.ts`, `leadingIds.ts` (ID twice, kind `duplicate`), `readProject.ts`,
  `returnNote.ts`, `version.ts`, `files.ts`; contradictions in `lifecycle/entryContext.ts`, whose
  `buildContexts` gives an entry its plans' and notes' diagnostics (0010: 28 from its archive).
- Kinds span tiers (`duplicate`, `unknown-content`): the tier is set per finding in core, never in
  the webview. `readiness.ts` `hasProblem` counts every `duplicate` on the spec, ID twice included.
- Consumers: `attention.ts` (contradiction, unreadable spec), `specFigures.projectHeader`
  (`diagnosticStems` = any diagnostic), `cards.ts` (count, `buildBanner`), `core/board/detail.ts`.
- `successor.ts` and `detail.ts` `headerLines` read `unsupportedHeaderLines` (the successor shows
  twice today); `readProject.ts` reports an orphan plan and its Spec link apart; `ui/RuleText.tsx` renders every rule ID;
  `idText.withoutLeadingId` drops the opening `**` and leaves the closer (R-13); `NextStep.tsx`
  Copy has class `open-file` (secondary); `.detail-status` is `--vscode-errorForeground` on success
  too; S2 is `panelStateLines` and `S2_WELCOME` (`manifest.test.ts` compares `viewsWelcome`).
- Measured by a throwaway script (`readProject` + `deriveLifecycle`, Node spec source, repo esbuild)
  on `git archive 8052f9a .specs`; re-run by `/sdd-clarify` 2026-11-17 with the same result. The
  AC-004 fixture is that copy, untrimmed (1.2 MB, 35 files; each feeds a count or a link check), not
  in `.vscode-test.mjs`. The abandoned-spec case was simulated: `orphan` plus `dangling-link` on the
  plan. 0002 AC-018 and PD-047 budgets stay.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | *(proxy)* Beyond PD-059's lists: an unknown status value and an orphan return note are Problems (added to guideline 3's four kinds, named); an archived orphan plan and the version note are project-level format notes; the plan of an abandoned spec is compatibility | Status values are declared vocabulary and drive the state; return notes are deleted once integrated; `/sdd-lifecycle` deletes an abandoned spec, never a `done/` one, and `AGENTS.md` never a plan | §6.1 rows move; AC-001 |
| A-002 | *(proxy)* A sibling plan's dangling `**Spec:**` link is a Problem like the `**Plan:**` link while a spec has its stem | FeatherSpec writes and retargets both | one row of §6.1 |
| A-003 | `Added`, `Deletes`, `Open evidence`, `Evidence` are format notes, though audit K-F calls the first three compatibility | Checked 2026-11-17: none occurs in FeatherSpec 1.10.0's `AGENTS.md` or `.claude/`; this repo's sessions wrote them; PD-059 names unknown sections and fields format notes | 28 notes become unreported |
| A-004 | R-6 by tier: a spec whose only issue is an ID defined twice can be Ready | PD-019 defines duplicates as stem or number; PD-059 makes an ID twice a format note | AC-010 |
| A-005 | *(proxy)* §7's texts, the 2 s label change, rule IDs in tooltips satisfy PD-004 | Audit 04 text table, K-G, K-I; guidelines 6 and 8 | texts and AC-011–AC-019 change |
| A-006 | *(proxy)* T-15 keeps Gregor's binding scope statement (0003 §6.5) in shorter words | It still says the history holds only what Studio saw while running | T-15 |
| A-007 | *(proxy)* Project-level format notes sit in the board banner: deviation from guideline 3 "detail only", named | They belong to no spec, so no detail can hold them | AC-009 |

## 12. Open points

- OP-001 Gregor confirms A-001, A-002, A-005…A-007 (non-blocking); the plan records them as one PD entry.
- OP-002 AC-025 waits for Gregor's Hands-On on `tip-splitter`.
- OP-003 `/sdd-clarify` 2026-11-17: 29 findings, 28 resolved in one pass at Gregor's standing request, 0 parked, none asked, 1 with 0017 handed to the orchestrator (drop result); the list is kept by the orchestrator (`0016-findings.md`). Readings made; say so if one is wrong: (a) an abandoned spec's plan is compatibility (§6.1); (b) T-01 counts Problems like T-05; (c) a `**Successor:**` line is read in every spec; (d) `plan has no status` also covers an empty Status line; (e) the Copy's accessible name follows its label; (f) PD entries are superseded, not annotated; (g) AC-021 searches `src/shared` and `src/webview`; (h) AC-023 compares with the plan's Baseline.

## 13. Definition of Ready / Done · next steps

Ready: tiers measured, texts literal, amendments listed; proxies non-blocking. Done: AC-001…AC-024
green with evidence, AC-025 recorded, §5 applied, nothing out of scope added, `/sdd-compile` READY.
Next: `/sdd-plan` right before implementation, against the code as it is then.
