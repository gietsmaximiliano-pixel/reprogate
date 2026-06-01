import { describe, expect, it } from "vitest";
import { createMockAiAdapter } from "../src/index.js";

describe("mock AI adapter", () => {
  it("returns deterministic advisory text without external providers", async () => {
    const adapter = createMockAiAdapter();
    await expect(
      adapter.draftMissingEvidenceRequest({
        issueText: "The app crashes.",
        missingFields: ["stepsToReproduce", "environment.os"]
      })
    ).resolves.toContain("stepsToReproduce");
  });
});
