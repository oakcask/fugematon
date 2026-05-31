import { DEFAULT_SELECTION_MODEL, GENERATOR_VERSION, TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationInput, GenerationOutput, ScoreEvent } from "./events.js";
import { normalizeSelectionModel } from "./events.js";
import { analyzeScore } from "./generation/diagnostics.js";
import { annotateEpisodeMotivicDerivations } from "./generation/episode-motivic-development.js";
import { repairHarmonicStasisRearticulation } from "./generation/harmonic-stasis-rearticulation.js";
import { chooseKeySignature, chooseTempo, chooseTimeSignature } from "./generation/key.js";
import { buildLocalSentinelCandidateTraceSummary } from "./generation/local-sentinel-candidate-trace.js";
import { createMeterContext } from "./generation/meter.js";
import { buildPhraseConvergenceReviewSummary } from "./generation/phrase-convergence-review.js";
import { buildPhraseDevelopmentReviewSummary } from "./generation/phrase-development-review.js";
import { buildScoreWindowAcceptanceSummary } from "./generation/score-window-acceptance.js";
import { buildFugueScore } from "./generation/sections.js";
import { buildSubject } from "./generation/subject.js";
import { applyTerminalClosureIntent, buildTerminalClosureReviewSummary } from "./generation/terminal-closure-review.js";
import { normalizeInfinitePlaybackMode } from "./infinite-playback.js";
import { Xoshiro128StarStar } from "./prng.js";

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const mode = normalizeInfinitePlaybackMode(input.mode);
  const rng = Xoshiro128StarStar.fromSeed(input.seed);
  const keySignature = chooseKeySignature(rng, input.seed);
  const timeSignature = chooseTimeSignature(rng);
  const meterContext = createMeterContext(timeSignature);
  const bpm = chooseTempo(rng);
  const selectionModel = normalizeSelectionModel(input.selectionModel ?? DEFAULT_SELECTION_MODEL);
  const subject = buildSubject(rng, keySignature, selectionModel, meterContext);
  const score = buildFugueScore(subject, keySignature, input.lengthTicks, rng, selectionModel, meterContext);
  applyTerminalClosureIntent(score, Math.max(input.lengthTicks, score.endTick), mode);
  annotateEpisodeMotivicDerivations(score.notes, score.sectionPlans);
  if (selectionModel !== "baseline") {
    repairHarmonicStasisRearticulation(score.notes, score.sectionPlans);
  }
  const diagnostics = analyzeScore(score.notes, score.subjectEntries, score.sectionPlans);
  const localSentinelCandidateTrace = buildLocalSentinelCandidateTraceSummary(
    score.selectedCandidateEvaluations,
    diagnostics.qualityVector,
  );
  const phraseConvergenceReview = buildPhraseConvergenceReviewSummary(
    selectionModel,
    diagnostics.phraseRepetitionReview,
  );
  const phraseDevelopmentReview = buildPhraseDevelopmentReviewSummary(
    score.subjectEntries,
    score.sectionPlans,
    diagnostics.phraseRepetitionReview,
  );
  const scoreWindowAcceptance = buildScoreWindowAcceptanceSummary(
    diagnostics.entryBoundaryContinuity,
    diagnostics.harmonicContinuity,
    diagnostics.harmonicStasisRearticulation,
    diagnostics.transitionRhythmReview,
    diagnostics.dissonanceTriage,
    diagnostics.qualityVector,
    phraseDevelopmentReview,
  );
  const generatedUntilTick = Math.max(input.lengthTicks, score.endTick);

  const events: ScoreEvent[] = [
    {
      kind: "meta",
      type: "generator-version",
      tick: 0,
      payload: { version: GENERATOR_VERSION },
    },
    {
      kind: "meta",
      type: "timebase",
      tick: 0,
      payload: { ticksPerQuarter: TICKS_PER_QUARTER },
    },
    {
      kind: "meta",
      type: "tempo-change",
      tick: 0,
      payload: { bpm },
    },
    {
      kind: "meta",
      type: "time-signature",
      tick: 0,
      payload: timeSignature,
    },
    {
      kind: "meta",
      type: "key-signature",
      tick: 0,
      payload: keySignature,
    },
    {
      kind: "meta",
      type: "state-change",
      tick: 0,
      payload: { state: "exposition" },
    },
    ...score.stateChanges.map((stateChange) => ({
      kind: "meta" as const,
      type: "state-change" as const,
      tick: stateChange.tick,
      payload: { state: stateChange.state },
    })),
    ...score.notes,
    {
      kind: "meta",
      type: "score-end",
      tick: generatedUntilTick,
      payload: { lengthTicks: generatedUntilTick },
    },
  ];
  const terminalClosureReview = buildTerminalClosureReviewSummary({
    events,
    sectionPlans: score.sectionPlans,
    mode,
    segmentIndex: 0,
  });

  return {
    events,
    diagnostics: {
      generatorVersion: GENERATOR_VERSION,
      selectionModel,
      seed: input.seed,
      lengthTicks: input.lengthTicks,
      generatedUntilTick,
      eventCount: events.length,
      noteCount: score.notes.length,
      candidateEvaluations: score.candidateEvaluations,
      selectedCandidateEvaluations: score.selectedCandidateEvaluations,
      candidatePoolOracle: score.candidatePoolOracle,
      stateTransitions: score.stateTransitions,
      subjectEntries: score.subjectEntries,
      sectionPlans: score.sectionPlans,
      rangeViolations: diagnostics.rangeViolations,
      voiceCrossings: diagnostics.voiceCrossings,
      parallelPerfects: diagnostics.parallelPerfects,
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      keyMetadataMismatches: diagnostics.keyMetadataMismatches,
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      entrySupportInstabilityDetails: diagnostics.entrySupportInstabilityDetails,
      severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
      unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
      entrySupportSevereIntervalDetails: diagnostics.entrySupportSevereIntervalDetails,
      durationDistribution: diagnostics.durationDistribution,
      repeatedPitchRunCount: diagnostics.repeatedPitchRunCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
      soloTexture: diagnostics.soloTexture,
      exposedFreeCounterpointSolo: diagnostics.exposedFreeCounterpointSolo,
      pitchContourMotion: diagnostics.pitchContourMotion,
      lowerVoiceVocality: diagnostics.lowerVoiceVocality,
      stepwisePattern: diagnostics.stepwisePattern,
      surfaceBrilliance: diagnostics.surfaceBrilliance,
      texturePlanningReview: diagnostics.texturePlanningReview,
      meterConsistencyReview: diagnostics.meterConsistencyReview,
      phraseRepetitionReview: diagnostics.phraseRepetitionReview,
      episodeMotivicDevelopment: diagnostics.episodeMotivicDevelopment,
      entryBoundaryContinuity: diagnostics.entryBoundaryContinuity,
      bassAnswerTailTexture: diagnostics.bassAnswerTailTexture,
      qualityVector: diagnostics.qualityVector,
      localSentinelCandidateTrace,
      phraseConvergenceReview,
      phraseDevelopmentReview,
      dissonanceTriage: diagnostics.dissonanceTriage,
      harmonicContinuity: diagnostics.harmonicContinuity,
      harmonicStasisRearticulation: diagnostics.harmonicStasisRearticulation,
      transitionRhythmReview: diagnostics.transitionRhythmReview,
      scoreWindowAcceptance,
      terminalClosureReview,
      ornamentCandidateCount: diagnostics.ornamentCandidateCount,
      ornamentDensity: diagnostics.ornamentDensity,
      ornamentPlacementReasons: diagnostics.ornamentPlacementReasons,
      fallbackPassageCount: diagnostics.fallbackPassageCount,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      strongBeatDissonanceCount: diagnostics.strongBeatDissonanceCount,
      cadenceTargetMisses: diagnostics.cadenceTargetMisses,
      cadenceTargetHits: diagnostics.cadenceTargetHits,
      leadingToneResolutionMisses: diagnostics.leadingToneResolutionMisses,
      dominantResolutionMisses: diagnostics.dominantResolutionMisses,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      harmonicFunctionMismatches: diagnostics.harmonicFunctionMismatches,
      harmonicFunctionMatches: diagnostics.harmonicFunctionMatches,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      unresolvedAmbiguityWarnings: diagnostics.unresolvedAmbiguityWarnings,
      ambiguityRecoveries: diagnostics.ambiguityRecoveries,
      styleModulationFit: diagnostics.styleModulationFit,
      parallelKeyShiftCount: diagnostics.parallelKeyShiftCount,
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
      issues: diagnostics.issues,
      warnings: diagnostics.warnings,
    },
  };
}

function validateInput(input: GenerationInput): void {
  if (input.seed.length === 0) {
    throw new Error("seed must not be empty");
  }

  if (!Number.isSafeInteger(input.lengthTicks) || input.lengthTicks <= 0) {
    throw new Error("lengthTicks must be a positive safe integer");
  }
}
