import type { CandidateEvaluation, SelectionModel } from "../events.js";
import { CANDIDATE_SELECTION_RISK_WEIGHTS } from "./evaluation-model.js";

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
    return entryHarmonySelectionRiskAdjustment(evaluation) + stepwiseFixationSelectionRiskAdjustment(evaluation) * 0.35;
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
  const unresolvedAccentedEntryClashCount =
    evaluation.dimensions.harmony.features.unresolvedAccentedEntryClashCount ?? 0;
  const sustainedSevereVerticalDissonanceCount =
    evaluation.dimensions.harmony.features.sustainedSevereVerticalDissonanceCount ?? 0;
  const harmonicSonorityReviewRequiredWindowCount =
    evaluation.dimensions.harmony.features.harmonicSonorityReviewRequiredWindowCount ?? 0;
  const harmonicSonorityGeneratorResponseWindowCount =
    evaluation.dimensions.harmony.features.harmonicSonorityGeneratorResponseWindowCount ?? 0;

  return (
    entrySupportInstabilityCount * CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.instability +
    severeEntryIntervalCount * CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.severeInterval +
    unresolvedSevereEntryIntervalCount * CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.unresolvedSevereInterval +
    unresolvedDuration * CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.unresolvedDuration +
    unresolvedAccentedEntryClashCount * CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.unresolvedAccentedEntryClash +
    sustainedSevereVerticalDissonanceCount *
      CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.sustainedSevereVerticalDissonance +
    harmonicSonorityReviewRequiredWindowCount *
      CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.harmonicSonorityReviewWindow +
    harmonicSonorityGeneratorResponseWindowCount *
      CANDIDATE_SELECTION_RISK_WEIGHTS.entryHarmony.harmonicSonorityGeneratorWindow
  );
}

function stepwiseFixationSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  return (
    evaluation.dimensions.melody.features.selectedFreeCounterpointStepwiseFixationCost *
    CANDIDATE_SELECTION_RISK_WEIGHTS.stepwiseFixation.selectedCost
  );
}

function voicePairLockstepSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const {
    selectedVoicePairLockstepSelectionCost,
    samePitchOverlapCount,
    exactVoicePairCollisionQuarters,
    colorDoublingQuarters,
    mechanicalVoicePairCouplingQuarters,
  } = evaluation.dimensions.texture.features;

  return (
    selectedVoicePairLockstepSelectionCost * CANDIDATE_SELECTION_RISK_WEIGHTS.voicePairLockstep.selectedCost +
    samePitchOverlapCount * CANDIDATE_SELECTION_RISK_WEIGHTS.voicePairLockstep.samePitchOverlap +
    (exactVoicePairCollisionQuarters + colorDoublingQuarters * 0.25) *
      CANDIDATE_SELECTION_RISK_WEIGHTS.voicePairLockstep.pitchClassUnisonDuration +
    mechanicalVoicePairCouplingQuarters * CANDIDATE_SELECTION_RISK_WEIGHTS.voicePairLockstep.durationBasedLockstep
  );
}

function melodyPreservationRiskAdjustment(evaluation: CandidateEvaluation): number {
  return (
    evaluation.dimensions.melody.features.leapRecoveryMisses *
    CANDIDATE_SELECTION_RISK_WEIGHTS.melodyPreservation.leapRecoveryMiss
  );
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

  return soloTextureRisk * CANDIDATE_SELECTION_RISK_WEIGHTS.sectionLocalPlanner.soloTextureRisk;
}
