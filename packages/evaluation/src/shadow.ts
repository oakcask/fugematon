import { type PairwiseModelArtifact, type PairwisePrediction, predictPairwise } from "./model.js";

export const SHADOW_REPORT_SCHEMA = "fugematon-shadow-report/v1" as const;
export const ACTIVE_LEARNING_QUEUE_SCHEMA = "fugematon-active-learning-queue/v1" as const;

export type ShadowComparisonInput = {
  comparisonId: string;
  seed: string;
  seedClass: "fixed" | "representative" | "boundary" | "rotation" | "adversarial" | "targeted" | "composer-holdout";
  subjectFamilyGroup: string;
  composerGroup?: string;
  styleProfile: string;
  meter: string;
  entryRoles: string[];
  sectionRoles: string[];
  featureDelta: Record<string, number>;
  evidence?: Parameters<typeof predictPairwise>[1]["evidence"];
  hardFailures: string[];
  referenceOutsideAxes: string[];
  qualityVectorDelta: Record<string, number>;
  localSentinelDelta: Record<string, number>;
  label?: { source: "human" | "agent" | "oracle"; preferredSide: "a" | "b" | "tie" };
  oodReasons: ("missing-feature" | "style-coverage" | "corpus-distance" | "unknown-annotation")[];
  responseOwner: "selection-only" | "generator" | "section-planner" | "diagnostics";
  previousPredictedSide?: "a" | "b";
};

export type ShadowComparisonSummary = {
  comparisonId: string;
  seed: string;
  seedClass: ShadowComparisonInput["seedClass"];
  subjectFamilyGroup: string;
  composerGroup?: string;
  styleProfile: string;
  meter: string;
  entryRoles: string[];
  sectionRoles: string[];
  prediction: PairwisePrediction;
  hardFailures: string[];
  referenceOutsideAxes: string[];
  qualityVectorDelta: Record<string, number>;
  localSentinelDelta: Record<string, number>;
  label?: ShadowComparisonInput["label"];
  agreement: "agree" | "disagree" | "tie-or-unlabeled";
  oodReasons: ShadowComparisonInput["oodReasons"];
  responseOwner: ShadowComparisonInput["responseOwner"];
  reviewRequired: boolean;
  preferenceFlipped: boolean;
};

export type ShadowReport = {
  schema: typeof SHADOW_REPORT_SCHEMA;
  modelVersion: string;
  generatorOutputInvariant: boolean;
  modelTheoryReview: PairwiseModelArtifact["theoryReview"];
  comparisons: ShadowComparisonSummary[];
};

export type ActiveLearningQueueItem = {
  rank: number;
  comparisonId: string;
  seed: string;
  priority: number;
  reasons: string[];
  strata: string[];
};

export type ActiveLearningQueue = {
  schema: typeof ACTIVE_LEARNING_QUEUE_SCHEMA;
  modelVersion: string;
  items: ActiveLearningQueueItem[];
  coverage: Record<string, number>;
  missingClasses: string[];
  promotion: { automatic: false; requiresSeparateAdoptionReview: true };
};

export function createShadowReport(input: {
  model: PairwiseModelArtifact;
  comparisons: readonly ShadowComparisonInput[];
  generationFingerprints: { shadowOff: string; shadowOn: string };
}): ShadowReport {
  return {
    schema: SHADOW_REPORT_SCHEMA,
    modelVersion: input.model.modelVersion,
    generatorOutputInvariant: input.generationFingerprints.shadowOff === input.generationFingerprints.shadowOn,
    modelTheoryReview: input.model.theoryReview,
    comparisons: input.comparisons.map((comparison) => {
      const prediction = predictPairwise(input.model, {
        styleProfile: comparison.styleProfile,
        featureDelta: comparison.featureDelta,
        evidence: comparison.evidence,
        hardFailures: comparison.hardFailures,
      });
      const agreement =
        comparison.label === undefined || comparison.label.preferredSide === "tie"
          ? "tie-or-unlabeled"
          : comparison.label.preferredSide === prediction.predictedSide
            ? "agree"
            : "disagree";
      const sentinelRegression = Object.values(comparison.localSentinelDelta).some((value) => value > 0);
      const falseConfidence = comparison.oodReasons.length > 0 && prediction.uncertainty < 0.25;
      return {
        comparisonId: comparison.comparisonId,
        seed: comparison.seed,
        seedClass: comparison.seedClass,
        subjectFamilyGroup: comparison.subjectFamilyGroup,
        composerGroup: comparison.composerGroup,
        styleProfile: comparison.styleProfile,
        meter: comparison.meter,
        entryRoles: [...comparison.entryRoles].sort(),
        sectionRoles: [...comparison.sectionRoles].sort(),
        prediction,
        hardFailures: [...comparison.hardFailures].sort(),
        referenceOutsideAxes: [...comparison.referenceOutsideAxes].sort(),
        qualityVectorDelta: sortRecord(comparison.qualityVectorDelta),
        localSentinelDelta: sortRecord(comparison.localSentinelDelta),
        label: comparison.label,
        agreement,
        oodReasons: [...comparison.oodReasons].sort(),
        responseOwner: comparison.responseOwner,
        reviewRequired:
          agreement === "disagree" ||
          comparison.hardFailures.length > 0 ||
          comparison.oodReasons.length > 0 ||
          sentinelRegression ||
          falseConfidence ||
          input.model.theoryReview.status === "review-required",
        preferenceFlipped:
          comparison.previousPredictedSide !== undefined &&
          comparison.previousPredictedSide !== prediction.predictedSide,
      };
    }),
  };
}

export function createActiveLearningQueue(input: {
  report: ShadowReport;
  limit: number;
  requiredClasses?: readonly string[];
  maxPerSubjectFamily?: number;
}): ActiveLearningQueue {
  const requiredClasses = input.requiredClasses ?? [
    "fixed",
    "representative",
    "boundary",
    "rotation",
    "adversarial",
    "composer-holdout",
  ];
  const coverage = new Map<string, number>();
  for (const comparison of input.report.comparisons) {
    for (const stratum of strata(comparison)) coverage.set(stratum, (coverage.get(stratum) ?? 0) + 1);
  }
  const subjectCounts = new Map<string, number>();
  const ranked = input.report.comparisons
    .map((comparison) => scoreQueueItem(comparison, coverage))
    .sort(
      (a, b) =>
        b.priority - a.priority ||
        stableHash(a.comparisonId) - stableHash(b.comparisonId) ||
        a.comparisonId.localeCompare(b.comparisonId),
    );
  const selected: Omit<ActiveLearningQueueItem, "rank">[] = [];
  for (const item of ranked) {
    const comparison = input.report.comparisons.find((candidate) => candidate.comparisonId === item.comparisonId)!;
    const count = subjectCounts.get(comparison.subjectFamilyGroup) ?? 0;
    if (count >= (input.maxPerSubjectFamily ?? 2)) continue;
    selected.push(item);
    subjectCounts.set(comparison.subjectFamilyGroup, count + 1);
    if (selected.length >= input.limit) break;
  }
  return {
    schema: ACTIVE_LEARNING_QUEUE_SCHEMA,
    modelVersion: input.report.modelVersion,
    items: selected.map((item, index) => ({ ...item, rank: index + 1 })),
    coverage: Object.fromEntries([...coverage.entries()].sort(([a], [b]) => a.localeCompare(b))),
    missingClasses: requiredClasses.filter((required) => (coverage.get(`seed-class:${required}`) ?? 0) === 0),
    promotion: { automatic: false, requiresSeparateAdoptionReview: true },
  };
}

function scoreQueueItem(
  comparison: ShadowComparisonSummary,
  coverage: ReadonlyMap<string, number>,
): Omit<ActiveLearningQueueItem, "rank"> {
  const reasons: string[] = [];
  let priority = comparison.prediction.uncertainty * 40;
  if (comparison.prediction.uncertainty >= 0.5) reasons.push("high-prediction-uncertainty");
  if (comparison.agreement === "disagree") {
    priority += 35;
    reasons.push("label-disagreement");
  }
  if (comparison.preferenceFlipped) {
    priority += 25;
    reasons.push("model-update-preference-flip");
  }
  if (Object.values(comparison.localSentinelDelta).some((value) => value > 0)) {
    priority += 30;
    reasons.push("local-sentinel-regression");
  }
  if (comparison.prediction.contributions.some((contribution) => Math.abs(contribution.contribution) >= 1)) {
    priority += 10;
    reasons.push("high-feature-contribution");
  }
  if (comparison.oodReasons.length > 0) {
    priority += 20;
    reasons.push(...comparison.oodReasons.map((reason) => `ood:${reason}`));
  }
  const itemStrata = strata(comparison);
  const rare = itemStrata.filter((stratum) => (coverage.get(stratum) ?? 0) <= 1);
  if (rare.length > 0) {
    priority += Math.min(20, rare.length * 4);
    reasons.push("under-covered-stratum");
  }
  return {
    comparisonId: comparison.comparisonId,
    seed: comparison.seed,
    priority: round(priority),
    reasons: [...new Set(reasons)].sort(),
    strata: itemStrata,
  };
}

function strata(comparison: ShadowComparisonSummary): string[] {
  return [
    `seed-class:${comparison.seedClass}`,
    `style:${comparison.styleProfile}`,
    `meter:${comparison.meter}`,
    `subject-family:${comparison.subjectFamilyGroup}`,
    ...(comparison.composerGroup ? [`composer:${comparison.composerGroup}`] : []),
    ...comparison.entryRoles.map((role) => `entry-role:${role}`),
    ...comparison.sectionRoles.map((role) => `section-role:${role}`),
  ].sort();
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}
function sortRecord(record: Record<string, number>): Record<string, number> {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}
function round(value: number): number {
  return Number(value.toFixed(9));
}
