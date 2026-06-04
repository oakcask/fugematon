import type {
  SectionConstraintInfeasibleCounts,
  SectionConstraintScoringProfileId,
  SectionConstraintScoringProfileMetadata,
} from "../events.js";
import { roundRatio } from "./shared.js";

export const SECTION_CONSTRAINT_SCORING_PROFILE_IDS = [
  "current",
  "entry-soft",
  "entry-balanced",
  "entry-strict",
  "entry-strict-leap",
] as const satisfies readonly SectionConstraintScoringProfileId[];

export const DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID: SectionConstraintScoringProfileId = "current";

export type SectionConstraintScoringWeights = {
  minActiveVoiceViolation: number;
  unsupportedSolo: number;
  allVoiceSilence: number;
  longUnplannedSilentRun: number;
  structuralChordSupportMiss: number;
  structuralRootSupportMiss: number;
  entrySupportInstability: number;
  unresolvedEntrySupportInstability: number;
  unresolvedSevereEntryInterval: number;
  entryAdjacentSecondFriction: number;
  unresolvedAccentedEntryClash: number;
  leapToSilence: number;
  sustainedSevereVerticalDissonance: number;
  voicePairUnisonPressure: number;
  voicePairLockstep: number;
  thinUnrootedStructuralSupport: number;
  pitchClassDoublingOnly: number;
  mixedEntryHarmonicRisk: number;
};

export type SectionConstraintScoringProfile = SectionConstraintScoringProfileMetadata & {
  weights: SectionConstraintScoringWeights;
};

const CURRENT_WEIGHTS: SectionConstraintScoringWeights = {
  minActiveVoiceViolation: 2,
  unsupportedSolo: 6,
  allVoiceSilence: 8,
  longUnplannedSilentRun: 5,
  structuralChordSupportMiss: 4,
  structuralRootSupportMiss: 6,
  entrySupportInstability: 1,
  unresolvedEntrySupportInstability: 5,
  unresolvedSevereEntryInterval: 6,
  entryAdjacentSecondFriction: 0,
  unresolvedAccentedEntryClash: 0,
  leapToSilence: 0,
  sustainedSevereVerticalDissonance: 16,
  voicePairUnisonPressure: 0.25,
  voicePairLockstep: 0.125,
  thinUnrootedStructuralSupport: 3,
  pitchClassDoublingOnly: 4,
  mixedEntryHarmonicRisk: 5,
};

const SECTION_CONSTRAINT_SCORING_PROFILES: Record<SectionConstraintScoringProfileId, SectionConstraintScoringProfile> =
  {
    current: { id: "current", version: 1, weights: CURRENT_WEIGHTS },
    "entry-soft": {
      id: "entry-soft",
      version: 1,
      weights: {
        ...CURRENT_WEIGHTS,
        entryAdjacentSecondFriction: 4,
        unresolvedAccentedEntryClash: 4,
      },
    },
    "entry-balanced": {
      id: "entry-balanced",
      version: 1,
      weights: {
        ...CURRENT_WEIGHTS,
        entrySupportInstability: 2,
        unresolvedEntrySupportInstability: 8,
        unresolvedSevereEntryInterval: 9,
        entryAdjacentSecondFriction: 8,
        unresolvedAccentedEntryClash: 8,
        leapToSilence: 8,
        voicePairUnisonPressure: 0.5,
      },
    },
    "entry-strict": {
      id: "entry-strict",
      version: 1,
      weights: {
        ...CURRENT_WEIGHTS,
        entrySupportInstability: 2,
        unresolvedEntrySupportInstability: 8,
        unresolvedSevereEntryInterval: 12,
        entryAdjacentSecondFriction: 12,
        unresolvedAccentedEntryClash: 8,
        leapToSilence: 8,
        voicePairUnisonPressure: 0.5,
      },
    },
    "entry-strict-leap": {
      id: "entry-strict-leap",
      version: 1,
      weights: {
        ...CURRENT_WEIGHTS,
        entrySupportInstability: 2,
        unresolvedEntrySupportInstability: 8,
        unresolvedSevereEntryInterval: 12,
        entryAdjacentSecondFriction: 12,
        unresolvedAccentedEntryClash: 8,
        leapToSilence: 16,
        voicePairUnisonPressure: 0.5,
      },
    },
  };

export function normalizeSectionConstraintScoringProfileId(
  value: string | undefined,
): SectionConstraintScoringProfileId {
  if (value === undefined) {
    return DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID;
  }
  if ((SECTION_CONSTRAINT_SCORING_PROFILE_IDS as readonly string[]).includes(value)) {
    return value as SectionConstraintScoringProfileId;
  }
  throw new Error(`constraint profile must be ${SECTION_CONSTRAINT_SCORING_PROFILE_IDS.join(", ")}`);
}

export function resolveSectionConstraintScoringProfile(
  id: SectionConstraintScoringProfileId | undefined,
): SectionConstraintScoringProfile {
  return SECTION_CONSTRAINT_SCORING_PROFILES[id ?? DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID];
}

export function sectionConstraintScoringProfileMetadata(
  profile: SectionConstraintScoringProfile,
): SectionConstraintScoringProfileMetadata {
  return { id: profile.id, version: profile.version };
}

export function sectionConstraintSoftCostFromCounts(
  counts: SectionConstraintInfeasibleCounts,
  profile: SectionConstraintScoringProfile = resolveSectionConstraintScoringProfile(undefined),
): number {
  const weights = profile.weights;
  return roundRatio(
    counts.minActiveVoiceViolation * weights.minActiveVoiceViolation +
      counts.unsupportedSolo * weights.unsupportedSolo +
      counts.allVoiceSilence * weights.allVoiceSilence +
      counts.longUnplannedSilentRun * weights.longUnplannedSilentRun +
      counts.structuralChordSupportMiss * weights.structuralChordSupportMiss +
      counts.structuralRootSupportMiss * weights.structuralRootSupportMiss +
      counts.entrySupportInstabilityCount * weights.entrySupportInstability +
      counts.unresolvedEntrySupportInstabilityCount * weights.unresolvedEntrySupportInstability +
      counts.unresolvedSevereEntryIntervalCount * weights.unresolvedSevereEntryInterval +
      counts.entryAdjacentSecondFrictionCount * weights.entryAdjacentSecondFriction +
      counts.unresolvedAccentedEntryClashCount * weights.unresolvedAccentedEntryClash +
      counts.leapToSilenceCount * weights.leapToSilence +
      counts.sustainedSevereVerticalDissonanceCount * weights.sustainedSevereVerticalDissonance +
      counts.voicePairUnisonPressureCount * weights.voicePairUnisonPressure +
      counts.voicePairLockstepCount * weights.voicePairLockstep +
      counts.thinUnrootedStructuralSupportCount * weights.thinUnrootedStructuralSupport +
      counts.pitchClassDoublingOnlyCount * weights.pitchClassDoublingOnly +
      counts.mixedEntryHarmonicRiskCount * weights.mixedEntryHarmonicRisk,
  );
}
