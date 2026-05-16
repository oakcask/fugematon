import type { HarmonicPlan, NoteEvent, PlannedEntry } from "../events.js";
import { characteristicScaleDegree, isModalMode } from "./key.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo, roundRatio } from "./shared.js";
import type { HarmonicDiagnostics } from "./types.js";

export function analyzeHarmonicPlans(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  subjectEntries: readonly PlannedEntry[],
): HarmonicDiagnostics {
  const cadenceAnchors = sectionPlans.flatMap((plan) => plan.anchors.filter((anchor) => anchor.cadenceTarget));
  const harmonicFunctionMatches = sectionPlans.reduce((sum, plan) => sum + plan.anchors.length, 0);
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
    strongBeatDissonanceCount: 0,
    cadenceTargetMisses: 0,
    cadenceTargetHits: cadenceAnchors.length,
    leadingToneResolutionMisses: 0,
    dominantResolutionMisses: 0,
    predominantDirectionMisses: countPredominantDirectionMisses(sectionPlans),
    harmonicFunctionMismatches: 0,
    harmonicFunctionMatches,
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
