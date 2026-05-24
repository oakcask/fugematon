import type { CandidateEvaluation, SelectionModel } from "../events.js";

export function candidateSelectionScore(evaluation: CandidateEvaluation, selectionModel: SelectionModel): number {
  if (selectionModel === "baseline") {
    return evaluation.totalCost;
  }

  return (
    evaluation.totalCost +
    candidateOracleSelectionRiskAdjustment(evaluation) +
    sectionLocalPlannerSelectionRiskAdjustment(evaluation, selectionModel)
  );
}

function candidateOracleSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  if (evaluation.hardFailures.length > 0) {
    return 0;
  }
  if (evaluation.dimensions.harmony.features.modalContextCount > 0) {
    return entryHarmonySelectionRiskAdjustment(evaluation);
  }

  return (
    entryHarmonySelectionRiskAdjustment(evaluation) +
    stepwiseFixationSelectionRiskAdjustment(evaluation) +
    voicePairLockstepSelectionRiskAdjustment(evaluation) +
    melodyPreservationRiskAdjustment(evaluation)
  );
}

function entryHarmonySelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const { entrySupportInstabilityCount, severeEntryIntervalCount, unresolvedSevereEntryIntervalCount } =
    evaluation.dimensions.harmony.features;
  const unresolvedDuration = evaluation.dimensions.harmony.features.qualityVectorUnresolvedEntrySevereIntervalDuration;

  return (
    entrySupportInstabilityCount * 1.5 +
    severeEntryIntervalCount * 3 +
    unresolvedSevereEntryIntervalCount * 5 +
    unresolvedDuration * 0.6
  );
}

function stepwiseFixationSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const { selectedFreeCounterpointStepwiseFixationCost, freeCounterpointRepeatedDegreePatternCount } =
    evaluation.dimensions.melody.features;

  return selectedFreeCounterpointStepwiseFixationCost * 1.5 + freeCounterpointRepeatedDegreePatternCount * 0.01;
}

function voicePairLockstepSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const {
    selectedVoicePairLockstepSelectionCost,
    samePitchOverlapCount,
    qualityVectorPitchClassUnisonDuration,
    qualityVectorDurationBasedLockstep,
  } = evaluation.dimensions.texture.features;

  return (
    selectedVoicePairLockstepSelectionCost * 2.2 +
    samePitchOverlapCount * 3 +
    qualityVectorPitchClassUnisonDuration * 0.65 +
    qualityVectorDurationBasedLockstep * 0.85
  );
}

function melodyPreservationRiskAdjustment(evaluation: CandidateEvaluation): number {
  return evaluation.dimensions.melody.features.leapRecoveryMisses * 20;
}

function sectionLocalPlannerSelectionRiskAdjustment(
  evaluation: CandidateEvaluation,
  selectionModel: SelectionModel,
): number {
  if (selectionModel !== "section-local-planner" || evaluation.hardFailures.length > 0) {
    return 0;
  }

  const highSoloTextureSections = evaluation.explanations.sections.filter((section) => section.soloTextureRisk >= 6);
  const soloTextureRisk = highSoloTextureSections.reduce((sum, section) => sum + section.soloTextureRisk, 0);

  return soloTextureRisk * 12;
}
