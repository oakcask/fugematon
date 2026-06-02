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
  schemaVersion: 2;
  seedCount: number;
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
  initialSubjectFamilyEntropy: number;
  findings: SubjectFamilyDiversityFinding[];
  initialSubjectFamilies: SubjectFamilySummary[];
  subjectFragmentFamilies: SubjectFragmentFamilySummary[];
};

export type SubjectFamilyDiversityFinding = {
  code:
    | "initial-subject-family-concentration"
    | "initial-subject-top3-concentration"
    | "initial-subject-top5-concentration"
    | "initial-subject-rhythm-collapse"
    | "initial-subject-climax-collapse"
    | "subject-fragment-vocabulary-collapse"
    | "subject-fragment-top3-concentration"
    | "subject-fragment-top5-concentration";
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
    phraseRepetitionReview: GenerationDiagnostics["phraseRepetitionReview"];
  };
};

type InitialSubjectRhetoricDiversity = {
  uniqueRhythmPatternCount: number;
  uniqueClimaxIndexCount: number;
};

export function summarizeSubjectFamilyDiversity(seeds: readonly SubjectFamilySeed[]): SubjectFamilyDiversitySummary {
  const initialSubjectFamilies = summarizeInitialSubjectFamilies(seeds);
  const subjectFragmentFamilies = summarizeSubjectFragmentFamilies(seeds);
  const initialSubjectRhetoric = summarizeInitialSubjectRhetoric(seeds);
  const topInitialSubjectFamilyShare = initialSubjectFamilies[0]?.share ?? 0;
  const top3InitialSubjectFamilyShare = topNFamilyShare(initialSubjectFamilies, 3, seeds.length);
  const top5InitialSubjectFamilyShare = topNFamilyShare(initialSubjectFamilies, 5, seeds.length);
  const topInitialSubjectFragmentFamilyShare = subjectFragmentFamilies[0]?.share ?? 0;
  const top3SubjectFragmentFamilyShare = topNFamilyShare(subjectFragmentFamilies, 3, seeds.length);
  const top5SubjectFragmentFamilyShare = topNFamilyShare(subjectFragmentFamilies, 5, seeds.length);
  const findings = summarizeFindings({
    seedCount: seeds.length,
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    uniqueInitialSubjectRhythmPatternCount: initialSubjectRhetoric.uniqueRhythmPatternCount,
    uniqueInitialSubjectClimaxIndexCount: initialSubjectRhetoric.uniqueClimaxIndexCount,
    topInitialSubjectFamilyShare,
    top3InitialSubjectFamilyShare,
    top5InitialSubjectFamilyShare,
    topInitialSubjectFragmentFamilyShare,
    top3SubjectFragmentFamilyShare,
    top5SubjectFragmentFamilyShare,
  });

  return {
    schemaVersion: 2,
    seedCount: seeds.length,
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    uniqueInitialSubjectRhythmPatternCount: initialSubjectRhetoric.uniqueRhythmPatternCount,
    uniqueInitialSubjectClimaxIndexCount: initialSubjectRhetoric.uniqueClimaxIndexCount,
    topInitialSubjectFamilyShare,
    top3InitialSubjectFamilyShare,
    top5InitialSubjectFamilyShare,
    topInitialSubjectFragmentFamilyShare,
    top3SubjectFragmentFamilyShare,
    top5SubjectFragmentFamilyShare,
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
    uniqueInitialSubjectRhythmPatternCount: number;
    uniqueInitialSubjectClimaxIndexCount: number;
    topInitialSubjectFamilyShare: number;
    top3InitialSubjectFamilyShare: number;
    top5InitialSubjectFamilyShare: number;
    topInitialSubjectFragmentFamilyShare: number;
    top3SubjectFragmentFamilyShare: number;
    top5SubjectFragmentFamilyShare: number;
    findingCount: number;
  };
  improvements: string[];
  regressions: string[];
} {
  const deltas = {
    uniqueInitialSubjectFamilyCount: variant.uniqueInitialSubjectFamilyCount - baseline.uniqueInitialSubjectFamilyCount,
    uniqueInitialSubjectRhythmPatternCount:
      variant.uniqueInitialSubjectRhythmPatternCount - baseline.uniqueInitialSubjectRhythmPatternCount,
    uniqueInitialSubjectClimaxIndexCount:
      variant.uniqueInitialSubjectClimaxIndexCount - baseline.uniqueInitialSubjectClimaxIndexCount,
    topInitialSubjectFamilyShare: roundRatio(
      variant.topInitialSubjectFamilyShare - baseline.topInitialSubjectFamilyShare,
    ),
    top3InitialSubjectFamilyShare: roundRatio(
      variant.top3InitialSubjectFamilyShare - baseline.top3InitialSubjectFamilyShare,
    ),
    top5InitialSubjectFamilyShare: roundRatio(
      variant.top5InitialSubjectFamilyShare - baseline.top5InitialSubjectFamilyShare,
    ),
    topInitialSubjectFragmentFamilyShare: roundRatio(
      variant.topInitialSubjectFragmentFamilyShare - baseline.topInitialSubjectFragmentFamilyShare,
    ),
    top3SubjectFragmentFamilyShare: roundRatio(
      variant.top3SubjectFragmentFamilyShare - baseline.top3SubjectFragmentFamilyShare,
    ),
    top5SubjectFragmentFamilyShare: roundRatio(
      variant.top5SubjectFragmentFamilyShare - baseline.top5SubjectFragmentFamilyShare,
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
    const key = initialSubjectFamilyKey(profile);
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

function summarizeInitialSubjectRhetoric(seeds: readonly SubjectFamilySeed[]): InitialSubjectRhetoricDiversity {
  return {
    uniqueRhythmPatternCount: new Set(seeds.map((seed) => seed.initialSubjectProfile.rhythmPattern.join("-"))).size,
    uniqueClimaxIndexCount: new Set(seeds.map((seed) => seed.initialSubjectProfile.localClimaxIndex)).size,
  };
}

function initialSubjectFamilyKey(profile: InitialSubjectProfile): string {
  return [
    profile.degreePattern.join("-"),
    profile.rhythmPattern.join("-"),
    profile.localClimaxIndex,
    profile.tailMotion,
    profile.contourClass,
  ].join("|");
}

function summarizeSubjectFragmentFamilies(seeds: readonly SubjectFamilySeed[]): SubjectFragmentFamilySummary[] {
  const counts = new Map<string, { pattern: number[]; seeds: Set<string> }>();
  for (const seed of seeds) {
    const topFragment = seed.diagnosticsSummary.phraseRepetitionReview.subjectStemFamilies.find(
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
  seedCount,
  uniqueInitialSubjectFamilyCount,
  uniqueInitialSubjectRhythmPatternCount,
  uniqueInitialSubjectClimaxIndexCount,
  topInitialSubjectFamilyShare,
  top3InitialSubjectFamilyShare,
  top5InitialSubjectFamilyShare,
  topInitialSubjectFragmentFamilyShare,
  top3SubjectFragmentFamilyShare,
  top5SubjectFragmentFamilyShare,
}: {
  seedCount: number;
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
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

  if (seedCount >= 8 && top3InitialSubjectFamilyShare > 0.6) {
    findings.push({
      code: "initial-subject-top3-concentration",
      severity: "review-required",
      metric: "top3InitialSubjectFamilyShare",
      actual: top3InitialSubjectFamilyShare,
      expected: "top 3 initial subject families at or below 0.6 share",
      message: "Initial subjects concentrate in the top three families across the review seed bundle.",
    });
  }

  if (seedCount >= 12 && top5InitialSubjectFamilyShare > 0.8) {
    findings.push({
      code: "initial-subject-top5-concentration",
      severity: "review-required",
      metric: "top5InitialSubjectFamilyShare",
      actual: top5InitialSubjectFamilyShare,
      expected: "top 5 initial subject families at or below 0.8 share",
      message: "Initial subjects concentrate in the top five families across the review seed bundle.",
    });
  }

  if (uniqueInitialSubjectRhythmPatternCount < 2) {
    findings.push({
      code: "initial-subject-rhythm-collapse",
      severity: "review-required",
      metric: "uniqueInitialSubjectRhythmPatternCount",
      actual: uniqueInitialSubjectRhythmPatternCount,
      expected: "more than one initial subject rhythm pattern across the review bundle",
      message: "Initial subjects share the same rhythm pattern across the review seed bundle.",
    });
  }

  if (uniqueInitialSubjectClimaxIndexCount < 2) {
    findings.push({
      code: "initial-subject-climax-collapse",
      severity: "review-required",
      metric: "uniqueInitialSubjectClimaxIndexCount",
      actual: uniqueInitialSubjectClimaxIndexCount,
      expected: "more than one local climax index across the review bundle",
      message: "Initial subjects share the same local climax index across the review seed bundle.",
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

  if (seedCount >= 8 && top3SubjectFragmentFamilyShare > 0.65) {
    findings.push({
      code: "subject-fragment-top3-concentration",
      severity: "review-required",
      metric: "top3SubjectFragmentFamilyShare",
      actual: top3SubjectFragmentFamilyShare,
      expected: "top 3 subject-fragment families at or below 0.65 share",
      message: "Subject fragments concentrate in the top three families across the review seed bundle.",
    });
  }

  if (seedCount >= 12 && top5SubjectFragmentFamilyShare > 0.85) {
    findings.push({
      code: "subject-fragment-top5-concentration",
      severity: "review-required",
      metric: "top5SubjectFragmentFamilyShare",
      actual: top5SubjectFragmentFamilyShare,
      expected: "top 5 subject-fragment families at or below 0.85 share",
      message: "Subject fragments concentrate in the top five families across the review seed bundle.",
    });
  }

  return findings;
}

function describeImprovements(deltas: {
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
  findingCount: number;
}): string[] {
  const improvements: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount > 0) {
    improvements.push("unique initial subject family count increased");
  }
  if (deltas.uniqueInitialSubjectRhythmPatternCount > 0) {
    improvements.push("unique initial subject rhythm pattern count increased");
  }
  if (deltas.uniqueInitialSubjectClimaxIndexCount > 0) {
    improvements.push("unique initial subject climax index count increased");
  }
  if (deltas.topInitialSubjectFamilyShare < 0) {
    improvements.push("top initial subject family share decreased");
  }
  if (deltas.top3InitialSubjectFamilyShare < 0) {
    improvements.push("top 3 initial subject family share decreased");
  }
  if (deltas.top5InitialSubjectFamilyShare < 0) {
    improvements.push("top 5 initial subject family share decreased");
  }
  if (deltas.topInitialSubjectFragmentFamilyShare < 0) {
    improvements.push("top subject-fragment family share decreased");
  }
  if (deltas.top3SubjectFragmentFamilyShare < 0) {
    improvements.push("top 3 subject-fragment family share decreased");
  }
  if (deltas.top5SubjectFragmentFamilyShare < 0) {
    improvements.push("top 5 subject-fragment family share decreased");
  }
  if (deltas.findingCount < 0) {
    improvements.push("subject-family diversity finding count decreased");
  }

  return improvements;
}

function describeRegressions(deltas: {
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
  findingCount: number;
}): string[] {
  const regressions: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount < 0) {
    regressions.push("unique initial subject family count decreased");
  }
  if (deltas.uniqueInitialSubjectRhythmPatternCount < 0) {
    regressions.push("unique initial subject rhythm pattern count decreased");
  }
  if (deltas.uniqueInitialSubjectClimaxIndexCount < 0) {
    regressions.push("unique initial subject climax index count decreased");
  }
  if (deltas.topInitialSubjectFamilyShare > 0) {
    regressions.push("top initial subject family share increased");
  }
  if (deltas.top3InitialSubjectFamilyShare > 0) {
    regressions.push("top 3 initial subject family share increased");
  }
  if (deltas.top5InitialSubjectFamilyShare > 0) {
    regressions.push("top 5 initial subject family share increased");
  }
  if (deltas.topInitialSubjectFragmentFamilyShare > 0) {
    regressions.push("top subject-fragment family share increased");
  }
  if (deltas.top3SubjectFragmentFamilyShare > 0) {
    regressions.push("top 3 subject-fragment family share increased");
  }
  if (deltas.top5SubjectFragmentFamilyShare > 0) {
    regressions.push("top 5 subject-fragment family share increased");
  }
  if (deltas.findingCount > 0) {
    regressions.push("subject-family diversity finding count increased");
  }

  return regressions;
}

function entropy(shares: readonly number[]): number {
  return shares.reduce((sum, share) => (share > 0 ? sum - share * Math.log2(share) : sum), 0);
}

function topNFamilyShare(families: readonly { seedCount: number }[], topN: number, seedCount: number): number {
  const topSeedCount = families.slice(0, topN).reduce((sum, family) => sum + family.seedCount, 0);
  return roundRatio(topSeedCount / Math.max(1, seedCount));
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
