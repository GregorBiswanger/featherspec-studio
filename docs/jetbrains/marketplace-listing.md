# JetBrains Marketplace listing: texts for the first upload

For Gregor's first upload of the signed ZIP (spec 0036 §6.5, §6.10 item 7). The ZIP already carries the name, vendor,
description and change notes from `jetbrains/src/main/resources/META-INF/plugin.xml`; the upload form fills them from it.
The guard `jetbrains/guards/pluginPage.test.mjs` pins those texts. Everything below is for the form fields that `plugin.xml`
cannot fill. Field names follow JetBrains' upload page and may differ slightly.

## Account and vendor

- Vendor profile: https://plugins.jetbrains.com/vendor/gregor-biswanger (name `Gregor Biswanger`).
- The vendor profile holds the public e-mail address and website (guideline 1.3a); `plugin.xml` carries only the name and the repository URL.
- Accept the JetBrains Marketplace Developer Agreement at the first upload. State trader or non-trader status (guideline 3.5).

## Name and one-line summary

- Name: `FeatherSpec Studio` (from `plugin.xml`; 18 characters).
- Summary, if the form asks for one line: `Visual command center for spec-driven development with FeatherSpec: specs, plans, next steps and Copy prompt, in your IDE.`

## Description

Taken from the ZIP. If the form asks for it again, copy the text between `<description><![CDATA[` and `]]>` in `plugin.xml`.
It names Junie, Claude Code and GitHub Copilot in plain text only, says that the Studio sends nothing, that Send may start
the assistant's command-line agent in a new terminal tab when you click it and never presses Enter, and that there is no
account and no telemetry. It names Rider, WebStorm, PhpStorm, IntelliJ IDEA, PyCharm, GoLand, CLion, RubyMine and RustRover
and says honestly that only Rider and WebStorm are tested by hand; the others are checked with the Plugin Verifier.
No images belong in the description; use the media section.

## Change notes (0.1.0)

Taken from the ZIP (`<change-notes>` in `plugin.xml`).

## Links

| Field | Value |
| --- | --- |
| License | MIT, https://github.com/GregorBiswanger/featherspec-studio/blob/main/LICENSE |
| Source code (required for open source, guideline 3.3) | https://github.com/GregorBiswanger/featherspec-studio |
| Issue tracker | https://github.com/GregorBiswanger/featherspec-studio/issues |
| Documentation | https://github.com/GregorBiswanger/featherspec-studio#jetbrains-ides |
| Privacy policy | none needed: the Studio collects no personal data (guideline 3.4); the README's privacy section is linked from the description's repository link |

The documentation link works once the PR with the README section *JetBrains IDEs* is merged into `main`; upload after the merge.

## Tags

Pick from the Marketplace's own list; proposal: `AI`, `Productivity`, `Project Management`. If a tag is not offered, take the nearest one.

## Screenshots

Three screenshots of Rider at 1280 x 800, kept under `media/screenshots/jetbrains/` (the `.vsix` excludes that folder):

1. The Overview beside the tool window.
2. The Board.
3. A spec detail with Send to Claude Code.

No third-party logo in a screenshot's frame (guidelines 1.2c, 1.8b).

## Icon

`pluginIcon.svg` and `pluginIcon_dark.svg` in the ZIP (40 x 40 SVG, the FeatherSpec feather). Nothing to upload.

## Compatibility the page shows

Since build `253.29346` (2025.3.1), no until build. One plugin for every IntelliJ-based IDE that has the embedded browser (JCEF).
The plugin depends only on `com.intellij.modules.platform` and `com.intellij.modules.jcef`; the Terminal plugin is optional.

## After the first approval

Create the token under *My Tokens* and store it as the environment secret `PUBLISH_TOKEN` of `jetbrains-marketplace`.
Later versions go out with the workflow *JetBrains release* in mode `publish`; the first version is always uploaded by hand.
