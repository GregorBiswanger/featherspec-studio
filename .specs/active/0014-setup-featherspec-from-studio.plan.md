# Plan — Set Up FeatherSpec from the Studio

**Spec:** [0014-setup-featherspec-from-studio.md](0014-setup-featherspec-from-studio.md)
**Status:** In Progress
**Last updated:** 2026-11-17
**Current step:** T-005

## Approach

A new core area `src/core/setup/` decides everything — eligible targets, archive checks, file
classes, completions, write order, texts, merge prompt, Output block — behind three new ports
(`ReleaseHttpPort`, `ReleaseArchivePort`, `SetupTargetPort`) plus the existing UI, clock, output,
trust and discovery seams, so every criterion but AC-026 is proven on fakes with
`npm run test:unit`. Adapters stay thin: global `fetch` (VS Code's proxy support applies to it)
with manual redirects, Node `zlib` plus a ~120-line tar reader (no new dependency, PD-053), and a
Node-fs target writer whose `wx` create refuses an existing path (`vscode.workspace.fs.writeFile`
cannot). S2 gets a `viewsWelcome` button like "Initialize Repository"; S9, whose lines are dynamic,
keeps `TreeView.message` plus action items. Order: the visible state first (it also carries the
new discovery rule BR-07), then the pure release and file logic, then writes, then the service and
its wiring, then the amendments of 0001/0005 and the docs. Memory Bank files touched at the end:
`techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step `npx eslint src --max-warnings 0` · `npx tsc --noEmit` ·
`npx tsc --noEmit -p src/webview` · `npm run test:unit` · `npm run compile` (steps touching
adapters, `src/extension.ts`, `package.json` or the bundle); pre-done gate `npm test` (CI and the
Windows machine only — it cannot run in the agent sandbox).

## Research

Survey (2026-11-17):
- Spec revised first (Mode A step 4, "spec changed" per PLAN-NOTE): PD-053 applied — folder
  `.featherspec-setup/` (OP-001), all-pending S9 order (OP-006), "files were added to" text and
  Output next step (OP-007), written-through links in the README (OP-008), quota-free web route
  and reset-time reason (OP-009, §10, AC-019, A-006, new A-007), kept-setting keys in the Output
  block (OP-010, AC-023), no archive dependency (§15). PD-049…PD-052 stay the basis.
- Discovery: `classifyFolder.ts` decides verdicts from `AGENTS.md`/`.specs`; BR-07 adds one
  `stat('.featherspec-setup')` that ranks before the marker rules (read failures still win,
  0001 AC-017). `markerWatch.ts` watches `AGENTS.md` and `.specs` only → one more pattern.
- Shell: `panelState.ts` builds S2/S9; `texts.ts` `panelStateLines`/`panelStateActions` feed both
  `treeModel.ts` (tree) and `src/webview/PanelStateView.tsx` (panel) — one place for AC-001's
  order. `ActionId` list in `messages.ts`; `ShellActionsPort` runs actions.
- `studioTree.ts` sets `treeView.message` and returns action items; a welcome view renders only
  when both are empty → S2 becomes `{message: undefined, items: [], welcome: 'S2'}` plus a
  context key; S9 unchanged in kind.
- Ports exist for output (`OutputPort.appendBlock`), clock (`ClockPort.setTimeout`), trust
  (`TrustPort`), folders; discovery has `refresh()` (AC-018) and reports `readError` (BR-01).
- Version reading: `src/core/discovery/versionLine.ts` (0001 BR-07) is reused for BR-06.
- Network today: none in `src/` except the Copilot SDK's own process; `fake/noIo.test.ts` shows
  the module-recorder pattern reused for AC-025.
- Activation: `src/test/activation/noMarker.test.ts` needs the extension inactive in a
  marker-free window until a Studio view or command is used. `viewsWelcome` adds no activation
  event; its `when` uses our context key, which exists only after activation — and opening the
  view activates via implicit `onView` anyway. The negative-control window never opens the
  view, so it stays true; the new host check runs in its own window (T-008).
- Template `.vscode/settings.json` has nested objects (`chat.promptFilesLocations`), so AC-013's
  "any depth" is real; the 1.10.0 archive itself could not be fetched here (GitHub blocked in
  the sandbox), so AC-007's 67→63 example is tested on a synthetic archive of that shape and
  checked for real in M-2.
- Added by Gregor's side after the plan was written (2026-11-17): the live route was checked from his machine —
  `/releases/latest` answers 302 to `…/releases/tag/v1.10.0`, the tag archive 302 to
  `codeload.github.com/…/tar.gz/refs/tags/v1.10.0`, then 200 `application/x-gzip`. The real archive is in the
  repository as `test/fixtures/setup/featherspec-1.10.0.tar.gz` (facts in `test/fixtures/setup/README.md`: first
  entry `pax_global_header` type `g`, top folder `featherspec-1.10.0/`, 16 directories, 67 files). T-002 proves the
  reader and AC-007's 67 → 63 on this file as well as on synthetic archives; later steps may use it as their release.
- Assumptions this plan rests on: A-006, A-007 (spec §16); a file that appears after the
  confirmation and differs is parked when found (AC-010 "classed anew"), even though other files
  outside `.featherspec-setup/` already exist then — AC-014's order holds for the confirmed plan.

Sources (retrieved 2026-11-17):
- [VS Code Tree View guide, Welcome content](https://code.visualstudio.com/api/extension-guides/tree-view) — welcome shows only for a view with no `TreeView.message` and an empty tree; a link alone on a line is a button; `when` per entry.
- [Contribution points, viewsWelcome](https://code.visualstudio.com/api/references/contribution-points) — `when` controls visibility; extension content comes after core and built-in content.
- [UX guidelines, views](https://code.visualstudio.com/api/ux-guidelines/views) — buttons only for the primary action, other actions as links → "Set up FeatherSpec" button, "Open setup guide" · "Refresh" as links on one line.
- [Git extension package.json](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/package.json) and [package.nls.json](https://raw.githubusercontent.com/microsoft/vscode/main/extensions/git/package.nls.json) — "Initialize Repository" is a `viewsWelcome` entry on `scm` gated by `git.state == initialized` (a context key the activated Git extension sets): same pattern as ours.
- [Linking to releases](https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases) — `/releases/latest` links the latest release.
- [Source code archives](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-source-code-archives) — `archive/refs/tags/<tag>.tar.gz`; made by `git archive`; contents stable while the tag stays; repository name is part of the top folder.
- [REST releases, Get the latest release](https://docs.github.com/en/rest/releases/releases#get-the-latest-release) — "most recent non-prerelease, non-draft release" (A-007 compares the web route with this).
- [REST rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api) — 60/h per IP unauthenticated, 403 or 429 with `x-ratelimit-remaining: 0`, `x-ratelimit-reset` in epoch seconds; `retry-after` for secondary limits; web routes not covered (A-006).
- Live check of the redirect: not possible here (sandbox policy answers 403 for github.com); M-2 covers it.
- [Workspace Trust guide](https://code.visualstudio.com/api/extension-guides/workspace-trust) — `limited` + description stays; hiding is not enough, the command must refuse in code (AC-004); `isWorkspaceTrusted` context key exists but the button stays visible so the refusal message can show.
- [VS Code 1.96 release notes](https://code.visualstudio.com/updates/v1_96) — global `fetch` in the extension host has proxy support (setting `http.fetchAdditionalSupport`), like `https` had; engine is `^1.146.0`. [Network docs](https://code.visualstudio.com/docs/setup/network) are older and say extensions lack proxy support — superseded by 1.96.
- Node 22 check (local script, 2026-11-17): `fetch(url, {redirect: 'manual'})` returns the 302 with a readable `location` header; cancellation by `AbortSignal`.
- [Remote extensions](https://code.visualstudio.com/api/advanced-topics/remote-extensions) — a remote workspace extension's Node code and fs run on the remote host; a `file:` URI there names a remote file. [Virtual workspaces](https://code.visualstudio.com/api/extension-guides/virtual-workspaces) — VS Code calls a folder virtual when its scheme is not `file`; `virtualWorkspaces: false` acts only when all folders are virtual → BR-01 checks the scheme per folder.
- `@types/vscode` 1.146.0 (repo): `workspace.fs.writeFile(uri, content)` has no create-only option; `WorkspaceEdit.createFile({ignoreIfExists})` exists but goes through the editor's edit pipeline and is not an atomic exclusive create → Node `fs` `open(path, 'wx')`.

## Stages

1. T-001 — setup-pending folders and the setup actions show in discovery, panel and view
2. T-002 ‖ T-003 — independent: archive reading and checks | file classes and completions
3. T-004 → T-005 — download of the latest release, writes into the target
4. T-006 → T-007 → T-008 — setup run: start and confirmation, outcomes, VS Code wiring
5. T-009 → T-010 — amendments of 0001 and 0005, docs sync and final gates

Parallel: stage 2 — T-002 owns `src/core/ports/releaseArchive.ts`, `src/core/setup/releaseArchive*`, `src/adapters/node/tarGz*` and the texts; T-003 owns `src/core/ports/setupTarget.ts` and `src/core/setup/{fileClasses,gitignore,settingsJson,jsonc}*` and adds no text. 10 steps, two over the aim: 26 criteria, the ~150-line limit per step, and the separate amendment step requested for 0001/0005.

## Steps

### T-001 — Show setup-pending folders and the setup actions

- **Covers:** AC-001, AC-015
- **Do:** `classifyFolder.ts`: a root `.featherspec-setup` directory makes the folder *incomplete* with `setupPending: true`, ranked before the marker rules, after read failures; `discoverWorkspace.ts` adds the AC-015 diagnostic. Export `MARKER_WATCH_PATHS` (`AGENTS.md`, `.specs`, `.featherspec-setup`) from discovery; `markerWatch.ts` loops over it. `messages.ts`: `IncompleteFolder.setupPending?: true` (guard), `ACTION_IDS` += `setUp`, `copyMergePrompt`. `texts.ts`: labels "Set up FeatherSpec", "Copy merge prompt"; the S9 pending line in place of that folder's marker lines; `panelStateActions` S2 = setUp, openSetupGuide, refresh; S9 = setUp, copyMergePrompt (only with a pending folder), openSetupGuide, refresh — copyMergePrompt first when all folders are pending. `treeModel.ts`: S2 → no message, no items, `welcome: 'S2'`. `ShellActionsPort` += `setUp()`, `copyMergePrompt()`; `shellService.runAction` routes them; the shell world fake records them; `vscode/shellActions.ts` gets both as callbacks from `extension.ts`, which executes `featherspec-studio.setup` and `featherspec-studio.copyMergePrompt` — registered only in T-008, so until then the two buttons fail in a dev build (known intermediate state; the gates stay green). `PanelStateView.tsx`: first action is the primary button (`data-primary`), CSS via `--vscode-button-secondary-*` for the rest (guard test).
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-001):** 2026-11-17 — red first: `npx vitest run --project node --project webview` on the touched areas: 22 failed (assertions on verdict/actions/lines, missing module `markerWatchPaths`), 366 passed; then green. Gates: eslint, `tsc --noEmit` (both), `npm run test:unit` 168 files / 2181 tests (+11 timing) passed, `npm run compile` finished.
- **Notes:** Constant lives in `src/core/discovery/markerWatchPaths.ts` (also `SETUP_FOLDER`). `.specs` and `.featherspec-setup` watchers keep create/delete only; `AGENTS.md` also change. The context key for the welcome view is set in T-008. Tests: `classifyFolder`, `discoverWorkspace`, `markerWatchPaths`, `panelState`, `treeModel`, `shellService`, `messages`, `panelStateTexts` (new), `PanelStateView`, `webviewCss`.

### T-002 — Read and check the release archive

- **Covers:** AC-006, AC-007
- **Files:** `src/core/ports/releaseArchive.ts`, `src/core/setup/releaseArchive.ts`, `src/core/setup/releaseArchive.test.ts`, `src/adapters/node/tarGzArchive.ts`, `src/adapters/node/tarGzArchive.test.ts`, `src/adapters/node/testing/tarWriter.ts`, `test/fixtures/setup/git-archive-sample.tar.gz`, `test/fixtures/setup/featherspec-1.10.0.tar.gz` (exists), `src/shared/protocol/texts.ts`
- **Do:** Port `ReleaseArchivePort.read(bytes) → entries {path, kind: file|directory|metadata|other, bytes}` or a refusal reason. Adapter: `zlib.gunzipSync` with `maxOutputLength` 20 MB, tar reader for ustar headers (checksum, `prefix` field), pax `g`/`x` records (path override), types 0/NUL file, 5 directory, `g`/`x` metadata, everything else `other`. Core `releaseArchive.ts`: AC-006's checks in spec order (single top folder, root `AGENTS.md` with a valued version line via `versionLine.ts`, a file below `.specs/`, entry kinds, path rules, case collisions, size), strips the top folder, selects BR-02's release files (root exclusions only), returns version. Refusal texts in `texts.ts`. Fixture: one real `git archive --format=tar.gz` of a small tree with a path over 100 characters (command in Notes); hostile archives built in tests by `testing/tarWriter.ts`.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx vitest run --project node src/core/setup/releaseArchive src/adapters/node/tarGzArchive` (own tests only; the full gates run once on the stage's combined result)
- [x] **Verified (T-002):** 2026-11-17 — red first: `npx vitest run --project node src/core/setup src/adapters/node/tarGz` 51 failed (all `Not implemented` stubs); green after: 51 passed (real 1.10.0 archive: `pax_global_header` metadata, 16 folders, 67 files, 67 → 63 taken, version 1.10.0; real `git archive` sample with ustar prefix, pax path and a symbolic link; hostile archives built by `testing/tarWriter.ts`). `npx eslint src --max-warnings 0` and `npx tsc --noEmit` clean. Full gates run once after T-003 (sequence).
- **Notes:** Texts live in `src/core/setup/setupTexts.ts` (the setup's text module, asserted literally by tests), not `shared/protocol/texts.ts`; T-003 adds none. `read(bytes, maxUnpackedBytes)` is async (zlib `gunzip` with `maxOutputLength`). Path rules are checked before the top-folder check, so a hostile path is named as such. `.git` segment compared case-insensitively; `.` and empty segments are refused too. Fixture command: `git archive --format=tar.gz --prefix=sample-1.0.0/ HEAD` of a temp repo with a 162-character path (ustar prefix), a 134-character single name (pax `path`) and a symbolic link (so this sample is refused as a release, which is what its test shows).

### T-003 — Class release files against the folder and compute completions

- **Covers:** AC-011, AC-012, AC-013
- **Files:** `src/core/ports/setupTarget.ts`, `src/core/setup/fileClasses.ts`, `src/core/setup/fileClasses.test.ts`, `src/core/setup/gitignore.ts`, `src/core/setup/gitignore.test.ts`, `src/core/setup/jsonc.ts`, `src/core/setup/settingsJson.ts`, `src/core/setup/settingsJson.test.ts`, `src/core/setup/testing/memoryTarget.ts`
- **Do:** `SetupTargetPort` read part: `kind(root, path)`, `readBytes(root, path)`. `fileClasses.ts`: BR-03 (CRLF→LF on bytes) and BR-04 → missing / same / completed / kept with the computed completion. `gitignore.ts`: AC-012 (comment lines above, trailing-space compare, line ending of the first line, end an open last line). `jsonc.ts`: a small scanner with offsets (strings, both comment kinds, trailing commas); `settingsJson.ts`: insert keys missing at any depth before the closing brace in the file's indentation and line ending; report kept keys whose value differs (for AC-023); not one object → kept. Round-trip test: removing the added keys and their commas gives the input back, on inputs with comments, trailing comma, CRLF, empty object, nested missing and nested partial objects.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx vitest run --project node src/core/setup/fileClasses src/core/setup/gitignore src/core/setup/settingsJson` (own tests only; the full gates run once on the stage's combined result)
- [x] **Verified (T-003):** 2026-11-17 — red first: `npx vitest run --project node src/core/setup/gitignore src/core/setup/settingsJson src/core/setup/fileClasses` 80 failed (`Not implemented` stubs); green: 117 passed in `src/core/setup` (gitignore 17, settingsJson incl. 21 not-an-object cases and the round trip that removes the recorded insertions, fileClasses incl. the real 1.10.0 release against empty, CRLF-copy and own-files folders). Combined stage gates (T-002 and T-003): eslint, both `tsc`, `npm run test:unit` 173 files / 2313 tests (+11 timing) passed, `npm run compile` finished.
- **Notes:** A `.gitignore` or `settings.json` that differs but has nothing to add is class `left` (not counted as created, completed or kept in AC-008). `completeGitignore` and `completeSettings` return a result kind (`not-text` / `not-an-object` → class `kept`). `testing/realRelease.ts` loads the real 1.10.0 archive as the realistic release for later steps. No new text (T-003 adds none). Kept-setting key paths read `parent > child`.

### T-004 — Download the latest release

- **Covers:** AC-005 (download part), AC-019, AC-021 (abort), AC-025
- **Do:** Port `ReleaseHttpPort.get(url, {headers, signal}) → {status, headers, body: AsyncIterable<Uint8Array>}`, never following redirects. Core `releaseDownload.ts`: GET `https://github.com/GregorBiswanger/featherspec/releases/latest`, tag from a `Location` ending in `/releases/tag/<tag>`; GET `…/archive/refs/tags/<tag>.tar.gz`; follow at most 5 redirects, https only, hosts `github.com` and `codeload.github.com`; only header `User-Agent: FeatherSpec-Studio/<version>`; 30 s answer and 30 s idle timers on `ClockPort`; 20 MB counted while reading (AC-006 reason); rate limit (429, or 403 with remaining 0) with the reset time from `x-ratelimit-reset` or `retry-after`; abort → `cancelled`. Reasons in `texts.ts`. Adapter `src/adapters/node/fetchReleaseHttp.ts`: global `fetch`, `redirect: 'manual'`, `credentials: 'omit'`, signal passed; tested against a local `node:http` server. `src/core/setup/noNetwork.test.ts`: `node:http`, `node:https`, `node:net`, `node:tls` mocked and `globalThis.fetch` replaced by recorders; discovery and the shell world run through S2, S9 and panel requests → no call; negative control: the download with the real adapter hits the recorder. Import scan: `fetch(` and `http`/`https`/`net` imports only in `fetchReleaseHttp.ts`.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`
- [x] **Verified (T-004):** 2026-11-17 — red first: `npx vitest run --project node src/core/setup/releaseDownload` with the function stubbed to `Not implemented`: 36 failed; with the code: 36 passed. Adapter test `fetchReleaseHttp.test.ts` (local `node:http` server, 7 tests) written with the adapter; mutation check: `redirect: 'follow'` makes its no-redirect test fail, then restored. `noNetwork.test.ts` 4 passed (recorders for net/http/https/http2/tls/dgram/dns and `globalThis.fetch`; S2, S9, setup-pending, project and every shell action send nothing; negative control: the real adapter reaches the fetch recorder; scan: only `adapters/node/fetchReleaseHttp.ts` calls `fetch(` or imports a network module outside the webview bundle). Gates: eslint, both `tsc`, `npm run test:unit` 176 files / 2360 tests (+11 timing) passed, `npm run compile` finished.
- **Notes:** Download texts and constants are in `src/core/setup/setupTexts.ts`. `downloadLatestRelease(deps, signal)` returns `ok | cancelled | too-large | failed(reason)`; the caller maps `too-large` to the archive refusal (AC-006) and `failed` to AC-019's message (`downloadFailedText`). The reset time is shown as `YYYY-MM-DD HH:MM UTC`. The latest page's own redirect target is also held to the hosts of §10. Test helpers: `testing/scriptedHttp.ts`, `testing/setupClock.ts` (ISO `now`). The scan of `noNetwork.test.ts` excludes `src/webview` (separate bundle with its own test probe).

### T-005 — Write the setup into the target

- **Covers:** AC-009, AC-010, AC-014, AC-020 (write order and stop), AC-024
- **Do:** `SetupTargetPort` write part: `createExclusive(root, path, bytes)` (parents created; `exists` result when the path exists; a failed write removes the file it just created), `replaceIfUnchanged(root, path, expected, next)`, `appendIfUnchanged` for `.gitignore`, `clearSetupFolder(root)` (only `.featherspec-setup`). Core `applySetup.ts`: clear `.featherspec-setup/` → parked copies and its `.gitignore` (`*`) → missing files → completions (content re-checked, recomputed on change) → root `AGENTS.md` last; a create that meets an existing path re-classes it (never replaced, parked if it differs); stop at the first failure with path and reason; result lists created, completed, kept, not written, kept setting keys. Adapter `src/adapters/node/nodeSetupTarget.ts` (`fileURLToPath`, `fs.open(…, 'wx')`, links written through per PD-053). Tests: core on `memoryTarget` with injected failures and a racing create; adapter on a temp dir (existing file, dangling link, nested parents); AC-010 example end-to-end on a temp copy (own `AGENTS.md`, `CLAUDE.md` byte-identical); AC-024 scan: no `child_process` and no `workspace.fs` write in `src/core/setup` and the setup adapters.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npm run test:unit && npm run compile`
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — Start a setup: trust, target, confirmation, one at a time

- **Covers:** AC-003, AC-004, AC-005, AC-008, AC-021, AC-022
- **Do:** Core `setupService.ts` with `SetupUiPort` (`pickTarget`, `confirm`, `withProgress(title, task(signal))`, `notify(message, actions)`, `copy(text)`) in `src/core/ports/setupUi.ts`: trust check first (AC-004 text, "Manage Workspace Trust"); eligible folders from the discovery snapshot (BR-01: incomplete, or not a project without `readError`, scheme `file:`); the three "none" messages; quick pick with name, path, verdict; download under "Downloading FeatherSpec…"; archive check; classes; modal with version, folder, path and counts (zero counts and singular forms, §9); a running flag answers "A FeatherSpec setup is already running." Tests on fakes (`testing/setupWorld.ts`: memory target, scripted HTTP, fake clock, UI recorder). `noWrite.test.ts`: the service over the Node target on a temp fixture copy for distrust, dismissed pick, cancel during download, download failure, archive refusal, cancelled confirmation → tree unchanged; negative control: a confirmed setup changes it.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npm run test:unit`
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Finish a setup: messages, merge prompt, Output block, retry, rerun

- **Covers:** AC-016, AC-017, AC-018, AC-020 (message and Retry), AC-023
- **Do:** `mergePrompt.ts` from the files below `.featherspec-setup/` (read through 0001's `ReadOnlyFileSystem`), golden file `src/core/setup/mergePrompt.golden.txt`; `copyMergePrompt` asks for the folder when several are pending. Final messages of AC-017 (both variants, "Copy /sdd-setup" or "Copy merge prompt", no chat); failure messages of AC-006, AC-019, AC-020 with "Retry" (whole run again for the same target, confirmation included), "Open setup guide", "Show output". `outputBlock.ts`: one block per run with a target (version, tag, folder, outcome, path lists, kept setting keys, merge prompt, next step; no content). `discovery.refresh()` after the last write when at least one file was written. Cancel shows nothing (AC-021).
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npm run test:unit`
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Wire the setup into VS Code

- **Covers:** AC-001 (view), AC-002, AC-025 (wiring)
- **Do:** `texts.ts`: `S2_WELCOME` (the S2 line; "Set up FeatherSpec" alone on its line → button; "Open setup guide · Refresh" as two links on one line, via `featherspec-studio.shellAction?["openSetupGuide"]` and `["refresh"]`). `package.json`: command `featherspec-studio.setup` "FeatherSpec Studio: Set Up FeatherSpec"; `featherspec-studio.copyMergePrompt` (hidden from the palette); `viewsWelcome` for `featherspec-studio.navigator` with `when: featherspec-studio.panelState == S2` and the contents of `S2_WELCOME`; activation events and the `untrustedWorkspaces` description unchanged. `src/adapters/vscode/setupUi.ts` (quick pick, modal `showInformationMessage`, cancellable `withProgress` → `AbortController`, notifications, `env.clipboard`). `studioTree.ts` sets the context key from `model.welcome` before refreshing. `extension.ts` composes service, fetch adapter (version from the manifest), Node target, tar reader; registers the command; shell actions call it. `manifest.test.ts`: command, welcome entry equals `S2_WELCOME` with the setup link alone on its line, activation unchanged. Host: `src/test/setup.smoke.test.ts` (command registered) and `src/test/setup/noProject.test.ts` with a `setup-no-marker` configuration in `.vscode-test.mjs` (own copy of `not-fs-speckit`; activates the extension explicitly; tree `welcome` is S2 and the panel's first action is setUp; runs no setup, so nothing is downloaded). `activation-no-marker` stays untouched.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`; host files compile via `npx tsc -p . --outDir out` (run on CI)
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Amend specs 0001 and 0005 (0014 §5)

- **Covers:** — (spec 0014 §5, §19)
- **Do:** Revise mode on `.specs/done/0001-workspace-discovery-project-recognition.md` and `.specs/done/0005-studio-shell-navigation.md`: per §5 row, add an "Amended by 0014 (PD-049, PD-053)" note at the named statement (FR-001.7/§15/BR-06/FR-11/out-of-scope; §4 creating; §10 network; BR-08 *Setup pending* ranking before BR-01…BR-04; §8/§11/AC-013 rerun trigger; §13 S2/S9 actions and texts, AC-027; §11 S7). Status `Implemented` and IDs unchanged; 0001 AC-011 and 0005 AC-025 untouched. `docs/product/product-decisions.md` PD-031: pointer to 0014 BR-07 (PD-053 (7)).
- **Verify:** `grep -n "Amended by 0014" .specs/done/0001-workspace-discovery-project-recognition.md .specs/done/0005-studio-shell-navigation.md` lists a note at every statement §5 names, and `npm run test:unit` stays green; manual: Gregor reads the two diffs — the wording against §5 has no machine check
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — Docs sync and final gates

- **Covers:** AC-001…AC-025 (re-proved by the gates), AC-026 (checklist items)
- **Do:** README: "Set up FeatherSpec" section, the one write and network exception, written-through links (PD-053 (4)); line 5's read-only sentence names the exception. `docs/release-checklist.md`: M-1, M-2, M-3. `CHANGELOG.md` Unreleased entry. `AGENTS.md` snapshot, exactly: modules `src/core/<area>` line += `setup 0014`; `src/adapters` line `node/` += `release download (fetch), tar.gz reader, setup target writer`; boundaries += `'Only the setup (0014) writes into a workspace folder or reaches the network, through SetupTargetPort and ReleaseHttpPort, after the user started it in a trusted workspace'`; `src/test` line += `setup archives in test/fixtures/setup`. `.architecture/core.md` (setup area, three ports) and `.architecture/adapters.md` (node entries). `techContext.md` (0014 test line, `setup-no-marker` host configuration), `systemPatterns.md` (web route without API quota; Node `wx` writer instead of `workspace.fs`; `viewsWelcome` for S2 only; own JSONC scanner and tar reader, no dependency), `activeContext.md`.
- **Verify:** `npx eslint src --max-warnings 0 && npx tsc --noEmit && npx tsc --noEmit -p src/webview && npm run test:unit && npm run compile`; pre-done `npm test` on CI and the Windows machine
- [ ] **Verified (T-010):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-008 | — | — | open |
| AC-002 | T-008 | — | — | open |
| AC-003 | T-006 | — | — | open |
| AC-004 | T-006 | — | — | open |
| AC-005 | T-004, T-006 | — | — | open |
| AC-006 | T-002, T-004 | — | — | open |
| AC-007 | T-002 | — | — | open |
| AC-008 | T-006 | — | — | open |
| AC-009 | T-005 | — | — | open |
| AC-010 | T-005 | — | — | open |
| AC-011 | T-003 | — | — | open |
| AC-012 | T-003 | — | — | open |
| AC-013 | T-003 | — | — | open |
| AC-014 | T-005 | — | — | open |
| AC-015 | T-001 | — | — | open |
| AC-016 | T-007 | — | — | open |
| AC-017 | T-007 | — | — | open |
| AC-018 | T-007 | — | — | open |
| AC-019 | T-004 | — | — | open |
| AC-020 | T-005, T-007 | — | — | open |
| AC-021 | T-004, T-006 | — | — | open |
| AC-022 | T-006 | — | — | open |
| AC-023 | T-007 | — | — | open |
| AC-024 | T-005 | — | — | open |
| AC-025 | T-004, T-008 | — | — | open |
| AC-026 | T-010 | — | manual: Gregor M-1…M-3 | open |

## Session handoff

- **Done so far:** spec revised with PD-053; plan written.
- **Next action:** Gregor reads the plan; on his start signal `/sdd-lifecycle` moves the pair to `active/`, then T-001.
- **Open decisions:** —
- **Baseline:** HEAD 0753a62 (clean tree), moved to active/ 2026-11-17
- **Environment:** `npm test` cannot run in the agent sandbox; GitHub is not reachable from it (live route checked only in M-2).
