# Round invoice totals once

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Sum the unrounded line totals and round the invoice total once, instead of rounding every line.

## 2. Goal and problem

Finance reports cent-level differences between our invoices and the totals in the accounting
system, which rounds once at the end.

## 3. Acceptance criteria

**AC-001 — Rounding happens once**
When an invoice total is computed, the system shall sum the unrounded line totals and shall round
the sum once.

**AC-002 — The nightly export keeps working**
When the nightly export runs, it shall export the recomputed totals.
