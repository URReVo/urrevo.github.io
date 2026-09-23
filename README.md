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
│
├── assets/
│   ├── css/
│   │   ├── launcher.css               # Startbildschirm
│   │   └── game.css                   # gemeinsames Game-Design
│   └── js/
│       ├── launcher.js                # rendert den Spielekatalog
│       └── game-engine.js             # gemeinsame bestehende Spiel-Engine
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

Der Launcher wird aus `data/games.json` aufgebaut. Für ein weiteres Spiel kann später ein neuer Ordner unter `games/` angelegt und ein neuer Eintrag im Spielekatalog ergänzt werden.

Ein neues Spiel muss dadurch nicht mehr in die Root-`index.html` eingebaut werden.

## 💾 Lokale Daten

Die aktuellen Spiele bleiben clientseitig. Spieler, Einstellungen, Fortschritte und Statistiken werden – soweit der jeweilige Modus sie nutzt – per `localStorage` auf dem Gerät gespeichert.

Ab V63 besitzen **Circa Imposter** und **Klassisches Imposter** getrennte lokale Speicherbereiche. Spieler, Kategorien und spielbezogene Einstellungen werden dadurch nicht mehr zwischen den Spielen geteilt.

Die bisherigen Circa-Schlüssel bleiben erhalten, damit vorhandene Circa-Statistiken und Fortschritte weiterverwendet werden. Classic-spezifische Altwerte für Wortdeck, Hinweis und Timer werden einmalig in den neuen Classic-Namespace übernommen; gemeinsam gespeicherte Spieler/Kategorien werden bewusst nicht migriert.

## 🌐 Multiplayer-Perspektive

Aktuell gibt es noch **keinen Online-Multiplayer**. Die neue Trennung schafft aber eine bessere Basis dafür:

- Launcher und Spiele sind getrennt.
- Spieldaten liegen unabhängig vom UI vor.
- Ein künftiges Lobby-/Room-System kann als zusätzlicher Service ergänzt werden.
- Die statischen Datenbanken können später durch API-Daten ersetzt oder ergänzt werden.
- Multiplayer-spezifischer Zustand muss nicht in den Launcher eingebaut werden.

Für echten Multiplayer werden später weiterhin ein gemeinsamer Serverzustand bzw. ein Realtime-Dienst benötigt.

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

