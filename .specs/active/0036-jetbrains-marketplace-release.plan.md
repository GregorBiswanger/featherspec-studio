# Plan — JetBrains Marketplace release

**Spec:** [0036-jetbrains-marketplace-release.md](0036-jetbrains-marketplace-release.md)
**Status:** In Progress
**Last updated:** 2026-11-26
**Current step:** T-004 (CI round; push is Ask-first). Stage 2 waits for G0.

## Approach

Repository work first, release actions last, each release action behind its own Go. Stage 1 builds what needs no
precondition and can be proven by machine: the release workflow with a text guard (`node --test`, local), the signing and
publishing configuration with a guard of the Gradle file, the Marketplace texts in `plugin.xml` with a literal test; one CI round
proves that nothing else turned red (G1). Stage 2 waits for G0 (0034 and 0035 done), because it touches texts 0035 still
changes: CHANGELOG, version, README, checklist, Memory Bank; then the PR (G2). Stage 3 is the release itself, one Go per action:
merge, tags, sign run, Gregor's upload, VS Code publish, GitHub releases, wiki, cleanup. No new dependency: the 2.x Gradle plugin
already has `signPlugin`, `verifyPluginSignature` and `publishPlugin`; workflow and Gradle file are checked as text, as the
existing guards do. Memory Bank: `techContext.md` (release workflow, secrets by name), `systemPatterns.md` (one record: release
lines, tags, environment), `activeContext.md` (stage ends).

**Where things run:** Gradle, signing and the verifier only in CI (0034 §6.11). Guards and Vitest locally.

**Quality gates:** per step `node --test` of the step's guard or `npx vitest run --project node <files>`; per TypeScript-touching
step the techContext gates (`npx eslint src --max-warnings 0` · `npx tsc --noEmit` · `npx tsc --noEmit -p src/webview` ·
`npm run test:unit` · `npm run compile`); per pushed head every job of `ci.yml` and `jetbrains.yml` (push is Ask-first);
pre-PR `npm test` on Gregor's Windows machine.

## Research

- **Survey** (`0431707`): `jetbrains/build.gradle.kts` (`pluginConfiguration` with version `0.1.0`, since-build `253.29346`,
  `untilBuild = provider { null }`; `failureLevel = COMPATIBILITY_PROBLEMS`; `verifyVersions` 2025.3.1 and 2026.3; no `signing`
  or `publishing` block); `jetbrains/gradle/libs.versions.toml` (IntelliJ Platform Gradle Plugin 2.20.1); `plugin.xml` (one-sentence
  description, no change notes, vendor name only); `pluginIcon*.svg` 40 × 40; `.github/workflows/jetbrains.yml` (jobs `plugin`,
  `verify` × 5, `vscode-mirror`, `vscode-guards`, `shared-guard`, `ide-tests`; `vscode-guards` diffs `ci.yml` and `publish.yml`
  against `START_COMMIT`; `node --test 'jetbrains/guards/*.test.mjs'`); `publish.yml` (dispatch, `confirm=publish`, `vsce publish
  --oidc`); `jetbrains/guards/pluginZip.mjs` (60 MB, entries, byte-identical bundles, secret scan, `EXPECTED_PLUGIN`);
  `sameBundles.mjs` (`.github/workflows/jetbrains*` is JetBrains-only).
- **Survey, docs:** `CHANGELOG.md` has one section `## [0.1.0] - 2026-11-20`, into which `jetbrains-host` inserted eight 0035
  bullets (diff against `main`); no entry for 0034's plugin itself; no compare links. Tests pinning it: `docsScan.test.ts`
  (`firstRelease()` in three tests, "one first release" with `match(/^## \[/gm)` equal to one), `docs0035.test.ts`,
  `docs0035Review20B.test.ts`, `filePaths0035.test.ts` (contain-only). README line 135 says "not on the JetBrains Marketplace yet
  (a later spec, 0036 …)". No git tag for VS Code 0.1.0 (release `bf236fc`, run 44761333126). `package.json` and
  `package-lock.json` carry `0.1.0`; `src/hosts/embedded/bundle.test.ts` uses `studioVersion: '0.1.0'` as test data only.
- **Survey, parity:** `parity.test.ts` collects every criterion of `active/` and `done/` except 0034; 0036's rows are added at
  the spec commit (`default` rule `n-a`).
- **Prerequisites:** G0 (spec §6.12). Specs 0037 and the 0014–0027 cleanup stay out (Gregor, 2026-11-23).
- [Plugin Signing](https://plugins.jetbrains.com/docs/intellij/plugin-signing.html) — three `openssl` commands (RSA 4096, AES-256,
  `-days 365`); `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD`; multi-line values Base64, decoded by the Gradle
  plugin; Marketplace verifies and signs again; unsigned plugins show a warning at install — retrieved 2026-11-23.
- [Publishing a Plugin](https://plugins.jetbrains.com/docs/intellij/publishing-plugin.html) — "The first plugin publication must
  always be uploaded manually"; token under *My Tokens*; `channels`; non-default channels as custom repositories; every
  version must be new — retrieved 2026-11-23.
- [IntelliJ Platform Gradle Plugin — extension](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-extension.html)
  — `signing` defaults to the three variables; `publishing.token` to `PUBLISH_TOKEN`, `channels` to `listOf("default")`,
  `hidden` false; `untilBuild` unset by `provider { null }`; `description`, `changeNotes` patch `plugin.xml` — retrieved 2026-11-23.
- [IntelliJ Platform Gradle Plugin — tasks](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-tasks.html)
  — `signPlugin` runs before `publishPlugin` only when key and chain are set; `publishPlugin` uploads the signed archive;
  `verifyPluginSignature` reads the signed archive; no implicit dependency of `publishPlugin` on it — retrieved 2026-11-23.
- [Build Number Ranges](https://plugins.jetbrains.com/docs/intellij/build-number-ranges.html) — an open until-build "will include
  all future builds"; Marketplace plugins are checked automatically; 2025.3 = 253, 2026.3 = 263 — retrieved 2026-11-23.
- [JetBrains Marketplace Approval Guidelines v1.3](https://plugins.jetbrains.com/docs/marketplace/jetbrains-marketplace-approval-guidelines.html)
  (effective 2026-03-31) — name ≤ 30 characters, no "Plugin", "IntelliJ", "JetBrains", product or third-party marks (1.2); icon
  40 × 40 SVG, unlike JetBrains logos (1.1); vendor website and e-mail valid (1.3); English description, no broken media (1.4);
  verifier at every upload, no internal API (2.1); EULA (3.2), source link for open source (3.3), privacy policy only when
  personal data is collected (3.4), trader status (3.5); manual review, no guaranteed time, mail after 3–4 working days —
  retrieved 2026-11-23.
- [Uploading a new plugin](https://plugins.jetbrains.com/docs/marketplace/uploading-a-new-plugin.html) — *Upload plugin* in the
  account menu, vendor profile and Developer Agreement at the first upload, own EULA, source link, tags, hidden flag, 400 MB —
  retrieved 2026-11-23.
- [Release a paid plugin](https://plugins.jetbrains.com/docs/marketplace/release-plugin.html) — review "within two business days"
  (paid flow; the only stated duration) — retrieved 2026-11-23.
- [Forum: update stuck in review for over two weeks](https://platform.jetbrains.com/t/plugin-stuck-in-jetbrains-is-reviewing-this-update-for-over-two-weeks/2361)
  — reviews can take longer — retrieved 2026-11-23.
- [Template release workflow](https://github.com/JetBrains/intellij-platform-plugin-template/blob/main/.github/workflows/release.yml)
  — `publishPlugin` with the four secrets as environment variables; triggered by a GitHub release (not adopted: OP-003) —
  retrieved 2026-11-23.
- [IntelliJ Platform Gradle Plugin — types](https://plugins.jetbrains.com/docs/intellij/tools-intellij-platform-gradle-plugin-types.html)
  — product codes PS PhpStorm, GO GoLand, CL CLion, RM RubyMine, RR RustRover, RD Rider, WS WebStorm, PY PyCharm (type `PyCharm` for
  2025.3+), IU IntelliJ IDEA (type `IntellijIdea` for 2025.3+); the `FailureLevel` values including `INTERNAL_API_USAGES`,
  `INVALID_PLUGIN`, `EXPERIMENTAL_API_USAGES` — retrieved 2026-11-26.
- [FeatherSpec — Releasing](https://github.com/GregorBiswanger/featherspec/wiki/Releasing) — tags never move, release = tagged
  commit, stamp = tag, Keep a Changelog with compare links, `git push --follow-tags`, `gh release create` with the section as
  notes, wiki impact pass (spec §6.9) — retrieved 2026-11-23.

## Stages

1. T-001 ‖ T-002 ‖ T-003 → T-004 — workflow, signing and verifier configuration, Marketplace texts; one CI round. **Gate G1.**
2. T-005 → T-006 → T-007 → T-008 — after **G0**: CHANGELOG, version and README, checklist and Memory Bank, full gates and the PR.
   **Gate G2** (Gregor's Go for the merge).
3. T-009 → T-010 — merge, tags, sign run. **Gate G3**; then Gregor's first upload and the review. **Gate G4.**
4. T-011 → T-012 — VS Code publish, GitHub releases, wiki, cleanup, compile. **Gate G5.**

Parallel: stage 1 — T-001, T-002 and T-003 share no file and each has its own guard test. Stages 2–4 build on each other.

## Steps

### T-001 — Release workflow and its guard

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007
- **Files:** `.github/workflows/jetbrains-release.yml`, `jetbrains/guards/releaseWorkflow.mjs`, `jetbrains/guards/releaseWorkflow.test.mjs`
- **Do:** write the workflow of spec §6.3 (dispatch only, inputs `mode` and `confirm`, `if: inputs.confirm == 'publish'`,
  environment `jetbrains-marketplace`, `contents: read`, a first step that compares `GITHUB_REF` with `refs/tags/jetbrains-v` +
  the version read from `build.gradle.kts` and exits with both values, the Gradle and guard steps in the order of AC-005, the
  artifact `plugin-zip-signed`, `publishPlugin` under `if: inputs.mode == 'publish'`, the four secrets as `env` of their steps
  only). The guard reads the workflow as text and checks triggers, inputs, job condition, environment, step order, the
  `publish`-only step, no `workflow_call`/`uses: ./.github/workflows`, and that no other file under `.github/workflows/` names the
  four secrets; negative controls on edited copies (a `push:` trigger, a missing condition, swapped order, a secret in
  `jetbrains.yml`).
- **Verify:** `node --test jetbrains/guards/releaseWorkflow.test.mjs` red against the stub, then green;
  `git diff --exit-code 1765403c57c02381dae9acc5f2d4caae7abf7dfb -- .github/workflows/ci.yml .github/workflows/publish.yml`.
- [x] **Verified (T-001):** 2026-11-26 — `node --test jetbrains/guards/releaseWorkflow.test.mjs` 9/9 (negative controls: extra trigger, `workflow_call`, missing `confirm`, missing option, called workflow, missing condition, missing environment, `contents: write`, second job, missing `exit 1`, ref check after Gradle, swapped sign steps, missing ZIP guard step, wrong artifact name, publish without its condition or not last, foreign secret, secret in `run`, secret on the wrong step, `set -x`, secret named in another workflow); `git diff --exit-code 1765403 -- ci.yml publish.yml` clean; `node --test 'jetbrains/guards/*.test.mjs'` 99/99. Built as written, with three decisions: `verifyPlugin` runs the recommended set (`-Pverify.product=recommended`; every product runs in `jetbrains.yml › verify` at the same commit, and a workflow fault found only at the tag would cost a new version); `--no-configuration-cache` on every Gradle call (no secret into a cache entry); `concurrency` group `jetbrains-release`, no cancel. Workflow behaviour itself: CI pending (first real run is the sign run).
- **Notes:** the guard reads the YAML as text, no parser dependency; `verifyPluginStructure` shares a Gradle step with `buildPlugin`, so the order check allows equal positions.

### T-002 — Signing, publishing and verifier configuration

- **Covers:** AC-008, AC-009, AC-011, AC-012
- **Files:** `jetbrains/build.gradle.kts`, `.gitignore`, `jetbrains/guards/releaseConfig.mjs`, `jetbrains/guards/releaseConfig.test.mjs`
- **Do:** in `intellijPlatform` add `signing { certificateChain, privateKey, password }` from
  `providers.environmentVariable(...)` and `publishing { token = PUBLISH_TOKEN; channels = listOf("default"); hidden = false }`;
  extend `failureLevel` by `INTERNAL_API_USAGES` and `INVALID_PLUGIN`; `.gitignore` gets `*.pem`, `*.crt`, `*.key`, `*.p12`,
  `*.pfx`. The guard checks the Gradle text (variable names, channel, hidden, the three failure levels, no
  `EXPERIMENTAL_API_USAGES`, version `0.1.0`, since-build, `untilBuild = provider { null }`), the `.gitignore` lines, and that no
  tracked file holds a `-----BEGIN` block (`git ls-files`, `test/fixtures` included); negative controls.
- **Verify:** `node --test jetbrains/guards/releaseConfig.test.mjs` red, then green. Gradle effect: T-004.
- [x] **Verified (T-002):** 2026-11-26 — `node --test jetbrains/guards/releaseConfig.test.mjs` 6/6 (negative controls: literal password, wrong token source, `hidden = true`, channel `eap`, missing `INTERNAL_API_USAGES`, `EXPERIMENTAL_API_USAGES` in place of `INVALID_PLUGIN`, other version, other since-build, set until-build, product removed, secret name in a comment, product missing in the `jetbrains.yml` matrix or unknown there, `.gitignore` line missing, PEM block in a file, `git check-ignore` of five key file names); no tracked key file. Gradle effect: CI pending (T-004), including A-003 (internal API usage) and the new verifier products.
- **Notes:** also built here: the verifier products PhpStorm (PS), GoLand (GO), CLion (CL), RubyMine (RM) and RustRover (RR) as `verifyProducts` and as `verify` matrix entries of `jetbrains.yml` at 2025.3.1 and 2026.3, via `IntelliJPlatformType.PhpStorm`, `GoLand`, `CLion`, `RubyMine`, `RustRover` (types page, retrieved 2026-11-26); `vendor { url }` in Gradle. Risk for T-004: a product without a 2026.3 build fails its job; remove that version for that product then.
- **Notes (A-003):** if the verifier finds internal API usage, T-004 stops and a fix step is inserted before T-005.

### T-003 — Marketplace texts in plugin.xml

- **Covers:** AC-014, AC-015, AC-016, AC-017
- **Files:** `jetbrains/src/main/resources/META-INF/plugin.xml`, `jetbrains/guards/pluginPage.mjs`, `jetbrains/guards/pluginPage.test.mjs`
- **Do:** replace `<description>` by spec §7's text as CDATA HTML (`<p>`, `<ul>`, `<b>`, one `<a>` to the repository), add
  `<change-notes>` with §7's 0.1.0 text, add `url` to `<vendor>`. The guard extracts both CDATA blocks and checks §7 literally,
  the three assistant names with their sentences, the non-affiliation sentence, the forbidden words of §7, no `<img>`, links only
  under `https://github.com/GregorBiswanger/`, name length ≤ 30, both icons `width="40" height="40"`; negative controls. Before
  editing `plugin.xml`, check `git status` for the other agent's changes to it (parallel work).
- **Verify:** `node --test jetbrains/guards/pluginPage.test.mjs jetbrains/guards/pluginZip.test.mjs` red, then green.
- [x] **Verified (T-003):** 2026-11-26 — `node --test jetbrains/guards/pluginPage.test.mjs jetbrains/guards/pluginZip.test.mjs` 8/8 + 15/15 (negative controls: empty vendor, vendor without url, vendor with e-mail, wrong vendor name, empty description, missing sentences, missing IDE name, `<img>`, foreign link, missing change notes, `TODO`, wrong first sentence, each forbidden word, name with `Plugin` or `JetBrains` or 31 characters, icon width 16). `pluginZip.mjs` read the vendor only without attributes; it now accepts `<vendor url=…>` (test added).
- **Notes:** the vendor e-mail is not in `package.json` (`author` has the name only), so `<vendor>` carries the URL only (OP-018). The Send wording follows 0035 (Send to Junie, Claude Code and GitHub Copilot into the CLI agents in the IDE terminal, never Enter), not the Copy for Copilot of the first draft; spec §7 is updated. The texts for the Marketplace form: `docs/jetbrains/marketplace-listing.md`. The words `Plugin`, `IntelliJ` and `JetBrains` are barred from the name only; the other forbidden words from the whole page.

### T-004 — CI round for stage 1 (gate G1)

- **Covers:** AC-007, AC-008, AC-012
- **Do:** local `node --test 'jetbrains/guards/*.test.mjs'`; ask for the push of `jetbrains-host` (Ask-first); read every job of
  `jetbrains.yml` and `ci.yml` (PR) at that head: `plugin` × 3, `verify` × 5 with the new failure level, `vscode-guards`,
  `shared-guard`, `vscode-mirror`, `ide-tests`. A red verifier on internal API usage: stop, report the usages, insert a fix step.
- **Verify:** `gh run list --branch jetbrains-host --limit 5` and `gh run view <id>`: every job green at one head; record run IDs.
- [x] **Verified (T-004):** 2026-11-26 · run 45871033008 at 5b4ae59, all 25 jobs green: `plugin` ×3 (unit tests and guards), `verify` ×10 (idea, webstorm, rider, pycharm, phpstorm, goland, clion, rubymine, rustrover, recommended; no internal API usage reported), `ide-tests` ubuntu, windows and macos for 2025.3.1 and ubuntu and windows for 2026.3, no-JCEF unsupported and suspended, `vscode-guards`, `vscode-mirror` ×2, `shared-guard` ×2. Local `node --test 'jetbrains/guards/*.test.mjs'` 99/99 before the push.
- **Notes:** the new jobs `verify (phpstorm|goland|clion|rubymine|rustrover)` and the stricter failure level are the new CI risk.

### T-005 — CHANGELOG: 0.1.0 as published, 0.2.0 new

- **Covers:** AC-020
- **Do:** after G0. Restore the `## [0.1.0] - 2026-11-20` section to its bytes at `bf236fc`; add `## [0.2.0] - Unreleased` above
  it with `### Added` (empty-state step action, VS Code and JetBrains; *JetBrains IDEs — plugin 0.1.0, first release*: 0034's
  surfaces in one bullet, then the 0035 bullets moved out of 0.1.0) and `### Changed` (README); compare links at the end. Amend
  `docsScan.test.ts`: `firstRelease()` reads the `## [0.1.0]` section; "one first release" becomes "0.1.0 byte-identical to
  `bf236fc`, at most one `Unreleased` section" (note the amendment in the spec that owns the test). New
  `src/adapters/node/release0036.test.ts` for AC-020 with a negative control (one changed byte in 0.1.0).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/release0036.test.ts src/adapters/node/docs0035.test.ts src/adapters/node/docs0035Review20B.test.ts src/core/assistant/filePaths0035.test.ts` red, then green.
- [x] **Verified (T-005):** 2026-11-26 — red first: `release0036.test.ts` 4 of 6 failed against the 0035 CHANGELOG (hash, heading, 0.2.0 text, links); `docsScan`, `docs0035`, `docs0035Review20B` 219/219 green with the amended helpers. Green: `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/release0036.test.ts src/adapters/node/docs0035.test.ts src/adapters/node/docs0035Review20B.test.ts` plus `docs0035PD112.test.ts` 233/233 (five files); `CHANGELOG.md` against `bf236fc` is 32 insertions, 0 deletions; `eslint` on the two test files clean.
- **Notes:** `src/core/assistant/filePaths0035.test.ts` does not exist (0035 deleted it; the path in the Verify line is stale, not run). Byte identity is checked as the SHA-256 of the 0.1.0 section (`d75e0e69…`, the section of `bf236fc`), because CI checks out shallow. The AC-020 text says "Copy for Copilot and Copy for Junie"; the shipped wording is Send to Junie, Send to Claude Code and Send to Copilot (0035), so the 0.2.0 section uses the shipped names. `firstRelease()` reads the `## [0.1.0]` section up to the link block. The 0.2.0 Added block holds the 0034 bullet, the empty-state bullet and the 0035 bullets moved verbatim from 0.1.0.

### T-006 — Version 0.2.0 and the README install text

- **Covers:** AC-019, AC-021
- **Do:** `package.json` and the two root fields of `package-lock.json` to `0.2.0`; README *JetBrains IDEs → Install* per spec
  §6.8, without bare `copilot`, `provider` or `drag` (docsScan); tests in `release0036.test.ts`: `git diff main -- package.json`
  changes one line, README sentences, anchor heading `## JetBrains IDEs` unchanged.
- **Verify:** `npx vitest run --project node src/adapters/node/release0036.test.ts src/adapters/node/docsScan.test.ts`;
  `npm run package && node jetbrains/guards/vsixFiles.mjs`; techContext gates 1–5.
- [ ] **Verified (T-006):** — not ticked: gate 4 (`npm run test:unit`) red, see Notes.
- **Notes:** red first (`release0036.test.ts` 4 of 14 red: version, lock, README Marketplace path, old sentence). Green after the edit: `release0036` + `docsScan` + `docs0035` + `docs0035Review20B` + `docs0035PD112` 241/241; `npm run package` exit 0 (check-types, lint, bundle); `node jetbrains/guards/vsixFiles.mjs` matches the 11-file snapshot (`npx --yes @vscode/vsce ls` ran through the proxy); `npm run compile` exit 0. Gate 4: `npm run test:unit` 4498 passed, 1 failed: `src/core/lifecycle/problems.test.ts` AC-005 on `.specs/backlog/0038-panel-survives-dynamic-plugin-loading.md` (`**Status:** Backlog` is no known value and the folder does not match), present since `c957afa`, not from 0036; not edited here (not this task's file, Ask first). The AC-019 "diff against main" test was green before the edit (`main` holds the same bytes as `bf236fc` apart from the version), so its negative control is the second changed line. The lock's version lines: the first `"version"` at two spaces and the first at six spaces (the root package).

### T-007 — Checklist section and docs sync

- **Covers:** AC-034, AC-013, AC-023, AC-024, AC-030, AC-031, AC-032, AC-033 (the checklist entries)
- **Do:** `docs/release-checklist.md`: after `## Go` the section of AC-034 — Gregor's list of spec §6.10 with a date per item,
  certificate expiry, AC-013's versions, G0 values (AC-023, AC-024), upload and approval dates (AC-031), install check (AC-032),
  `publish.yml` run ID (AC-033), the order of spec §5. Sync, named exactly: `techContext.md` (*Release*: `jetbrains-release.yml`,
  environment, secret names, modes); `systemPatterns.md` (one record: two release lines, tags, environment as Gregor's Go, first
  upload by hand · 2026-11 · 0036); `jetbrains/AGENTS.md` (one line: release workflow); `activeContext.md`. No change to the
  `AGENTS.md` snapshot (no source module).
- **Verify:** `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/docs0035.test.ts src/adapters/node/release0036.test.ts`;
  `wc -c AGENTS.md .memory-bank/activeContext.md` → ≤ 15000 and < 7000.
- [ ] **Verified (T-007):** —
- **Notes:** —

### T-008 — Full gates and the PR (gate G2)

- **Covers:** AC-022, AC-023, AC-024, AC-025, AC-026
- **Do:** check G0 in the files (0034 and 0035 in `done/`, checklist boxes, cold-start values ≤ 12 s and ≤ 1 s, else stop per
  AC-024); with Gregor's Go set `## [0.2.0] - Unreleased` to the planned tag day (a tag never moves, so the date is set
  before the merge); run techContext gates 1–5 and `node --test 'jetbrains/guards/*.test.mjs'`; push (Ask-first); every job of `ci.yml` and
  `jetbrains.yml` green at one head; Gregor runs `npm test` on Windows; open the PR `jetbrains-host` → `main` (Ask-first) with the
  run IDs, §6.7's list and the G0 evidence; Gregor reads the diff and gives the Go for the merge.
- **Verify:** `gh pr checks <n>` all green at the PR head; `gh pr view <n> --json body` lists run IDs, §6.7, G0.
- [ ] **Verified (T-008):** —
- **Notes:** —

### T-009 — Merge and tags

- **Covers:** AC-027, AC-028
- **Do:** on Gregor's Go `gh pr merge <n> --merge`; wait for `ci.yml` green on the merge commit; on Gregor's Go create annotated
  tags `v0.2.0` and `jetbrains-v0.1.0` on it and `v0.1.0` on `bf236fc` with the messages of spec §6.1; `git push --follow-tags`
  (or `git push origin <tags>`).
- **Verify:** `git cat-file -t v0.2.0 jetbrains-v0.1.0 v0.1.0` → `tag`; `git rev-list -n 1` of each; `git show v0.2.0:package.json`
  and `git show jetbrains-v0.1.0:jetbrains/build.gradle.kts` carry the versions; `git ls-remote --tags origin`.
- [ ] **Verified (T-009):** —
- **Notes:** —

### T-010 — Sign run (gate G3)

- **Covers:** AC-005, AC-010, AC-012
- **Do:** Gregor confirms items 1–6 of spec §6.10 (AC-030), starts `gh workflow run jetbrains-release.yml --ref jetbrains-v0.1.0
  -f mode=sign -f confirm=publish` and approves the environment; the agent reads the run, downloads `plugin-zip-signed`, records
  its SHA-256 and hands it to Gregor for the first upload (AC-031); a red run stops here.
- **Verify:** `gh run view <id>`: every step green, `publishPlugin` absent; `node jetbrains/guards/pluginZip.mjs <signed zip>`.
- [ ] **Verified (T-010):** —
- **Notes:** —

### T-011 — VS Code publish and GitHub releases (after G4)

- **Covers:** AC-029, AC-033
- **Do:** after the Marketplace approval and Gregor's install check (AC-032), Gregor runs `gh workflow run publish.yml -f confirm=publish` on `main`; `gh release create v0.2.0` and
  `gh release create jetbrains-v0.1.0` with the 0.2.0 section as notes, the signed ZIP attached to the latter.
- **Verify:** `gh release view v0.2.0`, `gh release view jetbrains-v0.1.0 --json assets`; the `publish.yml` run green; the VS Code
  Marketplace shows 0.2.0 (Gregor).
- [ ] **Verified (T-011):** —
- **Notes:** the 0.2.0 heading carries the tag day (T-008), even when the publish follows days later.

### T-012 — Wiki, cleanup, final gates and lifecycle (gate G5)

- **Covers:** AC-035, AC-034
- **Do:** wiki line in *Hands-On Walkthrough* (spec §6.11) — on Gregor's machine or with access to the wiki repository; impact
  pass names the skipped pages; delete `jetbrains-host` locally and on `origin` (Go), remove `jetbrains/build/` and `*.vsix`,
  list the other remote branches for Gregor; fill traceability and handoff, refresh `activeContext.md`; recommend `/sdd-compile`,
  then `/sdd-lifecycle` to `done/`.
- **Verify:** `git branch -a | grep jetbrains-host` empty; `git ls-remote --heads origin jetbrains-host` empty; `ls jetbrains/build
  *.vsix` none; `npx vitest run --project node src/adapters/node/docsScan.test.ts src/adapters/node/parity.test.ts`; `wc -c`.
- [ ] **Verified (T-012):** —
- **Notes:** —

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-001 | `.github/workflows/jetbrains-release.yml` | `jetbrains/guards/releaseWorkflow.test.mjs` | built; workflow run: CI pending |
| AC-002 | T-001 | same | same | built; workflow run: CI pending |
| AC-003 | T-001 | same | same (text check of the ref step) | built; workflow run: CI pending |
| AC-004 | T-001 | same | same (`checkOtherWorkflows`) | proven locally |
| AC-005 | T-001, T-010 | `jetbrains-release.yml` | `releaseWorkflow.test.mjs` (order, artifact) | structure proven; the run: CI pending |
| AC-006 | T-001 | `jetbrains-release.yml` | `releaseWorkflow.test.mjs` (publish last, only in mode publish) | structure proven; the first real publish run is the next update |
| AC-007 | T-001, T-004 | — | same (`git diff` against `START_COMMIT`) · CI run 45871033008 at 5b4ae59, `vscode-guards` green (2026-11-26) | verified |
| AC-008 | T-002, T-004 | `jetbrains/build.gradle.kts` | `releaseConfig.test.mjs` · CI run 45871033008 at 5b4ae59, every job of `jetbrains.yml` green (2026-11-26) | verified |
| AC-009 | T-002 | `jetbrains/build.gradle.kts`, `.gitignore` | `releaseConfig.test.mjs` | proven locally |
| AC-010 | T-010 | — | — | open |
| AC-011 | T-002 | `jetbrains/build.gradle.kts` | `releaseConfig.test.mjs` · CI run 45871033008 at 5b4ae59, `plugin` ×3 green (built `plugin.xml`, 2026-11-26) | verified |
| AC-012 | T-002, T-004, T-010 | `build.gradle.kts`, `jetbrains.yml` matrix | `releaseConfig.test.mjs` (levels, products) · CI run 45871033008 at 5b4ae59: `verify` green on nine products and recommended, no internal API usage (2026-11-26) | verified |
| AC-013 | T-007 | — | manual: Gregor, verifier versions | open |
| AC-014 | T-003 | `plugin.xml` | `pluginPage.test.mjs` | proven locally |
| AC-015 | T-003 | `plugin.xml` | `pluginPage.test.mjs` | proven locally |
| AC-016 | T-003 | `plugin.xml` | `pluginPage.test.mjs` | proven locally |
| AC-017 | T-003 | `plugin.xml`, icons | `pluginPage.test.mjs` | proven locally |
| AC-018 | T-007 | — | manual: Gregor, Marketplace page | open |
| AC-019 | T-006 | — | — | open |
| AC-020 | T-005 | — | — | open |
| AC-021 | T-006 | — | — | open |
| AC-022 | T-008 | — | — | open |
| AC-023 | T-007, T-008 | — | manual: Gregor, G0 | open |
| AC-024 | T-007, T-008 | — | manual: Gregor, cold start | open |
| AC-025 | T-008 | — | — | open |
| AC-026 | T-008 | — | — | open |
| AC-027 | T-009 | — | — | open |
| AC-028 | T-009 | — | — | open |
| AC-029 | T-011 | — | — | open |
| AC-030 | T-007, T-010 | — | manual: Gregor, preparation list | open |
| AC-031 | T-007, T-010 | — | manual: Gregor, first upload | open |
| AC-032 | T-007, T-011 | — | manual: Gregor, install check | open |
| AC-033 | T-007, T-011 | — | manual: Gregor, VS Code publish | open |
| AC-034 | T-007, T-012 | — | — | open |
| AC-035 | T-012 | — | — | open |

## Session handoff

- **Done so far:** spec and plan written and clarified by proxy (2026-11-23); parity rows of 0036 added (`n-a`); stage 1 built 2026-11-26 (T-001, T-002, T-003 ticked, local guards 99/99, gates green; commits on `jetbrains-host`, not pushed).
- **Next action:** T-004: Gregor's Go to push `jetbrains-host`, then read every job of `jetbrains.yml` and `ci.yml` (CI pending); Gregor's preparation list (spec §6.10) runs in parallel. Stage 2 (T-005…T-008) waits for G0.
- **Open decisions:** the proxies OP-001–OP-021 of the spec; G0 depends on Gregor's checks of 0034 and 0035.
- **Baseline:** _(set when work starts)_
- **Environment:** parallel agents commit on `jetbrains-host`: commit only own paths (`git add <paths>`); wait on `index.lock`.
