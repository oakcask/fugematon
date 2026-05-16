import type { PlaybackModel, PlaybackNote } from "./score.js";

export type ScheduledNote = {
  note: PlaybackNote;
  startSecond: number;
  stopSecond: number;
  frequency: number;
  gain: number;
};

const START_DELAY_SECONDS = 0.12;
const RELEASE_SECONDS = 0.08;
const MASTER_GAIN = 0.68;
const VOICE_GAINS = {
  soprano: 0.18,
  alto: 0.16,
  tenor: 0.15,
  bass: 0.2,
} as const;

export function createScheduledNotes(model: PlaybackModel, startAtSecond: number): ScheduledNote[] {
  return model.notes.map((note) => ({
    note,
    startSecond: startAtSecond + note.startSecond,
    stopSecond: startAtSecond + note.startSecond + note.durationSecond,
    frequency: midiToFrequency(note.pitch),
    gain: VOICE_GAINS[note.voice] * (note.velocity / 127),
  }));
}

export function midiToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12);
}

export class ScorePlayer {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly activeSources = new Set<OscillatorNode>();
  private readonly activeGains = new Set<GainNode>();
  private startedAtSecond: number | undefined;
  private durationSecond = 0;

  constructor(context = new AudioContext()) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(context.destination);
  }

  async play(model: PlaybackModel): Promise<void> {
    await this.context.resume();
    this.stop();

    const startAtSecond = this.context.currentTime + START_DELAY_SECONDS;
    this.startedAtSecond = startAtSecond;
    this.durationSecond = model.totalSeconds;
    for (const scheduled of createScheduledNotes(model, startAtSecond)) {
      this.scheduleOrganNote(scheduled);
    }
  }

  get playbackSecond(): number {
    if (this.startedAtSecond === undefined) {
      return 0;
    }

    return Math.min(this.durationSecond, Math.max(0, this.context.currentTime - this.startedAtSecond));
  }

  get isPlaying(): boolean {
    return this.startedAtSecond !== undefined && this.context.currentTime < this.startedAtSecond + this.durationSecond;
  }

  stop(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
      } catch {
        // Already-ended oscillators throw in some browsers; stopping remains best effort.
      }
      source.disconnect();
    }

    for (const gain of this.activeGains) {
      gain.disconnect();
    }

    this.activeSources.clear();
    this.activeGains.clear();
    this.startedAtSecond = undefined;
    this.durationSecond = 0;
  }

  private scheduleOrganNote(scheduled: ScheduledNote): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const attackEnd = scheduled.startSecond + 0.025;
    const releaseStart = Math.max(scheduled.startSecond, scheduled.stopSecond - RELEASE_SECONDS);

    oscillator.type = scheduled.note.voice === "bass" ? "sawtooth" : "triangle";
    oscillator.frequency.setValueAtTime(scheduled.frequency, scheduled.startSecond);

    gain.gain.setValueAtTime(0, scheduled.startSecond);
    gain.gain.linearRampToValueAtTime(scheduled.gain, attackEnd);
    gain.gain.setValueAtTime(scheduled.gain, releaseStart);
    gain.gain.linearRampToValueAtTime(0.0001, scheduled.stopSecond + RELEASE_SECONDS);

    oscillator.connect(gain).connect(this.master);
    oscillator.start(scheduled.startSecond);
    oscillator.stop(scheduled.stopSecond + RELEASE_SECONDS);

    this.activeSources.add(oscillator);
    this.activeGains.add(gain);
    oscillator.addEventListener(
      "ended",
      () => {
        this.activeSources.delete(oscillator);
        this.activeGains.delete(gain);
        oscillator.disconnect();
        gain.disconnect();
      },
      { once: true },
    );
  }
}
