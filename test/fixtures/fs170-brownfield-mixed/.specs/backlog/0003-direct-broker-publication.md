# Direct broker publication and order history

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Two independent changes to the orders module: order events go to the broker directly instead of
through the outbox table, and customers get a history endpoint.

## 2. Goal and problem

The outbox loop adds up to two seconds between an order being placed and fulfilment reacting to
it, and support cannot see what happened to an order without a database query.

## 3. Scope

- Publish order events directly from `OrderService` and remove the outbox table, its repository
  and its dispatcher.
- Add `GET /orders/{id}/history` returning the order's event stream.

## 4. Acceptance criteria

**AC-001 — Events reach the broker without an intermediate table**
When an order event occurs, the system shall publish it to the broker and shall not write an
outbox row.

**AC-002 — History endpoint returns the event stream**
When `GET /orders/{id}/history` is called by a principal with `orders:read`, the system shall
return the order's events in chronological order.
