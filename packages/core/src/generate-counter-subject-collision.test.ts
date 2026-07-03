import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { NoteEvent, PlannedEntry } from "./events.js";
import { summarizeCounterSubjectWindows } from "./generation/quality-vector-subject-material.js";
import { reviewTest } from "./test-profile.js";

const cMajor = { tonic: "C", mode: "major" } as const;

reviewTest("counter-subject support collisions use cyclic pitch-class distance", () => {
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "alto",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 60,
      velocity: 70,
      role: "counter-subject",
    },
    {
      kind: "note",
      voice: "soprano",
      startTick: 0,
      durationTicks: TICKS_PER_QUARTER,
      pitch: 71,
      velocity: 62,
      role: "free-counterpoint",
    },
  ];

  const windows = summarizeCounterSubjectWindows(notes, [plannedEntry()]);

  assert.equal(windows[0]?.supportCollisionCount, 1);
});

function plannedEntry(): PlannedEntry {
  return {
    voice: "tenor",
    form: "subject",
    state: "subject-return",
    startTick: 0,
    globalKey: cMajor,
    localKey: cMajor,
    registerTarget: 52,
    expectedDegreePattern: [],
    actualPitchClassSequence: [],
    metricalIntentPattern: [],
  };
}
