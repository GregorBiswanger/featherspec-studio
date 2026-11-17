# 02 · Audit der aktuellen Experience

Evidenz-Kürzel: siehe [01](01-product-understanding.md) (**[B]** beobachtet · **[I]** Interaktion · **[T]** Test · **[C]** Code · **[S]** Spec · **[H]** Hypothese).

## 1. Testumgebung und Vorgehen

### 1.1 Was ausgeführt wurde

Die Extension lief **tatsächlich** und wurde wie von einem Nutzer bedient: per Klick, Tastatur, Drag & Drop und Befehlspalette, mit Screenshots aller Zustände.

| Punkt | Umsetzung |
| --- | --- |
| Artefakt | Das echte Paket `featherspec-studio-0.1.0.vsix` aus dem Repo (Stand `3c2b8b7`) |
| VS Code | **code-server 4.145.2 = VS Code 1.145.2** (Web-Build von VS Code OSS) in einem isolierten Linux-Container, gesteuert über Chrome und Playwright |
| Isolation | Eigenes `--user-data-dir` und `--extensions-dir`, nur Kopien von Projektdateien, Gregors Rechner, Profile und Repo blieben unberührt |
| Anpassung | Das Manifest verlangt `^1.146.0`. In einer **temporären Kopie** des VSIX habe ich `engines.vscode` auf `^1.145.0` gesetzt; der Code ist unverändert |
| Workspaces | (a) **studio**: die echten 15 Specs, 13 archivierten Pläne, Memory Bank und `AGENTS.md` dieses Repos; (b) **brownfield**: Fixture `fs170-brownfield-mixed` (9 Specs, FeatherSpec 1.7.0); (c) **ready**: Fixture `fs110-ready-synthetic` (eine Ready-Spec); (d) **broken**: Fixture `fs-broken` (ungültiges UTF-8); (e) **empty**: Ordner ohne FeatherSpec |
| Themes | Dark Modern, Light Modern, Default High Contrast |
| Breiten | Fenster 1600 × 1000 (Editorfläche ≈ 1240 px) und 1000 × 800 (Editorfläche ≈ 640 px) |

### 1.2 Warum nicht der Windows-Desktop

Für den Desktop-Weg standen zwei Optionen offen: der Extension Development Host auf Gregors Windows-Rechner (per Computer Use, mit Rückfrage und Eingriff in seinen Desktop) oder eine isolierte Umgebung. Ich habe die isolierte Variante gewählt, weil der Auftrag ausdrücklich „isoliert, nicht invasiv" verlangt. Ein Download von VS Code selbst (`update.code.visualstudio.com`) war in beiden verfügbaren Linux-Umgebungen gesperrt. code-server installiert sich über npm und war die einzige Möglichkeit, echtes VS Code mit der echten Extension zu betreiben.

### 1.3 Grenzen dieser Untersuchung

| Nicht oder nur teilweise geprüft | Ursache |
| --- | --- |
| Electron-Desktop-Verhalten (Fensterrahmen, native Menüs, echtes Windows-Clipboard) | Web-Build statt Desktop. Webview, TreeView, Statusleiste und Quick Picks sind dieselben Workbench-Komponenten; Abweichungen sind unwahrscheinlich, aber nicht ausgeschlossen |
| Setup-Erfolgsweg (Dateien schreiben) | GitHub-Download vom Proxy der Umgebung mit 403 abgewiesen. Geprüft wurde die **Fehlerdarstellung**. Der Erfolgsweg ist laut Projektstatus auf Windows live getestet (2 grün) [T, fremd] |
| Restricted Mode | Workspace Trust war für die Testumgebung abgeschaltet |
| Mehrere Projekte (S3), Projekt nicht gefunden (S8), zweites Fenster (Reader) | nicht aufgebaut |
| Screenreader | kein Screenreader verfügbar; nur ARIA-Struktur im Code gelesen |
| Eigener Unit-Test-Lauf | `node_modules` im Repo sind für Windows gebaut; ich habe auf den dokumentierten Lauf vom 17.11. verwiesen |
| Screenshot-Artefakt | Vollbild-Screenshots des Boards im Light-Theme zeigten die Spalten fälschlich dunkel. Berechnete Styles (`.column` = `#f8f8f8`, `.card` = `#ffffff`) und ein Element-Screenshot (`18-light-board-brownfield-element.png`) zeigen korrektes Light-Theme. Kein Befund |

## 2. Durchgeführte Szenarien

| # | Szenario | Ergebnis | Screenshots |
| --- | --- | --- | --- |
| 1 | Erster Start im echten Studio-Repo | Statusleiste `FeatherSpec: studio (1.10.0)` erscheint sofort, Activity-Bar-Symbol sichtbar | 01, 02 |
| 2 | Activity-Bar-Baum öffnen | 5 Einträge ohne Statusinformation | 02 |
| 3 | Mission Control, Board, Explorer über den Baum | funktioniert; Fokuswechsel ins Panel | 03, 04, 05 |
| 4 | Spec im Explorer wählen (0015, Review) | Detail mit „Next step", 10 Diagnostics-Zeilen, Volltext | 06 |
| 5 | Board mit Ready-Spec: Drag Ready → Active | Karte springt zurück; Statuszeile mit Startzeile und Copy | 07, 08 |
| 6 | Copy im Drop-Ergebnis | „Copied to the clipboard." erscheint | 09 |
| 7 | „Move to…" an einer Done-Karte → Backlog | Menü mit 5 Zielen; Ablehnung „Studio does not move specs…" | 09, 10 |
| 8 | Leerer Ordner | Welcome-View mit „Set up FeatherSpec"; Panel mit gleichem Angebot | 11, 12 |
| 9 | Setup starten (ohne Netz zu GitHub) | Notification mit Grund und „Retry"/„Open setup guide" | 15 |
| 10 | Kaputtes Projekt | Titel „not available", Attention „Diagnostic" | 13, 14 |
| 11 | Light Theme, 1600 und 1000 px | lesbar; Board bei 1000 px nur 2,4 Spalten sichtbar | 17–22 |
| 12 | High Contrast + Pfeiltasten im Board | Fokusrahmen klar; → springt über leere Spalten | 23 |
| 13 | Karte anklicken | wechselt in den Bereich Spec Explorer | – [I] |
| 14 | „Open file" im Detail | Markdown öffnet im selben Editor-Group-Tab; Studio-Tab wird verdeckt | 24 |
| 15 | Statusleiste klicken | Quick Pick „Select the FeatherSpec project" mit **einem** Eintrag | 25 |
| 16 | Befehl „FeatherSpec: Move Spec to…" | wählt still die zuletzt gewählte Spec 0006, bietet 5 Ziele | 26 |
| 17 | Spec extern verschieben (simuliert `/sdd-lifecycle`) | Recent activity zeigt „Ready → Active" ohne Reload | 27 |
| 18 | Review-Kachel anklicken | Board mit Filter „Review"; 5 leere Spalten bleiben stehen, „13 hidden by filter" | 28 |
| 19 | Diagnostics-Zähler anklicken | Board mit „Named set: Diagnostics" | 29 |
| 20 | Länge des Details gemessen | 0015: **4.952 px Höhe** bei 899 px Viewport, **3.459 Wörter**; 0007: 3.944 px, 2.895 Wörter | – [I] |
| 21 | Diagnostics im Studio-Repo ausgezählt | **83 Diagnostics an allen 15 Specs** (Spanne 1–29 je Spec) | 04 |

## 3. Bewertung der Komponenten

Skala: **KEEP** · **REFINE** · **REDESIGN** · **REMOVE** · **ADD**

### 3.1 Activity-Bar-Container und Baum — **REDESIGN**

| Kriterium | Befund |
| --- | --- |
| A Purpose | Einstieg ins Studio. Mehr nicht: Projektname, „Open Studio", 3 Bereichs-Links [B 02] |
| B Information Value | Null Zustandsinformation. ADR-001 sah vor: *„a navigation shortcut plus a compact status of specs and runs"* – der Status-Teil fehlt [S][B] |
| C Hierarchie | 5 gleichrangige Zeilen; „studio" ist ein toter Eintrag ohne Aktion [C `treeModel.ts`] |
| D Darstellung | Baumzeilen als Buttons. Die VS-Code-Richtlinie rät ausdrücklich davon ab, Baumelemente als Befehls-Buttons zu nutzen [S, VS Code UX Guidelines „Views"] |
| E Interaktion | „Open Studio" und „Mission Control" führen meist zum selben Ziel – doppelter Weg |
| F Cognitive Load | gering, aber ohne Nutzen |
| H VS-Code-Integration | Die Sidebar ist die Fläche, die beim Coden sichtbar bleibt. Sie bleibt hier ungenutzt, während der eigentliche Inhalt in einem Editor-Tab liegt, der mit dem Code um Platz konkurriert [H] |
| J Gesamt | Größte ungenutzte Chance des Produkts (siehe 03, Konzept „Sidebar als Arbeitsfläche") |

Der **Welcome-Zustand** (S2) ist dagegen gelungen: eine Zeile, ein Primärbutton, zwei Links – genau wie die Richtlinie es empfiehlt [B 11]. → **KEEP** für den Welcome-Teil.

### 3.2 Statusleisten-Eintrag — **REFINE**

`FeatherSpec: studio (1.10.0)` [B 01]. Projektname und Version sind selten entscheidungsrelevant. Der Klick öffnet die Projektwahl auch bei nur einem Projekt [I 25]. Die Statusleiste ist die einzige Fläche, die **immer** sichtbar ist – ideal für „aktive Spec + nächster Schritt" [H].

### 3.3 Panel-Rahmen und Navigation — **REFINE**

- Tabs mit Symbol und Marker „▸" für den aktuellen Bereich; zusätzlich Hintergrund-Hervorhebung [B 03]. Der Marker ist doppelt gemoppelt; die Hervorhebung reicht.
- Projektname steht **viermal** auf einem Bildschirm: Baum, Panel-Kopf rechts, Mission-Control-Header, Statusleiste [B 03].
- In S2 bleiben alle drei Tabs klickbar, zeigen aber dieselbe Meldung [B 12].
- Gut: konsistente Panel-Zustände S1–S9 mit Text + Aktion (`src/shared/protocol/texts.ts`) [C].

### 3.4 Mission Control — **REDESIGN** (Hierarchie), Bausteine teils **KEEP**

| Kriterium | Befund |
| --- | --- |
| A Purpose | „See the project at a glance" (0015 §8). Erfüllt für Zählwerte, **nicht** für „was tue ich jetzt" |
| B Information Value | Sechs Kacheln mit gleichem Gewicht, auch bei 0 [B 03]. Im Studio-Repo sind 4 von 6 Kacheln 0. Der Verteilungsbalken wiederholt die Kacheln. Die Formel des Fortschritts steht dauerhaft als Fließtext. Drei Kacheln tragen eine Regel-Erklärung mit ID („Derived: … S-READY") – auch wenn sie 0 zeigen |
| C Hierarchie | Visuelles Gewicht liegt auf Zählern. „Needs attention" – der handlungsrelevanteste Teil – steht darunter und nennt **Grund, aber keinen Schritt** [B 03] |
| D Darstellung | Kacheln + Balken + Prozent sind drei Darstellungen derselben Verteilung |
| Fortschrittsmetrik | „80 % (8 of 10)" zählt alle je geschriebenen Specs. Baseline-Specs (aus bestehendem Code rekonstruiert, `/sdd-reverse-specify`) zählen als Fortschritt: im Brownfield-Projekt ergeben eine Baseline-Spec und eine Altspec ohne Plan „22 %" [B 17]. Die Zahl wächst nicht mit der laufenden Arbeit, sondern mit der Historie. Für Entscheidungen hat sie wenig Aussagekraft [H] |
| Header | „0 project-level diagnostics · 15 specs with diagnostics" als blauer Link – siehe Querschnitt Q-3 [B 03]. „Model updated" ist Implementierungssprache |
| Recent activity | Nur Änderungen, die das Studio **während es lief** beobachtet hat. Beim ersten Öffnen immer leer [B 03, 17]. Live-Update funktioniert zuverlässig [I 27] |
| Drill-downs | Jede Zahl ist ein Button; Ziel korrekt [I 28, 29][T `Drilldown.test.tsx`] → **KEEP** |
| G Visual | Ruhig, sauber, theme-konform in Dark/Light/HC [B 03, 17, 22] → **KEEP** |
| Responsiv | Kacheln brechen bei 640 px sauber auf 3×2 um [B 22] |

### 3.5 Spec Board — **REDESIGN**

| Kriterium | Befund |
| --- | --- |
| A Purpose | Alle Specs nach Zustand. Ursprünglich auch Steuerfläche (Drag startet Agent) – diese Funktion ist weggefallen |
| B Information Value | Eine Karte trägt bis zu 9 Zeilen: Nummer+Titel, Zustands-Chip, Regelsatz, Summary, Readiness-Grund, Tasks, Kriterien, Diagnostics, Last change [B 04]. Der Zustands-Chip wiederholt die Spalte. **Der nächste Schritt fehlt** – bewusst ausgeschlossen (0015 OP-003) [S] |
| Kartenhöhe | 243 px bei 240 px Spaltenbreite; bei 1000 px Höhe passen 3 Karten pro Spalte [I] |
| Spaltenökonomie | 6 gleich breite Spalten. Im Studio-Repo sind 3 leer, Done hält 13 von 15 Specs [B 04]. Bei 1240 px Editorbreite ist „Blocked" abgeschnitten, bei 640 px sieht man 2,4 Spalten [B 04, 20] |
| State-Filter | Checkboxen filtern Zustände auf einem Board, dessen Spalten bereits Zustände **sind**. Ergebnis: eine gefüllte Spalte plus fünf leere [B 28] |
| Backlog-Karten | Zeigen als Hinweis die verletzte Readiness-Regel: „No sibling plan, or the Plan line does not link it. R-3" [B 18]. Das ist der Normalzustand einer frischen Spec, formuliert als Fehler |
| „Last change" | Aus Datei-mtime. Nach Kopie/Checkout tragen alle 15 Specs dieselbe Minute (21:55) [B 04]. Sortierung „Last change" wird dann bedeutungslos. Dass ein `git clone`/Branchwechsel denselben Effekt hat, ist plausibel, aber nicht auf Windows geprüft [H] |
| E Interaktion: Drag & Drop | Drag erlaubt, Drop zeigt Statuszeile, Karte springt zurück [I 08]. Direkte Manipulation ohne Wirkung |
| E Interaktion: „Move to…" | Jede Karte trägt einen Button mit 5 Zielen; Ablehnung bei **allen** außer Ready → Active [I 09, 10][C `transitions.ts`]. Bei einer Done- oder Review-Spec ist jedes angebotene Ziel eine Sackgasse |
| Statuszeile | „Copy" ist sekundär gestylt, „Dismiss" primär (gefüllt) – die Hierarchie ist umgekehrt [B 08]. Beim Einblenden verschieben sich alle Spalten nach unten (Layout-Shift) [B 08, 09] |
| Karte anklicken | Wechselt den Bereich zum Spec Explorer; Board-Kontext (Scrollposition, Fokus) ist weg [I] |
| Tastatur | Pfeiltasten springen über leere Spalten, Enter öffnet, Shift+F10 öffnet Menü; Fokus in HC gut sichtbar [I 23][T `Keyboard.test.tsx`] → **KEEP** |
| G Visual | Saubere Spaltenköpfe mit Symbol, Zähler, Farbakzent; theme-konform [B 04, 18, 23] |

### 3.6 Spec Explorer: Liste — **REFINE**

- Flache Liste aller Specs nach Nummer, jede Zeile zweizeilig mit Chip; die 13 Done-Specs füllen den Bildschirm, die zwei relevanten Review-Specs stehen ganz unten [B 05].
- Keine Gruppierung, keine Suche, kein Filter, kein Hinweis auf den nächsten Schritt.
- Die abgeleitete Regel („Derived: plan is Done, waiting for review S-REV…") wird abgeschnitten [B 06].
- Gut: Auswahl überlebt Bereichswechsel und Reload (0007 AC) [S][C `uiMemory.ts`]; `role="listbox"` mit `aria-selected` [C].

### 3.7 Spec Explorer: Detail — **REDESIGN**

| Kriterium | Befund |
| --- | --- |
| A Purpose | Laut 0007: alle Inhalte einer Spec strukturiert. Faktisch: zweiter Markdown-Renderer |
| B Information Value | **Next step** steht oben – richtig und wertvoll [B 06] → **KEEP** als Konzept. Darunter folgen Overview, Requirements, alle Kriterien im Volltext, alle Planschritte inkl. kompletter `Verified`-Protokolle, Verification, Related, Status history. 0015: 4.952 px, 3.459 Wörter [I] |
| Dauerhafte Leermeldungen | „Priority: not available" an jeder Spec (FeatherSpec hat kein Prioritätsfeld, PD-015). „/sdd-compile verdict: not available — FeatherSpec does not persist it." an jeder Spec. „Inter-spec dependencies: not available — FeatherSpec has no dependency field. R-7" an jeder Backlog-Spec [B 06, 19] |
| Readiness | R-1…R-7 als Liste mit Häkchen und **roten Fehler-Icons** für R-3/R-4 bei einer normalen frischen Spec [B 19]. „R-1: pass" ist Prüfprotokoll, keine Information |
| Implementierungssprache | „S-BACKLOG · persisted" [B 19]; Status-Historie: `2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked` [I] |
| Doppelungen | Plan-Link als Text **und** Ziel: „0015-focus-on-visibility.plan.md 0015-focus-on-visibility.plan.md" [B 06]. „Open file" an jeder Sektion (6×) |
| Darstellungsfehler | Kriterien mit Überschrift im Format `**AC-001 — Titel**` erscheinen mit übrig gebliebenem `**`: „Events reach the broker without an intermediate table** When…" [B 19] |
| Diagnostics | Bis zu 10 Warnzeilen **vor** den Requirements (0015) – verdrängen den Inhalt [B 06] |
| H VS Code | „Open file" ersetzt den sichtbaren Tab im selben Editor-Group; das Studio verschwindet aus dem Blick [I 24]. VS Code hat für Markdown bereits Editor, Preview, Outline und Breadcrumbs |
| G Visual | Typografie und Abstände ordentlich; Sektionen faltbar mit Gedächtnis [B 06][C `sectionMemory.ts`] |

### 3.8 „Next step"-Baustein — **KEEP** (Konzept) / **REFINE** (Darstellung)

Das ist die beste Idee des Produkts:

- Regeln NS-1…NS-11 decken jeden Zustand ab, deterministisch, getestet, assistent-neutral [C][T].
- Die Zeilen sind korrekt und direkt kopierbar, z. B. `/sdd-compile .specs/active/0015-focus-on-visibility.md` + „Then, after a READY verdict: /sdd-lifecycle …" [B 06].
- Copy meldet Erfolg oder Fehler, auch per `aria-live` [I][C].

Verfeinerungsbedarf: Die Überschrift „NEXT STEP" hat dasselbe Gewicht wie „OVERVIEW"; „Copy" ist ein kleiner Sekundärbutton; der Baustein existiert **nur** im Detail und im Drop-Ergebnis.

Inhaltlich prüfenswert [H]: Für eine **Active**-Spec mit offenem Schritt nennt NS-6 `/sdd-plan <spec>`. FeatherSpecs Mode B meldet dann drei Zeilen Stand und wartet auf „continue" (`sdd-plan.md` Mode B, Schritt 3). Der Nutzer braucht also zwei Eingaben. Eine zweite Zeile „Then: Implement." würde den Ablauf vollständig benennen.

### 3.9 Panel-Zustände S1–S9 und Setup — **KEEP**

- Zentrierte Leerzustände mit Symbol, einem Satz und Aktionen [B 12].
- Setup-Fehler nennt den Grund („GitHub answered with status 403") und bietet „Retry" und „Open setup guide" [B 15].
- Kleine Verfeinerung: Im Leerzustand fehlt ein Satz, *was* Setup tut (Release herunterladen, X Dateien, nichts überschreiben). Die modale Bestätigung im Erfolgsweg nennt das laut 0014 [S], im Panel selbst nicht.

### 3.10 Diagnostics (komponentenübergreifend) — **REDESIGN**

Siehe Querschnitt Q-3.

### 3.11 Befehle und Quick Picks — **REFINE / REMOVE**

- `Move Spec to…` → **REMOVE** (siehe 3.5). Er wählt still die zuletzt fokussierte Spec, ohne sie im Titel zu nennen außer als Nummer [I 26].
- `Open` + drei `Open <Bereich>` → **KEEP**, sinnvoll für Tastaturnutzer.
- `Rescan Project` und `Refresh Project Discovery` → zwei Begriffe für ähnliche Handlungen; für Nutzer schwer zu unterscheiden [H] → **REFINE** (zusammenfassen oder klar benennen).
- **ADD:** `Copy Next Step` (für aktive/gewählte Spec) mit Tastenkürzel – der häufigste Handgriff hat keinen Befehl.

## 4. Querschnittsprobleme

**Q-1 · Der Produktkern ist versteckt.** Das Versprechen „know its next step" ist erst nach *Bereich wählen → Spec wählen* sichtbar. Weder Sidebar, Statusleiste, Mission Control noch Karten zeigen ihn. [B][S]

**Q-2 · Pseudo-Interaktionen.** Drag & Drop, „Move to…" (Button, Kontextmenü-Taste, Befehl) suggerieren Steuerung. Fünf von sechs Zielen werden immer abgelehnt; das sechste verschiebt nichts. Das verletzt die Grundregel „sichtbare Handlung = mögliche Handlung". [I][C]

**Q-3 · Diagnostics-Signal entwertet.** Im eigenen, mit FeatherSpec 1.10.0 erzeugten Repo tragen **alle 15 Specs** zusammen **83 Diagnostics** [I]. Ausgezählt nach Art:

| Anzahl | Art (Beispiel) |
| --- | --- |
| 29 | Unbekannter Traceability-Zustand (Freitext in der State-Spalte, z. B. „verified (unit; M-07 host smoke passed …)") |
| 19 | Unbekannte Plan-Sektion (z. B. „Open evidence", „Test-title audit") |
| 14 | AC-ID mehrfach definiert (u. a. durch Amendment-Notizen) |
| 14 | Unbekanntes Schritt-Feld („Added", „Deletes") |
| 5 | Unbekannte Kopfzeile „Successor" – **die Zeile, die das Studio selbst für Deprecated-Specs erwartet** (0003 Successor-Reader, PD-022) |
| 2 | Unbekanntes Handoff-Feld „Evidence" |

Keine dieser 83 Meldungen beschreibt ein Problem, das der Nutzer beheben müsste. Mission Control filtert für „Needs attention" bereits richtig (nur Widersprüche und unlesbare Dateien, `src/core/missionControl/attention.ts`) [C] – Header, Karten und Detail zeigen aber alle Meldungen mit demselben Warn-Dreieck. Ergebnis: Alarmmüdigkeit, echte Probleme gehen unter. [B][I][C]

**Q-4 · Regel- und Implementierungssprache in der Oberfläche.** S-READY, R-3, S-BACKLOG · persisted, „Model updated", „first observed · not checked", „Derived: …" auf Kacheln, Karten und Listenzeilen. P8 „Honest Status" wird als „jede Abwesenheit dauerhaft benennen" gelesen. Ehrlich wäre auch: weglassen, was es nie geben kann. [B][S]

**Q-5 · Das Studio dupliziert den Editor.** Das Detail rendert Specs und Pläne nahezu vollständig nach, mit eigenem Inline-Parser und dessen Fehlern. VS Code bietet Markdown-Preview, Outline, Breadcrumbs und Suche bereits. [B][I][H]

**Q-6 · Kontextwechsel.** Karte → anderer Bereich; „Open file" → Studio verdeckt; Statuszeile → Layout-Shift. Der Nutzer verliert die Stelle, an der er war. [I]

**Q-7 · Leere Zustände dominieren.** Leere Spalten, Null-Kacheln mit Erklärung, leere Recent activity, „not available"-Zeilen. In einem typischen Projekt (wenige Specs in Arbeit, viele erledigt) ist der größte Teil der Fläche leer oder historisch. [B]

## 5. Was bereits hervorragend funktioniert

| # | Stärke | Evidenz | Empfehlung |
| --- | --- | --- | --- |
| K-1 | **Next-Step-Regelwerk** NS-1…NS-11: deterministisch, assistent-neutral, kopierbar | [C][T][B 06, 08] | Beibehalten, viel breiter ausspielen |
| K-2 | **Dateien sind die Wahrheit**, Live-Update in Sekunden | [I 27] | Beibehalten |
| K-3 | **Theme-Treue**: nur `--vscode-*`-Variablen, korrekt in Dark, Light, HC | [B 03, 17, 23][T CSS-Guard] | Beibehalten |
| K-4 | **Tastaturmodell** des Boards inkl. Sprung über leere Spalten, sichtbarer Fokus | [I 23] | Beibehalten |
| K-5 | **Leer-, Fehler- und Setup-Zustände** mit Grund und Ausweg | [B 11, 12, 15] | Beibehalten |
| K-6 | **Drill-downs** von jeder Zahl in Mission Control | [I 28, 29] | Beibehalten |
| K-7 | **Abgeleitete Zustände** Ready/Review/Blocked mit dokumentierter Regel – das Modell ist gut, nur die Darstellung zu laut | [C][S] | Modell beibehalten, Darstellung ändern |
| K-8 | **Kein Agent-Start** – klare Rollenteilung Studio ↔ Assistent | [S PD-055] | Beibehalten |
| K-9 | **Saubere Schichtung** Core ↔ Webview: UX-Änderungen sind billig | [C] | Nutzen |

## 6. Fundstellen-Index

| Befund | Datei |
| --- | --- |
| Baum-Einträge | `src/core/shell/treeModel.ts`, `src/adapters/vscode/studioTree.ts` |
| Statusleiste | `src/adapters/vscode/statusBar.ts` |
| Navigation, Marker ▸ | `src/webview/Navigation.tsx` |
| Mission Control | `src/webview/areas/missionControl/*.tsx`, Texte `…/texts.ts` |
| Attention-Filter | `src/core/missionControl/attention.ts` |
| Karte | `src/webview/board/Card.tsx` |
| Filterleiste | `src/webview/board/FilterBar.tsx` |
| Move-Menü / Drop | `src/webview/board/MoveMenu.tsx`, `src/webview/areas/SpecBoard.tsx`, `src/core/board/moves.ts` |
| Übergangsregeln | `src/core/lifecycle/transitions.ts` |
| Statuszeile Board | `src/webview/board/Announcer.tsx` |
| Detail | `src/webview/detail/SpecDetail.tsx`, `NextStep.tsx` |
| Next-Step-Regeln | `src/core/board/nextStep.ts`, Texte `src/shared/protocol/nextStepTexts.ts` |
| UI-Texte | `src/shared/protocol/texts.ts` |
| Styles | `src/webview/main.css` |
