import type { PlaybackModel } from "./score.js";

export type SoundFontRendererEvent =
  | {
      kind: "program-change";
      timeSecond: number;
      channel: number;
      program: number;
    }
  | {
      kind: "controller-change";
      timeSecond: number;
      channel: number;
      controller: number;
      value: number;
    }
  | {
      kind: "note-on";
      timeSecond: number;
      channel: number;
      pitch: number;
      velocity: number;
    }
  | {
      kind: "note-off";
      timeSecond: number;
      channel: number;
      pitch: number;
    };

export type SoundFontAssetDescriptor = {
  assetId: string;
  displayName: string;
  fileName: string;
  url: string;
  integrity?: string;
  license: string;
  sourceUrl: string;
  distributed: boolean;
};

export type SoundFontPlaybackAdapter = {
  connect?(destination: AudioNode): void;
  load(asset: SoundFontAssetDescriptor): Promise<void>;
  schedule(events: readonly SoundFontRendererEvent[]): void;
  stop(): void;
};

export type SoundFontAssetEnvironment = {
  VITE_FUGEMATON_SOUNDFONT_URL?: string;
  VITE_FUGEMATON_SOUNDFONT_INTEGRITY?: string;
};

const MUSESCORE_GENERAL_SF3_FILE_NAME = "MuseScore_General.sf3";
const MUSESCORE_GENERAL_SF3_LOCAL_URL = `/soundfonts/${MUSESCORE_GENERAL_SF3_FILE_NAME}`;
const SOUNDFONT_PROTOTYPE_PROGRAM = 46;
const MIDI_MAIN_VOLUME = 7;
const MIDI_PAN = 10;

export const MUSESCORE_GENERAL_SF3_PROTOTYPE = createMuseScoreGeneralSoundFontDescriptor();

export const soundFontAssets: readonly SoundFontAssetDescriptor[] = [MUSESCORE_GENERAL_SF3_PROTOTYPE];

export function createMuseScoreGeneralSoundFontDescriptor(
  environment: SoundFontAssetEnvironment = readSoundFontAssetEnvironment(),
): SoundFontAssetDescriptor {
  const externalUrl = normalizeOptionalValue(environment.VITE_FUGEMATON_SOUNDFONT_URL);
  const integrity = normalizeOptionalValue(environment.VITE_FUGEMATON_SOUNDFONT_INTEGRITY);

  return {
    assetId: "musescore-general-sf3-prototype",
    displayName: "MuseScore General SF3 prototype",
    fileName: MUSESCORE_GENERAL_SF3_FILE_NAME,
    url: externalUrl ?? MUSESCORE_GENERAL_SF3_LOCAL_URL,
    ...(integrity === undefined ? {} : { integrity }),
    license: "MIT",
    sourceUrl: "https://musescore.org/en/handbook/soundfonts",
    distributed: externalUrl !== undefined,
  };
}

export function createSoundFontEvents(
  model: PlaybackModel,
  startAtSecond: number,
  offsetSecond = 0,
): SoundFontRendererEvent[] {
  const activeNotes = model.notes.filter((note) => note.startSecond + note.durationSecond > offsetSecond);
  const events: SoundFontRendererEvent[] = [];
  const programByChannel = new Map<number, number>();
  const volumeByChannel = new Map<number, number>();
  const panByChannel = new Map<number, number>();

  for (const note of activeNotes) {
    const noteStartSecond = startAtSecond + Math.max(0, note.startSecond - offsetSecond);
    const noteStopSecond = startAtSecond + note.startSecond + note.durationSecond - offsetSecond;
    const program = soundFontProgram(note.program);
    const currentProgram = programByChannel.get(note.channel);
    const volume = gainToMidiVolume(note.gain * (note.volume / 127));
    const pan = panToMidi((note.pan - 64) / 63);

    if (currentProgram !== program) {
      programByChannel.set(note.channel, program);
      events.push({
        kind: "program-change",
        timeSecond: noteStartSecond,
        channel: note.channel,
        program,
      });
    }

    if (volumeByChannel.get(note.channel) !== volume) {
      volumeByChannel.set(note.channel, volume);
      events.push({
        kind: "controller-change",
        timeSecond: noteStartSecond,
        channel: note.channel,
        controller: MIDI_MAIN_VOLUME,
        value: volume,
      });
    }

    if (panByChannel.get(note.channel) !== pan) {
      panByChannel.set(note.channel, pan);
      events.push({
        kind: "controller-change",
        timeSecond: noteStartSecond,
        channel: note.channel,
        controller: MIDI_PAN,
        value: pan,
      });
    }

    events.push({
      kind: "note-on",
      timeSecond: noteStartSecond,
      channel: note.channel,
      pitch: note.pitch,
      velocity: note.velocity,
    });
    events.push({
      kind: "note-off",
      timeSecond: noteStopSecond,
      channel: note.channel,
      pitch: note.pitch,
    });
  }

  return events.sort(compareSoundFontEvents);
}

function compareSoundFontEvents(left: SoundFontRendererEvent, right: SoundFontRendererEvent): number {
  const timeDifference = left.timeSecond - right.timeSecond;
  if (timeDifference !== 0) {
    return timeDifference;
  }

  return eventRank(left) - eventRank(right);
}

function eventRank(event: SoundFontRendererEvent): number {
  if (event.kind === "program-change") {
    return 0;
  }

  if (event.kind === "controller-change") {
    return 2;
  }

  return event.kind === "note-off" ? 1 : 3;
}

function soundFontProgram(_profileProgram: number): number {
  return SOUNDFONT_PROTOTYPE_PROGRAM;
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

function readSoundFontAssetEnvironment(): SoundFontAssetEnvironment {
  return {
    ...readProcessEnvironment(),
    ...((import.meta.env ?? {}) as SoundFontAssetEnvironment),
  };
}

function normalizeOptionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized === undefined || normalized.length === 0 ? undefined : normalized;
}

function readProcessEnvironment(): SoundFontAssetEnvironment {
  if (typeof process === "undefined") {
    return {};
  }

  return process.env;
}
