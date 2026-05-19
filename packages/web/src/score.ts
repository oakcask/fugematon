import type {
  FugueState,
  GenerationOutput,
  MetaEvent,
  PlannedEntry,
  ScoreEvent,
  TimeSignature,
  Voice,
} from "@fugematon/core";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  getPerformanceProfile,
  type PerformanceProfileId,
  type PerformanceProfileMetadata,
  performanceProfileMetadata,
  scoreToPerformanceEvents,
  type VoicePerformanceSettings,
} from "@fugematon/performance";

export type PlaybackEntry = PlannedEntry;

export type PlaybackNote = {
  voice: Voice;
  startTick: number;
  endTick: number;
  startSecond: number;
  durationSecond: number;
  pitch: number;
  velocity: number;
  volume: number;
  gain: number;
  pan: number;
  oscillatorType: VoicePerformanceSettings["oscillatorType"];
  releaseSeconds: number;
  entry?: PlaybackEntry;
};

export type PlaybackModel = {
  bpm: number;
  ticksPerQuarter: number;
  timeSignature: TimeSignature;
  totalTicks: number;
  totalSeconds: number;
  notes: PlaybackNote[];
  stateTransitions: FugueState[];
  subjectEntries: PlaybackEntry[];
  performanceProfile: PerformanceProfileMetadata;
  pitchRange: {
    min: number;
    max: number;
  };
};

const DEFAULT_BPM = 84;
const DEFAULT_TICKS_PER_QUARTER = 480;
const DEFAULT_TIME_SIGNATURE: TimeSignature = { numerator: 4, denominator: 4 };

export function createPlaybackModel(
  output: GenerationOutput,
  performanceProfileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
): PlaybackModel {
  const bpm = readBpm(output.events) ?? DEFAULT_BPM;
  const ticksPerQuarter = readTicksPerQuarter(output.events) ?? DEFAULT_TICKS_PER_QUARTER;
  const timeSignature = readTimeSignature(output.events) ?? DEFAULT_TIME_SIGNATURE;
  const totalTicks = readScoreEndTick(output.events) ?? output.diagnostics.generatedUntilTick;
  const subjectEntries = output.diagnostics.subjectEntries.map((entry) => ({ ...entry }));
  const subjectEntryByNoteStart = new Map(
    subjectEntries.map((entry) => [entryKey(entry.voice, entry.startTick), entry]),
  );
  const performanceEvents = scoreToPerformanceEvents({
    events: output.events,
    seed: output.diagnostics.seed,
    profile: performanceProfileId,
  });
  const notes = performanceEvents.map((note) => {
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
      volume: note.volume,
      gain: note.gain,
      pan: note.pan,
      oscillatorType: note.oscillatorType,
      releaseSeconds: note.releaseSeconds,
      entry: subjectEntryByNoteStart.get(entryKey(note.voice, note.startTick)),
    };
  });

  return {
    bpm,
    ticksPerQuarter,
    timeSignature,
    totalTicks,
    totalSeconds: ticksToSeconds(totalTicks, bpm, ticksPerQuarter),
    notes,
    stateTransitions: output.diagnostics.stateTransitions,
    subjectEntries,
    performanceProfile: performanceProfileMetadata(getPerformanceProfile(performanceProfileId)),
    pitchRange: computePitchRange(notes),
  };
}

export function ticksToSeconds(ticks: number, bpm: number, ticksPerQuarter: number): number {
  return (ticks / ticksPerQuarter) * (60 / bpm);
}

export function secondsToTicks(seconds: number, bpm: number, ticksPerQuarter: number): number {
  return Math.max(0, Math.round((seconds / 60) * bpm * ticksPerQuarter));
}

export function ticksPerBeat(timeSignature: TimeSignature, ticksPerQuarter: number): number {
  return ticksPerQuarter * (4 / timeSignature.denominator);
}

export function ticksPerBar(timeSignature: TimeSignature, ticksPerQuarter: number): number {
  return ticksPerBeat(timeSignature, ticksPerQuarter) * timeSignature.numerator;
}

export function formatTimeSignature(timeSignature: TimeSignature): string {
  return `${timeSignature.numerator}/${timeSignature.denominator}`;
}

export function formatBarBeatPosition(ticks: number, timeSignature: TimeSignature, ticksPerQuarter: number): string {
  const beatTicks = ticksPerBeat(timeSignature, ticksPerQuarter);
  const barTicks = ticksPerBar(timeSignature, ticksPerQuarter);
  const safeTicks = Math.max(0, ticks);
  const barIndex = Math.floor(safeTicks / barTicks);
  const tickWithinBar = safeTicks - barIndex * barTicks;
  const beatIndex = Math.floor(tickWithinBar / beatTicks);

  return `${barIndex + 1}:${beatIndex + 1}`;
}

export function formatBarBeatDuration(ticks: number, timeSignature: TimeSignature, ticksPerQuarter: number): string {
  const beatTicks = ticksPerBeat(timeSignature, ticksPerQuarter);
  const barTicks = ticksPerBar(timeSignature, ticksPerQuarter);
  const safeTicks = Math.max(0, ticks);
  const bars = Math.floor(safeTicks / barTicks);
  const remainingTicks = safeTicks - bars * barTicks;
  const beats = Math.floor(remainingTicks / beatTicks);
  const parts = [`${bars} ${bars === 1 ? "bar" : "bars"}`];

  if (beats > 0) {
    parts.push(`${beats} ${beats === 1 ? "beat" : "beats"}`);
  }

  return parts.join(" + ");
}

export function formatPlaybackPosition(seconds: number, model: PlaybackModel): string {
  const playbackTick = secondsToTicks(seconds, model.bpm, model.ticksPerQuarter);
  return `${Math.floor(seconds)}s / ${formatBarBeatPosition(playbackTick, model.timeSignature, model.ticksPerQuarter)}`;
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

function readTimeSignature(events: readonly ScoreEvent[]): TimeSignature | undefined {
  return findMetaEvent(events, "time-signature")?.payload;
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

function entryKey(voice: Voice, startTick: number): string {
  return `${voice}:${startTick}`;
}
