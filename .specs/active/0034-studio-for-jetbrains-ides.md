# FeatherSpec Studio for JetBrains IDEs

**Status:** In Progress
**Plan:** [0034-studio-for-jetbrains-ides.plan.md](0034-studio-for-jetbrains-ides.plan.md)

Basis: the agreed analysis *FeatherSpec Studio für JetBrains IDEs – Analyse und Schritt-für-Schritt-Plan* (2026-11-20,
owner's project notes, not in the repository) at `3bc615c` (release 0.1.0); Gregor's decisions E1 (monorepo in this
repository, folder `jetbrains/`; specs are referenced, not copied) and the brief of 2026-11-20. Written without an
interview; clarified 2026-11-20 with Gregor's answers (§14). The current behaviour of the product
is defined by 0001–0007, 0013–0033 as amended; 0008–0012 are Deprecated (successor 0015) and count only as n-a.

## 1. Summary

The same product as the VS Code extension — same panel UI, same next steps, same texts, same rules — delivered as an
IntelliJ Platform plugin named **FeatherSpec Studio** (ID `com.gregorbiswanger.featherspec.studio`). The unchanged webview
bundle runs in an embedded browser (JCEF) inside an editor tab; the shared TypeScript core runs in an embedded runtime in the
IDE; the Specs tree, status bar entry, actions, settings and notifications are native. **JetBrains Rider and WebStorm must
fully work**; every other IntelliJ-based IDE is covered by depending only on the platform and JCEF modules. This spec
references the original criteria instead of restating them, and adds only the host mapping, the runtime, the theme bridge,
packaging, a machine-checked parity matrix, a conformance proof against the existing baselines, and guards that keep the
VS Code extension unchanged.

## 2. Goal and problem

Developers who work spec-driven in Rider or WebStorm cannot use the Studio today: it exists only for VS Code. A second
implementation would drift from the first, and copying the 33 specs (about 750 criteria, 0008–0012 included) would double the
context every agent loads and drift as well. Goal: one product on two hosts, whose parity is **verifiable** — every original
criterion is categorised, every shared output is proven identical, and the VS Code extension cannot get worse through
JetBrains work (project rule: quality must never degrade).

## 3. Users and roles

As 0001–0007: the developer, one role, now in a JetBrains IDE. Gregor is the acceptor of the manual checks (AC-040–AC-042).

Terms (OP-020): **IDE project** — the open JetBrains project, with one Studio editor tab; **FeatherSpec project** — a root
discovered as in 0001; an IDE project can hold several, chosen as with 0001's *Select Project*.

## 4. Scope

### In scope

- The host mapping of §6.3: tool window with the native Specs tree, Studio panel as a JCEF editor tab running the
  unchanged webview bundle, status bar entry, actions, settings page, trusted-project behaviour, file watching and
  freshness, Set up FeatherSpec, notifications and the log view.
- The embedded runtime for the shared core (§6.5), decided by a spike as the first plan stage.
- The theme bridge (§6.6): the 59 `--vscode-*` variables and the 3 body classes from the IDE look and feel, Light, Darcula,
  High Contrast and Islands, live switch.
- The fallback when the IDE cannot show an embedded browser (§10, AC-030).
- Send to assistant with Copy prompt as the default (§6.7); an offered handover is spec 0035 (OP-024).
- The parity matrix `docs/jetbrains/parity.md` (§6.2) and the conformance proof (§6.4).
- The host vocabulary (§6.8), and the shared TypeScript changes the host needs: a host-neutral composition, an embedded
  entry bundle, the vocabulary — each under the VS Code protection of §6.9.
- Packaging, Plugin Verifier, README and release checklist sections (§6.10); signing and the separate release line are
  spec 0036 (OP-024).

### Out of scope

- Split mode and remote development (JetBrains Gateway, thin client) — because v0.1 is local only; the plugin would need
  a frontend/backend split with RPC; a later spec.
- IDE versions before 2025.3.1 — because the JCEF module alias exists only from 2025.3.1 (A-004); no second plugin line (OP-016).
- A second product behaviour (a JetBrains-only feature or a rule that differs without a PD entry) — because parity is the
  goal; any deviation is a *deliberately different* row with a PD reference (§6.2).
- Copying or restating the original specs' criteria — because they stay the single truth (E1).
- A ReSharper/.NET backend part for Rider — because the Studio needs no code-model access; frontend actions and tool
  windows suffice in Rider.
- A native Swing re-implementation of the panel — because the same UI is the goal (E3); only what is native in VS Code is
  native here.
- Assistant handovers that send, submit or need undocumented internals — because the Studio never submits (PD-068) and
  shows only honest signals (0016).
- Changing the VS Code extension's behaviour, texts, manifest or release — because §6.9 forbids it.
- A licensed Starter/Driver run of Rider or WebStorm in CI — because v0.1 holds no IDE licence secret; the Plugin
  Verifier and AC-040/AC-041 cover both (OP-023).
- Editing the FeatherSpec wiki — because the wiki follows the release, not this spec; its Hands-On walkthrough gets a
  JetBrains note at release (OP-015).

## 5. Functional flow

1. The developer installs *FeatherSpec Studio* from the JetBrains Marketplace in Rider or WebStorm and opens a FeatherSpec
   project (for example `C:\projects\test\tip-splitter`).
2. The plugin runs discovery (0001); the status bar shows the entry of 0017; the tool window *FeatherSpec Studio* shows the
   Specs tree of 0020, or the welcome and Set up FeatherSpec of 0014/0029 in a folder without FeatherSpec.
3. The developer runs *FeatherSpec Studio: Open* (toolbar, Find Action, tree row): an editor tab shows the Studio panel
   with Overview, Board and Plan map, in the IDE's theme.
4. They select a spec, read its next step, use Copy prompt (or Send where §6.7 allows), paste it into their assistant.
5. The assistant or the developer changes files under `.specs/`, inside or outside the IDE; tree, status entry and panel
   follow within the budgets of §6.5.
6. They switch the IDE theme; the panel follows without reopening.

## 6. Business rules

### 6.1 Parity by reference

Every criterion of the current specs holds in the JetBrains host, read through §6.3 (host elements) and §6.8 (vocabulary),
unless its parity-matrix row says *n-a* or *deliberately different*. This spec restates no original criterion; it cites
`<spec> AC-<n>`. Where an original criterion names a VS Code element (Activity Bar, view, `viewsWelcome`, Command Palette,
`contributes.*`, Output channel, Workspace Trust, `workspaceState`, `globalStorageUri`), the §6.3 row is its JetBrains reading.
The original specs are not amended by this spec.

### 6.2 The parity matrix

`docs/jetbrains/parity.md` holds one row per acceptance criterion of every spec in `.specs/done/` and `.specs/active/` —
the criteria the Studio's own spec repository finds (0002 AC-004), this spec's own excepted — with: spec, AC ID, category, reference, note.

| Category | Meaning | Reference the row must carry |
| --- | --- | --- |
| shared | Decided by shared TypeScript (core, protocol, webview) that runs unchanged in both hosts | the conformance set of §6.4 that covers it, or `shared-test` (an existing Vitest test runs on the same bundle) |
| host | Needs a JetBrains host element | the §6.3 row and the AC of this spec that decides it |
| n-a | Cannot apply: Deprecated spec, withdrawn or void criterion, a VS Code-only mechanism without a counterpart (a host test API, a manifest key) | the reason (successor, withdrawal, mechanism) |
| deliberately different | Applies with a stated difference | the PD entry that records the difference |

The rows are generated from the specs; the categories and references live in one source the generator reads, so a new or
renumbered criterion in any spec appears as an uncategorised row and fails the check (AC-002).

### 6.3 Host mapping

| # | VS Code (original) | JetBrains | Original criteria (examples) |
| --- | --- | --- | --- |
| H-1 | Activity Bar container and view `Specs`, badge | Tool window *FeatherSpec Studio* with a native tree titled *Specs* (OP-012); the badge's count of Review and Blocked in the tool window's title, plus a dot on its stripe icon while the count is at least 1 — deliberately different (OP-007) | 0020 AC-001–AC-006, AC-010, AC-013 |
| H-2 | `viewsWelcome`, tree message | The tree's empty text with the same lines and links | 0014 AC-001, 0020 AC-012, 0029 AC-004 |
| H-3 | View title actions, inline and context menu | Tool window toolbar (Open, Refresh, Open Settings; Copy Next Step for the selected row) and the row's context menu; no inline action exists — deliberately different (OP-008) | 0020 AC-007, AC-008, AC-011, 0024 AC-013, 0025 *Show in Plan Map* |
| H-4 | Webview panel in the editor area | An editor tab *FeatherSpec Studio* showing the webview bundle in JCEF; one tab per IDE project | 0005 AC-001, AC-002, AC-005, AC-009, AC-024 |
| H-5 | `acquireVsCodeApi`, `postMessage`, CSP, `asWebviewUri` | A shim installed before the bundle; same messages, same CSP; resources only from the plugin's webview folder | 0005 AC-016, AC-020, AC-021 |
| H-6 | Status bar item | Status bar widget with the same text, tooltip and accessible text; codicons mapped to IDE icons | 0017 AC-014–AC-019 |
| H-7 | Commands, Command Palette | Actions found by Find Action under the same titles (`FeatherSpec Studio: …`), action IDs `featherspec.studio.*` | 0005 AC-001, AC-005, 0017 AC-009, 0014 AC-002 |
| H-8 | `contributes.configuration`, Settings UI | Settings › Tools › FeatherSpec Studio, application level only (OP-009), same keys, defaults and labels | 0021 AC-016, AC-011, 0024 AC-001 |
| H-9 | Workspace Trust, Restricted Mode | The IDE project's trusted state (untrusted = Safe Mode) | 0001 AC-022, 0005 AC-017, 0014 AC-004, 0017 AC-022 |
| H-10 | Workspace folders (multi-root) | The IDE project's base directory plus every content root outside it (OP-004) | 0001 AC-001–AC-013 |
| H-11 | File system watcher | The plugin's own file watcher on the FeatherSpec roots, IDE virtual-file-system events, and a refresh of the watched paths on frame activation (OP-025) | 0002 AC-012, PD-047, 0029 AC-009 |
| H-12 | `workspaceState`, `globalStorageUri` | Plugin state outside the IDE project's directories; the store per FeatherSpec project root under the IDE's system path (ADR-002 shape), separate from VS Code's (OP-005) | 0004 AC-011, AC-023, AC-026, 0005 AC-009, 0018 Done memory |
| H-13 | Quick pick, notification, modal, progress, `openExternal` | IDE popup, balloon notification of group *FeatherSpec Studio*, modal dialog, background progress with Cancel, the system browser | 0001 AC-008, AC-015, 0014 AC-003, AC-005, AC-008, AC-021, 0017 AC-020 |
| H-14 | Output channel "FeatherSpec Studio" | A log view *FeatherSpec Studio* that "Show output" opens, same lines | 0001 AC-016, 0005 AC-015, 0014 AC-023, 0024 AC-006 |
| H-15 | Open file at line, `ViewColumn.Beside` | Open in the editor at the line; beside the Studio tab in a split where VS Code opens beside | 0019 open beside, 0020 AC-008 |
| H-16 | Clipboard | System clipboard through the IDE | 0017 AC-005, 0014 AC-016 |
| H-17 | Extensions present, activate, change event; chat commands | Plugins present, enabled, change event; handover only per §6.7 | 0024 AC-002, AC-005, AC-010 |
| H-18 | Node `fs`, `fetch`, `zlib` adapters | Host implementations of the same ports; setup HTTP through the IDE's proxy settings | 0014 AC-005, AC-010, AC-019, AC-025 |

S1 (*no folder open*) is n-a: an IDE project always has a base directory, and the welcome screen shows no tool window.

### 6.4 Conformance

The existing oracles are the shared truth: `test/fixtures/**` (the fixture projects), `test/fixtures/next-step-baseline/`,
`test/fixtures/read-baseline/`, `src/core/setup/mergePrompt.golden.txt` with `test/fixtures/setup/featherspec-1.10.0.tar.gz`.
For every fixture project the embedded runtime shall produce the same outputs as Node at the same commit: the read
snapshot, the next-step baseline record, and the views the panel, tree and status entry receive (Board, Overview, Plan map,
every spec's detail, the spec tree, the status entry). A baseline changes only with a named `EXCEPTIONS` entry, as today,
and then for both hosts.

### 6.5 Embedded core runtime

Requirements (R) the runtime must meet (R-4, R-5, R-6 changed 2026-11-21, OP-025):

- R-1 Same outputs: §6.4 holds with the core bundle built from unchanged `src/core` and `src/shared` sources.
- R-2 Budgets: 0002 AC-018 (200 specs read under 2 s, update under 1 s), 0001 AC-018 (discovery under 2 s), 0005 AC-024
  (frame under 1 s), UI freshness 500 ms after the change event reaches the plugin (PD-047).
- R-3 The core's synchronous port calls (`SettingPort.read`, `TrustPort.isTrusted`, `WorkspaceFoldersPort.list` and the
  other non-`Promise` methods of `src/core/ports`) are served without a signature change.
- R-4 The core runs while the Studio tab is closed, so tree and status entry stay live; without JCEF, AC-030 applies.
- R-5 The core starts when the IDE project opens, off the EDT, and is ready within 12 s of the project opening on the CI
  runners (§6.11); until then tab, tree and status entry show their loading state; re-measured on Gregor's machine at
  AC-040/AC-041. The plugin ZIP is at most 60 MB (OP-002).
- R-6 Testable in CI: conformance and budgets inside an IDE started by Starter (Xvfb on Linux); plain JUnit only for pure Kotlin.

Decided at gate G1 (`docs/decisions/ADR-004-jetbrains-host.md`, accepted by Gregor 2026-11-21, OP-025): the core runs in a
hidden off-screen JCEF browser, one per IDE project, sharing the IDE's JCEF with the panel (V2). R-3 holds through copies:
the host pushes settings, trust, folders and memory with the start and with every change event. GraalJS (V1) is rejected:
it failed R-1 inside the plugin class loader and missed R-2 and R-5 on every runner (A-005).

### 6.6 Theme bridge

Before the bundle's first paint and after every IDE look-and-feel change, the host sets on the document every `--vscode-*`
variable `src/webview/main.css` uses (59 at `3bc615c`) from the current IDE theme, and exactly one body class:
`vscode-light` for a light theme (Light, Islands Light), `vscode-dark` for a dark theme (Darcula, Islands Dark),
`vscode-high-contrast` for High Contrast. Fonts come from the IDE's UI and editor fonts; scrollbars follow the IDE. The
mapping table (variable → IDE colour key, with a fallback per variable) is one file in the host, reviewed in the plan.

### 6.7 Send to assistant

Default in JetBrains: the offer is *none* (0024 AC-002), so every step action is Copy prompt with 0021 §6.4's texts. Spike
S-3 tests three handovers — Claude Code (its JetBrains plugin and CLI in the terminal), GitHub Copilot's plugin, JetBrains
AI Assistant — and records per handover: *prefills without sending*, *only with sending*, *not possible*. Only a handover
that puts the prompt into the assistant's input without sending, through a documented or stable entry point, is offered;
then 0024, 0026, 0027 and 0033 apply to it, with the attachment only where the handover attaches files. Every handover,
proven by gate G1 or later, is implemented by spec 0035 (OP-010, OP-024); this spec ships none. While none is offered, the Assistant setting is
hidden and every step action is Copy prompt; once one is, the setting lists only offered assistants.

*Amended by 0035 (PD-108): offers the handovers of 0035 §6.1 — Send to Claude Code, Copy for Copilot and Junie; H-17 reads "handover per 0035 §6.1"; the setting row of 0035 §6.5 replaces "hidden".*

### 6.8 Host vocabulary

No JetBrains surface shall show a VS Code-only term. Known at `3bc615c`: `Restricted Mode`, `Manage Workspace Trust`,
`trusted workspace`, `This workspace …` (`src/shared/protocol/texts.ts`, `src/core/setup/setupTexts.ts`), `Another VS Code
window holds the write lock …` (`src/core/runtime/notices.ts`), the extension IDs in the assistant causes
(`src/shared/protocol/assistantTexts.ts`). JetBrains terms (OP-006): `This project is not trusted.` for `This workspace is in
Restricted Mode.`, `Trust Project` for `Manage Workspace Trust`, `trusted project` for `trusted workspace`, `Another IDE window
holds the write lock …`, plugin IDs in the causes; `Safe Mode` for the S7 label `Restricted Mode` and "this project" for
"this workspace" (OP-019). They come through one host vocabulary that the host passes
in; the VS Code values stay byte-identical; the webview bundle changes once for it (a shared change, §6.9). Each such term
is a *deliberately different* row.

### 6.9 Protection of the VS Code extension

- `.vscodeignore` is a denylist: `jetbrains/**`, `dist/embedded/**` and every new top-level output stay out of the `.vsix`.
- A **JetBrains-only change** (only `jetbrains/**`, `docs/jetbrains/**`, JetBrains CI files) leaves `dist/extension.js`,
  `dist/webview/main.js`, `dist/webview/main.css` byte-identical and the `.vsix` file list identical.
- A **shared change** (host-neutral composition, embedded entry, host vocabulary) leaves VS Code's observable behaviour
  identical: every test at the start commit passes, baselines and golden file unchanged, every VS Code text unchanged.
- `ci.yml` and `publish.yml` keep their jobs; JetBrains gets its own jobs and its own release workflow.

### 6.10 Target, packaging and release

- since-build: the build of IntelliJ Platform 2025.3.1; no until-build; depends only on `com.intellij.modules.platform` and
  `com.intellij.modules.jcef`. Local IDE only.
- Marketplace name *FeatherSpec Studio*, plugin ID `com.gregorbiswanger.featherspec.studio`, vendor Gregor Biswanger.
- ZIP (signed in spec 0036, OP-024); Plugin Verifier over Rider, WebStorm, IntelliJ IDEA and PyCharm at the since-build release and the latest
  stable release of each, plus the verifier's recommended set (OP-021); plugin structure verified.
- Own release line from 0.1.0: tag `jetbrains-v<version>` (first `jetbrains-v0.1.0`), own workflow started by hand with
  `confirm=publish`; the VS Code line is never triggered by it. Gregor sets up the Marketplace vendor, the signing
  certificate and the CI secrets and makes the first upload by hand (OP-014). This bullet is implemented by spec 0036
  (OP-024).
- Release docs: a JetBrains section in `docs/release-checklist.md` (this spec); the wiki note at release (OP-015).

### 6.11 Where builds and tests run

Gregor installs no Java, Gradle or other toolchain. Every Gradle build, Kotlin compile, plain JUnit test (pure Kotlin only),
the conformance and budget tests (inside an IDE started by Starter, OP-025), the Plugin Verifier and the Starter/Driver IDE
tests run only in GitHub Actions (Ubuntu, Windows and macOS runners). The agent
cannot run Gradle in its sandbox (A-001): it pushes the branch (a git write, asked first per `AGENTS.md`) and reads the CI
results. TypeScript work — shared core, bridge, the Node side of the conformance oracle — the agent verifies locally with
the existing npm gates (`.memory-bank/techContext.md`). Gregor installs intermediate plugin ZIPs from the CI artifact by
hand in Rider and WebStorm (*Install Plugin from Disk*).

### 6.12 Spikes and gates

Spikes, the first stage; results in ADR-004 (AC-009):

- S-1 Core runtime: GraalJS (V1) against a hidden JCEF browser (V2), R-1–R-6 measured on the CI runners — byte-identical
  JSON on the read and next-step baselines, no classloader errors.
- S-2 Webview in JCEF: the unchanged `dist/webview` bundle through a resource handler with the CSP, the `acquireVsCodeApi`
  shim, a hello → snapshot round trip, the theme variable block in Light, Darcula and High Contrast with screenshots.
- S-3 Assistant handover: the three handovers of §6.7 with their result.
- S-4 External file changes: time from an external write in `.specs/` to the IDE's file event, IDE focused and not, on the
  Windows, macOS and Linux CI runners.

Gates, each passed only when all its items hold; the plan orders the stages (OP-018):

- G1 after the spikes: S-1 passes with V1 or V2, S-2 shows the UI in the three themes, S-3 and S-4 recorded; Gregor decides
  runtime and handovers in ADR-004 (passed 2026-11-21: V2, OP-025).
- G2 repository guards: VS Code CI unchanged and green, the `.vsix` file-list snapshot identical (AC-037), the JetBrains CI
  job green with an empty plugin.
- G3 shared TypeScript changes, before host work builds on them: AC-039 with `npm test` in CI on Ubuntu and Windows,
  baselines identical, an independent `/sdd-compile` READY.
- G4 end: every stage `/sdd-compile` READY; every parity-matrix row covered or *deliberately different*.

## 7. UI/UX requirements (native feel)

- Tab enters the Studio tab's content and leaves it to the IDE; the IDE's shortcuts (Find Action, Search Everywhere,
  switching tabs) work while focus is in the panel.
- Escape inside the panel keeps 0019's and 0024's rules (close popup, side panel); with nothing to close, focus returns to
  the last editor (OP-011).
- No flash of another theme's colours on open or theme switch; no repaint stall (known JCEF issue 2025.1/2025.2).
- The tree, status entry and settings page use IDE components only, so the IDE's keys, search and screen reader apply.

## 8. Security, permissions and privacy

As the originals: no write except Set up FeatherSpec (0005 AC-025, 0014 AC-024), no network except the setup after a start
in a trusted project (0014 AC-025), no prompt text in the log (0024 AC-006). In addition: the embedded browser loads only
the plugin's webview files and nothing from the internet (0005 AC-020); the plugin stores its state outside the IDE project's
directories (H-12), so `.idea/` receives nothing from it; signing keys come from CI secrets only.

## 9. Non-functional requirements

Budgets of R-2 and the core-ready budget of R-5 on the CI runners of §6.11; external change visibility of AC-021; the plugin ZIP limit of R-5.

## 10. Error cases and edge cases

- JCEF is not supported, or the OS sandbox suspends it (AppArmor on Ubuntu 24.04+): AC-030.
- The embedded runtime fails to start or throws: the tab shows S5 with its reason and *Show output* (0005 AC-015); tree and
  status entry show the failure state; no IDE-internal error balloon.
- A file changed by a CLI agent while the IDE is not focused: AC-021 (refresh on frame activation).
- Two IDE projects open on the same root, or VS Code and a JetBrains IDE on the same root: writer and reader as 0004
  AC-011/AC-023 within JetBrains; the stores of the two products are separate (OP-005).
- The IDE project becomes trusted while the tab is open: AC-019.
- A theme without a key the mapping needs: the variable takes its fallback; nothing stays unset (AC-026).
- Rider opened on a solution file: the base directory of H-10 is the solution's folder (OP-004).

## 11. Acceptance criteria

Unless marked *manual*, a test decides each criterion: Vitest for TypeScript, JUnit 5 and the IDE integration test framework
(Starter/Driver) for the plugin, a CI job for builds and guards; everything on the JVM runs in CI only (§6.11). IDE matrix
(OP-013, OP-023): Starter/Driver smoke tests in IntelliJ IDEA's free tier; every IDE through the Plugin Verifier; Rider and
WebStorm by hand in AC-040 and AC-041.

**Parity and conformance**

- **AC-001** The repository shall contain `docs/jetbrains/parity.md` with exactly one row per acceptance criterion that the
  Studio's spec repository (0002 AC-004) finds in `.specs/done/` and `.specs/active/`, 0034 excepted, each with spec, AC ID, one of the four
  categories of §6.2 and the reference §6.2 requires for that category.
- **AC-002** If a criterion is missing from the matrix, appears twice, has no category or an unknown one, lacks its required
  reference, or a row names a criterion no spec defines, then the parity check shall fail and name the row; a negative
  control per failure kind shall prove it. Generating the matrix twice from unchanged specs shall give byte-identical files.
- **AC-003** Every criterion of 0008–0012 and every withdrawn or void criterion shall be *n-a* with its successor or
  withdrawal named; every *deliberately different* row shall name a PD entry that exists in
  `docs/product/product-decisions.md`.
- **AC-004** For every fixture folder under `test/fixtures/` (the baseline and setup folders aside) the embedded runtime shall produce, from the same files, the
  read snapshot, the next-step baseline record and the Board, Overview, Plan map, detail, spec tree and status entry views
  deep-equal to the Node run of the same commit; the read and next-step baselines shall match as they do in Node, with the
  same `EXCEPTIONS` and no other.
- **AC-005** For `test/fixtures/setup/featherspec-1.10.0.tar.gz` the JetBrains host shall produce the merge prompt
  byte-identical to `src/core/setup/mergePrompt.golden.txt`, and the same file classes and writes as 0014 AC-009–AC-014 on a
  temporary target.
- **AC-006** The core bundle the plugin runs shall be built from `src/core` and `src/shared` with no JetBrains-specific
  branch and no changed port signature; a scan shall find no host check in `src/core` and the port signatures equal to the
  start commit's.
- **AC-007** In the embedded runtime the budgets of R-2 and R-5 shall hold: the core ready within 12 s of the IDE project
  opening, the 0002 AC-018 fixture read under 2 s and updated under 1 s, discovery of up to 5 roots under 2 s, the Studio
  frame shown within 1 s of *Open* once the core is ready and, before that, the loading state within 1 s of *Open*, and
  tree, status entry and panel showing a model change within 500 ms after the change event reaches the plugin; measured
  on the Windows, macOS and Linux CI runners (§6.11). (Changed 2026-11-21, OP-025: core-ready budget and loading state.)
- **AC-008** While the Studio tab is closed, tree and status entry shall follow a model change as 0020 AC-013 and 0017
  AC-018 state.
- **AC-009** `docs/decisions/ADR-004-jetbrains-host.md` shall record the measured R-1–R-6 values of spike S-1 per candidate
  run, the S-2 screenshots, the result table of spike S-3 and the delays of spike S-4, and Gregor's decision; the plan shall start no stage after
  the spikes before that decision stands in the ADR.

**Host mapping**

- **AC-010** While a FeatherSpec project is active, the tool window shall show the Specs tree whose groups, rows, order, labels,
  descriptions, icons, colours, tooltips and count equal the spec tree view of AC-004 for that fixture (0020 AC-001–AC-006,
  AC-010 through H-1).
- **AC-011** The tree's toolbar shall offer Open, Refresh and Open Settings in this order plus Copy Next Step for the selected
  spec row (OP-008), and a spec row's context menu
  `Open Spec`, `Open Plan` (only with a plan), `Show in Plan Map` (only where 0025 offers it) and `Copy Next Step` (only with a
  step), each behaving as 0020 AC-007–AC-009 and 0025 state; activating a row shall select the spec without moving focus.
- **AC-012** Per condition of 0020 §4.4 the tree's empty text shall show the lines and actions that 0020 AC-012, 0014 AC-001
  and 0029 AC-004 name, with the same texts.
- **AC-013** When the developer runs *FeatherSpec Studio: Open*, the IDE shall show one editor tab per IDE project with the
  Studio panel; a second *Open* shall focus that tab; closing and reopening shall restore area and selection (0005 AC-001,
  AC-002, AC-009); *Open Overview*, *Open Board*, *Open Plan Map* shall behave as 0005 AC-005 and 0023.
- **AC-014** The tab shall run `dist/webview/main.js` and `main.css` byte-identical to the files in the `.vsix` of the same
  commit; the message sequence of a session (hello, snapshots, requests) recorded on a fixture shall equal the VS Code host's
  for the same steps; unknown and other-version messages shall behave as 0005 AC-016 and AC-021, *Reload* reloading only the
  tab.
- **AC-015** If the panel requests a file outside the plugin's webview files or any internet address, then the embedded
  browser shall deliver nothing (0005 AC-020); the document shall carry the same Content-Security-Policy as the VS Code
  panel.
- **AC-016** While a FeatherSpec project is active, the status bar widget shall show the text, tooltip lines and accessible text of 0017
  AC-014–AC-018 for the same model, with the codicons replaced by IDE icons, and a click shall run Copy Next Step with
  0017 AC-016's 2000 ms feedback; while no FeatherSpec project is reported it shall be hidden (0001 AC-020).
- **AC-017** Find Action shall list one action per command of the VS Code manifest (except the internal `shellAction` and
  `selectSpec`) under the same title; each shall behave as the original criterion of that command.
- **AC-018** Settings › Tools › FeatherSpec Studio shall show Show Step Tips and Model Hints, and Assistant only while §6.7
  offers a handover, with the defaults, labels and descriptions of 0021 AC-016 and 0024 AC-001; a change shall reach the
  panel within 500 ms (0021 AC-011); Open Settings shall open this page; the values shall apply to every IDE project.
  *Amended by 0035 (PD-108): the Assistant row shows with the offered handovers of 0035 §6.1 (0035 §6.5, AC-001).*
- **AC-019** While the IDE project is not trusted, discovery, tree, status entry, Copy and the settings shall work as in a
  trusted one (0001 AC-022, 0017 AC-022, 0020 AC-014, 0021 AC-018); Set up FeatherSpec shall send nothing and write nothing
  (0014 AC-004); the panel shall show the S7 note in the vocabulary of §6.8, and when the IDE project becomes trusted the note
  shall disappear without reopening the tab (0005 AC-017).
- **AC-020** When the developer or the IDE creates, changes, renames or deletes a spec, plan, return note, `AGENTS.md` or
  `.memory-bank/projectbrief.md` inside the IDE, tree, status entry and panel shall show the change within the budget of AC-007.
- **AC-021** When an external process writes such a file, the change shall show on screen within 2 s of the write (OP-003),
  with the IDE focused and with another application focused, on Windows, macOS and Linux; the plugin shall watch the
  FeatherSpec roots with its own file watcher in addition to the IDE's file events, and whenever the IDE window is
  activated, it shall refresh `.specs/`. (Changed 2026-11-21, OP-025: own watcher.)
- **AC-022** Set up FeatherSpec shall behave as 0014 AC-001–AC-025 with H-13 and H-18: the same targets, dialog, files, merge
  prompt, messages and log block; a write shall fail rather than replace an existing path (0014 AC-010); requests shall use
  the IDE's proxy settings and carry no credentials, cookies or workspace path (0014 AC-025).
- **AC-023** Every notification, popup and progress of the core shall appear as the H-13 element with the original's texts,
  actions and order; *Show output* shall open the log view with the lines the VS Code Output channel receives for the same
  run, and no prompt text.
- **AC-024** Opening a file from the panel shall open it at its line in an editor split beside the Studio tab, and from the
  tree in the active editor (0019, 0020 AC-008); Copy shall put exactly the original's text on the system clipboard.
- **AC-025** After opening, navigating and closing the Studio tab, Copy, settings changes and a status history write, no file
  in the IDE project's directories (H-10) shall have been created or changed by the plugin (0005 AC-025, 0017 AC-023); the status history
  store shall lie under the IDE's system path per FeatherSpec project root, with 0004's writer and reader rules among the
  open IDE projects.

**Theme**

- **AC-026** Before the first paint, the document shall define every `--vscode-*` variable used in `src/webview/main.css`,
  each with a non-empty value; a test shall derive the list from the stylesheet and fail when the mapping lacks one.
- **AC-027** The document shall carry exactly one of `vscode-light`, `vscode-dark`, `vscode-high-contrast`, by the theme
  kinds of §6.6, for Light, Darcula, High Contrast, Islands Light and Islands Dark.
- **AC-028** When the developer switches the IDE theme, the open panel shall show the new theme's values and body class
  within 500 ms, without reopening and without a frame in which old and new colours mix (0005 AC-019).
- **AC-029** For each of the five themes of AC-027, every pair of the mapping's contrast table — at least panel text,
  secondary text, link and button text on their backgrounds, and the focus outline — shall have a contrast ratio of at least
  4.5:1 for text and 3:1 for the focus outline, computed from the mapped values.

**Fallback, send, packaging**

- **AC-030** If the IDE cannot run the embedded browser — JCEF not supported, or suspended by the operating system's sandbox —
  then the Specs tool window shall show, instead of the tree, a notice that names the reason and offers *Open help*; the
  status entry shall show unavailable; *Open*, Copy Next Step and Set up FeatherSpec shall show a notification with the
  same reason and *Open help*; the settings page shall keep working; and the IDE shall report no plugin error. (Changed
  2026-11-21, OP-025: the core runs in JCEF, so tree, status entry, Copy Next Step and Set up no longer work without it.)
- **AC-031** While no handover of §6.7 is proven, every step action in the panel shall be Copy prompt, the settings page
  shall not show the Assistant setting, and no text shall name Send.
  *Amended by 0035 (PD-108): the step actions hold while *Assistant* is `none`; the page shows the row of 0035 AC-001 and a chosen value the handovers of 0035 §6.1 (0035 AC-004).*
- ~~**AC-032** Where a handover is offered, its Send shall put the prompt into that assistant's input and never submit it;
  every failed check, call or 5 s timeout shall fall back to Copy prompt with one warning and one log line without the
  prompt (0024 AC-005, AC-006, PD-068), and attach only as §6.7 allows.~~ — moved to spec 0035 on 2026-11-20 (OP-024).
- **AC-033** `plugin.xml` shall carry the ID, name and vendor of §6.10, since-build of 2025.3.1, no until-build, and depend on
  exactly `com.intellij.modules.platform` and `com.intellij.modules.jcef`.
  *Amended by 0035 (PD-108): plus the optional dependency `org.jetbrains.plugins.terminal` (0035 §6.3, AC-024).*
- **AC-034** The Plugin Verifier shall report no compatibility problem for Rider, WebStorm, IntelliJ IDEA and PyCharm at
  since-build and at the latest stable release, nor for its recommended set; the structure check shall report no error.
- **AC-035** The plugin ZIP shall be at most 60 MB; no key or token shall be in the repository. (Changed 2026-11-20,
  OP-024: "signed and pass signature verification" moved to spec 0036.)
- ~~**AC-036** The JetBrains release workflow shall run only when started by hand with `confirm=publish`, tag
  `jetbrains-v<version>`, and neither run nor change `publish.yml`.~~ — moved to spec 0036 on 2026-11-20 (OP-024).

**Protection of the VS Code extension**

- **AC-037** `.vscodeignore` shall exclude `jetbrains/**` and `dist/embedded/**`; a test shall compare the `.vsix` file list
  with a committed snapshot (11 files at `3bc615c`) and fail on any added or missing file, with a negative control.
- **AC-038** For a change that touches only JetBrains paths (§6.9), CI shall prove `dist/extension.js`, `dist/webview/main.js`,
  `dist/webview/main.css` byte-identical and the `.vsix` file list identical to the base commit's.
- **AC-039** For a shared change, every test at the commit on which this spec's implementation starts shall exist at the head
  and pass, the read and next-step baselines and the golden file shall be unchanged with no new `EXCEPTIONS`, every rendered
  VS Code text of every fixture shall be deep-equal, and `npm run test:unit` and `npm test` shall pass on Windows and in CI;
  `ci.yml`'s existing jobs shall be unchanged.

**Manual (Gregor)**

- **AC-040** *(manual, Gregor, JetBrains Rider, plugin ZIP from the CI artifact via Install Plugin from Disk)* On a fresh
  `C:\projects\test\tip-splitter`, the Hands-On walkthrough from Set
  up FeatherSpec through the first implemented step in Rider, compared view by view with VS Code at the same commit, in Light,
  a dark theme (Darcula or Islands Dark) and High Contrast, including a live theme switch; he records Rider's version. The
  check fails on any difference to VS Code that is no parity-matrix row categorised *deliberately different* or *n-a*;
  Gregor accepts a new difference only by adding such a row with its reason, and the check then runs again (OP-022).
- **AC-041** *(manual, Gregor, WebStorm)* The same walkthrough, comparison and pass rule as AC-040 in WebStorm, version
  recorded.
- **AC-042** *(manual, Gregor or his delegate)* In Rider and WebStorm: keyboard only (§7: into and out of the tab, Find
  Action, Escape), a screen reader reading tree rows, status entry and panel labels as 0005 AC-023, and the JCEF fallback of
  AC-030 on an IDE started without JCEF. `docs/release-checklist.md` shall carry a *JetBrains (manual)* section listing
  AC-040–AC-042.
- **AC-043** `README.md` shall carry a JetBrains section (install, supported IDEs, Copy prompt default, local only);
  `.architecture/jetbrains.md` (at most 40 lines) and the `AGENTS.md` snapshot shall name `jetbrains/` and the embedded entry.

## 12. Technical notes for developers or AI agents

As-is at `3bc615c` (digest, from the code):

- `src/core` imports no `vscode` and no Node module but `path.posix` (`board/openFile.ts`, `specs/readProject.ts`,
  `lifecycle/verification.ts`); timers only through `ClockPort`. Web APIs used: strict `TextDecoder` (`fatal: true`),
  `TextEncoder`, `URL`, `queueMicrotask`, `performance.now` — Chromium in JCEF provides all of them, so the embedded bundle
  needs no polyfills (V2, OP-025).
- 14 port files in `src/core/ports`; non-`Promise` methods include `SettingPort.read`, `TrustPort.isTrusted`,
  `WorkspaceFoldersPort.list`, `ClockPort.now`, `AssistantHostPort.extension` and `fileUri` (returns a VS Code `Uri` for
  Copilot's attach; n-a until a handover attaches).
- Composition lives in `src/extension.ts` (404 lines); a host-neutral composition (`src/hosts/…`, ports passed in) is the
  shared change of §6.9; esbuild gets a third target `dist/embedded/…` (`esbuild.js` has two today).
- Webview: the only host handle is `src/webview/vscodeApi.ts`; CSP built in `src/adapters/vscode/webviewHtml.ts`; 59
  `--vscode-*` variables and 3 body classes in `main.css`; no `getState`/`setState`.
- VS Code terms compiled into the bundle: `RestrictedNote.tsx` renders `RESTRICTED_TEXT`, `ACTION_LABELS.manageTrust`,
  `STATE_LABELS.S7` — §6.8 needs them from the host, which changes the webview bundle once (a shared change, AC-039).
- UI memory today is `workspaceState` (outside the folder); a project-level IDE state would write `.idea/workspace.xml` and
  break AC-025 — use application-level or system-path storage keyed by FeatherSpec project root.
- Setup writes with Node `wx` (create fails if the path exists) and temp-file rename; the host needs the same semantics
  (`CREATE_NEW`), not a VFS write that replaces.
- `.vscodeignore` excludes `src/**`, `docs/**`, `test/**` but not `jetbrains/` or `dist/embedded/`.
- Oracles: 26 fixture folders besides `next-step-baseline/` (47 files), `read-baseline/` (9) and `setup/`; `mergePrompt.golden.txt`; the 1.10.0 archive.
- Build (CI only, §6.11): Gradle with IntelliJ Platform Gradle Plugin 2.x, Kotlin, JUnit 5; JCEF: `JBCefApp.isSupported()`, `JBCefJSQuery`,
  a `CefRequestHandler` for plugin resources, `JBCefScrollbarsHelper`; theme change via `LafManagerListener`.
- Context hygiene: `jetbrains/AGENTS.md` and `jetbrains/CLAUDE.md` load only below `jetbrains/`; a
  `.github/instructions/jetbrains.instructions.md` with `applyTo: jetbrains/**`; one inventory line in the snapshot.
- Stages (gates of §6.12): spikes (G1) → guards and parity matrix (G2) → shared changes (G3) → host (runtime, tab and
  theme, tree and status, settings and trust, setup, watching) → packaging and release (G4).

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The agent sandbox cannot reach Maven Central, the Gradle plugin portal or JetBrains repositories | `npm test` already cannot download VS Code there (techContext); the same proxy policy applies; Gregor's decision of §6.11 rests on it (2026-11-20) | the agent could build locally; §6.11 still holds for Gregor |
| A-002 | Frontend-only plugins work in Rider; the Studio needs no ReSharper part | JetBrains docs: tool windows and actions run in Rider's frontend | Rider needs a backend module (AC-040) |
| A-003 | The webview bundle needs no change for JCEF beyond §6.8 | it reaches the host only through `vscodeApi.ts` and uses only CSS variables and body classes | AC-014's byte-identity fails; the shim grows |
| A-004 | `com.intellij.modules.jcef` exists from 2025.3.1 | the IntelliJ Platform JCEF page, November 2026 | since-build moves; AC-033 |
| A-005 | ~~GraalJS meets R-1–R-6~~ Disproven by S-1 (ADR-004, OP-025): it fails R-1 inside the plugin class loader and misses R-2 and R-5 | same bundle, Java interop for sync ports; IntelliJ's HTTP Client embeds GraalJS | it broke: the core runs in a hidden JCEF browser (§6.5), R-3 through host-pushed copies, R-4 without JCEF per AC-030 |
| A-006 | No documented API opens a JetBrains assistant chat with a prefilled prompt | research for the analysis found none for Copilot, Claude Code or AI Assistant | §6.7 may offer Send sooner; AC-031 changes |
| A-007 | Settings are application-level, like VS Code user settings | the three settings are personal preferences (0021, 0024); confirmed by Gregor (OP-009) | a project override is needed (OP-009) |
| A-008 | 60 MB is an acceptable ZIP limit | the analysis' target, confirmed by Gregor (OP-002); the V2 runtime adds no JARs (ADR-004) | AC-035 |
| A-009 | The 0.1.0 VS Code release stays the reference behaviour while this spec is built | released 2026-11-20 at `3bc615c` | parity rows shift; the matrix check catches it |

## 14. Open points

None open. Each decision below stands where its ID is cited.

- OP-001–OP-016 resolved by Gregor 2026-11-20, every recommendation accepted: one spec in gated stages, split per §15
  (OP-001); R-5 (OP-002); AC-021 (OP-003); H-10 (OP-004); H-12, §10 (OP-005); §6.8 terms and the one-time bundle change
  (OP-006); H-1 badge and names (OP-007, OP-012); H-3, AC-011 (OP-008); H-8 (OP-009); §6.7 (OP-010); §7 (OP-011); §11
  matrix (OP-013); §6.10 release line and docs (OP-014, OP-015); §4 older IDEs (OP-016).
- OP-017 `/sdd-clarify` 2026-11-20 (delegated stranger pass): 14 findings, 1 blocking; 8 resolved by OP-001–OP-016 and
  Gregor's decision that builds and tests run in CI only (§6.11, A-001, AC-007, AC-040, §9, §12); 6 settled as OP-018–OP-023.
- OP-018 Spikes S-1–S-4 and gates G1–G4 were named but undefined — resolved from the agreed analysis (§5): §6.12.
- OP-019 S7 label `Safe Mode`; "this project" for "this workspace"; VS Code texts unchanged (§6.8) (confirmed by Gregor 2026-11-20).
- OP-020 *IDE project* and *FeatherSpec project* (§3), used throughout (confirmed by Gregor 2026-11-20).
- OP-021 Verifier at since-build and the latest stable release of each IDE; AC-034's wording wins (§6.10) (confirmed by Gregor 2026-11-20).
- OP-022 AC-040/AC-041's pass rule: a difference needs a *deliberately different* or *n-a* row, then a re-run (confirmed by Gregor 2026-11-20).
- OP-023 No IDE licence secret in v0.1; Starter/Driver smoke in IntelliJ IDEA's free tier (§4, §11) (confirmed by Gregor 2026-11-20).
- OP-024 `/sdd-plan` 2026-11-20 applied OP-001's split: the plan exceeded about 30 steps, so the Send handover (AC-032, the
  offer side of §6.7) moves to **0035 — Send to assistant in JetBrains IDEs**, and signing, the release workflow, the
  listing and the first upload (AC-035's signing part, AC-036, §6.10's release-line bullet) move to **0036 — JetBrains
  Marketplace release**; both are to be specified with `/sdd-specify`. S-3 is still measured here and recorded in ADR-004.
  The plan still has 37 small steps; a further split at gate G3 is offered to Gregor in the plan (confirmed by Gregor
  2026-11-20).
  *Amended by 0035 (PD-108): the Send handover is built there as Send to Claude Code and Copy for Copilot and Junie.*
- OP-025 G1 decision, Gregor 2026-11-21: ADR-004 accepted with all four recommendations — runtime V2 (hidden off-screen
  JCEF browser per IDE project; GraalJS rejected); R-5 replaced by "core ready within 12 s of project open on the CI
  runners, loading state until then, re-measured at AC-040/AC-041"; without JCEF (not supported, or suspended by the OS
  sandbox) only the settings page works and the tool window shows a notice; Send stays Copy prompt only, the Claude Code
  deep link `claude-cli://open?q=` is the candidate for 0035. Applied as ADR-004 proposes: H-11, R-4, R-5, R-6, §6.5's
  closing paragraph, A-005 (and A-008's reason), §12, AC-007, AC-021, AC-030, §6.11, §9, §10; no AC ID changed.

## 15. Definition of Ready, Done and next steps

Ready: clarified 2026-11-20 (OP-017–OP-023); no open point; OP-019–OP-024 confirmed by Gregor 2026-11-20. Done
per the DoD of `AGENTS.md`: AC-001–AC-031, AC-033–AC-035, AC-037–AC-039 and AC-043 proven (AC-032 and AC-036 moved,
OP-024), AC-040–AC-042 checked by Gregor, the parity matrix fully categorised, VS Code CI and `.vsix` unchanged. Next:
Gregor reads the plan [0034-studio-for-jetbrains-ides.plan.md](0034-studio-for-jetbrains-ides.plan.md) (41 steps
after the G1 re-plan of 2026-11-21, spikes first, split per OP-024); then `/sdd-lifecycle` to `active/`. Follow-up specs: 0035 *Send to assistant in
JetBrains IDEs*, 0036 *JetBrains Marketplace release*.
