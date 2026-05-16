import { TICKS_PER_QUARTER, VOICES } from "./constants.js";
import type { KeyMode, KeySignature, ScoreEvent, TimeSignature, Voice } from "./events.js";

const VOICE_CHANNELS: Record<Voice, number> = {
  soprano: 0,
  alto: 1,
  tenor: 2,
  bass: 3,
};

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

export function exportMidi(events: readonly ScoreEvent[]): Uint8Array {
  const tracks = [
    encodeTrack(buildMetaTrackEvents(events)),
    ...VOICES.map((voice) => encodeTrack(buildVoiceTrackEvents(events, voice))),
  ];

  return bytes([
    ...ascii("MThd"),
    ...uint32(6),
    ...uint16(1),
    ...uint16(tracks.length),
    ...uint16(TICKS_PER_QUARTER),
    ...tracks.flatMap((trackBytes) => [
      ...ascii("MTrk"),
      ...uint32(trackBytes.length),
      ...trackBytes,
    ]),
  ]);
}

function buildMetaTrackEvents(events: readonly ScoreEvent[]): MidiEvent[] {
  const trackEvents: MidiEvent[] = [];

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

function buildVoiceTrackEvents(events: readonly ScoreEvent[], voice: Voice): MidiEvent[] {
  const channel = VOICE_CHANNELS[voice];
  const voiceIndex = VOICES.indexOf(voice);
  const trackEvents: MidiEvent[] = [
    {
      tick: 0,
      order: 0,
      bytes: [0xff, 0x03, voice.length, ...ascii(voice)],
    },
    {
      tick: 0,
      order: 1,
      bytes: [0xc0 | channel, voiceIndex === 3 ? 32 : 19],
    },
  ];
  let endTick = 0;

  for (const event of events) {
    if (event.kind !== "note" || event.voice !== voice) {
      continue;
    }

    trackEvents.push({
      tick: event.startTick,
      order: 3,
      bytes: [0x90 | channel, event.pitch, event.velocity],
    });
    trackEvents.push({
      tick: event.startTick + event.durationTicks,
      order: 2,
      bytes: [0x80 | channel, event.pitch, 0],
    });
    endTick = Math.max(endTick, event.startTick + event.durationTicks);
  }

  trackEvents.push({ tick: endTick, order: 4, bytes: [0xff, 0x2f, 0x00] });
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
  return [signature.numerator, Math.log2(signature.denominator), 24, 8] as [
    number,
    number,
    number,
    number,
  ];
}

function encodeKeySignature(signature: KeySignature): [number, number] {
  const fifths = KEY_SIGNATURES.get(relativeMajorTonic(signature)) ?? 0;
  return [fifths & 0xff, signature.mode === "minor" ? 1 : 0];
}

function relativeMajorTonic(signature: KeySignature): string {
  if (signature.mode === "major") {
    return signature.tonic;
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
