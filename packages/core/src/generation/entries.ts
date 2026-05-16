import type { AnswerKind, EntryForm, FugueState, KeySignature, NoteEvent, PlannedEntry, Voice } from "../events.js";
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
  },
): void {
  const plannedSubject = applyEntryPlanToSubject(subject, entry.form, entry.answerKind);
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
