import { TICKS_PER_QUARTER, VOICES } from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";

export type ReferenceSourceFormat = "profile-fixture" | "musicxml" | "humdrum";

export type ReferenceManifestFormat = "metadata-only" | "musicxml" | "humdrum";

export type ReferenceRedistributionPolicy = "redistributable" | "metadata-only" | "local-import-only";

export type ReferenceProfileFamily = "fugue-reference";

export type ReferenceSourceMetadata = {
  sourceId: string;
  composer: string;
  title: string;
  edition: string;
  sourceFormat: ReferenceSourceFormat;
  license: string;
  importedAt: string;
  redistributionPolicy: ReferenceRedistributionPolicy;
  scoreFileRedistributed: boolean;
  profileFamily: ReferenceProfileFamily;
  normalizerAxes: readonly ReferenceNormalizerAxis[];
  notes: string;
};

export type ReferenceMetricNormalizer =
  | "score-quarter-notes"
  | "estimated-active-voice-pair-quarter-notes"
  | "subject-entry-count"
  | "section-count"
  | "already-normalized";

export type ReferenceMetricAxis =
  | "sharedRhythmOverlapPerVoicePairQuarter"
  | "unisonOverlapPerVoicePairQuarter"
  | "samePitchOverlapPerVoicePairQuarter"
  | "severeEntryIntervalPerEntry"
  | "unresolvedSevereEntryIntervalPerEntry"
  | "leapRecoveryMissesPerQuarter"
  | "freeCounterpointStepwiseRunRatio"
  | "freeCounterpointRepeatedDegreePatternsPerQuarter"
  | "unsupportedSoloRunsPerSection"
  | "abruptTextureDropsPerSection";

export type ReferenceMetricBand = {
  axis: ReferenceMetricAxis;
  label: string;
  normalizer: ReferenceMetricNormalizer;
  referenceMin: number;
  referenceMax: number;
  referenceMedian: number;
  direction: "two-sided";
  description: string;
};

export type ReferenceNormalizerAxis = {
  axis: ReferenceMetricAxis;
  normalizer: ReferenceMetricNormalizer;
};

export type ReferenceManifestRecord = {
  sourceId: string;
  composer: string;
  title: string;
  edition: string;
  license: string;
  importedAt: string;
  format: ReferenceManifestFormat;
  redistributionPolicy: ReferenceRedistributionPolicy;
  profileFamily: ReferenceProfileFamily;
  scoreFileRedistributed: boolean;
  normalizerAxes: readonly ReferenceNormalizerAxis[];
  sourceLocation?: string;
  notes?: string;
};

export type ReferenceCorpusManifest = {
  schemaVersion: 1;
  records: readonly ReferenceManifestRecord[];
};

export type ReferenceProfileIngestionPlan = {
  supportedFormats: readonly Extract<ReferenceSourceFormat, "musicxml" | "humdrum">[];
  scoreEventMapping: readonly string[];
  pendingWork: readonly string[];
};

export type ReferenceDiagnosticsProfile = {
  profileId: string;
  version: 1;
  styleFamily: "fugue-reference";
  createdAt: string;
  sourcePolicy: string;
  importManifest: ReferenceCorpusManifest;
  sources: readonly ReferenceSourceMetadata[];
  ingestionPlan: ReferenceProfileIngestionPlan;
  metrics: readonly ReferenceMetricBand[];
};

export type NormalizedReferenceMetrics = Record<ReferenceMetricAxis, number>;

export type ReferenceMetricComparison = ReferenceMetricBand & {
  value: number;
  status: "within-reference" | "below-reference" | "above-reference";
  distance: number;
};

export type ReferenceDiagnosticsComparison = {
  profileId: string;
  profileVersion: number;
  seed: string;
  generatedUntilTick: number;
  normalizers: {
    scoreQuarterNotes: number;
    estimatedActiveVoicePairQuarterNotes: number;
    subjectEntryCount: number;
    sectionCount: number;
  };
  metrics: ReferenceMetricComparison[];
  outsideReferenceCount: number;
  maxDistance: number;
  reviewStatus: "within-reference-profile" | "reference-review-required";
};

export type ReferenceProfileSummary = {
  profileId: string;
  version: number;
  styleFamily: ReferenceDiagnosticsProfile["styleFamily"];
  sourcePolicy: string;
  importManifest: ReferenceCorpusManifest;
  sources: readonly ReferenceSourceMetadata[];
  ingestionPlan: ReferenceProfileIngestionPlan;
  metricAxes: ReferenceMetricAxis[];
};

export type NormalizedReferenceDiagnosticAxis = ReferenceNormalizerAxis & {
  value: number;
};

export type NormalizedReferenceDiagnostics = {
  sourceId: string;
  profileFamily: ReferenceProfileFamily;
  format: ReferenceManifestFormat;
  redistributionPolicy: ReferenceRedistributionPolicy;
  normalizers: ReferenceDiagnosticsComparison["normalizers"];
  axes: readonly NormalizedReferenceDiagnosticAxis[];
};

export type ReferenceDiagnosticsAggregate = {
  profile: ReferenceProfileSummary;
  seedCount: number;
  axes: {
    axis: ReferenceMetricAxis;
    normalizer: ReferenceMetricNormalizer;
    referenceMin: number;
    referenceMax: number;
    averageValue: number;
    minValue: number;
    maxValue: number;
    outsideReferenceSeedCount: number;
    maxDistance: number;
  }[];
  outsideReferenceSeedCount: number;
  maxDistance: number;
};

const VOICE_PAIR_COUNT = (VOICES.length * (VOICES.length - 1)) / 2;

const REFERENCE_METRIC_NORMALIZERS = {
  sharedRhythmOverlapPerVoicePairQuarter: "estimated-active-voice-pair-quarter-notes",
  unisonOverlapPerVoicePairQuarter: "estimated-active-voice-pair-quarter-notes",
  samePitchOverlapPerVoicePairQuarter: "estimated-active-voice-pair-quarter-notes",
  severeEntryIntervalPerEntry: "subject-entry-count",
  unresolvedSevereEntryIntervalPerEntry: "subject-entry-count",
  leapRecoveryMissesPerQuarter: "score-quarter-notes",
  freeCounterpointStepwiseRunRatio: "already-normalized",
  freeCounterpointRepeatedDegreePatternsPerQuarter: "score-quarter-notes",
  unsupportedSoloRunsPerSection: "section-count",
  abruptTextureDropsPerSection: "section-count",
} as const satisfies Record<ReferenceMetricAxis, ReferenceMetricNormalizer>;

const REFERENCE_METRIC_AXES = Object.keys(REFERENCE_METRIC_NORMALIZERS) as ReferenceMetricAxis[];
const REFERENCE_NORMALIZERS = [
  "score-quarter-notes",
  "estimated-active-voice-pair-quarter-notes",
  "subject-entry-count",
  "section-count",
  "already-normalized",
] as const satisfies ReferenceMetricNormalizer[];
const REFERENCE_MANIFEST_FORMATS = [
  "metadata-only",
  "musicxml",
  "humdrum",
] as const satisfies ReferenceManifestFormat[];
const REFERENCE_REDISTRIBUTION_POLICIES = [
  "redistributable",
  "metadata-only",
  "local-import-only",
] as const satisfies ReferenceRedistributionPolicy[];

export const REFERENCE_CORPUS_MANIFEST: ReferenceCorpusManifest = {
  schemaVersion: 1,
  records: [
    {
      sourceId: "bach-wtc-fugue-reference-fixture",
      composer: "J. S. Bach",
      title: "Well-Tempered Clavier fugue reference fixture",
      edition: "metadata-only profile fixture",
      license: "metadata-only profile fixture; verify source score license before importing",
      importedAt: "2026-05-17",
      format: "metadata-only",
      redistributionPolicy: "metadata-only",
      profileFamily: "fugue-reference",
      scoreFileRedistributed: false,
      normalizerAxes: REFERENCE_METRIC_AXES.map((axis) => ({
        axis,
        normalizer: REFERENCE_METRIC_NORMALIZERS[axis],
      })),
      notes:
        "Placeholder profile for first reviewable reference-relative diagnostics. Replace with MusicXML or Humdrum-derived percentile bands after score ingestion lands.",
    },
  ],
};

export const REFERENCE_DIAGNOSTICS_PROFILE: ReferenceDiagnosticsProfile = {
  profileId: "phase-7-fugue-reference-profile",
  version: 1,
  styleFamily: "fugue-reference",
  createdAt: "2026-05-17",
  sourcePolicy:
    "Metadata-only manifest profile. Score files are not redistributed; each MusicXML or Humdrum import must verify license metadata before becoming source data.",
  importManifest: REFERENCE_CORPUS_MANIFEST,
  sources: REFERENCE_CORPUS_MANIFEST.records.map((record) => ({
    sourceId: record.sourceId,
    composer: record.composer,
    title: record.title,
    edition: record.edition,
    sourceFormat: record.format === "metadata-only" ? "profile-fixture" : record.format,
    license: record.license,
    importedAt: record.importedAt,
    redistributionPolicy: record.redistributionPolicy,
    scoreFileRedistributed: record.scoreFileRedistributed,
    profileFamily: record.profileFamily,
    normalizerAxes: record.normalizerAxes,
    notes: record.notes ?? "",
  })),
  ingestionPlan: {
    supportedFormats: ["musicxml", "humdrum"],
    scoreEventMapping: [
      "preserve part or spine voice identity",
      "map measure offsets to tick positions with time-signature metadata",
      "map notes and rests into ScoreEvent-compatible note windows",
      "preserve source id, edition, license, and import date in the manifest",
    ],
    pendingWork: [
      "derive active voice-pair duration from imported note windows",
      "detect subject entries from annotated or matched reference material",
      "split tonal, modal, fugue, and chorale profiles before gating",
    ],
  },
  metrics: [
    {
      axis: "sharedRhythmOverlapPerVoicePairQuarter",
      label: "shared rhythm overlap per voice-pair quarter",
      normalizer: "estimated-active-voice-pair-quarter-notes",
      referenceMin: 0.1,
      referenceMax: 1.45,
      referenceMedian: 0.55,
      direction: "two-sided",
      description: "Shared rhythm is compared as density, not as a zero-required defect.",
    },
    {
      axis: "unisonOverlapPerVoicePairQuarter",
      label: "pitch-class unison overlap per voice-pair quarter",
      normalizer: "estimated-active-voice-pair-quarter-notes",
      referenceMin: 0.05,
      referenceMax: 1.25,
      referenceMedian: 0.42,
      direction: "two-sided",
      description: "Pitch-class unisons can be contextual and are normalized by estimated pair activity.",
    },
    {
      axis: "samePitchOverlapPerVoicePairQuarter",
      label: "exact same-pitch overlap per voice-pair quarter",
      normalizer: "estimated-active-voice-pair-quarter-notes",
      referenceMin: 0,
      referenceMax: 0.12,
      referenceMedian: 0.03,
      direction: "two-sided",
      description: "Exact pitch lockstep remains rare but is still compared as a rate.",
    },
    {
      axis: "severeEntryIntervalPerEntry",
      label: "severe entry intervals per subject entry",
      normalizer: "subject-entry-count",
      referenceMin: 0,
      referenceMax: 4,
      referenceMedian: 1.2,
      direction: "two-sided",
      description: "Entry-local seconds and sevenths are evaluated per entry so longer scores do not inflate risk.",
    },
    {
      axis: "unresolvedSevereEntryIntervalPerEntry",
      label: "unresolved severe entry intervals per subject entry",
      normalizer: "subject-entry-count",
      referenceMin: 0,
      referenceMax: 2.8,
      referenceMedian: 0.8,
      direction: "two-sided",
      description: "Unresolved entry interval risk is separated from total severe entry interval density.",
    },
    {
      axis: "leapRecoveryMissesPerQuarter",
      label: "leap recovery misses per quarter",
      normalizer: "score-quarter-notes",
      referenceMin: 0,
      referenceMax: 0.2,
      referenceMedian: 0.06,
      direction: "two-sided",
      description: "Melodic recovery risk is normalized by score length.",
    },
    {
      axis: "freeCounterpointStepwiseRunRatio",
      label: "free counterpoint stepwise run ratio",
      normalizer: "already-normalized",
      referenceMin: 0.25,
      referenceMax: 0.82,
      referenceMedian: 0.55,
      direction: "two-sided",
      description: "Stepwise motion is expected in context; only distributional outliers need review.",
    },
    {
      axis: "freeCounterpointRepeatedDegreePatternsPerQuarter",
      label: "free counterpoint repeated degree patterns per quarter",
      normalizer: "score-quarter-notes",
      referenceMin: 0,
      referenceMax: 3.6,
      referenceMedian: 1.1,
      direction: "two-sided",
      description: "Repeated degree patterns are scaled by duration before comparing fixation risk.",
    },
    {
      axis: "unsupportedSoloRunsPerSection",
      label: "unsupported solo runs per section",
      normalizer: "section-count",
      referenceMin: 0,
      referenceMax: 1.2,
      referenceMedian: 0.25,
      direction: "two-sided",
      description: "Solo texture risk is compared against section count rather than absolute length.",
    },
    {
      axis: "abruptTextureDropsPerSection",
      label: "abrupt texture drops per section",
      normalizer: "section-count",
      referenceMin: 0,
      referenceMax: 1.2,
      referenceMedian: 0.25,
      direction: "two-sided",
      description: "Abrupt density changes are section-normalized for long-run review.",
    },
  ],
} as const;

export function summarizeReferenceProfile(
  profile: ReferenceDiagnosticsProfile = REFERENCE_DIAGNOSTICS_PROFILE,
): ReferenceProfileSummary {
  return {
    profileId: profile.profileId,
    version: profile.version,
    styleFamily: profile.styleFamily,
    sourcePolicy: profile.sourcePolicy,
    importManifest: profile.importManifest,
    sources: profile.sources,
    ingestionPlan: profile.ingestionPlan,
    metricAxes: profile.metrics.map((metric) => metric.axis),
  };
}

export function parseReferenceCorpusManifest(input: unknown): ReferenceCorpusManifest {
  if (!isRecord(input)) {
    throw new Error("reference corpus manifest must be an object");
  }
  if (input.schemaVersion !== 1) {
    throw new Error("reference corpus manifest schemaVersion must be 1");
  }
  if (!Array.isArray(input.records)) {
    throw new Error("reference corpus manifest records must be an array");
  }
  return {
    schemaVersion: 1,
    records: input.records.map(validateReferenceManifestRecord),
  };
}

export function validateReferenceManifestRecord(input: unknown): ReferenceManifestRecord {
  if (!isRecord(input)) {
    throw new Error("reference manifest record must be an object");
  }
  const sourceId = requireNonEmptyString(input, "sourceId");
  const composer = requireNonEmptyString(input, "composer");
  const title = requireNonEmptyString(input, "title");
  const edition = requireNonEmptyString(input, "edition");
  const license = requireNonEmptyString(input, "license");
  const importedAt = requireImportDate(input.importedAt);
  const format = requireEnumValue(input.format, REFERENCE_MANIFEST_FORMATS, "format");
  const redistributionPolicy = requireEnumValue(
    input.redistributionPolicy,
    REFERENCE_REDISTRIBUTION_POLICIES,
    "redistributionPolicy",
  );
  const profileFamily = requireEnumValue(input.profileFamily, ["fugue-reference"] as const, "profileFamily");
  const scoreFileRedistributed = input.scoreFileRedistributed === true;
  const normalizerAxes = requireNormalizerAxes(input.normalizerAxes);
  const sourceLocation = optionalRelativeLocation(input.sourceLocation);
  const notes = optionalNonEmptyString(input.notes, "notes");

  if (format === "metadata-only" && redistributionPolicy !== "metadata-only") {
    throw new Error("metadata-only manifest records must use redistributionPolicy metadata-only");
  }
  if (redistributionPolicy !== "redistributable" && scoreFileRedistributed) {
    throw new Error("manifest records with metadata-only or local-import-only policy cannot redistribute score files");
  }

  return {
    sourceId,
    composer,
    title,
    edition,
    license,
    importedAt,
    format,
    redistributionPolicy,
    profileFamily,
    scoreFileRedistributed,
    normalizerAxes,
    ...(sourceLocation === undefined ? {} : { sourceLocation }),
    ...(notes === undefined ? {} : { notes }),
  };
}

export function normalizeDiagnosticsForReference(diagnostics: GenerationDiagnostics): NormalizedReferenceMetrics {
  const normalizers = referenceNormalizers(diagnostics);
  const freeCounterpoint = diagnostics.stepwisePattern.roles.find((summary) => summary.role === "free-counterpoint");

  return {
    sharedRhythmOverlapPerVoicePairQuarter: roundMetric(
      diagnostics.sharedRhythmOverlapCount / normalizers.estimatedActiveVoicePairQuarterNotes,
    ),
    unisonOverlapPerVoicePairQuarter: roundMetric(
      diagnostics.unisonOverlapCount / normalizers.estimatedActiveVoicePairQuarterNotes,
    ),
    samePitchOverlapPerVoicePairQuarter: roundMetric(
      diagnostics.samePitchOverlapCount / normalizers.estimatedActiveVoicePairQuarterNotes,
    ),
    severeEntryIntervalPerEntry: roundMetric(diagnostics.severeEntryIntervalCount / normalizers.subjectEntryCount),
    unresolvedSevereEntryIntervalPerEntry: roundMetric(
      diagnostics.unresolvedSevereEntryIntervalCount / normalizers.subjectEntryCount,
    ),
    leapRecoveryMissesPerQuarter: roundMetric(diagnostics.leapRecoveryMisses / normalizers.scoreQuarterNotes),
    freeCounterpointStepwiseRunRatio: roundMetric(freeCounterpoint?.stepwiseRunRatio ?? 0),
    freeCounterpointRepeatedDegreePatternsPerQuarter: roundMetric(
      (freeCounterpoint?.repeatedDegreePatternCount ?? 0) / normalizers.scoreQuarterNotes,
    ),
    unsupportedSoloRunsPerSection: roundMetric(
      diagnostics.soloTexture.unsupportedSoloRunCount / normalizers.sectionCount,
    ),
    abruptTextureDropsPerSection: roundMetric(
      diagnostics.soloTexture.abruptTextureDropCount / normalizers.sectionCount,
    ),
  };
}

export function createNormalizedReferenceDiagnostics(
  manifestRecord: ReferenceManifestRecord,
  diagnostics: GenerationDiagnostics,
): NormalizedReferenceDiagnostics {
  const values = normalizeDiagnosticsForReference(diagnostics);
  return {
    sourceId: manifestRecord.sourceId,
    profileFamily: manifestRecord.profileFamily,
    format: manifestRecord.format,
    redistributionPolicy: manifestRecord.redistributionPolicy,
    normalizers: referenceNormalizers(diagnostics),
    axes: manifestRecord.normalizerAxes.map((axis) => ({
      ...axis,
      value: values[axis.axis],
    })),
  };
}

export function compareDiagnosticsToReferenceProfile(
  diagnostics: GenerationDiagnostics,
  profile: ReferenceDiagnosticsProfile = REFERENCE_DIAGNOSTICS_PROFILE,
): ReferenceDiagnosticsComparison {
  const values = normalizeDiagnosticsForReference(diagnostics);
  const metrics = profile.metrics.map<ReferenceMetricComparison>((metric) => {
    const value = values[metric.axis];
    return {
      ...metric,
      value,
      ...compareReferenceMetricValue(metric, value),
    };
  });
  const maxDistance = roundMetric(maximum(metrics.map((metric) => metric.distance)));
  const outsideReferenceCount = metrics.filter((metric) => metric.status !== "within-reference").length;

  return {
    profileId: profile.profileId,
    profileVersion: profile.version,
    seed: diagnostics.seed,
    generatedUntilTick: diagnostics.generatedUntilTick,
    normalizers: referenceNormalizers(diagnostics),
    metrics,
    outsideReferenceCount,
    maxDistance,
    reviewStatus: outsideReferenceCount === 0 ? "within-reference-profile" : "reference-review-required",
  };
}

export function compareReferenceMetricValue(
  metric: Pick<ReferenceMetricBand, "referenceMin" | "referenceMax">,
  value: number,
): Pick<ReferenceMetricComparison, "status" | "distance"> {
  const status =
    value < metric.referenceMin
      ? "below-reference"
      : value > metric.referenceMax
        ? "above-reference"
        : "within-reference";

  return {
    status,
    distance: referenceDistance(value, metric.referenceMin, metric.referenceMax),
  };
}

export function summarizeReferenceDiagnosticsComparisons(
  comparisons: readonly ReferenceDiagnosticsComparison[],
  profile: ReferenceDiagnosticsProfile = REFERENCE_DIAGNOSTICS_PROFILE,
): ReferenceDiagnosticsAggregate {
  return {
    profile: summarizeReferenceProfile(profile),
    seedCount: comparisons.length,
    axes: profile.metrics.map((metric) => {
      const axisComparisons = comparisons.map((comparison) => requireMetricComparison(comparison.metrics, metric.axis));
      return {
        axis: metric.axis,
        normalizer: metric.normalizer,
        referenceMin: metric.referenceMin,
        referenceMax: metric.referenceMax,
        averageValue: roundMetric(average(axisComparisons.map((comparison) => comparison.value))),
        minValue: roundMetric(minimum(axisComparisons.map((comparison) => comparison.value))),
        maxValue: roundMetric(maximum(axisComparisons.map((comparison) => comparison.value))),
        outsideReferenceSeedCount: axisComparisons.filter((comparison) => comparison.status !== "within-reference")
          .length,
        maxDistance: roundMetric(maximum(axisComparisons.map((comparison) => comparison.distance))),
      };
    }),
    outsideReferenceSeedCount: comparisons.filter((comparison) => comparison.outsideReferenceCount > 0).length,
    maxDistance: roundMetric(maximum(comparisons.map((comparison) => comparison.maxDistance))),
  };
}

function referenceNormalizers(diagnostics: GenerationDiagnostics): ReferenceDiagnosticsComparison["normalizers"] {
  const scoreQuarterNotes = Math.max(1, diagnostics.generatedUntilTick / TICKS_PER_QUARTER);
  return {
    scoreQuarterNotes: roundMetric(scoreQuarterNotes),
    estimatedActiveVoicePairQuarterNotes: roundMetric(Math.max(1, scoreQuarterNotes * VOICE_PAIR_COUNT)),
    subjectEntryCount: Math.max(1, diagnostics.subjectEntries.length),
    sectionCount: Math.max(1, diagnostics.sectionPlans.length),
  };
}

function referenceDistance(value: number, referenceMin: number, referenceMax: number): number {
  if (value < referenceMin) {
    return roundMetric((referenceMin - value) / Math.max(1, referenceMin));
  }
  if (value > referenceMax) {
    return roundMetric((value - referenceMax) / Math.max(1, referenceMax));
  }
  return 0;
}

function requireMetricComparison(
  comparisons: readonly ReferenceMetricComparison[],
  axis: ReferenceMetricAxis,
): ReferenceMetricComparison {
  const comparison = comparisons.find((candidate) => candidate.axis === axis);
  if (comparison === undefined) {
    throw new Error(`missing reference metric comparison for ${axis}`);
  }
  return comparison;
}

function requireNormalizerAxes(input: unknown): ReferenceNormalizerAxis[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error("reference manifest normalizerAxes must be a non-empty array");
  }
  const seen = new Set<ReferenceMetricAxis>();
  return input.map((candidate, index) => {
    if (!isRecord(candidate)) {
      throw new Error(`reference manifest normalizerAxes[${index}] must be an object`);
    }
    const axis = requireEnumValue(candidate.axis, REFERENCE_METRIC_AXES, `normalizerAxes[${index}].axis`);
    const normalizer = requireEnumValue(
      candidate.normalizer,
      REFERENCE_NORMALIZERS,
      `normalizerAxes[${index}].normalizer`,
    );
    if (seen.has(axis)) {
      throw new Error(`reference manifest normalizerAxes contains duplicate axis ${axis}`);
    }
    seen.add(axis);
    const expected = REFERENCE_METRIC_NORMALIZERS[axis];
    if (normalizer !== expected) {
      throw new Error(`reference manifest axis ${axis} must use normalizer ${expected}`);
    }
    return { axis, normalizer };
  });
}

function requireNonEmptyString(input: Record<string, unknown>, field: string): string {
  const value = input[field];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`reference manifest ${field} must be a non-empty string`);
  }
  return value;
}

function optionalNonEmptyString(input: unknown, field: string): string | undefined {
  if (input === undefined) {
    return undefined;
  }
  if (typeof input !== "string" || input.trim().length === 0) {
    throw new Error(`reference manifest ${field} must be a non-empty string when provided`);
  }
  return input;
}

function optionalRelativeLocation(input: unknown): string | undefined {
  const value = optionalNonEmptyString(input, "sourceLocation");
  if (value === undefined) {
    return undefined;
  }
  if (value.startsWith("/") || value.startsWith("~/") || /^[A-Za-z]:[\\/]/.test(value)) {
    throw new Error("reference manifest sourceLocation must be relative");
  }
  return value;
}

function requireImportDate(input: unknown): string {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    throw new Error("reference manifest importedAt must use YYYY-MM-DD");
  }
  return input;
}

function requireEnumValue<const Value extends string>(input: unknown, allowed: readonly Value[], field: string): Value {
  if (typeof input !== "string" || !allowed.includes(input as Value)) {
    throw new Error(`reference manifest ${field} must be one of ${allowed.join(", ")}`);
  }
  return input as Value;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function maximum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.max(...values);
}

function minimum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.min(...values);
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}
