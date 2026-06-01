import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import yaml from "js-yaml";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export const SUPPORTED_SCHEMA_VERSION = "0.1" as const;
export const RECEIPT_FORMAT_VERSION = "0.1" as const;

export const reportTypes = [
  "bug",
  "regression",
  "performance",
  "compatibility",
  "security"
] as const;

export type ReportType = (typeof reportTypes)[number];

export const evidenceKinds = ["fixture", "log", "screenshot", "trace", "other"] as const;
export type EvidenceKind = (typeof evidenceKinds)[number];

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isSafeRelativePath(input: string): boolean {
  if (input.trim() !== input || input.length === 0) return false;
  if (input.includes("\0")) return false;
  if (path.isAbsolute(input) || path.win32.isAbsolute(input) || path.posix.isAbsolute(input)) {
    return false;
  }

  const normalized = input.replaceAll("\\", "/");
  if (normalized.startsWith("~/") || normalized === "~") return false;

  return normalized.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

const safeRelativePathSchema = z
  .string()
  .min(1)
  .refine(isSafeRelativePath, "Use a safe relative path without traversal or absolute roots.");

const dependencyVersionsSchema = z
  .record(z.string().min(1), z.string().min(1))
  .describe("Map of dependency names to versions relevant to this report.");

export const evidenceFileSchema = z
  .object({
    path: safeRelativePathSchema.describe("Manifest-relative path to a local evidence file."),
    sha256: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, "Expected a SHA-256 hex digest.")
      .transform((value) => value.toLowerCase())
      .describe("SHA-256 hash of the local evidence file."),
    kind: z.enum(evidenceKinds).default("other"),
    description: z.string().min(1).optional()
  })
  .strict();

export const environmentSchema = z
  .object({
    os: z.string().min(1).describe("Operating system and version, for example Windows 11."),
    runtime: z
      .string()
      .min(1)
      .optional()
      .describe("Runtime and version, for example Node.js 20.18.1."),
    dependencies: dependencyVersionsSchema.optional()
  })
  .strict();

export const reproGateManifestSchema = z
  .object({
    schemaVersion: z.literal(SUPPORTED_SCHEMA_VERSION),
    reportType: z.enum(reportTypes),
    projectName: z.string().min(1),
    affectedVersion: z.string().min(1),
    environment: environmentSchema,
    summary: z.string().min(10),
    expectedBehavior: z.string().min(1),
    actualBehavior: z.string().min(1),
    stepsToReproduce: z.array(z.string().min(1)).min(1),
    commands: z.array(z.string().min(1)).optional(),
    safeFixturePaths: z.array(safeRelativePathSchema).optional(),
    logFiles: z.array(safeRelativePathSchema).optional(),
    screenshots: z.array(safeRelativePathSchema).optional(),
    externalEvidenceLinks: z.array(z.string().url()).optional(),
    redactionNotes: z.string().min(1).optional(),
    aiAssisted: z.boolean(),
    humanReviewed: z.boolean(),
    evidenceFiles: z.array(evidenceFileSchema).optional(),
    createdAt: z.string().datetime({ offset: true })
  })
  .strict();

export type EvidenceFile = z.infer<typeof evidenceFileSchema>;
export type ReproGateManifest = z.infer<typeof reproGateManifestSchema>;

export const reproGateJsonSchema = zodToJsonSchema(reproGateManifestSchema, {
  name: "ReproGateEvidenceManifest",
  $refStrategy: "none"
});

export interface FieldIssue {
  path: string;
  message: string;
}

export interface EvidenceVerification {
  path: string;
  expectedSha256: string;
  actualSha256?: string;
  exists: boolean;
  matches: boolean;
  error?: string;
}

export interface ManifestValidationResult {
  valid: boolean;
  manifest?: ReproGateManifest;
  missingFields: string[];
  invalidFields: FieldIssue[];
  evidence: EvidenceVerification[];
  errors: string[];
}

export interface ActionabilityResult {
  score: number;
  reasons: string[];
}

export interface ReproGateReceipt {
  receiptFormatVersion: typeof RECEIPT_FORMAT_VERSION;
  validatedAt: string;
  cliVersion: string;
  manifestHash: string;
  manifest: {
    schemaVersion: string;
    reportType: ReportType;
    projectName: string;
    affectedVersion: string;
    summary: string;
    createdAt: string;
  };
  validation: {
    valid: boolean;
    missingFields: string[];
    invalidFields: FieldIssue[];
    evidence: EvidenceVerification[];
  };
  actionability: ActionabilityResult;
  receiptHash: string;
}

function issuePath(pathParts: Array<string | number>): string {
  return pathParts.length === 0 ? "<root>" : pathParts.join(".");
}

export function validateManifest(input: unknown): ManifestValidationResult {
  const parsed = reproGateManifestSchema.safeParse(input);

  if (!parsed.success) {
    const missingFields: string[] = [];
    const invalidFields: FieldIssue[] = [];
    const errors: string[] = [];

    if (isPlainRecord(input) && input.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
      errors.push(`Unsupported schemaVersion: ${String(input.schemaVersion ?? "<missing>")}`);
    }

    for (const issue of parsed.error.issues) {
      const fieldPath = issuePath(issue.path);
      const isMissing =
        issue.code === "invalid_type" && "received" in issue && issue.received === "undefined";

      if (isMissing) {
        missingFields.push(fieldPath);
      } else {
        invalidFields.push({ path: fieldPath, message: issue.message });
      }
    }

    return {
      valid: false,
      missingFields: [...new Set(missingFields)].sort(),
      invalidFields,
      evidence: [],
      errors
    };
  }

  return {
    valid: true,
    manifest: parsed.data,
    missingFields: [],
    invalidFields: [],
    evidence: [],
    errors: []
  };
}

export function parseManifestText(text: string, sourcePath = "reprogate.yml"): unknown {
  if (sourcePath.toLowerCase().endsWith(".json")) {
    return JSON.parse(text);
  }

  return yaml.load(text, {
    json: true
  });
}

export async function readManifestFile(filePath: string): Promise<unknown> {
  const text = await readFile(filePath, "utf8");
  return parseManifestText(text, filePath);
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(item));
  }

  if (isPlainRecord(value)) {
    const normalized: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = value[key];
      if (item !== undefined) {
        normalized[key] = normalizeValue(item);
      }
    }
    return normalized;
  }

  return value;
}

export function normalizeJson(value: unknown): string {
  return `${JSON.stringify(normalizeValue(value), null, 2)}\n`;
}

export function normalizeManifest(manifest: ReproGateManifest): string {
  return normalizeJson(reproGateManifestSchema.parse(manifest));
}

export function sha256Text(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export async function sha256File(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
}

export function manifestHash(manifest: ReproGateManifest): string {
  return sha256Text(normalizeManifest(manifest));
}

export function resolveEvidencePath(baseDir: string, evidencePath: string): string {
  if (!isSafeRelativePath(evidencePath)) {
    throw new Error(`Unsafe evidence path: ${evidencePath}`);
  }

  const resolvedBase = path.resolve(baseDir);
  const resolvedPath = path.resolve(resolvedBase, evidencePath);
  const relative = path.relative(resolvedBase, resolvedPath);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Evidence path escapes base directory: ${evidencePath}`);
  }

  return resolvedPath;
}

export async function verifyEvidenceFiles(
  manifest: ReproGateManifest,
  baseDir: string
): Promise<EvidenceVerification[]> {
  const files = manifest.evidenceFiles ?? [];
  const results: EvidenceVerification[] = [];

  for (const file of files) {
    try {
      const resolved = resolveEvidencePath(baseDir, file.path);
      const actualSha256 = await sha256File(resolved);
      results.push({
        path: file.path,
        expectedSha256: file.sha256,
        actualSha256,
        exists: true,
        matches: actualSha256 === file.sha256
      });
    } catch (error) {
      results.push({
        path: file.path,
        expectedSha256: file.sha256,
        exists: false,
        matches: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return results;
}

function hasText(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasList(value: readonly unknown[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

export function calculateActionabilityScore(
  manifest: ReproGateManifest | undefined,
  validation?: Pick<
    ManifestValidationResult,
    "valid" | "missingFields" | "invalidFields" | "evidence"
  >
): ActionabilityResult {
  if (!manifest) {
    return {
      score: 0,
      reasons: ["Manifest could not be parsed into the supported schema."]
    };
  }

  let score = 0;
  const reasons: string[] = [];

  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(`+${points}: ${reason}`);
  };

  add(5, "Supported schema version is present.");
  add(4, `Report type is ${manifest.reportType}.`);
  add(6, "Project name and affected version are present.");

  if (hasText(manifest.environment.os)) add(6, "Operating system is described.");
  if (hasText(manifest.environment.runtime)) add(5, "Runtime information is included.");
  if (
    manifest.environment.dependencies &&
    Object.keys(manifest.environment.dependencies).length > 0
  ) {
    add(6, "Relevant dependency versions are listed.");
  }

  add(10, "Summary is specific enough to be useful.");
  add(8, "Expected behavior is stated.");
  add(8, "Actual behavior is stated.");

  if (manifest.stepsToReproduce.length >= 3) {
    add(16, "Reproduction steps are detailed.");
  } else if (manifest.stepsToReproduce.length >= 1) {
    add(9, "At least one reproduction step is present.");
  }

  if (hasList(manifest.commands)) add(8, "Reporter supplied reproduction commands.");

  const evidenceCount =
    (manifest.evidenceFiles?.length ?? 0) +
    (manifest.safeFixturePaths?.length ?? 0) +
    (manifest.logFiles?.length ?? 0) +
    (manifest.screenshots?.length ?? 0) +
    (manifest.externalEvidenceLinks?.length ?? 0);
  if (evidenceCount > 0) add(8, "Evidence references are included.");
  if (manifest.evidenceFiles?.some((file) => hasText(file.sha256))) {
    add(5, "Local evidence files include SHA-256 hashes.");
  }

  if (hasText(manifest.redactionNotes)) add(4, "Redaction notes are provided.");
  if (manifest.humanReviewed) {
    add(7, "Reporter says they manually reviewed and understood the report.");
  } else {
    reasons.push("-7: Reporter has not confirmed manual review.");
    score -= 7;
  }

  if (manifest.aiAssisted) {
    reasons.push("0: AI assistance was disclosed; this is informational only.");
  } else {
    reasons.push("0: Reporter says no AI assistance was used.");
  }

  if (validation && !validation.valid) {
    const penalty = Math.min(
      40,
      validation.missingFields.length * 8 + validation.invalidFields.length * 5
    );
    if (penalty > 0) {
      score -= penalty;
      reasons.push(`-${penalty}: Schema validation issues reduce actionability.`);
    }
  }

  const failedEvidence =
    validation?.evidence.filter((item) => !item.exists || !item.matches).length ?? 0;
  if (failedEvidence > 0) {
    const penalty = Math.min(20, failedEvidence * 8);
    score -= penalty;
    reasons.push(`-${penalty}: One or more evidence files could not be verified.`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    reasons
  };
}

export async function validateManifestWithEvidence(
  input: unknown,
  baseDir: string
): Promise<ManifestValidationResult> {
  const result = validateManifest(input);
  if (!result.manifest) return result;

  const evidence = await verifyEvidenceFiles(result.manifest, baseDir);
  const invalidEvidence = evidence
    .filter((item) => !item.exists || !item.matches)
    .map((item) => ({
      path: `evidenceFiles.${item.path}`,
      message: item.error ?? "Evidence file hash did not match."
    }));

  return {
    ...result,
    valid: result.valid && invalidEvidence.length === 0,
    evidence,
    invalidFields: [...result.invalidFields, ...invalidEvidence]
  };
}

export async function createReceipt(options: {
  manifest: ReproGateManifest;
  baseDir: string;
  cliVersion: string;
  validatedAt?: string;
}): Promise<ReproGateReceipt> {
  const validation = await validateManifestWithEvidence(options.manifest, options.baseDir);
  const actionability = calculateActionabilityScore(options.manifest, validation);

  const receiptWithoutHash = {
    receiptFormatVersion: RECEIPT_FORMAT_VERSION,
    validatedAt: options.validatedAt ?? new Date().toISOString(),
    cliVersion: options.cliVersion,
    manifestHash: manifestHash(options.manifest),
    manifest: {
      schemaVersion: options.manifest.schemaVersion,
      reportType: options.manifest.reportType,
      projectName: options.manifest.projectName,
      affectedVersion: options.manifest.affectedVersion,
      summary: options.manifest.summary,
      createdAt: options.manifest.createdAt
    },
    validation: {
      valid: validation.valid,
      missingFields: validation.missingFields,
      invalidFields: validation.invalidFields,
      evidence: validation.evidence
    },
    actionability
  };

  return {
    ...receiptWithoutHash,
    receiptHash: sha256Text(normalizeJson(receiptWithoutHash))
  };
}

export function renderMarkdownSummary(
  manifest: ReproGateManifest,
  score?: ActionabilityResult
): string {
  const lines = [
    `# ${manifest.projectName}: ${manifest.summary}`,
    "",
    `- **Report type:** ${manifest.reportType}`,
    `- **Affected version:** ${manifest.affectedVersion}`,
    `- **Schema version:** ${manifest.schemaVersion}`,
    `- **Created:** ${manifest.createdAt}`,
    `- **AI assistance disclosed:** ${manifest.aiAssisted ? "yes" : "no"}`,
    `- **Reporter manually reviewed:** ${manifest.humanReviewed ? "yes" : "no"}`,
    ""
  ];

  if (score) {
    lines.push(`## Actionability Score`, "", `${score.score}/100`, "");
  }

  lines.push(
    "## Environment",
    "",
    `- **OS:** ${manifest.environment.os}`,
    `- **Runtime:** ${manifest.environment.runtime ?? "Not provided"}`
  );

  if (
    manifest.environment.dependencies &&
    Object.keys(manifest.environment.dependencies).length > 0
  ) {
    lines.push("- **Dependencies:**");
    for (const [name, version] of Object.entries(manifest.environment.dependencies).sort()) {
      lines.push(`  - ${name}: ${version}`);
    }
  }

  lines.push(
    "",
    "## Expected Behavior",
    "",
    manifest.expectedBehavior,
    "",
    "## Actual Behavior",
    "",
    manifest.actualBehavior,
    "",
    "## Steps to Reproduce",
    ""
  );

  manifest.stepsToReproduce.forEach((step, index) => {
    lines.push(`${index + 1}. ${step}`);
  });

  const commands = manifest.commands ?? [];
  if (commands.length > 0) {
    lines.push("", "## Commands", "", "```sh", ...commands, "```");
  }

  const evidenceFiles = manifest.evidenceFiles ?? [];
  if (evidenceFiles.length > 0) {
    lines.push("", "## Evidence Files", "");
    for (const file of evidenceFiles) {
      lines.push(`- ${file.path} (${file.kind}, sha256: \`${file.sha256}\`)`);
    }
  }

  if (hasText(manifest.redactionNotes)) {
    lines.push("", "## Redaction Notes", "", manifest.redactionNotes ?? "");
  }

  return `${lines.join("\n")}\n`;
}
