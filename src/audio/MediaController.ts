export interface MediaState {
  status: "empty" | "loading" | "ready" | "playing" | "paused" | "error";
  name: string;
  duration: number;
  currentTime: number;
  volume: number;
  loop: boolean;
  error: string | null;
}
export interface AnalysisInput {
  spectrumDb: Float32Array;
  waveform: Float32Array;
  sampleRate: number;
  fftSize: number;
}
export interface MediaPlatform {
  createElement(file: File): HTMLMediaElement;
  createContext(): AudioContext;
  createUrl(file: File): string;
  revokeUrl(url: string): void;
}
const browserPlatform: MediaPlatform = {
  createElement(file) {
    const element = document.createElement(
      file.type.startsWith("audio/") ? "audio" : "video",
    );
    element.setAttribute("playsinline", "");
    element.setAttribute("aria-hidden", "true");
    element.style.cssText =
      "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:0;bottom:0";
    element.preload = "metadata";
    document.body.append(element);
    return element;
  },
  createContext: () => new AudioContext(),
  createUrl: URL.createObjectURL.bind(URL),
  revokeUrl: URL.revokeObjectURL.bind(URL),
};
const initial: MediaState = {
  status: "empty",
  name: "",
  duration: 0,
  currentTime: 0,
  volume: 0.8,
  loop: false,
  error: null,
};

export class MediaController {
  private state: MediaState = { ...initial };
  private listeners = new Set<(s: MediaState) => void>();
  private element: HTMLMediaElement | null = null;
  private url: string | null = null;
  private generation = 0;
  private playAttempt = 0;
  private loadAbort: AbortController | null = null;
  private cleanups: (() => void)[] = [];
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private gain: GainNode | null = null;
  private destination: MediaStreamAudioDestinationNode | null = null;
  private spectrum = new Float32Array(1024);
  private waveform = new Float32Array(2048);
  private disposed = false;
  constructor(private readonly platform: MediaPlatform = browserPlatform) {}
  private emit(patch: Partial<MediaState> = {}) {
    this.state = { ...this.state, ...patch };
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
  getState(): MediaState {
    const currentTime = this.element?.currentTime ?? 0;
    return {
      ...this.state,
      currentTime: Number.isFinite(currentTime) ? currentTime : 0,
    };
  }
  subscribe(listener: (state: MediaState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }
  private releaseSource() {
    this.loadAbort?.abort();
    this.loadAbort = null;
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.source?.disconnect();
    this.source = null;
    if (this.element) {
      this.element.pause();
      this.element.removeAttribute("src");
      this.element.load();
      this.element.remove();
      this.element = null;
    }
    if (this.url) {
      this.platform.revokeUrl(this.url);
      this.url = null;
    }
  }
  cancelLoad(): void {
    this.generation++;
    this.releaseSource();
    this.emit({ status: "empty", name: "", duration: 0, error: null });
  }
  async load(file: File): Promise<void> {
    if (this.disposed) throw new Error("Der Player ist geschlossen.");
    this.releaseSource();
    const generation = ++this.generation;
    if (!file.size) {
      this.emit({
        status: "error",
        name: file.name,
        duration: 0,
        error: "Die ausgewählte Datei ist leer.",
      });
      return;
    }
    const element = this.platform.createElement(file);
    this.element = element;
    this.url = this.platform.createUrl(file);
    element.src = this.url;
    element.loop = this.state.loop;
    const abort = new AbortController();
    this.loadAbort = abort;
    this.emit({ status: "loading", name: file.name, duration: 0, error: null });
    const listen = (name: string, fn: EventListener) => {
      element.addEventListener(name, fn);
      this.cleanups.push(() => element.removeEventListener(name, fn));
    };
    listen("ended", () => {
      if (generation === this.generation) this.emit({ status: "ready" });
    });
    listen("pause", () => {
      if (
        generation === this.generation &&
        this.state.status === "playing" &&
        !element.ended
      )
        this.emit({ status: "paused" });
    });
    try {
      await new Promise<void>((resolve, reject) => {
        const ready = () => {
            cleanup();
            resolve();
          },
          error = () => {
            cleanup();
            reject(
              new Error(
                "Das Dateiformat ist nicht abspielbar oder die Datei ist beschädigt.",
              ),
            );
          };
        const cancelled = () => {
          cleanup();
          resolve();
        };
        const timer = setTimeout(error, 20_000);
        const cleanup = () => {
          clearTimeout(timer);
          element.removeEventListener("loadedmetadata", ready);
          element.removeEventListener("error", error);
          abort.signal.removeEventListener("abort", cancelled);
        };
        element.addEventListener("loadedmetadata", ready, { once: true });
        element.addEventListener("error", error, { once: true });
        abort.signal.addEventListener("abort", cancelled, { once: true });
        element.load();
        if (element.readyState >= 1) ready();
      });
      if (generation !== this.generation || abort.signal.aborted) return;
      const duration =
        Number.isFinite(element.duration) && element.duration > 0
          ? element.duration
          : 0;
      listen("error", () => {
        if (generation === this.generation) {
          element.pause();
          this.emit({
            status: "error",
            error: "Die Wiedergabe wurde wegen eines Medienfehlers beendet.",
          });
        }
      });
      this.emit({ status: "ready", duration });
    } catch (error) {
      if (generation === this.generation && !abort.signal.aborted) {
        this.releaseSource();
        this.emit({
          status: "error",
          duration: 0,
          error:
            error instanceof Error
              ? error.message
              : "Die Datei konnte nicht geladen werden.",
        });
      }
    }
  }
  private ensureGraph() {
    if (
      !this.element ||
      ["empty", "loading", "error"].includes(this.state.status)
    )
      throw new Error("Wähle zuerst eine abspielbare Datei.");
    if (!this.context) {
      const context = this.platform.createContext();
      this.context = context;
      this.analyser = context.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0;
      this.analyser.minDecibels = -100;
      this.analyser.maxDecibels = -10;
      this.gain = context.createGain();
      this.gain.gain.value = this.state.volume;
      this.destination = context.createMediaStreamDestination();
      this.analyser.connect(this.gain);
      this.gain.connect(context.destination);
      this.gain.connect(this.destination);
      context.addEventListener("statechange", () => {
        if (
          !this.disposed &&
          this.state.status === "playing" &&
          context.state !== "running"
        ) {
          this.pause();
          this.emit({
            status: "paused",
            error:
              "Die Audioausgabe wurde unterbrochen. Starte die Wiedergabe erneut.",
          });
        }
      });
    }
    if (!this.source) {
      this.source = this.context.createMediaElementSource(this.element);
      this.source.connect(this.analyser!);
    }
    return this.context;
  }
  async play(): Promise<void> {
    const generation = this.generation,
      attempt = ++this.playAttempt,
      element = this.element;
    const isCurrent = () =>
      generation === this.generation &&
      attempt === this.playAttempt &&
      !this.disposed;
    try {
      const context = this.ensureGraph();
      await context.resume();
      if (!isCurrent() || !element)
        throw new DOMException("Wiedergabe abgebrochen", "AbortError");
      if (
        this.state.duration &&
        element.currentTime >= this.state.duration - 0.02
      )
        element.currentTime = 0;
      await element.play();
      if (!isCurrent())
        throw new DOMException("Wiedergabe abgebrochen", "AbortError");
      this.emit({ status: "playing", error: null });
    } catch (error) {
      if (isCurrent())
        this.emit({
          status: "paused",
          error:
            "Die Wiedergabe konnte nicht starten. Versuche es mit der Play-Taste erneut.",
        });
      throw error;
    }
  }
  pause(): void {
    this.playAttempt++;
    this.element?.pause();
    if (this.state.status === "playing") this.emit({ status: "paused" });
  }
  seek(seconds: number): void {
    if (this.element && this.state.duration && Number.isFinite(seconds))
      this.element.currentTime = Math.min(
        this.state.duration,
        Math.max(0, seconds),
      );
  }
  setVolume(volume: number): void {
    const value = Math.max(0, Math.min(1, volume));
    if (this.gain) this.gain.gain.value = value;
    this.emit({ volume: value });
  }
  setLoop(loop: boolean): void {
    if (this.element) this.element.loop = loop;
    this.emit({ loop });
  }
  readAnalysis(): AnalysisInput | null {
    if (!this.analyser || !this.context) return null;
    this.analyser.getFloatFrequencyData(this.spectrum);
    this.analyser.getFloatTimeDomainData(this.waveform);
    return {
      spectrumDb: this.spectrum,
      waveform: this.waveform,
      sampleRate: this.context.sampleRate,
      fftSize: this.analyser.fftSize,
    };
  }
  getRecordingAudio(): MediaStream {
    this.ensureGraph();
    return this.destination!.stream;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.generation++;
    this.releaseSource();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    this.destination?.stream.getTracks().forEach((track) => track.stop());
    void this.context?.close().catch(() => {});
    this.listeners.clear();
  }
}
