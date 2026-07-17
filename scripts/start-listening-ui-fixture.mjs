import { startListeningServer } from "../packages/cli/dist/listening-server.js";
import { writeAbReviewBundle } from "../packages/cli/dist/review.js";

const fixtureDirectory = "samples/listening-ui-fixture";

await writeAbReviewBundle(
  fixtureDirectory,
  1920,
  "baseline-fixture",
  "variant-fixture",
  "baseline",
  "section-local-planner",
  undefined,
  undefined,
  undefined,
  ["fugue-smoke", "minor-entry"],
);

const listening = await startListeningServer({ bundleDirectory: fixtureDirectory, port: 4174 });
console.log(`Listening fixture ready: ${listening.url}`);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, async () => {
    await listening.close();
    process.exit(0);
  });
}
