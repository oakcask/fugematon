import { defineConfig, devices } from "@playwright/test";

const webServer =
  process.env.FUGEMATON_PLAYWRIGHT_EXTERNAL_SERVER === "1"
    ? undefined
    : {
        command: "pnpm --filter @fugematon/web exec vite preview --host 127.0.0.1 --port 4173",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      };

export default defineConfig({
  testDir: "./tests",
  testMatch: "ui-inspection.spec.ts",
  outputDir: "test-results/prod-ui-inspection",
  timeout: 180_000,
  preserveOutput: "always",
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer,
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
