import type { KeyMode, TimeSignature } from "@fugematon/core";
import { validateNormalizedScore } from "./corpus.js";
import { inferReferenceAnnotations } from "./inferred-annotations.js";
import {
  EvaluationContractError,
  NORMALIZED_SCORE_SCHEMA_VERSION,
  type NormalizedNote,
  type NormalizedReferenceScore,
} from "./types.js";

const VOICES = ["soprano", "alto", "tenor", "bass"] as const;
const STEP_PITCH_CLASS: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const FIFTH_TONICS = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];

export function importMusicXml(input: {
  scoreId: string;
  xml: string;
  styleProfile?: NormalizedReferenceScore["styleProfile"];
}): NormalizedReferenceScore {
  const parts = matches(input.xml, /<part\b[^>]*>([\s\S]*?)<\/part>/g).map((match) => match[1]!);
  if (parts.length !== 4) {
    fail(
      "evaluation.import.musicxml-part-count",
      "MusicXML does not expose exactly four persistent parts.",
      "Provide a four-part score or map the source to four parts before import.",
    );
  }
  const divisions = integerTag(parts[0]!, "divisions");
  if (divisions === undefined || divisions <= 0) {
    fail(
      "evaluation.import.musicxml-timebase",
      "MusicXML divisions are missing or invalid.",
      "Add a positive <divisions> value to the first part.",
    );
  }
  const fifths = integerTag(parts[0]!, "fifths") ?? 0;
  const mode = textTag(parts[0]!, "mode") ?? "major";
  const beats = integerTag(parts[0]!, "beats") ?? 4;
  const beatType = integerTag(parts[0]!, "beat-type") ?? 4;
  const meter = normalizeMeter(beats, beatType);
  const notes: NormalizedNote[] = [];
  let lengthTicks = 0;
  for (const [partIndex, part] of parts.entries()) {
    const voice = VOICES[partIndex]!;
    let cursor = 0;
    for (const token of matches(part, /<(note|backup|forward)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      const kind = token[1]!;
      const body = token[2]!;
      const duration = integerTag(body, "duration");
      if (duration === undefined || duration <= 0) {
        fail(
          "evaluation.import.musicxml-duration",
          "A MusicXML timing token has no positive duration.",
          "Add a positive <duration> to each note, backup, and forward token.",
        );
      }
      if (kind === "backup") {
        cursor -= duration;
        continue;
      }
      if (kind === "forward") {
        cursor += duration;
        continue;
      }
      if (!body.includes("<chord") && !body.includes("<grace")) {
        if (!body.includes("<rest")) {
          notes.push({ voice, startTick: cursor, durationTicks: duration, pitch: parsePitch(body) });
        }
        cursor += duration;
      }
      lengthTicks = Math.max(lengthTicks, cursor);
    }
  }
  const score: NormalizedReferenceScore = {
    schemaVersion: NORMALIZED_SCORE_SCHEMA_VERSION,
    scoreId: input.scoreId,
    sourceKind: "reference",
    ticksPerQuarter: divisions,
    lengthTicks,
    voices: VOICES,
    key: { tonic: FIFTH_TONICS[fifths + 7] ?? "C", mode: normalizeMode(mode) },
    meter,
    styleProfile: input.styleProfile ?? "strict-classical",
    notes: notes.sort(
      (a, b) => VOICES.indexOf(a.voice) - VOICES.indexOf(b.voice) || a.startTick - b.startTick || a.pitch - b.pitch,
    ),
    annotations: inferReferenceAnnotations({ notes, lengthTicks, ticksPerQuarter: divisions }),
  };
  validateNormalizedScore(score);
  return score;
}

function parsePitch(body: string): number {
  const step = textTag(body, "step");
  const octave = integerTag(body, "octave");
  const alter = integerTag(body, "alter") ?? 0;
  if (step === undefined || octave === undefined || STEP_PITCH_CLASS[step] === undefined) {
    fail(
      "evaluation.import.musicxml-pitch",
      "A pitched note lacks a supported step or octave.",
      "Provide MusicXML pitch step A-G and an integer octave.",
    );
  }
  return (octave + 1) * 12 + STEP_PITCH_CLASS[step]! + alter;
}

function normalizeMode(mode: string): KeyMode {
  return mode === "minor" || mode === "dorian" || mode === "mixolydian" || mode === "aeolian" ? mode : "major";
}

function normalizeMeter(numerator: number, denominator: number): TimeSignature {
  if ((numerator !== 3 && numerator !== 4 && numerator !== 6) || (denominator !== 4 && denominator !== 8)) {
    fail(
      "evaluation.import.musicxml-meter",
      "The imported meter is outside the normalized score contract.",
      "Convert the source to 3/4, 4/4, or 6/8 before import.",
    );
  }
  return { numerator, denominator };
}

function textTag(body: string, tag: string): string | undefined {
  return body.match(new RegExp(`<${tag}\\b[^>]*>\\s*([^<]+?)\\s*</${tag}>`))?.[1];
}

function integerTag(body: string, tag: string): number | undefined {
  const value = textTag(body, tag);
  if (value === undefined || !/^-?\d+$/.test(value)) return undefined;
  return Number(value);
}

function matches(value: string, pattern: RegExp): RegExpMatchArray[] {
  return [...value.matchAll(pattern)];
}

function fail(id: string, why: string, action: string): never {
  throw new EvaluationContractError({ id, why, action });
}
