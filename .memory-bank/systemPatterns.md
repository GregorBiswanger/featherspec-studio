# System Patterns

## Architectural style

See the `architecture:` snapshot in `AGENTS.md` — the only home of structure facts. This file
holds the *why*: decisions and patterns.

## Key decisions
- Hexagonal architecture: a framework-free core (domain + application, no `vscode` import)
  behind ports; adapters for the VS Code host, storage, file system; the
  webview is a separate UI bundle that talks to the host only through typed messages (in code since spec 0005) · 2026-11-16 ·
  [docs/product/po-handoff.md](../docs/product/po-handoff.md) §8 · provenance: human (sdd-setup)
- Two test gates: fast plain-Node unit tests after every implementation step; extension-host
  tests (`npm test`) only in CI and before done, because they launch a downloaded VS Code and
  cannot run everywhere · 2026-11-16 · provenance: human (sdd-setup)
- Existing FeatherSpec artifacts are the spec source of truth; the Studio must not create a
  parallel spec store or restructure files for board columns · 2026-11-16 ·
  [docs/product/po-handoff.md](../docs/product/po-handoff.md) §3 P2, §6.3
- Activation: `workspaceContains:AGENTS.md`, `workspaceContains:.specs` and `onWebviewPanel:featherspecStudio.main` (panel restore) plus Studio's own commands and views;
  no `onStartupFinished` (ADR-001 §8 stays). Live re-detection holds once Studio is active · 2026-11-16 ·
  [spec 0001](../.specs/done/0001-workspace-discovery-project-recognition.md) §15 (OP-005, Gregor)
- Unit tests sit next to the code and the Vitest config is `.mjs`, because `tsconfig.json` has
  `rootDir: src` and no `include`; `skipLibCheck` is on because vitest's `index.d.cts` fails
  `tsc` under Node16 · 2026-11-16 · [plan 0001](../.specs/plan-archive/0001-workspace-discovery-project-recognition.2026-11-17.plan.md) T-001
- Core reaches the host through small ports (`src/core/ports/host.ts`); the discovery controller is
  proven on fakes, the VS Code adapters hold no logic; the `vscode` import in `src/core/**` is
  banned by ESLint · 2026-11-16 · plan 0001 *Approach*
- Active-project notification: the discovery controller offers `onDidChangeActiveProject(listener)` (returns a
  `Disposable`); first result always, later only when root, version or legacy differ; no replay for late
  subscribers (they read `snapshot().active`); a throwing subscriber is isolated. Specs 0002 and 0004 consume it;
  no workaround in other modules · 2026-11-16 · spec 0001 AC-023, A-006 (Gregor, after `/sdd-compile`)
- Spec repository gets its own read-only port `SpecSourcePort` (list without following links, stat with mtime, read bytes) beside 0001's
  `ReadOnlyFileSystem`, which decodes without a UTF-8 check and reports neither mtime nor symbolic links; no write method exists, so BR-02
  holds by construction. Text is decoded strictly (UTF-8, BOM stripped) and normalised to LF once, parsers see one shape · 2026-11-16 ·
  [plan 0002](../.specs/plan-archive/0002-spec-repository-parser.2026-11-17.plan.md) *Approach*, T-001
- Spec model conventions: a field is `{ state: 'absent' }` or `{ state: 'empty' | 'placeholder' | 'value'; raw }` (nothing is defaulted); diagnostic
  kinds `unreadable-file · unknown-content · duplicate · orphan · dangling-link · unverified-version`, scope `{ file, line? }` or `'project'`, reasons in
  English; symbolic links are not followed (reported as unreadable); links leaving the project root are dangling and never touched · 2026-11-16 ·
  plan 0002 *Approach*, spec 0002 A-006 (Gregor)
- Live repository: every update re-lists and re-stats the project and re-reads only files named by events, changed in mtime/size or new; the model is
  swapped whole; change notifications name affected references (own file, linked plan or note, gained or lost link) and flag untied changes. Fed by 0001's
  `onDidChangeActiveProject` through `connectActiveProject`; no StatusBar decorator · 2026-11-16 · plan 0002 T-007, T-008
- Folder identity is the root URI string; `displayPath` is only for text shown to the user (BR-05) ·
  2026-11-16 · plan 0001 T-009
- Runtime store location: one directory per project root under the extension's `globalStorageUri`
  (`featherspec-studio/projects/<sha256(root URI)[0:16]>/`), not the per-workspace `storageUri` — the only
  location all windows share (PD-026, PD-030) · 2026-11-16 · [plan 0004](../.specs/plan-archive/0004-runtime-persistence-event-model.2026-11-17.plan.md) *Approach*, ADR-002 amendment
- Runtime store reaches the disk only through the `RuntimeMedium` port; one contract suite runs against an
  in-memory and the Node-fs medium (that is AC-001's "unchanged core code") · 2026-11-16 · plan 0004
- Runs, providers, the orchestrator, the Agent Center and the agent start are gone (PD-055, spec 0015, 2026-11-17): Studio starts no agent and keeps only the spec status history (append-only `spec-status-history.jsonl`, 90-day cap, writer lock, unknown format versions untouched); earlier run data is removed at every activation before the store opens · 2026-11-17 · spec 0015, PD-055

- Lifecycle model is one pure function over 0002's `ProjectRead` (`deriveLifecycle`): no clock, no run input, so equal
  files give equal states (AC-006, AC-010); the status history is a separate recorder behind the 0004 store port ·
  2026-11-16 · plan 0003 Approach
- History baseline: the first derivation per project and opened store whose history can be read compares with the stored
  last state; a read-only or unavailable store only keeps the in-memory state current, so a gap is never recorded later
  (PD-023) · 2026-11-16 · plan 0003 Research (a), T-006
- Flow marker: a state change is *in flow* when a chain of documented steps leads from the old to the new state; Blocked
  may be the old or the new state, never an intermediate one · 2026-11-16 · spec 0003 §6.4, plan 0003 Research

- Studio shell UI memory (area, selection with project root) lives in `context.workspaceState` (`featherspec-studio.shell`, versioned, validated on read), not
  in the webview's `getState`/`setState`: that state dies with the panel and cannot carry reopen or reload · 2026-11-16 · [plan 0005](../.specs/plan-archive/0005-studio-shell-navigation.2026-11-17.plan.md) *Research*
- The host derives every panel state except two: the webview decides S6 (any inbound message of another protocol version, ranks first) and S5's protocol cause
  (no valid snapshot within 5 s of `hello`, an invalid snapshot, or a second mismatch right after a reload) · 2026-11-16 · spec 0005 BR-05, OP-008, plan 0005 *Research*
- All UI texts the shell owns sit in one shared file (`src/shared/protocol/texts.ts`), used by the panel UI and the host tree · 2026-11-16 · plan 0005 *Approach*
- Areas never open each other: they send one navigation request (`navigate`: area plus optional spec or board-filter target) through the host, which
  persists and answers it; the panel UI registers an area in `src/webview/areas/registry.tsx`, otherwise the placeholder shows · 2026-11-16 · spec 0005 BR-07, PD-040
- AC-020 test hook: in `ExtensionMode.Test` only, the HTML carries `data-test`, the host sends a `probe` event with a webview URI of a workspace file and the panel UI
  answers `failed` or `loaded`, never content; in normal mode `probeResult` is an unknown message type · 2026-11-16 · plan 0005 T-008
- Webview tests use `act` from `react` plus `createRoot` in jsdom, without Testing Library; the built `dist/webview/main.js` is loaded in jsdom by
  `src/adapters/node/webviewBundle.test.ts` (it runs `node esbuild.js`), so a broken bundle or a start-up error turns a unit test red · 2026-11-16 · plan 0005 T-002 (Gregor's extra check)
- The shell model source derives the 0003 model from the repository snapshot itself (`deriveLifecycle`, cached per snapshot) instead of reading the lifecycle
  service, which refreshes asynchronously and could pair a project with a model of another snapshot · 2026-11-16 · plan 0005 T-006

- Board filter and sort live in extension memory (`boardUiState`), not in the webview: they survive a panel reload, a second reader gets one truth, and the filter is cleared when the project root changes;
  closing the panel resets all three · 2026-11-16 · plan 0007 *Research*, Gregor
- Board and detail logic live in `src/core/board` (cards, progress, filters, moves and the move result, open-file guard, detail sections, next step, board service; runs removed by 0015, PD-055); the webview only renders the `board`, `detail`, `moveResult` and
  `openFileResult` snapshots, which carry no `seq` (each replaces the last) and are re-sent on `hello` · 2026-11-16 · plan 0007 *Approach*, T-010
- Native HTML5 drag and drop instead of `@dnd-kit/react` (ADR-001 §11 named it as the primary, native as the fallback): no new dependency, the "Move to…" menu and the command stay the mandatory non-drag alternative · **superseded by 0017 (PD-060): no drag, no Move to…, no move command** ·
  2026-11-16 · plan 0007 *Research*, Gregor; amendment in ADR-001 §11
- Drag tests dispatch `MouseEvent`s named `dragstart`, `dragover`, `drop` and `dragend`, because jsdom has no `DragEvent`; the drag handlers must not rely on `dataTransfer` · **superseded by 0017 (PD-060): the board has no drag** · 2026-11-16 · plan 0007 T-008
- Board filter encoding v1 is `{states?, set?: {label, stems}}` in `src/shared/protocol/boardFilter.ts`: AND across kinds, OR within a kind, an unknown stem matches
  nothing; the dashboard (spec 0006) uses this shape for its navigation requests · 2026-11-16 · plan 0007 T-001, Gregor
- Overview (was Mission Control, 0018): the host computes the view as one serialisable `OverviewView` (`src/core/overview`, contract and strict guard in `src/shared/protocol/overview.ts`) and the webview only renders
  it; the `overview` event has no `seq` (like the board) and is re-sent on `hello`; an unknown key anywhere refuses the whole view, so no unvalidated text can reach the DOM · 2026-11-16 · plan 0006 T-002, T-005
- The dashboard service computes only while someone listens (the panel is open): no store read and no subscription otherwise; bursts are coalesced into one more recompute; `updatedAt` is the time the model object last changed ·
  2026-11-16 · plan 0006 T-004, readings p6 and c
- Overview drill-downs reuse the board filter of 0007: a state count sends `{states:[state]}`, "Up next" (+ n more) and "Problems" send a named set of stems; the board shows it as one chip (0018) · 2026-11-16 · spec 0006 BR-08, Gregor (OP-4)
- Area texts sit in one file per area (`src/webview/areas/overview/texts.ts`); the area shows no loading text of its own before its first view (the shell owns S4) · 2026-11-16 · plan 0006 T-005
- Studio colours: the stylesheet uses only `--vscode-*` variables; own `--fs-*` custom properties are allowed as aliases whose every definition is a `var(--vscode-*)` chain (no literal, no spacing tokens); one state-colour mapping via `[data-board-state]` → `--fs-tint`, tint on icon, edge and bar only, text stays foreground · 2026-11-16 · plan 0013 T-001, Gregor
- Inline Markdown of spec files is tokenised by a pure formatter (`src/webview/ui/inlineFormat.ts`) into tokens rendered as React elements; no HTML is ever parsed or injected (`innerHTML` banned under `src/webview`, guarded by a test) · 2026-11-16 · plan 0013 T-007
- Drag feedback marks only the dragged card and the column under the pointer, no valid/invalid verdict before the drop; refusals show after the drop · **superseded by 0017 (PD-060): no drag** · 2026-11-16 · spec 0013 OP-1 (a), Gregor



- Module maps: the `AGENTS.md` snapshot keeps one inventory line per top-level source folder; each area's inside view lives in `.architecture/{core,adapters,webview}.md` (≤ 40 lines each) · 2026-11-17 · release preparation, eviction delegated by Gregor
- Timing tests: every wall-clock budget test lives in a `*.timing.test.{ts,tsx}` file and runs after the rest of `npm run test:unit` in one worker (Vitest projects `timing-node`, `timing-webview`); budgets unchanged · 2026-11-17 · commit 0920dd7
- Setup from the Studio (spec 0014, PD-049, PD-053): the latest release comes through the web routes (`/releases/latest` redirect for the tag, then `archive/refs/tags/<tag>.tar.gz`), not the REST API, so there is no quota or token; files are written by a Node `wx` exclusive create and a temp-file rename, not `workspace.fs`, because only that gives no-overwrite and no-lost-update; the S2 offer is a `viewsWelcome` entry (S2 only, via the context key `featherspec-studio.panelState`); the JSONC scanner and the tar reader are our own, no new dependency; a root `.gitignore` that cannot be completed is class `left` because its parked copy would collide with the folder's own `.gitignore` · 2026-11-17 · plan 0014 T-003…T-008

- Next step (spec 0015, PD-056): `src/core/board/nextStep.ts` derives the FeatherSpec command for a spec by pure rules NS-1…NS-11 from spec and plan facts; Copy hands the line to the clipboard through the `copyText` request and `copyResult` event; Ready → Active starts nothing and answers with the next step (**the drop is superseded by 0017 (PD-060)**: a Ready card's Copy gives the line) · 2026-11-17 · spec 0015, plan 0015 T-001, T-002

## Patterns
- Two dimensions: the spec lifecycle and the verification status are modelled apart (handoff §6.2; the agent-run lifecycle is gone, PD-055).

- 2026-11-18 (spec 0016, PD-063): a diagnostic's tier (`problem` or `note`) is set where it is emitted, never derived later; compatibility findings (what FeatherSpec itself writes) are not emitted. R-6 fails exactly when the entry carries a Problem. Needs of a Backlog spec live in `core/board/needs.ts` (R-2, R-3, R-4), the readiness checks stay in the model. Copy feedback appears at the button (`ui/CopyButton.tsx`), not in a status line. Rule IDs appear only in `title` tooltips; texts come from `src/shared/protocol/texts.ts`.
- 2026-11-18 (spec 0017, PD-060/PD-061): the next step shows on cards, Needs-attention rows, the status bar and the command "Copy Next Step"; the webview derives nothing (core `stepView()` gives short form, line and lines). Discovery reports to a *project line* latch (0001's tests unchanged); `src/core/copyNextStep/` composes the status entry from the latch, the discovery snapshot and the shell view (current spec: selected spec, else most urgent Blocked > Review > Active), and click and command share one behaviour (P-9, feedback 2 s, restarts on a second copy). Copy is a sibling of the row button (P-5), only the tab-stop card's Copy is tabbable (P-11). No move path remains: no drag, menu, command, `judgeTransition` or move messages.
- 2026-11-18 (spec 0019, PD-058): the detail is state, not text: the core builds a `SpecDetailView` picture (header, next step, problems, progress with the next open step and open criteria, files, format notes, status history) and a line for every ID, the webview renders every ID and file as a `FileLink` that posts `openFile {key, line}`; the editor opens it `ViewColumn.Beside` so the Studio stays visible. Selecting a spec (`select`, new `clearSelection`, `PROTOCOL_VERSION` 3) never changes the area; the frame (`App.tsx`) shows `SidePanel` beside Overview and Board while a selection exists (drawer below 900 px, `DRAWER_QUERY` in `src/shared/protocol/layout.ts`), Spec Explorer keeps the pane. Focus is moved only by a user activation (heading), by close (opener, else the spec's first card or row, else the area) and by an update that removes the focused control (heading). `featherspec-studio.selectSpec` is the entry point for the native tree of 0020; collapse per PD-063 (5): Status history folded with memory, Format notes folded on every showing. Fixes after the compile S48 (PD-066): in the drawer state the Board scrolls (a focused card is scrolled clear with `scrollIntoView`, Chromium's focus scrolling ignores `scroll-padding` inside the scrollport) and the Overview takes the width left of the drawer (end padding, two-line rows), because its Copy buttons sit at the row end (SC 2.4.11); list keys are identities, not indexes, so a focused link survives an earlier entry leaving; the opener is remembered per spec and forgotten on close. *Superseded by 0022 (PD-075): the drawer and PD-066 are gone; see the 0022 entry.*
- 2026-11-18 (spec 0020, PD-058): the Activity Bar view is a native tree built from a pure core model (`src/core/shell/specTree.ts`, from the board cards): four groups, row IDs `JSON.stringify(['spec', root, stem(, path)])` and `group:<key>` so VS Code keeps selection and expansion, icon and colour IDs as strings that the adapter maps to `ThemeIcon`, tooltip as untrusted `MarkdownString` with file text escaped. `createSpecTreeService` follows the shell, model source and discovery and notifies only when the model changed; menus pick rows by `contextValue` (`spec [step] [plan]`, `viewItem =~ /regex/`); `createTreeActions` selects (opens the panel if closed, no focus steal), copies and opens files in the active group. The panel has two areas; a remembered `specExplorer` maps to the Overview in `parseUiMemory` (protocol version 4).
- 2026-11-18 (spec 0022, PD-069, PD-073, PD-075): one state table (`src/shared/protocol/stateLook.ts`) gives every surface its icon motif and colour ID; every Problem has one user sentence (`src/core/lifecycle/problemSentence.ts`) and the reason travels beside it as tooltip; the side panel's width is a fraction in its own memory key and a divider sets it; below 900 px the area or the detail shows alone (no drawer; the 0018 and 0019 media-query and drawer clauses are superseded); Overview rows follow their own list width by container queries; at most two primary Copies per view, list Copies are icon buttons; tree rows hold label and description within 32 characters (`src/core/shell/treeLabel.ts`).
- 0018: Activity's open state lives in the host overview service and is reset when the last listener leaves; the Done choice of the Board is the only UI state written to `workspaceState` besides the shell memory (key `featherspec-studio.board`, `{v: 1, done}`, written by a toggle only); a card's date is the plan's `Last updated:` day, else the newer file time as a local day, and is left out while all specs share one day; board column widths are flexbox (200–360 px, strips 32 px) without a media rule; Overview rows wrap to two lines under `@media (max-width: 720px)` (PD-065; superseded by 0022: container queries on the list's own width) · 2026-11-18 · spec 0018, plan P-5, P-10, P-11, P-12
