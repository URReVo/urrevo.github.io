# Imposter Games · Native iOS

Diese Struktur ist die native SwiftUI-Basis der App. Sie ist **kein WebView** und bleibt bewusst parallel zur bestehenden Web/PWA-Version.

## Architektur

- SwiftUI für die Oberfläche
- Core Motion für Scharade
- native iOS-Haptik über UIKit Feedback Generator
- gemeinsame JSON-Inhalte aus dem Root-Verzeichnis `data/`
- XcodeGen erzeugt reproduzierbar das Xcode-Projekt
- GitHub Actions baut auf einem macOS-Runner
- Deployment Target: iOS 17.0, damit die App auch auf älteren iPhones läuft; iOS 27 wird vollständig unterstützt

## Inhalte synchronisieren

Die Web-Daten bleiben die Quelle der Wahrheit:

```bash
./ios/scripts/sync-content.sh
```

Dabei werden Circa, Classic, Wer bin ich? und Scharade nach
`ios/ImposterGames/Resources/Content/` gespiegelt.

## Xcode-Projekt erzeugen

Auf einem Mac:

```bash
brew install xcodegen
./ios/scripts/bootstrap.sh
```

Das erzeugte `ImposterGames.xcodeproj` wird absichtlich nicht committed.

## Windows-Workflow

Für die normale Entwicklung ist lokal kein Mac nötig:

1. Änderungen nach GitHub pushen.
2. GitHub Actions startet einen macOS-Runner.
3. XcodeGen erzeugt das Projekt.
4. Xcode kompiliert die native SwiftUI-App und führt Tests aus.
5. Der Simulator-Build wird als Artifact bereitgestellt.

Sobald Apple-Signing eingerichtet ist, kann derselbe Workflow zusätzlich eine signierte `.ipa` erzeugen.

## Signing-Secrets für die spätere IPA

Im Repository unter **Settings → Secrets and variables → Actions**:

- `IOS_CERTIFICATE_BASE64` – .p12 als Base64
- `IOS_CERTIFICATE_PASSWORD` – Passwort des .p12
- `IOS_PROVISIONING_PROFILE_BASE64` – .mobileprovision als Base64
- `IOS_BUNDLE_ID` – z. B. `de.urrevo.impostergames`

Team-ID, Profilname und Signing-Identity werden im Workflow soweit möglich aus dem Provisioning Profile bzw. Zertifikat ermittelt.

## Aktueller nativer Funktionsstand

Die App besitzt bereits einen nativen Launcher für alle vier Spiele. Scharade ist als erster technischer Native-Proof umgesetzt: Begriffsdaten, Timer, Core-Motion-Wippen, 3-Sekunden-Sperre, Richtungswechsel und echte iPhone-Haptik. Die anderen Spiele sind als native Ziele vorbereitet und werden anschließend schrittweise portiert.
