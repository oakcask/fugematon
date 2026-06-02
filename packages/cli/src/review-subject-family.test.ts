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

test("subject family diversity flags score-beauty rhythm and climax collapse", () => {
  const summary = summarizeSubjectFamilyDiversity([
    subjectSeed("one", [0, 1, 2, 3, 4, 3, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], 4),
    subjectSeed("two", [0, 2, 1, 3, 4, 3, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], 4),
  ]);

  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-rhythm-collapse"));
  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-climax-collapse"));
});

test("subject family diversity flags top-n rhetoric concentration", () => {
  const summary = summarizeSubjectFamilyDiversity([
    ...subjectFamilySeeds("alpha", 3, [0, 1, 2, 3, 4, 3, 2, 1], [1, 1, 1, 1, 1, 1, 1, 1], 4, [0, 1, 2, 3]),
    ...subjectFamilySeeds("beta", 3, [0, 2, 1, 3, 4, 3, 2, 1], [2, 1, 1, 1, 1, 1, 1, 1], 4, [0, 2, 1, 3]),
    ...subjectFamilySeeds("gamma", 2, [0, 1, 3, 2, 4, 3, 2, 1], [1, 2, 1, 1, 1, 1, 1, 1], 4, [0, 1, 3, 2]),
    subjectSeed("delta", [0, 1, 3, 4, 2, 3, 2, 1], [1, 1, 2, 1, 1, 1, 1, 1], 3, [0, 1, 3, 4]),
    subjectSeed("epsilon", [0, 2, 3, 1, 2, 4, 3, 1], [1, 1, 1, 2, 1, 1, 1, 1], 5, [0, 2, 3, 1]),
    subjectSeed("zeta", [0, 2, 1, 3, 4, 2, 3, 1], [1, 1, 1, 1, 2, 1, 1, 1], 4, [0, 2, 1, 3]),
    subjectSeed("eta", [0, 3, 2, 4, 1, 2, 3, 1], [1, 1, 1, 1, 1, 2, 1, 1], 3, [0, 3, 2, 4]),
  ]);

  assert.equal(summary.topInitialSubjectFamilyShare, 0.25);
  assert.equal(summary.top3InitialSubjectFamilyShare, 0.667);
  assert.equal(summary.top5InitialSubjectFamilyShare, 0.833);
  assert.equal(summary.topInitialSubjectFragmentFamilyShare, 0.333);
  assert.equal(summary.top3SubjectFragmentFamilyShare, 0.75);
  assert.equal(summary.top5SubjectFragmentFamilyShare, 0.917);
  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-top3-concentration"));
  assert.ok(summary.findings.some((finding) => finding.code === "initial-subject-top5-concentration"));
  assert.ok(summary.findings.some((finding) => finding.code === "subject-fragment-top3-concentration"));
  assert.ok(summary.findings.some((finding) => finding.code === "subject-fragment-top5-concentration"));
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

test("subject family diversity comparison reports top-n concentration movement", () => {
  const baseline = summarizeSubjectFamilyDiversity([
    ...subjectFamilySeeds("alpha", 3, [0, 1, 2, 3], [1, 1, 1, 1], 3, [0, 1, 2]),
    ...subjectFamilySeeds("beta", 3, [0, 2, 1, 3], [2, 1, 1, 1], 2, [0, 2, 1]),
    ...subjectFamilySeeds("gamma", 2, [0, 1, 3, 2], [1, 2, 1, 1], 2, [0, 1, 3]),
  ]);
  const variant = summarizeSubjectFamilyDiversity([
    subjectSeed("alpha", [0, 1, 2, 3], [1, 1, 1, 1], 3, [0, 1, 2]),
    subjectSeed("beta", [0, 2, 1, 3], [2, 1, 1, 1], 2, [0, 2, 1]),
    subjectSeed("gamma", [0, 1, 3, 2], [1, 2, 1, 1], 2, [0, 1, 3]),
    subjectSeed("delta", [0, 1, 3, 4], [1, 1, 2, 1], 3, [0, 1, 3]),
    subjectSeed("epsilon", [0, 2, 3, 1], [1, 1, 1, 2], 2, [0, 2, 3]),
    subjectSeed("zeta", [0, 2, 1, 4], [1, 1, 2, 1], 3, [0, 2, 1]),
    subjectSeed("eta", [0, 3, 2, 4], [1, 2, 1, 1], 3, [0, 3, 2]),
    subjectSeed("theta", [0, 3, 1, 4], [2, 1, 1, 1], 3, [0, 3, 1]),
  ]);

  const comparison = compareSubjectFamilyDiversity(baseline, variant);

  assert.equal(comparison.deltas.top3InitialSubjectFamilyShare, -0.625);
  assert.equal(comparison.deltas.top3SubjectFragmentFamilyShare, -0.375);
  assert.ok(comparison.improvements.includes("top 3 initial subject family share decreased"));
  assert.ok(comparison.improvements.includes("top 3 subject-fragment family share decreased"));
});

function subjectFamilySeeds(
  family: string,
  count: number,
  degreePattern: number[],
  rhythmPattern: number[],
  localClimaxIndex: number,
  fragmentPattern: number[],
): ReturnType<typeof subjectSeed>[] {
  return Array.from({ length: count }, (_, index) =>
    subjectSeed(`${family}-${index + 1}`, degreePattern, rhythmPattern, localClimaxIndex, fragmentPattern),
  );
}

function subjectSeed(
  seed: string,
  degreePattern: number[],
  rhythmPattern: number[],
  localClimaxIndex: number,
  fragmentPattern: number[] = [0, 2, 1, 3],
): {
  seed: string;
  initialSubjectProfile: InitialSubjectProfile;
  diagnosticsSummary: { phraseRepetitionReview: GenerationDiagnostics["phraseRepetitionReview"] };
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
      phraseRepetitionReview: {
        schemaVersion: 1,
        entryPatternFamilyConcentration: {
          entryCount: 0,
          uniqueFamilyCount: 0,
          topFamilyCount: 0,
          topFamilyShare: 0,
        },
        subjectStemFamilies: [{ form: "subject-fragment", pattern: fragmentPattern, count: 1, share: 1 }],
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
