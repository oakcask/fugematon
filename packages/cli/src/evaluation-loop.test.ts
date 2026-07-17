import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { PAIRWISE_RESPONSE_SCHEMA, type PairwiseBundleManifest, type PairwiseResponseSet } from "@fugematon/evaluation";
import { runEvaluationLearningLoop } from "./evaluation-loop.js";
import { writeAbReviewBundle, writeQueuedAbReviewBundle } from "./review.js";

test("validated labels reproduce train, shadow, and next-review artifacts without mutating the bundle", async () => {
  const root = await mkdtemp(join(tmpdir(), "evaluation-loop-"));
  try {
    await writeAbReviewBundle(
      root,
      960,
      "baseline-fixture",
      "variant-fixture",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["loop-a", "loop-b", "loop-c", "loop-d"],
    );
    const bundleFile = join(root, "blind-session.json");
    const responsesFile = join(root, "fixture-responses.json");
    const bundleBytes = await readFile(bundleFile);
    const bundle = JSON.parse(bundleBytes.toString("utf8")) as PairwiseBundleManifest;
    const responses: PairwiseResponseSet = {
      schema: PAIRWISE_RESPONSE_SCHEMA,
      bundleId: bundle.bundleId,
      responses: bundle.comparisons.map((comparison, index) => ({
        comparisonId: comparison.id,
        preferredSide: index % 2 === 0 ? "a" : "b",
        labelSource: "agent",
        compositionReasonTags: ["entry-clarity"],
      })),
    };
    await writeFile(responsesFile, `${JSON.stringify(responses)}\n`);
    const first = join(root, "loop-first");
    const second = join(root, "loop-second");
    for (const outDirectory of [first, second]) {
      await runEvaluationLearningLoop({
        bundleFile,
        responsesFile,
        outDirectory,
        modelVersion: "fixture-shadow-v1",
        corpusManifestVersion: "fixture-corpus-v1",
        trainingSeed: 17,
        queueLimit: 3,
      });
    }
    for (const file of [
      "label-summary.json",
      "training-summary.json",
      "model.json",
      "shadow-summary.json",
      "next-review-queue.json",
    ]) {
      assert.deepEqual(await readFile(join(first, file)), await readFile(join(second, file)));
    }
    const reorderedResponsesFile = join(root, "fixture-responses-reordered.json");
    await writeFile(
      reorderedResponsesFile,
      JSON.stringify({
        responses: [...responses.responses].reverse().map((response) => ({
          compositionReasonTags: response.compositionReasonTags,
          labelSource: response.labelSource,
          preferredSide: response.preferredSide,
          comparisonId: response.comparisonId,
        })),
        bundleId: responses.bundleId,
        schema: responses.schema,
      }),
    );
    const reordered = join(root, "loop-reordered");
    await runEvaluationLearningLoop({
      bundleFile,
      responsesFile: reorderedResponsesFile,
      outDirectory: reordered,
      modelVersion: "fixture-shadow-v1",
      corpusManifestVersion: "fixture-corpus-v1",
      trainingSeed: 17,
      queueLimit: 3,
    });
    assert.deepEqual(await readFile(join(first, "model.json")), await readFile(join(reordered, "model.json")));
    const shadow = JSON.parse(await readFile(join(first, "shadow-summary.json"), "utf8")) as {
      generatorOutputInvariant: boolean;
      comparisons: unknown[];
    };
    assert.equal(shadow.generatorOutputInvariant, true);
    assert.equal(shadow.comparisons.length, 4);
    const adoptionReviewFile = join(root, "adoption-review.json");
    const comparisonRun = join(root, "loop-comparison");
    await runEvaluationLearningLoop({
      bundleFile,
      responsesFile,
      outDirectory: comparisonRun,
      modelVersion: "fixture-shadow-v1",
      corpusManifestVersion: "fixture-corpus-v1",
      trainingSeed: 17,
      queueLimit: 3,
      previousShadowFile: join(first, "shadow-summary.json"),
      adoptionReviewFile,
    });
    const comparedShadow = JSON.parse(await readFile(join(comparisonRun, "shadow-summary.json"), "utf8")) as {
      comparisons: { preferenceFlipped: boolean }[];
    };
    assert.ok(comparedShadow.comparisons.every((comparison) => comparison.preferenceFlipped === false));
    const adoptionReview = JSON.parse(await readFile(adoptionReviewFile, "utf8")) as {
      automaticPromotion: boolean;
      status: string;
      criteria: { holdoutImprovesBaseline: null };
    };
    assert.equal(adoptionReview.automaticPromotion, false);
    assert.equal(adoptionReview.status, "not-ready");
    assert.equal(adoptionReview.criteria.holdoutImprovesBaseline, null);
    const queuedBundleDirectory = join(root, "queued-review");
    await writeQueuedAbReviewBundle({
      queueFile: join(first, "next-review-queue.json"),
      sourceBundleFile: bundleFile,
      hiddenMappingFile: join(root, "hidden-side-mapping.json"),
      outDirectory: queuedBundleDirectory,
    });
    const queuedBundle = JSON.parse(
      await readFile(join(queuedBundleDirectory, "blind-session.json"), "utf8"),
    ) as PairwiseBundleManifest;
    const queue = JSON.parse(await readFile(join(first, "next-review-queue.json"), "utf8")) as {
      items: { seed: string }[];
    };
    assert.equal(queuedBundle.comparisons.length, 3);
    assert.deepEqual(
      queuedBundle.comparisons.map((comparison) => comparison.context.seed),
      queue.items.map((item) => item.seed),
    );
    assert.deepEqual(await readFile(bundleFile), bundleBytes);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("evaluation loop rejects changed ScoreEvent or MIDI assets before shadow inference", async () => {
  const root = await mkdtemp(join(tmpdir(), "evaluation-loop-invariant-"));
  try {
    await writeAbReviewBundle(
      root,
      960,
      "baseline-fixture",
      "variant-fixture",
      "baseline",
      "section-local-planner",
      undefined,
      undefined,
      undefined,
      ["invariant-seed-a", "invariant-seed-b"],
    );
    const bundleFile = join(root, "blind-session.json");
    const bundle = JSON.parse(await readFile(bundleFile, "utf8")) as PairwiseBundleManifest;
    const responsesFile = join(root, "responses.json");
    const responses: PairwiseResponseSet = {
      schema: PAIRWISE_RESPONSE_SCHEMA,
      bundleId: bundle.bundleId,
      responses: bundle.comparisons.map((comparison, index) => ({
        comparisonId: comparison.id,
        preferredSide: index === 0 ? "a" : "b",
      })),
    };
    await writeFile(responsesFile, JSON.stringify(responses));
    await writeFile(join(root, bundle.comparisons[0]!.sides.a.scoreAsset!), "changed score bytes");
    await assert.rejects(
      runEvaluationLearningLoop({
        bundleFile,
        responsesFile,
        outDirectory: join(root, "loop"),
        modelVersion: "fixture-shadow-v1",
        corpusManifestVersion: "fixture-corpus-v1",
        trainingSeed: 17,
        queueLimit: 2,
      }),
      /evaluation\.shadow\.asset-hash-mismatch/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
