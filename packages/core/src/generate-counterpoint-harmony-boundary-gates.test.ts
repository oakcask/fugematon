import assert from "node:assert/strict";
import test from "node:test";
import { BASELINE_BEAUTY_DIAGNOSTICS_PROFILE, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

test("generateScore applies baseline beauty boundary seed gates", () => {
  const boundaryProfiles = BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.boundarySeeds;

  for (const [seed, profile] of Object.entries(boundaryProfiles)) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS, selectionModel: "baseline" });
    const textureCosts = output.diagnostics.selectedCandidateEvaluations.map(
      (evaluation) => evaluation.dimensions.texture.cost,
    );

    if ("minCounterSubjectIdentityRetention" in profile) {
      assert.ok(output.diagnostics.counterSubjectIdentityRetention >= profile.minCounterSubjectIdentityRetention);
    }
    if ("maxSharedRhythmOverlapCount" in profile) {
      assert.ok(output.diagnostics.sharedRhythmOverlapCount <= profile.maxSharedRhythmOverlapCount);
    }
    if ("maxLeapRecoveryMisses" in profile) {
      assert.ok(output.diagnostics.leapRecoveryMisses <= profile.maxLeapRecoveryMisses);
    }
    if ("minOrnamentDensity" in profile) {
      assert.ok(output.diagnostics.ornamentDensity >= profile.minOrnamentDensity);
    }
    if ("maxSelectedCandidateTextureCost" in profile) {
      assert.ok(Math.max(...textureCosts) <= profile.maxSelectedCandidateTextureCost);
    }
    if ("minModalContextCount" in profile) {
      assert.ok(output.diagnostics.modalContextCount >= profile.minModalContextCount);
      assert.ok(output.diagnostics.modalCharacteristicToneHits >= profile.minModalCharacteristicToneHits);
      assert.ok(output.diagnostics.modalCadenceHits >= profile.minModalCadenceHits);
    }
  }
});
