# 16 · Letzter Auftrag vor dem Release

Stand 20.11.2026 · Basis: Branch `ux-round-3`, Kopf `fbf8830` (PR #2) · Herleitung: [15-post-round3-review.md](15-post-round3-review.md)

> Das ist der **letzte Arbeitsauftrag** vor dem Release. Danach gibt es keine UX-Runde mehr: Merge, Checkliste, Veröffentlichung. Alles, was neu auffällt, kommt in den Backlog (Feature-Freeze).

## 0. Reihenfolge

1. **PR #2 mergen**, sobald CI grün ist.
2. **Einen Fix-PR** mit Spec **0032 „Release polish“** bauen (Abschnitt 2). Nichts anderes kommt in diesen PR.
3. **Prüfen** (Abschnitt 3), VSIX neu bauen, Fix-PR mergen.
4. **Release** nach `docs/release-checklist.md` (Abschnitt 4).

## 1. Entscheidungen (Gregor, 20.11.2026)

Bitte als PD-093 bis PD-095 in `docs/product/product-decisions.md` eintragen. Gregor kann jede davon später umdrehen.

| PD | Entscheidung |
| --- | --- |
| PD-093 | Schreibt ein Schritt einen Plan (Modus A/C), lautet der Tip: **`Tip: Use a new chat with a strong model, and allow web search.`** Der Grund: Nach clarify steht alles in der Spec, ein frischer Chat plant also ohne Ballast. `/sdd-plan` im Modus B (Report, Integrate) bleibt unverändert. |
| PD-094 | Bei **„Send to the current chat“** wird **nicht angehängt**, denn dieser Chat kennt die Spec schon. Für Projekte unter FeatherSpec 1.11.0 (oder `unknown`) kommt der Update-Satz zurück ins `(?)`. Ändert PD-091, das sonst gilt. |
| PD-095 | Jede Folgezeile beginnt mit **`Then:`** (danach) oder **`Or:`** (stattdessen). |

## 2. Spec 0032 „Release polish“: acht Punkte

Die Texte liegen in `src/shared/protocol/nextStepTexts.ts`, Styles in `src/webview/main.css`. Die Tests vergleichen Literale, also bei jeder Textänderung die Tests mitziehen und Amendment-Notizen an die betroffenen Specs setzen.

| # | Was | Genau | Belegt durch (15) | Ändert |
| --- | --- | --- | --- | --- |
| **AC-001** | Pfeil im Onboarding | `.empty-state .icon` (24 px) gilt nur noch für den Feder-Glyph, etwa über eine eigene Klasse. Der Pfeil am Send-Knopf ist im Onboarding 14 × 14 px wie überall. Dazu ein Test, der die Pfeilgröße im Empty State prüft. | H-3, x01 | 0029 |
| **AC-002** | Komma im Tip | `sameOrNew: 'the current chat or a new one'` ohne Komma. Ergebnis: `Tip: Use the current chat or a new one with a fast model.` | H-5 | 0030 §7 |
| **AC-003** | Tip beim Plan-Schreiben | Die Fälle NS-10 und NS-6 ohne Plan (Modus A/C) bekommen die Session `new`. Ergebnis: `Tip: Use a new chat with a strong model, and allow web search.` Das gilt auch für die `Then:`-Zeile nach clarify, weil sie den Fall NS-10 nutzt. | PD-093 | 0021, 0030, 0031 §6.3 |
| **AC-004** | Then / Or | `NS6_REPORT_INTENT` → `Or: not sure where it stands? Let the agent report first`. Die Continue-Zeile unter „Report first“ wird zu `Then: continue with <ID> <Titel>`. `NS9_INTENT` → `Have the spec challenged`, denn „then plan it“ steht schon in der Folgezeile. `NS9_THEN_INTENT` und `NS5_THEN_INTENT` bleiben, sie beginnen schon mit „Then“. | PD-095, H-1, H-9 | 0021, 0028, 0031 |
| **AC-005** | Teil-Rückläufer | Fehlt in der Gruppe noch jemand, lautet der Satz `When T-004 is back: integrate the returned steps`. Fehlen mehrere: `When T-004 and T-006 are back: …`. Der Knopf bleibt grau wie heute. | H-7, x09 | 0025 |
| **AC-006** | Send-Position | In Detail und Plan-map-Kopf steht der Send-Knopf **immer in einer eigenen Zeile unter dem Prompt**, unabhängig von der Länge des Prompts. Das gilt für die erste und jede Folgezeile. Prüfen bei 1000 und 1600 px. | H-6, x12 | 0031 |
| **AC-007** | Onboarding | Unter dem Send-Knopf steht `Tip: Use a new chat with a strong model.`, ohne Tip, wenn `showStepTips` aus ist. Der Erklärsatz bekommt `max-width: 65ch` und bleibt zentriert. | H-4, x01 | 0029 |
| **AC-008** | Anhang im aktuellen Chat | Copilot, Ziel `current` → `workbench.action.chat.open` **ohne** `attachFiles`. Name und Tooltip des Menüpunkts ohne `Attaches …`. Das neue Ziel `new` hängt weiter an. Für Projekte unter 1.11.0 oder `unknown` steht im `(?)`: `Update to FeatherSpec 1.11.0 with /sdd-featherspec-update so the attached spec is not read twice.` | PD-094, H-2 | 0027 §6.1, §6.2 |

**Nicht in 0032** (Backlog oder FeatherSpec):

- Die Zeile `**Clarified:**`, die `/sdd-clarify` künftig selbst schreiben soll (H-9, langfristig). Sie gehört in den Plan zu FeatherSpec 1.12.
- Der Spike V-4 zum Copilot harness: eigener Termin, vor Februar 2027.

## 3. Prüfen vor dem Merge des Fix-PR

- [ ] Frisches `/sdd-compile` für 0032: READY, 0 Abweichungen.
- [ ] `npm test` grün unter Windows. Testtitel-Abgleich wie bisher.
- [ ] Vorschau in Dark, Light und High Contrast, bei 1000 und 1600 px. Zu prüfen sind dabei:
  - Onboarding (x01),
  - clarify-Detail (x04),
  - Plan map mit zwei Zeilen (x07),
  - Teil-Rückläufer (x09).
- [ ] Mit einem Claude-Code- oder Copilot-Stub senden:
  - neuer Chat mit Anhang;
  - aktueller Chat ohne Anhang (nur Copilot).
- [ ] Die Belege kommen in `docs/release-checklist.md` unter „Release polish (0032)“.
- [ ] VSIX neu bauen und an Gregor geben.

## 4. Release

Ablauf nach `docs/release-checklist.md`, Abschnitte **Before publishing** und **Go**. Gregor kümmert sich um:

1. **Praxis-Check mit dem neuen VSIX** (etwa 15 Minuten, auf `tip-splitter`):
   - eine Backlog-Spec über „Send“ zu `/sdd-clarify` schicken, clarify laufen lassen, danach muss „Write the plan“ erscheinen;
   - einmal echt an Copilot senden, in einen neuen Chat (Anhang sichtbar) und in den aktuellen Chat (ohne Anhang);
   - prüfen, dass nichts automatisch abgeschickt wird.
2. **Icon, Screenshots, Banner und Keywords** abnicken.
3. **Repository öffentlich machen.** Sonst fehlen die Bilder auf der Marketplace-Seite.
4. **Trusted Publishing einmalig einrichten.** Tokens (PAT) funktionieren für Veröffentlichungen ab dem **1.12.2026** nicht mehr. Das Studio nutzt OIDC und ist davon nicht betroffen, aber die Einrichtung muss vorher erledigt sein.
5. **CHANGELOG-Datum setzen.** Danach `gh workflow run publish.yml -f confirm=publish`.

**Empfehlung zur Reihenfolge:** FeatherSpec 1.11.0 am selben Tag oder vorher veröffentlichen, also nach Gate 0 auf Windows, der Copilot-Gegenprobe und dem Hands-On. Das Studio läuft auch mit 1.10.0. Erst ab 1.11.0 wird die angehängte Spec aber nicht doppelt gelesen, und die README des Studios verweist auf 1.11.0.

## 5. Aufräumen nach dem Release

- Branches `ux-round-2` und `ux-round-3` lokal und remote löschen. Den Sync-Ordner abgleichen.
- In `docs/ux-audit/README.md` gelten dann nur noch `ux-guidelines.md`, 14, 15 und diese Datei 16. Alles andere ist Historie.
- Status-Doc im Claude-Projekt „FeatherSpec“ auf „veröffentlicht“ setzen.
