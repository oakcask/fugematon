import { classifyCandidatePoolOracleSection, summarizeCandidatePoolOracleSections } from "../candidate-pool-oracle.js";
import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AnswerKind,
  CadenceKind,
  CandidateDiversityDescriptor,
  CandidateEvaluation,
  EntryForm,
  EpisodeMotiveSource,
  EpisodeTargetFunction,
  EpisodeTransformationKind,
  FragmentTransform,
  FugueState,
  HarmonicPlan,
  KeySignature,
  MeterContext,
  NoteEvent,
  PlannedEntry,
  SelectionModel,
  SequencePattern,
  StyleProfile,
  TerminalCodaArchetype,
  TerminalCodaContextSummary,
  TerminalSectionIntent,
  Voice,
} from "../events.js";
import type { SegmentSnapshot } from "../infinite-playback.js";
import { Xoshiro128StarStar } from "../prng.js";
import {
  nearestWritingProfilePitchForPitchClass,
  resolveWritingProfile,
  type WritingProfile,
} from "../writing-profile.js";
import { type ConstraintCandidate, evaluateScoreDraft } from "./constraint-core.js";
import { isSubjectEntryPlanFeasibleForProfile } from "./constraint-domain.js";
import { applyContinuousBoundaryCarrySolver } from "./continuous-boundary-carry.js";
import { analyzeScore } from "./diagnostics.js";
import { addSubjectEntry, chooseAnswerKind } from "./entries.js";
import { evaluateCandidate } from "./evaluation.js";
import { analyzeHarmonicContinuity } from "./harmonic-continuity-review.js";
import {
  analyzeHarmonicStasisRearticulation,
  repairHarmonicStasisRearticulation,
} from "./harmonic-stasis-rearticulation.js";
import { buildHarmonicPlan, cadenceKindForSection } from "./harmony.js";
import { characteristicScaleDegree, isModalMode, tonicPitchClass, transposeKey } from "./key.js";
import { createLegacyMeterContext, previousMeasureDownbeat } from "./meter.js";
import { buildPhraseDevelopmentReviewSummary } from "./phrase-development-review.js";
import { melodicRoleForScaleDegree, scaleDegreePitchClass } from "./pitch.js";
import { buildScoreWindowAcceptanceSummary } from "./score-window-acceptance.js";
import { candidateSelectionScore } from "./selection-risk-adjustments.js";
import {
  compareNoteEvents,
  ENTRY_SPACING_TICKS,
  positiveModulo,
  STRETTO_ENTRY_SPACING_TICKS,
  subjectDuration,
  VOICE_ENTRY_ORDER,
} from "./shared.js";
import {
  addBassAnswerTailTextureSupport,
  addContinuityCounterpoint,
  addCounterpointTexture,
  addExposedFreeCounterpointSoloSupport,
  addFunctionalThinningSupport,
  addPostEntryContinuationSupport,
  addShortEpisodeHarmonicContinuitySupport,
  type ContinuityLineKind,
  fillAllVoiceSilenceGaps,
  repairTextureVoiceCrossingsForNotes,
  shapeLongRestPhraseClosures,
  softenBassEntryBoundaryResets,
  softenFirstBassEntryBoundaryReset,
} from "./texture.js";
import type { Exposition, FugueScore, SubjectNote } from "./types.js";

const CONTINUATION_STATE_PATTERNS: readonly (readonly FugueState[])[] = [
  ["episode", "subject-return", "episode", "stretto-like"],
  ["episode", "subject-return", "stretto-like", "episode", "subject-return"],
  ["subject-return", "episode", "episode", "stretto-like", "subject-return"],
  ["episode", "stretto-like", "episode", "subject-return"],
];

type PhraseDensityArc = "thin" | "balanced" | "full";

type ContinuationPhraseSectionIntent = {
  state: FugueState;
  cadenceKind?: CadenceKind;
  keyOffset: number;
  densityArc: PhraseDensityArc;
};

type ContinuationPhraseUnit = {
  sections: ContinuationPhraseSectionIntent[];
};

type TerminalCodaOptions = {
  terminalCodaIntent?: Extract<TerminalSectionIntent, "self-contained-coda">;
  initialExposition?: Exposition;
};

type TerminalCodaReservation = {
  startTick: number;
  durationTicks: number;
};

type ScoreLevelSupportCleanupSurface = {
  id: string;
  apply: (notes: NoteEvent[]) => void;
};

type ScoreLevelSupportCleanupReview = {
  hardFailureCount: number;
  scoreWindowReviewRequiredCount: number;
  scoreWindowGeneratorResponseCount: number;
  scoreWindowAcceptedContextCount: number;
  harmonicContinuityReviewRequiredCount: number;
};

type ContinuationSectionSelection = {
  section: Exposition;
  candidateCount: number;
  evaluation: CandidateEvaluation;
  constraintCandidate: ConstraintCandidate;
  constraintCandidates: readonly ConstraintCandidate[];
  oracleSection: ReturnType<typeof classifyCandidatePoolOracleSection>;
};

export function buildFugueScore(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  lengthTicks: number,
  rng: Xoshiro128StarStar,
  selectionModel: SelectionModel = "baseline",
  meterContext: MeterContext = createLegacyMeterContext(),
  options: TerminalCodaOptions = {},
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
): FugueScore {
  const counterSubjectSupportRepair = lengthTicks >= TICKS_PER_QUARTER * 288;
  const exposition =
    options.initialExposition ??
    buildExposition(subject, keySignature, counterSubjectSupportRepair, meterContext, writingProfile);
  const notes = [...exposition.notes];
  const subjectEntries = [...exposition.subjectEntries];
  const sectionPlans = [...exposition.sectionPlans];
  const stateTransitions: FugueState[] = ["exposition"];
  const stateChanges: FugueScore["stateChanges"] = [];
  const selectedCandidateEvaluations: CandidateEvaluation[] = [];
  const selectedConstraintCandidates: ConstraintCandidate[] = [];
  const candidatePoolOracleSections: ReturnType<typeof classifyCandidatePoolOracleSection>[] = [];
  let terminalCoda: Exposition | undefined;
  let protectedTerminalCodaNotes: NoteEvent[] = [];
  let candidateEvaluations = 0;
  let sectionStartTick = exposition.endTick;
  const continuationPattern = chooseContinuationStatePattern(rng);
  const continuationPatternIndex = CONTINUATION_STATE_PATTERNS.indexOf(continuationPattern);
  let continuationCycleIndex = 0;
  let stateIndex = 0;
  let phraseUnit: ContinuationPhraseUnit | undefined;
  let phraseSectionIndex = 0;
  const terminalCodaReservation =
    options.terminalCodaIntent === "self-contained-coda"
      ? planTerminalCodaReservation(lengthTicks, exposition.endTick, meterContext)
      : undefined;
  const ordinaryGenerationEndTick = terminalCodaReservation?.startTick ?? lengthTicks;

  while (sectionStartTick < ordinaryGenerationEndTick) {
    const statePattern = continuationPatternForCycle(
      continuationPattern,
      continuationPatternIndex,
      continuationCycleIndex,
      isModalMode(keySignature.mode),
    );
    if (
      selectionModel === "section-local-planner" &&
      (phraseUnit === undefined || phraseSectionIndex >= phraseUnit.sections.length)
    ) {
      phraseUnit = chooseContinuationPhraseUnit({
        primaryPattern: statePattern,
        stateIndex,
        stateHistory: stateTransitions,
        previousSectionPlans: sectionPlans,
        previousNotes: notes,
        keySignature,
        preserveSubjectFamily:
          isModalMode(keySignature.mode) && latestContinuationPatternRepeatCount(stateTransitions) < 4,
      });
      phraseSectionIndex = 0;
    }

    const phraseIntent = phraseUnit?.sections[phraseSectionIndex];
    const state = phraseIntent?.state ?? statePattern[stateIndex]!;
    const sectionDurationTicks = chooseContinuationSectionTicks(state, rng, meterContext);
    const durationCandidates =
      selectionModel === "section-local-planner"
        ? boundedContinuationDurationCandidates(state, sectionDurationTicks, meterContext)
        : [sectionDurationTicks];
    if (terminalCodaReservation !== undefined) {
      const remainingTicks = ordinaryGenerationEndTick - sectionStartTick;
      const minimumSectionTicks = minimumContinuationSectionTicks(meterContext);
      if (
        remainingTicks < minimumSectionTicks ||
        !durationCandidates.some((durationTicks) => durationTicks <= remainingTicks)
      ) {
        break;
      }
    }
    const selection = chooseContinuationSectionFromDurationCandidates({
      subject,
      keySignature,
      state,
      startTick: sectionStartTick,
      durationCandidates,
      rng,
      previousNotes: notes,
      selectionModel,
      stateHistory: [...stateTransitions, state],
      previousSectionPlans: sectionPlans,
      previousSubjectEntries: subjectEntries,
      phraseIntent,
      counterSubjectSupportRepair,
      meterContext,
      writingProfile,
      maxDurationTicks:
        terminalCodaReservation === undefined ? undefined : ordinaryGenerationEndTick - sectionStartTick,
      ordinaryGenerationEndTick,
    });
    if (selectionModel === "section-local-planner") {
      softenBassEntryBoundaryResets(selection.section.notes, selection.section.subjectEntries, notes);
      selection.section.notes.sort(compareNoteEvents);
      selection.evaluation = evaluateCandidate(notes, selection.section, subjectEntries, sectionPlans, writingProfile);
    }
    const selectedState = selection.section.sectionPlans[0]?.state ?? state;
    stateTransitions.push(selectedState);
    stateChanges.push({ tick: sectionStartTick, state: selectedState });
    notes.push(...selection.section.notes);
    subjectEntries.push(...selection.section.subjectEntries);
    sectionPlans.push(...selection.section.sectionPlans);
    candidateEvaluations += selection.candidateCount;
    selectedCandidateEvaluations.push(selection.evaluation);
    selectedConstraintCandidates.push(...selection.constraintCandidates);
    candidatePoolOracleSections.push(selection.oracleSection);
    sectionStartTick += selection.section.durationTicks;
    stateIndex += 1;
    if (stateIndex >= statePattern.length) {
      stateIndex = 0;
      continuationCycleIndex += 1;
    }
    phraseSectionIndex += 1;
  }

  if (terminalCodaReservation !== undefined) {
    terminalCoda = buildTerminalCodaSection(
      subject,
      keySignature,
      terminalCodaReservation,
      meterContext,
      notes,
      sectionPlans,
      writingProfile,
    );
    protectedTerminalCodaNotes = cloneNotes(terminalCoda.notes);
    clipNotesAtTick(notes, terminalCodaReservation.startTick);
    stateTransitions.push("subject-return");
    stateChanges.push({ tick: terminalCodaReservation.startTick, state: "subject-return" });
    notes.push(...terminalCoda.notes);
    sectionPlans.push(...terminalCoda.sectionPlans);
  }

  fillAllVoiceSilenceGaps(notes, keySignature, writingProfile);
  selectedConstraintCandidates.push(
    ...applyScoreLevelTextureVoiceOrderCandidateAdoptions({
      notes,
      subjectEntries,
      sectionPlans,
      writingProfile,
    }),
  );
  if (selectionModel === "section-local-planner") {
    selectedConstraintCandidates.push(
      ...applyScoreLevelSupportCleanupCandidateAdoptions({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
  }
  notes.sort(compareNoteEvents);
  if (selectionModel === "section-local-planner") {
    selectedConstraintCandidates.push(
      ...applyScoreLevelHarmonicContinuitySolver({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
    selectedConstraintCandidates.push(
      ...applyScoreLevelHarmonicStasisSolver({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
    selectedConstraintCandidates.push(
      ...applyScoreLevelTextureVoiceOrderCandidateAdoptions({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
  }
  if (terminalCodaReservation !== undefined && terminalCoda !== undefined) {
    clipNotesAtTick(notes, terminalCodaReservation.startTick);
    const restoredTerminalCodaNotes = cloneNotes(protectedTerminalCodaNotes);
    reinforceTerminalCodaDerivation(
      restoredTerminalCodaNotes,
      terminalCoda.sectionPlans[0]?.terminalCodaContext,
      terminalCodaReservation.startTick,
    );
    notes.push(...restoredTerminalCodaNotes);
    notes.sort(compareNoteEvents);
  }
  repairTextureVoiceCrossingsForNotes(notes, sectionPlans, writingProfile);
  restoreEntryPitchClassIdentity(notes, subjectEntries, writingProfile);
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    candidateEvaluations,
    selectedCandidateEvaluations,
    selectedConstraintCandidates,
    candidatePoolOracle: summarizeCandidatePoolOracleSections(candidatePoolOracleSections),
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function planTerminalCodaReservation(
  lengthTicks: number,
  expositionEndTick: number,
  meterContext: MeterContext,
): TerminalCodaReservation | undefined {
  const desiredDurationTicks = meterContext.measureTicks * 2;
  const startTick = previousMeasureDownbeat(Math.max(0, lengthTicks - desiredDurationTicks), meterContext);
  if (startTick < expositionEndTick || lengthTicks - startTick < desiredDurationTicks) {
    return undefined;
  }
  return {
    startTick,
    durationTicks: lengthTicks - startTick,
  };
}

function minimumContinuationSectionTicks(meterContext: MeterContext): number {
  if (meterContext.timeSignature.numerator === 4) {
    return TICKS_PER_QUARTER * 6;
  }
  return meterContext.measureTicks * 2;
}

function clipNotesAtTick(notes: NoteEvent[], tick: number): void {
  const clippedNotes = notes.flatMap((note): NoteEvent[] => {
    if (note.startTick >= tick) {
      return [];
    }
    const noteEndTick = note.startTick + note.durationTicks;
    if (noteEndTick <= tick) {
      return [note];
    }
    const durationTicks = tick - note.startTick;
    return durationTicks > 0 ? [{ ...note, durationTicks }] : [];
  });
  notes.splice(0, notes.length, ...clippedNotes);
}

function cloneNotes(notes: readonly NoteEvent[]): NoteEvent[] {
  return notes.map((note) => ({
    ...note,
    motivicDerivation:
      note.motivicDerivation === undefined
        ? undefined
        : {
            ...note.motivicDerivation,
          },
  }));
}

function cloneExposition(section: Exposition): Exposition {
  return {
    ...section,
    notes: cloneNotes(section.notes),
    subjectEntries: [...section.subjectEntries],
    sectionPlans: [...section.sectionPlans],
  };
}

function restoreEntryPitchClassIdentity(
  notes: NoteEvent[],
  subjectEntries: PlannedEntry[],
  writingProfile: WritingProfile,
): void {
  const retainedEntries: PlannedEntry[] = [];
  const activeEntryEndByVoice = new Map<Voice, number>();
  const removedEntrySpans: Array<{ voice: Voice; role: NoteEvent["role"]; startTick: number; endTick: number }> = [];

  for (const entry of [...subjectEntries].sort((left, right) => left.startTick - right.startTick)) {
    const entryRole = noteRoleForEntryForm(entry.form);
    const entryNotes = notes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick && note.role === entryRole)
      .sort(compareNoteEvents)
      .slice(0, entry.actualPitchClassSequence.length);
    const entryEndTick = entryNotes.at(-1)?.startTick ?? entry.startTick;
    const activeEntryEnd = activeEntryEndByVoice.get(entry.voice);
    if (activeEntryEnd !== undefined && entry.startTick <= activeEntryEnd) {
      removedEntrySpans.push({
        voice: entry.voice,
        role: entryRole,
        startTick: entry.startTick,
        endTick: entryEndTick,
      });
      continue;
    }
    retainedEntries.push(entry);
    activeEntryEndByVoice.set(entry.voice, entryEndTick);
  }

  if (retainedEntries.length !== subjectEntries.length) {
    subjectEntries.splice(0, subjectEntries.length, ...retainedEntries);
    notes.splice(
      0,
      notes.length,
      ...notes.filter(
        (note) =>
          !removedEntrySpans.some(
            (span) =>
              note.voice === span.voice &&
              note.role === span.role &&
              span.startTick <= note.startTick &&
              note.startTick <= span.endTick,
          ),
      ),
    );
  }

  for (const entry of retainedEntries) {
    const entryRole = noteRoleForEntryForm(entry.form);
    const entryNotes = notes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
      .filter((note) => entryRole === undefined || note.role === entryRole)
      .sort(compareNoteEvents)
      .slice(0, entry.actualPitchClassSequence.length);
    const entryNoteSet = new Set(entryNotes);
    const entryStartTicks = new Set(entryNotes.map((note) => note.startTick));
    if (entryStartTicks.size > 0) {
      notes.splice(
        0,
        notes.length,
        ...notes.filter(
          (note) =>
            note.voice !== entry.voice ||
            !entryStartTicks.has(note.startTick) ||
            note.role === entryRole ||
            entryNoteSet.has(note),
        ),
      );
    }
    for (const [index, note] of entryNotes.entries()) {
      const pitchClass = entry.actualPitchClassSequence[index];
      if (pitchClass === undefined || positiveModulo(note.pitch, 12) === pitchClass) {
        continue;
      }
      note.pitch = nearestWritingProfilePitchForPitchClass(pitchClass, note.pitch, note.voice, writingProfile);
    }
  }
}

function noteRoleForEntryForm(form: EntryForm): NoteEvent["role"] {
  if (form === "answer") {
    return "answer";
  }
  if (form === "subject-fragment") {
    return "subject-fragment";
  }
  return "subject";
}

function applyScoreLevelSupportCleanupCandidateAdoptions(input: {
  notes: NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  writingProfile: WritingProfile;
}): ConstraintCandidate[] {
  const candidates: ConstraintCandidate[] = [];
  const surfaces: readonly ScoreLevelSupportCleanupSurface[] = [
    {
      id: "texture-voice-crossing-repair",
      apply: (notes) => repairTextureVoiceCrossingsForNotes(notes, input.sectionPlans, input.writingProfile),
    },
    {
      id: "functional-thinning-support",
      apply: (notes) => addFunctionalThinningSupport(notes, input.sectionPlans, input.writingProfile),
    },
    {
      id: "post-entry-continuation-support",
      apply: (notes) =>
        addPostEntryContinuationSupport(notes, input.subjectEntries, input.sectionPlans, input.writingProfile),
    },
    {
      id: "long-rest-phrase-closure",
      apply: (notes) => shapeLongRestPhraseClosures(notes, input.sectionPlans),
    },
    {
      id: "bass-answer-tail-texture-support",
      apply: (notes) =>
        addBassAnswerTailTextureSupport(notes, input.subjectEntries, input.sectionPlans, input.writingProfile),
    },
  ];

  for (const surface of surfaces) {
    const adoption = buildScoreLevelSupportCleanupCandidateAdoption(input, surface);
    if (adoption === undefined) {
      continue;
    }

    candidates.push(adoption.beforeCandidate, adoption.afterCandidate);
  }

  return candidates;
}

function applyScoreLevelTextureVoiceOrderCandidateAdoptions(input: {
  notes: NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  writingProfile: WritingProfile;
}): ConstraintCandidate[] {
  const beforeNotes = cloneNotes(input.notes);
  const repairedNotes = cloneNotes(input.notes);
  repairTextureVoiceCrossingsForNotes(repairedNotes, input.sectionPlans, input.writingProfile);
  repairedNotes.sort(compareNoteEvents);

  if (noteFingerprint(beforeNotes) === noteFingerprint(repairedNotes)) {
    return [];
  }

  const beforeCandidate = buildScoreLevelConstraintCandidate(
    "score-texture-voice-order-unrepaired-final-repair-evidence",
    beforeNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  const afterCandidate = buildScoreLevelConstraintCandidate(
    "score-texture-voice-order-solver-repaired",
    repairedNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  const beforeDiagnostics = analyzeScore(beforeNotes, input.subjectEntries, input.sectionPlans, input.writingProfile);
  const afterDiagnostics = analyzeScore(repairedNotes, input.subjectEntries, input.sectionPlans, input.writingProfile);
  const beforeHardFailureCount = beforeCandidate.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
  const afterHardFailureCount = afterCandidate.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
  if (
    afterHardFailureCount > beforeHardFailureCount ||
    afterDiagnostics.voiceCrossings >= beforeDiagnostics.voiceCrossings
  ) {
    return [];
  }

  input.notes.splice(0, input.notes.length, ...repairedNotes);
  return [beforeCandidate, afterCandidate];
}

function buildScoreLevelSupportCleanupCandidateAdoption(
  input: {
    notes: readonly NoteEvent[];
    subjectEntries: readonly PlannedEntry[];
    sectionPlans: readonly HarmonicPlan[];
    writingProfile: WritingProfile;
  },
  surface: ScoreLevelSupportCleanupSurface,
):
  | { adoptedNotes: NoteEvent[]; beforeCandidate: ConstraintCandidate; afterCandidate: ConstraintCandidate }
  | undefined {
  const beforeNotes = cloneNotes(input.notes);
  const repairedNotes = cloneNotes(input.notes);
  surface.apply(repairedNotes);
  repairedNotes.sort(compareNoteEvents);

  if (noteFingerprint(beforeNotes) === noteFingerprint(repairedNotes)) {
    return undefined;
  }

  const beforeCandidate = buildScoreLevelConstraintCandidate(
    `score-${surface.id}-unrepaired-final-repair-evidence`,
    beforeNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  const afterCandidate = buildScoreLevelConstraintCandidate(
    `score-${surface.id}-solver-repaired`,
    repairedNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  const beforeReview = evaluateScoreLevelSupportCleanupReview(
    beforeNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
    beforeCandidate,
  );
  const afterReview = evaluateScoreLevelSupportCleanupReview(
    repairedNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
    afterCandidate,
  );

  if (!shouldEmitScoreLevelSupportCleanupEvidence(beforeReview, afterReview)) {
    return undefined;
  }

  return { adoptedNotes: repairedNotes, beforeCandidate, afterCandidate };
}

function evaluateScoreLevelSupportCleanupReview(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
  candidate: ConstraintCandidate,
): ScoreLevelSupportCleanupReview {
  const diagnostics = analyzeScore(notes, subjectEntries, sectionPlans, writingProfile);
  const phraseDevelopmentReview = buildPhraseDevelopmentReviewSummary(
    subjectEntries,
    sectionPlans,
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

  return {
    hardFailureCount: candidate.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0),
    scoreWindowReviewRequiredCount: scoreWindowAcceptance.reviewRequiredWindowCount,
    scoreWindowGeneratorResponseCount: scoreWindowAcceptance.generatorResponseWindowCount,
    scoreWindowAcceptedContextCount: scoreWindowAcceptance.acceptedContextWindowCount,
    harmonicContinuityReviewRequiredCount: diagnostics.harmonicContinuity.reviewRequiredWindowCount,
  };
}

function shouldEmitScoreLevelSupportCleanupEvidence(
  before: ScoreLevelSupportCleanupReview,
  after: ScoreLevelSupportCleanupReview,
): boolean {
  return (
    after.hardFailureCount <= before.hardFailureCount &&
    hasScoreWindowReviewEvidence(before) &&
    hasScoreWindowReviewEvidence(after)
  );
}

function hasScoreWindowReviewEvidence(review: ScoreLevelSupportCleanupReview): boolean {
  return [
    review.scoreWindowReviewRequiredCount,
    review.scoreWindowGeneratorResponseCount,
    review.scoreWindowAcceptedContextCount,
    review.harmonicContinuityReviewRequiredCount,
  ].every((count) => Number.isSafeInteger(count) && count >= 0);
}

function noteFingerprint(notes: readonly NoteEvent[]): string {
  return JSON.stringify(
    [...notes]
      .sort(compareNoteEvents)
      .map((note) => [
        note.kind,
        note.voice,
        note.startTick,
        note.durationTicks,
        note.pitch,
        note.velocity,
        note.role,
        note.metricalHarmonyIntent,
      ]),
  );
}

function applyScoreLevelHarmonicContinuitySolver(input: {
  notes: NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  writingProfile: WritingProfile;
}): ConstraintCandidate[] {
  const before = analyzeHarmonicContinuity(input.notes, input.sectionPlans);
  if (before.focusedWindowCount === 0) {
    return [];
  }

  const repairedNotes = cloneNotes(input.notes);
  addShortEpisodeHarmonicContinuitySupport(repairedNotes, input.sectionPlans, input.writingProfile);
  repairTextureVoiceCrossingsForNotes(repairedNotes, input.sectionPlans);
  repairedNotes.sort(compareNoteEvents);
  const after = analyzeHarmonicContinuity(repairedNotes, input.sectionPlans);
  if (
    after.reviewRequiredWindowCount > before.reviewRequiredWindowCount ||
    harmonicContinuitySupportCost(after) >= harmonicContinuitySupportCost(before)
  ) {
    return [];
  }

  const beforeNotes = cloneNotes(input.notes);
  const beforeCandidate = buildScoreLevelConstraintCandidate(
    "score-harmonic-continuity-unrepaired-final-repair-evidence",
    beforeNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  const afterCandidate = buildScoreLevelConstraintCandidate(
    "score-harmonic-continuity-solver-repaired",
    repairedNotes,
    input.subjectEntries,
    input.sectionPlans,
    input.writingProfile,
  );
  if (afterCandidate.result.hardFailures.length > beforeCandidate.result.hardFailures.length) {
    return [];
  }

  input.notes.splice(0, input.notes.length, ...repairedNotes);
  return [beforeCandidate, afterCandidate];
}

function harmonicContinuitySupportCost(summary: ReturnType<typeof analyzeHarmonicContinuity>): number {
  return summary.windows.reduce(
    (sum, window) =>
      sum +
      (window.classification === "review-required" ? 1000 : 0) +
      Math.max(0, window.structuralBeatCount - window.bassRootSupportCount) * 4 +
      Math.max(0, window.structuralBeatCount - window.chordToneSupportCount) * 8 +
      window.structuralBeatMismatchCount * 6 +
      window.thinStructuralBeatCount * 4,
    0,
  );
}

function applyScoreLevelHarmonicStasisSolver(input: {
  notes: NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  writingProfile: WritingProfile;
}): ConstraintCandidate[] {
  const before = analyzeHarmonicStasisRearticulation(input.notes, input.sectionPlans);
  if (before.generatorResponseWindowCount === 0) {
    return [];
  }

  const repairedNotes = cloneNotes(input.notes);
  repairHarmonicStasisRearticulation(repairedNotes, input.sectionPlans);
  repairedNotes.sort(compareNoteEvents);
  const after = analyzeHarmonicStasisRearticulation(repairedNotes, input.sectionPlans);
  if (after.generatorResponseWindowCount >= before.generatorResponseWindowCount) {
    return [];
  }

  const beforeNotes = cloneNotes(input.notes);
  input.notes.splice(0, input.notes.length, ...repairedNotes);
  return [
    buildScoreLevelConstraintCandidate(
      "score-harmonic-stasis-unrepaired-final-repair-evidence",
      beforeNotes,
      input.subjectEntries,
      input.sectionPlans,
      input.writingProfile,
    ),
    buildScoreLevelConstraintCandidate(
      "score-harmonic-stasis-solver-repaired",
      input.notes,
      input.subjectEntries,
      input.sectionPlans,
      input.writingProfile,
    ),
  ];
}

function buildScoreLevelConstraintCandidate(
  candidateId: string,
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
): ConstraintCandidate {
  const endTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));
  const draft = {
    notes,
    subjectEntries,
    sectionPlans,
    endTick,
    writingProfile,
  };
  return {
    candidateId,
    draft,
    result: evaluateScoreDraft(draft),
  };
}

function reinforceTerminalCodaDerivation(
  notes: NoteEvent[],
  context: TerminalCodaContextSummary | undefined,
  codaStartTick: number,
): void {
  if (context === undefined) {
    return;
  }
  const retagLine = (
    voice: Voice,
    count: number,
    sourceMotive: EpisodeMotiveSource,
    transformationKind: EpisodeTransformationKind,
  ): void => {
    const lineNotes = notes
      .filter((note) => note.voice === voice && note.startTick >= codaStartTick)
      .sort((left, right) => left.startTick - right.startTick)
      .slice(0, count);
    for (const note of lineNotes) {
      note.motivicDerivation = {
        ...(note.motivicDerivation ?? {
          targetFunction: "extend-cadence",
          sequenceDirection: "none",
          preparesNextEntry: false,
          preparesCadence: true,
        }),
        sourceMotive,
        transformationKind,
        targetFunction: "extend-cadence",
        preparesNextEntry: false,
        preparesCadence: true,
      };
    }
  };

  if (context.archetype === "final-fragment-entry") {
    retagLine(context.textureDensity >= 3 ? "alto" : "soprano", 4, "subject-head", "contour-paraphrase");
  } else if (context.archetype === "pedal-entry-cadence") {
    retagLine("soprano", 4, "subject-head", "contour-paraphrase");
    retagLine("alto", 4, "counter-subject-head", "cadential-continuation");
    retagLine("tenor", 3, "cadence-figure", "cadential-continuation");
  } else if (context.archetype === "stretto-compaction") {
    retagLine("alto", 4, "subject-head", "diminution");
    retagLine("soprano", 4, "answer-form", "imitation");
  }
}

function buildTerminalCodaSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  reservation: TerminalCodaReservation,
  meterContext: MeterContext,
  previousNotes: readonly NoteEvent[],
  previousSectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
): Exposition {
  const cadenceKind: CadenceKind = isModalMode(keySignature.mode) ? "modal" : "authentic";
  const context = summarizeTerminalCodaContext({
    subject,
    keySignature,
    reservation,
    meterContext,
    previousNotes,
    previousSectionPlans,
    cadenceKind,
  });
  const sectionPlans = [
    buildHarmonicPlan({
      state: "subject-return",
      startTick: reservation.startTick,
      durationTicks: reservation.durationTicks,
      globalKey: keySignature,
      localKey: keySignature,
      targetKey: keySignature,
      styleProfile: isModalMode(keySignature.mode) ? "hybrid" : "strict-classical",
      cadenceKind,
      ambiguityIntent: "none",
      meterContext,
      terminalIntent: "self-contained-coda",
      terminalCodaContext: context,
    }),
  ];
  const harmonicPlan = sectionPlans[0]!;
  const finalStartTick =
    harmonicPlan.anchors.find((anchor) => anchor.cadenceTarget)?.tick ??
    reservation.startTick + Math.max(0, reservation.durationTicks - meterContext.beatTicks);
  const notes = buildTerminalCodaNotes(
    keySignature,
    reservation.startTick,
    finalStartTick,
    meterContext,
    context,
    writingProfile,
  );
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries: [],
    sectionPlans,
    endTick: reservation.startTick + reservation.durationTicks,
    durationTicks: reservation.durationTicks,
  };
}

function buildTerminalCodaNotes(
  keySignature: KeySignature,
  codaStartTick: number,
  finalStartTick: number,
  meterContext: MeterContext,
  context: TerminalCodaContextSummary,
  writingProfile: WritingProfile,
): NoteEvent[] {
  const finalDegrees: Record<Voice, number> = {
    bass: 0,
    tenor: 4,
    alto: 2,
    soprano: 0,
  };
  const targetPitches: Record<Voice, number> = {
    bass: 48,
    tenor: 55,
    alto: 64,
    soprano: 72,
  };
  const notes: NoteEvent[] = [];
  const beat = meterContext.beatTicks;
  const subjectStem = context.recentSubjectStemDegrees.length > 0 ? context.recentSubjectStemDegrees : [0, 1, 2, 4];
  const modalCharacteristicDegree = characteristicScaleDegree(keySignature.mode);
  const firstBeat = codaStartTick;
  const secondBeat = Math.min(finalStartTick - beat, codaStartTick + beat);
  const thirdBeat = Math.min(finalStartTick - beat, codaStartTick + beat * 2);
  const fourthBeat = Math.min(finalStartTick - beat, codaStartTick + beat * 3);
  const penultimateBeat = Math.max(codaStartTick, finalStartTick - beat);
  const prePenultimateBeat = Math.max(codaStartTick, finalStartTick - beat * 2);

  const addLine = (input: {
    voice: Voice;
    degrees: readonly number[];
    startTick: number;
    durationTicks?: number;
    targetPitch?: number;
    velocity?: number;
    sourceMotive: EpisodeMotiveSource;
    transformationKind: EpisodeTransformationKind;
    targetFunction?: EpisodeTargetFunction;
    sequenceDirection?: NonNullable<NoteEvent["motivicDerivation"]>["sequenceDirection"];
    harmonicIntent?: NonNullable<NoteEvent["metricalHarmonyIntent"]>;
  }): void => {
    let startTick = input.startTick;
    const durationTicks = input.durationTicks ?? beat;
    for (const degree of input.degrees) {
      if (startTick >= finalStartTick) {
        break;
      }
      const noteEndTick = Math.min(finalStartTick, startTick + durationTicks);
      if (noteEndTick > startTick) {
        notes.push(
          terminalCodaNote({
            voice: input.voice,
            keySignature,
            degree,
            targetPitch: input.targetPitch ?? targetPitches[input.voice],
            startTick,
            durationTicks: noteEndTick - startTick,
            velocity: input.velocity ?? (input.voice === "bass" ? 72 : 64),
            harmonicIntent:
              input.harmonicIntent ?? (input.voice === "bass" ? "structural-root-support" : "structural-chord-tone"),
            sourceMotive: input.sourceMotive,
            transformationKind: input.transformationKind,
            targetFunction: input.targetFunction ?? "extend-cadence",
            sequenceDirection: input.sequenceDirection ?? "none",
            writingProfile,
          }),
        );
      }
      startTick += durationTicks;
    }
  };

  const addPreparedLanding = (): void => {
    for (const voice of ["bass", "tenor", "alto", "soprano"] as const) {
      const supportDegree = voice === "bass" ? 4 : finalDegrees[voice] === 0 ? 4 : finalDegrees[voice] - 1;
      if (
        !notes.some(
          (note) =>
            note.voice === voice &&
            note.startTick < finalStartTick &&
            note.startTick + note.durationTicks >= penultimateBeat,
        )
      ) {
        notes.push(
          terminalCodaNote({
            voice,
            keySignature,
            degree: supportDegree,
            targetPitch: targetPitches[voice],
            startTick: penultimateBeat,
            durationTicks: finalStartTick - penultimateBeat,
            velocity: voice === "bass" ? 72 : 64,
            harmonicIntent: voice === "bass" ? "structural-root-support" : "structural-chord-tone",
            sourceMotive: voice === "bass" ? "cadence-figure" : context.recentMaterialSource,
            transformationKind: "cadential-continuation",
            targetFunction: voice === "bass" ? "maintain-pedal-or-suspension" : "extend-cadence",
            sequenceDirection: "none",
            writingProfile,
          }),
        );
      }
    }
  };

  if (context.archetype === "stretto-compaction") {
    addLine({
      voice: "alto",
      degrees: subjectStem.slice(0, 4),
      startTick: firstBeat,
      sourceMotive: "subject-head",
      transformationKind: "diminution",
    });
    addLine({
      voice: "soprano",
      degrees: subjectStem.slice(0, 4).map((degree) => degree + 4),
      startTick: secondBeat,
      sourceMotive: "answer-form",
      transformationKind: "imitation",
    });
    addLine({
      voice: "tenor",
      degrees: subjectStem.slice(0, 3).map((degree) => degree - 1),
      startTick: thirdBeat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "fragmentation",
    });
    addLine({
      voice: "bass",
      degrees: [0, 4, 0, 4, 0],
      startTick: firstBeat,
      durationTicks: beat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
      targetFunction: "maintain-pedal-or-suspension",
    });
  } else if (context.archetype === "pedal-entry-cadence") {
    addLine({
      voice: "bass",
      degrees: [0, 0, 0, 4, 0, 4, 0],
      startTick: firstBeat,
      durationTicks: beat,
      sourceMotive: "cadence-figure",
      transformationKind: "augmentation",
      targetFunction: "maintain-pedal-or-suspension",
    });
    addLine({
      voice: "soprano",
      degrees: subjectStem.slice(0, 4),
      startTick: secondBeat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "contour-paraphrase",
    });
    addLine({
      voice: "alto",
      degrees: modalCharacteristicDegree === undefined ? [2, 1, 2, 4] : [2, modalCharacteristicDegree, 2, 4],
      startTick: thirdBeat,
      sourceMotive: "counter-subject-head",
      transformationKind: "cadential-continuation",
    });
    addLine({
      voice: "tenor",
      degrees: [4, 3, 2],
      startTick: fourthBeat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
    });
  } else if (context.archetype === "liquidation-cadence") {
    addLine({
      voice: "soprano",
      degrees: subjectStem.slice(-3).length > 0 ? subjectStem.slice(-3) : [2, 1, 0],
      startTick: firstBeat,
      sourceMotive: "subject-tail",
      transformationKind: "fragmentation",
    });
    addLine({
      voice: "alto",
      degrees: [4, 2, 1, 2],
      startTick: secondBeat,
      sourceMotive: "counter-subject-tail",
      transformationKind: "rhythmic-paraphrase",
    });
    addLine({
      voice: "tenor",
      degrees: [2, 4, 3, 2],
      startTick: thirdBeat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "sequence",
      sequenceDirection: "descending",
    });
    addLine({
      voice: "bass",
      degrees: [3, 4, 0, 4, 0],
      startTick: firstBeat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
    });
  } else if (context.archetype === "cadential-echo") {
    addLine({
      voice: "soprano",
      degrees: subjectStem.slice(0, 2),
      startTick: secondBeat,
      durationTicks: beat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "imitation",
    });
    addLine({
      voice: "alto",
      degrees: subjectStem.slice(0, 2).map((degree) => degree - 2),
      startTick: fourthBeat,
      durationTicks: beat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "fragmentation",
    });
    addLine({
      voice: "tenor",
      degrees: [4, 2],
      startTick: prePenultimateBeat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
    });
    addLine({
      voice: "bass",
      degrees: [0, 4, 0],
      startTick: firstBeat,
      durationTicks: beat * 2,
      sourceMotive: "cadence-figure",
      transformationKind: "augmentation",
      targetFunction: "maintain-pedal-or-suspension",
    });
  } else {
    const fragmentVoice = context.textureDensity >= 3 ? "alto" : "soprano";
    const cadenceVoice = fragmentVoice === "soprano" ? "alto" : "soprano";
    addLine({
      voice: fragmentVoice,
      degrees: subjectStem.slice(0, 4),
      startTick: firstBeat,
      sourceMotive: "subject-head",
      transformationKind: "contour-paraphrase",
    });
    addLine({
      voice: cadenceVoice,
      degrees: [5, 4, 2, 0],
      startTick: secondBeat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
    });
    addLine({
      voice: "tenor",
      degrees: [4, 3, 2, 4],
      startTick: thirdBeat,
      sourceMotive: context.recentMaterialSource,
      transformationKind: "fragmentation",
    });
    addLine({
      voice: "bass",
      degrees: [0, 3, 4, 0, 4],
      startTick: firstBeat,
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
    });
  }

  addPreparedLanding();
  for (const voice of ["bass", "tenor", "alto", "soprano"] as const) {
    notes.push(
      terminalCodaNote({
        voice,
        keySignature,
        degree: finalDegrees[voice],
        targetPitch: targetPitches[voice],
        startTick: finalStartTick,
        durationTicks: meterContext.beatTicks,
        velocity: voice === "bass" ? 78 : 70,
        harmonicIntent: voice === "bass" ? "structural-root-support" : "structural-chord-tone",
        sourceMotive: "cadence-figure",
        transformationKind: "cadential-continuation",
        targetFunction: "extend-cadence",
        sequenceDirection: "none",
        writingProfile,
      }),
    );
  }

  return notes;
}

function terminalCodaNote(input: {
  voice: Voice;
  keySignature: KeySignature;
  degree: number;
  targetPitch: number;
  startTick: number;
  durationTicks: number;
  velocity: number;
  harmonicIntent: NonNullable<NoteEvent["metricalHarmonyIntent"]>;
  sourceMotive: EpisodeMotiveSource;
  transformationKind: EpisodeTransformationKind;
  targetFunction: EpisodeTargetFunction;
  sequenceDirection: NonNullable<NoteEvent["motivicDerivation"]>["sequenceDirection"];
  writingProfile: WritingProfile;
}): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick,
    durationTicks: input.durationTicks,
    pitch: nearestWritingProfilePitchForPitchClass(
      scaleDegreePitchClass(input.degree, 0, input.keySignature),
      input.targetPitch,
      input.voice,
      input.writingProfile,
    ),
    velocity: input.velocity,
    role: "free-counterpoint",
    metricalHarmonyIntent: input.harmonicIntent,
    motivicDerivation: {
      sourceMotive: input.sourceMotive,
      transformationKind: input.transformationKind,
      targetFunction: input.targetFunction,
      sequenceDirection: input.sequenceDirection,
      preparesNextEntry: false,
      preparesCadence: true,
    },
  };
}

function summarizeTerminalCodaContext(input: {
  subject: readonly SubjectNote[];
  keySignature: KeySignature;
  reservation: TerminalCodaReservation;
  meterContext: MeterContext;
  previousNotes: readonly NoteEvent[];
  previousSectionPlans: readonly HarmonicPlan[];
  cadenceKind: CadenceKind;
}): TerminalCodaContextSummary {
  const codaStartTick = input.reservation.startTick;
  const recentPlans = input.previousSectionPlans.filter((plan) => plan.startTick < codaStartTick).slice(-4);
  const recentStateSequence = recentPlans.map((plan) => plan.state);
  const previousPlan = recentPlans.at(-1);
  const reviewStartTick = Math.max(0, codaStartTick - input.meterContext.measureTicks * 2);
  const recentNotes = input.previousNotes.filter(
    (note) => note.startTick < codaStartTick && note.startTick + note.durationTicks > reviewStartTick,
  );
  const activeVoiceCount = activeVoiceCountAt(
    input.previousNotes,
    Math.max(0, codaStartTick - input.meterContext.beatTicks),
  );
  const textureDensity =
    previousPlan === undefined
      ? activeVoiceCount
      : averageActiveVoiceDensity(input.previousNotes, previousPlan.startTick, previousPlan.durationTicks);
  const contourEnergy = averageContourEnergy(recentNotes);
  const pedalImplied = hasImpliedBassPedal(input.previousNotes, codaStartTick, input.keySignature, input.meterContext);
  const recentMaterialSource = terminalCodaMaterialSource(previousPlan?.state, previousPlan?.cadenceKind);
  const archetype = chooseTerminalCodaArchetype({
    recentStateSequence,
    previousPlan,
    textureDensity,
    contourEnergy,
    activeVoiceCount,
    pedalImplied,
    cadenceKind: input.cadenceKind,
    subjectStemDegreeCount: input.subject.slice(0, 4).length,
  });

  return {
    schemaVersion: 1,
    archetype,
    selectionReason: terminalCodaSelectionReason(archetype, previousPlan?.state, textureDensity, contourEnergy),
    recentMaterialSource,
    recentStateSequence,
    recentSubjectStemDegrees: input.subject.slice(0, 4).map((note) => note.scaleDegree),
    rhythmicCellTicks: input.subject.slice(0, 4).map((note) => note.durationTicks),
    activeVoiceCount,
    textureDensity: roundMetric(textureDensity),
    contourEnergy: roundMetric(contourEnergy),
    localMode: previousPlan?.targetKey.mode ?? input.keySignature.mode,
    cadenceKind: input.cadenceKind,
    availableDurationTicks: input.reservation.durationTicks,
    pedalImplied,
  };
}

function terminalCodaMaterialSource(
  previousState: FugueState | undefined,
  previousCadenceKind: CadenceKind | undefined,
): EpisodeMotiveSource {
  if (previousState === "stretto-like") {
    return "answer-form";
  }
  if (previousState === "subject-return") {
    return "subject-tail";
  }
  if (previousCadenceKind === "authentic" || previousCadenceKind === "modal" || previousCadenceKind === "half") {
    return "cadence-figure";
  }
  return "prior-episode-figure";
}

function chooseTerminalCodaArchetype(input: {
  recentStateSequence: readonly FugueState[];
  previousPlan: HarmonicPlan | undefined;
  textureDensity: number;
  contourEnergy: number;
  activeVoiceCount: number;
  pedalImplied: boolean;
  cadenceKind: CadenceKind;
  subjectStemDegreeCount: number;
}): TerminalCodaArchetype {
  const recentStrettoCount = input.recentStateSequence.filter((state) => state === "stretto-like").length;
  const hasSubjectStem = input.subjectStemDegreeCount >= 3;
  const mediumTexture = input.textureDensity >= 2.35 && input.textureDensity <= 3.35;
  const terminalCadence = input.cadenceKind === "authentic" || input.cadenceKind === "modal";
  const strettoPreferred =
    input.previousPlan?.state === "stretto-like" || recentStrettoCount >= 2 || input.contourEnergy >= 5.25;

  if (strettoPreferred) {
    return "stretto-compaction";
  }
  if (input.pedalImplied || (terminalCadence && mediumTexture && input.previousPlan?.state !== "subject-return")) {
    return "pedal-entry-cadence";
  }
  if (hasSubjectStem && input.previousPlan?.state === "subject-return" && input.textureDensity >= 2.2) {
    return "final-fragment-entry";
  }
  if (input.textureDensity >= 3.25 && input.previousPlan?.state === "subject-return") {
    return "liquidation-cadence";
  }
  if (input.activeVoiceCount <= 2 || input.textureDensity <= 2.1) {
    return "cadential-echo";
  }
  return "final-fragment-entry";
}

function terminalCodaSelectionReason(
  archetype: TerminalCodaArchetype,
  previousState: FugueState | undefined,
  textureDensity: number,
  contourEnergy: number,
): string {
  if (archetype === "pedal-entry-cadence") {
    return "recent bass already implies tonic support, so the coda keeps pedal function while upper voices move";
  }
  if (archetype === "stretto-compaction") {
    return `recent ${previousState ?? "unknown"} material or contour energy ${roundMetric(contourEnergy)} supports overlapped fragments`;
  }
  if (archetype === "liquidation-cadence") {
    return `recent subject-return texture density ${roundMetric(textureDensity)} supports thematic liquidation before the cadence`;
  }
  if (archetype === "cadential-echo") {
    return `recent texture density ${roundMetric(textureDensity)} is sparse, so the coda uses echoing fragment support`;
  }
  return `recent ${previousState ?? "continuation"} context supports a final subject-fragment entry into the cadence`;
}

function activeVoiceCountAt(notes: readonly NoteEvent[], tick: number): number {
  return new Set(
    notes
      .filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks)
      .map((note) => note.voice),
  ).size;
}

function averageContourEnergy(notes: readonly NoteEvent[]): number {
  let intervalTotal = 0;
  let intervalCount = 0;
  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes
      .filter((note) => note.voice === voice)
      .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch);
    for (let index = 1; index < voiceNotes.length; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      intervalTotal += Math.abs(current.pitch - previous.pitch);
      intervalCount += 1;
    }
  }
  return intervalCount === 0 ? 0 : intervalTotal / intervalCount;
}

function hasImpliedBassPedal(
  notes: readonly NoteEvent[],
  codaStartTick: number,
  keySignature: KeySignature,
  meterContext: MeterContext,
): boolean {
  const tonicClass = scaleDegreePitchClass(0, 0, keySignature);
  return notes.some(
    (note) =>
      note.voice === "bass" &&
      positiveModulo(note.pitch, 12) === tonicClass &&
      note.startTick < codaStartTick &&
      note.startTick + note.durationTicks >= codaStartTick - meterContext.beatTicks &&
      note.durationTicks >= meterContext.beatTicks * 2,
  );
}

function roundMetric(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildFugueContinuationScore(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  lengthTicks: number,
  rng: Xoshiro128StarStar,
  input: {
    selectionModel?: SelectionModel;
    meterContext?: MeterContext;
    previousEvents: readonly import("../events.js").ScoreEvent[];
    previousSectionFunctions: readonly { state: FugueState; startTick: number }[];
    previousSubjectEntries?: readonly PlannedEntry[];
    previousSectionPlans?: readonly HarmonicPlan[];
    previousSnapshot?: SegmentSnapshot;
    firstStateHint?: FugueState;
    previousDensityArc?: readonly number[];
    writingProfile?: WritingProfile;
  },
): FugueScore {
  const selectionModel = input.selectionModel ?? "baseline";
  const meterContext = input.meterContext ?? createLegacyMeterContext();
  const writingProfile = input.writingProfile ?? resolveWritingProfile(undefined);
  const counterSubjectSupportRepair = lengthTicks >= TICKS_PER_QUARTER * 288;
  const notes: NoteEvent[] = [];
  const subjectEntries: PlannedEntry[] = [];
  const sectionPlans: HarmonicPlan[] = [];
  const stateTransitions: FugueState[] = [];
  const stateChanges: FugueScore["stateChanges"] = [];
  const selectedCandidateEvaluations: CandidateEvaluation[] = [];
  const selectedConstraintCandidates: ConstraintCandidate[] = [];
  const candidatePoolOracleSections: ReturnType<typeof classifyCandidatePoolOracleSection>[] = [];
  const previousNotes = input.previousEvents.filter((event): event is NoteEvent => event.kind === "note");
  const previousSectionHistory = input.previousSectionFunctions.map((section) => section.state);
  const previousSubjectEntries = input.previousSubjectEntries ?? [];
  const previousSectionPlans = input.previousSectionPlans ?? [];
  let candidateEvaluations = 0;
  let sectionStartTick = 0;
  const continuationPattern = chooseBoundaryContinuationStatePattern(
    input.firstStateHint,
    previousSectionHistory,
    input.previousDensityArc ?? [],
  );
  let stateIndex = 0;
  let phraseUnit: ContinuationPhraseUnit | undefined;
  let phraseSectionIndex = 0;

  while (sectionStartTick < lengthTicks) {
    const stateHistory = [...previousSectionHistory, ...stateTransitions];
    if (
      selectionModel === "section-local-planner" &&
      (phraseUnit === undefined || phraseSectionIndex >= phraseUnit.sections.length)
    ) {
      phraseUnit = chooseContinuationPhraseUnit({
        primaryPattern: continuationPattern,
        stateIndex,
        stateHistory,
        previousSectionPlans: [...previousSectionPlans, ...sectionPlans],
        previousNotes: [...previousNotes, ...notes],
        keySignature,
        preserveSubjectFamily: isModalMode(keySignature.mode) && latestContinuationPatternRepeatCount(stateHistory) < 4,
      });
      phraseSectionIndex = 0;
    }

    const phraseIntent = phraseUnit?.sections[phraseSectionIndex];
    const state = phraseIntent?.state ?? continuationPattern[stateIndex]!;
    const sectionDurationTicks = chooseContinuationSectionTicks(state, rng, meterContext);
    const durationCandidates =
      selectionModel === "section-local-planner"
        ? boundedContinuationDurationCandidates(state, sectionDurationTicks, meterContext)
        : [sectionDurationTicks];
    const selection = chooseContinuationSectionFromDurationCandidates({
      subject,
      keySignature,
      state,
      startTick: sectionStartTick,
      durationCandidates,
      rng,
      previousNotes: [...previousNotes, ...notes],
      selectionModel,
      stateHistory: [...stateHistory, state],
      previousSectionPlans: [...previousSectionPlans, ...sectionPlans],
      previousSubjectEntries: [...previousSubjectEntries, ...subjectEntries],
      phraseIntent,
      counterSubjectSupportRepair,
      meterContext,
      writingProfile,
      maxDurationTicks: lengthTicks - sectionStartTick,
      ordinaryGenerationEndTick: lengthTicks,
    });
    if (selectionModel === "section-local-planner") {
      softenBassEntryBoundaryResets(selection.section.notes, selection.section.subjectEntries, [
        ...previousNotes,
        ...notes,
      ]);
      selection.section.notes.sort(compareNoteEvents);
      selection.evaluation = evaluateCandidate(
        [...previousNotes, ...notes],
        selection.section,
        [...previousSubjectEntries, ...subjectEntries],
        [...previousSectionPlans, ...sectionPlans],
        writingProfile,
      );
    }

    const selectedState = selection.section.sectionPlans[0]?.state ?? state;
    stateTransitions.push(selectedState);
    stateChanges.push({ tick: sectionStartTick, state: selectedState });
    notes.push(...selection.section.notes);
    subjectEntries.push(...selection.section.subjectEntries);
    sectionPlans.push(...selection.section.sectionPlans);
    candidateEvaluations += selection.candidateCount;
    selectedCandidateEvaluations.push(selection.evaluation);
    selectedConstraintCandidates.push(...selection.constraintCandidates);
    candidatePoolOracleSections.push(selection.oracleSection);
    sectionStartTick += selection.section.durationTicks;
    stateIndex = (stateIndex + 1) % continuationPattern.length;
    phraseSectionIndex += 1;
  }

  if (selectionModel === "section-local-planner") {
    selectedConstraintCandidates.push(
      ...applyContinuousBoundaryCarrySolver({
        notes,
        subjectEntries,
        sectionPlans,
        previousSnapshot: input.previousSnapshot,
        writingProfile,
      }),
    );
  }
  if (selectionModel === "section-local-planner") {
    fillAllVoiceSilenceGaps(notes, keySignature, writingProfile);
    selectedConstraintCandidates.push(
      ...applyScoreLevelSupportCleanupCandidateAdoptions({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
  }
  notes.sort(compareNoteEvents);
  if (selectionModel === "section-local-planner") {
    selectedConstraintCandidates.push(
      ...applyScoreLevelHarmonicContinuitySolver({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
    selectedConstraintCandidates.push(
      ...applyScoreLevelHarmonicStasisSolver({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
    selectedConstraintCandidates.push(
      ...applyScoreLevelTextureVoiceOrderCandidateAdoptions({
        notes,
        subjectEntries,
        sectionPlans,
        writingProfile,
      }),
    );
  }
  repairTextureVoiceCrossingsForNotes(notes, sectionPlans, writingProfile);
  restoreEntryPitchClassIdentity(notes, subjectEntries, writingProfile);
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    candidateEvaluations,
    selectedCandidateEvaluations,
    selectedConstraintCandidates,
    candidatePoolOracle: summarizeCandidatePoolOracleSections(candidatePoolOracleSections),
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function chooseBoundaryContinuationStatePattern(
  firstStateHint: FugueState | undefined,
  previousStateHistory: readonly FugueState[],
  previousDensityArc: readonly number[],
): readonly FugueState[] {
  const lastState = previousStateHistory.at(-1);
  const currentDensity = previousDensityArc.at(-1) ?? 0;
  const firstState =
    firstStateHint !== undefined && firstStateHint !== "exposition"
      ? firstStateHint
      : currentDensity >= 4 || lastState === "subject-return"
        ? "episode"
        : lastState === "episode"
          ? "subject-return"
          : "episode";
  const followUp: Record<Exclude<FugueState, "exposition">, readonly FugueState[]> = {
    episode: ["episode", "subject-return", "episode", "stretto-like"],
    "subject-return": ["subject-return", "episode", "stretto-like", "episode"],
    "stretto-like": ["stretto-like", "episode", "subject-return", "episode"],
  };

  return followUp[firstState as Exclude<FugueState, "exposition">];
}

function chooseContinuationPhraseUnit(input: {
  primaryPattern: readonly FugueState[];
  stateIndex: number;
  stateHistory: readonly FugueState[];
  previousSectionPlans: readonly HarmonicPlan[];
  previousNotes: readonly NoteEvent[];
  keySignature: KeySignature;
  preserveSubjectFamily: boolean;
}): ContinuationPhraseUnit {
  const phraseLength = Math.min(4, Math.max(2, input.primaryPattern.length - input.stateIndex));
  const primaryStates = nextPatternStates(input.primaryPattern, input.stateIndex, phraseLength);
  if (input.preserveSubjectFamily) {
    return {
      sections: primaryStates.map((state, index) => ({
        state,
        cadenceKind: phraseCadenceKind(state, index, primaryStates.length, input.keySignature),
        keyOffset: phraseKeyOffset(state, index, 0),
        densityArc: phraseDensityArc(index, primaryStates.length),
      })),
    };
  }

  const candidateStateUnits = phraseStateUnitCandidates(primaryStates);
  const previousPlan = input.previousSectionPlans.at(-1);
  const previousDensity =
    previousPlan === undefined
      ? 0
      : averageActiveVoiceDensity(input.previousNotes, previousPlan.startTick, previousPlan.durationTicks);
  const keyDistance = previousPlan === undefined ? 0 : localKeyDistance(input.keySignature, previousPlan.targetKey);
  let bestStates = candidateStateUnits[0]!;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const states of candidateStateUnits) {
    const score = phraseUnitStateScore({
      states,
      stateHistory: input.stateHistory,
      previousCadenceKind: previousPlan?.cadenceKind,
      previousDensity,
      keyDistance,
    });
    if (score < bestScore) {
      bestStates = states;
      bestScore = score;
    }
  }

  return {
    sections: bestStates.map((state, index) => ({
      state,
      cadenceKind: phraseCadenceKind(state, index, bestStates.length, input.keySignature),
      keyOffset: phraseKeyOffset(state, index, keyDistance),
      densityArc: phraseDensityArc(index, bestStates.length),
    })),
  };
}

function nextPatternStates(
  pattern: readonly FugueState[],
  stateIndex: number,
  phraseLength: number,
): readonly FugueState[] {
  return Array.from({ length: phraseLength }, (_, index) => pattern[(stateIndex + index) % pattern.length]!);
}

function phraseStateUnitCandidates(primaryStates: readonly FugueState[]): readonly (readonly FugueState[])[] {
  const first = primaryStates[0] ?? "episode";
  const second = primaryStates[1] ?? "subject-return";
  const third = primaryStates[2] ?? "episode";
  const fourth = primaryStates[3] ?? "stretto-like";
  const candidates: FugueState[][] = [
    [...primaryStates],
    [first, second === "episode" ? "subject-return" : "episode", third],
    [first, "subject-return", "episode", "stretto-like"],
    [first, "episode", "subject-return"],
    [first, "stretto-like", "subject-return"],
    [first, second, third === first ? "subject-return" : third, fourth === second ? "episode" : fourth],
  ];

  return deduplicateStateUnits(candidates.map((states) => states.slice(0, primaryStates.length)));
}

function deduplicateStateUnits(candidates: readonly (readonly FugueState[])[]): readonly (readonly FugueState[])[] {
  const seen = new Set<string>();
  const unique: FugueState[][] = [];
  for (const candidate of candidates) {
    const key = candidate.join(">");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push([...candidate]);
  }
  return unique;
}

function phraseUnitStateScore(input: {
  states: readonly FugueState[];
  stateHistory: readonly FugueState[];
  previousCadenceKind?: CadenceKind;
  previousDensity: number;
  keyDistance: number;
}): number {
  let score = 0;
  const history = [...input.stateHistory];

  for (const [index, state] of input.states.entries()) {
    score +=
      historyAwareStateScore({
        state,
        stateHistory: history,
        previousCadenceKind:
          index === 0 ? input.previousCadenceKind : phraseCadenceKind(state, index, input.states.length),
        previousDensity: index === 0 ? input.previousDensity : input.states[index - 1] === "stretto-like" ? 3.5 : 2.5,
        keyDistance: index === 0 ? input.keyDistance : phraseKeyOffset(state, index, input.keyDistance),
      }) *
      (index + 1);
    history.push(state);
  }

  if (createsShortAlternatingPhrase(history)) {
    score += 2500;
  }
  if (input.states.length >= 3 && new Set(input.states).size === 1) {
    score += 1000;
  }
  if (!input.states.some((state) => state === "subject-return")) {
    score += 6;
  }
  if (!input.states.some((state) => state === "episode")) {
    score += 4;
  }

  return score;
}

function phraseCadenceKind(
  state: FugueState,
  index: number,
  phraseLength: number,
  keySignature?: KeySignature,
): CadenceKind {
  if (keySignature !== undefined && isModalMode(keySignature.mode)) {
    return "modal";
  }
  if (index === phraseLength - 1) {
    return state === "stretto-like" ? "evaded" : "authentic";
  }
  if (state === "episode") {
    return index === 0 ? "modulatory" : "half";
  }
  return state === "stretto-like" ? "evaded" : "deceptive";
}

function phraseKeyOffset(state: FugueState, index: number, previousKeyDistance: number): number {
  if (state === "subject-return") {
    return previousKeyDistance >= 5 ? 0 : 7;
  }
  if (state === "stretto-like") {
    return 7;
  }
  return [5, 2, 9, 0][index % 4]!;
}

function phraseDensityArc(index: number, phraseLength: number): PhraseDensityArc {
  if (phraseLength <= 2) {
    return index === 0 ? "balanced" : "full";
  }
  if (index === phraseLength - 1) {
    return "full";
  }
  if (index === 1) {
    return "thin";
  }
  return "balanced";
}

export function chooseContinuationStatePattern(rng: Xoshiro128StarStar): readonly FugueState[] {
  return CONTINUATION_STATE_PATTERNS[rng.nextInt(CONTINUATION_STATE_PATTERNS.length)]!;
}

function continuationPatternForCycle(
  primaryPattern: readonly FugueState[],
  primaryPatternIndex: number,
  cycleIndex: number,
  preservePrimaryPattern: boolean,
): readonly FugueState[] {
  if (preservePrimaryPattern || cycleIndex === 0 || cycleIndex % 7 !== 0) {
    return primaryPattern;
  }

  return CONTINUATION_STATE_PATTERNS[
    (primaryPatternIndex + Math.floor(cycleIndex / 7)) % CONTINUATION_STATE_PATTERNS.length
  ]!;
}

type HistoryAwareSelectionContext = {
  enabled: boolean;
  previousStateHistory: readonly FugueState[];
  plannedState: FugueState;
  previousCadenceKind?: CadenceKind;
  previousDensity: number;
  keyDistance: number;
};

type ContinuationCandidateSelectionBand =
  | "baseline"
  | "section-local"
  | "section-grammar"
  | "phrase-family"
  | "section-csp"
  | "harmonic-stasis";

type ContinuationCandidateSelectionWindow = {
  baselineCandidateCount: number;
  selectableCandidateCount: number;
  sectionGrammarCandidateStart: number;
  phraseFamilyCandidateStart: number;
  harmonicStasisCandidateStart: number;
};

function buildHistoryAwareSelectionContext(
  stateHistory: readonly FugueState[],
  previousSectionPlans: readonly HarmonicPlan[],
  previousNotes: readonly NoteEvent[],
  keySignature: KeySignature,
): HistoryAwareSelectionContext {
  const plannedState = stateHistory.at(-1) ?? "episode";
  const previousStateHistory = stateHistory.slice(0, -1);
  const previousPlan = previousSectionPlans.at(-1);
  const previousDensity =
    previousPlan === undefined
      ? 0
      : averageActiveVoiceDensity(previousNotes, previousPlan.startTick, previousPlan.durationTicks);

  return {
    enabled: latestContinuationPatternRepeatCount(stateHistory) > 1,
    previousStateHistory,
    plannedState,
    previousCadenceKind: previousPlan?.cadenceKind,
    previousDensity,
    keyDistance: previousPlan === undefined ? 0 : localKeyDistance(keySignature, previousPlan.targetKey),
  };
}

function historyAwareStateScore(input: {
  state: FugueState;
  stateHistory: readonly FugueState[];
  previousCadenceKind?: CadenceKind;
  previousDensity: number;
  keyDistance: number;
}): number {
  const history = [...input.stateHistory, input.state];
  const previousState = input.stateHistory.at(-1);
  let score = latestContinuationPatternRepeatCount(history) * 20;

  if (input.state === previousState) {
    score += 8;
  }
  if (input.state === input.stateHistory.at(-2)) {
    score += 100;
  }
  if (createsShortAlternatingPhrase(history)) {
    score += 1000;
  }

  if (
    input.previousCadenceKind === "authentic" ||
    input.previousCadenceKind === "modal" ||
    input.previousCadenceKind === "deceptive"
  ) {
    score += input.state === "episode" ? -2 : 0;
  } else if (input.previousCadenceKind === "half" || input.previousCadenceKind === "evaded") {
    score += input.state === "subject-return" ? -2 : 0;
  } else if (input.previousCadenceKind === "modulatory") {
    score += input.state === "stretto-like" ? 1 : 0;
  }

  if (input.previousDensity >= 3.2) {
    score += input.state === "episode" ? -1.5 : 0;
    score += input.state === "stretto-like" ? 2 : 0;
  } else if (input.previousDensity > 0 && input.previousDensity <= 2.25) {
    score += input.state === "subject-return" ? -1.5 : 0;
    score += input.state === "episode" ? 1 : 0;
  }

  if (input.keyDistance >= 5) {
    score += input.state === "subject-return" ? -1.5 : 0;
    score += input.state === "stretto-like" ? 1 : 0;
  } else if (input.keyDistance <= 2) {
    score += input.state === "episode" ? -0.5 : 0;
  }

  return score + continuationStateTieBreak(input.state);
}

function latestContinuationPatternRepeatCount(stateHistory: readonly FugueState[]): number {
  const continuationStates = stateHistory.filter((state) => state !== "exposition");
  const windowSize = 4;
  if (continuationStates.length < windowSize * 2) {
    return continuationStates.length >= windowSize ? 1 : 0;
  }

  const latestPattern = continuationStates.slice(-windowSize).join(">");
  let count = 0;
  for (let index = 0; index + windowSize <= continuationStates.length; index += 1) {
    if (continuationStates.slice(index, index + windowSize).join(">") === latestPattern) {
      count += 1;
    }
  }

  return count;
}

function createsShortAlternatingPhrase(stateHistory: readonly FugueState[]): boolean {
  const continuationStates = stateHistory.filter((state) => state !== "exposition");
  if (continuationStates.length < 4) {
    return false;
  }

  const [first, second, third, fourth] = continuationStates.slice(-4);
  return first === third && second === fourth && first !== second;
}

function averageActiveVoiceDensity(notes: readonly NoteEvent[], startTick: number, durationTicks: number): number {
  if (durationTicks <= 0) {
    return 0;
  }

  const activeVoiceTicks = notes.reduce((sum, note) => {
    const noteEndTick = note.startTick + note.durationTicks;
    const overlapTicks = Math.min(noteEndTick, startTick + durationTicks) - Math.max(note.startTick, startTick);
    return sum + Math.max(0, overlapTicks);
  }, 0);

  return activeVoiceTicks / durationTicks;
}

function localKeyDistance(globalKey: KeySignature, localKey: KeySignature): number {
  const rawDistance = Math.abs(tonicPitchClass(globalKey) - tonicPitchClass(localKey));
  return Math.min(rawDistance, 12 - rawDistance);
}

function continuationStateTieBreak(state: FugueState): number {
  if (state === "episode") {
    return 0;
  }
  if (state === "subject-return") {
    return 0.1;
  }
  return 0.2;
}

export function chooseContinuationSectionTicks(
  state: FugueState,
  rng: Xoshiro128StarStar,
  meterContext: MeterContext = createLegacyMeterContext(),
): number {
  if (meterContext.timeSignature.numerator !== 4) {
    const measureCount = rng.chooseWeighted([
      { value: state === "episode" ? 2 : 3, weight: 2 },
      { value: 3, weight: 3 },
      { value: 4, weight: 2 },
    ]);
    return meterContext.measureTicks * measureCount;
  }

  if (state === "episode") {
    return (
      TICKS_PER_QUARTER *
      rng.chooseWeighted([
        { value: 6, weight: 2 },
        { value: 8, weight: 3 },
        { value: 10, weight: 2 },
      ])
    );
  }
  if (state === "subject-return") {
    return (
      TICKS_PER_QUARTER *
      rng.chooseWeighted([
        { value: 7, weight: 2 },
        { value: 8, weight: 3 },
        { value: 9, weight: 2 },
      ])
    );
  }
  return (
    TICKS_PER_QUARTER *
    rng.chooseWeighted([
      { value: 8, weight: 3 },
      { value: 10, weight: 1 },
    ])
  );
}

export function continuationSectionDurationCandidates(
  state: FugueState,
  meterContext: MeterContext = createLegacyMeterContext(),
): number[] {
  if (meterContext.timeSignature.numerator !== 4) {
    const preferredMeasureCounts = state === "episode" ? [2, 3, 4] : [3, 4, 2];
    return preferredMeasureCounts.map((measureCount) => meterContext.measureTicks * measureCount);
  }

  const quarterCounts =
    state === "episode" ? [8, 12, 6, 10] : state === "subject-return" ? [8, 12, 7, 9] : [8, 12, 6, 7, 9, 10];
  return quarterCounts.map((quarterCount) => quarterCount * TICKS_PER_QUARTER);
}

function boundedContinuationDurationCandidates(
  state: FugueState,
  legacyDurationTicks: number,
  meterContext: MeterContext,
): number[] {
  const candidates = continuationSectionDurationCandidates(state, meterContext);
  const preferred = candidates.slice(0, 2);
  const relaxed =
    candidates.find((durationTicks) => durationTicks % meterContext.measureTicks !== 0) ?? legacyDurationTicks;
  return [...new Set([...preferred, relaxed, legacyDurationTicks])].slice(0, 3);
}

export function chooseStyleProfile(rng: Xoshiro128StarStar): StyleProfile {
  return rng.chooseWeighted<StyleProfile>([
    { value: "strict-classical", weight: 3 },
    { value: "hybrid", weight: 5 },
    { value: "popular-tolerant", weight: 2 },
  ]);
}

export function chooseSequencePattern(rng: Xoshiro128StarStar): SequencePattern {
  return rng.chooseWeighted<SequencePattern>([
    { value: "ascending-step", weight: 3 },
    { value: "descending-step", weight: 3 },
    { value: "circle-fifths", weight: 2 },
    { value: "parallel-shift", weight: 1 },
  ]);
}

export function chooseFragmentTransform(rng: Xoshiro128StarStar): FragmentTransform {
  return rng.chooseWeighted<FragmentTransform>([
    { value: "sequence", weight: 4 },
    { value: "contrary-motion", weight: 3 },
    { value: "inversion", weight: 2 },
  ]);
}

function chooseEpisodeSequencePattern(
  rng: Xoshiro128StarStar,
  selectionModel: SelectionModel,
  voice: Voice,
  pitchClassOffset: number,
  startTick: number,
  phraseIntent: ContinuationPhraseSectionIntent | undefined,
): SequencePattern {
  if (selectionModel !== "section-local-planner") {
    return chooseSequencePattern(rng);
  }

  const patterns: readonly SequencePattern[] =
    phraseIntent?.cadenceKind === "modal"
      ? ["descending-step", "parallel-shift", "circle-fifths", "ascending-step"]
      : ["ascending-step", "circle-fifths", "descending-step", "parallel-shift"];
  const rotation =
    VOICE_ENTRY_ORDER.indexOf(voice) + Math.floor(startTick / TICKS_PER_QUARTER / 4) + Math.floor(pitchClassOffset / 2);
  return patterns[rotation % patterns.length]!;
}

function chooseEpisodeFragmentTransform(
  rng: Xoshiro128StarStar,
  selectionModel: SelectionModel,
  voice: Voice,
  pitchClassOffset: number,
  startTick: number,
  phraseIntent: ContinuationPhraseSectionIntent | undefined,
): FragmentTransform {
  if (selectionModel !== "section-local-planner") {
    return chooseFragmentTransform(rng);
  }

  const transforms: readonly FragmentTransform[] =
    phraseIntent?.cadenceKind === "modal"
      ? ["contrary-motion", "sequence", "inversion"]
      : ["sequence", "inversion", "contrary-motion"];
  const rotation =
    VOICE_ENTRY_ORDER.indexOf(voice) +
    Math.floor(startTick / TICKS_PER_QUARTER / 8) +
    (pitchClassOffset === 0 ? 1 : pitchClassOffset);
  return transforms[rotation % transforms.length]!;
}

export function buildExposition(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  counterSubjectSupportRepair = false,
  meterContext: MeterContext = createLegacyMeterContext(),
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const entrySpacingTicks = profileAwareExpositionEntrySpacingTicks(
    subject,
    keySignature,
    meterContext,
    writingProfile,
  );
  const sectionPlans: HarmonicPlan[] = [
    buildHarmonicPlan({
      state: "exposition",
      startTick: 0,
      durationTicks: entrySpacingTicks * VOICE_ENTRY_ORDER.length,
      globalKey: keySignature,
      localKey: keySignature,
      targetKey: transposeKey(keySignature, 7),
      styleProfile: "strict-classical",
      cadenceKind: "half",
      ambiguityIntent: "none",
      meterContext,
    }),
  ];

  for (const [entryIndex, voice] of VOICE_ENTRY_ORDER.entries()) {
    const form = entryIndex % 2 === 0 ? "subject" : "answer";
    const startTick = entryIndex * entrySpacingTicks;
    const harmonicPlan = sectionPlans[0]!;
    addSubjectEntry(notes, subjectEntries, subject, {
      state: "exposition",
      voice,
      form,
      startTick,
      globalKey: keySignature,
      localKey: form === "answer" ? transposeKey(keySignature, 7) : keySignature,
      answerKind: form === "answer" ? chooseAnswerKind(subject) : undefined,
      harmonicPlan,
      writingProfile,
    });
    addCounterpointTexture(notes, subject, {
      enteringVoice: voice,
      startTick,
      durationTicks: entrySpacingTicks,
      localKey: form === "answer" ? transposeKey(keySignature, 7) : keySignature,
      eligibleVoices: VOICE_ENTRY_ORDER.slice(0, entryIndex),
      harmonicPlan,
      counterSubjectSupportRepair,
      writingProfile,
    });
  }

  softenFirstBassEntryBoundaryReset(notes, subjectEntries);
  repairTextureVoiceCrossingsForNotes(notes, sectionPlans, writingProfile);
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: entrySpacingTicks * VOICE_ENTRY_ORDER.length,
  };
}

function expositionEntrySpacingTicks(meterContext: MeterContext): number {
  if (meterContext.timeSignature.numerator === 4) {
    return ENTRY_SPACING_TICKS;
  }
  return meterContext.measureTicks;
}

function profileAwareExpositionEntrySpacingTicks(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): number {
  const baseSpacingTicks = expositionEntrySpacingTicks(meterContext);
  const degrees = subject.map((note) => note.scaleDegree);
  const durations = subject.map((note) => note.durationTicks);
  if (isSubjectEntryPlanFeasibleForProfile(degrees, durations, keySignature, writingProfile, baseSpacingTicks)) {
    return baseSpacingTicks;
  }
  return Math.max(baseSpacingTicks, subjectDuration(subject) + Math.floor(meterContext.beatTicks / 2));
}

export function chooseContinuationSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  rng: Xoshiro128StarStar,
  previousNotes: readonly NoteEvent[],
  selectionModel: SelectionModel = "baseline",
  stateHistory: readonly FugueState[] = [state],
  previousSectionPlans: readonly HarmonicPlan[] = [],
  previousSubjectEntries: readonly PlannedEntry[] = [],
  phraseIntent?: ContinuationPhraseSectionIntent,
  counterSubjectSupportRepair = false,
  meterContext: MeterContext = createLegacyMeterContext(),
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
  terminalSupportCandidate = false,
): ContinuationSectionSelection {
  const candidates = buildContinuationCandidates(
    subject,
    keySignature,
    state,
    startTick,
    sectionDurationTicks,
    rng,
    selectionModel,
    phraseIntent,
    counterSubjectSupportRepair,
    meterContext,
    writingProfile,
  );
  const evaluations = candidates.map((candidate) =>
    evaluateCandidate(previousNotes, candidate, previousSubjectEntries, previousSectionPlans, writingProfile),
  );
  const selectionWindow = continuationCandidateSelectionWindow(state, selectionModel, candidates.length);
  const constraintCandidates = candidates.map((candidate, index) =>
    buildContinuationConstraintCandidate(
      continuationConstraintCandidateId({
        startTick,
        state: candidate.sectionPlans[0]?.state ?? state,
        candidateBand: continuationCandidateSelectionBand(index, selectionWindow, selectionModel, candidate),
        candidateIndex: index,
        durationTicks: candidate.durationTicks,
      }),
      candidate,
      writingProfile,
      terminalSupportCandidate,
    ),
  );
  let bestIndex = bestContinuationCandidateIndex(
    evaluations.slice(0, selectionWindow.baselineCandidateCount),
    selectionModel === "section-local-planner" ? "candidate-oracle-selection" : selectionModel,
  );
  const baselineEvaluation = evaluations[bestIndex]!;
  const historyContext = buildHistoryAwareSelectionContext(
    stateHistory,
    previousSectionPlans,
    previousNotes,
    keySignature,
  );

  for (const [index, evaluation] of evaluations.entries()) {
    const candidateBand = continuationCandidateSelectionBand(index, selectionWindow, selectionModel, candidates[index]);
    if (!candidateBandCanBeSelected(candidateBand, index, selectionWindow, selectionModel)) {
      continue;
    }
    if (
      candidateBand !== "baseline" &&
      !preservesSectionLocalGuardrails(
        evaluation,
        baselineEvaluation,
        candidateBand === "section-grammar" || candidateBand === "phrase-family" || candidateBand === "section-csp",
      )
    ) {
      continue;
    }

    const candidateScore =
      candidateSelectionScore(evaluation, selectionModel) +
      (selectionModel === "section-local-planner"
        ? sectionGrammarPlannerSelectionRiskAdjustment(
            evaluation,
            historyContext,
            candidateBand === "section-grammar",
          ) +
          phraseDevelopmentSelectionRiskAdjustment(
            candidates[index]!,
            previousSubjectEntries,
            previousSectionPlans,
            historyContext,
          )
        : 0);
    const bestScore =
      selectionModel === "section-local-planner" && bestIndex < selectionWindow.baselineCandidateCount
        ? candidateSelectionScore(evaluations[bestIndex]!, "candidate-oracle-selection") +
          sectionGrammarPlannerSelectionRiskAdjustment(evaluations[bestIndex]!, historyContext, false) +
          phraseDevelopmentSelectionRiskAdjustment(
            candidates[bestIndex]!,
            previousSubjectEntries,
            previousSectionPlans,
            historyContext,
          )
        : candidateSelectionScore(evaluations[bestIndex]!, selectionModel) +
          (selectionModel === "section-local-planner"
            ? sectionGrammarPlannerSelectionRiskAdjustment(
                evaluations[bestIndex]!,
                historyContext,
                continuationCandidateSelectionBand(
                  bestIndex,
                  selectionWindow,
                  selectionModel,
                  candidates[bestIndex],
                ) === "section-grammar",
              ) +
              phraseDevelopmentSelectionRiskAdjustment(
                candidates[bestIndex]!,
                previousSubjectEntries,
                previousSectionPlans,
                historyContext,
              )
            : 0);
    if (candidateScore < bestScore) {
      bestIndex = index;
    }
  }

  bestIndex = avoidShortAlternatingPhraseSelection({
    candidates,
    evaluations,
    bestIndex,
    selectionWindow,
    baselineEvaluation,
    historyContext,
    selectionModel,
  });
  bestIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: bestIndex,
    candidateIndexes: selectableContinuationCandidateIndexes({
      candidates,
      evaluations,
      selectionWindow,
      selectionModel,
      baselineEvaluation,
    }),
    constraintCandidates,
    candidateScores: continuationCandidateBacktrackingScores({
      candidates,
      evaluations,
      selectionWindow,
      selectionModel,
      historyContext,
      previousSubjectEntries,
      previousSectionPlans,
    }),
  });

  const selectedCandidate = candidates[bestIndex]!;
  const selectedState = selectedCandidate.sectionPlans[0]?.state ?? state;
  const constraintCandidate = constraintCandidates[bestIndex]!;
  return {
    section: selectedCandidate,
    candidateCount: candidates.length,
    evaluation: evaluations[bestIndex]!,
    constraintCandidate,
    constraintCandidates: [
      ...harmonicStasisSourceConstraintCandidates({
        candidates,
        selectedCandidate,
        selectionWindow,
        selectionModel,
        writingProfile,
        terminalSupportCandidate,
      }),
      ...constraintCandidates,
    ],
    oracleSection: classifyCandidatePoolOracleSection({
      state: selectedState,
      startTick,
      durationTicks: sectionDurationTicks,
      evaluations,
      selectedCandidateIndex: bestIndex,
      candidateDiversityDescriptors: candidates.map(describeCandidateDiversity),
      phraseFamilyCandidateCount:
        selectionModel === "section-local-planner"
          ? selectionWindow.harmonicStasisCandidateStart - selectionWindow.phraseFamilyCandidateStart
          : 0,
      stateHistory: [...stateHistory.slice(0, -1), selectedState],
    }),
  };
}

function chooseContinuationSectionFromDurationCandidates(input: {
  subject: readonly SubjectNote[];
  keySignature: KeySignature;
  state: FugueState;
  startTick: number;
  durationCandidates: readonly number[];
  rng: Xoshiro128StarStar;
  previousNotes: readonly NoteEvent[];
  selectionModel: SelectionModel;
  stateHistory: readonly FugueState[];
  previousSectionPlans: readonly HarmonicPlan[];
  previousSubjectEntries: readonly PlannedEntry[];
  phraseIntent?: ContinuationPhraseSectionIntent;
  counterSubjectSupportRepair: boolean;
  meterContext: MeterContext;
  writingProfile: WritingProfile;
  maxDurationTicks?: number;
  ordinaryGenerationEndTick: number;
}): ContinuationSectionSelection {
  const forkState = input.rng.snapshot();
  const durationCandidates = input.durationCandidates.filter(
    (durationTicks) => input.maxDurationTicks === undefined || durationTicks <= input.maxDurationTicks,
  );
  const viableDurationCandidates =
    durationCandidates.length > 0 ? durationCandidates : input.durationCandidates.slice(0, 1);
  const firstDurationTicks = viableDurationCandidates[0];
  if (firstDurationTicks === undefined) {
    throw new Error(
      "core.continuation-duration.empty-candidate-set: no continuation duration candidates were available; why=section generation requires at least one duration; action=provide a positive duration candidate",
    );
  }

  const firstSelection = chooseContinuationSectionForDuration(input, firstDurationTicks, forkState);
  if (sectionMetricalBoundaryCost(firstSelection.constraintCandidate) === 0) {
    return firstSelection;
  }

  const selections = [
    firstSelection,
    ...viableDurationCandidates
      .slice(1)
      .map((durationTicks) => chooseContinuationSectionForDuration(input, durationTicks, forkState)),
  ];
  const selected = [...selections].sort((left, right) =>
    compareDurationCandidateSelections(left, right, input.selectionModel),
  )[0];

  if (selected === undefined) {
    throw new Error(
      "core.continuation-duration.empty-candidate-set: no continuation duration candidates were available; why=section generation requires at least one duration; action=provide a positive duration candidate",
    );
  }

  return {
    ...selected,
    candidateCount: selections.reduce((sum, selection) => sum + selection.candidateCount, 0),
    constraintCandidates: selections.flatMap((selection) => selection.constraintCandidates),
  };
}

function chooseContinuationSectionForDuration(
  input: {
    subject: readonly SubjectNote[];
    keySignature: KeySignature;
    state: FugueState;
    startTick: number;
    rng: Xoshiro128StarStar;
    previousNotes: readonly NoteEvent[];
    selectionModel: SelectionModel;
    stateHistory: readonly FugueState[];
    previousSectionPlans: readonly HarmonicPlan[];
    previousSubjectEntries: readonly PlannedEntry[];
    phraseIntent?: ContinuationPhraseSectionIntent;
    counterSubjectSupportRepair: boolean;
    meterContext: MeterContext;
    writingProfile: WritingProfile;
    ordinaryGenerationEndTick: number;
  },
  durationTicks: number,
  forkState: readonly [number, number, number, number],
): ContinuationSectionSelection {
  return chooseContinuationSection(
    input.subject,
    input.keySignature,
    input.state,
    input.startTick,
    durationTicks,
    new Xoshiro128StarStar(forkState),
    input.previousNotes,
    input.selectionModel,
    input.stateHistory,
    input.previousSectionPlans,
    input.previousSubjectEntries,
    input.phraseIntent,
    input.counterSubjectSupportRepair,
    input.meterContext,
    input.writingProfile,
    input.startTick + durationTicks >= input.ordinaryGenerationEndTick,
  );
}

function compareDurationCandidateSelections(
  left: ContinuationSectionSelection,
  right: ContinuationSectionSelection,
  selectionModel: SelectionModel,
): number {
  const leftHardFailureCount = constraintCandidateHardFailureCount(left.constraintCandidate);
  const rightHardFailureCount = constraintCandidateHardFailureCount(right.constraintCandidate);
  if (leftHardFailureCount !== rightHardFailureCount) {
    return leftHardFailureCount - rightHardFailureCount;
  }

  const leftHarmonicQualityCost = sectionHarmonicQualityCost(left.constraintCandidate);
  const rightHarmonicQualityCost = sectionHarmonicQualityCost(right.constraintCandidate);
  if (leftHarmonicQualityCost !== rightHarmonicQualityCost) {
    return leftHarmonicQualityCost - rightHarmonicQualityCost;
  }

  const leftMetricalCost = sectionMetricalBoundaryCost(left.constraintCandidate);
  const rightMetricalCost = sectionMetricalBoundaryCost(right.constraintCandidate);
  if (leftMetricalCost !== rightMetricalCost) {
    return leftMetricalCost - rightMetricalCost;
  }

  if (left.constraintCandidate.result.totalSoftCost !== right.constraintCandidate.result.totalSoftCost) {
    return left.constraintCandidate.result.totalSoftCost - right.constraintCandidate.result.totalSoftCost;
  }

  const leftScore = candidateSelectionScore(left.evaluation, selectionModel);
  const rightScore = candidateSelectionScore(right.evaluation, selectionModel);
  if (leftScore !== rightScore) {
    return leftScore - rightScore;
  }

  return left.constraintCandidate.candidateId.localeCompare(right.constraintCandidate.candidateId);
}

function sectionMetricalBoundaryCost(candidate: ConstraintCandidate): number {
  return candidate.result.window.sectionConstraintReview?.metricalBoundaryCost ?? 0;
}

function sectionHarmonicQualityCost(candidate: ConstraintCandidate): number {
  return candidate.result.softCosts.find((cost) => cost.feature === "section-csp-harmonic-quality")?.cost ?? 0;
}

function selectableContinuationCandidateIndexes(input: {
  candidates: readonly Exposition[];
  evaluations: readonly CandidateEvaluation[];
  selectionWindow: ContinuationCandidateSelectionWindow;
  selectionModel: SelectionModel;
  baselineEvaluation: CandidateEvaluation;
}): number[] {
  const indexes: number[] = [];

  for (const [index, evaluation] of input.evaluations.entries()) {
    const candidateBand = continuationCandidateSelectionBand(
      index,
      input.selectionWindow,
      input.selectionModel,
      input.candidates[index],
    );
    if (!candidateBandCanBeFallback(candidateBand, index, input.selectionWindow, input.selectionModel)) {
      continue;
    }
    if (
      candidateBand !== "baseline" &&
      !preservesSectionLocalGuardrails(
        evaluation,
        input.baselineEvaluation,
        candidateBand === "section-grammar" || candidateBand === "phrase-family" || candidateBand === "section-csp",
      )
    ) {
      continue;
    }
    indexes.push(index);
  }

  return indexes.length === 0 ? input.evaluations.map((_, index) => index) : indexes;
}

function continuationCandidateBacktrackingScores(input: {
  candidates: readonly Exposition[];
  evaluations: readonly CandidateEvaluation[];
  selectionWindow: ContinuationCandidateSelectionWindow;
  selectionModel: SelectionModel;
  historyContext: HistoryAwareSelectionContext;
  previousSubjectEntries: readonly PlannedEntry[];
  previousSectionPlans: readonly HarmonicPlan[];
}): number[] {
  return input.evaluations.map((evaluation, index) => {
    const candidateBand = continuationCandidateSelectionBand(
      index,
      input.selectionWindow,
      input.selectionModel,
      input.candidates[index],
    );
    const selectionModel =
      input.selectionModel === "section-local-planner" && candidateBand === "baseline"
        ? "candidate-oracle-selection"
        : input.selectionModel;

    return (
      candidateSelectionScore(evaluation, selectionModel) +
      (input.selectionModel === "section-local-planner"
        ? sectionGrammarPlannerSelectionRiskAdjustment(
            evaluation,
            input.historyContext,
            candidateBand === "section-grammar",
          ) +
          phraseDevelopmentSelectionRiskAdjustment(
            input.candidates[index]!,
            input.previousSubjectEntries,
            input.previousSectionPlans,
            input.historyContext,
          )
        : 0)
    );
  });
}

export function chooseSectionCspBacktrackingCandidateIndex(input: {
  currentBestIndex: number;
  candidateIndexes: readonly number[];
  constraintCandidates: readonly ConstraintCandidate[];
  candidateScores?: readonly number[];
}): number {
  const candidateIndexes =
    input.candidateIndexes.length > 0 ? input.candidateIndexes : input.constraintCandidates.map((_, index) => index);
  const feasibleIndexes = candidateIndexes.filter((index) => {
    const candidate = input.constraintCandidates[index];
    return candidate !== undefined && candidate.result.hardFailures.length === 0;
  });

  if (feasibleIndexes.length > 0) {
    return [...feasibleIndexes].sort((left, right) => {
      const leftSoftCost = input.constraintCandidates[left]!.result.totalSoftCost;
      const rightSoftCost = input.constraintCandidates[right]!.result.totalSoftCost;
      if (leftSoftCost !== rightSoftCost) {
        return leftSoftCost - rightSoftCost;
      }
      const leftScore = input.candidateScores?.[left] ?? 0;
      const rightScore = input.candidateScores?.[right] ?? 0;
      if (leftScore !== rightScore) {
        return leftScore - rightScore;
      }
      return input.constraintCandidates[left]!.candidateId.localeCompare(
        input.constraintCandidates[right]!.candidateId,
      );
    })[0]!;
  }

  return [...candidateIndexes].sort((left, right) => {
    const leftCandidate = input.constraintCandidates[left]!;
    const rightCandidate = input.constraintCandidates[right]!;
    const leftHardFailureCount = constraintCandidateHardFailureCount(leftCandidate);
    const rightHardFailureCount = constraintCandidateHardFailureCount(rightCandidate);
    if (leftHardFailureCount !== rightHardFailureCount) {
      return leftHardFailureCount - rightHardFailureCount;
    }
    if (leftCandidate.result.totalSoftCost !== rightCandidate.result.totalSoftCost) {
      return leftCandidate.result.totalSoftCost - rightCandidate.result.totalSoftCost;
    }
    const leftScore = input.candidateScores?.[left] ?? 0;
    const rightScore = input.candidateScores?.[right] ?? 0;
    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }
    return leftCandidate.candidateId.localeCompare(rightCandidate.candidateId);
  })[0]!;
}

function constraintCandidateHardFailureCount(candidate: ConstraintCandidate): number {
  return candidate.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
}

function buildContinuationConstraintCandidate(
  candidateId: string,
  section: Exposition,
  writingProfile: WritingProfile,
  terminalSupportCandidate: boolean,
): ConstraintCandidate {
  const sectionStartTick = section.sectionPlans[0]?.startTick ?? 0;
  const sectionEndTick = sectionStartTick + section.durationTicks;
  const draft = {
    notes: section.notes,
    subjectEntries: section.subjectEntries,
    sectionPlans: section.sectionPlans,
    endTick: Math.max(section.endTick, sectionEndTick),
    writingProfile,
  };
  return {
    candidateId,
    draft,
    result: evaluateScoreDraft(draft, {
      startTick: sectionStartTick,
      endTick: sectionEndTick,
      state: section.sectionPlans[0]?.state ?? "unplanned",
      harmonicPlan: section.sectionPlans[0],
      meterContext: section.sectionPlans[0]?.meterContext,
      entry: section.subjectEntries[0],
      terminalSupport: terminalSupportCandidate,
      sectionConstraintProblem: true,
    }),
  };
}

function harmonicStasisSourceConstraintCandidates(input: {
  candidates: readonly Exposition[];
  selectedCandidate: Exposition;
  selectionWindow: ContinuationCandidateSelectionWindow;
  selectionModel: SelectionModel;
  writingProfile: WritingProfile;
  terminalSupportCandidate: boolean;
}): ConstraintCandidate[] {
  if (input.selectedCandidate.constraintCandidateFamily !== "harmonic-stasis-variant") {
    return [];
  }
  const sourceIndex = input.selectedCandidate.constraintSourceCandidateIndex;
  const sourceCandidate = sourceIndex === undefined ? undefined : input.candidates[sourceIndex];
  if (sourceIndex === undefined || sourceCandidate === undefined) {
    return [];
  }

  const sourceState = sourceCandidate.sectionPlans[0]?.state ?? "episode";
  const sourceBand = continuationCandidateSelectionBand(
    sourceIndex,
    input.selectionWindow,
    input.selectionModel,
    sourceCandidate,
  );
  return [
    buildContinuationConstraintCandidate(
      `${continuationConstraintCandidateId({
        startTick: sourceCandidate.sectionPlans[0]?.startTick ?? 0,
        state: sourceState,
        candidateBand: sourceBand,
        candidateIndex: sourceIndex,
        durationTicks: sourceCandidate.durationTicks,
      })}-unrepaired-final-repair-evidence`,
      sourceCandidate,
      input.writingProfile,
      input.terminalSupportCandidate,
    ),
  ];
}

function continuationConstraintCandidateId(input: {
  startTick: number;
  state: FugueState;
  candidateBand: ContinuationCandidateSelectionBand;
  candidateIndex: number;
  durationTicks?: number;
}): string {
  const durationPart = input.durationTicks === undefined ? "" : `-duration-${input.durationTicks}`;
  return `section-${input.startTick}-${input.state}-${input.candidateBand}${durationPart}-candidate-${input.candidateIndex}`;
}

function describeCandidateDiversity(candidate: Exposition): CandidateDiversityDescriptor {
  const section = candidate.sectionPlans[0];
  const entry = candidate.subjectEntries[0];
  return {
    subjectStem: subjectStemDescriptor(candidate),
    answerTransform: answerTransformDescriptor(candidate),
    fragmentDerivation: fragmentDerivationDescriptor(section),
    phraseFunction: phraseFunctionDescriptor(section),
    cadenceApproach: section?.cadenceKind ?? "unknown",
    supportRole: supportRoleDescriptor(candidate.notes),
    sectionState: section?.state ?? entry?.state ?? "unknown",
  };
}

function subjectStemDescriptor(candidate: Exposition): string {
  const entry = candidate.subjectEntries.find((candidateEntry) => candidateEntry.form !== "answer");
  return entry === undefined ? "none" : `${entry.form}:${entry.expectedDegreePattern.slice(0, 8).join("-")}`;
}

function answerTransformDescriptor(candidate: Exposition): string {
  const entry = candidate.subjectEntries.find((candidateEntry) => candidateEntry.form === "answer");
  if (entry === undefined) {
    return "none";
  }
  return `${entry.answerKind ?? "none"}:${entry.expectedDegreePattern.slice(0, 8).join("-")}`;
}

function fragmentDerivationDescriptor(section: HarmonicPlan | undefined): string {
  return `${section?.fragmentTransform ?? "none"}:${phraseFunctionDescriptor(section)}`;
}

function phraseFunctionDescriptor(section: HarmonicPlan | undefined): string {
  if (section === undefined) {
    return "unknown";
  }
  if (section.state === "episode") {
    return section.sequencePattern === undefined ? "episode-sequence" : `episode-${section.sequencePattern}`;
  }
  if (section.state === "stretto-like") {
    return "stretto-compression";
  }
  if (section.cadenceKind === "authentic" || section.cadenceKind === "modal") {
    return "cadence-extension";
  }
  return "restatement";
}

function supportRoleDescriptor(notes: readonly NoteEvent[]): string {
  const supportRoles = new Set(
    notes
      .map((note) => note.role)
      .filter(
        (role): role is Exclude<NonNullable<NoteEvent["role"]>, "subject" | "answer"> =>
          role !== undefined && role !== "subject" && role !== "answer",
      ),
  );
  if (supportRoles.size === 0) {
    return "none";
  }
  if (supportRoles.size > 1) {
    return "mixed";
  }
  return [...supportRoles][0]!;
}

function avoidShortAlternatingPhraseSelection(input: {
  candidates: readonly Exposition[];
  evaluations: readonly CandidateEvaluation[];
  bestIndex: number;
  selectionWindow: ContinuationCandidateSelectionWindow;
  baselineEvaluation: CandidateEvaluation;
  historyContext: HistoryAwareSelectionContext;
  selectionModel: SelectionModel;
}): number {
  if (input.selectionModel !== "section-local-planner") {
    return input.bestIndex;
  }

  const selectedState = input.candidates[input.bestIndex]?.sectionPlans[0]?.state ?? input.historyContext.plannedState;
  if (!createsShortAlternatingPhrase([...input.historyContext.previousStateHistory, selectedState])) {
    return input.bestIndex;
  }

  let fallbackIndex = input.bestIndex;
  let fallbackScore = Number.POSITIVE_INFINITY;

  for (const [index, evaluation] of input.evaluations.entries()) {
    const candidateBand = continuationCandidateSelectionBand(
      index,
      input.selectionWindow,
      input.selectionModel,
      input.candidates[index],
    );
    if (!candidateBandCanBeFallback(candidateBand, index, input.selectionWindow, input.selectionModel)) {
      continue;
    }
    if (evaluation.hardFailures.length > 0) {
      continue;
    }
    if (
      candidateBand !== "baseline" &&
      !preservesSectionLocalGuardrails(
        evaluation,
        input.baselineEvaluation,
        candidateBand === "section-grammar" || candidateBand === "phrase-family" || candidateBand === "section-csp",
      )
    ) {
      continue;
    }

    const candidateState = input.candidates[index]?.sectionPlans[0]?.state ?? input.historyContext.plannedState;
    if (createsShortAlternatingPhrase([...input.historyContext.previousStateHistory, candidateState])) {
      continue;
    }

    const candidateScore =
      candidateBand !== "baseline"
        ? candidateSelectionScore(evaluation, input.selectionModel)
        : candidateSelectionScore(evaluation, "candidate-oracle-selection");
    if (candidateScore < fallbackScore) {
      fallbackIndex = index;
      fallbackScore = candidateScore;
    }
  }

  return fallbackIndex;
}

function continuationCandidateSelectionWindow(
  state: FugueState,
  selectionModel: SelectionModel,
  candidateCount: number,
): ContinuationCandidateSelectionWindow {
  if (selectionModel !== "section-local-planner") {
    return {
      baselineCandidateCount: candidateCount,
      selectableCandidateCount: candidateCount,
      sectionGrammarCandidateStart: candidateCount,
      phraseFamilyCandidateStart: candidateCount,
      harmonicStasisCandidateStart: candidateCount,
    };
  }

  const harmonicStasisCandidateStart = harmonicStasisCandidateStartIndex(state);
  return {
    baselineCandidateCount: baselineContinuationCandidateCount(state),
    selectableCandidateCount: selectableContinuationCandidateCount(state),
    sectionGrammarCandidateStart: sectionGrammarCandidateStartIndex(state),
    phraseFamilyCandidateStart: phraseFamilyCandidateStartIndex(state),
    harmonicStasisCandidateStart,
  };
}

function continuationCandidateSelectionBand(
  index: number,
  window: ContinuationCandidateSelectionWindow,
  selectionModel: SelectionModel,
  candidate?: Exposition,
): ContinuationCandidateSelectionBand {
  if (candidate?.constraintCandidateFamily === "section-csp-variant") {
    return "section-csp";
  }
  if (candidate?.constraintCandidateFamily === "harmonic-stasis-variant") {
    return "harmonic-stasis";
  }
  if (selectionModel !== "section-local-planner" || index < window.baselineCandidateCount) {
    return "baseline";
  }
  if (index < window.sectionGrammarCandidateStart) {
    return "section-local";
  }
  if (index < window.phraseFamilyCandidateStart) {
    return "section-grammar";
  }
  if (index < window.harmonicStasisCandidateStart) {
    return "phrase-family";
  }
  return "harmonic-stasis";
}

function candidateBandCanBeSelected(
  band: ContinuationCandidateSelectionBand,
  index: number,
  window: ContinuationCandidateSelectionWindow,
  selectionModel: SelectionModel,
): boolean {
  if (selectionModel !== "section-local-planner") {
    return true;
  }
  if (band === "baseline") {
    return false;
  }
  return (
    index < window.selectableCandidateCount ||
    band === "section-grammar" ||
    band === "phrase-family" ||
    band === "section-csp" ||
    band === "harmonic-stasis"
  );
}

function candidateBandCanBeFallback(
  band: ContinuationCandidateSelectionBand,
  index: number,
  window: ContinuationCandidateSelectionWindow,
  selectionModel: SelectionModel,
): boolean {
  if (band === "baseline") {
    return true;
  }
  return candidateBandCanBeSelected(band, index, window, selectionModel);
}

function baselineContinuationCandidateCount(state: FugueState): number {
  if (state === "episode") {
    return VOICE_ENTRY_ORDER.length * 3;
  }
  if (state === "subject-return") {
    return VOICE_ENTRY_ORDER.length * 4;
  }
  return VOICE_ENTRY_ORDER.length * (VOICE_ENTRY_ORDER.length - 1);
}

function selectableContinuationCandidateCount(state: FugueState): number {
  if (state === "stretto-like") {
    return baselineContinuationCandidateCount(state);
  }

  return baselineContinuationCandidateCount(state) * 3;
}

function sectionGrammarCandidateStartIndex(state: FugueState): number {
  if (state === "stretto-like") {
    return baselineContinuationCandidateCount(state);
  }

  return baselineContinuationCandidateCount(state) * 4;
}

function phraseFamilyCandidateStartIndex(state: FugueState): number {
  return sectionGrammarCandidateStartIndex(state) + 4;
}

function harmonicStasisCandidateStartIndex(state: FugueState): number {
  return phraseFamilyCandidateStartIndex(state) + 2;
}

function sectionGrammarPlannerSelectionRiskAdjustment(
  evaluation: CandidateEvaluation,
  context: HistoryAwareSelectionContext,
  isSectionGrammarCandidate: boolean,
): number {
  if (!context.enabled || evaluation.hardFailures.length > 0) {
    return 0;
  }

  const state = evaluation.explanations.sections[0]?.state ?? context.plannedState;
  const score = historyAwareStateScore({
    state,
    stateHistory: context.previousStateHistory,
    previousCadenceKind: context.previousCadenceKind,
    previousDensity: context.previousDensity,
    keyDistance: context.keyDistance,
  });

  return score * 80 + (isSectionGrammarCandidate ? -4 : 0);
}

function phraseDevelopmentSelectionRiskAdjustment(
  candidate: Exposition,
  previousSubjectEntries: readonly PlannedEntry[],
  previousSectionPlans: readonly HarmonicPlan[],
  context: HistoryAwareSelectionContext,
): number {
  if (!context.enabled) {
    return 0;
  }

  const candidateEntry = candidate.subjectEntries.find(
    (entry) => entry.state !== "exposition" && (entry.form === "subject" || entry.form === "subject-fragment"),
  );
  if (candidateEntry === undefined) {
    return 0;
  }

  const recentEntries = previousSubjectEntries
    .filter((entry) => entry.state !== "exposition" && entry.form === candidateEntry.form)
    .slice(-12);
  const candidateStem = candidateEntry.expectedDegreePattern.join("-");
  const candidateSection = candidate.sectionPlans[0];
  const candidatePhraseFunction = phraseFunctionDescriptor(candidateSection);
  const candidateKeySignature = keySignatureDescriptor(candidateEntry.localKey);
  const sameStemCount = recentEntries.filter((entry) => entry.expectedDegreePattern.join("-") === candidateStem).length;
  const sameStemSameVoiceCount = recentEntries.filter(
    (entry) => entry.expectedDegreePattern.join("-") === candidateStem && entry.voice === candidateEntry.voice,
  ).length;
  const sameFullPhraseSignatureCount = recentEntries.filter(
    (entry) =>
      entry.expectedDegreePattern.join("-") === candidateStem &&
      entry.voice === candidateEntry.voice &&
      keySignatureDescriptor(entry.localKey) === candidateKeySignature &&
      phraseFunctionDescriptor(sectionForTick(previousSectionPlans, entry.startTick) ?? candidateSection) ===
        candidatePhraseFunction,
  ).length;
  const hasChangedFunctionForStem = recentEntries.some(
    (entry) =>
      entry.expectedDegreePattern.join("-") === candidateStem &&
      (entry.voice !== candidateEntry.voice ||
        keySignatureDescriptor(entry.localKey) !== candidateKeySignature ||
        phraseFunctionDescriptor(sectionForTick(previousSectionPlans, entry.startTick) ?? candidateSection) !==
          candidatePhraseFunction),
  );
  const functionBearingReward =
    candidateSection?.cadenceKind === "authentic" ||
    candidateSection?.cadenceKind === "modal" ||
    candidateSection?.state === "stretto-like" ||
    hasChangedFunctionForStem
      ? 24
      : 0;
  const unchangedEpisodeSignaturePressure =
    candidateEntry.state === "episode" && sameStemCount > 0 && !hasChangedFunctionForStem ? 1400 : 0;

  return (
    sameStemCount * 180 +
    sameStemSameVoiceCount * 90 +
    sameFullPhraseSignatureCount * 720 +
    unchangedEpisodeSignaturePressure -
    functionBearingReward
  );
}

function sectionForTick(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

function keySignatureDescriptor(keySignature: KeySignature): string {
  return `${keySignature.tonic}:${keySignature.mode}`;
}

function bestContinuationCandidateIndex(
  evaluations: readonly CandidateEvaluation[],
  selectionModel: SelectionModel,
): number {
  let bestIndex = 0;
  for (const [index, evaluation] of evaluations.entries()) {
    if (
      candidateSelectionScore(evaluation, selectionModel) <
      candidateSelectionScore(evaluations[bestIndex]!, selectionModel)
    ) {
      bestIndex = index;
    }
  }
  return bestIndex;
}

function preservesSectionLocalGuardrails(
  evaluation: CandidateEvaluation,
  baselineEvaluation: CandidateEvaluation,
  allowNeutralSoloTexture = false,
): boolean {
  const evaluationTexture = evaluation.dimensions.texture.features;
  const baselineTexture = baselineEvaluation.dimensions.texture.features;
  const evaluationMelody = evaluation.dimensions.melody.features;
  const baselineMelody = baselineEvaluation.dimensions.melody.features;
  const evaluationSubject = evaluation.dimensions.subjectClarity.features;
  const baselineSubject = baselineEvaluation.dimensions.subjectClarity.features;
  const evaluationHarmony = evaluation.dimensions.harmony.features;
  const baselineHarmony = baselineEvaluation.dimensions.harmony.features;
  const soloTextureAllowance = allowNeutralSoloTexture ? 0 : 4;

  return (
    evaluation.hardFailures.length === 0 &&
    selectedSectionSoloTextureRisk(evaluation) <=
      selectedSectionSoloTextureRisk(baselineEvaluation) - soloTextureAllowance &&
    evaluationTexture.samePitchOverlapCount <= baselineTexture.samePitchOverlapCount &&
    evaluationTexture.unisonOverlapCount <= baselineTexture.unisonOverlapCount &&
    evaluationTexture.sharedRhythmOverlapCount <= baselineTexture.sharedRhythmOverlapCount &&
    evaluationTexture.qualityVectorPitchClassUnisonDuration <= baselineTexture.qualityVectorPitchClassUnisonDuration &&
    evaluationTexture.qualityVectorDurationBasedLockstep <= baselineTexture.qualityVectorDurationBasedLockstep &&
    evaluationTexture.fourBeatOuterVoiceSameDirectionRatio <=
      baselineTexture.fourBeatOuterVoiceSameDirectionRatio + 0.02 &&
    evaluationMelody.leapRecoveryMisses <= baselineMelody.leapRecoveryMisses &&
    evaluationSubject.counterSubjectIdentityRetention >= baselineSubject.counterSubjectIdentityRetention &&
    evaluationHarmony.entrySupportInstabilityCount <= baselineHarmony.entrySupportInstabilityCount &&
    evaluationHarmony.severeEntryIntervalCount <= baselineHarmony.severeEntryIntervalCount &&
    evaluationHarmony.unresolvedSevereEntryIntervalCount <= baselineHarmony.unresolvedSevereEntryIntervalCount &&
    (evaluationHarmony.unresolvedAccentedEntryClashCount ?? 0) <=
      (baselineHarmony.unresolvedAccentedEntryClashCount ?? 0) &&
    evaluationHarmony.qualityVectorUnresolvedEntrySevereIntervalDuration <=
      baselineHarmony.qualityVectorUnresolvedEntrySevereIntervalDuration
  );
}

function selectedSectionSoloTextureRisk(evaluation: CandidateEvaluation): number {
  return evaluation.explanations.sections.reduce((sum, section) => sum + section.soloTextureRisk, 0);
}

function buildHarmonicStasisSolverCandidates(sourceCandidates: readonly Exposition[]): Exposition[] {
  return sourceCandidates.flatMap((sourceCandidate, sourceCandidateIndex) => {
    const before = analyzeHarmonicStasisRearticulation(sourceCandidate.notes, sourceCandidate.sectionPlans);
    if (before.generatorResponseWindowCount === 0) {
      return [];
    }

    const repaired = cloneExposition(sourceCandidate);
    repairHarmonicStasisRearticulation(repaired.notes, repaired.sectionPlans);
    repaired.notes.sort(compareNoteEvents);
    const after = analyzeHarmonicStasisRearticulation(repaired.notes, repaired.sectionPlans);
    if (after.generatorResponseWindowCount >= before.generatorResponseWindowCount) {
      return [];
    }

    return [
      {
        ...repaired,
        constraintCandidateFamily: "harmonic-stasis-variant" as const,
        constraintSourceCandidateIndex: sourceCandidateIndex,
      },
    ];
  });
}

function buildSectionCspSolverCandidates(
  sourceCandidates: readonly Exposition[],
  writingProfile: WritingProfile,
): Exposition[] {
  return sourceCandidates.map((sourceCandidate, sourceCandidateIndex) => {
    const repaired = cloneExposition(sourceCandidate);
    addFunctionalThinningSupport(repaired.notes, repaired.sectionPlans, writingProfile);
    addExposedFreeCounterpointSoloSupport(repaired.notes, repaired.sectionPlans, writingProfile);
    addPostEntryContinuationSupport(repaired.notes, repaired.subjectEntries, repaired.sectionPlans, writingProfile);
    shapeLongRestPhraseClosures(repaired.notes, repaired.sectionPlans);
    addBassAnswerTailTextureSupport(repaired.notes, repaired.subjectEntries, repaired.sectionPlans, writingProfile);
    addShortEpisodeHarmonicContinuitySupport(repaired.notes, repaired.sectionPlans, writingProfile);
    repairTextureVoiceCrossingsForNotes(repaired.notes, repaired.sectionPlans, writingProfile);
    repaired.notes.sort(compareNoteEvents);

    return {
      ...repaired,
      constraintCandidateFamily: "section-csp-variant" as const,
      constraintSourceCandidateIndex: sourceCandidateIndex,
    };
  });
}

export function buildContinuationCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  rng: Xoshiro128StarStar,
  selectionModel: SelectionModel = "baseline",
  phraseIntent?: ContinuationPhraseSectionIntent,
  counterSubjectSupportRepair = false,
  meterContext: MeterContext = createLegacyMeterContext(),
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
): Exposition[] {
  const notes: Exposition["notes"] = [];
  const candidates: Exposition[] = [];
  const sectionLocalPlannerCandidates: Exposition[] = [];
  const voicePairSupportCandidates: Exposition[] = [];
  const registerPlannerCandidates: Exposition[] = [];
  const sectionGrammarCandidates: Exposition[] = [];
  const phraseFamilyOracleCandidates: Exposition[] = [];
  const sectionCspSolverCandidates: Exposition[] = [];
  const harmonicStasisSolverCandidates: Exposition[] = [];
  const includeSectionLocalPlannerCandidates = selectionModel === "section-local-planner";
  const phraseSubject = phraseSubjectForIntent(subject, state, startTick, selectionModel, phraseIntent);

  if (state === "episode") {
    for (const voice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const pitchClassOffset of rng.shuffle(preferredOffsets([0, 5, 7] as const, phraseIntent?.keyOffset))) {
        const input = {
          state,
          voice,
          form: "subject-fragment" as const,
          startTick,
          globalKey: keySignature,
          localKey: transposeKey(keySignature, pitchClassOffset),
          targetKey: transposeKey(keySignature, pitchClassOffset === 0 ? 7 : pitchClassOffset),
          supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(phraseSubject.slice(0, 4))),
          sectionDurationTicks,
          styleProfile: chooseStyleProfile(rng),
          sequencePattern: chooseEpisodeSequencePattern(
            rng,
            selectionModel,
            voice,
            pitchClassOffset,
            startTick,
            phraseIntent,
          ),
          fragmentTransform: chooseEpisodeFragmentTransform(
            rng,
            selectionModel,
            voice,
            pitchClassOffset,
            startTick,
            phraseIntent,
          ),
          cadenceKind: phraseIntent?.cadenceKind,
          freeCounterpointPhraseVariation: includeSectionLocalPlannerCandidates,
        };
        candidates.push(
          buildContinuationSection(
            phraseSubject.slice(0, 4),
            input,
            counterSubjectSupportRepair,
            meterContext,
            writingProfile,
          ),
        );
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject.slice(0, 4),
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
          voicePairSupportCandidates.push(
            buildContinuationSection(
              phraseSubject.slice(0, 4),
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: voicePairSupportContinuityVoiceOrder(voice),
                continuityLineKind: "oblique-support",
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject.slice(0, 4),
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
        }
      }
    }
  } else if (state === "subject-return") {
    for (const voice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const pitchClassOffset of rng.shuffle(preferredOffsets([0, 5, 7, 9] as const, phraseIntent?.keyOffset))) {
        const input = {
          state,
          voice,
          form: "subject" as const,
          startTick,
          globalKey: keySignature,
          localKey: transposeKey(keySignature, pitchClassOffset),
          targetKey: transposeKey(keySignature, pitchClassOffset),
          supportDurationTicks: subjectDuration(phraseSubject),
          sectionDurationTicks,
          styleProfile: chooseStyleProfile(rng),
          cadenceKind: phraseIntent?.cadenceKind,
          freeCounterpointPhraseVariation: includeSectionLocalPlannerCandidates,
        };
        candidates.push(
          buildContinuationSection(phraseSubject, input, counterSubjectSupportRepair, meterContext, writingProfile),
        );
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject,
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
          voicePairSupportCandidates.push(
            buildContinuationSection(
              phraseSubject,
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: voicePairSupportContinuityVoiceOrder(voice),
                continuityLineKind: "oblique-support",
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject,
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
                freeCounterpointPhraseVariation: true,
              },
              counterSubjectSupportRepair,
              meterContext,
              writingProfile,
            ),
          );
        }
      }
    }
  } else {
    for (const firstVoice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const secondVoice of rng.shuffle(VOICE_ENTRY_ORDER.filter((voice) => voice !== firstVoice))) {
        candidates.push(
          buildStrettoSection(
            phraseSubject.slice(0, 6),
            {
              state,
              firstVoice,
              secondVoice,
              startTick,
              globalKey: keySignature,
              sectionDurationTicks,
              styleProfile: chooseStyleProfile(rng),
              cadenceKind: phraseIntent?.cadenceKind,
            },
            counterSubjectSupportRepair,
            meterContext,
            writingProfile,
          ),
        );
      }
    }
  }

  if (includeSectionLocalPlannerCandidates) {
    sectionGrammarCandidates.push(
      ...buildSectionGrammarOracleCandidates(
        subject,
        keySignature,
        state,
        startTick,
        sectionDurationTicks,
        meterContext,
        writingProfile,
      ),
    );
    phraseFamilyOracleCandidates.push(
      ...buildPhraseFamilyOracleCandidates(
        subject,
        keySignature,
        state,
        startTick,
        sectionDurationTicks,
        meterContext,
        writingProfile,
      ),
    );
  }

  if (includeSectionLocalPlannerCandidates) {
    sectionCspSolverCandidates.push(
      ...buildSectionCspSolverCandidates(
        [
          ...candidates,
          ...sectionLocalPlannerCandidates,
          ...voicePairSupportCandidates,
          ...registerPlannerCandidates,
          ...sectionGrammarCandidates,
          ...phraseFamilyOracleCandidates,
        ],
        writingProfile,
      ),
    );
    harmonicStasisSolverCandidates.push(
      ...buildHarmonicStasisSolverCandidates([
        ...candidates,
        ...sectionLocalPlannerCandidates,
        ...voicePairSupportCandidates,
        ...registerPlannerCandidates,
        ...sectionGrammarCandidates,
        ...phraseFamilyOracleCandidates,
        ...sectionCspSolverCandidates,
      ]),
    );
  }

  candidates.push(...sectionLocalPlannerCandidates);
  candidates.push(...voicePairSupportCandidates);
  candidates.push(...registerPlannerCandidates);
  candidates.push(...sectionGrammarCandidates);
  candidates.push(...phraseFamilyOracleCandidates);
  candidates.push(...sectionCspSolverCandidates);
  candidates.push(...harmonicStasisSolverCandidates);

  return candidates.length === 0
    ? [
        {
          notes,
          subjectEntries: [],
          sectionPlans: [],
          endTick: startTick,
          durationTicks: sectionDurationTicks,
        },
      ]
    : candidates;
}

function phraseSubjectForIntent(
  subject: readonly SubjectNote[],
  state: FugueState,
  startTick: number,
  selectionModel: SelectionModel,
  phraseIntent: ContinuationPhraseSectionIntent | undefined,
): readonly SubjectNote[] {
  if (selectionModel !== "section-local-planner" || phraseIntent === undefined) {
    return subject;
  }
  if (state === "episode") {
    if (phraseIntent.densityArc === "balanced") {
      return deriveSubjectStemFromSource(subject, [0, 2, 1, 3, 4, 5, 6, 7]);
    }
    if (phraseIntent.densityArc === "full") {
      return deriveSubjectStemFromSource(subject, [0, 1, 3, 2, 4, 5, 6, 7]);
    }
    return subject;
  }
  if (state === "subject-return") {
    const returnPatterns = [
      [0, 2, 1, 3, 4, 2, 3, 1],
      [0, 1, 3, 2, 4, 2, 3, 1],
      [0, 2, 3, 1, 4, 3, 1, 2],
    ] as const;
    const variantIndex =
      (phraseIntent.densityArc === "full" ? 1 : phraseIntent.densityArc === "thin" ? 2 : 0) +
      Math.floor(startTick / (TICKS_PER_QUARTER * 16));
    return deriveSubjectStemFromSource(subject, returnPatterns[variantIndex % returnPatterns.length]!);
  }
  const strettoPatterns = [
    [0, 2, 1, 4, 3, 2, 1, 3],
    [0, 1, 3, 4, 2, 1, 3, 2],
    [0, 2, 3, 1, 4, 2, 1, 3],
  ] as const;
  const variantIndex =
    (phraseIntent.densityArc === "full" ? 1 : phraseIntent.densityArc === "thin" ? 2 : 0) +
    Math.floor(startTick / (TICKS_PER_QUARTER * 16));
  return deriveSubjectStemFromSource(subject, strettoPatterns[variantIndex % strettoPatterns.length]!);
}

function preferredOffsets<const T extends readonly number[]>(offsets: T, preferredOffset: number | undefined): T {
  if (preferredOffset === undefined || !offsets.includes(preferredOffset)) {
    return offsets;
  }
  return [preferredOffset, ...offsets.filter((offset) => offset !== preferredOffset)] as unknown as T;
}

function phraseContinuityVoiceCount(
  phraseIntent: ContinuationPhraseSectionIntent | undefined,
  fallback: number,
): number {
  if (phraseIntent?.densityArc === "full") {
    return 2;
  }
  return fallback;
}

function buildSectionGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  selectedState: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): Exposition[] {
  const candidates: Exposition[] = [];
  const candidateStates = (["episode", "subject-return", "stretto-like"] as const).filter(
    (state) => state !== selectedState,
  );

  for (const state of candidateStates) {
    if (state === "episode") {
      candidates.push(
        ...buildEpisodeGrammarOracleCandidates(
          subject,
          keySignature,
          startTick,
          sectionDurationTicks,
          meterContext,
          writingProfile,
        ),
      );
    } else if (state === "subject-return") {
      candidates.push(
        ...buildSubjectReturnGrammarOracleCandidates(
          subject,
          keySignature,
          startTick,
          sectionDurationTicks,
          meterContext,
          writingProfile,
        ),
      );
    } else {
      candidates.push(
        ...buildStrettoGrammarOracleCandidates(
          subject,
          keySignature,
          startTick,
          sectionDurationTicks,
          meterContext,
          writingProfile,
        ),
      );
    }
  }

  return candidates;
}

function buildPhraseFamilyOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): Exposition[] {
  const subjectVariation = deriveSubjectStem(subject, [0, 2, 1, 3, 4, 2, 3, 1]);
  const modalVariation = deriveSubjectStem(subject, [0, 2, 3, 1, 4, 3, 1, 0]);
  const fragmentVariation = deriveSubjectStem(subject.slice(0, 4), [0, 2, 1, 3]);

  if (state === "episode") {
    return [
      buildContinuationSection(
        fragmentVariation,
        {
          state,
          voice: "alto",
          form: "subject-fragment",
          startTick,
          globalKey: keySignature,
          localKey: transposeKey(keySignature, 5),
          targetKey: transposeKey(keySignature, 7),
          supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(fragmentVariation)),
          sectionDurationTicks,
          styleProfile: "hybrid",
          sequencePattern: "circle-fifths",
          fragmentTransform: "inversion",
          continuityVoiceCount: 2,
          continuityVoiceOrder: registerBlendedContinuityVoiceOrder("alto"),
          freeCounterpointPhraseVariation: true,
        },
        false,
        meterContext,
        writingProfile,
      ),
      buildContinuationSection(
        deriveSubjectStem(subject.slice(0, 4), [0, 3, 1, 2]),
        {
          state,
          voice: "tenor",
          form: "subject-fragment",
          startTick,
          globalKey: keySignature,
          localKey: transposeKey(keySignature, 7),
          targetKey: transposeKey(keySignature, 5),
          supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(fragmentVariation)),
          sectionDurationTicks,
          styleProfile: "strict-classical",
          sequencePattern: "descending-step",
          fragmentTransform: "contrary-motion",
          continuityVoiceCount: 2,
          continuityVoiceOrder: registerBlendedContinuityVoiceOrder("tenor"),
          freeCounterpointPhraseVariation: true,
        },
        false,
        meterContext,
        writingProfile,
      ),
    ];
  }

  if (state === "subject-return") {
    const returnSubject = isModalMode(keySignature.mode) ? modalVariation : subjectVariation;
    return [
      buildContinuationSection(
        returnSubject,
        {
          state,
          voice: "alto",
          form: "subject",
          startTick,
          globalKey: keySignature,
          localKey: keySignature,
          targetKey: keySignature,
          supportDurationTicks: subjectDuration(returnSubject),
          sectionDurationTicks,
          styleProfile: isModalMode(keySignature.mode) ? "hybrid" : "strict-classical",
          continuityVoiceCount: 2,
          continuityVoiceOrder: registerBlendedContinuityVoiceOrder("alto"),
          freeCounterpointPhraseVariation: true,
        },
        false,
        meterContext,
        writingProfile,
      ),
      buildContinuationSection(
        subjectVariation,
        {
          state,
          voice: "tenor",
          form: "subject",
          startTick,
          globalKey: keySignature,
          localKey: transposeKey(keySignature, 7),
          targetKey: transposeKey(keySignature, 7),
          supportDurationTicks: subjectDuration(subjectVariation),
          sectionDurationTicks,
          styleProfile: "hybrid",
          continuityVoiceCount: 2,
          continuityVoiceOrder: registerBlendedContinuityVoiceOrder("tenor"),
          freeCounterpointPhraseVariation: true,
        },
        false,
        meterContext,
        writingProfile,
      ),
    ];
  }

  return [
    buildStrettoSection(
      subjectVariation.slice(0, 6),
      {
        state: "stretto-like",
        firstVoice: "soprano",
        secondVoice: "tenor",
        startTick,
        globalKey: keySignature,
        sectionDurationTicks,
        styleProfile: "hybrid",
      },
      false,
      meterContext,
      writingProfile,
    ),
    buildStrettoSection(
      modalVariation.slice(0, 6),
      {
        state: "stretto-like",
        firstVoice: "bass",
        secondVoice: "alto",
        startTick,
        globalKey: keySignature,
        sectionDurationTicks,
        styleProfile: isModalMode(keySignature.mode) ? "hybrid" : "strict-classical",
      },
      false,
      meterContext,
      writingProfile,
    ),
  ];
}

function deriveSubjectStem(subject: readonly SubjectNote[], degreePattern: readonly number[]): SubjectNote[] {
  return subject.slice(0, degreePattern.length).map((note, index) => {
    const scaleDegree = degreePattern[index]!;
    return {
      ...note,
      scaleDegree,
      importantTone: scaleDegree === 0 || scaleDegree === 4 || index === degreePattern.length - 1,
      melodicRole: melodicRoleForScaleDegree(scaleDegree),
    };
  });
}

function deriveSubjectStemFromSource(subject: readonly SubjectNote[], sourceIndexes: readonly number[]): SubjectNote[] {
  const sourceDegrees = subject.map((note) => note.scaleDegree);
  return deriveSubjectStem(
    subject,
    sourceIndexes.map((sourceIndex) => sourceDegrees[Math.min(sourceIndex, sourceDegrees.length - 1)] ?? 0),
  );
}

function buildEpisodeGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  startTick: number,
  sectionDurationTicks: number,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): Exposition[] {
  return [
    buildContinuationSection(
      subject.slice(0, 4),
      {
        state: "episode",
        voice: "alto",
        form: "subject-fragment",
        startTick,
        globalKey: keySignature,
        localKey: transposeKey(keySignature, 5),
        targetKey: transposeKey(keySignature, 5),
        supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(subject.slice(0, 4))),
        sectionDurationTicks,
        styleProfile: "hybrid",
        sequencePattern: "circle-fifths",
        fragmentTransform: "contrary-motion",
        continuityVoiceCount: 2,
        continuityVoiceOrder: registerBlendedContinuityVoiceOrder("alto"),
        freeCounterpointPhraseVariation: true,
      },
      false,
      meterContext,
      writingProfile,
    ),
    buildContinuationSection(
      subject.slice(0, 4),
      {
        state: "episode",
        voice: "tenor",
        form: "subject-fragment",
        startTick,
        globalKey: keySignature,
        localKey: transposeKey(keySignature, 7),
        targetKey: transposeKey(keySignature, 7),
        supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(subject.slice(0, 4))),
        sectionDurationTicks,
        styleProfile: "strict-classical",
        sequencePattern: "descending-step",
        fragmentTransform: "sequence",
        continuityVoiceCount: 2,
        continuityVoiceOrder: registerBlendedContinuityVoiceOrder("tenor"),
        freeCounterpointPhraseVariation: true,
      },
      false,
      meterContext,
      writingProfile,
    ),
  ];
}

function buildSubjectReturnGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  startTick: number,
  sectionDurationTicks: number,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): Exposition[] {
  return [
    buildContinuationSection(
      subject,
      {
        state: "subject-return",
        voice: "alto",
        form: "subject",
        startTick,
        globalKey: keySignature,
        localKey: keySignature,
        targetKey: keySignature,
        supportDurationTicks: subjectDuration(subject),
        sectionDurationTicks,
        styleProfile: "strict-classical",
        continuityVoiceCount: 2,
        continuityVoiceOrder: registerBlendedContinuityVoiceOrder("alto"),
        freeCounterpointPhraseVariation: true,
      },
      false,
      meterContext,
      writingProfile,
    ),
    buildContinuationSection(
      subject,
      {
        state: "subject-return",
        voice: "tenor",
        form: "subject",
        startTick,
        globalKey: keySignature,
        localKey: transposeKey(keySignature, 7),
        targetKey: transposeKey(keySignature, 7),
        supportDurationTicks: subjectDuration(subject),
        sectionDurationTicks,
        styleProfile: "hybrid",
        continuityVoiceCount: 2,
        continuityVoiceOrder: registerBlendedContinuityVoiceOrder("tenor"),
        freeCounterpointPhraseVariation: true,
      },
      false,
      meterContext,
      writingProfile,
    ),
  ];
}

function buildStrettoGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  startTick: number,
  sectionDurationTicks: number,
  meterContext: MeterContext,
  writingProfile: WritingProfile,
): Exposition[] {
  return [
    buildStrettoSection(
      subject.slice(0, 6),
      {
        state: "stretto-like",
        firstVoice: "alto",
        secondVoice: "soprano",
        startTick,
        globalKey: keySignature,
        sectionDurationTicks,
        styleProfile: "hybrid",
      },
      false,
      meterContext,
      writingProfile,
    ),
    buildStrettoSection(
      subject.slice(0, 6),
      {
        state: "stretto-like",
        firstVoice: "tenor",
        secondVoice: "alto",
        startTick,
        globalKey: keySignature,
        sectionDurationTicks,
        styleProfile: "strict-classical",
      },
      false,
      meterContext,
      writingProfile,
    ),
  ];
}

function registerBlendedContinuityVoiceOrder(entryVoice: Voice): readonly Voice[] {
  if (entryVoice === "soprano") {
    return ["alto", "tenor", "soprano", "bass"];
  }
  if (entryVoice === "alto") {
    return ["tenor", "alto", "soprano", "bass"];
  }
  if (entryVoice === "tenor") {
    return ["alto", "tenor", "bass", "soprano"];
  }
  return ["tenor", "alto", "bass", "soprano"];
}

function voicePairSupportContinuityVoiceOrder(entryVoice: Voice): readonly Voice[] {
  if (entryVoice === "soprano") {
    return ["tenor", "alto", "bass", "soprano"];
  }
  if (entryVoice === "alto") {
    return ["bass", "tenor", "soprano", "alto"];
  }
  if (entryVoice === "tenor") {
    return ["soprano", "alto", "bass", "tenor"];
  }
  return ["alto", "tenor", "soprano", "bass"];
}

export function buildContinuationSection(
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    voice: Voice;
    form: EntryForm;
    startTick: number;
    globalKey: KeySignature;
    localKey: KeySignature;
    targetKey: KeySignature;
    answerKind?: AnswerKind;
    supportDurationTicks: number;
    sectionDurationTicks: number;
    styleProfile: StyleProfile;
    sequencePattern?: SequencePattern;
    fragmentTransform?: FragmentTransform;
    continuityVoiceCount?: number;
    continuityVoiceOrder?: readonly Voice[];
    continuityLineKind?: ContinuityLineKind;
    freeCounterpointPhraseVariation?: boolean;
    cadenceKind?: CadenceKind;
  },
  counterSubjectSupportRepair = false,
  meterContext: MeterContext = createLegacyMeterContext(),
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const sectionPlans = [
    buildHarmonicPlan({
      state: entry.state,
      startTick: entry.startTick,
      durationTicks: entry.sectionDurationTicks,
      globalKey: entry.globalKey,
      localKey: entry.localKey,
      targetKey: entry.targetKey,
      styleProfile: entry.styleProfile,
      cadenceKind: entry.cadenceKind ?? cadenceKindForSection(entry.state, entry.targetKey),
      ambiguityIntent: entry.state === "episode" ? "pivot-harmony" : "none",
      meterContext,
      sequencePattern: entry.sequencePattern,
      fragmentTransform: entry.fragmentTransform,
    }),
  ];

  const harmonicPlan = sectionPlans[0]!;

  addSubjectEntry(notes, subjectEntries, subject, { ...entry, harmonicPlan, writingProfile });
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.voice,
    startTick: entry.startTick,
    durationTicks: entry.supportDurationTicks,
    localKey: entry.localKey,
    harmonicPlan,
    counterSubjectSupportRepair,
    freeCounterpointPhraseVariation: entry.freeCounterpointPhraseVariation,
    writingProfile,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + entry.supportDurationTicks,
    durationTicks: Math.max(0, entry.sectionDurationTicks - entry.supportDurationTicks),
    localKey: entry.targetKey,
    harmonicPlan,
    maxVoiceCount: entry.continuityVoiceCount,
    voiceOrder: entry.continuityVoiceOrder,
    lineKind: entry.continuityLineKind,
    freeCounterpointPhraseVariation: entry.freeCounterpointPhraseVariation,
    writingProfile,
  });
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: entry.sectionDurationTicks,
  };
}

export function buildStrettoSection(
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    firstVoice: Voice;
    secondVoice: Voice;
    startTick: number;
    globalKey: KeySignature;
    sectionDurationTicks: number;
    styleProfile: StyleProfile;
    cadenceKind?: CadenceKind;
  },
  counterSubjectSupportRepair = false,
  meterContext: MeterContext = createLegacyMeterContext(),
  writingProfile: WritingProfile = resolveWritingProfile(undefined),
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const sectionPlans = [
    buildHarmonicPlan({
      state: entry.state,
      startTick: entry.startTick,
      durationTicks: entry.sectionDurationTicks,
      globalKey: entry.globalKey,
      localKey: entry.globalKey,
      targetKey: transposeKey(entry.globalKey, 7),
      styleProfile: entry.styleProfile,
      cadenceKind: entry.cadenceKind ?? "evaded",
      ambiguityIntent: "evaded-cadence",
      meterContext,
    }),
  ];

  const harmonicPlan = sectionPlans[0]!;

  addSubjectEntry(notes, subjectEntries, subject, {
    state: entry.state,
    voice: entry.firstVoice,
    form: "subject",
    startTick: entry.startTick,
    globalKey: entry.globalKey,
    localKey: entry.globalKey,
    harmonicPlan,
    writingProfile,
  });
  addSubjectEntry(notes, subjectEntries, subject, {
    state: entry.state,
    voice: entry.secondVoice,
    form: "answer",
    startTick: entry.startTick + STRETTO_ENTRY_SPACING_TICKS,
    globalKey: entry.globalKey,
    localKey: transposeKey(entry.globalKey, 7),
    answerKind: chooseAnswerKind(subject),
    harmonicPlan,
    writingProfile,
  });
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.firstVoice,
    startTick: entry.startTick,
    durationTicks: subjectDuration(subject),
    localKey: entry.globalKey,
    harmonicPlan,
    counterSubjectSupportRepair,
    writingProfile,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + subjectDuration(subject),
    durationTicks: Math.max(0, entry.sectionDurationTicks - subjectDuration(subject)),
    localKey: transposeKey(entry.globalKey, 7),
    harmonicPlan,
    writingProfile,
  });
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: entry.sectionDurationTicks,
  };
}
