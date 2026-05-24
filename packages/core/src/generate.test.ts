import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPOSITION_DIAGNOSTICS_PROFILE,
  EXPOSITION_REPRESENTATIVE_SEEDS,
  FUGUE_FORM_REVIEW_LENGTH_TICKS,
  REVIEW_LENGTH_TICKS,
  VOICES,
} from "./constants.js";
import type { MetaEvent, NoteEvent } from "./events.js";
import { generateScore } from "./generate.js";
import { asMetaEvent, countIssues } from "./generate-test-helpers.js";

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

test("generateScore emits a tick-based exposition", () => {
  const output = generateScore({ seed: "phase-zero", lengthTicks: 960 });
  const first = asMetaEvent(output.events[0]);
  const last = asMetaEvent(output.events.at(-1));
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

  assert.equal(first.type, "generator-version");
  assert.equal(last.type, "score-end");
  assert.equal(last.tick, output.diagnostics.generatedUntilTick);
  assert.deepEqual(output.diagnostics.stateTransitions, ["exposition"]);
  assert.equal(output.diagnostics.subjectEntries.length, 4);
  assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.equal(output.diagnostics.rangeViolations, 0);
  assert.equal(output.diagnostics.subjectIdentityViolations, 0);
  assert.equal(output.diagnostics.answerPlanViolations, 0);
  assert.equal(output.diagnostics.keyMetadataMismatches, 0);
  assert.equal(countIssues(output.diagnostics.issues, "range-violation"), output.diagnostics.rangeViolations);
  assert.equal(countIssues(output.diagnostics.issues, "voice-crossing"), output.diagnostics.voiceCrossings);
  assert.equal(countIssues(output.diagnostics.issues, "parallel-perfect"), output.diagnostics.parallelPerfects);
});

test("generateScore validates reproducibility inputs", () => {
  assert.throws(() => generateScore({ seed: "", lengthTicks: 960 }), /seed/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 0 }), /lengthTicks/);
  assert.throws(() => generateScore({ seed: "x", lengthTicks: 960, parameters: { strictness: 2 } }), /strictness/);
});

test("generateScore keeps public event and diagnostics counts aligned", () => {
  const output = generateScore({
    seed: "event-contract",
    lengthTicks: REVIEW_LENGTH_TICKS,
    parameters: { density: 0.25, subjectPresence: 1 },
  });
  const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );
  const parameterChange = output.events.find(
    (event): event is Extract<MetaEvent, { type: "parameter-change" }> =>
      event.kind === "meta" && event.type === "parameter-change",
  );

  assert.equal(output.diagnostics.eventCount, output.events.length);
  assert.equal(output.diagnostics.noteCount, notes.length);
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
  assert.equal(parameterChange?.payload.parameters.strictness, 0.8);
  assert.equal(parameterChange?.payload.parameters.density, 0.25);
  assert.equal(parameterChange?.payload.parameters.subjectPresence, 1);

  for (const note of notes) {
    assert.ok(Number.isSafeInteger(note.startTick));
    assert.ok(Number.isSafeInteger(note.durationTicks));
    assert.ok(note.startTick >= 0);
    assert.ok(note.durationTicks > 0);
    assert.ok(note.startTick + note.durationTicks <= output.diagnostics.generatedUntilTick);
    assert.ok(VOICES.includes(note.voice));
    assert.ok(note.pitch >= 0 && note.pitch <= 127);
    assert.ok(note.velocity >= 0 && note.velocity <= 127);
  }
});

test("generateScore exposes ordered subject and answer entries", () => {
  const output = generateScore({ seed: "bach-001", lengthTicks: 7680 });

  assert.deepEqual(
    output.diagnostics.subjectEntries
      .slice(0, 4)
      .map((entry) => [entry.voice, entry.form, entry.state, entry.startTick, entry.localKey.tonic, entry.answerKind]),
    [
      ["alto", "subject", "exposition", 0, output.diagnostics.subjectEntries[0]!.globalKey.tonic, undefined],
      ["soprano", "answer", "exposition", 1920, output.diagnostics.subjectEntries[1]!.localKey.tonic, "tonal"],
      ["tenor", "subject", "exposition", 3840, output.diagnostics.subjectEntries[2]!.globalKey.tonic, undefined],
      ["bass", "answer", "exposition", 5760, output.diagnostics.subjectEntries[3]!.localKey.tonic, "tonal"],
    ],
  );
  assert.deepEqual(
    output.diagnostics.subjectEntries.slice(0, 4).map((entry) => entry.globalKey),
    Array.from({ length: 4 }, () => output.diagnostics.subjectEntries[0]!.globalKey),
  );
  for (const entry of output.diagnostics.subjectEntries) {
    assert.equal(entry.expectedDegreePattern.length, entry.actualPitchClassSequence.length);
    assert.ok(entry.registerTarget > 0);
  }
  assert.ok(output.diagnostics.generatedUntilTick >= 7680);
});

test("generateScore extends long scores with fugue-form states", () => {
  const output = generateScore({ seed: "fugue-smoke", lengthTicks: FUGUE_FORM_REVIEW_LENGTH_TICKS });
  const stateChanges = output.events.filter(
    (event): event is Extract<MetaEvent, { type: "state-change" }> =>
      event.kind === "meta" && event.type === "state-change",
  );

  assert.ok(output.diagnostics.generatedUntilTick >= FUGUE_FORM_REVIEW_LENGTH_TICKS);
  assert.ok(output.diagnostics.stateTransitions.includes("episode"));
  assert.ok(output.diagnostics.stateTransitions.includes("subject-return"));
  assert.ok(output.diagnostics.stateTransitions.includes("stretto-like"));
  assert.ok(
    output.diagnostics.subjectEntries.some((entry) => entry.state === "subject-return" && entry.form === "subject"),
  );
  assert.ok(
    output.diagnostics.subjectEntries.some((entry) => entry.state === "stretto-like" && entry.form === "answer"),
  );
  assert.deepEqual(
    stateChanges.map((event) => event.payload.state),
    output.diagnostics.stateTransitions,
  );
  assert.ok(output.diagnostics.candidateEvaluations > 0);
});

test("generateScore emits section plans with bounded harmonic anchors", () => {
  const output = generateScore({ seed: "section-plan-contract", lengthTicks: REVIEW_LENGTH_TICKS });
  const continuationPlans = output.diagnostics.sectionPlans.filter((plan) => plan.state !== "exposition");

  assert.deepEqual(
    output.diagnostics.sectionPlans.map((plan) => plan.state),
    output.diagnostics.stateTransitions,
  );
  assert.equal(output.diagnostics.sectionPlans[0]?.startTick, 0);
  assert.ok(continuationPlans.length > 0);

  for (const plan of output.diagnostics.sectionPlans) {
    assert.ok(plan.durationTicks > 0);
    assert.ok(plan.startTick >= 0);
    assert.equal(plan.anchors[0]?.tick, plan.startTick);
    assert.equal(plan.anchors[0]?.function, "tonic");
    assert.ok(plan.anchors.some((anchor) => anchor.cadenceTarget));

    const anchorTicks = plan.anchors.map((anchor) => anchor.tick);
    assert.deepEqual(
      anchorTicks,
      [...anchorTicks].sort((left, right) => left - right),
    );

    for (const anchor of plan.anchors) {
      assert.ok(anchor.tick >= plan.startTick);
      assert.ok(anchor.tick <= plan.startTick + plan.durationTicks);
      assert.equal(anchor.localKey.mode, plan.localKey.mode);
    }
  }
});

test("generateScore validates representative exposition seeds", () => {
  for (const { seed, category } of EXPOSITION_REPRESENTATIVE_SEEDS) {
    const output = generateScore({ seed, lengthTicks: 7680 });
    const notes = output.events.filter((event): event is NoteEvent => event.kind === "note");

    assert.ok(category === "fixed" || category === "boundary");
    assert.ok(output.diagnostics.generatedUntilTick >= 7680);
    assert.equal(output.diagnostics.subjectEntries.length, 4);
    assert.deepEqual(new Set(notes.map((note) => note.voice)), new Set(VOICES));
    assert.equal(output.diagnostics.rangeViolations, EXPOSITION_DIAGNOSTICS_PROFILE.rangeViolations);
    assert.equal(output.diagnostics.voiceCrossings, EXPOSITION_DIAGNOSTICS_PROFILE.voiceCrossings);
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
