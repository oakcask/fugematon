import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";
import { reviewTest } from "./test-profile.js";

reviewTest("generateScore links unresolved entry sentinels to selected entry context and deadlines", () => {
  const output = generateScore({
    seed: "modal-cadence",
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const unresolvedEntrySentinels = output.diagnostics.qualityVector.localSentinels.filter(
    (sentinel) => sentinel.kind === "unresolved-entry-severe-interval",
  );
  const unresolvedEntryLinks = output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks.filter(
    (link) => link.sentinelKind === "unresolved-entry-severe-interval",
  );

  assert.ok(unresolvedEntrySentinels.length > 0);
  assert.ok(unresolvedEntryLinks.length > 0);
  assert.ok(unresolvedEntryLinks.length <= unresolvedEntrySentinels.length);
  assert.ok(unresolvedEntryLinks.every((link) => link.voice !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.entryForm !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.entryStartTick !== undefined));
  assert.ok(unresolvedEntryLinks.every((link) => link.resolutionDeadlineTicks !== undefined));
  assert.ok(
    unresolvedEntryLinks.every(
      (link) =>
        link.sectionStartTick <= link.sentinelStartTick &&
        link.sentinelStartTick < link.sectionStartTick + link.sectionDurationTicks,
    ),
  );
});

reviewTest(
  "generateScore exposes candidate-diversity quality-vector features in selected candidate evaluations",
  () => {
    const output = generateScore({
      seed: "modal-cadence",
      lengthTicks: REVIEW_LENGTH_TICKS,
      selectionModel: "section-local-planner",
    });
    const selected = output.diagnostics.selectedCandidateEvaluations.at(-1);

    assert.ok(selected !== undefined);
    assert.equal(typeof selected.dimensions.texture.features.qualityVectorPitchClassUnisonDuration, "number");
    assert.equal(typeof selected.dimensions.texture.features.qualityVectorDurationBasedLockstep, "number");
    assert.equal(
      typeof selected.dimensions.harmony.features.qualityVectorUnresolvedEntrySevereIntervalDuration,
      "number",
    );
    assert.ok(Number.isFinite(selected.dimensions.texture.features.qualityVectorPitchClassUnisonDuration));
    assert.ok(Number.isFinite(selected.dimensions.texture.features.qualityVectorDurationBasedLockstep));
    assert.ok(Number.isFinite(selected.dimensions.harmony.features.qualityVectorUnresolvedEntrySevereIntervalDuration));
  },
);
