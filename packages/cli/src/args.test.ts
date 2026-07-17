import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID, DEFAULT_WRITING_PROFILE_ID } from "@fugematon/core";
import { DEFAULT_PERFORMANCE_PROFILE_ID } from "@fugematon/performance";
import { helpText, parseArgs } from "./args.js";

test("parseArgs parses generate command", () => {
  assert.deepEqual(parseArgs(["generate", "--seed", "bach-001", "--ticks", "7680", "--out", "score.json"]), {
    name: "generate",
    seed: "bach-001",
    lengthTicks: 7680,
    out: "score.json",
    writingProfileId: DEFAULT_WRITING_PROFILE_ID,
  });
});

test("parseArgs parses diagnose command", () => {
  assert.deepEqual(parseArgs(["diagnose", "--seed", "bach-001", "--lengthTicks", "960"]), {
    name: "diagnose",
    seed: "bach-001",
    lengthTicks: 960,
    writingProfileId: DEFAULT_WRITING_PROFILE_ID,
  });
});

test("parseArgs parses midi command", () => {
  assert.deepEqual(parseArgs(["midi", "--seed", "bach-001", "--ticks", "7680", "--out", "score.mid"]), {
    name: "midi",
    seed: "bach-001",
    lengthTicks: 7680,
    out: "score.mid",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
    writingProfileId: DEFAULT_WRITING_PROFILE_ID,
  });
  assert.deepEqual(
    parseArgs([
      "midi",
      "--seed",
      "bach-001",
      "--ticks",
      "7680",
      "--out",
      "score.mid",
      "--performance-profile",
      "strict-counterpoint",
      "--writing-profile",
      "piano-two-hand",
    ]),
    {
      name: "midi",
      seed: "bach-001",
      lengthTicks: 7680,
      out: "score.mid",
      performanceProfileId: "strict-counterpoint",
      writingProfileId: "piano-two-hand",
    },
  );
});

test("parseArgs parses review command", () => {
  assert.deepEqual(parseArgs(["review", "--ticks", "960", "--out", "review"]), {
    name: "review",
    lengthTicks: 960,
    out: "review",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
    writingProfileId: DEFAULT_WRITING_PROFILE_ID,
    constraintProfileId: DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
    seedList: undefined,
  });
  assert.deepEqual(
    parseArgs([
      "review",
      "--ticks",
      "960",
      "--out",
      "review",
      "--constraint-profile",
      "entry-balanced",
      "--seed-list",
      "fugue-smoke, modal-cadence",
    ]),
    {
      name: "review",
      lengthTicks: 960,
      out: "review",
      performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
      writingProfileId: DEFAULT_WRITING_PROFILE_ID,
      constraintProfileId: "entry-balanced",
      seedList: ["fugue-smoke", "modal-cadence"],
    },
  );
  assert.equal(parseArgs(["review", "--out", "review"]).name, "review");
});

test("parseArgs parses review-ab command", () => {
  assert.deepEqual(
    parseArgs([
      "review-ab",
      "--ticks",
      "960",
      "--out",
      "selection-review",
      "--baseline-label",
      "current",
      "--variant-label",
      "candidate",
      "--variant-model",
      "section-local-planner",
    ]),
    {
      name: "review-ab",
      lengthTicks: 960,
      out: "selection-review",
      baselineLabel: "current",
      variantLabel: "candidate",
      baselineModel: "baseline",
      variantModel: "section-local-planner",
      performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
      writingProfileId: DEFAULT_WRITING_PROFILE_ID,
      constraintProfileId: DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
    },
  );
  assert.deepEqual(parseArgs(["review-ab", "--out", "selection-review"]), {
    name: "review-ab",
    lengthTicks: 129600,
    out: "selection-review",
    baselineLabel: "baseline",
    variantLabel: "variant",
    baselineModel: "baseline",
    variantModel: "candidate-oracle-selection",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
    writingProfileId: DEFAULT_WRITING_PROFILE_ID,
    constraintProfileId: DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
  });
});

test("parseArgs rejects removed review-ab model names", () => {
  assert.throws(
    () => parseArgs(["review-ab", "--out", "selection-review", "--baseline-model", "removed-oracle-selection"]),
    /--baseline-model/,
  );
  assert.throws(
    () => parseArgs(["review-ab", "--out", "selection-review", "--variant-model", "removed-section-local-planner"]),
    /--variant-model/,
  );
});

test("helpText includes the selection A/B review command", () => {
  assert.match(helpText(), /fugematon review-ab --out <directory>/);
  assert.match(helpText(), /--baseline-label <label>/);
  assert.match(helpText(), /--variant-label <label>/);
  assert.match(helpText(), /--variant-model baseline\|candidate-oracle-selection\|section-local-planner/);
  assert.match(helpText(), /--performance-profile organ-default\|strict-counterpoint/);
  assert.match(helpText(), /--writing-profile four-voice-default\|piano-two-hand/);
  assert.match(helpText(), /--constraint-profile current\|entry-soft\|entry-balanced\|entry-strict\|entry-strict-leap/);
  assert.match(helpText(), /fugematon listen --bundle <directory>/);
  assert.match(helpText(), /fugematon evaluation-loop --bundle <file>/);
  assert.match(helpText(), /fugematon review-ab-queue --queue <file>/);
  assert.match(helpText(), /fugematon reference-import --manifest <file>/);
});

test("parseArgs parses evaluation, listening, and reference corpus commands", () => {
  assert.deepEqual(
    parseArgs([
      "evaluation-loop",
      "--bundle",
      "bundle.json",
      "--responses",
      "responses.json",
      "--out",
      "loop",
      "--training-seed",
      "17",
      "--queue-limit",
      "8",
    ]),
    {
      name: "evaluation-loop",
      bundleFile: "bundle.json",
      responsesFile: "responses.json",
      out: "loop",
      modelVersion: "shadow-v1",
      corpusManifestVersion: "reference-corpus-v1",
      trainingSeed: 17,
      queueLimit: 8,
    },
  );
  assert.deepEqual(parseArgs(["listen", "--bundle", "review", "--read-only", "true", "--port", "4174"]), {
    name: "listen",
    bundleDirectory: "review",
    readOnly: true,
    port: 4174,
  });
  assert.deepEqual(parseArgs(["reference-validate", "--manifest", "manifest.json"]), {
    name: "reference-validate",
    manifestFile: "manifest.json",
  });
  assert.deepEqual(
    parseArgs([
      "review-ab-queue",
      "--queue",
      "queue.json",
      "--source-bundle",
      "bundle.json",
      "--hidden-mapping",
      "mapping.json",
      "--out",
      "next-review",
    ]),
    {
      name: "review-ab-queue",
      queueFile: "queue.json",
      sourceBundleFile: "bundle.json",
      hiddenMappingFile: "mapping.json",
      out: "next-review",
    },
  );
  assert.deepEqual(
    parseArgs([
      "reference-import",
      "--manifest",
      "manifest.json",
      "--work-id",
      "fixture",
      "--source",
      "source.krn",
      "--out",
      "reference-output",
    ]),
    {
      name: "reference-import",
      manifestFile: "manifest.json",
      workId: "fixture",
      sourceFile: "source.krn",
      out: "reference-output",
    },
  );
});

test("parseArgs parses pairwise response merge workflow", () => {
  assert.deepEqual(
    parseArgs([
      "pairwise-responses-merge",
      "--bundle",
      "bundle.json",
      "--responses",
      "first.json,second.json",
      "--out",
      "merged.json",
      "--summary-out",
      "summary.json",
    ]),
    {
      name: "pairwise-responses-merge",
      bundleFile: "bundle.json",
      responseFiles: ["first.json", "second.json"],
      out: "merged.json",
      summaryOut: "summary.json",
    },
  );
});

test("parseArgs accepts explicit previous-shadow comparison and separate adoption review", () => {
  const command = parseArgs([
    "evaluation-loop",
    "--bundle",
    "bundle.json",
    "--responses",
    "responses.json",
    "--out",
    "loop",
    "--previous-shadow",
    "previous.json",
    "--adoption-review",
    "adoption.json",
  ]);
  assert.equal(command.name, "evaluation-loop");
  if (command.name !== "evaluation-loop") return;
  assert.equal(command.previousShadowFile, "previous.json");
  assert.equal(command.adoptionReviewFile, "adoption.json");
});

test("parseArgs rejects invalid arguments", () => {
  assert.throws(() => parseArgs(["missing"]), /unknown command/);
  assert.throws(() => parseArgs(["generate", "--seed", "bach-001"]), /missing --ticks/);
  assert.throws(() => parseArgs(["midi", "--seed", "bach-001", "--ticks", "960"]), /missing --out/);
  assert.throws(() => parseArgs(["review", "--ticks", "0", "--out", "review"]), /--ticks/);
  assert.throws(() => parseArgs(["review", "--out", "review", "--seed-list", ","]), /--seed-list/);
  assert.throws(() => parseArgs(["review", "--ticks", "960"]), /missing --out/);
  assert.throws(() => parseArgs(["review-ab", "--ticks", "0", "--out", "review"]), /--ticks/);
  assert.throws(() => parseArgs(["review-ab", "--ticks", "960"]), /missing --out/);
  assert.throws(
    () => parseArgs(["review-ab", "--ticks", "960", "--out", "review", "--variant-model", "unknown"]),
    /--variant-model/,
  );
  assert.throws(
    () => parseArgs(["review", "--out", "review", "--constraint-profile", "unknown"]),
    /--constraint-profile/,
  );
  assert.throws(
    () =>
      parseArgs([
        "midi",
        "--seed",
        "bach-001",
        "--ticks",
        "960",
        "--out",
        "score.mid",
        "--performance-profile",
        "unknown",
      ]),
    /--performance-profile/,
  );
  assert.throws(() => parseArgs(["generate", "--seed", "bach-001", "--ticks", "0"]), /--ticks/);
  assert.throws(
    () => parseArgs(["generate", "--seed", "bach-001", "--ticks", "960", "--writing-profile", "unknown"]),
    /--writing-profile/,
  );
});
