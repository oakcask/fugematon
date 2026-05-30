import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  CandidateEvaluation,
  HarmonicPlan,
  NoteEvent,
  NoteRole,
  PlannedEntry,
  StepwisePatternSummary,
} from "../events.js";
import {
  buildCandidateRiskContexts,
  type CandidateRiskContexts,
  explainCandidateRiskContexts,
} from "./candidate-risk-contexts.js";
import { analyzeScore } from "./diagnostics.js";
import {
  CANDIDATE_EVALUATION_FEATURE_VERSION,
  CANDIDATE_EVALUATION_MODEL_VERSION,
  CANDIDATE_EVALUATION_WEIGHTS,
} from "./evaluation-model.js";
import { buildPhraseDevelopmentReviewSummary } from "./phrase-development-review.js";
import type { Exposition } from "./types.js";

const EVALUATION_WEIGHTS = CANDIDATE_EVALUATION_WEIGHTS;

export function evaluateCandidate(
  previousNotes: readonly NoteEvent[],
  candidate: Exposition,
  previousSubjectEntries: readonly PlannedEntry[] = [],
  previousSectionPlans: readonly HarmonicPlan[] = [],
): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const candidateNotes = [...recentNotes, ...candidate.notes];
  const diagnostics = analyzeScore(candidateNotes, candidate.subjectEntries, candidate.sectionPlans);
  const phraseDevelopmentReview = buildPhraseDevelopmentReviewSummary(
    [...previousSubjectEntries, ...candidate.subjectEntries],
    [...previousSectionPlans, ...candidate.sectionPlans],
    diagnostics.phraseRepetitionReview,
  );
  const riskContexts = buildCandidateRiskContexts(candidateNotes, candidate, diagnostics);
  const explanations = explainCandidateRiskContexts(riskContexts);
  const ascendingFifthTurnbackContourCost =
    hasAscendingFifthTurnbackSubjectContour(candidate) *
    diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
    EVALUATION_WEIGHTS.texture.ascendingFifthTurnbackBassUpperSameDirection;

  const hardFailures = diagnostics.issues
    .filter(
      (issue) =>
        issue.code === "range-violation" ||
        issue.code === "voice-crossing" ||
        issue.code === "subject-identity-violation" ||
        issue.code === "answer-plan-violation" ||
        issue.code === "key-metadata-mismatch",
    )
    .map((issue) => issue.code);
  const counterpoint = {
    cost: diagnostics.parallelPerfects * EVALUATION_WEIGHTS.counterpoint.parallelPerfect,
    reward:
      diagnostics.counterSubjectCoverage * EVALUATION_WEIGHTS.counterpoint.counterSubjectCoverage +
      diagnostics.freeCounterpointCoverage * EVALUATION_WEIGHTS.counterpoint.freeCounterpointCoverage +
      diagnostics.counterSubjectInvertibilityScore * EVALUATION_WEIGHTS.counterpoint.counterSubjectInvertibility,
    features: {
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      parallelPerfects: diagnostics.parallelPerfects,
    },
  };
  const freeCounterpointStepwise = roleStepwisePattern(diagnostics.stepwisePattern, "free-counterpoint");
  const modalStepwiseCostMultiplier = diagnostics.modalContextCount > 0 ? 0.35 : 1;
  const freeCounterpointStepwiseFixationCost =
    (Math.max(0, freeCounterpointStepwise.stepwiseRunRatio - 0.7) *
      EVALUATION_WEIGHTS.melody.freeCounterpointStepwiseRunRatio +
      Math.max(0, freeCounterpointStepwise.maxMonotoneStepRun - 3) *
        EVALUATION_WEIGHTS.melody.freeCounterpointMonotoneStepRun) *
    modalStepwiseCostMultiplier;
  const episodeRepeatedStockFormulaCost =
    diagnostics.episodeMotivicDevelopment.repeatedStockFormulaCount *
    EVALUATION_WEIGHTS.melody.episodeRepeatedStockFormula;
  const melody = {
    cost:
      diagnostics.leapRecoveryMisses * EVALUATION_WEIGHTS.melody.leapRecoveryMiss +
      diagnostics.melodicStagnationWarnings * EVALUATION_WEIGHTS.melody.melodicStagnation +
      (diagnostics.lowerVoiceVocality.unvocalLongSupportDurationTicks / TICKS_PER_QUARTER) *
        EVALUATION_WEIGHTS.melody.lowerVoiceUnvocalLongSupportQuarter +
      freeCounterpointStepwiseFixationCost +
      episodeRepeatedStockFormulaCost,
    reward:
      diagnostics.freeCounterpointContourScore * EVALUATION_WEIGHTS.melody.freeCounterpointContour +
      diagnostics.ornamentDensity * EVALUATION_WEIGHTS.melody.ornamentDensity,
    features: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      lowerVoiceVocalityScore: diagnostics.lowerVoiceVocality.score,
      lowerVoiceUnvocalLongSupportCount: diagnostics.lowerVoiceVocality.unvocalLongSupportCount,
      lowerVoiceUnvocalLongSupportQuarters:
        diagnostics.lowerVoiceVocality.unvocalLongSupportDurationTicks / TICKS_PER_QUARTER,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      freeCounterpointStepwiseRunRatio: freeCounterpointStepwise.stepwiseRunRatio,
      freeCounterpointMaxMonotoneStepRun: freeCounterpointStepwise.maxMonotoneStepRun,
      freeCounterpointRepeatedDegreePatternCount: freeCounterpointStepwise.repeatedDegreePatternCount,
      freeCounterpointRolePatternEntropy: freeCounterpointStepwise.rolePatternEntropy,
      selectedFreeCounterpointStepwiseFixationCost: freeCounterpointStepwiseFixationCost,
      episodeRepeatedStockFormulaCount: diagnostics.episodeMotivicDevelopment.repeatedStockFormulaCount,
      selectedEpisodeRepeatedStockFormulaCost: episodeRepeatedStockFormulaCost,
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const voiceIndependenceSelectionCost =
    diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionUnisonOverlap +
    diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionSharedRhythmOverlap;
  const voicePairLockstepSelectionCost = scoreVoicePairLockstepRisk(riskContexts, diagnostics.modalContextCount);
  const lineAgencyCost =
    diagnostics.qualityVector.scoreBeautyEvidence.lineAgency.reinforcingSpanCount +
    diagnostics.qualityVector.scoreBeautyEvidence.lineAgency.reviewRequiredSpanCount * 2;
  const entryFormulaNoveltyCost =
    diagnostics.qualityVector.scoreBeautyEvidence.entryFormulaNovelty.reviewRequiredFormulaCount;
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * EVALUATION_WEIGHTS.texture.samePitchOverlap +
      diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.unisonOverlap +
      diagnostics.sameDirectionMotionCount * EVALUATION_WEIGHTS.texture.sameDirectionMotion +
      diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.eightBeatBassUpperSameDirection +
      ascendingFifthTurnbackContourCost +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatOuterVoiceSameDirection +
      diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.sharedRhythmOverlap +
      diagnostics.allVoiceSilenceGapCount * EVALUATION_WEIGHTS.texture.allVoiceSilenceGap +
      lineAgencyCost * EVALUATION_WEIGHTS.texture.lineAgency +
      entryFormulaNoveltyCost * EVALUATION_WEIGHTS.texture.entryFormulaNovelty,
    reward:
      diagnostics.rhythmicIndependenceScore * EVALUATION_WEIGHTS.texture.rhythmicIndependence +
      diagnostics.supportTextureRepetitionScore * EVALUATION_WEIGHTS.texture.supportTextureRepetition +
      diagnostics.expositionEntryStaggerScore * EVALUATION_WEIGHTS.texture.expositionEntryStagger +
      diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio *
        EVALUATION_WEIGHTS.texture.outerVoiceContraryMotion,
    features: {
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      fourBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio,
      fourBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio,
      eightBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio,
      eightBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio,
      ascendingFifthTurnbackContourCost,
      fourBeatOuterVoiceSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio,
      fourBeatOuterVoiceContraryRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      maxRoleMonotoneStepRun: Math.max(...diagnostics.stepwisePattern.roles.map((role) => role.maxMonotoneStepRun)),
      repeatedRoleDegreePatternCount: diagnostics.stepwisePattern.roles.reduce(
        (sum, role) => sum + role.repeatedDegreePatternCount,
        0,
      ),
      selectedVoiceIndependenceSelectionCost: voiceIndependenceSelectionCost,
      selectedVoicePairLockstepSelectionCost: voicePairLockstepSelectionCost,
      qualityVectorPitchClassUnisonDuration: qualityVectorAxisValue(diagnostics, "pitchClassUnisonDuration"),
      qualityVectorDurationBasedLockstep: qualityVectorAxisValue(diagnostics, "durationBasedLockstep"),
      lineAgencyCost,
      entryFormulaNoveltyCost,
      entryBoundaryResetCount: diagnostics.entryBoundaryContinuity.synchronizedResetCount,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
      wideAdjacentVoiceSpacingCount: diagnostics.texturePlanningReview.adjacentVoiceIntervals.reduce(
        (sum, interval) => sum + interval.overOctaveCount,
        0,
      ),
      adjacentVoiceWideP75SemitoneExcess: diagnostics.texturePlanningReview.adjacentVoiceIntervals.reduce(
        (sum, interval) => sum + Math.max(0, interval.seventyFifthPercentileSemitones - 12),
        0,
      ),
      registerSpanSemitoneTotal: diagnostics.texturePlanningReview.registerSpans.reduce(
        (sum, span) => sum + span.spanSemitones,
        0,
      ),
      nonCadentialFunctionalThinningRunCount: diagnostics.texturePlanningReview.functionalThinning.nonCadentialRunCount,
      oneVoiceFunctionalThinningRunCount: diagnostics.texturePlanningReview.functionalThinning.oneVoiceRunCount,
      twoVoiceFunctionalThinningRunCount: diagnostics.texturePlanningReview.functionalThinning.twoVoiceRunCount,
      functionalThinningMaxDurationQuarters:
        diagnostics.texturePlanningReview.functionalThinning.maxDurationTicks / TICKS_PER_QUARTER,
    },
  };
  const subjectClarity = {
    cost:
      diagnostics.subjectIdentityViolations * EVALUATION_WEIGHTS.subjectClarity.subjectIdentityViolation +
      diagnostics.answerPlanViolations * EVALUATION_WEIGHTS.subjectClarity.answerPlanViolation,
    reward:
      diagnostics.counterSubjectIdentityRetention * EVALUATION_WEIGHTS.subjectClarity.counterSubjectIdentityRetention +
      modalCounterSubjectIdentitySelectionReward(
        diagnostics.counterSubjectIdentityRetention,
        diagnostics.modalContextCount,
      ),
    features: {
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      selectedModalCounterSubjectIdentityReward: modalCounterSubjectIdentitySelectionReward(
        diagnostics.counterSubjectIdentityRetention,
        diagnostics.modalContextCount,
      ),
      counterSubjectTradeoffWindowCount:
        diagnostics.qualityVector.scoreBeautyEvidence.counterSubjectSurvivability.tradeoffWindowCount,
      counterSubjectWeakWindowCount:
        diagnostics.qualityVector.scoreBeautyEvidence.counterSubjectSurvivability.weakWindowCount,
    },
  };
  const modalCadenceEntrySupportRiskCost = scoreModalCadenceEntrySupportRisk(candidate, riskContexts);
  const entryHarmonyRiskCost = scoreBalancedEntryHarmonyRisk(riskContexts) + modalCadenceEntrySupportRiskCost;
  const harmony = {
    cost:
      entryHarmonyRiskCost +
      diagnostics.unresolvedDissonanceCount * EVALUATION_WEIGHTS.harmony.unresolvedDissonance +
      diagnostics.predominantDirectionMisses * EVALUATION_WEIGHTS.harmony.predominantDirectionMiss +
      diagnostics.unresolvedAmbiguityWarnings * EVALUATION_WEIGHTS.harmony.unresolvedAmbiguity,
    reward:
      diagnostics.controlledAmbiguityScore * EVALUATION_WEIGHTS.harmony.controlledAmbiguity +
      diagnostics.styleModulationFit * EVALUATION_WEIGHTS.harmony.styleModulationFit,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      strongBeatDissonanceCount: diagnostics.strongBeatDissonanceCount,
      harmonicFunctionMismatches: diagnostics.harmonicFunctionMismatches,
      harmonicFunctionMatches: diagnostics.harmonicFunctionMatches,
      strongBeatCheckpointCount: diagnostics.texturePlanningReview.metricalHarmony.strongBeatCheckpointCount,
      strongBeatChordToneSupportCount:
        diagnostics.texturePlanningReview.metricalHarmony.strongBeatChordToneSupportCount,
      strongBeatChordToneMismatchCount:
        diagnostics.texturePlanningReview.metricalHarmony.strongBeatChordToneMismatchCount,
      strongBeatBassRootSupportCount: diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount,
      strongBeatBassRootUnsupportedCount: Math.max(
        0,
        diagnostics.texturePlanningReview.metricalHarmony.strongBeatCheckpointCount -
          diagnostics.texturePlanningReview.metricalHarmony.strongBeatBassRootSupportCount,
      ),
      strongBeatStructuralIntentCount:
        diagnostics.texturePlanningReview.metricalHarmony.strongBeatStructuralIntentCount,
      strongBeatStructuralIntentMismatchCount:
        diagnostics.texturePlanningReview.metricalHarmony.strongBeatStructuralIntentMismatchCount,
      weakBeatChordToneMismatchCount: diagnostics.texturePlanningReview.metricalHarmony.weakBeatChordToneMismatchCount,
      weakBeatNonChordToneIntentCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatNonChordToneIntentCount,
      weakBeatResolvedNonChordToneCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatResolvedNonChordToneCount,
      weakBeatUnresolvedNonChordToneCount:
        diagnostics.texturePlanningReview.metricalHarmony.weakBeatUnresolvedNonChordToneCount,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      styleModulationFit: diagnostics.styleModulationFit,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
      unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
      qualityVectorUnresolvedEntrySevereIntervalDuration: qualityVectorAxisValue(
        diagnostics,
        "unresolvedEntrySevereIntervalDuration",
      ),
      selectedEntryHarmonyRiskCost: entryHarmonyRiskCost,
      selectedModalCadenceEntrySupportRiskCost: modalCadenceEntrySupportRiskCost,
    },
  };
  const form = {
    cost:
      diagnostics.formRepetitionWarnings * EVALUATION_WEIGHTS.form.formRepetition +
      phraseDevelopmentReview.mechanicalReuseWindowCount * EVALUATION_WEIGHTS.form.phraseMechanicalReuseWindow +
      diagnostics.qualityVector.scoreBeautyEvidence.longWindowDevelopment.reviewRequiredClaimCount *
        EVALUATION_WEIGHTS.form.longWindowDevelopment +
      Math.max(0, diagnostics.qualityVector.scoreBeautyEvidence.longWindowDevelopment.topFunctionShare - 0.34) *
        100 *
        EVALUATION_WEIGHTS.form.longWindowDevelopment,
    reward:
      diagnostics.episodeDirectionScore * EVALUATION_WEIGHTS.form.episodeDirection +
      diagnostics.strettoClarityScore * EVALUATION_WEIGHTS.form.strettoClarity,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      phraseMechanicalReuseWindowCount: phraseDevelopmentReview.mechanicalReuseWindowCount,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
      stateGrammarMostRepeatedPatternCount:
        diagnostics.texturePlanningReview.stateGrammarRepetition.mostRepeatedPatternCount,
      stateGrammarUniquePatternCount: diagnostics.texturePlanningReview.stateGrammarRepetition.uniquePatternCount,
      topEntryPatternFamilyCount: diagnostics.texturePlanningReview.entryPatternFamilies[0]?.count ?? 0,
      longWindowReviewRequiredClaimCount:
        diagnostics.qualityVector.scoreBeautyEvidence.longWindowDevelopment.reviewRequiredClaimCount,
      longWindowTopFunctionShare: diagnostics.qualityVector.scoreBeautyEvidence.longWindowDevelopment.topFunctionShare,
    },
  };
  const totalCost =
    hardFailures.length * EVALUATION_WEIGHTS.hardFailure +
    counterpoint.cost -
    counterpoint.reward +
    melody.cost -
    melody.reward +
    texture.cost -
    texture.reward +
    voiceIndependenceSelectionCost +
    voicePairLockstepSelectionCost +
    subjectClarity.cost -
    subjectClarity.reward +
    harmony.cost -
    harmony.reward +
    form.cost -
    form.reward;

  return {
    featureVersion: CANDIDATE_EVALUATION_FEATURE_VERSION,
    evaluationModelVersion: CANDIDATE_EVALUATION_MODEL_VERSION,
    totalCost: Math.round(totalCost * 1000) / 1000,
    hardFailures,
    explanations,
    dimensions: {
      counterpoint,
      melody,
      texture,
      subjectClarity,
      harmony,
      form,
    },
  };
}

function scoreVoicePairLockstepRisk(contexts: CandidateRiskContexts, modalContextCount: number): number {
  if (modalContextCount > 0 || contexts.subjectIdentity.counterSubjectIdentityRetention < 0.65) {
    return 0;
  }

  return contexts.voicePairIndependence.voicePairs.reduce(
    (sum, pair) =>
      sum + pair.samePitchOverlapCount * EVALUATION_WEIGHTS.texture.voicePairLockstepSelectionSamePitchOverlap,
    0,
  );
}

function roleStepwisePattern(stepwisePattern: StepwisePatternSummary, role: NoteRole) {
  return (
    stepwisePattern.roles.find((summary) => summary.role === role) ?? {
      role,
      noteCount: 0,
      intervalCount: 0,
      stepwiseRunRatio: 0,
      ascendingStepRatio: 0,
      descendingStepRatio: 0,
      maxMonotoneStepRun: 0,
      repeatedDegreePatternCount: 0,
      rolePatternEntropy: 0,
    }
  );
}

function modalCounterSubjectIdentitySelectionReward(
  counterSubjectIdentityRetention: number,
  modalContextCount: number,
): number {
  if (modalContextCount === 0) {
    return 0;
  }

  return counterSubjectIdentityRetention * EVALUATION_WEIGHTS.subjectClarity.modalCounterSubjectIdentitySelection;
}

function scoreBalancedEntryHarmonyRisk(contexts: CandidateRiskContexts): number {
  return contexts.entryIntervalSupport.entries.reduce(
    (sum, entry) =>
      sum +
      entry.instabilityCount * EVALUATION_WEIGHTS.harmony.entryInstability +
      entry.severeIntervalCount * EVALUATION_WEIGHTS.harmony.severeEntryInterval +
      entry.unresolvedSevereIntervalCount * EVALUATION_WEIGHTS.harmony.unresolvedSevereEntryInterval,
    0,
  );
}

function scoreModalCadenceEntrySupportRisk(candidate: Exposition, contexts: CandidateRiskContexts): number {
  if (!candidate.sectionPlans.some((section) => section.cadenceKind === "modal")) {
    return 0;
  }

  return contexts.entryIntervalSupport.entries.reduce(
    (sum, entry) =>
      sum +
      entry.instabilityCount * EVALUATION_WEIGHTS.harmony.modalCadenceEntryInstability +
      entry.severeIntervalCount * EVALUATION_WEIGHTS.harmony.modalCadenceSevereEntryInterval +
      entry.unresolvedSevereIntervalCount * EVALUATION_WEIGHTS.harmony.modalCadenceUnresolvedSevereEntryInterval,
    0,
  );
}

function qualityVectorAxisValue(diagnostics: ReturnType<typeof analyzeScore>, axis: string): number {
  return diagnostics.qualityVector.axes.find((summary) => summary.axis === axis)?.value ?? 0;
}

function hasAscendingFifthTurnbackSubjectContour(candidate: Exposition): number {
  return Number(candidate.subjectEntries.some((entry) => isAscendingFifthTurnback(entry.expectedDegreePattern)));
}

function isAscendingFifthTurnback(degrees: readonly number[]): boolean {
  const opening = degrees.slice(0, 8);
  if (opening.length < 8) {
    return false;
  }

  const [start, second, third, fourth, peak, turnback, lowerNeighbor, recovery] = opening;
  return (
    second === start + 1 &&
    third === second + 1 &&
    fourth === third + 1 &&
    peak === start + 4 &&
    turnback === peak - 1 &&
    lowerNeighbor < turnback &&
    recovery === lowerNeighbor + 1 &&
    recovery <= turnback
  );
}
