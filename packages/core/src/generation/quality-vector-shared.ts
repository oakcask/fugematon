import type { HarmonicPlan, NoteEvent, Voice } from "../events.js";

export function activeNoteForVoiceAt(
  notes: readonly NoteEvent[],
  voice: Voice,
  tick: number,
): Pick<NoteEvent, "pitch" | "role" | "startTick" | "durationTicks" | "motivicDerivation"> | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

export function noteCheckpoints(notes: readonly NoteEvent[]): number[] {
  return [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
}

export function sectionPlanAt(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks);
}

export function voicePairKey(summary: { leftVoice: Voice; rightVoice: Voice }): string {
  return `${summary.leftVoice}-${summary.rightVoice}`;
}

export function dominantMapKey<Key>(counts: ReadonlyMap<Key, number>): Key | undefined {
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0];
}
