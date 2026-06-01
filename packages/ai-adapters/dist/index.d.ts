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
export declare class MockAiAdapter implements AdvisoryAiAdapter {
    readonly provider = "mock";
    summarizeIssue(request: AdvisoryAiRequest): Promise<string>;
    draftMissingEvidenceRequest(request: AdvisoryAiRequest): Promise<string>;
    suggestRelatedIssues(): Promise<string[]>;
    generateMaintainerHandoff(request: AdvisoryAiRequest): Promise<string>;
}
export declare function createMockAiAdapter(): AdvisoryAiAdapter;
//# sourceMappingURL=index.d.ts.map