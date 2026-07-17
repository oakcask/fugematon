import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import type { CorpusManifest } from "@fugematon/evaluation";
import { importReferenceWork, validateReferenceManifest } from "./reference-import.js";

const kern = `**kern\t**kern\t**kern\t**kern
*C:\t*C:\t*C:\t*C:
*M4/4\t*M4/4\t*M4/4\t*M4/4
4C\t4E\t4G\t4c
4D\t4F\t4A\t4d
4E\t4G\t4B\t4e
4F\t4A\t4c\t4f
4G\t4B\t4d\t4g
4A\t4c\t4e\t4a
4G\t4B\t4d\t4g
4F\t4A\t4c\t4f
*-\t*-\t*-\t*-
`;

test("reference import is checksum-gated and byte deterministic", async () => {
  const root = await mkdtemp(join(tmpdir(), "reference-import-"));
  const sourceFile = join(root, "source.krn");
  const manifestFile = join(root, "manifest.json");
  const firstOut = join(root, "first");
  const secondOut = join(root, "second");
  await writeFile(sourceFile, kern);
  const manifest = fixtureManifest(kern);
  await writeFile(manifestFile, `${JSON.stringify(manifest)}\n`);
  await validateReferenceManifest(manifestFile);
  await importReferenceWork({ manifestFile, workId: "fixture-fugue", sourceFile, outDirectory: firstOut });
  await importReferenceWork({ manifestFile, workId: "fixture-fugue", sourceFile, outDirectory: secondOut });
  for (const suffix of ["normalized.json", "features.json", "import-summary.json"]) {
    assert.deepEqual(
      await readFile(join(firstOut, `fixture-fugue.${suffix}`)),
      await readFile(join(secondOut, `fixture-fugue.${suffix}`)),
    );
  }
  await writeFile(sourceFile, `${kern}! changed\n`);
  await assert.rejects(
    importReferenceWork({ manifestFile, workId: "fixture-fugue", sourceFile, outDirectory: firstOut }),
    /evaluation\.corpus\.checksum-mismatch/,
  );
});

function fixtureManifest(source: string): CorpusManifest {
  return {
    schema: "fugematon-reference-corpus/v1",
    version: "fixture-v1",
    entries: [
      {
        workId: "fixture-fugue",
        composer: "Fixture Composer",
        workTitle: "Fixture Work",
        movement: "Fugue",
        voiceCount: 4,
        key: { tonic: "C", mode: "major" },
        meter: { numerator: 4, denominator: 4 },
        sourceUrl: "https://example.invalid/fixture.krn",
        sourceFormat: "humdrum-kern",
        licenseId: "fixture-only",
        redistributionStatus: "redistributable",
        attributionRequirement: "Fixture only.",
        sourceChecksum: `sha256:${createHash("sha256").update(source).digest("hex")}`,
        repertoireRole: "four-voice-fugue",
        styleProfile: "strict-classical",
        featureUse: "form-and-local",
        split: "train",
        splitGroup: "fixture-work",
        subjectFamilyGroup: "fixture-subject",
        importStatus: "available",
        validationStatus: "validated",
      },
    ],
  };
}
