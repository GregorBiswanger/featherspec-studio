# Plan — Attach the Spec When Sending

**Spec:** [0027-attach-spec-when-sending.md](0027-attach-spec-when-sending.md)
**Status:** In Progress
**Last updated:** 2026-11-19
**Current step:** T-001

## Approach

First the decision, then the host, then the webview, then the proofs. Stage 1 lands one pure function,
`attachmentOf()`. It decides from the case, the version and the assistant whether a Send view carries the spec. The view
and the toggletip then carry that result. Stage 2 makes the host attach: the request names the path, the host checks it
against the model and the file, and the call shapes follow. A missing or foreign file sends without the attachment and
says so. Stage 3 draws the line under the split button, first as a stub. Stage 4 proves freshness, no writes and the real
URI in the host. Stage 5 is the preview, §5's notes, the docs and the gates.

**The per-assistant switch is one data entry** (PD-089, OP-006): `attachesSpec` on each `ASSISTANTS` entry
(`claudeCode: true`, `copilot: false`). Every other test injects its own table through `offerOf()`, `createFakeOffer()` and
`createSend()`. So flipping an entry after C-2 changes that entry and AC-019's one expected row, and nothing else.

Everything builds on the three earlier plans as they build things:
- 0028: the 13 `StepCase`s (`NS-6-report` included), `caseFixtures`, the `version` input of `detail.ts`/`rows.ts`,
  `levelsOnImplement()`.
- 0025: the map header renders `NextStep` with `place: 'map'` (D-2), `SendButton`'s `look`, `PROTOCOL_VERSION` 9.
- 0026: `sendViewOf()` returns target `new` for every case, the menu items are `menuitemradio`, there is one coach line
  per view, and `PROTOCOL_VERSION` is 10.

0028's snapshots use no offer, so they stay byte-identical. New source files stay in existing folders (`core/assistant`,
`webview/ui`). Memory Bank touched in T-010 only: `techContext.md`, `activeContext.md`; `systemPatterns.md` gets no entry
(PD-089 is in the PD register).

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` · 2 `npx tsc --noEmit`
· 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (T-002, T-003, T-008, T-010: protocol,
adapter, `extension.ts`, host tests, bundle) · pre-done `npm test` on Windows and CI, run by the orchestrator (cannot run
here).

## Research

**Checkpoint digest (2026-11-19, Mode A; answered from the standing answer `PLAN-R3.md`, Gregor not reachable).**
The spec touches existing code, so a checkpoint applies. Every answer comes from the binding sources (spec, 12 D4, 13,
PD-084…PD-089, `ux-guidelines.md`, `cross-spec-r3.md`):
- OP-001 is closed by 13. The test ran tasks 1–3, none on the attachment, and records "0027: no change". Points 1–8 are
  unanswered, so the proxies stand. AC-018 is recorded as not run, and its question moves to AC-017. Written into the
  spec.
- OP-002 was re-checked at `/home/claude/featherspec` `feature/1.11.0-studio-prompts` head `04c569d`. The sentence is in
  `AGENTS.md`'s Memory Bank section (every session), reworded after audit A1: "… counts as read: no re-read." The stamp is
  `1.11.0`. A-003 holds. Written into the spec.
- OP-003 keeps its recommendation as a proxy. OP-006 (C-2) stays open and blocks only closing. The plan makes its result
  one data entry.
- PD-089 and 12 D4-2 are in §6.2. PD-084…PD-088 bear on 0025, 0026 and 0028. Cross-spec D-2 (the map header carries the
  Next step, so the line comes with it) and D-4 (NS-7's `Implement <ID>`, §6.1's rows) are in the spec.
- **Risk, kept visible:** the Studio sends through the Claude Code **VS Code extension**, and only the **CLI 2.1.296** was
  measured (QA 1.11.0 V3: 0 reads with `@spec`, on 1.10.0 and on 1.11.0). On 1.10.0, V-3 saw the extension read the spec
  again. The shipped `claudeCode: true` follows PD-089 and §6.2 as written. If AC-017 or C-2 shows a re-read, it is one
  entry (A-012's mechanism).
- No survey finding contradicts the spec. No `done/` spec becomes `Deprecated`; §5's statements get notes.
- Web lookups ran under the standing answer's go, as S95, S97 and S98 did.

**Survey (code at `76f82ae`, 0028 T-006/T-007 uncommitted in the same tree; read 2026-11-19).**
- **Send core:**
  - `core/assistant/assistants.ts` `ASSISTANTS[id] = { extensionId, callsFor(target, line) }`. It is the only home of
    the chat command strings: 0024 AC-007's scan requires `workbench.action.chat.open` exactly once, in this file.
  - `send.ts` `createSend()` does: chosen check, then copy; then `run()`, which finds the extension, activates it, lists
    the commands, checks for a missing one and executes the calls in order, under a 5000 ms timer, with `fallback()`;
    Sends are serialised by `tail`.
  - `offer.ts` `offerOf(value, present)` gives `Offer { assistant }`, and `testing/fakeOffer.ts` builds it through
    `offerOf`.
  - `sendView.ts` `sendViewOf(offer, case)` and `tipClosingOf(offer)` are called from `core/board/detail.ts`
    `nextStepView(next, tips, offer, version)` and `core/overview/rows.ts` `rowOf()`, with the model at hand.
- **Protocol:**
  - `shared/protocol/assistant.ts` has `SendView { assistant, target, targets }`. `isSendView` and
    `isSendPromptPayload` check exact key sets. `detail.ts` and `overview.ts` guards call `isSendView`.
  - `boardRequests.ts` `sendPrompt` strips `token` and passes the rest to `send()`, so `attach` travels untouched.
- **Host and files:**
  - `AssistantHostPort` (`core/ports/assistant.ts`) has no URI method. `adapters/vscode/assistantHost.ts` passes `args`
    with `executeCommand(command, ...args)`.
  - The project root is a URI string. `vscodeSpecSource.ts` `target()` builds
    `vscode.Uri.joinPath(vscode.Uri.parse(root), …segments)`, the same join the attachment needs.
  - `SpecSourcePort.stat()` gives `{ kind, mtimeMs, size }` or `undefined`, and `kind` is `symlink` before `file`. A
    symlinked spec is unreadable in the model already (`files.ts`), so only `kind === 'file'` counts as found.
  - `extension.ts` creates the spec source inline for the repository. T-003 hoists it into one constant.
  - `openFile.ts` holds the "inside the model" key rule that §6.5 follows.
- **Version:**
  - `core/specs/version.ts` has `NEWEST_KNOWN = '1.10.0'`, `checkVersion()`, and 0028's `LEVELLING_SINCE` /
    `levelsOnImplement()`, the pattern for `attachesFrom()`.
  - The tests that assert "newer than known" for values that are no longer newer: `version.test.ts` (`1.10.1`, `1.11.0`,
    `1.10.1-rc1`) and `readProject.test.ts` AC-016 (`1.10.1`). `activeProjectFeed.test.ts` (`2.0.0`) stays.
  - Fixtures stamped `1.11.0`: `fs-version-1110`, `fs-verified-no-tick`, `fs-partial-return`. They lose their
    `newer than known` format note. The read baselines are all ≤ 1.10.0 and are not affected.
  - `core/shell/testing/world.ts` stamps `1.10.0`, so 0024's and 0026's call-shape tests keep their shapes (spec §10).
- **Webview:**
  - `ui/StepAction.tsx` renders Copy or `SendButton`. It is used by `detail/NextStep.tsx` (line 1; 0025 adds the map
    header) and `areas/overview/SpecRow.tsx` (Now row; grid, `.ov-coach` spans `1 / -1`).
  - `SendButton` holds the live region inside `.send-split`. Its menu builds the Send items from `send.targets`, then
    Copy prompt.
  - The glyphs are hand-drawn in `board/icons.tsx` (`GlyphKind`), with no `file` glyph yet. `ui/PathText.tsx` gives the
    `<wbr>` after `/ - .` (0022 §4.6).
- **Budgets and sweeps:**
  - `webviewBundle.test.ts` 0019 AC-010 holds the detail of spec 0015 at ≤ 300 words with Send at `1.10.0`. With an
    attachment the line adds about 4 words. T-006 checks this at `1.11.0`.
  - `sourceScan.test.ts` `SEND_FORBIDDEN_TERMS` does not hold `preserveInput` or `modelSelector` yet.
  - `noWrite.test.ts` holds 0024 AC-012's three tests. `restricted.test.ts` covers Send in Restricted Mode.
- **Sources:**
  - [VS Code `chatActions.ts` (main)](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts)
    — `IChatViewOpenOptions.attachFiles?: (URI | { uri; range })[]`. Each file is attached only if
    `fileService.exists(uri)`, silently. `isPartialQuery` only sets the input. `preserveInput` submits and is mutually
    exclusive with `attachFiles`. `modelSelector` throws when no model matches. This settles the URI shape (a
    `vscode.Uri` from the adapter, opaque to the core) and why §6.5's own check is needed: Copilot would drop a missing
    file without a word. Retrieved 2026-11-19.
  - [Cursor forum: Support attachFiles in workbench.action.chat.open](https://forum.cursor.com/t/support-attachfiles-in-workbench-action-chat-open/156275)
    — `attachFiles` arrived upstream with VS Code 1.102, below the repo's `engines.vscode ^1.146.0`. Retrieved
    2026-11-19.
  - [vscode-codicons `mapping.json`](https://raw.githubusercontent.com/microsoft/vscode-codicons/main/src/template/mapping.json)
    and [`file.svg`](https://raw.githubusercontent.com/microsoft/vscode-codicons/main/src/icons/file.svg) — the `file`
    codicon exists (60027): a page with a folded corner, 16 px. It is the motif the hand-drawn glyph follows (0021 A-008).
    Retrieved 2026-11-19.
  - `/home/claude/orch/featherspec-1.11.0/REPORT.md` §2 change 2 and `QA-1.11.0.md` V3 (local) — the sentence, about
    −4.3k tokens for a 17 KB spec and −8k to −12k for 30–45 KB, the CLI's 0 reads, and C-2 open. Read 2026-11-19.

## Stages

1. T-001 → T-002 — which views carry the spec; the view, the toggletip and the protocol carry it
2. T-003 → T-004 — the host attaches after its check; a missing or foreign file sends without and says so
3. T-005 → T-006 — the attachment line (stub first) with its descriptions; the line in every place
4. T-007 ‖ T-008 — independent: freshness, no writes and Restricted Mode (core tests); the real URI in the host smoke
   (`src/test`); run in sequence
5. T-009 → T-010 — preview; §5 notes, docs, title audit, Memory Bank and final gates

Parallel: stage 4. It runs in sequence (`PLAN-R3.md`). Stages 1–3 share `assistant.ts` (protocol), `assistantTexts.ts`
and `send.ts`/`send.test.ts`: no `‖`.

## Steps

### T-001 — Decide per case, version and assistant

- **Covers:** AC-001 (rule), AC-002 (gate, newest known version), AC-019 (table)
- **Do:**
  - New `core/assistant/attachment.ts`:
    - `STEP_ATTACHES: Record<StepCase, boolean>`, §6.1 as data: `NS-2` and `NS-4` false, the other eleven true.
    - `attachmentOf(offer, stepCase, { version, key })` gives `{ attach?: { name, path }, withheld }`. `attach` is set
      when the case attaches, `offer.attaches`, `attachesFrom(version)`, and the key has no whitespace for Claude Code.
      `withheld` is true when the case attaches and the offer attaches but the gate is closed.
  - `assistants.ts`: `attachesSpec` on each entry (`copilot: false`, `claudeCode: true`). This is the one data entry.
  - `offer.ts`: `Offer` gains `attaches?: true`. `offerOf(value, present, attaching = (id) => ASSISTANTS[id].attachesSpec)`.
    `createFakeOffer(initial, { attaching }?)` passes it on.
  - `core/specs/version.ts`: `ATTACH_FROM_VERSION = '1.11.0'` and `attachesFrom()` beside `levelsOnImplement()`.
    `NEWEST_KNOWN = '1.11.0'`.
  - Tests:
    - `attachment.test.ts` "0027 AC-001 …": one fixture per case from 0021's memory fixtures and 0028's `caseFixtures`,
      at `1.11.0`, both assistants with `attaching` all true. Name and path are exact. Every key of `STEP_GUIDES` has a
      row. No offer gives none.
    - "0027 AC-002 …": AC-002's version table.
    - "0027 AC-019 …": the shipped table literally; Copilot gives none in every case and version.
    - `offer.test.ts`: `attaches` from the table.
    - `version.test.ts`: `attachesFrom()`, and the AC-016 rows retargeted to `1.11.1`, `2.0.0`, `1.11.1-rc1`, `10.0.0`
      as newer, `1.11.0` with no diagnostic.
    - `readProject.test.ts` AC-016: `1.10.1` → `1.11.1`.
- **Verify:** `npx vitest run --project node src/core/assistant src/core/specs/version.test.ts src/core/specs/readProject.test.ts`.
  It is red first (`attachmentOf` stub `Not implemented`, `1.11.0` still newer than known), then `npm run test:unit` is
  green.
- [ ] **Verified (T-001):** —
- **Notes:** —

### T-002 — The view carries the file, the toggletip names the update

- **Covers:** AC-001 (views), AC-002 (exact keys below the gate), AC-011, AC-007 (view and request guards), AC-019 (views)
- **Do:**
  - `sendViewOf(offer, case, context)` adds `attach` from `attachmentOf()` after 0026's target.
    `tipClosingOf(offer, withheld)` appends one space and §7's update sentence.
  - `detail.ts` `nextStepView()` and `rows.ts` `rowOf()` pass `{ version, key: entry.key }`.
  - Protocol `assistant.ts`:
    - `SendView.attach?: { name; path }`. `isSendView` accepts exactly the keys `name` and `path`, both non-empty
      strings, with `name` the last segment of `path`.
    - `SendRequest.attach?: string`. `isSendPromptPayload` accepts an optional non-empty string `attach`.
  - `ATTACH_UPDATE_TEXT` goes into `assistantTexts.ts`. `PROTOCOL_VERSION` goes one up (11 after 0026's 10).
  - Tests:
    - `sendView.test.ts` "0027 AC-001 …": `buildDetail` and `projectNow` per case with a Claude Code offer; Copilot
      through `createFakeOffer` with `attaching`.
    - "0027 AC-002 …": below the gate, exactly `assistant`, `target`, `targets`.
    - "0027 AC-011 …": the third paragraph literally, with and without the gate; NS-2 and Copilot get 0024's.
    - "0027 AC-019 …" (shipped table): Copilot's view has no `attach`, and its toggletip has no update sentence.
    - `assistant.test.ts` and `messages.test.ts`: guards and version.
  - 0028's snapshot test stays green with no new exception (no offer there).
- **Verify:** `npx vitest run --project node src/core/assistant src/shared/protocol src/core/board/nextStepBaseline.test.ts`.
  It is red first (no `attach` in the view, 0024's paragraph), then `npm run test:unit` and `npm run compile` are green.
- [ ] **Verified (T-002):** —
- **Notes:** —

### T-003 — The host checks and attaches

- **Covers:** AC-004, AC-005, AC-006, AC-007 (calls, scan), AC-019 (calls)
- **Do:**
  - `callsFor(target, line, attachment?: { uri: unknown; path: string })`. Copilot's `open` argument becomes
    `{ query, isPartialQuery: true, attachFiles: [uri] }`. Claude Code's text becomes `` `${line} @${path}` ``, without
    the suffix when the path holds whitespace.
  - `AssistantHostPort.fileUri(root, key): unknown`:
    - adapter `vscode.Uri.joinPath(vscode.Uri.parse(root), …key.split('/'))`;
    - the fake records the call and returns a marked object.
  - `createAttachmentCheck({ source: ShellModelSource, specs: Pick<SpecSourcePort, 'stat'>, host })` in `attachment.ts`.
    The path must be a spec key of the current model (`openFile.ts`'s inside rule), and `stat` must give kind `file`.
    Then it returns `{ uri, path }`, otherwise `undefined`.
  - `createSend` deps gain `attachment` and `attaching` (default `ASSISTANTS[id].attachesSpec`).
    - A request with `attach` for an attaching assistant is checked inside `run()`, after the extension and command
      checks, with `isSettled()` after the await, then the calls are made.
    - Without `attach`, or for an assistant that does not attach, there is no check, and the calls are 0024's.
  - Wiring: `wiring.ts` deps. `extension.ts` passes `modelSource` and the one hoisted spec source.
  - Tests:
    - `send.test.ts` "0027 AC-004 …": the example deep-equal, `Send to the current chat` only `open`.
    - "0027 AC-005 …": the example literally, no `\n` or `\r`; a whitespace path gives 0024's call.
    - "0027 AC-006 …": NS-2, NS-4, below the gate, whitespace, and an `attach` sent for a non-attaching assistant: no
      `attachFiles`, the stat recorder untouched.
    - "0027 AC-007 …": across AC-004–AC-010 the `open` keys exactly; no `preserveInput`, `modelSelector` or `mode`.
    - `sourceScan.test.ts`: `preserveInput` and `modelSelector` join `SEND_FORBIDDEN_TERMS`, and `attachFiles` appears
      exactly once.
    - `assistantHost.test.ts` (mocked `vscode`): `fileUri`.
- **Verify:** `npx vitest run --project node src/core/assistant src/adapters/node/sourceScan.test.ts src/adapters/vscode/assistantHost.test.ts`.
  It is red first (no `attachFiles`, no suffix), then `npm run test:unit` and `npm run compile` are green.
- [ ] **Verified (T-003):** —
- **Notes:** —

### T-004 — A missing or foreign file sends without and says so

- **Covers:** AC-009, AC-010, AC-008 (host fallbacks)
- **Do:**
  - When the check fails, the Send makes 0024's calls with no attachment. The outcome is `opened` with
    `sendOpenedWithoutText(name, file)`, plus one Output line `attachMissingOutputText(name, path)` and no `ui.warn`.
  - A `stat` that does not settle ends in 0024's 5000 ms fallback, because the timer already covers `run()`.
  - The texts of §7 go into `assistantTexts.ts`.
  - Tests:
    - `send.test.ts` "0027 AC-009 …": `stat` gives `undefined`, rejects, or the path is not a spec entry; one fixture
      per cause and assistant; fake timers for the hang.
    - "0027 AC-010 …": a plan, a return note, `AGENTS.md`, `.env`, `../x.md`, an absolute path. No call carries it,
      and the Send goes as AC-009 says.
    - "0027 AC-008 …": each 0024 AC-006 cause with an attaching request. The clipboard holds exactly the line, never
      ` @<path>`, and the Output line does not contain the line.
- **Verify:** `npx vitest run --project node src/core/assistant/send.test.ts`. It is red first (0024's success sentence, no
  Output line), then `npm run test:unit` is green.
- [ ] **Verified (T-004):** —
- **Notes:** —

### T-005 — The attachment line and its descriptions

- **Covers:** AC-003 (component, descriptions, stability), AC-004 and AC-008 (webview: the request and Copy prompt)
- **Do:**
  - New `ui/AttachmentLine.tsx`, first as a stub that renders nothing.
  - Then the real component: `<p id className="send-attach" title={attachTooltipText(path, name)}>`, holding a chip
    (`Glyph kind="file"`, `aria-hidden`, then `PathText` of the name) and then `ATTACHED_WHEN_SENT`. Static, no
    control, no tab stop.
  - The `file` glyph is hand-drawn in `board/icons.tsx` (codicon motif).
  - `SendButton` takes `describedBy?`. The main part and each Send item carry `aria-describedby`; Copy prompt does not.
    The payload carries `attach: send.attach.path` when the view has one.
  - `StepAction` renders `SendButton`, then `AttachmentLine` (`useId`) when `send.attach` exists.
  - Tests:
    - `AttachmentLine.test.tsx` "0027 AC-003 …": AC-003's example literally, glyph `aria-hidden`, no focusable
      descendant, the tooltip.
    - `SendButton.test.tsx` "0027 AC-003 …": `aria-describedby` on the main part and on each `menuitemradio`, not on
      Copy prompt. The line is unchanged while pending and during feedback, and changes with a new view.
    - "0027 AC-004 …": `attach` in the payload of the main part and each Send item.
    - "0027 AC-008 …": Copy prompt in the menu copies exactly the line and sends no request.
- **Verify:** `npx vitest run --project webview src/webview/ui`. It is red with the stub (no line, no description), then
  `npm run test:unit` is green.
- [ ] **Verified (T-005):** —
- **Notes:** —

### T-006 — The line in every place

- **Covers:** AC-003 (places, order, tips off), AC-002 (webview: no line, no description), AC-013 (user-language sweep)
- **Do:**
  - `main.css` `.send-attach` (theme variables only, 11 px like `.step-coach`, the chip outlined so High Contrast tells
    it apart without colour).
  - In the detail and the map header it is a block after `.send-split`. In the Now row,
    `.ov-row-item > .send-attach { grid-column: 1 / -1 }`, aligned like `.ov-coach`, in all three container widths.
  - No layout change in `NextStep` or `SpecRow`: the line comes with `StepAction`, so the detail, the first Now row and
    0025's map header (`place: 'map'`) get it, and 0026's coach rule stays.
  - Tests:
    - New `src/webview/attach0027.test.tsx` "0027 AC-003 …": detail, first Now row, map header. The order is split
      button, status region, line, coach line. `showStepTips: false` renders the same. Nothing renders without an
      attachment or for a Copy prompt alone.
    - "0027 AC-002 …": views below the gate render no line and no `aria-describedby`.
    - `webviewCss.test.ts` "0027 AC-003 …": theme variables, the row area per container width, and no
      `overflow-wrap: anywhere` (0022 AC-002).
    - `userLanguage.test.tsx`: sweeps the line.
    - `webviewBundle.test.ts` 0019 AC-010 at `1.11.0` with Claude Code: ≤ 300 words.
  - The place tests are likely green at once. Their negative control: the line rendered before the split button gives
    red.
- **Verify:** `npx vitest run --project webview src/webview/attach0027.test.tsx src/webview/userLanguage.test.tsx` and
  `npx vitest run --project node src/adapters/node/webviewCss.test.ts src/adapters/node/webviewBundle.test.ts`. They are
  red first (CSS rules missing), then `npm run test:unit` and `npm run compile` are green.
- [ ] **Verified (T-006):** —
- **Notes:** —

### T-007 — Freshness, no writes, Restricted Mode

- **Covers:** AC-012, AC-013
- **Files:** `src/core/assistant/attach0027.timing.test.ts`, `src/core/copyNextStep/noWrite.test.ts`, `src/core/assistant/restricted.test.ts`
- **Do:** tests only.
  - Timing, on the board, overview and shell worlds with `BUDGET_MS.uiFreshness`:
    - `FeatherSpecVersion:` 1.10.0 → 1.11.0 → 1.10.0;
    - the spec moved from `backlog/` to `active/`.
    - In both cases the detail, the Overview and the Plan map view show the new attachment state. Selection, area and
      focus stay as 0024 AC-010 says.
  - `noWrite.test.ts`: 0024 AC-012's tests extended to an attaching Send and a missing-file Send. The spec source
    recorder sees only `stat`.
  - `restricted.test.ts`: AC-001–AC-012's core cases in Restricted Mode and a reader window.
  - Each file gets a negative control (a change that crosses nothing switches nothing; a planted write gives red).
- **Verify:** `npx vitest run --project timing-node src/core/assistant/attach0027.timing.test.ts` and
  `npx vitest run --project node src/core/copyNextStep/noWrite.test.ts src/core/assistant/restricted.test.ts`
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — The real URI in the host

- **Covers:** AC-014 (`npm test` part), AC-004 (a real `vscode.Uri` survives `executeCommand`)
- **Files:** `src/test/board.smoke.test.ts`
- **Do:** one thin host test, after 0024's probe pattern.
  - Register `featherspec-studio.test.attachProbe`, then execute it through `createAssistantHost()` with
    `[{ query, isPartialQuery: true, attachFiles: [host.fileUri(root, key)] }]` for a fixture spec of the test workspace.
  - The probe receives a `vscode.Uri` whose `fsPath` `vscode.workspace.fs.stat` finds.
  - No chat command runs. `waitFor` uses long waits, and every message names the path and the received value.
- **Verify:** `npm run compile` here (it compiles and lints the host tests). `npm test` runs on Windows and in CI through
  the orchestrator, and its result is recorded here.
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Preview at two widths and three themes

- **Covers:** AC-016
- **Do:** run the orchestrator's harness (`/home/claude/orch/preview/run.sh`) with Copilot (`attaching` on for the
  preview) and Claude Code, for `0002-x.md` and `0024-send-next-step-to-assistant.md`:
  - the detail, the first Now row and the map header;
  - menu closed and open;
  - Dark, Light and High Contrast;
  - 1600 px and 1000 px with the side panel open, and the detail alone at 800 px.
  - Screenshots and the verdict go into `Notes:`.
- **Verify:** manual: the orchestrator, then Gregor, check for cut text, wrapping after a separator, the chip in High
  Contrast without colour, and no shift when feedback shows. jsdom has no layout engine.
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — §5 notes, docs, title audit and final gates

- **Covers:** AC-014, AC-015, records for AC-017, AC-018, AC-020; re-proves AC-001…AC-013, AC-019
- **Do:**
  - §5's notes "*Amended by 0027 (PD-082, PD-083): …*" under each statement, after 0024's, 0025's, 0026's and 0028's
    notes. No PD row.
  - `README.md`: §7's sentence.
  - `CHANGELOG.md` `[0.1.0]`: `attaches the spec`.
  - `docs/release-checklist.md`, section 0027:
    - AC-016…AC-018 (AC-018 as not run, 13);
    - AC-017 once per assistant, with versions against V-3's;
    - AC-020;
    - one line saying that the attach version equals the FeatherSpec release with the sentence, and that `NEWEST_KNOWN`
      is not below it;
    - one line saying how C-2 or AC-017 flips `attachesSpec` (the entry, AC-019's expected row, §6.2's table).
  - `docsScan.test.ts` "0027 AC-015 …".
  - Title audit by 0021's method (`describe`/`it`/`test` literals under `src`, Baseline by `git archive`). Every missing
    title goes into `Notes:` with the changed statement or the head title that replaces it. Expected: the `version.test.ts`
    rows of `AC-016: %s is newer than known` for `1.10.1`, `1.11.0`, `1.10.1-rc1`.
  - `/sdd-architecture-update` entries:
    - `.architecture/core.md` `assistant` line: `attachment.ts` (`STEP_ATTACHES`, `attachmentOf`, the attachment
      check), `attachesSpec`, `ATTACH_FROM_VERSION`;
    - `.architecture/adapters.md` `assistantHost.ts`: `fileUri`;
    - `.architecture/webview.md` `ui/` line: `AttachmentLine`, the `file` glyph;
    - `AGENTS.md` snapshot boundary 0024: "… and never submits; a send request may name a spec path, and the host
      attaches only a spec entry of the current model whose file exists (0027)".
  - Memory Bank: the `techContext.md` *Test* line for 0027; `activeContext.md`.
- **Verify:** quality gates 1–5 in order, zero warnings; `npm test` on Windows and CI by the orchestrator, result here.
- [ ] **Verified (T-010):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-002 | — | — | open |
| AC-002 | T-001, T-002, T-006 | — | — | open |
| AC-003 | T-005, T-006 | — | — | open |
| AC-004 | T-003, T-005, T-008 | — | — | open |
| AC-005 | T-003 | — | — | open |
| AC-006 | T-003 | — | — | open |
| AC-007 | T-002, T-003 | — | — | open |
| AC-008 | T-004, T-005 | — | — | open |
| AC-009 | T-004 | — | — | open |
| AC-010 | T-004 | — | — | open |
| AC-011 | T-002 | — | — | open |
| AC-012 | T-007 | — | — | open |
| AC-013 | T-006, T-007 | — | — | open |
| AC-014 | T-008, T-010 | — | — | open |
| AC-015 | T-010 | — | — | open |
| AC-016 | T-009 | — | manual: orchestrator, preview harness, then Gregor | open |
| AC-017 | T-010 (checklist) | — | manual: Gregor on `tip-splitter`, per assistant, before the spec closes | open |
| AC-018 | T-010 (record) | — | manual: not run, closed by OP-001 (13); question moves to AC-017 | open |
| AC-019 | T-001, T-002, T-003 | — | — | open |
| AC-020 | T-010 (checklist) | — | manual: Gregor or the orchestrator, before the spec closes | open |

## Session handoff

- **Done so far:** plan written; spec OP-001 closed, OP-002 re-checked, OP-003 kept as proxy, `**Plan:**` linked
  (2026-11-19).
- **Next action:** review the plan. After 0028, 0025 and 0026 are done and the start signal is given, move the pair to
  `active/` (`/sdd-lifecycle`), set the Baseline, then T-001.
- **Open decisions:** OP-006 (C-2: Copilot and the Claude Code extension on 1.11.0) and the FeatherSpec 1.11.0 release.
  Both block closing, not building. A re-read flips one `attachesSpec` entry.
- **Baseline:** `81dc0aa` (head of `ux-round-3` before the first step commit; title audit base).
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
