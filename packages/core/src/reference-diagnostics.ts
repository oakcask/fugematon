import { TICKS_PER_QUARTER, VOICES } from "./constants.js";
import type { GenerationDiagnostics } from "./events.js";

export type ReferenceSourceFormat = "profile-fixture" | "musicxml" | "humdrum";

export type ReferenceSourceMetadata = {
  sourceId: string;
  composer: string;
  title: string;
  sourceFormat: ReferenceSourceFormat;
  license: string;
  importedAt: string;
  scoreFileRedistributed: boolean;
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
  sources: readonly ReferenceSourceMetadata[];
  ingestionPlan: ReferenceProfileIngestionPlan;
  metricAxes: ReferenceMetricAxis[];
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

export const PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE: ReferenceDiagnosticsProfile = {
  profileId: "phase-7-fugue-reference-profile",
  version: 1,
  styleFamily: "fugue-reference",
  createdAt: "2026-05-17",
  sourcePolicy:
    "Metadata-only seed profile. Score files are not redistributed; each MusicXML or Humdrum import must verify license metadata before becoming source data.",
  sources: [
    {
      sourceId: "bach-wtc-fugue-reference-fixture",
      composer: "J. S. Bach",
      title: "Well-Tempered Clavier fugue reference fixture",
      sourceFormat: "profile-fixture",
      license: "metadata-only profile fixture; verify source score license before importing",
      importedAt: "2026-05-17",
      scoreFileRedistributed: false,
      notes:
        "Placeholder profile for first reviewable reference-relative diagnostics. Replace with MusicXML or Humdrum-derived percentile bands after score ingestion lands.",
    },
  ],
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
  profile: ReferenceDiagnosticsProfile = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
): ReferenceProfileSummary {
  return {
    profileId: profile.profileId,
    version: profile.version,
    styleFamily: profile.styleFamily,
    sourcePolicy: profile.sourcePolicy,
    sources: profile.sources,
    ingestionPlan: profile.ingestionPlan,
    metricAxes: profile.metrics.map((metric) => metric.axis),
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

export function compareDiagnosticsToReferenceProfile(
  diagnostics: GenerationDiagnostics,
  profile: ReferenceDiagnosticsProfile = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
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
  profile: ReferenceDiagnosticsProfile = PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
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
