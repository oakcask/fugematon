import type { PlaybackModel, PlaybackNote } from "./score.js";

export type ScheduledNote = {
  note: PlaybackNote;
  startSecond: number;
  stopSecond: number;
  frequency: number;
  gain: number;
  pan: number;
};

const START_DELAY_SECONDS = 0.12;
const MASTER_GAIN = 0.68;

export function createScheduledNotes(model: PlaybackModel, startAtSecond: number): ScheduledNote[] {
  return model.notes.map((note) => ({
    note,
    startSecond: startAtSecond + note.startSecond,
    stopSecond: startAtSecond + note.startSecond + note.durationSecond,
    frequency: midiToFrequency(note.pitch),
    gain: note.gain * (note.volume / 127) * (note.velocity / 127),
    pan: (note.pan - 64) / 63,
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
  private readonly activePanners = new Set<StereoPannerNode>();
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

    for (const panner of this.activePanners) {
      panner.disconnect();
    }

    this.activeSources.clear();
    this.activeGains.clear();
    this.activePanners.clear();
    this.startedAtSecond = undefined;
    this.durationSecond = 0;
  }

  private scheduleOrganNote(scheduled: ScheduledNote): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const attackEnd = scheduled.startSecond + 0.025;
    const releaseStart = Math.max(scheduled.startSecond, scheduled.stopSecond - scheduled.note.releaseSeconds);

    oscillator.type = scheduled.note.oscillatorType;
    oscillator.frequency.setValueAtTime(scheduled.frequency, scheduled.startSecond);

    gain.gain.setValueAtTime(0, scheduled.startSecond);
    gain.gain.linearRampToValueAtTime(scheduled.gain, attackEnd);
    gain.gain.setValueAtTime(scheduled.gain, releaseStart);
    gain.gain.linearRampToValueAtTime(0.0001, scheduled.stopSecond + scheduled.note.releaseSeconds);
    panner.pan.setValueAtTime(scheduled.pan, scheduled.startSecond);

    oscillator.connect(gain).connect(panner).connect(this.master);
    oscillator.start(scheduled.startSecond);
    oscillator.stop(scheduled.stopSecond + scheduled.note.releaseSeconds);

    this.activeSources.add(oscillator);
    this.activeGains.add(gain);
    this.activePanners.add(panner);
    oscillator.addEventListener(
      "ended",
      () => {
        this.activeSources.delete(oscillator);
        this.activeGains.delete(gain);
        this.activePanners.delete(panner);
        oscillator.disconnect();
        gain.disconnect();
        panner.disconnect();
      },
      { once: true },
    );
  }
}
