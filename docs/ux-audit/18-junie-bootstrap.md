# 18 · Junie-Bootstrap: Konzept für das Studio in JetBrains IDEs

Stand 22.11.2026, zweite Fassung nach Gregors Vorgabe. Branch `jetbrains-host`, Kopf `6e508e2`. Keine Code- oder Spec-Änderung. Der Arbeitsauftrag für die Entwickler steht in [19-junie-handoff.md](19-junie-handoff.md).

**Herkunft der Aussagen:** [Code] im Repo gelesen · [Spec] aus `.specs/` oder `docs/product/` · [Web n] siehe §9 · [Annahme] nicht belegt.

**Gregors Vorgabe (22.11.):**
- Fehlt die Junie-Einrichtung, muss zuerst der eine Prompt aus Issue #17 laufen.
- Wer in JetBrains Copilot oder einen anderen Assistenten nutzt, darf davon nie gestört werden.

## 1 Das Konzept in fünf Sätzen

1. **Absicht schaltet frei, Dateien entscheiden:**
   - Junie-Inhalte zeigt das Studio nur, wenn Du ausdrücklich Junie als Assistenten gewählt hast.
   - Ob etwas fehlt, entscheidet das Studio an genau benannten Dateien, nicht am Ordner `.junie/`. Junie legt dort selbst Pläne und Konfiguration ab (§3).
2. **Erst der Prompt, dann der Rest:**
   - Ist das Projekt nicht für Junie vorbereitet, ist der Junie-Prompt der erste Schritt: nach dem Setup, im Welcome vor `/sdd-setup` und als Projektzeile in der Overview.
   - Er wird kopiert, Junie führt ihn aus, das Studio schreibt nichts.
3. **Nicht nerven:**
   - Kein Balloon beim Projektöffnen.
   - Kein Eintrag im Baum, in der Statusleiste oder im S2-Zustand.
   - Pro Projekt ein `Hide`.
   - Wer nicht Junie gewählt hat, sieht höchstens die Aktion in Find Action und die Option in den Einstellungen, beides nur auf Abruf.
4. **Ein Zustand, viele Orte, ein Text:**
   - Der Core berechnet die Junie-Bereitschaft einmal.
   - Welcome, Overview, Setup-Meldung und Find Action zeigen denselben Zustand mit Texten aus einem Modul.
5. **VS Code bleibt unverändert:**
   - Es gibt keine Junie-Erweiterung.
   - Die Logik liegt im geteilten Core, die Junie-Wahl nur in der JetBrains-Liste. In der Paritätsmatrix ist das *deliberately different*.

## 2 Grundsätze und woher sie kommen

| # | Grundsatz | Begründung |
| --- | --- | --- |
| G1 | Nur eine ausdrückliche Wahl ist ein Auslöser. | Ob Junie im AI Chat gewählt ist, kann kein Plugin abfragen; eine API gibt es nicht [Web 7]. Junie läuft im AI Chat auch ohne eigenes Plugin [Web 6]. Ein Teamkollege kann `.junie/` committen. Jeder abgeleitete Auslöser würde also Copilot-Nutzer treffen. |
| G2 | Dateien, nicht Ordner. | Junie legt Pläne in `.junie/plans` ab [Web 19]. Team-Konfiguration liegt in `.junie/config.json` [Web 20]. Ein vorhandenes `.junie/` sagt also nichts über FeatherSpec. |
| G3 | Das Studio schreibt nur beim Setup. | Architekturgrenze in `AGENTS.md`: „Only the setup (0014) writes into a workspace folder“ [Code]. Gregor wünscht den Prompt aus #17. |
| G4 | Banner-Muster statt Balloon. | Ein Banner passt, wenn eine Aktion ansteht, aber nicht sofort, und es einen UI-Ort gibt: höchstens zwei Sätze, zwei Aktionen, eingebautes `Hide` [Web 13]. Die IDE fragt nach Projektkonfiguration mit „Skip“ bzw. „Ignore“ pro Projekt (Maven/Gradle, Plugin Advertiser) [Web 21]. |
| G5 | Einrichtung auf Abruf oder im Moment der Absicht. | Copilot bietet „Generate Agent Instructions“ in einer neuen Chat-Session an [Web 10]. Claude Code `/init` überschreibt eine vorhandene `CLAUDE.md` nicht, sondern schlägt Verbesserungen vor [Web 11]. Keins der Werkzeuge meldet sich beim Projektstart. |
| G6 | Unbekannt heißt still. | Kann das Studio die kanonischen Befehle nicht lesen, etwa nach einem Umzug auf Skills, zeigt es nichts statt einer falschen Warnung. Das ist die Studio-Regel „Zustand aus Dateien“ [Spec ux-guidelines 3]. |

## 3 Was Junie liest und schreibt (Stand Nov 2026)

- **Kontext:**
  - Junie lädt `.junie/AGENTS.md`, wenn es sie gibt. Sonst lädt es `AGENTS.md` im Projektstamm plus `.junie/playbook.md` plus alle `.junie/rules/*.md` [Web 1].
  - Dass es mit `.junie/AGENTS.md` **nur** diese Datei nimmt, sagen die Plugin-Einstellungen ausdrücklich [Web 2]. Für den AI Chat klärt das J-1 Zeile 3.
  - Globs kennt Junie nicht; `.junie/rules/*.md` wird immer geladen [Web 1].
- **Eigene Befehle:**
  - Sie liegen in `.junie/commands/*.md`, mit `description`, `allowPromptArgument: true` und `$prompt` [Web 3].
  - Dokumentiert ist das für die CLI und ACP-Clients. Der AI Chat in der IDE nennt nur eine Teilmenge eingebauter `/`-Befehle [Web 4]. Ob `/sdd-plan` dort läuft, klärt **Spike J-1**.
- **Skills:**
  - In CLI und IDE werden `.junie/skills/` und `.agents/skills/` gelesen, `.agents/skills/` nur im vertrauten Projekt [Web 5].
  - `.claude/skills/` liest Junie nicht; die CLI bietet nur einen Import an.
- **Junies eigenes Import-Angebot:**
  - Die CLI schlägt beim ersten Öffnen vor, Anweisungen anderer Agents in `.junie/AGENTS.md` zu übernehmen [Web 1].
  - Wer das annimmt, schaltet `AGENTS.md` und das Playbook ab. Das Studio muss das zeigen.
- **Selbst angelegt:**
  - `.junie/plans/` [Web 19] und `.junie/config.json` [Web 20].
  - Ein Projekt mit `.junie/` kann also ganz ohne FeatherSpec-Adapter sein.
- **Modi:** Im AI Chat braucht Junie für Dateioperationen standardmäßig eine Freigabe (Yes/No/Always allow) [Web 4]. Der Prompt läuft also im normalen Modus, Du bestätigst die Schreibvorgänge.

## 4 Zustandsmodell

### 4.1 Absicht (wer sieht überhaupt etwas)

| Stufe | Bedingung | Sichtbar |
| --- | --- | --- |
| **A0** keine Junie-Verfügbarkeit | weder `org.jetbrains.junie` noch `com.intellij.ml.llm` installiert und aktiv | nichts zu Junie |
| **A1** verfügbar, nicht gewählt | eines der beiden Plugins aktiv, Assistant ≠ Junie | nur auf Abruf: Find Action *Prepare Project for Junie*, Option *Junie* in den Einstellungen |
| **A2** gewählt | verfügbar wie A1 **und** Assistant = Junie (Einstellung aus 0035) | Bereitschaftszustand nach §4.2 |

Ein Wechsel der Einstellung oder der Plugins zur Laufzeit wirkt sofort, ohne Neustart.

Copilot- oder Claude-Code-Nutzer bleiben in A0 oder A1. Sie bekommen nie einen Hinweis, keine Problemzeile und keine Meldung.

### 4.2 Bereitschaft (berechnet ab A1, angezeigt nur in A2)

Berechnet wird für das aktive FeatherSpec-Projekt. Die Find Action braucht den Zustand schon in A1 für ihre Meldung.

Definitionen:
- **C** = Namen `n` mit einer Datei `.claude/commands/sdd-n.md` (kanonisch).
- **J** = Namen `n` mit einer Datei `.junie/commands/sdd-n.md`, deren Text `.claude/commands/sdd-n.md` enthält.
- **P** = `.junie/playbook.md` ist eine Datei, die die Zeile `# FeatherSpec rules for Junie` enthält.
- **O** = `.junie/AGENTS.md` existiert.

| Zustand | Bedingung | Bedeutung |
| --- | --- | --- |
| **J-unknown** | C ist leer oder nicht lesbar; oder kein aktives Projekt (S1–S9 außer bereitem Projekt); oder die Wurzel des FeatherSpec-Projekts ist nicht die IDE-Projektwurzel (dort sucht Junie `.junie/`) | still (G6) |
| **J-none** | J leer und nicht P | Projekt nicht für Junie vorbereitet: Gregors Fall „`.junie` fehlt“, auch wenn `.junie/plans` existiert |
| **J-partial** | J ≠ ∅ oder P, aber C ⊄ J oder nicht P | teilweise, etwa nach einem FeatherSpec-Update mit neuem Befehl |
| **J-ready** | C ⊆ J und P | bereit |
| **+ O** | zusätzlich zu jedem Zustand | Junie ignoriert `AGENTS.md` und das Playbook |

Gilt **Hide**, zeigt das Studio für dieses Projekt keine Vorbereitungs-Hinweise mehr (§5). Der Zustand **O** bleibt sichtbar, denn er ist ein echter Fehler.

**Ein nicht vertrautes Projekt (Safe Mode)** verhält sich wie ein vertrautes. Das Studio liest nur und kopiert Text.

**Nächster Befehl im Prompt:** `/sdd-setup`, solange `/sdd-setup` nicht gelaufen ist (Setup-Zeichen aus 0029). Sonst `/sdd-overview`. Das gilt für jeden Ort gleich.

## 5 Wo was erscheint

Gilt nur für A2 und nur ohne Hide, außer wo anders vermerkt.

| Situation | J-none / J-partial | J-ready | O |
| --- | --- | --- | --- |
| **S2** kein Projekt, *Set up FeatherSpec* | nichts (vor dem Setup gibt es nichts vorzubereiten) | – | – |
| **Setup fertig** (Meldung von 0014) | Text und Aktion für Junie statt `/sdd-setup` (T-3); mit zu mergenden Dateien bleibt der Merge-Prompt die Aktion | Standardtext | – |
| **Welcome** (`/sdd-setup` nicht gelaufen) | Erster Eintrag *Prepare this project for Junie* mit Copy (der Prompt). Darunter `Then: set up the project` · `/sdd-setup`. Gilt für none und partial gleich. | Welcome wie heute | eine Zeile T-12 im Welcome unter dem Eintrag |
| **Overview** nach dem Setup | eine Projektzeile unter *Problems* mit `Copy setup prompt` · `Hide` | nichts | Projektzeile unter *Problems*, ohne Aktion, mit Tooltip |
| **Copy for Junie** einer `/sdd-*`-Zeile | Prompt wird kopiert; kurze Rückmeldung unter dem Knopf (T-8), verschwindet wie „Copied“ | „Copied“ wie heute | – |
| **Find Action** | *FeatherSpec Studio: Prepare Project for Junie* (ab A1, auch nach Hide): kopiert den Prompt, Meldung T-10; ohne aktives Projekt oder bei J-unknown nur Meldung T-15 | dieselbe Aktion, Meldung T-11 | – |
| **Baum, Statusleiste, Badge, Board** | nichts | nichts | nichts |

**Hide** wird pro Projekt im Studio-Speicher gemerkt (`UiMemory` in JetBrains), nie in den Projektdateien. Zurückgesetzt wird es, sobald Du *Prepare Project for Junie* ausführst.

### Ablauf: neues Projekt (Junie-Nutzer)

1. Leerer Ordner, S2 → *Set up FeatherSpec* → bestätigen.
2. Meldung: `FeatherSpec 1.11.0 is set up in tip-splitter. Run the Junie setup prompt first, then /sdd-setup.`, Aktion `Copy setup prompt`.
3. Welcome: der Vorbereitungs-Eintrag steht oben, `/sdd-setup` folgt als `Then:`.
4. Junie legt 13 Loader und das Playbook an. Binnen 2 s (PD-106) wird daraus der normale Welcome mit `/sdd-setup`.

### Ablauf: vorhandenes Projekt öffnen (Junie-Nutzer)

Beim Öffnen passiert nichts. In der Overview steht unter *Problems* die Junie-Zeile. Klickt der Nutzer stattdessen Copy for Junie an einem Spec, bekommt er die kurze Rückmeldung. Nach dem Prompt verschwindet beides.

### Ablauf: Copilot-Nutzer in Rider mit AI Assistant

Er sieht nichts von Junie. Nur wer gezielt in Find Action sucht oder in den Einstellungen nachsieht, findet die Junie-Einträge.

## 6 Texte (Englisch, für das Text-Modul)

| ID | Ort | Text |
| --- | --- | --- |
| T-1 | Einstellung, Option | `Junie` |
| T-2 | Einstellung, Beschreibung der Option | `Copy for Junie copies the prompt with @ file references. Paste it into Junie in AI Chat.` |
| T-3 | Setup fertig, Satz | `FeatherSpec <version> is set up in <folder>. Run the Junie setup prompt first, then /sdd-setup.` |
| T-4 | Aktion (Meldung, Problems) | `Copy setup prompt` |
| T-5 | Welcome, Absicht | `Prepare this project for Junie` |
| T-6 | Welcome, Folgezeile | `Then: set up the project` |
| T-7a | Problems, keine Befehle | `Junie doesn't know the /sdd-* commands of this project yet.` |
| T-7b1 | Problems, 1 Befehl fehlt | `Junie doesn't know /sdd-<name> of this project yet.` |
| T-7b2 | Problems, 2–3 fehlen | `Junie doesn't know <n> /sdd-* commands of this project yet: <names>.` |
| T-7b3 | Problems, mehr als 3 fehlen | `Junie doesn't know <n> /sdd-* commands of this project yet.` |
| T-7c | Problems, nur das Playbook fehlt | `Junie doesn't load the FeatherSpec rules of this project yet.` |
| T-7d | Tooltip zu T-7a–c | `The Junie setup prompt adds .junie/commands and .junie/playbook.md and changes no other file. Paste it into Junie and confirm its file changes.` |
| T-7e | Problems, zweite Aktion | `Hide` |
| T-8 | Rückmeldung nach Copy for Junie (none/partial) | `Copied. Junie doesn't know /sdd-* here yet: run the Junie setup prompt first.` |
| T-9 | Find Action, Name / Beschreibung | `Prepare Project for Junie` / `Copy a prompt that lets Junie run the FeatherSpec /sdd-* commands of this project.` |
| T-10 | Meldung nach T-9, nicht bereit | `Junie setup prompt copied. Paste it into Junie and send it.` |
| T-11 | Meldung nach T-9, bereit | `This project is ready for Junie. The prompt is copied in case you want to refresh the files.` |
| T-12 | Problems bzw. Welcome, O | `Junie reads only .junie/AGENTS.md here, not AGENTS.md or .junie/playbook.md.` |
| T-13 | Tooltip zu T-12 | `Remove .junie/AGENTS.md so that Junie loads AGENTS.md and .junie/playbook.md. Junie can create it when it imports other agents' instructions.` |
| T-14 | Tip unter T-5 | `Tip: Use a new chat with a fast model.` (Modellklasse wie PD-092; der eigene Modellname aus *Model hints* ersetzt sie) |
| T-15 | Find Action ohne aktives Projekt | `Open a FeatherSpec project first. The Junie setup prompt works on the active project.` |

**Rangfolge in Problems:** Fehlen Befehle, gilt T-7a oder T-7b, auch wenn das Playbook ebenfalls fehlt; der Prompt behebt beides. T-7c gilt nur, wenn alle Befehle da sind und nur das Playbook fehlt.

## 7 Der Prompt

**Quelle:** Issue #17, Schritte 2–7, in einer festen Fassung im Studio (Golden-Datei). Ein einziger Platzhalter, `{{nextCommand}}`, nach der Regel in §4.2.

**Abweichungen vom Issue, jeweils mit Grund:**
- **Schritt 1 entfällt:** FeatherSpec ist da, das Studio weiß es. Der Prompt verbietet ausdrücklich, FeatherSpec zu installieren oder zu ändern.
- **Liste und Beschreibung kommen aus `.claude/commands/`**, nicht aus `.github/prompts/`. Das ist die kanonische Quelle, alle 13 Dateien tragen `description:` [Code featherspec], und die Junie-Loader hängen nicht am Copilot-Adapter.
- **Das Playbook nennt alle Regeln mit ihren `paths:`-Globs.** Das Issue nennt nur `plans`, `specs` und `memory-bank`. Es gibt aber 8 Regeln, und Junie kennt keine Globs.
- **Nie `.junie/rules/`, nie `.junie/AGENTS.md`.** Beides würde Junie immer oder ausschließlich laden. Eine vorhandene `.junie/AGENTS.md` wird gemeldet, nicht geändert.
- **Ein vorhandenes Playbook mit eigenem Inhalt bleibt erhalten.** Der Abschnitt unter `# FeatherSpec rules for Junie` wird ersetzt bzw. angehängt. Diese Überschrift ist auch der Marker P.

**Kontext-Kosten:**
- In jeder Junie-Aufgabe ist nur das Playbook geladen, etwa 12 Zeilen.
- Ein Loader (etwa 10 Zeilen) kommt nur bei seinem Befehl dazu.

Den Entwurf des Prompts enthält 19 §5.

## 8 Offene Entscheidungen

| # | Frage | Empfehlung |
| --- | --- | --- |
| E-1 | Wie heißen die Spec-Nummern? | **0035** für Send/Copy-for je Assistent mit der Junie-Option. **0037** für „Prepare a project for Junie“; sie hängt von 0035 ab. |
| E-2 | Was, wenn Spike J-1 zeigt, dass eigene Befehle im AI Chat nicht laufen (oder ohne Loader schon laufen)? | Dann prüft die Bereitschaft nur noch das Playbook: none ⇔ kein Playbook, T-7a/T-7b und T-8 entfallen, T-5 und T-7c bleiben. Laufen sie gar nicht, formuliert 0035 Copy for Junie ohne Slash-Befehl, etwa `Follow .claude/commands/sdd-plan.md for @…`. |
| E-3 | Wo steht der Prompt als einzige Quelle? | Im Studio als Golden-Datei. Issue #17 bekommt einen Kommentar mit Verweis darauf, damit es keine zweite Fassung gibt. |
| E-4 | Soll das Template `.junie/` später nativ mitliefern? | Später, nicht blockierend. Kommt es, landet jedes neue Projekt nach dem Setup direkt in J-ready; der Prompt bleibt für ältere Projekte. |
| E-5 | Was gilt für 1.12 (Skills)? | Die Bereitschaft liest C aus `.claude/commands/`. Fehlt der Ordner nach dem Umzug, gilt J-unknown (still), bis 0037 nachgezogen ist. |
| E-6 | Was, wenn das FeatherSpec-Projekt in einem Content Root liegt statt in der IDE-Projektwurzel? | J-unknown (still) und ein README-Satz. Junie sucht `.junie/` in der Projektwurzel, und der *Guidelines path* hilft nur für Richtlinien [Web 2]. Ein „ready“ dort wäre falsch. |
| E-7 | Welche PDs braucht es? | PD-108 „ehrlich-hybrid“ (ändert PD-105). PD-109 „Junie-Bereitschaft: Absicht schaltet frei, Dateien entscheiden, Prompt statt Schreiben, Hide pro Projekt“. |

## 9 Quellen (abgerufen 22.11.2026)

1. Junie, Guidelines and memory, 21.11.2026: https://junie.jetbrains.com/docs/guidelines-and-memory.html
2. Junie, Plugin project settings, 13.11.2026: https://junie.jetbrains.com/docs/junie-plugin-project-settings.html
3. Junie, Custom slash commands, 21.11.2026: https://junie.jetbrains.com/docs/custom-slash-commands.html
4. AI Assistant 2026.3, Junie agent, 07.10.2026: https://www.jetbrains.com/help/ai-assistant/2026.3/junie-agent.html
5. Junie, Agent skills, 21.11.2026: https://junie.jetbrains.com/docs/agent-skills.html
6. Junie, IDE plugin, 21.11.2026: https://junie.jetbrains.com/docs/junie-ide-plugin.html
7. JetBrains Platform Forum, Antwort Y. Artamonov 18.12.2025, YouTrack LLM-2340: https://platform.jetbrains.com/t/sending-pre-defined-prompts-to-junie/3299
8. Spec Kit, Integrations: https://github.github.io/spec-kit/reference/integrations.html · OpenSpec, Supported tools: https://openspec.dev/docs/reference/supported-tools
9. JetBrains Blog, AI Assistant in VS Code (eigener Agent, nicht Junie), Mai 2025: https://blog.jetbrains.com/ai/2025/05/jetbrains-ai-assistant-now-in-visual-studio-code/
10. GitHub Changelog, Copilot for JetBrains, 11.03.2026: https://github.blog/changelog/2026-03-11-major-agentic-capabilities-improvements-in-github-copilot-for-jetbrains-ides/
11. Claude Code, Memory (`/init`): https://code.claude.com/docs/en/memory
12. IntelliJ Platform UI Guidelines, Notification balloons, 10.11.2026: https://plugins.jetbrains.com/docs/intellij/notification-balloons.html
13. UI Guidelines, Banner: https://plugins.jetbrains.com/docs/intellij/banner.html
14. UI Guidelines, Got It tooltip: https://plugins.jetbrains.com/docs/intellij/got-it-tooltip.html
15. IntelliJ SDK, IDE infrastructure (`PluginManagerCore.isPluginInstalled`): https://plugins.jetbrains.com/docs/intellij/ide-infrastructure.html
16. Forum zu `getPlugin` @Internal ab 2026.2 (IJPL-244315): https://platform.jetbrains.com/t/4272
17. IntelliJ SDK, Trusted projects: https://plugins.jetbrains.com/docs/intellij/trusted-projects.html
18. FeatherSpec Issue #17: https://github.com/GregorBiswanger/featherspec/issues/17
19. JetBrains Blog, „Junie leaves Beta“ (Pläne in `.junie/plans`), Juni 2026: https://blog.jetbrains.com/junie/2026/06/junie-coding-agent-out-of-beta/
20. Junie, CLI configuration (`.junie/config.json`), 21.11.2026: https://junie.jetbrains.com/docs/junie-cli-configuration.html
21. intellij-community `master`: `UnlinkedProjectNotificationAware.kt` (Link/Skip pro Projekt), `PluginAdvertiserEditorNotificationProvider.kt` (Ignore pro Projekt); https://github.com/JetBrains/intellij-community
