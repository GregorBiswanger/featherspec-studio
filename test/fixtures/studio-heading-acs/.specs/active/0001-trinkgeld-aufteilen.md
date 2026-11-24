# Trinkgeld aufteilen

**Status:** In Progress
**Plan:** [0001-trinkgeld-aufteilen.plan.md](0001-trinkgeld-aufteilen.plan.md)

## 10. Akzeptanzkriterien

### AC-001 — Gültige Rechnung aufteilen

Wenn eine gültige Rechnung eingegeben wird, soll das System den Betrag auf alle Personen aufteilen.

> **Given** eine Rechnung von `60.00` **Then** vier Beträge.

### AC-002 — Geldbeträge runden

Das System soll jeden Betrag auf ganze Cent runden.

Der halbe Cent wird aufgerundet.

### AC-003 – Ungültige Eingabe ablehnen

Wenn die Eingabe ungültig ist, soll das System einen verständlichen Grund nennen.

#### Gründe

Negativ, null oder keine Zahl.

### AC-004: Trinkgeld wählen

Das System soll ein Trinkgeld in Prozent entgegennehmen.

### ~~AC-005 | Alte Regel~~

Entfällt.

### [Uncertain] AC-006

Das System soll die Eingabe speichern.

## 11. Klärungsprotokoll

1. AC-003 „verständlicher Grund“ → wörtliche Gründe festgelegt.
2. AC-002 ohne Beispiel für den halben Cent → Beispiel ergänzt.
3. AC-004/AC-006 wörtlich oder sinngemäß → wörtlich.
