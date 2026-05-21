import test from "node:test";
import { PHASE_13S_MUSIC_BEAUTY_BATCHES } from "./generate-phase13s-music-beauty-test-helpers.js";
import { assertPhase13TCompletionEvidenceBatch } from "./generate-phase13t-current-blockers-test-helpers.js";

test("generateScore keeps Phase 13T completion evidence in batch E", () => {
  assertPhase13TCompletionEvidenceBatch(PHASE_13S_MUSIC_BEAUTY_BATCHES.fifth);
});
