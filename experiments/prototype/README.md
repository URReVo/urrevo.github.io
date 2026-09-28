# Imposter Games · Party Makeover Prototype

Isolierter Design- und UX-Prototyp auf Basis des produktiven **V74R22**-Stands.

Basis-main vor dem Makeover: `a3bc63b49ce06afcc3738e3a67e4280f3201e268`

URL: `/experiments/prototype/`

## Stand P2

Der Prototyp ist technisch auf den aktuellen Produktionsumfang gebracht. Enthalten sind alle fünf Spiele, Profile, Presets, Sessions, Statistiken, Spielzeit, persönliche Level, Crew-Level, Achievements, Kategorie-Freischaltungen, Challenges/Tickets, Feedback/Next Goals, DEV-Tools, Progress Integrity V1 und der Strict Backup Import V3 aus V74R22.

## Party Makeover P2

P2 behebt die problematischen Layout-Eingriffe aus P1. In den Spiel-Screens verändert die Makeover-Schicht jetzt primär Farben, Flächen und Akzente; die getestete Produktions-Geometrie für Viewport, Flex-Flächen und Bottom-Actions bleibt maßgeblich.

- alle fünf Spiele wieder **direkt als 2-Spalten-Übersicht sichtbar**; kein horizontaler Spiele-Carousel
- dynamische Farbwelt je Spiel
- größere Typografie und weniger „Standard-Overlay“-Anmutung
- atmosphärische Lichtflächen und subtile Bewegung
- neu inszenierter Launcher-Hero
- Navigation und Bottom Sheets optisch modernisiert, aber wieder auf der bewährten Produktions-Geometrie
- Spiel-Screens visuell akzentuiert, ohne Text-/Kartenfarben oder Action-Positionen pauschal zu überschreiben
- gemeinsame visuelle Sprache über alle fünf Spiele
- Safe-Area-, Touch- und Reduced-Motion-Unterstützung

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

Das Makeover bleibt zunächst im Testbereich. Eine Übernahme nach Produktion erfolgt erst nach separater Freigabe.
