# 03 · Informationsarchitektur

Evidenz-Kürzel: siehe [01](01-product-understanding.md).

## 1. Bestehende Informationsarchitektur

```
VS Code
├─ Activity Bar ── FeatherSpec Studio (View Container)
│   └─ TreeView „FeatherSpec Studio"
│       ├─ studio                 (Projekt, ohne Aktion)
│       ├─ Open Studio            → Panel, letzter Bereich
│       ├─ Mission Control        → Panel
│       ├─ Spec Board             → Panel
│       └─ Spec Explorer          → Panel
├─ Statusleiste ── „FeatherSpec: <Projekt> (<Version>)" → Projektwahl
├─ Befehlspalette ── 9 Befehle
└─ Editor-Bereich ── WebviewPanel „FeatherSpec Studio"
    ├─ Tabs: Mission Control | Spec Board | Spec Explorer      [Projektname rechts]
    ├─ Mission Control
    │   ├─ Header (Projekt · Version · Model updated · Diagnostics)
    │   ├─ Specs: Total, 6 Kacheln, Verteilungsbalken, Progress + Formel
    │   ├─ Needs attention (Spec — Grund)
    │   └─ Recent activity (beobachtete Zustandswechsel)
    ├─ Spec Board
    │   ├─ Filter (6 Zustände) · Named set · Sort · Clear
    │   ├─ Statuszeile (Move-Ergebnis)
    │   └─ 6 Spalten × Karten (9 Felder + „Move to…")
    └─ Spec Explorer
        ├─ Liste (alle Specs, flach)
        └─ Detail: Titel · Next step · Overview · Requirements · Criteria ·
                   Plan & tasks · Verification · Related · Status history
```

Quellen: [B 02–06], `src/core/shell/treeModel.ts`, `src/webview/App.tsx`. [C]

## 2. Strukturelle Probleme

| # | Problem | Wirkung | Evidenz |
| --- | --- | --- | --- |
| IA-1 | **Drei parallele Navigationssysteme** (Baum, Panel-Tabs, Befehle) für dieselben drei Ziele, und keines davon trägt Information | Der Nutzer muss erst navigieren, bevor er etwas erfährt | [B 02, 03] |
| IA-2 | **Die drei Bereiche überlappen stark.** Mission Control zählt Zustände, das Board zeigt Zustände als Spalten, die Explorer-Liste zeigt Zustände als Chips. Dieselbe Frage („welche Spec ist in welchem Zustand?") hat drei Antworten | Unklar, welcher Bereich wofür da ist | [B 03–05] |
| IA-3 | **Kein Ort beantwortet „Was jetzt?"** auf Projektebene. Der nächste Schritt existiert nur pro Spec und nur im Detail | Kernversprechen nur über zwei Klicks erreichbar | [B 06][C] |
| IA-4 | **Gleichgewichtung von Vergangenheit und Gegenwart.** Done-Specs (13 von 15) belegen den Großteil von Board und Liste. Die zwei Specs, die Aufmerksamkeit brauchen, stehen am Ende | Relevantes geht unter | [B 04, 05] |
| IA-5 | **Detail = Dokument statt Lagebild.** Das Detail zeigt alles, was in den Dateien steht, statt dessen, was für die Entscheidung zählt | ≈ 5,5 Bildschirmhöhen pro Spec | [I] |
| IA-6 | **Ein Schweregrad für alles.** Format-Hinweise und echte Widersprüche erscheinen gleich | Alarmmüdigkeit | [I] |
| IA-7 | **Die immer sichtbaren Flächen sind leer** (Sidebar, Statusleiste), die Information steckt im Editor-Tab, der mit dem Code konkurriert | Studio und Code schließen sich gegenseitig aus | [B 24][H] |

## 3. Leitfrage: Was muss wann sichtbar sein?

Abgeleitet aus dem Workflow in [01 §3](01-product-understanding.md). [H]

| Ebene | Frage | Häufigkeit | Bester Ort |
| --- | --- | --- | --- |
| **Ambient** | Woran arbeite ich gerade, was ist der nächste Befehl? | ständig | Statusleiste, Sidebar |
| **Projekt-Lage** | Was ist in Arbeit, was wartet, was hängt? | mehrmals täglich | Sidebar (kompakt), Übersicht im Panel (ausführlich) |
| **Spec-Lage** | Wo steht diese Spec, was fehlt bis „fertig"? | pro Spec-Wechsel | Detail (kompakt), Hover |
| **Inhalt** | Was genau steht in Kriterium AC-007 / Schritt T-012? | bei Bedarf | **Editor** (die Datei selbst), angesprungen per Link |
| **Historie** | Was ist schon erledigt? | selten | eingeklappt |
| **Format-Diagnose** | Weicht eine Datei vom Schema ab? | selten, für Pflegende | Problems-Panel oder Ausklappbereich |

Grundsatz: **Je häufiger die Frage, desto näher an der immer sichtbaren Oberfläche.** Heute ist es umgekehrt: die seltenen Informationen (Volltext, Readiness-Protokoll, Formel) haben viel Fläche, die häufigste (nächster Schritt) hat die wenigste.

## 4. Drei Alternativen für die Zielstruktur

### Alternative A — „Refine in place"

Drei Bereiche bleiben. Jeder bekommt eine klarere Aufgabe; Board ohne Moves; nächster Schritt auf Karten und in Mission Control; Diagnostics gestuft.

### Alternative B — „Native first + ein Panel" (Empfehlung)

```
Activity Bar ── FeatherSpec
│  ┌ View „Specs" (TreeView, primäre Arbeitsfläche)
│  │  ▾ In progress (2)
│  │     ● 0015 Focus on visibility      Review · /sdd-compile   [⧉]
│  │     ● 0014 Set up FeatherSpec       Review · /sdd-compile   [⧉]
│  │  ▾ Up next (1)
│  │     ○ 0016 Workshop mode            Ready  · Start T-001    [⧉]
│  │  ▸ Backlog (3)
│  │  ▸ Done (13)
│  └ View-Toolbar: [Open Studio] [Filter] [Refresh]
│
Statusleiste ── „$(feather) 0015 · Review · /sdd-compile" → Klick kopiert / Menü
│
Editor ── Panel „FeatherSpec Studio"
   Tabs: Overview | Board
   ├ Overview  = neue Mission Control: „Now" zuerst, Kennzahlen kompakt, Aktivität
   ├ Board     = read-only Pipeline, leere Spalten schmal, Done eingeklappt
   └ Spec-Detail als **rechte Seitenleiste** in beiden Tabs (kein eigener Bereich)
```

Der Spec Explorer als eigener Bereich entfällt: Seine Liste übernimmt der native Baum, sein Detail wird zur Seitenleiste im Panel. Begründung: die Liste im Explorer-Bereich ist funktional ein Baum, nur ohne die Vorteile des nativen Baums (Suche per Tippen, Tastatur, Barrierefreiheit, ein Platz neben dem Code). [H]

### Alternative C — „Single cockpit"

Ein einziger Panel-Bereich: oben eine Zusammenfassungszeile, links eine gruppierte Liste, rechts das Detail. Board als optionale Ansicht der Liste. Sidebar bleibt Starter.

### Vergleich

| Kriterium | A Refine | B Native first | C Cockpit |
| --- | --- | --- | --- |
| „Was jetzt?" ohne Klick sichtbar | nein (Panel muss offen sein) | **ja** (Sidebar + Statusleiste) | nein |
| Studio und Code gleichzeitig sichtbar | nur mit geteiltem Editor | **ja** | nur mit geteiltem Editor |
| VS-Code-Richtlinien („Webviews nur wenn nötig", keine Baum-Buttons) | teilweise | **erfüllt** | teilweise |
| Vertrautheit für heutige Nutzer | **hoch** | mittel | mittel |
| Eignung für Workshop/Präsentation (P3) | hoch | **hoch** (Overview bleibt) | mittel |
| Umbau-Aufwand | **gering–mittel** | mittel | mittel–hoch |
| Spec-Änderungen | 0007, 0015 OP-003 | 0005, 0006, 0007, 0015 | 0005, 0006, 0007 |
| Risiko | gering | mittel (Baum-Design muss sitzen) | mittel |

**Empfehlung:** B als Zielbild, über A als ersten Schritt erreichen. Fast alle Maßnahmen aus A sind Bausteine von B (nächster Schritt auf Karten, gestufte Diagnostics, Board ohne Moves). Der native Baum kann **zusätzlich** eingeführt werden, bevor der Explorer-Bereich entfällt – so lässt sich B schrittweise validieren. [H]

## 5. Empfohlene Informationshierarchie

### 5.1 Projekt (Overview / Sidebar)

1. **Jetzt** – Specs in Active, Review, Blocked, jeweils mit nächstem Schritt und Copy
2. **Als Nächstes** – Ready-Specs (mit Startzeile), dann Backlog-Specs mit fehlendem Planungsschritt
3. **Probleme** – nur echte: Widerspruch, unlesbar, doppelte Nummer (heute: `attention.ts`-Logik)
4. **Kennzahlen** – kompakt in einer Zeile: `Backlog 6 · Ready 0 · Active 0 · Review 1 · Done 2`
5. **Aktivität** – zuletzt beobachtete Wechsel, eingeklappt, wenn leer
6. **Projekt-Metadaten** – Version, Pfad: nur im Tooltip der Statusleiste / Kopfzeile

### 5.2 Spec (Detail-Seitenleiste)

1. Nummer, Titel, Zustand (ein Chip, Regel im Tooltip)
2. **Nächster Schritt** – Primärbutton „Copy", zweite Zeile als „Danach"
3. **Fortschritt** – Schritte x/y mit dem **nächsten offenen Schritt** namentlich; Kriterien x/y verifiziert mit Liste der **offenen** Kriterien (IDs + Kurztitel)
4. **Probleme** – nur echte; Format-Hinweise als Zähler mit Ausklappen
5. **Dateien** – Spec, Plan, archivierte Pläne, Return Notes als Links (öffnen *neben* dem Panel)
6. Eingeklappt: Phasenleiste (Specify → Clarify → Plan → Implement → Compile → Done), Status-Historie

Volltext von Requirements, Kriterien und Planschritten entfällt im Standard und wird per Link an der richtigen Zeile im Editor geöffnet. [H]

### 5.3 Karte (Board)

```
┌──────────────────────────────────────┐
│ 0006  Make the outbox batch size …   │
│ ███████████░░  Steps 4/4 · AC 3/3    │
│ ▸ /sdd-compile          [Copy]       │
└──────────────────────────────────────┘
```

Drei Zeilen statt neun. Zustand = Spalte (kein Chip), Regel im Tooltip der Spalte, Diagnostics nur bei echten Problemen als Symbol.

## 6. Navigationskonzept

| Weg | Heute | Ziel |
| --- | --- | --- |
| Spec ansehen | Bereich Explorer → Liste → Zeile | Klick im Baum, auf Karte oder Zeile → Detail-Seitenleiste öffnet **im aktuellen Bereich** |
| Datei öffnen | „Open file" ersetzt den Tab | Öffnet `ViewColumn.Beside`; Studio bleibt sichtbar |
| Nächsten Schritt kopieren | Explorer → Spec → Copy | Ein Klick in Baum, Karte, Overview, Statusleiste; Befehl `FeatherSpec: Copy Next Step` mit Tastenkürzel |
| Zwischen Bereichen | 3 Tabs + Baum + Befehle | 2 Tabs (Overview, Board); Baum ist Arbeitsfläche, nicht Starter |
| Drill-down | Zahl → Board mit Filter | Bleibt; Filter-Ergebnis zeigt nur betroffene Spalten |

## 7. Reduktion von Komplexität

| Entfernen / zusammenführen | Begründung |
| --- | --- |
| „Move to…" (Button, Menü, Befehl) und Drag & Drop | 5 von 6 Zielen immer abgelehnt; keine Wirkung im 6. Fall (Q-2) |
| State-Filter-Checkboxen auf dem Board | redundant zur Spaltenstruktur; Named Set aus Drill-down bleibt |
| Zustands-Chip auf Karten | redundant zur Spalte |
| Regel-Sätze auf Kacheln, Karten, Zeilen | in Tooltip / Detail verschieben |
| Verteilungsbalken **oder** Kacheln | eine Darstellung reicht |
| Fortschrittsformel als Fließtext | Tooltip |
| „Priority: not available", „verdict: not available", „dependencies: not available" | strukturell nie vorhanden → weglassen; einmalig in der Doku erklären |
| Readiness R-1…R-7 als Prüfliste | ersetzen durch „fehlt noch: Plan" in Nutzersprache |
| Projektname 4× | Statusleiste + Overview-Kopf reichen |
| „Open Studio" + 3 Bereichseinträge im Baum | ersetzt durch Spec-Baum + Toolbar-Aktion |
| `Rescan Project` + `Refresh Project Discovery` | ein Befehl „Refresh" (intern beides) oder klare Namen |

Diese Liste reduziert sichtbare Elemente erheblich, ohne eine Information zu verlieren, die eine Entscheidung trägt. [H]

## 8. Externe Quellen (abgerufen 17.11.2026)

- VS Code UX Guidelines, Views: Baumelemente sollen keine Befehls-Buttons sein, Anzahl der Views klein halten, Welcome-Views kurz und mit Links – https://code.visualstudio.com/api/ux-guidelines/views
- VS Code UX Guidelines, Webviews: Webviews nur, wenn die native API nicht reicht; keine Wizards in Webviews – https://code.visualstudio.com/api/ux-guidelines/webviews
- Kiro Specs: Aufgaben-Ausführung direkt in `tasks.md` mit Statusanzeige – https://kiro.dev/docs/specs/
- Vergleichbare SDD-Extensions mit nativem Spec-Baum in der Sidebar (SpecKit Companion, SPECLAN, MinSpec) – u. a. https://dev.to/alfredoperez/speckit-companion-503e und https://minspec-dev.pages.dev/
