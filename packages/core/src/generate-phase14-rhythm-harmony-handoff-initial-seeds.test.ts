import test from "node:test";
import {
  assertPhase14ReviewSeedsExposeHarmonicContinuityPressure,
  PHASE_14_REOPENED_REVIEW_SEED_GROUPS,
} from "./generate-phase14-rhythm-harmony-handoff-test-helpers.js";

test("phase 14 initial review seeds expose short-episode harmonic-continuity pressure", () => {
  assertPhase14ReviewSeedsExposeHarmonicContinuityPressure(PHASE_14_REOPENED_REVIEW_SEED_GROUPS.initial);
});
