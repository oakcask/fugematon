import { TICKS_PER_QUARTER } from "../constants.js";
import type {
  HarmonicPlan,
  NoteEvent,
  NoteRole,
  PlannedEntry,
  TransitionRhythmReviewSummary,
  TransitionRhythmSupportKind,
  TransitionRhythmWindow,
  Voice,
} from "../events.js";
import { beatStrengthAtTick, isMeasureDownbeat, measureOffsetTicks, previousMeasureDownbeat } from "./meter.js";

const TRANSITION_RHYTHM_WINDOW_LIMIT = 48;

export function analyzeTransitionRhythm(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  sectionPlans: readonly HarmonicPlan[],
): TransitionRhythmReviewSummary {
  const windows = sectionPlans
    .slice(0, 16)
    .filter((plan): plan is HarmonicPlan & { state: "episode" } => plan.state === "episode")
    .map((plan) => transitionWindowForPlan(notes, subjectEntries, plan))
    .filter((window): window is TransitionRhythmWindow => window !== undefined);

  return {
    schemaVersion: 1,
    focusedWindowCount: windows.length,
    preparedPickupWindowCount: windows.filter((window) => window.classification === "prepared-pickup").length,
    meterConfirmingWindowCount: windows.filter((window) => window.classification === "meter-confirming").length,
    reviewRequiredWindowCount: windows.filter((window) => window.classification === "review-required").length,
    windows: windows.slice(0, TRANSITION_RHYTHM_WINDOW_LIMIT),
  };
}

function transitionWindowForPlan(
  notes: readonly NoteEvent[],
  subjectEntries: readonly PlannedEntry[],
  plan: HarmonicPlan & { state: "episode" },
): TransitionRhythmWindow | undefined {
  const boundaryKinds = transitionBoundaryKinds(subjectEntries, plan);
  if (boundaryKinds.length < 2) {
    return undefined;
  }

  const measureStartTick = previousMeasureDownbeat(plan.startTick, plan.meterContext);
  const measureEndTick = measureStartTick + plan.meterContext.measureTicks;
  const measureNotes = notes.filter(
    (note) => note.startTick < measureEndTick && note.startTick + note.durationTicks > measureStartTick,
  );
  const attackNotes = notes.filter((note) => measureStartTick <= note.startTick && note.startTick < measureEndTick);
  const activeVoices = uniqueSortedVoices(measureNotes.map((note) => note.voice));
  const roleMix = uniqueRoles(measureNotes);
  const supportKinds = transitionSupportKinds(notes, plan, measureStartTick, measureEndTick);
  const classification = classifyTransitionRhythm(plan, supportKinds);

  return {
    startTick: plan.startTick,
    durationTicks: plan.meterContext.measureTicks,
    measureStartTick,
    measureOffsetTicks: measureOffsetTicks(plan.startTick, plan.meterContext),
    beatStrength: beatStrengthAtTick(plan.startTick, plan.meterContext),
    state: plan.state,
    boundaryKinds,
    attackCount: attackNotes.length,
    shortAttackCount: attackNotes.filter((note) => note.durationTicks <= TICKS_PER_QUARTER / 2).length,
    activeVoiceCount: activeVoices.length,
    activeVoices,
    roleMix,
    supportKinds,
    classification,
    response: classification === "review-required" ? "review-required" : "accepted-context",
  };
}

function transitionBoundaryKinds(
  subjectEntries: readonly PlannedEntry[],
  plan: HarmonicPlan,
): TransitionRhythmWindow["boundaryKinds"] {
  const boundaryKinds: TransitionRhythmWindow["boundaryKinds"] = ["phrase-boundary"];
  if (subjectEntries.some((entry) => entry.startTick === plan.startTick && entry.state === plan.state)) {
    boundaryKinds.push("entry-start");
  }
  if (plan.anchors.some((anchor) => anchor.tick === plan.startTick && !anchor.cadenceTarget)) {
    boundaryKinds.push("harmonic-anchor");
  }
  return boundaryKinds;
}

function transitionSupportKinds(
  notes: readonly NoteEvent[],
  plan: HarmonicPlan,
  measureStartTick: number,
  measureEndTick: number,
): TransitionRhythmSupportKind[] {
  const supportKinds = new Set<TransitionRhythmSupportKind>();
  const nextDownbeatTick = measureStartTick + plan.meterContext.measureTicks;
  const heldSupportVoices = notes.filter(
    (note) => note.startTick < plan.startTick && plan.startTick < note.startTick + note.durationTicks,
  );
  const sustainedPickupVoices = notes.filter(
    (note) => note.startTick === plan.startTick && note.startTick + note.durationTicks > nextDownbeatTick,
  );

  if (heldSupportVoices.length > 0) {
    supportKinds.add("held-support");
  }
  if (heldSupportVoices.some((note) => note.metricalHarmonyIntent === "strong-non-chord-tone")) {
    supportKinds.add("suspension-support");
  }
  if (sustainedPickupVoices.length >= 2) {
    supportKinds.add("sustained-pickup");
  }
  if (hasCadentialSupport(plan)) {
    supportKinds.add("cadential-support");
  }
  if (hasDirectedContour(notes, plan, measureStartTick, measureEndTick)) {
    supportKinds.add("directed-contour");
  }

  return [...supportKinds];
}

function classifyTransitionRhythm(
  plan: HarmonicPlan,
  supportKinds: readonly TransitionRhythmSupportKind[],
): TransitionRhythmWindow["classification"] {
  if (isMeasureDownbeat(plan.startTick, plan.meterContext)) {
    return "meter-confirming";
  }
  if (beatStrengthAtTick(plan.startTick, plan.meterContext) === "offbeat") {
    return "review-required";
  }
  if (supportKinds.length > 0 && supportKinds.includes("sustained-pickup")) {
    return "prepared-pickup";
  }
  if (
    supportKinds.includes("held-support") ||
    supportKinds.includes("cadential-support") ||
    supportKinds.includes("suspension-support") ||
    supportKinds.includes("directed-contour")
  ) {
    return "prepared-pickup";
  }
  return "review-required";
}

function hasCadentialSupport(plan: HarmonicPlan): boolean {
  return plan.anchors.some(
    (anchor) =>
      anchor.cadenceTarget &&
      anchor.tick < plan.startTick &&
      plan.startTick - anchor.tick <= plan.meterContext.strongBeatIntervalTicks,
  );
}

function hasDirectedContour(
  notes: readonly NoteEvent[],
  plan: HarmonicPlan,
  measureStartTick: number,
  measureEndTick: number,
): boolean {
  return uniqueSortedVoices(notes.map((note) => note.voice)).some((voice) => {
    const attacks = notes
      .filter(
        (note) =>
          note.voice === voice &&
          measureStartTick <= note.startTick &&
          note.startTick < measureEndTick &&
          note.startTick <= plan.startTick,
      )
      .sort((left, right) => left.startTick - right.startTick || left.pitch - right.pitch);
    const last = attacks.at(-1);
    const previous = attacks.at(-2);
    if (last === undefined || previous === undefined || last.startTick !== plan.startTick) {
      return false;
    }
    const interval = Math.abs(last.pitch - previous.pitch);
    return interval > 0 && interval <= 5;
  });
}

function uniqueSortedVoices(voices: readonly Voice[]): Voice[] {
  const order: Record<Voice, number> = { soprano: 0, alto: 1, tenor: 2, bass: 3 };
  return [...new Set(voices)].sort((left, right) => order[left] - order[right]);
}

function uniqueRoles(notes: readonly NoteEvent[]): NoteRole[] {
  const roles = notes.flatMap((note) => (note.role === undefined ? [] : [note.role]));
  return [...new Set(roles)];
}
