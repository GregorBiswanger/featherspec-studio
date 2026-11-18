# 08 · Übergabe an `/sdd-specify`: Nächste UX-Runde (Specs 0021–0024)

Stand 18.11.2026 · Basis: [07-implementation-review.md](07-implementation-review.md) (Befunde N-1…N-9, Konzept K-N, §6a) und Gregors Feedback vom 18.11. (Screenshot `screenshots-045b354/g01-gregor-tip-splitter-active.png`).

Dieses Dokument ist die Eingabe für je eine `/sdd-specify`-Sitzung pro Spec. Es nennt pro Spec Ziel, Umfang, Regeln, Texte, Entwürfe für Akzeptanzkriterien, betroffene Specs und PDs, offene Entscheidungen mit Empfehlung sowie Vorbedingungen. Die UI-Texte stehen auf Englisch (PD-016), alles andere auf Deutsch. Die Specs selbst werden nach `DocLanguage: English` geschrieben.

**Verbindlich für alle vier Specs:** `.claude/rules/ux-guidelines.md`. Abweichungen müssen die Leitlinie nennen (Regel der Datei). Neu ist Leitlinie 11 (Vorschlag in §6).

## 0. Reihenfolge, Vorbedingungen und Zuschnitt

| Spec | Titel (Vorschlag) | Deckt ab | Vorbedingung | Prio | Aufwand |
| --- | --- | --- | --- | --- | --- |
| **0021** | Next step with intent and guidance | N-1, R-16-Nacharbeit, „Copy prompt", Coach-Zeile, `(?)`-Infofeld | **V-1** Hands-On-Prüfung des NS-6-Wortlauts | P1 | M |
| **0022** | Layout and signal polish | N-2…N-9 | keine | P1 (N-2) / P2 | S–M |
| **0023** | Plan map: stages, parallel work, workers | K-N | 0021 (gemeinsame Prompt- und Copy-Bausteine) | P1 | M |
| **0024** | Send the next step to my assistant | §6a in 07 | **V-2** Spike je Assistent, **E-6** (PD-056) | P2 | M |

0021 und 0022 dürfen parallel spezifiziert werden; 0023 nach 0021; 0024 erst nach V-2 und E-6.

**Prozessregel für diese Runde** (Lehre aus 07 §7): Vor jedem `/sdd-plan` ein 10-Minuten-Klicktest mit Gregor auf einem Papier- oder HTML-Entwurf. Nach jeder Umsetzung die Vorschau in Dark, Light und HC bei 1600 px **und** 1000 px Fensterbreite mit offener Seitenleiste.

## 1. Vorbedingungen

### V-1 · NS-6-Wortlaut im Hands-On prüfen (vor 0021)

Ort: `C:\projects\test\tip-splitter` mit einem Plan, der mindestens einen erledigten und einen offenen Schritt hat.

| Test | Erwartung | Wenn nicht erfüllt |
| --- | --- | --- |
| Neuer Chat (Copilot und Claude Code), Eingabe `Implement T-003 of .specs/active/<x>.plan.md` | Agent liest Plan, gleicht Haken mit Code ab (`plans.md`: „Resuming after an interruption … bring those level first"), baut **genau** T-003 und stoppt | NS-6 bleibt `/sdd-plan` als Primärzeile, aber mit Absichtstext „Resume the plan: the agent reports where it stands" |
| Gleicher Chat nach abgeschlossenem T-002: `continue` | baut T-003 und stoppt | – |
| Neuer Chat: `/sdd-plan .specs/active/<x>.md` | Mode B: Bericht in drei Zeilen, wartet | – |

Ergebnis als Eintrag in `docs/product/product-decisions.md` (neue PD) festhalten.

### V-2 · Spike „Vorbefüllen ohne Absenden" (vor 0024)

Wegwerf-Extension oder Entwickler-Konsole, je Assistent in der Version auf Gregors Rechner:

| Assistent | Versuch | Erfolg heißt |
| --- | --- | --- |
| GitHub Copilot | `workbench.action.chat.newChat`, dann `workbench.action.chat.open` mit `{ query, isPartialQuery: true }` | neuer Chat, Text in der Eingabe, **nicht** gesendet |
| Claude Code | `claude-vscode.editor.open` mit `(undefined, prompt)`; alternativ URI `vscode://anthropic.claude-code/open?prompt=…` | neuer Tab, Text vorbefüllt, nicht gesendet |
| Codex | `chatgpt.newChat`; prüfen, ob ein Prompt-Argument wirkt | wahrscheinlich nur öffnen → Rückfall Zwischenablage |
| Codex + FeatherSpec | Prompt `/sdd-plan …` und `Run .claude/commands/sdd-plan.md for <spec>` | welcher Wortlaut den FeatherSpec-Befehl tatsächlich ausführt |

Ergebnis: Tabelle „Assistent × Befehl × Version × Ergebnis" in `docs/decisions/` (neue ADR oder PoC-Ordner wie `poc-copilot-2026-11-17`).

## 2. Spec 0021 · Next step with intent and guidance

### Ziel

Jeder nächste Schritt sagt **erst, was er bewirkt**, dann den Prompt. Der Knopf heißt „Copy prompt". Eine dezente Zeile und ein `(?)` sagen, in welcher Sitzung und mit welcher Modellklasse der Schritt gut läuft.

### Problem (Evidenz)

- Active-Spec mit Plan zeigt `Next /sdd-plan`. Gregor las das als „Plan erzeugen" [G, g01]. Die Zweitzeile „Then, in the same chat, if nothing blocks: continue" löst das nicht [07 N-1].
- „Copy" sagt nicht, was im Clipboard landet [G].
- FeatherSpec-Wissen über Sitzung und Modellwahl steht nur im README (⑦ `/sdd-compile` neue Sitzung, andere Modellfamilie; „The loop" Clarify liest „as a stranger would").

### Umfang

- In scope: Detail-Abschnitt „Next step", Kurzform auf Karte, Overview-Zeile, Baum-Tooltip, Statusleisten-Tooltip, Befehl „Copy Next Step" (nur Texte, kein neues Verhalten), Einstellungen `showStepTips` und `modelHints`.
- Out of scope: Senden an einen Assistenten (0024), Planansicht (0023), Änderung der Regelreihenfolge NS-1…NS-11 (bleibt), feste Modellnamen im Produkt.

### Regeln

**R-1 Absicht je Regel.** Jede NS-Regel bekommt eine Absichtsüberschrift (`intent`), eine Wirkung in einem Satz (`effect`, nur im Infofeld), einen Sitzungshinweis (`session`) und eine Modellklasse (`model`). Die Prompt-Zeilen bleiben die von `nextStep()`, außer NS-6 (R-2).

| Regel | intent (sichtbar) | Prompt(s) | session | model | effect (Infofeld) |
| --- | --- | --- | --- | --- | --- |
| NS-1 | — (Text bleibt) | — | — | — | — |
| NS-2 | Put folder and status back in line | `/sdd-lifecycle <spec>` | any chat | fast | The agent checks folder, status and plan link and proposes the move. |
| NS-11 | — (Text bleibt) | — | — | — | — |
| NS-3 | — („Done — no FeatherSpec step left.") | — | — | — | — |
| NS-4 | Find out what blocks | `/sdd-plan <spec>` oder `/sdd-overview` | any chat | strong | The agent reads plan and return notes and reports what blocks. |
| NS-5 | Have the result verified | `/sdd-compile <spec>`; then: Close the spec · `/sdd-lifecycle <spec>` | **new chat** | strong, **other model family** than the one that implemented | A fresh reviewer checks every criterion with evidence. Close only after a READY verdict. |
| NS-6 | Continue with `<ID>` `<Kurztitel>` | primär `Implement <ID> of <plan>` (nach V-1); zweitens „Not sure where it stands? Let the agent report first" · `/sdd-plan <spec>` | same chat or new chat | fast | The agent builds one step, runs its check, ticks it and stops. |
| NS-6 (kein offener Schritt) | Let the agent report where the plan stands | `/sdd-plan <spec>` | any chat | fast | The plan is resumed, not rewritten. |
| NS-7 | Start implementing: `<ID>` `<Kurztitel>` | `Start <ID> of <plan>` | any chat | fast | Moves the spec to active and builds the first step. |
| NS-8 | Add acceptance criteria | `/sdd-specify <spec>` | any chat | strong | The agent revises the spec with you. |
| NS-9 | Have the spec challenged; then plan it | `/sdd-clarify <spec>`; then: Write the plan · `/sdd-plan <spec>` | **new chat** (clarify) | strong | A fresh reader looks for gaps and contradictions. |
| NS-10 | Write the plan | `/sdd-plan <spec>` | any chat | **strong**, **allow web search** | The agent researches and writes baby steps. You read the plan before starting. |
| Up next leer | Write the next spec | `/sdd-specify` | any chat | strong | — |

Die Spalten `intent`, `session`, `model` und `effect` sind ein Vorschlag. Gregor bestätigt sie im Klicktest. Quellen sind FeatherSpec-README (⑤–⑧, „The loop") und die Modellwahl der Studio-Runden (Status 16.11.: Plan mit Opus und Websuche, Umsetzung mit Sonnet, Compile mit Opus).

**R-2 NS-6 neu** (abhängig von V-1): Bei Active mit offenem Schritt ist die Primärzeile `Implement <ID> of <plan path>`. `/sdd-plan <spec path>` wird die Zweitzeile mit eigener Absicht. Bestehen V-1-Tests nicht, bleibt `/sdd-plan` primär, mit der Absicht „Resume the plan: the agent reports where it stands".

**R-3 Kurzform** (Karte, Overview, Baum): Absicht vor Befehl, gekürzt wird der Titel, nie der Befehl. Beispiele: `Continue T-003 · Implement T-003` · `Verify · /sdd-compile` · `Plan · /sdd-plan`. Tooltip = volle Zeile(n) mit Absicht.

**R-4 Knopf.** Beschriftung „Copy prompt". Bestätigung am Knopf: „Copied" für 2 s (bestehendes Verhalten aus 0016/PD-063 (7)). `aria-label`: „Copy prompt: <volle Zeile>".

**R-5 Coach-Zeile.** Unter dem Knopf im Detail eine graue Zeile `<session> · <model>`, z. B. `new chat · strong model, other family`. Nur im Detail und in der ersten „Now"-Zeile, nicht auf Karten oder im Baum.

**R-6 Infofeld `(?)`.** Ein Knopf mit `?`-Codicon neben der Überschrift „Next step". Klick oder Enter öffnet ein Toggletip (kein reines Hover): Wirkung (`effect`), was danach passiert, Sitzung, Modellklasse mit Begründung, „Where to switch the model" (allgemein formuliert). Esc schließt, Fokus kehrt zurück. Der Inhalt wird per `aria-live` angesagt.

**R-7 Einstellungen** (erste `contributes.configuration` der Extension):
- `featherspec-studio.showStepTips` (boolean, Standard `true`): blendet Coach-Zeile und `(?)` aus.
- `featherspec-studio.modelHints` (object, Standard `{}`): optionale Namen je Klasse, z. B. `{ "strong": "Opus 5.5", "fast": "Sonnet 5.5" }`. Ist eine Klasse gesetzt, zeigt die Coach-Zeile den Namen in Klammern. Im Produkt stehen keine Modellnamen.

### Akzeptanzkriterien (Entwurf)

- **AC-001** Für jede NS-Regel mit Prompt zeigt das Detail die Absichtsüberschrift aus R-1 über dem Prompt; die Texte stehen im Textmodul und werden wörtlich getestet (Leitlinie 10).
- **AC-002** Für eine Active-Spec mit offenem Schritt T-00n zeigt das Detail als erste Zeile „Continue with T-00n <Kurztitel>" und den Prompt aus R-2 (nach V-1-Entscheidung), als zweite Zeile die Absicht „Not sure where it stands? Let the agent report first" mit `/sdd-plan <spec path>`.
- **AC-003** Kein sichtbarer Knopftext lautet nur „Copy"; jeder lautet „Copy prompt".
- **AC-004** Karte, Overview-Zeile und Baumzeile zeigen die Kurzform aus R-3; bei 300 px Sidebarbreite ist der Befehl der Baumzeile ungekürzt sichtbar (zusammen mit 0022 N-3).
- **AC-005** Coach-Zeile und `(?)` erscheinen nur im Detail und in der ersten „Now"-Zeile; mit `showStepTips: false` erscheint keines von beiden.
- **AC-006** `(?)` öffnet per Klick, Enter und Leertaste, schließt per Esc und Klick außerhalb; Fokus kehrt auf den `(?)`-Knopf zurück; der Inhalt ist per Screenreader erreichbar.
- **AC-007** Mit `modelHints.strong = "X"` zeigt die Coach-Zeile bei NS-5 `new chat · strong model (X), other family`; ohne Einstellung steht kein Modellname im UI (Scan-Test über Textmodule).
- **AC-008** Vorher grüne Tests zu `nextStep()` bleiben grün oder sind im Testtitel-Abgleich begründet ersetzt.
- **AC-009** *(manuell, Gregor)* Klicktest auf `tip-splitter`: Für jede Spec-Lage kann Gregor ohne Rückfrage sagen, was der kopierte Prompt bewirkt.

### Betroffene Specs, PDs, Dateien

- Ändert: 0015 §6.1 (NS-6-Zeile), 0017 §6.1/§6.2/§7 (Kurzform, NS-6, Texte), PD-061 (1), PD-063 (7) (Knopftext). Leitlinie 1 („one action: Copy") → „Copy prompt".
- Dateien: `src/core/board/nextStep.ts`, `src/shared/protocol/nextStepTexts.ts`, `src/shared/protocol/detail.ts`, `src/webview/detail/NextStep.tsx`, Karte/Overview/Baum-Projektionen, `package.json` (configuration), Tests.

### Offene Entscheidungen

| ID | Frage | Empfehlung |
| --- | --- | --- |
| E-1 | NS-6 primär `Implement <ID> of <plan>` oder `/sdd-plan`? | nach V-1; Empfehlung `Implement …` |
| E-2 | Coach-Zeile auch auf Karten? | nein (Überladung); nur Detail + erste „Now"-Zeile |
| E-3 | Modellklassen-Wording | „strong model", „fast model", „other model family" |

## 3. Spec 0022 · Layout and signal polish

### Ziel

Die Befunde N-2…N-9 aus 07 beheben, ohne neue Funktion.

| Befund | Regel (Vorschlag) | Akzeptanzkriterium (Entwurf) |
| --- | --- | --- |
| **N-2** Overview unter Schublade bricht Wörter (`n16`) | Overview-Liste ist ein CSS-Container (`container-type: inline-size`); unter 420 px Inhaltsbreite stapelt die Zeile: Nummer + Titel (voll), dann Zustand, dann Schritt + Knopf. `overflow-wrap: anywhere` nur für Pfade und Befehle, Titel brechen nur an Wortgrenzen. | Bei Fenster 1000 × 800 mit offener Seitenleiste ist kein Wort eines Titels getrennt; jeder Copy-Knopf ist sichtbar (WCAG 2.4.11). Vorschau-Screenshot Dark/Light/HC. |
| **N-3** Baum kürzt den Schritt (`n02`) | TreeItem-`description` = nur Kurzform des Schritts; Zustand steht im Symbol, in der Gruppe, im Tooltip und im `aria-label` | Bei 300 px Sidebar ist der Befehl jeder Zeile vollständig sichtbar (manuell + Modelltest der description) |
| **N-4** Problem in eingeklappter Gruppe unsichtbar (`n08`) | Gruppe und Board-Streifen mit Problem tragen „· n problem(s)" und Warnsymbol; Tooltip/aria-label nennen es | Mit Problem-Spec in „Done" zeigen eingeklappte Done-Gruppe und Done-Streifen den Hinweis |
| **N-5** „Up next" doppeldeutig (`n05`, `n07`) | Entscheidung E-4 | gleiche Bezeichnung = gleiche Menge an allen Orten (Test) |
| **N-6** zu viele Primärknöpfe (`n04`, `n06`) | Primär nur im Detail und in der ersten „Now"-Zeile; sonst Sekundärknopf oder Symbolknopf `$(copy)` mit Tooltip | Auf keinem Bildschirm mehr als zwei Primärknöpfe (Komponententest zählt Klassen) |
| **N-7** Problemtext technisch/abgeschnitten (`n19`) | Problemtexte als Nutzersatz mit Folge, z. B. „Done, but its plan was never archived"; Problemzeilen umbrechen statt abschneiden | Kein Problemtext enthält `done/`, `Plan line` o. ä. (Scan); kein `text-overflow: ellipsis` in Problemzeilen |
| **N-8** Pfad bricht mitten im Wort (`n04`) | Pfade umbrechen nur an `/`, `-`, `.` (`<wbr>` nach Trennzeichen) | Pfad im Detail bricht nur nach Trennzeichen |
| **N-9** Wand gleicher Zeilen in „Now" | Optional: Ab 4 Specs mit gleichem Schritt eine Sammelzeile „7 specs wait for /sdd-compile" mit Aufklappen | E-5 |

### Offene Entscheidungen

| ID | Frage | Empfehlung |
| --- | --- | --- |
| E-4 | „Up next" angleichen: Baum-Gruppe in „Ready" umbenennen **oder** Overview-„Up next" nur Ready + eigener Abschnitt „Backlog"? | Baum-Gruppe „Ready" nennen (kleinster Eingriff); Overview behält „Up next" mit Untertitel „Ready first, then backlog" |
| E-5 | N-9 bauen? | erst nach Klicktest; niedrige Priorität |
| E-7 | N-2: Container Query (Empfehlung) oder Schublade als Overlay mit Abdunklung? | Container Query; PD-066 als „ergänzt" markieren |

Betroffen: 0018 (Overview-Zeilen, PD-065 (5)), 0019 (PD-066), 0020 (Baumzeile, Gruppen), 0016 (Problemtexte, T-Texte). Dateien: `main.css`, Overview-Komponenten, `specTree.ts`, Board-Streifen, Textmodule.

## 4. Spec 0023 · Plan map: stages, parallel work, workers

### Ziel

Den Aufbau eines Plans sichtbar machen: Stufen, was parallel laufen kann und warum, wie man es anstößt, und was parallele Worker zurückgemeldet haben. So muss man dafür die Markdown-Datei nicht mehr lesen [G].

### Datenbasis (vorhanden, Evidenz [C])

| Information | Quelle im Parser |
| --- | --- |
| Stufen mit Nummer, Schritt-IDs, Art `single/sequential/parallel/mixed`, Zeile | `src/core/specs/parsePlan.ts` (`PlanStage`) |
| Schlusszeile `Parallel: …` / `No parallel stage: …` inkl. Empfehlung und Begründung, Zeile | `parsePlan.ts` (`StagesClosing`, `raw`) |
| Je Schritt: ID, Titel, Zeile, `ticked`, `struck`, `files`, `covers`/`coveredCriteria`, `verify` | `src/core/specs/planSteps.ts` (`PlanStep`) |
| Return Notes paralleler Worker (`.memory-bank/activeContext.<spec>-<T>.md`, `Status: DONE/BLOCKED`) | `src/core/specs/returnNote.ts` |

Neu nötig ist nur die Projektion (Core) und die Darstellung (Webview). Der Parser bleibt.

### Umfang

- In scope: Abschnitt „Plan" in der Detail-Seitenleiste (kompakt), Tab „Plan" im Panel (vollständig, für die gewählte Spec), Prompts zum Anstoßen, Worker-Status aus Return Notes, „Why not parallel?".
- Out of scope: Agenten starten oder steuern (PD-055), Stufen neu schneiden oder berechnen (das bleibt Sache von `/sdd-plan`), Bearbeiten des Plans.

### Regeln

- **P-1 Kompakt im Detail:** unter „Next step" eine Zeile pro Stufe: Nummer, Schritt-Chips (`✓` erledigt, `◐` nächster, `○` offen, ~~gestrichen~~), `‖` zwischen parallelen Chips, Hinweis „⇉ can run in parallel" bei `parallel`/`mixed`. Kopfzeile: „<done> of <total> done · plan recommends: <Empfehlung aus Schlusszeile>". Link „Open plan map".
- **P-2 Tab „Plan":** dritter Tab, nur aktiv, wenn eine Spec mit Plan gewählt ist; sonst Leerzustand „Select a spec with a plan". Pro Stufe eine Zeile, parallele Schritte nebeneinander als Karten mit Titel, `Files`, `Covers`, Zustand. Klick auf Karte zeigt Details der Karte (Do/Verify gekürzt), „Open in file" öffnet die Datei an der Zeile daneben.
- **P-3 Empfehlung des Plans zuerst:** Die Schlusszeile erscheint wörtlich als „The plan says: …" über den Optionen. Das Studio bewertet nicht selbst.
- **P-4 Drei Wege** (nur bei Stufen mit `‖` und offenen Schritten), Texte nach `plans.md`:
  - *In sequence* — „Implement the whole stage <n> of <plan path>" [Copy prompt]
  - *Subagents* — „Implement stage <n> of <plan path> with subagents" [Copy prompt], Hinweis „You confirm the stage's tests first; subagents cannot ask you."
  - *Other agents* — je Schritt `Implement <ID> of <plan path> as a parallel worker.` (exakter FeatherSpec-Wortlaut aus `parallel-work.md`) [Copy prompt] je Zeile, Hinweis „Commit first: a worktree holds committed files only."
  Der Wortlaut der ersten beiden Prompts ist Hypothese → Prüfung im Hands-On (E-8).
- **P-5 Worker-Status:** Existiert `activeContext.<spec>-<ID>.md`, zeigt die Schrittkarte „returned · DONE" oder „returned · BLOCKED: <Blocked on>". Sind alle Worker einer Stufe zurück, nennt die Stufe den nächsten Schritt „Integrate the returned steps" mit Prompt (Wortlaut E-8).
- **P-6 Why not parallel?:** Bei `sequential`-Stufen und Schlusszeile `No parallel stage:` steht die Begründung aufklappbar. Optional: gemeinsame Dateien zweier Schritte aus `Files:` markieren.
- **P-7 Pläne ohne `## Stages`:** einfache Schrittliste ohne Wege-Block.
- **P-8 Kein Plan:** Abschnitt fehlt; Next step bleibt `/sdd-plan`.

### Akzeptanzkriterien (Entwurf)

- **AC-001** Für einen Plan mit `## Stages` zeigt das Detail eine Zeile je Stufe mit den Schritt-IDs in Planreihenfolge, `‖` zwischen parallelen Schritten und dem Zustand je Schritt; Fixture mit `single`, `sequential`, `parallel`, `mixed`.
- **AC-002** Die Kopfzeile zitiert die Empfehlung der Schlusszeile wörtlich; ohne Schlusszeile steht keine Empfehlung.
- **AC-003** Nur Stufen mit `‖` und mindestens einem offenen Schritt zeigen die drei Wege; „Other agents" bietet genau eine Zeile `Implement <ID> of <plan path> as a parallel worker.` je offenem Schritt der Stufe.
- **AC-004** Erscheint eine Return Note `activeContext.<spec>-<ID>.md` mit `Status: DONE`, zeigt die Schrittkarte innerhalb von 500 ms „returned · DONE" (PD-047-Budget); bei `BLOCKED` den Grund.
- **AC-005** Tab „Plan" ist ohne gewählte Spec mit Plan im Leerzustand; Wechsel der Auswahl im Baum aktualisiert den Tab.
- **AC-006** Jede Schritt-ID und „Open in file" öffnen die Planzeile in einer zweiten Editor-Gruppe.
- **AC-007** Tastatur: Stufen und Karten per Pfeiltasten erreichbar, Fokus sichtbar in Dark/Light/HC.
- **AC-008** Das Studio schreibt keine Datei und startet keinen Prozess (bestehender No-Write-Test erweitert).
- **AC-009** *(manuell, Gregor)* Auf `tip-splitter` kann Gregor ohne die Markdown-Datei sagen, welche Stufen parallel laufen könnten, warum oder warum nicht, und den passenden Prompt kopieren.

### Betroffene Specs, PDs

- 0020 und PD-058 (zwei Tabs → drei Tabs; Leitlinie 4 „webview for overview and board" → „…, board and plan map"), 0019 (Detail-Abschnitte), Leitlinie 5 bleibt: Volltext von Do/Verify nur gekürzt.

### Offene Entscheidungen

| ID | Frage | Empfehlung |
| --- | --- | --- |
| E-8 | Wortlaut „Implement the whole stage <n> of <plan>", „… with subagents", „Integrate the returned steps" | im Hands-On prüfen (wie V-1); bei Abweichung FeatherSpecs Formulierung übernehmen. Ggf. FeatherSpec selbst um eine feste Formulierung ergänzen (eigenes FeatherSpec-Update) |
| E-9 | Dritter Tab oder nur Detail-Abschnitt? | beides: kompakt im Detail, voll im Tab |
| E-10 | Parallel-Wege anzeigen, wenn der Plan „in sequence" empfiehlt? | ja, aber eingeklappt mit Empfehlung oben |

## 5. Spec 0024 · Send the next step to my assistant

Erst nach V-2 und E-6 spezifizieren.

### Ziel

Statt „Copy prompt" ein „Send to <Assistent>", das den Chat des gewählten Assistenten öffnet und **nur vorbefüllt**. Sitzung, Modell und Absenden entscheidet der Mensch [G].

### Regeln (Entwurf)

- **S-1 Einstellung** `featherspec-studio.assistant`: `"clipboard" | "copilot" | "claudeCode" | "codex"`, Standard `"clipboard"`. Beim ersten Klick einmalig Quick Pick mit den installierten Assistenten (`vscode.extensions.getExtension`: `GitHub.copilot-chat`, `anthropic.claude-code`, `openai.chatgpt`) plus „Just copy". Änderbar über Zahnrad in der Baum-Werkzeugleiste.
- **S-2 Geteilter Knopf** im Detail und in der ersten „Now"-Zeile: Hauptaktion „Send to <Name>", Menü: „Send to a new chat", „Send to the current chat", „Copy prompt". Standard nach `session` aus 0021 (new chat bei NS-5, NS-9; sonst current chat).
- **S-3 Nie absenden.** Kein Befehl, der den Prompt abschickt.
- **S-4 Adapter mit Rückfall.** Pro Assistent ein Adapter (Ergebnis V-2). Fehlt der Befehl oder scheitert er: kopieren, Chat des Assistenten öffnen, Meldung „Prompt copied — paste it with Ctrl+V".
- **S-5 Prompt-Wortlaut je Assistent.** Für Assistenten ohne FeatherSpec-Befehls-Loader (Codex laut V-2) wird der Prompt umformuliert (z. B. „Run `.claude/commands/sdd-plan.md` for <spec>"). Die Logik gehört in den Core, getestet je Regel.
- **S-6 Neutralität:** keine Voreinstellung auf einen Anbieter; „Just copy" bleibt immer im Menü.

### Akzeptanzkriterien (Entwurf)

- **AC-001** Mit `assistant = "copilot"` öffnet „Send to a new chat" einen neuen Copilot-Chat mit dem Prompt in der Eingabe, ohne ihn zu senden (Host-Test mit Befehls-Stub + manuelle Prüfung).
- **AC-002** Ist der Adapterbefehl nicht registriert, landet der Prompt in der Zwischenablage, der Chat öffnet sich, die Meldung nennt Ctrl+V.
- **AC-003** Kein Codepfad ruft einen Absende-Befehl auf (Scan-Test auf `submit`/`send`-Befehls-IDs).
- **AC-004** Mit `assistant = "codex"` nutzt der Prompt den in V-2 bestätigten Wortlaut.
- **AC-005** *(manuell)* Je Assistent auf Gregors Rechner: neuer Chat, vorbefüllt, nicht gesendet; Release-Checkliste bekommt die Zeile pro Assistent.

### Offene Entscheidungen

| ID | Frage | Empfehlung |
| --- | --- | --- |
| **E-6** | PD-056 sagt „the Studio opens no chat". Ersetzen durch „the Studio may open the user's chosen assistant and prefill, never send"? | **Gregor entscheidet.** Empfehlung: ja, mit S-3 und S-6 als harte Regeln |
| E-11 | Codex ohne verlässliches Vorbefüllen anbieten? | ja, als „Copy & open Codex" mit Ctrl+V-Hinweis |
| E-12 | Assistent pro Workspace oder global? | global (User-Setting), überschreibbar pro Workspace |

## 6. Ergänzungen an der UX-Regel (`.claude/rules/ux-guidelines.md`)

Vorschlag, mit 0021 einzuführen:

- Leitlinie 1 neu: „**Next step first, intent before command.** Every surface that shows a spec answers *what will happen next* in words, then the prompt, with one action: **Copy prompt** (or Send, 0024)."
- Leitlinie 8 ergänzt: „At most two primary buttons per view."
- **Leitlinie 11 neu:** „**Guide, don't crowd.** Session and model advice appears once per view (detail, first Now row), in classes, never as product-bundled model names; the full reasoning sits behind a `(?)` toggletip that keyboard users reach."
- **Leitlinie 12 neu:** „**Check at narrow width.** Every layout change is previewed at 1000 px window width with the side panel open; containers adapt to their own width, not the viewport."

## 7. Was nicht in diese Runde gehört

- Phasenleiste (R-19), Diagnostics im Problems-Panel (R-20), CodeLens (R-21), Aktivität aus Git (R-22): weiter zurückgestellt (PD-061 (2)). Die Plan-Map (0023) deckt den wichtigsten Teil des Planverständnisses ab; CodeLens danach erneut prüfen.
- FeatherSpec-seitige Änderungen (z. B. feste Formulierung für „whole stage with subagents", Codex-Loader): eigener Branch im FeatherSpec-Repo nach der Releasing-Anleitung, nicht Teil der Studio-Specs.

## 8. Checkliste für die `/sdd-specify`-Sitzung

1. Diese Datei, 07 und `.claude/rules/ux-guidelines.md` lesen.
2. Für 0021: V-1-Ergebnis abwarten oder R-2 als Annahme mit beiden Varianten spezifizieren.
3. Betroffene Specs aus den Abschnitten „Betroffene Specs" mit „*Amended by 0021…*"-Notizen versehen (wie 0016–0020).
4. Offene Entscheidungen E-1…E-12 als Open Points in die Spec; E-6 nur mit Gregor.
5. Je Spec ein manuelles AC für Gregors Klicktest.
