import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function main() {
  const { reportPath } = parseArguments(process.argv.slice(2));
  const xml = await readFile(reportPath, "utf8");
  const normalizedXml = xml.replaceAll(/<testcase\b([^>]*)>/g, (element, rawAttributes) => {
    if (/\sfile=/.test(rawAttributes)) {
      return element;
    }

    const attributes = parseXmlAttributes(rawAttributes);
    const name = attributes.name;
    if (name === undefined) {
      return element;
    }

    const closing = element.endsWith("/>") ? "/>" : ">";
    const opening = element.slice(0, -closing.length).replace(/\s*\/$/, "");
    return `${opening} file="${escapeXmlAttribute(toSourceTestFilename(name))}"${closing}`;
  });

  await writeFile(reportPath, normalizedXml);
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
  return filename
    .replace(/\/dist\/(.+)\.js$/, "/src/$1.ts")
    .split(path.sep)
    .join("/");
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
