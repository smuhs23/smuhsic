import { it, expect } from "vitest";
import { outputSize, AdaptiveQuality } from "../../src/visuals/quality";
it.each([
  ["9:16", 720, 1280],
  ["16:9", 1280, 720],
  ["1:1", 720, 720],
  ["4:5", 720, 900],
] as const)("preserves %s export geometry", (aspect, width, height) => {
  expect(outputSize(aspect, "standard")).toEqual({ width, height });
  expect(outputSize(aspect, "auto")).toEqual({ width, height });
  expect(outputSize(aspect, "high")).toEqual({
    width: width * 1.5,
    height: height * 1.5,
  });
});
it("reduces sustained slow rendering, bounds quality, and recovers when rendering is fast", () => {
  const q = new AdaptiveQuality();
  for (let i = 0; i < 80; i++) q.sample(0.05);
  expect(q.scale).toBeLessThan(1);
  for (let i = 0; i < 1000; i++) q.sample(0.05);
  expect(q.scale).toBeGreaterThanOrEqual(0.5);
  for (let i = 0; i < 4000; i++) q.sample(1 / 60);
  expect(q.scale).toBe(1);
});
