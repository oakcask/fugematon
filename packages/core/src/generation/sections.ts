import { classifyCandidatePoolOracleSection, summarizeCandidatePoolOracleSections } from "../candidate-pool-oracle.js";
import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  AnswerKind,
  CadenceKind,
  CandidateEvaluation,
  EntryForm,
  FragmentTransform,
  FugueState,
  HarmonicPlan,
  KeySignature,
  NoteEvent,
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
  addContinuityCounterpoint,
  addCounterpointTexture,
  addFunctionalThinningSupport,
  fillAllVoiceSilenceGaps,
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
      selectionModel === "phase10-section-local-planner" &&
      (phraseUnit === undefined || phraseSectionIndex >= phraseUnit.sections.length)
    ) {
      phraseUnit = chooseContinuationPhraseUnit({
        primaryPattern: statePattern,
        stateIndex,
        stateHistory: stateTransitions,
        previousSectionPlans: sectionPlans,
        previousNotes: notes,
        keySignature,
        preserveSubjectFamily: isModalMode(keySignature.mode),
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
      phraseIntent,
    );
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
  if (selectionModel === "phase10-section-local-planner") {
    addFunctionalThinningSupport(notes, sectionPlans);
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
  selectionModel: SelectionModel = "baseline",
  stateHistory: readonly FugueState[] = [state],
  previousSectionPlans: readonly HarmonicPlan[] = [],
  phraseIntent?: ContinuationPhraseSectionIntent,
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
  );
  const evaluations = candidates.map((candidate) => evaluateCandidate(previousNotes, candidate));
  const baselineCandidateCount =
    selectionModel === "phase10-section-local-planner" ? baselineContinuationCandidateCount(state) : candidates.length;
  const selectableCandidateCount =
    selectionModel === "phase10-section-local-planner"
      ? phase10SelectableContinuationCandidateCount(state)
      : candidates.length;
  const sectionGrammarCandidateStart =
    selectionModel === "phase10-section-local-planner"
      ? phase10SectionGrammarCandidateStartIndex(state)
      : candidates.length;
  const phraseFamilyCandidateStart =
    selectionModel === "phase10-section-local-planner"
      ? phase12PhraseFamilyCandidateStartIndex(state)
      : candidates.length;
  let bestIndex = bestContinuationCandidateIndex(
    evaluations.slice(0, baselineCandidateCount),
    selectionModel === "phase10-section-local-planner" ? "phase10-oracle-selection" : selectionModel,
  );
  const baselineEvaluation = evaluations[bestIndex]!;
  const historyContext = buildHistoryAwareSelectionContext(
    stateHistory,
    previousSectionPlans,
    previousNotes,
    keySignature,
  );

  for (const [index, evaluation] of evaluations.entries()) {
    const isSectionLocalCandidate =
      selectionModel === "phase10-section-local-planner" && index >= baselineCandidateCount;
    const isSectionGrammarCandidate =
      selectionModel === "phase10-section-local-planner" &&
      index >= sectionGrammarCandidateStart &&
      index < phraseFamilyCandidateStart;
    const isPhraseFamilyCandidate =
      selectionModel === "phase10-section-local-planner" && index >= phraseFamilyCandidateStart;
    if (
      selectionModel === "phase10-section-local-planner" &&
      (!isSectionLocalCandidate ||
        isPhraseFamilyCandidate ||
        (index >= selectableCandidateCount && !isSectionGrammarCandidate))
    ) {
      continue;
    }
    if (
      isSectionLocalCandidate &&
      !preservesSectionLocalGuardrails(evaluation, baselineEvaluation, isSectionGrammarCandidate)
    ) {
      continue;
    }

    const candidateScore =
      selectionScore(evaluation, selectionModel) +
      (selectionModel === "phase10-section-local-planner"
        ? sectionGrammarPlannerSelectionRiskAdjustment(evaluation, historyContext, isSectionGrammarCandidate)
        : 0);
    const bestScore =
      selectionModel === "phase10-section-local-planner" && bestIndex < baselineCandidateCount
        ? selectionScore(evaluations[bestIndex]!, "phase10-oracle-selection") +
          sectionGrammarPlannerSelectionRiskAdjustment(evaluations[bestIndex]!, historyContext, false)
        : selectionScore(evaluations[bestIndex]!, selectionModel) +
          (selectionModel === "phase10-section-local-planner"
            ? sectionGrammarPlannerSelectionRiskAdjustment(
                evaluations[bestIndex]!,
                historyContext,
                bestIndex >= sectionGrammarCandidateStart,
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
    baselineCandidateCount,
    selectableCandidateCount,
    sectionGrammarCandidateStart,
    phraseFamilyCandidateStart,
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
      phase12PhraseFamilyCandidateCount:
        selectionModel === "phase10-section-local-planner" ? candidates.length - phraseFamilyCandidateStart : 0,
      stateHistory: [...stateHistory.slice(0, -1), selectedState],
    }),
  };
}

function avoidShortAlternatingPhraseSelection(input: {
  candidates: readonly Exposition[];
  evaluations: readonly CandidateEvaluation[];
  bestIndex: number;
  baselineCandidateCount: number;
  selectableCandidateCount: number;
  sectionGrammarCandidateStart: number;
  phraseFamilyCandidateStart: number;
  baselineEvaluation: CandidateEvaluation;
  historyContext: HistoryAwareSelectionContext;
  selectionModel: SelectionModel;
}): number {
  if (input.selectionModel !== "phase10-section-local-planner") {
    return input.bestIndex;
  }

  const selectedState = input.candidates[input.bestIndex]?.sectionPlans[0]?.state ?? input.historyContext.plannedState;
  if (!createsShortAlternatingPhrase([...input.historyContext.previousStateHistory, selectedState])) {
    return input.bestIndex;
  }

  let fallbackIndex = input.bestIndex;
  let fallbackScore = Number.POSITIVE_INFINITY;

  for (const [index, evaluation] of input.evaluations.entries()) {
    const isSectionLocalCandidate = index >= input.baselineCandidateCount;
    const isSectionGrammarCandidate =
      index >= input.sectionGrammarCandidateStart && index < input.phraseFamilyCandidateStart;
    const isPhraseFamilyCandidate = index >= input.phraseFamilyCandidateStart;
    if (isPhraseFamilyCandidate || (index >= input.selectableCandidateCount && !isSectionGrammarCandidate)) {
      continue;
    }
    if (evaluation.hardFailures.length > 0) {
      continue;
    }
    if (
      isSectionLocalCandidate &&
      !preservesSectionLocalGuardrails(evaluation, input.baselineEvaluation, isSectionGrammarCandidate)
    ) {
      continue;
    }

    const candidateState = input.candidates[index]?.sectionPlans[0]?.state ?? input.historyContext.plannedState;
    if (createsShortAlternatingPhrase([...input.historyContext.previousStateHistory, candidateState])) {
      continue;
    }

    const candidateScore = isSectionLocalCandidate
      ? selectionScore(evaluation, input.selectionModel)
      : selectionScore(evaluation, "phase10-oracle-selection");
    if (candidateScore < fallbackScore) {
      fallbackIndex = index;
      fallbackScore = candidateScore;
    }
  }

  return fallbackIndex;
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

function phase10SelectableContinuationCandidateCount(state: FugueState): number {
  if (state === "stretto-like") {
    return baselineContinuationCandidateCount(state);
  }

  return baselineContinuationCandidateCount(state) * 2;
}

function phase10SectionGrammarCandidateStartIndex(state: FugueState): number {
  if (state === "stretto-like") {
    return baselineContinuationCandidateCount(state);
  }

  return baselineContinuationCandidateCount(state) * 3;
}

function phase12PhraseFamilyCandidateStartIndex(state: FugueState): number {
  return phase10SectionGrammarCandidateStartIndex(state) + 4;
}

function selectionScore(evaluation: CandidateEvaluation, selectionModel: SelectionModel): number {
  if (selectionModel === "baseline") {
    return evaluation.totalCost;
  }

  return (
    evaluation.totalCost +
    phase10OracleSelectionRiskAdjustment(evaluation) +
    sectionLocalPlannerSelectionRiskAdjustment(evaluation, selectionModel)
  );
}

function phase10OracleSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  if (evaluation.hardFailures.length > 0) {
    return 0;
  }
  if (evaluation.dimensions.harmony.features.modalContextCount > 0) {
    return 0;
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

  return entrySupportInstabilityCount * 1.5 + severeEntryIntervalCount * 3 + unresolvedSevereEntryIntervalCount * 5;
}

function stepwiseFixationSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const { selectedFreeCounterpointStepwiseFixationCost, freeCounterpointRepeatedDegreePatternCount } =
    evaluation.dimensions.melody.features;

  return selectedFreeCounterpointStepwiseFixationCost * 1.5 + freeCounterpointRepeatedDegreePatternCount * 0.01;
}

function voicePairLockstepSelectionRiskAdjustment(evaluation: CandidateEvaluation): number {
  const { selectedVoicePairLockstepSelectionCost, samePitchOverlapCount } = evaluation.dimensions.texture.features;

  return selectedVoicePairLockstepSelectionCost * 1.5 + samePitchOverlapCount * 2;
}

function melodyPreservationRiskAdjustment(evaluation: CandidateEvaluation): number {
  return evaluation.dimensions.melody.features.leapRecoveryMisses * 20;
}

function sectionLocalPlannerSelectionRiskAdjustment(
  evaluation: CandidateEvaluation,
  selectionModel: SelectionModel,
): number {
  if (selectionModel !== "phase10-section-local-planner" || evaluation.hardFailures.length > 0) {
    return 0;
  }

  const highSoloTextureSections = evaluation.explanations.sections.filter((section) => section.soloTextureRisk >= 6);
  const soloTextureRisk = highSoloTextureSections.reduce((sum, section) => sum + section.soloTextureRisk, 0);

  return -soloTextureRisk * 12;
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

  return (
    evaluation.hardFailures.length === 0 &&
    selectedSectionSoloTextureRisk(evaluation) <=
      selectedSectionSoloTextureRisk(baselineEvaluation) - (allowNeutralSoloTexture ? 0 : 4) &&
    evaluationTexture.samePitchOverlapCount <= baselineTexture.samePitchOverlapCount &&
    evaluationTexture.unisonOverlapCount <= baselineTexture.unisonOverlapCount &&
    evaluationTexture.sharedRhythmOverlapCount <= baselineTexture.sharedRhythmOverlapCount &&
    evaluationTexture.fourBeatOuterVoiceSameDirectionRatio <=
      baselineTexture.fourBeatOuterVoiceSameDirectionRatio + 0.02 &&
    evaluationMelody.leapRecoveryMisses <= baselineMelody.leapRecoveryMisses &&
    evaluationSubject.counterSubjectIdentityRetention >= baselineSubject.counterSubjectIdentityRetention
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
): Exposition[] {
  const notes: Exposition["notes"] = [];
  const candidates: Exposition[] = [];
  const sectionLocalPlannerCandidates: Exposition[] = [];
  const registerPlannerCandidates: Exposition[] = [];
  const sectionGrammarCandidates: Exposition[] = [];
  const phraseFamilyOracleCandidates: Exposition[] = [];
  const includeSectionLocalPlannerCandidates = selectionModel === "phase10-section-local-planner";
  const phraseSubject = subject;

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
        candidates.push(buildContinuationSection(phraseSubject.slice(0, 4), input));
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(phraseSubject.slice(0, 4), {
              ...input,
              continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
            }),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(phraseSubject.slice(0, 4), {
              ...input,
              continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
              continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
            }),
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
        candidates.push(buildContinuationSection(phraseSubject, input));
        if (includeSectionLocalPlannerCandidates) {
          sectionLocalPlannerCandidates.push(
            buildContinuationSection(phraseSubject, {
              ...input,
              continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
            }),
          );
          registerPlannerCandidates.push(
            buildContinuationSection(phraseSubject, {
              ...input,
              continuityVoiceCount: phraseContinuityVoiceCount(phraseIntent, 2),
              continuityVoiceOrder: registerBlendedContinuityVoiceOrder(voice),
            }),
          );
        }
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
            cadenceKind: phraseIntent?.cadenceKind,
          }),
        );
      }
    }
  }

  if (includeSectionLocalPlannerCandidates) {
    sectionGrammarCandidates.push(
      ...buildSectionGrammarOracleCandidates(subject, keySignature, state, startTick, sectionDurationTicks),
    );
    phraseFamilyOracleCandidates.push(
      ...buildPhase12PhraseFamilyOracleCandidates(subject, keySignature, state, startTick, sectionDurationTicks),
    );
  }

  candidates.push(...sectionLocalPlannerCandidates);
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

function buildPhase12PhraseFamilyOracleCandidates(
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
    cadenceKind?: CadenceKind;
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
  });
  addContinuityCounterpoint(notes, {
    startTick: entry.startTick + entry.supportDurationTicks,
    durationTicks: Math.max(0, entry.sectionDurationTicks - entry.supportDurationTicks),
    localKey: entry.targetKey,
    harmonicPlan,
    maxVoiceCount: entry.continuityVoiceCount,
    voiceOrder: entry.continuityVoiceOrder,
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
