import type { Mood, VisualMode, VisualSettings } from "./types";

export function defaultSettings(mode: VisualMode = "ink"): VisualSettings {
  const ink = mode === "ink";
  return {
    mode,
    mood: null,
    aspect: "9:16",
    quality: "auto",
    seed: 2317,
    background: ink ? "#ffffff" : "#101313",
    colors: ink
      ? ["#141817", "#56615d", "#a4aea9"]
      : ["#b8f284", "#75d7ba", "#a499ed"],
    monochrome: ink,
    colorMix: 0.5,
    scale: 1,
    density: 0.65,
    symmetry: mode === "mandala" ? 8 : 1,
    complexity: 4,
    rotation: 0,
    speed: 0.55,
    turbulence: 0.8,
    trails: 0.84,
    softness: 0.45,
    sensitivity: 1,
    beatStrength: 1,
    smoothing: 0.5,
    bassWeight: 1,
    midWeight: 0.8,
    trebleWeight: 0.7,
    beatMode: "auto",
    manualBpm: 120,
  };
}
const MOOD_VALUES: Record<Mood, Partial<VisualSettings>> = {
  calm: {
    background: "#eeeee7",
    colors: ["#64746c", "#a6b8a4", "#b3b6ce"],
    monochrome: false,
    speed: 0.23,
    turbulence: 0.35,
    trails: 0.9,
    softness: 0.8,
    beatStrength: 0.45,
    smoothing: 0.8,
    density: 0.48,
  },
  euphoric: {
    background: "#111425",
    colors: ["#ceff73", "#fe80c0", "#72deee"],
    monochrome: false,
    speed: 0.85,
    turbulence: 1.1,
    trails: 0.75,
    softness: 0.35,
    beatStrength: 1.6,
    smoothing: 0.35,
    density: 0.75,
  },
  dark: {
    background: "#090c10",
    colors: ["#a96cce", "#395f75", "#ac4b56"],
    monochrome: false,
    speed: 0.4,
    turbulence: 1.2,
    trails: 0.88,
    softness: 0.5,
    beatStrength: 1.25,
    smoothing: 0.6,
    density: 0.82,
  },
  dreamy: {
    background: "#eee6ed",
    colors: ["#9b80d1", "#dc9aba", "#81bfbf"],
    monochrome: false,
    speed: 0.32,
    turbulence: 0.55,
    trails: 0.91,
    softness: 0.9,
    beatStrength: 0.7,
    smoothing: 0.75,
    density: 0.55,
  },
  intense: {
    background: "#101310",
    colors: ["#f4ff84", "#ff704d", "#b79eff"],
    monochrome: false,
    speed: 1.1,
    turbulence: 1.65,
    trails: 0.7,
    softness: 0.2,
    beatStrength: 1.8,
    smoothing: 0.2,
    density: 0.9,
  },
};
export function applyMood(
  settings: VisualSettings,
  mood: Mood,
): VisualSettings {
  const next = { ...settings, ...MOOD_VALUES[mood], mood };
  return { ...next, colors: [...next.colors] };
}
