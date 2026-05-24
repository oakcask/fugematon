import assert from "node:assert/strict";
import test from "node:test";
import { classifyCandidatePoolOracleSection, summarizeCandidatePoolOracleSections } from "./candidate-pool-oracle.js";
import type { CandidateEvaluation } from "./events.js";

test("candidate pool oracle classifies an improving viable candidate as selection-model", () => {
  const selected = candidateEvaluation({
    entryRisk: 6,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });
  const alternative = candidateEvaluation({
    entryRisk: 2,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
    totalCost: 200,
  });

  const section = classifyCandidatePoolOracleSection({
    state: "subject-return",
    startTick: 9600,
    durationTicks: 3840,
    evaluations: [selected, alternative],
    selectedCandidateIndex: 0,
  });
  const summary = summarizeCandidatePoolOracleSections([section]);
  const entryHarmony = summary.blockerClassifications.find((blocker) => blocker.blocker === "entry-harmony");

  assert.equal(entryHarmony?.classification, "selection-model");
  assert.equal(entryHarmony?.viableImprovementCount, 1);
  assert.equal(entryHarmony?.selectedRiskTotal, 6);
  assert.equal(entryHarmony?.bestViableRiskTotal, 2);
  assert.equal(entryHarmony?.selectionOnlyUpperBoundRiskReduction, 4);
  assert.equal(entryHarmony?.selectionOnlyUpperBoundRiskReductionRate, 0.667);
  assert.equal(entryHarmony?.generatorNeededRate, 0);
  assert.equal(entryHarmony?.representative.selectedRisk, 6);
  assert.equal(entryHarmony?.representative.bestViableRisk, 2);
});

test("candidate pool oracle classifies missing viable improvement as generator-or-section-planner", () => {
  const selected = candidateEvaluation({
    entryRisk: 6,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });
  const nonImproving = candidateEvaluation({
    entryRisk: 6,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });
  const guardrailRegression = candidateEvaluation({
    entryRisk: 1,
    leapRecoveryMisses: 4,
    counterSubjectIdentityRetention: 0.8,
  });

  const summary = summarizeCandidatePoolOracleSections([
    classifyCandidatePoolOracleSection({
      state: "episode",
      startTick: 9600,
      durationTicks: 3840,
      evaluations: [selected, nonImproving, guardrailRegression],
      selectedCandidateIndex: 0,
    }),
  ]);
  const entryHarmony = summary.blockerClassifications.find((blocker) => blocker.blocker === "entry-harmony");

  assert.equal(entryHarmony?.classification, "generator-or-section-planner");
  assert.equal(entryHarmony?.viableImprovementCount, 0);
  assert.equal(entryHarmony?.selectionOnlyUpperBoundRiskReduction, 0);
  assert.equal(entryHarmony?.generatorNeededRate, 1);
  assert.equal(entryHarmony?.representative.bestViableRisk, 6);
});

test("candidate pool oracle never treats hard failures as viable improvements", () => {
  const selected = candidateEvaluation({
    entryRisk: 6,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });
  const hardFailure = candidateEvaluation({
    entryRisk: 0,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
    hardFailures: ["voice-crossing"],
  });

  const summary = summarizeCandidatePoolOracleSections([
    classifyCandidatePoolOracleSection({
      state: "subject-return",
      startTick: 9600,
      durationTicks: 3840,
      evaluations: [selected, hardFailure],
      selectedCandidateIndex: 0,
    }),
  ]);
  const entryHarmony = summary.blockerClassifications.find((blocker) => blocker.blocker === "entry-harmony");

  assert.equal(summary.hardFailureRejectedCandidateCount, 1);
  assert.equal(summary.viableCandidateCount, 1);
  assert.equal(entryHarmony?.classification, "generator-or-section-planner");
  assert.equal(entryHarmony?.viableImprovementCount, 0);
});

test("candidate pool oracle reports texture-planning blocker families and upper-bound evidence", () => {
  const selected = candidateEvaluation({
    entryRisk: 2,
    leapRecoveryMisses: 1,
    counterSubjectIdentityRetention: 0.8,
    texturePlanning: {
      metricalHarmonyRisk: 12,
      bassRootUnsupportedCount: 5,
      registerBlendingRisk: 18,
      functionalThinningRisk: 7,
      sectionGrammarRisk: 4,
    },
  });
  const alternative = candidateEvaluation({
    entryRisk: 2,
    leapRecoveryMisses: 1,
    counterSubjectIdentityRetention: 0.8,
    texturePlanning: {
      metricalHarmonyRisk: 8,
      bassRootUnsupportedCount: 2,
      registerBlendingRisk: 10,
      functionalThinningRisk: 3,
      sectionGrammarRisk: 1,
    },
  });

  const summary = summarizeCandidatePoolOracleSections([
    classifyCandidatePoolOracleSection({
      state: "episode",
      startTick: 9600,
      durationTicks: 3840,
      evaluations: [selected, alternative],
      selectedCandidateIndex: 0,
    }),
  ]);
  const texturePlanningBlockers = summary.blockerClassifications.filter((blocker) =>
    [
      "metrical-harmony",
      "bass-root-support",
      "register-blending",
      "functional-thinning",
      "section-grammar-repetition",
    ].includes(blocker.blocker),
  );
  const bassRootSupport = summary.blockerClassifications.find((blocker) => blocker.blocker === "bass-root-support");

  assert.equal(summary.schemaVersion, 5);
  assert.equal(summary.phraseFamilyCandidateCount, 0);
  assert.equal(texturePlanningBlockers.length, 5);
  assert.ok(texturePlanningBlockers.every((blocker) => blocker.classification === "selection-model"));
  assert.ok(texturePlanningBlockers.every((blocker) => blocker.selectionOnlyUpperBoundRiskReduction > 0));
  assert.ok(texturePlanningBlockers.every((blocker) => blocker.generatorNeededRate === 0));
  assert.equal(bassRootSupport?.selectedRiskTotal, 5);
  assert.equal(bassRootSupport?.bestViableRiskTotal, 2);
  assert.equal(bassRootSupport?.selectionOnlyUpperBoundRiskReduction, 3);
});

test("candidate pool oracle scores section grammar history by candidate state", () => {
  const selected = candidateEvaluation({
    entryRisk: 0,
    leapRecoveryMisses: 0,
    counterSubjectIdentityRetention: 0.8,
    sectionState: "stretto-like",
    texturePlanning: {
      sectionGrammarRisk: 2,
    },
  });
  const alternativeState = candidateEvaluation({
    entryRisk: 0,
    leapRecoveryMisses: 0,
    counterSubjectIdentityRetention: 0.8,
    sectionState: "subject-return",
    texturePlanning: {
      sectionGrammarRisk: 2,
    },
  });

  const summary = summarizeCandidatePoolOracleSections([
    classifyCandidatePoolOracleSection({
      state: "stretto-like",
      startTick: 9600,
      durationTicks: 3840,
      evaluations: [selected, alternativeState],
      selectedCandidateIndex: 0,
      stateHistory: [
        "exposition",
        "episode",
        "subject-return",
        "episode",
        "stretto-like",
        "episode",
        "subject-return",
        "episode",
        "stretto-like",
      ],
    }),
  ]);
  const sectionGrammar = summary.blockerClassifications.find(
    (blocker) => blocker.blocker === "section-grammar-repetition",
  );

  assert.equal(sectionGrammar?.classification, "selection-model");
  assert.equal(sectionGrammar?.selectedRiskTotal, 3);
  assert.equal(sectionGrammar?.bestViableRiskTotal, 2);
  assert.equal(sectionGrammar?.selectionOnlyUpperBoundRiskReduction, 1);
  assert.equal(sectionGrammar?.generatorNeededRate, 0);
});

test("candidate pool oracle keeps phrase family evidence traceable per representative", () => {
  const selected = candidateEvaluation({
    entryRisk: 6,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });
  const alternative = candidateEvaluation({
    entryRisk: 2,
    leapRecoveryMisses: 2,
    counterSubjectIdentityRetention: 0.8,
  });

  const summary = summarizeCandidatePoolOracleSections([
    classifyCandidatePoolOracleSection({
      state: "episode",
      startTick: 9600,
      durationTicks: 3840,
      evaluations: [selected, alternative],
      selectedCandidateIndex: 0,
      candidateDiversityDescriptors: [candidateDiversity("stem-a"), candidateDiversity("stem-b")],
      phraseFamilyCandidateCount: 3,
    }),
    classifyCandidatePoolOracleSection({
      state: "subject-return",
      startTick: 13_440,
      durationTicks: 3840,
      evaluations: [selected, alternative],
      selectedCandidateIndex: 0,
      candidateDiversityDescriptors: [candidateDiversity("stem-a"), candidateDiversity("stem-a")],
      phraseFamilyCandidateCount: 5,
    }),
  ]);
  const entryHarmony = summary.blockerClassifications.find((blocker) => blocker.blocker === "entry-harmony");
  const subjectStemDiversity = summary.candidateDiversity.find((diversity) => diversity.facet === "subjectStem");

  assert.equal(summary.phraseFamilyCandidateCount, 8);
  assert.equal(entryHarmony?.representative.phraseFamilyCandidateCount, 3);
  assert.equal(entryHarmony?.representative.candidateCount, 2);
  assert.equal(entryHarmony?.representative.viableCandidateCount, 2);
  assert.equal(subjectStemDiversity?.candidateCount, 4);
  assert.equal(subjectStemDiversity?.viableCandidateCount, 4);
  assert.equal(subjectStemDiversity?.uniqueValueCount, 2);
  assert.equal(subjectStemDiversity?.viableUniqueValueCount, 2);
  assert.equal(subjectStemDiversity?.selectionHasViableAlternative, true);
});

function candidateEvaluation(input: {
  entryRisk: number;
  leapRecoveryMisses: number;
  counterSubjectIdentityRetention: number;
  sectionState?: CandidateEvaluation["explanations"]["sections"][number]["state"];
  hardFailures?: CandidateEvaluation["hardFailures"];
  totalCost?: number;
  texturePlanning?: {
    metricalHarmonyRisk?: number;
    bassRootUnsupportedCount?: number;
    registerBlendingRisk?: number;
    functionalThinningRisk?: number;
    sectionGrammarRisk?: number;
  };
}): CandidateEvaluation {
  const severeIntervalCount = Math.floor(input.entryRisk / 2);
  const unresolvedSevereIntervalCount = input.entryRisk - severeIntervalCount;
  const texturePlanning = input.texturePlanning ?? {};

  return {
    featureVersion: 3,
    evaluationModelVersion: 8,
    totalCost: input.totalCost ?? 100,
    hardFailures: input.hardFailures ?? [],
    explanations: {
      entries: [
        {
          voice: "soprano",
          form: "subject",
          state: "subject-return",
          startTick: 9600,
          instabilityCount: input.entryRisk,
          severeIntervalCount,
          unresolvedSevereIntervalCount,
        },
      ],
      voicePairs: [
        {
          leftVoice: "soprano",
          rightVoice: "alto",
          samePitchOverlapCount: 0,
          unisonOverlapCount: 0,
          sharedRhythmOverlapCount: 0,
          sameDirectionMotionCount: 0,
        },
      ],
      voices: [
        {
          voice: "soprano",
          leapRecoveryMisses: input.leapRecoveryMisses,
          repeatedPitchRunCount: 0,
        },
      ],
      sections: [
        {
          state: input.sectionState ?? "subject-return",
          startTick: 9600,
          durationTicks: 3840,
          cadenceKind: "authentic",
          cadenceTargetCount: 1,
          soloTextureRisk: 0,
        },
      ],
    },
    dimensions: {
      counterpoint: dimension({}),
      melody: dimension({ leapRecoveryMisses: input.leapRecoveryMisses }),
      texture: dimension({
        fourBeatBassUpperSameDirectionRatio: 0.4,
        eightBeatBassUpperSameDirectionRatio: 0.4,
        fourBeatOuterVoiceSameDirectionRatio: 0.4,
        wideAdjacentVoiceSpacingCount: texturePlanning.registerBlendingRisk ?? 0,
        adjacentVoiceWideP75SemitoneExcess: 0,
        registerSpanSemitoneTotal: 0,
        nonCadentialFunctionalThinningRunCount: texturePlanning.functionalThinningRisk ?? 0,
        oneVoiceFunctionalThinningRunCount: 0,
        functionalThinningMaxDurationQuarters: 0,
      }),
      subjectClarity: dimension({
        subjectIdentityViolations: 0,
        answerPlanViolations: 0,
        counterSubjectIdentityRetention: input.counterSubjectIdentityRetention,
      }),
      harmony: dimension({
        strongBeatDissonanceCount: texturePlanning.metricalHarmonyRisk ?? 0,
        harmonicFunctionMismatches: 0,
        strongBeatChordToneMismatchCount: 0,
        weakBeatChordToneMismatchCount: 0,
        strongBeatBassRootUnsupportedCount: texturePlanning.bassRootUnsupportedCount ?? 0,
      }),
      form: dimension({
        formRepetitionWarnings: texturePlanning.sectionGrammarRisk ?? 0,
        stateGrammarMostRepeatedPatternCount: 1,
        topEntryPatternFamilyCount: 1,
      }),
    },
  };
}

function dimension(features: Record<string, number>) {
  return {
    cost: 0,
    reward: 0,
    features,
  };
}

function candidateDiversity(subjectStem: string) {
  return {
    subjectStem,
    answerTransform: "none",
    fragmentDerivation: "none:restatement",
    phraseFunction: "restatement",
    cadenceApproach: "authentic",
    supportRole: "counter-subject",
    sectionState: "subject-return",
  };
}
