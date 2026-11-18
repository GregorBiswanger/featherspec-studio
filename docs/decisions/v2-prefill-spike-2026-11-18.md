# V-2: can the Studio prefill an assistant's chat without sending? (2026-11-18)

Precondition V-2 of the review's work order ([08 §1](../ux-audit/08-spec-handoff.md)) for spec 0024;
Gregor's decision PD-068. Decision on the result: [PD-074](../product/product-decisions.md).

## Setup

A throwaway extension (`featherspec-spike-v2` 0.0.2, not in this repository) on Gregor's machine:
VS Code 1.147.0, GitHub Copilot Chat 0.75.0, Claude Code 2.1.327, Codex (`openai.chatgpt`)
26.1111.21308. Each attempt opened the assistant with a harmless test text; Gregor answered after
each one whether the text stood in the input and was not sent. Version 0.0.1 did not load (its
commands were not found); 0.0.2 activated on startup with two status-bar buttons.

## Results

| Assistant | Attempt | Result |
| --- | --- | --- |
| GitHub Copilot | `workbench.action.chat.newChat`, then `workbench.action.chat.open` with `{ query, isPartialQuery: true }` | new chat, text in the input, not sent |
| GitHub Copilot | `workbench.action.chat.open` with `{ query, isPartialQuery: true }` (current chat) | text in the current chat's input, not sent |
| Claude Code | URI `vscode://anthropic.claude-code/open?prompt=<text>` via `vscode.env.openExternal` | new Claude Code tab, text in the input, not sent |
| Claude Code | command `claude-vscode.editor.open` with `(undefined, <text>)` | new Claude Code tab, text in the input, not sent |
| Codex | `chatgpt.newChat` without argument | new chat, input empty (as expected) |
| Codex | `chatgpt.newChat` with `{ prompt }` | new chat, input empty: no prefill |

The extension also listed the registered commands: Codex offers `chatgpt.newChat`,
`chatgpt.newCodexPanel`, `chatgpt.openSidebar`, `chatgpt.addToThread` and others, none documented
with a prompt argument; Claude Code also offers `claude-vscode.primaryEditor.open` and
`claude-vscode.sidebar.open`.

## V-1, Copilot part

Same extension, `C:\projects\test\tip-splitter-v1-ns6` (T-001 done): a new Copilot chat (agent mode)
with `Implement T-002 of .specs/active/0001-tip-splitter.plan.md` first said where the plan stands
and then built exactly T-002 and stopped (Gregor's answers: "one step", "reconciled: yes"). With
[v1-ns6-wording-2026-11-18.md](v1-ns6-wording-2026-11-18.md) this confirms NS-6 variant A for
Claude and Copilot.

## Consequence

- Copilot and Claude Code can be offered for "Send" (prefill, never send).
- Codex cannot be prefilled: by PD-068 the action for it stays **Copy prompt**.
- Not tested: whether a prompt such as `/sdd-plan …` runs as a FeatherSpec command in Codex
  (08 V-2 last row); irrelevant while Codex is not offered for sending.
