import type { HarmonicPlan, PhraseFunction, PhraseRepetitionReviewSummary, PlannedEntry } from "../events.js";

const SECTION_STATE_PATTERN_LENGTH = 4;

export function analyzePhraseRepetitionReviewSummary(
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): PhraseRepetitionReviewSummary {
  const entryPatternFamilies = summarizeEntryPatternFamilies(subjectEntries);
  const topEntryFamilyCount = maximum(entryPatternFamilies.map((family) => family.count));

  return {
    schemaVersion: 1,
    entryPatternFamilyConcentration: {
      entryCount: subjectEntries.length,
      uniqueFamilyCount: entryPatternFamilies.length,
      topFamilyCount: topEntryFamilyCount,
      topFamilyShare: roundRatio(topEntryFamilyCount / Math.max(1, subjectEntries.length)),
    },
    subjectStemFamilies: summarizeSubjectStemFamilies(subjectEntries),
    answerTransformFamilies: summarizeAnswerTransformFamilies(subjectEntries),
    fragmentDerivations: summarizeFragmentDerivations(sectionPlans),
    phraseFunctions: summarizePhraseFunctions(sectionPlans),
    sectionStatePatterns: summarizeSectionStatePatterns(sectionPlans),
  };
}

function summarizeEntryPatternFamilies(
  subjectEntries: readonly PlannedEntry[],
): { form: PlannedEntry["form"]; pattern: number[]; count: number }[] {
  const counts = new Map<string, { form: PlannedEntry["form"]; pattern: number[]; count: number }>();
  for (const entry of subjectEntries) {
    const pattern = [...entry.expectedDegreePattern];
    const key = `${entry.form}:${pattern.join("-")}`;
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { form: entry.form, pattern, count: 1 });
    } else {
      current.count += 1;
    }
  }

  return [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.form.localeCompare(right.form) ||
      left.pattern.join("-").localeCompare(right.pattern.join("-")),
  );
}

function summarizeSubjectStemFamilies(
  subjectEntries: readonly PlannedEntry[],
): PhraseRepetitionReviewSummary["subjectStemFamilies"] {
  const stemEntries = subjectEntries.filter(
    (entry): entry is PlannedEntry & { form: "subject" | "subject-fragment" } =>
      entry.form === "subject" || entry.form === "subject-fragment",
  );
  const counts = new Map<
    string,
    { form: "subject" | "subject-fragment"; pattern: number[]; count: number; firstStartTick: number }
  >();

  for (const entry of stemEntries) {
    const pattern = [...entry.expectedDegreePattern];
    const key = `${entry.form}:${pattern.join("-")}`;
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { form: entry.form, pattern, count: 1, firstStartTick: entry.startTick });
    } else {
      current.count += 1;
      current.firstStartTick = Math.min(current.firstStartTick, entry.startTick);
    }
  }

  return [...counts.values()]
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.firstStartTick - right.firstStartTick ||
        left.form.localeCompare(right.form) ||
        left.pattern.join("-").localeCompare(right.pattern.join("-")),
    )
    .slice(0, 8)
    .map(({ firstStartTick: _firstStartTick, ...family }) => ({
      ...family,
      share: roundRatio(family.count / Math.max(1, stemEntries.length)),
    }));
}

function summarizeAnswerTransformFamilies(
  subjectEntries: readonly PlannedEntry[],
): PhraseRepetitionReviewSummary["answerTransformFamilies"] {
  const answerEntries = subjectEntries.filter((entry) => entry.form === "answer");
  const counts = new Map<string, { answerKind: "true" | "tonal" | "none"; pattern: number[]; count: number }>();

  for (const entry of answerEntries) {
    const answerKind = entry.answerKind ?? "none";
    const pattern = [...entry.expectedDegreePattern];
    const key = `${answerKind}:${pattern.join("-")}`;
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { answerKind, pattern, count: 1 });
    } else {
      current.count += 1;
    }
  }

  return [...counts.values()]
    .map((family) => ({
      ...family,
      share: roundRatio(family.count / Math.max(1, answerEntries.length)),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.answerKind.localeCompare(right.answerKind) ||
        left.pattern.join("-").localeCompare(right.pattern.join("-")),
    )
    .slice(0, 8);
}

function summarizeFragmentDerivations(
  sectionPlans: readonly HarmonicPlan[],
): PhraseRepetitionReviewSummary["fragmentDerivations"] {
  const continuationPlans = sectionPlans.filter((plan) => plan.state !== "exposition");
  const counts = new Map<
    string,
    {
      transform: "sequence" | "contrary-motion" | "inversion" | "none";
      phraseFunction: PhraseFunction;
      count: number;
    }
  >();

  for (const plan of continuationPlans) {
    const transform = plan.fragmentTransform ?? "none";
    const phraseFunction = phraseFunctionForPlan(plan);
    const key = `${transform}:${phraseFunction}`;
    const current = counts.get(key);
    if (current === undefined) {
      counts.set(key, { transform, phraseFunction, count: 1 });
    } else {
      current.count += 1;
    }
  }

  return [...counts.values()]
    .map((derivation) => ({
      ...derivation,
      share: roundRatio(derivation.count / Math.max(1, continuationPlans.length)),
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.transform.localeCompare(right.transform) ||
        left.phraseFunction.localeCompare(right.phraseFunction),
    );
}

function summarizePhraseFunctions(
  sectionPlans: readonly HarmonicPlan[],
): PhraseRepetitionReviewSummary["phraseFunctions"] {
  const counts = new Map<PhraseFunction, number>();
  for (const plan of sectionPlans) {
    const phraseFunction = phraseFunctionForPlan(plan);
    counts.set(phraseFunction, (counts.get(phraseFunction) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([phraseFunction, count]) => ({
      phraseFunction,
      count,
      share: roundRatio(count / Math.max(1, sectionPlans.length)),
    }))
    .sort((left, right) => right.count - left.count || left.phraseFunction.localeCompare(right.phraseFunction));
}

function summarizeSectionStatePatterns(
  sectionPlans: readonly HarmonicPlan[],
): PhraseRepetitionReviewSummary["sectionStatePatterns"] {
  const states = sectionPlans.filter((plan) => plan.state !== "exposition").map((plan) => plan.state);
  const patterns = countPatterns(states, SECTION_STATE_PATTERN_LENGTH);
  const totalPatternCount = [...patterns.values()].reduce((sum, count) => sum + count, 0);
  const topPatterns = [...patterns.entries()]
    .map(([pattern, count]) => ({
      pattern: pattern.split(">") as HarmonicPlan["state"][],
      count,
      share: roundRatio(count / Math.max(1, totalPatternCount)),
    }))
    .sort((left, right) => right.count - left.count || left.pattern.join(">").localeCompare(right.pattern.join(">")))
    .slice(0, 5);

  return {
    patternLength: SECTION_STATE_PATTERN_LENGTH,
    uniquePatternCount: patterns.size,
    mostRepeatedPatternCount: maximum(topPatterns.map((pattern) => pattern.count)),
    topPatterns,
  };
}

function phraseFunctionForPlan(plan: HarmonicPlan): PhraseFunction {
  if (plan.state === "exposition") {
    return "exposition";
  }
  if (plan.state === "stretto-like") {
    return "stretto-compression";
  }
  if (plan.state === "subject-return") {
    return plan.cadenceKind === "authentic" || plan.cadenceKind === "modal" ? "cadence-extension" : "restatement";
  }
  if (plan.fragmentTransform !== undefined || plan.sequencePattern !== undefined) {
    return "episode-sequence";
  }
  return "entry-preparation";
}

function countPatterns<T extends string>(values: readonly T[], size: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let index = 0; index + size <= values.length; index += 1) {
    const pattern = values.slice(index, index + size).join(">");
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  }
  return counts;
}

function maximum(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
