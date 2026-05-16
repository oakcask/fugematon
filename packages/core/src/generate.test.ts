import assert from "node:assert/strict";
import test from "node:test";
import type { MetaEvent, ScoreEvent } from "./events.js";
import { generateScore } from "./generate.js";

test("generateScore is deterministic for identical input", () => {
  const input = {
    seed: "bach-001",
    lengthTicks: 7680,
    parameters: { strictness: 0.75 },
  };

  assert.deepEqual(generateScore(input), generateScore(input));
});

test("generateScore changes seed-derived metadata for different seeds", () => {
  const first = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const second = generateScore({ seed: "bach-002", lengthTicks: 7680 });

  assert.notDeepEqual(first.events, second.events);
});

test("generateScore emits a tick-based phase-0 score envelope", () => {
  const output = generateScore({ seed: "phase-zero", lengthTicks: 960 });
  const first = asMetaEvent(output.events[0]);
  const last = asMetaEvent(output.events.at(-1));

  assert.equal(first.type, "generator-version");
  assert.equal(last.type, "score-end");
  assert.equal(last.tick, 960);
  assert.deepEqual(output.diagnostics.stateTransitions, ["phase-0"]);
  assert.equal(output.diagnostics.noteCount, 0);
});

test("generateScore validates reproducibility inputs", () => {
  assert.throws(() => generateScore({ seed: "", lengthTicks: 960 }), /seed/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 0 }), /lengthTicks/);
  assert.throws(
    () => generateScore({ seed: "x", lengthTicks: 960, parameters: { strictness: 2 } }),
    /strictness/,
  );
});

function asMetaEvent(event: ScoreEvent | undefined): MetaEvent {
  assert.equal(event?.kind, "meta");
  if (event === undefined || event.kind !== "meta") {
    throw new Error("expected a meta event");
  }

  return event;
}
