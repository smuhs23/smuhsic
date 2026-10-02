import { test, expect } from "@playwright/test";
test("presets survive reload, reject broken JSON, and variation changes only the seed", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Mandala", exact: true }).click();
  await page.getByLabel("Dichte", { exact: true }).fill("0.42");
  await page.getByLabel("Seitenverhältnis").selectOption("4:5");
  await page.getByLabel("Ausgabequalität").selectOption("high");
  await page.getByLabel("Preset-Name").fill("Orbit 2317");
  await page
    .getByRole("button", { name: "Preset speichern", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Orbit 2317", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Orbit 2317", exact: true }).click();
  await expect(page.getByLabel("Dichte", { exact: true })).toHaveValue("0.42");
  await expect(page.getByLabel("Seitenverhältnis")).toHaveValue("4:5");
  await expect(page.getByLabel("Ausgabequalität")).toHaveValue("high");
  const oldSeed = await page.getByTestId("seed-value").textContent();
  await page
    .getByRole("button", { name: "Neue Variation", exact: true })
    .click();
  await expect(page.getByTestId("seed-value")).not.toHaveText(oldSeed!);
  await expect(page.getByLabel("Dichte", { exact: true })).toHaveValue("0.42");
  await page.getByLabel("Preset importieren").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{nope"),
  });
  await expect(page.getByRole("alert")).toContainText("JSON");
  await expect(
    page.getByRole("button", { name: "Mandala", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Look zurücksetzen", exact: true })
    .click();
  await expect(page.getByLabel("Dichte", { exact: true })).toHaveValue("0.65");
  await expect(
    page.getByRole("button", { name: "Mandala", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
test("space toggles playback outside text and range inputs", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Demo ausprobieren/ }).click();
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeEnabled();
  await page.getByRole("heading", { name: "Musik wird Bewegung." }).click();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Preset-Name").focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Dichte", { exact: true }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Musik wird Bewegung." }).click();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeVisible();
});
test("all editor groups work at 390px without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const label of [
    "Hintergrund",
    "Farbe 1",
    "Größe",
    "Symmetrie",
    "Komplexität",
    "Rotation",
    "Geschwindigkeit",
    "Turbulenz",
    "Nachbilder",
    "Weichheit",
    "Empfindlichkeit",
    "Beat-Stärke",
    "Glättung",
    "Bass-Gewichtung",
    "Mitten-Gewichtung",
    "Höhen-Gewichtung",
  ]) {
    await expect(page.getByLabel(label, { exact: true })).toBeAttached();
  }
  await page.getByLabel("Beatmodus").selectOption("manual");
  await page.getByLabel("Manuelle BPM").fill("98");
  await expect(page.getByLabel("Manuelle BPM")).toHaveValue("98");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("mobile-390.png"),
    fullPage: true,
  });
});
test("silent input reports no signal only after playback, and source load can be cancelled", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Kein Audiosignal erkannt", { exact: false }),
  ).toHaveCount(0);
  await page
    .getByLabel("Audio oder Screenrecording")
    .setInputFiles("tests/fixtures/silent.wav");
  await page.getByRole("button", { name: "Wiedergeben", exact: true }).click();
  await expect(
    page.getByText("Kein Audiosignal erkannt", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Quelle entfernen", exact: true })
    .click();
  await expect(page.getByTestId("source-name")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeDisabled();
});
test("output formats keep the canvas proportions and native pixel size", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Ausgabequalität").selectOption("standard");
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 800, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const [aspect, width, height] of [
      ["9:16", 720, 1280],
      ["16:9", 1280, 720],
      ["1:1", 720, 720],
      ["4:5", 720, 900],
    ] as const) {
      await page.getByLabel("Seitenverhältnis").selectOption(aspect);
      const geometry = await page
        .getByLabel("Musikvisualisierung")
        .evaluate((canvas: HTMLCanvasElement) => {
          const r = canvas.getBoundingClientRect();
          return {
            w: canvas.width,
            h: canvas.height,
            ratio: r.width / r.height,
          };
        });
      expect(geometry.w).toBe(width);
      expect(geometry.h).toBe(height);
      expect(geometry.ratio).toBeCloseTo(width / height, 2);
    }
  }
});
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 390, height: 844 },
]) {
  test(`fullscreen preserves every aspect ratio at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.getByRole("button", { name: "Vollbild", exact: true }).click();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            !!document.fullscreenElement ||
            !!document.querySelector(".fullscreen-note"),
        ),
      )
      .toBe(true);
    if (!(await page.evaluate(() => !!document.fullscreenElement))) {
      await expect(
        page.getByText("Vollbild ist in diesem Browser nicht verfügbar."),
      ).toBeVisible();
      return;
    }
    for (const aspect of ["9:16", "16:9", "1:1", "4:5"]) {
      await page.getByLabel("Seitenverhältnis").selectOption(aspect);
      const [w, h] = aspect.split(":").map(Number);
      const geometry = await page
        .getByLabel("Musikvisualisierung")
        .evaluate((canvas: HTMLCanvasElement) => {
          const r = canvas.getBoundingClientRect();
          return {
            ratio: r.width / r.height,
            left: r.left,
            top: r.top,
            right: r.right,
            bottom: r.bottom,
          };
        });
      expect(geometry.ratio).toBeCloseTo(w / h, 2);
      expect(geometry.left).toBeGreaterThanOrEqual(0);
      expect(geometry.top).toBeGreaterThanOrEqual(0);
      expect(geometry.right).toBeLessThanOrEqual(viewport.width);
      expect(geometry.bottom).toBeLessThanOrEqual(viewport.height);
    }
  });
}
test("repeated ink variations reuse allocated GPU buffers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const metrics = { created: 0 };
    Object.assign(window, { inkBuffers: metrics });
    const original = WebGL2RenderingContext.prototype.createBuffer;
    WebGL2RenderingContext.prototype.createBuffer = function () {
      metrics.created++;
      return original.call(this);
    };
  });
  await page.goto("/");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { inkBuffers: { created: number } }).inkBuffers
            .created,
      ),
    )
    .toBeGreaterThan(0);
  const count = await page.evaluate(
    () =>
      (window as unknown as { inkBuffers: { created: number } }).inkBuffers
        .created,
  );
  for (let i = 0; i < 10; i++) {
    const seed = await page.getByTestId("seed-value").textContent();
    await page
      .getByRole("button", { name: "Neue Variation", exact: true })
      .click();
    await expect(page.getByTestId("seed-value")).not.toHaveText(seed!);
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
  }
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { inkBuffers: { created: number } }).inkBuffers
          .created,
    ),
  ).toBe(count);
});
test("transport stays in view on a 1280 by 720 desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/");
  await page.getByLabel("Dichte", { exact: true }).scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Wiedergeben", exact: true }),
  ).toBeInViewport();
});
