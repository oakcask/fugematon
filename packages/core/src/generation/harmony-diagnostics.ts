import { TICKS_PER_QUARTER } from "../constants.js";
import type { HarmonicPlan, NoteEvent, PlannedEntry } from "../events.js";
import { characteristicScaleDegree, isModalMode } from "./key.js";
import { beatStrengthAtTick } from "./meter.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo, roundRatio } from "./shared.js";
import type { HarmonicDiagnostics } from "./types.js";

export function analyzeHarmonicPlans(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  subjectEntries: readonly PlannedEntry[],
): HarmonicDiagnostics {
  const cadenceAnchors = sectionPlans.flatMap((plan) => plan.anchors.filter((anchor) => anchor.cadenceTarget));
  const metricalHarmony = analyzeMetricalHarmony(notes, sectionPlans);
  const ambiguityPlans = sectionPlans.filter((plan) => plan.ambiguityIntent !== "none");
  const ambiguityRecoveries = ambiguityPlans.filter((plan) => plan.ambiguityRecoveryTick !== undefined).length;
  const episodePlans = sectionPlans.filter((plan) => plan.state === "episode");
  const directedEpisodes = episodePlans.filter(
    (plan) =>
      plan.sequencePattern !== undefined &&
      plan.fragmentTransform !== undefined &&
      (plan.targetKey.tonic !== plan.departureKey.tonic || plan.targetKey.mode !== plan.departureKey.mode),
  ).length;
  const strettoPlans = sectionPlans.filter((plan) => plan.state === "stretto-like");
  const strettoEntries = subjectEntries.filter((entry) => entry.state === "stretto-like");
  const parallelKeyShiftCount = sectionPlans.filter((plan) => plan.parallelKeyShift).length;
  const strictParallelShifts = sectionPlans.filter(
    (plan) => plan.parallelKeyShift && plan.styleProfile === "strict-classical",
  ).length;
  const modalPlans = sectionPlans.filter((plan) => isModalMode(plan.localKey.mode) || isModalMode(plan.targetKey.mode));
  const modalCharacteristicToneHits = countModalCharacteristicToneHits(notes, modalPlans);
  const modalCadenceHits = modalPlans.filter((plan) => plan.cadenceKind === "modal").length;
  const tonalCadenceOveruseWarnings =
    modalPlans.length === 0 ? 0 : Number(modalCadenceHits === 0 || modalCharacteristicToneHits < modalPlans.length);

  return {
    unresolvedDissonanceCount: 0,
    strongBeatDissonanceCount: metricalHarmony.strongBeatDissonanceCount,
    cadenceTargetMisses: 0,
    cadenceTargetHits: cadenceAnchors.length,
    leadingToneResolutionMisses: 0,
    dominantResolutionMisses: 0,
    predominantDirectionMisses: countPredominantDirectionMisses(sectionPlans),
    harmonicFunctionMismatches: metricalHarmony.harmonicFunctionMismatches,
    harmonicFunctionMatches: metricalHarmony.harmonicFunctionMatches,
    controlledAmbiguityScore: ambiguityPlans.length === 0 ? 1 : roundRatio(ambiguityRecoveries / ambiguityPlans.length),
    unresolvedAmbiguityWarnings: ambiguityPlans.length - ambiguityRecoveries,
    ambiguityRecoveries,
    styleModulationFit: roundRatio(Math.max(0, 1 - strictParallelShifts / Math.max(1, sectionPlans.length))),
    parallelKeyShiftCount,
    formRepetitionWarnings: countFormRepetitionWarnings(sectionPlans),
    episodeDirectionScore: episodePlans.length === 0 ? 1 : roundRatio(directedEpisodes / episodePlans.length),
    strettoClarityScore:
      strettoPlans.length === 0 ? 1 : roundRatio(Math.min(1, strettoEntries.length / (strettoPlans.length * 2))),
    modalContextCount: modalPlans.length,
    modalCharacteristicToneHits,
    modalCadenceHits,
    tonalCadenceOveruseWarnings,
  };
}

function analyzeMetricalHarmony(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): {
  strongBeatDissonanceCount: number;
  harmonicFunctionMismatches: number;
  harmonicFunctionMatches: number;
} {
  const endTick = Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
  let strongBeatDissonanceCount = 0;
  let harmonicFunctionMismatches = 0;
  let harmonicFunctionMatches = 0;

  for (let tick = 0; tick < endTick; tick += TICKS_PER_QUARTER / 2) {
    const anchor = nearestHarmonicAnchor(tick, sectionPlans);
    const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    if (
      anchor === undefined ||
      activeNotes.length === 0 ||
      beatStrengthAtTick(tick, anchorPlan(sectionPlans, tick)?.meterContext) !== "strong"
    ) {
      continue;
    }

    const chordTones = chordTonePitchClasses(anchor.localKey, anchor.function);
    const activePitchClasses = activeNotes.map((note) => positiveModulo(note.pitch, 12));
    const hasChordToneSupport = activePitchClasses.some((pitchClass) => chordTones.includes(pitchClass));
    const hasNonChordTone = activePitchClasses.some((pitchClass) => !chordTones.includes(pitchClass));
    const hasBassRootSupport = bassSupportsRoot(activeNotes, anchor);
    const unanchoredStrongBeatNonChordTone = hasNonChordTone && !hasBassRootSupport;
    const harmonicFunctionMismatch = !hasChordToneSupport || unanchoredStrongBeatNonChordTone;

    strongBeatDissonanceCount += Number(unanchoredStrongBeatNonChordTone);
    harmonicFunctionMismatches += Number(harmonicFunctionMismatch);
    harmonicFunctionMatches += Number(!harmonicFunctionMismatch);
  }

  return {
    strongBeatDissonanceCount,
    harmonicFunctionMismatches,
    harmonicFunctionMatches,
  };
}

function anchorPlan(sectionPlans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return sectionPlans.find(
    (candidate) => tick >= candidate.startTick && tick < candidate.startTick + candidate.durationTicks,
  );
}

function nearestHarmonicAnchor(
  tick: number,
  sectionPlans: readonly HarmonicPlan[],
): HarmonicPlan["anchors"][number] | undefined {
  const plan = sectionPlans.find(
    (candidate) => tick >= candidate.startTick && tick < candidate.startTick + candidate.durationTicks,
  );
  const anchors = plan?.anchors ?? sectionPlans.flatMap((candidate) => candidate.anchors);
  return anchors
    .map((anchor) => ({ anchor, distance: Math.abs(anchor.tick - tick) }))
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
}

function chordTonePitchClasses(
  key: HarmonicPlan["anchors"][number]["localKey"],
  harmonicFunction: HarmonicPlan["anchors"][number]["function"],
): number[] {
  const rootDegree = rootDegreeForFunction(harmonicFunction);
  return [rootDegree, rootDegree + 2, rootDegree + 4].map((degree) => scaleDegreePitchClass(degree, 0, key));
}

function rootDegreeForFunction(harmonicFunction: HarmonicPlan["anchors"][number]["function"]): number {
  if (harmonicFunction === "predominant") {
    return 3;
  }
  if (harmonicFunction === "dominant") {
    return 4;
  }
  return 0;
}

function bassSupportsRoot(activeNotes: readonly NoteEvent[], anchor: HarmonicPlan["anchors"][number]): boolean {
  const bassPitch = activeNotes.find((note) => note.voice === "bass")?.pitch;
  if (bassPitch === undefined) {
    return false;
  }
  return (
    positiveModulo(bassPitch, 12) === scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey)
  );
}

function countModalCharacteristicToneHits(notes: readonly NoteEvent[], sectionPlans: readonly HarmonicPlan[]): number {
  let hits = 0;
  for (const plan of sectionPlans) {
    const mode = isModalMode(plan.targetKey.mode) ? plan.targetKey.mode : plan.localKey.mode;
    const scaleDegree = characteristicScaleDegree(mode);
    if (scaleDegree === undefined) {
      continue;
    }
    const key = isModalMode(plan.targetKey.mode) ? plan.targetKey : plan.localKey;
    const pitchClass = scaleDegreePitchClass(scaleDegree, 0, key);
    if (
      notes.some(
        (note) =>
          note.startTick >= plan.startTick &&
          note.startTick < plan.startTick + plan.durationTicks &&
          positiveModulo(note.pitch, 12) === pitchClass,
      )
    ) {
      hits += 1;
    }
  }
  return hits;
}

function countPredominantDirectionMisses(sectionPlans: readonly HarmonicPlan[]): number {
  return sectionPlans.filter((plan) => {
    const functions = plan.anchors.map((anchor) => anchor.function);
    const predominantIndex = functions.indexOf("predominant");
    const dominantIndex = functions.indexOf("dominant");
    return predominantIndex !== -1 && dominantIndex !== -1 && dominantIndex < predominantIndex;
  }).length;
}

function countFormRepetitionWarnings(sectionPlans: readonly HarmonicPlan[]): number {
  const continuationPlans = sectionPlans.filter((plan) => plan.state !== "exposition");
  if (continuationPlans.length < 4) {
    return 0;
  }

  const uniqueDurations = new Set(continuationPlans.map((plan) => plan.durationTicks));
  const uniqueStates = new Set(continuationPlans.map((plan) => plan.state));
  const allDurationsIdentical = uniqueDurations.size === 1;
  const hasTooFewStates = uniqueStates.size < 3;
  return allDurationsIdentical || hasTooFewStates ? 1 : 0;
}
