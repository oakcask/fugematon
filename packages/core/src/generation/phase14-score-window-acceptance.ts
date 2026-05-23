import type {
  CounterSubjectWindowSummary,
  DissonanceTriageSummary,
  DissonanceTriageWindow,
  EntryBoundaryContinuitySummary,
  EntryBoundaryContinuityWindow,
  MetricExplanationSummary,
  PhraseDevelopmentJudgement,
  PhraseDevelopmentReviewSummary,
  PhraseDevelopmentWindow,
  QualityVector,
  ScoreWindowAcceptanceResponse,
  ScoreWindowAcceptanceSummary,
  ScoreWindowAcceptanceWindow,
  Voice,
  VoicePairSpanClassification,
  VoicePairSpanSummary,
} from "../events.js";

const PHASE_14_ACCEPTANCE_WINDOW_LIMIT = 72;
const VOICE_NAMES = new Set<Voice>(["soprano", "alto", "tenor", "bass"]);

export function buildScoreWindowAcceptanceSummary(
  entryBoundaryContinuity: EntryBoundaryContinuitySummary,
  dissonanceTriage: DissonanceTriageSummary,
  qualityVector: QualityVector,
  phase13ZReview: PhraseDevelopmentReviewSummary,
): ScoreWindowAcceptanceSummary {
  const importantEntryWindows = entryBoundaryContinuity.windows.filter(
    (window) => window.entryOrderIndex === 0 || window.alreadyEnteredVoices.length > 0,
  );
  const windows = [
    ...importantEntryWindows.map(scoreWindowFromEntryContinuity),
    ...dissonanceTriage.windows.map(scoreWindowFromDissonance),
    ...qualityVector.voicePairSpans.map(scoreWindowFromVoicePairSpan),
    ...qualityVector.counterSubjectWindows.map(scoreWindowFromCounterSubject),
    ...phase13ZReview.windows.map(scoreWindowFromPhraseDevelopment),
    ...qualityVector.metricExplanations.map(scoreWindowFromMetricExplanation),
  ];

  return {
    schemaVersion: 1,
    importantEntryWindowCount: importantEntryWindows.length,
    dissonanceWindowCount: dissonanceTriage.windows.length,
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

function scoreWindowFromEntryContinuity(window: EntryBoundaryContinuityWindow): ScoreWindowAcceptanceWindow {
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

function scoreWindowFromDissonance(window: DissonanceTriageWindow): ScoreWindowAcceptanceWindow {
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

function scoreWindowFromVoicePairSpan(span: VoicePairSpanSummary): ScoreWindowAcceptanceWindow {
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

function scoreWindowFromCounterSubject(window: CounterSubjectWindowSummary): ScoreWindowAcceptanceWindow {
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

function scoreWindowFromPhraseDevelopment(window: PhraseDevelopmentWindow): ScoreWindowAcceptanceWindow {
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

function scoreWindowFromMetricExplanation(explanation: MetricExplanationSummary): ScoreWindowAcceptanceWindow {
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

function voicePairSpanResponse(classification: VoicePairSpanClassification): ScoreWindowAcceptanceResponse {
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

function phraseDevelopmentResponse(judgement: PhraseDevelopmentJudgement): ScoreWindowAcceptanceResponse {
  return judgement === "mechanical-reuse" ? "generator-response-required" : "accepted-context";
}

function voicesFromPair(voicePair: string | undefined): Voice[] {
  if (voicePair === undefined) {
    return [];
  }
  return voicePair.split("-").filter((voice): voice is Voice => VOICE_NAMES.has(voice as Voice));
}
