# Imposter Games Prototype

Isolierter Arbeitsstand des produktiven **V73-r5**-Spiels.

Snapshot-Basis: `eec893cad2ab05d23f1abad682760a2cfe16fedf`

URL: `/experiments/prototype/`

## Isolation

- App-State: `imposterGames.prototype.appState.v1`
- Game-State: `imposterGames.prototype.game.*`
- eigener Service-Worker-Scope: `/experiments/prototype/`
- eigener Cache: `imposter-games-prototype-*`
- eigenes Backup-Format: `imposter-games-prototype-backup`
- keine automatische Übernahme von V72- oder Produktionsdaten

Änderungen in diesem Ordner können als Prototyp entwickelt werden, ohne den produktiven Root-Stand zu verändern.
