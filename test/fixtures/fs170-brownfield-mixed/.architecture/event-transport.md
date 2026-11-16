# last reconciled: 2026-09-19 (spec 0006 — outbox configuration)

# event-transport — inside view

Transactional outbox plus broker client: the seam order events leave the database through.

## Internal pattern

`src/infrastructure/outbox/` — `OutboxRecord.ts` type · `OutboxRepository.ts` data access ·
`OutboxDispatcher.ts` polling drain. `src/infrastructure/broker/BrokerClient.ts` — HTTP egress.
Classes with constructor injection, all instances built by hand in `src/main.ts:9-14`.

## Entry points

- Producer: `OutboxRepository.append(record, tx = db)` — called only from
  `src/modules/orders/OrderService.ts:23,40`, inside the caller's transaction.
- Drain: `OutboxDispatcher.start() / stop() / tick()` — started once at `src/main.ts:25`.
- Egress: `BrokerClient.publish(topic, payload)` → `POST ${BROKER_URL}/topics/${type}`.

## Wire contract

Topic = the `OrderEvent.type` string; body = the JSON-serialized `OrderEvent`; no headers, no
message id. `aggregateId` is stored on the row but never published.

## Task playbook

- **Change batch size or interval:** configuration, not constants (spec `0006`, 2026-09-19).
  `OUTBOX_BATCH_SIZE` / `OUTBOX_INTERVAL_MS` are read in `src/main.ts:11-14` and passed into the
  dispatcher's third constructor argument; `OutboxDispatcher.ts:5-6` holds the defaults 50 and
  2000, and `resolvePositiveInteger` falls back to them with one `logger.warn` per rejected value.
  Change the defaults there, never in `main.ts`.
- **Change what is published:** payload is serialized at the call site in `OrderService`, not
  here; the dispatcher forwards `record.payload` verbatim.
- **Add a consumer:** none exists. `BrokerClient` offers only `publish`; there is no
  `subscribe` anywhere in `src/`.

## Traps

- `BrokerClient.publish` never inspects the fetch response (`BrokerClient.ts:5`), so a broker
  4xx/5xx resolves normally and `markDispatched` marks a rejected event delivered — silent
  loss. Record `arch-outbox-delivery-005`. No timeout, no abort signal.
- `takePending` does not claim: plain select, no `for update`/`skip locked`, no in-flight
  state. Correctness rests on exactly one dispatcher process, which the code does not enforce.
- `attempts` is written by `recordFailure` and read by nothing — it looks like a retry budget
  and is not one. No backoff, no ceiling, no dead-letter.
- `append`'s default `tx = db` lets a caller write an outbox row outside any transaction.
- Ordering holds within a tick only; a failed record is retried after later records ship.
- `docs/adr/0004-inline-broker-publication.md` is **Superseded** but still reads as a live
  description of the opposite architecture.
