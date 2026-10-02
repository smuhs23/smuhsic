import type { AudioFeatures } from "./types";
import type { VisualSettings } from "../presets/types";
const clamp = (x: number) =>
  Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

export class FeatureExtractor {
  private previous = new Float32Array(0);
  private fluxHistory: number[] = [];
  private priorFlux = 0;
  private priorRms = 0;
  private lastTime: number | null = null;
  private startedAt: number | null = null;
  private lastBeat = -Infinity;
  private manualIndex: number | null = null;
  private lastMode = "auto";
  private bands = [0, 0, 0];
  constructor(
    private readonly sampleRate: number,
    private readonly fftSize: number,
  ) {}
  reset(): void {
    this.previous.fill(0);
    this.fluxHistory = [];
    this.priorFlux = 0;
    this.priorRms = 0;
    this.lastTime = null;
    this.startedAt = null;
    this.lastBeat = -Infinity;
    this.manualIndex = null;
    this.bands = [0, 0, 0];
  }
  update(
    time: number,
    spectrumDb: Float32Array,
    waveform: Float32Array,
    settings: VisualSettings,
  ): AudioFeatures {
    if (this.lastTime !== null && time < this.lastTime - 0.05) this.reset();
    const dt =
      this.lastTime === null
        ? 1 / 60
        : Math.max(0, Math.min(0.1, time - this.lastTime));
    if (this.startedAt === null) this.startedAt = time;
    if (this.previous.length !== spectrumDb.length)
      this.previous = new Float32Array(spectrumDb.length);
    const power = [0, 0, 0],
      count = [0, 0, 0];
    let flux = 0,
      sum = 0;
    for (let i = 0; i < waveform.length; i++)
      if (Number.isFinite(waveform[i])) sum += waveform[i] * waveform[i];
    const rms = clamp(Math.sqrt(sum / Math.max(1, waveform.length)));
    for (let i = 0; i < spectrumDb.length; i++) {
      const hz = (i * this.sampleRate) / this.fftSize;
      const linear = Number.isFinite(spectrumDb[i])
        ? Math.min(1, Math.pow(10, spectrumDb[i] / 20))
        : 0;
      if (hz >= 20 && hz <= Math.min(16000, this.sampleRate / 2)) {
        const band = hz < 250 ? 0 : hz < 4000 ? 1 : 2;
        power[band] += linear * linear;
        count[band]++;
        flux += Math.max(0, linear - this.previous[i]);
      }
      this.previous[i] = linear;
    }
    flux /= Math.sqrt(Math.max(1, spectrumDb.length));
    const center = median(this.fluxHistory);
    const deviation = median(this.fluxHistory.map((x) => Math.abs(x - center)));
    const threshold = (center + 3 * deviation + 0.0025) / settings.sensitivity;
    let onset = false;
    if (settings.beatMode !== this.lastMode) {
      this.manualIndex = null;
      this.lastBeat = -Infinity;
    }
    if (settings.beatMode === "manual") {
      const index = Math.floor(((time + 1e-6) * settings.manualBpm) / 60);
      onset = this.manualIndex !== null && index > this.manualIndex;
      this.manualIndex = index;
    } else {
      onset =
        time - this.startedAt >= 1 &&
        this.priorRms >= 0.001 &&
        this.priorFlux > threshold &&
        this.priorFlux > flux &&
        time - this.lastBeat >= 0.18;
    }
    if (onset) this.lastBeat = time;
    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > 64) this.fluxHistory.shift();
    this.priorFlux = flux;
    this.priorRms = rms;
    this.lastTime = time;
    this.lastMode = settings.beatMode;
    for (let i = 0; i < 3; i++) {
      const target = clamp(Math.sqrt(power[i] / Math.max(1, count[i])) * 5);
      const tau =
        target > this.bands[i]
          ? 0.012 + 0.04 * settings.smoothing
          : 0.04 + 0.5 * settings.smoothing;
      this.bands[i] += (target - this.bands[i]) * (1 - Math.exp(-dt / tau));
    }
    return {
      time,
      rms,
      bass: clamp(this.bands[0]),
      mid: clamp(this.bands[1]),
      treble: clamp(this.bands[2]),
      onset,
      beat: clamp(Math.exp(-(time - this.lastBeat) / 0.18)),
      beatMode: settings.beatMode,
    };
  }
}
