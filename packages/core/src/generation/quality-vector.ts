import type { HarmonicPlan, NoteEvent, Phase13QualityVector, PlannedEntry } from "../events.js";
import {
  summarizeEntryFormulaRecurrences,
  summarizeEntrySevereIntervalDurations,
  summarizeEntrySonorities,
} from "./quality-vector-entry-windows.js";
import {
  summarizeCounterSubjectWindows,
  summarizeFragmentFunctionEvidence,
} from "./quality-vector-subject-material.js";
import {
  summarizeAxes,
  summarizeLocalSentinels,
  summarizeMetricExplanations,
  summarizeSopranoRepeatedNotePressure,
} from "./quality-vector-summary.js";
import {
  summarizeVoicePairFunctions,
  summarizeVoicePairSpans,
  summarizeVoicePairUnisons,
} from "./quality-vector-voice-pairs.js";

export function analyzePhase13QualityVector(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): Phase13QualityVector {
  const voicePairUnisons = summarizeVoicePairUnisons(notes, sectionPlans);
  const voicePairFunctions = summarizeVoicePairFunctions(notes, sectionPlans);
  const voicePairSpans = summarizeVoicePairSpans(notes, sectionPlans);
  const sopranoRepeatedNotePressure = summarizeSopranoRepeatedNotePressure(notes);
  const entrySevereIntervals = summarizeEntrySevereIntervalDurations(notes, subjectEntries);
  const entrySonorities = summarizeEntrySonorities(notes, subjectEntries);
  const entryFormulaRecurrences = summarizeEntryFormulaRecurrences(entrySonorities);
  const fragmentFunctionEvidence = summarizeFragmentFunctionEvidence(sectionPlans);
  const counterSubjectWindows = summarizeCounterSubjectWindows(notes, subjectEntries);
  const localSentinels = summarizeLocalSentinels(
    voicePairUnisons,
    voicePairSpans,
    sopranoRepeatedNotePressure,
    entrySevereIntervals,
    sectionPlans,
  );

  return {
    schemaVersion: 3,
    modelVersion: 3,
    axes: summarizeAxes(voicePairUnisons, sopranoRepeatedNotePressure, entrySevereIntervals),
    voicePairUnisons,
    voicePairFunctions,
    voicePairSpans,
    sopranoRepeatedNotePressure,
    entrySevereIntervals,
    entrySonorities,
    entryFormulaRecurrences,
    fragmentFunctionEvidence,
    counterSubjectWindows,
    metricExplanations: summarizeMetricExplanations(
      voicePairUnisons,
      voicePairFunctions,
      entrySevereIntervals,
      entrySonorities,
      sectionPlans,
    ),
    localSentinels,
  };
}
