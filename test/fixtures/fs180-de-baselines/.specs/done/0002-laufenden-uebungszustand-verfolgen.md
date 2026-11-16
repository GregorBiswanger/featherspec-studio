# Laufenden Übungszustand verfolgen

**Status:** Baseline
**Plan:** _none_
**Origin:** Reverse — Brownfield
**Validated by:** Gregor Biswanger · 2026-09-24

## Zusammenfassung

Workshop-Teilnehmer sehen in ihrer Übungsansicht, ob sie aktuell als übend oder fertig gelten (AC-001). Start und Stopp durch den Trainer ändern diese Anzeige (AC-002, AC-003).

## Benutzer und Rollen

- **Workshop-Teilnehmer:** verfolgt den sichtbaren Übungszustand.
- **Trainer:** startet oder stoppt die Übung für die Session.

## Umfang

### Im Umfang

- Sichtbarer Ausgangszustand der Übungsansicht.
- Zustandsänderungen durch Start und Stopp des Trainers.
- Wiederherstellung des persönlichen Zustands nach einer Verbindungsunterbrechung.

### Außerhalb des Umfangs

- Beitritt zu einer Session — Baseline `0001-einer-handsup-session-beitreten.md`.
- Änderung des persönlichen Übungsstatus — eigene Capability.
- Verlassen oder Beenden einer Session — eigene Capability.

## Funktionsablauf

1. Die Übungsansicht zeigt zunächst den fertigen Zustand (AC-001).
2. Startet der Trainer die Übung, wechselt die Anzeige zum übenden Zustand (AC-002).
3. Beendet der Trainer die Übung, wechselt die Anzeige zum fertigen Zustand (AC-003).

## Geschäftsregeln

- BR-01 Bei Start oder Stopp einer Übung setzt das System alle zu diesem Zeitpunkt in der Session vorhandenen Teilnehmer zunächst auf übend beziehungsweise fertig; eine spätere persönliche Meldung kann den eigenen Zustand wieder ändern.

## Fehlerfälle

- Bei Problemen während der Wiederverbindung gelten die Findings unter den offenen Punkten.

## Akzeptanzkriterien

- AC-001 Wenn ein Teilnehmer die Übungsansicht öffnet und noch keine andere Zustandsinformation erhalten hat, shall das System grün `Übung fertig!` anzeigen und `Ich bin fertig` markieren.
- AC-002 Wenn der Trainer die Übung startet und diese Änderung den verbundenen Teilnehmer erreicht, shall das System ihm rot `Übung läuft!` anzeigen und `Ich übe` markieren.
- AC-003 Wenn der Trainer die Übung beendet und diese Änderung den verbundenen Teilnehmer erreicht, shall das System ihm grün `Übung fertig!` anzeigen und `Ich bin fertig` markieren.

## Annahmen

| ID | Annahme | Begründung | Auswirkung, falls falsch |
| --- | --- | --- | --- |
| A-001 | Trainer und Teilnehmer verwenden dieselbe Session während der Übung. | Der beobachtete Ablauf ordnet Zustandsänderungen über den gemeinsamen Session-Code zu. | Änderungen des Trainers würden den betrachteten Teilnehmer nicht erreichen. |

## Offene Punkte

- [Uncertain] AC-004 wurde geprüft, aber nicht persönlich bestätigt: Wenn die Verbindung zu einer noch vorhandenen Session wiederhergestellt wird, der Teilnehmer dort noch vorhanden ist und dessen Zustandsaktualisierung die geöffnete Übungsansicht erreicht, zeigt das System seinen zuletzt gespeicherten persönlichen Übungszustand an.
- *Finding*: Ist die Session während einer Verbindungsunterbrechung beendet worden, bleibt die letzte oder anfängliche Statusanzeige ohne sichtbare Fehlermeldung stehen; das System versucht ungefähr eine Minute lang erneut, die Session zu erreichen, und hört dann ohne Meldung auf.
- *Finding*: Besteht die Session noch, aber der Teilnehmer ist darin nicht mehr vorhanden, bleibt nach der Wiederverbindung die letzte oder anfängliche Statusanzeige stehen und die Zustandsaktualisierung kann nicht verarbeitet werden.
- *Finding*: Nachdem ein Teilnehmer `Ich bin fertig` gewählt hat, sieht er `Übung fertig!`, während der Trainer die Übung weiterhin als laufend sehen kann, solange mindestens ein anderer Teilnehmer noch übt. Teilnehmer und Trainer können dadurch gleichzeitig unterschiedliche Aussagen darüber sehen, ob die Übung läuft.
- *Wish*: Gregor Biswanger möchte, dass die dokumentierten Findings bearbeitet werden.
- *Check*: Die Wiederherstellung des persönlichen Zustands hängt davon ab, dass die Zustandsnachricht nach Anmeldung der Ansicht eintrifft; der Anwendungscode puffert eine zu früh eintreffende Nachricht nicht selbst.
- *Check*: Der vorhandene Server-E2E-Test deckt Start, Stopp und Wiederverbindung nicht ab.
- Validierungsumfang: Gregor Biswanger bestätigte BR-01 sowie AC-001 bis AC-003; AC-004 wurde geprüft, aber war ihm nicht bekannt.

## Technical Reference

- Architektur: `AGENTS.md` → `clients/projects/members`, `clients/projects/trainer`, `server/src/training.gateway.ts`
- Teilnehmeranzeige: `clients/projects/members/src/app/exercise/*`
- Teilnehmerverbindung: `clients/projects/members/src/app/shared/training.service.ts`
- Trainersteuerung: `clients/projects/trainer/src/app/training/*`, `clients/projects/trainer/src/app/shared/training.service.ts`
- Vertrag: `server/src/training.gateway.ts › startExercise`, `stopExercise`, `memberReconnectTraining`
- Entscheidender Test: `server/test/app.e2e-spec.ts`
- Analysiert bei `51871f3` · 2026-09-24