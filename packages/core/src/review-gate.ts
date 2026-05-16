import { PHASE_5_9_DIAGNOSTICS_PROFILE } from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";

export type Phase59GateFailure = {
  metric: string;
  actual: number | string;
  expected: string;
};

export type Phase59GateResult = {
  passed: boolean;
  failures: Phase59GateFailure[];
  metrics: {
    counterSubjectIdentityRetention: number;
    rhythmicIndependenceScore: number;
    unisonOverlapCount: number;
    sameDirectionMotionCount: number;
    sharedRhythmOverlapCount: number;
    leapRecoveryMisses: number;
    selectedCandidateEvaluationCount: number;
    maxSelectedCandidateTextureCost: number;
    averageSelectedCandidateTextureCost: number;
    maxSelectedCandidateMelodyCost: number;
    averageSelectedCandidateMelodyCost: number;
  };
};

export type ManualListeningJudgement = "pass" | "needs-work" | "fail" | "not-reviewed";

export function evaluatePhase59Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase59GateResult {
  const textureCosts = diagnostics.selectedCandidateEvaluations.map((evaluation) => evaluation.dimensions.texture.cost);
  const melodyCosts = diagnostics.selectedCandidateEvaluations.map((evaluation) => evaluation.dimensions.melody.cost);
  const metrics = {
    counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
    rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
    unisonOverlapCount: diagnostics.unisonOverlapCount,
    sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
    sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
    leapRecoveryMisses: diagnostics.leapRecoveryMisses,
    selectedCandidateEvaluationCount: diagnostics.selectedCandidateEvaluations.length,
    maxSelectedCandidateTextureCost: maximum(textureCosts),
    averageSelectedCandidateTextureCost: average(textureCosts),
    maxSelectedCandidateMelodyCost: maximum(melodyCosts),
    averageSelectedCandidateMelodyCost: average(melodyCosts),
  };
  const failures: Phase59GateFailure[] = [];

  addMinimumFailure(
    failures,
    "counterSubjectIdentityRetention",
    metrics.counterSubjectIdentityRetention,
    PHASE_5_9_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    PHASE_5_9_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "maxSelectedCandidateTextureCost",
    metrics.maxSelectedCandidateTextureCost,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateTextureCost,
  );
  addMaximumFailure(
    failures,
    "averageSelectedCandidateTextureCost",
    metrics.averageSelectedCandidateTextureCost,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateTextureCost,
  );
  addMaximumFailure(
    failures,
    "maxSelectedCandidateMelodyCost",
    metrics.maxSelectedCandidateMelodyCost,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxSelectedCandidateMelodyCost,
  );
  addMaximumFailure(
    failures,
    "averageSelectedCandidateMelodyCost",
    metrics.averageSelectedCandidateMelodyCost,
    PHASE_5_9_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateMelodyCost,
  );
  addBoundaryFailures(failures, seed, diagnostics, metrics);

  addMinimumFailure(failures, "selectedCandidateEvaluationCount", metrics.selectedCandidateEvaluationCount, 1);

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function phase59ManualListeningBlockers(category: string, judgement: ManualListeningJudgement): string[] {
  if ((category === "representative" || category === "boundary") && judgement !== "pass") {
    return ["manual listening judgement must be pass before Phase 6"];
  }

  return [];
}

function addBoundaryFailures(
  failures: Phase59GateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
  metrics: Phase59GateResult["metrics"],
): void {
  const profile =
    PHASE_5_9_DIAGNOSTICS_PROFILE.boundarySeeds[seed as keyof typeof PHASE_5_9_DIAGNOSTICS_PROFILE.boundarySeeds];

  if (profile === undefined) {
    return;
  }

  if ("minCounterSubjectIdentityRetention" in profile) {
    addMinimumFailure(
      failures,
      `${seed}.counterSubjectIdentityRetention`,
      diagnostics.counterSubjectIdentityRetention,
      profile.minCounterSubjectIdentityRetention,
    );
  }
  if ("maxSharedRhythmOverlapCount" in profile) {
    addMaximumFailure(
      failures,
      `${seed}.sharedRhythmOverlapCount`,
      diagnostics.sharedRhythmOverlapCount,
      profile.maxSharedRhythmOverlapCount,
    );
  }
  if ("maxLeapRecoveryMisses" in profile) {
    addMaximumFailure(
      failures,
      `${seed}.leapRecoveryMisses`,
      diagnostics.leapRecoveryMisses,
      profile.maxLeapRecoveryMisses,
    );
  }
  if ("minOrnamentDensity" in profile) {
    addMinimumFailure(failures, `${seed}.ornamentDensity`, diagnostics.ornamentDensity, profile.minOrnamentDensity);
  }
  if ("maxSelectedCandidateTextureCost" in profile) {
    addMaximumFailure(
      failures,
      `${seed}.maxSelectedCandidateTextureCost`,
      metrics.maxSelectedCandidateTextureCost,
      profile.maxSelectedCandidateTextureCost,
    );
  }
  if ("minModalContextCount" in profile) {
    addMinimumFailure(
      failures,
      `${seed}.modalContextCount`,
      diagnostics.modalContextCount,
      profile.minModalContextCount,
    );
    addMinimumFailure(
      failures,
      `${seed}.modalCharacteristicToneHits`,
      diagnostics.modalCharacteristicToneHits,
      profile.minModalCharacteristicToneHits,
    );
    addMinimumFailure(failures, `${seed}.modalCadenceHits`, diagnostics.modalCadenceHits, profile.minModalCadenceHits);
  }
}

function addMinimumFailure(failures: Phase59GateFailure[], metric: string, actual: number, expected: number): void {
  if (actual < expected) {
    failures.push({ metric, actual, expected: `>= ${expected}` });
  }
}

function addMaximumFailure(failures: Phase59GateFailure[], metric: string, actual: number, expected: number): void {
  if (actual > expected) {
    failures.push({ metric, actual, expected: `<= ${expected}` });
  }
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function maximum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}
