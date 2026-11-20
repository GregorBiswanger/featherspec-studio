# 17 · Gregors Praxis-Feedback nach 0032: Start über `/sdd-lifecycle`, Anhang und Prompt-Layout

Stand 20.11.2026.

**Basis:**
- Branch `release-polish`, Kopf `e29ae1b` (0032 abgeschlossen).
- Gregors zwei Screenshots vom Ready-Spec „0001 Restaurantrechnung aufteilen“ in `C:\projects\test`.
- `AGENTS.md` und `.claude/commands/sdd-lifecycle.md` aus FeatherSpec `main` (1.10.0).

> Das ist ein **Nachtrag zu 16**. Er gehört noch vor das Release, als Spec **0033**, auf demselben Branch oder als Folge-PR vor dem Publish.

## 1 Urteil zu Gregors vier Punkten

| # | Gregors Punkt | Urteil |
| --- | --- | --- |
| 1 | Nach dem Plan fehlt `/sdd-lifecycle` (backlog → active) | **Berechtigt, mein Fehler in 11 (Punkt 1).** Begründung in §2. |
| 2 | „Implement“ nennt die `plan.md`, angehängt wird aber die Spec | **Berechtigt.** Angehängt wird, was der Prompt nennt (§3). |
| 3 | Grauer Prompt-Balken zu lang | **Berechtigt.** Die Ursache ist eindeutig (§4). |
| 4 | Next step steht weiter rechts als Plan und Progress | **Berechtigt.** Die Ursache ist sehr wahrscheinlich gefunden (§4). |

## 2 Der Start braucht einen sichtbaren Lifecycle-Schritt

**Was heute passiert:** Ein Ready-Spec liegt in `backlog/` mit fertigem Plan. Das Studio bietet dafür direkt `Implement T-001 of .specs/backlog/…plan.md` an, mit dem Tip „any chat, fast model“. Hinter dieser Entscheidung (D-4 in 0028, von mir in 11 bestätigt) steht eine FeatherSpec-Regel: Ein explizites Startsignal wie „implement“ schließt den Umzug backlog → active ein.

**Warum das nicht reicht:**

1. **Die Regel greift an der falschen Stelle.** Sie steht in `/sdd-plan` unter *Always*, also nur in der Sitzung, in der der Plan geschrieben wurde. Ein neuer Chat mit schnellem Modell kennt nur `AGENTS.md`. Dort steht allein der Grundsatz („Implementation starts → spec-plan pair moves to `active/`“), der Ablauf liegt in `sdd-lifecycle.md` (178 Zeilen). Der Umzug hängt dann davon ab, ob ein schnelles Modell einem Verweis folgt.
2. **FeatherSpecs dokumentierter Ablauf** ist ausdrücklich: `/sdd-plan` → *human reads the plan* → **`/sdd-lifecycle` (backlog → active)** → implement. Das Studio sollte diesen Ablauf zeigen, nicht abkürzen.
3. **Zwei Aufgaben vermischt.** Ein Implement-Schritt soll einen Baustein bauen, prüfen und abhaken. Der Umzug bringt Buchhaltung mit: `git mv`, Statuszeilen, Memory Bank, dazu bei einem Ticket die Tracker-Frage hinter „Ask first“. In einem Implement-Chat mit schnellem Modell unterbricht das den Bau oder geht unter.
4. **Der Mensch bleibt in der Kontrolle.** „Jetzt geht es los“ ist eine Entscheidung. Ein eigener Schritt macht sie sichtbar, und Board und Statusleiste zeigen danach ehrlich „In progress“.

Der Preis ist ein Klick mehr pro Spec, und das ist es wert.

**Prompt-Text:** Ich empfehle `/sdd-lifecycle <spec> In Progress`, nicht „active“. Laut `argument-hint` erwartet der Befehl ein Status-Wort aus `AGENTS.md`, und `In Progress` steht dort. „active“ ist der Ordner und müsste vom Modell erst übersetzt werden. Für den Menschen steht „active“ im sichtbaren Satz darüber.

**Anhang:** Spec **und** Plan anhängen, wie Gregor sagt. `/sdd-lifecycle` liest im ersten Schritt ohnehin beide (*Inspect … the state of the accompanying plan*). Der Anhang ersetzt also nur diese Lesevorgänge und kostet keinen zusätzlichen Kontext.

**Keine Folgezeile** „Then: implement T-001“. Zwei Send-Knöpfe würden dazu verleiten, beides gleichzeitig loszuschicken. Nach dem Umzug bietet das Studio T-001 von selbst an; das `(?)` sagt das.

## 3 Angehängt wird, was der Schritt bearbeitet

Regel für alle Schritte (neue PD): **Der Anhang folgt dem Prompt.**

| Schritt | Prompt nennt | Anhang |
| --- | --- | --- |
| Start: auf active setzen (neu) | Spec | **Spec + Plan** (lifecycle prüft und verschiebt beide) |
| Implement `<ID>` of `<plan>` (Start, Continue, die `Then:`-Zeile nach Report) | Plan | **nur Plan** |
| `/sdd-plan`, `/sdd-compile`, `/sdd-clarify`, `/sdd-specify` | Spec | Spec (wie heute) |
| `/sdd-lifecycle` bei Duplikat oder Ordner-Widerspruch (NS-2) | Spec | nichts (wie heute) |

Auch ohne angehängte Spec gehen beim Implement keine Kriterien verloren. Der Plan nennt sie je Schritt (`Covers:`), und `AGENTS.md` lässt den Agenten die Spec bei Bedarf lesen.

## 4 Layout: Ursachen im Code

**Prompt-Balken über die ganze Breite (Punkt 3).** In `src/webview/main.css` steht seit 0032 AC-006:

```css
.next-step-lines li > code:has(+ .send-split) { flex: 1 0 100%; }
```

Damit Send unter dem Prompt steht, wird der Code-Block auf 100 % gestreckt. Besser wird die Zeile zur Spalte, der Block bleibt so breit wie sein Inhalt:

```css
.next-step-lines li { flex-direction: column; align-items: flex-start; }
.next-step-lines code { max-width: 100%; }
```

Gregor gefällt, dass Send immer darunter steht, das bleibt so.

**Umbruch mitten im Dateinamen.** Bei schmaler Breite bricht `….plan.` / `md` auseinander (Screenshot 1). Pfade sollten nur nach einem `/` umbrechen. Dazu ein `<wbr>` nach jedem `/` in der Anzeige; der kopierte und gesendete Text bleibt unverändert.

**Einrückung (Punkt 4).** Die Ursache ist sehr wahrscheinlich diese:
- `.section-body` rückt alle Abschnitte um 16 px ein.
- Zusätzlich gibt `.section-body ul, .section-body ol { padding-left: 18px; }` der Liste `.next-step-lines` 18 px.
- Die Regel `.next-step-lines { padding: 0 0 4px }` verliert dagegen, weil `.section-body ul` die höhere Spezifität hat.

Progress und Files setzen das extra auf 0 (`.section-body .criteria-open, .detail-files { padding-left: 0 }`), der Next step nicht. Lösung: `.section-body .next-step-lines { padding-left: 0; }`. Danach beginnt „Start implementing“ an derselben Kante wie „0 of 5 done“ und „Criteria“.

**Nebenbei (klein):** Bei schmaler Overview steht im Up-next-Eintrag das Ready-Symbol allein in einer eigenen Zeile (Screenshot 1). Es gehört auf die Titelzeile vor die Nummer, wie im Baum.

## 5 Spec 0033 „Start via lifecycle, plan attachment, prompt layout“

Texte liegen in `src/shared/protocol/nextStepTexts.ts`, der Anhang in `src/core/assistant/attachment.ts` (`STEP_ATTACHES`, heute ein Ja/Nein je Fall, künftig die Liste der Dateien) und `assistants.ts`. Styles liegen in `src/webview/main.css`.

| AC | Was | Genau |
| --- | --- | --- |
| **AC-001** | Neuer Start-Schritt | Ready-Spec (in `backlog/`, Plan vorhanden, kein Schritt abgehakt): Next step ist der einzige Eintrag `Start: move the spec and its plan to active` · Kurzform `Start · Set active` · Prompt `/sdd-lifecycle <spec> In Progress` · Tip `Tip: Use any chat with a fast model.` Wirkung im `(?)`: `The agent moves spec and plan to active and sets the status to In Progress. Afterwards the Studio offers T-001.` Keine Folgezeile. |
| **AC-002** | Danach Implement | Liegt der Spec in `active/` und ist nichts abgehakt: `Start implementing: T-001 …` · `Implement T-001 of .specs/active/…plan.md`. Der Wirkungstext von NS-7 sagt **nicht** mehr „moves the spec to active“. |
| **AC-003** | Anhang Implement | Jeder `Implement <ID> of <plan>` hängt **nur den Plan** an: Copilot `attachFiles: [plan]`, Claude Code `… @<plan>`. |
| **AC-004** | Anhang Start | Der Start-Schritt hängt **Spec und Plan** an: Copilot `attachFiles: [spec, plan]`, Claude Code `… @<spec> @<plan>`. Die Whitespace-Regel für Claude Code gilt je Pfad. Im aktuellen Chat wird nichts angehängt (PD-094 bleibt). |
| **AC-005** | Prompt-Breite | Der Prompt-Block ist so breit wie sein Text, höchstens so breit wie die Spalte. Send steht darunter, linksbündig. Gilt in Detail und Plan-map-Kopf, bei 1000 und 1600 px. |
| **AC-006** | Umbruch | Angezeigte Pfade brechen nur nach `/` um (`<wbr>`). Kopierter und gesendeter Text sind unverändert, mit Test. |
| **AC-007** | Einrückung | Die linke Kante des ersten Texts im Next step ist gleich der von Plan, Progress und Files (± 1 px), in der Seitenleiste. Mit Test über `getBoundingClientRect`. |
| **AC-008** | Up next schmal | Das Status-Symbol steht auf der Titelzeile und nicht allein in einer Zeile. |

**Ändert:**
- 0028 (D-4, Startsignal NS-7);
- 0021 (NS-7, Kurzform und Wirkung);
- 0027 §6.1 (Anhangstabelle) und PD-091;
- 0031 und 0032 AC-006 (Layout).

**Neue PDs:**
- **PD-096:** Start über einen sichtbaren `/sdd-lifecycle`-Schritt.
- **PD-097:** Der Anhang folgt dem Prompt.

**Prüfen:**
- frisches `/sdd-compile`;
- `npm test` unter Windows;
- Vorschau in drei Themes und zwei Breiten mit den Lagen Ready, Active ohne Haken und Active mit Haken;
- Senden mit Stub, dabei die Anhänge im Protokoll prüfen;
- VSIX neu bauen, Gregor testet auf `C:\projects\test`: Ready → Set active → T-001.

## 6 Für FeatherSpec (kein Studio-Thema)

- An FeatherSpec ist nichts zu ändern. Der Ablauf steht in `AGENTS.md` schon richtig. Das Startsignal in `/sdd-plan` bleibt als Sicherheitsnetz für Leute ohne Studio.
- **Zu H-9 aus 15:** FeatherSpec kennt die Kopfzeile `**Clarified:** <date>` bereits; `/sdd-reverse-specify` schreibt sie für Baseline-Specs. Schriebe `/sdd-clarify` sie auch, könnte das Studio den clarify-Stand aus der Datei lesen statt aus einer Erinnerung. Das ist ein Kandidat für 1.12 und gehört nicht in dieses Release.