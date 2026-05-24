import assert from "node:assert/strict";
import test from "node:test";
import { generateScore, VOICES } from "@fugematon/core";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  getPerformanceProfile,
  listPerformanceProfiles,
  performanceProfileMetadata,
  scoreToPerformanceEvents,
} from "./index.js";

test("scoreToPerformanceEvents resolves deterministic default performance events", () => {
  const score = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const first = scoreToPerformanceEvents({ events: score.events, seed: score.diagnostics.seed });
  const second = scoreToPerformanceEvents({ events: score.events, seed: score.diagnostics.seed });

  assert.deepEqual(first, second);
  assert.equal(first.length, score.diagnostics.noteCount);
  assert.deepEqual(new Set(first.map((event) => event.voice)), new Set(VOICES));
  assert.ok(first.some((event) => event.role === "counter-subject"));
  assert.ok(first.some((event) => event.role === "free-counterpoint"));
  assert.ok(first.every((event) => event.durationTicks > 0));
  assert.ok(first.every((event) => event.velocity >= 1 && event.velocity <= 127));
});

test("default profile keeps current voice mapping metadata", () => {
  const profile = getPerformanceProfile(DEFAULT_PERFORMANCE_PROFILE_ID);
  const metadata = performanceProfileMetadata(profile);

  assert.deepEqual(metadata, { id: "organ-default", version: 2 });
  assert.equal(profile.voices.soprano.channel, 0);
  assert.equal(profile.voices.alto.channel, 1);
  assert.equal(profile.voices.tenor.channel, 2);
  assert.equal(profile.voices.bass.channel, 3);
  assert.equal(profile.voices.soprano.program, 19);
  assert.equal(profile.voices.bass.program, 32);
  assert.equal(profile.voices.bass.pan, 64);
  assert.ok(profile.voices.tenor.pan >= 56 && profile.voices.tenor.pan <= 72);
  assert.ok(profile.voices.alto.pan < profile.voices.bass.pan);
  assert.ok(profile.voices.soprano.pan > profile.voices.bass.pan);
  assert.equal(profile.voices.bass.oscillatorType, "sawtooth");
  assert.deepEqual(profile.voices.alto.velocityCurve, { kind: "linear", scale: 1, minimum: 64, maximum: 112 });
});

test("profile registry exposes reviewable profile ids", () => {
  assert.deepEqual(listPerformanceProfiles(), [
    { id: "organ-default", version: 2 },
    { id: "strict-counterpoint", version: 2 },
  ]);
});

test("default profile keeps quiet support notes audible", () => {
  const score = generateScore({ seed: "fugue-smoke", lengthTicks: 7680 });
  const performanceEvents = scoreToPerformanceEvents({ events: score.events, seed: score.diagnostics.seed });
  const quietSupport = performanceEvents.find(
    (event) => event.voice === "alto" && event.startTick === 7680 && event.role === "free-counterpoint",
  );

  assert.equal(quietSupport?.velocity, 64);
});
