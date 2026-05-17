import {
  PHASE_5_9_DIAGNOSTICS_PROFILE,
  PHASE_5_10_DIAGNOSTICS_PROFILE,
  PHASE_5_11_DIAGNOSTICS_PROFILE,
  PHASE_6_DIAGNOSTICS_PROFILE,
  PHASE_7_DIAGNOSTICS_PROFILE,
} from "./constants.js";
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

export type Phase510GateResult = {
  passed: boolean;
  failures: Phase59GateFailure[];
  metrics: Phase59GateResult["metrics"] & {
    shortStrongBeatEntryNoteCount: number;
    entrySupportInstabilityCount: number;
    maxEntrySupportInstabilityPerEntry: number;
    maxConsecutiveEntrySupportInstabilities: number;
    unresolvedEntrySupportInstabilityCount: number;
  };
};

export type Phase511GateResult = Phase510GateResult & {
  followUps: Phase59GateFailure[];
};

export type Phase6GateResult = {
  passed: boolean;
  failures: Phase59GateFailure[];
  metrics: Phase511GateResult["metrics"] & {
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

export type Phase7GateResult = {
  passed: boolean;
  failures: Phase59GateFailure[];
  metrics: Phase6GateResult["metrics"] & {
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

export type ManualListeningJudgement = "pass" | "needs-work" | "fail" | "not-reviewed";

export type ReviewGatePolicyClassification = "hard-failure" | "review-required" | "warning" | "manual";

export type ReviewGateFindingSource = "diagnostics" | "legacy-phase-gate" | "diagnostics-warning" | "manual-listening";

export type ClassifiedReviewGateFinding = Phase59GateFailure & {
  policy: ReviewGatePolicyClassification;
  source: ReviewGateFindingSource;
};

export type Phase7BPolicyOptions = {
  manualListeningCategory?: string;
  manualListeningJudgement?: ManualListeningJudgement;
};

export type Phase7BGatePolicyResult = {
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
  metrics: Phase7GateResult["metrics"] & {
    hardFailureCount: number;
    hardConstraintFailureCount: number;
    diagnosticsWarningCount: number;
  };
  legacyPhase7Gate: Phase7GateResult;
};

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

export function evaluatePhase510Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase510GateResult {
  const phase59Gate = evaluatePhase59Diagnostics(seed, diagnostics);
  const metrics = {
    ...phase59Gate.metrics,
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
  const failures = [...phase59Gate.failures];

  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    PHASE_5_10_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    PHASE_5_10_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    PHASE_5_10_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    PHASE_5_10_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "shortStrongBeatEntryNoteCount",
    metrics.shortStrongBeatEntryNoteCount,
    PHASE_5_10_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
  );
  addMaximumFailure(
    failures,
    "entrySupportInstabilityCount",
    metrics.entrySupportInstabilityCount,
    PHASE_5_10_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addPhase510BoundaryFailures(failures, seed, diagnostics);

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase511Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase511GateResult {
  const phase510Gate = evaluatePhase510Diagnostics(seed, diagnostics);
  const failures: Phase59GateFailure[] = [];
  const followUps: Phase59GateFailure[] = [];
  const { metrics } = phase510Gate;

  addMinimumFailure(
    failures,
    "counterSubjectIdentityRetention",
    metrics.counterSubjectIdentityRetention,
    PHASE_5_11_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumFailure(
    failures,
    "rhythmicIndependenceScore",
    metrics.rhythmicIndependenceScore,
    PHASE_5_11_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumFailure(
    failures,
    "unisonOverlapCount",
    metrics.unisonOverlapCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumFailure(
    failures,
    "sameDirectionMotionCount",
    metrics.sameDirectionMotionCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumFailure(
    failures,
    "sharedRhythmOverlapCount",
    metrics.sharedRhythmOverlapCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "shortStrongBeatEntryNoteCount",
    metrics.shortStrongBeatEntryNoteCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxShortStrongBeatEntryNoteCount,
  );
  addMaximumFailure(
    failures,
    "entrySupportInstabilityCount",
    metrics.entrySupportInstabilityCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addMaximumFailure(
    failures,
    "maxEntrySupportInstabilityPerEntry",
    metrics.maxEntrySupportInstabilityPerEntry,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
  );
  addMaximumFailure(
    failures,
    "maxConsecutiveEntrySupportInstabilities",
    metrics.maxConsecutiveEntrySupportInstabilities,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
  );
  addMaximumFailure(
    failures,
    "unresolvedEntrySupportInstabilityCount",
    metrics.unresolvedEntrySupportInstabilityCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
  );
  addMinimumFailure(
    failures,
    "selectedCandidateEvaluationCount",
    metrics.selectedCandidateEvaluationCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.minSelectedCandidateEvaluationCount,
  );
  addPhase511ModalRotationFailures(failures, seed, diagnostics);
  addPhase511FollowUps(followUps, seed, diagnostics, metrics);

  return {
    passed: failures.length === 0,
    failures,
    followUps,
    metrics,
  };
}

export function evaluatePhase6Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase6GateResult {
  const phase511Gate = evaluatePhase511Diagnostics(seed, diagnostics);
  const expositionPlan = diagnostics.sectionPlans.find((plan) => plan.state === "exposition");
  const firstContinuationPlan = diagnostics.sectionPlans.find((plan) => plan.state !== "exposition");
  const metrics = {
    ...phase511Gate.metrics,
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
  const failures = [...phase511Gate.failures];

  addMaximumFailure(
    failures,
    "leapRecoveryMisses",
    metrics.leapRecoveryMisses,
    PHASE_6_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumFailure(
    failures,
    "samePitchOverlapCount",
    metrics.samePitchOverlapCount,
    PHASE_6_DIAGNOSTICS_PROFILE.maxSamePitchOverlapCount,
  );
  addMaximumFailure(
    failures,
    "severeEntryIntervalCount",
    metrics.severeEntryIntervalCount,
    PHASE_6_DIAGNOSTICS_PROFILE.maxSevereEntryIntervalCount,
  );
  addMaximumFailure(
    failures,
    "unresolvedSevereEntryIntervalCount",
    metrics.unresolvedSevereEntryIntervalCount,
    PHASE_6_DIAGNOSTICS_PROFILE.maxUnresolvedSevereEntryIntervalCount,
  );
  addMaximumFailure(
    failures,
    "unsupportedSoloRunCount",
    metrics.unsupportedSoloRunCount,
    PHASE_6_DIAGNOSTICS_PROFILE.maxUnsupportedSoloRunCount,
  );
  addMaximumFailure(
    failures,
    "abruptTextureDropCount",
    metrics.abruptTextureDropCount,
    PHASE_6_DIAGNOSTICS_PROFILE.maxAbruptTextureDropCount,
  );
  addMaximumFailure(
    failures,
    "soloVoiceImbalance",
    metrics.soloVoiceImbalance,
    PHASE_6_DIAGNOSTICS_PROFILE.maxSoloVoiceImbalance,
  );
  addMinimumFailure(
    failures,
    "ornamentPlacementReasonCount",
    metrics.ornamentPlacementReasonCount,
    PHASE_6_DIAGNOSTICS_PROFILE.minOrnamentPlacementReasonCount,
  );
  addMaximumFailure(
    failures,
    "expositionDurationTicks",
    metrics.expositionDurationTicks,
    PHASE_6_DIAGNOSTICS_PROFILE.maxExpositionDurationTicks,
  );
  addMaximumFailure(
    failures,
    "firstContinuationStartTick",
    metrics.firstContinuationStartTick,
    PHASE_6_DIAGNOSTICS_PROFILE.maxFirstContinuationStartTick,
  );

  return {
    passed: failures.length === 0,
    failures,
    metrics,
  };
}

export function evaluatePhase7Diagnostics(seed: string, diagnostics: GenerationDiagnostics): Phase7GateResult {
  const phase6Gate = evaluatePhase6Diagnostics(seed, diagnostics);
  const { fourBeat, eightBeat } = diagnostics.pitchContourMotion;
  const metrics = {
    ...phase6Gate.metrics,
    fourBeatBassUpperSameDirectionRatio: fourBeat.bassUpperSameDirectionRatio,
    fourBeatBassUpperContraryRatio: fourBeat.bassUpperContraryRatio,
    eightBeatBassUpperSameDirectionRatio: eightBeat.bassUpperSameDirectionRatio,
    eightBeatBassUpperContraryRatio: eightBeat.bassUpperContraryRatio,
    fourBeatOuterVoiceSameDirectionRatio: fourBeat.outerVoiceSameDirectionRatio,
    fourBeatOuterVoiceContraryRatio: fourBeat.outerVoiceContraryRatio,
    fourBeatBassUpperComparisonCount: fourBeat.bassUpperComparisonCount,
    eightBeatBassUpperComparisonCount: eightBeat.bassUpperComparisonCount,
  };
  const failures = [...phase6Gate.failures];

  addMaximumFailure(
    failures,
    "fourBeatBassUpperSameDirectionRatio",
    metrics.fourBeatBassUpperSameDirectionRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatBassUpperSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatBassUpperContraryRatio",
    metrics.fourBeatBassUpperContraryRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatBassUpperContraryRatio,
  );
  addMaximumFailure(
    failures,
    "eightBeatBassUpperSameDirectionRatio",
    metrics.eightBeatBassUpperSameDirectionRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.maxEightBeatBassUpperSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "eightBeatBassUpperContraryRatio",
    metrics.eightBeatBassUpperContraryRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.minEightBeatBassUpperContraryRatio,
  );
  addMaximumFailure(
    failures,
    "fourBeatOuterVoiceSameDirectionRatio",
    metrics.fourBeatOuterVoiceSameDirectionRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.maxFourBeatOuterVoiceSameDirectionRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatOuterVoiceContraryRatio",
    metrics.fourBeatOuterVoiceContraryRatio,
    PHASE_7_DIAGNOSTICS_PROFILE.minFourBeatOuterVoiceContraryRatio,
  );
  addMinimumFailure(
    failures,
    "fourBeatBassUpperComparisonCount",
    metrics.fourBeatBassUpperComparisonCount,
    PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount,
  );
  addMinimumFailure(
    failures,
    "eightBeatBassUpperComparisonCount",
    metrics.eightBeatBassUpperComparisonCount,
    PHASE_7_DIAGNOSTICS_PROFILE.minContourComparisonCount,
  );

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

export function evaluatePhase7BGatePolicy(
  seed: string,
  diagnostics: GenerationDiagnostics,
  options: Phase7BPolicyOptions = {},
): Phase7BGatePolicyResult {
  const legacyPhase7Gate = evaluatePhase7Diagnostics(seed, diagnostics);
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

function addPhase510BoundaryFailures(
  failures: Phase59GateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
): void {
  const profile =
    PHASE_5_10_DIAGNOSTICS_PROFILE.boundarySeeds[seed as keyof typeof PHASE_5_10_DIAGNOSTICS_PROFILE.boundarySeeds];

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

function addPhase511ModalRotationFailures(
  failures: Phase59GateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
): void {
  const profile =
    PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds[
      seed as keyof typeof PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds
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

function addPhase511FollowUps(
  followUps: Phase59GateFailure[],
  seed: string,
  diagnostics: GenerationDiagnostics,
  metrics: Phase510GateResult["metrics"],
): void {
  addMinimumMarginFollowUp(
    followUps,
    `${seed}.counterSubjectIdentityRetention`,
    metrics.counterSubjectIdentityRetention,
    PHASE_5_11_DIAGNOSTICS_PROFILE.minCounterSubjectIdentityRetention,
  );
  addMinimumMarginFollowUp(
    followUps,
    `${seed}.rhythmicIndependenceScore`,
    metrics.rhythmicIndependenceScore,
    PHASE_5_11_DIAGNOSTICS_PROFILE.minRhythmicIndependenceScore,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.unisonOverlapCount`,
    metrics.unisonOverlapCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnisonOverlapCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.sameDirectionMotionCount`,
    metrics.sameDirectionMotionCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxSameDirectionMotionCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.sharedRhythmOverlapCount`,
    metrics.sharedRhythmOverlapCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxSharedRhythmOverlapCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.leapRecoveryMisses`,
    metrics.leapRecoveryMisses,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxLeapRecoveryMisses,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.entrySupportInstabilityCount`,
    metrics.entrySupportInstabilityCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityCount,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.maxEntrySupportInstabilityPerEntry`,
    metrics.maxEntrySupportInstabilityPerEntry,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxEntrySupportInstabilityPerEntry,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.maxConsecutiveEntrySupportInstabilities`,
    metrics.maxConsecutiveEntrySupportInstabilities,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxConsecutiveEntrySupportInstabilities,
  );
  addMaximumMarginFollowUp(
    followUps,
    `${seed}.unresolvedEntrySupportInstabilityCount`,
    metrics.unresolvedEntrySupportInstabilityCount,
    PHASE_5_11_DIAGNOSTICS_PROFILE.maxUnresolvedEntrySupportInstabilityCount,
  );

  const modalProfile =
    PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds[
      seed as keyof typeof PHASE_5_11_DIAGNOSTICS_PROFILE.modalRotationSeeds
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

function addMinimumMarginFollowUp(
  followUps: Phase59GateFailure[],
  metric: string,
  actual: number,
  expected: number,
): void {
  if (actual - expected <= PHASE_5_11_DIAGNOSTICS_PROFILE.followUpMargin) {
    followUps.push({ metric, actual, expected: `> ${expected}` });
  }
}

function addMaximumMarginFollowUp(
  followUps: Phase59GateFailure[],
  metric: string,
  actual: number,
  expected: number,
): void {
  if (expected - actual <= PHASE_5_11_DIAGNOSTICS_PROFILE.followUpMargin) {
    followUps.push({ metric, actual, expected: `< ${expected}` });
  }
}

const PHASE_7B_REVIEW_SIGNAL_METRICS = new Set([
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

const PHASE_7B_SCHEMA_SHAPE_METRICS = new Set([
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

function classifyLegacyGateFailure(failure: Phase59GateFailure): ClassifiedReviewGateFinding {
  const metric = metricName(failure.metric);
  if (PHASE_7B_REVIEW_SIGNAL_METRICS.has(metric)) {
    return { ...failure, policy: "review-required", source: "legacy-phase-gate" };
  }
  if (PHASE_7B_SCHEMA_SHAPE_METRICS.has(metric)) {
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
  const blockers = phase59ManualListeningBlockers(category, judgement);
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
