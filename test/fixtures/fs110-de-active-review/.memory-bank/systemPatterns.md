# Systemmuster

## Architekturstil

Strukturfakten und der Zielstil stehen ausschließlich im
[Architektur-Snapshot](../AGENTS.md#architecture--design-snapshot-must-sync).
Hier stehen Entscheidungsherkunft und Muster, nicht eine zweite Strukturübersicht.

## Zentrale Entscheidungen
- 2026-11-15: Onion Architecture wurde vom Nutzer als Ziel gewählt. T-001 bis
  T-004 implementieren Domain, Application und HTTP-Präsentation gemäß dem
  [Plan](../.specs/active/0001-tip-splitter.plan.md). Ein fachlicher Grund
  wurde nicht genannt. provenance: human (/sdd-setup, stated)

## Muster
- 2026-11-15: Geld wird in der Domain als ganzzahlige Cents berechnet und im
  HTTP-Vertrag als Strings mit zwei Nachkommastellen ausgegeben. Dezimale
  Eingaben werden aus ihrer Stringdarstellung in Ganzzahlen geparst. Quelle:
  [Plan T-005](../.specs/active/0001-tip-splitter.plan.md).
- 2026-11-15: Die Anwendungsschicht nimmt unbekannte Eingaben entgegen,
  validiert Dezimalwerte aus ihrer Stringdarstellung und wandelt Ziffern mit
  `BigInt` in Cents bzw. Hundertstel um; sie multipliziert Eingaben nicht mit
  Gleitkommazahlen. Der Use Case validiert vor dem Aufruf der Domain-Funktion.
  Grund: exakte Cent-Arithmetik gemäß [Spec](../.specs/active/0001-tip-splitter.md)
  und [Plan T-002](../.specs/active/0001-tip-splitter.plan.md). Implementiert in
  [validateSplitRequest.ts](../src/application/validateSplitRequest.ts) und
  [splitBill.ts](../src/application/splitBill.ts).
- 2026-11-15: Ein eigener Express-Fehlerhandler ordnet JSON-Parsefehler dem
  `body`-Fehler gemäß Annahme A-006 zu und beantwortet andere Fehler generisch
  mit HTTP 500, ohne sie zu protokollieren. Quelle: [Plan T-004](../.specs/active/0001-tip-splitter.plan.md),
  implementiert in [createApp.ts](../src/presentation/http/createApp.ts).
