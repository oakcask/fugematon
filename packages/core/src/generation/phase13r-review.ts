import type {
  PhraseConvergenceReviewFinding,
  PhraseConvergenceReviewSummary,
  PhraseRepetitionReviewSummary,
  SelectionModel,
} from "../events.js";

const ADOPTED_DEFAULT_SELECTION_MODEL: SelectionModel = "phase10-section-local-planner";
const MAX_REPEATED_FOUR_SECTION_PATTERN_COUNT = 5;
const MIN_UNIQUE_FOUR_SECTION_PATTERN_COUNT = 7;
const MAX_TOP_ENTRY_PATTERN_FAMILY_SHARE = 0.42;
const MAX_TOP_SUBJECT_STEM_FAMILY_SHARE = 0.42;
const MAX_TOP_SUBJECT_FRAGMENT_FAMILY_SHARE = 0.42;

export function buildPhraseConvergenceReviewSummary(
  selectionModel: SelectionModel,
  phraseRepetitionReview: PhraseRepetitionReviewSummary,
): PhraseConvergenceReviewSummary {
  const metrics = collectPhraseConvergenceReviewMetrics(phraseRepetitionReview);
  const findings = collectPhraseConvergenceReviewFindings(selectionModel, metrics);

  return {
    schemaVersion: 1,
    selectionModel,
    reviewRequired: findings.length > 0,
    metrics,
    findings,
  };
}

function collectPhraseConvergenceReviewMetrics(
  phraseRepetitionReview: PhraseRepetitionReviewSummary,
): PhraseConvergenceReviewSummary["metrics"] {
  const topSubjectStemFamilyShare = topSubjectFamilyShare(phraseRepetitionReview, "subject");
  const topSubjectFragmentFamilyShare = topSubjectFamilyShare(phraseRepetitionReview, "subject-fragment");

  return {
    mostRepeatedFourSectionPatternCount: phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount,
    uniqueFourSectionPatternCount: phraseRepetitionReview.sectionStatePatterns.uniquePatternCount,
    topEntryPatternFamilyShare: phraseRepetitionReview.entryPatternFamilyConcentration.topFamilyShare,
    topSubjectStemFamilyShare,
    topSubjectFragmentFamilyShare,
  };
}

function collectPhraseConvergenceReviewFindings(
  selectionModel: SelectionModel,
  metrics: PhraseConvergenceReviewSummary["metrics"],
): PhraseConvergenceReviewFinding[] {
  const findings: PhraseConvergenceReviewFinding[] = [];

  if (selectionModel === "baseline") {
    findings.push({
      code: "legacy-default-selection-model",
      severity: "review-required",
      metric: "selectionModel",
      actual: selectionModel,
      expected: ADOPTED_DEFAULT_SELECTION_MODEL,
      message: "Normal generation is using the legacy baseline path instead of the adopted quality baseline.",
    });
  }

  if (metrics.mostRepeatedFourSectionPatternCount > MAX_REPEATED_FOUR_SECTION_PATTERN_COUNT) {
    findings.push({
      code: "mechanical-section-pattern-repetition",
      severity: "review-required",
      metric: "phraseRepetitionReview.sectionStatePatterns.mostRepeatedPatternCount",
      actual: metrics.mostRepeatedFourSectionPatternCount,
      expected: `<= ${MAX_REPEATED_FOUR_SECTION_PATTERN_COUNT}`,
      message: "A four-section continuation pattern repeats often enough to risk mechanical long-run form.",
    });
  }

  if (metrics.uniqueFourSectionPatternCount < MIN_UNIQUE_FOUR_SECTION_PATTERN_COUNT) {
    findings.push({
      code: "low-section-pattern-diversity",
      severity: "review-required",
      metric: "phraseRepetitionReview.sectionStatePatterns.uniquePatternCount",
      actual: metrics.uniqueFourSectionPatternCount,
      expected: `>= ${MIN_UNIQUE_FOUR_SECTION_PATTERN_COUNT}`,
      message: "Continuation state patterns have too little variety for long-run playback review.",
    });
  }

  addShareFinding(
    findings,
    "entry-pattern-family-concentration",
    "phraseRepetitionReview.entryPatternFamilyConcentration.topFamilyShare",
    metrics.topEntryPatternFamilyShare,
    MAX_TOP_ENTRY_PATTERN_FAMILY_SHARE,
    "One entry pattern family dominates the generated continuation enough to require phrase-convergence review.",
  );
  addShareFinding(
    findings,
    "subject-stem-family-concentration",
    "phraseRepetitionReview.subjectStemFamilies.topSubjectShare",
    metrics.topSubjectStemFamilyShare,
    MAX_TOP_SUBJECT_STEM_FAMILY_SHARE,
    "One subject stem family dominates subject returns enough to require phrase-family review.",
  );
  addShareFinding(
    findings,
    "subject-fragment-family-concentration",
    "phraseRepetitionReview.subjectStemFamilies.topSubjectFragmentShare",
    metrics.topSubjectFragmentFamilyShare,
    MAX_TOP_SUBJECT_FRAGMENT_FAMILY_SHARE,
    "One subject-fragment family dominates episodes enough to require phrase-derivation review.",
  );

  return findings;
}

function topSubjectFamilyShare(
  phraseRepetitionReview: PhraseRepetitionReviewSummary,
  form: "subject" | "subject-fragment",
): number {
  return phraseRepetitionReview.subjectStemFamilies
    .filter((family) => family.form === form)
    .reduce((maxShare, family) => Math.max(maxShare, family.share), 0);
}

function addShareFinding(
  findings: PhraseConvergenceReviewFinding[],
  code: PhraseConvergenceReviewFinding["code"],
  metric: string,
  actual: number,
  maximum: number,
  message: string,
): void {
  if (actual <= maximum) {
    return;
  }

  findings.push({
    code,
    severity: "review-required",
    metric,
    actual,
    expected: `<= ${maximum}`,
    message,
  });
}
