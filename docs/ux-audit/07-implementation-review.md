# 07 · Bewertung der Umsetzung (UX-Runde 0016–0020)

Stand `045b354` · 18.11.2026 · Evidenz-Kürzel wie in [01](01-product-understanding.md): **[B]** beobachtet · **[I]** Interaktion · **[T]** Test · **[C]** Code · **[S]** Spec · **[H]** Hypothese · **[G]** Gregors Feedback vom 18.11. (echtes Fenster, Projekt `sdd-tip-splitter`)

Screenshots dieser Runde: `screenshots-045b354/` (Präfix `n…`).

## 1. Vorgehen

1. **Umsetzung gelesen:** Specs 0016–0020, PD-058…PD-067, die neue verbindliche Regel `.claude/rules/ux-guidelines.md`, Commit-Verlauf und Teile des Codes. [S][C]
2. **Neues VSIX bedient**, genau wie beim Audit: dieselbe isolierte Umgebung (code-server 4.145.2 = VS Code 1.145.2), frisches Profil, die echte `featherspec-studio-0.1.0.vsix` vom 18.11. 11:20. Nur in einer temporären Kopie stand `engines.vscode` auf `^1.145.0`. Workspaces: die echten 20 Specs dieses Repos, `fs170-brownfield-mixed`, `fs110-ready-synthetic`, dieselbe Fixture mit aktiver Spec, ein leerer Ordner. Dark, Light, High Contrast; 1600 und 1000 px. [B][I]
3. **Jede Audit-Empfehlung gegen das Ergebnis geprüft** (§3) und **neue Befunde** gesammelt (§4).
4. **Gregors Feedback** (Screenshot aus dem echten Fenster) eingearbeitet, dazu Recherche zur Planansicht (§5, §6).

Nicht geprüft: Windows-Desktop, Screenreader, Restricted Mode, Setup-Erfolgsweg. Der Specs-Baum ließ sich in code-server bedienen und abbilden; die README-Notiz, er sei „in der Vorschau nicht abbildbar", gilt nur für die Headless-Vorschau des Teams.

## 2. Gesamturteil

**Die Umsetzung trifft das Zielbild des Audits sehr genau und handwerklich sauber.** Der Kern des Produkts – der nächste Schritt – ist jetzt an jeder Fläche sichtbar, die Sackgassen sind weg, und die Signale sind ehrlich. Vorher war das Studio ein Dashboard über Dateien; jetzt begleitet es die Arbeit spürbar.

Messbar am selben Material (vorher = Audit 17.11., nachher = heute):

| Messgröße | Vorher | Nachher | Evidenz |
| --- | --- | --- | --- |
| Sichtbare Warnungen im eigenen Repo | 83 an 15 Specs | 0 Problems; Format-Hinweise eingeklappt („5 format notes — no action needed") | [I n04] |
| Höhe des Details von Spec 0015 | 4.952 px, 3.459 Wörter | 839 px, 107 Wörter (passt auf einen Bildschirm) | [I] |
| Klicks bis zum kopierten nächsten Schritt | ≥ 3 (Bereich → Spec → Copy) | 1 (Baum, Karte, Overview, Statusleiste oder Befehl) | [I n11, n12] |
| Flächen mit nächstem Schritt | 1 (Detail) | 6 (Baum, Statusleiste, Befehl, Overview, Karte, Detail) | [B n02, n04, n06] |
| Angebotene Moves, die immer scheitern | 5 je Karte | 0 | [B n06] |
| Zeilen je Karte | bis 9 | 3 | [B n06] |
| Tree-Einträge ohne Information | 5 | 0; Gruppen mit Zustand, Schritt, Badge | [B n02] |

Der Prozess war gründlich: je Spec ein frischer `/sdd-compile`, Testtitel-Abgleich, und eine Browser-Vorschau, die drei Layoutfehler fand, die 2.234 grüne Unit-Tests nicht sehen konnten (Projektstatus 18.11.). [T, fremd]

**Aber:** Das erste echte Feedback (Gregor) trifft eine Schwäche, die Audit und Umsetzung beide unterschätzt haben. Der nächste Schritt wird **als roher Befehl ohne Absicht** gezeigt. Bei einer aktiven Spec liest sich `/sdd-plan` wie „erzeuge einen Plan", obwohl der Plan schon da ist (§5.1). Dazu kommen ein Layoutfehler bei schmalem Panel und einige kleinere Unstimmigkeiten (§4).

## 3. Abgleich mit den Audit-Empfehlungen

| ID | Empfehlung | Ergebnis | Bewertung | Evidenz |
| --- | --- | --- | --- | --- |
| R-01 | Diagnostics stufen | ✅ drei Stufen; eigenes Repo 0 Problems; Kompatibilität (z. B. `Successor:`) nicht gemeldet | erfüllt | [I n04][S PD-059] |
| R-02 | Pseudo-Moves entfernen | ✅ kein Ziehen, kein „Move to…", kein Befehl | erfüllt | [B n06][G] |
| R-03 | Schritt auf Karten und Overview | ✅ jede Karte, jede Overview-Zeile | erfüllt, Darstellung siehe N-1/N-6 | [B n06, n04] |
| R-04 | Statusleiste + Befehl | ✅ `0019 · Review · /sdd-compile`, Klick kopiert; ohne laufende Arbeit `FeatherSpec · 1 ready`, Klick wählt Spec; Befehl kopiert die volle Zeile | erfüllt | [I n12] |
| R-05 | Specs-Baum | ✅ Gruppen, Symbol je Zustand, Inline-Copy, Kontextmenü, Badge („7 specs wait for you: 7 in Review") | erfüllt, Feinschliff N-3…N-5 | [B n02, n08] |
| R-06 | Overview „Jetzt zuerst" | ✅ Now, Up next (max. 3 + „+ n more"), Problems, Zahlenzeile; leeres Up next bietet `/sdd-specify` an | erfüllt | [B n04, n05] |
| R-07 | Detail als Lagebild | ✅ Next step, Progress mit „Next open step" und offenen Kriterien, Files, eingeklappte Notizen und Historie | erfüllt | [B n04, n10] |
| R-08 | Nutzersprache | ◐ fast überall; Problemtexte teils noch technisch („done/ Implemented spec without an archive link in its Plan line.") | weitgehend | [B n05] |
| R-09 | Backlog als Bedarf | ✅ „needs a plan", keine roten Icons | erfüllt | [B n06] |
| R-10 | Board kompakt | ✅ 32-px-Streifen für leere Spalten, Done eingeklappt, kein Chip | erfüllt | [B n06] |
| R-11 | Ort halten, Dateien daneben | ✅ Seitenleiste statt Bereichswechsel; ID öffnet die Datei in einer zweiten Editor-Gruppe an der Zeile; Esc schließt und gibt den Fokus an die Zeile zurück | erfüllt | [I n22] |
| R-12 | Copy primär, kein Layout-Shift | ✅ „Copied" am Knopf, kein Layout-Shift. Neu: zu viele Primärknöpfe (N-6) | erfüllt mit Nebenwirkung | [I n11] |
| R-13 | `**`-Fehler | ✅ behoben, Regressionstest `src/core/board/idText.test.ts` | erfüllt | [C][T] |
| R-14 | Verlässliche Zeiten | ◐ Plandatum gewinnt, Tagesgenauigkeit; Backlog-Karten ohne Plan zeigen weiter Dateizeit (nach Kopie = heute) | weitgehend | [B n06] |
| R-15 | Aufräumen | ✅ Projektname einmal, kein ▸, ein Refresh | erfüllt | [B n04] |
| R-16 | NS-6 vervollständigen | ⚠ zweite Zeile „Then, in the same chat, if nothing blocks: continue". Die erste Zeile bleibt `/sdd-plan` und führt in die Irre | **nicht gelöst**, siehe §5.1 | [I n10][G] |
| R-17 | Historie lesbar | ✅ „Today 11:40 — first seen as Active", Hinweis „Only changes Studio saw while it was running." | erfüllt | [I] |
| R-18 | Setup erklärt | ✅ Ein Satz im Welcome-View, was Setup tut | erfüllt | [B n14] |
| R-19…R-23 | Innovationen | bewusst nicht gebaut (PD-061) | richtig so | [S] |

**Bilanz:** 15 erfüllt, 2 weitgehend, 1 nicht gelöst, 5 bewusst zurückgestellt.

Gut ist auch, was über das Audit hinausgeht: Die Leitlinien sind als **verbindliche Regel** (`.claude/rules/ux-guidelines.md`) im Repo, mit Pfad-Scope. Künftige Specs können sie nicht mehr stillschweigend verletzen. Das ist genau die Art Absicherung, die das Projekt verlangt („Qualität darf sich durch Updates nicht verschlechtern").

## 4. Neue Befunde

| ID | Befund | Wirkung | Prio | Evidenz |
| --- | --- | --- | --- | --- |
| **N-1** | **Der nächste Schritt hat keine Absicht.** Er wird als roter Faden angezeigt, aber als nackter Befehl. Für eine aktive Spec mit Plan steht `/sdd-plan` an erster Stelle | Nutzer versteht „neuen Plan erstellen" (Gregor) | **P1** | [G][I n10] |
| **N-2** | **Overview unter der Schublade bricht Wörter.** Bei Panel < 900 px und offener Seitenleiste bleibt der Overview ≈ 250 px; Titel brechen silbenweise („configura/ble", „publicatio/n") | Bei Laptopbreite mit offener Sidebar kaum lesbar | **P1** | [B n16] |
| **N-3** | **Baum kürzt genau den Schritt.** Bei 300 px Sidebar (Standard) zeigt die Beschreibung „Rev…", „Review · /…" | Kerninformation nur per Hover sichtbar | P2 | [B n02] |
| **N-4** | **Problems verstecken sich in eingeklappten Gruppen.** 0002 (Problem) liegt in „Done": Gruppe im Baum und Done-Streifen im Board zeigen keinen Hinweis („Done: 2 specs, collapsed") | Verstößt gegen Leitlinie 3 („wherever the spec appears") | P2 | [I n08] |
| **N-5** | **„Up next" heißt zweimal etwas anderes.** Baum: nur Ready. Overview: Ready, dann Backlog | Gleiches Wort, andere Menge | P2 | [B n05, n07] |
| **N-6** | **Zu viele Primärknöpfe.** Jede Zeile und Karte hat einen gefüllten „Copy"-Knopf; im Studio-Repo 10 auf einem Bildschirm | Die Knöpfe sind lauter als die Titel; keine Hierarchie | P2 | [B n04, n06] |
| **N-7** | **Problemtext technisch und abgeschnitten.** „done/ Implemented spec without an archive link in it…", Titel „Payment retry b…" | Gerade beim Problem fehlt das Verständnis | P2 | [B n19, n21] |
| **N-8** | **Pfad bricht im Detail mitten im Wort** („0019-detail-\nsituation-picture.md") | kosmetisch | P3 | [B n04] |
| **N-9** | **Wenn alles in Review ist, ist „Now" eine Wand gleicher Zeilen** (7 × `/sdd-compile`) | Liste ohne Unterschiede; eine Reihenfolge-Empfehlung fehlt | P3 | [B n04] |

### Vorschläge zu N-2…N-9

- **N-2:** Overview mit **Container Queries** (`container-type: inline-size`) statt Viewport-Regel. Unter ≈ 420 px Inhaltsbreite: Titel volle Zeile, darunter Zustand, Schritt und Copy. `overflow-wrap: anywhere` nur für Pfade, nie für Titel. Alternative: Unter 900 px die Schublade als Overlay mit abgedunkeltem Hintergrund, dann bleibt der Overview breit. PD-066 neu entscheiden.
- **N-3:** Beschreibung nur der Schritt (`/sdd-compile`, `Start T-003`). Zustand steckt schon im Symbol und in der Gruppe und bleibt im Tooltip und im `aria-label`. Titel kürzen, wenn nötig, nicht den Schritt.
- **N-4:** Gruppe/Streifen trägt den Zusatz „· 1 problem" plus Warnsymbol. Oder: Specs mit Problem stehen zusätzlich oben in einer eigenen Gruppe „Needs fixing".
- **N-5:** Baum-Gruppe in „Ready" umbenennen. Oder Overview-Abschnitt „Up next" genau wie im Baum definieren und Backlog separat zeigen.
- **N-6:** In Listen ein Sekundär- oder Symbolknopf (`$(copy)` + Tooltip „Copy prompt: …"). Primär nur im Detail und in der ersten Zeile von „Now".
- **N-7:** Problemsätze aus Nutzersicht mit Folge: „Done, but its plan was never archived — run /sdd-lifecycle". Problemzeilen dürfen umbrechen.
- **N-9:** Bei mehreren gleichen Schritten eine Zeile „7 specs wait for /sdd-compile" mit aufklappbarer Liste. Oder Reihenfolge nach Alter (älteste Review zuerst).

## 5. Gregors Feedback

### 5.1 „Obwohl ein Plan existiert, bietet Next step an, einen Plan zu erzeugen" — **berechtigt, P1**

**Was passiert:** Für Active nennt Regel NS-6 `/sdd-plan <spec>`. In FeatherSpec **setzt** `/sdd-plan` bei vorhandenem Plan **fort** (Mode B: Stand berichten, dann auf „continue" warten). Es erzeugt keinen neuen Plan (`featherspec/.claude/commands/sdd-plan.md`, Mode B). Die UI zeigt aber nur den Befehlsnamen. Der Name sagt „plan", der Nutzer liest „planen". [S][G]

Das Audit hatte die Zweistufigkeit erkannt (R-16), aber nur „Then: continue" ergänzt. Das eigentliche Problem ist größer: **Kein nächster Schritt sagt, was er bewirkt.**

**Vorschlag A — Absicht zuerst, Befehl als Beleg, „Copy prompt":**

```
NEXT STEP
Continue with T-003 — Geldwerte, Prozentgenauigkeit und Obergrenzen ablehnen
  Implement T-003 of .specs/active/0001-tip-splitter.plan.md          [ Copy prompt ]
  same chat or new chat

Not sure where it stands?  Let the agent report first
  /sdd-plan .specs/active/0001-tip-splitter.md                          [ Copy prompt ]
```

- **Primärzeile für Active mit offenem Schritt:** `Implement T-003 of <plan path>`. Das ist FeatherSpecs eigene Formulierung (README ⑥ „Implement.", `parallel-work.md` „Implement T-00x of <plan path> …"). Laut `plans.md` gleicht der Agent beim Wiederaufnehmen erst Haken und Code ab („Resuming after an interruption … bring those level first"). Der Abgleich aus Mode B geht also nicht verloren. [S]
- **`/sdd-plan` wird Zweitzeile mit Absicht** („Let the agent report first").
- **Knopf heißt „Copy prompt"**, wie Gregor vorschlägt. „Copy" allein sagt nicht, *was* im Clipboard landet und wofür.
- **Chat-Hinweis**, wo FeatherSpec ihn vorgibt: `/sdd-compile` „new chat, ideally another model family" (README ⑦), `/sdd-clarify` „new chat" (README: liest die Spec „as a stranger would"), `continue` „same chat".

Absichtstexte je Regel (Vorschlag, Englisch nach PD-016):

| Regel | Absicht (Überschrift) | Prompt | Chat |
| --- | --- | --- | --- |
| NS-9 | Have the spec challenged, then plan it | `/sdd-clarify <spec>` → `/sdd-plan <spec>` | new chat |
| NS-10 | Write the plan | `/sdd-plan <spec>` | any |
| NS-8 | Add acceptance criteria | `/sdd-specify <spec>` | any |
| NS-7 | Start implementing: T-001 <Titel> | `Start T-001 of <plan>` | any |
| NS-6 | Continue with T-003 <Titel> · *or* let the agent report first | `Implement T-003 of <plan>` · `/sdd-plan <spec>` | any · any |
| NS-5 | Have the result verified · then close the spec | `/sdd-compile <spec>` · `/sdd-lifecycle <spec>` | new chat, other model · any |
| NS-4 | Find out what blocks | `/sdd-plan <spec>` | any |
| NS-2 | Put folder and status back in line | `/sdd-lifecycle <spec>` | any |

Wichtig für die Qualität: Die Änderung an NS-6 berührt FeatherSpecs Semantik. **Vor dem Bau im Hands-On auf `tip-splitter` prüfen**, ob „Implement T-003 of <plan>" in einem frischen Chat den Abgleich macht und genau einen Schritt baut. [H]

### 5.2 „Copy" → „Copy prompt" — **ja**

Siehe oben. In Listen (N-6) als Symbolknopf mit Tooltip „Copy prompt: Implement T-003 of …".

### 5.3 Vertikale Spalten im Board — **beibehalten, gängiges Muster**

Eingeklappte Spalten als schmale senkrechte Streifen sind ein etabliertes Kanban-Muster. Trello führte das nativ ein: Eine eingeklappte Liste „nests it vertically between your other Trello lists, getting it out of the way so that you can see more of your board, without hiding the list entirely", und „when collapsed, the list's name and the number of cards it contains will still be visible". Genau das tut das Studio. Die Ungewohntheit kommt eher daher, dass **leere** Spalten automatisch schmal sind. Bei Trello klappt man selbst ein.

Kleine Verfeinerungen: Streifen mit Tooltip „Ready: no spec" und, falls ein Problem darin liegt, mit Warnsymbol (N-4). Optional ein Board-Schalter „Show empty columns". Mehr nicht. [H]

### 5.4 Planansicht mit Parallelität — **ja, P1; Konzept in §6**

## 6. Neues Konzept K-N: Plan-Karte (Stufen, Parallelität, Subagents)

### 6.1 Problem

Gregor muss „immer nachsehen in der md-Datei oder mühevoll fragen, was man parallel wie gestalten kann". [G] Heute zeigt das Detail nur „Steps 2 of 6" und den nächsten offenen Schritt. Ein Klick auf eine ID öffnet die Markdown-Datei. Wie der Plan **aufgebaut** ist (Stufen, `‖`, Empfehlung), bleibt unsichtbar. [B n10]

### 6.2 Was FeatherSpec schon liefert

FeatherSpec 1.10.0 schreibt die Parallelität **maschinenlesbar** in jeden Plan [S]:

- `## Stages` mit einer Zeile pro Stufe. `‖` verbindet unabhängige Schritte, `→` abhängige, z. B. `2. T-002 ‖ T-003 — …`.
- Eine Schlusszeile `Parallel: stage 2 … Recommended: in sequence (the steps are small)` oder `No parallel stage: … share messages.ts …`. Die Begründung steht dabei.
- Je Schritt `Files:` (welche Dateien er anfasst) und `Covers:` (welche Kriterien).
- Rückmeldungen paralleler Worker als Datei `.memory-bank/activeContext.<spec>-<T>.md` mit `Status: DONE | BLOCKED`.
- Drei Ausführungswege laut `plans.md`: **in sequence** (Standard), **subagents**, **other agents** mit je einer Startzeile `Implement T-00x of <plan path> as a parallel worker.`

**Der Studio-Parser liest das alles bereits:** Stufen mit `kind: 'single' | 'sequential' | 'parallel' | 'mixed'`, Schritt-IDs je Stufe, die Schlusszeile (`src/core/specs/parsePlan.ts`), je Schritt `files`, `covers`, `ticked` (`src/core/specs/planSteps.ts`) und Return Notes (`src/core/specs/returnNote.ts`). Angezeigt wird davon fast nichts. Das Konzept ist also **direkt mit bestehender Architektur umsetzbar** – neue Projektion, kein neuer Parser. [C]

### 6.3 Vorbilder

- **Kiro** stellt dieselbe Information als „Wellen" dar: Es „builds a dependency graph of the tasks in your `tasks.md` and groups independent tasks into waves", und „Waves execute sequentially; tasks within a wave execute concurrently." Außerdem gilt: „Tasks that touch the same files are never run in parallel." FeatherSpecs Stufen sind dieselbe Idee, nur vom Plan festgelegt statt berechnet.
- **Spec Kit** markiert parallele Aufgaben mit `[P]`, was heißt: „Can run in parallel (different files, no dependencies)". Sein Tasks-Schritt soll ausdrücklich „Identify parallel execution opportunities" – als Text in der Datei, ohne eigene Ansicht.
- **VS Code** selbst kann seit 1.109 Subagents parallel starten: „VS Code can now run multiple subagents in parallel." Subagents arbeiten in eigenen Kontextfenstern; „only the final result is returned to the main agent, keeping the main context focused and reducing token usage."

Folgerung: Die Werkzeuge zum parallelen Ausführen gibt es (VS Code, Claude Code, Kiro). Es fehlt eine **Ansicht, die vor dem Start zeigt, was parallel geht, warum und wie man es anstößt**. Genau das kann das Studio liefern, ohne selbst Agenten zu starten (PD-055 bleibt gewahrt). [H]

### 6.4 Gestaltung

**Ort:** ein neuer Abschnitt **„Plan"** in der Detail-Seitenleiste, direkt unter Next step. Kompakt, da Stufen meist 1–3 Schritte breit sind. „Expand" öffnet die volle Plan-Karte als dritten Panel-Tab **„Plan"** für die gewählte Spec. Ein Klick auf einen Schritt zeigt dessen Karte. „Open in file" bleibt Zweitaktion, nicht der Standard.

```
PLAN  ·  2 of 6 done  ·  plan recommends: in sequence (small steps)            [Expand ⤢]

 1  ✓ T-001  Grundgerüst und Rundungsregel
 2  ✓ T-002  Eingaben validieren
 3  ◐ T-003  Geldwerte, Prozentgenauigkeit, Obergrenzen      ← next
 4  ○ T-004  Trinkgeld berechnen   ‖   ○ T-005  Betrag aufteilen        ⇉ can run in parallel
            src/tip.ts                     src/split.ts
 5  ○ T-006  Doku, Gates
```

*(Beispiel zur Illustration, nicht der echte Tip-Splitter-Plan.)*

Volle Ansicht (Tab „Plan"), eine Stufe aufgeklappt:

```
STAGE 4  ⇉ parallel · T-004 ‖ T-005
  ┌──────────────────────────────┐   ┌──────────────────────────────┐
  │ ○ T-004 Trinkgeld berechnen  │   │ ○ T-005 Betrag aufteilen     │
  │ Files  src/tip.ts, tip.test  │   │ Files  src/split.ts, split…  │
  │ Covers AC-004, AC-005        │   │ Covers AC-006…AC-008         │
  └──────────────────────────────┘   └──────────────────────────────┘
  The plan says: "Both are small: run them in sequence."

  How do you want to run stage 4?
  ( ) In sequence        Implement the whole stage 4 of <plan>             [Copy prompt]
  ( ) Subagents          Implement stage 4 of <plan> with subagents         [Copy prompt]
                         you confirm the stage's tests first; no steering in between
  ( ) Other agents       2 start lines, one per chat, tool or worktree      [Copy 2 lines]
                         commit first: a worktree holds committed files only

STAGE 5  → sequential · T-006
  Why not parallel? The plan says: "share package.json and the docs"
```

**Regeln:**

1. **Die Empfehlung des Plans steht zuerst.** Das Studio entscheidet nicht neu, es zeigt, was der Plan begründet hat.
2. **Drei Wege, genau wie `plans.md` sie nennt**, mit dem jeweiligen Nachteil in einem Satz (aus `plans.md`: Subagents „cannot ask you", Worktree „needs the tree committed first").
3. **Die Startzeilen für andere Agenten sind exakt FeatherSpecs Wortlaut** (`Implement T-004 of <plan path> as a parallel worker.`). „Copy 2 lines" kopiert sie zeilenweise; alternativ je Schritt ein Knopf.
4. **Live-Status der Worker ohne Agent-Start:** Erscheint eine Return Note `activeContext.<spec>-T-004.md`, zeigt die Schrittkarte „returned · DONE" oder „returned · BLOCKED: <Grund>". Danach folgt der Schritt „Integrate the returned steps" (Prompt für die Hauptsitzung, Wortlaut im Hands-On klären). Das ist reine Dateibeobachtung im Sinne von PD-055.
5. **„Why not parallel?"** zeigt die Begründung aus der `No parallel stage:`-Zeile. Auf Wunsch markiert es die gemeinsamen Dateien zweier Schritte aus ihren `Files:`-Zeilen.
6. **Nur wenn der Plan `‖` hat**, erscheinen die Ausführungswege. Ein Plan ohne `## Stages` zeigt eine einfache Schrittliste.

**Zu prüfen (Hypothesen), bevor es gebaut wird:**

- Wortlaut der Prompts „Implement the whole stage 4 of <plan>" und „… with subagents". `plans.md` nennt „the whole stage" wörtlich; die Wahl der Subagents erfolgt dort als **Antwort auf die Frage des Agenten**. Ein vorab gegebener Prompt kann die Frage vorwegnehmen, muss aber im Hands-On beweisen, dass der Agent sie nicht überspringt, wo eine Arbeitsvereinbarung einen Stopp verlangt (Test-Review).
- Ob Nutzer die Planansicht im Seitenleisten-Abschnitt nutzen oder eher den Tab.
- Ob „Copy 2 lines" oder Einzelknöpfe besser zum Arbeiten mit mehreren Chats passen.

**Aufwand:** M (Projektion vorhandener Parser-Daten + Webview-Komponenten). Abhängigkeit: N-1 (Prompt-Texte und „Copy prompt" einheitlich).

## 6a. Assistent-Wahl und dezente Führung (Gregors Ergänzung)

### Idee

1. **Einstellung „Mein Assistent"**: GitHub Copilot, Claude Code, Codex oder „nur kopieren". Der Knopf heißt dann **„Send to Claude Code"** statt „Copy prompt". Er **füllt die Eingabe nur vor und schickt nichts ab**: Neue Sitzung, Modell und Modus wählt der Mensch.
2. **Dezente Hinweise je Schritt**: z. B. für den Plan ein starkes Reasoning-Modell und Websuche, für „Implement/continue" ein schnelleres Modell. Ein kleines `?` zeigt den Hinweis bei Bedarf, ohne die Fläche zu überladen.

### Technische Machbarkeit (Recherche 18.11.2026)

| Assistent | Vorbefüllen ohne Absenden | Wie | Sicherheit |
| --- | --- | --- | --- |
| **GitHub Copilot** (VS-Code-Chat) | **ja** | `workbench.action.chat.open` mit `{ query, isPartialQuery: true }`; laut Erfahrungsberichten füllt der Befehl die Eingabe, sendet aber nicht. Neue Sitzung vorher mit `workbench.action.chat.newChat`; ein `mode`-Parameter existiert. Die Befehle sind Workbench-intern, nicht als stabile API dokumentiert | mittel–hoch, Spike nötig |
| **Claude Code** (Extension `anthropic.claude-code`) | **ja, offenbar** | URI `vscode://anthropic.claude-code/open?prompt=…` (Drittquelle) oder Befehl `claude-vscode.editor.open(sessionId, initialPrompt, viewColumn)`. Ein offenes Issue bittet darum, den Prompt dort *abschicken* zu können, „not just pre-fill it" – Vorbefüllen geht also bereits. Nicht offiziell dokumentiert | mittel, Spike nötig |
| **Codex** (Extension `openai.chatgpt`) | **nein, nicht direkt** | Dokumentierte Befehle: `chatgpt.newChat`, `chatgpt.openSidebar`, `chatgpt.newCodexPanel` usw., kein Prompt-Parameter. Rückfall: in die Zwischenablage kopieren, neuen Codex-Chat öffnen, Hinweis „Press Ctrl+V". **Zusätzlich:** FeatherSpec liefert keine Befehls-Loader für Codex (nur `.claude/commands/` und `.github/prompts/`). Ein `/sdd-plan` funktioniert dort also vermutlich nicht als Befehl; der Prompt müsste lauten „Run `.claude/commands/sdd-plan.md` for <spec>" | niedrig, erst prüfen |
| **Keiner / anderer** | – | Copy prompt wie heute | hoch |

**Folgerung:** Machbar und sinnvoll, als **Adapter pro Assistent mit Rückfall auf die Zwischenablage**. Die Einstellung braucht es aus zwei Gründen: die Knopfbeschriftung und – wichtiger – **den passenden Prompt-Wortlaut je Assistent** (Codex). Das ändert PD-056 („the Studio opens no chat"): Es öffnet dann einen Chat und füllt ihn vor, schickt aber nichts ab. Dafür braucht es eine neue Produktentscheidung.

### Gestaltung

**Einstellung** `featherspec-studio.assistant`: `"copilot" | "claudeCode" | "codex" | "clipboard"`. Beim ersten Klick auf einen nächsten Schritt erscheint einmalig ein Quick Pick mit **nur den installierten** Assistenten (`vscode.extensions.getExtension(...)`) plus „Just copy". Änderbar über ein Zahnrad im Baum-Toolbar und in den Settings.

**Knopf als geteilter Knopf** (ein Knopf mit kleinem Pfeil daneben), nur im Detail und in „Now" primär:

```
[ Send to Claude Code  ▾ ]
     ├ Send to a new chat            ← Standard, wenn FeatherSpec eine frische Sitzung empfiehlt
     ├ Send to the current chat      ← Standard bei „continue"
     └ Copy prompt
```

In Listen (Baum, Karten) bleibt es ein Symbolknopf mit Tooltip „Send to Claude Code: Implement T-003 of …".

**Dezente Führung („Coach") – eine Zeile plus `?`:**

```
NEXT STEP                                                          (?)
Continue with T-003 — Geldwerte, Prozentgenauigkeit …
  Implement T-003 of .specs/active/0001-tip-splitter.plan.md
  [ Send to Claude Code ▾ ]      same chat · fast model is fine
```

- Unter dem Knopf **eine kurze graue Zeile**: Sitzung + Modellklasse. Mehr nicht.
- Das `(?)` öffnet **per Klick und per Tastatur** ein kleines Infofeld, kein reines Mouse-over: Tooltips sind per Tastatur und auf Touch schlecht erreichbar. Inhalt: Was der Schritt bewirkt, was danach passiert, Modell- und Sitzungsempfehlung mit Begründung, wo man umschaltet.
- Abschaltbar: `featherspec-studio.showStepTips`.
- **Keine festen Modellnamen im Produkt.** Modellnamen veralten in Wochen. Das Studio spricht von Klassen („strong reasoning model", „fast model", „other model family"). Optional trägt der Nutzer seine Modelle ein (`featherspec-studio.modelHints`: `{ "strong": "Opus 5.5", "fast": "Sonnet 5.5" }`); dann steht der Name in der grauen Zeile.

Empfehlungen je Schritt (aus FeatherSpec-Quellen und eigener Projekt-Erfahrung):

| Schritt | Sitzung | Modellklasse | Weitere Hinweise | Beleg |
| --- | --- | --- | --- | --- |
| `/sdd-specify` | beliebig | strong | Interview, dein Wissen zählt | [S] |
| `/sdd-clarify` | **neue Sitzung** | strong, gern andere Familie als die Spec | liest die Spec „as a stranger would" | README „The loop" |
| `/sdd-plan` (neu) | beliebig | **strong reasoning** | **Websuche erlauben** – der Plan recherchiert Bibliotheken und Versionen | README („with research"); Studio-Runde: Plan mit Opus und Websuche |
| Start / Implement / continue | gleiche Sitzung | **fast** reicht | Ein Schritt, dann Stopp; bei TDD Test-Review abwarten | Studio-Runde: Umsetzung mit Sonnet, 7 Pläne ohne Rückfrage (Status 16.11.) |
| Stufe mit `‖` | – | fast | Subagents können nicht fragen; Tests vorher bestätigen | `plans.md` |
| `/sdd-compile` | **neue Sitzung** | strong, **andere Modellfamilie** als die Umsetzung | „a judge tends to pass what its own family wrote" | README ⑦ |
| `/sdd-lifecycle` | beliebig | fast | – | [S] |

**Wo umschalten** (im Infofeld je Assistent): Copilot – Modellwahl in der Chat-Eingabe; Claude Code – `/model`; Codex – Modellwahl der Extension. Den genauen Weg je Version im Spike prüfen. [H]

### Bewertung

- **Nutzen hoch:** Es schließt die letzte Lücke zwischen „Studio weiß den Schritt" und „Assistent bekommt ihn", ohne die Kontrolle abzugeben. Die Modell-Hinweise übersetzen FeatherSpec-Wissen, das heute nur im README steht, in den Moment der Handlung.
- **Risiko mittel:** Copilot und Claude Code bieten das Vorbefüllen nur über nicht stabil dokumentierte Befehle an. Deshalb: Adapter mit Erkennung („Befehl vorhanden?"), Rückfall auf Kopieren, Test pro Assistent-Version in der Release-Checkliste.
- **Leitlinien-Konflikt bewusst entscheiden:** PD-056 (kein Chat öffnen) und die Assistent-Neutralität. Die Lösung bleibt neutral, weil „Just copy" immer da ist und kein Assistent bevorzugt wird.

**Vorgehen:** erst ein kleiner Spike (je Assistent: Chat öffnen, vorbefüllen, nicht senden; Codex-Prompt-Wortlaut), dann eine Spec. Die Coach-Zeile kann vorher kommen, sie braucht keinen Adapter.

## 7. Prozess-Beobachtung

- **Stark:** frische Prüfungen je Spec, Testtitel-Abgleich gegen Testverlust, Browser-Vorschau als zusätzliche Evidenzart, verbindliche UX-Regel. Das ist vorbildliches Spec-Driven Development. [S][T, fremd]
- **Lücke:** Das Audit empfahl, Zielbild B **schrittweise zu validieren** (05: „Etappe 4 … danach Entscheidung über den Bereich Spec Explorer"; Validierung mit Hands-On und 5-Sekunden-Test vor und nach den Etappen). Umgesetzt wurde alles in einem Zug, entschieden durch Stellvertreter (PD-058…PD-067), ohne Nutzertest dazwischen. Gregors erster Blick fand prompt einen Bedeutungsfehler (N-1). Das bestätigt den DevEx-Befund vom 17.11. („Produktwert früh mit echter Nutzung prüfen"). Für die nächste Runde: **vor dem Bau ein 10-Minuten-Klicktest** mit Gregor oder Workshop-Teilnehmenden, mindestens für Texte und neue Flächen. [S][H]

## 8. Empfohlene nächste Runde

| Reihenfolge | Inhalt | Prio | Aufwand |
| --- | --- | --- | --- |
| 1 | **Absicht zuerst + „Copy prompt"** (N-1, §5.1), inkl. NS-6 neu; vorher Hands-On-Prüfung des Wortlauts | P1 | S–M |
| 2 | **Overview unter der Schublade** mit Container Queries (N-2) | P1 | S |
| 3 | **Plan-Karte** im Detail + Tab „Plan" (K-N, §6) | P1 | M |
| 4 | **Coach-Zeile + `(?)`-Infofeld** je Schritt (Sitzung, Modellklasse, Websuche), abschaltbar (§6a) | P1 | S |
| 5 | **Spike Assistent-Adapter** (Copilot, Claude Code, Codex: vorbefüllen, nicht senden), danach Spec „Send to <Assistent>" mit Rückfall Kopieren und neuer PD zu PD-056 (§6a) | P2 | S + M |
| 6 | Baum-Beschreibung nur Schritt (N-3), Problems in eingeklappten Gruppen sichtbar (N-4), „Up next" einheitlich (N-5) | P2 | S |
| 7 | Knopfhierarchie in Listen (N-6), Problemtexte (N-7) | P2 | S |
| 8 | N-8, N-9 | P3 | S |

Vor jeder Spec: kurzer Klicktest mit Gregor auf `tip-splitter`. Nach jeder Spec: frischer `/sdd-compile`, Vorschau in Dark/Light/HC bei 1600 **und** ≤ 1000 px Fensterbreite mit offener Seitenleiste.

## Quellen

- Kiro Specs (Wellen, parallele Ausführung): https://kiro.dev/docs/specs/ · https://kiro.dev/blog/faster-smarter-specs/
- Spec Kit Tasks-Vorlage (`[P]`-Marker): https://www.mintlify.com/github/spec-kit/advanced/templates · https://www.mintlify.com/github/spec-kit/commands/tasks
- VS Code parallele Subagents: https://code.visualstudio.com/blogs/2026/02/05/multi-agent-development · https://code.visualstudio.com/docs/agents/concepts/agents
- Copilot-Chat vorbefüllen (`workbench.action.chat.open`, `isPartialQuery`): https://discuss.ai.google.dev/t/antigravity-built-in-command-for-sending-a-query-via-a-chat-to-the-model/120211 · https://forum.cursor.com/t/is-it-possible-to-submit-chat-programmatically/157654/3 · https://gh.r-mj.com/microsoft/vscode-copilot-chat/pull/3882
- Claude Code in VS Code (Befehle, URI-Handler, Vorbefüllen): https://code.claude.com/docs/en/vs-code · https://the-prompt-shelf.pages.dev/blog/claude-code-vscode-extension-complete-guide-2026 · https://claudeissues.com/issue/85313-vs-code-allow-claude-vscode-editor-open-to-submit-the-initial-prompt-not-just-pr
- Codex-Extension-Befehle: https://learn.chatgpt.com/docs/ide/commands/ · https://github.com/openai/codex/issues/7480
- Trello eingeklappte Listen: https://support.atlassian.com/trello/docs/collapse-or-expand-a-list/ · https://www.sendboard.com/blog/collapse-color-code-trello-lists
- FeatherSpec: `README.md` (⑤–⑧, „Work in parallel"), `.claude/rules/plans.md`, `.claude/rules/parallel-work.md`, `.claude/commands/sdd-plan.md` (Mode B)
