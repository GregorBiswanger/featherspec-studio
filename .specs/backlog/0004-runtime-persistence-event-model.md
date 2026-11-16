# Runtime Persistence & Event Model

**Status:** Draft
**Plan:** _none yet_

Handoff reference: FS-004 ([po-handoff.md](../../docs/product/po-handoff.md) §7, §8.5, §10 FS-004, §13).
Depends on: 0001 (project recognition), 0002 (spec references), 0011 (run states), 0009 (normalised
event types, provider capabilities). Storage technology: ADR-002 (SPIKE-004, not yet written).

## 1. Summary

Studio keeps its own local record of agent runs and their events — data that is not spec content
and must never land in the FeatherSpec files. The record is tied to the project folder, survives a
VS Code restart, never claims a run is still running when it cannot be, stores no secrets, and can
never damage spec source files, even when saving fails.

## 2. Goal and problem

Agent sessions and runtime information are not part of any spec, yet the developer needs them after
a restart: which runs happened, for which spec, how they ended, and what the agent did. Without a
separate local persistence this is lost on every reload, and a run interrupted by a restart would
either vanish or be shown with a false status (handoff P8 *Honest Status*).

Success: after a restart the developer sees the same run history as before, every run carries an
honest status, and the stored data contains no credentials.

## 3. Users and roles

- **Developer** (only role): works in one project folder; reads run history; clears it on demand.
- No permissions model — the data is local to the developer's machine and VS Code profile.

## 4. Scope

### In scope

- A storage port for runtime data (runs, events) in the application core, with one adapter.
- Storing runs with a unique ID, provider, spec reference, timestamps, status and status history.
- Storing a run's events in order, retrievable in pages.
- Binding all runtime data to the project folder's location.
- Restoring the last known state on activation, with honest classification of runs that were not
  finished.
- Masking secrets before anything is persisted.
- Behaviour on save failure during a run and on unreadable stored data.
- Retention per PD-012: 90-day age cap applied on activation, command "Clear run history".
- A short data-access and error-handling description for developers (FR-004.8).

### Out of scope

- Cloud synchronisation and team-wide history — because handoff §8.5 / FS-004 exclude it from the MVP.
- Choosing the storage technology — because ADR-002 (SPIKE-004) decides it; this spec stays technology-neutral.
- Carrying history over when a folder is moved, renamed or cloned — because history belongs to the folder location (Gregor, interview Q1).
- Resuming or recovering sessions — because the recovery attempt belongs to 0011; this spec only stores and classifies.
- Defining the event type taxonomy — because 0009 normalises provider events; this spec stores what it receives.
- Storing raw provider data — not in the MVP (Gregor, interview Q4); handoff §7 allows it later, separated from normalised events.
- Showing runs and events in the UI — because 0006, 0007 and 0012 render them; this spec supplies the data.
- Storing provider credentials — because they belong in VS Code secret storage, owned by 0009/0010.
- Persisting `/sdd-compile` verdicts (discovery finding 9) — needs a decision first, in 0003.
- Any write to `.specs/`, `.memory-bank/`, `AGENTS.md` or other workspace files — because PD-013 keeps Studio read-only there and PD-003 keeps runtime data outside the repository.

## 5. Functional flow

1. A run is created (by 0011): Studio stores it with a fresh ID and status `Starting`.
2. While the run lives, each status change and each normalised event is masked and appended.
3. The run ends (`Completed`, `Failed`, `Cancelled`): end time, result or error are stored.
4. VS Code closes (cleanly or not).
5. On the next activation in the same folder: the age cap is applied, the history is loaded, and
   every run that was not in an end state is classified (§6 BR-004).
6. Consumers (board, detail view, agent center) read runs and pages of events from the port.

## 6. Business rules

- **BR-001** Run statuses are exactly those of 0011: `Starting`, `Running`, `WaitingForApproval`,
  `WaitingForInput` (open states) and `Completed`, `Failed`, `Cancelled`, `Interrupted` (end states).
- **BR-002** Run IDs are never reused — not after clearing the history, not across folders.
- **BR-003** History belongs to the project folder's location. A moved, renamed or cloned folder
  starts with an empty history; each folder sees only its own runs.
- **BR-004** On restore, a run in an open state becomes `Interrupted` unless its provider declares
  session resume (PD-007). A run whose provider declares resume keeps its last known status, marked
  as "recovery pending", until 0011 confirms or rejects recovery — it is never shown as `Running`
  on the strength of stored data alone.
- **BR-005** Secrets are masked before persisting; raw provider data is not persisted (MVP).
- **BR-006** If saving fails during a run, the agent keeps working; the run is flagged
  "history incomplete" and the developer is warned (Gregor, Q2).
- **BR-007** If stored data cannot be read at activation, Studio starts with an empty history,
  tells the developer, and keeps the unreadable data aside — never deleting it silently (Gregor, Q3).
- **BR-008** Retention (PD-012, proxy): runs whose end is older than 90 days are removed on
  activation; "Clear run history" removes all ended runs of the current folder. A run in an open
  state is never removed by either.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-001 (FR-004.1) | Storage port for runtime data in the core, one adapter outside it | AC-001, AC-016 |
| FR-002 (FR-004.2) | Store runs with unique IDs and their attributes | AC-002, AC-003, AC-004 |
| FR-003 (FR-004.3) | Store events in order; paged retrieval; duplicates once | AC-005, AC-006, AC-007 |
| FR-004 (FR-004.4) | Bind runtime data to the folder location | AC-008, AC-009 |
| FR-005 (FR-004.5) | Restore last known state after restart | AC-010 |
| FR-006 (FR-004.6) | Classify unrecoverable runs as `Interrupted` | AC-011, AC-012 |
| FR-007 (FR-004.7) | No credentials or secrets in stored data | AC-013 |
| FR-008 | Fault behaviour: save failure, unreadable data, no spec damage | AC-014, AC-015, AC-016, AC-017 |
| FR-009 | Retention and clearing per PD-012 | AC-018, AC-019 |
| FR-010 (FR-004.8) | Document data access and error handling | AC-020 |

## 8. Data requirements

**Run** — run ID · provider ID · model (if the provider delivers it, else "not available") · spec
reference (spec stem `NNNN-slug` and workspace-relative path at start time) · provider session
reference (opaque, provider-specific) · created/started/ended timestamps · current status · status
history (status + timestamp) · error classification and message (classes defined by 0011) · result
or completion event · "history incomplete" flag · "recovery pending" marker.

**Event** — run ID · sequence number (per run, assigned on receipt) · occurred-at (if the provider
delivers it) · received-at · normalised type (from 0009) · masked payload · provider event identity
(if delivered, for duplicate detection).

The spec reference is kept as recorded at start; a later rename of the spec file does not rewrite
it (PD-011 diagnostic belongs to 0002/0011).

## 9. Security, permissions and privacy

- Masking applies before data reaches the storage adapter: credentials known to Studio, a
  documented list of token patterns, and `.env` values (how they are recognised: Open point OP-001).
- Nothing is sent anywhere; no telemetry (handoff §13 Privacy).
- Runtime data lives outside the workspace folder (PD-003), so it cannot be committed by accident.

## 10. Non-functional requirements

- Event appends do not block the extension host's UI thread (handoff §13 Performance) — checked by
  design review in `/sdd-plan`, not by a criterion.
- Consumers never need the whole event history in memory: retrieval is paged (AC-006).

## 11. Error cases and edge cases

- Disk full or write error mid-run → BR-006 (AC-014).
- Damaged stored data at activation → BR-007 (AC-015).
- Stored data written by a newer Studio version (unknown format version) → left unmodified (AC-017).
- VS Code killed during a run → BR-004 on next activation (AC-011).
- Duplicate or late provider events → stored once, in receipt order (AC-007).
- Spec file renamed or deleted after the run → reference kept as recorded (§8).
- Same folder open in two VS Code windows → see A-003.

## 12. Acceptance criteria

- **AC-001** The system shall reach runtime data only through a storage port defined in the core;
  the core shall contain no import of `vscode` or a storage library.
- **AC-002** When a run is created, the system shall assign it an ID that differs from every run ID
  stored before in any folder, including runs removed by clearing.
- **AC-003** When a run is created, the system shall store its provider ID, spec reference, created
  timestamp and status `Starting`; a model the provider does not deliver shall be stored as
  "not available", never estimated.
  - *Given* a fake provider without model information, *when* a run for `0007-board` is created,
    *then* the stored run shows provider `fake`, spec `0007-board`, a timestamp, status `Starting`
    and model "not available".
- **AC-004** When a run changes status, the system shall append the new status with its timestamp to
  the run's status history and store end time and result or error for an end state.
- **AC-005** The system shall return a run's events in ascending sequence order, where the sequence
  is assigned in order of receipt.
- **AC-006** When a consumer requests a page of a run's events by start position and size, the
  system shall return exactly that range in sequence order.
  - *Given* a run with 10,000 stored events, *when* events 9,901–10,000 are requested, *then*
    exactly those 100 events are returned, in order.
- **AC-007** If an event arrives whose provider event identity is already stored for that run, then
  the system shall not store it a second time.
- **AC-008** While a project folder is open, the system shall return only runs created in that
  folder's location.
  - *Given* folders A and B each with one run, *when* A is opened, *then* only A's run is returned.
- **AC-009** When a project folder is opened from a location that has no stored history (moved,
  renamed or cloned), the system shall show an empty history.
- **AC-010** When the extension activates after a restart, the system shall show every stored run
  of the folder with its last stored status, timestamps and spec reference, and its events shall be
  retrievable per AC-005.
- **AC-011** When the extension activates and a stored run is in an open state, and its provider
  does not declare session resume, the system shall set the run to `Interrupted` and record that
  transition in its status history.
- **AC-012** While a restored run is "recovery pending", the system shall not report it as
  `Running` until 0011 confirms the recovery.
- **AC-013** If an event, status message or error contains a credential known to Studio or a value
  matching the documented secret patterns, then the system shall persist a masked placeholder
  instead, and no raw provider data shall be persisted.
  - *Given* a fake event whose text contains a test token from the pattern list and the fake
    provider's credential, *when* it is stored and the storage is read back byte-wise, *then*
    neither value occurs.
- **AC-014** If saving fails while a run is in an open state, then the system shall keep the run
  going, set its "history incomplete" flag, and show the developer a warning that names the run.
- **AC-015** If stored data cannot be read at activation, then the system shall start with an empty
  history, show a notice that says so and where the unreadable data was kept, and keep that data
  unchanged.
- **AC-016** The system shall never create, change or delete a file inside the workspace folder
  when storing, restoring, clearing or failing — checked by a test that compares the workspace
  fixture's files before and after every scenario of AC-003…AC-019.
- **AC-017** If stored data carries a format version this Studio version does not know, then the
  system shall leave it unmodified and show a notice; it shall not overwrite it.
- **AC-018** When the extension activates, the system shall remove runs (with their events) whose
  end time is more than 90 days in the past, and keep all runs in an open state.
- **AC-019** When the developer runs "Clear run history" and confirms, the system shall remove all
  ended runs of the current folder with their events and keep runs in an open state.
- **AC-020** The repository shall contain a description of what runtime data is stored, where,
  for how long, how it is cleared and how storage errors behave — Gregor checks it before done.

## 13. Technical notes for developers or AI agents

- Greenfield: no source modules yet (`architecture: modules: []`). Target: a `RunStore`-style port in
  the application layer, adapter per ADR-002 (candidates: workspace storage, global storage, a
  local database — handoff §8.5). The plan cannot start before ADR-002 exists.
- "Folder location" maps naturally onto VS Code's per-workspace storage location; if ADR-002 picks a
  global store, key by the folder's normalised URI instead (assumption A-001).
- Store a format version from the first release so later versions can migrate (SPIKE-004).
- Saving must not block: appends should be queued; failure handling per AC-014.
- Unit-testable in plain Node with an in-memory adapter and a fake provider (techContext *Test*).
- AC-001 is an architectural constraint stated as a criterion because it is checkable by a test
  scanning imports.

## 14. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | In a multi-root workspace each recognised FeatherSpec project folder has its own history | BR-003 ties history to the folder; 0001 recognises projects per folder | AC-008 needs a workspace-level key instead |
| A-002 | 0009 declares "session resume" as a provider capability Studio can query at activation | PD-007 phrases it as an adapter capability | BR-004 cannot distinguish; all open runs become `Interrupted` |
| A-003 | Only one VS Code window per folder writes runtime data in the MVP; a second window reads only | rare case, PD-005 allows one active run per project | concurrent writes could corrupt data — then ADR-002 needs locking |
| A-004 | 90-day cap and "Clear run history" per PD-012 are acceptable | PD-012 (proxy) | AC-018/AC-019 change |
| A-005 | Event payloads stay small enough that paging by count suffices | MVP shows basic events only (handoff §4.4) | paging by size needed |

## 15. Open points

- **OP-001** How `.env` values are recognised for masking (pattern only, or reading the workspace's
  `.env` files, which touches sensitive files) — decide in `/sdd-plan` with Gregor.
- **OP-002** PD-012 is a proxy decision — Gregor to confirm 90 days and the clear command.
- **OP-003** ADR-002 (storage technology) is missing — blocks the plan, not this spec.
- **OP-004** Whether "Clear run history" asks for confirmation every time (AC-019 assumes yes).

## 16. Definition of Ready

- [ ] ADR-002 written (SPIKE-004).
- [ ] 0011 run-state list and 0009 resume capability agree with BR-001 / A-002.
- [ ] OP-001 decided; PD-012 confirmed.

## 17. Definition of Done

- [ ] AC-001…AC-020 pass with evidence; tests green (`npm run test:unit`, `npm test` before done).
- [ ] No out-of-scope behaviour added; no file written inside the workspace (AC-016).
- [ ] Data-access description present and accepted by Gregor (AC-020).
- [ ] Architecture snapshot and Memory Bank updated for the new port and adapter.

## 18. Recommended next steps

`/sdd-clarify` on this spec in a fresh session, then `/sdd-plan` once ADR-002 exists.
