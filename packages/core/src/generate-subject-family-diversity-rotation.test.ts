import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS, ROTATION_REVIEW_SEEDS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

const SUBJECT_FAMILY_DIVERSITY_ROTATION_SEEDS = ROTATION_REVIEW_SEEDS.slice(0, 4).map(({ seed }) => seed);

reviewTest(
  "phrase convergence rotation subjects keep first-batch family concentration below the repair ceiling",
  () => {
    const familyCounts = new Map<string, number>();

    for (const seed of SUBJECT_FAMILY_DIVERSITY_ROTATION_SEEDS) {
      const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
      const topSubject = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
        (family) => family.form === "subject",
      );

      assert.ok(topSubject !== undefined, `${seed} should expose a top subject family`);
      const family = topSubject.pattern.join("-");
      familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
    }

    const topFamilyShare = Math.max(...familyCounts.values()) / SUBJECT_FAMILY_DIVERSITY_ROTATION_SEEDS.length;

    assert.ok(familyCounts.size >= 2);
    assert.ok(topFamilyShare <= 0.5);
  },
);
