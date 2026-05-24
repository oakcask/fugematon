import assert from "node:assert/strict";
import test from "node:test";
import {
  createNormalizedReferenceDiagnostics,
  generateScore,
  parseReferenceCorpusManifest,
  summarizeHistoricalReferenceCalibration,
  summarizeHistoricalReferenceReview,
  validateReferenceManifestRecord,
} from "./index.js";

test("validates metadata-only reference manifest records", () => {
  const record = validateReferenceManifestRecord({
    sourceId: "bach-wtc-c-major-fugue",
    composer: "J. S. Bach",
    title: "WTC I Fugue in C major",
    edition: "metadata-only fixture",
    license: "license verification pending",
    importedAt: "2026-05-17",
    format: "metadata-only",
    redistributionPolicy: "metadata-only",
    profileFamily: "fugue-reference",
    normalizerAxes: [
      {
        axis: "sharedRhythmOverlapPerVoicePairQuarter",
        normalizer: "estimated-active-voice-pair-quarter-notes",
      },
      {
        axis: "severeEntryIntervalPerEntry",
        normalizer: "subject-entry-count",
      },
    ],
    notes: "No score file is bundled with this fixture.",
  });

  assert.equal(record.sourceId, "bach-wtc-c-major-fugue");
  assert.equal(record.redistributionPolicy, "metadata-only");
  assert.equal(record.normalizerAxes.length, 2);
});

test("validates local-import reference manifest records with relative source locations", () => {
  const record = validateReferenceManifestRecord({
    sourceId: "local-fugue-study",
    composer: "Reference Composer",
    title: "Local import fugue study",
    edition: "local study edition",
    license: "local import only",
    importedAt: "2026-05-17",
    format: "musicxml",
    redistributionPolicy: "local-import-only",
    profileFamily: "fugue-reference",
    sourceLocation: "references/local/fugue-study.musicxml",
    normalizerAxes: [
      {
        axis: "sharedRhythmOverlapPerVoicePairQuarter",
        normalizer: "estimated-active-voice-pair-quarter-notes",
      },
    ],
  });

  assert.equal(record.sourceLocation, "references/local/fugue-study.musicxml");
  assert.equal(record.scoreFileRedistributed, false);
});

test("rejects manifest records with absolute source locations", () => {
  assert.throws(
    () =>
      validateReferenceManifestRecord({
        sourceId: "absolute-score",
        composer: "Reference Composer",
        title: "Absolute source",
        edition: "local study edition",
        license: "local import only",
        importedAt: "2026-05-17",
        format: "musicxml",
        redistributionPolicy: "local-import-only",
        profileFamily: "fugue-reference",
        sourceLocation: "/references/local/fugue-study.musicxml",
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
        ],
      }),
    /must be relative/,
  );
});

test("rejects manifest records that redistribute local-only sources", () => {
  assert.throws(
    () =>
      validateReferenceManifestRecord({
        sourceId: "local-score",
        composer: "Reference Composer",
        title: "Local score",
        edition: "private study edition",
        license: "local study only",
        importedAt: "2026-05-17",
        format: "musicxml",
        redistributionPolicy: "local-import-only",
        profileFamily: "fugue-reference",
        scoreFileRedistributed: true,
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
        ],
      }),
    /cannot redistribute score files/,
  );
});

test("rejects manifest records with mismatched normalized diagnostic axes", () => {
  assert.throws(
    () =>
      validateReferenceManifestRecord({
        sourceId: "bad-axis",
        composer: "Reference Composer",
        title: "Axis mismatch",
        edition: "metadata-only fixture",
        license: "license verification pending",
        importedAt: "2026-05-17",
        format: "metadata-only",
        redistributionPolicy: "metadata-only",
        profileFamily: "fugue-reference",
        normalizerAxes: [
          {
            axis: "severeEntryIntervalPerEntry",
            normalizer: "score-quarter-notes",
          },
        ],
      }),
    /must use normalizer subject-entry-count/,
  );
});

test("parses structured manifests and emits normalized diagnostics axes", () => {
  const manifest = parseReferenceCorpusManifest({
    schemaVersion: 1,
    records: [
      {
        sourceId: "fixture-fugue",
        composer: "Reference Composer",
        title: "Fixture fugue",
        edition: "metadata-only fixture",
        license: "license verification pending",
        importedAt: "2026-05-17",
        format: "metadata-only",
        redistributionPolicy: "metadata-only",
        profileFamily: "fugue-reference",
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
          {
            axis: "freeCounterpointStepwiseRunRatio",
            normalizer: "already-normalized",
          },
        ],
      },
    ],
  });
  const output = generateScore({ seed: "reference-manifest", lengthTicks: 9600 });
  const normalized = createNormalizedReferenceDiagnostics(manifest.records[0], output.diagnostics);

  assert.equal(normalized.sourceId, "fixture-fugue");
  assert.equal(normalized.profileFamily, "fugue-reference");
  assert.equal(normalized.axes.length, 2);
  assert.deepEqual(
    normalized.axes.map((axis) => axis.axis),
    ["sharedRhythmOverlapPerVoicePairQuarter", "freeCounterpointStepwiseRunRatio"],
  );
  assert.ok(normalized.normalizers.scoreQuarterNotes > 0);
  assert.ok(normalized.axes.every((axis) => Number.isFinite(axis.value)));
});

test("classifies historical reference calibration as review evidence until entries are annotated", () => {
  const manifest = parseReferenceCorpusManifest({
    schemaVersion: 1,
    records: [
      {
        sourceId: "local-humdrum-fugue",
        composer: "Reference Composer",
        title: "Local Humdrum fugue",
        edition: "local study edition",
        license: "local import only",
        importedAt: "2026-05-25",
        format: "humdrum",
        redistributionPolicy: "local-import-only",
        profileFamily: "fugue-reference",
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
          {
            axis: "severeEntryIntervalPerEntry",
            normalizer: "subject-entry-count",
          },
        ],
      },
    ],
  });

  const calibration = summarizeHistoricalReferenceCalibration(manifest);

  assert.equal(calibration.status, "review-required");
  assert.equal(calibration.referenceProfileAggregate.role, "context-only");
  assert.equal(calibration.referenceProfileAggregate.beautyHandoffAccepted, false);
  assert.equal(calibration.sources[0]?.entryMetricThresholds, "excluded-until-annotated");
  assert.equal(
    calibration.metricRoles.find((role) => role.axis === "severeEntryIntervalPerEntry")?.role,
    "threshold-excluded",
  );
});

test("promotes local historical sources to observed readiness only with matched or annotated entries", () => {
  const manifest = parseReferenceCorpusManifest({
    schemaVersion: 1,
    records: [
      {
        sourceId: "matched-humdrum-fugue",
        composer: "Reference Composer",
        title: "Matched Humdrum fugue",
        edition: "local study edition",
        license: "local import only",
        importedAt: "2026-05-25",
        format: "humdrum",
        redistributionPolicy: "local-import-only",
        profileFamily: "fugue-reference",
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
          {
            axis: "severeEntryIntervalPerEntry",
            normalizer: "subject-entry-count",
          },
        ],
      },
    ],
  });

  const calibration = summarizeHistoricalReferenceCalibration(manifest, [
    {
      sourceId: "matched-humdrum-fugue",
      method: "pattern-matched",
      entryCount: 7,
      confidence: "medium",
    },
  ]);

  assert.equal(calibration.status, "ci-observed-ready");
  assert.equal(calibration.annotatedSourceCount, 1);
  assert.equal(calibration.sources[0]?.entryMetricThresholds, "eligible-for-calibration");
});

test("summarizes normalized historical reference review metrics with calibration roles", () => {
  const manifest = parseReferenceCorpusManifest({
    schemaVersion: 1,
    records: [
      {
        sourceId: "fixture-fugue",
        composer: "Reference Composer",
        title: "Fixture fugue",
        edition: "metadata-only fixture",
        license: "license verification pending",
        importedAt: "2026-05-25",
        format: "metadata-only",
        redistributionPolicy: "metadata-only",
        profileFamily: "fugue-reference",
        normalizerAxes: [
          {
            axis: "sharedRhythmOverlapPerVoicePairQuarter",
            normalizer: "estimated-active-voice-pair-quarter-notes",
          },
          {
            axis: "leapRecoveryMissesPerQuarter",
            normalizer: "score-quarter-notes",
          },
        ],
      },
    ],
  });
  const output = generateScore({ seed: "historical-review-summary", lengthTicks: 9600 });
  const normalized = createNormalizedReferenceDiagnostics(manifest.records[0], output.diagnostics);

  const review = summarizeHistoricalReferenceReview([normalized]);

  assert.equal(review.status, "review-required");
  assert.equal(review.sourceCount, 1);
  assert.ok(review.axes.some((axis) => axis.axis === "sharedRhythmOverlapPerVoicePairQuarter"));
  assert.equal(
    review.axes.find((axis) => axis.axis === "leapRecoveryMissesPerQuarter")?.calibrationRole,
    "context-only",
  );
});
