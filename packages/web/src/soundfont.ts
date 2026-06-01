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
  license: string;
  sourceUrl: string;
  distributed: boolean;
};

export type SoundFontPlaybackAdapter = {
  load(asset: SoundFontAssetDescriptor): Promise<void>;
  schedule(events: readonly SoundFontRendererEvent[]): void;
  stop(): void;
};

export const MUSESCORE_GENERAL_SF3_PROTOTYPE: SoundFontAssetDescriptor = {
  assetId: "musescore-general-sf3-prototype",
  displayName: "MuseScore General SF3 prototype",
  fileName: "MuseScore_General.sf3",
  license: "MIT",
  sourceUrl: "https://musescore.org/en/handbook/soundfonts",
  distributed: false,
};

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
    const currentProgram = programByChannel.get(note.channel);

    if (currentProgram !== note.program) {
      programByChannel.set(note.channel, note.program);
      events.push({
        kind: "program-change",
        timeSecond: noteStartSecond,
        channel: note.channel,
        program: note.program,
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
