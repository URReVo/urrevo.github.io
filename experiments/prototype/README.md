# Imposter Games · Party Makeover Prototype

Isolierter Design- und UX-Prototyp auf Basis des produktiven **V74R22**-Stands.

Aktuelle P3-Basis: `12faf47c1a6447b8d6bf39dc8eb4a0fa608e4fee`

URL: `/experiments/prototype/`

## Stand P3

P3 ersetzt den sichtbaren Launcher strukturell. Die vorhandene Daten- und Spiellogik bleibt erhalten, aber der Home-Screen verwendet nicht mehr den alten Aufbau aus Header + Hero + Kartenraster.

### Neue Launcher-Struktur

- kompakte **Party Command Bar** mit Crew-Profil, App-Sigil und Setup
- freie dynamische Tonight-Fläche statt großer Standard-Hero-Karte
- asymmetrische **Game Arena** als echtes 5-Spiele-Mosaik
- Circa als große Ankerfläche, Classic und Wer bin ich? als kompakte Side-Tiles
- Scharade und Persönlicher Impostor als eigene untere Arena-Flächen
- alle fünf Spiele ohne horizontalen Carousel direkt sichtbar
- Live-/Fortschrittsbereich als kompakter **Live Deck** nach der Spieleauswahl
- neues schwebendes **Party Dock** für Party, Crew, Stats und Setup
- Touch-Ripple, Press-Feedback und optionaler Pointer-Depth-Effekt
- eigene P3-Launcher-CSS/JS-Schicht statt bloßer Farbänderung der alten Komponenten

Die fünf Spiele selbst behalten vorerst die in P2 stabilisierte Spiel-Geometrie. Farben und Atmosphäre bleiben dort modernisiert, ohne Bottom-Actions oder Viewport-Flex erneut zu überschreiben.

## Funktionsumfang

Der Prototyp enthält weiterhin alle fünf Spiele, Profile, Presets, Sessions, Statistiken, Spielzeit, persönliche Level, Crew-Level, Achievements, Kategorie-Freischaltungen, Challenges/Tickets, Feedback/Next Goals, DEV-Tools, Progress Integrity V1 und Strict Backup Import V3.

## Isolation

Der Prototyp darf Produktionsdaten weder lesen noch überschreiben:

- App-State: `imposterGames.prototype.appState.v1`
- DEV-State: `imposterGames.prototype.devState.v1`
- Game-State: `imposterGames.prototype.game.*`
- Integrity IndexedDB: `imposterGames.prototype.progressIntegrity.v1`
- Integrity-Marker: `imposterGames.prototype.progressIntegrity.marker.v1`
- Service-Worker-Scope: `/experiments/prototype/`
- Cache: `imposter-games-prototype-*`
- Backup-Format: `imposter-games-prototype-backup`
- keine automatische Übernahme alter Produktions-/V72-Daten

Das Makeover bleibt im Testbereich, bis es separat für Produktion freigegeben wird.
