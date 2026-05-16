import {
  DEFAULT_GENERATION_PARAMETERS,
  GENERATOR_VERSION,
  TICKS_PER_QUARTER,
  VOICE_RANGES,
} from "./constants.js";
import type {
  DiagnosticIssue,
  FugueState,
  GenerationInput,
  GenerationOutput,
  GenerationParameters,
  KeyMode,
  KeySignature,
  NoteEvent,
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
const SUBJECT_DEGREES = [0, 2, 4, 5, 7, 5, 4, 2] as const;
const VOICE_ENTRY_ORDER: Voice[] = ["alto", "soprano", "tenor", "bass"];
const VOICE_BASE_OCTAVES: Record<Voice, number> = {
  soprano: 60,
  alto: 55,
  tenor: 48,
  bass: 28,
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
const STATE_SEQUENCE: FugueState[] = ["exposition", "episode", "subject-return", "episode", "stretto-like"];

export function generateScore(input: GenerationInput): GenerationOutput {
  validateInput(input);

  const rng = Xoshiro128StarStar.fromSeed(input.seed);
  const parameters = normalizeParameters(input.parameters);
  const keySignature = chooseKeySignature(rng);
  const timeSignature = chooseTimeSignature(rng);
  const bpm = chooseTempo(rng);
  const subject = buildSubject(rng, keySignature);
  const score = buildFugueScore(subject, keySignature, input.lengthTicks, rng);
  const diagnostics = analyzeExposition(score.notes);
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
      stateTransitions: score.stateTransitions,
      subjectEntries: score.subjectEntries,
      rangeViolations: diagnostics.rangeViolations,
      voiceCrossings: diagnostics.voiceCrossings,
      parallelPerfects: diagnostics.parallelPerfects,
      issues: diagnostics.issues,
      warnings: diagnostics.warnings,
    },
  };
}

export function normalizeParameters(
  parameters: Partial<GenerationParameters> | undefined,
): GenerationParameters {
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
  degree: number;
};

type Exposition = {
  notes: NoteEvent[];
  subjectEntries: GenerationOutput["diagnostics"]["subjectEntries"];
  endTick: number;
};

type FugueScore = Exposition & {
  stateTransitions: FugueState[];
  stateChanges: {
    tick: number;
    state: FugueState;
  }[];
};

function buildSubject(rng: Xoshiro128StarStar, keySignature: KeySignature): SubjectNote[] {
  const shape = rng.chooseWeighted<readonly number[]>([
    { value: SUBJECT_DEGREES, weight: 3 },
    { value: [0, 2, 3, 5, 7, 5, 3, 2] as const, weight: keySignature.mode === "minor" ? 3 : 1 },
    { value: [0, 4, 2, 5, 7, 5, 4, 2] as const, weight: 2 },
  ]);

  let offsetTick = 0;
  return shape.map((degree, index) => {
    const note = {
      offsetTick,
      durationTicks: SUBJECT_DURATIONS[index]!,
      degree,
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
  let sectionStartTick = exposition.endTick;
  let stateIndex = 1;

  while (sectionStartTick < lengthTicks) {
    const state = STATE_SEQUENCE[stateIndex % STATE_SEQUENCE.length]!;
    stateTransitions.push(state);
    stateChanges.push({ tick: sectionStartTick, state });
    const section = buildContinuationSection(subject, keySignature, state, sectionStartTick, rng);
    notes.push(...section.notes);
    subjectEntries.push(...section.subjectEntries);
    sectionStartTick += CONTINUATION_SECTION_TICKS;
    stateIndex += 1;
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    stateTransitions,
    stateChanges,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function buildExposition(subject: readonly SubjectNote[], keySignature: KeySignature): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }

  for (const [entryIndex, voice] of VOICE_ENTRY_ORDER.entries()) {
    const form = entryIndex % 2 === 0 ? "subject" : "answer";
    const startTick = entryIndex * ENTRY_SPACING_TICKS;
    const pitchClassOffset = form === "answer" ? 7 : 0;
    addSubjectEntry(notes, subjectEntries, subject, {
      state: "exposition",
      voice,
      form,
      startTick,
      tonic,
      pitchClassOffset,
    });
    addSustainedCounterpoint(notes, voice, startTick, subjectDuration(subject), tonic);
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function buildContinuationSection(
  subject: readonly SubjectNote[],
  keySignature: KeySignature,
  state: FugueState,
  startTick: number,
  rng: Xoshiro128StarStar,
): Exposition {
  const notes: Exposition["notes"] = [];
  const subjectEntries: Exposition["subjectEntries"] = [];
  const tonic = TONIC_PITCH_CLASSES.get(keySignature.tonic);
  if (tonic === undefined) {
    throw new Error(`unsupported tonic: ${keySignature.tonic}`);
  }

  if (state === "episode") {
    const voice = VOICE_ENTRY_ORDER[rng.nextInt(VOICE_ENTRY_ORDER.length)]!;
    addSubjectEntry(notes, subjectEntries, subject.slice(0, 4), {
      state,
      voice,
      form: "subject-fragment",
      startTick,
      tonic,
      pitchClassOffset: choose(rng, [0, 5, 7] as const),
    });
    addSustainedCounterpoint(notes, voice, startTick, TICKS_PER_QUARTER * 2, tonic);
  } else if (state === "subject-return") {
    const voice = VOICE_ENTRY_ORDER[rng.nextInt(VOICE_ENTRY_ORDER.length)]!;
    addSubjectEntry(notes, subjectEntries, subject, {
      state,
      voice,
      form: "subject",
      startTick,
      tonic,
      pitchClassOffset: choose(rng, [0, 5, 7, 9] as const),
    });
    addSustainedCounterpoint(notes, voice, startTick, subjectDuration(subject), tonic);
  } else {
    const firstVoiceIndex = rng.nextInt(VOICE_ENTRY_ORDER.length);
    const firstVoice = VOICE_ENTRY_ORDER[firstVoiceIndex]!;
    const secondVoice = VOICE_ENTRY_ORDER[(firstVoiceIndex + 2) % VOICE_ENTRY_ORDER.length]!;
    addSubjectEntry(notes, subjectEntries, subject.slice(0, 6), {
      state,
      voice: firstVoice,
      form: "subject",
      startTick,
      tonic,
      pitchClassOffset: 0,
    });
    addSubjectEntry(notes, subjectEntries, subject.slice(0, 6), {
      state,
      voice: secondVoice,
      form: "answer",
      startTick: startTick + STRETTO_ENTRY_SPACING_TICKS,
      tonic,
      pitchClassOffset: 7,
    });
    addSustainedCounterpoint(notes, firstVoice, startTick, subjectDuration(subject), tonic);
  }

  notes.sort(compareNoteEvents);

  return {
    notes,
    subjectEntries,
    endTick: Math.max(...notes.map((note) => note.startTick + note.durationTicks)),
  };
}

function addSubjectEntry(
  notes: NoteEvent[],
  subjectEntries: Exposition["subjectEntries"],
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    voice: Voice;
    form: "subject" | "answer" | "subject-fragment";
    startTick: number;
    tonic: number;
    pitchClassOffset: number;
  },
): void {
  subjectEntries.push({
    voice: entry.voice,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    pitchClassOffset: entry.pitchClassOffset,
  });

  for (const note of subject) {
    notes.push({
      kind: "note",
      voice: entry.voice,
      startTick: entry.startTick + note.offsetTick,
      durationTicks: note.durationTicks,
      pitch: fitPitchToRange(
        VOICE_BASE_OCTAVES[entry.voice] + entry.tonic + entry.pitchClassOffset + note.degree,
        entry.voice,
      ),
      velocity: entry.form === "answer" ? 86 : 92,
    });
  }
}

function choose<T>(rng: Xoshiro128StarStar, values: readonly T[]): T {
  if (values.length === 0) {
    throw new Error("values must not be empty");
  }

  return values[rng.nextInt(values.length)]!;
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
      pitch: fitPitchToRange(VOICE_BASE_OCTAVES[voice] + tonicPitchClass + CONSONANT_OFFSETS[voice], voice),
      velocity: 56,
    });
  }
}

function subjectDuration(subject: readonly SubjectNote[]): number {
  return subject.reduce((duration, note) => duration + note.durationTicks, 0);
}

function hasOverlap(
  notes: readonly NoteEvent[],
  voice: Voice,
  startTick: number,
  durationTicks: number,
): boolean {
  const endTick = startTick + durationTicks;
  return notes.some(
    (note) =>
      note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
  );
}

function fitPitchToRange(pitch: number, voice: Voice): number {
  const range = VOICE_RANGES[voice];
  let fitted = pitch;
  while (fitted < range.min) {
    fitted += 12;
  }
  while (fitted > range.max) {
    fitted -= 12;
  }
  return fitted;
}

function analyzeExposition(notes: readonly NoteEvent[]): {
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
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

  const rangeViolations = countIssues(issues, "range-violation");
  const voiceCrossings = countIssues(issues, "voice-crossing");
  const parallelPerfects = countIssues(issues, "parallel-perfect");
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

  return { rangeViolations, voiceCrossings, parallelPerfects, issues, warnings };
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
