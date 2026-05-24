import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const SUBJECT_FAMILY_SOURCE_SEEDS = ["bach-001", "fugue-smoke", "modal-cadence", "dense-modal"] as const;

test("subject-family source diagnostics include seeds without per-score findings", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: REVIEW_LENGTH_TICKS });
  const phraseConvergenceFindings = output.diagnostics.phraseConvergenceReview.findings.map((finding) => finding.code);
  const subjectFamilies = output.diagnostics.phraseRepetitionReview.subjectStemFamilies;
  const topSubject = subjectFamilies.find((family) => family.form === "subject");

  assert.ok(!phraseConvergenceFindings.includes("subject-stem-family-concentration"));
  assert.ok(!phraseConvergenceFindings.includes("subject-fragment-family-concentration"));
  assert.ok(topSubject !== undefined);
  assert.ok(topSubject.count > 0);
  assert.ok(topSubject.share > 0);
  assert.ok(topSubject.pattern.length > 0);
});

test("subject-family source diagnostics expose cross-seed subject patterns", () => {
  const topSubjectPatterns = SUBJECT_FAMILY_SOURCE_SEEDS.map((seed) => {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const topSubject = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
      (family) => family.form === "subject",
    );

    assert.ok(topSubject !== undefined, `${seed} should expose a top subject family`);
    return topSubject.pattern.join("-");
  });

  assert.equal(topSubjectPatterns.length, SUBJECT_FAMILY_SOURCE_SEEDS.length);
  assert.ok(new Set(topSubjectPatterns).size >= 3);
});
