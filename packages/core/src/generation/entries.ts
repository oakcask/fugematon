import type {
  AnswerKind,
  EntryForm,
  FugueState,
  HarmonicPlan,
  KeySignature,
  NoteEvent,
  PlannedEntry,
  Voice,
} from "../events.js";
import {
  beatStrengthAtTick,
  chordTonePitchClasses,
  metricalHarmonyIntentForDegree,
  nearestHarmonicAnchor,
} from "./harmony.js";
import { pitchClassForSubjectNote } from "./pitch.js";
import { placePitchInRegister, VOICE_REGISTER_TARGETS } from "./shared.js";
import type { Exposition, SubjectNote } from "./types.js";

export function addSubjectEntry(
  notes: NoteEvent[],
  subjectEntries: Exposition["subjectEntries"],
  subject: readonly SubjectNote[],
  entry: {
    state: FugueState;
    voice: Voice;
    form: EntryForm;
    startTick: number;
    globalKey: KeySignature;
    localKey: KeySignature;
    answerKind?: AnswerKind;
    harmonicPlan?: HarmonicPlan;
  },
): void {
  const plannedSubject = applyEntryPlanToSubject(subject, entry.form, entry.answerKind);
  const meterContext = entry.harmonicPlan?.meterContext;
  const plannedEntry: PlannedEntry = {
    voice: entry.voice,
    form: entry.form,
    state: entry.state,
    startTick: entry.startTick,
    globalKey: entry.globalKey,
    localKey: entry.localKey,
    answerKind: entry.answerKind,
    registerTarget: VOICE_REGISTER_TARGETS[entry.voice],
    expectedDegreePattern: plannedSubject.map((note) => note.scaleDegree),
    actualPitchClassSequence: plannedSubject.map((note) => pitchClassForSubjectNote(note, entry.localKey)),
    metricalIntentPattern: plannedSubject.map((note) => {
      const tick = entry.startTick + note.offsetTick;
      const anchor = entry.harmonicPlan === undefined ? undefined : nearestHarmonicAnchor(tick, [entry.harmonicPlan]);
      const chordTones = anchor === undefined ? [] : chordTonePitchClasses(anchor.localKey, anchor.function);
      const pitchClass = pitchClassForSubjectNote(note, entry.localKey);
      return {
        offsetTick: note.offsetTick,
        beatStrength: beatStrengthAtTick(tick, meterContext),
        scaleDegree: note.scaleDegree,
        harmonicFunction: anchor?.function ?? "tonic",
        intent: metricalHarmonyIntentForDegree({
          degree: note.scaleDegree,
          tick,
          voice: entry.voice,
          harmonicPlan: entry.harmonicPlan,
          fallbackIntent: note.metricalHarmonyIntent,
        }),
        chordTone: chordTones.includes(pitchClass),
      };
    }),
  };
  subjectEntries.push(plannedEntry);

  for (const note of plannedSubject) {
    const pitchClass = pitchClassForSubjectNote(note, entry.localKey);
    notes.push({
      kind: "note",
      voice: entry.voice,
      startTick: entry.startTick + note.offsetTick,
      durationTicks: note.durationTicks,
      pitch: placePitchInRegister(pitchClass, entry.voice, plannedEntry.registerTarget),
      velocity: entry.form === "answer" ? 86 : 92,
      role: entry.form,
      metricalHarmonyIntent: metricalHarmonyIntentForDegree({
        degree: note.scaleDegree,
        tick: entry.startTick + note.offsetTick,
        voice: entry.voice,
        harmonicPlan: entry.harmonicPlan,
        fallbackIntent: note.metricalHarmonyIntent,
      }),
    });
  }
}

export function applyEntryPlanToSubject(
  subject: readonly SubjectNote[],
  form: EntryForm,
  answerKind: AnswerKind | undefined,
): SubjectNote[] {
  if (form !== "answer" || answerKind !== "tonal") {
    return subject.map((note) => ({ ...note }));
  }

  return subject.map((note) =>
    note.importantTone && note.scaleDegree === 4
      ? { ...note, scaleDegree: 3, melodicRole: "predominant" }
      : { ...note },
  );
}

export function chooseAnswerKind(subject: readonly SubjectNote[]): AnswerKind {
  return subject.some((note) => note.importantTone && note.scaleDegree === 4) ? "tonal" : "true";
}
