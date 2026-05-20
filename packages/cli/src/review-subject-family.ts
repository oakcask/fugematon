import type { GenerationDiagnostics, KeyMode } from "@fugematon/core";

export type InitialSubjectProfile = {
  degreePattern: number[];
  rhythmPattern: number[];
  contourClass: string;
  localClimaxIndex: number;
  tailMotion: "ascending" | "descending" | "repeated";
  mode: KeyMode;
  answerCompatibility: "true-answer" | "tonal-answer" | "none";
};

export type SubjectFamilyDiversitySummary = {
  schemaVersion: 1;
  seedCount: number;
  uniqueInitialSubjectFamilyCount: number;
  topInitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  initialSubjectFamilyEntropy: number;
  findings: SubjectFamilyDiversityFinding[];
  initialSubjectFamilies: SubjectFamilySummary[];
  subjectFragmentFamilies: SubjectFragmentFamilySummary[];
};

export type SubjectFamilyDiversityFinding = {
  code: "initial-subject-family-concentration" | "subject-fragment-vocabulary-collapse";
  severity: "review-required";
  metric: string;
  actual: number;
  expected: string;
  message: string;
};

export type SubjectFamilySummary = {
  degreePattern: number[];
  rhythmPattern: number[];
  contourClass: string;
  localClimaxIndex: number;
  tailMotion: "ascending" | "descending" | "repeated";
  modes: KeyMode[];
  answerCompatibility: InitialSubjectProfile["answerCompatibility"][];
  seedCount: number;
  share: number;
  seeds: string[];
};

export type SubjectFragmentFamilySummary = {
  pattern: number[];
  seedCount: number;
  share: number;
  seeds: string[];
};

type SubjectFamilySeed = {
  seed: string;
  initialSubjectProfile: InitialSubjectProfile;
  diagnosticsSummary: {
    phase12Review: GenerationDiagnostics["phase12Review"];
  };
};

export function summarizeSubjectFamilyDiversity(seeds: readonly SubjectFamilySeed[]): SubjectFamilyDiversitySummary {
  const initialSubjectFamilies = summarizeInitialSubjectFamilies(seeds);
  const subjectFragmentFamilies = summarizeSubjectFragmentFamilies(seeds);
  const topInitialSubjectFamilyShare = initialSubjectFamilies[0]?.share ?? 0;
  const topInitialSubjectFragmentFamilyShare = subjectFragmentFamilies[0]?.share ?? 0;
  const findings = summarizeFindings({
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    topInitialSubjectFamilyShare,
    topInitialSubjectFragmentFamilyShare,
  });

  return {
    schemaVersion: 1,
    seedCount: seeds.length,
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    topInitialSubjectFamilyShare,
    topInitialSubjectFragmentFamilyShare,
    initialSubjectFamilyEntropy: roundRatio(
      entropy(initialSubjectFamilies.map((family) => family.seedCount / Math.max(1, seeds.length))),
    ),
    findings,
    initialSubjectFamilies: initialSubjectFamilies.slice(0, 8),
    subjectFragmentFamilies: subjectFragmentFamilies.slice(0, 8),
  };
}

export function compareSubjectFamilyDiversity(
  baseline: SubjectFamilyDiversitySummary,
  variant: SubjectFamilyDiversitySummary,
): {
  baseline: SubjectFamilyDiversitySummary;
  variant: SubjectFamilyDiversitySummary;
  deltas: {
    uniqueInitialSubjectFamilyCount: number;
    topInitialSubjectFamilyShare: number;
    topInitialSubjectFragmentFamilyShare: number;
    findingCount: number;
  };
  improvements: string[];
  regressions: string[];
} {
  const deltas = {
    uniqueInitialSubjectFamilyCount: variant.uniqueInitialSubjectFamilyCount - baseline.uniqueInitialSubjectFamilyCount,
    topInitialSubjectFamilyShare: roundRatio(
      variant.topInitialSubjectFamilyShare - baseline.topInitialSubjectFamilyShare,
    ),
    topInitialSubjectFragmentFamilyShare: roundRatio(
      variant.topInitialSubjectFragmentFamilyShare - baseline.topInitialSubjectFragmentFamilyShare,
    ),
    findingCount: variant.findings.length - baseline.findings.length,
  };

  return {
    baseline,
    variant,
    deltas,
    improvements: describeImprovements(deltas),
    regressions: describeRegressions(deltas),
  };
}

function summarizeInitialSubjectFamilies(seeds: readonly SubjectFamilySeed[]): SubjectFamilySummary[] {
  const counts = new Map<
    string,
    {
      profile: InitialSubjectProfile;
      seeds: string[];
      modes: Set<KeyMode>;
      answerCompatibility: Set<InitialSubjectProfile["answerCompatibility"]>;
    }
  >();

  for (const seed of seeds) {
    const profile = seed.initialSubjectProfile;
    const key = profile.degreePattern.join("-");
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, {
        profile,
        seeds: [seed.seed],
        modes: new Set([profile.mode]),
        answerCompatibility: new Set([profile.answerCompatibility]),
      });
    } else {
      current.seeds.push(seed.seed);
      current.modes.add(profile.mode);
      current.answerCompatibility.add(profile.answerCompatibility);
    }
  }

  return [...counts.values()]
    .map(({ profile, seeds: familySeeds, modes, answerCompatibility }) => ({
      degreePattern: profile.degreePattern,
      rhythmPattern: profile.rhythmPattern,
      contourClass: profile.contourClass,
      localClimaxIndex: profile.localClimaxIndex,
      tailMotion: profile.tailMotion,
      modes: [...modes].sort(),
      answerCompatibility: [...answerCompatibility].sort(),
      seedCount: familySeeds.length,
      share: roundRatio(familySeeds.length / Math.max(1, seeds.length)),
      seeds: [...familySeeds].sort(),
    }))
    .sort(
      (left, right) =>
        right.seedCount - left.seedCount || left.degreePattern.join("-").localeCompare(right.degreePattern.join("-")),
    );
}

function summarizeSubjectFragmentFamilies(seeds: readonly SubjectFamilySeed[]): SubjectFragmentFamilySummary[] {
  const counts = new Map<string, { pattern: number[]; seeds: Set<string> }>();
  for (const seed of seeds) {
    const topFragment = seed.diagnosticsSummary.phase12Review.subjectStemFamilies.find(
      (family) => family.form === "subject-fragment",
    );
    if (topFragment === undefined) {
      continue;
    }
    const key = topFragment.pattern.join("-");
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { pattern: topFragment.pattern, seeds: new Set([seed.seed]) });
    } else {
      current.seeds.add(seed.seed);
    }
  }

  return [...counts.values()]
    .map(({ pattern, seeds: familySeeds }) => ({
      pattern,
      seedCount: familySeeds.size,
      share: roundRatio(familySeeds.size / Math.max(1, seeds.length)),
      seeds: [...familySeeds].sort(),
    }))
    .sort(
      (left, right) =>
        right.seedCount - left.seedCount || left.pattern.join("-").localeCompare(right.pattern.join("-")),
    );
}

function summarizeFindings({
  uniqueInitialSubjectFamilyCount,
  topInitialSubjectFamilyShare,
  topInitialSubjectFragmentFamilyShare,
}: {
  uniqueInitialSubjectFamilyCount: number;
  topInitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
}): SubjectFamilyDiversityFinding[] {
  const findings: SubjectFamilyDiversityFinding[] = [];

  if (uniqueInitialSubjectFamilyCount < 4 || topInitialSubjectFamilyShare > 0.4) {
    findings.push({
      code: "initial-subject-family-concentration",
      severity: "review-required",
      metric: "uniqueInitialSubjectFamilyCount/topInitialSubjectFamilyShare",
      actual: topInitialSubjectFamilyShare,
      expected: "at least 4 initial subject families and no top family above 0.4 share",
      message: "Initial subjects are concentrated across the review seed bundle.",
    });
  }

  if (topInitialSubjectFragmentFamilyShare > 0.45) {
    findings.push({
      code: "subject-fragment-vocabulary-collapse",
      severity: "review-required",
      metric: "topInitialSubjectFragmentFamilyShare",
      actual: topInitialSubjectFragmentFamilyShare,
      expected: "no top subject-fragment family above 0.45 share",
      message: "Subject fragments are concentrated across the review seed bundle.",
    });
  }

  return findings;
}

function describeImprovements(deltas: {
  uniqueInitialSubjectFamilyCount: number;
  topInitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  findingCount: number;
}): string[] {
  const improvements: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount > 0) {
    improvements.push("unique initial subject family count increased");
  }
  if (deltas.topInitialSubjectFamilyShare < 0) {
    improvements.push("top initial subject family share decreased");
  }
  if (deltas.topInitialSubjectFragmentFamilyShare < 0) {
    improvements.push("top subject-fragment family share decreased");
  }
  if (deltas.findingCount < 0) {
    improvements.push("subject-family diversity finding count decreased");
  }

  return improvements;
}

function describeRegressions(deltas: {
  uniqueInitialSubjectFamilyCount: number;
  topInitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  findingCount: number;
}): string[] {
  const regressions: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount < 0) {
    regressions.push("unique initial subject family count decreased");
  }
  if (deltas.topInitialSubjectFamilyShare > 0) {
    regressions.push("top initial subject family share increased");
  }
  if (deltas.topInitialSubjectFragmentFamilyShare > 0) {
    regressions.push("top subject-fragment family share increased");
  }
  if (deltas.findingCount > 0) {
    regressions.push("subject-family diversity finding count increased");
  }

  return regressions;
}

function entropy(shares: readonly number[]): number {
  return shares.reduce((sum, share) => (share > 0 ? sum - share * Math.log2(share) : sum), 0);
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
