# Restaurant-Rechnung mit Trinkgeld aufteilen

**Status:** In Progress
**Plan:** [0001-tip-splitter.plan.md](0001-tip-splitter.plan.md)

## 1. Ziel und Nutzen

Restaurantgäste sollen anhand von Rechnungsbetrag, Trinkgeld-Prozentsatz und
Personenzahl erfahren, was jede Person einschließlich Trinkgeld zahlt und wie
hoch das Gesamttrinkgeld ist. Die Gruppe soll ohne Kopfrechnen in Sekunden
eine centgenaue Aufteilung erhalten.

## 2. Nutzer

Ein Restaurantgast gibt die Werte für die gesamte Gruppe ein. Es gibt keine
Benutzerkonten oder unterschiedlichen Berechtigungsrollen.

## 3. Scope

### Im Scope
- Eine Rechnung mit einem gemeinsamen Trinkgeld-Prozentsatz aufteilen.
- Einzelbeträge für alle Personen und das Gesamttrinkgeld zurückgeben.
- Trinkgeld kaufmännisch runden und Rest-Cents der ersten Person zuweisen.
- Die bestätigten ungültigen Eingaben mit einer klaren Fehlermeldung ablehnen.
- Antwortzeit unter einer Sekunde als nicht verbindliches Ziel ohne Messvorgabe
  und ohne Test (AC-009).

### Nicht im Scope
- Login — weil der [Projektauftrag](../../.memory-bank/projectbrief.md) für v1
  nur die Aufteilung der drei Eingaben vorsieht.
- Speicherung — weil der Projektauftrag für v1 nur die Aufteilung der drei
  Eingaben vorsieht.
- Währungsumrechnung — weil der Projektauftrag für v1 nur die Aufteilung der
  drei Eingaben vorsieht.
- Aufteilung nach individuellen Bestellungen — weil der Projektauftrag für v1
  nur die Aufteilung der drei Eingaben vorsieht.
- Benutzeroberfläche — weil der [Projektauftrag](../../.memory-bank/projectbrief.md)
  für diese erste Version ausschließlich einen HTTP-Service vorsieht.

## 4. Fachlicher Ablauf und Regeln

1. Der Nutzer übergibt Rechnungsbetrag, Trinkgeld-Prozentsatz und Personenzahl.
   Der Trinkgeld-Prozentsatz ist eine Prozentzahl: `10` bedeutet 10 %.
2. Verletzt eine Eingabe eine Gültigkeitsregel aus Abschnitt 5, gibt der
   Service eine Fehlermeldung statt einer Berechnung zurück.
3. Der Service berechnet das Gesamttrinkgeld aus Rechnungsbetrag und Prozentsatz.
   Er rundet es kaufmännisch auf volle Cents: Ein halber Cent wird aufgerundet.
4. Der Service addiert das gerundete Trinkgeld zum Rechnungsbetrag.
5. Jede Person erhält zunächst den gleichen, auf volle Cents abgerundeten
   Anteil. Die erste Person übernimmt zusätzlich sämtliche verbleibenden Cents.
6. Der Service gibt die Einzelbeträge in Personenreihenfolge und das
   Gesamttrinkgeld mit jeweils zwei Nachkommastellen zurück. Die erste Person
   ist der erste Eintrag der Ausgabeliste. Ein Gesamtbetrag wird nicht ausgegeben.

Die Summe der Einzelbeträge muss exakt dem Rechnungsbetrag einschließlich des
gerundeten Gesamttrinkgelds entsprechen. Die erste Person kann durch diese
ausdrücklich gewählte Regel mehr als einen Cent zusätzlich übernehmen.

0 % Trinkgeld ist erlaubt und ergibt kein Trinkgeld. Ein Rechnungsbetrag von
0 ist bei sonst gültigen Eingaben erlaubt und ergibt für jede Person sowie
für das Gesamttrinkgeld 0,00.

## 5. Daten und Fehlerfälle

Eingaben sind ausschließlich Rechnungsbetrag, Trinkgeld-Prozentsatz und
Personenzahl. Die Ausgabe enthält einen Einzelbetrag pro Person sowie das
Gesamttrinkgeld. Namen oder weitere personenbezogene Angaben sind nicht erforderlich.
Unbekannte zusätzliche Eingabefelder werden ignoriert.

Gültigkeitsregeln — eine Eingabe ist nur gültig, wenn:

- Rechnungsbetrag, Trinkgeld-Prozentsatz und Personenzahl vorhanden und numerisch sind;
- der Rechnungsbetrag nicht negativ ist, 100.000,00 nicht überschreitet und
  höchstens zwei Nachkommastellen hat;
- der Trinkgeld-Prozentsatz nicht negativ ist, 100 nicht überschreitet und
  höchstens zwei Nachkommastellen hat;
- die Personenzahl ganzzahlig und größer als null ist und 1.000 nicht überschreitet.

Eine Fehlermeldung muss die ungültige Eingabe und den Grund benennen; ihr
Wortlaut ist nicht festgelegt. Bei mehreren ungültigen Eingaben meldet der
Service alle; die Reihenfolge der Meldungen ist nicht festgelegt. Eine
Fehlerantwort darf keine berechneten Einzelbeträge oder ein berechnetes
Gesamttrinkgeld enthalten.

Der Service speichert Rechnungsdaten und Berechnungsergebnisse weder in Dateien
noch in Datenbanken noch in Logs.

## 6. Akzeptanzkriterien

Die folgenden Kriterien sind verbindlich, mit Ausnahme des als nicht
verbindliches Ziel gekennzeichneten AC-009; „muss“ bezeichnet die bindende
Anforderung in der deutschen Dokumentensprache.

- **AC-001:** Bei gültigen Eingaben muss der Service genau einen Einzelbetrag
  je Person einschließlich Trinkgeld sowie das Gesamttrinkgeld zurückgeben.
  Alle ausgegebenen Geldbeträge müssen zwei Nachkommastellen aufweisen.
- **AC-002:** Der Service muss das Gesamttrinkgeld vor der Aufteilung
  kaufmännisch auf volle Cents runden.
  Beispiel: 10,05 mit 10 % ergeben 1,01 Gesamttrinkgeld und 11,06 Gesamtbetrag.
- **AC-003:** Die Summe aller Einzelbeträge muss exakt dem Rechnungsbetrag
  plus gerundetem Gesamttrinkgeld entsprechen.
- **AC-004:** Wenn bei der Aufteilung Rest-Cents entstehen, muss der Service
  sämtliche Rest-Cents der ersten Person (erster Eintrag der Ausgabeliste)
  zuweisen und für alle übrigen Personen den gleichen, auf volle Cents
  abgerundeten Anteil ausgeben.
  Beispiel: 10,00 mit 0 % für sechs Personen ergeben 1,70 für die erste
  Person und jeweils 1,66 für die fünf übrigen Personen.
- **AC-005:** Wenn die Personenzahl kleiner oder gleich null ist, muss der
  Service eine Fehlermeldung zurückgeben, die die Personenzahl und den Grund
  „muss größer als null sein“ benennt (Wortlaut nicht festgelegt), und darf
  kein Berechnungsergebnis zurückgeben. Die Tests prüfen mindestens 0 und -1.
- **AC-006:** Wenn der Trinkgeld-Prozentsatz negativ ist, muss der Service
  eine Fehlermeldung zurückgeben, die den Trinkgeld-Prozentsatz und den Grund
  „darf nicht negativ sein“ benennt (Wortlaut nicht festgelegt), und darf kein
  Berechnungsergebnis zurückgeben. Die Tests prüfen mindestens -1 und -0,01.
- **AC-007:** Wenn der Trinkgeld-Prozentsatz 0 beträgt und die übrigen
  Eingaben gültig sind, muss der Service die Rechnung ohne Trinkgeld aufteilen
  und 0,00 als Gesamttrinkgeld ausgeben.
- **AC-008:** Wenn der Rechnungsbetrag 0 beträgt und die übrigen Eingaben
  gültig sind, muss der Service für jede Person und das Gesamttrinkgeld
  0,00 ausgeben.
- **AC-009 (nicht verbindliches Ziel):** Der Service soll auf eine gültige
  Berechnungsanfrage in weniger als einer Sekunde antworten. Messgrenze,
  Umgebung und Last werden bewusst nicht festgelegt; es gibt keinen Test und
  keinen Nachweis, und dieses Ziel blockiert weder Planung noch Abschluss.
- **AC-010:** Der Service muss Berechnungen ohne Login ermöglichen und darf
  Rechnungsdaten oder Berechnungsergebnisse weder in Dateien noch in
  Datenbanken noch in Logs speichern.
- **AC-011:** Wenn der Rechnungsbetrag negativ ist, muss der Service eine
  Fehlermeldung zurückgeben, die den Rechnungsbetrag und den Grund benennt,
  und darf kein Berechnungsergebnis zurückgeben.
- **AC-012:** Wenn Rechnungsbetrag, Trinkgeld-Prozentsatz oder Personenzahl
  fehlt oder nicht numerisch ist, muss der Service eine Fehlermeldung
  zurückgeben, die die betroffene Eingabe benennt, und darf kein
  Berechnungsergebnis zurückgeben.
- **AC-013:** Wenn die Personenzahl nicht ganzzahlig ist, der Rechnungsbetrag
  mehr als zwei Nachkommastellen hat oder der Trinkgeld-Prozentsatz mehr als
  zwei Nachkommastellen hat, muss der Service eine Fehlermeldung zurückgeben,
  die die betroffene Eingabe und den Grund benennt, und darf kein
  Berechnungsergebnis zurückgeben.
- **AC-014:** Wenn der Rechnungsbetrag 100.000,00, der Trinkgeld-Prozentsatz
  100 oder die Personenzahl 1.000 überschreitet, muss der Service eine
  Fehlermeldung zurückgeben, die die betroffene Eingabe und den Grund benennt,
  und darf kein Berechnungsergebnis zurückgeben.

## 7. Technische Hinweise

- Greenfield-Projekt; Anwendung, Manifeste und ausführbare Tests sind
  implementiert.
- Der [technische Kontext](../../.memory-bank/techContext.md) hält TypeScript,
  Node.js, Express.js, npm, ESLint und den Node.js-Test-Runner fest.
- Der [Architektur-Snapshot](../../AGENTS.md#architecture--design-snapshot-must-sync)
  hält die implementierte Onion Architecture fest.
- HTTP-Vertrag, Geldrepräsentation und konkrete Dateien werden in `/sdd-plan`
  entschieden; die Geldrepräsentation muss die Cent-Invarianten erhalten.
- Qualitätsprüfungen und TDD-Freigabestopps gelten gemäß
  [Arbeitspräferenzen](../../AGENTS.md#current-preferences) und
  [Prüfkommandos](../../.memory-bank/techContext.md#quality-gates).
- Die zuletzt bestätigte Regel „alle Rest-Cents an die erste Person“ ersetzt
  die anfängliche Verteilung je eines Rest-Cents an mehrere erste Personen.

## 8. Annahmen

| ID | Annahme | Begründung | Folge bei Irrtum |
| --- | --- | --- | --- |
| A-001 | _Erledigt:_ als Gültigkeitsregel übernommen (Abschnitt 5, AC-013). | — | — |
| A-002 | _Erledigt:_ als Gültigkeitsregel übernommen (Abschnitt 5, AC-011, AC-013). | — | — |
| A-003 | _Entfallen:_ AC-009 ist ein nicht verbindliches Ziel ohne Messgrenze. | — | — |
| A-004 | Alle Beträge sind in einer nicht benannten Währung mit 100 Untereinheiten (Cents). | Die Spec verlangt eine centgenaue Aufteilung; eine Währung wird nirgends genannt. | Rundung, Rest-Cent-Regel und Nachkommastellen müssen für die tatsächliche Währung angepasst werden. |
| A-005 | Ein numerischer String ist eine Dezimalzahl in Punktnotation ohne Leerzeichen, Exponent oder Tausendertrenner (z. B. `"10.05"`, `"-1"`); `"10,05"` oder `"1e2"` gelten als nicht numerisch. | Nutzer hat numerische Strings zugelassen (Plan-Checkpoint 2026-11-15); die genaue Schreibweise wurde nicht genannt. | Das Format der akzeptierten Strings muss erweitert werden; Validierungstests ändern sich. |
| A-006 | Ungültiges JSON oder ein Body, der kein JSON-Objekt ist, ergibt HTTP 400 mit einer Fehlermeldung für `body` und ohne Berechnungsergebnis. | Die Spec regelt den Fall nicht; Nutzerentscheid im Plan-Checkpoint 2026-11-15. | Fehlerantwort für diesen Fall anpassen. |

## 9. Offene Punkte

- **OP-001 — Erledigt (Clarify 2026-11-15):** Obergrenzen 100.000,00, 100 %
  und 1.000 Personen beschlossen; Prozentsatz mit höchstens zwei
  Nachkommastellen (Abschnitt 5, AC-013, AC-014).
- **OP-002 — Erledigt (Clarify 2026-11-15):** A-001 und A-002 als Regeln
  übernommen; fehlende oder nicht numerische Eingaben ergeben einen Fehler (AC-012).
- **OP-003 — Entfallen (Clarify 2026-11-15):** Antwortzeit ist ein nicht
  verbindliches Ziel ohne Messvorgabe und ohne Test (AC-009).
- **OP-004 — Erledigt (Plan-Checkpoint 2026-11-15):** `POST /split` mit
  JSON `{"billAmount", "tipPercentage", "numberOfPeople"}`; Eingaben als
  JSON-Zahl oder numerischer String (A-005). Erfolg: HTTP 200
  `{"amountsPerPerson": ["5.53", "5.53"], "totalTip": "1.01"}` — Geldbeträge
  als Strings mit genau zwei Nachkommastellen. Fehler: HTTP 400
  `{"errors": [{"field": "<Eingabe>", "message": "<Grund>"}]}`; kaputter Body
  siehe A-006.
- **Erledigt:** Rest-Cent-Regel durch die letzte Nutzervorgabe geklärt;
  keine Verteilung der Rest-Cents auf mehrere Personen.
- **Erledigt (Clarify 2026-11-15, Vorschläge vom Nutzer gesammelt bestätigt):**
  negativer Rechnungsbetrag ist ein Fehler (AC-011) · Prozentsatz als
  Prozentzahl (`10` = 10 %) · Fehlermeldungen benennen Eingabe und Grund,
  Wortlaut nicht festgelegt · kein Gesamtbetrag in der Ausgabe · erste Person =
  erster Eintrag der Ausgabeliste · „nicht speichern“ = weder Dateien noch
  Datenbanken noch Logs (AC-010) · AC-006 prüft -1 und -0,01 · Akteure in
  AC-004/AC-005 ergänzt · alle ungültigen Eingaben werden gemeldet · unbekannte
  Felder werden ignoriert · Begründungen unter *Nicht im Scope* auf den
  Projektauftrag gestützt · Währung mit 100 Untereinheiten als Annahme A-004.

## 10. Bereitschaft und Abschluss

Die Spezifikation ist bereit für die Implementierung; OP-004 ist im
Plan-Checkpoint entschieden.

Die Implementierung ist abgeschlossen, wenn alle verbindlichen
Akzeptanzkriterien (alle außer AC-009) nachgewiesen
sind, die vereinbarten Tests und Qualitätsprüfungen ohne Warnungen oder Fehler
bestehen, keine ausgeschlossenen Funktionen hinzugefügt wurden, Annahmen
bestätigt oder korrigiert sind, relevante Dokumentation und Architektur synchron
sind und der Auftraggeber das Ergebnis akzeptiert hat.

Nächster Schritt: Nach erfolgreicher `/sdd-compile`-Prüfung und
Auftraggeberakzeptanz die Spezifikation mit `/sdd-lifecycle` nach `done/`
überführen.
