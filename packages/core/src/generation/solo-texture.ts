import { TICKS_PER_QUARTER } from "../constants.js";
import type { HarmonicPlan, NoteEvent, SoloTextureSummary, Voice } from "../events.js";
import { VOICE_ENTRY_ORDER } from "./shared.js";

export function analyzeSoloTexture(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): SoloTextureSummary {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const runs: {
    voice: Voice;
    startTick: number;
    endTick: number;
    previousActiveVoiceCount: number;
  }[] = [];
  let currentRun:
    | {
        voice: Voice;
        startTick: number;
        endTick: number;
        previousActiveVoiceCount: number;
      }
    | undefined;
  let previousActiveVoiceCount = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    if (activeVoices.length === 1) {
      const voice = activeVoices[0]!;
      if (currentRun?.voice === voice && currentRun.endTick === startTick) {
        currentRun.endTick = endTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { voice, startTick, endTick, previousActiveVoiceCount };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
    previousActiveVoiceCount = activeVoices.length;
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  const longRuns = runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER);
  const unsupportedRuns = longRuns.filter(
    (run) =>
      run.previousActiveVoiceCount >= 2 &&
      !hasNearbyPhraseSupport(run.startTick, sectionPlans) &&
      !hasGradualThinningBefore(notes, run.voice, run.startTick),
  );
  const abruptRuns = unsupportedRuns.filter((run) => run.previousActiveVoiceCount >= 3);
  const runsByVoice = VOICE_ENTRY_ORDER.map((voice) => longRuns.filter((run) => run.voice === voice).length);

  return {
    soloRunCount: longRuns.length,
    unsupportedSoloRunCount: unsupportedRuns.length,
    abruptTextureDropCount: abruptRuns.length,
    soloVoiceImbalance: Math.max(...runsByVoice) - Math.min(...runsByVoice),
  };
}

function activeVoicesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) =>
    notes.some(
      (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    ),
  );
}

function hasNearbyPhraseSupport(tick: number, sectionPlans: readonly HarmonicPlan[]): boolean {
  return sectionPlans.some((plan) => {
    const sectionEndTick = plan.startTick + plan.durationTicks;
    const nearSectionBoundary =
      Math.abs(tick - plan.startTick) <= TICKS_PER_QUARTER || Math.abs(tick - sectionEndTick) <= TICKS_PER_QUARTER;
    const nearCadence = plan.anchors.some(
      (anchor) => anchor.cadenceTarget && Math.abs(tick - anchor.tick) <= TICKS_PER_QUARTER,
    );
    return nearSectionBoundary || nearCadence;
  });
}

function hasGradualThinningBefore(notes: readonly NoteEvent[], voice: Voice, tick: number): boolean {
  const previousTick = tick - TICKS_PER_QUARTER / 2;
  if (previousTick < 0) {
    return false;
  }

  const previousActiveVoices = activeVoicesDuring(notes, previousTick, tick);
  return previousActiveVoices.length === 2 && previousActiveVoices.includes(voice);
}
