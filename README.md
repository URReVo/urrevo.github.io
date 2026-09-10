# 🎭 Circa Impostor

**Circa Impostor** ist ein lokales Party- und Schätzspiel für **3–12 Spieler** auf einem einzigen Smartphone oder Tablet.

Alle Spieler bekommen eine numerische Schätzfrage aus derselben Kategorie – mit einer Ausnahme: **Eine Person ist der Impostor und bekommt eine andere Frage.** Die Impostor-Frage ist inhaltlich deutlich verschieden, liegt aber bewusst in einer ähnlichen Zahlenwelt. Dadurch können sich die Antworten glaubwürdig überschneiden und die Gruppe muss herausfinden, wer eine andere Frage gesehen hat.

👉 **Live spielen:** https://urrevo.github.io/

## 🎮 Spielprinzip

1. Spieler hinzufügen und Kategorien auswählen.
2. Schwierigkeit festlegen: **Leicht, Mittel, Schwer oder Zufällig**.
3. Das Gerät wird nacheinander weitergegeben.
4. Jeder Spieler sieht seine Frage nur für sich und gibt eine Schätzung über den Slider ab.
5. Nachdem alle geschätzt haben, wird zuerst die **gemeinsame richtige Frage** aufgedeckt.
6. Danach werden die richtige Frage und **alle Schätzungen gemeinsam angezeigt**.
7. Die Gruppe diskutiert, wer vermutlich eine andere Frage bekommen hat.
8. Mit **„Impostor aufdecken“** wird der Impostor enthüllt.
9. Anschließend folgt die vollständige Auflösung mit beiden Fragen, Referenzwerten und Rundenergebnissen.
10. Zum Abschluss wird gefragt, ob sich der Impostor erfolgreich verstecken konnte. Diese Antwort fließt in die lokale Statistik ein.

Es gibt bewusst **kein In-App-Voting und kein klassisches Punktesystem** – die Diskussion findet direkt in der Gruppe statt.

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

## 📊 Lokale Statistiken

Über den Bereich **„Statistiken“** auf der Startseite werden die Ergebnisse der gespielten Runden lokal auf dem Gerät ausgewertet.

Die Ranglisten zeigen unter anderem:

- 🎯 **Am meisten nah dran** – wer am häufigsten die kleinste Abweichung hatte
- 😵 **Am meisten am weitesten weg** – wer am häufigsten die größte Abweichung hatte
- 🎭 **Am meisten Impostor** – wer am häufigsten als Impostor ausgewählt wurde
- 🥷 **Meiste Impostor-Siege** – wer sich als Impostor am häufigsten erfolgreich verstecken konnte
- 📐 **Ø Nähe zum richtigen Ergebnis** – durchschnittliche prozentuale Nähe eines Spielers zur jeweils richtigen Antwort
- 📉 **Ø Abweichung** – durchschnittliche prozentuale Abweichung eines Spielers
- 🔢 **Gespielte Runden auf diesem Gerät**

Die Daten werden ausschließlich über den lokalen Browser-Speicher (`localStorage`) gespeichert. Es gibt **keine Online-Rangliste, kein Benutzerkonto und keine Cloud-Synchronisierung**.

## ✨ Features

- 📱 Mobile Oberfläche mit Fokus auf iPhone und iPad
- 👥 3–12 Spieler
- 🎭 Zufällig bestimmter Impostor pro Runde
- 🎚️ Großer, touchfreundlicher Schätz-Slider
- 🔊 Soundeffekte über Web Audio
- 🎬 Animierte Aufdeckung der richtigen Frage, des Impostors und der Ergebnisse
- 🏆 Kleine Runden-Auszeichnungen wie „Am nächsten“ und „Wildeste Schätzung“
- 📊 Lokale Spielerstatistiken und Ranglisten
- 💾 Spieler, Kategorien, Schwierigkeit, Statistiken und Fragenfortschritt werden lokal gespeichert
- 🔒 Keine Accounts, kein eigener Server und keine Registrierung erforderlich
- 📴 Das eigentliche Spiel läuft vollständig clientseitig
- 🏠 Auf iOS als Home-Screen-Web-App nutzbar
- 📱 App-Hintergrund bleibt auch beim Scrollen bzw. Overscroll erhalten

## 📲 Für die beste Spielerfahrung auf iPhone oder iPad

Circa Impostor kann direkt aus Safari zum Home-Bildschirm hinzugefügt werden. Dadurch startet das Spiel deutlich app-ähnlicher und ohne die normale Safari-Navigation.

### Installation unter iOS / iPadOS

1. Die Seite **https://urrevo.github.io/** in **Safari** öffnen.
2. In Safari auf **Teilen** tippen.
3. **„Zum Home-Bildschirm“** auswählen.
4. Den Namen bei Bedarf anpassen und mit **„Hinzufügen“** bestätigen.
5. Circa Impostor anschließend über das neue Symbol auf dem Home-Bildschirm starten.

Für die maximale Spielerfahrung wird empfohlen, das Spiel über diese Home-Bildschirm-Verknüpfung zu starten und das Gerät im Hochformat zu verwenden.

## ✅ Getestete Geräte

Die Oberfläche und der aktuelle Spielablauf wurden bislang hauptsächlich auf folgenden Apple-Geräten getestet:

- **iPhone 17**
- **iPad Air**

Die Anwendung basiert auf normalen Web-Technologien und kann grundsätzlich auch auf anderen Smartphones, Tablets und Browsern funktionieren. Für **Android-Geräte, andere iPhone-/iPad-Modelle oder abweichende Browser** kann derzeit jedoch keine vollständige Darstellung oder identisches Verhalten garantiert werden, da diese Kombinationen bislang nicht systematisch getestet wurden.

## 🔐 Datenschutz

Circa Impostor benötigt keine Benutzerkonten und überträgt keine Spielstände oder Spielerstatistiken an einen eigenen Server.

Gespeicherte Spieler, Kategorien, Schwierigkeit, Fragenfortschritt und Statistiken werden ausschließlich über den lokalen Browser-Speicher (`localStorage`) des verwendeten Geräts verwaltet.

Das bedeutet auch: Werden die Website-Daten des Browsers gelöscht oder wird ein anderer Browser bzw. ein anderes Gerät verwendet, stehen diese lokalen Daten dort nicht automatisch zur Verfügung.

## 🛠️ Technik

Das Projekt ist bewusst schlank gehalten:

- HTML5
- CSS3
- Vanilla JavaScript
- Web Audio API
- `localStorage`
- GitHub Pages

Die Anwendung wird aktuell als statische Web-App über GitHub Pages ausgeliefert. Ein Backend oder eine Datenbank ist für den Spielbetrieb nicht erforderlich.

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

Die spielbare Hauptversion liegt unter **`index.html`**. Änderungen an dieser Datei werden nach dem Push über die GitHub-Pages-Seite veröffentlicht.

## 📌 Status

Das Projekt wird aktiv weiterentwickelt. Der Fokus liegt aktuell auf:

- Qualität und Vielfalt der Fragen
- einem klaren und spannenden Reveal-Ablauf
- lokalen Statistiken und Langzeit-Ranglisten
- einer möglichst natürlichen Bedienung auf iPhone und iPad
- einem möglichst app-ähnlichen Spielerlebnis ohne zusätzliches Backend

---

**Circa Impostor** – Schätzen, diskutieren und herausfinden, wer eine andere Frage bekommen hat. 🎭