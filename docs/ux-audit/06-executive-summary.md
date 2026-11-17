# 06 · Executive Summary

UX/UI-Audit FeatherSpec Studio 0.1.0 (`3c2b8b7`) · 17.11.2026

Grundlage: alle 15 Specs, PD-Register, Handoff, Design-Brief und ADRs; Quellcode von Core, Adaptern und Webview; **die echte VSIX in einer isolierten VS Code 1.145 (code-server)**, bedient per Klick, Tastatur, Drag & Drop und Befehlspalette in fünf Workspaces (darunter die echten Specs dieses Repos), in Dark, Light und High Contrast und bei zwei Fensterbreiten. 30 Screenshots liegen in `screenshots/`. Nicht geprüft: Windows-Desktop, Setup-Erfolgsweg, Restricted Mode, Screenreader (Details in [02 §1.3](02-current-experience-audit.md)).

## 1. Wie gut ist die Developer Experience heute?

**Solide gebaut, aber auf das falsche Produkt ausgerichtet.** Handwerklich ist das Studio stark: theme-treu, tastaturbedienbar, mit ehrlichen Leer- und Fehlerzuständen und einer sauberen Architektur. Die Informationsarchitektur stammt aber noch aus der Zeit, als das Studio Agenten starten sollte. Seit Spec 0015 lautet das Versprechen „see every spec, know its next step". Die Oberfläche zeigt vor allem Zählwerte, Volltext und Regelprotokolle, während der nächste Schritt nur an einer Stelle steht. Experteneinschätzung: **gute Basis, mittlere Experience, hohes Potenzial bei überschaubarem Aufwand.**

## 2. Was funktioniert bereits hervorragend?

- **Das Next-Step-Regelwerk** (NS-1…NS-11): deterministisch, getestet, assistent-neutral, direkt kopierbar. Das ist der wertvollste Baustein des Produkts.
- **Dateien als Wahrheit mit Live-Update:** Eine extern verschobene Spec erschien ohne Reload in „Recent activity".
- **Visuelle Qualität und Theme-Treue** in Dark, Light und High Contrast; sichtbarer Fokus.
- **Leer-, Fehler- und Setup-Zustände** mit Grund und Ausweg; die Welcome-View ist vorbildlich.
- **Tastaturmodell des Boards** und die **Drill-downs** aus Mission Control.
- **Die Entscheidung, keine Agenten zu starten** (PD-055): klare Rollen, kein Konkurrieren mit VS Codes eigener Agent-Verwaltung.

## 3. Welche UX-Probleme sind besonders relevant?

1. **Der Kern ist versteckt.** Der nächste Schritt steht nur im Detail des Spec Explorers. Sidebar, Statusleiste, Mission Control und Karten zeigen ihn nicht.
2. **Pseudo-Interaktionen.** Jede Karte ist ziehbar und bietet „Move to…" mit fünf Zielen. Fünf von sechs Zielen werden immer abgelehnt, das sechste verschiebt nichts.
3. **Das Diagnostics-Signal ist entwertet.** Im eigenen, mit FeatherSpec 1.10.0 erzeugten Repo tragen alle 15 Specs zusammen **83 Warnungen**. Keine davon verlangt eine Handlung; fünf beanstanden die `Successor:`-Zeile, die das Studio selbst liest.
4. **Das Detail dupliziert den Editor.** Eine Spec umfasst bis zu 4.952 px (≈ 5,5 Bildschirmhöhen) und 3.459 Wörter Volltext, Prüfprotokolle und Dauer-Leermeldungen.
5. **Die Sidebar ist leer.** Fünf Starter-Buttons ohne Zustand, obwohl ADR-001 dort einen kompakten Status vorsah und die VS-Code-Richtlinien Baumzeilen als Buttons abraten.

## 4. Was wird falsch oder suboptimal dargestellt?

| Darstellung | Warum problematisch |
| --- | --- |
| „15 specs with diagnostics" mit Warn-Dreiecken | meldet Format-Varianten als Probleme |
| Rote Fehler-Icons R-3/R-4 bei frischen Backlog-Specs | Normalzustand erscheint als Fehler |
| „Progress 80 %" | misst die Historie aller je geschriebenen Specs, nicht den Fortschritt der laufenden Arbeit; Baseline-Specs zählen mit |
| „Last change" | nach Kopie oder Checkout für alle Specs gleich, Sortierung danach bedeutungslos |
| Zustands-Chip auf jeder Karte | wiederholt die Spalte |
| „Priority / compile verdict / dependencies: not available" | strukturell nie vorhanden, trotzdem an jeder Spec |
| Kriterien mit übrig gebliebenem `**` | Darstellungsfehler des Inline-Formatters |
| „Copy" sekundär, „Dismiss" primär | umgekehrte Button-Hierarchie |

## 5. Was sollte grundlegend anders konzipiert werden?

**Vom „Dashboard über Dateien" zum „Begleiter, der den nächsten Schritt kennt".** Konkret:

- **Ein Signal, viele Orte:** Der nächste Schritt mit Copy auf Karte, Sidebar, Statusleiste, Overview und als Befehl.
- **Native zuerst:** Die Sidebar wird zum gruppierten Spec-Baum (In progress · Up next · Backlog · Done) neben dem Code. Das Panel bleibt für Überblick und Präsentation.
- **Board read-only als Pipeline:** keine Moves, schmale Leerspalten, Done eingeklappt, Karten mit drei Zeilen.
- **Detail als Lagebild:** nächster Schritt, offene Kriterien, nächster offener Planschritt, Dateien. Volltext öffnet im Editor neben dem Panel an der richtigen Zeile.
- **Gestufte Diagnostics:** Probleme sichtbar, Format-Hinweise eingeklappt, Kompatibilitäts-Varianten gar nicht.

Das Zielbild („Native first + ein Panel", [03 §4](03-information-architecture.md)) lässt sich schrittweise erreichen; fast jeder Schritt ist für sich nützlich.

## 6. Die fünf Verbesserungen mit dem größten Mehrwert

| # | Empfehlung | Warum zuerst | Aufwand |
| --- | --- | --- | --- |
| 1 | **Diagnostics stufen und Parser an FeatherSpec 1.10 angleichen** (R-01) | stellt die Glaubwürdigkeit aller Warnungen wieder her | M |
| 2 | **Nächster Schritt mit Copy auf Karten und in Mission Control** (R-03) | macht das Kernversprechen ohne Navigation sichtbar; Core-Funktion existiert schon | S |
| 3 | **Pseudo-Moves entfernen** (R-02) | beseitigt die größte Quelle für Fehlversuche | S–M |
| 4 | **Sidebar als Spec-Baum + Statusleiste mit nächstem Schritt** (R-05, R-04) | Lagebild neben dem Code, ohne Editor-Tab | M + S |
| 5 | **Detail als Lagebild statt Volltext** (R-07) | von 5,5 auf ≈ 1 Bildschirmhöhe, Fokus auf offene Kriterien | M–L |

Als Sofortmaßnahme davor: die Quick Wins R-08 (Nutzersprache), R-09 (keine roten Icons im Backlog), R-12 (Copy primär), R-13 (`**`-Bug).

## 7. Langfristige Entwicklung

1. **Kurzfristig:** Signale ehrlich machen und den nächsten Schritt überall zeigen (Etappen 1–2 in [05](05-prioritized-recommendations.md)).
2. **Mittelfristig:** Native Arbeitsfläche (Sidebar-Baum, Statusleiste) als täglicher Begleiter; das Panel wird Overview + Board für Überblick, Review und Workshops; der Bereich Spec Explorer geht in Baum und Detail-Seitenleiste auf.
3. **Langfristig, nach Validierung:** Hinweise dort, wo gelesen wird (CodeLens im Plan, Datei-Dekorationen), eine Phasenleiste für Einsteiger und eine Aktivität, die aus Git statt aus Beobachtung entsteht.

Die Leitlinie für jede weitere Entscheidung: **Jede Fläche beantwortet „Was ist der nächste Schritt?", bevor sie etwas anderes beantwortet.**

## Offene Punkte für Gregor

- Spec-Änderungen, die diese Empfehlungen voraussetzen: 0015 OP-003 (Schritt auf Karten), PD-014 (Moves), 0007 (Board, Detail), 0006 (Mission Control), 0005 (Baum), 0002 (Diagnostics). Alle sind als **(proxy)** entschieden oder Gestaltungsentscheidungen, keine Produktprinzipien.
- R-16 (NS-6 um „Then: Implement." ergänzen) braucht deine Einschätzung der FeatherSpec-Semantik.
- Die Dokumente sind auf Deutsch geschrieben, weil der Auftrag deutsch war. `AGENTS.md` setzt `DocLanguage: English`; bei Bedarf übersetze ich sie.
