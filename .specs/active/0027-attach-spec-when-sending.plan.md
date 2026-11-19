# Plan — Attach the Spec When Sending

**Spec:** [0027-attach-spec-when-sending.md](0027-attach-spec-when-sending.md)
**Status:** Done
**Last updated:** 2026-11-19
**Current step:** — (T-001…T-010 verified)

## Approach

First the decision, then the host, then the webview, then the proofs. Stage 1 lands one pure function,
`attachmentOf()`. It decides from the case, the version and the assistant whether a Send view carries the spec. The view
and the toggletip then carry that result. Stage 2 makes the host attach: the request names the path, the host checks it
against the model and the file, and the call shapes follow. A missing or foreign file sends without the attachment and
says so. Stage 3 draws the line under the split button, first as a stub. Stage 4 proves freshness, no writes and the real
URI in the host. Stage 5 is the preview, §5's notes, the docs and the gates.

**The per-assistant switch is one data entry** (PD-089, OP-006): `attachesSpec` on each `ASSISTANTS` entry
(`claudeCode: true`, `copilot: false`). Every other test injects its own table through `offerOf()`, `createFakeOffer()` and
`createSend()`. So flipping an entry after C-2 changes that entry and the tests that pin the shipped table (compile 0027 F2: on a scratch copy, Copilot `true` turns 10 tests red in `attachment.test.ts`, `offer.test.ts`, `restricted.test.ts` and `sendView.test.ts`; update their expected rows with the entry).

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
- [x] **Verified (T-001):** 2026-11-19 · red first (`attachmentOf` stub `Not implemented`: 43 failed), then `npx vitest run --project node src/core/assistant src/core/specs/version.test.ts src/core/specs/readProject.test.ts` 261 passed; `src/core/{planMap,board,shell,overview}` 863 passed; tsc and eslint clean.
- **Notes:** Proxy decision: `Offer` holds only `assistant` unless a table is injected (`offerOf(value, present, attaching?)` then adds `attaches`); `attachesOf(offer)` reads `offer.attaches ?? ASSISTANTS[id].attachesSpec`. The plan's always-set `attaches: true` would make 0024's staying `offerOf(...).toEqual({ assistant })` tests fail, and a staying test is never weakened. `createFakeOffer(initial, { attaching })` takes a function. `attachmentOf(offer, case, { version, key })` gives `withheld` only for a case that attaches, an attaching assistant and a closed gate; whitespace for Claude Code gives neither. `AC-016: %s is newer than known` keeps its title (rows retargeted to 1.11.1, 2.0.0, 1.11.1-rc1, 10.0.0); `readProject.test.ts` AC-016 uses 1.11.1.

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
- [x] **Verified (T-002):** 2026-11-19 · red first (29 failed: no `attach`, 0024's paragraph), then `npx vitest run --project node src/core/assistant src/shared/protocol src/core/board/nextStepBaseline.test.ts` 401 passed; `src/core src/shared` + webviewBundle 2351 passed; tsc (both), eslint, `npm run compile` clean. **Stage 1 gate (full chain) green 2026-11-19:** 201 files, 3615 passed, 4 skipped; timing 13 files, 28 passed; compile and compile-tests clean.
- **Notes:** `sendViewOf(offer, case, context?)` adds `attach` only with a context (existing two-argument callers keep their view); `tipClosingOf(offer, withheld)`; `withheldOf()` beside it. `PROTOCOL_VERSION` 11. Staying tests changed by §5 (title kept, same sentence plus §7's update sentence, never weakened): `detail.test.ts` 'the toggletip closing pair follows the offer …' and `rows.test.ts` 'the send view stays with tips off …' (Claude Code at 1.10.0 is withheld, 0024 §7 row amended). Titles changed: `0025 AC-006 … the protocol is version 10` → `version 11` (messages.test.ts; AC-014 list for T-010). Test world helper `testing/caseWorlds.ts` holds one fixture per StepCase (NS-7 reached with a Not started plan). `webviewBundle.test.ts` envelope literals `v: 10` → `v: 11`.

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
- [x] **Verified (T-003):** 2026-11-19 · red first (10 failed: `createAttachmentCheck` stub `Not implemented`, no `attachFiles`, no suffix), then `npx vitest run --project node src/core/assistant src/adapters/node/sourceScan.test.ts src/adapters/vscode/assistantHost.test.ts` 284 passed; `src/core src/adapters` 2710 passed; tsc (both), eslint, `npm run compile` clean. `npm test` (host) not run here: orchestrator on Windows.
- **Notes:** Tests are in the new file `src/core/assistant/sendAttach.test.ts` (AC-004…AC-007 "0027 …"), not in `send.test.ts`, which stays untouched. `createSend` deps `attachment?` and `attaching?` are optional so 0024's world builds unchanged; `createAssistantWiring` requires `source` and `specs` (wiring.test.ts gets the two ports). The attach decision at send time: `request.attach` set and `attaching(id) ?? ASSISTANTS[id].attachesSpec`; a failed check currently sends 0024's calls without attachment (T-004 adds the sentence and the Output line). Whitespace for Claude Code is dropped in `callsFor` too. `extension.ts` hoists `specSource`. `sourceScan.test.ts`: `preserveInput`, `modelSelector` in `SEND_FORBIDDEN_TERMS`, new test `attachFiles` exactly once, in `assistants.ts`. The fake host records `uriRequests` and returns `{ fake: 'uri', root, key }`.

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
- [x] **Verified (T-004):** 2026-11-19 · red first (18 failed: 0024's success sentence, no Output line), then `npx vitest run --project node src/core/assistant` 259 passed; tsc and eslint clean. **Stage 2 gate (full chain) green 2026-11-19:** 202 files, 3654 passed, 4 skipped; timing 13 files, 28 passed; compile and compile-tests clean.
- **Notes:** Tests in `sendAttach.test.ts` (AC-008, AC-009, AC-010 "0027 …"). Proxy decision: a path the model does not hold is never statted (the stat recorder stays empty for AC-010's paths); a symlink or directory entry counts as not found (`kind` must be `file`, plan survey). The hang case needs no new code: the 0024 timer covers `run()` including the check.

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
- [x] **Verified (T-005):** 2026-11-19 · red with the stub (7 failed: no line, no description, no `attach` in the payload), then `npx vitest run --project webview src/webview/ui` 146 passed; `src/webview src/shared` 928 passed; tsc (both) and eslint clean.
- **Notes:** Tests: `ui/AttachmentLine.test.tsx` (line, chip, tooltip, StepAction order and descriptions) and `ui/SendButton.test.tsx` (describedby, payload `attach`, Copy prompt). Text module: `ATTACHED_WHEN_SENT`, `attachTooltipText` in `assistantTexts.ts`. The `file` glyph is a hand-drawn page with a folded corner (codicon motif). The arrow part carries no description (the spec names the main part and each Send item). The line is a `<p>` that follows `.send-split` inside `StepAction`'s fragment; CSS is T-006.

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
- [x] **Verified (T-006):** 2026-11-19 · place tests green at once (planned), negative control for the order added; CSS tests red (2 failed) then green; `npx vitest run --project webview src/webview/attach0027.test.tsx src/webview/userLanguage.test.tsx` and `--project node src/adapters/node/webviewCss.test.ts src/adapters/node/webviewBundle.test.ts` green; tsc (both), eslint clean. **Stage 3 gate (full chain) green 2026-11-19:** 204 files, 3680 passed, 4 skipped; timing 13 files, 28 passed; compile and compile-tests clean.
- **Notes:** `main.css`: `.send-attach` (11 px, description colour, `overflow-wrap: break-word`), `.send-attach-chip` (inline, 1px outline in `--vscode-contrastBorder` so High Contrast tells it apart without colour, `box-decoration-break: clone` so a wrapped name keeps its frame), row rule `.ov-row-item > .send-attach` (spans the row, right-aligned like `.ov-coach`, left below 420 px). The line stays in the first Now row while its spec is selected (0026 removes the coach line, not the button's line, §6.3). `webviewBundle.test.ts` 0027 test: spec 0015's detail at 1.11.0 with Claude Code (a Send with attachment) stays within 300 words. Test names avoid the removed-feature word outside the masked forms (`sourceScan` 0015 AC-021).

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
- [x] **Verified (T-007):** 2026-11-19 · tests only, green at once as the step says; `npx vitest run --project timing-node src/core/assistant/attach0027.timing.test.ts` 5 passed; `--project node src/core/copyNextStep/noWrite.test.ts src/core/assistant/restricted.test.ts` 18 passed; tsc and eslint clean.
- **Notes:** Files: new `src/core/assistant/attach0027.timing.test.ts` (board world with a model swap for version and for backlog-to-active, shell world for the AGENTS.md line; selection and area stay; negative control 1.10.0 to 1.10.1), `noWrite.test.ts` (real temp copy; spec source sees only `stat`; planted-write control is the existing `control:` test; source scan of the check and the line), `restricted.test.ts` (trusted equals Restricted, the spec attached, negative control without the table). The Plan map header takes the detail's next step (0025 D-2), so the detail view stands for it in the timing test.

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
- [x] **Verified (T-008):** 2026-11-19 · `npm run compile` (type check, lint, bundle) clean here; the host test needs `vscode-test`: **not run here, the orchestrator runs `npm test` on Windows and records the result.** **Stage 4 gate (full chain) green 2026-11-19:** 204 files, 3685 passed, 4 skipped; timing 14 files, 33 passed; compile and compile-tests clean.
- **Notes:** One test in `src/test/board.smoke.test.ts`: the probe `featherspec-studio.test.attachProbe` receives `{ query, isPartialQuery, attachFiles: [host.fileUri(root, key)] }` through `createAssistantHost().execute`; asserts a `vscode.Uri` instance, the exact three keys, `vscode.workspace.fs.stat` kind File and the path suffix (separator-neutral for Windows). No chat command runs. Messages name the path and the received value.

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
- [x] **Verified (T-009):** 2026-11-19 · orchestrator, harness `r9check.mts` at e37f65d (`dist/webview` rebuilt; fake offer with `attaching` on for Copilot and Claude Code) on a 1.11.0-stamped copy of `fs-version-1110` with `backlog/0002-x.md` and `active/0024-send-next-step-to-assistant.md` × Dark/Light/HC × 1600/1000 px (side panel open) and the detail alone at 800 px; detail, first Now row and map header, menu closed and open, and after Send: no cut text (only `visually-hidden`/`sr-number` clip by design), no word wrapped inside itself, the chip line `<name> attached when sent` wraps only between chip and text, the chip told apart in HC by its frame and file icon without colour, no shift of the detail's sections after Send (`Opened in …` replaces the label in place), Copilot's menu `Send to a new chat` (checked), `Send to the current chat`, `Copy prompt`, Claude Code's two items, the host received `attach` with the spec path for both specs and both assistants, no page errors. 72 screenshots in orch/preview/r9-0027 (Claude Code in `claude/`), sampled by eye. Windows at e37f65d: unit 3684/8 + timing 33, `npm test` 34+1+1+1 passing, exit 0. Gregor's half (real window) stays open.
- **Notes:** Run by the orchestrator, see Verified: `host.mts` builds the session with `createFakeOffer({ assistant }, { attaching: () => true })`; the project is a 1.11.0-stamped copy (`/tmp/fs-0027`). Screenshots and `report.json` in `/home/claude/orch/preview/r9-0027` (Copilot) and `r9-0027/claude/` (Claude Code).

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
- [x] **Verified (T-010):** 2026-11-19 · `docsScan.test.ts` 'product docs after 0027 (AC-015)' (3 tests) green; title audit run; **Final gate chain green 2026-11-19:** eslint, tsc (both), `test:unit` 204 files, 3688 passed, 4 skipped, timing 14 files, 33 passed, `compile`, `compile-tests`. `npm test` (host, Windows and CI): not run here, the orchestrator records its result.
- **Notes:** §5 notes: 51 lines in 15 specs (0024 ×15, 0025 ×4, 0026 ×3, 0021 ×3, 0022 ×4, 0002 ×3, 0013, 0015…0020, 0023, 0028), each "*Amended by 0027 (PD-082, PD-083): …*" after the earlier notes; `.specs/done/0013-*` included. README, CHANGELOG, checklist section 0027 (AC-016, AC-017 per assistant with V-3's versions, AC-018 not run, AC-020, attach-version line, C-2 flip line), `docsScan.test.ts` order list and 0027 AC-015 tests. Architecture: `.architecture/{core,adapters,webview}.md`, `AGENTS.md` snapshot (reconciled 0027) and boundary; Memory Bank: `techContext.md`, `activeContext.md` (compacted to keep its size test). **Title audit** (`/tmp/ta25/titles.py`, base `81dc0aa` src vs head, `it.each` counted): 3439 base titles, 3555 head, **one missing:** `messages.test.ts | 0025 AC-006: the protocol is version 10; a focus names a spec and one of step, ways, heading; other shapes are refused`, replaced by the same test titled `… the protocol is version 11; …` (statement changed: `PROTOCOL_VERSION` 11 by 0027 T-002, 0027 §10). The planned `AC-016: %s is newer than known` rows keep their title (values retargeted), so they are not missing. Staying tests whose expectation changed with their title kept (statement changed by §5, 0024 §7 toggletip row): `detail.test.ts` 'the toggletip closing pair follows the offer …' and `rows.test.ts` 'the send view stays with tips off …'; envelope literals `v: 10` → `v: 11` in eight webview and bundle tests, and the two 'another version' tests moved to 12.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001, T-002 | `core/assistant/attachment.ts` (`STEP_ATTACHES`, `attachmentOf`), `sendView.ts`, `core/board/detail.ts`, `core/overview/rows.ts` | `attachment.test.ts` "0027 AC-001 …"; `sendView.test.ts` "0027 AC-001 …" (13 cases × both assistants, first Now row) | green (stage 1 gate) |
| AC-002 | T-001, T-002, T-006 | `attachment.ts`, `core/specs/version.ts`, `webview/ui/StepAction.tsx` (no line, no description without `attach`) | `attachment.test.ts`, `sendView.test.ts`, `version.test.ts`, `readProject.test.ts`; `attach0027.test.tsx` "0027 AC-002, AC-003 …" | green (stage 3 gate) |
| AC-003 | T-005, T-006 | `ui/AttachmentLine.tsx`, `ui/StepAction.tsx`, `ui/SendButton.tsx` (`describedBy`), `board/icons.tsx` (`file`), `main.css` | `AttachmentLine.test.tsx`, `SendButton.test.tsx`, `attach0027.test.tsx` "0027 AC-003 …", `webviewCss.test.ts` "0027 AC-003 …", `webviewBundle.test.ts` "0027 AC-003 …" | green (stage 3 gate) |
| AC-004 | T-003, T-005, T-008 | `assistants.ts`, `attachment.ts`, `send.ts`, `ports/assistant.ts`, `adapters/vscode/assistantHost.ts` (`fileUri`), `ui/SendButton.tsx` | `sendAttach.test.ts` "0027 AC-004 …"; `SendButton.test.tsx`; `assistantHost.test.ts`; `src/test/board.smoke.test.ts` "0027 AC-004 …" (host, orchestrator on Windows) | green here (stage 4 gate); host smoke written, `npm test` by the orchestrator |
| AC-005 | T-003 | `assistants.ts` `callsFor` (Claude Code suffix) | `sendAttach.test.ts` "0027 AC-005 …" | green (stage 2 gate) |
| AC-006 | T-003 | `send.ts` (no check without `attach` or for a non-attaching assistant) | `sendAttach.test.ts` "0027 AC-006 …" | green (stage 2 gate) |
| AC-007 | T-002, T-003 | `shared/protocol/assistant.ts`, `assistants.ts` (`attachFiles` once) | `assistant.test.ts` "0027 AC-007 …"; `sendAttach.test.ts` "0027 AC-007 …"; `sourceScan.test.ts` "0027 AC-007 …" and `SEND_FORBIDDEN_TERMS` | green (stage 2 gate) |
| AC-008 | T-004, T-005 | `send.ts` fallback (copies `request.line`), `ui/SendButton.tsx` (Copy prompt copies `line`) | `sendAttach.test.ts` "0027 AC-008 …"; `SendButton.test.tsx` "0027 AC-008 …" | green (stage 3 gate) |
| AC-009 | T-004 | `send.ts`, `assistantTexts.ts` (`sendOpenedWithoutText`, `attachMissingOutputText`) | `sendAttach.test.ts` "0027 AC-009 …" (per cause and assistant, hang) | green (stage 2 gate) |
| AC-010 | T-004 | `attachment.ts` `createAttachmentCheck` (spec entries of the model only) | `sendAttach.test.ts` "0027 AC-010 …" | green (stage 2 gate) |
| AC-011 | T-002 | `sendView.ts` `tipClosingOf`, `assistantTexts.ts` `ATTACH_UPDATE_TEXT` | `sendView.test.ts` "0027 AC-011 …"; `detail.test.ts`, `rows.test.ts` (amended literals) | green (stage 1 gate) |
| AC-012 | T-007 | `attachment.ts`, `sendView.ts` (pure of the model, so a model change recomputes it) | `attach0027.timing.test.ts` "0027 AC-012 …" (board and shell worlds, 500 ms) | green (stage 4 gate) |
| AC-013 | T-006, T-007 | `assistantTexts.ts` (text module), `attachment.ts` (stat only) | `noWrite.test.ts` "0027 AC-013 …" (2), `restricted.test.ts` "0027 AC-013 …", `userLanguage.test.tsx` "0027 AC-013 …" | green (stage 4 gate) |
| AC-014 | T-008, T-010 | `messages.test.ts`, `detail.test.ts`, `rows.test.ts`, `version.test.ts`, `readProject.test.ts` (changed with their title kept or one title changed, see T-010 Notes); `src/test/board.smoke.test.ts` | `npm run test:unit` green; title audit: one missing title, listed in T-010 Notes; `npm test` on Windows and CI by the orchestrator | partial: unit and audit green; `npm test` on Windows green at e37f65d (34+1+1+1, exit 0); CI pending on the round-3 PR |
| AC-015 | T-010 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, the notes in 15 specs, `.architecture/*`, `AGENTS.md`, Memory Bank | `docsScan.test.ts` "product docs after 0027 (AC-015)" (3) | green (final gate) |
| AC-016 | T-009 | `ui/AttachmentLine.tsx`, `main.css` | manual: orchestrator checked preview r9-0027 (cut text, separator wraps, chip in HC, no shift after Send, `attach` in the request), 2026-11-19; Gregor open | open |
| AC-017 | T-010 (checklist) | checklist section 0027 (one line per assistant, V-3 versions) | manual: Gregor on `tip-splitter`, per assistant, before the spec closes | open (Gregor) |
| AC-018 | T-010 (record) | checklist section 0027 | manual: Gregor, 2026-11-19 (13): click tests ended after tasks 1–3 by his decision, the remaining questions move to real use (12 F-3) and AC-017 | closed as moved (Gregor's decision) |
| AC-019 | T-001, T-002, T-003 | `assistants.ts` `attachesSpec`, `offer.ts` `attachesOf`, `send.ts` | `attachment.test.ts`, `offer.test.ts`, `sendView.test.ts` "0027 AC-019 …"; `sendAttach.test.ts` (non-attaching assistant: AC-006 calls) | green (stage 2 gate) |
| AC-020 | T-010 (checklist) | checklist section 0027 | manual: Gregor or the orchestrator with the 43 KB `0022` spec on 1.11.0 | open |

## Session handoff

- **Done so far:** T-001…T-008 and T-010 done; stage gates 1 to 4 and the final chain green (2026-11-19); §5 notes, docs, architecture and Memory Bank synced; title audit has one retitled test (T-010 Notes).
- **Next action:** All steps verified (T-009 by the orchestrator, r9-0027; Windows `npm test` green at e37f65d). Open: CI on the round-3 PR; Gregor's C-2 (OP-006), AC-017, AC-020 and his look at AC-016; a C-2 re-read flips one `attachesSpec` entry plus the shipped-table tests (F2). Then `/sdd-lifecycle`.
- **Open decisions:** OP-006 (C-2: Copilot and the Claude Code extension on 1.11.0) and the FeatherSpec 1.11.0 release.
  Both block closing, not building. A re-read flips one `attachesSpec` entry.
- **Baseline:** `81dc0aa` (head of `ux-round-3` before the first step commit; title audit base).
- **Environment:** `npm test` only on Gregor's Windows machine and CI, through the orchestrator.
