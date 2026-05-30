import { expect, test } from "@playwright/test";

type AudioTestWindow = Window &
  typeof globalThis & {
    __audioTest: {
      resolveResume: () => void;
      startedOscillators: number;
      stoppedOscillators: number;
    };
  };

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

    await expect(page).toHaveTitle("Fugematon");
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      "Fugematon generates four-voice fugue for playback.",
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "website");
    await expect(page.locator('meta[property="og:description"]')).toHaveAttribute(
      "content",
      "Fugematon generates four-voice fugue for playback.",
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      "content",
      "https://oakcask.github.io/fugematon/",
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      "https://oakcask.github.io/fugematon/og-image.png",
    );
    await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
    await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      "content",
      "Fugematon title card with a piano roll visualization.",
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
      "content",
      "Fugematon generates four-voice fugue for playback.",
    );

    await expect(page.getByRole("heading", { name: "Fugematon" })).toBeVisible();
    await expect(page.getByText("deterministic counterpoint machine")).toBeVisible();
    await expect(page.getByText("Generate four-voice fugue for browser playback.")).toBeVisible();
    const seedInput = page.getByLabel("Seed");
    await expect(seedInput).toHaveValue("fugue-smoke");
    await expect(page).toHaveURL(/[?&]seed=fugue-smoke(?:&|$)/);
    await expect(page.getByRole("button", { name: "Random seed" })).toBeVisible();
    await expect(page.getByText("Tempo")).toBeVisible();
    await expect(page.getByText("Key")).toBeVisible();
    await expect(page.getByText("Mode")).toBeHidden();
    await expect(page.getByText("Duration")).toBeHidden();
    await expect(page.locator("#playback-position")).toHaveText(/^\d+s \/ \d+\.\d+s \| bar \d+:\d+ \/ \d+:\d+$/);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toBeDisabled();

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

  await page.getByRole("button", { name: "Play" }).click();
  await expect(body).toHaveClass(/is-playing/);
  await expect(body).toHaveCSS("animation-name", "playback-background-flow");

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(body).not.toHaveClass(/is-playing/);
});

test("cancels pending playback before regenerating the score", async ({ page }) => {
  await page.addInitScript(() => {
    const testState = {
      resumeResolvers: [] as Array<() => void>,
      startedOscillators: 0,
      stoppedOscillators: 0,
      resolveResume(): void {
        const resolvers = this.resumeResolvers.splice(0);
        for (const resolve of resolvers) {
          resolve();
        }
      },
    };

    class FakeAudioParam {
      value = 0;

      setValueAtTime(_value: number, _time: number): void {}

      linearRampToValueAtTime(_value: number, _time: number): void {}
    }

    class FakeAudioNode {
      connect<TNode>(node: TNode): TNode {
        return node;
      }

      disconnect(): void {}
    }

    class FakeGainNode extends FakeAudioNode {
      readonly gain = new FakeAudioParam();
    }

    class FakeStereoPannerNode extends FakeAudioNode {
      readonly pan = new FakeAudioParam();
    }

    class FakeOscillatorNode extends FakeAudioNode {
      readonly frequency = new FakeAudioParam();
      type: OscillatorType = "sine";

      start(_time?: number): void {
        testState.startedOscillators += 1;
      }

      stop(_time?: number): void {
        testState.stoppedOscillators += 1;
      }

      addEventListener(
        _type: string,
        _listener: EventListenerOrEventListenerObject,
        _options?: AddEventListenerOptions,
      ): void {}
    }

    class FakeAudioContext {
      currentTime = 0;
      readonly destination = new FakeAudioNode();

      createGain(): GainNode {
        return new FakeGainNode() as unknown as GainNode;
      }

      createOscillator(): OscillatorNode {
        return new FakeOscillatorNode() as unknown as OscillatorNode;
      }

      createStereoPanner(): StereoPannerNode {
        return new FakeStereoPannerNode() as unknown as StereoPannerNode;
      }

      resume(): Promise<void> {
        return new Promise((resolve) => {
          testState.resumeResolvers.push(resolve);
        });
      }
    }

    const target = window as AudioTestWindow;
    target.__audioTest = testState;
    target.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByText("Starting playback")).toBeVisible();

  const seedInput = page.getByLabel("Seed");
  await seedInput.fill("mobile-regenerate");
  await page.getByRole("button", { name: "Regenerate" }).click();
  await expect(seedInput).toHaveValue("mobile-regenerate");
  await expect(page.getByText("Ready to play")).toBeVisible();

  await page.evaluate(() => (window as AudioTestWindow).__audioTest.resolveResume());
  await page.waitForTimeout(50);

  const scheduledNoteCount = await page.evaluate(() => (window as AudioTestWindow).__audioTest.startedOscillators);
  expect(scheduledNoteCount).toBe(0);
  await expect(page.getByText("Ready to play")).toBeVisible();
});
