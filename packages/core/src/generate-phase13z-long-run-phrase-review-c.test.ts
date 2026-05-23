import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13Z_SUBJECT_STEM_REVIEW_SEEDS = [
  "modal-answer",
  "minor-entry",
  "sparse-cadence",
  "random-listen-check",
  "seed-0zereox-1v729ih",
] as const;

test("Phase 13Z focused seeds keep current subject-stem concentration blocker observable", () => {
  const seedsWithSubjectStemConcentration = PHASE_13Z_SUBJECT_STEM_REVIEW_SEEDS.filter((seed) => {
    const output = generateScore({ seed, lengthTicks: PHASE_5_LENGTH_TICKS });
    return output.diagnostics.phase13RReview.findings.some(
      (finding) => finding.code === "subject-stem-family-concentration",
    );
  });

  assert.deepEqual(seedsWithSubjectStemConcentration, [...PHASE_13Z_SUBJECT_STEM_REVIEW_SEEDS]);
});

test("Phase 13Z user-reported seed localizes late subject-stem recurrence", () => {
  const output = generateScore({ seed: "seed-0zereox-1v729ih", lengthTicks: PHASE_5_LENGTH_TICKS });
  const subjectFamily = output.diagnostics.phase12Review.subjectStemFamilies.find(
    (family) => family.form === "subject",
  );

  assert.ok(subjectFamily !== undefined);
  assert.ok(subjectFamily.count >= 8);
  assert.ok(subjectFamily.share > 0.42);
  assert.ok(
    output.diagnostics.phase13RReview.findings.some(
      (finding) =>
        finding.code === "subject-stem-family-concentration" &&
        finding.metric === "phase12Review.subjectStemFamilies.topSubjectShare",
    ),
  );
});
