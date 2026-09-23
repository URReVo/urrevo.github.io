# 🎭 Imposter Games

**Imposter Games** ist eine statische, für iPhone und iPad optimierte Partyspiel-Plattform mit zwei lokalen Imposter-Spielen.

**Aktuelle Plattformversion:** V73  
**Live:** https://urrevo.github.io/

Die App läuft vollständig im Browser bzw. als installierbare Home-Screen-Web-App. Es gibt aktuell kein Backend und keinen Online-Multiplayer.

## 🎮 Spiele

### 🎯 Circa Imposter

Alle Spieler bekommen eine numerische Schätzfrage. Eine Person ist der Imposter und erhält eine andere Frage aus derselben Kategorie. Die Antworten können dadurch plausibel zusammenpassen, obwohl nicht alle dieselbe Frage gesehen haben.

- 3–12 Spieler
- 520 Fragepaare / 1.040 Fragetexte
- 10 Kategorien
- Leicht, Mittel, Schwer und Zufall
- lokaler Deck- und Fragenfortschritt
- Wiederholungsschutz für bereits gespielte bzw. sehr ähnliche Fragen
- faire Imposter-Auswahl bei kleinen Gruppen
- Circa-interne Rangliste sowie gemeinsame V73-Profilstatistik

### 🎭 Klassisches Imposter

Alle normalen Spieler sehen dasselbe geheime Wort. Der Imposter kennt das Wort nicht und kann optional einen ähnlichen Hinweis erhalten.

- 3–12 Spieler
- 250 eindeutige Wörter
- 25 Wörter pro Kategorie
- Hinweis für den Imposter: an / aus
- optionaler Timer von 1:00 bis 5:00 Minuten
- Timer pausierbar
- eigener Wort-Deck-Fortschritt
- gemeinsame V73-Profil- und Sessionstatistik

## 🏠 V73 App-Shell

Der Launcher ist mehr als eine Spieleauswahl. Er verwaltet die gemeinsame lokale Plattformlogik:

- lokale Spielerprofile mit stabilen IDs
- auswählbares eigenes Profil
- persönliche und globale Statistik
- Sessions über Circa und Classic hinweg
- Achievements / persönliche Sammlung
- Schnellstart-Presets
- Sound, Haptik und Animationen als gemeinsame Einstellungen
- dezente Web-Audio-UI-Töne im Launcher
- JSON-Backup und Wiederherstellung
- Offline- und Update-Status

Eine Session bleibt aktiv, bis sie im Launcher ausdrücklich beendet wird. Erst dann wird sie als abgeschlossene Session in der Historie geführt und für Session-Awards bzw. entsprechende Achievements ausgewertet.

## 💾 Lokale Daten und Profile

Alle persönlichen Daten liegen lokal im Browser über `localStorage`.

Der gemeinsame V73-App-State verwendet:

```text
imposterGames.appState.v1
```

Spielbezogene V73-Daten liegen unter:

```text
imposterGames.v73.game.*
```

Dazu gehören unter anderem Spielerlisten, Kategorien, Deck-Fortschritt, Circa-Fragenfortschritt, Schwierigkeit, Classic-Timer und die Circa-interne Rangliste.

### Migration von V72

Beim ersten V73-Start werden vorhandene V72-Daten soweit eindeutig möglich übernommen:

- Spielername und Avatar
- vorhandene Circa-Spielerstatistik
- gespeicherte Circa-/Classic-Spielerlisten
- globale Circa-Fragenfortschritte
- relevante Spieloptionen und Deckstände

Aus den alten Spielern entstehen V73-Profile mit stabilen IDs. Sind mehrere Spieler vorhanden, wird einmalig gefragt, welches Profil dem Benutzer des Geräts gehört.

Die alten `circaImpostor.*`- und `classicImpostor.*`-Schlüssel werden dabei nicht verändert und bleiben als Rückfallebene bestehen.

Nicht eindeutig rekonstruierbare historische Daten werden nicht erfunden. Beispielsweise wurde die Anzahl persönlicher „Punktlandungen“ unter V72 nicht separat gespeichert; solche Altwerte werden entsprechend als unbekannt gekennzeichnet.

## 📦 Backup

V73 verwendet das Backup-Format `imposter-games-backup`, aktuell in **Formatversion 2**.

Ein Export enthält:

- Profile und Profilstatistik
- Sessions und Awards
- Achievements
- Presets
- Einstellungen
- Circa- und Classic-Spielfortschritt
- Deckstände und spielbezogene Optionen

Ältere V1-Backups bleiben importierbar.

## 📴 Offline / PWA

Imposter Games kann nach einem erfolgreichen Online-Start auch offline verwendet werden.

Der Service Worker cached nur die definierten App-Ressourcen:

- Launcher
- beide Spielseiten
- CSS und JavaScript
- Manifest und Icons
- Circa- und Classic-Datenbanken

Updates werden bei einem späteren Online-Start vorbereitet, ohne eine laufende Runde zwangsweise neu zu laden. Die neue Version wird beim folgenden App-Start aktiv. Alte App-Caches werden anschließend automatisch entfernt.

`localStorage`-Daten sind vom Cache getrennt und werden durch ein App-Update nicht gelöscht.

Für die app-ähnlichste Nutzung auf iPhone oder iPad:

1. https://urrevo.github.io/ in Safari öffnen.
2. **Teilen** wählen.
3. **Zum Home-Bildschirm** auswählen.
4. Imposter Games über das neue App-Symbol starten.

Die Oberfläche ist für Hochformat optimiert.

## 🧱 Projektstruktur

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
├── games/
│   ├── circa-imposter/
│   │   └── index.html
│   └── classic-imposter/
│       └── index.html
│
├── scripts/
│   └── validate-release.mjs
│
└── .github/workflows/
    └── validate.yml
```

### Zentrale Dateien

- `assets/js/app-state.js` – Profile, Sessions, Statistik, Migration, Backup und gemeinsame Einstellungen
- `assets/js/game-engine.js` – gemeinsame Runtime für Circa und Classic
- `assets/js/launcher.js` – App-Shell und Launcher-Interaktionen
- `data/circa-questions.json` – Circa-Fragenbank
- `data/classic-words.json` – Classic-Wortbank
- `service-worker.js` – Offline-Cache und atomare Updates
- `scripts/validate-release.mjs` – Release- und Regressionstests

Die beiden Spielseiten besitzen getrennte DOMs und laden nur die Ansichten, die der jeweilige Modus benötigt. Gemeinsame Logik bleibt in der zentralen Game-Engine.

## ✅ Validierung

Bei Pushes auf `main` und bei Pull Requests führt GitHub Actions den Release-Validator aus:

```bash
node scripts/validate-release.mjs
```

Der Validator prüft unter anderem:

- konsistente Release-Versionen und Service-Worker-Cache
- JavaScript-Syntax
- doppelte HTML-IDs
- Circa-Fragenbank und Slider-Grenzen
- Classic-Wörter und Duplikate
- getrennte Spiel-DOMs
- V72→V73-Migration
- Profil- und Sessionzuordnung
- Rundenzähler und Outcome-Korrekturen
- Reset und Backup-Wiederherstellung
- zentrale Sound-/Animationslogik

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
