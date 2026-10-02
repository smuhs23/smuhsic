# Verifikation von 2317

Stand: **2. Oktober 2026**. Lokale Prüfung des vollständigen Studios, kein Nachweis einer öffentlichen Bereitstellung oder eines GitHub-Actions-Laufs.

## Ausgeführte Prüfungen

| Prüfung               | Ergebnis                                                                          |
| --------------------- | --------------------------------------------------------------------------------- |
| `npm ci`              | Erfolgreich, Lockfile reproduzierbar installiert                                  |
| `npm run typecheck`   | Erfolgreich                                                                       |
| `npm test`            | 69 Tests in 9 Dateien bestanden                                                   |
| `npm run build`       | Erfolgreich; Vite meldet einen großen JS-Chunk (ca. 805 kB, ca. 218 kB gzip)      |
| Chromium + WebKit E2E | 51 bestanden, 5 aufgrund fehlender nativer Canvas-Aufnahme in WebKit übersprungen |
| `git diff --check`    | Erfolgreich                                                                       |

Die fünf übersprungenen Fälle betreffen Aufnahmeabbruch bei Grafikverlust, einen injizierten Audio-Startfehler, natürliches Trackende, Abbruch während Audio-Resume und automatischen Abschluss am Zeitlimit. Der WebKit-Fall für die tatsächlich fehlende Aufnahmefähigkeit läuft regulär und prüft den deaktivierten Exportbutton samt Erklärung. Die übrigen Studio-, Medien-, Grafik- und Presetfälle laufen in beiden Browsern.

## Browser und Testumgebung

- Chromium **153.0.8010.0**, Linux, Software-WebGL über ANGLE/SwiftShader. Der offizielle Playwright-Chromium-ZIP-Download lieferte in dieser Umgebung eine leere Datei. Für die lokale Prüfung wurde ein Chromium-153-Binary aus dem registrierten Paket `@sparticuz/chromium` verwendet, außerhalb der Produktabhängigkeiten. `E2E_CHROMIUM_PATH` ist der optionale Testpfad dafür.
- Offizielles Playwright **WebKit Build 2359** für Ubuntu 24.04. Benötigte Ubuntu-Bibliotheken wurden für den Test separat entpackt. Die generische Host-Bibliotheksprüfung wurde für diese lokale Umgebung übersprungen; die Browserfälle wurden tatsächlich ausgeführt. Die Canvas-API `captureStream` fehlt hier.
- Playwright 1.63.0; Node 24.19.0; npm 11.9.0.
- CI installiert die offiziellen Playwright-Browser und ihre Systemabhängigkeiten. Der CI-Workflow liegt bei; ein erfolgreicher Remote-Lauf wurde noch nicht geprüft.

**Eine Prüfung auf einem echten iPhone mit Safari steht aus.** WebKit auf Linux und eine 390-Pixel-Viewportprüfung sind kein Ersatz für iPhone-Audiounterbrechungen, Speichergrenzen oder die dortige native Aufnahmefähigkeit.

## Geprüftes Verhalten

WAV, MP3, M4A und H.264/AAC-MP4 erzeugen in beiden Testbrowsern ein messbares Signal. Beschädigte Medien erhalten einen Fehler, danach lässt sich eine gültige Quelle laden. Loop, Seek, Quellenwechsel, Lautstärke null bei weiterlaufender Analyse und Ressourcenfreigabe werden geprüft.

Die fünf Looks animieren mit der Demo; alle 25 Kombinationen aus Look und Stimmung bleiben auswählbar. Mood-Wechsel erhält den Track; Farben, Dichte, Geschwindigkeit und Beat-Stärke bleiben danach editierbar. Zehn Look-Wechsel erhalten genau eine Grafikfläche und ein Medienelement.

Pause hält die Vorschau. Grafikverlust pausiert den Player und eine Wiederherstellung setzt die Grafik wieder in Gang. Fehlendes WebGL 2 wird sichtbar erklärt. Die Abnahme prüft unhandled JavaScript-Fehler und Shaderfehler beim Wiederherstellen.

Presets überleben Reload; Seed und Ausgabeformat bleiben erhalten. Fehlerhafte Importe, beschädigter Speicher und Speicherverweigerung sind abgedeckt. Der aktive Look und die Wiedergabe bleiben bei Speicherfehlern nutzbar.

Bei 390 × 844 Pixeln sind alle Reglergruppen vorhanden, manuelle BPM editierbar und kein horizontaler Überlauf vorhanden. Ausgabemaße und sichtbare Proportionen sind für alle vier Seitenverhältnisse bei 390 × 844, 800 × 900 und 1280 × 720 Pixeln geprüft. Vollbild wird bei 390 und 1280 Pixeln mit allen vier Formaten geprüft; bei fehlender Fähigkeit muss die Erklärung erscheinen. Bei 1280 × 720 Pixeln bleibt die Transportsteuerung beim Bearbeiten erreichbar. Zehn Ink-Flow-Variationen erzeugen keine zusätzlichen WebGL-Puffer; Speicherverbrauch im Grafiktreiber wird damit nicht behauptet.

## Audio- und Exportmessungen

Die Impulserkennung besteht eine synthetische 120-BPM-Kickfolge über zehn Sekunden mit mindestens 90 % der bekannten Impulse, maximal einem zusätzlichen Impuls und höchstens 100 ms Toleranz. Stille erzeugt keine Beats. Bass-, Mitten- und Höhenzuordnung wird mit bekannten Tönen bei 32, 44,1 und 48 kHz geprüft. Das sind deterministische Testsignale, kein Genauigkeitsversprechen für beliebige Musik.

Ein tatsächlich heruntergeladener Chromium-Export wurde mit ffprobe und ffmpeg untersucht:

- VP9-Video und Opus-Audio in WebM; 720 × 1280 Pixel.
- Im repräsentativen kurzen Clip: 2,70 Sekunden dekodiertes Audio, RMS 0,1001.
- Pulspositionen bei 0,02 / 0,52 / 1,02 / 1,52 / 2,02 / 2,53 Sekunden, entsprechend der eigenen 120-BPM-Pulsquelle.
- Die Bildfolge enthält sichtbar unterschiedliche Fadenkompositionen. Unter der Software-Grafik wurden 30 Videoframes bis PTS 2,413 Sekunden erzeugt. Die 30-FPS-Capture-Einstellung garantiert keine konstante erreichte Bildrate.
- Native WebM-Dateien dieser Umgebung enthalten keine finale Container-Dauer; sie werden ohne zusätzliche Remux-Stufe ausgegeben.

Die Browsertests prüfen Audio-/Videotracks, die Ausgabemaße und tatsächlich dekodierte Audioenergie. Natürliches Trackende liefert genau einen Download. Der automatische Fünf-Minuten-Abschluss wird mit einem gezielt verkürzten Timer und echtem MediaRecorder geprüft; der Unit-Test prüft die tatsächlichen 300.000 ms. Ein abgebrochener Start bleibt auch nach verspätetem Audio-Resume stumm. Recorder-Unit-Tests decken Playback-Rejection, Abort, Recorderfehler, Tab-hidden, Kontextverlust, Trackende, fünf Minuten und einen ausbleibenden Stop ab. Der Original-Audiotrack wird erhalten; nur Aufnahmeklone und Canvas-Tracks werden gestoppt.

## Private Referenz

Das vom Nutzer gelieferte 33,23-Sekunden-MP4 wurde separat lokal geladen und abgespielt, in Chromium und WebKit ohne unhandled Fehler. Über acht Sekunden Vorschau lagen die gemessenen RMS-Spitzen bei 0,2993 bzw. 0,2778. Die originalen Bild-/Tondateien sind nicht Bestandteil des Repositorys. Ink Flow wurde visuell gegen lokale Referenzframes geprüft; es ist eine eigene Umsetzung der organischen Fadenästhetik.

## Eigenständige Datei

Die separat übergebene `2317.html` enthält den vollständigen Produktionsbuild als eine Datei. Sie wurde direkt über `file://` in Chromium und WebKit geöffnet: Demo-Wiedergabe und Preset-Speicherung mit Wiederherstellung nach Reload funktionieren, keine JavaScript-Fehler und keine externen HTTP-Anfragen. Chromium erzeugt auch aus dieser Datei beim natürlichen Trackende einen echten Video-/Audio-Download mit 720 × 1280 Pixeln. WebKit erklärt seine tatsächlich fehlende Canvas-Aufnahme.

## Abschlussreview

Die wichtigen Befunde der unabhängigen Gesamtprüfung wurden mit zuvor fehlgeschlagenen Regressionstests korrigiert. Entscheidungen und Grenzen sind in [review-outcome.md](review-outcome.md) dokumentiert.

## Übergabestatus

Der Nutzer hat `smuhs23/smuhsic` am 2. Oktober 2026 angelegt und den Upload in das öffentliche Repository ausdrücklich freigegeben. Der Connector bestätigt Owner, öffentliche Sichtbarkeit und Schreibrechte. Die automatisch angelegte README wird durch die vollständige Projektdokumentation ersetzt; der ursprüngliche Initialcommit bleibt als Parent erhalten. Der Quellstand wird über Git-Daten-API bereitgestellt und anhand der Remote-Dateihashes geprüft. Ein erfolgreicher GitHub-Actions-Lauf ist erst nach tatsächlicher Prüfung bestätigt; lokale Testergebnisse sind kein Nachweis für Remote-CI.
