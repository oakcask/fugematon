import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  type CorpusManifest,
  extractEvaluationFeatures,
  importHumdrumKern,
  importMusicXml,
  type NormalizedReferenceScore,
  serializeFeatureVector,
  validateCorpusManifest,
} from "@fugematon/evaluation";

export async function importReferenceWork(input: {
  manifestFile: string;
  workId: string;
  sourceFile: string;
  outDirectory: string;
}): Promise<void> {
  const manifest = JSON.parse(await readFile(input.manifestFile, "utf8")) as CorpusManifest;
  validateCorpusManifest(manifest);
  const entry = manifest.entries.find((candidate) => candidate.workId === input.workId);
  if (entry === undefined) {
    throw new Error(
      "evaluation.corpus.unknown-work-id: The requested source is not governed by the manifest. Action: choose a listed workId or update and validate the manifest.",
    );
  }
  if (entry.importStatus === "excluded") {
    throw new Error(
      "evaluation.corpus.excluded-work: The manifest excludes this source from evaluation. Action: inspect its exclusionReason and choose a validated source.",
    );
  }
  const bytes = await readFile(input.sourceFile);
  if (sha256(bytes) !== entry.sourceChecksum) {
    throw new Error(
      "evaluation.corpus.checksum-mismatch: The user-obtained source differs from the pinned corpus identity. Action: download the declared sourceUrl revision and verify its sha256 checksum.",
    );
  }
  const source = new TextDecoder().decode(bytes);
  const score: NormalizedReferenceScore =
    entry.sourceFormat === "musicxml"
      ? importMusicXml({ scoreId: entry.workId, xml: source, styleProfile: entry.styleProfile })
      : importHumdrumKern({ scoreId: entry.workId, kern: source, styleProfile: entry.styleProfile });
  if (
    score.key.tonic !== entry.key.tonic ||
    score.key.mode !== entry.key.mode ||
    score.meter.numerator !== entry.meter.numerator ||
    score.meter.denominator !== entry.meter.denominator
  ) {
    throw new Error(
      "evaluation.corpus.metadata-mismatch: Imported key or meter conflicts with the governed manifest. Action: correct the manifest or source before using its features.",
    );
  }
  const features = extractEvaluationFeatures(score);
  await mkdir(input.outDirectory, { recursive: true });
  await atomicWrite(
    join(input.outDirectory, `${entry.workId}.normalized.json`),
    new TextEncoder().encode(`${JSON.stringify(score, null, 2)}\n`),
  );
  await atomicWrite(join(input.outDirectory, `${entry.workId}.features.json`), serializeFeatureVector(features));
  await atomicWrite(
    join(input.outDirectory, `${entry.workId}.import-summary.json`),
    new TextEncoder().encode(
      `${JSON.stringify(
        {
          schema: "fugematon-reference-import-summary/v1",
          corpusManifestVersion: manifest.version,
          workId: entry.workId,
          sourceChecksum: entry.sourceChecksum,
          normalizedScoreSchemaVersion: score.schemaVersion,
          featureSchemaVersion: features.schemaVersion,
          noteCount: score.notes.length,
          lengthTicks: score.lengthTicks,
          annotationAvailability: {
            entries: score.annotations.entries.length > 0,
            sections: score.annotations.sections.length > 0,
            cadences: score.annotations.cadences.length > 0,
          },
          redistributionStatus: entry.redistributionStatus,
        },
        null,
        2,
      )}\n`,
    ),
  );
}

export async function validateReferenceManifest(manifestFile: string): Promise<void> {
  validateCorpusManifest(JSON.parse(await readFile(manifestFile, "utf8")) as CorpusManifest);
}

function sha256(value: Uint8Array): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

async function atomicWrite(file: string, value: Uint8Array): Promise<void> {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, value);
  await rename(temporary, file);
}
