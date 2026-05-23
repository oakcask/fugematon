import assert from "node:assert/strict";
import { REVIEW_LENGTH_TICKS } from "./constants.js";
import type { NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";

export function assertBassEntrySupportSeeds(seeds: readonly string[]) {
  for (const seed of seeds) {
    const output = generateScore({ seed, lengthTicks: REVIEW_LENGTH_TICKS });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
    const firstAnswer = output.diagnostics.subjectEntries.find(
      (entry) => entry.state === "exposition" && entry.form === "answer",
    );

    assert.ok(firstAnswer !== undefined);
    assert.deepEqual(
      notes.filter((note) => note.voice === "bass" && note.startTick < firstAnswer.startTick),
      [],
    );
  }
}
