#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { exportMidi, generateScore } from "@fugematon/core";
import { helpText, parseArgs } from "./args.js";

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<void> {
  const command = parseArgs(argv);

  if (command.name === "help") {
    console.log(helpText());
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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
