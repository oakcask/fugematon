import assert from "node:assert/strict";
import test from "node:test";
import { parseArgs } from "./args.js";

test("parseArgs parses generate command", () => {
  assert.deepEqual(
    parseArgs(["generate", "--seed", "bach-001", "--ticks", "7680", "--out", "score.json"]),
    {
      name: "generate",
      seed: "bach-001",
      lengthTicks: 7680,
      out: "score.json",
    },
  );
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
  });
});

test("parseArgs rejects invalid arguments", () => {
  assert.throws(() => parseArgs(["missing"]), /unknown command/);
  assert.throws(() => parseArgs(["generate", "--seed", "bach-001"]), /missing --ticks/);
  assert.throws(() => parseArgs(["midi", "--seed", "bach-001", "--ticks", "960"]), /missing --out/);
  assert.throws(
    () => parseArgs(["generate", "--seed", "bach-001", "--ticks", "0"]),
    /--ticks/,
  );
});
