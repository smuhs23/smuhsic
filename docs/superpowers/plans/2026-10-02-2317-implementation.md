# 2317 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eine lokal arbeitende Browser-App namens 2317 implementieren, die Audio und Screenrecordings als anpassbare, beatabhängige Kunst visualisiert und im privaten GitHub-Repository `smuhs23/smuhsic` bereitstellen.

**Architecture:** Der native Medienplayer liefert Audio an einen Web-Audio-Graphen; ein getrennt testbarer FeatureExtractor berechnet Pegel, Frequenzbänder und Beatimpulse. Eine Three.js-Engine rendert fünf visuelle Modi mit einem gemeinsamen Parametervertrag. React bedient diese Instanzen, verwaltet validierte Presets und steuert eine Echtzeitaufnahme von Canvas und Audio.

**Tech Stack:** React, TypeScript, Vite, Three.js/WebGL 2, Web Audio, MediaRecorder; Vitest und Playwright für sinnvolle automatisierte Prüfungen. Aktuelle kompatible stabile Paketversionen bei Umsetzung prüfen und im Lockfile fixieren; keine CDN-Abhängigkeiten zur Laufzeit.

**Spec:** `docs/superpowers/specs/2026-10-02-2317-design.md` — vom Nutzer am 02.10.2026 mit „Ja“ freigegeben. Browserzugriff zur GitHub-Neuanlage ist ebenfalls freigegeben. Dieser Plan ist zur Prüfung vorgelegt; die Umsetzung ist noch nicht gestartet.

## Global Constraints

- Sichtbarer Programmname **2317**; GitHub-Repository `smuhsic` im bestätigten Konto `smuhs23`.
- Deutsche Oberfläche; Browser-App für Desktop und mobile Geräte; Verarbeitung der ausgewählten Datei auf dem Gerät, ohne Medienserver.
- Privates Repository als Ausgangspunkt; keine automatische Veröffentlichung der Website und keine automatisch vergebene Open-Source-Lizenz.
- Modi: Ink Flow, Liquid Bloom, Mandala, Tunnel und Spectral Ribbons.
- Stimmungen: Ruhig, Euphorisch, Düster, Verträumt und Intensiv; manuell wählbar und danach editierbar.
- FFT-Bänder: Bass 20–250 Hz, Mitten 250–4.000 Hz, Höhen 4.000 Hz bis maximal 16.000 Hz oder Nyquist-Grenze.
- Sperrzeit für automatisch erkannte Beatimpulse: 180 ms. Manueller Taktgeber: 40 bis 240 BPM.
- Optionaler vollständiger Decode für die Übersichtswellenform nur bis 32 MiB; Fehler blockieren die native Wiedergabe nicht.
- Preset-JSON verwendet `schemaVersion: 1`; keine Audiodateien oder temporären Medien-URLs in Presets.
- Seitenverhältnisse 9:16, 16:9, 1:1 und 4:5; Standard 720 Pixel kurze Kante, Hoch 1080 Pixel kurze Kante, Aufnahme 30 FPS.
- Aufnahmeabschnitt maximal fünf Minuten. Während Aufnahme: Quelle, Springen, Seitenverhältnis und Exportqualität gesperrt; visuelle Parameter bleiben editierbar.
- Pause hält die Komposition an; Springen und Quellenwechsel leeren Analysehistorie und Nachbilder.
- Renderwerte direkt pro Frame; UI-Anzeigen höchstens zehnmal pro Sekunde.
- Referenzvideo nicht in Git aufnehmen; Tests verwenden selbst erzeugte Medien. Reale iPhone-Prüfung ausdrücklich als durchgeführt oder offen dokumentieren.

## Review Focus

1. Schneller Wechsel A → B während A lädt: Nur B darf Player, Metadaten und Objekt-URL bestimmen; geprüft in Task 3.
2. Dauer 0, NaN oder Infinity: Zeitachse und Aufnahme dürfen keinen unbrauchbaren Bereich oder endlose Aufnahme anbieten; geprüft in Task 3 und 7.
3. Speicherzugriff verweigert oder Kontingent voll: Aktueller Look und Wiedergabe bleiben nutzbar; geprüft in Task 6.
4. Tab im Hintergrund oder Audiokontext unterbrochen während Aufnahme: Aufnahme wird nachvollziehbar beendet/abgebrochen, nicht als regulärer Erfolg gemeldet; geprüft in Task 7.
5. Verlust des WebGL-Kontexts beim Rendern/Export: Aufnahme wird unterbrochen, Wiederherstellung leert alte GPU-Ressourcen und Nachbilder; geprüft in Task 4 und 7.

---

## Dateien und gemeinsame Verträge

| Bereich | Dateien | Verantwortung |
| --- | --- | --- |
| Start und Build | `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`, `vitest.config.ts`, `playwright.config.ts`, `.gitignore`, `src/main.tsx` | Appstart, striktes TypeScript, reproduzierbare Builds und Tests |
| Einstellungen | `src/presets/types.ts`, `src/presets/defaults.ts`, `src/presets/validation.ts`, `src/presets/store.ts` | Parametertypen, Mood-Defaults, Import und Speicherung |
| Audio | `src/audio/types.ts`, `src/audio/FeatureExtractor.ts`, `src/audio/MediaController.ts`, `src/audio/waveform.ts`, `src/audio/demo.ts` | Wiedergabe, Lebenszyklus, Analyse und eigener Demo-Beat |
| Bild | `src/visuals/types.ts`, `src/visuals/VisualEngine.ts`, `src/visuals/quality.ts`, `src/visuals/shaders/noise.ts`, `src/visuals/modes/*.ts` | Renderer, Strömungsfeld, fünf Modi und adaptive Qualität |
| Studio | `src/App.tsx`, `src/components/Studio.tsx`, `Stage.tsx`, `SourcePicker.tsx`, `Transport.tsx`, `LookPicker.tsx`, `ParameterPanel.tsx`, `PresetPanel.tsx`, `ExportPanel.tsx`, `src/styles.css` | Bedienung, Layout, Fehlerdarstellung und Recorder-Integration; Komponentenpfade jeweils unter `src/components/` |
| Export | `src/export/Recorder.ts`, `src/export/formats.ts`, `src/export/download.ts` | Formatfähigkeiten, Aufnahmezustände und Download |
| Prüfungen | `tests/audio/`, `tests/presets/`, `tests/visuals/`, `tests/export/`, `tests/e2e/`, `tests/helpers/`, `scripts/create-test-media.mjs` | Verhalten mit bekannten Signalen, Browserfälle und selbst erzeugte Fixtures |
| Übergabe | `README.md`, `.github/workflows/ci.yml`, `docs/verification.md` | Einrichtung, CI, Belege und verbleibende Plattformgrenzen |

**Gemeinsame Datenformen** — in den jeweils genannten Typdateien definieren; nachfolgende Tasks verwenden diese Namen:

```ts
type VisualMode = 'ink' | 'bloom' | 'mandala' | 'tunnel' | 'ribbons';
type Mood = 'calm' | 'euphoric' | 'dark' | 'dreamy' | 'intense';
type Aspect = '9:16' | '16:9' | '1:1' | '4:5';
type Quality = 'auto' | 'standard' | 'high';
type BeatMode = 'auto' | 'manual';
interface AudioFeatures {
  time: number; rms: number; bass: number; mid: number; treble: number;
  onset: boolean; beat: number; beatMode: BeatMode;
}
interface VisualSettings {
  mode: VisualMode; mood: Mood | null; aspect: Aspect; quality: Quality;
  seed: number; background: string; colors: [string, string, string];
  monochrome: boolean; colorMix: number; scale: number; density: number;
  symmetry: number; complexity: number; rotation: number;
  speed: number; turbulence: number; trails: number; softness: number;
  sensitivity: number; beatStrength: number; smoothing: number;
  bassWeight: number; midWeight: number; trebleWeight: number;
  beatMode: BeatMode; manualBpm: number;
}
interface Preset { schemaVersion: 1; id: string; name: string; settings: VisualSettings; }
```

Wertebereiche: `seed` Integer 0…2³²−1; `colorMix`, `density`, `softness`, `smoothing` 0…1; `scale` 0,25…2,5; `symmetry` Integer 1…16; `complexity` Integer 1…8; `rotation` Grad 0…360; `speed`, `turbulence`, `beatStrength` und Bandgewichte 0…2; `trails` 0…0,96; `sensitivity` 0,25…3; `manualBpm` 40…240. Farben sind vollständige `#RRGGBB`-Hexwerte. Import lehnt ungültige Werte ab; UI-Regler erzeugen nur gültige Werte.

## Task 1: Parametermodell und überprüfbare Projektgrundlage

**Files:** Create: Build-/Startkonfiguration aus der Dateitabelle, `src/presets/types.ts`, `defaults.ts`, `validation.ts`, `src/audio/types.ts`. Test: `tests/presets/settings.test.ts`.

**Interfaces:** Consumes: keine bestehenden Produktmodule. Produces: gemeinsame Typen; `defaultSettings(mode: VisualMode): VisualSettings`, `applyMood(settings: VisualSettings, mood: Mood): VisualSettings`, `parsePreset(text: string): {ok: true; value: Preset} | {ok: false; error: string}`.

- [ ] **Step 1: Build- und Testkonfiguration für diesen Task anlegen.** Vite/React/TypeScript, Vitest, Playwright; Scripts `dev`, `build`, `typecheck`, `test`, `test:e2e`. `build` prüft TypeScript und baut die App. Keine Produktmodule vor dem Verhaltenstest implementieren.
- [ ] **Step 2: Fehlenden Verhaltenstest schreiben.** Tests `rejects_unsafe_or_nonfinite_settings`, `mood_preserves_mode_and_output`, `ink_defaults_are_monochrome_on_white`. Kernaussagen:

```ts
expect(defaultSettings('ink').background).toBe('#ffffff');
expect(defaultSettings('ink').monochrome).toBe(true);
expect(applyMood(defaultSettings('tunnel'), 'calm').mode).toBe('tunnel');
expect(parsePreset(JSON.stringify({...validPreset, schemaVersion: 2})).ok).toBe(false);
expect(parsePreset(JSON.stringify({...validPreset, settings: {...validSettings, symmetry: 1.5}})).ok).toBe(false);
```

Auch falsche Farben, fehlende Felder, ungültige Modi, Seed außerhalb des Bereichs und nicht endliche Zahlen prüfen. Unbekannte Zusatzfelder nicht in das normalisierte Ergebnis übernehmen.
- [ ] **Step 3: Rot nachweisen.** `npm test -- tests/presets/settings.test.ts`; erwartet: fehlende Implementierung/Exports. Setupfehler zuerst beheben, bevor das als Rot gilt.
- [ ] **Step 4: Typen, Defaults, Mood-Bündel und Validator implementieren.** Moody-Presets ändern Palette und Bewegungsparameter, behalten Modus, Seed und Ausgabeformat. UI-Namen der fünf Stimmungen gemäß Spezifikation. Reset benutzt `defaultSettings(currentMode)`.
- [ ] **Step 5: Grün prüfen.** `npm test -- tests/presets/settings.test.ts` und `npm run typecheck`; erwartet: keine Fehler.
- [ ] **Step 6: Geprüften Stand committen.** `git add` nur betroffene Dateien, Commit `feat: define 2317 visual settings and presets`.

## Task 2: Frequenzanalyse und Beatimpulse

**Files:** Create: `src/audio/FeatureExtractor.ts`, `tests/helpers/audioSignals.ts`. Test: `tests/audio/features.test.ts`, `tests/audio/beats.test.ts`.

**Interfaces:** Consumes: `AudioFeatures`, `VisualSettings`. Produces: `class FeatureExtractor { constructor(sampleRate: number, fftSize: number); update(time: number, spectrumDb: Float32Array, waveform: Float32Array, settings: VisualSettings): AudioFeatures; reset(): void; }`. `tests/helpers/audioSignals.ts` erzeugt Spektrum-/Zeitsignalframes mit bekannten Bandenergien und einer 120-BPM-Pulsfolge.

- [ ] **Step 1: Fehlende Tests schreiben.** `silence_has_no_auto_beats`, `low_and_high_tones_drive_their_bands`, `detects_120_bpm_pulses`, `seek_reset_clears_history`, `manual_clock_obeys_bpm`. Für zehn Sekunden Pulse nach der Anlaufphase: mindestens 90 % Treffer, höchstens ein zusätzlicher Onset und höchstens 100 ms Timingabweichung. Bei 120 BPM manuell liegt der Abstand bei 0,5 s; bei 40/240 BPM gelten die passenden Intervalle. Bandgrenzen auch für 32 kHz Sampling prüfen.
- [ ] **Step 2: Rot nachweisen.** `npm test -- tests/audio`; erwartet: FeatureExtractor fehlt, nicht ein defekter Testhelper.
- [ ] **Step 3: FeatureExtractor implementieren.** dB in lineare Energie umrechnen, Bandwerte und RMS auf 0…1 begrenzen. Positive Spektraländerung, adaptive robuste Schwelle und lokales Maximum erkennen Onsets. Sperrzeit 0,18 s, Stille-Gate RMS < 0,001, Beatimpuls exponentiell über etwa 0,18 s abklingen lassen. Attack/Release zeitbezogen aus `smoothing`; Anlaufphase mindestens eine Sekunde. Manueller Modus benutzt die Medienzeit und erzeugt pro überschrittener Taktgrenze einen Impuls, keine automatische Erkennung.
- [ ] **Step 4: Grün prüfen.** `npm test -- tests/audio` und `npm run typecheck`; erwartet: alle Signaltests einschließlich Zeitabweichung und Stille grün.
- [ ] **Step 5: Geprüften Stand committen.** Commit `feat: analyse frequency bands and musical onsets`.

## Task 3: Native Medienquellen und eigener Demo-Beat

**Files:** Create: `src/audio/MediaController.ts`, `waveform.ts`, `demo.ts`, `tests/helpers/mediaPlatform.ts`, `scripts/create-test-media.mjs`. Test: `tests/audio/media.test.ts`, `tests/audio/waveform.test.ts`. Selbst erzeugte kleine MP3/MP4/WAV-Fixtures unter `tests/fixtures/`.

**Interfaces:** Consumes: `FeatureExtractor`-Eingabepuffer und Audio-/Settings-Typen. Produces:

```ts
interface MediaState {
  status: 'empty' | 'loading' | 'ready' | 'playing' | 'paused' | 'error';
  name: string; duration: number; currentTime: number;
  volume: number; loop: boolean; error: string | null;
}
interface AnalysisInput { spectrumDb: Float32Array; waveform: Float32Array; sampleRate: number; fftSize: number; }
class MediaController {
  load(file: File): Promise<void>; cancelLoad(): void;
  play(): Promise<void>; pause(): void; seek(seconds: number): void;
  setVolume(volume: number): void; setLoop(loop: boolean): void;
  getState(): MediaState; subscribe(listener: (state: MediaState) => void): () => void;
  readAnalysis(): AnalysisInput | null;
  getRecordingAudio(): MediaStream; dispose(): void;
}
function createDemoFile(): File;
function buildWaveform(file: File, context: BaseAudioContext, signal: AbortSignal): Promise<Float32Array | null>;
```

- [ ] **Step 1: Fehlende Lebenszyklustests schreiben.** `newer_load_wins`, `replacement_releases_object_url`, `cancel_ignores_late_metadata`, `volume_does_not_change_analyser_input`, `play_rejection_is_visible`, `invalid_duration_disables_seek`. Testplattform kontrolliert Metadaten, Fehler und verspätete Ereignisse. `buildWaveform` darf für >32 MiB nicht `arrayBuffer` lesen; Decodefehler geben `null` zurück. Abort und veraltete Decode-Ergebnisse werden verworfen.
- [ ] **Step 2: Rot nachweisen.** `npm test -- tests/audio/media.test.ts tests/audio/waveform.test.ts`; erwartet: fehlende Controller-/Waveform-Implementierung.
- [ ] **Step 3: MediaController und Waveform-Pfad implementieren.** Ein eingebundenes natives `video`-Element mit `playsInline` und lokaler Objekt-URL nimmt Audio-/Videoquellen an. Audiorouting Quelle → Analyser → Gain → Lautsprecher; Aufnahme-Destination ebenfalls hinter Gain. FFT-Größe 2048. Context im Nutzungsereignis starten/resumieren. Neue Ladevorgänge über Generation absichern; Dauer nur als endliche positive Zahl akzeptieren. Nicht abspielbare Medien konkret melden. Optional 256 Waveform-Peaks, sonst Live-Signal.
- [ ] **Step 4: Eigenen Demo-Beat und Fixtures erzeugen.** `createDemoFile` erzeugt 16 Sekunden WAV mit 120 BPM, Kick, kurzen Höhenimpulsen und einem zurückhaltenden Akkord. `scripts/create-test-media.mjs` erzeugt mit vorhandenem FFmpeg zusätzlich kurze MP3-/MP4-Dateien aus eigenem Signal und eigener Testgrafik; nur diese kleinen Fixtures versionieren.
- [ ] **Step 5: Grün prüfen.** Obige Medien-/Waveformtests und Audio-Signaltests; WAV mit `ffprobe` auf Dauer und Audiostream prüfen. Erwartet: korrekte Metadaten und keine verwaisten URLs/Verbindungen in den Plattformtests.
- [ ] **Step 6: Geprüften Stand committen.** Commit `feat: load audio and screen recordings with local playback`.

## Task 4: Ink Flow als durchgängiger erster Visualizer

**Files:** Create: `src/visuals/types.ts`, `VisualEngine.ts`, `quality.ts`, `shaders/noise.ts`, `modes/InkFlow.ts`, `src/App.tsx`, `src/components/Studio.tsx`, `Stage.tsx`, `SourcePicker.tsx`, `Transport.tsx`, `src/styles.css`. Modify: `src/main.tsx`, `index.html`. Test: `tests/visuals/quality.test.ts`, `tests/e2e/ink-flow.spec.ts`.

**Interfaces:** Consumes: Tasks 1–3. Produces:

```ts
interface VisualFrame { time: number; delta: number; playing: boolean; features: AudioFeatures; }
interface EngineEvent { type: 'context-lost' | 'restored' | 'error'; message?: string; }
class VisualEngine {
  constructor(canvas: HTMLCanvasElement, notify: (event: EngineEvent) => void);
  setSettings(settings: VisualSettings): void;
  render(frame: VisualFrame): void; reset(): void; restore(): void; dispose(): void;
  getOutputSize(): {width: number; height: number};
}
function outputSize(aspect: Aspect, quality: Quality): {width: number; height: number};
```

- [ ] **Step 1: Fehlende Verhaltenstests schreiben.** Ausgabe bei Standard 9:16 = 720×1280, 16:9 = 1280×720, 1:1 = 720×720, 4:5 = 720×900; Hoch entsprechend 1080 kurze Kante. E2E lädt WAV, startet Wiedergabe, nimmt zwei Canvas-Bilder und erwartet echte Bildänderung. Pause hält das Bild; Seek löscht Trails. Mit fehlendem WebGL 2 muss der Fehler sichtbar sein. Contextverlust muss als Event gemeldet werden.
- [ ] **Step 2: Rot nachweisen.** `npm test -- tests/visuals/quality.test.ts`; danach `npm run test:e2e -- tests/e2e/ink-flow.spec.ts --project=chromium`. Erwartet: Engine/App fehlt oder geforderte sichtbare Funktion fehlt.
- [ ] **Step 3: Ink Flow und Engine implementieren.** Seeded Fadenbahnen, Curl-Noise, transparente Schlieren und dichter Kern. Nachbildpass wird nach jedem Seek/Modewechsel geleert. `VisualFrame.playing=false` hält Zeit und Nachbilder konstant, zeichnet aber geänderte Einstellungen neu. Canvas-Ausgabegröße bleibt beim Render-Skalieren erhalten; Autoqualität reduziert nur interne Detailmenge/Auflösung. Hardware-DPR höchstens 1,5, interne Auto-Skalierung 0,5…1; unter 28 FPS für zwei Sekunden reduzieren, über 55 FPS für vier Sekunden schrittweise erholen.
- [ ] **Step 4: Erste nutzbare Studio-Oberfläche integrieren.** Dateiauswahl/Drop, Demo, Name/Dauer, Play/Pause, Seek, Volume, Loop, Bühne. Ein einziger Mediencontroller und eine Engine pro Studio-Lebenszyklus; Animation per RAF, UI-Werte maximal 10 Hz. Nach Seek/Load FeatureExtractor und Engine resetten. Ruhende Vorschau vor dem ersten Track, Text „2317“ und „by smuhsic“.
- [ ] **Step 5: Grün und Referenzlook prüfen.** Beide Testbefehle; Screenshots aus Start und aktiver Wiedergabe visuell mit den lokalen Referenzframes vergleichen. Freie helle Fläche, filigrane dunkle Fäden, Kern und Ausläufer müssen erkennbar sein. Abweichungen vor dem Commit verbessern; keine Behauptung eines identischen Originalalgorithmus.
- [ ] **Step 6: Geprüften Stand committen.** Commit `feat: build the 2317 ink flow audio visualizer`.

## Task 5: Vier weitere Modi und kombinierbare Stimmungspresets

**Files:** Create: `src/visuals/modes/types.ts`, `index.ts`, `LiquidBloom.ts`, `Mandala.ts`, `Tunnel.ts`, `SpectralRibbons.ts`, `src/components/LookPicker.tsx`. Modify: `InkFlow.ts`, `VisualEngine.ts`, `Studio.tsx`. Test: `tests/e2e/looks.spec.ts`.

**Interfaces:** Consumes: `VisualFrame`, `VisualSettings`, Engine und Mood-Defaults. Produces: `createMode(mode: VisualMode, renderer: WebGLRenderer): VisualModeInstance`; Instanz bietet `update(frame: VisualFrame, settings: VisualSettings): void`, `reset(): void`, `dispose(): void` und eine renderbare Three.js-Szene. Der Modusfactory-Pfad hängt nicht von React ab.

- [ ] **Step 1: Fehlende Browserfälle schreiben.** Für alle fünf Modi muss der Look auswählbar sein und sich unter Demo-Wiedergabe sichtbar ändern. Jede Stimmung lässt sich in jedem Modus anwenden, ohne den Modus oder die Wiedergabeposition zurückzusetzen. Palette, Dichte, Geschwindigkeit und Beat-Stärke bleiben danach editierbar. Wechsel zehnmal hin und zurück erzeugt keine zusätzlichen Canvas-/RAF-Instanzen.
- [ ] **Step 2: Rot nachweisen.** `npm run test:e2e -- tests/e2e/looks.spec.ts --project=chromium`; erwartet: vier Looks/Mood-Auswahl fehlen.
- [ ] **Step 3: Modusfactory und vier Modi implementieren.** LiquidBloom: weiche geschichtete Konturen; Mandala: radiale Spiegelung; Tunnel: perspektivische Ringfelder; Ribbons: mehrere frequenzabhängige Bänder. Alle verwenden Farbmischung, Größe, Dichte, Symmetrie, Komplexität, Rotation, Turbulenz, Weichheit und Bandgewichte in einer für den Look sinnvollen Ausprägung. Auf Moduswechsel Ressourcen der vorherigen Instanz lösen.
- [ ] **Step 4: Looks und Stimmungen in die Oberfläche integrieren.** Deutsche Stimmungstexte, fünf Look-Namen, visuell ausgewählter Zustand. Mood setzt ein Parameterbündel; manuelles Editieren entfernt nur die Bindung an den Mood-Namen, nicht die gesetzten Werte.
- [ ] **Step 5: Grün und unterschiedliche Bildsprachen prüfen.** Browserfälle sowie Presettests. Für jeden Modus Screenshot ansehen; die fünf Modi müssen klar unterscheidbar und unter Musik aktiv sein.
- [ ] **Step 6: Geprüften Stand committen.** Commit `feat: add psychedelic looks and mood presets`.

## Task 6: Vollständige Anpassung, Presets und mobile Bedienung

**Files:** Create: `src/presets/store.ts`, `src/components/ParameterPanel.tsx`, `PresetPanel.tsx`. Modify: `Studio.tsx`, `Stage.tsx`, `Transport.tsx`, `SourcePicker.tsx`, `styles.css`. Test: `tests/presets/store.test.ts`, `tests/e2e/studio.spec.ts`.

**Interfaces:** Consumes: Task-1-Validator und Settings, MediaController/Engine. Produces: `PresetStore` mit `list(): Preset[]`, `save(preset: Preset): {ok: boolean; error?: string}`, `remove(id: string): {ok: boolean; error?: string}`; Konstruktor nimmt optional `Storage`. JSON-Download enthält nur den validierten Preset-Vertrag. `Studio` hält den aktiven Look unabhängig vom Persistenzstatus.

- [ ] **Step 1: Fehlende Tests schreiben.** `storage_failure_preserves_active_settings`, `corrupt_storage_is_recoverable`, `roundtrip_preserves_seed_and_output`. E2E: speichern → Reload → wiederherstellen; fehlerhaften JSON importieren → Look bleibt bestehen; neue Variation ändert Seed und keine anderen Werte; Reset setzt Defaults des Modus. Mobile 390 Pixel: alle Kontrollgruppen erreichbar, kein horizontales Scrollen. Space außerhalb Inputs toggelt Play; innerhalb Inputs nicht.
- [ ] **Step 2: Rot nachweisen.** `npm test -- tests/presets/store.test.ts` und `npm run test:e2e -- tests/e2e/studio.spec.ts --project=chromium`; erwartet: Speicher-/Editorfunktionen fehlen.
- [ ] **Step 3: PresetStore implementieren.** Schlüssel `2317.presets.v1`. Alle gespeicherten/importierten Datensätze durch `parsePreset` normalisieren. Speicherfehler als Rückgabe statt unhandled Exception; beschädigter Inhalt überschreibt keine laufenden Einstellungen. Import-Fehlermeldungen konkret und in Deutsch.
- [ ] **Step 4: Parameter und Transport vervollständigen.** Drei Akzentfarben plus Hintergrund, mono/Verlauf, Farbmischung, alle definierten Form-/Fluss-/Musikregler, Beatmodus und manueller BPM, Seed-Variation und Reset. Timeline zeigt Übersichtswellenform oder klaren Live-/Zeit-Fallback. Optionales Decode niemals Voraussetzung für Start. Vollbild und vier Seitenverhältnisse verändern Bühne ohne Verzerrung; beschriftete Controls, Touchziele mindestens 44 Pixel.
- [ ] **Step 5: Layout und Unterbrechungen integrieren.** Desktop mit seitlichen Panels, Mobil mit ausklappbaren Gruppen. Reduced-Motion respektieren. Abbruch während Load, keine unendlichen Daueranzeigen, Meldung „Kein Audiosignal erkannt“ erst nach mindestens zwei Sekunden laufender Stille und ohne Annahme über die Existenz einer Audiospur.
- [ ] **Step 6: Grün prüfen.** Storetests und Studio-E2E in Chromium und WebKit. Bild bei 390 Pixeln ansehen; Parameter sind erreichbar, Schrift lesbar und Bühne korrekt skaliert.
- [ ] **Step 7: Geprüften Stand committen.** Commit `feat: add custom presets and responsive studio controls`.

## Task 7: Videoaufnahme mit Ton und geordnetem Abbruch

**Files:** Create: `src/export/formats.ts`, `Recorder.ts`, `download.ts`, `src/components/ExportPanel.tsx`. Modify: `Studio.tsx`, `Transport.tsx`, `SourcePicker.tsx`, `ParameterPanel.tsx`. Test: `tests/export/recorder.test.ts`, `tests/export/formats.test.ts`, `tests/e2e/export.spec.ts`.

**Interfaces:** Consumes: Canvas, `MediaController.getRecordingAudio()`, EngineEvents und MediaState. Produces:

```ts
interface RecordingResult { blob: Blob; mimeType: string; extension: 'webm' | 'mp4'; }
type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping' | 'error';
function supportedRecordingFormats(): {mimeType: string; extension: 'webm' | 'mp4'}[];
class Recorder {
  getState(): RecordingState;
  start(canvas: HTMLCanvasElement, audio: MediaStream, startPlayback: () => Promise<void>): Promise<void>;
  stop(): Promise<RecordingResult | null>;
  abort(reason: string): void;
  subscribe(listener: (state: RecordingState, message: string | null) => void): () => void;
  dispose(): void;
}
function downloadBlob(blob: Blob, filename: string): void;
```

- [ ] **Step 1: Fehlende Tests schreiben.** Keine geeigneten MIME-Typen → begründete deaktivierte Aufnahme. Playback-Rejection → keine Aufnahme und keine offenen Video-/Clone-Tracks. Start/Stop → Audio und Video vorhanden, Extension passend zum tatsächlichen MIME-Typ. Abort, Recorderfehler, 300 Sekunden, Tab-hidden und Contextlost → unterbrochener Status, Ressourcen geschlossen. Recorder darf den vom Controller verwalteten Original-Audiotrack nicht stoppen; nur geklonte Aufnahmetracks.
- [ ] **Step 2: Rot nachweisen.** `npm test -- tests/export`; erwartet: Recorder/Formatfunktionen fehlen.
- [ ] **Step 3: Formate und Recorder implementieren.** In Reihenfolge WebM VP9/Opus, WebM VP8/Opus, MP4 H.264/AAC, generische WebM/MP4-Fähigkeit prüfen. Ausgabeextension vom gewählten Format ableiten. `canvas.captureStream(30)` plus geklonter Audio-Track. Nach vorbereitetem Recorder `startPlayback` erwarten; Aufnahmebeginn an Audioabspielbarkeit koppeln und bei Fehler verwerfen. Chunks sammeln, maximal 300 s, Track-/Timer-/Eventcleanup in allen Pfaden. Normale Trackenden stoppen erfolgreich; Hintergrund/Audiointerruption/Contextlost brechen ab.
- [ ] **Step 4: Studio integrieren.** Quelle, Seek, Format, Qualität und Pause während Aufnahme sperren; visuelle Regler bleiben aktiv. Stop und Abbruch sind getrennte Aktionen. Keine Ausgabe von Bild oder Ton des Originalvideos außer seiner Audiospur. Aufnahmezeit, Format und begründete Fehler im Exportpanel; Download heißt `2317-<Zeitstempel>.<extension>`.
- [ ] **Step 5: Grün und tatsächliche Ausgabedatei prüfen.** Unit-Tests und E2E-Export einer kurzen eigenen Pulsquelle. Download mit `ffprobe` auf Audio-/Videotrack und erwartete Abmessungen prüfen, abspielen, Bildfolge und Beatpositionen ansehen. Im WebKit-Test Erfolg oder tatsächlich erkannte fehlende Aufnahmefähigkeit prüfen, niemals eine gemockte Fähigkeit als reale Unterstützung ausgeben.
- [ ] **Step 6: Geprüften Stand committen.** Commit `feat: export audio reactive videos with sound`.

## Task 8: Gesamtabnahme, unabhängige Prüfung und GitHub-Übergabe

**Files:** Create: `tests/e2e/acceptance.spec.ts`, `README.md`, `docs/verification.md`, `.github/workflows/ci.yml`. Modify: vorhandene Produktdateien nur für nachgewiesene Abnahme-/Reviewfehler; `playwright.config.ts`, `package.json` falls Prüfkommandos ergänzt werden.

**Interfaces:** Consumes: vollständig integrierte App; approved Design/Plan; GitHub-Konto `smuhs23` und bereits freigegebene Repo-Neuanlage. Produces: getesteter Branch, lesbare Einrichtung und privates Repository mit genau dem verifizierten Quellstand.

- [ ] **Step 1: Noch fehlende Abnahmefälle schreiben.** WAV/MP3/MP4, stummes/ungültiges Medium, Seek/Loop/Wechsel, fünf Modi/fünf Stimmungen, Preset-Roundtrip, mobile 390-Pixel-Ansicht, Recording und Contextverlust. Bereits vorhandene sinnvolle Tests wiederverwenden, statt sie zu duplizieren. Das hochgeladene Referenzvideo separat lokal als Eingabe prüfen und nie in einen Commit aufnehmen.
- [ ] **Step 2: Relevante Lücken rot nachweisen und gezielt schließen.** Je nach betroffener Datei das passende bestehende Testkommando verwenden; Fehlerursache zuerst feststellen, kleinste notwendige Änderung implementieren und die betroffene Prüfung erneut ausführen.
- [ ] **Step 3: Dokumentation und CI ergänzen.** README mit Install/Start/Build/Test, Medien-/Codecgrenzen, fünf Looks, lokaler Verarbeitung, Presets und Echtzeitexport. CI auf `push`/`pull_request`: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`; Chromium/WebKit-E2E als separater Job mit offiziell installierten Playwright-Browsern. Keine öffentliche Deployment-Automatik.
- [ ] **Step 4: Gesamtabnahme ausführen.** `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:e2e -- --project=chromium --project=webkit`, `git diff --check`. Erwartet: alle Kommandos erfolgreich, keine unhandled Browserfehler. Export separat mit `ffprobe` prüfen, repräsentative Screenshots ansehen. `docs/verification.md` nennt Datum, getestete Browser, gemessene Grenzen und ausdrücklich den Stand einer echten iPhone-Safari-Prüfung.
- [ ] **Step 5: Review passend zur gewählten Ausführung erhalten.** Native: Implementierung in dieser Session, danach ein frischer unabhängiger Reviewer für den gesamten Branch. Subagent-driven: Taskweise Implementer-/Reviewer-Gates und abschließendes Branchreview. Review vor GitHub-Übergabe; wichtige Befunde beheben und jeweils relevante Prüfung erneut ausführen.
- [ ] **Step 6: Geprüften Stand committen.** Commit `chore: verify 2317 and document setup` nach frischer Verifikation.
- [ ] **Step 7: Privates GitHub-Repository anlegen oder bestätigtes vorhandenes Repository verwenden.** Nach erfolgreichem Browserlogin sichtbaren Owner `smuhs23` prüfen. Namen `smuhsic`, Beschreibung `2317 — customizable audio-reactive visual art studio`, privat, ohne externe Lizenz und ohne fremdes Template anlegen. Zeigt GitHub ein bestehendes Repository, über Connector Inhalt, Regeln und Schreibrechte lesen; nichts überschreiben. Ergebnis über sichtbaren Repozustand und GitHub-`get_repo` verifizieren.
- [ ] **Step 8: Exakt verifizierte Dateien bereitstellen.** Vorhandene sichere Git-Authentifizierung bevorzugen; keine neuen Tokens erstellen. Falls CLI-Authentifizierung fehlt, verfügbare GitHub-Git-Data-Tools für einen zusammenhängenden Tree/Commit/Ref verwenden. Bei leerem Repo per Contents-API einen kontrollierten ersten Commit erzeugen, danach vollständigen Tree darauf aufbauen. Workflows nur mit vorhandener Berechtigung schreiben; jede fehlende Berechtigung konkret melden und getesteten Stand erhalten. GitHub-Remote-Tree gegen den lokalen Quellstand abgleichen und bestätigte private Sichtbarkeit beibehalten.
- [ ] **Step 9: Ergebnis übergeben.** Verifizierten GitHub-Link, getestete Funktionen und konkrete verbleibende Browsergrenzen nennen. Keinen öffentlichen Live-Link oder erfolgreiche GitHub-CI behaupten, solange diese nicht tatsächlich verifiziert sind.

## Planprüfung und Ausführungswahl

Spec-Abdeckung: Tasks 1/5/6 decken Looks, Stimmung und Anpassung ab; Tasks 2/3 Audio und Screenrecordings; Task 4 Referenzlook, Grafiklebenszyklus und Qualität; Task 7 Export; Task 8 Abnahme, CI und privates GitHub-Repository. Review-Focus-Fälle sind jeweils dem verantwortlichen Task zugeordnet. Einheitliche Typen und Methodennamen gelten über alle Tasks.

**Empfehlung: Native.** Die acht Tasks hängen eng an einem gemeinsamen Audio-/Rendervertrag; Umsetzung in dieser Session vermeidet wiederholte Kontextübergaben, und ein abschließender unabhängiger Review prüft das zusammengesetzte Ergebnis. Als Alternative ist Subagent-driven mit einem neuen Implementer und Reviewer pro Task möglich.

Vor Produktimplementierung: Nutzer prüft diesen Plan und wählt Native oder Subagent-driven. Die vorherige Design- und Browserfreigabe bleibt gültig. Eine Browseranmeldung muss vor der tatsächlichen GitHub-Neuanlage erfolgreich bestätigt sein.
