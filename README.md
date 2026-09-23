# 🎭 Imposter Games

Dieses Repository ist seit **V62** nicht mehr nur eine einzelne `index.html`, sondern eine kleine, statische **Partyspiel-Plattform**.

👉 **Live:** https://urrevo.github.io/

Der Startbildschirm zeigt die verfügbaren Spiele. Jedes Spiel besitzt anschließend seinen eigenen Bereich und seine eigene URL.

## 🎮 Spiele

### 🎯 Circa Imposter

Das Schätzspiel: Alle Spieler beantworten eine numerische Schätzfrage. Eine Person ist der Imposter und bekommt eine andere Frage aus derselben Kategorie. Die Antworten können dadurch plausibel zusammenpassen, obwohl nicht alle dieselbe Frage gesehen haben.

- 3–12 Spieler
- 520 Fragepaare / 1.040 Fragetexte
- Kategorien und drei Schwierigkeitsbereiche plus Zufall
- lokaler Deck-Fortschritt
- Konzeptbasierter Wiederholungsschutz gegen nahezu identische Fragevarianten
- lokale Spielerstatistiken
- faire Imposter-Auswahl bei kleinen Gruppen
- versteckte DEV-Werkzeuge

### 🎭 Klassisches Imposter

Alle normalen Spieler sehen dasselbe geheime Wort. Der Imposter sieht das Wort nicht.

Optional kann der Imposter ein **ähnliches Hinweiswort** erhalten. Die Kategorie bleibt während einer Runde verborgen.

- 3–12 Spieler
- 250 Wörter, 25 pro Kategorie
- Hinweis für Imposter: Ja / Nein
- Timer: Aus oder 1:00 bis 5:00 Minuten in 30-Sekunden-Schritten
- Timer kann pausiert und fortgesetzt werden
- keine In-App-Abstimmung; gemeinsame Auflösung
- eigener Wiederholungsschutz für Wörter
- eigene Classic-DEV-Werkzeuge für WIDs, Wortauswahl, Screen-Jumps, Fairness und Tests

## 🧱 Architektur ab V62

```text
/
├── index.html                         # Spiele-Launcher
├── README.md
├── CHANGELOG.md
├── manifest.webmanifest                # PWA-Metadaten
├── service-worker.js                  # Offline-Cache & Versionswechsel
├── scripts/
│   └── validate-release.mjs            # automatischer Release-Validator
├── .github/workflows/
│   └── validate.yml                    # führt den Validator bei Push/PR aus
│
├── assets/
│   ├── css/
│   │   ├── launcher.css               # Startbildschirm
│   │   └── game.css                   # gemeinsames Game-Design
│   └── js/
│       ├── app-state.js               # Profile, Sessions, Statistik & Migration
│       ├── launcher.js                # App-Shell / Launcher
│       ├── pwa.js                     # registriert Offline-/Update-Unterstützung
│       └── game-engine.js             # gemeinsame Spiel-Engine
│
├── data/
│   ├── games.json                     # Spielekatalog des Launchers
│   ├── circa-questions.json           # 520 Circa-Fragepaare
│   └── classic-words.json             # 250 Wörter + Hinweise
│
├── games/
│   ├── circa-imposter/
│   │   └── index.html
│   └── classic-imposter/
│       └── index.html
│
└── [Icons]
```

### Warum die Datenbanken getrennt sind

Die Fragen und Wörter liegen jetzt bewusst außerhalb des UI-/Game-Codes als versionierte JSON-Dateien.

- Inhalte können geändert werden, ohne die komplette Spiel-Engine anzufassen.
- Daten lassen sich später leichter serverseitig für Multiplayer laden.
- Eine native iOS-App kann dieselben Datenmodelle übernehmen.
- Datenbanken können separat geprüft, erweitert oder automatisiert generiert werden.
- Neue Spiele können ihre eigenen Datenquellen bekommen.

Beide Dateien besitzen `schemaVersion`, `game`, `count` und `items`.

## 🧩 Spieltrennung ab V66

Ab V66 enthalten die einzelnen Spielseiten nur noch ihren tatsächlich benötigten DOM. **Circa Imposter** lädt keine Classic-Rollen-, Timer- oder Auflösungsansichten mehr; **Klassisches Imposter** lädt keine Circa-Schätz-, Statistik- oder Ergebnisansichten mehr.

Gemeinsame Infrastruktur wie Spieler, Avatare, Fairness, Audio, Storage, Navigation und DEV-Zugang bleibt bewusst zentral in der gemeinsamen Runtime. Gemeinsamer Code wird damit einmal gepflegt statt in mehreren Spielen kopiert.

## ➕ Neues Spiel ergänzen

Der Launcher ist seit V73 eine App-Shell mit Profilen, Sessions, Statistik, Presets und Einstellungen. Für ein weiteres Spiel kann weiterhin ein neuer Ordner unter `games/` angelegt und der Spielekatalog entsprechend erweitert werden.

Ein neues Spiel muss dadurch nicht mehr in die Root-`index.html` eingebaut werden.

## 💾 Lokale Daten

Die aktuellen Spiele bleiben clientseitig. Profile, Einstellungen, Fortschritte, Sessions und Statistiken werden per `localStorage` auf dem Gerät gespeichert.

Ab **V73** besitzt die Plattform einen gemeinsamen App-State mit stabilen Profil-IDs. Beim ersten Start werden vorhandene V72-Spieler aus der Circa-Statistik sowie den zuletzt gespeicherten Circa-/Classic-Spielerlisten automatisch zu lokalen Profilen migriert. Name, Avatar und vorhandene Circa-Statistik werden übernommen; anschließend wählt der Nutzer einmalig sein eigenes Launcher-Profil aus.

Die alten `circaImpostor.*`- und `classicImpostor.*`-V72-Schlüssel werden dabei nicht verändert. Die Spiel-Engine kopiert benötigte V72-Fortschritte und Einstellungen einmalig in einen neuen `imposterGames.v73.game.*`-Namespace und schreibt danach nur noch dort weiter. Dadurch bleibt V72 als Rückfallebene erhalten.

V73 unterstützt außerdem versionierte JSON-Backups für Profile, Sessions, Statistik und Einstellungen.

## 🌐 Multiplayer-Perspektive

Aktuell gibt es noch **keinen Online-Multiplayer**. Die neue Trennung schafft aber eine bessere Basis dafür:

- Launcher und Spiele sind getrennt.
- Spieldaten liegen unabhängig vom UI vor.
- Ein künftiges Lobby-/Room-System kann als zusätzlicher Service ergänzt werden.
- Die statischen Datenbanken können später durch API-Daten ersetzt oder ergänzt werden.
- Multiplayer-spezifischer Zustand muss nicht in den Launcher eingebaut werden.

Für echten Multiplayer werden später weiterhin ein gemeinsamer Serverzustand bzw. ein Realtime-Dienst benötigt.

## 📴 Offline / PWA ab V70

Ab V70 kann **Imposter Games nach einem erfolgreichen Online-Start auch offline verwendet werden**. Ein Service Worker speichert ausschließlich die definierten App-Dateien wie Launcher, Spielseiten, CSS, JavaScript, Icons sowie die Circa- und Classic-Datenbanken.

- Die bestehende Home-Screen-Verknüpfung muss für Updates nicht gelöscht oder neu angelegt werden.
- Neue Versionen werden bei einem späteren Online-Start automatisch geprüft und im Hintergrund vorbereitet.
- Eine laufende Runde wird nicht durch einen erzwungenen Reload unterbrochen.
- Alte App-Caches mit dem Präfix `imposter-games-` werden beim Aktivieren einer neuen Version automatisch gelöscht.
- Spieler, Einstellungen, Statistiken und Fortschritte bleiben davon getrennt in `localStorage` und werden durch den Cache-Cleanup nicht gelöscht.
- Es werden keine beliebigen besuchten URLs dauerhaft gesammelt; der Offline-Cache ist auf die definierten App-Dateien begrenzt.
- Der allererste Start muss online erfolgen, damit die Offline-Dateien installiert werden können.
- Die Release-Version wird im Service Worker zentral über `RELEASE` geführt; ein automatischer Release-Validator prüft bei Pushes und Pull Requests zusätzlich Versionen, Cache-Struktur, HTML, Datenbanken, Sliderwerte und Classic-Duplikate.

## 📲 Beste Spielerfahrung auf iPhone und iPad

Für die app-ähnlichste Nutzung empfiehlt es sich, **Imposter Games über Safari zum Home-Bildschirm hinzuzufügen**. Dadurch lässt sich die Plattform anschließend direkt über ein eigenes Symbol starten und wirkt deutlich näher an einer normalen App als im regulären Safari-Tab.

### Zum Home-Bildschirm hinzufügen

1. **https://urrevo.github.io/** in **Safari** öffnen.
2. In Safari auf **Teilen** tippen.
3. **„Zum Home-Bildschirm“** auswählen.
4. Den Namen bei Bedarf anpassen und mit **„Hinzufügen“** bestätigen.
5. Imposter Games anschließend über das neue Symbol auf dem Home-Bildschirm starten.

Für die beste Darstellung ist die Nutzung auf iPhone oder iPad im **Hochformat** vorgesehen.

## 📱 iOS-Perspektive

Die Web-Oberfläche bleibt Vanilla HTML/CSS/JavaScript und ist weiterhin für iPhone/iPad optimiert.

Die neue Trennung in Daten, Plattform und Spielbereiche erleichtert eine spätere native Umsetzung, weil Wort-/Frage-Daten und Spielkonzepte nicht mehr untrennbar in einer einzigen HTML-Datei stecken.

Eine native iOS-App würde trotzdem eine eigene Swift/SwiftUI-Oberfläche und native Zustandslogik erhalten; Die aktuelle Architektur ist dafür eine bessere Ausgangsbasis, aber kein automatischer Web-zu-Native-Wrapper.

## 🛠 Technik

- HTML5
- CSS3
- Vanilla JavaScript
- JSON
- Web Audio API
- `localStorage`
- GitHub Pages
- kein Build-Schritt
- kein Framework
- aktuell kein Backend

## 📲 GitHub Pages

Die Root-`index.html` ist ab V62 **nur noch der Spiele-Launcher**.

Direkte Spielpfade:

- `/games/circa-imposter/`
- `/games/classic-imposter/`

## 📝 Versionshistorie

Siehe [CHANGELOG.md](CHANGELOG.md).

