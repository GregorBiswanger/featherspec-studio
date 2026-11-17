---
paths:
  - src/webview/**
  - src/adapters/vscode/**
  - src/shared/protocol/**
  - src/core/board/**
  - src/core/missionControl/**
  - src/core/shell/**
  - package.json
---

# Studio UX guidelines (binding for every UI change)

Source: UX audit 2026-11-17 (`docs/ux-audit/`), decisions PD-058 … PD-062; rationale and
examples in `docs/product/ux-guidelines.md`. A spec may deviate only by naming the guideline.

1. **Next step first.** Every surface that shows a spec answers "what is the next step?" before
   anything else, with one action: Copy. The single source is `nextStep()`; never derive a
   step elsewhere. Short form where space is tight, full line with path when copied.
2. **Visible action = possible action.** No control that is always refused or has no effect
   (no drag, no move menu). Disable or remove; never offer a dead end.
3. **Honest signals, three tiers.** *Problem* (contradiction, unreadable, duplicate, dead plan
   link) is shown with a warning wherever the spec appears. *Format note* is a collapsed
   count in the detail only. *Compatibility* (variants FeatherSpec itself writes) is not
   reported. A normal state (a fresh backlog spec) is never shown as an error.
4. **Native first.** Prefer TreeView, status bar, quick pick, Problems over the webview.
   Tree rows are items with state, not command buttons. The webview is for overview and board.
5. **Do not duplicate the editor.** Show the state of a spec (next step, progress, open
   criteria, next open step, files), not its full text; IDs and "Open" go to the file at the
   line, beside the panel (`ViewColumn.Beside`).
6. **User language.** No rule IDs (`S-READY`, `R-3`, `NS-7`), no implementation words
   ("model", "persisted", "first observed") in visible text; they may sit in a tooltip.
   Absences that can never be filled (priority, compile verdict, dependencies) are not shown.
7. **Present over past.** In progress and up next come first; Done is collapsed or last;
   empty columns and sections take minimal space; zero tiles carry no explanation.
8. **Keep the place.** Selecting a spec never switches area; feedback appears at the control
   that caused it, without layout shift. Primary button = the action the user came for.
9. **Kept from 0.1.0:** VS Code theme variables only (Dark, Light, High Contrast), visible
   focus, full keyboard path, `aria-live` feedback, empty and error states with a way out.
10. **Texts** live in the text modules and are asserted literally by tests (English, PD-016).
