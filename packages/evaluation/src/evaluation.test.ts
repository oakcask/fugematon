import assert from "node:assert/strict";
import test from "node:test";
import type { ScoreEvent, Voice } from "@fugematon/core";
import {
  type CorpusManifest,
  createActiveLearningQueue,
  createBlindedComparison,
  createPairwisePlaybackState,
  createShadowReport,
  EvaluationContractError,
  extractEvaluationFeatures,
  importHumdrumKern,
  importMusicXml,
  loadPairwiseModel,
  mergePairwiseResponses,
  type NormalizedReferenceScore,
  normalizeGeneratedScore,
  PAIRWISE_BUNDLE_SCHEMA,
  PAIRWISE_RESPONSE_SCHEMA,
  type PairwiseBundleManifest,
  type PairwiseResponseSet,
  type PairwiseTrainingRow,
  pausePairwisePlayback,
  playPairwiseSide,
  predictPairwise,
  seekPairwisePlayback,
  serializeFeatureVector,
  serializePairwiseModel,
  setPairwiseLoop,
  stopPairwisePlayback,
  summarizePairwiseLabels,
  trainPairwiseModel,
  validateCorpusManifest,
  validateNormalizedScore,
  validatePairwiseBundle,
  validatePairwiseResponses,
} from "./index.js";

const musicXml = `<?xml version="1.0"?>
<score-partwise version="4.0">
  <part-list>
    <score-part id="P1"><part-name>Soprano</part-name></score-part>
    <score-part id="P2"><part-name>Alto</part-name></score-part>
    <score-part id="P3"><part-name>Tenor</part-name></score-part>
    <score-part id="P4"><part-name>Bass</part-name></score-part>
  </part-list>
  <part id="P1"><measure number="1"><attributes><divisions>4</divisions><key><fifths>0</fifths><mode>major</mode></key><time><beats>4</beats><beat-type>4</beat-type></time></attributes><note><pitch><step>C</step><octave>5</octave></pitch><duration>4</duration></note><note><pitch><step>G</step><octave>5</octave></pitch><duration>4</duration></note></measure></part>
  <part id="P2"><measure number="1"><note><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note><note><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration></note></measure></part>
  <part id="P3"><measure number="1"><note><pitch><step>E</step><octave>4</octave></pitch><duration>8</duration></note></measure></part>
  <part id="P4"><measure number="1"><note><pitch><step>C</step><octave>3</octave></pitch><duration>8</duration></note></measure></part>
</score-partwise>`;

const humdrumKern = `**kern\t**kern\t**kern\t**kern
*C:\t*C:\t*C:\t*C:
*M4/4\t*M4/4\t*M4/4\t*M4/4
8C\t8G\t8c\t8e
8D\t8A\t8d\t8f#
8E\t8B\t8e\t8g#
8F\t8c\t8f\t8a
8G\t8d\t8g\t8b
8A\t8e\t8a\t8cc#
8G\t8d\t8g\t8b
8F\t8c\t8f\t8a
4F[\t4c\t4f\t4a
4F]\t4c\t4f\t4a
*-\t*-\t*-\t*-
`;

test("Humdrum import preserves logical voices, ties, and inferred annotation provenance", () => {
  const score = importHumdrumKern({ scoreId: "kern-fixture", kern: humdrumKern });
  assert.deepEqual(score.voices, ["soprano", "alto", "tenor", "bass"]);
  assert.equal(score.notes.filter((note) => note.voice === "bass" && note.pitch === 53).at(-1)?.durationTicks, 960);
  assert.ok(score.annotations.entries.length >= 4);
  assert.ok(score.annotations.entries.every((entry) => entry.provenance.source === "inferred"));
  assert.equal(score.annotations.cadences[0]?.tick, score.lengthTicks);
  assert.equal(score.annotations.cadences[0]?.provenance.confidence, 0.2);
  assert.deepEqual(
    serializeFeatureVector(extractEvaluationFeatures(score)),
    serializeFeatureVector(
      extractEvaluationFeatures(importHumdrumKern({ scoreId: "kern-fixture", kern: humdrumKern })),
    ),
  );
});

test("Humdrum invalid spine records fail with actionable ids", () => {
  assert.throws(
    () => importHumdrumKern({ scoreId: "invalid-kern", kern: humdrumKern.replace("8C\t8G\t8c\t8e", "8C\t8G") }),
    (error: unknown) =>
      error instanceof EvaluationContractError &&
      error.detail.id === "evaluation.import.kern-spine-alignment" &&
      error.detail.action.length > 0,
  );
});

test("MusicXML import and shared extraction are deterministic", () => {
  const first = extractEvaluationFeatures(importMusicXml({ scoreId: "fixture-reference", xml: musicXml }));
  const second = extractEvaluationFeatures(importMusicXml({ scoreId: "fixture-reference", xml: musicXml }));
  assert.deepEqual(serializeFeatureVector(first), serializeFeatureVector(second));
  assert.ok(first.features.some((feature) => feature.group === "note-transition"));
  assert.ok(first.features.some((feature) => feature.group === "voice-pair"));
  assert.ok(first.features.some((feature) => feature.group === "section"));
  assert.equal(
    first.features.find((feature) => feature.id === "entry.support-voice-coverage")?.availability,
    "missing-annotation",
  );
});

test("generated ScoreEvent and reference scores share the feature extractor", () => {
  const events: ScoreEvent[] = [
    { kind: "meta", type: "timebase", tick: 0, payload: { ticksPerQuarter: 480 } },
    { kind: "meta", type: "time-signature", tick: 0, payload: { numerator: 4, denominator: 4 } },
    { kind: "meta", type: "key-signature", tick: 0, payload: { tonic: "C", mode: "major" } },
    { kind: "meta", type: "state-change", tick: 0, payload: { state: "exposition" } },
    { kind: "note", voice: "soprano", startTick: 0, durationTicks: 480, pitch: 72, velocity: 80, role: "subject" },
    { kind: "note", voice: "soprano", startTick: 480, durationTicks: 480, pitch: 74, velocity: 80, role: "subject" },
    { kind: "note", voice: "alto", startTick: 0, durationTicks: 480, pitch: 67, velocity: 80, role: "counter-subject" },
    {
      kind: "note",
      voice: "tenor",
      startTick: 0,
      durationTicks: 480,
      pitch: 64,
      velocity: 80,
      role: "free-counterpoint",
    },
    {
      kind: "note",
      voice: "bass",
      startTick: 0,
      durationTicks: 480,
      pitch: 48,
      velocity: 80,
      role: "free-counterpoint",
    },
    { kind: "meta", type: "score-end", tick: 960, payload: { lengthTicks: 960 } },
  ];
  const score = normalizeGeneratedScore({ scoreId: "generated-fixture", events });
  assert.equal(score.annotations.entries.find((entry) => entry.voice === "soprano")?.endTick, 960);
  const vector = extractEvaluationFeatures(score);
  assert.equal(vector.sourceKind, "generated");
  assert.equal(vector.features.find((feature) => feature.id === "entry.support-voice-coverage")?.value, 1);
  assert.equal(
    vector.features.find((feature) => feature.id === "entry.support-voice-coverage")?.evidence[0]?.scoreId,
    "generated-fixture",
  );
});

test("transposition and tick scaling preserve normalized feature semantics", () => {
  const original = annotatedScore();
  const transposed = transformScore(original, 7, 1);
  const scaled = transformScore(original, 0, 3);
  assert.deepEqual(
    semanticValues(extractEvaluationFeatures(original)),
    semanticValues(extractEvaluationFeatures(transposed)),
  );
  assert.deepEqual(
    semanticValues(extractEvaluationFeatures(original)),
    semanticValues(extractEvaluationFeatures(scaled)),
  );
});

test("voice relabeling preserves the unordered musical feature distribution", () => {
  const original = annotatedScore();
  const mapping: Record<Voice, Voice> = { soprano: "alto", alto: "soprano", tenor: "bass", bass: "tenor" };
  const relabeled: NormalizedReferenceScore = {
    ...original,
    scoreId: "relabeled",
    notes: original.notes.map((note) => ({ ...note, voice: mapping[note.voice] })),
    annotations: {
      ...original.annotations,
      entries: original.annotations.entries.map((entry) => ({ ...entry, voice: mapping[entry.voice] })),
    },
  };
  assert.deepEqual(
    groupValueDistribution(extractEvaluationFeatures(original)),
    groupValueDistribution(extractEvaluationFeatures(relabeled)),
  );
});

test("manifest validation detects work and subject-family split leakage", () => {
  const manifest = validManifest();
  validateCorpusManifest(manifest);
  manifest.entries[1]!.splitGroup = manifest.entries[0]!.splitGroup;
  assert.throws(
    () => validateCorpusManifest(manifest),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.corpus.split-leakage",
  );
});

test("manifest validation reports the exact missing provenance field", () => {
  const manifest = validManifest();
  manifest.entries[0]!.attributionRequirement = "";
  assert.throws(
    () => validateCorpusManifest(manifest),
    (error: unknown) =>
      error instanceof EvaluationContractError &&
      error.detail.id === "evaluation.corpus.missing-field" &&
      error.detail.field === "entries[0].attributionRequirement",
  );
});

test("invalid normalized fields have actionable stable error ids", () => {
  const invalid = annotatedScore();
  invalid.notes[0]!.durationTicks = 0;
  assert.throws(
    () => validateNormalizedScore(invalid),
    (error: unknown) =>
      error instanceof EvaluationContractError &&
      error.detail.id === "evaluation.score.invalid-duration" &&
      error.detail.action.length > 0,
  );
});

test("pairwise responses preserve listening gaps and exclude rendering-only labels", () => {
  const bundle = pairwiseBundle();
  const empty: PairwiseResponseSet = { schema: PAIRWISE_RESPONSE_SCHEMA, bundleId: bundle.bundleId, responses: [] };
  assert.equal(summarizePairwiseLabels(bundle, empty).listeningGap, true);
  const responses: PairwiseResponseSet = {
    ...empty,
    responses: [
      { comparisonId: "comparison-1", preferredSide: "a", confidence: 4, compositionReasonTags: ["entry-clarity"] },
      { comparisonId: "comparison-2", preferredSide: "b", renderingReasonTags: ["renderer-mismatch"] },
    ],
  };
  const summary = summarizePairwiseLabels(bundle, responses);
  assert.equal(summary.trainableLabelCount, 1);
  assert.equal(summary.renderingOnlyCount, 1);
  assert.equal(summary.warnings[0]?.id, "evaluation.pairwise.preference-with-renderer-mismatch");
});

test("pairwise summary distinguishes tie, cannot-judge, and unanswered states", () => {
  const bundle = pairwiseBundle();
  const summary = summarizePairwiseLabels(bundle, {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId: bundle.bundleId,
    responses: [
      { comparisonId: "comparison-1", preferredSide: "tie", confidence: 3 },
      { comparisonId: "comparison-2", preferredSide: "cannot-judge", renderingReasonTags: ["latency-interruption"] },
    ],
  });
  assert.equal(summary.tieCount, 1);
  assert.equal(summary.cannotJudgeCount, 1);
  assert.equal(summary.notReviewedCount, 0);
  assert.equal(summary.trainableLabelCount, 0);
  assert.equal(summary.listeningGap, true);
});

test("pairwise response conflicts fail with a stable id", () => {
  const bundle = pairwiseBundle();
  const responses: PairwiseResponseSet = {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId: bundle.bundleId,
    responses: [
      { comparisonId: "comparison-1", preferredSide: "a" },
      { comparisonId: "comparison-1", preferredSide: "b" },
    ],
  };
  assert.throws(
    () => validatePairwiseResponses(bundle, responses),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.conflicting-label",
  );
});

test("pairwise response merge deduplicates identical labels and rejects conflicts", () => {
  const bundle = pairwiseBundle();
  const first: PairwiseResponseSet = {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId: bundle.bundleId,
    responses: [{ comparisonId: "comparison-1", preferredSide: "a" }],
  };
  assert.equal(mergePairwiseResponses(bundle, [first, structuredClone(first)]).responses.length, 1);
  const reordered = {
    schema: PAIRWISE_RESPONSE_SCHEMA,
    bundleId: bundle.bundleId,
    responses: [{ preferredSide: "a" as const, comparisonId: "comparison-1" }],
  };
  assert.deepEqual(
    mergePairwiseResponses(bundle, [first, reordered]),
    mergePairwiseResponses(bundle, [reordered, first]),
  );
  assert.throws(
    () =>
      mergePairwiseResponses(bundle, [
        first,
        { ...first, responses: [{ comparisonId: "comparison-1", preferredSide: "b" }] },
      ]),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.conflicting-label",
  );
});

test("pairwise response validation rejects unknown choices at the JSON boundary", () => {
  const bundle = pairwiseBundle();
  assert.throws(
    () =>
      validatePairwiseResponses(bundle, {
        schema: PAIRWISE_RESPONSE_SCHEMA,
        bundleId: bundle.bundleId,
        responses: [{ comparisonId: "comparison-1", preferredSide: "unknown" }],
      } as unknown as PairwiseResponseSet),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.invalid-preferred-side",
  );
});

test("pairwise response loader rejects unsupported future schemas", () => {
  const bundle = pairwiseBundle();
  assert.throws(
    () =>
      validatePairwiseResponses(bundle, {
        schema: "fugematon-pairwise-responses/v99",
        bundleId: bundle.bundleId,
        responses: [],
      } as unknown as PairwiseResponseSet),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.unsupported-response-schema",
  );
});

test("blind bundle rejects unsafe assets and incomplete hidden mappings", () => {
  const unsafe = pairwiseBundle();
  unsafe.comparisons[0]!.sides.a.midiAsset = "../outside.mid";
  assert.throws(
    () => validatePairwiseBundle(unsafe),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.unsafe-asset-path",
  );
  const bundle = pairwiseBundle();
  assert.throws(
    () => validatePairwiseBundle(bundle, { bundleId: bundle.bundleId, comparisons: [] }),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.incomplete-hidden-mapping",
  );
});

test("blind bundle rejects unsupported schemas and duplicate comparison ids", () => {
  const unsupported = pairwiseBundle();
  unsupported.schema = "fugematon-pairwise-bundle/v99" as typeof unsupported.schema;
  assert.throws(
    () => validatePairwiseBundle(unsupported),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.unsupported-bundle-schema",
  );
  const duplicate = pairwiseBundle();
  duplicate.comparisons.push(structuredClone(duplicate.comparisons[0]!));
  assert.throws(
    () => validatePairwiseBundle(duplicate),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.pairwise.duplicate-comparison",
  );
});

test("blind order is deterministic without fixing baseline to side A", () => {
  const bundle = pairwiseBundle();
  const sideA = bundle.comparisons[0]!.sides.a;
  const sideB = bundle.comparisons[0]!.sides.b;
  const mappings = Array.from({ length: 64 }, (_, index) =>
    createBlindedComparison({
      id: `balanced-${index}`,
      context: bundle.comparisons[0]!.context,
      baseline: sideA,
      variant: sideB,
      orderSalt: "presentation-order-fixture",
    }),
  );
  assert.deepEqual(
    mappings,
    mappings.map((item) => structuredClone(item)),
  );
  const baselineA = mappings.filter((item) => item.mapping.a === "baseline").length;
  assert.ok(baselineA > 0 && baselineA < mappings.length);
});

test("pairwise model fit is byte stable and explanations reconstruct predictions", () => {
  const first = trainPairwiseModel({
    rows: trainingRows(),
    corpusManifestVersion: "fixture-v1",
    modelVersion: "fixture-model-v1",
    seed: 11,
  });
  const second = trainPairwiseModel({
    rows: trainingRows().reverse(),
    corpusManifestVersion: "fixture-v1",
    modelVersion: "fixture-model-v1",
    seed: 11,
  });
  assert.equal(first.status, "trained");
  assert.equal(second.status, "trained");
  if (first.status !== "trained" || second.status !== "trained") return;
  assert.deepEqual(serializePairwiseModel(first.artifact), serializePairwiseModel(second.artifact));
  const prediction = predictPairwise(first.artifact, {
    styleProfile: "strict-classical",
    featureDelta: { "entry.boundary-continuity": 0.8, "pair.unison": -0.5 },
    evidence: { "entry.boundary-continuity": [{ scoreId: "fixture", tick: 480 }] },
  });
  assert.ok(prediction.contributions[0]?.evidence.length === 1 || prediction.contributions[1]?.evidence.length === 1);
  assert.equal(prediction.adoptionEligible, false);
  assert.equal(
    predictPairwise(first.artifact, {
      styleProfile: "strict-classical",
      featureDelta: {},
      hardFailures: ["voice-crossing"],
    }).adoptionEligible,
    false,
  );
});

test("empty, all-tie, and single-class datasets do not produce a model", () => {
  const base = trainingRows()[0]!;
  assert.deepEqual(trainPairwiseModel({ rows: [], corpusManifestVersion: "v1", modelVersion: "m1", seed: 1 }), {
    status: "no-model",
    reason: "empty-labels",
  });
  assert.equal(
    trainPairwiseModel({ rows: [{ ...base, label: "tie" }], corpusManifestVersion: "v1", modelVersion: "m1", seed: 1 })
      .status,
    "no-model",
  );
  assert.equal(
    trainPairwiseModel({ rows: [{ ...base, label: "a" }], corpusManifestVersion: "v1", modelVersion: "m1", seed: 1 })
      .status,
    "no-model",
  );
});

test("pairwise training rejects split leakage and malformed feature rows", () => {
  const leaked = trainingRows();
  leaked[2] = { ...leaked[2]!, workGroup: leaked[0]!.workGroup };
  assert.throws(
    () => trainPairwiseModel({ rows: leaked, corpusManifestVersion: "v1", modelVersion: "m1", seed: 1 }),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.model.split-leakage",
  );
  const malformed = trainingRows();
  malformed[0] = { ...malformed[0]!, featureDelta: { broken: Number.NaN } };
  assert.throws(
    () => trainPairwiseModel({ rows: malformed, corpusManifestVersion: "v1", modelVersion: "m1", seed: 1 }),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.model.malformed-feature",
  );
});

test("model loader fails closed for an unknown feature schema", () => {
  assert.throws(
    () => loadPairwiseModel({ schema: "fugematon-pairwise-model/v1", featureSchemaVersion: 99 }),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.model.unsupported-schema",
  );
});

test("model loader rejects a structurally incomplete supported artifact", () => {
  assert.throws(
    () =>
      loadPairwiseModel({
        schema: "fugematon-pairwise-model/v1",
        featureSchemaVersion: 1,
        trainingAlgorithmVersion: "bounded-logistic-gradient/v1",
        hardConstraintOverride: "prohibited",
        theoryReview: { status: "clear", conflicts: [] },
      }),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.model.malformed-artifact",
  );
});

test("feature vector loader rejects unknown and missing feature ids", () => {
  const vector = extractEvaluationFeatures(annotatedScore());
  const unknown = structuredClone(vector);
  unknown.features[0]!.id = "unknown.shortcut";
  assert.throws(
    () => serializeFeatureVector(unknown),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.feature.unknown-feature",
  );
  const missing = structuredClone(vector);
  missing.features.pop();
  assert.throws(
    () => serializeFeatureVector(missing),
    (error: unknown) =>
      error instanceof EvaluationContractError && error.detail.id === "evaluation.feature.missing-feature",
  );
});

test("shadow evaluation is explanatory, byte-invariant, and routes disagreements", () => {
  const result = trainPairwiseModel({
    rows: trainingRows(),
    corpusManifestVersion: "fixture-v1",
    modelVersion: "fixture-model-v1",
    seed: 11,
  });
  assert.equal(result.status, "trained");
  if (result.status !== "trained") return;
  const report = createShadowReport({
    model: result.artifact,
    generationFingerprints: { shadowOff: "sha256:unchanged", shadowOn: "sha256:unchanged" },
    comparisons: [
      {
        comparisonId: "shadow-boundary",
        seed: "boundary-seed",
        seedClass: "boundary",
        subjectFamilyGroup: "subject-boundary",
        composerGroup: "composer-holdout",
        styleProfile: "strict-classical",
        meter: "4/4",
        entryRoles: ["answer"],
        sectionRoles: ["subject-return"],
        featureDelta: { "entry.boundary-continuity": 0.8, "pair.unison": -0.5 },
        hardFailures: [],
        referenceOutsideAxes: [],
        qualityVectorDelta: {},
        localSentinelDelta: { entryClash: 1 },
        label: { source: "agent", preferredSide: "b" },
        oodReasons: ["corpus-distance"],
        responseOwner: "generator",
        previousPredictedSide: "b",
      },
    ],
  });
  assert.equal(report.generatorOutputInvariant, true);
  assert.equal(report.comparisons[0]?.reviewRequired, true);
  const queue = createActiveLearningQueue({ report, limit: 1 });
  assert.deepEqual(queue.items[0]?.reasons.includes("local-sentinel-regression"), true);
  assert.ok(queue.missingClasses.includes("rotation"));
  assert.deepEqual(queue.promotion, { automatic: false, requiresSeparateAdoptionReview: true });
});

test("shadow evaluation retains false-confidence, missing-feature, and out-of-style OOD fixtures", () => {
  const result = trainPairwiseModel({
    rows: trainingRows(),
    corpusManifestVersion: "fixture-v1",
    modelVersion: "fixture-model-v1",
    seed: 11,
  });
  assert.equal(result.status, "trained");
  if (result.status !== "trained") return;
  const reasons = ["missing-feature", "style-coverage", "corpus-distance"] as const;
  const report = createShadowReport({
    model: result.artifact,
    generationFingerprints: { shadowOff: "same", shadowOn: "same" },
    comparisons: reasons.map((reason, index) => ({
      comparisonId: `ood-${index}`,
      seed: `ood-seed-${index}`,
      seedClass: "adversarial" as const,
      subjectFamilyGroup: `ood-family-${index}`,
      styleProfile: reason === "style-coverage" ? "unseen-style" : "strict-classical",
      meter: "4/4",
      entryRoles: [],
      sectionRoles: [],
      featureDelta: { "entry.boundary-continuity": 100 },
      hardFailures: [],
      referenceOutsideAxes: [],
      qualityVectorDelta: {},
      localSentinelDelta: {},
      oodReasons: [reason],
      responseOwner: "selection-only" as const,
    })),
  });
  assert.ok(report.comparisons.every((comparison) => comparison.reviewRequired));
  assert.deepEqual(
    report.comparisons.map((comparison) => comparison.oodReasons[0]),
    reasons,
  );
});

test("pairwise playback keeps one active side and a shared seek and loop position", () => {
  let state = createPairwisePlaybackState(1920);
  state = playPairwiseSide(state, "a");
  state = seekPairwisePlayback(state, 720);
  state = playPairwiseSide(state, "b");
  assert.equal(state.activeSide, "b");
  assert.equal(state.positionTick, 720);
  assert.equal(state.sideStops.a, 1);
  assert.equal(state.switchCount, 1);
  state = setPairwiseLoop(state, { startTick: 480, endTick: 960, enabled: true });
  state = seekPairwisePlayback(state, 1440);
  assert.equal(state.positionTick, 960);
  state = pausePairwisePlayback(state, 800);
  assert.equal(state.status, "paused");
  assert.equal(state.sideStops.b, 1);
  state = stopPairwisePlayback(state);
  assert.equal(state.positionTick, 480);
});

function annotatedScore(): NormalizedReferenceScore {
  return {
    schemaVersion: 1,
    scoreId: "annotated",
    sourceKind: "reference",
    ticksPerQuarter: 4,
    lengthTicks: 16,
    voices: ["soprano", "alto", "tenor", "bass"],
    key: { tonic: "C", mode: "minor" },
    meter: { numerator: 4, denominator: 4 },
    styleProfile: "strict-classical",
    notes: [
      { voice: "soprano", startTick: 0, durationTicks: 4, pitch: 72, role: "subject" },
      { voice: "soprano", startTick: 4, durationTicks: 4, pitch: 79, role: "subject" },
      { voice: "soprano", startTick: 8, durationTicks: 4, pitch: 77, role: "subject" },
      { voice: "alto", startTick: 0, durationTicks: 8, pitch: 67, role: "counter-subject" },
      { voice: "alto", startTick: 8, durationTicks: 8, pitch: 69, role: "answer" },
      { voice: "tenor", startTick: 0, durationTicks: 16, pitch: 60, role: "free-counterpoint" },
      { voice: "bass", startTick: 0, durationTicks: 16, pitch: 48, role: "free-counterpoint" },
    ],
    annotations: {
      entries: [
        {
          id: "entry-1",
          startTick: 0,
          endTick: 8,
          voice: "soprano",
          form: "subject",
          provenance: { source: "curated", confidence: 1 },
        },
        {
          id: "entry-2",
          startTick: 8,
          endTick: 16,
          voice: "alto",
          form: "answer",
          provenance: { source: "curated", confidence: 1 },
        },
      ],
      sections: [
        {
          id: "exposition",
          startTick: 0,
          endTick: 8,
          role: "exposition",
          provenance: { source: "curated", confidence: 1 },
        },
        {
          id: "return",
          startTick: 8,
          endTick: 16,
          role: "subject-return",
          provenance: { source: "curated", confidence: 1 },
        },
      ],
      cadences: [],
    },
  };
}

function transformScore(
  score: NormalizedReferenceScore,
  pitchDelta: number,
  tickScale: number,
): NormalizedReferenceScore {
  return {
    ...score,
    scoreId: `transform-${pitchDelta}-${tickScale}`,
    ticksPerQuarter: score.ticksPerQuarter * tickScale,
    lengthTicks: score.lengthTicks * tickScale,
    notes: score.notes.map((note) => ({
      ...note,
      pitch: note.pitch + pitchDelta,
      startTick: note.startTick * tickScale,
      durationTicks: note.durationTicks * tickScale,
    })),
    annotations: {
      entries: score.annotations.entries.map((entry) => ({
        ...entry,
        startTick: entry.startTick * tickScale,
        endTick: entry.endTick * tickScale,
      })),
      sections: score.annotations.sections.map((section) => ({
        ...section,
        startTick: section.startTick * tickScale,
        endTick: section.endTick * tickScale,
      })),
      cadences: score.annotations.cadences.map((cadence) => ({ ...cadence, tick: cadence.tick * tickScale })),
    },
  };
}

function semanticValues(vector: ReturnType<typeof extractEvaluationFeatures>): unknown {
  return vector.features.map(({ id, value, availability, confidence }) => ({ id, value, availability, confidence }));
}

function groupValueDistribution(vector: ReturnType<typeof extractEvaluationFeatures>): unknown {
  return Object.fromEntries(
    ["note-transition", "voice-pair", "entry-window", "section", "whole-score"].map((group) => [
      group,
      vector.features
        .filter((feature) => feature.group === group)
        .map((feature) => feature.value)
        .sort((a, b) => a - b),
    ]),
  );
}

function validManifest(): CorpusManifest {
  const checksum = `sha256:${"a".repeat(64)}`;
  return {
    schema: "fugematon-reference-corpus/v1",
    version: "fixture-v1",
    entries: [
      {
        workId: "fixture-bach",
        composer: "J. S. Bach",
        workTitle: "Fixture",
        movement: "Fugue",
        voiceCount: 4,
        key: { tonic: "C", mode: "minor" },
        meter: { numerator: 4, denominator: 4 },
        sourceUrl: "https://example.invalid/bach.xml",
        sourceFormat: "musicxml",
        licenseId: "public-domain",
        redistributionStatus: "user-obtained",
        attributionRequirement: "Record source attribution.",
        sourceChecksum: checksum,
        repertoireRole: "four-voice-fugue",
        styleProfile: "strict-classical",
        featureUse: "form-and-local",
        split: "train",
        splitGroup: "work-bach",
        subjectFamilyGroup: "subject-bach",
        importStatus: "user-action-required",
        validationStatus: "pending",
      },
      {
        workId: "fixture-holdout",
        composer: "Holdout Composer",
        workTitle: "Fixture",
        movement: "Fugue",
        voiceCount: 4,
        key: { tonic: "G", mode: "minor" },
        meter: { numerator: 4, denominator: 4 },
        sourceUrl: "https://example.invalid/holdout.xml",
        sourceFormat: "musicxml",
        licenseId: "public-domain",
        redistributionStatus: "user-obtained",
        attributionRequirement: "Record source attribution.",
        sourceChecksum: checksum,
        repertoireRole: "four-voice-fugue",
        styleProfile: "strict-classical",
        featureUse: "form-and-local",
        split: "composer-holdout",
        splitGroup: "work-holdout",
        subjectFamilyGroup: "subject-holdout",
        importStatus: "user-action-required",
        validationStatus: "pending",
      },
    ],
  };
}

function pairwiseBundle(): PairwiseBundleManifest {
  const featureVector = extractEvaluationFeatures(annotatedScore());
  const side = (id: string) => ({
    id,
    midiAsset: `assets/${id}.mid`,
    midiSha256: `sha256:${"b".repeat(64)}`,
    featureVector,
  });
  const context = {
    seed: "fixture",
    seedClass: "representative" as const,
    subjectInputHash: `sha256:${"c".repeat(64)}`,
    subjectFamilyGroup: "subject-fixture",
    styleProfile: "strict-classical",
    writingProfile: "four-voice-default",
    performanceProfile: "organ-default",
    lengthTicks: 16,
    renderSettingsHash: `sha256:${"d".repeat(64)}`,
  };
  return {
    schema: PAIRWISE_BUNDLE_SCHEMA,
    bundleId: "bundle-fixture",
    bundleVersion: "1",
    featureSchemaVersion: 1,
    modelVersion: "shadow-v1",
    generatorVersion: 4,
    performanceProfileVersion: 3,
    comparisons: [
      { id: "comparison-1", context, sides: { a: side("side-1a"), b: side("side-1b") } },
      {
        id: "comparison-2",
        context: { ...context, seed: "fixture-2" },
        sides: { a: side("side-2a"), b: side("side-2b") },
      },
    ],
  };
}

function trainingRows(): PairwiseTrainingRow[] {
  return [
    {
      comparisonId: "train-a",
      split: "train",
      workGroup: "work-a",
      composerGroup: "composer-a",
      subjectFamilyGroup: "subject-a",
      styleProfile: "strict-classical",
      featureDelta: { "entry.boundary-continuity": 1, "pair.unison": -1 },
      evidence: {},
      label: "a",
      labelSetHash: `sha256:${"1".repeat(64)}`,
    },
    {
      comparisonId: "train-b",
      split: "train",
      workGroup: "work-b",
      composerGroup: "composer-b",
      subjectFamilyGroup: "subject-b",
      styleProfile: "strict-classical",
      featureDelta: { "entry.boundary-continuity": -1, "pair.unison": 1 },
      evidence: {},
      label: "b",
      labelSetHash: `sha256:${"1".repeat(64)}`,
    },
    {
      comparisonId: "validation-a",
      split: "validation",
      workGroup: "work-c",
      composerGroup: "composer-c",
      subjectFamilyGroup: "subject-c",
      styleProfile: "strict-classical",
      featureDelta: { "entry.boundary-continuity": 0.8, "pair.unison": -0.5 },
      evidence: {},
      label: "a",
      labelSetHash: `sha256:${"1".repeat(64)}`,
    },
    {
      comparisonId: "holdout-b",
      split: "composer-holdout",
      workGroup: "work-d",
      composerGroup: "composer-d",
      subjectFamilyGroup: "subject-d",
      styleProfile: "strict-classical",
      featureDelta: { "entry.boundary-continuity": -0.7, "pair.unison": 0.6 },
      evidence: {},
      label: "b",
      labelSetHash: `sha256:${"1".repeat(64)}`,
    },
  ];
}
