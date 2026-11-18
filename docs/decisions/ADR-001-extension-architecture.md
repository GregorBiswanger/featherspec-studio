# ADR-001: Extension and Webview Architecture (SPIKE-003)

- Status: Proposed (awaiting PO/Tech-Lead review); Date: 2026-11-16
- Scope: VS Code Desktop extension skeleton (`yo code` scaffold, TypeScript, esbuild, `engines.vscode ^1.146.0`)
- Related: po-handoff sections 2, 3, 4, 8, 12 (SPIKE-003), 13, 14; ADR-002 (runtime storage); SPIKE-001 (format audit), SPIKE-002 (agent SDK)

## Decision

1. **Hexagonal layering, enforced by tooling.**
   - `src/core/`: domain and application logic (parser mapping, lifecycle, readiness, run lifecycle, event normalisation). Pure TypeScript with no `vscode` import, behind ports: `SpecSourcePort`, `FileWatchPort`, `RuntimeStorePort`, `AgentProviderPort`, `ClockPort`, `IdPort`. It runs in plain Node.
   - `src/adapters/vscode/`: a thin layer for activation, commands, the webview host, watchers, `storageUri` and Workspace Trust.
   - `src/adapters/providers/`: `fake` (deterministic, scripted event streams) plus the first real provider from SPIKE-002.
   - `src/shared/protocol/`: message types shared by host and webview.
   - `src/webview/`: the React UI.
   - An ESLint `no-restricted-imports` rule bans `vscode` in `core/` and `shared/`, and bans `node:*` in `webview/`. Each layer gets its own tsconfig (core: no DOM, no vscode types; webview: DOM).
2. **UI surface.** One singleton `WebviewPanel` in the editor area ("FeatherSpec Studio") hosts Mission Control, Spec Board, Spec Detail and Agent Center through in-app routing. The entry point is an Activity Bar view container holding one **native TreeView**: a navigation shortcut plus a compact status of specs and runs, and a `viewsWelcome` message when no FeatherSpec project is found. There is no sidebar `WebviewView` in the MVP; it can be reconsidered for a live Agent Center view after the MVP.
   *Amended by 0020 (PD-058): §2 — superseded in part by 0020 (PD-058): the TreeView is the status surface (spec rows in four groups with next step and badge); the panel hosts Overview and Board with the detail as a side panel.*
3. **Webview UI: React 19 (19.3.1).**
   - Plain semantic HTML styled only with `--vscode-*` CSS variables, plus the body classes `vscode-light`, `vscode-dark` and `vscode-high-contrast`.
   - `@vscode-elements/elements` 2.5.1 (Lit web components) only for complex controls such as tabs, tree and collapsible, consumed directly because React 19 supports custom elements.
   - `@vscode/codicons` for icons.
   - No `@vscode/webview-ui-toolkit` (deprecated).
4. **Webview security.**
   - CSP `default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-<random>'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}`.
   - No inline scripts and no remote origins.
   - `localResourceRoots: [extensionUri/dist/webview]` only. The webview never gets workspace roots, and every asset goes through `asWebviewUri`.
   - `enableScripts: true`, `enableCommandUris: false`.
5. **Two esbuild targets in the existing `esbuild.js`.**
   - (a) Extension: `platform: 'node'`, `format: 'cjs'`, `external: ['vscode']`, output `dist/extension.js` (unchanged).
   - (b) Webview: `platform: 'browser'`, output `dist/webview/main.js` plus `main.css`, built as a second `esbuild.context` in the same script and the same watch loop.
   - No native modules and no runtime npm dependencies in the host bundle, so we ship one universal VSIX.
6. **Typed, versioned message protocol** (`src/shared/protocol`).
   - Envelope: `{ v: 1, kind: 'req' | 'res' | 'evt', id?, type, payload }`. Requests carry a correlation `id` and get exactly one `res` (`ok` or a typed `error`) with a client-side timeout.
   - Host push events carry a monotonically increasing `seq`.
   - When the webview (re)loads it sends `hello { v, lastSeq }`. The host answers with a full `snapshot`, then sends incremental `evt` messages. A gap in `seq` makes the webview request a new snapshot.
   - Payloads are validated at both boundaries with valibot 1.5.0 (small) or hand-written guards. A version mismatch shows an honest "reload" state (P8).
7. **State restore.**
   - Webview: only UI state (route, filters, selection, scroll) goes through `getState`/`setState`.
   - Host: `registerWebviewPanelSerializer` plus the `onWebviewPanel:featherspecStudio.main` activation event restore the panel after a restart.
   - Domain state is always rebuilt by the host from the markdown files and the ADR-002 store, never from the webview.
   - **No `retainContextWhenHidden`.**
8. **Activation.** `workspaceContains:.specs/README.md` and `workspaceContains:.memory-bank/projectbrief.md` (the final markers depend on SPIKE-001), `onWebviewPanel:…`, and implicit activation from contributed views and commands. No `*` and no `onStartupFinished`. `activate()` only registers things; parsing and provider loading are lazy.
9. **File watching.**
   - One watcher per FeatherSpec workspace folder: `createFileSystemWatcher(new RelativePattern(folder, '.specs/**/*.md'))`.
   - Events are debounced and coalesced (about 200 ms), and only the affected file is re-parsed.
   - A delete event triggers a rescan of that subtree.
   - A manual "Rescan" command and a full rescan on `onDidChangeWorkspaceFolders` act as a safety net.
10. **Multi-root.** A Project is a workspace folder that contains FeatherSpec markers. The MVP shows one active project with a project picker, and all IDs are scoped by project.
11. **Board drag and drop.**
    - *Amended by 0017 (PD-060/PD-061): superseded by 0017 (PD-060): no drag, no Move to…, no move command. The card shows the next step with a Copy button; the bullets below are history.*
    - `@dnd-kit/react` 0.5.3 (React 19 peer, keyboard sensor, live-region announcements). The fallback is native HTML5 DnD with our own announcements.
    - A mandatory non-drag alternative on every card: a "Move to…" menu, also available as the command `FeatherSpec: Move Spec to…` (WCAG 2.2 SC 2.5.7, NFR "board actions by keyboard").
    - Amendment 2026-11-16 (spec 0007 plan): drag and drop is native HTML5, not `@dnd-kit/react`; no dependency is added, announcements and keyboard handling are our own, and the "Move to…" menu and command stay the non-drag alternative.
    - Ready→Active never starts an agent silently. It always shows a readiness and permission confirmation, whatever the input method (po-handoff 6.5).
12. **Tests.**
    - **Vitest 5.1.0** for `core/` (plain Node, fake provider, fixture projects) and `webview/` (jsdom 31 plus `@testing-library/react` 16.3.3, with `acquireVsCodeApi` mocked).
    - **Mocha via `@vscode/test-cli` 0.0.15** (already scaffolded) only for extension-host integration tests: activation, watcher, storage, protocol round-trip through a test-only host hook, and recovery.
    - CI runs on a GitHub Actions matrix of {ubuntu, windows, macos}, using `xvfb-run -a npm test` on Linux.
    - Optional later: full UI E2E with `vscode-extension-tester` 8.28.1.
13. **Packaging.**
    - `@vscode/vsce` 4.1.1 (Node ≥ 22).
    - Before the first `vsce package`, add `publisher`, `icon` (PNG ≥ 128×128, not SVG), `repository`, `license` and `categories`. README images must use https. LICENSE already exists.
    - Publish through Trusted Publishing or Entra ID, because global Azure DevOps PATs retire on 2026-12-01.
14. **Trust and remote.**
    - Note: superseded in part by 0015 (PD-055): there is no agent start and no provider setup to hide any more; the agent provider port, the orchestrator and the Agent Center no longer exist. The rest of this item and of this ADR stands.
    - `capabilities.untrustedWorkspaces: { supported: 'limited' }`. In Restricted Mode the read-only views work, while agent start and provider setup are hidden (`isWorkspaceTrusted`) **and** guarded in code.
    - `capabilities.virtualWorkspaces: false`.
    - `extensionKind: ["workspace"]`, so the extension runs where the files and agent processes live (Remote, WSL, Dev Containers). There is no localhost server: everything goes through `postMessage`.

## Options considered

| Topic | Option | Trade-off |
|---|---|---|
| Surface | WebviewView only (sidebar) | Too narrow for a kanban board; UX guide says "limit the use of custom Webview Views". |
| Surface | WebviewPanel only, no Activity Bar entry | Not discoverable; product wants a visible entry point. |
| Surface | **Panel + native TreeView entry (chosen)** | Native tree is accessible, themed, cheap; the panel gets full editor width. |
| Surface | Multiple panels (one per area) | More serializers, state sync, memory; no MVP benefit. |
| UI lib | **React 19** | Handoff default; large ecosystem; React 19 custom-element support removes the need for wrappers. Bundle about 60 kB gz (not measured here). |
| UI lib | Preact 11.2.0 | Smaller; compat layer adds friction with dnd-kit and testing-library. A post-MVP option if size matters. |
| UI lib | Lit / vscode-elements only | Native look; weaker ecosystem for board/DnD/state. |
| Components | `@vscode/webview-ui-toolkit` | Deprecated (npm flag; repo archived 2025-01-01). Rejected. |
| Components | `@vscode-elements/elements` | Community-maintained, used by Microsoft's vscode-java-pack since May 2026. Last release 2026-02-21, so a bus-factor risk. Kept behind our own thin wrappers. |
| Components | TypeFox Baukasten (React, announced 2026-07-01) | Too new to judge; re-evaluate post-MVP. |
| State | `retainContextWhenHidden` | Simplest code but "high memory overhead" per API docs, and hidden webviews still cannot receive messages. Rejected. |
| Unit runner | Mocha for everything | One runner, already present; but no DOM environment or watch ergonomics for React tests; needs ts-node or a compile step. |
| Unit runner | `node:test` | Zero dependencies; no jsdom integration or component-test ecosystem. |
| Unit runner | **Vitest (chosen) + Mocha only in host** | Two runners, but the CLI "exclusively uses Mocha", so Mocha stays regardless; Vitest gives TypeScript natively and DOM tests. |
| Activation | `onStartupFinished` / `*` | Activates in every workspace, contrary to the UX guide "activate only when contextually appropriate". |
| DnD | `@dnd-kit/core` 6.3.1 | Mature API with documented keyboard and screen-reader support, but last release 2024-12-05; the docs are now labelled "Legacy". |

## Consequences

- Positive: the core is testable in milliseconds without VS Code. The fake provider drives the full MVP workflow (NFR 14 E2E). No native code means one VSIX that works in Remote and Containers.
- The webview cannot touch files or Node; every capability is an explicit protocol request (handoff 8.2).
- Cost: two bundles, three tsconfigs, two test runners, and the protocol has to be versioned and validated. Hand-written guards need discipline; valibot adds about 1 dependency.
- `engines ^1.146.0` (VS Code 1.146 released 2026-11-11) excludes every user not on the very latest version. **Action:** lower it to the oldest version whose APIs we actually use, and keep `@types/vscode` in step. Decide this in the skeleton.
- The watcher depends on `files.watcherExclude` and folds events (for example, a folder delete reports one event). That is why rescan exists. Path casing may differ on Windows and macOS, so path comparison is case-insensitive there.
- Open risks: vscode-elements maintenance; `@dnd-kit/react` is still 0.x; marker files are not final until SPIKE-001; React bundle size is not measured yet; the Agent SDK's runtime needs (SPIKE-002) may force process spawning, which interacts with Workspace Trust and Remote.
- Skeleton acceptance: the panel opens from the tree and from a command and survives a reload through the serializer. The theme switches live. The protocol round-trip runs in an integration test. The core tests run with `npx vitest run` without VS Code. `vsce ls` shows no `src/`, `.specs/` or `node_modules`.

## Sources (all retrieved 2026-11-16)

- Webview API guide (state, serializer, CSP, `localResourceRoots`, theming, `vscode-using-screen-reader`): https://code.visualstudio.com/api/extension-guides/webview
- `@types/vscode` 1.146.0 `index.d.ts` (retainContextWhenHidden: "high memory overhead", "cannot send messages to a hidden webview"; WebviewViewResolveContext; `createFileSystemWatcher` notes on recursion, `files.watcherExclude`, folded delete events, casing), via `npm view @types/vscode` and the local node_modules copy
- Official sample with nonce CSP and `localResourceRoots`: https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/src/extension.ts ; sample index: https://github.com/microsoft/vscode-extension-samples
- Activation events: https://code.visualstudio.com/api/references/activation-events
- UX guidelines, webviews ("only use webviews when absolutely necessary", accessibility): https://code.visualstudio.com/api/ux-guidelines/webviews ; views and welcome views: https://code.visualstudio.com/api/ux-guidelines/views
- Contribution points (view container icons): https://code.visualstudio.com/api/references/contribution-points
- Webview UI Toolkit deprecation: https://github.com/microsoft/vscode-webview-ui-toolkit/issues/561 ; npm `@vscode/webview-ui-toolkit` 1.4.0 deprecated flag (`npm view`)
- vscode-java-pack PR #1616 (toolkit to vscode-elements and React 19, merged 2026-05-11): https://github.com/microsoft/vscode-java-pack/pull/1616
- vscode-elements: https://github.com/vscode-elements/elements ; npm 2.5.1 (published 2026-02-21)
- TypeFox Baukasten announcement: https://www.typefox.io/blog/baukasten-announcement/
- React 19 custom elements: https://react.dev/blog/2024/12/05/react-19 ; npm react 19.3.1 (published 2026-10-14)
- esbuild API (platform and format defaults, contexts): https://esbuild.github.io/api/ ; bundling guide: https://code.visualstudio.com/api/working-with-extensions/bundling-extension
- Testing extensions ("The CLI exclusively uses Mocha"): https://code.visualstudio.com/api/working-with-extensions/testing-extension ; CI and xvfb: https://code.visualstudio.com/api/working-with-extensions/continuous-integration
- Publishing (icon, README https, PAT retirement 2026-12-01, `--target`): https://code.visualstudio.com/api/working-with-extensions/publishing-extension ; manifest: https://code.visualstudio.com/api/references/extension-manifest
- Workspace Trust: https://code.visualstudio.com/api/extension-guides/workspace-trust ; Remote extensions: https://code.visualstudio.com/api/advanced-topics/remote-extensions
- dnd-kit accessibility (legacy docs): https://dndkit.com/legacy/guides/accessibility/ ; WCAG 2.2 SC 2.5.7: https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- VS Code 1.146 release notes (released 2026-11-11; no extension-API changes relevant here): https://code.visualstudio.com/updates
- npm registry (`npm view`, run in /tmp): vitest 5.1.0, mocha 12.0.3, @vscode/test-cli 0.0.15 (depends on mocha ^11.7.6), @vscode/test-electron 3.1.0, @vscode/vsce 4.1.1, @dnd-kit/react 0.5.3, @dnd-kit/core 6.3.1, @testing-library/react 16.3.3, jsdom 31.0.1, valibot 1.5.0, vscode-extension-tester 8.28.1, @vscode/codicons 0.0.46-24, preact 11.2.0

Gaps: there is no official Microsoft replacement for the toolkit (only community libraries). The webview guide does not mention nonces; that guidance comes from the official sample. The React bundle size is not measured.
