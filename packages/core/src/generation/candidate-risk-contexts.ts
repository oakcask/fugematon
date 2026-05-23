import { TICKS_PER_QUARTER, VOICES } from "../constants.js";
import type {
  CandidateEvaluationExplanations,
  CandidateSectionExplanation,
  CandidateVoiceExplanation,
  CandidateVoicePairExplanation,
  HarmonicPlan,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import type { analyzeScore } from "./diagnostics.js";
import type { Exposition } from "./types.js";

type CandidateDiagnostics = ReturnType<typeof analyzeScore>;

export type EntryIntervalSupportRiskContext = {
  entries: CandidateEvaluationExplanations["entries"];
};

export type VoicePairIndependenceRiskContext = {
  voicePairs: CandidateVoicePairExplanation[];
};

export type VoicePhraseRiskContext = {
  voices: CandidateVoiceExplanation[];
};

export type SubjectIdentityRiskContext = {
  subjectIdentityViolations: number;
  answerPlanViolations: number;
  counterSubjectIdentityRetention: number;
};

export type SectionFormTextureRiskContext = {
  sections: CandidateSectionExplanation[];
};

export type CandidateRiskContexts = {
  entryIntervalSupport: EntryIntervalSupportRiskContext;
  voicePairIndependence: VoicePairIndependenceRiskContext;
  voicePhrase: VoicePhraseRiskContext;
  subjectIdentity: SubjectIdentityRiskContext;
  sectionFormTexture: SectionFormTextureRiskContext;
};

export function buildCandidateRiskContexts(
  notes: readonly NoteEvent[],
  candidate: Exposition,
  diagnostics: CandidateDiagnostics,
): CandidateRiskContexts {
  return {
    entryIntervalSupport: buildEntryIntervalSupportRisk(candidate.subjectEntries, diagnostics),
    voicePairIndependence: buildVoicePairIndependenceRisk(notes),
    voicePhrase: buildVoicePhraseRisk(notes),
    subjectIdentity: buildSubjectIdentityRisk(diagnostics),
    sectionFormTexture: buildSectionFormTextureRisk(notes, candidate.sectionPlans),
  };
}

export function explainCandidateRiskContexts(contexts: CandidateRiskContexts): CandidateEvaluationExplanations {
  return {
    entries: contexts.entryIntervalSupport.entries,
    voicePairs: contexts.voicePairIndependence.voicePairs,
    voices: contexts.voicePhrase.voices,
    sections: contexts.sectionFormTexture.sections,
  };
}

function buildEntryIntervalSupportRisk(
  subjectEntries: readonly PlannedEntry[],
  diagnostics: CandidateDiagnostics,
): EntryIntervalSupportRiskContext {
  return {
    entries: subjectEntries.map((entry) => {
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
  };
}

function buildVoicePairIndependenceRisk(notes: readonly NoteEvent[]): VoicePairIndependenceRiskContext {
  return { voicePairs: explainVoicePairs(notes) };
}

function buildVoicePhraseRisk(notes: readonly NoteEvent[]): VoicePhraseRiskContext {
  return {
    voices: VOICES.map((voice) => ({
      voice,
      leapRecoveryMisses: countLeapRecoveryMisses(notes, voice),
      repeatedPitchRunCount: countRepeatedPitchRuns(notes, voice),
    })),
  };
}

function buildSubjectIdentityRisk(diagnostics: CandidateDiagnostics): SubjectIdentityRiskContext {
  return {
    subjectIdentityViolations: diagnostics.subjectIdentityViolations,
    answerPlanViolations: diagnostics.answerPlanViolations,
    counterSubjectIdentityRetention: diagnostics.counterSubjectIdentityRetention,
  };
}

function buildSectionFormTextureRisk(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): SectionFormTextureRiskContext {
  return {
    sections: sectionPlans.map((section) => ({
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
