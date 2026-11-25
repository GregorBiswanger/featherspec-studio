# FeatherSpec Studio

A VS Code panel for projects that use [FeatherSpec](https://github.com/GregorBiswanger/featherspec), the lightweight spec-driven development template for AI coding agents. Studio reads your specs, plans and Memory Bank, shows where every spec stands, and names each spec's next FeatherSpec step, ready to paste into the AI assistant you work with — GitHub Copilot, Claude Code or any other.

Studio reads your project; the work with your agent stays in your assistant's chat. Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Junie, Claude Code or Copilot may start that assistant's command-line agent in a terminal tab when you click it. The one exception to read-only is [Set up FeatherSpec](#set-up-featherspec), which you start and confirm yourself.

![Overview in the dark theme: Now lists five specs in Review and + 7 more, the first row with Copy prompt and its coach line, then Up next and the figures](media/screenshots/overview-dark.png)

**Spec-driven development for GitHub Copilot and Claude Code, at a glance.** See every spec, its plan and its next step — and hand that step to your AI agent with one click.

## Why FeatherSpec Studio

- **See where every spec stands.** An Overview of what is in progress and what comes next, a Board with six columns, and a Plan map that shows a plan as stages, with the steps that can run in parallel side by side.
- **Always know the next step.** Studio names the exact FeatherSpec prompt for each spec — challenge it, plan it, start it, build the next step, verify it — and one sentence says which chat and which kind of model to use.
- **One click to your agent.** With GitHub Copilot or Claude Code, **Send** opens a chat with the prompt already in it and the files that step works on attached. It never sends for you: you read the prompt and press Enter.
- **Plans you can follow.** Progress in steps and percent, step IDs that jump to their card, returned work from parallel workers, and the ways to run a stage.
- **Local and read-only.** No account and no telemetry. Studio reads your project files. Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Junie, Claude Code or Copilot may start that assistant's command-line agent in a terminal tab when you click it. Its only network call is the FeatherSpec download you start yourself with **Set up FeatherSpec**.

## Get started

1. **Install FeatherSpec** in your project ([FeatherSpec on GitHub](https://github.com/GregorBiswanger/featherspec)) — or open an empty folder and click **Set up FeatherSpec** in the Studio.
2. **Run `/sdd-setup`.** Studio greets a new project with *Welcome to FeatherSpec* and offers the prompt; your agent sets the language, the Memory Bank and the architecture snapshot.
3. **Choose your assistant** with the setting `featherspec-studio.assistant` (`copilot` or `claudeCode`) and follow the **Next step** from spec to plan to done.


## Feature tour

The **FeatherSpec Studio** icon in the Activity Bar opens the **Specs** view: every spec as a row in four groups, with the next step on a click away. The panel (the toolbar's **Open** button, or `FeatherSpec Studio: Open`) has three tabs, Overview, Board and Plan map.

### The Specs view

The groups are **In progress** (Blocked, Review, then Active), **Ready**, **Backlog** and **Done** (collapsed until you open it); each shows its count, and a group without a spec is left out. A group that holds a spec with a problem adds the number of problems to its count and shows a warning icon, open or collapsed. A row reads `<number> <title>`, with the short form of the next step beside it (for example `/sdd-compile`; a spec without a step shows its state), an icon and a colour that carry the state; label and description together stay within 32 characters, and the step is never cut. Hover a row for the title, the reason behind a derived state, the next step, the progress (steps and criteria) and any problem; a screen reader hears the same as one sentence. A click selects the spec and shows its detail in the panel (the panel opens if it is closed, without taking focus). A row with a next step has an inline **Copy Next Step** button; the context menu offers **Open Spec**, **Open Plan** and **Copy Next Step**. The badge on the Activity Bar icon counts the specs that wait for you (Review and Blocked). The toolbar has **Open**, **Refresh** and the gear (**Open Settings**); the view follows every change of your files within half a second. `FeatherSpec Studio: Focus on Specs View` reaches the view from the keyboard; Shift+F10 on a row opens its context menu. With several projects in the workspace the view's description names the active one.

### Overview

What is in progress, what comes next and what needs fixing, one line per spec: **Now** lists the specs in Blocked, Review (oldest first) and Active, at most five rows ("+ n more" opens the rest on the Board), **Up next** (Ready first, then Backlog) the next three ("+ n more" opens the rest on the Board), **Problems** every spec or project file with a problem, in a sentence (hover for the technical reason). A row shows number, title, the state as an icon (its name in the tooltip) and the spec's next step (the step short form, for example `Verify · /sdd-compile`) with its own **Copy prompt**, which copies without opening anything. A row follows the width of its own list: one line when wide, two when narrower, three when narrow. The one primary button of the Overview is the next step of the spec you select (in the side panel), or the Copy prompt of an empty project (while `/sdd-setup` has not run in a FeatherSpec project, the empty Overview and Board instead say `Welcome to FeatherSpec` and offer `/sdd-setup`, with Send or Copy prompt, the Specs tree and the Up next line pointing to it as well; once it ran, `No specs yet. Start with /sdd-specify` returns without a reload); the first Now row has a secondary Copy prompt, and every other Copy in a list or on a card is a small icon button that turns into a check once copied. While the side panel shows the first Now row's spec, that row leaves out its coach line, because the detail shows it. A click, Enter or Space on a row selects the spec and shows its detail in a side panel next to the Overview; the area does not change. One line of figures shows the total and the number of specs per board state; hover it for the progress (done specs with status Implemented or Baseline ÷ all specs without Deprecated). **Activity** is collapsed until you open it and lists the ten latest status changes. Hover the project name in the panel header for the FeatherSpec version and the time of the last update. A figure the sources cannot deliver reads "not available".

### Board

![Board in the dark theme: six columns, the Review column open with cards that show the next step and an icon Copy prompt](media/screenshots/board-dark.png)

Every spec as a card in six columns: Backlog, Ready, Active, Review, Done and Blocked. A column without a card is a narrow strip with its name and count; the other columns share the width, and the board scrolls sideways when they do not fit. **Done** is collapsed until you open it with its toggle, and Studio remembers your choice per workspace. A card has three rows: number and title; what matters in its state (a Backlog card shows what the spec still needs, a Blocked card why, otherwise the steps and criteria progress), a warning with the number of problems and the day of the last change; and the next step. Hover a Ready, Review or Blocked column header for the rule behind the state, and a card for its description. The day comes from the plan's `Last updated:` line, else from the file's modification time; it is left out while all specs show the same day. Opening the Board from the Overview with a filter shows one **Filter: …** chip with **Clear filters**; sort by number, title or last change. The last line of a card is the next step: the short intent and the short form of the prompt (for example `Write plan · /sdd-plan`) with a **Copy prompt** button that puts the full line on your clipboard. The board works with the keyboard: arrow keys move between cards, Enter or Space selects a card and shows its detail in the side panel, Tab from the card reaches its **Copy prompt**, Enter or Space copies. The board moves no spec; lifecycle moves belong to FeatherSpec's `/sdd-lifecycle`.

### Plan map

![Plan map in the dark theme: a plan as stages with the next step in its header, stage 2 can run in parallel with two step cards and the ways to run it as three choices, the side panel beside the map](media/screenshots/plan-map-dark.png)

The third tab shows one spec's plan as stages. Select a spec that has a plan (in the tab's own list, the Specs view, the Overview or the Board) and each stage is a row: `Stage 2 — add and subtract`, with a line that says whether its steps run in order or can run in parallel because they share no file. Steps are cards with their files and the acceptance criteria they cover, side by side where they can run together; open a card for what to do and how it is verified. A finished stage folds to the step IDs. The side panel stands beside the map from 900 px; below that the map shows alone.

For the stage you are on, **Ways to run stage 2** offers three ways as radio buttons, In sequence (the default, one chat builds the steps one after another), Subagents or Other agents (each step runs in another chat or worktree from its start line; commit first), and shows the prompt of the one you check with a Copy prompt, or the start lines for Other agents. The **?** button named **About these ways** explains them. A worker leaves a return note; once steps have returned, the next step is **Integrate the returned steps** (while a member of a parallel group is still out it reads `When T-004 is back: integrate the returned steps` and stays grey) and the map shows `Returned · done` or `Returned · blocked` on the cards. The Plan section in the detail gives the same picture in short, with a link to the map. Studio only shows and copies: it starts no agent on its own and writes no file.

The map's header shows the **Next step** of the spec you look at, with its Copy prompt, so the side panel beside the map leaves its own out. Progress reads like `4 of 6 done · 67%`. A step ID is a link: click it in the side panel, in a Next step or in an Overview row and the map shows that step's card, expanded and briefly highlighted; **Ctrl+click** (Cmd+click on macOS) opens the plan file at the step instead. In the Specs view, **Show in Plan Map** in a row's context menu opens the map on the spec's next step. A card of a done step shows what was verified, a returned step what its worker reported, and each covered criterion its state; when the stage you are on can run in parallel, the Next step says so and **Ways to run it** leads to the ways.

### The detail of a spec

![Board in the light theme with the detail of a spec in the side panel: Next step with Copy prompt, Plan and Progress](media/screenshots/spec-detail-light.png)

Select a spec in the Specs view, on the Board or in the Overview (click, Enter or Space) and its detail opens in a **side panel** to the right of the area; the area stays where it is. Set the width with the **divider** between the area and the panel (move it with the pointer, or focus it and press the arrow keys; Enter or a double click resets it); Studio remembers it for the workspace. Below 900 px the area or the detail shows alone: a back button at the top of the detail returns to the area, and so does Escape. Beside the area, close the panel with its close button or Escape; focus returns to the card or row you came from. The selection survives switching tabs, closing the panel and reloading the window. The panel is a picture of the spec's situation, not a copy of its files: the state, **Next step** (with **Copy prompt**), the **Problems**, **Progress** (steps done and the next open step; criteria verified and the ones still open), the **Files** (spec, plan, archived plans, return notes) and, folded, the **Format notes** and the **Status history**. Every ID and file name is a link: it opens the file in the editor **beside** the Studio, at the line where the ID is defined. A file that is gone reads "File not found: ..." at the link.

### The next step everywhere

The next step is a prompt for your assistant, shown in five places and copied with one click: on a row of the Specs view (its inline **Copy Next Step**), in the detail of a spec, on every Board card, on each row of Now, Up next and Problems in the Overview and in the status bar. Every line says what it does before you copy it: in the detail each prompt sits under its intent (for example "Have the result verified" over `/sdd-compile`, "Continue with T-003 Reject money values" over `Implement T-003 of <plan>`); cards, rows and the quick pick show a short intent beside the short form of the prompt (`Verify · /sdd-compile`; the short intent starts with the first word of the intent: `Find blocker`, `Write plan`, `Start`, `Report`, and `Move back to Ready` for a spec whose folder and status disagree), the tree keeps the short form of the prompt, and every tooltip shows the intents with the full prompts. **Copy prompt** puts exactly the prompt on the clipboard, never the intent. Studio starts no agent on its own and changes no file; paste the prompt into your assistant's chat. On an Active spec with a ticked step and an open plan step the detail offers two prompts: `Implement <ID> of <plan>` builds exactly that step and stops, and `/sdd-plan <spec>` under "Or: not sure where it stands? Let the agent report first" has the agent report where the plan stands. When a step has a `Verified:` line but no tick, and before FeatherSpec 1.11.0 also when the plan's `Current step` names an unfinished step other than the open one, the report comes first, under "Let the agent report first — the plan and the ticks may differ", and the step to continue with second, under "Then: continue with <ID> <title>" (from 1.11.0, `Implement <ID>` brings a lagging `Current step` up to date itself); without an open step the one prompt has the agent report where the plan stands, a Ready spec in `backlog/` with no ticked step starts with `/sdd-lifecycle <spec> In Progress` under "Start: move the spec and its plan to active" (short form `Start · Set active`), and once the pair sits in `active/` the Studio offers `Implement <ID> of <plan>` under "Start implementing: <ID> <title>". In the detail, the first prompt's **Copy prompt** is the primary button and further prompts have a secondary one. Where an assistant is chosen (see [Send to your assistant](#send-to-your-assistant)), the further prompts of the detail and of the Plan map header offer a secondary **Send** of their own instead, for example under `Then: write the plan`, each with its own Tip sentence; it attaches the files its prompt names (see [Send to your assistant](#send-to-your-assistant)).

Under the first prompt of the detail, and in the first Now row of the Overview, a **coach line** says in one sentence where to run it and with which kind of model, for example `Tip: Use a new chat with a strong model from another model family.` (for a step that continues work, where either the current or new chat will do, `Tip: Use the current chat or a new one with a fast model.`). The line is always visible, once per spec and view. The **?** button beside it, named **About this step**, opens four short paragraphs: what the step does and what comes next, why that chat and that model, and what stays yours. Escape, a second click or a click elsewhere closes it; Escape closes only it, not the panel. Switch both off with the setting `featherspec-studio.showStepTips` (see [Settings](#settings)).

The status bar shows the spec you work on: `<number> · <state> · <short form>`. The current spec is the one selected in the Specs view, the Overview or the Board; without a selection, the most urgent spec with a step (Blocked, then Review, then Active). A click copies the full line and the entry reads **Copied** for two seconds. Without a current spec the click opens a quick pick of the specs that have a step. The tooltip carries the project name and the FeatherSpec version, an "Open Studio" link and, with several projects, "Switch project".

### Send to your assistant

Choose your assistant once with the setting `featherspec-studio.assistant` (**Open Settings**, the gear in the Specs view, takes you there): `none` (the default), `copilot` or `claudeCode`. While that assistant's extension is installed and enabled, the first prompt of the detail and the first Now row of the Overview offer **Send to Copilot** or **Send to Claude Code** in place of **Copy prompt**. The button opens a new chat for every step, with the prompt already in its input; it sends nothing, you read the prompt and send it yourself. Send also attaches the files its prompt names, for GitHub Copilot and Claude Code, in every FeatherSpec version (FeatherSpec 1.11.0 or later tells the agent that an attached spec counts as read; an older version may read it a second time, so below 1.11.0 or with an unknown version the **?** asks for the update); nothing extra shows under the button, but its tooltip and accessible name say what goes along, for example `Attaches 0002-x.md.`. The start step (`/sdd-lifecycle <spec> In Progress`) attaches the spec and its plan, `Implement <ID> of <plan>` only the plan, the other `/sdd-` commands the spec, and the `/sdd-lifecycle` of a folder contradiction nothing; Claude Code gets one `@path` per file, and a path with whitespace gets none. Copy prompt attaches nothing, and neither does **Send to the current chat** in GitHub Copilot, whose chat knows the spec already. Send always stands on its own row under its prompt, left-aligned; the prompt block is as wide as its text, and a path breaks only after a `/`. The arrow beside the button opens a menu that checks the active choice: **Send to a new chat**, for GitHub Copilot also **Send to the current chat** (which replaces an unsent draft there), and **Copy prompt**; Claude Code opens a new chat only. If the chat cannot be opened, Studio copies the prompt and says so in one notification. Without the setting, or without the extension, nothing changes: you see **Copy prompt** only, and Codex and other assistants keep working the same way. While the project has no spec yet and setup has run or its state is unknown, the empty state `No specs yet. Start with /sdd-specify` offers the same button for `/sdd-specify`, without an attachment.

## Requirements

- VS Code 1.146 or newer (desktop).
- A workspace folder that is a FeatherSpec project: an `AGENTS.md` with a `FeatherSpecVersion:` line and a `.specs/` directory at the folder root. Older projects without the version line count when they have a `.claude/commands/sdd-*.md` file.
- An AI assistant that runs FeatherSpec commands, to act on the next step Studio names. Studio itself needs no account and no network.

## Getting started

1. Install the extension and open a FeatherSpec project folder. The status bar shows the spec you work on (`<number> · <state> · <short form>`); the tooltip names the project and its FeatherSpec version.
2. Click the FeatherSpec Studio icon in the Activity Bar. The Specs view lists your specs; select one, or use **Open** in its toolbar for the panel.
3. Read the next step on a card, an Overview row or in the status bar (or the **Next step** in the detail of a spec), read what it does under its intent, click **Copy prompt** and paste the prompt into your assistant's chat.

## Set up FeatherSpec

In a workspace folder without a FeatherSpec project, the Specs view in the Activity Bar offers **Set up FeatherSpec** (also `FeatherSpec Studio: Set Up FeatherSpec` in the Command Palette). It needs a trusted workspace.

1. Studio downloads the latest FeatherSpec release from GitHub (`github.com`, no account, no token).
2. It shows what it would do in the folder and asks you to confirm. Nothing is written before that.
3. It creates the files that are missing, completes `.gitignore` and `.vscode/settings.json` with the lines FeatherSpec needs, and never overwrites a file of yours. A file that differs from the release is kept as it is; its release version is parked in `.featherspec-setup/`.
4. If files were parked, the folder stays "setup not finished". **Copy merge prompt** puts a prompt on your clipboard that tells your coding agent how to merge them; the folder becomes a project once `.featherspec-setup/` is gone.

Links inside the folder are written through, so a file behind a link changes where the link points. No file of yours is deleted, renamed or moved; a later run replaces the content of `.featherspec-setup/` with that run's parked copies. The root `AGENTS.md` is created last, so an interrupted setup leaves the folder incomplete rather than half a project. Walkthrough: [Hands-On](https://github.com/GregorBiswanger/featherspec/wiki/Hands-On-Walkthrough).

## How board states are derived

Studio derives each spec's column from the files, in this order:

- in `.specs/done/` → **Done**;
- the plan or a return note says Blocked → **Blocked** (derived);
- in `.specs/active/` with spec status In Progress and plan status Done, or every step of its plan ticked or dropped (at least one ticked), whatever the plan's status line says → **Review** (derived);
- in `.specs/active/` → **Active**;
- in `.specs/backlog/` and passing the readiness checks (a draft with a plan that has not started) → **Ready** (derived);
- otherwise → **Backlog**.

A spec with contradictory or unreadable files stays in the column of its folder and shows a sentence that says what is wrong (the technical reason is in its tooltip). Hover a Ready, Review or Blocked column header on the Board for the rule behind a derived state; the rule ID (`S-READY`, `S-REVIEW`, `S-BLOCKED`) is in its tooltip. FeatherSpec has no priority, persisted compile verdict or dependency field, so the Studio shows none.

## Commands

| Command | What it does |
| --- | --- |
| `FeatherSpec Studio: Set Up FeatherSpec` | Download the latest FeatherSpec release and set it up in a folder without a project, after a confirmation |
| `FeatherSpec Studio: Open` | Open the panel on the area last shown |
| `FeatherSpec Studio: Open Overview` / `Open Board` / `Open Plan Map` | Open the panel on that tab |
| `FeatherSpec Studio: Focus on Specs View` | Move the keyboard focus into the Specs view |
| `FeatherSpec Studio: Copy Next Step` | Copy the prompt of the next step of the current spec (same as a click on the status bar entry); without a current spec, pick a spec from a list |
| `FeatherSpec Studio: Open Settings` | Open the Settings UI at the settings of this extension (the gear in the Specs view) |
| `FeatherSpec Studio: Select Project` | Choose the active project when the workspace has several |
| `FeatherSpec Studio: Refresh` | Run project discovery again, then read the specs of the active project again |

## Settings

The settings are under **FeatherSpec Studio** in the Settings UI and apply at once, in every window. The choice of the assistant is read from your user settings and, in a trusted workspace, from the workspace; in Restricted Mode only your user value counts.

| Setting | Default | What it does |
| --- | --- | --- |
| `featherspec-studio.showStepTips` | `true` | Show the coach line and the **About this step** button. With `false`, intents, prompts and **Copy prompt** stay as they are. |
| `featherspec-studio.modelHints` | `{}` | The names of your own models, `strong` and `fast`, for the coach line, for example `{ "strong": "my best model", "fast": "my quick model" }`. Plain text, at most 40 characters; Studio ships no model name and never switches a model. |
| `featherspec-studio.assistant` | `none` | The AI assistant that **Send to Copilot** or **Send to Claude Code** opens: `none`, `copilot` (GitHub Copilot Chat, `GitHub.copilot-chat`) or `claudeCode` (Claude Code, `anthropic.claude-code`). Studio only fills the chat input and sends nothing; any other value acts as `none`. |

## JetBrains IDEs

FeatherSpec Studio also runs in JetBrains IDEs, with the same Overview, Board, Plan map and spec detail, and the same next step. It is tested in Rider and WebStorm; any IntelliJ-based IDE from version 2025.3.1 (build 253.29346) on can install it.

**Install.** The plugin is not on the JetBrains Marketplace yet (a later spec, 0036, publishes it there). Until then, take the `plugin-zip` artifact of a green run of the *JetBrains* workflow on GitHub, unzip the download, and in the IDE choose **Settings | Plugins | gear | Install Plugin from Disk…** and pick the plugin ZIP. Restart the IDE when it asks.

**What you get.** A **FeatherSpec Studio** tool window with the **Specs** tree (the same four groups as in VS Code, with the context actions Open Spec, Open Plan, Show in Plan Map and Copy Next Step), a count of Review and Blocked specs on its title, the Studio panel as an editor tab (**FeatherSpec Studio: Open** in Find Action), a status bar entry with the next step, and **FeatherSpec Studio: Set Up FeatherSpec**. The Studio commands are reachable through Find Action under the prefix `FeatherSpec Studio:`. The Studio takes the colours of the IDE theme, including High Contrast.

**Send.** **Settings | Tools | FeatherSpec Studio | Assistant** chooses what the step action does; the change applies at once, in every open project. With `None: Copy prompt` the step action is **Copy prompt**: it puts the prompt on your clipboard and you paste it into your assistant. Without a choice the setting follows Junie: while the `junie` command is available the Assistant is Junie, otherwise `None: Copy prompt`. With an assistant chosen, the first prompt of the detail and of the Now row, the follow-up lines and the empty state *No specs yet* offer **Send to Junie**, **Send to Claude Code** or **Send to Copilot**, with the same attached files as in VS Code. Each types the prompt with one ` @path` per attached file into a terminal tab of the IDE, with the command-line agent of that assistant (it needs the Terminal plugin and the command on the PATH of the IDE):
- `junie` for Junie, `claude` for Claude Code, `copilot` for GitHub Copilot (new tabs `Junie`, `Claude Code` and `GitHub Copilot`).
  - Where it types: into a running tab of that agent in the IDE terminal, or into a new tab in the project root after it has started the command, with no flag. The main part follows the step's Tip: where the Tip says to use a new chat (Verify and Write plan, for example) it opens a new tab, otherwise it uses the running tab if there is one; the arrow menu offers **Send to the current chat** and **Send to a new chat** either way.
  - It never presses Enter: you check the prompt in the agent and send it yourself.
  - If the agent is not ready for input, for instance because it waits for you to trust the folder or to log in, or the terminal is not ready within 15 seconds, Studio types nothing, focuses the tab, copies the prompt and says so: answer the agent there, then send again.
  - While a Send starts the agent the button reads `Starting <Name>…` and ignores further clicks.
  - If after the 15 seconds the command is not found on the PATH of the IDE, Studio says `<Name> did not start. Is the <command> command installed? The prompt is copied.`
  - In a project the IDE does not trust (Safe Mode) Studio never starts an agent: it types only into a running tab; otherwise it copies the prompt and says `This project is not trusted, so Studio does not start <command>. The prompt is copied.`

Each assistant appears in the setting only while the Terminal plugin and its command are available. While one of the three is missing the page shows the hint `Junie, Claude Code and GitHub Copilot appear here once their command is on the IDE's PATH. Installed one just now? Restart the IDE.` A stored value whose assistant is missing shows `None: Copy prompt` and is kept. The Terminal plugin is an optional dependency of FeatherSpec Studio; without it no Send is offered.

**Settings.** **Settings | Tools | FeatherSpec Studio** holds *Show step tips* and the names of your *strong* and *fast* models. They apply to the whole IDE, not per project, and take effect at once.

**Local and read-only.** As in VS Code, there is no account and no telemetry; the status history is stored on your machine outside the project, separately from VS Code's. The one network call is the download you start with **Set up FeatherSpec**, which uses the IDE's proxy settings. A project counts as trusted when the IDE trusts it; the Studio's trust action opens the IDE's help page on project security; it does not grant trust itself.

**Without the embedded browser.** The panel is a web page, so the IDE needs its embedded browser (JCEF). If the IDE does not support JCEF, or the operating system's sandbox has suspended it (for example AppArmor on Ubuntu 24.04 and newer), the tool window shows a notice instead of the tree, the status bar says *FeatherSpec unavailable*, and only the settings page works. The IDE's own *Embedded Browser is suspended* notification offers the fix for the sandbox case; this section is the help page the notice opens.

**Known limits in the IDE.**
- The first start of a project needs a few seconds while the hidden browser loads the Studio's core; on Windows a cold start can take noticeably longer (up to about half a minute on a cold CI runner). The panel shows a loading state until then.
- Opening a file *beside* the panel splits the editor through a platform call that can change between IDE versions; if it fails, the file opens in the current editor window.
- The editor font of the panel follows a theme switch on the next theme change or when the tab is reopened.
- A change made by another program to a FeatherSpec file shows within 2 seconds. Projects are found at the project folder and its content roots, not in subfolders.

## Privacy and stored data

- Studio has no telemetry. It reads your workspace and writes only its own status history. The one exception is [Set up FeatherSpec](#set-up-featherspec): after you start it, it downloads the latest release from `github.com` and `codeload.github.com` (no account, no token, only a `User-Agent` header) and, once you confirm, writes the release files into the folder you chose. Nothing else contacts a network service on its own.
- Studio starts no agent on its own and sends nothing. In JetBrains IDEs, Send to Junie, Claude Code or Copilot may start that assistant's command-line agent in a terminal tab when you click it. The next step is a text line; it reaches your assistant only when you paste it, or when you choose Send to Junie, Claude Code or Copilot, which type into the agent's input and send nothing. In a project that is not trusted (Safe Mode) no Send starts an agent.
- The status history (the changes of a spec's state that Studio observed while it was running) is stored on your machine in VS Code's global storage of the extension, outside your workspace, per project. Entries older than 90 days are removed when Studio starts. Earlier builds of Studio also stored agent run data; Studio removes it at the next start. Details, location and how to delete it by hand: [docs/runtime-data.md](docs/runtime-data.md).

## Known limitations

- Studio names the next step; it does not run it. **Send to Copilot** and **Send to Claude Code** fill the chat input and send nothing. Lifecycle moves between folders belong to FeatherSpec's commands in your assistant.
- Only the VS Code window that holds the project's write lock records the status history; a second window shows it read-only. The next step and **Copy prompt** work in every window.
- Projects are detected at workspace folder roots only, not in subfolders.
- Restricted Mode: Studio shows the project and the next step; Set up FeatherSpec needs a trusted workspace.
- Virtual workspaces (such as vscode.dev) are not supported. Remote, WSL and Dev Container workspaces have not been tried.

## Learn more

- FeatherSpec: <https://github.com/GregorBiswanger/featherspec>
- What Studio stores: [docs/runtime-data.md](docs/runtime-data.md)
- Issues: <https://github.com/GregorBiswanger/featherspec-studio/issues>

## Development

`npm run test:unit` (unit tests), `npm run compile` (type check, lint, bundle), `npm test` (extension-host tests; they download VS Code). Specs and plans live in `.specs/`, project context in `.memory-bank/`, the constitution in `AGENTS.md`.

## License

[MIT](LICENSE)
