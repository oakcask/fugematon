import {
  CORPUS_MANIFEST_SCHEMA,
  type CorpusManifest,
  EvaluationContractError,
  type NormalizedReferenceScore,
} from "./types.js";

const VOICES = ["soprano", "alto", "tenor", "bass"] as const;
const CHECKSUM_PATTERN = /^sha256:[a-f0-9]{64}$/;

export function validateCorpusManifest(manifest: CorpusManifest): void {
  if (manifest.schema !== CORPUS_MANIFEST_SCHEMA) {
    fail(
      "evaluation.corpus.unsupported-schema",
      "Corpus schema compatibility cannot be established.",
      "Regenerate the manifest with the supported schema.",
      "schema",
    );
  }
  requireText(manifest.version, "version");
  const workIds = new Set<string>();
  const ownership = new Map<string, string>();
  for (const [index, entry] of manifest.entries.entries()) {
    const prefix = `entries[${index}]`;
    requireText(entry.workId, `${prefix}.workId`);
    requireText(entry.composer, `${prefix}.composer`);
    requireText(entry.workTitle, `${prefix}.workTitle`);
    requireText(entry.movement, `${prefix}.movement`);
    requireText(entry.licenseId, `${prefix}.licenseId`);
    requireText(entry.sourceUrl, `${prefix}.sourceUrl`);
    requireText(entry.attributionRequirement, `${prefix}.attributionRequirement`);
    requireText(entry.splitGroup, `${prefix}.splitGroup`);
    requireText(entry.subjectFamilyGroup, `${prefix}.subjectFamilyGroup`);
    if (!entry.sourceUrl.startsWith("https://")) {
      fail(
        "evaluation.corpus.invalid-source-url",
        "The source identity does not use a stable secure URL.",
        "Record the canonical HTTPS source URL.",
        `${prefix}.sourceUrl`,
      );
    }
    requireEnum(entry.sourceFormat, ["musicxml", "humdrum-kern"], `${prefix}.sourceFormat`);
    requireEnum(
      entry.redistributionStatus,
      ["redistributable", "user-obtained", "metadata-only"],
      `${prefix}.redistributionStatus`,
    );
    requireEnum(
      entry.repertoireRole,
      ["four-voice-fugue", "four-part-local-voice-leading", "control"],
      `${prefix}.repertoireRole`,
    );
    requireEnum(entry.styleProfile, ["strict-classical", "hybrid", "popular-tolerant"], `${prefix}.styleProfile`);
    requireEnum(entry.featureUse, ["form-and-local", "local-only", "control-only"], `${prefix}.featureUse`);
    requireEnum(entry.split, ["train", "validation", "work-holdout", "composer-holdout"], `${prefix}.split`);
    requireEnum(entry.importStatus, ["available", "user-action-required", "excluded"], `${prefix}.importStatus`);
    requireEnum(entry.validationStatus, ["validated", "pending", "rejected"], `${prefix}.validationStatus`);
    if (!entry.key?.tonic || !entry.key.mode) {
      fail(
        "evaluation.corpus.missing-key-metadata",
        "Reference-relative pitch semantics cannot be reconstructed.",
        "Record tonic and mode for the source work.",
        `${prefix}.key`,
      );
    }
    if (!(entry.meter?.numerator > 0) || !(entry.meter?.denominator > 0)) {
      fail(
        "evaluation.corpus.missing-meter-metadata",
        "Metrical feature semantics cannot be reconstructed.",
        "Record a supported time signature for the source work.",
        `${prefix}.meter`,
      );
    }
    if (workIds.has(entry.workId)) {
      fail(
        "evaluation.corpus.duplicate-work-id",
        "A stable work id identifies more than one corpus entry.",
        "Assign a unique project-local workId.",
        `${prefix}.workId`,
      );
    }
    workIds.add(entry.workId);
    if (!CHECKSUM_PATTERN.test(entry.sourceChecksum)) {
      fail(
        "evaluation.corpus.invalid-checksum",
        "Source identity cannot be reproduced from the declared checksum.",
        "Record a lowercase sha256 checksum using the sha256:<hex> form.",
        `${prefix}.sourceChecksum`,
      );
    }
    if (entry.voiceCount !== 4) {
      fail(
        "evaluation.corpus.voice-count",
        "The reference evaluation contract requires four persistent voices.",
        "Use a four-voice source or mark the entry excluded.",
        `${prefix}.voiceCount`,
      );
    }
    if (entry.redistributionStatus === "metadata-only" && entry.importStatus === "available") {
      fail(
        "evaluation.corpus.license-import-conflict",
        "An available imported score would exceed its metadata-only redistribution boundary.",
        "Mark it user-action-required or provide a redistributable source.",
        `${prefix}.importStatus`,
      );
    }
    if (entry.importStatus === "excluded" && !entry.exclusionReason) {
      fail(
        "evaluation.corpus.missing-exclusion-reason",
        "Reviewers cannot reconstruct why this source was excluded.",
        "Add a concise exclusionReason.",
        `${prefix}.exclusionReason`,
      );
    }
    for (const group of [`work:${entry.splitGroup}`, `subject:${entry.subjectFamilyGroup}`]) {
      const previous = ownership.get(group);
      if (previous !== undefined && previous !== entry.split) {
        fail(
          "evaluation.corpus.split-leakage",
          "Related score material appears in more than one train/holdout split.",
          "Assign every work and subject-family group to exactly one split.",
          `${prefix}.split`,
        );
      }
      ownership.set(group, entry.split);
    }
  }
}

function requireEnum(value: string, allowed: readonly string[], field: string): void {
  if (!allowed.includes(value)) {
    fail(
      "evaluation.corpus.invalid-enum",
      "A corpus policy field uses unsupported semantics.",
      `Choose one of: ${allowed.join(", ")}.`,
      field,
    );
  }
}

export function validateNormalizedScore(score: NormalizedReferenceScore): void {
  if (score.schemaVersion !== 1) {
    fail(
      "evaluation.score.unsupported-schema",
      "Normalized score semantics are unknown.",
      "Re-import the score with normalized score schema v1.",
      "schemaVersion",
    );
  }
  if (score.voices.length !== 4 || VOICES.some((voice) => !score.voices.includes(voice))) {
    fail(
      "evaluation.score.voice-identity",
      "Feature denominators require four stable voice identities.",
      "Map source parts to soprano, alto, tenor, and bass.",
      "voices",
    );
  }
  if (!(score.ticksPerQuarter > 0) || !(score.lengthTicks > 0)) {
    fail(
      "evaluation.score.timebase",
      "Feature timing cannot be normalized without a positive timebase and score length.",
      "Provide positive ticksPerQuarter and lengthTicks.",
      "ticksPerQuarter",
    );
  }
  if (!score.key.tonic || !score.key.mode) {
    fail(
      "evaluation.score.key-metadata",
      "Key-relative feature semantics would be ambiguous.",
      "Provide tonic and mode metadata.",
      "key",
    );
  }
  if (!(score.meter.numerator > 0) || !(score.meter.denominator > 0)) {
    fail(
      "evaluation.score.meter-metadata",
      "Metrical feature semantics would be ambiguous.",
      "Provide a supported time signature.",
      "meter",
    );
  }
  const previousByVoice = new Map<string, number>();
  for (const [index, note] of score.notes.entries()) {
    if (!Number.isInteger(note.startTick) || note.startTick < 0) {
      fail(
        "evaluation.score.invalid-start-tick",
        "A note cannot be placed on the normalized timeline.",
        "Use a non-negative integer startTick.",
        `notes[${index}].startTick`,
      );
    }
    if (!Number.isInteger(note.durationTicks) || note.durationTicks <= 0) {
      fail(
        "evaluation.score.invalid-duration",
        "Zero or negative notes corrupt active-duration normalizers.",
        "Use a positive integer durationTicks.",
        `notes[${index}].durationTicks`,
      );
    }
    if (!Number.isInteger(note.pitch) || note.pitch < 0 || note.pitch > 127) {
      fail(
        "evaluation.score.invalid-pitch",
        "The normalized pitch is outside the MIDI contract.",
        "Map the note to an integer MIDI pitch from 0 through 127.",
        `notes[${index}].pitch`,
      );
    }
    const previous = previousByVoice.get(note.voice) ?? -1;
    if (note.startTick < previous) {
      fail(
        "evaluation.score.non-monotonic-voice",
        "Voice-local note order is not deterministic.",
        "Sort notes by voice start tick before validation.",
        `notes[${index}].startTick`,
      );
    }
    previousByVoice.set(note.voice, note.startTick);
  }
}

function requireText(value: string, field: string): void {
  if (value.trim().length === 0) {
    fail(
      "evaluation.corpus.missing-field",
      "Required corpus provenance is incomplete.",
      "Fill the named manifest field.",
      field,
    );
  }
}

function fail(id: string, why: string, action: string, field?: string): never {
  throw new EvaluationContractError({ id, why, action, field });
}
