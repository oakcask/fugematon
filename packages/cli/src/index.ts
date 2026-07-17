#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { DEFAULT_SELECTION_MODEL, generateScore } from "@fugematon/core";
import { exportMidi } from "@fugematon/midi";
import { helpText, parseArgs } from "./args.js";
import { runEvaluationLearningLoop } from "./evaluation-loop.js";
import { startListeningServer } from "./listening-server.js";
import { mergePairwiseResponseFiles } from "./pairwise-responses.js";
import { importReferenceWork, validateReferenceManifest } from "./reference-import.js";
import { writeAbReviewBundle, writeQueuedAbReviewBundle, writeReviewBundle } from "./review.js";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const command = parseArgs(argv);

  if (command.name === "help") {
    console.log(helpText());
    return;
  }

  if (command.name === "evaluation-loop") {
    await runEvaluationLearningLoop({
      bundleFile: command.bundleFile,
      responsesFile: command.responsesFile,
      outDirectory: command.out,
      modelVersion: command.modelVersion,
      corpusManifestVersion: command.corpusManifestVersion,
      trainingSeed: command.trainingSeed,
      queueLimit: command.queueLimit,
      previousShadowFile: command.previousShadowFile,
      adoptionReviewFile: command.adoptionReviewFile,
    });
    return;
  }

  if (command.name === "pairwise-responses-merge") {
    await mergePairwiseResponseFiles({
      bundleFile: command.bundleFile,
      responseFiles: command.responseFiles,
      outFile: command.out,
      summaryFile: command.summaryOut,
    });
    return;
  }

  if (command.name === "review-ab-queue") {
    await writeQueuedAbReviewBundle({
      queueFile: command.queueFile,
      sourceBundleFile: command.sourceBundleFile,
      hiddenMappingFile: command.hiddenMappingFile,
      outDirectory: command.out,
    });
    return;
  }

  if (command.name === "listen") {
    const listening = await startListeningServer({
      bundleDirectory: command.bundleDirectory,
      responseFile: command.responseFile,
      readOnly: command.readOnly,
      startComparison: command.startComparison,
      port: command.port,
    });
    console.log(`Blind listening session: ${listening.url}`);
    return;
  }

  if (command.name === "reference-validate") {
    await validateReferenceManifest(command.manifestFile);
    return;
  }

  if (command.name === "reference-import") {
    await importReferenceWork({
      manifestFile: command.manifestFile,
      workId: command.workId,
      sourceFile: command.sourceFile,
      outDirectory: command.out,
    });
    return;
  }

  if (command.name === "review") {
    await writeReviewBundle(
      command.out,
      command.lengthTicks,
      DEFAULT_SELECTION_MODEL,
      command.performanceProfileId,
      command.writingProfileId,
      command.constraintProfileId,
      command.seedList,
    );
    return;
  }

  if (command.name === "review-ab") {
    await writeAbReviewBundle(
      command.out,
      command.lengthTicks,
      command.baselineLabel,
      command.variantLabel,
      command.baselineModel,
      command.variantModel,
      command.performanceProfileId,
      command.writingProfileId,
      command.constraintProfileId,
      command.seedList,
    );
    return;
  }

  const output = generateScore({
    seed: command.seed,
    lengthTicks: command.lengthTicks,
    selectionModel: DEFAULT_SELECTION_MODEL,
    writingProfileId: command.writingProfileId,
  });

  if (command.name === "diagnose") {
    console.log(`${JSON.stringify(output.diagnostics, null, 2)}\n`);
    return;
  }

  if (command.name === "midi") {
    await writeFile(
      command.out,
      exportMidi(output.events, { seed: command.seed, performanceProfileId: command.performanceProfileId }),
    );
    return;
  }

  const json = `${JSON.stringify(output.events, null, 2)}\n`;
  if (command.out === undefined) {
    console.log(json);
    return;
  }

  await writeFile(command.out, json, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
