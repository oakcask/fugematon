import type { MIDIController } from "spessasynth_core";
import { WorkletSynthesizer } from "spessasynth_lib";
import spessaSynthProcessorUrl from "spessasynth_lib/dist/spessasynth_processor.min.js?url";
import type { SoundFontAssetDescriptor, SoundFontPlaybackAdapter, SoundFontRendererEvent } from "./soundfont.js";

const MAIN_SOUND_BANK_ID = "fugematon-main";
const MIDI_MAIN_VOLUME = 7 as MIDIController;
const MIDI_PAN = 10 as MIDIController;

export type SpessaSynthAdapterOptions = {
  processorUrl?: string;
  fetchSoundFont?: (asset: SoundFontAssetDescriptor) => Promise<ArrayBuffer>;
};

export function createSpessaSynthSoundFontAdapter(
  context: BaseAudioContext,
  options: SpessaSynthAdapterOptions = {},
): SoundFontPlaybackAdapter {
  return new SpessaSynthSoundFontAdapter(context, options);
}

class SpessaSynthSoundFontAdapter implements SoundFontPlaybackAdapter {
  private readonly context: BaseAudioContext;
  private readonly processorUrl: string;
  private readonly fetchSoundFont: (asset: SoundFontAssetDescriptor) => Promise<ArrayBuffer>;
  private output: AudioNode | undefined;
  private synth: WorkletSynthesizer | undefined;
  private workletReady: Promise<void> | undefined;
  private loadPromise: Promise<void> | undefined;
  private loadingAssetId: string | undefined;
  private loadedAssetId: string | undefined;
  private cachedAssetId: string | undefined;
  private cachedSoundBankBuffer: ArrayBuffer | undefined;

  constructor(context: BaseAudioContext, options: SpessaSynthAdapterOptions) {
    this.context = context;
    this.processorUrl = options.processorUrl ?? spessaSynthProcessorUrl;
    this.fetchSoundFont = options.fetchSoundFont ?? fetchSoundFontArrayBuffer;
  }

  connect(destination: AudioNode): void {
    this.output = destination;
    this.synth?.connect(destination);
  }

  async load(asset: SoundFontAssetDescriptor): Promise<void> {
    if (this.loadedAssetId === asset.assetId) {
      return;
    }

    if (this.loadingAssetId !== asset.assetId) {
      this.loadPromise = this.loadAsset(asset);
      this.loadingAssetId = asset.assetId;
    }
    await this.loadPromise;
  }

  schedule(events: readonly SoundFontRendererEvent[]): void {
    const synth = this.synth;
    if (synth === undefined) {
      return;
    }

    for (const event of events) {
      scheduleEvent(synth, event, this.context.currentTime);
    }
  }

  stop(): void {
    if (this.synth === undefined) {
      return;
    }

    this.synth.stopAll(true);
    this.synth.destroy();
    this.synth = undefined;
    this.loadedAssetId = undefined;
    this.loadingAssetId = undefined;
    this.loadPromise = undefined;
  }

  private async loadAsset(asset: SoundFontAssetDescriptor): Promise<void> {
    try {
      const soundBankBuffer = await this.loadSoundBankBuffer(asset);
      await this.ensureWorklet();
      const synth = new WorkletSynthesizer(this.context);
      synth.connect(this.output ?? this.context.destination);
      await synth.isReady;
      await synth.soundBankManager.addSoundBank(soundBankBuffer, MAIN_SOUND_BANK_ID);
      this.synth?.destroy();
      this.synth = synth;
      this.loadedAssetId = asset.assetId;
      this.loadingAssetId = undefined;
      this.loadPromise = undefined;
    } catch (error) {
      this.loadPromise = undefined;
      this.loadingAssetId = undefined;
      throw error;
    }
  }

  private async loadSoundBankBuffer(asset: SoundFontAssetDescriptor): Promise<ArrayBuffer> {
    if (this.cachedAssetId === asset.assetId && this.cachedSoundBankBuffer !== undefined) {
      return this.cachedSoundBankBuffer.slice(0);
    }

    const soundBankBuffer = await this.fetchSoundFont(asset);
    this.cachedAssetId = asset.assetId;
    this.cachedSoundBankBuffer = soundBankBuffer.slice(0);
    return soundBankBuffer;
  }

  private ensureWorklet(): Promise<void> {
    this.workletReady ??= this.context.audioWorklet.addModule(this.processorUrl);
    return this.workletReady;
  }
}

async function fetchSoundFontArrayBuffer(asset: SoundFontAssetDescriptor): Promise<ArrayBuffer> {
  const response = await fetch(asset.url, asset.integrity === undefined ? undefined : { integrity: asset.integrity });
  if (!response.ok) {
    throw new Error(
      `web.audio.soundfont-asset-fetch-failed: SoundFont asset request failed; why=the optional SoundFont file must be reachable before sample playback can start; action=place the configured SF3 asset at the published asset URL and verify notices metadata`,
    );
  }

  const buffer = await response.arrayBuffer();
  if (isLikelyHtmlResponse(buffer)) {
    throw new Error(
      "web.audio.soundfont-asset-html-response: SoundFont asset request returned HTML instead of SF3 data; why=SpessaSynth cannot parse the Vite fallback document as a SoundFont; action=run pnpm web:soundfont:prepare or place MuseScore_General.sf3 under packages/web/public/soundfonts before selecting the soundfont pilot",
    );
  }

  return buffer;
}

function isLikelyHtmlResponse(buffer: ArrayBuffer): boolean {
  const prefix = new TextDecoder("ascii").decode(buffer.slice(0, 16)).trimStart().toLowerCase();
  return prefix.startsWith("<!do") || prefix.startsWith("<html");
}

function scheduleEvent(synth: WorkletSynthesizer, event: SoundFontRendererEvent, currentTimeSecond: number): void {
  const time = Math.max(currentTimeSecond, event.timeSecond);
  switch (event.kind) {
    case "program-change":
      synth.programChange(event.channel, event.program, { time });
      return;
    case "note-on":
      synth.controllerChange(event.channel, MIDI_MAIN_VOLUME, gainToMidiVolume(event.gain), { time });
      synth.controllerChange(event.channel, MIDI_PAN, panToMidi(event.pan), { time });
      synth.noteOn(event.channel, event.pitch, event.velocity, { time });
      return;
    case "note-off":
      synth.noteOff(event.channel, event.pitch, { time });
      return;
  }
}

function gainToMidiVolume(gain: number): number {
  return clampMidi(Math.round(Math.sqrt(clamp(gain, 0, 1)) * 127));
}

function panToMidi(pan: number): number {
  return clampMidi(Math.round(((clamp(pan, -1, 1) + 1) / 2) * 127));
}

function clampMidi(value: number): number {
  return Math.min(127, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
