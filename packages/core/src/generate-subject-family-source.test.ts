import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const SUBJECT_FAMILY_SOURCE_SEEDS = ["bach-001", "fugue-smoke", "modal-cadence", "dense-modal"] as const;

reviewTest("subject-family source diagnostics include seeds without per-score findings", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: REVIEW_LENGTH_TICKS });
  const subjectFamilies = output.diagnostics.phraseRepetitionReview.subjectStemFamilies;
  const topSubject = subjectFamilies.find((family) => family.form === "subject");

  assert.equal(output.diagnostics.phraseDevelopmentReview.reviewRequired, false);
  assert.ok(topSubject !== undefined);
  assert.ok(topSubject.count > 0);
  assert.ok(topSubject.share > 0);
  assert.ok(topSubject.pattern.length > 0);
});

reviewTest("subject-family source diagnostics expose cross-seed subject patterns", () => {
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
