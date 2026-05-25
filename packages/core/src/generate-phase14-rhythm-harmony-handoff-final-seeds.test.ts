import test from "node:test";
import {
  assertPhase14ReviewSeedsImproveHarmonicContinuityEvidence,
  PHASE_14_REOPENED_REVIEW_SEED_GROUPS,
} from "./generate-phase14-rhythm-harmony-handoff-test-helpers.js";

test("phase 14 final review seeds improve short-episode harmonic-continuity evidence", () => {
  assertPhase14ReviewSeedsImproveHarmonicContinuityEvidence(PHASE_14_REOPENED_REVIEW_SEED_GROUPS.final);
});
