import { describe, it, expect } from "vitest";
import { defaultSettings, applyMood } from "../../src/presets/defaults";
import { parsePreset } from "../../src/presets/validation";
const settings = {
  mode: "ink",
  mood: null,
  aspect: "9:16",
  quality: "auto",
  seed: 2317,
  background: "#ffffff",
  colors: ["#151515", "#555555", "#999999"],
  monochrome: true,
  colorMix: 0.5,
  scale: 1,
  density: 0.65,
  symmetry: 1,
  complexity: 4,
  rotation: 0,
  speed: 0.55,
  turbulence: 0.8,
  trails: 0.85,
  softness: 0.5,
  sensitivity: 1,
  beatStrength: 1,
  smoothing: 0.5,
  bassWeight: 1,
  midWeight: 1,
  trebleWeight: 1,
  beatMode: "auto",
  manualBpm: 120,
};
const preset = {
  schemaVersion: 1,
  id: "my-preset",
  name: "Mein Look",
  settings,
};
describe("visual settings at the import boundary", () => {
  it("starts ink as monochrome dark threads on white", () => {
    expect(defaultSettings("ink")).toMatchObject({
      background: "#ffffff",
      monochrome: true,
      mode: "ink",
      aspect: "9:16",
    });
    expect(defaultSettings("ink").colors[0]).not.toBe("#ffffff");
  });
  it("applies every mood without losing the chosen mode, seed, or output", () => {
    const original = {
      ...defaultSettings("tunnel"),
      seed: 42,
      aspect: "4:5" as const,
      quality: "high" as const,
    };
    for (const mood of [
      "calm",
      "euphoric",
      "dark",
      "dreamy",
      "intense",
    ] as const) {
      const next = applyMood(original, mood);
      expect(next).toMatchObject({
        mode: "tunnel",
        seed: 42,
        aspect: "4:5",
        quality: "high",
        mood,
      });
      expect(next.colors).not.toBe(original.colors);
      expect(original.mood).toBe(null);
    }
  });
  it("accepts a complete preset and drops unrelated fields", () => {
    const result = parsePreset(
      JSON.stringify({
        ...preset,
        mediaUrl: "blob:private",
        settings: { ...settings, upload: "secret" },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(preset);
      expect("mediaUrl" in result.value).toBe(false);
    }
  });
  it.each([
    { schemaVersion: 2 },
    { settings: { ...settings, symmetry: 1.5 } },
    { settings: { ...settings, background: "javascript:alert(1)" } },
    { settings: { ...settings, colors: ["#000000"] } },
    { settings: { ...settings, seed: -1 } },
    { settings: { ...settings, seed: 4294967296 } },
    { settings: { ...settings, scale: Infinity } },
    { settings: { ...settings, mode: "missing" } },
    { settings: { ...settings, manualBpm: 241 } },
    { settings: { ...settings, density: 2 } },
    { settings: { ...settings, mood: "diagnosis" } },
    { settings: { ...settings, monochrome: "true" } },
    { settings: {} },
    { name: "" },
    { name: "x".repeat(81) },
  ])("rejects invalid preset %j", (patch) => {
    expect(parsePreset(JSON.stringify({ ...preset, ...patch })).ok).toBe(false);
  });
  it("handles broken JSON and non-object inputs without throwing", () => {
    for (const text of ["{", "null", "[]", "123", '"look"'])
      expect(parsePreset(text).ok).toBe(false);
  });
});
