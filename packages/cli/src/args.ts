import { normalizeSelectionModel, type SelectionModel } from "@fugematon/core";
import {
  DEFAULT_PERFORMANCE_PROFILE_ID,
  listPerformanceProfiles,
  type PerformanceProfileId,
} from "@fugematon/performance";

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
      performanceProfileId: PerformanceProfileId;
    }
  | {
      name: "review";
      lengthTicks: number;
      out: string;
      performanceProfileId: PerformanceProfileId;
    }
  | {
      name: "review-ab";
      lengthTicks: number;
      out: string;
      baselineLabel: string;
      variantLabel: string;
      baselineModel: SelectionModel;
      variantModel: SelectionModel;
      performanceProfileId: PerformanceProfileId;
    }
  | {
      name: "help";
    };

const DEFAULT_REVIEW_TICKS = 129600;

export function parseArgs(argv: readonly string[]): CliCommand {
  const [command, ...rest] = argv;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    return { name: "help" };
  }

  if (
    command !== "generate" &&
    command !== "diagnose" &&
    command !== "midi" &&
    command !== "review" &&
    command !== "review-ab"
  ) {
    throw new Error(`unknown command: ${command}`);
  }

  const options = parseOptions(rest);
  if (command === "review" || command === "review-ab") {
    const lengthTicks = Number(options.get("ticks") ?? options.get("lengthTicks") ?? DEFAULT_REVIEW_TICKS);
    if (!Number.isSafeInteger(lengthTicks) || lengthTicks <= 0) {
      throw new Error("--ticks must be a positive safe integer");
    }
    if (command === "review-ab") {
      return {
        name: "review-ab",
        lengthTicks,
        out: requiredOption(options, "out"),
        baselineLabel: options.get("baseline-label") ?? "baseline",
        variantLabel: options.get("variant-label") ?? "variant",
        baselineModel: parseSelectionModel(options.get("baseline-model") ?? "baseline", "baseline-model"),
        variantModel: parseSelectionModel(
          options.get("variant-model") ?? "candidate-oracle-selection",
          "variant-model",
        ),
        performanceProfileId: parsePerformanceProfileId(options.get("performance-profile")),
      };
    }
    return {
      name: "review",
      lengthTicks,
      out: requiredOption(options, "out"),
      performanceProfileId: parsePerformanceProfileId(options.get("performance-profile")),
    };
  }

  const seed = requiredOption(options, "seed");
  const lengthTicks = Number(requiredOption(options, "ticks", "lengthTicks"));

  if (!Number.isSafeInteger(lengthTicks) || lengthTicks <= 0) {
    throw new Error("--ticks must be a positive safe integer");
  }

  if (command === "diagnose") {
    return { name: "diagnose", seed, lengthTicks };
  }

  if (command === "midi") {
    return {
      name: "midi",
      seed,
      lengthTicks,
      out: requiredOption(options, "out"),
      performanceProfileId: parsePerformanceProfileId(options.get("performance-profile")),
    };
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
    "  fugematon midi --seed <seed> --ticks <lengthTicks> --out <file> [--performance-profile organ-default|strict-counterpoint]",
    "  fugematon review --out <directory> [--ticks <lengthTicks>] [--performance-profile organ-default|strict-counterpoint]",
    "  fugematon review-ab --out <directory> [--ticks <lengthTicks>] [--baseline-label <label>] [--variant-label <label>] [--baseline-model baseline|candidate-oracle-selection|section-local-planner] [--variant-model baseline|candidate-oracle-selection|section-local-planner] [--performance-profile organ-default|strict-counterpoint]",
  ].join("\n");
}

function parseSelectionModel(value: string, optionName: string): SelectionModel {
  if (value === "baseline" || value === "candidate-oracle-selection" || value === "section-local-planner") {
    return normalizeSelectionModel(value);
  }

  throw new Error(`--${optionName} must be baseline, candidate-oracle-selection, or section-local-planner`);
}

function parsePerformanceProfileId(value: string | undefined): PerformanceProfileId {
  if (value === undefined) {
    return DEFAULT_PERFORMANCE_PROFILE_ID;
  }
  const profileIds = listPerformanceProfiles().map((profile) => profile.id);
  if (profileIds.includes(value as PerformanceProfileId)) {
    return value as PerformanceProfileId;
  }

  throw new Error(`--performance-profile must be ${profileIds.join(", ")}`);
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
