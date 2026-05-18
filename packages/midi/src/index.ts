import type { KeySignature, ScoreEvent, TimeSignature, Voice } from "@fugematon/core";
import { TICKS_PER_QUARTER, VOICES } from "@fugematon/core";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  type PerformanceEvent,
  type PerformanceProfileId,
  type PerformanceProfileMetadata,
  performanceProfileMetadata,
  resolvePerformanceProfile,
  scoreToPerformanceEvents,
} from "@fugematon/performance";

const KEY_SIGNATURES = new Map<string, number>([
  ["Cb", -7],
  ["Gb", -6],
  ["Db", -5],
  ["Ab", -4],
  ["Eb", -3],
  ["Bb", -2],
  ["F", -1],
  ["C", 0],
  ["G", 1],
  ["D", 2],
  ["A", 3],
  ["E", 4],
  ["B", 5],
  ["F#", 6],
  ["C#", 7],
]);

type MidiEvent = {
  tick: number;
  order: number;
  bytes: number[];
};

export type MidiExportOptions = {
  performanceProfileId?: PerformanceProfileId;
  seed?: string;
};

export function exportMidi(events: readonly ScoreEvent[], options: MidiExportOptions = {}): Uint8Array {
  const profile = resolvePerformanceProfile(options.performanceProfileId ?? DEFAULT_PERFORMANCE_PROFILE_ID);
  const performanceEvents = scoreToPerformanceEvents({ events, profile, seed: options.seed });
  const metadata = performanceProfileMetadata(profile);
  const tracks = [
    encodeTrack(buildMetaTrackEvents(events, metadata)),
    ...VOICES.map((voice) => encodeTrack(buildVoiceTrackEvents(performanceEvents, voice))),
  ];

  return bytes([
    ...ascii("MThd"),
    ...uint32(6),
    ...uint16(1),
    ...uint16(tracks.length),
    ...uint16(TICKS_PER_QUARTER),
    ...tracks.flatMap((trackBytes) => [...ascii("MTrk"), ...uint32(trackBytes.length), ...trackBytes]),
  ]);
}

function buildMetaTrackEvents(events: readonly ScoreEvent[], metadata: PerformanceProfileMetadata): MidiEvent[] {
  const trackEvents: MidiEvent[] = [
    {
      tick: 0,
      order: 1,
      bytes: [0xff, 0x01, ...textPayload(`PerformanceProfile ${metadata.id}@${metadata.version}`)],
    },
  ];

  for (const event of events) {
    if (event.kind === "note") {
      continue;
    }

    if (event.type === "tempo-change") {
      const microsPerQuarter = Math.round(60_000_000 / event.payload.bpm);
      trackEvents.push({
        tick: event.tick,
        order: 0,
        bytes: [0xff, 0x51, 0x03, ...uint24(microsPerQuarter)],
      });
    } else if (event.type === "time-signature") {
      trackEvents.push({
        tick: event.tick,
        order: 0,
        bytes: [0xff, 0x58, 0x04, ...encodeTimeSignature(event.payload)],
      });
    } else if (event.type === "key-signature") {
      trackEvents.push({
        tick: event.tick,
        order: 0,
        bytes: [0xff, 0x59, 0x02, ...encodeKeySignature(event.payload)],
      });
    }
  }

  trackEvents.push({ tick: scoreEndTick(events), order: 4, bytes: [0xff, 0x2f, 0x00] });
  trackEvents.sort((left, right) => left.tick - right.tick || left.order - right.order);
  return trackEvents;
}

function buildVoiceTrackEvents(events: readonly PerformanceEvent[], voice: Voice): MidiEvent[] {
  const voiceEvents = events.filter((event) => event.voice === voice);
  const firstEvent = voiceEvents[0];
  const trackName = firstEvent?.trackName ?? voice;
  const channel = firstEvent?.channel ?? VOICES.indexOf(voice);
  const program = firstEvent?.program ?? 0;
  const pan = firstEvent?.pan ?? 64;
  const volume = firstEvent?.volume ?? 100;
  const trackEvents: MidiEvent[] = [
    {
      tick: 0,
      order: 0,
      bytes: [0xff, 0x03, ...textPayload(trackName)],
    },
    {
      tick: 0,
      order: 1,
      bytes: [0xb0 | channel, 7, volume],
    },
    {
      tick: 0,
      order: 2,
      bytes: [0xb0 | channel, 10, pan],
    },
    {
      tick: 0,
      order: 3,
      bytes: [0xc0 | channel, program],
    },
  ];
  let endTick = 0;

  for (const event of voiceEvents) {
    trackEvents.push({
      tick: event.startTick,
      order: 5,
      bytes: [0x90 | event.channel, event.pitch, event.velocity],
    });
    trackEvents.push({
      tick: event.startTick + event.durationTicks,
      order: 4,
      bytes: [0x80 | event.channel, event.pitch, 0],
    });
    endTick = Math.max(endTick, event.startTick + event.durationTicks);
  }

  trackEvents.push({ tick: endTick, order: 6, bytes: [0xff, 0x2f, 0x00] });
  trackEvents.sort((left, right) => left.tick - right.tick || left.order - right.order);
  return trackEvents;
}

function scoreEndTick(events: readonly ScoreEvent[]): number {
  let endTick = 0;
  for (const event of events) {
    if (event.kind === "note") {
      endTick = Math.max(endTick, event.startTick + event.durationTicks);
    } else {
      endTick = Math.max(endTick, event.tick);
    }
  }

  return endTick;
}

function encodeTrack(events: readonly MidiEvent[]): number[] {
  const track: number[] = [];
  let previousTick = 0;

  for (const event of events) {
    track.push(...variableLengthQuantity(event.tick - previousTick), ...event.bytes);
    previousTick = event.tick;
  }

  return track;
}

function encodeTimeSignature(signature: TimeSignature): [number, number, number, number] {
  return [signature.numerator, Math.log2(signature.denominator), 24, 8] as [number, number, number, number];
}

function encodeKeySignature(signature: KeySignature): [number, number] {
  const fifths = KEY_SIGNATURES.get(relativeMajorTonic(signature)) ?? 0;
  return [fifths & 0xff, signature.mode === "minor" || signature.mode === "aeolian" ? 1 : 0];
}

function relativeMajorTonic(signature: KeySignature): string {
  if (signature.mode === "major") {
    return signature.tonic;
  }
  if (signature.mode === "dorian") {
    return transposeTonicName(signature.tonic, -2);
  }
  if (signature.mode === "mixolydian") {
    return transposeTonicName(signature.tonic, 5);
  }

  return (
    new Map<string, string>([
      ["A", "C"],
      ["E", "G"],
      ["B", "D"],
      ["F#", "A"],
      ["C#", "E"],
      ["G#", "B"],
      ["D#", "F#"],
      ["A#", "C#"],
      ["D", "F"],
      ["G", "Bb"],
      ["C", "Eb"],
      ["F", "Ab"],
      ["Bb", "Db"],
      ["Eb", "Gb"],
      ["Ab", "Cb"],
    ]).get(signature.tonic) ?? "C"
  );
}

function transposeTonicName(tonic: string, semitones: number): string {
  const pitchClasses = new Map<string, number>([
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
  const names = new Map<number, string>([...pitchClasses.entries()].map(([name, pitchClass]) => [pitchClass, name]));
  const pitchClass = pitchClasses.get(tonic);
  if (pitchClass === undefined) {
    return "C";
  }
  return names.get((((pitchClass + semitones) % 12) + 12) % 12) ?? "C";
}

function textPayload(value: string): number[] {
  const payload = ascii(value);
  return [...variableLengthQuantity(payload.length), ...payload];
}

function variableLengthQuantity(value: number): number[] {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error("MIDI delta time must be a non-negative safe integer");
  }

  let buffer = value & 0x7f;
  const output = [buffer];
  value >>>= 7;
  while (value > 0) {
    buffer = (value & 0x7f) | 0x80;
    output.unshift(buffer);
    value >>>= 7;
  }

  return output;
}

function ascii(value: string): number[] {
  return [...value].map((character) => character.charCodeAt(0));
}

function uint16(value: number): [number, number] {
  return [(value >>> 8) & 0xff, value & 0xff];
}

function uint24(value: number): [number, number, number] {
  return [(value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function uint32(value: number): [number, number, number, number] {
  return [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];
}

function bytes(values: readonly number[]): Uint8Array {
  return Uint8Array.from(values.map((value) => value & 0xff));
}
