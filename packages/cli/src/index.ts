#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { confirm, input, select } from "@inquirer/prompts";
import { generateDashboard } from "@reprogate/dashboard";
import {
  calculateActionabilityScore,
  createReceipt,
  normalizeManifest,
  readManifestFile,
  renderMarkdownSummary,
  validateManifest,
  validateManifestWithEvidence,
  type ReproGateManifest
} from "@reprogate/spec";
import { Command } from "commander";
import yaml from "js-yaml";
import { buildDockerSafeRunInvocations } from "./safe-run.js";

export const CLI_VERSION = "0.1.0";

interface CommonWriteOptions {
  force?: boolean;
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function writeTextFile(filePath: string, content: string, options: CommonWriteOptions = {}) {
  if (!options.force && (await pathExists(filePath))) {
    throw new Error(`${filePath} already exists. Re-run with --force to overwrite it.`);
  }
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function exampleConfig(): string {
  return `schemaVersion: "0.1"
minimumActionabilityScore: 70
labels:
  complete: "reprogate:complete"
  needsInfo: "reprogate:needs-info"
  manualReview: "reprogate:manual-review"
safeRun:
  enabled: false
  timeoutSeconds: 120
  cpus: "1"
  memory: 512m
`;
}

function bugReportTemplate(): string {
  return `name: Bug report with ReproGate evidence
description: Report a reproducible bug with structured evidence.
title: "[Bug]: "
labels: ["reprogate:needs-info"]
body:
  - type: markdown
    attributes:
      value: |
        Paste a ReproGate Evidence Manifest in the fenced block below. ReproGate validates evidence quality, not AI authorship.
  - type: textarea
    id: reprogate
    attributes:
      label: ReproGate Evidence Manifest
      description: Fill in or replace this manifest with output from \`reprogate create\`.
      value: |
        \`\`\`reprogate
        schemaVersion: "0.1"
        reportType: bug
        projectName: your-project
        affectedVersion: 0.0.0
        environment:
          os: macOS, Windows, or Linux version
          runtime: Node.js 20
          dependencies: {}
        summary: Short specific summary of the issue
        expectedBehavior: What should happen?
        actualBehavior: What happened instead?
        stepsToReproduce:
          - First deterministic step
          - Second deterministic step
        aiAssisted: false
        humanReviewed: true
        createdAt: "2026-06-01T00:00:00.000Z"
        \`\`\`
    validations:
      required: true
`;
}

function securityGuidance(): string {
  return `# Security Report Guidance

ReproGate helps structure evidence, but public issue automation must never execute commands from untrusted reports.

For vulnerabilities, avoid posting secrets, exploit chains, weaponized payloads, or private personal data in public issues.
Use this manifest to describe affected versions, environment details, reproducible symptoms, and safe redacted evidence.
`;
}

function workflowTemplate(): string {
  return `name: ReproGate

on:
  issues:
    types: [opened, edited]

permissions:
  contents: read
  issues: write

jobs:
  validate-issue:
    runs-on: ubuntu-latest
    steps:
      - name: Validate ReproGate evidence
        uses: reprogate/reprogate/packages/github-action@v0.1.0
        with:
          github-token: \${{ github.token }}
`;
}

function maintainerSetupGuide(): string {
  return `# ReproGate Maintainer Setup

1. Review \`.reprogate/config.yml\`.
2. Commit the generated GitHub issue template and workflow.
3. Ask reporters to run \`reprogate create\` or paste a fenced \`reprogate\` YAML block.
4. Never execute commands from public issues automatically.
5. Use \`reprogate verify-safe-run <path>\` only after manual review and only for trusted reports.
`;
}

export async function initProject(
  rootDir: string,
  options: CommonWriteOptions = {}
): Promise<string[]> {
  const files = [
    [".reprogate/config.yml", exampleConfig()],
    [".github/ISSUE_TEMPLATE/bug-report.yml", bugReportTemplate()],
    [".github/ISSUE_TEMPLATE/security-report-guidance.md", securityGuidance()],
    [".github/workflows/reprogate.yml", workflowTemplate()],
    ["docs/REPROGATE_SETUP.md", maintainerSetupGuide()]
  ] as const;

  const written: string[] = [];
  for (const [file, content] of files) {
    const target = path.join(rootDir, file);
    await writeTextFile(target, content, options);
    written.push(target);
  }
  return written;
}

export async function loadManifestWithPath(filePath: string): Promise<{
  raw: unknown;
  manifest?: ReproGateManifest;
  validation: Awaited<ReturnType<typeof validateManifestWithEvidence>>;
  baseDir: string;
}> {
  const raw = await readManifestFile(filePath);
  const baseDir = path.dirname(path.resolve(filePath));
  const validation = await validateManifestWithEvidence(raw, baseDir);
  return { raw, manifest: validation.manifest, validation, baseDir };
}

function printValidationResult(
  filePath: string,
  validation: Awaited<ReturnType<typeof validateManifestWithEvidence>>
) {
  const actionability = calculateActionabilityScore(validation.manifest, validation);
  const status = validation.valid ? "valid" : "invalid";

  console.log(`ReproGate validation: ${status}`);
  console.log(`Manifest: ${filePath}`);
  console.log(`Actionability score: ${actionability.score}/100`);

  if (validation.missingFields.length > 0) {
    console.log("\nMissing fields:");
    for (const field of validation.missingFields) console.log(`- ${field}`);
  }

  if (validation.invalidFields.length > 0) {
    console.log("\nInvalid fields:");
    for (const issue of validation.invalidFields) console.log(`- ${issue.path}: ${issue.message}`);
  }

  if (validation.evidence.length > 0) {
    console.log("\nEvidence files:");
    for (const evidence of validation.evidence) {
      const result = evidence.matches ? "ok" : "failed";
      console.log(`- ${evidence.path}: ${result}`);
      if (evidence.error) console.log(`  ${evidence.error}`);
    }
  }

  console.log("\nScore reasons:");
  for (const reason of actionability.reasons) console.log(`- ${reason}`);
}

async function createManifestInteractively() {
  const reportType = await select<ReproGateManifest["reportType"]>({
    message: "Report type",
    choices: [
      { name: "Bug", value: "bug" },
      { name: "Regression", value: "regression" },
      { name: "Performance", value: "performance" },
      { name: "Compatibility", value: "compatibility" },
      { name: "Security", value: "security" }
    ]
  });

  const projectName = await input({ message: "Project name", required: true });
  const affectedVersion = await input({ message: "Affected version", required: true });
  const os = await input({ message: "Operating system and version", required: true });
  const runtime = await input({ message: "Runtime and version" });
  const summary = await input({ message: "Specific summary", required: true });
  const expectedBehavior = await input({ message: "Expected behavior", required: true });
  const actualBehavior = await input({ message: "Actual behavior", required: true });
  const stepText = await input({
    message: "Steps to reproduce (separate steps with |)",
    required: true
  });
  const commandText = await input({ message: "Optional commands (separate commands with |)" });
  const redactionNotes = await input({ message: "Redaction notes" });
  const aiAssisted = await confirm({
    message: "Was AI assistance used while preparing this report?",
    default: false
  });
  const humanReviewed = await confirm({
    message: "Did you manually review and understand the report?",
    default: true
  });

  const manifest: ReproGateManifest = {
    schemaVersion: "0.1",
    reportType,
    projectName,
    affectedVersion,
    environment: {
      os,
      ...(runtime.trim().length > 0 ? { runtime } : {})
    },
    summary,
    expectedBehavior,
    actualBehavior,
    stepsToReproduce: stepText
      .split("|")
      .map((step) => step.trim())
      .filter(Boolean),
    ...(commandText.trim().length > 0
      ? {
          commands: commandText
            .split("|")
            .map((command) => command.trim())
            .filter(Boolean)
        }
      : {}),
    ...(redactionNotes.trim().length > 0 ? { redactionNotes } : {}),
    aiAssisted,
    humanReviewed,
    createdAt: new Date().toISOString()
  };

  const validation = validateManifest(manifest);
  if (!validation.valid) {
    throw new Error(
      `Generated manifest was invalid: ${validation.invalidFields.map((item) => item.message).join(", ")}`
    );
  }

  await writeTextFile("reprogate.yml", yaml.dump(manifest, { lineWidth: 100 }), { force: true });
  await writeTextFile("reprogate.json", normalizeManifest(manifest), { force: true });
  console.log("Created reprogate.yml and reprogate.json");
}

function dockerAvailable(): boolean {
  const result = spawnSync("docker", ["version", "--format", "{{.Server.Version}}"], {
    encoding: "utf8",
    stdio: "pipe"
  });
  return result.status === 0;
}

async function runSafeVerification(
  filePath: string,
  options: { yes?: boolean; timeout?: string; cpus?: string; memory?: string }
) {
  const { manifest, validation, baseDir } = await loadManifestWithPath(filePath);
  if (!manifest || !validation.valid) {
    throw new Error("Manifest must be valid before safe-run verification.");
  }

  const timeoutSeconds = Number(options.timeout ?? "120");
  const invocations = buildDockerSafeRunInvocations({
    repoDir: baseDir,
    commands: manifest.commands ?? [],
    timeoutSeconds,
    cpus: options.cpus,
    memory: options.memory
  });

  console.log("ReproGate safe-run is for trusted, manually reviewed reports only.");
  console.log("It never runs public issue commands automatically.");
  console.log("\nDocker commands to execute:");
  for (const invocation of invocations) console.log(`- ${invocation.displayCommand}`);

  const approved =
    options.yes ??
    (await confirm({
      message: "Execute these commands in Docker with network disabled?",
      default: false
    }));

  if (!approved) {
    console.log("Cancelled.");
    return;
  }

  if (!dockerAvailable()) {
    throw new Error("Docker is unavailable. ReproGate will not fall back to host execution.");
  }

  for (const invocation of invocations) {
    const result = spawnSync(invocation.executable, invocation.args, {
      stdio: "inherit",
      timeout: invocation.timeoutSeconds * 1000 + 5000
    });
    if (result.status !== 0) {
      throw new Error(`Command failed: ${invocation.originalCommand}`);
    }
  }
}

export function buildProgram(): Command {
  const program = new Command();

  program
    .name("reprogate")
    .description("Evidence-first intake toolkit for open-source maintainers.")
    .version(CLI_VERSION);

  program
    .command("init")
    .description("Initialize ReproGate files in an existing repository.")
    .option("--force", "Overwrite existing files.")
    .action(async (options: CommonWriteOptions) => {
      const written = await initProject(process.cwd(), options);
      console.log("ReproGate initialized:");
      for (const file of written) console.log(`- ${path.relative(process.cwd(), file)}`);
    });

  program
    .command("create")
    .description("Interactively create a ReproGate manifest.")
    .action(createManifestInteractively);

  program
    .command("validate")
    .description("Validate a YAML or JSON ReproGate manifest.")
    .argument("<path>", "Path to reprogate.yml or reprogate.json")
    .action(async (filePath: string) => {
      const { validation } = await loadManifestWithPath(filePath);
      printValidationResult(filePath, validation);
      if (!validation.valid) process.exitCode = 1;
    });

  program
    .command("receipt")
    .description("Generate a verification receipt for a manifest.")
    .argument("<path>", "Path to manifest")
    .option("-o, --output <path>", "Receipt output path")
    .option("--validated-at <iso>", "Override validation timestamp for deterministic receipts.")
    .action(async (filePath: string, options: { output?: string; validatedAt?: string }) => {
      const { manifest, validation, baseDir } = await loadManifestWithPath(filePath);
      if (!manifest || !validation.valid) {
        printValidationResult(filePath, validation);
        process.exitCode = 1;
        return;
      }
      if (options.validatedAt && Number.isNaN(Date.parse(options.validatedAt))) {
        throw new Error("--validated-at must be a valid ISO timestamp.");
      }
      const receipt = await createReceipt({
        manifest,
        baseDir,
        cliVersion: CLI_VERSION,
        validatedAt: options.validatedAt
      });
      const output = options.output ?? `${filePath}.receipt.json`;
      await writeTextFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { force: true });
      console.log(`Receipt written to ${output}`);
      console.log(`Receipt hash: ${receipt.receiptHash}`);
    });

  program
    .command("render")
    .description("Render a Markdown issue summary.")
    .argument("<path>", "Path to manifest")
    .option("-o, --output <path>", "Markdown output path")
    .action(async (filePath: string, options: { output?: string }) => {
      const { manifest, validation } = await loadManifestWithPath(filePath);
      if (!manifest || !validation.valid) {
        printValidationResult(filePath, validation);
        process.exitCode = 1;
        return;
      }
      const markdown = renderMarkdownSummary(
        manifest,
        calculateActionabilityScore(manifest, validation)
      );
      if (options.output) {
        await writeTextFile(options.output, markdown, { force: true });
        console.log(`Markdown written to ${options.output}`);
      } else {
        console.log(markdown);
      }
    });

  program
    .command("verify-safe-run")
    .description("Opt-in Docker verification for trusted, manually reviewed reports.")
    .argument("<path>", "Path to manifest")
    .option("--yes", "Run without an interactive confirmation prompt.")
    .option("--timeout <seconds>", "Timeout per command in seconds.", "120")
    .option("--cpus <value>", "Docker CPU limit.", "1")
    .option("--memory <value>", "Docker memory limit.", "512m")
    .action(runSafeVerification);

  program
    .command("dashboard")
    .description("Generate a static dashboard from ReproGate receipts.")
    .argument("<receiptsDir>", "Directory containing receipt JSON files")
    .requiredOption("-o, --output <dir>", "Output directory for the static site")
    .action(async (receiptsDir: string, options: { output: string }) => {
      const result = await generateDashboard(receiptsDir, options.output);
      console.log(`Dashboard written to ${result.outputPath}`);
      console.log(
        `Receipts: ${result.stats.total}, valid: ${result.stats.valid}, invalid: ${result.stats.invalid}`
      );
    });

  return program;
}

async function main() {
  try {
    await buildProgram().parseAsync(process.argv);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
