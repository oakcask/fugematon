import assert from "node:assert/strict";
import test from "node:test";
import {
  diagnosticsForEpisodeMotivicRepetitionSeed,
  repeatedFormulaCount,
  topRepeatedFormulaCount,
} from "./generate-episode-motivic-repetition-test-helpers.js";

test("episode motivic repetition focused seeds avoid mechanical stock formula reuse", () => {
  const modalCadence = diagnosticsForEpisodeMotivicRepetitionSeed("modal-cadence");
  assert.ok(modalCadence.phraseDevelopmentReview.mechanicalReuseWindowCount <= 10);

  const modalAnswer = diagnosticsForEpisodeMotivicRepetitionSeed("modal-answer");
  assert.ok(modalAnswer.episodeMotivicDevelopment.repeatedStockFormulaCount <= 330);
  assert.ok(topRepeatedFormulaCount(modalAnswer.episodeMotivicDevelopment) <= 55);

  const angularAnswer = diagnosticsForEpisodeMotivicRepetitionSeed("angular-answer");
  assert.ok(repeatedFormulaCount(angularAnswer.episodeMotivicDevelopment, "uuuuu|eeeeee") <= 52);
  assert.equal(angularAnswer.episodeMotivicDevelopment.genericFreeCounterpointDurationTicks, 0);

  const darkEpisode = diagnosticsForEpisodeMotivicRepetitionSeed("dark-episode");
  assert.ok(darkEpisode.episodeMotivicDevelopment.transformationVariety >= 8);
  assert.ok(darkEpisode.episodeMotivicDevelopment.sourceMotiveConcentration <= 0.3);
});
