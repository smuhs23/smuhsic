import type { BeatMode } from "../presets/types";
export interface AudioFeatures {
  time: number;
  rms: number;
  bass: number;
  mid: number;
  treble: number;
  onset: boolean;
  beat: number;
  beatMode: BeatMode;
}
export const silentFeatures = (time = 0): AudioFeatures => ({
  time,
  rms: 0,
  bass: 0,
  mid: 0,
  treble: 0,
  onset: false,
  beat: 0,
  beatMode: "auto",
});
