# UX/UI audit of FeatherSpec Studio 0.1.0 (2026-11-17)

**Valid now (2026-11-19):** the guidelines in [ux-guidelines.md](../product/ux-guidelines.md) and the closing state in [14-final-review.md](14-final-review.md). Files 01–13 are history: they record how the product got there and are not to be acted on again.

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
| [09-round2-review.md](09-round2-review.md) | Review of round 2 (specs 0021–0024) at `48d1968` (2026-11-19): work order 08 checked, the eight deviations judged, findings G-1…G-11, Gregor's feedback F-1 (step → plan map) and F-2 (percent), V3 (spec attached when sending), hand-off for round 3 (0025–0028) |
| [screenshots-48d1968/](screenshots-48d1968/) | 10 screenshots of `783b067` (`r01`…`r12`) and Gregor's `g-r2-01`, `g-r2-02`, referenced in 09 |
| [10-team-briefing-round3.md](10-team-briefing-round3.md) | Team briefing for round 3: where everything lives, specs 0025–0028, open decisions, process rules, FeatherSpec update candidates |
| [11-round3-clicktest-review.md](11-round3-clicktest-review.md) | Review of the round-3 click-test draft (8 confirmation points, 6 tasks), FeatherSpec 1.11.0 from the QA report, answers to the four go questions |
| [12-finish-plan.md](12-finish-plan.md) | **The one work list until done:** definition of done, order, click test, FeatherSpec 1.11.0 release, specs 0028/0025/0026/0027 with tasks, Copilot-harness safeguard, final review, freeze |
| [13-clicktest-results.md](13-clicktest-results.md) | Gregor's click test of round 3 (tasks 1–3), findings K-1…K-5 |
| [14-final-review.md](14-final-review.md) | **Current state:** closing review of round 3 (0025–0028), verification, Gregor's open list, risks |
| [15-post-round3-review.md](15-post-round3-review.md) | Review of the post-round-3 fixes 0029–0031 and PD-090–092 at `fbf8830` (2026-11-20): all seven wishes met, findings H-1…H-9, answers to the open questions (plan Tip, 0027, merge PR #2, Gregor's checks) |
| [screenshots-fbf8830/](screenshots-fbf8830/) | 11 screenshots of the VSIX at `3773816` (`x01`…`x15`), referenced in 15 |
| [16-release-handoff.md](16-release-handoff.md) | **Last work order before release:** decisions PD-093–PD-095, spec 0032 "Release polish" (AC-001…AC-008), checks, release steps, clean-up |

How the product acts on it: decisions PD-058 … PD-062 (audit) and PD-068, PD-069 (review) in
[product-decisions.md](../product/product-decisions.md), the UX guidelines in
[ux-guidelines.md](../product/ux-guidelines.md) (binding rule: `.claude/rules/ux-guidelines.md`),
and specs 0016 … 0020 (audit) and 0021 … 0024 (review).

Not checked by the audit: Windows desktop, the setup's success path, Restricted Mode, a screen
reader. Full-window screenshots of the board in the Light theme render dark by mistake (headless
artefact); the element screenshot and the computed styles are correct.
