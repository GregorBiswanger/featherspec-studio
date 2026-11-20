# 11 · Runde 3: Klicktest-Entwurf und FeatherSpec 1.11.0

Stand 19.11.2026. Geprüft wurden:

- der Klicktest-Entwurf `Studio window` (Artifact `2HPSzmxus6hhKPkuGm47wp`, Version `1795063054-e4ef`, Boards `Main` und `Tasks`), im Code gelesen;
- der QA-Status zu FeatherSpec 1.11.0 (`qa-1.11.0-status-2026-11-19`);
- die vier Go-Fragen.

**Grenze der Prüfung:** Den Branch `feature/1.11.0-studio-prompts` habe ich nicht gesehen. Er liegt weder in `C:\projects\featherspec`, dort gibt es nur `main` mit 1.10.0, noch habe ich Zugriff auf `C:\projects\test`. Das Urteil zu 1.11.0 stützt sich deshalb auf den QA-Bericht und nicht auf den Diff. Die Specs 0025–0028 gibt es im Studio-Repo noch nicht (Branch `ux-round-3`, Kopf `27ccf2e`). Bewertet wird also der Entwurf vor der Spec.

## 1 Kurzurteil

| Teil | Urteil |
| --- | --- |
| Klicktest-Entwurf | **Bereit für den Test, mit 4 kleinen Korrekturen vorher** (§3). F-1, F-2, G-1, G-2, G-3, G-5, G-7, G-9, G-10 und G-11 aus 09 sind umgesetzt. |
| Bestätigungspunkte 1–8 | 6 × ja, 2 × ja mit Änderung (Punkt 4: Wortlaut; Punkt 7: `43%` ohne Leerzeichen). |
| FeatherSpec 1.11.0 | **Nach dem Bericht nicht schlechter als 1.10.0.** Ein Go gibt es erst nach G0 auf Windows, der Copilot-Gegenprobe (V3) und dem Hands-On. So verlangt es die Projektregel „erst PR, wenn zu 100 % gewährleistet“. |
| Go-Fragen | 1: MINOR ja, Titel ohne „level“. 2: Squash ja, aber **vor dem Push**. 3: Anhalten und fragen. 4: stimmt sinngemäß, für 1.12 einplanen. |

## 2 Bestätigungspunkte

| # | Punkt | Urteil | Begründung |
| --- | --- | --- | --- |
| 1 | Ready startet mit `Implement T-001 of …plan.md`, kurz `Start · Implement T-001` | **ja** | Ein Verb fürs Bauen, egal ob erster oder späterer Schritt. Das passt zu „Continue · Implement T-004“ und erspart einen zweiten Prompt-Typ. |
| 2 | Datei-Chip `0001-tip-splitter.md attached when sent` | **ja** | Das ist V-3 aus 09: zeigen, was mitgeht, ohne Einstellung. Der Tooltip „Copy prompt attaches nothing“ beantwortet die Folgefrage. Dass der Chip im 1.10.0-Projekt (S3) fehlt, ist folgerichtig. |
| 3 | Kurzformen ohne sichtbares „Next“ | **ja, bis auf eine** | „Next step:“ steht weiter für Screenreader da (sr-only), das ist richtig. **„Put back in line“** ist eine Redewendung und für Nicht-Muttersprachler die schwächste Form. Besser ist es, den Zielzustand zu nennen, etwa „Move back to Ready“ oder was der Fall wirklich tut. „Find blocker“, „Report“, „Write plan“ und „Start“ sind gut. |
| 4 | „Let the agent report first“ nach Unterbrechung nur vor 1.11.0 vorn | **ja, Wortlaut ändern** | „unter FeatherSpec 1.11.0“ lässt sich auch als „mit 1.11.0“ lesen. Vorschlag: „**vor** 1.11.0 (z. B. 1.10.0)“. Die Logik stimmt: Ab 1.11.0 zieht `Implement …` den Plan selbst zuerst nach, die Sicherung liegt also dort, wo der Zustand liegt. Zwei Bedingungen dafür: Eine **unbekannte oder fehlende Version gilt als alt**, das ist der sichere Default. Und Rückläufer (S4) gehen immer vor, egal welche Version. |
| 5 | Codicons check, debug-stackframe, circle-large-outline, reply, circle-slash, question | **ja** | Damit ist G-1 erledigt. `debug-stackframe` heißt in VS Code „hier steht die Ausführung“ und passt zu „dran“. Blau getrennt von Grün (Active) ist gut. Die Wörter stehen in `aria-label` und `title`, die Farbe ist also nicht allein Träger. |
| 6 | Plan map zeigt denselben Spec, Kopf trägt Next step, Seitenleiste lässt ihn weg | **ja** | Das ist G-5 (doppelter Next step) sauber gelöst: `showNext = !(planMap && mapable)`. Die Seitenleiste behält Progress, offene Kriterien und Files, das reicht. |
| 7 | Prozent überall, 100 % erst wenn alles fertig | **ja, mit `43%`** | Die Formel `floor((200d+t)/(2t))`, gedeckelt auf 99, ist genau E-13. Die UI ist englisch, und der Microsoft Writing Style Guide schreibt dort `43%` ohne Leerzeichen. `43 %` ist deutsche Typografie. Also `3 of 7 done · 43%` und `Steps 3/7 · 43%`. |
| 8 | Copy prompt auf der Karte nur beim aktuellen Schritt, nur aufgeklappt | **ja** | Eine Tür pro Aktion (Leitlinie: max. zwei Primärknöpfe). Wer parallel starten will, hat dafür die Start-Zeilen in „Ways to run it“. Ein Copy auf jeder Karte würde zum Bauen außer der Reihe einladen. |

## 3 Was vor dem Test noch korrigiert werden sollte

1. **S4, Satz unter „Integrate“: „Paste it once every worker you started is back.“** Der Knopf heißt Send, also muss der Satz „**Send** it once …“ heißen. Außerdem kennt das Studio die Gruppe aus der Stage-Zeile (`T-004 ‖ T-005`). Es kann also sagen, wer noch fehlt: „**1 of 2 returned · T-004 not back yet**“. Dann muss der Nutzer nicht raten, ob er schon integrieren darf. Diese Restlücke von G-2 ist der wichtigste Punkt.
2. **Begründung bei „current or new chat“ abhängig von der Version.** Der Text „after a break, let the agent report first“ widerspricht ab 1.11.0 Punkt 4. Ab 1.11.0 sollte dort stehen: „after a break, the step first brings the plan up to date“.
3. **Prozentzeichen** wie in Punkt 7.
4. **„Put back in line“** wie in Punkt 3 durch den Zielzustand ersetzen.

## 4 Aufgaben 1–6

| # | Was sie prüft | Erwarteter Weg im Entwurf | Risiko |
| --- | --- | --- | --- |
| 1 | F-1 und G-7: Schritt-Infos und Parallelität finden | Overview → Zeile 0001 → Seitenleiste: „Stage 3 can run in parallel · Ways to run it“ oder Plan-Zeile `⇉ can run in parallel` → Chip T-005 → Plan map, Karte offen | gering. Der Hinweis steht in der Seitenleiste, nicht in der Now-Zeile. Wer nur die Overview anschaut, sieht ihn erst nach dem Klick. |
| 2 | Wahl „current chat“ | Chevron am Send-Knopf → „Send to the current chat“ | **mittel.** Die sichtbare Beschriftung sagt nicht „new chat“, das steht nur in aria und title. Genau das soll der Test zeigen. Fällt er schlecht aus: „Send to Copilot“ lassen, aber im Menü die aktive Wahl mit Häkchen zeigen. |
| 3 | NS-5 nach dem letzten Häkchen | „Verify · /sdd-compile“, Coach „new chat · strong model, other family“, Send | gering. Alle drei Antworten stehen auf einer Zeile. |
| 4 | G-11 im 1.10.0-Projekt | „Report · /sdd-plan“ vorn, Continue als zweite Zeile, Begründung im `(?)` | gering. Das „warum“ steht nur im Toggletip, und die Aufgabe fragt danach. Gut, das testet den `(?)`. |
| 5 | Rückläufer | Plan map, T-005 mit `reply`-Symbol, „1 returned, waiting to be integrated“ → „Integrate · /sdd-plan“ | **mittel**, siehe §3 Punkt 1. |
| 6 | Datei an der Stelle öffnen, ohne Explorer | Chip T-006 mit Strg+Klick, oder Karte aufklappen → „Open in plan“ | gering. Strg+Klick kennt nur, wer den Tooltip liest; „Open in plan“ ist der sichtbare Weg. Das Ergebnis zeigt, welcher Weg gefunden wird. „Open plan“ öffnet die Datei oben und nicht bei T-006. Wer dort landet, hat die Aufgabe nur halb gelöst. |

**Zur Methode:** „Zuerst geschaut / erwartet“ ist ein First-Click-Test. Das ist gut, denn wer den ersten Klick richtig setzt, löst die Aufgabe meist auch. Zwei billige Ergänzungen machen die Ergebnisse vergleichbar:

- je Aufgabe „gelöst ja/nein/mit Hilfe“;
- eine Bewertung von 1 (sehr schwer) bis 7 (sehr leicht) für „wie leicht war das“ (Single Ease Question).

Bei mehr als einer Testperson zuerst Aufgabe 2 und 5 auswerten, dort liegt das Risiko.

## 5 FeatherSpec 1.11.0: Einschätzung aus dem QA-Bericht

**Was überzeugt:**

- Ein unabhängiger, frischer Prüfer hat zwei echte Blocker gefunden, beide sind behoben. Der zweite war ein Häkchen ohne Gates und Beleg und hätte die Qualität verschlechtert. Gut, dass er vor dem Release auffiel.
- B1 26/26 in allen sechs Läufen, Traceability 16/16, frisches `/sdd-compile` READY.
- U1/U2: Update byte-gleich, `.specs/` unberührt, Anpassungen erhalten.

**Was ich nicht als Verbesserung verkaufen würde:** Die Umsetzung braucht im Median 424 statt 455 s (−7 %). Bei drei Läufen je Version liegt das im Rauschen. „Nicht langsamer“ ist die ehrliche Aussage, „schneller“ nicht.

**Bekannter Fehler (V1):** Ein Schritt hat `Verified:`, aber kein Häkchen. Das schnelle Modell übersieht das, 1.10.0 genauso. Das ist keine Verschlechterung. **Das Studio kann das aber billig auffangen:** Der Parser kennt `ticked` und `verified` je Schritt. Steht `Verified:` ohne Häkchen da, sollte NS-6 wie in S3 „Report · /sdd-plan“ nach vorn stellen, auch ab 1.11.0. Das ist ein Kandidat für 0028.

**Was vor dem PR noch fehlt** (alles auf Deinem Rechner):

- G0 auf Windows: Der Cloud-Nachbau ersetzt den echten Lauf nicht.
- V3 in Copilot und in der VS-Code-Erweiterung von Claude Code: Davon hängt ab, ob der Datei-Chip (Punkt 2) für Copilot überhaupt sinnvoll ist.
- Das Hands-On.

Danach die Releasing-Selbstprüfung: Stempel, Ledger, Spiegel-Frontmatter, `AGENTS.md`-Zeilenziel, Wiki-Impact-Liste.

## 6 Die vier Go-Fragen

### Frage 1: MINOR mit „Fixed prompts, attached specs, level first“?

**MINOR ja**, wenn das Ledger nur `adds:` und geschützte `slot-edits:` enthält. So steht es in der Releasing-Seite. Zwei Dinge würde ich dort prüfen:

- Ist der neue Gate-Satz in `AGENTS.md` ein geschützter Slot-Edit? Dann MINOR. Eine verschobene Slot-Marke wäre MAJOR.
- Gilt „Plan zuerst nachziehen“ als semantischer Wechsel? Dann ist die Probe Pflicht. U1/U2 decken sie ab, das sollte im PR so stehen.

**Titel:** „level first“ ist Innensprache, im Plan heißt das Ergebnis `levelled`. Wer den Changelog liest, versteht es nicht. Vorschlag im Stil von 1.10.0 („Faster plan work, parallel agents, …“): **„Fixed step prompts, attached specs, plan catch-up after breaks“**.

### Frage 2: Squash der Commits, die das Studio nennen

**Ja.** Das ist seit 1.7.0 Praxis: Jeder Release ist ein Squash-Commit `FeatherSpec x.y.z — … (#nn)` auf `main`, und der Tag sitzt auf genau diesem Commit (`v1.10.0` → `26a93c5`). Der entscheidende Punkt ist der Zeitpunkt: **Die Nachrichten müssen vor dem Push neutral sein, nicht erst beim Merge.** Ein gepushter Branch zeigt seine Commits auf GitHub und im Commits-Tab des PR, auch wenn später gesquasht wird. Also:

- lokal zu einem Commit zusammenfassen, z. B. mit `git reset --soft <basis>` und einem neuen Commit;
- vor dem Push mit `git log` und `git grep -i studio` den Diff, CHANGELOG, Wiki-Branch und PR-Text prüfen;
- beim Merge squashen und den Tag danach auf den Squash-Commit setzen, wie bei 1.10.0.

### Frage 3: Roter Schritt beim Nachziehen: anhalten oder weitermachen?

**Anhalten und fragen**, also das jetzige Verhalten. Dafür gibt es drei Gründe:

- Ein rotes `Verify:` heißt, der Stand ist unbekannt. Ein Weiterbau stünde auf einem kaputten Fundament, und der Fehler fiele erst in `/sdd-compile` auf, viel teurer.
- Es passt zur eigenen Regel in `plans.md`: Bei rotem Verify wird angehalten.
- Es hält den Menschen an der Stelle in der Kontrolle, an der eine Entscheidung wirklich nötig ist.

**Damit das Anhalten nicht nervt**, muss es eine gute Stelle sein. Der Agent nennt dann:

- welcher Schritt rot ist und welche Ausgabe er gesehen hat;
- zwei Wege: „erst T-00x reparieren“ (empfohlen) oder „trotzdem mit T-00y weiter“, jeweils mit fertigem Prompt.

Für Worker und Subagents, die nicht fragen können, gilt weiter `Status: BLOCKED` in der Return Note. Das Studio zeigt das als „Find blocker“.

### Frage 4: Prompt-Dateien ab Februar 2027

**Stimmt in der Wirkung, ist aber genauer zu fassen.** VS Code schaltet nicht die Prompt-Dateien ab, sondern den **Local harness**. Der ist veraltet und wird im Februar 2027 entfernt. Der Copilot harness, der ihn ersetzt, lädt keine `*.prompt.md`. Microsoft empfiehlt deshalb, Prompt-Dateien in Agent Skills umzuwandeln. Für FeatherSpec heißt das: Die 13 `.github/prompts/sdd-*.prompt.md`, die nur auf `.claude/commands/` verweisen, laden dann nicht mehr. Der ganze Copilot-Weg fällt aus.

Auch die Claude-Code-Seite ist Altformat. `.claude/commands/` ist in Skills aufgegangen. Es funktioniert weiter und hat kein Enddatum, hatte 2026 aber schon einmal einen Ladefehler (2.1.89).

**Vorschlag für 1.12.0, als eigenes Release mit denselben Gates wie jetzt (B1, U1/U2, Hands-On):**

- **Ein Skill je Befehl** als einzige Quelle, `.claude/skills/sdd-*/SKILL.md`, dazu für Copilot `.github/skills/` (das liest der Copilot harness).
- **`disable-model-invocation: true`** in jedem Skill. Dann laufen die Befehle nur per `/sdd-…`, wie heute, und das Modell zieht sie nicht von selbst. Das ist zugleich die Context-Hygiene, die FeatherSpec verspricht. Zu prüfen ist, wie viel die Beschreibungen trotzdem im Kontext belegen.
- Die heutigen Prompt-Dateien nutzen nur `name`, `description` und `argument-hint`. Bei der Umwandlung geht also nichts verloren, denn wegfallen würden nur `agent`, `model` und `tools`.
- Die Befehlsnamen bleiben gleich. Dann laufen die Studio-Prompts (`/sdd-plan …`) unverändert weiter.
- Zu klären ist, ob das Verschieben der Wiring-Dateien laut Releasing-Seite MAJOR ist („moved, renamed, or deleted wiring files“). Ein Weg ist, in 1.12 hinzuzufügen und die alten Dateien in 2.0 zu entfernen. Doppelte Namen (Command und Skill `sdd-plan`) vorher in beiden Werkzeugen testen.

## 7 Nächste Schritte

1. Die vier Korrekturen aus §3 in den Entwurf, dann den Klicktest machen.
2. Ergebnis von Aufgabe 2 und 5 → Specs 0028, 0025, 0026, 0027 in dieser Reihenfolge. Der Fall „Verified ohne Häkchen“ (§5) gehört zu 0028.
3. FeatherSpec 1.11.0: G0, V3-Copilot, Hands-On → Commits lokal neutral zusammenfassen → PR → Squash-Merge → Tag auf den Squash-Commit → aufräumen.
4. 1.12.0 „Skills statt Prompt-Dateien“ als eigenes Vorhaben anlegen, mit Frist vor Februar 2027.

## Quellen

- VS Code, Agent Skills (Local harness veraltet, Entfernung Februar 2027; Skill-Orte; `disable-model-invocation`): https://code.visualstudio.com/docs/copilot/customization/agent-skills
- VS Code, Migrate Copilot customizations (Copilot harness lädt keine `*.prompt.md`; `agent`, `model` und `tools` gehen verloren): https://code.visualstudio.com/docs/agent-customization/migrate-customizations
- Claude Code: Custom Commands in Skills aufgegangen, `.claude/commands/` funktioniert weiter: https://code.claude.com/docs/en/skills
- FeatherSpec Wiki, Releasing (MINOR/MAJOR nach Ledger, Tag-Regeln): https://github.com/GregorBiswanger/featherspec/wiki/Releasing
