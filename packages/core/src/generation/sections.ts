import { classifyCandidatePoolOracleSection, summarizeCandidatePoolOracleSections } from "../candidate-pool-oracle.js";
import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AnswerKind,
  CadenceKind,
  CandidateDiversityDescriptor,
  CandidateEvaluation,
  EntryForm,
  FragmentTransform,
  FugueState,
  HarmonicPlan,
  KeySignature,
  NoteEvent,
  PlannedEntry,
  SelectionModel,
  SequencePattern,
  StyleProfile,
  Voice,
} from "../events.js";
import type { Xoshiro128StarStar } from "../prng.js";
import { addSubjectEntry, chooseAnswerKind } from "./entries.js";
import { evaluateCandidate } from "./evaluation.js";
import { buildHarmonicPlan, cadenceKindForSection } from "./harmony.js";
import { isModalMode, tonicPitchClass, transposeKey } from "./key.js";
import { melodicRoleForScaleDegree } from "./pitch.js";
import {
  compareNoteEvents,
  ENTRY_SPACING_TICKS,
  STRETTO_ENTRY_SPACING_TICKS,
  subjectDuration,
  VOICE_ENTRY_ORDER,
} from "./shared.js";
import {
  addBassAnswerTailTextureSupport,
  addContinuityCounterpoint,
  addCounterpointTexture,
  addFunctionalThinningSupport,
  addPostEntryContinuationSupport,
  type ContinuityLineKind,
  fillAllVoiceSilenceGaps,
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

export function buildFugueScore(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  lengthTicks: number,
  rng: Xoshiro128StarStar,
  selectionModel: SelectionModel = "baseline",
): FugueScore {
  const counterSubjectSupportRepair = lengthTicks >= TICKS_PER_QUARTER * 288;
  const exposition = buildExposition(subject, keySignature, counterSubjectSupportRepair);
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
  let phraseUnit: ContinuationPhraseUnit | undefined;
  let phraseSectionIndex = 0;

  while (sectionStartTick < lengthTicks) {
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
    const sectionDurationTicks = chooseContinuationSectionTicks(state, rng);
    const selection = chooseContinuationSection(
      subject,
      keySignature,
      state,
      sectionStartTick,
      sectionDurationTicks,
      rng,
      notes,
      selectionModel,
      [...stateTransitions, state],
      sectionPlans,
      subjectEntries,
      phraseIntent,
      counterSubjectSupportRepair,
    );
    if (selectionModel === "section-local-planner") {
      softenBassEntryBoundaryResets(selection.section.notes, selection.section.subjectEntries, notes);
      selection.section.notes.sort(compareNoteEvents);
      selection.evaluation = evaluateCandidate(notes, selection.section);
    }
    const selectedState = selection.section.sectionPlans[0]?.state ?? state;
    stateTransitions.push(selectedState);
    stateChanges.push({ tick: sectionStartTick, state: selectedState });
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
    phraseSectionIndex += 1;
  }

  fillAllVoiceSilenceGaps(notes, keySignature);
  if (selectionModel === "section-local-planner") {
    addFunctionalThinningSupport(notes, sectionPlans);
    addBassAnswerTailTextureSupport(notes, subjectEntries, sectionPlans);
    addPostEntryContinuationSupport(notes, subjectEntries, sectionPlans);
  }
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

type ContinuationCandidateSelectionBand = "baseline" | "section-local" | "section-grammar" | "phrase-family";

type ContinuationCandidateSelectionWindow = {
  baselineCandidateCount: number;
  selectableCandidateCount: number;
  sectionGrammarCandidateStart: number;
  phraseFamilyCandidateStart: number;
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

export function buildExposition(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  counterSubjectSupportRepair = false,
): Exposition {
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
    });
    addCounterpointTexture(notes, subject, {
      enteringVoice: voice,
      startTick,
      durationTicks: ENTRY_SPACING_TICKS,
      localKey: form === "answer" ? transposeKey(keySignature, 7) : keySignature,
      eligibleVoices: VOICE_ENTRY_ORDER.slice(0, entryIndex),
      harmonicPlan,
      counterSubjectSupportRepair,
    });
  }

  softenFirstBassEntryBoundaryReset(notes, subjectEntries);
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
  selectionModel: SelectionModel = "baseline",
  stateHistory: readonly FugueState[] = [state],
  previousSectionPlans: readonly HarmonicPlan[] = [],
  previousSubjectEntries: readonly PlannedEntry[] = [],
  phraseIntent?: ContinuationPhraseSectionIntent,
  counterSubjectSupportRepair = false,
): {
  section: Exposition;
  candidateCount: number;
  evaluation: CandidateEvaluation;
  oracleSection: ReturnType<typeof classifyCandidatePoolOracleSection>;
} {
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
  );
  const evaluations = candidates.map((candidate) => evaluateCandidate(previousNotes, candidate));
  const selectionWindow = continuationCandidateSelectionWindow(state, selectionModel, candidates.length);
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
    const candidateBand = continuationCandidateSelectionBand(index, selectionWindow, selectionModel);
    if (!candidateBandCanBeSelected(candidateBand, index, selectionWindow, selectionModel)) {
      continue;
    }
    if (
      candidateBand !== "baseline" &&
      !preservesSectionLocalGuardrails(
        evaluation,
        baselineEvaluation,
        candidateBand === "section-grammar" || candidateBand === "phrase-family",
      )
    ) {
      continue;
    }

    const candidateScore =
      selectionScore(evaluation, selectionModel) +
      (selectionModel === "section-local-planner"
        ? sectionGrammarPlannerSelectionRiskAdjustment(
            evaluation,
            historyContext,
            candidateBand === "section-grammar",
          ) + phraseDevelopmentSelectionRiskAdjustment(candidates[index]!, previousSubjectEntries, historyContext)
        : 0);
    const bestScore =
      selectionModel === "section-local-planner" && bestIndex < selectionWindow.baselineCandidateCount
        ? selectionScore(evaluations[bestIndex]!, "candidate-oracle-selection") +
          sectionGrammarPlannerSelectionRiskAdjustment(evaluations[bestIndex]!, historyContext, false) +
          phraseDevelopmentSelectionRiskAdjustment(candidates[bestIndex]!, previousSubjectEntries, historyContext)
        : selectionScore(evaluations[bestIndex]!, selectionModel) +
          (selectionModel === "section-local-planner"
            ? sectionGrammarPlannerSelectionRiskAdjustment(
                evaluations[bestIndex]!,
                historyContext,
                continuationCandidateSelectionBand(bestIndex, selectionWindow, selectionModel) === "section-grammar",
              ) +
              phraseDevelopmentSelectionRiskAdjustment(candidates[bestIndex]!, previousSubjectEntries, historyContext)
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

  const selectedState = candidates[bestIndex]!.sectionPlans[0]?.state ?? state;
  return {
    section: candidates[bestIndex]!,
    candidateCount: candidates.length,
    evaluation: evaluations[bestIndex]!,
    oracleSection: classifyCandidatePoolOracleSection({
      state: selectedState,
      startTick,
      durationTicks: sectionDurationTicks,
      evaluations,
      selectedCandidateIndex: bestIndex,
      candidateDiversityDescriptors: candidates.map(describeCandidateDiversity),
      phraseFamilyCandidateCount:
        selectionModel === "section-local-planner" ? candidates.length - selectionWindow.phraseFamilyCandidateStart : 0,
      stateHistory: [...stateHistory.slice(0, -1), selectedState],
    }),
  };
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
    const candidateBand = continuationCandidateSelectionBand(index, input.selectionWindow, input.selectionModel);
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
        candidateBand === "section-grammar" || candidateBand === "phrase-family",
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
        ? selectionScore(evaluation, input.selectionModel)
        : selectionScore(evaluation, "candidate-oracle-selection");
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
    };
  }

  return {
    baselineCandidateCount: baselineContinuationCandidateCount(state),
    selectableCandidateCount: selectableContinuationCandidateCount(state),
    sectionGrammarCandidateStart: sectionGrammarCandidateStartIndex(state),
    phraseFamilyCandidateStart: phraseFamilyCandidateStartIndex(state),
  };
}

function continuationCandidateSelectionBand(
  index: number,
  window: ContinuationCandidateSelectionWindow,
  selectionModel: SelectionModel,
): ContinuationCandidateSelectionBand {
  if (selectionModel !== "section-local-planner" || index < window.baselineCandidateCount) {
    return "baseline";
  }
  if (index < window.sectionGrammarCandidateStart) {
    return "section-local";
  }
  if (index < window.phraseFamilyCandidateStart) {
    return "section-grammar";
  }
  return "phrase-family";
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
  return index < window.selectableCandidateCount || band === "section-grammar" || band === "phrase-family";
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

function selectionScore(evaluation: CandidateEvaluation, selectionModel: SelectionModel): number {
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
    selectedVoicePairLockstepSelectionCost * 1.5 +
    samePitchOverlapCount * 2 +
    qualityVectorPitchClassUnisonDuration * 0.2 +
    qualityVectorDurationBasedLockstep * 0.2
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
  const sameStemCount = recentEntries.filter((entry) => entry.expectedDegreePattern.join("-") === candidateStem).length;
  const sameStemSameVoiceCount = recentEntries.filter(
    (entry) => entry.expectedDegreePattern.join("-") === candidateStem && entry.voice === candidateEntry.voice,
  ).length;
  const section = candidate.sectionPlans[0];
  const functionBearingReward =
    section?.cadenceKind === "authentic" ||
    section?.cadenceKind === "modal" ||
    section?.state === "stretto-like" ||
    recentEntries.some(
      (entry) =>
        entry.expectedDegreePattern.join("-") === candidateStem &&
        (entry.voice !== candidateEntry.voice ||
          entry.localKey.tonic !== candidateEntry.localKey.tonic ||
          entry.localKey.mode !== candidateEntry.localKey.mode),
    )
      ? 24
      : 0;

  return sameStemCount * 180 + sameStemSameVoiceCount * 90 - functionBearingReward;
}

function bestContinuationCandidateIndex(
  evaluations: readonly CandidateEvaluation[],
  selectionModel: SelectionModel,
): number {
  let bestIndex = 0;
  for (const [index, evaluation] of evaluations.entries()) {
    if (selectionScore(evaluation, selectionModel) < selectionScore(evaluations[bestIndex]!, selectionModel)) {
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
    evaluationHarmony.qualityVectorUnresolvedEntrySevereIntervalDuration <=
      baselineHarmony.qualityVectorUnresolvedEntrySevereIntervalDuration
  );
}

function selectedSectionSoloTextureRisk(evaluation: CandidateEvaluation): number {
  return evaluation.explanations.sections.reduce((sum, section) => sum + section.soloTextureRisk, 0);
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
): Exposition[] {
  const notes: Exposition["notes"] = [];
  const candidates: Exposition[] = [];
  const sectionLocalPlannerCandidates: Exposition[] = [];
  const voicePairSupportCandidates: Exposition[] = [];
  const registerPlannerCandidates: Exposition[] = [];
  const sectionGrammarCandidates: Exposition[] = [];
  const phraseFamilyOracleCandidates: Exposition[] = [];
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
          sequencePattern: chooseSequencePattern(rng),
          fragmentTransform: chooseFragmentTransform(rng),
          cadenceKind: phraseIntent?.cadenceKind,
        };
        candidates.push(buildContinuationSection(phraseSubject.slice(0, 4), input, counterSubjectSupportRepair));
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject.slice(0, 4),
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
              },
              counterSubjectSupportRepair,
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
              },
              counterSubjectSupportRepair,
            ),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject.slice(0, 4),
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
              },
              counterSubjectSupportRepair,
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
        };
        candidates.push(buildContinuationSection(phraseSubject, input, counterSubjectSupportRepair));
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject,
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
              },
              counterSubjectSupportRepair,
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
              },
              counterSubjectSupportRepair,
            ),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(
              phraseSubject,
              {
                ...input,
                continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
                continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
              },
              counterSubjectSupportRepair,
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
          ),
        );
      }
    }
  }

  if (includeSectionLocalPlannerCandidates) {
    sectionGrammarCandidates.push(
      ...buildSectionGrammarOracleCandidates(subject, keySignature, state, startTick, sectionDurationTicks),
    );
    phraseFamilyOracleCandidates.push(
      ...buildPhraseFamilyOracleCandidates(subject, keySignature, state, startTick, sectionDurationTicks),
    );
  }

  candidates.push(...sectionLocalPlannerCandidates);
  candidates.push(...voicePairSupportCandidates);
  candidates.push(...registerPlannerCandidates);
  candidates.push(...sectionGrammarCandidates);
  candidates.push(...phraseFamilyOracleCandidates);

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
): Exposition[] {
  const candidates: Exposition[] = [];
  const candidateStates = (["episode", "subject-return", "stretto-like"] as const).filter(
    (state) => state !== selectedState,
  );

  for (const state of candidateStates) {
    if (state === "episode") {
      candidates.push(...buildEpisodeGrammarOracleCandidates(subject, keySignature, startTick, sectionDurationTicks));
    } else if (state === "subject-return") {
      candidates.push(
        ...buildSubjectReturnGrammarOracleCandidates(subject, keySignature, startTick, sectionDurationTicks),
      );
    } else {
      candidates.push(...buildStrettoGrammarOracleCandidates(subject, keySignature, startTick, sectionDurationTicks));
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
): Exposition[] {
  const subjectVariation = deriveSubjectStem(subject, [0, 2, 1, 3, 4, 2, 3, 1]);
  const modalVariation = deriveSubjectStem(subject, [0, 2, 3, 1, 4, 3, 1, 0]);
  const fragmentVariation = deriveSubjectStem(subject.slice(0, 4), [0, 2, 1, 3]);

  if (state === "episode") {
    return [
      buildContinuationSection(fragmentVariation, {
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
      }),
      buildContinuationSection(deriveSubjectStem(subject.slice(0, 4), [0, 3, 1, 2]), {
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
      }),
    ];
  }

  if (state === "subject-return") {
    const returnSubject = isModalMode(keySignature.mode) ? modalVariation : subjectVariation;
    return [
      buildContinuationSection(returnSubject, {
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
      }),
      buildContinuationSection(subjectVariation, {
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
      }),
    ];
  }

  return [
    buildStrettoSection(subjectVariation.slice(0, 6), {
      state: "stretto-like",
      firstVoice: "soprano",
      secondVoice: "tenor",
      startTick,
      globalKey: keySignature,
      sectionDurationTicks,
      styleProfile: "hybrid",
    }),
    buildStrettoSection(modalVariation.slice(0, 6), {
      state: "stretto-like",
      firstVoice: "bass",
      secondVoice: "alto",
      startTick,
      globalKey: keySignature,
      sectionDurationTicks,
      styleProfile: isModalMode(keySignature.mode) ? "hybrid" : "strict-classical",
    }),
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
): Exposition[] {
  return [
    buildContinuationSection(subject.slice(0, 4), {
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
    }),
    buildContinuationSection(subject.slice(0, 4), {
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
    }),
  ];
}

function buildSubjectReturnGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  startTick: number,
  sectionDurationTicks: number,
): Exposition[] {
  return [
    buildContinuationSection(subject, {
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
    }),
    buildContinuationSection(subject, {
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
    }),
  ];
}

function buildStrettoGrammarOracleCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  startTick: number,
  sectionDurationTicks: number,
): Exposition[] {
  return [
    buildStrettoSection(subject.slice(0, 6), {
      state: "stretto-like",
      firstVoice: "alto",
      secondVoice: "soprano",
      startTick,
      globalKey: keySignature,
      sectionDurationTicks,
      styleProfile: "hybrid",
    }),
    buildStrettoSection(subject.slice(0, 6), {
      state: "stretto-like",
      firstVoice: "tenor",
      secondVoice: "alto",
      startTick,
      globalKey: keySignature,
      sectionDurationTicks,
      styleProfile: "strict-classical",
    }),
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
    cadenceKind?: CadenceKind;
  },
  counterSubjectSupportRepair = false,
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
      sequencePattern: entry.sequencePattern,
      fragmentTransform: entry.fragmentTransform,
    }),
  ];

  const harmonicPlan = sectionPlans[0]!;

  addSubjectEntry(notes, subjectEntries, subject, { ...entry, harmonicPlan });
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.voice,
    startTick: entry.startTick,
    durationTicks: entry.supportDurationTicks,
    localKey: entry.localKey,
    harmonicPlan,
    counterSubjectSupportRepair,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + entry.supportDurationTicks,
    durationTicks: Math.max(0, entry.sectionDurationTicks - entry.supportDurationTicks),
    localKey: entry.targetKey,
    harmonicPlan,
    maxVoiceCount: entry.continuityVoiceCount,
    voiceOrder: entry.continuityVoiceOrder,
    lineKind: entry.continuityLineKind,
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
  });
  addCounterpointTexture(notes, subject, {
    enteringVoice: entry.firstVoice,
    startTick: entry.startTick,
    durationTicks: subjectDuration(subject),
    localKey: entry.globalKey,
    harmonicPlan,
    counterSubjectSupportRepair,
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + subjectDuration(subject),
    durationTicks: Math.max(0, entry.sectionDurationTicks - subjectDuration(subject)),
    localKey: transposeKey(entry.globalKey, 7),
    harmonicPlan,
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
