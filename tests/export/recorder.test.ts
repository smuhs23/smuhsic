import { it, expect, vi, afterEach } from "vitest";
import { Recorder } from "../../src/export/Recorder";
import type {
  RecorderPlatform,
  NativeRecorder,
} from "../../src/export/Recorder";
class Track extends EventTarget {
  readyState = "live";
  stop = vi.fn(() => {
    this.readyState = "ended";
  });
  constructor(readonly kind: "audio" | "video") {
    super();
  }
  clone() {
    return new Track(this.kind);
  }
}
class Stream {
  constructor(readonly tracks: Track[]) {}
  getTracks() {
    return this.tracks;
  }
  getAudioTracks() {
    return this.tracks.filter((t) => t.kind === "audio");
  }
  getVideoTracks() {
    return this.tracks.filter((t) => t.kind === "video");
  }
}
class Native extends EventTarget implements NativeRecorder {
  state: "inactive" | "recording" | "paused" = "inactive";
  mimeType = "video/webm;codecs=vp9,opus";
  start = vi.fn(() => {
    this.state = "recording";
  });
  stop = vi.fn(() => {
    this.state = "inactive";
    this.dispatchEvent(
      Object.assign(new Event("dataavailable"), {
        data: new Blob(["audio+video"], { type: this.mimeType }),
      }),
    );
    this.dispatchEvent(new Event("stop"));
  });
}
function setup(formats = true) {
  const native = new Native(),
    audio = new Track("audio"),
    video = new Track("video"),
    visibility = new EventTarget();
  let hidden = false;
  let combined: Stream | null = null;
  const canvas = Object.assign(new EventTarget(), {
    captureStream: vi.fn(() => new Stream([video])),
  });
  const platform: RecorderPlatform = {
    createRecorder: (stream) => {
      combined = stream as unknown as Stream;
      return native;
    },
    makeStream: (tracks) =>
      new Stream(tracks as unknown as Track[]) as unknown as MediaStream,
    formats: () =>
      formats
        ? [{ mimeType: "video/webm;codecs=vp9,opus", extension: "webm" }]
        : [],
    visibility: { target: visibility, isHidden: () => hidden },
  };
  const recorder = new Recorder(platform);
  return {
    recorder,
    native,
    audio,
    video,
    canvas: canvas as unknown as HTMLCanvasElement,
    source: new Stream([audio]) as unknown as MediaStream,
    combined: () => combined!,
    hide: () => {
      hidden = true;
      visibility.dispatchEvent(new Event("visibilitychange"));
    },
  };
}
afterEach(() => vi.useRealTimers());
it("combines video with cloned audio and stops only owned tracks", async () => {
  const s = setup();
  await s.recorder.start(s.canvas, s.source, async () => {});
  expect(s.recorder.getState()).toBe("recording");
  expect(s.canvas.captureStream).toHaveBeenCalledWith(30);
  expect(s.combined().getAudioTracks()[0]).not.toBe(s.audio);
  expect(s.combined().getVideoTracks()).toEqual([s.video]);
  const result = await s.recorder.stop();
  expect(result?.blob.size).toBeGreaterThan(0);
  expect(result?.extension).toBe("webm");
  expect(s.audio.stop).not.toHaveBeenCalled();
  expect(s.video.stop).toHaveBeenCalledTimes(1);
  expect(s.combined().getAudioTracks()[0].stop).toHaveBeenCalledTimes(1);
  expect(s.recorder.getState()).toBe("idle");
  s.recorder.dispose();
});
it("playback rejection never starts native recording and closes tracks", async () => {
  const s = setup();
  await expect(
    s.recorder.start(s.canvas, s.source, async () => {
      throw new Error("blocked");
    }),
  ).rejects.toThrow();
  expect(s.native.start).not.toHaveBeenCalled();
  expect(s.recorder.getState()).toBe("error");
  expect(s.video.stop).toHaveBeenCalled();
  expect(s.combined().getAudioTracks()[0].stop).toHaveBeenCalled();
  expect(s.audio.stop).not.toHaveBeenCalled();
  s.recorder.dispose();
});
it("unsupported recording never captures or starts playback", async () => {
  const s = setup(false),
    play = vi.fn(async () => {});
  await expect(s.recorder.start(s.canvas, s.source, play)).rejects.toThrow();
  expect(s.canvas.captureStream).not.toHaveBeenCalled();
  expect(play).not.toHaveBeenCalled();
  s.recorder.dispose();
});
it("uses actual MP4 mime type and extension instead of the requested WebM", async () => {
  const s = setup();
  s.native.mimeType = "video/mp4";
  await s.recorder.start(s.canvas, s.source, async () => {});
  const result = await s.recorder.stop();
  expect(result?.extension).toBe("mp4");
  expect(result?.blob.type).toBe("video/mp4");
  s.recorder.dispose();
});
it.each(["abort", "error", "hidden", "context", "track"] as const)(
  "closes resources and discards output on %s",
  async (reason) => {
    vi.useFakeTimers();
    const s = setup();
    await s.recorder.start(s.canvas, s.source, async () => {});
    if (reason === "abort") s.recorder.abort("abgebrochen");
    if (reason === "error") s.native.dispatchEvent(new Event("error"));
    if (reason === "hidden") s.hide();
    if (reason === "context")
      s.canvas.dispatchEvent(new Event("webglcontextlost"));
    if (reason === "track") s.video.dispatchEvent(new Event("ended"));
    expect(s.recorder.getState()).toBe("error");
    expect(await s.recorder.stop()).toBeNull();
    expect(s.video.stop).toHaveBeenCalled();
    expect(s.combined().getAudioTracks()[0].stop).toHaveBeenCalled();
    expect(s.audio.stop).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
    s.recorder.dispose();
  },
);
it("finalizes the captured segment exactly once at the five-minute limit", async () => {
  vi.useFakeTimers();
  const s = setup(),
    results = vi.fn();
  s.recorder.subscribeResult(results);
  await s.recorder.start(s.canvas, s.source, async () => {});
  vi.advanceTimersByTime(300_000);
  expect(s.recorder.getState()).toBe("idle");
  expect(results).toHaveBeenCalledTimes(1);
  expect(results.mock.calls[0][0].blob.size).toBeGreaterThan(0);
  expect(results.mock.calls[0][0].extension).toBe("webm");
  expect(s.native.stop).toHaveBeenCalledTimes(1);
  expect(s.video.stop).toHaveBeenCalledTimes(1);
  expect(s.combined().getAudioTracks()[0].stop).toHaveBeenCalledTimes(1);
  expect(s.audio.stop).not.toHaveBeenCalled();
  expect(await s.recorder.stop()).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
  s.recorder.dispose();
});
it("an aborted pending start cannot start recording after playback finally resolves", async () => {
  const s = setup();
  let ready!: () => void;
  const start = s.recorder.start(
    s.canvas,
    s.source,
    () =>
      new Promise((resolve) => {
        ready = resolve;
      }),
  );
  expect(s.recorder.getState()).toBe("starting");
  s.recorder.abort("abgebrochen");
  ready();
  await start;
  expect(s.native.start).not.toHaveBeenCalled();
  expect(s.recorder.getState()).toBe("error");
  s.recorder.dispose();
});
it("shares a pending stop and times out cleanly if native stop never completes", async () => {
  vi.useFakeTimers();
  const s = setup();
  s.native.stop = vi.fn(() => {
    s.native.state = "inactive";
  });
  await s.recorder.start(s.canvas, s.source, async () => {});
  const first = s.recorder.stop(),
    second = s.recorder.stop();
  expect(first).toBe(second);
  vi.advanceTimersByTime(10_000);
  expect(await first).toBeNull();
  expect(s.recorder.getState()).toBe("error");
  expect(s.audio.stop).not.toHaveBeenCalled();
  expect(s.video.stop).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  s.recorder.dispose();
});
