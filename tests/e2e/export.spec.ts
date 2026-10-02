import { test, expect } from "@playwright/test";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
async function recordingSupported(page: import("@playwright/test").Page) {
  return page.evaluate(
    () =>
      typeof MediaRecorder !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function",
  );
}
test("natural source completion downloads exactly one playable audio/video clip", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  test.skip(!(await recordingSupported(page)), "Native Aufnahme fehlt");
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/beat.wav");
  await expect(
    page.getByRole("button", { name: "Video aufnehmen", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Trackposition").fill("6.5");
  const names: string[] = [];
  page.on("download", (d) => names.push(d.suggestedFilename()));
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Video aufnehmen", exact: true })
    .click();
  const download = await downloadPromise;
  const output = testInfo.outputPath("natural-end.webm");
  await download.saveAs(output);
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-of",
    "json",
    output,
  ]);
  expect(
    JSON.parse(stdout)
      .streams.map((s: { codec_type: string }) => s.codec_type)
      .sort(),
  ).toEqual(["audio", "video"]);
  await expect(
    page.getByText("Video ist bereit.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.waitForTimeout(300);
  expect(names).toHaveLength(1);
});
test("cancelling recording preparation prevents delayed audio playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = AudioContext.prototype.resume;
    AudioContext.prototype.resume = function () {
      return new Promise<void>((resolve, reject) => {
        Object.assign(window, {
          releaseAudio: () => original.call(this).then(resolve, reject),
        });
      });
    };
  });
  await page.goto("/");
  test.skip(!(await recordingSupported(page)), "Native Aufnahme fehlt");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await page
    .getByRole("button", { name: "Video aufnehmen", exact: true })
    .click();
  await expect(
    page.getByText("Bild und Ton werden vorbereitet …", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Aufnahme abbrechen", exact: true })
    .click();
  await page.evaluate(() =>
    (window as unknown as { releaseAudio: () => Promise<void> }).releaseAudio(),
  );
  await page.waitForTimeout(400);
  const audio = await page
    .locator("audio,video")
    .evaluate((element: HTMLMediaElement) => ({
      paused: element.paused,
      time: element.currentTime,
    }));
  expect(audio.paused).toBe(true);
  expect(audio.time).toBe(0);
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("abgebrochen");
});
test("automatic duration-limit completion preserves and downloads the native capture", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const timer = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      timeout?: number,
      ...args: unknown[]
    ) =>
      timer(
        handler,
        timeout === 300_000 ? 1200 : timeout,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page.goto("/");
  test.skip(!(await recordingSupported(page)), "Native Aufnahme fehlt");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Video aufnehmen", exact: true })
    .click();
  const download = await downloadPromise;
  const output = testInfo.outputPath("duration-limit.webm");
  await download.saveAs(output);
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-of",
    "json",
    output,
  ]);
  expect(
    JSON.parse(stdout)
      .streams.map((s: { codec_type: string }) => s.codec_type)
      .sort(),
  ).toEqual(["audio", "video"]);
  await expect(
    page.getByText("Video ist bereit.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "5 Minuten" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(
    await page
      .locator("audio,video")
      .evaluate((element: HTMLMediaElement) => element.paused),
  ).toBe(true);
});
test("exports real media when supported or explains missing native recording", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/beat.wav");
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeEnabled();
  const supported = await page.evaluate(
    () =>
      typeof MediaRecorder !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function" &&
      [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
        "video/webm",
        "video/mp4",
      ].some((mime) => MediaRecorder.isTypeSupported(mime)),
  );
  const button = page.getByRole("button", {
    name: "Video aufnehmen",
    exact: true,
  });
  if (!supported) {
    await expect(button).toBeDisabled();
    await expect(
      page.getByText(/Dieser Browser unterstützt keine Videoaufnahme/),
    ).toBeVisible();
    return;
  }
  await button.click();
  await expect(
    page.getByRole("button", { name: "Aufnahme stoppen", exact: true }),
  ).toBeVisible();
  for (const label of [
    "Audio oder Screenrecording",
    "Trackposition",
    "Seitenverhältnis",
    "Ausgabequalität",
  ])
    await expect(page.getByLabel(label)).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Dichte", { exact: true }).fill("0.5");
  await expect(page.getByLabel("Dichte", { exact: true })).toBeEnabled();
  await page.waitForTimeout(2200);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Aufnahme stoppen", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^2317-.*\.(webm|mp4)$/);
  const output = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(output);
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_streams",
    "-of",
    "json",
    output,
  ]);
  const streams = JSON.parse(stdout).streams;
  const video = streams.find(
    (s: { codec_type: string }) => s.codec_type === "video",
  );
  expect(video.width).toBe(720);
  expect(video.height).toBe(1280);
  expect(
    streams.some((s: { codec_type: string }) => s.codec_type === "audio"),
  ).toBe(true);
  const decoded = await run(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      output,
      "-map",
      "0:a:0",
      "-t",
      "2",
      "-ac",
      "1",
      "-ar",
      "22050",
      "-f",
      "f32le",
      "pipe:1",
    ],
    { encoding: "buffer", maxBuffer: 2_000_000 },
  );
  const audio = decoded.stdout;
  let sum = 0;
  for (let i = 0; i < audio.length; i += 4) sum += audio.readFloatLE(i) ** 2;
  expect(Math.sqrt(sum / (audio.length / 4))).toBeGreaterThan(0.005);
  await expect(page.getByLabel("Seitenverhältnis")).toBeEnabled();
  await expect(
    page.getByText("Video ist bereit.", { exact: true }),
  ).toBeVisible();
});
test("context loss interrupts recording and produces no success download", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  const button = page.getByRole("button", {
    name: "Video aufnehmen",
    exact: true,
  });
  const supported = await page.evaluate(
    () =>
      typeof MediaRecorder !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function",
  );
  test.skip(!supported, "Native Aufnahme fehlt");
  await expect(button).toBeEnabled();
  const downloads: string[] = [];
  page.on("download", (d) => downloads.push(d.suggestedFilename()));
  await button.click();
  await expect(
    page.getByRole("button", { name: "Aufnahme stoppen", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Musikvisualisierung")
    .evaluate((canvas: HTMLCanvasElement) =>
      canvas
        .getContext("webgl2")
        ?.getExtension("WEBGL_lose_context")
        ?.loseContext(),
    );
  await expect(
    page.getByRole("button", { name: "Grafik wiederherstellen" }),
  ).toBeVisible();
  await expect(page.getByText(/Aufnahme.*(Grafik|unterbrochen)/)).toBeVisible();
  await page.waitForTimeout(300);
  expect(downloads).toEqual([]);
});
test("explains an audio preparation failure before native recording starts", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.AudioContext = class {
      constructor() {
        throw new Error("Audio unavailable");
      }
    } as unknown as typeof AudioContext;
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  const supported = await page.evaluate(
    () =>
      typeof MediaRecorder !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function",
  );
  test.skip(!supported, "Native Aufnahme fehlt");
  await page
    .getByRole("button", { name: "Video aufnehmen", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Aufnahme");
});
