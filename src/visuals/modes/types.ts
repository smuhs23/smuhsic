import type { Scene } from "three";
import type { VisualFrame } from "../types";
import type { VisualSettings } from "../../presets/types";
export interface VisualModeInstance {
  readonly scene: Scene;
  update(frame: VisualFrame, settings: VisualSettings): void;
  reset(): void;
  dispose(): void;
}
