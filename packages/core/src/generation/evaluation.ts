import { TICKS_PER_QUARTER, VOICES } from "../constants.js";
import type {
  CandidateEvaluation,
  CandidateEvaluationExplanations,
  CandidateVoicePairExplanation,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import { analyzeScore } from "./diagnostics.js";
import type { Exposition } from "./types.js";

const EVALUATION_WEIGHTS = {
  hardFailure: 10_000,
  counterpoint: {
    parallelPerfect: 10,
    counterSubjectCoverage: 20,
    freeCounterpointCoverage: 10,
    counterSubjectInvertibility: 8,
  },
  melody: {
    leapRecoveryMiss: 35,
    melodicStagnation: 25,
    freeCounterpointContour: 12,
    ornamentDensity: 6,
  },
  texture: {
    samePitchOverlap: 4,
    unisonOverlap: 8,
    sameDirectionMotion: 3,
    fourBeatBassUpperSameDirection: 2,
    eightBeatBassUpperSameDirection: 1,
    fourBeatOuterVoiceSameDirection: 1,
    sharedRhythmOverlap: 2,
    allVoiceSilenceGap: 25,
    rhythmicIndependence: 12,
    supportTextureRepetition: 8,
    expositionEntryStagger: 10,
    bassUpperContraryMotion: 1,
    outerVoiceContraryMotion: 1,
  },
  subjectClarity: {
    subjectIdentityViolation: 10_000,
    answerPlanViolation: 1_000,
    counterSubjectIdentityRetention: 10,
  },
  harmony: {
    unresolvedDissonance: 100,
    strongBeatDissonance: 50,
    predominantDirectionMiss: 30,
    unresolvedAmbiguity: 30,
    controlledAmbiguity: 10,
    styleModulationFit: 8,
    harmonicFunctionMatch: 1,
  },
  form: {
    formRepetition: 50,
    episodeDirection: 10,
    strettoClarity: 10,
  },
} as const;

export function evaluateCandidate(previousNotes: readonly NoteEvent[], candidate: Exposition): CandidateEvaluation {
  const recentNotes = previousNotes.slice(-64);
  const candidateNotes = [...recentNotes, ...candidate.notes];
  const diagnostics = analyzeScore(candidateNotes, candidate.subjectEntries, candidate.sectionPlans);
  const explanations = explainCandidateFeatures(candidateNotes, candidate, diagnostics);

  const hardFailures = diagnostics.issues
    .filter(
      (issue) =>
        issue.code === "range-violation" ||
        issue.code === "voice-crossing" ||
        issue.code === "subject-identity-violation" ||
        issue.code === "answer-plan-violation" ||
        issue.code === "key-metadata-mismatch",
    )
    .map((issue) => issue.code);
  const counterpoint = {
    cost: diagnostics.parallelPerfects * EVALUATION_WEIGHTS.counterpoint.parallelPerfect,
    reward:
      diagnostics.counterSubjectCoverage * EVALUATION_WEIGHTS.counterpoint.counterSubjectCoverage +
      diagnostics.freeCounterpointCoverage * EVALUATION_WEIGHTS.counterpoint.freeCounterpointCoverage +
      diagnostics.counterSubjectInvertibilityScore * EVALUATION_WEIGHTS.counterpoint.counterSubjectInvertibility,
    features: {
      counterSubjectCoverage: diagnostics.counterSubjectCoverage,
      freeCounterpointCoverage: diagnostics.freeCounterpointCoverage,
      counterSubjectInvertibilityScore: diagnostics.counterSubjectInvertibilityScore,
      parallelPerfects: diagnostics.parallelPerfects,
    },
  };
  const melody = {
    cost:
      diagnostics.leapRecoveryMisses * EVALUATION_WEIGHTS.melody.leapRecoveryMiss +
      diagnostics.melodicStagnationWarnings * EVALUATION_WEIGHTS.melody.melodicStagnation,
    reward:
      diagnostics.freeCounterpointContourScore * EVALUATION_WEIGHTS.melody.freeCounterpointContour +
      diagnostics.ornamentDensity * EVALUATION_WEIGHTS.melody.ornamentDensity,
    features: {
      leapRecoveryMisses: diagnostics.leapRecoveryMisses,
      melodicStagnationWarnings: diagnostics.melodicStagnationWarnings,
      freeCounterpointContourScore: diagnostics.freeCounterpointContourScore,
      ornamentDensity: diagnostics.ornamentDensity,
    },
  };
  const texture = {
    cost:
      diagnostics.samePitchOverlapCount * EVALUATION_WEIGHTS.texture.samePitchOverlap +
      diagnostics.unisonOverlapCount * EVALUATION_WEIGHTS.texture.unisonOverlap +
      diagnostics.sameDirectionMotionCount * EVALUATION_WEIGHTS.texture.sameDirectionMotion +
      diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.eightBeatBassUpperSameDirection +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio *
        EVALUATION_WEIGHTS.texture.fourBeatOuterVoiceSameDirection +
      diagnostics.sharedRhythmOverlapCount * EVALUATION_WEIGHTS.texture.sharedRhythmOverlap +
      diagnostics.allVoiceSilenceGapCount * EVALUATION_WEIGHTS.texture.allVoiceSilenceGap,
    reward:
      diagnostics.rhythmicIndependenceScore * EVALUATION_WEIGHTS.texture.rhythmicIndependence +
      diagnostics.supportTextureRepetitionScore * EVALUATION_WEIGHTS.texture.supportTextureRepetition +
      diagnostics.expositionEntryStaggerScore * EVALUATION_WEIGHTS.texture.expositionEntryStagger +
      diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio *
        EVALUATION_WEIGHTS.texture.bassUpperContraryMotion +
      diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio *
        EVALUATION_WEIGHTS.texture.outerVoiceContraryMotion,
    features: {
      rhythmicIndependenceScore: diagnostics.rhythmicIndependenceScore,
      supportTextureRepetitionScore: diagnostics.supportTextureRepetitionScore,
      expositionEntryStaggerScore: diagnostics.expositionEntryStaggerScore,
      samePitchOverlapCount: diagnostics.samePitchOverlapCount,
      unisonOverlapCount: diagnostics.unisonOverlapCount,
      sameDirectionMotionCount: diagnostics.sameDirectionMotionCount,
      fourBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperSameDirectionRatio,
      fourBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.fourBeat.bassUpperContraryRatio,
      eightBeatBassUpperSameDirectionRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperSameDirectionRatio,
      eightBeatBassUpperContraryRatio: diagnostics.pitchContourMotion.eightBeat.bassUpperContraryRatio,
      fourBeatOuterVoiceSameDirectionRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceSameDirectionRatio,
      fourBeatOuterVoiceContraryRatio: diagnostics.pitchContourMotion.fourBeat.outerVoiceContraryRatio,
      sharedRhythmOverlapCount: diagnostics.sharedRhythmOverlapCount,
      shortStrongBeatEntryNoteCount: diagnostics.shortStrongBeatEntryNoteCount,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
      allVoiceSilenceGapCount: diagnostics.allVoiceSilenceGapCount,
    },
  };
  const subjectClarity = {
    cost:
      diagnostics.subjectIdentityViolations * EVALUATION_WEIGHTS.subjectClarity.subjectIdentityViolation +
      diagnostics.answerPlanViolations * EVALUATION_WEIGHTS.subjectClarity.answerPlanViolation,
    reward:
      diagnostics.counterSubjectIdentityRetention * EVALUATION_WEIGHTS.subjectClarity.counterSubjectIdentityRetention,
    features: {
      subjectIdentityViolations: diagnostics.subjectIdentityViolations,
      answerPlanViolations: diagnostics.answerPlanViolations,
      counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
    },
  };
  const harmony = {
    cost:
      diagnostics.unresolvedDissonanceCount * EVALUATION_WEIGHTS.harmony.unresolvedDissonance +
      diagnostics.strongBeatDissonanceCount * EVALUATION_WEIGHTS.harmony.strongBeatDissonance +
      diagnostics.predominantDirectionMisses * EVALUATION_WEIGHTS.harmony.predominantDirectionMiss +
      diagnostics.unresolvedAmbiguityWarnings * EVALUATION_WEIGHTS.harmony.unresolvedAmbiguity,
    reward:
      diagnostics.controlledAmbiguityScore * EVALUATION_WEIGHTS.harmony.controlledAmbiguity +
      diagnostics.styleModulationFit * EVALUATION_WEIGHTS.harmony.styleModulationFit +
      diagnostics.harmonicFunctionMatches * EVALUATION_WEIGHTS.harmony.harmonicFunctionMatch,
    features: {
      unresolvedDissonanceCount: diagnostics.unresolvedDissonanceCount,
      predominantDirectionMisses: diagnostics.predominantDirectionMisses,
      controlledAmbiguityScore: diagnostics.controlledAmbiguityScore,
      styleModulationFit: diagnostics.styleModulationFit,
      modalContextCount: diagnostics.modalContextCount,
      modalCharacteristicToneHits: diagnostics.modalCharacteristicToneHits,
      modalCadenceHits: diagnostics.modalCadenceHits,
      tonalCadenceOveruseWarnings: diagnostics.tonalCadenceOveruseWarnings,
      entrySupportInstabilityCount: diagnostics.entrySupportInstabilityCount,
    },
  };
  const form = {
    cost: diagnostics.formRepetitionWarnings * EVALUATION_WEIGHTS.form.formRepetition,
    reward:
      diagnostics.episodeDirectionScore * EVALUATION_WEIGHTS.form.episodeDirection +
      diagnostics.strettoClarityScore * EVALUATION_WEIGHTS.form.strettoClarity,
    features: {
      formRepetitionWarnings: diagnostics.formRepetitionWarnings,
      episodeDirectionScore: diagnostics.episodeDirectionScore,
      strettoClarityScore: diagnostics.strettoClarityScore,
    },
  };
  const totalCost =
    hardFailures.length * EVALUATION_WEIGHTS.hardFailure +
    counterpoint.cost -
    counterpoint.reward +
    melody.cost -
    melody.reward +
    texture.cost -
    texture.reward +
    subjectClarity.cost -
    subjectClarity.reward +
    harmony.cost -
    harmony.reward +
    form.cost -
    form.reward;

  return {
    featureVersion: 1,
    evaluationModelVersion: 1,
    totalCost: Math.round(totalCost * 1000) / 1000,
    hardFailures,
    explanations,
    dimensions: {
      counterpoint,
      melody,
      texture,
      subjectClarity,
      harmony,
      form,
    },
  };
}

function explainCandidateFeatures(
  notes: readonly NoteEvent[],
  candidate: Exposition,
  diagnostics: ReturnType<typeof analyzeScore>,
): CandidateEvaluationExplanations {
  return {
    entries: candidate.subjectEntries.map((entry) => {
      const instability = diagnostics.entrySupportInstabilityDetails.find((detail) => sameEntry(detail, entry));
      const severeInterval = diagnostics.entrySupportSevereIntervalDetails.find((detail) => sameEntry(detail, entry));
      return {
        voice: entry.voice,
        form: entry.form,
        state: entry.state,
        startTick: entry.startTick,
        instabilityCount: instability?.instabilityCount ?? 0,
        severeIntervalCount: severeInterval?.severeIntervalCount ?? 0,
        unresolvedSevereIntervalCount: severeInterval?.unresolvedSevereIntervalCount ?? 0,
      };
    }),
    voicePairs: explainVoicePairs(notes),
    voices: VOICES.map((voice) => ({
      voice,
      leapRecoveryMisses: countLeapRecoveryMisses(notes, voice),
      repeatedPitchRunCount: countRepeatedPitchRuns(notes, voice),
    })),
    sections: candidate.sectionPlans.map((section) => ({
      state: section.state,
      startTick: section.startTick,
      durationTicks: section.durationTicks,
      cadenceKind: section.cadenceKind,
      cadenceTargetCount: section.anchors.filter((anchor) => anchor.cadenceTarget).length,
      soloTextureRisk: countSoloTextureSegments(notes, section.startTick, section.startTick + section.durationTicks),
    })),
  };
}

function sameEntry(
  left: { voice: Voice; form: PlannedEntry["form"]; state: PlannedEntry["state"]; startTick: number },
  right: PlannedEntry,
): boolean {
  return (
    left.voice === right.voice &&
    left.form === right.form &&
    left.state === right.state &&
    left.startTick === right.startTick
  );
}

function explainVoicePairs(notes: readonly NoteEvent[]): CandidateVoicePairExplanation[] {
  const checkpoints = noteCheckpoints(notes);
  const pairs: CandidateVoicePairExplanation[] = [];

  for (let leftIndex = 0; leftIndex < VOICES.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < VOICES.length; rightIndex += 1) {
      const leftVoice = VOICES[leftIndex]!;
      const rightVoice = VOICES[rightIndex]!;
      let samePitchOverlapCount = 0;
      let unisonOverlapCount = 0;
      let sharedRhythmOverlapCount = 0;
      let sameDirectionMotionCount = 0;

      for (const tick of checkpoints) {
        const left = activeNoteAt(notes, leftVoice, tick);
        const right = activeNoteAt(notes, rightVoice, tick);
        if (left === undefined || right === undefined) {
          continue;
        }
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

      for (const tick of checkpoints) {
        const leftMotion = motionAt(notes, leftVoice, tick);
        const rightMotion = motionAt(notes, rightVoice, tick);
        if (leftMotion !== 0 && leftMotion === rightMotion) {
          sameDirectionMotionCount += 1;
        }
      }

      pairs.push({
        leftVoice,
        rightVoice,
        samePitchOverlapCount,
        unisonOverlapCount,
        sharedRhythmOverlapCount,
        sameDirectionMotionCount,
      });
    }
  }

  return pairs;
}

function countLeapRecoveryMisses(notes: readonly NoteEvent[], voice: Voice): number {
  const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNotes);
  let misses = 0;

  for (let index = 1; index < voiceNotes.length - 1; index += 1) {
    const previous = voiceNotes[index - 1]!;
    const current = voiceNotes[index]!;
    const next = voiceNotes[index + 1]!;
    const leap = current.pitch - previous.pitch;
    const recovery = next.pitch - current.pitch;
    if (Math.abs(leap) >= 7 && !(Math.sign(leap) !== Math.sign(recovery) && Math.abs(recovery) <= 2)) {
      misses += 1;
    }
  }

  return misses;
}

function countRepeatedPitchRuns(notes: readonly NoteEvent[], voice: Voice): number {
  const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNotes);
  let runs = 0;
  let runStart = 0;

  for (let index = 1; index <= voiceNotes.length; index += 1) {
    const previous = voiceNotes[index - 1];
    const current = voiceNotes[index];
    if (previous !== undefined && current !== undefined && current.pitch === previous.pitch) {
      continue;
    }
    if (index - runStart >= 3) {
      runs += 1;
    }
    runStart = index;
  }

  return runs;
}

function countSoloTextureSegments(notes: readonly NoteEvent[], startTick: number, endTick: number): number {
  const checkpoints = noteCheckpoints(notes).filter((tick) => tick >= startTick && tick <= endTick);
  let segments = 0;

  for (let index = 0; index < checkpoints.length - 1; index += 1) {
    const segmentStart = checkpoints[index]!;
    const segmentEnd = checkpoints[index + 1]!;
    if (segmentEnd <= segmentStart) {
      continue;
    }
    const activeVoices = VOICES.filter((voice) =>
      notes.some(
        (note) =>
          note.voice === voice && note.startTick < segmentEnd && segmentStart < note.startTick + note.durationTicks,
      ),
    );
    if (activeVoices.length === 1 && segmentEnd - segmentStart >= TICKS_PER_QUARTER / 2) {
      segments += 1;
    }
  }

  return segments;
}

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function motionAt(notes: readonly NoteEvent[], voice: Voice, tick: number): number {
  const voiceNotes = notes.filter((note) => note.voice === voice).sort(compareNotes);
  const index = voiceNotes.findIndex((note) => note.startTick === tick);
  if (index <= 0) {
    return 0;
  }
  return Math.sign(voiceNotes[index]!.pitch - voiceNotes[index - 1]!.pitch);
}

function noteCheckpoints(notes: readonly NoteEvent[]): number[] {
  return [...new Set(notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]))].sort(
    (left, right) => left - right,
  );
}

function compareNotes(left: NoteEvent, right: NoteEvent): number {
  return left.startTick - right.startTick || left.pitch - right.pitch;
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
