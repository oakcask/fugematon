import { DEFAULT_SELECTION_MODEL, GENERATOR_VERSION, TICKS_PER_QUARTER } from "./constants.js";
import type {
  ContinuousSegmentContinuitySummary,
  GenerationInput,
  GenerationOutput,
  HarmonicPlan,
  PlannedEntry,
  ScoreEvent,
} from "./events.js";
import { normalizeSelectionModel } from "./events.js";
import { buildContinuousBoundaryCarrySummary } from "./generation/continuous-boundary-carry.js";
import { analyzeScore } from "./generation/diagnostics.js";
import { annotateEpisodeMotivicDerivations } from "./generation/episode-motivic-development.js";
import { repairHarmonicStasisRearticulation } from "./generation/harmonic-stasis-rearticulation.js";
import { chooseKeySignature, chooseTempo, chooseTimeSignature } from "./generation/key.js";
import { buildLocalSentinelCandidateTraceSummary } from "./generation/local-sentinel-candidate-trace.js";
import { createMeterContext } from "./generation/meter.js";
import { buildPhraseConvergenceReviewSummary } from "./generation/phrase-convergence-review.js";
import { buildPhraseDevelopmentReviewSummary } from "./generation/phrase-development-review.js";
import { buildScoreWindowAcceptanceSummary } from "./generation/score-window-acceptance.js";
import { buildFugueContinuationScore, buildFugueScore } from "./generation/sections.js";
import { buildSubject } from "./generation/subject.js";
import { applyTerminalClosureIntent, buildTerminalClosureReviewSummary } from "./generation/terminal-closure-review.js";
import { createSegmentEndSnapshot, normalizeInfinitePlaybackMode } from "./infinite-playback.js";
import { Xoshiro128StarStar } from "./prng.js";
import {
  constrainNotesToWritingProfile,
  DEFAULT_WRITING_PROFILE_ID,
  resolveWritingProfile,
  type WritingProfile,
} from "./writing-profile.js";

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const mode = normalizeInfinitePlaybackMode(input.mode);
  const initialRng = Xoshiro128StarStar.fromSeed(input.seed);
  const initialKeySignature = chooseKeySignature(initialRng, input.seed);
  const initialTimeSignature = chooseTimeSignature(initialRng);
  const initialMeterContext = createMeterContext(initialTimeSignature);
  const initialBpm = chooseTempo(initialRng);
  const bpm = input.previousSegmentSnapshot?.timebase.bpm ?? initialBpm;
  const selectionModel = normalizeSelectionModel(input.selectionModel ?? DEFAULT_SELECTION_MODEL);
  const writingProfile = resolveGenerationWritingProfile(input);
  const subject = buildSubject(initialRng, initialKeySignature, selectionModel, initialMeterContext);
  const isContinuousContinuation =
    mode === "continuous-fugue" && input.previousSegmentSnapshot !== undefined && (input.segmentIndex ?? 0) > 0;
  const rng = isContinuousContinuation
    ? new Xoshiro128StarStar(input.previousSegmentSnapshot!.prngInternalState.state)
    : initialRng;
  const timeSignature = input.previousSegmentSnapshot?.timebase.timeSignature ?? initialTimeSignature;
  const meterContext = createMeterContext(timeSignature);
  const keySignature =
    isContinuousContinuation && input.previousSegmentSnapshot?.tonalRegion.currentKey !== undefined
      ? input.previousSegmentSnapshot.tonalRegion.currentKey
      : initialKeySignature;
  const score = isContinuousContinuation
    ? buildFugueContinuationScore(subject, keySignature, input.lengthTicks, rng, {
        selectionModel,
        meterContext,
        previousEvents: input.previousSegmentSnapshot!.boundedPastEventContext.events,
        previousSectionFunctions: input.previousSegmentSnapshot!.boundedPastEventContext.sectionFunctions,
        previousSnapshot: input.previousSegmentSnapshot,
        firstStateHint: input.previousSegmentSnapshot!.sectionPlannerState.nextStateHint,
        previousDensityArc: input.previousSegmentSnapshot!.densityArc.recentVoiceCounts,
        writingProfile,
      })
    : buildFugueScore(
        subject,
        keySignature,
        input.lengthTicks,
        rng,
        selectionModel,
        meterContext,
        {
          terminalCodaIntent: mode === "endless-program" ? "self-contained-coda" : undefined,
        },
        writingProfile,
      );
  applyTerminalClosureIntent(score, Math.max(input.lengthTicks, score.endTick), mode);
  annotateEpisodeMotivicDerivations(score.notes, score.sectionPlans);
  if (selectionModel !== "baseline") {
    repairHarmonicStasisRearticulation(score.notes, score.sectionPlans);
  }
  constrainNotesToWritingProfile(score.notes, writingProfile);
  const diagnostics = analyzeScore(score.notes, score.subjectEntries, score.sectionPlans, writingProfile);
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

  const firstState = score.stateTransitions[0] ?? (isContinuousContinuation ? "episode" : "exposition");
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
      payload: { state: firstState },
    },
    ...score.stateChanges
      .filter((stateChange) => stateChange.tick !== 0 || stateChange.state !== firstState)
      .map((stateChange) => ({
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
    segmentIndex: input.segmentIndex ?? 0,
  });
  const continuousSegmentContinuity = buildContinuousSegmentContinuitySummary({
    segmentIndex: input.segmentIndex ?? 0,
    previousSnapshot: input.previousSegmentSnapshot,
    sectionPlans: score.sectionPlans,
    subjectEntries: score.subjectEntries,
  });
  const continuousBoundaryCarry = buildContinuousBoundaryCarrySummary({
    segmentIndex: input.segmentIndex ?? 0,
    previousSnapshot: input.previousSegmentSnapshot,
    notes: score.notes,
    sectionPlans: score.sectionPlans,
  });
  const nextSegmentSnapshot = createSegmentEndSnapshot({
    previous: input.previousSegmentSnapshot,
    seed: input.seed,
    mode,
    segmentIndex: input.segmentIndex ?? 0,
    tick: generatedUntilTick,
    events,
    subjectEntries: score.subjectEntries,
    sectionPlans: score.sectionPlans,
    selectionModel,
    timeSignature,
    bpm,
    prngState: rng.snapshot(),
    pianoRollSessionTimelineContinuous: continuousSegmentContinuity.pianoRollSessionTimelineContinuous,
    writingProfileId: writingProfile.id,
  });

  return {
    events,
    diagnostics: {
      generatorVersion: GENERATOR_VERSION,
      selectionModel,
      writingProfile: { id: writingProfile.id, version: writingProfile.version },
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
      continuousSegmentContinuity,
      continuousBoundaryCarry,
      writingProfileConstraints: diagnostics.writingProfileConstraints,
      writingProfilePitchViolations: diagnostics.writingProfileConstraints.writingProfilePitchViolations,
      unavailablePitchClassCount: diagnostics.writingProfileConstraints.unavailablePitchClassCount,
      handSpanViolations: diagnostics.writingProfileConstraints.handSpanViolations,
      handAssignmentAmbiguityCount: diagnostics.writingProfileConstraints.handAssignmentAmbiguityCount,
      sameHandLeapCost: diagnostics.writingProfileConstraints.sameHandLeapCost,
      musicBoxRepeatRateViolations: diagnostics.writingProfileConstraints.musicBoxRepeatRateViolations,
      musicBoxSimultaneityViolations: diagnostics.writingProfileConstraints.musicBoxSimultaneityViolations,
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
    nextSegmentSnapshot,
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

function resolveGenerationWritingProfile(input: GenerationInput): WritingProfile {
  const previousWritingProfileId = input.previousSegmentSnapshot?.writingProfile?.id ?? DEFAULT_WRITING_PROFILE_ID;
  const requestedWritingProfileId = input.writingProfileId ?? previousWritingProfileId;

  if (
    input.previousSegmentSnapshot !== undefined &&
    input.writingProfileId !== undefined &&
    input.writingProfileId !== previousWritingProfileId
  ) {
    throw new Error(
      `core.writing-profile.snapshot-mismatch: writing profile changed across segment continuation; why=continuous segment replay must preserve the writing-profile contract used by the previous snapshot; action=start a new segment chain or continue with ${previousWritingProfileId}`,
    );
  }

  return resolveWritingProfile(requestedWritingProfileId);
}

function buildContinuousSegmentContinuitySummary(input: {
  segmentIndex: number;
  previousSnapshot: GenerationInput["previousSegmentSnapshot"];
  sectionPlans: readonly HarmonicPlan[];
  subjectEntries: readonly PlannedEntry[];
}): ContinuousSegmentContinuitySummary {
  const firstPlan = input.sectionPlans[0];
  const firstEntries = input.subjectEntries
    .filter((entry) => entry.startTick < (firstPlan?.durationTicks ?? TICKS_PER_QUARTER * 8))
    .slice(0, 4)
    .map((entry) => ({
      voice: entry.voice,
      form: entry.form,
      state: entry.state,
      startTick: entry.startTick,
    }));
  const initialOrder = ["alto", "soprano", "tenor", "bass"];
  const matchingInitialOrder = firstEntries.filter((entry, index) => entry.voice === initialOrder[index]).length;
  const entryOrderSimilarityToInitialExposition = matchingInitialOrder / initialOrder.length;
  const carriedSubjectFamily = (input.previousSnapshot?.subjectFamily.stemPitchClasses.length ?? 0) > 0;
  const previousTailState = input.previousSnapshot?.sectionPlannerState.currentState;
  const nextFirstState = firstPlan?.state ?? firstEntries[0]?.state;
  const tonalRegionContinuous =
    input.previousSnapshot?.tonalRegion.currentKey === undefined ||
    firstPlan === undefined ||
    keySignatureIdentity(input.previousSnapshot.tonalRegion.currentKey) === keySignatureIdentity(firstPlan.localKey) ||
    keySignatureIdentity(input.previousSnapshot.tonalRegion.targetKey) === keySignatureIdentity(firstPlan.localKey);
  const previousDensity = input.previousSnapshot?.densityArc.currentVoiceCount ?? 0;
  const densityContinuity =
    previousDensity === 0 || Math.abs(previousDensity - expectedFirstSectionDensity(nextFirstState)) <= 2;
  const startsWithExposition =
    nextFirstState === "exposition" || firstEntries.some((entry) => entry.state === "exposition");
  const repeatsInitialOrder = firstEntries.length >= 4 && entryOrderSimilarityToInitialExposition >= 1;
  const classification =
    input.segmentIndex === 0
      ? "accepted-continuation"
      : startsWithExposition
        ? repeatsInitialOrder
          ? "generator-response-required-reset"
          : "review-required-reexposition"
        : nextFirstState === "subject-return"
          ? "prepared-subject-return"
          : nextFirstState === "stretto-like"
            ? "prepared-stretto"
            : nextFirstState === "episode"
              ? "developmental-episode"
              : "accepted-continuation";
  const reasons = [
    input.segmentIndex === 0
      ? "segment 0 has no previous boundary and is treated as an initial generation"
      : input.previousSnapshot === undefined
        ? "segment has no previous snapshot and cannot be treated as a continuation"
        : "segment was generated with a carried snapshot",
    startsWithExposition
      ? "first structural state is exposition"
      : `first structural state is ${nextFirstState ?? "unknown"}`,
    input.segmentIndex === 0 && repeatsInitialOrder
      ? "initial segment uses the expected exposition entry order"
      : repeatsInitialOrder
        ? "first entries repeat the initial alto/soprano/tenor/bass order"
        : "first entries do not repeat the complete initial entry order",
  ];

  return {
    schemaVersion: 1,
    segmentIndex: input.segmentIndex,
    boundaryTick: input.previousSnapshot?.tick ?? 0,
    previousTailState,
    nextFirstState,
    firstEntries,
    entryOrderSimilarityToInitialExposition,
    carriedSubjectFamily,
    tonalRegionContinuous,
    densityContinuity,
    pianoRollSessionTimelineContinuous: input.segmentIndex === 0 || input.previousSnapshot !== undefined,
    classification,
    reasons,
  };
}

function keySignatureIdentity(keySignature: HarmonicPlan["localKey"] | undefined): string | undefined {
  return keySignature === undefined ? undefined : `${keySignature.tonic}:${keySignature.mode}`;
}

function expectedFirstSectionDensity(state: HarmonicPlan["state"] | undefined): number {
  if (state === "stretto-like") {
    return 4;
  }
  if (state === "subject-return") {
    return 3;
  }
  return 2;
}
