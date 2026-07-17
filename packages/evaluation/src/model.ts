import { EVALUATION_FEATURE_SCHEMA_VERSION, EvaluationContractError, type FeatureEvidencePointer } from "./types.js";

export const PAIRWISE_MODEL_SCHEMA = "fugematon-pairwise-model/v1" as const;
export const PAIRWISE_TRAINING_ALGORITHM = "bounded-logistic-gradient/v1" as const;

export type PairwiseTrainingRow = {
  comparisonId: string;
  split: "train" | "validation" | "work-holdout" | "composer-holdout";
  workGroup: string;
  composerGroup: string;
  subjectFamilyGroup: string;
  styleProfile: string;
  featureDelta: Record<string, number>;
  evidence: Record<string, FeatureEvidencePointer[]>;
  label: "a" | "b" | "tie";
  labelSetHash: string;
};

export type PairwiseModelArtifact = {
  schema: typeof PAIRWISE_MODEL_SCHEMA;
  modelVersion: string;
  featureSchemaVersion: typeof EVALUATION_FEATURE_SCHEMA_VERSION;
  trainingAlgorithmVersion: typeof PAIRWISE_TRAINING_ALGORITHM;
  regularization: number;
  seed: number;
  iterations: number;
  convergenceStatus: "fixed-iterations";
  includedLabelSetHashes: string[];
  corpusManifestVersion: string;
  splitDefinition: "work-composer-subject-family-isolated";
  featureWeights: Record<string, number>;
  styleIntercepts: Record<string, number>;
  normalizationStats: Record<string, { mean: number; scale: number }>;
  unsupportedFeatures: string[];
  droppedFeatures: string[];
  validation: {
    logLoss: number | null;
    pairwiseAccuracy: number | null;
    tieHandling: "excluded-from-gradient-and-reported";
    calibrationBins: { lower: number; upper: number; count: number; observedAWinRate: number | null }[];
    perStyleCoverage: Record<string, number>;
  };
  hardConstraintOverride: "prohibited";
  intendedMode: "shadow" | "selection-candidate";
  trainingDataKind: "synthetic-or-agent" | "human-preference";
  theoryReview: {
    status: "clear" | "review-required";
    conflicts: { featureId: string; expectedSign: "positive" | "negative"; learnedWeight: number }[];
  };
};

export type PairwiseTrainingResult =
  | { status: "trained"; artifact: PairwiseModelArtifact }
  | { status: "no-model"; reason: "empty-labels" | "all-tie" | "single-class" };

export type PairwisePrediction = {
  probabilityA: number;
  predictedSide: "a" | "b";
  margin: number;
  uncertainty: number;
  contributions: {
    featureId: string;
    delta: number;
    weight: number;
    contribution: number;
    evidence: FeatureEvidencePointer[];
  }[];
  hardFailures: string[];
  adoptionEligible: boolean;
};

export function trainPairwiseModel(input: {
  rows: readonly PairwiseTrainingRow[];
  corpusManifestVersion: string;
  modelVersion: string;
  seed: number;
  regularization?: number;
  iterations?: number;
  weightBound?: number;
  trainingDataKind?: PairwiseModelArtifact["trainingDataKind"];
}): PairwiseTrainingResult {
  validateRows(input.rows);
  if (
    !Number.isSafeInteger(input.seed) ||
    (input.regularization !== undefined && (!Number.isFinite(input.regularization) || input.regularization < 0)) ||
    (input.iterations !== undefined && (!Number.isSafeInteger(input.iterations) || input.iterations <= 0)) ||
    (input.weightBound !== undefined && (!Number.isFinite(input.weightBound) || input.weightBound <= 0))
  )
    throw new EvaluationContractError({
      id: "evaluation.model.invalid-training-configuration",
      why: "Training configuration is outside the deterministic bounded optimizer contract.",
      action: "Use a safe integer seed, non-negative regularization, and positive iterations and weight bound.",
    });
  const orderedRows = [...input.rows].sort((a, b) => a.comparisonId.localeCompare(b.comparisonId));
  const decisive = orderedRows.filter((row) => row.label !== "tie");
  if (input.rows.length === 0) return { status: "no-model", reason: "empty-labels" };
  if (decisive.length === 0) return { status: "no-model", reason: "all-tie" };
  if (new Set(decisive.map((row) => row.label)).size < 2) return { status: "no-model", reason: "single-class" };
  const trainRows = decisive.filter((row) => row.split === "train");
  const fittingRows = trainRows.length > 0 ? trainRows : decisive;
  const featureIds = [...new Set(fittingRows.flatMap((row) => Object.keys(row.featureDelta)))].sort();
  const stats = Object.fromEntries(
    featureIds.map((id) => [id, normalization(fittingRows.map((row) => row.featureDelta[id] ?? 0))]),
  );
  const styles = [...new Set(fittingRows.map((row) => row.styleProfile))].sort();
  const weights = Object.fromEntries(featureIds.map((id) => [id, seededInitial(input.seed, `feature:${id}`)]));
  const intercepts = Object.fromEntries(styles.map((style) => [style, seededInitial(input.seed, `style:${style}`)]));
  const regularization = input.regularization ?? 0.1;
  const iterations = input.iterations ?? 300;
  const weightBound = input.weightBound ?? 4;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const rate = 0.2 / Math.sqrt(iteration + 1);
    const weightGradient = Object.fromEntries(featureIds.map((id) => [id, 0]));
    const interceptGradient = Object.fromEntries(styles.map((style) => [style, 0]));
    for (const row of fittingRows) {
      const predicted = probability(row, weights, intercepts, stats);
      const target = row.label === "a" ? 1 : 0;
      const error = predicted - target;
      for (const id of featureIds) weightGradient[id]! += error * normalize(row.featureDelta[id] ?? 0, stats[id]!);
      interceptGradient[row.styleProfile]! += error;
    }
    for (const id of featureIds)
      weights[id] = bound(
        weights[id]! - rate * (weightGradient[id]! / fittingRows.length + regularization * weights[id]!),
        weightBound,
      );
    for (const style of styles)
      intercepts[style] = bound(
        intercepts[style]! - (rate * interceptGradient[style]!) / fittingRows.length,
        weightBound,
      );
  }
  const validationRows = decisive.filter((row) => row.split !== "train");
  const evaluationRows = validationRows.length > 0 ? validationRows : decisive;
  const predictions = evaluationRows.map((row) => ({ row, probability: probability(row, weights, intercepts, stats) }));
  const roundedWeights = roundRecord(weights);
  const theoryConflicts = findTheoryConflicts(roundedWeights);
  const artifact: PairwiseModelArtifact = {
    schema: PAIRWISE_MODEL_SCHEMA,
    modelVersion: input.modelVersion,
    featureSchemaVersion: EVALUATION_FEATURE_SCHEMA_VERSION,
    trainingAlgorithmVersion: PAIRWISE_TRAINING_ALGORITHM,
    regularization,
    seed: input.seed,
    iterations,
    convergenceStatus: "fixed-iterations",
    includedLabelSetHashes: [...new Set(decisive.map((row) => row.labelSetHash))].sort(),
    corpusManifestVersion: input.corpusManifestVersion,
    splitDefinition: "work-composer-subject-family-isolated",
    featureWeights: roundedWeights,
    styleIntercepts: roundRecord(intercepts),
    normalizationStats: Object.fromEntries(
      Object.entries(stats).map(([id, value]) => [id, { mean: round(value.mean), scale: round(value.scale) }]),
    ),
    unsupportedFeatures: [],
    droppedFeatures: [],
    validation: {
      logLoss: round(
        predictions.reduce(
          (sum, item) => sum - Math.log(item.row.label === "a" ? item.probability : 1 - item.probability),
          0,
        ) / predictions.length,
      ),
      pairwiseAccuracy: round(
        predictions.filter((item) => (item.probability >= 0.5 ? "a" : "b") === item.row.label).length /
          predictions.length,
      ),
      tieHandling: "excluded-from-gradient-and-reported",
      calibrationBins: calibration(predictions),
      perStyleCoverage: Object.fromEntries(
        styles.map((style) => [style, orderedRows.filter((row) => row.styleProfile === style).length]),
      ),
    },
    hardConstraintOverride: "prohibited",
    intendedMode: "shadow",
    trainingDataKind: input.trainingDataKind ?? "synthetic-or-agent",
    theoryReview: {
      status: theoryConflicts.length === 0 ? "clear" : "review-required",
      conflicts: theoryConflicts,
    },
  };
  return { status: "trained", artifact };
}

export function loadPairwiseModel(value: unknown): PairwiseModelArtifact {
  const artifact = value as Partial<PairwiseModelArtifact>;
  if (
    artifact.schema !== PAIRWISE_MODEL_SCHEMA ||
    artifact.featureSchemaVersion !== EVALUATION_FEATURE_SCHEMA_VERSION ||
    artifact.trainingAlgorithmVersion !== PAIRWISE_TRAINING_ALGORITHM ||
    artifact.hardConstraintOverride !== "prohibited" ||
    (artifact.theoryReview?.status !== "clear" && artifact.theoryReview?.status !== "review-required")
  ) {
    throw new EvaluationContractError({
      id: "evaluation.model.unsupported-schema",
      why: "Model and feature semantics cannot be safely reconstructed.",
      action: "Load a supported artifact or retrain it from validated rows.",
    });
  }
  if (
    typeof artifact.modelVersion !== "string" ||
    artifact.modelVersion.length === 0 ||
    !Number.isFinite(artifact.regularization) ||
    !Number.isSafeInteger(artifact.seed) ||
    !Number.isSafeInteger(artifact.iterations) ||
    artifact.iterations! <= 0 ||
    artifact.convergenceStatus !== "fixed-iterations" ||
    artifact.splitDefinition !== "work-composer-subject-family-isolated" ||
    !Array.isArray(artifact.includedLabelSetHashes) ||
    typeof artifact.corpusManifestVersion !== "string" ||
    artifact.corpusManifestVersion.length === 0 ||
    !numericRecord(artifact.featureWeights) ||
    !numericRecord(artifact.styleIntercepts) ||
    !normalizationRecord(artifact.normalizationStats) ||
    Object.keys(artifact.featureWeights).some((id) => artifact.normalizationStats?.[id] === undefined) ||
    !Array.isArray(artifact.unsupportedFeatures) ||
    !Array.isArray(artifact.droppedFeatures) ||
    (artifact.intendedMode !== "shadow" && artifact.intendedMode !== "selection-candidate") ||
    (artifact.trainingDataKind !== "synthetic-or-agent" && artifact.trainingDataKind !== "human-preference") ||
    artifact.validation === undefined ||
    !nullableFinite(artifact.validation.logLoss) ||
    !nullableFinite(artifact.validation.pairwiseAccuracy) ||
    artifact.validation.tieHandling !== "excluded-from-gradient-and-reported" ||
    !Array.isArray(artifact.validation.calibrationBins) ||
    !numericRecord(artifact.validation.perStyleCoverage) ||
    !Array.isArray(artifact.theoryReview.conflicts)
  ) {
    throw new EvaluationContractError({
      id: "evaluation.model.malformed-artifact",
      why: "Required model parameters or validation provenance are missing or malformed.",
      action: "Retrain the model from validated rows instead of repairing the artifact by hand.",
    });
  }
  return artifact as PairwiseModelArtifact;
}

function numericRecord(value: unknown): value is Record<string, number> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item))
  );
}

function normalizationRecord(value: unknown): value is Record<string, { mean: number; scale: number }> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "mean" in item &&
        typeof item.mean === "number" &&
        Number.isFinite(item.mean) &&
        "scale" in item &&
        typeof item.scale === "number" &&
        Number.isFinite(item.scale) &&
        item.scale > 0,
    )
  );
}

function nullableFinite(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function seededInitial(seed: number, key: string): number {
  let hash = (seed ^ 2166136261) >>> 0;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return ((hash / 0xffffffff) * 2 - 1) * 0.001;
}

function findTheoryConflicts(weights: Record<string, number>): PairwiseModelArtifact["theoryReview"]["conflicts"] {
  const expected = (featureId: string): "positive" | "negative" | undefined => {
    if (
      featureId.includes("pitch-class-unison") ||
      featureId.includes("parallel-perfect-rate") ||
      featureId.includes("rhythmic-lockstep-rate") ||
      featureId === "entry.accented-friction-rate" ||
      featureId === "score.interval-motive-concentration"
    )
      return "negative";
    if (
      featureId === "note.leap-recovery-ratio" ||
      featureId === "entry.boundary-continuity" ||
      featureId === "entry.friction-resolution-rate" ||
      featureId === "entry.counter-subject-preservation-rate" ||
      featureId === "score.long-window-development" ||
      featureId === "score.terminal-active-voice-ratio"
    )
      return "positive";
    return undefined;
  };
  return Object.entries(weights)
    .flatMap(([featureId, learnedWeight]) => {
      const expectedSign = expected(featureId);
      if (
        expectedSign === undefined ||
        Math.abs(learnedWeight) < 0.05 ||
        (expectedSign === "positive" ? learnedWeight > 0 : learnedWeight < 0)
      )
        return [];
      return [{ featureId, expectedSign, learnedWeight }];
    })
    .sort((a, b) => a.featureId.localeCompare(b.featureId));
}

export function predictPairwise(
  model: PairwiseModelArtifact,
  input: {
    styleProfile: string;
    featureDelta: Record<string, number>;
    evidence?: Record<string, FeatureEvidencePointer[]>;
    hardFailures?: string[];
  },
): PairwisePrediction {
  loadPairwiseModel(model);
  const contributions = Object.keys(model.featureWeights)
    .map((featureId) => {
      const delta = input.featureDelta[featureId] ?? 0;
      const weight = model.featureWeights[featureId]!;
      return {
        featureId,
        delta,
        weight,
        contribution: round(normalize(delta, model.normalizationStats[featureId]!) * weight),
        evidence: input.evidence?.[featureId] ?? [],
      };
    })
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution) || a.featureId.localeCompare(b.featureId));
  const logit =
    (model.styleIntercepts[input.styleProfile] ?? 0) +
    contributions.reduce((sum, contribution) => sum + contribution.contribution, 0);
  const probabilityA = round(sigmoid(logit));
  const hardFailures = input.hardFailures ?? [];
  return {
    probabilityA,
    predictedSide: probabilityA >= 0.5 ? "a" : "b",
    margin: round(Math.abs(probabilityA - 0.5) * 2),
    uncertainty: round(1 - Math.abs(probabilityA - 0.5) * 2),
    contributions,
    hardFailures,
    adoptionEligible:
      hardFailures.length === 0 &&
      model.theoryReview.status === "clear" &&
      model.intendedMode === "selection-candidate",
  };
}

export function serializePairwiseModel(model: PairwiseModelArtifact): Uint8Array {
  loadPairwiseModel(model);
  return new TextEncoder().encode(`${JSON.stringify(model)}\n`);
}

function validateRows(rows: readonly PairwiseTrainingRow[]): void {
  const splitOwners = new Map<string, string>();
  const ids = new Set<string>();
  for (const row of rows) {
    if (
      !row.comparisonId ||
      !["train", "validation", "work-holdout", "composer-holdout"].includes(row.split) ||
      !row.workGroup ||
      !row.composerGroup ||
      !row.subjectFamilyGroup ||
      !row.styleProfile ||
      !["a", "b", "tie"].includes(row.label) ||
      !/^sha256:[a-f0-9]{64}$/.test(row.labelSetHash)
    )
      throw new EvaluationContractError({
        id: "evaluation.model.malformed-row",
        why: "Training row identity, split, label, or provenance is incomplete.",
        action: "Regenerate rows from validated pairwise responses and isolated split metadata.",
      });
    if (ids.has(row.comparisonId))
      throw new EvaluationContractError({
        id: "evaluation.model.duplicate-row",
        why: "Training comparison identity is ambiguous.",
        action: "Deduplicate the validated label set before training.",
      });
    ids.add(row.comparisonId);
    if (Object.values(row.featureDelta).some((value) => !Number.isFinite(value)))
      throw new EvaluationContractError({
        id: "evaluation.model.malformed-feature",
        why: "Non-finite input would make model fitting non-reproducible.",
        action: "Replace malformed feature rows before training.",
      });
    for (const group of [
      `work:${row.workGroup}`,
      `composer:${row.composerGroup}`,
      `subject:${row.subjectFamilyGroup}`,
    ]) {
      const previous = splitOwners.get(group);
      if (previous !== undefined && previous !== row.split)
        throw new EvaluationContractError({
          id: "evaluation.model.split-leakage",
          why: "Related observations cross the declared train/holdout boundary.",
          action: "Assign work, composer, and subject-family groups to one split.",
        });
      splitOwners.set(group, row.split);
    }
  }
}

function probability(
  row: PairwiseTrainingRow,
  weights: Record<string, number>,
  intercepts: Record<string, number>,
  stats: Record<string, { mean: number; scale: number }>,
): number {
  const logit = Object.keys(weights).reduce(
    (sum, id) => sum + normalize(row.featureDelta[id] ?? 0, stats[id]!) * weights[id]!,
    intercepts[row.styleProfile] ?? 0,
  );
  return sigmoid(logit);
}

function normalization(values: number[]): { mean: number; scale: number } {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, scale: Math.sqrt(variance) || 1 };
}
function normalize(value: number, stats: { mean: number; scale: number }): number {
  return (value - stats.mean) / stats.scale;
}
function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, value))));
}
function bound(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}
function round(value: number): number {
  return Number(value.toFixed(9));
}
function roundRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(record)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, round(value)]),
  );
}
function calibration(
  predictions: { row: PairwiseTrainingRow; probability: number }[],
): PairwiseModelArtifact["validation"]["calibrationBins"] {
  return [
    [0, 0.25],
    [0.25, 0.5],
    [0.5, 0.75],
    [0.75, 1],
  ].map(([lower, upper], index) => {
    const bin = predictions.filter(
      (item) => item.probability >= lower! && (index === 3 ? item.probability <= upper! : item.probability < upper!),
    );
    return {
      lower: lower!,
      upper: upper!,
      count: bin.length,
      observedAWinRate:
        bin.length === 0 ? null : round(bin.filter((item) => item.row.label === "a").length / bin.length),
    };
  });
}
