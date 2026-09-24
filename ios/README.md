# Imposter Games – native iOS

Die iOS-App ist eine eigenständige SwiftUI-Portierung der produktiven PWA – ohne WebView. Die PWA bleibt parallel bestehen; beide verwenden dieselben Produktionsdaten aus `data/`.

## Funktionsumfang

- nativer SwiftUI-Launcher mit allen vier Spielen
- **Circa Imposter**: 3–12 Spieler, Kategorien, vier Schwierigkeitsmodi, faire Impostor-Verteilung, individuelle Fragen, Schätz-Slider, Reveal, Awards und Impostor-Ausgang
- **Klassisches Imposter**: 3–12 Spieler, Kategorien, optionaler Impostor-Hinweis, Timer von Aus bis 5:00, geheime Rollenübergabe, zufälliger Gesprächsstart und Auflösung
- **Wer bin ich?**: 2–12 Spieler, Kategorien, private Handyübergabe, eigener Begriff als `???`, Spielphase und gemeinsame Auflösung
- **Scharade**: 2–12 Spieler, 300 Begriffe, Kategorien, 30/45/60/90/120 Sekunden, 3-2-1-Countdown, Core Motion, Touch-Fallback, 3-Sekunden-Sperre, Neutralposition, Rundenergebnis und Gesamtrangliste
- lokale Profile mit stabilen IDs, Namen, Avataren und persönlicher Statistik
- gemeinsame Circa-/Classic-Sessions, Verlauf und Session-Awards
- persönliche und globale Achievements/Statistik
- eingebaute und eigene Schnellstart-Presets
- globale Einstellungen für Sound, Haptik und Animationen
- Backup V3 im Format `imposter-games-backup` mit SHA-256-Integritätsprüfung und V73-Game-Storage
- gemeinsame Produktionsdaten, per `ios/scripts/sync-content.sh` synchronisiert
- Core Haptics mit UIKit-Fallback
- XcodeGen erzeugt das Xcode-Projekt reproduzierbar aus `project.yml`

## GitHub Actions

`.github/workflows/ios-build.yml` baut und testet die App auf `macos-26`.

Jeder iOS-CI-Lauf führt echte XCTest-Tests auf einem gebooteten iOS-Simulator aus und erzeugt zusätzlich:

- `ImposterGames-iOS-Simulator` – Simulator-App
- `ImposterGames-iOS-Sideload` – unsignierte iPhone-Device-`.ipa`, die z. B. mit AltStore/AltServer und einem normalen Apple-Account neu signiert und auf einem persönlichen iPhone installiert werden kann

Für diese normalen CI-Builds sind keine Apple-Zertifikate im Repository nötig.

Bei manueller Ausführung kann derselbe Workflow zusätzlich eine bereits von GitHub signierte `.ipa` erzeugen. Dafür werden folgende Secrets benötigt:

- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_BUNDLE_ID`

## Lokal auf einem Mac

```bash
brew install xcodegen
./ios/scripts/sync-content.sh
cd ios
xcodegen generate
open ImposterGames.xcodeproj
```
