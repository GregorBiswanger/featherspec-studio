# ADR-004: JetBrains host — core runtime, webview, file watching, handovers (spikes S-1–S-4)

- Status: Accepted (Gregor, gate G1, 2026-11-21); Date: 2026-11-21
- Scope: how the JetBrains plugin of spec 0034 runs the unchanged shared core and webview bundle (§6.5, §6.12, AC-009).
- Related: spec 0034 (R-1–R-6, §6.7, AC-007, AC-021, AC-030), plan 0034 (T-003–T-007, T-038), ADR-001 (ports), ADR-002 (store shape)
- Evidence: CI runs of `jetbrains-spikes.yml` on GitHub-hosted runners — `spike-s1` run 44835557884 at `5a92fba`; `spike-ide` runs 44844442596 at `c936947` and 44846550133 at `fae8eb2` (Linux, Windows, macOS).

## Decision

**Accepted by Gregor on 2026-11-21 at gate G1: runtime V2.** All four recommendations stand (AC-009):

1. **Runtime V2.** The shared core runs in a hidden off-screen JCEF browser, one per IDE project. V1 (GraalJS) is rejected.
2. **R-5 replaced.** The core starts at project open, off the EDT, and is ready within **12 s** on the CI runners. Until then the panel shows its loading state. The budget is measured again on Gregor's machine at AC-040/AC-041. The plugin ZIP stays at most 60 MB.
3. **Without JCEF** (not supported, or suspended by the OS sandbox, such as AppArmor on Ubuntu 24.04+): the Specs tool window shows a notice instead of the tree, and the status entry shows unavailable. Copy Next Step and Set up FeatherSpec show a notification. Only the settings page works, and there is no plugin error. R-4 and AC-030 change.
4. **Send.** Spec 0034 offers Copy prompt only. The Claude Code deep link `claude-cli://open?q=` is the candidate for spec 0035.

The spec amendments of *Consequences* were applied to spec 0034 on 2026-11-21 (OP-025).

## Recommendation

**Choose V2: the core runs in a hidden off-screen JCEF browser, one per IDE project**, with these mitigations:

1. **Start at project open, not on the user's click.** Start the core off the EDT in a project startup activity. Tab, tree and status entry show their loading state until the core reports ready.
2. **Share JCEF.** The panel and the hidden core use the same `JBCefApp`, so its first initialisation is paid once per IDE session. T-022 measures cold start again with JCEF already initialised (not measured yet).
3. **Mirrors for the sync ports (R-3).** JS → Kotlin is asynchronous only (`JBCefJSQuery`). So the host pushes settings, trust, folders and memory into the page with `start` and on every change event. The page serves the core's sync port calls from those copies; port signatures stay unchanged. Timers and `Date.now` are the page's own.
4. **Own file watcher (S-4).** A `java.nio.file.WatchService` on the FeatherSpec roots, plus the IDE's VFS events, plus a `.specs/` refresh on frame activation (OP-003), all feed `fileChanged`.

Why not V1: GraalJS gives byte-identical outputs in a plain JVM, but it fails R-1 inside the plugin class loader. It misses R-2 by 2–4× and R-5 on cold start and size, on every runner.

## S-1 — core runtime, per requirement

| Req | V1 GraalJS 25.0.4 (stock JDK 21, interpreter) | V2 hidden JCEF (V8) in IntelliJ IDEA 2025.3.1 |
|---|---|---|
| R-1 same outputs | 27/27 byte-identical in a plain JVM; **fails in the plugin**: Truffle "Multi-Release classes are not configured correctly" | 27/27 byte-identical (Linux, Windows, macOS) |
| R-2 budgets | **fails**: 200 specs 3.8–8.4 s first read (< 2 s required) | met for read: 411–817 ms first, 213–757 ms second. Discovery, frame and 500 ms freshness are not measured yet (T-022) |
| R-3 sync ports | met (Java interop) | only through host-pushed mirrors (Recommendation 3) |
| R-4 runs without tab / without JCEF | met | without the tab: met. **Without JCEF: not possible** (see Consequences) |
| R-5 cold start < 1 s, ZIP ≤ 60 MB | **fails**: 0.7–1.6 s; polyglot JARs 64.9 MB uncompressed | **fails as written**: 5.3–9.6 s, including the first JCEF initialisation. No runtime JARs |
| R-6 testable in CI | plain JUnit | only inside an IDE run by Starter (Xvfb on Linux), as the spike ran |

| Measure (ms) | V1 macOS | V1 Linux | V1 Windows | V2 macOS | V2 Linux | V2 Windows |
|---|---|---|---|---|---|---|
| Cold start | 683 | 1,179 | 1,598 | 8,956 | 5,313 | 9,576 |
| 200 specs, first read | 3,784 | 7,014 | 8,397 | 817 | 411 | 512 |
| 200 specs, second read | 2,760 | 4,085 | 4,730 | 757 | 213 | 306 |
| Slowest fixture | 6,027–8,657 (range across the three OS) | | | 914 | 418 | 653 |
| `setTimeout(100)` in the hidden page | n-a | n-a | n-a | 176–177 | 100–102 | 100–102 |

The hidden page's timers are not throttled on Linux and Windows. On macOS they are throttled somewhat (+76 ms), which is still well inside the 500 ms freshness budget.

## S-2 — webview in JCEF

- The unchanged `dist/webview` bundle renders in the JCEF editor tab. The resource handler, CSP, `acquireVsCodeApi` shim and hello → snapshot round trip all work. The Windows screenshot shows the Board of `studio-0015` with the tabs Overview, Board and Plan map.
- Screenshots (Windows runner, run 44844442596): [Darcula](adr-004/s2-darcula-windows.png), [High Contrast](adr-004/s2-high-contrast-windows.png) show the Board of `studio-0015` in the JCEF tab; in [Light](adr-004/s2-light-windows.png) the IDE's own "Trial" tab had the focus at capture time (capture timing, not a render fault). Linux before the sandbox fix: [JCEF suspended](adr-004/s2-linux-jcef-suspended.png).
- Theme: about 20 of the 59 variables were mapped; the unmapped ones showed as grey chips. T-027 completes the mapping.
- Ubuntu runner: JCEF was **suspended** by the OS sandbox restriction (AppArmor unprivileged user namespaces, Ubuntu 24.04+) until `kernel.apparmor_restrict_unprivileged_userns=0` was set (CI only). Real Linux users can hit this. It needs the AC-030 notice.
- The editor provider must be `DumbAware`; otherwise `HIDE_DEFAULT_EDITOR` opened a text editor.

## S-3 — assistant handover (desk research, 2026-11-20; implementation is spec 0035)

| Assistant | Result | Entry point |
|---|---|---|
| Claude Code | prefills without sending (in an external terminal) | documented deep link `claude-cli://open?cwd=<abs>&q=<≤ 5,000 chars>`. It opens a new terminal window outside the IDE and works only after the first interactive prompt |
| GitHub Copilot for JetBrains | not possible | no documented entry point to open chat with a prompt |
| JetBrains AI Assistant (ACP) | not possible | no API for other plugins to prefill |

So Copy prompt stays the only step action in 0034 (AC-031).

## S-4 — external write → IDE file event (focused IDE)

| | Linux | Windows | macOS |
|---|---|---|---|
| Write 1 (plain NIO, no VFS) | 5,118 ms | 6,535 ms | no event within 30 s |
| Writes 2–10 | no event within 30 s | write 2: 1,663 ms; writes 3–10: no event within 30 s | write 2: 13,987 ms; writes 3–10: no event within 30 s |
| After `VfsUtil.markDirtyAndRefresh(.specs)` | 18 ms | 26 ms | 132 ms |
| IDE not focused | not measurable (the runner cannot take focus away) | same | same |

The IDE's file watcher alone does not meet AC-021's 2 s; an explicit refresh does. The cause of the missing events on the runners was not investigated. Recommendation 4 does not depend on it.

## Options considered

- **V1 GraalJS** — rejected (R-1 in the plugin, R-2, R-5). The class-loader failure might be fixable, but R-2 and the size would still fail.
- **V2 hidden JCEF** — recommended. Fast (V8) and no added weight. Its costs: async-only JS → Kotlin, JCEF start-up time, and no core at all without JCEF.
- **Plan C, Node sidecar or Kotlin port** — not spiked. A sidecar needs a Node on the user's machine or a bundled one (ZIP size); a port breaks "same core" (AC-006).

## Consequences

**Spec amendments** (applied to spec 0034 on 2026-11-21 as OP-025, after Gregor's yes):

1. §6.5 R-4: "The core runs while the Studio tab is closed, so tree and status entry stay live; without JCEF, AC-030 applies."
2. §6.5 R-5: "The core is ready within **12 s** of the IDE project opening on the CI runners, started off the EDT. Until then tab, tree and status entry show their loading state. The plugin ZIP is at most 60 MB." The measured worst case is 9.6 s, so 10 s would leave no margin on CI. Re-measured on Gregor's machine at AC-040/AC-041.
3. §6.5 R-6: "testable in CI inside an IDE run by Starter (Xvfb on Linux)"; plain JUnit only for pure Kotlin.
4. §6.5 closing paragraph, A-005 and §12 (GraalJS, polyfills): record V2 as chosen and A-005 as disproven.
5. AC-007: "the Studio frame within 1 s of *Open* once the core is ready; before that, the loading state within 1 s".
6. AC-030 and §10: covers both "JCEF not supported" and "JCEF suspended by the OS sandbox". The Specs tool window shows the same notice (reason, *Open help*) instead of the tree. The status entry shows unavailable. Copy Next Step and Set up FeatherSpec show the notification. The settings page keeps working, and there is no plugin error.
7. H-11 and AC-021: add "the plugin's own file watcher on the FeatherSpec roots" to the IDE's VFS events and the refresh on activation.
8. §6.11: conformance and budgets run in a Starter IDE, not as plain JVM tests.

**Plan consequences:**
- The approach and the bridge contract change: no sync `call`; mirrors in `start`; values in `settingsChanged`, `trustGranted`, `foldersChanged`; native timers; transport via `JBCefJSQuery` plus `executeJavaScript`. This affects T-015, T-016, and T-017 (browser target, fewer polyfills).
- T-021 becomes "core runtime in hidden JCEF", not GraalJS. T-022 runs conformance and budgets in Starter on 3 OS and records memory per hidden browser.
- T-023 adds the NIO watcher. T-025 starts the core at project open. T-026 shares JCEF. T-027 completes the theme map. T-029 covers the suspended case and the tree notice.
- The approved GraalJS dependencies (`org.graalvm.polyglot:*` 25.0.4) are no longer needed; there is no new dependency. The code of T-003–T-007 and T-038 is spike-only and is removed in T-037, together with the GraalJS line in `jetbrains/AGENTS.md`.

## Risks

1. Cold start on slow machines, and memory per hidden browser with several projects open: not measured yet (T-022, AC-040/AC-041).
2. Linux JCEF suspension (AppArmor): users get the notice, not the Studio.
3. macOS file watching. The stock JDK `WatchService` on macOS polls, so T-023 must measure AC-021 there. A native FSEvents version was proposed as OpenJDK 8293067; whether JetBrains Runtime 21 ships it is unverified. The refresh on activation remains the safety net.

## Sources

- CI runs listed under Evidence; values from `s1-results-*`, `s1v2-results.json`, `s2-results.json`, `s4-results.json` (plan 0034, Verified lines of T-004, T-006, T-007, T-038).
- S-3 and platform docs: plan 0034 *Research* (retrieved 2026-11-20): [Claude Code deep links](https://code.claude.com/docs/en/deep-links.md), [Claude Code for JetBrains](https://code.claude.com/docs/en/jetbrains), [Copilot in JetBrains](https://docs.github.com/en/copilot/concepts/agents/copilot-in-jetbrains), [AI Assistant ACP](https://www.jetbrains.com/help/ai-assistant/acp.html), [Embedded Browser (JCEF)](https://plugins.jetbrains.com/docs/intellij/embedded-browser-jcef.html), [GraalJS README](https://raw.githubusercontent.com/oracle/graaljs/master/README.md).
- macOS WatchService: [OpenJDK 8293067 review thread](https://mail.openjdk.org/pipermail/nio-dev/2023-July/014334.html) (retrieved 2026-11-21).
