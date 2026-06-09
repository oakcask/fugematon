#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { DEFAULT_SELECTION_MODEL, generateScore } from "@fugematon/core";
import { exportMidi } from "@fugematon/midi";
import { helpText, parseArgs } from "./args.js";
import { writeAbReviewBundle, writeReviewBundle } from "./review.js";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const command = parseArgs(argv);

  if (command.name === "help") {
    console.log(helpText());
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
