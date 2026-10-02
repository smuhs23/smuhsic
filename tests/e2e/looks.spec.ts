import { test, expect } from "@playwright/test";
const looks = [
  "Ink Flow",
  "Liquid Bloom",
  "Mandala",
  "Tunnel",
  "Spectral Ribbons",
];
const moods = ["Ruhig", "Euphorisch", "Düster", "Verträumt", "Intensiv"];
test("five distinct looks animate, and moods preserve playback and remain editable", async ({
  page,
  browserName,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await page.getByRole("button", { name: "Wiederholung", exact: true }).click();
  const media = await page.locator("audio,video").elementHandle();
  if (!media) throw new Error("Demo media element is missing");
  const canvas = page.getByLabel("Musikvisualisierung");
  const images: Buffer[] = [];
  for (const look of looks) {
    await page.getByRole("button", { name: look, exact: true }).click();
    await expect(
      page.getByRole("button", { name: look, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const before = await canvas.screenshot();
    await page.waitForTimeout(350);
    const after = await canvas.screenshot();
    expect(Buffer.compare(before, after)).not.toBe(0);
    images.push(after);
    for (const mood of moods) {
      // Reproduce the CI boundary: a normal loop can finish during a mood change.
      const exerciseWrap =
        browserName === "chromium" && look === looks[0] && mood === moods[0];
      if (exerciseWrap) {
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        await page.getByLabel("Trackposition").fill("15.5");
        await expect
          .poll(() => media.evaluate((element: HTMLMediaElement) =>
            !element.seeking && element.currentTime >= 15.5,
          ))
          .toBe(true);
        await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
      }
      const beforeMood = await media.evaluate((element: HTMLMediaElement) => ({
        position: element.currentTime,
        duration: element.duration,
        source: element.currentSrc,
        clock: performance.now(),
      }));
      await page.getByRole("button", { name: mood, exact: true }).click();
      if (exerciseWrap) await page.waitForTimeout(800);
      await expect(
        page.getByRole("button", { name: look, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeVisible();
      const afterMood = await media.evaluate((element: HTMLMediaElement) => ({
        position: element.currentTime,
        source: element.currentSrc,
        connected: element.isConnected,
        paused: element.paused,
        clock: performance.now(),
      }));
      expect(afterMood.connected).toBe(true);
      expect(afterMood.paused).toBe(false);
      expect(afterMood.source).toBe(beforeMood.source);
      // Backward movement is allowed only when enough time elapsed to reach
      // the natural loop boundary, and the new position fits that elapsed time.
      // Do not require the media clock to equal the browser's wall clock.
      if (afterMood.position < beforeMood.position - 0.2) {
        const elapsed = (afterMood.clock - beforeMood.clock) / 1000;
        expect(beforeMood.duration - beforeMood.position).toBeLessThanOrEqual(
          elapsed + 0.2,
        );
        expect(afterMood.position).toBeLessThanOrEqual(elapsed + 0.2);
      }
      if (exerciseWrap) expect(afterMood.position).toBeLessThan(2);
    }
    await page.getByLabel("Farbe 1", { exact: true }).fill("#e34270");
    await page.getByLabel("Dichte", { exact: true }).fill("0.3");
    await page.getByLabel("Geschwindigkeit", { exact: true }).fill("0.4");
    await page.getByLabel("Beat-Stärke", { exact: true }).fill("0.5");
    await expect(
      page.getByRole("button", { name: "Intensiv", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
  }
  for (let i = 0; i < images.length; i++)
    for (let j = i + 1; j < images.length; j++)
      expect(Buffer.compare(images[i], images[j])).not.toBe(0);
  for (let i = 0; i < 10; i++)
    await page
      .getByRole("button", { name: looks[i % looks.length], exact: true })
      .click();
  await expect(page.locator("canvas")).toHaveCount(1);
  await expect(page.locator("audio,video")).toHaveCount(1);
});
