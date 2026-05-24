import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { scoreToPerformanceEvents } from "@fugematon/performance";
import { exportMidi } from "./index.js";

test("exportMidi creates a deterministic standard MIDI file", () => {
  const score = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const first = exportMidi(score.events, { seed: score.diagnostics.seed });
  const second = exportMidi(score.events, { seed: score.diagnostics.seed });

  assert.deepEqual(first, second);
  assert.equal(asAscii(first.slice(0, 4)), "MThd");
  assert.equal(asAscii(first.slice(14, 18)), "MTrk");
  assert.equal((first[8]! << 8) | first[9]!, 1);
  assert.equal((first[10]! << 8) | first[11]!, 5);
  assert.ok(first.length > 100);
});

test("exportMidi preserves the default voice track layout", () => {
  const score = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const midi = exportMidi(score.events, { seed: score.diagnostics.seed });
  const tracks = parseMidiTracks(midi);
  const notesByVoice = new Map(
    ["soprano", "alto", "tenor", "bass"].map((voice) => [
      voice,
      scoreToPerformanceEvents({ events: score.events, seed: score.diagnostics.seed }).filter(
        (event) => event.voice === voice,
      ),
    ]),
  );

  assert.equal(tracks.length, 5);
  assert.deepEqual(
    tracks.slice(1).map((track) => track.trackName),
    ["soprano", "alto", "tenor", "bass"],
  );
  assert.deepEqual(
    tracks.slice(1).map((track) => track.programChange),
    [
      { channel: 0, program: 19 },
      { channel: 1, program: 19 },
      { channel: 2, program: 19 },
      { channel: 3, program: 32 },
    ],
  );
  assert.deepEqual(
    tracks.slice(1).map((track) => track.controllerChanges),
    [
      [
        { channel: 0, controller: 7, value: 127 },
        { channel: 0, controller: 10, value: 84 },
      ],
      [
        { channel: 1, controller: 7, value: 127 },
        { channel: 1, controller: 10, value: 44 },
      ],
      [
        { channel: 2, controller: 7, value: 127 },
        { channel: 2, controller: 10, value: 58 },
      ],
      [
        { channel: 3, controller: 7, value: 127 },
        { channel: 3, controller: 10, value: 64 },
      ],
    ],
  );
  for (const [index, voice] of ["soprano", "alto", "tenor", "bass"].entries()) {
    assert.deepEqual(
      tracks[index + 1]!.noteOnVelocities,
      notesByVoice.get(voice)!.map((note) => note.velocity),
    );
  }
});

test("exportMidi writes performance profile metadata", () => {
  const score = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const tracks = parseMidiTracks(exportMidi(score.events, { performanceProfileId: "strict-counterpoint" }));

  assert.ok(tracks[0]!.textEvents.includes("PerformanceProfile strict-counterpoint@2"));
  assert.deepEqual(
    tracks.slice(1).map((track) => track.programChange),
    [
      { channel: 0, program: 73 },
      { channel: 1, program: 73 },
      { channel: 2, program: 73 },
      { channel: 3, program: 73 },
    ],
  );
});

type ParsedTrack = {
  trackName?: string;
  textEvents: string[];
  programChange?: { channel: number; program: number };
  controllerChanges: { channel: number; controller: number; value: number }[];
  noteOnVelocities: number[];
};

function parseMidiTracks(bytes: Uint8Array): ParsedTrack[] {
  assert.equal(asAscii(bytes.slice(0, 4)), "MThd");
  const trackCount = readUint16(bytes, 10);
  const tracks: ParsedTrack[] = [];
  let offset = 14;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    assert.equal(asAscii(bytes.slice(offset, offset + 4)), "MTrk");
    const trackLength = readUint32(bytes, offset + 4);
    const trackBytes = bytes.slice(offset + 8, offset + 8 + trackLength);
    tracks.push(parseMidiTrack(trackBytes));
    offset += 8 + trackLength;
  }

  return tracks;
}

function parseMidiTrack(bytes: Uint8Array): ParsedTrack {
  const track: ParsedTrack = { controllerChanges: [], noteOnVelocities: [], textEvents: [] };
  let offset = 0;
  let runningStatus: number | undefined;

  while (offset < bytes.length) {
    const delta = readVariableLengthQuantity(bytes, offset);
    offset = delta.nextOffset;
    let status = bytes[offset]!;
    if (status < 0x80) {
      assert.ok(runningStatus !== undefined);
      status = runningStatus;
    } else {
      offset += 1;
      if (status < 0xf0) {
        runningStatus = status;
      }
    }

    if (status === 0xff) {
      const type = bytes[offset]!;
      offset += 1;
      const length = readVariableLengthQuantity(bytes, offset);
      offset = length.nextOffset;
      const payload = bytes.slice(offset, offset + length.value);
      offset += length.value;
      if (type === 0x03) {
        track.trackName = asAscii(payload);
      } else if (type === 0x01) {
        track.textEvents.push(asAscii(payload));
      }
      continue;
    }

    const dataByteCount = channelDataByteCount(status);
    const data = bytes.slice(offset, offset + dataByteCount);
    offset += dataByteCount;
    const eventKind = status & 0xf0;
    if (eventKind === 0xb0) {
      track.controllerChanges.push({ channel: status & 0x0f, controller: data[0]!, value: data[1]! });
    } else if (eventKind === 0xc0) {
      track.programChange = { channel: status & 0x0f, program: data[0]! };
    } else if (eventKind === 0x90 && data[1] !== 0) {
      track.noteOnVelocities.push(data[1]!);
    }
  }

  return track;
}

function channelDataByteCount(status: number): 1 | 2 {
  const eventKind = status & 0xf0;
  if (eventKind === 0xc0 || eventKind === 0xd0) {
    return 1;
  }

  return 2;
}

function readVariableLengthQuantity(bytes: Uint8Array, startOffset: number): { value: number; nextOffset: number } {
  let value = 0;
  let offset = startOffset;
  let byte = 0;

  do {
    byte = bytes[offset]!;
    value = (value << 7) | (byte & 0x7f);
    offset += 1;
  } while ((byte & 0x80) !== 0);

  return { value, nextOffset: offset };
}

function readUint16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 8) | bytes[offset + 1]!;
}

function readUint32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset]! << 24) | (bytes[offset + 1]! << 16) | (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
}

function asAscii(bytes: Uint8Array): string {
  return String.fromCharCode(...bytes);
}
