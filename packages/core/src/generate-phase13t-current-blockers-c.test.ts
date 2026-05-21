import test from "node:test";
import { PHASE_13S_MUSIC_BEAUTY_BATCHES } from "./generate-phase13s-music-beauty-test-helpers.js";
import { assertPhase13TCurrentBlockerBatch } from "./generate-phase13t-current-blockers-test-helpers.js";

test("generateScore keeps Phase 13T current blockers visible in batch C", () => {
  assertPhase13TCurrentBlockerBatch(PHASE_13S_MUSIC_BEAUTY_BATCHES.third);
});
