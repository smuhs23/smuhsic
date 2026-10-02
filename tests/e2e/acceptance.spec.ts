import { test, expect } from "@playwright/test";
for (const name of [
  "beat.wav",
  "beat.mp3",
  "beat.m4a",
  "screenrecording.mp4",
]) {
  test(`native ${name} playback produces an audio signal`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page
      .getByLabel("Audio oder Screenrecording")
      .setInputFiles(`tests/fixtures/${name}`);
    await expect(
      page.getByRole("button", { name: "Wiedergeben", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Wiedergeben", exact: true })
      .click();
    await expect
      .poll(async () =>
        Number(await page.getByTestId("signal-rms").getAttribute("data-value")),
      )
      .toBeGreaterThan(0.001);
    await expect(
      page.getByRole("button", { name: "Pause", exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}
test("invalid media shows a useful error and a valid next source recovers", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/invalid.wav");
  await expect(page.getByRole("alert")).toContainText("Dateiformat");
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/beat.wav");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});
test("loop wraps after seeking and source replacement keeps one media element", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/beat.wav");
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await page.getByRole("button", { name: "Wiederholung", exact: true }).click();
  await page.getByLabel("Trackposition").fill("7.5");
  await expect
    .poll(async () =>
      Number(await page.getByLabel("Trackposition").inputValue()),
    )
    .toBeLessThan(2);
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/beat.mp3");
  await expect(page.getByTestId("source-name")).toContainText("beat.mp3");
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("audio,video")).toHaveCount(1);
  await expect(page.locator("canvas")).toHaveCount(1);
});
test("restores graphics, resumes animation, and has no unhandled browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("THREE."))
      errors.push(message.text());
  });
  await page.goto("/");
  const canvas = page.getByLabel("Musikvisualisierung");
  await canvas.evaluate((element: HTMLCanvasElement) =>
    element
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext(),
  );
  await page.getByRole("button", { name: "Grafik wiederherstellen" }).click();
  await expect(
    page.getByRole("button", { name: "Grafik wiederherstellen" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  const before = await canvas.screenshot();
  await page.waitForTimeout(600);
  expect(Buffer.compare(before, await canvas.screenshot())).not.toBe(0);
  expect(errors).toEqual([]);
});
test("storage denial keeps the current look and playback usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = function () {
      throw new DOMException("Storage denied", "QuotaExceededError");
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Liquid Bloom", exact: true }).click();
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await page.getByLabel("Preset-Name").fill("Lost storage");
  await page
    .getByRole("button", { name: "Preset speichern", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Speicher");
  await expect(
    page.getByRole("button", { name: "Liquid Bloom", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Farbe 1", { exact: true }).fill("#a34de5");
  await expect(page.getByLabel("Farbe 1", { exact: true })).toHaveValue(
    "#a34de5",
  );
});
