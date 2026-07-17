import { validateEvaluationFeatureVector } from "./features.js";
import { EVALUATION_FEATURE_SCHEMA_VERSION, EvaluationContractError, type EvaluationFeatureVector } from "./types.js";

export const PAIRWISE_BUNDLE_SCHEMA = "fugematon-pairwise-bundle/v1" as const;
export const PAIRWISE_RESPONSE_SCHEMA = "fugematon-pairwise-responses/v1" as const;

export const COMPOSITION_REASON_TAGS = [
  "subject-identity",
  "counter-subject-recognition",
  "line-agency",
  "entry-clarity",
  "harmony-resolution",
  "episode-direction",
  "stretto-clarity",
  "rhythmic-independence",
  "texture-continuity",
  "repetition-interest",
  "cadence-closure",
] as const;
export const RENDERING_REASON_TAGS = [
  "renderer-mismatch",
  "attack-envelope",
  "balance-masking",
  "latency-interruption",
  "distortion-clipping",
] as const;

export type PreferredSide = "a" | "b" | "tie" | "cannot-judge" | "not-reviewed";
export type CompositionReasonTag = (typeof COMPOSITION_REASON_TAGS)[number];
export type RenderingReasonTag = (typeof RENDERING_REASON_TAGS)[number];

export type PairwiseSide = {
  id: string;
  midiAsset: string;
  midiSha256: string;
  scoreAsset?: string;
  scoreSha256?: string;
  featureVector: EvaluationFeatureVector;
};

export type PairwiseComparisonContext = {
  seed: string;
  seedClass: "fixed" | "representative" | "boundary" | "rotation" | "adversarial" | "targeted" | "composer-holdout";
  subjectInputHash: string;
  subjectFamilyGroup: string;
  styleProfile: string;
  writingProfile: string;
  constraintProfile?: string;
  performanceProfile: string;
  lengthTicks: number;
  renderSettingsHash: string;
};

export type BlindedPairwiseComparison = {
  id: string;
  context: PairwiseComparisonContext;
  sides: { a: PairwiseSide; b: PairwiseSide };
};

export type PairwiseBundleManifest = {
  schema: typeof PAIRWISE_BUNDLE_SCHEMA;
  bundleId: string;
  bundleVersion: string;
  featureSchemaVersion: number;
  modelVersion: string;
  generatorVersion: number;
  performanceProfileVersion: number;
  comparisons: BlindedPairwiseComparison[];
};

export type PairwiseHiddenMapping = {
  bundleId: string;
  comparisons: { comparisonId: string; a: "baseline" | "variant"; b: "baseline" | "variant" }[];
};

export type PairwiseResponse = {
  comparisonId: string;
  preferredSide: PreferredSide;
  labelSource?: "human" | "agent" | "oracle";
  confidence?: 1 | 2 | 3 | 4 | 5;
  compositionReasonTags?: CompositionReasonTag[];
  renderingReasonTags?: RenderingReasonTag[];
  note?: string;
  reviewerPseudonym?: string;
  reviewedAt?: string;
  revisionKind?: "blind" | "analysis-assisted";
};

export type PairwiseResponseSet = {
  schema: typeof PAIRWISE_RESPONSE_SCHEMA;
  bundleId: string;
  responses: PairwiseResponse[];
};

export type PairwiseLabelSummary = {
  totalComparisons: number;
  responseCount: number;
  trainableLabelCount: number;
  tieCount: number;
  cannotJudgeCount: number;
  notReviewedCount: number;
  renderingOnlyCount: number;
  listeningGap: boolean;
  warnings: { comparisonId: string; id: string; action: string }[];
};

export function createBlindedComparison(input: {
  id: string;
  context: PairwiseComparisonContext;
  baseline: PairwiseSide;
  variant: PairwiseSide;
  orderSalt: string;
}): { comparison: BlindedPairwiseComparison; mapping: PairwiseHiddenMapping["comparisons"][number] } {
  const baselineFirst = stableHash(`${input.orderSalt}:${input.id}`) % 2 === 0;
  return {
    comparison: {
      id: input.id,
      context: input.context,
      sides: baselineFirst ? { a: input.baseline, b: input.variant } : { a: input.variant, b: input.baseline },
    },
    mapping: {
      comparisonId: input.id,
      a: baselineFirst ? "baseline" : "variant",
      b: baselineFirst ? "variant" : "baseline",
    },
  };
}

export function validatePairwiseBundle(bundle: PairwiseBundleManifest, hidden?: PairwiseHiddenMapping): void {
  if (bundle.schema !== PAIRWISE_BUNDLE_SCHEMA)
    fail(
      "evaluation.pairwise.unsupported-bundle-schema",
      "Blind bundle semantics are unknown.",
      "Regenerate the bundle with the supported schema.",
    );
  if (bundle.featureSchemaVersion !== EVALUATION_FEATURE_SCHEMA_VERSION)
    fail(
      "evaluation.pairwise.unsupported-feature-schema",
      "Blind sides cannot be compared with unknown feature semantics.",
      "Regenerate both sides with the supported evaluation feature schema.",
    );
  if (!bundle.bundleId || !bundle.bundleVersion || !bundle.modelVersion)
    fail(
      "evaluation.pairwise.missing-bundle-identity",
      "The immutable comparison identity cannot be reconstructed.",
      "Regenerate the bundle with non-empty bundle, version, and model identity fields.",
    );
  const comparisonIds = new Set<string>();
  const sideIds = new Set<string>();
  for (const comparison of bundle.comparisons) {
    if (comparisonIds.has(comparison.id))
      fail(
        "evaluation.pairwise.duplicate-comparison",
        "A comparison id is not immutable and unique.",
        "Regenerate the bundle with unique comparison ids.",
      );
    comparisonIds.add(comparison.id);
    if (
      !(comparison.context.lengthTicks > 0) ||
      !comparison.context.seed ||
      !comparison.context.styleProfile ||
      !comparison.context.writingProfile ||
      !comparison.context.performanceProfile ||
      !/^sha256:[a-f0-9]{64}$/.test(comparison.context.subjectInputHash) ||
      !/^sha256:[a-f0-9]{64}$/.test(comparison.context.renderSettingsHash)
    )
      fail(
        "evaluation.pairwise.invalid-generation-context",
        "The controlled A/B generation and rendering context is incomplete.",
        "Regenerate both sides from the same seed, profiles, length, and render settings.",
      );
    if (comparison.sides.a.id === comparison.sides.b.id)
      fail(
        "evaluation.pairwise.duplicate-side",
        "Blind sides resolve to the same source asset.",
        "Provide one baseline and one variant side.",
      );
    for (const side of [comparison.sides.a, comparison.sides.b]) {
      if (sideIds.has(side.id))
        fail(
          "evaluation.pairwise.duplicate-side-id",
          "A blinded side id is reused across comparisons.",
          "Generate a bundle-unique side id.",
        );
      sideIds.add(side.id);
      if (side.featureVector.schemaVersion !== bundle.featureSchemaVersion)
        fail(
          "evaluation.pairwise.side-feature-mismatch",
          "A blind side was extracted with a different feature contract.",
          "Regenerate every side with the bundle feature schema version.",
        );
      validateEvaluationFeatureVector(side.featureVector);
      if (!safeRelativeAsset(side.midiAsset))
        fail(
          "evaluation.pairwise.unsafe-asset-path",
          "A bundle asset can escape the immutable bundle root.",
          "Use a normalized relative asset path without parent traversal.",
        );
      if (!/^sha256:[a-f0-9]{64}$/.test(side.midiSha256))
        fail(
          "evaluation.pairwise.invalid-asset-hash",
          "The source asset identity cannot be verified.",
          "Record a sha256:<hex> asset hash.",
        );
      if (
        (side.scoreAsset === undefined) !== (side.scoreSha256 === undefined) ||
        (side.scoreAsset !== undefined && !safeRelativeAsset(side.scoreAsset))
      ) {
        fail(
          "evaluation.pairwise.invalid-score-asset",
          "The score-facing playback asset is incomplete or outside the bundle boundary.",
          "Provide both a safe relative scoreAsset and its sha256 checksum.",
        );
      }
      if (side.scoreSha256 !== undefined && !/^sha256:[a-f0-9]{64}$/.test(side.scoreSha256)) {
        fail(
          "evaluation.pairwise.invalid-score-asset-hash",
          "The score-facing playback asset identity cannot be verified.",
          "Record a sha256:<hex> score asset hash.",
        );
      }
    }
  }
  if (hidden !== undefined) {
    if (hidden.bundleId !== bundle.bundleId)
      fail(
        "evaluation.pairwise.mapping-bundle-mismatch",
        "Hidden mapping belongs to another bundle.",
        "Use the hidden mapping generated with this bundle id.",
      );
    const mapped = new Set<string>();
    for (const mapping of hidden.comparisons) {
      if (mapping.a === mapping.b || !comparisonIds.has(mapping.comparisonId) || mapped.has(mapping.comparisonId))
        fail(
          "evaluation.pairwise.invalid-hidden-mapping",
          "The hidden mapping does not map both model sides exactly once.",
          "Regenerate the hidden mapping from the validated bundle.",
        );
      mapped.add(mapping.comparisonId);
    }
    if (mapped.size !== comparisonIds.size)
      fail(
        "evaluation.pairwise.incomplete-hidden-mapping",
        "One or more blind comparisons cannot be revealed consistently.",
        "Regenerate a hidden mapping entry for every comparison.",
      );
  }
}

export function validatePairwiseResponses(bundle: PairwiseBundleManifest, responseSet: PairwiseResponseSet): void {
  validatePairwiseBundle(bundle);
  if (responseSet.schema !== PAIRWISE_RESPONSE_SCHEMA)
    fail(
      "evaluation.pairwise.unsupported-response-schema",
      "Response semantics are unknown.",
      "Export responses with the supported response schema.",
    );
  if (responseSet.bundleId !== bundle.bundleId)
    fail(
      "evaluation.pairwise.response-bundle-mismatch",
      "Responses refer to another immutable bundle.",
      "Open the matching bundle or start a new response file.",
    );
  const comparisonIds = new Set(bundle.comparisons.map((comparison) => comparison.id));
  const seen = new Map<string, string>();
  for (const response of responseSet.responses) {
    if (!comparisonIds.has(response.comparisonId))
      fail(
        "evaluation.pairwise.unknown-comparison",
        "A response cannot be linked to a bundle comparison.",
        "Remove it or restore the matching bundle comparison.",
      );
    const serialized = JSON.stringify(response);
    const previous = seen.get(response.comparisonId);
    if (previous !== undefined)
      fail(
        previous === serialized ? "evaluation.pairwise.duplicate-label" : "evaluation.pairwise.conflicting-label",
        "More than one response exists for an immutable comparison.",
        "Deduplicate identical labels or resolve the conflict explicitly.",
      );
    seen.set(response.comparisonId, serialized);
    if (!["a", "b", "tie", "cannot-judge", "not-reviewed"].includes(response.preferredSide))
      fail(
        "evaluation.pairwise.invalid-preferred-side",
        "The saved response does not have a supported final or unanswered state.",
        "Use a, b, tie, cannot-judge, or not-reviewed.",
      );
    if (response.confidence !== undefined && ![1, 2, 3, 4, 5].includes(response.confidence))
      fail(
        "evaluation.pairwise.invalid-confidence",
        "Confidence is outside the bounded ordinal scale.",
        "Use confidence 1 through 5 or omit it.",
      );
    if (response.labelSource !== undefined && !["human", "agent", "oracle"].includes(response.labelSource))
      fail(
        "evaluation.pairwise.unknown-label-source",
        "Label provenance cannot be separated from human preference evidence.",
        "Use human, agent, or oracle labelSource, or omit it for legacy human responses.",
      );
    if (response.compositionReasonTags?.some((tag) => !COMPOSITION_REASON_TAGS.includes(tag)))
      fail(
        "evaluation.pairwise.unknown-composition-tag",
        "A composition reason cannot be interpreted consistently.",
        "Use a bounded composition reason tag.",
      );
    if (response.renderingReasonTags?.some((tag) => !RENDERING_REASON_TAGS.includes(tag)))
      fail(
        "evaluation.pairwise.unknown-rendering-tag",
        "A rendering reason cannot be interpreted consistently.",
        "Use a bounded rendering reason tag.",
      );
    if (response.revisionKind !== undefined && !["blind", "analysis-assisted"].includes(response.revisionKind))
      fail(
        "evaluation.pairwise.invalid-revision-kind",
        "The response cannot be classified as blind or analysis-assisted.",
        "Use blind or analysis-assisted revisionKind.",
      );
    if (response.reviewedAt !== undefined && !Number.isFinite(Date.parse(response.reviewedAt)))
      fail(
        "evaluation.pairwise.invalid-review-timestamp",
        "The optional review timestamp is not a reproducible ISO date-time.",
        "Use an ISO 8601 timestamp or omit reviewedAt.",
      );
  }
}

export function summarizePairwiseLabels(
  bundle: PairwiseBundleManifest,
  responseSet: PairwiseResponseSet,
): PairwiseLabelSummary {
  validatePairwiseResponses(bundle, responseSet);
  const counts = { tie: 0, cannotJudge: 0, notReviewed: 0, renderingOnly: 0, trainable: 0 };
  for (const response of responseSet.responses) {
    if (response.preferredSide === "tie") counts.tie += 1;
    if (response.preferredSide === "cannot-judge") counts.cannotJudge += 1;
    if (response.preferredSide === "not-reviewed") counts.notReviewed += 1;
    const renderingOnly =
      (response.renderingReasonTags?.length ?? 0) > 0 && (response.compositionReasonTags?.length ?? 0) === 0;
    if (renderingOnly) counts.renderingOnly += 1;
    if (
      (response.preferredSide === "a" || response.preferredSide === "b") &&
      !renderingOnly &&
      response.revisionKind !== "analysis-assisted"
    )
      counts.trainable += 1;
  }
  return {
    totalComparisons: bundle.comparisons.length,
    responseCount: responseSet.responses.length,
    trainableLabelCount: counts.trainable,
    tieCount: counts.tie,
    cannotJudgeCount: counts.cannotJudge,
    notReviewedCount: counts.notReviewed + bundle.comparisons.length - responseSet.responses.length,
    renderingOnlyCount: counts.renderingOnly,
    listeningGap: counts.trainable === 0,
    warnings: responseSet.responses
      .flatMap(responseWarnings)
      .sort((a, b) => a.comparisonId.localeCompare(b.comparisonId) || a.id.localeCompare(b.id)),
  };
}

function responseWarnings(response: PairwiseResponse): { comparisonId: string; id: string; action: string }[] {
  const warnings: { comparisonId: string; id: string; action: string }[] = [];
  if (response.preferredSide === "cannot-judge" && (response.compositionReasonTags?.length ?? 0) > 0)
    warnings.push({
      comparisonId: response.comparisonId,
      id: "evaluation.pairwise.cannot-judge-composition-reason",
      action: "Remove composition reasons or replace cannot-judge with the intended final choice.",
    });
  if (
    (response.preferredSide === "a" || response.preferredSide === "b") &&
    response.renderingReasonTags?.includes("renderer-mismatch")
  )
    warnings.push({
      comparisonId: response.comparisonId,
      id: "evaluation.pairwise.preference-with-renderer-mismatch",
      action: "Use cannot-judge or confirm that a separate composition reason supports the preference.",
    });
  if (
    response.preferredSide === "not-reviewed" &&
    (response.confidence !== undefined ||
      (response.compositionReasonTags?.length ?? 0) > 0 ||
      (response.renderingReasonTags?.length ?? 0) > 0 ||
      response.note !== undefined)
  )
    warnings.push({
      comparisonId: response.comparisonId,
      id: "evaluation.pairwise.unanswered-with-review-metadata",
      action: "Clear review metadata or save an explicit final choice.",
    });
  return warnings;
}

export function mergePairwiseResponses(
  bundle: PairwiseBundleManifest,
  sets: readonly PairwiseResponseSet[],
): PairwiseResponseSet {
  for (const set of sets) validatePairwiseResponses(bundle, set);
  const responses = new Map<string, PairwiseResponse>();
  for (const response of sets.flatMap((set) => set.responses)) {
    const previous = responses.get(response.comparisonId);
    if (previous !== undefined && stableJson(previous) !== stableJson(response))
      fail(
        "evaluation.pairwise.conflicting-label",
        "Response sets contain different labels for one immutable comparison.",
        "Resolve the conflict explicitly before merging response sets.",
      );
    responses.set(response.comparisonId, canonicalize(response));
  }
  return {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId: bundle.bundleId,
    responses: [...responses.values()].sort((a, b) => a.comparisonId.localeCompare(b.comparisonId)),
  };
}

function stableJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item)) as T;
  if (typeof value === "object" && value !== null)
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonicalize(item)]),
    ) as T;
  return value;
}

function safeRelativeAsset(asset: string): boolean {
  return asset.length > 0 && !asset.startsWith("/") && !asset.includes("\\") && !asset.split("/").includes("..");
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function fail(id: string, why: string, action: string): never {
  throw new EvaluationContractError({ id, why, action });
}
