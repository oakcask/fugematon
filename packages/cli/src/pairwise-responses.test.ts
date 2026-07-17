import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PAIRWISE_RESPONSE_SCHEMA } from "@fugematon/evaluation";
import { mergePairwiseResponseFiles } from "./pairwise-responses.js";
import { writeAbReviewBundle } from "./review.js";

test("pairwise response CLI workflow validates, deduplicates, merges, and summarizes labels", async () => {
  const root = await mkdtemp(join(tmpdir(), "fugematon-pairwise-merge-"));
  try {
    await writeAbReviewBundle(
      root,
      960,
      "baseline",
      "variant",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["fugue-smoke", "minor-entry"],
    );
    const bundle = JSON.parse(await readFile(join(root, "blind-session.json"), "utf8")) as {
      bundleId: string;
      comparisons: { id: string }[];
    };
    const first = {
      schema: PAIRWISE_RESPONSE_SCHEMA,
      bundleId: bundle.bundleId,
      responses: [{ comparisonId: bundle.comparisons[0]!.id, preferredSide: "a" }],
    };
    const second = {
      schema: PAIRWISE_RESPONSE_SCHEMA,
      bundleId: bundle.bundleId,
      responses: [
        { comparisonId: bundle.comparisons[0]!.id, preferredSide: "a" },
        { comparisonId: bundle.comparisons[1]!.id, preferredSide: "tie" },
      ],
    };
    await writeFile(join(root, "first.json"), JSON.stringify(first));
    await writeFile(join(root, "second.json"), JSON.stringify(second));
    await mergePairwiseResponseFiles({
      bundleFile: join(root, "blind-session.json"),
      responseFiles: [join(root, "first.json"), join(root, "second.json")],
      outFile: join(root, "merged.json"),
      summaryFile: join(root, "summary.json"),
    });
    const merged = JSON.parse(await readFile(join(root, "merged.json"), "utf8")) as { responses: unknown[] };
    const summary = JSON.parse(await readFile(join(root, "summary.json"), "utf8")) as {
      responseCount: number;
      tieCount: number;
    };
    assert.equal(merged.responses.length, 2);
    assert.deepEqual(summary, { ...summary, responseCount: 2, tieCount: 1 });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
