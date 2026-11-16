# FeatherSpec Studio

## Product Owner Handoff -- Product Concept, MVP Scope und initialer Spezifikationsfahrplan

**Dokumentversion:** 1.0\
**Status:** Arbeitsgrundlage für Product Discovery und Spezifikation\
**Produkt:** FeatherSpec Studio\
**Plattform:** Visual Studio Code Desktop Extension\
**Produktkategorie:** Visual Command Center for Spec-Driven Development\
**Claim:** *See everything. Control every agent. Build with specs.*

------------------------------------------------------------------------

## 0. Zweck dieses Dokuments

Dieses Dokument ist die zentrale Übergabe an den Product Owner (PO). Es
beschreibt Produktvision, Zielgruppen, MVP-Umfang, Benutzerabläufe,
Domänenmodell, Architekturleitplanken, priorisierten Backlog, initiale
Requirements und Acceptance Criteria sowie den Prozess, mit dem daraus
implementierungsreife FeatherSpec-Spezifikationen entstehen.

Der PO soll dieses Dokument nicht ungeprüft als endgültige technische
Wahrheit behandeln. Insbesondere müssen das tatsächliche
FeatherSpec-Repository, dessen Dateiformate, Lifecycle-Konventionen und
vorhandene Verifikationsabläufe vor der Freigabe der ersten
Implementierungsspecs untersucht werden.

**Wichtige Genauigkeitsgrenze:** Die genaue aktuelle Struktur des
FeatherSpec-Repositories und alle darin verwendeten Markdown-Schemata
sind in diesem Dokument nicht durch einen aktuellen Repository-Checkout
verifiziert. Wo konkrete Ordner, Felder oder Konventionen relevant sind,
sind sie daher als Discovery-Aufgabe gekennzeichnet. Der PO soll keine
neue Struktur erfinden, bevor die bestehende Struktur auditiert wurde.

### Ergebnis, das mit diesem Dokument erreicht werden soll

Ein Product Owner kann:

1.  das Produktziel und den MVP-Scope erklären;
2.  die vorhandenen FeatherSpec-Artefakte systematisch untersuchen;
3.  die Domäne und Statusübergänge verbindlich festlegen;
4.  die initialen Epics und Specs priorisieren;
5.  Requirements und Acceptance Criteria vervollständigen;
6.  offene Produkt- und Architekturentscheidungen sichtbar steuern;
7.  dem Entwicklungsteam einen geordneten, überprüfbaren Start
    ermöglichen.

------------------------------------------------------------------------

# 1. Produktvision und Positionierung

## 1.1 Vision

FeatherSpec Studio ist das visuelle Command Center für Spec-Driven
Development und KI-gestützte Softwareentwicklung.

Es macht den gesamten Spec-to-Code-Prozess in Visual Studio Code
sichtbar und steuerbar: von Requirements, Specs und
Implementierungsplänen über KI-Agent-Ausführung und Dateiänderungen bis
hin zu Tests, Verifikation und Review.

Entwickler sollen nicht mehr Markdown-Dateien, Terminals und
verschiedene Agent-Chats durchsuchen müssen, um den Projektzustand zu
verstehen.

**Leitgedanke:** Nicht nur anzeigen, welche Specs existieren, sondern
sichtbar machen, was geplant ist, was gerade passiert, warum etwas
blockiert ist, welcher Agent woran arbeitet und ob das Ergebnis die
Anforderungen erfüllt.

## 1.2 Produktpositionierung

FeatherSpec Studio verbindet drei Bereiche:

1.  **Spec Intelligence:** Specs, Requirements, Acceptance Criteria,
    Tasks, Abhängigkeiten und Verifikationsnachweise verstehen und
    visualisieren.
2.  **Agent Intelligence:** Agent-Sessions, Aktivitäten, Tool-Aufrufe,
    Dateiänderungen, Fehler und Freigabeanforderungen beobachten.
3.  **Agent Orchestration:** Agenten aus dem Spec-Workflow heraus
    starten, zuordnen, kontrollieren und ihre Ergebnisse in den
    Lifecycle zurückführen.

Das Studio ist kein reiner Markdown-Viewer, kein gewöhnliches Kanban und
kein isoliertes Agent-Monitoring-Dashboard. Der Mehrwert entsteht durch
die Verbindung dieser Bereiche auf einer gemeinsamen Datenbasis.

## 1.3 Zielgruppen

### Primäre Zielgruppen

-   Softwareentwickler, die Spec-Driven Development einsetzen.
-   Entwickler, die Coding-Agenten wie GitHub Copilot, Claude Code oder
    Codex verwenden.
-   Softwarearchitekten, die Requirements, Abhängigkeiten und technische
    Umsetzung koordinieren.
-   Tech Leads, die Agenten-gestützte Entwicklungsarbeit nachvollziehen
    und steuern.

### Sekundäre Zielgruppen

-   Product Owner.
-   Engineering Manager.
-   AI Engineers.
-   Entwicklungsteams, die mehrere Agent-Provider einsetzen.

## 1.4 Produktversprechen

Ein Entwickler kann in einer Oberfläche:

-   den Zustand eines FeatherSpec-Projekts verstehen;
-   Specs visuell verwalten;
-   eine implementierungsbereite Spec aktivieren;
-   einen Coding-Agenten starten;
-   den Agent-Fortschritt und verfügbare Aktivitäten verfolgen;
-   Ergebnisse prüfen und die Spec verifizieren.

------------------------------------------------------------------------

# 2. Verbindliche Produktentscheidungen

Die folgenden Entscheidungen wurden als Produktvorgaben festgelegt.

  -----------------------------------------------------------------------
  Bereich                             Entscheidung
  ----------------------------------- -----------------------------------
  Plattform                           Visual Studio Code Desktop

  MVP-Oberfläche                      VS-Code-Extension mit integrierter
                                      visueller Oberfläche

  Agent-Strategie                     Provider-neutrale Architektur;
                                      mehrere Provider als Produktziel

  MVP-Agenten                         Ein Provider wird zuerst produktiv
                                      integriert; weitere Provider folgen
                                      über Adapter

  Spec Source of Truth                Bestehende FeatherSpec-Artefakte

  MVP                                 Mission Control, Spec Board, Spec
                                      Detail, erster Agent-Start und
                                      grundlegendes Monitoring

  Multi-Agent-Ausführung              Nicht Teil des MVP; Architektur
                                      soll spätere Erweiterung
                                      ermöglichen

  Web-/Cloud-App                      Nicht Teil des MVP

  Andere IDEs                         Nicht Teil des MVP
  -----------------------------------------------------------------------

## 2.1 Provider-Strategie richtig interpretieren

„Multi-Provider" bedeutet für die Architektur:

-   Provider sind austauschbare Adapter.
-   Die Domain- und UI-Schicht kennt keine anbieterspezifischen
    SDK-Details.
-   Agent-Ereignisse werden in ein gemeinsames internes Modell
    übersetzt.
-   Fähigkeiten, die nicht jeder Provider unterstützt, werden explizit
    ausgewiesen.

Es bedeutet **nicht**, dass im MVP sofort drei Agenten vollständig
integriert werden müssen.

Empfehlung: Einen Provider als ersten vertikalen End-to-End-Pfad
produktiv integrieren. GitHub Copilot SDK ist ein bevorzugter Kandidat
für einen technischen Spike. Claude Agent SDK und OpenAI Codex SDK sind
weitere Kandidaten. Die endgültige Wahl wird anhand realer Tests
getroffen, nicht anhand von Marketing- oder Feature-Listen.

Die Verfügbarkeit von SDKs, Authentifizierungswegen, Modellzugriff,
Nutzungsrechten, Laufzeitvoraussetzungen und Session-Funktionen muss zum
Implementierungszeitpunkt anhand der offiziellen Dokumentation geprüft
werden. Ein bestehendes ChatGPT-, Claude- oder Copilot-Abonnement darf
nicht ohne Prüfung als Authentifizierung für eine
Drittanbieterintegration vorausgesetzt werden.

## 2.2 MVP -- In Scope

-   FeatherSpec-Projekt erkennen.
-   Bestehende Specs einlesen.
-   Bestehende Spec- und Plan-Inhalte strukturiert darstellen.
-   Lifecycle-Status abbilden und validieren.
-   Mission Control Dashboard.
-   Spec Board mit Drag & Drop.
-   Spec Detail View.
-   Readiness-Prüfung vor Agent-Aktivierung.
-   Provider-Abstraktion.
-   Ein produktiver Agent-Provider.
-   Agent-Run- und Session-Verwaltung.
-   Agent-Status und grundlegende Live-Events.
-   Agent-Fehler und Freigabezustände anzeigen.
-   Runtime-Daten persistent speichern.
-   Zustand nach Extension-Neustart sinnvoll wiederherstellen.

## 2.3 Explizit nicht im MVP

-   Mehrere gleichzeitig arbeitende Agenten pro Projekt.
-   Automatisches Scheduling und Agent-Routing.
-   Git-Worktree-Management.
-   Komplexe Dependency-Graph-Visualisierung.
-   Vollständiger Agent-Flow-Graph mit Subagent-Verzweigungen.
-   Session Replay.
-   Umfassende Token- und Kostenanalyse.
-   Multi-Project-Dashboard.
-   Team-/Cloud-Synchronisierung.
-   Andere IDEs.
-   Eigenständige Web-Anwendung.
-   Ersatz des bestehenden FeatherSpec-Formats.

------------------------------------------------------------------------

# 3. Produktprinzipien

Diese Prinzipien gelten als Leitplanken für alle Specs und
Architekturentscheidungen.

### P1 -- Visual First

Die wichtigsten Projektinformationen müssen visuell verständlich sein.
Markdown bleibt das zugrunde liegende Artefakt, aber nicht der einzige
Weg, den Projektzustand zu verstehen.

### P2 -- Single Source of Truth

Bestehende FeatherSpec-Dateien und etablierte Framework-Konventionen
bleiben maßgeblich. Das Studio darf keine widersprüchliche parallele
Spec-Verwaltung erzeugen.

### P3 -- Provider Independent

Die Domain- und UI-Schicht darf nicht direkt von Copilot-, Claude- oder
Codex-spezifischen APIs abhängen.

### P4 -- Human in Control

Agenten dürfen innerhalb ihrer freigegebenen Berechtigungen arbeiten.
Kritische Aktionen, Tool-Berechtigungen und Freigaben müssen
nachvollziehbar und kontrollierbar sein.

### P5 -- Observable by Design

Agent-Runs müssen von Beginn an mit IDs, Status, Zeitstempeln und
Ereignissen modelliert werden. Monitoring darf kein nachträglich
angefügtes Feature sein.

### P6 -- Traceability

Requirements, Acceptance Criteria, Tasks, Agent-Runs, Codeänderungen und
Verifikationsnachweise sollen nachvollziehbar verknüpft werden können.

### P7 -- Progressive Complexity

Das MVP liefert einen vollständigen, einfachen End-to-End-Workflow.
Komplexe Graphen, Analytics und Multi-Agent-Orchestrierung folgen
später.

### P8 -- Honest Status

Das Studio darf keine Informationen vortäuschen. Unbekannte oder vom
Provider nicht gelieferte Informationen werden als „nicht verfügbar"
angezeigt, nicht geschätzt oder erfunden.

------------------------------------------------------------------------

# 4. Informationsarchitektur

Das Studio erhält im MVP vier zentrale Bereiche.

## 4.1 Mission Control -- Dashboard

**Zweck:** Innerhalb weniger Sekunden den Zustand des Projekts erfassen.

Anzeigen:

-   Gesamtzahl der Specs.
-   Anzahl je Lifecycle-Status.
-   Ready-, Active-, Review- und Blocked-Specs.
-   Laufende Agent-Runs.
-   Fehlgeschlagene oder unterbrochene Runs.
-   Specs, die Aufmerksamkeit benötigen.
-   Letzte relevante Aktivitäten.
-   Projektfortschritt, sofern belastbar berechenbar.

Interaktionen:

-   Klick auf eine Kennzahl öffnet eine gefilterte Board-Ansicht.
-   Klick auf einen Agent-Run öffnet dessen Details.
-   Klick auf eine Aktivität öffnet die betroffene Spec.
-   Projekt-/Workspace-Kontext wird sichtbar dargestellt.

## 4.2 Spec Board -- Kanban

Vorgeschlagene Spalten:

-   Backlog
-   Ready
-   Active
-   Review
-   Done
-   Blocked

Jede Karte zeigt -- soweit Daten vorhanden sind:

-   Spec-ID und Titel.
-   Kurzbeschreibung.
-   Priorität.
-   Lifecycle-Status.
-   Task-Fortschritt.
-   Acceptance-Criteria-Fortschritt.
-   Zugeordneter Agent und Run-Status.
-   Letzte Aktivität.
-   Blockierungsgrund oder Hinweis auf fehlende Voraussetzungen.

Interaktionen:

-   Drag & Drop.
-   Spec Detail öffnen.
-   Agent-Start auslösen.
-   Agent abbrechen oder erneut starten, soweit zulässig.
-   Filter nach Status, Priorität und Agent.
-   Sortierung.

## 4.3 Spec Explorer -- Detailansicht

Bereiche:

-   Overview.
-   Requirements.
-   Acceptance Criteria.
-   Implementation Plan.
-   Tasks.
-   Verification.
-   Related Artifacts.
-   Agent Runs und Agent History.

Die Detailansicht soll die Informationen strukturiert darstellen und
einen direkten Zugriff auf das zugrunde liegende Artefakt ermöglichen.

## 4.4 Agent Center -- MVP-Monitoring

Anzeigen:

-   Provider und Modell, soweit verfügbar.
-   Agent-Run-ID und Session-ID.
-   Zugeordnete Spec.
-   Agent-Status.
-   Startzeit und Laufzeit.
-   Aktuelle Aktivität, soweit geliefert.
-   Tool-Aufrufe, soweit geliefert.
-   Dateiänderungen, soweit zuverlässig zuordenbar.
-   Freigabeanforderungen.
-   Fehler und Abschlussresultat.

MVP-Aktionen:

-   Run öffnen.
-   Agent abbrechen.
-   Bei unterstützten Providern Session fortsetzen.
-   Fehlerdetails einsehen.
-   Zugeordnete Spec öffnen.

Ein vollständiger Agent-Graph und Session Replay sind nicht
MVP-Bestandteil.

------------------------------------------------------------------------

# 5. Hauptbenutzerabläufe

## 5.1 Projekt öffnen

1.  Entwickler öffnet einen VS-Code-Workspace.
2.  FeatherSpec Studio erkennt, ob ein gültiges FeatherSpec-Projekt
    vorhanden ist.
3.  Das Studio liest die vorhandenen Specs und Pläne.
4.  Parserdiagnosen und fehlende Voraussetzungen werden sichtbar.
5.  Mission Control zeigt die Projektübersicht.
6.  Der Entwickler kann in Board und Spec Detail navigieren.

## 5.2 Spec aktivieren und Agent starten

1.  Entwickler öffnet das Spec Board.
2.  Er wählt eine Spec in Ready.
3.  Er zieht die Spec nach Active.
4.  Das Studio führt eine Readiness-Prüfung aus.
5.  Wenn Voraussetzungen fehlen, wird der Vorgang blockiert und die
    Gründe werden angezeigt.
6.  Wenn die Spec bereit ist, wird gemäß der bestätigten
    Aktivierungsrichtlinie ein Agent-Run gestartet.
7.  Der Agent erhält Spec, Plan, relevante Requirements und den
    freigegebenen Workspace-Kontext.
8.  Agent-Status und Ereignisse werden im Studio sichtbar.
9.  Der Agent beendet die Implementierung oder meldet einen Fehler.
10. Ein erfolgreicher Agent-Run führt die Spec in Review, nicht
    automatisch in Done.
11. Der bestehende FeatherSpec-Verifikationsprozess entscheidet über den
    Abschluss.

## 5.3 Agent-Fehler

1.  Ein Agent-Run meldet einen Fehler oder bricht unerwartet ab.
2.  Das Studio speichert den Fehler und den letzten bekannten Status.
3.  Die Spec wird als Aufmerksamkeit erforderlich oder Blocked
    dargestellt, abhängig von der Ursache und den Lifecycle-Regeln.
4.  Der Entwickler kann Fehlerdetails öffnen.
5.  Ein erneuter Start ist erst nach Prüfung der Wiederholbarkeit und
    des vorherigen Run-Zustands möglich.

## 5.4 Externe Spec-Änderung

1.  Ein Entwickler oder Agent verändert eine Spec-Datei außerhalb des
    Studios.
2.  Der File Watcher erkennt die Änderung.
3.  Das Repository-Modell wird neu eingelesen.
4.  Die betroffenen UI-Bereiche werden aktualisiert.
5.  Bei Konflikten oder nicht interpretierbaren Änderungen wird eine
    Diagnose angezeigt.

------------------------------------------------------------------------

# 6. Lifecycle und Zustandsmodell

## 6.1 Vorgeschlagene Spec-Status

  -----------------------------------------------------------------------
  Status                              Bedeutung
  ----------------------------------- -----------------------------------
  Backlog                             Spec existiert, ist aber noch nicht
                                      implementierungsbereit

  Ready                               Voraussetzungen für Implementierung
                                      sind erfüllt

  Active                              Implementierung ist in Arbeit

  Review                              Implementierung ist beendet;
                                      Review/Verifikation steht aus

  Done                                Verifikation und
                                      Abschlussbedingungen sind erfüllt

  Blocked                             Eine Voraussetzung oder
                                      Abhängigkeit verhindert die
                                      Weiterarbeit
  -----------------------------------------------------------------------

## 6.2 Statusdimensionen trennen

Mindestens drei Dimensionen sind getrennt zu modellieren:

1.  **Spec Lifecycle:** fachlicher Zustand der Spec.
2.  **Agent Run Lifecycle:** Zustand einer konkreten Agent-Ausführung.
3.  **Verification Status:** Zustand der Qualitäts- und
    Verifikationsprüfung.

Beispiel: Ein Agent-Run kann Completed sein, während die Spec den Status
Review hat und die Verification noch Pending ist.

## 6.3 Persistierte und abgeleitete Zustände

Der PO muss anhand des tatsächlichen FeatherSpec-Repositories festlegen,
welche Status bereits persistent in Ordnern oder Metadaten abgebildet
sind.

Vorschlag:

-   Bestehende persistierte Zustände werden unverändert übernommen.
-   Ready, Review und Blocked können zunächst abgeleitete
    Studio-Zustände sein, sofern das Framework dafür keine eigene
    persistente Repräsentation besitzt.
-   Abgeleitete Zustände müssen mit ihren Berechnungsregeln
    nachvollziehbar sein.
-   Das Studio darf bestehende Dateien nicht allein deshalb
    umstrukturieren, weil das Board zusätzliche Spalten benötigt.

## 6.4 Readiness-Regeln

Eine Spec darf nur aktiviert werden, wenn die projektspezifisch
festgelegten Voraussetzungen erfüllt sind.

Zu prüfen sind mindestens:

-   Spec ist syntaktisch und fachlich ausreichend vollständig.
-   Erforderlicher Implementierungsplan ist vorhanden.
-   Erforderliche Acceptance Criteria sind vorhanden.
-   Notwendige Abhängigkeiten sind erfüllt oder explizit freigegeben.
-   Keine unaufgelöste Blockade verhindert die Umsetzung.
-   Ein Provider ist verfügbar und authentifiziert.
-   Die Ausführung ist vom Benutzer gewollt.

Die exakten Regeln sind aus dem bestehenden FeatherSpec-Workflow
abzuleiten und in FS-003/FS-008 zu spezifizieren.

## 6.5 Drag-and-Drop-Regel

Produktvorschlag:

Das Verschieben einer Ready-Spec nach Active löst nach erfolgreicher
Readiness-Prüfung den Agent-Start aus. Beim ersten Einsatz müssen
Provider, Authentifizierung und Berechtigungen eingerichtet sein.

Ein Drag-and-Drop-Vorgang darf niemals unbemerkt Berechtigungen für
beliebige Terminal- oder Dateioperationen erweitern. Die
Berechtigungssteuerung bleibt beim Agent-Provider bzw. bei der
expliziten Studio-Konfiguration.

Der PO muss diese Aktivierungsregel vor Implementierungsfreigabe
bestätigen.

------------------------------------------------------------------------

# 7. Domänenmodell

Das interne Modell soll die bestehenden FeatherSpec-Artefakte abbilden,
nicht ersetzen.

  ------------------------------------------------------------------------------
  Entität                 Zweck                          Hinweise
  ----------------------- ------------------------------ -----------------------
  Project                 FeatherSpec-Projekt im         Workspace-Zuordnung
                          Workspace                      

  Spec                    Spezifikation                  Verweis auf
                                                         Originaldatei

  Requirement             Fachliche/technische           Nur wenn aus Artefakt
                          Anforderung                    ableitbar

  AcceptanceCriterion     Überprüfbares Kriterium        Mit ID/Referenz, sofern
                                                         vorhanden

  Plan                    Implementierungsplan           Verknüpfung zur Spec

  Task                    Einzelne Arbeitseinheit        Aus bestehendem Plan
                                                         ableiten

  Dependency              Abhängigkeit zwischen          Quelle der Beziehung
                          Specs/Tasks                    speichern

  Verification            Verifikationsergebnis          Nachweis und Status

  Provider                Agent-Provider-Konfiguration   Keine Secrets im
                                                         Domain-Modell

  AgentRun                Konkrete Agent-Ausführung      Eindeutige Run-ID

  AgentSession            Provider-Session               Provider-spezifische
                                                         Referenz

  AgentEvent              Ereignis eines Runs            Normalisiertes Event

  Artifact                Datei oder sonstiges Artefakt  Workspace-relativer
                                                         Pfad

  Approval                Freigabeanforderung            Provider-Fähigkeiten
                                                         berücksichtigen
  ------------------------------------------------------------------------------

### Modellierungsregeln

-   Originaldateipfade und Referenzen bleiben nachvollziehbar.
-   Fehlende Felder werden nicht erfunden.
-   IDs müssen stabil und eindeutig sein.
-   AgentRun und Spec Lifecycle sind getrennt.
-   Provider-spezifische Rohdaten dürfen optional für Diagnosezwecke
    gespeichert werden, müssen aber von normalisierten Events getrennt
    sein.
-   Secrets dürfen niemals in Events oder Logs persistiert werden.
-   Ein Agent darf eine Spec nicht allein durch eine selbst gemeldete
    Erfolgsmeldung auf Done setzen.

------------------------------------------------------------------------

# 8. Technische Architekturleitplanken

Diese Leitplanken sind eine Grundlage für die Architektur-Specs, keine
endgültige Implementierungsentscheidung.

## 8.1 VS-Code-Extension

Verantwortlichkeiten des Extension Hosts:

-   Workspace Discovery.
-   Spec Repository und Parser.
-   Lifecycle-/Readiness-Logik.
-   File Watching.
-   Runtime-Persistenz.
-   Agent Orchestrator.
-   Provider Adapter.
-   Kommunikation mit der Webview.

## 8.2 Webview

Vorgeschlagene UI-Technologie:

-   React.
-   TypeScript.
-   VS-Code-Webview.

Die Auswahl muss in einem kurzen Architektur-Spike gegen die vorhandene
Projektstruktur und Build-Toolchain geprüft werden.

Die Webview darf nicht direkt auf lokale Dateien oder Node.js-Funktionen
zugreifen. Dateizugriff und Agent-Steuerung erfolgen kontrolliert über
Nachrichten zwischen Webview und Extension Host.

## 8.3 Provider Adapter

Vorgeschlagene interne Fähigkeiten:

-   Provider-Verfügbarkeit prüfen.
-   Fähigkeiten deklarieren.
-   Authentifizierung prüfen bzw. initialisieren.
-   Agent-Run starten.
-   Session fortsetzen, sofern unterstützt.
-   Run abbrechen/stoppen.
-   Ereignisse streamen.
-   Fehler normalisieren.

Die endgültigen Interfaces müssen die realen Fähigkeiten der gewählten
SDKs abbilden. Nicht jeder Provider unterstützt dieselben Events oder
Session-Funktionen.

## 8.4 Agent Orchestrator

Verantwortlichkeiten:

-   Startanfragen validieren.
-   Spec und Kontext auflösen.
-   Provider auswählen.
-   AgentRun anlegen.
-   Events verarbeiten.
-   Status synchronisieren.
-   Cancellation und Fehler behandeln.
-   Persistenz aktualisieren.
-   Recovery nach Neustart versuchen.

## 8.5 Runtime-Persistenz

Es ist eine Storage-Abstraktion vorzusehen.

Zu evaluieren sind VS-Code-Workspace-Storage, Extension Global Storage
und eine lokale Datenbank. Die Wahl hängt von Datenmenge,
Transaktionsbedarf, Workspace-Zuordnung, Portabilität und Wartbarkeit
ab.

Nicht in den MVP übernehmen:

-   Cloud-Synchronisierung.
-   Teamweite gemeinsame Agent-Historie.
-   Speicherung von Provider-Secrets in Projektdateien.

## 8.6 MCP

Ein FeatherSpec-MCP-Server kann später standardisierte Tools
bereitstellen, z. B.:

-   `list_specs`
-   `get_spec`
-   `get_plan`
-   `get_task`
-   `report_progress`
-   `request_review`
-   `report_verification`

Ein eigener MCP-Server ist **nicht zwingend Voraussetzung für den MVP**.
Zunächst ist zu prüfen, ob die gewählte Agent-Integration die benötigten
Funktionen einfacher über eigene Tools bereitstellen kann.

------------------------------------------------------------------------

# 9. Initialer Backlog -- Epics und Specs

## 9.1 Epic-Übersicht

  -----------------------------------------------------------------------
  Epic                    Name                    Ziel
  ----------------------- ----------------------- -----------------------
  EPIC-001                Project Foundation      Projekt erkennen, Specs
                                                  lesen, Lifecycle und
                                                  Runtime-Daten
                                                  modellieren

  EPIC-002                Studio Experience       Dashboard, Board und
                                                  Spec Detail

  EPIC-003                Agent Orchestration     Provider-Abstraktion,
                                                  erster Agent und
                                                  Startworkflow

  EPIC-004                Agent Observability     Agent-Status, Events
                                                  und Fehler sichtbar
                                                  machen
  -----------------------------------------------------------------------

## 9.2 Spezifikationsübersicht

  ---------------------------------------------------------------------------
  ID             Titel          Epic           Priorität      Phase
  -------------- -------------- -------------- -------------- ---------------
  FS-001         Workspace      001            P0             Foundation
                 Discovery &                                  
                 Project                                      
                 Recognition                                  

  FS-002         Spec           001            P0             Foundation
                 Repository &                                 
                 Parser                                       

  FS-003         Spec Lifecycle 001            P0             Foundation
                 & Readiness                                  
                 Model                                        

  FS-004         Runtime        001            P0             Foundation
                 Persistence &                                
                 Event Model                                  

  FS-005         Studio Shell & 002            P1             UI
                 Navigation                                   

  FS-006         Mission        002            P1             UI
                 Control                                      
                 Dashboard                                    

  FS-007         Spec Board &   002            P1             UI
                 Spec Detail                                  

  FS-009         Agent Provider 003            P1             Agent
                 Abstraction                                  

  FS-010         First Agent    003            P1             Agent
                 Provider                                     
                 Integration                                  

  FS-011         Agent          003            P1             Agent
                 Orchestrator &                               
                 Run Lifecycle                                

  FS-008         Spec           003            P1             Agent
                 Activation &                                 
                 Agent Start                                  
                 Workflow                                     

  FS-012         Live Agent     004            P1             Observability
                 Activity &                                   
                 Monitoring                                   
  ---------------------------------------------------------------------------

Die Nummerierung ist bewusst stabil gehalten, auch wenn die
Implementierungsreihenfolge von der ID-Reihenfolge abweicht.

------------------------------------------------------------------------

# 10. Initiale Specs -- Requirements und Acceptance Criteria

Die folgenden Beschreibungen sind ein belastbarer Start für die
PO-Spezifikation. Vor Implementierungsfreigabe müssen sie mit dem
tatsächlichen FeatherSpec-Repository und den ausgewählten SDKs
abgeglichen werden.

## FS-001 -- Workspace Discovery & Project Recognition

**Priorität:** P0 -- Critical\
**Abhängigkeiten:** Keine

### Problem

Das Studio muss gültige FeatherSpec-Projekte erkennen, ohne gewöhnliche
Repositories fälschlich als FeatherSpec-Projekte zu behandeln.

### User Story

Als Entwickler möchte ich mein FeatherSpec-Projekt automatisch erkennen
lassen, damit ich ohne manuelle Projektkonfiguration mit der visuellen
Verwaltung beginnen kann.

### Requirements

-   **FR-001.1:** Den aktiven VS-Code-Workspace untersuchen.
-   **FR-001.2:** FeatherSpec-Projekte anhand verifizierter
    Projektmerkmale erkennen.
-   **FR-001.3:** Multi-root Workspaces berücksichtigen.
-   **FR-001.4:** Bei mehreren Projekten eine Auswahl ermöglichen.
-   **FR-001.5:** Unvollständige oder ungültige Strukturen
    diagnostizieren.
-   **FR-001.6:** Bei fehlendem Projekt einen hilfreichen Empty State
    anzeigen.
-   **FR-001.7:** Discovery darf keine Projektdateien verändern.

### Acceptance Criteria

-   **AC-001.1:** Given ein gültiges FeatherSpec-Projekt, When die
    Extension aktiviert wird, Then wird das Projekt erkannt.
-   **AC-001.2:** Given ein Repository ohne FeatherSpec-Merkmale, When
    die Discovery ausgeführt wird, Then wird es nicht als gültiges
    FeatherSpec-Projekt ausgegeben.
-   **AC-001.3:** Given mehrere erkannte Projekte, When die Discovery
    abgeschlossen ist, Then kann der Benutzer das aktive Projekt
    auswählen.
-   **AC-001.4:** Given eine unvollständige Projektstruktur, When die
    Discovery abgeschlossen ist, Then werden die fehlenden
    Voraussetzungen angezeigt.
-   **AC-001.5:** Die Discovery verändert keine vorhandenen Dateien.
-   **AC-001.6:** Wiederholte Discovery erzeugt keine doppelten
    Projektregistrierungen.

### Out of Scope

Automatisches Erstellen oder Migrieren eines FeatherSpec-Projekts.

------------------------------------------------------------------------

## FS-002 -- Spec Repository & Parser

**Priorität:** P0 -- Critical\
**Abhängigkeiten:** FS-001

### Problem

Das Studio benötigt eine zentrale, robuste Leseschicht für Specs, Pläne
und vorhandene Verifikationsinformationen.

### User Story

Als Entwickler möchte ich alle Specs strukturiert sehen, ohne jede
Markdown-Datei einzeln öffnen zu müssen.

### Requirements

-   **FR-002.1:** Alle relevanten Specs anhand der verifizierten
    FeatherSpec-Struktur finden.
-   **FR-002.2:** Bestehende Spec-Metadaten und Inhalte parsen.
-   **FR-002.3:** Ein normalisiertes internes Spec-Modell bereitstellen.
-   **FR-002.4:** Zugehörige Pläne erkennen und mit Specs verknüpfen.
-   **FR-002.5:** Tasks und Acceptance Criteria aus vorhandenen
    Artefakten extrahieren, sofern vorhanden.
-   **FR-002.6:** Vorhandene Verifikationsinformationen erkennen.
-   **FR-002.7:** Parserdiagnosen für ungültige oder unbekannte Inhalte
    bereitstellen.
-   **FR-002.8:** Änderungen an relevanten Dateien erkennen und
    betroffene Daten aktualisieren.
-   **FR-002.9:** Nicht unterstützte Inhalte nicht stillschweigend
    verwerfen.

### Acceptance Criteria

-   **AC-002.1:** Alle gültigen Specs im Test-Fixture-Projekt werden
    erkannt.
-   **AC-002.2:** Jede Spec besitzt eine stabile interne Referenz und
    einen Verweis auf die Originaldatei.
-   **AC-002.3:** Vorhandene Requirements und Acceptance Criteria werden
    gemäß dem tatsächlichen Format korrekt extrahiert.
-   **AC-002.4:** Zugehörige Pläne werden korrekt zugeordnet.
-   **AC-002.5:** Eine fehlerhafte Spec verhindert nicht das Einlesen
    anderer Specs.
-   **AC-002.6:** Eine externe Dateiänderung aktualisiert das interne
    Modell.
-   **AC-002.7:** Der Parser verändert beim Lesen keine Quelldateien.
-   **AC-002.8:** Unbekannte Formatbestandteile werden als Diagnose oder
    nicht unterstützter Inhalt sichtbar.

### Out of Scope

Vollständiger visueller Spec-Editor und automatische Formatmigration.

------------------------------------------------------------------------

## FS-003 -- Spec Lifecycle & Readiness Model

**Priorität:** P0 -- Critical\
**Abhängigkeiten:** FS-001, FS-002

### Problem

Das Studio benötigt ein einheitliches fachliches Statusmodell, das den
bestehenden FeatherSpec-Prozess abbildet.

### User Story

Als Entwickler möchte ich den tatsächlichen Lifecycle jeder Spec
verstehen und ungültige Statusübergänge vermeiden.

### Requirements

-   **FR-003.1:** Die fachlichen Status Backlog, Ready, Active, Review,
    Done und Blocked unterstützen.
-   **FR-003.2:** Bestehende FeatherSpec-Ordner und Metadaten auf das
    interne Modell abbilden.
-   **FR-003.3:** Persistierte und abgeleitete Status unterscheiden.
-   **FR-003.4:** Statusübergänge anhand definierter Regeln validieren.
-   **FR-003.5:** Readiness anhand expliziter Voraussetzungen bestimmen.
-   **FR-003.6:** Externe Dateiänderungen und daraus entstehende
    Statusänderungen erkennen.
-   **FR-003.7:** Statusänderungen mit Zeitstempel und Ursache
    nachvollziehbar machen.
-   **FR-003.8:** Spec Lifecycle, Agent Run Lifecycle und Verification
    Status getrennt halten.

### Acceptance Criteria

-   **AC-003.1:** Vorhandene Specs werden entsprechend der verifizierten
    FeatherSpec-Konventionen zugeordnet.
-   **AC-003.2:** Ready wird nur angezeigt, wenn die festgelegten
    Readiness-Regeln erfüllt sind.
-   **AC-003.3:** Eine Spec ohne erforderlichen Plan wird nicht als
    Ready behandelt.
-   **AC-003.4:** Ein abgeschlossener Agent-Run setzt eine Spec nicht
    automatisch auf Done.
-   **AC-003.5:** Review und Done werden anhand der festgelegten
    Verifikationsregeln unterschieden.
-   **AC-003.6:** Ungültige Statusübergänge werden abgelehnt und mit
    Ursache erklärt.
-   **AC-003.7:** Statusberechnungen sind reproduzierbar und
    dokumentiert.
-   **AC-003.8:** Bestehende FeatherSpec-Konventionen werden nicht ohne
    explizite Entscheidung verändert.

### Out of Scope

Vom Benutzer frei konfigurierbare Workflow-Engines.

------------------------------------------------------------------------

## FS-004 -- Runtime Persistence & Event Model

**Priorität:** P0 -- Critical\
**Abhängigkeiten:** FS-001, FS-002

### Problem

Agent-Sessions und Laufzeitinformationen sind keine Spec-Inhalte und
benötigen eine zusätzliche lokale Persistenz.

### User Story

Als Entwickler möchte ich nach einem VS-Code-Neustart den letzten
bekannten Zustand meiner Agent-Runs und Aktivitäten wiederherstellen
können.

### Requirements

-   **FR-004.1:** Eine Storage-Abstraktion für Studio-Runtime-Daten
    bereitstellen.
-   **FR-004.2:** Agent-Runs mit eindeutigen IDs speichern.
-   **FR-004.3:** Agent-Events chronologisch speichern.
-   **FR-004.4:** Runtime-Daten eindeutig einem Workspace zuordnen.
-   **FR-004.5:** Den letzten bekannten Zustand nach einem Neustart
    wiederherstellen.
-   **FR-004.6:** Nicht erreichbare oder nicht fortsetzbare Sessions als
    unterbrochen kennzeichnen.
-   **FR-004.7:** Keine Credentials oder Secrets in Logs und
    Event-Payloads speichern.
-   **FR-004.8:** Datenzugriff und Fehlerbehandlung dokumentieren.

### Acceptance Criteria

-   **AC-004.1:** Jeder Agent-Run besitzt eine eindeutige ID.
-   **AC-004.2:** Provider, Spec-Zuordnung, Zeitstempel und Run-Status
    werden gespeichert.
-   **AC-004.3:** Events bleiben chronologisch abrufbar.
-   **AC-004.4:** Historische Runs sind nach einem Extension-Neustart
    sichtbar.
-   **AC-004.5:** Nicht wiederherstellbare Runs werden nicht fälschlich
    als Running angezeigt.
-   **AC-004.6:** Secrets werden nicht in Runtime-Daten gespeichert.
-   **AC-004.7:** Daten unterschiedlicher Workspaces werden getrennt
    behandelt.
-   **AC-004.8:** Persistenzfehler beschädigen keine Spec-Quelldateien.

### Out of Scope

Cloud-Synchronisierung und Team-Historie.

------------------------------------------------------------------------

## FS-005 -- Studio Shell & Navigation

**Priorität:** P1 -- High\
**Abhängigkeit:** FS-001

### User Story

Als Entwickler möchte ich die wichtigsten Studio-Bereiche über eine
konsistente Oberfläche erreichen.

### Requirements

-   **FR-005.1:** Einen eindeutigen VS-Code-Einstiegspunkt
    bereitstellen.
-   **FR-005.2:** Mission Control, Spec Board, Spec Explorer und Agent
    Center erreichbar machen.
-   **FR-005.3:** Die Oberfläche innerhalb von VS Code darstellen.
-   **FR-005.4:** Auswahlkontext zwischen Ansichten erhalten, soweit
    sinnvoll.
-   **FR-005.5:** Empty-, Loading- und Error-States bereitstellen.
-   **FR-005.6:** VS-Code-Light- und Dark-Theme berücksichtigen.
-   **FR-005.7:** Webview-Kommunikation kontrolliert über den Extension
    Host führen.

### Acceptance Criteria

-   **AC-005.1:** Das Studio kann über einen VS-Code-Command geöffnet
    werden.
-   **AC-005.2:** Alle MVP-Bereiche sind über eine konsistente
    Navigation erreichbar.
-   **AC-005.3:** Ein Ansichtswechsel verliert nicht unnötig den
    ausgewählten Spec-Kontext.
-   **AC-005.4:** Die Oberfläche passt sich dem VS-Code-Theme an.
-   **AC-005.5:** Fehlende Projekte und Ladefehler werden verständlich
    dargestellt.
-   **AC-005.6:** Die Webview kann nicht direkt auf beliebige lokale
    Dateien zugreifen.

------------------------------------------------------------------------

## FS-006 -- Mission Control Dashboard

**Priorität:** P1 -- Critical\
**Abhängigkeiten:** FS-002, FS-003, FS-004, FS-005

### User Story

Als Entwickler möchte ich beim Öffnen von Studio sofort verstehen, was
in meinem Projekt passiert und wo Aufmerksamkeit benötigt wird.

### Requirements

-   **FR-006.1:** Gesamtzahl der Specs und Statusverteilung anzeigen.
-   **FR-006.2:** Projektfortschritt nur anhand dokumentierter Regeln
    berechnen.
-   **FR-006.3:** Laufende Agent-Runs anzeigen.
-   **FR-006.4:** Fehlgeschlagene, unterbrochene und blockierte Vorgänge
    hervorheben.
-   **FR-006.5:** Ausstehende Reviews und fehlende Voraussetzungen
    anzeigen.
-   **FR-006.6:** Letzte relevante Aktivitäten anzeigen.
-   **FR-006.7:** Drill-down von Kennzahlen zu gefilterten
    Detailansichten ermöglichen.
-   **FR-006.8:** Daten bei relevanten Datei- und Agent-Events
    aktualisieren.

### Acceptance Criteria

-   **AC-006.1:** Alle erkannten Specs werden genau einer primären
    Lifecycle-Kategorie zugeordnet.
-   **AC-006.2:** Agent-Runs werden getrennt von Spec-Status gezählt.
-   **AC-006.3:** Fehler und Blockaden sind erkennbar.
-   **AC-006.4:** Ein Klick auf eine Kennzahl öffnet die passende
    gefilterte Ansicht.
-   **AC-006.5:** Neue Agent-Events aktualisieren die zugehörigen
    Dashboard-Informationen.
-   **AC-006.6:** Fehlende Daten werden als unbekannt/nicht verfügbar
    dargestellt und nicht durch Schätzungen ersetzt.
-   **AC-006.7:** Die Berechnung jeder Fortschrittskennzahl ist
    dokumentiert.

------------------------------------------------------------------------

## FS-007 -- Spec Board & Spec Detail

**Priorität:** P1 -- Critical\
**Abhängigkeiten:** FS-002, FS-003, FS-005

### User Story

Als Entwickler möchte ich Specs visuell verwalten und die wichtigsten
Informationen direkt auf einer Karte oder in einer Detailansicht
erkennen.

### Requirements

-   **FR-007.1:** Ein Kanban mit Backlog, Ready, Active, Review, Done
    und Blocked darstellen.
-   **FR-007.2:** Spec-Karten mit ID, Titel, Beschreibung, Priorität und
    Status darstellen.
-   **FR-007.3:** Task- und Acceptance-Criteria-Fortschritt anzeigen,
    sofern Daten vorliegen.
-   **FR-007.4:** Zugeordneten Agent und dessen Run-Status anzeigen.
-   **FR-007.5:** Spec Detail mit Requirements, Acceptance Criteria,
    Plan, Tasks, Verification und Agent History bereitstellen.
-   **FR-007.6:** Filter nach Status, Priorität und Agent bereitstellen.
-   **FR-007.7:** Sortierung nach Priorität, letzter Änderung und Titel
    ermöglichen.
-   **FR-007.8:** Tastaturbedienbarkeit für wesentliche Aktionen
    unterstützen.
-   **FR-007.9:** Drag & Drop als Statusänderungs- bzw.
    Aktivierungsinteraktion bereitstellen.

### Acceptance Criteria

-   **AC-007.1:** Alle erkannten Specs erscheinen auf dem Board.
-   **AC-007.2:** Jede Spec wird genau einer primären Spalte zugeordnet.
-   **AC-007.3:** Persistierte und abgeleitete Status sind
    unterscheidbar.
-   **AC-007.4:** Auswahl einer Karte öffnet die zugehörige
    Detailansicht.
-   **AC-007.5:** Vorhandene Requirements und Acceptance Criteria werden
    korrekt dargestellt.
-   **AC-007.6:** Filter verändern nicht den zugrunde liegenden
    Spec-Zustand.
-   **AC-007.7:** Externe Dateiänderungen aktualisieren die Anzeige.
-   **AC-007.8:** Wesentliche Board-Aktionen sind per Tastatur
    erreichbar.

------------------------------------------------------------------------

## FS-008 -- Spec Activation & Agent Start Workflow

**Priorität:** P1 -- Critical\
**Abhängigkeiten:** FS-003, FS-007, FS-009, FS-010, FS-011

### User Story

Als Entwickler möchte ich eine implementierungsbereite Spec nach Active
ziehen und dadurch einen Agent-Run starten können.

### Requirements

-   **FR-008.1:** Drag & Drop nach Active unterstützen.
-   **FR-008.2:** Vor dem Start Readiness prüfen.
-   **FR-008.3:** Fehlende Voraussetzungen mit konkreter Ursache
    anzeigen.
-   **FR-008.4:** Einen verfügbaren Provider auswählen bzw. die
    konfigurierte Standardwahl verwenden.
-   **FR-008.5:** Bei erfolgreicher Prüfung den Agent-Run gemäß der
    freigegebenen Aktivierungsrichtlinie starten.
-   **FR-008.6:** Doppelte gleichzeitige Runs derselben Spec verhindern.
-   **FR-008.7:** Agent-Run und Spec eindeutig verknüpfen.
-   **FR-008.8:** Startfehler behandeln, ohne inkonsistente Status zu
    hinterlassen.
-   **FR-008.9:** Die Aktivierung und den Startversuch protokollieren.

### Acceptance Criteria

-   **AC-008.1:** Eine Ready-Spec kann nach Active gezogen werden.
-   **AC-008.2:** Die Readiness-Prüfung läuft vor dem Agent-Start.
-   **AC-008.3:** Eine nicht bereite Spec wird nicht gestartet.
-   **AC-008.4:** Der Benutzer sieht die fehlenden Voraussetzungen.
-   **AC-008.5:** Bei erfolgreichem Start existiert ein AgentRun mit
    eindeutiger ID.
-   **AC-008.6:** Der Run ist der richtigen Spec zugeordnet.
-   **AC-008.7:** Ein zweiter aktiver Run derselben Spec wird
    verhindert.
-   **AC-008.8:** Startfehler sind sichtbar und nachvollziehbar.
-   **AC-008.9:** Ein Agent-Start erteilt keine zusätzlichen, nicht
    freigegebenen Tool-Berechtigungen.

### Product Decision Required

Der PO muss die genaue Drag-and-Drop-Policy bestätigen: vorgeschlagen
ist automatischer Start nach Readiness-Prüfung, sofern Provider und
Berechtigungen zuvor eingerichtet sind.

------------------------------------------------------------------------

## FS-009 -- Agent Provider Abstraction

**Priorität:** P1 -- Critical\
**Abhängigkeit:** FS-004

### User Story

Als Product Owner möchte ich weitere Agent-Provider integrieren können,
ohne die Domain- und UI-Logik neu entwickeln zu müssen.

### Requirements

-   **FR-009.1:** Einheitliches internes Provider-Interface definieren.
-   **FR-009.2:** Provider zentral registrieren.
-   **FR-009.3:** Fähigkeiten pro Provider deklarieren.
-   **FR-009.4:** Provider-Events in ein normalisiertes internes Modell
    übersetzen.
-   **FR-009.5:** Provider-Verfügbarkeit prüfen.
-   **FR-009.6:** Provider-Fehler normalisieren.
-   **FR-009.7:** Test-/Fake-Provider für automatisierte Tests
    bereitstellen.
-   **FR-009.8:** Nicht unterstützte Fähigkeiten transparent ausweisen.

Vorgeschlagene Fähigkeiten:

-   Start.
-   Cancel/Stop.
-   Resume, sofern unterstützt.
-   Streaming.
-   Tool Events.
-   Approval Events.
-   File Change Events.
-   Model Selection.
-   MCP/Custom Tools.

### Acceptance Criteria

-   **AC-009.1:** Ein dokumentiertes Provider-Interface existiert.
-   **AC-009.2:** Der erste Provider wird ausschließlich über den
    Adapter angesprochen.
-   **AC-009.3:** Domain- und UI-Schichten enthalten keine
    SDK-spezifische Logik.
-   **AC-009.4:** Nicht unterstützte Fähigkeiten werden explizit als
    nicht verfügbar gekennzeichnet.
-   **AC-009.5:** Provider-Events werden in ein gemeinsames Format
    übersetzt.
-   **AC-009.6:** Ein Fake-Provider kann den End-to-End-Workflow ohne
    externe API ausführen.
-   **AC-009.7:** Ein weiterer Provider kann ergänzt werden, ohne
    bestehende Board-Komponenten zu ändern.

------------------------------------------------------------------------

## FS-010 -- First Agent Provider Integration

**Priorität:** P1 -- Critical\
**Abhängigkeit:** FS-009

### User Story

Als Entwickler möchte ich aus FeatherSpec Studio einen echten
Coding-Agenten starten und dessen Ergebnis erhalten.

### Provider-Kandidaten

-   GitHub Copilot SDK.
-   Claude Agent SDK.
-   OpenAI Codex SDK.

GitHub Copilot SDK ist der bevorzugte erste Spike-Kandidat. Die Auswahl
ist erst nach technischer und rechtlicher Prüfung verbindlich.

### Requirements

-   **FR-010.1:** Laufzeit- und Installationsvoraussetzungen prüfen.
-   **FR-010.2:** Einen unterstützten Authentifizierungsweg verwenden.
-   **FR-010.3:** Modellwahl unterstützen, soweit Provider und SDK dies
    ermöglichen.
-   **FR-010.4:** Den korrekten Workspace als Arbeitskontext setzen.
-   **FR-010.5:** Einen FeatherSpec-generierten Prompt übergeben.
-   **FR-010.6:** Streaming und verfügbare Ereignisse empfangen.
-   **FR-010.7:** Session-Referenzen speichern.
-   **FR-010.8:** Cancellation unterstützen.
-   **FR-010.9:** Berechtigungen und Freigaben gemäß
    Provider-Fähigkeiten kontrollieren.
-   **FR-010.10:** Fehler und Authentifizierungsprobleme verständlich
    darstellen.

### Acceptance Criteria

-   **AC-010.1:** Ein verfügbarer Provider kann gestartet werden.
-   **AC-010.2:** Eine gültige Session wird erstellt.
-   **AC-010.3:** Der korrekte Workspace wird verwendet.
-   **AC-010.4:** Spec und freigegebener Kontext werden übergeben.
-   **AC-010.5:** Agent-Antworten und verfügbare Events werden
    empfangen.
-   **AC-010.6:** Der Run kann kontrolliert abgebrochen werden.
-   **AC-010.7:** Authentifizierungsfehler werden verständlich
    angezeigt.
-   **AC-010.8:** Fehlende Laufzeitvoraussetzungen werden erkannt.
-   **AC-010.9:** Die Session wird mit Spec und AgentRun verknüpft.
-   **AC-010.10:** Keine nicht unterstützte Authentifizierungsannahme
    wird verwendet.

------------------------------------------------------------------------

## FS-011 -- Agent Orchestrator & Run Lifecycle

**Priorität:** P1 -- Critical\
**Abhängigkeiten:** FS-004, FS-009, FS-010

### User Story

Als Entwickler möchte ich Agent-Runs zentral kontrollieren und ihren
gesamten Lebenszyklus nachvollziehen können.

### Requirements

-   **FR-011.1:** AgentRun mit eindeutiger ID erzeugen.
-   **FR-011.2:** Run-Status Starting, Running, WaitingForApproval,
    WaitingForInput, Completed, Failed, Cancelled und Interrupted
    unterstützen.
-   **FR-011.3:** Run einer Spec zuordnen.
-   **FR-011.4:** Im MVP höchstens einen aktiven Run je Spec zulassen.
-   **FR-011.5:** Cancellation und kontrolliertes Stoppen unterstützen,
    soweit Provider dies ermöglicht.
-   **FR-011.6:** Fehler klassifizieren und speichern.
-   **FR-011.7:** Recovery nach Extension-Neustart versuchen.
-   **FR-011.8:** Ergebnis und Abschlussereignis speichern.
-   **FR-011.9:** Agent-Run-Abschluss von Spec-Abschluss unterscheiden.

### Acceptance Criteria

-   **AC-011.1:** Jeder Start erzeugt einen eindeutigen AgentRun.
-   **AC-011.2:** Jeder Run besitzt einen nachvollziehbaren Status.
-   **AC-011.3:** Die Spec-Zuordnung bleibt erhalten.
-   **AC-011.4:** Doppelte aktive Runs derselben Spec werden verhindert.
-   **AC-011.5:** Ein Run kann kontrolliert abgebrochen werden.
-   **AC-011.6:** Fehlerhafte Runs werden als Failed dargestellt.
-   **AC-011.7:** Nicht wiederherstellbare Runs werden als Interrupted
    dargestellt.
-   **AC-011.8:** Completed setzt die Spec nicht automatisch auf Done.
-   **AC-011.9:** Das Ergebnis ist in der Spec Detail View verfügbar.

------------------------------------------------------------------------

## FS-012 -- Live Agent Activity & Monitoring

**Priorität:** P1 -- High\
**Abhängigkeiten:** FS-004, FS-006, FS-007, FS-011

### User Story

Als Entwickler möchte ich live nachvollziehen, woran ein Agent arbeitet
und ob ich eingreifen muss.

### Requirements

-   **FR-012.1:** Agent-Status im Dashboard und auf Spec-Karten
    darstellen.
-   **FR-012.2:** Verfügbare Events chronologisch anzeigen.
-   **FR-012.3:** Tool-Aufrufe darstellen, sofern der Provider diese
    liefert.
-   **FR-012.4:** Dateiänderungen zuordnen, sofern die Zuordnung
    zuverlässig möglich ist.
-   **FR-012.5:** Approval Requests sichtbar machen.
-   **FR-012.6:** Fehler verständlich darstellen.
-   **FR-012.7:** Neue Events ohne manuelles Neuladen anzeigen.
-   **FR-012.8:** Historische Events nach Neustart abrufbar halten.
-   **FR-012.9:** Event-Typ und Datenquelle kenntlich machen.

### Acceptance Criteria

-   **AC-012.1:** Agent-Status erscheint auf der zugehörigen Spec-Karte.
-   **AC-012.2:** Agent-Status erscheint im Dashboard.
-   **AC-012.3:** Neue Events werden live angezeigt.
-   **AC-012.4:** Tool-Aufrufe werden nur angezeigt, wenn Provider-Daten
    vorliegen.
-   **AC-012.5:** Dateiänderungen werden nur dann einem Run zugeordnet,
    wenn dies belastbar möglich ist.
-   **AC-012.6:** Approval Requests sind sichtbar.
-   **AC-012.7:** Fehlerdetails sind nachvollziehbar.
-   **AC-012.8:** Historische Events bleiben nach einem Neustart
    verfügbar.
-   **AC-012.9:** Unbekannte Event-Typen führen nicht zum Absturz.

------------------------------------------------------------------------

# 11. Abhängigkeiten und Implementierungsreihenfolge

## 11.1 Abhängigkeitsübersicht

``` text
FS-001 Workspace Discovery
    |
    v
FS-002 Spec Repository & Parser
    |
    v
FS-003 Lifecycle & Readiness
    |
    +----------------------+
    |                      |
    v                      v
FS-004 Runtime         FS-005 Studio Shell
Persistence                |
    |                      |
    +----------+-----------+
               |
       +-------+--------+
       |                |
       v                v
FS-006 Dashboard    FS-007 Board & Detail
       |                |
       +-------+--------+
               |
               v
       FS-009 Provider Abstraction
               |
               v
       FS-010 First Provider
               |
               v
       FS-011 Orchestrator
               |
               v
       FS-008 Activation Workflow
               |
               v
       FS-012 Live Monitoring
```

Die UI-Arbeit kann teilweise parallel zur Provider-Arbeit erfolgen,
sobald die Domain- und Event-Verträge ausreichend stabil sind.

## 11.2 Empfohlene Reihenfolge

1.  FS-001 -- Workspace Discovery.
2.  FS-002 -- Spec Repository & Parser.
3.  FS-003 -- Lifecycle & Readiness.
4.  FS-004 -- Runtime Persistence & Event Model.
5.  FS-005 -- Studio Shell & Navigation.
6.  FS-006 -- Mission Control Dashboard.
7.  FS-007 -- Spec Board & Spec Detail.
8.  FS-009 -- Provider Abstraction.
9.  FS-010 -- First Agent Provider.
10. FS-011 -- Agent Orchestrator.
11. FS-008 -- Activation Workflow.
12. FS-012 -- Live Agent Monitoring.

------------------------------------------------------------------------

# 12. Vorgelagerte Discovery- und technische Spikes

Diese Aufgaben müssen vor der Freigabe der betroffenen Specs
durchgeführt werden.

## SPIKE-001 -- FeatherSpec Repository Audit

**Priorität:** P0

Untersuchen und dokumentieren:

-   Tatsächliche Verzeichnisstruktur.
-   Spec-Dateiformate.
-   Metadaten und IDs.
-   Plan-Dateiformate.
-   Requirements und Acceptance Criteria.
-   Task-Format und Task-Status.
-   Bestehende Statuskonventionen.
-   Verifikations- und Testnachweise.
-   Bestehende Commands/Skills/Workflows.
-   Regeln für Archivierung und History.
-   Architektur- und Projektkontextdateien.

**Ergebnis:** Ein verifiziertes FeatherSpec Schema & Lifecycle Mapping.
Keine neue Struktur definieren, bevor dieses Ergebnis vorliegt.

## SPIKE-002 -- Agent SDK Feasibility

**Priorität:** P0

Copilot SDK, Claude Agent SDK und Codex SDK anhand derselben Kriterien
praktisch vergleichen:

-   Unterstützte Desktop-/Node.js-Laufzeit.
-   Authentifizierungsweg und Nutzungsbedingungen.
-   Session-Erstellung und Wiederaufnahme.
-   Streaming.
-   Tool- und Datei-Events.
-   Approval-/Permission-Modell.
-   Cancellation.
-   Workspace-Isolation.
-   Fehlerverhalten.
-   Paket- und Runtime-Abhängigkeiten.
-   Wartbarkeit und Dokumentationsqualität.

**Ergebnis:** Bewertungsmatrix, Proof of Concept und Empfehlung für den
ersten Provider.

## SPIKE-003 -- VS Code Extension & Webview Architecture

**Priorität:** P1

Prüfen:

-   Extension Host Architektur.
-   Webview Messaging.
-   React-/TypeScript-Build.
-   Lifecycle und Activation Events.
-   File Watcher Verhalten.
-   Workspace Storage.
-   Debugging und Tests.
-   Packaging und Marketplace-Anforderungen.

**Ergebnis:** Architekturentscheidung und lauffähiger technischer
Skeleton.

## SPIKE-004 -- Runtime Storage

**Priorität:** P1

Vergleichen:

-   VS-Code-Workspace-Storage.
-   Extension Global Storage.
-   Lokale Datenbank.
-   Event-Log-Strategie.
-   Workspace-Zuordnung.
-   Recovery und Datenmigration.

**Ergebnis:** Storage Decision Record mit begründeter Auswahl.

------------------------------------------------------------------------

# 13. Nichtfunktionale Anforderungen

Die folgenden Anforderungen gelten produktweit. Konkrete Schwellenwerte
müssen anhand eines repräsentativen Testprojekts festgelegt werden.

## Performance

-   Dashboard und Board müssen bei üblichen Projektgrößen reaktionsfähig
    bleiben.
-   Agent-Events dürfen die UI nicht blockieren.
-   Dateiänderungen sollen inkrementell verarbeitet werden, wo sinnvoll.
-   Große Event-Historien dürfen nicht vollständig in den UI-Speicher
    geladen werden müssen.

## Reliability

-   Agent-Fehler dürfen keine Spec-Daten beschädigen.
-   Persistierte Runs müssen nach Neustart korrekt klassifiziert werden.
-   Event-Verarbeitung muss mit doppelten oder verspäteten Events
    umgehen können.
-   Statusänderungen müssen konsistent sein.

## Security

-   Secrets gehören in geeignete Secret-Storage-Mechanismen, nicht in
    Projektdateien.
-   Logs dürfen keine Credentials enthalten.
-   Workspace-Zugriffe müssen auf den vorgesehenen Kontext begrenzt
    sein.
-   Tool- und Terminalberechtigungen müssen nachvollziehbar sein.
-   Externe Provider erhalten nur den für den Auftrag erforderlichen
    Kontext.
-   Kritische Aktionen benötigen passende Freigaben.

## Usability und Accessibility

-   Wesentliche Informationen müssen ohne Öffnen der Markdown-Dateien
    sichtbar sein.
-   Status und Fehler dürfen nicht ausschließlich über Farben vermittelt
    werden.
-   Board-Aktionen sollen per Tastatur bedienbar sein.
-   Empty-, Loading-, Error- und Permission-States sind vollständig zu
    spezifizieren.
-   VS-Code-Themes müssen berücksichtigt werden.

## Compatibility

-   Ziel ist VS Code Desktop.
-   Node.js-/SDK-Voraussetzungen müssen mit dem Extension Host
    kompatibel sein.
-   Webview und Extension Host müssen sauber getrennt sein.
-   Einschränkungen in Remote- und Container-Workspaces müssen
    dokumentiert werden.

## Privacy

-   Keine Telemetrie mit Spec-Inhalten, Prompts oder Quellcode ohne
    ausdrückliche Produktentscheidung.
-   Lokale Speicherung und Datenübertragung müssen transparent sein.
-   Provider-Übertragung muss dem Benutzer erkennbar sein.
-   Aufbewahrung und Löschung von Agent-Events müssen spezifiziert
    werden.

------------------------------------------------------------------------

# 14. Teststrategie

## Unit Tests

-   Parser und Schema-Mapping.
-   Lifecycle-Regeln.
-   Readiness-Prüfung.
-   Statusübergänge.
-   Event-Normalisierung.
-   Provider-Registry.
-   Run-Lifecycle.
-   Persistenz.

## Fixture Tests

Ein repräsentatives FeatherSpec-Testprojekt muss enthalten:

-   gültige Specs;
-   unvollständige Specs;
-   fehlerhafte Markdown-Dateien;
-   Pläne mit Tasks;
-   Acceptance Criteria;
-   fehlende Abhängigkeiten;
-   abgeschlossene und offene Verifikationen;
-   externe Dateiänderungen.

Die Fixtures müssen aus dem tatsächlichen FeatherSpec-Format abgeleitet
werden.

## Integration Tests

-   Workspace Discovery.
-   File Watcher.
-   Extension Host ↔ Webview Messaging.
-   Runtime Storage.
-   Fake Provider.
-   Agent-Run-Lifecycle.
-   Recovery.

## End-to-End Tests

Der komplette MVP-Workflow muss mit einem Fake Provider ohne echte
API-Kosten automatisiert testbar sein.

Ein zusätzlicher manueller Test mit dem echten Provider validiert
Authentifizierung, Streaming, Berechtigungen und reale Agent-Ausführung.

## Provider Contract Tests

Jeder Provider Adapter muss denselben internen Contract-Test bestehen.
Nicht unterstützte Fähigkeiten müssen explizit gekennzeichnet werden.

------------------------------------------------------------------------

# 15. Risiken und Gegenmaßnahmen

  -----------------------------------------------------------------------
  Risiko                  Auswirkung              Gegenmaßnahme
  ----------------------- ----------------------- -----------------------
  FeatherSpec-Format wird Parser und UI bauen auf Repository Audit vor
  falsch angenommen       falschen Daten auf      FS-002-Freigabe

  Lifecycle wird parallel Inkonsistente Status    Bestehende Regeln
  zum Framework definiert                         zuerst mappen

  SDK-Authentifizierung   Provider kann nicht wie Feasibility Spike und
  ist nicht für           geplant genutzt werden  offizielle Bedingungen
  Drittanbieter geeignet                          prüfen

  Provider liefern        Uneinheitliches         Capability Model und
  unterschiedliche Events Monitoring              normalisierte Events

  Agent läuft nach        Veralteter Status oder  Recovery- und
  Extension-Neustart      verwaiste Prozesse      Process-Lifecycle
  weiter                                          spezifizieren

  Drag & Drop startet     Vertrauens- und         Readiness, sichtbare
  unerwartete Aktionen    Sicherheitsproblem      Aktivierungsregel und
                                                  Permission Controls

  Mehrere Agenten         Konflikte und           Multi-Agent erst nach
  verändern dieselben     Datenverlust            Worktree-Konzept
  Dateien                                         

  Zu viele                Verzögerung und         Fokus auf Dashboard,
  Visualisierungen im MVP Komplexität             Board und grundlegendes
                                                  Monitoring

  Zweite Datenhaltung     Inkonsistenz            Markdown bleibt Source
  widerspricht Markdown                           of Truth; Runtime
                                                  Storage nur für
                                                  Laufzeitdaten
  -----------------------------------------------------------------------

------------------------------------------------------------------------

# 16. Roadmap nach Produktphasen

## Phase 0 -- Product Foundation

-   SPIKE-001 Repository Audit.
-   SPIKE-002 Agent SDK Feasibility.
-   SPIKE-003 Extension Architecture.
-   SPIKE-004 Runtime Storage.
-   FS-001 bis FS-004 spezifizieren und freigeben.

**Exit Criteria:** Schema, Lifecycle, Runtime-Datenmodell und
Architekturleitplanken sind abgestimmt.

## Phase 1 -- Visual MVP

-   FS-005 Studio Shell.
-   FS-006 Mission Control.
-   FS-007 Spec Board & Detail.

**Exit Criteria:** Ein Entwickler kann sein FeatherSpec-Projekt visuell
überblicken und Specs navigieren.

## Phase 2 -- Agent MVP

-   FS-009 Provider Abstraction.
-   FS-010 First Provider.
-   FS-011 Orchestrator.
-   FS-008 Activation Workflow.

**Exit Criteria:** Eine Ready-Spec kann aus dem Board heraus einen
echten Agent-Run starten.

## Phase 3 -- MVP Observability und Stabilisierung

-   FS-012 Live Monitoring.
-   Recovery.
-   Fehlerzustände.
-   Security- und Permission-Tests.
-   End-to-End-Abnahme.

**Exit Criteria:** Der gesamte Spec-to-Agent-to-Review-Workflow ist
nachvollziehbar und stabil.

## Phase 4 -- Post-MVP

-   Weitere Provider.
-   Dependency Map.
-   Agent Flow Graph.
-   Quality Center.
-   Multi-Agent Execution.
-   Git Worktree Management.
-   Token-/Kostenanalyse.
-   Session Replay.
-   Multi-Project Dashboard.

------------------------------------------------------------------------

# 17. Definition of Ready und Definition of Done

## Definition of Ready

Eine Spec darf erst zur Implementierung freigegeben werden, wenn:

-   Problem und Nutzermehrwert eindeutig sind.
-   User Story vorhanden ist.
-   Requirements eindeutig und testbar sind.
-   Acceptance Criteria überprüfbar sind.
-   Abhängigkeiten dokumentiert sind.
-   Out of Scope klar abgegrenzt ist.
-   UX-Zustände und Fehlerfälle beschrieben sind.
-   Technische Constraints bekannt oder als konkrete Spike-Aufgabe
    eingeplant sind.
-   Verification Strategy feststeht.
-   Die Spec mit dem bestehenden FeatherSpec-Format kompatibel ist.

## Definition of Done

Eine Spec gilt erst als abgeschlossen, wenn:

-   Alle verpflichtenden Acceptance Criteria erfüllt sind.
-   Implementierung vorhanden ist.
-   Automatisierte Tests erfolgreich sind.
-   Verifikationsnachweise vorliegen.
-   Kritische Fehler behoben sind.
-   Dokumentation aktualisiert ist, sofern erforderlich.
-   Keine unerlaubte Änderung an bestehenden FeatherSpec-Konventionen
    erfolgt ist.
-   Der bestehende FeatherSpec-Abschlussprozess erfolgreich durchlaufen
    wurde.

------------------------------------------------------------------------

# 18. Erfolgsmetriken

Die folgenden KPIs sollen nach dem MVP gemessen werden. Sie benötigen
jeweils eine dokumentierte Berechnungsdefinition.

  -----------------------------------------------------------------------
  KPI                                 Bedeutung
  ----------------------------------- -----------------------------------
  Time to Project Overview            Zeit bis zur vollständigen
                                      Projektübersicht

  Spec Activation Time                Zeit von Ready bis zum Agent-Start

  Agent Start Success Rate            Anteil erfolgreich gestarteter Runs

  Agent Completion Rate               Anteil abgeschlossener Runs

  Agent Recovery Rate                 Anteil erfolgreich
                                      wiederhergestellter Sessions

  Verification Coverage               Anteil verifizierter Acceptance
                                      Criteria

  Blocked Spec Ratio                  Anteil blockierter Specs

  Human Intervention Rate             Häufigkeit notwendiger menschlicher
                                      Eingriffe

  Dashboard Usage                     Nutzung der visuellen Bereiche
  -----------------------------------------------------------------------

Wichtig: Ein erfolgreicher Agent-Run ist kein ausreichender
Qualitätsnachweis. Die Verifikation der Requirements bleibt maßgeblich.

------------------------------------------------------------------------

# 19. Offene Product Decisions

Diese Entscheidungen müssen im Product Backlog als Decision Records
geführt werden.

  ------------------------------------------------------------------------------
  ID                      Frage                   Vorschlag
  ----------------------- ----------------------- ------------------------------
  PD-001                  Welcher Provider wird   Copilot SDK als erster
                          zuerst integriert?      Spike-Kandidat

  PD-002                  Startet Drag & Drop     Ja, nach Readiness-Prüfung und
                          automatisch einen       eingerichtetem
                          Agenten?                Permission-Modell

  PD-003                  Wo werden Runtime-Daten Lokale Storage-Abstraktion;
                          gespeichert?            konkrete Technologie nach
                                                  Spike

  PD-004                  Wie werden              Zunächst abgeleitet, sofern
                          Ready/Review/Blocked    FeatherSpec keine eigene
                          persistiert?            Repräsentation hat

  PD-005                  Wie viele Runs pro      Ein aktiver Run im MVP
                          Spec?                   

  PD-006                  Wie werden              Provider-konform, keine
                          Tool-Berechtigungen     pauschale Freigabe
                          gehandhabt?             

  PD-007                  Welche Sessions können  Nur wenn Provider dies
                          wiederaufgenommen       offiziell unterstützt
                          werden?                 

  PD-008                  Ist React gesetzt?      Empfehlung, durch
                                                  Extension-Architecture-Spike
                                                  bestätigen

  PD-009                  Ist MCP im MVP          Nein; nur aufnehmen, wenn der
                          erforderlich?           erste Provider-POC es fachlich
                                                  notwendig macht

  PD-010                  Werden fremde, bereits  Nicht im MVP; zunächst nur von
                          laufende Agent-Sessions Studio gestartete Runs
                          übernommen?             

  PD-011                  Wie werden externe      Konflikt- und
                          Dateiänderungen während Aktualisierungsregeln vor
                          eines Agent-Runs        Implementierung festlegen
                          behandelt?              

  PD-012                  Wie werden Daten        Lokale Retention-Regeln im
                          gelöscht bzw.           Persistenzkonzept festlegen
                          aufbewahrt?             
  ------------------------------------------------------------------------------

------------------------------------------------------------------------

# 20. Konkreter Arbeitsauftrag für den Product Owner

Der PO soll in dieser Reihenfolge vorgehen.

## Schritt 1 -- Repository Discovery

SPIKE-001 durchführen. Das tatsächliche FeatherSpec-Format und die
vorhandenen Workflows dokumentieren.

Lieferartefakte:

-   Repository Structure Map.
-   Spec Schema.
-   Plan Schema.
-   Lifecycle Mapping.
-   Verification Mapping.
-   Liste bestehender Commands/Skills/Workflows.
-   Liste unbekannter oder inkonsistenter Konventionen.

## Schritt 2 -- Foundation Specs finalisieren

FS-001 bis FS-004 mit den Ergebnissen aus dem Repository Audit
abgleichen.

Besonders FS-002 und FS-003 dürfen erst nach dem Audit als
implementierungsbereit gelten.

## Schritt 3 -- Architektur-Spikes

SPIKE-002 bis SPIKE-004 durchführen.

Lieferartefakte:

-   Provider Evaluation Matrix.
-   Provider Proof of Concept.
-   Extension Architecture Decision.
-   Storage Decision Record.
-   Security/Authentication Decision Record.

## Schritt 4 -- MVP UX spezifizieren

FS-005 bis FS-007 mit konkreten Screens, Zuständen, Interaktionen und
Fehlerfällen vervollständigen.

## Schritt 5 -- Agent Workflow spezifizieren

FS-009 bis FS-011 und anschließend FS-008 vervollständigen.

## Schritt 6 -- Monitoring spezifizieren

FS-012 anhand der tatsächlich verfügbaren Provider-Events finalisieren.

## Schritt 7 -- MVP Abnahme vorbereiten

Einen durchgängigen End-to-End-Testfall definieren und die Definition of
Done für das gesamte MVP bestätigen.

------------------------------------------------------------------------

# 21. MVP End-to-End-Abnahmeszenario

Das MVP gilt als erfolgreich, wenn folgender Ablauf funktioniert:

1.  Entwickler öffnet ein bestehendes FeatherSpec-Projekt.
2.  Studio erkennt das Projekt.
3.  Alle gültigen Specs werden eingelesen.
4.  Mission Control zeigt den Projektzustand.
5.  Spec Board zeigt die Specs in den korrekten Spalten.
6.  Entwickler öffnet eine implementierungsbereite Spec.
7.  Entwickler zieht sie nach Active.
8.  Studio prüft die Readiness.
9.  Ein konfigurierter Agent wird gestartet.
10. Agent erhält Spec und freigegebenen Implementierungskontext.
11. Agent-Status und verfügbare Events erscheinen live.
12. Fehler und Freigabeanforderungen sind sichtbar.
13. Agent beendet die Implementierung.
14. Run wird als Completed oder entsprechendem Endzustand gespeichert.
15. Spec wechselt nach Review.
16. Entwickler prüft das Ergebnis.
17. Der bestehende FeatherSpec-Verifikationsprozess entscheidet über
    Done.

Der Ablauf muss mit einem Fake Provider automatisiert testbar sein und
zusätzlich mit dem ausgewählten echten Provider manuell validiert
werden.

------------------------------------------------------------------------

# 22. Abschließende Produktdefinition

FeatherSpec Studio ist das visuelle Command Center für Spec-Driven
Development.

Es verbindet Spezifikationen, Requirements, Implementierungspläne,
Abhängigkeiten, KI-Agenten, Codeänderungen und Qualitätsnachweise in
einer zentralen VS-Code-Oberfläche.

Das Produkt zeigt nicht nur, was entwickelt wird, sondern auch:

-   warum es entwickelt wird;
-   welcher Agent daran arbeitet;
-   was der Agent tatsächlich tut;
-   welche Dateien betroffen sind;
-   welche Anforderungen erfüllt sind;
-   welche Probleme bestehen;
-   ob das Ergebnis verifiziert wurde.

**FeatherSpec Studio -- See everything. Control every agent. Build with
specs.**

------------------------------------------------------------------------

## Anhang A -- Empfohlene Artefakte im Product-Owner-Arbeitsbereich

Der PO sollte aus diesem Konzept mindestens folgende eigenständige
Arbeitsartefakte ableiten:

1.  Product Vision und Scope.
2.  Personas und User Journeys.
3.  Repository Audit / FeatherSpec Schema.
4.  Domain Model.
5.  Lifecycle und State Transition Model.
6.  Architecture Decision Records.
7.  Provider Evaluation Matrix.
8.  MVP Epic Backlog.
9.  Einzelne FeatherSpec-Spezifikationen.
10. UX-Flows und Wireframes.
11. Test- und Verification Strategy.
12. MVP Release Checklist.

## Anhang B -- Glossar

  Begriff                Bedeutung
  ---------------------- ---------------------------------------------
  Spec                   Fachliche/technische Spezifikation
  Requirement            Einzelne Anforderung
  Acceptance Criterion   Überprüfbares Akzeptanzkriterium
  Plan                   Implementierungsplan für eine Spec
  Task                   Einzelne Arbeitseinheit
  Agent Provider         Anbieter bzw. Runtime eines Coding-Agenten
  Agent Run              Konkreter Ausführungsversuch eines Agenten
  Agent Session          Provider-seitige Session eines Agenten
  Agent Event            Einzelnes Ereignis während eines Runs
  Verification           Nachweis, dass Anforderungen erfüllt sind
  Readiness              Prüfung, ob eine Spec gestartet werden darf
  Mission Control        Zentrales Projekt-Dashboard
  Spec Board             Visuelles Kanban für Specs
  Agent Center           Monitoring und Steuerung von Agent-Runs
  Source of Truth        Maßgebliche Datenquelle
