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
  schemaVersion: 3;
  seedCount: number;
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhetoricCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectRhetoricShare: number;
  top3InitialSubjectRhetoricShare: number;
  top5InitialSubjectRhetoricShare: number;
  topOpeningGestureShare: number;
  topRhythmProfileShare: number;
  topClimaxAreaShare: number;
  topTailMotionShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
  initialSubjectFamilyEntropy: number;
  findings: SubjectFamilyDiversityFinding[];
  initialSubjectFamilies: SubjectFamilySummary[];
  initialSubjectRhetoricFamilies: SubjectRhetoricFamilySummary[];
  openingGestureFamilies: SubjectRhetoricDimensionSummary[];
  rhythmProfileFamilies: SubjectRhetoricDimensionSummary[];
  climaxAreaFamilies: SubjectRhetoricDimensionSummary[];
  tailMotionFamilies: SubjectRhetoricDimensionSummary[];
  subjectFragmentFamilies: SubjectFragmentFamilySummary[];
};

export type SubjectFamilyDiversityFinding = {
  code:
    | "initial-subject-family-concentration"
    | "initial-subject-rhetoric-concentration"
    | "initial-subject-top3-concentration"
    | "initial-subject-top5-concentration"
    | "initial-subject-rhetoric-top3-concentration"
    | "initial-subject-rhetoric-top5-concentration"
    | "initial-subject-opening-gesture-concentration"
    | "initial-subject-rhythm-profile-concentration"
    | "initial-subject-climax-area-concentration"
    | "initial-subject-tail-motion-concentration"
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
  tailMotion: InitialSubjectProfile["tailMotion"];
  modes: KeyMode[];
  answerCompatibility: InitialSubjectProfile["answerCompatibility"][];
  seedCount: number;
  share: number;
  seeds: string[];
};

export type SubjectRhetoricFamilySummary = {
  openingGesture: string;
  rhythmProfile: string;
  climaxArea: string;
  tailMotion: InitialSubjectProfile["tailMotion"];
  seedCount: number;
  share: number;
  seeds: string[];
};

export type SubjectRhetoricDimensionSummary = {
  family: string;
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

type SubjectFamilyDiversityDeltas = {
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhetoricCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectRhetoricShare: number;
  top3InitialSubjectRhetoricShare: number;
  top5InitialSubjectRhetoricShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
  findingCount: number;
};

export function summarizeSubjectFamilyDiversity(seeds: readonly SubjectFamilySeed[]): SubjectFamilyDiversitySummary {
  const initialSubjectFamilies = summarizeInitialSubjectFamilies(seeds);
  const initialSubjectRhetoricFamilies = summarizeInitialSubjectRhetoricFamilies(seeds);
  const openingGestureFamilies = summarizeRhetoricDimension(seeds, openingGestureFamily);
  const rhythmProfileFamilies = summarizeRhetoricDimension(seeds, rhythmProfileFamily);
  const climaxAreaFamilies = summarizeRhetoricDimension(seeds, climaxArea);
  const tailMotionFamilies = summarizeRhetoricDimension(seeds, (profile) => profile.tailMotion);
  const subjectFragmentFamilies = summarizeSubjectFragmentFamilies(seeds);
  const initialSubjectRhetoric = summarizeInitialSubjectRhetoric(seeds);
  const topInitialSubjectFamilyShare = initialSubjectFamilies[0]?.share ?? 0;
  const top3InitialSubjectFamilyShare = topNFamilyShare(initialSubjectFamilies, 3, seeds.length);
  const top5InitialSubjectFamilyShare = topNFamilyShare(initialSubjectFamilies, 5, seeds.length);
  const topInitialSubjectRhetoricShare = initialSubjectRhetoricFamilies[0]?.share ?? 0;
  const top3InitialSubjectRhetoricShare = topNFamilyShare(initialSubjectRhetoricFamilies, 3, seeds.length);
  const top5InitialSubjectRhetoricShare = topNFamilyShare(initialSubjectRhetoricFamilies, 5, seeds.length);
  const topOpeningGestureShare = openingGestureFamilies[0]?.share ?? 0;
  const topRhythmProfileShare = rhythmProfileFamilies[0]?.share ?? 0;
  const topClimaxAreaShare = climaxAreaFamilies[0]?.share ?? 0;
  const topTailMotionShare = tailMotionFamilies[0]?.share ?? 0;
  const topInitialSubjectFragmentFamilyShare = subjectFragmentFamilies[0]?.share ?? 0;
  const top3SubjectFragmentFamilyShare = topNFamilyShare(subjectFragmentFamilies, 3, seeds.length);
  const top5SubjectFragmentFamilyShare = topNFamilyShare(subjectFragmentFamilies, 5, seeds.length);
  const findings = summarizeFindings({
    seedCount: seeds.length,
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    uniqueInitialSubjectRhetoricCount: initialSubjectRhetoricFamilies.length,
    uniqueInitialSubjectRhythmPatternCount: initialSubjectRhetoric.uniqueRhythmPatternCount,
    uniqueInitialSubjectClimaxIndexCount: initialSubjectRhetoric.uniqueClimaxIndexCount,
    topInitialSubjectFamilyShare,
    top3InitialSubjectFamilyShare,
    top5InitialSubjectFamilyShare,
    topInitialSubjectRhetoricShare,
    top3InitialSubjectRhetoricShare,
    top5InitialSubjectRhetoricShare,
    topOpeningGestureShare,
    topRhythmProfileShare,
    topClimaxAreaShare,
    topTailMotionShare,
    topInitialSubjectFragmentFamilyShare,
    top3SubjectFragmentFamilyShare,
    top5SubjectFragmentFamilyShare,
  });

  return {
    schemaVersion: 3,
    seedCount: seeds.length,
    uniqueInitialSubjectFamilyCount: initialSubjectFamilies.length,
    uniqueInitialSubjectRhetoricCount: initialSubjectRhetoricFamilies.length,
    uniqueInitialSubjectRhythmPatternCount: initialSubjectRhetoric.uniqueRhythmPatternCount,
    uniqueInitialSubjectClimaxIndexCount: initialSubjectRhetoric.uniqueClimaxIndexCount,
    topInitialSubjectFamilyShare,
    top3InitialSubjectFamilyShare,
    top5InitialSubjectFamilyShare,
    topInitialSubjectRhetoricShare,
    top3InitialSubjectRhetoricShare,
    top5InitialSubjectRhetoricShare,
    topOpeningGestureShare,
    topRhythmProfileShare,
    topClimaxAreaShare,
    topTailMotionShare,
    topInitialSubjectFragmentFamilyShare,
    top3SubjectFragmentFamilyShare,
    top5SubjectFragmentFamilyShare,
    initialSubjectFamilyEntropy: roundRatio(
      entropy(initialSubjectFamilies.map((family) => family.seedCount / Math.max(1, seeds.length))),
    ),
    findings,
    initialSubjectFamilies: initialSubjectFamilies.slice(0, 8),
    initialSubjectRhetoricFamilies: initialSubjectRhetoricFamilies.slice(0, 8),
    openingGestureFamilies: openingGestureFamilies.slice(0, 8),
    rhythmProfileFamilies: rhythmProfileFamilies.slice(0, 8),
    climaxAreaFamilies: climaxAreaFamilies.slice(0, 8),
    tailMotionFamilies: tailMotionFamilies.slice(0, 8),
    subjectFragmentFamilies: subjectFragmentFamilies.slice(0, 8),
  };
}

export function compareSubjectFamilyDiversity(
  baseline: SubjectFamilyDiversitySummary,
  variant: SubjectFamilyDiversitySummary,
): {
  baseline: SubjectFamilyDiversitySummary;
  variant: SubjectFamilyDiversitySummary;
  deltas: SubjectFamilyDiversityDeltas;
  improvements: string[];
  regressions: string[];
} {
  const deltas: SubjectFamilyDiversityDeltas = {
    uniqueInitialSubjectFamilyCount: variant.uniqueInitialSubjectFamilyCount - baseline.uniqueInitialSubjectFamilyCount,
    uniqueInitialSubjectRhetoricCount:
      variant.uniqueInitialSubjectRhetoricCount - baseline.uniqueInitialSubjectRhetoricCount,
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
    topInitialSubjectRhetoricShare: roundRatio(
      variant.topInitialSubjectRhetoricShare - baseline.topInitialSubjectRhetoricShare,
    ),
    top3InitialSubjectRhetoricShare: roundRatio(
      variant.top3InitialSubjectRhetoricShare - baseline.top3InitialSubjectRhetoricShare,
    ),
    top5InitialSubjectRhetoricShare: roundRatio(
      variant.top5InitialSubjectRhetoricShare - baseline.top5InitialSubjectRhetoricShare,
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

function summarizeInitialSubjectRhetoricFamilies(seeds: readonly SubjectFamilySeed[]): SubjectRhetoricFamilySummary[] {
  const counts = new Map<
    string,
    {
      openingGesture: string;
      rhythmProfile: string;
      climaxArea: string;
      tailMotion: InitialSubjectProfile["tailMotion"];
      seeds: string[];
    }
  >();

  for (const seed of seeds) {
    const profile = seed.initialSubjectProfile;
    const family = {
      openingGesture: openingGestureFamily(profile),
      rhythmProfile: rhythmProfileFamily(profile),
      climaxArea: climaxArea(profile),
      tailMotion: profile.tailMotion,
    };
    const key = [family.openingGesture, family.rhythmProfile, family.climaxArea, family.tailMotion].join("|");
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { ...family, seeds: [seed.seed] });
    } else {
      current.seeds.push(seed.seed);
    }
  }

  return [...counts.values()]
    .map((family) => ({
      ...family,
      seedCount: family.seeds.length,
      share: roundRatio(family.seeds.length / Math.max(1, seeds.length)),
      seeds: [...family.seeds].sort(),
    }))
    .sort((left, right) => {
      const leftKey = `${left.openingGesture}|${left.rhythmProfile}|${left.climaxArea}|${left.tailMotion}`;
      const rightKey = `${right.openingGesture}|${right.rhythmProfile}|${right.climaxArea}|${right.tailMotion}`;
      return right.seedCount - left.seedCount || leftKey.localeCompare(rightKey);
    });
}

function summarizeRhetoricDimension(
  seeds: readonly SubjectFamilySeed[],
  familyForProfile: (profile: InitialSubjectProfile) => string,
): SubjectRhetoricDimensionSummary[] {
  const counts = new Map<string, string[]>();
  for (const seed of seeds) {
    const family = familyForProfile(seed.initialSubjectProfile);
    const current = counts.get(family);
    if (current === undefined) {
      counts.set(family, [seed.seed]);
    } else {
      current.push(seed.seed);
    }
  }

  return [...counts.entries()]
    .map(([family, familySeeds]) => ({
      family,
      seedCount: familySeeds.length,
      share: roundRatio(familySeeds.length / Math.max(1, seeds.length)),
      seeds: [...familySeeds].sort(),
    }))
    .sort((left, right) => right.seedCount - left.seedCount || left.family.localeCompare(right.family));
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

function openingGestureFamily(profile: InitialSubjectProfile): string {
  const [first, second, third] = profile.degreePattern;
  if (first === 0 && second === 1 && third === 2) {
    return "stepwise-tonic";
  }
  if (first === 0 && second === 2 && third === 1) {
    return "third-return";
  }
  if (first === 0 && second === 1 && third === 3) {
    return "upper-neighbor";
  }
  if (first === 0 && second === 3 && third === 2) {
    return "tonic-leap-fill";
  }
  if (first === 0 && second === 2 && (third === 5 || third === 6)) {
    return "modal-color-neighbor";
  }
  return "other";
}

function rhythmProfileFamily(profile: InitialSubjectProfile): string {
  const rhythm = profile.rhythmPattern;
  if (rhythm.some((duration) => duration === 1.5)) {
    return "compound-profile";
  }
  if (rhythm[0] !== undefined && rhythm[0] >= 2) {
    return "held-opening";
  }
  if (rhythm.slice(5).some((duration) => duration >= 2)) {
    return "tail-held";
  }
  if (rhythm.slice(1, 5).some((duration) => duration >= 2)) {
    return "mid-held";
  }
  if (rhythm.some((duration) => duration === 0.5)) {
    return "eighth-motion";
  }
  return "quarter-pulse";
}

function climaxArea(profile: InitialSubjectProfile): string {
  const climaxDegree = profile.degreePattern[profile.localClimaxIndex];
  if (climaxDegree !== undefined && climaxDegree >= 5) {
    return "modal-color-climax";
  }
  if (profile.localClimaxIndex <= 3) {
    return "early";
  }
  if (profile.localClimaxIndex === 4) {
    return "middle";
  }
  return "late";
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

function summarizeFindings(input: {
  seedCount: number;
  uniqueInitialSubjectFamilyCount: number;
  uniqueInitialSubjectRhetoricCount: number;
  uniqueInitialSubjectRhythmPatternCount: number;
  uniqueInitialSubjectClimaxIndexCount: number;
  topInitialSubjectFamilyShare: number;
  top3InitialSubjectFamilyShare: number;
  top5InitialSubjectFamilyShare: number;
  topInitialSubjectRhetoricShare: number;
  top3InitialSubjectRhetoricShare: number;
  top5InitialSubjectRhetoricShare: number;
  topOpeningGestureShare: number;
  topRhythmProfileShare: number;
  topClimaxAreaShare: number;
  topTailMotionShare: number;
  topInitialSubjectFragmentFamilyShare: number;
  top3SubjectFragmentFamilyShare: number;
  top5SubjectFragmentFamilyShare: number;
}): SubjectFamilyDiversityFinding[] {
  const findings: SubjectFamilyDiversityFinding[] = [];

  if (input.uniqueInitialSubjectFamilyCount < 4 || input.topInitialSubjectFamilyShare > 0.4) {
    findings.push({
      code: "initial-subject-family-concentration",
      severity: "review-required",
      metric: "uniqueInitialSubjectFamilyCount/topInitialSubjectFamilyShare",
      actual: input.topInitialSubjectFamilyShare,
      expected: "at least 4 initial subject families and no top family above 0.4 share",
      message: "Initial subjects are concentrated across the review seed bundle.",
    });
  }
  if (input.uniqueInitialSubjectRhetoricCount < 4 || input.topInitialSubjectRhetoricShare > 0.4) {
    findings.push({
      code: "initial-subject-rhetoric-concentration",
      severity: "review-required",
      metric: "uniqueInitialSubjectRhetoricCount/topInitialSubjectRhetoricShare",
      actual: input.topInitialSubjectRhetoricShare,
      expected: "at least 4 initial subject rhetoric families and no top rhetoric family above 0.4 share",
      message: "Initial subjects reuse the same rhetoric across the review seed bundle.",
    });
  }
  if (input.seedCount >= 8 && input.top3InitialSubjectFamilyShare > 0.6) {
    findings.push({
      code: "initial-subject-top3-concentration",
      severity: "review-required",
      metric: "top3InitialSubjectFamilyShare",
      actual: input.top3InitialSubjectFamilyShare,
      expected: "top 3 initial subject families at or below 0.6 share",
      message: "Initial subjects concentrate in the top three families across the review seed bundle.",
    });
  }
  if (input.seedCount >= 8 && input.top3InitialSubjectRhetoricShare > 0.6) {
    findings.push({
      code: "initial-subject-rhetoric-top3-concentration",
      severity: "review-required",
      metric: "top3InitialSubjectRhetoricShare",
      actual: input.top3InitialSubjectRhetoricShare,
      expected: "top 3 initial subject rhetoric families at or below 0.6 share",
      message: "Initial subject rhetoric concentrates in the top three families across the review seed bundle.",
    });
  }
  if (input.seedCount >= 12 && input.top5InitialSubjectFamilyShare > 0.8) {
    findings.push({
      code: "initial-subject-top5-concentration",
      severity: "review-required",
      metric: "top5InitialSubjectFamilyShare",
      actual: input.top5InitialSubjectFamilyShare,
      expected: "top 5 initial subject families at or below 0.8 share",
      message: "Initial subjects concentrate in the top five families across the review seed bundle.",
    });
  }
  if (input.seedCount >= 12 && input.top5InitialSubjectRhetoricShare > 0.8) {
    findings.push({
      code: "initial-subject-rhetoric-top5-concentration",
      severity: "review-required",
      metric: "top5InitialSubjectRhetoricShare",
      actual: input.top5InitialSubjectRhetoricShare,
      expected: "top 5 initial subject rhetoric families at or below 0.8 share",
      message: "Initial subject rhetoric concentrates in the top five families across the review seed bundle.",
    });
  }
  pushConcentrationFinding(findings, input.seedCount, "opening", input.topOpeningGestureShare);
  pushConcentrationFinding(findings, input.seedCount, "rhythm", input.topRhythmProfileShare);
  pushConcentrationFinding(findings, input.seedCount, "climax", input.topClimaxAreaShare);
  pushConcentrationFinding(findings, input.seedCount, "tail", input.topTailMotionShare);
  if (input.uniqueInitialSubjectRhythmPatternCount < 2) {
    findings.push({
      code: "initial-subject-rhythm-collapse",
      severity: "review-required",
      metric: "uniqueInitialSubjectRhythmPatternCount",
      actual: input.uniqueInitialSubjectRhythmPatternCount,
      expected: "more than one initial subject rhythm pattern across the review bundle",
      message: "Initial subjects share the same rhythm pattern across the review seed bundle.",
    });
  }
  if (input.uniqueInitialSubjectClimaxIndexCount < 2) {
    findings.push({
      code: "initial-subject-climax-collapse",
      severity: "review-required",
      metric: "uniqueInitialSubjectClimaxIndexCount",
      actual: input.uniqueInitialSubjectClimaxIndexCount,
      expected: "more than one local climax index across the review bundle",
      message: "Initial subjects share the same local climax index across the review seed bundle.",
    });
  }
  if (input.topInitialSubjectFragmentFamilyShare > 0.45) {
    findings.push({
      code: "subject-fragment-vocabulary-collapse",
      severity: "review-required",
      metric: "topInitialSubjectFragmentFamilyShare",
      actual: input.topInitialSubjectFragmentFamilyShare,
      expected: "no top subject-fragment family above 0.45 share",
      message: "Subject fragments are concentrated across the review seed bundle.",
    });
  }
  if (input.seedCount >= 8 && input.top3SubjectFragmentFamilyShare > 0.65) {
    findings.push({
      code: "subject-fragment-top3-concentration",
      severity: "review-required",
      metric: "top3SubjectFragmentFamilyShare",
      actual: input.top3SubjectFragmentFamilyShare,
      expected: "top 3 subject-fragment families at or below 0.65 share",
      message: "Subject fragments concentrate in the top three families across the review seed bundle.",
    });
  }
  if (input.seedCount >= 12 && input.top5SubjectFragmentFamilyShare > 0.85) {
    findings.push({
      code: "subject-fragment-top5-concentration",
      severity: "review-required",
      metric: "top5SubjectFragmentFamilyShare",
      actual: input.top5SubjectFragmentFamilyShare,
      expected: "top 5 subject-fragment families at or below 0.85 share",
      message: "Subject fragments concentrate in the top five families across the review seed bundle.",
    });
  }

  return findings;
}

function pushConcentrationFinding(
  findings: SubjectFamilyDiversityFinding[],
  seedCount: number,
  dimension: "opening" | "rhythm" | "climax" | "tail",
  share: number,
): void {
  const thresholds = { opening: 0.55, rhythm: 0.55, climax: 0.65, tail: 0.65 } as const;
  if (seedCount < 8 || share <= thresholds[dimension]) {
    return;
  }
  const code = {
    opening: "initial-subject-opening-gesture-concentration",
    rhythm: "initial-subject-rhythm-profile-concentration",
    climax: "initial-subject-climax-area-concentration",
    tail: "initial-subject-tail-motion-concentration",
  } as const;
  const metric = {
    opening: "topOpeningGestureShare",
    rhythm: "topRhythmProfileShare",
    climax: "topClimaxAreaShare",
    tail: "topTailMotionShare",
  } as const;
  findings.push({
    code: code[dimension],
    severity: "review-required",
    metric: metric[dimension],
    actual: share,
    expected: `no ${dimension} rhetoric family above ${thresholds[dimension]} share`,
    message: `Initial subjects overuse one ${dimension} rhetoric family across the review seed bundle.`,
  });
}

function describeImprovements(deltas: SubjectFamilyDiversityDeltas): string[] {
  const improvements: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount > 0) {
    improvements.push("unique initial subject family count increased");
  }
  if (deltas.uniqueInitialSubjectRhetoricCount > 0) {
    improvements.push("unique initial subject rhetoric count increased");
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
  if (deltas.topInitialSubjectRhetoricShare < 0) {
    improvements.push("top initial subject rhetoric share decreased");
  }
  if (deltas.top3InitialSubjectRhetoricShare < 0) {
    improvements.push("top 3 initial subject rhetoric share decreased");
  }
  if (deltas.top5InitialSubjectRhetoricShare < 0) {
    improvements.push("top 5 initial subject rhetoric share decreased");
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

function describeRegressions(deltas: SubjectFamilyDiversityDeltas): string[] {
  const regressions: string[] = [];
  if (deltas.uniqueInitialSubjectFamilyCount < 0) {
    regressions.push("unique initial subject family count decreased");
  }
  if (deltas.uniqueInitialSubjectRhetoricCount < 0) {
    regressions.push("unique initial subject rhetoric count decreased");
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
  if (deltas.topInitialSubjectRhetoricShare > 0) {
    regressions.push("top initial subject rhetoric share increased");
  }
  if (deltas.top3InitialSubjectRhetoricShare > 0) {
    regressions.push("top 3 initial subject rhetoric share increased");
  }
  if (deltas.top5InitialSubjectRhetoricShare > 0) {
    regressions.push("top 5 initial subject rhetoric share increased");
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
