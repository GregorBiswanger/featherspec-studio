# 09 · Bewertung von Runde 2 (Specs 0021–0024) und Übergabe für Runde 3

Stand `48d1968` (Merge PR #1, VSIX `783b067`) · 19.11.2026 · Evidenz-Kürzel wie in [01](01-product-understanding.md): **[B]** beobachtet · **[I]** Interaktion · **[T]** Test · **[C]** Code · **[S]** Spec · **[H]** Hypothese · **[G]** Gregor (Bericht „Runde 2" und Screenshots vom 19.11.)

Screenshots: `screenshots-48d1968/` (Präfix `r…`, Gregors Bilder `g-r2-…`).

## 1. Vorgehen

1. Bericht „Runde 2" gelesen, dazu Projektstatus 19.11., PD-068…PD-077 und die Specs 0021–0024. [S]
2. Das VSIX `783b067` habe ich in derselben isolierten Umgebung wie in 02 und 07 bedient (code-server 4.145.2 = VS Code 1.145.2). `engines.vscode` war dafür nur in einer temporären Kopie auf `^1.145.0` gesetzt. Workspaces:
   - die echten 24 Specs des Studio-Repos,
   - `fs170-brownfield-mixed` (mit einem Problem in Done),
   - `fs110-parallel-synthetic` in zwei Fassungen, ohne Return Notes und mit (T-003 DONE, T-004 BLOCKED),
   - eine aktive Spec aus `fs110-ready-synthetic`.

   Geprüft habe ich in Dark und High Contrast bei 1600 × 1000 und 1000 × 800. [B][I]
3. Jeden Punkt aus 08 und jede Frage aus dem Bericht beantwortet (§3, §4); Gregors zwei Rückmeldungen ausgearbeitet (§5); V3 aus UX-Sicht beurteilt (§6); Übergabe für Runde 3 (§8).

**Nicht geprüft:** Senden an Copilot und Claude Code. In code-server sind beide Erweiterungen nicht installierbar. Gregor hat das Senden im echten Fenster geprüft („Funktioniert bei mir alles"). Ebenfalls nicht geprüft: Windows-Desktop, Screenreader, Restricted Mode.

## 2. Gesamturteil

**Runde 2 ist eine deutliche Verbesserung und handwerklich wieder stark.** Alle Punkte aus 08 sind umgesetzt oder begründet anders entschieden. Neu ist auch der Prozess: Vor jedem Plan gab es einen Klicktest mit Gregor (PD-073, PD-076). Damit ist die wichtigste Lehre aus 07 §7 umgesetzt.

Am stärksten:
- **Plan map:** Stufen, `‖`, die Begründung des Plans, die drei Wege und die Rückmeldungen der Worker sind ohne Markdown-Datei verständlich. [I r03, r05, r06]
- **Schmale Breite:** Unter 900 px wechselt die Ansicht sauber zwischen Liste und Detail. „Back to Overview" gibt den Fokus an die Zeile zurück. [I r08]
- **Nächster Schritt mit Absicht:** „Continue with T-003 Add" mit `Implement T-003 of …`, darunter „Not sure where it stands?" mit `/sdd-plan`. Der Fehler aus Gregors Screenshot g01 ist behoben. [B r02][G]
- **Ruhigere Oberfläche:** Listen haben Symbolknöpfe, Problems stehen als Sätze („Done, but its plan was never archived"), und die Done-Gruppe zeigt „· 1 problem". [B r07]

Was bleibt, sind vor allem **Navigationslücken in der neuen Plan map**, auf die Gregor als Erster gestoßen ist (§5), **widersprüchliche Signale bei zurückgemeldeten Stufen** (§4) und **ein Datenverlust-Risiko beim Senden in den aktuellen Copilot-Chat** (§3, OP-004).

## 3. Abgleich mit dem Arbeitsauftrag 08

| Punkt | Ergebnis | Urteil | Evidenz |
| --- | --- | --- | --- |
| V-1 NS-6 | Variante A trotz einer Lücke (nach Unterbrechung gleicht nur `/sdd-plan` ab) | **vertretbar**, siehe G-11 | [S PD-072][B r02] |
| V-2 Vorbefüllen | Copilot und Claude Code ja, Codex nein | erfüllt | [S PD-074] |
| N-1 Absicht | Absichtszeile, „Copy prompt", Coach-Zeile, `(?)` | erfüllt | [B r02] |
| N-2 Wörter brechen | Container Queries + Liste/Detail unter 900 px | **erfüllt, besser als vorgeschlagen** | [B r07, r08] |
| N-3 Baum | Beschreibung nur Schritt | erfüllt; bei Sidebar < 300 px kürzt der Baum trotzdem („/sdd-cla…") | [B r07] |
| N-4 Problem in Gruppe | „Done 2 · 1 problem" mit Warnsymbol | erfüllt | [B r07] |
| N-5 Up next | Baum „Ready", Overview „Up next · Ready first, then backlog" | erfüllt | [B r07] |
| N-6 Primärknöpfe | Symbolknöpfe in Listen, max. zwei primär | erfüllt | [B r07] |
| N-7 Problemtexte | Nutzersätze, umbrechend | erfüllt | [B r07] |
| N-8 Pfade | Umbruch nach Trennzeichen | erfüllt | [B r08] |
| N-9 Now-Wand | nicht gebaut | siehe G-9 | [S PD-071] |
| K-N Plan map | Tab, Seitenleisten-Abschnitt, Wege, Rückmeldungen | erfüllt, Lücken in §4/§5 | [I r03–r06] |
| §6a Senden | geteilter Knopf, nur vorbefüllen | erfüllt (nicht selbst getestet) | [G][S] |
| §6 Leitlinien 1, 8, 11, 12 | übernommen, Regel lädt auch für `.specs/**` | erfüllt | [S] |
| Prozess | Klicktests vor dem Plan, Vorschau bei 1000 px | **erfüllt** | [S PD-073, PD-076] |

### Urteil zu den acht Abweichungen (Bericht, Abschnitt „Abweichungen")

| Thema | Urteil | Begründung |
| --- | --- | --- |
| N-9 nicht gebaut | **einverstanden, aber kleine Lösung nachziehen** | Mit Symbolknöpfen ist die Wand ruhiger. Bei 11 gleichen Zeilen fehlt trotzdem Überblick → G-9: „Now" wie „Up next" auf 5 Zeilen begrenzen, „+ n more" |
| E-11 Codex nur Copy prompt | **einverstanden** | Ein Knopf, der nur einen leeren Chat öffnet, verspricht mehr, als er hält (Leitlinie 2) |
| Standard `none` | **einverstanden** | Kein Quick Pick beim ersten Klick: weniger Unterbrechung; die Einstellung ist über das Zahnrad auffindbar |
| OP-004 Copilot aktueller Chat | **ändern: neuer Chat als Standard (P1)** | Der VS-Code-Quelltext bestätigt: `preserveInput` ist die einzige Option, die einen Entwurf stehen lässt, aber sie sendet ab und verträgt sich nicht mit `attachFiles`. Damit überschreibt „aktueller Chat" einen ungesendeten Entwurf des Nutzers = Datenverlust. `Implement T-00x of <plan>` funktioniert laut V-1 auch im neuen Chat. „Aktueller Chat" bleibt im Menü |
| „other family" | **einverstanden** | Der Toggletip erklärt es |
| „same chat" / „current chat" | **ein Wort: „current chat"** | Es ist VS Codes eigener Begriff im Chat-Menü. Coach-Zeile: `current or new chat · fast model`; Menü: „Send to the current chat" |
| R-3 im Baum nur Befehl | **einverstanden** | Der Platz reicht nicht; die Absicht steht im Tooltip |
| PD-077 Fokus bleibt am Platz | **einverstanden** | Das entspricht dem WAI-Muster für entfernte Listeneinträge |

## 4. Antworten auf „Worauf besonders achten" und neue Befunde

| ID | Befund | Antwort / Vorschlag | Prio | Evidenz |
| --- | --- | --- | --- | --- |
| **G-1** | **`◐` für den nächsten Schritt** ist in VS Codes Standardschrift unter Linux nur ein schmaler Strich. In Gregors Windows-Fenster ist das Zeichen erkennbar, aber kleiner als `✓` und `○` | Statt Unicode-Zeichen **Codicons** wie bei den Zuständen: erledigt `check`, nächster `debug-stackframe` oder `arrow-small-right` (gefüllt, Akzentfarbe), offen `circle-large-outline`, zurückgemeldet `reply`, blockiert `circle-slash`. Unabhängig von der Schrift und in jedem Theme gleich | P2 | [B r02, r11][G g-r2-01] |
| **G-2** | **„Next open step: T-003" nach Rückmeldung** — verwirrend. Die Map sagt „All steps returned: the next step integrates them", der nächste Schritt (T-004 blockiert) „Find out what blocks", Progress „Next open step: T-003" | Eine Aussage, an allen drei Orten gleich: Progress „2 of 5 done · 2 returned, waiting to be integrated". Den Satz in der Map aus dem nächsten Schritt ableiten: Ist einer blockiert, heißt es „T-004 returned blocked: the next step finds out what blocks" | P2 | [I r06] |
| **G-3** | **Lange „Ways"** (≈ 400 px bei 1600, mehr bei 1000) | Ja, zu viel für den Moment (Leitlinie 11). Kompakt: drei Zeilen „In sequence · Subagents · Other agents" mit je einem Satz, der vom Plan empfohlene Weg vorausgewählt und hervorgehoben. Die erklärenden Absätze kommen ins `(?)`. **Doppelung entfernen:** „Other agents" hat einen Stufen-Prompt *und* zwei Startzeilen. Die Startzeilen reichen; der Hinweis „commit first" bleibt | P2 | [B r05] |
| **G-4** | **Board bei 1000 px mit Seitenleiste** | Bei 1000 px Fenster greift ohnehin die Liste/Detail-Regel. Die Lage tritt erst bei ca. 1100–1300 px auf; nicht geprüft. Seitliches Scrollen ist für ein Board akzeptabel, solange die gewählte Karte sichtbar bleibt | — | [I r08] |
| **G-5** | **Zwei Coach-Zeilen** gleichzeitig (Overview erste Now-Zeile + Detail derselben Spec) | Ja, doppelt. Zeigt das Detail dieselbe Spec, entfällt die Coach-Zeile der Now-Zeile | P3 | [B r02] |
| **G-6** | **Send-Menü überdeckt Zeile** | nicht geprüft (kein Assistent in code-server). Ein Menü, das überdeckt, ist üblich, solange Escape schließt und der Fokus zurückkehrt | — | — |
| **G-7** | **Parallele Stufe im nächsten Schritt unsichtbar.** Steht Stufe 2 mit `‖` an, sagt der nächste Schritt nur „Continue with T-003 Add" | Dritte Zeile unter dem Schritt: „Stage 2 can run in parallel · Ways to run it" (Link öffnet die Plan map mit aufgeklappten Wegen) | P2 | [B r02] |
| **G-8** | **Kurzformen klingen holprig und weichen ab.** Overview „Next Continue · Implement T-003", „Next Unblock · /sdd-plan" vs. Detail „Find out what blocks" | Ein Wortschatz: die Kurzform ist das erste Wort der Absicht, z. B. `Continue · Implement T-003`, `Find blocker · /sdd-plan`. „Next" vor der Kurzform weglassen, weil die Spaltenposition es schon sagt | P3 | [I r01, r06] |
| **G-9** | **Now-Wand** (N-9) | „Now" zeigt höchstens 5 Zeilen (Blocked, dann älteste Review zuerst), dann „+ n more" → Board-Filter, wie bei „Up next" | P3 | [S] |
| **G-10** | **Aufgeklappte Karte streckt die Nachbarkarte** auf gleiche Höhe mit Leerraum | `align-items: start` in der Kartenzeile | P3 | [B r05] |
| **G-11** | **NS-6 nach Unterbrechung.** V-1 zeigte: `Implement T-00x` gleicht die Haken nach einer Unterbrechung nicht ab, `/sdd-plan` schon. Der Nutzer muss selbst erkennen, ob er unterbrochen wurde | Das Studio kann Hinweise erkennen: **`Current step` im Plan ≠ erster offener Schritt**, oder eine **Return Note** liegt vor. Dann wird `/sdd-plan` die erste Zeile („Let the agent report first — the plan and the ticks may differ"), sonst Variante A. Daten liegen im Parser vor (`PlanHandoff`, Return Notes). Langfristig gehört der Abgleich in FeatherSpec selbst (DevEx-Bericht §13, Punkt 2) | P2 | [S PD-072][C] |

## 5. Gregors Rückmeldungen

### F-1 · Klick auf einen Schritt soll in die Plan map führen, nicht in die Markdown-Datei — **P1**

**Beobachtung:** Im Abschnitt „Plan" der Seitenleiste öffnet ein Klick auf `T-006` die Plan-Datei an der Zeile (Tooltip „Open 0001-tip-splitter.plan.md at line 213"). Dasselbe gilt für „Next open step: T-003". [G g-r2-01][I r12]

**Bewertung:** Gregor hat recht. Seit es die Plan map gibt, ist sie das bessere Ziel. Sie zeigt den Schritt im Zusammenhang (Stufe, parallel oder nicht) und die aufgeklappte Karte hat schon `Do`, `Verify`, `Files`, `Covers` und „Open in plan" [I r05]. Leitlinie 5 („Do not duplicate the editor") spricht nicht dagegen, denn die Karte zeigt den Zustand, nicht den Volltext. Das Muster kennt man aus VS Code: **Klick navigiert in der Oberfläche, die Quelle ist eine eigene, ausdrückliche Aktion.**

**Vorschlag:**

1. **Ein Schritt-Link führt in die Plan map.** Die Plan map wird mit Ziel `{ spec, step }` geöffnet: Tab „Plan map", Karte des Schritts aufgeklappt, ins Bild gescrollt, Fokus darauf und für 1,5 s hervorgehoben (Rahmen in `focusBorder`, ohne Animation bei `prefers-reduced-motion`).
2. Das gilt für die **Schritt-Chips im Abschnitt „Plan"**, für **„Next open step: T-00x"** und für die IDs im Tooltip des Baums. Im Baum ist das eine neue Kontextmenü-Aktion „Show in plan map".
3. **Die Datei bleibt erreichbar:** „Open in plan" auf der Karte (gibt es schon) und **Strg/Cmd + Klick** auf den Chip, wie bei Links im Editor. Tooltip: „Show T-006 in the plan map · Ctrl+click opens the plan file".
4. **Karte reicher machen** (nur Zustand, kein Volltext): Ergebnis aus `Verified:` bei erledigten Schritten, Rückmeldung bei Workern, Zustand jeder abgedeckten Anforderung (verified / built / open). Bei dem Schritt, der **jetzt** dran ist, ein „Copy prompt" mit `Implement T-00x of <plan>`. Bei anderen offenen Schritten keiner, sonst wird die Reihenfolge übersprungen. Ausnahme: Schritte einer `‖`-Stufe, dort gibt es die Startzeilen ohnehin.
5. AC-IDs führen weiter in die Spec-Datei. Eine Ansicht für Anforderungen gibt es nicht.

**Akzeptanzkriterien (Entwurf):**
- **AC-a** Ein Klick oder Enter auf einen Schritt-Chip im Abschnitt „Plan" öffnet den Tab „Plan map" derselben Spec. Die Karte dieses Schritts ist aufgeklappt, sichtbar, fokussiert und 1,5 s hervorgehoben. Es öffnet sich keine Datei.
- **AC-b** Strg/Cmd + Klick auf denselben Chip öffnet die Plan-Datei an der Zeile neben dem Studio (heutiges Verhalten).
- **AC-c** „Next open step: T-00x" verhält sich wie AC-a.
- **AC-d** Die Tooltips nennen beide Wege, wörtlich getestet (Leitlinie 10).
- **AC-e** *(manuell, Gregor)* Auf `tip-splitter` erreicht Gregor jede Schrittinformation, ohne die Markdown-Datei zu öffnen.

### F-2 · Prozent am Fortschrittsbalken — **P2, klein**

**Beobachtung:** Die Balken (Plan, Steps, Criteria, Kopf der Plan map) haben weder Tooltip noch Prozentzahl; `aria-valuenow`/`aria-valuemax` sind gesetzt. [I][G g-r2-02]

**Bewertung:** Die Prozentzahl gehört **sichtbar neben den Text**, nicht nur in einen Tooltip: Ein Tooltip erscheint nur beim Überfahren und ist per Tastatur und auf Touch schwer erreichbar. Das Beispiel: Bei „4 of 6 done" sind es **67 %**, nicht 50 %. Eine Zahl daneben verhindert genau solche Fehlschätzungen.

**Vorschlag:**
- Text: `4 of 6 done · 67 %`, `8 of 19 verified · 42 %`.
- Rundung: kaufmännisch, aber **höchstens 99 %, solange etwas offen ist**. 100 % erscheint erst, wenn wirklich alles erledigt ist; 0 % wird gezeigt (E-13).
- `title` am Balken mit demselben Text. `aria-valuetext` = „4 of 6 steps done, 67 percent", damit Screenreader nicht nur „4" sagen.
- Prozent nur, wo ein Gesamtwert existiert; „not available" bleibt ohne Zahl.

**Akzeptanzkriterien (Entwurf):**
- **AC-f** Jeder Fortschrittstext zeigt `· n %`. Fixtures: 4/6 → 67 %, 5/6 → 83 %, 199/200 → 99 % (nicht 100 %), 6/6 → 100 %, 0/3 → 0 %.
- **AC-g** Der Balken trägt `title` und `aria-valuetext` mit demselben Inhalt.

**E-13 (zu bestätigen):** Gerundet wird kaufmännisch, solange etwas offen ist aber höchstens auf 99 %. Dann stimmt 4/6 = 67 % mit der Erwartung überein, und 100 % kommt trotzdem erst am Schluss. Die Alternative wäre reines Abrunden (4/6 = 66 %). Das ist ehrlich, wirkt aber wie ein Rechenfehler.

## 6. V3 · Spec-Datei als Kontext beim Senden — UX-Urteil

Gregors Vorgabe (Muss): Beim Senden hängt das Studio die Spec als echten Kontext an. Im Chat erscheint ein sichtbarer Datei-Chip.

**Technik bestätigt:** `workbench.action.chat.open` kennt `attachFiles`, „A list of file URIs to attach to the chat as context", auch mit Zeilenbereich. `isPartialQuery` legt den Prompt nur ins Eingabefeld. `preserveInput` sendet ab und ist mit `attachFiles` nicht kombinierbar. Die Vorgabe ist also für Copilot ohne Absenden umsetzbar. Für Claude Code bleibt das `@pfad` im Text zu prüfen (V-3). Außerdem gibt es eine Option `modelSelector`. Sie wählt das Modell vor; findet sie kein passendes, wirft sie einen Fehler.

### Antworten auf die drei Fragen

**1. Wie ankündigen?** Nicht im Knopfnamen; „Send to Copilot" bleibt kurz. Stattdessen **unter dem Knopf eine Anhang-Zeile in derselben Form wie im Chat**, ein Datei-Chip mit Codicon `file` und Dateiname:

```
[ Send to Copilot ▾ ]
  📄 0001-tip-splitter.md  attached when sent
  current or new chat · fast model                                  (?)
```

Der Nutzer sieht vorher genau das, was er nachher im Chat sieht. Der Tooltip des Knopfs: „Opens a new Copilot chat with the prompt and the spec attached. Nothing is sent." Copy prompt bekommt keine Zeile, weil dort nichts angehängt wird.

**2. Einstellung?** **Nein, zunächst keine.** Ein Muss ohne Schalter ist einfacher zu erklären, und das Verhalten ist sichtbar (Chip-Zeile). Eine Einstellung erst, wenn V-3 zeigt, dass der Anhang bei einzelnen Schritten Tokens ohne Nutzen kostet. Dann besser **pro Schritt im Produkt entschieden** als vom Nutzer: Specify, Clarify, Plan und Compile arbeiten an der Spec, also mit Anhang. Ob `Implement T-00x` ihn braucht (der Agent arbeitet aus dem Plan), soll V-3 zeigen.

**3. Erkennt der Nutzer im Chat, welche Datei mitgeht?**
- **Copilot:** ja, Anhänge stehen als Chips über dem Eingabefeld (Standard-UI).
- **Claude Code:** offen. `@.specs/active/0001-tip-splitter.md` ist im Eingabefeld zunächst Text. Ob es als Chip erscheint, prüft V-3. Wenn nicht, gehört `@pfad` an den **Anfang** des Prompts, damit es sofort ins Auge fällt. Die Anhang-Zeile im Studio lautet dann „📄 0001-tip-splitter.md referenced with @".

### Leitplanken (Ergänzung zu Gregors Liste)

- **Doppelte Ladung vermeiden — im FeatherSpec-Repo lösen, nicht im Studio.** Die `/sdd-*`-Befehle lesen die Spec selbst. Damit eine angehängte Spec nicht noch einmal gelesen wird, braucht es einen Satz in den FeatherSpec-Befehlen („If the spec is attached to the conversation, use it; do not read it again"). Das ist ein FeatherSpec-Update mit eigener Qualitätssicherung nach der Releasing-Anleitung. Das Studio sollte keinen eigenen Prompt-Zusatz erfinden, sonst entstehen zwei Wahrheiten.
- **Große Specs:** Die Specs des Studios selbst haben 30–45 KB (grob 8–12k Tokens). V-3 sollte auch mit einer solchen Spec messen, nicht nur mit `tip-splitter`.
- **`modelSelector` nicht standardmäßig nutzen.** Gregor will das Modell selbst wählen (07 §6a). Höchstens später als Opt-in: „Preselect the model from Model Hints".

### V-3-Spike, aus UX-Sicht zu ergänzen

Zusätzlich zu Gregors Messung (Tokens, Tool-Aufrufe, Qualität): (a) Erscheint bei Claude Code ein Chip oder nur Text? (b) Bleibt der Anhang erhalten, wenn der Nutzer den Prompt vor dem Absenden ändert? (c) Was zeigt Copilot, wenn die Spec-Datei während des Wartens umbenannt wurde (z. B. von `backlog/` nach `active/`)?

## 7. Prozess

- **Gut:** Klicktests vor dem Plan, Vorschau bei 1600 und 1000 px, unabhängige Prüfungen mit absichtlich eingebauten Fehlern (Mutation), Copilot-Review auf dem PR. Diese Runde hat sichtbar weniger Bedeutungsfehler als Runde 1.
- **Lehre:** Auch nach Klicktest auf HTML-Entwürfen fand erst die echte Nutzung auf `tip-splitter` den Navigationsfehler F-1. Entwürfe prüfen Aussehen und Texte, nicht Wege durch mehrere Ansichten. Für Runde 3 deshalb im Klicktest **eine Aufgabe mit Weg** stellen: „Finde heraus, was T-006 tut und ob es parallel laufen kann" und dabei beobachten, wohin geklickt wird.

## 8. Übergabe für Runde 3

| Spec (Vorschlag) | Inhalt | Prio | Aufwand | Vorbedingung |
| --- | --- | --- | --- | --- |
| **0025 Plan map navigation and progress clarity** | F-1 (Schritt → Plan map, Strg+Klick → Datei, reichere Karte), F-2 (Prozent), G-1 (Codicons statt `◐`), G-2 (eine Aussage bei Rückmeldungen), G-7 (Hinweis auf parallele Stufe im nächsten Schritt), G-10 | P1 | M | E-13 |
| **0026 Send defaults and wording** | OP-004 → Copilot neuer Chat als Standard, „current chat" als einziger Begriff, G-8 (Kurzform-Wortschatz), G-5 (eine Coach-Zeile), G-3 (kompakte Wege, ohne Doppelung), G-9 (Now auf 5 Zeilen) | P1 (OP-004) / P2 | S–M | — |
| **0027 Attach the spec when sending (V3)** | §6: Anhang-Zeile, Copilot `attachFiles`, Claude Code `@pfad`, keine Einstellung, pro Schritt nach V-3 | P1 (Muss) | M | **V-3**; FeatherSpec-Update „angehängte Spec nicht erneut lesen" |
| **0028 Interruption-aware NS-6** | G-11: `Current step` ≠ erster offener Schritt oder Return Note → `/sdd-plan` zuerst | P2 | S | Klicktest; ggf. FeatherSpec-Update für feste Prompts |

Betroffene Specs und Entscheidungen:
- **0025:** 0023 (Plan map, AC-012/PD-077 bleiben), 0019 (Detail-Links), 0021 (Progress-Texte), 0022 (Ampel-Codicons).
- **0026:** 0024 (Standardziel, Menütexte), 0021 (Coach-Zeile), 0018/0022 (Now).
- **0027:** PD-068 (Copy prompt bleibt ohne Anhang), PD-074.
- **0028:** PD-072.

**Für FeatherSpec selbst** (eigener Branch im FeatherSpec-Repo, Releasing-Anleitung):
1. Feste, zitierbare Prompts für „continue", „whole stage in sequence / with subagents / with other agents" und „integrate returned steps". So muss das Studio keine Formulierung erfinden (DevEx-Bericht §13, Punkt 2).
2. Satz „angehängte Spec nicht erneut lesen" in den Befehlen (für V3).
3. Abgleich nach Unterbrechung auch bei `Implement T-00x` (dann wird G-11 unnötig).

Diese drei Punkte würden das Studio vereinfachen, nicht verkomplizieren. Sie sind die besten Kandidaten für das nächste FeatherSpec-Update.

## Quellen

- VS Code `chatActions.ts` (`IChatViewOpenOptions`: `query`, `isPartialQuery`, `attachFiles`, `preserveInput`, `mode`, `modelSelector`): https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/chat/browser/actions/chatActions.ts
- Gregor, „FeatherSpec Studio – Runde 2: Bericht und Testleitfaden für das UX-Research" (19.11.2026)
- Projektstatus `claude/featherspec-studio-status-2026-11-19.md`; PD-068…PD-077 in `docs/product/product-decisions.md`
- FeatherSpec `.claude/rules/plans.md`, `.claude/rules/parallel-work.md`, `.claude/commands/sdd-plan.md` (Mode B)
