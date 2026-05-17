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

test("candidate pool oracle reports phase-11 blocker families and upper-bound evidence", () => {
  const selected = candidateEvaluation({
    entryRisk: 2,
    leapRecoveryMisses: 1,
    counterSubjectIdentityRetention: 0.8,
    phase11: {
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
    phase11: {
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
  const phase11Blockers = summary.blockerClassifications.filter((blocker) =>
    [
      "metrical-harmony",
      "bass-root-support",
      "register-blending",
      "functional-thinning",
      "section-grammar-repetition",
    ].includes(blocker.blocker),
  );
  const bassRootSupport = summary.blockerClassifications.find((blocker) => blocker.blocker === "bass-root-support");

  assert.equal(summary.schemaVersion, 2);
  assert.equal(phase11Blockers.length, 5);
  assert.ok(phase11Blockers.every((blocker) => blocker.classification === "selection-model"));
  assert.ok(phase11Blockers.every((blocker) => blocker.selectionOnlyUpperBoundRiskReduction > 0));
  assert.ok(phase11Blockers.every((blocker) => blocker.generatorNeededRate === 0));
  assert.equal(bassRootSupport?.selectedRiskTotal, 5);
  assert.equal(bassRootSupport?.bestViableRiskTotal, 2);
  assert.equal(bassRootSupport?.selectionOnlyUpperBoundRiskReduction, 3);
});

function candidateEvaluation(input: {
  entryRisk: number;
  leapRecoveryMisses: number;
  counterSubjectIdentityRetention: number;
  hardFailures?: CandidateEvaluation["hardFailures"];
  totalCost?: number;
  phase11?: {
    metricalHarmonyRisk?: number;
    bassRootUnsupportedCount?: number;
    registerBlendingRisk?: number;
    functionalThinningRisk?: number;
    sectionGrammarRisk?: number;
  };
}): CandidateEvaluation {
  const severeIntervalCount = Math.floor(input.entryRisk / 2);
  const unresolvedSevereIntervalCount = input.entryRisk - severeIntervalCount;
  const phase11 = input.phase11 ?? {};

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
          state: "subject-return",
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
        phase11AdjacentVoiceOverOctaveCount: phase11.registerBlendingRisk ?? 0,
        phase11AdjacentVoiceWideP75SemitoneExcess: 0,
        phase11RegisterSpanSemitoneTotal: 0,
        phase11FunctionalThinningNonCadentialRunCount: phase11.functionalThinningRisk ?? 0,
        phase11FunctionalThinningOneVoiceRunCount: 0,
        phase11FunctionalThinningMaxDurationQuarters: 0,
      }),
      subjectClarity: dimension({
        subjectIdentityViolations: 0,
        answerPlanViolations: 0,
        counterSubjectIdentityRetention: input.counterSubjectIdentityRetention,
      }),
      harmony: dimension({
        strongBeatDissonanceCount: phase11.metricalHarmonyRisk ?? 0,
        harmonicFunctionMismatches: 0,
        strongBeatChordToneMismatchCount: 0,
        weakBeatChordToneMismatchCount: 0,
        strongBeatBassRootUnsupportedCount: phase11.bassRootUnsupportedCount ?? 0,
      }),
      form: dimension({
        formRepetitionWarnings: phase11.sectionGrammarRisk ?? 0,
        phase11StateGrammarMostRepeatedPatternCount: 1,
        phase11TopEntryPatternFamilyCount: 1,
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
