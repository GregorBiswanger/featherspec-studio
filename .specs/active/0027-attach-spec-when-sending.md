# Attach the Spec When Sending

**Status:** In Progress
**Plan:** [0027-attach-spec-when-sending.plan.md](0027-attach-spec-when-sending.plan.md)

Basis: `docs/ux-audit/09-round2-review.md` §6 (V3), §8; `docs/decisions/v3-attach-spike-2026-11-19.md`. **PD-082**
(Gregor's must), **PD-083** (V-3), **PD-089** (per assistant), PD-068, PD-074, PD-078, PD-080, PD-018, PD-031–PD-033,
PD-047, PD-016; guidelines 1–3, 6, 8–12. Builds on 0024 as 0026 amends it, 0025 (the header's split button, D-2) and 0028
(its cases, D-4); restates none. No interview: each choice is a proxy in §11. Code: `d0c3766`.

**Amended 2026-11-20 by PD-091** (Gregor: "I ran V-3 long ago. I want the spec files to always be attached, for Copilot and Claude Code, depending on which assistant is set."): both assistants attach in every FeatherSpec version; the version gate, the update sentence and C-2 are gone (§6.2, AC-002, AC-011, AC-012, AC-017, AC-019, OP-006).

**Changes 2026-11-19** (`docs/ux-audit/12-finish-plan.md` D4; PD-084…PD-089): per assistant by V3 (PD-089; §6.2, AC-019),
Copilot open until C-2 (OP-006); a large-spec probe (AC-020); no `modelSelector` and `Copy prompt attaches nothing.` stay.
`/sdd-plan` (S99, standing answer `PLAN-R3.md`): OP-001 closed by 13, OP-002 re-checked at the branch head, OP-003 kept as
proxy; no criterion changed.

## 1. Summary

Where Send is offered (0024), Send also attaches the spec file: Copilot through `attachFiles` on its one `open` call,
Claude Code through ` @<spec path>` at the end of the prefilled text (PD-083). A line under the split button shows the
file as a chip: `0001-tip-splitter.md attached when sent`. Every step that reads the spec attaches; `/sdd-lifecycle` and
`/sdd-overview` do not. It needs FeatherSpec 1.11.0 and an assistant measured not to read an attached spec again (PD-089);
on older projects Send stays as it is and its `(?)` names the update. Copy prompt is unchanged; nothing is submitted.

## 2. Goal and problem

Today the prompt names the spec and the agent reads it with a tool: the developer cannot see what goes along, and the read
costs a turn (09 §6). Gregor's must (PD-082): the spec goes along as real context, visible as a chip. V-3 showed both
assistants attach without submitting, and with FeatherSpec 1.10.0 both read it again (V-3 (4)). Goal: the developer sees
the file the chat will show; the agent starts with the spec in context; no project pays twice. Success: with 1.11.0 Gregor
sees the chip in each attaching assistant, nothing is submitted, and the agent reads no spec file (AC-017).

## 3. Users and roles

Developer, one role (0001–0007), with Copilot or Claude Code chosen (0024 §6.2); without a choice nothing changes.

## 4. Scope

### In scope

- Which steps attach (§6.1); the version gate and 0002's newest known version (§6.2); the attachment line (§6.3).
- The call shapes (§6.4); the check at send time, a missing file included (§6.5); never submit, Copy prompt as is (§6.6).
- Which assistants attach (§6.2); the large-spec probe (AC-020); §7's texts; §5's amendments; README, CHANGELOG, checklist.

### Out of scope

- A setting to turn attaching off — because PD-082 says "no setting at first"; the developer can remove the chip in the chat (A-011).
- `modelSelector` or any model preselection — because Gregor chooses the model (09 §6, PD-082); an opt-in would be its own spec.
- Attaching the plan, return notes or Memory Bank — because the must names the spec, and a step changes its plan, so the agent reads the plan fresh.
- The sentence that an attached file counts as read — because it is FeatherSpec's (PD-082; 1.11.0 `AGENTS.md`, OP-002); a Studio prompt suffix would be a second truth (09 §6).
- Attachments for Copy prompt, ways, start lines and card Copies — because the clipboard carries none (V-3 (3)), and those places have no Send (0024 §4; 0025 §4 row 0023 §3, §5.2; 0026 §6.6).
- Watching a rename while the chat waits — because V-3 (5) leaves it to the developer.
- C-2 is **not needed** (PD-091, 2026-11-20). Earlier: running C-2 (the re-read in Copilot and the extension) — because FeatherSpec's QA runs it (12 C-2); it sets §6.2 (OP-006).
- Codex; a Claude Code current chat — because 0024 A-003 and OP-003 hold.

## 5. Amendments of other specs

Applied in the implementing change set as a note under each statement, "*Amended by 0027 (PD-082, PD-083): …*", after
the earlier notes (0024, 0025, 0026, 0028). The PD register is not edited.

| Spec · statement | Amendment |
| --- | --- |
| 0024 §6.4 table, rows Copilot `{ query: <line>, isPartialQuery: true }` and Claude Code `undefined`, `<line>`; AC-005 and its example; 0026 §6.1 "0024 §6.4–§6.6 hold", AC-001 "with `{ query: <line>, isPartialQuery: true }`" | Where the Send view carries an attachment: 0027 §6.4 (AC-004, AC-005); otherwise unchanged (AC-006) |
| 0024 §6.4 "`<line>` is the full prompt the control shows"; §4 out of scope "Prompt wording per assistant (08 S-5)" | The prompt stays the line; only Claude Code's prefilled text adds ` @<spec path>` (0027 §6.4); clipboard and Copy prompt unchanged |
| 0024 §6.4 "before the first call, it checks in order: …" | Then 0027 §6.5's check |
| 0024 §6.3 *Feedback* "success — … §7's sentence as tooltip and announced" | For a Send whose attachment §6.5 drops: 0027 §7's sentence (AC-009) |
| 0024 §6.6 "No webview message names a command"; AC-007 "a send request that holds a key outside assistant, target and line" and its search list | The request may also hold `attach`, a spec path; the host attaches nothing else (0027 §6.5); the search adds `preserveInput`, `modelSelector` (AC-007) |
| 0024 §6.8 and §7 toggletip row `Send to <Name> puts the prompt …`; AC-013 "§7's two sentences literally" | Followed by 0027 §7's update sentence where §6.2 withholds an attachment (AC-011) |
| 0024 §6.3 *Place* (the split button), AC-003, AC-009 "the split button's DOM shall keep its elements and order"; 0025 §5.3, AC-009 (the header's split button) | Followed by 0027's attachment line where the view carries one; it stays during feedback (AC-003) |
| 0021 §6.5 "directly under the first line's Copy prompt", AC-009 "directly after the first line's Copy prompt and its status region"; 0022 §4.1 "the coach line and `?` follow its Copy prompt", AC-001 "coach line and `?` shall follow"; 0025 AC-016 "(tips off: after its Copy prompt and status region)" | After 0027's attachment line where it shows |
| 0022 §4.6 "(this list is complete)" (as 0023 amended it) | Plus the attachment line's file name (0027 §6.3) |
| 0002 §4 "Supported version range 1.7.0–1.10.0"; §8 row "newer than 1.10.0"; AC-016 "newer than 1.10.0", "For 1.7.0 to 1.10.0" | Up to 0027's attach version (§6.2, AC-002) |
| 0013 AC-016; 0015 AC-027; 0016 AC-023; 0017 AC-024; 0018 AC-030; 0019 AC-023; 0020 AC-021; 0021 AC-020; 0022 AC-017; 0023 AC-016; 0024 AC-014; 0026 AC-015; the test audits of 0025 and 0028 | Also except the tests 0027 AC-014 lists against a statement this table changes |

## 6. Business rules

### 6.1 Which steps attach (PD-082 "decided per step"; A-001)

Only line 1 has Send (0024 §6.3), so its case decides. The rule is data of the case: a case another spec adds states
its row, as 0028's do here. A step *attaches* when it reads this spec's text.

| Case (0021 §6.1, §6.2; 0028) | Line 1 | Attaches | Reason |
| --- | --- | --- | --- |
| NS-2 | `/sdd-lifecycle <spec>` | no | A duplicate (two files: attaching one would prejudge which is right) or a folder–status contradiction (status lines and a move, not the text) |
| NS-4 without plan | `/sdd-overview` | no | Project-wide: every spec's state, not this spec's text |
| NS-4 with plan | `/sdd-plan <spec>` | yes | Mode B reads the plan, then the spec (`sdd-plan.md`) |
| NS-5, 0028's finished plan | `/sdd-compile <spec>` | yes | Checks every criterion of the spec (09 §6) |
| NS-6 open step; NS-7 | `Implement <ID> of <plan>` (NS-7's start signal by D-4, 0028) | yes | A new chat (PD-078) starts empty; the step's tests come from the spec's criteria, and `AGENTS.md` has the agent read spec and plan, so the attachment replaces a read |
| NS-7 without open step | `/sdd-plan <spec>` (D-4, 0028) | yes | Mode B, as NS-4 with plan |
| NS-6 report first (0028), plan without open step, returned work | `/sdd-plan <spec>` | yes | Mode B, as NS-4 with plan |
| NS-6 no sibling plan; NS-10 | `/sdd-plan <spec>` | yes | Mode A or C reads the spec first |
| NS-8 | `/sdd-specify <spec>` | yes | Revise mode re-interviews the spec (09 §6) |
| NS-9 | `/sdd-clarify <spec>` | yes | An adversarial pass over the spec (09 §6) |

Copy-only prompts (line 2, ways, start lines, card Copies) never attach (§4).

### 6.2 Version gate and assistants (A-002…A-004, A-012)

> **Amended 2026-11-20 by PD-091:** there is no version gate and no per-assistant exception. Claude Code and Copilot both *attach*; a step attaches when §6.1 says yes, an assistant is set, and §6.4 allows it (Claude Code: no whitespace in the path), in every version and for `unknown`. The attach version, the update sentence and C-2 are not needed. The text below is the earlier decision.

The *attach version* is `1.11.0`, the first FeatherSpec release with the sentence (A-003). A step attaches only while the
active project's `FeatherSpecVersion:` value (PD-032) is a semantic version at or above it by 0002's comparison (a
pre-release is below). Below it, `unknown` (legacy, PD-031) or no semantic version: no attachment, no line, Send as 0024
and 0026 say; the toggletip adds §7's update sentence (A-010). Discovery reruns when `AGENTS.md` changes (PD-033).
**Per assistant (12 D4-2, PD-089):** an assistant that still reads an attached spec again gets no attachment, no line and
no update sentence, in any version. One table: Claude Code *attaches* (CLI 2.1.296: no re-read, QA 1.11.0 V3); Copilot
does not until C-2 (OP-006). A Send view *carries an attachment* when §6.1 says yes, the gate is open, the assistant
attaches and §6.4 allows it. Discovery and the read model stay version-free (0001 §4, 0002 AC-016); `nextStep()` reads it
only by 0028 §6.4. 0002's newest known version rises to the attach version (§5): no "newer than known" note (guideline 3).

### 6.3 Attachment line (09 §6)

- **Place.** Wherever a split button's view carries an attachment, the line follows the split button and its status
  region, before the coach line: the detail; the first Now row, as a line of its own aligned with the step like 0022
  §4.1's coach line, in every layout; the Plan map header (0025 §5.3; beside the map only there, D-2). It belongs to
  the button, not to the advice: neither 0026 §6.4 nor `showStepTips: false` removes it.
- **Content.** The `file` glyph (the codicon motif drawn like the Studio's glyphs, 0021 A-008; `aria-hidden`) and the
  spec's file name (its path's last segment) as one chip, then ` attached when sent`; §7's tooltip. Static text: no
  control, no tab stop. It describes the main part and each Send menu item (`aria-describedby`); Copy prompt it does not.
- **Absent** without an attachment and where Copy prompt stands alone (09 §6). Theme variables only; it wraps after path
  *Amended by 0030 (PD-092): no attachment line; Send's main part is named and titled `Send to <Name> (<target>): <line>. Attaches <file name>.` (0030 §6.3, §7, AC-006, AC-007).*
  separators (0022 §4.6); a Send's pending state or feedback never changes it, a model change does (guideline 8, AC-012).

### 6.4 Call shapes (PD-083; V-3 (1), (2))

| Assistant · target | With an attachment, in this order |
| --- | --- |
| Copilot · new chat | `workbench.action.chat.newChat` without argument; then `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true, attachFiles: [<spec URI>] }` |
| Copilot · current chat | `workbench.action.chat.open` with `{ query: <line>, isPartialQuery: true, attachFiles: [<spec URI>] }` |
| Claude Code · new chat | `claude-vscode.editor.open` with `undefined`, `<line> @<spec path>` |

`<spec path>` is the spec's key, its project-relative path (PD-018); `<spec URI>` is the project root's URI joined with
it. The suffix is one space, `@` and the path, at the end (a leading `@` is not attached, V-3 K1); a path holding
whitespace gives Claude Code no attachment (A-009). Without an attachment: 0024 §6.4 as 0026 §6.1 amends it. Checks,
5000 ms and fallback stay 0024 §6.4, §6.5.

### 6.5 Check at send time (A-006, A-007)

After 0024 §6.4's checks, before the first call and within its 5000 ms (a hang ends in 0024 §6.5's fallback), the host
checks the request's spec path: it is the path of a spec entry of the active project's current model, and the spec
source finds a file there. Both hold → §6.4's calls. Either fails (moved, renamed or deleted before the view caught up;
a path that names no spec) → 0024's calls without attachment; the main part shows `Opened in <Name>` with §7's sentence
*without the spec* as tooltip and announcement; one §7 Output line; no notification. The host never attaches another file.

### 6.6 Never submit; Copy prompt as is (PD-068; V-3 (1), (3))

0024 §6.6 holds. No call carries `preserveInput` (it submits), `modelSelector` or `mode`; the `open` argument holds
exactly `query`, `isPartialQuery: true` and, attaching, `attachFiles`; Claude Code's text gains no line break. Copy
prompt, the menu's Copy prompt and every fallback copy exactly the line, never the ` @<spec path>` suffix.

## 7. Texts (English, PD-016; text modules, asserted literally; proxies until the click test, AC-018)

| New | Replaces |
| --- | --- |
| Attachment line `<file name> attached when sent`; tooltip `Send attaches <spec path> to <Name>'s chat as context. Copy prompt attaches nothing.` | — (09 §6's draft) |
| Without the spec, tooltip and announced: `The prompt is in <Name>'s chat, without <file name>: the file was not found. Check it, then send it there.` | 0024's success sentence, for that Send |
| Output `Send to <Name>: <spec path> was not found, so it was not attached.` | — |
| *(Removed 2026-11-20 by PD-091; no update sentence exists.)* Toggletip, after 0024's Send sentence and one space, where §6.2's version gate withholds the attachment: `With FeatherSpec 1.11.0 or later, Send also attaches the spec; update with /sdd-featherspec-update.` | — |
| README *(reworded 2026-11-20 by PD-091, see README)*: `Send also attaches the spec (FeatherSpec 1.11.0 or later) for assistants that do not read it again; a line under the button names the file. Copy prompt attaches nothing.` | — |

*Amended by 0030 (PD-092): the row "Attachment line" falls away; its tooltip text becomes Send's name and title `Send to <Name> (<target>): <line>. Attaches <file name>.` (0030 §7).*

## 8. Error cases and edge cases

- The spec moves between showing and the click → §6.5; the view shows the new step within 500 ms (AC-012). Moved after
  submitting (NS-7) → the chat holds it; a rename while the chat waits leaves a stale chip name (V-3 C5, (5)).
- The developer removes the chip or the `@` text before submitting → nothing attached; the choice is theirs (A-011).
- Whitespace in the spec path → Copilot attaches by URI, Claude Code gets none (§6.4). Multi-root, the project not the
  first folder → Claude Code may leave `@<path>` as text; the agent reads the file as today (A-009).
- A 30–45 KB spec costs about 8–12k tokens, as the agent's own read (A-002). Above Claude Code's Read limit (25,000 tokens)
  `@` gives a path only and the agent reads the file ("in full", OP-002). AC-020 probes a large Studio spec (12 D4-4).
- A failed Send (0024 §6.5) → the line is copied without the suffix (§6.6). Restricted Mode, reader window → all holds.

## 9. Acceptance criteria

Node unit tests (core, stubbed host port and spec source recording calls and arguments) and jsdom component tests decide,
each red against a `Not implemented` stub first, unless marked manual. Fixtures: 0021's per case (and 0028's), each with
Copilot and Claude Code, stamped `1.11.0` unless a criterion names another; the test world's `1.10.0` stays for 0024's and
0026's tests. AC-001…AC-013 set both assistants to *attaches* (§6.2); AC-019 checks the shipped values.

- **AC-001** For every step case of the text module, one fixture each, with Send offered for each assistant, the first line's Send view shall carry an attachment with the spec's file name and path exactly for the cases §6.1 marks *yes*, and none for NS-2 and NS-4 without a plan; a test over every case of the text module shall find a row for each; without an offer no view shall carry an attachment.
  *Amended by 0031 (follow-up Send): each follow-up line has its own Send view, attaching by 0031 §6.2 (0031 AC-002).*
- **AC-002** *(Amended 2026-11-20 by PD-091: no version gate; every value of `FeatherSpecVersion:` gives the NS-9 Send view an attachment for both assistants; the text below is the earlier criterion.)* For the version values `1.11.0`, `1.11.1`, `1.12.0` and `2.0.0` the NS-9 fixture's Send view shall carry an attachment; for `1.10.0`, `1.9.9`, `1.11.0-rc.1`, `1.11`, `v1.11.0`, `unknown` and a legacy project without the line it shall carry none and hold exactly the keys `assistant`, `target` and `targets`, and the detail, the Overview and the Plan map shall render no attachment line and no `aria-describedby` on a Send control; 0002's version check shall give no diagnostic for `1.11.0` and `newer than known` for `1.11.1` (§5).
- **AC-003** Where a Send view carries an attachment, the detail, the first Now row and the Plan map header shall render, after the split button and its status region and before the coach line, one element with the `file` glyph (`aria-hidden`), the file name and §7's line text, §7's tooltip, no focusable descendant and no tab stop; the main part and each Send menu item shall carry `aria-describedby` with its id, the Copy prompt item none; with the model unchanged, the element shall be unchanged while a Send is pending and while its feedback shows; with `showStepTips: false` it shall render the same; a view without attachment and a Copy prompt without offer shall render none.
  *Amended by 0030 (PD-092): no attachment line; Send's main part is named and titled `Send to <Name> (<target>): <line>. Attaches <file name>.` (0030 §6.3, §7, AC-006, AC-007).*
  > **Given** Copilot, Backlog `.specs/backlog/0002-x.md` without plan **Then** under `Send to Copilot` the line reads `0002-x.md attached when sent`, tooltip `Send attaches .specs/backlog/0002-x.md to Copilot's chat as context. Copy prompt attaches nothing.`
- **AC-004** When the developer activates an attaching Send with Copilot, the host shall make, after 0024 §6.4's checks and §6.5's check, exactly §6.4's calls for that target, in order, deep-equal, `attachFiles` holding exactly the URI the host port gives for the project root and the spec path.
  > **Given** Copilot, `.specs/backlog/0002-x.md` (NS-9) **When** the developer activates the main part **Then** the stub records `workbench.action.chat.newChat` without argument, then `workbench.action.chat.open` with `{ query: "/sdd-clarify .specs/backlog/0002-x.md", isPartialQuery: true, attachFiles: [<URI of .specs/backlog/0002-x.md>] }`; `Send to the current chat` records only that `open` call.
- **AC-005** When the developer activates an attaching Send with Claude Code, the host shall make exactly `claude-vscode.editor.open` with `undefined` and the line, one space, `@` and the spec path, ending with the path and holding no `\n` or `\r`; a spec path with whitespace shall give the Claude Code view no attachment and its Send 0024's call.
  > **Given** Claude Code, Active `.specs/active/0001-tip-splitter.md` with T-003 open **Then** the stub records `claude-vscode.editor.open` with `undefined`, `"Implement T-003 of .specs/active/0001-tip-splitter.plan.md @.specs/active/0001-tip-splitter.md"`.
- **AC-006** When the developer activates a Send whose view carries no attachment (NS-2, NS-4 without plan, any case below the attach version, Claude Code with whitespace in the spec path), the host shall make exactly 0024 §6.4's calls as 0026 AC-001 states them, with no `attachFiles` key and Claude Code's text exactly the line, and shall not call the spec source.
- **AC-007** Across every Send of AC-004–AC-010 each `workbench.action.chat.open` argument shall have exactly the keys `query`, `isPartialQuery` (value `true`) and, attaching, `attachFiles`, and no call shall carry `preserveInput`, `modelSelector` or `mode`; the protocol guards shall reject a send request whose `attach` is not a non-empty string and a Send view whose attachment holds a key outside `name` and `path`; a search of `src` without test files and of `package.json` shall find neither `preserveInput` nor `modelSelector`, and `attachFiles` exactly once; 0024 AC-007's other searches shall pass unchanged.
- **AC-008** With an attaching view, Copy prompt in the menu and the fallback of each 0024 AC-006 cause shall put exactly the line on the clipboard, and the fallback's Output line shall not contain the line; in none of these runs shall the clipboard hold ` @<spec path>`.
- **AC-009** If at send time the spec source finds no file at the spec path (stat gives nothing or rejects), or the current model holds no spec entry with that path, then the host shall make exactly 0024 §6.4's calls as AC-006 states them, the main part shall show `Opened in <Name>` with §7's sentence without the spec as tooltip and in its live region, the Output shall get §7's line once, and no notification shall show; one fixture per cause and assistant. A `stat` not settled 5000 ms after the activation shall end in 0024 AC-006's fallback (fake timers).
- **AC-010** If a send request's `attach` names no spec entry of the active project — a plan, a return note, `AGENTS.md`, `.env`, `../x.md`, an absolute path — then no call shall carry it, in `attachFiles` or after `@`, and the Send shall go as AC-009 states.
- **AC-011** *(Amended 2026-11-20 by PD-091: no update sentence exists; the toggletip's third paragraph is always 0024's. The text below is the earlier criterion.)* While Send is offered and §6.1 marks the case *yes* but §6.2's version gate withholds the attachment, the toggletip's third paragraph shall be 0024's Send sentence, one space and §7's update sentence, literally; in every other case it shall be 0024's (0024 AC-013).
- **AC-012** *(Amended 2026-11-20 by PD-091: only a change of the spec's path moves the attachment; the version crossing no longer does.)* When the `FeatherSpecVersion:` value crosses the attach version or the spec's path changes, the detail, the Overview and the Plan map shall show the new attachment state within 500 ms after the model-changed notification (PD-047, timing test), keeping selection, area and focus as 0024 AC-010 states.
- **AC-013** No Send, attachment check or line shall create, change, move or delete a workspace file, write a setting or reach the network (0024 AC-012's tests extended), and the host shall call the spec source with `stat` only; AC-001–AC-012 shall hold in Restricted Mode and a reader window; §7's texts shall come from a text module; 0016's user-language sweep shall cover the line.
- **AC-014** Every test at the commit on which this spec's implementation starts that decides a statement §5 does not change shall exist at the head and pass; `npm run test:unit` and `npm test` shall pass on Windows and in CI. A script compares the test titles of both commits; the plan lists every title missing at the head, a renamed one included, with the changed statement or the head title that replaces it.
- **AC-015** The statements of §5 shall carry their notes; `README.md` shall contain `attached when sent`, `FeatherSpec 1.11.0` and `Copy prompt attaches nothing`; `CHANGELOG.md` under the version in preparation shall name `attaches the spec`; `docs/release-checklist.md` shall carry AC-016–AC-018, one line per assistant to re-run AC-017 with the versions against V-3's (VS Code 1.147.0, Copilot Chat 0.75.0, Claude Code 2.1.327), and one line that the attach version equals the FeatherSpec release carrying the sentence and 0002's newest known version is not below it.
  *Amended by 0030 (PD-092): `README.md` shall contain `Tip: Use` and not `attached when sent` (0030 AC-011); `Copy prompt attaches nothing` and `FeatherSpec 1.11.0` stay.*
- **AC-016** *(manual, preview harness by the orchestrator, then Gregor; guideline 12)* The line in the detail, the first Now row and the Plan map header, with Copilot and with Claude Code, for `0002-x.md` and `0024-send-next-step-to-assistant.md`, menu closed and open, in Dark, Light and High Contrast at 1600 px and 1000 px window width with the side panel open at its default width, and the detail alone at 800 px: no text is cut, the long name wraps after a separator, the chip is told apart in High Contrast without colour, nothing moves when the feedback shows; screenshots and verdict in the plan.
- **AC-017** *(Amended 2026-11-20 by PD-091: the run on a copy at 1.10.0 now also shows the chip; Gregor's V-3 stands for the chip.)* *(manual, Gregor, on `C:\projects\test\tip-splitter` before the spec closes; GitHub Copilot and Claude Code; he records their, VS Code's and FeatherSpec's versions)* With FeatherSpec 1.11.0 and each assistant that attaches (§6.2), for a Backlog spec (`/sdd-clarify`) and the Active spec (`Implement T-00x`): the main part and each Send item open the chat with the prompt in the input and a chip with the file name the Studio's line named, nothing submitted; after Gregor submits, the agent's tool calls show no read of the spec file; Copy prompt pastes the line without `@`. On a copy at FeatherSpec 1.10.0: no line, no chip, the toggletip names the update. A re-read with 1.11.0 sets that assistant to no attachment (§6.2) and reopens A-001, A-003.
- **AC-018** *(manual, Gregor; click test on an HTML draft before `/sdd-plan`, PD-082, 09 §7)* Task across views: starting in the Overview, Gregor finds out which file goes along when he sends the next step of 0002 to Copilot, what goes along when he copies the prompt instead, and whether the Plan map's header sends the same. The orchestrator notes each click and its view; Gregor answers without asking and confirms or changes §7's texts; a change is a revise of this spec.
- **AC-019** *(Amended 2026-11-20 by PD-091: GitHub Copilot attaches too; both assistants hold `attachesSpec: true`. The text below is the earlier criterion.)* The per-assistant table of §6.2 shall hold exactly one value for each assistant 0024 offers: Claude Code *attaches*, GitHub Copilot does not (until OP-006 changes the data). For an assistant that does not attach, every case and version of AC-001 and AC-002 shall give a Send view without attachment, no attachment line, no `aria-describedby` on a Send control, a toggletip without §7's update sentence, and exactly AC-006's calls.
  > **Given** the shipped table, `1.11.0`, `.specs/backlog/0002-x.md` (NS-9) **Then** Claude Code's view carries `0002-x.md`; Copilot's carries none and its Send records AC-006's calls without `attachFiles`.
- **AC-020** *(manual, Gregor or the orchestrator, before the spec closes; 12 D4-4)* Probe with the largest spec in this repository's `.specs/` (`0022-layout-and-signal-polish.md`, about 43 KB) on FeatherSpec 1.11.0 with each attaching assistant: `/sdd-clarify` in a new chat, once by Send with the attachment and once by Copy prompt without; record both runs' context use and tool calls. It passes when the attached run reads the spec file not at all, uses no more context than the other run, and its findings hold every blocking finding of the other run; else the assistant goes to no attachment (§6.2).

## 10. Technical notes for developers or AI agents

- As-is (`d0c3766`): `assistants.ts` `ASSISTANTS[id].callsFor(target, line)`; `send.ts` `createSend()` (chosen check →
  copy; 5000 ms timer; activate → execute; `fallback()` copies, warns, one Output line; serialised by `tail`); `sendView.ts`
  `sendViewOf(offer, case)` → `{ assistant, target, targets }`, `tipClosingOf()`. Callers: `detail.ts` `nextStepView()`,
  `rows.ts` (first Now row), 0025's header; `boardRequests.ts` `sendPrompt` strips the token and calls `send()`.
- Protocol `assistant.ts`: `isSendView`, `isSendPromptPayload` accept exact key sets; texts `assistantTexts.ts`,
  `nextStepTexts.ts` (`STEP_GUIDES`, `TIP_CLOSING`). Webview: `SendButton.tsx` (menu, live region, token), `StepAction.tsx`,
  `NextStep.tsx`, `SpecRow.tsx` (`.ov-coach` after `StepAction`); glyphs in `board/icons.tsx`, no `file` yet.
- Version: `model.project.version` (discovery `versionLine.ts`, value as written, `unknown` for legacy); `core/specs/
  version.ts` `parseSemanticVersion()`, `compareVersions()`, `NEWEST_KNOWN = '1.10.0'` (§6.2 raises it; `version.test.ts`
  and `readProject.test.ts` assert `1.10.1`, `1.11.0`, `1.10.1-rc1` as newer: AC-014 lists them). File check:
  `SpecSourcePort.stat(root, key)`; `core/board/openFile.ts` refuses keys outside the model (the pattern for §6.5).
  `core/shell/testing/world.ts` stamps `1.10.0`, so 0024's and 0026's call-shape tests keep their shapes.
- Proposal, the plan decides: `attach` per case beside `STEP_GUIDES` and per assistant in `ASSISTANTS`; `sendViewOf()` adds
  `attach?: { name, path }`; the request carries `attach?: <path>`; a host-port method returns an opaque file URI built by
  the adapter (`vscode.Uri.joinPath`); `callsFor()` takes it; `ATTACH_FROM_VERSION`. Protocol version up; a new module →
  `/sdd-architecture-update`. Tests likely touched: `send`, `sendView`, `assistants`, guards, `messages`, `stepTips`,
  `SendButton`, `NextStep`, `SpecRow`, the header, `version`, `readProject`, `sourceScan`, `noWrite`, `webviewBundle` (0019
  AC-010's 300 words), `userLanguage`, `docsScan`, a timing test, the smoke tests.

## 11. Assumptions

| ID | Assumption | Why we believe it | What breaks if wrong |
| --- | --- | --- | --- |
| A-001 | §6.1's table: every case but NS-2 and NS-4 without plan attaches, `Implement` included (proxy) | 09 §6 names specify, clarify, plan, compile; an implement step in a new chat (PD-078) reads the spec for its criteria (`AGENTS.md` Memory Bank rule), and the sentence sits in that rule, so the chip replaces a read (OP-002; QA V3-4 counts 0 reads) | If an implementing agent would not read the spec, each step costs 4–12k tokens: the `Implement` row flips (data), decided by AC-017 |
| A-002 | *(Dropped 2026-11-20 by PD-091.)* Version gate: no attachment below FeatherSpec 1.11.0 (proxy) | Gregor's rules: no quality loss through an update, no context pollution; with 1.10.0 both agents read the attached spec again (V-3 C3, (4)), about 4–5k tokens for 17 KB and 8–12k for 30–45 KB per Send (estimates, 09 §6; V-3 counted none), and the chip would promise a gain that does not come; older projects keep 0024's Send unchanged; the setup (0014) installs the latest release | Gregor wants the chip on every project: drop the gate (one constant), AC-002 and AC-011 change |
| A-003 | 1.11.0 is the first release with the sentence, and the sentence binds every session (`AGENTS.md`), not only the `/sdd-*` commands | FeatherSpec's `REPORT.md` (§2 change 2, §7; branch `feature/1.11.0-studio-prompts`, not released): 1.11.0 MINOR, the sentence in `AGENTS.md`'s Memory Bank section | Another number at release: the constant, §7, AC-002, AC-015 and README change; a commands-only place: §6.1's `Implement` row flips (OP-002) |
| A-004 | A pre-release (`1.11.0-rc.1`) counts as below (proxy) | 0002's existing comparison; a pre-release may lack the sentence | A hands-on on an rc stamp shows no chip |
| A-005 | One line text for both assistants (proxy) | V-3 K3: Claude Code shows a chip too, so 09 §6's "referenced with @" variant is void; 09's draft was adopted in PD-082. Its button tooltip is not: 0026 §6.1 owns the main part's tooltip, and the line is its accessible description; "sent" is the button's Send | §7; the click test (AC-018) |
| A-006 | A missing file sends without attachment and says so at the control (proxy) | Guideline 8; the chat still opens with the prompt, and the view shows the new step within 500 ms; a copy fallback would hide that the chat opened | §6.5, AC-009 |
| A-007 | The host attaches only a spec entry of the current model whose file exists (proxy) | The same guard as `openFile.ts`; a webview message must not choose files for a chat (`AGENTS.md` *Never*: secrets) | AC-010 |
| A-008 | `attachFiles` also works on Copilot's current chat (proxy) | PD-083: "on the existing open call"; V-3 tried the new chat only | AC-017 checks `Send to the current chat` |
| A-009 | Claude Code gets the project-relative path; no attachment for a path with whitespace (proxy) | V-3 K3 used the relative path; a space ends an `@` mention (untested); FeatherSpec slugs are kebab-case | Multi-root non-first folders: `@<path>` stays text, visible, harmless |
| A-010 | The update hint lives in the toggletip only (proxy) | Guideline 3: an older version is a normal state, never an error; guideline 11: reasons behind the `(?)` | Discovery rests on the `(?)` and the README |
| A-011 | No setting; the developer removes a chip before submitting (proxy) | PD-082 "no setting at first"; both chats show the chip and let it go | A setting in a later spec |
| A-012 | *(Dropped 2026-11-20 by PD-091; C-2 not needed.)* Until C-2, Copilot does not attach (proxy) | PD-089's rule; V-3 saw Copilot read the attached spec again on 1.10.0, and 1.11.0 is unmeasured there; no context pollution, no quality loss | One value in §6.2's table; AC-019 |
| A-013 | AC-020's pass rule: no spec read, context not above the copy run, no blocking finding lost (proxy) | 12 D4-4 asks "how much context, and is the result as good"; blocking findings decide planning | AC-020 |

## 12. Open points

- OP-001 Closed 2026-11-19 by `docs/ux-audit/13-clicktest-results.md`: the click test was partly run (tasks 1–3, none on
  the attachment) and ended; "0027: no change"; confirmation points 1–8 unanswered, so the attachment line and §7's texts
  stay proxies. AC-018 is recorded as not run; its question (which file goes along) moves to the real use, AC-017 (12 F-3).
- OP-002 The release with the sentence (PD-082, PD-083; `/home/claude/orch/featherspec-1.11.0/REPORT.md`): 1.11.0 MINOR;
  formats unchanged. Re-checked 2026-11-19 at the branch head `04c569d` (`feature/1.11.0-studio-prompts`, after audit A1):
  `AGENTS.md`'s Memory Bank section, so every session, reads "A file attached in full to the current message — a Copilot
  chip, an `@` mention in Claude Code — counts as read: no re-read."; stamp `1.11.0`. A-003 holds. The release (after QA
  V3 and Gregor's Go) is **blocking for closing** this spec (AC-017), not for planning or building.
- OP-003 The gate (A-002) and the `Implement` row (A-001) stay as recommended (proxy; standing answer `PLAN-R3.md`, Gregor
  not reachable); AC-017 can still flip either as data. Not blocking.
- OP-004 Closed (OP-005): 1.11.0 keeps 0002's formats (OP-002); the newest known version rises to it (§6.2, §5, AC-002).
- OP-005 `/sdd-clarify` 2026-11-19 (S94): 32 findings, 7 blocking, resolved in one pass (`/home/claude/orch/clarify/
  0027-findings.md`); D-4 and the report applied. Readings to object to: (a) the human *submits*, the Studio *sends*; (b) a
  model change updates the line during feedback; (c) a hanging `stat` ends in 0024's fallback; (d) the line stays with
  tips off; (e) "V-3 (n)" is the record's consequence n.
- OP-006 **Closed 2026-11-20 by Gregor (PD-091):** both assistants attach in every version; C-2 is not needed and no longer blocks closing. Earlier question: C-2 (12 D4-2, PD-089): do Copilot and the Claude Code VS Code extension read an attached spec again on 1.11.0? The
  Studio sends through that extension, but only the CLI is measured (V-3 saw a re-read there on 1.10.0, the CLI none on 1.10.0
  in QA V3). A re-read sets that assistant to no attachment (data). Blocks closing.

## 13. Definition of Ready / Done and next steps

Ready: §6 and §7 literal, §5 listed, OP-001 closed, OP-002 re-checked, 0024 and 0026 as base (order 0028 → 0025 → 0026 →
0027). Clarified 2026-11-19 (OP-005). Done: AC-001–AC-015, AC-019 green, AC-016–AC-018, AC-020 checked, OP-006 settled, §5
applied, docs and Memory Bank synced, `/sdd-compile` READY, FeatherSpec 1.11.0 released. Next: review the plan; implement after 0028, 0025 and 0026.
