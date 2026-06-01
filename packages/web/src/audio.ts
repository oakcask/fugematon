import type { PlaybackModel, PlaybackNote } from "./score.js";
import { createSoundFontEvents, MUSESCORE_GENERAL_SF3_PROTOTYPE, type SoundFontPlaybackAdapter } from "./soundfont.js";

export type ScheduledNote = {
  note: PlaybackNote;
  startSecond: number;
  stopSecond: number;
  frequency: number;
  gain: number;
  attackPeakGain: number;
  sustainGain: number;
  pan: number;
};

export type GainEnvelope = {
  startSecond: number;
  attackEndSecond: number;
  decayEndSecond: number;
  releaseStartSecond: number;
  releaseEndSecond: number;
  attackPeakGain: number;
  sustainGain: number;
};

export type PlayOptions = {
  offsetSecond?: number;
  signal?: AbortSignal;
};

export type PlaybackRendererId = "oscillator" | "soundfont-prototype";

export type PlaybackRendererStatus = {
  requested: PlaybackRendererId;
  active: PlaybackRendererId;
  fallbackReason?: string;
};

export type ScorePlayerOptions = {
  rendererId?: PlaybackRendererId;
  soundFontAdapter?: SoundFontPlaybackAdapter;
};

const START_DELAY_SECONDS = 0.12;
const MASTER_GAIN = 0.68;

export function createScheduledNotes(model: PlaybackModel, startAtSecond: number, offsetSecond = 0): ScheduledNote[] {
  return model.notes
    .filter((note) => note.startSecond + note.durationSecond > offsetSecond)
    .map((note) => {
      const baseGain = note.gain * (note.volume / 127);
      const velocityRatio = note.velocity / 127;
      const sustainVelocityScale =
        1 - note.webAudioSynth.velocityToSustainGain + velocityRatio * note.webAudioSynth.velocityToSustainGain;
      const sustainGain = baseGain * note.webAudioSynth.sustainLevel * sustainVelocityScale;
      const attackPeakGain = baseGain * (1 + velocityRatio * note.webAudioSynth.velocityToAttackEmphasis);

      return {
        note,
        startSecond: startAtSecond + Math.max(0, note.startSecond - offsetSecond),
        stopSecond: startAtSecond + note.startSecond + note.durationSecond - offsetSecond,
        frequency: midiToFrequency(note.pitch),
        gain: sustainGain,
        attackPeakGain,
        sustainGain,
        pan: (note.pan - 64) / 63,
      };
    });
}

export function midiToFrequency(pitch: number): number {
  return 440 * 2 ** ((pitch - 69) / 12);
}

export function createGainEnvelope(scheduled: ScheduledNote): GainEnvelope {
  const releaseSeconds = scheduled.note.webAudioSynth.releaseSeconds;
  const attackEndSecond = Math.min(
    scheduled.stopSecond,
    scheduled.startSecond + scheduled.note.webAudioSynth.attackSeconds,
  );
  const decayEndSecond = Math.min(scheduled.stopSecond, attackEndSecond + scheduled.note.webAudioSynth.decaySeconds);
  const releaseStartSecond = Math.max(decayEndSecond, scheduled.stopSecond - releaseSeconds);

  return {
    startSecond: scheduled.startSecond,
    attackEndSecond,
    decayEndSecond,
    releaseStartSecond,
    releaseEndSecond: scheduled.stopSecond + releaseSeconds,
    attackPeakGain: scheduled.attackPeakGain,
    sustainGain: scheduled.sustainGain,
  };
}

export class ScorePlayer {
  private readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly soundFontAdapter: SoundFontPlaybackAdapter | undefined;
  private readonly activeSources = new Set<OscillatorNode>();
  private readonly activeGains = new Set<GainNode>();
  private readonly activePanners = new Set<StereoPannerNode>();
  private startedAtSecond: number | undefined;
  private durationSecond = 0;
  private playbackOffsetSecond = 0;
  private activeRendererId: PlaybackRendererId = "oscillator";
  private rendererStatusValue: PlaybackRendererStatus;

  constructor(context = new AudioContext(), options: ScorePlayerOptions = {}) {
    this.context = context;
    this.rendererId = options.rendererId ?? "oscillator";
    this.soundFontAdapter = options.soundFontAdapter;
    this.rendererStatusValue = {
      requested: this.rendererId,
      active:
        this.rendererId === "soundfont-prototype" && options.soundFontAdapter === undefined
          ? "oscillator"
          : this.rendererId,
      fallbackReason:
        this.rendererId === "soundfont-prototype" && options.soundFontAdapter === undefined
          ? soundFontAdapterMissingReason()
          : undefined,
    };
    this.master = context.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(context.destination);
    this.soundFontAdapter?.connect?.(this.master);
  }

  readonly rendererId: PlaybackRendererId;

  get rendererStatus(): PlaybackRendererStatus {
    return this.rendererStatusValue;
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
    const renderer = await this.resolveRenderer();
    if (options.signal?.aborted) {
      return false;
    }

    this.startedAtSecond = startAtSecond;
    this.durationSecond = model.totalSeconds;
    this.playbackOffsetSecond = offsetSecond;
    if (renderer === "soundfont-prototype") {
      this.soundFontAdapter?.schedule(createSoundFontEvents(model, startAtSecond, offsetSecond));
      return true;
    }

    for (const scheduled of createScheduledNotes(model, startAtSecond, offsetSecond)) {
      if (options.signal?.aborted) {
        this.stop();
        return false;
      }
      this.scheduleOrganNote(scheduled);
    }

    return true;
  }

  queueNext(model: PlaybackModel, boundaryPlaybackSecond: number): boolean {
    if (
      this.startedAtSecond === undefined ||
      !Number.isFinite(boundaryPlaybackSecond) ||
      boundaryPlaybackSecond < this.playbackSecond
    ) {
      return false;
    }

    const startAtSecond = this.startedAtSecond + boundaryPlaybackSecond - this.playbackOffsetSecond;
    if (this.activeRendererId === "soundfont-prototype") {
      this.soundFontAdapter?.schedule(createSoundFontEvents(model, startAtSecond));
    } else {
      for (const scheduled of createScheduledNotes(model, startAtSecond)) {
        this.scheduleOrganNote(scheduled);
      }
    }
    this.durationSecond = Math.max(this.durationSecond, boundaryPlaybackSecond + model.totalSeconds);

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

    this.soundFontAdapter?.stop();
    this.activeSources.clear();
    this.activeGains.clear();
    this.activePanners.clear();
  }

  private async resolveRenderer(): Promise<PlaybackRendererId> {
    if (this.rendererId !== "soundfont-prototype") {
      this.activeRendererId = "oscillator";
      this.rendererStatusValue = {
        requested: "oscillator",
        active: "oscillator",
      };
      return "oscillator";
    }

    if (this.soundFontAdapter === undefined) {
      this.activeRendererId = "oscillator";
      this.rendererStatusValue = {
        requested: "soundfont-prototype",
        active: "oscillator",
        fallbackReason: soundFontAdapterMissingReason(),
      };
      return "oscillator";
    }

    try {
      await this.soundFontAdapter.load(MUSESCORE_GENERAL_SF3_PROTOTYPE);
      this.activeRendererId = "soundfont-prototype";
      this.rendererStatusValue = {
        requested: "soundfont-prototype",
        active: "soundfont-prototype",
      };
      return "soundfont-prototype";
    } catch {
      this.activeRendererId = "oscillator";
      this.rendererStatusValue = {
        requested: "soundfont-prototype",
        active: "oscillator",
        fallbackReason:
          "web.audio.soundfont-load-failed: SoundFont prototype failed to load; why=playback must remain available when optional sample assets fail; action=use oscillator renderer and inspect SoundFont asset setup",
      };
      return "oscillator";
    }
  }

  private scheduleOrganNote(scheduled: ScheduledNote): void {
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const panner = this.context.createStereoPanner();
    const envelope = createGainEnvelope(scheduled);

    oscillator.type = scheduled.note.oscillatorType;
    oscillator.frequency.setValueAtTime(scheduled.frequency, scheduled.startSecond);

    gain.gain.setValueAtTime(0, envelope.startSecond);
    gain.gain.linearRampToValueAtTime(envelope.attackPeakGain, envelope.attackEndSecond);
    gain.gain.linearRampToValueAtTime(envelope.sustainGain, envelope.decayEndSecond);
    gain.gain.setValueAtTime(envelope.sustainGain, envelope.releaseStartSecond);
    gain.gain.linearRampToValueAtTime(0.0001, envelope.releaseEndSecond);
    panner.pan.setValueAtTime(scheduled.pan, scheduled.startSecond);

    oscillator.connect(gain).connect(panner).connect(this.master);
    oscillator.start(scheduled.startSecond);
    oscillator.stop(envelope.releaseEndSecond);

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

function soundFontAdapterMissingReason(): string {
  return "web.audio.soundfont-adapter-missing: SoundFont prototype adapter is not installed; why=SpessaSynth and SF3 assets are optional during the prototype; action=use oscillator renderer or install the pinned SoundFont adapter and notices metadata";
}
