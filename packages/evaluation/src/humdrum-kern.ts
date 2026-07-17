import type { KeyMode, TimeSignature, Voice } from "@fugematon/core";
import { validateNormalizedScore } from "./corpus.js";
import { inferReferenceAnnotations } from "./inferred-annotations.js";
import {
  EvaluationContractError,
  NORMALIZED_SCORE_SCHEMA_VERSION,
  type NormalizedNote,
  type NormalizedReferenceScore,
} from "./types.js";

const VOICES = ["bass", "tenor", "alto", "soprano"] as const;
const TICKS_PER_QUARTER = 480;
const DIATONIC_PITCH_CLASS: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

type Spine = { voice: Voice; cursor: number };

export function importHumdrumKern(input: {
  scoreId: string;
  kern: string;
  styleProfile?: NormalizedReferenceScore["styleProfile"];
}): NormalizedReferenceScore {
  const lines = input.kern.replaceAll("\r\n", "\n").split("\n");
  const exclusiveIndex = lines.findIndex((line) => line.split("\t").every((token) => token === "**kern"));
  if (exclusiveIndex < 0) {
    fail(
      "evaluation.import.kern-exclusive-interpretation",
      "The source does not declare an all-**kern spine set.",
      "Provide a Humdrum score whose four initial spines use **kern.",
    );
  }
  const initialCount = lines[exclusiveIndex]!.split("\t").length;
  if (initialCount !== 4) {
    fail(
      "evaluation.import.kern-spine-count",
      "The source does not begin with four persistent musical identities.",
      "Choose a four-voice source or map it to four logical voices before import.",
    );
  }
  let spines: Spine[] = VOICES.map((voice) => ({ voice, cursor: 0 }));
  let key: NormalizedReferenceScore["key"] | undefined;
  let meter: TimeSignature | undefined;
  const notes: NormalizedNote[] = [];

  for (const line of lines.slice(exclusiveIndex + 1)) {
    if (line.length === 0 || line.startsWith("!") || line.startsWith("=")) continue;
    const tokens = line.split("\t");
    if (tokens.length !== spines.length) {
      fail(
        "evaluation.import.kern-spine-alignment",
        "A Humdrum record does not align with the active spine topology.",
        "Validate spine split, merge, exchange, and termination records in the source.",
      );
    }
    if (tokens.every((token) => token.startsWith("*"))) {
      key ??= parseKey(tokens);
      meter ??= parseMeter(tokens);
      spines = transformSpines(spines, tokens);
      continue;
    }
    for (const [index, token] of tokens.entries()) {
      if (token === "." || token.startsWith("*")) continue;
      const duration = parseDuration(token);
      if (duration === undefined) continue;
      const spine = spines[index]!;
      if (!token.includes("r") && !token.includes("q")) {
        for (const subtoken of token.split(" ")) {
          const pitch = parseKernPitch(subtoken);
          if (pitch !== undefined) addKernNote(notes, spine, subtoken, pitch, duration);
        }
      }
      spine.cursor += duration;
    }
  }
  if (key === undefined) {
    fail(
      "evaluation.import.kern-key",
      "The source has no supported tonic interpretation.",
      "Add a Humdrum tonic interpretation such as *C: or *c:.",
    );
  }
  if (meter === undefined) {
    fail(
      "evaluation.import.kern-meter",
      "The source has no supported meter interpretation.",
      "Add a Humdrum meter interpretation such as *M4/4.",
    );
  }
  const lengthTicks = Math.max(...spines.map((spine) => spine.cursor), ...notes.map(noteEnd), 1);
  const score: NormalizedReferenceScore = {
    schemaVersion: NORMALIZED_SCORE_SCHEMA_VERSION,
    scoreId: input.scoreId,
    sourceKind: "reference",
    ticksPerQuarter: TICKS_PER_QUARTER,
    lengthTicks,
    voices: ["soprano", "alto", "tenor", "bass"],
    key,
    meter,
    styleProfile: input.styleProfile ?? "strict-classical",
    notes: notes.sort(compareNotes),
    annotations: inferReferenceAnnotations({ notes, lengthTicks, ticksPerQuarter: TICKS_PER_QUARTER }),
  };
  validateNormalizedScore(score);
  return score;
}

function addKernNote(notes: NormalizedNote[], spine: Spine, token: string, pitch: number, durationTicks: number): void {
  if (token.includes("_") || token.includes("]")) {
    for (let index = notes.length - 1; index >= 0; index -= 1) {
      const previous = notes[index]!;
      if (previous.voice === spine.voice && previous.pitch === pitch && noteEnd(previous) === spine.cursor) {
        previous.durationTicks += durationTicks;
        return;
      }
    }
  }
  notes.push({ voice: spine.voice, startTick: spine.cursor, durationTicks, pitch });
}

function transformSpines(spines: Spine[], tokens: string[]): Spine[] {
  const result: Spine[] = [];
  for (let index = 0; index < spines.length; index += 1) {
    const token = tokens[index]!;
    const spine = spines[index]!;
    if (token === "*^") {
      result.push({ ...spine }, { ...spine });
    } else if (token === "*v") {
      const next = spines[index + 1];
      if (tokens[index + 1] !== "*v" || next === undefined || next.voice !== spine.voice) {
        fail(
          "evaluation.import.kern-invalid-merge",
          "A spine merge would combine unrelated logical voices.",
          "Repair the adjacent *v interpretations or provide an explicit voice mapping.",
        );
      }
      result.push({ voice: spine.voice, cursor: Math.max(spine.cursor, next.cursor) });
      index += 1;
    } else if (token === "*x") {
      const next = spines[index + 1];
      if (tokens[index + 1] !== "*x" || next === undefined) {
        fail(
          "evaluation.import.kern-invalid-exchange",
          "A spine exchange is missing its adjacent partner.",
          "Repair the paired *x interpretations.",
        );
      }
      result.push({ ...next }, { ...spine });
      index += 1;
    } else if (token !== "*-") {
      result.push(spine);
    }
  }
  return result;
}

function parseDuration(token: string): number | undefined {
  const match = token.match(/^(\d+)(\.*)/);
  if (match === null) return undefined;
  const reciprocal = Number(match[1]);
  if (reciprocal <= 0) return undefined;
  let quarters = 4 / reciprocal;
  let addition = quarters / 2;
  for (let index = 0; index < match[2]!.length; index += 1) {
    quarters += addition;
    addition /= 2;
  }
  const ticks = quarters * TICKS_PER_QUARTER;
  if (!Number.isInteger(ticks) || ticks <= 0) {
    fail(
      "evaluation.import.kern-duration",
      "A **kern reciprocal cannot be represented on the normalized timebase.",
      "Use a source whose rhythmic values resolve to integer ticks at 480 TPQ.",
    );
  }
  return ticks;
}

function parseKernPitch(token: string): number | undefined {
  const letters = token.match(/[A-Ga-g]+/)?.[0];
  if (letters === undefined) return undefined;
  const letter = letters[0]!.toLowerCase();
  const pitchClass = DIATONIC_PITCH_CLASS[letter];
  if (pitchClass === undefined) return undefined;
  const octave = letters[0] === letters[0]!.toLowerCase() ? 3 + letters.length : 4 - letters.length;
  const accidental = (token.match(/#/g)?.length ?? 0) - (token.match(/-/g)?.length ?? 0);
  const pitch = 12 * (octave + 1) + pitchClass + accidental;
  if (pitch < 0 || pitch > 127) {
    fail(
      "evaluation.import.kern-pitch",
      "A **kern pitch falls outside the normalized MIDI range.",
      "Correct the source pitch spelling or exclude the source.",
    );
  }
  return pitch;
}

function parseKey(tokens: string[]): NormalizedReferenceScore["key"] | undefined {
  for (const token of tokens) {
    const match = token.match(/^\*([A-Ga-g])([#-]?):$/);
    if (match === null) continue;
    const letter = match[1]!;
    return {
      tonic: `${letter.toUpperCase()}${match[2] === "-" ? "b" : match[2]}`,
      mode: normalizeMode(letter === letter.toLowerCase() ? "minor" : "major"),
    };
  }
  return undefined;
}

function parseMeter(tokens: string[]): TimeSignature | undefined {
  for (const token of tokens) {
    const match = token.match(/^\*M(\d+)\/(\d+)$/);
    if (match === null) continue;
    const numerator = Number(match[1]);
    const denominator = Number(match[2]);
    if ((numerator === 3 || numerator === 4 || numerator === 6) && (denominator === 4 || denominator === 8)) {
      return { numerator, denominator };
    }
  }
  return undefined;
}

function normalizeMode(mode: "major" | "minor"): KeyMode {
  return mode;
}

function noteEnd(note: NormalizedNote): number {
  return note.startTick + note.durationTicks;
}

function compareNotes(a: NormalizedNote, b: NormalizedNote): number {
  return (
    VOICES.indexOf(a.voice) - VOICES.indexOf(b.voice) ||
    a.startTick - b.startTick ||
    a.pitch - b.pitch ||
    a.durationTicks - b.durationTicks
  );
}

function fail(id: string, why: string, action: string): never {
  throw new EvaluationContractError({ id, why, action });
}
