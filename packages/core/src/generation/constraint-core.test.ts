import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "../constants.js";
import type { FugueState, HarmonicPlan, KeySignature, NoteEvent, PlannedEntry, Voice } from "../events.js";
import { resolveWritingProfile, type WritingProfile } from "../writing-profile.js";
import {
  buildGeneratorSearchTrace,
  type ConstraintCandidate,
  evaluateScoreDraft,
  type ScoreDraft,
  selectBestConstraintCandidate,
} from "./constraint-core.js";
import { createMeterContext } from "./meter.js";

test("constraint evaluator rejects current-contract hard failures", () => {
  const profile = resolveWritingProfile("four-voice-default");

  assertHardFailures([note({ voice: "bass", pitch: 80 })], profile, ["range-violation"]);
  assertHardFailures([note({ voice: "alto", pitch: 56 }), note({ voice: "tenor", pitch: 60 })], profile, [
    "voice-crossing",
  ]);
  assertHardFailures([note({ voice: "violin" as Voice, pitch: 60 })], profile, ["known-voice"]);
  assertHardFailures([note({ voice: "soprano", pitch: 128 })], profile, ["pitch-bounds", "range-violation"]);
  assertHardFailures([note({ voice: "soprano", velocity: 128 })], profile, ["velocity-bounds"]);
  assertHardFailures([note({ voice: "soprano", durationTicks: -1 })], profile, ["safe-event-shape"]);
});

test("constraint evaluator rejects subject, answer, and key metadata contract failures", () => {
  const profile = resolveWritingProfile("four-voice-default");

  assertHardFailures(
    [note({ voice: "soprano", pitch: 61 }), note({ voice: "soprano", pitch: 62, startTick: TICKS_PER_QUARTER })],
    profile,
    ["subject-identity-violation"],
    [plannedEntry({ voice: "soprano", form: "subject", actualPitchClassSequence: [0, 2], localKey: cMajor() })],
  );
  assertHardFailures(
    [note({ voice: "alto", pitch: 60 }), note({ voice: "alto", pitch: 62, startTick: TICKS_PER_QUARTER })],
    profile,
    ["answer-plan-violation"],
    [plannedEntry({ voice: "alto", form: "answer", actualPitchClassSequence: [7, 9], localKey: cMajor() })],
  );
  assertHardFailures(
    [note({ voice: "tenor", pitch: 60 }), note({ voice: "tenor", pitch: 62, startTick: TICKS_PER_QUARTER })],
    profile,
    ["key-metadata-mismatch"],
    [plannedEntry({ voice: "tenor", form: "subject", actualPitchClassSequence: [0, 2], localKey: dMajor() })],
  );
});

test("constraint evaluator rejects WritingProfile pitch contract failures", () => {
  const result = evaluateScoreDraft(
    draft([note({ voice: "soprano", pitch: 61 })], resolveWritingProfile("music-box-n20")),
  );

  assert.deepEqual(result.hardFailures.map((failure) => failure.code).sort(), [
    "range-violation",
    "writing-profile-pitch",
  ]);
});

test("constraint evaluator and trace are deterministic for identical input", () => {
  const candidate = constraintCandidate("b", [note({ voice: "soprano", pitch: 60 })]);
  const first = evaluateScoreDraft(candidate.draft);
  const second = evaluateScoreDraft(candidate.draft);

  assert.deepEqual(first, second);
  assert.deepEqual(
    buildGeneratorSearchTrace([candidate], candidate),
    buildGeneratorSearchTrace([candidate], candidate),
  );
});

test("constraint candidate selection uses stable hard failure, soft cost, and id tie-breaks", () => {
  const viableB = constraintCandidate("b", [note({ voice: "soprano", pitch: 60 })]);
  const viableA = constraintCandidate("a", [note({ voice: "soprano", pitch: 60 })]);
  const rejected = constraintCandidate("c", [note({ voice: "soprano", pitch: 128 })]);

  assert.equal(selectBestConstraintCandidate([rejected, viableB, viableA]).candidateId, "a");
  assert.equal(selectBestConstraintCandidate([viableB, rejected, viableA]).candidateId, "a");
});

function assertHardFailures(
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
  expectedCodes: readonly string[],
  subjectEntries: readonly PlannedEntry[] = [],
): void {
  const result = evaluateScoreDraft(draft(notes, writingProfile, subjectEntries));

  for (const code of expectedCodes) {
    assert.ok(
      result.hardFailures.some((failure) => failure.code === code),
      `expected hard failure ${code}; got ${result.hardFailures.map((failure) => failure.code).join(", ")}`,
    );
  }
}

function constraintCandidate(candidateId: string, notes: readonly NoteEvent[]): ConstraintCandidate {
  const candidateDraft = draft(notes, resolveWritingProfile("four-voice-default"));
  return {
    candidateId,
    draft: candidateDraft,
    result: evaluateScoreDraft(candidateDraft),
  };
}

function draft(
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
  subjectEntries: readonly PlannedEntry[] = [],
): ScoreDraft {
  return {
    notes,
    subjectEntries,
    sectionPlans: [harmonicPlan()],
    endTick: TICKS_PER_QUARTER * 4,
    writingProfile,
  };
}

function note(input: Partial<NoteEvent> & { voice: Voice }): NoteEvent {
  return {
    kind: "note",
    voice: input.voice,
    startTick: input.startTick ?? 0,
    durationTicks: input.durationTicks ?? TICKS_PER_QUARTER,
    pitch: input.pitch ?? 60,
    velocity: input.velocity ?? 80,
    role: input.role,
    metricalHarmonyIntent: input.metricalHarmonyIntent,
  };
}

function plannedEntry(input: Partial<PlannedEntry> & { voice: Voice }): PlannedEntry {
  return {
    voice: input.voice,
    form: input.form ?? "subject",
    state: input.state ?? "exposition",
    startTick: input.startTick ?? 0,
    globalKey: input.globalKey ?? cMajor(),
    localKey: input.localKey ?? cMajor(),
    answerKind: input.answerKind,
    registerTarget: input.registerTarget ?? 60,
    expectedDegreePattern: input.expectedDegreePattern ?? [0, 1],
    actualPitchClassSequence: input.actualPitchClassSequence ?? [0, 2],
    metricalIntentPattern: input.metricalIntentPattern ?? [],
  };
}

function harmonicPlan(state: FugueState = "exposition"): HarmonicPlan {
  const meterContext = createMeterContext({ numerator: 4, denominator: 4 });
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

function dMajor(): KeySignature {
  return { tonic: "D", mode: "major" };
}
