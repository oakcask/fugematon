import type { EntryForm, Voice } from "@fugematon/core";
import type { NormalizedCadence, NormalizedEntry, NormalizedNote, NormalizedSection } from "./types.js";

const VOICES: readonly Voice[] = ["soprano", "alto", "tenor", "bass"];
const SUBJECT_NOTE_COUNT = 8;

export function inferReferenceAnnotations(input: {
  notes: readonly NormalizedNote[];
  lengthTicks: number;
  ticksPerQuarter: number;
}): { entries: NormalizedEntry[]; sections: NormalizedSection[]; cadences: NormalizedCadence[] } {
  const subject = findInitialSubject(input.notes);
  const entries = subject === undefined ? [] : findEntries(input.notes, subject, input.ticksPerQuarter);
  return {
    entries,
    sections: inferSections(entries, input.lengthTicks),
    cadences: [
      {
        id: "cadence-terminal-inferred",
        tick: input.lengthTicks,
        provenance: { source: "inferred", confidence: 0.2 },
      },
    ],
  };
}

type SubjectPattern = {
  voice: Voice;
  notes: readonly NormalizedNote[];
  intervals: readonly number[];
  durationRatios: readonly number[];
  span: number;
};

function findInitialSubject(notes: readonly NormalizedNote[]): SubjectPattern | undefined {
  const firstByVoice = VOICES.map((voice) => notes.filter((note) => note.voice === voice)).filter(
    (voiceNotes) => voiceNotes.length >= SUBJECT_NOTE_COUNT,
  );
  firstByVoice.sort(
    (a, b) => a[0]!.startTick - b[0]!.startTick || VOICES.indexOf(a[0]!.voice) - VOICES.indexOf(b[0]!.voice),
  );
  const subjectNotes = firstByVoice[0]?.slice(0, SUBJECT_NOTE_COUNT);
  if (subjectNotes === undefined || subjectNotes.length < SUBJECT_NOTE_COUNT) return undefined;
  const firstDuration = subjectNotes[0]!.durationTicks;
  return {
    voice: subjectNotes[0]!.voice,
    notes: subjectNotes,
    intervals: subjectNotes.slice(1).map((note, index) => note.pitch - subjectNotes[index]!.pitch),
    durationRatios: subjectNotes.map((note) => note.durationTicks / firstDuration),
    span: noteEnd(subjectNotes.at(-1)!) - subjectNotes[0]!.startTick,
  };
}

function findEntries(
  notes: readonly NormalizedNote[],
  subject: SubjectPattern,
  ticksPerQuarter: number,
): NormalizedEntry[] {
  const candidates: Array<NormalizedEntry & { score: number }> = [];
  for (const voice of VOICES) {
    const voiceNotes = notes.filter((note) => note.voice === voice);
    for (let index = 0; index <= voiceNotes.length - SUBJECT_NOTE_COUNT; index += 1) {
      const window = voiceNotes.slice(index, index + SUBJECT_NOTE_COUNT);
      const intervalMatches = subject.intervals.filter(
        (interval, intervalIndex) =>
          Math.abs(interval - (window[intervalIndex + 1]!.pitch - window[intervalIndex]!.pitch)) <= 1,
      ).length;
      const baseDuration = window[0]!.durationTicks;
      const rhythmMatches = subject.durationRatios.filter(
        (ratio, durationIndex) => Math.abs(ratio - window[durationIndex]!.durationTicks / baseDuration) <= 0.25,
      ).length;
      const intervalScore = intervalMatches / subject.intervals.length;
      const rhythmScore = rhythmMatches / subject.durationRatios.length;
      const score = intervalScore * 0.75 + rhythmScore * 0.25;
      if (score < 0.78) continue;
      const transposition = window[0]!.pitch - subject.notes[0]!.pitch;
      candidates.push({
        id: "",
        voice,
        startTick: window[0]!.startTick,
        endTick: noteEnd(window.at(-1)!),
        form: classifyForm(transposition),
        provenance: { source: "inferred", confidence: roundConfidence(0.3 + score * 0.35) },
        score,
      });
    }
  }
  const selected: typeof candidates = [];
  for (const candidate of candidates.sort((a, b) => a.startTick - b.startTick || b.score - a.score)) {
    const overlaps = selected.some(
      (entry) =>
        entry.voice === candidate.voice &&
        Math.abs(entry.startTick - candidate.startTick) < Math.max(subject.span / 2, ticksPerQuarter),
    );
    if (!overlaps) selected.push(candidate);
  }
  return selected.map(({ score: _score, ...entry }, index) => ({ ...entry, id: `entry-${index + 1}` }));
}

function inferSections(entries: readonly NormalizedEntry[], lengthTicks: number): NormalizedSection[] {
  if (entries.length === 0) {
    return [section("section-1", 0, lengthTicks, "exposition", 0.1)];
  }
  const firstByVoice = VOICES.map((voice) => entries.find((entry) => entry.voice === voice)).filter(
    (entry): entry is NormalizedEntry => entry !== undefined,
  );
  const expositionEnd = Math.min(lengthTicks, Math.max(...firstByVoice.map((entry) => entry.endTick)));
  const laterEntry = entries.find((entry) => entry.startTick >= expositionEnd);
  if (laterEntry === undefined || expositionEnd >= lengthTicks) {
    return [section("section-1", 0, lengthTicks, "exposition", 0.25)];
  }
  const sections: NormalizedSection[] = [section("section-1", 0, expositionEnd, "exposition", 0.35)];
  if (laterEntry.startTick > expositionEnd) {
    sections.push(section(`section-${sections.length + 1}`, expositionEnd, laterEntry.startTick, "episode", 0.25));
  }
  sections.push(section(`section-${sections.length + 1}`, laterEntry.startTick, lengthTicks, "subject-return", 0.25));
  return sections;
}

function section(
  id: string,
  startTick: number,
  endTick: number,
  role: NormalizedSection["role"],
  confidence: number,
): NormalizedSection {
  return { id, startTick, endTick, role, provenance: { source: "inferred", confidence } };
}

function classifyForm(transposition: number): EntryForm {
  const pitchClass = ((transposition % 12) + 12) % 12;
  return pitchClass === 5 || pitchClass === 7 ? "answer" : "subject";
}

function noteEnd(note: NormalizedNote): number {
  return note.startTick + note.durationTicks;
}

function roundConfidence(value: number): number {
  return Math.round(value * 1000) / 1000;
}
