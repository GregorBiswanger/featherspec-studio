# Send the Next Step to My Assistant

**Status:** In Progress
**Plan:** [0024-send-next-step-to-assistant.plan.md](0024-send-next-step-to-assistant.plan.md)

Basis: review `docs/ux-audit/07-implementation-review.md` §6a (2026-11-18) as cut in `docs/ux-audit/08-spec-handoff.md`
§5 (S-1…S-6, AC drafts, E-11, E-12). Decisions: **PD-068** (Gregor, E-6; supersedes PD-056's "the Studio opens no
chat" for this case and decides what PD-061 (2) deferred, "Send to chat"), **PD-074** (V-2 result, record
`docs/decisions/v2-prefill-spike-2026-11-18.md`), PD-069 (round, click test), PD-076 (click test passed), PD-075, PD-047,
PD-013, PD-016. Guidelines 1, 2, 8–12 (`.claude/rules/ux-guidelines.md`). Builds on **0021** (intents, prompts, Copy
prompt, coach line and its session column, `(?)`, the first `contributes.configuration`) and **0022** (layout; button
hierarchy: at most two primary buttons per view, list Copies are icon buttons; the detail alone below 900 px, G-4);
restates neither. 0021, 0022 and 0023 are implemented (In Progress). No interview: Gregor delegated the round (PD-069);
every choice is a proxy in §11.

## 1. Summary

In the settings the developer may choose GitHub Copilot or Claude Code, the assistants whose chat input the Studio
can fill (PD-074). Chosen and installed, the next step's primary button (detail, first Now row) becomes **Send to
<Name> ▾**: it opens the assistant's chat with the prompt in the input and never submits it; its menu holds the other
target and **Copy prompt**. Otherwise (no choice, Codex, not installed) all stays Copy prompt; a failed open copies,
says so.

## 2. Goal and problem

0021 tells what a step does and where to run it; the hand-over is still copy, switch to the chat, open a new one when
advised, paste (07 §6a). Goal: one click puts the prompt where the step belongs, while the human keeps chat, model
and the send (08 S-3). Success: on `tip-splitter` Gregor reaches a prefilled chat from the detail with one click in
Copilot and in Claude Code, nothing is sent, and a failed open still leaves the prompt on the clipboard (AC-017).

## 3. Users and roles

Developer, one role (0001–0007), with Copilot, Claude Code or any other assistant; the assistant gets only the prompt.

## 4. Scope

### In scope

- Setting `featherspec-studio.assistant` (§6.1) and the offer rule (§6.2).
- The split button at the two places where 0022 §4.4 (1), (2) makes a next step's Copy primary (§6.3).
- Send with exactly PD-074's calls (§6.4), fallback to Copy prompt (§6.5), never submit, nothing written (§6.6).
- Open Settings in the Specs view's toolbar (§6.7); toggletip sentences (§6.8); §5; README, CHANGELOG, checklist.

### Out of scope

*Amended by 0025 (PD-082): the Plan map header's first line follows this spec's Send rules as the detail's does (0025 §5.3, AC-009, AC-010).*

- Codex — because it cannot be prefilled (PD-074); by PD-068 it is not offered and stays Copy prompt (A-003, OP-002).
- Submitting, choosing a model or mode, reading the answer — because the human submits (PD-068) and PD-055.
- A "current chat" target for Claude Code — because V-2 verified only the new tab (OP-003).
- Prompt wording per assistant (08 S-5) — because both assistants run 0021's prompts as they are (PD-072, PD-074).
  *Amended by 0027 (PD-082, PD-083): the prompt stays the line; only Claude Code's prefilled text adds ` @<spec path>`; the clipboard and Copy prompt carry the line alone (0027 §6.4, §6.6).*
- A quick pick on the first click (08 S-1) — because PD-068 keeps Copy prompt until the user chooses (A-002).
- Send on further detail lines, other rows, cards, tree, status bar, quick pick, the zero-spec state, the plan map
  (0023), 0014's setup copies — because only the two places show the session advice (0021 A-002; A-005).
- A provider preset, order by preference or a "recommended" mark — because PD-068 presets no provider (08 S-6).
- Placement of the split button inside rows and the detail — because 0022 owns layout; this spec owns the control.

## 5. Amendments of other specs

Applied in the implementing change set as a note directly under each statement: "*Amended by 0024 (PD-068): …*";
where 0021 or 0022 also amend it, their notes come first. The PD register is not edited. **Catch-all** (one note at
the head of 0015, 0018, 0019, 0021, 0022, 0023): where Send is offered (§6.2), the Copy prompt of the detail's first
next-step line and of the first Now row is 0024's split button — for its place, what follows it, its width ("every
Copy", "the widest Copy") and the primary count (once, both parts primary); its menu holds Copy prompt. Among them
0015 AC-003; 0018 O-5, AC-006; 0019 §6.2 row 2; 0021 §6.4, §6.5, AC-001, AC-009; 0022 §4.1, §4.4 (1), (2), AC-001,
AC-010, AC-011, AC-019 "at most two filled buttons", AC-028; 0023 AC-010 "at most one (the side panel's …)".

| Spec · statement | Amendment |
| --- | --- |
| 0015 §4 out of scope "Opening, filling or driving a chat … (PD-056)"; 0017 §4 and 0020 §3 out of scope "Send to chat" (PD-061 (2)) | Opening the chosen assistant's chat and filling its input: 0024 (PD-068; AC-017, AC-019 validate it); submitting stays out |
| 0015 AC-015 (as 0021 amended); 0021 §6.7, AC-016 "exactly the keys of §6.7" | Plus `featherspec-studio.assistant` (0024 §6.1) |
| 0015 AC-021 `copilot` in `src` and `package.json`; AC-025 "Copilot" in `README.md`, `docs/release-checklist.md` | Except 0024's own names of GitHub Copilot (value, extension ID, §7's texts, AC-015's lines); every other term, `provider` included, stays forbidden |
| 0016 §6.5 "Nothing else appears, moves or changes colour" | Except 0024 §6.5's warning after a Send that copies |
| 0021 §6.6 paragraphs 3 and 4; AC-015 "each closing sentence" | 0024 §6.8 |
| 0021 §6.6, AC-014 "opening one toggletip shall close any other" | It also closes 0024's menu; opening the menu closes the toggletip |
| 0019 §6.1 *Close*, AC-003 "Escape while focus is inside the side panel" (as 0021 amended); 0022 G-4, AC-029 "Escape inside the detail (0021's toggletip excepted)" | Not while 0024's menu is open: that Escape closes only the menu |
| 0019 AC-020 — an offer change hands focus to the replacing Copy prompt (0024 AC-010) | "keep focus on the same control where it still exists, else on its heading" holds, except that focus on a split button that an offer change removes moves to the Copy prompt that replaces it in the same place; no other row, card or way receives it |
| 0020 §4.3 *Toolbar*; AC-011 `view/title` group `navigation` | Third: `featherspec-studio.openSettings` (0024 §6.7) |
| 0017 AC-023; 0021 AC-017 (no writes) | Also every Send, menu item and Open Settings (0024 AC-012) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016 (test audits) | Also except the tests 0024 AC-014 lists against a statement this table replaces |

## 6. Business rules

### 6.1 Setting (S-1, E-12)

Contributed in 0021's `contributes.configuration` (title `FeatherSpec Studio`); read at activation and on every
change; never written by the Studio. Key `featherspec-studio.assistant`: type string, default `"none"`, enum `none`,
`copilot`, `claudeCode` with the labels and descriptions of §7, scope `window` (user value, a workspace may override;
A-001). The manifest lists the key in `capabilities.untrustedWorkspaces.restrictedConfigurations`. The *effective
value* is what VS Code returns for the key: trusted, a workspace value over the user value; in Restricted Mode the
user value only (Workspace Trust guide, read 2026-11-18: "will only return the user-defined value"). An effective value
outside the enum (`codex` typed by hand included) or a non-string acts as `none` (A-003, A-004).

### 6.2 Offer (PD-068, PD-074, guideline 2)

| Assistant | Value | Extension ID | Targets | Verified by V-2 (PD-074) |
| --- | --- | --- | --- | --- |
| GitHub Copilot | `copilot` | `GitHub.copilot-chat` | new chat, current chat | VS Code 1.147.0, Copilot Chat 0.75.0 |
| Claude Code | `claudeCode` | `anthropic.claude-code` | new chat | VS Code 1.147.0, Claude Code 2.1.327 |

*Send* opens the assistant's chat with the prompt in its input; *submitting* it is the human's, never the Studio's
(PD-068, 08 S-3). Send is **offered** while the effective value names an assistant of this table and
`vscode.extensions.getExtension` returns its extension (installed and enabled in the Studio's extension host, A-014).
Otherwise the Studio renders exactly what 0021 and 0022 define: no split button, no Send text. The offer follows
configuration and extension changes (AC-010).

### 6.3 Split button (S-2)

- **Place:** where Send is offered, the detail's first next-step line and the first Now row, where it has a line (0021
  §6.5, 0022 §4.4 (2)), show a split button instead of 0021's Copy prompt: main part and arrow part side by side, one
  primary control (A-013).
  *Amended by 0025 (PD-082): not on returned work's `Integrate` line while U-08 shows: it is secondary (0025 §5.6, AC-026).*
  *Amended by 0026 (PD-082): the first Now row's split button is secondary; the detail's first line holds the one primary control (0026 §6.5, AC-024).*
  *Amended by 0027 (PD-082, PD-083): followed by 0027 §6.3's attachment line where the view carries one; it stays during feedback (0027 AC-003).*
  *Amended by 0031 (follow-up Send): also each follow-up line of the detail and the Plan map header, as a secondary split button (0031 §6.1).*
- **Main part:** text `Send to <Name>` (`Copilot`, `Claude Code`; A-011). It sends to the default target: Copilot
  `new chat` where the first line's session (0021 §6.1, §6.2) is `new chat`, else `current chat`; Claude Code always
  `new chat` (A-007). Name and tooltip `Send to <Name> (<target>): <line>`, `<target>` = `new chat` · `current chat`.
  *Current chat* is the chat Copilot shows now, the one `open` fills (V-2); 0021's "same chat" continues there.
  *Amended by 0026 (PD-080): 0021's coach line calls it current (`current or new chat`, 0026 §6.2).*
  *Amended by 0026 (PD-078): `new chat` for both assistants and every step (0026 §6.1, AC-001); the example of AC-005 records `newChat`, then `open`; A-007 is void; the Send items are `menuitemradio`, the active one checked (0026 AC-022).*
- **Arrow part:** a button with a down-pointing glyph (`aria-hidden`; no icon font, 0021 A-008), name `More actions:
  <line>`, tooltip `More actions`, `aria-haspopup="menu"`, `aria-expanded`. Its menu (`role="menu"`, labelled by the
  arrow part; items `role="menuitem"`, each named by its text; nothing else in it): Copilot `Send to a new chat`, `Send
  to the current chat`, `Copy prompt`; Claude Code `Send to a new chat`, `Copy prompt`. `Copy prompt` does what 0021
  §6.4's Copy prompt does.
- **Keys and pointer** (WAI-ARIA APG Menu Button pattern): Enter, Space or ArrowDown on the arrow part opens the menu
  and focuses the first item, ArrowUp the last; ArrowDown and ArrowUp move with wrap, Home and End to the ends; Enter,
  Space or a click activates an item and closes the menu; Escape closes it; after either, focus is on the arrow part.
  Tab (focus moves on), a pointer press outside menu and arrow part, or the split button going away closes it. That
  Escape closes only the menu, also in the side panel and in the detail alone (0022 G-4). One popup at a time: opening
  the menu closes 0021's toggletip and the other way round. The menu lies over the content and shifts nothing.
- **Feedback** (A-009) on the main part, wherever the activation came from; nothing changes while a Send is pending.
  From the result until 2000 ms after the last result (0016 §6.5's 2 s): success — text `Opened in <Name>`, name
  `Opened in <Name>: <line>`, §7's sentence as tooltip and announced in its live region; Copy prompt item and fallback —
  the texts, names and announcements of 0021 §6.4 and 0016 T-19. The main part keeps `min-width: 22ch`; the arrow
  part's target is at least 24 × 24 px (WCAG 2.2 SC 2.5.8).
  *Amended by 0027 (PD-082, PD-083): for a Send whose attachment 0027 §6.5 drops, 0027 §7's sentence without the spec as tooltip and announcement (0027 AC-009).*
*Amended by 0032 (0032 §6.6): every line's Send split button stands on its own row under its prompt, whatever the prompt's length and the view's width.*

### 6.4 Send (S-4, PD-074: exactly these calls; A-006)

| Assistant · target | Calls, in this order |
| --- | --- |
| Copilot · new chat | `workbench.action.chat.newChat` without argument; then `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true }` |
| Copilot · current chat | `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true }` |
| Claude Code · new chat | `claude-vscode.editor.open` with the arguments `undefined`, `<line>` |

*Amended by 0027 (PD-082, PD-083): where the Send view carries an attachment, the calls are 0027 §6.4's (Copilot's `open` argument adds `attachFiles: [<spec URI>]`, Claude Code's text adds ` @<spec path>`); otherwise unchanged (0027 AC-004, AC-005, AC-006).*

The request names the assistant and target the control shows and its line. If the effective value no longer names
that assistant (none, or the other one), the host copies as Copy prompt does, with no warning and no Output line.
Otherwise, before the first call, it checks in order: `getExtension` returns the assistant's extension; it is active,
else the host activates it (A-008); `vscode.commands.getCommands()` holds every command of the row. A Send whose checks
and calls have not all settled 5000 ms after its activation has failed; a later result changes nothing (A-015).
`<line>` is the full prompt the control shows (0021 §6.3, 0017 §8), never intent or coach text; Send leaves the
clipboard alone.

*Amended by 0027 (PD-082, PD-083): the prompt stays the line; only Claude Code's prefilled text adds ` @<spec path>`; the clipboard and Copy prompt carry the line alone (0027 §6.4, §6.6).*

*Amended by 0027 (PD-082, PD-083): then 0027 §6.5's check: the spec path is a spec entry of the current model and the file exists, within the same 5000 ms (0027 AC-009, AC-010).*

### 6.5 Fallback (S-4)

If a check of §6.4 fails, a call rejects or the 5000 ms pass, the host makes no further call, copies the line as Copy
prompt does, shows §7's warning once as a VS Code warning notification without actions (`Cmd+V` on macOS, else
`Ctrl+V`) and writes one Output line with the cause, never the line (0005 §11); nothing else (A-010). Guideline 8 holds
at the control (`Copied`); the notification adds the cause and the paste key, which the button cannot hold.

### 6.6 Never submit, nothing written (S-3, PD-068, PD-013)

The Studio calls no command that submits a chat input, never calls `workbench.action.chat.open` without
`isPartialQuery: true`, calls no Codex command (`chatgpt.*`) and opens no `vscode://` URI. No webview message names a
command: the host takes the calls from §6.4's table only. Send, the menu and Open Settings create, change, move or
delete no workspace file, write no setting and reach no network.

*Amended by 0027 (PD-082, PD-083): the send request may also hold `attach`, a spec path; the host attaches nothing else (0027 §6.5); the search adds `preserveInput`, `modelSelector` (0027 AC-007).*

### 6.7 Open Settings (S-1)

Command `featherspec-studio.openSettings`, title `FeatherSpec Studio: Open Settings`, icon `$(gear)`, third in the
Specs view's toolbar (group `navigation`, after 0020's Open and Refresh) and in the Command Palette; it runs
`workbench.action.openSettings` with `@ext:GregorBiswanger.featherspec-studio` (A-012).

### 6.8 About this step (0021 §6.6)

While Send is offered the toggletip's third paragraph is §7's Send sentence; the fourth is §7's settings sentence always.

*Amended by 0027 (PD-082, PD-083): followed by 0027 §7's update sentence where 0027 §6.2's version gate withholds an attachment (0027 AC-011).*

## 7. Texts (English, PD-016; text modules and manifest, asserted literally; confirmed by the click test, PD-076)

| New | Replaces |
| --- | --- |
| Setting description `Your AI assistant for the next step. Send opens its chat with the prompt in the input and sends nothing; Copy prompt stays in the button's menu. Only assistants whose input the Studio can fill are listed.` | — (no setting) |
| Labels `None: Copy prompt` · `GitHub Copilot` · `Claude Code`; descriptions `Copy the prompt and paste it into any assistant.` · `Open Copilot's chat with the prompt in its input. Needs the GitHub Copilot Chat extension.` · `Open a Claude Code tab with the prompt in its input. Needs the Claude Code extension.` | — |
| Main part `Send to Copilot` · `Send to Claude Code`; name and tooltip `Send to <Name> (new chat): <line>` · `Send to <Name> (current chat): <line>` | 0021's `Copy prompt` at the two places of §6.3 |
| Arrow part name `More actions: <line>`, tooltip `More actions`; items `Send to a new chat` · `Send to the current chat` · `Copy prompt` | — |
| Feedback `Opened in <Name>`, name `Opened in <Name>: <line>`; tooltip and announced `The prompt is in <Name>'s chat. Check it, then send it there.` | — |
| Warnings `Could not open <Name>'s chat. The prompt is copied: paste it there with Ctrl+V.` (`Cmd+V` on macOS) · `Could not open <Name>'s chat, and the prompt could not be copied.` | — |
| Output `Send to <Name> failed (<cause>); the prompt was copied instead.` · `Send to <Name> failed (<cause>); the prompt could not be copied either.`; causes `extension <ID> not found` · `activating <ID> failed: <message>` · `command <command> not found` · `<command> failed: <message>` · `no result within 5000 ms` | — |
| Toggletip `Send to <Name> puts the prompt into its chat and sends nothing: choose the model there, check the prompt, then send it.` | 0021 §6.6 paragraph 3, while Send is offered |
| Toggletip `Settings (gear in the Specs view): Show Step Tips hides these tips; Model Hints names your models; Assistant opens your AI assistant's chat with the prompt.` | 0021 §6.6 paragraph 4 |
| Command `FeatherSpec Studio: Open Settings` | — |
*Amended by 0026 (PD-078): row Main part — name and tooltip `Send to <Name> (new chat): <line>` for every step; `(current chat)` names no main part any more (0026 §6.1, AC-001).*
*Amended by 0027 (PD-082, PD-083): followed by 0027 §7's update sentence where 0027 §6.2's version gate withholds an attachment (0027 AC-011).*

## 8. Error cases and edge cases

- Extension installed or enabled later → the split button within 500 ms (AC-010); remote window → A-014.
- A later assistant version renames a command → fallback, the Output line names it; the checklist line per assistant
  catches it before a release (AC-015, AC-017). The offer cannot see it before activation (A-008); guideline 2 holds,
  as every activation still copies and says so. `newChat` resolves, `open` rejects → an empty new chat stays open.
- A call resolves but leaves the input empty, or a later VS Code ignores `isPartialQuery` → invisible to the Studio;
  the checklist line re-checks it with the VS Code version (AC-015, AC-017); Copy prompt stays in the menu.
- A hanging activation or call → the fallback after 5000 ms; a chat that opens later holds the prompt too (A-015).
- Unsent text in Copilot's current chat → what `open` does with it is Copilot's; V-2 did not test it (OP-004).
  *Amended by 0026 (PD-078): closed: `open` replaces a draft only through the menu item `Send to the current chat` (0026 §6.1, AC-019).*
- Two activations → two Sends (two new chats for new chat), also while the first is pending (A-015). The step changes
  before activation → 0017 §8; the setting changes assistant before activation → copy, no warning (§6.4).
- Restricted Mode → the user value (§6.1); Send starts no agent and runs no workspace code (0005 §11 holds); the
  assistant decides what it allows there. Trust granted → VS Code fires a configuration change event (Workspace Trust
  guide), the offer follows (AC-010). Reader window → as any window.
- The offer changes while 0021's toggletip is open → its third paragraph changes, so it closes (0021 §8).
  `showStepTips: false` → the split button stays; only coach line and `(?)` go (0021 AC-010).

## 9. Acceptance criteria

Decided by Node unit tests against a stubbed host port that records command IDs and arguments, jsdom component tests,
manifest and source-scan tests, unless marked manual. Fixtures: one per rule of 0021 §6.1 and case of 0021 §6.2, each
with both assistants of §6.2. A *Send control* is a button or menu item whose text or name starts with `Send` or
`More actions`.

- **AC-001** The manifest shall contribute `featherspec-studio.assistant` in 0021's configuration with the type, default, enum, labels, descriptions, description and scope of §6.1 and §7 literally; `capabilities.untrustedWorkspaces.restrictedConfigurations` shall be exactly `["featherspec-studio.assistant"]`; a case-insensitive search of the manifest shall find none of `codex`, `chatgpt`, `openai`.
- **AC-002** For each value `none`, `copilot`, `claudeCode`, `codex`, `""`, `42` and unset, each with `GitHub.copilot-chat`, `anthropic.claude-code`, `openai.chatgpt` all present, with none, and (for `copilot`, `claudeCode`) with only the other assistant's, the system shall offer Send exactly for `copilot` and `claudeCode` with their own extension present; in every other case the detail and the Overview shall render the same DOM as with `none` and hold no Send control.
- **AC-003** Where Send is offered, the detail's first next-step line and the first Now row, where it has a line, shall render §6.3's split button with §7's texts, names, tooltips and menu items for that assistant in that order, both parts in the primary colours (0016 AC-017); with a first Now row without a line, no Now row shall hold a Send control; no further detail line, Now row, Up next or Problems row, card, plan-map element or empty state shall render a Send control, and tree items, status bar entry and quick pick shall be as with `none`.
  *Amended by 0025 (PD-082): the Plan map header's first line follows this spec's Send rules as the detail's does (0025 §5.3, AC-009, AC-010).*
  *Amended by 0027 (PD-082, PD-083): followed by 0027 §6.3's attachment line where the view carries one; it stays during feedback (0027 AC-003).*
- **AC-004** The main part's target shall be, with Copilot, `new chat` for the NS-5 and NS-9 fixtures and `current chat` for NS-2, NS-4, each NS-6 case, NS-7, NS-8 and NS-10; with Claude Code `new chat` for every fixture.
  *Amended by 0026 (PD-078): the target is `new chat` for every step and both assistants (0026 AC-001).*
- **AC-005** When the developer activates a Send (main part or menu item), the host shall make, after §6.4's checks, exactly the calls of §6.4's row for that assistant and target, in order, with deep-equal arguments, and write nothing to the clipboard; the main part shall show nothing new while the Send is pending, then §6.3's success feedback until 2000 ms after the last result, then its text again.
  > **Given** Copilot, Active `.specs/active/0001-tip-splitter.md` with T-003 open **When** the developer activates the main part **Then** the stub records exactly one executed command: `workbench.action.chat.open` with `{ query: "Implement T-003 of .specs/active/0001-tip-splitter.plan.md", isPartialQuery: true }`.
  *Amended by 0027 (PD-082, PD-083): where the Send view carries an attachment, the calls are 0027 §6.4's (Copilot's `open` argument adds `attachFiles: [<spec URI>]`, Claude Code's text adds ` @<spec path>`); otherwise unchanged (0027 AC-004, AC-005, AC-006).*
- **AC-006** If, when the developer activates a Send, the extension is missing, activating it rejects, `getCommands()` lacks a command of the row, a call rejects, or checks and calls have not settled 5000 ms after the activation (fake timers), then the system shall make no call after that point, put exactly the line on the clipboard, show `Copied` (or `Could not copy`) on the main part, show the matching warning of §7 once as a warning notification without actions (`Cmd+V` where the platform is `darwin`, else `Ctrl+V`) and write one Output line with the cause of §7 that does not contain the line; a result after the 5000 ms shall change nothing; one fixture per cause and assistant. If the effective value no longer names the assistant the request names, the system shall copy as Copy prompt does, with no warning and no Output line.
- **AC-007** Across every Send of AC-005 and AC-006 each executed command shall be one of `workbench.action.chat.newChat`, `workbench.action.chat.open`, `claude-vscode.editor.open`, and each `workbench.action.chat.open` call shall carry `isPartialQuery: true`; the protocol's guard shall reject a send request that holds a key outside assistant, target and line, or a target §6.2 does not list for that assistant. A case-insensitive search of `src` without test files and of `package.json` shall find none of `submit`, `acceptInput`, `sendToNewChat`, `autoSend`, `isPartialQuery: false`, `chatgpt`, `github.copilot.`, `inlineChat`, `editorChat`, `vscode.lm`, `vscode://`; `workbench.action.chat.open` shall occur exactly once there, and each string starting with `workbench.action.chat.` or `claude-vscode.` shall be one of those three.
  *Amended by 0027 (PD-082, PD-083): the send request may also hold `attach`, a spec path; the host attaches nothing else (0027 §6.5); the search adds `preserveInput`, `modelSelector` (0027 AC-007).*
- **AC-008** The arrow part and its menu shall follow §6.3's keys and pointer rules, each rule a test; an Escape in the open menu shall leave the side panel open, and below 900 px the detail shown (0022 G-4); opening the menu shall close an open toggletip and opening a toggletip shall close the menu; while closed, `aria-expanded` shall be `false` and no `role="menu"` element shall be in the DOM.
- **AC-009** The stylesheet shall give the main part `min-width: 22ch`, the arrow part a width and height of at least 24 px, and the menu `position: absolute`; while the feedback shows, the split button's DOM shall keep its elements and order.
  *Amended by 0027 (PD-082, PD-083): followed by 0027 §6.3's attachment line where the view carries one; it stays during feedback (0027 AC-003).*
- **AC-010** When the setting changes or VS Code's extensions change event fires, the detail and the Overview shall show the new offer within 500 ms after the host receives the event (PD-047), keeping selection and area; an open menu shall close when the offer changes; focus in the menu or on a split button shall move to the Copy prompt that replaces it, or to the arrow part where the split button stays; focus elsewhere shall stay.
- **AC-011** While the workspace is in Restricted Mode or the window is a reader, AC-002–AC-009 shall hold for the value VS Code returns for the setting.
- **AC-012** No Send, menu item, Open Settings or offer change shall create, change, move or delete a workspace file or write a setting (0017 AC-023's test, 0021 AC-017 extended); 0015 AC-020's network scan shall pass unchanged.
- **AC-013** The manifest shall contribute `featherspec-studio.openSettings` with §6.7's title and icon in the Specs view's `view/title` group `navigation` after `featherspec-studio.refresh`; executing it shall make exactly the call `workbench.action.openSettings` with `@ext:GregorBiswanger.featherspec-studio`; the toggletip shall show §7's two sentences literally as §6.8 places them, with and without an offer.
  *Amended by 0027 (PD-082, PD-083): followed by 0027 §7's update sentence where 0027 §6.2's version gate withholds an attachment (0027 AC-011).*
- **AC-014** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not replace shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every title missing at the head, a renamed one included, with the replaced statement or the head title that replaces it.
  *Amended by 0028: also excepts the tests 0028 AC-012 lists against a statement 0028 §5 replaces.*
  *Amended by 0025 (PD-082): also except the tests 0025 AC-020 lists against a statement 0025 §4 changes.*
  *Amended by 0026 (PD-082): also except the tests 0026 AC-015 lists against a statement 0026 §5 changes.*
  *Amended by 0027 (PD-082, PD-083): also except the tests 0027 AC-014 lists against a statement 0027 §5 changes.*
- **AC-015** The specs of §5 shall carry its notes; a literal search of `README.md` shall find `featherspec-studio.assistant`, `Send to Copilot`, `Send to Claude Code`, `sends nothing` and `Open Settings`, and of `CHANGELOG.md` under the version in preparation `featherspec-studio.assistant` and `Send to`; `docs/release-checklist.md` shall carry AC-016–AC-019 and one line each for GitHub Copilot, Claude Code (each with the VS Code version, against §6.2's; the releaser re-runs AC-017 on newer ones) and Codex (Copy prompt only; re-check when a Codex version accepts a prompt).
- **AC-016** *(manual, preview harness by the orchestrator, then Gregor in a real window)* Guideline 12: detail and first Now row with Copilot and with Claude Code chosen, menu closed and open, in Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open at its default and at 0022 G-2's minimum width, and at a Studio panel of 800 px (detail alone, 0022 G-4): no text of the split button is cut, the open menu shows fully inside the Studio panel without scrolling, both parts show a visible focus outline, each view holds at most two primary controls; the orchestrator records the screenshots in the plan.
- **AC-017** *(manual, Gregor, per assistant: GitHub Copilot and Claude Code; he records their and VS Code's versions)* On `tip-splitter`, from the detail of an Active spec (NS-6) and of a Review spec (NS-5), the main part and each Send item open the named chat with the prompt in the input and nothing sent; after Gregor sends it himself, the prompt runs as the FeatherSpec command or plan step it names; with Copilot, Gregor records whether unsent text in the current chat is kept or replaced (OP-004).
  *Amended by 0026 (PD-078): records the draft for `Send to the current chat`; the checklist's "decide whether the current chat stays the default target" goes (0026 AC-016).*
- **AC-018** *(manual, Gregor)* Settings UI: "Assistant" under "FeatherSpec Studio" with the three labels, reached by the toolbar gear; with the chosen assistant's extension disabled or with only Codex installed, every surface shows Copy prompt only and nothing names Codex; a workspace value overrides the user value in a trusted workspace and is ignored in Restricted Mode.
- **AC-019** *(manual, Gregor; PD-069 click test on an HTML draft before `/sdd-plan`)* Gregor says without asking what Send to <Name> does (opens, fills, sends nothing) and which chat it uses, and confirms or changes §7's texts; the plan records his answers.

## 10. Technical notes for developers or AI agents

- As-is (read 2026-11-18): the webview sends `copyText { text }` (`shared/protocol/messages.ts`, board requests) →
  `core/board/boardRequests.ts` → `copyLine()` → `ClipboardPort` (`adapters/vscode/clipboard.ts`); the result
  `{ ok, text }` drives `ui/CopyButton.tsx` (label, 2000 ms, own live region). Detail lines: `detail/NextStep.tsx`;
  first Now row: `areas/overview/{Now,SpecRow}.tsx`; `detail/DetailFrame.tsx` closes on Escape unless
  `event.defaultPrevented`. Foreign commands today: `vscode.openFolder`, the trust command (`shellActions.ts`),
  `setContext` (`studioTree.ts`); `openExternal` for the setup guide; `enableCommandUris: false` (`studioPanel.ts`);
  `UiPort.showNotification` knows only setup actions; Output: `outputChannel.ts`. Manifest: `engines.vscode ^1.146.0`,
  `extensionKind ["workspace"]`, `untrustedWorkspaces.supported: "limited"`, toolbar Open and Refresh, publisher
  `GregorBiswanger`; no configuration until 0021 adds it with a settings port. No string of §6.4 is in `src` yet.
- Proposal, the plan decides: pure core `src/core/assistant/` (offer, default target from 0021's session, §6.4's table
  as data, send with fallback); a host port (installed, active, activate, commands, execute, extensions changed) with a
  thin adapter in `src/adapters/vscode/`; the detail's first line and the first Now row's step carry
  `send?: { name, target, targets }`, the webview derives nothing; request `sendPrompt { assistant, target, text }` (no
  command ID, §6.6) and a result event, protocol version up; new modules → `/sdd-architecture-update`, same change set.
- The chat commands are workbench-internal, Claude Code's is undocumented: no stable API, hence presence checks,
  fallback and a checklist line per version. `isPartialQuery: true` keeps `workbench.action.chat.open` from submitting
  (07 §6a, PD-074). `getCommands()` lists registered commands only (A-008).
- Tests to extend: `manifest.test.ts`, `sourceScan.test.ts` (AC-007; 0015 AC-021's `copilot` exception),
  `docsScan.test.ts` (0015 AC-025's exception; README and checklist still say no "provider"), `noWrite.test.ts`
  (AC-012), `webviewBundle.test.ts` (0019 AC-010's 300 words also with Send offered), `CopyButton`, `SpecDetail`,
  `Overview`, `studioTree` tests, `src/test/*.smoke` (a stubbed command; file names and `.vscode-test.mjs` stay free
  of `copilot`, 0015 AC-022).

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | E-12: user setting, a workspace may override; in Restricted Mode only the user value (proxy) | 08 E-12 recommends it; an untrusted repository gets no say over where prompts go | §6.1, AC-001, AC-011 |
| A-002 | No first-click quick pick (08 S-1 deviates) (proxy) | PD-068 "without a chosen default assistant the action stays Copy prompt"; guideline 8 | Discovery rests on the gear, the toggletip and README |
| A-003 | E-11: Codex is not offered (PD-068, PD-074; 08 E-11's "Copy & open Codex" overruled); that it is no setting value and `codex` typed by hand acts as `none` is the proxy | PD-074: no prefill; guideline 2: a value without effect is a dead control | §6.1, AC-001, AC-002 |
| A-004 | Value `none`, not 08's `clipboard` (proxy) | PD-068 speaks of no chosen assistant; Copy prompt stays with every value | Setting value only |
| A-005 | Send only at 0022's two primary places (proxy) | Only there does the developer see the session advice (0021 A-002); further lines are later steps or the report | AC-003 |
| A-006 | Claude Code by `claude-vscode.editor.open`, not the URI (proxy) | Both passed V-2; only a command can be checked through `getCommands()` and reports failure | §6.4, AC-005 |
| A-007 | Default target: `new chat` → new chat; `same chat or new chat`, `any chat` → current chat; Claude Code always new (proxy) | 08 S-2; every session value of 0021 allows a new chat | AC-004 |
| A-008 | The host activates the assistant's extension before the command check (proxy) | Executing its command would activate it anyway; a check before activation could fail a working send | §6.4, AC-006 |
| A-009 | Feedback `Opened in <Name>`, never "Sent" (proxy) | Nothing is sent (S-3); the chat then holds focus and shows the prompt | §7 |
| A-010 | The fallback copies and tells by a notification beside the control's `Copied`, opens nothing else (08 S-4's "Chat öffnen" deviates); the key named by platform (proxy) | The failing call is the one verified way (PD-074); 08 S-4 names Ctrl+V; the cause does not fit the button (guideline 8) | §6.5, AC-006 |
| A-011 | `Copilot` on the button, `GitHub Copilot` in the settings (proxy) | Short labels in narrow rows; the settings name the product | §7 |
| A-012 | A toolbar gear opens the Studio's settings; the Studio writes none (proxy) | 08 S-1; PD-068 places the choice in the settings | §6.7, AC-013 |
| A-013 | The split button is one primary control, both parts in the primary colours (proxy) | Guideline 8 counts actions, not parts; 0022's count stays | §5, AC-003, AC-016 |
| A-014 | An assistant outside the Studio's extension host counts as not installed (proxy) | `getExtension` sees that host; the Studio is a workspace extension | Remote windows show Copy prompt |
| A-015 | A Send not settled after 5000 ms has failed; a second activation while one is pending sends again (proxy) | 08 S-4 "scheitert er: kopieren"; a hang must still end on the clipboard; a later chat merely duplicates the prompt | §6.4, §6.5, AC-006 |
*Amended by 0026 (PD-078): void: every step defaults to `new chat` (0026 §6.1).*
*Amended by 0031 (follow-up Send): A-005 — Send is also offered on each follow-up line of the detail and the Plan map header, as a secondary split button (0031 §6.1).*

*Amended by 0025 (PD-082): the Plan map header's first line follows this spec's Send rules as the detail's does (0025 §5.3, AC-009, AC-010).*

## 12. Open points

- OP-001 Click test on an HTML draft before `/sdd-plan` (PD-069, AC-019). Closed 2026-11-18 by PD-076: passed ("ich
  finde es super so"); §6.3 and §7 stand as the draft shows them (`/home/claude/orch/clicktest2/project/Send.dc.html`).
- OP-002 Codex: when a Codex version takes a prompt argument, a new spike and a revise add `codex` (PD-068 "where
  technically possible"); then 08 S-5's wording (`/sdd-*` without a Codex loader) needs its own V-2 row. Not blocking.
- OP-003 Claude Code "current chat": `claude-vscode.sidebar.open` and `claude-vscode.primaryEditor.open` exist but
  were not tried with a prompt (V-2); a spike may add the target. Not blocking.
- OP-004 Unsent text in Copilot's current chat may be replaced by `open` (not tested in V-2). Recommendation: keep the
  target; AC-017 records the behaviour; if text is lost, Gregor decides whether the current chat stays. Not blocking.
  VS Code's source (`chatActions.ts`, main, read 2026-11-18) sets the input with `isPartialQuery`, which suggests a
  draft is replaced; the plan's *Research* holds the reading, AC-017 decides.
  *Amended by 0026 (PD-078): closed by PD-078 (0026 §6.1).*
- OP-005 `/sdd-clarify` 2026-11-18 (S68): 42 findings, 7 blocking, resolved in one pass at Gregor's standing request
  (`0024-findings.md`; cross-spec with 0023). Readings; say so if one is wrong: (a) the first Now row only where it
  has a line; (b) feedback runs from the result; (c) 5000 ms end a hanging Send (A-015); (d) the warning is a VS Code
  notification; (e) 0015's `copilot` scans keep all but 0024's names.

## 13. Definition of Ready / Done and next steps

Ready: §6 and §7 literal, §5 listed, OP-001 closed, 0021 and 0022 implemented (their settings, Copy prompt and button
classes are this spec's base). Clarified on 2026-11-18 (OP-005). Done: AC-001–AC-015 green with evidence in the plan,
AC-016–AC-019 checked, §5 applied, docs, architecture and Memory Bank synced, `/sdd-compile` READY. Click test passed
(PD-076, OP-001 closed); planned 2026-11-18. Next: Gregor reads the plan; then the start signal.
