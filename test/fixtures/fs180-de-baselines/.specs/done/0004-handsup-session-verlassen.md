# HandsUp-Session verlassen

**Status:** Baseline
**Plan:** _none_
**Origin:** Reverse — Brownfield
**Validated by:** Gregor Biswanger · 2026-09-25

## Zusammenfassung

Ein Workshop-Teilnehmer kann die Session selbst verlassen (AC-001), vom Trainer entfernt werden (AC-002) oder durch das Trainingsende ausscheiden (AC-003). Alle drei Wege führen ohne Bestätigung zur gleichen Abschlussansicht.

## Benutzer und Rollen

- **Workshop-Teilnehmer:** verlässt die Session oder wird aus ihr entfernt.
- **Trainer:** entfernt einzelne Teilnehmer oder beendet die gesamte Session.

## Umfang

### Im Umfang

- Freiwilliges Verlassen durch den Teilnehmer.
- Entfernung eines Teilnehmers durch den Trainer.
- Ende der gesamten Session durch den Trainer.
- Sichtbare Abschlussansicht und verbleibender Teilnehmerzustand.

### Außerhalb des Umfangs

- Beitritt zur Session — Baseline `0001-einer-handsup-session-beitreten.md`.
- Übungszustand und persönliche Statusmeldung — Baselines `0002-laufenden-uebungszustand-verfolgen.md` und `0003-eigenen-uebungsstatus-melden.md`.

## Funktionsablauf

1. Der Teilnehmer wählt `Training verlassen`, der Trainer entfernt ihn oder der Trainer beendet das Training (AC-001 bis AC-003).
2. Bei erfolgreicher Verarbeitung wird der Teilnehmer beziehungsweise die Session entfernt (AC-001 bis AC-003).
3. Der betroffene Teilnehmer sieht die Abschlussansicht mit `Danke das Du dabei warst!` (AC-001 bis AC-003).

## Geschäftsregeln

- BR-01 Freiwilliges Verlassen, Entfernung durch den Trainer und Trainingsende verlangen keine Bestätigung und zeigen dem Teilnehmer denselben Abschluss ohne Angabe des Ausstiegsgrunds.

## Fehlerfälle

- Kann ein freiwilliger Ausstieg nicht verarbeitet werden, gelten die Findings unter den offenen Punkten.
- Wird ein unbekannter Teilnehmer oder eine unbekannte Session adressiert, gelten die Findings unter den offenen Punkten.

## Akzeptanzkriterien

- AC-001 Wenn ein Teilnehmer `Training verlassen` wählt und sein Ausstieg erfolgreich verarbeitet wird, shall das System ihn aus der Teilnehmerliste entfernen, seine gespeicherten Zugangsdaten leeren und ihm `Danke das Du dabei warst!` anzeigen.
- AC-002 Wenn der Trainer einen vorhandenen Teilnehmer entfernt, shall das System ihn aus der Teilnehmerliste entfernen und ausschließlich dem entfernten Teilnehmer `Danke das Du dabei warst!` anzeigen; die Traineransicht zeigt keine Dankeseite.
- AC-003 Wenn der Trainer die Session beendet, shall das System die Session entfernen und den verbundenen Teilnehmern `Danke das Du dabei warst!` anzeigen.

## Annahmen

| ID | Annahme | Begründung | Auswirkung, falls falsch |
| --- | --- | --- | --- |
| A-001 | Der Teilnehmer erkennt die gemeinsame Abschlussseite als Ende seiner Teilnahme. | Alle drei Ausstiegswege führen ausschließlich zu dieser Seite. | Der Abschluss wäre für Teilnehmer nicht verständlich. |

## Offene Punkte

- *Finding*: Beim freiwilligen Verlassen werden die gespeicherten Zugangsdaten sofort geleert. Bleibt das Abschlussereignis aus, etwa weil die Session nicht mehr vorhanden ist, bleibt der Teilnehmer ohne Fehlermeldung in der Übungsansicht, während die Trainerliste unverändert bleibt; weitere persönliche Meldungen verwenden dann leere Zugangsdaten.
- *Finding*: Wird bei vorhandener Session ein darin nicht vorhandener Benutzername zum freiwilligen Verlassen oder Entfernen übermittelt, entfernt das System stattdessen den letzten Teilnehmer der Liste. Beim freiwilligen Verlassen sieht der anfragende Teilnehmer dennoch die Abschlussseite; beim Trainer kann dies auftreten, wenn seine sichtbare Liste gegenüber der Session veraltet ist.
- *Finding*: Beendet der Trainer mit einem nicht vorhandenen Session-Code das Training und besteht mindestens eine andere Session, entfernt das System deren letzten Eintrag. Deren Teilnehmer bleiben ohne Abschlussmeldung in ihrer aktuellen Ansicht, obwohl ihre Session nicht mehr besteht.
- *Finding*: Nach Entfernung durch den Trainer oder nach Trainingsende bleiben die Zugangsdaten des Teilnehmers gespeichert. Beim erneuten Öffnen der Startseite in der veröffentlichten Anwendung kann ein entfernter Teilnehmer zunächst wieder zur Übungsansicht gelangen, obwohl er nicht mehr zur Session gehört; nach einem Trainingsende wird der alte Session-Code nicht dauerhaft geleert und bei jedem weiteren Aufruf erneut verwendet.
- *Wish*: Gregor Biswanger möchte, dass die dokumentierten Findings bearbeitet werden.
- *Check*: Nach dem Wechsel zur Abschlussseite bleiben nicht ausgelöste Session-Listener registriert; der Anwendungscode entfernt sie nicht ausdrücklich.
- *Check*: Kein automatisierter Test im untersuchten Ausstiegsfluss prüft freiwilliges Verlassen, Entfernung oder Trainingsende.
- Validierungsumfang: Gregor Biswanger bestätigte BR-01 und AC-001 bis AC-003; bei AC-002 stellte er klar, dass ausschließlich der entfernte Teilnehmer die Dankeseite sieht.

## Technical Reference

- Architektur: `AGENTS.md` → `clients/projects/members`, `clients/projects/trainer`, `server/src/training.gateway.ts`
- Teilnehmerausstieg: `clients/projects/members/src/app/exercise/*`, `clients/projects/members/src/app/shared/training.service.ts`
- Abschlussansicht: `clients/projects/members/src/app/thanks/*`
- Traineraktionen: `clients/projects/trainer/src/app/training/*`, `clients/projects/trainer/src/app/shared/training.service.ts`
- Verarbeitung: `server/src/training.gateway.ts › memberLeavesTraining`, `removeMember`, `exitTraining`
- Entscheidender Test: `server/test/app.e2e-spec.ts`
- Analysiert bei `51871f3` · 2026-09-24