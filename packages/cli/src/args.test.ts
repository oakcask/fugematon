import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_PERFORMANCE_PROFILE_ID } from "@fugematon/performance";
import { helpText, parseArgs } from "./args.js";

test("parseArgs parses generate command", () => {
  assert.deepEqual(parseArgs(["generate", "--seed", "bach-001", "--ticks", "7680", "--out", "score.json"]), {
    name: "generate",
    seed: "bach-001",
    lengthTicks: 7680,
    out: "score.json",
  });
});

test("parseArgs parses diagnose command", () => {
  assert.deepEqual(parseArgs(["diagnose", "--seed", "bach-001", "--lengthTicks", "960"]), {
    name: "diagnose",
    seed: "bach-001",
    lengthTicks: 960,
  });
});

test("parseArgs parses midi command", () => {
  assert.deepEqual(parseArgs(["midi", "--seed", "bach-001", "--ticks", "7680", "--out", "score.mid"]), {
    name: "midi",
    seed: "bach-001",
    lengthTicks: 7680,
    out: "score.mid",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
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
    ]),
    {
      name: "midi",
      seed: "bach-001",
      lengthTicks: 7680,
      out: "score.mid",
      performanceProfileId: "strict-counterpoint",
    },
  );
});

test("parseArgs parses review command", () => {
  assert.deepEqual(parseArgs(["review", "--ticks", "960", "--out", "review"]), {
    name: "review",
    lengthTicks: 960,
    out: "review",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
  });
  assert.equal(parseArgs(["review", "--out", "review"]).name, "review");
});

test("parseArgs parses review-ab command", () => {
  assert.deepEqual(
    parseArgs([
      "review-ab",
      "--ticks",
      "960",
      "--out",
      "phase10-review",
      "--baseline-label",
      "current",
      "--variant-label",
      "candidate",
      "--variant-model",
      "phase10-section-local-planner",
    ]),
    {
      name: "review-ab",
      lengthTicks: 960,
      out: "phase10-review",
      baselineLabel: "current",
      variantLabel: "candidate",
      baselineModel: "baseline",
      variantModel: "phase10-section-local-planner",
      performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
    },
  );
  assert.deepEqual(parseArgs(["review-ab", "--out", "phase10-review"]), {
    name: "review-ab",
    lengthTicks: 129600,
    out: "phase10-review",
    baselineLabel: "baseline",
    variantLabel: "variant",
    baselineModel: "baseline",
    variantModel: "phase10-oracle-selection",
    performanceProfileId: DEFAULT_PERFORMANCE_PROFILE_ID,
  });
});

test("helpText includes the Phase 10 A/B review command", () => {
  assert.match(helpText(), /fugematon review-ab --out <directory>/);
  assert.match(helpText(), /--baseline-label <label>/);
  assert.match(helpText(), /--variant-label <label>/);
  assert.match(helpText(), /--variant-model baseline\|phase10-oracle-selection\|phase10-section-local-planner/);
  assert.match(helpText(), /--performance-profile organ-default\|strict-counterpoint/);
});

test("parseArgs rejects invalid arguments", () => {
  assert.throws(() => parseArgs(["missing"]), /unknown command/);
  assert.throws(() => parseArgs(["generate", "--seed", "bach-001"]), /missing --ticks/);
  assert.throws(() => parseArgs(["midi", "--seed", "bach-001", "--ticks", "960"]), /missing --out/);
  assert.throws(() => parseArgs(["review", "--ticks", "0", "--out", "review"]), /--ticks/);
  assert.throws(() => parseArgs(["review", "--ticks", "960"]), /missing --out/);
  assert.throws(() => parseArgs(["review-ab", "--ticks", "0", "--out", "review"]), /--ticks/);
  assert.throws(() => parseArgs(["review-ab", "--ticks", "960"]), /missing --out/);
  assert.throws(
    () => parseArgs(["review-ab", "--ticks", "960", "--out", "review", "--variant-model", "unknown"]),
    /--variant-model/,
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
});
