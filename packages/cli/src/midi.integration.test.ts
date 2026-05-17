import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { main } from "./index.js";

test("generate command writes score event JSON to stdout", async () => {
  const stdout = await captureConsoleLog(() => main(["generate", "--seed", "bach-001", "--ticks", "960"]));
  const events = JSON.parse(stdout) as { kind: string; type?: string; tick?: number }[];

  assert.ok(events.length > 0);
  assert.equal(events[0]?.kind, "meta");
  assert.equal(events[0]?.type, "generator-version");
  assert.equal(events.at(-1)?.kind, "meta");
  assert.equal(events.at(-1)?.type, "score-end");
  assert.ok((events.at(-1)?.tick ?? 0) >= 960);
});

test("generate command writes score event JSON to a file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-generate-"));
  try {
    const outputPath = join(directory, "score.json");

    await main(["generate", "--seed", "bach-001", "--ticks", "960", "--out", outputPath]);

    const events = JSON.parse(await readFile(outputPath, "utf8")) as { kind: string; type?: string }[];
    assert.ok(events.length > 0);
    assert.equal(events[0]?.type, "generator-version");
    assert.equal(events.at(-1)?.type, "score-end");
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("diagnose command writes diagnostics JSON to stdout", async () => {
  const stdout = await captureConsoleLog(() => main(["diagnose", "--seed", "bach-001", "--ticks", "960"]));
  const diagnostics = JSON.parse(stdout) as {
    seed: string;
    lengthTicks: number;
    eventCount: number;
    noteCount: number;
  };

  assert.equal(diagnostics.seed, "bach-001");
  assert.equal(diagnostics.lengthTicks, 960);
  assert.ok(diagnostics.eventCount > 0);
  assert.ok(diagnostics.noteCount > 0);
});

test("midi command writes a valid standard MIDI file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-midi-"));
  try {
    const outputPath = join(directory, "score.mid");

    await main(["midi", "--seed", "bach-001", "--ticks", "7680", "--out", outputPath]);

    const bytes = await readFile(outputPath);
    const result = parseStandardMidiFile(bytes);

    assert.equal(result.format, 1);
    assert.equal(result.trackCount, 5);
    assert.equal(result.division, 480);
    assert.equal(result.endOfTrackCount, 5);
    assert.ok(result.channelEventCount > 0);
    assert.ok(result.metaEventTypes.has(0x51));
    assert.ok(result.metaEventTypes.has(0x58));
    assert.ok(result.metaEventTypes.has(0x59));
    assert.ok(result.metaEventTypes.has(0x03));
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("review command writes diagnostics and MIDI files for phase-5 seeds", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-review-"));
  try {
    await main(["review", "--ticks", "9600", "--out", directory]);

    const files = await readdir(directory);
    const summary = JSON.parse(await readFile(join(directory, "summary.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      selectionModel: string;
      referenceDiagnostics: {
        profile: {
          profileId: string;
          sources: {
            sourceId: string;
            sourceFormat: string;
            scoreFileRedistributed: boolean;
          }[];
          ingestionPlan: {
            supportedFormats: string[];
          };
          metricAxes: string[];
        };
        seedCount: number;
        axes: {
          axis: string;
          normalizer: string;
          referenceMin: number;
          referenceMax: number;
          averageValue: number;
          outsideReferenceSeedCount: number;
        }[];
        outsideReferenceSeedCount: number;
        maxDistance: number;
      };
      seeds: {
        seed: string;
        diagnosticsFile: string;
        midiFile: string;
        diagnosticsSummary: {
          hardConstraintFailures: number;
          texture: {
            rhythmicIndependenceScore: number;
            samePitchOverlapCount: number;
            maxEntrySupportInstabilityPerEntry: number;
            maxConsecutiveEntrySupportInstabilities: number;
            unresolvedEntrySupportInstabilityCount: number;
            severeEntryIntervalCount: number;
            unresolvedSevereEntryIntervalCount: number;
            soloTexture: {
              unsupportedSoloRunCount: number;
              abruptTextureDropCount: number;
            };
            pitchContourMotion: {
              fourBeat: {
                bassUpperSameDirectionRatio: number;
                bassUpperContraryRatio: number;
              };
              eightBeat: {
                bassUpperSameDirectionRatio: number;
                bassUpperContraryRatio: number;
              };
            };
            stepwisePattern: {
              degreePatternLength: number;
              roles: {
                role: string;
                stepwiseRunRatio: number;
                ascendingStepRatio: number;
                descendingStepRatio: number;
                maxMonotoneStepRun: number;
                repeatedDegreePatternCount: number;
                rolePatternEntropy: number;
              }[];
              sections: {
                role: string;
                state: string;
                maxMonotoneStepRun: number;
                repeatedDegreePatternCount: number;
              }[];
            };
          };
          melody: {
            leapRecoveryMisses: number;
          };
          form: {
            longRunRepetition: {
              continuationPatternWindowSize: number;
              mostRepeatedContinuationPattern: string[];
              mostRepeatedContinuationPatternCount: number;
              uniqueContinuationPatternCount: number;
            };
          };
          candidateEvaluation: {
            featureVersion: number;
            evaluationModelVersion: number;
            selectedCandidateEvaluationCount: number;
            entryExplanationCount: number;
            voicePairExplanationCount: number;
            voiceExplanationCount: number;
            sectionExplanationCount: number;
            maxEntryInstabilityCount: number;
            maxEntrySevereIntervalCount: number;
            maxVoicePairUnisonOverlapCount: number;
            maxVoicePairSharedRhythmOverlapCount: number;
            maxSectionSoloTextureRisk: number;
            totalSectionExplanationCount: number;
            maxSelectedSectionSoloTextureRisk: number;
            averageSelectedSectionSoloTextureRisk: number;
            highSelectedSectionSoloTextureRiskCount: number;
            sectionSoloTextureRiskWarningThreshold: number;
          };
          candidatePoolOracle: {
            schemaVersion: number;
            sectionCount: number;
            candidateCount: number;
            viableCandidateCount: number;
            hardFailureRejectedCandidateCount: number;
            blockerClassifications: {
              blocker: string;
              referenceAxes: string[];
              classification: string;
              observedSectionCount: number;
              selectionModelSectionCount: number;
              generatorOrSectionPlannerSectionCount: number;
              viableImprovementCount: number;
              selectedRiskTotal: number;
              bestViableRiskTotal: number;
              selectionOnlyUpperBoundRiskReduction: number;
              selectionOnlyUpperBoundRiskReductionRate: number;
              generatorNeededRate: number;
              selectedRiskMax: number;
              bestViableRiskMin: number;
              representative: {
                state: string;
                candidateCount: number;
                viableCandidateCount: number;
                selectedRisk: number;
                bestViableRisk: number;
                selectedReferenceStatus: string;
                bestViableReferenceStatus: string;
              };
            }[];
          };
          phase11Review: {
            schemaVersion: number;
            adjacentVoiceIntervals: { checkpointCount: number; medianSemitones: number; overOctaveCount: number }[];
            registerSpans: { noteCount: number; spanSemitones: number }[];
            functionalThinning: { nonCadentialRunCount: number; maxDurationTicks: number };
            stateGrammarRepetition: {
              patternLength: number;
              uniquePatternCount: number;
              mostRepeatedPatternCount: number;
            };
            entryPatternFamilies: { pattern: number[]; count: number }[];
            metricalHarmony: {
              strongBeatCheckpointCount: number;
              strongBeatChordToneSupportCount: number;
              strongBeatBassRootSupportCount: number;
              weakBeatCheckpointCount: number;
            };
          };
        };
        referenceComparison: {
          profileId: string;
          seed: string;
          normalizers: {
            scoreQuarterNotes: number;
            estimatedActiveVoicePairQuarterNotes: number;
            subjectEntryCount: number;
            sectionCount: number;
          };
          metrics: {
            axis: string;
            normalizer: string;
            referenceMin: number;
            referenceMax: number;
            value: number;
            status: string;
          }[];
          outsideReferenceCount: number;
          reviewStatus: string;
        };
        phase59Gate: {
          passed: boolean;
          failures: unknown[];
          metrics: {
            selectedCandidateEvaluationCount: number;
            maxSelectedCandidateTextureCost: number;
          };
        };
        phase511Gate: {
          passed: boolean;
          failures: unknown[];
          followUps: unknown[];
        };
        phase6Gate: {
          passed: boolean;
          failures: unknown[];
        };
        phase7Gate: {
          passed: boolean;
          failures: unknown[];
        };
        phase7BGate: {
          policy: {
            schemaVersion: number;
            phase: string;
          };
          passed: boolean;
          hardConstraintPassed: boolean;
          phase8Ready: boolean;
          findings: { policy: string; source: string }[];
          hardFailures: { policy: string; source: string }[];
          reviewSignals: { policy: string; source: string }[];
          warnings: { policy: string; source: string }[];
          manual: { policy: string; source: string }[];
          metrics: {
            hardFailureCount: number;
            hardConstraintFailureCount: number;
            diagnosticsWarningCount: number;
          };
          legacyPhase7Gate: {
            passed: boolean;
            failures: unknown[];
          };
        };
      }[];
    };
    const listeningReview = JSON.parse(await readFile(join(directory, "listening-review.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      regressionChecks: string[];
      seeds: {
        seed: string;
        diagnosticsFile: string;
        midiFile: string;
        judgement: string;
        criteria: Record<string, string>;
        notes: string;
        blockers: string[];
      }[];
    };
    const pairwisePreferences = JSON.parse(await readFile(join(directory, "pairwise-preferences.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      manualListeningStatus: string;
      manualListeningGap: {
        unlistened: boolean;
        note: string;
      };
      comparisons: unknown[];
    };

    assert.equal(summary.schemaVersion, 11);
    assert.equal(summary.lengthTicks, 9600);
    assert.equal(summary.selectionModel, "baseline");
    assert.ok(summary.seeds.length > 1);
    assert.equal(summary.referenceDiagnostics.profile.profileId, "phase-7-fugue-reference-profile");
    assert.equal(summary.referenceDiagnostics.profile.sources[0]?.sourceFormat, "profile-fixture");
    assert.equal(summary.referenceDiagnostics.profile.sources[0]?.scoreFileRedistributed, false);
    assert.ok(summary.referenceDiagnostics.profile.ingestionPlan.supportedFormats.includes("musicxml"));
    assert.ok(summary.referenceDiagnostics.profile.ingestionPlan.supportedFormats.includes("humdrum"));
    assert.ok(summary.referenceDiagnostics.profile.metricAxes.includes("sharedRhythmOverlapPerVoicePairQuarter"));
    assert.equal(summary.referenceDiagnostics.seedCount, summary.seeds.length);
    assert.ok(summary.referenceDiagnostics.axes.length > 1);
    assert.ok(summary.referenceDiagnostics.maxDistance >= 0);
    assert.equal(listeningReview.schemaVersion, 1);
    assert.equal(listeningReview.lengthTicks, 9600);
    assert.ok(listeningReview.regressionChecks.some((check) => check.includes("fugue-smoke")));
    assert.deepEqual(pairwisePreferences, {
      schemaVersion: 2,
      lengthTicks: 9600,
      instructions:
        "Fill preferredSide only after manual pairwise listening. These records are candidates for future aesthetic scoring weights and do not override hard constraints.",
      manualListeningStatus: "not-reviewed",
      manualListeningGap: {
        unlistened: true,
        note: "This generated template has not been manually listened to and contains no preference judgement.",
      },
      comparisons: [],
    });
    for (const entry of summary.seeds) {
      assert.ok(files.includes(entry.diagnosticsFile));
      assert.ok(files.includes(entry.midiFile));
      assert.ok(!entry.diagnosticsFile.includes(directory));
      assert.ok(!entry.midiFile.includes(directory));
      assert.ok(entry.diagnosticsSummary.hardConstraintFailures >= 0);
      assert.equal(entry.referenceComparison.profileId, "phase-7-fugue-reference-profile");
      assert.equal(entry.referenceComparison.seed, entry.seed);
      assert.ok(entry.referenceComparison.normalizers.scoreQuarterNotes > 0);
      assert.ok(entry.referenceComparison.normalizers.estimatedActiveVoicePairQuarterNotes > 0);
      assert.ok(entry.referenceComparison.normalizers.subjectEntryCount > 0);
      assert.ok(entry.referenceComparison.normalizers.sectionCount > 0);
      assert.ok(
        entry.referenceComparison.metrics.some(
          (metric) =>
            metric.axis === "sharedRhythmOverlapPerVoicePairQuarter" &&
            metric.normalizer === "estimated-active-voice-pair-quarter-notes" &&
            metric.referenceMax > 0 &&
            metric.value >= 0,
        ),
      );
      assert.ok(
        entry.referenceComparison.metrics.some(
          (metric) =>
            metric.axis === "freeCounterpointStepwiseRunRatio" &&
            metric.normalizer === "already-normalized" &&
            metric.referenceMin > 0 &&
            metric.referenceMax > metric.referenceMin,
        ),
      );
      assert.ok(entry.referenceComparison.outsideReferenceCount >= 0);
      assert.ok(
        entry.referenceComparison.reviewStatus === "within-reference-profile" ||
          entry.referenceComparison.reviewStatus === "reference-review-required",
      );
      assert.ok(entry.diagnosticsSummary.texture.rhythmicIndependenceScore >= 0);
      assert.ok(entry.diagnosticsSummary.texture.rhythmicIndependenceScore <= 1);
      assert.equal(typeof entry.phase59Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase59Gate.failures));
      assert.ok(entry.phase59Gate.metrics.selectedCandidateEvaluationCount >= 0);
      assert.ok(entry.phase59Gate.metrics.maxSelectedCandidateTextureCost >= 0);
      assert.equal(typeof entry.phase511Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase511Gate.failures));
      assert.ok(Array.isArray(entry.phase511Gate.followUps));
      assert.equal(typeof entry.phase6Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase6Gate.failures));
      assert.equal(typeof entry.phase7Gate.passed, "boolean");
      assert.ok(Array.isArray(entry.phase7Gate.failures));
      assert.equal(entry.phase7BGate.policy.schemaVersion, 1);
      assert.equal(entry.phase7BGate.policy.phase, "phase-7B");
      assert.equal(typeof entry.phase7BGate.passed, "boolean");
      assert.equal(typeof entry.phase7BGate.hardConstraintPassed, "boolean");
      assert.equal(typeof entry.phase7BGate.phase8Ready, "boolean");
      assert.ok(Array.isArray(entry.phase7BGate.findings));
      assert.ok(entry.phase7BGate.hardFailures.every((finding) => finding.policy === "hard-failure"));
      assert.ok(entry.phase7BGate.reviewSignals.every((finding) => finding.policy === "review-required"));
      assert.ok(entry.phase7BGate.warnings.every((finding) => finding.policy === "warning"));
      assert.ok(entry.phase7BGate.manual.every((finding) => finding.policy === "manual"));
      assert.ok(entry.phase7BGate.metrics.hardFailureCount >= 0);
      assert.ok(entry.phase7BGate.metrics.hardConstraintFailureCount >= 0);
      assert.ok(entry.phase7BGate.metrics.diagnosticsWarningCount >= 0);
      assert.equal(entry.phase7BGate.legacyPhase7Gate.passed, entry.phase7Gate.passed);
      assert.deepEqual(entry.phase7BGate.legacyPhase7Gate.failures, entry.phase7Gate.failures);
      assert.ok(entry.diagnosticsSummary.texture.maxEntrySupportInstabilityPerEntry >= 0);
      assert.ok(entry.diagnosticsSummary.texture.maxConsecutiveEntrySupportInstabilities >= 0);
      assert.ok(entry.diagnosticsSummary.texture.unresolvedEntrySupportInstabilityCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.severeEntryIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.unresolvedSevereEntryIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.soloTexture.unsupportedSoloRunCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.soloTexture.abruptTextureDropCount >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.fourBeat.bassUpperContraryRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio >= 0);
      assert.ok(entry.diagnosticsSummary.texture.pitchContourMotion.eightBeat.bassUpperContraryRatio >= 0);
      assert.equal(entry.diagnosticsSummary.texture.stepwisePattern.degreePatternLength, 4);
      assert.ok(entry.diagnosticsSummary.texture.stepwisePattern.roles.length >= 5);
      assert.ok(entry.diagnosticsSummary.texture.stepwisePattern.sections.length > 0);
      assert.ok(
        entry.diagnosticsSummary.texture.stepwisePattern.roles.some((summary) => summary.role === "free-counterpoint"),
      );
      assert.equal(entry.diagnosticsSummary.form.longRunRepetition.continuationPatternWindowSize, 4);
      assert.ok(entry.diagnosticsSummary.form.longRunRepetition.mostRepeatedContinuationPatternCount >= 0);
      assert.ok(entry.diagnosticsSummary.form.longRunRepetition.uniqueContinuationPatternCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.featureVersion >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.evaluationModelVersion >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.selectedCandidateEvaluationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.entryExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.voicePairExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.voiceExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.sectionExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxEntryInstabilityCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxEntrySevereIntervalCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxVoicePairUnisonOverlapCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxVoicePairSharedRhythmOverlapCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.totalSectionExplanationCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.maxSelectedSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.averageSelectedSectionSoloTextureRisk >= 0);
      assert.ok(entry.diagnosticsSummary.candidateEvaluation.highSelectedSectionSoloTextureRiskCount >= 0);
      assert.equal(entry.diagnosticsSummary.candidateEvaluation.sectionSoloTextureRiskWarningThreshold, 6);
      assert.equal(entry.diagnosticsSummary.candidatePoolOracle.schemaVersion, 3);
      assert.ok(entry.diagnosticsSummary.candidatePoolOracle.sectionCount >= 0);
      assert.ok(
        entry.diagnosticsSummary.candidatePoolOracle.candidateCount >=
          entry.diagnosticsSummary.candidatePoolOracle.sectionCount,
      );
      assert.ok(entry.diagnosticsSummary.candidatePoolOracle.viableCandidateCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidatePoolOracle.hardFailureRejectedCandidateCount >= 0);
      assert.ok(entry.diagnosticsSummary.candidatePoolOracle.blockerClassifications.length >= 0);
      assert.equal(entry.diagnosticsSummary.phase11Review.schemaVersion, 1);
      assert.equal(entry.diagnosticsSummary.phase11Review.adjacentVoiceIntervals.length, 3);
      assert.equal(entry.diagnosticsSummary.phase11Review.registerSpans.length, 4);
      assert.ok(entry.diagnosticsSummary.phase11Review.functionalThinning.nonCadentialRunCount >= 0);
      assert.equal(entry.diagnosticsSummary.phase11Review.stateGrammarRepetition.patternLength, 4);
      assert.ok(entry.diagnosticsSummary.phase11Review.stateGrammarRepetition.uniquePatternCount >= 0);
      assert.ok(entry.diagnosticsSummary.phase11Review.entryPatternFamilies.length > 0);
      assert.ok(entry.diagnosticsSummary.phase11Review.metricalHarmony.strongBeatCheckpointCount > 0);
      assert.ok(entry.diagnosticsSummary.phase11Review.metricalHarmony.weakBeatCheckpointCount > 0);
      assert.ok(
        entry.diagnosticsSummary.phase11Review.metricalHarmony.strongBeatChordToneSupportCount <=
          entry.diagnosticsSummary.phase11Review.metricalHarmony.strongBeatCheckpointCount,
      );
      assert.ok(
        entry.diagnosticsSummary.phase11Review.metricalHarmony.strongBeatBassRootSupportCount <=
          entry.diagnosticsSummary.phase11Review.metricalHarmony.strongBeatCheckpointCount,
      );
      for (const blocker of entry.diagnosticsSummary.candidatePoolOracle.blockerClassifications) {
        assert.ok(blocker.referenceAxes.length > 0);
        assert.ok(
          blocker.classification === "selection-model" || blocker.classification === "generator-or-section-planner",
        );
        assert.equal(
          blocker.observedSectionCount,
          blocker.selectionModelSectionCount + blocker.generatorOrSectionPlannerSectionCount,
        );
        assert.ok(blocker.viableImprovementCount >= 0);
        assert.ok(blocker.selectedRiskTotal >= 0);
        assert.ok(blocker.bestViableRiskTotal >= 0);
        assert.ok(blocker.selectionOnlyUpperBoundRiskReduction >= 0);
        assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate >= 0);
        assert.ok(blocker.selectionOnlyUpperBoundRiskReductionRate <= 1);
        assert.ok(blocker.generatorNeededRate >= 0);
        assert.ok(blocker.generatorNeededRate <= 1);
        assert.ok(blocker.selectedRiskMax >= blocker.bestViableRiskMin);
        assert.ok(blocker.representative.candidateCount > 0);
        assert.ok(blocker.representative.viableCandidateCount > 0);
        assert.ok(
          blocker.representative.selectedReferenceStatus === "within-reference" ||
            blocker.representative.selectedReferenceStatus === "below-reference" ||
            blocker.representative.selectedReferenceStatus === "above-reference",
        );
        assert.ok(
          blocker.representative.bestViableReferenceStatus === "within-reference" ||
            blocker.representative.bestViableReferenceStatus === "below-reference" ||
            blocker.representative.bestViableReferenceStatus === "above-reference",
        );
      }
    }
    for (const entry of listeningReview.seeds) {
      assert.ok(files.includes(entry.diagnosticsFile));
      assert.ok(files.includes(entry.midiFile));
      assert.equal(entry.judgement, "not-reviewed");
      assert.equal(entry.criteria.subjectMemorability, "not-reviewed");
      assert.equal(entry.notes, "");
      if (
        entry.seed === "bach-001" ||
        entry.seed === "fugue-smoke" ||
        entry.seed === "minor-entry" ||
        entry.seed === "wide-key"
      ) {
        assert.deepEqual(entry.blockers, ["manual listening judgement must be pass before Phase 6"]);
      } else {
        assert.deepEqual(entry.blockers, []);
      }
      assert.ok(!entry.diagnosticsFile.includes(directory));
      assert.ok(!entry.midiFile.includes(directory));
    }
    assert.deepEqual(findReviewSeed(summary.seeds, "fugue-smoke").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 4,
      evaluationModelVersion: 10,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 3,
      maxEntrySevereIntervalCount: 3,
      maxVoicePairUnisonOverlapCount: 7,
      maxVoicePairSharedRhythmOverlapCount: 12,
      maxSectionSoloTextureRisk: 8,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 8,
      averageSelectedSectionSoloTextureRisk: 8,
      highSelectedSectionSoloTextureRiskCount: 1,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "modal-cadence").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 4,
      evaluationModelVersion: 10,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 4,
      maxEntrySevereIntervalCount: 3,
      maxVoicePairUnisonOverlapCount: 5,
      maxVoicePairSharedRhythmOverlapCount: 14,
      maxSectionSoloTextureRisk: 8,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 8,
      averageSelectedSectionSoloTextureRisk: 8,
      highSelectedSectionSoloTextureRiskCount: 1,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "modal-answer").diagnosticsSummary.candidateEvaluation, {
      featureVersion: 4,
      evaluationModelVersion: 10,
      selectedCandidateEvaluationCount: 1,
      entryExplanationCount: 1,
      voicePairExplanationCount: 6,
      voiceExplanationCount: 4,
      sectionExplanationCount: 1,
      maxEntryInstabilityCount: 3,
      maxEntrySevereIntervalCount: 2,
      maxVoicePairUnisonOverlapCount: 14,
      maxVoicePairSharedRhythmOverlapCount: 20,
      maxSectionSoloTextureRisk: 2,
      totalSectionExplanationCount: 1,
      maxSelectedSectionSoloTextureRisk: 2,
      averageSelectedSectionSoloTextureRisk: 2,
      highSelectedSectionSoloTextureRiskCount: 0,
      sectionSoloTextureRiskWarningThreshold: 6,
    });
    assert.deepEqual(findReviewSeed(summary.seeds, "fugue-smoke").diagnosticsSummary.form.longRunRepetition, {
      continuationPatternWindowSize: 4,
      mostRepeatedContinuationPattern: [],
      mostRepeatedContinuationPatternCount: 0,
      uniqueContinuationPatternCount: 0,
    });
    assert.equal(findReviewSeed(summary.seeds, "contrary-motion").diagnosticsSummary.melody.leapRecoveryMisses, 6);
    assert.equal(findReviewSeed(summary.seeds, "contrary-motion").diagnosticsSummary.texture.samePitchOverlapCount, 3);
    assert.equal(
      listeningReview.seeds.filter((entry) => entry.judgement === "not-reviewed").length,
      listeningReview.seeds.length,
    );
    assert.equal(pairwisePreferences.comparisons.length, 0);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("review-ab command writes baseline, variant, and comparison summaries", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fugematon-review-ab-"));
  try {
    await main([
      "review-ab",
      "--ticks",
      "960",
      "--out",
      directory,
      "--baseline-label",
      "current",
      "--variant-label",
      "candidate",
    ]);

    const baselineFiles = await readdir(join(directory, "baseline"));
    const variantFiles = await readdir(join(directory, "variant"));
    const comparison = JSON.parse(await readFile(join(directory, "comparison-summary.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      baseline: { label: string; directory: string; summaryFile: string; selectionModel: string };
      variant: { label: string; directory: string; summaryFile: string; selectionModel: string };
      seeds: {
        seed: string;
        category: string;
        baseline: {
          diagnosticsSummary: {
            hardConstraintFailures: number;
            candidatePoolOracle: { schemaVersion: number; viableCandidateCount: number };
          };
          referenceComparison: { reviewStatus: string; outsideReferenceCount: number };
          candidatePoolOracle: { schemaVersion: number; viableCandidateCount: number };
          phase7BGate: {
            phase8Ready: boolean;
            hardFailureCount: number;
            hardFailures: unknown[];
            reviewSignalCount: number;
            reviewSignals: unknown[];
          };
        };
        variant: {
          diagnosticsSummary: {
            hardConstraintFailures: number;
            candidatePoolOracle: { schemaVersion: number; viableCandidateCount: number };
          };
          referenceComparison: { reviewStatus: string; outsideReferenceCount: number };
          candidatePoolOracle: { schemaVersion: number; viableCandidateCount: number };
          phase7BGate: {
            phase8Ready: boolean;
            hardFailureCount: number;
            hardFailures: unknown[];
            reviewSignalCount: number;
            reviewSignals: unknown[];
          };
        };
        deltas: {
          hardConstraintFailures: number;
          referenceOutsideCount: number;
          candidatePoolViableCandidates: number;
          phase7BHardFailures: number;
          phase7BReviewSignals: number;
          phase8ReadyChanged: boolean;
        };
        improvements: string[];
        regressions: string[];
        tradeoffs: string[];
        manualListeningGap: {
          baselineJudgement: string;
          variantJudgement: string;
          unlistened: boolean;
          note: string;
        };
      }[];
    };
    const pairwisePreferences = JSON.parse(await readFile(join(directory, "pairwise-preferences.json"), "utf8")) as {
      schemaVersion: number;
      lengthTicks: number;
      instructions: string;
      manualListeningStatus: string;
      manualListeningGap: {
        unlistened: boolean;
        note: string;
      };
      comparisons: {
        seed: string;
        category: string;
        baseline: {
          label: string;
          selectionModel: string;
          diagnosticsFile: string;
          midiFile: string;
        };
        variant: {
          label: string;
          selectionModel: string;
          diagnosticsFile: string;
          midiFile: string;
        };
        preferredSide: string;
        criteria: Record<string, string>;
        reason: string;
        manualListeningStatus: string;
        manualListeningGap: {
          unlistened: boolean;
          note: string;
        };
      }[];
    };

    assert.ok(baselineFiles.includes("summary.json"));
    assert.ok(variantFiles.includes("summary.json"));
    assert.equal(pairwisePreferences.schemaVersion, 2);
    assert.equal(pairwisePreferences.lengthTicks, 960);
    assert.equal(pairwisePreferences.manualListeningStatus, "not-reviewed");
    assert.equal(pairwisePreferences.manualListeningGap.unlistened, true);
    assert.match(pairwisePreferences.manualListeningGap.note, /no preference judgement/);
    assert.equal(pairwisePreferences.comparisons.length, comparison.seeds.length);
    assert.equal(comparison.schemaVersion, 1);
    assert.equal(comparison.lengthTicks, 960);
    assert.deepEqual(comparison.baseline, {
      label: "current",
      directory: "baseline",
      summaryFile: "baseline/summary.json",
      selectionModel: "baseline",
    });
    assert.deepEqual(comparison.variant, {
      label: "candidate",
      directory: "variant",
      summaryFile: "variant/summary.json",
      selectionModel: "phase10-oracle-selection",
    });
    assert.ok(comparison.seeds.length > 1);
    for (const entry of comparison.seeds) {
      assert.notEqual(entry.seed, "");
      assert.notEqual(entry.category, "");
      assert.ok(entry.baseline.diagnosticsSummary.hardConstraintFailures >= 0);
      assert.ok(entry.variant.diagnosticsSummary.hardConstraintFailures >= 0);
      assert.equal(entry.baseline.candidatePoolOracle.schemaVersion, 3);
      assert.equal(entry.variant.candidatePoolOracle.schemaVersion, 3);
      assert.deepEqual(entry.baseline.candidatePoolOracle, entry.baseline.diagnosticsSummary.candidatePoolOracle);
      assert.deepEqual(entry.variant.candidatePoolOracle, entry.variant.diagnosticsSummary.candidatePoolOracle);
      assert.equal(typeof entry.baseline.phase7BGate.phase8Ready, "boolean");
      assert.equal(typeof entry.variant.phase7BGate.phase8Ready, "boolean");
      assert.ok(entry.baseline.phase7BGate.hardFailureCount >= 0);
      assert.ok(entry.variant.phase7BGate.hardFailureCount >= 0);
      assert.ok(Array.isArray(entry.baseline.phase7BGate.hardFailures));
      assert.ok(Array.isArray(entry.variant.phase7BGate.hardFailures));
      assert.equal(entry.baseline.phase7BGate.reviewSignalCount, entry.baseline.phase7BGate.reviewSignals.length);
      assert.equal(entry.variant.phase7BGate.reviewSignalCount, entry.variant.phase7BGate.reviewSignals.length);
      assert.equal(
        entry.deltas.hardConstraintFailures,
        entry.variant.diagnosticsSummary.hardConstraintFailures -
          entry.baseline.diagnosticsSummary.hardConstraintFailures,
      );
      assert.equal(
        entry.deltas.referenceOutsideCount,
        entry.variant.referenceComparison.outsideReferenceCount -
          entry.baseline.referenceComparison.outsideReferenceCount,
      );
      assert.equal(
        entry.deltas.candidatePoolViableCandidates,
        entry.variant.candidatePoolOracle.viableCandidateCount -
          entry.baseline.candidatePoolOracle.viableCandidateCount,
      );
      assert.equal(
        entry.deltas.phase7BHardFailures,
        entry.variant.phase7BGate.hardFailureCount - entry.baseline.phase7BGate.hardFailureCount,
      );
      assert.equal(
        entry.deltas.phase7BReviewSignals,
        entry.variant.phase7BGate.reviewSignalCount - entry.baseline.phase7BGate.reviewSignalCount,
      );
      assert.equal(
        entry.deltas.phase8ReadyChanged,
        entry.variant.phase7BGate.phase8Ready !== entry.baseline.phase7BGate.phase8Ready,
      );
      assert.ok(Array.isArray(entry.improvements));
      assert.ok(Array.isArray(entry.regressions));
      assert.ok(entry.tradeoffs.length > 0);
      assert.equal(entry.manualListeningGap.baselineJudgement, "not-reviewed");
      assert.equal(entry.manualListeningGap.variantJudgement, "not-reviewed");
      assert.equal(entry.manualListeningGap.unlistened, true);
      assert.match(entry.manualListeningGap.note, /manual listening/);
    }
    for (const entry of pairwisePreferences.comparisons) {
      assert.notEqual(entry.seed, "");
      assert.notEqual(entry.category, "");
      assert.equal(entry.baseline.label, "current");
      assert.equal(entry.variant.label, "candidate");
      assert.equal(entry.baseline.selectionModel, "baseline");
      assert.equal(entry.variant.selectionModel, "phase10-oracle-selection");
      assert.match(entry.baseline.diagnosticsFile, /^baseline\/.+\.diagnostics\.json$/);
      assert.match(entry.baseline.midiFile, /^baseline\/.+\.mid$/);
      assert.match(entry.variant.diagnosticsFile, /^variant\/.+\.diagnostics\.json$/);
      assert.match(entry.variant.midiFile, /^variant\/.+\.mid$/);
      assert.equal(entry.preferredSide, "not-reviewed");
      assert.deepEqual(Object.values(entry.criteria), [
        "not-reviewed",
        "not-reviewed",
        "not-reviewed",
        "not-reviewed",
        "not-reviewed",
        "not-reviewed",
      ]);
      assert.equal(entry.reason, "");
      assert.equal(entry.manualListeningStatus, "not-reviewed");
      assert.equal(entry.manualListeningGap.unlistened, true);
      assert.match(entry.manualListeningGap.note, /not been manually listened to/);
    }
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("commands reject invalid arguments before writing output", async () => {
  await assert.rejects(() => main(["generate", "--seed", "bach-001", "--ticks", "0"]), /--ticks/);
  await assert.rejects(() => main(["midi", "--seed", "bach-001", "--ticks", "960"]), /missing --out/);
  await assert.rejects(() => main(["unknown"]), /unknown command/);
});

type MidiParseResult = {
  format: number;
  trackCount: number;
  division: number;
  channelEventCount: number;
  endOfTrackCount: number;
  metaEventTypes: Set<number>;
};

function findReviewSeed<T extends { seed: string }>(seeds: readonly T[], seed: string): T {
  const entry = seeds.find((candidate) => candidate.seed === seed);

  assert.ok(entry !== undefined);
  return entry;
}

function parseStandardMidiFile(bytes: Uint8Array): MidiParseResult {
  const cursor = new MidiCursor(bytes);
  cursor.expectAscii("MThd");
  const headerLength = cursor.readUint32();
  assert.equal(headerLength, 6, "MIDI header length must be 6");

  const format = cursor.readUint16();
  const trackCount = cursor.readUint16();
  const division = cursor.readUint16();
  assert.equal((division & 0x8000) === 0, true, "MIDI division must use ticks per quarter note");

  const metaEventTypes = new Set<number>();
  let channelEventCount = 0;
  let endOfTrackCount = 0;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex += 1) {
    cursor.expectAscii("MTrk");
    const trackLength = cursor.readUint32();
    const trackEnd = cursor.position + trackLength;
    assert.ok(trackEnd <= bytes.length, "MIDI track length must fit in file");

    const trackResult = parseTrack(cursor, trackEnd);
    channelEventCount += trackResult.channelEventCount;
    endOfTrackCount += trackResult.endOfTrackCount;
    for (const metaType of trackResult.metaEventTypes) {
      metaEventTypes.add(metaType);
    }

    assert.equal(cursor.position, trackEnd, "MIDI track parser must consume the declared length");
  }

  assert.equal(cursor.position, bytes.length, "MIDI file must not contain trailing bytes");

  return {
    format,
    trackCount,
    division,
    channelEventCount,
    endOfTrackCount,
    metaEventTypes,
  };
}

type TrackParseResult = {
  channelEventCount: number;
  endOfTrackCount: number;
  metaEventTypes: Set<number>;
};

function parseTrack(cursor: MidiCursor, trackEnd: number): TrackParseResult {
  let runningStatus: number | undefined;
  let channelEventCount = 0;
  let endOfTrackCount = 0;
  const metaEventTypes = new Set<number>();

  while (cursor.position < trackEnd) {
    cursor.readVariableLengthQuantity(trackEnd);
    const firstByte = cursor.readUint8(trackEnd);

    if (firstByte === 0xff) {
      const metaType = cursor.readUint8(trackEnd);
      const length = cursor.readVariableLengthQuantity(trackEnd);
      cursor.skip(length, trackEnd);
      metaEventTypes.add(metaType);
      runningStatus = undefined;
      if (metaType === 0x2f) {
        assert.equal(length, 0, "MIDI end-of-track event must have zero length");
        endOfTrackCount += 1;
      }
      continue;
    }

    if (firstByte === 0xf0 || firstByte === 0xf7) {
      const length = cursor.readVariableLengthQuantity(trackEnd);
      cursor.skip(length, trackEnd);
      runningStatus = undefined;
      continue;
    }

    let status = firstByte;
    let dataBytesAlreadyRead = 0;
    if (firstByte < 0x80) {
      if (runningStatus === undefined) {
        throw new Error("MIDI running status requires a previous channel status");
      }
      status = runningStatus;
      dataBytesAlreadyRead = 1;
    } else {
      assert.ok(status >= 0x80 && status <= 0xef, "MIDI event must be meta, sysex, or channel voice");
      runningStatus = status;
    }

    const dataByteCount = channelDataByteCount(status);
    for (let index = dataBytesAlreadyRead; index < dataByteCount; index += 1) {
      const dataByte = cursor.readUint8(trackEnd);
      assert.ok(dataByte < 0x80, "MIDI channel event data bytes must be below 0x80");
    }
    channelEventCount += 1;
  }

  return {
    channelEventCount,
    endOfTrackCount,
    metaEventTypes,
  };
}

function channelDataByteCount(status: number): 1 | 2 {
  const eventType = status & 0xf0;
  if (eventType === 0xc0 || eventType === 0xd0) {
    return 1;
  }
  return 2;
}

class MidiCursor {
  position = 0;

  constructor(private readonly bytes: Uint8Array) {}

  expectAscii(expected: string): void {
    const actual = String.fromCharCode(...this.readBytes(expected.length));
    assert.equal(actual, expected);
  }

  readUint8(limit = this.bytes.length): number {
    assert.ok(this.position < limit, "MIDI parser read past declared boundary");
    const value = this.bytes[this.position];
    assert.notEqual(value, undefined, "MIDI parser read past end of file");
    this.position += 1;
    return value;
  }

  readUint16(): number {
    return (this.readUint8() << 8) | this.readUint8();
  }

  readUint32(): number {
    return ((this.readUint8() << 24) | (this.readUint8() << 16) | (this.readUint8() << 8) | this.readUint8()) >>> 0;
  }

  readVariableLengthQuantity(limit: number): number {
    let value = 0;
    for (let index = 0; index < 4; index += 1) {
      const byte = this.readUint8(limit);
      value = (value << 7) | (byte & 0x7f);
      if ((byte & 0x80) === 0) {
        return value;
      }
    }

    throw new Error("MIDI variable-length quantity is too long");
  }

  readBytes(length: number): Uint8Array {
    assert.ok(this.position + length <= this.bytes.length, "MIDI parser read past end of file");
    const result = this.bytes.subarray(this.position, this.position + length);
    this.position += length;
    return result;
  }

  skip(length: number, limit: number): void {
    assert.ok(this.position + length <= limit, "MIDI event length must fit in track");
    this.position += length;
  }
}

async function captureConsoleLog(action: () => Promise<void>): Promise<string> {
  const originalLog = console.log;
  const chunks: string[] = [];

  console.log = (...args: unknown[]) => {
    chunks.push(args.map(String).join(" "));
  };

  try {
    await action();
  } finally {
    console.log = originalLog;
  }

  return chunks.join("\n");
}
