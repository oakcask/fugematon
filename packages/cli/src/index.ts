#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { GenerationDiagnostics } from "@fugematon/core";
import {
  evaluatePhase6Diagnostics,
  evaluatePhase59Diagnostics,
  evaluatePhase510Diagnostics,
  evaluatePhase511Diagnostics,
  exportMidi,
  generateScore,
  PHASE_5_11_ROTATION_SEEDS,
  PHASE_5_REVIEW_SEEDS,
  type Phase6GateResult,
  type Phase59GateResult,
  type Phase510GateResult,
  type Phase511GateResult,
  phase59ManualListeningBlockers,
} from "@fugematon/core";
import { helpText, parseArgs } from "./args.js";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const command = parseArgs(argv);

  if (command.name === "help") {
    console.log(helpText());
    return;
  }

  if (command.name === "review") {
    await writeReviewBundle(command.out, command.lengthTicks);
    return;
  }

  const output = generateScore({
    seed: command.seed,
    lengthTicks: command.lengthTicks,
  });

  if (command.name === "diagnose") {
    console.log(`${JSON.stringify(output.diagnostics, null, 2)}\n`);
    return;
  }

  if (command.name === "midi") {
    await writeFile(command.out, exportMidi(output.events));
    return;
  }

  const json = `${JSON.stringify(output.events, null, 2)}\n`;
  if (command.out === undefined) {
    console.log(json);
    return;
  }

  await writeFile(command.out, json, "utf8");
}

async function writeReviewBundle(outDirectory: string, lengthTicks: number): Promise<void> {
  await mkdir(outDirectory, { recursive: true });
  const summary = {
    schemaVersion: 4,
    lengthTicks,
    seeds: [] as {
      seed: string;
      category: string;
      diagnosticsFile: string;
      midiFile: string;
      diagnosticsSummary: ReviewDiagnosticsSummary;
      phase59Gate: Phase59GateResult;
      phase510Gate: Phase510GateResult;
      phase511Gate: Phase511GateResult;
      phase6Gate: Phase6GateResult;
    }[],
  };
  const listeningReview = createListeningReview(lengthTicks);
  const pairwisePreferences = createPairwisePreferences(lengthTicks);

  for (const { seed, category } of [...PHASE_5_REVIEW_SEEDS, ...PHASE_5_11_ROTATION_SEEDS]) {
    const output = generateScore({ seed, lengthTicks });
    const safeSeed = seed.replaceAll(/[^a-z0-9-]/gi, "-");
    const diagnosticsFile = `${safeSeed}.diagnostics.json`;
    const midiFile = `${safeSeed}.mid`;

    await writeFile(join(outDirectory, diagnosticsFile), `${JSON.stringify(output.diagnostics, null, 2)}\n`, "utf8");
    await writeFile(join(outDirectory, midiFile), exportMidi(output.events));
    summary.seeds.push({
      seed,
      category,
      diagnosticsFile,
      midiFile,
      diagnosticsSummary: summarizeDiagnostics(output.diagnostics),
      phase59Gate: evaluatePhase59Diagnostics(seed, output.diagnostics),
      phase510Gate: evaluatePhase510Diagnostics(seed, output.diagnostics),
      phase511Gate: evaluatePhase511Diagnostics(seed, output.diagnostics),
      phase6Gate: evaluatePhase6Diagnostics(seed, output.diagnostics),
    });
    listeningReview.seeds.push(createListeningSeedReview(seed, category, diagnosticsFile, midiFile));
  }

  await writeFile(join(outDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  await writeFile(join(outDirectory, "listening-review.json"), `${JSON.stringify(listeningReview, null, 2)}\n`, "utf8");
  await writeFile(
    join(outDirectory, "pairwise-preferences.json"),
    `${JSON.stringify(pairwisePreferences, null, 2)}\n`,
    "utf8",
  );
}

type ReviewDiagnosticsSummary = {
  hardConstraintFailures: number;
  warningCount: number;
  texture: {
    counterSubjectIdentityRetention: number;
    rhythmicIndependenceScore: number;
    samePitchOverlapCount: number;
    unisonOverlapCount: number;
    sameDirectionMotionCount: number;
    sharedRhythmOverlapCount: number;
    shortStrongBeatEntryNoteCount: number;
    entrySupportInstabilityCount: number;
    maxEntrySupportInstabilityPerEntry: number;
    maxConsecutiveEntrySupportInstabilities: number;
    unresolvedEntrySupportInstabilityCount: number;
    severeEntryIntervalCount: number;
    unresolvedSevereEntryIntervalCount: number;
    soloTexture: GenerationDiagnostics["soloTexture"];
  };
  melody: {
    leapRecoveryMisses: number;
    repeatedPitchRunCount: number;
  };
  form: {
    sectionCount: number;
    stateTransitions: GenerationDiagnostics["stateTransitions"];
    allVoiceSilenceGapCount: number;
  };
  ornament: {
    ornamentCandidateCount: number;
    ornamentDensity: number;
    placementReasons: GenerationDiagnostics["ornamentPlacementReasons"];
  };
};

type ListeningCriterion =
  | "subjectMemorability"
  | "counterSubjectRecognition"
  | "nonEntryVoiceSingability"
  | "episodeMomentum"
  | "strettoTension"
  | "longRunInterest";

type ListeningReview = {
  schemaVersion: 1;
  lengthTicks: number;
  judgementScale: readonly ["pass", "needs-work", "fail", "not-reviewed"];
  criteria: Record<ListeningCriterion, string>;
  regressionChecks: readonly string[];
  seeds: ListeningSeedReview[];
};

type ListeningSeedReview = {
  seed: string;
  category: string;
  diagnosticsFile: string;
  midiFile: string;
  judgement: "not-reviewed";
  criteria: Record<ListeningCriterion, "not-reviewed">;
  notes: string;
  blockers: string[];
};

type PairwisePreferences = {
  schemaVersion: 1;
  lengthTicks: number;
  instructions: string;
  preferences: {
    preferredSeed: string;
    rejectedSeed: string;
    reason: string;
  }[];
};

function summarizeDiagnostics(diagnostics: GenerationDiagnostics): ReviewDiagnosticsSummary {
  return {
    hardConstraintFailures:
      diagnostics.rangeViolations +
      diagnostics.voiceCrossings +
      diagnostics.subjectIdentityViolations +
      diagnostics.answerPlanViolations +
      diagnostics.keyMetadataMismatches +
      diagnostics.unresolvedDissonanceCount +
      diagnostics.allVoiceSilenceGapCount,
    warningCount: diagnostics.warnings.length,
    texture: {
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      maxEntrySupportInstabilityPerEntry: maximum(
        diagnostics.entrySupportInstabilityDetails.map((detail) => detail.instabilityCount),
      ),
      maxConsecutiveEntrySupportInstabilities: maximum(
        diagnostics.entrySupportInstabilityDetails.map((detail) => detail.maxConsecutiveInstabilities),
      ),
      unresolvedEntrySupportInstabilityCount: diagnostics.entrySupportInstabilityDetails.reduce(
        (sum, detail) => sum + detail.unresolvedInstabilityCount,
        0,
      ),
      severeEntryIntervalCount: diagnostics.severeEntryIntervalCount,
      unresolvedSevereEntryIntervalCount: diagnostics.unresolvedSevereEntryIntervalCount,
      soloTexture: diagnostics.soloTexture,
    },
    melody: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      repeatedPitchRunCount: diagnostics.repeatedPitchRunCount,
    },
    form: {
      sectionCount: diagnostics.sectionPlans.length,
      stateTransitions: diagnostics.stateTransitions,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
    },
    ornament: {
      ornamentCandidateCount: diagnostics.ornamentCandidateCount,
      ornamentDensity: diagnostics.ornamentDensity,
      placementReasons: diagnostics.ornamentPlacementReasons,
    },
  };
}

function maximum(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}

function createListeningReview(lengthTicks: number): ListeningReview {
  return {
    schemaVersion: 1,
    lengthTicks,
    judgementScale: ["pass", "needs-work", "fail", "not-reviewed"],
    criteria: {
      subjectMemorability: "The subject remains recognizable after the exposition and returns.",
      counterSubjectRecognition: "The counter-subject keeps a recognizable identity near subject entries.",
      nonEntryVoiceSingability: "Non-entry voices sound like singable lines instead of filler or support tones.",
      episodeMomentum: "Episodes move toward the next local key, cadence, or subject return.",
      strettoTension: "Stretto-like sections increase tension without obscuring the subject contour.",
      longRunInterest: "The seed avoids mechanical repetition or fatigue over the full review length.",
    },
    regressionChecks: [
      "fugue-smoke exposition entries are staggered instead of all voices entering at once.",
      "fugue-smoke voices remain independent in pitch direction and rhythm.",
      "fugue-smoke uses varied note values rather than a narrow rhythm vocabulary.",
      "fugue-smoke repeated pitches sound intentional or tied rather than mechanical.",
      "fugue-smoke ornaments have audible placement reasons near entries, cadences, or held notes.",
      "fugue-smoke has no unexplained all-voice silence gaps.",
      "fugue-smoke first soprano answer avoids unstable seconds, unsupported fourths, and answer-root conflicts.",
    ],
    seeds: [],
  };
}

function createListeningSeedReview(
  seed: string,
  category: string,
  diagnosticsFile: string,
  midiFile: string,
): ListeningSeedReview {
  return {
    seed,
    category,
    diagnosticsFile,
    midiFile,
    judgement: "not-reviewed",
    criteria: {
      subjectMemorability: "not-reviewed",
      counterSubjectRecognition: "not-reviewed",
      nonEntryVoiceSingability: "not-reviewed",
      episodeMomentum: "not-reviewed",
      strettoTension: "not-reviewed",
      longRunInterest: "not-reviewed",
    },
    notes: "",
    blockers: phase59ManualListeningBlockers(category, "not-reviewed"),
  };
}

function createPairwisePreferences(lengthTicks: number): PairwisePreferences {
  return {
    schemaVersion: 1,
    lengthTicks,
    instructions:
      "Add seed pairs when listening produces a clear preference. These records are candidates for future aesthetic scoring weights and do not override hard constraints.",
    preferences: [],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
