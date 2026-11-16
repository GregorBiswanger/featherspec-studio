# Make the outbox batch size configurable

**Status:** In Progress
**Plan:** [0006-outbox-batch-size.plan.md](0006-outbox-batch-size.plan.md)

## 1. Summary

The dispatcher's batch size and interval are compiled constants. Make both configurable through
environment variables, keeping today's values as defaults.

## 2. Acceptance criteria

**AC-001 — Batch size and interval are configurable**
When `OUTBOX_BATCH_SIZE` or `OUTBOX_INTERVAL_MS` is set to a positive integer, the dispatcher shall
use that value; when neither is set, it shall use 50 and 2000 respectively.

**AC-002 — Dispatch semantics are unchanged**
When the dispatcher runs, it shall publish pending records in creation order and shall mark each
dispatched exactly as it does today.

**AC-003 — Invalid values fall back to the defaults**
When `OUTBOX_BATCH_SIZE` or `OUTBOX_INTERVAL_MS` is set to a value that is not a positive integer,
the dispatcher shall use the default for that variable and shall write one `warn` log line naming
the variable and the rejected value.
