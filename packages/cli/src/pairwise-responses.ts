import { readFile, rename, writeFile } from "node:fs/promises";
import {
  mergePairwiseResponses,
  type PairwiseBundleManifest,
  type PairwiseResponseSet,
  summarizePairwiseLabels,
} from "@fugematon/evaluation";

export async function mergePairwiseResponseFiles(input: {
  bundleFile: string;
  responseFiles: readonly string[];
  outFile: string;
  summaryFile: string;
}): Promise<void> {
  const bundle = await readJson<PairwiseBundleManifest>(input.bundleFile);
  const sets = await Promise.all(input.responseFiles.map((file) => readJson<PairwiseResponseSet>(file)));
  const merged = mergePairwiseResponses(bundle, sets);
  const summary = summarizePairwiseLabels(bundle, merged);
  await atomicJson(input.outFile, merged);
  await atomicJson(input.summaryFile, summary);
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

async function atomicJson(file: string, value: unknown): Promise<void> {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, file);
}
