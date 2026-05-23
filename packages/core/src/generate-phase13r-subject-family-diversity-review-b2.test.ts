import assert from "node:assert/strict";
import test from "node:test";
import { REPRESENTATIVE_REVIEW_SEEDS, REVIEW_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

const PHASE_13R_REVIEW_SUBJECT_DIVERSITY_SEEDS = REPRESENTATIVE_REVIEW_SEEDS.slice(11).map(({ seed }) => seed);

test("phase-13R default review subjects keep second-b family concentration below the phase-13s ceiling", () => {
  const familyCounts = new Map<string, number>();

  for (const seed of PHASE_13R_REVIEW_SUBJECT_DIVERSITY_SEEDS) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const topSubject = output.diagnostics.phraseRepetitionReview.subjectStemFamilies.find(
      (family) => family.form === "subject",
    );

    assert.ok(topSubject !== undefined, `${seed} should expose a top subject family`);
    const family = topSubject.pattern.join("-");
    familyCounts.set(family, (familyCounts.get(family) ?? 0) + 1);
  }

  const topFamilyShare = Math.max(...familyCounts.values()) / PHASE_13R_REVIEW_SUBJECT_DIVERSITY_SEEDS.length;

  assert.ok(familyCounts.size >= 2);
  assert.ok(topFamilyShare <= 2 / 3);
});
