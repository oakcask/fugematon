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
