export const GENERATOR_VERSION = 1;

export const TICKS_PER_QUARTER = 480;

export const VOICES = ["soprano", "alto", "tenor", "bass"] as const;

export const VOICE_RANGES = {
  soprano: { min: 60, max: 81 },
  alto: { min: 55, max: 74 },
  tenor: { min: 48, max: 67 },
  bass: { min: 36, max: 60 },
} as const;

export const DEFAULT_GENERATION_PARAMETERS = {
  strictness: 0.8,
  density: 0.5,
  subjectPresence: 0.7,
} as const;

export const PHASE_1_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
} as const;

export const PHASE_1_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
] as const;

export const PHASE_3_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const PHASE_3_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  maxParallelPerfectsPerMinute: 12,
  minSubjectReturns: 2,
  minStrettoEntries: 2,
  maxGenerationMilliseconds: 1000,
} as const;

export const PHASE_3_REPRESENTATIVE_SEEDS = [
  { seed: "bach-001", category: "fixed" },
  { seed: "fugue-smoke", category: "fixed" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
  { seed: "dense-entry", category: "boundary" },
  { seed: "stretto-smoke", category: "fixed" },
] as const;

export const PHASE_4_DIAGNOSTICS_PROFILE = {
  rangeViolations: 0,
  voiceCrossings: 0,
  subjectIdentityViolations: 0,
  answerPlanViolations: 0,
  keyMetadataMismatches: 0,
} as const;

export const PHASE_4_REPRESENTATIVE_SEEDS = PHASE_3_REPRESENTATIVE_SEEDS;

export const PHASE_5_LENGTH_TICKS = TICKS_PER_QUARTER * 270;

export const PHASE_5_REVIEW_SEEDS = [
  { seed: "bach-001", category: "representative" },
  { seed: "fugue-smoke", category: "representative" },
  { seed: "minor-entry", category: "boundary" },
  { seed: "wide-key", category: "boundary" },
  { seed: "lyrical-line", category: "review" },
  { seed: "modal-dorian", category: "review" },
  { seed: "circle-fifths", category: "review" },
  { seed: "close-imitation", category: "review" },
  { seed: "sparse-cadence", category: "review" },
  { seed: "bright-answer", category: "review" },
  { seed: "dark-episode", category: "review" },
  { seed: "ornament-test", category: "review" },
  { seed: "long-arc", category: "review" },
  { seed: "contrary-motion", category: "review" },
] as const;
