import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "./generate.js";
import { exportMidi } from "./midi.js";

test("exportMidi creates a deterministic standard MIDI file", () => {
  const score = generateScore({ seed: "bach-001", lengthTicks: 7680 });
  const first = exportMidi(score.events);
  const second = exportMidi(score.events);

  assert.deepEqual(first, second);
  assert.deepEqual([...first.slice(0, 4)].map((code) => String.fromCharCode(code)).join(""), "MThd");
  assert.deepEqual([...first.slice(14, 18)].map((code) => String.fromCharCode(code)).join(""), "MTrk");
  assert.equal((first[8] << 8) | first[9], 1);
  assert.equal((first[10] << 8) | first[11], 5);
  assert.ok(first.length > 100);
});
