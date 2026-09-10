# 🎭 Circa Impostor

**Circa Impostor** ist ein lokales Party- und Schätzspiel für 3–12 Spieler auf einem einzigen Smartphone.

Alle Spieler bekommen eine numerische Schätzfrage aus derselben Kategorie – mit einer Ausnahme: **Eine Person ist der Impostor und bekommt eine andere Frage.** Die Impostor-Frage ist inhaltlich deutlich verschieden, liegt aber bewusst in einer ähnlichen Zahlenwelt. Dadurch können sich die Antworten glaubwürdig überschneiden und die Gruppe muss herausfinden, wer eine andere Frage gesehen hat.

👉 **Live spielen:** https://urrevo.github.io/

## 🎮 Spielprinzip

1. Spieler hinzufügen und Kategorien auswählen.
2. Schwierigkeit festlegen: **Leicht, Mittel, Schwer oder Zufällig**.
3. Das Smartphone wird nacheinander weitergegeben.
4. Jeder Spieler sieht seine Frage nur für sich und gibt eine Schätzung über den Slider ab.
5. Anschließend werden alle Schätzungen gemeinsam angezeigt.
6. Die Gruppe diskutiert, wer der Impostor sein könnte.
7. Mit **„Impostor aufdecken“** werden Impostor, beide Fragen und die Referenzwerte enthüllt.

Es gibt bewusst **kein In-App-Voting und kein Punktesystem** – die Diskussion findet direkt in der Gruppe statt.

## 🧠 Fragenbank

Aktuell enthält das Spiel:

- **520 Fragepaare**
- **1.040 unterschiedliche Fragetexte**
- drei feste Schwierigkeitsbereiche plus Zufallsmodus
- bewusst unterschiedlich formulierte Normal- und Impostor-Fragen
- vergleichbare Zahlenbereiche, damit der Impostor nicht sofort auffällt

### Kategorien

- 🌍 Allgemein
- 🗺️ Geografie
- 💻 Technik
- 🌿 Natur
- 🏠 Alltag
- ⚽ Sport
- 🚗 Auto
- 🍕 Essen
- 🎬 Popkultur
- 🌶️ Spicy

## ✨ Features

- 📱 Für Smartphones und besonders für iPhone optimiert
- 👥 3–12 Spieler
- 🎭 Zufällig bestimmter Impostor pro Runde
- 🎚️ Großer, touchfreundlicher Schätz-Slider
- 🔊 Soundeffekte über Web Audio
- 🎬 Animierte Auflösung
- 🏆 Kleine Runden-Auszeichnungen wie „Am nächsten“ und „Wildeste Schätzung“
- 💾 Spieler, Kategorien, Schwierigkeit und Fragenfortschritt werden lokal gespeichert
- 🔒 Keine Accounts, kein Server und keine Registrierung erforderlich
- 📴 Das eigentliche Spiel läuft vollständig clientseitig
- 🏠 Als Web-App über „Zum Home-Bildschirm“ auf iOS nutzbar

## 🔐 Datenschutz

Circa Impostor benötigt keine Benutzerkonten und überträgt keine Spielstände an einen eigenen Server.

Gespeicherte Einstellungen und der Fragenfortschritt werden ausschließlich über den lokalen Browser-Speicher (`localStorage`) des verwendeten Geräts verwaltet.

## 🛠️ Technik

Das Projekt ist bewusst schlank gehalten:

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API
- `localStorage`
- GitHub Pages

Die komplette Anwendung befindet sich in **`index.html`**. Dadurch sind weder Build-System noch Framework oder Backend erforderlich.

## 📂 Repository-Struktur

```text
/
├── index.html
├── apple-touch-icon.png
├── circa_impostor_detective_icon_180.png
├── circa_impostor_detective_icon_512.png
└── README.md
```

## 🚀 Deployment

Die Seite wird direkt über **GitHub Pages** aus dem `main`-Branch veröffentlicht.

Änderungen an `index.html` werden nach dem Push automatisch über die GitHub-Pages-Seite verfügbar.

## 📌 Status

Das Projekt wird aktiv weiterentwickelt. Schwerpunkt sind aktuell die Qualität und Vielfalt der Fragen, eine klare mobile Bedienung und ein möglichst app-ähnliches Spielerlebnis auf einem einzigen Gerät.

---

**Circa Impostor** – Schätzen, diskutieren und herausfinden, wer eine andere Frage bekommen hat. 🎭