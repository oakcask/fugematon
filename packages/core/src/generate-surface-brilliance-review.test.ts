import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("surface brilliance separates kinetic modal color from fugue-smoke control", () => {
  const kineticModal = generateScore({ seed: "seed-19l7uit-1u226cc", lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics
    .surfaceBrilliance;
  const fugueSmoke = generateScore({ seed: "fugue-smoke", lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics
    .surfaceBrilliance;

  assert.ok(kineticModal.score > fugueSmoke.score);
  assert.ok(kineticModal.shortNoteShare >= 0.52);
  assert.ok(kineticModal.supportMotionDensityPerQuarter > fugueSmoke.supportMotionDensityPerQuarter);
  assert.ok(kineticModal.modalColorShare > fugueSmoke.modalColorShare);
  assert.ok(kineticModal.signals.includes("modal-color"));
  assert.ok(kineticModal.tradeoffs.includes("counter-subject-identity-tradeoff"));
});

reviewTest("surface brilliance treats modal color as a reusable structural signal", () => {
  const denseModal = generateScore({ seed: "dense-modal", lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics
    .surfaceBrilliance;
  const bachControl = generateScore({ seed: "bach-001", lengthTicks: REVIEW_LENGTH_TICKS }).diagnostics
    .surfaceBrilliance;

  assert.ok(denseModal.modalColorShare > 0.5);
  assert.ok(denseModal.signals.includes("modal-color"));
  assert.equal(bachControl.modalColorShare, 0);
});
