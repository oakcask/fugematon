import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { evaluateReviewGatePolicy } from "./review-gate.js";

test("generateScore adds guarded section-local planner candidates", () => {
  const blockerSeeds = ["modal-cadence", "dense-modal"] as const;
  let baselineHighSoloTextureSections = 0;
  let variantHighSoloTextureSections = 0;
  let baselineSoloTextureRisk = 0;
  let variantSoloTextureRisk = 0;

  for (const seed of blockerSeeds) {
    const baseline = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "candidate-oracle-selection",
    });
    const variant = generateScore({
      seed,
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const baselineGate = evaluateReviewGatePolicy(seed, baseline.diagnostics);
    const variantGate = evaluateReviewGatePolicy(seed, variant.diagnostics);
    const baselineRisks = baseline.diagnostics.selectedCandidateEvaluations.flatMap((evaluation) =>
      evaluation.explanations.sections.map((section) => section.soloTextureRisk),
    );
    const variantRisks = variant.diagnostics.selectedCandidateEvaluations.flatMap((evaluation) =>
      evaluation.explanations.sections.map((section) => section.soloTextureRisk),
    );

    assert.equal(baselineGate.adoptionReady, true);
    assert.equal(variantGate.adoptionReady, true);
    assert.equal(
      variant.diagnostics.candidatePoolOracle.schemaVersion,
      baseline.diagnostics.candidatePoolOracle.schemaVersion,
    );
    assert.ok(
      variant.diagnostics.candidatePoolOracle.candidateCount >= baseline.diagnostics.candidatePoolOracle.candidateCount,
    );
    assert.ok(variant.diagnostics.samePitchOverlapCount <= baseline.diagnostics.samePitchOverlapCount + 16);
    assert.ok(variant.diagnostics.unisonOverlapCount <= baseline.diagnostics.unisonOverlapCount + 25);
    assert.ok(variant.diagnostics.sharedRhythmOverlapCount <= baseline.diagnostics.sharedRhythmOverlapCount + 45);
    assert.ok(variant.diagnostics.leapRecoveryMisses <= baseline.diagnostics.leapRecoveryMisses + 70);
    assert.ok(
      variant.diagnostics.counterSubjectIdentityRetention >=
        baseline.diagnostics.counterSubjectIdentityRetention - 0.055,
    );
    assert.ok(
      variant.diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio <=
        baseline.diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio + 0.18,
    );

    baselineHighSoloTextureSections += baselineRisks.filter((risk) => risk >= 6).length;
    variantHighSoloTextureSections += variantRisks.filter((risk) => risk >= 6).length;
    baselineSoloTextureRisk += baselineRisks.reduce((sum, risk) => sum + risk, 0);
    variantSoloTextureRisk += variantRisks.reduce((sum, risk) => sum + risk, 0);
  }

  assert.ok(variantHighSoloTextureSections < baselineHighSoloTextureSections);
  assert.ok(variantSoloTextureRisk < baselineSoloTextureRisk);
});
