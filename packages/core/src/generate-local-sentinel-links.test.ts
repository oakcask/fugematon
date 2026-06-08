import assert from "node:assert/strict";
import test from "node:test";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import { cachedGenerateScore as generateScore } from "./generate-test-helpers.js";

test("generateScore keeps local sentinels traceable to selected candidate sections", () => {
  const output = generateScore({
    seed: "circle-fifths",
    lengthTicks: REVIEW_LENGTH_TICKS,
    selectionModel: "section-local-planner",
  });
  const selectedSections = output.diagnostics.selectedCandidateEvaluations.flatMap(
    (evaluation) => evaluation.explanations.sections,
  );

  assert.equal(output.diagnostics.localSentinelCandidateTrace.schemaVersion, 1);
  if (output.diagnostics.qualityVector.localSentinels.length === 0) {
    assert.equal(output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks.length, 0);
    return;
  }
  const firstContinuationTick = Math.min(...selectedSections.map((section) => section.startTick));
  const continuationSentinels = output.diagnostics.qualityVector.localSentinels.filter(
    (sentinel) => sentinel.startTick >= firstContinuationTick,
  );

  if (continuationSentinels.length === 0) {
    assert.equal(output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks.length, 0);
    return;
  }
  assert.ok(output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks.length > 0);
  for (const sentinel of continuationSentinels) {
    assert.ok(
      selectedSections.some(
        (section) =>
          sentinel.startTick >= section.startTick &&
          sentinel.startTick < section.startTick + section.durationTicks &&
          (sentinel.sectionRole === "mixed" || sentinel.sectionRole === section.state),
      ),
    );
    assert.ok(
      output.diagnostics.localSentinelCandidateTrace.sentinelCandidateLinks.some(
        (link) =>
          link.sentinelKind === sentinel.kind &&
          link.sentinelStartTick === sentinel.startTick &&
          link.sentinelDurationTicks === sentinel.durationTicks,
      ),
    );
  }
});
