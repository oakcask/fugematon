import { TICKS_PER_QUARTER } from "../constants.js";
import type { HarmonicContinuitySummary, HarmonicPlan, NoteEvent } from "../events.js";
import { beatStrengthAtTick, chordTonePitchClasses, nearestHarmonicAnchor, rootDegreeForFunction } from "./harmony.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo } from "./shared.js";

const SHORT_EPISODE_LIMIT_TICKS = TICKS_PER_QUARTER * 10;

export function analyzeHarmonicContinuity(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): HarmonicContinuitySummary {
  const sortedPlans = [...sectionPlans].sort((left, right) => left.startTick - right.startTick);
  const windows = sortedPlans.filter(isFocusedHarmonicContinuityPlan).map((plan) => {
    const structuralBeats = structuralBeatTicks(plan);
    const checkpoints = structuralBeats.map((tick) => structuralBeatEvidence(notes, plan, tick));
    const bassRootSupportCount = checkpoints.filter((checkpoint) => checkpoint.bassRootSupport).length;
    const chordToneSupportCount = checkpoints.filter((checkpoint) => checkpoint.chordToneSupport).length;
    const structuralBeatMismatchCount = checkpoints.filter((checkpoint) => checkpoint.mismatchWithoutBassRoot).length;
    const thinStructuralBeatCount = checkpoints.filter((checkpoint) => checkpoint.activeVoiceCount <= 2).length;
    const classification: "audible-progression" | "review-required" =
      structuralBeats.length > 0 &&
      bassRootSupportCount >= Math.ceil(structuralBeats.length / 2) &&
      chordToneSupportCount === structuralBeats.length &&
      structuralBeatMismatchCount === 0 &&
      thinStructuralBeatCount <= 1
        ? "audible-progression"
        : "review-required";

    return {
      startTick: plan.startTick,
      durationTicks: plan.durationTicks,
      state: plan.state,
      localKey: plan.localKey,
      targetKey: plan.targetKey,
      ambiguityIntent: plan.ambiguityIntent,
      sequencePattern: plan.sequencePattern,
      fragmentTransform: plan.fragmentTransform,
      nextState: nextSectionPlan(sortedPlans, plan)?.state,
      structuralBeatCount: structuralBeats.length,
      bassRootSupportCount,
      chordToneSupportCount,
      structuralBeatMismatchCount,
      thinStructuralBeatCount,
      classification,
      response:
        classification === "audible-progression"
          ? ("accepted-context" as const)
          : ("generator-response-required" as const),
    };
  });

  return {
    schemaVersion: 1,
    focusedWindowCount: windows.length,
    reviewRequiredWindowCount: windows.filter((window) => window.classification === "review-required").length,
    audibleProgressionWindowCount: windows.filter((window) => window.classification === "audible-progression").length,
    windows,
  };
}

export function isFocusedHarmonicContinuityPlan(plan: HarmonicPlan): plan is HarmonicPlan & { state: "episode" } {
  return (
    plan.state === "episode" &&
    plan.durationTicks <= SHORT_EPISODE_LIMIT_TICKS &&
    (plan.ambiguityIntent === "pivot-harmony" || plan.sequencePattern !== undefined)
  );
}

function structuralBeatTicks(plan: HarmonicPlan): number[] {
  const endTick = plan.startTick + plan.durationTicks;
  const ticks: number[] = [];
  for (let tick = plan.startTick; tick < endTick; tick += plan.meterContext.beatTicks) {
    if (beatStrengthAtTick(tick, plan.meterContext) === "strong") {
      ticks.push(tick);
    }
  }
  return ticks;
}

function structuralBeatEvidence(notes: readonly NoteEvent[], plan: HarmonicPlan, tick: number) {
  const anchor = nearestHarmonicAnchor(tick, [plan]);
  const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
  if (anchor === undefined || activeNotes.length === 0) {
    return {
      activeVoiceCount: activeNotes.length,
      bassRootSupport: false,
      chordToneSupport: false,
      mismatchWithoutBassRoot: activeNotes.length > 0,
    };
  }

  const chordTones = chordTonePitchClasses(anchor.localKey, anchor.function);
  const activePitchClasses = activeNotes.map((note) => positiveModulo(note.pitch, 12));
  const bassPitchClass = activeNotes.find((note) => note.voice === "bass")?.pitch;
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
  const bassRootSupport = bassPitchClass !== undefined && positiveModulo(bassPitchClass, 12) === rootPitchClass;
  const chordToneSupport = activePitchClasses.some((pitchClass) => chordTones.includes(pitchClass));
  const mismatchWithoutBassRoot =
    activePitchClasses.some((pitchClass) => !chordTones.includes(pitchClass)) && !bassRootSupport;

  return {
    activeVoiceCount: activeNotes.length,
    bassRootSupport,
    chordToneSupport,
    mismatchWithoutBassRoot,
  };
}

function nextSectionPlan(sectionPlans: readonly HarmonicPlan[], plan: HarmonicPlan): HarmonicPlan | undefined {
  return sectionPlans.find((candidate) => candidate.startTick >= plan.startTick + plan.durationTicks);
}
