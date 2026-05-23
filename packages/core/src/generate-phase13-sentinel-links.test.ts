import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_5_LENGTH_TICKS } from "./constants.js";
import { generateScore } from "./generate.js";

test("generateScore keeps phase-13 local sentinels traceable to selected candidate sections", () => {
  const output = generateScore({
    seed: "circle-fifths",
    lengthTicks: PHASE_5_LENGTH_TICKS,
    selectionModel: "phase10-section-local-planner",
  });
  const selectedSections = output.diagnostics.selectedCandidateEvaluations.flatMap(
    (evaluation) => evaluation.explanations.sections,
  );

  assert.ok(output.diagnostics.qualityVector.localSentinels.length > 0);
  const firstContinuationTick = Math.min(...selectedSections.map((section) => section.startTick));
  const continuationSentinels = output.diagnostics.qualityVector.localSentinels.filter(
    (sentinel) => sentinel.startTick >= firstContinuationTick,
  );

  assert.ok(continuationSentinels.length > 0);
  assert.equal(output.diagnostics.localSentinelCandidateTrace.schemaVersion, 1);
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
