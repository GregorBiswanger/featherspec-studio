# JetBrains Marketplace release

**Status:** In Progress
**Plan:** [0036-jetbrains-marketplace-release.plan.md](0036-jetbrains-marketplace-release.plan.md)

Basis: 0034 §6.10, OP-014, OP-015 and OP-024 (the signing part of 0034 AC-035, the struck 0034 AC-036 and §6.10's release-line
bullet move here); 0035 §6.6 (the one deliberate VS Code change); PD-098, PD-110, PD-111; the release checklist
(`docs/release-checklist.md`, sections *JetBrains (manual)*, *Send and Copy for in JetBrains (manual)* and *Go*); FeatherSpec's
[Releasing](https://github.com/GregorBiswanger/featherspec/wiki/Releasing) guide, applied by analogy (§6.9). Gregor's decision of
2026-11-23, given through the orchestrator: 0034 and 0035 are released first; 0037 (Junie readiness) and the cleanup of specs
0014–0027 follow as an update after this release. Written without an interview; clarified 2026-11-23 by the orchestrator's agent
as product-owner proxy: every proxy decision carries "(proxy)" (§14). Placed in `active/` with status In Progress on the
orchestrator's instruction; implementation starts only on Gregor's start signal (proxy, OP-001).

## 1. Summary

Two releases in one go, from one commit on `main`: the **first JetBrains Marketplace release** of the plugin *FeatherSpec
Studio* (version 0.1.0, tag `jetbrains-v0.1.0`), signed in a release workflow that runs only by hand and only after Gregor's
approval, and the **VS Code extension 0.2.0** (tag `v0.2.0`) through the unchanged `publish.yml`. The spec adds the release
workflow, the signing and publishing configuration, the Marketplace page texts (description, change notes), the version and
changelog work, the PR from `jetbrains-host` to `main` and the cleanup after it. Accounts, certificate, secrets, the first upload
and every Go are Gregor's (§6.10). No product behaviour changes here.

## 2. Goal and problem

0034 and 0035 are built on `jetbrains-host`, but a developer can only install the plugin from a CI artifact ZIP, unsigned,
and the VS Code extension's empty-state change (0035 §6.6) is not shipped. The CHANGELOG lists 0035's entries inside the
already published 0.1.0 section. Goal: both products reach their marketplaces from one verified commit, the plugin signed,
the published history unchanged, and VS Code byte-identical to `main` except the changes named in §6.7. Success: *FeatherSpec
Studio* installs from **Settings | Plugins | Marketplace** in Rider and WebStorm, VS Code shows 0.2.0, and `main` carries both
tags.

## 3. Users and roles

- **Gregor** — release owner and acceptor: Marketplace account and vendor, certificate, secrets, the first upload, every Go
  (push, PR, merge, tags, sign run, VS Code publish, deletions) and the manual criteria.
- **The agent** — prepares the repository, runs local gates, reads CI; never publishes, tags or merges without Gregor's Go.
- **Developers** — install the plugin from the JetBrains Marketplace and the extension from the VS Code Marketplace.

Terms: **release commit** — the merge commit of the PR on `main` that both tags name. **Sign run** — the release workflow in
mode `sign`. **Publish run** — the same workflow in mode `publish`. **Go** — Gregor's explicit yes for one named action.

## 4. Scope

### In scope

- The JetBrains release workflow `.github/workflows/jetbrains-release.yml` (§6.3) and its guard tests.
- Signing and publishing configuration in `jetbrains/build.gradle.kts` (§6.2, §6.4); `.gitignore` entries for key files.
- The Marketplace page: `<description>`, `<change-notes>`, vendor, icon check, screenshots, links, tags (§6.5, §7).
- Compatibility: since-build, open until-build, Plugin Verifier on the release commit (§6.6).
- VS Code 0.2.0: version, CHANGELOG, README (§6.7, §6.8).
- PR `jetbrains-host` → `main`, merge, tags, GitHub releases, wiki line, cleanup (§6.9, §6.11).
- Gate G0 and Gregor's preparation list (§6.10, §6.12); a checklist section for 0036.

### Out of scope

- Spec 0037 (Junie readiness) and the cleanup of specs 0014–0027 — because Gregor decided they follow as an update after this
  release.
- An EAP or other custom channel — because version 0.1 has one audience; `publishing.channels` adds one later without code (proxy).
- A paid or freemium listing (`productDescriptor`) — because the plugin is free under MIT.
- Any change to `ci.yml` or `publish.yml` — because 0034 §6.9 forbids it and two guards diff both against `START_COMMIT`.
- A publish started by pushing a tag — because a pushed tag would publish without Gregor's approval (proxy, OP-003).
- The Gradle Changelog Plugin or any other new dependency — because a new dependency is Ask-first and the texts are short (proxy, OP-009).
- Images inside the description — because the Marketplace page has its own media section and broken media fail
  guideline 1.4c (proxy, OP-016).
- Moving or deleting a published tag — because the Releasing guide's invariant 1 forbids it; a fix is a new patch version.
- New product behaviour in either host — because this is a release; the only behaviour change shipped is 0035 §6.6.
- Split mode and remote development — because 0034 §4 excludes them.
- The FeatherSpec template's own release (ledger, `FeatherSpecVersion:` stamp, rehearsal) — because the Releasing guide governs
  the template repository; here it applies only by analogy (§6.9).
- Deleting remote branches other than `jetbrains-host` — because deleting what this task did not create is Ask-first (proxy, OP-020).

## 5. Functional flow

1. **G0** holds (§6.12): 0034 and 0035 in `done/`, Gregor's JetBrains checks ticked, the cold start measured.
2. The agent builds §6.2–§6.8 on `jetbrains-host`; every job of `ci.yml` and `jetbrains.yml` is green at one head.
3. Gregor finishes his preparation list (§6.10); this can run in parallel to step 2.
4. With Gregor's Go the agent opens the PR; with his next Go it is merged with a merge commit; CI on `main` is green.
5. With his Go the agent creates and pushes the annotated tags `jetbrains-v0.1.0` and `v0.2.0` on the release commit and the
   retroactive `v0.1.0` on `bf236fc` (§6.1).
6. Gregor starts the sign run at `jetbrains-v0.1.0` and approves its environment; the run builds, verifies, signs and checks
   the ZIP and keeps it as an artifact.
7. Gregor uploads the signed ZIP by hand as the first version on the JetBrains Marketplace and fills the page (§6.5).
8. JetBrains reviews the upload; Gregor records the dates.
9. After the approval Gregor installs the plugin from the Marketplace in Rider and WebStorm, then starts `publish.yml` for VS
   Code 0.2.0 (proxy order, OP-014).
10. The agent creates both GitHub releases, adds the wiki line, cleans up (§6.11) and moves 0036 to `done/` after `/sdd-compile`.

## 6. Business rules

### 6.1 Release lines, versions and tags

- VS Code: version `0.2.0` in `package.json` (MINOR: new behaviour in the empty state, 0035 §6.6) (proxy, OP-007); tag `v0.2.0`.
- JetBrains: version `0.1.0` in `jetbrains/build.gradle.kts` (`pluginConfiguration.version`); tag `jetbrains-v0.1.0` (0034 §6.10).
- Both tags are **annotated** and name the release commit; messages `FeatherSpec Studio 0.2.0 — Send in the empty state, JetBrains
  IDEs` and `FeatherSpec Studio for JetBrains IDEs 0.1.0 — first Marketplace release`.
- The VS Code release 0.1.0 has no tag; it gets the annotated tag `v0.1.0` on `bf236fc` with the message `FeatherSpec Studio 0.1.0
  (retroactive)` (proxy, OP-012).
- A pushed tag is never moved or deleted. A rejected or broken release gets the next patch version and a new tag.
- A tag's version equals the version in the tagged tree (`package.json` for `v*`, `build.gradle.kts` for `jetbrains-v*`).

### 6.2 Signing

- The plugin ZIP is signed only in the release workflow, with the IntelliJ Platform Gradle Plugin's `signPlugin` and checked by
  `verifyPluginSignature`. The JetBrains Marketplace verifies the author signature and signs the file a second time.
- Inputs, read from environment variables only: `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD`. Without them (every
  other CI run, every local build) signing is skipped and nothing else changes.
- The certificate is self-signed, RSA 4096, valid 365 days, made with the three `openssl` commands of JetBrains' *Plugin
  Signing* page; `PRIVATE_KEY` holds the **encrypted** key and `PRIVATE_KEY_PASSWORD` its password, both Base64-encoded where the
  value has several lines (proxy, OP-004, OP-005). The expiry date goes into the checklist.
- No key, certificate, token or password is ever in the repository, a log or the chat; `.gitignore` excludes `*.pem`, `*.crt`,
  `*.key`, `*.p12`, `*.pfx`.

### 6.3 The release workflow

- File `.github/workflows/jetbrains-release.yml`; the only trigger is `workflow_dispatch` with two inputs: `mode` (`sign` or
  `publish`) and `confirm` (must be the word `publish`).
- One job, `release`, in the GitHub environment `jetbrains-marketplace`, whose required reviewer is Gregor; the four secrets are
  secrets of that environment (proxy, OP-003). Permissions: `contents: read` only; the GitHub release and its asset are made
  outside the workflow (§6.11, AC-029).
- Order of steps, each stopping the run when it fails: check the inputs; check that the run's ref is a tag `jetbrains-v<version>`
  equal to the plugin version; `npm ci` and `npm run package`; `gradle -p jetbrains buildPlugin verifyPluginStructure
  verifyPlugin` (the recommended set; the products run one per job in `jetbrains.yml › verify` at the same commit, built 2026-11-26); `signPlugin`, `verifyPluginSignature`; the plugin ZIP guard on the signed ZIP; upload the signed ZIP as artifact
  `plugin-zip-signed`; only in mode `publish`: `publishPlugin`.
- The workflow calls no other workflow and is called by none; `publish.yml` and `ci.yml` stay byte-identical.

### 6.4 Publishing

- The first version is uploaded **by hand** on the Marketplace (JetBrains: "The first plugin publication must always be uploaded
  manually"). The publish run serves later versions only.
- `publishPlugin` uses `PUBLISH_TOKEN` (a Marketplace personal access token, *My Tokens*), channel `default`, `hidden` false (proxy,
  OP-006). Gregor creates the token after the 0.1.0 approval (proxy, OP-015). Every upload needs a new version.

### 6.5 The Marketplace page

- Name `FeatherSpec Studio` (18 characters; no "Plugin", "IntelliJ", "JetBrains", product or third-party name — guideline 1.2).
- Description and change notes are hand-written HTML in `plugin.xml`, in English, without images (proxy, OP-009, OP-016); §7
  holds their drafts.
- The assistants are named by their product names in plain text only — Claude Code, GitHub Copilot, Junie — with what the Studio
  does with each, and one sentence that they belong to their owners and that the Studio is not affiliated with them. No
  third-party logo appears in the icon, the description or a screenshot's frame (proxy, OP-010; guidelines 1.2c, 1.8b).
- Icon: the existing `pluginIcon.svg` and `pluginIcon_dark.svg` (40 × 40 SVG, the FeatherSpec feather; guideline 1.1).
- Vendor in `plugin.xml`: name `Gregor Biswanger` and the repository URL; the e-mail address lives only in the vendor profile
  (proxy, OP-018).
- Page fields set by Gregor at the upload: licence MIT with a link to `LICENSE`, source code (the repository; required for open
  source, guideline 3.3), issue tracker, documentation (`README.md#jetbrains-ides`), tags from the Marketplace list (proposal:
  AI, Productivity, Project Management; proxy, OP-017), and three screenshots of Rider at 1280 × 800: the Overview beside the
  tool window, the Board, a detail with Send to Claude Code (proxy, OP-016). Copies stay under `media/screenshots/jetbrains/`,
  which the `.vsix` already excludes.
- Privacy: the Studio collects no personal data, so no privacy policy is required (guideline 3.4); the description says "no
  account and no telemetry" and links the README's privacy section.

### 6.6 Compatibility

- since-build `253.29346` (2025.3.1), no until-build (0034 §6.10, AC-033).
- The Plugin Verifier runs in the release workflow on the release commit with the products and versions of
  `jetbrains/build.gradle.kts` (IntelliJ IDEA, WebStorm, Rider, PyCharm, PhpStorm, GoLand, CLion, RubyMine and RustRover at 2025.3.1 and 2026.3, plus the
  recommended set; one job per product in `jetbrains.yml`, the release workflow runs the recommended set). It fails on compatibility problems, invalid plugin structure and **internal API usage** (guideline 2.1d);
  experimental API usage is reported, not failed (0035 OP-009) (proxy, OP-011). The same failure level applies to
  `jetbrains.yml › verify`.
- Before the release commit Gregor confirms that `verifyVersions` names the newest stable release of each product; a newer one
  is added first.

### 6.7 VS Code release

- Shipped VS Code changes against `main`: the empty state's step action (0035 §6.6, AC-007), the README, the CHANGELOG and the
  version. Everything else VS Code shows or does is unchanged, proven by the guards of 0034 AC-039 and 0035 AC-026.
- `package.json` changes only its `version` against `main`; `package-lock.json` only its two root `version` fields.
- Published only by `publish.yml` as it is, from `main`, started by Gregor with `gh workflow run publish.yml -f confirm=publish`
  after his Go; the Trusted Publishing policy of 2026-11-20 stays.

### 6.8 CHANGELOG and README

- `CHANGELOG.md` stays one file (proxy, OP-008). Its `## [0.1.0] - 2026-11-20` section is byte-identical to the one at `bf236fc`.
- A new section `## [0.2.0] - <release day>` above it (release day: the day of the tags, set before the merge) holds: the VS Code change (empty state), the JetBrains plugin's first
  release (0.1.0) with 0034's surfaces and the 0035 entries that today sit in the 0.1.0 section, and the README change.
- Compare links at the bottom: `[0.2.0]` → `compare/v0.1.0...v0.2.0`, `[0.1.0]` → `releases/tag/v0.1.0`.
- README *JetBrains IDEs → Install*: install from the JetBrains Marketplace (**Settings | Plugins | Marketplace**, search
  *FeatherSpec Studio*), or the signed ZIP of the GitHub release `jetbrains-v<version>` with *Install Plugin from Disk…*; the
  sentence "not on the JetBrains Marketplace yet" goes; the anchor `#jetbrains-ides` stays (the plugin's help URL).

### 6.9 FeatherSpec's Releasing guide, by analogy

Applies: a published tag never moves; the release is the tagged commit; the version in the tagged tree equals the tag; a
Keep a Changelog section with compare links; `git push --follow-tags`; a GitHub release per tag with its changelog section as
notes; a wiki impact pass that names the pages it skips. Does not apply: the version ledger, the `FeatherSpecVersion:` stamp,
the update rehearsal (they serve the template's updater).

### 6.10 Gregor's preparation list (manual)

1. **JetBrains Account** on plugins.jetbrains.com (an existing one is fine).
2. **Vendor profile** (individual, `Gregor Biswanger`) with a working website and e-mail (guideline 1.3a); trader or non-trader
   status declared (EEA, guideline 3.5).
3. **JetBrains Marketplace Developer Agreement**, accepted at the first upload.
4. **Certificate** with the three `openssl` commands of *Plugin Signing* (Git for Windows ships `openssl`): `private_encrypted.pem`
   with a password, `chain.crt`; the plain `private.pem` is deleted once `chain.crt` exists; key and password go into his password
   manager; the expiry date into the checklist.
5. **GitHub environment** `jetbrains-marketplace` in the repository settings, required reviewer `GregorBiswanger`, deployment
   restricted to tags `jetbrains-v*`.
6. **Environment secrets**: `CERTIFICATE_CHAIN` (Base64 of `chain.crt`), `PRIVATE_KEY` (Base64 of `private_encrypted.pem`),
   `PRIVATE_KEY_PASSWORD`; after the 0.1.0 approval `PUBLISH_TOKEN` (*My Tokens*).
7. **First upload** of the signed ZIP and the page fields of §6.5, screenshots included.
8. **Every Go** of §3, written in the PR or the checklist.

### 6.11 PR, merge and cleanup

- The PR `jetbrains-host` → `main` is opened only when G0 holds and every job of `ci.yml` and `jetbrains.yml` is green at one head;
  its description lists the run IDs, every VS Code-visible change of §6.7 and the G0 evidence.
- Merge with a merge commit (as PR #3 and #4) (proxy, OP-013); CI on `main` green before a tag is pushed.
- After both releases are live: local and remote `jetbrains-host` deleted; local build outputs (`jetbrains/build/`, `*.vsix`)
  removed; the other remote branches (`post-release-docs`, `release-polish`, `ux-round-2`, `ux-round-3`) listed for Gregor, not
  deleted (proxy, OP-020).
- Wiki `C:\projects\featherspec.wiki`: one line in *Hands-On Walkthrough* that the Studio also runs in Rider and WebStorm from the
  JetBrains Marketplace (0034 OP-015); the *Releasing* page is not changed (proxy, OP-019).

### 6.12 Gates

- **G0 — preconditions:** 0034 and 0035 are `Implemented` in `done/` with archived plans; the checklist sections *JetBrains
  (manual)* and *Send and Copy for in JetBrains (manual)* are ticked by Gregor with the IDE versions; *Cold start on Windows*
  carries both measured values. Stage 1 may run before G0; the CHANGELOG, README and version work and the PR wait for it
  (proxy, OP-021).
- **G1 — workflow ready:** the release guards green locally; `jetbrains.yml` all green with the new verifier failure level.
- **G2 — PR ready:** every job of `ci.yml` and `jetbrains.yml` green at one head; Gregor's Go for the merge.
- **G3 — signed:** tags pushed; the sign run green; Gregor's preparation list items 1–6 done.
- **G4 — approved:** the Marketplace shows version 0.1.0 publicly; Gregor's install check passed.
- **G5 — done:** VS Code 0.2.0 live, both GitHub releases, wiki line, cleanup, `/sdd-compile` READY.

## 7. Texts (English, drafts; the tests assert the final wording literally, Gregor may change it)

**Description** (`plugin.xml`, CDATA; wording as built in T-003, 2026-11-26: the Send of 0035 replaced Copy for Copilot and Copy for Junie):

> FeatherSpec Studio is the visual command center for spec-driven development with FeatherSpec: it reads your specs, plans and
> Memory Bank, shows where every spec stands, and names each spec's next FeatherSpec step.
> - **Specs tool window**: your specs in four groups, each with its next step.
> - **Overview, Board and Plan map** in an editor tab, in the colours of your IDE theme.
> - **Copy prompt**: the exact FeatherSpec prompt on your clipboard, ready to paste into your AI assistant.
> - **Send to Junie, Claude Code or GitHub Copilot** types the prompt and its file mentions into that assistant's command-line
>   agent in the IDE terminal (`junie`, `claude`, `copilot`); when you click it, it may start the agent in a new terminal tab. It
>   never presses Enter. An assistant is offered only while its command is on the IDE's PATH.
>
> The Studio sends nothing. It is local and read-only: no account, no telemetry; the one network call is the FeatherSpec download
> you start with Set up FeatherSpec. It needs the IDE's embedded browser (JCEF).
>
> It runs in IntelliJ-based IDEs from version 2025.3.1: Rider, WebStorm, PhpStorm, IntelliJ IDEA, PyCharm, GoLand, CLion, RubyMine
> and RustRover. It is tested in Rider and WebStorm; the other IDEs are checked with the JetBrains Plugin Verifier.
>
> Junie, Claude Code and GitHub Copilot are products of their owners; FeatherSpec Studio works with them and is not affiliated
> with them. Source, documentation and privacy: github.com/GregorBiswanger/featherspec-studio.

**Change notes 0.1.0:** `First release on the JetBrains Marketplace: the Specs tool window, Overview, Board and Plan map, the
status bar entry and the settings, with the same next steps as the VS Code extension. The setting Assistant offers Send to Junie,
Claude Code and GitHub Copilot, which type into the command-line agent in the IDE terminal and never press Enter; Copy prompt
stays in every menu. Full history: CHANGELOG.md on GitHub.`

**Words that appear nowhere on the page** (name, description, change notes, vendor): `official`, `endorsed`, `partner`,
`certified`, `by Anthropic`, `by GitHub`, `Plugin`, `IntelliJ` (the name only: `JetBrains`).

## 8. Security, permissions and privacy

- Secrets live only in the environment `jetbrains-marketplace`; its required reviewer is the second key for every run that can
  read them. The workflow prints no secret; the Gradle plugin reads them from the environment.
- `pull_request` runs never see the secrets: the release workflow has no `pull_request` trigger.
- The signed ZIP passes the existing secret scan of `jetbrains/guards/pluginZip.mjs` (PEM header, secret assignments).

## 9. Non-functional requirements

- A sign run finishes within 90 minutes (the timeout of `jetbrains.yml › verify`).
- The plugin ZIP stays at most 60 MB (0034 AC-035); the Marketplace limit is 400 MB.

## 10. Error cases and edge cases

- Wrong ref or version mismatch → the run fails before signing and names tag and version (AC-003).
- Missing or wrong secret, or an expired certificate → `signPlugin` or `verifyPluginSignature` fails; nothing is uploaded.
- Verifier finds a problem on the release commit → the run fails; the fix goes through a new head, a new PR round and a new
  patch version if a tag was pushed.
- The Marketplace rejects the upload → the reasons go into the checklist; the fix ships as `0.1.1` with a new tag (AC-031).
- The review takes longer than 4 working days → Gregor writes to marketplace@jetbrains.com (guidelines, *Approval process*).
- A newer IDE release appears between G2 and the sign run → the sign run verifies the recommended set; a failure stops it.
- `main` moves after the PR was green → the merge waits for green CI at the new head (AC-026).
- The two hosts show different versions in the panel tooltip (0.2.0 and 0.1.0) → by design, two release lines (OP-007).

## 11. Acceptance criteria

Unless marked *manual*, a test decides each criterion: `node --test` guards under `jetbrains/guards/` and Vitest under
`src/adapters/node/` (local), the jobs of `jetbrains.yml` and `ci.yml` (CI), or the named workflow run.

**Release workflow**

- **AC-001** The repository shall contain `.github/workflows/jetbrains-release.yml` whose only trigger is `workflow_dispatch`, with
  the inputs `mode` (choice `sign`, `publish`) and `confirm`.
- **AC-002** If the input `confirm` is not exactly `publish`, then the release workflow shall run no job.
- **AC-003** If the run's ref is not a tag `jetbrains-v<version>` whose `<version>` equals the plugin version in
  `jetbrains/build.gradle.kts`, then the workflow shall fail before any Gradle step with a message that names the ref and the
  version.
- **AC-004** The release job shall run in the environment `jetbrains-marketplace`, and the names `CERTIFICATE_CHAIN`,
  `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD` and `PUBLISH_TOKEN` shall appear in no other workflow file of `.github/workflows/`.
- **AC-005** When the workflow runs in mode `sign`, it shall run, in this order, the package build, `buildPlugin`,
  `verifyPluginStructure`, `verifyPlugin`, `signPlugin`, `verifyPluginSignature`, the plugin ZIP guard on the signed ZIP and the
  upload of the artifact `plugin-zip-signed`, and shall not run `publishPlugin`.
- **AC-006** When the workflow runs in mode `publish`, it shall run every step of AC-005 and then `publishPlugin`, after the
  signature check.
- **AC-007** The release workflow shall neither call nor be called by another workflow, and `ci.yml` and `publish.yml` shall stay
  byte-identical to `START_COMMIT`.

**Signing and secrets**

- **AC-008** Where `CERTIFICATE_CHAIN` and `PRIVATE_KEY` are not set, the plugin build shall skip signing, and every job of
  `jetbrains.yml` shall pass as it does without this spec.
- **AC-009** `jetbrains/build.gradle.kts` shall read the signing inputs and the token only from the environment variables of §6.2
  and §6.4 and shall set the channel `default` and `hidden` false; no file of the repository shall contain a PEM block, and
  `.gitignore` shall exclude `*.pem`, `*.crt`, `*.key`, `*.p12` and `*.pfx`.
- **AC-010** *(sign run at `jetbrains-v0.1.0`)* `verifyPluginSignature` shall pass, and the signed ZIP shall pass
  `jetbrains/guards/pluginZip.mjs` (size, entries, byte-identical bundles, secret scan).

**Compatibility**

- **AC-011** The built `plugin.xml` shall carry version `0.1.0`, since-build `253.29346` and no until-build.
- **AC-012** The Plugin Verifier shall fail on compatibility problems, invalid plugin structure and internal API usage, and shall
  not fail on experimental API usage; at the release commit it shall report none of the three for the products and versions of
  §6.6.
- **AC-013** *(manual, Gregor, before G2)* On the day of G2, `verifyVersions` shall name the newest stable release of IntelliJ
  IDEA, WebStorm, Rider and PyCharm; Gregor records the versions in the checklist.

**Marketplace page**

- **AC-014** The `<description>` of `plugin.xml` shall be the English text of §7, shall name Claude Code, GitHub Copilot and Junie
  with what the Studio does for each, shall say that the Studio sends nothing, that Send to Claude Code may start `claude` when
  clicked and never presses Enter, and that there is no account and no telemetry, and shall contain no `<img>` element and no link
  outside `github.com/GregorBiswanger`.
- **AC-015** The name, description, change notes and vendor shall contain none of the words of §7's last paragraph, the name
  shall be at most 30 characters, and the description shall carry the sentence that the assistants belong to their owners and
  that FeatherSpec Studio is not affiliated with them.
- **AC-016** The `<change-notes>` of `plugin.xml` shall be the text of §7 for version 0.1.0, with no placeholder text.
- **AC-017** `plugin.xml` shall name the vendor `Gregor Biswanger` with the repository URL, and `pluginIcon.svg` and
  `pluginIcon_dark.svg` shall be SVG files of 40 × 40.
- **AC-018** *(manual, Gregor, at the first upload)* The Marketplace page shall show the licence MIT with its link, the source
  code, issue tracker and documentation links of §6.5, tags from the Marketplace list and three Rider screenshots of 1280 × 800;
  every link and picture shall load.

**VS Code release**

- **AC-019** `package.json` shall carry version `0.2.0`, and its diff against `main` shall change only the `version` value.
- **AC-020** The `## [0.1.0] - 2026-11-20` section of `CHANGELOG.md` shall be byte-identical to the one at `bf236fc`; a section
  `## [0.2.0] - <release day>` above it shall name the empty-state step action, the JetBrains plugin 0.1.0 with Send to Claude
  Code, Copy for Copilot and Copy for Junie, and the README change; the file shall end with the compare links of §6.8.
- **AC-021** README *JetBrains IDEs* shall say how to install from the JetBrains Marketplace and from the release ZIP, shall not
  contain `not on the JetBrains Marketplace yet`, and shall keep the heading that gives the anchor `#jetbrains-ides`.
- **AC-022** At the PR head, every VS Code text and behaviour shall equal `main` except §6.7's changes: the guards of 0034 AC-039
  and 0035 AC-026 (start-commit tests, baselines, golden file, rendered texts, `.vsix` file list) shall pass in CI and `npm test`
  shall pass on Gregor's Windows machine.

**PR, tags, releases**

- **AC-023** *(G0)* The PR shall not be opened while 0034 or 0035 is outside `done/`, while a box of the checklist sections
  *JetBrains (manual)* or *Send and Copy for in JetBrains (manual)* is open, or while *Cold start on Windows* lacks a measured value.
- **AC-024** If the measured core-ready time is above 12 s or the first panel frame above 1 s, then the release shall stop until
  Gregor records in the checklist either a fix first or a release with the value named in the release notes.
- **AC-025** The PR shall be opened only when every job of `ci.yml` and `jetbrains.yml` is green at its head, and its
  description shall list the run IDs, the VS Code-visible changes of §6.7 and the G0 evidence.
- **AC-026** If a job is red, or the head moved after the green runs, then the PR shall not be merged before every job is green
  at the new head.
- **AC-027** When Gregor gives the Go for the merge, the PR shall be merged with a merge commit, and no tag shall be pushed before
  `ci.yml` is green on that commit.
- **AC-028** The annotated tags `v0.2.0` and `jetbrains-v0.1.0` shall name the release commit, and `v0.1.0` shall name `bf236fc`,
  each with the message of §6.1; the version in each tagged tree shall equal its tag.
- **AC-029** For `v0.2.0` and for `jetbrains-v0.1.0` there shall be a GitHub release whose notes are the CHANGELOG's 0.2.0
  section, and the release `jetbrains-v0.1.0` shall carry the signed ZIP of the sign run.

**Gregor's part (manual)**

- **AC-030** *(manual, Gregor)* The items 1–6 of §6.10 shall be done before the sign run, each ticked with its date in the 0036
  checklist section, and no secret value shall appear in the repository, a workflow log or the chat.
- **AC-031** *(manual, Gregor)* The signed ZIP of the sign run shall be the first upload; the upload and approval dates and any
  review remark shall be recorded; if JetBrains rejects it, the fix shall ship as `0.1.1` with a new tag, and the VS Code
  release shall go ahead only on Gregor's decision.
- **AC-032** *(manual, Gregor, after the approval)* *FeatherSpec Studio* installed from **Settings | Plugins | Marketplace** in
  Rider and WebStorm shall show version 0.1.0, install without a signature warning and open the Studio on
  `C:\projects\test\tip-splitter`; versions recorded.
- **AC-033** *(manual, Gregor)* The VS Code Marketplace shall show `GregorBiswanger.featherspec-studio` 0.2.0 after Gregor's run
  of `publish.yml`, with the run ID recorded.

**Docs and cleanup**

- **AC-034** `docs/release-checklist.md` shall carry, after `## Go`, a section `## JetBrains Marketplace and VS Code 0.2.0 (0036)`
  listing AC-013, AC-018, AC-023, AC-024 and AC-030–AC-033 and the step order of §5; `AGENTS.md` shall stay at most 15 000 bytes
  and `.memory-bank/activeContext.md` below 7000 bytes.
- **AC-035** *(after G4)* The branch `jetbrains-host` shall exist neither locally nor on `origin`, `jetbrains/build/` and every
  `*.vsix` shall be gone from the working copy, the other remote branches shall be listed for Gregor, and the wiki page
  *Hands-On Walkthrough* shall carry the JetBrains line of §6.11.

## 12. Technical notes for developers or AI agents

- Repository state at writing (`0431707`): IntelliJ Platform Gradle Plugin `2.20.1`, Kotlin `2.4.21`, Gradle `9.7.0` in CI,
  `intellijIdea("2025.3.1")`; `pluginConfiguration` already sets ID, name, version `0.1.0`, vendor name, since-build and
  `untilBuild = provider { null }`; `pluginVerification.failureLevel` is `COMPATIBILITY_PROBLEMS` only; `verifyVersions` are
  `2025.3.1` and `2026.3`. `plugin.xml` has a one-sentence description and no change notes.
- 2.x extension (JetBrains docs): `signing { certificateChain; privateKey; password }` default to the environment variables
  `CERTIFICATE_CHAIN`, `PRIVATE_KEY`, `PRIVATE_KEY_PASSWORD`; `publishing { token }` defaults to `PUBLISH_TOKEN`, `channels`
  to `listOf("default")`, `hidden` to false. Multi-line values may be Base64; the plugin decodes them. `signPlugin` runs before
  `publishPlugin` only when chain and key are set; `publishPlugin` uploads the signed archive then.
- `jetbrains.yml › vscode-guards` diffs `ci.yml` and `publish.yml` against `START_COMMIT`; `sameBundles.mjs` already counts
  `.github/workflows/jetbrains*` as JetBrains-only, so `jetbrains-release.yml` keeps a JetBrains-only push JetBrains-only.
  `node --test 'jetbrains/guards/*.test.mjs'` picks up new guard tests in CI.
- Tests that pin the CHANGELOG's history (`docsScan.test.ts`: `firstRelease()`, "one first release, dated on the release day")
  and the checklist's *Go* wording must be amended in the same step as the CHANGELOG change: `firstRelease()` reads the
  `## [0.1.0]` section, and the "one release" check becomes "0.1.0 byte-identical to `bf236fc`". The 0035 doc tests only check
  that the CHANGELOG contains their sentences, wherever they stand.
- `docsScan.test.ts` forbids bare `copilot` and `provider`, and `drag`, in README and the checklist: write `GitHub Copilot`.
- The parity matrix (`docs/jetbrains/parity.md`) lists every criterion of `active/` and `done/`: 0036's rows are `n-a`
  (release process, no product behaviour) through one `default` rule in `parity-source.json`.
- `studioVersion` in the panel comes from each host's own version (VS Code `package.json`, JetBrains the plugin version).

## 13. Assumptions

| ID | Assumption | Why we believe it | What breaks if it is wrong |
| --- | --- | --- | --- |
| A-001 | Encrypted PEM key plus password works with `signPlugin` | 2.x `signing.password` "decrypts the private key" (extension docs) | use the plain key; the password secret goes |
| A-002 | Environment protection with a required reviewer is free for this repository | the repository is public since 2026-11-20 (checklist *Go*); GitHub offers it for public repositories | the Go is the `confirm` input and Gregor's own start only |
| A-003 | The code uses no internal API that the verifier reports | 0035 reads `PluginManagerCore` only through methods it treats as public (K-1); no report yet | AC-012 goes red at G1; a fix step comes first |
| A-004 | The review of a new free plugin takes days, not weeks | guidelines: no guarantee, mail after 3–4 working days; a release page names two business days; a forum thread reports more than two weeks | G4 waits; VS Code may go first on Gregor's decision (OP-014) |
| A-005 | Rider and WebStorm accept a plugin with an open until-build | 0034 AC-033 and AC-034 (verifier green on 2026.3); JetBrains docs allow an open range and check Marketplace plugins automatically | the Marketplace restricts the range; add `untilBuild` in a patch |
| A-006 | `jetbrains-v*` tags can be the deployment rule of the environment | GitHub environments support tag patterns as deployment rules | the reviewer alone guards the run |

## 14. Open points

None blocks the plan. Proxy decisions of the clarify pass (2026-11-23, orchestrator's agent as product-owner proxy, from 0034 §6.10,
OP-014, OP-015, 0035, PD-098, PD-110, PD-111, the Releasing guide and JetBrains' documentation); Gregor may flip any of them:

- OP-001 (proxy) Folder and status: `active/`, In Progress, plan Not started, as the orchestrator asked (as 0035 OP-001).
- OP-002 (proxy) One release commit for both products; JetBrains is signed first, VS Code published after the approval.
- OP-003 (proxy) Only `workflow_dispatch` with `mode` and `confirm`; no tag trigger; the environment `jetbrains-marketplace` with
  Gregor as required reviewer holds the secrets.
- OP-004 (proxy) Secrets with several lines are stored Base64-encoded; `PRIVATE_KEY` is the encrypted key.
- OP-005 (proxy) Self-signed certificate, RSA 4096, 365 days as in JetBrains' example; the expiry goes into the checklist.
- OP-006 (proxy) Channel `default` only, not hidden; no EAP channel.
- OP-007 (proxy) VS Code 0.2.0 (new behaviour, MINOR); the plugin stays 0.1.0 on its own line (0034 OP-014).
- OP-008 (proxy) One CHANGELOG; 0.1.0 restored to its published bytes, everything since in 0.2.0, the plugin's release inside it.
- OP-009 (proxy) Description and change notes hand-written in `plugin.xml`; no Gradle Changelog Plugin.
- OP-010 (proxy) Assistants by product name in text only, plus the non-affiliation sentence; no third-party logo.
- OP-011 (proxy) The verifier also fails on internal API usage and invalid structure, in `verify` too; experimental stays allowed.
- OP-012 (proxy) VS Code tags `v<version>`; the retroactive `v0.1.0` on `bf236fc`.
- OP-013 (proxy) Merge commit, as PR #3 and #4.
- OP-014 (proxy) VS Code is published after the JetBrains approval, so its README's Marketplace line is true; after 5 working days
  without a result Gregor may publish VS Code first.
- OP-015 (proxy) `PUBLISH_TOKEN` is created after the 0.1.0 approval; the publish mode is first used by the next update (0037).
- OP-016 (proxy) Three Rider screenshots at 1280 × 800 on the page, none in the description; copies in `media/screenshots/jetbrains/`.
- OP-017 (proxy) Tags proposal AI, Productivity, Project Management; Gregor picks from the Marketplace's list.
- OP-018 (proxy) `plugin.xml` vendor carries name and repository URL; the e-mail only in the vendor profile.
- OP-019 (proxy) The wiki gets one line in *Hands-On Walkthrough*; *Releasing* stays as it is.
- OP-020 (proxy) Cleanup deletes only `jetbrains-host` and local outputs; other branches are listed for Gregor.
- OP-021 (proxy) G0 gates the CHANGELOG, README, version and the PR; the workflow and Gradle stage may run before it.
- OP-022 `/sdd-clarify` 2026-11-23 (stranger pass, role-played; no subagent available): 9 findings, 2 blocking; all resolved by
  proxy (Gregor confirms with the plan):
  - (blocking) "signing only after Gregor's Go" had no mechanism; `confirm` alone is typed by whoever starts the run → the
    environment with a required reviewer (OP-003, AC-004).
  - (blocking) The CHANGELOG's 0.1.0 section holds 0035 entries that never shipped, and `docsScan.test.ts` pins "one release"
    → 0.1.0 restored byte-identical to `bf236fc`, tests amended in the same step (OP-008, AC-020, §12).
  - "Publish" was used for the first upload and for `publishPlugin` → §3 terms; the first upload is manual (§6.4).
  - "latest stable release" moved with the calendar → AC-013 fixes it on the day of G2.
  - README saying "Marketplace" while the review runs → OP-014.
  - Version of the VS Code release was unnamed → OP-007.
  - No tag existed for VS Code 0.1.0, so a compare link had no base → OP-012.
  - "Aufräumen" did not say which branches → OP-020.
  - A rejected upload had no path → AC-031, §10.

## 15. Definition of Ready, Done and next steps

Ready: clarified 2026-11-23 (§14); the proxies wait for Gregor's read; G0 is a gate inside the plan. Done per `AGENTS.md`:
AC-001–AC-012, AC-014–AC-017, AC-019–AC-022, AC-025–AC-029, AC-034 and AC-035 proven by tests, CI and the recorded runs; AC-013,
AC-018, AC-023, AC-024 and AC-030–AC-033 checked by Gregor; both products live. Next: Gregor reads the plan
[0036-jetbrains-marketplace-release.plan.md](0036-jetbrains-marketplace-release.plan.md) and starts his preparation list; after
this release, the update with 0037 and the cleanup of 0014–0027.
