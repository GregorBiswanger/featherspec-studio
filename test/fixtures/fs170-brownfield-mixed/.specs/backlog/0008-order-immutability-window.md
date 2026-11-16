# Correction window after payment

**Status:** Draft
**Plan:** _none yet_

## 1. Summary

Allow the shipping address of a paid order to be corrected within 30 minutes of payment, through
a correction event rather than a projection update.

## 2. Goal and problem

Support corrects addresses today by calling `updateOrderAfterPayment`, which writes straight to
the projection. The change is invisible in the event stream and disappears on the next rebuild.

## 3. Acceptance criteria

**AC-001 — Corrections are events**
When a paid order is corrected within the window, the system shall append an `OrderCorrected`
event and shall not write the projection directly.

**AC-002 — The window is enforced**
If more than 30 minutes have passed since payment, then the system shall refuse the correction.
