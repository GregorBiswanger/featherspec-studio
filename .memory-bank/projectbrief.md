# Project Brief

## Mission
FeatherSpec Studio is a VS Code Desktop extension: a visual command center for spec-driven
development with FeatherSpec — see every spec, control every agent. It makes the
spec-to-code process visible and steerable (specs, plans, agent runs, file changes, tests,
verification) on top of the existing FeatherSpec artifacts, which stay the source of truth.
Product concept, MVP scope and backlog: [docs/product/po-handoff.md](../docs/product/po-handoff.md).

## Primary users
- Primary: developers working spec-driven with coding agents (GitHub Copilot, Claude Code,
  Codex); software architects; tech leads steering agent-assisted work.
- Secondary: product owners, engineering managers, AI engineers, teams using several agent
  providers.

## Success criteria
The MVP succeeds when the end-to-end scenario of handoff §21 works: open an existing
FeatherSpec project → specs recognised and read → Mission Control shows the state → the board
shows specs in the correct columns → a ready spec dragged to Active passes the readiness
check → a configured agent starts with the spec and approved context → status, events, errors
and approval requests appear live → the run is stored with its end state → the spec moves to
Review → the existing FeatherSpec verification decides Done. Automated with a fake provider;
validated manually with the chosen real provider.
