# Plan — Runtime Persistence & Event Model

**Spec:** [0004-runtime-persistence-event-model.md](../done/0004-runtime-persistence-event-model.md)
**Status:** Done
**Last updated:** 2026-11-17
**Current step:** none; all steps ticked

## Approach

All behaviour lives in a framework-free core module `src/core/runtime/`: one `RuntimeStore` per project
root does IDs, the closed status list, sequence numbers, duplicates, paging, the size cap, masking, the
write lock, classification, retention and fault handling. It reaches the disk only through a small
**medium port** (`src/core/ports/runtimeMedium.ts`: per-run append-only logs, an index, the spec status
history, a lock file, a store version). Two media implement it: an in-memory one (tests) and a Node-`fs`
one in `src/adapters/node/`. Every store criterion is written once as a **contract suite**
(`src/core/runtime/testing/contract.ts`) that takes a medium harness (medium + fault injection + raw
bytes) and runs against both media — that is AC-001's "unchanged core code". Ordering: runs before
events, then masking and the writer lifecycle, then faults, then the real medium and the VS Code wiring,
so every step leaves a working, tested store. Memory Bank files touched: `systemPatterns.md`,
`techContext.md`, `activeContext.md` (T-008, additive only — this branch merges back into main).

Storage layout (decided here, spec §13 and OP-015; ADR-002 amended in T-008):

```
<globalStorageUri>/featherspec-studio/projects/<sha256(projectKey).slice(0,16)>/
  store.json  {storeVersion: 1, projectRoot}     lock.json  {owner, heartbeatAt}
  index.json  run summaries (rewritten atomically; rebuildable, AC-022)
  runs/<runId>.run.jsonl     created, status, meta, flag records (append-only)
  runs/<runId>.events.jsonl  event records (append-only)
  spec-status-history.jsonl  0003's entries (append-only; rewritten only by the age cap)
```

`projectKey` is the root URI, lower-cased on win32 (same rule as 0001's `sameRootFor`). A run's data is
only appended to or removed as a whole (BR-007); the snapshot is the replay of its `.run.jsonl`. The
store state (*writable* / *read-only* / *unavailable* + reason) and its change event are the API 0003,
0006, 0007 and 0012 consume.

**Quality gates:** per step `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit`;
plus `npm run compile` on T-006…T-008. Pre-done gate (not per step): `npm test` on CI / Windows — it cannot
run here (VS Code download blocked).

## Research

Survey (2026-11-16, branch `spec-0004`, after spec 0001):

- Reused from 0001: `ClockPort.setTimeout` and `Disposable` (`src/core/ports/host.ts`), `sameRootFor`
  (`src/adapters/vscode/sameRoot.ts`), `snapshotTree` (`src/core/discovery/testing/snapshotTree.ts`, for
  AC-016), the fixture folders, the ESLint `vscode` ban for `src/core/**`.
- `ClockPort.now()` returns an ISO string and the fake returns `t1, t2…` — unusable for age arithmetic.
  The runtime module gets its own `RuntimeClock` (`epochMs()` + `setTimeout`) instead of changing
  `ClockPort`, so 0002/0003 work on main does not conflict.
- `DiscoveryController.onDidChangeActiveProject(listener)` (0001 AC-023, merged into this branch, Gregor
  2026-11-16) is the active-project notification; T-007 uses it and adds none. Edits to 0001 files are
  `src/extension.ts`, `package.json` and `eslint.config.mjs` only — likely merge points with 0002/0003.
- Core test helpers already import `fs` (`src/core/discovery/testing/snapshotTree.ts`,
  `discoverWorkspace.test.ts`), so AC-001's import scan and ESLint ban cover production core files only
  (`src/core/**/*.ts` minus `*.test.ts` and `**/testing/**`).
- PDs newer than the spec (PD-036…047) do not change 0004; PD-036 and PD-046 consume its *unavailable*
  state as written. No spec revision for them.
- Decisions adopted (spec §15 OP-015, pending Gregor's plan review): OP-005 newer-version store →
  state *read-only*, reason "history from a newer version", reads answer "not available", run creation
  refused; OP-006 creation awaits its first write and fails with the reason, also when not *writable*;
  OP-007 lost records are not retried; OP-008 `featherspec-studio.runHistory.maxAgeDays`, integer ≥ 1,
  default 90, scope `application` (an invalid value falls back to 90); OP-009 `MAX_EVENTS_PER_RUN =
  20_000`; OP-010 `MAX_PAGE_SIZE = 500`, larger requests are cut; OP-011 incomplete-record notice once
  per run and activation; OP-012 `HEARTBEAT_INTERVAL_MS = 10_000`, `LOCK_STALE_MS = 60_000`, a reader
  checks the lock at the heartbeat interval.
- The five readings of spec OP-014 (a)–(e) are built as written; Gregor confirmed them and the OP-015 values on 2026-11-16 (DoR ticked).
- Assumption: in a remote window `globalStorageUri` is a `file:` URI on the extension host's machine. If
  its scheme is not `file`, the store is *unavailable* with the reason "storage location is not on the
  local file system" (AC-025) — honest, not silent. The T-007 smoke suite proves the desktop case.
- No new dependencies: `node:crypto` (`randomUUID`, `createHash`), `node:fs/promises`, `node:readline`.

Sources:

- [VS Code — Common capabilities, data storage](https://code.visualstudio.com/api/extension-capabilities/common-capabilities) — `globalStorageUri` is for files "accessible from all workspaces", `storageUri` only for the current workspace: settles the location. Retrieved 2026-11-16.
- [VS Code — Remote extensions](https://code.visualstudio.com/api/advanced-topics/remote-extensions) — workspace extensions' Node.js code and fs APIs run on the remote host; the page does not say where storage URIs live (hence the assumption above). Retrieved 2026-11-16.
- [VS Code 1.146.0 extHostStoragePaths.ts](https://raw.githubusercontent.com/microsoft/vscode/1.146.0/src/vs/workbench/api/common/extHostStoragePaths.ts) — global storage is `globalStorageHome/<extension id>`, one directory per extension, not per workspace. Retrieved 2026-11-16.
- [Node v22.23.4 `doc/api/fs.md`](https://raw.githubusercontent.com/nodejs/node/v22.23.4/doc/api/fs.md) (matches local Node 22.23.4) — flag `'wx'` "fails if the path exists" (exclusive lock create); `rename` overwrites an existing `newPath` (atomic index and lock rewrite); concurrent writes to one file without waiting are unsafe (one serial write queue per file). Retrieved 2026-11-16.
- [VS Code — Contribution points, configuration](https://code.visualstudio.com/api/references/contribution-points) — `minimum`, `default`, scope `application` = user settings only. Retrieved 2026-11-16.
- [GitHub — About authentication, token formats](https://docs.github.com/en/enterprise-server@latest/authentication/keeping-your-account-and-data-secure/about-authentication-to-github) — prefixes `ghp_ github_pat_ gho_ ghu_ ghs_ ghr_`; new `ghs_` tokens have no fixed length, so patterns use a minimum length, not a fixed one. Retrieved 2026-11-16.
- [OpenRouter — secret formats](https://openrouter.ai/docs/guides/features/guardrails/secret-formats.md) — secondary source for the `sk-ant-` / `sk-` provider key prefixes. Retrieved 2026-11-16.

## Notices (English, PD-016; fixed here per spec §12)

| ID | Criterion | Text |
| --- | --- | --- |
| N-1 | AC-014 | `FeatherSpec Studio could not save the history of run <runId> (spec <stem>). The agent keeps working; this run's history is incomplete.` |
| N-2 | AC-015 | `FeatherSpec Studio cannot read the stored history of <n> run(s): <stem> (<runId>), …. The data was left unchanged.` |
| N-3 | AC-017 | `The run history of this project was written by a newer version of FeatherSpec Studio. It is left unchanged and is not shown; update FeatherSpec Studio to see it.` |
| N-4 | AC-021 | `FeatherSpec Studio skipped an incomplete record in the history of <n> run(s): <stem> (<runId>), …. The other records are shown.` |
| N-5 | AC-025 | `FeatherSpec Studio cannot reach its run history storage (<reason>). Run history is not available in this window.` |
| R-1 | AC-023 | reason: `Another VS Code window holds the write lock for this project's run history.` |
| C-1 | AC-019 | modal: `Clear the run history of <project>? All ended runs, their events and the spec status history are removed. Runs still open are kept.` — button `Clear Run History` |
| C-2 | AC-019 | `Run history cleared.` · `Run history cleared; <n> run(s) could not be removed.` · `Run history was not cleared.` · `No active FeatherSpec project; nothing was cleared.` · reader: `Run history was not cleared: ` + R-1 |

## Stages

1. T-001 → T-002 — the store core on the in-memory medium: runs, statuses, events, paging
2. T-003 → T-004 → T-005 — masking and spec status history, writer lifecycle and retention, faults and clearing
3. T-006 → T-007 — the Node-fs medium under the same contract suite, then the VS Code wiring
4. T-008 — data-access document, ADR-002 amendment, docs sync and final gates
5. T-009 — after `/sdd-compile` (NOT READY): append-only after a kill, writes to unreadable or newer data refused
6. T-010 — run-change notification for 0007 (2026-11-16)

No parallel stage: every slice extends the one `RuntimeStore` and its shared contract suite; T-006 and
T-007 need the complete medium contract.

## Steps

### T-001 — Runs and statuses through the medium port

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-008, AC-009, AC-028 (status part)
- **Do:** `src/core/ports/runtimeMedium.ts` (medium port), `src/core/runtime/{model.ts,runtimeStore.ts}`
  (closed status list BR-001, `createRun`, `reportStatus` with end data BR-011, model/session reference,
  `listRuns` newest first with optional stem, `getRun`, refusal naming the run ID for unknown runs),
  `IdSource` and `RuntimeClock` ports; `src/core/runtime/testing/{memoryMedium.ts,contract.ts}` (harness +
  first contract cases) and `runtimeStore.test.ts` running it on the in-memory medium;
  `src/adapters/node/randomIds.ts` (`randomUUID`) with the AC-002 10,000-ID test across two projects, one
  cleared. AC-001: ESLint `no-restricted-imports` for `fs`, `node:fs`, `fs/promises`, `node:fs/promises`,
  `sqlite`, `node:sqlite` on production core files, plus `src/core/runtime/importScan.test.ts` that scans
  them for those modules and `vscode`.
- **Verify:** `npm run test:unit` (contract cases AC-002…AC-004, AC-008, AC-009, AC-028; import scan) plus the per-step gates
- [x] **Verified (T-001):** 2026-11-16 — red: `npx vitest run src/core/runtime` 9 of 9 contract cases failed (`Not implemented` stub), `randomIds` test failed on the missing module; green: `npm run test:unit` 135 passed (9 contract cases AC-003/004/008/009/028, AC-002 10,000 IDs, import scan with negative control); ESLint ban verified by a throwaway `node:fs` import (error); `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean.
- **Notes:** Tests: contract cases in `src/core/runtime/testing/contractRuns.ts`, run by `runtimeStore.test.ts`; the in-memory harness injects faults through `testing/faultyMedium.ts`. Medium port also carries `RuntimeClock`, `IdSource`, `CredentialValuesPort`, `RuntimeNoticePort` (`src/core/ports/runtimeMedium.ts`). Import scan and ESLint ban cover production core files only (`*.test.ts` and `testing/` excluded).

### T-002 — Events: sequence, paging, duplicates, cap, non-blocking append

- **Covers:** AC-005, AC-006, AC-007, AC-027, AC-028 (event part), AC-029
- **Do:** `appendEvent` in `runtimeStore.ts`: next sequence number on receipt (lazily loaded per stored
  run), provider-identity dedup, late events stored without status change, `truncated` at
  `MAX_EVENTS_PER_RUN` (injectable for tests) then no more events but status changes go on;
  `readEvents(runId, fromSeq, size)` cut to `MAX_PAGE_SIZE`; a per-run overlay of records not yet
  confirmed by the medium so reads never wait on a write (AC-029). In-memory harness gains
  "writes never complete". Contract cases for each criterion, incl. the 10,000-event page example.
- **Verify:** `npm run test:unit` (new contract cases red first, then green) plus the per-step gates
- [x] **Verified (T-002):** 2026-11-16 — red: `npx vitest run src/core/runtime` 12 new contract cases failed (`Not implemented`), 11 earlier passed; green: 23 of 23 (AC-005, AC-006 incl. the 10,000-event page, AC-007, AC-027, AC-028 event part, AC-029 with writes that never complete, negative control for AC-029); `npm run test:unit` all green, `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean.
- **Notes:** Tests: `src/core/runtime/testing/contractEvents.ts`. The truncated marker is written as event CAP+1 as soon as event CAP is stored (payload `{limit}`). Failed event writes stay in the per-run overlay (kept for T-005's flag and notice).

### T-003 — Masking and the spec status history

- **Covers:** AC-013, AC-026
- **Do:** `docs/security/secret-patterns.md` (provider tokens: GitHub `gh[pousr]_`/`github_pat_`,
  `sk-ant-`, `sk-`; bearer tokens; private-key blocks — one sample each);
  `src/core/runtime/masking.ts` (patterns + credential values → placeholder `[masked]`, walks every
  string of payload, cause, error message, result) behind a `CredentialValuesPort`; a test that the
  doc's patterns and samples equal the code's; masking applied in `runtimeStore.ts` before the medium.
  `appendSpecStatusEntry(stem, entry)` / `readSpecStatusHistory(stem?)` in append order, unmasked,
  unchanged (BR-010). Contract cases: neither sample nor credential in what the port returns or in the
  harness's raw bytes; history order survives a re-open.
- **Verify:** `npm run test:unit` (masking, doc-sync and AC-026 contract cases red first, then green) plus the per-step gates
- [x] **Verified (T-003):** 2026-11-16 — red: masking module missing (`Cannot find module './masking'`), then 3 contract cases failed (token samples reached the port, history `Not implemented`); green: `npx vitest run src/core/runtime` 31 of 31 (doc/code pattern sync, one sample per pattern masked, negative controls, AC-013 contract case on port and raw bytes, AC-026 order across a restart); `npm run test:unit` 155 passed; `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean.
- **Notes:** Tests: `src/core/runtime/masking.test.ts`, `testing/contractMasking.ts`. Doc table columns: name, category, pattern, flags, sample (the test parses it). Spec status history records carry `observedAt` (store clock) beside the unchanged entry.

### T-004 — Writer lock, restore, `Interrupted`, retention, store state

- **Covers:** AC-010, AC-011, AC-018, AC-023, AC-024, AC-025
- **Do:** `src/core/runtime/writerLock.ts` (acquire by exclusive create, heartbeat every
  `HEARTBEAT_INTERVAL_MS`, stale after `LOCK_STALE_MS`, takeover with re-read to confirm the owner,
  release on dispose); `openRuntimeStore` in `runtimeStore.ts`: writer → classify every open run
  `Interrupted` ("extension host restarted", classification time) and apply the age cap (runs by end
  time, history entries by observed time; open and unreadable runs kept; `maxAgeDays` validated, 90
  default); reader → reads only, every write refused with R-1; reader polls the lock and on takeover
  classifies and caps; `state()` + `onDidChangeState`; medium open failure → *unavailable*, reads
  "not available" with reason, N-5 once per activation through a `RuntimeNoticePort`. Two "windows" in
  tests share one in-memory medium; controllable clock.
- **Verify:** `npm run test:unit` (contract cases red first, then green) plus the per-step gates
- [x] **Verified (T-004):** 2026-11-16 — red: `npx vitest run src/core/runtime` 13 of the 17 new contract cases failed (no lock, no classification, no cap, no state); AC-010 restore case was already green (restore existed since T-001), given a negative control (the stored run must exist before the comparison); green: 48 of 48 in `src/core/runtime`, `npm run test:unit` all green, `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean.
- **Notes:** Tests: `testing/contractWriter.ts`. Three earlier cases were adapted because the writer now classifies at open (AC-008 reopen uses a Completed run; AC-027 reopen disposes the first window). Lock owner IDs come from `IdSource`; `dispose` waits for queued writes but gives up after 3 s of clock time. `clear()` guards the writer state and stays `Not implemented` until T-005.

### T-005 — Save failures, unreadable and newer data, clearing

- **Covers:** AC-014, AC-015, AC-017, AC-019 (core), AC-021, AC-022
- **Do:** in `runtimeStore.ts`: failed write → caller unaffected, record kept in the overlay for the
  session, "history incomplete" flag in memory and appended with the run's next successful write, N-1
  once per run (no retry, OP-007); per-run read verdicts from the medium (incomplete last record →
  skipped, N-4; other unreadable part → "history unreadable", N-2); unknown `storeVersion` or record
  `v` → left untouched, N-3, state per OP-005; unreadable index → rebuilt from run logs;
  `clear()` → removes ended and unreadable runs and all history entries, keeps open runs, returns the
  count it could not remove; age cap and clear skip newer-version data. Harness gains fail-next-write,
  corrupt-run, truncate-last-record, corrupt-index; every fault case asserts the run's raw bytes are
  unchanged.
- **Verify:** `npm run test:unit` (contract cases red first, then green) plus the per-step gates
- [x] **Verified (T-005):** 2026-11-16 — red: `npx vitest run src/core/runtime` 12 of 15 new contract cases failed (AC-014 x3, AC-015 x2, AC-021 x2, AC-022, AC-017 x2, AC-019 x2); the 3 green ones are negative controls and OP-006/AC-023 behaviour that already held; green: 63 of 63 in `src/core/runtime`, `npm run test:unit` all green, `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean. Every fault case compares the run's raw bytes before and after.
- **Notes:** Tests: `testing/contractFaults.ts`. Limitations kept on purpose: (1) a later append to a file whose last record was incomplete starts on a new line, so that run reads as unreadable at the next activation (open runs with a half-written run log); (2) an unreadable event line is found when the events are read up to it, not at activation; (3) `index.json` lists run ID, stem and creation time: it supplies the stem of unreadable runs; the writer rewrites it at activation, at Clear and at close, and at most every 2 s after run creation (a rewrite per creation made 10,000 creations quadratic); the run list itself always comes from the run logs.

### T-006 — Node-fs medium under the same contract suite

- **Covers:** AC-001, AC-013, AC-016, AC-021, AC-022, AC-024
- **Do:** `src/adapters/node/fileRuntimeMedium.ts`: the layout above under a base directory, one serial
  write queue per file, `appendFile` for logs, tmp + `rename` with `EPERM`/`EBUSY` retry for index, lock
  and history rewrite, `'wx'` for the lock, streamed line reads for event pages, every path checked to
  lie under the base directory. `fileRuntimeMedium.test.ts` runs the full contract suite on a temp
  directory with a file harness (faults by editing bytes, e.g. a half-written last line), plus AC-016:
  `snapshotTree` of a copied workspace fixture is equal before and after all scenarios.
- **Verify:** `npm run test:unit` (file-medium suite red on the missing adapter, then green) plus the per-step gates and `npm run compile`
- [x] **Verified (T-006):** 2026-11-16 — red: with the adapter file moved away `npx vitest run src/adapters/node/fileRuntimeMedium.test.ts` fails (`Cannot find module './fileRuntimeMedium'`); the first run with the adapter written failed 3 of 61 (a synchronous throw instead of a rejection, and a `settle()` too short for real file I/O); green: 61 of 61, three repeat runs green; `npm run test:unit` 248 passed, `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run compile` clean.
- **Notes:** Tests: `src/adapters/node/fileRuntimeMedium.test.ts` (full contract suite on a temp directory, path-guard, exclusive create, lines with a half-written tail, AC-013 raw bytes, AC-016 `snapshotTree` of a copied fixture before/after store, restore, clear and an unreachable store). `settle()` in `testing/fakes.ts` now also waits 40 ms of real time so file I/O can finish. Windows `EPERM`/`EBUSY` retry is in the adapter but cannot be exercised here; CI on Windows runs the same suite.

### T-007 — VS Code wiring: active project, Clear command, notices, setting

- **Covers:** AC-019, AC-025, AC-018 (setting)
- **Do:** `src/core/runtime/runtimeSession.ts` subscribes to `DiscoveryController.onDidChangeActiveProject`
  (0001 AC-023; no new controller API) and opens and disposes a store when the active project changes and runs the Clear flow
  (C-1/C-2; declined, no project and reader cases) against `UiPort`-style ports — proven with fakes;
  `src/adapters/vscode/{runtimeUi.ts,runtimeSettings.ts}` (modal confirm, warnings, `maxAgeDays`);
  `src/extension.ts` composes with `globalStorageUri` (non-`file` scheme → *unavailable*) and exposes
  the store state on `StudioApi`; `package.json`: command `featherspec-studio.clearRunHistory`
  ("FeatherSpec Studio: Clear Run History"), configuration `featherspec-studio.runHistory.maxAgeDays`;
  `manifest.test.ts` updated; host smoke `src/test/runtime.smoke.test.ts` (store *writable*, command
  registered, workspace fixture unchanged) — runs on CI only.
- **Verify:** `npm run test:unit` (session and manifest tests red first, then green) plus the per-step gates and `npm run compile`
- [x] **Verified (T-007):** 2026-11-16 — red: `npx vitest run src/core/runtime/runtimeSession.test.ts` failed (`Cannot find module './runtimeSession'`) and 3 of 7 `manifest.test.ts` cases failed (no clear command, no setting); green: session tests 8 of 8 (real `DiscoveryController` + `onDidChangeActiveProject`, open/switch/dispose, Clear flow: confirm every time, declined, no project, reader, failed count), manifest 7 of 7; `npm run test:unit` 258 passed, `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run compile` clean, `npx tsc -p . --outDir /tmp/out-check` compiles the host smoke suite. Host smoke `src/test/runtime.smoke.test.ts` not run here (CI only).
- **Notes:** Tests: `src/core/runtime/runtimeSession.test.ts`, `src/adapters/vscode/manifest.test.ts` (the 0001 command-list case now expects three commands), `src/test/runtime.smoke.test.ts` (CI). No controller API added: the session follows `onDidChangeActiveProject` (0001 AC-023). `StudioApi` gained `runtimeState()` and `runtimeStore()`; `deactivate` is async and releases the lock. Setting read through `createMaxAgeDaysSetting`, notices through `UiPort`-style `RuntimeUiPort.warn`. Credential values are an empty list until 0009/0010 supply theirs.

### T-008 — Data-access document, ADR-002 amendment, docs sync, final gates

- **Covers:** AC-020; re-proves AC-001…AC-029 (without AC-012) through the full gate run
- **Do:** `docs/runtime-data.md` (what is stored, where, how long, clearing, deleting by hand, storage
  errors, best-effort masking, same-path inheritance); ADR-002 *Amendments*: location `globalStorageUri`
  per project root, append-only run logs instead of rewritten snapshots; README (command, setting, link to
  the document); `techContext.md` (no new tool; contract suite note); `systemPatterns.md` (dated
  decisions: store location, medium port + contract suite, append-only run logs); `activeContext.md`.
  Architecture snapshot, exactly these entries: modules `'src/core/runtime — runtime store: runs,
  events, masking, writer lock, retention, store state (spec 0004)'`, `'src/adapters/node — Node
  file-system adapter, Node-fs runtime medium, random IDs'` (replaces the current `src/adapters/node`
  line); `src/core/ports` line gains "runtime medium port". Gregor accepts the document (AC-020).
- **Verify:** `npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npm run test:unit` · `npm run compile`, all green; `manual: Gregor reads docs/runtime-data.md` — acceptance of wording, no command can settle it
- [x] **Verified (T-008):** 2026-11-16 — automatic part green: `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run test:unit` (258 passed, 17 files), `npm run compile` clean. Manual part: `docs/runtime-data.md` accepted by Gregor's proxy, 2026-11-16, after the correction of 'Nothing is rewritten' (T-009); AC-020 closed.
- **Notes:** Written: `docs/runtime-data.md`, ADR-002 *Amendments (plan 0004)*, README (command, setting, link), `techContext.md`, `systemPatterns.md` (three dated decisions), `activeContext.md` (one line each in Active Spec, Changed Recently, Next; the oldest Changed Recently bullet was evicted), `AGENTS.md` architecture snapshot (the three entries of the plan). The architecture update ran as part of this step without the interactive confirmation; Gregor sees the exact entries in the diff.

### T-009 — Append-only after a kill; refuse writes to unreadable or newer data

- **Covers:** AC-010, AC-015, AC-017, AC-021 (spec revised 2026-11-16 after `/sdd-compile`: BR-007, AC-015, AC-017, AC-021 reworded, Gregor; AC-020 document corrected, T-008 accepted)
- **Do:** `src/core/runtime/truncatedJson.ts` (a text is an incomplete record when it is a strict prefix of a JSON object) and a new parse result `incomplete` in `records.ts`; `runtimeStore.ts`: an incomplete record is skipped wherever it stands (run log replay, event load, event read), reported once per run and activation; the run's tail state is only "last line unterminated", so every append starts on a fresh line — also for `spec-status-history.jsonl` (shape inspected before the first append); `refuseUnreadable` refuses `reportStatus` and `appendEvent` for a run marked unreadable or newer, `appendSpecStatusEntry` for a history file with a newer record (refusal codes `unreadable-run`, `newer-version`); the two comments in `runtimeStore.ts` removed; `docs/runtime-data.md` and ADR-002 line corrected; N-4 says "an incomplete record".
- **Verify:** `npm run test:unit` (contract cases `a kill during a write` and `writes to data that cannot be read or is newer` on both media, `truncatedJson.test.ts`), plus the per-step gates and `npm run compile`
- [x] **Verified (T-009):** 2026-11-16 — red: `npx vitest run src/core/runtime src/adapters/node/fileRuntimeMedium.test.ts` 16 of 16 new contract cases failed (8 per medium: after kill and two restarts the run read 'Starting'/history unreadable, events 'unavailable', the second history entry lost, 5 writes accepted that must be refused), `truncatedJson` module missing; the 4 negative controls (damaged line still unreadable, readable run accepts writes) were green; green: `npm run test:unit` 280 passed (18 files), `npx eslint src --max-warnings 0`, `npx tsc --noEmit`, `npm run compile` clean. Kill scenario compares every `.jsonl` file after each activation: the bytes before it are a prefix.
- **Notes:** Tests: `testing/contractFaults.ts` (new describes), `truncatedJson.test.ts`. Replaces the T-005 limitations (1) and (2): after a kill the run no longer reads as unreadable at the second activation. An unreadable or newer line in an events file is found when the events are loaded for an append (the run is then marked unreadable and the append refused) or when they are read. A run whose only record is an incomplete `created` record stays "history unreadable". `docs/product/product-decisions.md` PD-028 still says "last record"; the PD register is Gregor's, not edited here.

### T-010 — Run-change notification (for 0007)

- **Covers:** AC-030
- **Files:** `src/core/runtime/runtimeStore.ts`, `src/core/runtime/testing/contractRunChanges.ts`, `src/core/runtime/testing/contract.ts`
- **Do:** test first, in the contract suite, so it runs on both media. `RuntimeStore.onDidChangeRuns(listener: () => void): Disposable`, additive; fired after `createRun`, `reportStatus` (not for the `Interrupted` classification on its own), `clear` (when it removed runs) and at the end of `becomeWriter` (load, classify, prune). A listener that throws does not stop the others or the call. `dispose()` drops the listeners. Other windows' changes are not notified (limitation, spec AC-030).
- **Verify:** `npm run test:unit -- src/core/runtime src/adapters/node/fileRuntimeMedium` plus the per-step gates
- [x] **Verified (T-010):** 2026-11-16 — red: `npx vitest run --project node src/core/runtime/runtimeStore.test.ts` 6 of 6 new contract cases failed (`store.onDidChangeRuns is not a function`); green: `npx vitest run --project node src/core/runtime src/adapters/node/fileRuntimeMedium` 166 of 166 on both media; gates: eslint 0 warnings, both `tsc --noEmit` clean, `npm run test:unit` 58 files, 881 tests passed.
- **Notes:** additive. `notifyRuns()` fires after `createRun` and `reportStatus` have stored, after `clear` removed at least one run, and at the end of `becomeWriter`; `classifyOpenRuns` does not fire on its own. Tests: `testing/contractRunChanges.ts` (registered in `contract.ts`). A reader window's poll still reloads runs silently: no notification for another window's writes, as the spec says.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-006 | eslint.config.mjs; src/core/ports/runtimeMedium.ts; src/adapters/node/fileRuntimeMedium.ts | src/core/runtime/importScan.test.ts; src/core/runtime/runtimeStore.test.ts and src/adapters/node/fileRuntimeMedium.test.ts (same contract suite) | verified |
| AC-002 | T-001 | src/adapters/node/randomIds.ts | src/adapters/node/randomIds.test.ts | verified |
| AC-003 | T-001 | src/core/runtime/runtimeStore.ts:createRun | src/core/runtime/testing/contractRuns.ts (AC-003) | verified |
| AC-004 | T-001 | src/core/runtime/runtimeStore.ts:reportStatus | src/core/runtime/testing/contractRuns.ts (AC-004) | verified |
| AC-005 | T-002 | src/core/runtime/runtimeStore.ts:appendEvent | src/core/runtime/testing/contractEvents.ts (AC-005) | verified |
| AC-006 | T-002 | src/core/runtime/runtimeStore.ts:readEvents | src/core/runtime/testing/contractEvents.ts (AC-006) | verified |
| AC-007 | T-002 | src/core/runtime/runtimeStore.ts:appendEvent | src/core/runtime/testing/contractEvents.ts (AC-007) | verified |
| AC-008 | T-001 | src/core/runtime/runtimeStore.ts:listRuns | src/core/runtime/testing/contractRuns.ts (AC-008) | verified |
| AC-009 | T-001 | src/core/runtime/runtimeStore.ts:openRuntimeStore | src/core/runtime/testing/contractRuns.ts (AC-009) | verified |
| AC-010 | T-004, T-009 | src/core/runtime/runtimeStore.ts:loadRuns, replayRun | src/core/runtime/testing/contractWriter.ts (AC-010); contractFaults.ts (kill, restart, restart) | verified |
| AC-011 | T-004 | src/core/runtime/runtimeStore.ts:classifyOpenRuns | src/core/runtime/testing/contractWriter.ts (AC-011) | verified |
| AC-013 | T-003, T-006 | src/core/runtime/masking.ts; docs/security/secret-patterns.md | src/core/runtime/masking.test.ts; src/core/runtime/testing/contractMasking.ts (AC-013); src/adapters/node/fileRuntimeMedium.test.ts (raw bytes) | verified |
| AC-014 | T-005 | src/core/runtime/runtimeStore.ts:settleWrite | src/core/runtime/testing/contractFaults.ts (AC-014) | verified |
| AC-015 | T-005, T-009 | src/core/runtime/runtimeStore.ts:reportProblems, refuseUnreadable | src/core/runtime/testing/contractFaults.ts (AC-015, refusals) | verified |
| AC-016 | T-006 | src/adapters/node/fileRuntimeMedium.ts | src/adapters/node/fileRuntimeMedium.test.ts (AC-016 snapshotTree); src/test/runtime.smoke.test.ts (CI) | verified |
| AC-017 | T-005, T-009 | src/core/runtime/runtimeStore.ts:openRuntimeStore, refuseUnreadable, appendSpecStatusEntry | src/core/runtime/testing/contractFaults.ts (AC-017, refusals) | verified |
| AC-018 | T-004, T-007 | src/core/runtime/runtimeStore.ts:applyAgeCap; package.json (setting); src/adapters/vscode/runtimeSettings.ts | src/core/runtime/testing/contractWriter.ts (AC-018); src/adapters/vscode/manifest.test.ts | verified |
| AC-019 | T-005, T-007 | src/core/runtime/runtimeStore.ts:clear; src/core/runtime/runtimeSession.ts; src/adapters/vscode/runtimeUi.ts; package.json | src/core/runtime/testing/contractFaults.ts (AC-019); src/core/runtime/runtimeSession.test.ts | verified |
| AC-020 | T-008 | docs/runtime-data.md | manual: Gregor's proxy checked docs/runtime-data.md against AC-020 and accepted it, 2026-11-16 | verified |
| AC-021 | T-005, T-006, T-009 | src/core/runtime/runtimeStore.ts:replayRun, loadEventState, reportIncompleteOnce; src/core/runtime/truncatedJson.ts | src/core/runtime/testing/contractFaults.ts (AC-021, kill during a write); src/core/runtime/truncatedJson.test.ts; src/adapters/node/fileRuntimeMedium.test.ts | verified |
| AC-022 | T-005, T-006 | src/core/runtime/runtimeStore.ts:loadRuns, writeIndex | src/core/runtime/testing/contractFaults.ts (AC-022); src/adapters/node/fileRuntimeMedium.test.ts | verified |
| AC-023 | T-004 | src/core/runtime/writerLock.ts; src/core/runtime/runtimeStore.ts:assertWritable | src/core/runtime/testing/contractWriter.ts (AC-023) | verified |
| AC-024 | T-004, T-006 | src/core/runtime/writerLock.ts | src/core/runtime/testing/contractWriter.ts (AC-024); src/adapters/node/fileRuntimeMedium.test.ts | verified |
| AC-025 | T-004, T-007 | src/core/runtime/runtimeStore.ts:setState; src/core/runtime/runtimeSession.ts; src/extension.ts | src/core/runtime/testing/contractWriter.ts (AC-025); src/core/runtime/runtimeSession.test.ts; src/test/runtime.smoke.test.ts (CI) | verified |
| AC-026 | T-003 | src/core/runtime/runtimeStore.ts:appendSpecStatusEntry | src/core/runtime/testing/contractMasking.ts (AC-026) | verified |
| AC-027 | T-002 | src/core/runtime/runtimeStore.ts:appendEvent | src/core/runtime/testing/contractEvents.ts (AC-027) | verified |
| AC-028 | T-001, T-002 | src/core/runtime/runtimeStore.ts:requireRun | src/core/runtime/testing/contractRuns.ts, contractEvents.ts (AC-028) | verified |
| AC-029 | T-002 | src/core/runtime/runtimeStore.ts:persistEvents | src/core/runtime/testing/contractEvents.ts (AC-029) | verified |
| AC-030 | T-010 | `src/core/runtime/runtimeStore.ts:notifyRuns, onDidChangeRuns` | `src/core/runtime/testing/contractRunChanges.ts` (AC-030, both media) | verified |

## Open evidence

- 2026-11-16 — First host-suite run (Gregor, Windows 11, Node 26, VS Code 1.146): `runtime.smoke` AC-025 and AC-016 timed out waiting for `writable` (70 s each); the Mission Control smoke (0006) then showed the store reason `storage location is not on the local file system`, so `context.globalStorageUri.scheme` was not `file` in that window. The log does not say which scheme it was. Fix: `src/adapters/vscode/storageLocation.ts:resolveStorageLocation` (Vitest `storageLocation.test.ts`, red first) keeps `file` URIs on `fsPath`, falls back to the absolute `context.globalStoragePath` for a non-file scheme, and otherwise reports the unavailable reason with the scheme named. `src/extension.ts` uses it. Tests: new `src/core/discovery/testing/waitFor.ts` (Vitest-covered) names what is awaited and the last observed state on a timeout; wait is 30 s, suite 60 s. Not yet seen green on the host; if the next run still reports `unavailable`, the reason now names the scheme.

- 2026-11-17 — Seen green on the host: Windows 11 (Gregor's machine, VS Code stable, Node 26) `npm test` 28 passing, 0 failing at commit e6f0c85, 2026-11-17 08:45 CET, including `src/test/runtime.smoke.test.ts` (AC-016, AC-025: store *writable*); GitHub Actions (ubuntu-latest + windows-latest) green at commit 9635ba4, 2026-11-17. The storage-location fix above is thereby proven; this is the pre-done gate for e6f0c85. No product code or host test of this spec changed after it.
- 2026-11-17 — Second `/sdd-compile` (closing session, worktree at e6f0c85): READY (manual items: 1 — AC-020, accepted by Gregor's proxy 2026-11-16). `npx eslint src --max-warnings 0` 0 warnings · `npx tsc --noEmit` and `-p src/webview` clean · `npm run test:unit` 160 files, 2008 tests passed · `npm run compile` green. Mutation spot-check: AC-007 identity check disabled → 2 AC-007 contract cases fail.

## Session handoff

- **Done so far:** T-001…T-010 ticked (T-010: run-change notification for 0007). `/sdd-compile` found 'Interrupted run reads as unreadable at the second activation' and writes to unreadable or newer data accepted; both fixed test-first on both media (T-009), spec wording adjusted, `docs/runtime-data.md` accepted (AC-020, T-008). `npm run test:unit`: 280 tests green.
- **Next action:** none — moved to `done/` and archived 2026-11-17 (`/sdd-lifecycle`); this plan is frozen.
- **Open decisions:** PD-028 in `docs/product/product-decisions.md` still reads "incomplete last record" (Gregor's register).
- **Baseline:** 767ac42 (HEAD before the first step commit)
- **Environment:** `npm test` runs on Gregor's Windows machine and on CI, not in the sandbox. Tests added — stage 1: `src/core/runtime/testing/{contract,contractRuns,contractEvents}.ts`, `src/core/runtime/runtimeStore.test.ts`, `src/core/runtime/importScan.test.ts`, `src/adapters/node/randomIds.test.ts`; stage 2: `src/core/runtime/testing/{contractMasking,contractWriter,contractFaults}.ts`, `src/core/runtime/masking.test.ts`; stage 3: `src/adapters/node/fileRuntimeMedium.test.ts`, `src/core/runtime/runtimeSession.test.ts`, `src/adapters/vscode/manifest.test.ts` (changed), `src/test/runtime.smoke.test.ts` (CI only); stage 5: `src/core/runtime/testing/contractFaults.ts` (new describes), `src/core/runtime/truncatedJson.test.ts`.
