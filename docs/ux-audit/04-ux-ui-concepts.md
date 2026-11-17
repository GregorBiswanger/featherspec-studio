# 04 · UX/UI-Konzepte

Evidenz-Kürzel: siehe [01](01-product-understanding.md). Alle Konzepte sind **Gestaltungshypothesen [H]**, abgeleitet aus den Befunden in [02](02-current-experience-audit.md). Sie sind nicht mit Nutzern validiert; Validierungsvorschläge stehen in [05](05-prioritized-recommendations.md).

Umsetzbarkeit:
- 🟢 **direkt** mit bestehender Architektur (neue Projektion vorhandener Core-Fakten, UI-Änderung)
- 🟡 **moderater Umbau** (neue Host-Komponente, Protokoll-Erweiterung, Spec-Änderung)
- 🔴 **größere strukturelle Änderung**

---

## K-A · „Next step everywhere" — der Produktkern an jeder Fläche 🟢

**Problem:** Q-1 – der nächste Schritt ist nur im Detail sichtbar.
**Idee:** Eine Information, fünf Orte, eine Aktion („Copy"). Quelle bleibt `nextStep(model, key)` in `src/core/board/nextStep.ts`.

| Ort | Darstellung | Interaktion |
| --- | --- | --- |
| Karte | letzte Zeile `▸ /sdd-compile` + `[Copy]` | Copy kopiert, Karte bleibt |
| Overview „Jetzt" | Zeile je Spec mit Befehl + Copy | Copy; Klick auf Zeile öffnet Detail |
| Sidebar-Baum | `description` des TreeItems = Kurzform (`/sdd-compile`), Inline-Aktion `$(copy)` | Inline-Aktion kopiert; Hover zeigt volle Zeile |
| Statusleiste | `$(feather) 0015 · Review · /sdd-compile` | Klick: kopieren + kurze Bestätigung im Statusbar-Text („Copied") |
| Befehl | `FeatherSpec: Copy Next Step` | wirkt auf gewählte Spec, sonst Quick Pick nach Dringlichkeit sortiert |

**Kurzform-Regel:** Im Platzmangel nur der Befehl ohne Pfad (`/sdd-compile`), beim Kopieren immer die volle Zeile mit Pfad. Für NS-7 Kurzform `Start T-003`.

**Zweizeilige Schritte (NS-5, NS-9):** Erste Zeile ist der Primärschritt; die zweite erscheint als „Danach: …" nur im Detail und im Hover, nicht auf Karten.

**Spec-Bezug:** 0015 OP-003 („no next step on cards for now") muss revidiert werden.

---

## K-B · Sidebar als Arbeitsfläche („Specs"-Baum) 🟡

**Problem:** IA-1, IA-7 – die Sidebar enthält nur Starter-Buttons.

```
FEATHERSPEC                                    [⟳] [⌕] [⧉ Open Studio]
▾ IN PROGRESS                                              2
   ◐ 0015 Focus on visibility           Review · /sdd-compile    ⧉
   ◐ 0014 Set up FeatherSpec            Review · /sdd-compile    ⧉
▾ UP NEXT                                                  1
   ○ 0016 Workshop mode                 Ready · Start T-001      ⧉
▸ BACKLOG                                                  3
▸ DONE                                                    13
⚠ 1 problem                                     (nur wenn > 0)
```

- **Gruppen** statt Spalten: „In progress" (Active, Review, Blocked), „Up next" (Ready), „Backlog", „Done" (standardmäßig eingeklappt). Reihenfolge innerhalb: Blocked → Review → Active.
- **Symbol** = Zustand als Codicon mit Theme-Farbe (`ThemeIcon` + `ThemeColor`), nie Farbe allein: Text „Review" steht in der Beschreibung.
- **Tooltip** (`MarkdownString`): voller nächster Schritt, Schritte x/y, Kriterien x/y, Regel in Klartext.
- **Klick** auf Spec → Panel öffnet/zeigt Detail dieser Spec. **Inline-Aktion** `$(copy)` → nächsten Schritt kopieren. Kontextmenü: „Open spec", „Open plan", „Copy next step".
- **Badge** am Activity-Bar-Symbol (`TreeView.badge`): Anzahl „wartet auf dich" (Review + Blocked). Zahl = Aufmerksamkeit, nicht Gesamtmenge.
- **Welcome-View** S2 bleibt unverändert (gelungen).
- **Barrierefreiheit** kommt vom nativen Baum gratis (Typeahead, Screenreader-Rollen, Tastatur).

**Technik:** `studioTree.ts` bekommt einen `TreeDataProvider` mit Gruppen- und Spec-Knoten; Daten aus dem vorhandenen Shell-Modell (`ShellService.view().rows` liefert bereits Nummer, Titel, Zustand, Regel). Neu ist die Einbettung des nächsten Schritts pro Zeile. Spec-Änderung: 0005 (Baum), PD-048 (Symbole), ADR-001 §2 (Baum wird Statusfläche – entspricht dem ursprünglichen ADR-Text).

---

## K-C · Overview statt Mission Control: „Jetzt" zuerst 🟢/🟡

**Problem:** Mission Control priorisiert Zählwerte; „Needs attention" nennt keinen Schritt (02 §3.4).

```
┌ brownfield · FeatherSpec 1.7.0 ─────────────────────────────────────────────┐
│                                                                              │
│  NOW                                                                         │
│  ◐ 0006 Make the outbox batch size configurable      Review                  │
│     Steps 4/4 · AC 3/3 verified                                              │
│     Next  /sdd-compile .specs/active/0006-outbox-batch-size.md   [ Copy ]    │
│                                                                              │
│  UP NEXT                                                                     │
│  ○ 0003 Direct broker publication           needs a plan                     │
│     Next  /sdd-clarify .specs/backlog/0003-…md                   [ Copy ]    │
│  ○ 0004 Replace the authorization service   needs a plan          [ Copy ]   │
│     + 4 more in Backlog                                                      │
│                                                                              │
│  PROBLEMS (1)                                                                │
│  ⚠ 0002 Payment retry budget — done, but no archived plan   /sdd-lifecycle  │
│                                                                              │
│  Backlog 6 · Ready 0 · Active 0 · Review 1 · Done 2        ▸ Activity        │
└──────────────────────────────────────────────────────────────────────────────┘
```

Regeln:
- „Now" = Active + Review + Blocked, sortiert Blocked → Review → Active.
- „Up next" = Ready, dann Backlog-Specs nach Nummer; höchstens 3 sichtbar, Rest als Link „+ n more" → Board-Filter.
- „Problems" = genau die heutige `attention.ts`-Logik (Widerspruch, unlesbar) plus doppelte Nummer; Review ist **kein** Problem, sondern „Now".
- Kennzahlen als eine Zeile mit Drill-down-Links (bestehende Drill-down-Logik, `requests.ts`).
- Aktivität eingeklappt; leer → Abschnitt ausgeblendet, nicht „No recent activity.".
- Fortschrittsformel als Tooltip der Kennzahlzeile, wenn die Zahl bleibt.
- Leerer Projektzustand (0 Specs): „Start with `/sdd-specify`" + Copy.

**Technik:** `MissionControlView`-Protokoll (`src/shared/protocol/missionControl.ts`) um `next: NextStepView` je Zeile erweitern; `missionControlService.ts` ruft `nextStep()` auf. Webview-Komponenten neu anordnen. Spec-Änderung: 0006.

---

## K-D · Board als Pipeline, read-only 🟢/🟡

**Problem:** Q-2 Pseudo-Interaktionen, leere Spalten, 9-zeilige Karten (02 §3.5).

```
 Backlog 6        Ready 0 │Active 0│ Review 1          Done 2 ▸   Blocked 0
┌───────────────┐   ┊       ┊      ┌───────────────┐   (eingeklappt)  ┊
│0003 Direct    │   ┊       ┊      │0006 Make the  │                  ┊
│broker publ.   │   ┊       ┊      │outbox batch … │
│needs a plan   │   ┊       ┊      │████████ 4/4   │
│▸/sdd-clarify ⧉│   ┊       ┊      │▸/sdd-compile ⧉│
└───────────────┘                  └───────────────┘
```

- **Leere Spalten** werden zu schmalen Streifen (≈ 32 px, vertikaler Titel + 0), damit die Pipeline-Reihenfolge lesbar bleibt, aber keine Fläche frisst.
- **Done** standardmäßig eingeklappt (Zähler), aufklappbar; Zustand gemerkt.
- **Karte:** Titel, eine Status-/Fortschrittszeile, nächster Schritt mit Copy. Readiness nicht als Regel, sondern als Bedarf: „needs a plan", „needs criteria", „plan not started".
- **Kein Drag & Drop, kein „Move to…"**. Zieht der Nutzer trotzdem (Gewohnheit), passiert nichts; kein Cursor `move`, `draggable=false`.
- **Klick** auf Karte → Detail-Seitenleiste rechts im Board (K-E), Board bleibt sichtbar.
- **Filter**: State-Checkboxen entfallen; Named Set bleibt als Chip; Sortierung bleibt (Nummer, Titel). „Last change" nur, wenn die Zeiten nicht alle gleich sind (K-J).

**Alternative D2 (konservativ):** Drag Ready → Active behalten, aber nur auf Ready-Karten aktivieren und Active als einzige gültige Drop-Zone hervorheben; „Move to…" trotzdem entfernen. Vorteil: bekannte Geste für Workshops. Nachteil: Geste ohne Wirkung bleibt erklärungsbedürftig („Studio starts no agent"). **Empfehlung: D (ganz entfernen)**, weil der Copy-Button auf der Ready-Karte dieselbe Information ohne Missverständnis liefert.

**Technik:** Webview-Änderungen in `SpecBoard.tsx`, `Card.tsx`, `Column.tsx`, `FilterBar.tsx`; `MoveMenu.tsx`, `Announcer.tsx`, `moves.ts`, Befehl `moveSpec` entfallen. Spec-Änderungen: 0007 FR-09/AC-015/AC-018, 0015 FR-03/AC-006, PD-014.

---

## K-E · Detail als „Lagebild" statt Dokument 🟡

**Problem:** IA-5 – 4.952 px, 3.459 Wörter für eine Spec; Volltext, Prüfprotokolle, Dauer-Leermeldungen.

```
┌ 0015 · Focus the Studio on Visibility ─────────────── Review ─ [Open spec ↗] ┐
│                                                                              │
│  NEXT                                                                        │
│  /sdd-compile .specs/active/0015-focus-on-visibility.md          [ Copy ]    │
│  then, after READY:  /sdd-lifecycle .specs/active/0015-…md       [ Copy ]    │
│                                                                              │
│  PROGRESS                                                                    │
│  Steps     ████████████████████ 20/20                                        │
│  Criteria  ██████████████████░░ 28/30 verified                               │
│            open: AC-027 No quality loss …, AC-030 Hands-on M-1 (manual)  ↗    │
│                                                                              │
│  FILES   Spec ↗ · Plan ↗ · 13 archived plans ↗                               │
│                                                                              │
│  ▸ Phase       Specify ✓ · Clarify ? · Plan ✓ · Implement ✓ · Compile ◻     │
│  ▸ 10 format notes (no action needed)                                        │
│  ▸ Status history (1)                                                        │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **„Open spec ↗"** und jede ID öffnen die Datei **neben** dem Panel (`ViewColumn.Beside`) an der Zeile der ID (`TextEditor.revealRange`). Der Parser kennt die Zeilen bereits (Diagnostics nennen „line 243"). [C]
- **Offene Kriterien** mit Kurztitel – das ist die Information, die `/sdd-compile` braucht. Verifizierte Kriterien nur als Zahl.
- **Nächster offener Schritt** bei Active/Ready namentlich: „Next open step: T-007 Wire the status bar".
- **Phasenleiste** (K-H) eingeklappt; erklärt die Position im FeatherSpec-Loop.
- **Format-Hinweise** eingeklappt mit klarer Einordnung („no action needed").
- **Entfällt:** Volltext der Requirements, Kriterien, Planschritte, Verified-Protokolle; „Priority: not available"; „verdict: not available"; Readiness-Prüfliste; Regel-IDs im Fließtext.
- **Optional „Full content" Toggle** für Nutzer, die das heutige Verhalten wollen (Übergang, misst Bedarf).

**Platzierung:** als rechte Seitenleiste in Overview und Board (Breite ≈ 360–420 px, schließbar mit Esc). Unter 900 px Panelbreite überlagert sie als Drawer.

**Technik:** `detail.ts` (Core) liefert schon Verifikations-Summary, Schritte, Kriterien – neu sind „offene Kriterien" und Zeilennummern im Protokoll. `openFile` bekommt `viewColumn: Beside` und `line`. Spec-Änderung: 0007 §6.4 / AC-010.

---

## K-F · Gestufte Diagnostics 🟡

**Problem:** Q-3 – 83 Meldungen im eigenen Repo, keine davon handlungsrelevant.

| Stufe | Inhalt | Darstellung |
| --- | --- | --- |
| **Problem** | Lifecycle-Widerspruch, unlesbare Datei, doppelte Nummer/Stem, Plan-Link ins Leere | Warn-Symbol auf Karte/Baum, „Problems" in Overview, oben im Detail, mit nächstem Schritt (`/sdd-lifecycle`) |
| **Format-Hinweis** | unbekannte Sektion, unbekanntes Feld, Freitext in Traceability-State, mehrfach definierte AC-ID durch Amendments | nur Zähler im Detail, eingeklappt; optional ins **Problems-Panel** von VS Code als `Information` |
| **Kompatibilität** | Abweichungen, die FeatherSpec selbst erzeugt (z. B. `Successor:`-Kopfzeile, Felder `Added`/`Deletes`, Sektion `Open evidence`) | **gar nicht melden**: Parser an FeatherSpec 1.10.0 angleichen |

Zusätzlich: Diagnostics mit Datei und Zeile als `vscode.Diagnostic` im **Problems-Panel** veröffentlichen (`DiagnosticCollection`). Dann springt ein Klick an die Stelle, Quick Fixes sind später möglich, und das Studio-UI wird entlastet. [H]

**Technik:** `src/core/specs/diagnostics.ts` bekommt ein Feld `severity`; `attention.ts` zeigt, dass die Trennung fachlich schon existiert. Spec-Änderung: 0002 (Diagnostic-Liste), 0006 (Header-Zähler).

---

## K-G · Statusleiste als ambienter Begleiter 🟢

```
$(feather) 0015 · Review · /sdd-compile
```

- Zeigt die **zuletzt gewählte** Spec, sonst die dringendste aus „Now".
- Tooltip (Markdown): volle Zeile, Projekt + Version, „Click to copy · Alt+Click to open Studio".
- Klick: kopiert, Text wechselt 2 s auf `$(check) Copied`.
- Kein aktives Projekt oder nichts in Arbeit: `$(feather) FeatherSpec · 2 ready`.
- Projektwahl wandert in die Studio-Toolbar und erscheint nur bei mehreren Projekten.

**Technik:** `statusBar.ts` hat bereits `show(text)`; neu ist die Auswahl-Logik im Host. Spec-Änderung: 0001 (Statusleisten-Text).

---

## K-H · Phasenleiste pro Spec 🟡 (P3, validieren)

```
Specify ✓ ── Clarify ? ── Plan ✓ ── Read plan ? ── Implement 4/9 ── Compile ◻ ── Done ◻
```

- Bildet den FeatherSpec-Loop ab (README „The loop") und beantwortet „wo im Prozess bin ich?" ohne Regel-IDs.
- **Ehrlichkeit (P8):** „Clarify" und „Read plan" sind nicht persistiert → Fragezeichen mit Tooltip „FeatherSpec does not record this step". Das ist eine Stelle, an der „not available" Information trägt.
- Nutzen für Workshops (P2/P3): Teilnehmende sehen den Ablauf, ohne die Befehlsliste zu kennen.

---

## K-I · Ablage neben dem Code statt über dem Code 🟢

- **„Open file"** öffnet `Beside`; das Studio-Panel bleibt sichtbar.
- **Empfohlene Erstplatzierung:** Beim ersten Öffnen das Panel in eine eigene Editor-Gruppe rechts legen (`ViewColumn.Beside`), wenn bereits ein Editor offen ist. Danach merkt sich VS Code die Position.
- Board-Statuszeile entfällt (K-D); verbleibende Rückmeldungen als Inline-Bestätigung am Button („Copied ✓"), nicht als Zeile, die das Layout verschiebt.
- „Copy" wird **Primärbutton** (`--vscode-button-background`), „Dismiss" entfällt oder wird Sekundär-Link.

---

## K-J · Verlässliche Zeitangaben 🟡

- „Last change" stammt aus der Datei-mtime und ist nach Kopie/Checkout für alle Specs gleich (02 §3.5).
- Option 1 (leicht): Zeit nur zeigen, wenn sich die Werte unterscheiden; Sortierung „Last change" dann ebenfalls ausblenden.
- Option 2 (besser): Zeit des letzten Git-Commits, der Spec oder Plan berührt (`git log -1 --format=%ct -- <file>`), über die eingebaute Git-Extension-API. Benötigt `extensionDependencies` oder optionalen Zugriff; im Restricted Mode nur lesend – zu prüfen.
- Option 3: Planfeld `Last updated:` (FeatherSpec schreibt es, siehe Fixture-Plan) als primäre Quelle.

**Empfehlung:** Option 3 mit Fallback 1 – kommt ohne neue Abhängigkeit aus und nutzt FeatherSpecs eigene Angabe. [H]

---

## K-K · Recent activity aus Git statt nur aus Beobachtung 🔴 (P3)

Heute zeigt „Recent activity" nur Wechsel, die das Studio im laufenden Fenster gesehen hat; beim ersten Öffnen ist sie leer (02 §3.4). Eine aus Git abgeleitete Historie („0006 moved to active · 2 days ago · commit abc123") wäre beim ersten Öffnen gefüllt und nachvollziehbar.

Risiken: Performance bei großen Repos, Git-Verfügbarkeit, Restricted Mode, Zusammenspiel mit dem bestehenden Status-History-Store (0004). Validieren, bevor gebaut wird.

---

## K-L · Hinweise im Editor: CodeLens im Plan 🟡 (P3)

Wenn `*.plan.md` offen ist, steht über dem nächsten offenen Schritt:

```
▸ Next step · Copy "Start T-007 of .specs/active/0007-x.plan.md"
### T-007 — Wire the status bar
```

und über `**Status:**` der Spec eine CodeLens mit dem nächsten Befehl. Damit erreicht der Kern das Dokument, in dem der Nutzer ohnehin liest. Zusätzlich möglich: `FileDecorationProvider` färbt Spec-Dateien im Explorer nach Zustand (Badge „R" für Review). [H]

Vergleich: Kiro zeigt in `tasks.md` direkt über jeder Aufgabe eine Aktion „Start task", deren Beschriftung zu „Task in progress" und „Task completed" wechselt – die Handlung sitzt im Dokument selbst (kiro.dev, Specs). FeatherSpec Studio würde statt „Start" den kopierbaren Befehl anbieten und so assistent-neutral bleiben. [S, extern]

---

## K-M · Assistent-Übergabe ohne Copy-Paste 🟡 (P3, bewusst gegen PD-056 zu prüfen)

Heute: Copy → in den Chat wechseln → einfügen. Option: zusätzlich zum Copy ein „Send to chat" über den VS-Code-Befehl zum Öffnen des Chats mit vorbefüllter Eingabe. Das bricht PD-056 („the Studio opens no chat") und bindet an VS Codes Chat (Copilot oder Teilnehmer, die dort laufen). Claude-Code-Nutzer im Terminal profitieren nicht.

**Empfehlung:** Nicht als Standard. Höchstens als Einstellung, nachdem Copy-Telemetrie fehlt und Nutzerinterviews Bedarf zeigen. Vorher prüfen, ob die Befehls-API stabil dokumentiert ist. [H]

---

## Texte und Sprache (gilt für alle Konzepte)

| Heute | Vorschlag |
| --- | --- |
| Derived: draft with a plan that has not started `S-READY` | Ready — plan written, not started *(Regel-ID nur im Tooltip)* |
| Derived: plan is Done, waiting for review `S-REVIEW` | Review — all steps done, run /sdd-compile |
| No sibling plan, or the Plan line does not link it. `R-3` | needs a plan |
| The sibling plan is missing or not "Not started". `R-4` | *(entfällt; folgt aus „needs a plan")* |
| Model updated 2026-11-17 21:56 | Updated 21:56 *(Datum nur, wenn nicht heute)* |
| 0 project-level diagnostics · 15 specs with diagnostics | *(nur bei echten Problemen:)* 1 problem |
| S-BACKLOG · persisted | *(entfällt)* |
| 2026-11-17T21:56:14.561Z · — → Review · S-REVIEW · first observed · not checked | Today 21:56 — first seen as Review |
| Studio starts no agent. Next step for 0001 — paste it into your AI assistant: | *(entfällt mit K-D; auf der Karte steht der Schritt bereits)* |
| Priority: not available | *(entfällt)* |

Die Texte bleiben Englisch (PD-016).
