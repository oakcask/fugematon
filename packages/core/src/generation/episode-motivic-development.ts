import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  EpisodeMotiveSource,
  EpisodeMotivicDerivation,
  EpisodeMotivicDevelopmentSummary,
  EpisodeTransformationKind,
  HarmonicPlan,
  NoteEvent,
  SequencePattern,
} from "../events.js";

type DerivableNote = NoteEvent & { role: "free-counterpoint" | "counter-subject" };

export function annotateEpisodeMotivicDerivations(notes: NoteEvent[], sectionPlans: readonly HarmonicPlan[]): void {
  for (const note of notes) {
    if (!isSubjectFreeMotivicNote(note)) {
      continue;
    }
    const plan = containingSubjectFreePlan(note, sectionPlans);
    if (plan === undefined) {
      continue;
    }
    note.motivicDerivation = deriveMotivicPlan(note, plan);
  }
}

export function analyzeEpisodeMotivicDevelopment(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): EpisodeMotivicDevelopmentSummary {
  const subjectFreeNotes = notes
    .filter((note): note is DerivableNote => isSubjectFreeMotivicNote(note))
    .filter((note) => containingSubjectFreePlan(note, sectionPlans) !== undefined);
  const subjectFreeDurationTicks = subjectFreeNotes.reduce((sum, note) => sum + note.durationTicks, 0);
  const derivedNotes = subjectFreeNotes.filter(
    (note) => note.motivicDerivation !== undefined && note.motivicDerivation.transformationKind !== "generic",
  );
  const derivedDurationTicks = derivedNotes.reduce((sum, note) => sum + note.durationTicks, 0);
  const genericFreeCounterpointDurationTicks = subjectFreeNotes
    .filter((note) => note.motivicDerivation === undefined || note.motivicDerivation.transformationKind === "generic")
    .reduce((sum, note) => sum + note.durationTicks, 0);
  const transformationDurations = summarizeDerivationDurations(
    subjectFreeNotes,
    (derivation) => derivation?.transformationKind ?? "unclassified",
    subjectFreeDurationTicks,
  );
  const sourceMotiveDurations = summarizeDerivationDurations(
    subjectFreeNotes,
    (derivation) => derivation?.sourceMotive ?? "unclassified",
    subjectFreeDurationTicks,
  );
  const repeatedFormulas = repeatedEpisodeFormulas(subjectFreeNotes);
  const topSourceDuration = Math.max(0, ...sourceMotiveDurations.map((duration) => duration.durationTicks));

  return {
    schemaVersion: 1,
    subjectFreeDurationTicks,
    derivedDurationTicks,
    genericFreeCounterpointDurationTicks,
    derivationCoverage: roundRatio(derivedDurationTicks / Math.max(1, subjectFreeDurationTicks)),
    transformationVariety: new Set(derivedNotes.map((note) => note.motivicDerivation?.transformationKind)).size,
    sourceMotiveConcentration: roundRatio(topSourceDuration / Math.max(1, subjectFreeDurationTicks)),
    nextEntryPreparationTicks: subjectFreeNotes
      .filter((note) => note.motivicDerivation?.preparesNextEntry)
      .reduce((sum, note) => sum + note.durationTicks, 0),
    cadencePreparationTicks: subjectFreeNotes
      .filter((note) => note.motivicDerivation?.preparesCadence)
      .reduce((sum, note) => sum + note.durationTicks, 0),
    repeatedStockFormulaCount: repeatedFormulas.reduce((sum, formula) => sum + Math.max(0, formula.count - 1), 0),
    reviewRequired: genericFreeCounterpointDurationTicks > TICKS_PER_QUARTER || repeatedFormulas.length > 0,
    sourceMotiveDurations,
    transformationDurations,
    repeatedFormulas,
  };
}

function deriveMotivicPlan(note: DerivableNote, plan: HarmonicPlan): EpisodeMotivicDerivation {
  const preparesCadence = plan.anchors.some(
    (anchor) => anchor.cadenceTarget && Math.abs(anchor.tick - note.startTick) <= plan.meterContext.measureTicks,
  );
  const preparesNextEntry =
    plan.state === "episode" &&
    !preparesCadence &&
    note.startTick >= plan.startTick + Math.max(plan.meterContext.beatTicks, plan.durationTicks / 2);
  return {
    sourceMotive: sourceMotiveForNote(note, plan),
    transformationKind: transformationKindForNote(note, plan, preparesCadence),
    targetFunction: targetFunctionForPlan(plan, preparesCadence),
    sequenceDirection: sequenceDirection(plan.sequencePattern),
    preparesNextEntry,
    preparesCadence,
  };
}

function sourceMotiveForNote(note: DerivableNote, plan: HarmonicPlan): EpisodeMotiveSource {
  if (plan.cadenceKind === "authentic" || plan.cadenceKind === "modal") {
    return "cadence-figure";
  }
  if (plan.fragmentTransform === "inversion") {
    return "subject-tail";
  }
  if (plan.sequencePattern === "circle-fifths") {
    return "answer-form";
  }
  if (note.role === "counter-subject") {
    return note.startTick - plan.startTick <= plan.meterContext.measureTicks
      ? "counter-subject-head"
      : "counter-subject-tail";
  }
  if (note.startTick - plan.startTick > plan.meterContext.measureTicks * 2) {
    return "prior-episode-figure";
  }
  return note.startTick - plan.startTick <= plan.meterContext.measureTicks ? "subject-head" : "counter-subject-tail";
}

function transformationKindForNote(
  note: DerivableNote,
  plan: HarmonicPlan,
  preparesCadence: boolean,
): EpisodeTransformationKind {
  if (preparesCadence || note.metricalHarmonyIntent === "structural-root-support") {
    return "cadential-continuation";
  }
  if (plan.fragmentTransform === "inversion") {
    return "inversion";
  }
  if (plan.fragmentTransform === "sequence" || plan.sequencePattern !== undefined) {
    return "sequence";
  }
  if (plan.fragmentTransform === "contrary-motion") {
    return "contour-paraphrase";
  }
  if (note.durationTicks <= TICKS_PER_QUARTER / 2) {
    return "diminution";
  }
  if (note.durationTicks >= TICKS_PER_QUARTER * 2) {
    return "augmentation";
  }
  if (note.role === "counter-subject") {
    return "imitation";
  }
  if (note.metricalHarmonyIntent === "weak-passing-tone" || note.metricalHarmonyIntent === "weak-neighbor-tone") {
    return "fragmentation";
  }
  return "rhythmic-paraphrase";
}

function targetFunctionForPlan(
  plan: HarmonicPlan,
  preparesCadence: boolean,
): EpisodeMotivicDerivation["targetFunction"] {
  if (preparesCadence || plan.cadenceKind === "authentic" || plan.cadenceKind === "modal") {
    return "extend-cadence";
  }
  if (plan.ambiguityIntent === "pivot-harmony" || plan.departureKey.tonic !== plan.targetKey.tonic) {
    return "modulate-local-key";
  }
  if (plan.state === "stretto-like") {
    return "relax-after-density";
  }
  if (plan.state === "subject-return") {
    return "prepare-subject-return";
  }
  if (plan.durationTicks <= plan.meterContext.measureTicks * 2) {
    return "connect-exposition-entries";
  }
  return "maintain-pedal-or-suspension";
}

function sequenceDirection(
  sequencePattern: SequencePattern | undefined,
): EpisodeMotivicDerivation["sequenceDirection"] {
  if (sequencePattern === "ascending-step") {
    return "ascending";
  }
  if (sequencePattern === "descending-step") {
    return "descending";
  }
  if (sequencePattern === "circle-fifths") {
    return "circle";
  }
  if (sequencePattern === "parallel-shift") {
    return "parallel";
  }
  return "none";
}

function containingSubjectFreePlan(note: NoteEvent, sectionPlans: readonly HarmonicPlan[]): HarmonicPlan | undefined {
  return sectionPlans.find(
    (plan) =>
      plan.state !== "exposition" &&
      plan.startTick <= note.startTick &&
      note.startTick < plan.startTick + plan.durationTicks,
  );
}

function isSubjectFreeMotivicNote(note: NoteEvent): note is DerivableNote {
  return note.role === "free-counterpoint" || note.role === "counter-subject";
}

function summarizeDerivationDurations(
  notes: readonly DerivableNote[],
  keyFor: (derivation: EpisodeMotivicDerivation | undefined) => string,
  totalDurationTicks: number,
): EpisodeMotivicDevelopmentSummary["sourceMotiveDurations"] {
  const durations = new Map<string, number>();
  for (const note of notes) {
    const key = keyFor(note.motivicDerivation);
    durations.set(key, (durations.get(key) ?? 0) + note.durationTicks);
  }
  return [...durations.entries()]
    .map(([key, durationTicks]) => ({
      key,
      durationTicks,
      share: roundRatio(durationTicks / Math.max(1, totalDurationTicks)),
    }))
    .sort((left, right) => right.durationTicks - left.durationTicks || left.key.localeCompare(right.key));
}

function repeatedEpisodeFormulas(
  notes: readonly DerivableNote[],
): EpisodeMotivicDevelopmentSummary["repeatedFormulas"] {
  const byVoice = new Map<NoteEvent["voice"], DerivableNote[]>();
  for (const note of notes) {
    const voiceNotes = byVoice.get(note.voice) ?? [];
    voiceNotes.push(note);
    byVoice.set(note.voice, voiceNotes);
  }

  const formulas = new Map<
    string,
    { count: number; durationTicks: number; sourceMotives: Set<string>; transformationKinds: Set<string> }
  >();
  for (const voiceNotes of byVoice.values()) {
    const sorted = [...voiceNotes].sort((left, right) => left.startTick - right.startTick);
    for (let index = 0; index + 5 < sorted.length; index += 1) {
      const phrase = sorted.slice(index, index + 6);
      const signature = phraseSignature(phrase);
      const current = formulas.get(signature) ?? {
        count: 0,
        durationTicks: 0,
        sourceMotives: new Set<string>(),
        transformationKinds: new Set<string>(),
      };
      current.count += 1;
      current.durationTicks += phrase.reduce((sum, note) => sum + note.durationTicks, 0);
      for (const note of phrase) {
        current.sourceMotives.add(note.motivicDerivation?.sourceMotive ?? "unclassified");
        current.transformationKinds.add(note.motivicDerivation?.transformationKind ?? "unclassified");
      }
      formulas.set(signature, current);
    }
  }

  return [...formulas.entries()]
    .filter(([, formula]) => formula.count > 3)
    .map(([signature, formula]) => ({
      signature,
      count: formula.count,
      durationTicks: formula.durationTicks,
      sourceMotive: summarizedSourceMotive(formula.sourceMotives),
      transformationKind: summarizedTransformationKind(formula.transformationKinds),
    }))
    .sort((left, right) => right.count - left.count || left.signature.localeCompare(right.signature))
    .slice(0, 8);
}

function phraseSignature(notes: readonly DerivableNote[]): string {
  const contour = notes
    .slice(1)
    .map((note, index) => contourStep(note.pitch, notes[index]?.pitch ?? note.pitch))
    .join("");
  const durations = notes.map((note) => durationClass(note.durationTicks)).join("");
  return `${contour}|${durations}`;
}

function contourStep(currentPitch: number, previousPitch: number): "u" | "d" | "r" {
  if (currentPitch > previousPitch) {
    return "u";
  }
  if (currentPitch < previousPitch) {
    return "d";
  }
  return "r";
}

function durationClass(durationTicks: number): "e" | "q" | "l" {
  if (durationTicks <= TICKS_PER_QUARTER / 2) {
    return "e";
  }
  if (durationTicks <= TICKS_PER_QUARTER) {
    return "q";
  }
  return "l";
}

function summarizedSourceMotive(
  values: ReadonlySet<string>,
): EpisodeMotivicDevelopmentSummary["repeatedFormulas"][number]["sourceMotive"] {
  if (values.size === 1) {
    return [...values][0]! as EpisodeMotivicDevelopmentSummary["repeatedFormulas"][number]["sourceMotive"];
  }
  return "mixed";
}

function summarizedTransformationKind(
  values: ReadonlySet<string>,
): EpisodeMotivicDevelopmentSummary["repeatedFormulas"][number]["transformationKind"] {
  if (values.size === 1) {
    return [...values][0]! as EpisodeMotivicDevelopmentSummary["repeatedFormulas"][number]["transformationKind"];
  }
  return "mixed";
}

function roundRatio(value: number): number {
  return Math.round(value * 1000) / 1000;
}
