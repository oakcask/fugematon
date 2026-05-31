import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createGainEnvelope, createScheduledNotes, midiToFrequency } from "./audio.js";
import { createPlaybackModel } from "./score.js";

test("createScheduledNotes maps playback notes to absolute audio times", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const scheduled = createScheduledNotes(model, 10);

  assert.equal(scheduled.length, model.notes.length);
  assert.equal(scheduled[0]!.startSecond, 10 + model.notes[0]!.startSecond);
  assert.ok(scheduled.every((note) => note.stopSecond > note.startSecond));
  assert.ok(scheduled.every((note) => note.frequency > 0));
  assert.ok(scheduled.every((note) => note.gain > 0 && note.gain <= 0.22));
});

test("createScheduledNotes preserves default voice dynamics", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const scheduled = createScheduledNotes(model, 0);
  const firstByVoice = new Map(scheduled.map((note) => [note.note.voice, note]));

  assert.equal(round(firstByVoice.get("soprano")!.sustainGain), expectedSustainGain(firstByVoice.get("soprano")!));
  assert.equal(round(firstByVoice.get("alto")!.sustainGain), expectedSustainGain(firstByVoice.get("alto")!));
  assert.equal(round(firstByVoice.get("tenor")!.sustainGain), expectedSustainGain(firstByVoice.get("tenor")!));
  assert.equal(round(firstByVoice.get("bass")!.sustainGain), expectedSustainGain(firstByVoice.get("bass")!));
  assert.equal(round(firstByVoice.get("soprano")!.pan), round((24 - 64) / 63));
  assert.equal(round(firstByVoice.get("bass")!.pan), round((104 - 64) / 63));
});

test("createScheduledNotes splits velocity attack emphasis from sustained gain", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }), "organ-default");
  const bassEntry = createScheduledNotes(model, 0).find(
    (scheduled) =>
      scheduled.note.voice === "bass" && (scheduled.note.role === "subject" || scheduled.note.role === "answer"),
  )!;
  const directSustainGain = bassEntry.note.gain * (bassEntry.note.volume / 127) * (bassEntry.note.velocity / 127);

  assert.ok(bassEntry.attackPeakGain > bassEntry.sustainGain);
  assert.notEqual(round(bassEntry.sustainGain), round(directSustainGain));
  assert.ok(bassEntry.note.webAudioSynth.velocityToAttackEmphasis > bassEntry.note.webAudioSynth.velocityToSustainGain);
});

test("createGainEnvelope follows profile attack decay sustain and release timing", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }), "organ-default");
  const scheduled = createScheduledNotes(model, 20).find((note) => note.note.durationSecond > 1)!;
  const envelope = createGainEnvelope(scheduled);

  assert.equal(
    round(envelope.attackEndSecond),
    round(scheduled.startSecond + scheduled.note.webAudioSynth.attackSeconds),
  );
  assert.equal(
    round(envelope.decayEndSecond),
    round(envelope.attackEndSecond + scheduled.note.webAudioSynth.decaySeconds),
  );
  assert.equal(
    round(envelope.releaseStartSecond),
    round(scheduled.stopSecond - scheduled.note.webAudioSynth.releaseSeconds),
  );
  assert.equal(
    round(envelope.releaseEndSecond),
    round(scheduled.stopSecond + scheduled.note.webAudioSynth.releaseSeconds),
  );
  assert.equal(round(envelope.attackPeakGain), round(scheduled.attackPeakGain));
  assert.equal(round(envelope.sustainGain), round(scheduled.sustainGain));
});

test("createScheduledNotes can schedule playback from an offset", () => {
  const model = createPlaybackModel(generateScore({ seed: "fugue-smoke", lengthTicks: 7680 }));
  const offsetSecond = model.notes.find((note) => note.startSecond > 0)!.startSecond;
  const scheduled = createScheduledNotes(model, 10, offsetSecond);

  assert.ok(scheduled.length < model.notes.length);
  assert.ok(scheduled.every((note) => note.stopSecond > note.startSecond));
  assert.ok(scheduled.every((note) => note.note.startSecond + note.note.durationSecond > offsetSecond));
  assert.equal(Math.min(...scheduled.map((note) => note.startSecond)), 10);
});

test("midiToFrequency uses A4 as 440hz", () => {
  assert.equal(midiToFrequency(69), 440);
  assert.ok(Math.abs(midiToFrequency(60) - 261.625565) < 0.000001);
});

function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function expectedSustainGain(scheduled: ReturnType<typeof createScheduledNotes>[number]): number {
  const velocityRatio = scheduled.note.velocity / 127;
  const velocityScale =
    1 -
    scheduled.note.webAudioSynth.velocityToSustainGain +
    velocityRatio * scheduled.note.webAudioSynth.velocityToSustainGain;

  return round(
    scheduled.note.gain * (scheduled.note.volume / 127) * scheduled.note.webAudioSynth.sustainLevel * velocityScale,
  );
}
