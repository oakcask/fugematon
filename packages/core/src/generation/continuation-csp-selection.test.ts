import assert from "node:assert/strict";
import test from "node:test";
import { TICKS_PER_QUARTER } from "../constants.js";
import type { ConstraintHardFailureCode } from "../events.js";
import { generateScore } from "../generate.js";
import { resolveWritingProfile } from "../writing-profile.js";
import type { ConstraintCandidate } from "./constraint-core.js";
import {
  chooseSectionCspBacktrackingCandidateIndex,
  continuationSectionDurationCandidates,
  preservesVoicePairIndependenceGuardrails,
} from "./sections.js";

test("duration candidates prefer measure-aligned values before relaxed cross-metric values", () => {
  assert.deepEqual(
    continuationSectionDurationCandidates("episode").map((durationTicks) => durationTicks / TICKS_PER_QUARTER),
    [8, 12, 6, 10],
  );
  assert.deepEqual(
    continuationSectionDurationCandidates("subject-return").map((durationTicks) => durationTicks / TICKS_PER_QUARTER),
    [8, 12, 7, 9],
  );
  assert.deepEqual(
    continuationSectionDurationCandidates("stretto-like").map((durationTicks) => durationTicks / TICKS_PER_QUARTER),
    [8, 12, 6, 7, 9, 10],
  );
});

test("duration candidates restore an off-measure section to a measure boundary", () => {
  assert.deepEqual(
    continuationSectionDurationCandidates("episode", undefined, TICKS_PER_QUARTER).map(
      (durationTicks) => durationTicks / TICKS_PER_QUARTER,
    ),
    [7, 11, 8, 12, 6, 10],
  );
  assert.deepEqual(
    continuationSectionDurationCandidates("subject-return", undefined, TICKS_PER_QUARTER * 3)
      .slice(0, 2)
      .map((durationTicks) => durationTicks / TICKS_PER_QUARTER),
    [9, 13],
  );
});

test("section CSP backtracking prefers a feasible continuation variant over coverage failures", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0, 1],
    constraintCandidates: [
      constraintCandidate("section-960-episode-section-local-candidate-0", [
        { code: "section-voice-coverage", count: 3 },
      ]),
      constraintCandidate("section-960-episode-section-csp-candidate-1", []),
    ],
    candidateScores: [0, 20],
  });

  assert.equal(selectedIndex, 1);
});

test("section CSP backtracking chooses deterministic relaxation when every candidate is infeasible", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0, 1, 2, 3],
    constraintCandidates: [
      constraintCandidate("section-960-episode-section-local-candidate-0", [
        { code: "section-voice-coverage", count: 2 },
      ]),
      constraintCandidate(
        "section-960-episode-section-csp-candidate-b",
        [{ code: "structural-harmonic-support", count: 1 }],
        5,
      ),
      constraintCandidate(
        "section-960-episode-section-csp-candidate-c",
        [{ code: "section-voice-coverage", count: 1 }],
        3,
      ),
      constraintCandidate(
        "section-960-episode-section-csp-candidate-a",
        [{ code: "section-voice-coverage", count: 1 }],
        3,
      ),
    ],
    candidateScores: [0, 0, 0, 0],
  });

  assert.equal(selectedIndex, 3);
});

test("section CSP backtracking retries structural harmonic support failures", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0],
    constraintCandidates: [
      constraintCandidate("section-960-episode-section-local-candidate-0", [
        { code: "structural-harmonic-support", count: 2 },
      ]),
      constraintCandidate("section-960-episode-section-csp-candidate-1", [
        { code: "structural-harmonic-support", count: 1 },
      ]),
    ],
    candidateScores: [0, 10],
  });

  assert.equal(selectedIndex, 1);
});

test("section CSP backtracking chooses lower metrical soft cost when hard failures are tied", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0, 1],
    constraintCandidates: [
      constraintCandidate("section-960-episode-section-csp-duration-2880-candidate-0", [], 24),
      constraintCandidate("section-960-episode-section-csp-duration-3840-candidate-1", [], 0),
    ],
    candidateScores: [0, 0],
  });

  assert.equal(selectedIndex, 1);
});

test("section CSP backtracking prefers the lower combined agency cost when density failures are tied", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0, 1],
    constraintCandidates: [
      constraintCandidate("section-960-episode-section-csp-low-root-first-candidate-0", [], 18),
      constraintCandidate("section-960-episode-section-csp-balanced-upper-agency-candidate-1", [], 6),
    ],
    candidateScores: [0, 0],
  });

  assert.equal(selectedIndex, 1);
});

test("section CSP backtracking rejects a lower total bought with a melodic regression", () => {
  const selectedIndex = chooseSectionCspBacktrackingCandidateIndex({
    currentBestIndex: 0,
    candidateIndexes: [0, 1],
    constraintCandidates: [
      constraintCandidate("section-960-subject-return-entry-window-candidate-0", [], 10),
      constraintCandidate("section-960-subject-return-entry-window-candidate-1", [], 5, [
        { feature: "leap-recovery", cost: 1, explanation: "unrecovered support-line leap" },
      ]),
    ],
    candidateScores: [10, 5],
  });

  assert.equal(selectedIndex, 0);
});

test("voice-pair guardrails do not trade mechanical coupling for fewer collisions", () => {
  const baseline = {
    mechanicalVoicePairCouplingQuarters: 8,
    exactVoicePairCollisionQuarters: 4,
    colorDoublingQuarters: 2,
  };

  assert.equal(
    preservesVoicePairIndependenceGuardrails(
      {
        mechanicalVoicePairCouplingQuarters: 9,
        exactVoicePairCollisionQuarters: 0,
        colorDoublingQuarters: 0,
      },
      baseline,
    ),
    false,
  );
  assert.equal(
    preservesVoicePairIndependenceGuardrails(
      {
        mechanicalVoicePairCouplingQuarters: 7,
        exactVoicePairCollisionQuarters: 3,
        colorDoublingQuarters: 1,
      },
      baseline,
    ),
    true,
  );
});

test("generated continuation exposes section-CSP candidate rows without public rest events", () => {
  const output = generateScore({
    seed: "fugue-smoke",
    lengthTicks: TICKS_PER_QUARTER * 32,
  });
  const traceCandidates = output.diagnostics.generatorSearchTrace.candidates;
  const selectedSectionCandidates = traceCandidates.filter(
    (candidate) => candidate.selected && candidate.candidateId.startsWith("section-"),
  );
  assert.ok(selectedSectionCandidates.length > 0);
  assert.ok(
    selectedSectionCandidates.every((candidate) =>
      candidate.reason.startsWith("selected by deterministic constraint ordering"),
    ),
  );

  assert.ok(traceCandidates.some((candidate) => candidate.candidateId.includes("-section-csp-duration-")));
  assert.ok(
    traceCandidates.some(
      (candidate) =>
        candidate.candidateId.includes("-section-csp-duration-") && candidate.reason.includes("section-csp-"),
    ),
  );
  assert.equal(new Set(traceCandidates.map((candidate) => candidate.candidateId)).size, traceCandidates.length);
  assert.ok(traceCandidates.every((candidate) => candidate.reason.includes("relaxation=")));
  assert.ok(
    output.events.every((event) => String(event.kind) !== "rest"),
    "public ScoreEvent output must keep rests internal",
  );
});

function constraintCandidate(
  candidateId: string,
  hardFailures: readonly { code: ConstraintHardFailureCode; count: number }[],
  totalSoftCost = 0,
  softCosts: ConstraintCandidate["result"]["softCosts"] = [],
): ConstraintCandidate {
  return {
    candidateId,
    draft: {
      notes: [],
      subjectEntries: [],
      sectionPlans: [],
      endTick: 0,
      writingProfile: resolveWritingProfile("four-voice-default"),
    },
    result: {
      schemaVersion: 1,
      window: { startTick: 0, endTick: TICKS_PER_QUARTER, state: "episode" },
      hardFailures: hardFailures.map((failure) => ({
        code: failure.code,
        count: failure.count,
        explanation: failure.code,
        affectedNotes: [],
      })),
      softCosts,
      totalSoftCost,
      explanation: "",
      affectedNotes: [],
    },
  };
}
