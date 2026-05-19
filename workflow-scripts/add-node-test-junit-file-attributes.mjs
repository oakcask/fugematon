import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

if (isMainModule()) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

async function main() {
  const { reportPath } = parseArguments(process.argv.slice(2));
  const xml = await readFile(reportPath, "utf8");
  await writeFile(reportPath, normalizeNodeTestJUnitFileAttributes(xml));
}

export function normalizeNodeTestJUnitFileAttributes(xml) {
  return xml.replaceAll(/<testcase\b([^>]*)>/g, (element, rawAttributes) => {
    const attributes = parseXmlAttributes(rawAttributes);
    const filename = attributes.file ?? attributes.name;
    if (filename === undefined) {
      return element;
    }

    const fileAttribute = ` file="${escapeXmlAttribute(toSourceTestFilename(filename))}"`;
    if (/\sfile=/.test(rawAttributes)) {
      return element.replace(/\sfile="[^"]*"/, fileAttribute);
    }

    const closing = element.endsWith("/>") ? "/>" : ">";
    const opening = element.slice(0, -closing.length).replace(/\s*\/$/, "");
    return `${opening}${fileAttribute}${closing}`;
  });
}

function parseXmlAttributes(rawAttributes) {
  const attributes = {};
  const attributePattern = /([\w:-]+)="([^"]*)"/g;

  for (const match of rawAttributes.matchAll(attributePattern)) {
    attributes[match[1]] = decodeXmlEntities(match[2]);
  }

  return attributes;
}

function decodeXmlEntities(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function toSourceTestFilename(filename) {
  const normalizedFilename = filename.split(path.sep).join("/");
  const packageDistMatch = normalizedFilename.match(/(?:^|\/)(packages\/[^/]+)\/dist\/(.+)\.js$/);
  if (packageDistMatch !== null) {
    return `${packageDistMatch[1]}/src/${packageDistMatch[2]}.ts`;
  }

  const packageSourceMatch = normalizedFilename.match(/(?:^|\/)(packages\/[^/]+\/src\/.+\.test\.ts)$/);
  if (packageSourceMatch !== null) {
    return packageSourceMatch[1];
  }

  const workflowScriptTestMatch = normalizedFilename.match(/(?:^|\/)(workflow-scripts\/.+\.test\.mjs)$/);
  if (workflowScriptTestMatch !== null) {
    return workflowScriptTestMatch[1];
  }

  return normalizedFilename;
}

function escapeXmlAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseArguments(args) {
  const values = parseLongOptions(args);
  const reportPath = values.get("--junit-report");

  if (reportPath === undefined) {
    throw new Error("Usage: node workflow-scripts/add-node-test-junit-file-attributes.mjs --junit-report <path>");
  }

  return { reportPath: toPosixRelativePath(reportPath) };
}

function toPosixRelativePath(filePath) {
  return path.relative(process.cwd(), path.resolve(process.cwd(), filePath)).split(path.sep).join("/");
}

function parseLongOptions(args) {
  const values = new Map();

  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];

    if (!option?.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${option ?? ""}`);
    }
    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${option} requires a value.`);
    }
    if (option !== "--junit-report") {
      throw new Error(`Unknown option: ${option}`);
    }
    if (values.has(option)) {
      throw new Error(`Duplicate option: ${option}`);
    }

    values.set(option, value);
  }

  return values;
}

function isMainModule() {
  return process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
}
