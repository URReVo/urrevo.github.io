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
- 100 kuratierte Fragepaare im Prototyp-Pool, davon 11 echte Freitext-Paare

## Isolation

- App-State: `imposterGames.prototype.appState.v1`
- Game-State: `imposterGames.prototype.game.*`
- persönlicher Modus: `imposterGames.prototype.game.personal.*`
- eigener Service-Worker-Scope: `/experiments/prototype/`
- eigener Cache: `imposter-games-prototype-*`
- eigenes Backup-Format: `imposter-games-prototype-backup`
- keine automatische Übernahme von V72- oder Produktionsdaten

Die Produktivseite im Repository-Root bleibt durch diese Änderungen unangetastet.

## Gemeinsame Sessions und Statistik

Im Prototyp werden jetzt alle fünf Spiele in derselben Session-Historie erfasst.

- aktive Session zeigt aktuellen Spielmodus, Laufzeit und aktuellen Spielstatus
- Wer bin ich?: Runden und verteilte Begriffe
- Scharade: richtige / übersprungene Begriffe, Durchschnitt und persönlicher Bestwert
- Persönlicher Impostor: gespielte Fragepaare und Impostor-Einsätze
- Achievements u. a. für alle fünf Modi, Scharade-Leistungen, Impostor-Häufigkeit und lange Sessions
- Session-Awards berücksichtigen zusätzlich Scharade-Leistungen

## Presets V2

Eigene Presets speichern im Prototyp jetzt eine vollständige Spielkonfiguration:

- alle fünf Spielmodi auswählbar
- konkrete lokale Spielerprofile statt nur einer Spielerzahl
- beliebige Mehrfachauswahl von Kategorien; `Alle` bleibt exklusiv
- Circa: Schwierigkeit
- Classic: Hinweis + Diskussionstimer
- Scharade: Kategorien + Zeit pro Spieler
- Wer bin ich?: Kategorien
- Persönlicher Impostor: Spieler ohne künstliche Kategorien

Die Statistik-Karten haben zusätzlich feste Bezeichnungen oberhalb jeder Kennzahl, damit der Wert ohne Kontextwechsel verständlich bleibt.

## Audit 2026-09-27

- Presets ohne feste Profile überschreiben jetzt auch bei bereits gespeicherten Spielern zuverlässig die Spielerzahl.
- Scharade fragt vor dem Stoppen von Timer/Sensor nach, ob die Partie wirklich verlassen werden soll.
- Wer bin ich? und Persönlicher Impostor warnen vor dem Verlassen einer laufenden Runde.
- Web Audio der drei neuen Modi wird nach echtem Touch sowie nach App-/Tab-Rückkehr wieder aufgenommen, analog zu Circa/Classic.
- Scharade synchronisiert zusätzlich den zugänglichen Sound-Button-Text.
