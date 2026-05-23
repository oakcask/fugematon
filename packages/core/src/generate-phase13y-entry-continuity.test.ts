import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { EntryForm, FugueState, KeySignature, NoteEvent, PlannedEntry, Voice } from "./events.js";
import { analyzeEntryBoundaryContinuity } from "./generation/entry-boundary-continuity.js";

const C_MAJOR: KeySignature = { tonic: "C", mode: "major" };

test("entry-boundary continuity keeps first bass evidence separate from later bass windows", () => {
  const entryStartTick = TICKS_PER_QUARTER * 12;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("soprano", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("alto", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("soprano", entryStartTick, TICKS_PER_QUARTER),
      boundaryNote("alto", entryStartTick, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick, TICKS_PER_QUARTER),
    ],
    [entry("bass", "answer", "exposition", entryStartTick)],
  );

  assert.equal(summary.firstBassEntrySynchronizedReset, true);
  assert.equal(summary.firstBassEntryWindow?.classification, "synchronized-reset");
  assert.deepEqual(summary.firstBassEntryWindow?.outsideEndedAtEntryVoices.sort(), ["alto", "soprano", "tenor"]);
  assert.equal(summary.importantEntryWindowCount, 1);
  assert.equal(summary.bassEntryWindowCount, 0);
  assert.equal(summary.synchronizedResetCount, 1);
});

test("entry-boundary continuity accepts carried or delayed support at post-exposition bass entries", () => {
  const entryStartTick = TICKS_PER_QUARTER * 20;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("alto", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER * 2),
      boundaryNote("soprano", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER / 2),
      boundaryNote("soprano", entryStartTick + TICKS_PER_QUARTER / 2, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick, TICKS_PER_QUARTER),
    ],
    [entry("bass", "subject", "subject-return", entryStartTick)],
  );

  const window = summary.windows[0];
  assert.equal(summary.bassEntryWindowCount, 1);
  assert.equal(summary.synchronizedResetCount, 0);
  assert.equal(summary.continuitySupportedCount, 1);
  assert.equal(window?.classification, "continuity-supported");
  assert.equal(window?.entryOrderIndex, 0);
  assert.deepEqual(window?.alreadyEnteredVoices.sort(), ["alto", "soprano", "tenor"]);
  assert.deepEqual(window?.carriedOutsideVoices, ["alto"]);
  assert.deepEqual(window?.delayedOutsideVoices, ["soprano"]);
});

test("entry-boundary continuity exposes one-voice carry with two outside resets at first bass answer", () => {
  const entryStartTick = TICKS_PER_QUARTER * 12;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("soprano", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER * 2),
      boundaryNote("alto", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("alto", entryStartTick, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick, TICKS_PER_QUARTER),
    ],
    [entry("bass", "answer", "exposition", entryStartTick)],
  );

  const window = summary.firstBassEntryWindow;
  assert.equal(summary.firstBassEntrySynchronizedReset, false);
  assert.equal(window?.classification, "one-voice-carry-with-outside-reset");
  assert.equal(summary.oneVoiceCarryWithOutsideResetCount, 1);
  assert.deepEqual(window?.carriedOutsideVoices, ["soprano"]);
  assert.deepEqual(window?.outsideEndedAtEntryVoices.sort(), ["alto", "tenor"]);
  assert.deepEqual(window?.outsideOnsetVoices.sort(), ["alto", "tenor"]);
});

test("entry-boundary continuity still flags unprepared post-exposition bass resets", () => {
  const entryStartTick = TICKS_PER_QUARTER * 28;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("soprano", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("alto", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("soprano", entryStartTick, TICKS_PER_QUARTER),
      boundaryNote("alto", entryStartTick, TICKS_PER_QUARTER),
      boundaryNote("tenor", entryStartTick, TICKS_PER_QUARTER),
    ],
    [entry("bass", "subject", "subject-return", entryStartTick)],
  );

  assert.equal(summary.bassEntryWindowCount, 1);
  assert.equal(summary.synchronizedResetCount, 1);
  assert.equal(summary.continuitySupportedCount, 0);
  assert.equal(summary.windows[0]?.classification, "synchronized-reset");
});

test("entry-boundary continuity reviews non-bass entries by prior entry order and already-entered voices", () => {
  const altoStartTick = TICKS_PER_QUARTER * 4;
  const sopranoStartTick = TICKS_PER_QUARTER * 8;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("alto", altoStartTick, TICKS_PER_QUARTER * 6),
      boundaryNote("tenor", altoStartTick, TICKS_PER_QUARTER),
      boundaryNote("alto", sopranoStartTick, TICKS_PER_QUARTER),
      boundaryNote("tenor", sopranoStartTick + TICKS_PER_QUARTER, TICKS_PER_QUARTER),
    ],
    [entry("alto", "subject", "exposition", altoStartTick), entry("soprano", "answer", "exposition", sopranoStartTick)],
  );

  const window = summary.windows.find((candidate) => candidate.entryVoice === "soprano");
  assert.equal(summary.nonBassEntryWindowCount, 1);
  assert.equal(window?.entryOrderIndex, 1);
  assert.deepEqual(window?.alreadyEnteredVoices.sort(), ["alto", "tenor"]);
  assert.deepEqual(window?.carriedOutsideVoices, ["alto"]);
  assert.deepEqual(window?.staggeredContinuationVoices, ["tenor"]);
  assert.equal(window?.classification, "continuity-supported");
});

test("entry-boundary continuity flags non-bass synchronized resets when multiple entered voices restart", () => {
  const altoStartTick = TICKS_PER_QUARTER * 4;
  const sopranoStartTick = TICKS_PER_QUARTER * 8;
  const tenorStartTick = TICKS_PER_QUARTER * 12;
  const summary = analyzeEntryBoundaryContinuity(
    [
      boundaryNote("alto", altoStartTick, TICKS_PER_QUARTER),
      boundaryNote("soprano", sopranoStartTick, TICKS_PER_QUARTER),
      boundaryNote("alto", tenorStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("soprano", tenorStartTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      boundaryNote("alto", tenorStartTick, TICKS_PER_QUARTER),
      boundaryNote("soprano", tenorStartTick, TICKS_PER_QUARTER),
    ],
    [
      entry("alto", "subject", "exposition", altoStartTick),
      entry("soprano", "answer", "exposition", sopranoStartTick),
      entry("tenor", "subject", "exposition", tenorStartTick),
    ],
  );

  const window = summary.windows.find((candidate) => candidate.entryVoice === "tenor");
  assert.equal(window?.entryOrderIndex, 2);
  assert.deepEqual(window?.alreadyEnteredVoices.sort(), ["alto", "soprano"]);
  assert.equal(window?.classification, "synchronized-reset");
});

function boundaryNote(voice: Voice, startTick: number, durationTicks: number): NoteEvent {
  return {
    kind: "note",
    voice,
    startTick,
    durationTicks,
    pitch: 60,
    velocity: 70,
    role: "free-counterpoint",
  };
}

function entry(voice: Voice, form: EntryForm, state: FugueState, startTick: number): PlannedEntry {
  return {
    voice,
    form,
    state,
    startTick,
    globalKey: C_MAJOR,
    localKey: C_MAJOR,
    registerTarget: 60,
    expectedDegreePattern: [],
    actualPitchClassSequence: [],
    metricalIntentPattern: [],
  };
}
