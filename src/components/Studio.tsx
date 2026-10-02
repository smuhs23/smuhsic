import { useEffect, useRef, useState } from "react";
import { MediaController } from "../audio/MediaController";
import type { MediaState } from "../audio/MediaController";
import { FeatureExtractor } from "../audio/FeatureExtractor";
import { silentFeatures } from "../audio/types";
import { createDemoFile } from "../audio/demo";
import { buildWaveform } from "../audio/waveform";
import { applyMood, defaultSettings } from "../presets/defaults";
import { VisualEngine } from "../visuals/VisualEngine";
import { SourcePicker } from "./SourcePicker";
import { Transport } from "./Transport";
import { Stage } from "./Stage";
import { LookPicker } from "./LookPicker";
import { ParameterPanel } from "./ParameterPanel";
import { PresetPanel } from "./PresetPanel";
import type { VisualSettings } from "../presets/types";
import { Recorder } from "../export/Recorder";
import type { RecordingState } from "../export/Recorder";
import { supportedRecordingFormats } from "../export/formats";
import { downloadBlob } from "../export/download";
import { ExportPanel } from "./ExportPanel";
export function Studio() {
  const [settings, setSettings] = useState(defaultSettings);
  const [mediaState, setMediaState] = useState<MediaState>({
    status: "empty",
    name: "",
    duration: 0,
    currentTime: 0,
    volume: 0.8,
    loop: false,
    error: null,
  });
  const [features, setFeatures] = useState(silentFeatures());
  const [waveform, setWaveform] = useState<Float32Array | null>(null),
    [noSignal, setNoSignal] = useState(false);
  const [graphicError, setGraphicError] = useState<string | null>(null),
    [lost, setLost] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle"),
    [recordingMessage, setRecordingMessage] = useState<string | null>(null),
    [elapsed, setElapsed] = useState(0),
    [exportSuccess, setExportSuccess] = useState(false);
  const [formats] = useState(supportedRecordingFormats),
    capable =
      typeof HTMLCanvasElement.prototype.captureStream === "function" &&
      formats.length > 0;
  const canvas = useRef<HTMLCanvasElement>(null),
    media = useRef<MediaController | null>(null),
    engine = useRef<VisualEngine | null>(null),
    extractor = useRef<FeatureExtractor | null>(null);
  const settingsRef = useRef(settings),
    featureRef = useRef(silentFeatures());
  settingsRef.current = settings;
  const waveAbort = useRef<AbortController | null>(null),
    silentSince = useRef<number | null>(null);
  const recorder = useRef<Recorder | null>(null),
    recordStarted = useRef(0),
    lockedRef = useRef(false);
  const locked = ["starting", "recording", "stopping"].includes(recordingState);
  const finishRecording = () => {
    void recorder.current?.stop();
  };
  useEffect(() => {
    const controller = new MediaController();
    media.current = controller;
    const capture = new Recorder();
    recorder.current = capture;
    const unsubResult = capture.subscribeResult((result) => {
      controller.pause();
      downloadBlob(
        result.blob,
        `2317-${new Date().toISOString().replace(/[:.]/g, "-")}.${result.extension}`,
      );
      setExportSuccess(true);
    });
    const unsubRecorder = capture.subscribe((state, message) => {
      lockedRef.current = ["starting", "recording", "stopping"].includes(state);
      setRecordingState(state);
      setRecordingMessage(message);
      if (state === "recording") recordStarted.current = performance.now();
      if (state === "starting") {
        setExportSuccess(false);
        setElapsed(0);
      }
      if (state === "error") controller.pause();
    });
    const unsubscribe = controller.subscribe((state) => {
      setMediaState(state);
      if (capture.getState() === "recording" && state.status !== "playing") {
        if (state.status === "ready") void finishRecording();
        else if (["paused", "empty", "error"].includes(state.status))
          capture.abort(
            "Die Aufnahme wurde durch eine Unterbrechung der Audioquelle beendet.",
          );
      }
    });
    let visual: VisualEngine | null = null;
    try {
      visual = new VisualEngine(canvas.current!, (event) => {
        if (event.type === "context-lost") {
          capture.abort(
            "Die Aufnahme wurde durch einen Verlust der Grafik unterbrochen.",
          );
          controller.pause();
          setLost(true);
          setGraphicError(event.message ?? "Die Grafik wurde unterbrochen.");
        }
        if (event.type === "restored") {
          setLost(false);
          setGraphicError(null);
          extractor.current?.reset();
        }
        if (event.type === "error")
          setGraphicError(event.message ?? "Die Grafik konnte nicht starten.");
      });
      visual.setSettings(settingsRef.current);
      engine.current = visual;
    } catch (error) {
      setGraphicError(
        error instanceof Error
          ? error.message
          : "Die Grafik konnte nicht starten.",
      );
    }
    let raf = 0,
      last = performance.now(),
      lastUi = 0;
    const animate = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      const state = controller.getState(),
        playing = state.status === "playing";
      if (playing) {
        const input = controller.readAnalysis();
        if (input) {
          if (!extractor.current)
            extractor.current = new FeatureExtractor(
              input.sampleRate,
              input.fftSize,
            );
          featureRef.current = extractor.current.update(
            state.currentTime,
            input.spectrumDb,
            input.waveform,
            settingsRef.current,
          );
        }
      }
      if (!playing || featureRef.current.rms >= 0.001)
        silentSince.current = null;
      else if (silentSince.current === null) silentSince.current = now;
      try {
        visual?.render({
          time: state.currentTime,
          delta,
          playing,
          features: featureRef.current,
        });
      } catch (error) {
        capture.abort(
          "Die Aufnahme wurde durch einen Grafikfehler unterbrochen.",
        );
        controller.pause();
        setGraphicError(
          error instanceof Error
            ? error.message
            : "Die Grafik wurde unterbrochen.",
        );
      }
      if (now - lastUi >= 100) {
        lastUi = now;
        setMediaState(state);
        setFeatures({ ...featureRef.current });
        setNoSignal(
          silentSince.current !== null && now - silentSince.current >= 2000,
        );
        if (
          capture.getState() === "recording" ||
          capture.getState() === "stopping"
        )
          setElapsed((now - recordStarted.current) / 1000);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(raf);
      waveAbort.current?.abort();
      unsubRecorder();
      unsubResult();
      capture.dispose();
      recorder.current = null;
      unsubscribe();
      controller.dispose();
      visual?.dispose();
      media.current = null;
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    engine.current?.setSettings(settings);
  }, [settings]);
  const reset = () => {
    extractor.current?.reset();
    featureRef.current = silentFeatures();
    silentSince.current = null;
    setNoSignal(false);
    engine.current?.reset();
  };
  const load = (file: File) => {
    if (lockedRef.current) return;
    reset();
    waveAbort.current?.abort();
    setWaveform(null);
    const abort = new AbortController();
    waveAbort.current = abort;
    void media.current?.load(file);
    try {
      const context = new OfflineAudioContext(1, 1, 44100);
      void buildWaveform(file, context, abort.signal).then((peaks) => {
        if (!abort.signal.aborted) setWaveform(peaks);
      });
    } catch {
      /* Live signal and time remain available without waveform decoding. */
    }
  };
  const clearSource = () => {
    if (lockedRef.current) return;
    waveAbort.current?.abort();
    setWaveform(null);
    media.current?.cancelLoad();
    reset();
  };
  const toggle = () => {
    const player = media.current;
    if (!player || lockedRef.current) return;
    if (player.getState().status === "playing") player.pause();
    else void player.play().catch(() => {});
  };
  const seek = (time: number) => {
    if (lockedRef.current) return;
    media.current?.seek(time);
    reset();
    setMediaState(media.current!.getState());
  };
  const change = (patch: Partial<VisualSettings>) => {
    if (lockedRef.current && (patch.aspect || patch.quality)) return;
    setSettings((s) => ({ ...s, ...patch, mood: null }));
  };
  const startRecording = async () => {
    const player = media.current,
      capture = recorder.current;
    if (
      !player ||
      !capture ||
      !canvas.current ||
      graphicError ||
      lockedRef.current
    )
      return;
    try {
      await capture.start(canvas.current, player.getRecordingAudio(), () =>
        player.play(),
      );
    } catch {
      if (capture.getState() !== "error") {
        setRecordingState("error");
        setRecordingMessage(
          "Bild oder Audio konnten nicht für die Aufnahme vorbereitet werden. Starte zuerst die Wiedergabe und versuche es erneut.",
        );
      }
    }
  };
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        event.code !== "Space" ||
        event.repeat ||
        lockedRef.current ||
        target?.closest('input,textarea,select,button,[contenteditable="true"]')
      )
        return;
      event.preventDefault();
      const player = media.current;
      if (
        !player ||
        !["ready", "playing", "paused"].includes(player.getState().status)
      )
        return;
      if (player.getState().status === "playing") player.pause();
      else void player.play().catch(() => {});
    };
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  return (
    <div className="studio-shell">
      <header className="app-header">
        <a className="brand" href="./" aria-label="2317 Start">
          <h1>
            2317
            <span className="brand-dot" aria-hidden="true">
              .
            </span>
          </h1>
          <span>by smuhsic</span>
        </a>
        <span className="header-note">SEE WHAT YOU HEAR.</span>
        <span className="version-badge">
          STUDIO <span>01</span>
        </span>
      </header>
      <main className="workspace">
        <aside className="control-column">
          <div className="intro">
            <span className="eyebrow">DEIN SOUND. DEIN LOOK.</span>
            <p>
              Mach Musik
              <br />
              <em>sichtbar.</em>
            </p>
            <span>Formen, die mit dir fühlen.</span>
          </div>
          <SourcePicker
            state={mediaState}
            onFile={load}
            onDemo={() => load(createDemoFile())}
            onClear={clearSource}
            locked={locked}
          />
          <LookPicker
            settings={settings}
            onMode={(mode) =>
              setSettings((s) => ({
                ...defaultSettings(mode),
                seed: s.seed,
                aspect: s.aspect,
                quality: s.quality,
                beatMode: s.beatMode,
                manualBpm: s.manualBpm,
                sensitivity: s.sensitivity,
                smoothing: s.smoothing,
                bassWeight: s.bassWeight,
                midWeight: s.midWeight,
                trebleWeight: s.trebleWeight,
              }))
            }
            onMood={(mood) => setSettings((s) => applyMood(s, mood))}
          />
          <ParameterPanel
            settings={settings}
            onChange={change}
            onVariation={() =>
              change({ seed: crypto.getRandomValues(new Uint32Array(1))[0] })
            }
            onReset={() =>
              setSettings((s) => ({
                ...defaultSettings(s.mode),
                aspect: s.aspect,
                quality: s.quality,
              }))
            }
          />
          <PresetPanel
            settings={settings}
            onApply={(value) => {
              if (!lockedRef.current) setSettings(value);
            }}
            locked={locked}
          />
          <p className="sidebar-footnote">2317 / A SPACE FOR SOUND & SHAPE</p>
        </aside>
        <div className="preview-column">
          <Stage
            canvasRef={canvas}
            settings={settings}
            features={features}
            playing={mediaState.status === "playing"}
            error={graphicError}
            lost={lost}
            onRestore={() => engine.current?.restore()}
            onChange={change}
            locked={locked}
          />
          <Transport
            state={mediaState}
            features={features}
            onToggle={toggle}
            onSeek={seek}
            onVolume={(value) => media.current?.setVolume(value)}
            onLoop={() => {
              if (!lockedRef.current) media.current?.setLoop(!mediaState.loop);
            }}
            waveform={waveform}
            noSignal={noSignal}
            locked={locked}
          />
          <ExportPanel
            state={recordingState}
            message={recordingMessage}
            format={formats[0]}
            capable={capable}
            ready={
              !graphicError &&
              mediaState.duration > 0 &&
              ["ready", "playing", "paused"].includes(mediaState.status)
            }
            elapsed={elapsed}
            success={exportSuccess}
            onStart={() => void startRecording()}
            onStop={() => void finishRecording()}
            onAbort={() =>
              recorder.current?.abort(
                "Aufnahme abgebrochen. Die Datei wurde verworfen.",
              )
            }
          />
        </div>
      </main>
      <footer className="app-footer">
        <span>GESTALTE, WAS DU HÖRST.</span>
        <span>
          Made to move with music <span className="footer-star">✳</span>
        </span>
      </footer>
    </div>
  );
}
