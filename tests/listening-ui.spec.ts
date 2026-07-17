import { expect, test } from "@playwright/test";

type ListeningAudioTestWindow = Window &
  typeof globalThis & {
    __listeningAudioTest: { started: number; stopped: number; startTimes: number[] };
  };

for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "narrow", width: 390, height: 844 },
] as const) {
  test(`blind listening completes a response in ${viewport.name}`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await installAudioInstrumentation(page);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    await expect(page).toHaveTitle("Fugematon Blind Listening");
    await expect(page.getByRole("heading", { name: "Blind Listening Review" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play or switch to side A" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play or switch to side B" })).toBeVisible();
    const bodyBeforeChoice = await page.locator("body").innerText();
    expect(bodyBeforeChoice).not.toMatch(/baseline-fixture|variant-fixture|section-local-planner/);
    expect(page.url()).not.toMatch(/baseline|variant|model/);

    await page.getByRole("button", { name: "Play or switch to side A" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Playing A/ })).toBeVisible();
    await page.getByRole("button", { name: "Play or switch to side B" }).click();
    await expect(page.getByRole("status").filter({ hasText: /Playing B/ })).toBeVisible();
    const audioEvidence = await page.evaluate(() => (window as ListeningAudioTestWindow).__listeningAudioTest);
    expect(audioEvidence.started).toBeGreaterThan(0);
    expect(audioEvidence.stopped).toBeGreaterThan(0);

    await page.keyboard.press("a");
    await expect(page.getByRole("button", { name: "Prefer A · A" })).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("Confidence").selectOption("4");
    await page.getByLabel("Composition reason").selectOption("entry-clarity");
    await page.getByLabel("Optional note").fill("Focused entry comparison.");
    await page.getByRole("button", { name: "Save and next · N" }).click();
    await expect(page.locator("#answered")).toHaveText("1");

    await page.reload();
    await expect(page.locator("#answered")).toHaveText(/[1-2]/);
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}.png`),
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  });
}

test("text input suppresses response shortcuts and reveal requires a saved choice", async ({ page }) => {
  await installAudioInstrumentation(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByLabel("Optional note").focus();
  await page.keyboard.press("a");
  await expect(page.getByRole("button", { name: "Prefer A · A" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Reveal analysis" }).click();
  await expect(page.getByRole("alert")).toContainText("listening.reveal.choice-required");
});

test("focused loop uses the same start position for both sides and reveal shows score analysis", async ({ page }) => {
  await installAudioInstrumentation(page);
  await page.goto("/");
  await page.getByLabel("Loop start tick").fill("0");
  await page.getByLabel("Loop end tick").fill("960");
  await page.getByLabel("Shared playback position").fill("0");
  await page.getByRole("button", { name: "Focused loop · L" }).click();
  await page.getByRole("button", { name: "Play or switch to side A" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Playing A/ })).toBeVisible();
  const afterA = await page.evaluate(() => {
    const values = (window as ListeningAudioTestWindow).__listeningAudioTest.startTimes;
    return { count: values.length, first: Math.min(...values) };
  });
  await page.getByRole("button", { name: "Play or switch to side B" }).click();
  await expect(page.getByRole("status").filter({ hasText: /Playing B/ })).toBeVisible();
  const afterB = await page.evaluate((priorCount) => {
    const values = (window as ListeningAudioTestWindow).__listeningAudioTest.startTimes.slice(priorCount);
    return Math.min(...values);
  }, afterA.count);
  expect(afterA.first).toEqual(afterB);
  await page.getByRole("button", { name: "Prefer A · A" }).click();
  await expect(page.locator("#save-status")).toHaveText("Saved.");
  await page.getByRole("button", { name: "Reveal analysis" }).click();
  await expect(page.locator("#analysis-mapping")).toContainText(/baseline|variant/);
  await expect(page.getByLabel("Side A synchronized piano roll")).toBeVisible();
  await expect(page.locator("#analysis-content")).toContainText("deltaAminusB");
  await expect(page.locator("#analysis-content")).toContainText("diagnosticsSummary");
  expect(
    await page.getByLabel("Side A synchronized piano roll").evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data ?? [];
      return [...pixels].some((value, index) => index % 4 === 3 && value > 0);
    }),
  ).toBe(true);
});

test("renderer failure becomes cannot-judge with a rendering-only reason", async ({ page }) => {
  await page.addInitScript(() => {
    class BrokenAudioContext {
      currentTime = 0;
      destination = {};
      resume(): Promise<void> {
        return Promise.resolve();
      }
      createOscillator(): never {
        throw new Error("fixture renderer failure");
      }
      createGain(): never {
        throw new Error("fixture renderer failure");
      }
    }
    Object.defineProperty(window, "AudioContext", { value: BrokenAudioContext });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Play or switch to side A" }).click();
  await expect(page.locator("#renderer")).toHaveText("failed");
  await expect(page.getByRole("button", { name: "Cannot judge · J" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Rendering issue")).toHaveValue("renderer-mismatch");
});

async function installAudioInstrumentation(page: import("@playwright/test").Page): Promise<void> {
  await page.addInitScript(() => {
    const evidence = { started: 0, stopped: 0, startTimes: [] as number[] };
    class Parameter {
      value = 0;
      setValueAtTime(value: number): void {
        this.value = value;
      }
      exponentialRampToValueAtTime(value: number): void {
        this.value = value;
      }
    }
    class Node {
      connect(): this {
        return this;
      }
    }
    class Oscillator extends Node {
      frequency = new Parameter();
      start(when = 0): void {
        evidence.started += 1;
        evidence.startTimes.push(when);
      }
      stop(): void {
        evidence.stopped += 1;
      }
    }
    class Gain extends Node {
      gain = new Parameter();
    }
    class AudioContextFixture {
      currentTime = 0;
      destination = new Node();
      resume(): Promise<void> {
        return Promise.resolve();
      }
      createOscillator(): Oscillator {
        return new Oscillator();
      }
      createGain(): Gain {
        return new Gain();
      }
    }
    Object.defineProperty(window, "AudioContext", { value: AudioContextFixture });
    (window as ListeningAudioTestWindow).__listeningAudioTest = evidence;
  });
}
