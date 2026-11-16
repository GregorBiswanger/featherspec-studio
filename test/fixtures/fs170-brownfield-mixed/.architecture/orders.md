# last reconciled: 2026-09-19

# orders — inside view

Order intake and lifecycle: an append-only event stream plus one projection row per order.

## Internal pattern

`src/modules/orders/<Role>.ts` — flat, one file per role, no subfolders:
`Order.ts` types · `OrderEvents.ts` event union + `project` · `OrderRepository.ts` all SQL ·
`OrderService.ts` use cases and transaction boundaries · `OrderController.ts` routes + zod ·
`index.ts` barrel (does **not** re-export `OrderEvents.ts`).

## Entry points

- `src/modules/orders/OrderController.ts` — `registerOrderRoutes(server, service)`:
  `POST /orders`, `DELETE /orders/:id`.
- `src/modules/orders/OrderService.ts` — `place`, `markPaid`, `updateOrderAfterPayment`, `softDelete`.
- Wired from `src/main.ts:16,17,23`.

## Task playbook

- **Add an order event:** extend the union in `OrderEvents.ts` → emit it inside a
  `db.transaction` in `OrderService.ts` → in the same transaction call
  `outbox.append({aggregateId, type, payload, createdAt}, tx)`. Never write the projection
  without also appending the event.
- **Add a route:** handler in `OrderController.ts`, guard first with
  `requirePermission(req.user, '<resource>:<verb>')`, body through `validate(schema, body)`.
  Registration happens only via `registerOrderRoutes`, called from `src/main.ts`.
- **Change a query:** all SQL lives in `OrderRepository.ts`; keep `and deleted_at is null` —
  removing it changes behaviour covered by `.specs/done/0001-baseline-orders.md:19`.

## Deviations

- `OrderService` imports `db` directly and owns transactions, while `OrderRepository` is
  otherwise the sole SQL owner.
- `OrderController` types requests as `any` and reads `req.params.id` unvalidated, although the
  body on the same route goes through zod.

## Traps

- `updateOrderAfterPayment` patches the projection with no event — forbidden by
  `docs/adr/0001-event-sourcing-for-orders.md:21`. Record `arch-orders-postpay-edit-003`.
- Name↔content: it names a payment follow-up but is a generic `Partial<Order>` patch with no
  payment check and no caller.
- `markPaid` has no caller, so `OrderPaid` is never produced; `OrderShipped`, `OrderCancelled`
  and `OrderCorrected` exist only in the union.
- `project` folds with object spread, so a later event overwrites whole keys; it is used by the
  test only, never in production code.
