import type { PlaybackModel, PlaybackNote } from "./score.js";

export type ScheduledNote = {
  note: PlaybackNote;
  startSecond: number;
  stopSecond: number;
  frequency: number;
  gain: number;
  pan: number;
};

export type PlayOptions = {
  offsetSecond?: number;
  signal?: AbortSignal;
};

const START_DELAY_SECONDS = 0.12;
const MASTER_GAIN = 0.68;

export function createScheduledNotes(model: PlaybackModel, startAtSecond: number, offsetSecond = 0): ScheduledNote[] {
  return model.notes
    .filter((note) => note.startSecond + note.durationSecond > offsetSecond)
    .map((note) => ({
      note,
      startSecond: startAtSecond + Math.max(0, note.startSecond - offsetSecond),
      stopSecond: startAtSecond + note.startSecond + note.durationSecond - offsetSecond,
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
  private playbackOffsetSecond = 0;

  constructor(context = new AudioContext()) {
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(context.destination);
  }

  async play(model: PlaybackModel, options: PlayOptions = {}): Promise<boolean> {
    if (options.signal?.aborted) {
      return false;
    }

    await this.context.resume();
    if (options.signal?.aborted) {
      return false;
    }

    this.stop();
    if (options.signal?.aborted) {
      return false;
    }

    const offsetSecond = clamp(options.offsetSecond ?? 0, 0, model.totalSeconds);
    const startAtSecond = this.context.currentTime + START_DELAY_SECONDS;
    this.startedAtSecond = startAtSecond;
    this.durationSecond = model.totalSeconds;
    this.playbackOffsetSecond = offsetSecond;
    for (const scheduled of createScheduledNotes(model, startAtSecond, offsetSecond)) {
      if (options.signal?.aborted) {
        this.stop();
        return false;
      }

      this.scheduleOrganNote(scheduled);
    }

    return true;
  }

  get playbackSecond(): number {
    if (this.startedAtSecond === undefined) {
      return this.playbackOffsetSecond;
    }

    return Math.min(
      this.durationSecond,
      Math.max(0, this.playbackOffsetSecond + this.context.currentTime - this.startedAtSecond),
    );
  }

  get isPlaying(): boolean {
    return (
      this.startedAtSecond !== undefined &&
      this.playbackSecond < this.durationSecond &&
      this.context.currentTime < this.startedAtSecond + this.durationSecond - this.playbackOffsetSecond
    );
  }

  pause(): number {
    const pausedAtSecond = this.playbackSecond;
    this.clearScheduledNodes();
    this.startedAtSecond = undefined;
    this.playbackOffsetSecond = pausedAtSecond;
    return pausedAtSecond;
  }

  stop(): void {
    this.clearScheduledNodes();
    this.startedAtSecond = undefined;
    this.durationSecond = 0;
    this.playbackOffsetSecond = 0;
  }

  private clearScheduledNodes(): void {
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
