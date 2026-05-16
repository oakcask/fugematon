#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { exportMidi, generateScore, PHASE_5_REVIEW_SEEDS } from "@fugematon/core";
import { helpText, parseArgs } from "./args.js";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const command = parseArgs(argv);

  if (command.name === "help") {
    console.log(helpText());
    return;
  }

  if (command.name === "review") {
    await writeReviewBundle(command.out, command.lengthTicks);
    return;
  }

  const output = generateScore({
    seed: command.seed,
    lengthTicks: command.lengthTicks,
  });

  if (command.name === "diagnose") {
    console.log(`${JSON.stringify(output.diagnostics, null, 2)}\n`);
    return;
  }

  if (command.name === "midi") {
    await writeFile(command.out, exportMidi(output.events));
    return;
  }

  const json = `${JSON.stringify(output.events, null, 2)}\n`;
  if (command.out === undefined) {
    console.log(json);
    return;
  }

  await writeFile(command.out, json, "utf8");
}

async function writeReviewBundle(outDirectory: string, lengthTicks: number): Promise<void> {
  await mkdir(outDirectory, { recursive: true });
  const summary = {
    lengthTicks,
    seeds: [] as {
      seed: string;
      category: string;
      diagnosticsFile: string;
      midiFile: string;
    }[],
  };

  for (const { seed, category } of PHASE_5_REVIEW_SEEDS) {
    const output = generateScore({ seed, lengthTicks });
    const safeSeed = seed.replaceAll(/[^a-z0-9-]/gi, "-");
    const diagnosticsFile = `${safeSeed}.diagnostics.json`;
    const midiFile = `${safeSeed}.mid`;

    await writeFile(join(outDirectory, diagnosticsFile), `${JSON.stringify(output.diagnostics, null, 2)}\n`, "utf8");
    await writeFile(join(outDirectory, midiFile), exportMidi(output.events));
    summary.seeds.push({ seed, category, diagnosticsFile, midiFile });
  }

  await writeFile(join(outDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
