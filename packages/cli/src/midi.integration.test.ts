import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main } from "./index.js";

test("midi command writes a valid standard MIDI file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-midi-"));
  try {
    const outputPath = join(directory, "score.mid");

    await main(["midi", "--seed", "bach-001", "--ticks", "7680", "--out", outputPath]);

    const bytes = await readFile(outputPath);
    const result = parseStandardMidiFile(bytes);

    assert.equal(result.format, 1);
    assert.equal(result.trackCount, 5);
    assert.equal(result.division, 480);
    assert.equal(result.endOfTrackCount, 5);
    assert.ok(result.channelEventCount > 0);
    assert.ok(result.metaEventTypes.has(0x51));
    assert.ok(result.metaEventTypes.has(0x58));
    assert.ok(result.metaEventTypes.has(0x59));
    assert.ok(result.metaEventTypes.has(0x03));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("review command writes diagnostics and MIDI files for phase-5 seeds", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-review-"));
  try {
    await main(["review", "--ticks", "960", "--out", directory]);

    const files = await readdir(directory);
    const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8")) as {
      lengthTicks: number;
      seeds: { seed: string; diagnosticsFile: string; midiFile: string }[];
    };

    assert.equal(summary.lengthTicks, 960);
    assert.ok(summary.seeds.length > 1);
    for (const entry of summary.seeds) {
      assert.ok(files.includes(entry.diagnosticsFile));
      assert.ok(files.includes(entry.midiFile));
      assert.ok(!entry.diagnosticsFile.includes(directory));
      assert.ok(!entry.midiFile.includes(directory));
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

type MidiParseResult = {
  format: number;
  trackCount: number;
  division: number;
  channelEventCount: number;
  endOfTrackCount: number;
  metaEventTypes: Set<number>;
};

function parseStandardMidiFile(bytes: Uint8Array): MidiParseResult {
  const cursor = new MidiCursor(bytes);
  cursor.expectAscii("MThd");
  const headerLength = cursor.readUint32();
  assert.equal(headerLength, 6, "MIDI header length must be 6");

  const format = cursor.readUint16();
  const trackCount = cursor.readUint16();
  const division = cursor.readUint16();
  assert.equal((division & 0x8000) === 0, true, "MIDI division must use ticks per quarter note");

  const metaEventTypes = new Set<number>();
  let channelEventCount = 0;
  let endOfTrackCount = 0;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    cursor.expectAscii("MTrk");
    const trackLength = cursor.readUint32();
    const trackEnd = cursor.position + trackLength;
    assert.ok(trackEnd <= bytes.length, "MIDI track length must fit in file");

    const trackResult = parseTrack(cursor, trackEnd);
    channelEventCount += trackResult.channelEventCount;
    endOfTrackCount += trackResult.endOfTrackCount;
    for (const metaType of trackResult.metaEventTypes) {
      metaEventTypes.add(metaType);
    }

    assert.equal(cursor.position, trackEnd, "MIDI track parser must consume the declared length");
  }

  assert.equal(cursor.position, bytes.length, "MIDI file must not contain trailing bytes");

  return {
    format,
    trackCount,
    division,
    channelEventCount,
    endOfTrackCount,
    metaEventTypes,
  };
}

type TrackParseResult = {
  channelEventCount: number;
  endOfTrackCount: number;
  metaEventTypes: Set<number>;
};

function parseTrack(cursor: MidiCursor, trackEnd: number): TrackParseResult {
  let runningStatus: number | undefined;
  let channelEventCount = 0;
  let endOfTrackCount = 0;
  const metaEventTypes = new Set<number>();

  while (cursor.position < trackEnd) {
    cursor.readVariableLengthQuantity(trackEnd);
    const firstByte = cursor.readUint8(trackEnd);

    if (firstByte === 0xff) {
      const metaType = cursor.readUint8(trackEnd);
      const length = cursor.readVariableLengthQuantity(trackEnd);
      cursor.skip(length, trackEnd);
      metaEventTypes.add(metaType);
      runningStatus = undefined;
      if (metaType === 0x2f) {
        assert.equal(length, 0, "MIDI end-of-track event must have zero length");
        endOfTrackCount += 1;
      }
      continue;
    }

    if (firstByte === 0xf0 || firstByte === 0xf7) {
      const length = cursor.readVariableLengthQuantity(trackEnd);
      cursor.skip(length, trackEnd);
      runningStatus = undefined;
      continue;
    }

    let status = firstByte;
    let dataBytesAlreadyRead = 0;
    if (firstByte < 0x80) {
      if (runningStatus === undefined) {
        throw new Error("MIDI running status requires a previous channel status");
      }
      status = runningStatus;
      dataBytesAlreadyRead = 1;
    } else {
      assert.ok(status >= 0x80 && status <= 0xef, "MIDI event must be meta, sysex, or channel voice");
      runningStatus = status;
    }

    const dataByteCount = channelDataByteCount(status);
    for (let index = dataBytesAlreadyRead; index < dataByteCount; index += 1) {
      const dataByte = cursor.readUint8(trackEnd);
      assert.ok(dataByte < 0x80, "MIDI channel event data bytes must be below 0x80");
    }
    channelEventCount += 1;
  }

  return {
    channelEventCount,
    endOfTrackCount,
    metaEventTypes,
  };
}

function channelDataByteCount(status: number): 1 | 2 {
  const eventType = status & 0xf0;
  if (eventType === 0xc0 || eventType === 0xd0) {
    return 1;
  }
  return 2;
}

class MidiCursor {
  position = 0;

  constructor(private readonly bytes: Uint8Array) {}

  expectAscii(expected: string): void {
    const actual = String.fromCharCode(...this.readBytes(expected.length));
    assert.equal(actual, expected);
  }

  readUint8(limit = this.bytes.length): number {
    assert.ok(this.position < limit, "MIDI parser read past declared boundary");
    const value = this.bytes[this.position];
    assert.notEqual(value, undefined, "MIDI parser read past end of file");
    this.position += 1;
    return value;
  }

  readUint16(): number {
    return (this.readUint8() << 8) | this.readUint8();
  }

  readUint32(): number {
    return ((this.readUint8() << 24) | (this.readUint8() << 16) | (this.readUint8() << 8) | this.readUint8()) >>> 0;
  }

  readVariableLengthQuantity(limit: number): number {
    let value = 0;
    for (let index = 0; index < 4; index += 1) {
      const byte = this.readUint8(limit);
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) {
        return value;
      }
    }

    throw new Error("MIDI variable-length quantity is too long");
  }

  readBytes(length: number): Uint8Array {
    assert.ok(this.position + length <= this.bytes.length, "MIDI parser read past end of file");
    const result = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return result;
  }

  skip(length: number, limit: number): void {
    assert.ok(this.position + length <= limit, "MIDI event length must fit in track");
    this.position += length;
  }
}
