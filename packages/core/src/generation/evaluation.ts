import { TICKS_PER_QUARTER } from "../constants.js";
import type { CandidateEvaluation, NoteEvent, NoteRole, StepwisePatternSummary } from "../events.js";
import {
  buildPhase7CandidateRiskContexts,
  explainCandidateRiskContexts,
  type Phase7CandidateRiskContexts,
} from "./candidate-risk-contexts.js";
import { analyzeScore } from "./diagnostics.js";
import type { Exposition } from "./types.js";

const EVALUATION_WEIGHTS = {
  hardFailure: 10_000,
  counterpoint: {
    parallelPerfect: 10,
    counterSubjectCoverage: 20,
    freeCounterpointCoverage: 10,
    counterSubjectInvertibility: 8,
  },
  melody: {
    leapRecoveryMiss: 35,
    melodicStagnation: 25,
    lowerVoiceUnvocalLongSupportQuarter: 18,
    freeCounterpointStepwiseRunRatio: 8,
    freeCounterpointMonotoneStepRun: 2,
    freeCounterpointContour: 12,
    ornamentDensity: 6,
  },
  texture: {
    samePitchOverlap: 4,
    unisonOverlap: 8,
    sameDirectionMotion: 3,
    fourBeatBassUpperSameDirection: 2,
    eightBeatBassUpperSameDirection: 1,
    upperNeighborFifthClimbEightBeatBassUpperSameDirection: 50,
    fourBeatOuterVoiceSameDirection: 1,
    sharedRhythmOverlap: 2,
    voiceIndependenceSelectionUnisonOverlap: 8,
    voiceIndependenceSelectionSharedRhythmOverlap: 4,
    voicePairLockstepSelectionSamePitchOverlap: 4,
    allVoiceSilenceGap: 25,
    rhythmicIndependence: 12,
    supportTextureRepetition: 8,
    expositionEntryStagger: 10,
    bassUpperContraryMotion: 1,
    outerVoiceContraryMotion: 1,
    phase13VLineAgency: 2,
    phase13VEntryFormulaNovelty: 3,
  },
  subjectClarity: {
    subjectIdentityViolation: 10_000,
    answerPlanViolation: 1_000,
    counterSubjectIdentityRetention: 30,
    modalCounterSubjectIdentitySelection: 20,
    phase13VCounterSubjectSurvivability: 0,
  },
  harmony: {
    entryInstability: 1,
    severeEntryInterval: 1,
    unresolvedSevereEntryInterval: 2,
    modalCadenceEntryInstability: 1,
    modalCadenceSevereEntryInterval: 2,
    modalCadenceUnresolvedSevereEntryInterval: 3,
    unresolvedDissonance: 100,
    strongBeatDissonance: 0,
    harmonicFunctionMismatch: 0.000001,
    strongBeatStructuralIntentMismatch: 0.000001,
    weakBeatUnresolvedNonChordTone: 0.000001,
    predominantDirectionMiss: 30,
    unresolvedAmbiguity: 30,
    controlledAmbiguity: 10,
    styleModulationFit: 8,
    harmonicFunctionMatch: 0,
  },
  form: {
    formRepetition: 50,
    episodeDirection: 10,
    strettoClarity: 10,
    phase13VLongWindowDevelopment: 2,
  },
} as const;

export function evaluateCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const candidateNotes = [...recentNotes, ...candidate.notes];
  const diagnostics = analyzeScore(candidateNotes, candidate.subjectEntries, candidate.sectionPlans);
  const riskContexts = buildPhase7CandidateRiskContexts(candidateNotes, candidate, diagnostics);
  const explanations = explainCandidateRiskContexts(riskContexts);
  const upperNeighborFifthClimbContourSelectionCost =
    upperNeighborFifthClimbPatternIsPresent(candidate) *
    diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
    EVALUATION_WEIGHTS.texture.upperNeighborFifthClimbEightBeatBassUpperSameDirection;

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
  const freeCounterpointStepwiseFixationCost =
    diagnostics.modalContextCount > 0
      ? 0
      : Math.max(0, freeCounterpointStepwise.stepwiseRunRatio - 0.7) *
          EVALUATION_WEIGHTS.melody.freeCounterpointStepwiseRunRatio +
        Math.max(0, freeCounterpointStepwise.maxMonotoneStepRun - 3) *
          EVALUATION_WEIGHTS.melody.freeCounterpointMonotoneStepRun;
  const melody = {
    cost:
      diagnostics.leapRecoveryMisses * EVALUATION_WEIGHTS.melody.leapRecoveryMiss +
      diagnostics.melodicStagnationWarnings * EVALUATION_WEIGHTS.melody.melodicStagnation +
      (diagnostics.lowerVoiceVocality.unvocalLongSupportDurationTicks / TICKS_PER_QUARTER) *
        EVALUATION_WEIGHTS.melody.lowerVoiceUnvocalLongSupportQuarter +
      freeCounterpointStepwiseFixationCost,
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
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const voiceIndependenceSelectionCost =
    diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionUnisonOverlap +
    diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.voiceIndependenceSelectionSharedRhythmOverlap;
  const voicePairLockstepSelectionCost = scoreVoicePairLockstepRisk(riskContexts, diagnostics.modalContextCount);
  const phase13VLineAgencyCost =
    diagnostics.qualityVector.phase13VReview.lineAgency.reinforcingSpanCount +
    diagnostics.qualityVector.phase13VReview.lineAgency.reviewRequiredSpanCount * 2;
  const phase13VEntryFormulaNoveltyCost =
    diagnostics.qualityVector.phase13VReview.entryFormulaNovelty.reviewRequiredFormulaCount;
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * EVALUATION_WEIGHTS.texture.samePitchOverlap +
      diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.unisonOverlap +
      diagnostics.sameDirectionMotionCount * EVALUATION_WEIGHTS.texture.sameDirectionMotion +
      diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.eightBeatBassUpperSameDirection +
      upperNeighborFifthClimbContourSelectionCost +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatOuterVoiceSameDirection +
      diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.sharedRhythmOverlap +
      diagnostics.allVoiceSilenceGapCount * EVALUATION_WEIGHTS.texture.allVoiceSilenceGap +
      phase13VLineAgencyCost * EVALUATION_WEIGHTS.texture.phase13VLineAgency +
      phase13VEntryFormulaNoveltyCost * EVALUATION_WEIGHTS.texture.phase13VEntryFormulaNovelty,
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
      selectedUpperNeighborFifthClimbContourCost: upperNeighborFifthClimbContourSelectionCost,
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
      phase13VLineAgencyCost,
      phase13VEntryFormulaNoveltyCost,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
      phase11AdjacentVoiceOverOctaveCount: diagnostics.phase11Review.adjacentVoiceIntervals.reduce(
        (sum, interval) => sum + interval.overOctaveCount,
        0,
      ),
      phase11AdjacentVoiceWideP75SemitoneExcess: diagnostics.phase11Review.adjacentVoiceIntervals.reduce(
        (sum, interval) => sum + Math.max(0, interval.seventyFifthPercentileSemitones - 12),
        0,
      ),
      phase11RegisterSpanSemitoneTotal: diagnostics.phase11Review.registerSpans.reduce(
        (sum, span) => sum + span.spanSemitones,
        0,
      ),
      phase11FunctionalThinningNonCadentialRunCount: diagnostics.phase11Review.functionalThinning.nonCadentialRunCount,
      phase11FunctionalThinningOneVoiceRunCount: diagnostics.phase11Review.functionalThinning.oneVoiceRunCount,
      phase11FunctionalThinningTwoVoiceRunCount: diagnostics.phase11Review.functionalThinning.twoVoiceRunCount,
      phase11FunctionalThinningMaxDurationQuarters:
        diagnostics.phase11Review.functionalThinning.maxDurationTicks / TICKS_PER_QUARTER,
    },
  };
  const subjectClarity = {
    cost:
      diagnostics.subjectIdentityViolations * EVALUATION_WEIGHTS.subjectClarity.subjectIdentityViolation +
      diagnostics.answerPlanViolations * EVALUATION_WEIGHTS.subjectClarity.answerPlanViolation +
      diagnostics.qualityVector.phase13VReview.counterSubjectSurvivability.tradeoffWindowCount *
        EVALUATION_WEIGHTS.subjectClarity.phase13VCounterSubjectSurvivability +
      diagnostics.qualityVector.phase13VReview.counterSubjectSurvivability.weakWindowCount *
        EVALUATION_WEIGHTS.subjectClarity.phase13VCounterSubjectSurvivability *
        2,
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
      phase13VCounterSubjectTradeoffWindowCount:
        diagnostics.qualityVector.phase13VReview.counterSubjectSurvivability.tradeoffWindowCount,
      phase13VCounterSubjectWeakWindowCount:
        diagnostics.qualityVector.phase13VReview.counterSubjectSurvivability.weakWindowCount,
    },
  };
  const modalCadenceEntrySupportRiskCost = scoreModalCadenceEntrySupportRisk(candidate, riskContexts);
  const entryHarmonyRiskCost = scoreBalancedEntryHarmonyRisk(riskContexts) + modalCadenceEntrySupportRiskCost;
  const harmony = {
    cost:
      entryHarmonyRiskCost +
      diagnostics.unresolvedDissonanceCount * EVALUATION_WEIGHTS.harmony.unresolvedDissonance +
      diagnostics.strongBeatDissonanceCount * EVALUATION_WEIGHTS.harmony.strongBeatDissonance +
      diagnostics.harmonicFunctionMismatches * EVALUATION_WEIGHTS.harmony.harmonicFunctionMismatch +
      diagnostics.phase11Review.metricalHarmony.strongBeatStructuralIntentMismatchCount *
        EVALUATION_WEIGHTS.harmony.strongBeatStructuralIntentMismatch +
      diagnostics.phase11Review.metricalHarmony.weakBeatUnresolvedNonChordToneCount *
        EVALUATION_WEIGHTS.harmony.weakBeatUnresolvedNonChordTone +
      diagnostics.predominantDirectionMisses * EVALUATION_WEIGHTS.harmony.predominantDirectionMiss +
      diagnostics.unresolvedAmbiguityWarnings * EVALUATION_WEIGHTS.harmony.unresolvedAmbiguity,
    reward:
      diagnostics.controlledAmbiguityScore * EVALUATION_WEIGHTS.harmony.controlledAmbiguity +
      diagnostics.styleModulationFit * EVALUATION_WEIGHTS.harmony.styleModulationFit +
      diagnostics.harmonicFunctionMatches * EVALUATION_WEIGHTS.harmony.harmonicFunctionMatch,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      strongBeatDissonanceCount: diagnostics.strongBeatDissonanceCount,
      harmonicFunctionMismatches: diagnostics.harmonicFunctionMismatches,
      harmonicFunctionMatches: diagnostics.harmonicFunctionMatches,
      strongBeatCheckpointCount: diagnostics.phase11Review.metricalHarmony.strongBeatCheckpointCount,
      strongBeatChordToneSupportCount: diagnostics.phase11Review.metricalHarmony.strongBeatChordToneSupportCount,
      strongBeatChordToneMismatchCount: diagnostics.phase11Review.metricalHarmony.strongBeatChordToneMismatchCount,
      strongBeatBassRootSupportCount: diagnostics.phase11Review.metricalHarmony.strongBeatBassRootSupportCount,
      strongBeatBassRootUnsupportedCount: Math.max(
        0,
        diagnostics.phase11Review.metricalHarmony.strongBeatCheckpointCount -
          diagnostics.phase11Review.metricalHarmony.strongBeatBassRootSupportCount,
      ),
      strongBeatStructuralIntentCount: diagnostics.phase11Review.metricalHarmony.strongBeatStructuralIntentCount,
      strongBeatStructuralIntentMismatchCount:
        diagnostics.phase11Review.metricalHarmony.strongBeatStructuralIntentMismatchCount,
      weakBeatChordToneMismatchCount: diagnostics.phase11Review.metricalHarmony.weakBeatChordToneMismatchCount,
      weakBeatNonChordToneIntentCount: diagnostics.phase11Review.metricalHarmony.weakBeatNonChordToneIntentCount,
      weakBeatResolvedNonChordToneCount: diagnostics.phase11Review.metricalHarmony.weakBeatResolvedNonChordToneCount,
      weakBeatUnresolvedNonChordToneCount:
        diagnostics.phase11Review.metricalHarmony.weakBeatUnresolvedNonChordToneCount,
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
      diagnostics.qualityVector.phase13VReview.longWindowDevelopment.reviewRequiredClaimCount *
        EVALUATION_WEIGHTS.form.phase13VLongWindowDevelopment +
      Math.max(0, diagnostics.qualityVector.phase13VReview.longWindowDevelopment.topFunctionShare - 0.34) *
        100 *
        EVALUATION_WEIGHTS.form.phase13VLongWindowDevelopment,
    reward:
      diagnostics.episodeDirectionScore * EVALUATION_WEIGHTS.form.episodeDirection +
      diagnostics.strettoClarityScore * EVALUATION_WEIGHTS.form.strettoClarity,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
      phase11StateGrammarMostRepeatedPatternCount:
        diagnostics.phase11Review.stateGrammarRepetition.mostRepeatedPatternCount,
      phase11StateGrammarUniquePatternCount: diagnostics.phase11Review.stateGrammarRepetition.uniquePatternCount,
      phase11TopEntryPatternFamilyCount: diagnostics.phase11Review.entryPatternFamilies[0]?.count ?? 0,
      phase13VLongWindowReviewRequiredClaimCount:
        diagnostics.qualityVector.phase13VReview.longWindowDevelopment.reviewRequiredClaimCount,
      phase13VLongWindowTopFunctionShare:
        diagnostics.qualityVector.phase13VReview.longWindowDevelopment.topFunctionShare,
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
    featureVersion: 6,
    evaluationModelVersion: 12,
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

function scoreVoicePairLockstepRisk(contexts: Phase7CandidateRiskContexts, modalContextCount: number): number {
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

function scoreBalancedEntryHarmonyRisk(contexts: Phase7CandidateRiskContexts): number {
  return contexts.entryIntervalSupport.entries.reduce(
    (sum, entry) =>
      sum +
      entry.instabilityCount * EVALUATION_WEIGHTS.harmony.entryInstability +
      entry.severeIntervalCount * EVALUATION_WEIGHTS.harmony.severeEntryInterval +
      entry.unresolvedSevereIntervalCount * EVALUATION_WEIGHTS.harmony.unresolvedSevereEntryInterval,
    0,
  );
}

function scoreModalCadenceEntrySupportRisk(candidate: Exposition, contexts: Phase7CandidateRiskContexts): number {
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

function upperNeighborFifthClimbPatternIsPresent(candidate: Exposition): number {
  return Number(
    candidate.subjectEntries.some((entry) => entry.expectedDegreePattern.slice(0, 8).join("-") === "0-1-2-3-4-3-1-2"),
  );
}
