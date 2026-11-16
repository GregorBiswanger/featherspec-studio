# Rename the order status values

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Rename the `OrderStatus` values to the vocabulary the business uses: `draft` stays, `placed`
becomes `accepted`, `paid` becomes `settled`.

## 2. Goal and problem

Support and engineering use different words for the same states, and every incident call starts
with a translation.

## 3. Acceptance criteria

**AC-001 — The new vocabulary is used everywhere**
When the rename is complete, the repository shall contain no occurrence of the old status values
outside a migration.
