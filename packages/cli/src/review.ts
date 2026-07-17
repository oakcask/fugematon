import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type {
  CandidatePoolOracleSummary,
  FugueState,
  GenerationDiagnostics,
  GenerationOutput,
  NoteEvent,
  PlannedEntry,
  SectionConstraintScoringProfileId,
  SectionConstraintScoringProfileMetadata,
  SelectionModel,
  WritingProfileId,
  WritingProfileMetadata,
} from "@fugematon/core";
import {
  type BaselineBeautyGateResult,
  type ContourMotionGateResult,
  compareDiagnosticsToReferenceProfile,
  DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
  evaluateBaselineBeautyGate,
  evaluateContourMotionGate,
  evaluateMelodyTextureGate,
  evaluateReviewGatePolicy,
  evaluateRotationRobustnessGate,
  evaluateVoiceIndependenceGate,
  GENERATOR_VERSION,
  generateScore,
  type HistoricalReferenceCalibrationSummary,
  type MelodyTextureGateResult,
  manualListeningBlockers,
  REPRESENTATIVE_REVIEW_SEEDS,
  type ReferenceDiagnosticsAggregate,
  type ReferenceDiagnosticsComparison,
  type ReviewGatePolicyResult,
  ROTATION_REVIEW_SEEDS,
  type RotationRobustnessGateResult,
  resolveSectionConstraintScoringProfile,
  resolveWritingProfileMetadata,
  sectionConstraintScoringProfileMetadata,
  summarizeHistoricalReferenceCalibration,
  summarizeReferenceDiagnosticsComparisons,
  TICKS_PER_QUARTER,
  type VoiceIndependenceGateResult,
} from "@fugematon/core";
import {
  ACTIVE_LEARNING_QUEUE_SCHEMA,
  type ActiveLearningQueue,
  createBlindedComparison,
  EVALUATION_FEATURE_SCHEMA_VERSION,
  type EvaluationFeatureVector,
  extractEvaluationFeatures,
  normalizeGeneratedScore,
  PAIRWISE_BUNDLE_SCHEMA,
  PAIRWISE_RESPONSE_SCHEMA,
  type PairwiseBundleManifest,
  type PairwiseHiddenMapping,
  type PairwiseResponseSet,
  validatePairwiseBundle,
} from "@fugematon/evaluation";
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
  writingProfileId?: WritingProfileId,
  constraintProfileId: SectionConstraintScoringProfileId = DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
  seedList?: readonly string[],
): Promise<ReviewSummary> {
  await mkdir(outDirectory, { recursive: true });
  const performanceProfile = performanceProfileMetadata(getPerformanceProfile(performanceProfileId));
  const writingProfile = resolveWritingProfileMetadata(writingProfileId);
  const constraintProfile = sectionConstraintScoringProfileMetadata(
    resolveSectionConstraintScoringProfile(constraintProfileId),
  );
  const summarySeeds: ReviewSummarySeed[] = [];
  const referenceComparisons: ReferenceDiagnosticsComparison[] = [];
  const listeningReview = createListeningReview(lengthTicks, performanceProfile);
  const pairwisePreferences = createPairwisePreferences(lengthTicks, performanceProfile);

  const reviewSeeds =
    seedList === undefined ? [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS] : resolveReviewSeeds(seedList);

  for (const { seed, category } of reviewSeeds) {
    const startedAt = performance.now();
    const output = generateScore({
      seed,
      lengthTicks,
      selectionModel,
      writingProfileId: writingProfile.id,
      constraintProfileId: constraintProfile.id,
    });
    const generationTimeMs = roundRatio(performance.now() - startedAt);
    const safeSeed = seed.replaceAll(/[^a-z0-9-]/gi, "-");
    const diagnosticsFile = `${safeSeed}.diagnostics.json`;
    const midiFile = `${safeSeed}.mid`;
    const scoreFile = `${safeSeed}.score.json`;

    await writeFile(join(outDirectory, diagnosticsFile), `${JSON.stringify(output.diagnostics, null, 2)}\n`, "utf8");
    const midiBytes = exportMidi(output.events, { seed, performanceProfileId: performanceProfile.id });
    const scoreBytes = new TextEncoder().encode(`${JSON.stringify(output.events)}\n`);
    await writeFile(join(outDirectory, midiFile), midiBytes);
    await writeFile(join(outDirectory, scoreFile), scoreBytes);
    const { summarySeed, referenceComparison } = createReviewSummarySeed({
      seed,
      category,
      diagnosticsFile,
      midiFile,
      performanceProfile,
      constraintProfile,
      generationTimeMs,
      output,
      midiSha256: sha256(midiBytes),
      scoreFile,
      scoreSha256: sha256(scoreBytes),
      featureVector: extractEvaluationFeatures(
        normalizeGeneratedScore({ scoreId: opaqueId("score", `${selectionModel}:${seed}`), events: output.events }),
      ),
    });
    referenceComparisons.push(referenceComparison);
    summarySeeds.push(summarySeed);
    listeningReview.seeds.push(createListeningSeedReview(seed, category, diagnosticsFile, midiFile));
  }

  const summary: ReviewSummary = {
    schemaVersion: 21,
    lengthTicks,
    selectionModel,
    performanceProfile,
    writingProfile,
    constraintProfile,
    referenceDiagnostics: summarizeReferenceDiagnosticsComparisons(referenceComparisons),
    historicalReferenceCalibration: summarizeHistoricalReferenceCalibration(),
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

function resolveReviewSeeds(seedList: readonly string[]): { seed: string; category: string }[] {
  const standardSeedCategories = new Map<string, string>(
    [...REPRESENTATIVE_REVIEW_SEEDS, ...ROTATION_REVIEW_SEEDS].map(({ seed, category }) => [seed, category]),
  );

  return seedList.map((seed) => ({ seed, category: standardSeedCategories.get(seed) ?? "targeted" }));
}

export async function writeAbReviewBundle(
  outDirectory: string,
  lengthTicks: number,
  baselineLabel: string,
  variantLabel: string,
  baselineModel: SelectionModel,
  variantModel: SelectionModel,
  performanceProfileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
  writingProfileId?: WritingProfileId,
  constraintProfileId: SectionConstraintScoringProfileId = DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
  seedList?: readonly string[],
): Promise<void> {
  const baselineDirectory = join(outDirectory, "baseline");
  const variantDirectory = join(outDirectory, "variant");
  await mkdir(outDirectory, { recursive: true });

  const baselineSummary = await writeReviewBundle(
    baselineDirectory,
    lengthTicks,
    baselineModel,
    performanceProfileId,
    writingProfileId,
    constraintProfileId,
    seedList,
  );
  const variantSummary = await writeReviewBundle(
    variantDirectory,
    lengthTicks,
    variantModel,
    performanceProfileId,
    writingProfileId,
    constraintProfileId,
    seedList,
  );
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
  await writeBlindAbArtifacts({ outDirectory, baselineSummary, variantSummary });
}

async function writeBlindAbArtifacts({
  outDirectory,
  baselineSummary,
  variantSummary,
}: {
  outDirectory: string;
  baselineSummary: ReviewSummary;
  variantSummary: ReviewSummary;
}): Promise<void> {
  const assetsDirectory = join(outDirectory, "assets");
  await mkdir(assetsDirectory, { recursive: true });
  const bundleId = opaqueId(
    "bundle",
    JSON.stringify({
      seeds: baselineSummary.seeds.map((seed) => seed.seed),
      lengthTicks: baselineSummary.lengthTicks,
      baselineModel: baselineSummary.selectionModel,
      variantModel: variantSummary.selectionModel,
      performanceProfile: baselineSummary.performanceProfile,
    }),
  );
  const comparisons: PairwiseBundleManifest["comparisons"] = [];
  const mappings: PairwiseHiddenMapping["comparisons"] = [];
  const analysis: HiddenComparisonAnalysis[] = [];
  for (const [index, baselineSeed] of baselineSummary.seeds.entries()) {
    const variantSeed = findSummarySeed(variantSummary.seeds, baselineSeed.seed);
    const comparisonId = opaqueId("comparison", `${bundleId}:${index}:${baselineSeed.seed}`);
    const baselineSideId = opaqueId("side", `${comparisonId}:baseline:${baselineSeed.midiSha256}`);
    const variantSideId = opaqueId("side", `${comparisonId}:variant:${variantSeed.midiSha256}`);
    const baselineAsset = `assets/${baselineSideId}.mid`;
    const variantAsset = `assets/${variantSideId}.mid`;
    const baselineScoreAsset = `assets/${baselineSideId}.score.json`;
    const variantScoreAsset = `assets/${variantSideId}.score.json`;
    await writeFile(
      join(outDirectory, baselineAsset),
      await readFile(join(outDirectory, "baseline", baselineSeed.midiFile)),
    );
    await writeFile(
      join(outDirectory, variantAsset),
      await readFile(join(outDirectory, "variant", variantSeed.midiFile)),
    );
    await writeFile(
      join(outDirectory, baselineScoreAsset),
      await readFile(join(outDirectory, "baseline", baselineSeed.scoreFile)),
    );
    await writeFile(
      join(outDirectory, variantScoreAsset),
      await readFile(join(outDirectory, "variant", variantSeed.scoreFile)),
    );
    const blinded = createBlindedComparison({
      id: comparisonId,
      context: {
        seed: baselineSeed.seed,
        seedClass: normalizeSeedClass(baselineSeed.category),
        subjectInputHash: sha256(JSON.stringify(baselineSeed.initialSubjectProfile)),
        subjectFamilyGroup: opaqueId("subject-family", JSON.stringify(baselineSeed.initialSubjectProfile)),
        styleProfile: "hybrid",
        writingProfile: baselineSummary.writingProfile.id,
        constraintProfile: baselineSummary.constraintProfile.id,
        performanceProfile: baselineSummary.performanceProfile.id,
        lengthTicks: baselineSummary.lengthTicks,
        renderSettingsHash: sha256(
          JSON.stringify({
            performanceProfile: baselineSummary.performanceProfile,
            writingProfile: baselineSummary.writingProfile,
            constraintProfile: baselineSummary.constraintProfile,
          }),
        ),
      },
      baseline: {
        id: baselineSideId,
        midiAsset: baselineAsset,
        midiSha256: baselineSeed.midiSha256,
        scoreAsset: baselineScoreAsset,
        scoreSha256: baselineSeed.scoreSha256,
        featureVector: baselineSeed.featureVector,
      },
      variant: {
        id: variantSideId,
        midiAsset: variantAsset,
        midiSha256: variantSeed.midiSha256,
        scoreAsset: variantScoreAsset,
        scoreSha256: variantSeed.scoreSha256,
        featureVector: variantSeed.featureVector,
      },
      orderSalt: bundleId,
    });
    comparisons.push(blinded.comparison);
    mappings.push(blinded.mapping);
    analysis.push({
      comparisonId,
      baseline: hiddenAnalysisSide(baselineSeed),
      variant: hiddenAnalysisSide(variantSeed),
    });
  }
  const bundle: PairwiseBundleManifest = {
    schema: PAIRWISE_BUNDLE_SCHEMA,
    bundleId,
    bundleVersion: "1",
    featureSchemaVersion: EVALUATION_FEATURE_SCHEMA_VERSION,
    modelVersion: opaqueId(
      "model-comparison",
      `${baselineSummary.selectionModel}:${variantSummary.selectionModel}:${bundleId}`,
    ),
    generatorVersion: GENERATOR_VERSION,
    performanceProfileVersion: baselineSummary.performanceProfile.version,
    comparisons,
  };
  const hiddenMapping: PairwiseHiddenMapping & {
    models: { baseline: SelectionModel; variant: SelectionModel };
    analysis: HiddenComparisonAnalysis[];
  } = {
    bundleId,
    comparisons: mappings,
    models: { baseline: baselineSummary.selectionModel, variant: variantSummary.selectionModel },
    analysis,
  };
  const responses: PairwiseResponseSet = {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId,
    responses: [],
  };
  await writeFile(join(outDirectory, "blind-session.json"), `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDirectory, "hidden-side-mapping.json"),
    `${JSON.stringify(hiddenMapping, null, 2)}\n`,
    "utf8",
  );
  await writeFile(join(outDirectory, "pairwise-responses.json"), `${JSON.stringify(responses, null, 2)}\n`, "utf8");
}

export async function writeQueuedAbReviewBundle(input: {
  queueFile: string;
  sourceBundleFile: string;
  hiddenMappingFile: string;
  outDirectory: string;
}): Promise<void> {
  const queue = JSON.parse(await readFile(input.queueFile, "utf8")) as ActiveLearningQueue;
  if (queue.schema !== ACTIVE_LEARNING_QUEUE_SCHEMA || queue.items.length === 0) {
    throw new Error(
      "evaluation.queue.invalid-source: A prioritized review bundle requires a non-empty supported queue. Action: rerun evaluation-loop and choose its next-review-queue.json artifact.",
    );
  }
  const sourceBundle = JSON.parse(await readFile(input.sourceBundleFile, "utf8")) as PairwiseBundleManifest;
  const hidden = JSON.parse(await readFile(input.hiddenMappingFile, "utf8")) as PairwiseHiddenMapping & {
    models?: { baseline?: SelectionModel; variant?: SelectionModel };
  };
  validatePairwiseBundle(sourceBundle, hidden);
  const context = sourceBundle.comparisons[0]?.context;
  const baselineModel = hidden.models?.baseline;
  const variantModel = hidden.models?.variant;
  if (context === undefined || baselineModel === undefined || variantModel === undefined) {
    throw new Error(
      "evaluation.queue.missing-generation-context: The source bundle cannot reproduce both controlled model sides. Action: use the source bundle and hidden mapping created by review-ab.",
    );
  }
  const sourceComparisons = new Map(sourceBundle.comparisons.map((comparison) => [comparison.id, comparison]));
  if (
    queue.items.some((item) => {
      const source = sourceComparisons.get(item.comparisonId);
      return source === undefined || source.context.seed !== item.seed;
    })
  ) {
    throw new Error(
      "evaluation.queue.source-mismatch: Queue items do not belong to the declared immutable source bundle. Action: use the queue emitted for this exact source bundle.",
    );
  }
  getPerformanceProfile(context.performanceProfile as PerformanceProfileId);
  resolveWritingProfileMetadata(context.writingProfile as WritingProfileId);
  resolveSectionConstraintScoringProfile(
    (context.constraintProfile as SectionConstraintScoringProfileId | undefined) ??
      DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
  );
  await writeAbReviewBundle(
    input.outDirectory,
    context.lengthTicks,
    "queued-baseline",
    "queued-variant",
    baselineModel,
    variantModel,
    context.performanceProfile as PerformanceProfileId,
    context.writingProfile as WritingProfileId,
    (context.constraintProfile as SectionConstraintScoringProfileId | undefined) ??
      DEFAULT_SECTION_CONSTRAINT_SCORING_PROFILE_ID,
    queue.items.map((item) => item.seed),
  );
}

type HiddenComparisonAnalysis = {
  comparisonId: string;
  baseline: ReturnType<typeof hiddenAnalysisSide>;
  variant: ReturnType<typeof hiddenAnalysisSide>;
};

function hiddenAnalysisSide(seed: ReviewSummarySeed): {
  diagnosticsSummary: ReviewDiagnosticsSummary;
  referenceComparison: ReferenceDiagnosticsComparison;
  reviewGatePolicy: {
    adoptionReady: boolean;
    hardFailures: ReviewGatePolicyResult["hardFailures"];
    reviewSignals: ReviewGatePolicyResult["reviewSignals"];
  };
} {
  return {
    diagnosticsSummary: seed.diagnosticsSummary,
    referenceComparison: seed.referenceComparison,
    reviewGatePolicy: {
      adoptionReady: seed.reviewGatePolicy.adoptionReady,
      hardFailures: seed.reviewGatePolicy.hardFailures,
      reviewSignals: seed.reviewGatePolicy.reviewSignals,
    },
  };
}

function normalizeSeedClass(category: string): PairwiseBundleManifest["comparisons"][number]["context"]["seedClass"] {
  if (
    category === "fixed" ||
    category === "representative" ||
    category === "boundary" ||
    category === "rotation" ||
    category === "adversarial" ||
    category === "composer-holdout"
  ) {
    return category;
  }
  return "targeted";
}

function opaqueId(prefix: string, value: string): string {
  return `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

type ReviewSummary = {
  schemaVersion: 21;
  lengthTicks: number;
  selectionModel: SelectionModel;
  performanceProfile: PerformanceProfileMetadata;
  writingProfile: WritingProfileMetadata;
  constraintProfile: SectionConstraintScoringProfileMetadata;
  referenceDiagnostics: ReferenceDiagnosticsAggregate;
  historicalReferenceCalibration: HistoricalReferenceCalibrationSummary;
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
  constraintProfile: SectionConstraintScoringProfileMetadata;
  generationTimeMs: number;
  midiSha256: string;
  scoreFile: string;
  scoreSha256: string;
  featureVector: EvaluationFeatureVector;
  initialSubjectProfile: InitialSubjectProfile;
  diagnosticsSummary: ReviewDiagnosticsSummary;
  referenceComparison: ReferenceDiagnosticsComparison;
  baselineBeautyGate: BaselineBeautyGateResult;
  voiceIndependenceGate: VoiceIndependenceGateResult;
  rotationRobustnessGate: RotationRobustnessGateResult;
  melodyTextureGate: MelodyTextureGateResult;
  contourMotionGate: ContourMotionGateResult;
  reviewGatePolicy: ReviewGatePolicyResult;
};

function createReviewSummarySeed({
  seed,
  category,
  diagnosticsFile,
  midiFile,
  performanceProfile,
  constraintProfile,
  generationTimeMs,
  output,
  midiSha256,
  scoreFile,
  scoreSha256,
  featureVector,
}: {
  seed: string;
  category: string;
  diagnosticsFile: string;
  midiFile: string;
  performanceProfile: PerformanceProfileMetadata;
  constraintProfile: SectionConstraintScoringProfileMetadata;
  generationTimeMs: number;
  output: GenerationOutput;
  midiSha256: string;
  scoreFile: string;
  scoreSha256: string;
  featureVector: EvaluationFeatureVector;
}): {
  summarySeed: ReviewSummarySeed;
  referenceComparison: ReferenceDiagnosticsComparison;
} {
  const diagnostics = output.diagnostics;
  const referenceComparison = compareDiagnosticsToReferenceProfile(diagnostics);
  const baselineBeautyGate = evaluateBaselineBeautyGate(seed, diagnostics);
  const voiceIndependenceGate = evaluateVoiceIndependenceGate(seed, diagnostics);
  const rotationRobustnessGate = evaluateRotationRobustnessGate(seed, diagnostics);
  const melodyTextureGate = evaluateMelodyTextureGate(seed, diagnostics);
  const contourMotionGate = evaluateContourMotionGate(seed, diagnostics);
  const reviewGatePolicy = evaluateReviewGatePolicy(seed, diagnostics, {
    manualListeningCategory: category,
    manualListeningJudgement: "not-reviewed",
  });

  return {
    referenceComparison,
    summarySeed: {
      seed,
      category,
      diagnosticsFile,
      midiFile,
      performanceProfile,
      constraintProfile,
      generationTimeMs,
      midiSha256,
      scoreFile,
      scoreSha256,
      featureVector,
      initialSubjectProfile: summarizeInitialSubjectProfile(output),
      diagnosticsSummary: summarizeDiagnostics(diagnostics),
      referenceComparison,
      baselineBeautyGate,
      voiceIndependenceGate,
      rotationRobustnessGate,
      melodyTextureGate,
      contourMotionGate,
      reviewGatePolicy,
    },
  };
}

type AbReviewComparisonSummary = {
  schemaVersion: 6;
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
  constraintProfile: SectionConstraintScoringProfileMetadata;
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
  constraintProfile: SectionConstraintScoringProfileMetadata;
  generationTimeMs: number;
  diagnosticsSummary: ReviewDiagnosticsSummary;
  referenceComparison: ReferenceDiagnosticsComparison;
  candidatePoolOracle: CandidatePoolOracleSummary;
  reviewGatePolicy: {
    adoptionReady: boolean;
    hardFailureCount: number;
    hardFailures: ReviewGatePolicyResult["hardFailures"];
    reviewSignalCount: number;
    reviewSignals: ReviewGatePolicyResult["reviewSignals"];
  };
  qualityVector: GenerationDiagnostics["qualityVector"];
  phraseConvergenceReview: GenerationDiagnostics["phraseConvergenceReview"];
};

type ReviewSeedComparisonDeltas = {
  hardConstraintFailures: number;
  referenceOutsideCount: number;
  candidatePoolViableCandidates: number;
  reviewPolicyHardFailures: number;
  reviewPolicyReviewSignals: number;
  qualityVectorDistance: number;
  localSentinelCount: number;
  phraseConvergenceReviewFindings: number;
  constraintSolverCandidates: number;
  generatorRejectedCandidates: number;
  generationTimeMs: number;
  adoptionReadyChanged: boolean;
};

type ReviewDiagnosticsSummary = {
  hardConstraintFailures: number;
  warningCount: number;
  constraintProfile: SectionConstraintScoringProfileMetadata;
  constraintSatisfaction: {
    solverCandidateCount: number;
    selectedRelaxationLevel: GenerationDiagnostics["constraintSatisfactionReview"]["selectedRelaxationLevel"];
    infeasibleConstraintCounts: GenerationDiagnostics["constraintSatisfactionReview"]["infeasibleConstraintCounts"];
  };
  generatorSearch: {
    evaluatedCandidateCount: number;
    rejectedCandidateCount: number;
  };
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
    entryAdjacentSecondFrictionCount: number;
    unresolvedAccentedEntryClashCount: number;
    leapToSilenceCount: number;
    sustainedSevereVerticalDissonanceCount: number;
    soloTexture: GenerationDiagnostics["soloTexture"];
    pitchContourMotion: GenerationDiagnostics["pitchContourMotion"];
    lowerVoiceVocality: GenerationDiagnostics["lowerVoiceVocality"];
    stepwisePattern: GenerationDiagnostics["stepwisePattern"];
    surfaceBrilliance: GenerationDiagnostics["surfaceBrilliance"];
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
  texturePlanningReview: GenerationDiagnostics["texturePlanningReview"];
  meterConsistencyReview: GenerationDiagnostics["meterConsistencyReview"];
  phraseRepetitionReview: GenerationDiagnostics["phraseRepetitionReview"];
  phraseConvergenceReview: GenerationDiagnostics["phraseConvergenceReview"];
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
  | "longRunInterest"
  | "bassSubjectAnswerBalance"
  | "scoreClashExposure";

type ListeningReview = {
  schemaVersion: 2;
  lengthTicks: number;
  performanceProfile: PerformanceProfileMetadata;
  judgementScale: readonly ["pass", "needs-work", "fail", "not-reviewed"];
  criteria: Record<ListeningCriterion, string>;
  regressionChecks: readonly string[];
  focusedPlaybackNotes: readonly string[];
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
    schemaVersion: 6,
    lengthTicks,
    baseline: {
      label: baselineLabel,
      directory: "baseline",
      summaryFile: "baseline/summary.json",
      selectionModel: baselineSummary.selectionModel,
      performanceProfile: baselineSummary.performanceProfile,
      constraintProfile: baselineSummary.constraintProfile,
    },
    variant: {
      label: variantLabel,
      directory: "variant",
      summaryFile: "variant/summary.json",
      selectionModel: variantSummary.selectionModel,
      performanceProfile: variantSummary.performanceProfile,
      constraintProfile: variantSummary.constraintProfile,
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
    reviewPolicyHardFailures: variant.reviewGatePolicy.hardFailureCount - baseline.reviewGatePolicy.hardFailureCount,
    reviewPolicyReviewSignals: variant.reviewGatePolicy.reviewSignalCount - baseline.reviewGatePolicy.reviewSignalCount,
    qualityVectorDistance: roundRatio(
      qualityVectorDistance(variant.qualityVector) - qualityVectorDistance(baseline.qualityVector),
    ),
    localSentinelCount: variant.qualityVector.localSentinels.length - baseline.qualityVector.localSentinels.length,
    phraseConvergenceReviewFindings:
      variant.phraseConvergenceReview.findings.length - baseline.phraseConvergenceReview.findings.length,
    constraintSolverCandidates:
      variant.diagnosticsSummary.constraintSatisfaction.solverCandidateCount -
      baseline.diagnosticsSummary.constraintSatisfaction.solverCandidateCount,
    generatorRejectedCandidates:
      variant.diagnosticsSummary.generatorSearch.rejectedCandidateCount -
      baseline.diagnosticsSummary.generatorSearch.rejectedCandidateCount,
    generationTimeMs: roundRatio(variant.generationTimeMs - baseline.generationTimeMs),
    adoptionReadyChanged: variant.reviewGatePolicy.adoptionReady !== baseline.reviewGatePolicy.adoptionReady,
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
  const reviewGatePolicy = {
    adoptionReady: seed.reviewGatePolicy.adoptionReady,
    hardFailureCount: seed.reviewGatePolicy.metrics.hardFailureCount,
    hardFailures: seed.reviewGatePolicy.hardFailures,
    reviewSignalCount: seed.reviewGatePolicy.reviewSignals.length,
    reviewSignals: seed.reviewGatePolicy.reviewSignals,
  };

  return {
    constraintProfile: seed.constraintProfile,
    generationTimeMs: seed.generationTimeMs,
    diagnosticsSummary: seed.diagnosticsSummary,
    referenceComparison: seed.referenceComparison,
    candidatePoolOracle: seed.diagnosticsSummary.candidatePoolOracle,
    reviewGatePolicy,
    qualityVector: seed.diagnosticsSummary.qualityVector,
    phraseConvergenceReview: seed.diagnosticsSummary.phraseConvergenceReview,
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
  if (deltas.reviewPolicyHardFailures < 0) {
    improvements.push("review policy hard failures decreased");
  }
  if (!baseline.reviewGatePolicy.adoptionReady && variant.reviewGatePolicy.adoptionReady) {
    improvements.push("operational readiness recovered");
  }
  if (deltas.referenceOutsideCount < 0) {
    improvements.push("reference comparison has fewer outside-profile axes");
  }
  if (deltas.reviewPolicyReviewSignals < 0) {
    improvements.push("review-required signal count decreased");
  }
  if (deltas.candidatePoolViableCandidates > 0) {
    improvements.push("candidate pool has more viable alternatives");
  }
  if (deltas.generatorRejectedCandidates < 0) {
    improvements.push("generator rejected fewer candidates");
  }
  if (deltas.qualityVectorDistance < 0) {
    improvements.push("quality vector distance decreased");
  }
  if (deltas.localSentinelCount < 0) {
    improvements.push("local sentinel count decreased");
  }
  if (deltas.phraseConvergenceReviewFindings < 0) {
    improvements.push("phrase convergence review findings decreased");
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
  if (deltas.reviewPolicyHardFailures > 0) {
    regressions.push("review policy hard failures increased");
  }
  if (baseline.reviewGatePolicy.adoptionReady && !variant.reviewGatePolicy.adoptionReady) {
    regressions.push("operational readiness was lost");
  }
  if (deltas.referenceOutsideCount > 0) {
    regressions.push("reference comparison has more outside-profile axes");
  }
  if (deltas.reviewPolicyReviewSignals > 0) {
    regressions.push("review-required signal count increased");
  }
  if (deltas.candidatePoolViableCandidates < 0) {
    regressions.push("candidate pool has fewer viable alternatives");
  }
  if (deltas.generatorRejectedCandidates > 0) {
    regressions.push("generator rejected more candidates");
  }
  if (deltas.qualityVectorDistance > 0) {
    regressions.push("quality vector distance increased");
  }
  if (deltas.localSentinelCount > 0) {
    regressions.push("local sentinel count increased");
  }
  if (deltas.phraseConvergenceReviewFindings > 0) {
    regressions.push("phrase convergence review findings increased");
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
      roundRatio(note.durationTicks / TICKS_PER_QUARTER),
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
      entryAdjacentSecondFrictionCount:
        diagnostics.constraintSatisfactionReview.infeasibleConstraintCounts.entryAdjacentSecondFrictionCount,
      unresolvedAccentedEntryClashCount: diagnostics.dissonanceTriage.unresolvedAccentedEntryClashCount,
      leapToSilenceCount: diagnostics.constraintSatisfactionReview.infeasibleConstraintCounts.leapToSilenceCount,
      sustainedSevereVerticalDissonanceCount: diagnostics.dissonanceTriage.sustainedSevereVerticalDissonanceCount,
      soloTexture: diagnostics.soloTexture,
      pitchContourMotion: diagnostics.pitchContourMotion,
      lowerVoiceVocality: diagnostics.lowerVoiceVocality,
      stepwisePattern: diagnostics.stepwisePattern,
      surfaceBrilliance: diagnostics.surfaceBrilliance,
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
    constraintProfile: diagnostics.constraintProfile,
    constraintSatisfaction: {
      solverCandidateCount: diagnostics.constraintSatisfactionReview.solverCandidateCount,
      selectedRelaxationLevel: diagnostics.constraintSatisfactionReview.selectedRelaxationLevel,
      infeasibleConstraintCounts: diagnostics.constraintSatisfactionReview.infeasibleConstraintCounts,
    },
    generatorSearch: {
      evaluatedCandidateCount: diagnostics.generatorSearchTrace.evaluatedCandidateCount,
      rejectedCandidateCount: diagnostics.generatorSearchTrace.rejectedCandidateCount,
    },
    texturePlanningReview: diagnostics.texturePlanningReview,
    meterConsistencyReview: diagnostics.meterConsistencyReview,
    phraseRepetitionReview: diagnostics.phraseRepetitionReview,
    phraseConvergenceReview: diagnostics.phraseConvergenceReview,
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

function createListeningReview(lengthTicks: number, performanceProfile: PerformanceProfileMetadata): ListeningReview {
  return {
    schemaVersion: 2,
    lengthTicks,
    performanceProfile,
    judgementScale: ["pass", "needs-work", "fail", "not-reviewed"],
    criteria: {
      subjectMemorability: "The subject remains recognizable after the exposition and returns.",
      counterSubjectRecognition: "The counter-subject keeps a recognizable identity near subject entries.",
      nonEntryVoiceSingability: "Non-entry voices sound like singable lines instead of filler or support tones.",
      episodeMomentum: "Episodes move toward the next local key, cadence, or subject return.",
      strettoTension: "Stretto-like sections increase tension without obscuring the subject contour.",
      longRunInterest: "The seed avoids mechanical repetition or fatigue over the full review length.",
      bassSubjectAnswerBalance:
        "Bass subject and answer attacks speak clearly while sustained bass support avoids persistent alto and tenor masking.",
      scoreClashExposure:
        "Profile rendering still exposes entry clashes, lockstep, unisons, and articulation problems as score-level review signals.",
    },
    regressionChecks: [
      "fugue-smoke exposition entries are staggered instead of all voices entering at once.",
      "fugue-smoke voices remain independent in pitch direction and rhythm.",
      "fugue-smoke uses varied note values rather than a narrow rhythm vocabulary.",
      "fugue-smoke repeated pitches sound intentional or tied rather than mechanical.",
      "fugue-smoke ornaments have audible placement reasons near entries, cadences, or held notes.",
      "fugue-smoke has no unexplained all-voice silence gaps.",
      "fugue-smoke first soprano answer avoids unstable seconds, unsupported fourths, and answer-root conflicts.",
      "Bass subject and answer windows remain audible without long bass sustain persistently masking middle voices.",
      "strict-counterpoint exposes score-level attacks and clashes instead of smoothing them into the envelope.",
    ],
    focusedPlaybackNotes: focusedPlaybackNotes(performanceProfile),
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
      bassSubjectAnswerBalance: "not-reviewed",
      scoreClashExposure: "not-reviewed",
    },
    notes: "",
    blockers: manualListeningBlockers(category, "not-reviewed"),
  };
}

function focusedPlaybackNotes(performanceProfile: PerformanceProfileMetadata): string[] {
  if (performanceProfile.id === "strict-counterpoint") {
    return [
      "Use strict-counterpoint to inspect whether bass subject and answer attacks reveal entry timing, severe intervals, and articulation resets.",
      "Do not mark smoothness as a pass signal here; unresolved clashes and lockstep remain score-level blockers.",
    ];
  }

  return [
    "Use organ-default to inspect whether bass subject and answer attacks speak without sustained bass masking alto and tenor continuity.",
    "Treat any hidden entry-boundary reset, thinning, lockstep, or unison as a score-level blocker rather than a synth pass.",
  ];
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
    bassSubjectAnswerBalance: "not-reviewed",
    scoreClashExposure: "not-reviewed",
  };
}

function createManualListeningGap(): ManualListeningGap {
  return {
    unlistened: true,
    note: "This generated template has not been manually listened to and contains no preference judgement.",
  };
}
