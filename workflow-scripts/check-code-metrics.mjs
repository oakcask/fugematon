import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import ts from "typescript";

const execFileAsync = promisify(execFile);
const cwd = process.cwd();
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

const defaultOptions = {
  baseRef: process.env.GITHUB_BASE_REF === undefined ? undefined : `origin/${process.env.GITHUB_BASE_REF}`,
  complexityThreshold: 12,
  functionLineThreshold: 120,
  changedLineThreshold: 10,
  mode: "changed",
};

if (isMainModule()) {
  try {
    await main();
  } catch (error) {
    reportScriptError(error);
    process.exit(1);
  }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const changedFiles =
    options.mode === "all" ? await collectTypeScriptSourceFiles("packages") : await readChangedTypeScriptFiles(options);
  const metrics = await collectCodeMetrics(changedFiles);
  const findings = metrics
    .map((fileMetrics) => createRefactorFinding(fileMetrics, options))
    .filter((finding) => finding !== undefined)
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));

  if (findings.length === 0) {
    console.log("Code metrics did not find advisory refactor candidates in the inspected files.");
    return;
  }

  console.log("Advisory code metric findings:");
  for (const finding of findings) {
    console.log(
      `- ${finding.file}: score ${finding.score}; max complexity ${finding.maxComplexity}; max function lines ${finding.maxFunctionLines}; changed lines ${finding.changedLines}`,
    );
    writeGitHubWarningAnnotation({
      file: finding.file,
      line: finding.line,
      title: "Advisory refactor candidate",
      message: formatFindingMessage(finding),
    });
  }
}

export async function collectCodeMetrics(files) {
  const metrics = [];

  for (const { file, changedLines } of files) {
    const sourceText = await readFile(file, "utf8");
    metrics.push(analyzeTypeScriptFile(file, sourceText, changedLines));
  }

  return metrics;
}

export function analyzeTypeScriptFile(file, sourceText, changedLines = 0) {
  const sourceFile = ts.createSourceFile(file, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const functions = [];

  visit(sourceFile);

  const maxFunction = functions
    .slice()
    .sort((left, right) => right.complexity - left.complexity || right.lines - left.lines)[0];

  return {
    file,
    changedLines,
    functionCount: functions.length,
    maxComplexity: maxFunction?.complexity ?? 1,
    maxFunctionLines: maxFunction?.lines ?? 0,
    line: maxFunction?.line ?? 1,
  };

  function visit(node) {
    if (isFunctionLikeDeclaration(node) && node.body !== undefined) {
      functions.push(analyzeFunctionNode(sourceFile, node));
    }

    ts.forEachChild(node, visit);
  }
}

export function createRefactorFinding(fileMetrics, options = defaultOptions) {
  const changedLines = fileMetrics.changedLines ?? 0;
  const changedEnough = changedLines >= options.changedLineThreshold || options.mode === "all";
  const complexEnough = fileMetrics.maxComplexity >= options.complexityThreshold;
  const longEnough = fileMetrics.maxFunctionLines >= options.functionLineThreshold;

  if (!changedEnough || (!complexEnough && !longEnough)) {
    return undefined;
  }

  return {
    ...fileMetrics,
    id: "ci.code-metrics.refactor-candidate",
    score: fileMetrics.maxComplexity * 3 + Math.floor(fileMetrics.maxFunctionLines / 20) + changedLines * 2,
  };
}

function analyzeFunctionNode(sourceFile, node) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.end).line + 1;

  return {
    complexity: calculateCyclomaticComplexity(node),
    lines: end - start + 1,
    line: start,
  };
}

function calculateCyclomaticComplexity(node) {
  let complexity = 1;

  visit(node);
  return complexity;

  function visit(current) {
    if (current !== node && isFunctionLikeDeclaration(current)) {
      return;
    }

    if (addsDecisionPoint(current)) {
      complexity += 1;
    }

    ts.forEachChild(current, visit);
  }
}

function addsDecisionPoint(node) {
  return (
    ts.isIfStatement(node) ||
    ts.isConditionalExpression(node) ||
    ts.isForStatement(node) ||
    ts.isForInStatement(node) ||
    ts.isForOfStatement(node) ||
    ts.isWhileStatement(node) ||
    ts.isDoStatement(node) ||
    ts.isCatchClause(node) ||
    ts.isCaseClause(node) ||
    isLogicalBranch(node)
  );
}

function isLogicalBranch(node) {
  return (
    ts.isBinaryExpression(node) &&
    (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
  );
}

function isFunctionLikeDeclaration(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node)
  );
}

async function readChangedTypeScriptFiles(options) {
  const files = await readChangedFiles(options);
  return files.filter(isInspectableTypeScriptSourceFile);
}

async function readChangedFiles(options) {
  const diffRange = await resolveDiffRange(options.baseRef);
  const args =
    diffRange === undefined
      ? ["diff", "--name-only", "--diff-filter=ACMR", "HEAD^", "HEAD"]
      : ["diff", "--name-only", "--diff-filter=ACMR", diffRange];

  const { stdout } = await execFileAsync("git", args, { cwd });
  const files = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  const changedLineCounts = await readChangedLineCounts(diffRange);

  return files.map((file) => ({
    file,
    changedLines: changedLineCounts.get(file) ?? 0,
  }));
}

async function readChangedLineCounts(diffRange) {
  const args =
    diffRange === undefined
      ? ["diff", "--numstat", "--diff-filter=ACMR", "HEAD^", "HEAD"]
      : ["diff", "--numstat", "--diff-filter=ACMR", diffRange];
  const { stdout } = await execFileAsync("git", args, { cwd });
  const counts = new Map();

  for (const line of stdout.split(/\r?\n/)) {
    const [additions, deletions, file] = line.split("\t");
    if (file === undefined) {
      continue;
    }
    counts.set(file, parseNumstatValue(additions) + parseNumstatValue(deletions));
  }

  return counts;
}

async function resolveDiffRange(baseRef) {
  if (baseRef === undefined) {
    return undefined;
  }

  const { stdout } = await execFileAsync("git", ["merge-base", baseRef, "HEAD"], { cwd });
  const mergeBase = stdout.trim();
  return mergeBase.length === 0 ? undefined : `${mergeBase}...HEAD`;
}

async function collectTypeScriptSourceFiles(directory) {
  const files = [];
  await collectFiles(directory, files);
  return files.map((file) => ({ file, changedLines: 0 })).filter(({ file }) => isInspectableTypeScriptSourcePath(file));
}

async function collectFiles(directory, files) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name).split(path.sep).join("/");
    if (entry.isDirectory()) {
      await collectFiles(entryPath, files);
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
}

function isInspectableTypeScriptSourceFile({ file }) {
  return isInspectableTypeScriptSourcePath(file);
}

function isInspectableTypeScriptSourcePath(file) {
  return file.startsWith("packages/") && file.includes("/src/") && file.endsWith(".ts") && !file.endsWith(".test.ts");
}

function parseNumstatValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatFindingMessage(finding) {
  return [
    `${finding.id}: changed TypeScript file has refactor-risk code metrics.`,
    `why=This file is being changed while its largest function has complexity ${finding.maxComplexity} and ${finding.maxFunctionLines} lines, which raises regression risk for future agent edits.`,
    "action=Consider a small behavior-preserving refactor or add focused tests before adding more logic here.",
    "ignore=This is advisory; leave it alone when the PR only touches formatting, docs, generated output, or unrelated code paths.",
  ].join(" ");
}

function writeGitHubWarningAnnotation({ file, line, title, message }) {
  if (!isGitHubActions) {
    return;
  }

  const properties = [
    `file=${escapeGitHubAnnotationProperty(file)}`,
    line === undefined ? undefined : `line=${line}`,
    `title=${escapeGitHubAnnotationProperty(title)}`,
  ]
    .filter((property) => property !== undefined)
    .join(",");

  console.error(`::warning ${properties}::${escapeGitHubAnnotationMessage(message)}`);
}

function reportScriptError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (isGitHubActions) {
    writeGitHubWarningAnnotation({
      file: "workflow-scripts/check-code-metrics.mjs",
      title: "Code metrics check could not run",
      message:
        "ci.code-metrics.script-error: code metrics warning generation failed. why=Agents may miss advisory refactor signals for this PR. action=Run pnpm code-metrics locally and fix the script error.",
    });
  }
  console.error(message);
}

function escapeGitHubAnnotationProperty(value) {
  return escapeGitHubAnnotationMessage(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function escapeGitHubAnnotationMessage(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function parseArguments(args) {
  const rawOptions = parseLongOptions(args[0] === "--" ? args.slice(1) : args);
  const options = { ...defaultOptions };

  if (rawOptions.has("--base-ref")) {
    options.baseRef = rawOptions.get("--base-ref");
  }
  if (rawOptions.has("--mode")) {
    options.mode = rawOptions.get("--mode");
  }
  if (rawOptions.has("--complexity-threshold")) {
    options.complexityThreshold = parsePositiveInteger(
      "--complexity-threshold",
      rawOptions.get("--complexity-threshold"),
    );
  }
  if (rawOptions.has("--function-line-threshold")) {
    options.functionLineThreshold = parsePositiveInteger(
      "--function-line-threshold",
      rawOptions.get("--function-line-threshold"),
    );
  }
  if (rawOptions.has("--changed-line-threshold")) {
    options.changedLineThreshold = parsePositiveInteger(
      "--changed-line-threshold",
      rawOptions.get("--changed-line-threshold"),
    );
  }
  if (options.mode !== "changed" && options.mode !== "all") {
    throw new Error("--mode must be changed or all.");
  }

  return options;
}

function parseLongOptions(args) {
  const values = new Map();
  const allowedOptions = new Set([
    "--base-ref",
    "--changed-line-threshold",
    "--complexity-threshold",
    "--function-line-threshold",
    "--mode",
  ]);

  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];

    if (!option?.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${option ?? ""}`);
    }
    if (!allowedOptions.has(option)) {
      throw new Error(`Unknown option: ${option}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${option} requires a value.`);
    }
    if (values.has(option)) {
      throw new Error(`Duplicate option: ${option}`);
    }

    values.set(option, value);
  }

  return values;
}

function parsePositiveInteger(option, value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${option} must be a positive integer.`);
  }
  return parsed;
}

function isMainModule() {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}
