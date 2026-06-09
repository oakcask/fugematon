import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "../constants.js";
import type { FugueState, HarmonicPlan, KeySignature, NoteEvent, TimeSignature, Voice } from "../events.js";
import { analyzeDissonanceTriage } from "./dissonance-triage.js";
import { createMeterContext } from "./meter.js";

test("dissonance triage counts a held F2-E3-E4-F5 stack as one sustained semitone-stack window", () => {
  const diagnostics = analyzeDissonanceTriage(
    [
      note({ voice: "bass", pitch: 41 }),
      note({ voice: "tenor", pitch: 52 }),
      note({ voice: "alto", pitch: 64 }),
      note({ voice: "soprano", pitch: 77 }),
    ],
    [harmonicPlan()],
    [],
  );
  const window = diagnostics.windows.find((candidate) => candidate.classification === "sustained-semitone-stack");

  assert.equal(diagnostics.schemaVersion, 2);
  assert.equal(diagnostics.sustainedSevereVerticalDissonanceCount, 1);
  assert.equal(diagnostics.sustainedSevereVerticalDissonanceTicks, TICKS_PER_QUARTER);
  assert.equal(diagnostics.maxSustainedSevereVerticalDissonanceTicks, TICKS_PER_QUARTER);
  assert.equal(window?.durationTicks, TICKS_PER_QUARTER);
  assert.deepEqual(window?.voices, ["alto", "soprano", "tenor", "bass"]);
  assert.deepEqual(window?.pitches, [64, 77, 52, 41]);
  assert.equal(window?.response, "generator-response-required");
});

test("dissonance triage keeps a prepared 4-3 suspension out of generator-response counts", () => {
  const diagnostics = analyzeDissonanceTriage(
    [
      note({ voice: "bass", pitch: 50, startTick: 0, durationTicks: TICKS_PER_QUARTER }),
      note({ voice: "bass", pitch: 48, startTick: TICKS_PER_QUARTER, durationTicks: TICKS_PER_QUARTER }),
      note({ voice: "soprano", pitch: 65, startTick: 0, durationTicks: TICKS_PER_QUARTER * 2 }),
      note({ voice: "soprano", pitch: 64, startTick: TICKS_PER_QUARTER * 2 }),
    ],
    [harmonicPlan()],
    [],
  );
  const suspension = diagnostics.windows.find((window) => window.classification === "prepared-suspension");

  assert.equal(diagnostics.sustainedSevereVerticalDissonanceCount, 0);
  assert.equal(suspension?.response, "accepted-context");
});

test("dissonance triage keeps a short weak passing semitone as review evidence", () => {
  const diagnostics = analyzeDissonanceTriage(
    [
      note({ voice: "alto", pitch: 64, durationTicks: TICKS_PER_QUARTER }),
      note({
        voice: "soprano",
        pitch: 65,
        startTick: TICKS_PER_QUARTER / 2,
        durationTicks: TICKS_PER_QUARTER / 2,
        metricalHarmonyIntent: "weak-passing-tone",
      }),
    ],
    [harmonicPlan()],
    [],
  );

  assert.equal(diagnostics.weakPassingSemitoneClashTicks, TICKS_PER_QUARTER / 2);
  assert.equal(diagnostics.sustainedSevereVerticalDissonanceCount, 0);
  assert.equal(
    diagnostics.windows.some((window) => window.classification === "weak-passing-semitone-clash"),
    true,
  );
});

test("dissonance triage uses compound beat duration in six-eight", () => {
  const short = analyzeDissonanceTriage(
    heldStackNotes(TICKS_PER_QUARTER),
    [harmonicPlan("episode", { numerator: 6, denominator: 8 })],
    [],
  );
  const compoundBeat = analyzeDissonanceTriage(
    heldStackNotes(TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2),
    [harmonicPlan("episode", { numerator: 6, denominator: 8 })],
    [],
  );

  assert.equal(short.sustainedSevereVerticalDissonanceCount, 0);
  assert.equal(compoundBeat.sustainedSevereVerticalDissonanceCount, 1);
  assert.equal(compoundBeat.sustainedSevereVerticalDissonanceTicks, TICKS_PER_QUARTER + TICKS_PER_QUARTER / 2);
});

function heldStackNotes(durationTicks: number): NoteEvent[] {
  return [
    note({ voice: "bass", pitch: 41, durationTicks }),
    note({ voice: "tenor", pitch: 52, durationTicks }),
    note({ voice: "alto", pitch: 64, durationTicks }),
    note({ voice: "soprano", pitch: 77, durationTicks }),
  ];
}

function note(input: Partial<NoteEvent> & { voice: Voice; pitch: number }): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick ?? 0,
    durationTicks: input.durationTicks ?? TICKS_PER_QUARTER,
    pitch: input.pitch,
    velocity: input.velocity ?? 80,
    role: input.role ?? "free-counterpoint",
    metricalHarmonyIntent: input.metricalHarmonyIntent,
  };
}

function harmonicPlan(
  state: FugueState = "episode",
  timeSignature: TimeSignature = { numerator: 4, denominator: 4 },
): HarmonicPlan {
  const meterContext = createMeterContext(timeSignature);
  return {
    state,
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 4,
    meterContext,
    localKey: cMajor(),
    departureKey: cMajor(),
    targetKey: cMajor(),
    styleProfile: "strict-classical",
    cadenceKind: "authentic",
    ambiguityIntent: "none",
    parallelKeyShift: false,
    anchors: [],
  };
}

function cMajor(): KeySignature {
  return { tonic: "C", mode: "major" };
}
