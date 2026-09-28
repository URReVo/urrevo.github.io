# Imposter Games · Prototype Baseline

Der Prototyp ist wieder ein **sauberer Spiegel des aktuellen Produktivstands V74R22**.

Basis-main beim Reset: `27d604d692f61b1a855fcc00b90c9753004f0fb3`

URL: `/experiments/prototype/`

## Zweck

Dieser Bereich enthält aktuell **kein alternatives Makeover** und keinen P2-/P3-Launcher mehr. Er dient als neutrale Ausgangsbasis, falls später erneut experimentiert werden soll.

Die sichtbare Oberfläche entspricht Produktion:

- gleicher Launcher
- gleiche fünf Spiele
- gleiche CSS-Dateien
- gleiche Spiel-HTMLs
- gleiche Datenbestände
- gleiche Launcher-Logik
- gleiche DEV-Oberfläche

## Technische Isolation

Damit der Prototype trotz identischer Oberfläche keine Produktionsdaten verändert, bleiben ausschließlich die notwendigen technischen Namespaces getrennt:

- App-State: `imposterGames.prototype.appState.v1`
- DEV-State: `imposterGames.prototype.devState.v1`
- Game-State: `imposterGames.prototype.game.*`
- Integrity IndexedDB: `imposterGames.prototype.progressIntegrity.v1`
- Integrity-Marker: `imposterGames.prototype.progressIntegrity.marker.v1`
- Backup-Format: `imposter-games-prototype-backup`
- Service-Worker-Scope: `/experiments/prototype/`
- Cache: `imposter-games-prototype-*`

Alte Produktions-/V72-Daten werden nicht automatisch in den Prototyp übernommen.

## Regel für spätere Experimente

Vor neuen Prototype-Arbeiten zuerst den aktuellen `main` erneut mit diesem Baseline-Mirror abgleichen. Produktion bleibt die Quelle der Wahrheit.
