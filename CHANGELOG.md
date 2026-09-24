# Changelog

## V73 — App-Shell, Profile und V72-Migration

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