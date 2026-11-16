# System Patterns

## Architectural style

See the `architecture:` snapshot in `AGENTS.md` — the only home of structure facts. This file
holds the *why*: decisions and patterns.

## Key decisions

- 2026-09-19 — Adopted FeatherSpec on an existing codebase and built the architecture fingerprint
  from a deep scan of `src/` rather than from a self-description. Source: `.sdd-scan/_worklist.md`
  (7 units, all `standard` tier).
- 2026-09-19 — The stubbed HTTP server and database seams are **deliberate**: this is a fixture
  repository, and `BillingService` being unreachable is known and accepted. Treat neither as a
  defect to fix on sight; a task that needs a live HTTP surface or a real database must build
  that seam explicitly and say so. provenance: human (/sdd-setup)

## Patterns

- **Module shape.** Every module and infrastructure concern is flat: one file per role directly
  under its folder, no layer or feature subfolders. `<Aggregate>.ts` (types) · `<X>Repository.ts`
  (all SQL) · `<X>Service.ts` (use cases, owns transactions) · `<X>Controller.ts` (routes +
  zod schema) · `index.ts` (barrel). The one subfolder in the repository is `src/shared/cache/`.
- **Composition is manual and central.** Every service is constructed by hand in `src/main.ts` in
  dependency order — no container, no factory. Routes are push-style: a module exports
  `register<X>Routes(server, service)` and `main.ts` calls it.
- **Persistence is the exception to that rule.** Repositories import the `db` singleton directly
  from `src/infrastructure/db/connection.ts` instead of receiving it, so persistence is the one
  dependency that bypasses the composition root.
- **Barrels are not the real boundary.** `OrderEvents.ts` and `Money.ts` are omitted from their
  module's `index.ts` yet reached from outside by deep import from `tests/`.
- **Module separation.** `orders` and `billing` hold no import of each other in either direction —
  verified repo-wide. What `README.md:8-9` describes as event-based communication has a publisher
  and no subscriber: no `subscribe` call exists anywhere in `src/`.
- **Contested rounding.** `docs/adr/0003-rounding.md` (Accepted) matches the code;
  `.specs/backlog/0009-billing-rounding.md` (Draft) specifies the opposite rule. The spec is a
  pending change, not a competing decision — resolve the ADR before implementing it.

## Knowledge records

*Observation* = what the code does, with a path to check it. *Reason* = why it was built that
way. `decided` = a trusted source says so, and the source is named. `unknown` = nobody wrote it
down; a normal, permanent state, not a defect. `candidates` = explanations found somewhere that
prove nothing. `conflict` = two trusted sources disagree, and neither was chosen.

### Order state is an append-only event stream with the order row as a projection

```yaml
fs-knowledge:
  id: arch-orders-events-001
  evidence: [src/modules/orders/OrderService.ts:15, src/modules/orders/OrderEvents.ts]
  rationale:
    state: decided
    statement: "Finance must be able to reconstruct an order's exact state at the time it was paid; a mutable row cannot answer that."
    provenance: {type: adr, source: "docs/adr/0001-event-sourcing-for-orders.md:19", confirmedAt: "2022-03-14"}
```

### A post-payment correction is written straight to the projection, emitting no event

```yaml
fs-knowledge:
  id: arch-orders-postpay-edit-003
  evidence: [src/modules/orders/OrderService.ts:47]
  rationale:
    state: unknown
    deferred: {at: "2026-09-19"}
    candidates:
      - {statement: "Forbidden — after payment, corrections are new events, never edits.", source: "docs/adr/0001-event-sourcing-for-orders.md:21"}
  # The one decided source on this subject forbids the behaviour the code exhibits.
  # Touches data integrity: the change is invisible in the stream and lost on rebuild.
```

### Deleted orders are marked, never removed

```yaml
fs-knowledge:
  id: arch-orders-softdelete-002
  evidence: [src/modules/orders/OrderRepository.ts:30, "absent: nightly purge job (docs/requirements/data-retention.md)"]
  rationale:
    state: unknown
    deferred: {at: "2026-09-19"}
    conflict:
      - {statement: "So that auditors can reconstruct the full order history; a physical delete is a hole in the audit trail.", source: "docs/adr/0002-soft-delete-for-orders.md:18"}
      - {statement: "Only to give support a seven-day undo window; the audit trail is the event log, and the order table must not be treated as one.", source: "docs/requirements/data-retention.md:8"}
```

### Order event and outbox row are written in one transaction

```yaml
fs-knowledge:
  id: arch-outbox-004
  evidence: [src/modules/orders/OrderService.ts:23, src/infrastructure/outbox/OutboxRepository.ts:5]
  rationale:
    state: unknown
    deferred: {at: "2026-09-19"}
    candidates:
      - {statement: "The outbox guarantees delivery of order events even when the broker is unavailable at commit time.", source: ".specs/done/0001-baseline-orders.md:16"}
  # docs/adr/0004-inline-broker-publication.md is Superseded and argues the opposite;
  # its replacement decision was never written down (that ADR, line 18).
```

### A dispatched event is marked delivered without checking the broker's response

```yaml
fs-knowledge:
  id: arch-outbox-delivery-005
  evidence: [src/infrastructure/broker/BrokerClient.ts:5, src/infrastructure/outbox/OutboxDispatcher.ts:29]
  rationale:
    state: unknown
    deferred: {at: "2026-09-19"}
  # No source states an intended delivery guarantee. Observed: a broker 4xx/5xx resolves
  # normally, so markDispatched runs on a rejected event. Touches data integrity.
```

### Invoice totals are rounded per line, then summed

```yaml
fs-knowledge:
  id: arch-billing-rounding-006
  evidence: [src/modules/billing/Money.ts:2, src/modules/billing/Money.ts:5]
  rationale:
    state: decided
    statement: "The tax authority's reference implementation rounds per line item; rounding once at the end differs by up to a cent per invoice and is rejected on filing."
    provenance: {type: adr, source: "docs/adr/0003-rounding.md:13", confirmedAt: "2022-09-05"}
```

### Payment capture retries at most five times and never retries a 4xx except 429

```yaml
fs-knowledge:
  id: arch-billing-retry-007
  evidence: [src/modules/billing/PaymentRetryPolicy.ts:6, src/modules/billing/PaymentRetryPolicy.ts:12]
  rationale:
    state: decided
    statement: "Five is where the provider's rate-limit window closes — a sixth attempt costs money and buys nothing; other 4xx are never retried because the card was already rejected."
    provenance: {type: adr, source: "docs/requirements/payment-retry.md:6", confirmedAt: "2024-06-14"}
```

### Authorization is enforced by an imperative call inside each handler, on a principal nothing populates

```yaml
fs-knowledge:
  id: arch-auth-enforcement-008
  evidence: [src/auth/middleware.ts:4, src/modules/orders/OrderController.ts:13, "absent: any assignment of req.user (src/infrastructure/http/server.ts)"]
  rationale:
    state: unknown
    deferred: {at: "2026-09-19"}
  # No ADR covers authorization. Observed: enforcement is opt-in per route; `admin` is both a
  # role key and a permission literal, so it acts as a wildcard; the tenant guard never runs
  # because no call site passes a tenant. Touches security.
```

### A nightly invoice export is documented but has no counterpart in the code

```yaml
fs-knowledge:
  id: arch-billing-export-absent-009
  evidence: ["absent: src/reporting/NightlyExport.ts (docs/requirements/pricing.md:10)"]
  rationale:
    state: unknown
  # .specs/backlog/0009-billing-rounding.md AC-002 depends on this component existing.
```
