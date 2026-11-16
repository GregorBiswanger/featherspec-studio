# Log authorization decisions

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Write one structured log line for every authorization decision, allow and deny alike, so that
support can answer "why was I refused?" without a debugger.

## 2. Scope

Logging only. The decision itself, the role mapping and the tenant check are untouched.

## 3. Acceptance criteria

**AC-001 — Every decision is logged**
When `AuthorizationService.can` returns, the service shall emit one log line carrying the
principal id, the permission and the outcome.

**AC-002 — No secret reaches the log**
When a decision is logged, the log line shall contain no token, password or session identifier.
