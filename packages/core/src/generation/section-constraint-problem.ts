import { TICKS_PER_QUARTER, VOICES } from "../constants.js";
import type {
  ConstraintSatisfactionReviewSummary,
  FugueState,
  HarmonicAnchor,
  HarmonicPlan,
  IntentionalRestReason,
  NoteEvent,
  PlannedEntry,
  SectionConstraintInfeasibleCounts,
  SectionConstraintRelaxationLevel,
  SectionConstraintRestSpan,
  SectionConstraintSatisfactionWindow,
  SectionConstraintSilentRun,
  Voice,
} from "../events.js";
import { assessHarmonicSonority, hasSupportRole, isMixedEntryTexture } from "./harmonic-sonority-review.js";
import { chordTonePitchClasses, rootDegreeForFunction } from "./harmony.js";
import { beatStrengthAtTick, isCompoundMidpoint, isMeasureDownbeat, previousMeasureDownbeat } from "./meter.js";
import { scaleDegreePitchClass } from "./pitch.js";
import { positiveModulo, roundRatio } from "./shared.js";

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
}): SectionConstraintSatisfactionWindow {
  const gridTicks = inferGridTicks(input.problem);
  const infeasibleConstraintCounts = emptyInfeasibleCounts();
  const intentionalRestSpans = mergeIntentionalRestSpans(input.problem.slots, input.sectionPlan.state);
  const unplannedSilentRuns = mergeSilentRuns(input.problem.slots, input.sectionPlan.state);
  const slotTicks = uniqueSlotStartTicks(input.problem.slots);
  const metricalBoundary = evaluateMetricalBoundary({
    notes: input.notes,
    sectionPlan: input.sectionPlan,
    subjectEntries: input.subjectEntries ?? [],
  });
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

    if (activeVoiceCount === 0) {
      infeasibleConstraintCounts.allVoiceSilence += 1;
    }
    if (activeVoiceCount === 1) {
      infeasibleConstraintCounts.unsupportedSolo += 1;
    }
    if (activeVoiceCount < minRequired) {
      infeasibleConstraintCounts.minActiveVoiceViolation += 1;
    }
  }

  for (const run of unplannedSilentRuns) {
    if (
      !run.planned &&
      run.durationTicks > TICKS_PER_QUARTER * 2 &&
      !isCadentialTick(input.sectionPlan, run.startTick)
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

    addHarmonicQualityCounts(infeasibleConstraintCounts, input.sectionPlan, anchor, activeNotes, gridTicks);
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
    intentionalRestSpans,
    unplannedSilentRuns,
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
    schemaVersion: 3,
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
} {
  const startTick = input.sectionPlan.startTick;
  const endTick = input.sectionPlan.startTick + input.sectionPlan.durationTicks;
  const meterContext = input.sectionPlan.meterContext;
  const offMeasure = !isMeasureDownbeat(startTick, meterContext);
  const endOffMeasure = !isMeasureDownbeat(endTick, meterContext);
  const hasEntryStart = input.subjectEntries.some(
    (entry) => entry.startTick === startTick && entry.state === input.sectionPlan.state,
  );
  const hasHarmonicAnchor = input.sectionPlan.anchors.some(
    (anchor) => anchor.tick === startTick && !anchor.cadenceTarget,
  );
  const boundaryKindCount = 1 + (hasEntryStart ? 1 : 0) + (hasHarmonicAnchor ? 1 : 0);

  if (!offMeasure) {
    const endBoundary = evaluatePhraseBoundaryAtTick(input.notes, input.sectionPlan, endTick);
    return {
      cost: endBoundary.cost,
      offMeasurePhraseBoundaryCount: endOffMeasure ? 1 : 0,
      offMeasureHarmonicAnchorCount: 0,
      offMeasureEntryStartCount: 0,
      unpreparedTransitionCount: endBoundary.unprepared ? 1 : 0,
      preparedPickupCount: endBoundary.prepared ? 1 : 0,
    };
  }

  const endBoundary = evaluatePhraseBoundaryAtTick(input.notes, input.sectionPlan, endTick);
  if (isCompoundMidpoint(startTick, meterContext)) {
    return {
      cost: 1 + endBoundary.cost,
      offMeasurePhraseBoundaryCount: 1 + (endOffMeasure ? 1 : 0),
      offMeasureHarmonicAnchorCount: hasHarmonicAnchor ? 1 : 0,
      offMeasureEntryStartCount: hasEntryStart ? 1 : 0,
      unpreparedTransitionCount: endBoundary.unprepared ? 1 : 0,
      preparedPickupCount: endBoundary.prepared ? 1 : 0,
    };
  }

  if (hasPreparedBoundarySupport(input.notes, input.sectionPlan)) {
    return {
      cost: 2 + endBoundary.cost,
      offMeasurePhraseBoundaryCount: 1 + (endOffMeasure ? 1 : 0),
      offMeasureHarmonicAnchorCount: hasHarmonicAnchor ? 1 : 0,
      offMeasureEntryStartCount: hasEntryStart ? 1 : 0,
      unpreparedTransitionCount: endBoundary.unprepared ? 1 : 0,
      preparedPickupCount: 1 + (endBoundary.prepared ? 1 : 0),
    };
  }

  const baseCost = beatStrengthAtTick(startTick, meterContext) === "offbeat" ? 24 : 14;
  const convergenceCost = boundaryKindCount >= 3 ? 10 : 0;
  return {
    cost: baseCost + convergenceCost + endBoundary.cost,
    offMeasurePhraseBoundaryCount: 1 + (endOffMeasure ? 1 : 0),
    offMeasureHarmonicAnchorCount: hasHarmonicAnchor ? 1 : 0,
    offMeasureEntryStartCount: hasEntryStart ? 1 : 0,
    unpreparedTransitionCount: 1 + (endBoundary.unprepared ? 1 : 0),
    preparedPickupCount: endBoundary.prepared ? 1 : 0,
  };
}

function evaluatePhraseBoundaryAtTick(
  notes: readonly NoteEvent[],
  sectionPlan: HarmonicPlan,
  tick: number,
): { cost: number; prepared: boolean; unprepared: boolean } {
  if (isMeasureDownbeat(tick, sectionPlan.meterContext)) {
    return { cost: 0, prepared: false, unprepared: false };
  }
  if (isCompoundMidpoint(tick, sectionPlan.meterContext)) {
    return { cost: 1, prepared: false, unprepared: false };
  }
  const boundaryPlan = { ...sectionPlan, startTick: tick };
  if (hasPreparedBoundarySupport(notes, boundaryPlan)) {
    return { cost: 2, prepared: true, unprepared: false };
  }
  return {
    cost: beatStrengthAtTick(tick, sectionPlan.meterContext) === "offbeat" ? 24 : 14,
    prepared: false,
    unprepared: true,
  };
}

function hasPreparedBoundarySupport(notes: readonly NoteEvent[], sectionPlan: HarmonicPlan): boolean {
  const startTick = sectionPlan.startTick;
  const measureStartTick = previousMeasureDownbeat(startTick, sectionPlan.meterContext);
  const measureEndTick = measureStartTick + sectionPlan.meterContext.measureTicks;
  const nextDownbeatTick = measureEndTick;
  const heldSupportVoices = notes.filter(
    (note) => note.startTick < startTick && startTick < note.startTick + note.durationTicks,
  );
  const sustainedPickupVoices = notes.filter(
    (note) => note.startTick === startTick && note.startTick + note.durationTicks > nextDownbeatTick,
  );

  return (
    heldSupportVoices.length > 0 ||
    heldSupportVoices.some((note) => note.metricalHarmonyIntent === "strong-non-chord-tone") ||
    sustainedPickupVoices.length >= 2 ||
    hasCadentialBoundarySupport(sectionPlan) ||
    hasDirectedBoundaryContour(notes, sectionPlan, measureStartTick, measureEndTick)
  );
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
): void {
  const sonority = assessHarmonicSonority(activeNotes, sectionPlan, anchor, anchor.tick, gridTicks);
  if (sonority?.classification === "non-chord-structural-support") {
    counts.nonChordStructuralSupportCount += sonority.structuralIntentMismatchCount;
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
    structuralChordSupportMiss: 0,
    structuralRootSupportMiss: 0,
    nonChordStructuralSupportCount: 0,
    thinUnrootedStructuralSupportCount: 0,
    pitchClassDoublingOnlyCount: 0,
    mixedEntryHarmonicRiskCount: 0,
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
      structuralChordSupportMiss: sum.structuralChordSupportMiss + count.structuralChordSupportMiss,
      structuralRootSupportMiss: sum.structuralRootSupportMiss + count.structuralRootSupportMiss,
      nonChordStructuralSupportCount: sum.nonChordStructuralSupportCount + count.nonChordStructuralSupportCount,
      thinUnrootedStructuralSupportCount:
        sum.thinUnrootedStructuralSupportCount + count.thinUnrootedStructuralSupportCount,
      pitchClassDoublingOnlyCount: sum.pitchClassDoublingOnlyCount + count.pitchClassDoublingOnlyCount,
      mixedEntryHarmonicRiskCount: sum.mixedEntryHarmonicRiskCount + count.mixedEntryHarmonicRiskCount,
    }),
    emptyInfeasibleCounts(),
  );
}

function relaxationLevel(counts: SectionConstraintInfeasibleCounts): SectionConstraintRelaxationLevel {
  const densityFailures =
    counts.minActiveVoiceViolation + counts.unsupportedSolo + counts.allVoiceSilence + counts.longUnplannedSilentRun;
  const structuralFailures = counts.nonChordStructuralSupportCount;
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
    counts.nonChordStructuralSupportCount
  );
}

export function sectionConstraintSoftCost(window: SectionConstraintSatisfactionWindow): number {
  const counts = window.infeasibleConstraintCounts;
  return roundRatio(
    counts.minActiveVoiceViolation * 2 +
      counts.unsupportedSolo * 6 +
      counts.allVoiceSilence * 8 +
      counts.longUnplannedSilentRun * 5 +
      counts.structuralChordSupportMiss * 4 +
      counts.structuralRootSupportMiss * 6 +
      counts.thinUnrootedStructuralSupportCount * 3 +
      counts.pitchClassDoublingOnlyCount * 4 +
      counts.mixedEntryHarmonicRiskCount * 5,
  );
}
