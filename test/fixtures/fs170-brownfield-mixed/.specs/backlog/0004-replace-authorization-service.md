# Replace the authorization service

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Replace the hand-written role-to-permission mapping in `AuthorizationService` with a policy file
loaded at startup.

## 2. Goal and problem

Adding a role means editing TypeScript and shipping a release. Operations want to add roles
without a deployment.

## 3. Acceptance criteria

**AC-001 — Roles come from a policy file**
When the service starts, it shall load role definitions from `config/policies.yaml` and shall
not read them from a compiled constant.

**AC-002 — Unknown roles grant nothing**
If a principal carries a role the policy file does not define, then the service shall grant no
permission for it.
