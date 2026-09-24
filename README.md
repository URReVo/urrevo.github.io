# 🎭 Imposter Games

**Imposter Games** ist eine für iPhone und iPad optimierte Partyspiel-App mit zwei lokalen Imposter-Spielen.

**Aktuelle Version:** V73  
**Live:** https://urrevo.github.io/

Die App läuft direkt im Browser und kann auf iPhone oder iPad wie eine normale App zum Home-Bildschirm hinzugefügt werden. Alle Profile, Statistiken und Spielstände bleiben lokal auf dem Gerät.

## 📲 Am besten als App auf iPhone oder iPad nutzen

Für die beste Darstellung und das app-ähnlichste Gefühl sollte Imposter Games über **Safari zum Home-Bildschirm** hinzugefügt werden.

1. **https://urrevo.github.io/** in Safari öffnen.
2. Auf **Teilen** tippen.
3. **Zum Home-Bildschirm** auswählen.
4. Mit **Hinzufügen** bestätigen.
5. Imposter Games anschließend über das neue Symbol auf dem Home-Bildschirm starten.

Die Oberfläche ist für die Nutzung im **Hochformat** optimiert.

Nach dem ersten erfolgreichen Online-Start funktioniert die App auch offline. Neue Versionen werden im Hintergrund vorbereitet und beim nächsten Start übernommen, ohne eine laufende Runde zwangsweise neu zu laden.

## 🎮 Spiele

### 🎯 Circa Imposter

Alle Spieler bekommen eine numerische Schätzfrage. Eine Person ist der Imposter und erhält eine andere Frage aus derselben Kategorie. Dadurch können die Antworten plausibel zusammenpassen, obwohl nicht alle dieselbe Frage gesehen haben.

- 3–12 Spieler
- 520 Fragepaare / 1.040 Fragetexte
- 10 Kategorien
- Leicht, Mittel, Schwer und Zufall
- Wiederholungsschutz für bereits gespielte oder sehr ähnliche Fragen
- fairere Imposter-Auswahl bei kleinen Gruppen
- persönliche Statistik und Circa-Rangliste
- lokaler Fragen- und Deck-Fortschritt

### 🎭 Klassisches Imposter

Alle normalen Spieler sehen dasselbe geheime Wort. Der Imposter kennt das Wort nicht und kann optional einen ähnlichen Hinweis erhalten.

- 3–12 Spieler
- 250 eindeutige Wörter
- 25 Wörter pro Kategorie
- optionaler Hinweis für den Imposter
- optionaler Timer von 1:00 bis 5:00 Minuten
- Timer pausierbar
- eigener Wiederholungsschutz
- persönliche Profil- und Sessionstatistik

### ❓ Wer bin ich?

Jeder Spieler erhält einen eigenen geheimen Begriff. Beim Weitergeben des Handys sieht jede Person die Begriffe aller anderen Spieler, während der eigene Begriff als `???` verborgen bleibt. Danach wird außerhalb der App gefragt, geraten und diskutiert; die App dient nur zur fairen Verteilung und späteren Auflösung.

- 2–12 Spieler
- 275 eindeutige Begriffe
- 11 Kategorien, auch kombinierbar
- eigener Wiederholungsschutz
- vorhandene Profile und Avatare werden übernommen
- neutraler Spielbildschirm nach der geheimen Verteilung
- gemeinsame Auflösung aller Begriffe am Ende
- Spieler-, Kategorie- und Deck-Fortschritt wird lokal gespeichert und in Backup V3 mitgesichert

### 🎬 Scharade

Ein Spieler hält das iPhone mit dem Display nach außen an die Stirn. Die Mitspieler sehen den Begriff und erklären ihn. Eine Wippbewegung wertet den Begriff als richtig oder übersprungen; Touch-Tasten bleiben als Fallback verfügbar.

- 2–12 Spieler
- 300 eindeutige Begriffe
- 12 Kategorien, auch kombinierbar
- Rundendauer 30 / 45 / 60 / 90 / 120 Sekunden
- iOS-Bewegungssensor mit getrennten Richtungen für Richtig und Überspringen
- 3-Sekunden-Sperre zwischen zwei Wertungen und Neutralzonen-Schutz
- Touch-Fallback sowie umschaltbare Wipp-Richtung
- Rundenauswertung und Gesamtergebnis
- eigener Wiederholungsschutz
- Spieler-, Kategorie-, Timer-, Richtungs- und Deck-Fortschritt wird lokal gespeichert und in Backup V3 mitgesichert

## 🏠 Launcher und Profile

Der Launcher verbindet alle vier Spiele zu einer gemeinsamen App.

Enthalten sind:

- lokale Spielerprofile mit stabilen IDs
- Auswahl des eigenen Profils
- persönliche und gesamte Statistik
- gemeinsame Sessions über Circa und Classic
- Achievements / persönliche Sammlung
- Schnellstart-Presets
- Sound, Haptik und Animationen
- dezente UI-Sounds im Launcher
- Backup und Wiederherstellung
- Offline- und Update-Status

Eine Session bleibt aktiv, bis sie im Launcher ausdrücklich beendet wird. Erst dann wird sie als abgeschlossene Session gespeichert und für Session-Awards und entsprechende Achievements ausgewertet.

## 📊 Statistik

V73 speichert neue Runden direkt auf den jeweiligen Profil-IDs. Dadurch bleiben Statistiken auch erhalten, wenn ein Profil später umbenannt oder der Avatar geändert wird.

Getrackt werden je nach Spiel unter anderem:

- gespielte Runden
- Circa- und Classic-Runden
- Imposter-Einsätze
- unentdeckte Imposter-Runden
- Closest / Farthest bei Circa
- Punktlandungen
- gespielte Fragen und Wörter
- Kategorien
- Sessions und Awards

Ältere V72-Daten werden soweit eindeutig möglich übernommen. Historische Werte, die V72 nicht separat gespeichert hat, werden nicht erfunden. Deshalb kann beispielsweise bei alten Punktlandungen **„V72: nicht erfasst“** erscheinen.

## 💾 Backup

Unter Einstellungen können die lokalen Daten als JSON-Backup exportiert und später wieder importiert werden.

Das aktuelle Backup enthält unter anderem:

- Profile und Profilstatistik
- Sessions und Awards
- Achievements
- Presets
- Einstellungen
- Circa- und Classic-Spielfortschritt
- Deckstände und spielbezogene Optionen

Neue Backups verwenden Backup V3 und enthalten eine SHA-256-Integritätsprüfung. Wird eine V3-Datei nach dem Export verändert, lehnt die App den Import als verändert oder beschädigt ab. Der Schutz soll einfache Manipulationen erkennen; da kein geheimer Server-Schlüssel verwendet wird, ist er nicht kryptografisch fälschungssicher.

Importiert werden ausschließlich Backup-V3-Dateien mit gültiger SHA-256-Prüfung. Ältere V1-/V2-Backups und ungekennzeichnete Alt-Snapshots werden bewusst abgelehnt, damit die Integritätsprüfung nicht durch ein Herabsetzen der Formatversion umgangen werden kann. V3-Backups bleiben ohne PIN oder Gerätebindung auf andere Geräte übertragbar.

## 📴 Offline und Updates

Nach dem ersten vollständigen Online-Start werden die benötigten App-Dateien lokal zwischengespeichert. Danach können Launcher sowie Circa und Classic auch ohne Internetverbindung geöffnet werden.

Bei einem Update wird die neue Version zunächst vorbereitet. Eine laufende Partie wird dabei nicht unterbrochen. Nach einem späteren Neustart der App wird die neue Version aktiv.

Profile, Statistiken und Spielstände liegen getrennt vom App-Cache und werden durch ein normales Update nicht gelöscht.

## 🔄 Übernahme von V72

Beim ersten V73-Start werden vorhandene V72-Daten soweit möglich übernommen.

Dazu gehören unter anderem:

- Spielernamen und Avatare
- vorhandene Circa-Spielerstatistik
- gespeicherte Circa-/Classic-Spielerlisten
- gespielte Circa-Fragen
- relevante Spieloptionen und Deckstände

Aus den alten Spielern entstehen lokale V73-Profile mit stabilen IDs. Sind mehrere Spieler vorhanden, fragt die App einmalig, welches Profil dem Benutzer des Geräts gehört.

Die alten V72-Daten bleiben dabei unverändert als Rückfallebene auf dem Gerät bestehen.

---

## 🧱 Technischer Aufbau

Imposter Games ist vollständig clientseitig aufgebaut und benötigt kein Backend.

```text
/
├── index.html
├── manifest.webmanifest
├── service-worker.js
├── README.md
├── CHANGELOG.md
│
├── assets/
│   ├── css/
│   │   ├── launcher.css
│   │   └── game.css
│   └── js/
│       ├── app-state.js
│       ├── launcher.js
│       ├── game-engine.js
│       └── pwa.js
│
├── data/
│   ├── games.json
│   ├── circa-questions.json
│   └── classic-words.json
│
└── games/
    ├── circa-imposter/
    │   └── index.html
    └── classic-imposter/
        └── index.html
```

### Lokale Speicherbereiche

Der gemeinsame App-State liegt unter:

```text
imposterGames.appState.v1
```

Spielbezogene V73-Daten liegen unter:

```text
imposterGames.v73.game.*
```

Darin befinden sich unter anderem Spielerlisten, Kategorien, Deck-Fortschritte, Circa-Fragenfortschritt, Schwierigkeit, Classic-Timer und die Circa-Rangliste.

Die alten `circaImpostor.*`- und `classicImpostor.*`-Schlüssel werden bei der Migration nicht überschrieben.

## 🛠 Technik

- HTML5
- CSS3
- Vanilla JavaScript
- JSON
- Web Audio API
- Service Worker / PWA
- `localStorage`
- GitHub Pages
- kein Framework
- kein Build-Schritt
- kein Backend

## 📝 Versionshistorie

Die detaillierte Entwicklung steht in [CHANGELOG.md](CHANGELOG.md).
