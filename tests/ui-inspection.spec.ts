import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
] as const;

for (const viewport of VIEWPORTS) {
  test(`renders the Web UI in ${viewport.name}`, async ({ page }, testInfo) => {
    const browserErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      browserErrors.push(error.message);
    });

    await page.setViewportSize(viewport.size);
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Fugematon" })).toBeVisible();
    const seedInput = page.getByLabel("Seed");
    await expect(seedInput).toHaveValue("fugue-smoke");
    await expect(page).toHaveURL(/[?&]seed=fugue-smoke(?:&|$)/);
    await expect(page.getByRole("button", { name: "Random seed" })).toBeVisible();
    await expect(page.getByText("Tempo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play score" })).toBeVisible();

    await page.getByRole("button", { name: "Random seed" }).click();
    await expect(seedInput).toHaveValue(/^seed-[0-9a-z]{7}-[0-9a-z]{7}$/);
    expect(new URL(page.url()).searchParams.get("seed")).toMatch(/^seed-[0-9a-z]{7}-[0-9a-z]{7}$/);

    const pianoRoll = page.locator("#piano-roll");
    await expect(pianoRoll).toBeVisible();

    const canvasSize = await pianoRoll.boundingBox();
    expect(canvasSize?.width).toBeGreaterThan(0);
    expect(canvasSize?.height).toBeGreaterThan(0);

    const hasDrawnPixels = await pianoRoll.evaluate((canvas: HTMLCanvasElement) => {
      const context = canvas.getContext("2d");
      if (context === null || canvas.width === 0 || canvas.height === 0) {
        return false;
      }

      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] !== 0) {
          return true;
        }
      }

      return false;
    });
    expect(hasDrawnPixels).toBe(true);

    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });

    expect(browserErrors).toEqual([]);
  });
}

test("syncs the seed with the URL query string", async ({ page }) => {
  await page.goto("/?seed=url-smoke");

  const seedInput = page.getByLabel("Seed");
  await expect(seedInput).toHaveValue("url-smoke");
  expect(new URL(page.url()).searchParams.get("seed")).toBe("url-smoke");

  await seedInput.fill("url-next");
  await page.getByRole("button", { name: "Regenerate" }).click();

  await expect(seedInput).toHaveValue("url-next");
  expect(new URL(page.url()).searchParams.get("seed")).toBe("url-next");

  await page.goBack();
  await expect(seedInput).toHaveValue("url-smoke");
  expect(new URL(page.url()).searchParams.get("seed")).toBe("url-smoke");
});

test("animates the background only while playback is active", async ({ page }) => {
  await page.goto("/");

  const body = page.locator("body");
  await expect(body).not.toHaveClass(/is-playing/);

  await page.getByRole("button", { name: "Play score" }).click();
  await expect(body).toHaveClass(/is-playing/);
  await expect(body).toHaveCSS("animation-name", "playback-background-flow");

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(body).not.toHaveClass(/is-playing/);
});
