# Changelog

Die Versionshistorie dokumentiert die aus den Projektchats und der GitHub-Historie eindeutig rekonstruierbaren Änderungen. Frühere Zwischenstände mit generischen Upload-Commits werden nicht künstlich versioniert oder mit erfundenen Details ergänzt.

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