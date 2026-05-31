import { DEFAULT_SELECTION_MODEL, GENERATOR_VERSION, TICKS_PER_QUARTER } from "./constants.js";
import type {
  CadenceKind,
  FugueState,
  KeySignature,
  MeterContext,
  ScoreEvent,
  SelectionModel,
  Voice,
} from "./events.js";
import { normalizeSelectionModel } from "./events.js";
import { seedToUint32State } from "./prng.js";

export const INFINITE_PLAYBACK_SNAPSHOT_SCHEMA_VERSION = 1;
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
  ticksPerQuarter?: number;
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
