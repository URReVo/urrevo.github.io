# Changelog

## V74 — Fünf Spiele, gemeinsame Statistik und Spielzeit

- **Persönlicher Impostor** aus dem aktuellen Prototypen in Produktion übernommen: 3–12 Spieler, 100 kuratierte Fragepaare, gemischte Antworttypen, gemeinsame Antwortübersicht und animierte Impostor-Auflösung ohne Voting-Screen.
- Gemeinsame Sessions und Statistik auf alle fünf Spiele erweitert. Wer bin ich?, Scharade und Persönlicher Impostor werden jetzt wie Circa und Classic vollständig im Launcher erfasst.
- Scharade-Statistiken um richtige und übersprungene Begriffe, Durchschnitt, Bestwert und entsprechende Achievements/Awards ergänzt.
- Geräteweite Spielzeitmessung ergänzt: App-Gesamtzeit sowie Zeit pro Spiel; nur sichtbare Vordergrundzeit wird gezählt, Hintergrund und Lockscreen nicht.
- Preset-Editor erweitert: konkrete Profile, Mehrfachkategorien und spielabhängige Optionen; neue Spieler können direkt aus der Preset-Spielerauswahl angelegt und sofort ausgewählt werden.
- Statistik-Karten mit eindeutigen Bezeichnungen versehen; Achievements für alle fünf Modi, Impostor-Rollen, Scharade-Leistungen und lange Sessions ergänzt.
- Web-Audio der neueren Modi für iOS/PWA-Foreground-Wechsel gehärtet; Scharade-Abbruchlogik korrigiert.
- Bestehende V73-Spielstände werden einmalig nach `imposterGames.v74.game.*` kopiert. Die bisherigen `imposterGames.v73.game.*`-Keys bleiben dabei unverändert als Sicherheitskopie bestehen.
- V74R2 behebt Statistik-/Profil-/Preset-Regressionsfehler, repariert verunreinigte Circa-Kategorien und vereinheitlicht Rundenschutz sowie Beschriftungen.
- V74R3 sortiert Achievements in der Statistik nach benötigter Zielmenge.
- V74R4 ergänzt geschützte Launcher-DEV-Tools für Statistik, Spielzeit, Achievements, Content-Fortschritt und Sessions und erweitert die Release-Validierung um Content-Qualitäts- und Logiktests.
- V74R5 bündelt das App-Feeling in einer gemeinsamen UI-Schicht: Touch-Pressed-Feedback, weichere Navigation, Toasts, Achievement-Unlock-Hinweise, explizite In-App-Updates, animierte Launcher-Tabs, Swipe-down-Sheets und eine persistente Mini-Session-Leiste.
- V74R6 ergänzt DEV-Vorschauen für Achievement-Popups, Toasts, Offline-/Update-Hinweise, Haptik und Mini-Session. Circa/Classic erhalten sie im bestehenden DEV-Panel; die übrigen Spiele bekommen nach DEV-Entsperrung einen gemeinsamen Testzugang in der Spiel-Toolbar.
- V74R7 überarbeitet die Launcher-Bottom-Sheet-Geste mit größerem Touch-Ziel, Header-Drag, Distanz- und Flick-Erkennung, Horizontal-Abbruch, Backdrop-Feedback und sauberem Snap-back.
- V74R8 führt eine freiwillige Kategorie-Progression ein: rund 70–75 % der Kategorien bleiben sofort offen, drei sichtbare Bonus-Packs können entweder über transparente Challenges oder frei wählbare Freischaltungen bei 8/20/40 Gesamtrunden geöffnet werden. Gesperrte Kategorien bleiben sichtbar, „Alle“ respektiert Locks und Presets können sie nicht umgehen.
- V74R9 ergänzt die zentrale Feedback Engine V1: leistungsabhängige Feedback-Stufen 1–3, Sound/Haptik, seltene Hero-Momente, persönliche Rekorde, Session-Meilensteine, ehrliche Fast-geschafft-Hinweise, Session-Finale und eine gemeinsame Prioritäts-Queue für Achievements, Kategorie-Unlocks und Rundenfeedback. DEV-Vorschauen decken alle drei Stufen und das Session-Finale ab.
- V74R10 führt den Party-Pass ein: identische Profilgruppen werden automatisch als Crew erkannt, erhalten gemeinsame Level, frei wählbare Crew-Ziele, dauerhafte Crew Memories und einen „Willkommen zurück“-Anker auf Home. Bestehende Sessions werden rückwirkend ausgewertet; Crew-Ziele verfallen nicht. Crew-Level-Ups und abgeschlossene Crew-Challenges laufen durch die Feedback Engine, inklusive DEV-Vorschauen.
- V74R11 ergänzt ein persönliches Level-System für jedes Profil. Profil-XP entsteht aus eigenen Runden, Spielvielfalt, entdecktem Content und kleinen Leistungsboni; Profil und Crew nutzen dieselbe Level-Kurve, bleiben aber logisch getrennt. Level-Up-Feedback, Header-/Profilkarten-Anzeige, persönliche Statistik und DEV-Vorschau wurden ergänzt.
- V74R12 härtet die gemeinsame Progression: persönliche XP bleibt erfahrungsgetrieben, Leistungsboni sind bewusst gedeckelt und Crew-/Profil-Semantik ist technisch getrennt. Updates derselben Runden-ID dürfen Ergebnisse korrigieren, aber keine neue Content-Identität und damit keine künstliche Discovery-XP erzeugen; partielle Outcome-Updates behalten bestehende Rundendaten.
- V74R13 ist ein motivierender Design-/Game-Feel-Pass ohne neue Zwangsmechaniken: dynamischer Home-Hero, Avatar-XP-Ring, ein einziges kontextabhängiges nächstes Ziel, sichtbarer Profilfortschritt direkt auf den Spielkarten, Zufallsentscheidung für Unentschlossene und ein stärkeres Session-Highlight. Die fünf Spiele erhalten klarere visuelle Identitäten, taktilere Press-States und weichere Screen-Transitions; Classic inszeniert die Impostor-Rolle deutlicher und Scharade zeigt die verbleibende Zeit zusätzlich als Energie-Leiste.
- V74R14 korrigiert den Ablauf des Persönlichen Impostors: Nach der letzten Eingabe wird zuerst die gemeinsame richtige Frage aufgedeckt, erst danach erscheinen die Antworten; die Impostor-Frage bleibt bis zur Auflösung geheim. Gleichzeitig wurden die aktiven Spielscreens auf die verbleibende Viewport-Höhe fixiert und primäre Spielaktionen in Circa, Classic, Wer bin ich? und Persönlicher Impostor konsequent am unteren Rand verankert.
- V74R15 behebt drei UI-Details: Der Profil-Avatar im Launcher nutzt wieder einen neutralen Hintergrund ohne orangenen XP-Füllring, die beiden Hero-Aktionen „Session fortsetzen“ und „Nächstes Ziel“ erhalten zusätzlichen Abstand, und die Aktionsbuttons des Persönlichen Impostors werden als feste Safe-Area-Bottom-Actions gerendert, damit sie unabhängig von Kartenhöhe oder iOS-Viewport wirklich am unteren Bildschirmrand sitzen.
- V74R16 überarbeitet die Spielinhalte: Scharade verwendet in „Aktionen & Situationen“ nur noch kompakte Einzelbegriffe statt beschreibender Phrasen; die komplette Datenbank bleibt bei 300 eindeutigen Begriffen. Beim Persönlichen Impostor wurden alle 100 Paare geprüft und 22 zu weit auseinanderliegende bzw. zu leicht unterscheidbare Fragen neu ausbalanciert. Antworttyp, Einheit und Eingabegrenzen bleiben dabei unverändert; die Spielbeschreibung betont nun „anders, aber vergleichbar“ statt maximaler Distanz.
- V74R17 ergänzt **Local Progress Integrity V1**: Der bestehende LocalStorage-App-State bleibt erhalten, während ein zusätzlicher signierter Checkpoint in IndexedDB progressionrelevante Statistiken, Profilfortschritt, Kategorie-Unlocks, Achievements und die relevanten Daten der bis zu 50 gespeicherten Sessions absichert. Der HMAC-Schlüssel wird per WebCrypto nicht exportierbar erzeugt.
- Beim ersten R17-Start wird der vorhandene Stand vor der ersten Versiegelung plausibilisiert; eindeutig unmögliche Relationen werden repariert, doppelte gespeicherte Runden-IDs bereinigt und zuvor ein unveränderter Pre-R17-Recovery-Snapshot in IndexedDB abgelegt. Die 50-Session-Grenze bleibt unverändert und ältere legitime Gesamtstatistik wird nicht aus der begrenzten Session-Historie zurückgerechnet.
- Vor jeder neuen Runde in Circa, Classic, Wer bin ich?, Scharade und Persönlicher Impostor wird der Checkpoint geprüft. Direkte LocalStorage-Manipulationen an Fortschritt, Kategorien oder progressionsrelevanten Sessiondaten werden auf den letzten gültigen Stand zurückgesetzt; ein bereits initialisierter, aber fehlender/ungültiger Checkpoint wird nicht still neu akzeptiert.
- DEV-Statistik-/Session-Manipulationen bleiben vom echten Fortschritt getrennt und werden beim nächsten echten Rundenstart nicht als vertrauenswürdiger Checkpoint übernommen. Backup V3 bleibt portabel; vor einem Export wird der lokale Checkpoint geprüft, beim bewussten Import wird der importierte Stand neu lokal versiegelt.
- Automatisierte R17-Regressionstests decken Erst-Migration, 51 Sessions bei weiterhin maximal 50 gespeicherten Sessions, manipulierte globale/Profil-Statistik, gefälschte Kategorie-Unlocks, manipulierte Sessionrunden und anschließenden legitimen Fortschritt ab.
- V74R18 korrigiert die Aktionsbuttons des Persönlichen Impostors nach dem Circa-Muster: keine separat fixierten Safe-Area-Buttons mehr, sondern Flexbox-Verankerung innerhalb des jeweiligen Spielscreens. Primäraktionen verwenden wieder die gemeinsamen 48-px-Abmessungen; die beiden Ergebnisaktionen bleiben auch auf schmalen iPhones nebeneinander wie bei Circa.
- V74R19 gleicht die Aktionsbuttons des Persönlichen Impostors technisch vollständig an Circa an: „Antwort speichern“ verwendet nun dieselbe `confirmButton`-Regel, „Richtige Frage aufdecken“ und „Auflösung“ dieselbe `stageButton`-Regel und die Ergebnisaktionen dieselben `grid2 resultActions`-Regeln. Eigene Größen-/Bottom-Regeln wurden entfernt, damit Höhe, Flex-Verankerung und untere Safe-Area-Baseline wirklich identisch sind.
- V74R20 behebt den verbleibenden iOS/PWA-Viewport-Versatz beim Persönlichen Impostor. Anders als Circa setzte dieser Modus bei Screenwechseln den Dokument-Scroll bislang nicht auf `0` zurück. Dadurch konnte ein Scroll-Offset des Setups oder der eingeblendeten Tastatur den gesamten 100-dvh-Spielcontainer nach oben verschieben. Screenwechsel setzen den Viewport nun wie Circa auf den Dokumentanfang zurück; nach einer Antwort wird die Eingabetastatur vor dem Wechsel explizit geschlossen und der Viewport nach der iOS-Tastaturanimation erneut stabilisiert.
- V74R21 führt einen vollständigen Projekt-Audit über Produktions- und Prototyp-Dateien ein. Geprüft werden JavaScript-Syntax, JSON, HTML-IDs und Ressourcenpfade, Content-Zähler und IDs, doppelte Begriffe/Fragen, Personal-Antwortverträge, Service-Worker-Dateien sowie Web-/iOS-Datenparität. Der Audit läuft künftig zusätzlich im normalen Release-Workflow.
- Der Audit entfernt verbliebenen Altcode beim Persönlichen Impostor: produktives CSS ist nicht mehr als `prototype-only` gekennzeichnet, ungenutzte Action-Markerklassen sind entfernt und der Launcher beschreibt die Impostor-Frage wieder konsistent als „anders, aber vergleichbar“.
- Die Action-Geometrie des Persönlichen Impostors ist jetzt auch strukturell an Circa gekoppelt: `questionReveal` nutzt dieselbe feste Stage-Button-Höhe, die Ergebnisleiste verwendet dieselbe `resultActions`-ID wie Circa und ein später alter `.resultActions { margin-top: 7px }`-Override wurde entfernt. Dadurch bleibt die untere Flex-Baseline in allen Reveal-/Result-Screens einheitlich.
- Die mit R17 asynchron gewordenen Rundenstarts sind gegen schnelle Doppeltipps abgesichert. Circa, Classic, Wer bin ich?, Scharade und Persönlicher Impostor erlauben jeweils nur einen laufenden Startvorgang, bis Integritätsprüfung und Rundenvorbereitung abgeschlossen sind.
- Produktionsstand auf **V74R21** / Offline-Cache **r21** angehoben.
- V74R22 trennt Altstands-Migration und Backup-Import klar: Die lokale Erst-Migration darf weiterhin eindeutig inkonsistente Altwerte vorsichtig reparieren; ein bewusst importiertes Backup wird dagegen vor jeder Zustandsänderung vollständig auf Plausibilität geprüft und bei nötiger Reparatur komplett abgelehnt.
- Die Importprüfung validiert zusätzlich Kategorie-Freischaltungen: unbekannte Packs/Methoden werden abgelehnt, Ticket-Unlocks dürfen die anhand der Gesamtrunden verdienten Tickets nicht überschreiten, Popkultur muss die Spielvielfalt und Technik die erforderliche Unique-Content-Menge belegen. Beim sessionbasierten Spicy-Unlock wird die begrenzte 50-Session-Historie berücksichtigt: Ein sichtbarer 10-Runden-Abend gilt als Beleg; fehlt er, bleibt der Unlock nur plausibel, wenn die Lifetime-Runden zeigen, dass ältere Runden bereits aus der gespeicherten Historie gefallen sind.
- Manipulierte Backups werden auch dann abgelehnt, wenn nach der Änderung eine neue korrekte SHA-256-Prüfsumme berechnet wurde. Bei Ablehnung bleiben App-State, Game-Storage und lokaler Integrity-Checkpoint unverändert.
- Produktionsstand auf **V74R22** / Offline-Cache **r22** angehoben.
- V74R23 behebt den verbliebenen iOS/PWA-Tastatur-Viewport-Fehler beim Persönlichen Impostor. Nach Texteingaben wird die aktive Spielhöhe nicht mehr allein aus `100dvh` abgeleitet, sondern mit `visualViewport.height` synchronisiert. Resize-/Scroll-/Focus-Hooks sowie gestaffelte Nachmessungen über die Tastatur-Schließanimation stellen sicher, dass Frage-, Handoff- und Folgescreens wieder bis zur unteren Safe-Area reichen.
- Produktionsstand auf **V74R23** / Offline-Cache **r23** angehoben.
- V74R24 ergänzt standardmäßig aktivierte, in den Einstellungen abschaltbare **Spielerinnerungen**. Bleibt eine Session aktiv und die PWA wird in den Hintergrund gelegt, plant die App lokal nach 10 Minuten eine kompakte Systembenachrichtigung mit Spielname, Spieler- und Rundenzahl; geheime Rollen, Wörter, Fragen oder Antworten werden niemals in der Benachrichtigung angezeigt.
- Ein Tipp auf die Erinnerung öffnet den Launcher und setzt – sofern die Session noch aktiv und spielbar ist – direkt die zuletzt aktive Spielgruppe fort. Kehrt man vorher in die App zurück oder wird die Erinnerung deaktiviert, wird der lokale Timer verworfen.
- Die DEV-Tools enthalten einen **Reminder-Test**: Nach Auswahl wird beim nächsten Verlassen der App sofort dieselbe Systembenachrichtigungsstrecke ausgelöst, damit Berechtigung, Darstellung und Rücksprung ohne zehn Minuten Wartezeit geprüft werden können.
- Die 10-Minuten-Erinnerung der reinen PWA bleibt technisch Best-Effort: Browser dürfen Hintergrund-JavaScript einfrieren, insbesondere iOS. Für garantiert zeitgenaue Zustellung im Hintergrund ist später Web Push mit Sender oder die native iOS-App erforderlich.
- Produktionsstand auf **V74R24** / Offline-Cache **r24** angehoben.
- V74R25 macht den DEV-Test der Spielerinnerung aussagekräftiger: Statt nur einen Test scharfzuschalten, öffnet „Reminder-Vorschau“ zuerst eine kompakte Spieleransicht mit exakt dem Titel und Text der späteren Systembenachrichtigung. Eine aktive Session kann direkt übernommen werden; alternativ stehen realistische Beispiele für alle fünf Spiele bereit. Von dort lässt sich der echte Systemtest beim Verlassen starten – ohne sichtbare DEV-Markierung in der Spieler-Benachrichtigung.
- Die Einstellung „Spielerinnerung“ ist bewusst als Spieleinstellung formuliert: **„Erinnert nach 10 Min. an eine offene Session“**. Browser-/Berechtigungsdetails werden dort nicht mehr angezeigt.
- Aktive Sessions werden nach **60 Minuten ohne Spielaktivität** automatisch abgeschlossen. Beim Wechsel zurück in die App, beim nächsten Spielstart und zusätzlich während längerer Vordergrund-Inaktivität wird geprüft. Leere vergessene Sessions werden verworfen; Sessions mit Runden enden am letzten echten Aktivitätszeitpunkt, damit stundenlang offen gelassene Sessions keine künstlich lange Session-Dauer und damit kein Marathon-Achievement erzeugen.
- Ein alter Reminder kann nach dieser Grenze keine abgelaufene Session wieder öffnen; stattdessen bleibt der Spieler im Launcher und bekommt einen kurzen normalen Hinweis.
- Produktionsstand auf **V74R25** / Offline-Cache **r25** angehoben.


## V73

- Native iOS auf Funktionsparität zur V73-PWA ausgebaut: Circa, Classic, Wer bin ich? und Scharade sind vollständig in SwiftUI umgesetzt; der letzte Spiel-Platzhalter wurde entfernt.
- Nativer App-Shell mit lokalen Profilen, persönlicher/Gesamt-Statistik, Sessions/Awards, Achievements, Schnellstart-Presets und Einstellungen ergänzt.
- Backup V3 nativ umgesetzt: SHA-256-Integritätsprüfung, PWA-kompatibler zentraler App-State und vollständiger V73-Game-Storage inklusive skalaren Einstellungen sowie gespeicherten Spielerlisten.
- Scharade auf den vollständigen Mehrspieler-Ablauf erweitert: Spielerrotation, 3-2-1-Countdown, Core Motion/Core Haptics, Touch-Fallback, Rundenergebnis, Gesamtrangliste, Repeat-Protection und persistente Wipprichtung.
- GitHub Actions erzeugt zusätzlich eine unsignierte iPhone-Device-IPA für Windows-Sideloading via AltStore/AltServer.


- Native iOS-Vorbereitung gehärtet: Produktions-JSONs werden explizit als App-Ressourcen gebündelt, der echte XCTest-Lauf ist wieder Pflicht in CI und Core Haptics besitzt einen UIKit-Fallback.
- Der iOS-Release-Validator verhindert künftig einen Rückfall auf Compile-only-CI oder fehlende Content-Ressourcen.

- Produktions-Audit: PWA-Manifest und README beschreiben jetzt konsistent alle vier Spiele; der Release-Validator schützt diese Vier-Spiele-Metadaten zusätzlich.
- Produktionsstand auf **V73R14** / Offline-Cache r14 angehoben.

- Launcher-Einstellungstext nach dem Vier-Spiele-Ausbau bereinigt: Sound gilt jetzt korrekt „für alle Spiele“ statt „für beide Spiele“.
- Produktionsstand auf **V73R13** / Offline-Cache r13 angehoben.

- **Scharade** aus `prototype-r16` in Produktion übernommen: 2–12 Spieler, 300 Begriffe in 12 Kategorien, Timer, Stirn-/Wippsteuerung, Touch-Fallback, Rundenauswertung und Gesamtergebnis.
- Die zuletzt getestete bidirektionale Sensorlogik nutzt primär `accelerationIncludingGravity` und trennt Vorwärts = Richtig von Zurück = Überspringen; 3-Sekunden-Sperre und Neutralzonen-Schutz bleiben erhalten.
- Eigene Produktions-Storage-Keys unter `imposterGames.v73.game.charades.*`; Spieler, Kategorien, Deck, Timer und Wipp-Richtung sind in Backup V3 enthalten.
- Launcher auf vier gleichwertige Spielkarten umgestellt und PWA-Offline-Cache um Scharade erweitert.
- Produktionsstand auf **V73R12** / Offline-Cache r12 angehoben.

- „Wer bin ich?“: Reveal-Inhalt ab „DIE BEGRIFFE“ um 10 px nach oben gesetzt, ohne Spieler-/Fortschrittszeile oder interne Kartenabstände zu verändern.
- Produktionsstand auf **V73R11** / Offline-Cache r11 angehoben.

- Neues Spiel **„Wer bin ich?“** aus dem Prototypen in Produktion übernommen: 2–12 Spieler, 275 eindeutige Begriffe in 11 Kategorien, geheime Weitergabe mit eigenem `???`, neutraler realer Spielabschnitt und gemeinsame Auflösung.
- Eigene Produktions-Storage-Keys unter `imposterGames.v73.game.whoami.*`; Spieler, Kategorien und Deck-Fortschritt sind in Backup V3 enthalten.
- Finales Prototype-r12-Abstandsverhalten beim Aufdecken übernommen: mehr Abstand zwischen Begriffskarten und „Gesehen“-Button.
- Produktionsstand auf **V73R10** / Offline-Cache r10 angehoben. — App-Shell, Profile und V72-Migration

- Neuer produktiver App-Shell-Launcher mit Home, lokalen Profilen, persönlicher/Gesamt-Statistik und Einstellungen.
- Stabile interne Profil-IDs eingeführt; Namen und Avatare können geändert werden, ohne dass zugehörige V73-Statistik verloren geht.
- V72-Spieler werden beim ersten Start automatisch aus Circa-Spielerstatistik sowie gespeicherten Circa-/Classic-Spielerlisten übernommen und über normalisierte Namen zusammengeführt.
- Vorhandene V72-Circa-Werte wie Runden, Closest/Farthest, Imposter-Einsätze, Imposter-Erfolge und Abweichungswerte werden dem neuen Profil zugeordnet.
- Einmalige Auswahl „Wer bist du?“ nach Migration mehrerer V72-Spieler; das gewählte Profil wird anschließend als Launcher-Profil verwendet.
- V72-Storage bleibt unverändert. Benötigte Spielstände und Einstellungen werden einmalig in den neuen Namespace `imposterGames.v73.game.*` kopiert.
- Gemeinsame Sessions über Circa und Classic mit Abschluss, Awards, Mitspielern, Dauer, Spielmix, Verlauf und erneutem Start derselben Gruppe.
- Persönliche und globale Statistikansicht sowie persönliche Achievements ergänzt.
- Presets, Sound/Haptik/Animationen und ausgewähltes Profil werden zentral im App-State verwaltet.
- Versionierter JSON-Export/-Import für lokale App-Daten ergänzt.
- Launcher-Navigation mit klareren Home-, Spieler- und Statistik-Icons überarbeitet.
- Service Worker um den neuen App-State erweitert und Offline-Release auf V73 angehoben.
- Release-Validator prüft zusätzlich App-State-Integration und simuliert die V72→V73-Profilmigration inklusive unveränderter Legacy-Keys.
- Plattform-/Asset-Version auf V73 angehoben.
- V73-Hotfix: Launcher-Inhalt um die iOS-Safe-Area nach unten versetzt, damit Profil und Einstellungen nicht vom oberen Standalone-Blur überlagert werden.
- V73-Hotfix: alte Circa-QIDs werden nachträglich in Kategorien aufgelöst; Spielern, die nachweislich an allen V72-Circa-Runden teilgenommen haben, können diese QIDs/Kategorien exakt persönlich zugeordnet werden.
- V73-Hotfix: unvollständig rekonstruierbare V72-Fortschritte werden sichtbar als teilweise/unbekannt gekennzeichnet; insbesondere wurde „Punktlandung“ in V72 nicht separat gezählt.
- Offline-Cache für die V73-Hotfixes auf Revision r2 angehoben.
- V73-Audit: Statistik-/Session-Zählung, Profilidentität, Reset, Backup V2 und zentrale Einstellungen gehärtet; geprüfter Laufzeitstand als Cache-Revision r3 veröffentlicht.
- V73-Hotfix: dezente Web-Audio-UI-Töne im Launcher für Navigation, Profilwahl, Spielstart, Session-Aktionen und Bestätigungen ergänzt. Die Töne respektieren den globalen Sound-Schalter und benötigen keine Audiodateien.
- Offline-Cache für die Launcher-Audio-Erweiterung auf Revision r4 angehoben.
- V73-Backup V3 ergänzt: neue Exporte enthalten einen kanonisch berechneten SHA-256-Integritätswert; veränderte oder beschädigte V3-Dateien werden vor dem Schreiben in den lokalen Speicher abgewiesen.
- Backup-Downgrade-Schutz ergänzt: Import akzeptiert ausschließlich Backup V3 mit gültiger SHA-256-Prüfung. V1/V2 und ungekennzeichnete Alt-Snapshots werden abgelehnt, damit ein manuelles Herabsetzen von `formatVersion` die Integritätsprüfung nicht umgehen kann.
- V3-Backups bleiben weiterhin ohne PIN oder Gerätebindung auf andere Geräte übertragbar.
- Offline-Cache für den gehärteten Backup-V3-Import auf Revision r8 angehoben.
- Launcher zeigt den vollständigen Build-Stand `V73R9` im Seitentitel und im Info-Bereich der Einstellungen; der Home-Bereich bleibt unverändert.
- Offline-Cache für die Build-Anzeige auf Revision r9 angehoben.

Die Versionshistorie dokumentiert die aus den Projektchats und der GitHub-Historie eindeutig rekonstruierbaren Änderungen. Frühere Zwischenstände mit generischen Upload-Commits werden nicht künstlich versioniert oder mit erfundenen Details ergänzt.

## V72 — Audit-Fixes und Release-Validator

- Circa-Konzeptschutz korrigiert: ähnliche Konzepte werden weiterhin bevorzugt auseinandergehalten, aber ungespielte QIDs werden nie mehr wegen Konzeptähnlichkeit verworfen. Ein Deck wird erst zurückgesetzt, wenn alle geeigneten QIDs tatsächlich gespielt wurden.
- 18 Circa-Slider mit zu wenig Spielraum nach oben erweitert; jeder betroffene Slider besitzt nun mindestens rund 50 % Luft über dem höheren Zielwert.
- Alte Classic-Migrationskeys werden nach erfolgreicher Übernahme bzw. bei bereits vorhandenen aktuellen Keys aus `localStorage` entfernt.
- Audio-Unlock auf modernen Browsern nur noch über `pointerdown`; `touchstart` bleibt ausschließlich als Fallback für ältere WebKit-Versionen ohne Pointer Events.
- Offline-Cache speichert Launcher und Spielseiten nur noch unter ihren kanonischen Ordner-URLs; `index.html`-Navigationen werden auf diese Cache-Einträge abgebildet.
- Service Worker verwendet eine zentrale `RELEASE`-Konstante für Cache- und Asset-Versionen.
- Launcher zeigt dezent `Offline bereit`, `Offline-Modus`, Update-Status oder einen Offline-Fehler an.
- Automatischer Release-Validator und GitHub-Actions-Workflow ergänzt. Geprüft werden u. a. Versionsgleichheit, Cache-Version, wörtliche `\\n`-Reste, doppelte IDs, JSON-Struktur, Circa-Slider, Classic-Wörter/Hinweise und getrennte Spiel-DOMs.
- Versehentliche wörtliche `\\n`-Reste im README-Architekturbaum bereinigt.
- Plattform-/Asset-Version auf V72 angehoben.

## V71 — iOS-Sound und Security-Härtung

- V67-Audio-Resume-Serialisierung zurückgebaut und auf die zuvor bewährte V65/V66-Web-Audio-Logik zurückgeführt.
- Jeder Sound darf den `AudioContext.resume()`-Versuch wieder im auslösenden Nutzer-Event durchführen, statt hinter einer möglicherweise ungeeigneten früheren Resume-Promise zu warten.
- Neuere Hintergrund-/Foreground-Absicherungen und der echtzeitbasierte Classic-Timer bleiben erhalten.
- DEV-Status zeigt jetzt zusätzlich Sound an/aus und den aktuellen AudioContext-Zustand.
- Game-Ladefehler werden nicht mehr durch Verkettung einer Fehlermeldung in `innerHTML` gerendert, sondern ausschließlich über DOM-Knoten und `textContent`.
- Fehlgeschlagene Service-Worker-Installationen löschen einen eventuell halb gefüllten neuen App-Cache wieder.
- Offline-Release auf den atomaren Cache `imposter-games-v71-r1` angehoben.
- Plattform-/Asset-Version auf V71 angehoben.

## V70 — Offline/PWA

- Root-Service-Worker für Launcher, beide Spiele, gemeinsame Assets, Datenbanken und Icons ergänzt.
- App-Shell wird beim ersten erfolgreichen Online-Start vollständig vorab gecacht; schlägt das Pre-Caching fehl, wird die neue Worker-Version nicht installiert.
- Navigationen, JSON-Daten und versionierte Assets werden release-konsistent aus dem aktiven App-Cache bedient. Eine neue Version wird parallel vollständig vorbereitet und erst nach Aktivierung als Ganzes verwendet.
- Updates werden bei Online-Starts automatisch geprüft. Neue Worker werden nicht per `skipWaiting()` über eine laufende Runde erzwungen.
- Aktivierung einer neuen Version löscht ältere `imposter-games-*`-Caches automatisch; persönliche `localStorage`-Daten bleiben unberührt.
- Caching ist auf definierte App-Ressourcen begrenzt, damit sich keine unbegrenzten Runtime-Caches ansammeln.
- Web-App-Manifest für Standalone-Start, Theme, Portrait-Ausrichtung und App-Icons ergänzt.
- Bestehende Home-Screen-Verknüpfungen können weiterverwendet werden; ein Neu-Anlegen ist für V70 nicht erforderlich.
- Plattform-/Asset-Version auf V70 angehoben.

## V69 — iOS-Safe-Area wie Launcher

- Launcher als funktionierende Referenz für den iOS-Status-/Safe-Area-Bereich verwendet.
- Root-Hintergrund der Spielseiten auf eine echte feste Farbe `#292929` umgestellt, analog zum Launcher.
- Premium-Gradient bleibt optisch erhalten, wird aber nur noch als `background-image` auf dem Body gezeichnet.
- Verhindert, dass das CSS-`background`-Shorthand die Root-`background-color` auf transparent zurücksetzt und iOS oben einen hellen/weißen Streifen durchscheinen lässt.
- Body-Grundhöhe auf `100dvh` an den Launcher angeglichen.
- Plattform-/Cache-Version auf V69 angehoben.

## V68 — Ladezustand, Timer und Wiederholungen

- Wörtliches `\\n` aus dem `<head>` beider Spielseiten entfernt. Dieser ungültige Text konnte Safari den Head vorzeitig beenden lassen und war die Ursache für das sichtbare „/N“ sowie fehlerhaftes First-Paint-Verhalten.
- Beide Spiele starten jetzt mit einem atomaren Boot-Zustand: Die eigentliche App bleibt unsichtbar, bis Datenbank, Runtime, Event-Handler und Setup vollständig initialisiert sind.
- Classic-Timer von sekundenweisem `setInterval --` auf echte Uhrzeit/Deadline umgestellt. Hintergrund, Displaysperre und iOS-Timer-Throttling verfälschen die verbleibende Zeit dadurch nicht mehr.
- Timer-Pause/Fortsetzen berechnet eine neue Deadline; nach längerem Hintergrundbetrieb wird kein verspäteter Ablauf-Sound nachgespielt.
- Circa-Auswahl um einen konzeptbasierten Wiederholungsschutz erweitert. Nahezu identische Varianten desselben Fragethemas werden innerhalb desselben Deck-Zyklus übersprungen.
- Classic-Wortbank bereinigt: mehrfach verwendete Hinweise auf eindeutige Hinweise umgestellt; die semantische Doppelung „Aufzug/Fahrstuhl“ wurde durch „Aufzug/Rolltreppe“ ersetzt.
- Circa-Einheiten vereinheitlicht: `GB → Gigabyte`, `MB → Megabyte`, `kcal → Kalorien`, `Stücke → Stück`.
- Plattform- und Cache-Version auf V68 angehoben.

## V67 — First-Paint und iOS-Sound stabilisiert

- Kritische `.hidden`-Regel direkt in beide Spielseiten aufgenommen, damit versteckte Overlays bereits vor dem Laden der externen CSS-Datei unsichtbar bleiben.
- Dadurch kann beim Öffnen von Klassisches Imposter kein Circa-/Runden-Overlay mehr für einen kurzen First-Paint-Frame aufblitzen.
- Web-Audio-Resume für Safari und Home-Screen-App serialisiert: parallele `AudioContext.resume()`-Aufrufe teilen jetzt einen gemeinsamen Resume-Vorgang.
- Sounds, die während des Resume-Vorgangs ausgelöst werden, warten kurz auf den laufenden AudioContext statt verloren zu gehen.
- Fehlgeschlagene iOS-Resume-Versuche werden nicht festgehalten; der nächste echte Touch kann sofort erneut entsperren.
- `pageshow` und `visibilitychange` erzeugen keinen neuen AudioContext mehr außerhalb eines Benutzer-Tipps, sondern versuchen nur einen bereits existierenden Context wiederherzustellen.
- Veraltete wartende UI-Sounds werden nach längerem Hintergrundbetrieb nicht verspätet nachgespielt.
- Asset-/Plattformversion auf V67 angehoben.

## V66 — Spielseiten entkoppelt

- Hotfix: Classic-Hinweis-/Timeroptionen nach der DOM-Trennung wieder sichtbar gemacht; die Optionen gehören jetzt direkt zur Classic-Seite und hängen nicht mehr von der alten Modus-Umschaltung ab.

- Circa- und Classic-Spielseiten funktional entkoppelt, ohne Gameplay oder Designregeln zu verändern.
- Circa enthält keine Classic-Rollenkarte, Diskussion, Timer, Auflösung oder Classic-Optionen mehr.
- Klassisches Imposter enthält keine Circa-Statistik, Schwierigkeit, Schätzfrage, Frage-Reveal, Schätzungen oder Circa-Ergebnisansicht mehr.
- Gemeinsame Übergabe, Spieler-/Avatarlogik, Fairness, Audio, Storage, Navigation und DEV-Zugang bleiben zentral in der gemeinsamen Runtime.
- Section-Steuerung der Runtime auf tatsächlich vorhandene Screens pro Spiel umgestellt.
- Event-Registrierung nach Spieltyp getrennt, damit keine versteckten DOM-Platzhalter des anderen Spiels mehr benötigt werden.
- Slider-/Circa-Interaktionen werden nur noch in Circa initialisiert; Classic-Optionen nur noch in Classic.
- Cache-Version auf V66 angehoben.
- README um die neue Trennung ergänzt.

## V65 — Cleanup und Stabilität

- Falschen Speicherhinweis im klassischen Imposter korrigiert: Classic nennt jetzt Einstellungen und Wortfortschritt statt Statistiken und Fragenfortschritt.
- 83 Circa-Fragepaare mit insgesamt 105 zuvor nicht exakt erreichbaren Zielwerten korrigiert. Die richtigen Antworten bleiben unverändert; nur die Slider-Schrittweiten wurden so angepasst, dass beide Zielwerte eines Paares exakt auswählbar sind.
- Classic-DEV-Status `diagRoundDirty` wird bei einer neuen normalen Classic-Runde und beim Start einer neuen Partie sauber zurückgesetzt.
- Toten Modus-Altcode `setGameMode()` und den nicht mehr verwendeten Storage-Key `STORAGE_MODE` entfernt.
- Die Wahrscheinlichkeitsbegrenzung für 3-/4-Spieler-Fairness auf eine bounds-sichere Verteilung umgestellt und gegen extreme Gewichtungen geprüft.
- Cache-Busting für Launcher- und Game-CSS/JavaScript über `?v=65` ergänzt, damit iOS/Home-Screen-Installationen nach Releases seltener alte Assets mit neuem HTML mischen.
- Veraltete Versionslabels in aktiven Code-Kommentaren bereinigt.
- README korrigiert: Circa-Fragebank korrekt benannt und aktuelle Architekturtexte von unnötigen Versionsbezügen befreit.
- Plattform-, Circa- und Classic-Version auf V65 angehoben.

## V64 — Classic-DEV und Fairnessprüfung

- DEV-Tools des klassischen Imposter-Spiels vollständig auf den Classic-Ablauf umgestellt.
- Circa-spezifische QID-, Schätzfragen- und Ergebniswerkzeuge aus dem Classic-DEV entfernt.
- Aktuelles geheimes Wort mit WID, Kategorie und Hinweis im DEV sichtbar gemacht.
- Gezieltes Laden einer WID und zufälliges Laden eines Wortes nach Kategorie ergänzt.
- DEV-Wort kann bereits vor dem Spiel für die nächste Runde vorgemerkt werden, ohne den normalen Wort-Deckfortschritt zu verbrauchen.
- Classic-Screen-Jumps für Übergabe, Rollenkarte, Diskussion und Auflösung ergänzt.
- Impostor erzwingen für Classic repariert.
- Classic-Speicherstatus und Eventlog angepasst.
- 1000-Runden-Fairnesssimulation auch im Classic-DEV verfügbar.
- Fairnesslogik verifiziert: 3 Spieler 25–45 %, 4 Spieler 20–35 %, letzter Impostor mit Malus statt Sperre; ab 5 Spielern Gleichverteilung.
- DEV-Schaltflächen nach erfolgreicher Freischaltung nun auch im klassischen Spiel sichtbar.

## V63 — Spielnamen und getrennte Speicherstände

- **Faker Imposter** in **Circa Imposter** umbenannt.
- Spielpfad auf `games/circa-imposter/` umgestellt.
- Fragenbank auf `data/circa-questions.json` umbenannt.
- Spieler und Kategorien pro Spiel in getrennte `localStorage`-Namespaces aufgeteilt.
- Klassisches Imposter verwendet nun eigene `classicImpostor.*`-Schlüssel.
- Circa behält seine bisherigen `circaImpostor.*`-Schlüssel, damit bestehende Circa-Statistiken und Fortschritte erhalten bleiben.
- Classic-spezifische Altwerte für Wortdeck, Hinweis und Timer werden einmalig migriert.
- Gemeinsam gespeicherte Spieler und Kategorien werden bewusst nicht in Classic übernommen.
- Initialisierung getrennt: Jede Spielseite lädt nur noch den für sie relevanten Fortschritt und die relevanten Einstellungen.
- Launcher, README und direkte Spielpfade auf die korrekten Namen aktualisiert.

## V62 — Plattform- und Skalierbarkeitsumbau

- Root-`index.html` zu einem eigenständigen Spiele-Launcher umgebaut.
- **Faker Imposter** und **Klassisches Imposter** in eigene Spielpfade unter `games/` getrennt.
- Spielmodus-Auswahl aus den einzelnen Spielseiten entfernt.
- Gemeinsames Game-Design in `assets/css/game.css` ausgelagert.
- Launcher-Design in `assets/css/launcher.css` ausgelagert.
- Gemeinsame bestehende Game-Engine in `assets/js/game-engine.js` ausgelagert.
- Dynamischen Spielekatalog `data/games.json` eingeführt.
- Faker-Fragebank aus dem HTML gelöst und als `data/faker-questions.json` gespeichert.
- Classic-Wortbank inklusive Hinweise als `data/classic-words.json` gespeichert.
- Datenbanken mit `schemaVersion`, Spiel-ID und Zähler versehen.
- Navigation von jeder Spiel-Setupseite zurück zur Spieleauswahl ergänzt.
- Bestehende lokale Faker-Speicherstände/Statistik-Schlüssel bewusst beibehalten.
- README auf die neue Plattformarchitektur umgeschrieben.
- Eigenständiges `CHANGELOG.md` eingeführt.
- Architektur für spätere weitere Spiele, Realtime-Multiplayer und eine native iOS-Portierung vorbereitet.

## V61 — Hinweisqualität und Timer-Steuerung

- Alle 250 Hinweiswörter des klassischen Imposter-Modus überarbeitet.
- Zu direkte Ableitungen wie `Volleyball → Beachvolleyball` entfernt.
- Beispiel nach Überarbeitung: `Volleyball → Handball`.
- Qualitätsprüfung gegen identische, enthaltene oder nahezu identisch geschriebene Hinweise ergänzt.
- Timer-Auswahl als kompaktes Dropdown gestaltet.
- Timerbereich auf **Aus sowie 1:00 bis 5:00 Minuten in 30-Sekunden-Schritten** erweitert.
- Timer während der Diskussionsrunde pausierbar und wieder fortsetzbar gemacht.
- IMPOSTER-Optionen und Modusauswahl optisch flacher und näher an die bestehende Circa-Designsprache gebracht.

## V60 — Klassischen Imposter vereinfacht

- Schwierigkeitsstufen aus dem klassischen Imposter-Modus entfernt.
- Einstellung **Hinweis für Imposter: Ja / Nein** eingeführt.
- Hinweise von Kategorieangaben auf ähnliche Hinweiswörter umgestellt.
- Kategorie während laufender Classic-Runden vollständig verborgen.
- Diskussions-Timer eingeführt.
- In-App-Voting aus dem klassischen Modus entfernt.
- Letzte-Chance-/Gewinnerlogik entfernt.
- Auflösung auf direkten Reveal von Imposter und geheimem Wort vereinfacht.

## V59 — Zweiter Spielmodus

- Klassisches **IMPOSTER** als zweites spielbares Spiel in die damalige einzelne `index.html` integriert.
- Spielmodus-Auswahl eingeführt.
- 250 klassische Imposter-Wörter angelegt, 25 pro bestehender Kategorie.
- Eigener Classic-Deckfortschritt / Wiederholungsschutz ergänzt.
- Geheime Rollenübergabe hinzugefügt.
- Zufälligen Startspieler für die Diskussionsrunde eingeführt.
- Ursprünglich Schwierigkeits-/Hinweisvarianten, Gruppenvoting und letzte Chance zum Wort-Raten umgesetzt.
- Circa/Faker-Spielpfad parallel erhalten.

## V58 — Eindeutiger Fragenfortschritt

- Auf sauberem V54-Stand aufgebaut.
- Persistenten Zähler **„Erfolgreich gespielte Fragepaare: X / 520“** in den DEV-Tools ergänzt.
- Eindeutige QIDs separat gespeichert; Wiederholungen erhöhen den Gesamtzähler nicht erneut.
- Alte gespeicherte Fortschrittsdaten beim Laden validiert/bereinigt.
- Verworfene iOS-Experimente aus V55–V57 nicht übernommen.

## V55–V57 — iOS-27-Experimente (verworfen)

- Verschiedene Versuche zur Behebung des hellen oberen Bereichs/Statusbar-Verhaltens als iOS-Home-Screen-Web-App getestet.
- Die Versuche erwiesen sich nicht als belastbare Lösung.
- Änderungen anschließend vollständig zurückgenommen.
- V58 wurde wieder auf der sauberen V54-Basis aufgebaut.

## V54 — DEV-Text kopierbar

- Textauswahl und Kopieren innerhalb des geschützten DEV-Panels ermöglicht.
- Außerhalb des DEV-Panels blieb die app-ähnliche Sperre von Auswahl/Kontextmenü bestehen.

## V53 — Erweiterte DEV-Werkzeuge

- Screen-Jumps zu wichtigen Spielphasen ergänzt.
- Imposter für Test-Runden erzwingbar gemacht.
- Laden einer konkreten Frage anhand der QID ergänzt.
- Gefiltertes Laden zufälliger Fragen ergänzt.
- Eventlog mit bis zu 40 Einträgen eingeführt.
- DEV-manipulierte Test-Runden von dauerhaften Statistiken ausgeschlossen.

## V52 — Verstecktes Diagnostiksystem

- Geschützte DEV-Tools eingeführt.
- Freischaltung über sieben Logo-Taps und PIN-Gate.
- PIN-Prüfung über PBKDF2/SHA-256 mit 180.000 Iterationen umgesetzt.
- Sessionbezogene Entsperrung und Sperrmechanismen ergänzt.
- Anzeige von Session-/Frage-/Speicherinformationen.
- Anzeige der Imposter-Wahrscheinlichkeiten und bisherigen Auswahlhäufigkeiten.
- 1.000-Runden-Simulation für die Fairnesslogik ergänzt.

## V51 — Fairere Imposter-Auswahl

- Gewichtete Imposter-Auswahl für kleine Gruppen eingeführt.
- Bei 3 Spielern nächste Einzelwahrscheinlichkeit auf **25–45 %** begrenzt.
- Bei 4 Spielern auf **20–35 %** begrenzt.
- Bisher seltenere Imposter stärker gewichtet.
- Vorheriger Imposter erhält einen Malus, bleibt aber weiterhin auswählbar.
- Ab 5 Spielern weiterhin normale Gleichverteilung.
- Fairness-Zähler pro Spielsitzung und Reset beim Neustart ergänzt.

## V50 — Stabilerer Reveal-Header

- Feste Header-Höhe im Reveal-Ablauf eingeführt.
- Platz für unterschiedlich lange Hinweis-/Erklärungstexte reserviert.
- Weiße Karte vor und nach dem Reveal exakt auf derselben Y-Position gehalten.
- V49-Anpassungen beibehalten.

## V49 — Reveal-Karten ausgerichtet

- Fragezeichen-Karte und aufgedeckte Frage auf dieselbe vertikale Position gebracht.
- Platz für die Einheit reserviert, damit beim Reveal nichts springt.
- Reveal-Button auf konsistente 48 px Höhe vereinheitlicht.

## V47 — Erweiterte lokale Statistik

- Durchschnittliche Nähe zum richtigen Ergebnis ergänzt.
- Durchschnittliche prozentuale Abweichung ergänzt.
- Gesamtzahl der auf dem Gerät gespielten Runden ergänzt.
- Statistik blieb rein lokal.

## V46 — Lokale Statistiken

- Eigenen Statistikbereich eingeführt.
- Ranglisten für „am nächsten“, „am weitesten weg“, „am meisten Imposter“ und „meiste Imposter-Siege“ ergänzt.
- Am Ende einer Runde Abfrage eingeführt, ob sich der Imposter erfolgreich verstecken konnte.
- Spielerstatistiken lokal gespeichert.

## V45 — Reveal-Ablauf neu geordnet

- Fehlende Zwischenphase ergänzt: Zuerst wird die gemeinsame richtige Frage separat aufgedeckt.
- Danach werden richtige Frage und Schätzungen gezeigt.
- Erst anschließend folgen Imposter-Reveal und vollständige Auflösung.
- Animierten Reveal der richtigen Frage ergänzt.
- Fragenbank und Schwierigkeitssystem dabei unverändert gelassen.

## V43–V44 — Große Fragenüberarbeitung

- Fragenbank auf insgesamt 520 Fragepaare ausgebaut/überarbeitet.
- Normal- und Imposter-Fragen deutlich stärker inhaltlich voneinander getrennt.
- Ziel beibehalten, dass beide Fragen trotz unterschiedlicher Inhalte plausible, verwechselbare Zahlenantworten erzeugen.
- Eindeutige QIDs als Grundlage für Deck-/Testlogik verwendet.
- Kategorien und Fortschritte weiter in den lokalen Spielablauf integriert.

## Frühere Iterationen

Die frühen Versionen legten den grundlegenden lokalen Partyspiel-Ablauf, das mobile Design, Kategorien, Spielerübergabe, Schätz-Slider, Reveal-Phasen, Sound und lokale Speicherung an. Die damaligen GitHub-Commits sind überwiegend als generische Datei-Uploads dokumentiert; deshalb werden hier keine ungesicherten Einzelzuordnungen zu Versionsnummern erfunden.