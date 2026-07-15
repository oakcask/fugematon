import { TICKS_PER_QUARTER, VOICES } from "../constants.js";
import type {
  ConstraintSatisfactionReviewSummary,
  FugueState,
  HarmonicAnchor,
  HarmonicPlan,
  IntentionalRestReason,
  NoteEvent,
  PlannedEntry,
  SectionConstraintDensityClassification,
  SectionConstraintInfeasibleCounts,
  SectionConstraintMetricalBoundaryClassification,
  SectionConstraintRelaxationLevel,
  SectionConstraintRestSpan,
  SectionConstraintSatisfactionWindow,
  SectionConstraintScoringProfileId,
  SectionConstraintSilentRun,
  SectionConstraintStructuralSupportClassification,
  Voice,
} from "../events.js";
import { analyzeDissonanceTriage } from "./dissonance-triage.js";
import { assessHarmonicSonority, hasSupportRole, isMixedEntryTexture } from "./harmonic-sonority-review.js";
import { chordTonePitchClasses, rootDegreeForFunction } from "./harmony.js";
import { beatStrengthAtTick, isCompoundMidpoint, isMeasureDownbeat, previousMeasureDownbeat } from "./meter.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { classifyVoicePairSpan } from "./quality-vector-voice-pairs.js";
import {
  resolveSectionConstraintScoringProfile,
  sectionConstraintSoftCostFromCounts,
} from "./section-constraint-scoring.js";
import { compareNoteEvents, positiveModulo, VOICE_ENTRY_ORDER } from "./shared.js";

export const INTENTIONAL_REST_REASONS = [
  "cadence-breath",
  "entry-handoff-delay",
  "register-relief",
  "suspension-resolution",
  "pedal-thinning",
] as const satisfies readonly IntentionalRestReason[];

export type SectionConstraintSlotValue =
  | {
      kind: "note";
      pitch: number;
      noteStartTick: number;
      noteEndTick: number;
    }
  | {
      kind: "hold";
      pitch: number;
      noteStartTick: number;
      noteEndTick: number;
    }
  | {
      kind: "intentional-rest";
      reason: IntentionalRestReason | string;
    };

export type SectionConstraintSlot = {
  voice: Voice;
  startTick: number;
  endTick: number;
  value?: SectionConstraintSlotValue;
};

export type SectionConstraintProblem = {
  schemaVersion: 1;
  window: {
    startTick: number;
    endTick: number;
    state: FugueState | "unplanned";
  };
  slots: SectionConstraintSlot[];
};

export function isAllowedIntentionalRestReason(reason: string): reason is IntentionalRestReason {
  return (INTENTIONAL_REST_REASONS as readonly string[]).includes(reason);
}

export function buildSectionConstraintProblem(input: {
  notes: readonly NoteEvent[];
  sectionPlan: HarmonicPlan;
  subjectEntries?: readonly PlannedEntry[];
  gridTicks?: number;
  intentionalRests?: readonly SectionConstraintRestSpan[];
}): SectionConstraintProblem {
  const gridTicks = input.gridTicks ?? input.sectionPlan.meterContext.beatTicks ?? TICKS_PER_QUARTER;
  const sectionStartTick = input.sectionPlan.startTick;
  const sectionEndTick = input.sectionPlan.startTick + input.sectionPlan.durationTicks;
  const slots: SectionConstraintSlot[] = [];

  for (let startTick = sectionStartTick; startTick < sectionEndTick; startTick += gridTicks) {
    const endTick = Math.min(sectionEndTick, startTick + gridTicks);
    for (const voice of VOICES) {
      const active = activeNoteAt(input.notes, voice, startTick);
      const explicitRest = input.intentionalRests?.find(
        (rest) => rest.voice === voice && rest.startTick <= startTick && endTick <= rest.endTick,
      );
      const inferredReason =
        explicitRest?.reason ??
        (active === undefined
          ? inferIntentionalRestReason({
              voice,
              startTick,
              endTick,
              notes: input.notes,
              sectionPlan: input.sectionPlan,
              subjectEntries: input.subjectEntries ?? [],
            })
          : undefined);

      slots.push({
        voice,
        startTick,
        endTick,
        value:
          active !== undefined
            ? {
                kind: active.startTick === startTick ? "note" : "hold",
                pitch: active.pitch,
                noteStartTick: active.startTick,
                noteEndTick: active.startTick + active.durationTicks,
              }
            : inferredReason === undefined
              ? undefined
              : { kind: "intentional-rest", reason: inferredReason },
      });
    }
  }

  normalizeUnsupportedCollectiveRests(slots, input.notes, input.sectionPlan, input.subjectEntries ?? []);

  return {
    schemaVersion: 1,
    window: {
      startTick: sectionStartTick,
      endTick: sectionEndTick,
      state: input.sectionPlan.state,
    },
    slots,
  };
}

export function evaluateSectionConstraintProblem(input: {
  problem: SectionConstraintProblem;
  notes: readonly NoteEvent[];
  sectionPlan: HarmonicPlan;
  subjectEntries?: readonly PlannedEntry[];
  includeClassifications?: boolean;
}): SectionConstraintSatisfactionWindow {
  const gridTicks = inferGridTicks(input.problem);
  const infeasibleConstraintCounts = emptyInfeasibleCounts();
  const intentionalRestSpans = mergeIntentionalRestSpans(input.problem.slots, input.sectionPlan.state);
  const unplannedSilentRuns = mergeSilentRuns(input.problem.slots, input.sectionPlan.state);
  const slotTicks = uniqueSlotStartTicks(input.problem.slots);
  const densityClassifications: SectionConstraintDensityClassification[] = [];
  const structuralSupportClassifications: SectionConstraintStructuralSupportClassification[] = [];
  const metricalBoundary = evaluateMetricalBoundary({
    notes: input.notes,
    sectionPlan: input.sectionPlan,
    subjectEntries: input.subjectEntries ?? [],
  });
  addEntryConstraintCounts(infeasibleConstraintCounts, input);
  addVoicePairPressureCounts(infeasibleConstraintCounts, input.notes, input.sectionPlan, input.problem, gridTicks);
  addUpperLineAgencyCounts(
    infeasibleConstraintCounts,
    input.notes,
    input.sectionPlan,
    input.problem,
    gridTicks,
    input.subjectEntries ?? [],
  );
  addLeapToSilenceCounts(infeasibleConstraintCounts, input.notes, input.problem);
  addSustainedSevereVerticalDissonanceCounts(infeasibleConstraintCounts, input.notes, input.sectionPlan);
  let minActiveVoices = Number.POSITIVE_INFINITY;
  let maxActiveVoices = 0;

  for (const slot of input.problem.slots) {
    if (slot.value?.kind === "intentional-rest" && !isAllowedIntentionalRestReason(slot.value.reason)) {
      infeasibleConstraintCounts.invalidIntentionalRestReason += 1;
    }
  }

  for (const tick of slotTicks) {
    const activeNotes = activeNotesAt(input.notes, tick);
    const activeVoiceCount = new Set(activeNotes.map((note) => note.voice)).size;
    const minRequired = minActiveVoicesForSlot(input.sectionPlan, tick, activeNotes);
    minActiveVoices = Math.min(minActiveVoices, activeVoiceCount);
    maxActiveVoices = Math.max(maxActiveVoices, activeVoiceCount);
    const densityClassification = classifyDensityWindow(input.problem.slots, tick, activeVoiceCount, minRequired);
    if (densityClassification !== undefined && input.includeClassifications !== false) {
      densityClassifications.push(densityClassification);
    }
    const unsupportedDensity = densityClassification?.response === "generator-response-required";

    if (activeVoiceCount === 0) {
      infeasibleConstraintCounts.allVoiceSilence += 1;
    }
    if (activeVoiceCount === 1 && unsupportedDensity) {
      infeasibleConstraintCounts.unsupportedSolo += 1;
    }
    if (activeVoiceCount < minRequired && unsupportedDensity) {
      infeasibleConstraintCounts.minActiveVoiceViolation += 1;
    }
  }

  for (const run of unplannedSilentRuns) {
    const collapsesTexture = slotTicks
      .filter((tick) => run.startTick <= tick && tick < run.endTick)
      .some((tick) => {
        const activeNotes = activeNotesAt(input.notes, tick);
        const activeVoiceCount = new Set(activeNotes.map((note) => note.voice)).size;
        const minRequired = minActiveVoicesForSlot(input.sectionPlan, tick, activeNotes);
        return (
          activeVoiceCount < minRequired &&
          classifyDensityWindow(input.problem.slots, tick, activeVoiceCount, minRequired)?.response ===
            "generator-response-required"
        );
      });
    if (
      !run.planned &&
      run.durationTicks > TICKS_PER_QUARTER * 2 &&
      !isCadentialTick(input.sectionPlan, run.startTick) &&
      infeasibleConstraintCounts.minActiveVoiceViolation > 0 &&
      collapsesTexture
    ) {
      infeasibleConstraintCounts.longUnplannedSilentRun += 1;
    }
  }

  for (const anchor of input.sectionPlan.anchors) {
    if (anchor.tick < input.problem.window.startTick || anchor.tick >= input.problem.window.endTick) {
      continue;
    }
    const activeNotes = activeNotesAt(input.notes, anchor.tick);
    const chordTonePitchClassesForAnchor = chordTonePitchClasses(anchor.localKey, anchor.function);
    const hasChordSupport = activeNotes.some((note) =>
      chordTonePitchClassesForAnchor.includes(positiveModulo(note.pitch, 12)),
    );
    if (!hasChordSupport) {
      infeasibleConstraintCounts.structuralChordSupportMiss += 1;
    }

    if (anchor.cadenceTarget || anchor.function === "tonic" || anchor.function === "cadential-tonic") {
      const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
      const hasRootSupport = activeNotes.some(
        (note) =>
          (note.voice === "bass" || note.voice === "tenor") && positiveModulo(note.pitch, 12) === rootPitchClass,
      );
      if (!hasRootSupport) {
        infeasibleConstraintCounts.structuralRootSupportMiss += 1;
      }
    }

    const classifications = classifyStructuralSupportAtAnchor(input.notes, anchor);
    if (input.includeClassifications !== false) {
      structuralSupportClassifications.push(...classifications);
    }
    addHarmonicQualityCounts(
      infeasibleConstraintCounts,
      input.sectionPlan,
      anchor,
      activeNotes,
      gridTicks,
      classifications,
    );
  }

  const selectedRelaxationLevel = relaxationLevel(infeasibleConstraintCounts);
  const solverCandidateCount = solverCandidateCountForProblem(input.problem, gridTicks);

  return {
    startTick: input.problem.window.startTick,
    endTick: input.problem.window.endTick,
    state: input.problem.window.state,
    minActiveVoices: Number.isFinite(minActiveVoices) ? minActiveVoices : 0,
    maxActiveVoices,
    metricalBoundaryCost: metricalBoundary.cost,
    offMeasurePhraseBoundaryCount: metricalBoundary.offMeasurePhraseBoundaryCount,
    offMeasureHarmonicAnchorCount: metricalBoundary.offMeasureHarmonicAnchorCount,
    offMeasureEntryStartCount: metricalBoundary.offMeasureEntryStartCount,
    unpreparedTransitionCount: metricalBoundary.unpreparedTransitionCount,
    preparedPickupCount: metricalBoundary.preparedPickupCount,
    metricalBoundaryClassifications: metricalBoundary.classifications,
    intentionalRestSpans,
    unplannedSilentRuns,
    densityClassifications,
    structuralSupportClassifications,
    infeasibleConstraintCounts,
    selectedRelaxationLevel,
    solverCandidateCount,
  };
}

export function buildConstraintSatisfactionReview(input: {
  notes: readonly NoteEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
}): ConstraintSatisfactionReviewSummary {
  const windows = input.sectionPlans
    .filter((plan) => plan.state !== "exposition")
    .map((sectionPlan) => {
      const problem = buildSectionConstraintProblem({
        notes: input.notes,
        sectionPlan,
        subjectEntries: input.subjectEntries,
      });
      return evaluateSectionConstraintProblem({
        problem,
        notes: input.notes,
        sectionPlan,
        subjectEntries: input.subjectEntries,
      });
    });
  const infeasibleConstraintCounts = sumInfeasibleCounts(windows.map((window) => window.infeasibleConstraintCounts));
  const unplannedSilentRuns = windows.flatMap((window) => window.unplannedSilentRuns.filter((run) => !run.planned));
  const selectedRelaxationLevel = windows.reduce<SectionConstraintRelaxationLevel>(
    (current, window) => maxRelaxationLevel(current, window.selectedRelaxationLevel),
    "none",
  );

  return {
    schemaVersion: 7,
    windowCount: windows.length,
    intentionalRestSpanCount: windows.reduce((sum, window) => sum + window.intentionalRestSpans.length, 0),
    unplannedSilentRunCount: unplannedSilentRuns.length,
    maxUnplannedSilentRunTicks: Math.max(0, ...unplannedSilentRuns.map((run) => run.durationTicks)),
    unsupportedSoloWindowCount: infeasibleConstraintCounts.unsupportedSolo,
    allVoiceSilenceWindowCount: infeasibleConstraintCounts.allVoiceSilence,
    metricalBoundaryCost: windows.reduce((sum, window) => sum + window.metricalBoundaryCost, 0),
    offMeasurePhraseBoundaryCount: windows.reduce((sum, window) => sum + window.offMeasurePhraseBoundaryCount, 0),
    offMeasureHarmonicAnchorCount: windows.reduce((sum, window) => sum + window.offMeasureHarmonicAnchorCount, 0),
    offMeasureEntryStartCount: windows.reduce((sum, window) => sum + window.offMeasureEntryStartCount, 0),
    unpreparedTransitionCount: windows.reduce((sum, window) => sum + window.unpreparedTransitionCount, 0),
    preparedPickupCount: windows.reduce((sum, window) => sum + window.preparedPickupCount, 0),
    metricalBoundaryClassifications: windows.flatMap((window) => window.metricalBoundaryClassifications),
    explainedDensityWindowCount: windows.reduce(
      (sum, window) =>
        sum +
        window.densityClassifications.filter((classification) => classification.response === "accepted-context").length,
      0,
    ),
    unsupportedDensityWindowCount: windows.reduce(
      (sum, window) =>
        sum +
        window.densityClassifications.filter(
          (classification) => classification.response === "generator-response-required",
        ).length,
      0,
    ),
    legitimateNonChordStructuralSupportCount: windows.reduce(
      (sum, window) =>
        sum +
        window.structuralSupportClassifications.filter(
          (classification) =>
            classification.classification === "passing-tone" ||
            classification.classification === "neighbor-tone" ||
            classification.classification === "suspension",
        ).length,
      0,
    ),
    unsupportedStructuralLabelCount: windows.reduce(
      (sum, window) =>
        sum +
        window.structuralSupportClassifications.filter(
          (classification) => classification.classification === "unsupported-structural-label",
        ).length,
      0,
    ),
    infeasibleConstraintCounts,
    selectedRelaxationLevel,
    solverCandidateCount: windows.reduce((sum, window) => sum + window.solverCandidateCount, 0),
    windows,
  };
}

function evaluateMetricalBoundary(input: {
  notes: readonly NoteEvent[];
  sectionPlan: HarmonicPlan;
  subjectEntries: readonly PlannedEntry[];
}): {
  cost: number;
  offMeasurePhraseBoundaryCount: number;
  offMeasureHarmonicAnchorCount: number;
  offMeasureEntryStartCount: number;
  unpreparedTransitionCount: number;
  preparedPickupCount: number;
  classifications: SectionConstraintMetricalBoundaryClassification[];
} {
  const startTick = input.sectionPlan.startTick;
  const endTick = input.sectionPlan.startTick + input.sectionPlan.durationTicks;
  const classifications = [
    classifyMetricalBoundary(input.notes, input.subjectEntries, input.sectionPlan, startTick, "section-start"),
    classifyMetricalBoundary(input.notes, input.subjectEntries, input.sectionPlan, endTick, "section-end"),
  ];
  return {
    cost: classifications.reduce((sum, classification) => sum + classification.cost, 0),
    offMeasurePhraseBoundaryCount: classifications.filter(
      (classification) => !isMeasureDownbeat(classification.tick, input.sectionPlan.meterContext),
    ).length,
    offMeasureHarmonicAnchorCount: classifications.filter(
      (classification) =>
        !isMeasureDownbeat(classification.tick, input.sectionPlan.meterContext) &&
        input.sectionPlan.anchors.some((anchor) => anchor.tick === classification.tick && !anchor.cadenceTarget),
    ).length,
    offMeasureEntryStartCount: classifications.filter(
      (classification) =>
        !isMeasureDownbeat(classification.tick, input.sectionPlan.meterContext) && classification.plannedEntry,
    ).length,
    unpreparedTransitionCount: classifications.filter(
      (classification) => classification.classification === "unprepared-transition",
    ).length,
    preparedPickupCount: classifications.filter((classification) =>
      ["prepared-pickup", "planned-entry-pickup", "cadence-rhetoric"].includes(classification.classification),
    ).length,
    classifications,
  };
}

function classifyMetricalBoundary(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlan: HarmonicPlan,
  tick: number,
  edge: SectionConstraintMetricalBoundaryClassification["edge"],
): SectionConstraintMetricalBoundaryClassification {
  const plannedEntry = subjectEntries.some((entry) => entry.startTick === tick && entry.state === sectionPlan.state);
  const cadencePreparation = hasCadentialBoundarySupport({ ...sectionPlan, startTick: tick });
  const base = { tick, edge, state: sectionPlan.state, plannedEntry, cadencePreparation };
  if (isMeasureDownbeat(tick, sectionPlan.meterContext)) {
    return {
      ...base,
      pickupPreparation: "measure-downbeat",
      classification: "meter-confirming",
      response: "accepted-context",
      cost: 0,
    };
  }
  if (isCompoundMidpoint(tick, sectionPlan.meterContext)) {
    return {
      ...base,
      pickupPreparation: "compound-midpoint",
      classification: "compound-meter-continuation",
      response: "accepted-context",
      cost: 1,
    };
  }
  const boundaryPlan = { ...sectionPlan, startTick: tick };
  const pickupPreparation = preparedBoundarySupport(notes, boundaryPlan);
  if (pickupPreparation !== "unprepared") {
    return {
      ...base,
      pickupPreparation,
      classification: cadencePreparation
        ? "cadence-rhetoric"
        : plannedEntry
          ? "planned-entry-pickup"
          : "prepared-pickup",
      response: "accepted-context",
      cost: 0,
    };
  }
  const boundaryKindCount =
    1 +
    (plannedEntry ? 1 : 0) +
    (sectionPlan.anchors.some((anchor) => anchor.tick === tick && !anchor.cadenceTarget) ? 1 : 0);
  return {
    ...base,
    pickupPreparation: "unprepared",
    classification: "unprepared-transition",
    response: "generator-response-required",
    cost:
      (beatStrengthAtTick(tick, sectionPlan.meterContext) === "offbeat" ? 24 : 14) + (boundaryKindCount >= 3 ? 10 : 0),
  };
}

function preparedBoundarySupport(
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
): SectionConstraintMetricalBoundaryClassification["pickupPreparation"] {
  const startTick = sectionPlan.startTick;
  const measureStartTick = previousMeasureDownbeat(startTick, sectionPlan.meterContext);
  const measureEndTick = measureStartTick + sectionPlan.meterContext.measureTicks;
  const nextDownbeatTick = measureEndTick;
  const heldSupportVoices = notes.filter(
    (note) => note.startTick < startTick && startTick < note.startTick + note.durationTicks,
  );
  const sustainedPickupVoices = notes.filter(
    (note) => note.startTick === startTick && note.startTick + note.durationTicks >= nextDownbeatTick,
  );

  if (heldSupportVoices.some((note) => note.metricalHarmonyIntent === "strong-non-chord-tone")) {
    return "suspension-support";
  }
  if (heldSupportVoices.length > 0) {
    return "held-support";
  }
  if (sustainedPickupVoices.length >= 2) {
    return "sustained-pickup";
  }
  if (hasCadentialBoundarySupport(sectionPlan)) {
    return "cadential-support";
  }
  if (hasDirectedBoundaryContour(notes, sectionPlan, measureStartTick, measureEndTick)) {
    return "directed-contour";
  }
  return "unprepared";
}

function hasCadentialBoundarySupport(sectionPlan: HarmonicPlan): boolean {
  return sectionPlan.anchors.some(
    (anchor) =>
      anchor.cadenceTarget &&
      anchor.tick < sectionPlan.startTick &&
      sectionPlan.startTick - anchor.tick <= sectionPlan.meterContext.strongBeatIntervalTicks,
  );
}

function hasDirectedBoundaryContour(
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  measureStartTick: number,
  measureEndTick: number,
): boolean {
  return [...new Set(notes.map((note) => note.voice))].some((voice) => {
    const attacks = notes
      .filter(
        (note) =>
          note.voice === voice &&
          measureStartTick <= note.startTick &&
          note.startTick < measureEndTick &&
          note.startTick <= sectionPlan.startTick,
      )
      .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch);
    const last = attacks.at(-1);
    const previous = attacks.at(-2);
    if (last === undefined || previous === undefined || last.startTick !== sectionPlan.startTick) {
      return false;
    }
    const interval = Math.abs(last.pitch - previous.pitch);
    return interval > 0 && interval <= 5;
  });
}

function activeNoteAt(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes.find(
    (note) => note.voice === voice && note.startTick <= tick && tick < note.startTick + note.durationTicks,
  );
}

function activeNotesAt(notes: readonly NoteEvent[], tick: number): readonly NoteEvent[] {
  return notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
}

function addHarmonicQualityCounts(
  counts: SectionConstraintInfeasibleCounts,
  sectionPlan: HarmonicPlan,
  anchor: HarmonicAnchor,
  activeNotes: readonly NoteEvent[],
  gridTicks: number,
  classifications: readonly SectionConstraintStructuralSupportClassification[],
): void {
  const sonority = assessHarmonicSonority(activeNotes, sectionPlan, anchor, anchor.tick, gridTicks);
  if (sonority?.classification === "non-chord-structural-support") {
    counts.nonChordStructuralSupportCount += classifications.filter(
      (classification) => classification.classification === "unsupported-structural-label",
    ).length;
  }
  if (sonority?.classification === "thin-unrooted-support") {
    counts.thinUnrootedStructuralSupportCount += 1;
  }
  if (sonority?.classification === "pitch-class-doubling-only") {
    counts.pitchClassDoublingOnlyCount += 1;
  }
  if (isMixedEntryTexture(activeNotes) && !supportNotesSustainAnchor(activeNotes, anchor)) {
    counts.mixedEntryHarmonicRiskCount += 1;
  }
}

function classifyDensityWindow(
  slots: readonly SectionConstraintSlot[],
  tick: number,
  activeVoiceCount: number,
  requiredVoiceCount: number,
): SectionConstraintDensityClassification | undefined {
  const tickSlots = slots.filter((slot) => slot.startTick === tick);
  const endTick = Math.max(tick + 1, ...tickSlots.map((slot) => slot.endTick));
  const restReasons = tickSlots
    .map((slot) => (slot.value?.kind === "intentional-rest" ? slot.value.reason : undefined))
    .filter((reason): reason is IntentionalRestReason =>
      reason === undefined ? false : isAllowedIntentionalRestReason(reason),
    );

  if (activeVoiceCount >= requiredVoiceCount) {
    if (restReasons.length === 0) {
      return undefined;
    }
    return {
      startTick: tick,
      endTick,
      activeVoiceCount,
      requiredVoiceCount,
      reason: preferredRestReason(restReasons),
      response: "accepted-context",
    };
  }

  if (activeVoiceCount > 0 && restReasons.length >= Math.max(1, requiredVoiceCount - activeVoiceCount)) {
    return {
      startTick: tick,
      endTick,
      activeVoiceCount,
      requiredVoiceCount,
      reason: preferredRestReason(restReasons),
      response: "accepted-context",
    };
  }

  return {
    startTick: tick,
    endTick,
    activeVoiceCount,
    requiredVoiceCount,
    reason: activeVoiceCount >= requiredVoiceCount ? "supported-texture" : "unsupported-collapse",
    response: activeVoiceCount >= requiredVoiceCount ? "accepted-context" : "generator-response-required",
  };
}

function preferredRestReason(reasons: readonly IntentionalRestReason[]): IntentionalRestReason {
  const priority: readonly IntentionalRestReason[] = [
    "cadence-breath",
    "entry-handoff-delay",
    "pedal-thinning",
    "suspension-resolution",
    "register-relief",
  ];
  return priority.find((reason) => reasons.includes(reason)) ?? reasons[0]!;
}

function classifyStructuralSupportAtAnchor(
  notes: readonly NoteEvent[],
  anchor: HarmonicAnchor,
): SectionConstraintStructuralSupportClassification[] {
  const chordPitchClasses = chordTonePitchClasses(anchor.localKey, anchor.function);
  return activeNotesAt(notes, anchor.tick)
    .filter(
      (note) =>
        (note.role === "free-counterpoint" || note.role === "counter-subject") &&
        (note.metricalHarmonyIntent === "structural-chord-tone" ||
          note.metricalHarmonyIntent === "structural-root-support"),
    )
    .map((note) => {
      const chordTone = chordPitchClasses.includes(positiveModulo(note.pitch, 12));
      const classification = chordTone ? "chord-tone-support" : nonHarmonicSupportFunction(notes, note, anchor.tick);
      return {
        tick: anchor.tick,
        voice: note.voice,
        pitch: note.pitch,
        classification,
        response:
          classification === "unsupported-structural-label" ? "generator-response-required" : "accepted-context",
      };
    });
}

function nonHarmonicSupportFunction(
  notes: readonly NoteEvent[],
  note: NoteEvent,
  tick: number,
): SectionConstraintStructuralSupportClassification["classification"] {
  const voiceNotes = notes.filter((candidate) => candidate.voice === note.voice).sort(compareNoteEvents);
  const previous = [...voiceNotes]
    .filter((candidate) => candidate.startTick + candidate.durationTicks <= note.startTick)
    .at(-1);
  const next = voiceNotes.find((candidate) => candidate.startTick >= note.startTick + note.durationTicks);
  const previousStep = previous === undefined ? undefined : note.pitch - previous.pitch;
  const nextStep = next === undefined ? undefined : next.pitch - note.pitch;
  const resolvesByStep = nextStep !== undefined && Math.abs(nextStep) <= 2 && Math.abs(nextStep) > 0;

  if (note.startTick < tick && resolvesByStep) {
    return "suspension";
  }
  if (
    previousStep !== undefined &&
    nextStep !== undefined &&
    Math.abs(previousStep) <= 2 &&
    Math.abs(nextStep) <= 2 &&
    Math.sign(previousStep) === Math.sign(nextStep) &&
    Math.sign(previousStep) !== 0
  ) {
    return "passing-tone";
  }
  if (
    previous !== undefined &&
    next !== undefined &&
    Math.abs(previousStep ?? 0) <= 2 &&
    Math.abs(nextStep ?? 0) <= 2 &&
    positiveModulo(previous.pitch, 12) === positiveModulo(next.pitch, 12)
  ) {
    return "neighbor-tone";
  }
  return "unsupported-structural-label";
}

function addEntryConstraintCounts(
  counts: SectionConstraintInfeasibleCounts,
  input: {
    problem: SectionConstraintProblem;
    notes: readonly NoteEvent[];
    sectionPlan: HarmonicPlan;
    subjectEntries?: readonly PlannedEntry[];
  },
): void {
  for (const entry of plannedEntriesForSectionWindow(input.subjectEntries ?? [], input.notes, input.problem.window)) {
    if (!entryPitchClassSequenceMatchesPlan(input.notes, entry)) {
      counts.entryPlanViolationCount += 1;
    }

    const support = entrySupportInstabilityCounts(input.notes, entry);
    counts.entrySupportInstabilityCount += support.instabilityCount;
    counts.unresolvedEntrySupportInstabilityCount += support.unresolvedInstabilityCount;
    counts.unresolvedSevereEntryIntervalCount += support.unresolvedSevereIntervalCount;
    counts.entryAdjacentSecondFrictionCount += support.adjacentSecondFrictionCount;
    counts.unresolvedAccentedEntryClashCount += support.unresolvedAccentedClashCount;
  }
}

function plannedEntriesForSectionWindow(
  entries: readonly PlannedEntry[],
  notes: readonly NoteEvent[],
  window: { startTick: number; endTick: number },
): PlannedEntry[] {
  return entries.filter((entry) => {
    const entryEndTick = plannedEntryEndTick(notes, entry);
    return entry.startTick < window.endTick && window.startTick < entryEndTick;
  });
}

function plannedEntryEndTick(notes: readonly NoteEvent[], entry: PlannedEntry): number {
  const entryNotes = entryNotesForPlan(notes, entry);
  const lastEntryNote = entryNotes.at(-1);
  if (lastEntryNote !== undefined) {
    return lastEntryNote.startTick + lastEntryNote.durationTicks;
  }
  return entry.startTick + Math.max(1, entry.actualPitchClassSequence.length) * TICKS_PER_QUARTER;
}

function entryNotesForPlan(notes: readonly NoteEvent[], entry: PlannedEntry): NoteEvent[] {
  const entryRole = noteRoleForEntryForm(entry.form);
  const roleNotes = notes
    .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick && note.role === entryRole)
    .sort(compareNoteEvents)
    .slice(0, entry.actualPitchClassSequence.length);
  if (roleNotes.length > 0) {
    return roleNotes;
  }
  return notes
    .filter((note) => note.voice === entry.voice && note.startTick >= entry.startTick)
    .sort(compareNoteEvents)
    .slice(0, entry.actualPitchClassSequence.length);
}

function noteRoleForEntryForm(form: PlannedEntry["form"]): NoteEvent["role"] {
  if (form === "answer") {
    return "answer";
  }
  if (form === "subject-fragment") {
    return "subject-fragment";
  }
  return "subject";
}

function entryPitchClassSequenceMatchesPlan(notes: readonly NoteEvent[], entry: PlannedEntry): boolean {
  const entryNotes = entryNotesForPlan(notes, entry);
  const pitchClassSequence = entryNotes.map((note) => positiveModulo(note.pitch, 12));
  return (
    pitchClassSequence.length === entry.actualPitchClassSequence.length &&
    pitchClassSequence.every((pitchClass, index) => pitchClass === entry.actualPitchClassSequence[index])
  );
}

function entrySupportInstabilityCounts(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
): {
  instabilityCount: number;
  unresolvedInstabilityCount: number;
  unresolvedSevereIntervalCount: number;
  adjacentSecondFrictionCount: number;
  unresolvedAccentedClashCount: number;
} {
  const ticks = entrySupportCheckpoints(notes, entry);
  const unstableTicks = ticks.filter((tick) => hasEntrySupportInstabilityAt(notes, entry, tick));
  const severeTicks = ticks.filter((tick) => hasSevereEntryIntervalAt(notes, entry, tick));
  const adjacentSecondFrictionTicks = ticks.filter((tick) => hasAdjacentEntrySecondFrictionAt(notes, entry, tick));
  let unresolvedInstabilityCount = 0;
  let unresolvedSevereIntervalCount = 0;
  let unresolvedAccentedClashCount = 0;

  for (const tick of unstableTicks) {
    if (!resolvesBeforeDeadline(ticks, unstableTicks, tick)) {
      unresolvedInstabilityCount += 1;
    }
  }
  for (const tick of severeTicks) {
    if (!resolvesBeforeDeadline(ticks, severeTicks, tick)) {
      unresolvedSevereIntervalCount += 1;
      if (isAccentedTick(tick)) {
        unresolvedAccentedClashCount += 1;
      }
    }
  }

  return {
    instabilityCount: unstableTicks.length,
    unresolvedInstabilityCount,
    unresolvedSevereIntervalCount,
    adjacentSecondFrictionCount: adjacentSecondFrictionTicks.length,
    unresolvedAccentedClashCount,
  };
}

function resolvesBeforeDeadline(ticks: readonly number[], unstableTicks: readonly number[], tick: number): boolean {
  const resolutionDeadlineTick = tick + TICKS_PER_QUARTER;
  return ticks.some(
    (candidateTick) =>
      candidateTick > tick && candidateTick <= resolutionDeadlineTick && !unstableTicks.includes(candidateTick),
  );
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
  return entrySupportPairsAt(notes, entry, tick).some(
    ({ entryNote, supportNote }) =>
      isEntrySupportInstability(entrySupportIntervalClass(entryNote, supportNote)) &&
      !isPreparedOrResolvingEntrySupport(notes, entry, entryNote, supportNote, tick),
  );
}

function hasSevereEntryIntervalAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  return entrySupportPairsAt(notes, entry, tick).some(
    ({ entryNote, supportNote }) =>
      isSevereEntryInterval(entrySupportIntervalClass(entryNote, supportNote)) &&
      !isPreparedOrResolvingEntrySupport(notes, entry, entryNote, supportNote, tick),
  );
}

function hasAdjacentEntrySecondFrictionAt(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  return entrySupportPairsAt(notes, entry, tick).some(
    ({ entryNote, supportNote }) =>
      areAdjacentContrapuntalVoices(entryNote.voice, supportNote.voice) &&
      isSemitoneEntryFriction(entrySupportIntervalClass(entryNote, supportNote)) &&
      !isPreparedOrResolvingEntrySupport(notes, entry, entryNote, supportNote, tick),
  );
}

function isAccentedTick(tick: number): boolean {
  return tick % TICKS_PER_QUARTER === 0;
}

function areAdjacentContrapuntalVoices(left: Voice, right: Voice): boolean {
  return Math.abs(VOICE_ENTRY_ORDER.indexOf(left) - VOICE_ENTRY_ORDER.indexOf(right)) === 1;
}

function entrySupportPairsAt(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
  tick: number,
): Array<{ entryNote: NoteEvent; supportNote: NoteEvent }> {
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

  return notes
    .filter(
      (note) =>
        note.voice !== entry.voice &&
        note.startTick <= tick &&
        tick < note.startTick + note.durationTicks &&
        (note.role === "counter-subject" || note.role === "free-counterpoint"),
    )
    .map((supportNote) => ({ entryNote, supportNote }));
}

function isEntryRole(role: NoteEvent["role"]): boolean {
  return role === "subject" || role === "answer" || role === "subject-fragment";
}

function entrySupportIntervalClass(entryNote: NoteEvent, supportNote: NoteEvent): number {
  return Math.abs(entryNote.pitch - supportNote.pitch) % 12;
}

function isPreparedOrResolvingEntrySupport(
  notes: readonly NoteEvent[],
  entry: PlannedEntry,
  entryNote: NoteEvent,
  supportNote: NoteEvent,
  tick: number,
): boolean {
  const carriedIntoEntry =
    supportNote.startTick < entry.startTick && entry.startTick < supportNote.startTick + supportNote.durationTicks;
  const weakPassingMotion =
    supportNote.role === "free-counterpoint" &&
    supportNote.startTick > entry.startTick &&
    supportNote.startTick === tick &&
    tick % TICKS_PER_QUARTER !== 0;
  const suspensionDeadline = entry.startTick + TICKS_PER_QUARTER;
  const suspendedSupportEndsOnTime =
    carriedIntoEntry && supportNote.startTick + supportNote.durationTicks <= suspensionDeadline;
  return (
    suspendedSupportEndsOnTime ||
    ((carriedIntoEntry || weakPassingMotion) &&
      (entryLineResolvesByStep(notes, entry, tick) ||
        noteResolvesByStep(notes, entryNote, tick) ||
        noteResolvesByStep(notes, supportNote, tick)))
  );
}

function entryLineResolvesByStep(notes: readonly NoteEvent[], entry: PlannedEntry, tick: number): boolean {
  const current = entrySupportPairsAt(notes, entry, tick)[0]?.entryNote;
  return current !== undefined && noteResolvesByStep(notes, current, tick);
}

function noteResolvesByStep(notes: readonly NoteEvent[], current: NoteEvent, tick: number): boolean {
  const next = notes.filter((note) => note.voice === current.voice && note.startTick > tick).sort(compareNoteEvents)[0];
  return next !== undefined && next.startTick <= tick + TICKS_PER_QUARTER && Math.abs(next.pitch - current.pitch) <= 2;
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

function isSemitoneEntryFriction(intervalClass: number): boolean {
  return intervalClass === 1 || intervalClass === 11;
}

function addVoicePairPressureCounts(
  counts: SectionConstraintInfeasibleCounts,
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  problem: SectionConstraintProblem,
  gridTicks: number,
): void {
  const ticks = pressureCheckpoints(notes, problem, gridTicks);
  for (const tick of ticks) {
    for (let leftIndex = 0; leftIndex < VOICES.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < VOICES.length; rightIndex += 1) {
        const left = activeNoteAt(notes, VOICES[leftIndex]!, tick);
        const right = activeNoteAt(notes, VOICES[rightIndex]!, tick);
        if (left === undefined || right === undefined) {
          continue;
        }
        const classification = classifyVoicePairSpan(left, right, sectionPlan, tick);
        if (classification === "exact-collision" || classification === "color-doubling") {
          counts.voicePairUnisonPressureCount += 1;
        }
        if (classification === "mechanical-coupling") {
          counts.voicePairLockstepCount += 1;
        }
      }
    }
  }
}

function addUpperLineAgencyCounts(
  counts: SectionConstraintInfeasibleCounts,
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  problem: SectionConstraintProblem,
  gridTicks: number,
  subjectEntries: readonly PlannedEntry[],
): void {
  if (sectionPlan.state === "exposition") {
    return;
  }

  for (const tick of pressureCheckpoints(notes, problem, gridTicks)) {
    if (isCadentialTick(sectionPlan, tick)) {
      continue;
    }
    const activeNotes = activeNotesAt(notes, tick);
    const activeVoiceCount = new Set(activeNotes.map((note) => note.voice)).size;
    const minRequired = minActiveVoicesForSlot(sectionPlan, tick, activeNotes);
    const sopranoNotes = activeNotes.filter((note) => note.voice === "soprano");
    const lowerNotes = activeNotes.filter((note) => note.voice !== "soprano");
    const sopranoHasFreeAgency = sopranoNotes.some(isFreeCounterpointRole);
    const sopranoIsThematicOnly =
      sopranoNotes.length > 0 &&
      sopranoNotes.every((note) => isThematicUpperRole(note) && !isFreeCounterpointRole(note));
    const lowerHasFiller = lowerNotes.some((note) => isFreeCounterpointRole(note) || isStructuralSupportNote(note));
    const lowerActiveVoiceCount = new Set(lowerNotes.map((note) => note.voice)).size;
    const outsidePlannedEntry = !hasPlannedEntryAt(subjectEntries, tick);

    if (sopranoIsThematicOnly && lowerHasFiller) {
      counts.upperVoiceThematicMonopolyCount += 1;
    }
    if (activeVoiceCount >= minRequired && lowerHasFiller && !sopranoHasFreeAgency) {
      counts.lowerVoiceFillerDominanceCount += 1;
    }
    if (hasSupportFillerLockstep(activeNotes)) {
      counts.supportFillerLockstepCount += 1;
    }
    if (
      activeVoiceCount >= minRequired &&
      sopranoNotes.length > 0 &&
      lowerActiveVoiceCount < Math.min(3, minRequired)
    ) {
      counts.lowerLineContinuityGapCount += 1;
    }
    if (outsidePlannedEntry && activeVoiceCount >= minRequired && hasThematicSurfaceOnly(activeNotes)) {
      counts.freeCounterpointScarcityCount += 1;
    }
  }
  counts.shortStructuralSupportChurnCount += shortStructuralSupportChurnCount(notes, sectionPlan, problem, gridTicks);
}

function isThematicUpperRole(note: NoteEvent): boolean {
  return (
    note.role === "subject" ||
    note.role === "answer" ||
    note.role === "subject-fragment" ||
    note.role === "counter-subject"
  );
}

function isFreeCounterpointRole(note: NoteEvent): boolean {
  return note.role === "free-counterpoint";
}

function isStructuralSupportNote(note: NoteEvent): boolean {
  return (
    note.role === "free-counterpoint" &&
    (note.metricalHarmonyIntent === "structural-root-support" || note.metricalHarmonyIntent === "structural-chord-tone")
  );
}

function hasSupportFillerLockstep(activeNotes: readonly NoteEvent[]): boolean {
  return activeNotes.some(
    (note) =>
      isStructuralSupportNote(note) &&
      activeNotes.some(
        (other) =>
          other !== note &&
          other.voice !== note.voice &&
          other.startTick === note.startTick &&
          other.durationTicks === note.durationTicks,
      ),
  );
}

function hasPlannedEntryAt(subjectEntries: readonly PlannedEntry[], tick: number): boolean {
  return subjectEntries.some((entry) => entry.startTick <= tick && tick < entry.startTick + TICKS_PER_QUARTER * 2);
}

function hasThematicSurfaceOnly(activeNotes: readonly NoteEvent[]): boolean {
  return activeNotes.length > 0 && activeNotes.every((note) => isThematicUpperRole(note));
}

function shortStructuralSupportChurnCount(
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  problem: SectionConstraintProblem,
  gridTicks: number,
): number {
  let count = 0;
  for (const voice of VOICES) {
    const supportNotes = notes
      .filter(
        (note) =>
          note.voice === voice &&
          isStructuralSupportNote(note) &&
          note.durationTicks <= gridTicks &&
          note.startTick >= problem.window.startTick &&
          note.startTick < problem.window.endTick &&
          !isCadentialTick(sectionPlan, note.startTick),
      )
      .sort(compareNoteEvents);
    for (let index = 1; index < supportNotes.length; index += 1) {
      const previous = supportNotes[index - 1]!;
      const current = supportNotes[index]!;
      if (
        previous.startTick + previous.durationTicks === current.startTick &&
        (previous.pitch === current.pitch || previous.metricalHarmonyIntent === current.metricalHarmonyIntent)
      ) {
        count += 1;
      }
    }
  }
  return count;
}

function addLeapToSilenceCounts(
  counts: SectionConstraintInfeasibleCounts,
  notes: readonly NoteEvent[],
  problem: SectionConstraintProblem,
): void {
  for (const voice of VOICE_ENTRY_ORDER) {
    const voiceNotes = notes
      .filter(
        (note) =>
          note.voice === voice && problem.window.startTick <= note.startTick && note.startTick < problem.window.endTick,
      )
      .sort(compareNoteEvents);
    for (let index = 1; index < voiceNotes.length - 1; index += 1) {
      const previous = voiceNotes[index - 1];
      const current = voiceNotes[index];
      const next = voiceNotes[index + 1];
      if (previous === undefined || current === undefined || next === undefined) {
        continue;
      }
      const leapInterval = Math.abs(current.pitch - previous.pitch);
      const followingGapTicks = next.startTick - (current.startTick + current.durationTicks);
      if (leapInterval >= 5 && followingGapTicks > TICKS_PER_QUARTER / 2) {
        counts.leapToSilenceCount += 1;
      }
    }
  }
}

function addSustainedSevereVerticalDissonanceCounts(
  counts: SectionConstraintInfeasibleCounts,
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
): void {
  counts.sustainedSevereVerticalDissonanceCount += analyzeDissonanceTriage(
    notes,
    [sectionPlan],
    [],
  ).sustainedSevereVerticalDissonanceCount;
}

function pressureCheckpoints(
  notes: readonly NoteEvent[],
  problem: SectionConstraintProblem,
  gridTicks: number,
): number[] {
  const noteTicks = notes.flatMap((note) => [note.startTick, note.startTick + note.durationTicks]);
  const slotTicks = uniqueSlotStartTicks(problem.slots);
  const alignedTicks: number[] = [];
  for (let tick = problem.window.startTick; tick < problem.window.endTick; tick += gridTicks) {
    alignedTicks.push(tick);
  }
  return [...new Set([...noteTicks, ...slotTicks, ...alignedTicks])]
    .filter((tick) => tick >= problem.window.startTick && tick < problem.window.endTick)
    .sort((left, right) => left - right);
}

function supportNotesSustainAnchor(activeNotes: readonly NoteEvent[], anchor: HarmonicAnchor): boolean {
  if (!hasSupportRole(activeNotes)) {
    return false;
  }
  const chordTonePitchClassesForAnchor = chordTonePitchClasses(anchor.localKey, anchor.function);
  return activeNotes.some(
    (note) =>
      (note.role === "counter-subject" || note.role === "free-counterpoint") &&
      chordTonePitchClassesForAnchor.includes(positiveModulo(note.pitch, 12)),
  );
}

function inferIntentionalRestReason(input: {
  voice: Voice;
  startTick: number;
  endTick: number;
  notes: readonly NoteEvent[];
  sectionPlan: HarmonicPlan;
  subjectEntries: readonly PlannedEntry[];
}): IntentionalRestReason | undefined {
  const sectionEndTick = input.sectionPlan.startTick + input.sectionPlan.durationTicks;
  const beatTicks = input.sectionPlan.meterContext.beatTicks;
  if (isCadentialTick(input.sectionPlan, input.startTick) && activeNotesAt(input.notes, input.startTick).length >= 2) {
    return "cadence-breath";
  }

  const nearbyEntry = input.subjectEntries.find(
    (entry) =>
      entry.startTick >= input.sectionPlan.startTick &&
      entry.startTick < sectionEndTick &&
      Math.abs(entry.startTick - input.startTick) <= beatTicks * 2 &&
      entry.voice !== input.voice,
  );
  if (nearbyEntry !== undefined) {
    return "entry-handoff-delay";
  }

  if (hasPedalSupport(input.notes, input.sectionPlan, input.startTick) && input.voice !== "bass") {
    return "pedal-thinning";
  }

  const previous = previousVoiceNote(input.notes, input.voice, input.startTick);
  const next = nextVoiceNote(input.notes, input.voice, input.endTick);
  if (
    previous !== undefined &&
    next !== undefined &&
    previous.startTick + previous.durationTicks <= input.startTick &&
    next.startTick - input.endTick <= beatTicks * 2 &&
    (Math.abs(previous.pitch - next.pitch) >= 7 || isRegisterEdge(input.voice, previous.pitch))
  ) {
    return "register-relief";
  }

  return undefined;
}

function normalizeUnsupportedCollectiveRests(
  slots: SectionConstraintSlot[],
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  subjectEntries: readonly PlannedEntry[],
): void {
  for (const tick of uniqueSlotStartTicks(slots)) {
    const tickSlots = slots.filter((slot) => slot.startTick === tick);
    const activeCount = tickSlots.filter((slot) => slot.value?.kind === "note" || slot.value?.kind === "hold").length;
    const plannedRestSlots = tickSlots.filter((slot) => slot.value?.kind === "intentional-rest");
    if (
      plannedRestSlots.length < 2 ||
      activeCount >= minActiveVoicesForSlot(sectionPlan, tick, activeNotesAt(notes, tick))
    ) {
      continue;
    }
    if (hasExplainedCollectiveRestSupport(notes, sectionPlan, subjectEntries, tick, activeCount)) {
      continue;
    }
    for (const slot of plannedRestSlots) {
      if (slot.value?.kind === "intentional-rest" && isWeakCollectiveRestReason(slot.value.reason)) {
        slot.value = undefined;
      }
    }
  }
}

function isWeakCollectiveRestReason(reason: string): boolean {
  return reason === "entry-handoff-delay" || reason === "register-relief";
}

function hasExplainedCollectiveRestSupport(
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  subjectEntries: readonly PlannedEntry[],
  tick: number,
  activeCount: number,
): boolean {
  if (isCadentialTick(sectionPlan, tick) || hasPedalSupport(notes, sectionPlan, tick)) {
    return true;
  }
  const activeEntry = subjectEntries.some(
    (entry) => entry.startTick <= tick && tick < entry.startTick + TICKS_PER_QUARTER,
  );
  return activeEntry && activeCount >= 2;
}

function isCadentialTick(sectionPlan: HarmonicPlan, tick: number): boolean {
  const sectionEndTick = sectionPlan.startTick + sectionPlan.durationTicks;
  const cadenceStartTick = Math.max(sectionPlan.startTick, sectionEndTick - sectionPlan.meterContext.beatTicks * 2);
  return (
    tick >= cadenceStartTick &&
    (sectionPlan.cadenceKind === "authentic" ||
      sectionPlan.cadenceKind === "modal" ||
      sectionPlan.cadenceKind === "half" ||
      sectionPlan.terminalIntent !== undefined)
  );
}

function hasPedalSupport(notes: readonly NoteEvent[], sectionPlan: HarmonicPlan, tick: number): boolean {
  const anchor = sectionPlan.anchors
    .map((candidate) => ({ anchor: candidate, distance: Math.abs(candidate.tick - tick) }))
    .sort((left, right) => left.distance - right.distance)[0]?.anchor;
  if (anchor === undefined) {
    return false;
  }
  const rootPitchClass = scaleDegreePitchClass(rootDegreeForFunction(anchor.function), 0, anchor.localKey);
  return notes.some(
    (note) =>
      (note.voice === "bass" || note.voice === "tenor") &&
      note.startTick <= tick &&
      tick < note.startTick + note.durationTicks &&
      note.durationTicks >= sectionPlan.meterContext.beatTicks * 2 &&
      positiveModulo(note.pitch, 12) === rootPitchClass,
  );
}

function previousVoiceNote(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes
    .filter((note) => note.voice === voice && note.startTick + note.durationTicks <= tick)
    .sort((left, right) => right.startTick + right.durationTicks - (left.startTick + left.durationTicks))[0];
}

function nextVoiceNote(notes: readonly NoteEvent[], voice: Voice, tick: number): NoteEvent | undefined {
  return notes
    .filter((note) => note.voice === voice && note.startTick >= tick)
    .sort((left, right) => left.startTick - right.startTick)[0];
}

function isRegisterEdge(voice: Voice, pitch: number): boolean {
  if (voice === "soprano") {
    return pitch >= 76;
  }
  if (voice === "bass") {
    return pitch <= 42;
  }
  return pitch >= 70 || pitch <= 48;
}

function uniqueSlotStartTicks(slots: readonly SectionConstraintSlot[]): number[] {
  return [...new Set(slots.map((slot) => slot.startTick))].sort((left, right) => left - right);
}

function inferGridTicks(problem: SectionConstraintProblem): number {
  const ticks = uniqueSlotStartTicks(problem.slots);
  if (ticks.length < 2) {
    return TICKS_PER_QUARTER;
  }
  return Math.max(1, ticks[1]! - ticks[0]!);
}

function minActiveVoicesForSlot(sectionPlan: HarmonicPlan, tick: number, activeNotes: readonly NoteEvent[]): number {
  if (isCadentialTick(sectionPlan, tick) || hasPedalSupport(activeNotes, sectionPlan, tick)) {
    return 2;
  }
  return 3;
}

function mergeIntentionalRestSpans(
  slots: readonly SectionConstraintSlot[],
  state: FugueState | "unplanned",
): SectionConstraintRestSpan[] {
  const spans: SectionConstraintRestSpan[] = [];
  for (const voice of VOICES) {
    let current: SectionConstraintRestSpan | undefined;
    for (const slot of slots.filter((candidate) => candidate.voice === voice)) {
      const reason =
        slot.value?.kind === "intentional-rest" && isAllowedIntentionalRestReason(slot.value.reason)
          ? slot.value.reason
          : undefined;
      if (reason === undefined) {
        if (current !== undefined) {
          spans.push(current);
          current = undefined;
        }
        continue;
      }
      if (current !== undefined && current.endTick === slot.startTick && current.reason === reason) {
        current = { ...current, endTick: slot.endTick, durationTicks: slot.endTick - current.startTick };
      } else {
        if (current !== undefined) {
          spans.push(current);
        }
        current = {
          voice,
          startTick: slot.startTick,
          endTick: slot.endTick,
          durationTicks: slot.endTick - slot.startTick,
          state,
          reason,
        };
      }
    }
    if (current !== undefined) {
      spans.push(current);
    }
  }
  return spans;
}

function mergeSilentRuns(
  slots: readonly SectionConstraintSlot[],
  state: FugueState | "unplanned",
): SectionConstraintSilentRun[] {
  const runs: SectionConstraintSilentRun[] = [];
  for (const voice of VOICES) {
    let current: SectionConstraintSilentRun | undefined;
    for (const slot of slots.filter((candidate) => candidate.voice === voice)) {
      const planned =
        slot.value?.kind === "intentional-rest" && isAllowedIntentionalRestReason(slot.value.reason)
          ? slot.value.reason
          : undefined;
      const silent = slot.value === undefined || planned !== undefined;
      if (!silent) {
        if (current !== undefined) {
          runs.push(current);
          current = undefined;
        }
        continue;
      }
      const reason = planned ?? "unplanned";
      const isSameRun =
        current !== undefined &&
        current.endTick === slot.startTick &&
        current.planned === (planned !== undefined) &&
        current.reason === reason;
      if (isSameRun && current !== undefined) {
        current = { ...current, endTick: slot.endTick, durationTicks: slot.endTick - current.startTick };
      } else {
        if (current !== undefined) {
          runs.push(current);
        }
        current = {
          voice,
          startTick: slot.startTick,
          endTick: slot.endTick,
          durationTicks: slot.endTick - slot.startTick,
          state,
          planned: planned !== undefined,
          reason,
        };
      }
    }
    if (current !== undefined) {
      runs.push(current);
    }
  }
  return runs;
}

function solverCandidateCountForProblem(problem: SectionConstraintProblem, gridTicks: number): number {
  const structuralSlots = problem.slots.filter((slot) => slot.value?.kind === "note").length;
  const holdSlots = problem.slots.filter((slot) => slot.value?.kind === "hold").length;
  const restSlots = problem.slots.filter((slot) => slot.value?.kind === "intentional-rest").length;
  const emptySlots = problem.slots.filter((slot) => slot.value === undefined).length;
  const timeSlotCount = Math.max(1, (problem.window.endTick - problem.window.startTick) / gridTicks);
  return Math.max(1, Math.round(structuralSlots * 3 + holdSlots * 2 + restSlots + emptySlots * 4 + timeSlotCount));
}

function emptyInfeasibleCounts(): SectionConstraintInfeasibleCounts {
  return {
    invalidIntentionalRestReason: 0,
    minActiveVoiceViolation: 0,
    unsupportedSolo: 0,
    allVoiceSilence: 0,
    longUnplannedSilentRun: 0,
    entryPlanViolationCount: 0,
    entrySupportInstabilityCount: 0,
    unresolvedEntrySupportInstabilityCount: 0,
    unresolvedSevereEntryIntervalCount: 0,
    entryAdjacentSecondFrictionCount: 0,
    unresolvedAccentedEntryClashCount: 0,
    leapToSilenceCount: 0,
    sustainedSevereVerticalDissonanceCount: 0,
    voicePairUnisonPressureCount: 0,
    voicePairLockstepCount: 0,
    structuralChordSupportMiss: 0,
    structuralRootSupportMiss: 0,
    nonChordStructuralSupportCount: 0,
    thinUnrootedStructuralSupportCount: 0,
    pitchClassDoublingOnlyCount: 0,
    mixedEntryHarmonicRiskCount: 0,
    upperVoiceThematicMonopolyCount: 0,
    lowerVoiceFillerDominanceCount: 0,
    supportFillerLockstepCount: 0,
    lowerLineContinuityGapCount: 0,
    freeCounterpointScarcityCount: 0,
    shortStructuralSupportChurnCount: 0,
  };
}

function sumInfeasibleCounts(counts: readonly SectionConstraintInfeasibleCounts[]): SectionConstraintInfeasibleCounts {
  return counts.reduce<SectionConstraintInfeasibleCounts>(
    (sum, count) => ({
      invalidIntentionalRestReason: sum.invalidIntentionalRestReason + count.invalidIntentionalRestReason,
      minActiveVoiceViolation: sum.minActiveVoiceViolation + count.minActiveVoiceViolation,
      unsupportedSolo: sum.unsupportedSolo + count.unsupportedSolo,
      allVoiceSilence: sum.allVoiceSilence + count.allVoiceSilence,
      longUnplannedSilentRun: sum.longUnplannedSilentRun + count.longUnplannedSilentRun,
      entryPlanViolationCount: sum.entryPlanViolationCount + count.entryPlanViolationCount,
      entrySupportInstabilityCount: sum.entrySupportInstabilityCount + count.entrySupportInstabilityCount,
      unresolvedEntrySupportInstabilityCount:
        sum.unresolvedEntrySupportInstabilityCount + count.unresolvedEntrySupportInstabilityCount,
      unresolvedSevereEntryIntervalCount:
        sum.unresolvedSevereEntryIntervalCount + count.unresolvedSevereEntryIntervalCount,
      entryAdjacentSecondFrictionCount: sum.entryAdjacentSecondFrictionCount + count.entryAdjacentSecondFrictionCount,
      unresolvedAccentedEntryClashCount:
        sum.unresolvedAccentedEntryClashCount + count.unresolvedAccentedEntryClashCount,
      leapToSilenceCount: sum.leapToSilenceCount + count.leapToSilenceCount,
      sustainedSevereVerticalDissonanceCount:
        sum.sustainedSevereVerticalDissonanceCount + count.sustainedSevereVerticalDissonanceCount,
      voicePairUnisonPressureCount: sum.voicePairUnisonPressureCount + count.voicePairUnisonPressureCount,
      voicePairLockstepCount: sum.voicePairLockstepCount + count.voicePairLockstepCount,
      structuralChordSupportMiss: sum.structuralChordSupportMiss + count.structuralChordSupportMiss,
      structuralRootSupportMiss: sum.structuralRootSupportMiss + count.structuralRootSupportMiss,
      nonChordStructuralSupportCount: sum.nonChordStructuralSupportCount + count.nonChordStructuralSupportCount,
      thinUnrootedStructuralSupportCount:
        sum.thinUnrootedStructuralSupportCount + count.thinUnrootedStructuralSupportCount,
      pitchClassDoublingOnlyCount: sum.pitchClassDoublingOnlyCount + count.pitchClassDoublingOnlyCount,
      mixedEntryHarmonicRiskCount: sum.mixedEntryHarmonicRiskCount + count.mixedEntryHarmonicRiskCount,
      upperVoiceThematicMonopolyCount: sum.upperVoiceThematicMonopolyCount + count.upperVoiceThematicMonopolyCount,
      lowerVoiceFillerDominanceCount: sum.lowerVoiceFillerDominanceCount + count.lowerVoiceFillerDominanceCount,
      supportFillerLockstepCount: sum.supportFillerLockstepCount + count.supportFillerLockstepCount,
      lowerLineContinuityGapCount: sum.lowerLineContinuityGapCount + count.lowerLineContinuityGapCount,
      freeCounterpointScarcityCount: sum.freeCounterpointScarcityCount + count.freeCounterpointScarcityCount,
      shortStructuralSupportChurnCount: sum.shortStructuralSupportChurnCount + count.shortStructuralSupportChurnCount,
    }),
    emptyInfeasibleCounts(),
  );
}

function relaxationLevel(counts: SectionConstraintInfeasibleCounts): SectionConstraintRelaxationLevel {
  const densityFailures =
    counts.minActiveVoiceViolation + counts.unsupportedSolo + counts.allVoiceSilence + counts.longUnplannedSilentRun;
  const structuralFailures = counts.entryPlanViolationCount + counts.nonChordStructuralSupportCount;
  if (counts.invalidIntentionalRestReason > 0 || (densityFailures > 0 && structuralFailures > 0)) {
    return "infeasible";
  }
  if (densityFailures > 0) {
    return "density-floor-review";
  }
  if (structuralFailures > 0) {
    return "structural-support-review";
  }
  return "none";
}

function maxRelaxationLevel(
  left: SectionConstraintRelaxationLevel,
  right: SectionConstraintRelaxationLevel,
): SectionConstraintRelaxationLevel {
  const order: Record<SectionConstraintRelaxationLevel, number> = {
    none: 0,
    "density-floor-review": 1,
    "structural-support-review": 1,
    infeasible: 2,
  };
  return order[right] > order[left] ? right : left;
}

export function sectionConstraintHardFailureCount(window: SectionConstraintSatisfactionWindow): number {
  const counts = window.infeasibleConstraintCounts;
  return (
    counts.invalidIntentionalRestReason +
    counts.minActiveVoiceViolation +
    counts.unsupportedSolo +
    counts.allVoiceSilence +
    counts.longUnplannedSilentRun +
    counts.entryPlanViolationCount +
    counts.nonChordStructuralSupportCount
  );
}

export function sectionConstraintSoftCost(
  window: SectionConstraintSatisfactionWindow,
  profileId?: SectionConstraintScoringProfileId,
): number {
  return sectionConstraintSoftCostFromCounts(
    window.infeasibleConstraintCounts,
    resolveSectionConstraintScoringProfile(profileId),
  );
}
