# Studio UX guidelines — rationale

The binding, short form is [`.claude/rules/ux-guidelines.md`](../../.claude/rules/ux-guidelines.md)
(loaded automatically when UI code is touched). This page says why each guideline exists and
where the evidence is. Source: the UX audit of 2026-11-17 in [`docs/ux-audit/`](../ux-audit/)
(German; codes such as Q-1, IA-5, R-03, K-D refer to it). Decisions: PD-058 … PD-062.

## The product in one sentence

FeatherSpec Studio shows every spec of a FeatherSpec project and its next step; the user's own
AI assistant does the work (PD-055, PD-056). Every guideline serves that sentence.

## Target picture: native first + one panel (PD-058)

| Surface | Holds |
| --- | --- |
| Activity Bar view "Specs" | the project as a grouped tree: In progress · Up next · Backlog · Done; each row with state, next step, inline Copy; badge = specs waiting for the user |
| Status bar | the current spec, its state and next step; click copies |
| Command | "Copy Next Step" |
| Panel "FeatherSpec Studio" | two tabs: Overview (now first, then up next, problems, one figures line, activity) and Board (read-only pipeline); the spec detail opens as a side panel in both |
| Editor | the spec and plan files themselves, opened beside the panel at the line |

Reached in five specs, in the audit's order: 0016 honest signals · 0017 next step everywhere,
no pseudo-moves · 0018 Overview and compact board · 0019 detail as a situation picture beside
the content · 0020 native spec tree, Spec Explorer area folded into tree and side panel.

## Why each guideline

| # | Guideline | Evidence |
| --- | --- | --- |
| 1 | Next step first | The core promise was reachable only after choosing an area and a spec (Q-1, IA-3). The rule set NS-1…NS-11 is the product's most valuable part (02 §3.8). |
| 2 | Visible action = possible action | Every card offered five move targets; five of six moves were always refused, the sixth moved nothing (Q-2, B 08–10, 26). |
| 3 | Honest signals, three tiers | The Studio's own repository, written with FeatherSpec 1.10.0, showed 83 warnings on all 15 specs; none needed an action; five flagged the `Successor:` line the Studio reads itself (Q-3). A fresh backlog spec showed red error icons (B 19). |
| 4 | Native first | The sidebar held five starter buttons and no state (IA-7, B 02); VS Code's view guidelines advise against tree items as command buttons and to use webviews only where the native API is not enough. |
| 5 | Do not duplicate the editor | One detail measured 4,952 px and 3,459 words (Q-5, IA-5); "Open file" hid the Studio (B 24). |
| 6 | User language | `S-READY`, `R-3`, "S-BACKLOG · persisted", "first observed · not checked" on tiles, cards and history (Q-4). |
| 7 | Present over past | 13 of 15 specs were Done and filled board and list; three of six columns were empty (IA-4, Q-7). |
| 8 | Keep the place | Clicking a card switched area; the board's status line shifted the layout; "Dismiss" was primary, "Copy" secondary (Q-6, B 08). |
| 9 | Kept from 0.1.0 | Theme fidelity, keyboard model, empty and error states were rated excellent (02 §5). |

## Not built for now (PD-061)

Phase bar per spec (R-19), diagnostics in the Problems panel (R-20), CodeLens in plans and file
decorations (R-21), activity from Git (R-22), "Send to chat" (R-23). Each needs validation with
users first; "Send to chat" also contradicts PD-056.

## How a change is checked against the guidelines

- Every new or changed visible text is in a text module and asserted by a test.
- Own repository as the yardstick: no visible warning without a real problem; the detail of
  the longest spec fits in about 1.5 screen heights; every spec shows its next step with at
  most one click from the tree, a card, the Overview and the status bar.
- Screenshots in Dark, Light and High Contrast from the preview harness before a release;
  Gregor's Hands-On on `tip-splitter` as the acceptance.
