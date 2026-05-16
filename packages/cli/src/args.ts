export type CliCommand =
  | {
      name: "generate";
      seed: string;
      lengthTicks: number;
      out?: string;
    }
  | {
      name: "diagnose";
      seed: string;
      lengthTicks: number;
    }
  | {
      name: "midi";
      seed: string;
      lengthTicks: number;
      out: string;
    }
  | {
      name: "help";
    };

export function parseArgs(argv: readonly string[]): CliCommand {
  const [command, ...rest] = argv;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { name: "help" };
  }

  if (command !== "generate" && command !== "diagnose" && command !== "midi") {
    throw new Error(`unknown command: ${command}`);
  }

  const options = parseOptions(rest);
  const seed = requiredOption(options, "seed");
  const lengthTicks = Number(requiredOption(options, "ticks", "lengthTicks"));

  if (!Number.isSafeInteger(lengthTicks) || lengthTicks <= 0) {
    throw new Error("--ticks must be a positive safe integer");
  }

  if (command === "diagnose") {
    return { name: "diagnose", seed, lengthTicks };
  }

  if (command === "midi") {
    return { name: "midi", seed, lengthTicks, out: requiredOption(options, "out") };
  }

  return {
    name: "generate",
    seed,
    lengthTicks,
    out: options.get("out"),
  };
}

export function helpText(): string {
  return [
    "Usage:",
    "  fugematon generate --seed <seed> --ticks <lengthTicks> [--out <file>]",
    "  fugematon diagnose --seed <seed> --ticks <lengthTicks>",
    "  fugematon midi --seed <seed> --ticks <lengthTicks> --out <file>",
  ].join("\n");
}

function parseOptions(args: readonly string[]): Map<string, string> {
  const options = new Map<string, string>();

  for (let i = 0; i < args.length; i += 1) {
    const key = args[i];
    if (key === undefined || !key.startsWith("--")) {
      throw new Error(`expected option, got: ${key ?? ""}`);
    }

    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`missing value for ${key}`);
    }

    options.set(key.slice(2), value);
    i += 1;
  }

  return options;
}

function requiredOption(options: Map<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = options.get(name);
    if (value !== undefined) {
      return value;
    }
  }

  throw new Error(`missing --${names[0]}`);
}
