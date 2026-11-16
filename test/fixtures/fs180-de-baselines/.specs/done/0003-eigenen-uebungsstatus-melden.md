# Eigenen Übungsstatus melden

**Status:** Baseline
**Plan:** _none_
**Origin:** Reverse — Brownfield
**Validated by:** Gregor Biswanger · 2026-09-24

## Zusammenfassung

Workshop-Teilnehmer können sich jederzeit als fertig oder übend melden. Die eigene Anzeige wechselt sofort (AC-001, AC-003).

## Benutzer und Rollen

- **Workshop-Teilnehmer:** meldet seinen persönlichen Übungsstatus.
- **Trainer:** sieht den gemeldeten Status je Teilnehmer und einen daraus abgeleiteten Gesamtzustand.

## Umfang

### Im Umfang

- Wechsel zwischen `Ich bin fertig` und `Ich übe`.
- Unmittelbare Anzeige beim Teilnehmer.
- Anzeige des persönlichen Zustands beim Trainer.

### Außerhalb des Umfangs

- Beitritt zur Session — Baseline `0001-einer-handsup-session-beitreten.md`.
- Start, Stopp und Wiederherstellung der Übungsanzeige — Baseline `0002-laufenden-uebungszustand-verfolgen.md`.
- Verlassen oder Beenden einer Session — eigene Capability.

## Funktionsablauf

1. Der Teilnehmer wählt `Ich bin fertig` oder `Ich übe` (AC-001, AC-003).
2. Seine eigene Anzeige wechselt unmittelbar zum gewählten Zustand (AC-001, AC-003).
3. Nach erfolgreicher Verarbeitung zeigt die Teilnehmerliste des Trainers den neuen persönlichen Zustand; diese codegestützten Aussagen stehen unter den offenen Punkten.

## Geschäftsregeln

- BR-01 Ein in einer vorhandenen Session vorhandener Teilnehmer kann seinen persönlichen Status ohne zeitliche oder mengenmäßige Begrenzung wechseln; maßgeblich ist die zuletzt erfolgreich verarbeitete Meldung, bis sie durch eine weitere persönliche Meldung oder einen Start beziehungsweise Stopp des Trainers ersetzt wird.

## Fehlerfälle

- Bei einer nicht verarbeiteten Statusmeldung oder einer wiederhergestellten Session gelten die Findings unter den offenen Punkten.

## Akzeptanzkriterien

- AC-001 Wenn ein Teilnehmer `Ich bin fertig` wählt, shall das System ihm sofort grün `Übung fertig!` anzeigen und `Ich bin fertig` markieren.
- AC-003 Wenn ein Teilnehmer `Ich übe` wählt, shall das System ihm sofort rot `Übung läuft!` anzeigen und `Ich übe` markieren.

## Annahmen

| ID | Annahme | Begründung | Auswirkung, falls falsch |
| --- | --- | --- | --- |
| A-001 | Teilnehmer und Trainer betrachten dieselbe Session. | Die Statusmeldung wird anhand des gemeinsamen Session-Codes zugeordnet. | Der Trainer würde die Meldung dieses Teilnehmers nicht sehen. |

## Offene Punkte

- [Uncertain] AC-002 konnte der Teilnehmer nicht selbst sehen: Nach erfolgreich verarbeiteter Fertigmeldung zeigt das System dem Trainer neben dem Namen ein grünes Symbol mit `Fertig` an.
- [Uncertain] AC-004 konnte der Teilnehmer nicht selbst sehen: Nach erfolgreich verarbeiteter Übenmeldung zeigt das System dem Trainer neben dem Namen ein rotes Symbol mit `Sitzt an der Übung` an.
- *Finding*: Die eigene Anzeige bestätigt `Ich bin fertig` oder `Ich übe` sofort, auch wenn die Session oder der Teilnehmer bei der Verarbeitung nicht mehr vorhanden ist; der Trainer behält dann den bisherigen Zustand und der Teilnehmer sieht keinen Fehler. Ob eine während einer Verbindungsunterbrechung abgesendete Meldung später übermittelt wird, ist nicht festgelegt.
- *Finding*: Wer Session-Code und Benutzername eines Teilnehmers kennt, kann dessen Statusmeldung ohne weitere Identitätsprüfung absenden. Der Trainer sieht den fremd ausgelösten Wechsel; der betroffene Teilnehmer sieht ihn erst, wenn sein gespeicherter Zustand bei einer späteren Wiederverbindung aktualisiert wird.
- *Finding*: Geht die serverseitige Session verloren, kann der Trainer sie aus seiner zuletzt empfangenen Teilnehmerliste wiederherstellen. Eine zwischenzeitlich nur lokal sichtbare Statusmeldung eines Teilnehmers geht dabei verloren; nach der nächsten Wiederverbindung kann dessen Anzeige auf den älteren Status zurückspringen.
- *Finding*: Die Desktop-Fortschrittsanzeige des Trainers kann einen falschen Anteil fertiger Teilnehmer zeigen; bei einem von zwei fertigen Teilnehmern wird beispielsweise 20 Prozent statt 50 Prozent berechnet, und bei keinem fertigen Teilnehmer entsteht kein gültiger Fortschrittswert.
- *Wish*: Gregor Biswanger möchte, dass die dokumentierten Findings bearbeitet werden.
- *Check*: Der vorhandene Server-E2E-Test deckt persönliche Statusmeldungen und ihre Fehlerwege nicht ab.
- Validierungsumfang: Gregor Biswanger bestätigte BR-01, AC-001 und AC-003; AC-002 und AC-004 waren nur für den Trainer sichtbar und wurden anhand des Codes geprüft.

## Technical Reference

- Architektur: `AGENTS.md` → `clients/projects/members`, `clients/projects/trainer`, `server/src/training.gateway.ts`
- Teilnehmeraktionen: `clients/projects/members/src/app/exercise/*`
- Übermittlung: `clients/projects/members/src/app/shared/training.service.ts`
- Verarbeitung: `server/src/training.gateway.ts › memberExerciseFinish`, `memberExerciseRestart`
- Traineranzeige: `clients/projects/trainer/src/app/training/*`
- Desktop-Fortschritt: `clients/projects/trainer/src/app/shared/electron.service.ts`, `desktop/main.js`
- Entscheidender Test: `server/test/app.e2e-spec.ts`
- Analysiert bei `51871f3` · 2026-09-24