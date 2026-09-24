# Imposter Games – native iOS

Die native App liegt getrennt von der produktiven PWA und wird vollständig mit SwiftUI gebaut – ohne WebView.

## Aktueller Stand

- nativer SwiftUI-Launcher für alle vier Spiele
- gemeinsame Produktionsdaten aus `data/`, per `ios/scripts/sync-content.sh` synchronisiert
- Scharade bereits als nativer Technik-/Gameplay-Proof
- Core Motion mit signiertem `gravity.z` für Vorwärts/Rückwärts
- 180-ms-Bestätigung, 3-Sekunden-Sperre und Neutralposition
- Core Haptics für native Spielrückmeldungen, mit UIKit-Feedback als Fallback auf nicht unterstützter Hardware bzw. im Simulator
- Circa, Classic und Wer bin ich? sind als nächste native Portierungsschritte vorbereitet
- XcodeGen erzeugt das Xcode-Projekt reproduzierbar aus `project.yml`

## GitHub Actions

`.github/workflows/ios-build.yml` baut und testet die App auf `macos-26`.

Bei manueller Ausführung kann derselbe Workflow zusätzlich eine signierte `.ipa` erzeugen. Dafür werden folgende Secrets benötigt:

- `IOS_CERTIFICATE_BASE64`
- `IOS_CERTIFICATE_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `IOS_BUNDLE_ID`

Für die normale CI sind keine Apple-Zertifikate nötig.

## Lokal auf einem Mac

```bash
brew install xcodegen
./ios/scripts/sync-content.sh
cd ios
xcodegen generate
open ImposterGames.xcodeproj
```
