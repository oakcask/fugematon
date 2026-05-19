import type { CandidateEvaluation, FugueState } from "./events.js";

export function candidateEvaluationFeature(
  evaluation: CandidateEvaluation,
  dimension: keyof CandidateEvaluation["dimensions"],
  name: string,
): number {
  return evaluation.dimensions[dimension].features[name] ?? 0;
}

export function candidateSectionState(evaluation: CandidateEvaluation): FugueState | undefined {
  return evaluation.explanations.sections[0]?.state;
}

export function isViableCandidateEvaluation(evaluation: CandidateEvaluation, selected: CandidateEvaluation): boolean {
  if (evaluation.hardFailures.length > 0) {
    return false;
  }

  return (
    candidateEvaluationFeature(evaluation, "subjectClarity", "subjectIdentityViolations") === 0 &&
    candidateEvaluationFeature(evaluation, "subjectClarity", "answerPlanViolations") === 0 &&
    candidateEvaluationFeature(evaluation, "melody", "leapRecoveryMisses") <=
      candidateEvaluationFeature(selected, "melody", "leapRecoveryMisses") &&
    candidateEvaluationFeature(evaluation, "subjectClarity", "counterSubjectIdentityRetention") >=
      candidateEvaluationFeature(selected, "subjectClarity", "counterSubjectIdentityRetention") &&
    candidateEvaluationFeature(evaluation, "texture", "fourBeatBassUpperSameDirectionRatio") <=
      candidateEvaluationFeature(selected, "texture", "fourBeatBassUpperSameDirectionRatio") &&
    candidateEvaluationFeature(evaluation, "texture", "eightBeatBassUpperSameDirectionRatio") <=
      candidateEvaluationFeature(selected, "texture", "eightBeatBassUpperSameDirectionRatio") &&
    candidateEvaluationFeature(evaluation, "texture", "fourBeatOuterVoiceSameDirectionRatio") <=
      candidateEvaluationFeature(selected, "texture", "fourBeatOuterVoiceSameDirectionRatio")
  );
}
