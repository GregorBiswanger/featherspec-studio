# 05 · Priorisierte Empfehlungen

Evidenz-Kürzel: siehe [01](01-product-understanding.md). Konzepte K-A … K-M: siehe [04](04-ux-ui-concepts.md).

**Alle Prioritäten, Aufwände und Nutzenaussagen sind Experteneinschätzungen.** Es gibt keine Nutzungsdaten (das Studio hat bewusst keine Telemetrie). Aufwand in relativen Größen für das bestehende Team (Mensch + Agent mit FeatherSpec-Workflow inkl. Tests): **S** ≈ ein Plan mit wenigen Schritten · **M** ≈ eine Spec mittlerer Größe · **L** ≈ eine große Spec oder zwei Specs.

Jede Umsetzung muss die Projektregel einhalten, dass kein Update die Qualität verschlechtert: bestehende Tests bleiben grün oder werden mit Begründung ersetzt (Testtitel-Abgleich wie in 0015 AC-027).

## Übersicht

| ID | Empfehlung | Prio | Kategorie | Aufwand | Sicherheit | Spec-Änderung |
| --- | --- | --- | --- | --- | --- | --- |
| R-01 | Diagnostics stufen, Parser an FeatherSpec 1.10 angleichen | **P0** | Structural | M | hoch | 0002, 0006 |
| R-02 | Pseudo-Moves entfernen (Drag, „Move to…", Befehl) | **P0** | Structural | S–M | hoch | 0007, 0015, PD-014 |
| R-03 | Nächster Schritt auf Karten und in Mission Control | **P1** | Structural | S | hoch | 0015 OP-003, 0006, 0007 |
| R-04 | Statusleiste: Spec + nächster Schritt, Klick kopiert; Befehl „Copy Next Step" | **P1** | Quick Win | S | mittel–hoch | 0001 |
| R-05 | Sidebar wird Spec-Baum mit Gruppen und Copy-Aktion | **P1** | Structural | M | mittel | 0005, PD-048, ADR-001 |
| R-06 | Mission Control → Overview „Jetzt zuerst" | **P1** | Structural | M | mittel–hoch | 0006 |
| R-07 | Detail als Lagebild statt Volltext | **P1** | Structural | M–L | mittel | 0007 |
| R-08 | Nutzersprache statt Regel-IDs; Dauer-Leermeldungen entfernen | **P1** | Quick Win | S | hoch | 0006, 0007, 0013 (Texte) |
| R-09 | Backlog-Readiness als Bedarf („needs a plan"), keine roten Fehler-Icons | **P1** | Quick Win | S | hoch | 0007 |
| R-10 | Board kompakt: schmale Leerspalten, Done eingeklappt, kein State-Filter, kein Chip | **P2** | Structural | M | mittel | 0007, 0013 |
| R-11 | Dateien „neben" öffnen; Detail als Seitenleiste statt Bereichswechsel | **P2** | Structural | M | mittel | 0005, 0007 |
| R-12 | „Copy" als Primärbutton; kein Layout-Shift durch Statuszeilen | **P2** | Quick Win | S | hoch | 0013 |
| R-13 | Darstellungsfehler `**` in Kriterien beheben | **P2** | Quick Win | S | hoch | – (Bug) |
| R-14 | „Last change" verlässlich machen | **P2** | Structural | S–M | mittel | 0007 |
| R-15 | Kleine Aufräumarbeiten (Projektname 4×, Marker ▸, Refresh-Befehle, Explorer-Liste gruppieren) | **P2** | Quick Win | S | mittel | 0005, 0007 |
| R-16 | NS-6 um „Then: Implement." ergänzen (nach Prüfung) | **P2** | Quick Win | S | mittel | 0015 §6.1 |
| R-17 | Status-Historie lesbar formatieren | **P2** | Quick Win | S | hoch | 0007 |
| R-18 | Setup-Leerzustand: ein Satz, was passiert | **P2** | Quick Win | S | mittel | 0014 |
| R-19 | Phasenleiste pro Spec | **P3** | Innovation | M | niedrig–mittel | neu |
| R-20 | Diagnostics zusätzlich im Problems-Panel | **P3** | Innovation | M | mittel | 0002 |
| R-21 | CodeLens im Plan, Datei-Dekorationen im Explorer | **P3** | Innovation | M | niedrig–mittel | neu |
| R-22 | Aktivität aus Git ableiten | **P3** | Innovation | L | niedrig | 0004, 0006 |
| R-23 | „Send to chat" als Option | **P3** | Innovation | M | niedrig | PD-056 |

---

## P0 – Critical UX Issues

### R-01 · Diagnostics stufen, Parser an FeatherSpec 1.10 angleichen

| Feld | Inhalt |
| --- | --- |
| 1 Aktueller Zustand | Ein Schweregrad. Header „15 specs with diagnostics", Warn-Dreiecke auf allen 15 Karten, bis zu 10 Warnzeilen oben im Detail [B 03, 04, 06] |
| 2 Problem | 83 Meldungen im eigenen, mit FeatherSpec 1.10.0 erzeugten Repo, keine handlungsrelevant; 5 betreffen die `Successor:`-Zeile, die das Studio selbst liest [I][C]. Das Signal ist entwertet: ein echter Widerspruch fällt nicht mehr auf. Das ist eine **falsch dargestellte Information** |
| 3 Betroffene | alle Profile; P2/P3 besonders (Erstkontakt, Präsentation) |
| 4 Vorschlag | Drei Stufen (K-F): *Problem* (Widerspruch, unlesbar, Duplikat, toter Plan-Link) sichtbar; *Format-Hinweis* nur als eingeklappter Zähler im Detail; *Kompatibilität* (von FeatherSpec selbst erzeugte Varianten) gar nicht melden. Header und Karten zeigen nur Probleme |
| 5 Nutzen | Warnungen bedeuten wieder etwas; ruhigere Oberfläche; Vertrauen |
| 6 Konzept | K-F; Text „1 problem" statt „0 project-level diagnostics · 15 specs with diagnostics" |
| 7 Komponenten | MC-Header, Card-Footer, Detail-Overview, Attention |
| 8 Technik | `severity` in `src/core/specs/diagnostics.ts`; Parser-Regeln in `parseSpec.ts`/`parsePlan.ts` gegen die Templates von FeatherSpec 1.10.0 und die Studio-eigenen Specs prüfen; `attention.ts` nutzt bereits die richtige Trennung |
| 9 Aufwand | M |
| 10 Priorität | P0 |
| 11 Sicherheit | hoch (gemessen am eigenen Repo) |
| 12 Validierung | Studio auf dem eigenen Repo und auf `tip-splitter` nach dem Hands-On öffnen: **0 sichtbare Warnungen** ohne echtes Problem; eine absichtlich eingebaute Widerspruchs-Spec erscheint an allen Orten. Regressionstest: jede Fixture zählt ihre Stufen |

### R-02 · Pseudo-Moves entfernen

| Feld | Inhalt |
| --- | --- |
| 1 Aktueller Zustand | Jede Karte ist ziehbar und trägt „Move to…" mit 5 Zielen; dazu Shift+F10 und Befehl „Move Spec to…" [B 09, 26] |
| 2 Problem | 5 von 6 Zielen werden immer abgelehnt; Ready → Active verschiebt nichts und zeigt nur eine Zeile [I 08, 10][C `transitions.ts`]. Die Oberfläche verspricht Steuerung, die es nicht gibt. Herkunft: Agent-Start-Zeit (PD-002, PD-014) |
| 3 Betroffene | alle; Workshop-Teilnehmende besonders (probieren Gesten aus) |
| 4 Vorschlag | Drag & Drop, Move-Button, Move-Menü, Statuszeile und Befehl entfernen. Ersatz: Copy des nächsten Schritts direkt auf der Karte (R-03) |
| 5 Nutzen | Weniger Elemente, keine Sackgassen, klare Rolle „Studio zeigt, Assistent handelt" |
| 6 Konzept | K-D (Variante D); konservative Alternative D2 dort beschrieben |
| 7 Komponenten | `Card.tsx`, `Column.tsx`, `SpecBoard.tsx`, `MoveMenu.tsx`, `Announcer.tsx`, `src/core/board/moves.ts`, Befehl `featherspec-studio.moveSpec` |
| 8 Technik | Reine Entfernung + Tests; Tastaturmodell (Pfeile, Enter) bleibt. Achtung: Testtitel-Abgleich wie 0015 AC-027, damit kein bleibendes Verhalten mit verschwindet |
| 9 Aufwand | S–M |
| 10 Priorität | P0 |
| 11 Sicherheit | hoch |
| 12 Validierung | Hands-On: Aufgabe „Starte die Ready-Spec". Erfolg = Teilnehmer kopiert die Startzeile ohne Fehlversuch. Vorher/nachher zählen: abgelehnte Moves (vorher), Zeit bis Copy |

---

## P1 – High Impact Improvements

### R-03 · Nächster Schritt auf Karten und in Mission Control

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | Nur im Detail und im Drop-Ergebnis [B 06, 08]; auf Karten bewusst nicht (0015 OP-003) [S] |
| 2 Problem | Kernversprechen erst nach zwei Navigationsschritten (Q-1) |
| 3 Betroffene | P1 (häufigster Handgriff), P2 |
| 4 Vorschlag | Letzte Kartenzeile `▸ <Befehl> [Copy]`; MC-Zeilen in „Needs attention"/„Now" mit Befehl + Copy |
| 5 Nutzen | Von „Board ansehen" zu „Befehl im Clipboard" in einem Klick |
| 6 Konzept | K-A, K-C, K-D |
| 7 Komponenten | `Card.tsx`, `Attention.tsx` (bzw. neues `Now.tsx`), Protokolle `board.ts`, `missionControl.ts` |
| 8 Technik | `nextStep(model, key)` existiert und ist rein; Projektion in `cards.ts` und `missionControlService.ts`; Copy-Handler existiert (`copyLine`) |
| 9 Aufwand | S |
| 10 Priorität | P1 |
| 11 Sicherheit | hoch |
| 12 Validierung | Klicks bis Copy messen (heute ≥ 3 inkl. Bereichswechsel, Ziel 1); Hands-On-Beobachtung, ob Teilnehmende den Schritt ohne Hilfe finden |

### R-04 · Statusleiste + Befehl „Copy Next Step"

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | `FeatherSpec: studio (1.10.0)`, Klick → Projektwahl auch bei einem Projekt [B 01, I 25] |
| 2 Problem | Die einzige immer sichtbare Fläche trägt kaum Entscheidungsinformation |
| 3 Betroffene | P1 |
| 4 Vorschlag | `$(feather) 0015 · Review · /sdd-compile`; Klick kopiert; Tooltip mit Projekt/Version; Projektwahl nur bei mehreren Projekten. Neuer Befehl `FeatherSpec: Copy Next Step` (optional mit vorgeschlagenem Tastenkürzel) |
| 5 Nutzen | Nächster Schritt ohne Öffnen des Panels; Tastatur-Flow |
| 6 Konzept | K-G |
| 7 Komponenten | `statusBar.ts`, `extension.ts`, neuer Befehl in `package.json` |
| 8 Technik | Auswahl „zuletzt gewählte Spec, sonst dringendste" im Host; Selection-Memory existiert (`uiMemory.ts`) |
| 9 Aufwand | S |
| 10 Priorität | P1 |
| 11 Sicherheit | mittel–hoch (welche Spec „aktiv" ist, braucht eine klare, erklärbare Regel) |
| 12 Validierung | Tagebuchstudie über eine Arbeitswoche (Gregor + 2 Testnutzer): wie oft wird die Statusleiste statt des Panels genutzt? |

### R-05 · Sidebar wird Spec-Baum

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | 5 Starter-Einträge, keine Information [B 02] |
| 2 Problem | IA-1, IA-7; Baumzeilen als Buttons widersprechen der VS-Code-Richtlinie für Views [S] |
| 3 Betroffene | P1, P2 |
| 4 Vorschlag | Gruppen „In progress", „Up next", „Backlog", „Done"; Zeile = Symbol, Nummer, Titel, Beschreibung „Zustand · Befehl", Inline-Copy; Badge am Activity-Bar-Symbol = Anzahl, die auf den Nutzer wartet; Toolbar: Open Studio, Refresh |
| 5 Nutzen | Lagebild neben dem Code, ohne Editor-Tab; native Barrierefreiheit |
| 6 Konzept | K-B |
| 7 Komponenten | `studioTree.ts`, `treeModel.ts`, `package.json` (`view/item/context`, `view/title`) |
| 8 Technik | Daten liegen im Shell-Modell vor; neue Knotentypen; Welcome-View S2 bleibt |
| 9 Aufwand | M |
| 10 Priorität | P1 |
| 11 Sicherheit | mittel (Gruppierung und Zeilentext brauchen einen Test mit echten Projekten) |
| 12 Validierung | 5-Sekunden-Test: Screenshot der Sidebar zeigen, Frage „Woran arbeitet das Team, was ist der nächste Befehl?" – Ziel: 4 von 5 richtig |

### R-06 · Mission Control → Overview „Jetzt zuerst"

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | 6 Kacheln + Balken + Prozent + Formel oben; Attention ohne Schritt; Activity leer beim Start [B 03] |
| 2 Problem | Zählwerte dominieren, Handlung fehlt; dreifache Darstellung derselben Verteilung; Fortschrittszahl misst Historie |
| 3 Betroffene | P2, P3 |
| 4 Vorschlag | „Now", „Up next", „Problems", dann eine Kennzahlzeile; Activity eingeklappt; Formel in Tooltip; Progress optional |
| 5 Nutzen | Antwort auf „Was jetzt?" in unter 5 Sekunden |
| 6 Konzept | K-C |
| 7 Komponenten | `MissionControl.tsx`, `SpecFigures.tsx`, `Attention.tsx`, `Activity.tsx`, `missionControlService.ts` |
| 8 Technik | Protokoll-Erweiterung; Drill-down-Logik bleibt |
| 9 Aufwand | M |
| 10 Priorität | P1 |
| 11 Sicherheit | mittel–hoch |
| 12 Validierung | 5-Sekunden-Test vorher/nachher; Workshop-Feedback, ob „Now" den Einstieg erleichtert |

### R-07 · Detail als Lagebild

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | Volltext aller Sektionen; 0015 = 4.952 px / 3.459 Wörter [I]; Dauer-Leermeldungen; Readiness-Protokoll |
| 2 Problem | Dupliziert den Editor (Q-5); das Wichtige (offene Kriterien, nächster offener Schritt) geht im Volumen unter |
| 3 Betroffene | P1, P2 |
| 4 Vorschlag | Next · Progress (offene Kriterien namentlich, nächster offener Schritt) · Files · eingeklappt Phase, Format-Hinweise, Historie; IDs öffnen die Datei an der Zeile, neben dem Panel |
| 5 Nutzen | Detail passt auf ≈ 1 Bildschirm; schnelle Compile-Vorbereitung |
| 6 Konzept | K-E |
| 7 Komponenten | `SpecDetail.tsx`, `DetailSection.tsx`, `src/core/board/detail.ts`, `openFile.ts` |
| 8 Technik | Zeilennummern für IDs im Parser verfügbar machen; „offene Kriterien" aus Traceability-Zeilen |
| 9 Aufwand | M–L |
| 10 Priorität | P1 |
| 11 Sicherheit | mittel – manche Nutzer lesen Specs gern im Studio. Daher Übergangs-Toggle „Full content" und Messung im Hands-On |
| 12 Validierung | Aufgabe „Welche Kriterien fehlen noch für 0015?" – Zeit bis zur Antwort; Ziel: ohne Scrollen |

### R-08 · Nutzersprache; Dauer-Leermeldungen entfernen

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | Regel-IDs und Implementierungsbegriffe an vielen Stellen; „not available" für strukturell nie vorhandene Felder [B 03, 06, 19] |
| 2 Problem | Q-4; kognitive Last ohne Entscheidungsnutzen |
| 3 Betroffene | alle, besonders P2/P3 |
| 4 Vorschlag | Texttabelle in 04 („Texte und Sprache"); Regel-ID nur im Tooltip; Priority/verdict/dependencies-Zeilen entfernen und einmal im README erklären |
| 5 Nutzen | ruhigere Oberfläche; schnelleres Verständnis |
| 6 Konzept | 04, Abschnitt „Texte und Sprache" |
| 7 Komponenten | `texts.ts`, `missionControl/texts.ts`, `nextStepTexts.ts`, `RuleText.tsx` |
| 8 Technik | Texte sind zentralisiert; Tests prüfen Literale → Tests anpassen |
| 9 Aufwand | S |
| 10 Priorität | P1 |
| 11 Sicherheit | hoch |
| 12 Validierung | Hands-On: Teilnehmende markieren unverständliche Begriffe auf Screenshots (vorher/nachher) |

P8 „Honest Status" bleibt gewahrt: Unbekanntes, das existieren *könnte* (z. B. Kriterienstand ohne Traceability-Tabelle), wird weiter als „not available" gezeigt. Entfernt wird nur, was FeatherSpec nie liefert.

### R-09 · Backlog-Readiness als Bedarf

| Feld | Inhalt |
| --- | --- |
| 1 Zustand | Frische Backlog-Spec: rote Fehler-Icons R-3, R-4; Kartenhinweis „No sibling plan, or the Plan line does not link it. R-3" [B 18, 19] |
| 2 Problem | Normalzustand wird als Fehler dargestellt (falsche Schwere) |
| 3 Betroffene | alle |
| 4 Vorschlag | „needs a plan" / „needs criteria" / „plan not started" als neutraler Text; kein rotes Icon; Prüfliste R-1…R-7 aus dem Standard-Detail entfernen (bleibt intern für Ready-Ableitung) |
| 5–7 | ruhiger Backlog; Karten, Detail-Overview |
| 8 Technik | Mapping von Readiness-Ergebnis → Bedarfstext im Core |
| 9–11 | S · P1 · hoch |
| 12 Validierung | Screenshot-Befragung: „Ist bei 0003 etwas kaputt?" – Ziel „nein" |

---

## P2 – Experience Refinements

| ID | Zustand → Vorschlag | Komponenten / Technik | Aufwand · Sicherheit | Validierung |
| --- | --- | --- | --- | --- |
| **R-10** Board kompakt | 6 gleich breite Spalten, 3 leer, Blocked abgeschnitten bei 1240 px [B 04]; State-Filter erzeugt 5 leere Spalten [B 28]; Chip doppelt → schmale Leerspalten (32 px), Done eingeklappt, State-Checkboxen weg, Chip weg, Karte 3 Zeilen (K-D) | `Column.tsx`, `Card.tsx`, `FilterBar.tsx`, `main.css`; Drill-down-Filter bleibt | M · mittel | alle befüllten Spalten bei 1240 px ohne Scrollen sichtbar; Karten pro Bildschirmhöhe ≥ 6 |
| **R-11** Kontext halten | Karte → Bereichswechsel; „Open file" verdeckt Studio [I 24] → Detail als Seitenleiste; Dateien `ViewColumn.Beside` + Zeile | `SpecBoard.tsx`, `App.tsx`, `editor.ts` (`openFile`) | M · mittel | Aufgabe „Prüfe drei Specs nacheinander" – Anzahl Bereichswechsel |
| **R-12** Copy primär | „Dismiss" gefüllt, „Copy" sekundär; Statuszeile verschiebt Spalten [B 08] → Copy primär, Bestätigung inline am Button | `NextStep.tsx`, `Announcer.tsx` (falls er bleibt), `main.css` | S · hoch | visuelle Prüfung Dark/Light/HC |
| **R-13** `**`-Bug | „…intermediate table** When…" [B 19] → Inline-Formatter für `**AC-001 — Titel**`-Muster korrigieren | `src/webview/ui/inlineFormat.ts`, `tidy()`; Fixture `fs170-brownfield-mixed` | S · hoch | Regressionstest mit diesem Muster |
| **R-14** Zeiten | Alle Specs gleiche „Last change" nach Kopie [B 04] → Planfeld `Last updated:` bevorzugen, sonst ausblenden wenn alle gleich (K-J) | `cards.ts`, `detail.ts` | S–M · mittel | Fixture mit identischen mtimes |
| **R-15** Aufräumen | Projektname 4× [B 03]; Marker ▸ + Hervorhebung; zwei Refresh-Befehle; Explorer-Liste flach [B 05] → Name in Statusleiste + Kopf; nur Hervorhebung; ein „Refresh"; Liste nach Gruppen wie K-B (falls Explorer bleibt) | `Navigation.tsx`, `App.tsx`, `package.json`, `SpecExplorer.tsx` | S · mittel | – |
| **R-16** NS-6 vervollständigen | Active-Spec zeigt nur `/sdd-plan` [B]; FeatherSpec Mode B wartet danach auf „continue" [S] → zweite Zeile „Then: Implement." oder „Then: Start T-007" | `nextStep.ts`, Fixtures | S · mittel | mit Gregor gegen FeatherSpec-Semantik prüfen; Hands-On-Beobachtung |
| **R-17** Historie lesbar | `2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked` → „Today 21:56 — first seen as Review" | `SpecDetail.tsx` | S · hoch | – |
| **R-18** Setup erklären | Leerzustand nennt nicht, was Setup tut [B 12] → ein Satz: „Downloads the latest FeatherSpec release from GitHub and adds its files. Nothing is overwritten." | `PanelStateView.tsx`, `texts.ts`, `viewsWelcome` | S · mittel | Workshop: Teilnehmende klicken ohne Rückfrage |

---

## P3 – Optional Innovations (vor dem Bau validieren)

| ID | Idee | Nutzen-Hypothese | Risiko | Validierung vor dem Bau |
| --- | --- | --- | --- | --- |
| **R-19** | Phasenleiste Specify → Clarify → Plan → Implement → Compile → Done (K-H) | Orientierung im Loop, besonders für Einsteiger | „Clarify" und „Plan gelesen" sind nicht persistiert → viele „?" | Papier-Prototyp im Workshop |
| **R-20** | Diagnostics zusätzlich ins Problems-Panel (`DiagnosticCollection`) | Sprung an die Zeile, späterer Quick Fix | Rauschen im Problems-Panel, falls R-01 nicht zuerst kommt | erst nach R-01 |
| **R-21** | CodeLens über dem nächsten offenen Planschritt; Datei-Dekorationen nach Zustand (K-L) | Kern erreicht das Dokument, das ohnehin offen ist | visuelle Last im Editor | Prototyp, Meinung von 3 Nutzern |
| **R-22** | „Recent activity" aus Git (K-K) | Aktivität beim ersten Öffnen gefüllt | Performance, Restricted Mode, Doppelung mit 0004 | Spike: Laufzeit auf einem Repo mit 200 Specs |
| **R-23** | „Send to chat" zusätzlich zu Copy (K-M) | ein Kontextwechsel weniger | bricht PD-056, bindet an VS-Code-Chat | Interviews; nur als Einstellung |

---

## Abhängigkeiten

```
R-01 ─┬─► R-03 (Karten zeigen nur echte Probleme + Schritt)
      ├─► R-06 (Problems-Abschnitt)
      └─► R-20
R-02 ──► R-10 (Board ohne Moves kann kompakt werden)
R-03 ──► R-05, R-06, R-04 (gleiche Projektion, gleiche Copy-Logik)
R-08 ──► R-06, R-07 (neue Texte)
R-11 ──► R-07 (Detail als Seitenleiste)
R-05 ──► späteres Entfernen des Bereichs Spec Explorer (Zielbild B in 03)
```

## Empfohlene Reihenfolge

| Etappe | Inhalt | Ziel |
| --- | --- | --- |
| **1 · Ehrliche Signale** | R-13, R-08, R-09, R-17, R-12, R-01 | Die Oberfläche sagt nur noch, was stimmt und zählt. Wenig Risiko, hoher Effekt auf den ersten Eindruck |
| **2 · Kern sichtbar machen** | R-03, R-04, R-02, R-16 | „Know its next step" an jeder Fläche, keine Sackgassen mehr |
| **3 · Struktur** | R-06, R-07, R-11, R-10, R-14, R-15, R-18 | Overview „Jetzt zuerst", Detail als Lagebild, kompaktes Board |
| **4 · Native Arbeitsfläche** | R-05, danach Entscheidung über den Bereich Spec Explorer | Zielbild B aus 03 |
| **5 · Validieren, dann bauen** | R-19 … R-23 | nur bei belegtem Bedarf |

Jede Etappe passt zum FeatherSpec-Workflow des Repos: eine Spec pro Etappe (`/sdd-specify` revise mode für die betroffenen Specs, dann `/sdd-plan`), und vor dem Release ein Hands-On-Durchgang auf `tip-splitter`.

## Validierungsrahmen (ohne Telemetrie)

| Methode | Wann | Messgröße |
| --- | --- | --- |
| **Hands-On mit Aufgaben** (Gregor + 3–5 Workshop-Teilnehmende) | vor Etappe 1 (Baseline) und nach Etappe 2 und 3 | Zeit und Klicks bis „richtigen nächsten Befehl kopiert"; Fehlversuche (abgelehnte Moves); Fragen an den Trainer |
| **5-Sekunden-Test** mit Screenshots | vor/nach R-06, R-05 | „Was ist in Arbeit? Was ist der nächste Befehl?" – Trefferquote |
| **Eigenes Repo als Messlatte** | jede Etappe | sichtbare Warnungen (Ziel 0 ohne echtes Problem), Detail-Höhe (Ziel ≤ 1,5 Bildschirmhöhen bei 0015), Kartenhöhe |
| **Regressionstests** | jede Änderung | bestehende Suite + Testtitel-Abgleich; neue Fixtures für Diagnostic-Stufen und Zeitangaben |
