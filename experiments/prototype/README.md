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

- Numerische Antworten respektieren jetzt auch den definierten Schritt: Ganzzahlen bleiben ganzzahlig, 1–10 und Prozent akzeptieren keine Zwischenwerte, Stunden können z. B. 0,5-Schritte nutzen.

## Multi-Game-Presets und Spielzeit

- Eigene Presets können jetzt mehrere Spielmodi gleichzeitig enthalten.
- Jedes ausgewählte Spiel besitzt innerhalb des Presets seine eigene Kategorie-/Timer-/Schwierigkeitskonfiguration.
- Beim Öffnen eines Multi-Game-Presets wird der gewünschte Modus direkt aus dem Preset gewählt.
- Die PWA erfasst sichtbare Vordergrundzeit geräteweit: App insgesamt sowie getrennt für alle fünf Spielmodi.
- Hintergrundzeit, Lockscreen und lange inaktive Browser-Gaps werden nicht als Spielzeit gewertet.
- Spielzeit wird im Statistikbereich in Minuten bzw. Stunden angezeigt und ist Bestandteil des V3-Backups.

- Spielzeit-Herzschlag korrigiert: Der aktive Zeitstempel bleibt während einer sichtbaren Seite erhalten; gespeicherte oder importierte Laufzeitstempel werden beim Neustart weiterhin verworfen.

## Preset-Spieler direkt anlegen

Korrektur der Preset-Idee:

- Ein Preset enthält wieder genau einen Spielmodus.
- Im Preset-Menü „Wer spielt mit?“ kann über „Neuen Spieler anlegen“ direkt ein lokales Profil erstellt werden.
- Der neue Spieler wird automatisch für das aktuelle Preset ausgewählt.
- Das neu angelegte Preset-Profil ersetzt nicht ungefragt das aktuell ausgewählte Hauptprofil im Launcher.
- Nach Speichern oder Abbrechen geht es direkt zurück zur Preset-Spielerauswahl.
- Die geräteweite Spielzeitstatistik aus r26 bleibt erhalten.
