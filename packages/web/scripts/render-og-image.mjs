import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

const webRoot = fileURLToPath(new URL("..", import.meta.url));
const outputPath = fileURLToPath(new URL("../public/og-image.png", import.meta.url));
const appDistOutputPath = fileURLToPath(new URL("../app-dist/og-image.png", import.meta.url));
const shouldWriteAppDist = process.argv.includes("--app-dist");
const shouldWritePublic = !shouldWriteAppDist || process.argv.includes("--public");

const markup = `<!doctype html>
<html>
  <head>
    <style>
      body {
        width: 1200px;
        height: 630px;
        margin: 0;
        overflow: hidden;
        color: #24190f;
        background: linear-gradient(135deg, #f5ead7 0%, #e4d1af 44%, #b9c0a1 100%);
        font-family: "Alegreya", "Iowan Old Style", "Palatino Linotype", serif;
        font-synthesis: none;
        text-rendering: optimizeLegibility;
      }

      .wrap {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 72px 88px;
      }

      .eyebrow {
        margin: 0;
        color: #8a3f27;
        font-size: 28px;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      .title {
        margin: 18px 0 0;
        font-size: 118px;
        font-weight: 900;
        line-height: 0.88;
        letter-spacing: 0;
      }

      .lede {
        max-width: 760px;
        margin: 28px 0 0;
        color: #5b4937;
        font-size: 38px;
        line-height: 1.16;
      }

      .visualizer {
        position: absolute;
        right: -340px;
        bottom: -50px;
        left: 56px;
        box-sizing: border-box;
        height: 318px;
        padding: 10px;
        overflow: hidden;
        border: 1px solid rgba(60, 43, 30, 0.15);
        border-radius: 28px;
        box-shadow: 0 22px 60px rgba(63, 45, 28, 0.18);
        background: rgba(255, 248, 237, 0.64);
      }

      #piano-roll {
        display: block;
        width: 100%;
        height: 100%;
        border-radius: 20px;
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <p class="eyebrow">deterministic counterpoint machine</p>
      <h1 class="title">Fugematon</h1>
      <p class="lede">Generate four-voice fugue for browser playback.</p>
      <div class="visualizer">
        <canvas id="piano-roll"></canvas>
      </div>
    </div>
    <script type="module">
      import { DEFAULT_SELECTION_MODEL, generateScore, PHASE_3_LENGTH_TICKS } from "@fugematon/core";
      import { DEFAULT_PERFORMANCE_PROFILE_ID } from "@fugematon/performance";
      import { drawPianoRoll } from "/src/piano-roll.ts";
      import { createPlaybackModel } from "/src/score.ts";

      const output = generateScore({
        seed: "fugue-smoke",
        lengthTicks: PHASE_3_LENGTH_TICKS,
        selectionModel: DEFAULT_SELECTION_MODEL,
      });
      const model = createPlaybackModel(output, DEFAULT_PERFORMANCE_PROFILE_ID);
      const canvas = document.querySelector("#piano-roll");
      drawPianoRoll(canvas, model, choosePlaybackSecond(model));
      window.__ogReady = true;

      function choosePlaybackSecond(model) {
        let bestSecond = 0;
        let bestScore = -Infinity;

        for (let second = 0; second <= model.totalSeconds; second += 0.25) {
          const activeNotes = model.notes.filter(
            (note) => note.startSecond <= second && second < note.startSecond + note.durationSecond,
          );
          const activeVoices = new Set(activeNotes.map((note) => note.voice)).size;
          const activeEntries = activeNotes.filter((note) => note.entry !== undefined).length;
          const visibleEntries = model.notes.filter(
            (note) =>
              note.entry !== undefined &&
              note.startSecond < second + 10 &&
              note.startSecond + note.durationSecond > second - 14,
          ).length;
          const score = activeVoices * 5 + activeEntries * 3 + visibleEntries;

          if (score > bestScore) {
            bestScore = score;
            bestSecond = second;
          }
        }

        return bestSecond;
      }
    </script>
  </body>
</html>`;

await mkdir(dirname(outputPath), { recursive: true });

const server = await createServer({
  appType: "custom",
  configFile: false,
  root: webRoot,
  server: {
    host: "127.0.0.1",
    middlewareMode: false,
  },
});
server.middlewares.use("/__og-render", async (_request, response) => {
  response.setHeader("Content-Type", "text/html; charset=utf-8");
  response.end(await server.transformIndexHtml("/__og-render", markup));
});

await server.listen(0, "127.0.0.1");
const address = server.httpServer?.address();
if (address === undefined || address === null || typeof address === "string") {
  throw new Error("Vite did not expose a local HTTP port.");
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    deviceScaleFactor: 1,
    viewport: { width: 1200, height: 630 },
  });
  const browserErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    browserErrors.push(error.message);
  });
  await page.goto(`http://127.0.0.1:${address.port}/__og-render`);
  try {
    await page.waitForFunction(() => window.__ogReady === true);
  } catch (error) {
    if (browserErrors.length > 0) {
      throw new Error(`OG render failed: ${browserErrors.join("\n")}`, { cause: error });
    }
    throw error;
  }
  const image = await page.screenshot({ type: "png" });
  if (shouldWritePublic) {
    await writeImage(outputPath, image);
  }
  if (shouldWriteAppDist) {
    await writeImage(appDistOutputPath, image);
  }
} finally {
  await browser.close();
  await server.close();
}

if (shouldWritePublic) {
  console.log("Rendered packages/web/public/og-image.png");
}
if (shouldWriteAppDist) {
  console.log("Rendered packages/web/app-dist/og-image.png");
}

async function writeImage(path, image) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, image);
}
