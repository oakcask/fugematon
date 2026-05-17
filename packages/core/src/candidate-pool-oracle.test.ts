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

function candidateEvaluation(input: {
  entryRisk: number;
  leapRecoveryMisses: number;
  counterSubjectIdentityRetention: number;
  hardFailures?: CandidateEvaluation["hardFailures"];
  totalCost?: number;
}): CandidateEvaluation {
  const severeIntervalCount = Math.floor(input.entryRisk / 2);
  const unresolvedSevereIntervalCount = input.entryRisk - severeIntervalCount;

  return {
    featureVersion: 2,
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
      }),
      subjectClarity: dimension({
        subjectIdentityViolations: 0,
        answerPlanViolations: 0,
        counterSubjectIdentityRetention: input.counterSubjectIdentityRetention,
      }),
      harmony: dimension({}),
      form: dimension({}),
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
