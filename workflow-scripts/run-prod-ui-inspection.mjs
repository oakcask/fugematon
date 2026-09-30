import { spawn } from "node:child_process";

const host = "127.0.0.1";
const port = 4173;
const url = `http://${host}:${port}`;
const startupTimeoutMs = 120_000;
const shutdownTimeoutMs = 2_000;
const expectedProdUiTestCount = 10;
const playwrightExitGraceMs = 5_000;

const preview = spawn(
  "pnpm",
  ["--filter", "@fugematon/web", "exec", "vite", "preview", "--host", host, "--port", String(port)],
  {
    detached: process.platform !== "win32",
    stdio: "inherit",
  },
);

let previewExited = false;
let stoppingPreview = false;
let previewExitResolve;
const previewExit = new Promise((resolve) => {
  previewExitResolve = resolve;
});

preview.on("exit", (code, signal) => {
  previewExited = true;
  previewExitResolve();
  if (!stoppingPreview && code !== null && code !== 0) {
    console.error(
      `ci.prod-ui.preview-exited: Vite preview exited with code ${code}; why=production UI inspection needs the static app server to stay alive; action=rerun pnpm build and node workflow-scripts/run-prod-ui-inspection.mjs locally, then inspect the preview startup output`,
    );
  }
  if (!stoppingPreview && signal !== null) {
    console.error(
      `ci.prod-ui.preview-signaled: Vite preview exited from signal ${signal}; why=production UI inspection cannot continue without the static app server; action=check whether another process or timeout stopped the preview server`,
    );
  }
});

const stopPreview = async () => {
  if (previewExited) {
    return;
  }

  stoppingPreview = true;
  signalPreview("SIGTERM");
  const exited = await Promise.race([previewExit.then(() => true), sleep(shutdownTimeoutMs).then(() => false)]);
  if (exited) {
    return;
  }

  signalPreview("SIGKILL");
  preview.unref();
};

const signalPreview = (signal) => {
  try {
    if (process.platform === "win32") {
      preview.kill(signal);
      return;
    }
    process.kill(-preview.pid, signal);
  } catch {
    preview.kill(signal);
  }
};

process.on("SIGINT", async () => {
  await stopPreview();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await stopPreview();
  process.exit(143);
});

try {
  await waitForPreview();
  const result = await runPlaywright();
  await stopPreview();
  process.exitCode = result;
} catch (error) {
  await stopPreview();
  console.error(
    `ci.prod-ui.inspection-wrapper-failed: ${error instanceof Error ? error.message : String(error)}; why=production UI inspection must prove the built app renders before deploy; action=rerun node workflow-scripts/run-prod-ui-inspection.mjs after pnpm build and inspect the first failing step`,
  );
  process.exitCode = 1;
}

async function waitForPreview() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < startupTimeoutMs) {
    if (previewExited) {
      throw new Error("preview server exited before becoming ready");
    }

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) {
        return;
      }
    } catch {
      await sleep(500);
    }
  }

  throw new Error(`preview server did not become ready at ${url}`);
}

function runPlaywright() {
  return new Promise((resolve) => {
    let resolved = false;
    let passedProdUiTests = 0;
    let forceExitTimer;
    const testRun = spawn(
      "pnpm",
      ["exec", "playwright", "test", "--config", "playwright.prod.config.ts", "--project=chromium"],
      {
        detached: process.platform !== "win32",
        env: {
          ...process.env,
          FUGEMATON_PLAYWRIGHT_EXTERNAL_SERVER: "1",
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const observePassLine = (line) => {
      if (!/\u2713\s+\d+\s+\[chromium\]/.test(line)) {
        return;
      }

      passedProdUiTests += 1;
      if (passedProdUiTests < expectedProdUiTestCount || forceExitTimer !== undefined) {
        return;
      }

      forceExitTimer = setTimeout(async () => {
        if (resolved) {
          return;
        }

        resolved = true;
        console.error(
          "ci.prod-ui.playwright-forced-exit: Playwright did not exit after all production UI smoke tests passed; why=the deploy gate must not hang after successful browser assertions; action=inspect Playwright or browser process cleanup, then remove this wrapper fallback when the runner exits cleanly",
        );
        signalProcessGroup(testRun, "SIGTERM");
        await Promise.race([onceExit(testRun), sleep(shutdownTimeoutMs)]);
        signalProcessGroup(testRun, "SIGKILL");
        testRun.unref();
        testRun.stdout?.destroy();
        testRun.stderr?.destroy();
        resolve(0);
      }, playwrightExitGraceMs);
    };
    observePlaywrightOutput(testRun.stdout, process.stdout, observePassLine);
    observePlaywrightOutput(testRun.stderr, process.stderr, observePassLine);

    testRun.on("exit", (code, signal) => {
      if (forceExitTimer !== undefined) {
        clearTimeout(forceExitTimer);
      }
      if (resolved) {
        return;
      }
      resolved = true;
      if (signal !== null) {
        console.error(
          `ci.prod-ui.playwright-signaled: Playwright exited from signal ${signal}; why=production UI inspection did not complete cleanly; action=rerun node workflow-scripts/run-prod-ui-inspection.mjs and inspect Playwright output`,
        );
        resolve(1);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function observePlaywrightOutput(stream, target, onLine) {
  let buffered = "";
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    target.write(text);
    buffered += text;
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() ?? "";
    for (const line of lines) {
      onLine(line);
    }
  });
}

function onceExit(child) {
  return new Promise((resolve) => {
    child.once("exit", resolve);
  });
}

function signalProcessGroup(child, signal) {
  try {
    if (process.platform === "win32") {
      child.kill(signal);
      return;
    }
    process.kill(-child.pid, signal);
  } catch {
    child.kill(signal);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
