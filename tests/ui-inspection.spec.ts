import { expect, test } from "@playwright/test";

type AudioTestWindow = Window &
  typeof globalThis & {
    __audioTest: {
      resolveResume: () => void;
      startedOscillators: number;
      stoppedOscillators: number;
    };
  };

type GenerationLockTestWindow = Window &
  typeof globalThis & {
    __generationLockTest: {
      resolveNext: () => void;
    };
  };

type DelayedRegenerateTestWindow = Window &
  typeof globalThis & {
    __delayedRegenerateTest: {
      resolveNext: () => void;
    };
  };

type ContinuousBoundaryTestWindow = Window &
  typeof globalThis & {
    __continuousBoundaryTest: {
      advanceTo: (second: number) => void;
      resolvePrefetch: () => void;
    };
  };

type WritingProfileSelectionTestWindow = Window &
  typeof globalThis & {
    __writingProfileSelectionTest: {
      requests: Array<{
        seed: string;
        writingProfileId: string;
        performanceProfileId: string;
        segmentIndex: number;
        mode?: string;
      }>;
    };
  };

const VIEWPORTS = [
  { name: "desktop", size: { width: 1280, height: 900 } },
  { name: "mobile", size: { width: 390, height: 844 } },
] as const;
const RANDOM_SEED_PATTERN = /^seed-[0-9a-z]{7}-[0-9a-z]{7}$/;
const INITIAL_GENERATION_TIMEOUT_MS = 20_000;

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
    await expect(seedInput).toHaveValue(RANDOM_SEED_PATTERN);
    expect(new URL(page.url()).searchParams.get("seed")).toMatch(RANDOM_SEED_PATTERN);
    await expect(page.getByRole("button", { name: "Random seed" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Writing profile" })).toHaveValue("four-voice-default");
    await expect(page.getByText("Tempo")).toBeVisible();
    await expect(page.getByText("Key")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Playback source" })).toHaveValue("oscillator");
    await expect(page.locator("#renderer-status")).toHaveText("oscillator");
    await expect(page.getByRole("combobox", { name: "Playback mode" })).toHaveValue("continuous-fugue");
    await expect(page.getByText("Mode")).toBeVisible();
    await expect(page.locator("#mode-status")).toHaveText("continuous fugue");
    await expect(page.locator("#terminal-closure-status")).toHaveText("not-required", {
      timeout: INITIAL_GENERATION_TIMEOUT_MS,
    });
    await expect(page.locator("#deadline-status")).toHaveText(/^(met|missed by \d+ ms)$/);
    await expect(page.locator("#fallback-status")).toHaveText(/^(generated|best-so-far|conservative-fallback)$/);
    await expect(page.getByText("Duration")).toBeHidden();
    await expect(page.locator("#playback-position")).toHaveText(/^\d+s \/ \d+\.\d+s \| bar \d+:\d+ \/ \d+:\d+$/);
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Pause" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Notices" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Software" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Audio assets" })).toBeVisible();
    await expect
      .poll(() => page.locator(".seed-row").evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
      .toBe(true);

    await page.getByRole("button", { name: "Random seed" }).click();
    await expect(seedInput).toHaveValue(RANDOM_SEED_PATTERN);
    expect(new URL(page.url()).searchParams.get("seed")).toMatch(RANDOM_SEED_PATTERN);
    await expect(page.locator("#notes")).not.toHaveText(/^(0|\.\.\.)$/, {
      timeout: INITIAL_GENERATION_TIMEOUT_MS,
    });
    await expect(page.locator("#fallback-status")).toHaveText(/^(generated|best-so-far)$/);

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

test("renders note-bearing endless-program output with review defects", async ({ page }) => {
  await page.goto("/?seed=seed-1bnmddk-0pzsjpu");
  await page.locator("#playback-mode").selectOption("endless-program");

  await expect(page.locator("#fallback-status")).toHaveText(/^(generated|best-so-far)$/, {
    timeout: INITIAL_GENERATION_TIMEOUT_MS,
  });
  await expect(page.locator("#notes")).not.toHaveText(/^(0|\.\.\.)$/);
  await expect(page.locator("#fallback-status")).not.toHaveText("conservative-fallback");

  const hasNoteColoredPixels = await page.locator("#piano-roll").evaluate((canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (context === null || canvas.width === 0 || canvas.height === 0) {
      return false;
    }

    const noteColors = [
      [182, 70, 41],
      [197, 139, 44],
      [57, 125, 106],
      [47, 79, 118],
    ] as const;
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let matchingPixels = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      for (const [red, green, blue] of noteColors) {
        if (
          Math.abs(pixels[index]! - red) <= 8 &&
          Math.abs(pixels[index + 1]! - green) <= 8 &&
          Math.abs(pixels[index + 2]! - blue) <= 8 &&
          pixels[index + 3]! > 0
        ) {
          matchingPixels += 1;
          if (matchingPixels > 20) {
            return true;
          }
        }
      }
    }

    return false;
  });
  expect(hasNoteColoredPixels).toBe(true);
});

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

test("sends the selected writing profile to browser generation", async ({ page }) => {
  await page.addInitScript(() => {
    type PendingRequest = {
      requestId: number;
      seed: string;
      writingProfileId: string;
      performanceProfileId: string;
      segmentIndex: number;
      mode?: string;
    };

    const requests: PendingRequest[] = [];
    const listeners: Array<(event: MessageEvent) => void> = [];

    function createResponse(request: PendingRequest): unknown {
      return {
        type: "generated",
        requestId: request.requestId,
        seed: request.seed,
        writingProfileId: request.writingProfileId,
        performanceProfileId: request.performanceProfileId,
        model: {
          bpm: 84,
          ticksPerQuarter: 480,
          timeSignature: { numerator: 4, denominator: 4 },
          keySignature: { tonic: "C", mode: "major" },
          totalTicks: 480,
          totalSeconds: 0.5,
          notes: [
            {
              voice: "soprano",
              startTick: 0,
              endTick: 480,
              startSecond: 0,
              durationSecond: 0.5,
              pitch: 60,
              velocity: 92,
              volume: 96,
              gain: 0.7,
              pan: 64,
              oscillatorType: "sine",
              webAudioSynth: {
                attackSeconds: 0.01,
                decaySeconds: 0.05,
                releaseSeconds: 0.08,
                sustainLevel: 0.75,
                velocityToSustainGain: 0.25,
                velocityToAttackEmphasis: 0.2,
              },
            },
          ],
          stateTransitions: [],
          subjectEntries: [],
          sectionPlans: [],
          performanceProfile: { id: request.performanceProfileId, version: 3 },
          pitchRange: { min: 60, max: 60 },
        },
        deadlineResult: {
          mode: request.mode ?? "continuous-fugue",
          segmentIndex: request.segmentIndex,
          elapsedMs: 1,
          deadlineExceededByMs: 0,
          timedOut: false,
          hardConstraintSatisfied: true,
          returnedCandidateKind: "generated",
          hardConstraintSource: "generated",
          referenceDiagnosticsPreserved: true,
          qualityVectorPreserved: true,
          reviewSignalsRemainVisible: [],
        },
        reviewSnapshot: {
          hardConstraintsSatisfied: true,
          fallbackPassageCount: 0,
          issueCount: 0,
          warningCount: 0,
          qualityVectorStatus: "within-profile",
          terminalClosureStatus: "not-required",
          terminalClosureSource: "not-required",
          continuousSegmentContinuityStatus: "not-required",
        },
        nextSegmentSnapshot: {
          segmentIndex: request.segmentIndex,
          writingProfile: { id: request.writingProfileId, version: 1 },
        },
      };
    }

    class CapturingGenerationWorker {
      postMessage(message: PendingRequest): void {
        requests.push(message);
        window.setTimeout(() => {
          const event = new MessageEvent("message", { data: createResponse(message) });
          for (const listener of listeners) {
            listener(event);
          }
        }, 0);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type !== "message") {
          return;
        }
        listeners.push(listener as (event: MessageEvent) => void);
      }

      terminate(): void {}
    }

    const target = window as WritingProfileSelectionTestWindow;
    target.Worker = CapturingGenerationWorker as unknown as typeof Worker;
    target.__writingProfileSelectionTest = { requests };
  });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/?seed=writing-profile-ui");

  const writingProfile = page.getByRole("combobox", { name: "Writing profile" });
  await expect(writingProfile).toHaveValue("four-voice-default");
  await expect(page.getByRole("combobox", { name: "Performance profile" })).toHaveValue("strict-counterpoint");
  await expect
    .poll(() => page.locator(".seed-row").evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    .toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.locator(".seed-row").evaluate((element) => element.scrollWidth <= element.clientWidth + 1))
    .toBe(true);
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1))
    .toBe(true);

  await expect
    .poll(() =>
      page.evaluate(() => (window as WritingProfileSelectionTestWindow).__writingProfileSelectionTest.requests.length),
    )
    .toBeGreaterThanOrEqual(1);

  const initialRequest = await page.evaluate(
    () => (window as WritingProfileSelectionTestWindow).__writingProfileSelectionTest.requests[0],
  );
  expect(initialRequest?.writingProfileId).toBe("four-voice-default");

  await writingProfile.selectOption("piano-two-hand");

  await expect
    .poll(() =>
      page.evaluate(() => {
        const requests = (window as WritingProfileSelectionTestWindow).__writingProfileSelectionTest.requests;
        return requests.at(-1)?.writingProfileId;
      }),
    )
    .toBe("piano-two-hand");
});

test("locks playback controls while primary generation is running", async ({ page }) => {
  await page.addInitScript(() => {
    type PendingRequest = {
      requestId: number;
      seed: string;
      performanceProfileId: string;
      segmentIndex: number;
      mode?: string;
    };

    const pendingRequests: PendingRequest[] = [];
    const listeners: Array<(event: MessageEvent) => void> = [];

    function createResponse(request: PendingRequest): unknown {
      return {
        type: "generated",
        requestId: request.requestId,
        seed: request.seed,
        performanceProfileId: request.performanceProfileId,
        model: {
          bpm: 84,
          ticksPerQuarter: 480,
          timeSignature: { numerator: 4, denominator: 4 },
          keySignature: { tonic: "C", mode: "major" },
          totalTicks: 480,
          totalSeconds: 0.5,
          notes: [
            {
              voice: "soprano",
              startTick: 0,
              endTick: 480,
              startSecond: 0,
              durationSecond: 0.5,
              pitch: 60,
              velocity: 92,
              volume: 96,
              gain: 0.7,
              pan: 64,
              oscillatorType: "sine",
              webAudioSynth: {
                attackSeconds: 0.01,
                decaySeconds: 0.05,
                releaseSeconds: 0.08,
                sustainLevel: 0.75,
                velocityToSustainGain: 0.25,
                velocityToAttackEmphasis: 0.2,
              },
            },
          ],
          stateTransitions: [],
          subjectEntries: [],
          sectionPlans: [],
          performanceProfile: { id: request.performanceProfileId, name: request.performanceProfileId },
          pitchRange: { min: 60, max: 60 },
        },
        deadlineResult: {
          mode: request.mode ?? "continuous-fugue",
          segmentIndex: request.segmentIndex,
          elapsedMs: 1,
          deadlineExceededByMs: 0,
          timedOut: false,
          hardConstraintSatisfied: true,
          returnedCandidateKind: "generated",
          hardConstraintSource: "generated",
          referenceDiagnosticsPreserved: true,
          qualityVectorPreserved: true,
          reviewSignalsRemainVisible: [],
        },
        reviewSnapshot: {
          hardConstraintsSatisfied: true,
          fallbackPassageCount: 0,
          issueCount: 0,
          warningCount: 0,
          qualityVectorStatus: "passed",
          terminalClosureStatus: "not-required",
          terminalClosureSource: "not-required",
          continuousSegmentContinuityStatus: "not-required",
        },
        nextSegmentSnapshot: {},
      };
    }

    class DeferredGenerationWorker {
      postMessage(message: PendingRequest): void {
        pendingRequests.push(message);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type !== "message") {
          return;
        }
        listeners.push(listener as (event: MessageEvent) => void);
      }

      terminate(): void {}
    }

    const target = window as GenerationLockTestWindow;
    target.Worker = DeferredGenerationWorker as unknown as typeof Worker;
    target.__generationLockTest = {
      resolveNext(): void {
        const request = pendingRequests.shift();
        if (request === undefined) {
          return;
        }

        const event = new MessageEvent("message", { data: createResponse(request) });
        for (const listener of listeners) {
          listener(event);
        }
      },
    };
  });

  await page.goto("/");

  await expect(page.getByText("Generating score")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled();

  await page.evaluate(() => (window as GenerationLockTestWindow).__generationLockTest.resolveNext());
  await expect(page.getByText("Ready to play")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeEnabled();
  await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled();

  const seedInput = page.getByLabel("Seed");
  await seedInput.fill("locked-regenerate");
  await page.getByRole("button", { name: "Regenerate" }).click();

  await expect(page.getByText("Generating score")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Stop" })).toBeDisabled();
});

test("does not relabel the previous score as best-so-far while a new seed is delayed", async ({ page }) => {
  await page.addInitScript(() => {
    type PendingRequest = {
      requestId: number;
      seed: string;
      performanceProfileId: string;
      segmentIndex: number;
      mode?: string;
    };

    const pendingRequests: PendingRequest[] = [];
    const listeners: Array<(event: MessageEvent) => void> = [];
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
      nativeSetTimeout(handler, timeout === 10_000 ? 0 : timeout, ...args)) as typeof window.setTimeout;

    function createNote(pitch: number, startTick: number): unknown {
      return {
        voice: "soprano",
        startTick,
        endTick: startTick + 480,
        startSecond: startTick / 960,
        durationSecond: 0.5,
        pitch,
        velocity: 92,
        volume: 96,
        gain: 0.7,
        pan: 64,
        oscillatorType: "sine",
        webAudioSynth: {
          attackSeconds: 0.01,
          decaySeconds: 0.05,
          releaseSeconds: 0.08,
          sustainLevel: 0.75,
          velocityToSustainGain: 0.25,
          velocityToAttackEmphasis: 0.2,
        },
      };
    }

    function createResponse(request: PendingRequest): unknown {
      const notes =
        request.seed === "delayed-regenerate" ? [createNote(64, 0), createNote(67, 480)] : [createNote(60, 0)];

      return {
        type: "generated",
        requestId: request.requestId,
        seed: request.seed,
        performanceProfileId: request.performanceProfileId,
        model: {
          bpm: 120,
          ticksPerQuarter: 480,
          timeSignature: { numerator: 4, denominator: 4 },
          keySignature: { tonic: request.seed === "delayed-regenerate" ? "G" : "C", mode: "major" },
          totalTicks: 960,
          totalSeconds: 1,
          notes,
          stateTransitions: ["exposition"],
          subjectEntries: [],
          sectionPlans: [],
          performanceProfile: { id: request.performanceProfileId, name: request.performanceProfileId },
          pitchRange: { min: 60, max: 67 },
        },
        deadlineResult: {
          mode: request.mode ?? "continuous-fugue",
          segmentIndex: request.segmentIndex,
          elapsedMs: 1,
          deadlineExceededByMs: 0,
          timedOut: false,
          hardConstraintSatisfied: true,
          returnedCandidateKind: "generated",
          hardConstraintSource: "generated",
          referenceDiagnosticsPreserved: true,
          qualityVectorPreserved: true,
          reviewSignalsRemainVisible: [],
        },
        reviewSnapshot: {
          hardConstraintsSatisfied: true,
          fallbackPassageCount: 0,
          issueCount: 0,
          warningCount: 0,
          qualityVectorStatus: "within-profile",
          terminalClosureStatus: "not-required",
          terminalClosureSource: "not-required",
          continuousSegmentContinuityStatus: "not-required",
        },
        nextSegmentSnapshot: { segmentIndex: request.segmentIndex },
      };
    }

    class DeferredGenerationWorker {
      postMessage(message: PendingRequest): void {
        pendingRequests.push(message);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type !== "message") {
          return;
        }
        listeners.push(listener as (event: MessageEvent) => void);
      }

      terminate(): void {}
    }

    const target = window as DelayedRegenerateTestWindow;
    target.Worker = DeferredGenerationWorker as unknown as typeof Worker;
    target.__delayedRegenerateTest = {
      resolveNext(): void {
        const request = pendingRequests.shift();
        if (request === undefined) {
          return;
        }

        const event = new MessageEvent("message", { data: createResponse(request) });
        for (const listener of listeners) {
          listener(event);
        }
      },
    };
  });

  await page.goto("/");
  await page.evaluate(() => (window as DelayedRegenerateTestWindow).__delayedRegenerateTest.resolveNext());
  await expect(page.locator("#notes")).toHaveText("1");

  const seedInput = page.getByLabel("Seed");
  await seedInput.fill("delayed-regenerate");
  await page.getByRole("button", { name: "Regenerate" }).click();

  await expect(page.locator("#generation-status")).toHaveText("Still generating");
  await expect(page.locator("#notes")).toHaveText("...");
  await expect(page.locator("#fallback-status")).toHaveText("...");
  await expect(page.getByText("Best-so-far fallback")).toHaveCount(0);

  await page.evaluate(() => (window as DelayedRegenerateTestWindow).__delayedRegenerateTest.resolveNext());
  await expect(page.locator("#notes")).toHaveText("2");
  await expect(page.locator("#key-signature")).toHaveText("G Major");
});

test("keeps the score card on the current continuous segment until the playback boundary", async ({ page }) => {
  await page.addInitScript(() => {
    type PendingRequest = {
      requestId: number;
      seed: string;
      performanceProfileId: string;
      segmentIndex: number;
      mode?: string;
    };

    const listeners: Array<(event: MessageEvent) => void> = [];
    const pendingPrefetches: PendingRequest[] = [];
    const testState = {
      currentTime: 0,
    };

    function createModel(request: PendingRequest): unknown {
      const isContinuation = request.segmentIndex > 0;

      return {
        bpm: 120,
        ticksPerQuarter: 480,
        timeSignature: { numerator: 4, denominator: 4 },
        keySignature: isContinuation ? { tonic: "G", mode: "major" } : { tonic: "C", mode: "major" },
        totalTicks: 9600,
        totalSeconds: 10,
        notes: [
          {
            voice: isContinuation ? "alto" : "soprano",
            startTick: 0,
            endTick: 960,
            startSecond: 0,
            durationSecond: 1,
            pitch: isContinuation ? 67 : 60,
            velocity: 92,
            volume: 96,
            gain: 0.7,
            pan: 64,
            oscillatorType: "sine",
            webAudioSynth: {
              attackSeconds: 0.01,
              decaySeconds: 0.05,
              releaseSeconds: 0.08,
              sustainLevel: 0.75,
              velocityToSustainGain: 0.25,
              velocityToAttackEmphasis: 0.2,
            },
          },
        ],
        stateTransitions: isContinuation ? ["episode"] : ["exposition"],
        subjectEntries: isContinuation ? [{ voice: "soprano", startTick: 0, state: "episode" }] : [],
        sectionPlans: [],
        performanceProfile: { id: request.performanceProfileId, version: 3 },
        pitchRange: { min: 60, max: 72 },
      };
    }

    function createResponse(request: PendingRequest): unknown {
      return {
        type: "generated",
        requestId: request.requestId,
        seed: request.seed,
        performanceProfileId: request.performanceProfileId,
        model: createModel(request),
        deadlineResult: {
          mode: request.mode ?? "continuous-fugue",
          segmentIndex: request.segmentIndex,
          elapsedMs: 1,
          deadlineExceededByMs: 0,
          timedOut: false,
          hardConstraintSatisfied: true,
          returnedCandidateKind: "generated",
          hardConstraintSource: "generated",
          referenceDiagnosticsPreserved: true,
          qualityVectorPreserved: true,
          reviewSignalsRemainVisible: [],
        },
        reviewSnapshot: {
          hardConstraintsSatisfied: true,
          fallbackPassageCount: 0,
          issueCount: 0,
          warningCount: 0,
          qualityVectorStatus: "passed",
          terminalClosureStatus: "not-required",
          terminalClosureSource: "not-required",
          continuousSegmentContinuityStatus: request.segmentIndex > 0 ? "passed" : "not-required",
        },
        nextSegmentSnapshot: { segmentIndex: request.segmentIndex },
      };
    }

    function emitResponse(request: PendingRequest): void {
      const event = new MessageEvent("message", { data: createResponse(request) });
      for (const listener of listeners) {
        listener(event);
      }
    }

    class ControlledGenerationWorker {
      postMessage(message: PendingRequest): void {
        if (message.segmentIndex === 0) {
          window.setTimeout(() => emitResponse(message), 0);
          return;
        }

        pendingPrefetches.push(message);
      }

      addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
        if (type !== "message") {
          return;
        }
        listeners.push(listener as (event: MessageEvent) => void);
      }

      terminate(): void {}
    }

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

      start(_time?: number): void {}

      stop(_time?: number): void {}

      addEventListener(
        _type: string,
        _listener: EventListenerOrEventListenerObject,
        _options?: AddEventListenerOptions,
      ): void {}
    }

    class FakeAudioContext {
      readonly destination = new FakeAudioNode();

      get currentTime(): number {
        return testState.currentTime;
      }

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
        return Promise.resolve();
      }
    }

    const target = window as ContinuousBoundaryTestWindow;
    target.Worker = ControlledGenerationWorker as unknown as typeof Worker;
    target.AudioContext = FakeAudioContext as unknown as typeof AudioContext;
    target.__continuousBoundaryTest = {
      advanceTo(second: number): void {
        testState.currentTime = 0.12 + second;
      },
      resolvePrefetch(): void {
        const request = pendingPrefetches.shift();
        if (request !== undefined) {
          emitResponse(request);
        }
      },
    };
  });

  await page.goto("/");
  await expect(page.locator("#key-signature")).toHaveText("C Major");
  await expect(page.locator("#segment-index")).toHaveText("0");

  await page.getByRole("button", { name: "Play" }).click();
  await page.evaluate(() => (window as ContinuousBoundaryTestWindow).__continuousBoundaryTest.advanceTo(5));
  await expect.poll(() => page.locator("#playback-position").textContent()).toContain("5s / 10.0s");

  await page.evaluate(() => (window as ContinuousBoundaryTestWindow).__continuousBoundaryTest.resolvePrefetch());
  await expect(page.locator("#generated-segment-index")).toHaveText("1");
  await expect(page.locator("#key-signature")).toHaveText("C Major");
  await expect(page.locator("#segment-index")).toHaveText("0");

  await page.evaluate(() => (window as ContinuousBoundaryTestWindow).__continuousBoundaryTest.advanceTo(10));
  await expect(page.locator("#segment-index")).toHaveText("1");
  await expect(page.locator("#key-signature")).toHaveText("G Major");
});

test("animates the background only while playback is active", async ({ page }) => {
  await page.goto("/");

  const body = page.locator("body");
  await expect(body).not.toHaveClass(/is-playing/);

  await page.getByRole("button", { name: "Play" }).click();
  await expect(body).toHaveClass(/is-playing/);
  await expect(body).toHaveCSS("animation-name", "playback-background-flow");
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();

  await page.getByRole("button", { name: "Pause" }).click();
  await expect(body).not.toHaveClass(/is-playing/);
  await expect(page.getByRole("button", { name: "Resume" })).toBeVisible();

  await page.getByRole("button", { name: "Stop" }).click();
  await expect(body).not.toHaveClass(/is-playing/);
  await expect(page.getByRole("button", { name: "Play" })).toBeVisible();
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
