import { test, expect } from "@playwright/test";
import path from "node:path";
const fixture = (name: string) => path.resolve("tests/fixtures", name);
test("plays local audio, animates Ink Flow, pauses, and seeks", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "2317", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles(fixture("beat.wav"));
  await expect(page.getByTestId("source-name")).toContainText("beat.wav");
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  const canvas = page.getByLabel("Musikvisualisierung");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  const first = await canvas.screenshot();
  await page.waitForTimeout(1000);
  const next = await canvas.screenshot();
  expect(Buffer.compare(first, next)).not.toBe(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.waitForTimeout(250);
  const paused = await canvas.screenshot();
  await page.waitForTimeout(500);
  expect(Buffer.compare(paused, await canvas.screenshot())).toBe(0);
  await page.getByLabel("Trackposition").fill("3");
  await expect(page.getByTestId("track-time")).toContainText("0:03");
});
test("keeps signal analysis active when monitoring volume is zero", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles(fixture("beat.wav"));
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await page.getByLabel("Lautstärke").fill("0");
  await page.waitForTimeout(1300);
  await expect
    .poll(async () =>
      Number(await page.getByTestId("signal-rms").getAttribute("data-value")),
    )
    .toBeGreaterThan(0.001);
});
test("explains missing WebGL instead of showing a broken studio", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      return type === "webgl2"
        ? null
        : Reflect.apply(original, this, [type, ...args]);
    } as typeof original;
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("WebGL 2");
});
test("handles a lost graphics context with a visible restore control", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByLabel("Musikvisualisierung")).toBeVisible();
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
});
