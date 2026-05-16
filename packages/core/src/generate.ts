import { DEFAULT_GENERATION_PARAMETERS, GENERATOR_VERSION, TICKS_PER_QUARTER, VOICE_RANGES } from "./constants.js";
import type {
  AnswerKind,
  DiagnosticIssue,
  EntryForm,
  FugueState,
  GenerationInput,
  GenerationOutput,
  GenerationParameters,
  KeyMode,
  KeySignature,
  NoteEvent,
  PlannedEntry,
  ScoreEvent,
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
};
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
const CONSONANT_OFFSETS: Record<Voice, number> = {
  soprano: 12,
  alto: 7,
  tenor: -5,
  bass: -12,
};
const ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 4;
const CONTINUATION_SECTION_TICKS = TICKS_PER_QUARTER * 8;
const STRETTO_ENTRY_SPACING_TICKS = TICKS_PER_QUARTER * 2;
const CONTINUATION_STATE_SEQUENCE: FugueState[] = ["episode", "subject-return", "episode", "stretto-like"];

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const rng = Xoshiro128StarStar.fromSeed(input.seed);
  const parameters = normalizeParameters(input.parameters);
  const keySignature = chooseKeySignature(rng);
  const timeSignature = chooseTimeSignature(rng);
  const bpm = chooseTempo(rng);
  const subject = buildSubject(rng, keySignature);
  const score = buildFugueScore(subject, keySignature, input.lengthTicks, rng);
  const diagnostics = analyzeScore(score.notes, score.subjectEntries);
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
      stateTransitions: score.stateTransitions,
      subjectEntries: score.subjectEntries,
      rangeViolations: diagnostics.rangeViolations,
      voiceCrossings: diagnostics.voiceCrossings,
      parallelPerfects: diagnostics.parallelPerfects,
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      keyMetadataMismatches: diagnostics.keyMetadataMismatches,
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

function chooseKeySignature(rng: Xoshiro128StarStar): KeySignature {
  const mode: KeyMode = rng.chooseWeighted([
    { value: "major", weight: 55 },
    { value: "minor", weight: 45 },
  ]);

  return {
    tonic: TONICS[rng.nextInt(TONICS.length)]!,
    mode,
  };
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
  endTick: number;
};

type FugueScore = Exposition & {
  candidateEvaluations: number;
  stateTransitions: FugueState[];
  stateChanges: {
    tick: number;
    state: FugueState;
  }[];
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
  const stateTransitions: FugueState[] = ["exposition"];
  const stateChanges: FugueScore["stateChanges"] = [];
  let candidateEvaluations = 0;
  let sectionStartTick = exposition.endTick;
  let stateIndex = 0;

  while (sectionStartTick < lengthTicks) {
    const state = CONTINUATION_STATE_SEQUENCE[stateIndex % CONTINUATION_STATE_SEQUENCE.length]!;
    stateTransitions.push(state);
    stateChanges.push({ tick: sectionStartTick, state });
    const selection = chooseContinuationSection(subject, keySignature, state, sectionStartTick, rng, notes);
    notes.push(...selection.section.notes);
    subjectEntries.push(...selection.section.subjectEntries);
    candidateEvaluations += selection.candidateCount;
    sectionStartTick += CONTINUATION_SECTION_TICKS;
    stateIndex += 1;
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    candidateEvaluations,
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function buildExposition(subject: readonly SubjectNote[], keySignature: KeySignature): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];

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
    addSustainedCounterpoint(notes, voice, startTick, subjectDuration(subject), tonicPitchClass(keySignature));
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function chooseContinuationSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  rng: Xoshiro128StarStar,
  previousNotes: readonly NoteEvent[],
): { section: Exposition; candidateCount: number } {
  const candidates = buildContinuationCandidates(subject, keySignature, state, startTick, rng);
  let best = candidates[0]!;
  let bestScore = scoreCandidate(previousNotes, best);

  for (const candidate of candidates.slice(1)) {
    const score = scoreCandidate(previousNotes, candidate);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return { section: best, candidateCount: candidates.length };
}

function buildContinuationCandidates(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
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
            supportDurationTicks: TICKS_PER_QUARTER * 2,
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
            supportDurationTicks: subjectDuration(subject),
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
          endTick: startTick,
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
    answerKind?: AnswerKind;
    supportDurationTicks: number;
  },
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];

  addSubjectEntry(notes, subjectEntries, subject, entry);
  addSustainedCounterpoint(
    notes,
    entry.voice,
    entry.startTick,
    entry.supportDurationTicks,
    tonicPitchClass(entry.localKey),
  );
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
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
  },
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];

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
  addSustainedCounterpoint(
    notes,
    entry.firstVoice,
    entry.startTick,
    subjectDuration(subject),
    tonicPitchClass(entry.globalKey),
  );
  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function scoreCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): number {
  const diagnostics = analyzeScore([...previousNotes, ...candidate.notes], candidate.subjectEntries);

  return diagnostics.rangeViolations * 10_000 + diagnostics.voiceCrossings * 1_000 + diagnostics.parallelPerfects * 10;
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

function addSustainedCounterpoint(
  notes: Exposition["notes"],
  enteringVoice: Voice,
  entryStartTick: number,
  entryDurationTicks: number,
  tonicPitchClass: number,
): void {
  const supportDuration = TICKS_PER_QUARTER * 2;
  for (const voice of VOICE_ENTRY_ORDER) {
    if (voice === enteringVoice) {
      continue;
    }

    const startTick = entryStartTick + TICKS_PER_QUARTER;
    if (startTick >= entryStartTick + entryDurationTicks) {
      continue;
    }
    if (hasOverlap(notes, voice, startTick, supportDuration)) {
      continue;
    }

    notes.push({
      kind: "note",
      voice,
      startTick,
      durationTicks: supportDuration,
      pitch: placePitchInRegister(
        positiveModulo(tonicPitchClass + CONSONANT_OFFSETS[voice], 12),
        voice,
        VOICE_REGISTER_TARGETS[voice],
      ),
      velocity: 56,
    });
  }
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
): {
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  keyMetadataMismatches: number;
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
  let previousVerticality: Map<Voice, number> | undefined;

  for (const tick of checkpoints) {
    const active = activePitchesAt(notes, tick);
    issues.push(...findVoiceCrossings(active, tick));
    if (previousVerticality !== undefined) {
      issues.push(...findParallelPerfects(previousVerticality, active, tick));
    }
    previousVerticality = active;
  }
  issues.push(...findEntryPlanIssues(notes, subjectEntries));

  const rangeViolations = countIssues(issues, "range-violation");
  const voiceCrossings = countIssues(issues, "voice-crossing");
  const parallelPerfects = countIssues(issues, "parallel-perfect");
  const subjectIdentityViolations = countIssues(issues, "subject-identity-violation");
  const answerPlanViolations = countIssues(issues, "answer-plan-violation");
  const keyMetadataMismatches = countIssues(issues, "key-metadata-mismatch");
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

  return {
    rangeViolations,
    voiceCrossings,
    parallelPerfects,
    subjectIdentityViolations,
    answerPlanViolations,
    keyMetadataMismatches,
    issues,
    warnings,
  };
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

function activePitchesAt(notes: readonly NoteEvent[], tick: number): Map<Voice, number> {
  const active = new Map<Voice, number>();
  for (const voice of VOICE_ENTRY_ORDER) {
    const note = notes
      .filter((candidate) => candidate.voice === voice)
      .find((candidate) => candidate.startTick <= tick && tick < candidate.startTick + candidate.durationTicks);
    if (note !== undefined) {
      active.set(voice, note.pitch);
    }
  }
  return active;
}

function findVoiceCrossings(active: Map<Voice, number>, tick: number): DiagnosticIssue[] {
  const adjacentPairs: [higher: Voice, lower: Voice][] = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];
  const issues: DiagnosticIssue[] = [];

  for (const [higher, lower] of adjacentPairs) {
    const higherPitch = active.get(higher);
    const lowerPitch = active.get(lower);
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
  previous: Map<Voice, number>,
  current: Map<Voice, number>,
  tick: number,
): DiagnosticIssue[] {
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

      const previousInterval = Math.abs(previousLeft - previousRight) % 12;
      const currentInterval = Math.abs(currentLeft - currentRight) % 12;
      const leftMotion = Math.sign(currentLeft - previousLeft);
      const rightMotion = Math.sign(currentRight - previousRight);
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
          pitches: { [left]: currentLeft, [right]: currentRight },
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
