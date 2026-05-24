import type { HarmonicPlan, NoteEvent, PlannedEntry, QualityVector } from "../events.js";
import { analyzeHarmonicSonorities } from "./harmonic-sonority-review.js";
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
  summarizeScoreBeautyEvidence,
  summarizeSopranoRepeatedNotePressure,
} from "./quality-vector-summary.js";
import {
  summarizeVoicePairFunctions,
  summarizeVoicePairSpans,
  summarizeVoicePairUnisons,
} from "./quality-vector-voice-pairs.js";

export function analyzeQualityVector(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): QualityVector {
  const voicePairUnisons = summarizeVoicePairUnisons(notes, sectionPlans);
  const voicePairFunctions = summarizeVoicePairFunctions(notes, sectionPlans);
  const voicePairSpans = summarizeVoicePairSpans(notes, sectionPlans);
  const sopranoRepeatedNotePressure = summarizeSopranoRepeatedNotePressure(notes);
  const entrySevereIntervals = summarizeEntrySevereIntervalDurations(notes, subjectEntries);
  const entrySonorities = summarizeEntrySonorities(notes, subjectEntries);
  const entryFormulaRecurrences = summarizeEntryFormulaRecurrences(entrySonorities);
  const fragmentFunctionEvidence = summarizeFragmentFunctionEvidence(sectionPlans);
  const counterSubjectWindows = summarizeCounterSubjectWindows(notes, subjectEntries);
  const harmonicSonorities = analyzeHarmonicSonorities(notes, sectionPlans);
  const localSentinels = summarizeLocalSentinels(
    voicePairUnisons,
    voicePairSpans,
    sopranoRepeatedNotePressure,
    entrySevereIntervals,
    sectionPlans,
  );
  const scoreBeautyEvidence = summarizeScoreBeautyEvidence({
    entryFormulaRecurrences,
    voicePairSpans,
    fragmentFunctionEvidence,
    counterSubjectWindows,
  });

  return {
    schemaVersion: 5,
    modelVersion: 5,
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
    harmonicSonorities,
    metricExplanations: summarizeMetricExplanations(
      voicePairUnisons,
      voicePairFunctions,
      entrySevereIntervals,
      entrySonorities,
      sectionPlans,
    ),
    scoreBeautyEvidence,
    localSentinels,
  };
}
