import type { Aspect, Quality } from "../presets/types";
export function outputSize(aspect: Aspect, quality: Quality) {
  const short = quality === "high" ? 1080 : 720;
  const [w, h] = aspect.split(":").map(Number);
  const factor = short / Math.min(w, h);
  return { width: Math.round(w * factor), height: Math.round(h * factor) };
}
export class AdaptiveQuality {
  scale = 1;
  private slow = 0;
  private fast = 0;
  sample(delta: number): boolean {
    if (!Number.isFinite(delta) || delta <= 0 || delta > 0.2) return false;
    this.slow = delta > 1 / 28 ? this.slow + delta : 0;
    this.fast = delta < 1 / 55 ? this.fast + delta : 0;
    const old = this.scale;
    if (this.slow >= 2) {
      this.scale = Math.max(0.5, this.scale - 0.15);
      this.slow = 0;
    }
    if (this.fast >= 4) {
      this.scale = Math.min(1, this.scale + 0.1);
      this.fast = 0;
    }
    return this.scale !== old;
  }
  reset() {
    this.scale = 1;
    this.slow = 0;
    this.fast = 0;
  }
}
