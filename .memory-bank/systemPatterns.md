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

## Patterns
- Provider independence: each agent provider is an adapter that declares its capabilities;
  provider events are normalised into an internal model (handoff §2.1, §8.3).
- Separate lifecycles: spec lifecycle, agent-run lifecycle and verification status are modelled
  apart (handoff §6.2).
- Honest status: data a provider does not deliver is shown as "not available", never estimated
  (handoff §3 P8).
