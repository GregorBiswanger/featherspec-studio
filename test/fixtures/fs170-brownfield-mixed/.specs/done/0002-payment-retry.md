# Payment retry budget

**Status:** Implemented
**Plan:** _none yet_

## 1. Summary

Payment capture retries transient failures with exponential backoff and gives up after five
attempts.

## 2. Goal and problem

The provider charges per attempt and rate-limits the account, so an unbounded retry loop turns a
provider outage into an account-wide block. The budget of five attempts matches the provider's
rate-limit window; a sixth attempt costs money and buys nothing.

## 3. Acceptance criteria

**AC-001 — The retry budget is bounded**
When five capture attempts have failed, the workflow shall stop retrying and shall record the
failure.

**AC-002 — Permanent client errors are not retried**
If the provider answers with a 4xx status other than 429, then the workflow shall not retry.
