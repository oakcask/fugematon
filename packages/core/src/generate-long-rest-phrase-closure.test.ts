import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { HarmonicPlan, NoteEvent, Voice } from "./events.js";
import { generateScore } from "./generate.js";
import { buildHarmonicPlan, chordTonePitchClasses } from "./generation/harmony.js";
import { shapeLongRestPhraseClosures } from "./generation/texture.js";

test("seed-1yc5rlr-184cz7l closes upper lines before the measure-five bass answer thinning", () => {
  const output = generateScore({ seed: "seed-1yc5rlr-184cz7l", lengthTicks: TICKS_PER_QUARTER * 16 });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const bassAnswer = output.diagnostics.subjectEntries.find(
    (entry) => entry.voice === "bass" && entry.state === "exposition" && entry.form === "answer",
  );
  assert.ok(bassAnswer !== undefined);

  const restStartTick = bassAnswer.startTick + TICKS_PER_QUARTER * 4;
  const plan = output.diagnostics.sectionPlans[0];
  assert.ok(plan !== undefined);
  const cadenceAnchor = plan.anchors.find((anchor) => anchor.cadenceTarget);
  assert.ok(cadenceAnchor !== undefined);
  const closingPitchClasses = chordTonePitchClasses(cadenceAnchor.localKey, cadenceAnchor.function);

  const sopranoClosingNote = noteEndingAt(notes, "soprano", restStartTick);
  assert.ok(sopranoClosingNote !== undefined, "soprano should close before the long rest");
  assert.ok(
    closingPitchClasses.includes(sopranoClosingNote.pitch % 12),
    "soprano should land on a cadence chord tone before a long rest",
  );
  assert.equal(sopranoClosingNote.metricalHarmonyIntent, "structural-chord-tone");
  assert.ok(nextRestTicks(notes, "soprano", restStartTick) >= TICKS_PER_QUARTER * 2);

  const tailSupport = notes.find(
    (note) =>
      note.voice !== "bass" &&
      restStartTick <= note.startTick &&
      note.startTick <= restStartTick + TICKS_PER_QUARTER / 2 &&
      note.role === "free-counterpoint" &&
      closingPitchClasses.includes(note.pitch % 12) &&
      note.metricalHarmonyIntent === "structural-chord-tone",
  );
  assert.ok(tailSupport !== undefined, "an upper voice should support the bass-answer tail after closing");
  assert.equal(output.diagnostics.bassAnswerTailTexture.reviewRequired, false);
});

test("long-rest phrase closure leaves expressive short rests unchanged", () => {
  const plan = expositionHalfCadencePlan();
  const notes: NoteEvent[] = [
    {
      kind: "note",
      voice: "soprano",
      startTick: TICKS_PER_QUARTER * 15 + TICKS_PER_QUARTER / 2,
      durationTicks: TICKS_PER_QUARTER / 2,
      pitch: 72,
      velocity: 60,
      role: "free-counterpoint",
      metricalHarmonyIntent: "offbeat-motion",
    },
    {
      kind: "note",
      voice: "soprano",
      startTick: TICKS_PER_QUARTER * 16 + TICKS_PER_QUARTER / 2,
      durationTicks: TICKS_PER_QUARTER / 2,
      pitch: 74,
      velocity: 60,
      role: "free-counterpoint",
      metricalHarmonyIntent: "offbeat-motion",
    },
  ];

  shapeLongRestPhraseClosures(notes, [plan]);

  assert.equal(notes[0]?.pitch, 72);
  assert.equal(notes[0]?.metricalHarmonyIntent, "offbeat-motion");
});

function noteEndingAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find((note) => note.voice === voice && note.startTick + note.durationTicks === tick);
}

function nextRestTicks(notes: readonly NoteEvent[], voice: Voice, restStartTick: number): number {
  const nextStartTick = notes
    .filter((note) => note.voice === voice && note.startTick >= restStartTick)
    .sort((left, right) => left.startTick - right.startTick)[0]?.startTick;
  const scoreEndTick = Math.max(...notes.map((note) => note.startTick + note.durationTicks));
  return (nextStartTick ?? scoreEndTick) - restStartTick;
}

function expositionHalfCadencePlan(): HarmonicPlan {
  return buildHarmonicPlan({
    state: "exposition",
    startTick: 0,
    durationTicks: TICKS_PER_QUARTER * 16,
    globalKey: { tonic: "C", mode: "major" },
    localKey: { tonic: "C", mode: "major" },
    targetKey: { tonic: "G", mode: "major" },
    styleProfile: "strict-classical",
    cadenceKind: "half",
    ambiguityIntent: "none",
  });
}
