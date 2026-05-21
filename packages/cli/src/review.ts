import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CandidatePoolOracleSummary,
  FugueState,
  GenerationDiagnostics,
  GenerationOutput,
  NoteEvent,
  PlannedEntry,
  SelectionModel,
} from "@fugematon/core";
import {
  compareDiagnosticsToReferenceProfile,
  evaluatePhase6Diagnostics,
  evaluatePhase7BGatePolicy,
  evaluatePhase7Diagnostics,
  evaluatePhase59Diagnostics,
  evaluatePhase510Diagnostics,
  evaluatePhase511Diagnostics,
  generateScore,
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_REVIEW_SEEDS,
  type Phase6GateResult,
  type Phase7BGatePolicyResult,
  type Phase7GateResult,
  type Phase59GateResult,
  type Phase510GateResult,
  type Phase511GateResult,
  phase59ManualListeningBlockers,
  type ReferenceDiagnosticsAggregate,
  type ReferenceDiagnosticsComparison,
  summarizeReferenceDiagnosticsComparisons,
  TICKS_PER_QUARTER,
} from "@fugematon/core";
import { exportMidi } from "@fugematon/midi";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  getPerformanceProfile,
  type PerformanceProfileId,
  type PerformanceProfileMetadata,
  performanceProfileMetadata,
} from "@fugematon/performance";
import {
  type QualityProfileComparison,
  qualityVectorDistance,
  summarizeQualityProfileComparison,
} from "./review-quality-profile.js";
import {
  compareSubjectFamilyDiversity,
  type InitialSubjectProfile,
  type SubjectFamilyDiversitySummary,
  summarizeSubjectFamilyDiversity,
} from "./review-subject-family.js";

export async function writeReviewBundle(
  outDirectory: string,
  lengthTicks: number,
  selectionModel: SelectionModel = "baseline",
  performanceProfileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
): Promise<ReviewSummary> {
  await mkdir(outDirectory, { recursive: true });
  const performanceProfile = performanceProfileMetadata(getPerformanceProfile(performanceProfileId));
  const summarySeeds: ReviewSummarySeed[] = [];
  const referenceComparisons: ReferenceDiagnosticsComparison[] = [];
  const listeningReview = createListeningReview(lengthTicks);
  const pairwisePreferences = createPairwisePreferences(lengthTicks, performanceProfile);

  for (const { seed, category } of [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS]) {
    const output = generateScore({ seed, lengthTicks, selectionModel });
    const safeSeed = seed.replaceAll(/[^a-z0-9-]/gi, "-");
    const diagnosticsFile = `${safeSeed}.diagnostics.json`;
    const midiFile = `${safeSeed}.mid`;

    await writeFile(join(outDirectory, diagnosticsFile), `${JSON.stringify(output.diagnostics, null, 2)}\n`, "utf8");
    await writeFile(
      join(outDirectory, midiFile),
      exportMidi(output.events, { seed, performanceProfileId: performanceProfile.id }),
    );
    const { summarySeed, referenceComparison } = createReviewSummarySeed({
      seed,
      category,
      diagnosticsFile,
      midiFile,
      performanceProfile,
      output,
    });
    referenceComparisons.push(referenceComparison);
    summarySeeds.push(summarySeed);
    listeningReview.seeds.push(createListeningSeedReview(seed, category, diagnosticsFile, midiFile));
  }

  const summary: ReviewSummary = {
    schemaVersion: 14,
    lengthTicks,
    selectionModel,
    performanceProfile,
    referenceDiagnostics: summarizeReferenceDiagnosticsComparisons(referenceComparisons),
    qualityProfileComparison: summarizeQualityProfileComparison(summarySeeds),
    subjectFamilyDiversity: summarizeSubjectFamilyDiversity(summarySeeds),
    seeds: summarySeeds,
  };

  await writeFile(join(outDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(join(outDirectory, "listening-review.json"), `${JSON.stringify(listeningReview, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDirectory, "pairwise-preferences.json"),
    `${JSON.stringify(pairwisePreferences, null, 2)}\n`,
    "utf8",
  );

  return summary;
}

export async function writeAbReviewBundle(
  outDirectory: string,
  lengthTicks: number,
  baselineLabel: string,
  variantLabel: string,
  baselineModel: SelectionModel,
  variantModel: SelectionModel,
  performanceProfileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
): Promise<void> {
  const baselineDirectory = join(outDirectory, "baseline");
  const variantDirectory = join(outDirectory, "variant");
  await mkdir(outDirectory, { recursive: true });

  const baselineSummary = await writeReviewBundle(baselineDirectory, lengthTicks, baselineModel, performanceProfileId);
  const variantSummary = await writeReviewBundle(variantDirectory, lengthTicks, variantModel, performanceProfileId);
  const comparison = compareReviewSummaries({
    lengthTicks,
    baselineLabel,
    variantLabel,
    baselineSummary,
    variantSummary,
  });
  const pairwisePreferences = createAbPairwisePreferences({
    lengthTicks,
    baselineLabel,
    variantLabel,
    baselineSummary,
    variantSummary,
  });

  await writeFile(join(outDirectory, "comparison-summary.json"), `${JSON.stringify(comparison, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDirectory, "pairwise-preferences.json"),
    `${JSON.stringify(pairwisePreferences, null, 2)}\n`,
    "utf8",
  );
}

type ReviewSummary = {
  schemaVersion: 14;
  lengthTicks: number;
  selectionModel: SelectionModel;
  performanceProfile: PerformanceProfileMetadata;
  referenceDiagnostics: ReferenceDiagnosticsAggregate;
  qualityProfileComparison: QualityProfileComparison;
  subjectFamilyDiversity: SubjectFamilyDiversitySummary;
  seeds: ReviewSummarySeed[];
};

type ReviewSummarySeed = {
  seed: string;
  category: string;
  diagnosticsFile: string;
  midiFile: string;
  performanceProfile: PerformanceProfileMetadata;
  initialSubjectProfile: InitialSubjectProfile;
  diagnosticsSummary: ReviewDiagnosticsSummary;
  referenceComparison: ReferenceDiagnosticsComparison;
  phase59Gate: Phase59GateResult;
  phase510Gate: Phase510GateResult;
  phase511Gate: Phase511GateResult;
  phase6Gate: Phase6GateResult;
  phase7Gate: Phase7GateResult;
  phase7BGate: Phase7BGatePolicyResult;
};

function createReviewSummarySeed({
  seed,
  category,
  diagnosticsFile,
  midiFile,
  performanceProfile,
  output,
}: {
  seed: string;
  category: string;
  diagnosticsFile: string;
  midiFile: string;
  performanceProfile: PerformanceProfileMetadata;
  output: GenerationOutput;
}): {
  summarySeed: ReviewSummarySeed;
  referenceComparison: ReferenceDiagnosticsComparison;
} {
  const diagnostics = output.diagnostics;
  const referenceComparison = compareDiagnosticsToReferenceProfile(diagnostics);

  return {
    referenceComparison,
    summarySeed: {
      seed,
      category,
      diagnosticsFile,
      midiFile,
      performanceProfile,
      initialSubjectProfile: summarizeInitialSubjectProfile(output),
      diagnosticsSummary: summarizeDiagnostics(diagnostics),
      referenceComparison,
      phase59Gate: evaluatePhase59Diagnostics(seed, diagnostics),
      phase510Gate: evaluatePhase510Diagnostics(seed, diagnostics),
      phase511Gate: evaluatePhase511Diagnostics(seed, diagnostics),
      phase6Gate: evaluatePhase6Diagnostics(seed, diagnostics),
      phase7Gate: evaluatePhase7Diagnostics(seed, diagnostics),
      phase7BGate: evaluatePhase7BGatePolicy(seed, diagnostics, {
        manualListeningCategory: category,
        manualListeningJudgement: "not-reviewed",
      }),
    },
  };
}

type AbReviewComparisonSummary = {
  schemaVersion: 3;
  lengthTicks: number;
  baseline: ReviewBundleSide;
  variant: ReviewBundleSide;
  subjectFamilyDiversity: ReturnType<typeof compareSubjectFamilyDiversity>;
  seeds: AbReviewSeedComparison[];
};

type ReviewBundleSide = {
  label: string;
  directory: "baseline" | "variant";
  summaryFile: string;
  selectionModel: SelectionModel;
  performanceProfile: PerformanceProfileMetadata;
};

type AbReviewSeedComparison = {
  seed: string;
  category: string;
  baseline: ReviewSeedComparisonSnapshot;
  variant: ReviewSeedComparisonSnapshot;
  deltas: ReviewSeedComparisonDeltas;
  improvements: string[];
  regressions: string[];
  tradeoffs: string[];
  manualListeningGap: {
    baselineJudgement: "not-reviewed";
    variantJudgement: "not-reviewed";
    unlistened: true;
    note: string;
  };
};

type ReviewSeedComparisonSnapshot = {
  diagnosticsSummary: ReviewDiagnosticsSummary;
  referenceComparison: ReferenceDiagnosticsComparison;
  candidatePoolOracle: CandidatePoolOracleSummary;
  phase7BGate: {
    phase8Ready: boolean;
    hardFailureCount: number;
    hardFailures: Phase7BGatePolicyResult["hardFailures"];
    reviewSignalCount: number;
    reviewSignals: Phase7BGatePolicyResult["reviewSignals"];
  };
  qualityVector: GenerationDiagnostics["qualityVector"];
  phase13RReview: GenerationDiagnostics["phase13RReview"];
};

type ReviewSeedComparisonDeltas = {
  hardConstraintFailures: number;
  referenceOutsideCount: number;
  candidatePoolViableCandidates: number;
  phase7BHardFailures: number;
  phase7BReviewSignals: number;
  qualityVectorDistance: number;
  localSentinelCount: number;
  phase13RReviewFindings: number;
  phase8ReadyChanged: boolean;
};

type ReviewDiagnosticsSummary = {
  hardConstraintFailures: number;
  warningCount: number;
  texture: {
    counterSubjectIdentityRetention: number;
    rhythmicIndependenceScore: number;
    samePitchOverlapCount: number;
    unisonOverlapCount: number;
    sameDirectionMotionCount: number;
    sharedRhythmOverlapCount: number;
    shortStrongBeatEntryNoteCount: number;
    entrySupportInstabilityCount: number;
    maxEntrySupportInstabilityPerEntry: number;
    maxConsecutiveEntrySupportInstabilities: number;
    unresolvedEntrySupportInstabilityCount: number;
    severeEntryIntervalCount: number;
    unresolvedSevereEntryIntervalCount: number;
    soloTexture: GenerationDiagnostics["soloTexture"];
    pitchContourMotion: GenerationDiagnostics["pitchContourMotion"];
    lowerVoiceVocality: GenerationDiagnostics["lowerVoiceVocality"];
    stepwisePattern: GenerationDiagnostics["stepwisePattern"];
  };
  melody: {
    leapRecoveryMisses: number;
    repeatedPitchRunCount: number;
  };
  form: {
    sectionCount: number;
    stateTransitions: GenerationDiagnostics["stateTransitions"];
    allVoiceSilenceGapCount: number;
    longRunRepetition: {
      continuationPatternWindowSize: number;
      mostRepeatedContinuationPattern: FugueState[];
      mostRepeatedContinuationPatternCount: number;
      uniqueContinuationPatternCount: number;
    };
  };
  ornament: {
    ornamentCandidateCount: number;
    ornamentDensity: number;
    placementReasons: GenerationDiagnostics["ornamentPlacementReasons"];
  };
  candidateEvaluation: {
    featureVersion: number;
    evaluationModelVersion: number;
    selectedCandidateEvaluationCount: number;
    entryExplanationCount: number;
    voicePairExplanationCount: number;
    voiceExplanationCount: number;
    sectionExplanationCount: number;
    maxEntryInstabilityCount: number;
    maxEntrySevereIntervalCount: number;
    maxVoicePairUnisonOverlapCount: number;
    maxVoicePairSharedRhythmOverlapCount: number;
    maxSectionSoloTextureRisk: number;
    totalSectionExplanationCount: number;
    maxSelectedSectionSoloTextureRisk: number;
    averageSelectedSectionSoloTextureRisk: number;
    highSelectedSectionSoloTextureRiskCount: number;
    sectionSoloTextureRiskWarningThreshold: number;
  };
  candidatePoolOracle: CandidatePoolOracleSummary;
  phase11Review: GenerationDiagnostics["phase11Review"];
  phase12Review: GenerationDiagnostics["phase12Review"];
  phase13RReview: GenerationDiagnostics["phase13RReview"];
  qualityVector: GenerationDiagnostics["qualityVector"];
};

const LONG_RUN_FORM_PATTERN_WINDOW_SIZE = 4;
const SECTION_SOLO_TEXTURE_RISK_WARNING_THRESHOLD = 6;

type ListeningCriterion =
  | "subjectMemorability"
  | "counterSubjectRecognition"
  | "nonEntryVoiceSingability"
  | "episodeMomentum"
  | "strettoTension"
  | "longRunInterest";

type ListeningReview = {
  schemaVersion: 1;
  lengthTicks: number;
  judgementScale: readonly ["pass", "needs-work", "fail", "not-reviewed"];
  criteria: Record<ListeningCriterion, string>;
  regressionChecks: readonly string[];
  seeds: ListeningSeedReview[];
};

type ListeningSeedReview = {
  seed: string;
  category: string;
  diagnosticsFile: string;
  midiFile: string;
  judgement: "not-reviewed";
  criteria: Record<ListeningCriterion, "not-reviewed">;
  notes: string;
  blockers: string[];
};

type PairwisePreferences = {
  schemaVersion: 2;
  lengthTicks: number;
  performanceProfile: PerformanceProfileMetadata;
  instructions: string;
  manualListeningStatus: "not-reviewed";
  manualListeningGap: ManualListeningGap;
  comparisons: PairwisePreferenceComparison[];
};

type PairwisePreferenceComparison = {
  seed: string;
  category: string;
  baseline: PairwisePreferenceSide;
  variant: PairwisePreferenceSide;
  preferredSide: "baseline" | "variant" | "tie" | "inconclusive" | "not-reviewed";
  criteria: Record<ListeningCriterion, "not-reviewed">;
  reason: string;
  manualListeningStatus: "not-reviewed";
  manualListeningGap: ManualListeningGap;
};

type PairwisePreferenceSide = {
  label: string;
  selectionModel: SelectionModel;
  diagnosticsFile: string;
  midiFile: string;
};

type ManualListeningGap = {
  unlistened: true;
  note: string;
};

function compareReviewSummaries({
  lengthTicks,
  baselineLabel,
  variantLabel,
  baselineSummary,
  variantSummary,
}: {
  lengthTicks: number;
  baselineLabel: string;
  variantLabel: string;
  baselineSummary: ReviewSummary;
  variantSummary: ReviewSummary;
}): AbReviewComparisonSummary {
  return {
    schemaVersion: 3,
    lengthTicks,
    baseline: {
      label: baselineLabel,
      directory: "baseline",
      summaryFile: "baseline/summary.json",
      selectionModel: baselineSummary.selectionModel,
      performanceProfile: baselineSummary.performanceProfile,
    },
    variant: {
      label: variantLabel,
      directory: "variant",
      summaryFile: "variant/summary.json",
      selectionModel: variantSummary.selectionModel,
      performanceProfile: variantSummary.performanceProfile,
    },
    subjectFamilyDiversity: compareSubjectFamilyDiversity(
      baselineSummary.subjectFamilyDiversity,
      variantSummary.subjectFamilyDiversity,
    ),
    seeds: baselineSummary.seeds.map((baselineSeed) => {
      const variantSeed = findSummarySeed(variantSummary.seeds, baselineSeed.seed);
      return compareReviewSeed(baselineSeed, variantSeed);
    }),
  };
}

function compareReviewSeed(baselineSeed: ReviewSummarySeed, variantSeed: ReviewSummarySeed): AbReviewSeedComparison {
  const baseline = createReviewSeedSnapshot(baselineSeed);
  const variant = createReviewSeedSnapshot(variantSeed);
  const deltas: ReviewSeedComparisonDeltas = {
    hardConstraintFailures:
      variant.diagnosticsSummary.hardConstraintFailures - baseline.diagnosticsSummary.hardConstraintFailures,
    referenceOutsideCount:
      variant.referenceComparison.outsideReferenceCount - baseline.referenceComparison.outsideReferenceCount,
    candidatePoolViableCandidates:
      variant.candidatePoolOracle.viableCandidateCount - baseline.candidatePoolOracle.viableCandidateCount,
    phase7BHardFailures: variant.phase7BGate.hardFailureCount - baseline.phase7BGate.hardFailureCount,
    phase7BReviewSignals: variant.phase7BGate.reviewSignalCount - baseline.phase7BGate.reviewSignalCount,
    qualityVectorDistance: roundRatio(
      qualityVectorDistance(variant.qualityVector) - qualityVectorDistance(baseline.qualityVector),
    ),
    localSentinelCount: variant.qualityVector.localSentinels.length - baseline.qualityVector.localSentinels.length,
    phase13RReviewFindings: variant.phase13RReview.findings.length - baseline.phase13RReview.findings.length,
    phase8ReadyChanged: variant.phase7BGate.phase8Ready !== baseline.phase7BGate.phase8Ready,
  };

  return {
    seed: baselineSeed.seed,
    category: baselineSeed.category,
    baseline,
    variant,
    deltas,
    improvements: describeImprovements(baseline, variant, deltas),
    regressions: describeRegressions(baseline, variant, deltas),
    tradeoffs: describeTradeoffs(baseline, variant, deltas),
    manualListeningGap: {
      baselineJudgement: "not-reviewed",
      variantJudgement: "not-reviewed",
      unlistened: true,
      note: "Automatic diagnostics do not replace manual listening or pairwise preference for model adoption.",
    },
  };
}

function createReviewSeedSnapshot(seed: ReviewSummarySeed): ReviewSeedComparisonSnapshot {
  return {
    diagnosticsSummary: seed.diagnosticsSummary,
    referenceComparison: seed.referenceComparison,
    candidatePoolOracle: seed.diagnosticsSummary.candidatePoolOracle,
    phase7BGate: {
      phase8Ready: seed.phase7BGate.phase8Ready,
      hardFailureCount: seed.phase7BGate.metrics.hardFailureCount,
      hardFailures: seed.phase7BGate.hardFailures,
      reviewSignalCount: seed.phase7BGate.reviewSignals.length,
      reviewSignals: seed.phase7BGate.reviewSignals,
    },
    qualityVector: seed.diagnosticsSummary.qualityVector,
    phase13RReview: seed.diagnosticsSummary.phase13RReview,
  };
}

function describeImprovements(
  baseline: ReviewSeedComparisonSnapshot,
  variant: ReviewSeedComparisonSnapshot,
  deltas: ReviewSeedComparisonDeltas,
): string[] {
  const improvements: string[] = [];
  if (deltas.hardConstraintFailures < 0) {
    improvements.push("hard constraint failures decreased");
  }
  if (deltas.phase7BHardFailures < 0) {
    improvements.push("Phase 7B hard failures decreased");
  }
  if (!baseline.phase7BGate.phase8Ready && variant.phase7BGate.phase8Ready) {
    improvements.push("Phase 8 readiness recovered");
  }
  if (deltas.referenceOutsideCount < 0) {
    improvements.push("reference comparison has fewer outside-profile axes");
  }
  if (deltas.phase7BReviewSignals < 0) {
    improvements.push("review-required signal count decreased");
  }
  if (deltas.candidatePoolViableCandidates > 0) {
    improvements.push("candidate pool has more viable alternatives");
  }
  if (deltas.qualityVectorDistance < 0) {
    improvements.push("quality vector distance decreased");
  }
  if (deltas.localSentinelCount < 0) {
    improvements.push("local sentinel count decreased");
  }
  if (deltas.phase13RReviewFindings < 0) {
    improvements.push("Phase 13R convergence review findings decreased");
  }

  return improvements;
}

function describeRegressions(
  baseline: ReviewSeedComparisonSnapshot,
  variant: ReviewSeedComparisonSnapshot,
  deltas: ReviewSeedComparisonDeltas,
): string[] {
  const regressions: string[] = [];
  if (deltas.hardConstraintFailures > 0) {
    regressions.push("hard constraint failures increased");
  }
  if (deltas.phase7BHardFailures > 0) {
    regressions.push("Phase 7B hard failures increased");
  }
  if (baseline.phase7BGate.phase8Ready && !variant.phase7BGate.phase8Ready) {
    regressions.push("Phase 8 readiness was lost");
  }
  if (deltas.referenceOutsideCount > 0) {
    regressions.push("reference comparison has more outside-profile axes");
  }
  if (deltas.phase7BReviewSignals > 0) {
    regressions.push("review-required signal count increased");
  }
  if (deltas.candidatePoolViableCandidates < 0) {
    regressions.push("candidate pool has fewer viable alternatives");
  }
  if (deltas.qualityVectorDistance > 0) {
    regressions.push("quality vector distance increased");
  }
  if (deltas.localSentinelCount > 0) {
    regressions.push("local sentinel count increased");
  }
  if (deltas.phase13RReviewFindings > 0) {
    regressions.push("Phase 13R convergence review findings increased");
  }

  return regressions;
}

function describeTradeoffs(
  baseline: ReviewSeedComparisonSnapshot,
  variant: ReviewSeedComparisonSnapshot,
  deltas: ReviewSeedComparisonDeltas,
): string[] {
  const hasImprovement = describeImprovements(baseline, variant, deltas).length > 0;
  const hasRegression = describeRegressions(baseline, variant, deltas).length > 0;
  if (hasImprovement && hasRegression) {
    return ["automatic diagnostics show both improvements and regressions; review the seed before adoption"];
  }
  if (!hasImprovement && !hasRegression) {
    return ["no automatic diagnostic difference; manual listening remains the adoption gap"];
  }

  return [];
}

function findSummarySeed(seeds: readonly ReviewSummarySeed[], seed: string): ReviewSummarySeed {
  const entry = seeds.find((candidate) => candidate.seed === seed);
  if (entry === undefined) {
    throw new Error(`variant review summary is missing seed: ${seed}`);
  }

  return entry;
}

function summarizeInitialSubjectProfile(output: GenerationOutput): InitialSubjectProfile {
  const initialSubject = output.diagnostics.subjectEntries.find((entry) => entry.form === "subject");
  if (initialSubject === undefined) {
    return {
      degreePattern: [],
      rhythmPattern: [],
      contourClass: "none",
      localClimaxIndex: -1,
      tailMotion: "repeated",
      mode: "major",
      answerCompatibility: "none",
    };
  }

  const answer = output.diagnostics.subjectEntries.find((entry) => entry.form === "answer");

  return {
    degreePattern: [...initialSubject.expectedDegreePattern],
    rhythmPattern: initialSubjectNotes(output, initialSubject).map((note) =>
      Math.round(note.durationTicks / TICKS_PER_QUARTER),
    ),
    contourClass: contourClass(initialSubject.expectedDegreePattern),
    localClimaxIndex: localClimaxIndex(initialSubject.expectedDegreePattern),
    tailMotion: tailMotion(initialSubject.expectedDegreePattern),
    mode: initialSubject.localKey.mode,
    answerCompatibility:
      answer?.answerKind === "true" ? "true-answer" : answer?.answerKind === "tonal" ? "tonal-answer" : "none",
  };
}

function initialSubjectNotes(output: GenerationOutput, initialSubject: PlannedEntry): NoteEvent[] {
  return output.events
    .filter(
      (event): event is NoteEvent =>
        event.kind === "note" &&
        event.role === "subject" &&
        event.voice === initialSubject.voice &&
        event.startTick >= initialSubject.startTick,
    )
    .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch)
    .slice(0, initialSubject.expectedDegreePattern.length);
}

function contourClass(pattern: readonly number[]): string {
  return pattern
    .slice(1)
    .map((degree, index) => {
      const previous = pattern[index]!;
      if (degree > previous) {
        return "u";
      }
      if (degree < previous) {
        return "d";
      }
      return "r";
    })
    .join("");
}

function localClimaxIndex(pattern: readonly number[]): number {
  let index = 0;
  let value = pattern[0] ?? 0;
  for (let candidateIndex = 1; candidateIndex < pattern.length; candidateIndex += 1) {
    const candidate = pattern[candidateIndex]!;
    if (candidate > value) {
      index = candidateIndex;
      value = candidate;
    }
  }

  return index;
}

function tailMotion(pattern: readonly number[]): InitialSubjectProfile["tailMotion"] {
  const previous = pattern.at(-2);
  const final = pattern.at(-1);
  if (previous === undefined || final === undefined || final === previous) {
    return "repeated";
  }

  return final > previous ? "ascending" : "descending";
}

function summarizeDiagnostics(diagnostics: GenerationDiagnostics): ReviewDiagnosticsSummary {
  return {
    hardConstraintFailures:
      diagnostics.rangeViolations +
      diagnostics.voiceCrossings +
      diagnostics.subjectIdentityViolations +
      diagnostics.answerPlanViolations +
      diagnostics.keyMetadataMismatches +
      diagnostics.unresolvedDissonanceCount +
      diagnostics.allVoiceSilenceGapCount,
    warningCount: diagnostics.warnings.length,
    texture: {
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
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
      severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
      unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
      soloTexture: diagnostics.soloTexture,
      pitchContourMotion: diagnostics.pitchContourMotion,
      lowerVoiceVocality: diagnostics.lowerVoiceVocality,
      stepwisePattern: diagnostics.stepwisePattern,
    },
    melody: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      repeatedPitchRunCount: diagnostics.repeatedPitchRunCount,
    },
    form: {
      sectionCount: diagnostics.sectionPlans.length,
      stateTransitions: diagnostics.stateTransitions,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
      longRunRepetition: summarizeLongRunRepetition(diagnostics.stateTransitions),
    },
    ornament: {
      ornamentCandidateCount: diagnostics.ornamentCandidateCount,
      ornamentDensity: diagnostics.ornamentDensity,
      placementReasons: diagnostics.ornamentPlacementReasons,
    },
    candidateEvaluation: summarizeCandidateEvaluation(diagnostics),
    candidatePoolOracle: diagnostics.candidatePoolOracle,
    phase11Review: diagnostics.phase11Review,
    phase12Review: diagnostics.phase12Review,
    phase13RReview: diagnostics.phase13RReview,
    qualityVector: diagnostics.qualityVector,
  };
}

function summarizeCandidateEvaluation(
  diagnostics: GenerationDiagnostics,
): ReviewDiagnosticsSummary["candidateEvaluation"] {
  const selected = diagnostics.selectedCandidateEvaluations[0];
  if (selected === undefined) {
    return {
      featureVersion: 0,
      evaluationModelVersion: 0,
      selectedCandidateEvaluationCount: 0,
      entryExplanationCount: 0,
      voicePairExplanationCount: 0,
      voiceExplanationCount: 0,
      sectionExplanationCount: 0,
      maxEntryInstabilityCount: 0,
      maxEntrySevereIntervalCount: 0,
      maxVoicePairUnisonOverlapCount: 0,
      maxVoicePairSharedRhythmOverlapCount: 0,
      maxSectionSoloTextureRisk: 0,
      totalSectionExplanationCount: 0,
      maxSelectedSectionSoloTextureRisk: 0,
      averageSelectedSectionSoloTextureRisk: 0,
      highSelectedSectionSoloTextureRiskCount: 0,
      sectionSoloTextureRiskWarningThreshold: SECTION_SOLO_TEXTURE_RISK_WARNING_THRESHOLD,
    };
  }
  const selectedSections = diagnostics.selectedCandidateEvaluations.flatMap(
    (evaluation) => evaluation.explanations.sections,
  );

  return {
    featureVersion: selected.featureVersion,
    evaluationModelVersion: selected.evaluationModelVersion,
    selectedCandidateEvaluationCount: diagnostics.selectedCandidateEvaluations.length,
    entryExplanationCount: selected.explanations.entries.length,
    voicePairExplanationCount: selected.explanations.voicePairs.length,
    voiceExplanationCount: selected.explanations.voices.length,
    sectionExplanationCount: selected.explanations.sections.length,
    maxEntryInstabilityCount: maximum(selected.explanations.entries.map((entry) => entry.instabilityCount)),
    maxEntrySevereIntervalCount: maximum(selected.explanations.entries.map((entry) => entry.severeIntervalCount)),
    maxVoicePairUnisonOverlapCount: maximum(
      selected.explanations.voicePairs.map((voicePair) => voicePair.unisonOverlapCount),
    ),
    maxVoicePairSharedRhythmOverlapCount: maximum(
      selected.explanations.voicePairs.map((voicePair) => voicePair.sharedRhythmOverlapCount),
    ),
    maxSectionSoloTextureRisk: maximum(selected.explanations.sections.map((section) => section.soloTextureRisk)),
    totalSectionExplanationCount: selectedSections.length,
    maxSelectedSectionSoloTextureRisk: maximum(selectedSections.map((section) => section.soloTextureRisk)),
    averageSelectedSectionSoloTextureRisk: roundRatio(
      average(selectedSections.map((section) => section.soloTextureRisk)),
    ),
    highSelectedSectionSoloTextureRiskCount: selectedSections.filter(
      (section) => section.soloTextureRisk >= SECTION_SOLO_TEXTURE_RISK_WARNING_THRESHOLD,
    ).length,
    sectionSoloTextureRiskWarningThreshold: SECTION_SOLO_TEXTURE_RISK_WARNING_THRESHOLD,
  };
}

function summarizeLongRunRepetition(
  stateTransitions: readonly FugueState[],
): ReviewDiagnosticsSummary["form"]["longRunRepetition"] {
  const continuationStates = stateTransitions.filter((state) => state !== "exposition");
  const patternCounts = new Map<string, { pattern: FugueState[]; count: number }>();

  for (let index = 0; index <= continuationStates.length - LONG_RUN_FORM_PATTERN_WINDOW_SIZE; index += 1) {
    const pattern = continuationStates.slice(index, index + LONG_RUN_FORM_PATTERN_WINDOW_SIZE);
    const key = pattern.join("|");
    const current = patternCounts.get(key);
    patternCounts.set(key, { pattern, count: (current?.count ?? 0) + 1 });
  }

  const mostRepeated = [...patternCounts.values()].reduce<{ pattern: FugueState[]; count: number }>(
    (best, current) => (current.count > best.count ? current : best),
    { pattern: [], count: 0 },
  );

  return {
    continuationPatternWindowSize: LONG_RUN_FORM_PATTERN_WINDOW_SIZE,
    mostRepeatedContinuationPattern: mostRepeated.pattern,
    mostRepeatedContinuationPatternCount: mostRepeated.count,
    uniqueContinuationPatternCount: patternCounts.size,
  };
}

function maximum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function createListeningReview(lengthTicks: number): ListeningReview {
  return {
    schemaVersion: 1,
    lengthTicks,
    judgementScale: ["pass", "needs-work", "fail", "not-reviewed"],
    criteria: {
      subjectMemorability: "The subject remains recognizable after the exposition and returns.",
      counterSubjectRecognition: "The counter-subject keeps a recognizable identity near subject entries.",
      nonEntryVoiceSingability: "Non-entry voices sound like singable lines instead of filler or support tones.",
      episodeMomentum: "Episodes move toward the next local key, cadence, or subject return.",
      strettoTension: "Stretto-like sections increase tension without obscuring the subject contour.",
      longRunInterest: "The seed avoids mechanical repetition or fatigue over the full review length.",
    },
    regressionChecks: [
      "fugue-smoke exposition entries are staggered instead of all voices entering at once.",
      "fugue-smoke voices remain independent in pitch direction and rhythm.",
      "fugue-smoke uses varied note values rather than a narrow rhythm vocabulary.",
      "fugue-smoke repeated pitches sound intentional or tied rather than mechanical.",
      "fugue-smoke ornaments have audible placement reasons near entries, cadences, or held notes.",
      "fugue-smoke has no unexplained all-voice silence gaps.",
      "fugue-smoke first soprano answer avoids unstable seconds, unsupported fourths, and answer-root conflicts.",
    ],
    seeds: [],
  };
}

function createListeningSeedReview(
  seed: string,
  category: string,
  diagnosticsFile: string,
  midiFile: string,
): ListeningSeedReview {
  return {
    seed,
    category,
    diagnosticsFile,
    midiFile,
    judgement: "not-reviewed",
    criteria: {
      subjectMemorability: "not-reviewed",
      counterSubjectRecognition: "not-reviewed",
      nonEntryVoiceSingability: "not-reviewed",
      episodeMomentum: "not-reviewed",
      strettoTension: "not-reviewed",
      longRunInterest: "not-reviewed",
    },
    notes: "",
    blockers: phase59ManualListeningBlockers(category, "not-reviewed"),
  };
}

function createPairwisePreferences(
  lengthTicks: number,
  performanceProfile: PerformanceProfileMetadata,
  comparisons: PairwisePreferenceComparison[] = [],
): PairwisePreferences {
  return {
    schemaVersion: 2,
    lengthTicks,
    performanceProfile,
    instructions:
      "Fill preferredSide only after manual pairwise listening. These records are candidates for future aesthetic scoring weights and do not override hard constraints.",
    manualListeningStatus: "not-reviewed",
    manualListeningGap: createManualListeningGap(),
    comparisons,
  };
}

function createAbPairwisePreferences({
  lengthTicks,
  baselineLabel,
  variantLabel,
  baselineSummary,
  variantSummary,
}: {
  lengthTicks: number;
  baselineLabel: string;
  variantLabel: string;
  baselineSummary: ReviewSummary;
  variantSummary: ReviewSummary;
}): PairwisePreferences {
  return createPairwisePreferences(
    lengthTicks,
    baselineSummary.performanceProfile,
    baselineSummary.seeds.map((baselineSeed) => {
      const variantSeed = findSummarySeed(variantSummary.seeds, baselineSeed.seed);
      return createPairwisePreferenceComparison({
        baselineSeed,
        variantSeed,
        baselineLabel,
        variantLabel,
        baselineSelectionModel: baselineSummary.selectionModel,
        variantSelectionModel: variantSummary.selectionModel,
      });
    }),
  );
}

function createPairwisePreferenceComparison({
  baselineSeed,
  variantSeed,
  baselineLabel,
  variantLabel,
  baselineSelectionModel,
  variantSelectionModel,
}: {
  baselineSeed: ReviewSummarySeed;
  variantSeed: ReviewSummarySeed;
  baselineLabel: string;
  variantLabel: string;
  baselineSelectionModel: SelectionModel;
  variantSelectionModel: SelectionModel;
}): PairwisePreferenceComparison {
  return {
    seed: baselineSeed.seed,
    category: baselineSeed.category,
    baseline: {
      label: baselineLabel,
      selectionModel: baselineSelectionModel,
      diagnosticsFile: `baseline/${baselineSeed.diagnosticsFile}`,
      midiFile: `baseline/${baselineSeed.midiFile}`,
    },
    variant: {
      label: variantLabel,
      selectionModel: variantSelectionModel,
      diagnosticsFile: `variant/${variantSeed.diagnosticsFile}`,
      midiFile: `variant/${variantSeed.midiFile}`,
    },
    preferredSide: "not-reviewed",
    criteria: createUnreviewedListeningCriteria(),
    reason: "",
    manualListeningStatus: "not-reviewed",
    manualListeningGap: createManualListeningGap(),
  };
}

function createUnreviewedListeningCriteria(): Record<ListeningCriterion, "not-reviewed"> {
  return {
    subjectMemorability: "not-reviewed",
    counterSubjectRecognition: "not-reviewed",
    nonEntryVoiceSingability: "not-reviewed",
    episodeMomentum: "not-reviewed",
    strettoTension: "not-reviewed",
    longRunInterest: "not-reviewed",
  };
}

function createManualListeningGap(): ManualListeningGap {
  return {
    unlistened: true,
    note: "This generated template has not been manually listened to and contains no preference judgement.",
  };
}
