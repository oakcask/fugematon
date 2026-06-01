import type { PlaybackModel } from "./score.js";

export type SoundFontRendererEvent =
  | {
      kind: "program-change";
      timeSecond: number;
      channel: number;
      program: number;
    }
  | {
      kind: "note-on";
      timeSecond: number;
      channel: number;
      pitch: number;
      velocity: number;
      gain: number;
      pan: number;
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

  for (const note of activeNotes) {
    const noteStartSecond = startAtSecond + Math.max(0, note.startSecond - offsetSecond);
    const noteStopSecond = startAtSecond + note.startSecond + note.durationSecond - offsetSecond;
    const program = soundFontProgram(note.program);
    const currentProgram = programByChannel.get(note.channel);

    if (currentProgram !== program) {
      programByChannel.set(note.channel, program);
      events.push({
        kind: "program-change",
        timeSecond: noteStartSecond,
        channel: note.channel,
        program,
      });
    }

    events.push({
      kind: "note-on",
      timeSecond: noteStartSecond,
      channel: note.channel,
      pitch: note.pitch,
      velocity: note.velocity,
      gain: note.gain * (note.volume / 127),
      pan: (note.pan - 64) / 63,
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

  return event.kind === "note-off" ? 1 : 2;
}

function soundFontProgram(_profileProgram: number): number {
  return SOUNDFONT_PROTOTYPE_PROGRAM;
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
