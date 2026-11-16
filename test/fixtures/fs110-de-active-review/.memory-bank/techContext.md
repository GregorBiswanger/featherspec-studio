# Technischer Kontext

## Stack
- Node.js 26 oder neuer; lokal geprüft mit v26.13.0.
- TypeScript 6.0.3, Express 5.3.0, ESLint 10 und typescript-eslint 8.72.
- Paketmanager: npm 11.17.0.
- Unit-Tests: integrierter Node.js-Test-Runner (`node --test`), kein Vitest.
- TypeScript wird ohne Build über Node.js Type Stripping ausgeführt.

## Build / Start
- `npm start` → `node src/server.ts`.
- Kein Build-Schritt; `tsc` prüft mit `noEmit`.
- Manifeste und Startskript sind eingerichtet; Abhängigkeiten nach Freigabe installiert.
- `PORT` setzt den Listen-Port; Standardwert ist `3000`.

## Tests
- `npm test` → `node --test "test/**/*.test.ts"`.
- Domain- und Anwendungsvalidierungstests sind implementiert und bestanden
  einschließlich Wertebereichsregeln. HTTP-Vertrag und Fehlerfälle sind mit
  integrierten `fetch`-Tests geprüft; insgesamt 66 Tests bestehen.
- Ein Test-Glob ohne Treffer kann mit Exit-Code 0 enden; daher bei der
  Verifikation zusätzlich sicherstellen, dass `tests` größer als null ist.

## Quality gates
Bestätigte Definition of Green, in dieser Reihenfolge (Werkzeuge sind eingerichtet):

1. `npm exec --no -- eslint . --max-warnings=0`
2. `npm exec --no -- tsc --noEmit`
3. `npm test`

Erfolgreiche Prüfungen müssen ohne Warnungen und Fehler enden. Geltungsbereich und
TDD-Freigabestopps stehen ausschließlich in den
[Arbeitspräferenzen](../AGENTS.md#current-preferences).
- Nach T-004: ESLint, TypeScript-Prüfung und alle 66 Tests erfolgreich.

## Einschränkungen
- `npm install` meldete 7 moderate Audit-Findings; diese wurden nicht untersucht.
