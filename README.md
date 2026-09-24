# 🎭 Imposter Games

**Imposter Games** ist eine lokale Partyspiel-App mit vier Spielmodi. Das Projekt besteht aus einer produktiven PWA und einer nativen iOS-App in SwiftUI.

**Version:** V73  
**PWA:** https://urrevo.github.io/

## 🎮 Spiele

- **🎯 Circa Imposter** – Schätzfragen mit unterschiedlicher Frage für den Impostor
- **🎭 Klassisches Imposter** – geheimes Wort, optionaler Hinweis und Diskussions-Timer
- **❓ Wer bin ich?** – jeder Spieler erhält einen eigenen geheimen Begriff
- **🎬 Scharade** – Begriffe erraten per Bewegungssensor oder Touch

Die Produktionsdaten umfassen aktuell:

- 520 Circa-Fragepaare
- 250 Classic-Wörter
- 275 Wer-bin-ich?-Begriffe
- 300 Scharade-Begriffe

## 📱 Plattformen

### PWA

Die Web-Version läuft direkt im Browser und kann auf iPhone und iPad über Safari zum Home-Bildschirm hinzugefügt werden.

- offlinefähig
- lokale Profile, Statistiken und Spielstände
- Backup und Wiederherstellung
- keine Serverabhängigkeit für Spielrunden

### Native iOS-App

Parallel existiert eine eigenständige SwiftUI-Version ohne WebView.

Enthalten sind unter anderem:

- alle vier Spiele nativ
- Profile und Avatare
- Statistiken, Sessions und Achievements
- Schnellstart-Presets
- Sound, Core Haptics und Core Motion
- Backup V3 mit SHA-256-Prüfung
- iPhone-Device-Build für Sideloading

## 🛠 Entwicklung

Die PWA verwendet HTML, CSS, Vanilla JavaScript und JSON.

Die native iOS-App verwendet SwiftUI, Core Motion, Core Haptics und XcodeGen. Die Produktionsdaten werden aus dem gemeinsamen `data/`-Verzeichnis in den iOS-Build übernommen.

GitHub Actions übernimmt:

- Release-Validierung
- PWA-Deployment über GitHub Pages
- nativen iOS-Build
- XCTest
- Simulator-App
- unsignierte Sideload-IPA

Die detaillierte Entwicklung und Versionshistorie steht in [CHANGELOG.md](CHANGELOG.md).

Weitere Informationen zur nativen iOS-Version stehen in [ios/README.md](ios/README.md).
