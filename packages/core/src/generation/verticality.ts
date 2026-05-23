import { TICKS_PER_QUARTER } from "../constants.js";
import type { NoteEvent, Voice } from "../events.js";
import { compareNoteEvents, VOICE_ENTRY_ORDER } from "./shared.js";
import type { ActiveVerticality } from "./types.js";

export type HalfBeatVerticality = {
  tick: number;
  active: ActiveVerticality;
};

export function halfBeatVerticalities(notes: readonly NoteEvent[]): HalfBeatVerticality[] {
  const endTick = Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
  const notesByVoice = Object.fromEntries(
    VOICE_ENTRY_ORDER.map((voice) => [voice, notes.filter((note) => note.voice === voice).sort(compareNoteEvents)]),
  ) as Record<Voice, NoteEvent[]>;
  const indexes: Record<Voice, number> = {
    soprano: 0,
    alto: 0,
    tenor: 0,
    bass: 0,
  };
  const verticalities: HalfBeatVerticality[] = [];

  for (let tick = 0; tick < endTick; tick += TICKS_PER_QUARTER / 2) {
    const active: ActiveVerticality = new Map();
    for (const voice of VOICE_ENTRY_ORDER) {
      const voiceNotes = notesByVoice[voice];
      while (
        indexes[voice] < voiceNotes.length &&
        voiceNotes[indexes[voice]]!.startTick + voiceNotes[indexes[voice]]!.durationTicks <= tick
      ) {
        indexes[voice] += 1;
      }

      const note = voiceNotes[indexes[voice]];
      if (note !== undefined && note.startTick <= tick && tick < note.startTick + note.durationTicks) {
        active.set(voice, {
          pitch: note.pitch,
          role: note.role,
          metricalHarmonyIntent: note.metricalHarmonyIntent,
          startTick: note.startTick,
          durationTicks: note.durationTicks,
        });
      }
    }
    verticalities.push({ tick, active });
  }

  return verticalities;
}
