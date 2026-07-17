import type { FugueState, Voice } from "@fugematon/core";
import { validateNormalizedScore } from "./corpus.js";
import {
  EVALUATION_FEATURE_SCHEMA_VERSION,
  EvaluationContractError,
  type EvaluationFeature,
  type EvaluationFeatureVector,
  type FeatureEvidencePointer,
  type NormalizedNote,
  type NormalizedReferenceScore,
} from "./types.js";

const VOICES = ["soprano", "alto", "tenor", "bass"] as const;
const SECTION_ROLES = [
  "exposition",
  "episode",
  "subject-return",
  "stretto-like",
] as const satisfies readonly FugueState[];

export function extractEvaluationFeatures(score: NormalizedReferenceScore): EvaluationFeatureVector {
  validateNormalizedScore(score);
  const scoreQuarters = score.lengthTicks / score.ticksPerQuarter;
  const features: EvaluationFeature[] = [];
  const notesByVoice = new Map<Voice, NormalizedNote[]>(
    VOICES.map((voice) => [voice, score.notes.filter((note) => note.voice === voice)]),
  );
  let leapCount = 0;
  let leapRecoveryCount = 0;
  const leapEvidence: FeatureEvidencePointer[] = [];
  for (const voice of VOICES) {
    const notes = notesByVoice.get(voice)!;
    for (let index = 1; index < notes.length; index += 1) {
      const interval = notes[index]!.pitch - notes[index - 1]!.pitch;
      if (Math.abs(interval) < 5) continue;
      leapCount += 1;
      const next = notes[index + 1];
      if (next !== undefined) {
        const recovery = next.pitch - notes[index]!.pitch;
        if (Math.sign(recovery) === -Math.sign(interval) && Math.abs(recovery) <= 2) leapRecoveryCount += 1;
      }
      leapEvidence.push(pointer(score, notes[index]!.startTick, [voice]));
    }
  }
  features.push(
    feature(
      score,
      "note.melodic-leap-rate",
      "note-transition",
      "Melodic transitions of a perfect fourth or larger per score quarter.",
      "reference-relative",
      leapCount,
      scoreQuarters,
      "score-quarters",
      leapEvidence,
    ),
  );
  const nonChordTransitions = inferredNonChordTransitions(score, notesByVoice);
  features.push(
    feature(
      score,
      "note.inferred-non-chord-rate",
      "note-transition",
      "Attacks forming an inferred dissonance against an independently sounding voice.",
      "review-required",
      nonChordTransitions.length,
      score.notes.length,
      "active-window-quarters",
      nonChordTransitions.map((transition) => pointer(score, transition.note.startTick, [transition.note.voice])),
      { transformation: "inferred-non-chord" },
      "available",
      0.5,
    ),
  );
  features.push(
    feature(
      score,
      "note.inferred-non-chord-preparation-rate",
      "note-transition",
      "Inferred non-chord attacks approached by unison or step in the same voice.",
      "review-required",
      nonChordTransitions.filter((transition) => transition.prepared).length,
      nonChordTransitions.length,
      "active-window-quarters",
      nonChordTransitions
        .filter((transition) => transition.prepared)
        .map((transition) => pointer(score, transition.note.startTick, [transition.note.voice])),
      { transformation: "inferred-non-chord" },
      "available",
      0.5,
    ),
  );
  features.push(
    feature(
      score,
      "note.inferred-non-chord-resolution-rate",
      "note-transition",
      "Inferred non-chord attacks leaving by step in the same voice.",
      "review-required",
      nonChordTransitions.filter((transition) => transition.resolved).length,
      nonChordTransitions.length,
      "active-window-quarters",
      nonChordTransitions
        .filter((transition) => transition.resolved)
        .map((transition) => pointer(score, transition.note.startTick, [transition.note.voice])),
      { transformation: "inferred-non-chord" },
      "available",
      0.5,
    ),
  );
  const roleLabeled = score.notes.filter((note) => note.role !== undefined);
  features.push(
    feature(
      score,
      "note.role-annotation-coverage",
      "note-transition",
      "Notes carrying a thematic or contrapuntal role annotation.",
      "manual-only",
      roleLabeled.length,
      score.notes.length,
      "active-window-quarters",
      roleLabeled.slice(0, 3).map((note) => pointer(score, note.startTick, [note.voice], [note.role!])),
      {},
      roleLabeled.length === 0 ? "missing-annotation" : "available",
      roleLabeled.length === 0 ? 0 : 1,
    ),
  );
  features.push(
    feature(
      score,
      "note.leap-recovery-ratio",
      "note-transition",
      "Large melodic leaps followed by contrary stepwise recovery.",
      "review-required",
      leapRecoveryCount,
      leapCount,
      "active-window-quarters",
      leapEvidence,
    ),
  );

  for (let leftIndex = 0; leftIndex < VOICES.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < VOICES.length; rightIndex += 1) {
      const left = VOICES[leftIndex]!;
      const right = VOICES[rightIndex]!;
      const pair = `${left}:${right}`;
      const windows = pairWindows(notesByVoice.get(left)!, notesByVoice.get(right)!);
      const activeQuarters = windows.reduce((sum, window) => sum + window.duration / score.ticksPerQuarter, 0);
      const unisonTicks = windows
        .filter((window) => Math.abs(window.left.pitch - window.right.pitch) % 12 === 0)
        .reduce((sum, window) => sum + window.duration, 0);
      const exactUnisonTicks = windows
        .filter((window) => window.left.pitch === window.right.pitch)
        .reduce((sum, window) => sum + window.duration, 0);
      const sharedAttacks = sharedAttackCount(notesByVoice.get(left)!, notesByVoice.get(right)!);
      const motions = pairMotions(notesByVoice.get(left)!, notesByVoice.get(right)!);
      const parallelPerfects = motions.filter(
        (motion) =>
          motion.motion === "similar" && isPerfect(motion.previousInterval) && isPerfect(motion.currentInterval),
      );
      const contraryMotions = motions.filter((motion) => motion.motion === "contrary");
      const evidence = windows
        .filter((window) => Math.abs(window.left.pitch - window.right.pitch) % 12 === 0)
        .slice(0, 3)
        .map((window) => pointer(score, window.start, [left, right]));
      features.push(
        feature(
          score,
          `pair.${pair}.exact-unison`,
          "voice-pair",
          "Exact same-pitch duration per active voice-pair quarter.",
          "review-required",
          exactUnisonTicks / score.ticksPerQuarter,
          activeQuarters,
          "active-voice-pair-quarters",
          windows
            .filter((window) => window.left.pitch === window.right.pitch)
            .map((window) => pointer(score, window.start, [left, right])),
          { voicePair: pair },
        ),
      );
      features.push(
        feature(
          score,
          `pair.${pair}.pitch-class-unison`,
          "voice-pair",
          "Pitch-class unison duration per active voice-pair quarter.",
          "reference-relative",
          unisonTicks / score.ticksPerQuarter,
          activeQuarters,
          "active-voice-pair-quarters",
          evidence,
          { voicePair: pair },
        ),
      );
      features.push(
        feature(
          score,
          `pair.${pair}.parallel-perfect-rate`,
          "voice-pair",
          "Similar-motion transitions between consecutive perfect intervals per shared attack transition.",
          "review-required",
          parallelPerfects.length,
          motions.length,
          "active-voice-pair-quarters",
          parallelPerfects.map((motion) => pointer(score, motion.tick, [left, right])),
          { voicePair: pair },
        ),
      );
      features.push(
        feature(
          score,
          `pair.${pair}.contrary-motion-rate`,
          "voice-pair",
          "Contrary motion between consecutive shared attacks.",
          "reference-relative",
          contraryMotions.length,
          motions.length,
          "active-voice-pair-quarters",
          contraryMotions.map((motion) => pointer(score, motion.tick, [left, right])),
          { voicePair: pair },
        ),
      );
      features.push(
        feature(
          score,
          `pair.${pair}.rhythmic-lockstep-rate`,
          "voice-pair",
          "Simultaneous attacks per distinct attack made by either voice.",
          "review-required",
          sharedAttacks,
          distinctAttackCount(notesByVoice.get(left)!, notesByVoice.get(right)!),
          "active-voice-pair-quarters",
          [],
          { voicePair: pair },
        ),
      );
      features.push(
        feature(
          score,
          `pair.${pair}.shared-attack-rate`,
          "voice-pair",
          "Simultaneous attacks per active voice-pair quarter.",
          "review-required",
          sharedAttacks,
          activeQuarters,
          "active-voice-pair-quarters",
          [],
          { voicePair: pair },
        ),
      );
      const averageSpacing =
        windows.length === 0
          ? 0
          : windows.reduce(
              (sum, window) => sum + Math.abs(window.left.pitch - window.right.pitch) * window.duration,
              0,
            ) / windows.reduce((sum, window) => sum + window.duration, 0);
      features.push(
        feature(
          score,
          `pair.${pair}.mean-register-spacing`,
          "voice-pair",
          "Duration-weighted mean semitone spacing for an active voice pair.",
          "reference-relative",
          averageSpacing,
          1,
          "active-voice-pair-quarters",
          [],
          { voicePair: pair },
        ),
      );
    }
  }

  const entryAvailability = score.annotations.entries.length === 0 ? "missing-annotation" : "available";
  const entryConfidence = minimumConfidence(score.annotations.entries.map((entry) => entry.provenance.confidence));
  const supportedEntries = score.annotations.entries.filter((entry) =>
    score.notes.some((note) => note.voice !== entry.voice && overlaps(note, entry.startTick, entry.endTick)),
  );
  features.push(
    feature(
      score,
      "entry.support-voice-coverage",
      "entry-window",
      "Thematic entries with at least one independently active support voice.",
      "reference-relative",
      supportedEntries.length,
      score.annotations.entries.length,
      "entry-count",
      supportedEntries.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      {},
      entryAvailability,
      entryConfidence,
    ),
  );
  const entryFrictions = score.annotations.entries.filter((entry) => entryHasAccentedFriction(score, entry));
  const resolvedFrictions = entryFrictions.filter((entry) => entryFrictionResolves(score, entry));
  const counterSubjectEntries = score.annotations.entries.filter((entry) =>
    score.notes.some(
      (note) =>
        note.voice !== entry.voice && note.role === "counter-subject" && overlaps(note, entry.startTick, entry.endTick),
    ),
  );
  const roleAvailability = roleLabeled.length === 0 ? "missing-annotation" : entryAvailability;
  features.push(
    feature(
      score,
      "entry.accented-friction-rate",
      "entry-window",
      "Thematic entries beginning against a dissonant support interval on a metrical accent.",
      "review-required",
      entryFrictions.length,
      score.annotations.entries.length,
      "entry-count",
      entryFrictions.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      { metricalStrength: "strong" },
      entryAvailability,
      entryConfidence,
    ),
  );
  features.push(
    feature(
      score,
      "entry.friction-resolution-rate",
      "entry-window",
      "Accented entry frictions that move to consonant support within one quarter note.",
      "review-required",
      resolvedFrictions.length,
      entryFrictions.length,
      "entry-count",
      resolvedFrictions.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      {},
      entryAvailability,
      entryConfidence,
    ),
  );
  features.push(
    feature(
      score,
      "entry.counter-subject-preservation-rate",
      "entry-window",
      "Thematic entries accompanied by an explicitly annotated counter-subject.",
      "reference-relative",
      counterSubjectEntries.length,
      score.annotations.entries.length,
      "entry-count",
      counterSubjectEntries.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      {},
      roleAvailability,
      roleAvailability === "available" ? entryConfidence : 0,
    ),
  );
  const continuityEntries = score.annotations.entries.filter((entry) =>
    score.notes.some(
      (note) =>
        note.voice !== entry.voice &&
        note.startTick < entry.startTick &&
        note.startTick + note.durationTicks > entry.startTick,
    ),
  );
  features.push(
    feature(
      score,
      "entry.boundary-continuity",
      "entry-window",
      "Thematic entries crossed by an already sounding support line.",
      "review-required",
      continuityEntries.length,
      score.annotations.entries.length,
      "entry-count",
      continuityEntries.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      {},
      entryAvailability,
      entryConfidence,
    ),
  );

  const sectionAvailability = score.annotations.sections.length === 0 ? "missing-annotation" : "available";
  for (const role of SECTION_ROLES) {
    const sections = score.annotations.sections.filter((section) => section.role === role);
    const sectionQuarters = sections.reduce(
      (sum, section) => sum + (section.endTick - section.startTick) / score.ticksPerQuarter,
      0,
    );
    const activeTicks = sections.reduce(
      (sum, section) =>
        sum +
        score.notes.reduce((noteSum, note) => noteSum + overlapDuration(note, section.startTick, section.endTick), 0),
      0,
    );
    const evidence = sections.map((section) =>
      pointer(score, section.startTick, undefined, [section.role], section.id),
    );
    const availability = sections.length === 0 ? "not-applicable" : sectionAvailability;
    const confidence = minimumConfidence(sections.map((section) => section.provenance.confidence));
    features.push(
      feature(
        score,
        `section.role.${role}.texture-density`,
        "section",
        "Voice-active quarters normalized by duration for sections with the named role.",
        "reference-relative",
        activeTicks / score.ticksPerQuarter,
        sectionQuarters * 4,
        "section-count",
        evidence,
        { sectionRole: role },
        availability,
        confidence,
      ),
    );
    const bassDirections = sections.map((section) => {
      const bassNotes = score.notes.filter(
        (note) => note.voice === "bass" && overlaps(note, section.startTick, section.endTick),
      );
      return {
        value: bassNotes.length < 2 ? 0 : bassNotes.at(-1)!.pitch - bassNotes[0]!.pitch,
        evidence:
          bassNotes.length === 0
            ? undefined
            : pointer(score, bassNotes[0]!.startTick, ["bass"], [section.role], section.id),
      };
    });
    features.push(
      feature(
        score,
        `section.role.${role}.bass-direction-per-quarter`,
        "section",
        "Net bass-line semitone direction normalized by duration for sections with the named role.",
        "reference-relative",
        bassDirections.reduce((sum, direction) => sum + direction.value, 0),
        Math.max(sectionQuarters, 1),
        "section-count",
        bassDirections.flatMap((direction) => (direction.evidence === undefined ? [] : [direction.evidence])),
        { sectionRole: role },
        availability,
        confidence,
      ),
    );
    const derivations =
      role === "episode"
        ? sections.map((section) =>
            motivicDerivation(
              score,
              score.notes.filter((note) => overlaps(note, section.startTick, section.endTick)),
            ),
          )
        : [];
    features.push(
      feature(
        score,
        `section.role.${role}.motivic-derivation-rate`,
        "section",
        "Melodic interval trigrams in sections with the named role that occur in the opening thematic material.",
        "review-required",
        derivations.reduce((sum, derivation) => sum + derivation.matches, 0),
        derivations.reduce((sum, derivation) => sum + derivation.total, 0),
        "section-count",
        evidence,
        { sectionRole: role, transformation: "interval-trigram" },
        role === "episode" ? availability : "not-applicable",
        confidence,
      ),
    );
  }
  const densities = score.annotations.sections.map((section) =>
    sectionDensity(score, section.startTick, section.endTick),
  );
  const contrast = densities.slice(1).reduce((sum, density, index) => sum + Math.abs(density - densities[index]!), 0);
  features.push(
    feature(
      score,
      "section.adjacent-texture-contrast",
      "section",
      "Mean texture-density change between adjacent sections.",
      "review-required",
      contrast,
      Math.max(densities.length - 1, 0),
      "section-count",
      [],
      {},
      sectionAvailability,
      minimumConfidence(score.annotations.sections.map((section) => section.provenance.confidence)),
    ),
  );
  const sectionDurations = score.annotations.sections.map((section) => section.endTick - section.startTick);
  const formBalance = normalizedBalance(sectionDurations);
  const motiveConcentration = intervalTrigramConcentration(score.notes);
  const cadenceApproaches = score.annotations.cadences.filter((cadence) => cadenceApproach(score, cadence.tick));
  features.push(
    feature(
      score,
      "section.cadence-approach-rate",
      "section",
      "Annotated cadences approached by contrary or stepwise outer-voice motion.",
      "review-required",
      cadenceApproaches.length,
      score.annotations.cadences.length,
      "section-count",
      cadenceApproaches.map((cadence) => pointer(score, cadence.tick, ["soprano", "bass"])),
      {},
      score.annotations.cadences.length === 0 ? "missing-annotation" : "available",
      minimumConfidence(score.annotations.cadences.map((cadence) => cadence.provenance.confidence)),
    ),
  );
  features.push(
    feature(
      score,
      "score.form-balance",
      "whole-score",
      "Balance of section durations, where one means equal duration and lower values indicate concentration.",
      "reference-relative",
      formBalance,
      1,
      "section-count",
      score.annotations.sections.map((section) =>
        pointer(score, section.startTick, undefined, [section.role], section.id),
      ),
      {},
      sectionAvailability,
      minimumConfidence(score.annotations.sections.map((section) => section.provenance.confidence)),
    ),
  );
  features.push(
    feature(
      score,
      "score.interval-motive-concentration",
      "whole-score",
      "Share of melodic interval trigrams belonging to the most frequent phrase family.",
      "review-required",
      motiveConcentration.maximum,
      motiveConcentration.total,
      "score-quarters",
      [],
    ),
  );
  features.push(
    feature(
      score,
      "score.long-window-development",
      "whole-score",
      "Distinct melodic interval trigrams per observed interval trigram.",
      "reference-relative",
      motiveConcentration.distinct,
      motiveConcentration.total,
      "score-quarters",
      [],
    ),
  );

  const roleCounts = new Map(
    score.annotations.entries.map((entry) => [
      entry.form,
      score.annotations.entries.filter((candidate) => candidate.form === entry.form).length,
    ]),
  );
  for (const form of ["subject", "answer", "subject-fragment"] as const) {
    const entries = score.annotations.entries.filter((entry) => entry.form === form);
    features.push(
      feature(
        score,
        `entry.form.${form}.rate`,
        "entry-window",
        "Share of thematic entries carrying the named subject or answer identity.",
        "reference-relative",
        entries.length,
        score.annotations.entries.length,
        "entry-count",
        entries.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
        { entryRole: form },
        entryAvailability,
        entryConfidence,
      ),
    );
  }
  const entriesByVoice = VOICES.map(
    (voice) => score.annotations.entries.filter((entry) => entry.voice === voice).length,
  );
  features.push(
    feature(
      score,
      "score.entry-voice-balance",
      "whole-score",
      "Balance of thematic entry counts across the four persistent voices.",
      "reference-relative",
      normalizedBalance(entriesByVoice),
      1,
      "entry-count",
      score.annotations.entries.map((entry) => pointer(score, entry.startTick, [entry.voice], [entry.form])),
      {},
      entryAvailability,
      entryConfidence,
    ),
  );
  features.push(
    feature(
      score,
      "score.subject-return-rate",
      "whole-score",
      "Subject or answer entries outside the initial exposition per score quarter.",
      "reference-relative",
      score.annotations.entries.filter((entry) => sectionAt(score, entry.startTick) !== "exposition").length,
      scoreQuarters,
      "score-quarters",
      [],
      {},
      entryAvailability,
      entryConfidence,
    ),
  );
  features.push(
    feature(
      score,
      "score.entry-form-diversity",
      "whole-score",
      "Distinct thematic entry forms represented in the score.",
      "review-required",
      roleCounts.size,
      3,
      "entry-count",
      [],
      {},
      entryAvailability,
      entryConfidence,
    ),
  );
  features.push(
    feature(
      score,
      "score.terminal-active-voice-ratio",
      "whole-score",
      "Active voices during the final score quarter.",
      "reference-relative",
      activeVoiceCount(score, Math.max(0, score.lengthTicks - score.ticksPerQuarter), score.lengthTicks),
      4,
      "active-window-quarters",
      [pointer(score, Math.max(0, score.lengthTicks - score.ticksPerQuarter))],
    ),
  );

  const vector: EvaluationFeatureVector = {
    schemaVersion: EVALUATION_FEATURE_SCHEMA_VERSION,
    scoreId: score.scoreId,
    sourceKind: score.sourceKind,
    features: features.sort((a, b) => a.id.localeCompare(b.id)),
  };
  validateEvaluationFeatureVector(vector);
  return vector;
}

export function serializeFeatureVector(vector: EvaluationFeatureVector): Uint8Array {
  validateEvaluationFeatureVector(vector);
  return new TextEncoder().encode(`${JSON.stringify(vector)}\n`);
}

export function validateEvaluationFeatureVector(vector: EvaluationFeatureVector): void {
  if (vector.schemaVersion !== EVALUATION_FEATURE_SCHEMA_VERSION) {
    throw new EvaluationContractError({
      id: "evaluation.feature.unsupported-schema",
      why: "Feature meanings cannot be reconstructed for this schema version.",
      action: "Migrate or regenerate the feature vector with the supported schema.",
    });
  }
  const expected = expectedFeatureIds();
  const seen = new Set<string>();
  for (const feature of vector.features) {
    if (!expected.has(feature.id)) {
      throw new EvaluationContractError({
        id: "evaluation.feature.unknown-feature",
        why: "A feature id has no meaning in the declared schema version.",
        action: "Migrate or regenerate the feature vector instead of silently accepting the unknown feature.",
        field: feature.id,
      });
    }
    if (seen.has(feature.id)) {
      throw new EvaluationContractError({
        id: "evaluation.feature.duplicate-feature",
        why: "A feature id appears more than once in one vector.",
        action: "Regenerate the vector with one canonical value per feature id.",
        field: feature.id,
      });
    }
    seen.add(feature.id);
    if (
      !Number.isFinite(feature.numerator) ||
      !Number.isFinite(feature.denominator) ||
      !Number.isFinite(feature.value) ||
      !Number.isFinite(feature.confidence) ||
      feature.confidence < 0 ||
      feature.confidence > 1
    ) {
      throw new EvaluationContractError({
        id: "evaluation.feature.malformed-value",
        why: "Feature value or confidence is outside the deterministic numeric contract.",
        action: "Regenerate the feature vector from a validated normalized score.",
        field: feature.id,
      });
    }
  }
  const missing = [...expected].filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new EvaluationContractError({
      id: "evaluation.feature.missing-feature",
      why: "A required feature is absent rather than explicitly marked unavailable.",
      action: "Regenerate the vector and use availability for missing annotations.",
      field: missing[0],
    });
  }
}

function expectedFeatureIds(): Set<string> {
  const ids = new Set([
    "note.melodic-leap-rate",
    "note.role-annotation-coverage",
    "note.leap-recovery-ratio",
    "note.inferred-non-chord-rate",
    "note.inferred-non-chord-preparation-rate",
    "note.inferred-non-chord-resolution-rate",
    "entry.support-voice-coverage",
    "entry.accented-friction-rate",
    "entry.friction-resolution-rate",
    "entry.counter-subject-preservation-rate",
    "entry.boundary-continuity",
    "entry.form.subject.rate",
    "entry.form.answer.rate",
    "entry.form.subject-fragment.rate",
    "section.adjacent-texture-contrast",
    "section.cadence-approach-rate",
    "score.form-balance",
    "score.interval-motive-concentration",
    "score.long-window-development",
    "score.subject-return-rate",
    "score.entry-form-diversity",
    "score.terminal-active-voice-ratio",
    "score.entry-voice-balance",
  ]);
  for (let left = 0; left < VOICES.length; left += 1) {
    for (let right = left + 1; right < VOICES.length; right += 1) {
      const pair = `${VOICES[left]}:${VOICES[right]}`;
      for (const suffix of [
        "pitch-class-unison",
        "exact-unison",
        "parallel-perfect-rate",
        "contrary-motion-rate",
        "rhythmic-lockstep-rate",
        "shared-attack-rate",
        "mean-register-spacing",
      ])
        ids.add(`pair.${pair}.${suffix}`);
    }
  }
  for (const role of SECTION_ROLES) {
    ids.add(`section.role.${role}.texture-density`);
    ids.add(`section.role.${role}.bass-direction-per-quarter`);
    ids.add(`section.role.${role}.motivic-derivation-rate`);
  }
  return ids;
}

function feature(
  score: NormalizedReferenceScore,
  id: string,
  group: EvaluationFeature["group"],
  definition: string,
  policyClass: EvaluationFeature["policyClass"],
  numerator: number,
  denominator: number,
  normalizer: EvaluationFeature["normalizer"],
  evidence: FeatureEvidencePointer[],
  grouping: Omit<EvaluationFeature["grouping"], "styleProfile"> = {},
  availability: EvaluationFeature["availability"] = "available",
  confidence = 1,
): EvaluationFeature {
  return {
    id,
    group,
    definition,
    policyClass,
    numerator: round(numerator),
    denominator: round(denominator),
    normalizer,
    value: denominator > 0 ? round(numerator / denominator) : 0,
    availability,
    confidence: round(confidence),
    grouping: { styleProfile: score.styleProfile, ...grouping },
    evidence: evidence.slice(0, 3),
  };
}

function pointer(
  score: NormalizedReferenceScore,
  tick: number,
  voices?: Voice[],
  roles?: string[],
  sectionId?: string,
): FeatureEvidencePointer {
  return {
    scoreId: score.scoreId,
    sectionId:
      sectionId ??
      score.annotations.sections.find((section) => tick >= section.startTick && tick < section.endTick)?.id,
    tick,
    voices,
    roles,
  };
}

function pairWindows(
  left: NormalizedNote[],
  right: NormalizedNote[],
): { left: NormalizedNote; right: NormalizedNote; start: number; duration: number }[] {
  const windows = [];
  for (const leftNote of left)
    for (const rightNote of right) {
      const start = Math.max(leftNote.startTick, rightNote.startTick);
      const end = Math.min(leftNote.startTick + leftNote.durationTicks, rightNote.startTick + rightNote.durationTicks);
      if (end > start) windows.push({ left: leftNote, right: rightNote, start, duration: end - start });
    }
  return windows;
}

function sharedAttackCount(left: NormalizedNote[], right: NormalizedNote[]): number {
  const starts = new Set(left.map((note) => note.startTick));
  return new Set(right.filter((note) => starts.has(note.startTick)).map((note) => note.startTick)).size;
}

function distinctAttackCount(left: NormalizedNote[], right: NormalizedNote[]): number {
  return new Set([...left, ...right].map((note) => note.startTick)).size;
}

function pairMotions(
  left: NormalizedNote[],
  right: NormalizedNote[],
): { tick: number; previousInterval: number; currentInterval: number; motion: "similar" | "contrary" | "oblique" }[] {
  const leftByTick = new Map(left.map((note) => [note.startTick, note]));
  const attacks = right
    .filter((note) => leftByTick.has(note.startTick))
    .map((rightNote) => ({ tick: rightNote.startTick, left: leftByTick.get(rightNote.startTick)!, right: rightNote }))
    .sort((a, b) => a.tick - b.tick);
  return attacks.slice(1).map((current, index) => {
    const previous = attacks[index]!;
    const leftMotion = current.left.pitch - previous.left.pitch;
    const rightMotion = current.right.pitch - previous.right.pitch;
    return {
      tick: current.tick,
      previousInterval: previous.left.pitch - previous.right.pitch,
      currentInterval: current.left.pitch - current.right.pitch,
      motion:
        leftMotion === 0 || rightMotion === 0
          ? "oblique"
          : Math.sign(leftMotion) === Math.sign(rightMotion)
            ? "similar"
            : "contrary",
    };
  });
}

function inferredNonChordTransitions(
  score: NormalizedReferenceScore,
  notesByVoice: ReadonlyMap<Voice, NormalizedNote[]>,
): { note: NormalizedNote; prepared: boolean; resolved: boolean }[] {
  return VOICES.flatMap((voice) => {
    const notes = notesByVoice.get(voice) ?? [];
    return notes.flatMap((note, index) => {
      const support = score.notes.filter(
        (candidate) =>
          candidate.voice !== voice &&
          candidate.startTick < note.startTick &&
          candidate.startTick + candidate.durationTicks > note.startTick,
      );
      if (
        support.length === 0 ||
        support.every((candidate) =>
          candidate.voice === "bass" && Math.abs(note.pitch - candidate.pitch) % 12 === 5
            ? false
            : isConsonant(note.pitch - candidate.pitch),
        )
      )
        return [];
      const previous = notes[index - 1];
      const next = notes[index + 1];
      return [
        {
          note,
          prepared: previous !== undefined && Math.abs(note.pitch - previous.pitch) <= 2,
          resolved: next !== undefined && Math.abs(next.pitch - note.pitch) <= 2,
        },
      ];
    });
  });
}

function isPerfect(interval: number): boolean {
  const pitchClass = Math.abs(interval) % 12;
  return pitchClass === 0 || pitchClass === 7;
}

function isConsonant(interval: number): boolean {
  return [0, 3, 4, 5, 7, 8, 9].includes(Math.abs(interval) % 12);
}

function entryHasAccentedFriction(
  score: NormalizedReferenceScore,
  entry: NormalizedReferenceScore["annotations"]["entries"][number],
): boolean {
  const beatTicks = (score.ticksPerQuarter * 4) / score.meter.denominator;
  if (entry.startTick % beatTicks !== 0) return false;
  const subject = activeNote(score, entry.voice, entry.startTick);
  if (subject === undefined) return false;
  return score.notes.some(
    (note) =>
      note.voice !== entry.voice &&
      overlaps(note, entry.startTick, entry.startTick + 1) &&
      !isConsonant(subject.pitch - note.pitch),
  );
}

function entryFrictionResolves(
  score: NormalizedReferenceScore,
  entry: NormalizedReferenceScore["annotations"]["entries"][number],
): boolean {
  const end = Math.min(entry.endTick, entry.startTick + score.ticksPerQuarter);
  const ticks = new Set(
    score.notes
      .filter((note) => note.startTick > entry.startTick && note.startTick <= end)
      .map((note) => note.startTick),
  );
  for (const tick of [...ticks].sort((a, b) => a - b)) {
    const subject = activeNote(score, entry.voice, tick);
    const support = score.notes.filter((note) => note.voice !== entry.voice && overlaps(note, tick, tick + 1));
    if (
      subject !== undefined &&
      support.length > 0 &&
      support.every((note) => isConsonant(subject.pitch - note.pitch))
    ) {
      return true;
    }
  }
  return false;
}

function activeNote(score: NormalizedReferenceScore, voice: Voice, tick: number): NormalizedNote | undefined {
  return score.notes.find((note) => note.voice === voice && overlaps(note, tick, tick + 1));
}

function motivicDerivation(
  score: NormalizedReferenceScore,
  sectionNotes: NormalizedNote[],
): { matches: number; total: number } {
  const firstEntry = score.annotations.entries[0];
  const opening =
    firstEntry === undefined
      ? score.notes.filter((note) => note.voice === earliestVoice(score.notes)).slice(0, 10)
      : score.notes.filter(
          (note) => note.voice === firstEntry.voice && overlaps(note, firstEntry.startTick, firstEntry.endTick),
        );
  const subjectPatterns = new Set(intervalTrigrams(opening));
  const episodePatterns = VOICES.flatMap((voice) =>
    intervalTrigrams(sectionNotes.filter((note) => note.voice === voice)),
  );
  return {
    matches: episodePatterns.filter((pattern) => subjectPatterns.has(pattern)).length,
    total: episodePatterns.length,
  };
}

function intervalTrigramConcentration(notes: NormalizedNote[]): { maximum: number; total: number; distinct: number } {
  const patterns = VOICES.flatMap((voice) => intervalTrigrams(notes.filter((note) => note.voice === voice)));
  const counts = new Map<string, number>();
  for (const pattern of patterns) counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  return { maximum: Math.max(0, ...counts.values()), total: patterns.length, distinct: counts.size };
}

function intervalTrigrams(notes: NormalizedNote[]): string[] {
  const ordered = [...notes].sort((a, b) => a.startTick - b.startTick || a.pitch - b.pitch);
  const intervals = ordered.slice(1).map((note, index) => note.pitch - ordered[index]!.pitch);
  return intervals.slice(0, -1).map((interval, index) => `${interval},${intervals[index + 1]}`);
}

function earliestVoice(notes: NormalizedNote[]): Voice {
  return [...notes].sort((a, b) => a.startTick - b.startTick)[0]?.voice ?? "soprano";
}

function normalizedBalance(durations: number[]): number {
  if (durations.length <= 1) return durations.length;
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  return total === 0 ? 0 : Math.max(0, 1 - (Math.max(...durations) - Math.min(...durations)) / total);
}

function cadenceApproach(score: NormalizedReferenceScore, tick: number): boolean {
  const motions = (["soprano", "bass"] as const).map((voice) =>
    score.notes.filter((note) => note.voice === voice && note.startTick < tick).slice(-2),
  );
  if (motions.some((notes) => notes.length < 2)) return false;
  const soprano = motions[0]![1]!.pitch - motions[0]![0]!.pitch;
  const bass = motions[1]![1]!.pitch - motions[1]![0]!.pitch;
  return Math.sign(soprano) === -Math.sign(bass) || Math.abs(soprano) <= 2 || Math.abs(bass) <= 2;
}

function overlaps(note: NormalizedNote, start: number, end: number): boolean {
  return note.startTick < end && note.startTick + note.durationTicks > start;
}
function overlapDuration(note: NormalizedNote, start: number, end: number): number {
  return Math.max(0, Math.min(note.startTick + note.durationTicks, end) - Math.max(note.startTick, start));
}
function sectionDensity(score: NormalizedReferenceScore, start: number, end: number): number {
  return score.notes.reduce((sum, note) => sum + overlapDuration(note, start, end), 0) / Math.max((end - start) * 4, 1);
}
function sectionAt(score: NormalizedReferenceScore, tick: number): FugueState | undefined {
  return score.annotations.sections.find((section) => tick >= section.startTick && tick < section.endTick)?.role;
}
function activeVoiceCount(score: NormalizedReferenceScore, start: number, end: number): number {
  return new Set(score.notes.filter((note) => overlaps(note, start, end)).map((note) => note.voice)).size;
}
function minimumConfidence(values: number[]): number {
  return values.length === 0 ? 0 : Math.min(...values);
}
function round(value: number): number {
  return Number(value.toFixed(9));
}
