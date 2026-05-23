import {
  BASELINE_BEAUTY_DIAGNOSTICS_PROFILE,
  CONTOUR_MOTION_DIAGNOSTICS_PROFILE,
  MELODY_TEXTURE_DIAGNOSTICS_PROFILE,
  ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE,
  VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE,
} from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";

export type ReviewGateFailure = {
  metric: string;
  actual: number | string;
  expected: string;
};

export type BaselineBeautyGateResult = {
  passed: boolean;
  failures: ReviewGateFailure[];
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

export type Phase59GateFailure = ReviewGateFailure;
export type Phase59GateResult = BaselineBeautyGateResult;

export type VoiceIndependenceGateResult = {
  passed: boolean;
  failures: ReviewGateFailure[];
  metrics: BaselineBeautyGateResult["metrics"] & {
    shortStrongBeatEntryNoteCount: number;
    entrySupportInstabilityCount: number;
    maxEntrySupportInstabilityPerEntry: number;
    maxConsecutiveEntrySupportInstabilities: number;
    unresolvedEntrySupportInstabilityCount: number;
  };
};

export type Phase510GateResult = VoiceIndependenceGateResult;

export type RotationRobustnessGateResult = VoiceIndependenceGateResult & {
  followUps: ReviewGateFailure[];
};

export type Phase511GateResult = RotationRobustnessGateResult;

export type MelodyTextureGateResult = {
  passed: boolean;
  failures: ReviewGateFailure[];
  metrics: RotationRobustnessGateResult["metrics"] & {
    samePitchOverlapCount: number;
    severeEntryIntervalCount: number;
    unresolvedSevereEntryIntervalCount: number;
    unsupportedSoloRunCount: number;
    abruptTextureDropCount: number;
    soloVoiceImbalance: number;
    ornamentPlacementReasonCount: number;
    expositionDurationTicks: number;
    firstContinuationStartTick: number;
  };
};

export type Phase6GateResult = MelodyTextureGateResult;

export type ContourMotionGateResult = {
  passed: boolean;
  failures: ReviewGateFailure[];
  metrics: MelodyTextureGateResult["metrics"] & {
    fourBeatBassUpperSameDirectionRatio: number;
    fourBeatBassUpperContraryRatio: number;
    eightBeatBassUpperSameDirectionRatio: number;
    eightBeatBassUpperContraryRatio: number;
    fourBeatOuterVoiceSameDirectionRatio: number;
    fourBeatOuterVoiceContraryRatio: number;
    fourBeatBassUpperComparisonCount: number;
    eightBeatBassUpperComparisonCount: number;
  };
};

export type Phase7GateResult = ContourMotionGateResult;

export type ManualListeningJudgement = "pass" | "needs-work" | "fail" | "not-reviewed";

export type ReviewGatePolicyClassification = "hard-failure" | "review-required" | "warning" | "manual";

export type ReviewGateFindingSource = "diagnostics" | "legacy-phase-gate" | "diagnostics-warning" | "manual-listening";

export type ClassifiedReviewGateFinding = ReviewGateFailure & {
  policy: ReviewGatePolicyClassification;
  source: ReviewGateFindingSource;
};

export type ReviewGatePolicyOptions = {
  manualListeningCategory?: string;
  manualListeningJudgement?: ManualListeningJudgement;
};

export type ReviewGatePolicyResult = {
  policy: {
    schemaVersion: 1;
    phase: "phase-7B";
  };
  passed: boolean;
  hardConstraintPassed: boolean;
  phase8Ready: boolean;
  findings: ClassifiedReviewGateFinding[];
  hardFailures: ClassifiedReviewGateFinding[];
  reviewSignals: ClassifiedReviewGateFinding[];
  warnings: ClassifiedReviewGateFinding[];
  manual: ClassifiedReviewGateFinding[];
  metrics: ContourMotionGateResult["metrics"] & {
    hardFailureCount: number;
    hardConstraintFailureCount: number;
    diagnosticsWarningCount: number;
  };
  legacyPhase7Gate: ContourMotionGateResult;
};

export type Phase7BPolicyOptions = ReviewGatePolicyOptions;
export type Phase7BGatePolicyResult = ReviewGatePolicyResult;

export function evaluateBaselineBeautyGate(seed: string, diagnostics: GenerationDiagnostics): BaselineBeautyGateResult {
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
  const failures: ReviewGateFailure[] = [];

  addMinimumFailure(
    failures,
    "counterSubjectIdentityRetention",
    metrics.counterSubjectIdentityRetention,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "maxSelectedCandidateTextureCost",
    metrics.maxSelectedCandidateTextureCost,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSelectedCandidateTextureCost,
  );
  addMaximumFailure(
    failures,
    "averageSelectedCandidateTextureCost",
    metrics.averageSelectedCandidateTextureCost,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateTextureCost,
  );
  addMaximumFailure(
    failures,
    "maxSelectedCandidateMelodyCost",
    metrics.maxSelectedCandidateMelodyCost,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxSelectedCandidateMelodyCost,
  );
  addMaximumFailure(
    failures,
    "averageSelectedCandidateMelodyCost",
    metrics.averageSelectedCandidateMelodyCost,
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.maxAverageSelectedCandidateMelodyCost,
  );
  addBoundaryFailures(failures, seed, diagnostics, metrics);

  addMinimumFailure(failures, "selectedCandidateEvaluationCount", metrics.selectedCandidateEvaluationCount, 1);

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase59Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase59GateResult {
  return evaluateBaselineBeautyGate(seed, diagnostics);
}

export function evaluateVoiceIndependenceGate(
  seed: string,
  diagnostics: GenerationDiagnostics,
): VoiceIndependenceGateResult {
  const baselineBeautyGate = evaluateBaselineBeautyGate(seed, diagnostics);
  const metrics = {
    ...baselineBeautyGate.metrics,
    shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
    entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
    maxEntrySupportInstabilityPerEntry: maximum(
      diagnostics.entrySupportInstabilityDetails.map((detail) => detail.instabilityCount),
    ),
    maxConsecutiveEntrySupportInstabilities: maximum(
      diagnostics.entrySupportInstabilityDetails.map((detail) => detail.maxConsecutiveInstabilities),
    ),
    unresolvedEntrySupportInstabilityCount: diagnostics.entrySupportInstabilityDetails.reduce(
      (sum, detail) => sum + detail.unresolvedInstabilityCount,
      0,
    ),
  };
  const failures = [...baselineBeautyGate.failures];

  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "shortStrongBeatEntryNoteCount",
    metrics.shortStrongBeatEntryNoteCount,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
  );
  addMaximumFailure(
    failures,
    "entrySupportInstabilityCount",
    metrics.entrySupportInstabilityCount,
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addVoiceIndependenceBoundaryFailures(failures, seed, diagnostics);

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase510Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase510GateResult {
  return evaluateVoiceIndependenceGate(seed, diagnostics);
}

export function evaluateRotationRobustnessGate(
  seed: string,
  diagnostics: GenerationDiagnostics,
): RotationRobustnessGateResult {
  const voiceIndependenceGate = evaluateVoiceIndependenceGate(seed, diagnostics);
  const failures: ReviewGateFailure[] = [];
  const followUps: ReviewGateFailure[] = [];
  const { metrics } = voiceIndependenceGate;

  addMinimumFailure(
    failures,
    "counterSubjectIdentityRetention",
    metrics.counterSubjectIdentityRetention,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "shortStrongBeatEntryNoteCount",
    metrics.shortStrongBeatEntryNoteCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
  );
  addMaximumFailure(
    failures,
    "entrySupportInstabilityCount",
    metrics.entrySupportInstabilityCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addMaximumFailure(
    failures,
    "maxEntrySupportInstabilityPerEntry",
    metrics.maxEntrySupportInstabilityPerEntry,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
  );
  addMaximumFailure(
    failures,
    "maxConsecutiveEntrySupportInstabilities",
    metrics.maxConsecutiveEntrySupportInstabilities,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
  );
  addMaximumFailure(
    failures,
    "unresolvedEntrySupportInstabilityCount",
    metrics.unresolvedEntrySupportInstabilityCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
  );
  addMinimumFailure(
    failures,
    "selectedCandidateEvaluationCount",
    metrics.selectedCandidateEvaluationCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minSelectedCandidateEvaluationCount,
  );
  addRotationRobustnessModalFailures(failures, seed, diagnostics);
  addRotationRobustnessFollowUps(followUps, seed, diagnostics, metrics);

  return {
    passed: failures.length === 0,
    failures,
    followUps,
    metrics,
  };
}

export function evaluatePhase511Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase511GateResult {
  return evaluateRotationRobustnessGate(seed, diagnostics);
}

export function evaluateMelodyTextureGate(seed: string, diagnostics: GenerationDiagnostics): MelodyTextureGateResult {
  const rotationRobustnessGate = evaluateRotationRobustnessGate(seed, diagnostics);
  const expositionPlan = diagnostics.sectionPlans.find((plan) => plan.state === "exposition");
  const firstContinuationPlan = diagnostics.sectionPlans.find((plan) => plan.state !== "exposition");
  const metrics = {
    ...rotationRobustnessGate.metrics,
    samePitchOverlapCount: diagnostics.samePitchOverlapCount,
    severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
    unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
    unsupportedSoloRunCount: diagnostics.soloTexture.unsupportedSoloRunCount,
    abruptTextureDropCount: diagnostics.soloTexture.abruptTextureDropCount,
    soloVoiceImbalance: diagnostics.soloTexture.soloVoiceImbalance,
    ornamentPlacementReasonCount: diagnostics.ornamentPlacementReasons.total,
    expositionDurationTicks: expositionPlan?.durationTicks ?? 0,
    firstContinuationStartTick: firstContinuationPlan?.startTick ?? 0,
  };
  const failures = [...rotationRobustnessGate.failures];

  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "samePitchOverlapCount",
    metrics.samePitchOverlapCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount,
  );
  addMaximumFailure(
    failures,
    "severeEntryIntervalCount",
    metrics.severeEntryIntervalCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount,
  );
  addMaximumFailure(
    failures,
    "unresolvedSevereEntryIntervalCount",
    metrics.unresolvedSevereEntryIntervalCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
  );
  addMaximumFailure(
    failures,
    "unsupportedSoloRunCount",
    metrics.unsupportedSoloRunCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount,
  );
  addMaximumFailure(
    failures,
    "abruptTextureDropCount",
    metrics.abruptTextureDropCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount,
  );
  addMaximumFailure(
    failures,
    "soloVoiceImbalance",
    metrics.soloVoiceImbalance,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance,
  );
  addMinimumFailure(
    failures,
    "ornamentPlacementReasonCount",
    metrics.ornamentPlacementReasonCount,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount,
  );
  addMaximumFailure(
    failures,
    "expositionDurationTicks",
    metrics.expositionDurationTicks,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks,
  );
  addMaximumFailure(
    failures,
    "firstContinuationStartTick",
    metrics.firstContinuationStartTick,
    MELODY_TEXTURE_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick,
  );

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase6Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase6GateResult {
  return evaluateMelodyTextureGate(seed, diagnostics);
}

export function evaluateContourMotionGate(seed: string, diagnostics: GenerationDiagnostics): ContourMotionGateResult {
  const melodyTextureGate = evaluateMelodyTextureGate(seed, diagnostics);
  const { fourBeat, eightBeat } = diagnostics.pitchContourMotion;
  const metrics = {
    ...melodyTextureGate.metrics,
    fourBeatBassUpperSameDirectionRatio: fourBeat.bassUpperSameDirectionRatio,
    fourBeatBassUpperContraryRatio: fourBeat.bassUpperContraryRatio,
    eightBeatBassUpperSameDirectionRatio: eightBeat.bassUpperSameDirectionRatio,
    eightBeatBassUpperContraryRatio: eightBeat.bassUpperContraryRatio,
    fourBeatOuterVoiceSameDirectionRatio: fourBeat.outerVoiceSameDirectionRatio,
    fourBeatOuterVoiceContraryRatio: fourBeat.outerVoiceContraryRatio,
    fourBeatBassUpperComparisonCount: fourBeat.bassUpperComparisonCount,
    eightBeatBassUpperComparisonCount: eightBeat.bassUpperComparisonCount,
  };
  const failures = [...melodyTextureGate.failures];

  addMaximumFailure(
    failures,
    "fourBeatBassUpperSameDirectionRatio",
    metrics.fourBeatBassUpperSameDirectionRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatBassUpperContraryRatio",
    metrics.fourBeatBassUpperContraryRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
  );
  addMaximumFailure(
    failures,
    "eightBeatBassUpperSameDirectionRatio",
    metrics.eightBeatBassUpperSameDirectionRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "eightBeatBassUpperContraryRatio",
    metrics.eightBeatBassUpperContraryRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
  );
  addMaximumFailure(
    failures,
    "fourBeatOuterVoiceSameDirectionRatio",
    metrics.fourBeatOuterVoiceSameDirectionRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatOuterVoiceContraryRatio",
    metrics.fourBeatOuterVoiceContraryRatio,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatBassUpperComparisonCount",
    metrics.fourBeatBassUpperComparisonCount,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minContourComparisonCount,
  );
  addMinimumFailure(
    failures,
    "eightBeatBassUpperComparisonCount",
    metrics.eightBeatBassUpperComparisonCount,
    CONTOUR_MOTION_DIAGNOSTICS_PROFILE.minContourComparisonCount,
  );

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase7Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase7GateResult {
  return evaluateContourMotionGate(seed, diagnostics);
}

export function manualListeningBlockers(category: string, judgement: ManualListeningJudgement): string[] {
  if ((category === "representative" || category === "boundary") && judgement !== "pass") {
    return ["manual listening judgement must be pass before melody texture review"];
  }

  return [];
}

export function phase59ManualListeningBlockers(category: string, judgement: ManualListeningJudgement): string[] {
  return manualListeningBlockers(category, judgement);
}

export function evaluateReviewGatePolicy(
  seed: string,
  diagnostics: GenerationDiagnostics,
  options: ReviewGatePolicyOptions = {},
): ReviewGatePolicyResult {
  const legacyPhase7Gate = evaluateContourMotionGate(seed, diagnostics);
  const diagnosticHardFailures = classifyHardConstraintFailures(diagnostics);
  const classifiedLegacyFindings = legacyPhase7Gate.failures.map(classifyLegacyGateFailure);
  const diagnosticsWarnings = classifyDiagnosticsWarnings(diagnostics);
  const manual = classifyManualListening(options.manualListeningCategory, options.manualListeningJudgement);
  const findings = [...diagnosticHardFailures, ...classifiedLegacyFindings, ...diagnosticsWarnings, ...manual];
  const hardFailures = findings.filter((finding) => finding.policy === "hard-failure");
  const reviewSignals = findings.filter((finding) => finding.policy === "review-required");
  const warnings = findings.filter((finding) => finding.policy === "warning");
  const hardConstraintPassed = diagnosticHardFailures.length === 0;
  const phase8Ready = hardFailures.length === 0;

  return {
    policy: {
      schemaVersion: 1,
      phase: "phase-7B",
    },
    passed: phase8Ready,
    hardConstraintPassed,
    phase8Ready,
    findings,
    hardFailures,
    reviewSignals,
    warnings,
    manual,
    metrics: {
      ...legacyPhase7Gate.metrics,
      hardFailureCount: hardFailures.length,
      hardConstraintFailureCount: diagnosticHardFailures.length,
      diagnosticsWarningCount: diagnostics.warnings.length,
    },
    legacyPhase7Gate,
  };
}

export function evaluatePhase7BGatePolicy(
  seed: string,
  diagnostics: GenerationDiagnostics,
  options: Phase7BPolicyOptions = {},
): Phase7BGatePolicyResult {
  return evaluateReviewGatePolicy(seed, diagnostics, options);
}

function addBoundaryFailures(
  failures: ReviewGateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
  metrics: BaselineBeautyGateResult["metrics"],
): void {
  const profile =
    BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.boundarySeeds[
      seed as keyof typeof BASELINE_BEAUTY_DIAGNOSTICS_PROFILE.boundarySeeds
    ];

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

function addVoiceIndependenceBoundaryFailures(
  failures: ReviewGateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
): void {
  const profile =
    VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.boundarySeeds[
      seed as keyof typeof VOICE_INDEPENDENCE_DIAGNOSTICS_PROFILE.boundarySeeds
    ];

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
  if ("maxShortStrongBeatEntryNoteCount" in profile) {
    addMaximumFailure(
      failures,
      `${seed}.shortStrongBeatEntryNoteCount`,
      diagnostics.shortStrongBeatEntryNoteCount,
      profile.maxShortStrongBeatEntryNoteCount,
    );
  }
  if ("maxEntrySupportInstabilityCount" in profile) {
    addMaximumFailure(
      failures,
      `${seed}.entrySupportInstabilityCount`,
      diagnostics.entrySupportInstabilityCount,
      profile.maxEntrySupportInstabilityCount,
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
}

function addRotationRobustnessModalFailures(
  failures: ReviewGateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
): void {
  const profile =
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds[
      seed as keyof typeof ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds
    ];

  if (profile === undefined) {
    return;
  }

  addMinimumFailure(
    failures,
    `${seed}.counterSubjectIdentityRetention`,
    diagnostics.counterSubjectIdentityRetention,
    profile.minCounterSubjectIdentityRetention,
  );
  addMaximumFailure(
    failures,
    `${seed}.sameDirectionMotionCount`,
    diagnostics.sameDirectionMotionCount,
    profile.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    `${seed}.leapRecoveryMisses`,
    diagnostics.leapRecoveryMisses,
    profile.maxLeapRecoveryMisses,
  );
  addMinimumFailure(failures, `${seed}.modalContextCount`, diagnostics.modalContextCount, profile.minModalContextCount);
}

function addRotationRobustnessFollowUps(
  followUps: ReviewGateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
  metrics: VoiceIndependenceGateResult["metrics"],
): void {
  addMinimumMarginFollowUp(
    followUps,
    `${seed}.counterSubjectIdentityRetention`,
    metrics.counterSubjectIdentityRetention,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumMarginFollowUp(
    followUps,
    `${seed}.rhythmicIndependenceScore`,
    metrics.rhythmicIndependenceScore,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.unisonOverlapCount`,
    metrics.unisonOverlapCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.sameDirectionMotionCount`,
    metrics.sameDirectionMotionCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.sharedRhythmOverlapCount`,
    metrics.sharedRhythmOverlapCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.leapRecoveryMisses`,
    metrics.leapRecoveryMisses,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.entrySupportInstabilityCount`,
    metrics.entrySupportInstabilityCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.maxEntrySupportInstabilityPerEntry`,
    metrics.maxEntrySupportInstabilityPerEntry,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.maxConsecutiveEntrySupportInstabilities`,
    metrics.maxConsecutiveEntrySupportInstabilities,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.unresolvedEntrySupportInstabilityCount`,
    metrics.unresolvedEntrySupportInstabilityCount,
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
  );

  const modalProfile =
    ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds[
      seed as keyof typeof ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.modalRotationSeeds
    ];
  if (modalProfile !== undefined) {
    addMinimumMarginFollowUp(
      followUps,
      `${seed}.modalContextCount`,
      diagnostics.modalContextCount,
      modalProfile.minModalContextCount,
    );
  }
}

function addMinimumFailure(failures: ReviewGateFailure[], metric: string, actual: number, expected: number): void {
  if (actual < expected) {
    failures.push({ metric, actual, expected: `>= ${expected}` });
  }
}

function addMaximumFailure(failures: ReviewGateFailure[], metric: string, actual: number, expected: number): void {
  if (actual > expected) {
    failures.push({ metric, actual, expected: `<= ${expected}` });
  }
}

function addMinimumMarginFollowUp(
  followUps: ReviewGateFailure[],
  metric: string,
  actual: number,
  expected: number,
): void {
  if (actual - expected <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.followUpMargin) {
    followUps.push({ metric, actual, expected: `> ${expected}` });
  }
}

function addMaximumMarginFollowUp(
  followUps: ReviewGateFailure[],
  metric: string,
  actual: number,
  expected: number,
): void {
  if (expected - actual <= ROTATION_ROBUSTNESS_DIAGNOSTICS_PROFILE.followUpMargin) {
    followUps.push({ metric, actual, expected: `< ${expected}` });
  }
}

const REVIEW_POLICY_REVIEW_SIGNAL_METRICS = new Set([
  "counterSubjectIdentityRetention",
  "rhythmicIndependenceScore",
  "unisonOverlapCount",
  "samePitchOverlapCount",
  "sameDirectionMotionCount",
  "sharedRhythmOverlapCount",
  "leapRecoveryMisses",
  "maxSelectedCandidateTextureCost",
  "averageSelectedCandidateTextureCost",
  "maxSelectedCandidateMelodyCost",
  "averageSelectedCandidateMelodyCost",
  "shortStrongBeatEntryNoteCount",
  "entrySupportInstabilityCount",
  "maxEntrySupportInstabilityPerEntry",
  "maxConsecutiveEntrySupportInstabilities",
  "unresolvedEntrySupportInstabilityCount",
  "severeEntryIntervalCount",
  "unresolvedSevereEntryIntervalCount",
  "unsupportedSoloRunCount",
  "abruptTextureDropCount",
  "soloVoiceImbalance",
  "fourBeatBassUpperSameDirectionRatio",
  "fourBeatBassUpperContraryRatio",
  "eightBeatBassUpperSameDirectionRatio",
  "eightBeatBassUpperContraryRatio",
  "fourBeatOuterVoiceSameDirectionRatio",
  "fourBeatOuterVoiceContraryRatio",
  "modalContextCount",
  "modalCharacteristicToneHits",
  "modalCadenceHits",
]);

const REVIEW_POLICY_SCHEMA_SHAPE_METRICS = new Set([
  "selectedCandidateEvaluationCount",
  "fourBeatBassUpperComparisonCount",
  "eightBeatBassUpperComparisonCount",
]);

function classifyHardConstraintFailures(diagnostics: GenerationDiagnostics): ClassifiedReviewGateFinding[] {
  return [
    ...hardConstraintFailure("rangeViolations", diagnostics.rangeViolations),
    ...hardConstraintFailure("voiceCrossings", diagnostics.voiceCrossings),
    ...hardConstraintFailure("subjectIdentityViolations", diagnostics.subjectIdentityViolations),
    ...hardConstraintFailure("answerPlanViolations", diagnostics.answerPlanViolations),
    ...hardConstraintFailure("keyMetadataMismatches", diagnostics.keyMetadataMismatches),
    ...hardConstraintFailure("unresolvedDissonanceCount", diagnostics.unresolvedDissonanceCount),
    ...hardConstraintFailure("allVoiceSilenceGapCount", diagnostics.allVoiceSilenceGapCount),
  ];
}

function hardConstraintFailure(metric: string, actual: number): ClassifiedReviewGateFinding[] {
  if (actual === 0) {
    return [];
  }

  return [{ metric, actual, expected: "0", policy: "hard-failure", source: "diagnostics" }];
}

function classifyLegacyGateFailure(failure: ReviewGateFailure): ClassifiedReviewGateFinding {
  const metric = metricName(failure.metric);
  if (REVIEW_POLICY_REVIEW_SIGNAL_METRICS.has(metric)) {
    return { ...failure, policy: "review-required", source: "legacy-phase-gate" };
  }
  if (REVIEW_POLICY_SCHEMA_SHAPE_METRICS.has(metric)) {
    return { ...failure, policy: "hard-failure", source: "legacy-phase-gate" };
  }

  return { ...failure, policy: "warning", source: "legacy-phase-gate" };
}

function classifyDiagnosticsWarnings(diagnostics: GenerationDiagnostics): ClassifiedReviewGateFinding[] {
  return [
    ...diagnostics.warnings.map((warning, index) => ({
      metric: `warnings.${index}`,
      actual: warning,
      expected: "review",
      policy: "warning" as const,
      source: "diagnostics-warning" as const,
    })),
  ];
}

function classifyManualListening(
  category: string | undefined,
  judgement: ManualListeningJudgement | undefined,
): ClassifiedReviewGateFinding[] {
  if (category === undefined || judgement === undefined) {
    return [];
  }
  const blockers = manualListeningBlockers(category, judgement);
  if (blockers.length === 0) {
    return [];
  }

  return [
    {
      metric: "manualListeningJudgement",
      actual: judgement,
      expected: blockers.join("; "),
      policy: "manual",
      source: "manual-listening",
    },
  ];
}

function metricName(metric: string): string {
  return metric.slice(metric.lastIndexOf(".") + 1);
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
