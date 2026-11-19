# FeatherSpec Studio · Runde 3: Wo liegt was?

Stand 19.11.2026 · Basis: Repo `C:\projects\featherspec-studio`, Branch `main`, Stand `48d1968`

> **Achtung:** Die Audit-Dateien unter `docs/ux-audit/` sind **noch nicht committet**. Bitte zuerst auf einem eigenen Branch einchecken (z. B. `docs/ux-audit-round2-review`), damit das ganze Team denselben Stand hat.

## 1. Damit fangt ihr an

| Reihenfolge | Datei | Wofür |
| --- | --- | --- |
| 1 | `docs/ux-audit/09-round2-review.md` | **Der Arbeitsauftrag für Runde 3.** Bewertung von Runde 2 und Zuschnitt der neuen Specs 0025–0028 (§8), mit Entwürfen für Akzeptanzkriterien. |
| 2 | `.claude/rules/ux-guidelines.md` | Verbindliche UX-Leitlinien 1–12. Jede Abweichung muss die Leitlinie nennen. |
| 3 | `docs/product/product-decisions.md` | Produktentscheidungen PD-001…PD-077. Für Runde 3 sind PD-068, PD-072, PD-074 und PD-077 betroffen. |

## 2. Wo in 09 was steht

| Abschnitt in 09 | Inhalt | Für wen |
| --- | --- | --- |
| §2 | Gesamturteil, was beibehalten werden soll | alle |
| §3 | Abgleich mit 08 und Urteil zu den acht Abweichungen aus Runde 2. **Änderung: OP-004, Copilot sendet standardmäßig in einen neuen Chat** | 0026 |
| §4 | Neue Befunde **G-1…G-11**, jeweils mit Vorschlag, Priorität und Screenshot | 0025, 0026, 0028 |
| §5 F-1 | Gregors Rückmeldung: **Klick auf einen Schritt öffnet die Plan map** statt der Markdown-Datei; Strg/Cmd+Klick öffnet weiter die Datei. Mit AC-a…AC-e | 0025 |
| §5 F-2 | Gregors Rückmeldung: **Prozent am Fortschritt** (`4 of 6 done · 67 %`). Mit AC-f, AC-g und Entscheidung E-13 | 0025 |
| §6 | **V3 (Muss): Spec-Datei als Anhang beim Senden.** UX-Urteil, Ankündigung im Studio, Leitplanken, Ergänzungen zum Spike V-3 | 0027 |
| §7 | Prozess: was gut lief, was für Runde 3 dazukommt (Klicktest mit einer Aufgabe, die über mehrere Ansichten führt) | Orchestrierung |
| §8 | **Zuschnitt der Specs 0025–0028**, betroffene Specs und PDs, Kandidaten für ein FeatherSpec-Update | alle |

## 3. Die vier Specs für Runde 3

| Spec | Titel (Vorschlag) | Deckt ab (09) | Prio | Aufwand | Vorbedingung |
| --- | --- | --- | --- | --- | --- |
| **0025** | Plan map navigation and progress clarity | F-1, F-2, G-1, G-2, G-7, G-10 | P1 | M | E-13 bestätigen |
| **0026** | Send defaults and wording | OP-004, G-3, G-5, G-8, G-9; Begriff „current chat" | P1 / P2 | S–M | – |
| **0027** | Attach the spec when sending (V3) | §6 | P1 (Muss) | M | **Spike V-3**; FeatherSpec-Update „angehängte Spec nicht erneut lesen" |
| **0028** | Interruption-aware NS-6 | G-11 | P2 | S | Klicktest |

**Reihenfolge:** 0025 und 0026 können sofort starten, auch parallel. 0027 startet erst, wenn V-3 entschieden hat, *wie* angehängt wird. 0028 folgt nach 0025.

**Betroffene bestehende Specs** (Änderungsnotizen „*Amended by 00xx …*" wie in den Runden 1 und 2):

| Neue Spec | Ändert |
| --- | --- |
| 0025 | 0023 (Plan map), 0019 (Detail-Links), 0021 (Progress-Texte), 0022 (Ampel-Codicons) |
| 0026 | 0024 (Standardziel, Menütexte), 0021 (Coach-Zeile), 0018 und 0022 (Now) |
| 0027 | PD-068 (Copy prompt bleibt ohne Anhang), PD-074 |
| 0028 | PD-072 |

## 4. Offene Entscheidungen vor dem Start

| ID | Frage | Empfehlung (09) | Entscheidet |
| --- | --- | --- | --- |
| **OP-004** | Copilot: aktueller oder neuer Chat als Standard? | **neuer Chat** (der aktuelle überschreibt ungesendeten Text) | Gregor |
| **E-13** | Wie wird beim Prozentwert gerundet? | kaufmännisch, höchstens 99 % solange etwas offen ist | Gregor |
| Wortwahl | „same chat" oder „current chat"? | **„current chat"** überall | Gregor |
| V-3 | Wie wird angehängt, bei welchen Schritten, zeigt Claude Code einen Chip? | Spike nach 09 §6, auch mit einer großen Studio-Spec | Spike, dann Gregor |

## 5. Belege

| Ordner | Inhalt |
| --- | --- |
| `docs/ux-audit/screenshots-48d1968/` | 10 Screenshots von Runde 2 (`r01`…`r12`) und Gregors `g-r2-01` (Klick auf T-006 öffnet die Markdown-Datei) und `g-r2-02` (Fortschrittsbalken). Die Namen stehen in 09 bei den Befunden. |
| `docs/ux-audit/screenshots-045b354/` | Stand nach Runde 1, zum Vergleich (`n…`, Gregors `g01`–`g03`) |
| `docs/ux-audit/screenshots/` | Stand vor Runde 1 |

Testdaten für die Plan map: `test/fixtures/fs110-parallel-synthetic/`. Sie enthält eine `‖`-Stufe und zwei Return Notes (T-003 DONE, T-004 BLOCKED); ohne die Return Notes zeigt sie den Zustand vor der Rückmeldung. Probleme in eingeklappten Gruppen: `test/fixtures/fs170-brownfield-mixed/`.

## 6. Hintergrund, nur bei Bedarf

| Datei | Inhalt |
| --- | --- |
| `docs/ux-audit/07-implementation-review.md` | Bewertung von Runde 1, Konzepte Plan map (§6) und Assistent-Wahl (§6a) |
| `docs/ux-audit/08-spec-handoff.md` | Arbeitsauftrag für Runde 2 (0021–0024): Herkunft der Regeln R-1…R-7, P-1…P-8, S-1…S-6 |
| `docs/ux-audit/01…06` | Das erste Audit vom 17.11. |
| `docs/ux-audit/README.md` | Verzeichnis aller Audit-Dokumente |
| `docs/decisions/v2-prefill-spike-2026-11-18.md` | Ergebnis von V-2 (Vorbefüllen je Assistent), Vorlage für V-3 |

Im Claude-Projekt „FeatherSpec": `claude/ux-review-studio-round2-2026-11-19.md` (Kurzfassung von 09) und `claude/featherspec-studio-status-2026-11-19.md` (Stand nach Runde 2).

## 7. Prozessregeln für Runde 3

1. **Klicktest vor jedem `/sdd-plan`** mit Gregor, diesmal **mit einer Aufgabe über mehrere Ansichten**, z. B. „Finde heraus, was T-006 tut und ob es parallel laufen kann". Dabei beobachten, wohin geklickt wird (09 §7).
2. **Vorschau nach jeder Umsetzung** in Dark, Light und High Contrast, bei 1600 px und 1000 px Fensterbreite, mit offener Seitenleiste (Leitlinie 12).
3. **Echte Nutzung vor dem Abschluss:** einmal auf `C:\projects\test\tip-splitter` durchspielen. Genau so wurde F-1 gefunden.
4. Wie bisher: je Spec ein frischer `/sdd-compile`, Testtitel-Abgleich, nichts veröffentlichen ohne Gregors „Go".

## 8. Nicht im Studio-Repo: FeatherSpec-Update-Kandidaten

Diese drei Punkte gehören ins **FeatherSpec-Repo** (`C:\projects\featherspec`): eigener Branch, Releasing-Anleitung im Wiki, Hands-On auf `tip-splitter`. Sie würden das Studio vereinfachen (09 §8):

1. Feste, zitierbare Prompts für „continue", „whole stage in sequence / with subagents / with other agents" und „integrate the returned steps".
2. Ein Satz in den `/sdd-*`-Befehlen: „If the spec is attached to the conversation, use it; do not read it again" (für V3).
3. Abgleich der Haken nach einer Unterbrechung auch bei `Implement T-00x` (dann wird 0028 kleiner oder unnötig).
