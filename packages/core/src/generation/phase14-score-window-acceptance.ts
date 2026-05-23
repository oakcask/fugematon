import type {
  EntryBoundaryContinuitySummary,
  EntryBoundaryContinuityWindow,
  Phase13QualityVector,
  Phase13TCounterSubjectWindowSummary,
  Phase13TMetricExplanationSummary,
  Phase13UVoicePairSpanClassification,
  Phase13UVoicePairSpanSummary,
  Phase13ZPhraseDevelopmentJudgement,
  Phase13ZPhraseDevelopmentWindow,
  Phase13ZReviewSummary,
  Phase14DissonanceTriageSummary,
  Phase14DissonanceTriageWindow,
  Phase14ScoreWindowAcceptanceResponse,
  Phase14ScoreWindowAcceptanceSummary,
  Phase14ScoreWindowAcceptanceWindow,
  Voice,
} from "../events.js";

const PHASE_14_ACCEPTANCE_WINDOW_LIMIT = 72;
const VOICE_NAMES = new Set<Voice>(["soprano", "alto", "tenor", "bass"]);

export function buildPhase14ScoreWindowAcceptanceSummary(
  entryBoundaryContinuity: EntryBoundaryContinuitySummary,
  phase14DissonanceTriage: Phase14DissonanceTriageSummary,
  qualityVector: Phase13QualityVector,
  phase13ZReview: Phase13ZReviewSummary,
): Phase14ScoreWindowAcceptanceSummary {
  const importantEntryWindows = entryBoundaryContinuity.windows.filter(
    (window) => window.entryOrderIndex === 0 || window.alreadyEnteredVoices.length > 0,
  );
  const windows = [
    ...importantEntryWindows.map(scoreWindowFromEntryContinuity),
    ...phase14DissonanceTriage.windows.map(scoreWindowFromDissonance),
    ...qualityVector.voicePairSpans.map(scoreWindowFromVoicePairSpan),
    ...qualityVector.counterSubjectWindows.map(scoreWindowFromCounterSubject),
    ...phase13ZReview.windows.map(scoreWindowFromPhraseDevelopment),
    ...qualityVector.metricExplanations.map(scoreWindowFromMetricExplanation),
  ];

  return {
    schemaVersion: 1,
    importantEntryWindowCount: importantEntryWindows.length,
    dissonanceWindowCount: phase14DissonanceTriage.windows.length,
    activeVoicePairSpanCount: qualityVector.voicePairSpans.length,
    counterSubjectWindowCount: qualityVector.counterSubjectWindows.length,
    phraseDevelopmentWindowCount: phase13ZReview.windowCount,
    metricExplanationCount: qualityVector.metricExplanations.length,
    reviewRequiredWindowCount: windows.filter((window) => window.response === "review-required").length,
    generatorResponseWindowCount: windows.filter((window) => window.response === "generator-response-required").length,
    acceptedContextWindowCount: windows.filter((window) => window.response === "accepted-context").length,
    diagnosticContextWindowCount: windows.filter((window) => window.response === "diagnostic-context").length,
    windows: windows.slice(0, PHASE_14_ACCEPTANCE_WINDOW_LIMIT),
  };
}

function scoreWindowFromEntryContinuity(window: EntryBoundaryContinuityWindow): Phase14ScoreWindowAcceptanceWindow {
  const accepted =
    window.classification === "continuity-supported" || window.classification === "prepared-collective-articulation";
  return {
    kind: "important-entry-continuity",
    startTick: window.startTick,
    state: window.state,
    voices: [window.entryVoice, ...window.alreadyEnteredVoices],
    roles: [window.form],
    classification: window.classification,
    symptom: accepted
      ? "entry support carries or prepares audible continuity"
      : "entry support does not yet prove collective contrapuntal continuity",
    theoryBasis: "counterpoint",
    response: accepted ? "accepted-context" : "generator-response-required",
  };
}

function scoreWindowFromDissonance(window: Phase14DissonanceTriageWindow): Phase14ScoreWindowAcceptanceWindow {
  return {
    kind: "dissonance-triage",
    startTick: window.startTick,
    state: window.state,
    voices: window.voices,
    roles: window.roles,
    classification: window.classification,
    symptom: "local semitone or entry clash needs score-window explanation before metric adoption",
    theoryBasis: "counterpoint",
    response: "review-required",
  };
}

function scoreWindowFromVoicePairSpan(span: Phase13UVoicePairSpanSummary): Phase14ScoreWindowAcceptanceWindow {
  return {
    kind: "active-voice-pair-span",
    startTick: span.startTick,
    durationTicks: span.durationTicks,
    state: span.sectionRole,
    voices: [span.leftVoice, span.rightVoice],
    roles: [],
    classification: span.classification,
    symptom: span.symptom,
    theoryBasis: "counterpoint",
    response: voicePairSpanResponse(span.classification),
  };
}

function scoreWindowFromCounterSubject(
  window: Phase13TCounterSubjectWindowSummary,
): Phase14ScoreWindowAcceptanceWindow {
  const accepted = window.preservationJudgement === "preserved";
  return {
    kind: "counter-subject-survival",
    startTick: window.entryStartTick,
    state: "mixed",
    voices: [window.entryVoice, window.counterSubjectVoice].filter((voice): voice is Voice => voice !== undefined),
    roles: window.counterSubjectVoice === undefined ? [] : ["counter-subject"],
    classification: window.preservationJudgement,
    symptom: accepted
      ? "counter-subject remains recognizable around the entry"
      : "counter-subject label needs score-window justification or generator response",
    theoryBasis: "fugue-form",
    response:
      window.preservationJudgement === "preserved"
        ? "accepted-context"
        : window.preservationJudgement === "weak"
          ? "generator-response-required"
          : "review-required",
  };
}

function scoreWindowFromPhraseDevelopment(window: Phase13ZPhraseDevelopmentWindow): Phase14ScoreWindowAcceptanceWindow {
  return {
    kind: "phrase-development",
    startTick: window.startTick,
    state: window.state,
    voices: [window.entryVoice],
    roles: [window.form],
    classification: window.judgement,
    symptom:
      window.judgement === "mechanical-reuse"
        ? "recurrence repeats material without enough changed musical function"
        : "recurrence has new material or changed phrase function",
    theoryBasis: "fugue-form",
    response: phraseDevelopmentResponse(window.judgement),
  };
}

function scoreWindowFromMetricExplanation(
  explanation: Phase13TMetricExplanationSummary,
): Phase14ScoreWindowAcceptanceWindow {
  return {
    kind: "metric-explanation",
    startTick: explanation.representativeTick,
    state: explanation.sectionRole,
    voices: explanation.voice !== undefined ? [explanation.voice] : voicesFromPair(explanation.voicePair),
    roles: [],
    classification: explanation.classification,
    metric: explanation.axis,
    symptom: explanation.symptom,
    theoryBasis: "diagnostic-truthfulness",
    response:
      explanation.adoptionMeaning === "musical-improvement"
        ? "accepted-context"
        : explanation.adoptionMeaning === "diagnostic-reclassification"
          ? "diagnostic-context"
          : "review-required",
  };
}

function voicePairSpanResponse(
  classification: Phase13UVoicePairSpanClassification,
): Phase14ScoreWindowAcceptanceResponse {
  if (
    classification === "mechanical-coupling" ||
    classification === "exact-collision" ||
    classification === "color-doubling"
  ) {
    return "generator-response-required";
  }
  if (classification === "pitch-class-reinforcement") {
    return "review-required";
  }
  return "accepted-context";
}

function phraseDevelopmentResponse(
  judgement: Phase13ZPhraseDevelopmentJudgement,
): Phase14ScoreWindowAcceptanceResponse {
  return judgement === "mechanical-reuse" ? "generator-response-required" : "accepted-context";
}

function voicesFromPair(voicePair: string | undefined): Voice[] {
  if (voicePair === undefined) {
    return [];
  }
  return voicePair.split("-").filter((voice): voice is Voice => VOICE_NAMES.has(voice as Voice));
}
