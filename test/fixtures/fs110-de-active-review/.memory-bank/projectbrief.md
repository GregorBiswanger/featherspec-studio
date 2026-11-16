# Projektauftrag

## Mission
Tip Splitter ist ein winziger HTTP-Service, der eine Restaurant-Rechnung fair auf
mehrere Personen aufteilt. Eingaben sind Rechnungsbetrag, Trinkgeld-Prozentsatz und
Personenzahl; ausgegeben werden der Betrag pro Person und das Gesamttrinkgeld.

## Primäre Nutzer
Restaurantgäste.

## Erfolgskriterien
- Der Service nimmt die drei vereinbarten Eingaben über HTTP entgegen.
- Die Antwort enthält den Betrag pro Person und das Gesamttrinkgeld.
- Die Aufteilung folgt einer nachvollziehbaren, ausdrücklich vereinbarten Fairness-
  und Rundungsregel.
- Geldpräzision, zulässige Eingaben und Fehlerantworten werden vor der Implementierung
  als prüfbare Akzeptanzkriterien spezifiziert.

Die konkreten Regeln und das HTTP-Vertragsformat sind noch nicht festgelegt.
