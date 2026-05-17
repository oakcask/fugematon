import { classifyCandidatePoolOracleSection, summarizeCandidatePoolOracleSections } from "../candidate-pool-oracle.js";
import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AnswerKind,
  CandidateEvaluation,
  EntryForm,
  FragmentTransform,
  FugueState,
  HarmonicPlan,
  KeySignature,
  NoteEvent,
  SequencePattern,
  StyleProfile,
  Voice,
} from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { addSubjectEntry, chooseAnswerKind } from "./entries.js";
import { evaluateCandidate } from "./evaluation.js";
import { buildHarmonicPlan, cadenceKindForSection } from "./harmony.js";
import { isModalMode, transposeKey } from "./key.js";
import {
  compareNoteEvents,
  ENTRY_SPACING_TICKS,
  STRETTO_ENTRY_SPACING_TICKS,
  subjectDuration,
  VOICE_ENTRY_ORDER,
} from "./shared.js";
import { addContinuityCounterpoint, addCounterpointTexture, fillAllVoiceSilenceGaps } from "./texture.js";
import type { Exposition, FugueScore, SubjectNote } from "./types.js";

const CONTINUATION_STATE_PATTERNS: readonly (readonly FugueState[])[] = [
  ["episode", "subject-return", "episode", "stretto-like"],
  ["episode", "subject-return", "stretto-like", "episode", "subject-return"],
  ["subject-return", "episode", "episode", "stretto-like", "subject-return"],
  ["episode", "stretto-like", "episode", "subject-return"],
];

export function buildFugueScore(
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
  const candidatePoolOracleSections: ReturnType<typeof classifyCandidatePoolOracleSection>[] = [];
  let candidateEvaluations = 0;
  let sectionStartTick = exposition.endTick;
  const continuationPattern = chooseContinuationStatePattern(rng);
  const continuationPatternIndex = CONTINUATION_STATE_PATTERNS.indexOf(continuationPattern);
  let continuationCycleIndex = 0;
  let stateIndex = 0;

  while (sectionStartTick < lengthTicks) {
    const statePattern = continuationPatternForCycle(
      continuationPattern,
      continuationPatternIndex,
      continuationCycleIndex,
      isModalMode(keySignature.mode),
    );
    const state = statePattern[stateIndex]!;
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
    candidatePoolOracleSections.push(selection.oracleSection);
    sectionStartTick += selection.section.durationTicks;
    stateIndex += 1;
    if (stateIndex >= statePattern.length) {
      stateIndex = 0;
      continuationCycleIndex += 1;
    }
  }

  fillAllVoiceSilenceGaps(notes, keySignature);
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    sectionPlans,
    candidateEvaluations,
    selectedCandidateEvaluations,
    candidatePoolOracle: summarizeCandidatePoolOracleSections(candidatePoolOracleSections),
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
    durationTicks: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
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

export function chooseContinuationSectionTicks(state: FugueState, rng: Xoshiro128StarStar): number {
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

export function buildExposition(subject: readonly SubjectNote[], keySignature: KeySignature): Exposition {
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

export function chooseContinuationSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  sectionDurationTicks: number,
  rng: Xoshiro128StarStar,
  previousNotes: readonly NoteEvent[],
): {
  section: Exposition;
  candidateCount: number;
  evaluation: CandidateEvaluation;
  oracleSection: ReturnType<typeof classifyCandidatePoolOracleSection>;
} {
  const candidates = buildContinuationCandidates(subject, keySignature, state, startTick, sectionDurationTicks, rng);
  const evaluations = candidates.map((candidate) => evaluateCandidate(previousNotes, candidate));
  let bestIndex = 0;

  for (const [index, evaluation] of evaluations.entries()) {
    if (evaluation.totalCost < evaluations[bestIndex]!.totalCost) {
      bestIndex = index;
    }
  }

  return {
    section: candidates[bestIndex]!,
    candidateCount: candidates.length,
    evaluation: evaluations[bestIndex]!,
    oracleSection: classifyCandidatePoolOracleSection({
      state,
      startTick,
      durationTicks: sectionDurationTicks,
      evaluations,
      selectedCandidateIndex: bestIndex,
    }),
  };
}

export function buildContinuationCandidates(
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
