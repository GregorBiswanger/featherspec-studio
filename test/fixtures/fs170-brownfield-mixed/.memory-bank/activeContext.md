# Active Context

Last updated: 2026-09-19
Current branch: main
Current phase: act

## Now

`0006-outbox-batch-size` is implemented: all four plan steps ticked and verified, `npm test`
22/22. Awaiting `/sdd-compile` and the active → done move.

## Active Spec

- Spec: [`.specs/active/0006-outbox-batch-size.md`](../.specs/active/0006-outbox-batch-size.md) (In Progress)
- Plan: [`.specs/active/0006-outbox-batch-size.plan.md`](../.specs/active/0006-outbox-batch-size.plan.md) (Done, 4/4 steps)
- Current task: none — AC-001, AC-002, AC-003 all `verified`

Waiting in `.specs/backlog/`: `0003`–`0005`, `0007`–`0009` (6). In `.specs/done/`:
`0001-baseline-orders.md` (Baseline), `0002-payment-retry.md` (Implemented).

## Changed Recently

- `0006` implemented, T-001 → T-004: `OUTBOX_BATCH_SIZE` / `OUTBOX_INTERVAL_MS` read in
  `src/main.ts:11-14`, resolved in `OutboxDispatcher` (defaults 50 / 2000, one `logger.warn` per
  rejected value). 18 new tests in `tests/outbox.test.ts`; `npm test` 22/22.
- **Run path changed:** both `package.json` scripts now use `--experimental-transform-types`.
  Strip-only mode could not load the six files using TypeScript parameter properties, so no test
  could reach `OutboxDispatcher`. Details in `techContext.md` → *Stack*.
- `.architecture/` maps + `techContext.md` re-synced: outbox playbook, env-var table, five
  `main.ts` line references.
- `0006` moved `backlog/` → `active/`; spec revised during planning (AC-001 tightened to
  "positive integer", AC-003 added); TDD gate waived for this run by user exception.
- Earlier onboarding — `/sdd-setup`, `/sdd-architecture-scan` over 7 units, the `architecture:`
  snapshot, both `.architecture/` maps, 9 knowledge records. See git history from `fcecf88`.

## Decisions in Flight

- Rounding: `docs/adr/0003-rounding.md` (Accepted, matches code) vs
  `.specs/backlog/0009-billing-rounding.md` (Draft, opposite rule). Resolve the ADR before
  implementing that spec.
- Soft delete: recorded as a `conflict` between ADR 0002 and `docs/requirements/data-retention.md`;
  neither chosen, clarification deferred.

## Blockers / Questions

- The `architecture:` snapshot in `AGENTS.md` still calls the outbox "drained by a 2 s poll" —
  now only the default. `/sdd-architecture-update` is gated, so this run did not touch it; run it.
- `npm start` still fails, now only on `ERR_MODULE_NOT_FOUND: zod` — `node_modules/` is absent.
  Needs an Ask-first `npm install`. Pre-existing and independent of `0006`.
- Nothing type-checks this repository (no `tsc` installed), including the new
  `OutboxDispatcherOptions` interface. `npm test` is the whole gate.
- `AGENTS.md` sits at 222 lines against the ~200-line cap. Eviction was proposed and **declined**
  on 2026-09-19; the overage is accepted deliberately, so do not re-propose it unprompted.

## Next

1. `/sdd-architecture-update` — the snapshot's "2 s poll" wording is now stale (gated; not done
   in this run).
2. `/sdd-compile` for `0006`, then `/sdd-lifecycle` active → done with plan archiving.
3. `/sdd-clarify` for `0009-billing-rounding.md` afterwards (it contradicts Accepted
   ADR 0003, and its AC-002 depends on `src/reporting/NightlyExport.ts`, which does not exist).

## Validation

- Done: `npm test` green 2026-09-19 — 22 tests, 22 pass, 0 fail, ~388 ms. Only the accepted
  `ExperimentalWarning: Transform Types` appears; no other warnings.
- Pending: nothing for `0006`.
- Known issues: `npm start` fails on the missing `zod` install. The process performs no observable
  work end to end (deliberate — fixture repository); see `techContext.md` → *Constraints*.
