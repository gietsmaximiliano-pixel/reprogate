import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { generateDashboard, summarizeReceipts } from "../src/index.js";
import type { ReproGateReceipt } from "@reprogate/spec";

function receipt(overrides: Partial<ReproGateReceipt> = {}): ReproGateReceipt {
  return {
    receiptFormatVersion: "0.1",
    validatedAt: "2026-06-01T00:00:00.000Z",
    cliVersion: "0.1.0",
    manifestHash: "a".repeat(64),
    manifest: {
      schemaVersion: "0.1",
      reportType: "bug",
      projectName: "demo",
      affectedVersion: "1.0.0",
      summary: "Demo report",
      createdAt: "2026-05-31T23:30:00-03:00"
    },
    validation: {
      valid: true,
      missingFields: [],
      invalidFields: [],
      evidence: []
    },
    actionability: {
      score: 88,
      reasons: ["complete"]
    },
    receiptHash: "b".repeat(64),
    ...overrides
  };
}

describe("dashboard generator", () => {
  it("summarizes receipt counts and average scores", () => {
    const stats = summarizeReceipts([
      receipt(),
      receipt({
        validation: { valid: false, missingFields: ["summary"], invalidFields: [], evidence: [] },
        actionability: { score: 40, reasons: [] },
        manifest: { ...receipt().manifest, reportType: "security" }
      })
    ]);

    expect(stats.total).toBe(2);
    expect(stats.valid).toBe(1);
    expect(stats.invalid).toBe(1);
    expect(stats.averageScore).toBe(64);
    expect(stats.reportTypes.bug).toBe(1);
    expect(stats.reportTypes.security).toBe(1);
  });

  it("generates a static HTML dashboard", async () => {
    const dir = await makeTempDir();
    const input = join(dir, "receipts");
    const output = join(dir, "site");
    await mkdir(input, { recursive: true });
    await writeFile(join(input, "receipt.json"), JSON.stringify(receipt(), null, 2));

    const result = await generateDashboard(input, output);
    const html = await readFile(result.outputPath, "utf8");

    expect(result.stats.total).toBe(1);
    expect(html).toContain("ReproGate Dashboard");
    expect(html).toContain("demo");
    expect(html).toContain("bbbb");
  });
});

async function makeTempDir(): Promise<string> {
  const base = join(
    tmpdir(),
    `reprogate-dashboard-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  await mkdir(base, { recursive: true });
  return base;
}
