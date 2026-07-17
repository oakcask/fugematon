import type {
  EntryForm,
  FugueState,
  HarmonicFunction,
  KeySignature,
  NoteRole,
  StyleProfile,
  TimeSignature,
  Voice,
} from "@fugematon/core";

export const EVALUATION_FEATURE_SCHEMA_VERSION = 1 as const;
export const NORMALIZED_SCORE_SCHEMA_VERSION = 1 as const;
export const CORPUS_MANIFEST_SCHEMA = "fugematon-reference-corpus/v1" as const;

export type AnnotationProvenance = {
  source: "source" | "curated" | "inferred" | "generated";
  confidence: number;
};

export type NormalizedNote = {
  voice: Voice;
  startTick: number;
  durationTicks: number;
  pitch: number;
  role?: NoteRole;
};

export type NormalizedEntry = {
  id: string;
  startTick: number;
  endTick: number;
  voice: Voice;
  form: EntryForm;
  provenance: AnnotationProvenance;
};

export type NormalizedSection = {
  id: string;
  startTick: number;
  endTick: number;
  role: FugueState;
  provenance: AnnotationProvenance;
};

export type NormalizedCadence = {
  id: string;
  tick: number;
  harmonicFunction?: HarmonicFunction;
  provenance: AnnotationProvenance;
};

export type NormalizedReferenceScore = {
  schemaVersion: typeof NORMALIZED_SCORE_SCHEMA_VERSION;
  scoreId: string;
  sourceKind: "reference" | "generated";
  ticksPerQuarter: number;
  lengthTicks: number;
  voices: readonly Voice[];
  key: KeySignature;
  meter: TimeSignature;
  styleProfile: StyleProfile;
  notes: NormalizedNote[];
  annotations: {
    entries: NormalizedEntry[];
    sections: NormalizedSection[];
    cadences: NormalizedCadence[];
  };
};

export type CorpusSplit = "train" | "validation" | "work-holdout" | "composer-holdout";
export type RepertoireRole = "four-voice-fugue" | "four-part-local-voice-leading" | "control";

export type CorpusManifestEntry = {
  workId: string;
  composer: string;
  workTitle: string;
  movement: string;
  voiceCount: 4;
  key: KeySignature;
  meter: TimeSignature;
  sourceUrl: string;
  sourceFormat: "musicxml" | "humdrum-kern";
  licenseId: string;
  redistributionStatus: "redistributable" | "user-obtained" | "metadata-only";
  attributionRequirement: string;
  sourceChecksum: string;
  repertoireRole: RepertoireRole;
  styleProfile: StyleProfile;
  featureUse: "form-and-local" | "local-only" | "control-only";
  split: CorpusSplit;
  splitGroup: string;
  subjectFamilyGroup: string;
  importStatus: "available" | "user-action-required" | "excluded";
  validationStatus: "validated" | "pending" | "rejected";
  exclusionReason?: string;
};

export type CorpusManifest = {
  schema: typeof CORPUS_MANIFEST_SCHEMA;
  version: string;
  entries: CorpusManifestEntry[];
};

export type FeaturePolicyClass = "hard-input" | "reference-relative" | "review-required" | "manual-only";
export type FeatureAvailability = "available" | "missing-annotation" | "not-applicable";
export type FeatureGroup = "note-transition" | "voice-pair" | "entry-window" | "section" | "whole-score";

export type FeatureEvidencePointer = {
  scoreId: string;
  sectionId?: string;
  tick: number;
  voices?: Voice[];
  roles?: string[];
};

export type EvaluationFeature = {
  id: string;
  group: FeatureGroup;
  definition: string;
  policyClass: FeaturePolicyClass;
  numerator: number;
  denominator: number;
  normalizer:
    | "score-quarters"
    | "active-voice-pair-quarters"
    | "entry-count"
    | "section-count"
    | "active-window-quarters";
  value: number;
  availability: FeatureAvailability;
  confidence: number;
  grouping: {
    styleProfile: StyleProfile;
    sectionRole?: FugueState;
    entryRole?: EntryForm;
    voicePair?: string;
    metricalStrength?: "strong" | "weak" | "offbeat";
    harmonicFunction?: HarmonicFunction;
    transformation?: string;
  };
  evidence: FeatureEvidencePointer[];
};

export type EvaluationFeatureVector = {
  schemaVersion: typeof EVALUATION_FEATURE_SCHEMA_VERSION;
  scoreId: string;
  sourceKind: NormalizedReferenceScore["sourceKind"];
  features: EvaluationFeature[];
};

export type EvaluationErrorDetail = {
  id: string;
  why: string;
  action: string;
  field?: string;
};

export class EvaluationContractError extends Error {
  readonly detail: EvaluationErrorDetail;

  constructor(detail: EvaluationErrorDetail) {
    super(`${detail.id}: ${detail.why} Action: ${detail.action}`);
    this.name = "EvaluationContractError";
    this.detail = detail;
  }
}
