import type { GenerationOutput, MetaEvent, NoteEvent, ScoreEvent, Voice } from "@fugematon/core";

export type PlaybackNote = {
  voice: Voice;
  startTick: number;
  endTick: number;
  startSecond: number;
  durationSecond: number;
  pitch: number;
  velocity: number;
};

export type PlaybackModel = {
  bpm: number;
  ticksPerQuarter: number;
  totalTicks: number;
  totalSeconds: number;
  notes: PlaybackNote[];
  pitchRange: {
    min: number;
    max: number;
  };
};

const DEFAULT_BPM = 84;
const DEFAULT_TICKS_PER_QUARTER = 480;

export function createPlaybackModel(output: GenerationOutput): PlaybackModel {
  const bpm = readBpm(output.events) ?? DEFAULT_BPM;
  const ticksPerQuarter = readTicksPerQuarter(output.events) ?? DEFAULT_TICKS_PER_QUARTER;
  const totalTicks = readScoreEndTick(output.events) ?? output.diagnostics.generatedUntilTick;
  const notes = output.events.filter(isNoteEvent).map((note) => {
    const startSecond = ticksToSeconds(note.startTick, bpm, ticksPerQuarter);
    const durationSecond = ticksToSeconds(note.durationTicks, bpm, ticksPerQuarter);

    return {
      voice: note.voice,
      startTick: note.startTick,
      endTick: note.startTick + note.durationTicks,
      startSecond,
      durationSecond,
      pitch: note.pitch,
      velocity: note.velocity,
    };
  });

  return {
    bpm,
    ticksPerQuarter,
    totalTicks,
    totalSeconds: ticksToSeconds(totalTicks, bpm, ticksPerQuarter),
    notes,
    pitchRange: computePitchRange(notes),
  };
}

export function ticksToSeconds(ticks: number, bpm: number, ticksPerQuarter: number): number {
  return (ticks / ticksPerQuarter) * (60 / bpm);
}

function computePitchRange(notes: readonly PlaybackNote[]): PlaybackModel["pitchRange"] {
  if (notes.length === 0) {
    return { min: 48, max: 72 };
  }

  return notes.reduce(
    (range, note) => ({
      min: Math.min(range.min, note.pitch),
      max: Math.max(range.max, note.pitch),
    }),
    { min: notes[0]!.pitch, max: notes[0]!.pitch },
  );
}

function readBpm(events: readonly ScoreEvent[]): number | undefined {
  const event = findMetaEvent(events, "tempo-change");
  return event?.payload.bpm;
}

function readTicksPerQuarter(events: readonly ScoreEvent[]): number | undefined {
  const event = findMetaEvent(events, "timebase");
  return event?.payload.ticksPerQuarter;
}

function readScoreEndTick(events: readonly ScoreEvent[]): number | undefined {
  return findMetaEvent(events, "score-end")?.tick;
}

function findMetaEvent<TType extends MetaEvent["type"]>(
  events: readonly ScoreEvent[],
  type: TType,
): Extract<MetaEvent, { type: TType }> | undefined {
  return events.find(
    (event): event is Extract<MetaEvent, { type: TType }> => event.kind === "meta" && event.type === type,
  );
}

function isNoteEvent(event: ScoreEvent): event is NoteEvent {
  return event.kind === "note";
}
