import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { EntryForm, FugueState, KeySignature, NoteEvent, PlannedEntry, Voice } from "./events.js";
import { analyzeImportantEntryTailTexture } from "./generation/entry-tail-texture.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const C_MAJOR: KeySignature = { tonic: "C", mode: "major" };

reviewTest("important entry tail texture flags zero outside support for bass entries", () => {
  const startTick = TICKS_PER_QUARTER * 8;
  const summary = analyzeImportantEntryTailTexture(
    [
      note("soprano", startTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      note("alto", startTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER),
      entryNote("bass", "answer", startTick, TICKS_PER_QUARTER * 4),
    ],
    [entry("bass", "answer", "exposition", startTick)],
    startTick + TICKS_PER_QUARTER * 8,
  );

  assert.equal(summary.importantEntryWindowCount, 1);
  assert.equal(summary.zeroOutsideVoiceWindowCount, 1);
  assert.equal(summary.windows[0]?.classification, "zero-outside-tail");
  assert.ok((summary.windows[0]?.zeroOutsideVoiceTicks ?? 0) > 0);
});

reviewTest("important entry tail texture reviews non-bass one-outside thinning", () => {
  const altoStartTick = TICKS_PER_QUARTER * 4;
  const sopranoStartTick = TICKS_PER_QUARTER * 8;
  const summary = analyzeImportantEntryTailTexture(
    [
      entryNote("alto", "subject", altoStartTick, TICKS_PER_QUARTER * 8),
      note("tenor", altoStartTick, TICKS_PER_QUARTER),
      entryNote("soprano", "answer", sopranoStartTick, TICKS_PER_QUARTER * 4),
    ],
    [entry("alto", "subject", "exposition", altoStartTick), entry("soprano", "answer", "exposition", sopranoStartTick)],
    sopranoStartTick + TICKS_PER_QUARTER * 8,
  );

  const window = summary.windows.find((candidate) => candidate.entryVoice === "soprano");
  assert.equal(window?.classification, "one-outside-tail");
  assert.equal(window?.activeOutsideVoices.length, 1);
  assert.ok((window?.oneOutsideVoiceTicks ?? 0) > TICKS_PER_QUARTER * 2);
});

reviewTest("important entry tail texture accepts carried and delayed support", () => {
  const startTick = TICKS_PER_QUARTER * 12;
  const summary = analyzeImportantEntryTailTexture(
    [
      note("alto", startTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER * 6),
      note("tenor", startTick + TICKS_PER_QUARTER, TICKS_PER_QUARTER * 4),
      entryNote("soprano", "subject", startTick, TICKS_PER_QUARTER * 4),
    ],
    [entry("soprano", "subject", "subject-return", startTick)],
    startTick + TICKS_PER_QUARTER * 8,
  );

  assert.equal(summary.reviewRequired, false);
  assert.equal(summary.supportedTailWindowCount, 1);
  assert.equal(summary.windows[0]?.classification, "supported-tail");
});

reviewTest("important entry tail texture includes episode subject fragments", () => {
  const startTick = TICKS_PER_QUARTER * 16;
  const summary = analyzeImportantEntryTailTexture(
    [
      note("bass", startTick - TICKS_PER_QUARTER, TICKS_PER_QUARTER * 6),
      note("tenor", startTick, TICKS_PER_QUARTER * 6),
      entryNote("alto", "subject-fragment", startTick, TICKS_PER_QUARTER * 2),
    ],
    [entry("alto", "subject-fragment", "episode", startTick)],
    startTick + TICKS_PER_QUARTER * 6,
  );

  assert.equal(summary.importantEntryWindowCount, 1);
  assert.equal(summary.windows[0]?.form, "subject-fragment");
  assert.equal(summary.windows[0]?.classification, "supported-tail");
});

test("generated scores expose important entry tail texture without public rest events", () => {
  for (const seed of ["fugue-smoke", "bach-001", "modal-answer"] as const) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 64, selectionModel: "section-local-planner" });
    assert.equal(output.events.some((event) => (event.kind as string) === "rest"), false);
    assert.ok(output.diagnostics.importantEntryTailTexture.importantEntryWindowCount > 0);
    assert.equal(
      output.diagnostics.importantEntryTailTexture.windows.every((window) =>
        ["supported-tail", "one-outside-tail", "zero-outside-tail"].includes(window.classification),
      ),
      true,
    );
  }
});

function note(voice: Voice, startTick: number, durationTicks: number): NoteEvent {
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

function entryNote(voice: Voice, form: EntryForm, startTick: number, durationTicks: number): NoteEvent {
  return {
    ...note(voice, startTick, durationTicks),
    role: form === "answer" ? "answer" : form,
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
