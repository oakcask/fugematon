import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { KeySignature, NoteEvent } from "./events.js";
import { buildHarmonicPlan } from "./generation/harmony.js";
import { analyzeHarmonicPlans } from "./generation/harmony-diagnostics.js";

const C_MAJOR: KeySignature = { tonic: "C", mode: "major" };

test("analyzeHarmonicPlans measures strong beat harmonic function mismatches", () => {
  const plan = buildHarmonicPlan({
    state: "subject-return",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 6,
    globalKey: C_MAJOR,
    localKey: C_MAJOR,
    targetKey: C_MAJOR,
    styleProfile: "strict-classical",
    cadenceKind: "authentic",
    ambiguityIntent: "none",
  });
  const notes: NoteEvent[] = [
    note("bass", 0, TICKS_PER_QUARTER * 2, 48),
    note("alto", 0, TICKS_PER_QUARTER * 2, 52),
    note("soprano", 0, TICKS_PER_QUARTER * 2, 55),
    note("bass", TICKS_PER_QUARTER * 2, TICKS_PER_QUARTER * 2, 50),
    note("alto", TICKS_PER_QUARTER * 2, TICKS_PER_QUARTER * 2, 52),
    note("soprano", TICKS_PER_QUARTER * 2, TICKS_PER_QUARTER * 2, 59),
    note("bass", TICKS_PER_QUARTER * 4, TICKS_PER_QUARTER * 2, 43),
    note("alto", TICKS_PER_QUARTER * 4, TICKS_PER_QUARTER * 2, 59),
    note("soprano", TICKS_PER_QUARTER * 4, TICKS_PER_QUARTER * 2, 65),
  ];

  const diagnostics = analyzeHarmonicPlans(notes, [plan], []);

  assert.equal(diagnostics.strongBeatDissonanceCount, 1);
  assert.equal(diagnostics.harmonicFunctionMismatches, 1);
  assert.equal(diagnostics.harmonicFunctionMatches, 2);
});

function note(voice: NoteEvent["voice"], startTick: number, durationTicks: number, pitch: number): NoteEvent {
  return {
    kind: "note",
    voice,
    startTick,
    durationTicks,
    pitch,
    velocity: 88,
  };
}
