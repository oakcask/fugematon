import assert from "node:assert/strict";
import test from "node:test";
import { generateScore } from "@fugematon/core";
import { createGainEnvelope, createScheduledNotes, midiToFrequency, ScorePlayer } from "./audio.js";
import { createPlaybackModel, type PlaybackModel } from "./score.js";

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

test("ScorePlayer queueNext schedules the next segment exactly at the playback boundary", async () => {
  const context = new FakeAudioContext();
  const player = new ScorePlayer(context as unknown as AudioContext);
  const first = createTinyPlaybackModel({
    totalSeconds: 4,
    notes: [{ startSecond: 0, durationSecond: 1 }],
  });
  const next = createTinyPlaybackModel({
    totalSeconds: 3,
    notes: [{ startSecond: 0, durationSecond: 1 }],
  });

  assert.equal(await player.play(first), true);
  assert.equal(context.oscillatorStarts[0], 0.12);

  context.currentTime = 1;
  assert.equal(player.queueNext(next, 4), true);

  assert.equal(context.oscillatorStarts.at(-1), 4.12);
});

test("ScorePlayer queueNext leaves existing release tails scheduled", async () => {
  const context = new FakeAudioContext();
  const player = new ScorePlayer(context as unknown as AudioContext);
  const releaseSeconds = 0.5;
  const first = createTinyPlaybackModel({
    totalSeconds: 4,
    notes: [{ startSecond: 3.5, durationSecond: 0.5, releaseSeconds }],
  });
  const next = createTinyPlaybackModel({
    totalSeconds: 3,
    notes: [{ startSecond: 0, durationSecond: 1, releaseSeconds }],
  });

  assert.equal(await player.play(first), true);
  const firstTailStop = context.oscillatorStops[0];
  context.currentTime = 1;

  assert.equal(player.queueNext(next, 4), true);

  assert.equal(context.immediateStops, 0);
  assert.equal(context.oscillatorStops[0], firstTailStop);
  assert.ok(context.oscillatorStops[0]! > 4.12);
});

test("ScorePlayer queueNext extends playback duration across the original segment boundary", async () => {
  const context = new FakeAudioContext();
  const player = new ScorePlayer(context as unknown as AudioContext);
  const first = createTinyPlaybackModel({
    totalSeconds: 4,
    notes: [{ startSecond: 0, durationSecond: 1 }],
  });
  const next = createTinyPlaybackModel({
    totalSeconds: 3,
    notes: [{ startSecond: 0, durationSecond: 1 }],
  });

  assert.equal(await player.play(first), true);
  context.currentTime = 1;
  assert.equal(player.queueNext(next, 4), true);

  context.currentTime = 4.2;
  assert.equal(player.isPlaying, true);
  assert.equal(round(player.playbackSecond), 4.08);

  context.currentTime = 7.2;
  assert.equal(player.isPlaying, false);
  assert.equal(player.playbackSecond, 7);
});

test("ScorePlayer queueNext rejects invalid boundaries", async () => {
  const context = new FakeAudioContext();
  const player = new ScorePlayer(context as unknown as AudioContext);
  const model = createTinyPlaybackModel({
    totalSeconds: 4,
    notes: [{ startSecond: 0, durationSecond: 1 }],
  });

  assert.equal(player.queueNext(model, 4), false);
  assert.equal(await player.play(model), true);
  context.currentTime = 2;
  assert.equal(player.queueNext(model, 1), false);
  assert.equal(player.queueNext(model, Number.NaN), false);
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

type TinyPlaybackNoteInput = {
  startSecond: number;
  durationSecond: number;
  releaseSeconds?: number;
};

function createTinyPlaybackModel(input: { totalSeconds: number; notes: TinyPlaybackNoteInput[] }): PlaybackModel {
  return {
    bpm: 60,
    ticksPerQuarter: 480,
    timeSignature: { numerator: 4, denominator: 4 },
    keySignature: { tonic: "C", mode: "major" },
    totalTicks: input.totalSeconds * 480,
    totalSeconds: input.totalSeconds,
    notes: input.notes.map((note, index) => ({
      voice: "soprano",
      startTick: note.startSecond * 480,
      endTick: (note.startSecond + note.durationSecond) * 480,
      startSecond: note.startSecond,
      durationSecond: note.durationSecond,
      pitch: 60 + index,
      velocity: 96,
      volume: 100,
      gain: 0.2,
      pan: 64,
      oscillatorType: "sine",
      webAudioSynth: {
        attackSeconds: 0.01,
        decaySeconds: 0.02,
        sustainLevel: 0.7,
        releaseSeconds: note.releaseSeconds ?? 0.1,
        velocityToAttackEmphasis: 0.1,
        velocityToSustainGain: 0.2,
      },
    })),
    stateTransitions: [],
    subjectEntries: [],
    sectionPlans: [],
    performanceProfile: {
      id: "strict-counterpoint",
      version: 1,
    },
    pitchRange: { min: 60, max: 60 + input.notes.length },
  };
}

class FakeAudioParam {
  value = 0;

  setValueAtTime(_value: number, _time: number): void {}

  linearRampToValueAtTime(_value: number, _time: number): void {}
}

class FakeAudioNode {
  connect<TNode>(node: TNode): TNode {
    return node;
  }

  disconnect(): void {}
}

class FakeGainNode extends FakeAudioNode {
  readonly gain = new FakeAudioParam();
}

class FakeStereoPannerNode extends FakeAudioNode {
  readonly pan = new FakeAudioParam();
}

class FakeOscillatorNode extends FakeAudioNode {
  readonly frequency = new FakeAudioParam();
  type: OscillatorType = "sine";

  constructor(private readonly context: FakeAudioContext) {
    super();
  }

  start(time?: number): void {
    this.context.oscillatorStarts.push(time ?? this.context.currentTime);
  }

  stop(time?: number): void {
    if (time === undefined) {
      this.context.immediateStops += 1;
      return;
    }

    this.context.oscillatorStops.push(time);
  }

  addEventListener(
    _type: string,
    _listener: EventListenerOrEventListenerObject,
    _options?: AddEventListenerOptions,
  ): void {}
}

class FakeAudioContext {
  currentTime = 0;
  readonly destination = new FakeAudioNode();
  readonly oscillatorStarts: number[] = [];
  readonly oscillatorStops: number[] = [];
  immediateStops = 0;

  createGain(): GainNode {
    return new FakeGainNode() as unknown as GainNode;
  }

  createOscillator(): OscillatorNode {
    return new FakeOscillatorNode(this) as unknown as OscillatorNode;
  }

  createStereoPanner(): StereoPannerNode {
    return new FakeStereoPannerNode() as unknown as StereoPannerNode;
  }

  resume(): Promise<void> {
    return Promise.resolve();
  }
}
