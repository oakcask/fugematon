import path from "node:path";
import { fileURLToPath } from "node:url";

const requiredSections = ["Intent", "Consequences", "Risks", "Verification"];
const performanceBenchmarkFields = ["Baseline", "Workload", "Procedure", "Samples", "Result", "Correctness"];
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

if (isMainModule()) {
  const result = validatePullRequestDescription(process.env.PR_BODY ?? "", {
    title: process.env.PR_TITLE ?? "",
  });

  if (!result.valid) {
    const message = [
      "Pull request description does not match .github/pull_request_template.md.",
      ...result.errors.map((error) => `- ${error}`),
    ].join("\n");

    if (isGitHubActions) {
      writeGitHubErrorAnnotation({
        title: "Invalid PR description",
        message,
      });
    }

    console.error(message);
    process.exit(1);
  }

  console.log("Pull request description matches .github/pull_request_template.md.");
}

export function validatePullRequestDescription(body, { title = "" } = {}) {
  const errors = [];
  const sections = parseMarkdownH2Sections(body);
  const actualSectionTitles = sections.map((section) => section.title);

  if (body.trim() === "") {
    errors.push("Description must not be empty.");
  }

  if (!arraysEqual(actualSectionTitles, requiredSections)) {
    errors.push(
      `Use exactly these H2 sections in this order: ${requiredSections.map((section) => `## ${section}`).join(", ")}.`,
    );
  }

  for (const sectionName of requiredSections) {
    const section = sections.find(({ title }) => title === sectionName);
    if (section === undefined) {
      continue;
    }
    if (stripTemplateComments(section.content).trim() === "") {
      errors.push(`## ${sectionName} must contain reviewer-facing content.`);
    }
  }

  if (isBreakingConventionalSubject(title) && !hasBreakingChangeLine(body)) {
    errors.push(
      "PRs marked breaking with ! in the title must include a BREAKING CHANGE: line describing the compatibility impact.",
    );
  }

  if (isPerformanceConventionalSubject(title)) {
    const verification = sections.find(({ title: sectionTitle }) => sectionTitle === "Verification");
    const benchmarkMethod =
      verification === undefined ? undefined : markdownH3Section(verification.content, "Benchmark method");
    if (benchmarkMethod === undefined) {
      errors.push(
        "ci.pr-description.performance-benchmark-method: missing ### Benchmark method under ## Verification; why=reviewers cannot reproduce or evaluate a performance claim without its comparison method; action=add the benchmark subsection with Baseline, Workload, Procedure, Samples, Result, and Correctness fields",
      );
    } else {
      const missingFields = performanceBenchmarkFields.filter(
        (field) => !new RegExp(`^[ \\t]*-[ \\t]+${field}:[ \\t]*\\S.+$`, "m").test(benchmarkMethod),
      );
      if (missingFields.length > 0) {
        errors.push(
          `ci.pr-description.performance-benchmark-method: incomplete ### Benchmark method (missing: ${missingFields.join(", ")}); why=reviewers need the comparison, workload, procedure, sampling, result, and correctness evidence to assess a performance claim; action=add reviewer-facing values for every benchmark field in .github/pull_request_template.md`,
        );
      }
    }
  }

  return {
    errors,
    valid: errors.length === 0,
  };
}

function isBreakingConventionalSubject(subject) {
  return /^[a-z]+(?:\([a-z0-9._-]+\))?!: .+$/.test(subject);
}

function isPerformanceConventionalSubject(subject) {
  return /^perf(?:\([a-z0-9._-]+\))?!?: .+$/.test(subject);
}

function hasBreakingChangeLine(body) {
  return /^BREAKING CHANGE:[ \t]*\S.+$/m.test(stripTemplateComments(body));
}

export function parseMarkdownH2Sections(body) {
  const headingPattern = /^##(?!#)[ \t]+(.+?)[ \t#]*$/gm;
  const headings = Array.from(body.matchAll(headingPattern));

  return headings.map((heading, index) => {
    const nextHeading = headings[index + 1];
    return {
      title: heading[1].trim(),
      content: body.slice(heading.index + heading[0].length, nextHeading?.index ?? body.length),
    };
  });
}

function markdownH3Section(content, expectedTitle) {
  const headingPattern = /^###(?!#)[ \t]+(.+?)[ \t#]*$/gm;
  const headings = Array.from(content.matchAll(headingPattern));
  const index = headings.findIndex((heading) => heading[1].trim() === expectedTitle);
  if (index < 0) {
    return undefined;
  }
  const heading = headings[index];
  return stripTemplateComments(content.slice(heading.index + heading[0].length, headings[index + 1]?.index)).trim();
}

function stripTemplateComments(content) {
  return content.replaceAll(/<!--[\s\S]*?-->/g, "");
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isMainModule() {
  return process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
}

function writeGitHubErrorAnnotation({ title, message }) {
  console.error(`::error title=${escapeGitHubAnnotationProperty(title)}::${escapeGitHubAnnotationMessage(message)}`);
}

function escapeGitHubAnnotationProperty(value) {
  return escapeGitHubAnnotationMessage(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function escapeGitHubAnnotationMessage(value) {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}
