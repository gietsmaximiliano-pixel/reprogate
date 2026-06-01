import * as core from "@actions/core";
import * as github from "@actions/github";
import { calculateActionabilityScore, parseManifestText, validateManifest } from "@reprogate/spec";

export const COMMENT_MARKER = "<!-- reprogate-validation-comment -->";

export type ReproGateLabel =
  | "reprogate:complete"
  | "reprogate:needs-info"
  | "reprogate:manual-review";

export interface IssueAnalysis {
  label: ReproGateLabel;
  comment: string;
  score: number;
  valid: boolean;
  missingFields: string[];
  invalidFields: Array<{ path: string; message: string }>;
}

export function extractReproGateBlock(issueBody: string): string | undefined {
  const match = issueBody.match(/```(?:reprogate|reprogate-yaml)\s*\r?\n([\s\S]*?)```/i);
  return match?.[1]?.trim();
}

export function selectLabel(options: {
  valid: boolean;
  score: number;
  reportType?: string;
  parseFailed?: boolean;
}): ReproGateLabel {
  if (options.parseFailed) return "reprogate:manual-review";
  if (options.reportType === "security") return "reprogate:manual-review";
  if (options.valid && options.score >= 80) return "reprogate:complete";
  return "reprogate:needs-info";
}

function formatIssueList(items: string[]): string {
  if (items.length === 0) return "None.";
  return items.map((item) => `- ${item}`).join("\n");
}

export function sanitizeCommentText(input: string): string {
  return input
    .replaceAll("\r", " ")
    .replaceAll("\0", "")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .slice(0, 500);
}

export function analyzeIssueBody(issueBody: string): IssueAnalysis {
  const block = extractReproGateBlock(issueBody);
  if (!block) {
    return {
      label: "reprogate:needs-info",
      score: 0,
      valid: false,
      missingFields: ["fenced reprogate YAML block"],
      invalidFields: [],
      comment: `${COMMENT_MARKER}
ReproGate could not find a fenced \`reprogate\` YAML block.

Missing information:
- fenced reprogate YAML block`
    };
  }

  let parsed: unknown;
  try {
    parsed = parseManifestText(block, "issue.reprogate.yml");
  } catch (error) {
    const message = sanitizeCommentText(error instanceof Error ? error.message : String(error));
    return {
      label: "reprogate:manual-review",
      score: 0,
      valid: false,
      missingFields: [],
      invalidFields: [{ path: "<root>", message }],
      comment: `${COMMENT_MARKER}
ReproGate could not parse the fenced manifest as YAML.

Parser error:
- ${message}`
    };
  }

  const validation = validateManifest(parsed);
  const score = calculateActionabilityScore(validation.manifest, validation);
  const label = selectLabel({
    valid: validation.valid,
    score: score.score,
    reportType: validation.manifest?.reportType
  });

  const missing = validation.missingFields.map(sanitizeCommentText);
  const invalid = validation.invalidFields.map(
    (issue) => `${sanitizeCommentText(issue.path)}: ${sanitizeCommentText(issue.message)}`
  );
  const status = validation.valid ? "valid" : "incomplete";

  return {
    label,
    score: score.score,
    valid: validation.valid,
    missingFields: validation.missingFields,
    invalidFields: validation.invalidFields,
    comment: `${COMMENT_MARKER}
ReproGate evidence check: **${status}**  
Actionability score: **${score.score}/100**  
Suggested label: \`${label}\`

Missing information:
${formatIssueList(missing)}

Invalid fields:
${formatIssueList(invalid)}

This check validates structured evidence only. It does not determine whether a report was written by AI.`
  };
}

export function findExistingReproGateComment(
  comments: Array<{ id: number; body?: string | null }>
): number | undefined {
  return comments.find((comment) => comment.body?.includes(COMMENT_MARKER))?.id;
}

async function run(): Promise<void> {
  const issue = github.context.payload.issue;
  if (!issue) {
    core.info("No issue payload found; nothing to validate.");
    return;
  }

  const dryRun = core.getInput("dry-run").toLowerCase() === "true";
  const token = core.getInput("github-token", { required: true });
  const octokit = github.getOctokit(token);
  const analysis = analyzeIssueBody(issue.body ?? "");
  const { owner, repo } = github.context.repo;

  core.info(`ReproGate score: ${analysis.score}/100`);
  core.info(`ReproGate label: ${analysis.label}`);

  if (dryRun) {
    core.info("Dry run enabled; no labels or comments were changed.");
    return;
  }

  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issue.number,
    labels: [analysis.label]
  });

  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issue.number,
    per_page: 100
  });
  const existingCommentId = findExistingReproGateComment(comments.data);

  if (existingCommentId) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingCommentId,
      body: analysis.comment
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: analysis.comment
    });
  }
}

if (!process.env.VITEST) {
  run().catch((error: unknown) => {
    core.setFailed(error instanceof Error ? error.message : String(error));
  });
}
