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
- Folder identity is the root URI string; `displayPath` is only for text shown to the user (BR-05) ·
  2026-11-16 · plan 0001 T-009
- Runtime store location: one directory per project root under the extension's `globalStorageUri`
  (`featherspec-studio/projects/<sha256(root URI)[0:16]>/`), not the per-workspace `storageUri` — the only
  location all windows share (PD-026, PD-030) · 2026-11-16 · [plan 0004](../.specs/active/0004-runtime-persistence-event-model.plan.md) *Approach*, ADR-002 amendment
- Runtime store reaches the disk only through the `RuntimeMedium` port; one contract suite runs against an
  in-memory and the Node-fs medium (that is AC-001's "unchanged core code") · 2026-11-16 · plan 0004
- Run data is append-only logs per run (`*.run.jsonl`, `*.events.jsonl`), never rewritten; a run is removed only as
  a whole; unknown format versions are left untouched (read-only store) · 2026-11-16 · spec 0004 BR-007, plan 0004 T-005

## Patterns
- Provider independence: each agent provider is an adapter that declares its capabilities;
  provider events are normalised into an internal model (handoff §2.1, §8.3).
- Separate lifecycles: spec lifecycle, agent-run lifecycle and verification status are modelled
  apart (handoff §6.2).
- Honest status: data a provider does not deliver is shown as "not available", never estimated
  (handoff §3 P8).
