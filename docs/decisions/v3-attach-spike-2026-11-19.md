# V-3 · Attach the spec when prefilling the chat (spike, 2026-11-19)

**Question (09 §6, PD-082):** Can the Studio attach the spec file as real context when it prefills GitHub Copilot or Claude Code, without sending? Does the user see it, and does the agent then still read the file again?

**Setup.** Gregor ran a throwaway test extension (`featherspec-spike-v3` 0.0.3) on his machine:
- VS Code 1.147.0, GitHub Copilot Chat 0.75.0, Claude Code 2.1.327, Windows 11;
- workspace `sdd-tip-splitter`, spec `.specs/active/0001-tip-splitter.md` (17 KB), FeatherSpec 1.10.0 commands.

Raw results: `C:\projects\featherspec-studio.sync\spike-v3-results.json`.

## Results

| # | Attempt | Result |
| --- | --- | --- |
| C1 | Copilot: `workbench.action.chat.newChat`, then `workbench.action.chat.open { query: "/sdd-clarify <spec>", isPartialQuery: true, attachFiles: [specUri] }` | **Prompt in the input, a file chip for the spec, nothing sent** |
| C2 | Copilot: the user edits the prompt before sending | **The chip stays** |
| C3 | Copilot: send C1 | **The agent read the attached spec again with a tool**: double load with FeatherSpec 1.10.0 |
| C4 | Copilot, current chat with a typed draft | not answered (Gregor typed no note); OP-004 is decided anyway: new chat by default (PD-078) |
| C5 | Copilot: attach a temporary file, then rename it on disk | **The chip keeps the old name** |
| K1 | Claude Code: `claude-vscode.editor.open(undefined, "@<spec> /sdd-clarify <spec>")` (`@` first) | **Not attached** (the file shows as text only) |
| K2 | Claude Code: send K1 | read the spec with a tool; expected, since nothing was attached |
| K3 | Claude Code: `claude-vscode.editor.open(undefined, "/sdd-clarify <spec> @<spec>")` (`@` last) | **A file chip, prompt in the input, nothing sent** |

Gregor's own words afterwards, in German: „Dateien wurden angehängt und mit neuen Chat-Verlauf wenn man ‚Send to …' geklickt hat. Alles bestens.“ In English: the files were attached, in a new chat, when he clicked "Send to …"; all fine.

## Consequences

1. **Copilot:** the Studio attaches the spec with `attachFiles` on the same `workbench.action.chat.open` call it already makes (PD-074). It still never submits: `isPartialQuery: true`, and `preserveInput` is not used.
2. **Claude Code:** the Studio appends ` @<spec path>` at the **end** of the prefilled prompt. A leading `@` is not attached.
3. **Copy prompt stays unchanged** (PD-068). The clipboard has no attachments, and the copied text carries no assistant-specific syntax.
4. **Double load is real.** With FeatherSpec 1.10.0 both agents read the attached spec again. The fix belongs in FeatherSpec ("if the spec is attached to the conversation, use it; do not read it again", PD-082), not in a Studio prompt suffix (09 §6). Re-measure with both assistants after that FeatherSpec update.
5. **A renamed spec keeps a stale chip name in Copilot.** Attach at send time from the current path. A rename that happens while the chat waits is the user's to notice. The Studio does not watch it.
6. **Large specs:** this run used 17 KB. The Studio's own specs (30–45 KB) were not measured. 0027 should name the cost in its assumptions, and the FeatherSpec QA re-measures with one large spec.
