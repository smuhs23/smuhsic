import type { WebGLRenderer } from "three";
import type { VisualMode } from "../../presets/types";
import type { VisualModeInstance } from "./types";
import { InkFlow } from "./InkFlow";
import { LiquidBloom } from "./LiquidBloom";
import { Mandala } from "./Mandala";
import { Tunnel } from "./Tunnel";
import { SpectralRibbons } from "./SpectralRibbons";
export function createMode(
  mode: VisualMode,
  _renderer: WebGLRenderer,
): VisualModeInstance {
  switch (mode) {
    case "ink":
      return new InkFlow();
    case "bloom":
      return new LiquidBloom();
    case "mandala":
      return new Mandala();
    case "tunnel":
      return new Tunnel();
    case "ribbons":
      return new SpectralRibbons();
  }
}
