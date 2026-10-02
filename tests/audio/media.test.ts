import { it, expect } from "vitest";
import { MediaController } from "../../src/audio/MediaController";
import { mediaPlatform } from "../helpers/mediaPlatform";
const file = (name: string) =>
  new File(["audio bytes"], name, { type: "audio/wav" });
it("newer load wins even when an older metadata event arrives last", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform);
  const a = m.load(file("a.wav")),
    b = m.load(file("b.wav"));
  p.elements[1].ready(5);
  await b;
  p.elements[0].ready(99);
  await a;
  expect(m.getState()).toMatchObject({
    name: "b.wav",
    duration: 5,
    status: "ready",
  });
  expect(p.revoked).toContain("blob:1");
  m.dispose();
});
it("releases source resources on replacement and final dispose", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform);
  const a = m.load(file("a.wav"));
  p.elements[0].ready();
  await a;
  await m.play();
  const b = m.load(file("b.wav"));
  p.elements[1].ready();
  await b;
  expect(p.elements[0].paused).toBe(true);
  expect(p.elements[0].removed).toBe(true);
  m.dispose();
  expect(p.revoked).toEqual(["blob:1", "blob:2"]);
});
it("cancel ignores metadata that arrives after cancellation", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform),
    load = m.load(file("a.wav"));
  m.cancelLoad();
  p.elements[0].ready();
  await load;
  expect(m.getState().status).toBe("empty");
  expect(m.getState().duration).toBe(0);
  m.dispose();
});
it("preview volume leaves the analyser signal unchanged", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform),
    load = m.load(file("a.wav"));
  p.elements[0].ready();
  await load;
  await m.play();
  const full = m.readAnalysis()!.waveform[0];
  m.setVolume(0);
  expect(m.getState().volume).toBe(0);
  expect(m.readAnalysis()!.waveform[0]).toBe(full);
  expect(full).toBeGreaterThan(0);
  m.dispose();
});
it("reports a rejected playback start without claiming the source plays", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform),
    load = m.load(file("a.wav"));
  p.elements[0].ready();
  await load;
  p.elements[0].rejectPlay = true;
  await expect(m.play()).rejects.toThrow();
  expect(m.getState().status).not.toBe("playing");
  expect(m.getState().error).toBeTruthy();
  m.dispose();
});
it("natural completion emits ready without a false playback interruption", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform);
  const load = m.load(file("a.wav"));
  p.elements[0].ready();
  await load;
  await m.play();
  const statuses: string[] = [];
  const unsubscribe = m.subscribe((state) => statuses.push(state.status));
  statuses.length = 0;
  p.elements[0].currentTime = 10;
  p.elements[0].ended = true;
  p.elements[0].pause();
  p.elements[0].dispatchEvent(new Event("ended"));
  expect(statuses).toEqual(["ready"]);
  expect(m.getState().currentTime).toBe(10);
  unsubscribe();
  m.dispose();
});
it("pause cancels playback that is still waiting for audio resume", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform);
  const load = m.load(file("a.wav"));
  p.elements[0].ready();
  await load;
  let resume!: () => void;
  p.context.resume = () =>
    new Promise<void>((resolve) => {
      resume = resolve;
    });
  const playback = m.play();
  m.pause();
  resume();
  await expect(playback).rejects.toMatchObject({ name: "AbortError" });
  expect(p.elements[0].paused).toBe(true);
  expect(m.getState().status).not.toBe("playing");
  expect(m.getState().error).toBeNull();
  m.dispose();
});
it("late play resolution cannot overwrite a subsequent pause", async () => {
  const p = mediaPlatform(),
    m = new MediaController(p.platform);
  const load = m.load(file("a.wav"));
  p.elements[0].ready();
  await load;
  let finish!: () => void;
  const nativePlay = p.elements[0].play.bind(p.elements[0]);
  p.elements[0].play = async () => {
    await nativePlay();
    await new Promise<void>((resolve) => {
      finish = resolve;
    });
  };
  const playback = m.play();
  await Promise.resolve();
  await Promise.resolve();
  m.pause();
  finish();
  await expect(playback).rejects.toMatchObject({ name: "AbortError" });
  expect(p.elements[0].paused).toBe(true);
  expect(m.getState().status).not.toBe("playing");
  expect(m.getState().error).toBeNull();
  m.dispose();
});
it.each([0, NaN, Infinity])(
  "disables seeking when duration is %s",
  async (duration) => {
    const p = mediaPlatform(),
      m = new MediaController(p.platform),
      load = m.load(file("a.wav"));
    p.elements[0].ready(duration);
    await load;
    m.seek(100);
    expect(m.getState().duration).toBe(0);
    expect(p.elements[0].currentTime).toBe(0);
    m.dispose();
  },
);
