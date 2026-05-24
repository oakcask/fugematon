import type { NoteRole, ScoreEvent, Voice } from "@fugematon/core";
import { VOICES } from "@fugematon/core";

export type PerformanceProfileId = "organ-default" | "strict-counterpoint";

export type PerformanceProfileMetadata = {
  id: PerformanceProfileId;
  version: number;
};

export type VelocityCurve = {
  kind: "linear";
  scale: number;
  minimum: number;
  maximum: number;
};

export type DeterministicHumanize = {
  maxOffsetTicks: number;
  seedSalt: string;
};

export type VoicePerformanceSettings = {
  trackName: string;
  channel: number;
  program: number;
  pan: number;
  volume: number;
  gain: number;
  oscillatorType: "sine" | "square" | "sawtooth" | "triangle";
  velocityCurve: VelocityCurve;
  articulation: {
    noteLengthRatio: number;
    releaseSeconds: number;
  };
  humanize: DeterministicHumanize;
};

export type PerformanceProfile = PerformanceProfileMetadata & {
  voices: Record<Voice, VoicePerformanceSettings>;
};

export type PerformanceEvent = {
  kind: "note";
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number;
  velocity: number;
  role?: NoteRole;
  trackName: string;
  channel: number;
  program: number;
  pan: number;
  volume: number;
  gain: number;
  oscillatorType: VoicePerformanceSettings["oscillatorType"];
  releaseSeconds: number;
};

export type PerformanceConversionInput = {
  events: readonly ScoreEvent[];
  profile?: PerformanceProfileId | PerformanceProfile;
  seed?: string;
};

export const DEFAULT_PERFORMANCE_PROFILE_ID: PerformanceProfileId = "organ-default";

const ORGAN_DEFAULT: PerformanceProfile = {
  id: "organ-default",
  version: 1,
  voices: {
    soprano: voiceSettings("soprano", 0, 19, 32, 127, 0.18, "triangle"),
    alto: voiceSettings("alto", 1, 19, 48, 127, 0.16, "triangle"),
    tenor: voiceSettings("tenor", 2, 19, 80, 127, 0.15, "triangle"),
    bass: voiceSettings("bass", 3, 32, 96, 127, 0.2, "sawtooth"),
  },
};

const STRICT_COUNTERPOINT: PerformanceProfile = {
  id: "strict-counterpoint",
  version: 1,
  voices: {
    soprano: voiceSettings("soprano", 0, 73, 24, 127, 0.2, "sine"),
    alto: voiceSettings("alto", 1, 73, 52, 127, 0.18, "sine"),
    tenor: voiceSettings("tenor", 2, 73, 76, 127, 0.18, "sine"),
    bass: voiceSettings("bass", 3, 73, 104, 127, 0.22, "sine"),
  },
};

const PROFILES: Record<PerformanceProfileId, PerformanceProfile> = {
  "organ-default": ORGAN_DEFAULT,
  "strict-counterpoint": STRICT_COUNTERPOINT,
};

export function listPerformanceProfiles(): PerformanceProfileMetadata[] {
  return Object.values(PROFILES).map(performanceProfileMetadata);
}

export function getPerformanceProfile(
  profileId: PerformanceProfileId = DEFAULT_PERFORMANCE_PROFILE_ID,
): PerformanceProfile {
  return cloneProfile(PROFILES[profileId]);
}

export function performanceProfileMetadata(profile: PerformanceProfile): PerformanceProfileMetadata {
  return { id: profile.id, version: profile.version };
}

export function resolvePerformanceProfile(
  profile: PerformanceProfileId | PerformanceProfile = DEFAULT_PERFORMANCE_PROFILE_ID,
): PerformanceProfile {
  return typeof profile === "string" ? getPerformanceProfile(profile) : cloneProfile(profile);
}

export function scoreToPerformanceEvents(input: PerformanceConversionInput): PerformanceEvent[] {
  const profile = resolvePerformanceProfile(input.profile);
  return input.events
    .filter((event): event is Extract<ScoreEvent, { kind: "note" }> => event.kind === "note")
    .map((event) => {
      const settings = profile.voices[event.voice];
      const startTick = event.startTick + deterministicOffsetTicks(event, input.seed ?? "", settings.humanize);
      const durationTicks = Math.max(1, Math.round(event.durationTicks * settings.articulation.noteLengthRatio));

      return {
        kind: "note",
        voice: event.voice,
        startTick,
        durationTicks,
        pitch: event.pitch,
        velocity: applyVelocityCurve(event.velocity, settings.velocityCurve),
        role: event.role,
        trackName: settings.trackName,
        channel: settings.channel,
        program: settings.program,
        pan: settings.pan,
        volume: settings.volume,
        gain: settings.gain,
        oscillatorType: settings.oscillatorType,
        releaseSeconds: settings.articulation.releaseSeconds,
      };
    });
}

function voiceSettings(
  trackName: Voice,
  channel: number,
  program: number,
  pan: number,
  volume: number,
  gain: number,
  oscillatorType: VoicePerformanceSettings["oscillatorType"],
): VoicePerformanceSettings {
  return {
    trackName,
    channel,
    program,
    pan,
    volume,
    gain,
    oscillatorType,
    velocityCurve: {
      kind: "linear",
      scale: 1,
      minimum: 1,
      maximum: 127,
    },
    articulation: {
      noteLengthRatio: 1,
      releaseSeconds: 0.08,
    },
    humanize: {
      maxOffsetTicks: 0,
      seedSalt: "performance-profile-default",
    },
  };
}

function applyVelocityCurve(velocity: number, curve: VelocityCurve): number {
  return clamp(Math.round(velocity * curve.scale), curve.minimum, curve.maximum);
}

function deterministicOffsetTicks(
  event: Extract<ScoreEvent, { kind: "note" }>,
  seed: string,
  humanize: DeterministicHumanize,
): number {
  if (humanize.maxOffsetTicks === 0) {
    return 0;
  }

  const span = humanize.maxOffsetTicks * 2 + 1;
  return (
    (hash(`${seed}:${humanize.seedSalt}:${event.voice}:${event.startTick}:${event.pitch}`) % span) -
    humanize.maxOffsetTicks
  );
}

function cloneProfile(profile: PerformanceProfile): PerformanceProfile {
  return {
    ...profile,
    voices: Object.fromEntries(VOICES.map((voice) => [voice, cloneVoiceSettings(profile.voices[voice])])) as Record<
      Voice,
      VoicePerformanceSettings
    >,
  };
}

function cloneVoiceSettings(settings: VoicePerformanceSettings): VoicePerformanceSettings {
  return {
    ...settings,
    velocityCurve: { ...settings.velocityCurve },
    articulation: { ...settings.articulation },
    humanize: { ...settings.humanize },
  };
}

function hash(value: string): number {
  let state = 2166136261;
  for (const character of value) {
    state ^= character.charCodeAt(0);
    state = Math.imul(state, 16777619);
  }

  return state >>> 0;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
