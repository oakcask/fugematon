import assert from "node:assert/strict";
import test from "node:test";
import { PHASE_1_DIAGNOSTICS_PROFILE, PHASE_1_REPRESENTATIVE_SEEDS, VOICES } from "./constants.js";
import type { MetaEvent, NoteEvent, ScoreEvent } from "./events.js";
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

test("generateScore emits a tick-based phase-1 exposition", () => {
  const output = generateScore({ seed: "phase-zero", lengthTicks: 960 });
  const first = asMetaEvent(output.events[0]);
  const last = asMetaEvent(output.events.at(-1));
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

  assert.equal(first.type, "generator-version");
  assert.equal(last.type, "score-end");
  assert.equal(last.tick, output.diagnostics.generatedUntilTick);
  assert.deepEqual(output.diagnostics.stateTransitions, ["exposition"]);
  assert.equal(output.diagnostics.subjectEntries.length, 4);
  assert.deepEqual(
    new Set(notes.map((note) => note.voice)),
    new Set(VOICES),
  );
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.equal(output.diagnostics.rangeViolations, 0);
  assert.equal(countIssues(output.diagnostics.issues, "range-violation"), output.diagnostics.rangeViolations);
  assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), output.diagnostics.voiceCrossings);
  assert.equal(countIssues(output.diagnostics.issues, "parallel-perfect"), output.diagnostics.parallelPerfects);
});

test("generateScore validates reproducibility inputs", () => {
  assert.throws(() => generateScore({ seed: "", lengthTicks: 960 }), /seed/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 0 }), /lengthTicks/);
  assert.throws(
    () => generateScore({ seed: "x", lengthTicks: 960, parameters: { strictness: 2 } }),
    /strictness/,
  );
});

test("generateScore exposes ordered subject and answer entries", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: 7680 });

  assert.deepEqual(
    output.diagnostics.subjectEntries.slice(0, 4).map((entry) => [entry.voice, entry.form, entry.state, entry.startTick]),
    [
      ["alto", "subject", "exposition", 0],
      ["soprano", "answer", "exposition", 1920],
      ["tenor", "subject", "exposition", 3840],
      ["bass", "answer", "exposition", 5760],
    ],
  );
  assert.ok(output.diagnostics.generatedUntilTick >= 7680);
});

test("generateScore extends long scores with phase-3 fugue states", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: 43_200 });
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.ok(output.diagnostics.generatedUntilTick >= 43_200);
  assert.ok(output.diagnostics.stateTransitions.includes("episode"));
  assert.ok(output.diagnostics.stateTransitions.includes("subject-return"));
  assert.ok(output.diagnostics.stateTransitions.includes("stretto-like"));
  assert.ok(
    output.diagnostics.subjectEntries.some(
      (entry) => entry.state === "subject-return" && entry.form === "subject",
    ),
  );
  assert.ok(
    output.diagnostics.subjectEntries.some((entry) => entry.state === "stretto-like" && entry.form === "answer"),
  );
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
});

test("generateScore validates representative phase-1 seeds", () => {
  for (const { seed, category } of PHASE_1_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: 7680 });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= 7680);
    assert.equal(output.diagnostics.subjectEntries.length, 4);
    assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
    assert.equal(output.diagnostics.rangeViolations, PHASE_1_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, PHASE_1_DIAGNOSTICS_PROFILE.voiceCrossings);
    assert.equal(countIssues(output.diagnostics.issues, "range-violation"), 0);
    assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), 0);
    for (const issue of output.diagnostics.issues) {
      assert.equal(issue.severity, "warning");
      assert.ok(Number.isSafeInteger(issue.tick));
      assert.ok(issue.voices.length > 0);
      assert.ok(issue.message.length > 0);
    }
  }
});

function countIssues(
  issues: readonly { code: "range-violation" | "voice-crossing" | "parallel-perfect" }[],
  code: "range-violation" | "voice-crossing" | "parallel-perfect",
): number {
  return issues.filter((issue) => issue.code === code).length;
}

function asMetaEvent(event: ScoreEvent | undefined): MetaEvent {
  assert.equal(event?.kind, "meta");
  if (event === undefined || event.kind !== "meta") {
    throw new Error("expected a meta event");
  }

  return event;
}
