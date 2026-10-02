import { extensionForMime, supportedRecordingFormats } from "./formats";
import type { RecordingFormat } from "./formats";
export interface RecordingResult {
  blob: Blob;
  mimeType: string;
  extension: "webm" | "mp4";
}
export type RecordingState =
  "idle" | "starting" | "recording" | "stopping" | "error";
export interface NativeRecorder extends EventTarget {
  readonly state: "inactive" | "recording" | "paused";
  readonly mimeType: string;
  start(timeslice?: number): void;
  stop(): void;
}
export interface RecorderPlatform {
  createRecorder(stream: MediaStream, mimeType: string): NativeRecorder;
  makeStream(tracks: MediaStreamTrack[]): MediaStream;
  formats(): RecordingFormat[];
  visibility: { target: EventTarget; isHidden: () => boolean } | null;
}
const platform: RecorderPlatform = {
  createRecorder: (stream, mimeType) =>
    new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
      audioBitsPerSecond: 192_000,
    }),
  makeStream: (tracks) => new MediaStream(tracks),
  formats: supportedRecordingFormats,
  visibility:
    typeof document === "undefined"
      ? null
      : { target: document, isHidden: () => document.hidden },
};
export class Recorder {
  private state: RecordingState = "idle";
  private message: string | null = null;
  private listeners = new Set<
    (state: RecordingState, message: string | null) => void
  >();
  private resultListeners = new Set<(result: RecordingResult) => void>();
  private native: NativeRecorder | null = null;
  private tracks: MediaStreamTrack[] = [];
  private chunks: Blob[] = [];
  private cleanups: (() => void)[] = [];
  private limit: ReturnType<typeof setTimeout> | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private session = 0;
  private selectedMime = "";
  private stopPromise: Promise<RecordingResult | null> | null = null;
  private resolveStop: ((result: RecordingResult | null) => void) | null = null;
  private disposed = false;
  constructor(private api: RecorderPlatform = platform) {}
  getState() {
    return this.state;
  }
  subscribe(listener: (state: RecordingState, message: string | null) => void) {
    this.listeners.add(listener);
    listener(this.state, this.message);
    return () => {
      this.listeners.delete(listener);
    };
  }
  subscribeResult(listener: (result: RecordingResult) => void) {
    this.resultListeners.add(listener);
    return () => {
      this.resultListeners.delete(listener);
    };
  }
  private emit(state: RecordingState, message: string | null = null) {
    this.state = state;
    this.message = message;
    this.listeners.forEach((listener) => listener(state, message));
  }
  private listen(target: EventTarget, event: string, callback: EventListener) {
    target.addEventListener(event, callback);
    this.cleanups.push(() => target.removeEventListener(event, callback));
  }
  private release() {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    if (this.limit !== null) clearTimeout(this.limit);
    if (this.watchdog !== null) clearTimeout(this.watchdog);
    this.limit = null;
    this.watchdog = null;
    const recorder = this.native;
    this.native = null;
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch {
        /* Resource cleanup must still run. */
      }
    }
    this.tracks.forEach((track) => track.stop());
    this.tracks = [];
    this.chunks = [];
  }
  async start(
    canvas: HTMLCanvasElement,
    audio: MediaStream,
    startPlayback: () => Promise<void>,
  ): Promise<void> {
    if (this.disposed) throw new Error("Der Recorder ist geschlossen.");
    if (["starting", "recording", "stopping"].includes(this.state))
      throw new Error("Eine Aufnahme läuft bereits.");
    const session = ++this.session;
    this.emit("starting");
    this.stopPromise = null;
    try {
      const format = this.api.formats()[0];
      if (!format || typeof canvas.captureStream !== "function")
        throw new Error(
          "Dieser Browser unterstützt keine Videoaufnahme mit Ton.",
        );
      if (this.api.visibility?.isHidden())
        throw new Error("Die Aufnahme benötigt einen sichtbaren Tab.");
      this.selectedMime = format.mimeType;
      const video = canvas.captureStream(30);
      this.tracks.push(...video.getTracks());
      if (!video.getVideoTracks().length)
        throw new Error("Das Bild konnte nicht aufgenommen werden.");
      for (const track of audio.getAudioTracks()) {
        if (track.readyState === "live") this.tracks.push(track.clone());
      }
      if (!this.tracks.some((track) => track.kind === "audio"))
        throw new Error("Die Audioaufnahme ist nicht verfügbar.");
      const native = this.api.createRecorder(
        this.api.makeStream(this.tracks),
        format.mimeType,
      );
      this.native = native;
      this.listen(native, "dataavailable", (event) => {
        const data = (event as BlobEvent).data;
        if (data?.size) this.chunks.push(data);
      });
      this.listen(native, "error", () =>
        this.abort(
          "Die Aufnahme wurde durch einen Recorderfehler unterbrochen.",
        ),
      );
      this.listen(native, "stop", () => this.complete());
      this.listen(canvas, "webglcontextlost", () =>
        this.abort(
          "Die Aufnahme wurde durch einen Verlust der Grafik unterbrochen.",
        ),
      );
      for (const track of this.tracks)
        this.listen(track, "ended", () =>
          this.abort(
            "Die Aufnahme wurde durch einen beendeten Medientrack unterbrochen.",
          ),
        );
      if (this.api.visibility)
        this.listen(this.api.visibility.target, "visibilitychange", () => {
          if (this.api.visibility!.isHidden())
            this.abort(
              "Die Aufnahme wurde unterbrochen, weil der Tab im Hintergrund ist.",
            );
        });
      await startPlayback();
      if (session !== this.session || this.state !== "starting") return;
      native.start(250);
      if (session !== this.session || this.state !== "starting") return;
      this.emit("recording");
      this.limit = setTimeout(
        () => void this.stop("Die maximale Dauer von 5 Minuten ist erreicht."),
        300_000,
      );
    } catch (error) {
      if (session === this.session) {
        this.release();
        this.emit(
          "error",
          error instanceof Error
            ? error.message
            : "Die Aufnahme konnte nicht gestartet werden.",
        );
        throw error;
      }
    }
  }
  stop(message: string | null = null): Promise<RecordingResult | null> {
    if (this.state === "stopping" && this.stopPromise) return this.stopPromise;
    if (this.state === "starting") {
      this.abort("Die Aufnahme wurde vor dem Start abgebrochen.");
      return Promise.resolve(null);
    }
    if (this.state !== "recording" || !this.native)
      return Promise.resolve(null);
    this.stopPromise = new Promise((resolve) => {
      this.resolveStop = resolve;
    });
    const promise = this.stopPromise;
    this.emit("stopping", message);
    this.watchdog = setTimeout(
      () =>
        this.abort(
          "Der Recorder hat nicht geantwortet. Die Aufnahme wurde verworfen.",
        ),
      10_000,
    );
    try {
      this.native.stop();
    } catch {
      this.abort("Die Aufnahme konnte nicht abgeschlossen werden.");
    }
    return promise;
  }
  private complete() {
    if (this.state !== "stopping") {
      this.abort("Die Aufnahme wurde unerwartet beendet.");
      return;
    }
    const mimeType =
        this.native?.mimeType || this.chunks[0]?.type || this.selectedMime,
      extension = extensionForMime(mimeType);
    const blob = new Blob(this.chunks, { type: mimeType });
    if (!extension || !blob.size) {
      this.abort("Die Aufnahme enthält keine nutzbaren Mediendaten.");
      return;
    }
    const resolve = this.resolveStop;
    this.resolveStop = null;
    this.release();
    this.emit("idle", this.message);
    const result = { blob, mimeType, extension };
    resolve?.(result);
    this.resultListeners.forEach((listener) => listener(result));
  }
  abort(reason: string): void {
    if (!["starting", "recording", "stopping"].includes(this.state)) return;
    this.session++;
    const resolve = this.resolveStop;
    this.resolveStop = null;
    this.release();
    this.emit("error", reason);
    resolve?.(null);
  }
  dispose() {
    if (this.disposed) return;
    this.abort("Die Aufnahme wurde geschlossen.");
    this.disposed = true;
    this.release();
    this.listeners.clear();
    this.resultListeners.clear();
  }
}
