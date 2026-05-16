import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type {
  DiagnosticIssue,
  DurationDistribution,
  EntrySupportInstabilitySummary,
  EntrySupportSevereIntervalSummary,
  HarmonicPlan,
  NoteEvent,
  OrnamentPlacementReasons,
  PitchContourMotionSummary,
  PitchContourWindowSummary,
  PlannedEntry,
  SoloTextureSummary,
  Voice,
} from "../events.js";
import { analyzeHarmonicPlans } from "./harmony-diagnostics.js";
import { isModalMode } from "./key.js";
import { scaleDegreePitchClass } from "./pitch.js";
import {
  COUNTER_SUBJECT_DEGREES,
  compareNoteEvents,
  MODAL_COUNTER_SUBJECT_DEGREES,
  positiveModulo,
  VOICE_ENTRY_ORDER,
} from "./shared.js";
import type { ActiveVerticality, TextureDiagnostics } from "./types.js";

export function analyzeScore(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): {
  rangeViolations: number;
  voiceCrossings: number;
  parallelPerfects: number;
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  keyMetadataMismatches: number;
  counterSubjectCoverage: number;
  freeCounterpointCoverage: number;
  counterSubjectIdentityRetention: number;
  counterSubjectInvertibilityScore: number;
  freeCounterpointContourScore: number;
  rhythmicIndependenceScore: number;
  supportTextureRepetitionScore: number;
  expositionEntryStaggerScore: number;
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
  shortStrongBeatEntryNoteCount: number;
  entrySupportInstabilityCount: number;
  entrySupportInstabilityDetails: EntrySupportInstabilitySummary[];
  severeEntryIntervalCount: number;
  unresolvedSevereEntryIntervalCount: number;
  entrySupportSevereIntervalDetails: EntrySupportSevereIntervalSummary[];
  durationDistribution: DurationDistribution;
  repeatedPitchRunCount: number;
  allVoiceSilenceGapCount: number;
  soloTexture: SoloTextureSummary;
  pitchContourMotion: PitchContourMotionSummary;
  ornamentCandidateCount: number;
  ornamentDensity: number;
  ornamentPlacementReasons: OrnamentPlacementReasons;
  fallbackPassageCount: number;
  melodicStagnationWarnings: number;
  leapRecoveryMisses: number;
  unresolvedDissonanceCount: number;
  strongBeatDissonanceCount: number;
  cadenceTargetMisses: number;
  cadenceTargetHits: number;
  leadingToneResolutionMisses: number;
  dominantResolutionMisses: number;
  predominantDirectionMisses: number;
  harmonicFunctionMismatches: number;
  harmonicFunctionMatches: number;
  controlledAmbiguityScore: number;
  unresolvedAmbiguityWarnings: number;
  ambiguityRecoveries: number;
  styleModulationFit: number;
  parallelKeyShiftCount: number;
  formRepetitionWarnings: number;
  episodeDirectionScore: number;
  strettoClarityScore: number;
  modalContextCount: number;
  modalCharacteristicToneHits: number;
  modalCadenceHits: number;
  tonalCadenceOveruseWarnings: number;
  issues: DiagnosticIssue[];
  warnings: string[];
} {
  const issues: DiagnosticIssue[] = [];

  for (const note of notes) {
    const range = VOICE_RANGES[note.voice];
    if (note.pitch < range.min || note.pitch > range.max) {
      issues.push({
        code: "range-violation",
        severity: "warning",
        tick: note.startTick,
        voices: [note.voice],
        pitches: { [note.voice]: note.pitch },
        message: `${note.voice} pitch ${note.pitch} is outside ${range.min}-${range.max}`,
      });
    }
  }

  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let previousVerticality: ActiveVerticality | undefined;

  for (const tick of checkpoints) {
    const active = activePitchesAt(notes, tick);
    issues.push(...findVoiceCrossings(active, tick));
    if (previousVerticality !== undefined) {
      issues.push(...findParallelPerfects(previousVerticality, active, tick));
    }
    previousVerticality = active;
  }
  issues.push(...findEntryPlanIssues(notes, subjectEntries));
  issues.push(...findMelodicStagnationIssues(notes));
  issues.push(...findLeapRecoveryIssues(notes));

  const rangeViolations = countIssues(issues, "range-violation");
  const voiceCrossings = countIssues(issues, "voice-crossing");
  const parallelPerfects = countIssues(issues, "parallel-perfect");
  const subjectIdentityViolations = countIssues(issues, "subject-identity-violation");
  const answerPlanViolations = countIssues(issues, "answer-plan-violation");
  const keyMetadataMismatches = countIssues(issues, "key-metadata-mismatch");
  const counterSubjectCoverage = textureCoverage(notes, "counter-subject");
  const freeCounterpointCoverage = textureCoverage(notes, "free-counterpoint");
  const textureDiagnostics = analyzeTextureDiagnostics(notes, subjectEntries, sectionPlans);
  const fallbackPassageCount = notes.filter((note) => note.role === "fallback").length;
  const melodicStagnationWarnings = countIssues(issues, "melodic-stagnation");
  const leapRecoveryMisses = countIssues(issues, "leap-recovery-miss");
  const harmonicDiagnostics = analyzeHarmonicPlans(notes, sectionPlans, subjectEntries);
  const warnings: string[] = [];
  if (rangeViolations > 0) {
    warnings.push("range violations detected");
  }
  if (voiceCrossings > 0) {
    warnings.push("voice crossings detected");
  }
  if (parallelPerfects > 0) {
    warnings.push("parallel perfect intervals suspected");
  }
  if (subjectIdentityViolations > 0) {
    warnings.push("subject identity violations detected");
  }
  if (answerPlanViolations > 0) {
    warnings.push("answer plan violations detected");
  }
  if (keyMetadataMismatches > 0) {
    warnings.push("key metadata mismatches detected");
  }
  if (fallbackPassageCount > 0) {
    warnings.push("fallback counterpoint passages detected");
  }
  if (melodicStagnationWarnings > 0) {
    warnings.push("melodic stagnation warnings detected");
  }
  if (leapRecoveryMisses > 0) {
    warnings.push("leap recovery misses detected");
  }
  if (textureDiagnostics.expositionEntryStaggerScore < 1) {
    warnings.push("exposition entry density warning detected");
  }
  if (textureDiagnostics.rhythmicIndependenceScore < 0.5) {
    warnings.push("texture independence warning detected");
  }
  if (textureDiagnostics.allVoiceSilenceGapCount > 0) {
    warnings.push("all-voice silence gaps detected");
  }
  if (harmonicDiagnostics.formRepetitionWarnings > 0) {
    warnings.push("form repetition warnings detected");
  }
  if (harmonicDiagnostics.tonalCadenceOveruseWarnings > 0) {
    warnings.push("modal review leans too strongly on tonal cadence patterns");
  }

  return {
    rangeViolations,
    voiceCrossings,
    parallelPerfects,
    subjectIdentityViolations,
    answerPlanViolations,
    keyMetadataMismatches,
    counterSubjectCoverage,
    freeCounterpointCoverage,
    ...textureDiagnostics,
    fallbackPassageCount,
    melodicStagnationWarnings,
    leapRecoveryMisses,
    ...harmonicDiagnostics,
    issues,
    warnings,
  };
}

function textureCoverage(notes: readonly NoteEvent[], role: "counter-subject" | "free-counterpoint"): number {
  const entryNotes = notes.filter((note) => isEntryRole(note.role));
  const textureNotes = notes.filter((note) => note.role === role);
  const entryDuration = entryNotes.reduce((sum, note) => sum + note.durationTicks, 0);
  if (entryDuration === 0) {
    return 0;
  }

  const coveredDuration = entryNotes.reduce(
    (sum, entryNote) =>
      sum +
      entryNote.durationTicks *
        Number(
          textureNotes.some(
            (textureNote) =>
              textureNote.voice !== entryNote.voice &&
              textureNote.startTick < entryNote.startTick + entryNote.durationTicks &&
              entryNote.startTick < textureNote.startTick + textureNote.durationTicks,
          ),
        ),
    0,
  );
  return roundRatio(coveredDuration / entryDuration);
}

function analyzeTextureDiagnostics(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): TextureDiagnostics {
  const counterSubjectNotes = notes.filter((note) => note.role === "counter-subject").sort(compareNoteEvents);
  const freeCounterpointNotes = notes.filter((note) => note.role === "free-counterpoint").sort(compareNoteEvents);
  const supportNotes = [...counterSubjectNotes, ...freeCounterpointNotes].sort(compareNoteEvents);
  const verticalStats = analyzeVerticalTexture(notes);
  const repeatedPitchRunCount = countRepeatedPitchRuns(notes, 3);
  const ornamentCandidateCount = countOrnamentCandidates(notes);
  const supportNoteCount = Math.max(1, supportNotes.length);
  const entrySupportInstabilityDetails = analyzeEntrySupportInstabilities(notes, subjectEntries);
  const entrySupportSevereIntervalDetails = analyzeEntrySupportSevereIntervals(notes, subjectEntries);

  return {
    counterSubjectIdentityRetention: counterSubjectIdentityRetention(counterSubjectNotes, sectionPlans),
    counterSubjectInvertibilityScore: invertibilityNearEntries(notes, subjectEntries),
    freeCounterpointContourScore: contourVariety(freeCounterpointNotes),
    rhythmicIndependenceScore: roundRatio(Math.max(0, 1 - verticalStats.sharedRhythmOverlapCount / supportNoteCount)),
    supportTextureRepetitionScore: roundRatio(Math.max(0, 1 - repeatedPitchRunCount / supportNoteCount)),
    expositionEntryStaggerScore: expositionEntryStaggerScore(notes),
    samePitchOverlapCount: verticalStats.samePitchOverlapCount,
    unisonOverlapCount: verticalStats.unisonOverlapCount,
    sameDirectionMotionCount: verticalStats.sameDirectionMotionCount,
    sharedRhythmOverlapCount: verticalStats.sharedRhythmOverlapCount,
    shortStrongBeatEntryNoteCount: countShortStrongBeatEntryNotes(notes),
    entrySupportInstabilityCount: entrySupportInstabilityDetails.reduce(
      (sum, detail) => sum + detail.instabilityCount,
      0,
    ),
    entrySupportInstabilityDetails,
    severeEntryIntervalCount: entrySupportSevereIntervalDetails.reduce(
      (sum, detail) => sum + detail.severeIntervalCount,
      0,
    ),
    unresolvedSevereEntryIntervalCount: entrySupportSevereIntervalDetails.reduce(
      (sum, detail) => sum + detail.unresolvedSevereIntervalCount,
      0,
    ),
    entrySupportSevereIntervalDetails,
    durationDistribution: durationDistribution(notes),
    repeatedPitchRunCount,
    allVoiceSilenceGapCount: countAllVoiceSilenceGaps(notes),
    soloTexture: analyzeSoloTexture(notes, sectionPlans),
    pitchContourMotion: analyzePitchContourMotion(notes),
    ornamentCandidateCount,
    ornamentDensity: roundRatio(ornamentCandidateCount / supportNoteCount),
    ornamentPlacementReasons: analyzeOrnamentPlacementReasons(notes, subjectEntries, sectionPlans),
  };
}

function counterSubjectIdentityRetention(
  counterSubjectNotes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): number {
  const strictRetention = contourRetention(counterSubjectNotes, COUNTER_SUBJECT_DEGREES);
  const hasModalPlan = sectionPlans.some((plan) => isModalMode(plan.localKey.mode) || isModalMode(plan.targetKey.mode));
  if (!hasModalPlan) {
    return strictRetention;
  }

  return Math.max(strictRetention, contourRetention(counterSubjectNotes, MODAL_COUNTER_SUBJECT_DEGREES));
}

function contourRetention(notes: readonly NoteEvent[], expectedDegrees: readonly number[]): number {
  if (notes.length < 2 || expectedDegrees.length < 2) {
    return notes.length === 0 ? 0 : 1;
  }

  const expectedDirections = expectedDegrees
    .slice(1)
    .map((degree, index) => Math.sign(degree - expectedDegrees[index]!));
  let matches = 0;
  let comparisons = 0;
  for (let offset = 0; offset < notes.length; offset += expectedDegrees.length) {
    const phrase = notes.slice(offset, offset + expectedDegrees.length);
    for (let index = 1; index < phrase.length; index += 1) {
      const actualDirection = Math.sign(phrase[index]!.pitch - phrase[index - 1]!.pitch);
      const expectedDirection = expectedDirections[index - 1]!;
      if (actualDirection === expectedDirection || actualDirection === 0) {
        matches += 1;
      }
      comparisons += 1;
    }
  }

  return roundRatio(matches / comparisons);
}

function invertibilityNearEntries(notes: readonly NoteEvent[], subjectEntries: readonly PlannedEntry[]): number {
  const entryNotes = notes.filter((note) => isEntryRole(note.role));
  if (entryNotes.length === 0) {
    return 0;
  }

  let invertibleEntries = 0;
  for (const entry of subjectEntries) {
    const entryDuration = entryNotes
      .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
      .slice(0, entry.expectedDegreePattern.length)
      .reduce((sum, note) => sum + note.durationTicks, 0);
    const startTick = entry.startTick;
    const endTick = entry.startTick + entryDuration;
    const hasIndependentCounterSubject = notes.some(
      (note) =>
        note.role === "counter-subject" &&
        note.voice !== entry.voice &&
        note.startTick < endTick &&
        startTick < note.startTick + note.durationTicks &&
        !formsSustainedPerfectWithEntry(notes, note, entry.voice),
    );
    if (hasIndependentCounterSubject) {
      invertibleEntries += 1;
    }
  }

  return roundRatio(invertibleEntries / Math.max(1, subjectEntries.length));
}

function formsSustainedPerfectWithEntry(
  notes: readonly NoteEvent[],
  textureNote: NoteEvent,
  entryVoice: Voice,
): boolean {
  const checkpoints = [textureNote.startTick, textureNote.startTick + Math.floor(textureNote.durationTicks / 2)];
  return checkpoints.every((tick) => {
    const entryNote = notes.find(
      (note) =>
        note.voice === entryVoice &&
        isEntryRole(note.role) &&
        note.startTick <= tick &&
        tick < note.startTick + note.durationTicks,
    );
    return entryNote !== undefined && isPerfectInterval(Math.abs(entryNote.pitch - textureNote.pitch) % 12);
  });
}

function contourVariety(notes: readonly NoteEvent[]): number {
  if (notes.length === 0) {
    return 0;
  }

  let variedVoices = 0;
  for (const voice of VOICE_ENTRY_ORDER) {
    const pitches = notes.filter((note) => note.voice === voice).map((note) => note.pitch);
    if (pitches.length === 0) {
      continue;
    }
    const uniquePitches = new Set(pitches).size;
    const hasBothDirections =
      pitches.some((pitch, index) => index > 0 && pitch > pitches[index - 1]!) &&
      pitches.some((pitch, index) => index > 0 && pitch < pitches[index - 1]!);
    if (uniquePitches >= 3 && hasBothDirections) {
      variedVoices += 1;
    }
  }

  return roundRatio(variedVoices / VOICE_ENTRY_ORDER.length);
}

function analyzeVerticalTexture(notes: readonly NoteEvent[]): {
  samePitchOverlapCount: number;
  unisonOverlapCount: number;
  sameDirectionMotionCount: number;
  sharedRhythmOverlapCount: number;
} {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let samePitchOverlapCount = 0;
  let unisonOverlapCount = 0;
  let sharedRhythmOverlapCount = 0;
  let sameDirectionMotionCount = 0;

  for (const tick of checkpoints) {
    const activeNotes = notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
    for (let leftIndex = 0; leftIndex < activeNotes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < activeNotes.length; rightIndex += 1) {
        const left = activeNotes[leftIndex]!;
        const right = activeNotes[rightIndex]!;
        if (left.pitch === right.pitch) {
          samePitchOverlapCount += 1;
        }
        if (positiveModulo(left.pitch - right.pitch, 12) === 0) {
          unisonOverlapCount += 1;
        }
        if (left.startTick === right.startTick && left.durationTicks === right.durationTicks) {
          sharedRhythmOverlapCount += 1;
        }
      }
    }
  }

  for (const tick of checkpoints) {
    const moving = VOICE_ENTRY_ORDER.map((voice) => motionAt(notes, voice, tick)).filter((motion) => motion !== 0);
    for (let leftIndex = 0; leftIndex < moving.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < moving.length; rightIndex += 1) {
        if (moving[leftIndex] === moving[rightIndex]) {
          sameDirectionMotionCount += 1;
        }
      }
    }
  }

  return { samePitchOverlapCount, unisonOverlapCount, sameDirectionMotionCount, sharedRhythmOverlapCount };
}

function motionAt(notes: readonly NoteEvent[], voice: Voice, tick: number): number {
  const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
  const index = voiceNotes.findIndex((note) => note.startTick === tick);
  if (index <= 0) {
    return 0;
  }
  return Math.sign(voiceNotes[index]!.pitch - voiceNotes[index - 1]!.pitch);
}

function expositionEntryStaggerScore(notes: readonly NoteEvent[]): number {
  const initialVoices = new Set(notes.filter((note) => note.startTick === 0).map((note) => note.voice)).size;
  if (initialVoices === 0) {
    return 0;
  }
  return roundRatio(Math.max(0, 1 - (initialVoices - 1) / (VOICE_ENTRY_ORDER.length - 1)));
}

function durationDistribution(notes: readonly NoteEvent[]): DurationDistribution {
  const distribution: DurationDistribution = {
    whole: 0,
    half: 0,
    quarter: 0,
    eighth: 0,
    sixteenth: 0,
    dotted: 0,
    triplet: 0,
    other: 0,
  };

  for (const note of notes) {
    if (note.durationTicks === TICKS_PER_QUARTER * 4) {
      distribution.whole += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER * 2) {
      distribution.half += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER) {
      distribution.quarter += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER / 2) {
      distribution.eighth += 1;
    } else if (note.durationTicks === TICKS_PER_QUARTER / 4) {
      distribution.sixteenth += 1;
    } else if (note.durationTicks % (TICKS_PER_QUARTER / 2) === TICKS_PER_QUARTER / 4) {
      distribution.dotted += 1;
    } else if (note.durationTicks % (TICKS_PER_QUARTER / 3) === 0) {
      distribution.triplet += 1;
    } else {
      distribution.other += 1;
    }
  }

  return distribution;
}

function countRepeatedPitchRuns(notes: readonly NoteEvent[], minimumRunLength: number): number {
  let runs = 0;
  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    let runStart = 0;
    for (let index = 1; index <= voiceNotes.length; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
        continue;
      }
      if (index - runStart >= minimumRunLength) {
        runs += 1;
      }
      runStart = index;
    }
  }
  return runs;
}

function countAllVoiceSilenceGaps(notes: readonly NoteEvent[]): number {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  let gaps = 0;
  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const hasActiveNote = notes.some(
      (note) => note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    );
    if (!hasActiveNote) {
      gaps += 1;
    }
  }
  return gaps;
}

function countOrnamentCandidates(notes: readonly NoteEvent[]): number {
  return ornamentCandidateNotes(notes).length;
}

function countShortStrongBeatEntryNotes(notes: readonly NoteEvent[]): number {
  return notes.filter(
    (note) =>
      isEntryRole(note.role) &&
      note.durationTicks <= TICKS_PER_QUARTER / 2 &&
      note.startTick % (TICKS_PER_QUARTER * 2) === 0,
  ).length;
}

function analyzeEntrySupportInstabilities(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntrySupportInstabilitySummary[] {
  return subjectEntries.map((entry) => {
    const ticks = entrySupportCheckpoints(notes, entry);
    const unstableTicks = ticks.filter((tick) => hasEntrySupportInstabilityAt(notes, entry, tick));
    let consecutive = 0;
    let maxConsecutiveInstabilities = 0;
    let unresolvedInstabilityCount = 0;

    for (const tick of ticks) {
      if (!unstableTicks.includes(tick)) {
        consecutive = 0;
        continue;
      }

      consecutive += 1;
      maxConsecutiveInstabilities = Math.max(maxConsecutiveInstabilities, consecutive);
      const resolutionDeadlineTick = tick + TICKS_PER_QUARTER;
      const resolvesBeforeDeadline = ticks.some(
        (candidateTick) =>
          candidateTick > tick && candidateTick <= resolutionDeadlineTick && !unstableTicks.includes(candidateTick),
      );
      if (!resolvesBeforeDeadline) {
        unresolvedInstabilityCount += 1;
      }
    }

    return {
      voice: entry.voice,
      form: entry.form,
      state: entry.state,
      startTick: entry.startTick,
      instabilityCount: unstableTicks.length,
      maxConsecutiveInstabilities,
      unresolvedInstabilityCount,
    };
  });
}

function analyzeEntrySupportSevereIntervals(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
): EntrySupportSevereIntervalSummary[] {
  return subjectEntries.map((entry) => {
    const ticks = entrySupportCheckpoints(notes, entry);
    const severeTicks = ticks.filter((tick) => hasSevereEntryIntervalAt(notes, entry, tick));
    let unresolvedSevereIntervalCount = 0;

    for (const tick of severeTicks) {
      const resolutionDeadlineTick = tick + TICKS_PER_QUARTER;
      const resolvesBeforeDeadline = ticks.some(
        (candidateTick) =>
          candidateTick > tick && candidateTick <= resolutionDeadlineTick && !severeTicks.includes(candidateTick),
      );
      if (!resolvesBeforeDeadline) {
        unresolvedSevereIntervalCount += 1;
      }
    }

    return {
      voice: entry.voice,
      form: entry.form,
      state: entry.state,
      startTick: entry.startTick,
      severeIntervalCount: severeTicks.length,
      unresolvedSevereIntervalCount,
    };
  });
}

function entrySupportCheckpoints(notes: readonly NoteEvent[], entry: PlannedEntry): number[] {
  const entryWindowEndTick = entry.startTick + TICKS_PER_QUARTER * 2;
  return [
    ...new Set(
      notes
        .filter((note) => note.startTick < entryWindowEndTick && entry.startTick < note.startTick + note.durationTicks)
        .flatMap((note) => [note.startTick, note.startTick + note.durationTicks]),
    ),
  ]
    .filter((tick) => tick >= entry.startTick && tick < entryWindowEndTick && tick % (TICKS_PER_QUARTER / 2) === 0)
    .sort((left, right) => left - right);
}

function hasEntrySupportInstabilityAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  return entrySupportIntervalsAt(notes, entry, tick).some((intervalClass) => isEntrySupportInstability(intervalClass));
}

function hasSevereEntryIntervalAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  return entrySupportIntervalsAt(notes, entry, tick).some((intervalClass) => isSevereEntryInterval(intervalClass));
}

function entrySupportIntervalsAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): number[] {
  const entryNote = notes.find(
    (note) =>
      note.voice === entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      isEntryRole(note.role),
  );
  if (entryNote === undefined) {
    return [];
  }

  const supportNotes = notes.filter(
    (note) =>
      note.voice !== entry.voice &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      (note.role === "counter-subject" || note.role === "free-counterpoint"),
  );
  return supportNotes.map((supportNote) => Math.abs(entryNote.pitch - supportNote.pitch) % 12);
}

function isEntrySupportInstability(intervalClass: number): boolean {
  return (
    intervalClass === 1 ||
    intervalClass === 2 ||
    intervalClass === 5 ||
    intervalClass === 6 ||
    intervalClass === 10 ||
    intervalClass === 11
  );
}

function isSevereEntryInterval(intervalClass: number): boolean {
  return intervalClass === 1 || intervalClass === 2 || intervalClass === 10 || intervalClass === 11;
}

function analyzeSoloTexture(notes: readonly NoteEvent[], sectionPlans: readonly HarmonicPlan[]): SoloTextureSummary {
  const checkpoints = [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
  const runs: {
    voice: Voice;
    startTick: number;
    endTick: number;
    previousActiveVoiceCount: number;
  }[] = [];
  let currentRun:
    | {
        voice: Voice;
        startTick: number;
        endTick: number;
        previousActiveVoiceCount: number;
      }
    | undefined;
  let previousActiveVoiceCount = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const startTick = checkpoints[index]!;
    const endTick = checkpoints[index + 1]!;
    const activeVoices = activeVoicesDuring(notes, startTick, endTick);
    if (activeVoices.length === 1) {
      const voice = activeVoices[0]!;
      if (currentRun?.voice === voice && currentRun.endTick === startTick) {
        currentRun.endTick = endTick;
      } else {
        if (currentRun !== undefined) {
          runs.push(currentRun);
        }
        currentRun = { voice, startTick, endTick, previousActiveVoiceCount };
      }
    } else if (currentRun !== undefined) {
      runs.push(currentRun);
      currentRun = undefined;
    }
    previousActiveVoiceCount = activeVoices.length;
  }
  if (currentRun !== undefined) {
    runs.push(currentRun);
  }

  const longRuns = runs.filter((run) => run.endTick - run.startTick >= TICKS_PER_QUARTER);
  const unsupportedRuns = longRuns.filter(
    (run) =>
      run.previousActiveVoiceCount >= 2 &&
      !hasNearbyPhraseSupport(run.startTick, sectionPlans) &&
      !hasGradualThinningBefore(notes, run.voice, run.startTick),
  );
  const abruptRuns = unsupportedRuns.filter((run) => run.previousActiveVoiceCount >= 3);
  const runsByVoice = VOICE_ENTRY_ORDER.map((voice) => longRuns.filter((run) => run.voice === voice).length);

  return {
    soloRunCount: longRuns.length,
    unsupportedSoloRunCount: unsupportedRuns.length,
    abruptTextureDropCount: abruptRuns.length,
    soloVoiceImbalance: Math.max(...runsByVoice) - Math.min(...runsByVoice),
  };
}

function analyzePitchContourMotion(notes: readonly NoteEvent[]): PitchContourMotionSummary {
  return {
    fourBeat: analyzePitchContourWindow(notes, TICKS_PER_QUARTER * 4),
    eightBeat: analyzePitchContourWindow(notes, TICKS_PER_QUARTER * 8),
  };
}

function analyzePitchContourWindow(notes: readonly NoteEvent[], windowTicks: number): PitchContourWindowSummary {
  const endTick = Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
  let bassUpperSameDirectionCount = 0;
  let bassUpperContraryCount = 0;
  let bassUpperComparisonCount = 0;
  let outerVoiceSameDirectionCount = 0;
  let outerVoiceContraryCount = 0;
  let outerVoiceComparisonCount = 0;

  for (let startTick = 0; startTick + windowTicks <= endTick; startTick += TICKS_PER_QUARTER) {
    const endWindowTick = startTick + windowTicks;
    const bassDirection = voiceWindowDirection(notes, "bass", startTick, endWindowTick);
    if (bassDirection === 0) {
      continue;
    }

    for (const upperVoice of ["soprano", "alto", "tenor"] as const) {
      const upperDirection = voiceWindowDirection(notes, upperVoice, startTick, endWindowTick);
      if (upperDirection === 0) {
        continue;
      }
      bassUpperComparisonCount += 1;
      if (upperDirection === bassDirection) {
        bassUpperSameDirectionCount += 1;
      } else {
        bassUpperContraryCount += 1;
      }
    }

    const sopranoDirection = voiceWindowDirection(notes, "soprano", startTick, endWindowTick);
    if (sopranoDirection !== 0) {
      outerVoiceComparisonCount += 1;
      if (sopranoDirection === bassDirection) {
        outerVoiceSameDirectionCount += 1;
      } else {
        outerVoiceContraryCount += 1;
      }
    }
  }

  return {
    windowTicks,
    bassUpperComparisonCount,
    bassUpperSameDirectionRatio: roundRatio(bassUpperSameDirectionCount / Math.max(1, bassUpperComparisonCount)),
    bassUpperContraryRatio: roundRatio(bassUpperContraryCount / Math.max(1, bassUpperComparisonCount)),
    outerVoiceComparisonCount,
    outerVoiceSameDirectionRatio: roundRatio(outerVoiceSameDirectionCount / Math.max(1, outerVoiceComparisonCount)),
    outerVoiceContraryRatio: roundRatio(outerVoiceContraryCount / Math.max(1, outerVoiceComparisonCount)),
  };
}

function voiceWindowDirection(notes: readonly NoteEvent[], voice: Voice, startTick: number, endTick: number): number {
  const startPitch = activePitchForVoiceAt(notes, voice, startTick);
  const endPitch = activePitchForVoiceAt(notes, voice, endTick - 1);
  if (startPitch === undefined || endPitch === undefined) {
    return 0;
  }

  return Math.sign(endPitch - startPitch);
}

function activePitchForVoiceAt(notes: readonly NoteEvent[], voice: Voice, tick: number): number | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  )?.pitch;
}

function activeVoicesDuring(notes: readonly NoteEvent[], startTick: number, endTick: number): Voice[] {
  return VOICE_ENTRY_ORDER.filter((voice) =>
    notes.some(
      (note) => note.voice === voice && note.startTick < endTick && startTick < note.startTick + note.durationTicks,
    ),
  );
}

function hasNearbyPhraseSupport(tick: number, sectionPlans: readonly HarmonicPlan[]): boolean {
  return sectionPlans.some((plan) => {
    const sectionEndTick = plan.startTick + plan.durationTicks;
    const nearSectionBoundary =
      Math.abs(tick - plan.startTick) <= TICKS_PER_QUARTER || Math.abs(tick - sectionEndTick) <= TICKS_PER_QUARTER;
    const nearCadence = plan.anchors.some(
      (anchor) => anchor.cadenceTarget && Math.abs(tick - anchor.tick) <= TICKS_PER_QUARTER,
    );
    return nearSectionBoundary || nearCadence;
  });
}

function hasGradualThinningBefore(notes: readonly NoteEvent[], voice: Voice, tick: number): boolean {
  const previousTick = tick - TICKS_PER_QUARTER / 2;
  if (previousTick < 0) {
    return false;
  }

  const previousActiveVoices = activeVoicesDuring(notes, previousTick, tick);
  return previousActiveVoices.length === 2 && previousActiveVoices.includes(voice);
}

function analyzeOrnamentPlacementReasons(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): OrnamentPlacementReasons {
  const reasons: OrnamentPlacementReasons = {
    entryEnding: 0,
    cadenceApproach: 0,
    heldNote: 0,
    phraseBoundary: 0,
    total: 0,
  };
  const entryEndTicks = subjectEntries.map((entry) => entryEndTick(notes, entry)).filter((tick) => tick !== undefined);
  const cadenceTicks = sectionPlans.flatMap((plan) =>
    plan.anchors.filter((anchor) => anchor.cadenceTarget).map((anchor) => anchor.tick),
  );

  for (const note of ornamentCandidateNotes(notes)) {
    let hasReason = false;
    if (entryEndTicks.some((tick) => Math.abs(note.startTick - tick) <= TICKS_PER_QUARTER)) {
      reasons.entryEnding += 1;
      hasReason = true;
    }
    if (cadenceTicks.some((tick) => note.startTick <= tick && tick - note.startTick <= TICKS_PER_QUARTER)) {
      reasons.cadenceApproach += 1;
      hasReason = true;
    }
    if (note.durationTicks >= TICKS_PER_QUARTER * 2) {
      reasons.heldNote += 1;
      hasReason = true;
    }
    if (sectionPlans.some((plan) => Math.abs(note.startTick - plan.startTick) <= TICKS_PER_QUARTER)) {
      reasons.phraseBoundary += 1;
      hasReason = true;
    }
    if (hasReason) {
      reasons.total += 1;
    }
  }

  return reasons;
}

function ornamentCandidateNotes(notes: readonly NoteEvent[]): NoteEvent[] {
  return notes.filter(
    (note) =>
      (note.role === "counter-subject" || note.role === "free-counterpoint") &&
      note.durationTicks >= TICKS_PER_QUARTER &&
      note.startTick % TICKS_PER_QUARTER === 0,
  );
}

function entryEndTick(notes: readonly NoteEvent[], entry: PlannedEntry): number | undefined {
  const entryNotes = notes
    .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick && isEntryRole(note.role))
    .sort(compareNoteEvents)
    .slice(0, entry.expectedDegreePattern.length);
  if (entryNotes.length === 0) {
    return undefined;
  }

  return Math.max(...entryNotes.map((note) => note.startTick + note.durationTicks));
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function findMelodicStagnationIssues(notes: readonly NoteEvent[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    let runStart = 0;
    for (let index = 1; index <= voiceNotes.length; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
        continue;
      }

      if (index - runStart >= 5) {
        const first = voiceNotes[runStart]!;
        issues.push({
          code: "melodic-stagnation",
          severity: "warning",
          tick: first.startTick,
          voices: [voice],
          pitches: { [voice]: first.pitch },
          message: `${voice} repeats pitch ${first.pitch} for ${index - runStart} notes`,
        });
      }
      runStart = index;
    }
  }

  return issues;
}

function findLeapRecoveryIssues(notes: readonly NoteEvent[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNoteEvents);
    for (let index = 1; index < voiceNotes.length - 1; index += 1) {
      const previous = voiceNotes[index - 1]!;
      const current = voiceNotes[index]!;
      const next = voiceNotes[index + 1]!;
      const leap = current.pitch - previous.pitch;
      if (Math.abs(leap) <= 5) {
        continue;
      }

      const recovery = next.pitch - current.pitch;
      const recoversByStepInOppositeDirection = Math.sign(recovery) === -Math.sign(leap) && Math.abs(recovery) <= 2;
      if (!recoversByStepInOppositeDirection) {
        issues.push({
          code: "leap-recovery-miss",
          severity: "warning",
          tick: current.startTick,
          voices: [voice],
          pitches: { [voice]: current.pitch },
          message: `${voice} leap of ${Math.abs(leap)} semitones is not recovered by contrary step`,
        });
      }
    }
  }

  return issues;
}

function findEntryPlanIssues(notes: readonly NoteEvent[], subjectEntries: readonly PlannedEntry[]): DiagnosticIssue[] {
  const issues: DiagnosticIssue[] = [];

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
      issues.push({
        code: entry.form === "answer" ? "answer-plan-violation" : "subject-identity-violation",
        severity: "warning",
        tick: entry.startTick,
        voices: [entry.voice],
        pitches: entryNotes[0] === undefined ? {} : { [entry.voice]: entryNotes[0].pitch },
        message:
          entry.form === "answer"
            ? `${entry.voice} answer does not match the planned ${entry.answerKind ?? "true"} answer`
            : `${entry.voice} ${entry.form} does not match the planned degree pattern`,
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
      issues.push({
        code: "key-metadata-mismatch",
        severity: "warning",
        tick: entry.startTick,
        voices: [entry.voice],
        pitches: entryNotes[0] === undefined ? {} : { [entry.voice]: entryNotes[0].pitch },
        message: `${entry.voice} entry pitch classes do not match local key ${entry.localKey.tonic} ${entry.localKey.mode}`,
      });
    }
  }

  return issues;
}

function activePitchesAt(notes: readonly NoteEvent[], tick: number): ActiveVerticality {
  const active: ActiveVerticality = new Map();
  for (const voice of VOICE_ENTRY_ORDER) {
    const note = notes
      .filter((candidate) => candidate.voice === voice)
      .find((candidate) => candidate.startTick <= tick && tick < candidate.startTick + candidate.durationTicks);
    if (note !== undefined) {
      active.set(voice, { pitch: note.pitch, role: note.role });
    }
  }
  return active;
}

function findVoiceCrossings(active: ActiveVerticality, tick: number): DiagnosticIssue[] {
  const adjacentPairs: [higher: Voice, lower: Voice][] = [
    ["soprano", "alto"],
    ["alto", "tenor"],
    ["tenor", "bass"],
  ];
  const issues: DiagnosticIssue[] = [];

  for (const [higher, lower] of adjacentPairs) {
    const higherPitch = active.get(higher)?.pitch;
    const lowerPitch = active.get(lower)?.pitch;
    if (higherPitch === undefined || lowerPitch === undefined || higherPitch >= lowerPitch) {
      continue;
    }

    issues.push({
      code: "voice-crossing",
      severity: "warning",
      tick,
      voices: [higher, lower],
      pitches: { [higher]: higherPitch, [lower]: lowerPitch },
      message: `${higher} is below ${lower} at tick ${tick}`,
    });
  }

  return issues;
}

function findParallelPerfects(
  previous: ActiveVerticality,
  current: ActiveVerticality,
  tick: number,
): DiagnosticIssue[] {
  if (tick % TICKS_PER_QUARTER !== 0) {
    return [];
  }

  const issues: DiagnosticIssue[] = [];
  for (let leftIndex = 0; leftIndex < VOICE_ENTRY_ORDER.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < VOICE_ENTRY_ORDER.length; rightIndex += 1) {
      const left = VOICE_ENTRY_ORDER[leftIndex]!;
      const right = VOICE_ENTRY_ORDER[rightIndex]!;
      const previousLeft = previous.get(left);
      const previousRight = previous.get(right);
      const currentLeft = current.get(left);
      const currentRight = current.get(right);
      if (
        previousLeft === undefined ||
        previousRight === undefined ||
        currentLeft === undefined ||
        currentRight === undefined
      ) {
        continue;
      }
      if (!isEntryRole(currentLeft.role) || !isEntryRole(currentRight.role)) {
        continue;
      }

      const previousInterval = Math.abs(previousLeft.pitch - previousRight.pitch) % 12;
      const currentInterval = Math.abs(currentLeft.pitch - currentRight.pitch) % 12;
      const leftMotion = Math.sign(currentLeft.pitch - previousLeft.pitch);
      const rightMotion = Math.sign(currentRight.pitch - previousRight.pitch);
      if (
        leftMotion !== 0 &&
        leftMotion === rightMotion &&
        isPerfectInterval(previousInterval) &&
        isPerfectInterval(currentInterval)
      ) {
        issues.push({
          code: "parallel-perfect",
          severity: "warning",
          tick,
          voices: [left, right],
          pitches: { [left]: currentLeft.pitch, [right]: currentRight.pitch },
          message: `${left} and ${right} move in parallel perfect interval at tick ${tick}`,
        });
      }
    }
  }

  return issues;
}

function isPerfectInterval(intervalClass: number): boolean {
  return intervalClass === 0 || intervalClass === 7;
}

function countIssues(issues: readonly DiagnosticIssue[], code: DiagnosticIssue["code"]): number {
  return issues.filter((issue) => issue.code === code).length;
}
