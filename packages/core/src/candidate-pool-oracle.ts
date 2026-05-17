import type {
  CandidateEvaluation,
  CandidatePoolOracleBlocker,
  CandidatePoolOracleClassification,
  CandidatePoolOracleRepresentative,
  CandidatePoolOracleSummary,
  FugueState,
} from "./events.js";
import {
  compareReferenceMetricValue,
  PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE,
  type ReferenceDiagnosticsProfile,
  type ReferenceMetricAxis,
} from "./reference-diagnostics.js";

type CandidatePoolOracleSection = {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  candidateCount: number;
  selectedCandidateIndex: number;
  viableCandidateCount: number;
  hardFailureRejectedCandidateCount: number;
  blockers: CandidatePoolOracleSectionBlocker[];
};

type CandidatePoolOracleSectionBlocker = {
  blocker: CandidatePoolOracleBlocker;
  referenceAxes: ReferenceMetricAxis[];
  classification: CandidatePoolOracleClassification;
  viableImprovementCount: number;
  selectedRisk: number;
  bestViableRisk: number;
  selectedReferenceStatus: CandidatePoolOracleRepresentative["selectedReferenceStatus"];
  bestViableReferenceStatus: CandidatePoolOracleRepresentative["bestViableReferenceStatus"];
};

type BlockerSpec = {
  blocker: CandidatePoolOracleBlocker;
  referenceAxes: ReferenceMetricAxis[];
  selectedRisk: (evaluation: CandidateEvaluation) => number;
};

const BLOCKER_SPECS: readonly BlockerSpec[] = [
  {
    blocker: "entry-harmony",
    referenceAxes: ["severeEntryIntervalPerEntry", "unresolvedSevereEntryIntervalPerEntry"],
    selectedRisk: (evaluation) =>
      maximum(
        evaluation.explanations.entries.map((entry) => entry.severeIntervalCount + entry.unresolvedSevereIntervalCount),
      ),
  },
  {
    blocker: "voice-pair-lockstep",
    referenceAxes: [
      "samePitchOverlapPerVoicePairQuarter",
      "unisonOverlapPerVoicePairQuarter",
      "sharedRhythmOverlapPerVoicePairQuarter",
    ],
    selectedRisk: (evaluation) =>
      maximum(
        evaluation.explanations.voicePairs.map(
          (pair) => pair.samePitchOverlapCount * 4 + pair.unisonOverlapCount + pair.sharedRhythmOverlapCount,
        ),
      ),
  },
  {
    blocker: "melody-leap-recovery",
    referenceAxes: ["leapRecoveryMissesPerQuarter"],
    selectedRisk: (evaluation) => evaluation.dimensions.melody.features.leapRecoveryMisses ?? 0,
  },
  {
    blocker: "stepwise-pattern-fixation",
    referenceAxes: ["freeCounterpointStepwiseRunRatio", "freeCounterpointRepeatedDegreePatternsPerQuarter"],
    selectedRisk: (evaluation) =>
      (evaluation.dimensions.melody.features.freeCounterpointStepwiseRunRatio ?? 0) * 10 +
      (evaluation.dimensions.melody.features.freeCounterpointRepeatedDegreePatternCount ?? 0) / 100,
  },
  {
    blocker: "section-solo-texture",
    referenceAxes: ["unsupportedSoloRunsPerSection", "abruptTextureDropsPerSection"],
    selectedRisk: (evaluation) => maximum(evaluation.explanations.sections.map((section) => section.soloTextureRisk)),
  },
] as const;

export function classifyCandidatePoolOracleSection(input: {
  state: FugueState;
  startTick: number;
  durationTicks: number;
  evaluations: readonly CandidateEvaluation[];
  selectedCandidateIndex: number;
  referenceProfile?: ReferenceDiagnosticsProfile;
}): CandidatePoolOracleSection {
  const selected = input.evaluations[input.selectedCandidateIndex];
  if (selected === undefined) {
    throw new Error("selected candidate evaluation is missing");
  }

  const viable = input.evaluations.map((evaluation) => isViableOracleCandidate(evaluation, selected));
  const hardFailureRejectedCandidateCount = input.evaluations.filter(
    (evaluation) => evaluation.hardFailures.length > 0,
  ).length;
  const profile = input.referenceProfile ?? PHASE_7_REFERENCE_DIAGNOSTICS_PROFILE;

  return {
    state: input.state,
    startTick: input.startTick,
    durationTicks: input.durationTicks,
    candidateCount: input.evaluations.length,
    selectedCandidateIndex: input.selectedCandidateIndex,
    viableCandidateCount: viable.filter(Boolean).length,
    hardFailureRejectedCandidateCount,
    blockers: BLOCKER_SPECS.flatMap((spec) => {
      const selectedRisk = roundOracleRisk(spec.selectedRisk(selected));
      if (selectedRisk <= 0) {
        return [];
      }

      const viableRisks = input.evaluations
        .map((evaluation, index) => (viable[index] ? roundOracleRisk(spec.selectedRisk(evaluation)) : undefined))
        .filter((risk): risk is number => risk !== undefined);
      const bestViableRisk = viableRisks.length === 0 ? selectedRisk : minimum(viableRisks);
      const viableImprovementCount = viableRisks.filter((risk) => risk < selectedRisk).length;

      return [
        {
          blocker: spec.blocker,
          referenceAxes: spec.referenceAxes,
          classification: viableImprovementCount > 0 ? "selection-model" : "generator-or-section-planner",
          viableImprovementCount,
          selectedRisk,
          bestViableRisk,
          selectedReferenceStatus: compareCandidateRiskToReference(selectedRisk, spec.referenceAxes[0], profile),
          bestViableReferenceStatus: compareCandidateRiskToReference(bestViableRisk, spec.referenceAxes[0], profile),
        },
      ];
    }),
  };
}

export function summarizeCandidatePoolOracleSections(
  sections: readonly CandidatePoolOracleSection[],
): CandidatePoolOracleSummary {
  const blockerSummaries = BLOCKER_SPECS.flatMap((spec) => {
    const sectionBlockers = sections.flatMap((section) =>
      section.blockers.filter((blocker) => blocker.blocker === spec.blocker).map((blocker) => ({ section, blocker })),
    );
    if (sectionBlockers.length === 0) {
      return [];
    }

    const selectionModelSectionCount = sectionBlockers.filter(
      ({ blocker }) => blocker.classification === "selection-model",
    ).length;
    const generatorOrSectionPlannerSectionCount = sectionBlockers.length - selectionModelSectionCount;
    const classification: CandidatePoolOracleClassification =
      selectionModelSectionCount > 0 ? "selection-model" : "generator-or-section-planner";
    const representative = chooseRepresentative(sectionBlockers);

    return [
      {
        blocker: spec.blocker,
        referenceAxes: spec.referenceAxes,
        classification,
        observedSectionCount: sectionBlockers.length,
        selectionModelSectionCount,
        generatorOrSectionPlannerSectionCount,
        viableImprovementCount: sectionBlockers.reduce((sum, { blocker }) => sum + blocker.viableImprovementCount, 0),
        selectedRiskMax: maximum(sectionBlockers.map(({ blocker }) => blocker.selectedRisk)),
        bestViableRiskMin: minimum(sectionBlockers.map(({ blocker }) => blocker.bestViableRisk)),
        representative,
      },
    ];
  });

  return {
    schemaVersion: 1,
    sectionCount: sections.length,
    candidateCount: sections.reduce((sum, section) => sum + section.candidateCount, 0),
    viableCandidateCount: sections.reduce((sum, section) => sum + section.viableCandidateCount, 0),
    hardFailureRejectedCandidateCount: sections.reduce(
      (sum, section) => sum + section.hardFailureRejectedCandidateCount,
      0,
    ),
    blockerClassifications: blockerSummaries,
  };
}

function chooseRepresentative(
  sectionBlockers: readonly { section: CandidatePoolOracleSection; blocker: CandidatePoolOracleSectionBlocker }[],
): CandidatePoolOracleRepresentative {
  const best = sectionBlockers.reduce((currentBest, current) => {
    if (
      current.blocker.classification === "selection-model" &&
      currentBest.blocker.classification !== "selection-model"
    ) {
      return current;
    }
    if (current.blocker.selectedRisk > currentBest.blocker.selectedRisk) {
      return current;
    }
    return currentBest;
  }, sectionBlockers[0]!);

  return {
    state: best.section.state,
    startTick: best.section.startTick,
    durationTicks: best.section.durationTicks,
    candidateCount: best.section.candidateCount,
    selectedCandidateIndex: best.section.selectedCandidateIndex,
    viableCandidateCount: best.section.viableCandidateCount,
    hardFailureRejectedCandidateCount: best.section.hardFailureRejectedCandidateCount,
    selectedRisk: best.blocker.selectedRisk,
    bestViableRisk: best.blocker.bestViableRisk,
    selectedReferenceStatus: best.blocker.selectedReferenceStatus,
    bestViableReferenceStatus: best.blocker.bestViableReferenceStatus,
  };
}

function isViableOracleCandidate(evaluation: CandidateEvaluation, selected: CandidateEvaluation): boolean {
  if (evaluation.hardFailures.length > 0) {
    return false;
  }

  return (
    feature(evaluation, "subjectClarity", "subjectIdentityViolations") === 0 &&
    feature(evaluation, "subjectClarity", "answerPlanViolations") === 0 &&
    feature(evaluation, "melody", "leapRecoveryMisses") <= feature(selected, "melody", "leapRecoveryMisses") &&
    feature(evaluation, "subjectClarity", "counterSubjectIdentityRetention") >=
      feature(selected, "subjectClarity", "counterSubjectIdentityRetention") &&
    feature(evaluation, "texture", "fourBeatBassUpperSameDirectionRatio") <=
      feature(selected, "texture", "fourBeatBassUpperSameDirectionRatio") &&
    feature(evaluation, "texture", "eightBeatBassUpperSameDirectionRatio") <=
      feature(selected, "texture", "eightBeatBassUpperSameDirectionRatio") &&
    feature(evaluation, "texture", "fourBeatOuterVoiceSameDirectionRatio") <=
      feature(selected, "texture", "fourBeatOuterVoiceSameDirectionRatio")
  );
}

function feature(
  evaluation: CandidateEvaluation,
  dimension: keyof CandidateEvaluation["dimensions"],
  name: string,
): number {
  return evaluation.dimensions[dimension].features[name] ?? 0;
}

function compareCandidateRiskToReference(
  value: number,
  axis: ReferenceMetricAxis,
  profile: ReferenceDiagnosticsProfile,
): CandidatePoolOracleRepresentative["selectedReferenceStatus"] {
  const metric = profile.metrics.find((candidate) => candidate.axis === axis);
  if (metric === undefined) {
    return "within-reference";
  }

  return compareReferenceMetricValue(metric, value).status;
}

function maximum(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.max(...values);
}

function minimum(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.min(...values);
}

function roundOracleRisk(value: number): number {
  return Math.round(value * 1000) / 1000;
}
