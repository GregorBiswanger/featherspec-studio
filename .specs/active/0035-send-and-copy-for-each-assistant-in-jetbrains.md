# Send and Copy for each assistant in JetBrains

**Status:** In Progress
**Plan:** [0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md](0035-send-and-copy-for-each-assistant-in-jetbrains.plan.md)

Basis: Gregor's decisions PD-105 (changed), **PD-108** (honest hybrid handover) and PD-109 (Junie readiness, spec 0037);
the concept [18-junie-bootstrap.md](../../docs/ux-audit/18-junie-bootstrap.md) (§6 T-1, T-2; §8 E-2) and the work order
[19-junie-handoff.md](../../docs/ux-audit/19-junie-handoff.md) (§1 G0-4, §2 branches A–C, §6 rows *Einstellung* and
*Rückmeldung Copy for*); spec 0034 §6.7, OP-024, ADR-004 S-3; the VS Code send specs 0024, 0026, 0027, 0031, 0033. Content
items 1–7 are Gregor's (brief of 2026-11-22, given through the orchestrator). Written without an interview; clarified
2026-11-22 by the orchestrator's agent as product-owner proxy: every proxy decision carries "(proxy)" (§14). Placed in
`active/` with status In Progress on the orchestrator's instruction; implementation starts only on Gregor's start signal
(proxy, OP-001).

## 1. Summary

In JetBrains IDEs every step action is Copy prompt today (PD-105, 0034 AC-031). This spec gives the JetBrains host the
*Assistant* setting and one honest handover per assistant (PD-108): **Send to Claude Code** types the prompt and its
`@file` attachments into Claude Code running in the IDE terminal and sends nothing; **Copy for Copilot** and **Copy for
Junie** put the prompt and the same files, as references in that assistant's syntax, on the clipboard and open the
assistant's chat for pasting. The attached files are exactly the files VS Code attaches. The empty state *No specs yet*
gets the same step action as every other next-step place, in both hosts — the one deliberate VS Code change.

## 2. Goal and problem

A JetBrains user copies, switches to the assistant, pastes and re-attaches the spec by hand; a VS Code user presses one
button. Gregor wants the JetBrains Studio to lead as far as each assistant honestly allows: Claude Code runs in the IDE's
terminal, where a plugin may type into the input; GitHub Copilot and Junie offer no supported API to fill their input
(Junie/AI Assistant: JetBrains staff, YouTrack LLM-2340; Copilot: none documented), so the Studio prepares the clipboard and
opens the chat, and says so. Success: in Rider, a step reaches Claude Code with one click and its attachments, and reaches
Copilot or Junie with one click plus one paste, with the same files as in VS Code; VS Code behaves as before except §6.6.

## 3. Users and roles

As 0024: the developer, one role, here in a JetBrains IDE (Rider and WebStorm must work, 0034). Gregor accepts the manual
criteria (AC-027, AC-028). Terms: *IDE project*, *FeatherSpec project* as 0034 §3. **Handover** — what a step action does
with the prompt for the offered assistant (§6.1). **Claude terminal** — §6.3. **Available** — §6.5.

## 4. Scope

### In scope

- The *Assistant* setting in JetBrains with `none`, `copilot`, `claudeCode`, `junie`; the option Junie only while Junie is
  available; a change applies without restart (§6.5).
- Send to Claude Code through the IDE terminal (§6.3); Copy for Copilot and Copy for Junie (§6.4).
- The same places as VS Code: spec detail and Board side panel, the first Now row, the Plan map header, the follow-up
  lines of 0031, the welcome of 0029 — plus the empty state *No specs yet* in both hosts (§6.6).
- The attached files of 0027, 0031 and 0033 for all three handovers (§6.2); the Junie wording in one function with both
  forms of 19 §2 (§6.7).
- The texts of §7, the parity rows of every criterion, the VS Code protection of §6.8.

### Out of scope

- Junie readiness, *Prepare Project for Junie*, the hints T-3 to T-15 and the variant T-8 — because they are spec 0037
  (PD-109, 19); 0035 only provides the setting option and Copy for Junie (19 G0-4).
- Submitting a prompt, pressing Enter in a terminal or a chat, or filling another plugin's chat input — because the Studio
  never submits (PD-068) and no supported API fills Copilot's or Junie's input (PD-108, LLM-2340); this stays out, not
  "not yet".
- Any API, class, action or setting of the Claude Code, GitHub Copilot, Junie or AI Assistant plugins, and a dependency on
  them — because no plugin offers a supported entry point; only "installed and enabled" may be asked (19 §3).
- The Claude Code deep link `claude-cli://open` — because it opens a terminal window outside the IDE (ADR-004 S-3), while
  Gregor wants the IDE terminal.
- An *Assistant* value `junie` in VS Code — because Junie has no VS Code extension (19 §3); VS Code keeps its enum.
- Codex, Gemini and other assistants — because Gregor named three; a new assistant needs its own decision.
- A project-level assistant setting in JetBrains — because settings are application level (0034 OP-009).
- Copy for or Send on the Specs tree, the status entry, Copy Next Step and Board cards — because VS Code has no Send there
  (0024 AC-003); they stay Copy.
- Moving `StudioProjectService.kt` off `PluginManagerCore.getPlugin` — because 19 §10 makes it its own ticket.

## 5. Amendments of other specs

Applied in the implementing change set as a note under each statement: "*Amended by 0035 (PD-108): …*". The PD
register gets no new row; PD-108 already names 0035.

| Spec · statement | Amendment |
| --- | --- |
| 0024 AC-003 "no … empty state shall render a Send control" | Except the empty state *No specs yet* (0035 §6.6, AC-007) |
| 0029 AC-006 "`No specs yet. Start with /sdd-specify` with its Copy included" | Without an offered assistant; with one, 0035 AC-007 (0035 §6.6) |
| 0034 §6.7, AC-031 Copy prompt only; AC-018 "Assistant only while §6.7 offers a handover" | §6.7 offers the handovers of 0035 §6.1; AC-031 holds while *Assistant* is `none`; AC-018 shows the row of 0035 §6.5 |
| 0034 AC-033 "depend on exactly `com.intellij.modules.platform` and `com.intellij.modules.jcef`" | Plus one optional dependency on the Terminal plugin `org.jetbrains.plugins.terminal` (0035 §6.3, AC-024) |
| 0034 H-17 "handover only per §6.7" | Handovers per 0035 §6.1 |
| `jetbrains/AGENTS.md` "Never edit `src/core`" | `src/core` changes only through a spec that names the change (0035 §6.8) |

## 6. Business rules

### 6.1 Handover per assistant (PD-108)

| Value | Host | Offered while | Step action (main part · menu) | What reaches the assistant |
| --- | --- | --- | --- | --- |
| `none`, unknown, unset | both | always | Copy prompt (0021) | nothing; the line on the clipboard |
| `copilot` | VS Code | 0024 §6.2 | unchanged (0024, 0026, 0027, 0033) | unchanged |
| `claudeCode` | VS Code | 0024 §6.2 | unchanged | unchanged |
| `copilot` | JetBrains | GitHub Copilot is available | `Copy for Copilot` · `Copy prompt` | clipboard: `copilotCopyText`; Copilot Chat opens (§6.4) |
| `claudeCode` | JetBrains | the Terminal plugin is available | `Send to Claude Code` (current chat) · `Send to the current chat`, `Send to a new chat`, `Copy prompt` | typed into the Claude terminal's input, not sent (§6.3) |
| `junie` | JetBrains | Junie is available (§6.5) | `Copy for Junie` · `Copy prompt` | clipboard: `junieCopyText`; AI Chat or the Junie tool window opens (§6.4) |

A value whose assistant is not offered acts as `none`: the same DOM as `none`, no Send or Copy for text (0024 AC-002).
The main part of Send to Claude Code follows the session of the step's tip (PD-093, 0026; *amended 2026-11-23, review 20 S-1,
decided by Gregor, OP-004, AC-035*): where the tip says *a new chat* (NS-5, NS-6-plan, NS-9, NS-10) it targets a new tab,
where it says *the current chat or a new one* or *any chat* it targets the *current chat*, the Claude terminal of §6.3 (an
existing Claude terminal first, else a new tab). The menu offers both either way; `Send to a new chat` always opens a new tab.
The welcome and the empty state have no tip and keep the current chat. VS Code is unaffected: its Claude Code has one target. Claude Code needs no
Claude Code plugin: the CLI in the terminal is enough (proxy, OP-003). Copy for and Copy prompt behave in an
IDE project that is not trusted as in a trusted one, as VS Code's Send does in Restricted Mode (0024 AC-011, 0027 AC-013).
*Amended 2026-11-23 (review 20 S-3, PD-110, decided by Gregor, OP-016, AC-037):* Send to Claude Code in a project that is not
trusted (Safe Mode) only types into a running Claude terminal and never starts `claude` (§6.3).

### 6.2 Attached files and references (0027, 0031, 0033, PD-091, PD-097)

- **Which files:** exactly the files VS Code's Claude Code Send attaches for the same model and line: the step's files of
  0033 §6.3 (`STEP_FILES`), the follow-up lines of 0031 §6.2 (`FOLLOW_UP_CASE`), spec before plan, none for NS-2, NS-4, the
  welcome and the empty state. A path that contains whitespace is left out, for all three handovers (0027's rule for Claude
  Code) (proxy, OP-008). Copilot's *current chat* rule (PD-094) has no JetBrains counterpart: Copy for has no target.
- **The check at activation:** each file is still a spec or plan entry of the current model and exists (0027 §6.5); a file
  that fails is left out, the others stay, the feedback names it and the log gets one line per path without the prompt.
- **Reference syntax**, each in one pure function of the core, applied to the line and the checked paths in order:
  - Claude Code: `<line>` + ` @<path>` per path — the text VS Code prefills (0027 §6.4).
  - Copilot: `copilotCopyText(line, paths)` = `<line>` + ` #file:<path>` per path (proxy, OP-008, A-002).
  - Junie: `junieCopyText(line, paths, form)` (§6.7), references ` @file:<path>` (AI Chat's documented form) (proxy, OP-008, A-003).
- Copy prompt (main part without offer, or the menu item) copies the line alone, as everywhere (0027 §6.6).
- *Amended 2026-11-23 (review 20 B-1, §16):* the syntaxes stay, but until AC-028 shows that a pasted `#file:` or `@file:` becomes
  a reference, no text of the Studio calls them references: they are "the file paths" (§7, AC-030).

### 6.3 Send to Claude Code in the IDE terminal

- **Claude terminal:** an open tab of the IDE's Terminal tool window in this IDE project whose running command, as the
  terminal's shell integration reports it, is `claude` (with or without arguments), started in the active FeatherSpec
  project's root (compared as the file system compares names), so that its `@` paths resolve. With several, the one the
  Studio typed into last, else the first in tab order. A tab without shell integration, whose `claude` has ended, or whose
  `claude` runs in another folder is no Claude terminal (proxy, OP-005).
- **Current chat (main part where the tip allows it, S-1):** a Claude terminal exists → type into it, *if Claude Code is ready for input on the current
  screen* (*Amended 2026-11-23, review 20 B-4, §16, AC-032*). None exists → as *new chat*.
- **New chat:** open a new terminal tab named `Claude Code` whose working directory is the active FeatherSpec project's
  root, run
  `claude` there, and wait until Claude Code is ready for input (readiness signal decided by spike K-1, A-005); then type.
  Not ready within 15 000 ms → fallback; the Studio types nothing afterwards (proxy, OP-006).
- **Waiting for an answer (review 20 B-4, §16, AC-032):** *ready* means the visible text of the tab shows an input marker and
  no waiting marker after it. The markers are two named lists in the platform-free `ClaudeReadiness`
  (`INPUT_MARKERS`, `WAITING_MARKERS`; **K-1 pending**: provisional until the K-1 probe has seen the real input box, the
  folder-trust dialog and the login prompt; the trust dialog may contain `Claude Code` too). Not ready, in an existing or in a
  new tab: the Studio types nothing, focuses the tab, copies the line and shows §7's waiting text instead of the general
  warning. Every other failure keeps 0024's warning.
- **Safe Mode (review 20 S-3, PD-110, AC-037):** while the IDE does not trust the project (`TrustedProjects.isProjectTrusted`, the
  check the host already uses for the core's `trusted` mirror), the Studio types only into a running Claude terminal that is
  ready (the current chat, as above); the menu item `Send to a new chat`, and the main part without a running Claude
  terminal, open no tab and run no `claude`: the send fails as *untrusted*, the core copies the line and shows §7's text.
  The trust is asked at every Send.
- **A missing `claude` (review 20 S-2, decided by Gregor, OP-003, AC-036):** the Send is not stopped beforehand, because the PATH of
  the IDE process can differ from the terminal's (a `claude` installed after the IDE started, a PATH set in the shell profile).
  Only after the 15 000 ms timeout the host looks for `claude`, `claude.exe` and `claude.cmd` in the PATH of the IDE process
  (platform-free `ClaudeOnPath`); if none is there and Claude Code is not running in the tab, the failure is *not installed* and
  §7's text replaces the general warning. A `claude` that runs (a dialog waits) is never reported as missing.
- **Typing:** the text of §6.2 as one bracketed paste into the terminal's input; never a line break, carriage return or
  Enter; then the tab gets the focus. A line that holds a control character is not typed (fallback). The clipboard is left
  alone. A draft already in Claude Code's input stays; the paste lands at its cursor (proxy, OP-007).
- **While it runs (review 20 B-2, §16):** from the activation until the answer, the control of every Send to Claude Code for the
  same line is `aria-disabled="true"` and `aria-busy="true"` (never `disabled`; the focus stays), shows §7's waiting
  texts and ignores clicks, the menu's Send items too, and the host types for a Send that arrives while another runs
  nothing. The control frees itself 30 000 ms after the activation at the latest. VS Code is unaffected (AC-031).
- **Fallback:** Terminal plugin unavailable, a terminal call fails, readiness not reached, or no result within 20 000 ms
  of the activation → copy the line as Copy prompt does, show 0024 §7's warning once and write one log line with the cause,
  never the prompt (0024 §6.5). The 5000 ms budget of 0024 stays for every other handover (proxy, OP-006).
- **Platform API:** only the Terminal plugin's documented API, isolated in one host class; every call is guarded so that a
  failure becomes the fallback. The Terminal plugin is an optional dependency of the plugin (proxy, OP-009, A-006).

### 6.4 Copy for Copilot · Copy for Junie (PD-108)

1. Build the text of §6.2 and write it to the clipboard. A failed write ends here: `Copy failed`, nothing opens.
2. Open the assistant's chat tool window in this IDE project, if it exists: Copilot → GitHub Copilot Chat; Junie → AI Chat
   while `com.intellij.ml.llm` is available, else the Junie tool window (proxy, OP-010). Not found, or opening fails →
   nothing opens, and the feedback says to open it.
3. Show the feedback of §7 at the control: `Copied`, and the text that tells to paste (or to open and paste).

The Studio types, sends and submits nothing there, fills no input, calls no API of these plugins and does not work around
the missing API (LLM-2340). The menu holds `Copy prompt` alone (proxy, OP-011).

### 6.5 The *Assistant* setting in JetBrains

- Settings › Tools › FeatherSpec Studio, application level, one combo row after Show Step Tips and before *Model hints*
  (proxy, OP-012). Stored values `none` (default), `copilot`, `claudeCode`, `junie` — VS Code's keys plus `junie` (proxy,
  OP-002; the brief's `claude` is `claudeCode`). Labels, descriptions and the description of each option: §7.
- Options *(amended 2026-11-23, review 20 S-5, decided by Gregor, OP-013, AC-039)*: `None: Copy prompt` always; `GitHub Copilot`,
  `Claude Code` and `Junie` (T-1) each only while their assistant is available, by one rule for all: Copilot ⇔ `com.github.copilot`,
  Claude Code ⇔ the Terminal plugin, Junie ⇔ a Junie plugin (19 §4.1 A1). While a stored value's assistant is not available the
  combo shows `None: Copy prompt` and the stored value stays until the developer applies another one; the offer is none (OP-013).
  A plugin that comes or goes while the page is open changes the list on the IDE's plugin event (the one that also sends
  `pluginsChanged` to the core), without reopening the page.
- **Available:** a plugin is installed and enabled, asked through documented platform API without
  `PluginManagerCore.getPlugin` (*review 20 S-7, prepared only, **K-1 pending**, AC-040:* "enabled" is asked by one swappable strategy
  of the platform-free `PluginActivity`, today `isLoaded`; K-1 compares it with `isDisabled`, and a difference switches one
  constant to `NOT_DISABLED`, or, if neither holds, to the optional dependency): Junie ⇔ `org.jetbrains.junie` or `com.intellij.ml.llm`; GitHub Copilot ⇔ `com.github.copilot`;
  Terminal ⇔ `org.jetbrains.plugins.terminal` (proxy, OP-014, A-007). When the IDE reports a plugin loaded or unloaded,
  options and offer follow within 500 ms of the report.
- A change of the setting reaches every open IDE project's panel within 500 ms (0021 AC-011), without restart.

### 6.6 Places, and the empty state in both hosts

The step action of §6.1 stands wherever VS Code shows Send for the same model: the detail's first next-step line (also
in the Board's side panel), the first Now row with a line, the Plan map header's first line (0025), the follow-up lines
(0031), the welcome (0029). The webview is shared, so the places follow from the offer.

**Deliberate fix (both hosts):** the empty state *No specs yet* (setup sign *run* or *unknown*, no spec; Overview and
Board) shows `No specs yet. Start with /sdd-specify` unchanged and, while an assistant is offered, the host's step action
for the line `/sdd-specify` — VS Code: 0024's split button with 0026's default target and menu — with no attachment and
no Tip line (proxy, OP-015). Without an offer it stays Copy prompt, deep-equal to today. The tree's empty text stays.

### 6.7 Junie wording (19 §2, 18 E-2)

`junieCopyText(line, paths, form)` with `form` one constant of the core, default **A** (`slash`):
- **A (`slash`):** `<line>` + ` @file:<path>` per path.
- **C (`follow`):** a line `/sdd-<name>` or `/sdd-<name> <rest>` becomes `Follow .claude/commands/sdd-<name>.md` or
  `Follow .claude/commands/sdd-<name>.md for <rest>`; every other line stays; then the references as in A.
Spike J-1 (19 §2, Gregor) decides the form: branch C switches the constant; A and B keep A (A-004).

### 6.8 Protection of VS Code

- VS Code's behaviour, calls, manifest and texts stay byte-identical except §6.6; `featherspec-studio.assistant` keeps
  its entry; a hand-written `junie` acts as `none` there.
- Every test at 0035's start commit exists at the head and passes; the read and next-step baselines and the merge-prompt
  golden file stay unchanged; the `.vsix` file list stays as the snapshot; every rendered VS Code text of every fixture
  stays deep-equal, the empty state with an offered assistant excepted (AC-007).
- The shared-change guard of 0034 (`jetbrains.yml › shared-guard`) compares with 0035's start commit; its "`src/core`
  unchanged" check gives way to the checks above (proxy, OP-017). `ci.yml` and `publish.yml` stay unchanged.

## 7. Texts (English, PD-016; in text modules, asserted literally)

VS Code texts are unchanged. JetBrains reuses 0024's and 0027's texts for Send to Claude Code (label, names, menu,
`Opened in Claude Code`, the status texts and warnings). New, JetBrains only (proxy, OP-018, except T-1 and T-2):

| Place | Text |
| --- | --- |
| Setting row label | `Assistant:` |
| Setting description | `The assistant your next step goes to. Studio sends nothing; Copy prompt stays in the button's menu.` (*amended 2026-11-23, review 20 S-6, AC-038*: the option descriptions below say the rest) |
| Option labels | `None: Copy prompt` · `GitHub Copilot` · `Claude Code` · `Junie` (T-1) |
| Option descriptions | `Copy the prompt and paste it into any assistant.` · `Copy for Copilot copies the prompt with the file paths. Paste it into GitHub Copilot Chat. Needs the GitHub Copilot plugin.` · `Send to Claude Code types the prompt into Claude Code in the IDE terminal and sends nothing. Needs the claude command and the Terminal plugin.` · `Copy for Junie copies the prompt with the file paths. Paste it into Junie in AI Chat.` (T-2) |
| Copy for, main part | `Copy for Copilot` · `Copy for Junie` |
| Copy for, name and tooltip | `Copy for <Name>: <line>`, plus `. Adds the paths of <files>.` with files (`<files>` as 0027: names joined by ` and `) |
| Copy for, done | label `Copied`; name `Copied: <line>`; tooltip and announced `Copied. Paste it into <place> with <key>.` (for `Junie in AI Chat`: `Copied. In AI Chat, choose Junie and paste it with <key>.`, *amended 2026-11-23, review 20 S-4, AC-034*) · without the window `Copied. Open <place> and paste it with <key>.` · a file left out `Copied without <file>: the file was not found. Paste it into <place> with <key>.` (the same exception for `Junie in AI Chat`) |
| `<place>` | `GitHub Copilot Chat` · `Junie in AI Chat` · `the Junie tool window` |
| Copy for, failed | 0021's `Copy failed` and its text |
| Copy for, log, file left out | `Copy for <Name>: <path> was not found, so its path was left out.` |
| Toggletip, Copy for offered | `Copy for <Name> copies the prompt with the file paths and sends nothing: paste it into <place>, choose the model there, check the prompt, then send it.` (for `Junie in AI Chat`, *amended 2026-11-23, review 20 S-4*: `…paste it into AI Chat with Junie as the agent, choose the model there…`, because AI Chat opens with its recommended agent, since June 2026 Codex) |
| Send to Claude Code, waiting (JetBrains only) | label `Starting Claude Code…`; name, tooltip and announced `Starting Claude Code: <line>`; the answer then shows `Opened in Claude Code` or the warning as before |
| Send to Claude Code, waiting for an answer | warning, announced text and tooltip: `Claude Code is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.` (the general warning of 0024 stays for every other failure) |
| Send to Claude Code, project not trusted | warning, announced text and tooltip: `This project is not trusted, so Studio does not start claude. The prompt is copied.` |
| Send to Claude Code, not installed | warning, announced text and tooltip: `Claude Code did not start. Is the claude command installed? The prompt is copied.` |
| Log causes (Claude Code) | `the Terminal plugin is not available` · `Claude Code was not ready within 15000 ms` · `Claude Code was not ready for input` · `the claude command was not found on the PATH` · `the project is not trusted` · `terminal call failed: <message>` · `no result within 20000 ms` |

`<key>` is `Cmd+V` on macOS, else `Ctrl+V` (0024 §6.5).

## 8. Security, permissions and privacy

The Studio types into a terminal and opens a tool window only after the developer activated a Send or Copy for in this
panel; no webview message names a command, terminal or tool window (0024 §6.6). It types only into a Claude terminal or a
tab it opened for `claude`, and runs no other command; in a project that the IDE does not trust (Safe Mode) it opens no tab and starts no `claude` (§6.3, PD-110). It writes no project file and no setting, reaches no network, and
puts no prompt into a log or notification. The clipboard is written only by Copy prompt and Copy for.

## 9. Non-functional requirements

Setting and plugin changes within 500 ms (§6.5); Claude Code readiness bounded at 15 000 ms, the whole Send at 20 000 ms
(§6.3); every other handover within 0024's 5000 ms. No new runtime dependency; the plugin ZIP stays within 0034 AC-035.

## 10. Error cases and edge cases

- `claude` not on the PATH, a login or a folder-trust prompt of Claude Code on start → readiness not reached → fallback.
  *Amended 2026-11-23 (review 20 S-2, §16):* a `claude` that is not on the IDE's PATH is told after the timeout with §7's own text.
  *Amended 2026-11-23 (review 20 B-4, §16):* the tab is focused and §7's waiting text replaces the general warning; the next
  Send finds a prompt waiting in an existing tab as well and types nothing until it is answered (AC-032).
- Claude Code busy with a turn → the paste lands in its input; nothing is sent (Claude Code queues it until Enter).
- The Claude terminal closes between check and typing → the call fails → fallback; nothing goes to another tab.
- Two Sends in quick succession → one after the other, as 0024 (the core queues them). *Amended 2026-11-23 (review 20 B-2,
  §16):* not for Send to Claude Code in JetBrains: while one such Send runs, a second click on the same line types nothing (§6.3, AC-031).
- The Terminal plugin disabled, or Copilot or Junie uninstalled while selected → the offer drops to Copy prompt (§6.5).
- Copy for with the chat tool window missing → copied, `Open <place> and paste …` (§7).
- A path with whitespace → not referenced; the line still names it (§6.2).
- A FeatherSpec project in a content root outside the IDE project's base directory → Copy for references paths relative
  to the FeatherSpec root, as VS Code does in a multi-root window; Copilot or Junie may not resolve them (known limit,
  README sentence); Claude Code is safe because the Claude terminal runs in that root (§6.3).
- A `claude` already running in the IDE base directory while the FeatherSpec project is a subfolder → no Claude
  terminal; a new tab opens in the FeatherSpec root.
- No JCEF → 0034 AC-030 holds; the settings page keeps the *Assistant* row.

## 11. Acceptance criteria

Unless marked *manual*, a test decides each criterion: Vitest for TypeScript (local), JUnit 5 and the Starter smoke for
Kotlin (CI only, 0034 §6.11). Fixtures: the 14 worlds of `src/core/assistant/testing/caseWorlds.ts` (`CASE_WORLDS`, one per
step case), `test/fixtures/fs-setup-not-run`, `test/fixtures/fs-setup-done-no-specs`, a fake assistant host
(`fakeAssistantHost.ts`) and, in Kotlin, fakes of the plugin query, the terminal and the tool windows.

**Setting and offer**

- **AC-001** The JetBrains settings page shall show the *Assistant* row of §6.5 with §7's label and description, the
  options `None: Copy prompt`, `GitHub Copilot`, `Claude Code` in this order and `Junie` last, each except None only while its
  assistant is available (*amended 2026-11-23, review 20 S-5, AC-039; before: Copilot and Claude Code always*), and under the combo the selected option's description of §7; the default shall be `none`, and only the four
  values of §6.5 shall be stored.
- **AC-002** When the developer applies another *Assistant* value, every open IDE project's panel shall show the step
  action of the new value within 500 ms of Apply, without an IDE restart.
- **AC-003** Junie shall count as available exactly while `org.jetbrains.junie` or `com.intellij.ml.llm` is installed and
  enabled, GitHub Copilot while `com.github.copilot` is, and the Terminal while `org.jetbrains.plugins.terminal` is; when
  the IDE reports a plugin loaded or unloaded, the options and the offer shall follow within 500 ms of the report.
- **AC-004** For each stored value `none`, `copilot`, `claudeCode`, `junie`, `""`, `42` and unset, with each subset of
  {GitHub Copilot, Terminal, Junie} available, the JetBrains host shall offer exactly the handover of §6.1 for that value
  when its assistant is available, and otherwise render the same DOM as `none` with no Send and no Copy for text.
- **AC-005** In VS Code, for each value of AC-004 including `junie`, with 0024 AC-002's extension sets, the offer, the
  views and the calls shall be deep-equal to the start commit, AC-007's empty state excepted, and the manifest's
  `featherspec-studio.assistant` entry byte-identical.

**Places**

- **AC-006** Where an assistant is offered in JetBrains, for every world of `CASE_WORLDS` and for `fs-setup-not-run`, each
  place where the VS Code host at the head renders a Send split button for the same model and an offered assistant shall render that
  assistant's step action of §6.1, and no other control (Board cards, Up next, Problems, plan-map elements other than the
  header's first line, tree, status entry, Copy Next Step) shall render a Send or Copy for control.
- **AC-007** While the active project has no spec and the setup sign reads *run* or *unknown* (`fs-setup-done-no-specs`),
  the Overview and the Board shall show `No specs yet. Start with /sdd-specify` literally and, with an offered assistant,
  that host's step action for `/sdd-specify` with no attachment and no Tip line — in VS Code `Send to <Name>` with 0026's
  default target and menu; without an offer the Copy prompt of today.
- **AC-008** Without an offered assistant, every fixture's and every world's Overview, Board, detail, Plan map and welcome
  shall render deep-equal to the start commit, in both hosts.

**Attached files**

- **AC-009** For every world of `CASE_WORLDS` and each of its lines with a step action (0031 follow-up lines included),
  the paths that Send to Claude Code types and that Copy for Copilot and Copy for Junie reference shall be, in order, the
  paths of the ` @<path>` mentions that VS Code's Claude Code Send prefills for the same world; a path containing whitespace
  shall be in none of them; the welcome and the empty state shall reference no path.
- **AC-010** If a file to attach is no longer a spec or plan entry of the current model or does not exist at activation,
  then the handover shall leave out that path only, show §7's or 0027's text naming the file, and write one log line per
  left-out path without the prompt.

**Send to Claude Code (JetBrains)**

- **AC-011** When the developer activates the main part of Send to Claude Code while a Claude terminal (§6.3) exists, the
  host shall type `<line>` followed by one ` @<path>` per attached path into that terminal as one bracketed paste, focus
  its tab, leave the clipboard unchanged, and the control shall show `Opened in Claude Code` with 0024's status text.
- **AC-012** When the developer activates the main part while no Claude terminal exists, or the menu item `Send to a new
  chat`, the host shall open a new terminal tab named `Claude Code` in the active FeatherSpec project's root, run `claude` in it, and
  type the text of AC-011 only after Claude Code is ready for input (§6.3).
- **AC-013** If the Terminal plugin is unavailable, a terminal call fails, Claude Code is not ready within 15 000 ms, or the
  Send has no result within 20 000 ms, then the host shall type nothing into any terminal, also after a late result, copy
  the line alone, show 0024's warning once and write one log line with §7's cause and without the prompt. *Amended
  2026-11-23 (review 20 B-4, §16): "not ready" shows §7's waiting text instead of 0024's warning (AC-032).*
- **AC-014** The host shall never write a line break, a carriage return or an Enter key to a terminal it types a prompt
  into, and shall type no line that contains a control character; such a line shall take the fallback of AC-013.
- **AC-015** For terminal tabs given as fakes, the Claude terminal shall be the tab whose running command reported by
  shell integration is `claude` or `claude <arguments>` started in the active FeatherSpec project's root; a tab whose
  `claude` ended, a tab without shell integration, a tab running another command and a `claude` started in another folder
  shall not be; with two Claude terminals the one typed into last shall be chosen, else the first in tab order.

**Copy for (JetBrains)**

- **AC-016** When the developer activates Copy for Copilot, the clipboard shall hold exactly `copilotCopyText(line, paths)`
  of §6.2, the GitHub Copilot Chat tool window shall be opened when it exists, the control shall show §7's done texts for
  `GitHub Copilot Chat`, and no text shall be typed, sent or submitted anywhere.
- **AC-017** When the developer activates Copy for Junie, the clipboard shall hold exactly `junieCopyText(line, paths,
  form)` of §6.7 with the configured form, AI Chat shall be opened when `com.intellij.ml.llm` is available, else the Junie
  tool window when it exists, and the control shall show §7's done texts for that place.
- **AC-018** `junieCopyText` shall give, for the table of the plan's test (lines `/sdd-plan <path>`, `/sdd-specify`,
  `Implement T-003 of <plan>`, a line without `/sdd-`; zero, one and two paths), the texts of §6.7 for form A and for form
  C, and the configured form shall be A.
- **AC-019** If the chat tool window of a Copy for is not found, then the clipboard shall still hold the text and the
  control shall show `Copied. Open <place> and paste it with <key>.`; if the clipboard write fails, then the control shall
  show `Copy failed` and no tool window shall open.
- **AC-020** The menu of Copy for shall hold exactly one item, `Copy prompt`, which shall put the line alone on the
  clipboard and open nothing.

**Texts and tips**

- **AC-021** Every text of §7 shall exist exactly once in a text module and be asserted literally by a test, and every
  text constant and text function that the start commit's text modules define shall return byte-identical text.
- **AC-022** While Copy for is offered and step tips are shown, the toggletip's Send paragraph (0024 §6.8) shall be §7's
  Copy for sentence for that assistant; while Send to Claude Code is offered in JetBrains it shall be 0024's sentence.

**Safety and platform**

- **AC-023** The host shall type into a terminal, open a tool window or write the clipboard for a step only after the
  developer activated a Send, Copy for or Copy prompt in the panel; no webview message shall name a command, terminal or
  tool window; no handover shall write a project file or a setting or reach the network.
- **AC-024** The plugin shall declare no dependency on, and use no class, action or setting of, the Claude Code, GitHub
  Copilot, Junie or AI Assistant plugins; `plugin.xml` shall depend on `com.intellij.modules.platform` and
  `com.intellij.modules.jcef` and optionally on `org.jetbrains.plugins.terminal`; the Plugin Verifier shall report no
  compatibility problem and no internal API use at since-build and at the latest stable release (0034 AC-034).

**Parity, protection, docs**

- **AC-025** Every criterion of this spec shall have a categorised row in `docs/jetbrains/parity.md`, and every row that
  names PD-105 shall name PD-108 or a criterion of this spec instead.
- **AC-026** Every test at 0035's start commit shall exist at the head and pass; the read and next-step baselines and the
  merge-prompt golden file shall be unchanged with no new `EXCEPTIONS`; the `.vsix` file list shall equal its snapshot; and
  every rendered VS Code text of every fixture shall be deep-equal to the start commit except AC-007's empty state.
- **AC-027** *(manual, Gregor, Rider 2026.3, plugin ZIP from the CI artifact, `C:\projects\test\tip-splitter`)* With
  *Assistant* Claude Code: in the `NS-7-start` situation the main part puts the prompt with two `@` mentions into a running
  `claude` tab, and with no such tab into a new `Claude Code` tab; nothing is sent; Enter in the tab sends it with both
  files; Rider, Terminal and Claude Code versions recorded.
- **AC-028** *(manual, Gregor, Rider 2026.3)* Copy for Copilot and Copy for Junie open their chat and paste the prompt
  with the references; he records whether `#file:` and `@file:` become references (A-002, A-003), the tool window IDs
  (A-008), the option Junie with and without Junie, a setting switch without restart, and in VS Code the empty state with
  Send to Copilot.
- **AC-029** `README.md` (section *JetBrains IDEs*), `CHANGELOG.md` and `docs/release-checklist.md` (a 0035 section with
  AC-027, AC-028) shall describe the three handovers; the statements of §5 shall carry their notes; `jetbrains/AGENTS.md`
  shall carry §5's rule; `AGENTS.md` shall stay at most 15 000 bytes and `.memory-bank/activeContext.md` below 7000 bytes.

**After review 20 (amendments of 2026-11-23, §16)**

- **AC-030** *(review 20 B-1)* Until AC-028 shows that a pasted `#file:` or `@file:` becomes a reference, no text of the Studio
  (text modules, the settings table, README, CHANGELOG) shall promise a "reference": the Copy for texts of §7 shall say the
  file paths, each asserted literally, and the syntaxes `#file:<path>` and `@file:<path>` shall stay unchanged.
- **AC-031** *(review 20 B-2)* While a Send to Claude Code runs in JetBrains, the control of the same line shall show
  `aria-disabled="true"` and `aria-busy="true"` (not `disabled`, the focus stays), the label `Starting Claude Code…` and the
  name `Starting Claude Code: <line>`, and a second click, also on the menu's Send items and on a second control for the
  same line, shall send and type nothing, in the webview and in the Kotlin host (a second Send during the wait types
  nothing and opens no tab); the answer shall end the wait with `Opened in Claude Code` or the warning. VS Code and every
  other handover shall render and behave exactly as before, shown by deep-equal DOM tests and the guards
  `renderedTexts` and `sharedGuard`.
- **AC-032** *(review 20 B-4)* If Claude Code is not ready for input when a Send to Claude Code would type — in an existing
  Claude terminal at the check on its current screen, or in a new tab within 15 000 ms, for instance at the folder-trust
  dialog or the login prompt — then the host shall type nothing, focus that tab and fail the send as *waiting*; the core
  shall copy the line, show `Claude Code is waiting for you in the terminal. Answer it there, then send again. The prompt is copied.`
  once instead of 0024's warning, and write one log line with the cause and without the prompt; every other failure shall
  keep 0024's warning. The readiness check shall sit in the platform-free `ClaudeReadiness`, its markers shall be named
  constants marked *K-1 pending*, and a dialog left in the scrollback above a later input box shall not count as waiting.
- **AC-033** *(review 20 B-3, PD-110)* The README (the intro, the bullet *Local and read-only* and the Privacy bullet) shall say
  literally `Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Claude Code may start claude in a
  terminal tab when you click it.`, no README line shall still say that Studio starts no process or no agent without that
  exception for JetBrains, and the CHANGELOG shall name PD-110.
- **AC-034** *(review 20 S-4)* After Copy for Junie with AI Chat as the place, the control shall show `Copied. In AI Chat, choose
  Junie and paste it with <key>.` (with a file left out `Copied without <file>: the file was not found. In AI Chat, choose
  Junie and paste it with <key>.`) and the toggletip shall say `…paste it into AI Chat with Junie as the agent, choose the
  model there…`; Copy for Copilot and Copy for Junie with the Junie tool window as the place shall keep their texts.
- **AC-035** *(review 20 S-1)* In JetBrains, for each step case, the main part of Send to Claude Code shall target a new chat when the
  case's tip names *a new chat* (`STEP_GUIDES[case].session` is `new`: NS-5, NS-6-plan, NS-9, NS-10) and the current chat otherwise;
  the menu shall list both targets in the order current, new; this shall hold in the detail, the first Now row and the
  follow-up lines; the welcome and the empty state shall keep the current chat, and in VS Code every view shall stay
  deep-equal.
- **AC-036** *(review 20 S-2)* If Claude Code is not ready after 15 000 ms in a new tab, the claude process is not running in it and none of
  `claude`, `claude.exe` and `claude.cmd` is in a directory of the IDE process's PATH, then the host shall type nothing, focus the
  tab and fail the send as *not installed*; the core shall copy the line, show `Claude Code did not start. Is the claude command installed? The prompt is copied.`
  once instead of 0024's warning and write one log line with the cause `the claude command was not found on the PATH` and without
  the prompt. The PATH shall not be read before the timeout, a `claude` found on the PATH or running in the tab shall keep the
  waiting text, and the search shall be platform-free and tested with fake directories.
- **AC-037** *(review 20 S-3, PD-110)* While the IDE does not trust the project, a Send to Claude Code shall type into a running,
  ready Claude terminal as in a trusted project, and shall otherwise (the menu item `Send to a new chat`, or the main part with no
  running Claude terminal) open no terminal tab, run no `claude` and type nothing; the host shall fail the send as *untrusted*,
  the core shall copy the line, show `This project is not trusted, so Studio does not start claude. The prompt is copied.` once
  instead of 0024's warning and write one log line with the cause `the project is not trusted` and without the prompt. The
  trust shall be asked at every Send, from the check the host already uses; Copy for Copilot, Copy for Junie and Copy prompt shall
  behave as before.
- **AC-038** *(review 20 S-6)* The settings description of the *Assistant* row shall be `The assistant your next step goes to. Studio sends
  nothing; Copy prompt stays in the button's menu.`, repeat no option description, and be asserted literally in the settings
  table's test.
- **AC-039** *(review 20 S-5)* The *Assistant* combo shall list `None: Copy prompt` always and each of `GitHub Copilot`, `Claude Code` and
  `Junie` only while its assistant is available (Copilot by `com.github.copilot`, Claude Code by the Terminal plugin, Junie by
  `org.jetbrains.junie` or `com.intellij.ml.llm`), in the order of AC-001; a stored value whose assistant is not available shall show `None: Copy prompt`
  and stay stored until another value is applied; and a plugin loaded or unloaded while the page is open shall change the list
  without reopening the page. *(This amends AC-001's "`GitHub Copilot`, `Claude Code` always".)*
- **AC-040** *(review 20 S-7, **K-1 pending**)* The plugin-activity check of the platform glue shall be decided by one platform-free strategy
  (`PluginActivity.available`, with `ActivityCheck.LOADED` and `NOT_DISABLED`) whose current value is `LOADED`, so that today's
  behaviour is unchanged; only the chosen strategy shall be asked and nothing for a plugin that is not installed; the K-1 probe shall
  record `PluginManagerCore.isLoaded` beside `isDisabled`; and this spec and its plan shall name the open point *K-1 pending*.
- **AC-041** *(work list 3.6, 0034 AC-007)* When the developer opens the Studio tab in a JetBrains IDE, the tab shall show a native placeholder with
  the text `Loading project…` (the loading text of the shared texts, also its accessible name, in theme colours, centred) within 1 s after
  *Open*, drawn in the pass that creates the editor and without waiting for JCEF, for the `JBCefBrowser` or for the core; the browser
  shall be created in a later turn of the event thread and shall replace the placeholder once its first `shell` frame is handed over;
  without JCEF the existing unavailable notice shall stay. It shall be measured by the line `FEATHERSPEC-TIMING open→first-content` on
  Gregor's machine and by the Starter smoke on the CI runners (the smoke finds the placeholder as the loading state, its budget unchanged),
  and it proves 0034 AC-007 (loading state within 1 s of *Open*). VS Code is unchanged.

## 12. Technical notes for developers or AI agents

As-is at `aa0fe9b` (digest from the code):
- `src/core/assistant/assistants.ts` holds one VS Code table `ASSISTANTS` (extension ID, `attachesSpec`, `callsFor`);
  `offer.ts` (`offerOf`, `extensionPresence`), `send.ts` (`createSend`, 5000 ms, fallback, serial queue), `attachment.ts`
  (`STEP_FILES`, `FOLLOW_UP_CASE`, whitespace rule), `sendView.ts`, `welcome.ts` (`welcomeOf` with `plainSendViewOf`).
  `src/shared/protocol/assistant.ts`: `ASSISTANT_IDS = ['copilot', 'claudeCode']`, `ASSISTANT_TARGETS`, `isSendView`
  (strict keys and targets); texts in `assistantTexts.ts`, `nextStepTexts.ts`; `PROTOCOL_VERSION = 11`.
- Empty state: `Overview.tsx` and `SpecBoard.tsx` render `NO_SPECS_START_TEXT` with a `CopyButton`; `welcomeOf` returns a
  view only while setup has not run; `overviewView.ts` and `boardService.ts` call it.
- Embedded host (`src/hosts/embedded/ports.ts`): `assistantHost.extension()` returns `undefined`, so the offer is always
  none in JetBrains; settings come from host-pushed mirrors (`settingsChanged`); `contract.ts` lists the bridge calls;
  Kotlin `HostRouter.kt` routes them, `SettingsTable.kt`/`StudioSettings.kt`/`StudioConfigurable.kt` hold two settings.
- `jetbrains.yml › shared-guard` diffs `src/core` against `3bc615c`; `vscode-guards` checks the `.vsix` list and
  same bundles for JetBrains-only changes. `docs/jetbrains/parity-source.json` has about 60 rows that name PD-105.
- Platform facts (sources in the plan's *Research*): the Reworked Terminal API (`TerminalToolWindowTabsManager`,
  `TerminalView.sendText`, `createSendTextBuilder().useBracketedPasteMode()`, shell integration with command blocks) is
  documented since 2025.3 and **experimental**; the classic `TerminalWidget.sendCommandToExecute` always executes.
  `PluginManagerCore.isPluginInstalled` is documented; `getPlugin` is internal since 2026.2.

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | Copilot and Junie have no supported API to fill their chat input | JetBrains staff 2025-12-18 (LLM-2340); GitHub documents none for JetBrains; ADR-004 S-3 | a later spec could offer Send for them |
| A-002 | A pasted `#file:<path>` is useful to Copilot in JetBrains (a reference, or at least a path it reads) | VS Code Copilot's syntax; Copilot's agent reads named paths; JetBrains docs name no syntax | references become plain text; AC-028 records it and `copilotCopyText` changes in one place |
| A-003 | A pasted `@file:<path>` is a file reference in AI Chat with Junie | AI Assistant 2026.2 docs: "To reference a file, use `@file:file_name`"; Junie: "Use `@` … to attach files" | the path stays plain text; `junieCopyText` changes in one place (AC-028) |
| A-004 | Spike J-1 gives branch A or B, so form A stays | 18 §8 E-2 expects loaders to work; J-1 not run yet | form C: one constant changes, AC-018 already covers it |
| A-005 | Claude Code's readiness for input can be detected from the terminal within 15 s | Claude Code shows its input box after start; spike K-1 measures the time and picks the signal | new tabs always fall back to copy; since 2026-11-23 (AC-032) an existing Claude terminal needs the signal too, so wrong provisional markers (**K-1 pending**) turn every Send to Claude Code into copy plus the waiting text until K-1's values replace them |
| A-006 | The documented Reworked Terminal API stays usable from 2025.3.1 to the latest release | public since 2025.3, default engine since 2025.2; the Verifier runs on both ends | it is experimental: a change breaks only Send to Claude Code, which falls back (AC-013) |
| A-007 | "Installed and enabled" can be asked through non-internal API | `isPluginInstalled` documented; the Verifier checks the enabled check | AC-003's enabled half needs another documented API; K-1 records it; **K-1 pending** (review 20 S-7): forum notes say `isLoaded` may be unreliable from 2025.3 (not confirmed by JetBrains); the strategy is swappable (AC-040) |
| A-008 | The tool windows can be found by ID: GitHub Copilot Chat, AI Chat, Junie | the IDs are not documented; probe K-1 lists the real IDs in Rider | a missing ID only gives `Open <place> and paste …` (AC-019) |
| A-009 | GitHub Copilot's plugin ID is `com.github.copilot` | its Marketplace listing; not in GitHub's docs; probe K-1 confirms it | Copy for Copilot is never offered; one constant changes |

## 14. Open points

**Open: K-1 pending** (review 20 S-7, B-4): the values of the K-1 probe decide (a) whether `PluginManagerCore.isLoaded` and
`isDisabled` agree for the four plugin IDs (`PluginActivity.CURRENT`, AC-040; a difference switches the strategy, or moves the
check to the optional dependency), and (b) the real input, trust-dialog and login markers of `ClaudeReadiness` (AC-032). The probe
now records `PluginManagerCore.isLoaded` next to `isDisabled`. Nothing else is open. Proxy decisions of the clarify pass (2026-11-22, orchestrator's agent as product-owner proxy, from PD-068,
PD-094, PD-108, PD-109, 0024, 0034, 18, 19); Gregor may flip any of them:

- OP-001 (proxy) Folder and status: `active/`, In Progress, plan Not started, as the orchestrator asked; a Draft in
  `active/` would be a lifecycle mismatch the Studio reports. Implementation waits for 0034's close (plan gate G0).
- OP-002 (proxy) Stored values are VS Code's keys plus `junie`, so one core reads both hosts.
- OP-003 (proxy; **decided by Gregor 2026-11-23, review 20 S-2**) Claude Code is offered while the Terminal plugin is available; the Claude Code plugin is not required. A missing `claude` is told after the 15 s timeout (AC-036), not before.
- OP-004 (proxy; **decided by Gregor 2026-11-23, review 20 S-1**) The menu of Send to Claude Code adds `Send to a new chat`; the main part follows the session of the step's tip (new chat → new tab; current or any chat → the running Claude tab, else a new one).
- OP-005 (proxy) A Claude terminal is recognised by shell integration only and must run in the active FeatherSpec
  root; otherwise the Studio opens a new tab.
- OP-006 (proxy) Budgets: 15 000 ms readiness, 20 000 ms per Send to Claude Code; 5000 ms for every other handover.
- OP-007 (proxy) A draft in Claude Code's input stays; the paste lands at its cursor (no clear key is sent).
- OP-008 (proxy) Reference syntaxes `#file:` (Copilot) and `@file:` (Junie); whitespace paths are dropped for all three.
- OP-009 (proxy) The experimental but documented Reworked Terminal API is used, isolated and guarded, as an optional
  dependency: no stable API types without executing.
- OP-010 (proxy) Copy for Junie opens AI Chat when available, else the Junie tool window.
- OP-011 (proxy) Copy for is a split button whose menu holds only Copy prompt.
- OP-012 (proxy) The *Assistant* row sits between Show Step Tips and *Model hints*.
- OP-013 (proxy; **decided by Gregor 2026-11-23, review 20 S-5**) A stored value whose assistant is not available (`junie` without Junie, `copilot` without the Copilot plugin, `claudeCode` without the Terminal plugin) shows `None: Copy prompt` and is kept until another Apply.
- OP-014 (proxy) Copilot's plugin ID `com.github.copilot`; availability changes follow the IDE's plugin load events.
- OP-015 (proxy) The empty state gets the step action without Tip line and without attachment; the tree keeps its text.
- OP-016 (proxy; **decided by Gregor 2026-11-23, review 20 S-3, PD-110**) Copy for and Copy prompt work in Safe Mode as in a trusted project; Send to Claude Code only types into a running Claude terminal and never starts `claude` there.
- OP-017 (proxy) The shared-guard moves to 0035's start commit; "`src/core` unchanged" gives way to §6.8's checks.
- OP-018 (proxy) The JetBrains-only texts of §7 except T-1 and T-2.
- OP-019 `/sdd-clarify` 2026-11-22 (stranger pass, role-played; no subagent available): 9 findings, 2 blocking; all
  resolved by proxy (Gregor confirms with the plan):
  - (blocking) A `claude` in another folder would get paths it cannot resolve → the Claude terminal must run in the
    active FeatherSpec root (§6.3, AC-015, §10; OP-005).
  - (blocking) `jetbrains.yml › shared-guard` fails on any `src/core` change, which §6.6 and §6.1 need → OP-017, §6.8.
  - AC-005 contradicted AC-007 in VS Code's empty state → AC-005 excepts it.
  - AC-021 "every text VS Code renders" contradicted AC-007 → AC-021 names the text modules' existing texts.
  - AC-006 "the VS Code host" did not say start or head → head.
  - A tool window that fails to open was unnamed → §6.4 step 2 treats it as not found.
  - "the FeatherSpec project root" with several projects → the active one (§6.3, AC-012).
  - Copilot's plugin ID was a guess presented as fact → A-009.
  - AC-011 "bracketed paste" and AC-024 `plugin.xml` read as implementation → kept as constraints: the paste keeps
    Claude Code's `@` completion from taking the user's Enter, and AC-024 continues 0034 AC-033/AC-034.

## 15. Definition of Ready, Done and next steps

Ready: clarified 2026-11-22 (§14); the proxies wait for Gregor's read. Done per `AGENTS.md`: AC-001–AC-026 and AC-029
proven by tests and CI, AC-027 and AC-028 checked by Gregor, every parity row categorised, VS Code CI and `.vsix`
unchanged. Next: Gregor reads the plan; spike K-1 and 0034's close come first (plan stage 0); spec 0037 builds on the
option Junie and Copy for Junie.

## 16. Amendments after UX review 20 (2026-11-23)

Source: [docs/ux-audit/20-review-0035-g0.md](../../docs/ux-audit/20-review-0035-g0.md) §2 *Muss vor dem Hands-On*, work order
20-A items 1 to 3 (B-1, B-2, B-4). Part B of 2026-11-23 (Gregor: "Alles ja"; work order 20-B) adds B-3 with PD-110 and S-1 to
S-6; S-7 is only prepared (below). The budget rule is PD-111 and not part of this spec.

| Item | Change | Statements and texts touched | New criterion |
| --- | --- | --- | --- |
| B-1 | `references` becomes `paths` while AC-028 is not proven; the syntax stays | §6.2, §7 (setting description, option descriptions, name and tooltip, toggletip, log line); README, CHANGELOG | AC-030 |
| B-2 | Wait state and double-click guard for Send to Claude Code, JetBrains only | §6.3 (new bullet *While it runs*), §7 (waiting texts), §10 (quick succession) | AC-031 |
| B-4 | Claude Code waits for an answer (trust, login): readiness check also in an existing terminal, own waiting text, markers provisional | §6.3 (new bullet), §7 (waiting text, log cause), §10 (first bullet), AC-013 | AC-032 |
| B-3 | PD-110 (Gregor, 2026-11-23): in JetBrains a click on Send to Claude Code may start `claude` in a terminal tab; the Studio sends nothing. The README promise follows | README (intro, *Local and read-only*, Privacy), CHANGELOG | AC-033 |
| S-4 | Copy for Junie tells to choose Junie in AI Chat (AI Chat starts with its recommended agent, Codex) | §7 (done texts, toggletip), README, CHANGELOG | AC-034 |
| S-1 | The main part of Send to Claude Code follows the session of the step's tip (OP-004, decided by Gregor); the menu offers both | §6.1, §6.3, §14 OP-004, README | AC-035 |
| S-2 | A missing `claude` is told after the timeout, by its own text (OP-003, decided by Gregor); no early abort | §6.3 (new bullet), §7 (text, log cause), §10, §14 OP-003, README | AC-036 |
| S-3 | Safe Mode: Send to Claude Code only types into a running Claude terminal, never starts `claude`; else copy with its own text (OP-016, PD-110, decided by Gregor); Copy for unchanged | §6.1, §6.3 (new bullet), §7 (text, log cause), §14 OP-016, README | AC-037 |
| S-6 | The setting description is one short sentence pair, the option descriptions say the rest | §7 (setting description), README | AC-038 |
| S-5 | One rule for the option list: every option except None only while its assistant is available; the stored value stays (OP-013, decided by Gregor); the list follows plugin events while the page is open | §6.5 (options bullet), §14 OP-013, README | AC-039 |
| S-7 | **Prepared only, K-1 pending:** the check "installed and active" is one swappable strategy (`isLoaded` today, `isDisabled` as the alternative), the probe records both; the behaviour does not change | §6.5 (Available), §13 A-007, §14 | AC-040 |

Addendum 2026-11-23 (work list 3.6, Gregor brought it forward; review 20 §5 item 4: a long cold start is a product topic, the loading state): the tab no longer waits for the browser to show something. `StudioEditor` puts a native Swing placeholder (`LoadingPlaceholder`, text `Loading project…`, `UIUtil` colours, accessible name equal to the text) into the tab in the pass that creates the editor, and also while the core loads; the `JBCefBrowser` is created one event-thread turn later (`DeferredStart`, cancelled on dispose and on a view change) below the placeholder, and the placeholder goes when the first `shell` frame reaches the browser (`LoadingCover`). The timing line of 0034 AC-007 now ends at the first paint of the placeholder (the former `JBLoadingPanel.isLoading` test is the placeholder test) or at the first `shell` frame, whichever is first; the smoke probe finds `LoadingPlaceholder` instead of `JBLoadingPanel`; budgets unchanged. No bridge message changes. New criterion AC-041; parity row through the generator. VS Code unchanged.
