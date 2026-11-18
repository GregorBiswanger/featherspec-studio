# Plan — Send the Next Step to My Assistant

**Spec:** [0024-send-next-step-to-assistant.md](0024-send-next-step-to-assistant.md)
**Status:** Done
**Last updated:** 2026-11-18
**Current step:** T-015 (T-001…T-013 verified; manual AC-016 real window and AC-017…AC-019 open)

## Approach

Everything that touches another extension sits behind one port, `AssistantHostPort` (find an extension, activate it,
list commands, run a command, extension changes), with a thin adapter in `src/adapters/vscode/assistantHost.ts`. The
logic lives in a new pure core area, `src/core/assistant/`, proven with fakes: the offer, the send view, Send with its
fallback. The host side comes first, with no UI. T-001 adds the setting, the Open Settings command and the scan exception
that the manifest needs. T-002 adds the offer and the default target. T-003 is Send with exactly PD-074's calls and the
fallback to Copy prompt; it is the riskiest step. Then the views carry the offer, through 0021's `createSettingsSource`
and the services' recompute path; the host wiring and smoke come with them (T-004). The webview follows: the split
button with its feedback (T-005), then the menu keys, one popup at a time with 0021's toggletip, focus on an offer
change, and the sweeps (T-006). §5 notes, docs, the test-title audit, architecture and the Memory Bank close the plan
(T-007). Building blocks reused, not rebuilt: `copyLine()`, `StepUiPort.warn`, `OutputPort`, `ClockPort.setTimeout`,
`ui/CopyButton.tsx` looks and texts, `stepTips()`'s `closing` parameter, the Overview grid's `copy` area. Test review
once per stage from the tests named in `Do:` (`AGENTS.md` *TDD*). No file this task did not create is deleted.
Memory Bank touched in T-007 only: `techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** per step (`techContext.md` *Quality gates*): 1 `npx eslint src --max-warnings 0` ·
2 `npx tsc --noEmit` · 3 `npx tsc --noEmit -p src/webview` · 4 `npm run test:unit` · 5 `npm run compile` (steps
touching wiring, adapters, `extension.ts`, `package.json` or the bundle) · `npm run compile-tests` where a host test
changes · pre-done gate `npm test` on Windows and CI (cannot run here, PLAN-NOTE).

## Research

**Checkpoint digest (2026-11-18, `/sdd-plan` Mode A under Gregor's delegation).** No question only Gregor can answer:
the spec, PD-068…PD-076 (newest wins), the V-2 record and `.claude/rules/ux-guidelines.md` 1–12 decide every choice;
open choices are proxies P-1…P-18. PD-068 and PD-074 are older than the spec and are in it already. PD-076 is newer
than the spec's last revision, so the spec is revised in place, open points only (P-1). No new dependency. Gregor reads
this plan and replies with changes or approval.

**AC-019, draft part (PD-076, 2026-11-18).** Gregor on the HTML draft (`/home/claude/orch/clicktest2/project/Send.dc.html`:
setting, split button `Send to <Name>` with its menu, simulated chat, fallback toast): "ich finde es super so". §6.3 and
§7 stand as drawn. The draft's texts and targets match the spec (checked: labels, names, menu items, default target per
session, fallback warning). The part on the build (AC-017) stays manual.

**Survey (code at `c9845e1`; 0021, 0022, 0023 built).**
- Copy path: webview `copyText { text }` → `core/board/boardRequests.ts` → `copyLine(clipboard, line)` → `{ ok, text }`
  (`COPIED_TEXT`, `COPY_FAILED_TEXT`) → event `copyResult`. `studioPanel.ts` posts it (`PanelBoard.onDidCopyResult`).
  `client.ts` keeps one `copyResult` and drops it when the detail key changes. `ui/CopyButton.tsx` (looks primary,
  secondary, icon; `waiting` and `seen` refs; 2000 ms from the activation; its own live region).
- Places: `detail/NextStep.tsx` renders line 0 with `look="primary"`, the coach line and the `Toggletip`.
  `areas/overview/Now.tsx` passes `copyLook="primary"` to the first `SpecRow`. `SpecRow.tsx` renders `CopyButton` as a
  sibling of the row's `Drill`, so it sits in the grid area `copy` (`.ov-row-item > .next-step-copy`), then the coach.
- Tips: `stepTips(case, settings, closing = TIP_CLOSING)` (`core/board/stepTips.ts`). `buildDetail()` adds `tips` only
  while `show`. `projectNow()` passes tips to row 0 only. `NextStepView = { rule, lines, tips? } | { rule, text }`.
  `OverviewRow` has an optional `step` and `tips`; its guard takes exact keys (`overview.ts` `isRow`). Session words come
  from `STEP_GUIDES[case].session` (`new`: NS-5, NS-9; `sameOrNew`: NS-6-open, NS-6-returned; `any`: the rest).
- Settings: `SettingPort { read; onDidChange }`; `createSettingPort(key)` (`adapters/vscode/settings.ts`, filtered by
  `affectsConfiguration`); `createSettingsSource(ports, parse)` (`core/settings`). `boardService` and `overviewService`
  take `tips: SettingsSource<…>` and recompute on its change. Timing tests: `boardService.timing.test.ts` and
  `overviewService.timing.test.ts` "0021 AC-011" (`BUDGET_MS.uiFreshness` = 500).
- Host: `StepUiPort.warn(text)` = `showWarningMessage` without actions (`adapters/vscode/stepUi.ts`).
  `OutputPort.appendBlock(lines)` writes the lines and one blank line. `ClockPort.setTimeout`. `UiPort.showNotification`
  knows only setup actions, so it is not used. Foreign commands today: `vscode.openFolder`, the trust command,
  `setContext`. Nothing in `src` names a chat command, `submit`, `acceptInput`, `inlineChat`, `vscode.lm`, `vscode://`,
  `chatgpt` or `github.copilot.` (grep at `c9845e1`).
- Protocol: `PROTOCOL_VERSION` 6 (`envelope.ts`). The literal `v: 6` or `v: 7` appears in `webviewBundle.test.ts` (21),
  `client.test.ts` (5), `probe.test.ts` (4), `PanelStateView.test.tsx`, `Drilldown.test.tsx`, `SpecBoard.test.tsx` (2
  each), `messages.test.ts` and `Sections.test.tsx` (1 each). `REQUEST_GUARDS` lists every request type;
  `BoardRequestPayloads` reach the host through `PanelBoard.handlers`.
- Manifest: 0021's `contributes.configuration` (title `FeatherSpec Studio`, two keys, no `scope`).
  `capabilities.untrustedWorkspaces` is `limited` with a description and no `restrictedConfigurations`. `view/title`:
  Open `navigation@1`, Refresh `navigation@2`. Publisher `GregorBiswanger`, `extensionKind ["workspace"]`.
- Scans that 0024's names meet: `sourceScan.test.ts` 0015 AC-021 (`REMOVED_TERMS` holds `copilot`, case-insensitive,
  over every `src` file incl. tests and `package.json`, except `REMOVED_ALLOWED`). 0015 AC-022 forbids `copilot` in
  `src/test` file names and `.vscode-test.mjs`. `docsScan.test.ts` (`FORBIDDEN` holds `copilot`, `provider`; `ALLOWED`
  exact phrases). `manifest.test.ts` AC-016 (0015) covers the top-level description and keywords only.
- Popups and Escape: `ui/Toggletip.tsx` holds a module-level `openId` store (one open at a time), document
  `pointerdown`/`keydown` capture listeners while open, and closes on a content change. `detail/DetailFrame.tsx` closes
  the side panel (or goes back from the detail alone) on Escape unless `defaultPrevented`.
- Primary count: `primaryButtons.test.tsx` counts `button.copy-button` without `.copy-secondary`. CSS: `.copy-button`
  `min-width: 14ch`, content-box, 11 px. 0022 AC-028's arithmetic (`webviewCss.test.ts`) gives a row content of 302 px at
  `AREA_MIN` 360. The split button (22ch at 11 px + padding + border + a 24 px arrow, about 187 px) fits.
- Host smoke: `src/test/board.smoke.test.ts` flips `showStepTips` with the Global target. Smoke files import adapters
  directly. No `src/test` file name may hold `copilot`.
- 0023 is being compiled in parallel. Any 0023 fix that touches `NextStep.tsx`, `SpecRow.tsx`, `CopyButton.tsx`,
  `primaryButtons.test.tsx` or `webviewBundle.test.ts` is integrated before T-005 (re-read those files then).
- No `done/` spec is invalidated: 0005, 0006, 0007 and 0013 get no behaviour change. The amended active specs are §5's.

**Sources.**
- [VS Code API reference](https://code.visualstudio.com/api/references/vscode-api) — `extensions.onDidChange` "fires when
  extensions.all changes … when extensions are installed, uninstalled, enabled or disabled"; `Extension.activate()`
  "returns … A promise that will resolve when this extension has been activated"; `isActive`; `getCommands` "Commands
  starting with an underscore are treated as internal". This settles the port's methods (P-2). Retrieved 2026-11-18.
- [Proposed API `extensionsAny`](https://cdn.jsdelivr.net/npm/@codingame/monaco-vscode-api@28.0.1/vscode-dts/vscode.proposed.extensionsAny.d.ts)
  — `getExtension` needs a proposed `includeDifferentExtensionHosts` flag to see another host's extensions, so the
  stable call sees only the Studio's own host. This confirms A-014. Retrieved 2026-11-18.
- [VS Code — Supporting Remote Development](https://code.visualstudio.com/api/advanced-topics/remote-extensions) —
  "VS Code automatically routes any executed commands to the correct extension regardless of its location". So
  `execute` needs no host logic. Retrieved 2026-11-18.
- [VS Code — Workspace Trust extension guide](https://code.visualstudio.com/api/extension-guides/workspace-trust) —
  "VS Code will only return the user-defined value of the setting in Restricted Mode"; "When trust is granted, a
  configuration change event will fire". This settles §6.1 and AC-011 with no trust input in the core. Retrieved
  2026-11-18.
- [VS Code source `configurationExtensionPoint.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/api/common/configurationExtensionPoint.ts)
  — `enumItemLabels` "Labels for enum values to be displayed in the Settings editor"; `restrictedProperties` is read
  only when `supported === 'limited'` (the Studio's value). This settles the manifest shape (T-001). Retrieved
  2026-11-18.
- [VS Code source `chatActions.ts`](https://raw.githubusercontent.com/microsoft/vscode/main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts)
  — `IChatViewOpenOptions.isPartialQuery` "Whether the query is partial and will await more input from the user". With
  it, `open` calls `chatWidget.setInput(opts.query)` and no `acceptInput`. Without it, `open` submits. `ACTION_ID_NEW_CHAT
  = 'workbench.action.chat.newChat'`. This confirms PD-074's ground truth, and on `main` a draft in the current chat is
  replaced (OP-004, AC-017 records it). Retrieved 2026-11-18.
- [Elio Struyf — open your extension settings from code](https://eliostruyf.com/devhack-open-vscode-extension-settings-code)
  — `executeCommand('workbench.action.openSettings', '@ext:<publisher.name>')` (§6.7). Retrieved 2026-11-18.
- [VS Code contribution points](https://code.visualstudio.com/api/references/contribution-points) — "The group-local
  order of a menu item is specified by appending @<number>"; `window` scope "can be configured in user, workspace, or
  remote settings". This settles `navigation@3` and `scope`. Retrieved 2026-11-18.
- [WAI-ARIA APG — Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) and
  [Menu and Menubar](https://www.w3.org/WAI/ARIA/apg/patterns/menubar/) — Enter, Space, ArrowDown open on the first item,
  ArrowUp on the last; Escape closes and returns focus; arrows optionally wrap; Tab moves focus out of the menu; a
  `menu` has `aria-labelledby` the button; `aria-expanded` true or false. This settles §6.3's keys (T-006). Retrieved
  2026-11-18.
- [WCAG 2.2 Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) — "at least
  24 by 24 CSS pixels" (the arrow part). Retrieved 2026-11-18.
- Repo: React 19.3.1, jsdom 31.0.1, Vitest 5.1 (`techContext.md`); `docs/decisions/v2-prefill-spike-2026-11-18.md`
  (VS Code 1.147.0, Copilot Chat 0.75.0, Claude Code 2.1.327; exactly the calls of §6.4). Read 2026-11-18.

**Proxy decisions (Gregor delegated; P-n).**
- P-1 Spec revised (open points only, PD-076). Basis names PD-076 and that 0021–0023 are implemented. OP-001 is closed.
  §7's heading now reads "confirmed by the click test". OP-004 gets the source reading. §13 and the Plan line follow.
  No criterion, rule or text changed.
- P-2 Modules:
  - Shared: `src/shared/protocol/assistant.ts` (`ASSISTANT_IDS` `copilot`, `claudeCode`; `ASSISTANT_TARGETS` copilot
    `['new', 'current']`, claudeCode `['new']`; `SendView`; `SendPromptPayload`; `SendResultEventPayload`; guards) and
    `assistantTexts.ts` (every §7 text except the manifest's; `ASSISTANT_NAMES`).
  - Core: `src/core/assistant/` holds `assistants.ts` (extension ID and calls per assistant and target, the only home
    of the command strings), `offer.ts`, `sendView.ts`, `send.ts` and `testing/fakeAssistantHost.ts`.
    `src/core/settings/openSettings.ts`.
  - Ports: `src/core/ports/assistant.ts`, with `CommandPort { execute(command, args) }` and
    `AssistantHostPort extends CommandPort { extension(id): { active: boolean } | undefined; activate(id); commands();
    onDidChangeExtensions(listener) }`.
  - Adapter: `src/adapters/vscode/assistantHost.ts`.
  - Webview: `ui/SendButton.tsx` and `ui/popup.ts`.
- P-3 Offer: `offerOf(value, present)` returns `{ assistant }` exactly when `value` is the string `copilot` or
  `claudeCode` and that assistant's extension ID (as §6.2 writes it) is in `present`; otherwise it returns
  `undefined`. The source is 0021's `createSettingsSource([createSettingPort('assistant'), extensionPresence(host)],
  …)`. `extensionPresence` is a `SettingPort`-shaped reader: `read` gives the present IDs among the two, and its change
  is `onDidChangeExtensions`.
- P-4 Send view: `SendView { assistant, target, targets }`. The spec note's `name` is dropped: the webview takes the
  name from `ASSISTANT_NAMES`, which is a text lookup, not a derivation. Target: Copilot `new` when the case's session
  is `new`, else `current`; Claude Code always `new`. It rides on `NextStepView.send` (lines variant only) and on
  `OverviewRow.send` (row 0 of Now, only with a `step`), whatever `showStepTips` says.
- P-5 Protocol:
  - Request `sendPrompt { assistant, target, line }` in `BoardRequestPayloads`. The guard takes exact keys, a target in
    the assistant's targets, and a non-empty line.
  - Event `sendResult { outcome: 'opened' | 'copied' | 'copyFailed', text }`.
  - The handler lives in `createBoardRequests` (new dep `send`); the panel posts the event the way it posts
    `copyResult`.
  - `PROTOCOL_VERSION` becomes 7 once, in T-004: the `v: 6` literals become `v: 7`, and the "another version" `v: 7`
    becomes `v: 8`.
- P-6 Send:
  - If the current offer does not name the request's assistant, the host calls `copyLine`, shows no warning and writes
    no Output line.
  - Otherwise it runs the checks of §6.4 in order: `extension(id)`, then `activate` unless `active`, then
    `commands()` must hold every command of the row. Then it makes the calls in order.
  - One `settled` flag; nothing is called after it is set.
  - A 5000 ms timer (`ClockPort.setTimeout`) starts when the host receives the request (the host cannot see the
    click). A result after the timer changes nothing.
  - Fallback: `copyLine`, then `StepUiPort.warn` (0017's warning without actions), then
    `OutputPort.appendBlock([line])`. The paste key comes from `process.platform`, which `extension.ts` reads. In a
    remote window that is the remote's platform: a known limit, and A-014 makes such windows rare.
  - `<message>` is `Error.message`, else `String(reason)`.
- P-7 Toggletip: `TIP_CLOSING[1]` in 0021's `nextStepTexts.ts` becomes §7's settings sentence (always). With an offer,
  `buildDetail` and `projectNow` pass `[sendTipSentence(name), TIP_CLOSING[1]]` to `stepTips`.
- P-8 Split button DOM:
  - A `span.send-split.next-step-copy` with `position: relative`; it sits in the Overview grid's `copy` area.
  - It holds `button.copy-button.send-main`, `button.send-arrow` and, while the menu is open, `div[role=menu].send-menu`
    (`position: absolute; top: 100%; right: 0`).
  - The primary counter counts `.copy-button` without `.copy-secondary`, so a split button counts once (A-013). The
    arrow part gets the primary colours from its own rule (`--vscode-button-*`; separator `--vscode-button-separator`).
  - Menu colours: `--vscode-menu-*`, with the focus outline of 0013.
  - Arrow glyph: an own `Glyph` kind with a down chevron path, `aria-hidden` (no icon font, 0021 A-008).
- P-9 Feedback: it shows from the result until 2000 ms after the last result. The Copy prompt item takes its result
  from `copyResult`; Send takes it from `sendResult`. While a Send is pending, the main part keeps its text and name.
  `FEEDBACK_MS` is exported from `CopyButton.tsx`. `client.ts` keeps `sendResult` like `copyResult` (dropped when the
  detail key changes) and offers `sendPrompt(request)`; `useBoard()` exposes both.
- P-10 Popups:
  - `ui/popup.ts` holds the one open id, moved out of `Toggletip.tsx`; the toggletip keeps its behaviour and tests.
  - Menu keys follow APG and §6.3. Escape is `preventDefault`, so `DetailFrame` keeps the panel or the detail alone.
  - Tab closes the menu and puts focus on the arrow part before the default action, so focus moves on to the next
    control.
  - A pointer press outside menu and arrow closes the menu (document capture listener, as the toggletip does).
- P-11 Focus on an offer change (AC-010): the place (`NextStep`, `SpecRow`) remembers whether focus was inside its split
  button. If a Copy prompt replaces the split button, a layout effect focuses the new Copy. If the split button stays
  (the assistant changed), focus goes to the arrow part and the open menu closes. This runs before `DetailFrame`'s
  rescue, so the heading rule does not fire.
- P-12 Scan exceptions (§5, 0015 AC-021 and AC-025):
  - `sourceScan.test.ts` masks these forms, case-sensitively, before its case-insensitive scan: `GitHub.copilot-chat`,
    `GitHub Copilot`, `'copilot'`, `"copilot"`, and the word `Copilot` (capital C, not followed by a letter, digit,
    `-` or `.`).
  - `docsScan.test.ts` adds to `ALLOWED`: `GitHub Copilot`, `Send to Copilot`, `` `copilot` ``,
    `GitHub.copilot-chat`, `Copilot's chat`.
  - Negative controls must still find `copilotProvider`, `copilot-agent`, `COPILOT`, `copilot.smoke`, and
    `a Copilot provider` (both words).
- P-13 Open Settings: `openSettings(commands)` makes the one call `workbench.action.openSettings` with
  `['@ext:GregorBiswanger.featherspec-studio']`. Manifest: the command with `icon: "$(gear)"` (a native codicon in the
  toolbar, not the webview) in `view/title` `navigation@3`; the Command Palette lists it by default.
- P-14 Manifest: `assistant` takes `type`, `default`, `enum`, `enumItemLabels`, `enumDescriptions`, `description` and
  `scope: "window"` (§6.1, §7 literally). `restrictedConfigurations` is `["featherspec-studio.assistant"]`. The top-level
  description and the `untrustedWorkspaces.description` stay as they are.
- P-15 Host smoke (CI only, in `src/test/board.smoke.test.ts`; no `copilot` in a file name):
  - The key is contributed with default `none`.
  - With `assistant` = `copilot` (Global) and no Copilot Chat in the test host, the detail carries no `send`.
  - `featherspec-studio.openSettings` resolves.
  - The real `assistantHost` lists a command the test registers, runs it with `[undefined, line]` and finds the Studio's
    own extension, but not `GitHub.copilot-chat`.
  - No foreign chat command runs.
- P-16 Test-title audit in T-007 by 0021's method (the `describe`/`it`/`test`/`suite` literals of every `.ts`/`.tsx`
  under `src`, Baseline by `git archive` against the head). Expected absent titles, each the statement of a §5 row:
  - `manifest.test.ts` "0021 AC-016: contributes the configuration FeatherSpec Studio with exactly the two settings, …"
    is retitled for three settings (0021 AC-016 row).
  - `manifest.test.ts` "AC-011 (0020): the toolbar of the view holds Open (window) and Refresh (refresh), …, and nothing
    else" is retitled with Open Settings (gear) as the third item (0020 AC-011 row).
  - Kept with changed literals: `stepTips.test.ts` "NS-5: … the two closing sentences, literally", `manifest.test.ts`
    "0018 AC-001: contributes exactly the commands …", and "AC-022: untrusted workspaces are supported in limited mode
    …".
- P-17 Docs:
  - README: a Settings table row for `featherspec-studio.assistant` and a paragraph in "The next step everywhere"
    (`Send to Copilot`, `Send to Claude Code`, `sends nothing`, `Open Settings`, Codex stays Copy prompt).
  - CHANGELOG: under `## [0.1.0] - Unreleased`.
  - Checklist: a section `## Send to the assistant (0024)` between 0023 and `## Go`, with AC-016–AC-019 and one line
    each for GitHub Copilot, Claude Code and Codex. The order test lists the section.
  - §5 notes by a throwaway script, after any 0021, 0022 or 0023 note.
- P-18 Architecture: new `src/core/assistant/`, `src/core/ports/assistant.ts`, `src/adapters/vscode/assistantHost.ts`,
  `src/shared/protocol/assistant.ts`, `assistantTexts.ts`, `src/webview/ui/SendButton.tsx` and `popup.ts`. These go
  through `/sdd-architecture-update` in T-007, with the entries named there.

## Stages

1. T-001 → T-002 → T-003 — the host side: the setting and Open Settings; the offer and its target; Send with PD-074's
   calls and the fallback to Copy prompt (no UI)
2. T-004 → T-005 → T-006 — the visible feature: the views carry the offer and follow changes; the split button and its
   feedback; menu keys, one popup, focus and the sweeps
3. T-007 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates
4. T-008 → T-009 → T-010 → T-011 → T-012 → T-013 — the fix round after the compile: Send decides by the effective value and
   stays quiet after the fallback; focus decided at the moment of the change and handed over at the place; narrow scan
   exemptions; docs level

No parallel stage:
- T-002 and T-003 share the assistant table, the port and the fake host. An earlier contract step would have to hold
  all three, and at seven medium steps that costs more than it saves.
- T-005 and T-006 share `ui/SendButton.tsx`, `main.css` (the Studio's one stylesheet, 0013) and
  `assistantTexts.ts`.

Preview harness (guideline 12, the orchestrator) runs at the end of stage 2, and the AC-016 screenshots are recorded
here.

## Steps

### T-001 — The Studio contributes the Assistant setting and Open Settings; the scans let 0024's names through

- **Covers:** AC-001, AC-013 (manifest, the call), §5 (0015 AC-021 and AC-025 exceptions, 0020 AC-011, 0021 AC-016)
- **Do:**
  - Proxies: P-12, P-13, P-14.
  - Files: `package.json` (configuration key, `restrictedConfigurations`, command, `view/title`); new
    `src/core/ports/assistant.ts` (`CommandPort` only for now); new `src/core/settings/openSettings.ts`; new
    `src/adapters/vscode/assistantHost.ts` (`execute` only); `adapters/vscode/commands.ts`
    (`OPEN_SETTINGS_COMMAND`); registration in `extension.ts`.
  - Tests, red via a `Not implemented` stub:
    - `manifest.test.ts` "0024 AC-001": key, type, default, enum, `enumItemLabels`, `enumDescriptions`,
      `description`, `scope` literally; `restrictedConfigurations` exactly; no `codex`, `chatgpt` or `openai` in any
      letter case. Negative control.
    - `manifest.test.ts` "0024 AC-013": command title and icon, `navigation@3` after Refresh. The 0021 AC-016 and
      0020 AC-011 titles are retitled (P-16), and 0018 AC-001's command list gets the new command.
    - New `src/core/settings/openSettings.test.ts` "0024 AC-013": exactly the one call, args deep-equal.
    - New `src/adapters/vscode/assistantHost.test.ts`: mocked `vscode`; `execute` passes the command and its args,
      `undefined` kept.
    - `sourceScan.test.ts` "0024 §5: 0015 AC-021 excepts 0024's names" (the mask and its negative controls).
    - `docsScan.test.ts`: `findForbidden` controls for the new `ALLOWED`.
- **Verify:** `npx vitest run --project node src/adapters/vscode src/core/settings src/adapters/node/sourceScan.test.ts src/adapters/node/docsScan.test.ts`
  red (stub, missing keys), then green; gates 1–5
- [x] **Verified (T-001):** 2026-11-18 red: `npx vitest run --project node src/adapters/vscode src/core/settings src/adapters/node/sourceScan.test.ts src/adapters/node/docsScan.test.ts` 9 failed (manifest: missing key, `restrictedConfigurations`, command, toolbar item; `openSettings` stub `Not implemented`); green after: 0 failed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 2830 passed + 3 skipped (+16 timing), `npm run compile` and `compile-tests` green.
- **Notes:** Retitled per P-16: manifest.test '0021 AC-016 … two settings' and its negative control, 'AC-011 (0020) … toolbar'; 0018 AC-001 gained the openSettings title. The scan mask (`maskAssistantNames`) lives in sourceScan.test.ts and runs before the case-insensitive offender scan only; the raw 'still needed' test is unchanged. Open Settings is wired through `createAssistantHost()` (CommandPort); the port gains its members in T-002.

### T-002 — Send is offered for a chosen, installed assistant, with the default target of the step's session

- **Covers:** AC-002 (offer), AC-004, AC-011 (no trust input)
- **Do:**
  - Proxies: P-2, P-3, P-4.
  - Files: `src/shared/protocol/assistant.ts` (ids, targets, `SendView` and its guard); `assistantTexts.ts`
    (`ASSISTANT_NAMES`); `src/core/assistant/assistants.ts` (IDs and calls); `offer.ts` (`ASSISTANT_KEY`,
    `offerOf`, `extensionPresence`); `sendView.ts` (`sendViewOf(offer, stepCase)`); `testing/fakeAssistantHost.ts`
    (records calls, scripted extensions, commands, rejections, a never-settling call). The port gains the
    `AssistantHostPort` members; `assistantHost.ts` gains `extension`, `activate`, `commands` (`getCommands(true)`) and
    `onDidChangeExtensions`.
  - Tests, red via stubs:
    - New `src/core/assistant/offer.test.ts` "0024 AC-002": the matrix of `none`, `copilot`, `claudeCode`, `codex`,
      `""`, `42` and unset × all three IDs present, none, only the other assistant's, giving the offer exactly for the
      two values with their own ID. The source re-reads on a setting change and on an extensions change. Negative
      control.
    - `sendView.test.ts` "0024 AC-004": every `StepCase` × both assistants. Copilot is `new` for NS-5 and NS-9 and
      `current` for the rest; Claude Code is `new` with targets `['new']`.
    - "0024 AC-011": the assistant core files name no trust, writer, restricted or reader (0021 AC-018's test pattern).
    - `src/shared/protocol/assistant.test.ts`: the `SendView` guard refuses an extra key, an unknown assistant, and a
      target the assistant lacks.
    - `assistantHost.test.ts`: the four methods map to the API; `extension` returns `undefined` for a missing ID.
- **Verify:** `npx vitest run --project node src/core/assistant src/shared/protocol/assistant.test.ts src/adapters/vscode/assistantHost.test.ts`
  red (stubs), then green; gates 1–5
- [x] **Verified (T-002):** 2026-11-18 red: `npx vitest run --project node src/core/assistant src/shared/protocol/assistant.test.ts src/adapters/vscode/assistantHost.test.ts` 77 failed + 5 passed (stubs `Not implemented`); green after: 82 passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 2909 passed + 3 skipped (+16 timing), compile and compile-tests green.
- **Notes:** The AC-011 file list holds assistants.ts, offer.ts, sendView.ts; send.ts did not join in T-003: it joined in T-009 (compile S82, M10). The source scan (0015 AC-021) meets the unquoted object key `copilot:`: the production keys are quoted (`'copilot':`, masked by P-12) and the two test files that name the lowercase ID or value (offer.test.ts, shared assistant.test.ts) joined REMOVED_ALLOWED, the way earlier test files did. The host adapter's `activate` rejects with `extension <id> not found` for a missing extension.

### T-003 — Send makes exactly PD-074's calls and falls back to Copy prompt

- **Covers:** AC-005 (calls, clipboard), AC-006, AC-007, AC-012
- **Do:**
  - Proxies: P-5 (request and event types, guards), P-6.
  - Files: new `src/core/assistant/send.ts` (`createSend({ host, clipboard, ui, output, clock, platform, offer })` →
    `send(request): Promise<SendResultEventPayload>`); `assistantTexts.ts` (warnings, Output lines, causes, the
    opened sentence); `messages.ts` (`sendPrompt` in `BoardRequestPayloads` and `REQUEST_GUARDS`, `sendResult`
    payload and guard); `boardRequests.ts` (handler, `onDidSendResult`).
  - Tests, red via a `Not implemented` stub:
    - New `src/core/assistant/send.test.ts`, "0024 AC-005": each row of §6.4 is checked for its exact calls in order,
      with deep-equal arguments. AC-005's Given is tested literally. The clipboard stays untouched, and the
      outcome is `opened` with §7's sentence.
    - "0024 AC-006", one case per cause × assistant: missing extension; rejecting `activate`; a missing command;
      `newChat` rejects; `open` rejects after `newChat`; `claude-vscode.editor.open` rejects; 5000 ms (fake clock).
      No call after the failure point. The clipboard holds exactly the line. One `warn` with the `Ctrl+V`/`Cmd+V`
      text for `win32`/`darwin`. One Output block whose line holds the cause and not the prompt. A result after
      5000 ms changes nothing. A failing clipboard gives the second warning and Output text.
    - Also: an offer that names the other assistant or `none` copies with no `warn` and no Output; the extension is
      already active, so `activate` is not called.
    - "0024 AC-007": every recorded command is one of the three, and every `open` carries `isPartialQuery: true`.
    - `messages.test.ts` "0024 AC-007": the guard refuses an extra key, an unknown assistant, `current` for
      `claudeCode`, and an empty line.
    - `sourceScan.test.ts` "0024 AC-007": the term list over `src` without tests and `package.json`;
      `workbench.action.chat.open` exactly once; every `workbench.action.chat.`/`claude-vscode.` string is one of the
      three. Negative control.
    - `boardRequests.test.ts`: `sendPrompt` emits `sendResult`.
    - `core/copyNextStep/noWrite.test.ts` "0024 AC-012": every Send outcome, the Copy item, Open Settings and an offer
      change leave a temp copy of `fs110-ready-synthetic` unchanged. `src/core/assistant`, `openSettings.ts` and
      `assistantHost.ts` call no configuration `update`.
- **Verify:** `npx vitest run --project node src/core/assistant src/core/board/boardRequests.test.ts src/shared/protocol/messages.test.ts src/core/copyNextStep/noWrite.test.ts src/adapters/node/sourceScan.test.ts`
  red (stub), then green; gates 1–4
- [x] **Verified (T-003):** 2026-11-18 red: `npx vitest run --project node src/core/assistant/send.test.ts` 27 failed + 1 passed (`createSend` stub `Not implemented`), then the guards, boardRequests and scan tests failed on their missing parts; green after: `npx vitest run --project node src/core src/shared/protocol src/adapters` 0 failed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 2947 passed + 3 skipped (+16 timing), `npm run compile` and `compile-tests` green (gate 5 run although the plan lists 1-4: extension.ts changed).
- **Notes:** extension.ts wiring moved from T-004 into T-003 because `createBoardRequests` now requires `send`: the offer source, `createSend` (platform from `process.platform`, `stepUi` as the warn port) and the studioPanel post of `sendResult`; T-004 passes the same offer source to the two services. `PROTOCOL_VERSION` stays 6 until T-004. Three existing `createBoardRequests` calls in noWrite.test.ts and messageRouter.test.ts / boardFilter.test.ts list the new `send` dep and request type (staying tests, behaviour unchanged). The AC-012 offer-change case moves to T-004 (the services take the source there); the no-update scan covers the six 0024 host files. Result texts: Copy outcomes are 'Copied to the clipboard.' / 'Could not copy to the clipboard.' (0021 `COPIED_TEXT`), the control's short 'Copied' is the webview's (T-005). `SendResultEventPayload.text` for `opened` is §7's sentence.

### T-004 — The detail and the first Now row carry the offer and follow it within 500 ms

- **Covers:** AC-003 (views), AC-004 (in views), AC-010 (host, within 500 ms), AC-011, AC-013 (toggletip sentences)
- **Do:**
  - Proxies: P-4, P-5 (version), P-7, P-15.
  - `detail.ts` and `rows.ts`: `send` and the closing pair. `boardService.ts` and `overviewService.ts` gain the dep
    `assistant: SettingsSource<Offer | undefined>` and recompute on its change.
  - Guards: `shared/protocol/detail.ts` (`send` optional on the lines variant) and `overview.ts` (`send` in `isRow`'s
    optional keys).
  - `nextStepTexts.ts`: `TIP_CLOSING[1]`. `envelope.ts`: version 7, plus the literals.
  - Wiring in `extension.ts`: offer source, `createSend` with `process.platform`, board requests. `studioPanel.ts`
    posts `sendResult`. The test fakes and view helpers learn `send`.
  - Tests:
    - `detail.test.ts` "0024 AC-003, AC-004": `send` on an NS-5, NS-9, NS-6-open and NS-7 memory project per
      assistant. No `send` without an offer. None for a text-only next step. `send` with tips off.
    - `rows.test.ts`: only row 0 of Now with a step carries it; Up next, Problems and later rows never.
    - `stepTips.test.ts` "0024 AC-013": the fourth paragraph is §7's settings sentence with and without an offer; the
      third is the Send sentence per assistant only with one. The NS-5 literal is updated.
    - Service tests: an offer change emits a new detail and Overview, and selection and area are kept.
    - Timing "0024 AC-010" in `boardService.timing.test.ts` and `overviewService.timing.test.ts`: a setting change
      and an extensions change reach detail and Overview within `BUDGET_MS.uiFreshness` on 200 specs.
    - "0024 AC-011": equal views from a trusted and a Restricted shell world for the same value.
    - Guard tests in `detail.test.ts` and `overview.test.ts` (protocol): a bad `send` is refused.
    - Host smoke "0024 AC-001, AC-002, AC-013" (P-15; CI only).
- **Verify:** `npx vitest run --project node src/core src/shared/protocol` and `npx vitest run --project timing-node src/core/board/boardService.timing.test.ts src/core/overview/overviewService.timing.test.ts`
  red (stub, failing literals), then green; gates 1–5; `npm run compile-tests`
- [x] **Verified (T-004):** 2026-11-18 red: `npx vitest run --project node src/core src/shared/protocol` 16 failed and `--project timing-node` (boardService + overviewService timing) 2 failed against the unchanged views (no send, old closing sentence); green after: gates eslint 0 warnings, both tsc clean, `npm run test:unit` 2969 passed + 3 skipped (+18 timing), `npm run compile` and `compile-tests` green. Host smoke (CI only) compiles.
- **Notes:** Protocol: `PROTOCOL_VERSION` 7 (the `v: 6` literals became `v: 7`, the 'another version' `v: 7` became `v: 8`). The offer reaches the services as `assistant: SettingsSource<Offer | undefined>`; the test worlds take a fourth/third argument (`createFakeOffer`, a real `createSettingsSource` over a fake setting port and the fake host, so a setting change and an extensions change take the real path). `tipClosingOf(offer)` lives in core/assistant/sendView.ts; the old NS-5 closing literal test was updated to §6.8's fourth sentence. Host smoke P-15: the 'No foreign chat command runs' line is not asserted (the chat commands are built-ins and cannot be stubbed in the host); the Send fallback test in send.test.ts decides it. The AC-012 offer-change case joined noWrite.test.ts here. Test constants renamed OFFER_A/OFFER_B so 0015 AC-021's scan stays on its list.

### T-005 — The split button sends and shows its feedback at the two places

- **Covers:** AC-003 (render), AC-005 (feedback), AC-009, AC-002 (DOM with no offer)
- **Do:**
  - Proxies: P-8, P-9.
  - New `ui/SendButton.tsx` (main part, arrow part, menu items as plain buttons with their activation; keys in T-006).
  - `detail/NextStep.tsx` and `areas/overview/SpecRow.tsx` show it in place of the primary Copy when `send` is set.
  - `client.ts` and `boardStore.ts` (`sendResult`, `sendPrompt`); `CopyButton.tsx` exports `FEEDBACK_MS`;
    `board/icons.tsx` gets the arrow glyph; `assistantTexts.ts`; `main.css`.
  - Tests in new `src/webview/ui/SendButton.test.tsx`:
    - "0024 AC-003": texts, names, tooltips, `aria-haspopup`, `aria-expanded="false"` and the menu items per assistant,
      in order.
    - "0024 AC-005": the main part and each item post one `sendPrompt` with assistant, target and line; nothing changes
      while pending. `opened` gives `Opened in <Name>`, its name, the sentence as tooltip and announcement until 2000 ms
      after the last result. `copied` and `copyFailed`, and the Copy item, give 0021's texts. An earlier result does
      not set the label (negative control). The DOM keeps its elements and order (AC-009).
  - `SpecDetail.test.tsx` and `Overview.test.tsx` "0024 AC-003, AC-002": the split button only at line 0 and row 0. A
    row 0 without a step has no Send control. Without `send`, the DOM equals the 0021 render.
  - `primaryButtons.test.tsx` "0024 AC-003": with an offer the Overview with a selected spec still has two primaries.
  - `client.test.ts`: `sendResult` is kept and dropped like `copyResult`.
  - `webviewCss.test.ts` "0024 AC-009, AC-003": main part `min-width: 22ch`, arrow ≥ 24 × 24 px, menu
    `position: absolute`, both parts with the primary variables, theme variables only. The split width fits the row
    content at `AREA_MIN` (0022 AC-028's arithmetic).
- **Verify:** `npx vitest run --project webview src/webview` and `npx vitest run --project node src/adapters/node/webviewCss.test.ts`
  red (stub), then green; gates 1–5
- [x] **Verified (T-005):** 2026-11-18 `npx eslint src --max-warnings 0`, `npx tsc --noEmit` and `-p src/webview`, `npm run test:unit`, `npm run compile`, `npm run compile-tests`: eslint, tsc (host+webview), test:unit 3002 passed, compile, compile-tests green; SendButton/client/SpecDetail/Overview/primaryButtons/webviewCss tests added; client drop-on-key-change shown red by mutation. No red run of the tests exists: the code came first (historical, noted by the compile S82; the compile's 99 killed mutants stand in for it)
- **Notes:** Proxy: SendButton and client tests were green on first run because the implementation preceded them; shown red by mutation instead. SendButton.test.tsx and SpecDetail.test.tsx joined REMOVED_ALLOWED (they name Copilot). Feedback timer runs from the result.

### T-006 — The menu follows the menu-button keys; one popup at a time; focus survives an offer change

- **Covers:** AC-008, AC-010 (webview: menu and focus), AC-003 (sweep), AC-002 (sweep)
- **Do:**
  - Proxies: P-10, P-11.
  - New `ui/popup.ts`; `Toggletip.tsx` uses it; `SendButton.tsx` keys and pointer; `NextStep.tsx` and `SpecRow.tsx`
    focus on an offer change.
  - Tests in `SendButton.test.tsx` "0024 AC-008", one test per rule of §6.3:
    - Enter, Space or ArrowDown open on the first item; ArrowUp opens on the last.
    - ArrowDown and ArrowUp wrap; Home and End go to the ends.
    - Enter, Space or a click activates and closes; Escape closes; after either, focus is on the arrow part.
    - Tab closes; a pointer press outside closes; unmount closes.
    - Escape in the side panel leaves it open, and below 900 px the detail stays shown.
    - Menu and toggletip each close the other.
    - While closed: `aria-expanded="false"` and no `role="menu"`.
  - `Toggletip.test.tsx` stays green unchanged.
  - "0024 AC-010" in `SpecDetail.test.tsx`: an offer that goes away moves focus from the main part, the arrow or an item
    to the new Copy prompt. An assistant change moves it to the arrow part and closes the menu. Focus elsewhere stays.
  - `webviewBundle.test.ts` "0024 AC-002, AC-003" over the swept fixtures, with the real core and an offer per
    assistant:
    - Send controls only at the detail's first line and the first Now row; none on the Board, other rows, the Plan map
      or empty states.
    - With no offer, the DOM equals the `none` render.
    - 0019 AC-010's 300 words also hold with Send offered.
    - Negative control.
- **Verify:** `npx vitest run --project webview src/webview` and `npx vitest run --project node src/adapters/node/webviewBundle.test.ts`
  red (stub), then green; gates 1–5
- [x] **Verified (T-006):** 2026-11-18 `npx eslint src --max-warnings 0`, `npx tsc --noEmit` and `-p src/webview`, `npm run test:unit`, `npm run compile`, `npm run compile-tests`: eslint, tsc (host+webview), test:unit 3053 passed, compile, compile-tests green; SendButton keys 'AC-008' tests (wrap and Escape/handoff mutations shown red), Close/ListOrDetail Escape, SpecDetail/Overview AC-010 focus, webviewBundle sweeps. No red run of the tests exists (historical, noted by the compile S82); negative controls were mutations (wrap, Escape, handoff). The defects found later in this mechanism (D2, D3) are closed by T-010 and T-011
- **Notes:** Proxy: one popup store ui/popup.ts shared by Toggletip and SendButton (Toggletip tests unchanged and green). Focus handoff when an offer goes away: SendButton unmount with focus inside flags a microtask-scoped handoff that the next mounted CopyButton consumes (no wrapper element, so the no-offer DOM stays the 0021 render). Assistant change handled inside SendButton (layout effect, arrow focus). A newly appearing offer takes no focus. Bundle sweep uses four fixtures for the 'shows Send' check because fs110-ready-synthetic has no Now row.

### T-007 — §5 notes, docs, test-title audit, architecture and Memory Bank sync, final gates

- **Covers:** AC-014, AC-015; AC-016–AC-019 (manual, checklist, orchestrator and Gregor); re-proves AC-001–AC-013 by
  the full gate run
- **Do:**
  - Proxies: P-16, P-17, P-18.
  - `docsScan.test.ts` new block "product docs after 0024 (AC-015)":
    - README literals, and CHANGELOG under the version in preparation.
    - The checklist section with AC-016–AC-019 and three assistant lines, each with VS Code 1.147.0 and the version of
      §6.2.
    - `Amended by 0024 (PD-068)` in 0015, 0016, 0017, 0018, 0019, 0020, 0021, 0022, 0023 and the audit specs of §5's
      last row.
    - No PD row edited.
  - Audit script (throwaway, `/tmp/audit-0024/`) against the Baseline (the commit before T-001's commit) and the head;
    `## Test-title audit` lists every absent title with its §5 row or head title.
  - `/sdd-architecture-update` with this plan's approval, exactly:
    - `AGENTS.md` `# last reconciled: … (0024)`.
    - The `modules` line `src/core/<area>` gets new "assistant 0024 — the Assistant setting's offer, the send view
      (default target from the step's session), Send with PD-074's calls and the fallback to Copy prompt" and settings
      "(+ Open Settings 0024)"; `ports/` names `CommandPort` and `AssistantHostPort`.
    - `src/adapters` gets "vscode/ (…; the assistant host 0024)".
    - `src/webview` gets "the split button Send to <Name> with its menu at the detail's first line and the first Now
      row; one popup at a time with the toggletip (`ui/SendButton.tsx`, `ui/popup.ts`; 0024)".
    - `shared` gets "assistant view, send request and result, assistant texts (0024)" and 0024 in its list.
    - `boundaries` gets a new line: "No webview message names a command; the Studio runs another extension's or the
      chat's commands only from `src/core/assistant/assistants.ts`, after the developer activated a Send, and never
      submits (0024)".
    - The three maps' lines and `last reconciled`.
  - Memory Bank: `techContext.md` one 0024 test line, `systemPatterns.md` one dated 0024 entry, and `activeContext.md`.
  - The orchestrator's AC-016 screenshots and Gregor's AC-017/AC-018 answers are recorded here when they come.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red (docs of the Baseline), then green;
  `grep -c "Amended by 0024 (PD-068)"` per spec ≥ its §5 rows; audit counts; gates 1–5 and `npm run compile-tests`
- [x] **Verified (T-007):** 2026-11-18 `docsScan.test.ts` red (14 failed against the docs of `de5a1cc`), green (147 passed); `grep -c "Amended by 0024 (PD-068)"` per spec ≥ its §5 rows (0013 1, 0015 7, 0016 2, 0017 3, 0018 4, 0019 5, 0020 4, 0021 12, 0022 11, 0023 3); audit 3 absent, 0 decreased; gates 1–5 and `compile-tests`: eslint, tsc (host + webview) clean, `npm run test:unit` 3069 passed + 3 skipped (Baseline 2816 + 3), compile and compile-tests green. `npm test` (host smoke) cannot run here.
- **Notes:** (1) §5 notes by a throwaway script (`/tmp/h/notes0024.py`): one `*Amended by 0024 (PD-068): …*` line under each named statement, after any 0021/0022/0023 note; 52 notes in 0013, 0015–0023 plus the catch-all at the head of 0015, 0018, 0019, 0021, 0022, 0023; no PD row edited. (2) `docsScan.test.ts` "product docs after 0024 (AC-015)" was red against the docs of `de5a1cc` (14 failed, scratch copy via `git archive`), green after; two existing assertions had to give way to AC-015, titles unchanged: the CHANGELOG scan ignores `featherspec-studio.assistant` (it still forbids every other `featherspec-studio.` command), and the checklist order list names the new section. The checklist says `GitHub Copilot Chat 0.75.0` (the 0015 scan allows only `GitHub Copilot`). (3) Test-title audit: see *Test-title audit* below. (4) `/sdd-architecture-update` by hand with the entries of *Do*: AGENTS.md snapshot, the three maps, `last reconciled … (0024)`; Memory Bank `techContext.md`, `systemPatterns.md`, `activeContext.md`. (5) Orchestrator's AC-016 screenshots and Gregor's AC-017/AC-018 answers are not here: manual, open.

## Fix round (after /sdd-compile of 0024, 2026-11-18)

Work order: `/home/claude/orch/compile/0024.md` (D1, D2, D3, F1, F2, F4, F6, survivors M10, M36, M37, M72, M78; M63 and M73
are noted only). Gregor's instruction: "Fix the findings of the 0024 compile: append fix steps to the 0024 plan and implement
them all." No step above is renumbered or edited except where its note says so. Decisions of 0021, 0022 and 0023 stand;
0019 AC-020 (side panel focus) and PD-077 (map focus) stand. The Studio never submits a chat message (PD-068, PD-074).

**Proxy decisions of the fix round (P-19 …).**
- P-19 (D1) `createSend` takes the effective setting value (`chosen: { read(): unknown }`, the same setting port the offer
  reads) and no longer the offer. The value that does not name the request's assistant (`none`, the other assistant, any
  other value) copies silently, as §6.4 says. A value that names it with a missing extension takes the warning path: §7
  warning once and one Output line with the cause `extension <ID> not found`. A new `core/assistant/wiring.ts` builds the
  offer source and Send from the setting port and the host; `extension.ts` and the test use the same function, so the test
  runs the production wiring (setting port + `extensionPresence(host)`).
- P-20 (F6) Closest §7 cause for an unexpected error: a rejecting `commands()` is "command <first command of the row> not
  found" (the list could not confirm the command; unchanged text, now deliberate); a synchronous throw from
  `host.extension()` is "extension <ID> not found" (the extension cannot be found). Both go through `fallback` like every
  cause: one warning, one Output block (the line and the blank separator `appendBlock` always writes), no raw message
  outside §7.
- P-21 (D2, F4) "Focus was inside the split button" is `root.contains(document.activeElement)` read at the moment of the
  change, never an event's `relatedTarget`. Where the same commit removes the focused menu item (the assistant changes from
  Copilot to Claude Code while the item `Send to the current chat` has focus), the layout effect also counts "the menu was open at the last commit and the focus is on `body` now" as inside.
- P-22 (D3, F3) The handoff is scoped to the place. A place component `StepAction` (`ui/StepAction.tsx`) renders the Send
  button or the primary Copy prompt of the detail's first line and of an Overview row, and owns a `FocusHandoff` created by
  `useFocusHandoff()` (`ui/focusHandoff.ts`). The Send button reports "I leave with focus inside" to its place; the Copy prompt
  that mounts in the same place in the same commit takes the focus; the place clears the handoff in its own layout effect
  after the children's. No module flag, no microtask. A line that changes key remounts its list item, so nothing is handed
  over and 0019 AC-020's rule decides (the heading). A row that leaves the Overview takes its place with it: no other
  spec's row gets focus; the existing Overview rule decides. The Board's cards and the map's ways are no consumers.
  This is P-11 as written.

### T-008 — Send decides the silent copy by the effective setting value; a chosen but missing extension warns

- **Covers:** AC-006, AC-005 (unchanged behaviour), D1
- **Do:**
  - Proxies: P-19.
  - Tests first, red via the current code: new `src/core/assistant/wiring.test.ts` "0024 AC-006 with the production
    wiring": value `copilot` with only Claude Code installed, and value `claudeCode` with nothing installed, give one
    warning, one Output block `Send to <Name> failed (extension <ID> not found); the prompt was copied instead.`, the
    clipboard holds the line, no call; the value `none`, the other assistant's value and an unknown value copy silently;
    uninstalling the extension after the offer was read (the 500 ms window) warns. `send.test.ts` keeps its cases with
    `chosen` in place of `offer`.
  - Code: `send.ts` (`chosen`), new `wiring.ts` (`createAssistantWiring`), `extension.ts`.
- **Verify:** `npx vitest run --project node src/core/assistant` red, then green; gates 1–5
- [x] **Verified (T-008):** 2026-11-18 red: `npx vitest run --project node src/core/assistant/wiring.test.ts` 11 failed (`createAssistantWiring` stub `Not implemented`); the compile's probe against the old code (offer read) gave the silent copy with `warned: []`. Green after: `npx vitest run --project node src/core/assistant src/adapters/node/sourceScan.test.ts` 145 passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 3080 passed + 3 skipped (+18 timing), compile and compile-tests green.
- **Notes:** `createSend` takes `chosen` (the setting port) in place of `offer`; `extension.ts` builds offer and Send with `createAssistantWiring`, so the test runs the production wiring. `clipboard` and `stepUi` are created before the services now (same objects). The staying `send.test.ts` titles are unchanged; its world feeds the chosen value.

### T-009 — Send stays quiet after the fallback; unexpected errors map to a §7 cause; send.ts joins the AC-011 scan

- **Covers:** AC-006 (M36, M37, F6), AC-011 (M10)
- **Do:**
  - Proxies: P-20.
  - Tests first, red:
    - "0024 AC-006": an activation that resolves after the 5000 ms fallback: no `commands()` result is used and no call is
      made (M36). A `commands()` that resolves after it: no call (M37). Each with a negative control (the same sequence
      before 5000 ms makes the calls).
    - A rejecting `commands()` gives the cause of P-20, a synchronous throw from `host.extension()` the cause of P-20; one
      warning, one Output block, the clipboard holds the line, for both assistants.
    - `sendView.test.ts` "0024 AC-011": `send.ts` joins the scanned files (M10), with the negative control the scan has.
  - Code: `send.ts` (the `extension()` call inside the guarded part); the scan list.
- **Verify:** `npx vitest run --project node src/core/assistant` red, then green; gates 1–4
- [x] **Verified (T-009):** 2026-11-18 red: `npx vitest run --project node src/core/assistant` 3 failed (a synchronous throw from `host.extension()` gave the raw message twice, a synchronous throw from `commands()` gave `list failed`); the late-activation, late-list and scan tests were green at once and got their negative controls; mutants against them: no `isSettled()` after the activation (M36), none after `commands()` (M37), a `restricted` name planted in `send.ts` (M10): each 1 failed (killed). Green after: 123 passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 3091 passed + 3 skipped (+18 timing), compile and compile-tests green.
- **Notes:** P-20 recorded. A rejecting `commands()` was already "command <first> not found"; now also for a synchronous throw. M63 and M73 stay noted only (equivalent or likely equivalent).

### T-010 — Focus inside the split button is decided at the moment of the change

- **Covers:** AC-010 (D2, F4)
- **Do:**
  - Proxies: P-21.
  - Tests first, red (W1, W2, W6, W7 of the compile): in `SpecDetail.test.tsx` and `Overview.test.tsx` "0024 AC-010" a
    simulated window blur (`blur` and `focusout` with `relatedTarget: null`, `activeElement` unchanged):
    - the offer goes: focus on the main part, on the arrow and on a menu item goes to the replacing Copy prompt (detail and
      first Now row);
    - the assistant changes: focus on the main part and on a menu item (also the item that leaves with the change) goes to
      the arrow part, the menu closes;
    - focus elsewhere stays (W6: a pointer press on the second line's Copy while the menu is open, then the offer goes);
    - a negative control: no window blur, same results.
  - Code: `SendButton.tsx` (`onFocus`/`onBlur` bookkeeping removed).
- **Verify:** `npx vitest run --project webview src/webview` red, then green; gates 1–4
- [x] **Verified (T-010):** 2026-11-18 red: `npx vitest run --project webview src/webview/detail/SpecDetail.test.tsx src/webview/areas/overview/Overview.test.tsx` 8 failed (window blur with the offer gone: focus on the heading or `body`; assistant change: not on the arrow part; W6: focus pulled from the second line's Copy). Green after: `--project webview src/webview` 613 passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 3101 passed + 3 skipped (+18 timing), compile and compile-tests green.
- **Notes:** The `onFocus`/`onBlur` bookkeeping is gone; `focusIsInside()` reads `root.contains(document.activeElement)`, plus the removed-item case (menu open at the last commit and focus on `body`). The handoff to the new Copy is still the module flag until T-011.

### T-011 — The focus handoff belongs to the place; the comments of popup.ts go

- **Covers:** AC-010 (D3, F3, M72, M78), 0019 AC-020 (kept), F2
- **Do:**
  - Proxies: P-22.
  - Tests first, red (W3, W4 of the compile, M72, M78): the detail's first line changes key while focus is on Send and a
    second line appears: focus on the heading, not on the new secondary Copy (W3); an Overview row that leaves Now while
    another enters Up next: focus on no other spec's row (W4); the handoff reaches only the Copy at the same place (a second
    place with a Copy that mounts in the same commit does not take it: M78); a Copy that mounts in a later, unrelated commit
    does not take it (M72); a Board card and a map way never take it; the offer goes at the same line: Copy prompt at that
    line (W1 kept).
  - Code: new `ui/StepAction.tsx`; `NextStep.tsx`, `SpecRow.tsx`, `CopyButton.tsx`, `SendButton.tsx`, `popup.ts` (the global
    flag goes; the two comments go).
- **Verify:** `npx vitest run --project webview src/webview` red, then green; gates 1–5
- [x] **Verified (T-011):** 2026-11-18 red: `npx vitest run --project webview src/webview/detail/SpecDetail.test.tsx src/webview/areas/overview/Overview.test.tsx` 2 failed (W3: a new second Copy prompt took the focus; W4: another spec's row took it). Green after: `--project webview src/webview` 620 passed. M72 and M78: the module flag is gone (no `takeFocusHandoff` or `offerFocusHandoff` left in `src`); only the `CopyButton` that `StepAction` hands its own `FocusHandoff` can take it, and the place clears it after its children, so neither mutation can be written. The tests that would have killed them (a Copy mounting in the same update at another line takes nothing; a Copy mounting later takes nothing) are in `SpecDetail.test.tsx`. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 3108 passed + 3 skipped (+18 timing), compile and compile-tests green.
- **Notes:** New `ui/StepAction.tsx` and `ui/focusHandoff.ts` (`.architecture/webview.md` updated). The two comments of `popup.ts` are removed (F2). Board cards and the map's ways pass no handoff.

### T-012 — The scan exemptions shrink to §5's own names

- **Covers:** §5 (0015 AC-021, AC-025), F1
- **Do:**
  - Tests first: `sourceScan.test.ts` "0024 §5": none of `offer.test.ts`, `send.test.ts`, `SendButton.test.tsx`,
    `SpecDetail.test.tsx`, `shared/protocol/assistant.test.ts` is in `REMOVED_ALLOWED`, and a removed term that is not a
    0024 name (`orchestrator`, `agentprovider`) stays found in each of them (red while the whole-file entries stand).
  - Code: the constants in the five files are renamed (`OFFER_A` and `OFFER_B` as T-004 did); the entries go.
- **Verify:** `npx vitest run --project node src/adapters/node/sourceScan.test.ts` red, then green; gates 1–4
- [x] **Verified (T-012):** 2026-11-18 red: `npx vitest run --project node src/adapters/node/sourceScan.test.ts` 1 failed (the five files were still in `REMOVED_ALLOWED`); after removing the entries 2 failed (the constants `COPILOT`, `SEND_COPILOT`, `COPILOT_VIEW`, the unquoted keys `copilot:` and lower-case literals); green after the renames: `npx vitest run --project node src/adapters/node/sourceScan.test.ts src/core/assistant src/shared/protocol` 306 passed. Gates: eslint 0 warnings, both tsc clean, `npm run test:unit` 3110 passed + 3 skipped (+18 timing), compile and compile-tests green.
- **Notes:** The five whole-file entries are gone; every other removed term stays forbidden in those files (the negative control plants each one). Constants are `EXTENSION_A`/`EXTENSION_B`, `VIEW_A`, `SEND_A`, `OPENED_A`; keys are quoted (`'copilot':`), which the mask covers. Only test titles that 0024 itself added changed.

### T-013 — Plan, Memory Bank, README, project brief and the release checklist agree with the code

- **Covers:** AC-014 (record), AC-015, AC-016 (harness record), AC-017 (OP-004 asked of Gregor), compile edits 1–4
- **Do:**
  - `docsScan.test.ts` first, red: README *Privacy* names Send; the checklist's AC-017 asks to record whether an unsent
    draft in Copilot's current chat is kept or replaced and to decide NS-6's default if it is replaced.
  - Plan: Status, Current step, AC-016 harness evidence, Windows evidence, T-005/T-006 notes, the T-002 note, "52 notes",
    traceability, handoff. `activeContext.md` (*Validation*, about 6 *Changed Recently* bullets), README *Privacy*,
    `projectbrief.md`.
  - F7 (OP-004) is Gregor's: the NS-6 default for Copilot is not changed.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green; final gates
- [x] **Verified (T-013):** 2026-11-18 red: `npx vitest run --project node src/adapters/node/docsScan.test.ts` 3 failed (README Privacy still said "only when you paste it", the checklist's AC-017 did not ask for the NS-6 default, the project brief did not know Send); green after: 150 passed. Gates (final): eslint 0 warnings, both tsc clean, `npm run test:unit` 3113 passed + 3 skipped (+18 timing), `npm run compile`, `npm run compile-tests` green; `git status` clean.
- **Notes:** F7 (OP-004) stays Gregor's: the NS-6 default for Copilot is unchanged, the checklist asks him to record the draft behaviour and decide. The plan's Status is Done (all steps ticked); the spec stays In Progress in `active/` and is not moved. The AC-016 harness note is recorded in *AC-016 harness evidence*.

## Fix round 2 (after the final check of round 2, 2026-11-19)

Work order: `/home/claude/orch/compile/final-check-r2.md`, findings 1–9 (docs only). Gregor's instruction: "Fix the
documentation findings of the round-2 final check before the PR: append them as fix steps T-014 onward to the 0024 plan
(it is the round's last spec) and do them all." No step above is renumbered or edited except where its note says so.
Finding 10 (the wording "same chat" and "current chat") and OP-004 are Gregor's and are not touched. No product code
changes; where a docs scan decides a change, the scan is written first and shown red against the old docs on a scratch
copy (`git archive` of the head into `/tmp`).

### T-014 — The README screenshots show the UI of 5c70dbd; a fourth shows the Plan map

- **Covers:** final check finding 1
- **Do:**
  - Replace `media/screenshots/overview-dark.png`, `board-dark.png` and `spec-detail-light.png` with the shots of the
    preview harness at 5c70dbd (1400×900, real core); add `plan-map-dark.png` (a copy of the fixture
    `fs110-parallel-synthetic`, stage 2 parallel with its ways). Reference it in the README's Plan map part; each alt
    text says what its image shows. `.vscodeignore` keeps `media/screenshots/**` as before.
  - `docsScan.test.ts` first: the README links the four shots, each exists, each has an alt text of its own content,
    `.vscodeignore` still holds `media/screenshots/**`.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [x] **Verified (T-014):** 2026-11-19 red: the new `docsScan.test.ts` against a `git archive` of 5c70dbd in `/tmp` 2 failed (the alt texts of the three old links, no `plan-map-dark.png` in the Plan map part); green after: `npx vitest run --project node src/adapters/node/docsScan.test.ts` 153 passed. The four shots are 1400×900 PNGs from `/home/claude/orch/preview/readme2/` (preview harness, real core at 5c70dbd; the Plan map from a copy of `fs110-parallel-synthetic`); `.vscodeignore` is unchanged and still holds `media/screenshots/**` (the README links the images in the repository; the VSIX ships none). Doc-only: no code gates.
- **Notes:** the README's three alt texts now say what each image shows (Overview: Now with the primary Copy prompt, coach line, Up next, figures; Board: six columns, Review open, icon Copy prompt; detail: light Board with the side panel). 0013 AC-017 (taste of the shots) stays Gregor's.

### T-015 — `activeContext.md` is a short dashboard again

- **Covers:** final check finding 2 (`AGENTS.md`: max 1–2 screen pages, about 60 lines, in content too)
- **Do:**
  - Rewrite to about 6 KB or less: *Now* in 3–5 lines (round 2, 0021–0024 implemented and fixed, waiting for CI at the
    PR, Gregor's checklist and the fresh compiles), one line per active spec, the last three *Changed Recently* entries
    one line each, *Validation* as one short pointer to the plans, *Next* renumbered. Every heading and metadata line of
    `.claude/rules/memory-bank.md` stays.
  - `docsScan.test.ts` first: the file is at most 7000 bytes and 60 lines, holds the three metadata lines and the seven
    headings, *Now* is at most five lines, *Changed Recently* has at most three bullets, *Next* starts at 1.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-015):**

### T-016 — The CHANGELOG's 0.1.0 entry agrees with itself and the product

- **Covers:** final check finding 3
- **Do:** the tree action is **Copy Next Step**; the toolbar has Open, Refresh and the gear; one name for the copy
  control, **Copy prompt**; three settings (the Send bullet folded into the settings bullet); Problems are sentences; the
  palette list is complete (Open Plan Map, Copy Next Step, Open Settings). `docsScan.test.ts` first.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-016):**

### T-017 — The README no longer contradicts itself

- **Covers:** final check finding 4
- **Do:** "The toolbar has **Open**, **Refresh** and the gear (**Open Settings**)"; the new-chat default reads
  "(verifying a result and challenging a spec)". `docsScan.test.ts` first.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-017):**

### T-018 — The checklist keeps Gregor's real window at 0021 AC-022

- **Covers:** final check finding 5
- **Do:** the 0021 AC-022 line says "then Gregor in a real window". `docsScan.test.ts` first.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-018):**

### T-019 — §5 lists 0019 AC-020; P-22 names `focusHandoff.ts`

- **Covers:** final check finding 6
- **Do:** a §5 row "0019 AC-020 — an offer change hands focus to the replacing Copy prompt (0024 AC-010)" and an
  `*Amended by 0024 (PD-068): …*` note under 0019 AC-020; P-22 says `useFocusHandoff()` lives in `ui/focusHandoff.ts`.
  `docsScan.test.ts` first (the 0019 count of 0024 notes rises from 5 to 6).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-019):**

### T-020 — The 0021 test-title audit homes the `docsScan.test.ts` rename of 463899b

- **Covers:** final check finding 7
- **Do:** one row in the 0021 plan's `## Test-title audit`. `docsScan.test.ts` first.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-020):**

### T-021 — The harness rechecks and the Windows runs are recorded in the plans

- **Covers:** final check finding 8 (the evidence that exists; CI and the fresh compiles stay open)
- **Do:** 0023 plan: harness recheck at d756fa9 (60 views incl. `par-odd`, all pass), Windows at d756fa9 (unit 2812
  passed, 7 skipped, +16 timing; `npm test` 31+1+1+1). 0024 plan: harness recheck at 5c70dbd (60/60), Windows at
  5c70dbd (unit 3109 passed, 7 skipped, +18 timing; `npm test` 32+1+1+1). `docsScan.test.ts` first.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green
- [ ] **Verified (T-021):**

### T-022 — The `AGENTS.md` snapshot names modules and points to the maps

- **Covers:** final check finding 9
- **Do:** the module lines of `src/core`, `src/webview` (and the shared line) shrink to module names and the pointer to
  `.architecture/{core,webview}.md`, which hold the details; no module and no boundary is dropped.
  `docsScan.test.ts` first: every module the snapshot named still appears in a snapshot line or its map, the lines are
  at most 600 characters, `AGENTS.md` is smaller.
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts` red, then green; final gates
- [ ] **Verified (T-022):**

## Test-title audit

Method (0021's): the string literals of `describe`, `it`, `test` and `suite` (with `.each`, `.skip`, `.only`) in every
`.ts` and `.tsx` under `src`, Baseline `d756fa9` by `git archive` against the head of T-007; titles compared as a
multiset (`/tmp/audit-0024/titles.py`, throwaway). Result: Baseline 2867 titles, head 3063, **3 absent**, 0 decreased
by count. Each absent title is a statement §5 replaces; all three are retitled in place in
`src/adapters/vscode/manifest.test.ts`, their bodies extended.

| Absent at the head | Statement replaced (§5) | Head title |
| --- | --- | --- |
| "0021 AC-016: contributes the configuration FeatherSpec Studio with exactly the two settings, their types, defaults, properties and descriptions" | 0015 AC-015 (as 0021 amended), 0021 AC-016 "exactly the keys of §6.7" | "0021 AC-016, amended by 0024 (PD-068): contributes the configuration FeatherSpec Studio with exactly the three settings, their types, defaults, properties and descriptions" |
| "0021 AC-016: negative control, a third key, a Markdown description or a scope would be found" | the same | "0021 AC-016, amended by 0024: negative control, a fourth key, a Markdown description or a scope on another key would be found" |
| "AC-011 (0020): the toolbar of the view holds Open (window) and Refresh (refresh), in this order, in the group navigation, and nothing else" | 0020 §4.3 *Toolbar*, AC-011 | "AC-011 (0020), amended by 0024 (PD-068): the toolbar of the view holds Open (window), Refresh (refresh) and Open Settings (gear), in this order, in the group navigation, and nothing else" |

The `stepTips` NS-5 closing test and 0018 AC-001 keep their titles (their bodies follow §6.8's fourth sentence).

## AC-016 harness evidence

`manual: orchestrator (Gregor's delegate) 2026-11-18, harness r5check at 7c6d975` — PASS, 60 views, 180 shots in
`/home/claude/orch/preview/r5-0024/`. Gregor's real-window part of AC-016 stays open. The fix round after this evidence
(T-008…T-013) changed focus handling and Send's silent copy only; no CSS and no layout, so the harness result for the
split button's look stands, and Gregor's real window decides.

Windows at 7c6d975: unit 3065 passed, 7 skipped, +18 timing; `npm test` 32+1+1+1.

#### 0024 preview check (orchestrator, Gregor's delegate) — AC-016 at 7c6d975, 2026-11-18

Harness /home/claude/orch/preview (real core at 7c6d975; the assistant offer from the repo's own `createFakeOffer`
with the extension installed; Send answered `opened` by the harness, nothing executed), script r5check.mts, shots +
report.json in /home/claude/orch/preview/r5-0024/ (180 shots). Cases: this repository with 0021 selected (Review, NS-5:
default target new chat) and the fs170 copy with 0006 Active, T-003 open (NS-6: Copilot default current chat, Claude
Code new chat); assistant Copilot and Claude Code; Dark, Light, High Contrast; window 1600 and 1000 px with the side
panel at its default (640/400) and at G-2's minimum (320), and a Studio panel of 800 px (detail alone). Per view: the
first Now row's split button with its menu open (Enter on the arrow), the detail's split button closed and open, a
keyboard walk onto both parts, Escape.

##### AC-016 — PASS (delegate), 60 views
- No text of the split button cut (`Send to Copilot` / `Send to Claude Code`, 195 px, never clipped by its scroller),
  at 320 px side panel too.
- The open menu shows fully inside the Studio panel without scrolling, no item cut: Copilot `Send to a new chat`,
  `Send to the current chat`, `Copy prompt`; Claude Code `Send to a new chat`, `Copy prompt`. Escape closes it, the
  detail stays open, focus on the arrow part.
- Both parts show a visible focus outline on keyboard focus (`:focus-visible`, solid) in all three themes.
- Primary controls: per view at most two split buttons (the first Now row's and the detail's first line); each split
  button is one primary control with two filled parts. Second lines stay secondary `Copy prompt`.
- The page never scrolls.

##### Observations for Gregor (not fails)
- With Copilot, NS-6's main part targets the **current chat** (its session is "same chat or new chat"). By the V-2
  source reading (OP-004) Copilot's `open` probably replaces an unsent draft there. AC-017 must record it; if the draft
  is lost, deciding whether the current chat stays the default for NS-6 is Gregor's.
- The open menu overlays the line below it (the coach line / the second line), as a menu does.

##### Open
- AC-017 (per assistant, versions), AC-018 (Settings UI, Restricted Mode), AC-019 build part: Gregor.
- CI at the PR. Windows at 7c6d975: unit 3065 passed, 7 skipped, +18 timing; npm test 32+1+1+1 (green, incl. the 0024 board smoke).

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `package.json`, `src/adapters/vscode/manifest.test.ts` | `manifest.test.ts` (0024 AC-001), `restricted.test.ts`, `sourceScan.test.ts` | verified |
| AC-002 | T-002, T-005, T-006 | `src/core/assistant/offer.ts`, `sendView.ts`, `SendButton.tsx` | `offer.test.ts`, `sendView.test.ts`, `SendButton.test.tsx`, `SpecDetail.test.tsx`, `webviewBundle.test.ts` sweeps | verified |
| AC-003 | T-004, T-005, T-006 | `src/core/board/detail.ts`, `src/core/overview/rows.ts`, `SendButton.tsx`, `NextStep.tsx`, `SpecRow.tsx` | `detail.test.ts`, `rows.test.ts`, `SpecDetail.test.tsx`, `Overview.test.tsx`, `primaryButtons.test.tsx`, `webviewBundle.test.ts` | verified |
| AC-004 | T-002, T-004 | `src/core/assistant/offer.ts`, `sendView.ts`, `shared/protocol/assistantTexts.ts` | `offer.test.ts`, `sendView.test.ts`, `detail.test.ts`, `stepTips.test.ts` | verified |
| AC-005 | T-003, T-005 | `src/core/assistant/send.ts`, `assistants.ts`, `SendButton.tsx` | `send.test.ts`, `SendButton.test.tsx`, `SpecDetail.test.tsx` | verified |
| AC-006 | T-003, T-008, T-009 | `src/core/assistant/send.ts`, `wiring.ts` | `send.test.ts` (PD-074's exact calls, timeout, fallback, late results, causes), `wiring.test.ts` (production wiring) | verified |
| AC-007 | T-003 | `src/core/assistant/assistants.ts`, `send.ts` | `send.test.ts`, `sourceScan.test.ts` (AC-007 scan), `assistant.test.ts` | verified |
| AC-008 | T-006 | `src/webview/ui/SendButton.tsx`, `popup.ts`, `Toggletip.tsx` | `SendButton.test.tsx` (0024 AC-008), `Close.test.tsx`, `ListOrDetail.test.tsx`, `Toggletip.test.tsx` unchanged | verified |
| AC-009 | T-005 | `src/webview/main.css`, `SendButton.tsx` | `webviewCss.test.ts` (0024 AC-009, AC-003) | verified; AC-016 manual |
| AC-010 | T-004, T-006, T-010, T-011 | `src/core/board/boardService.ts`, `overviewService.ts`, `SendButton.tsx`, `CopyButton.tsx`, `StepAction.tsx`, `focusHandoff.ts`, `popup.ts` | `boardService.test.ts`, `overviewService.test.ts`, both timing tests, `SpecDetail.test.tsx`, `Overview.test.tsx` | verified |
| AC-011 | T-002, T-004, T-009 | `src/core/assistant/sendView.ts`, `src/shared/protocol/*` | `sendView.test.ts` (scan incl. `send.ts`), `assistant.test.ts`, `detail.test.ts`, `overview.test.ts` | verified |
| AC-012 | T-003 | `src/core/board/boardRequests.ts`, `send.ts` | `noWrite.test.ts`, `boardRequests.test.ts`, `messageRouter.test.ts` | verified |
| AC-013 | T-001, T-004 | `package.json`, `src/core/settings/openSettings.ts`, `shared/protocol/nextStepTexts.ts` | `manifest.test.ts`, `openSettings.test.ts`, `stepTips.test.ts`, `board.smoke.test.ts` (CI) | verified; host smoke on CI |
| AC-014 | T-007 | this plan, *Test-title audit*; `/tmp/audit-0024/titles.py` (throwaway) | the audit: 3 absent titles, each listed; `npm run test:unit` 3069 passed; Windows 11 at `7c6d975`: unit 3065 passed, 7 skipped, +18 timing, `npm test` 32+1+1+1 (green, incl. the 0024 board smoke); CI at the PR | open: unit, audit and Windows verified; CI open (the fix round T-008…T-013 changed code after `7c6d975`, so Windows and CI run again at the fix head) |
| AC-015 | T-007 | `README.md`, `CHANGELOG.md`, `docs/release-checklist.md`, §5 notes in 0013, 0015–0023 | `docsScan.test.ts` (product docs after 0024) | verified |
| AC-016 | T-007 | — | manual: orchestrator (Gregor's delegate) 2026-11-18, harness r5check at 7c6d975 — PASS, see *AC-016 harness evidence*; Gregor's real window | open: harness part recorded, Gregor's real-window part open |
| AC-017 | T-007 | — | manual: Gregor per assistant on `tip-splitter`; with Copilot he records whether an unsent draft in the current chat is kept or replaced (OP-004) and decides NS-6's default if it is replaced | open |
| AC-018 | T-007 | — | manual: Gregor, Settings UI and Restricted Mode | open |
| AC-019 | T-007 | — | manual: draft part passed (PD-076, *Research*); build part in AC-017 | open |

## Session handoff

- **Done so far:** T-001…T-007 verified 2026-11-18 (f50bc4c, f0b011d, abf1925, 42e9cda, d683b82, de5a1cc, 7c6d975); the fix round after the compile S82, T-008…T-013, verified 2026-11-18 (D1 Send by the effective value, D2 focus decided at the moment of the change, D3 the handoff scoped to the place, F1 narrow scan exemptions, F2 comments, F4, F6 causes, M10, M36, M37, M72, M78 closed; M63 and M73 noted only). Plan Done; the spec stays In Progress in `active/`.
- **Next action:** `npm test` on Windows and CI at the fix head (AC-014); Gregor's AC-016 real window, AC-017 per assistant (with OP-004), AC-018, AC-019 build part; then a fresh `/sdd-compile 0024`.
- **Open decisions:** OP-004 / F7 (Gregor's, AC-017): does Copilot's `open` replace an unsent draft in the current chat? If it does, Gregor decides whether the current chat stays NS-6's default target with Copilot; the default is not changed. OP-002 and OP-003 are not blocking.
- **Baseline:** d756fa9 (head before the first step commit; started 2026-11-18 on Gregor's delegated start signal); compile S82 at 7c6d975.
- **Environment:** `npm test` cannot run here (VS Code download blocked); host smoke runs on CI and Windows
