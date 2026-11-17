# Runtime Persistence & Event Model

**Status:** Implemented
**Plan:** [0004-runtime-persistence-event-model.2026-11-17.plan.md](../plan-archive/0004-runtime-persistence-event-model.2026-11-17.plan.md)

Handoff reference: FS-004 ([po-handoff.md](../../docs/product/po-handoff.md) §7, §8.5, §10 FS-004, §13).
Depends on: 0001 only (project root as store key, PD-025, PD-026). Consumers: 0003 (spec status
history), 0006, 0007, 0012 (read), 0009/0010 (credential values for masking), 0011 (writes runs).
Storage technology: [ADR-002](../../docs/decisions/ADR-002-runtime-storage.md) (Proposed, adopted by
PD-003). Where the PD register and ADR-002 disagree, the PD register wins.

## 1. Summary

Studio keeps its own local record of agent runs, their events and the spec status history — data
that is not spec content and must never land in the FeatherSpec files. The record belongs to one
project root, survives a VS Code restart, never claims a run is still running when it cannot be,
stores no secrets it can recognise, and can never damage spec source files, even when saving fails.

## 2. Goal and problem

Agent sessions and runtime information are not part of any spec, yet the developer needs them after
a restart: which runs happened, for which spec, how they ended, and what the agent did. Without a
separate local persistence this is lost on every reload, and a run interrupted by a restart would
either vanish or be shown with a false status (handoff P8 *Honest Status*).

Success: after a restart the developer sees every run that retention has not removed, each with an
honest status (a run that was open is `Interrupted`), and the stored data contains no credentials
that masking can recognise (PD-029).

## 3. Users and roles

- **Developer** (only role): the person using Studio in VS Code. Reads the run history; clears it
  on demand.
- No permissions model — the data is local to the developer's machine and VS Code profile.
- People who build Studio are called **contributors** in this spec.

## 4. Scope

### In scope

- A storage port for runtime data in the application core, with an in-memory adapter and one
  persistent adapter.
- Storing runs with a unique ID, provider, spec reference, timestamps, status and status history.
- Storing a run's events in order, retrievable in pages; a per-run size cap (PD-027).
- Storing and returning the spec status history entries of 0003, keyed by stem (PD-023).
- One store per project root (PD-026) and one writing window per store (PD-030).
- Restoring the stored state on activation; every run left in an open state becomes `Interrupted`
  (PD-024).
- Masking secrets before anything is stored, and the pattern list
  `docs/security/secret-patterns.md` (PD-029).
- Behaviour on save failure, on unreadable stored data (PD-028) and on data from a newer version.
- Retention per PD-027: age cap applied on activation, command "FeatherSpec Studio: Clear Run
  History" with its confirmation.
- The notices to the developer named in §12, and the store state reported to consumers (BR-009).
- A description of data access and error handling for contributors and users (FR-010).

### Out of scope

- Cloud synchronisation and team-wide history — because handoff §8.5 / FS-004 exclude it from the MVP.
- Choosing the storage technology — because ADR-002 decides it; the criteria here hold for any adapter.
- Carrying history over when a folder is moved, renamed or cloned — because the store is keyed by the project's root-folder URI (PD-026).
- Resuming or recovering runs — because that is a later, explicit user action owned by 0011 (PD-024); this spec only stores and classifies.
- Defining the event type taxonomy and the allowed status transitions — because 0009 and 0011 own them (PD-025); this spec stores the envelope and the status it is given.
- Storing raw provider data (a provider's own event or message objects before normalisation) — because PD-029 excludes it from the MVP; handoff §7 allows it later, apart from normalised events.
- Rendering runs, events and the spec status history (lists, cards, timelines) — because 0006, 0007 and 0012 render them; this spec supplies the data. Its own UI is the Clear command and the notices of §12.
- Storing provider credentials — because they belong in VS Code secret storage, owned by 0009/0010.
- Reading `.env` files to find secrets — because PD-029 rules it out.
- Persisting `/sdd-compile` verdicts — because FeatherSpec does not persist them and 0003 reports the verdict as *not available* (0003 §6.6).
- The remembered active project — because 0001 keeps it in VS Code workspace state (0001 §15, ADR-002), not in this store.
- Any write to `.specs/`, `.memory-bank/`, `AGENTS.md` or other workspace files — because PD-013 keeps Studio read-only there and PD-003 keeps runtime data outside the repository.

## 5. Functional flow

1. Studio activates for a project (0001 reports its root-folder URI) and tries to take the store's
   write lock. With the lock this window is the **writer**; without it the window is a **reader**.
2. Writer only: every stored run in an open state becomes `Interrupted`, then the age cap is applied.
3. A run is created (by 0011): the store keeps it with a fresh ID and status `Starting`.
4. While the run lives, each status change and each event is masked and appended.
5. The run reaches an end state: end time and, where supplied, result or error are stored.
6. Consumers (board, detail view, agent center, lifecycle model) read runs, pages of events and
   spec status history entries from the port — in a writer and in a reader window alike.
7. VS Code closes (cleanly or not); the next activation starts at step 1.

## 6. Business rules

Terms used below:

- **Project root** — the active project's root-folder URI as 0001 reports it (PD-026; comparison
  rules: 0001 BR-05).
- **Activation** — Studio's start for a project in one window: VS Code start, window reload,
  extension update or a restart of the extension host.
- **Run history** — the stored runs of one project with their events. **Status history** — the
  status entries of one run. **Spec status history** — the entries 0003 stores (BR-010).
- **Duplicate** — an event whose provider event identity equals one already accepted for the same
  run. An event without an identity is never a duplicate.
- **Late event** — an event that arrives after its run reached an end state.
- **Secret** — a credential value supplied through the credential port, or text matching a pattern
  in `docs/security/secret-patterns.md` (PD-029).

Rules:

- **BR-001** Run statuses are a closed list owned by this spec (PD-025, handoff FR-011.2):
  `Starting`, `Running`, `WaitingForApproval`, `WaitingForInput` (open states) and `Completed`,
  `Failed`, `Cancelled`, `Interrupted` (end states). The store appends any status of the list it
  is given and refuses any other; which transition is allowed is 0011's rule.
- **BR-002** Run IDs are never reused — not after clearing the history, not across projects.
- **BR-003** Runtime data are keyed by the project root; one store per project root (PD-026). A
  moved, renamed or cloned folder starts with an empty history. A different project placed at the
  same path inherits the old history — an accepted, documented limitation.
- **BR-004** When a window becomes the writer, every stored run in an open state becomes
  `Interrupted` with the cause "extension host restarted", whatever its provider can do. There is
  no "recovery pending" state (PD-024).
- **BR-005** Secrets are masked before storing. Masking is best effort and documented as such: a
  secret split across two events, or one no pattern describes, is not recognised (PD-029).
- **BR-006** If saving fails during a run, the agent keeps working; the run is flagged
  "history incomplete" and the developer is warned once per run (Gregor, interview 2026-11-16).
  The flag means: at least one status change or event of this run was not stored.
- **BR-007** Unreadable stored data (PD-028): the granularity is the run. An incomplete record
  (it can only come from a process killed mid-write) is skipped on read wherever it stands in the
  file and reported once; every append starts on a fresh line, so records written after it stay
  readable. Any other unreadable part makes that one run "history unreadable"; other runs are
  unaffected. Existing bytes of a run's stored data are never changed: the data is only ever
  appended to or removed as a whole — never rewritten, never deleted silently. Writes to a run
  marked "history unreadable", and to data of a newer format version, are refused with the reason.
- **BR-008** Retention (PD-027): runs whose end time is older than the age cap — 90 days by
  default, configurable — are removed on activation; "FeatherSpec Studio: Clear Run History"
  removes all ended runs and all runs reported as "history unreadable" of the active project,
  after a confirmation every time. A run in an open state is never removed by either. Spec status
  history entries follow the same cap and the same command (PD-023, 0003 §6.5).
- **BR-009** One writer per project store, enforced by a lock with a heartbeat (PD-030). A reader
  window reads runtime data, cannot create runs, never changes a run status and says why. A stale
  lock is taken over. The store reports its state to consumers: *writable*, *read-only* or
  *unavailable*, each with its reason.
- **BR-010** Spec status history (PD-023, 0003 §6.5): the store appends and returns 0003's entries
  keyed by spec stem and does not interpret them. They contain no secrets and are not masked.
- **BR-011** The end time of a run is the timestamp of the status entry that put it into an end
  state. For `Interrupted` that is the moment of classification, not the unknown moment the run
  actually stopped.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-004.1) | Storage port for runtime data in the core, adapters outside it | AC-001 |
| FR-002 (FR-004.2) | Store runs with unique IDs and their attributes | AC-002, AC-003, AC-004 |
| FR-003 (FR-004.3) | Store events in order; paged retrieval; a duplicate (by provider event identity) once; size cap | AC-005, AC-006, AC-007, AC-027, AC-028, AC-029 |
| FR-004 (FR-004.4) | Key runtime data by project root | AC-008, AC-009 |
| FR-005 (FR-004.5) | Restore the stored state after restart | AC-010 |
| FR-006 (FR-004.6) | Classify runs left open as `Interrupted` | AC-011 |
| FR-007 (FR-004.7) | No recognisable credentials or secrets in stored data | AC-013 |
| FR-008 | Fault behaviour: save failure, unreadable data, newer version, no workspace damage | AC-014, AC-015, AC-016, AC-017, AC-021, AC-022 |
| FR-009 | Retention and clearing per PD-027 | AC-018, AC-019 |
| FR-010 (FR-004.8) | Document data access and error handling | AC-020 |
| FR-011 | One writer per project store; store state for consumers (PD-030) | AC-023, AC-024, AC-025 |
| FR-012 | Store and return the spec status history of 0003 (PD-023) | AC-026, AC-018, AC-019 |
| FR-013 | Tell consumers when the runs of this window's store change (for 0007; Gregor, 2026-11-16) | AC-030 |

## 8. Data requirements

**Run** — run ID · provider ID · model (if the provider delivers it; otherwise returned as "not
available") · spec reference (spec stem `NNNN-slug` and project-relative path, both as at creation;
PD-018) · provider session reference (opaque identifier, stored when the caller supplies it) ·
status history (status, timestamp, cause where supplied) · current status (the newest entry) ·
created (the `Starting` entry), started (the first `Running` entry) and end time (BR-011) · error
class (open string, defined by 0011) and message · result · "history incomplete" flag.

**Event envelope** (PD-025) — run ID · sequence number (per run, starting at 1, ascending, assigned
by the store on receipt; numbers are not reused, gaps may occur) · occurred-at (if the provider
delivers it) · received-at · `type` (open, non-empty string; 0009 defines the taxonomy) · masked
payload · provider event identity (if delivered). The store itself writes one event type:
`truncated` (AC-027).

**Spec status history entry** — as 0003 §6.5 defines it; the store adds nothing but the key (stem).

**Reported, not stored** — "history unreadable" per run (BR-007) and the store state (BR-009).

The spec reference is kept as recorded at creation; a later rename, move or deletion of the spec
file does not rewrite it (the PD-011 diagnostic belongs to 0002/0011).

## 9. Security, permissions and privacy

- Masking applies before data reaches a storage adapter, to every text the store keeps for a run or
  an event: event payload, status cause, error message, result. It replaces (a) the values of
  credentials Studio holds, supplied by the provider adapters through a credential port, and
  (b) matches of the patterns in `docs/security/secret-patterns.md` — provider tokens, bearer
  tokens, private-key blocks (PD-029).
- Studio does not read `.env` files. Masking is best effort (BR-005); the documentation says so.
- Nothing is sent anywhere; no telemetry (handoff §13 Privacy).
- Runtime data lives outside every workspace folder (PD-003), so it cannot be committed by accident.

## 10. Non-functional requirements

- Appending an event does not make the caller wait for the storage medium (handoff §13
  Performance, ADR-002 rule 1) — AC-029.
- Consumers never need the whole event history in memory: retrieval is paged (AC-006; the maximum
  page size is OP-010).

## 11. Error cases and edge cases

- Disk full or write error mid-run → BR-006 (AC-014).
- VS Code killed during a run → `Interrupted` on the next writer activation (AC-011); a
  half-written record is skipped, also after later appends (AC-021).
- One run's stored data unreadable → that run only (AC-015). Run list unreadable → rebuilt (AC-022).
- Store location not reachable → store state *unavailable* with the reason (AC-025).
- Stored data written by a newer Studio version → left unmodified (AC-017; the rest is OP-005).
- Duplicate provider events → stored once (AC-007). Late events → stored, in receipt order (AC-028).
- Event or status change for a run the store does not hold (unknown, or removed) → refused (AC-028).
- Status not in the closed list → refused (AC-004).
- Spec file renamed, moved or deleted after the run → reference kept as recorded (AC-010).
- Same project open in two windows → one writer, the other reads (AC-023, AC-024).
- A different project at the same path → inherits the history (BR-003; documented, AC-020).
- A run that removal cannot delete (age cap or Clear) → it stays, the other runs are removed; the
  age cap tries again at the next activation, Clear says how many stayed (AC-019).
- A run produces events without end → size cap and `truncated` marker (AC-027).
- A run cannot be stored when it is created → OP-006.

## 12. Acceptance criteria

"The system" is FeatherSpec Studio. This spec owns the store behind the port, the Clear command and
the notices named here. A **notice** is a message Studio shows to the developer; its wording is
English (PD-016) and is fixed in `/sdd-plan`.

- **AC-001** The system shall reach runtime data only through the storage port: every criterion of
  this spec about stored data shall hold, with unchanged core code, for the in-memory adapter and
  for the persistent adapter. The core shall import neither `vscode` nor a module that reads or
  writes files or databases (Node's `fs`, `fs/promises`, `sqlite`; a storage dependency added
  later joins this list in the same change) — an import scan decides it.
- **AC-002** When a run is created, the system shall assign it an ID that no other run of any
  project carries, and shall not derive the ID from a counter or from stored data.
  - *Given* two projects, one with a cleared history, *when* 10,000 runs are created across both,
    *then* no two IDs are equal.
- **AC-003** When a run is created, the system shall store its provider ID, spec reference, created
  timestamp and status `Starting`. Where the provider delivers no model, the system shall return
  the run's model as "not available" and shall not fill in a value of its own.
  - *Given* a fake provider without model information, *when* a run for `0007-board` is created,
    *then* the returned run shows provider `fake`, spec `0007-board`, a timestamp, status `Starting`
    and model "not available".
- **AC-004** When a caller reports a status of the closed list (BR-001) for a stored run, the system
  shall append it with its timestamp to the run's status history; for an end state it shall store
  the end time (BR-011) and the result, error class, error message or cause the caller supplies. If
  the status is not in the list, then the system shall refuse it and store nothing. The system shall
  store a provider session reference or model whenever the caller supplies one.
- **AC-005** The system shall assign each accepted event the next sequence number of its run in
  order of receipt, and shall return a run's events in ascending sequence order.
- **AC-006** When a consumer requests a page of a run's events by a first sequence number S and a
  size N (N ≥ 1), the system shall return the stored events with sequence number ≥ S in ascending
  order, at most N of them, and an empty page where there is none.
  - *Given* a run with 10,000 stored events, *when* a page from 9,901 with size 100 is requested,
    *then* exactly events 9,901–10,000 are returned, in order. *When* a page from 10,001 is
    requested, *then* the page is empty.
- **AC-007** If an event arrives whose provider event identity was already accepted for that run,
  then the system shall not store it a second time. The system shall store every event that carries
  no provider event identity.
- **AC-008** When a consumer requests the runs of a project root, the system shall return only runs
  created under that project root, newest created first — the same runs whichever workspace the
  project is opened in — and, where the request names a spec stem, only the runs of that spec.
  - *Given* projects A and B each with one run, *when* A's runs are requested, *then* only A's run
    is returned.
- **AC-009** When a project is opened under a root-folder URI other than the one its runs were
  stored under (folder moved, renamed or cloned), the system shall return no run and no spec status
  history entry for it.
  - *Given* project A with one run, *when* its folder is renamed and opened again, *then* the run
    list is empty.
- **AC-010** When the system activates for a project, it shall return every stored run that AC-018
  has not removed, with its stored status history, timestamps, flags and the spec reference as
  recorded at creation — also when the spec file was renamed, moved or deleted since — and shall
  return each run's events per AC-005. The current status of a run that was open is the one AC-011
  sets.
- **AC-011** When a window becomes the writer of a project store — at activation or by taking over
  a stale lock — the system shall set every stored run that is in an open state to `Interrupted`,
  with the cause "extension host restarted" and the time of this classification, whether or not
  the run's provider declares resume.
- **AC-012** *Withdrawn 2026-11-16 (PD-024: no "recovery pending" state). The ID is not reused.*
- **AC-013** If a text the system is about to store for a run or an event — event payload, status
  cause, error message or result — contains a credential value supplied through the credential
  port or matches a pattern in `docs/security/secret-patterns.md`, then the system shall store a
  placeholder in its place. That file shall list at least one pattern each for provider tokens,
  bearer tokens and private-key blocks, with one sample per pattern that the masking test uses.
  - *Given* a fake event whose text contains a sample token from the pattern list and the fake
    provider's credential, *when* it is stored, *then* neither value occurs in what the port
    returns nor in the bytes the persistent adapter wrote.
- **AC-014** If writing a status change or an event of a stored run fails, then the system shall
  return to the caller without an error that ends the run, keep the record readable through the
  port for the rest of the session (ADR-002 rule 7), set the run's "history incomplete" flag — in
  memory at once, stored with the next write of that run that succeeds — and show one warning per
  run that names the run by spec stem and run ID.
- **AC-015** If the stored data of a run cannot be read, for another reason than AC-021, then the
  system shall report that run as "history unreadable", leave its stored data byte-identical,
  return every other run unchanged, show at activation a notice that names the affected runs, and
  refuse every status change and event for that run with a reason that names the run.
- **AC-016** The system shall never create, change or delete a file or folder inside any workspace
  folder when storing, restoring, clearing or failing. A test with the persistent adapter decides
  it: paths and file contents of the workspace fixture are equal before and after every scenario
  of AC-003…AC-029.
- **AC-017** If stored data carries a format version this Studio version does not know, then the
  system shall leave it byte-identical — the age cap and the Clear command included — refuse every
  write to it with a reason that says the data comes from a newer version, and show a notice that
  says the same.
- **AC-018** When the system activates for a project as the writer, it shall remove every run, with
  its events, whose end time lies further back than the age cap, and every spec status history
  entry observed further back than the age cap. The cap is 90 days; where the developer has set
  another value, the system shall use that. It shall keep all runs in an open state and all runs
  reported as "history unreadable".
- **AC-019** When the developer runs "FeatherSpec Studio: Clear Run History", the system shall ask
  for confirmation every time. On confirmation it shall remove, for the active project, all ended
  runs with their events, all runs reported as "history unreadable" and all spec status history
  entries, keep the runs in an open state, and say how many runs it could not remove where that
  number is not 0. If the developer declines, or there is no active project, then the system shall
  remove nothing and say so.
- **AC-020** The FeatherSpec Studio repository shall contain one document under `docs/` that states:
  which runtime data is stored, where, for how long, how it is cleared and how to delete it by
  hand, how storage errors behave, that masking is best effort (BR-005), and that a different
  project at the same path inherits the history (BR-003). Gregor accepts it before the spec moves
  to done.
- **AC-021** If a record of a run's stored data is incomplete, wherever it stands in the file, then
  the system shall skip that record on read, return the run's other records, report the skip once
  (OP-011), never change an existing byte of the stored data — it only appends, each append
  starting on a fresh line — and list a run that was open as `Interrupted` with its readable events
  after any number of further restarts.
- **AC-022** If the store's list of runs cannot be read while the per-run data can, then the system
  shall rebuild the list from the per-run data and return the same runs as before.
- **AC-023** While a window is a reader of a project store, the system shall answer reads from the
  stored data, refuse every write — run creation, status change, event, spec status history entry,
  the classification of AC-011, the age cap and the Clear command — and state as the reason that
  another window holds the write lock.
- **AC-024** If the write lock of a project store is stale (its heartbeat is older than the
  staleness threshold, OP-012), then the system shall let a reader window take the lock over and
  become the writer.
- **AC-025** The system shall tell consumers, per project and window, whether the store is
  *writable*, *read-only* or *unavailable*, with the reason, and shall tell them when that state
  changes. If the store location cannot be reached, then the state shall be *unavailable*, reads
  shall answer "not available" with the reason instead of an empty history, and the system shall
  show one notice per activation.
- **AC-026** When a caller appends a spec status history entry, the system shall store it under its
  spec stem and return the entries of a stem, or of the whole project, in the order they were
  appended — also after a restart. It shall not change, merge or interpret an entry.
- **AC-027** When the stored events of a run reach the per-run size cap (OP-009), the system shall
  store one event of type `truncated` as the last event of that run, store no later event of it,
  and keep storing its status changes.
- **AC-028** If an event or a status change arrives for a run the store does not hold, then the
  system shall refuse it, name the run ID in the refusal and store nothing. When a late event
  arrives for a stored run, the system shall store it in receipt order and leave the run's status
  unchanged.
- **AC-029** When an event is appended, the system shall return to the caller without waiting for
  the storage medium.
  - *Given* an adapter whose medium write never completes, *when* 100 events are appended, *then*
    all 100 calls return and a read through the port returns the 100 events in order.
- **AC-030** When this window changes the runs of its store — a run is created, a run's status is
  reported, runs are removed by Clear, or the window becomes the writer and loads, classifies and
  prunes the stored runs — the system shall tell the subscribers of the store, after the change can
  be read through the port. It shall not tell them about a change another window made; such a change
  is read at the consumer's next refresh (PD-030; accepted limitation, Gregor, 2026-11-16).
  - *Given* a subscriber and a writable store, *when* a run is created and then its status is
    reported, *then* the subscriber is told twice and a read shows the new run and status each time.

## 13. Technical notes for developers or AI agents

- Greenfield: no source modules yet (`architecture: modules: []`). Target: a `RuntimeStorePort` in
  the application layer with `InMemoryRuntimeStore` and a file adapter per ADR-002 (JSON snapshot
  per run plus append-only JSONL event log). A second, small port supplies credential values for
  masking (PD-029); provider adapters implement it.
- ADR-002 is superseded by the PD register on these points — follow the PDs: rule 2 "no live
  provider session" → PD-024 (every open run, at writer activation); rule 2 "drop a trailing
  partial line" → PD-028 (skip on read, never rewrite); rule 5 retention → PD-027; rule 6 "env
  values" → PD-029; risk 3 → PD-030.
- PD-026 demands one store per project root. ADR-002's layout under the per-workspace `storageUri`
  gives one store per workspace *and* root, so the same project opened in a second workspace would
  not see its history and PD-030's lock would not span both windows. `/sdd-plan` has to choose a
  location that satisfies AC-008 and say what that means for ADR-002.
- Store a format version from the first release so later versions can migrate (ADR-002 rule 4).
- Lock heartbeat interval and staleness threshold are named constants fixed in `/sdd-plan`
  (OP-012); tests use a controllable clock, as do AC-011 and AC-018.
- Run IDs: random UUIDs satisfy AC-002 without a registry.
- Unit-testable in plain Node with the in-memory adapter and a fake provider; the same contract
  suite runs against the file adapter on a temp directory (ADR-002 Consequences). `npm run
  test:unit` does not exist yet — the first plan introduces it (`techContext.md` *Test*).
- AC-001 is an architectural constraint stated as a criterion because an import scan and the
  shared contract suite can decide it (`AGENTS.md` *Core purity*).

## 14. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-005 | Counting events is enough for paging; no paging by bytes | ADR-002 estimates 0.5–2 KB per event (not measured), and the per-run size cap bounds a run (PD-027) | Pages could get large; paging by size needed |
| A-006 | A provider session reference is an identifier, not a credential, so it is stored unmasked | Handoff §7 lists AgentSession as a "provider-specific reference"; credentials live in secret storage (0009/0010) | A provider whose reference works like a bearer token would be stored in clear — that provider must keep it in secret storage instead |
| A-007 | 0001 reports the same root-folder URI for a project in every workspace that contains it | 0001 BR-05 identifies a project by the root-folder URI of its workspace folder (PD-026) | AC-008's "whichever workspace" cannot hold; the key needs its own normalisation |

A-001…A-004 are withdrawn: decided by PD-026, PD-024/PD-025, PD-030 and PD-027 (see OP-014).

## 15. Open points

Resolved:

- OP-001 (2026-11-16): `.env` values — Studio does not read `.env` files; masking by credential
  values and the pattern list (PD-029).
- OP-002 (2026-11-16): PD-012 confirmed by PD-027 — 90 days by default, configurable.
- OP-003 (2026-11-16): ADR-002 exists (Proposed, adopted by PD-003).
- OP-004 (2026-11-16): "Clear Run History" asks for confirmation every time (PD-027).
- OP-014 (2026-11-16): `/sdd-clarify` listed 71 findings, 14 blocking. Gregor decided the blocking
  ones in the PD register and delegated the rest; the walkthrough ran in bulk at his explicit
  request, a one-off exception to the one-finding-per-message rule. Resolved 67 (finding numbers
  in brackets):
  - PD-024: no "recovery pending"; every open run becomes `Interrupted` [3, 15, 16, 33, 34, 52, 53,
    62, 70] → BR-004, AC-011; AC-012 withdrawn.
  - PD-025: dependency on 0001 only; closed status list, open event `type`, transitions with 0011
    [5, 55] → BR-001, AC-004, §8.
  - PD-026: project root as key; same path inherits [11, 31, 32, 56, 61, 71] → BR-003, AC-008,
    AC-009, A-007.
  - PD-027: retention, command name, confirmation, size cap, unreadable data cleared [2, 40, 58,
    59, 64, 66] → BR-008, AC-018, AC-019, AC-027.
  - PD-028: unreadable data by run, incomplete last record, list rebuilt [4, 37, 49] → BR-007,
    AC-015, AC-021, AC-022.
  - PD-029: what is masked, no `.env`, best effort, raw provider data [10, 17, 18, 35, 60, 67] →
    BR-005, §9, AC-013, A-006.
  - PD-030: one writer, reader window, stale lock [9, 63] → BR-009, AC-023, AC-024.
  - PD-023 and 0003 A-009: spec status history and store state [23, part of 57] → BR-010, AC-025,
    AC-026.
  - ADR-002: the ADR exists [1]; newer-version data stays untouched by cap and Clear [8]; records
    stay readable after a failed save [part of 36].
  - Wording and testability, one reading each: UI scope [6]; AC-010 [7]; terms history, timestamps,
    activation, duplicate/late, developer/repository, "the system", "not available" [12, 13, 14,
    19, 21, 22, 24]; paging by sequence number [20, 47]; AC-001 [25, 45]; AC-002 [26]; AC-003/004
    fields and end data [27, 28]; AC-007 [30]; AC-014 [36]; AC-016 [38, 46]; AC-020 [41]; actors
    named in AC-003, AC-005, AC-010, AC-013 [42]; criteria for rules that had none [43] → AC-010,
    AC-023, AC-029; `test:unit` [44]; "UI thread" [48]; events and status changes for unknown or
    ended runs [54]; assumption and scope reasons [65, 68, 69]. BR-006 keeps its interview source;
    it has no PD entry (OP-013).
  - Five readings made while applying the decisions; say so if one is wrong: (a) the
    classification of AC-011 also runs when a window takes over a stale lock, not only at
    activation; (b) "one store per project root" holds across workspaces (AC-008), which rules out
    a store per workspace; (c) the end time of an `Interrupted` run is the time of classification
    (BR-011), so its 90 days start then; (d) the age cap and "Clear Run History" also cover 0003's
    spec status history (PD-023 "pruned, cleared"); (e) after the size cap events are dropped but
    status changes are still stored (AC-027).

Adopted by `/sdd-plan` (2026-11-16), pending Gregor's review of the plan — he confirms or changes
them there; until then OP-005…OP-012 stay listed below:

- OP-015: the plan adopts the recommendation of each of OP-005…OP-012, with these values: page
  size at most 500 events (OP-010); per-run size cap 20,000 events, a named constant to re-measure
  (OP-009); lock heartbeat every 10 s, lock stale after 60 s (OP-012); setting
  `featherspec-studio.runHistory.maxAgeDays`, whole days, minimum 1, default 90, user settings
  only (OP-008). Store location (§13): one directory per project root under the extension's
  `globalStorageUri`, not the per-workspace `storageUri` — the only VS Code storage location that
  all windows and workspaces share, which AC-008 and PD-030 need; ADR-002 gets an amendment.

Open, none blocks planning (clarify finding in brackets; a recommendation each):

- OP-005 [39]: Data from a newer Studio version (AC-017) — is that history displayed, and may runs
  start in that session? Recommendation: not displayed, state *read-only* with the reason "history
  from a newer version" (ADR-002 rule 4), starts refused as for a reader window; the document of
  AC-020 says how to delete the data by hand.
- OP-006 [50, 57]: A run cannot be stored when it is created (store *unavailable*, or the first
  write fails). Recommendation: creation fails with the reason and 0011 does not start the agent —
  a run that leaves no trace is the case §2 calls the problem, and PD-030 already refuses starts
  where the store is not writable. Needs 0011/0008 to agree.
- OP-007 [51]: After a failed save (AC-014) — are the unsaved records written later in the same
  session? A run whose final status was never saved shows `Interrupted` after a restart.
  Recommendation: no later retry of lost records, keep saving new ones, document the limitation.
- OP-008 [2]: Bounds of the configurable age cap. Recommendation: whole days, minimum 1, no "keep
  forever" in the MVP.
- OP-009 [59]: Value of the per-run size cap (AC-027). Recommendation: a named constant, set after
  measuring with the fake provider and the first real provider (ADR-002 *Gaps*).
- OP-010 [29]: Maximum page size and what a larger request gets (AC-006). Recommendation: the page
  is cut to the maximum; the value is a named constant fixed in `/sdd-plan`.
- OP-011 [4]: "Reported once" for an incomplete record (PD-028, AC-021) — once per activation
  or once ever? Recommendation: once per run and activation; nothing has to be stored for it.
- OP-012 [9]: Lock heartbeat interval and staleness threshold (AC-024). Technical; recommendation:
  named constants fixed in `/sdd-plan`.
- OP-013 (cross-spec, main session): ADR-002 still states the superseded rules (§13) and a
  per-workspace layout against PD-026; 0006 BR-05, §8, AC-005 and AC-013 still use "recovery pending
  (0004 BR-004)"; BR-006 (save failure, agent keeps working) has no PD entry.

## 16. Definition of Ready

- [x] ADR-002 written (Proposed; adopted by PD-003).
- [x] Blocking `/sdd-clarify` findings decided (PD-024…PD-030).
- [x] The five readings in OP-014 seen by Gregor (confirmed 2026-11-16).
- [x] OP-005…OP-012: recommendations accepted with the OP-015 values (Gregor, 2026-11-16: page size 500, size cap 20,000, heartbeat 10 s / stale 60 s, `runHistory.maxAgeDays` min 1 default 90, store under `globalStorageUri` keyed by project root).

## 17. Definition of Done

- [ ] AC-001…AC-030 (without the withdrawn AC-012) pass with evidence; tests green
      (`npm run test:unit`, `npm test` before done).
- [ ] No out-of-scope behaviour added; no file written inside a workspace folder (AC-016).
- [ ] `docs/security/secret-patterns.md` and the data-access document present; the latter accepted
      by Gregor (AC-013, AC-020; document accepted by Gregor's proxy, 2026-11-16).
- [ ] Architecture snapshot and Memory Bank updated for the new ports and adapters.

## 18. Recommended next steps

`/sdd-plan` on this spec. The plan starts by settling the store location against PD-026 (§13).

## Plan history

- 2026-11-17 — [0004-runtime-persistence-event-model.2026-11-17.plan.md](../plan-archive/0004-runtime-persistence-event-model.2026-11-17.plan.md) — T-001…T-010 built; second `/sdd-compile` READY (manual items: 1, AC-020); host suite 28 passing at e6f0c85 (Windows 11) and CI green at 9635ba4.
- 2026-11-17 — follow-up (release preparation): the masking samples moved from `src/core/runtime/masking.ts` to `src/core/runtime/testing/secretSamples.ts`, because the sample GitHub token in `dist/extension.js` made `vsce package` refuse the VSIX; test `src/adapters/node/extensionBundle.test.ts` (no sample reaches the bundle). Patterns and AC-013 unchanged.
- 2026-11-17 — follow-up (first unit run on Windows 11, NTFS, Defender): AC-024/AC-030 takeover tests and the 10,000-event AC-006 test failed there. Cause of the takeover failures: the contract tests waited a fixed 40 ms for file work; the lock code was right (heartbeat age = injected clock minus `heartbeatAt` in the file, no mtime). Fixes: the contract suite also runs on a medium 4 ms late per operation (`src/core/runtime/runtimeStore.test.ts`) and `rig.settle()` waits until the rig's medium is idle; events queued behind a write of their run go out in one append (was one open/write/close per event, ~3,200 events/s on Linux, ~4,300 single writes/s on Windows); closing a store waits until every write it started, including follow-on flag writes, is done, then refuses further writes with `STORE_CLOSED_REASON`; the Node medium retries EPERM/EBUSY/EACCES (≈0.5 s bound) also for exclusive create, read and append (Windows: replace onto an open file fails EPERM; a delete can stay pending). Tests: `contractEvents.ts` (one write while in flight), `contractWriter.ts` (closing), `src/adapters/node/fileRuntimeMedium.test.ts` (Windows file semantics). Behaviour of the ACs unchanged.
