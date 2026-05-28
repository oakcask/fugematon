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
type SubjectFreePlanContext = {
  index: number;
  plan: HarmonicPlan;
  endTick: number;
  cadenceWindowStartTick: number;
  cadenceWindowEndTick: number;
  nextEntryStartTick: number;
};

export function annotateEpisodeMotivicDerivations(notes: NoteEvent[], sectionPlans: readonly HarmonicPlan[]): void {
  const derivationCache = new Map<string, EpisodeMotivicDerivation>();
  forEachSubjectFreeMotivicNoteInPlan(notes, sectionPlans, (note, context) => {
    const key = motivicDerivationCacheKey(note, context);
    let derivation = derivationCache.get(key);
    if (derivation === undefined) {
      derivation = deriveMotivicPlan(note, context);
      derivationCache.set(key, derivation);
    }
    note.motivicDerivation = derivation;
  });
}

export function analyzeEpisodeMotivicDevelopment(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
): EpisodeMotivicDevelopmentSummary {
  const subjectFreeNotes = notes.filter(
    (note): note is DerivableNote => isSubjectFreeMotivicNote(note) && note.motivicDerivation !== undefined,
  );
  if (subjectFreeNotes.length === 0) {
    forEachSubjectFreeMotivicNoteInPlan(notes, sectionPlans, (note) => subjectFreeNotes.push(note));
  }
  let subjectFreeDurationTicks = 0;
  let derivedDurationTicks = 0;
  let genericFreeCounterpointDurationTicks = 0;
  let nextEntryPreparationTicks = 0;
  let cadencePreparationTicks = 0;
  const derivedNotes: DerivableNote[] = [];

  for (const note of subjectFreeNotes) {
    subjectFreeDurationTicks += note.durationTicks;
    if (note.motivicDerivation?.preparesNextEntry) {
      nextEntryPreparationTicks += note.durationTicks;
    }
    if (note.motivicDerivation?.preparesCadence) {
      cadencePreparationTicks += note.durationTicks;
    }
    if (note.motivicDerivation === undefined || note.motivicDerivation.transformationKind === "generic") {
      genericFreeCounterpointDurationTicks += note.durationTicks;
      continue;
    }
    derivedNotes.push(note);
    derivedDurationTicks += note.durationTicks;
  }

  const transformationKinds = new Set(derivedNotes.map((note) => note.motivicDerivation?.transformationKind));
  const derivedDurationShare = roundRatio(derivedDurationTicks / Math.max(1, subjectFreeDurationTicks));
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
    derivationCoverage: derivedDurationShare,
    transformationVariety: transformationKinds.size,
    sourceMotiveConcentration: roundRatio(topSourceDuration / Math.max(1, subjectFreeDurationTicks)),
    nextEntryPreparationTicks,
    cadencePreparationTicks,
    repeatedStockFormulaCount: repeatedFormulas.reduce((sum, formula) => sum + Math.max(0, formula.count - 1), 0),
    reviewRequired: genericFreeCounterpointDurationTicks > TICKS_PER_QUARTER || repeatedFormulas.length > 0,
    sourceMotiveDurations,
    transformationDurations: summarizeDerivationDurations(
      subjectFreeNotes,
      (derivation) => derivation?.transformationKind ?? "unclassified",
      subjectFreeDurationTicks,
    ),
    repeatedFormulas,
  };
}

function forEachSubjectFreeMotivicNoteInPlan(
  notes: readonly NoteEvent[],
  sectionPlans: readonly HarmonicPlan[],
  visit: (note: DerivableNote, context: SubjectFreePlanContext) => void,
): void {
  const plans = subjectFreePlanContexts(sectionPlans);
  let planIndex = 0;

  for (const note of notes) {
    if (!isSubjectFreeMotivicNote(note)) {
      continue;
    }
    while (plans[planIndex] !== undefined && note.startTick >= plans[planIndex].endTick) {
      planIndex += 1;
    }
    const context = plans[planIndex];
    if (context !== undefined && context.plan.startTick <= note.startTick && note.startTick < context.endTick) {
      visit(note, context);
    }
  }
}

function subjectFreePlanContexts(sectionPlans: readonly HarmonicPlan[]): SubjectFreePlanContext[] {
  return sectionPlans.flatMap((plan, index) => {
    if (plan.state === "exposition") {
      return [];
    }
    const cadenceTicks = plan.anchors.filter((anchor) => anchor.cadenceTarget).map((anchor) => anchor.tick);
    return [
      {
        index,
        plan,
        endTick: plan.startTick + plan.durationTicks,
        cadenceWindowStartTick: Math.min(Number.POSITIVE_INFINITY, ...cadenceTicks) - plan.meterContext.measureTicks,
        cadenceWindowEndTick: Math.max(Number.NEGATIVE_INFINITY, ...cadenceTicks) + plan.meterContext.measureTicks,
        nextEntryStartTick: plan.startTick + Math.max(plan.meterContext.beatTicks, plan.durationTicks / 2),
      },
    ];
  });
}

function deriveMotivicPlan(note: DerivableNote, context: SubjectFreePlanContext): EpisodeMotivicDerivation {
  const plan = context.plan;
  const preparesCadence = preparesCadenceForNote(note, context);
  const preparesNextEntry =
    plan.state === "episode" && !preparesCadence && note.startTick >= context.nextEntryStartTick;
  return {
    sourceMotive: sourceMotiveForNote(note, plan),
    transformationKind: transformationKindForNote(note, plan, preparesCadence),
    targetFunction: targetFunctionForPlan(plan, preparesCadence),
    sequenceDirection: sequenceDirection(plan.sequencePattern),
    preparesNextEntry,
    preparesCadence,
  };
}

function motivicDerivationCacheKey(note: DerivableNote, context: SubjectFreePlanContext): string {
  const plan = context.plan;
  const offsetTicks = note.startTick - plan.startTick;
  const position =
    offsetTicks <= plan.meterContext.measureTicks
      ? "early"
      : offsetTicks > plan.meterContext.measureTicks * 2
        ? "late"
        : "middle";
  const preparesCadence = preparesCadenceForNote(note, context);
  const preparesNextEntry =
    plan.state === "episode" && !preparesCadence && note.startTick >= context.nextEntryStartTick;

  return [
    context.index,
    note.role,
    note.metricalHarmonyIntent,
    durationClass(note.durationTicks),
    position,
    preparesCadence,
    preparesNextEntry,
  ].join("|");
}

function preparesCadenceForNote(note: DerivableNote, context: SubjectFreePlanContext): boolean {
  return context.cadenceWindowStartTick <= note.startTick && note.startTick <= context.cadenceWindowEndTick;
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
      const signature = phraseSignature(sorted, index);
      const current = formulas.get(signature) ?? {
        count: 0,
        durationTicks: 0,
        sourceMotives: new Set<string>(),
        transformationKinds: new Set<string>(),
      };
      current.count += 1;
      for (let offset = 0; offset < 6; offset += 1) {
        const note = sorted[index + offset]!;
        current.durationTicks += note.durationTicks;
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

function phraseSignature(notes: readonly DerivableNote[], startIndex: number): string {
  let contour = "";
  let durations = "";
  for (let offset = 0; offset < 6; offset += 1) {
    const note = notes[startIndex + offset]!;
    durations += durationClass(note.durationTicks);
    if (offset > 0) {
      contour += contourStep(note.pitch, notes[startIndex + offset - 1]!.pitch);
    }
  }
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
