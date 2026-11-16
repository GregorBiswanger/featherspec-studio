# Product decisions (PD register)

Decision records for the open points in [po-handoff.md](po-handoff.md) §19 and for questions
that came up while specifying. Each entry: decision · date · basis.

> **Status of this register:** decided on 2026-11-16 by Claude acting as product-owner proxy
> for Gregor during a hands-off run, following the handoff's own proposals wherever it makes
> one. Entries marked **(proxy)** still need Gregor's confirmation; changing one means
> revising the specs that cite it (`/sdd-specify` revise mode, then `/sdd-plan` Mode C).

| ID | Question | Decision | Basis |
| --- | --- | --- | --- |
| PD-001 | First productive provider | See [ADR-003](../decisions/ADR-003-first-agent-provider.md) once the spike is in; until then specs stay provider-neutral and are exercised with the fake provider | handoff §2.1, SPIKE-002 |
| PD-002 | Does drag & drop to Active start an agent? | Yes — after a passed readiness check **and one explicit confirmation** that names spec, provider, model (if known) and the permission mode. No silent start, no "don't ask again" in the MVP **(proxy)** | handoff §6.5, P4 |
| PD-003 | Where do runtime data live? | Behind a storage port; technology per [ADR-002](../decisions/ADR-002-runtime-storage.md). Never inside the user's repository | handoff §8.5, SPIKE-004 |
| PD-004 | How are Ready / Review / Blocked persisted? | Not persisted. They are derived by the documented rules in [featherspec-format.md](../discovery/featherspec-format.md) §5.2; every derived state is labelled as derived in the UI and shows its rule | handoff §6.3, SPIKE-001 |
| PD-005 | Runs per spec | One active run per spec, and in the MVP one active run per project (no parallel agents) | handoff §2.3 |
| PD-006 | Tool permissions | Provider-conformant. Studio never widens permissions; approval requests are shown and answered by the human; nothing is auto-approved **(proxy)** | handoff P4 |
| PD-007 | Which sessions can be resumed? | Only where the provider adapter declares the capability; otherwise the run is `Interrupted` after a restart | handoff §19 |
| PD-008 | Is React set? | See [ADR-001](../decisions/ADR-001-extension-architecture.md) | SPIKE-003 |
| PD-009 | MCP in the MVP? | No | handoff §8.6 |
| PD-010 | Adopt foreign running sessions? | No — only runs Studio started | handoff §19 |
| PD-011 | External file changes during a run | Files are the truth: the watcher re-reads, the run continues. If the run's spec file disappears or changes its number, the run is flagged with a diagnostic; Studio never rewrites the file **(proxy)** | handoff §5.4 |
| PD-012 | Retention | Local only. Runs and events are kept until the user clears them (command "Clear run history"), with a default age cap of 90 days applied on activation **(proxy)** | handoff §13 Privacy |
| PD-013 | Does Studio write to `.specs/`, `.memory-bank/` or `AGENTS.md`? | No. In the MVP Studio is **read-only** for all FeatherSpec artifacts. Lifecycle moves stay with FeatherSpec's own procedure (`/sdd-lifecycle`), carried out by the agent Studio starts or by the developer. The board follows the files **(proxy)** | handoff P2, §6.3 |
| PD-014 | Which drops does the board accept? | Only Ready → Active (starts a run, PD-002). Every other drop is refused with the reason: Ready/Review/Blocked are derived, Done needs `/sdd-compile` evidence **(proxy)** | PD-004, PD-013 |
| PD-015 | Priority on cards | FeatherSpec specs carry no priority field today. Studio shows "not available" and offers sorting by priority only when a spec declares one; it never invents a value **(proxy)** | handoff P8, SPIKE-001 |
| PD-016 | UI language | English **(proxy)** | public repo, Marketplace |
| PD-017 | Spec numbering in this repo | `0001`–`0012` mirror the handoff's `FS-001`–`FS-012`; requirement and criterion IDs follow FeatherSpec's own convention, with the handoff ID kept as a reference | traceability to the handoff |
