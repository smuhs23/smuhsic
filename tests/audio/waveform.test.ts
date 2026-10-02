import { it, expect } from "vitest";
import { buildWaveform } from "../../src/audio/waveform";
it("does not read or decode large media files", async () => {
  const large = {
    size: 32 * 1024 * 1024 + 1,
    arrayBuffer: () => {
      throw new Error("must not read");
    },
  } as unknown as File;
  expect(
    await buildWaveform(
      large,
      {} as BaseAudioContext,
      new AbortController().signal,
    ),
  ).toBe(null);
});
it("keeps native playback possible when decode fails", async () => {
  const context = {
    decodeAudioData: async () => {
      throw new Error("codec");
    },
  } as unknown as BaseAudioContext;
  expect(
    await buildWaveform(
      new File(["x"], "track.mov"),
      context,
      new AbortController().signal,
    ),
  ).toBe(null);
});
it("returns stable peaks for silence and preserves impulses from either channel", async () => {
  const l = new Float32Array(512),
    r = new Float32Array(512);
  r[127] = -0.8;
  const context = {
    decodeAudioData: async () => ({
      length: 512,
      numberOfChannels: 2,
      getChannelData: (i: number) => (i === 0 ? l : r),
    }),
  } as unknown as BaseAudioContext;
  const out = await buildWaveform(
    new File(["x"], "track.wav"),
    context,
    new AbortController().signal,
  );
  expect(out?.length).toBe(256);
  expect(Math.max(...out!)).toBeCloseTo(0.8);
  expect(out![0]).toBe(0);
});
it("discards a result when the source was cancelled during decode", async () => {
  const abort = new AbortController();
  const context = {
    decodeAudioData: async () => {
      abort.abort();
      return {
        length: 1,
        numberOfChannels: 1,
        getChannelData: () => new Float32Array([1]),
      };
    },
  } as unknown as BaseAudioContext;
  expect(
    await buildWaveform(new File(["x"], "a.wav"), context, abort.signal),
  ).toBe(null);
});
