import type { HarmonicPlan, HarmonicSonorityReviewSummary, HarmonicSonorityWindow, NoteEvent } from "../events.js";
import { chordTonePitchClasses, nearestHarmonicAnchor, rootDegreeForFunction } from "./harmony.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo } from "./shared.js";

const HARMONIC_SONORITY_WINDOW_LIMIT = 48;

export function analyzeHarmonicSonorities(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): HarmonicSonorityReviewSummary {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const windows: HarmonicSonorityWindow[] = [];
  let focusedWindowCount = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const durationTicks = endTick - startTick;
    if (durationTicks <= 0) {
      continue;
    }

    const activeNotes = activeNotesDuring(notes, startTick, endTick);
    if (!isSupportTextureWindow(activeNotes)) {
      continue;
    }
    focusedWindowCount += 1;

    const window = harmonicSonorityWindow(activeNotes, sectionPlans, startTick, durationTicks);
    if (window !== undefined) {
      windows.push(window);
    }
  }

  return {
    schemaVersion: 1,
    focusedWindowCount,
    reviewRequiredWindowCount: windows.filter((window) => window.response === "review-required").length,
    generatorResponseWindowCount: windows.filter((window) => window.response === "generator-response-required").length,
    thinUnrootedWindowCount: windows.filter((window) => window.classification === "thin-unrooted-support").length,
    pitchClassDoublingWindowCount: windows.filter((window) => window.classification === "pitch-class-doubling-only")
      .length,
    nonChordStructuralWindowCount: windows.filter((window) => window.classification === "non-chord-structural-support")
      .length,
    windows: windows.slice(0, HARMONIC_SONORITY_WINDOW_LIMIT),
  };
}

function harmonicSonorityWindow(
  activeNotes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  startTick: number,
  durationTicks: number,
): HarmonicSonorityWindow | undefined {
  const plan = sectionPlanForSonority(sectionPlans, startTick);
  const anchor = plan === undefined ? undefined : nearestHarmonicAnchor(startTick, [plan]);
  if (plan === undefined || anchor === undefined) {
    return undefined;
  }

  const chordTonePitchClassesAtTick = chordTonePitchClasses(anchor.localKey, anchor.function).sort(
    (left, right) => left - right,
  );
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
  const pitchClasses = sortedUnique(activeNotes.map((note) => positiveModulo(note.pitch, 12)));
  const nonChordPitchClasses = pitchClasses.filter((pitchClass) => !chordTonePitchClassesAtTick.includes(pitchClass));
  const rootPresent = pitchClasses.includes(rootPitchClass);
  const completeTriad = chordTonePitchClassesAtTick.every((pitchClass) => pitchClasses.includes(pitchClass));
  const pitchClassUnisonStackCount = activeNotes.length - pitchClasses.length;
  const structuralIntentMismatchCount = activeNotes.filter(
    (note) =>
      (note.metricalHarmonyIntent === "structural-chord-tone" ||
        note.metricalHarmonyIntent === "structural-root-support") &&
      !chordTonePitchClassesAtTick.includes(positiveModulo(note.pitch, 12)),
  ).length;
  const classification =
    structuralIntentMismatchCount > 0 && nonChordPitchClasses.length > 0
      ? "non-chord-structural-support"
      : pitchClasses.length === 1 && activeNotes.length >= 2
        ? "pitch-class-doubling-only"
        : !rootPresent && activeNotes.length <= 2
          ? "thin-unrooted-support"
          : undefined;

  if (classification === undefined) {
    return undefined;
  }

  return {
    startTick,
    durationTicks,
    state: plan.state,
    localKey: anchor.localKey,
    harmonicFunction: anchor.function,
    voices: sortedVoices(activeNotes),
    roles: sortedRoles(activeNotes),
    pitchClasses,
    chordTonePitchClasses: chordTonePitchClassesAtTick,
    nonChordPitchClasses,
    rootPresent,
    completeTriad,
    activeVoiceCount: new Set(activeNotes.map((note) => note.voice)).size,
    structuralIntentMismatchCount,
    pitchClassUnisonStackCount,
    classification,
    symptom: harmonicSonoritySymptom(classification),
    response: classification === "non-chord-structural-support" ? "generator-response-required" : "review-required",
  };
}

function harmonicSonoritySymptom(classification: HarmonicSonorityWindow["classification"]): string {
  if (classification === "non-chord-structural-support") {
    return "support texture labels non-chord tones as structural chord support";
  }
  if (classification === "pitch-class-doubling-only") {
    return "support texture collapses to pitch-class doubling instead of a functional sonority";
  }
  return "support texture lacks root support and is too thin to make the planned harmony audible";
}

function activeNotesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks);
}

function isSupportTextureWindow(activeNotes: readonly NoteEvent[]): boolean {
  const activeVoices = new Set(activeNotes.map((note) => note.voice));
  return (
    activeVoices.size >= 2 &&
    activeNotes.some((note) => note.role === "counter-subject" || note.role === "free-counterpoint") &&
    activeNotes.every((note) => note.role !== "subject" && note.role !== "answer" && note.role !== "subject-fragment")
  );
}

function sectionPlanForSonority(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return (
    sectionPlans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks) ??
    [...sectionPlans]
      .filter((plan) => plan.startTick + plan.durationTicks <= tick)
      .sort((left, right) => right.startTick + right.durationTicks - (left.startTick + left.durationTicks))[0]
  );
}

function sortedUnique(values: readonly number[]): number[] {
  return [...new Set(values)].sort((left, right) => left - right);
}

function sortedVoices(notes: readonly NoteEvent[]): HarmonicSonorityWindow["voices"] {
  return [...new Set(notes.map((note) => note.voice))].sort();
}

function sortedRoles(notes: readonly NoteEvent[]): HarmonicSonorityWindow["roles"] {
  return [
    ...new Set(notes.map((note) => note.role).filter((role): role is NonNullable<typeof role> => role !== undefined)),
  ].sort();
}
