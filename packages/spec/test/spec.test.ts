import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import {
  calculateActionabilityScore,
  createReceipt,
  isSafeRelativePath,
  manifestHash,
  normalizeJson,
  normalizeManifest,
  parseManifestText,
  sha256File,
  validateManifest,
  validateManifestWithEvidence,
  type ReproGateManifest
} from "../src/index.js";

function validManifest(overrides: Partial<ReproGateManifest> = {}): ReproGateManifest {
  return {
    schemaVersion: "0.1",
    reportType: "bug",
    projectName: "demo",
    affectedVersion: "1.0.0",
    environment: {
      os: "Windows 11",
      runtime: "Node.js 20",
      dependencies: {
        demo: "1.0.0"
      }
    },
    summary: "Validator exits successfully even when a manifest is invalid",
    expectedBehavior: "Invalid manifests should produce a failing exit code.",
    actualBehavior: "The command exits with code 0.",
    stepsToReproduce: ["Install dependencies.", "Run the validator.", "Observe the exit code."],
    commands: ["npm test"],
    redactionNotes: "No private data is included.",
    aiAssisted: false,
    humanReviewed: true,
    createdAt: "2026-05-31T23:30:00-03:00",
    ...overrides
  };
}

describe("ReproGate Evidence Manifest", () => {
  it("validates a complete manifest", () => {
    const result = validateManifest(validManifest());
    expect(result.valid).toBe(true);
    expect(result.missingFields).toEqual([]);
  });

  it("reports missing required fields", () => {
    const result = validateManifest({
      schemaVersion: "0.1",
      reportType: "bug"
    });

    expect(result.valid).toBe(false);
    expect(result.missingFields).toContain("projectName");
    expect(result.missingFields).toContain("environment");
  });

  it("reports unknown schema versions", () => {
    const result = validateManifest({
      ...validManifest(),
      schemaVersion: "9.9"
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Unsupported schemaVersion: 9.9");
  });

  it("normalizes deterministically regardless of key insertion order", () => {
    const left = normalizeJson({ b: 1, a: { d: 4, c: 3 } });
    const right = normalizeJson({ a: { c: 3, d: 4 }, b: 1 });
    expect(left).toBe(right);
  });

  it("hashes normalized manifests stably", () => {
    const manifest = validManifest();
    expect(manifestHash(manifest)).toBe(manifestHash(JSON.parse(normalizeManifest(manifest))));
  });

  it("verifies matching evidence file hashes", async () => {
    const dir = await makeTempDir();
    const evidencePath = join(dir, "evidence");
    await mkdir(evidencePath, { recursive: true });
    const filePath = join(evidencePath, "output.log");
    await writeFile(filePath, "hello\n");
    const hash = await sha256File(filePath);

    const result = await validateManifestWithEvidence(
      validManifest({
        evidenceFiles: [{ path: "evidence/output.log", sha256: hash, kind: "log" }]
      }),
      dir
    );

    expect(result.valid).toBe(true);
    expect(result.evidence[0]?.matches).toBe(true);
  });

  it("detects evidence file hash mismatches", async () => {
    const dir = await makeTempDir();
    await mkdir(join(dir, "evidence"), { recursive: true });
    await writeFile(join(dir, "evidence", "output.log"), "changed\n");

    const result = await validateManifestWithEvidence(
      validManifest({
        evidenceFiles: [
          {
            path: "evidence/output.log",
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            kind: "log"
          }
        ]
      }),
      dir
    );

    expect(result.valid).toBe(false);
    expect(result.evidence[0]?.matches).toBe(false);
  });

  it("creates stable receipt hashes for fixed validation timestamps", async () => {
    const dir = await makeTempDir();
    const manifest = validManifest();
    const receiptA = await createReceipt({
      manifest,
      baseDir: dir,
      cliVersion: "0.1.0",
      validatedAt: "2026-06-01T00:00:00.000Z"
    });
    const receiptB = await createReceipt({
      manifest,
      baseDir: dir,
      cliVersion: "0.1.0",
      validatedAt: "2026-06-01T00:00:00.000Z"
    });

    expect(receiptA.receiptHash).toBe(receiptB.receiptHash);
  });

  it("parses YAML input", () => {
    const parsed = parseManifestText("schemaVersion: '0.1'\nreportType: bug\n");
    expect(parsed).toMatchObject({ schemaVersion: "0.1", reportType: "bug" });
  });

  it("scores complete reports higher than incomplete reports", () => {
    const complete = calculateActionabilityScore(validManifest()).score;
    const incomplete = calculateActionabilityScore(
      validManifest({
        stepsToReproduce: ["Run it."],
        commands: undefined,
        humanReviewed: false,
        evidenceFiles: undefined,
        redactionNotes: undefined
      })
    ).score;

    expect(complete).toBeGreaterThan(incomplete);
  });

  it("rejects unsafe Windows and Linux evidence paths", () => {
    expect(isSafeRelativePath("evidence/output.log")).toBe(true);
    expect(isSafeRelativePath("../secret.txt")).toBe(false);
    expect(isSafeRelativePath("/etc/passwd")).toBe(false);
    expect(isSafeRelativePath("C:\\Users\\name\\.ssh\\id_rsa")).toBe(false);
  });
});

async function makeTempDir(): Promise<string> {
  const base = join(
    tmpdir(),
    `reprogate-spec-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  await mkdir(base, { recursive: true });
  return base;
}
