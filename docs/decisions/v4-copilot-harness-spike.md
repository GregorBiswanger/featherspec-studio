# V-4 · Copilot harness: does Send still prefill and attach? (12 E-1, E-2)

Status: **prepared, run by Gregor on his machine** (VS Code 1.147, Copilot Chat 0.75). Record the answers in §3.

## 1 Why

- VS Code 1.146 (2026-11-11) deprecated the **Local harness**; it is removed in **February 2027**. The **Copilot harness** has been the default for new sessions since VS Code 1.143 (GitHub changelog 2026-11-16; VS Code docs "Move from the Local to the Copilot harness").
- The migration guide says prompt files should be converted to skills. The conversion may lose `agent`, `model` and `tools`. It does not say how `workbench.action.chat.open` with `query`, `isPartialQuery` and `attachFiles` behaves in a Copilot-harness session.
- The Studio sends only through that command (PD-074, PD-083). FeatherSpec's Copilot commands are `.github/prompts/sdd-*.prompt.md`.

## 2 What to check (about 10 minutes)

Use the installed Studio VSIX and the V-3 spike VSIX (`featherspec-spike-v3-0.0.3.vsix`), on `sdd-tip-splitter` or `C:\projects\test\tip-splitter`. Before each check, open a new chat and set **Session Target → Copilot**.

| # | Do | Look for |
| --- | --- | --- |
| H1 | Studio: Send a step to Copilot (new chat) | Is the prompt prefilled? Is anything sent automatically? |
| H2 | Spike V-3: Copilot with attachment | Does the file chip appear, and does it survive editing the prompt? |
| H3 | Type `/sdd-plan` in that chat | Is the FeatherSpec command offered and does it run? (prompt file in the Copilot harness) |
| H4 | Same as H3 with **Session Target → Local** | Control: does it run there? |
| H5 | **Chat: Open Customizations → Migrations** | Which FeatherSpec files are listed as needing migration? |

## 3 Results

| # | Result |
| --- | --- |
| H1 | _open_ |
| H2 | _open_ |
| H3 | _open_ |
| H4 | _open_ |
| H5 | _open_ |

**Consequence if H1 or H2 fails:** Copy prompt stays the fallback, with a toggletip explaining it (spec follow-up after 0027).

**Consequence if H3 fails:** FeatherSpec's Copilot path already breaks for default sessions. This makes the FeatherSpec 1.12 skills migration (12 E-3, E-4) urgent: it ships before February 2027, ideally in December.

## 4 E-2 result (checked 2026-11-19 in the code)

- The Studio's prompts depend only on the command names `/sdd-*` (`core/board/nextStep.ts`; setup prompts in `core/discovery/discoverWorkspace.ts`).
- The only place that reads a command folder is `core/discovery/classifyFolder.ts` (`hasSddCommand`, `.claude/commands/sdd-*.md`). It is used **only for legacy projects without a `FeatherSpecVersion:` stamp**. A stamped project (every version since 1.3) is recognised from `AGENTS.md` and `.specs/` alone.
- `.github/prompts/` is never read.
- So moving FeatherSpec's commands to skills does not affect project discovery or any prompt. One follow-up for the 1.12 move: let `hasSddCommand` also accept `.claude/skills/sdd-*/SKILL.md`, so an unstamped project with skills would still be recognised. That is a 3-line change and belongs in the 1.12 compatibility check (E-3).
