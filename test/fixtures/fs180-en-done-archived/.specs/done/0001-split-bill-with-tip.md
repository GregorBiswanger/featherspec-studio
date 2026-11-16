# Split a bill with tip evenly across a group

**Status:** Implemented
**Plan:** [0001-split-bill-with-tip.2026-09-19.plan.md](../plan-archive/0001-split-bill-with-tip.2026-09-19.plan.md)

## 1. Summary

A calling client, acting for a group at a restaurant table, sends the bill amount, a tip
percentage and how many people share the bill. The service answers with one amount per person
— in order — and the total tip. Bill plus rounded tip is split so that the per-person amounts
add up exactly, with no cent lost or invented. An invalid request never produces a number: it
produces one problem for every input that has one.

## 2. Goal and problem

Splitting a bill with tip at the table is done in the head or on a phone calculator, and the
result rarely adds up: the tip is rounded twice, the last cent goes missing, and someone
covers the difference. This feature makes the split exact and reproducible, in one request,
with no setup and no account.

The service is used machine-to-machine: the caller is a **calling client** — an app, a script
or another service — acting for the guests at the table. The guests are the beneficiaries of
the answer, never the direct users of this service.

The goal is reached when a calling client can send three values and read off what each person
pays, and the sum of those amounts equals the bill plus the tip actually left on the table.

## 3. Users and roles

One role: the **calling client**, a program that sends the three values on behalf of the
guests at the table and reads the answer. No permissions, no login, no distinction between
clients — the service keeps nothing between requests.

The guests at the table are the people the answer is *for*; they never reach the service
themselves, because it exposes no user interface (see *Out of scope*).

## 4. Scope

### In scope

- Calculating the total tip from a bill amount and a tip percentage.
- Splitting bill plus tip evenly across a whole number of people, distributing leftover cents.
- Returning one amount per person, in order, together with the total tip.
- Validating all three inputs and reporting one problem for every faulty input in a single
  answer.

### Out of scope

- **Tip as an absolute amount** (e.g. "5 € tip") — because the agreed input is a percentage;
  a second tip form doubles the rule set and can follow once the percentage case is proven.
- **Unequal shares** (per-person items, different quotas, one person paying more) — because
  the point of this slice is the even split; unequal shares are a different calculation and a
  different input shape.
- **Currencies and exchange rates** — because all amounts are in one unnamed currency with
  two decimals; formatting and conversion add no fairness value here.
- **Persistence and history** — because each request is answered from its own input alone
  (decision in `systemPatterns.md`); nothing is worth storing between two tables.
- **Accounts, login, roles** — because there is no per-client data to protect.
- **A user interface** — because the service answers machine-to-machine; a UI for the guests
  is a separate slice that would consume this one.

## 5. Functional flow

1. The calling client sends three inputs: bill amount, tip percentage, number of people.
2. The service checks all three inputs against the rules in section 6.
3. If any input is invalid, the service answers with one problem per faulty input — every
   problem naming the input it belongs to — and no amounts at all. The flow ends.
4. Otherwise the service calculates the total tip and rounds it to the nearest cent.
5. It splits bill plus rounded tip across the people, distributing any leftover cents.
6. It answers with one amount per person, in the order of the people, plus the total tip.

## 6. Business rules

**Inputs**

The three inputs arrive as numbers. Written forms of a number — trailing zeros, separators,
exponent notation — are whatever the caller's number format yields; they are not product
rules, and every rule below is judged on the **numeric value** received.

- **BR-01** The bill amount is a number of at least `0`. `0` is valid.
- **BR-02** The bill amount is exact to the cent: its value multiplied by `100` is a whole
  number. `10.1` and `10.100` are the same value and both valid; `10.005` is invalid and is
  not rounded away.
- **BR-03** The tip percentage is a number of at least `0`. `0` is valid. Any number of
  decimal places is accepted (e.g. `12.5`, `7.125`).
- **BR-04** The number of people is a whole number of at least `1`. A value with a zero
  fractional part (`3.0`) is the whole number `3` and is valid. A value with a non-zero
  fractional part (`2.5`) is invalid.
- **BR-05** No rule caps any of the three inputs: there is no upper limit. The practical
  ceiling of exact cent arithmetic is an implementation matter recorded in O-001 — it is a
  decision for `/sdd-plan`, not a limit this spec imposes.
- **BR-06** A missing, empty or non-numeric input is invalid, exactly like an out-of-range one.

**Calculation**

- **BR-07** Total tip = bill amount × tip percentage ÷ 100, rounded to the nearest cent,
  with exact halves rounded up. This rounding happens **once**, before the split.
- **BR-08** The amount to split is bill amount + rounded total tip.
- **BR-09** Each person receives the amount to split divided by the number of people, rounded
  **down** to the cent.
- **BR-10** The cents left over after BR-09 are handed out one cent each, starting at the
  first person, until they are used up. A leftover of *k* cents therefore raises the amounts
  of the first *k* people by one cent each.
- **BR-11** The per-person amounts sum **exactly** to the amount to split from BR-08. No cent
  is lost or invented.
- **BR-12** Two per-person amounts differ by at most one cent, and no person is given more
  than a person before them.

**Problems**

- **BR-13** An answer contains either results or problems, never both. An invalid request
  yields no per-person amount and no total tip.
- **BR-14** Each input yields **at most one** problem: the first that applies in the check
  order below. The answer carries a problem for **every** input that has one, not just the
  first faulty input.

  | Input | Check order — stops at the first problem |
  | --- | --- |
  | Bill amount | readable as a number (BR-06) → not negative (BR-01) → exact to the cent (BR-02) |
  | Tip percentage | readable as a number (BR-06) → not negative (BR-03) |
  | Number of people | readable as a number (BR-06) → whole number (BR-04) → at least `1` (BR-04) |

- **BR-15** Every problem names the input it belongs to — by the **field name the input was
  sent under** — and what is wrong with it. The field names themselves are a plan decision
  (A-003).
- **BR-16** If nothing can be read from the request at all — no input can be located — the
  answer carries exactly one problem, naming `request`, and no per-input problems.

## 7. Functional requirements

| ID | Requirement | Criteria |
| --- | --- | --- |
| FR-01 | The service shall accept bill amount, tip percentage and number of people as one request. | AC-001 |
| FR-02 | The service shall calculate and round the total tip per BR-07, for any accepted tip percentage and for a bill amount of `0`. | AC-003, AC-006, AC-007, AC-015 |
| FR-03 | The service shall split bill plus rounded tip per BR-09 … BR-12, so the amounts sum exactly and differ by at most one cent. | AC-002, AC-004, AC-005 |
| FR-04 | The service shall return one amount per person, in the order of the people, plus the total tip. | AC-001 |
| FR-05 | The service shall validate all three inputs per BR-01 … BR-06, judging every rule on the numeric value received. | AC-008 … AC-012, AC-017, AC-019 |
| FR-06 | The service shall report at most one problem per input and a problem for every faulty input in a single answer, naming each input by its sent field name, and return no amounts. | AC-013, AC-014, AC-020 |
| FR-07 | The calculation shall impose no upper limit on bill amount, tip percentage or number of people. | AC-016 |
| FR-08 | The service shall answer a request nothing can be read from with a single problem naming `request`. | AC-018 |

## 8. Data requirements

| Value | Meaning | Mandatory | Rules |
| --- | --- | --- | --- |
| Bill amount | Total on the bill, before tip, in one unnamed currency | yes | BR-01, BR-02 |
| Tip percentage | Percentage of the bill left as tip | yes | BR-03 |
| Number of people | How many people share the bill | yes | BR-04 |
| Amount per person | One entry per person, in the order of the people | — (result) | BR-09 … BR-12 |
| Total tip | The rounded tip for the whole table | — (result) | BR-07 |

All monetary values are exact to the cent — two decimal places. No value is personal or
sensitive; nothing is stored beyond answering the request.

## 9. Problem cases and edge cases

**Rejected input** — the catalogue of problems. Per BR-14 an input contributes at most one of
its rows to an answer, and every faulty input contributes one.

| Case | Input | Reason |
| --- | --- | --- |
| E-01 | Bill amount | missing |
| E-02 | Bill amount | empty |
| E-03 | Bill amount | not a number |
| E-04 | Bill amount | negative |
| E-05 | Bill amount | not exact to the cent (value × 100 is not a whole number) |
| E-06 | Tip percentage | missing |
| E-07 | Tip percentage | empty |
| E-08 | Tip percentage | not a number |
| E-09 | Tip percentage | negative |
| E-10 | Number of people | missing |
| E-11 | Number of people | empty |
| E-12 | Number of people | not a number |
| E-13 | Number of people | not a whole number |
| E-14 | Number of people | less than 1 |
| E-15 | `request` | nothing can be read from the request (BR-16) |
| E-16 | Bill amount · tip percentage · number of people | beyond the range of exact cent arithmetic (R-007; the input's own check order ends here) |

**Accepted edge cases**

- Bill amount `0` with any valid tip percentage → total tip `0.00`, every person `0.00`.
- Tip percentage `0` → total tip `0.00`; the bill alone is split.
- One person → that person receives bill plus tip in full.
- A tip percentage with many decimals (`7.125`) → accepted; only the resulting tip is rounded.
- A bill amount sent as `10.100` → the same value as `10.10`, accepted.
- `3.0` people → the whole number `3`, accepted.
- An amount that does not divide evenly (`10.00`, 10 %, 3 people → `11.00` / 3) → `3.67`,
  `3.67`, `3.66`.

## 10. Acceptance criteria

**AC-001** The system shall answer a valid request with exactly one amount per person, in the
order of the people, and the total tip.

> **Given** a bill of `60.00`, a tip of `10` % and `4` people
> **When** the split is requested
> **Then** the answer contains four amounts — `16.50`, `16.50`, `16.50`, `16.50` — and a total
> tip of `6.00`.

**AC-002** The system shall produce per-person amounts that sum exactly to the bill amount
plus the returned total tip.

**AC-003** When a valid request is processed, the system shall set the total tip to the bill
amount multiplied by the tip percentage divided by 100, rounded to the nearest cent, with an
exact half rounded up.

> **Given** a bill of `10.05` and a tip of `5` % (exactly `0.5025`)
> **When** the split is requested
> **Then** the total tip is `0.50`.
>
> **Given** a bill of `10.10` and a tip of `5` % (exactly `0.505`)
> **When** the split is requested
> **Then** the total tip is `0.51`.

**AC-004** While the amount to split does not divide evenly across the people, the system
shall raise the amounts of the first people by one cent each until the amounts sum exactly to
the amount to split.

> **Given** a bill of `10.00`, a tip of `10` % and `3` people
> **When** the split is requested
> **Then** the amounts are `3.67`, `3.67`, `3.66` and the total tip is `1.00`.

**AC-005** The system shall produce per-person amounts that differ by at most one cent, with
no amount larger than an amount before it.

**AC-006** When the bill amount is `0` and the other inputs are valid, the system shall return
`0.00` for every person and a total tip of `0.00`.

**AC-007** When the tip percentage is `0` and the other inputs are valid, the system shall
return a total tip of `0.00` and split the bill amount alone.

**AC-008** If the bill amount is negative, then the system shall reject the request with a
problem naming the bill amount.

**AC-009** If the bill amount is not exact to the cent, then the system shall reject the
request with a problem naming the bill amount, and shall not round the value instead.

> **Given** a bill of `10.005`
> **When** the split is requested
> **Then** the answer names the bill amount as not exact to the cent and contains no amounts.

**AC-010** If the tip percentage is negative, then the system shall reject the request with a
problem naming the tip percentage.

**AC-011** If the number of people is not a whole number, or is smaller than `1`, then the
system shall reject the request with a problem naming the number of people.

> **Given** `2.5` people
> **When** the split is requested
> **Then** the answer names the number of people as not a whole number and contains no amounts.

**AC-012** If any of the three inputs is missing, empty or not a number, then the system shall
reject the request with a problem naming that input.

**AC-013** If more than one input is invalid, then the system shall name a problem for every
invalid input in a single answer.

> **Given** a bill of `-5.001`, a tip of `-2` % and `0` people
> **When** the split is requested
> **Then** the answer carries exactly three problems — the bill amount as negative (its first
> applicable rule per BR-14, not additionally "not exact to the cent"), the tip percentage as
> negative, and the number of people as smaller than one — and no amounts.

**AC-014** If a request is rejected, then the system shall return no per-person amount and no
total tip.

**AC-015** Where the tip percentage carries more than two decimal places, the system shall
accept it and round only the resulting total tip.

**AC-016** The system shall apply no upper limit to the bill amount, the tip percentage or the
number of people.

> **Given** a bill of `10.00`, a tip of `0` % and `1000` people
> **When** the split is requested
> **Then** the answer contains 1000 amounts that sum to `10.00`.

**AC-017** Where the number of people is sent with a zero fractional part, the system shall
treat it as that whole number and accept the request.

> **Given** a bill of `12.00`, a tip of `0` % and `3.0` people
> **When** the split is requested
> **Then** the answer contains three amounts of `4.00` and no problem.

**AC-018** If nothing can be read from the request, then the system shall answer with exactly
one problem, naming `request`, and no per-input problems and no amounts.

**AC-019** The system shall judge cent-exactness and whole-number-ness on the numeric value
received, not on how that value was written.

> **Given** a bill sent as `10.100`, a tip of `0` % and `1` person
> **When** the split is requested
> **Then** the request is accepted and the single amount is `10.10`.

**AC-020** If one input breaks more than one rule, then the system shall report exactly one
problem for it — the first rule that applies in the check order of BR-14.

## 11. Technical notes for developers or AI agents

Context found in the repository, so the plan need not rediscover it:

- No source files exist yet. `src/split.js` (pure calculation core) and `src/server.js`
  (thin HTTP layer over `node:http`) are the agreed target layout in the `architecture:`
  snapshot in `AGENTS.md`. Validation, parsing and formatting belong in the HTTP layer; the
  core stays free of I/O.
- Stack per `techContext.md`: Node.js LTS, ESM only, no runtime dependencies, no build step,
  `node:test` as the runner, quality gate `npx eslint .` → `node --test`.
- TDD is the working mode per *Style & Output Preferences* in `AGENTS.md`: the test comes
  first and fails against a `Not implemented` stub.
- **Money must not be calculated in binary floating point.** `0.1 + 0.2` and
  `10.05 * 0.05` already break BR-07 and BR-11. Work in integer cents.
- The inputs arrive as numbers, so BR-02 is a test on the **value**: `value × 100` must be a
  whole number. Naive multiplication in binary floating point does not decide this —
  `10.07 * 100` is `1006.9999999999999`, and `0.1 + 0.2` is not `0.3`. A tolerant comparison
  against the nearest integer, or a decision made on the number's shortest decimal
  representation, is a plan decision; whichever is chosen must accept `10.1`, `10.100` and
  `10.07`, and reject `10.005`.
- Rounding half **up** is not `Math.round` on a negative value — but with BR-01 and BR-03 in
  force, all rounded values are non-negative, so the distinction does not arise.
- The concrete request and response shape (transport, field names, status codes, problem
  format) is a plan decision, not a spec decision — see A-002 and A-003. BR-15 binds the
  problem to the field name the input was sent under, whatever those names become.

## 12. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | The three inputs arrive in one request and the answer comes back in one response; no dialogue, no partial results. | `projectbrief.md`: "a single request, no setup, no account". | The flow in section 5 and every acceptance criterion would need a session concept. |
| A-002 | The feature is delivered as the HTTP endpoint of the existing service, not as a CLI or library API. | The `architecture:` snapshot names `src/server.js` as the sole entrypoint and calls the service "HTTP". | The spec still holds, but the plan would target a different entrypoint. |
| A-003 | Input field names, transport format and problem-response shape are decided in `/sdd-plan`, not here. | Interview rule: technical form is not a product decision. | Nothing in this spec; it only moves the decision — BR-15 already binds whatever names are chosen. |
| A-005 | The problems in a rejection are ordered by a fixed input order — bill amount, tip percentage, number of people — so the answer is reproducible. | BR-14 demands completeness and one problem per input; a stable order makes it testable. | AC-013's example would be order-independent and the deciding test weaker. |
| A-006 | Per-person amounts are returned in the order of the people, and "the first people" in BR-10 means the lowest positions in that order. | The user's own wording: "one amount per person (in order)", "leftover cents go to the first people". | The distribution stays fair in sum but becomes unpredictable per position. |
| A-007 | The answer carries per-person amounts and the total tip only; the grand total is not returned, because it is the sum of what is already there. | The user's list of what the answer carries names exactly these two. | Callers would compute the grand total themselves — a small, additive change. |
| A-008 | The tip percentage is applied to the bill amount alone, never to an already-tipped total. | Standard restaurant practice; BR-07 is stated on the bill amount. | Every tip figure would be too high. |

A-004 (decimal notation, comma and exponent forms) was dropped by the clarify decisions — see
*Resolved* in section 13. IDs are not renumbered, so the gap is intentional.

## 13. Open points

None open — O-001 and O-002 were decided in `/sdd-plan` (see *Resolved by the plan decisions*).

**Resolved by the plan decisions (2026-09-19)**

- **R-007 — O-001, very large values.** Rejected, not widened: an input whose cent value does
  not land inside JavaScript's safe-integer range — including the case where the amount to
  split would leave it — yields a problem naming that input (catalogue row E-16), appended as
  the last check in that input's BR-14 order. BR-05 stands unchanged: the product imposes no
  upper limit; this is the arithmetic ceiling being named rather than silently crossed. No
  wider numeric type is introduced. AC-016 is proven at realistic magnitudes (1000 people).
- **R-008 — O-002, problem message wording.** A fixed English message per catalogue row,
  each naming the field as sent (BR-15) — e.g. `amount: must be a number`, `amount: must not
  be negative`, `amount: must be exact to the cent`, `people: must be a whole number`. The
  table lives in the plan; section 9 stays the authority on *which* problems exist.

**Resolved by the clarify decisions (2026-09-19)**

- **R-001 — No upper limit vs. arithmetic ceiling.** No upper limit stays the rule (BR-05);
  the numeric ceiling is O-001, a plan decision, not a spec contradiction.
- **R-002 — Who the user is.** The user of the service is a calling client acting for the
  guests at the table (sections 2, 3, 5).
- **R-003 — Two-decimal rule on numbers.** Inputs arrive as numbers; BR-02 is judged on the
  numeric value (value × 100 is a whole number), so `10.100` equals `10.1` and is valid.
  Comma separators and exponent notation are number-format matters, not product rules —
  assumption A-004 dropped.
- **R-004 — Problem granularity.** At most one problem per input, the first that applies
  (BR-14 check order); the answer lists every input that has a problem; "naming the input"
  means the field name as sent (BR-15).
- **R-005 — `3.0` people.** A zero fractional part is a whole number and valid (BR-04,
  AC-017).
- **R-006 — Unreadable request.** A request nothing can be read from yields exactly one
  problem naming `request` (BR-16, AC-018, E-15).

## 14. Definition of Ready

- [x] Goal and problem unambiguous
- [x] User role and business value clear
- [x] Scope and out-of-scope documented, each exclusion with a reason
- [x] Business rules testable
- [x] Happy path described
- [x] Edge cases described or deliberately excluded
- [x] Acceptance criteria measurable
- [x] Data and constraints clarified or marked as assumptions
- [x] Open questions visible (section 13)

## 15. Definition of Done

- [ ] All must-requirements (FR-01 … FR-08) implemented
- [ ] All acceptance criteria (AC-001 … AC-020) pass
- [ ] Tests added and green; the calculation core is covered without HTTP
- [ ] No out-of-scope functionality added
- [ ] Problem handling covers every case in section 9
- [ ] Assumptions verified or documented; open points O-001 and O-002 decided in the plan
- [ ] Memory Bank and the `architecture:` snapshot updated in the same change set
- [ ] Quality gate green: `npx eslint .` → `node --test`
- [ ] Accepted by the user

## 16. Recommended next steps

1. `/sdd-plan` to turn this spec into a baby-step plan, deciding O-001, O-002 and A-003.
2. `/sdd-lifecycle` to move the spec-plan pair from `backlog/` to `active/` when work starts.

## Plan history

- 2026-09-19 — [0001-split-bill-with-tip.2026-09-19.plan.md](../plan-archive/0001-split-bill-with-tip.2026-09-19.plan.md) — nine steps, all verified; AC-001 … AC-020 proven by `node --test` (37 pass / 0 fail) with `npx eslint .` clean.
