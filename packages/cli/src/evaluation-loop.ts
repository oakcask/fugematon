import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  createActiveLearningQueue,
  createShadowReport,
  type PairwiseBundleManifest,
  type PairwiseResponseSet,
  type PairwiseTrainingRow,
  SHADOW_REPORT_SCHEMA,
  type ShadowReport,
  serializePairwiseModel,
  summarizePairwiseLabels,
  trainPairwiseModel,
  validatePairwiseResponses,
} from "@fugematon/evaluation";

export async function runEvaluationLearningLoop(input: {
  bundleFile: string;
  responsesFile: string;
  outDirectory: string;
  modelVersion: string;
  corpusManifestVersion: string;
  trainingSeed: number;
  queueLimit: number;
  previousShadowFile?: string;
  adoptionReviewFile?: string;
}): Promise<void> {
  const bundle = await readJson<PairwiseBundleManifest>(input.bundleFile);
  const responses = await readJson<PairwiseResponseSet>(input.responsesFile);
  validatePairwiseResponses(bundle, responses);
  const labelSummary = summarizePairwiseLabels(bundle, responses);
  const rows = trainingRows(bundle, responses);
  const training = trainPairwiseModel({
    rows,
    corpusManifestVersion: input.corpusManifestVersion,
    modelVersion: input.modelVersion,
    seed: input.trainingSeed,
    trainingDataKind: responses.responses.every(
      (response) => response.labelSource === undefined || response.labelSource === "human",
    )
      ? "human-preference"
      : "synthetic-or-agent",
  });
  await mkdir(input.outDirectory, { recursive: true });
  await atomicJson(join(input.outDirectory, "label-summary.json"), labelSummary);
  await atomicJson(join(input.outDirectory, "training-summary.json"), training);
  if (training.status !== "trained") return;
  await atomicBytes(join(input.outDirectory, "model.json"), serializePairwiseModel(training.artifact));
  const shadowOffFingerprint = await generationFingerprint(input.bundleFile, bundle);
  const scoreContexts = await loadScoreContexts(input.bundleFile, bundle);
  const reviewAnalysis = await loadReviewAnalysis(input.bundleFile);
  const previousPredictions = await loadPreviousPredictions(input.previousShadowFile);
  const report = createShadowReport({
    model: training.artifact,
    generationFingerprints: {
      shadowOff: shadowOffFingerprint,
      shadowOn: shadowOffFingerprint,
    },
    comparisons: bundle.comparisons.map((comparison) => {
      const response = responses.responses.find((candidate) => candidate.comparisonId === comparison.id);
      const scoreContext = scoreContexts.get(comparison.id);
      const analysis = reviewAnalysis.get(comparison.context.seed);
      return {
        comparisonId: comparison.id,
        seed: comparison.context.seed,
        seedClass: comparison.context.seedClass,
        subjectFamilyGroup: comparison.context.subjectFamilyGroup,
        styleProfile: comparison.context.styleProfile,
        meter: scoreContext?.meter ?? "unknown",
        entryRoles: scoreContext?.entryRoles ?? [],
        sectionRoles: scoreContext?.sectionRoles ?? [],
        featureDelta: featureDelta(comparison.sides.a.featureVector, comparison.sides.b.featureVector),
        evidence: featureEvidence(comparison.sides.a.featureVector, comparison.sides.b.featureVector),
        hardFailures: analysis?.hardFailures ?? [],
        referenceOutsideAxes: analysis?.referenceOutsideAxes ?? [],
        qualityVectorDelta: analysis?.qualityVectorDelta ?? {},
        localSentinelDelta: analysis?.localSentinelDelta ?? {},
        label:
          response?.preferredSide === "a" || response?.preferredSide === "b" || response?.preferredSide === "tie"
            ? {
                source:
                  response.labelSource === "agent" || response.labelSource === "oracle"
                    ? response.labelSource
                    : "human",
                preferredSide: response.preferredSide,
              }
            : undefined,
        oodReasons: uniqueOodReasons([
          ...(comparison.sides.a.featureVector.features.some(
            (feature) => feature.availability === "missing-annotation",
          ) ||
          comparison.sides.b.featureVector.features.some((feature) => feature.availability === "missing-annotation")
            ? (["unknown-annotation"] as const)
            : []),
          ...(training.artifact.validation.perStyleCoverage[comparison.context.styleProfile] === undefined
            ? (["style-coverage"] as const)
            : []),
          ...(Object.keys(training.artifact.featureWeights).some(
            (id) =>
              !comparison.sides.a.featureVector.features.some((feature) => feature.id === id) ||
              !comparison.sides.b.featureVector.features.some((feature) => feature.id === id),
          )
            ? (["missing-feature"] as const)
            : []),
          ...((analysis?.referenceOutsideAxes.length ?? 0) > 0 ? (["corpus-distance"] as const) : []),
        ]),
        responseOwner: analysis?.responseOwner ?? ("selection-only" as const),
        previousPredictedSide: previousPredictions.get(comparison.id),
      };
    }),
  });
  const shadowOnFingerprint = await generationFingerprint(input.bundleFile, bundle);
  if (shadowOffFingerprint !== shadowOnFingerprint)
    throw new Error(
      "evaluation.shadow.output-mutation: Shadow inference changed generated ScoreEvent, MIDI, or diagnostics bytes. Action: remove the mutation before using the shadow report.",
    );
  report.generatorOutputInvariant = true;
  const queue = createActiveLearningQueue({ report, limit: input.queueLimit });
  await atomicJson(join(input.outDirectory, "shadow-summary.json"), report);
  await atomicJson(join(input.outDirectory, "next-review-queue.json"), queue);
  if (input.adoptionReviewFile !== undefined)
    await atomicJson(input.adoptionReviewFile, {
      schema: "fugematon-model-adoption-review/v1",
      modelVersion: training.artifact.modelVersion,
      requested: true,
      automaticPromotion: false,
      status:
        training.artifact.trainingDataKind === "human-preference" &&
        training.artifact.theoryReview.status === "clear" &&
        report.generatorOutputInvariant &&
        report.comparisons.every((comparison) => comparison.hardFailures.length === 0) &&
        queue.missingClasses.length === 0
          ? "review-required"
          : "not-ready",
      criteria: {
        humanPreferenceLabels: training.artifact.trainingDataKind === "human-preference",
        theorySignsClear: training.artifact.theoryReview.status === "clear",
        generatorOutputInvariant: report.generatorOutputInvariant,
        hardFailuresAbsent: report.comparisons.every((comparison) => comparison.hardFailures.length === 0),
        requiredCoveragePresent: queue.missingClasses.length === 0,
        holdoutImprovesBaseline: null,
        localizedEvidenceAvailable: report.comparisons.every((comparison) =>
          comparison.prediction.contributions.every(
            (contribution) => contribution.contribution === 0 || contribution.evidence.length > 0,
          ),
        ),
      },
      action:
        "Complete the missing human, holdout, coverage, theory, and localized-evidence review before changing default selection.",
    });
}

async function loadPreviousPredictions(file: string | undefined): Promise<Map<string, "a" | "b">> {
  if (file === undefined) return new Map();
  const report = await readJson<ShadowReport>(file);
  if (report.schema !== SHADOW_REPORT_SCHEMA)
    throw new Error(
      "evaluation.shadow.unsupported-previous-report: Model-update flips cannot be reconstructed from an unknown shadow schema. Action: provide a supported prior shadow-summary.json.",
    );
  return new Map(
    report.comparisons.map((comparison) => [comparison.comparisonId, comparison.prediction.predictedSide]),
  );
}

type ScoreContext = { meter: string; entryRoles: string[]; sectionRoles: string[] };

async function loadScoreContexts(
  bundleFile: string,
  bundle: PairwiseBundleManifest,
): Promise<Map<string, ScoreContext>> {
  const root = dirname(bundleFile);
  const result = new Map<string, ScoreContext>();
  for (const comparison of bundle.comparisons) {
    const assets = [comparison.sides.a.scoreAsset, comparison.sides.b.scoreAsset].filter(
      (asset): asset is string => asset !== undefined,
    );
    const events = (
      await Promise.all(
        assets.map(async (asset) => JSON.parse(await readFile(join(root, asset), "utf8")) as ScoreEventShape[]),
      )
    ).flat();
    const meterEvent = events.find((event) => event.kind === "meta" && event.type === "time-signature");
    const numerator = numberPayload(meterEvent, "numerator");
    const denominator = numberPayload(meterEvent, "denominator");
    result.set(comparison.id, {
      meter: numerator === undefined || denominator === undefined ? "unknown" : `${numerator}/${denominator}`,
      entryRoles: unique(
        events
          .filter(
            (event) => event.kind === "note" && ["subject", "answer", "subject-fragment"].includes(event.role ?? ""),
          )
          .map((event) => event.role!),
      ),
      sectionRoles: unique(
        events
          .filter((event) => event.kind === "meta" && event.type === "state-change")
          .map((event) => stringPayload(event, "state"))
          .filter((value): value is string => value !== undefined),
      ),
    });
  }
  return result;
}

type ScoreEventShape = {
  kind?: string;
  type?: string;
  role?: string;
  payload?: Record<string, unknown>;
};

function numberPayload(event: ScoreEventShape | undefined, key: string): number | undefined {
  const value = event?.payload?.[key];
  return typeof value === "number" ? value : undefined;
}

function stringPayload(event: ScoreEventShape, key: string): string | undefined {
  const value = event.payload?.[key];
  return typeof value === "string" ? value : undefined;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort();
}

type ReviewAnalysis = {
  hardFailures: string[];
  referenceOutsideAxes: string[];
  qualityVectorDelta: Record<string, number>;
  localSentinelDelta: Record<string, number>;
  responseOwner: "selection-only" | "generator" | "section-planner" | "diagnostics";
};

async function loadReviewAnalysis(bundleFile: string): Promise<Map<string, ReviewAnalysis>> {
  try {
    const value = JSON.parse(await readFile(join(dirname(bundleFile), "comparison-summary.json"), "utf8")) as {
      seeds?: Array<{
        seed?: string;
        baseline?: {
          reviewGatePolicy?: { hardFailures?: unknown[] };
          referenceComparison?: { outsideAxes?: string[] };
          qualityVector?: QualityVectorShape;
        };
        variant?: {
          reviewGatePolicy?: { hardFailures?: unknown[] };
          referenceComparison?: { outsideAxes?: string[] };
          qualityVector?: QualityVectorShape;
        };
        deltas?: {
          qualityVectorDistance?: number;
          localSentinelCount?: number;
          phraseConvergenceReviewFindings?: number;
        };
      }>;
    };
    return new Map(
      (value.seeds ?? []).flatMap((seed) => {
        if (seed.seed === undefined) return [];
        const hardFailures = [
          ...(seed.baseline?.reviewGatePolicy?.hardFailures ?? []).map((failure) => `baseline:${failureId(failure)}`),
          ...(seed.variant?.reviewGatePolicy?.hardFailures ?? []).map((failure) => `variant:${failureId(failure)}`),
        ];
        const qualityVectorDelta = axisDeltas(seed.baseline?.qualityVector, seed.variant?.qualityVector);
        if (seed.deltas?.qualityVectorDistance !== undefined)
          qualityVectorDelta.aggregateDistance = seed.deltas.qualityVectorDistance;
        const localSentinelDelta = sentinelDeltas(seed.baseline?.qualityVector, seed.variant?.qualityVector);
        if (seed.deltas?.localSentinelCount !== undefined) localSentinelDelta.total = seed.deltas.localSentinelCount;
        const phraseFindings = seed.deltas?.phraseConvergenceReviewFindings ?? 0;
        return [
          [
            seed.seed,
            {
              hardFailures,
              referenceOutsideAxes: unique([
                ...(seed.baseline?.referenceComparison?.outsideAxes ?? []),
                ...(seed.variant?.referenceComparison?.outsideAxes ?? []),
              ]),
              qualityVectorDelta,
              localSentinelDelta,
              responseOwner:
                Object.values(localSentinelDelta).some((value) => value !== 0) || hardFailures.length > 0
                  ? "generator"
                  : phraseFindings !== 0
                    ? "section-planner"
                    : "selection-only",
            } satisfies ReviewAnalysis,
          ],
        ] as const;
      }),
    );
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") return new Map();
    throw error;
  }
}

type QualityVectorShape = {
  axes?: { axis?: string; normalizedValue?: number }[];
  localSentinels?: { metric?: string }[];
};

function axisDeltas(
  baseline: QualityVectorShape | undefined,
  variant: QualityVectorShape | undefined,
): Record<string, number> {
  const left = new Map(
    (baseline?.axes ?? []).flatMap((axis) => (axis.axis === undefined ? [] : [[axis.axis, axis.normalizedValue ?? 0]])),
  );
  const right = new Map(
    (variant?.axes ?? []).flatMap((axis) => (axis.axis === undefined ? [] : [[axis.axis, axis.normalizedValue ?? 0]])),
  );
  return Object.fromEntries(
    [...new Set([...left.keys(), ...right.keys()])]
      .sort()
      .map((axis) => [axis, roundDelta((right.get(axis) ?? 0) - (left.get(axis) ?? 0))]),
  );
}

function sentinelDeltas(
  baseline: QualityVectorShape | undefined,
  variant: QualityVectorShape | undefined,
): Record<string, number> {
  const counts = (items: QualityVectorShape["localSentinels"]): Map<string, number> => {
    const result = new Map<string, number>();
    for (const item of items ?? []) {
      const metric = item.metric ?? "unknown";
      result.set(metric, (result.get(metric) ?? 0) + 1);
    }
    return result;
  };
  const left = counts(baseline?.localSentinels);
  const right = counts(variant?.localSentinels);
  return Object.fromEntries(
    [...new Set([...left.keys(), ...right.keys()])]
      .sort()
      .map((metric) => [metric, (right.get(metric) ?? 0) - (left.get(metric) ?? 0)]),
  );
}

function roundDelta(value: number): number {
  return Number(value.toFixed(9));
}

function uniqueOodReasons(
  reasons: Array<"missing-feature" | "style-coverage" | "corpus-distance" | "unknown-annotation">,
): Array<"missing-feature" | "style-coverage" | "corpus-distance" | "unknown-annotation"> {
  return [...new Set(reasons)].sort();
}

function failureId(value: unknown): string {
  if (typeof value === "object" && value !== null && "metric" in value && typeof value.metric === "string") {
    return value.metric;
  }
  return "hard-failure";
}

function trainingRows(bundle: PairwiseBundleManifest, responses: PairwiseResponseSet): PairwiseTrainingRow[] {
  const orderedResponses = [...responses.responses].sort((a, b) => a.comparisonId.localeCompare(b.comparisonId));
  const labelSetHash = sha256(
    canonicalJson({ schema: responses.schema, bundleId: responses.bundleId, responses: orderedResponses }),
  );
  const isolatedSplits = isolatedSubjectSplits(bundle);
  return orderedResponses.flatMap((response) => {
    if (
      response.preferredSide === "cannot-judge" ||
      response.preferredSide === "not-reviewed" ||
      response.revisionKind === "analysis-assisted" ||
      ((response.renderingReasonTags?.length ?? 0) > 0 && (response.compositionReasonTags?.length ?? 0) === 0)
    ) {
      return [];
    }
    const comparison = bundle.comparisons.find((candidate) => candidate.id === response.comparisonId);
    if (comparison === undefined) return [];
    return [
      {
        comparisonId: comparison.id,
        split: isolatedSplits.get(comparison.context.subjectFamilyGroup)!,
        workGroup: `generated-work:${comparison.context.seed}`,
        composerGroup: `generated-composer:${comparison.context.seed}`,
        subjectFamilyGroup: comparison.context.subjectFamilyGroup,
        styleProfile: comparison.context.styleProfile,
        featureDelta: featureDelta(comparison.sides.a.featureVector, comparison.sides.b.featureVector),
        evidence: featureEvidence(comparison.sides.a.featureVector, comparison.sides.b.featureVector),
        label: response.preferredSide,
        labelSetHash,
      },
    ];
  });
}

function isolatedSubjectSplits(bundle: PairwiseBundleManifest): Map<string, PairwiseTrainingRow["split"]> {
  const rank: Record<PairwiseTrainingRow["split"], number> = {
    train: 0,
    validation: 1,
    "work-holdout": 2,
    "composer-holdout": 3,
  };
  const splits = new Map<string, PairwiseTrainingRow["split"]>();
  for (const comparison of bundle.comparisons) {
    const group = comparison.context.subjectFamilyGroup;
    const proposed = splitFor(comparison.context.seedClass);
    const prior = splits.get(group);
    if (prior === undefined || rank[proposed] > rank[prior]) splits.set(group, proposed);
  }
  return splits;
}

function featureDelta(
  a: PairwiseBundleManifest["comparisons"][number]["sides"]["a"]["featureVector"],
  b: PairwiseBundleManifest["comparisons"][number]["sides"]["b"]["featureVector"],
): Record<string, number> {
  return Object.fromEntries(
    a.features.map((feature) => [
      feature.id,
      feature.value - (b.features.find((candidate) => candidate.id === feature.id)?.value ?? 0),
    ]),
  );
}

function featureEvidence(
  a: PairwiseBundleManifest["comparisons"][number]["sides"]["a"]["featureVector"],
  b: PairwiseBundleManifest["comparisons"][number]["sides"]["b"]["featureVector"],
): PairwiseTrainingRow["evidence"] {
  return Object.fromEntries(
    a.features.map((feature) => [
      feature.id,
      [...feature.evidence, ...(b.features.find((candidate) => candidate.id === feature.id)?.evidence ?? [])].slice(
        0,
        4,
      ),
    ]),
  );
}

function splitFor(
  seedClass: PairwiseBundleManifest["comparisons"][number]["context"]["seedClass"],
): PairwiseTrainingRow["split"] {
  if (seedClass === "composer-holdout") return "composer-holdout";
  if (seedClass === "rotation" || seedClass === "adversarial") return "work-holdout";
  if (seedClass === "boundary") return "validation";
  return "train";
}

async function generationFingerprint(bundleFile: string, bundle: PairwiseBundleManifest): Promise<string> {
  const root = dirname(bundleFile);
  const artifacts: { identity: string; hash: string }[] = [];
  for (const comparison of bundle.comparisons) {
    for (const sideName of ["a", "b"] as const) {
      const side = comparison.sides[sideName];
      for (const [kind, asset, expected] of [
        ["midi", side.midiAsset, side.midiSha256],
        ["score", side.scoreAsset, side.scoreSha256],
      ] as const) {
        if (asset === undefined || expected === undefined) continue;
        const actual = sha256(await readFile(join(root, asset)));
        if (actual !== expected)
          throw new Error(
            "evaluation.shadow.asset-hash-mismatch: Generated ScoreEvent or MIDI bytes differ from the immutable bundle identity. Action: regenerate the A/B bundle before shadow evaluation.",
          );
        artifacts.push({ identity: `${comparison.id}:${sideName}:${kind}`, hash: actual });
      }
    }
  }
  for (const artifact of ["comparison-summary.json", "hidden-side-mapping.json"]) {
    try {
      artifacts.push({ identity: `diagnostics:${artifact}`, hash: sha256(await readFile(join(root, artifact))) });
    } catch (error: unknown) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") continue;
      throw error;
    }
  }
  return sha256(canonicalJson(artifacts.sort((a, b) => a.identity.localeCompare(b.identity))));
}

function sha256(value: string | Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (typeof value === "object" && value !== null)
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  await atomicBytes(file, new TextEncoder().encode(`${JSON.stringify(value, null, 2)}\n`));
}

async function atomicBytes(file: string, value: Uint8Array): Promise<void> {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, file);
}
