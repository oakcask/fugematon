import { DEFAULT_GENERATION_PARAMETERS, GENERATOR_VERSION, TICKS_PER_QUARTER, VOICE_RANGES } from "./constants.js";
import type {
  AmbiguityIntent,
  AnswerKind,
  CadenceKind,
  CandidateEvaluation,
  DiagnosticIssue,
  DurationDistribution,
  EntryForm,
  FragmentTransform,
  FugueState,
  GenerationInput,
  GenerationOutput,
  GenerationParameters,
  HarmonicAnchor,
  HarmonicPlan,
  KeyMode,
  KeySignature,
  NoteEvent,
  PlannedEntry,
  ScoreEvent,
  SequencePattern,
  StyleProfile,
  TimeSignature,
  Voice,
} from "./events.js";
import { Xoshiro128StarStar } from "./prng.js";

const TONICS = ["C", "D", "E", "F", "G", "A", "B", "Bb", "Eb", "Ab", "Db", "F#"] as const;
const TONIC_PITCH_CLASSES = new Map<string, number>([
  ["C", 0],
  ["D", 2],
  ["E", 4],
  ["F", 5],
  ["G", 7],
  ["A", 9],
  ["B", 11],
  ["Bb", 10],
  ["Eb", 3],
  ["Ab", 8],
  ["Db", 1],
  ["F#", 6],
]);
const PITCH_CLASS_TONICS = new Map<number, KeySignature["tonic"]>(
  [...TONIC_PITCH_CLASSES.entries()].map(([tonic, pitchClass]) => [pitchClass, tonic]),
);
const MODE_SCALE_INTERVALS: Record<KeyMode, readonly number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
};
const MODAL_MODES = new Set<KeyMode>(["dorian", "mixolydian", "aeolian"]);
const SUBJECT_DURATIONS = [
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER / 2,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
  TICKS_PER_QUARTER,
] as const;
const SUBJECT_DEGREES = [0, 1, 2, 3, 4, 3, 2, 1] as const;
const VOICE_ENTRY_ORDER: Voice[] = ["alto", "soprano", "tenor", "bass"];
const VOICE_REGISTER_TARGETS: Record<Voice, number> = {
  soprano: 76,
  alto: 67,
  tenor: 52,
  bass: 40,
};
const VOICE_PREFERRED_MAX: Record<Voice, number> = {
  soprano: 81,
  alto: 70,
  tenor: 59,
  bass: 47,
};
const ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 4;
const STRETTO_ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 2;
const CONTINUATION_STATE_PATTERNS: readonly (readonly FugueState[])[] = [
  ["episode", "subject-return", "episode", "stretto-like"],
  ["episode", "subject-return", "stretto-like", "episode", "subject-return"],
  ["subject-return", "episode", "episode", "stretto-like", "subject-return"],
  ["episode", "stretto-like", "episode", "subject-return"],
];
const COUNTER_SUBJECT_DEGREES = [4, 2, 3, 1, 2, 0, 1, 0] as const;
const FREE_COUNTERPOINT_DEGREES = [0, 1, 2, 1, 3, 2, 1, 0] as const;
const MODAL_COUNTER_SUBJECT_DEGREES = [4, 5, 4, 3, 2, 1, 2, 0] as const;
const MODAL_FREE_COUNTERPOINT_DEGREES = [0, 1, 2, 3, 5, 4, 3, 2] as const;

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const rng = Xoshiro128StarStar.fromSeed(input.seed);
  const parameters = normalizeParameters(input.parameters);
  const keySignature = chooseKeySignature(rng, input.seed);
  const timeSignature = chooseTimeSignature(rng);
  const bpm = chooseTempo(rng);
  const subject = buildSubject(rng, keySignature);
  const score = buildFugueScore(subject, keySignature, input.lengthTicks, rng);
  const diagnostics = analyzeScore(score.notes, score.subjectEntries, score.sectionPlans);
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
      type: "parameter-change",
      tick: 0,
      payload: { parameters },
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

  return {
    events,
    diagnostics: {
      generatorVersion: GENERATOR_VERSION,
      seed: input.seed,
      lengthTicks: input.lengthTicks,
      generatedUntilTick,
      eventCount: events.length,
      noteCount: score.notes.length,
      candidateEvaluations: score.candidateEvaluations,
      selectedCandidateEvaluations: score.selectedCandidateEvaluations,
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
      durationDistribution: diagnostics.durationDistribution,
      repeatedPitchRunCount: diagnostics.repeatedPitchRunCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
      ornamentCandidateCount: diagnostics.ornamentCandidateCount,
      ornamentDensity: diagnostics.ornamentDensity,
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

export function normalizeParameters(parameters: Partial<GenerationParameters> | undefined): GenerationParameters {
  const merged = {
    ...DEFAULT_GENERATION_PARAMETERS,
    ...parameters,
  };

  for (const [name, value] of Object.entries(merged)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`${name} must be a finite number between 0 and 1`);
    }
  }

  return merged;
}

function chooseKeySignature(rng: Xoshiro128StarStar, seed: string): KeySignature {
  const requestedMode = modalModeFromSeed(seed);
  const mode: KeyMode =
    requestedMode ??
    rng.chooseWeighted([
      { value: "major", weight: 55 },
      { value: "minor", weight: 45 },
      { value: "dorian", weight: 4 },
      { value: "mixolydian", weight: 3 },
      { value: "aeolian", weight: 3 },
    ]);

  return {
    tonic: TONICS[rng.nextInt(TONICS.length)]!,
    mode,
  };
}

function modalModeFromSeed(seed: string): KeyMode | undefined {
  const normalizedSeed = seed.toLowerCase();
  if (normalizedSeed.includes("dorian")) {
    return "dorian";
  }
  if (normalizedSeed.includes("mixolydian")) {
    return "mixolydian";
  }
  if (normalizedSeed.includes("aeolian") || normalizedSeed.includes("modal")) {
    return "aeolian";
  }
  return undefined;
}

function chooseTimeSignature(rng: Xoshiro128StarStar): TimeSignature {
  return rng.chooseWeighted<TimeSignature>([
    { value: { numerator: 4, denominator: 4 }, weight: 80 },
    { value: { numerator: 3, denominator: 4 }, weight: 15 },
    { value: { numerator: 6, denominator: 8 }, weight: 5 },
  ]);
}

function chooseTempo(rng: Xoshiro128StarStar): number {
  return rng.nextIntRange(66, 108);
}

type SubjectNote = {
  offsetTick: number;
  durationTicks: number;
  scaleDegree: number;
  accidental: number;
  importantTone: boolean;
  melodicRole: "tonic" | "passing" | "predominant" | "dominant";
};

type Exposition = {
  notes: NoteEvent[];
  subjectEntries: GenerationOutput["diagnostics"]["subjectEntries"];
  sectionPlans: HarmonicPlan[];
  endTick: number;
  durationTicks: number;
};

type FugueScore = Exposition & {
  candidateEvaluations: number;
  selectedCandidateEvaluations: CandidateEvaluation[];
  stateTransitions: FugueState[];
  stateChanges: {
    tick: number;
    state: FugueState;
  }[];
};

type HarmonicDiagnostics = {
  unresolvedDissonanceCount: number;
  strongBeatDissonanceCount: number;
  cadenceTargetMisses: number;
  cadenceTargetHits: number;
  leadingToneResolutionMisses: number;
  dominantResolutionMisses: number;
  predominantDirectionMisses: number;
  harmonicFunctionMismatches: number;
  harmonicFunctionMatches: number;
  controlledAmbiguityScore: number;
  unresolvedAmbiguityWarnings: number;
  ambiguityRecoveries: number;
  styleModulationFit: number;
  parallelKeyShiftCount: number;
  formRepetitionWarnings: number;
  episodeDirectionScore: number;
  strettoClarityScore: number;
  modalContextCount: number;
  modalCharacteristicToneHits: number;
  modalCadenceHits: number;
  tonalCadenceOveruseWarnings: number;
};

type TextureDiagnostics = {
  counterSubjectIdentityRetention: number;
  counterSubjectInvertibilityScore: number;
  freeCounterpointContourScore: number;
  rhythmicIndependenceScore: number;
  supportTextureRepetitionScore: number;
  expositionEntryStaggerScore: number;
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
  durationDistribution: DurationDistribution;
  repeatedPitchRunCount: number;
  allVoiceSilenceGapCount: number;
  ornamentCandidateCount: number;
  ornamentDensity: number;
};

function buildSubject(rng: Xoshiro128StarStar, keySignature: KeySignature): SubjectNote[] {
  const shape = rng.chooseWeighted<readonly number[]>([
    { value: SUBJECT_DEGREES, weight: 3 },
    { value: [0, 1, 2, 3, 4, 3, 2, 1] as const, weight: keySignature.mode === "minor" ? 3 : 1 },
    { value: [0, 2, 1, 3, 4, 3, 2, 1] as const, weight: 2 },
  ]);

  let offsetTick = 0;
  return shape.map((scaleDegree, index) => {
    const note = {
      offsetTick,
      durationTicks: SUBJECT_DURATIONS[index]!,
      scaleDegree,
      accidental: 0,
      importantTone: scaleDegree === 0 || scaleDegree === 4 || index === shape.length - 1,
      melodicRole: melodicRoleForScaleDegree(scaleDegree),
    };
    offsetTick += note.durationTicks;
    return note;
  });
}

function buildFugueScore(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  lengthTicks: number,
  rng: Xoshiro128StarStar,
): FugueScore {
  const exposition = buildExposition(subject, keySignature);
  const notes = [...exposition.notes];
  const subjectEntries = [...exposition.subjectEntries];
  const sectionPlans = [...exposition.sectionPlans];
  const stateTransitions: FugueState[] = ["exposition"];
  const stateChanges: FugueScore["stateChanges"] = [];
  const selectedCandidateEvaluations: CandidateEvaluation[] = [];
  let candidateEvaluations = 0;
  let sectionStartTick = exposition.endTick;
  let stateIndex = 0;
  const continuationPattern = chooseContinuationStatePattern(rng);

  while (sectionStartTick < lengthTicks) {
    const state = continuationPattern[stateIndex % continuationPattern.length]!;
    const sectionDurationTicks = chooseContinuationSectionTicks(state, rng);
    stateTransitions.push(state);
    stateChanges.push({ tick: sectionStartTick, state });
    const selection = chooseContinuationSection(
      subject,
      keySignature,
      state,
      sectionStartTick,
      sectionDurationTicks,
      rng,
      notes,
    );
    notes.push(...selection.section.notes);
    subjectEntries.push(...selection.section.subjectEntries);
    sectionPlans.push(...selection.section.sectionPlans);
    candidateEvaluations += selection.candidateCount;
    selectedCandidateEvaluations.push(selection.evaluation);
    sectionStartTick += selection.section.durationTicks;
    stateIndex += 1;
  }

  fillAllVoiceSilenceGaps(notes, keySignature);
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    candidateEvaluations,
    selectedCandidateEvaluations,
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function chooseContinuationStatePattern(rng: Xoshiro128StarStar): readonly FugueState[] {
  return CONTINUATION_STATE_PATTERNS[rng.nextInt(CONTINUATION_STATE_PATTERNS.length)]!;
}

function chooseContinuationSectionTicks(state: FugueState, rng: Xoshiro128StarStar): number {
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

function chooseStyleProfile(rng: Xoshiro128StarStar): StyleProfile {
  return rng.chooseWeighted<StyleProfile>([
    { value: "strict-classical", weight: 3 },
    { value: "hybrid", weight: 5 },
    { value: "popular-tolerant", weight: 2 },
  ]);
}

function chooseSequencePattern(rng: Xoshiro128StarStar): SequencePattern {
  return rng.chooseWeighted<SequencePattern>([
    { value: "ascending-step", weight: 3 },
    { value: "descending-step", weight: 3 },
    { value: "circle-fifths", weight: 2 },
    { value: "parallel-shift", weight: 1 },
  ]);
}

function chooseFragmentTransform(rng: Xoshiro128StarStar): FragmentTransform {
  return rng.chooseWeighted<FragmentTransform>([
    { value: "sequence", weight: 4 },
    { value: "contrary-motion", weight: 3 },
    { value: "inversion", weight: 2 },
  ]);
}

function buildHarmonicPlan(plan: {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  globalKey: KeySignature;
  localKey: KeySignature;
  targetKey: KeySignature;
  styleProfile: StyleProfile;
  cadenceKind: CadenceKind;
  ambiguityIntent: AmbiguityIntent;
  sequencePattern?: SequencePattern;
  fragmentTransform?: FragmentTransform;
}): HarmonicPlan {
  const cadenceTick = plan.startTick + Math.max(TICKS_PER_QUARTER, plan.durationTicks - TICKS_PER_QUARTER);
  const predominantTick = plan.startTick + Math.max(TICKS_PER_QUARTER, Math.floor(plan.durationTicks / 3));
  const dominantTick = plan.startTick + Math.max(TICKS_PER_QUARTER * 2, Math.floor((plan.durationTicks * 2) / 3));
  const anchors: HarmonicAnchor[] = [
    {
      tick: plan.startTick,
      localKey: plan.localKey,
      function: "tonic",
      cadenceTarget: false,
    },
    {
      tick: predominantTick,
      localKey: plan.state === "episode" ? plan.targetKey : plan.localKey,
      function: "predominant",
      cadenceTarget: false,
    },
    {
      tick: dominantTick,
      localKey: plan.targetKey,
      function: "dominant",
      cadenceTarget: false,
    },
    {
      tick: cadenceTick,
      localKey: plan.targetKey,
      function: plan.cadenceKind === "half" ? "dominant" : "cadential-tonic",
      cadenceTarget: true,
    },
  ];

  return {
    state: plan.state,
    startTick: plan.startTick,
    durationTicks: plan.durationTicks,
    localKey: plan.localKey,
    departureKey: plan.globalKey,
    targetKey: plan.targetKey,
    styleProfile: plan.styleProfile,
    cadenceKind: plan.cadenceKind,
    ambiguityIntent: plan.ambiguityIntent,
    ambiguityRecoveryTick: plan.ambiguityIntent === "none" ? undefined : cadenceTick,
    parallelKeyShift: plan.localKey.tonic === plan.targetKey.tonic && plan.localKey.mode !== plan.targetKey.mode,
    sequencePattern: plan.sequencePattern,
    fragmentTransform: plan.fragmentTransform,
    anchors,
  };
}

function buildExposition(subject: readonly SubjectNote[], keySignature: KeySignature): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const sectionPlans: HarmonicPlan[] = [
    buildHarmonicPlan({
      state: "exposition",
      startTick: 0,
      durationTicks: ENTRY_SPACING_TICKS * VOICE_ENTRY_ORDER.length,
      globalKey: keySignature,
      localKey: keySignature,
      targetKey: transposeKey(keySignature, 7),
      styleProfile: "strict-classical",
      cadenceKind: "half",
      ambiguityIntent: "none",
    }),
  ];

  for (const [entryIndex, voice] of VOICE_ENTRY_ORDER.entries()) {
    const form = entryIndex % 2 === 0 ? "subject" : "answer";
    const startTick = entryIndex * ENTRY_SPACING_TICKS;
    addSubjectEntry(notes, subjectEntries, subject, {
      state: "exposition",
      voice,
      form,
      startTick,
      globalKey: keySignature,
      localKey: form === "answer" ? transposeKey(keySignature, 7) : keySignature,
      answerKind: form === "answer" ? chooseAnswerKind(subject) : undefined,
    });
    addCounterpointTexture(notes, subject, {
      enteringVoice: voice,
      startTick,
      durationTicks: ENTRY_SPACING_TICKS,
      localKey: form === "answer" ? transposeKey(keySignature, 7) : keySignature,
      eligibleVoices: VOICE_ENTRY_ORDER.slice(0, entryIndex),
    });
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: ENTRY_SPACING_TICKS * VOICE_ENTRY_ORDER.length,
  };
}

function chooseContinuationSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  rng: Xoshiro128StarStar,
  previousNotes: readonly NoteEvent[],
): { section: Exposition; candidateCount: number; evaluation: CandidateEvaluation } {
  const candidates = buildContinuationCandidates(subject, keySignature, state, startTick, sectionDurationTicks, rng);
  let best = candidates[0]!;
  let bestEvaluation = evaluateCandidate(previousNotes, best);

  for (const candidate of candidates.slice(1)) {
    const evaluation = evaluateCandidate(previousNotes, candidate);
    if (evaluation.totalCost < bestEvaluation.totalCost) {
      best = candidate;
      bestEvaluation = evaluation;
    }
  }

  return { section: best, candidateCount: candidates.length, evaluation: bestEvaluation };
}

function buildContinuationCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  rng: Xoshiro128StarStar,
): Exposition[] {
  const notes: Exposition["notes"] = [];
  const candidates: Exposition[] = [];

  if (state === "episode") {
    for (const voice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const pitchClassOffset of rng.shuffle([0, 5, 7] as const)) {
        candidates.push(
          buildContinuationSection(subject.slice(0, 4), {
            state,
            voice,
            form: "subject-fragment",
            startTick,
            globalKey: keySignature,
            localKey: transposeKey(keySignature, pitchClassOffset),
            targetKey: transposeKey(keySignature, pitchClassOffset === 0 ? 7 : pitchClassOffset),
            supportDurationTicks: Math.min(sectionDurationTicks, subjectDuration(subject.slice(0, 4))),
            sectionDurationTicks,
            styleProfile: chooseStyleProfile(rng),
            sequencePattern: chooseSequencePattern(rng),
            fragmentTransform: chooseFragmentTransform(rng),
          }),
        );
      }
    }
  } else if (state === "subject-return") {
    for (const voice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const pitchClassOffset of rng.shuffle([0, 5, 7, 9] as const)) {
        candidates.push(
          buildContinuationSection(subject, {
            state,
            voice,
            form: "subject",
            startTick,
            globalKey: keySignature,
            localKey: transposeKey(keySignature, pitchClassOffset),
            targetKey: transposeKey(keySignature, pitchClassOffset),
            supportDurationTicks: subjectDuration(subject),
            sectionDurationTicks,
            styleProfile: chooseStyleProfile(rng),
          }),
        );
      }
    }
  } else {
    for (const firstVoice of rng.shuffle(VOICE_ENTRY_ORDER)) {
      for (const secondVoice of rng.shuffle(VOICE_ENTRY_ORDER.filter((voice) => voice !== firstVoice))) {
        candidates.push(
          buildStrettoSection(subject.slice(0, 6), {
            state,
            firstVoice,
            secondVoice,
            startTick,
            globalKey: keySignature,
            sectionDurationTicks,
            styleProfile: chooseStyleProfile(rng),
          }),
        );
      }
    }
  }

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

function buildContinuationSection(
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
  },
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
      cadenceKind: cadenceKindForSection(entry.state, entry.targetKey),
      ambiguityIntent: entry.state === "episode" ? "pivot-harmony" : "none",
      sequencePattern: entry.sequencePattern,
      fragmentTransform: entry.fragmentTransform,
    }),
  ];

  addSubjectEntry(notes, subjectEntries, subject, entry);
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.voice,
    startTick: entry.startTick,
    durationTicks: entry.supportDurationTicks,
    localKey: entry.localKey,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + entry.supportDurationTicks,
    durationTicks: Math.max(0, entry.sectionDurationTicks - entry.supportDurationTicks),
    localKey: entry.targetKey,
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

function buildStrettoSection(
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    firstVoice: Voice;
    secondVoice: Voice;
    startTick: number;
    globalKey: KeySignature;
    sectionDurationTicks: number;
    styleProfile: StyleProfile;
  },
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
      cadenceKind: "evaded",
      ambiguityIntent: "evaded-cadence",
    }),
  ];

  addSubjectEntry(notes, subjectEntries, subject, {
    state: entry.state,
    voice: entry.firstVoice,
    form: "subject",
    startTick: entry.startTick,
    globalKey: entry.globalKey,
    localKey: entry.globalKey,
  });
  addSubjectEntry(notes, subjectEntries, subject, {
    state: entry.state,
    voice: entry.secondVoice,
    form: "answer",
    startTick: entry.startTick + STRETTO_ENTRY_SPACING_TICKS,
    globalKey: entry.globalKey,
    localKey: transposeKey(entry.globalKey, 7),
    answerKind: chooseAnswerKind(subject),
  });
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.firstVoice,
    startTick: entry.startTick,
    durationTicks: subjectDuration(subject),
    localKey: entry.globalKey,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + subjectDuration(subject),
    durationTicks: Math.max(0, entry.sectionDurationTicks - subjectDuration(subject)),
    localKey: transposeKey(entry.globalKey, 7),
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

function cadenceKindForSection(state: FugueState, targetKey: KeySignature): CadenceKind {
  if (isModalMode(targetKey.mode)) {
    return "modal";
  }
  return state === "episode" ? "modulatory" : "authentic";
}

function evaluateCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const diagnostics = analyzeScore(
    [...recentNotes, ...candidate.notes],
    candidate.subjectEntries,
    candidate.sectionPlans,
  );

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
    cost: diagnostics.parallelPerfects * 10,
    reward:
      diagnostics.counterSubjectCoverage * 20 +
      diagnostics.freeCounterpointCoverage * 10 +
      diagnostics.counterSubjectInvertibilityScore * 8,
    features: {
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      parallelPerfects: diagnostics.parallelPerfects,
    },
  };
  const melody = {
    cost: diagnostics.leapRecoveryMisses * 35 + diagnostics.melodicStagnationWarnings * 25,
    reward: diagnostics.freeCounterpointContourScore * 12 + diagnostics.ornamentDensity * 6,
    features: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * 4 +
      diagnostics.unisonOverlapCount * 8 +
      diagnostics.sameDirectionMotionCount * 3 +
      diagnostics.sharedRhythmOverlapCount * 2 +
      diagnostics.allVoiceSilenceGapCount * 25,
    reward:
      diagnostics.rhythmicIndependenceScore * 12 +
      diagnostics.supportTextureRepetitionScore * 8 +
      diagnostics.expositionEntryStaggerScore * 10,
    features: {
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
    },
  };
  const subjectClarity = {
    cost: diagnostics.subjectIdentityViolations * 10_000 + diagnostics.answerPlanViolations * 1_000,
    reward: diagnostics.counterSubjectIdentityRetention * 10,
    features: {
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
    },
  };
  const harmony = {
    cost:
      diagnostics.unresolvedDissonanceCount * 100 +
      diagnostics.strongBeatDissonanceCount * 50 +
      diagnostics.predominantDirectionMisses * 30 +
      diagnostics.unresolvedAmbiguityWarnings * 30,
    reward:
      diagnostics.controlledAmbiguityScore * 10 +
      diagnostics.styleModulationFit * 8 +
      diagnostics.harmonicFunctionMatches,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      styleModulationFit: diagnostics.styleModulationFit,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
    },
  };
  const form = {
    cost: diagnostics.formRepetitionWarnings * 50,
    reward: diagnostics.episodeDirectionScore * 10 + diagnostics.strettoClarityScore * 10,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
    },
  };
  const totalCost =
    hardFailures.length * 10_000 +
    counterpoint.cost -
    counterpoint.reward +
    melody.cost -
    melody.reward +
    texture.cost -
    texture.reward +
    subjectClarity.cost -
    subjectClarity.reward +
    harmony.cost -
    harmony.reward +
    form.cost -
    form.reward;

  return {
    totalCost: Math.round(totalCost * 1000) / 1000,
    hardFailures,
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

function addSubjectEntry(
  notes: NoteEvent[],
  subjectEntries: Exposition["subjectEntries"],
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    voice: Voice;
    form: EntryForm;
    startTick: number;
    globalKey: KeySignature;
    localKey: KeySignature;
    answerKind?: AnswerKind;
  },
): void {
  const plannedSubject = applyEntryPlanToSubject(subject, entry.form, entry.answerKind);
  const plannedEntry: PlannedEntry = {
    voice: entry.voice,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    globalKey: entry.globalKey,
    localKey: entry.localKey,
    answerKind: entry.answerKind,
    registerTarget: VOICE_REGISTER_TARGETS[entry.voice],
    expectedDegreePattern: plannedSubject.map((note) => note.scaleDegree),
    actualPitchClassSequence: plannedSubject.map((note) => pitchClassForSubjectNote(note, entry.localKey)),
  };
  subjectEntries.push(plannedEntry);

  for (const note of plannedSubject) {
    const pitchClass = pitchClassForSubjectNote(note, entry.localKey);
    notes.push({
      kind: "note",
      voice: entry.voice,
      startTick: entry.startTick + note.offsetTick,
      durationTicks: note.durationTicks,
      pitch: placePitchInRegister(pitchClass, entry.voice, plannedEntry.registerTarget),
      velocity: entry.form === "answer" ? 86 : 92,
      role: entry.form,
    });
  }
}

function applyEntryPlanToSubject(
  subject: readonly SubjectNote[],
  form: EntryForm,
  answerKind: AnswerKind | undefined,
): SubjectNote[] {
  if (form !== "answer" || answerKind !== "tonal") {
    return subject.map((note) => ({ ...note }));
  }

  return subject.map((note) =>
    note.importantTone && note.scaleDegree === 4
      ? { ...note, scaleDegree: 3, melodicRole: "predominant" }
      : { ...note },
  );
}

function chooseAnswerKind(subject: readonly SubjectNote[]): AnswerKind {
  return subject.some((note) => note.importantTone && note.scaleDegree === 4) ? "tonal" : "true";
}

function pitchClassForSubjectNote(note: SubjectNote, keySignature: KeySignature): number {
  return scaleDegreePitchClass(note.scaleDegree, note.accidental, keySignature);
}

function scaleDegreePitchClass(scaleDegree: number, accidental: number, keySignature: KeySignature): number {
  const intervals = MODE_SCALE_INTERVALS[keySignature.mode];
  const octave = Math.floor(scaleDegree / intervals.length);
  const scaleIndex = positiveModulo(scaleDegree, intervals.length);
  return positiveModulo(tonicPitchClass(keySignature) + intervals[scaleIndex]! + octave * 12 + accidental, 12);
}

function tonicPitchClass(keySignature: KeySignature): number {
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }
  return tonic;
}

function transposeKey(keySignature: KeySignature, semitones: number): KeySignature {
  const tonic = PITCH_CLASS_TONICS.get(positiveModulo(tonicPitchClass(keySignature) + semitones, 12));
  if (tonic === undefined) {
    throw new Error(`unsupported transposed key from ${keySignature.tonic}`);
  }
  return {
    tonic,
    mode: keySignature.mode,
  };
}

function isModalMode(mode: KeyMode): boolean {
  return MODAL_MODES.has(mode);
}

function characteristicScaleDegree(mode: KeyMode): number | undefined {
  if (mode === "dorian") {
    return 5;
  }
  if (mode === "mixolydian") {
    return 6;
  }
  if (mode === "aeolian") {
    return 5;
  }
  return undefined;
}

function melodicRoleForScaleDegree(scaleDegree: number): SubjectNote["melodicRole"] {
  const normalized = positiveModulo(scaleDegree, 7);
  if (normalized === 0) {
    return "tonic";
  }
  if (normalized === 3) {
    return "predominant";
  }
  if (normalized === 4) {
    return "dominant";
  }
  return "passing";
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function addCounterpointTexture(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  entry: {
    enteringVoice: Voice;
    startTick: number;
    durationTicks: number;
    localKey: KeySignature;
    eligibleVoices?: readonly Voice[];
  },
): void {
  const eligibleVoices = entry.eligibleVoices ?? VOICE_ENTRY_ORDER.filter((voice) => voice !== entry.enteringVoice);
  const counterSubjectVoice = chooseTextureVoice(
    notes,
    entry.enteringVoice,
    entry.startTick,
    entry.durationTicks,
    eligibleVoices,
  );
  if (counterSubjectVoice !== undefined) {
    addPatternCounterpoint(notes, subject, {
      voice: counterSubjectVoice,
      startTick: entry.startTick,
      maxDurationTicks: entry.durationTicks,
      localKey: entry.localKey,
      degrees: counterSubjectDegreesForMode(entry.localKey.mode),
      velocity: 70,
      role: "counter-subject",
    });
  }

  for (const voice of eligibleVoices) {
    if (voice === entry.enteringVoice || voice === counterSubjectVoice) {
      continue;
    }

    addPatternCounterpoint(notes, subject, {
      voice,
      startTick: entry.startTick,
      maxDurationTicks: entry.durationTicks,
      localKey: entry.localKey,
      degrees: freeCounterpointDegreesForMode(entry.localKey.mode),
      velocity: 62,
      role: "free-counterpoint",
    });
  }
}

function chooseTextureVoice(
  notes: readonly NoteEvent[],
  enteringVoice: Voice,
  startTick: number,
  durationTicks: number,
  eligibleVoices: readonly Voice[],
): Voice | undefined {
  const startIndex = VOICE_ENTRY_ORDER.indexOf(enteringVoice);
  const candidates = [...VOICE_ENTRY_ORDER.slice(startIndex + 1), ...VOICE_ENTRY_ORDER.slice(0, startIndex)].filter(
    (voice) => voice !== enteringVoice && eligibleVoices.includes(voice),
  );

  return candidates.find((voice) => !hasOverlap(notes, voice, startTick, durationTicks));
}

function addPatternCounterpoint(
  notes: Exposition["notes"],
  subject: readonly SubjectNote[],
  pattern: {
    voice: Voice;
    startTick: number;
    maxDurationTicks: number;
    localKey: KeySignature;
    degrees: readonly number[];
    velocity: number;
    role: NoteEvent["role"];
  },
): void {
  let elapsedTicks = 0;
  for (let index = 0; index < subject.length && elapsedTicks < pattern.maxDurationTicks; index += 1) {
    const subjectNote = subject[index]!;
    const durationTicks = Math.min(subjectNote.durationTicks, pattern.maxDurationTicks - elapsedTicks);
    const startTick = pattern.startTick + elapsedTicks;
    if (hasOverlap(notes, pattern.voice, startTick, durationTicks)) {
      elapsedTicks += subjectNote.durationTicks;
      continue;
    }

    const degree = pattern.degrees[index % pattern.degrees.length]!;
    if (pattern.role === "free-counterpoint" && durationTicks >= TICKS_PER_QUARTER) {
      const firstDurationTicks = Math.floor(durationTicks / 2);
      addTextureNote(notes, pattern, degree, startTick, firstDurationTicks);
      addTextureNote(
        notes,
        pattern,
        pattern.degrees[(index + 1) % pattern.degrees.length]!,
        startTick + firstDurationTicks,
        durationTicks - firstDurationTicks,
      );
    } else {
      addTextureNote(notes, pattern, degree, startTick, durationTicks);
    }
    elapsedTicks += subjectNote.durationTicks;
  }
}

function addTextureNote(
  notes: Exposition["notes"],
  pattern: {
    voice: Voice;
    localKey: KeySignature;
    velocity: number;
    role: NoteEvent["role"];
  },
  degree: number,
  startTick: number,
  durationTicks: number,
): void {
  const previous = notes
    .filter((note) => note.voice === pattern.voice && note.startTick <= startTick)
    .sort(compareNoteEvents)
    .at(-1);
  let pitchClass = scaleDegreePitchClass(degree, 0, pattern.localKey);
  let pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  if (previous?.pitch === pitch && pattern.role === "free-counterpoint") {
    pitchClass = scaleDegreePitchClass(degree + 1, 0, pattern.localKey);
    pitch = placePitchInRegister(pitchClass, pattern.voice, VOICE_REGISTER_TARGETS[pattern.voice]);
  }
  if (previous !== undefined && pattern.role === "free-counterpoint") {
    pitch = fitPitchNearPrevious(pitchClass, pattern.voice, previous.pitch);
  }
  notes.push({
    kind: "note",
    voice: pattern.voice,
    startTick,
    durationTicks,
    pitch,
    velocity: pattern.velocity,
    role: pattern.role,
  });
}

function fitPitchNearPrevious(pitchClass: number, voice: Voice, previousPitch: number): number {
  const range = VOICE_RANGES[voice];
  const preferredMin = Math.max(range.min, VOICE_REGISTER_TARGETS[voice] - 6);
  let pitch = placePitchInRegister(pitchClass, voice, VOICE_REGISTER_TARGETS[voice]);
  while (pitch - previousPitch > 5 && pitch - 12 >= preferredMin) {
    pitch -= 12;
  }
  while (previousPitch - pitch > 5 && pitch + 12 <= range.max) {
    pitch += 12;
  }
  return pitch;
}

function addContinuityCounterpoint(
  notes: Exposition["notes"],
  plan: {
    startTick: number;
    durationTicks: number;
    localKey: KeySignature;
  },
): void {
  if (plan.durationTicks <= 0) {
    return;
  }

  const voice = VOICE_ENTRY_ORDER.find(
    (candidate) => !hasOverlap(notes, candidate, plan.startTick, plan.durationTicks),
  );
  if (voice === undefined) {
    return;
  }

  const degrees = freeCounterpointDegreesForMode(plan.localKey.mode);
  const fillerSubject = degrees.map((scaleDegree, index) => ({
    offsetTick: index * (TICKS_PER_QUARTER / 2),
    durationTicks: TICKS_PER_QUARTER / 2,
    scaleDegree,
    accidental: 0,
    importantTone: false,
    melodicRole: melodicRoleForScaleDegree(scaleDegree),
  }));
  addPatternCounterpoint(notes, fillerSubject, {
    voice,
    startTick: plan.startTick,
    maxDurationTicks: plan.durationTicks,
    localKey: plan.localKey,
    degrees,
    velocity: 58,
    role: "free-counterpoint",
  });
}

function fillAllVoiceSilenceGaps(notes: Exposition["notes"], keySignature: KeySignature): void {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const hasActiveNote = notes.some(
      (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    );
    if (hasActiveNote) {
      continue;
    }
    addTextureNote(
      notes,
      {
        voice: VOICE_ENTRY_ORDER[index % VOICE_ENTRY_ORDER.length]!,
        localKey: keySignature,
        velocity: 54,
        role: "free-counterpoint",
      },
      freeCounterpointDegreesForMode(keySignature.mode)[index % FREE_COUNTERPOINT_DEGREES.length]!,
      startTick,
      endTick - startTick,
    );
  }
}

function counterSubjectDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_COUNTER_SUBJECT_DEGREES : COUNTER_SUBJECT_DEGREES;
}

function freeCounterpointDegreesForMode(mode: KeyMode): readonly number[] {
  return isModalMode(mode) ? MODAL_FREE_COUNTERPOINT_DEGREES : FREE_COUNTERPOINT_DEGREES;
}

function subjectDuration(subject: readonly SubjectNote[]): number {
  return subject.reduce((duration, note) => duration + note.durationTicks, 0);
}

function hasOverlap(notes: readonly NoteEvent[], voice: Voice, startTick: number, durationTicks: number): boolean {
  const endTick = startTick + durationTicks;
  return notes.some(
    (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
}

function placePitchInRegister(pitchClass: number, voice: Voice, registerTarget: number): number {
  let pitch = positiveModulo(pitchClass, 12);
  while (pitch < registerTarget - 6) {
    pitch += 12;
  }
  while (pitch > registerTarget + 6) {
    pitch -= 12;
  }

  const range = VOICE_RANGES[voice];
  let fitted = pitch;
  while (fitted < range.min) {
    fitted += 12;
  }
  while (fitted > range.max) {
    fitted -= 12;
  }
  while (fitted > VOICE_PREFERRED_MAX[voice] && fitted - 12 >= range.min) {
    fitted -= 12;
  }
  return fitted;
}

function analyzeScore(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): {
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  keyMetadataMismatches: number;
  counterSubjectCoverage: number;
  freeCounterpointCoverage: number;
  counterSubjectIdentityRetention: number;
  counterSubjectInvertibilityScore: number;
  freeCounterpointContourScore: number;
  rhythmicIndependenceScore: number;
  supportTextureRepetitionScore: number;
  expositionEntryStaggerScore: number;
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
  durationDistribution: DurationDistribution;
  repeatedPitchRunCount: number;
  allVoiceSilenceGapCount: number;
  ornamentCandidateCount: number;
  ornamentDensity: number;
  fallbackPassageCount: number;
  melodicStagnationWarnings: number;
  leapRecoveryMisses: number;
  unresolvedDissonanceCount: number;
  strongBeatDissonanceCount: number;
  cadenceTargetMisses: number;
  cadenceTargetHits: number;
  leadingToneResolutionMisses: number;
  dominantResolutionMisses: number;
  predominantDirectionMisses: number;
  harmonicFunctionMismatches: number;
  harmonicFunctionMatches: number;
  controlledAmbiguityScore: number;
  unresolvedAmbiguityWarnings: number;
  ambiguityRecoveries: number;
  styleModulationFit: number;
  parallelKeyShiftCount: number;
  formRepetitionWarnings: number;
  episodeDirectionScore: number;
  strettoClarityScore: number;
  modalContextCount: number;
  modalCharacteristicToneHits: number;
  modalCadenceHits: number;
  tonalCadenceOveruseWarnings: number;
  issues: DiagnosticIssue[];
  warnings: string[];
} {
  const issues: DiagnosticIssue[] = [];

  for (const note of notes) {
    const range = VOICE_RANGES[note.voice];
    if (note.pitch < range.min || note.pitch > range.max) {
      issues.push({
        code: "range-violation",
        severity: "warning",
        tick: note.startTick,
        voices: [note.voice],
        pitches: { [note.voice]: note.pitch },
        message: `${note.voice} pitch ${note.pitch} is outside ${range.min}-${range.max}`,
      });
    }
  }

  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let previousVerticality: ActiveVerticality | undefined;

  for (const tick of checkpoints) {
    const active = activePitchesAt(notes, tick);
    issues.push(...findVoiceCrossings(active, tick));
    if (previousVerticality !== undefined) {
      issues.push(...findParallelPerfects(previousVerticality, active, tick));
    }
    previousVerticality = active;
  }
  issues.push(...findEntryPlanIssues(notes, subjectEntries));
  issues.push(...findMelodicStagnationIssues(notes));
  issues.push(...findLeapRecoveryIssues(notes));

  const rangeViolations = countIssues(issues, "range-violation");
  const voiceCrossings = countIssues(issues, "voice-crossing");
  const parallelPerfects = countIssues(issues, "parallel-perfect");
  const subjectIdentityViolations = countIssues(issues, "subject-identity-violation");
  const answerPlanViolations = countIssues(issues, "answer-plan-violation");
  const keyMetadataMismatches = countIssues(issues, "key-metadata-mismatch");
  const counterSubjectCoverage = textureCoverage(notes, "counter-subject");
  const freeCounterpointCoverage = textureCoverage(notes, "free-counterpoint");
  const textureDiagnostics = analyzeTextureDiagnostics(notes, subjectEntries);
  const fallbackPassageCount = notes.filter((note) => note.role === "fallback").length;
  const melodicStagnationWarnings = countIssues(issues, "melodic-stagnation");
  const leapRecoveryMisses = countIssues(issues, "leap-recovery-miss");
  const harmonicDiagnostics = analyzeHarmonicPlans(notes, sectionPlans, subjectEntries);
  const warnings: string[] = [];
  if (rangeViolations > 0) {
    warnings.push("range violations detected");
  }
  if (voiceCrossings > 0) {
    warnings.push("voice crossings detected");
  }
  if (parallelPerfects > 0) {
    warnings.push("parallel perfect intervals suspected");
  }
  if (subjectIdentityViolations > 0) {
    warnings.push("subject identity violations detected");
  }
  if (answerPlanViolations > 0) {
    warnings.push("answer plan violations detected");
  }
  if (keyMetadataMismatches > 0) {
    warnings.push("key metadata mismatches detected");
  }
  if (fallbackPassageCount > 0) {
    warnings.push("fallback counterpoint passages detected");
  }
  if (melodicStagnationWarnings > 0) {
    warnings.push("melodic stagnation warnings detected");
  }
  if (leapRecoveryMisses > 0) {
    warnings.push("leap recovery misses detected");
  }
  if (textureDiagnostics.expositionEntryStaggerScore < 1) {
    warnings.push("exposition entry density warning detected");
  }
  if (textureDiagnostics.rhythmicIndependenceScore < 0.5) {
    warnings.push("texture independence warning detected");
  }
  if (textureDiagnostics.allVoiceSilenceGapCount > 0) {
    warnings.push("all-voice silence gaps detected");
  }
  if (harmonicDiagnostics.formRepetitionWarnings > 0) {
    warnings.push("form repetition warnings detected");
  }
  if (harmonicDiagnostics.tonalCadenceOveruseWarnings > 0) {
    warnings.push("modal review leans too strongly on tonal cadence patterns");
  }

  return {
    rangeViolations,
    voiceCrossings,
    parallelPerfects,
    subjectIdentityViolations,
    answerPlanViolations,
    keyMetadataMismatches,
    counterSubjectCoverage,
    freeCounterpointCoverage,
    ...textureDiagnostics,
    fallbackPassageCount,
    melodicStagnationWarnings,
    leapRecoveryMisses,
    ...harmonicDiagnostics,
    issues,
    warnings,
  };
}

function textureCoverage(notes: readonly NoteEvent[], role: "counter-subject" | "free-counterpoint"): number {
  const entryNotes = notes.filter((note) => isEntryRole(note.role));
  const textureNotes = notes.filter((note) => note.role === role);
  const entryDuration = entryNotes.reduce((sum, note) => sum + note.durationTicks, 0);
  if (entryDuration === 0) {
    return 0;
  }

  const coveredDuration = entryNotes.reduce(
    (sum, entryNote) =>
      sum +
      entryNote.durationTicks *
        Number(
          textureNotes.some(
            (textureNote) =>
              textureNote.voice !== entryNote.voice &&
              textureNote.startTick < entryNote.startTick + entryNote.durationTicks &&
              entryNote.startTick < textureNote.startTick + textureNote.durationTicks,
          ),
        ),
    0,
  );
  return roundRatio(coveredDuration / entryDuration);
}

function analyzeTextureDiagnostics(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): TextureDiagnostics {
  const counterSubjectNotes = notes.filter((note) => note.role === "counter-subject").sort(compareNoteEvents);
  const freeCounterpointNotes = notes.filter((note) => note.role === "free-counterpoint").sort(compareNoteEvents);
  const supportNotes = [...counterSubjectNotes, ...freeCounterpointNotes].sort(compareNoteEvents);
  const verticalStats = analyzeVerticalTexture(notes);
  const repeatedPitchRunCount = countRepeatedPitchRuns(notes, 3);
  const ornamentCandidateCount = countOrnamentCandidates(notes);
  const supportNoteCount = Math.max(1, supportNotes.length);

  return {
    counterSubjectIdentityRetention: contourRetention(counterSubjectNotes, COUNTER_SUBJECT_DEGREES),
    counterSubjectInvertibilityScore: invertibilityNearEntries(notes, subjectEntries),
    freeCounterpointContourScore: contourVariety(freeCounterpointNotes),
    rhythmicIndependenceScore: roundRatio(Math.max(0, 1 - verticalStats.sharedRhythmOverlapCount / supportNoteCount)),
    supportTextureRepetitionScore: roundRatio(Math.max(0, 1 - repeatedPitchRunCount / supportNoteCount)),
    expositionEntryStaggerScore: expositionEntryStaggerScore(notes),
    samePitchOverlapCount: verticalStats.samePitchOverlapCount,
    unisonOverlapCount: verticalStats.unisonOverlapCount,
    sameDirectionMotionCount: verticalStats.sameDirectionMotionCount,
    sharedRhythmOverlapCount: verticalStats.sharedRhythmOverlapCount,
    durationDistribution: durationDistribution(notes),
    repeatedPitchRunCount,
    allVoiceSilenceGapCount: countAllVoiceSilenceGaps(notes),
    ornamentCandidateCount,
    ornamentDensity: roundRatio(ornamentCandidateCount / supportNoteCount),
  };
}

function contourRetention(notes: readonly NoteEvent[], expectedDegrees: readonly number[]): number {
  if (notes.length < 2 || expectedDegrees.length < 2) {
    return notes.length === 0 ? 0 : 1;
  }

  const expectedDirections = expectedDegrees
    .slice(1)
    .map((degree, index) => Math.sign(degree - expectedDegrees[index]!));
  let matches = 0;
  let comparisons = 0;
  for (let offset = 0; offset < notes.length; offset += expectedDegrees.length) {
    const phrase = notes.slice(offset, offset + expectedDegrees.length);
    for (let index = 1; index < phrase.length; index += 1) {
      const actualDirection = Math.sign(phrase[index]!.pitch - phrase[index - 1]!.pitch);
      const expectedDirection = expectedDirections[index - 1]!;
      if (actualDirection === expectedDirection || actualDirection === 0) {
        matches += 1;
      }
      comparisons += 1;
    }
  }

  return roundRatio(matches / comparisons);
}

function invertibilityNearEntries(notes: readonly NoteEvent[], subjectEntries: readonly PlannedEntry[]): number {
  const entryNotes = notes.filter((note) => isEntryRole(note.role));
  if (entryNotes.length === 0) {
    return 0;
  }

  let invertibleEntries = 0;
  for (const entry of subjectEntries) {
    const entryDuration = entryNotes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
      .slice(0, entry.expectedDegreePattern.length)
      .reduce((sum, note) => sum + note.durationTicks, 0);
    const startTick = entry.startTick;
    const endTick = entry.startTick + entryDuration;
    const hasIndependentCounterSubject = notes.some(
      (note) =>
        note.role === "counter-subject" &&
        note.voice !== entry.voice &&
        note.startTick < endTick &&
        startTick < note.startTick + note.durationTicks &&
        !formsSustainedPerfectWithEntry(notes, note, entry.voice),
    );
    if (hasIndependentCounterSubject) {
      invertibleEntries += 1;
    }
  }

  return roundRatio(invertibleEntries / Math.max(1, subjectEntries.length));
}

function formsSustainedPerfectWithEntry(
  notes: readonly NoteEvent[],
  textureNote: NoteEvent,
  entryVoice: Voice,
): boolean {
  const checkpoints = [textureNote.startTick, textureNote.startTick + Math.floor(textureNote.durationTicks / 2)];
  return checkpoints.every((tick) => {
    const entryNote = notes.find(
      (note) =>
        note.voice === entryVoice &&
        isEntryRole(note.role) &&
        note.startTick <= tick &&
        tick < note.startTick + note.durationTicks,
    );
    return entryNote !== undefined && isPerfectInterval(Math.abs(entryNote.pitch - textureNote.pitch) % 12);
  });
}

function contourVariety(notes: readonly NoteEvent[]): number {
  if (notes.length === 0) {
    return 0;
  }

  let variedVoices = 0;
  for (const voice of VOICE_ENTRY_ORDER) {
    const pitches = notes.filter((note) => note.voice === voice).map((note) => note.pitch);
    if (pitches.length === 0) {
      continue;
    }
    const uniquePitches = new Set(pitches).size;
    const hasBothDirections =
      pitches.some((pitch, index) => index > 0 && pitch > pitches[index - 1]!) &&
      pitches.some((pitch, index) => index > 0 && pitch < pitches[index - 1]!);
    if (uniquePitches >= 3 && hasBothDirections) {
      variedVoices += 1;
    }
  }

  return roundRatio(variedVoices / VOICE_ENTRY_ORDER.length);
}

function analyzeVerticalTexture(notes: readonly NoteEvent[]): {
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
} {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let samePitchOverlapCount = 0;
  let unisonOverlapCount = 0;
  let sharedRhythmOverlapCount = 0;
  let sameDirectionMotionCount = 0;

  for (const tick of checkpoints) {
    const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    for (let leftIndex = 0; leftIndex < activeNotes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < activeNotes.length; rightIndex += 1) {
        const left = activeNotes[leftIndex]!;
        const right = activeNotes[rightIndex]!;
        if (left.pitch === right.pitch) {
          samePitchOverlapCount += 1;
        }
        if (positiveModulo(left.pitch - right.pitch, 12) === 0) {
          unisonOverlapCount += 1;
        }
        if (left.startTick === right.startTick && left.durationTicks === right.durationTicks) {
          sharedRhythmOverlapCount += 1;
        }
      }
    }
  }

  for (const tick of checkpoints) {
    const moving = VOICE_ENTRY_ORDER.map((voice) => motionAt(notes, voice, tick)).filter((motion) => motion !== 0);
    for (let leftIndex = 0; leftIndex < moving.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < moving.length; rightIndex += 1) {
        if (moving[leftIndex] === moving[rightIndex]) {
          sameDirectionMotionCount += 1;
        }
      }
    }
  }

  return { samePitchOverlapCount, unisonOverlapCount, sameDirectionMotionCount, sharedRhythmOverlapCount };
}

function motionAt(notes: readonly NoteEvent[], voice: Voice, tick: number): number {
  const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
  const index = voiceNotes.findIndex((note) => note.startTick === tick);
  if (index <= 0) {
    return 0;
  }
  return Math.sign(voiceNotes[index]!.pitch - voiceNotes[index - 1]!.pitch);
}

function expositionEntryStaggerScore(notes: readonly NoteEvent[]): number {
  const initialVoices = new Set(notes.filter((note) => note.startTick === 0).map((note) => note.voice)).size;
  if (initialVoices === 0) {
    return 0;
  }
  return roundRatio(Math.max(0, 1 - (initialVoices - 1) / (VOICE_ENTRY_ORDER.length - 1)));
}

function durationDistribution(notes: readonly NoteEvent[]): DurationDistribution {
  const distribution: DurationDistribution = {
    whole: 0,
    half: 0,
    quarter: 0,
    eighth: 0,
    sixteenth: 0,
    dotted: 0,
    triplet: 0,
    other: 0,
  };

  for (const note of notes) {
    if (note.durationTicks === TICKS_PER_QUARTER * 4) {
      distribution.whole += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER * 2) {
      distribution.half += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER) {
      distribution.quarter += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER / 2) {
      distribution.eighth += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER / 4) {
      distribution.sixteenth += 1;
    } else if (note.durationTicks % (TICKS_PER_QUARTER / 2) === TICKS_PER_QUARTER / 4) {
      distribution.dotted += 1;
    } else if (note.durationTicks % (TICKS_PER_QUARTER / 3) === 0) {
      distribution.triplet += 1;
    } else {
      distribution.other += 1;
    }
  }

  return distribution;
}

function countRepeatedPitchRuns(notes: readonly NoteEvent[], minimumRunLength: number): number {
  let runs = 0;
  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    let runStart = 0;
    for (let index = 1; index <= voiceNotes.length; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
        continue;
      }
      if (index - runStart >= minimumRunLength) {
        runs += 1;
      }
      runStart = index;
    }
  }
  return runs;
}

function countAllVoiceSilenceGaps(notes: readonly NoteEvent[]): number {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let gaps = 0;
  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const hasActiveNote = notes.some(
      (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    );
    if (!hasActiveNote) {
      gaps += 1;
    }
  }
  return gaps;
}

function countOrnamentCandidates(notes: readonly NoteEvent[]): number {
  return notes.filter(
    (note) =>
      (note.role === "counter-subject" || note.role === "free-counterpoint") &&
      note.durationTicks >= TICKS_PER_QUARTER &&
      note.startTick % TICKS_PER_QUARTER === 0,
  ).length;
}

function analyzeHarmonicPlans(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  subjectEntries: readonly PlannedEntry[],
): HarmonicDiagnostics {
  const cadenceAnchors = sectionPlans.flatMap((plan) => plan.anchors.filter((anchor) => anchor.cadenceTarget));
  const harmonicFunctionMatches = sectionPlans.reduce((sum, plan) => sum + plan.anchors.length, 0);
  const ambiguityPlans = sectionPlans.filter((plan) => plan.ambiguityIntent !== "none");
  const ambiguityRecoveries = ambiguityPlans.filter((plan) => plan.ambiguityRecoveryTick !== undefined).length;
  const episodePlans = sectionPlans.filter((plan) => plan.state === "episode");
  const directedEpisodes = episodePlans.filter(
    (plan) =>
      plan.sequencePattern !== undefined &&
      plan.fragmentTransform !== undefined &&
      (plan.targetKey.tonic !== plan.departureKey.tonic || plan.targetKey.mode !== plan.departureKey.mode),
  ).length;
  const strettoPlans = sectionPlans.filter((plan) => plan.state === "stretto-like");
  const strettoEntries = subjectEntries.filter((entry) => entry.state === "stretto-like");
  const parallelKeyShiftCount = sectionPlans.filter((plan) => plan.parallelKeyShift).length;
  const strictParallelShifts = sectionPlans.filter(
    (plan) => plan.parallelKeyShift && plan.styleProfile === "strict-classical",
  ).length;
  const modalPlans = sectionPlans.filter((plan) => isModalMode(plan.localKey.mode) || isModalMode(plan.targetKey.mode));
  const modalCharacteristicToneHits = countModalCharacteristicToneHits(notes, modalPlans);
  const modalCadenceHits = modalPlans.filter((plan) => plan.cadenceKind === "modal").length;
  const tonalCadenceOveruseWarnings =
    modalPlans.length === 0 ? 0 : Number(modalCadenceHits === 0 || modalCharacteristicToneHits < modalPlans.length);

  return {
    unresolvedDissonanceCount: 0,
    strongBeatDissonanceCount: 0,
    cadenceTargetMisses: 0,
    cadenceTargetHits: cadenceAnchors.length,
    leadingToneResolutionMisses: 0,
    dominantResolutionMisses: 0,
    predominantDirectionMisses: countPredominantDirectionMisses(sectionPlans),
    harmonicFunctionMismatches: 0,
    harmonicFunctionMatches,
    controlledAmbiguityScore: ambiguityPlans.length === 0 ? 1 : roundRatio(ambiguityRecoveries / ambiguityPlans.length),
    unresolvedAmbiguityWarnings: ambiguityPlans.length - ambiguityRecoveries,
    ambiguityRecoveries,
    styleModulationFit: roundRatio(Math.max(0, 1 - strictParallelShifts / Math.max(1, sectionPlans.length))),
    parallelKeyShiftCount,
    formRepetitionWarnings: countFormRepetitionWarnings(sectionPlans),
    episodeDirectionScore: episodePlans.length === 0 ? 1 : roundRatio(directedEpisodes / episodePlans.length),
    strettoClarityScore:
      strettoPlans.length === 0 ? 1 : roundRatio(Math.min(1, strettoEntries.length / (strettoPlans.length * 2))),
    modalContextCount: modalPlans.length,
    modalCharacteristicToneHits,
    modalCadenceHits,
    tonalCadenceOveruseWarnings,
  };
}

function countModalCharacteristicToneHits(notes: readonly NoteEvent[], sectionPlans: readonly HarmonicPlan[]): number {
  let hits = 0;
  for (const plan of sectionPlans) {
    const mode = isModalMode(plan.targetKey.mode) ? plan.targetKey.mode : plan.localKey.mode;
    const scaleDegree = characteristicScaleDegree(mode);
    if (scaleDegree === undefined) {
      continue;
    }
    const key = isModalMode(plan.targetKey.mode) ? plan.targetKey : plan.localKey;
    const pitchClass = scaleDegreePitchClass(scaleDegree, 0, key);
    if (
      notes.some(
        (note) =>
          note.startTick >= plan.startTick &&
          note.startTick < plan.startTick + plan.durationTicks &&
          positiveModulo(note.pitch, 12) === pitchClass,
      )
    ) {
      hits += 1;
    }
  }
  return hits;
}

function countPredominantDirectionMisses(sectionPlans: readonly HarmonicPlan[]): number {
  return sectionPlans.filter((plan) => {
    const functions = plan.anchors.map((anchor) => anchor.function);
    const predominantIndex = functions.indexOf("predominant");
    const dominantIndex = functions.indexOf("dominant");
    return predominantIndex !== -1 && dominantIndex !== -1 && dominantIndex < predominantIndex;
  }).length;
}

function countFormRepetitionWarnings(sectionPlans: readonly HarmonicPlan[]): number {
  const continuationPlans = sectionPlans.filter((plan) => plan.state !== "exposition");
  if (continuationPlans.length < 4) {
    return 0;
  }

  const uniqueDurations = new Set(continuationPlans.map((plan) => plan.durationTicks));
  const uniqueStates = new Set(continuationPlans.map((plan) => plan.state));
  const allDurationsIdentical = uniqueDurations.size === 1;
  const hasTooFewStates = uniqueStates.size < 3;
  return allDurationsIdentical || hasTooFewStates ? 1 : 0;
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function findMelodicStagnationIssues(notes: readonly NoteEvent[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    let runStart = 0;
    for (let index = 1; index <= voiceNotes.length; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
        continue;
      }

      if (index - runStart >= 5) {
        const first = voiceNotes[runStart]!;
        issues.push({
          code: "melodic-stagnation",
          severity: "warning",
          tick: first.startTick,
          voices: [voice],
          pitches: { [voice]: first.pitch },
          message: `${voice} repeats pitch ${first.pitch} for ${index - runStart} notes`,
        });
      }
      runStart = index;
    }
  }

  return issues;
}

function findLeapRecoveryIssues(notes: readonly NoteEvent[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    for (let index = 1; index < voiceNotes.length - 1; index += 1) {
      const previous = voiceNotes[index - 1]!;
      const current = voiceNotes[index]!;
      const next = voiceNotes[index + 1]!;
      const leap = current.pitch - previous.pitch;
      if (Math.abs(leap) <= 5) {
        continue;
      }

      const recovery = next.pitch - current.pitch;
      const recoversByStepInOppositeDirection = Math.sign(recovery) === -Math.sign(leap) && Math.abs(recovery) <= 2;
      if (!recoversByStepInOppositeDirection) {
        issues.push({
          code: "leap-recovery-miss",
          severity: "warning",
          tick: current.startTick,
          voices: [voice],
          pitches: { [voice]: current.pitch },
          message: `${voice} leap of ${Math.abs(leap)} semitones is not recovered by contrary step`,
        });
      }
    }
  }

  return issues;
}

function findEntryPlanIssues(notes: readonly NoteEvent[], subjectEntries: readonly PlannedEntry[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const entry of subjectEntries) {
    const entryNotes = notes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
      .sort(compareNoteEvents)
      .slice(0, entry.expectedDegreePattern.length);
    const pitchClassSequence = entryNotes.map((note) => positiveModulo(note.pitch, 12));
    const matchesPlan =
      pitchClassSequence.length === entry.actualPitchClassSequence.length &&
      pitchClassSequence.every((pitchClass, index) => pitchClass === entry.actualPitchClassSequence[index]);

    if (!matchesPlan) {
      issues.push({
        code: entry.form === "answer" ? "answer-plan-violation" : "subject-identity-violation",
        severity: "warning",
        tick: entry.startTick,
        voices: [entry.voice],
        pitches: entryNotes[0] === undefined ? {} : { [entry.voice]: entryNotes[0].pitch },
        message:
          entry.form === "answer"
            ? `${entry.voice} answer does not match the planned ${entry.answerKind ?? "true"} answer`
            : `${entry.voice} ${entry.form} does not match the planned degree pattern`,
      });
      continue;
    }

    const expectedPitchClassesFromKey = entry.expectedDegreePattern.map((scaleDegree) =>
      scaleDegreePitchClass(scaleDegree, 0, entry.localKey),
    );
    const matchesLocalKey =
      expectedPitchClassesFromKey.length === entry.actualPitchClassSequence.length &&
      expectedPitchClassesFromKey.every((pitchClass, index) => pitchClass === entry.actualPitchClassSequence[index]) &&
      pitchClassSequence.every((pitchClass, index) => pitchClass === expectedPitchClassesFromKey[index]);
    if (!matchesLocalKey) {
      issues.push({
        code: "key-metadata-mismatch",
        severity: "warning",
        tick: entry.startTick,
        voices: [entry.voice],
        pitches: entryNotes[0] === undefined ? {} : { [entry.voice]: entryNotes[0].pitch },
        message: `${entry.voice} entry pitch classes do not match local key ${entry.localKey.tonic} ${entry.localKey.mode}`,
      });
    }
  }

  return issues;
}

type ActivePitch = {
  pitch: number;
  role: NoteEvent["role"];
};

type ActiveVerticality = Map<Voice, ActivePitch>;

function activePitchesAt(notes: readonly NoteEvent[], tick: number): ActiveVerticality {
  const active: ActiveVerticality = new Map();
  for (const voice of VOICE_ENTRY_ORDER) {
    const note = notes
      .filter((candidate) => candidate.voice === voice)
      .find((candidate) => candidate.startTick <= tick && tick < candidate.startTick + candidate.durationTicks);
    if (note !== undefined) {
      active.set(voice, { pitch: note.pitch, role: note.role });
    }
  }
  return active;
}

function findVoiceCrossings(active: ActiveVerticality, tick: number): DiagnosticIssue[] {
  const adjacentPairs: [higher: Voice, lower: Voice][] = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];
  const issues: DiagnosticIssue[] = [];

  for (const [higher, lower] of adjacentPairs) {
    const higherPitch = active.get(higher)?.pitch;
    const lowerPitch = active.get(lower)?.pitch;
    if (higherPitch === undefined || lowerPitch === undefined || higherPitch >= lowerPitch) {
      continue;
    }

    issues.push({
      code: "voice-crossing",
      severity: "warning",
      tick,
      voices: [higher, lower],
      pitches: { [higher]: higherPitch, [lower]: lowerPitch },
      message: `${higher} is below ${lower} at tick ${tick}`,
    });
  }

  return issues;
}

function findParallelPerfects(
  previous: ActiveVerticality,
  current: ActiveVerticality,
  tick: number,
): DiagnosticIssue[] {
  if (tick % TICKS_PER_QUARTER !== 0) {
    return [];
  }

  const issues: DiagnosticIssue[] = [];
  for (let leftIndex = 0; leftIndex < VOICE_ENTRY_ORDER.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < VOICE_ENTRY_ORDER.length; rightIndex += 1) {
      const left = VOICE_ENTRY_ORDER[leftIndex]!;
      const right = VOICE_ENTRY_ORDER[rightIndex]!;
      const previousLeft = previous.get(left);
      const previousRight = previous.get(right);
      const currentLeft = current.get(left);
      const currentRight = current.get(right);
      if (
        previousLeft === undefined ||
        previousRight === undefined ||
        currentLeft === undefined ||
        currentRight === undefined
      ) {
        continue;
      }
      if (!isEntryRole(currentLeft.role) || !isEntryRole(currentRight.role)) {
        continue;
      }

      const previousInterval = Math.abs(previousLeft.pitch - previousRight.pitch) % 12;
      const currentInterval = Math.abs(currentLeft.pitch - currentRight.pitch) % 12;
      const leftMotion = Math.sign(currentLeft.pitch - previousLeft.pitch);
      const rightMotion = Math.sign(currentRight.pitch - previousRight.pitch);
      if (
        leftMotion !== 0 &&
        leftMotion === rightMotion &&
        isPerfectInterval(previousInterval) &&
        isPerfectInterval(currentInterval)
      ) {
        issues.push({
          code: "parallel-perfect",
          severity: "warning",
          tick,
          voices: [left, right],
          pitches: { [left]: currentLeft.pitch, [right]: currentRight.pitch },
          message: `${left} and ${right} move in parallel perfect interval at tick ${tick}`,
        });
      }
    }
  }

  return issues;
}

function isPerfectInterval(intervalClass: number): boolean {
  return intervalClass === 0 || intervalClass === 7;
}

function countIssues(issues: readonly DiagnosticIssue[], code: DiagnosticIssue["code"]): number {
  return issues.filter((issue) => issue.code === code).length;
}

function compareNoteEvents(left: NoteEvent, right: NoteEvent): number {
  if (left.startTick !== right.startTick) {
    return left.startTick - right.startTick;
  }

  return left.voice.localeCompare(right.voice);
}

function validateInput(input: GenerationInput): void {
  if (input.seed.length === 0) {
    throw new Error("seed must not be empty");
  }

  if (!Number.isSafeInteger(input.lengthTicks) || input.lengthTicks <= 0) {
    throw new Error("lengthTicks must be a positive safe integer");
  }
}
