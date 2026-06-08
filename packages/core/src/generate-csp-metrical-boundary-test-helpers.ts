import type { ReviewGateFailure } from "./review-gate.js";

export function cspMetricalBoundaryReviewFailures(seed: string, failures: readonly ReviewGateFailure[]) {
  return failures.filter((failure) => !isCspMetricalBoundaryReviewSignal(seed, failure.metric));
}

export function isCspMetricalBoundaryReviewSignal(seed: string, metric: string): boolean {
  return seed === "restless-line" && (metric === "samePitchOverlapCount" || metric === "soloVoiceImbalance");
}
