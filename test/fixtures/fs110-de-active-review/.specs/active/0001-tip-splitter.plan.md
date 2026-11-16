# Plan — Restaurant-Rechnung mit Trinkgeld aufteilen

**Spec:** [0001-tip-splitter.md](0001-tip-splitter.md)
**Status:** Done
**Last updated:** 2026-11-15
**Current step:** T-005 abgeschlossen; `/sdd-compile` READY; Lifecycle-Move nicht freigegeben

## Approach

Greenfield-Express-Service in Onion-Schichten: `domain` (reine Cent-Arithmetik, keine
Abhängigkeiten) ← `application` (Validierung unbekannter Eingaben, Use Case) ←
`presentation/http` (Express-App, Route, Fehlerhandler) ← `src/server.ts` (Einstiegspunkt).
Geld wird intern ausschließlich als ganzzahlige Cents gerechnet: Trinkgeld =
`floor((billCents · tipHundredths + 5000) / 10000)` (kaufmännisch, max. 10¹¹ < 2⁵³ —
exakt), Aufteilung `floor(total / n)` plus Restcents an Eintrag 0; Ausgabe als Strings
`"x.yy"`. Eingaben werden nie per Gleitkomma-Multiplikation in Cents umgerechnet, sondern
über ihre Dezimal-Stringdarstellung (JSON-Zahl → `String(value)`) ganzzahlig geparst.
TypeScript läuft ohne Build über das native Type Stripping von Node 26; `tsc` prüft nur
(`noEmit`). Reihenfolge: Toolchain und Rechenkern zuerst (Risiko: Versionen, Rundung), dann
Format-, dann Bereichsvalidierung, dann HTTP-Rand. Berührte Memory-Bank-Dateien:
`techContext.md`, `systemPatterns.md`, `activeContext.md`.

**Quality gates:** `npm exec --no -- eslint . --max-warnings=0` · `npm exec --no -- tsc --noEmit` ·
`npm test` (aus [techContext.md](../../.memory-bank/techContext.md#quality-gates); laut
Arbeitspräferenz nach jedem Implementierungsschritt in dieser Reihenfolge).

## Research

- Survey: Greenfield — keine Manifeste, kein Code, keine Tests; lokal Node v26.13.0,
  npm 11.17.0. README.md ist die FeatherSpec-Vorlage und bleibt unberührt. Keine
  `done/`-Spec wird invalidiert.
- Checkpoint-Entscheid (Nutzer, 2026-11-15): HTTP-Vertrag laut Spec OP-004; numerische
  Strings zulässig (Spec A-005); kaputter Body → 400 mit `field: "body"` (Spec A-006);
  Toolchain wie unten bestätigt.
- npm-Registry (`npm view`, abgerufen 2026-11-15): express 5.3.0 (node ≥ 18),
  @types/express 5.0.6, typescript latest 7.0.2 / 6.0.3, eslint 10.15.0
  (node ^20.19 ‖ ^22.13 ‖ ≥ 24), @eslint/js 10.0.1, typescript-eslint 8.72.2
  (peer typescript `>=4.8.4 <6.1.0`), @types/node 26.6.6.
- [typescript-eslint — Dependency Versions](https://typescript-eslint.io/users/dependency-versions/)
  — unterstützt TypeScript `<6.1.0` → **TypeScript 6.0.3 pinnen, nicht 7**; abgerufen 2026-11-15.
- [Node.js — Modules: TypeScript](https://nodejs.org/api/typescript.html) — Type Stripping
  stabil und standardmäßig an; nur löschbare Syntax (keine Enums, Parameter-Properties,
  Namespaces mit Laufzeitcode); `import type` und `.ts`-Endungen Pflicht; empfohlene
  tsconfig: `module: nodenext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`,
  `allowImportingTsExtensions` (mit `noEmit`); `"type": "module"` für ESM; abgerufen 2026-11-15.
- [Announcing TypeScript 6.0](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/)
  — `strict` jetzt Default, `types` jetzt standardmäßig `[]` → `"types": ["node"]` setzen;
  abgerufen 2026-11-15.
- [Express — Error Handling](https://expressjs.com/en/guide/error-handling.html) und
  [express v5.3.0 lib/application.js](https://github.com/expressjs/express/blob/v5.3.0/lib/application.js)
  — der Default-Handler loggt jeden Fehler per `console.error` (außer `env=test`), z. B.
  JSON-Parse-Fehler mit Body-Ausschnitt → eigener 4-Argument-Fehlerhandler ohne Logging
  ist für AC-010 Pflicht; abgerufen 2026-11-15.
- Lokale Probe (Node v26.13.0, Temp-Verzeichnis, 2026-11-15): `node --test "test/**/*.test.ts"`
  findet und führt `.ts`-Tests mit Typannotationen aus (1 pass, exit 0) — **aber** ein Glob
  ohne Treffer endet ebenfalls mit exit 0 und `tests 0` → jedes `Verify:` prüft zusätzlich
  `tests` > 0. `String(10.05)` = `"10.05"`, `String(0.0000001)` = `"1e-7"` (Exponent →
  ungültig), `String(-0)` = `"0"`; `Math.round(1.005 * 100)` = `100` → Gleitkomma-
  Umrechnung ist unzuverlässig, daher ganzzahliges Parsen der Dezimaldarstellung.
- `express.json()` (Default `strict: true`) lehnt Primitive als Body per Parse-Fehler ab;
  ohne JSON-Content-Type bleibt `req.body` in Express 5 `undefined` → beides landet bei
  A-006 (`field: "body"`), ebenso Arrays und `null`.

## Stages

1. T-001 — Toolchain und Rechenkern (beginnt mit Ask-first: `npm install`)
2. T-002 → T-003 → T-004 — Eingabevalidierung (Format, dann Bereiche) und HTTP-Endpunkt
3. T-005 — Docs-Sync und finale Quality gates

No parallel stage: T-002 und T-003 ändern dieselbe Validierungsdatei, T-004 nutzt deren
Vertrag, und alle Schritte sind klein — Parallelität spart hier nichts.

## Steps

### T-001 — Toolchain einrichten und Rechnung centgenau aufteilen

- **Covers:** AC-002, AC-003, AC-004, AC-007, AC-008
- **Do:** Nach eigener Freigabe (Ask-first: Abhängigkeiten) `package.json` anlegen
  (`"type": "module"`, `engines.node >=26`, Skripte `test`: `node --test "test/**/*.test.ts"`,
  `start`: `node src/server.ts`), Laufzeit-Abhängigkeit `express@5.3.0`, Dev-Abhängigkeiten
  `typescript@6.0.3` (exakt, nicht 7), `eslint@^10`, `@eslint/js@^10`,
  `typescript-eslint@^8.72`, `@types/express@^5`, `@types/node@^26` via `npm install`;
  `tsconfig.json` (`strict`, `noEmit`, `module`/`moduleResolution: nodenext`,
  `target: esnext`, `erasableSyntaxOnly`, `verbatimModuleSyntax`,
  `allowImportingTsExtensions`, `types: ["node"]`); `eslint.config.js` (Flat Config,
  `@eslint/js` + `typescript-eslint` recommended, `no-console: error`, `node_modules`
  ignoriert); `.gitignore` um `node_modules/` ergänzen.
  TDD: `test/domain/tipSplit.test.ts` (AC-IDs in den Testnamen) gegen einen
  `Not implemented`-Stub in `src/domain/tipSplit.ts` rot laufen lassen, Fälle zeigen,
  **Stopp für Test-Review**; erst nach dem Ja `splitBillInCents({ billInCents,
  tipPercentageInHundredths, numberOfPeople })` → `{ amountsPerPersonInCents,
  totalTipInCents }` implementieren (Trinkgeld `floor((bill · tip + 5000) / 10000)`,
  Basisanteil `floor(total / n)`, Rest an Eintrag 0). Fälle mindestens: 1005 / 1000 → Trinkgeld
  101, Summe 1106 (AC-002); 5 / 1000 → 0,5 Cent rundet auf 1 (AC-002); 1000 / 0 / 6 →
  170 + 5 × 166, Trinkgeld 0 (AC-004, AC-007); 1001 / 0 / 3 → 335, 333, 333 (AC-004,
  mehr als ein Rest-Cent); 0 / 1500 / 3 → alles 0 (AC-008); Summe = Rechnung + Trinkgeld
  für mehrere Kombinationen inkl. 10.000.000 / 10000 / 1000 und 1 / 1 / 1 (AC-003).
- **Verify:** `npm test` — erst rot durch `Not implemented`, dann grün mit `tests` > 0
  (ein leerer Glob endet sonst grün); danach alle drei Quality gates
- [x] **Verified (T-001):** 2026-11-15 — `npm test` first found 6 tests and all
  failed at the `Not implemented` stub; after implementation, all 6 passed.
  `npm exec --no -- eslint . --max-warnings=0`, `npm exec --no -- tsc --noEmit`,
  and `npm test` then all exited 0.
- **Notes:** —

### T-002 — Pflichtfelder und Zahlformat prüfen

- **Covers:** AC-012, AC-013
- **Do:** `src/application/validateSplitRequest.ts`: nimmt `unknown`, liefert entweder
  `{ errors: [{ field, message }] }` mit **allen** Verstößen (deutsche Gründe) oder
  `{ billInCents, tipPercentageInHundredths, numberOfPeople }`. Body ist kein Objekt
  (`undefined`, `null`, Array, Primitive) → genau ein Fehler `field: "body"` (A-006).
  Je Feld: JSON-Zahl → `String(value)`; String unverändert; beides muss
  `^-?\d+(\.\d+)?$` erfüllen (A-005), sonst „fehlt oder ist nicht numerisch“ (AC-012).
  Ganzzahliges Parsen der Ziffern in Cents bzw. Hundertstel — **keine**
  Gleitkomma-Multiplikation; mehr als zwei Nachkommastellen bzw. nicht ganzzahlige
  Personenzahl → Fehler mit Grund (AC-013). Unbekannte Felder werden ignoriert.
  `src/application/splitBill.ts` als Use Case: validieren → `splitBillInCents` → Ergebnis.
  TDD in `test/application/validateSplitRequest.test.ts` (rot, **Stopp für Test-Review**,
  dann Code). Fälle: je Feld fehlend, `null`, `true`, `"abc"`, `"10,05"`, `"1e2"`,
  `" 10"` (AC-012); `0.0000001` (Exponent) ungültig; Personen `2.5` und `"2.5"`, Rechnung
  `10.001`, Prozent `"10.001"` (AC-013); `0.29` und `"0.29"` → 29 Cents (Gleitkomma-Falle);
  `"10.05"` wie `10.05`; drei ungültige Felder → drei Fehler; Body `null`/Array → `body`;
  Fehlerantwort enthält keine Ergebnisfelder; Zusatzfeld wird ignoriert.
- **Verify:** `npm test` (rot, dann grün, `tests` > 0) und danach alle drei Quality gates
- [x] **Verified (T-002):** 2026-11-15 — Der erste `npm test`-Lauf war rot,
  weil `src/application/validateSplitRequest.ts` noch fehlte; dadurch wurden die
  neuen Assertions nicht ausgeführt (sechs bestehende Tests bestanden). Nach
  Implementierung: `npm test` — 39 Tests bestanden; anschließend ESLint,
  TypeScript-Prüfung und `npm test` in der vereinbarten Reihenfolge ohne
  Warnungen oder Fehler.
- **Notes:** Der rote Vorab-Lauf scheiterte an der Modulauflösung statt an einem
  `Not implemented`-Stub; die Tests wurden nach Freigabe mit der Implementierung
  ausgeführt.

### T-003 — Wertebereiche prüfen

- **Covers:** AC-005, AC-006, AC-011, AC-014
- **Do:** Bereichsregeln aus Spec §5 in `src/application/validateSplitRequest.ts`
  ergänzen, gesammelt mit den Formatfehlern: Personenzahl ≤ 0 → „muss größer als null
  sein“ (AC-005); Prozentsatz < 0 → „darf nicht negativ sein“ (AC-006); Rechnung < 0
  (AC-011); Rechnung > 100.000,00, Prozent > 100, Personen > 1.000 (AC-014). `-0`/`"-0"`
  gilt als 0. TDD in derselben Testdatei (rot, **Stopp für Test-Review**, dann Code).
  Fälle: Personen `0`, `-1` (AC-005); Prozent `-1`, `-0.01` (AC-006); Rechnung `-0.01`
  (AC-011); `100000.01`, `100.01`, `1001` ungültig und `100000`, `100`, `1000` gültig
  (AC-014); Prozent `0` und Rechnung `0` gültig; Fehler enthält kein Ergebnis.
- **Verify:** `npm test` (rot, dann grün, `tests` > 0) und danach alle drei Quality gates
- [x] **Verified (T-003):** 2026-11-15 — Vor der Implementierung erkannte
  `npm test` 59 Tests; 11 Bereichsassertions scheiterten an den noch fehlenden
  Regeln, 48 bestanden. Danach `npm test` — 59 bestanden; ESLint,
  TypeScript-Prüfung und `npm test` in der vereinbarten Reihenfolge ohne
  Warnungen oder Fehler.
- **Notes:** —

### T-004 — HTTP-Endpunkt `POST /split` ohne Login und ohne Logging bereitstellen

- **Covers:** AC-001, AC-010 (plus HTTP-Belege für AC-002, AC-004, AC-005)
- **Do:** `src/presentation/http/createApp.ts`: Express-App mit `express.json()`,
  `POST /split` → Use Case; Erfolg 200 `{ amountsPerPerson: string[], totalTip: string }`,
  Cents → `"x.yy"` per Ganzzahl-Division (kein `toFixed`); Validierungsfehler 400
  `{ errors }`; eigener 4-Argument-Fehlerhandler: Parse-Fehler → 400 `field: "body"`
  (A-006), sonst 500 ohne Details — kein `console`-Aufruf, kein Durchreichen an den
  Express-Default-Handler. `src/server.ts`: `createApp().listen(Number(process.env.PORT ??
  3000))`, keine Ausgabe von Anfragedaten. TDD in
  `test/presentation/http/splitRoute.test.ts` mit eingebautem `fetch` gegen
  `app.listen(0)` (rot, **Stopp für Test-Review**, dann Code). Fälle: 10.05 / 10 / 2 →
  `["5.53","5.53"]`, `"1.01"` (AC-001, AC-002); 10 / 0 / 6 → `"1.70"` zuerst, 5 × `"1.66"`,
  `"0.00"` (AC-001, AC-004); numerische Strings akzeptiert; Personen 0 → 400 ohne
  `amountsPerPerson`/`totalTip` (AC-005); kaputtes JSON und Body ohne JSON-Content-Type →
  400 `body` (A-006); Anfrage ohne Auth-Header erfolgreich, und `console.log/info/warn/
  error/debug`-Mocks bleiben bei Erfolg, Validierungsfehler und Parse-Fehler ungerufen
  (AC-010).
- **Verify:** `npm test` (rot, dann grün, `tests` > 0) und danach alle drei Quality gates;
  zusätzlich `node src/server.ts` starten und ein `POST /split` per `curl` beantwortet
  sehen (Prozess danach beenden)
- [x] **Verified (T-004):** 2026-11-15 — `npm test` — 66 bestanden; danach ESLint,
  TypeScript-Prüfung und `npm test` in der vereinbarten Reihenfolge ohne
  Warnungen oder Fehler. `node src/server.ts` gestartet und `POST /split`
  lieferte `{"amountsPerPerson":["5.53","5.53"],"totalTip":"1.01"}`.
- **Notes:** Der rote Vorab-Lauf konnte die neue Testdatei nicht laden, da
  `src/presentation/http/createApp.ts` noch fehlte; nach der Testfreigabe
  bestanden alle HTTP-Tests mit der Implementierung.

### T-005 — Dokumentation synchronisieren und finale Quality gates fahren

- **Covers:** AC-001, AC-002, AC-003, AC-004, AC-005, AC-006, AC-007, AC-008, AC-010,
  AC-011, AC-012, AC-013, AC-014 (AC-009 bleibt laut Spec ohne Test und Nachweis)
- **Do:** `AGENTS.md`-Snapshot — genau diese Einträge, die Planfreigabe bestätigt sie:
  `style: 'Onion Architecture: domain ← application ← presentation/http'` ·
  `entrypoints: ['src/server.ts — Express-HTTP-Service, POST /split']` ·
  `modules: ['src/domain — Cent-Arithmetik, Trinkgeld, Aufteilung; keine Abhängigkeiten',
  'src/application — Eingabevalidierung und Use Case; importiert nur domain',
  'src/presentation/http — Express-App, Route, Fehlerhandler ohne Logging']` ·
  `boundaries: ['domain importiert nichts aus application/presentation',
  'application importiert nur domain; keine Express-Typen in domain/application',
  'Keine Persistenz und kein Logging von Rechnungsdaten (AC-010)']` · `last reconciled`
  auf das Datum. `techContext.md`: Versionen (TypeScript 6.0.3 wegen typescript-eslint),
  Type Stripping statt Build, Start- und Testkommando, `PORT`, Gates jetzt ausführbar,
  Hinweis „leerer Test-Glob endet grün“. `systemPatterns.md`: Entscheidungen „Geld als
  ganzzahlige Cents, Parsen über Dezimalstring, Ausgabe als String“ und „eigener
  Express-Fehlerhandler ohne Logging“ (datiert, Link auf diesen Plan).
  `activeContext.md` aktualisieren. Für AC-010 alle `src/*.ts`-Dateien und
  `package.json` auf Datei- und Datenbankpersistenz prüfen, da diese Abwesenheit
  nicht durch den HTTP-Test allein belegt wird. README.md bleibt unverändert
  (FeatherSpec-Vorlage).
- **Verify:** `npm exec --no -- eslint . --max-warnings=0`; `npm exec --no -- tsc --noEmit`;
  `npm test` (`tests` > 0) — alle ohne Warnungen und Fehler; **manual:** alle
  Quellmodule und `package.json` auf Datei-/Datenbankpersistenz geprüft
- [x] **Verified (T-005):** 2026-11-15 — ESLint und TypeScript-Prüfung
  ohne Warnungen oder Fehler; `npm test` — 66 Tests bestanden, 0 fehlgeschlagen.
  **manual:** Fünf TypeScript-Quelldateien und `package.json` geprüft; die
  `rg`-Suche nach Dateisystem- und Datenbankzugriffen ergab keine Treffer.
- **Notes:** Der Architektur-Snapshot in `AGENTS.md` entsprach bereits den
  bestätigten Werten und blieb unverändert. Technischer Kontext, Systemmuster
  und Spec wurden mit dem implementierten Stand synchronisiert. Die manuelle
  AC-010-Prüfung ergänzt den HTTP-Test zum fehlenden Login und Logging.

## Traceability

| Acceptance criterion | Steps | Code / files | Test | State |
| --- | --- | --- | --- | --- |
| AC-001 | T-004, T-005 | `src/presentation/http/createApp.ts` | `test/presentation/http/splitRoute.test.ts` — formatiertes Ergebnis pro Person und Gesamttrinkgeld | verified |
| AC-002 | T-001, T-004, T-005 | `src/domain/tipSplit.ts`, `src/presentation/http/createApp.ts` | `test/domain/tipSplit.test.ts` — Rundung; `test/presentation/http/splitRoute.test.ts` — HTTP-Ausgabe | verified |
| AC-003 | T-001, T-005 | `src/domain/tipSplit.ts` | `test/domain/tipSplit.test.ts` — conservation test | verified |
| AC-004 | T-001, T-004, T-005 | `src/domain/tipSplit.ts`, `src/presentation/http/createApp.ts` | `test/domain/tipSplit.test.ts` — Restcents; `test/presentation/http/splitRoute.test.ts` — HTTP-Ausgabe | verified |
| AC-005 | T-003, T-004, T-005 | `src/application/validateSplitRequest.ts`, `src/presentation/http/createApp.ts` | `test/application/validateSplitRequest.test.ts` — Personenzahl 0 und negativ; `test/presentation/http/splitRoute.test.ts` — HTTP-400 | verified |
| AC-006 | T-003, T-005 | `src/application/validateSplitRequest.ts` | `test/application/validateSplitRequest.test.ts` — negative, null und negative Null | verified |
| AC-007 | T-001, T-005 | `src/domain/tipSplit.ts` | `test/domain/tipSplit.test.ts` — zero-tip split test | verified |
| AC-008 | T-001, T-005 | `src/domain/tipSplit.ts` | `test/domain/tipSplit.test.ts` — zero-bill test | verified |
| AC-009 | — (nicht verbindliches Ziel, kein Test laut Spec) | — | — | open |
| AC-010 | T-004, T-005 | `src/presentation/http/createApp.ts`, `src/server.ts` | `test/presentation/http/splitRoute.test.ts` — ohne Authentifizierung und ohne Console-Aufrufe; manual: fünf Quellmodule und `package.json` auf Datei-/Datenbankpersistenz geprüft, 2026-11-15 | verified |
| AC-011 | T-003, T-005 | `src/application/validateSplitRequest.ts` | `test/application/validateSplitRequest.test.ts` — negativer und null Rechnungsbetrag | verified |
| AC-012 | T-002, T-005 | `src/application/validateSplitRequest.ts` | `test/application/validateSplitRequest.test.ts` — Pflichtfelder, Formate, Body-Fehler, alle Verstöße | verified |
| AC-013 | T-002, T-005 | `src/application/validateSplitRequest.ts` | `test/application/validateSplitRequest.test.ts` — Dezimalpräzision und ganzzahlige Personenzahl | verified |
| AC-014 | T-003, T-005 | `src/application/validateSplitRequest.ts` | `test/application/validateSplitRequest.test.ts` — Grenzwerte und Überschreitungen | verified |

## Session handoff

- **Done so far:** T-001 bis T-005 abgeschlossen; HTTP-Service,
  Fehlerbehandlung, Einstiegspunkt und Dokumentationsabgleich fertig. Alle
  verbindlichen Kriterien außer dem nicht verbindlichen AC-009 sind
  nachgewiesen; 66 Tests und finale Quality gates bestanden.
- **Next action:** Auf ausdrückliche Freigabe des Lifecycle-Moves warten; danach
  `/sdd-lifecycle` für den Wechsel nach `done/` und die Planarchivierung verwenden.
- **Open decisions:** —
- **Baseline:** _(Commit-Hash vor dem ersten Schritt-Commit; wird bei Arbeitsbeginn gesetzt)_
- **Environment:** Node v26.13.0, npm 11.17.0 lokal; `npm install` meldete 7 moderate
  Audit-Findings, noch nicht untersucht.
