import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main } from "./index.js";

test("generate command writes score event JSON to stdout", async () => {
  const stdout = await captureConsoleLog(() => main(["generate", "--seed", "bach-001", "--ticks", "960"]));
  const events = JSON.parse(stdout) as { kind: string; type?: string; tick?: number }[];

  assert.ok(events.length > 0);
  assert.equal(events[0]?.kind, "meta");
  assert.equal(events[0]?.type, "generator-version");
  assert.equal(events.at(-1)?.kind, "meta");
  assert.equal(events.at(-1)?.type, "score-end");
  assert.ok((events.at(-1)?.tick ?? 0) >= 960);
});

test("generate command writes score event JSON to a file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-generate-"));
  try {
    const outputPath = join(directory, "score.json");

    await main(["generate", "--seed", "bach-001", "--ticks", "960", "--out", outputPath]);

    const events = JSON.parse(await readFile(outputPath, "utf8")) as { kind: string; type?: string }[];
    assert.ok(events.length > 0);
    assert.equal(events[0]?.type, "generator-version");
    assert.equal(events.at(-1)?.type, "score-end");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("diagnose command writes diagnostics JSON to stdout", async () => {
  const stdout = await captureConsoleLog(() => main(["diagnose", "--seed", "bach-001", "--ticks", "960"]));
  const diagnostics = JSON.parse(stdout) as {
    seed: string;
    lengthTicks: number;
    eventCount: number;
    noteCount: number;
  };

  assert.equal(diagnostics.seed, "bach-001");
  assert.equal(diagnostics.lengthTicks, 960);
  assert.ok(diagnostics.eventCount > 0);
  assert.ok(diagnostics.noteCount > 0);
});

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
    await main(["review", "--ticks", "9600", "--out", directory]);

    const files = await readdir(directory);
    const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      seeds: {
        seed: string;
        diagnosticsFile: string;
        midiFile: string;
        diagnosticsSummary: {
          hardConstraintFailures: number;
          texture: {
            rhythmicIndependenceScore: number;
            samePitchOverlapCount: number;
            maxEntrySupportInstabilityPerEntry: number;
            maxConsecutiveEntrySupportInstabilities: number;
            unresolvedEntrySupportInstabilityCount: number;
            severeEntryIntervalCount: number;
            unresolvedSevereEntryIntervalCount: number;
            soloTexture: {
              unsupportedSoloRunCount: number;
              abruptTextureDropCount: number;
            };
            pitchContourMotion: {
              fourBeat: {
                bassUpperSameDirectionRatio: number;
                bassUpperContraryRatio: number;
              };
              eightBeat: {
                bassUpperSameDirectionRatio: number;
                bassUpperContraryRatio: number;
              };
            };
            stepwisePattern: {
              degreePatternLength: number;
              roles: {
                role: string;
                stepwiseRunRatio: number;
                ascendingStepRatio: number;
                descendingStepRatio: number;
                maxMonotoneStepRun: number;
                repeatedDegreePatternCount: number;
                rolePatternEntropy: number;
              }[];
              sections: {
                role: string;
                state: string;
                maxMonotoneStepRun: number;
                repeatedDegreePatternCount: number;
              }[];
            };
          };
          melody: {
            leapRecoveryMisses: number;
          };
          form: {
            longRunRepetition: {
              continuationPatternWindowSize: number;
              mostRepeatedContinuationPattern: string[];
              mostRepeatedContinuationPatternCount: number;
              uniqueContinuationPatternCount: number;
            };
          };
          candidateEvaluation: {
            featureVersion: number;
            evaluationModelVersion: number;
            selectedCandidateEvaluationCount: number;
            entryExplanationCount: number;
            voicePairExplanationCount: number;
            voiceExplanationCount: number;
            sectionExplanationCount: number;
            maxEntryInstabilityCount: number;
            maxEntrySevereIntervalCount: number;
            maxVoicePairUnisonOverlapCount: number;
            maxVoicePairSharedRhythmOverlapCount: number;
            maxSectionSoloTextureRisk: number;
            totalSectionExplanationCount: number;
            maxSelectedSectionSoloTextureRisk: number;
            averageSelectedSectionSoloTextureRisk: number;
            highSelectedSectionSoloTextureRiskCount: number;
            sectionSoloTextureRiskWarningThreshold: number;
          };
        };
        phase59Gate: {
          passed: boolean;
          failures: unknown[];
          metrics: {
            selectedCandidateEvaluationCount: number;
            maxSelectedCandidateTextureCost: number;
          };
        };
        phase511Gate: {
          passed: boolean;
          failures: unknown[];
          followUps: unknown[];
        };
        phase6Gate: {
          passed: boolean;
          failures: unknown[];
        };
        phase7Gate: {
          passed: boolean;
          failures: unknown[];
        };
      }[];
    };
    const listeningReview = JSON.parse(await readFile(join(directory, "listening-review.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      regressionChecks: string[];
      seeds: {
        seed: string;
        diagnosticsFile: string;
        midiFile: string;
        judgement: string;
        criteria: Record<string, string>;
        notes: string;
        blockers: string[];
      }[];
    };
    const pairwisePreferences = JSON.parse(await readFile(join(directory, "pairwise-preferences.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      preferences: unknown[];
    };

    assert.equal(summary.schemaVersion, 8);
    assert.equal(summary.lengthTicks, 9600);
    assert.ok(summary.seeds.length > 1);
    assert.equal(listeningReview.schemaVersion, 1);
    assert.equal(listeningReview.lengthTicks, 9600);
    assert.ok(listeningReview.regressionChecks.some((check) => check.includes("fugue-smoke")));
    assert.deepEqual(pairwisePreferences, {
      schemaVersion: 1,
      lengthTicks: 9600,
      instructions:
        "Add seed pairs when listening produces a clear preference. These records are candidates for future aesthetic scoring weights and do not override hard constraints.",
      preferences: [],
    });
    for (const entry of summary.seeds) {
      assert.ok(files.includes(entry.diagnosticsFile));
      assert.ok(files.includes(entry.midiFile));
      assert.ok(!entry.diagnosticsFile.includes(directory));
      assert.ok(!entry.midiFile.includes(directory));
      assert.ok(entry.diagnosticsSummary.hardConstraintFailures >= 0);
      assert.ok(entry.diagnosticsSummary.texture.rhythmicIndependenceScore >= 0);
      assert.ok(entry.diagnosticsSummary.texture.rhythmicIndependenceScore <= 1);
      assert.equal(typeof entry.phase59Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase59Gate.failures));
      assert.ok(entry.phase59Gate.metrics.selectedCandidateEvaluationCount >= 0);
      assert.ok(entry.phase59Gate.metrics.maxSelectedCandidateTextureCost >= 0);
      assert.equal(typeof entry.phase511Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase511Gate.failures));
      assert.ok(Array.isArray(entry.phase511Gate.followUps));
      assert.equal(typeof entry.phase6Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase6Gate.failures));
      assert.equal(typeof entry.phase7Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase7Gate.failures));
      assert.ok(entry.diagnosticsSummary.texture.maxEntrySupportInstabilityPerEntry >= 0);
      assert.ok(entry.diagnosticsSummary.texture.maxConsecutiveEntrySupportInstabilities >= 0);
      assert.ok(entry.diagnosticsSummary.texture.unresolvedEntrySupportInstabilityCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.severeEntryIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.unresolvedSevereEntryIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.soloTexture.unsupportedSoloRunCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.soloTexture.abruptTextureDropCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.fourBeat.bassUpperContraryRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.eightBeat.bassUpperContraryRatio >= 0);
      assert.equal(entry.diagnosticsSummary.texture.stepwisePattern.degreePatternLength, 4);
      assert.ok(entry.diagnosticsSummary.texture.stepwisePattern.roles.length >= 5);
      assert.ok(entry.diagnosticsSummary.texture.stepwisePattern.sections.length > 0);
      assert.ok(
        entry.diagnosticsSummary.texture.stepwisePattern.roles.some((summary) => summary.role === "free-counterpoint"),
      );
      assert.equal(entry.diagnosticsSummary.form.longRunRepetition.continuationPatternWindowSize, 4);
      assert.ok(entry.diagnosticsSummary.form.longRunRepetition.mostRepeatedContinuationPatternCount >= 0);
      assert.ok(entry.diagnosticsSummary.form.longRunRepetition.uniqueContinuationPatternCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.featureVersion >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.evaluationModelVersion >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.selectedCandidateEvaluationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.entryExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.voicePairExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.voiceExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.sectionExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxEntryInstabilityCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxEntrySevereIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxVoicePairUnisonOverlapCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxVoicePairSharedRhythmOverlapCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.totalSectionExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxSelectedSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.averageSelectedSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.highSelectedSectionSoloTextureRiskCount >= 0);
      assert.equal(entry.diagnosticsSummary.candidateEvaluation.sectionSoloTextureRiskWarningThreshold, 6);
    }
    for (const entry of listeningReview.seeds) {
      assert.ok(files.includes(entry.diagnosticsFile));
      assert.ok(files.includes(entry.midiFile));
      assert.equal(entry.judgement, "not-reviewed");
      assert.equal(entry.criteria.subjectMemorability, "not-reviewed");
      assert.equal(entry.notes, "");
      if (
        entry.seed === "bach-001" ||
        entry.seed === "fugue-smoke" ||
        entry.seed === "minor-entry" ||
        entry.seed === "wide-key"
      ) {
        assert.deepEqual(entry.blockers, ["manual listening judgement must be pass before Phase 6"]);
      } else {
        assert.deepEqual(entry.blockers, []);
      }
      assert.ok(!entry.diagnosticsFile.includes(directory));
      assert.ok(!entry.midiFile.includes(directory));
    }
    assert.deepEqual(findReviewSeed(summary.seeds, "fugue-smoke").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 2,
      evaluationModelVersion: 7,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 3,
      maxEntrySevereIntervalCount: 3,
      maxVoicePairUnisonOverlapCount: 7,
      maxVoicePairSharedRhythmOverlapCount: 12,
      maxSectionSoloTextureRisk: 8,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 8,
      averageSelectedSectionSoloTextureRisk: 8,
      highSelectedSectionSoloTextureRiskCount: 1,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "modal-cadence").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 2,
      evaluationModelVersion: 7,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 4,
      maxEntrySevereIntervalCount: 3,
      maxVoicePairUnisonOverlapCount: 5,
      maxVoicePairSharedRhythmOverlapCount: 14,
      maxSectionSoloTextureRisk: 8,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 8,
      averageSelectedSectionSoloTextureRisk: 8,
      highSelectedSectionSoloTextureRiskCount: 1,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "modal-answer").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 2,
      evaluationModelVersion: 7,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 3,
      maxEntrySevereIntervalCount: 2,
      maxVoicePairUnisonOverlapCount: 14,
      maxVoicePairSharedRhythmOverlapCount: 20,
      maxSectionSoloTextureRisk: 2,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 2,
      averageSelectedSectionSoloTextureRisk: 2,
      highSelectedSectionSoloTextureRiskCount: 0,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "fugue-smoke").diagnosticsSummary.form.longRunRepetition, {
      continuationPatternWindowSize: 4,
      mostRepeatedContinuationPattern: [],
      mostRepeatedContinuationPatternCount: 0,
      uniqueContinuationPatternCount: 0,
    });
    assert.equal(findReviewSeed(summary.seeds, "contrary-motion").diagnosticsSummary.melody.leapRecoveryMisses, 6);
    assert.equal(findReviewSeed(summary.seeds, "contrary-motion").diagnosticsSummary.texture.samePitchOverlapCount, 3);
    assert.equal(
      listeningReview.seeds.filter((entry) => entry.judgement === "not-reviewed").length,
      listeningReview.seeds.length,
    );
    assert.equal(pairwisePreferences.preferences.length, 0);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("commands reject invalid arguments before writing output", async () => {
  await assert.rejects(() => main(["generate", "--seed", "bach-001", "--ticks", "0"]), /--ticks/);
  await assert.rejects(() => main(["midi", "--seed", "bach-001", "--ticks", "960"]), /missing --out/);
  await assert.rejects(() => main(["unknown"]), /unknown command/);
});

type MidiParseResult = {
  format: number;
  trackCount: number;
  division: number;
  channelEventCount: number;
  endOfTrackCount: number;
  metaEventTypes: Set<number>;
};

function findReviewSeed<T extends { seed: string }>(seeds: readonly T[], seed: string): T {
  const entry = seeds.find((candidate) => candidate.seed === seed);

  assert.ok(entry !== undefined);
  return entry;
}

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

async function captureConsoleLog(action: () => Promise<void>): Promise<string> {
  const originalLog = console.log;
  const chunks: string[] = [];

  console.log = (...args: unknown[]) => {
    chunks.push(args.map(String).join(" "));
  };

  try {
    await action();
  } finally {
    console.log = originalLog;
  }

  return chunks.join("\n");
}
