import assert from "node:assert/strict";
import { TICKS_PER_QUARTER } from "./constants.js";
import type { GenerationOutput, NoteEvent, PlannedEntry } from "./events.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const SWEEP_SEEDS = Array.from({ length: 40 }, (_, index) => `isrd-sweep-${String(index).padStart(3, "0")}`);

reviewTest("section-local planner lowers ad hoc initial subject rhetoric concentration", () => {
  const baselineLabels = SWEEP_SEEDS.map((seed) => initialSubjectRhetoricLabel(seed, "baseline"));
  const plannerLabels = SWEEP_SEEDS.map((seed) => initialSubjectRhetoricLabel(seed, "section-local-planner"));

  assert.ok(topNShare(baselineLabels, 3) >= 0.75);
  assert.ok(topNShare(plannerLabels, 3) <= 0.35);
  assert.ok(new Set(plannerLabels).size >= new Set(baselineLabels).size * 3);
});

reviewTest("baseline keeps legacy initial subject profiles", () => {
  const baselineSignatures = SWEEP_SEEDS.map((seed) => initialSubjectSignature(seed, "baseline"));
  const legacySignatures = new Set([
    subjectSignature([0, 1, 2, 3, 4, 3, 1, 2], [1, 1, 0.5, 0.5, 1, 1, 1, 1]),
    subjectSignature([0, 1, 2, 3, 4, 3, 2, 1], [1, 1, 0.5, 0.5, 1, 1, 1, 1]),
    subjectSignature([0, 2, 1, 3, 4, 3, 2, 1], [1, 1, 0.5, 0.5, 1, 1, 1, 1]),
    subjectSignature([0, 1, 2, 3, 4, 3, 1, 2], [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1]),
    subjectSignature([0, 1, 3, 2, 4, 3, 2, 1], [1, 0.5, 0.5, 1, 1, 0.5, 0.5, 1]),
    subjectSignature([0, 1, 3, 4, 2, 3, 2, 1], [1, 1, 0.5, 0.5, 1, 0.5, 0.5, 1]),
    subjectSignature([0, 2, 1, 3, 4, 2, 3, 1], [1, 1, 0.5, 0.5, 1, 0.5, 0.5, 1]),
    subjectSignature([0, 1, 2, 3, 4, 3, 1, 2], [1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5]),
    subjectSignature([0, 2, 1, 3, 4, 2, 3, 1], [1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5]),
    subjectSignature([0, 1, 3, 2, 4, 3, 2, 1], [1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5]),
  ]);

  assert.ok(baselineSignatures.every((signature) => legacySignatures.has(signature)));
});

reviewTest("section-local planner keeps generated subject rhetoric answer-compatible", () => {
  for (const seed of SWEEP_SEEDS) {
    const output = generateScore({
      seed,
      lengthTicks: TICKS_PER_QUARTER * 2,
      selectionModel: "section-local-planner",
    });
    const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
    assert.ok(initialSubject !== undefined);
    const degreePattern = initialSubject.expectedDegreePattern;
    const notes = initialSubjectNotes(output, initialSubject);
    const keySignature = output.events.find(
      (event) => event.kind === "meta" && event.type === "key-signature",
    )?.payload;
    const maxDegree =
      keySignature?.mode === "dorian" || keySignature?.mode === "aeolian" || keySignature?.mode === "mixolydian"
        ? 6
        : 5;

    assert.equal(degreePattern.length, 8);
    assert.equal(notes.length, 8);
    assert.equal(degreePattern[0], 0);
    assert.ok(degreePattern.some((degree) => degree === 4));
    assert.ok(degreePattern.every((degree) => degree >= 0 && degree <= maxDegree));
    assert.equal(hasUnrecoveredLeap(degreePattern), false);
    assert.ok(maxConsecutiveRepeatedDegrees(degreePattern) <= 2);
    assert.equal(output.diagnostics.subjectIdentityViolations, 0);
    assert.equal(output.diagnostics.answerPlanViolations, 0);
  }
});

reviewTest("modal, triple, and compound subjects expose multiple rhetoric families", () => {
  const focusedSeeds = [
    "isrd-sweep-008",
    "isrd-sweep-009",
    "isrd-sweep-017",
    "isrd-sweep-020",
    "isrd-sweep-032",
    "isrd-sweep-037",
    "isrd-sweep-044",
    "isrd-sweep-051",
    "modal-dorian",
    "modal-aeolian",
  ];
  const groups = {
    modal: new Set<string>(),
    triple: new Set<string>(),
    compound: new Set<string>(),
  };

  for (const seed of focusedSeeds) {
    const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 2 });
    const label = initialSubjectRhetoricLabelFromOutput(output);
    const timeSignature = output.events.find(
      (event) => event.kind === "meta" && event.type === "time-signature",
    )?.payload;
    const keySignature = output.events.find(
      (event) => event.kind === "meta" && event.type === "key-signature",
    )?.payload;

    if (keySignature?.mode === "dorian" || keySignature?.mode === "aeolian" || keySignature?.mode === "mixolydian") {
      groups.modal.add(label);
    }
    if (timeSignature?.numerator === 3) {
      groups.triple.add(label);
    }
    if (timeSignature?.numerator === 6) {
      groups.compound.add(label);
    }
  }

  assert.ok(groups.modal.size >= 2);
  assert.ok(groups.triple.size >= 2);
  assert.ok(groups.compound.size >= 2);
});

function initialSubjectRhetoricLabel(seed: string, selectionModel: "baseline" | "section-local-planner"): string {
  return initialSubjectRhetoricLabelFromOutput(
    generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 2, selectionModel }),
  );
}

function initialSubjectSignature(seed: string, selectionModel: "baseline" | "section-local-planner"): string {
  const output = generateScore({ seed, lengthTicks: TICKS_PER_QUARTER * 2, selectionModel });
  const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
  assert.ok(initialSubject !== undefined);
  const rhythmPattern = initialSubjectNotes(output, initialSubject).map((note) =>
    roundRatio(note.durationTicks / TICKS_PER_QUARTER),
  );
  return subjectSignature(initialSubject.expectedDegreePattern, rhythmPattern);
}

function subjectSignature(degreePattern: readonly number[], rhythmPattern: readonly number[]): string {
  return `${degreePattern.join("-")}|${rhythmPattern.join("-")}`;
}

function initialSubjectRhetoricLabelFromOutput(output: GenerationOutput): string {
  const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
  assert.ok(initialSubject !== undefined);
  const degreePattern = initialSubject.expectedDegreePattern;
  const rhythmPattern = initialSubjectNotes(output, initialSubject).map((note) =>
    roundRatio(note.durationTicks / TICKS_PER_QUARTER),
  );

  return [
    openingGestureFamily(degreePattern),
    rhythmProfileFamily(rhythmPattern),
    climaxArea(degreePattern),
    tailMotion(degreePattern),
  ].join("|");
}

function initialSubjectNotes(output: GenerationOutput, initialSubject: PlannedEntry): NoteEvent[] {
  return output.events
    .filter(
      (event): event is NoteEvent =>
        event.kind === "note" &&
        event.role === "subject" &&
        event.voice === initialSubject.voice &&
        event.startTick >= initialSubject.startTick,
    )
    .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch)
    .slice(0, initialSubject.expectedDegreePattern.length);
}

function openingGestureFamily(pattern: readonly number[]): string {
  const [first, second, third] = pattern;
  if (first === 0 && second === 1 && third === 2) {
    return "stepwise-tonic";
  }
  if (first === 0 && second === 2 && third === 1) {
    return "third-return";
  }
  if (first === 0 && second === 1 && third === 3) {
    return "upper-neighbor";
  }
  if (first === 0 && second === 3 && third === 2) {
    return "tonic-leap-fill";
  }
  if (first === 0 && second === 2 && (third === 5 || third === 6)) {
    return "modal-color-neighbor";
  }
  return "other";
}

function rhythmProfileFamily(rhythm: readonly number[]): string {
  if (rhythm.some((duration) => duration === 1.5)) {
    return "compound-profile";
  }
  if (rhythm[0] !== undefined && rhythm[0] >= 2) {
    return "held-opening";
  }
  if (rhythm.slice(5).some((duration) => duration >= 2)) {
    return "tail-held";
  }
  if (rhythm.slice(1, 5).some((duration) => duration >= 2)) {
    return "mid-held";
  }
  if (rhythm.some((duration) => duration === 0.5)) {
    return "eighth-motion";
  }
  return "quarter-pulse";
}

function climaxArea(pattern: readonly number[]): string {
  let index = 0;
  let value = pattern[0] ?? 0;
  for (let candidateIndex = 1; candidateIndex < pattern.length; candidateIndex += 1) {
    const candidate = pattern[candidateIndex]!;
    if (candidate > value) {
      index = candidateIndex;
      value = candidate;
    }
  }
  if (value >= 5) {
    return "modal-color-climax";
  }
  if (index <= 3) {
    return "early";
  }
  if (index === 4) {
    return "middle";
  }
  return "late";
}

function tailMotion(pattern: readonly number[]): string {
  const previous = pattern.at(-2);
  const final = pattern.at(-1);
  if (previous === undefined || final === undefined || final === previous) {
    return "repeated";
  }
  return final > previous ? "ascending" : "descending";
}

function hasUnrecoveredLeap(degrees: readonly number[]): boolean {
  for (let index = 1; index < degrees.length - 1; index += 1) {
    const interval = degrees[index]! - degrees[index - 1]!;
    if (Math.abs(interval) < 3) {
      continue;
    }
    const recovery = degrees[index + 1]! - degrees[index]!;
    if (recovery === 0 || Math.sign(recovery) === Math.sign(interval)) {
      return true;
    }
  }
  return false;
}

function maxConsecutiveRepeatedDegrees(degrees: readonly number[]): number {
  let maxRun = 1;
  let currentRun = 1;
  for (let index = 1; index < degrees.length; index += 1) {
    if (degrees[index] === degrees[index - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }
  return maxRun;
}

function topNShare(labels: readonly string[], topN: number): number {
  const counts = [
    ...labels.reduce((map, label) => map.set(label, (map.get(label) ?? 0) + 1), new Map<string, number>()).values(),
  ];
  const topCount = counts
    .sort((left, right) => right - left)
    .slice(0, topN)
    .reduce((sum, count) => sum + count, 0);
  return topCount / Math.max(1, labels.length);
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
