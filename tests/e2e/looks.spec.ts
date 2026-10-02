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
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await page.getByRole("button", { name: "Wiederholung", exact: true }).click();
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
      const position = await page.getByLabel("Trackposition").inputValue();
      await page.getByRole("button", { name: mood, exact: true }).click();
      await expect(
        page.getByRole("button", { name: look, exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        page.getByRole("button", { name: "Pause", exact: true }),
      ).toBeVisible();
      expect(
        Number(await page.getByLabel("Trackposition").inputValue()),
      ).toBeGreaterThanOrEqual(Number(position) - 0.2);
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
