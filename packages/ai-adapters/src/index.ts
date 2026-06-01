export interface AdvisoryAiRequest {
  issueText: string;
  missingFields?: string[];
}

export interface AdvisoryAiAdapter {
  readonly provider: string;
  summarizeIssue(request: AdvisoryAiRequest): Promise<string>;
  draftMissingEvidenceRequest(request: AdvisoryAiRequest): Promise<string>;
  suggestRelatedIssues(request: AdvisoryAiRequest): Promise<string[]>;
  generateMaintainerHandoff(request: AdvisoryAiRequest): Promise<string>;
}

export class MockAiAdapter implements AdvisoryAiAdapter {
  readonly provider = "mock";

  async summarizeIssue(request: AdvisoryAiRequest): Promise<string> {
    return `Mock summary: ${firstSentence(request.issueText)}`;
  }

  async draftMissingEvidenceRequest(request: AdvisoryAiRequest): Promise<string> {
    const fields = request.missingFields?.length
      ? request.missingFields.join(", ")
      : "the missing evidence";
    return `Thanks for the report. Please add ${fields} so maintainers can reproduce it.`;
  }

  async suggestRelatedIssues(): Promise<string[]> {
    return [];
  }

  async generateMaintainerHandoff(request: AdvisoryAiRequest): Promise<string> {
    return `Mock handoff: review the evidence manifest and verify ${firstSentence(request.issueText)}`;
  }
}

function firstSentence(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length === 0) return "No issue text provided.";
  const period = trimmed.indexOf(".");
  return period === -1 ? trimmed.slice(0, 160) : trimmed.slice(0, period + 1);
}

export function createMockAiAdapter(): AdvisoryAiAdapter {
  return new MockAiAdapter();
}
