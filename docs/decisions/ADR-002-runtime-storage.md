# ADR-002: Runtime Storage for Agent Runs and Events (SPIKE-004)

- Status: Proposed (awaiting PO/Tech-Lead review); Date: 2026-11-16
- Scope: runtime data only (AgentRuns, normalised AgentEvents, UI hints). Markdown under `.specs/` stays the single source of truth for specs (P2); nothing in this store may override spec state.
- Related: FS-004 (FR-004.1–8, AC-004.1–8), NFR 13 (Reliability, Security, Privacy), ADR-001 (ports and adapters)

## Decision

**Use local files in `ExtensionContext.storageUri`: a JSON snapshot per run plus an append-only JSONL event log per run. Put them behind a `RuntimeStorePort` in `core/`. Keep Memento for tiny UI hints only, and `SecretStorage` for credentials only. Do not adopt an embedded database for the MVP.** `node:sqlite` is the designated upgrade path behind the same port, once runtime availability is proven (see Risks).

Layout (no files ever go into the user's repository):

```
<storageUri>/featherspec-studio/
  store.json                       { storeVersion: 1, createdAt }
  projects/<projectKey>/           projectKey = sha256(workspaceFolder.uri.toString()).slice(0,16)
    project.json                   { folderUri, folderName, lastSeenAt }   (re-association hint)
    runs/<runId>.json              run snapshot (status, provider, specId, timestamps, lastSeq, v)
    runs/<runId>.events.jsonl      one normalised event per line: { v, seq, runId, ts, type, payload }
```

Rules the adapter implements and the contract tests check:

1. **Append, then snapshot.**
   - Events are appended with `fs.appendFile` and **batched** (flushed at ≤ 250 ms or 50 events).
   - The run snapshot is written atomically: write `*.tmp`, then `rename`, with a retry on Windows `EPERM`/`EBUSY`.
   - Token-level deltas are coalesced before persistence and are not stored one by one.
2. **Recovery on activation.**
   - Read the snapshots, and drop a trailing partial JSONL line (crash mid-write).
   - Rebuild `lastSeq` from the log if it is newer than the snapshot.
   - Any run in `running`, `waiting` or `starting` with no live provider session becomes `interrupted` (FR-004.6, AC-004.5).
   - Events are deduplicated by `(runId, seq)` or the provider event ID (NFR "duplicate or late events").
3. **Paged reads.** The UI gets run summaries plus the tail or a page of events, never a whole history (NFR Performance).
4. **Versioning.**
   - Every record carries `v`.
   - `store.json.storeVersion` gates migrations, which are pure functions in `core/` and unit-tested with fixture stores. Old event versions are upcast on read.
   - An unknown future version opens read-only and shows "history from a newer version" (P8).
5. **Retention.**
   - Default: keep the last 50 runs per project, or 30 days. The values are configurable and the PO confirms them.
   - Commands: "Delete run history (this project)" and "(all projects)".
   - Deleting the extension's data is a plain directory removal.
6. **Secrets.**
   - `context.secrets` only.
   - Event normalisation runs a redaction pass (known token patterns, `Authorization` headers, env values from provider config) **before** the port is called.
   - A contract test asserts that no seeded fake secret ever appears in the store (AC-004.6).
7. **Isolation.**
   - Writes are confined to `storageUri`; the adapter rejects any path outside it.
   - A failure in the store never touches `.specs/**` (AC-004.8). It degrades to an in-memory store with a visible warning.
   - If `storageUri` is `undefined` (empty window), the Studio has no project anyway, so nothing is persisted.

## Options considered

| Criterion | Memento (`workspaceState`/`globalState`) | **Files in `storageUri` (JSON + JSONL)** | `node:sqlite` | better-sqlite3 13.2.0 | sql.js 1.16.0 (wasm) |
|---|---|---|---|---|---|
| Event volume (estimate, not measured: 10²–10⁴ events per run, about 0.5–2 KB each) | Poor. In 1.146 the extension's whole Memento object is held in memory and rewritten as one value on each update (extHostMemento.ts) | Good. O(1) appends; reads paged per run | Very good | Very good | Whole DB in memory; full export to persist |
| Transactions | Per key only | Not needed: single writer per workspace window, one file per run, atomic rename for snapshots | Full ACID, WAL | Full ACID | In memory only until export |
| Workspace association | Automatic | Automatic, plus a per-folder `projectKey` for multi-root | Same as files (file location) | Same | Same |
| Folder moved or renamed | Orphaned (new workspace ID) | Orphaned the same way; `project.json` allows a later "re-attach history" | Same | Same | Same |
| Crash recovery | VS Code-managed, flushed with a delay | Partial last line is detectable and droppable | Journal or WAL | Journal or WAL | Data since last export lost |
| Migration | Ad hoc | Versioned records + pure migrations | SQL migrations | SQL migrations | SQL migrations |
| Retention and deletion | `update(k, undefined)` | Delete files | `DELETE` + `VACUUM` | Same | Same |
| Native module and packaging | None | None | None (built into the runtime) | Native addon: needs Electron ABI (NMV 148) **and** plain-Node ABI for VS Code Server, so per-platform VSIX via `--target` | None; about 1 MB wasm in the bundle |
| Remote and Containers | Works | Works (remote doc: storage URIs keep working) | VS Code Server bundles Node 24.22.1, so likely works | Rebuild per platform/ABI | Works |
| Plain-Node testability | Needs a fake | Real adapter on a temp dir | Real adapter (Node ≥ 22.13) | Needs node-gyp or prebuilds for the test Node | Works |
| Repo pollution | None | None | None | None | None |
| Dependencies | 0 | 0 | 0 | 1 native | 1 + wasm asset |

Why not Memento for events: besides the whole-object rewrite, the API docs require JSON-stringifiable values. `globalState` can be synced across devices, which is wrong for privacy, and the remote guide warns that the Mementos are plaintext. We use Memento only for UI hints such as last selected project and board filters.

Why not `globalStorageUri`: it is shared by every window, so concurrent writers would need locking. `storageUri` is per-workspace and gives isolation for free (AC-004.7). Cross-workspace views are out of MVP scope (Multi-Project-Dashboard).

Why not `node:sqlite` now:
- Node 24.22.1 marks it "Stability: 1.2 – Release candidate"; it has been unflagged since 22.13 / 23.4. VS Code 1.146 ships Electron 43.8.6 with Node 24.22.1.
- **Static inspection** of the Electron 43.8.6 linux-x64 binary shows the `node::sqlite::DatabaseSync` symbols and the `lib/sqlite.js` builtin, so it is compiled in.
- But Node only enables `require('node:sqlite')` in `setupSQLite()` during pre-execution. Whether Electron's utility-process extension host runs that path was **not verified at runtime**: executing the downloaded binary was not permitted in this spike.
- VS Code forks can lag on Node (for example, a Cursor remote server on Node 20 broke a `node:sqlite` extension, Feb 2026).
- For MVP volumes, files already meet every criterion with zero risk.

## Consequences

- Positive: no dependencies and no native code, and one VSIX for every platform and for Remote. The store is human-inspectable for support (JSONL). The same contract test suite runs against `InMemoryRuntimeStore` and `FileRuntimeStore` in plain Node (Vitest, temp dirs) and once in the extension host (`@vscode/test-cli`).
- Negative:
  - No ad-hoc queries across runs. Dashboard aggregates come from snapshots, which are kept small.
  - Our own code handles atomic writes, batching, partial-line repair and retention, all of which need tests including crash simulation (kill between append and rename).
- Folder moves and renames orphan the history, like VS Code's own chat sessions (open issue microsoft/vscode#305818). MVP behaviour: show "no history for this location" honestly. A post-MVP "re-attach" can use `project.json`.
- Uninstall cleanup of `storageUri` is **not documented** in the sources found. The explicit delete commands cover privacy (NFR Privacy: retention and deletion specified).
- Upgrade trigger to `node:sqlite` (same port, migration imports JSONL):
  - one integration test in the extension host proves `require('node:sqlite')` on all three OSes and in Remote, **and**
  - either measured histories exceed about 50 MB per project, or the product needs cross-run queries.

## Risks

1. Unbounded event streams from chatty providers. Mitigation: coalescing plus a per-run size cap with a "truncated" marker event.
2. Windows file locking during `rename` (antivirus, indexer). Mitigation: retry with backoff; contract test on the Windows CI runner.
3. Two VS Code windows on the same workspace (rare). Mitigation: a lock file with PID and heartbeat; the second window opens read-only.
4. `node:sqlite` availability in the extension host is still unproven at runtime (see above).

## Sources (all retrieved 2026-11-16)

- `@types/vscode` 1.146.0 `index.d.ts`: `storageUri` ("undefined when no workspace nor folder has been opened"), `globalStorageUri`, `Memento.update` ("must be JSON-stringifyable"), `globalState.setKeysForSync`, `SecretStorage` ("stored encrypted … not synced"). From `npm view @types/vscode` and the local copy.
- Common capabilities, data storage: https://code.visualstudio.com/api/extension-capabilities/common-capabilities
- Remote extensions (storage URIs in remote, secrets on client, Mementos plaintext, native modules and VS Code Server's plain Node): https://code.visualstudio.com/api/advanced-topics/remote-extensions
- VS Code 1.146.0 source, ext host Memento (whole-object `setValue`): https://raw.githubusercontent.com/microsoft/vscode/1.146.0/src/vs/workbench/api/common/extHostMemento.ts ; storage flush delay: https://raw.githubusercontent.com/microsoft/vscode/1.146.0/src/vs/base/parts/storage/common/storage.ts
- VS Code 1.146.0 `cgmanifest.json` (electron 43.8.6, nodejs 24.22.1): https://raw.githubusercontent.com/microsoft/vscode/1.146.0/cgmanifest.json
- Electron v43.8.6 `DEPS` (`node_version: v24.22.1`) and `build/args/all.gn` (`node_module_version = 148`): https://raw.githubusercontent.com/electron/electron/v43.8.6/DEPS , https://raw.githubusercontent.com/electron/electron/v43.8.6/build/args/all.gn
- Electron v43.8.6 linux-x64 binary (static byte scan only, not executed): https://github.com/electron/electron/releases/download/v43.8.6/electron-v43.8.6-linux-x64.zip
- Node v24.22.1 `doc/api/sqlite.md` (stability 1.2, unflagged history, `backup()`): https://raw.githubusercontent.com/nodejs/node/v24.22.1/doc/api/sqlite.md ; enablement in `setupSQLite()`: https://raw.githubusercontent.com/nodejs/node/v24.22.1/lib/internal/process/pre_execution.js
- Workspace storage keyed by folder URI, orphaned on move: https://github.com/microsoft/vscode/issues/305818 (secondary: https://dev.to/5a9awneh/vs-code-is-silently-losing-your-copilot-chat-history-heres-why-and-how-to-get-it-back-440l)
- Fork lag example (Cursor remote Node 20, `node:sqlite` missing): https://forum.cursor.com/t/cursor-remote-runtime-locked-to-node-20-breaks-modern-extensions-requiring-node-22-node-sqlite/151196
- Platform-specific VSIX (`--target`) for native modules: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- npm registry (`npm view`, run in /tmp): better-sqlite3 13.2.0 (engines node ≥ 22, node-addon-api), sql.js 1.16.0

Gaps: no official doc states the physical location of `storageUri` in Remote, or whether it is cleaned on uninstall. The event-volume figures are estimates and must be measured with the SPIKE-002 provider.

## Amendments (2026-11-16, after `/sdd-clarify` on spec 0004)

The product decision register wins where it differs from the text above:

- **Retention:** 90-day age cap, configurable, plus "Clear Run History" (PD-027) — replaces "last 50 runs or 30 days". The per-run size cap with a "truncated" marker stays.
- **Restart:** every open run becomes `Interrupted` at activation; there is no "recovery pending" state (PD-024).
- **Keying:** one store per project root folder URI, not per VS Code workspace (PD-026).
- **Unreadable data:** granularity is the run; an incomplete last record is skipped on read and never rewritten (PD-028).
- **Second window:** one writer per project store, lock with heartbeat (PD-030).

## Amendments (2026-11-16, plan 0004)

The implementation of spec 0004 settles the location and the file layout:

- **Location:** `<globalStorageUri>/featherspec-studio/projects/<sha256(project root URI).slice(0,16)>/`, not the per-workspace `storageUri`. `globalStorageUri` is the only VS Code storage location that every window and workspace of the extension shares, which PD-026 (one store per project root) and PD-030 (one writer across windows) need. The root URI is lower-cased on Windows, like 0001's same-root rule. A `globalStorageUri` that is not a `file:` URI makes the store *unavailable* with a reason.
- **Layout:** append-only `runs/<runId>.run.jsonl` (created, status and flag records) replaces the rewritten JSON snapshot per run; `runs/<runId>.events.jsonl` stays; `index.json` (rebuildable), `spec-status-history.jsonl`, `lock.json` and `store.json` (`storeVersion`) sit beside them. A run's data is only appended to or removed as a whole (spec 0004 BR-007).
- **Medium port:** the store reaches the disk only through `RuntimeMedium` (`src/core/ports/runtimeMedium.ts`); an in-memory and a Node-`fs` medium run the same contract suite (`src/core/runtime/testing/`).
- **Limits:** page size at most 500 events, 20,000 events per run, lock heartbeat 10 s and stale after 60 s, age cap setting `featherspec-studio.runHistory.maxAgeDays` (default 90, minimum 1).
- **Newer data:** an unknown `storeVersion` or record version is never rewritten; the store is *read-only* with the reason "history from a newer version" (OP-005).
