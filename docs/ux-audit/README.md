# UX/UI audit of FeatherSpec Studio 0.1.0 (2026-11-17)

Source document, kept as delivered (German), like `docs/product/po-handoff.md`. It was made on
commit `3c2b8b7` with the real VSIX in an isolated code-server 4.145.2 (VS Code 1.145.2), driven
by Playwright, on five workspaces, in Dark, Light and High Contrast, at two window widths.

| File | Content |
| --- | --- |
| [01-product-understanding.md](01-product-understanding.md) | Product, users, workflow, evidence codes |
| [02-current-experience-audit.md](02-current-experience-audit.md) | Scenarios run, component ratings, cross-cutting problems Q-1…Q-7 |
| [03-information-architecture.md](03-information-architecture.md) | Current IA, problems IA-1…IA-7, alternatives A/B/C, target hierarchy |
| [04-ux-ui-concepts.md](04-ux-ui-concepts.md) | Concepts K-A…K-M, text table |
| [05-prioritized-recommendations.md](05-prioritized-recommendations.md) | R-01…R-23 with priority, effort, validation; stages |
| [06-executive-summary.md](06-executive-summary.md) | Summary |
| [screenshots/](screenshots/) | 30 screenshots referenced as [B nn] |
| [07-implementation-review.md](07-implementation-review.md) | Review of the round 0016–0020 at `045b354` (2026-11-18): audit recommendations checked, new findings N-1…N-9, Gregor's feedback, concept K-N plan map (§6), assistant choice and guidance (§6a) |
| [08-spec-handoff.md](08-spec-handoff.md) | Work order for specs 0021–0024: order, preconditions V-1 and V-2, rules, texts, draft criteria, open decisions E-1…E-12, guideline changes |
| [screenshots-045b354/](screenshots-045b354/) | 23 screenshots of `045b354` (`n01`…`n22`) and Gregor's `g01`, referenced in 07 and 08 |

How the product acts on it: decisions PD-058 … PD-062 (audit) and PD-068, PD-069 (review) in
[product-decisions.md](../product/product-decisions.md), the UX guidelines in
[ux-guidelines.md](../product/ux-guidelines.md) (binding rule: `.claude/rules/ux-guidelines.md`),
and specs 0016 … 0020 (audit) and 0021 … 0024 (review).

Not checked by the audit: Windows desktop, the setup's success path, Restricted Mode, a screen
reader. Full-window screenshots of the board in the Light theme render dark by mistake (headless
artefact); the element screenshot and the computed styles are correct.
