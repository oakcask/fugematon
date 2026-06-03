import { TICKS_PER_QUARTER, VOICES } from "../constants.js";
import type {
  CadenceKind,
  ConstraintHardFailureCode,
  ContinuousBoundaryCarrySummary,
  CurrentContractDiagnosticIssueCode,
  FugueState,
  GeneratorSearchTrace,
  HarmonicPlan,
  MeterContext,
  NoteEvent,
  PlannedEntry,
  SectionConstraintSatisfactionWindow,
  Voice,
} from "../events.js";
import { analyzeWritingProfileConstraints, type WritingProfile } from "../writing-profile.js";
import { analyzeScore } from "./diagnostics.js";
import { chordTonePitchClasses } from "./harmony.js";
import { scaleDegreePitchClass } from "./pitch.js";
import {
  buildSectionConstraintProblem,
  evaluateSectionConstraintProblem,
  sectionConstraintSoftCost,
} from "./section-constraint-problem.js";
import { compareNoteEvents, positiveModulo, roundRatio } from "./shared.js";

export type ScoreDraft = {
  notes: readonly NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  endTick: number;
  writingProfile: WritingProfile;
  boundedPastContext?: {
    events: readonly NoteEvent[];
  };
};

export type ConstraintWindow = {
  startTick: number;
  endTick: number;
  voice?: Voice;
  state?: FugueState | "unplanned";
  entry?: PlannedEntry;
  harmonicPlan?: HarmonicPlan;
  meterContext?: MeterContext;
  terminalSupport?: boolean;
  sectionConstraintProblem?: boolean;
  sectionConstraintReview?: SectionConstraintSatisfactionWindow;
  continuousBoundaryCarry?: ContinuousBoundaryCarrySummary;
};

export type ConstraintAffectedNote = {
  voice: string;
  startTick: number;
  durationTicks: number;
  pitch: number;
};

export type ConstraintHardFailure = {
  code: ConstraintHardFailureCode;
  count: number;
  explanation: string;
  affectedNotes: ConstraintAffectedNote[];
};

export type ConstraintSoftFeatureCost = {
  feature: string;
  cost: number;
  explanation: string;
};

export type ConstraintResult = {
  schemaVersion: 1;
  window: ConstraintWindow;
  hardFailures: ConstraintHardFailure[];
  softCosts: ConstraintSoftFeatureCost[];
  totalSoftCost: number;
  explanation: string;
  affectedNotes: ConstraintAffectedNote[];
};

export type ConstraintCandidate = {
  candidateId: string;
  draft: ScoreDraft;
  result: ConstraintResult;
};

const HARD_FAILURE_EXPLANATIONS: Record<ConstraintHardFailureCode, string> = {
  "safe-event-shape": "note timing and duration must stay inside the generated score boundary",
  "known-voice": "note voice must belong to the public four-voice set",
  "pitch-bounds": "MIDI pitch must stay inside 0-127",
  "velocity-bounds": "MIDI velocity must stay inside 0-127",
  "writing-profile-pitch": "note pitch must satisfy the active WritingProfile pitch and range contract",
  "range-violation": "voice pitch must stay inside the active voice range",
  "voice-crossing": "adjacent contrapuntal voices must not cross",
  "subject-identity-violation": "subject and subject-fragment entries must match the planned pitch-class identity",
  "answer-plan-violation": "answer entries must match the planned answer pitch-class identity",
  "key-metadata-mismatch": "entry pitch classes must agree with the recorded local key metadata",
  "intentional-rest-reason": "intentional section rests must use an allowed internal rest reason",
  "section-voice-coverage": "continuation slots must preserve required active voice coverage",
  "structural-harmonic-support": "structural harmonic anchors must keep root or chord-tone support",
};

export function evaluateScoreDraft(
  draft: ScoreDraft,
  window: ConstraintWindow = fullDraftWindow(draft),
): ConstraintResult {
  const notes = draft.notes.filter((note) => overlapsWindow(note, window));
  const shapeCheckNotes = draft.notes.filter(
    (note) => overlapsWindow(note, window) || !hasSafeEventShape(note, draft.endTick),
  );
  const analyzableNotes = notes.filter(isKnownVoiceNote);
  const subjectEntries = draft.subjectEntries.filter(
    (entry) => entry.startTick >= window.startTick && entry.startTick < window.endTick,
  );
  const sectionPlans = draft.sectionPlans.filter(
    (plan) => plan.startTick < window.endTick && window.startTick < plan.startTick + plan.durationTicks,
  );
  const diagnostics = analyzeScoreSafely(analyzableNotes, subjectEntries, sectionPlans, draft.writingProfile);
  const writingProfileDiagnostics = analyzeWritingProfileConstraints(analyzableNotes, draft.writingProfile);
  const sectionConstraintReview =
    window.sectionConstraintProblem === true && window.harmonicPlan !== undefined
      ? evaluateSectionConstraintProblem({
          problem: buildSectionConstraintProblem({
            notes: analyzableNotes,
            sectionPlan: window.harmonicPlan,
            subjectEntries,
          }),
          notes: analyzableNotes,
          sectionPlan: window.harmonicPlan,
          subjectEntries,
        })
      : window.sectionConstraintReview;
  const hardFailures = new Map<ConstraintHardFailureCode, ConstraintHardFailure>();

  for (const failure of directEventShapeFailures(shapeCheckNotes, draft.endTick)) {
    addHardFailure(hardFailures, failure.code, failure.affectedNotes);
  }

  for (const failure of localRangeFailures(analyzableNotes, draft.writingProfile)) {
    addHardFailure(hardFailures, failure.code, failure.affectedNotes);
  }
  for (const failure of localVoiceCrossingFailures(analyzableNotes)) {
    addHardFailure(hardFailures, failure.code, failure.affectedNotes);
  }
  for (const failure of localEntryPlanFailures(analyzableNotes, subjectEntries)) {
    addHardFailure(hardFailures, failure.code, failure.affectedNotes);
  }

  if (writingProfileDiagnostics.writingProfilePitchViolations > 0) {
    addHardFailure(
      hardFailures,
      "writing-profile-pitch",
      writingProfileDiagnostics.windows
        .filter((profileWindow) => profileWindow.reason.includes("pitch"))
        .flatMap((profileWindow) =>
          notes.filter(
            (note) => profileWindow.voices.includes(note.voice) && profileWindow.pitches.includes(note.pitch),
          ),
        )
        .map(toAffectedNote)
        .slice(0, 8),
      writingProfileDiagnostics.writingProfilePitchViolations,
    );
  }

  if (sectionConstraintReview !== undefined) {
    const counts = sectionConstraintReview.infeasibleConstraintCounts;
    if (counts.invalidIntentionalRestReason > 0) {
      addHardFailure(hardFailures, "intentional-rest-reason", [], counts.invalidIntentionalRestReason);
    }
    const voiceCoverageFailures =
      counts.minActiveVoiceViolation + counts.unsupportedSolo + counts.allVoiceSilence + counts.longUnplannedSilentRun;
    if (voiceCoverageFailures > 0) {
      addHardFailure(hardFailures, "section-voice-coverage", [], voiceCoverageFailures);
    }
    const structuralSupportFailures = counts.nonChordStructuralSupportCount;
    if (structuralSupportFailures > 0) {
      addHardFailure(hardFailures, "structural-harmonic-support", [], structuralSupportFailures);
    }
  }

  const softCosts = softFeatureCosts(draft, window, diagnostics, writingProfileDiagnostics, sectionConstraintReview);
  const totalSoftCost = roundRatio(softCosts.reduce((sum, cost) => sum + cost.cost, 0));
  const sortedHardFailures = [...hardFailures.values()].sort((left, right) => left.code.localeCompare(right.code));
  const affectedNotes = uniqueAffectedNotes(sortedHardFailures.flatMap((failure) => failure.affectedNotes));

  return {
    schemaVersion: 1,
    window: sectionConstraintReview === undefined ? window : { ...window, sectionConstraintReview },
    hardFailures: sortedHardFailures,
    softCosts,
    totalSoftCost,
    explanation:
      sortedHardFailures.length === 0
        ? "candidate satisfies current-contract hard constraints; soft costs remain review and ranking evidence"
        : "candidate violates current-contract hard constraints and must be rejected by the constraint solver",
    affectedNotes,
  };
}

export function selectBestConstraintCandidate(candidates: readonly ConstraintCandidate[]): ConstraintCandidate {
  if (candidates.length === 0) {
    throw new Error(
      "core.generator-constraint.empty-candidate-set: no constraint candidates were provided; why=deterministic selection requires at least one candidate; action=provide generated candidates before selecting",
    );
  }

  return [...candidates].sort(compareConstraintCandidates)[0]!;
}

export function buildGeneratorSearchTrace(
  candidates: readonly ConstraintCandidate[],
  selectedCandidate: ConstraintCandidate,
  mode: GeneratorSearchTrace["mode"] = "diagnostics-only",
): GeneratorSearchTrace {
  const sortedCandidates = [...candidates].sort((left, right) => left.candidateId.localeCompare(right.candidateId));
  return {
    schemaVersion: 1,
    mode,
    evaluatedCandidateCount: sortedCandidates.length,
    rejectedCandidateCount: sortedCandidates.filter((candidate) => candidate.result.hardFailures.length > 0).length,
    selectedCandidateId: selectedCandidate.candidateId,
    candidates: sortedCandidates.map((candidate) => {
      const selected = candidate.candidateId === selectedCandidate.candidateId;
      const hardFailureCodes = candidate.result.hardFailures.map((failure) => failure.code);
      return {
        candidateId: candidate.candidateId,
        windowStartTick: candidate.result.window.startTick,
        windowEndTick: candidate.result.window.endTick,
        hardFailureCount: candidate.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0),
        hardFailures: hardFailureCodes,
        softCost: candidate.result.totalSoftCost,
        selected,
        reason: selected ? selectedReason(candidate.result) : rejectedReason(candidate.result),
      };
    }),
  };
}

function compareConstraintCandidates(left: ConstraintCandidate, right: ConstraintCandidate): number {
  const leftHardFailureCount = left.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
  const rightHardFailureCount = right.result.hardFailures.reduce((sum, failure) => sum + failure.count, 0);
  if (leftHardFailureCount !== rightHardFailureCount) {
    return leftHardFailureCount - rightHardFailureCount;
  }
  if (left.result.totalSoftCost !== right.result.totalSoftCost) {
    return left.result.totalSoftCost - right.result.totalSoftCost;
  }
  return left.candidateId.localeCompare(right.candidateId);
}

function fullDraftWindow(draft: ScoreDraft): ConstraintWindow {
  return {
    startTick: 0,
    endTick: draft.endTick,
    state: draft.sectionPlans[0]?.state ?? "unplanned",
    harmonicPlan: draft.sectionPlans[0],
    meterContext: draft.sectionPlans[0]?.meterContext,
  };
}

function directEventShapeFailures(
  notes: readonly NoteEvent[],
  endTick: number,
): Array<{ code: ConstraintHardFailureCode; affectedNotes: ConstraintAffectedNote[] }> {
  const failures: Array<{ code: ConstraintHardFailureCode; affectedNotes: ConstraintAffectedNote[] }> = [];
  for (const note of notes) {
    const affectedNote = toAffectedNote(note);
    if (!hasSafeEventShape(note, endTick)) {
      failures.push({ code: "safe-event-shape", affectedNotes: [affectedNote] });
    }
    if (!isKnownVoiceNote(note)) {
      failures.push({ code: "known-voice", affectedNotes: [affectedNote] });
    }
    if (!Number.isSafeInteger(note.pitch) || note.pitch < 0 || note.pitch > 127) {
      failures.push({ code: "pitch-bounds", affectedNotes: [affectedNote] });
    }
    if (!Number.isSafeInteger(note.velocity) || note.velocity < 0 || note.velocity > 127) {
      failures.push({ code: "velocity-bounds", affectedNotes: [affectedNote] });
    }
  }
  return failures;
}

function hasSafeEventShape(note: NoteEvent, endTick: number): boolean {
  return (
    Number.isSafeInteger(note.startTick) &&
    Number.isSafeInteger(note.durationTicks) &&
    note.startTick >= 0 &&
    note.durationTicks > 0 &&
    note.startTick + note.durationTicks <= endTick
  );
}

function isKnownVoiceNote(note: NoteEvent): note is NoteEvent & { voice: Voice } {
  return (VOICES as readonly string[]).includes(note.voice);
}

function analyzeScoreSafely(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
  writingProfile: WritingProfile,
): ReturnType<typeof analyzeScore> | undefined {
  try {
    return analyzeScore(notes, subjectEntries, sectionPlans, writingProfile);
  } catch {
    return undefined;
  }
}

function localRangeFailures(
  notes: readonly NoteEvent[],
  writingProfile: WritingProfile,
): Array<{ code: CurrentContractDiagnosticIssueCode; affectedNotes: ConstraintAffectedNote[] }> {
  return notes
    .filter((note) => {
      const range = writingProfile.voiceRanges[note.voice];
      return note.pitch < range.min || note.pitch > range.max;
    })
    .map((note) => ({ code: "range-violation", affectedNotes: [toAffectedNote(note)] }));
}

function localVoiceCrossingFailures(
  notes: readonly NoteEvent[],
): Array<{ code: CurrentContractDiagnosticIssueCode; affectedNotes: ConstraintAffectedNote[] }> {
  const failures: Array<{ code: CurrentContractDiagnosticIssueCode; affectedNotes: ConstraintAffectedNote[] }> = [];
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const adjacentPairs: Array<[higher: Voice, lower: Voice]> = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];

  for (const tick of checkpoints) {
    for (const [higher, lower] of adjacentPairs) {
      const higherNote = activeNoteAt(notes, higher, tick);
      const lowerNote = activeNoteAt(notes, lower, tick);
      if (higherNote === undefined || lowerNote === undefined || higherNote.pitch >= lowerNote.pitch) {
        continue;
      }
      failures.push({
        code: "voice-crossing",
        affectedNotes: [higherNote, lowerNote].map(toAffectedNote),
      });
    }
  }

  return failures;
}

function localEntryPlanFailures(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): Array<{ code: CurrentContractDiagnosticIssueCode; affectedNotes: ConstraintAffectedNote[] }> {
  const failures: Array<{ code: CurrentContractDiagnosticIssueCode; affectedNotes: ConstraintAffectedNote[] }> = [];
  for (const entry of subjectEntries) {
    const entryNotes = notes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
      .sort(compareNoteEvents)
      .slice(0, entry.expectedDegreePattern.length);
    const pitchClassSequence = entryNotes.map((note) => positiveModulo(note.pitch, 12));
    const matchesPlan =
      pitchClassSequence.length === entry.actualPitchClassSequence.length &&
      pitchClassSequence.every((pitchClass, index) => pitchClass === entry.actualPitchClassSequence[index]);

    if (!matchesPlan) {
      failures.push({
        code: entry.form === "answer" ? "answer-plan-violation" : "subject-identity-violation",
        affectedNotes: entryNotes.map(toAffectedNote),
      });
      continue;
    }

    const expectedPitchClassesFromKey = entry.expectedDegreePattern.map((scaleDegree) =>
      scaleDegreePitchClass(scaleDegree, 0, entry.localKey),
    );
    const matchesLocalKey =
      expectedPitchClassesFromKey.length === entry.actualPitchClassSequence.length &&
      expectedPitchClassesFromKey.every((pitchClass, index) => pitchClass === entry.actualPitchClassSequence[index]) &&
      pitchClassSequence.every((pitchClass, index) => pitchClass === expectedPitchClassesFromKey[index]);
    if (!matchesLocalKey) {
      failures.push({ code: "key-metadata-mismatch", affectedNotes: entryNotes.map(toAffectedNote) });
    }
  }

  return failures;
}

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function overlapsWindow(note: NoteEvent, window: ConstraintWindow): boolean {
  return note.startTick < window.endTick && window.startTick < note.startTick + note.durationTicks;
}

function addHardFailure(
  failures: Map<ConstraintHardFailureCode, ConstraintHardFailure>,
  code: ConstraintHardFailureCode,
  affectedNotes: ConstraintAffectedNote[],
  count = 1,
): void {
  const existing = failures.get(code);
  if (existing === undefined) {
    failures.set(code, {
      code,
      count,
      explanation: HARD_FAILURE_EXPLANATIONS[code],
      affectedNotes: uniqueAffectedNotes(affectedNotes),
    });
    return;
  }

  failures.set(code, {
    ...existing,
    count: existing.count + count,
    affectedNotes: uniqueAffectedNotes([...existing.affectedNotes, ...affectedNotes]),
  });
}

function softFeatureCosts(
  draft: ScoreDraft,
  window: ConstraintWindow,
  diagnostics: ReturnType<typeof analyzeScore> | undefined,
  writingProfileDiagnostics: ReturnType<typeof analyzeWritingProfileConstraints>,
  sectionConstraintReview: SectionConstraintSatisfactionWindow | undefined,
): ConstraintSoftFeatureCost[] {
  const writingProfilePlayabilityCost =
    writingProfileDiagnostics.handSpanViolations +
    writingProfileDiagnostics.handAssignmentAmbiguityCount +
    writingProfileDiagnostics.sameHandLeapCost +
    writingProfileDiagnostics.musicBoxRepeatRateViolations +
    writingProfileDiagnostics.musicBoxSimultaneityViolations;

  if (diagnostics === undefined) {
    return [
      {
        feature: "writing-profile-playability",
        cost: writingProfilePlayabilityCost,
        explanation: "WritingProfile playability evidence ranks viable candidates after pitch-contract checks",
      },
      ...sectionConstraintSoftFeatureCosts(sectionConstraintReview),
      ...continuousBoundarySoftFeatureCosts(window),
      ...terminalSupportSoftFeatureCosts(draft, window),
    ].filter((cost) => cost.cost > 0);
  }

  return [
    {
      feature: "parallel-perfects",
      cost: diagnostics.parallelPerfects,
      explanation: "parallel perfect intervals are review-visible counterpoint costs, not v1 hard failures",
    },
    {
      feature: "entry-support-instability",
      cost: diagnostics.entrySupportInstabilityCount,
      explanation: "entry-local support instability ranks candidates after hard constraints pass",
    },
    {
      feature: "unresolved-entry-support-instability",
      cost: diagnostics.entrySupportInstabilityDetails.reduce(
        (sum, detail) => sum + detail.unresolvedInstabilityCount,
        0,
      ),
      explanation:
        "entry-local support instability that misses its resolution deadline ranks candidates after hard constraints pass",
    },
    {
      feature: "unresolved-dissonance",
      cost: diagnostics.unresolvedDissonanceCount + diagnostics.strongBeatDissonanceCount,
      explanation: "unresolved and strong-beat dissonance are soft costs until source-backed solver gates are adopted",
    },
    {
      feature: "episode-motivic-derivation",
      cost:
        diagnostics.episodeMotivicDevelopment.genericFreeCounterpointDurationTicks / TICKS_PER_QUARTER +
        diagnostics.episodeMotivicDevelopment.repeatedStockFormulaCount * 4,
      explanation:
        "episode candidates are ranked by motivic derivation, sequence, imitation, inversion, and stock-formula avoidance",
    },
    {
      feature: "episode-cadence-entry-preparation",
      cost: diagnostics.episodeMotivicDevelopment.reviewRequired
        ? Math.max(
            0,
            4 -
              (diagnostics.episodeMotivicDevelopment.nextEntryPreparationTicks +
                diagnostics.episodeMotivicDevelopment.cadencePreparationTicks) /
                TICKS_PER_QUARTER,
          )
        : 0,
      explanation:
        "episode candidates should show entry handoff or cadence preparation instead of generic subject-free filler",
    },
    {
      feature: "free-counterpoint-harmony-realization",
      cost:
        diagnostics.harmonicContinuity.reviewRequiredWindowCount * 4 +
        diagnostics.qualityVector.harmonicSonorities.reviewRequiredWindowCount +
        diagnostics.qualityVector.harmonicSonorities.generatorResponseWindowCount * 3 +
        diagnostics.harmonicStasisRearticulation.reviewRequiredWindowCount +
        diagnostics.harmonicStasisRearticulation.generatorResponseWindowCount * 3,
      explanation:
        "free-counterpoint candidates are ranked by audible harmonic realization, harmonic continuity, and justified rearticulation",
    },
    {
      feature: "free-counterpoint-independent-contour-rhythm",
      cost:
        Math.max(0, 1 - diagnostics.freeCounterpointContourScore) * 8 +
        Math.max(0, 0.75 - diagnostics.rhythmicIndependenceScore) * 8 +
        diagnostics.sharedRhythmOverlapCount,
      explanation: "free-counterpoint candidates are ranked by independent contour and rhythmic independence",
    },
    {
      feature: "free-counterpoint-clash-resolution",
      cost:
        diagnostics.unresolvedSevereEntryIntervalCount * 2 +
        diagnostics.dissonanceTriage.unresolvedAccentedEntryClashCount * 4,
      explanation: "free-counterpoint candidates are ranked by severe entry interval and accented clash resolution",
    },
    {
      feature: "free-counterpoint-entry-handoff-support",
      cost:
        diagnostics.exposedFreeCounterpointSolo.reviewRequiredWindowCount * 3 +
        diagnostics.entryBoundaryContinuity.unsupportedEntryLocalThinningCount * 2,
      explanation:
        "free-counterpoint candidates are ranked by entry handoff support and explained solo or thinning context",
    },
    ...sectionConstraintSoftFeatureCosts(sectionConstraintReview),
    ...continuousBoundarySoftFeatureCosts(window),
    ...terminalSupportSoftFeatureCosts(draft, window),
    {
      feature: "leap-recovery",
      cost: diagnostics.leapRecoveryMisses,
      explanation: "melodic leap recovery is a playability and line-agency cost",
    },
    {
      feature: "soprano-high-register-leap",
      cost: highRegisterSopranoLeapCost(draft.notes, window, draft.writingProfile),
      explanation:
        "candidate selection prefers available upper-line alternatives that avoid exposed high-register soprano leaps",
    },
    {
      feature: "writing-profile-playability",
      cost: writingProfilePlayabilityCost,
      explanation: "WritingProfile playability evidence ranks viable candidates after pitch-contract checks",
    },
  ].filter((cost) => cost.cost > 0);
}

function highRegisterSopranoLeapCost(
  notes: readonly NoteEvent[],
  window: ConstraintWindow,
  writingProfile: WritingProfile,
): number {
  if (!usesConstrainedSopranoContourProfile(writingProfile)) {
    return 0;
  }

  const sopranoNotes = notes
    .filter((note) => note.voice === "soprano" && overlapsWindow(note, window))
    .sort(compareNoteEvents);
  const highRegisterThreshold = Math.min(
    writingProfile.voiceRanges.soprano.max,
    writingProfile.registerTargets.soprano + 9,
  );
  let cost = 0;

  for (let index = 1; index < sopranoNotes.length; index += 1) {
    const previous = sopranoNotes[index - 1];
    const current = sopranoNotes[index];
    if (previous === undefined || current === undefined) {
      continue;
    }
    const leap = Math.abs(current.pitch - previous.pitch);
    if (leap >= 7 && Math.max(previous.pitch, current.pitch) >= highRegisterThreshold) {
      cost += 12;
    }
  }

  return cost;
}

function usesConstrainedSopranoContourProfile(writingProfile: WritingProfile): boolean {
  return writingProfile.playability?.kind === "music-box";
}

function sectionConstraintSoftFeatureCosts(
  review: SectionConstraintSatisfactionWindow | undefined,
): ConstraintSoftFeatureCost[] {
  if (review === undefined) {
    return [];
  }
  return [
    {
      feature: "section-csp-voice-coverage",
      cost:
        review.infeasibleConstraintCounts.minActiveVoiceViolation * 2 +
        review.infeasibleConstraintCounts.unsupportedSolo * 6 +
        review.infeasibleConstraintCounts.allVoiceSilence * 8 +
        review.infeasibleConstraintCounts.longUnplannedSilentRun * 5,
      explanation:
        "section-local CSP ranks candidates by required voice coverage, unsupported solo exposure, and unplanned silence",
    },
    {
      feature: "section-csp-harmonic-support",
      cost:
        review.infeasibleConstraintCounts.structuralChordSupportMiss * 4 +
        review.infeasibleConstraintCounts.structuralRootSupportMiss * 6,
      explanation: "section-local CSP ranks structural beats by root and chord-tone support",
    },
    {
      feature: "section-csp-harmonic-quality",
      cost:
        review.infeasibleConstraintCounts.thinUnrootedStructuralSupportCount * 3 +
        review.infeasibleConstraintCounts.pitchClassDoublingOnlyCount * 4 +
        review.infeasibleConstraintCounts.mixedEntryHarmonicRiskCount * 5,
      explanation:
        "section-local CSP ranks audible sonority quality while keeping thin and mixed-entry evidence review-required",
    },
    {
      feature: "section-csp-rest-reason",
      cost: review.infeasibleConstraintCounts.invalidIntentionalRestReason * 10,
      explanation: "section-local CSP accepts only the allowed internal intentional-rest reasons",
    },
    {
      feature: "section-csp-search-width",
      cost: Math.max(0, sectionConstraintSoftCost(review) / Math.max(1, review.solverCandidateCount)),
      explanation: "section-local CSP exposes bounded deterministic candidate width as trace evidence",
    },
    {
      feature: "section-csp-metrical-boundary",
      cost: review.metricalBoundaryCost,
      explanation:
        "section-local CSP ranks phrase, entry, and harmonic-anchor boundaries by metrical placement and preparation",
    },
  ].filter((cost) => cost.cost > 0);
}

function continuousBoundarySoftFeatureCosts(window: ConstraintWindow): ConstraintSoftFeatureCost[] {
  const summary = window.continuousBoundaryCarry;
  if (summary === undefined) {
    return [];
  }

  const audibleCarryCount =
    summary.carriedVoices.length +
    summary.suspendedOrResolvingVoices.length +
    summary.pedalVoices.length +
    summary.staggeredVoices.length;
  const hasEntryRole = summary.nextFirstAttackRoleMix.some(
    (role) => role === "subject" || role === "answer" || role === "subject-fragment",
  );
  const hasSupportRole = summary.nextFirstAttackRoleMix.some(
    (role) => role === "counter-subject" || role === "free-counterpoint",
  );

  return [
    {
      feature: "segment-boundary-carry",
      cost: summary.carriedVoices.length > 0 ? 0 : audibleCarryCount > 0 ? 2 : 8,
      explanation: "segment-continuation candidates are ranked by audible line carry across the hidden boundary",
    },
    {
      feature: "segment-boundary-pedal-support",
      cost:
        summary.pedalVoices.length > 0 || summary.priorTailHarmonicContinuity === "not-required"
          ? 0
          : summary.priorTailHarmonicContinuity === "harmonic-continuity-tail"
            ? 1
            : 3,
      explanation: "segment-continuation candidates keep pedal or low support visible at the boundary",
    },
    {
      feature: "segment-boundary-staggered-reentry",
      cost:
        summary.staggeredVoices.length > 0 || summary.nextFirstAttackDensity <= 2
          ? 0
          : summary.nextFirstAttackDensity >= 3
            ? 3
            : 1,
      explanation: "segment-continuation candidates prefer staggered re-entry over a dense same-tick restart",
    },
    {
      feature: "segment-boundary-prior-tail-harmonic-support",
      cost:
        summary.priorTailHarmonicContinuity === "unresolved-cadence-preparation"
          ? 7
          : summary.priorTailHarmonicContinuity === "clear-break"
            ? 2
            : 0,
      explanation:
        "segment-continuation candidates classify prior-tail harmonic support before accepting a hidden boundary",
    },
    {
      feature: "segment-boundary-first-attack-density",
      cost:
        summary.nextFirstAttackDensity === 0
          ? 5
          : summary.nextFirstAttackDensity >= 3 && audibleCarryCount === 0
            ? 6
            : Math.max(0, summary.nextFirstAttackDensity - 3),
      explanation: "segment-continuation candidates rank first-attack density separately from hard-contract failures",
    },
    {
      feature: "segment-boundary-role-mix",
      cost:
        summary.nextFirstAttackDensity >= 3 && (!hasEntryRole || !hasSupportRole)
          ? 3
          : summary.nextFirstAttackRoleMix.length <= 1 && summary.nextFirstAttackDensity >= 2
            ? 1
            : 0,
      explanation:
        "segment-continuation candidates prefer a boundary role mix that exposes entry and support functions",
    },
    {
      feature: "segment-boundary-hard-restart-risk",
      cost:
        summary.classification === "generator-response-required-hard-restart"
          ? 12
          : summary.classification === "review-required-thin-boundary"
            ? 6
            : 0,
      explanation: "segment-continuation candidates keep hard-restart risk review-visible instead of hiding it",
    },
  ];
}

function terminalSupportSoftFeatureCosts(draft: ScoreDraft, window: ConstraintWindow): ConstraintSoftFeatureCost[] {
  if (window.terminalSupport !== true) {
    return [];
  }

  const meterContext =
    window.meterContext ?? window.harmonicPlan?.meterContext ?? draft.sectionPlans.at(-1)?.meterContext;
  const inspectionStartTick = Math.max(
    window.startTick,
    window.endTick - (meterContext?.measureTicks ?? TICKS_PER_QUARTER * 4),
  );
  const terminalTick = Math.max(window.startTick, window.endTick - 1);
  const plan =
    terminalPlanForWindow(draft.sectionPlans, terminalTick) ?? window.harmonicPlan ?? draft.sectionPlans.at(-1);
  const targetKey = plan?.targetKey ?? plan?.localKey;
  const chordPitchClasses = targetKey === undefined ? [] : chordTonePitchClasses(targetKey, "cadential-tonic");
  const rootPitchClass = targetKey === undefined ? undefined : scaleDegreePitchClass(0, 0, targetKey);
  const activeAtTerminal = draft.notes.filter(
    (note) => note.startTick <= terminalTick && terminalTick < note.startTick + note.durationTicks,
  );
  const lowVoiceSupport = terminalLowVoiceSupport(activeAtTerminal, chordPitchClasses, rootPitchClass);
  const outerVoiceLanding = terminalOuterVoiceLanding(activeAtTerminal, chordPitchClasses);
  const thinning = terminalThinning(draft.notes, inspectionStartTick, terminalTick, activeAtTerminal);
  const finalRest = terminalFinalRest(draft.notes, window.endTick, terminalTick, plan?.cadenceKind, lowVoiceSupport);
  const hasCadenceTarget = terminalCadenceTargetPresent(plan, inspectionStartTick, window.endTick);

  return [
    {
      feature: "terminal-support-cadence-target",
      cost: hasCadenceTarget ? 0 : 8,
      explanation: "terminal candidates are ranked by review-visible cadence target preparation in the final window",
    },
    {
      feature: "terminal-support-low-voice",
      cost:
        lowVoiceSupport === "root-supported"
          ? 0
          : lowVoiceSupport === "stable-chord-tone"
            ? 2
            : lowVoiceSupport === "unsupported"
              ? 6
              : 8,
      explanation: "terminal candidates are ranked by low-voice root or chord-tone support at the landing",
    },
    {
      feature: "terminal-support-outer-voice-landing",
      cost: outerVoiceLanding === "stable" ? 0 : outerVoiceLanding === "review-required" ? 2 : 5,
      explanation: "terminal candidates are ranked by stable outer-voice landing on the planned final sonority",
    },
    {
      feature: "terminal-support-final-rest",
      cost: finalRest === "silence-failure" ? 7 : 0,
      explanation: "terminal candidates keep final all-voice rest failures review-visible instead of hiding silence",
    },
    {
      feature: "terminal-support-unsupported-texture-collapse",
      cost: thinning === "unsupported-collapse" ? 8 : thinning === "prepared-reduction" ? 1 : 0,
      explanation:
        "terminal candidates are ranked by cadence-supported thinning rather than unsupported texture collapse",
    },
  ];
}

function terminalPlanForWindow(sectionPlans: readonly HarmonicPlan[], terminalTick: number): HarmonicPlan | undefined {
  return sectionPlans.find(
    (plan) => plan.startTick <= terminalTick && terminalTick < plan.startTick + plan.durationTicks,
  );
}

function terminalCadenceTargetPresent(
  plan: HarmonicPlan | undefined,
  inspectionStartTick: number,
  windowEndTick: number,
): boolean {
  if (plan === undefined) {
    return false;
  }
  const cadenceKindAccepted = terminalCadenceKindAccepted(plan.cadenceKind);
  return (
    cadenceKindAccepted &&
    (plan.anchors.some(
      (anchor) => anchor.cadenceTarget && anchor.tick >= inspectionStartTick && anchor.tick < windowEndTick,
    ) ||
      plan.terminalIntent !== undefined)
  );
}

function terminalCadenceKindAccepted(cadenceKind: CadenceKind | undefined): boolean {
  return cadenceKind === "authentic" || cadenceKind === "modal";
}

function terminalLowVoiceSupport(
  activeNotes: readonly NoteEvent[],
  chordPitchClasses: readonly number[],
  rootPitchClass: number | undefined,
): "root-supported" | "stable-chord-tone" | "unsupported" | "missing" {
  const lowNote =
    activeNotes.find((note) => note.voice === "bass") ??
    activeNotes.find((note) => note.voice === "tenor") ??
    [...activeNotes].filter((note) => note.pitch < 60).sort((left, right) => left.pitch - right.pitch)[0];
  if (lowNote === undefined || rootPitchClass === undefined) {
    return "missing";
  }

  const pitchClass = positiveModulo(lowNote.pitch, 12);
  if (pitchClass === rootPitchClass) {
    return "root-supported";
  }
  return chordPitchClasses.includes(pitchClass) ? "stable-chord-tone" : "unsupported";
}

function terminalOuterVoiceLanding(
  activeNotes: readonly NoteEvent[],
  chordPitchClasses: readonly number[],
): "stable" | "review-required" | "unstable" | "missing" {
  const bass = activeNotes.find((note) => note.voice === "bass");
  const soprano = activeNotes.find((note) => note.voice === "soprano");
  if (bass === undefined || soprano === undefined) {
    return "missing";
  }

  const bassStable = chordPitchClasses.includes(positiveModulo(bass.pitch, 12));
  const sopranoStable = chordPitchClasses.includes(positiveModulo(soprano.pitch, 12));
  if (bassStable && sopranoStable) {
    return "stable";
  }
  return bassStable || sopranoStable ? "review-required" : "unstable";
}

function terminalThinning(
  notes: readonly NoteEvent[],
  inspectionStartTick: number,
  terminalTick: number,
  activeAtTerminal: readonly NoteEvent[],
): "cadence-support" | "prepared-reduction" | "unsupported-collapse" | "not-thinned" {
  const priorActiveVoiceCount = Math.max(
    ...[
      Math.max(inspectionStartTick, terminalTick - TICKS_PER_QUARTER * 2),
      Math.max(inspectionStartTick, terminalTick - TICKS_PER_QUARTER),
    ].map(
      (tick) =>
        new Set(
          notes
            .filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks)
            .map((note) => note.voice),
        ).size,
    ),
    0,
  );
  const terminalVoiceCount = new Set(activeAtTerminal.map((note) => note.voice)).size;

  if (terminalVoiceCount >= 3) {
    return "cadence-support";
  }
  if (terminalVoiceCount === 2 && priorActiveVoiceCount >= 3) {
    return "prepared-reduction";
  }
  if (terminalVoiceCount === priorActiveVoiceCount) {
    return "not-thinned";
  }
  return "unsupported-collapse";
}

function terminalFinalRest(
  notes: readonly NoteEvent[],
  endTick: number,
  terminalTick: number,
  cadenceKind: CadenceKind | undefined,
  lowVoiceSupport: "root-supported" | "stable-chord-tone" | "unsupported" | "missing",
): "none" | "piece-boundary" | "silence-failure" {
  const lastNoteEndTick = Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
  if (lastNoteEndTick >= endTick) {
    return "none";
  }

  const stableTerminal =
    terminalCadenceKindAccepted(cadenceKind) &&
    lowVoiceSupport !== "missing" &&
    lowVoiceSupport !== "unsupported" &&
    terminalTick <= lastNoteEndTick;
  return stableTerminal ? "piece-boundary" : "silence-failure";
}

function selectedReason(result: ConstraintResult): string {
  if (result.hardFailures.length === 0) {
    return appendSoftCostSummary(
      "selected by deterministic constraint ordering with no current-contract hard failures",
      result,
    );
  }
  return "retained only as diagnostics-only legacy output; future solver path must reject this candidate";
}

function rejectedReason(result: ConstraintResult): string {
  if (result.hardFailures.length === 0) {
    return appendSoftCostSummary("not selected after deterministic soft-cost and candidate-id tie-break", result);
  }
  return appendSoftCostSummary(
    `rejected for hard failures: ${result.hardFailures.map((failure) => failure.code).join(", ")}`,
    result,
  );
}

function appendSoftCostSummary(reason: string, result: ConstraintResult): string {
  const positiveFeatures = result.softCosts
    .filter((cost) => cost.cost > 0)
    .sort((left, right) => right.cost - left.cost || left.feature.localeCompare(right.feature))
    .map((cost) => cost.feature);
  const features = positiveFeatures.slice(0, 4);
  if (result.window.terminalSupport === true && !features.some((feature) => feature.startsWith("terminal-support-"))) {
    const terminalFeature =
      positiveFeatures.find((feature) => feature.startsWith("terminal-support-")) ?? "terminal-support-stable-window";
    if (features.length >= 4) {
      features[features.length - 1] = terminalFeature;
    } else {
      features.push(terminalFeature);
    }
  }
  if (
    result.window.continuousBoundaryCarry !== undefined &&
    !features.some((feature) => feature.startsWith("segment-boundary-"))
  ) {
    const boundaryFeature =
      positiveFeatures.find((feature) => feature.startsWith("segment-boundary-")) ??
      `segment-boundary-${result.window.continuousBoundaryCarry.classification}`;
    if (features.length >= 4) {
      features[features.length - 1] = boundaryFeature;
    } else {
      features.push(boundaryFeature);
    }
  }
  return features.length === 0 ? reason : `${reason}; soft-costs=${features.join(",")}`;
}

function toAffectedNote(note: NoteEvent): ConstraintAffectedNote {
  return {
    voice: note.voice,
    startTick: note.startTick,
    durationTicks: note.durationTicks,
    pitch: note.pitch,
  };
}

function uniqueAffectedNotes(notes: readonly ConstraintAffectedNote[]): ConstraintAffectedNote[] {
  const seen = new Set<string>();
  const unique: ConstraintAffectedNote[] = [];
  for (const note of notes) {
    const key = `${note.voice}:${note.startTick}:${note.durationTicks}:${note.pitch}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(note);
    }
  }
  return unique.sort(
    (left, right) =>
      left.startTick - right.startTick ||
      left.voice.localeCompare(right.voice) ||
      left.pitch - right.pitch ||
      left.durationTicks - right.durationTicks,
  );
}
