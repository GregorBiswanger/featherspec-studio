# 13 · Click test round 3: results (12 B-4 … B-6)

Draft: artifact `2HPSzmxus6hhKPkuGm47wp`, version `1795082388-7ca2`. That version includes the corrections B-1…B-3:
- `Send it once …`;
- `1 of 2 returned · T-004 not back yet`;
- the reason text that depends on the version;
- `43%`;
- `Move back to Ready`;
- "vor 1.11.0 (z. B. 1.10.0)";
- solved and ease per task.

Status: **partly run, then ended** (Gregor alone, 2026-11-19). Gregor did tasks 1 to 3, then stopped: "too complicated with the situations and tasks, too little time; I'd rather use the finished product and give feedback then." Decision (orchestrator as product owner, by Gregor's "continue to completion"): the click test closes with these results. The remaining proxies stay as the specs decided them, and the real use on `tip-splitter` (12 F-3) takes over the open tasks 4 to 6.

## Tasks

| # | Person | First look | Expected | Solved (yes / no / with help) | Ease 1–7 | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Gregor | First the Next step text `Continue … · Implement T-004`. Asked: "where do I find what T-004 means?" | A click on the step ID in the Next step | with help (first try), then yes via Overview → detail → Plan map | — | In the draft the step ID is a link only in "Next open step" and in the map chips. The ID in the Next step and in an Overview row is not a link: finding **K-1**. "Can run in parallel" was seen and understood. |
| 2 | Gregor | Send button in the Next step | Send | yes | — | Used the default (Send to Copilot). The variant "current chat" in the chevron menu was not looked for: chevron discoverability not shown (12 B-5 rule) → **K-2**. |
| 3 | Gregor | `Now` list (the blue Send button of the first row) and the spec in **Up next** (0002 Ready) | — | no | — | Mixed up the situation and the spec: forgot to switch to S2 at first; then looked at 0002 (Ready, `0 of 4`, Implement T-001) instead of 0001, saw "no ticks" and no model hint. → **K-3** (the model hint is only in the `(?)`), **K-4** (the click test's situation picker was too hidden), **K-5** (with many specs in Now, the blue primary of the first row pulls attention). |
| 4 | — | — | — | not run | — | Covered by F-3 real use (interruption). |
| 5 | — | — | — | not run | — | Covered by F-3 real use (parallel run with return note). |
| 6 | — | — | — | not run | — | Covered by F-3 (open the plan at a step). |

## Findings and decisions

- **K-1 (P1, 0025):** Every step ID shown in a Next step (intent line and short form) and in an Overview row becomes a step link: a click opens the Plan map card (F-1), Ctrl/Cmd+click opens the file at the heading. Same component as "Next open step".
- **K-2 (P2, 0026):** The Send chevron shows the active choice with a check (12 B-5 rule, OP-006: check mark yes). The label stays `Send to Copilot`.
- **K-3 (P2, 0026):** The coach line (chat · model, e.g. `new chat · strong model, other family`) is visible under the Next step without opening `(?)`, once per view (G-5). Already the intent of G-5; verify that the Review/Verify case shows it.
- **K-4:** Click-test tooling only, no product change.
- **K-5 (P3, 0026):** Only the selected spec's Next step uses the blue primary style; Now rows use secondary buttons. Proxy, reviewed in F-3.

## Confirmation points 1–8

| # | Yes / no | Change |
| --- | --- | --- |
| 1–8 | not answered | Proxies stay as the specs decide (D-4 `Implement`, attachment line, short forms with `Move back to Ready`, report-first only before 1.11.0, codicons, D-2 one Next step, `43%`, Copy prompt only on the step due now). |

## Evaluation rules (12 B-5)

- **Task 2:** if the chevron is not found, it counts as not solved. Then the menu shows the active choice with a check, and the label stays `Send to Copilot` (0026 OP-006).
- **Task 5:** do the group view and the not-primary `Integrate` work?
- **Task 6:** opening the plan at the top with "Open plan" counts as half solved. Then make "Open in plan" more visible on the card.
- **Wording:** decide `Move back to Ready` (0026 OP-007).

## Consequences for the specs

- **0028:** no change from the test.
- **0025:** K-1 (step links in Next step and Overview rows).
- **0026:** K-2 (check mark in the menu, OP-006 decided yes), K-3 (coach line visible in the Verify case), K-5 (one blue primary). OP-007 `Move back to Ready` stays as proxy.
- **0027:** no change.
