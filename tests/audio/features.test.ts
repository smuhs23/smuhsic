import { it, expect } from "vitest";
import { FeatureExtractor } from "../../src/audio/FeatureExtractor";
import { defaultSettings } from "../../src/presets/defaults";
import { signalFrame } from "../helpers/audioSignals";
it.each([32000, 44100, 48000])(
  "maps low and high tones to their bands at %s Hz",
  (rate) => {
    for (const [frequency, band] of [
      [100, "bass"],
      [1200, "mid"],
      [7000, "treble"],
    ] as const) {
      const analyser = new FeatureExtractor(rate, 2048);
      let features;
      for (let t = 0; t < 1; t += 1 / 60) {
        const f = signalFrame(
          t,
          rate,
          2048,
          (x) => Math.sin(2 * Math.PI * frequency * x) * 0.7,
        );
        features = analyser.update(
          t,
          f.spectrumDb,
          f.waveform,
          defaultSettings("ink"),
        );
      }
      expect(features![band]).toBeGreaterThan(0.03);
      for (const other of ["bass", "mid", "treble"] as const)
        if (other !== band)
          expect(features![band]).toBeGreaterThan(features![other] * 4);
    }
  },
);
it("bounds all features and tolerates invalid spectral values", () => {
  const analyser = new FeatureExtractor(44100, 2048);
  const f = analyser.update(
    0,
    new Float32Array(1024).fill(NaN),
    new Float32Array(2048),
    defaultSettings("ink"),
  );
  for (const key of ["rms", "bass", "mid", "treble", "beat"] as const) {
    expect(Number.isFinite(f[key])).toBe(true);
    expect(f[key]).toBeGreaterThanOrEqual(0);
    expect(f[key]).toBeLessThanOrEqual(1);
  }
});
