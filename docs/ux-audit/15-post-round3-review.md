# 15 · Nachträge nach Runde 3: Prüfung 0029–0031 und PD-090–092

**Stand:** 20.11.2026.

**Geprüft wurde:** Branch `ux-round-3`, Kopf `fbf8830` (PR #2). Das VSIX `featherspec-studio-0.1.0.vsix` stammt von 03:12 und enthält den Code bis `3773816`. Die Commits danach ändern nur Dokumente.

**Wie geprüft wurde:**
- Das VSIX lief in einer isolierten Testumgebung (code-server 4.145.2), mit den Fixtures des Teams und einem eigenen Clarify-Projekt.
- Für den Assistenten diente ein Stub von „Claude Code“. Er protokolliert, was beim Senden übergeben wird.
- Den Copilot-Weg konnte ich so nicht starten, weil code-server die eingebaute Copilot-Erweiterung nicht lädt. Für Copilot habe ich deshalb Spec und Code gelesen.
- Belege liegen in `screenshots-fbf8830/`.

**Hinweis:** Datei 14 erklärt 01–13 zur Historie. Diese Datei ergänzt 14 und ersetzt sie nicht.

## 1 Kurzurteil

**Alle sieben Wünsche sind umgesetzt und funktionieren**, auch Nr. 3 („nach clarify nur noch Plan“). Den Grund für Gregors Fehlschlag erklärt §3.

**Aus UX-Sicht kann PR #2 gemergt werden.** Kein Befund blockiert. Sieben kleine Punkte (H-1 bis H-7) passen in einen kurzen Fix-PR danach, zwei weitere sind nur Hinweise (H-8, H-9). Der einzige echte Fehler ist H-3, ein zu großer Pfeil im Onboarding. Er ist kosmetisch.

## 2 Die sieben Wünsche

| # | Wunsch | Geprüft | Urteil |
| --- | --- | --- | --- |
| 1 | Onboarding statt `/sdd-specify` | x01, x02, x15 | **erfüllt.** Das Erkennungsmerkmal kommt aus FeatherSpecs eigener Definition in `sdd-setup.md`: TBD im Brief **und** `# last reconciled: never`. Das ist robust und nicht von der Sprache abhängig, ein Ausrutscher in eine Richtung ist kaum möglich. Siehe H-3 und H-4. |
| 2 | Spec immer anhängen (PD-091) | Stub-Log, Code | **erfüllt.** Claude Code bekommt `/sdd-clarify <pfad> @<pfad>`. Copilot bekommt laut Code `attachFiles` im neuen **und im aktuellen** Chat. Siehe H-2. |
| 3 | Nach clarify nur noch „Write the plan“ | x04 → x06 | **erfüllt.** Ablauf: Send auf `/sdd-clarify`, danach Änderung der Spec-Datei. Der Next step wechselt sofort auf „Write the plan · /sdd-plan“, ohne Neuladen. Das gilt in Baum, Up next, Statusleiste und Detail. |
| 4 | Zeile „attached when sent“ weg | x04 | **erfüllt.** Der Anhang steht nur noch im Namen und Tooltip des Send-Knopfs: „… . Attaches 0001-tip-presets.md.“ Das ist vertretbar, weil Copilot den Anhang im Chat-Eingabefeld selbst zeigt und Claude Code ihn als `@pfad` im Prompt. Man sieht ihn also dort, wo man vor dem Absenden prüft. |
| 5 | Modell-Empfehlung als Satz | x04, x07 | **erfüllt**, eine Formulierung holpert (H-5). |
| 6 | Send auch auf der Folgezeile | x04, x07, x11 | **erfüllt.** Der Knopf ist grau umrandet, pro Ansicht gibt es genau einen blauen. Die Namen für Screenreader unterscheiden die beiden Knöpfe am Prompt. Siehe H-1 und H-6. |
| 7 | Eigener Tip und Abstand vor „Then:“ | x04 | **erfüllt.** Der Abstand ist gut lesbar. Die offene Frage zum Tip beantwortet §4 Frage 1. |

**Weitere Korrekturen:** Die Willkommensüberschrift ist in Overview und Board jetzt gleich (x01, x02). Den Spike-Dialog habe ich nicht geprüft, er ist durch PD-091 ohnehin überflüssig. **PD-090** (Feder-Glyph statt 🪶) ist richtig: Ein Emoji bringt eigene Farben mit und wäre in High Contrast ein Fremdkörper (x15).

**Querprüfung Runde 3** auf denselben Fixtures:
- **Gruppenblick:** zeigt „1 of 2 returned · T-004 not back yet“, und „Integrate“ ist dann grau (x09).
- **„Verified ohne Häkchen“:** Report steht vorn, und das `(?)` nennt den Grund „T-003 has a Verified line but no tick.“ (x11).
- **Versionsweiche:** 1.10.0 zeigt Report vorn (x08), 1.11.0 zeigt Continue vorn (x07).
- Prozentwerte stehen ohne Leerzeichen (`40%`).

Alles wie in 12 gefordert.

## 3 Warum Wunsch 3 bei Gregor nicht gegriffen hat

Das Studio merkt sich die Übergabe von `/sdd-clarify` **nur, wenn sie aus dem Studio kommt**. Dazu zählen Send, Copy prompt und *Copy next step*. Gemerkt werden Zeitstempel und Größe der Spec. Danach muss sich die Spec-Datei ändern. Lief clarify noch mit einem älteren VSIX, oder wurde der Befehl von Hand im Chat getippt, gibt es keine Erinnerung, und es bleibt beim Challenge-Schritt.

Im Test mit dem aktuellen VSIX hat der Wechsel geklappt.

**Erneuter Test durch Gregor:**
1. Das aktuelle VSIX installieren.
2. Eine Backlog-Spec mit Kriterien und ohne Plan wählen.
3. „Send to …“ auf `/sdd-clarify` drücken.
4. Clarify laufen lassen, bis es die Spec ändert.
5. Prüfen, ob „Write the plan“ erscheint.

Ändert clarify die Datei nicht, bleibt die Challenge stehen. Für diesen Fall hat die Folgezeile jetzt einen eigenen Send-Knopf (0031 §6.5).

## 4 Befunde

| ID | Prio | Befund | Vorschlag | Beleg |
| --- | --- | --- | --- | --- |
| **H-1** | mittel | Folgezeilen stehen in zwei Beziehungen zur ersten Zeile. Mal heißt es „danach“ (`Then: write the plan`, „Then, after a READY verdict …“), mal „oder“ (`Not sure where it stands? …`). In x08 steht „Continue with T-003“ als Nachfolger ganz ohne „Then:“. Seit beide Zeilen gleich aussehende Send-Knöpfe haben, sieht man nicht mehr, ob man beide nacheinander oder nur eine sendet. | Jede Folgezeile beginnt mit **`Then:`** (Reihenfolge) oder **`Or:`** (Alternative). Also: „Or: not sure where it stands? Let the agent report first“ und „Then: continue with T-003 Add“. | x07, x08, x11 |
| **H-2** | mittel (Kontext) | Copilot hängt die Spec auch bei **„Send to the current chat“** an. Bei Schritt für Schritt im selben Chat landet die Spec dann bei jedem `Implement T-00x` erneut im Kontext. Das widerspricht dem Projektgrundsatz „Context Window nicht verschmutzen“. Zusätzlich lesen Projekte unter 1.11.0 laut V-3 die Spec doppelt, etwa 4–12k Tokens je Senden. Der Update-Hinweis ist durch PD-091 entfallen. | **Im aktuellen Chat nicht anhängen**, denn dieser Chat kennt die Spec schon. Tooltip dann ohne „Attaches …“. Für Projekte unter 1.11.0 gehört der eine Satz „Update to FeatherSpec 1.11.0 so the attached spec is not read twice“ zurück ins `(?)`. Das entscheidet Gregor, PD-091 bleibt sonst unberührt. | 0027 §6.1 und Tabelle Zeile „Copilot · current chat“, A-002 |
| **H-3** | klein (Fehler) | Im Onboarding ist der Pfeil am Send-Knopf **24 px** groß, überall sonst 14 px. Vermutlich trifft eine Regel für Icons im Empty State (`.empty-state … .icon`) auch den Pfeil. | Die Regel auf den Feder-Glyph eingrenzen und einen Test für die Pfeilgröße ergänzen. | x01, x02, x15 |
| **H-4** | klein | Im Onboarding fehlt ein **Tip**, obwohl jeder andere Send einen hat. Gerade Neulinge brauchen ihn. Außerdem läuft der Erklärsatz bei 1600 px über ca. 1070 px, also rund 170 Zeichen. Lesbar sind 60–75 Zeichen. | Den Tip „Tip: Use a new chat with a strong model.“ unter dem Knopf ergänzen; `/sdd-setup` scannt die Architektur und befragt den Nutzer. Den Text mit `max-width: 65ch` mittig setzen. | x01 |
| **H-5** | klein | „Tip: Use the current chat or a new one, with a fast model.“ Das Komma trennt falsch, der Satz stockt. | „Tip: Use the current chat or a new one with a fast model.“ | x07 |
| **H-6** | klein | Wo der Send-Knopf steht, hängt von der Länge des Prompts ab. Bei 1000 px steht er in Zeile 1 unter dem Prompt, in Zeile 2 daneben. Zwei Zeilen derselben Art sehen dadurch verschieden aus. | Send immer in einer eigenen Zeile unter dem Prompt, wie in der Seitenleiste bei 1600 px. | x12 |
| **H-7** | klein | Bei einem Teil-Rückläufer ist „Integrate“ zu Recht grau, der Satz darüber lautet aber weiter „Integrate the returned steps“. Dass erst gewartet werden muss, steht nur weiter unten im Plan. | Wenn jemand fehlt, wird der Satz zu „When T-004 is back: integrate the returned steps“. | x09 |
| H-8 | Hinweis | In High Contrast sehen Haupt- und Nebenknopf gleich aus, beide umrandet. Das ist VS-Code-Standard, die Reihenfolge trägt die Hierarchie. | keine Aktion | x14 |
| H-9 | Hinweis | Die Clarify-Erinnerung ist unsichtbarer Zustand im Workspace-State. Sie funktioniert nur bei einer Übergabe aus dem Studio, nicht, wenn jemand clarify von Hand tippt. Die erste Zeile wiederholt außerdem die zweite: „Have the spec challenged, **then plan it**“ und darunter „Then: write the plan“. | Kurzfristig wird die erste Zeile zu „Have the spec challenged“. **Langfristig, für FeatherSpec 1.12:** `/sdd-clarify` schreibt eine feste, sprachunabhängige Zeile in die Spec, z. B. `**Clarified:** 2026-11-20`, wie `FeatherSpecVersion:`. Dann liest das Studio den Stand aus der Datei statt aus einer Erinnerung, und es klappt auch mit getipptem clarify. | x04 |

## 5 Die offenen Fragen

### Frage 1: Tip bei `/sdd-plan`

**Empfehlung: beides kombinieren: „Tip: Use a new chat with a strong model, and allow web search.“**

- **New chat** statt *any chat*: Nach clarify steckt der ganze Challenge-Dialog im Chat. Alles Ergebnis steht aber in der Spec-Datei. Ein frischer Chat verliert also nichts und plant ohne den Ballast. Anthropics Best Practices für Claude Code empfehlen genau das: Kontext zwischen Aufgaben leeren, weil die Qualität sinkt, je voller das Kontextfenster ist. Der Satz passt auch zur bestehenden Begründung für „new chat“: Eine frische Sitzung liest die Dateien wie ein Fremder.
- **Web search** bleibt, weil der Plan Bibliotheken, Versionen und APIs prüft.
- **Gilt für:** alle Fälle, die einen Plan **schreiben** (Modus A oder C): NS-10, NS-6 ohne Plan und die `Then:`-Zeile nach clarify.
- **Gilt nicht für:** `/sdd-plan` im Modus B, der nur berichtet oder integriert („Report“, „Integrate“). Dort bleibt „any chat with a fast model“.

### Frage 2: 0027 schließen?

**Ja.** C-2 ist durch PD-091 erledigt. H-2 (kein Anhang im aktuellen Chat) ist eine kleine Folgekorrektur und kein Grund, 0027 offen zu halten. Sie kann als Fix mit eigener Notiz an 0027 laufen.

### Frage 3: Merge von PR #2

**Aus UX-Sicht: Go, sobald der laufende CI-Lauf grün ist.**
- H-1 bis H-7 als kleiner Fix-PR danach.
- H-3 ist der einzige echte Fehler und kann auch vorher rein, wenn es schnell geht.
- Danach das VSIX neu bauen, damit Gregors Praxis-Checks den Stand nach dem Fix-PR haben.

### Frage 4: Gregors Praxis-Checks und FeatherSpec 1.11.0

- **Wunsch 3** neu testen wie in §3.
- **Echtes Senden an Copilot:** prüfen, ob die Spec im Eingabefeld als Anhang erscheint. Dabei einmal „current chat“ testen, das gehört zu H-2.
- **FeatherSpec 1.11.0 wird durch PD-091 dringlicher.** Erst ab 1.11.0 gilt eine angehängte Spec als gelesen. Bis zum Release zahlt jedes Projekt bei jedem Senden doppelt. Offen bleiben G0 auf Windows, V3 in Copilot und das Hands-On (12, Abschnitt C).

## 6 Für das Team: Fix-PR nach dem Merge

1. **H-3:** Pfeilgröße im Empty State, mit Test.
2. **H-5:** Tip-Satz ohne Komma; Literal und Test anpassen.
3. **H-1:** Präfix `Then:` / `Or:` für alle Folgezeilen. Texte stehen im Textmodul, die Tests vergleichen Literale.
4. **H-7:** Satz bei Teil-Rückläufer.
5. **H-6:** Send immer unter dem Prompt.
6. **H-4:** Tip im Onboarding und `max-width`.
7. **Frage 1:** Tip für Plan-Schreiben, nach Gregors Entscheidung als PD.
8. **H-2:** kein Anhang im aktuellen Chat, nach Gregors Entscheidung als PD. Notiz an 0027.
9. **H-9**, kurzfristiger Teil: erste Zeile kürzen. Der langfristige Teil kommt als Kandidat in den FeatherSpec-1.12-Plan.

Danach Vorschau in drei Themes und zwei Breiten, frisches `/sdd-compile` für die betroffenen Specs, VSIX neu bauen.

## Quellen

- Claude Code Best Practices (Kontext zwischen Aufgaben leeren): https://code.claude.com/docs/en/best-practices
- Eigene Messung: `screenshots-fbf8830/` (x01–x15) und Stub-Protokoll der Sendeaufrufe.
