import type { AudioFeatures } from "../audio/types";
export interface VisualFrame {
  time: number;
  delta: number;
  playing: boolean;
  features: AudioFeatures;
  detail?: number;
}
export interface EngineEvent {
  type: "context-lost" | "restored" | "error";
  message?: string;
}
