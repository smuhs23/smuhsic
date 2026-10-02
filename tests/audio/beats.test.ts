import { it, expect } from "vitest";
import { FeatureExtractor } from "../../src/audio/FeatureExtractor";
import { defaultSettings } from "../../src/presets/defaults";
import { signalFrame, kick } from "../helpers/audioSignals";
it("does not hallucinate automatic beats during silence", () => {
  const analyser = new FeatureExtractor(44100, 2048),
    settings = defaultSettings("ink");
  for (let t = 0; t < 10; t += 1 / 60) {
    const f = analyser.update(
      t,
      new Float32Array(1024).fill(-Infinity),
      new Float32Array(2048),
      settings,
    );
    expect(f.onset).toBe(false);
    expect(f.beat).toBe(0);
  }
});
it("finds known 120 BPM kick onsets within 100 ms, with no more than one false positive", () => {
  const analyser = new FeatureExtractor(44100, 2048),
    settings = defaultSettings("ink"),
    found: number[] = [];
  for (let t = 0; t < 10; t += 1 / 60) {
    const f = signalFrame(t, 44100, 2048, kick);
    if (analyser.update(t, f.spectrumDb, f.waveform, settings).onset)
      found.push(t);
  }
  const known = Array.from({ length: 18 }, (_, i) => 1.25 + i * 0.5);
  const hits = known.filter((t) => found.some((f) => Math.abs(f - t) <= 0.1));
  expect(hits.length).toBeGreaterThanOrEqual(Math.ceil(known.length * 0.9));
  expect(
    found.filter((f) => !known.some((t) => Math.abs(f - t) <= 0.1)).length,
  ).toBeLessThanOrEqual(1);
  for (let i = 1; i < found.length; i++)
    expect(found[i] - found[i - 1]).toBeGreaterThanOrEqual(0.18);
});
it("clears retained impulse and history when seeking", () => {
  const analyser = new FeatureExtractor(44100, 2048),
    settings = { ...defaultSettings("ink"), beatMode: "manual" as const };
  analyser.update(0, new Float32Array(1024), new Float32Array(2048), settings);
  expect(
    analyser.update(
      0.5,
      new Float32Array(1024),
      new Float32Array(2048),
      settings,
    ).beat,
  ).toBe(1);
  analyser.reset();
  expect(
    analyser.update(
      8,
      new Float32Array(1024).fill(-Infinity),
      new Float32Array(2048),
      defaultSettings("ink"),
    ).beat,
  ).toBe(0);
});
it.each([40, 120, 240])("generates manual beat boundaries at %s BPM", (bpm) => {
  const analyser = new FeatureExtractor(44100, 2048),
    settings = {
      ...defaultSettings("ink"),
      beatMode: "manual" as const,
      manualBpm: bpm,
    },
    found: number[] = [];
  for (let t = 0; t < 6; t += 1 / 120)
    if (
      analyser.update(
        t,
        new Float32Array(1024).fill(-Infinity),
        new Float32Array(2048),
        settings,
      ).onset
    )
      found.push(t);
  expect(found.length).toBeGreaterThanOrEqual(Math.floor((5.99 * bpm) / 60));
  for (let i = 1; i < found.length; i++)
    expect(Math.abs(found[i] - found[i - 1] - 60 / bpm)).toBeLessThan(0.012);
});
