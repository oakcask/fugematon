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
