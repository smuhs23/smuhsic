# 2317

**by smuhsic — See what you hear.**

Ein individuell anpassbares Studio für audioreaktive Kunst. Lade Musik oder ein Screenrecording, wähle deinen Look und forme Farben, Bewegung und Beat-Reaktion. Die Medienverarbeitung läuft im Browser auf deinem Gerät.

## Starten

Node.js **22.12 oder neuer** (geprüft mit Node 24) und npm installieren, dann im Projektordner:

```sh
npm ci
npm run dev
```

Die von Vite angezeigte lokale Adresse öffnen. Mit **Demo ausprobieren** kannst du ohne eigene Datei starten. Die selbst erzeugte Demo hat 120 BPM. Wiedergabe beginnt per Play-Taste oder Leertaste außerhalb von Eingabefeldern.

```sh
npm run build     # prüft TypeScript und erzeugt dist/
npm run preview   # Vorschau des Produktionsbuilds
```

`dist/` lässt sich auf einem statischen Webserver bereitstellen. Es wird kein Server für die Audioverarbeitung benötigt. Die App wird nicht automatisch veröffentlicht.

Die separat bereitgestellte **2317.html** lässt sich auch direkt im Browser öffnen; sie enthält den gesamten Build in einer Datei. Medien und Presets bleiben auf deinem Gerät.

## Dein Sound, dein Look

| Look             | Bildsprache                                                    |
| ---------------- | -------------------------------------------------------------- |
| Ink Flow         | Dunkle, feine Fäden und organische Strömungen auf hellem Grund |
| Liquid Bloom     | Weiche, geschichtete und bewegte Konturen                      |
| Mandala          | Radiale Muster, Symmetrie und pulsierende Blüten               |
| Tunnel           | Perspektivische Ringe und bewegte Tiefe                        |
| Spectral Ribbons | Mehrere Wellenbänder, die auf Frequenzbereiche reagieren       |

Die Stimmungen **Ruhig, Euphorisch, Düster, Verträumt und Intensiv** lassen sich mit jedem Look kombinieren. Sie setzen ein editierbares Parameterbündel. Sobald du einen Regler veränderst, bleibt das Bündel erhalten und die Stimmungsauswahl wird gelöst.

- Hintergrund und drei Akzentfarben; Monochrom oder Farbmischung.
- Größe, Dichte, Symmetrie, Komplexität und Rotation.
- Geschwindigkeit, Turbulenz, Nachbilder und Weichheit.
- Empfindlichkeit, Beat-Stärke, Glättung und Gewichte für Bass, Mitten und Höhen.
- Automatische Impulserkennung oder manueller Takt von 40 bis 240 BPM.
- **Neue Variation** ändert nur den Seed; **Look zurücksetzen** lädt die Werte des aktuellen Modus und erhält das Ausgabeformat.

Die automatische Erkennung reagiert auf spektrale Impulse. Sie ist kein garantierter BPM-Schätzer und kann bei komplexer oder sehr leiser Musik vom wahrgenommenen Takt abweichen. Der manuelle Takt bietet eine feste Alternative. Stimmungen werden von dir gewählt.

Pause hält das Bild an. Ein Sprung im Track oder ein Quellenwechsel leert Bewegungsspuren und die bisherige Beat-Historie. Die Lautstärke regelt das Abhören und den Export; die Analyse bleibt auch bei Lautstärke null aktiv.

## Dateien und Browser

MP3, WAV, M4A und MP4-Screenrecordings werden über den nativen Medienplayer geladen. Bei Screenrecordings reagiert die Kunst auf den Ton; das ursprüngliche Videobild wird nicht in die Komposition übernommen. Die tatsächliche Abspielbarkeit hängt vom Container, Codec und Browser ab. Nicht abspielbare oder beschädigte Dateien erhalten eine Fehlermeldung.

Die App benötigt Web Audio und WebGL 2. Bei Grafikverlust wird pausiert und eine Wiederherstellung angeboten. Mobil ist die Oberfläche für 390 Pixel und aufklappbare Reglergruppen ausgelegt. Bewegungen starten erst durch eine Wiedergabeaktion; dekorative Animationen respektieren Reduced Motion.

Für Dateien bis 32 MiB versucht die App zusätzlich eine Übersichtswellenform zu dekodieren. Schlägt das fehl oder ist die Datei größer, stehen Zeitleiste und Live-Signal weiterhin zur Verfügung. Die eigentliche Wiedergabe hängt nicht von diesem Zusatz ab. „Kein Audiosignal erkannt“ erscheint erst nach mindestens zwei Sekunden laufender Stille.

## Presets

**Preset speichern** sichert alle Look-Einstellungen im lokalen Browser-Speicher (`2317.presets.v1`). **JSON sichern / JSON laden** überträgt Presets zwischen Geräten. Ein Preset enthält Farben, Parameter, Seed und Ausgabeformat, keine Audiodatei oder Objekt-URL.

Importe werden auf Schema und Wertebereiche geprüft. Wenn der Browser-Speicher gesperrt oder voll ist, bleiben der aktive Look und die Wiedergabe nutzbar; JSON-Export funktioniert weiterhin. Gespeicherte Presets können einzeln gelöscht werden.

## Video mit Ton

**Video aufnehmen** zeichnet die Kunst und den Ton ab der aktuellen Trackposition in Echtzeit auf. **Stop** schließt die Datei ab und startet den Download `2317-<Zeitstempel>.webm` oder `.mp4`. **Abbrechen** verwirft sie. Ohne Wiederholung wird beim Trackende automatisch abgeschlossen.

- Standard/Auto: kurze Kante 720 Pixel; Hoch: 1080 Pixel.
- Formate: 9:16, 16:9, 1:1 und 4:5.
- Canvas-Aufnahme mit Zielwert 30 FPS. Die tatsächlich erreichte Bildrate hängt vom Gerät ab. Auto reduziert interne Auflösung und Fadendetails bei anhaltend langsamer Grafik; die Ausgabemaße bleiben gleich.
- WebM VP9/Opus, WebM VP8/Opus und MP4 H.264/AAC werden in dieser Reihenfolge geprüft, danach generische WebM/MP4-Unterstützung. Nur nativ unterstützte Fähigkeiten werden angeboten; eine MP4-Ausgabe ist nicht in jedem Browser verfügbar.
- Audioquelle, Pause, Seek und Ausgabeformat sind während der Aufnahme gesperrt. Visuelle Regler und Lautstärke bleiben nutzbar.
- Nach fünf Minuten wird die Aufnahme automatisch abgeschlossen und heruntergeladen. Der Tab muss sichtbar bleiben; Grafik-/Audio-Unterbrechungen und Recorderfehler verwerfen die unterbrochene Aufnahme mit einer Meldung.

Aufnahme fehlt in manchen Browserumgebungen trotz funktionierender Vorschau. Der Exportbutton erklärt die fehlende Fähigkeit. Den tatsächlich geprüften Stand findest du in [docs/verification.md](docs/verification.md).

## Entwicklung und Tests

React, TypeScript, Vite, Three.js, Web Audio und MediaRecorder. Die Medien bleiben lokal; es gibt keine Konten, Upload-API, Telemetrie oder kostenpflichtigen Dienst. Laufende Audio-/Videodaten werden nur für Wiedergabe, Visualisierung und Aufnahme verwendet.

```sh
npm run typecheck
npm test
npm run build
npx playwright install --with-deps chromium webkit
npm run test:e2e -- --project=chromium --project=webkit
```

Für die Prüfung tatsächlicher Exporte wird **ffmpeg/ffprobe** benötigt. Die Unit-Tests brauchen keine Browserinstallation. Die Browsertests verwenden eigene, eingecheckte 120-BPM-Pulsdateien und Stille; mit `npm run test:media` lassen sie sich mit ffmpeg neu erzeugen und validieren. Private Referenzmedien werden nicht eingecheckt.

| Bereich                                            | Ort               |
| -------------------------------------------------- | ----------------- |
| Wiedergabe, Bandanalyse, Impulse und Wellenform    | `src/audio/`      |
| Settings, Stimmungspresets, Schema und Speicherung | `src/presets/`    |
| Grafikengine, Strömungen und Modi                  | `src/visuals/`    |
| Native Aufnahme und Download                       | `src/export/`     |
| Studio-Oberfläche                                  | `src/components/` |
| Verhaltenstests und Browserabnahme                 | `tests/`          |

GitHub Actions prüft Installation, Typen, Unit-Tests und Build sowie Chromium/WebKit in separaten Jobs. Es gibt keine Deployment-Automatik. Für das Projekt wurde noch keine Open-Source-Lizenz festgelegt.
