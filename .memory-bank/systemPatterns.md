# System Patterns

## Architectural style

See the `architecture:` snapshot in `AGENTS.md` — the only home of structure facts. This file
holds the *why*: decisions and patterns.

## Key decisions
- Hexagonal architecture: a framework-free core (domain + application, no `vscode` import)
  behind ports; adapters for the VS Code host, storage, file system and agent providers; the
  webview is a separate UI bundle that talks to the host only through typed messages — not yet
  in code · 2026-11-16 · [docs/product/po-handoff.md](../docs/product/po-handoff.md) §8 ·
  provenance: human (sdd-setup)
- Two test gates: fast plain-Node unit tests after every implementation step; extension-host
  tests (`npm test`) only in CI and before done, because they launch a downloaded VS Code and
  cannot run everywhere · 2026-11-16 · provenance: human (sdd-setup)
- Existing FeatherSpec artifacts are the spec source of truth; the Studio must not create a
  parallel spec store or restructure files for board columns · 2026-11-16 ·
  [docs/product/po-handoff.md](../docs/product/po-handoff.md) §3 P2, §6.3
- Activation: `workspaceContains:AGENTS.md` and `workspaceContains:.specs` plus Studio's own commands;
  no `onStartupFinished` (ADR-001 §8 stays). Live re-detection holds once Studio is active · 2026-11-16 ·
  [spec 0001](../.specs/active/0001-workspace-discovery-project-recognition.md) §15 (OP-005, Gregor)
- Unit tests sit next to the code and the Vitest config is `.mjs`, because `tsconfig.json` has
  `rootDir: src` and no `include`; `skipLibCheck` is on because vitest's `index.d.cts` fails
  `tsc` under Node16 · 2026-11-16 · [plan 0001](../.specs/active/0001-workspace-discovery-project-recognition.plan.md) T-001
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
  [plan 0002](../.specs/active/0002-spec-repository-parser.plan.md) *Approach*, T-001
- Spec model conventions: a field is `{ state: 'absent' }` or `{ state: 'empty' | 'placeholder' | 'value'; raw }` (nothing is defaulted); diagnostic
  kinds `unreadable-file · unknown-content · duplicate · orphan · dangling-link · unverified-version`, scope `{ file, line? }` or `'project'`, reasons in
  English; symbolic links are not followed (reported as unreadable); links leaving the project root are dangling and never touched · 2026-11-16 ·
  plan 0002 *Approach*, spec 0002 A-006 (Gregor)
- Live repository: every update re-lists and re-stats the project and re-reads only files named by events, changed in mtime/size or new; the model is
  swapped whole; change notifications name affected references (own file, linked plan or note, gained or lost link) and flag untied changes. Fed by 0001's
  `onDidChangeActiveProject` through `connectActiveProject`; no StatusBar decorator · 2026-11-16 · plan 0002 T-007, T-008
- Folder identity is the root URI string; `displayPath` is only for text shown to the user (BR-05) ·
  2026-11-16 · plan 0001 T-009

## Patterns
- Provider independence: each agent provider is an adapter that declares its capabilities;
  provider events are normalised into an internal model (handoff §2.1, §8.3).
- Separate lifecycles: spec lifecycle, agent-run lifecycle and verification status are modelled
  apart (handoff §6.2).
- Honest status: data a provider does not deliver is shown as "not available", never estimated
  (handoff §3 P8).
