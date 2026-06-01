import { TICKS_PER_QUARTER, VOICE_RANGES } from "../constants.js";
import type {
  CadenceKind,
  GenerationInput,
  HarmonicPlan,
  NoteEvent,
  ScoreEvent,
  TerminalClosureClassification,
  TerminalClosureFinalRestClassification,
  TerminalClosureOuterVoiceLandingStatus,
  TerminalClosurePreparedReentryStatus,
  TerminalClosureReviewSummary,
  TerminalClosureReviewWindow,
  TerminalClosureSource,
  TerminalClosureSupportStatus,
  TerminalClosureThinningExplanation,
  TerminalCodaContinuityClassification,
  TerminalCodaContinuitySummary,
  TerminalCodaPedalClassification,
  Voice,
} from "../events.js";
import type { InfinitePlaybackMode } from "../infinite-playback.js";
import { chordTonePitchClasses } from "./harmony.js";
import { isModalMode } from "./key.js";
import { scaleDegreePitchClass } from "./pitch.js";
import type { FugueScore } from "./types.js";

const TERMINAL_CLOSURE_SCHEMA_VERSION = 3;
const TERMINAL_CHORD_DURATION_TICKS = TICKS_PER_QUARTER;
const SEVERE_DISSONANCE_CLASSES = new Set([1, 2, 10, 11]);

type TerminalClosureIntentMode = Extract<InfinitePlaybackMode, "endless-program" | "regenerative-cycle">;

export function appliesTerminalClosureIntent(mode: InfinitePlaybackMode): mode is TerminalClosureIntentMode {
  return mode === "endless-program" || mode === "regenerative-cycle";
}

export function applyTerminalClosureIntent(score: FugueScore, lengthTicks: number, mode: InfinitePlaybackMode): void {
  if (!appliesTerminalClosureIntent(mode)) {
    return;
  }

  const finalPlan = score.sectionPlans.at(-1);
  if (finalPlan === undefined) {
    return;
  }

  const finalStartTick = Math.max(0, lengthTicks - TERMINAL_CHORD_DURATION_TICKS);
  if (mode === "endless-program" && finalPlan.terminalIntent === "self-contained-coda") {
    score.endTick = Math.max(score.endTick, lengthTicks);
    return;
  }

  finalPlan.durationTicks = Math.max(finalPlan.durationTicks, lengthTicks - finalPlan.startTick);
  finalPlan.cadenceKind = isModalMode(finalPlan.targetKey.mode) ? "modal" : "authentic";
  finalPlan.ambiguityIntent = "none";
  finalPlan.ambiguityRecoveryTick = undefined;
  finalPlan.terminalIntent = mode === "regenerative-cycle" ? "bridge-compatible-closure" : "fallback-terminal-closure";
  finalPlan.anchors = [
    ...finalPlan.anchors.filter((anchor) => !anchor.cadenceTarget),
    {
      tick: finalStartTick,
      localKey: finalPlan.targetKey,
      function: "cadential-tonic" as const,
      cadenceTarget: true,
    },
  ].sort((left, right) => left.tick - right.tick);

  const clippedNotes = score.notes.flatMap((note): NoteEvent[] => {
    if (note.startTick >= finalStartTick) {
      return [];
    }
    const noteEndTick = note.startTick + note.durationTicks;
    if (noteEndTick <= finalStartTick) {
      return [note];
    }
    const durationTicks = finalStartTick - note.startTick;
    return durationTicks > 0 ? [{ ...note, durationTicks }] : [];
  });
  const terminalNotes = buildTerminalSonorityNotes(finalPlan, finalStartTick, TERMINAL_CHORD_DURATION_TICKS);

  score.notes.splice(0, score.notes.length, ...clippedNotes, ...terminalNotes);
  score.endTick = Math.max(score.endTick, lengthTicks);
}

export function buildTerminalClosureReviewSummary(input: {
  events: readonly ScoreEvent[];
  sectionPlans: readonly HarmonicPlan[];
  mode: InfinitePlaybackMode;
  segmentIndex: number;
}): TerminalClosureReviewSummary {
  const notes = input.events.filter((event): event is NoteEvent => event.kind === "note");
  const endTick = scoreEndTick(input.events, notes);
  const measureTicks = input.sectionPlans.at(-1)?.meterContext.measureTicks ?? TICKS_PER_QUARTER * 4;
  const inspectedTickRange = {
    startTick: Math.max(0, endTick - measureTicks * 4),
    endTick,
  };

  const terminalAnchor = findTerminalCadenceAnchor(input.sectionPlans, inspectedTickRange.startTick);
  const terminalPlan = terminalAnchor?.plan;
  const terminalCadenceKind = terminalPlan?.cadenceKind;
  const cadenceTargetTick = terminalAnchor?.tick;
  const terminalTick = cadenceTargetTick ?? Math.max(0, endTick - 1);
  const terminalClosureSource = classifyTerminalClosureSource(input.mode, terminalPlan);
  const codaStartTick = terminalPlan?.terminalIntent === "self-contained-coda" ? terminalPlan.startTick : undefined;
  const activeAtTerminal = activeNotesAt(notes, terminalTick);
  const targetKey = terminalAnchor?.localKey ?? terminalPlan?.targetKey ?? input.sectionPlans.at(-1)?.targetKey;
  const chordPitchClasses = targetKey === undefined ? [] : chordTonePitchClasses(targetKey, "cadential-tonic");
  const rootPitchClass = targetKey === undefined ? undefined : scaleDegreePitchClass(0, 0, targetKey);
  const lowVoiceSupport = classifyLowVoiceSupport(activeAtTerminal, chordPitchClasses, rootPitchClass);
  const outerVoiceLandingStatus = classifyOuterVoiceLanding(activeAtTerminal, chordPitchClasses);
  const unresolvedBoundaryDissonanceCount = countUnresolvedBoundaryDissonances(activeAtTerminal, chordPitchClasses);
  const thinningExplanation = classifyThinning(notes, inspectedTickRange.startTick, terminalTick, activeAtTerminal);
  const finalRestClassification = classifyFinalRest(notes, endTick, terminalTick, terminalCadenceKind, lowVoiceSupport);
  const finalAttackReentryVoiceCount = countFinalAttackReentryVoices({
    notes,
    activeAtTerminal,
    terminalTick,
    preparedStartTick: codaStartTick ?? inspectedTickRange.startTick,
  });
  const preparedVoiceReentry = classifyPreparedVoiceReentry({
    source: terminalClosureSource,
    finalAttackReentryVoiceCount,
  });
  const terminalCadenceClassification = classifyTerminalClosure({
    mode: input.mode,
    terminalCadenceKind,
    lowVoiceSupport,
    outerVoiceLandingStatus,
    unresolvedBoundaryDissonanceCount,
    thinningExplanation,
    finalRestClassification,
  });
  const codaContinuity = buildTerminalCodaContinuitySummary({
    notes,
    terminalPlan,
    terminalClosureSource,
    codaStartTick,
    cadenceTargetTick,
    endTick,
    measureTicks,
  });
  const classification = combineTerminalClosureClassification(terminalCadenceClassification, codaContinuity);
  const cadenceReasons = terminalClosureReasons({
    mode: input.mode,
    terminalCadenceKind,
    lowVoiceSupport,
    outerVoiceLandingStatus,
    unresolvedBoundaryDissonanceCount,
    thinningExplanation,
    finalRestClassification,
  });
  const reasons =
    codaContinuity.classification === "review-required"
      ? [...cadenceReasons, ...codaContinuity.reasons]
      : cadenceReasons;

  return {
    schemaVersion: TERMINAL_CLOSURE_SCHEMA_VERSION,
    segmentIndex: input.segmentIndex,
    inspectedTickRange,
    terminalCadenceKind,
    cadenceTargetTick,
    terminalClosureSource,
    codaStartTick,
    preparedVoiceReentry,
    finalAttackReentryVoiceCount,
    lowVoiceSupport,
    outerVoiceLandingStatus,
    unresolvedBoundaryDissonanceCount,
    thinningExplanation,
    finalRestClassification,
    codaContinuity,
    classification,
    windows: terminalClosureWindows({
      inspectedTickRange,
      terminalTick,
      endTick,
      activeAtTerminal,
      codaStartTick,
      codaContinuity,
      preparedVoiceReentry,
      finalAttackReentryVoiceCount,
      classification,
      reasons,
    }),
    reasons,
  };
}

function classifyTerminalClosureSource(
  mode: InfinitePlaybackMode,
  terminalPlan: HarmonicPlan | undefined,
): TerminalClosureSource {
  if (!appliesTerminalClosureIntent(mode)) {
    return "not-required";
  }
  if (terminalPlan?.terminalIntent === "self-contained-coda") {
    return "generated-coda";
  }
  if (terminalPlan?.terminalIntent === "fallback-terminal-closure") {
    return "fallback-terminal-closure";
  }
  if (terminalPlan?.terminalIntent === "bridge-compatible-closure") {
    return "bridge-compatible-closure";
  }
  return "ordinary-terminal-cadence";
}

function buildTerminalSonorityNotes(plan: HarmonicPlan, startTick: number, durationTicks: number): NoteEvent[] {
  const voiceDegrees: Record<Voice, number> = {
    soprano: 0,
    alto: 2,
    tenor: 4,
    bass: 0,
  };
  const targetPitches: Record<Voice, number> = {
    soprano: 72,
    alto: 64,
    tenor: 55,
    bass: 48,
  };

  return (["bass", "tenor", "alto", "soprano"] as const).map((voice) => ({
    kind: "note",
    voice,
    startTick,
    durationTicks,
    pitch: nearestPitchForPitchClass({
      pitchClass: scaleDegreePitchClass(voiceDegrees[voice], 0, plan.targetKey),
      targetPitch: targetPitches[voice],
      voice,
    }),
    velocity: voice === "bass" ? 78 : 70,
    role: "free-counterpoint",
    metricalHarmonyIntent: voice === "bass" ? "structural-root-support" : "structural-chord-tone",
    motivicDerivation: {
      sourceMotive: "cadence-figure",
      transformationKind: "cadential-continuation",
      targetFunction: "extend-cadence",
      sequenceDirection: "none",
      preparesNextEntry: false,
      preparesCadence: true,
    },
  }));
}

function nearestPitchForPitchClass(input: { pitchClass: number; targetPitch: number; voice: Voice }): number {
  const range = VOICE_RANGES[input.voice];
  let bestPitch = range.min;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let pitch = range.min; pitch <= range.max; pitch += 1) {
    if (positiveModulo(pitch, 12) !== input.pitchClass) {
      continue;
    }
    const distance = Math.abs(pitch - input.targetPitch);
    if (distance < bestDistance) {
      bestPitch = pitch;
      bestDistance = distance;
    }
  }
  return bestPitch;
}

function findTerminalCadenceAnchor(
  sectionPlans: readonly HarmonicPlan[],
  inspectedStartTick: number,
): ({ plan: HarmonicPlan } & HarmonicPlan["anchors"][number]) | undefined {
  return sectionPlans
    .flatMap((plan) =>
      plan.anchors
        .filter((anchor) => anchor.cadenceTarget && anchor.tick >= inspectedStartTick)
        .map((anchor) => ({ ...anchor, plan })),
    )
    .sort((left, right) => right.tick - left.tick)[0];
}

function classifyLowVoiceSupport(
  activeNotes: readonly NoteEvent[],
  chordPitchClasses: readonly number[],
  rootPitchClass: number | undefined,
): TerminalClosureSupportStatus {
  const lowNote =
    activeNotes.find((note) => note.voice === "bass") ??
    activeNotes.find((note) => note.voice === "tenor") ??
    [...activeNotes].filter((note) => note.pitch < 60).sort((left, right) => left.pitch - right.pitch)[0];
  if (lowNote === undefined || rootPitchClass === undefined) {
    return "missing";
  }

  const pitchClass = positiveModulo(lowNote.pitch, 12);
  if (pitchClass === rootPitchClass) {
    return "root-supported";
  }
  if (chordPitchClasses.includes(pitchClass)) {
    return "stable-chord-tone";
  }
  return "unsupported";
}

function classifyOuterVoiceLanding(
  activeNotes: readonly NoteEvent[],
  chordPitchClasses: readonly number[],
): TerminalClosureOuterVoiceLandingStatus {
  const bass = activeNotes.find((note) => note.voice === "bass");
  const soprano = activeNotes.find((note) => note.voice === "soprano");
  if (bass === undefined || soprano === undefined) {
    return "missing";
  }

  const bassStable = chordPitchClasses.includes(positiveModulo(bass.pitch, 12));
  const sopranoStable = chordPitchClasses.includes(positiveModulo(soprano.pitch, 12));
  if (bassStable && sopranoStable) {
    return "stable";
  }
  return bassStable || sopranoStable ? "review-required" : "unstable";
}

function countUnresolvedBoundaryDissonances(
  activeNotes: readonly NoteEvent[],
  chordPitchClasses: readonly number[],
): number {
  let count = activeNotes.filter((note) => !chordPitchClasses.includes(positiveModulo(note.pitch, 12))).length;
  for (let leftIndex = 0; leftIndex < activeNotes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < activeNotes.length; rightIndex += 1) {
      const left = activeNotes[leftIndex];
      const right = activeNotes[rightIndex];
      if (left === undefined || right === undefined) {
        continue;
      }
      const intervalClass = positiveModulo(left.pitch - right.pitch, 12);
      if (SEVERE_DISSONANCE_CLASSES.has(intervalClass)) {
        count += 1;
      }
    }
  }
  return count;
}

function classifyThinning(
  notes: readonly NoteEvent[],
  inspectedStartTick: number,
  terminalTick: number,
  activeAtTerminal: readonly NoteEvent[],
): TerminalClosureThinningExplanation {
  const priorCheckpoint = Math.max(inspectedStartTick, terminalTick - TICKS_PER_QUARTER * 2);
  const priorActiveVoiceCount = Math.max(
    ...[priorCheckpoint, Math.max(inspectedStartTick, terminalTick - TICKS_PER_QUARTER)].map(
      (tick) => new Set(activeNotesAt(notes, tick).map((note) => note.voice)).size,
    ),
    0,
  );
  const terminalVoiceCount = new Set(activeAtTerminal.map((note) => note.voice)).size;

  if (terminalVoiceCount >= 3) {
    return "cadence-support";
  }
  if (terminalVoiceCount === 2 && priorActiveVoiceCount >= 3) {
    return "prepared-reduction";
  }
  if (terminalVoiceCount === priorActiveVoiceCount) {
    return "not-thinned";
  }
  return "unsupported-collapse";
}

function classifyFinalRest(
  notes: readonly NoteEvent[],
  endTick: number,
  terminalTick: number,
  terminalCadenceKind: CadenceKind | undefined,
  lowVoiceSupport: TerminalClosureSupportStatus,
): TerminalClosureFinalRestClassification {
  const lastNoteEndTick = Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
  if (lastNoteEndTick >= endTick) {
    return "none";
  }

  const stableTerminal =
    terminalCadenceKind !== undefined &&
    ["authentic", "modal"].includes(terminalCadenceKind) &&
    lowVoiceSupport !== "missing" &&
    lowVoiceSupport !== "unsupported" &&
    terminalTick <= lastNoteEndTick;
  return stableTerminal ? "piece-boundary" : "silence-failure";
}

function countFinalAttackReentryVoices(input: {
  notes: readonly NoteEvent[];
  activeAtTerminal: readonly NoteEvent[];
  terminalTick: number;
  preparedStartTick: number;
}): number {
  const voices = new Set<Voice>();
  for (const note of input.activeAtTerminal) {
    if (note.startTick !== input.terminalTick) {
      continue;
    }
    const preparedEarlier = input.notes.some(
      (candidate) =>
        candidate.voice === note.voice &&
        candidate.startTick >= input.preparedStartTick &&
        candidate.startTick < input.terminalTick &&
        candidate.startTick + candidate.durationTicks >= input.terminalTick - TICKS_PER_QUARTER,
    );
    if (!preparedEarlier) {
      voices.add(note.voice);
    }
  }
  return voices.size;
}

function classifyPreparedVoiceReentry(input: {
  source: TerminalClosureSource;
  finalAttackReentryVoiceCount: number;
}): TerminalClosurePreparedReentryStatus {
  if (input.source !== "generated-coda") {
    return "not-applicable";
  }
  return input.finalAttackReentryVoiceCount === 0 ? "prepared" : "sudden-final-attack";
}

function buildTerminalCodaContinuitySummary(input: {
  notes: readonly NoteEvent[];
  terminalPlan: HarmonicPlan | undefined;
  terminalClosureSource: TerminalClosureSource;
  codaStartTick: number | undefined;
  cadenceTargetTick: number | undefined;
  endTick: number;
  measureTicks: number;
}): TerminalCodaContinuitySummary {
  if (
    input.terminalClosureSource !== "generated-coda" ||
    input.terminalPlan?.terminalCodaContext === undefined ||
    input.codaStartTick === undefined ||
    input.cadenceTargetTick === undefined
  ) {
    return {
      schemaVersion: 1,
      classification: "not-applicable",
      longestAllVoiceStaticSpanTicks: 0,
      longestNonTerminalHeldSpanTicks: 0,
      movingVoiceCountBeforeCadence: 0,
      derivationCount: 0,
      pedalClassification: "not-pedal",
      reasons: ["terminal coda continuity is not applicable to this boundary source"],
    };
  }

  const preCadenceNotes = input.notes.filter(
    (note) =>
      note.startTick < input.cadenceTargetTick! &&
      note.startTick + note.durationTicks > input.codaStartTick! &&
      note.startTick < input.endTick,
  );
  const movingVoiceCountBeforeCadence = countMovingVoicesBeforeCadence(
    preCadenceNotes,
    input.codaStartTick,
    input.cadenceTargetTick,
  );
  const derivationCount = preCadenceNotes.filter(
    (note) => note.motivicDerivation !== undefined && note.motivicDerivation.transformationKind !== "generic",
  ).length;
  const topDerivationSource = computeTopDerivationSource(preCadenceNotes);
  const longestNonTerminalHeldSpanTicks = longestNonTerminalHeldSpan(
    preCadenceNotes,
    input.codaStartTick,
    input.cadenceTargetTick,
  );
  const longestAllVoiceStaticSpanTicks = longestAllVoiceStaticSpan(
    preCadenceNotes,
    input.codaStartTick,
    input.cadenceTargetTick,
  );
  const pedalClassification = classifyTerminalCodaPedal({
    notes: preCadenceNotes,
    plan: input.terminalPlan,
    codaStartTick: input.codaStartTick,
    cadenceTargetTick: input.cadenceTargetTick,
    movingVoiceCountBeforeCadence,
    derivationCount,
  });
  const classification = classifyTerminalCodaContinuity({
    derivationCount,
    movingVoiceCountBeforeCadence,
    longestAllVoiceStaticSpanTicks,
    preparedSpanTicks: input.cadenceTargetTick - input.codaStartTick,
    measureTicks: input.measureTicks,
  });
  const reasons = terminalCodaContinuityReasons({
    classification,
    derivationCount,
    movingVoiceCountBeforeCadence,
    longestAllVoiceStaticSpanTicks,
    topDerivationSource,
    archetype: input.terminalPlan.terminalCodaContext.archetype,
  });

  return {
    schemaVersion: 1,
    classification,
    codaArchetype: input.terminalPlan.terminalCodaContext.archetype,
    selectionReason: input.terminalPlan.terminalCodaContext.selectionReason,
    longestAllVoiceStaticSpanTicks,
    longestNonTerminalHeldSpanTicks,
    movingVoiceCountBeforeCadence,
    derivationCount,
    topDerivationSource,
    pedalClassification,
    reasons,
  };
}

function countMovingVoicesBeforeCadence(
  notes: readonly NoteEvent[],
  codaStartTick: number,
  cadenceTargetTick: number,
): number {
  let movingVoiceCount = 0;
  for (const voice of ["bass", "tenor", "alto", "soprano"] as const) {
    const starts = new Set(
      notes
        .filter((note) => note.voice === voice && note.startTick >= codaStartTick && note.startTick < cadenceTargetTick)
        .map((note) => note.startTick),
    );
    if (starts.size >= 2) {
      movingVoiceCount += 1;
    }
  }
  return movingVoiceCount;
}

function computeTopDerivationSource(
  notes: readonly NoteEvent[],
): NonNullable<NoteEvent["motivicDerivation"]>["sourceMotive"] | undefined {
  const counts = new Map<NonNullable<NoteEvent["motivicDerivation"]>["sourceMotive"], number>();
  for (const note of notes) {
    const source = note.motivicDerivation?.sourceMotive;
    if (source === undefined || note.motivicDerivation?.transformationKind === "generic") {
      continue;
    }
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0];
}

function longestNonTerminalHeldSpan(
  notes: readonly NoteEvent[],
  codaStartTick: number,
  cadenceTargetTick: number,
): number {
  return Math.max(
    0,
    ...notes.map(
      (note) =>
        Math.min(cadenceTargetTick, note.startTick + note.durationTicks) - Math.max(codaStartTick, note.startTick),
    ),
  );
}

function longestAllVoiceStaticSpan(
  notes: readonly NoteEvent[],
  codaStartTick: number,
  cadenceTargetTick: number,
): number {
  const boundaryTicks = [
    codaStartTick,
    cadenceTargetTick,
    ...notes.flatMap((note) => [
      Math.max(codaStartTick, note.startTick),
      Math.min(cadenceTargetTick, note.startTick + note.durationTicks),
    ]),
  ]
    .filter((tick) => tick >= codaStartTick && tick <= cadenceTargetTick)
    .sort((left, right) => left - right);
  const uniqueBoundaryTicks = [...new Set(boundaryTicks)];
  let longest = 0;
  let current = 0;

  for (let index = 0; index < uniqueBoundaryTicks.length - 1; index += 1) {
    const startTick = uniqueBoundaryTicks[index]!;
    const endTick = uniqueBoundaryTicks[index + 1]!;
    if (endTick <= startTick) {
      continue;
    }
    const activeNotes = notes.filter(
      (note) => note.startTick <= startTick && note.startTick + note.durationTicks >= endTick,
    );
    const allVoicesStatic = new Set(activeNotes.map((note) => note.voice)).size >= 4;
    if (allVoicesStatic) {
      current += endTick - startTick;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return longest;
}

function classifyTerminalCodaPedal(input: {
  notes: readonly NoteEvent[];
  plan: HarmonicPlan;
  codaStartTick: number;
  cadenceTargetTick: number;
  movingVoiceCountBeforeCadence: number;
  derivationCount: number;
}): TerminalCodaPedalClassification {
  const rootPitchClass = scaleDegreePitchClass(0, 0, input.plan.targetKey);
  const preparedSpanTicks = input.cadenceTargetTick - input.codaStartTick;
  const bassRootTicks = input.notes.reduce((sum, note) => {
    if (note.voice !== "bass" || positiveModulo(note.pitch, 12) !== rootPitchClass) {
      return sum;
    }
    return (
      sum +
      Math.max(
        0,
        Math.min(input.cadenceTargetTick, note.startTick + note.durationTicks) -
          Math.max(input.codaStartTick, note.startTick),
      )
    );
  }, 0);

  if (
    bassRootTicks >= preparedSpanTicks * 0.75 &&
    input.derivationCount === 0 &&
    input.movingVoiceCountBeforeCadence <= 1
  ) {
    return "generic-static-support";
  }
  if (bassRootTicks >= preparedSpanTicks * 0.45 && input.movingVoiceCountBeforeCadence >= 2) {
    return "prepared-pedal";
  }
  if (bassRootTicks > 0) {
    return "cadence-support";
  }
  return "not-pedal";
}

function classifyTerminalCodaContinuity(input: {
  derivationCount: number;
  movingVoiceCountBeforeCadence: number;
  longestAllVoiceStaticSpanTicks: number;
  preparedSpanTicks: number;
  measureTicks: number;
}): TerminalCodaContinuityClassification {
  if (
    input.derivationCount === 0 ||
    input.movingVoiceCountBeforeCadence === 0 ||
    input.longestAllVoiceStaticSpanTicks >= Math.min(input.measureTicks, input.preparedSpanTicks)
  ) {
    return "review-required";
  }
  return "accepted";
}

function terminalCodaContinuityReasons(input: {
  classification: TerminalCodaContinuityClassification;
  derivationCount: number;
  movingVoiceCountBeforeCadence: number;
  longestAllVoiceStaticSpanTicks: number;
  topDerivationSource: NonNullable<NoteEvent["motivicDerivation"]>["sourceMotive"] | undefined;
  archetype: string;
}): string[] {
  const reasons: string[] = [];
  if (input.derivationCount === 0) {
    reasons.push(
      "generated coda has no review-visible recent-material or cadence-figure derivation before the landing",
    );
  }
  if (input.movingVoiceCountBeforeCadence === 0) {
    reasons.push("generated coda has no moving voice before the terminal landing");
  }
  if (input.longestAllVoiceStaticSpanTicks > 0) {
    reasons.push(`longest all-voice static span before the landing is ${input.longestAllVoiceStaticSpanTicks} ticks`);
  }
  if (reasons.length === 0) {
    reasons.push(
      `generated coda uses ${input.archetype} with ${input.derivationCount} derived pre-cadence note(s), led by ${
        input.topDerivationSource ?? "mixed material"
      }`,
    );
  }
  return reasons;
}

function combineTerminalClosureClassification(
  terminalCadenceClassification: TerminalClosureClassification,
  codaContinuity: TerminalCodaContinuitySummary,
): TerminalClosureClassification {
  if (
    terminalCadenceClassification === "not-required" ||
    terminalCadenceClassification === "generator-response-required"
  ) {
    return terminalCadenceClassification;
  }
  if (codaContinuity.classification === "review-required") {
    return "review-required";
  }
  return terminalCadenceClassification;
}

function classifyTerminalClosure(input: {
  mode: InfinitePlaybackMode;
  terminalCadenceKind: CadenceKind | undefined;
  lowVoiceSupport: TerminalClosureSupportStatus;
  outerVoiceLandingStatus: TerminalClosureOuterVoiceLandingStatus;
  unresolvedBoundaryDissonanceCount: number;
  thinningExplanation: TerminalClosureThinningExplanation;
  finalRestClassification: TerminalClosureFinalRestClassification;
}): TerminalClosureClassification {
  if (!appliesTerminalClosureIntent(input.mode)) {
    return "not-required";
  }
  if (input.terminalCadenceKind === undefined) {
    return "generator-response-required";
  }
  if (!["authentic", "modal"].includes(input.terminalCadenceKind)) {
    return hasStableFinalSonority(input) ? "review-required" : "generator-response-required";
  }
  if (
    input.lowVoiceSupport === "missing" ||
    input.lowVoiceSupport === "unsupported" ||
    input.outerVoiceLandingStatus === "missing" ||
    input.outerVoiceLandingStatus === "unstable" ||
    input.unresolvedBoundaryDissonanceCount > 0 ||
    input.thinningExplanation === "unsupported-collapse" ||
    input.finalRestClassification === "silence-failure"
  ) {
    return "generator-response-required";
  }
  if (
    input.lowVoiceSupport === "stable-chord-tone" ||
    input.outerVoiceLandingStatus === "review-required" ||
    input.thinningExplanation === "prepared-reduction"
  ) {
    return "review-required";
  }
  return "accepted";
}

function hasStableFinalSonority(input: {
  lowVoiceSupport: TerminalClosureSupportStatus;
  outerVoiceLandingStatus: TerminalClosureOuterVoiceLandingStatus;
  unresolvedBoundaryDissonanceCount: number;
}): boolean {
  return (
    input.lowVoiceSupport !== "missing" &&
    input.lowVoiceSupport !== "unsupported" &&
    input.outerVoiceLandingStatus !== "missing" &&
    input.outerVoiceLandingStatus !== "unstable" &&
    input.unresolvedBoundaryDissonanceCount === 0
  );
}

function terminalClosureReasons(input: {
  mode: InfinitePlaybackMode;
  terminalCadenceKind: CadenceKind | undefined;
  lowVoiceSupport: TerminalClosureSupportStatus;
  outerVoiceLandingStatus: TerminalClosureOuterVoiceLandingStatus;
  unresolvedBoundaryDissonanceCount: number;
  thinningExplanation: TerminalClosureThinningExplanation;
  finalRestClassification: TerminalClosureFinalRestClassification;
}): string[] {
  const reasons: string[] = [];
  if (!appliesTerminalClosureIntent(input.mode)) {
    reasons.push("terminal closure is not required for continuous fugue hidden-boundary semantics");
  }
  if (input.terminalCadenceKind === undefined) {
    reasons.push("no cadence target was found in the inspected terminal window");
  } else if (!["authentic", "modal"].includes(input.terminalCadenceKind)) {
    reasons.push(`${input.terminalCadenceKind} cadence is not accepted as terminal closure by default`);
  }
  if (input.lowVoiceSupport !== "root-supported") {
    reasons.push(`low voice support is ${input.lowVoiceSupport}`);
  }
  if (input.outerVoiceLandingStatus !== "stable") {
    reasons.push(`outer voice landing is ${input.outerVoiceLandingStatus}`);
  }
  if (input.unresolvedBoundaryDissonanceCount > 0) {
    reasons.push(`${input.unresolvedBoundaryDissonanceCount} unresolved boundary dissonance(s) remain`);
  }
  if (input.thinningExplanation === "unsupported-collapse") {
    reasons.push("terminal texture thinning looks like unsupported collapse");
  }
  if (input.finalRestClassification === "silence-failure") {
    reasons.push("final all-voice rest is not backed by a stable terminal sonority");
  }
  if (reasons.length === 0) {
    reasons.push("terminal boundary has cadence target, root support, stable outer voices, and no unresolved clash");
  }
  return reasons;
}

function terminalClosureWindows(input: {
  inspectedTickRange: { startTick: number; endTick: number };
  terminalTick: number;
  endTick: number;
  activeAtTerminal: readonly NoteEvent[];
  codaStartTick: number | undefined;
  codaContinuity: TerminalCodaContinuitySummary;
  preparedVoiceReentry: TerminalClosurePreparedReentryStatus;
  finalAttackReentryVoiceCount: number;
  classification: TerminalClosureClassification;
  reasons: readonly string[];
}): TerminalClosureReviewWindow[] {
  return [
    {
      kind: "terminal-cadence",
      startTick: input.terminalTick,
      endTick: Math.min(input.endTick, input.terminalTick + TICKS_PER_QUARTER),
      voices: input.activeAtTerminal.map((note) => note.voice),
      classification: input.classification,
      reason: input.reasons[0] ?? "terminal cadence reviewed",
    },
    {
      kind: "texture-thinning",
      startTick: input.inspectedTickRange.startTick,
      endTick: input.endTick,
      voices: [...new Set(input.activeAtTerminal.map((note) => note.voice))],
      classification: input.classification,
      reason: "final two to four measures were checked for cadence-supported thinning",
    },
    {
      kind: "voice-reentry",
      startTick: input.inspectedTickRange.startTick,
      endTick: Math.min(input.endTick, input.terminalTick + TICKS_PER_QUARTER),
      voices: input.activeAtTerminal.map((note) => note.voice),
      classification: input.preparedVoiceReentry === "sudden-final-attack" ? "review-required" : input.classification,
      reason: `${input.finalAttackReentryVoiceCount} terminal voice(s) first appear at the final attack in the prepared window`,
    },
    {
      kind: "coda-continuity",
      startTick: input.codaStartTick ?? input.inspectedTickRange.startTick,
      endTick: input.terminalTick,
      voices: ["bass", "tenor", "alto", "soprano"].filter((voice) =>
        input.activeAtTerminal.some((note) => note.voice === voice),
      ) as Voice[],
      classification:
        input.codaContinuity.classification === "not-applicable"
          ? input.classification
          : input.codaContinuity.classification,
      reason: input.codaContinuity.reasons[0] ?? "terminal coda continuity reviewed",
    },
  ];
}

function scoreEndTick(events: readonly ScoreEvent[], notes: readonly NoteEvent[]): number {
  const scoreEnd = events.find((event) => event.kind === "meta" && event.type === "score-end");
  if (scoreEnd !== undefined) {
    return scoreEnd.tick;
  }
  return Math.max(0, ...notes.map((note) => note.startTick + note.durationTicks));
}

function activeNotesAt(notes: readonly NoteEvent[], tick: number): NoteEvent[] {
  return notes.filter((note) => note.startTick <= tick && tick < note.startTick + note.durationTicks);
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export type TerminalClosureGenerationMode = NonNullable<GenerationInput["mode"]>;
