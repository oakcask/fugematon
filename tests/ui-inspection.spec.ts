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
    await expect(page.getByLabel("Seed")).toHaveValue("fugue-smoke");
    await expect(page.getByText("Tempo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toBeVisible();

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
