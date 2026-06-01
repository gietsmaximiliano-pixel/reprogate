export class MockAiAdapter {
    provider = "mock";
    async summarizeIssue(request) {
        return `Mock summary: ${firstSentence(request.issueText)}`;
    }
    async draftMissingEvidenceRequest(request) {
        const fields = request.missingFields?.length
            ? request.missingFields.join(", ")
            : "the missing evidence";
        return `Thanks for the report. Please add ${fields} so maintainers can reproduce it.`;
    }
    async suggestRelatedIssues() {
        return [];
    }
    async generateMaintainerHandoff(request) {
        return `Mock handoff: review the evidence manifest and verify ${firstSentence(request.issueText)}`;
    }
}
function firstSentence(text) {
    const trimmed = text.replace(/\s+/g, " ").trim();
    if (trimmed.length === 0)
        return "No issue text provided.";
    const period = trimmed.indexOf(".");
    return period === -1 ? trimmed.slice(0, 160) : trimmed.slice(0, period + 1);
}
export function createMockAiAdapter() {
    return new MockAiAdapter();
}
//# sourceMappingURL=index.js.map