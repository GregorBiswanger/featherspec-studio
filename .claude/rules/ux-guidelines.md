---
paths:
  - src/webview/**
  - src/adapters/vscode/**
  - src/shared/protocol/**
  - src/core/board/**
  - src/core/overview/**
  - src/core/shell/**
  - package.json
  - .specs/**
---

# Studio UX guidelines (binding for every UI change)

Source: UX audit 2026-11-17 and implementation review 2026-11-18 (`docs/ux-audit/`, 07, 08),
decisions PD-058 … PD-062 and PD-069; rationale and examples in `docs/product/ux-guidelines.md`.
A spec may deviate only by naming the guideline.

1. **Next step first, intent before command.** Every surface that shows a spec answers "what
   will happen next?" in words, then the prompt, with one action: **Copy prompt** (or Send to
   the chosen assistant, PD-068). The single source is `nextStep()`; never derive a step
   elsewhere. Short form where space is tight (intent, then command; shorten the title, never
   the command), full line with path when copied.
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
   that caused it, without layout shift. Primary button = the action the user came for; at
   most two primary buttons per view.
9. **Kept from 0.1.0:** VS Code theme variables only (Dark, Light, High Contrast), visible
   focus, full keyboard path, `aria-live` feedback, empty and error states with a way out.
10. **Texts** live in the text modules and are asserted literally by tests (English, PD-016).
11. **Guide, don't crowd.** Session and model advice appears once per view (detail, first Now
    row), in model classes, never as product-bundled model names; the full reasoning sits
    behind a `(?)` toggletip that keyboard users reach.
12. **Check at narrow width.** Every layout change is previewed in Dark, Light and High
    Contrast at 1600 px and 1000 px window width with the side panel open; containers adapt to
    their own width, not to the viewport.
