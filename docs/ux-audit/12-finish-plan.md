# FeatherSpec Studio · Was bis „fertig“ noch zu tun ist

Stand 19.11.2026 · Repo `C:\projects\featherspec-studio`, Branch `ux-round-3`, Kopf `27ccf2e` · Ergänzt [10-team-briefing-round3.md](10-team-briefing-round3.md) und [11-round3-clicktest-review.md](11-round3-clicktest-review.md)

> Diese Datei ist die **eine Arbeitsliste bis zum Abschluss**. Jede Aufgabe hat eine ID (A-1 …). Specs, Commits und PRs nennen diese ID. Ist eine Aufgabe erledigt, wird sie hier abgehakt (`[x]`).

## 0. Was „fertig“ heißt

Das Studio ist fertig, wenn alles Folgende gilt:

1. Die Specs **0028, 0025, 0026 und 0027** sind umgesetzt, und jede hat ein frisches `/sdd-compile` mit READY bestanden.
2. Der **Klicktest** ist gelaufen, und seine Ergebnisse sind in die Specs eingeflossen.
3. Die **Abschlussprüfung am echten VSIX** hat keinen P1-Befund mehr ergeben (Abschnitt F).
4. **Echtes Senden** an Copilot und an Claude Code ist auf Gregors Rechner geprüft.
5. Der Copilot-Weg über **Februar 2027** hinaus ist abgesichert, oder es gibt einen Plan mit Termin dafür (Abschnitt E).
6. Danach kommt der **Feature-Freeze**: nur noch Fehlerbehebungen, neue Ideen gehen in den Backlog (Abschnitt G).

## 1. Reihenfolge auf einen Blick

```
A Vorbereitung ──► B Klicktest ──► D1 0028 ──► D2 0025 ──► D3 0026 ──► D4 0027 ──► F Abschlussprüfung ──► G Freeze
                                    ▲                                    ▲
C FeatherSpec 1.11.0 Release ───────┴────────────────────────────────────┘
E Copilot-harness-Spike (parallel zu D, vor F fertig)
```

- **B vor D:** Der Klicktest entscheidet Wortlaut und Menü. Er kommt vor jedem `/sdd-plan`.
- **C vor D1 und D4:** Die Versionsweiche (0028) und der Anhang (0027) brauchen ein veröffentlichtes 1.11.0 und die V3-Ergebnisse.
- **D2 und D3** dürfen parallel laufen, wenn zwei Leute verfügbar sind. Sie berühren dann zum Teil dieselben Texte, also beim Merge aufpassen.
- **E** ist unabhängig und kann sofort starten.

## A. Vorbereitung (Team, ½ Tag)

- [x] **A-1** Die Dateien `docs/ux-audit/11-…` und `12-…` sowie `README.md` auf `ux-round-3` committen. Das ganze Team arbeitet von diesem Stand.
- [x] **A-2** Die Entscheidungen, die der Klicktest-Entwurf schon voraussetzt, als PD in `docs/product/product-decisions.md` festhalten:
  - **OP-004:** Copilot sendet standardmäßig in einen **neuen Chat**.
  - **E-13:** Prozent werden kaufmännisch gerundet und zeigen höchstens 99 %, solange etwas offen ist.
  - **Wortwahl:** überall „**current chat**“.
  - **V1-11:** Ein roter Schritt beim Nachziehen heißt **anhalten und fragen** (11 §6 Frage 3).
- [x] **A-3** Neue Testdaten unter `test/fixtures/` anlegen. Ohne sie lassen sich D1, D2 und F nicht prüfen.

| Fixture | Inhalt | Für |
| --- | --- | --- |
| `fs-version-missing/` | `AGENTS.md` ohne `FeatherSpecVersion:` | D1 |
| `fs-version-1100/` | Stempel 1.10.0, unterbrochen (`Current step` ≠ erster offener Schritt) | D1 |
| `fs-version-1110/` | Stempel 1.11.0, sonst gleich | D1 |
| `fs-verified-no-tick/` | ein Schritt mit `Verified:`, aber ohne Häkchen | D1 |
| `fs-partial-return/` | Stage `T-004 ‖ T-005`, nur T-005 hat eine Return Note | D2 |

## B. Klicktest (Team + Gregor, 1 Tag)

Der Entwurf liegt im Artifact `2HPSzmxus6hhKPkuGm47wp`, Boards `Studio window` und `Tasks`.

- [x] **B-1** Die vier Korrekturen aus 11 §3 in den Entwurf einbauen:
  1. S4: „Paste it …“ durch „**Send** it once …“ ersetzen. Dazu anzeigen, wer noch fehlt: „1 of 2 returned · T-004 not back yet“.
  2. Die Begründung bei „current or new chat“ hängt von der Version ab. Ab 1.11.0 lautet sie: „after a break, the step first brings the plan up to date“.
  3. Prozentwerte ohne Leerzeichen schreiben: `43%`.
  4. „Put back in line“ durch den Zielzustand ersetzen, z. B. „Move back to Ready“.
- [x] **B-2** Den Wortlaut von Bestätigungspunkt 4 in `Tasks` ändern: „vor 1.11.0 (z. B. 1.10.0)“ statt „unter 1.11.0“.
- [x] **B-3** Die Erfassung je Aufgabe ergänzen:
  - gelöst ja / nein / mit Hilfe;
  - Leichtigkeit von 1 (sehr schwer) bis 7 (sehr leicht).
- [x] **B-4** (teilweise, Aufgaben 1–3; Rest über F-3) Den Test mit Gregor durchführen, nach Möglichkeit mit einer zweiten Person, die das Studio nicht kennt.
- [x] **B-5** Die Ergebnisse auswerten, zuerst **Aufgabe 2** (current chat) und **Aufgabe 5** (Rückläufer). Es gelten diese Regeln:
  - **Aufgabe 2** gilt als nicht gelöst, wenn der Chevron nicht gefunden wird. Dann zeigt das Menü die aktive Wahl mit Häkchen, und die Beschriftung bleibt „Send to Copilot“.
  - **Aufgabe 6** gilt nur als halb gelöst, wenn der Plan über „Open plan“ oben statt bei T-006 geöffnet wird. Dann „Open in plan“ in der Karte sichtbarer machen.
- [x] **B-6** Das Ergebnis als `docs/ux-audit/13-clicktest-results.md` ablegen. Die Specs D1 bis D4 zitieren daraus.

## C. FeatherSpec 1.11.0 veröffentlichen (Gregor + FeatherSpec-Agent, im FeatherSpec-Repo)

Das gehört nicht ins Studio-Repo, das Studio braucht es aber. Es gelten die Projektregeln: eigener Branch, PR erst, wenn nichts schlechter ist, die [Releasing-Anleitung](https://github.com/GregorBiswanger/featherspec/wiki/Releasing) und danach aufräumen.

- [ ] **C-1** G0 auf Windows laufen lassen (QA-Bridge, frischer Klon des Branches).
- [ ] **C-2** V3 in **Copilot** und in der **VS-Code-Erweiterung von Claude Code** prüfen: Wird eine angehängte Spec ein zweites Mal gelesen? Das Ergebnis geht an D4.
- [ ] **C-3** Das Hands-On auf einem frischen `C:\projects\test\tip-splitter` durchspielen.
- [ ] **C-4** Den Titel festlegen. Vorschlag: „Fixed step prompts, attached specs, plan catch-up after breaks“. Das Ledger prüfen: MINOR nur, wenn ausschließlich `adds:` oder geschützte `slot-edits:` darin stehen.
- [ ] **C-5** **Vor dem Push** lokal zu einem Commit mit neutraler Nachricht zusammenfassen und `git grep -i studio` über Diff, CHANGELOG, Wiki-Branch und PR-Text laufen lassen.
- [ ] **C-6** PR erstellen, per Squash mergen, den Tag auf den Squash-Commit setzen (wie `v1.10.0` → `26a93c5`), Wiki veröffentlichen, Branches aufräumen.

Damit sind die drei FeatherSpec-Kandidaten aus 10 §8 erledigt: feste Prompts, „angehängte Spec gilt als gelesen“ und „Plan zuerst nachziehen“.

## D. Die vier Specs

Für alle Specs gilt dasselbe Muster wie in den Runden 1 und 2:

- Bestehende Specs bekommen eine Änderungsnotiz „*Amended by 00xx …*“.
- Je Spec läuft ein frisches `/sdd-compile` und der Testtitel-Abgleich.
- Jede Umsetzung wird in der Vorschau geprüft: Dark, Light und High Contrast, bei 1600 und 1000 px, mit offener Seitenleiste.

### D1 · 0028 Interruption-aware next step (zuerst)

Hängt ab von C (veröffentlichtes 1.11.0) und B (Wortlaut). Ändert PD-072.

- [ ] **D1-1 Version erkennen:**
  - `FeatherSpecVersion:` aus `AGENTS.md` lesen.
  - Bei Dateiänderung und nach `/sdd-featherspec-update` neu auswerten.
  - **Ist die Version unbekannt, fehlt sie oder lässt sie sich nicht parsen, gilt das alte Verhalten.** Das ist der sichere Standard.
- [ ] **D1-2 Weiche nach Version:**
  - Vor 1.11.0 kommt nach einer Unterbrechung zuerst „Report · /sdd-plan“ und Continue an zweiter Stelle (G-11).
  - Ab 1.11.0 bleibt „Continue · Implement T-00x“ vorn, weil der Schritt selbst nachzieht.
  - Unterbrechung heißt: `Current step` ≠ erster offener Schritt.
- [ ] **D1-3 Rückläufer gehen immer vor**, unabhängig von der Version (S4).
- [ ] **D1-4 „Verified ohne Häkchen“:** Hat ein Schritt eine `Verified:`-Zeile, aber kein Häkchen, steht „Report · /sdd-plan“ vorn, **auch ab 1.11.0**. Das fängt den bekannten V1-Fehler des schnellen Modells ab (11 §5). Im `(?)` steht die Begründung, z. B. „T-003 has a Verified line but no tick“.
- [ ] **D1-5** Die REASON-Texte hängen von der Version ab (B-1 Punkt 2).
- [ ] **D1-6** Tests für alle fünf Fixtures aus A-3, jeweils in den Next-step-Regeln (`src/core/board/nextStep.ts`) und in der Statusleiste.

### D2 · 0025 Plan map navigation and progress clarity

Ändert 0023, 0019, 0021 und 0022.

- [ ] **D2-1 F-1:**
  - Ein Klick auf Schritt-Chip oder „Next open step“ öffnet die Plan map. Die Karte ist dann aufgeklappt, fokussiert und 1,5 s hervorgehoben.
  - Strg/Cmd+Klick öffnet die Datei an der Überschrift.
  - Die Karte zeigt Files, Covers (mit Zustand und Link zur Spec-Zeile), Verified, Do und Verify sowie „Open in plan“.
- [ ] **D2-2 F-2:** Prozent stehen an jedem Fortschritt:
  - in der Seitenleiste, der Plan map, auf den Board-Karten und im Baum-Tooltip;
  - im Format `3 of 7 done · 43%` und `Steps 3/7 · 43%`;
  - mit `title` und `aria-valuetext`; Rundung nach E-13.
- [ ] **D2-3 G-1:** Die Schritt-Symbole sind Codicons: `check`, `debug-stackframe`, `circle-large-outline`, `reply`, `circle-slash` und `question`. Jedes Symbol hat ein Wort in `aria-label`.
- [ ] **D2-4 G-2 plus Gruppenblick:**
  - Hat ein Schritt eine Return Note, verschwindet „Next open step“, und es erscheint „N returned, waiting to be integrated“.
  - **Neu:** Bei einer parallelen Gruppe nennt das Studio, wer noch fehlt, z. B. „1 of 2 returned · T-004 not back yet“. Die Gruppe kommt aus der Stage-Zeile (`parsePlan.ts`). Solange jemand fehlt, steht „Integrate“ nicht als Primärknopf da.
- [ ] **D2-5 G-7:** Wenn die nächste Stufe parallel ist, zeigt der Next step in der Seitenleiste „Stage N can run in parallel · Ways to run it“.
- [ ] **D2-6 G-10:** Kartentitel auf höchstens zwei Zeilen begrenzen.
- [ ] **D2-7** „Copy prompt“ erscheint auf einer Karte nur beim Schritt, der jetzt dran ist, und erst, wenn die Karte aufgeklappt ist.
- [ ] **D2-8** Zeigt die Plan map denselben Spec wie die Seitenleiste, trägt nur der Kopf der Plan map den Next step (G-5).

### D3 · 0026 Send defaults and wording

Ändert 0024, 0021, 0018 und 0022.

- [ ] **D3-1 OP-004:** Copilot sendet standardmäßig in einen neuen Chat. Das Menü am Send-Knopf enthält „Send to a new chat“, „Send to the current chat“ und „Copy prompt“; die aktive Wahl ist markiert, wenn B-5 das verlangt.
- [ ] **D3-2** Nach dem Senden erscheint: „The prompt is in Copilot's chat. Check it, then send it there.“ Das Studio sendet nie selbst.
- [ ] **D3-3 G-8:** Kurzformen ohne sichtbares „Next“ verwenden; „Next step:“ bleibt für Screenreader:
  - `Continue`, `Start`, `Report`, `Write plan`, `Integrate`, `Verify`, `Add criteria`, `Find blocker`;
  - der Ersatz für „Put back in line“ aus B-5.
- [ ] **D3-4 G-3:** Im Ways-Block steht je Weg eine Radio-Zeile mit einem Satz; die Details stehen im `(?)`. „In sequence“ ist als `default` markiert, und die Doppelung von „Other agents“ entfällt.
- [ ] **D3-5 G-5:** Die Coach-Zeile erscheint nur einmal je Ansicht.
- [ ] **D3-6 G-9:** Der Bereich „Now“ zeigt höchstens fünf Zeilen, darunter „Show N more“.
- [ ] **D3-7** Der Text-Abgleich ersetzt jedes „Paste“ neben einem Send-Knopf durch „Send“ und vereinheitlicht „same chat“ zu „current chat“.

### D4 · 0027 Attach the spec when sending (zuletzt)

Hängt ab von C-2. Ändert PD-068 und PD-074.

- [ ] **D4-1** Unter Send zeigt ein Datei-Chip `<spec>.md attached when sent`. Der Tooltip lautet „Copy prompt attaches nothing.“
- [ ] **D4-2 Weiche je Assistent und Version:** Ob angehängt wird, hängt vom **Ergebnis von C-2** ab und nicht nur von der FeatherSpec-Version.
  - Liest ein Assistent eine angehängte Spec trotzdem ein zweites Mal, hängt das Studio für ihn nichts an. Der Chip entfällt dann.
  - Vor 1.11.0 wird nie angehängt. Dann erscheint im `(?)` der Hinweis zu `/sdd-featherspec-update`.
- [ ] **D4-3** Kein `modelSelector` als Standard: Das Modell wählt der Mensch im Chat (09 §6).
- [ ] **D4-4** Eine Probe mit einer großen Studio-Spec: Wie viel Kontext kostet der Anhang, und bleibt das Ergebnis gleich gut?

## E. Copilot-Weg über Februar 2027 absichern (1 Person, parallel zu D)

**Hintergrund (11 §6 Frage 4):** VS Code entfernt im Februar 2027 den Local harness. Der Copilot harness lädt keine `*.prompt.md`, und genau darauf läuft heute der Copilot-Weg von FeatherSpec. FeatherSpec zieht deshalb in 1.12 auf Skills um.

- [ ] **E-1 Spike V-4** (vorbereitet, `docs/decisions/v4-copilot-harness-spike.md`, wartet auf Gregor): Prüfen, ob `workbench.action.chat.open` mit `query`, `isPartialQuery` und `attachFiles` in einer **Copilot-harness-Sitzung** genauso vorbefüllt wie heute. Das Ergebnis als `docs/decisions/v4-copilot-harness-spike.md` ablegen. Fällt das Vorbefüllen weg, braucht es einen Ersatz, z. B. Copy prompt als Rückfall mit klarem Hinweis.
- [x] **E-2** Sicherstellen, dass das Studio nirgends prüft, ob `.github/prompts/` oder `.claude/commands/` existieren. Es darf nur von den Befehlsnamen `/sdd-*` abhängen.
- [ ] **E-3** Ein FeatherSpec-1.12-Branch, in dem die Befehle als Skills mit gleichen Namen und `disable-model-invocation: true` laufen: Laufen alle Studio-Prompts unverändert? Das muss vor dem FeatherSpec-Release geprüft sein.
- [x] **E-4** In FeatherSpec ein eigenes Vorhaben „1.12.0 Skills statt Prompt-Dateien“ anlegen, mit Frist **Januar 2027**. Dazu klären, ob das nach der Releasing-Seite MAJOR ist (Wiring-Dateien werden verschoben).

## F. Abschlussprüfung (UX + Gregor, 1 Tag)

- [ ] **F-1** Ein VSIX vom Stand nach D4 bauen und in der isolierten Umgebung prüfen:
  - die Lagen S1 bis S4 und die Fixtures aus A-3;
  - Dark, Light und High Contrast;
  - 1600 und 1000 px sowie unter 900 px (Liste oder Detail mit „Back to …“);
  - nur Tastatur, mit Fokus-Reihenfolge, Esc, Pfeiltasten im Menü und im Radio;
  - die Screenreader-Texte (`aria-label`, `aria-valuetext`, `role=status`).
- [ ] **F-2** Echtes Senden auf Gregors Rechner, an **Copilot** (neuer und aktueller Chat) und an **Claude Code**. Prüfen, dass nichts automatisch gesendet wird und dass der Anhang so ankommt, wie der Chip es sagt.
- [ ] **F-3** Einmal komplett auf `C:\projects\test\tip-splitter` durchspielen, von Ready bis Done. Dabei ein paralleler Lauf mit Return Note und eine Unterbrechung. So wurde F-1 gefunden.
- [ ] **F-4** Die Bewertung schreibt die UX als `docs/ux-audit/14-final-review.md`. Gibt es noch einen P1-Befund, wird er gezielt behoben und nur dieser Punkt erneut geprüft.

## G. Freeze und Aufräumen

- [ ] **G-1** Feature-Freeze ausrufen: ab jetzt nur noch Fehlerbehebungen. Neue Ideen kommen nach `.specs/backlog/` und nicht in eine Runde 4. So bleibt die Linie „Guide, don't crowd“ (Leitlinie) erhalten.
- [ ] **G-2** Die Audit-Ordner aufräumen. In `docs/ux-audit/README.md` als gültig markieren:
  - Leitlinien: `ux-guidelines.md`;
  - Abschlussstand: Datei 14.
  Alles andere wird als Historie markiert.
- [ ] **G-3** Den `CHANGELOG` bzw. die Versionsnotiz des Studios schreiben, Branches mergen und lokale Branches löschen.
- [ ] **G-4** Die Status-Docs im Claude-Projekt „FeatherSpec“ auf „abgeschlossen“ setzen.

## Offene Entscheidungen für Gregor

| Wann | Frage | Empfehlung |
| --- | --- | --- |
| A-2 | OP-004, E-13, „current chat“, V1-11 festschreiben | wie im Entwurf |
| B-5 | Ersatz für „Put back in line“ | den Zielzustand nennen |
| C-4 | Titel und MINOR für 1.11.0 | 11 §6 Frage 1 |
| D4-2 | Anhang je Assistent | nach dem Ergebnis von C-2 |
| E-4 | Ist 1.12 (Skills) MINOR oder MAJOR? | Releasing-Seite; ggf. 1.12 hinzufügen, 2.0 entfernen |
| G-1 | Freeze-Zeitpunkt | direkt nach F-4 |

## Prozessregeln (gelten weiter, 10 §7)

1. Klicktest vor `/sdd-plan`.
2. Vorschau in drei Themes und zwei Breiten nach jeder Umsetzung.
3. Echte Nutzung auf `tip-splitter` vor jedem Abschluss.
4. Je Spec ein frisches `/sdd-compile`, Testtitel-Abgleich, nichts veröffentlichen ohne Gregors „Go“.
