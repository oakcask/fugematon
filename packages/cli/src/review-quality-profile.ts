import type { GenerationDiagnostics } from "@fugematon/core";

export type QualityProfileComparison = {
  schemaVersion: 1;
  modelVersion: GenerationDiagnostics["qualityVector"]["modelVersion"];
  seedCount: number;
  axes: QualityProfileAxisComparison[];
  localSentinelCount: number;
  localSentinelsByKind: { kind: string; count: number }[];
  reviewStatus: "within-quality-profile" | "quality-review-required";
};

export type QualityProfileAxisComparison = {
  axis: string;
  median: number;
  p90: number;
  max: number;
  outsideSeedCount: number;
  topContributingSeeds: { seed: string; value: number; normalizedValue: number }[];
};

type QualityProfileSeed = {
  seed: string;
  diagnosticsSummary: {
    qualityVector: GenerationDiagnostics["qualityVector"];
  };
};

export function summarizeQualityProfileComparison(seeds: readonly QualityProfileSeed[]): QualityProfileComparison {
  const firstVector = seeds[0]?.diagnosticsSummary.qualityVector;
  const axes = firstVector?.axes.map((axisSummary) => summarizeQualityProfileAxis(seeds, axisSummary.axis)) ?? [];
  const localSentinelsByKind = countLocalSentinelsByKind(seeds);
  const localSentinelCount = localSentinelsByKind.reduce((sum, entry) => sum + entry.count, 0);
  const outsideSeedCount = axes.reduce((sum, axis) => sum + axis.outsideSeedCount, 0);

  return {
    schemaVersion: 1,
    modelVersion: firstVector?.modelVersion ?? 1,
    seedCount: seeds.length,
    axes,
    localSentinelCount,
    localSentinelsByKind,
    reviewStatus: outsideSeedCount > 0 || localSentinelCount > 0 ? "quality-review-required" : "within-quality-profile",
  };
}

export function qualityVectorDistance(qualityVector: GenerationDiagnostics["qualityVector"]): number {
  return Math.sqrt(
    qualityVector.axes.reduce((sum, axis) => sum + axis.normalizedValue * axis.normalizedValue * axis.weight, 0),
  );
}

function summarizeQualityProfileAxis(
  seeds: readonly QualityProfileSeed[],
  axis: GenerationDiagnostics["qualityVector"]["axes"][number]["axis"],
): QualityProfileAxisComparison {
  const seedAxes = seeds.map((seed) => {
    const axisSummary = seed.diagnosticsSummary.qualityVector.axes.find((candidate) => candidate.axis === axis);
    return {
      seed: seed.seed,
      value: axisSummary?.value ?? 0,
      normalizedValue: axisSummary?.normalizedValue ?? 0,
      outside: axisSummary?.status === "review-required",
    };
  });

  return {
    axis,
    median: percentile(
      seedAxes.map((entry) => entry.normalizedValue),
      0.5,
    ),
    p90: percentile(
      seedAxes.map((entry) => entry.normalizedValue),
      0.9,
    ),
    max: maximum(seedAxes.map((entry) => entry.normalizedValue)),
    outsideSeedCount: seedAxes.filter((entry) => entry.outside).length,
    topContributingSeeds: seedAxes
      .sort((left, right) => right.normalizedValue - left.normalizedValue || left.seed.localeCompare(right.seed))
      .slice(0, 3)
      .map(({ seed, value, normalizedValue }) => ({
        seed,
        value,
        normalizedValue,
      })),
  };
}

function countLocalSentinelsByKind(seeds: readonly QualityProfileSeed[]): { kind: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const seed of seeds) {
    for (const sentinel of seed.diagnosticsSummary.qualityVector.localSentinels) {
      counts.set(sentinel.kind, (counts.get(sentinel.kind) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([kind, count]) => ({ kind, count }))
    .sort((left, right) => right.count - left.count || left.kind.localeCompare(right.kind));
}

function maximum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}

function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * quantile) - 1));
  return roundRatio(sorted[index]!);
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
