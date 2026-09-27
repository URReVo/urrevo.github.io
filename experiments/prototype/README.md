# Imposter Games Prototype

Isolierter Arbeitsstand auf Basis des aktuellen produktiven **V73R14**-Stands.

Basis-Commit vor dieser Änderung: `b4f47f70125da2b85bc7f0fa7d27254ceb9f18ab`

URL: `/experiments/prototype/`

## Aktueller Prototyp

Zusätzlich zu den vier produktiven Modi enthält der Prototyp den neuen Modus **Persönlicher Impostor**:

- 3–12 Spieler
- keine Kategorien
- alle normalen Spieler erhalten dieselbe persönliche Alltagsfrage
- der Impostor erhält eine thematisch deutlich andere Frage mit kompatiblem Antwortformat
- jeder antwortet geheim für sich
- danach werden nur alle Antworten gemeinsam gezeigt
- keine Abstimmung in der App
- Auflösung zeigt Impostor, normale Frage und Impostor-Frage
- 89 kuratierte Fragepaare im ersten Prototyp-Pool

## Isolation

- App-State: `imposterGames.prototype.appState.v1`
- Game-State: `imposterGames.prototype.game.*`
- persönlicher Modus: `imposterGames.prototype.game.personal.*`
- eigener Service-Worker-Scope: `/experiments/prototype/`
- eigener Cache: `imposter-games-prototype-*`
- eigenes Backup-Format: `imposter-games-prototype-backup`
- keine automatische Übernahme von V72- oder Produktionsdaten

Die Produktivseite im Repository-Root bleibt durch diese Änderungen unangetastet.
