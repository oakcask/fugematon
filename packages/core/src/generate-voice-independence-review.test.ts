import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";
import { VOICE_INDEPENDENCE_REVIEW_SEEDS } from "./generate-score-beauty-adoption-test-helpers.js";

test("voice independence review seeds keep voice-pair local evidence reviewable", () => {
  for (const seed of VOICE_INDEPENDENCE_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const vector = output.diagnostics.qualityVector;
    const pitchClassAxis = vector.axes.find((axis) => axis.axis === "pitchClassUnisonDuration");
    const lockstepAxis = vector.axes.find((axis) => axis.axis === "durationBasedLockstep");

    assert.equal(pitchClassAxis?.status, "review-required", `${seed} should keep pitch-class unison review signal`);
    assert.equal(lockstepAxis?.status, "review-required", `${seed} should keep lockstep review signal`);
    assert.ok(vector.voicePairUnisons.every((summary) => summary.activeDurationTicks >= 0));
    assert.ok(
      vector.voicePairFunctions.some(
        (summary) =>
          summary.mechanicalCouplingTicks +
            summary.functionalReinforcementTicks +
            summary.pitchClassColorDoublingTicks >
          0,
      ),
    );
    assert.ok(
      vector.localSentinels
        .filter((sentinel) => sentinel.kind === "long-pitch-class-unison")
        .every((sentinel) => sentinel.voicePair !== undefined && sentinel.durationTicks > 0),
    );
  }
});
