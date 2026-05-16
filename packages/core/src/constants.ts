export const GENERATOR_VERSION = 0;

export const TICKS_PER_QUARTER = 480;

export const VOICES = ["soprano", "alto", "tenor", "bass"] as const;

export const DEFAULT_GENERATION_PARAMETERS = {
  strictness: 0.8,
  density: 0.5,
  subjectPresence: 0.7,
} as const;
