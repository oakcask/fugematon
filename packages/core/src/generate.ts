import { DEFAULT_SELECTION_MODEL, GENERATOR_VERSION, TICKS_PER_QUARTER } from "./constants.js";
import type {
  ContinuousSegmentContinuitySummary,
  GenerationInput,
  GenerationOutput,
  HarmonicPlan,
  NoteEvent,
  PlannedEntry,
  ScoreEvent,
  SectionConstraintScoringProfileId,
} from "./events.js";
import { normalizeSelectionModel } from "./events.js";
import {
  buildGeneratorSearchTrace,
  type ConstraintCandidate,
  evaluateScoreDraft,
  selectBestConstraintCandidate,
} from "./generation/constraint-core.js";
import { buildContinuousBoundaryCarrySummary } from "./generation/continuous-boundary-carry.js";
import { analyzeScore } from "./generation/diagnostics.js";
import { annotateEpisodeMotivicDerivations } from "./generation/episode-motivic-development.js";
import { chooseKeySignature, chooseTempo, chooseTimeSignature } from "./generation/key.js";
import { buildLocalSentinelCandidateTraceSummary } from "./generation/local-sentinel-candidate-trace.js";
import { createMeterContext } from "./generation/meter.js";
import { buildPhraseConvergenceReviewSummary } from "./generation/phrase-convergence-review.js";
import { buildPhraseDevelopmentReviewSummary } from "./generation/phrase-development-review.js";
import { buildScoreWindowAcceptanceSummary } from "./generation/score-window-acceptance.js";
import { buildConstraintSatisfactionReview } from "./generation/section-constraint-problem.js";
import {
  resolveSectionConstraintScoringProfile,
  sectionConstraintScoringProfileMetadata,
} from "./generation/section-constraint-scoring.js";
import { buildExposition, buildFugueContinuationScore, buildFugueScore } from "./generation/sections.js";
import { compareNoteEvents } from "./generation/shared.js";
import { buildSubject } from "./generation/subject.js";
import { applyTerminalClosureIntent, buildTerminalClosureReviewSummary } from "./generation/terminal-closure-review.js";
import type { Exposition } from "./generation/types.js";
import { createSegmentEndSnapshot, normalizeInfinitePlaybackMode } from "./infinite-playback.js";
import { Xoshiro128StarStar } from "./prng.js";
import {
  constrainNotePitchToWritingProfile,
  constrainNotesToWritingProfile,
  DEFAULT_WRITING_PROFILE_ID,
  resolveWritingProfile,
  type WritingProfile,
} from "./writing-profile.js";

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const mode = normalizeInfinitePlaybackMode(input.mode);
  const initialRng = Xoshiro128StarStar.fromSeed(input.seed);
  const writingProfile = resolveGenerationWritingProfile(input);
  const constraintProfile = resolveSectionConstraintScoringProfile(input.constraintProfileId);
  const initialKeySignature = chooseKeySignature(initialRng, input.seed, writingProfile);
  const initialTimeSignature = chooseTimeSignature(initialRng);
  const initialMeterContext = createMeterContext(initialTimeSignature);
  const initialBpm = chooseTempo(initialRng);
  const bpm = input.previousSegmentSnapshot?.timebase.bpm ?? initialBpm;
  const selectionModel = normalizeSelectionModel(input.selectionModel ?? DEFAULT_SELECTION_MODEL);
  const subject = buildSubject(initialRng, initialKeySignature, selectionModel, initialMeterContext, writingProfile);
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
  const expositionSearch = isContinuousContinuation
    ? undefined
    : buildExpositionSearchCandidates({
        subject,
        keySignature,
        lengthTicks: input.lengthTicks,
        meterContext,
        writingProfile,
        constraintProfileId: constraintProfile.id,
      });
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
        constraintProfileId: constraintProfile.id,
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
          initialExposition: expositionSearch?.selected.exposition,
        },
        writingProfile,
        constraintProfile.id,
      );
  applyTerminalClosureIntent(score, Math.max(input.lengthTicks, score.endTick), mode);
  annotateEpisodeMotivicDerivations(score.notes, score.sectionPlans);
  constrainNotesToWritingProfile(score.notes, writingProfile);
  repairMusicBoxVoiceCrossings(score, writingProfile);
  repairMusicBoxSamePitchOverlaps(
    score,
    Math.max(input.lengthTicks, score.endTick),
    writingProfile,
    constraintProfile.id,
  );
  const finalProfileInvariantCandidate = buildFinalWritingProfileInvariantCandidate(
    score,
    Math.max(input.lengthTicks, score.endTick),
    writingProfile,
    constraintProfile.id,
  );
  const diagnostics = analyzeScore(score.notes, score.subjectEntries, score.sectionPlans, writingProfile);
  const constraintSatisfactionReview = buildConstraintSatisfactionReview({
    notes: score.notes,
    subjectEntries: score.subjectEntries,
    sectionPlans: score.sectionPlans,
  });
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
    diagnostics.exposedFreeCounterpointSolo,
    diagnostics.harmonicContinuity,
    diagnostics.harmonicStasisRearticulation,
    diagnostics.transitionRhythmReview,
    diagnostics.dissonanceTriage,
    diagnostics.qualityVector,
    phraseDevelopmentReview,
  );
  const generatedUntilTick = Math.max(input.lengthTicks, score.endTick);
  const generatorSearchTrace =
    expositionSearch === undefined
      ? buildContinuationGeneratorSearchTrace(score, generatedUntilTick, writingProfile, constraintProfile.id)
      : buildGeneratorSearchTrace(
          [...expositionSearch.candidates, ...score.selectedConstraintCandidates, finalProfileInvariantCandidate],
          expositionSearch.selected,
          "solver",
        );

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
      constraintProfile: sectionConstraintScoringProfileMetadata(constraintProfile),
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
      constraintSatisfactionReview,
      generatorSearchTrace,
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

function repairMusicBoxSamePitchOverlaps(
  score: Exposition & { selectedConstraintCandidates?: ConstraintCandidate[] },
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
): void {
  if (writingProfile.playability?.kind !== "music-box") {
    return;
  }

  const beforeCandidate = buildScoreConstraintCandidate(
    "score-music-box-same-pitch-overlap-unrepaired-final-repair-evidence",
    score.notes,
    score,
    generatedUntilTick,
    writingProfile,
    constraintProfileId,
  );
  const safeNotes = removeVoiceCrossingFreeCounterpointNotes(
    retuneStructuralMusicBoxDuplicateStrikes(
      removeDuplicateFreeCounterpointStrikes(score.notes),
      writingProfile,
      false,
    ),
  );
  const safeCandidate = buildScoreConstraintCandidate(
    "score-music-box-same-pitch-overlap-solver-repaired",
    safeNotes,
    score,
    generatedUntilTick,
    writingProfile,
    constraintProfileId,
  );
  const selectedCandidate = acceptableSamePitchRepair(beforeCandidate, safeCandidate)
    ? broaderMusicBoxSamePitchRepair(safeCandidate, score, generatedUntilTick, writingProfile, constraintProfileId)
    : undefined;

  const afterCandidate =
    selectedCandidate ?? (acceptableSamePitchRepair(beforeCandidate, safeCandidate) ? safeCandidate : undefined);
  if (afterCandidate === undefined) {
    return;
  }

  score.notes.splice(0, score.notes.length, ...(afterCandidate.draft.notes as NoteEvent[]));
  score.selectedConstraintCandidates?.push(beforeCandidate, afterCandidate);
}

function repairMusicBoxVoiceCrossings(score: Exposition, writingProfile: WritingProfile): void {
  if (writingProfile.playability?.kind !== "music-box") {
    return;
  }

  let repairedNotes = removeVoiceCrossingFreeCounterpointNotes(score.notes);
  for (let attempt = 0; attempt < 128; attempt += 1) {
    const crossing = firstVoiceCrossing(repairedNotes);
    if (crossing === undefined) {
      break;
    }
    const repair = bestMusicBoxVoiceCrossingRetune(crossing, repairedNotes, score, writingProfile);
    if (repair === undefined) {
      break;
    }
    repairedNotes = repairedNotes.map((note) => (note === repair.note ? { ...note, pitch: repair.pitch } : note));
  }

  score.notes.splice(0, score.notes.length, ...repairedNotes);
}

function bestMusicBoxVoiceCrossingRetune(
  crossing: readonly [NoteEvent, NoteEvent],
  notes: readonly NoteEvent[],
  score: Pick<Exposition, "subjectEntries" | "sectionPlans" | "endTick">,
  writingProfile: WritingProfile,
): { note: NoteEvent; pitch: number } | undefined {
  const beforeFailureCount = totalHardFailureCount(
    evaluateScoreDraft({
      notes,
      subjectEntries: score.subjectEntries,
      sectionPlans: score.sectionPlans,
      endTick: score.endTick,
      writingProfile,
      constraintProfileId: undefined,
    }),
  );
  const candidates = crossing.flatMap((note) =>
    musicBoxVoiceCrossingReplacementPitches(note, notes, writingProfile).map((pitch) => ({ note, pitch })),
  );

  return candidates
    .map((candidate) => {
      const candidateNotes = notes.map((note) =>
        note === candidate.note ? { ...note, pitch: candidate.pitch } : note,
      );
      const failureCount = totalHardFailureCount(
        evaluateScoreDraft({
          notes: candidateNotes,
          subjectEntries: score.subjectEntries,
          sectionPlans: score.sectionPlans,
          endTick: score.endTick,
          writingProfile,
          constraintProfileId: undefined,
        }),
      );
      return {
        ...candidate,
        failureCount,
        distance: Math.abs(candidate.pitch - candidate.note.pitch),
      };
    })
    .filter((candidate) => candidate.failureCount < beforeFailureCount)
    .sort(
      (left, right) =>
        left.failureCount - right.failureCount ||
        retuneRolePriority(left.note) - retuneRolePriority(right.note) ||
        left.distance - right.distance ||
        left.pitch - right.pitch,
    )[0];
}

function musicBoxVoiceCrossingReplacementPitches(
  note: NoteEvent,
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
): number[] {
  const range = writingProfile.voiceRanges[note.voice];
  return writingProfile.absolutePitchSet
    .filter(
      (pitch) =>
        pitch !== note.pitch &&
        range.min <= pitch &&
        pitch <= range.max &&
        !notes.some(
          (other) => other !== note && other.voice !== note.voice && other.pitch === pitch && notesOverlap(note, other),
        ),
    )
    .sort(
      (left, right) =>
        Math.abs(left - note.pitch) - Math.abs(right - note.pitch) ||
        preferredPitchPenalty(left, note.voice, writingProfile) -
          preferredPitchPenalty(right, note.voice, writingProfile) ||
        left - right,
    );
}

function broaderMusicBoxSamePitchRepair(
  baselineCandidate: ConstraintCandidate,
  score: Pick<Exposition, "subjectEntries" | "sectionPlans">,
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
): ConstraintCandidate | undefined {
  const repairedNotes = removeVoiceCrossingFreeCounterpointNotes(
    retuneStructuralMusicBoxDuplicateStrikes(baselineCandidate.draft.notes, writingProfile, true),
  );
  const candidate = buildScoreConstraintCandidate(
    "score-music-box-same-pitch-overlap-solver-repaired",
    repairedNotes,
    score,
    generatedUntilTick,
    writingProfile,
    constraintProfileId,
  );
  return acceptableSamePitchRepair(baselineCandidate, candidate) ? candidate : undefined;
}

function acceptableSamePitchRepair(beforeCandidate: ConstraintCandidate, afterCandidate: ConstraintCandidate): boolean {
  return (
    hardFailureCount(afterCandidate.result, "writing-profile-same-pitch-overlap") <
      hardFailureCount(beforeCandidate.result, "writing-profile-same-pitch-overlap") &&
    nonSamePitchHardFailureCount(afterCandidate.result) <= nonSamePitchHardFailureCount(beforeCandidate.result)
  );
}

function buildScoreConstraintCandidate(
  candidateId: string,
  notes: readonly NoteEvent[],
  score: Pick<Exposition, "subjectEntries" | "sectionPlans">,
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
): ConstraintCandidate {
  const draft = {
    notes,
    subjectEntries: score.subjectEntries,
    sectionPlans: score.sectionPlans,
    endTick: generatedUntilTick,
    writingProfile,
    constraintProfileId,
  };
  return {
    candidateId,
    draft,
    result: evaluateScoreDraft(draft),
  };
}

function samePitchOverlaps(notes: readonly NoteEvent[]): Array<[NoteEvent, NoteEvent]> {
  const overlaps: Array<[NoteEvent, NoteEvent]> = [];
  const sortedNotes = [...notes].sort(compareNoteEvents);
  for (let leftIndex = 0; leftIndex < sortedNotes.length; leftIndex += 1) {
    const left = sortedNotes[leftIndex];
    if (left === undefined) {
      continue;
    }
    for (let rightIndex = leftIndex + 1; rightIndex < sortedNotes.length; rightIndex += 1) {
      const right = sortedNotes[rightIndex];
      if (right === undefined || right.startTick >= left.startTick + left.durationTicks) {
        break;
      }
      if (left.voice !== right.voice && left.pitch === right.pitch && notesOverlap(left, right)) {
        overlaps.push([left, right]);
      }
    }
  }
  return overlaps;
}

function hardFailureCount(result: ReturnType<typeof evaluateScoreDraft>, code: string): number {
  return result.hardFailures.find((failure) => failure.code === code)?.count ?? 0;
}

function nonSamePitchHardFailureCount(result: ReturnType<typeof evaluateScoreDraft>): number {
  return result.hardFailures
    .filter((failure) => failure.code !== "writing-profile-same-pitch-overlap")
    .reduce((sum, failure) => sum + failure.count, 0);
}

function totalHardFailureCount(result: ReturnType<typeof evaluateScoreDraft>): number {
  return result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
}

function removeDuplicateFreeCounterpointStrikes(notes: readonly NoteEvent[]): NoteEvent[] {
  let repairedNotes = [...notes];
  for (let attempt = 0; attempt < 256; attempt += 1) {
    const droppableNote = samePitchOverlaps(repairedNotes)
      .flat()
      .find((note) => note.role === "free-counterpoint" || note.role === undefined);
    if (droppableNote === undefined) {
      break;
    }
    repairedNotes = repairedNotes.filter((note) => note !== droppableNote);
  }
  return repairedNotes;
}

function retuneStructuralMusicBoxDuplicateStrikes(
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
  includeEntryRoles: boolean,
): NoteEvent[] {
  const repairedNotes = [...notes];
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const repair = samePitchOverlaps(repairedNotes)
      .map((overlap) => structuralMusicBoxRetune(overlap, repairedNotes, writingProfile, includeEntryRoles))
      .find((candidate) => candidate !== undefined);
    if (repair === undefined) {
      break;
    }
    repairedNotes[repair.noteIndex] = { ...repair.note, pitch: repair.pitch };
  }
  return repairedNotes;
}

function structuralMusicBoxRetune(
  overlap: readonly [NoteEvent, NoteEvent],
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
  includeEntryRoles: boolean,
): { note: NoteEvent; noteIndex: number; pitch: number } | undefined {
  const orderedNotes = [...overlap].sort((left, right) => retuneRolePriority(left) - retuneRolePriority(right));
  for (const note of orderedNotes) {
    if (!includeEntryRoles && note.role !== "counter-subject") {
      continue;
    }
    const pitch = structuralReplacementPitches(note, notes, writingProfile)[0];
    if (pitch === undefined) {
      continue;
    }
    return { note, noteIndex: notes.indexOf(note), pitch };
  }
  return undefined;
}

function retuneRolePriority(note: NoteEvent): number {
  if (note.role === "counter-subject") {
    return 0;
  }
  if (note.role === "free-counterpoint" || note.role === undefined) {
    return 1;
  }
  if (note.voice === "bass" || note.voice === "tenor") {
    return 2;
  }
  return 3;
}

function structuralReplacementPitches(
  note: NoteEvent,
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
): number[] {
  const samePitchClass = samePitchClassReplacementPitches(note, notes, writingProfile);
  if (samePitchClass.length > 0 || note.role !== "counter-subject") {
    return samePitchClass;
  }
  const range = writingProfile.voiceRanges[note.voice];
  return writingProfile.absolutePitchSet
    .filter(
      (pitch) =>
        pitch !== note.pitch &&
        range.min <= pitch &&
        pitch <= range.max &&
        !notes.some(
          (other) => other !== note && other.voice !== note.voice && other.pitch === pitch && notesOverlap(note, other),
        ),
    )
    .sort(
      (left, right) =>
        Math.abs(left - note.pitch) - Math.abs(right - note.pitch) ||
        preferredPitchPenalty(left, note.voice, writingProfile) -
          preferredPitchPenalty(right, note.voice, writingProfile) ||
        left - right,
    );
}

function removeVoiceCrossingFreeCounterpointNotes(notes: readonly NoteEvent[]): NoteEvent[] {
  let repairedNotes = [...notes];
  for (let attempt = 0; attempt < 256; attempt += 1) {
    const crossing = firstVoiceCrossing(repairedNotes);
    if (crossing === undefined) {
      break;
    }
    const droppable = crossing.find((note) => note.role === "free-counterpoint" || note.role === undefined);
    if (droppable === undefined) {
      break;
    }
    repairedNotes = repairedNotes.filter((note) => note !== droppable);
  }
  return repairedNotes;
}

function firstVoiceCrossing(notes: readonly NoteEvent[]): [NoteEvent, NoteEvent] | undefined {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const adjacentPairs: Array<[higher: NoteEvent["voice"], lower: NoteEvent["voice"]]> = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];

  for (const tick of checkpoints) {
    for (const [higher, lower] of adjacentPairs) {
      const higherNote = notes.find(
        (note) => note.voice === higher && note.startTick <= tick && tick < note.startTick + note.durationTicks,
      );
      const lowerNote = notes.find(
        (note) => note.voice === lower && note.startTick <= tick && tick < note.startTick + note.durationTicks,
      );
      if (higherNote !== undefined && lowerNote !== undefined && higherNote.pitch < lowerNote.pitch) {
        return [higherNote, lowerNote];
      }
    }
  }
  return undefined;
}

function samePitchClassReplacementPitches(
  note: NoteEvent,
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
): number[] {
  const range = writingProfile.voiceRanges[note.voice];
  const pitchClass = positiveModulo(note.pitch, 12);
  return writingProfile.absolutePitchSet
    .filter(
      (pitch) =>
        pitch !== note.pitch &&
        positiveModulo(pitch, 12) === pitchClass &&
        range.min <= pitch &&
        pitch <= range.max &&
        !notes.some(
          (other) => other !== note && other.voice !== note.voice && other.pitch === pitch && notesOverlap(note, other),
        ),
    )
    .sort(
      (left, right) =>
        Math.abs(left - note.pitch) - Math.abs(right - note.pitch) ||
        preferredPitchPenalty(left, note.voice, writingProfile) -
          preferredPitchPenalty(right, note.voice, writingProfile) ||
        left - right,
    );
}

function preferredPitchPenalty(pitch: number, voice: NoteEvent["voice"], writingProfile: WritingProfile): number {
  return pitch > (writingProfile.preferredMaxByVoice?.[voice] ?? writingProfile.voiceRanges[voice].max) ? 1 : 0;
}

function notesOverlap(left: NoteEvent, right: NoteEvent): boolean {
  return (
    left.startTick < right.startTick + right.durationTicks && right.startTick < left.startTick + left.durationTicks
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
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

type ExpositionSearchCandidate = ConstraintCandidate & {
  exposition: Exposition;
};

function buildExpositionSearchCandidates(input: {
  subject: Parameters<typeof buildExposition>[0];
  keySignature: Parameters<typeof buildExposition>[1];
  lengthTicks: number;
  meterContext: Parameters<typeof buildExposition>[2];
  writingProfile: WritingProfile;
  constraintProfileId: SectionConstraintScoringProfileId;
}): {
  candidates: ExpositionSearchCandidate[];
  selected: ExpositionSearchCandidate;
} {
  const candidates = [
    buildExpositionSearchCandidate(
      "exposition-a-current-contract",
      buildExposition(input.subject, input.keySignature, input.meterContext, input.writingProfile),
      input.writingProfile,
      input.constraintProfileId,
    ),
    buildExpositionSearchCandidate(
      "exposition-b-current-contract-repeatability-check",
      buildExposition(input.subject, input.keySignature, input.meterContext, input.writingProfile),
      input.writingProfile,
      input.constraintProfileId,
    ),
  ];

  return {
    candidates,
    selected: selectBestConstraintCandidate(candidates) as ExpositionSearchCandidate,
  };
}

function buildExpositionSearchCandidate(
  candidateId: string,
  exposition: Exposition,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
): ExpositionSearchCandidate {
  const draft = {
    notes: exposition.notes,
    subjectEntries: exposition.subjectEntries,
    sectionPlans: exposition.sectionPlans,
    endTick: exposition.endTick,
    writingProfile,
    constraintProfileId,
  };
  return {
    candidateId,
    exposition,
    draft,
    result: evaluateScoreDraft(draft),
  };
}

function buildDiagnosticsOnlyGeneratorSearchTrace(
  score: Exposition,
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
) {
  const legacyConstraintCandidate = buildExpositionSearchCandidate(
    "legacy-generated-score",
    {
      notes: score.notes,
      subjectEntries: score.subjectEntries,
      sectionPlans: score.sectionPlans,
      endTick: generatedUntilTick,
      durationTicks: generatedUntilTick,
    },
    writingProfile,
    constraintProfileId,
  );
  return buildGeneratorSearchTrace(
    [legacyConstraintCandidate],
    selectBestConstraintCandidate([legacyConstraintCandidate]),
  );
}

function buildContinuationGeneratorSearchTrace(
  score: Exposition & { selectedConstraintCandidates?: readonly ConstraintCandidate[] },
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
) {
  const candidates = [
    ...(score.selectedConstraintCandidates ?? []),
    buildFinalWritingProfileInvariantCandidate(score, generatedUntilTick, writingProfile, constraintProfileId),
  ];
  if (candidates.length === 0) {
    return buildDiagnosticsOnlyGeneratorSearchTrace(score, generatedUntilTick, writingProfile, constraintProfileId);
  }

  const selectedBoundaryCandidate =
    candidates.find((candidate) => candidate.candidateId.includes("boundary-continuation-solver-repaired")) ??
    candidates.find((candidate) => candidate.candidateId.includes("boundary-continuation-candidate-0")) ??
    selectBestConstraintCandidate(candidates);

  return buildGeneratorSearchTrace(candidates, selectedBoundaryCandidate, "solver");
}

function buildFinalWritingProfileInvariantCandidate(
  score: Pick<Exposition, "notes" | "subjectEntries" | "sectionPlans">,
  generatedUntilTick: number,
  writingProfile: WritingProfile,
  constraintProfileId: SectionConstraintScoringProfileId,
): ConstraintCandidate {
  const projectedChangeCount = score.notes.filter(
    (note) => constrainNotePitchToWritingProfile(note, writingProfile) !== note.pitch,
  ).length;
  const draft = {
    notes: score.notes,
    subjectEntries: score.subjectEntries,
    sectionPlans: score.sectionPlans,
    endTick: generatedUntilTick,
    writingProfile,
    constraintProfileId,
  };
  const result = evaluateScoreDraft(draft);
  return {
    candidateId:
      projectedChangeCount === 0
        ? "score-writing-profile-final-projection-noop"
        : "score-writing-profile-final-projection-hard-failure",
    draft,
    result:
      projectedChangeCount === 0
        ? result
        : {
            ...result,
            explanation:
              "candidate would require post-solve WritingProfile projection and must remain a hard contract failure",
          },
  };
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
