# Einer HandsUp-Session beitreten

**Status:** Baseline
**Plan:** _none_
**Origin:** Reverse — Brownfield
**Validated by:** Gregor Biswanger · 2026-09-24

## Zusammenfassung

Workshop-Teilnehmer geben einen Session-Code und einen Benutzernamen ein, um die Übungsansicht einer vorhandenen HandsUp-Session zu öffnen (AC-001). Ein unbekannter Session-Code wird sichtbar abgelehnt (AC-003).

## Benutzer und Rollen

- **Workshop-Teilnehmer:** tritt einer Session bei und sieht die Übungsansicht.
- **Trainer:** sieht neu beigetretene Teilnehmer in der Teilnehmerliste.

## Umfang

### Im Umfang

- Beitritt über Session-Code und Benutzername.
- Sichtbarer Erfolg oder Fehler des Beitritts.
- Wiederaufnahme einer zuvor gespeicherten Session beim erneuten Öffnen.

### Außerhalb des Umfangs

- Steuerung und Anzeige einer laufenden Übung — eigene Capability.
- Meldung des persönlichen Übungsstatus — eigene Capability.
- Verlassen oder Beenden einer Session — eigene Capability.

## Funktionsablauf

1. Der Teilnehmer gibt Session-Code und Benutzername ein und wählt `Training beitreten` (AC-001).
2. Bei Erfolg öffnet das System die Übungsansicht.
3. Bei einem unbekannten Code bleibt der Teilnehmer auf der Startseite und sieht den Fehler (AC-003).

## Geschäftsregeln

- BR-02 Innerhalb einer Session kann derselbe Benutzername nur einmal neu beitreten.

## Fehlerfälle

- Ein unbekannter Session-Code wird nach AC-003 abgelehnt.
- Weitere codegestützte, aber nicht persönlich bestätigte Fehlerfälle stehen unter den offenen Punkten.

## Akzeptanzkriterien

- AC-001 Wenn ein Teilnehmer einen vorhandenen Session-Code und einen noch nicht vorhandenen Benutzernamen absendet, shall das System die Übungsansicht öffnen, ihn mit `Hi <Benutzername>` begrüßen und zunächst `Übung fertig!` anzeigen.
- AC-003 Wenn ein Teilnehmer einen unbekannten Session-Code absendet, shall das System auf der Startseite bleiben und `Session Code ungültig.` anzeigen.

## Annahmen

| ID | Annahme | Begründung | Auswirkung, falls falsch |
| --- | --- | --- | --- |
| A-001 | Der Teilnehmer erhält den Session-Code außerhalb dieser Webseite vom Trainer. | Nutzeraussage vom 24.09.2026. | Der Einstieg in den beschriebenen Beitrittsfluss wäre unvollständig. |

## Offene Punkte

- [Uncertain] BR-01 wurde geprüft, aber nicht persönlich bestätigt: Session-Codes und Benutzernamen werden exakt verglichen; Unterschiede bei Groß-/Kleinschreibung und Leerzeichen bleiben bestehen.
- [Uncertain] AC-002 konnte der Teilnehmer nicht selbst sehen: Wenn ein Teilnehmer erfolgreich beitritt, nimmt das System ihn als fertig in die Teilnehmerliste des Trainers auf.
- [Uncertain] AC-004 wurde geprüft, aber nicht persönlich bestätigt: Wenn ein Teilnehmer einen bereits vorhandenen Benutzernamen absendet, bleibt das System auf der Startseite und zeigt `Benutzername ist bereits vorhanden.` an.
- [Uncertain] AC-005 wurde geprüft, aber nicht persönlich bestätigt: Beim erneuten Öffnen einer gespeicherten Session öffnet das System bei noch vorhandener Session die Übungsansicht und bei nicht mehr vorhandener Session die Startseite.
- *Finding*: Ein Teilnehmer kann mit einem leeren oder nur aus Leerzeichen bestehenden Benutzernamen beitreten; dadurch kann die Teilnehmerliste Personen ohne erkennbaren Namen enthalten. Die Webseite prüft außerdem keine Länge des Namens.
- *Finding*: Nach der Ablehnung eines bereits vorhandenen Benutzernamens bleibt diese Eingabe gespeichert; beim erneuten Öffnen kann der Teilnehmer die Übungsansicht mit dem Zustand des bereits vorhandenen Mitglieds betreten.
- *Finding*: Nach der Ablehnung eines unbekannten Session-Codes bleibt dieser gespeichert und löst bei jedem erneuten Öffnen wieder einen erfolglosen Wiederaufnahmeversuch aus.
- *Finding*: Ein Teilnehmer kann die Übungsansicht direkt öffnen, ohne dass sein Beitritt bestätigt wurde; die Seite kann dadurch einen Namen und Übungszustand anzeigen, obwohl keine Verbindung zur Session besteht.
- *Finding*: Wenn die Session noch besteht, der gespeicherte Benutzername darin aber nicht mehr vorkommt, öffnet das System dennoch die Übungsansicht und zeigt zunächst den gespeicherten Namen sowie `Übung fertig!`; die anschließende Zustandsaktualisierung kann nicht verarbeitet werden.
- *Finding*: Die fachliche Beschreibung nennt den Beitritt mit einem Namen; das ausgelieferte Verhalten lässt auch einen leeren Namen zu.
- *Wish*: Gregor Biswanger möchte, dass die dokumentierten Findings bearbeitet werden.
- *Check*: Der vorhandene Server-E2E-Test deckt Beitritt, Ablehnungen und Wiederaufnahme nicht ab.
- Validierungsumfang: Gregor Biswanger bestätigte BR-02, AC-001 und AC-003; BR-01, AC-004 und AC-005 wurden geprüft, aber waren ihm nicht bekannt; AC-002 war nur für den Trainer sichtbar und wurde anhand des Codes geprüft.

## Technical Reference

- Architektur: `AGENTS.md` → `clients/projects/members`, `server/src/training.gateway.ts`
- Primäre Implementierung: `clients/projects/members/src/app/welcome/*`, `clients/projects/members/src/app/shared/training.service.ts`
- Wiederaufnahme: `clients/projects/members/src/app/shared/member-session.guard.ts`, `server/src/training.gateway.ts › memberReconnectTraining`
- Vertrag: `server/src/training.gateway.ts › memberLogin`, `memberReconnectTraining`
- Entscheidender Test: `server/test/app.e2e-spec.ts`
- Analysiert bei `51871f3` · 2026-09-24