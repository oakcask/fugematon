import type { FugueState, KeySignature, ScoreEvent, StyleProfile, TimeSignature, Voice } from "@fugematon/core";
import { validateNormalizedScore } from "./corpus.js";
import { NORMALIZED_SCORE_SCHEMA_VERSION, type NormalizedReferenceScore } from "./types.js";

const DEFAULT_KEY: KeySignature = { tonic: "C", mode: "major" };
const DEFAULT_METER: TimeSignature = { numerator: 4, denominator: 4 };
const VOICES = ["soprano", "alto", "tenor", "bass"] as const;

export function normalizeGeneratedScore(input: {
  scoreId: string;
  events: readonly ScoreEvent[];
  styleProfile?: StyleProfile;
}): NormalizedReferenceScore {
  const timebase = input.events.find((event) => event.kind === "meta" && event.type === "timebase");
  const end = input.events.find((event) => event.kind === "meta" && event.type === "score-end");
  const key = input.events.find((event) => event.kind === "meta" && event.type === "key-signature");
  const meter = input.events.find((event) => event.kind === "meta" && event.type === "time-signature");
  const stateChanges = input.events
    .filter(
      (event): event is Extract<ScoreEvent, { kind: "meta"; type: "state-change" }> =>
        event.kind === "meta" && event.type === "state-change",
    )
    .sort((a, b) => a.tick - b.tick);
  const notes = input.events
    .filter((event): event is Extract<ScoreEvent, { kind: "note" }> => event.kind === "note")
    .map((note) => ({
      voice: note.voice,
      startTick: note.startTick,
      durationTicks: note.durationTicks,
      pitch: note.pitch,
      role: note.role,
    }))
    .sort(compareNotes);
  const lengthTicks =
    end?.payload.lengthTicks ?? Math.max(...notes.map((note) => note.startTick + note.durationTicks), 1);
  const sections = stateChanges.map((event, index) => ({
    id: `section-${index + 1}`,
    startTick: event.tick,
    endTick: stateChanges[index + 1]?.tick ?? lengthTicks,
    role: event.payload.state,
    provenance: { source: "generated" as const, confidence: 1 },
  }));
  const entryRuns: Array<{
    startTick: number;
    endTick: number;
    voice: Voice;
    form: "subject" | "answer" | "subject-fragment";
  }> = [];
  for (const note of notes.filter(
    (candidate) => candidate.role === "subject" || candidate.role === "answer" || candidate.role === "subject-fragment",
  )) {
    const previous = entryRuns.at(-1);
    if (previous?.voice === note.voice && previous.form === note.role && note.startTick <= previous.endTick) {
      previous.endTick = Math.max(previous.endTick, note.startTick + note.durationTicks);
    } else {
      entryRuns.push({
        startTick: note.startTick,
        endTick: note.startTick + note.durationTicks,
        voice: note.voice,
        form: note.role as "subject" | "answer" | "subject-fragment",
      });
    }
  }
  const entries = entryRuns.map((entry, index) => ({
    id: `entry-${index + 1}`,
    ...entry,
    provenance: { source: "generated" as const, confidence: 1 },
  }));
  const score: NormalizedReferenceScore = {
    schemaVersion: NORMALIZED_SCORE_SCHEMA_VERSION,
    scoreId: input.scoreId,
    sourceKind: "generated",
    ticksPerQuarter: timebase?.payload.ticksPerQuarter ?? 480,
    lengthTicks,
    voices: VOICES,
    key: key?.payload ?? DEFAULT_KEY,
    meter: meter?.payload ?? DEFAULT_METER,
    styleProfile: input.styleProfile ?? "hybrid",
    notes,
    annotations: { entries, sections: sections.length > 0 ? sections : [defaultSection(lengthTicks)], cadences: [] },
  };
  validateNormalizedScore(score);
  return score;
}

function defaultSection(lengthTicks: number): {
  id: string;
  startTick: number;
  endTick: number;
  role: FugueState;
  provenance: { source: "inferred"; confidence: number };
} {
  return {
    id: "section-1",
    startTick: 0,
    endTick: lengthTicks,
    role: "exposition",
    provenance: { source: "inferred", confidence: 0.5 },
  };
}

function compareNotes(
  a: { voice: Voice; startTick: number; pitch: number },
  b: { voice: Voice; startTick: number; pitch: number },
): number {
  return VOICES.indexOf(a.voice) - VOICES.indexOf(b.voice) || a.startTick - b.startTick || a.pitch - b.pitch;
}
