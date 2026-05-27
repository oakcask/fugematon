import type {
  CounterSubjectWindowSummary,
  DissonanceTriageSummary,
  DissonanceTriageWindow,
  EntryBoundaryContinuitySummary,
  EntryBoundaryContinuityWindow,
  HarmonicContinuitySummary,
  HarmonicContinuityWindow,
  HarmonicSonorityWindow,
  MetricExplanationSummary,
  PhraseDevelopmentJudgement,
  PhraseDevelopmentReviewSummary,
  PhraseDevelopmentWindow,
  QualityVector,
  ScoreWindowAcceptanceResponse,
  ScoreWindowAcceptanceSummary,
  ScoreWindowAcceptanceWindow,
  TransitionRhythmReviewSummary,
  TransitionRhythmWindow,
  Voice,
  VoicePairSpanClassification,
  VoicePairSpanSummary,
} from "../events.js";

const SCORE_WINDOW_ACCEPTANCE_WINDOW_LIMIT = 72;
const VOICE_NAMES = new Set<Voice>(["soprano", "alto", "tenor", "bass"]);

export function buildScoreWindowAcceptanceSummary(
  entryBoundaryContinuity: EntryBoundaryContinuitySummary,
  harmonicContinuity: HarmonicContinuitySummary,
  transitionRhythmReview: TransitionRhythmReviewSummary,
  dissonanceTriage: DissonanceTriageSummary,
  qualityVector: QualityVector,
  phraseDevelopmentReview: PhraseDevelopmentReviewSummary,
): ScoreWindowAcceptanceSummary {
  const importantEntryWindows = entryBoundaryContinuity.windows.filter(
    (window) => window.entryOrderIndex === 0 || window.alreadyEnteredVoices.length > 0,
  );
  const windows = collectScoreWindowAcceptanceWindows(
    importantEntryWindows,
    harmonicContinuity,
    transitionRhythmReview,
    dissonanceTriage,
    qualityVector,
    phraseDevelopmentReview,
  );
  const responseCounts = countScoreWindowResponses(windows);

  return {
    schemaVersion: 1,
    importantEntryWindowCount: importantEntryWindows.length,
    harmonicContinuityWindowCount: harmonicContinuity.windows.length,
    harmonicSonorityWindowCount: qualityVector.harmonicSonorities.windows.length,
    transitionRhythmWindowCount: transitionRhythmReview.windows.length,
    dissonanceWindowCount: dissonanceTriage.windows.length,
    activeVoicePairSpanCount: qualityVector.voicePairSpans.length,
    counterSubjectWindowCount: qualityVector.counterSubjectWindows.length,
    phraseDevelopmentWindowCount: phraseDevelopmentReview.windowCount,
    metricExplanationCount: qualityVector.metricExplanations.length,
    reviewRequiredWindowCount: responseCounts.reviewRequired,
    generatorResponseWindowCount: responseCounts.generatorResponse,
    acceptedContextWindowCount: responseCounts.acceptedContext,
    diagnosticContextWindowCount: responseCounts.diagnosticContext,
    windows: windows.slice(0, SCORE_WINDOW_ACCEPTANCE_WINDOW_LIMIT),
  };
}

function collectScoreWindowAcceptanceWindows(
  importantEntryWindows: readonly EntryBoundaryContinuityWindow[],
  harmonicContinuity: HarmonicContinuitySummary,
  transitionRhythmReview: TransitionRhythmReviewSummary,
  dissonanceTriage: DissonanceTriageSummary,
  qualityVector: QualityVector,
  phraseDevelopmentReview: PhraseDevelopmentReviewSummary,
): ScoreWindowAcceptanceWindow[] {
  return [
    ...importantEntryWindows.map(scoreWindowFromEntryContinuity),
    ...harmonicContinuity.windows.map(scoreWindowFromHarmonicContinuity),
    ...transitionRhythmReview.windows.map(scoreWindowFromTransitionRhythm),
    ...qualityVector.harmonicSonorities.windows.map(scoreWindowFromHarmonicSonority),
    ...dissonanceTriage.windows.map(scoreWindowFromDissonance),
    ...qualityVector.voicePairSpans.map(scoreWindowFromVoicePairSpan),
    ...qualityVector.counterSubjectWindows.map(scoreWindowFromCounterSubject),
    ...phraseDevelopmentReview.windows.map(scoreWindowFromPhraseDevelopment),
    ...qualityVector.metricExplanations.map(scoreWindowFromMetricExplanation),
  ];
}

function countScoreWindowResponses(windows: readonly ScoreWindowAcceptanceWindow[]) {
  return {
    reviewRequired: windows.filter((window) => window.response === "review-required").length,
    generatorResponse: windows.filter((window) => window.response === "generator-response-required").length,
    acceptedContext: windows.filter((window) => window.response === "accepted-context").length,
    diagnosticContext: windows.filter((window) => window.response === "diagnostic-context").length,
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

function scoreWindowFromHarmonicContinuity(window: HarmonicContinuityWindow): ScoreWindowAcceptanceWindow {
  return {
    kind: "harmonic-continuity",
    startTick: window.startTick,
    durationTicks: window.durationTicks,
    state: window.state,
    voices: ["bass"],
    roles: ["free-counterpoint"],
    classification: window.classification,
    symptom:
      window.classification === "audible-progression"
        ? "short pivot episode has enough bass-root and chord-tone support to carry the planned progression"
        : "short pivot episode does not yet make the planned harmonic path audible",
    theoryBasis: "harmony",
    response: window.response,
  };
}

function scoreWindowFromHarmonicSonority(window: HarmonicSonorityWindow): ScoreWindowAcceptanceWindow {
  return {
    kind: "harmonic-sonority",
    startTick: window.startTick,
    durationTicks: window.durationTicks,
    state: window.state,
    voices: window.voices,
    roles: window.roles,
    classification: window.classification,
    symptom: window.symptom,
    theoryBasis: "harmony",
    response: window.response,
  };
}

function scoreWindowFromTransitionRhythm(window: TransitionRhythmWindow): ScoreWindowAcceptanceWindow {
  return {
    kind: "transition-rhythm",
    startTick: window.startTick,
    durationTicks: window.durationTicks,
    state: window.state,
    voices: window.activeVoices,
    roles: window.roleMix,
    classification: window.classification,
    symptom:
      window.classification === "prepared-pickup"
        ? "off-downbeat section boundary has sustained pickup or prepared support rhetoric"
        : window.classification === "meter-confirming"
          ? "section boundary lands on a meter-confirming location"
          : "off-downbeat section boundary needs pickup, cadence, held support, or directed-contour evidence",
    theoryBasis: "fugue-form",
    response: window.response,
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
