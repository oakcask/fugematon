import assert from "node:assert/strict";
import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

const SUBJECT_FAMILY_DIVERSITY_REVIEW_SEEDS = REPRESENTATIVE_REVIEW_SEEDS.slice(4, 7).map(({ seed }) => seed);

test("phrase convergence review subjects keep first-b family concentration below the repair ceiling", () => {
  const familyCounts = new Map<string, number>();

  for (const seed of SUBJECT_FAMILY_DIVERSITY_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const topSubject = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
      (family) => family.form === "subject",
    );

    assert.ok(topSubject !== undefined, `${seed} should expose a top subject family`);
    const family = topSubject.pattern.join("-");
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }

  const topFamilyShare = Math.max(...familyCounts.values()) / SUBJECT_FAMILY_DIVERSITY_REVIEW_SEEDS.length;

  assert.ok(familyCounts.size >= 2);
  assert.ok(topFamilyShare <= 2 / 3);
});
