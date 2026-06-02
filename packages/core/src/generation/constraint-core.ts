import { VOICES } from "../constants.js";
import type {
  ConstraintHardFailureCode,
  CurrentContractDiagnosticIssueCode,
  FugueState,
  GeneratorSearchTrace,
  HarmonicPlan,
  MeterContext,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { analyzeWritingProfileConstraints, type WritingProfile } from "../writing-profile.js";
import { analyzeScore } from "./diagnostics.js";
import { scaleDegreePitchClass } from "./pitch.js";
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

  const softCosts = softFeatureCosts(diagnostics, writingProfileDiagnostics);
  const totalSoftCost = roundRatio(softCosts.reduce((sum, cost) => sum + cost.cost, 0));
  const sortedHardFailures = [...hardFailures.values()].sort((left, right) => left.code.localeCompare(right.code));
  const affectedNotes = uniqueAffectedNotes(sortedHardFailures.flatMap((failure) => failure.affectedNotes));

  return {
    schemaVersion: 1,
    window,
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
  diagnostics: ReturnType<typeof analyzeScore> | undefined,
  writingProfileDiagnostics: ReturnType<typeof analyzeWritingProfileConstraints>,
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
      feature: "unresolved-dissonance",
      cost: diagnostics.unresolvedDissonanceCount + diagnostics.strongBeatDissonanceCount,
      explanation: "unresolved and strong-beat dissonance are soft costs until source-backed solver gates are adopted",
    },
    {
      feature: "leap-recovery",
      cost: diagnostics.leapRecoveryMisses,
      explanation: "melodic leap recovery is a playability and line-agency cost",
    },
    {
      feature: "writing-profile-playability",
      cost: writingProfilePlayabilityCost,
      explanation: "WritingProfile playability evidence ranks viable candidates after pitch-contract checks",
    },
  ].filter((cost) => cost.cost > 0);
}

function selectedReason(result: ConstraintResult): string {
  if (result.hardFailures.length === 0) {
    return "selected by deterministic constraint ordering with no current-contract hard failures";
  }
  return "retained only as diagnostics-only legacy output; future solver path must reject this candidate";
}

function rejectedReason(result: ConstraintResult): string {
  if (result.hardFailures.length === 0) {
    return "not selected after deterministic soft-cost and candidate-id tie-break";
  }
  return `rejected for hard failures: ${result.hardFailures.map((failure) => failure.code).join(", ")}`;
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
