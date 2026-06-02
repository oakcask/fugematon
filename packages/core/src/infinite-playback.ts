import { DEFAULT_SELECTION_MODEL, GENERATOR_VERSION, TICKS_PER_QUARTER } from "./constants.js";
import type {
  CadenceKind,
  FugueState,
  HarmonicPlan,
  KeySignature,
  MeterContext,
  NoteEvent,
  PlannedEntry,
  ScoreEvent,
  SelectionModel,
  TimeSignature,
  Voice,
} from "./events.js";
import { normalizeSelectionModel } from "./events.js";
import { seedToUint32State } from "./prng.js";
import {
  DEFAULT_WRITING_PROFILE_ID,
  resolveWritingProfileMetadata,
  type WritingProfileId,
  type WritingProfileMetadata,
} from "./writing-profile.js";

export const INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION = 2;
export const DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS = TICKS_PER_QUARTER * 16;

export type InfinitePlaybackMode = "continuous-fugue" | "endless-program" | "regenerative-cycle";

export type SegmentBoundaryVisibility = "hidden" | "audible" | "cadential-bridge";
export type SegmentCadenceRequirement = "avoid-terminal-cadence" | "require-terminal-cadence";
export type SegmentSubjectMemory = "continuous-transform" | "family-reference" | "regenerative-memory";
export type SegmentSectionBridge = "required" | "optional" | "not-required";

export type InfinitePlaybackReviewSignal =
  | "entry-boundary-continuity"
  | "phrase-development"
  | "score-window-acceptance"
  | "meter-consistency"
  | "texture-continuity"
  | "historical-reference-calibration"
  | "episode-motivic-development"
  | "harmonic-stasis-rearticulation"
  | "stretto-entry-harmony";

export type InfinitePlaybackModeSemantics = {
  mode: InfinitePlaybackMode;
  label: "continuous fugue" | "endless program" | "regenerative cycle";
  boundaryVisibility: SegmentBoundaryVisibility;
  cadenceRequirement: SegmentCadenceRequirement;
  subjectMemory: SegmentSubjectMemory;
  carriesTonalRegion: boolean;
  carriesDensityArc: boolean;
  carriesNoveltyFatigueBudget: boolean;
  sectionBridge: SegmentSectionBridge;
  reviewSignalsRemainVisible: readonly InfinitePlaybackReviewSignal[];
};

export type SegmentGenerationCandidateKind = "generated" | "best-so-far" | "conservative-fallback";

export type SegmentGenerationDeadlineInput = {
  mode: InfinitePlaybackMode | "continuous fugue" | "endless program" | "regenerative cycle";
  segmentIndex: number;
  startedAtMs: number;
  completedAtMs?: number;
  deadlineMs: number;
  generatedCandidateSatisfiesHardConstraints: boolean;
  bestSoFarCandidateSatisfiesHardConstraints: boolean;
};

export type SegmentGenerationDeadlineResult = {
  mode: InfinitePlaybackMode;
  segmentIndex: number;
  elapsedMs: number;
  deadlineExceededByMs: number;
  timedOut: boolean;
  hardConstraintSatisfied: boolean;
  returnedCandidateKind: SegmentGenerationCandidateKind;
  hardConstraintSource: SegmentGenerationCandidateKind;
  referenceDiagnosticsPreserved: boolean;
  qualityVectorPreserved: boolean;
  reviewSignalsRemainVisible: readonly InfinitePlaybackReviewSignal[];
};

export type SegmentReplayHistoryEntry = {
  segmentIndex: number;
  startTick: number;
  endTick: number;
  eventCount: number;
};

export type SegmentStateChangeHistoryEntry = {
  segmentIndex: number;
  tick: number;
  state: FugueState;
};

export type SegmentBoundaryHistoryEntry = {
  segmentIndex: number;
  tick: number;
  mode: InfinitePlaybackMode;
  returnedCandidateKind: SegmentGenerationCandidateKind;
  timedOut: boolean;
};

export type InfinitePlaybackLongRunHistory = {
  replay: readonly SegmentReplayHistoryEntry[];
  stateChanges: readonly SegmentStateChangeHistoryEntry[];
  boundaries: readonly SegmentBoundaryHistoryEntry[];
  reviewSignalsRemainVisible: readonly InfinitePlaybackReviewSignal[];
};

export type AppendInfinitePlaybackSegmentHistoryInput = {
  previous?: InfinitePlaybackLongRunHistory;
  mode: InfinitePlaybackMode | "continuous fugue" | "endless program" | "regenerative cycle";
  segmentIndex: number;
  events: readonly ScoreEvent[];
  deadlineResult: SegmentGenerationDeadlineResult;
};

export type SegmentSnapshotTimebase = {
  ticksPerQuarter: number;
  timeSignature?: TimeSignature;
  bpm?: number;
};

export type SegmentSubjectFamilyMemory = {
  familyId: string;
  stemPitchClasses: number[];
  activeTransformations: string[];
};

export type SegmentAnswerTransformMemory = {
  answerKind?: "real" | "tonal";
  intervalShift?: number;
  recentTransforms: string[];
};

export type SegmentFragmentDerivationMemory = {
  sourceMotiveIds: string[];
  transformations: string[];
  sequencePatterns: string[];
};

export type SegmentTonalRegionMemory = {
  currentKey?: KeySignature;
  targetKey?: KeySignature;
  recentRegions: KeySignature[];
};

export type SegmentCadencePreparationMemory = {
  targetKind?: CadenceKind;
  preparedAtTick?: number;
  unresolved: boolean;
};

export type SegmentDensityArcMemory = {
  currentVoiceCount: number;
  recentVoiceCounts: number[];
  targetVoiceCount?: number;
};

export type SegmentNoveltyFatigueBudget = {
  noveltyBudget: number;
  fatigue: number;
  repeatedSubjectFamilyCount: number;
};

export type SegmentSectionPlannerState = {
  currentState: FugueState;
  nextStateHint?: FugueState;
  stateHistory: FugueState[];
};

export type SegmentVoiceContinuity = {
  voice: Voice;
  role: string;
  untilTick: number;
};

export type SegmentMetricalContext = {
  startTick: number;
  meter: MeterContext;
};

export type SegmentHarmonicContext = {
  startTick: number;
  key: KeySignature;
  cadenceKind?: CadenceKind;
};

export type SegmentSectionFunctionContext = {
  startTick: number;
  state: FugueState;
};

export type SegmentPrngInternalState = {
  algorithm: "xoshiro128**";
  state: [number, number, number, number];
};

export type BoundedPastEventContext = {
  maxLookbackTicks: number;
  events: ScoreEvent[];
  voiceRoleContinuity: SegmentVoiceContinuity[];
  metricalContexts: SegmentMetricalContext[];
  harmonicContexts: SegmentHarmonicContext[];
  sectionFunctions: SegmentSectionFunctionContext[];
};

export type SegmentSnapshot = {
  schemaVersion: typeof INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION;
  generatorVersion: number;
  selectionModel: SelectionModel;
  writingProfile: WritingProfileMetadata;
  segmentIndex: number;
  tick: number;
  mode: InfinitePlaybackMode;
  timebase: SegmentSnapshotTimebase;
  subjectFamily: SegmentSubjectFamilyMemory;
  answerTransform: SegmentAnswerTransformMemory;
  fragmentDerivation: SegmentFragmentDerivationMemory;
  tonalRegion: SegmentTonalRegionMemory;
  cadencePreparation: SegmentCadencePreparationMemory;
  densityArc: SegmentDensityArcMemory;
  noveltyFatigueBudget: SegmentNoveltyFatigueBudget;
  sectionPlannerState: SegmentSectionPlannerState;
  unresolvedVoiceContinuity: SegmentVoiceContinuity[];
  prngInternalState: SegmentPrngInternalState;
  boundedPastEventContext: BoundedPastEventContext;
};

export type InitialSegmentSnapshotInput = {
  seed: string;
  mode?: InfinitePlaybackMode | "continuous fugue" | "endless program" | "regenerative cycle";
  generatorVersion?: number;
  selectionModel?: SelectionModel;
  writingProfileId?: WritingProfileId;
  ticksPerQuarter?: number;
  boundedPastEventContextTicks?: number;
};

export type CreateSegmentEndSnapshotInput = {
  previous?: SegmentSnapshot;
  seed: string;
  mode?: InfinitePlaybackMode | "continuous fugue" | "endless program" | "regenerative cycle";
  segmentIndex: number;
  tick: number;
  events: readonly ScoreEvent[];
  subjectEntries: readonly PlannedEntry[];
  sectionPlans: readonly HarmonicPlan[];
  selectionModel?: SelectionModel;
  writingProfileId?: WritingProfileId;
  generatorVersion?: number;
  ticksPerQuarter?: number;
  timeSignature?: TimeSignature;
  bpm?: number;
  prngState: readonly [number, number, number, number];
  pianoRollSessionTimelineContinuous?: boolean;
  boundedPastEventContextTicks?: number;
};

const REVIEW_SIGNALS_REMAIN_VISIBLE: readonly InfinitePlaybackReviewSignal[] = [
  "entry-boundary-continuity",
  "phrase-development",
  "score-window-acceptance",
  "meter-consistency",
  "texture-continuity",
  "historical-reference-calibration",
  "episode-motivic-development",
  "harmonic-stasis-rearticulation",
  "stretto-entry-harmony",
];

export const INFINITE_PLAYBACK_MODE_SEMANTICS: Readonly<Record<InfinitePlaybackMode, InfinitePlaybackModeSemantics>> = {
  "continuous-fugue": {
    mode: "continuous-fugue",
    label: "continuous fugue",
    boundaryVisibility: "hidden",
    cadenceRequirement: "avoid-terminal-cadence",
    subjectMemory: "continuous-transform",
    carriesTonalRegion: true,
    carriesDensityArc: true,
    carriesNoveltyFatigueBudget: true,
    sectionBridge: "required",
    reviewSignalsRemainVisible: REVIEW_SIGNALS_REMAIN_VISIBLE,
  },
  "endless-program": {
    mode: "endless-program",
    label: "endless program",
    boundaryVisibility: "audible",
    cadenceRequirement: "require-terminal-cadence",
    subjectMemory: "family-reference",
    carriesTonalRegion: true,
    carriesDensityArc: true,
    carriesNoveltyFatigueBudget: true,
    sectionBridge: "not-required",
    reviewSignalsRemainVisible: REVIEW_SIGNALS_REMAIN_VISIBLE,
  },
  "regenerative-cycle": {
    mode: "regenerative-cycle",
    label: "regenerative cycle",
    boundaryVisibility: "cadential-bridge",
    cadenceRequirement: "require-terminal-cadence",
    subjectMemory: "regenerative-memory",
    carriesTonalRegion: true,
    carriesDensityArc: true,
    carriesNoveltyFatigueBudget: true,
    sectionBridge: "required",
    reviewSignalsRemainVisible: REVIEW_SIGNALS_REMAIN_VISIBLE,
  },
};

export function normalizeInfinitePlaybackMode(mode: string | undefined): InfinitePlaybackMode {
  const normalized = (mode ?? "continuous-fugue").trim().replaceAll(" ", "-");

  if (isInfinitePlaybackMode(normalized)) {
    return normalized;
  }

  throw new Error(
    "core.infinite-playback.invalid-mode: invalid infinite playback mode; why=the segment snapshot contract must choose one Phase 8 playback semantic; action=use continuous-fugue, endless-program, or regenerative-cycle",
  );
}

export function createInitialSegmentSnapshot(input: InitialSegmentSnapshotInput): SegmentSnapshot {
  validateInitialSegmentSnapshotInput(input);

  return {
    schemaVersion: INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION,
    generatorVersion: input.generatorVersion ?? GENERATOR_VERSION,
    selectionModel: normalizeSelectionModel(input.selectionModel ?? DEFAULT_SELECTION_MODEL),
    writingProfile: resolveWritingProfileMetadata(input.writingProfileId),
    segmentIndex: 0,
    tick: 0,
    mode: normalizeInfinitePlaybackMode(input.mode),
    timebase: {
      ticksPerQuarter: input.ticksPerQuarter ?? TICKS_PER_QUARTER,
    },
    subjectFamily: {
      familyId: "initial",
      stemPitchClasses: [],
      activeTransformations: [],
    },
    answerTransform: {
      recentTransforms: [],
    },
    fragmentDerivation: {
      sourceMotiveIds: [],
      transformations: [],
      sequencePatterns: [],
    },
    tonalRegion: {
      recentRegions: [],
    },
    cadencePreparation: {
      unresolved: false,
    },
    densityArc: {
      currentVoiceCount: 0,
      recentVoiceCounts: [],
    },
    noveltyFatigueBudget: {
      noveltyBudget: 1,
      fatigue: 0,
      repeatedSubjectFamilyCount: 0,
    },
    sectionPlannerState: {
      currentState: "exposition",
      stateHistory: [],
    },
    unresolvedVoiceContinuity: [],
    prngInternalState: {
      algorithm: "xoshiro128**",
      state: seedToUint32State(input.seed),
    },
    boundedPastEventContext: {
      maxLookbackTicks: input.boundedPastEventContextTicks ?? DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS,
      events: [],
      voiceRoleContinuity: [],
      metricalContexts: [],
      harmonicContexts: [],
      sectionFunctions: [],
    },
  };
}

export function createSegmentEndSnapshot(input: CreateSegmentEndSnapshotInput): SegmentSnapshot {
  validateSegmentEndSnapshotInput(input);

  const previous = input.previous;
  const mode = normalizeInfinitePlaybackMode(input.mode ?? previous?.mode);
  const maxLookbackTicks =
    input.boundedPastEventContextTicks ??
    previous?.boundedPastEventContext.maxLookbackTicks ??
    DEFAULT_BOUNDED_PAST_EVENT_CONTEXT_TICKS;
  const tailStartTick = Math.max(0, input.tick - maxLookbackTicks);
  const tailEvents = input.events
    .filter((event) => eventTouchesWindow(event, tailStartTick, input.tick))
    .map((event) => shiftEventTick(event, -input.tick));
  const recentSections = input.sectionPlans
    .filter((plan) => plan.startTick + plan.durationTicks >= tailStartTick)
    .slice(-8);
  const recentEntries = input.subjectEntries.filter((entry) => entry.startTick >= tailStartTick).slice(-12);
  const currentSection = sectionAtOrBefore(input.sectionPlans, input.tick) ?? input.sectionPlans.at(-1);
  const currentKey = currentSection?.targetKey ?? currentSection?.localKey;
  const recentRegions = input.sectionPlans
    .slice(-6)
    .map((plan) => plan.targetKey)
    .filter((key, index, keys) => index === 0 || keySignatureKey(key) !== keySignatureKey(keys[index - 1]!));
  const previousFamily = previous?.subjectFamily;
  const primaryEntry =
    input.subjectEntries.find((entry) => entry.form === "subject") ??
    input.subjectEntries.find((entry) => entry.form === "answer");
  const subjectPitchClasses = primaryEntry?.actualPitchClassSequence ?? previousFamily?.stemPitchClasses ?? [];
  const stateHistory = [
    ...(previous?.sectionPlannerState.stateHistory ?? []),
    ...input.sectionPlans.map((plan) => plan.state),
  ].slice(-16);
  const currentState = currentSection?.state ?? stateHistory.at(-1) ?? "exposition";

  return {
    schemaVersion: INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION,
    generatorVersion: input.generatorVersion ?? GENERATOR_VERSION,
    selectionModel: normalizeSelectionModel(
      input.selectionModel ?? previous?.selectionModel ?? DEFAULT_SELECTION_MODEL,
    ),
    writingProfile: resolveWritingProfileMetadata(
      input.writingProfileId ?? previous?.writingProfile?.id ?? DEFAULT_WRITING_PROFILE_ID,
    ),
    segmentIndex: input.segmentIndex,
    tick: input.tick,
    mode,
    timebase: {
      ticksPerQuarter: input.ticksPerQuarter ?? previous?.timebase.ticksPerQuarter ?? TICKS_PER_QUARTER,
      timeSignature: input.timeSignature ?? previous?.timebase.timeSignature,
      bpm: input.bpm ?? previous?.timebase.bpm,
    },
    subjectFamily: {
      familyId: subjectPitchClasses.length > 0 ? `pc:${subjectPitchClasses.slice(0, 8).join("-")}` : "initial",
      stemPitchClasses: subjectPitchClasses.slice(0, 8),
      activeTransformations: [
        ...(previousFamily?.activeTransformations ?? []),
        ...recentEntries.map((entry) => entry.form),
      ].slice(-12),
    },
    answerTransform: {
      answerKind: segmentAnswerKind(lastMatchingEntry(recentEntries, "answer")?.answerKind),
      intervalShift: lastMatchingEntry(recentEntries, "answer") === undefined ? undefined : 7,
      recentTransforms: [
        ...(previous?.answerTransform.recentTransforms ?? []),
        ...recentEntries
          .filter((entry) => entry.form === "answer")
          .map((entry) => `${entry.answerKind ?? "unknown"}:${entry.voice}`),
      ].slice(-12),
    },
    fragmentDerivation: {
      sourceMotiveIds: [
        ...(previous?.fragmentDerivation.sourceMotiveIds ?? []),
        ...recentEntries.filter((entry) => entry.form === "subject-fragment").map((entry) => `${entry.voice}:fragment`),
      ].slice(-12),
      transformations: [
        ...(previous?.fragmentDerivation.transformations ?? []),
        ...recentSections.flatMap((plan) => (plan.fragmentTransform === undefined ? [] : [plan.fragmentTransform])),
      ].slice(-12),
      sequencePatterns: [
        ...(previous?.fragmentDerivation.sequencePatterns ?? []),
        ...recentSections.flatMap((plan) => (plan.sequencePattern === undefined ? [] : [plan.sequencePattern])),
      ].slice(-12),
    },
    tonalRegion: {
      currentKey,
      targetKey: currentSection?.targetKey,
      recentRegions: recentRegions.length > 0 ? recentRegions : (previous?.tonalRegion.recentRegions ?? []),
    },
    cadencePreparation: {
      targetKind: currentSection?.cadenceKind,
      preparedAtTick:
        currentSection === undefined ? previous?.cadencePreparation.preparedAtTick : currentSection.startTick,
      unresolved: currentSection?.cadenceKind === "half" || currentSection?.cadenceKind === "evaded",
    },
    densityArc: summarizeDensityArc(input.events, input.tick, maxLookbackTicks, previous?.densityArc),
    noveltyFatigueBudget: {
      noveltyBudget: Math.max(0.1, (previous?.noveltyFatigueBudget.noveltyBudget ?? 1) - recentEntries.length * 0.03),
      fatigue: Math.min(1, (previous?.noveltyFatigueBudget.fatigue ?? 0) + repeatedEntryFamilyRatio(recentEntries)),
      repeatedSubjectFamilyCount:
        (previous?.noveltyFatigueBudget.repeatedSubjectFamilyCount ?? 0) + repeatedSubjectFamilyCount(recentEntries),
    },
    sectionPlannerState: {
      currentState,
      nextStateHint: nextContinuationStateHint(currentState, input.sectionPlans, input.events, input.tick),
      stateHistory,
    },
    unresolvedVoiceContinuity: summarizeVoiceContinuity(input.events, tailStartTick, input.tick),
    prngInternalState: {
      algorithm: "xoshiro128**",
      state: [...input.prngState] as [number, number, number, number],
    },
    boundedPastEventContext: {
      maxLookbackTicks,
      events: tailEvents,
      voiceRoleContinuity: summarizeVoiceContinuity(input.events, tailStartTick, input.tick),
      metricalContexts:
        input.timeSignature === undefined
          ? (previous?.boundedPastEventContext.metricalContexts ?? [])
          : [{ startTick: -input.tick, meter: meterContextFromTimeSignature(input.timeSignature) }],
      harmonicContexts: recentSections.map((plan) => ({
        startTick: plan.startTick - input.tick,
        key: plan.localKey,
        cadenceKind: plan.cadenceKind,
      })),
      sectionFunctions: recentSections.map((plan) => ({
        startTick: plan.startTick - input.tick,
        state: plan.state,
      })),
    },
  };
}

export function planSegmentGenerationDeadlineResult(
  input: SegmentGenerationDeadlineInput,
): SegmentGenerationDeadlineResult {
  validateSegmentGenerationDeadlineInput(input);

  const mode = normalizeInfinitePlaybackMode(input.mode);
  const completedAtMs = input.completedAtMs ?? input.startedAtMs + input.deadlineMs;
  const elapsedMs = completedAtMs - input.startedAtMs;
  const timedOut = elapsedMs > input.deadlineMs || input.completedAtMs === undefined;
  const returnedCandidateKind = selectReturnedCandidateKind(input, timedOut);
  const hardConstraintSatisfied =
    returnedCandidateKind !== "generated" || input.generatedCandidateSatisfiesHardConstraints;

  return {
    mode,
    segmentIndex: input.segmentIndex,
    elapsedMs,
    deadlineExceededByMs: Math.max(0, elapsedMs - input.deadlineMs),
    timedOut,
    hardConstraintSatisfied,
    returnedCandidateKind,
    hardConstraintSource: returnedCandidateKind,
    referenceDiagnosticsPreserved: true,
    qualityVectorPreserved: true,
    reviewSignalsRemainVisible: INFINITE_PLAYBACK_MODE_SEMANTICS[mode].reviewSignalsRemainVisible,
  };
}

export function appendInfinitePlaybackSegmentHistory(
  input: AppendInfinitePlaybackSegmentHistoryInput,
): InfinitePlaybackLongRunHistory {
  validateAppendInfinitePlaybackSegmentHistoryInput(input);

  const mode = normalizeInfinitePlaybackMode(input.mode);
  const replayEntry = createReplayHistoryEntry(input.segmentIndex, input.events);
  const stateChanges = input.events.flatMap((event): SegmentStateChangeHistoryEntry[] =>
    event.kind === "meta" && event.type === "state-change"
      ? [
          {
            segmentIndex: input.segmentIndex,
            tick: event.tick,
            state: event.payload.state,
          },
        ]
      : [],
  );
  const boundary = {
    segmentIndex: input.segmentIndex,
    tick: replayEntry.endTick,
    mode,
    returnedCandidateKind: input.deadlineResult.returnedCandidateKind,
    timedOut: input.deadlineResult.timedOut,
  };
  const reviewSignalsRemainVisible = unionReviewSignals(
    input.previous?.reviewSignalsRemainVisible ?? [],
    input.deadlineResult.reviewSignalsRemainVisible,
  );

  return {
    replay: [...(input.previous?.replay ?? []), replayEntry],
    stateChanges: [...(input.previous?.stateChanges ?? []), ...stateChanges],
    boundaries: [...(input.previous?.boundaries ?? []), boundary],
    reviewSignalsRemainVisible,
  };
}

function isInfinitePlaybackMode(mode: string): mode is InfinitePlaybackMode {
  return mode in INFINITE_PLAYBACK_MODE_SEMANTICS;
}

function validateInitialSegmentSnapshotInput(input: InitialSegmentSnapshotInput): void {
  if (input.seed.length === 0) {
    throw new Error(
      "core.infinite-playback.empty-seed: missing seed for initial segment snapshot; why=Phase 8 initial snapshots derive deterministic PRNG state from seed text; action=pass a non-empty seed before creating the snapshot",
    );
  }

  if (
    input.generatorVersion !== undefined &&
    (!Number.isSafeInteger(input.generatorVersion) || input.generatorVersion <= 0)
  ) {
    throw new Error(
      "core.infinite-playback.invalid-generator-version: invalid generator version; why=snapshot resume compatibility depends on a positive safe generator version; action=pass the active generator version or omit the field",
    );
  }

  if (
    input.ticksPerQuarter !== undefined &&
    (!Number.isSafeInteger(input.ticksPerQuarter) || input.ticksPerQuarter <= 0)
  ) {
    throw new Error(
      "core.infinite-playback.invalid-timebase: invalid ticks per quarter; why=segment boundaries must preserve a positive tick timebase; action=pass a positive safe integer ticksPerQuarter or omit the field",
    );
  }

  if (
    input.boundedPastEventContextTicks !== undefined &&
    (!Number.isSafeInteger(input.boundedPastEventContextTicks) || input.boundedPastEventContextTicks < 0)
  ) {
    throw new Error(
      "core.infinite-playback.invalid-context-window: invalid bounded past event context window; why=snapshot resume must restore a finite non-negative lookback range; action=pass a non-negative safe integer tick count or omit the field",
    );
  }
}

function validateSegmentEndSnapshotInput(input: CreateSegmentEndSnapshotInput): void {
  if (!Number.isSafeInteger(input.segmentIndex) || input.segmentIndex < 0) {
    throw new Error(
      "core.infinite-playback.invalid-snapshot-segment-index: invalid snapshot segment index; why=segment snapshots must be ordered for deterministic continuation; action=pass a non-negative safe integer segmentIndex",
    );
  }

  if (!Number.isSafeInteger(input.tick) || input.tick < 0) {
    throw new Error(
      "core.infinite-playback.invalid-snapshot-tick: invalid snapshot tick; why=bounded past context is measured from a concrete segment boundary; action=pass a non-negative safe integer boundary tick",
    );
  }

  if (input.prngState.length !== 4 || input.prngState.every((part) => part === 0)) {
    throw new Error(
      "core.infinite-playback.invalid-snapshot-prng-state: invalid snapshot PRNG state; why=continuation generation resumes from the carried random stream; action=pass a non-zero xoshiro128** state",
    );
  }
}

function eventTouchesWindow(event: ScoreEvent, startTick: number, endTick: number): boolean {
  if (event.kind === "note") {
    return event.startTick + event.durationTicks >= startTick && event.startTick <= endTick;
  }

  return event.tick >= startTick && event.tick <= endTick;
}

function shiftEventTick(event: ScoreEvent, offsetTicks: number): ScoreEvent {
  if (event.kind === "note") {
    return {
      ...event,
      startTick: event.startTick + offsetTicks,
    };
  }

  return {
    ...event,
    tick: event.tick + offsetTicks,
  };
}

function sectionAtOrBefore(plans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  return (
    plans.find((plan) => plan.startTick <= tick && tick < plan.startTick + plan.durationTicks) ??
    lastPlanAtOrBefore(plans, tick)
  );
}

function lastMatchingEntry(entries: readonly PlannedEntry[], form: PlannedEntry["form"]): PlannedEntry | undefined {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (entries[index]!.form === form) {
      return entries[index];
    }
  }

  return undefined;
}

function segmentAnswerKind(
  answerKind: PlannedEntry["answerKind"] | undefined,
): SegmentAnswerTransformMemory["answerKind"] {
  if (answerKind === "true") {
    return "real";
  }

  return answerKind;
}

function lastPlanAtOrBefore(plans: readonly HarmonicPlan[], tick: number): HarmonicPlan | undefined {
  for (let index = plans.length - 1; index >= 0; index -= 1) {
    if (plans[index]!.startTick <= tick) {
      return plans[index];
    }
  }

  return undefined;
}

function keySignatureKey(key: KeySignature): string {
  return `${key.tonic}:${key.mode}`;
}

function summarizeDensityArc(
  events: readonly ScoreEvent[],
  endTick: number,
  maxLookbackTicks: number,
  previous: SegmentDensityArcMemory | undefined,
): SegmentDensityArcMemory {
  const noteEvents = events.filter((event): event is NoteEvent => event.kind === "note");
  const windowTicks = Math.max(TICKS_PER_QUARTER * 4, Math.floor(maxLookbackTicks / 4));
  const windows = [3, 2, 1, 0].map((index) => {
    const startTick = Math.max(0, endTick - windowTicks * (index + 1));
    const windowEndTick = Math.max(startTick, endTick - windowTicks * index);
    return activeVoiceCount(noteEvents, startTick, windowEndTick);
  });

  return {
    currentVoiceCount: windows.at(-1) ?? previous?.currentVoiceCount ?? 0,
    recentVoiceCounts: [...(previous?.recentVoiceCounts ?? []), ...windows].slice(-8),
    targetVoiceCount: targetVoiceCountForDensity(windows.at(-1) ?? 0),
  };
}

function activeVoiceCount(notes: readonly NoteEvent[], startTick: number, endTick: number): number {
  const voices = new Set<Voice>();
  for (const note of notes) {
    if (note.startTick < endTick && note.startTick + note.durationTicks > startTick) {
      voices.add(note.voice);
    }
  }
  return voices.size;
}

function targetVoiceCountForDensity(currentVoiceCount: number): number {
  if (currentVoiceCount >= 4) {
    return 2;
  }
  if (currentVoiceCount <= 1) {
    return 3;
  }
  return currentVoiceCount;
}

function repeatedEntryFamilyRatio(entries: readonly PlannedEntry[]): number {
  if (entries.length <= 1) {
    return 0;
  }

  return repeatedSubjectFamilyCount(entries) / entries.length;
}

function repeatedSubjectFamilyCount(entries: readonly PlannedEntry[]): number {
  const seen = new Set<string>();
  let repeated = 0;
  for (const entry of entries) {
    const key = `${entry.form}:${entry.expectedDegreePattern.join("-")}`;
    if (seen.has(key)) {
      repeated += 1;
    }
    seen.add(key);
  }
  return repeated;
}

function nextContinuationStateHint(
  currentState: FugueState,
  sectionPlans: readonly HarmonicPlan[],
  events: readonly ScoreEvent[],
  endTick: number,
): FugueState {
  const density = activeVoiceCount(
    events.filter((event): event is NoteEvent => event.kind === "note"),
    Math.max(0, endTick - TICKS_PER_QUARTER * 4),
    endTick,
  );
  const cadenceKind = sectionPlans.at(-1)?.cadenceKind;

  if (density >= 4) {
    return "episode";
  }
  if (cadenceKind === "half" || cadenceKind === "evaded") {
    return "subject-return";
  }
  if (currentState === "subject-return") {
    return "episode";
  }
  if (currentState === "episode" && density <= 2) {
    return "subject-return";
  }
  return "episode";
}

function summarizeVoiceContinuity(
  events: readonly ScoreEvent[],
  tailStartTick: number,
  boundaryTick: number,
): SegmentVoiceContinuity[] {
  const latestByVoice = new Map<Voice, NoteEvent>();
  for (const event of events) {
    if (
      event.kind !== "note" ||
      event.startTick + event.durationTicks < tailStartTick ||
      event.startTick > boundaryTick
    ) {
      continue;
    }

    const previous = latestByVoice.get(event.voice);
    if (previous === undefined || previous.startTick <= event.startTick) {
      latestByVoice.set(event.voice, event);
    }
  }

  return [...latestByVoice.values()].map((note) => ({
    voice: note.voice,
    role: note.role ?? "free-counterpoint",
    untilTick: note.startTick + note.durationTicks - boundaryTick,
  }));
}

function meterContextFromTimeSignature(timeSignature: TimeSignature): MeterContext {
  const beatTicks = TICKS_PER_QUARTER * (4 / timeSignature.denominator);
  return {
    timeSignature,
    measureTicks: beatTicks * timeSignature.numerator,
    beatTicks,
    strongBeatIntervalTicks: timeSignature.numerator === 6 ? beatTicks * 3 : beatTicks,
    weakBeatIntervalTicks: beatTicks,
    compound: timeSignature.numerator === 6,
  };
}

function selectReturnedCandidateKind(
  input: SegmentGenerationDeadlineInput,
  timedOut: boolean,
): SegmentGenerationCandidateKind {
  if (!timedOut && input.generatedCandidateSatisfiesHardConstraints) {
    return "generated";
  }

  if (input.bestSoFarCandidateSatisfiesHardConstraints) {
    return "best-so-far";
  }

  return "conservative-fallback";
}

function validateSegmentGenerationDeadlineInput(input: SegmentGenerationDeadlineInput): void {
  if (!Number.isSafeInteger(input.segmentIndex) || input.segmentIndex < 0) {
    throw new Error(
      "core.infinite-playback.invalid-segment-index: invalid segment index; why=Phase 9 worker fallback records must attach to a stable replay segment; action=pass a non-negative safe integer segmentIndex",
    );
  }

  if (!Number.isFinite(input.startedAtMs) || input.startedAtMs < 0) {
    throw new Error(
      "core.infinite-playback.invalid-start-time: invalid generation start time; why=deadline handling needs a finite relative start time; action=pass a non-negative finite startedAtMs",
    );
  }

  if (!Number.isFinite(input.deadlineMs) || input.deadlineMs <= 0) {
    throw new Error(
      "core.infinite-playback.invalid-deadline: invalid generation deadline; why=Phase 9 worker generation must have a positive finite deadline before fallback selection; action=pass a positive finite deadlineMs",
    );
  }

  if (
    input.completedAtMs !== undefined &&
    (!Number.isFinite(input.completedAtMs) || input.completedAtMs < input.startedAtMs)
  ) {
    throw new Error(
      "core.infinite-playback.invalid-completion-time: invalid generation completion time; why=deadline handling cannot record negative elapsed generation time; action=omit completedAtMs for timeout or pass a finite value greater than or equal to startedAtMs",
    );
  }
}

function validateAppendInfinitePlaybackSegmentHistoryInput(input: AppendInfinitePlaybackSegmentHistoryInput): void {
  if (!Number.isSafeInteger(input.segmentIndex) || input.segmentIndex < 0) {
    throw new Error(
      "core.infinite-playback.invalid-history-segment-index: invalid segment index; why=long-run replay and boundary histories require stable segment ordering; action=pass a non-negative safe integer segmentIndex",
    );
  }

  if (input.deadlineResult.segmentIndex !== input.segmentIndex) {
    throw new Error(
      "core.infinite-playback.history-deadline-segment-mismatch: deadline result segment mismatch; why=fallback review signals must attach to the same replay segment as the emitted events; action=append history with a matching deadlineResult.segmentIndex",
    );
  }
}

function createReplayHistoryEntry(segmentIndex: number, events: readonly ScoreEvent[]): SegmentReplayHistoryEntry {
  if (events.length === 0) {
    return {
      segmentIndex,
      startTick: 0,
      endTick: 0,
      eventCount: 0,
    };
  }

  const ticks = events.map((event) => (event.kind === "note" ? event.startTick + event.durationTicks : event.tick));

  return {
    segmentIndex,
    startTick: Math.min(...events.map((event) => (event.kind === "note" ? event.startTick : event.tick))),
    endTick: Math.max(...ticks),
    eventCount: events.length,
  };
}

function unionReviewSignals(
  left: readonly InfinitePlaybackReviewSignal[],
  right: readonly InfinitePlaybackReviewSignal[],
): readonly InfinitePlaybackReviewSignal[] {
  return [...new Set([...left, ...right])];
}
