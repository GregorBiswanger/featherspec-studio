# 19 · Arbeitsauftrag: Projekt für Junie vorbereiten (Spec 0037)

Stand 22.11.2026. Für das Studio-Team. Das Konzept mit Begründungen und Quellen steht in [18-junie-bootstrap.md](18-junie-bootstrap.md). Was hier steht, gilt erst nach Gregors Entscheidungen in §1.

**Rolle:** Diese Datei ist die Vorlage für `/sdd-specify` der Spec **0037 „Prepare a project for Junie“**. Wer die Spec schreibt, übernimmt §4–§8 und klärt §1 vorher.

## 1 Vor dem Start (Gate G0)

| # | Was | Wer | Ergebnis |
| --- | --- | --- | --- |
| G0-1 | PD-108 „ehrlich-hybrid“: Claude Code bekommt Send über das Terminal, Copilot und Junie bekommen Copy for … ; ändert PD-105 | Gregor | Zeile in `docs/product/product-decisions.md` |
| G0-2 | PD-109 „Junie-Bereitschaft“: Absicht schaltet frei (nur *Assistant = Junie*), Dateien entscheiden, das Studio kopiert den Prompt und schreibt nichts, `Hide` pro Projekt | Gregor | Zeile in `product-decisions.md` |
| G0-3 | Spike J-1 in Rider (Skript in §2) | Gregor, ca. 30 min | Ergebnistabelle in 0037 §Assumptions |
| G0-4 | 0035 liefert die Einstellung *Assistant* mit der Option `junie` und „Copy for Junie“ | 0035 | 0037 baut darauf auf. Ohne 0035 entfallen AC-008 und AC-009 vorerst. |

**Abhängigkeit:** 0037 wird erst geplant, wenn G0-1 bis G0-3 erledigt sind. Das Ergebnis von J-1 ändert die Bereitschaftsregel (§4.2, Zweig B).

## 2 Spike J-1 (manuell, Rider 2026.3, AI Chat mit Junie)

Vorbereitung: Gregor legt unter `C:\projects\test\` drei Kopien von `tip-splitter` an:
- `j1-none`: ohne `.junie/`.
- `j1-ready`: mit 13 Loadern und Playbook, erzeugt mit dem Prompt aus §5.
- `j1-override`: wie `j1-ready`, zusätzlich mit `.junie/AGENTS.md`, die nur einen Satz enthält.

| # | Prüfung | j1-none | j1-ready | j1-override |
| --- | --- | --- | --- | --- |
| 1 | Erscheint `/sdd-overview` im `/`-Menü des AI Chat mit Junie? | | | |
| 2 | `/sdd-overview` eintippen und senden: Führt Junie den FeatherSpec-Workflow aus und liest `.claude/commands/sdd-overview.md`? | | | |
| 3 | Frage „Which instruction files did you load for this task?“: Nennt Junie `AGENTS.md`, `.junie/playbook.md` bzw. `.junie/AGENTS.md`? | | | |
| 4 | Prompt aus §5 in `j1-none` einfügen: Legt Junie die Dateien an, fragt es vor dem Schreiben, ist `.junie/` (ohne `.junie/plans/`) danach mit `j1-ready` identisch? | | | |
| 5 | Prompt ein zweites Mal ausführen: Ändert sich keine Datei (idempotent)? | | | |
| 6 | Junie-Plugin `org.jetbrains.junie` deinstallieren: Ist Junie im AI Chat weiter wählbar? | | | |

**Zweige:**
- **A:** Zeile 1 oder 2 ist in `j1-ready` *ja*, in `j1-none` *nein*. Dann gilt das Konzept wie geschrieben.
- **B:** Zeile 2 ist auch in `j1-none` *ja*, weil Junie die Befehlstabelle in `AGENTS.md` nutzt. Dann prüft die Bereitschaft nur noch das Playbook: none ⇔ kein Playbook. T-7a, T-7b und T-8 entfallen; T-5 im Welcome und T-7c bleiben. Gregor entscheidet.
- **C:** Zeile 1 und 2 sind auch in `j1-ready` *nein*. Dann formuliert 0035 „Copy for Junie“ ohne Slash-Befehl (18 §8 E-2), und 0037 prüft nur das Playbook.
- **Zeile 6:** Ist sie *ja*, bleibt die Verfügbarkeitsregel AC-002 mit `com.intellij.ml.llm`.

## 3 Grenzen (nicht verhandelbar)

- Das Studio schreibt keine Datei unter `.junie/` und kein anderes Projektfile. Die Grenze in `AGENTS.md` (`boundaries`: „Only the setup (0014) writes …“) bleibt unverändert.
- **Copilot- und Claude-Code-Nutzer** sehen keinen Junie-Hinweis, keine Junie-Problemzeile und keine Junie-Meldung (AC-001).
- **Junie-Hinweise erscheinen nie:**
  - als Balloon beim Projektöffnen,
  - im Specs-Baum, in der Statusleiste, im Badge oder auf dem Board,
  - im Zustand S2.
- **VS Code:** Das Verhalten ändert sich nicht, die Texte bleiben byte-gleich, `.vsix` und CI bleiben grün. `featherspec-studio.assistant` bekommt keinen Wert `junie`.
- **Kein Zugriff auf Junie-Interna:** keine Junie-Klassen, keine Junie-Einstellungen lesen, keine Abhängigkeit auf `org.jetbrains.junie`. Erlaubt ist nur die Abfrage, ob ein Plugin installiert und aktiv ist.
- **Keine Kopie des Prompts:** Der Prompt existiert genau einmal, als Golden-Datei. Issue #17 bekommt nur einen Verweis darauf (FeatherSpec-Seite, Gregor).

## 4 Verhalten (Kurzform aus 18 §4–§6)

### 4.1 Absicht

- **A0:** Kein Junie verfügbar, also weder `org.jetbrains.junie` noch `com.intellij.ml.llm` installiert und aktiv. Es gibt nichts zu Junie.
- **A1:** Junie verfügbar, *Assistant* ≠ `junie`. Nur Find Action *Prepare Project for Junie* und die Einstellungsoption sind sichtbar.
- **A2:** Junie verfügbar wie A1 **und** *Assistant* = `junie`. Die Bereitschaft nach §4.2 wird angezeigt.
- **Laufzeit:** Ein Wechsel der Einstellung oder der Plugins wirkt sofort, ohne Neustart (AC-020).
- **VS Code:** immer A0.

### 4.2 Bereitschaft des aktiven FeatherSpec-Projekts (pure Funktion im Core, berechnet ab A1, angezeigt in A2)

```
C = { n | .claude/commands/sdd-n.md is a file }
J = { n | .junie/commands/sdd-n.md is a file whose text contains ".claude/commands/sdd-n.md" }
P = .junie/playbook.md is a file with a line "# FeatherSpec rules for Junie"
O = .junie/AGENTS.md exists (any kind)

unknown  ⇔ C = ∅ or .claude/commands unreadable
           or no active project in the ready state (S1–S9)
           or the project root is not the IDE project base path
none     ⇔ not unknown and J = ∅ and not P
partial  ⇔ not unknown and not none and (C \ J ≠ ∅ or not P)
ready    ⇔ not unknown and C ⊆ J and P
missing  = sorted(C \ J)
```

Weitere Regeln:
- Ein vorhandenes `.junie/` ohne diese Dateien (etwa nur `.junie/plans/`) ergibt `none`.
- Bei mehreren Projekten zählt nur das aktive (`discovery.active`).
- Ein nicht vertrautes Projekt (Safe Mode) verhält sich wie ein vertrautes; das Studio liest nur und kopiert Text.
- **Nächster Befehl im Prompt** an jedem Ort: `setupRun === 'not run' ? '/sdd-setup' : '/sdd-overview'` (Setup-Zeichen aus 0029).

Typ:

```ts
export type JunieState = 'unknown' | 'none' | 'partial' | 'ready';
export interface JunieReadiness {
    state: JunieState;
    missing: readonly string[];
    playbook: boolean;
    override: boolean;
}
```
- Groß- und Kleinschreibung: Namen werden wie im Dateisystem verglichen. Auf Windows und macOS gilt `case-insensitive`, wie es `relativeInside` in `RootWatcher.kt` bereits tut.
- **Zweig B/C aus J-1:** J entfällt. Dann gilt `none ⇔ not P` und `ready ⇔ P`.

### 4.3 Orte (nur A2, nur ohne Hide, außer O und Find Action)

| Ort | none/partial | ready | O |
| --- | --- | --- | --- |
| Meldung nach *Set up FeatherSpec* (kept = 0) | T-3 + Aktion T-4 | heutiger Text | – |
| Meldung nach *Set up FeatherSpec* (kept > 0) | heutiger Text und Merge-Aktion. Danach führt das Welcome. | heutig | – |
| Welcome (`setupRun = 'not run'`, keine Specs) | Erster Eintrag T-5 mit Copy des Prompts und Tip T-14, Folgezeile T-6 · `/sdd-setup` | heutig | Zeile T-12 mit Tooltip T-13 unter den Einträgen |
| Overview *Problems* (Setup gelaufen) | Projektzeile T-7a, T-7b1/2/3 oder T-7c (Rangfolge 18 §6) mit Aktionen T-4 · T-7e, Tooltip T-7d | – | Projektzeile T-12, Tooltip T-13, ohne Aktion |
| Nach „Copy for Junie“ einer Zeile mit `/sdd-` | Rückmeldung T-8 statt „Copied“ | „Copied“ | – |
| Find Action `FeatherSpec Studio: Prepare Project for Junie` (A1 und A2, auch nach Hide) | kopiert den Prompt, Timeline-Meldung T-10; setzt Hide zurück | kopiert, T-11 | – |
| Find Action bei `unknown` | kopiert nichts, Meldung T-15 | – | – |

**Hide:** Schlüssel `junie.hidden` pro Projekt im Studio-Speicher (`UiMemory` / `WorkspaceStatePort`), nie in Projektdateien. Hide unterdrückt T-3, T-5/T-6, T-7a–c und T-8, aber nicht T-12. Zurückgesetzt wird es durch die Find Action.

**Texte:** genau die Tabelle in 18 §6, T-1 bis T-15, in **einem** neuen Modul `src/shared/protocol/junieTexts.ts`, jeder Text mit Test. Platzhalter: `<version>` und `<folder>` wie in `setUpMessage`, `<n>` und `<names>` mit höchstens 3 Namen in der Form `/sdd-x`.

## 5 Der Prompt (Golden-Datei)

**Ablage und Bau:**
- Datei: `src/core/junie/setupPrompt.golden.txt`.
- Erzeugung: `src/core/junie/setupPrompt.ts`, Funktion `junieSetupPrompt(nextCommand: '/sdd-setup' | '/sdd-overview'): string`.
- Test: byte-gleich mit der Golden-Datei für beide Werte, wie `mergePrompt.golden.txt`.

**Prüfung:** Der Text ist ein **Entwurf**. Er wird in J-1, Zeilen 4 und 5, geprüft und erst danach eingefroren.

```text
Prepare this FeatherSpec project for JetBrains Junie. FeatherSpec is already installed here; do not install, update or change it.

Goal: Junie reaches the FeatherSpec workflows and rules through thin adapters. The canonical sources stay where they are:
- AGENTS.md (project root): the constitution. Junie reads it itself.
- .claude/commands/sdd-*.md: the workflows.
- .claude/rules/*.md: the scoped rules.

Hard limits:
- Create or update files only under .junie/commands/ and the file .junie/playbook.md. Change no other file.
- Never create .junie/AGENTS.md and never write under .junie/rules/. Junie reads .junie/AGENTS.md alone when it exists, and loads every .junie/rules/ file into every task.
- Never copy, summarize or rewrite the content of a .claude/ file into .junie/.
- Running this again must give the same result: replace a file only if its content differs from what this prompt describes.

Step 1 — Commands
For every file .claude/commands/sdd-<name>.md create .junie/commands/sdd-<name>.md with exactly this content, where <description> is the description: line of the canonical file's frontmatter:

---
description: <description>
allowPromptArgument: true
---

# /sdd-<name>

Read [.claude/commands/sdd-<name>.md](../../.claude/commands/sdd-<name>.md) first and follow it exactly. It is the only source of this workflow; this file holds no rules of its own. AGENTS.md stays authoritative.

User input after the command: $prompt

Delete nothing. If .junie/commands/ holds an sdd-*.md file without a canonical counterpart, leave it and report it.

Step 2 — Playbook
Create .junie/playbook.md with this content, one line per file in .claude/rules/, using the globs of its paths: frontmatter:

# FeatherSpec rules for Junie

AGENTS.md is the constitution. Before you create, read or change a file that matches a pattern below, read the named rule and follow it. The rules in .claude/rules/ are the only source; do not copy them.

- `<glob>`, `<glob>` → .claude/rules/<rule>.md

Keep the playbook to these lines. If .junie/playbook.md already exists with other content, keep that content: replace the section from the line "# FeatherSpec rules for Junie" to the next heading of the same level, or append it once if it is missing.

Step 3 — Check
Report in a short list:
1. Each command file created, updated or unchanged; the number of .claude/commands/sdd-*.md files and of .junie/commands/sdd-*.md files.
2. Whether .junie/playbook.md was created, updated or unchanged, and the rules it names.
3. Whether .junie/AGENTS.md exists. If it does, say: "Junie reads only .junie/AGENTS.md in this project and ignores AGENTS.md and .junie/playbook.md. Remove .junie/AGENTS.md so that Junie loads both." Do not change it.
4. Any file you left alone and why.

Step 4 — Next
Tell the user to run {{nextCommand}} in Junie next. You cannot start it yourself.
```

**Bezug zur Bereitschaftsregel:**
- Der Loader enthält den Text `.claude/commands/sdd-<name>.md`. Daran erkennt §4.2 ihn.
- Das Playbook enthält die Zeile `# FeatherSpec rules for Junie`.
- Ändert jemand den Loader-Text, müssen Prompt und Regel gemeinsam geändert werden (AC-015).

## 6 Andockstellen im Code (gelesen bei `6e508e2`)

| Bereich | Datei | Änderung |
| --- | --- | --- |
| Bereitschaft (neu, pur) | `src/core/junie/readiness.ts` | Typ aus §4.2; `junieReadiness(fs: ReadOnlyFileSystem, root): Promise<JunieReadiness>`; die Bedingungen „kein aktives Projekt“ und „Wurzel ≠ IDE-Basis“ liefert der Host als Eingabe über `readDirectory`, `readText`, `stat` (`src/core/ports/readOnlyFileSystem.ts`); keine `vscode`-Importe (Core-Reinheit) |
| Prompt (neu) | `src/core/junie/setupPrompt.ts` + `.golden.txt` | §5 |
| Texte (neu) | `src/shared/protocol/junieTexts.ts` | T-1 bis T-15 |
| Absicht | neben `src/core/assistant/offer.ts` (`extensionPresence`) | Host liefert die Verfügbarkeit von `org.jetbrains.junie` / `com.intellij.ml.llm` und die Einstellung `assistant`. VS Code liefert für Junie nie etwas. |
| Welcome | `src/core/assistant/welcome.ts`, `WelcomeView` in `src/shared/protocol/overview.ts` | optional `prepare` (Intent T-5, Tip T-14, Folgezeile T-6) und `junieOverride` (T-12/T-13); `isWelcomeView` erweitern |
| Problems | `src/core/overview/problems.ts` (`projectProblems`), `ProblemLine` in `overview.ts` | `ProblemLine` optional `action: 'copyJunieSetup'` und `hide: true`; `isProblemLine` erweitern; Zeile nur in A2 |
| Protokoll | `src/shared/protocol/envelope.ts` (`PROTOCOL_VERSION = 11`), `messages.ts` | neue Anfragen `junie.copySetup`, `junie.hide`; Version nach den Protokollregeln erhöhen |
| Rückmeldung Copy for | Copy-for-Umsetzung aus 0035 | Variante T-8 bei Zeilen mit `/sdd-` und Zustand none/partial |
| Setup-Meldung | `src/core/setup/setupReport.ts` (Z. 100–108), `setupTexts.ts` | bei A2, kept = 0 und Zustand ≠ ready: T-3 und Aktion T-4; Zustand **nach** dem Schreiben berechnen, nicht annehmen |
| Hide | `WorkspaceStatePort` (`src/core/ports/host.ts`), JetBrains `UiMemory.kt` | Schlüssel `junie.hidden` |
| Watcher (JetBrains) | `jetbrains/.../ports/RootWatcher.kt` (`WatchedPaths`) | `isReported`: `.junie/commands/*`, `.junie/playbook.md`, `.junie/AGENTS.md`, `.claude/commands/*`; `isWatchedDirectory`: `.junie`, `.junie/commands`, `.claude/commands`; `hasUnsavedOverlay`: `.junie/` (Agents ändern Documents, Fix vom 22.11.) |
| Plugin-Verfügbarkeit (JetBrains) | neu neben `StudioProjectService.kt` | `PluginManagerCore.isPluginInstalled(PluginId)` (dokumentiert) und Aktiv-Prüfung; Änderungen über `DynamicPluginListener` melden. **Kein** `getPlugin`, das ab 2026.2 `@Internal` ist; `StudioProjectService.kt:281` nutzt es heute schon, separates Ticket |
| Find Action | `jetbrains/.../actions/ActionTable.kt` | Zeile `core("prepareJunie", "FeatherSpec Studio: Prepare Project for Junie", "junie.prepare")`, neue `Need.JUNIE` (sichtbar ab A1) in `ActionRules` |
| Einstellung | `jetbrains/.../settings/SettingsTable.kt`, `StudioConfigurable.kt` | kommt mit 0035; Option `Junie` (T-1, T-2) nur ab A1 |
| Parität | `docs/jetbrains/parity-source.json`, Generator `src/adapters/node/parity.ts` | jedes AC von 0037 einordnen: JetBrains-only = `deliberately different` mit PD-109 |
| Doku | `README.md` Abschnitt „JetBrains IDEs“, `CHANGELOG.md`, `docs/release-checklist.md` | Absatz „Junie“ mit E-6 (Content Root); Prüfpunkte aus §8 |

## 7 Akzeptanzkriterien (Entwurf für 0037)

**Fixtures** unter `test/fixtures/`. Basis ist `fs-setup-done-no-specs` bzw. `fs-setup-not-run`, **ergänzt** um die 13 kanonischen `.claude/commands/sdd-*.md` (mit `description:`) und die 8 `.claude/rules/*.md` (mit `paths:`) aus FeatherSpec 1.11.0. Diese Basen haben heute keinen `.claude/`-Ordner, ohne die Ergänzung wäre jeder Zustand `unknown`. Nur `fs-junie-unknown` bleibt ohne `.claude/commands/`.
- `fs-junie-none`: kein `.junie/`.
- `fs-junie-plans-only`: nur `.junie/plans/p.md`.
- `fs-junie-ready`: 13 Loader + Playbook aus dem Prompt.
- `fs-junie-partial`: wie ready, ohne `sdd-clean.md`.
- `fs-junie-noplaybook`: 13 Loader, kein Playbook.
- `fs-junie-override`: ready + `.junie/AGENTS.md`.
- `fs-junie-unknown`: ohne `.claude/commands/`.
- `fs-junie-welcome`: Basis `fs-setup-not-run`, ohne `.junie/`.
- `fs-junie-welcome-ready`: Basis `fs-setup-not-run`, mit 13 Loadern und Playbook.
- `fs-junie-welcome-partial`: Basis `fs-setup-not-run`, Loader ohne `sdd-clean.md`.
- `fs-junie-welcome-override`: wie `fs-junie-welcome-ready`, mit `.junie/AGENTS.md`.

- **AC-001** With the Assistant setting other than Junie, the rendered Overview, Board, Welcome, tree, status entry and setup notification of every fixture shall contain no text from `junieTexts.ts`.
- **AC-002** Junie shall count as available only while `org.jetbrains.junie` or `com.intellij.ml.llm` is installed and enabled; a plugin install, uninstall, enable or disable shall update availability without an IDE restart.
- **AC-003** In VS Code no fixture shall show a Junie text; the existing VS Code view snapshots shall stay unchanged and the `.vsix` file list shall gain no file.
- **AC-004** `junieReadiness` shall return `none` for `fs-junie-none` and `fs-junie-plans-only`, `ready` for `fs-junie-ready` and `fs-junie-override`, `partial` with `missing = [clean]` for `fs-junie-partial`, `partial` with `playbook = false` for `fs-junie-noplaybook`, `unknown` for `fs-junie-unknown`, and `override = true` only for `fs-junie-override` and `fs-junie-welcome-override`.
- **AC-005** A loader whose text does not contain its canonical path shall count as missing.
- **AC-006** With Assistant Junie, `fs-junie-welcome` and `fs-junie-welcome-partial` shall show T-5 with Copy and Tip T-14 as the first Welcome entry and T-6 with `/sdd-setup` as its follow-up; `fs-junie-welcome-ready` shall show today's Welcome; `fs-junie-welcome-override` today's Welcome plus T-12 with tooltip T-13.
- **AC-007** With Assistant Junie, the Overview of `fs-junie-none` shall show one project line T-7a with the actions T-4 and T-7e and tooltip T-7d; `fs-junie-partial` T-7b1 naming `/sdd-clean`; `fs-junie-noplaybook` T-7c; `fs-junie-ready` no Junie line.
- **AC-008** After a setup with no kept file and Assistant Junie, the notification shall read T-3 with the single action T-4; with kept files it shall be unchanged.
- **AC-009** After Copy for Junie of a line with `/sdd-` in `fs-junie-none`, the feedback shall read T-8; in `fs-junie-ready` it shall read as today.
- **AC-010** T-4 and Prepare Project for Junie shall copy `junieSetupPrompt('/sdd-setup')` while setup has not run and `junieSetupPrompt('/sdd-overview')` otherwise, write no file, and the prompt shall be byte-equal to the golden file.
- **AC-011** Hide shall remove T-3, T-5/T-6, T-7a–c and T-8 for that project only, survive an IDE restart, leave T-12 visible, and be reset by Prepare Project for Junie.
- **AC-012** With Assistant Junie, `fs-junie-override` shall show T-12 with tooltip T-13 and no action; with another assistant it shall not.
- **AC-013** Prepare Project for Junie shall be listed in Find Action while Junie is available, also with another assistant and after Hide, and not while it is unavailable; it shall show T-10 in `fs-junie-none` and T-11 in `fs-junie-ready`.
- **AC-014** Creating, changing or deleting a file under `.junie/commands/`, `.junie/playbook.md`, `.junie/AGENTS.md` or `.claude/commands/` by an external process or as an unsaved IDE document shall update every Junie surface within 2 s (PD-106).
- **AC-015** A test shall fail when the loader text in the golden prompt and the marker that §4.2 searches for diverge.
- **AC-016** No Junie surface shall appear as a balloon at project open, in the Specs tree, the status entry, the tool window title count or the Board.
- **AC-017** Every text of T-1 to T-15 shall exist once in `junieTexts.ts` and be asserted by a test, including T-7b1/2/3 for 1, 3 and 4 missing commands.
- **AC-018** Every AC of 0037 shall have a row in the parity matrix.
- **AC-019** *(manual, Rider, Gregor)* The walkthrough of §8 passes for the three personas.
- **AC-020** Switching the Assistant setting between Junie and another assistant, or enabling or disabling the Junie plugins, shall add or remove every Junie surface within 2 s and without a restart.
- **AC-021** With no active project, with several projects and none selected, or with a project root that is not the IDE project base path, no Junie surface shall show and Prepare Project for Junie shall copy nothing and show T-15.
- **AC-022** In a project that is not trusted (Safe Mode) the Junie surfaces shall behave as in a trusted one.

## 8 Prüfungen vor `/sdd-compile`

- **Pro Schritt:** die Quality-Gates aus `.memory-bank/techContext.md`.
- **Vor „fertig“:** `npm test` und die JetBrains-CI (Plugin Verifier, Starter-Smoke).
- **Golden:** beide Prompt-Varianten gegen die Golden-Datei. Danach führt Gregor den Prompt einmal echt in Junie aus (J-1, Zeilen 4 und 5).
- **Vorschau-Harness:** die Fixtures aus §7 in Light, Darcula/Islands Dark und High Contrast, bei 1000 und 1600 px. Dabei prüfen:
  - Welcome mit zwei Einträgen,
  - die Problems-Zeile mit zwei Aktionen,
  - Hide.
- **Rider-Walkthrough** auf `C:\projects\test\tip-splitter` mit drei Personas:
  1. **Junie, neues Projekt:**
     - S2 → Setup → Meldung T-3 → Prompt in Junie.
     - Danach wird binnen 2 s aus dem Welcome der normale Welcome.
     - Dann `/sdd-setup` und `/sdd-specify` über Copy for Junie.
  2. **Junie, vorhandenes Projekt:**
     - Öffnen: kein Balloon.
     - Problems zeigt T-7a; Hide; Neustart: weiter verborgen.
     - Find Action: Hide ist zurückgesetzt.
     - Eine `.junie/AGENTS.md` anlegen: T-12 erscheint.
  3. **Copilot mit installiertem AI Assistant:**
     - Kompletter Hands-On ohne einen einzigen Junie-Text außer der Einstellungsoption und Find Action. Screenshot je Ansicht.
- **Unabhängige Gegenprüfung:** Ein Agent, der die Umsetzung nicht kennt, prüft die ACs gegen Code und Tests.

## 9 Reihenfolge

| Stufe | Inhalt | Gate |
| --- | --- | --- |
| 0 | G0-1 bis G0-4 | Gregors Go |
| 1 | Core: `readiness.ts` + Tests (AC-004, AC-005), `setupPrompt.ts` + Golden (AC-010, AC-015), `junieTexts.ts` (AC-017) | Unit-Tests grün |
| 2 | Protokoll und Webview: Welcome-Eintrag, Problems-Zeile mit Aktionen, Hide, T-8 (AC-006, AC-007, AC-009, AC-011, AC-012) | Vorschau-Harness, 3 Themes |
| 3 | JetBrains-Host: Verfügbarkeit, Watcher, Find Action, Setup-Meldung, `UiMemory` (AC-002, AC-008, AC-013, AC-014, AC-020–AC-022) | CI JetBrains grün |
| 4 | Gegenproben: AC-001, AC-003, AC-016, Parität (AC-018), README, CHANGELOG, Checkliste | `npm test`, `.vsix` unverändert |
| 5 | Rider-Walkthrough (AC-019), Gegenprüfung, `/sdd-compile` | Gregors Go |

## 10 Nicht in 0037

- Das Studio schreibt `.junie/` selbst (Variante A in 18 v1): abgelehnt.
- Native Junie-Dateien im FeatherSpec-Template (18 E-4): eigenes FeatherSpec-Vorhaben.
- Anpassung an Skills in FeatherSpec 1.12 (18 E-5): Folgespec, sobald 1.12 feststeht.
- Content Roots außerhalb der Projektwurzel (18 E-6): nur der README-Satz.
- Wechsel von `getPlugin` zu `isPluginInstalled` in `StudioProjectService.kt:281`: eigenes Ticket.
