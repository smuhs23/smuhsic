export const MODES = ["ink", "bloom", "mandala", "tunnel", "ribbons"] as const;
export const MOODS = ["calm", "euphoric", "dark", "dreamy", "intense"] as const;
export const ASPECTS = ["9:16", "16:9", "1:1", "4:5"] as const;
export type VisualMode = (typeof MODES)[number];
export type Mood = (typeof MOODS)[number];
export type Aspect = (typeof ASPECTS)[number];
export type Quality = "auto" | "standard" | "high";
export type BeatMode = "auto" | "manual";
export interface VisualSettings {
  mode: VisualMode;
  mood: Mood | null;
  aspect: Aspect;
  quality: Quality;
  seed: number;
  background: string;
  colors: [string, string, string];
  monochrome: boolean;
  colorMix: number;
  scale: number;
  density: number;
  symmetry: number;
  complexity: number;
  rotation: number;
  speed: number;
  turbulence: number;
  trails: number;
  softness: number;
  sensitivity: number;
  beatStrength: number;
  smoothing: number;
  bassWeight: number;
  midWeight: number;
  trebleWeight: number;
  beatMode: BeatMode;
  manualBpm: number;
}
export interface Preset {
  schemaVersion: 1;
  id: string;
  name: string;
  settings: VisualSettings;
}
export type NumericSetting = {
  [K in keyof VisualSettings]: VisualSettings[K] extends number ? K : never;
}[keyof VisualSettings];
export const RANGES: Record<NumericSetting, readonly [number, number, number]> =
  {
    seed: [0, 4294967295, 1],
    colorMix: [0, 1, 0.01],
    scale: [0.25, 2.5, 0.01],
    density: [0, 1, 0.01],
    symmetry: [1, 16, 1],
    complexity: [1, 8, 1],
    rotation: [0, 360, 1],
    speed: [0, 2, 0.01],
    turbulence: [0, 2, 0.01],
    trails: [0, 0.96, 0.01],
    softness: [0, 1, 0.01],
    sensitivity: [0.25, 3, 0.01],
    beatStrength: [0, 2, 0.01],
    smoothing: [0, 1, 0.01],
    bassWeight: [0, 2, 0.01],
    midWeight: [0, 2, 0.01],
    trebleWeight: [0, 2, 0.01],
    manualBpm: [40, 240, 1],
  };
export const MODE_NAMES: Record<VisualMode, string> = {
  ink: "Ink Flow",
  bloom: "Liquid Bloom",
  mandala: "Mandala",
  tunnel: "Tunnel",
  ribbons: "Spectral Ribbons",
};
export const MOOD_NAMES: Record<Mood, string> = {
  calm: "Ruhig",
  euphoric: "Euphorisch",
  dark: "Düster",
  dreamy: "Verträumt",
  intense: "Intensiv",
};
