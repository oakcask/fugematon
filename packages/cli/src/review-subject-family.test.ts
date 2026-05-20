import assert from "node:assert/strict";
import test from "node:test";
import type { GenerationDiagnostics } from "@fugematon/core";
import {
  compareSubjectFamilyDiversity,
  type InitialSubjectProfile,
  summarizeSubjectFamilyDiversity,
} from "./review-subject-family.js";

test("subject family diversity treats rhythm and climax as initial subject rhetoric", () => {
  const summary = summarizeSubjectFamilyDiversity([
    subjectSeed("early", [0, 2, 1, 3], [1, 1, 1, 1], 3),
    subjectSeed("held", [0, 2, 1, 3], [2, 1, 1, 1], 1),
    subjectSeed("late", [0, 2, 1, 3], [1, 1, 1, 1], 2),
  ]);

  assert.equal(summary.uniqueInitialSubjectFamilyCount, 3);
  assert.equal(summary.uniqueInitialSubjectRhythmPatternCount, 2);
  assert.equal(summary.uniqueInitialSubjectClimaxIndexCount, 3);
  assert.deepEqual(
    summary.initialSubjectFamilies.map((family) => [family.rhythmPattern.join("-"), family.localClimaxIndex]),
    [
      ["1-1-1-1", 3],
      ["2-1-1-1", 1],
      ["1-1-1-1", 2],
    ],
  );
});

test("subject family diversity flags Phase 13S rhythm and climax collapse", () => {
  const summary = summarizeSubjectFamilyDiversity([
    subjectSeed("one", [0, 1, 2, 3, 4, 3, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], 4),
    subjectSeed("two", [0, 2, 1, 3, 4, 3, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], 4),
  ]);

  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-rhythm-collapse"));
  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-climax-collapse"));
});

test("subject family diversity comparison reports rhythm and climax movement", () => {
  const baseline = summarizeSubjectFamilyDiversity([
    subjectSeed("one", [0, 1, 2, 3], [1, 1, 1, 1], 3),
    subjectSeed("two", [0, 2, 1, 3], [1, 1, 1, 1], 3),
  ]);
  const variant = summarizeSubjectFamilyDiversity([
    subjectSeed("one", [0, 1, 2, 3], [1, 1, 1, 1], 3),
    subjectSeed("two", [0, 2, 1, 3], [2, 1, 1, 1], 2),
  ]);

  const comparison = compareSubjectFamilyDiversity(baseline, variant);

  assert.equal(comparison.deltas.uniqueInitialSubjectRhythmPatternCount, 1);
  assert.equal(comparison.deltas.uniqueInitialSubjectClimaxIndexCount, 1);
  assert.ok(comparison.improvements.includes("unique initial subject rhythm pattern count increased"));
  assert.ok(comparison.improvements.includes("unique initial subject climax index count increased"));
});

function subjectSeed(
  seed: string,
  degreePattern: number[],
  rhythmPattern: number[],
  localClimaxIndex: number,
): {
  seed: string;
  initialSubjectProfile: InitialSubjectProfile;
  diagnosticsSummary: { phase12Review: GenerationDiagnostics["phase12Review"] };
} {
  return {
    seed,
    initialSubjectProfile: {
      degreePattern,
      rhythmPattern,
      contourClass: "test-contour",
      localClimaxIndex,
      tailMotion: "descending",
      mode: "major",
      answerCompatibility: "tonal-answer",
    },
    diagnosticsSummary: {
      phase12Review: {
        schemaVersion: 1,
        entryPatternFamilyConcentration: {
          entryCount: 0,
          uniqueFamilyCount: 0,
          topFamilyCount: 0,
          topFamilyShare: 0,
        },
        subjectStemFamilies: [{ form: "subject-fragment", pattern: [0, 2, 1, 3], count: 1, share: 1 }],
        answerTransformFamilies: [],
        fragmentDerivations: [],
        phraseFunctions: [],
        sectionStatePatterns: {
          patternLength: 4,
          uniquePatternCount: 0,
          mostRepeatedPatternCount: 0,
          topPatterns: [],
        },
      },
    },
  };
}
