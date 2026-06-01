import { describe, expect, it } from "vitest";
import {
  analyzeIssueBody,
  extractReproGateBlock,
  findExistingReproGateComment,
  sanitizeCommentText,
  selectLabel
} from "../src/index.js";

const validBlock = `\`\`\`reprogate
schemaVersion: "0.1"
reportType: bug
projectName: demo
affectedVersion: 1.0.0
environment:
  os: Ubuntu 24.04
  runtime: Node.js 20
  dependencies:
    demo: 1.0.0
summary: Validator exits successfully even when a manifest is invalid
expectedBehavior: Invalid manifests should return a failing exit code.
actualBehavior: The command exits with code 0.
stepsToReproduce:
  - Install dependencies.
  - Run the validator.
  - Observe the exit code.
commands:
  - npm test
redactionNotes: No private data included.
aiAssisted: false
humanReviewed: true
createdAt: "2026-06-01T00:00:00.000Z"
\`\`\``;

describe("GitHub Action issue analysis", () => {
  it("extracts fenced reprogate YAML blocks", () => {
    expect(extractReproGateBlock(`hello\n${validBlock}\nbye`)).toContain("schemaVersion");
  });

  it("selects complete label for valid high-scoring non-security reports", () => {
    expect(selectLabel({ valid: true, score: 90, reportType: "bug" })).toBe("reprogate:complete");
  });

  it("sends security reports to manual review", () => {
    expect(selectLabel({ valid: true, score: 95, reportType: "security" })).toBe(
      "reprogate:manual-review"
    );
  });

  it("analyzes a valid issue body", () => {
    const analysis = analyzeIssueBody(validBlock);
    expect(analysis.valid).toBe(true);
    expect(analysis.label).toBe("reprogate:complete");
    expect(analysis.comment).toContain("Actionability score");
  });

  it("reports missing fenced blocks", () => {
    const analysis = analyzeIssueBody("plain issue body");
    expect(analysis.valid).toBe(false);
    expect(analysis.label).toBe("reprogate:needs-info");
    expect(analysis.missingFields).toContain("fenced reprogate YAML block");
  });

  it("detects existing marker comments to avoid duplicates", () => {
    expect(
      findExistingReproGateComment([
        { id: 1, body: "hello" },
        { id: 2, body: "<!-- reprogate-validation-comment -->\nold" }
      ])
    ).toBe(2);
  });

  it("sanitizes text before comments are posted", () => {
    expect(sanitizeCommentText("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });
});
