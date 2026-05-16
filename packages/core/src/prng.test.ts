import assert from "node:assert/strict";
import test from "node:test";
import { seedToUint32State, Xoshiro128StarStar } from "./prng.js";

test("seedToUint32State is deterministic and non-zero", () => {
  assert.deepEqual(seedToUint32State("bach-001"), seedToUint32State("bach-001"));
  assert.notDeepEqual(seedToUint32State("bach-001"), [0, 0, 0, 0]);
});

test("xoshiro128** keeps a fixed output sequence", () => {
  const rng = Xoshiro128StarStar.fromSeed("bach-001");

  assert.deepEqual(
    Array.from({ length: 8 }, () => rng.nextUint32()),
    [1550595686, 4223825271, 671688997, 4049743854, 3153748789, 1021973004, 525920850, 3358419166],
  );
});

test("helper methods are deterministic", () => {
  const rng = Xoshiro128StarStar.fromSeed("fugematon");

  assert.equal(rng.nextIntRange(10, 20), 10);
  assert.deepEqual(rng.shuffle(["s", "a", "t", "b"]), ["b", "a", "t", "s"]);
  assert.equal(
    rng.chooseWeighted([
      { value: "low", weight: 1 },
      { value: "high", weight: 9 },
    ]),
    "high",
  );
});
