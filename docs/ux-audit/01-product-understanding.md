# 01 · Produktverständnis

UX/UI-Audit FeatherSpec Studio 0.1.0 · Stand Repository `3c2b8b7` (Branch `main`) · 17.11.2026

**Evidenz-Kennzeichnung in allen Audit-Dokumenten**

| Kürzel | Bedeutung |
| --- | --- |
| **[B]** | Tatsächlich visuell beobachtet (Screenshot in `screenshots/`) |
| **[I]** | Durch Interaktion verifiziert (Klick, Tastatur, Drag, Befehl in der laufenden Extension) |
| **[T]** | Durch Tests bestätigt (eigene Messung oder dokumentierter Testlauf, Quelle genannt) |
| **[C]** | Aus dem Quellcode abgeleitet |
| **[S]** | Aus Spezifikationen, PD-Register oder Produktdokumenten abgeleitet |
| **[H]** | Hypothese / Experteneinschätzung, nicht mit Nutzern validiert |

---

## 1. Was das Produkt ist

FeatherSpec ist ein dateibasiertes Spec-Driven-Development-Template ohne CLI: dreizehn `/sdd-*`-Befehle, die Claude Code und GitHub Copilot aus denselben Markdown-Dateien ausführen (`featherspec/README.md`, Abschnitte „The loop" und „The thirteen commands"). Specs, Pläne, Entscheidungen und Fortschritt liegen als Markdown im Repository: `.specs/backlog|active|done|plan-archive`, `.memory-bank/`, `AGENTS.md`. [S]

**FeatherSpec Studio** ist eine VS-Code-Extension, die diese Dateien liest und sichtbar macht. Die Produktbeschreibung lautet seit Spec 0015: *„Visual command center for spec-driven development with FeatherSpec: see every spec, know its next step."* (`package.json`, `description`). [C]

Der Produktkern hat sich am 17.11.2026 deutlich verschoben (PD-055, Spec 0015):

| Vorher (PO-Handoff, Specs 0008–0012) | Jetzt (Spec 0015) |
| --- | --- |
| „See everything. Control every agent." Agenten starten, beobachten, Runs speichern | Studio startet **keinen** Agenten. Es zeigt Zustand und den **nächsten FeatherSpec-Befehl** als kopierbare Zeile |
| Vier Bereiche inkl. Agent Center | Drei Bereiche: Mission Control, Spec Board, Spec Explorer |
| Drag Ready → Active startet einen Run | Drag Ready → Active zeigt nur den nächsten Schritt; keine Datei ändert sich |

Begründung laut PD-055: FeatherSpec arbeitet in kleinen Schritten mit dem Menschen im Gespräch; VS Code verwaltet Agent-Sitzungen inzwischen selbst. [S]

**Konsequenz für dieses Audit:** Die Informationsarchitektur wurde für ein Produkt mit Agent-Steuerung entworfen und danach um diese Funktion gekürzt. Mehrere Strukturen (Kanban mit Drag & Drop, „Move to…", Activity-Bar-Baum als reiner Starter, Mission-Control-Kacheln) stammen aus der ersten Produktidee. Ob sie für das neue Produkt „Sichtbarkeit + nächster Schritt" noch die beste Form sind, ist die zentrale Frage dieses Audits. [S][H]

## 2. Nutzergruppen und Kernaufgaben

Die Specs kennen nur eine Rolle: *Developer* (0015 §3). Aus Handoff (§1.3), Hands-On-Walkthrough und Projektkontext leite ich drei Nutzungsprofile ab. Sie sind **Hypothesen** und nicht durch Nutzerforschung belegt. [H]

| Profil | Situation | Kernfrage an das Studio | Häufigkeit |
| --- | --- | --- | --- |
| **P1 Solo-Entwickler im Flow** | Arbeitet mit Copilot oder Claude Code im Chat an einer aktiven Spec | „Wo stehe ich, und was tippe ich als Nächstes in den Chat?" | sehr häufig, viele Male pro Sitzung |
| **P2 Wiedereinsteiger** | Öffnet das Projekt nach Tagen, nach einem Branch-Wechsel oder im Workshop | „Was ist offen, was ist blockiert, womit fange ich an?" | täglich |
| **P3 Lead / Reviewer / Trainer** | Will den Projektstand zeigen oder prüfen (Workshop, Talk, Review) | „Wie weit sind wir, was wartet auf Review, wo hakt es?" | gelegentlich |

Gregors Hands-On (Workshop „Zwei Wege zum Feature", `featherspec/Claude outputs/`) macht P2 und P3 im Schulungskontext besonders relevant: Teilnehmende kennen FeatherSpec noch nicht und brauchen Führung durch den Ablauf. [S][H]

## 3. Der FeatherSpec-Workflow als mentales Modell

```
/sdd-specify ─► /sdd-clarify ─► /sdd-plan ─► Plan lesen ─► „Implement" ─► Schritt für Schritt ─► /sdd-compile ─► /sdd-lifecycle
   (Spec)        (Gegenlesen)    (Plan)      (Mensch!)     (backlog→active)  (T-001, T-002 …)     (Urteil+Evidenz)   (active→done)
```

Quelle: `featherspec/README.md`, „The loop", Abschnitte ⑤–⑧; `.claude/commands/sdd-plan.md` Mode B. [S]

Welche Information braucht ein Entwickler in welcher Phase? (Experteneinschätzung [H], abgeleitet aus den FeatherSpec-Befehlen)

| Phase | Entscheidung des Menschen | Benötigte Information | Nicht benötigt |
| --- | --- | --- | --- |
| Spec schreiben | Ist die Spec vollständig genug? | Hat sie Akzeptanzkriterien? Lief schon ein Clarify-Durchgang? | Plan-Details, Fortschritt |
| Clarify | Welche Befunde nehme ich an? | (findet im Chat statt) | — |
| Plan | Stimmt der Plan? | Gibt es einen Plan? Wie viele Schritte? | Kriterien-Verifikation |
| Implement | Welcher Schritt kommt, ist der letzte grün? | **Nächster offener Schritt** (T-ID + Titel), Schritte erledigt/gesamt, Blockade | Readiness-Regeln, Priorität |
| Compile | Ist das fertig? | Kriterien verifiziert / gesamt, offene Kriterien, Urteil | Schritt-Historie |
| Lifecycle | Abschließen | Urteil READY? | — |
| Projektebene | Was mache ich als Nächstes? | Was ist **in Arbeit**, was **wartet** auf mich, was ist **blockiert** | Verteilung von Done-Specs, Formel |

**Kernaussage:** Der wertvollste Satz, den das Studio sagen kann, ist **„Als Nächstes: <Befehl>"** – pro Spec und auf Projektebene. Alles andere ist Kontext für diese Entscheidung. Das Studio erzeugt diesen Satz bereits (Regeln NS-1…NS-11, `src/core/board/nextStep.ts`), zeigt ihn aber nur an zwei Stellen (siehe 02 und 03). [C][H]

## 4. Architektur- und Komponentenübersicht

Quellen: `docs/decisions/ADR-001-extension-architecture.md`, `.architecture/*.md`, `package.json`. [C][S]

```
Extension Host (Node, src/extension.ts – Composition Root)
├─ core/ (framework-frei; kein vscode-Import, per ESLint erzwungen)
│  ├─ discovery/    Projekterkennung, aktive Projektwahl (0001)
│  ├─ specs/        Parser für Spec, Plan, Return Notes (0002)
│  ├─ lifecycle/    Board-Zustände, Readiness R-1…R-7, Übergänge, Status-Historie (0003)
│  ├─ runtime/      Store nur noch für Status-Historie (0004, gekürzt durch 0015)
│  ├─ shell/        Panel-Zustände S1–S9, Navigation, Auswahl, Baum-Modell (0005)
│  ├─ missionControl/ Kennzahlen, Attention, Activity (0006)
│  ├─ board/        Karten, Filter, Detail, Moves, nextStep (0007, 0015)
│  └─ setup/        Release-Download und Setup (0014)
├─ adapters/vscode/ TreeView, Panel, Statusleiste, Quick Picks, Clipboard, Watcher
└─ adapters/node/   Dateisystem, HTTP, tar.gz
          ▲ typisiertes Message-Protokoll (src/shared/protocol/*) mit Guards
          ▼
Webview (React 19, src/webview/) – eine Singleton-WebviewPanel im Editor
├─ Navigation (3 Tabs) · NoticeBar · RestrictedNote · PanelStateView (S1–S9)
├─ areas/missionControl/ Header, SpecFigures, Attention, Activity
├─ areas/SpecBoard.tsx + board/ (Column, Card, FilterBar, MoveMenu, Announcer)
└─ areas/SpecExplorer.tsx + detail/ (SpecDetail, NextStep, DetailSection)
```

Bewertung der Architektur aus UX-Sicht [C][H]:

- **Stark:** Der Domänenkern ist sauber getrennt. Jede UX-Änderung, die nur eine andere Projektion vorhandener Fakten braucht (z. B. nächster Schritt auf Karten), ist **ohne Core-Umbau** möglich: `nextStep(model, key)` ist eine reine Funktion.
- **Stark:** Der Host baut den Zustand immer aus den Dateien neu (ADR-001 §5). Das trägt das Vertrauen in die Anzeige; Live-Updates habe ich beobachtet (siehe 02, F-17).
- **Einschränkung:** Alle reichen Darstellungen leben in **einer** Webview. Native Flächen (Baum, Statusleiste, CodeLens) werden kaum genutzt. Das ist die wichtigste strukturelle Stellschraube (siehe 03).

## 5. Contributions (package.json)

| Typ | Element | Zweck |
| --- | --- | --- |
| View Container | Activity Bar „FeatherSpec Studio" (`media/studio.svg`) | Einstieg |
| View (TreeView) | `featherspec-studio.navigator` | 5 Einträge: Projekt, Open Studio, 3 Bereiche (`src/core/shell/treeModel.ts`) |
| viewsWelcome | Zustand S2 | „Set up FeatherSpec", Setup-Guide, Refresh |
| WebviewPanel | `featherspecStudio.main` | Mission Control, Spec Board, Spec Explorer |
| Statusleiste | `src/adapters/vscode/statusBar.ts` | `FeatherSpec: <Projekt> (<Version>)`, Klick → Projektauswahl |
| Commands (9 sichtbar) | Open, Open Mission Control / Spec Board / Spec Explorer, Move Spec to…, Rescan Project, Set Up FeatherSpec, Select Project, Refresh Project Discovery | |
| Commands (versteckt) | Run Panel Action, Copy Merge Prompt | interne Aktionen |
| Quick Picks | Projektwahl, Move Spec (Spec + Ziel), Setup-Zielordner | |
| Notifications | Setup-Bestätigung (modal), Fortschritt, Fehler mit Retry, Move-Ergebnis | |

Keine Settings, keine Keybindings, keine Context-Menüs, keine CodeLens, keine Editor-Dekorationen. [C]

## 6. Zuordnung Spezifikationen → UI-Komponenten

| Spec | Titel | UI-Komponenten | Status |
| --- | --- | --- | --- |
| 0001 | Workspace Discovery | Statusleiste, Projektwahl-Quick-Pick, Panel-Zustände S2/S3/S8/S9 | Done |
| 0002 | Spec Repository & Parser | Diagnostics (Karten-Badge, Header-Zähler, Detail-Liste) | Done |
| 0003 | Lifecycle & Readiness | Board-Spalten, abgeleitete Zustände S-READY/S-REVIEW/S-BLOCKED, Readiness-Checks R-1…R-7, Move-Ablehnungstexte, Status-Historie | Done |
| 0004 | Runtime Persistence | Status-Historie → „Recent activity", Detail „Status history" | Done (durch 0015 gekürzt) |
| 0005 | Shell & Navigation | Activity-Bar-Baum, Panel-Navigation, S1–S9, NoticeBar, Restricted-Hinweis | Done |
| 0006 | Mission Control | Header, Kacheln, Verteilungsbalken, Progress, Needs attention, Recent activity, Drill-downs | Done |
| 0007 | Board & Detail | Spalten, Karten, Filter/Sortierung, Tastatur, Move-Menü, Drag & Drop, Spec Explorer mit Detail | Done |
| 0008–0012 | Agent-Start, Provider, Orchestrator, Agent Center | entfernt | Deprecated |
| 0013 | Visual Design | `main.css`, StateChip, ProgressBar, RuleText, EmptyState, Theme-Variablen | Done |
| 0014 | Setup | Welcome-Button, Setup-Ablauf, Merge-Prompt | Active (wartet auf Abnahme) |
| 0015 | Fokus auf Sichtbarkeit | „Next step" im Detail, Drop-Ergebnis, 3 Bereiche | Active (wartet auf Abnahme) |

Zusätzliche Produktquellen: `docs/product/po-handoff.md` (Produktvision v1), `docs/product/design-brief.md` (Gestaltungsvorgaben zu 0013), `docs/product/product-decisions.md` (PD-001…PD-057). [S]

## 7. Verbindliche Anforderungen vs. Gestaltungsentscheidungen

Für die Empfehlungen trenne ich, was **bindend** ist und was **eine Gestaltungsentscheidung** war, die sich ändern lässt.

| Kategorie | Beispiele | Konsequenz |
| --- | --- | --- |
| **Verbindlich (Produktprinzip)** | P2 Single Source of Truth (Dateien sind die Wahrheit), PD-013 Studio schreibt nicht in `.specs/` (Ausnahme Setup), PD-055 kein Agent-Start, P8 Honest Status, Datenschutz ohne Telemetrie, Assistent-Neutralität (PD-056) | Empfehlungen respektieren das |
| **Technische Einschränkung** | Webviews können nur über Protokoll-Nachrichten reden; keine API für VS Codes Agent Host (0015 §4); `retainContextWhenHidden` bewusst aus (ADR-001) | Empfehlungen bleiben im Rahmen |
| **Gestaltungsentscheidung** | Kanban mit 6 Spalten (Handoff §4.2), Drag & Drop + „Move to…" (PD-014), Detail als vollständige Spec-Darstellung (0007), Tree als Navigations-Shortcut (ADR-001), „not available" sichtbar anzeigen (PD-015, PD-041), kein nächster Schritt auf Karten (0015 OP-003) | **veränderbar**; Empfehlungen, die das ändern, sind in 05 als „Spec-Änderung nötig" markiert |
| **Historisch gewachsen** | Board-Interaktionen aus der Agent-Start-Zeit, Readiness R-1…R-7 als Vorbedingung für einen Run, Kartenfelder aus dem Design-Brief | Kandidaten für Vereinfachung |

## 8. Technische Rahmenbedingungen, die für die Konzepte zählen

- VS Code `^1.146.0`, nur Desktop, `extensionKind: workspace`, keine virtuellen Workspaces (`package.json`). [C]
- Webview: React 19, eigene CSS-Datei, Farben nur aus `--vscode-*`-Variablen (Guard-Test `src/adapters/node/webviewCss.test.ts`). [C][T]
- Restricted Mode: Studio liest nur; Setup braucht Vertrauen. [C]
- Testbasis laut Projektstatus vom 17.11.2026: 1.684 Unit-Tests grün, Extension-Host-Suite in 4 Fenster-Konfigurationen grün, CI auf Ubuntu und Windows grün (Project-Doc `featherspec-studio-status-2026-11-17.md`). [T, fremd]
- Der Next-Step-Algorithmus ist deterministisch und durch je eine Fixture pro Regel abgesichert (0015 AC-004, `src/core/board/nextStep.test.ts`). [C][T]
